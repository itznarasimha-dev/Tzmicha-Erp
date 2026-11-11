import { describe, expect, it } from 'vitest'
import { ZodError, z } from 'zod'
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  formatZodError,
  isUuid,
  paginated,
  parsePagination,
  parseSort,
  parseWith,
  toDateOnly,
  toIsoString,
  toNumber,
} from './http.js'
import { AppError } from './errors.js'

describe('parsePagination', () => {
  it('uses defaults when nothing is supplied', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE, offset: 0 })
  })

  it('coerces string input and computes the offset', () => {
    expect(parsePagination({ page: '3', pageSize: '10' })).toEqual({
      page: 3,
      pageSize: 10,
      offset: 20,
    })
  })

  it('floors fractional values', () => {
    expect(parsePagination({ page: '2.9', pageSize: '7.8' })).toEqual({
      page: 2,
      pageSize: 7,
      offset: 7,
    })
  })

  it('clamps the page size and falls back for invalid input', () => {
    expect(parsePagination({ pageSize: '1000' }).pageSize).toBe(MAX_PAGE_SIZE)
    expect(parsePagination({ pageSize: '0' }).pageSize).toBe(DEFAULT_PAGE_SIZE)
    expect(parsePagination({ pageSize: 'abc' }).pageSize).toBe(DEFAULT_PAGE_SIZE)
    expect(parsePagination({ page: '-4' }).page).toBe(1)
    expect(parsePagination({ page: 'nope' }).page).toBe(1)
  })
})

describe('parseSort', () => {
  const allowed = { name: 'e.name', created: 'e.created_at' } as const

  it('resolves whitelisted fields and directions', () => {
    expect(parseSort('name:asc', allowed, 'created')).toEqual({
      column: 'e.name',
      direction: 'asc',
      clause: 'e.name asc',
    })
    expect(parseSort('created:desc', allowed, 'created').clause).toBe('e.created_at desc')
  })

  it('defaults to descending when no direction is given', () => {
    expect(parseSort('name', allowed, 'created')).toEqual({
      column: 'e.name',
      direction: 'desc',
      clause: 'e.name desc',
    })
  })

  it('falls back for unknown fields and invalid directions (no SQL injection)', () => {
    expect(parseSort('e.name; drop table erp.users', allowed, 'created').column).toBe('e.created_at')
    expect(parseSort('name:sideways', allowed, 'created').direction).toBe('desc')
    expect(parseSort(undefined, allowed, 'created').column).toBe('e.created_at')
    expect(parseSort(42, allowed, 'created').column).toBe('e.created_at')
  })

  it('throws when the fallback key is not whitelisted', () => {
    expect(() => parseSort('name', allowed, 'missing')).toThrow(/not an allowed sort key/)
  })
})

describe('paginated', () => {
  const pagination = { page: 2, pageSize: 10, offset: 10 }

  it('reports zero pages for an empty result', () => {
    expect(paginated([], 0, pagination)).toEqual({
      data: [],
      pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
    })
  })

  it('rounds partial pages up', () => {
    expect(paginated([1], 21, pagination).pagination.totalPages).toBe(3)
    expect(paginated([1], 20, pagination).pagination.totalPages).toBe(2)
  })
})

describe('value conversion helpers', () => {
  it('toNumber parses numbers and falls back safely', () => {
    expect(toNumber(5)).toBe(5)
    expect(toNumber('4.5')).toBe(4.5)
    expect(toNumber('abc', 7)).toBe(7)
    expect(toNumber(null, 2)).toBe(2)
  })

  it('toIsoString normalises dates and rejects junk', () => {
    expect(toIsoString('2026-11-11T09:30:00.000Z')).toBe('2026-11-11T09:30:00.000Z')
    expect(toIsoString(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01T00:00:00.000Z')
    expect(toIsoString(null)).toBeNull()
    expect(toIsoString('')).toBeNull()
    expect(toIsoString('not-a-date')).toBeNull()
  })

  it('toDateOnly slices the UTC date', () => {
    expect(toDateOnly('2026-11-11T23:30:00.000Z')).toBe('2026-11-11')
    expect(toDateOnly(undefined)).toBeNull()
  })

  it('isUuid accepts canonical UUIDs only', () => {
    expect(isUuid('9f1c1c1e-3a4b-4c5d-8e6f-7a8b9c0d1e2f')).toBe(true)
    expect(isUuid('9F1C1C1E-3A4B-4C5D-8E6F-7A8B9C0D1E2F')).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid(123)).toBe(false)
  })
})

describe('parseWith', () => {
  const schema = z.object({ name: z.string().min(2), age: z.coerce.number().int() })

  it('returns parsed and coerced data', () => {
    expect(parseWith(schema, { name: 'Asha', age: '31' })).toEqual({ name: 'Asha', age: 31 })
  })

  it('throws a 422 AppError with formatted issues', () => {
    try {
      parseWith(schema, { name: 'A', age: 'nope' })
      expect.unreachable('expected validation failure')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      const appError = error as AppError
      expect(appError.status).toBe(422)
      expect(appError.code).toBe('unprocessable')
      expect(Array.isArray(appError.details)).toBe(true)
      expect((appError.details as Array<{ path: string }>).map((issue) => issue.path)).toEqual([
        'name',
        'age',
      ])
    }
  })
})

describe('formatZodError', () => {
  it('maps issues to stable path/message/code objects', () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: 'x' })
    expect(result.success).toBe(false)
    const formatted = formatZodError((result as { error: ZodError }).error)
    expect(formatted).toHaveLength(1)
    expect(formatted[0]).toMatchObject({ path: 'email', code: 'invalid_string' })
    expect(typeof formatted[0].message).toBe('string')
  })

  it('labels root-level issues', () => {
    const result = z.string().safeParse(1)
    const formatted = formatZodError((result as { error: ZodError }).error)
    expect(formatted[0].path).toBe('(root)')
  })
})
