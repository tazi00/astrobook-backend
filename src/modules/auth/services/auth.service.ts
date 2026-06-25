import { verifySupabaseToken } from '@/core/utils/supabase'
import { UnauthorizedError, InvalidTokenError, TokenExpiredError } from '@/core/errors'
import type { UserRepository } from '../repositories/user.repository'
import type { SessionRepository } from '../repositories/session.repository'
import type { SupabaseLoginDto, AuthResponse } from '../schemas/auth.schema'
import { env } from '@/config/env'
import crypto from 'crypto'

interface JWTService {
  sign(payload: any, options?: any): string
  verify<T = any>(token: string): T
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JWTService,
    private readonly jwtRefreshService: JWTService,
  ) {}

  async loginWithSupabase(dto: SupabaseLoginDto, ip?: string): Promise<AuthResponse> {
    let supabaseUser: any
    try {
      supabaseUser = await verifySupabaseToken(dto.accessToken)
    } catch (error) {
      throw InvalidTokenError('Invalid Supabase access token')
    }

    const supabaseId = supabaseUser.id as string
    const email = supabaseUser.email ?? null
    const phone = supabaseUser.phone ?? null
    const name: string =
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      email?.split('@')[0] ??
      'User'

    let user = await this.userRepository.findBySupabaseId(supabaseId)

    if (!user) {
      user = await this.userRepository.create({
        supabaseId,
        email: email ?? null,
        phone: phone ?? null,
        name,
        role: 'user',
        isOnboarded: false,
      })
    }

    const accessToken = this.jwtService.sign(
      {
        userId: user.id,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    )

    const refreshToken = this.jwtRefreshService.sign(
      { userId: user.id, tokenId: crypto.randomUUID() },
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    )

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await this.sessionRepository.enforceSessionLimit(user.id)

    await this.sessionRepository.create({
      userId: user.id,
      refreshToken,
      deviceInfo: {
        userAgent: dto.deviceInfo?.userAgent,
        ip,
        platform: dto.deviceInfo?.platform,
      },
      expiresAt,
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    let decoded: any
    try {
      decoded = this.jwtRefreshService.verify(refreshToken)
    } catch (error) {
      throw TokenExpiredError('Refresh token expired or invalid')
    }

    const session = await this.sessionRepository.findByRefreshToken(refreshToken)
    if (!session) {
      throw UnauthorizedError('Invalid refresh token')
    }

    if (new Date() > session.expiresAt) {
      await this.sessionRepository.deleteById(session.id)
      throw TokenExpiredError('Refresh token expired')
    }

    const user = await this.userRepository.findById(decoded.userId)
    if (!user) {
      throw UnauthorizedError('User not found')
    }

    const accessToken = this.jwtService.sign(
      {
        userId: user.id,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    )

    return { accessToken }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessionRepository.deleteByRefreshToken(refreshToken)
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.deleteByUserId(userId)
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw UnauthorizedError('User not found')
    }
    return user
  }
}
