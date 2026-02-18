import type { FastifyInstance } from 'fastify'
import { getDb } from '@/core/database/client'
import { UserRepository } from '../repositories/user.repository'
import { SessionRepository } from '../repositories/session.repository'
import { AuthService } from '../services/auth.service'
import { AuthController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'

export async function authRoutes(app: FastifyInstance) {
  // Dependency injection
  const db = getDb()
  const userRepository = new UserRepository(db)
  const sessionRepository = new SessionRepository(db)
  const authService = new AuthService(
    userRepository,
    sessionRepository,
    app.jwt, // access token JWT
    app.jwtRefresh // refresh token JWT (we'll register this in plugins)
  )
  const authController = new AuthController(authService)

  const prefix = '/auth'

  // POST /auth/login
  app.post(
    `${prefix}/login`,
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login with Firebase ID token',
        body: {
          type: 'object',
          required: ['idToken'],
          properties: {
            idToken: { type: 'string', description: 'Firebase ID token' },
            deviceInfo: {
              type: 'object',
              properties: {
                userAgent: { type: 'string' },
                platform: { type: 'string' },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  firebaseUid: { type: 'string' },
                  email: { type: ['string', 'null'] },
                  phone: { type: ['string', 'null'] },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['user', 'astrologer', 'admin'] },
                  isOnboarded: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    authController.login
  )

  // POST /auth/refresh
  app.post(
    `${prefix}/refresh`,
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
            },
          },
        },
      },
    },
    authController.refresh
  )

  // POST /auth/logout
  app.post(
    `${prefix}/logout`,
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout current session',
        response: {
          204: { type: 'null' },
        },
      },
    },
    authController.logout
  )

  // POST /auth/logout-all
  app.post(
    `${prefix}/logout-all`,
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Logout from all devices',
        security: [{ bearerAuth: [] }],
        response: {
          204: { type: 'null' },
        },
      },
    },
    authController.logoutAll
  )

  // GET /auth/me
  app.get(
    `${prefix}/me`,
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firebaseUid: { type: 'string' },
              email: { type: ['string', 'null'] },
              phone: { type: ['string', 'null'] },
              name: { type: 'string' },
              role: { type: 'string' },
              isOnboarded: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    authController.me
  )
}
