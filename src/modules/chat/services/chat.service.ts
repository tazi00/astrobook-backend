import { ForbiddenError, NotFoundError } from '@/core/errors'
import type { ChatRepository } from '../repositories/chat.repository'
import type { AppointmentRepository } from '@/modules/consultation/repositories/appointment.repository'
import type { SendMessageDto } from '../schemas/chat.schema'

export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly appointmentRepository: AppointmentRepository,
  ) {}

  private async assertParticipant(appointmentId: string, userId: string) {
    const appointment = await this.appointmentRepository.findById(appointmentId)
    if (!appointment) throw NotFoundError('Appointment not found')
    if (appointment.userId !== userId && appointment.astrologerId !== userId) {
      throw ForbiddenError('You are not a participant of this appointment')
    }
    return appointment
  }

  async sendMessage(appointmentId: string, senderId: string, dto: SendMessageDto) {
    await this.assertParticipant(appointmentId, senderId)
    return this.chatRepository.create({
      appointmentId,
      senderId,
      content: dto.content,
    })
  }

  async getHistory(appointmentId: string, userId: string, after?: Date) {
    await this.assertParticipant(appointmentId, userId)
    if (after) {
      return this.chatRepository.findAfterTimestamp(appointmentId, after)
    }
    return this.chatRepository.findByAppointment(appointmentId)
  }
}
