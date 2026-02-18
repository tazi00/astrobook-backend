import { verifyFirebaseToken } from '@/core/utils/firebase'
import { UnauthorizedError, InvalidTokenError, TokenExpiredError } from '@/core/errors'
import type { UserRepository } from '../repositories/user.repository'
import type { SessionRepository } from '../repositories/session.repository'
import type { FastifyJWT } from '@fastify/jwt'
import type { FirebaseLoginDto, AuthResponse } from '../schemas/auth.schema'
import { env } from '@/config/env'
import crypto from 'crypto'

interface JWTService {
  sign(payload: object, options?: { expiresIn?: string }): string
  verify<T = FastifyJWT['user']>(token: string): T
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JWTService,
    private readonly jwtRefreshService: JWTService
  ) {}

  /**
   * Main login flow:
   * 1. Verify Firebase ID token
   * 2. Extract user info (firebaseUid, email, phone, name)
   * 3. Find or create user in DB
   * 4. Generate access + refresh tokens
   * 5. Store refresh token in sessions table
   * 6. Enforce max sessions limit
   */
  async loginWithFirebase(dto: FirebaseLoginDto, ip?: string): Promise<AuthResponse> {
    // 1. Verify Firebase token
    let decodedToken
    try {
      decodedToken = await verifyFirebaseToken(dto.idToken)
    } catch (error) {
      throw InvalidTokenError('Invalid Firebase ID token')
    }

    const { uid: firebaseUid, email, phone_number, name, picture } = decodedToken

    // 2. Find or create user
    let user = await this.userRepository.findByFirebaseUid(firebaseUid)

    if (!user) {
      // New user - create
      user = await this.userRepository.create({
        firebaseUid,
        email: email ?? null,
        phone: phone_number ?? null,
        name: name ?? email?.split('@')[0] ?? 'User',
        role: 'user',
        isOnboarded: false,
      })
    }

    // 3. Generate tokens
    const accessToken = this.jwtService.sign(
      {
        userId: user.id,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    )

    const refreshToken = this.jwtRefreshService.sign(
      { userId: user.id, tokenId: crypto.randomUUID() },
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    )

    // 4. Store refresh token in sessions
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    // 5. Enforce session limit BEFORE creating new session
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

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    // 1. Verify refresh token signature
    let decoded
    try {
      decoded = this.jwtRefreshService.verify<{ userId: string; tokenId: string }>(refreshToken)
    } catch (error) {
      throw TokenExpiredError('Refresh token expired or invalid')
    }

    // 2. Check if refresh token exists in DB
    const session = await this.sessionRepository.findByRefreshToken(refreshToken)
    if (!session) {
      throw UnauthorizedError('Invalid refresh token')
    }

    // 3. Check expiration
    if (new Date() > session.expiresAt) {
      await this.sessionRepository.deleteById(session.id)
      throw TokenExpiredError('Refresh token expired')
    }

    // 4. Get user
    const user = await this.userRepository.findById(decoded.userId)
    if (!user) {
      throw UnauthorizedError('User not found')
    }

    // 5. Issue new access token
    const accessToken = this.jwtService.sign(
      {
        userId: user.id,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    )

    return { accessToken }
  }

  /**
   * Logout - delete session by refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await this.sessionRepository.deleteByRefreshToken(refreshToken)
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.deleteByUserId(userId)
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw UnauthorizedError('User not found')
    }
    return user
  }
}
