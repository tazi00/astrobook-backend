import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ServiceRequestService } from '../services/service-request.service'
import {
  CreateServiceRequestSchema,
  RespondServiceRequestSchema,
} from '../schemas/consultation.schema'

export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  // Astrologer → service request bhejta hai
  createRequest = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId: astrologerId } = request.user as { userId: string }
    const dto = CreateServiceRequestSchema.parse(request.body)

    const result = await this.serviceRequestService.createRequest(astrologerId, dto)
    return reply.status(201).send({ message: 'Service request sent', request: result })
  }

  // User → accept ya reject
  respondToRequest = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const dto = RespondServiceRequestSchema.parse(request.body)

    const result = await this.serviceRequestService.respondToRequest(userId, id, dto)
    return reply.status(200).send(result)
  }

  // User ke pending requests
  getMyRequests = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const requests = await this.serviceRequestService.getMyRequests(userId)
    return reply.status(200).send({ requests })
  }
}
