import type { FastifyInstance } from 'fastify'
import { getDb } from '@/core/database/client'
import { authenticate, requireRole } from '@/modules/auth'
import { ServiceRepository } from '../repositories/service.repository'
import { AvailabilityRepository } from '../repositories/availability.repository'
import { AppointmentRepository } from '../repositories/appointment.repository'
import { ConsultationService } from '../services/consultation.service'
import { BookingService } from '../services/booking.service'
import { GoogleMeetService } from '../services/google-meet.service'
import { AstrologerController } from '../controllers/astrologer.controller'
import { BookingController } from '../controllers/booking.controller'

export async function consultationRoutes(app: FastifyInstance) {
  const db = getDb()

  // ─── Dependency injection ────────────────────────────────────────────────
  const serviceRepo = new ServiceRepository(db)
  const availabilityRepo = new AvailabilityRepository(db)
  const appointmentRepo = new AppointmentRepository(db)
  const googleMeetService = new GoogleMeetService()
  const consultationService = new ConsultationService(serviceRepo, availabilityRepo)
  const bookingService = new BookingService(appointmentRepo, consultationService, googleMeetService)
  const astrologerController = new AstrologerController(consultationService)
  const bookingController = new BookingController(bookingService, consultationService)

  // ─────────────────────────────────────────────────────────────────────────
  // ASTROLOGER ROUTES (role: astrologer)
  // ─────────────────────────────────────────────────────────────────────────

  // POST /consultation/services — create or update a service offering
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
          serviceCode: { type: 'integer', enum: [101, 102, 103, 104], description: 'Service category code' },
          title: { type: 'string', minLength: 3, maxLength: 255 },
          shortDescription: { type: 'string', minLength: 10, maxLength: 500 },
          coverImage: { type: 'string', description: 'URL of the cover image' },
          about: { type: 'string', minLength: 20 },
          durationMinutes: { type: 'integer', minimum: 15, maximum: 180, description: 'Duration in minutes' },
          price: { type: 'number', minimum: 0, description: 'Consultation fee (optional)' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            service: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, astrologerController.upsertService)

  // GET /consultation/services/mine — list own services
  app.get('/consultation/services/mine', {
    preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
    schema: {
      tags: ['Consultation – Astrologer'],
      summary: 'Get all my consultation services',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  }, astrologerController.getMyServices)

  // POST /consultation/availability — set a date+time window
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
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          startTime: { type: 'string', description: 'Start time in HH:MM (24-hour)' },
          endTime: { type: 'string', description: 'End time in HH:MM (24-hour)' },
          timezone: { type: 'string', default: 'Asia/Kolkata', description: 'IANA timezone name' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            availability: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, astrologerController.setAvailability)

  // GET /consultation/availability/mine — view own upcoming availability
  app.get('/consultation/availability/mine', {
    preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
    schema: {
      tags: ['Consultation – Astrologer'],
      summary: 'Get my upcoming availability windows',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            availability: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  }, astrologerController.getMyAvailability)

  // DELETE /consultation/availability/:id — remove an availability window
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
      response: { 204: { type: 'null' } },
    },
  }, astrologerController.deleteAvailability)

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC / USER ROUTES
  // ─────────────────────────────────────────────────────────────────────────

  // GET /consultation/astrologers/:astrologerId/services — browse services
  app.get('/consultation/astrologers/:astrologerId/services', {
    schema: {
      tags: ['Consultation – User'],
      summary: "Browse an astrologer's consultation services",
      params: {
        type: 'object',
        required: ['astrologerId'],
        properties: { astrologerId: { type: 'string', format: 'uuid' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  }, bookingController.getAstrologerServices)

  // GET /consultation/astrologers/:astrologerId/available-dates — calendar data
  app.get('/consultation/astrologers/:astrologerId/available-dates', {
    schema: {
      tags: ['Consultation – User'],
      summary: 'Get dates where the astrologer has availability (for calendar highlight)',
      params: {
        type: 'object',
        required: ['astrologerId'],
        properties: { astrologerId: { type: 'string', format: 'uuid' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            availableDates: {
              type: 'array',
              items: { type: 'string', description: 'YYYY-MM-DD' },
              description: 'Highlighted dates on the calendar',
            },
          },
        },
      },
    },
  }, bookingController.getAvailableDates)

  // POST /consultation/appointments — book a slot (triggers slot allocation + Meet link)
  app.post('/consultation/appointments', {
    preHandler: [authenticate],
    schema: {
      tags: ['Consultation – User'],
      summary: 'Book a consultation slot (auto-allocates a random free slot + generates Meet link)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['astrologerId', 'serviceId', 'date'],
        properties: {
          astrologerId: { type: 'string', format: 'uuid' },
          serviceId: { type: 'string', format: 'uuid', description: 'ID of the consultation service' },
          date: { type: 'string', description: 'Requested date in YYYY-MM-DD' },
          notes: { type: 'string', maxLength: 500, description: 'Optional notes from the user' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            appointment: {
              type: 'object',
              additionalProperties: true,
              properties: {
                id: { type: 'string' },
                scheduledAt: { type: 'string' },
                endsAt: { type: 'string' },
                durationMinutes: { type: 'integer' },
                meetLink: { type: 'string', description: 'Google Meet link' },
                status: { type: 'string' },
                astrologerId: { type: 'string' },
                userId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, bookingController.createBooking)

  // GET /consultation/appointments/mine — view own appointments (user or astrologer)
  app.get('/consultation/appointments/mine', {
    preHandler: [authenticate],
    schema: {
      tags: ['Consultation – User'],
      summary: 'Get my appointments (works for both users and astrologers)',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            appointments: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  }, bookingController.getMyAppointments)

  // PATCH /consultation/appointments/:id/cancel — cancel an appointment
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
      response: { 204: { type: 'null' } },
    },
  }, bookingController.cancelAppointment)
}
