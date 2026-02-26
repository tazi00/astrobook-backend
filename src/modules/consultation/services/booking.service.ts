import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors'
import type { AppointmentRepository } from '../repositories/appointment.repository'
import type { ConsultationService } from './consultation.service'
import type { GoogleMeetService } from './google-meet.service'
import type { CreateBookingDto } from '../schemas/consultation.schema'
import type { Appointment } from '@/core/database/schema'

// Slot granularity: every 15 minutes within the availability window
const SLOT_INTERVAL_MINUTES = 15

/**
 * Converts a local date+time string to a UTC Date.
 * Handles any IANA timezone (e.g., "Asia/Kolkata", "America/New_York").
 *
 * Algorithm:
 *  1. Treat the input local time as if it were UTC (creating a "wrong" UTC)
 *  2. Find what local clock shows for that wrong UTC in the target timezone
 *  3. Compute the timezone offset (localClock - wrongUTC)
 *  4. Subtract the offset from the wrong UTC to get the real UTC
 */
function toUtcTimestamp(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number]
  const [hours, minutes] = timeStr.split(':').map(Number) as [number, number]

  // Step 1: Create a "wrong" UTC as if input were already UTC
  const wrongUtcMs = Date.UTC(year, month - 1, day, hours, minutes, 0)
  const wrongUtcDate = new Date(wrongUtcMs)

  // Step 2: Format that wrong UTC moment in the target timezone to get local components
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })

  const parts = Object.fromEntries(fmt.formatToParts(wrongUtcDate).map((p) => [p.type, p.value]))

  // Handle midnight represented as hour "24"
  const localHour = Number(parts['hour']) === 24 ? 0 : Number(parts['hour'])
  const wrongLocalMs = Date.UTC(
    Number(parts['year']),
    Number(parts['month']) - 1,
    Number(parts['day']),
    localHour,
    Number(parts['minute']),
    Number(parts['second']),
  )

  // Step 3: offset = localClock - wrongUTC (this is the tz offset in ms)
  const offsetMs = wrongLocalMs - wrongUtcMs

  // Step 4: real UTC = inputLocalMs - offset
  return new Date(wrongUtcMs - offsetMs)
}

/**
 * Finds all free slots within [windowStart, windowEnd) with the given duration,
 * avoiding any existing appointments.
 */
function findFreeSlots(
  windowStart: Date,
  windowEnd: Date,
  durationMs: number,
  existingAppointments: Array<{ scheduledAt: Date; endsAt: Date }>,
): Date[] {
  const slots: Date[] = []
  const intervalMs = SLOT_INTERVAL_MINUTES * 60 * 1000

  let cursor = windowStart.getTime()
  const windowEndMs = windowEnd.getTime()

  while (cursor + durationMs <= windowEndMs) {
    const slotStart = cursor
    const slotEnd = cursor + durationMs

    // Check if this slot overlaps with any existing appointment
    const conflicts = existingAppointments.some((appt) => {
      const apptStart = appt.scheduledAt.getTime()
      const apptEnd = appt.endsAt.getTime()
      return slotStart < apptEnd && slotEnd > apptStart
    })

    if (!conflicts) {
      slots.push(new Date(slotStart))
    }

    cursor += intervalMs
  }

  return slots
}

/** Picks a cryptographically random element from an array */
function randomPick<T>(arr: T[]): T {
  const idx = Math.floor(Math.random() * arr.length)
  return arr[idx]!
}

export class BookingService {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly consultationService: ConsultationService,
    private readonly googleMeetService: GoogleMeetService,
  ) {}

  async createBooking(
    userId: string,
    userEmail: string | null,
    dto: CreateBookingDto,
  ): Promise<Appointment> {
    const { astrologerId, serviceId, date, notes } = dto

    // 1. Validate service
    const service = await this.consultationService.getServiceForBooking(serviceId, astrologerId)

    // 2. Check availability window for the requested date
    const availWindow = await this.consultationService.getAvailabilityForDate(astrologerId, date)

    if (!availWindow) {
      throw BadRequestError(`The astrologer is not available on ${date}`)
    }

    // 3. Convert availability window to UTC timestamps
    const windowStart = toUtcTimestamp(availWindow.date, availWindow.startTime, availWindow.timezone)
    const windowEnd = toUtcTimestamp(availWindow.date, availWindow.endTime, availWindow.timezone)

    // 4. Fetch existing confirmed appointments in this window
    const existingAppointments = await this.appointmentRepository.findConfirmedByAstrologerInRange(
      astrologerId,
      windowStart,
      windowEnd,
    )

    // 5. Build list of free slots
    const durationMs = service.durationMinutes * 60 * 1000
    const freeSlots = findFreeSlots(windowStart, windowEnd, durationMs, existingAppointments)

    if (freeSlots.length === 0) {
      throw BadRequestError('No available time slots for this date. Please choose another date.')
    }

    // 6. Pick a random free slot
    const scheduledAt = randomPick(freeSlots)
    const endsAt = new Date(scheduledAt.getTime() + durationMs)

    // 7. Generate Google Meet link
    const appointmentId = crypto.randomUUID()
    const meetResult = await this.googleMeetService.createMeeting({
      title: `Astrobook Consultation: ${service.title}`,
      startTime: scheduledAt,
      endTime: endsAt,
      attendeeEmails: userEmail ? [userEmail] : [],
      requestId: `astrobook-${appointmentId}`,
    })

    // 8. Persist appointment
    const appointment = await this.appointmentRepository.create({
      id: appointmentId,
      astrologerId,
      userId,
      serviceId,
      scheduledAt,
      endsAt,
      durationMinutes: service.durationMinutes,
      meetLink: meetResult.meetLink,
      googleEventId: meetResult.eventId,
      status: 'confirmed',
      notes: notes ?? null,
    })

    return appointment
  }

  async getMyAppointments(userId: string) {
    return this.appointmentRepository.findMineWithDetails(userId)
  }

  async cancelAppointment(
    appointmentId: string,
    requesterId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(appointmentId)

    if (!appointment) {
      throw NotFoundError('Appointment not found')
    }

    // Only the user who booked or the astrologer can cancel
    if (appointment.userId !== requesterId && appointment.astrologerId !== requesterId) {
      throw ForbiddenError('You are not authorized to cancel this appointment')
    }

    if (appointment.status === 'cancelled') {
      throw BadRequestError('Appointment is already cancelled')
    }

    if (appointment.status === 'completed') {
      throw BadRequestError('Cannot cancel a completed appointment')
    }

    // Cancel the Google Calendar event (best-effort)
    if (appointment.googleEventId) {
      try {
        await this.googleMeetService.cancelEvent(appointment.googleEventId)
      } catch {
        // Non-fatal: log and continue even if Google event deletion fails
        console.warn(`Failed to delete Google event ${appointment.googleEventId}`)
      }
    }

    const updated = await this.appointmentRepository.updateStatus(appointmentId, 'cancelled')
    return updated!
  }
}
