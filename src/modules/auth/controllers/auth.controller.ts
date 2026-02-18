import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthService } from '../services/auth.service'
import { FirebaseLoginSchema, RefreshTokenSchema } from '../schemas/auth.schema'

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Login with Firebase ID token
   */
  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const dto = FirebaseLoginSchema.parse(request.body)
    const ip = request.ip

    const result = await this.authService.loginWithFirebase(dto, ip)

    // Set refresh token as httpOnly cookie (optional but recommended)
    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return reply.status(200).send(result)
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    // Try to get refresh token from cookie first, then body
    const refreshToken =
      request.cookies['refreshToken'] || RefreshTokenSchema.parse(request.body).refreshToken

    const result = await this.authService.refreshAccessToken(refreshToken)
    return reply.status(200).send(result)
  }

  /**
   * POST /auth/logout
   * Logout current session
   */
  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken =
      request.cookies['refreshToken'] || RefreshTokenSchema.parse(request.body).refreshToken

    await this.authService.logout(refreshToken)

    reply.clearCookie('refreshToken')
    return reply.status(204).send()
  }

  /**
   * POST /auth/logout-all
   * Logout from all devices
   */
  logoutAll = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string }
    await this.authService.logoutAll(user.userId)

    reply.clearCookie('refreshToken')
    return reply.status(204).send()
  }

  /**
   * GET /auth/me
   * Get current user
   */
  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string }
    const currentUser = await this.authService.getCurrentUser(user.userId)

    return reply.status(200).send({
      id: currentUser.id,
      firebaseUid: currentUser.firebaseUid,
      email: currentUser.email,
      phone: currentUser.phone,
      name: currentUser.name,
      role: currentUser.role,
      isOnboarded: currentUser.isOnboarded,
      createdAt: currentUser.createdAt,
    })
  }
}
