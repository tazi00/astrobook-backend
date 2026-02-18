import type { FastifyInstance } from 'fastify'
import { AppError } from '@/core/errors'
import { ZodError } from 'zod'

export async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        requestId,
        details: error.flatten().fieldErrors,
      })
    }

    // Custom AppErrors
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        app.log.error({ err: error, requestId }, 'Operational server error')
      } else {
        app.log.warn({ err: error, requestId }, 'Client error')
      }

      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        requestId,
      })
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Request validation failed',
        requestId,
        details: error.validation,
      })
    }

    // JWT errors from @fastify/jwt
    if (error.message.includes('jwt') || error.message.includes('token')) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        requestId,
      })
    }

    // Unknown errors
    app.log.error({ err: error, requestId }, 'Unhandled error')

    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    })
  })
}
