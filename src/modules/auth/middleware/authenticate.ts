import type { FastifyRequest, FastifyReply } from 'fastify'
import { UnauthorizedError, ForbiddenError } from '@/core/errors'

/**
 * Middleware to verify JWT access token.
 * Attaches decoded user payload to request.user
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (error) {
    throw UnauthorizedError('Invalid or expired token')
  }
}

/**
 * Role-based access control
 * Usage: { preHandler: [authenticate, requireRole(['admin', 'astrologer'])] }
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string; role: string; isOnboarded: boolean }

    if (!user || !allowedRoles.includes(user.role)) {
      throw ForbiddenError('Insufficient permissions')
    }
  }
}

/**
 * Require user to be onboarded
 */
export async function requireOnboarded(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { userId: string; role: string; isOnboarded: boolean }

  if (!user?.isOnboarded) {
    throw ForbiddenError('Please complete onboarding first')
  }
}
