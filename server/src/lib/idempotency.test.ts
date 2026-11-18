import { describe, expect, it } from 'vitest'
import { AppError } from '../errors.js'
import { isUniqueViolation, readIdempotencyKey } from './idempotency.js'

describe('readIdempotencyKey', () => {
  it('returns null when the header is absent', () => {
    expect(readIdempotencyKey(undefined)).toBeNull()
    expect(readIdempotencyKey(null)).toBeNull()
  })

  it('accepts a normal key and trims whitespace', () => {
    expect(readIdempotencyKey('  order-123-abc  ')).toBe('order-123-abc')
  })

  it('uses the first value when Express supplies an array', () => {
    expect(readIdempotencyKey(['first-key', 'second-key'])).toBe('first-key')
  })

  it('treats blank and non-string values as absent', () => {
    expect(readIdempotencyKey('   ')).toBeNull()
    expect(readIdempotencyKey(123)).toBeNull()
    expect(readIdempotencyKey([])).toBeNull()
  })

  it('accepts the 8 and 200 character boundaries', () => {
    expect(readIdempotencyKey('a'.repeat(8))).toHaveLength(8)
    expect(readIdempotencyKey('a'.repeat(200))).toHaveLength(200)
  })

  it('rejects keys outside the allowed length', () => {
    for (const key of ['short', 'a'.repeat(201)]) {
      try {
        readIdempotencyKey(key)
        expect.unreachable('expected rejection')
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).status).toBe(400)
        expect((error as AppError).code).toBe('validation_error')
      }
    }
  })
})

describe('isUniqueViolation', () => {
  it('detects Postgres unique violations only', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
    expect(isUniqueViolation({ code: '23503' })).toBe(false)
    expect(isUniqueViolation(new Error('boom'))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation(undefined)).toBe(false)
  })
})
