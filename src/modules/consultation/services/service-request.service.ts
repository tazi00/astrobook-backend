import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors'
import type { ServiceRequestRepository } from '../repositories/service-request.repository'
import type { AppointmentRepository } from '../repositories/appointment.repository'
import type {
  CreateServiceRequestDto,
  RespondServiceRequestDto,
} from '../schemas/consultation.schema'

export class ServiceRequestService {
  constructor(
    private readonly serviceRequestRepository: ServiceRequestRepository,
    private readonly appointmentRepository: AppointmentRepository,
  ) {}

  // Astrologer → session ke dauran service request bhejta hai
  async createRequest(astrologerId: string, dto: CreateServiceRequestDto) {
    const { parentAppointmentId, serviceId, proposedSlot } = dto

    // Parent appointment exist karta hai?
    const parent = await this.appointmentRepository.findById(parentAppointmentId)
    if (!parent) throw NotFoundError('Parent appointment not found')

    // Sirf ongoing session mein request bhej sakte hain
    if (parent.status !== 'ongoing') {
      throw BadRequestError('Service requests can only be sent during an ongoing session')
    }

    // Astrologer usi session ka hona chahiye
    if (parent.astrologerId !== astrologerId) {
      throw ForbiddenError('You are not the astrologer for this session')
    }

    // Proposed slot valid hai?
    const proposedDate = new Date(proposedSlot)
    if (isNaN(proposedDate.getTime())) throw BadRequestError('Invalid proposed slot datetime')

    // Expires in 10 minutes — user ko jaldi decide karna hoga
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const request = await this.serviceRequestRepository.create({
      parentAppointmentId,
      astrologerId,
      userId: parent.userId,
      serviceId,
      proposedSlot: proposedDate,
      status: 'pending',
      expiresAt,
    })

    return request
  }

  // User → accept ya reject karta hai
  async respondToRequest(userId: string, requestId: string, dto: RespondServiceRequestDto) {
    const request = await this.serviceRequestRepository.findByIdWithDetails(requestId)
    if (!request) throw NotFoundError('Service request not found')

    // Sirf wahi user respond kar sakta hai
    if (request.userId !== userId) {
      throw ForbiddenError('You are not authorized to respond to this request')
    }

    if (request.status !== 'pending') {
      throw BadRequestError(`Request is already ${request.status}`)
    }

    // Expired check
    if (request.expiresAt && new Date() > new Date(request.expiresAt)) {
      await this.serviceRequestRepository.update(requestId, { status: 'expired' })
      throw BadRequestError('This service request has expired')
    }

    if (dto.status === 'rejected') {
      const updated = await this.serviceRequestRepository.update(requestId, { status: 'rejected' })
      return { request: updated, appointment: null }
    }

    // Accepted → pending child appointment banao
    const parentAppointment = await this.appointmentRepository.findById(request.parentAppointmentId)
    if (!parentAppointment) throw NotFoundError('Parent appointment not found')

    const proposedDate = new Date(request.proposedSlot)
    const durationMs = request.service.durationMinutes * 60 * 1000
    const endsAt = new Date(proposedDate.getTime() + durationMs)

    // Child appointment banao — pending (payment abhi baki hai)
    const childAppointment = await this.appointmentRepository.create({
      astrologerId: request.astrologerId,
      userId,
      serviceId: request.service.id,
      scheduledAt: proposedDate,
      endsAt,
      durationMinutes: request.service.durationMinutes,
      parentId: request.parentAppointmentId,
      status: 'pending',
    })

    // Service request mein child appointment link karo
    const updatedRequest = await this.serviceRequestRepository.update(requestId, {
      status: 'accepted',
      childAppointmentId: childAppointment.id,
    })

    // Parent ka bundleStatus update karo
    const isSameDay =
      proposedDate.toDateString() === new Date(parentAppointment.scheduledAt).toDateString()

    await this.appointmentRepository.update(request.parentAppointmentId, {
      bundleStatus: isSameDay ? 'in_progress' : 'paused',
    })

    return {
      request: updatedRequest,
      appointment: childAppointment,
    }
  }

  // User ke pending requests
  async getMyRequests(userId: string) {
    return this.serviceRequestRepository.findPendingByUser(userId)
  }

  // Astrologer ke sent requests
  async getMyAstrologerRequests(astrologerId: string) {
    return this.serviceRequestRepository.findByAstrologer(astrologerId)
  }
}
