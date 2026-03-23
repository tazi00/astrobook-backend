import type { FastifyRequest, FastifyReply } from 'fastify'
import type { PaymentService } from '../service/payment.service'
import {
  CreatePaymentOrderSchema,
  VerifyPaymentSchema,
} from '@/modules/consultation/schemas/consultation.schema'

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  createOrder = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const dto = CreatePaymentOrderSchema.parse(request.body)

    const order = await this.paymentService.createOrder(userId, dto)
    return reply.status(201).send(order)
  }

  verifyPayment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const dto = VerifyPaymentSchema.parse(request.body)

    const result = await this.paymentService.verifyPayment(userId, dto)
    return reply.status(200).send(result)
  }
}
