import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors'
import type { ServiceRepository } from '../repositories/service.repository'
import type { AvailabilityRepository } from '../repositories/availability.repository'
import type { UpsertServiceDto, CreateAvailabilityDto } from '../schemas/consultation.schema'

export class ConsultationService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly availabilityRepository: AvailabilityRepository,
  ) {}

  // ─── Astrologer: Services ─────────────────────────────────────────────────

  async upsertService(astrologerId: string, dto: UpsertServiceDto) {
    return this.serviceRepository.upsert(astrologerId, dto)
  }

  async getMyServices(astrologerId: string) {
    return this.serviceRepository.findByAstrologer(astrologerId)
  }

  async getAstrologerServices(astrologerId: string) {
    return this.serviceRepository.findByAstrologer(astrologerId)
  }

  // ─── Astrologer: Availability ─────────────────────────────────────────────

  async setAvailability(astrologerId: string, dto: CreateAvailabilityDto) {
    // Check if a window already exists for this date; if so, replace it
    const existing = await this.availabilityRepository.findByDate(astrologerId, dto.date)

    if (existing) {
      // Soft-delete old window then create new one (allows updating time range)
      await this.availabilityRepository.delete(existing.id, astrologerId)
    }

    return this.availabilityRepository.create(astrologerId, dto)
  }

  async getMyAvailability(astrologerId: string) {
    return this.availabilityRepository.findUpcomingByAstrologer(astrologerId)
  }

  async deleteAvailability(id: string, astrologerId: string) {
    const window = await this.availabilityRepository.findById(id)

    if (!window) {
      throw NotFoundError('Availability window not found')
    }

    if (window.astrologerId !== astrologerId) {
      throw ForbiddenError('You cannot delete another astrologer\'s availability')
    }

    return this.availabilityRepository.delete(id, astrologerId)
  }

  // ─── User: Public Queries ─────────────────────────────────────────────────

  /**
   * Returns a list of available dates (for calendar highlighting) for a given astrologer.
   */
  async getAvailableDates(astrologerId: string): Promise<string[]> {
    const windows = await this.availabilityRepository.findUpcomingByAstrologer(astrologerId)
    return windows.map((w) => w.date)
  }

  /**
   * Returns the availability window for a given astrologer on a specific date.
   * Used by the booking service to determine the time range.
   */
  async getAvailabilityForDate(astrologerId: string, date: string) {
    return this.availabilityRepository.findByDate(astrologerId, date)
  }

  /**
   * Fetches a service by its ID and validates it belongs to the given astrologer.
   */
  async getServiceForBooking(serviceId: string, astrologerId: string) {
    const service = await this.serviceRepository.findById(serviceId)

    if (!service) {
      throw NotFoundError('Service not found')
    }

    if (service.astrologerId !== astrologerId) {
      throw BadRequestError('Service does not belong to the specified astrologer')
    }

    if (!service.isActive) {
      throw BadRequestError('This service is currently unavailable')
    }

    return service
  }
}
