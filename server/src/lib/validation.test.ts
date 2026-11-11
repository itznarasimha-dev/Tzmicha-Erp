import { describe, expect, it } from 'vitest'
import {
  dateOnlySchema,
  dateTimeSchema,
  decisionSchema,
  idParamSchema,
  moneySchema,
  optionalDate,
  optionalText,
  optionalUuid,
  paginationQuerySchema,
  percentageSchema,
  periodSchema,
  positiveMoneySchema,
  uuidSchema,
} from './validation.js'

const UUID = '9f1c1c1e-3a4b-4c5d-8e6f-7a8b9c0d1e2f'

function ok<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }, value: unknown) {
  const result = schema.safeParse(value)
  expect(result.success).toBe(true)
  return result.data as T
}

function fail(schema: { safeParse: (value: unknown) => { success: boolean } }, value: unknown) {
  expect(schema.safeParse(value).success).toBe(false)
}

describe('uuidSchema', () => {
  it('accepts a v4 UUID', () => {
    expect(ok(uuidSchema, UUID)).toBe(UUID)
  })

  it('rejects malformed and non-UUID values', () => {
    fail(uuidSchema, 'not-a-uuid')
    fail(uuidSchema, '')
    fail(uuidSchema, 42)
    fail(uuidSchema, null)
  })
})

describe('dateOnlySchema', () => {
  it('accepts real calendar dates including leap days', () => {
    expect(ok(dateOnlySchema, '2026-11-11')).toBe('2026-11-11')
    expect(ok(dateOnlySchema, '2024-02-29')).toBe('2024-02-29')
  })

  it('rejects rolled-over and malformed dates', () => {
    fail(dateOnlySchema, '2026-02-30')
    fail(dateOnlySchema, '2025-02-29')
    fail(dateOnlySchema, '2026-13-01')
    fail(dateOnlySchema, '11-11-2026')
    fail(dateOnlySchema, '2026-1-1')
  })
})

describe('periodSchema', () => {
  it('accepts YYYY-MM', () => {
    expect(ok(periodSchema, '2026-01')).toBe('2026-01')
    expect(ok(periodSchema, '2026-12')).toBe('2026-12')
  })

  it('rejects invalid months and formats', () => {
    fail(periodSchema, '2026-00')
    fail(periodSchema, '2026-13')
    fail(periodSchema, '2026-1')
    fail(periodSchema, '2026-01-01')
  })
})

describe('dateTimeSchema', () => {
  it('accepts ISO strings with and without timezone', () => {
    expect(ok(dateTimeSchema, '2026-11-11T09:30:00Z')).toBe('2026-11-11T09:30:00Z')
    expect(ok(dateTimeSchema, '2026-11-11T09:30')).toBe('2026-11-11T09:30')
  })

  it('trims surrounding whitespace', () => {
    expect(ok(dateTimeSchema, '  2026-11-11T09:30:00Z  ')).toBe('2026-11-11T09:30:00Z')
  })

  it('rejects empty and unparseable values', () => {
    fail(dateTimeSchema, '')
    fail(dateTimeSchema, 'not-a-date')
    fail(dateTimeSchema, null)
  })
})

describe('idParamSchema', () => {
  it('requires a valid id', () => {
    expect(ok(idParamSchema, { id: UUID })).toEqual({ id: UUID })
    fail(idParamSchema, { id: 'abc' })
    fail(idParamSchema, {})
  })
})

describe('paginationQuerySchema', () => {
  it('coerces numeric strings and applies no defaults here', () => {
    expect(ok(paginationQuerySchema, { page: '3', pageSize: '50', sort: 'name:asc' })).toEqual({
      page: 3,
      pageSize: 50,
      sort: 'name:asc',
    })
  })

  it('rejects out-of-range and non-integer paging', () => {
    fail(paginationQuerySchema, { page: '0' })
    fail(paginationQuerySchema, { pageSize: '101' })
    fail(paginationQuerySchema, { pageSize: '2.5' })
  })
})

describe('optional helpers', () => {
  it('optionalText trims, enforces the limit and maps blank input to undefined', () => {
    expect(ok(optionalText(10), '  hello  ')).toBe('hello')
    expect(ok(optionalText(10), '')).toBeUndefined()
    expect(ok(optionalText(10), undefined)).toBeUndefined()
    fail(optionalText(3), 'toolong')
  })

  it('optionalDate maps blank/null to undefined', () => {
    expect(ok(optionalDate, '2026-05-01')).toBe('2026-05-01')
    expect(ok(optionalDate, '')).toBeUndefined()
    expect(ok(optionalDate, null)).toBeUndefined()
    fail(optionalDate, '2026-02-30')
  })

  it('optionalUuid maps blank/null to undefined', () => {
    expect(ok(optionalUuid, UUID)).toBe(UUID)
    expect(ok(optionalUuid, '')).toBeUndefined()
    expect(ok(optionalUuid, null)).toBeUndefined()
    fail(optionalUuid, 'nope')
  })
})

describe('money and percentage schemas', () => {
  it('coerces numeric strings and enforces bounds', () => {
    expect(ok(moneySchema, '1250.50')).toBe(1250.5)
    expect(ok(positiveMoneySchema, '1')).toBe(1)
    expect(ok(percentageSchema, '100')).toBe(100)
  })

  it('rejects negatives, infinity and out-of-range percentages', () => {
    fail(moneySchema, '-1')
    fail(moneySchema, 'Infinity')
    fail(positiveMoneySchema, '0')
    fail(percentageSchema, '100.1')
    fail(percentageSchema, '-1')
  })
})

describe('decisionSchema', () => {
  it('accepts only canonical workflow decisions', () => {
    for (const decision of ['Approved', 'Rejected', 'Changes Requested', 'Cancelled']) {
      expect(ok(decisionSchema, decision)).toBe(decision)
    }
    fail(decisionSchema, 'approved')
    fail(decisionSchema, 'Pending')
  })
})
