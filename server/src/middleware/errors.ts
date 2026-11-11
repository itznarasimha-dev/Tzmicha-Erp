import type { Request, Response } from 'express'
import { AppError, isAppError, translateDatabaseError } from '../errors.js'
import { logger } from '../logger.js'

/** Express/body-parser attach an HTTP status to malformed-request errors. */
function normalizeError(error: unknown): AppError {
  if (isAppError(error)) return error

  const status = (error as { status?: unknown } | null)?.status
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new AppError(
      status,
      status === 413 ? 'unprocessable' : 'validation_error',
      status === 413 ? 'Request body is too large' : 'Malformed or unsupported request body',
    )
  }

  return translateDatabaseError(error)
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: `No route matches ${req.method} ${req.originalUrl}`,
      requestId: req.requestId,
    },
  })
}

interface ErrorBody {
  code: string
  message: string
  details?: unknown
  requestId?: string
}

/**
 * Central error handler. Express 5 forwards rejected promises here
 * automatically, so route handlers may simply `throw`.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: (err?: unknown) => void,
) {
  const appError = normalizeError(error)
  const status = appError.status

  if (status >= 500) {
    logger.error(
      { err: error, requestId: req.requestId, path: req.originalUrl, method: req.method },
      'Unhandled request failure',
    )
  } else {
    logger.warn(
      {
        code: appError.code,
        requestId: req.requestId,
        path: req.originalUrl,
        method: req.method,
        details: appError.details,
      },
      appError.message,
    )
  }

  const body: ErrorBody = {
    code: appError.code,
    message: appError.expose ? appError.message : 'An unexpected error occurred',
    requestId: req.requestId,
  }

  if (appError.expose && appError.details !== undefined) {
    body.details = appError.details
  }

  if (res.headersSent) return
  res.status(status).json({ error: body })
}
