import type { FastifyInstance } from 'fastify'

export async function requestLoggerPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        ip: request.ip,
        requestId: request.id,
      },
      'Incoming request'
    )
  })

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
        requestId: request.id,
      },
      'Request completed'
    )
  })
}
