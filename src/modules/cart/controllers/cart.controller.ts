import type { FastifyRequest, FastifyReply } from 'fastify'
import type { CartService } from '../services/cart.service'
import {
  AddCartItemSchema,
  SetCartSlotSchema,
  CartCheckoutCreateOrderSchema,
  CartCheckoutVerifySchema,
} from '../schemas/cart.schema'

export class CartController {
  constructor(private readonly cartService: CartService) {}

  addItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const dto = AddCartItemSchema.parse(request.body)
    const item = await this.cartService.addItem(userId, dto)
    return reply.status(201).send({ success: true, data: { item } })
  }

  getMyCart = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const items = await this.cartService.getMyCart(userId)
    return reply.send({ success: true, data: { items } })
  }

  setSlot = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const dto = SetCartSlotSchema.parse(request.body)
    const item = await this.cartService.setSlot(id, userId, dto.scheduledAt)
    return reply.send({ success: true, data: { item } })
  }

  removeItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    await this.cartService.removeItem(id, userId)
    return reply.send({ success: true })
  }

  createCheckoutOrder = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const dto = CartCheckoutCreateOrderSchema.parse(request.body)
    const order = await this.cartService.createCheckoutOrder(userId, dto.cartItemIds)
    return reply.status(201).send(order)
  }

  verifyCheckout = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const dto = CartCheckoutVerifySchema.parse(request.body)
    const result = await this.cartService.verifyCheckout(userId, dto)
    return reply.status(200).send(result)
  }
}
