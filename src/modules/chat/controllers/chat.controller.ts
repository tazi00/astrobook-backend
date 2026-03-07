import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ChatService } from '../services/chat.service'
import { SendMessageSchema } from '../schemas/chat.schema'

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  sendMessage = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { appointmentId } = request.params as { appointmentId: string }
    const dto = SendMessageSchema.parse(request.body)

    const message = await this.chatService.sendMessage(appointmentId, userId, dto)
    return reply.status(201).send({ message })
  }

  getHistory = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { appointmentId } = request.params as { appointmentId: string }
    const { after } = request.query as { after?: string }

    const afterDate = after ? new Date(after) : undefined
    const messages = await this.chatService.getHistory(appointmentId, userId, afterDate)
    return reply.status(200).send({ messages })
  }
}
