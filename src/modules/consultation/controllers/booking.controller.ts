import type { FastifyRequest, FastifyReply } from 'fastify'
import type { BookingService } from '../services/booking.service'
import { CreateBookingSchema } from '../schemas/consultation.schema'

export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // POST /consultation/appointments/initiate
  initiateBooking = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const dto = CreateBookingSchema.parse(request.body)

    const appointment = await this.bookingService.initiateBooking(userId, dto)
    return reply.status(201).send({
      message: 'Appointment initiated successfully',
      appointment,
    })
  }

  // GET /consultation/appointments/mine
  getMyAppointments = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const appointments = await this.bookingService.getMyAppointments(userId)
    return reply.status(200).send(appointments)
  }

  // GET /consultation/appointments/:id
  getAppointmentById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    const appointment = await this.bookingService.getAppointmentById(id, userId)
    return reply.status(200).send({ appointment })
  }

  // PATCH /consultation/appointments/:id/cancel
  cancelAppointment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    await this.bookingService.cancelAppointment(id, userId)
    return reply.status(204).send()
  }
}
