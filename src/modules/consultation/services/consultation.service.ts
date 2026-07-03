import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors'
import type { ServiceRepository } from '../repositories/service.repository'
import type { AvailabilityRepository } from '../repositories/availability.repository'
import type { AppointmentRepository } from '../repositories/appointment.repository'
import type {
  UpsertServiceDto,
  CreateAvailabilityDto,
} from '../schemas/consultation.schema'

// ─── Slot Generation Helper ───────────────────────────────────────────────────

function toUtcTimestamp(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number]
  const [hours, minutes] = timeStr.split(':').map(Number) as [number, number]

  const wrongUtcMs = Date.UTC(year, month - 1, day, hours, minutes, 0)
  const wrongUtcDate = new Date(wrongUtcMs)

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  })

  const parts = Object.fromEntries(fmt.formatToParts(wrongUtcDate).map((p) => [p.type, p.value]))
  const localHour = Number(parts['hour']) === 24 ? 0 : Number(parts['hour'])
  const wrongLocalMs = Date.UTC(
    Number(parts['year']), Number(parts['month']) - 1, Number(parts['day']),
    localHour, Number(parts['minute']), Number(parts['second']),
  )

  const offsetMs = wrongLocalMs - wrongUtcMs
  return new Date(wrongUtcMs - offsetMs)
}

export type TimeSlot = {
  startTime: string  // ISO string
  endTime: string    // ISO string
  available: boolean
}

// ─── ConsultationService ──────────────────────────────────────────────────────

export class ConsultationService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly appointmentRepository: AppointmentRepository,
  ) {}

  // ── Astrologer: Services ───────────────────────────────────────────────────

  async upsertService(astrologerId: string, dto: UpsertServiceDto) {
    return this.serviceRepository.upsert(astrologerId, dto)
  }

  async getMyServices(astrologerId: string) {
    return this.serviceRepository.findByAstrologer(astrologerId)
  }

  async deactivateService(serviceId: string, astrologerId: string) {
    const service = await this.serviceRepository.findById(serviceId)
    if (!service) throw NotFoundError('Service not found')
    if (service.astrologerId !== astrologerId) throw ForbiddenError('Not your service')
    return this.serviceRepository.deactivate(serviceId, astrologerId)
  }

  // User side — astrologer ki services
  async getAstrologerServices(astrologerId: string) {
    return this.serviceRepository.findByAstrologer(astrologerId)
  }

  async getServiceForBooking(serviceId: string, astrologerId: string) {
    const service = await this.serviceRepository.findById(serviceId)
    if (!service) throw NotFoundError('Service not found')
    if (service.astrologerId !== astrologerId) {
      throw BadRequestError('Service does not belong to the specified astrologer')
    }
    if (!service.isActive) throw BadRequestError('This service is currently unavailable')
    return service
  }

  // ── Astrologer: Availability ───────────────────────────────────────────────

  async setAvailability(astrologerId: string, dto: CreateAvailabilityDto) {
    return this.availabilityRepository.upsert(astrologerId, dto)
  }

  async getMyAvailability(astrologerId: string) {
    return this.availabilityRepository.findUpcomingByAstrologer(astrologerId)
  }

  async deleteAvailability(id: string, astrologerId: string) {
    const window = await this.availabilityRepository.findById(id)
    if (!window) throw NotFoundError('Availability window not found')
    if (window.astrologerId !== astrologerId) {
      throw ForbiddenError("You cannot delete another astrologer's availability")
    }
    return this.availabilityRepository.delete(id, astrologerId)
  }

  // ── User: Available Dates ──────────────────────────────────────────────────

  async getAvailableDates(astrologerId: string): Promise<string[]> {
    const windows = await this.availabilityRepository.findUpcomingByAstrologer(astrologerId)
    return windows.map((w) => w.date)
  }

  async getAvailabilityForDate(astrologerId: string, date: string) {
    return this.availabilityRepository.findByDate(astrologerId, date)
  }

  // ── User: Available Slots (MAIN FUNCTION) ─────────────────────────────────
  //
  // Algorithm:
  //   1. Fetch availability window for the date
  //   2. Get all confirmed/ongoing appointments for that astrologer that day
  //   3. Generate slots of durationMinutes within the window
  //   4. Mark slots as unavailable if they overlap with existing bookings

  async getAvailableSlots(
    astrologerId: string,
    serviceId: string,
    date: string,
  ): Promise<TimeSlot[]> {
    // Service fetch karo — duration ke liye
    const service = await this.serviceRepository.findById(serviceId)
    if (!service) throw NotFoundError('Service not found')
    if (!service.isActive) throw BadRequestError('Service is not active')

    // Availability window fetch karo
    const window = await this.availabilityRepository.findByDate(astrologerId, date)
    if (!window) return [] // Koi availability nahi

    const windowStart = toUtcTimestamp(window.date, window.startTime, window.timezone)
    const windowEnd   = toUtcTimestamp(window.date, window.endTime, window.timezone)
    const durationMs  = service.durationMinutes * 60 * 1000

    // Window duration check — service fit hogi?
    const windowDurationMs = windowEnd.getTime() - windowStart.getTime()
    if (windowDurationMs < durationMs) return []

    // Existing bookings fetch karo
    const existingBookings = await this.appointmentRepository.findConfirmedByAstrologerInRange(
      astrologerId,
      windowStart,
      windowEnd,
    )

    // Slots generate karo
    const slots: TimeSlot[] = []
    let current = new Date(windowStart)

    while (current.getTime() + durationMs <= windowEnd.getTime()) {
      const slotStart = new Date(current)
      const slotEnd   = new Date(current.getTime() + durationMs)

      // Existing bookings se overlap check karo
      const isBooked = existingBookings.some((booking) => {
        const bookingStart = new Date(booking.scheduledAt)
        const bookingEnd   = new Date(booking.endsAt)
        return slotStart < bookingEnd && slotEnd > bookingStart
      })

      // Past slots available nahi honge
      const isPast = slotStart < new Date()

      slots.push({
        startTime: slotStart.toISOString(),
        endTime:   slotEnd.toISOString(),
        available: !isBooked && !isPast,
      })

      // Next slot
      current = slotEnd
    }

    return slots
  }
}
