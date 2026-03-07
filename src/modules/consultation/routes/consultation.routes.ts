import type { FastifyInstance } from 'fastify'
import { getDb } from '@/core/database/client'
import { authenticate, requireRole } from '@/modules/auth'
import { ServiceRepository } from '../repositories/service.repository'
import { AvailabilityRepository } from '../repositories/availability.repository'
import { AppointmentRepository } from '../repositories/appointment.repository'
import { ConsultationService } from '../services/consultation.service'
import { BookingService } from '../services/booking.service'
import { AgoraService } from '../services/agora.service'
import { AstrologerController } from '../controllers/astrologer.controller'
import { BookingController } from '../controllers/booking.controller'

export async function consultationRoutes(app: FastifyInstance) {
  const db = getDb()

  // ─── Dependency injection ────────────────────────────────────────────────
  const serviceRepo = new ServiceRepository(db)
  const availabilityRepo = new AvailabilityRepository(db)
  const appointmentRepo = new AppointmentRepository(db)
  const agoraService = new AgoraService()
  const consultationService = new ConsultationService(serviceRepo, availabilityRepo)
  const bookingService = new BookingService(appointmentRepo, consultationService, agoraService)
  const astrologerController = new AstrologerController(consultationService)
  const bookingController = new BookingController(bookingService, consultationService)

  // ─────────────────────────────────────────────────────────────────────────
  // ASTROLOGER ROUTES (role: astrologer | admin)
  // ─────────────────────────────────────────────────────────────────────────

  app.post('/consultation/services', {
    preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
    schema: {
      tags: ['Consultation – Astrologer'],
      summary: 'Create or update a consultation service (101–104)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['serviceCode', 'title', 'shortDescription', 'coverImage', 'about', 'durationMinutes'],
        properties: {
          serviceCode: { type: 'integer', enum: [101, 102, 103, 104] },
          title: { type: 'string', minLength: 3, maxLength: 255 },
          shortDescription: { type: 'string', minLength: 10, maxLength: 500 },
          coverImage: { type: 'string' },
          about: { type: 'string', minLength: 20 },
          durationMinutes: { type: 'integer', minimum: 15, maximum: 180 },
          price: { type: 'number', minimum: 0 },
        },
      },
    },
  }, astrologerController.upsertService)

  app.get('/consultation/services/mine', {
    preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
    schema: {
      tags: ['Consultation – Astrologer'],
      summary: 'Get all my consultation services',
      security: [{ bearerAuth: [] }],
    },
  }, astrologerController.getMyServices)

  app.post('/consultation/availability', {
    preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
    schema: {
      tags: ['Consultation – Astrologer'],
      summary: 'Set availability window for a specific date',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['date', 'startTime', 'endTime'],
        properties: {
          date: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          timezone: { type: 'string', default: 'Asia/Kolkata' },
        },
      },
    },
  }, astrologerController.setAvailability)

  app.get('/consultation/availability/mine', {
    preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
    schema: {
      tags: ['Consultation – Astrologer'],
      summary: 'Get my upcoming availability windows',
      security: [{ bearerAuth: [] }],
    },
  }, astrologerController.getMyAvailability)

  app.delete('/consultation/availability/:id', {
    preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
    schema: {
      tags: ['Consultation – Astrologer'],
      summary: 'Delete an availability window',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
  }, astrologerController.deleteAvailability)

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES
  // ─────────────────────────────────────────────────────────────────────────

  app.get('/consultation/astrologers/:astrologerId/services', {
    schema: {
      tags: ['Consultation – User'],
      summary: "Browse an astrologer's consultation services",
      params: {
        type: 'object',
        required: ['astrologerId'],
        properties: { astrologerId: { type: 'string', format: 'uuid' } },
      },
    },
  }, bookingController.getAstrologerServices)

  app.get('/consultation/astrologers/:astrologerId/available-dates', {
    schema: {
      tags: ['Consultation – User'],
      summary: 'Get dates where the astrologer has availability',
      params: {
        type: 'object',
        required: ['astrologerId'],
        properties: { astrologerId: { type: 'string', format: 'uuid' } },
      },
    },
  }, bookingController.getAvailableDates)

  // ─────────────────────────────────────────────────────────────────────────
  // BOOKING ROUTES (2-step: initiate → confirm)
  // ─────────────────────────────────────────────────────────────────────────

  // Step 1 — validate availability + create Razorpay order
  app.post('/consultation/appointments/initiate', {
    preHandler: [authenticate],
    schema: {
      tags: ['Consultation – User'],
      summary: 'Initiate booking: validate slot and create Razorpay payment order',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['astrologerId', 'serviceId', 'date'],
        properties: {
          astrologerId: { type: 'string', format: 'uuid' },
          serviceId: { type: 'string', format: 'uuid' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          notes: { type: 'string', maxLength: 500 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            orderId: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            service: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, bookingController.initiateBooking)

  // Step 2 — verify payment + allocate slot + generate Agora token + create appointment
  app.post('/consultation/appointments/confirm', {
    preHandler: [authenticate],
    schema: {
      tags: ['Consultation – User'],
      summary: 'Confirm booking after payment: verify signature, allocate slot, generate Agora token',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['astrologerId', 'serviceId', 'date', 'razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'],
        properties: {
          astrologerId: { type: 'string', format: 'uuid' },
          serviceId: { type: 'string', format: 'uuid' },
          date: { type: 'string' },
          notes: { type: 'string', maxLength: 500 },
          razorpayOrderId: { type: 'string' },
          razorpayPaymentId: { type: 'string' },
          razorpaySignature: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            appointment: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, bookingController.confirmBooking)

  // Get fresh Agora token to join the call
  app.get('/consultation/appointments/:id/join', {
    preHandler: [authenticate],
    schema: {
      tags: ['Consultation – User'],
      summary: 'Get a fresh Agora RTC token to join the video call',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            appId: { type: 'string' },
            channel: { type: 'string' },
            token: { type: 'string' },
          },
        },
      },
    },
  }, bookingController.getJoinToken)

  app.get('/consultation/appointments/mine', {
    preHandler: [authenticate],
    schema: {
      tags: ['Consultation – User'],
      summary: 'Get my appointments (works for both users and astrologers)',
      security: [{ bearerAuth: [] }],
    },
  }, bookingController.getMyAppointments)

  app.patch('/consultation/appointments/:id/cancel', {
    preHandler: [authenticate],
    schema: {
      tags: ['Consultation – User'],
      summary: 'Cancel an appointment',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
  }, bookingController.cancelAppointment)
}
