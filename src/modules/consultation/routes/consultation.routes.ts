import type { FastifyInstance } from 'fastify'
import { getDb } from '@/core/database/client'
import { authenticate, requireRole } from '@/modules/auth'

import { ServiceRepository } from '../repositories/service.repository'
import { AvailabilityRepository } from '../repositories/availability.repository'
import { AppointmentRepository } from '../repositories/appointment.repository'

import { ConsultationService } from '../services/consultation.service'
import { BookingService } from '../services/booking.service'

import { BookingController } from '../controllers/booking.controller'
import { PaymentRepository } from '@/modules/payment/repositories/payment.repositary'
import { ServiceRequestRepository } from '../repositories/service-request.service'
import { PaymentService } from '@/modules/payment/service/payment.service'
import { ServiceRequestService } from '../services/service-request.service'
import { PaymentController } from '@/modules/payment/controllers/payment.controller'
import { ServiceRequestController } from '../controllers/service-request.controller'
import { AstrologerConsultationController } from '../controllers/astrologer-consultation.controller'
import { CancelAppointmentSchema } from '../schemas/consultation.schema'

export async function consultationRoutes(app: FastifyInstance) {
  const db = getDb()

  // ─── Dependency Injection ─────────────────────────────────────────────────
  const serviceRepo = new ServiceRepository(db)
  const availabilityRepo = new AvailabilityRepository(db)
  const appointmentRepo = new AppointmentRepository(db)
  // const paymentRepo = new PaymentRepository(db)
  const serviceRequestRepo = new ServiceRequestRepository(db)

  const consultationService = new ConsultationService(serviceRepo, availabilityRepo)
  const bookingService = new BookingService(appointmentRepo, consultationService)
  // const paymentService = new PaymentService(paymentRepo, appointmentRepo)
  const serviceRequestService = new ServiceRequestService(serviceRequestRepo, appointmentRepo)

  const astrologerConsultationController = new AstrologerConsultationController(
    consultationService,
    bookingService,
  )
  const bookingController = new BookingController(bookingService)
  // const paymentController = new PaymentController(paymentService)
  const serviceRequestController = new ServiceRequestController(serviceRequestService)

  // ═════════════════════════════════════════════════════════════════════════
  // ASTROLOGER PANEL ROUTES
  // ═════════════════════════════════════════════════════════════════════════

  // POST /consultation/services
  app.post(
    '/consultation/services',
    {
      preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
      schema: {
        tags: ['Consultation – Astrologer'],
        summary: 'Create or update a consultation service (101–104)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: [
            'serviceCode',
            'title',
            'shortDescription',
            'coverImage',
            'about',
            'durationMinutes',
          ],
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
    },
    astrologerConsultationController.upsertService,
  )

  // GET /consultation/services/mine
  app.get(
    '/consultation/services/mine',
    {
      preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
      schema: {
        tags: ['Consultation – Astrologer'],
        summary: 'Get my consultation services',
        security: [{ bearerAuth: [] }],
      },
    },
    astrologerConsultationController.getMyServices,
  )

  // POST /consultation/availability
  app.post(
    '/consultation/availability',
    {
      preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
      schema: {
        tags: ['Consultation – Astrologer'],
        summary: 'Set availability window for a date',
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
    },
    astrologerConsultationController.setAvailability,
  )

  // GET /consultation/availability/mine
  app.get(
    '/consultation/availability/mine',
    {
      preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
      schema: {
        tags: ['Consultation – Astrologer'],
        summary: 'Get my upcoming availability windows',
        security: [{ bearerAuth: [] }],
      },
    },
    astrologerConsultationController.getMyAvailability,
  )

  // DELETE /consultation/availability/:id
  app.delete(
    '/consultation/availability/:id',
    {
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
    },
    astrologerConsultationController.deleteAvailability,
  )

  // GET /consultation/schedule — astrologer ka calendar view
  app.get(
    '/consultation/schedule',
    {
      preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
      schema: {
        tags: ['Consultation – Astrologer'],
        summary: 'Get my schedule with booked appointments',
        security: [{ bearerAuth: [] }],
      },
    },
    astrologerConsultationController.getSchedule,
  )

  // ═════════════════════════════════════════════════════════════════════════
  // USER BOOKING ROUTES
  // ═════════════════════════════════════════════════════════════════════════

  // POST /consultation/appointments/initiate — pending appointment banao
  app.post(
    '/consultation/appointments/initiate',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Consultation – User'],
        summary: 'Initiate a booking (creates pending appointment, no payment yet)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['astrologerId', 'serviceId', 'scheduledAt'],
          properties: {
            astrologerId: { type: 'string', format: 'uuid' },
            serviceId: { type: 'string', format: 'uuid' },
            scheduledAt: { type: 'string', description: 'ISO datetime' },
            notes: { type: 'string', maxLength: 500 },
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
    },
    bookingController.initiateBooking,
  )

  // GET /consultation/appointments/mine — grouped: upcoming/ongoing/completed
  app.get(
    '/consultation/appointments/mine',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Consultation – User'],
        summary: 'Get my appointments grouped by status',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              upcoming: { type: 'array', items: { type: 'object', additionalProperties: true } },
              ongoing: { type: 'array', items: { type: 'object', additionalProperties: true } },
              completed: { type: 'array', items: { type: 'object', additionalProperties: true } },
              cancelled: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        },
      },
    },
    bookingController.getMyAppointments,
  )

  // GET /consultation/appointments/:id — single appointment detail
  app.get(
    '/consultation/appointments/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Consultation – User'],
        summary: 'Get single appointment detail',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    bookingController.getAppointmentById,
  )

  // PATCH /consultation/appointments/:id/cancel
  app.patch(
    '/consultation/appointments/:id/cancel',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Consultation – User'],
        summary: 'Cancel an appointment',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string', maxLength: 500 },
          },
        },
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    bookingController.cancelAppointment,
  )

  // // ═════════════════════════════════════════════════════════════════════════
  // // PAYMENT ROUTES
  // // ═════════════════════════════════════════════════════════════════════════

  // // POST /consultation/payments/create-order — Razorpay order banao
  // app.post(
  //   '/consultation/payments/create-order',
  //   {
  //     preHandler: [authenticate],
  //     schema: {
  //       tags: ['Consultation – Payment'],
  //       summary: 'Create Razorpay order for an appointment',
  //       security: [{ bearerAuth: [] }],
  //       body: {
  //         type: 'object',
  //         required: ['appointmentId'],
  //         properties: {
  //           appointmentId: { type: 'string', format: 'uuid' },
  //         },
  //       },
  //       response: {
  //         201: {
  //           type: 'object',
  //           properties: {
  //             orderId: { type: 'string' },
  //             amount: { type: 'number' },
  //             currency: { type: 'string' },
  //             appointmentId: { type: 'string' },
  //           },
  //         },
  //       },
  //     },
  //   },
  //   paymentController.createOrder,
  // )

  // // POST /consultation/payments/verify — payment verify karo
  // app.post(
  //   '/consultation/payments/verify',
  //   {
  //     preHandler: [authenticate],
  //     schema: {
  //       tags: ['Consultation – Payment'],
  //       summary: 'Verify Razorpay payment → confirm appointment + generate Agora token',
  //       security: [{ bearerAuth: [] }],
  //       body: {
  //         type: 'object',
  //         required: ['appointmentId', 'razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'],
  //         properties: {
  //           appointmentId: { type: 'string', format: 'uuid' },
  //           razorpayOrderId: { type: 'string' },
  //           razorpayPaymentId: { type: 'string' },
  //           razorpaySignature: { type: 'string' },
  //         },
  //       },
  //       response: {
  //         200: {
  //           type: 'object',
  //           properties: {
  //             message: { type: 'string' },
  //             appointment: { type: 'object', additionalProperties: true },
  //           },
  //         },
  //       },
  //     },
  //   },
  //   paymentController.verifyPayment,
  // )

  // ═════════════════════════════════════════════════════════════════════════
  // SERVICE REQUEST ROUTES (mid-session upsell)
  // ═════════════════════════════════════════════════════════════════════════

  // POST /consultation/service-requests — astrologer upsell bheje
  app.post(
    '/consultation/service-requests',
    {
      preHandler: [authenticate, requireRole(['astrologer', 'admin'])],
      schema: {
        tags: ['Consultation – Service Request'],
        summary: 'Astrologer sends a service request to user during session',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['parentAppointmentId', 'serviceId', 'proposedSlot'],
          properties: {
            parentAppointmentId: { type: 'string', format: 'uuid' },
            serviceId: { type: 'string', format: 'uuid' },
            proposedSlot: { type: 'string', description: 'ISO datetime' },
          },
        },
      },
    },
    serviceRequestController.createRequest,
  )

  // PATCH /consultation/service-requests/:id — user accept/reject kare
  app.patch(
    '/consultation/service-requests/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Consultation – Service Request'],
        summary: 'User accepts or rejects a service request',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['accepted', 'rejected'] },
          },
        },
      },
    },
    serviceRequestController.respondToRequest,
  )

  // GET /consultation/service-requests/mine — user ke pending requests
  app.get(
    '/consultation/service-requests/mine',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Consultation – Service Request'],
        summary: 'Get my pending service requests',
        security: [{ bearerAuth: [] }],
      },
    },
    serviceRequestController.getMyRequests,
  )
}
