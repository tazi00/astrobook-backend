import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors'
import { env } from '@/config/env'
import type { AppointmentRepository } from '../repositories/appointment.repository'
import type { ConsultationService } from './consultation.service'
import type { AgoraService } from './agora.service'
import type { InitiateBookingDto, ConfirmBookingDto } from '../schemas/consultation.schema'
import type { Appointment } from '@/core/database/schema'

// Slot granularity: every 15 minutes within the availability window
const SLOT_INTERVAL_MINUTES = 15

/**
 * Converts a local date+time string to a UTC Date.
 * Handles any IANA timezone (e.g., "Asia/Kolkata", "America/New_York").
 */
function toUtcTimestamp(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number]
  const [hours, minutes] = timeStr.split(':').map(Number) as [number, number]

  const wrongUtcMs = Date.UTC(year, month - 1, day, hours, minutes, 0)
  const wrongUtcDate = new Date(wrongUtcMs)

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

  const localHour = Number(parts['hour']) === 24 ? 0 : Number(parts['hour'])
  const wrongLocalMs = Date.UTC(
    Number(parts['year']),
    Number(parts['month']) - 1,
    Number(parts['day']),
    localHour,
    Number(parts['minute']),
    Number(parts['second']),
  )

  const offsetMs = wrongLocalMs - wrongUtcMs
  return new Date(wrongUtcMs - offsetMs)
}

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

    const conflicts = existingAppointments.some((appt) => {
      const apptStart = appt.scheduledAt.getTime()
      const apptEnd = appt.endsAt.getTime()
      return slotStart < apptEnd && slotEnd > apptStart
    })

    if (!conflicts) slots.push(new Date(slotStart))
    cursor += intervalMs
  }

  return slots
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export class BookingService {
  private readonly razorpay: Razorpay

  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly consultationService: ConsultationService,
    private readonly agoraService: AgoraService,
  ) {
    this.razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  }

  // ─── Step 1: Validate + create Razorpay order ──────────────────────────────

  async initiateBooking(dto: InitiateBookingDto) {
    const { astrologerId, serviceId, date } = dto

    // Validate service exists
    const service = await this.consultationService.getServiceForBooking(serviceId, astrologerId)

    // Validate astrologer has availability on this date
    const availWindow = await this.consultationService.getAvailabilityForDate(astrologerId, date)
    if (!availWindow) {
      throw BadRequestError(`The astrologer is not available on ${date}`)
    }

    // Quick check: are there any free slots at all?
    const windowStart = toUtcTimestamp(availWindow.date, availWindow.startTime, availWindow.timezone)
    const windowEnd = toUtcTimestamp(availWindow.date, availWindow.endTime, availWindow.timezone)
    const existing = await this.appointmentRepository.findConfirmedByAstrologerInRange(
      astrologerId,
      windowStart,
      windowEnd,
    )
    const durationMs = service.durationMinutes * 60 * 1000
    const freeSlots = findFreeSlots(windowStart, windowEnd, durationMs, existing)

    if (freeSlots.length === 0) {
      throw BadRequestError('No available time slots for this date. Please choose another date.')
    }

    // Create Razorpay order (amount in paise)
    const priceInPaise = service.price
      ? Math.round(Number(service.price) * 100)
      : 0

    const order = await this.razorpay.orders.create({
      amount: priceInPaise,
      currency: 'INR',
      receipt: `astrobook_${crypto.randomUUID().slice(0, 16)}`,
    })

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      service: {
        title: service.title,
        durationMinutes: service.durationMinutes,
        price: service.price,
      },
    }
  }

  // ─── Step 2: Verify payment + allocate slot + generate Agora token ─────────

  async confirmBooking(userId: string, dto: ConfirmBookingDto): Promise<Appointment> {
    const { astrologerId, serviceId, date, notes, razorpayOrderId, razorpayPaymentId, razorpaySignature } = dto

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSignature !== razorpaySignature) {
      throw BadRequestError('Payment verification failed. Invalid signature.')
    }

    // Re-validate service + availability (slot might have been taken)
    const service = await this.consultationService.getServiceForBooking(serviceId, astrologerId)
    const availWindow = await this.consultationService.getAvailabilityForDate(astrologerId, date)

    if (!availWindow) {
      throw BadRequestError(`The astrologer is not available on ${date}`)
    }

    const windowStart = toUtcTimestamp(availWindow.date, availWindow.startTime, availWindow.timezone)
    const windowEnd = toUtcTimestamp(availWindow.date, availWindow.endTime, availWindow.timezone)

    const existingAppointments = await this.appointmentRepository.findConfirmedByAstrologerInRange(
      astrologerId,
      windowStart,
      windowEnd,
    )

    const durationMs = service.durationMinutes * 60 * 1000
    const freeSlots = findFreeSlots(windowStart, windowEnd, durationMs, existingAppointments)

    if (freeSlots.length === 0) {
      throw BadRequestError('All slots were filled. Please contact support for a refund.')
    }

    const scheduledAt = randomPick(freeSlots)
    const endsAt = new Date(scheduledAt.getTime() + durationMs)

    // Generate Agora channel + token
    const appointmentId = crypto.randomUUID()
    const agoraChannel = this.agoraService.generateChannelName(appointmentId)
    const agoraToken = this.agoraService.generateToken(agoraChannel, endsAt)

    // Persist appointment
    const appointment = await this.appointmentRepository.create({
      id: appointmentId,
      astrologerId,
      userId,
      serviceId,
      scheduledAt,
      endsAt,
      durationMinutes: service.durationMinutes,
      agoraChannel,
      agoraToken,
      razorpayOrderId,
      razorpayPaymentId,
      status: 'confirmed',
      notes: notes ?? null,
    })

    return appointment
  }

  // ─── Get a fresh Agora token for an existing appointment ───────────────────

  async getJoinToken(appointmentId: string, requesterId: string) {
    const appointment = await this.appointmentRepository.findById(appointmentId)

    if (!appointment) throw NotFoundError('Appointment not found')

    if (appointment.userId !== requesterId && appointment.astrologerId !== requesterId) {
      throw ForbiddenError('You are not a participant of this appointment')
    }

    if (appointment.status !== 'confirmed') {
      throw BadRequestError('Appointment is not active')
    }

    if (!appointment.agoraChannel) {
      throw BadRequestError('Agora channel not set for this appointment')
    }

    const freshToken = this.agoraService.refreshToken(appointment.agoraChannel)

    return {
      appId: env.AGORA_APP_ID,
      channel: appointment.agoraChannel,
      token: freshToken,
    }
  }

  async getMyAppointments(userId: string) {
    return this.appointmentRepository.findMineWithDetails(userId)
  }

  async cancelAppointment(appointmentId: string, requesterId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(appointmentId)

    if (!appointment) throw NotFoundError('Appointment not found')

    if (appointment.userId !== requesterId && appointment.astrologerId !== requesterId) {
      throw ForbiddenError('You are not authorized to cancel this appointment')
    }

    if (appointment.status === 'cancelled') {
      throw BadRequestError('Appointment is already cancelled')
    }

    if (appointment.status === 'completed') {
      throw BadRequestError('Cannot cancel a completed appointment')
    }

    const updated = await this.appointmentRepository.updateStatus(appointmentId, 'cancelled')
    return updated!
  }
}
