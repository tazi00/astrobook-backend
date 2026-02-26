import type { FastifyRequest, FastifyReply } from 'fastify'
import type { BookingService } from '../services/booking.service'
import type { ConsultationService } from '../services/consultation.service'
import { CreateBookingSchema } from '../schemas/consultation.schema'

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

  // ─── Authenticated: Booking ───────────────────────────────────────────────

  createBooking = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string; email?: string }
    const userWithEmail = request.user as { userId: string; email?: string | null }
    const dto = CreateBookingSchema.parse(request.body)

    const appointment = await this.bookingService.createBooking(
      userId,
      userWithEmail.email ?? null,
      dto,
    )

    return reply.status(201).send({
      message: 'Appointment booked successfully',
      appointment,
    })
  }

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
