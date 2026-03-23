import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ConsultationService } from '../services/consultation.service'
import type { BookingService } from '../services/booking.service'
import { UpsertServiceSchema, CreateAvailabilitySchema } from '../schemas/consultation.schema'

export class AstrologerConsultationController {
  constructor(
    private readonly consultationService: ConsultationService,
    private readonly bookingService: BookingService,
  ) {}

  // POST /consultation/services
  upsertService = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId: astrologerId } = request.user as { userId: string }
    const dto = UpsertServiceSchema.parse(request.body)

    const service = await this.consultationService.upsertService(astrologerId, dto)
    return reply.status(200).send({ message: 'Service saved', service })
  }

  // GET /consultation/services/mine
  getMyServices = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId: astrologerId } = request.user as { userId: string }
    const services = await this.consultationService.getMyServices(astrologerId)
    return reply.status(200).send({ services })
  }

  // POST /consultation/availability
  setAvailability = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId: astrologerId } = request.user as { userId: string }
    const dto = CreateAvailabilitySchema.parse(request.body)

    const availability = await this.consultationService.setAvailability(astrologerId, dto)
    return reply.status(201).send({ message: 'Availability set', availability })
  }

  // GET /consultation/availability/mine
  getMyAvailability = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId: astrologerId } = request.user as { userId: string }
    const availability = await this.consultationService.getMyAvailability(astrologerId)
    return reply.status(200).send({ availability })
  }

  // DELETE /consultation/availability/:id
  deleteAvailability = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId: astrologerId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    await this.consultationService.deleteAvailability(id, astrologerId)
    return reply.status(204).send()
  }

  // GET /consultation/schedule
  getSchedule = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId: astrologerId } = request.user as { userId: string }
    const { date } = request.query as { date?: string }

    const today = date ?? new Date().toISOString().split('T')[0]!
    const schedule = await this.bookingService.getSchedule(astrologerId, today)
    return reply.status(200).send({ date: today, schedule })
  }
}
