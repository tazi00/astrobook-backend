import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ConsultationService } from '../services/consultation.service'
import {
  UpsertServiceSchema,
  CreateAvailabilitySchema,
} from '../schemas/consultation.schema'

export class AstrologerController {
  constructor(private readonly consultationService: ConsultationService) {}

  // ─── Services ──────────────────────────────────────────────────────────────

  upsertService = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const dto = UpsertServiceSchema.parse(request.body)

    const service = await this.consultationService.upsertService(userId, dto)

    return reply.status(200).send({ message: 'Service saved successfully', service })
  }

  getMyServices = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const services = await this.consultationService.getMyServices(userId)

    return reply.status(200).send({ services })
  }

  // ─── Availability ──────────────────────────────────────────────────────────

  setAvailability = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const dto = CreateAvailabilitySchema.parse(request.body)

    const window = await this.consultationService.setAvailability(userId, dto)

    return reply.status(201).send({ message: 'Availability set successfully', availability: window })
  }

  getMyAvailability = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const windows = await this.consultationService.getMyAvailability(userId)

    return reply.status(200).send({ availability: windows })
  }

  deleteAvailability = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    await this.consultationService.deleteAvailability(id, userId)

    return reply.status(204).send()
  }
}
