import { verifyFirebaseToken } from '@/core/utils/firebase'
import { UnauthorizedError, InvalidTokenError, TokenExpiredError } from '@/core/errors'
import type { UserRepository } from '../repositories/user.repository'
import type { SessionRepository } from '../repositories/session.repository'
import type { FirebaseLoginDto, AuthResponse } from '../schemas/auth.schema'
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
  ) {
    console.log('🚀 AuthService constructor called!')
    console.log('🔑 jwtService exists?', !!this.jwtService)
    console.log('🔑 jwtService.sign exists?', !!(this.jwtService && this.jwtService.sign))
    console.log('🔑 jwtRefreshService exists?', !!this.jwtRefreshService)
  }

  async loginWithFirebase(dto: FirebaseLoginDto, ip?: string): Promise<AuthResponse> {
    console.log('🔐 loginWithFirebase called')
    console.log('🔑 About to call jwtService.sign')
    console.log('🔑 this.jwtService is:', this.jwtService)

    let decodedToken: any
    try {
      decodedToken = await verifyFirebaseToken(dto.idToken)
    } catch (error) {
      throw InvalidTokenError('Invalid Firebase ID token')
    }

    const { uid: firebaseUid, email, phone_number, name } = decodedToken

    let user = await this.userRepository.findByFirebaseUid(firebaseUid)

    if (!user) {
      user = await this.userRepository.create({
        firebaseUid,
        email: email ?? null,
        phone: phone_number ?? null,
        name: name ?? email?.split('@')[0] ?? 'User',
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
        firebaseUid: user.firebaseUid,
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
