import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import sensible from '@fastify/sensible'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { env } from '@/config/env'
import { swaggerPlugin } from './swagger'
import { errorHandlerPlugin } from '@/core/middleware/errorHandler'
import { requestLoggerPlugin } from '@/core/middleware/requestLogger'

export async function registerPlugins(app: FastifyInstance) {
  // Security
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  })

  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: (_req, context) => ({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Retry after ${context.after}`,
    }),
  })

  // Cookie support (for httpOnly refresh tokens)
  await app.register(cookie)

  // JWT - Access Token (short-lived)
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
  })

  // JWT - Refresh Token (long-lived)
  await app.register(jwt, {
    secret: env.JWT_REFRESH_SECRET,
    namespace: 'jwtRefresh',
    jwtVerify: 'jwtRefreshVerify',
    jwtSign: 'jwtRefreshSign',
    sign: {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
  })

  // Utilities
  await app.register(sensible)

  // Docs
  await swaggerPlugin(app)

  // Middleware
  await errorHandlerPlugin(app)
  await requestLoggerPlugin(app)
}
