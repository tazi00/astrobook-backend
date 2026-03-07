import type { FastifyInstance } from 'fastify'
import { getDb } from '@/core/database/client'
import { authenticate } from '@/modules/auth'
import { AppointmentRepository } from '@/modules/consultation/repositories/appointment.repository'
import { ChatRepository } from '../repositories/chat.repository'
import { ChatService } from '../services/chat.service'
import { ChatController } from '../controllers/chat.controller'

export async function chatRoutes(app: FastifyInstance) {
  const db = getDb()

  const chatRepository = new ChatRepository(db)
  const appointmentRepository = new AppointmentRepository(db)
  const chatService = new ChatService(chatRepository, appointmentRepository)
  const chatController = new ChatController(chatService)

  // POST /chat/:appointmentId/messages — send a message
  app.post('/chat/:appointmentId/messages', {
    preHandler: [authenticate],
    schema: {
      tags: ['Chat'],
      summary: 'Send a chat message in an appointment',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['appointmentId'],
        properties: { appointmentId: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, chatController.sendMessage)

  // GET /chat/:appointmentId/messages — full history or poll with ?after=<ISO timestamp>
  app.get('/chat/:appointmentId/messages', {
    preHandler: [authenticate],
    schema: {
      tags: ['Chat'],
      summary: 'Get chat history (use ?after=<ISO> for polling new messages)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['appointmentId'],
        properties: { appointmentId: { type: 'string', format: 'uuid' } },
      },
      querystring: {
        type: 'object',
        properties: {
          after: { type: 'string', description: 'ISO 8601 timestamp — return only messages after this time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            messages: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  }, chatController.getHistory)
}
