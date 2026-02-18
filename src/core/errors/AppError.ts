export type ErrorCode =
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'MAX_SESSIONS_EXCEEDED'

const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  MAX_SESSIONS_EXCEEDED: 429,
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode
  public readonly isOperational: boolean

  constructor(code: ErrorCode, message: string, isOperational = true) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = HTTP_STATUS_MAP[code]
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
    }
  }
}

// Factories
export const NotFoundError = (msg: string) => new AppError('NOT_FOUND', msg)
export const BadRequestError = (msg: string) => new AppError('BAD_REQUEST', msg)
export const UnauthorizedError = (msg: string) => new AppError('UNAUTHORIZED', msg)
export const ForbiddenError = (msg: string) => new AppError('FORBIDDEN', msg)
export const ConflictError = (msg: string) => new AppError('CONFLICT', msg)
export const ValidationError = (msg: string) => new AppError('VALIDATION_ERROR', msg)
export const InternalError = (msg: string) => new AppError('INTERNAL_ERROR', msg, false)
export const InvalidTokenError = (msg: string) => new AppError('INVALID_TOKEN', msg)
export const TokenExpiredError = (msg: string) => new AppError('TOKEN_EXPIRED', msg)
export const MaxSessionsExceededError = (msg: string) => new AppError('MAX_SESSIONS_EXCEEDED', msg)
