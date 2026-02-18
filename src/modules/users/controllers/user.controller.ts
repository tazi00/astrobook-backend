import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserService } from '../services/user.service'
import { OnboardingSchema, UpdateProfileSchema } from '../schemas/user.schema'

export class UserController {
  constructor(private readonly userService: UserService) {}

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
