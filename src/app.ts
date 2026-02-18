import Fastify from 'fastify'
import { env } from '@/config/env'
import { registerPlugins } from '@/core/plugins'
import { authRoutes } from '@/modules/auth'
import { userRoutes } from '@/modules/users'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
              },
            },
          }
        : {}),
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => crypto.randomUUID(),
  })

  // Register plugins (cors, helmet, JWT, error handlers, etc.)
  await registerPlugins(app)

  // Health check
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      })
    }
  )

  // API routes
  const apiPrefix = `/api/${env.API_VERSION}`
  await app.register(authRoutes, { prefix: apiPrefix })
  await app.register(userRoutes, { prefix: apiPrefix })

  return app
}
