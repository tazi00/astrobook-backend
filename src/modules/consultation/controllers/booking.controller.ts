import type { FastifyRequest, FastifyReply } from 'fastify'
import type { BookingService } from '../services/booking.service'
import type { ConsultationService } from '../services/consultation.service'
import {
  InitiateBookingSchema,
  ConfirmBookingSchema,
} from '../schemas/consultation.schema'

export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly consultationService: ConsultationService,
  ) {}

  // ─── Public: Browse Astrologer Services ───────────────────────────────────

  getAstrologerServices = async (request: FastifyRequest, reply: FastifyReply) => {
    const { astrologerId } = request.params as { astrologerId: string }
    const services = await this.consultationService.getAstrologerServices(astrologerId)
    return reply.status(200).send({ services })
  }

  getAvailableDates = async (request: FastifyRequest, reply: FastifyReply) => {
    const { astrologerId } = request.params as { astrologerId: string }
    const dates = await this.consultationService.getAvailableDates(astrologerId)
    return reply.status(200).send({ availableDates: dates })
  }

  // ─── Step 1: Initiate booking (validate + create Razorpay order) ──────────

  initiateBooking = async (request: FastifyRequest, reply: FastifyReply) => {
    const dto = InitiateBookingSchema.parse(request.body)
    const result = await this.bookingService.initiateBooking(dto)
    return reply.status(200).send(result)
  }

  // ─── Step 2: Confirm booking (verify payment + create appointment) ─────────

  confirmBooking = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const dto = ConfirmBookingSchema.parse(request.body)
    const appointment = await this.bookingService.confirmBooking(userId, dto)
    return reply.status(201).send({
      message: 'Appointment booked successfully',
      appointment,
    })
  }

  // ─── Get fresh Agora token to join the call ────────────────────────────────

  getJoinToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const result = await this.bookingService.getJoinToken(id, userId)
    return reply.status(200).send(result)
  }

  // ─── Authenticated: List + Cancel ─────────────────────────────────────────

  getMyAppointments = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const appointments = await this.bookingService.getMyAppointments(userId)
    return reply.status(200).send({ appointments })
  }

  cancelAppointment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    await this.bookingService.cancelAppointment(id, userId)
    return reply.status(204).send()
  }
}
