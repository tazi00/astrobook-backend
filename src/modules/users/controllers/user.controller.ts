import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserService } from '../services/user.service'
import type { PushNotificationService } from '@/core/services/push-notification.service'
import { OnboardingSchema, UpdateProfileSchema, RegisterPushTokenSchema } from '../schemas/user.schema'

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  // POST /users/me/push-token
  registerPushToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string }
    const dto = RegisterPushTokenSchema.parse(request.body)
    await this.pushNotificationService.registerToken(user.userId, dto.expoPushToken, dto.platform)
    return reply.status(200).send({ success: true })
  }

  /**
   * POST /users/onboarding
   * Complete onboarding (first-time setup)
   */
  onboard = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string }
    const dto = OnboardingSchema.parse(request.body)

    const updatedUser = await this.userService.onboardUser(user.userId, dto)

    return reply.status(200).send({
      message: 'Onboarding completed successfully',
      user: updatedUser,
    })
  }

  /**
   * GET /users/me
   * Get current user profile
   */
  getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string }
    const profile = await this.userService.getProfile(user.userId)

    return reply.status(200).send(profile)
  }

  /**
   * PATCH /users/me
   * Update profile
   */
  updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string }
    const dto = UpdateProfileSchema.parse(request.body)

    const updatedUser = await this.userService.updateProfile(user.userId, dto)

    return reply.status(200).send(updatedUser)
  }

  /**
   * POST /users/upgrade-to-astrologer
   * Upgrade user to astrologer role
   */
  upgradeToAstrologer = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string }
    const updatedUser = await this.userService.upgradeToAstrologer(user.userId)

    return reply.status(200).send({
      message: 'Successfully upgraded to astrologer',
      user: updatedUser,
    })
  }
}
