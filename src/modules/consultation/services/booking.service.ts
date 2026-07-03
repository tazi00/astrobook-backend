import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors'
import type { AppointmentRepository } from '../repositories/appointment.repository'
import type { ConsultationService } from './consultation.service'
import type { AgoraService } from './agora.service'
import type { CreateBookingDto } from '../schemas/consultation.schema'
import type { Appointment } from '@/core/database/schema'

// ─── UTC Helper ───────────────────────────────────────────────────────────────

function toUtcTimestamp(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number]
  const [hours, minutes] = timeStr.split(':').map(Number) as [number, number]
  const wrongUtcMs = Date.UTC(year, month - 1, day, hours, minutes, 0)
  const wrongUtcDate = new Date(wrongUtcMs)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(wrongUtcDate).map((p) => [p.type, p.value]))
  const localHour = Number(parts['hour']) === 24 ? 0 : Number(parts['hour'])
  const wrongLocalMs = Date.UTC(
    Number(parts['year']), Number(parts['month']) - 1, Number(parts['day']),
    localHour, Number(parts['minute']), Number(parts['second']),
  )
  return new Date(wrongUtcMs - (wrongLocalMs - wrongUtcMs))
}

// ─── BookingService ───────────────────────────────────────────────────────────

export class BookingService {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly consultationService: ConsultationService,
    private readonly agoraService: AgoraService,
  ) {}

  // ── Initiate Booking (pending — payment abhi baki) ────────────────────────

  async initiateBooking(userId: string, dto: CreateBookingDto): Promise<Appointment> {
    const { astrologerId, serviceId, scheduledAt: scheduledAtIso, notes } = dto

    const service = await this.consultationService.getServiceForBooking(serviceId, astrologerId)

    const scheduledAt = new Date(scheduledAtIso)
    if (isNaN(scheduledAt.getTime())) throw BadRequestError('Invalid scheduledAt datetime')

    // Availability check
    const date = scheduledAtIso.split('T')[0]!
    const availWindow = await this.consultationService.getAvailabilityForDate(astrologerId, date)
    if (!availWindow) throw BadRequestError(`Astrologer not available on ${date}`)

    const windowStart = toUtcTimestamp(availWindow.date, availWindow.startTime, availWindow.timezone)
    const windowEnd   = toUtcTimestamp(availWindow.date, availWindow.endTime, availWindow.timezone)

    if (scheduledAt < windowStart || scheduledAt >= windowEnd) {
      throw BadRequestError('Requested slot is outside astrologer availability window')
    }

    const durationMs = service.durationMinutes * 60 * 1000
    const endsAt = new Date(scheduledAt.getTime() + durationMs)

    // Slot conflict check
    const existing = await this.appointmentRepository.findConfirmedByAstrologerInRange(
      astrologerId, scheduledAt, endsAt,
    )
    if (existing.length > 0) throw BadRequestError('This slot is already booked')

    // Appointment create karo (pending)
    const appointment = await this.appointmentRepository.create({
      astrologerId,
      userId,
      serviceId,
      scheduledAt,
      endsAt,
      durationMinutes: service.durationMinutes,
      status: 'pending',
      notes: notes ?? null,
    })

    return appointment
  }

  // ── Confirm Booking (after payment webhook) ───────────────────────────────

  async confirmBooking(appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(appointmentId)
    if (!appointment) throw NotFoundError('Appointment not found')
    if (appointment.status !== 'pending') {
      throw BadRequestError(`Cannot confirm appointment with status: ${appointment.status}`)
    }
    const updated = await this.appointmentRepository.update(appointmentId, { status: 'confirmed' })
    return updated!
  }

  // ── Join Session → Agora token generate ───────────────────────────────────

  async joinSession(appointmentId: string, requesterId: string) {
    const appointment = await this.appointmentRepository.findByIdWithDetails(appointmentId)
    if (!appointment) throw NotFoundError('Appointment not found')

    if (appointment.userId !== requesterId && appointment.astrologerId !== requesterId) {
      throw ForbiddenError('You are not part of this session')
    }

    if (appointment.status === 'cancelled') throw BadRequestError('Appointment is cancelled')
    if (appointment.status === 'completed') throw BadRequestError('Session already completed')

    // Agora token generate karo
    const { channel, token } = this.agoraService.generateToken(appointmentId)

    // ongoing mark karo (pehli baar join pe)
    if (appointment.status === 'confirmed') {
      await this.appointmentRepository.update(appointmentId, {
        status: 'ongoing',
        agoraChannel: channel,
        agoraToken: token,
      })
    }

    return {
      appointment,
      agora: { channel, token },
    }
  }

  // ── End Session ────────────────────────────────────────────────────────────

  async endSession(appointmentId: string, requesterId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(appointmentId)
    if (!appointment) throw NotFoundError('Appointment not found')

    if (appointment.astrologerId !== requesterId) {
      throw ForbiddenError('Only the astrologer can end the session')
    }

    if (appointment.status !== 'ongoing') {
      throw BadRequestError('Session is not ongoing')
    }

    const updated = await this.appointmentRepository.update(appointmentId, { status: 'completed' })
    return updated!
  }

  // ── Get Appointments ───────────────────────────────────────────────────────

  async getMyAppointments(userId: string) {
    return this.appointmentRepository.findMineGrouped(userId)
  }

  async getAppointmentById(id: string, requesterId: string) {
    const appointment = await this.appointmentRepository.findByIdWithDetails(id)
    if (!appointment) throw NotFoundError('Appointment not found')

    if (appointment.userId !== requesterId && appointment.astrologerId !== requesterId) {
      throw ForbiddenError('You are not authorized to view this appointment')
    }

    const children =
      appointment.parentId === null ? await this.appointmentRepository.findChildren(id) : []

    return { ...appointment, children }
  }

  async cancelAppointment(appointmentId: string, requesterId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(appointmentId)
    if (!appointment) throw NotFoundError('Appointment not found')

    if (appointment.userId !== requesterId && appointment.astrologerId !== requesterId) {
      throw ForbiddenError('You are not authorized to cancel this appointment')
    }

    if (appointment.status === 'cancelled') throw BadRequestError('Already cancelled')
    if (appointment.status === 'completed') throw BadRequestError('Cannot cancel a completed appointment')
    if (appointment.status === 'ongoing') throw BadRequestError('Cannot cancel an ongoing session')

    const updated = await this.appointmentRepository.update(appointmentId, { status: 'cancelled' })
    return updated!
  }

  // ── Astrologer Schedule ────────────────────────────────────────────────────

  async getSchedule(astrologerId: string, date: string) {
    return this.appointmentRepository.findByAstrologerAndDate(astrologerId, date)
  }
}
