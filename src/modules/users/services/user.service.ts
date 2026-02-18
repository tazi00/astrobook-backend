import { NotFoundError, BadRequestError } from '@/core/errors'
import type { UserRepository } from '../repositories/user.repository'
import type { OnboardingDto, UpdateProfileDto } from '../schemas/user.schema'

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async onboardUser(userId: string, dto: OnboardingDto) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw NotFoundError('User not found')
    }

    if (user.isOnboarded) {
      throw BadRequestError('User is already onboarded')
    }

    return this.userRepository.updateOnboarding(userId, dto)
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw NotFoundError('User not found')
    }

    return user
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw NotFoundError('User not found')
    }

    return this.userRepository.updateProfile(userId, dto)
  }

  async upgradeToAstrologer(userId: string) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw NotFoundError('User not found')
    }

    if (user.isAstrologer) {
      throw BadRequestError('User is already an astrologer')
    }

    return this.userRepository.upgradeToAstrologer(userId)
  }
}
