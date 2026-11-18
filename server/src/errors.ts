export type ErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'unprocessable'
  | 'rate_limited'
  | 'internal_error'
  | 'account_not_provisioned'
  | 'idempotency_conflict'

/**
 * Operational error with an HTTP status and a stable machine-readable code.
 * Anything that is not an AppError is treated as an unexpected failure and is
 * never leaked to the client in production.
 */
export class AppError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details?: unknown
  readonly expose: boolean

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
    this.expose = status < 500
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'validation_error', message, details)
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'unauthorized', message)
  }

  static forbidden(message = 'Permission denied') {
    return new AppError(403, 'forbidden', message)
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'not_found', message)
  }

  static conflict(message: string, details?: unknown) {
    return new AppError(409, 'conflict', message, details)
  }

  static unprocessable(message: string, details?: unknown) {
    return new AppError(422, 'unprocessable', message, details)
  }

  static idempotency(message: string, details?: unknown) {
    return new AppError(409, 'idempotency_conflict', message, details)
  }
}

interface PgError {
  code?: string
  constraint?: string
  detail?: string
  message?: string
}

/**
 * Translate common Postgres failures into safe API responses. Constraint
 * messages are intentionally summarised rather than echoed verbatim because
 * they can contain column values.
 */
export function translateDatabaseError(error: unknown): AppError {
  const pg = error as PgError
  switch (pg?.code) {
    case '23505':
      return new AppError(409, 'conflict', 'A record with these details already exists', {
        constraint: pg.constraint,
      })
    case '23503':
      return new AppError(409, 'conflict', 'A referenced record does not exist', {
        constraint: pg.constraint,
      })
    case '23514':
      return new AppError(422, 'unprocessable', 'The submitted values violate a business rule', {
        constraint: pg.constraint,
      })
    case '22023':
      return new AppError(400, 'validation_error', pg.message ?? 'Invalid input value')
    case '42501':
      return new AppError(403, 'forbidden', 'The database rejected this operation')
    case 'P0002':
      return new AppError(404, 'not_found', pg.message ?? 'Resource not found')
    case '55000':
      return new AppError(409, 'conflict', pg.message ?? 'This record cannot be modified')
    case '22P02':
      return new AppError(400, 'validation_error', 'A value has an invalid format')
    default:
      return new AppError(500, 'internal_error', 'An unexpected error occurred')
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
