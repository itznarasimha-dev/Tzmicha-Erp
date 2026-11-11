import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodTypeAny } from 'zod'
import { AppError } from './errors.js'

export interface Pagination {
  page: number
  pageSize: number
  offset: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

export function parsePagination(query: Record<string, unknown>): Pagination {
  const rawPage = Number(query.page ?? 1)
  const rawSize = Number(query.pageSize ?? DEFAULT_PAGE_SIZE)

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0
      ? Math.min(Math.floor(rawSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  return { page, pageSize, offset: (page - 1) * pageSize }
}

/**
 * Whitelisted sorting. Never interpolate a client-supplied string into SQL.
 */
export function parseSort(
  raw: unknown,
  allowed: Readonly<Record<string, string>>,
  fallback: string,
): { column: string; direction: 'asc' | 'desc'; clause: string } {
  const value = typeof raw === 'string' ? raw : ''
  const [rawField, rawDirection] = value.split(':')
  const fallbackColumn = allowed[fallback]

  if (!fallbackColumn) {
    throw new Error(`parseSort: fallback "${fallback}" is not an allowed sort key`)
  }

  const column = allowed[rawField] ?? fallbackColumn
  const direction = rawDirection === 'asc' ? 'asc' : 'desc'

  return { column, direction, clause: `${column} ${direction}` }
}

export function paginated<T>(rows: T[], total: number, pagination: Pagination): PaginatedResult<T> {
  return {
    data: rows,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pagination.pageSize),
    },
  }
}

export function sendData<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ data })
}

/** Typed access to the value produced by `validateQuery`. */
export function validatedQuery<T>(req: Request): T {
  return (req.validatedQuery ?? {}) as T
}

/** Typed access to a body already parsed by `validateBody`. */
export function validatedBody<T>(req: Request): T {
  return req.body as T
}

/** Parse a zod schema and convert failures into a 422 AppError. */
export function parseWith<T extends ZodTypeAny>(schema: T, input: unknown): T['_output'] {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw AppError.unprocessable('Request validation failed', formatZodError(result.error))
  }
  return result.data
}

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }))
}

/**
 * Validate a request part in-place so downstream handlers see parsed and
 * coerced values (numbers, dates, defaults).
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = parseWith(schema, req.body)
    next()
  }
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // `req.query` is a getter-only property in Express 5, so store the parsed
    // value on a dedicated field instead of mutating it.
    req.validatedQuery = parseWith(schema, req.query)
    next()
  }
}

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toIsoString(value: unknown): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toDateOnly(value: unknown): string | null {
  const iso = toIsoString(value)
  return iso ? iso.slice(0, 10) : null
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}
