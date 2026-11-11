import { describe, expect, it } from 'vitest'
import { AppError, isAppError, translateDatabaseError } from './errors.js'

describe('AppError', () => {
  it('exposes 4xx errors and hides 5xx details', () => {
    const badRequest = AppError.badRequest('Nope', { field: 'name' })
    expect(badRequest.status).toBe(400)
    expect(badRequest.code).toBe('validation_error')
    expect(badRequest.details).toEqual({ field: 'name' })
    expect(badRequest.expose).toBe(true)

    const internal = new AppError(500, 'internal_error', 'secret detail')
    expect(internal.expose).toBe(false)
  })

  it('maps helper constructors to stable statuses', () => {
    const cases: Array<[AppError, number, string]> = [
      [AppError.unauthorized(), 401, 'unauthorized'],
      [AppError.forbidden(), 403, 'forbidden'],
      [AppError.notFound(), 404, 'not_found'],
      [AppError.conflict('duplicate'), 409, 'conflict'],
      [AppError.unprocessable('invalid'), 422, 'unprocessable'],
      [AppError.idempotency('replayed'), 409, 'idempotency_conflict'],
    ]

    for (const [error, status, code] of cases) {
      expect(error.status).toBe(status)
      expect(error.code).toBe(code)
      expect(error.name).toBe('AppError')
    }
  })

  it('is detectable with isAppError', () => {
    expect(isAppError(AppError.notFound())).toBe(true)
    expect(isAppError(new Error('plain'))).toBe(false)
    expect(isAppError(null)).toBe(false)
  })
})

describe('translateDatabaseError', () => {
  it.each([
    ['23505', 409, 'conflict'],
    ['23503', 409, 'conflict'],
    ['23514', 422, 'unprocessable'],
    ['22023', 400, 'validation_error'],
    ['42501', 403, 'forbidden'],
    ['P0002', 404, 'not_found'],
    ['55000', 409, 'conflict'],
    ['22P02', 400, 'validation_error'],
  ])('maps %s to HTTP %i (%s)', (pgCode, status, code) => {
    const translated = translateDatabaseError({ code: pgCode, message: 'db detail' })
    expect(translated.status).toBe(status)
    expect(translated.code).toBe(code)
  })

  it('does not leak raw database messages for unique violations', () => {
    const translated = translateDatabaseError({
      code: '23505',
      constraint: 'mkt_leads_org_id_phone_key',
      detail: 'Key (phone)=(999) already exists.',
    })
    expect(translated.message).not.toContain('999')
    expect(translated.details).toEqual({ constraint: 'mkt_leads_org_id_phone_key' })
  })

  it('falls back to a generic internal error', () => {
    const translated = translateDatabaseError(new Error('socket hang up'))
    expect(translated.status).toBe(500)
    expect(translated.code).toBe('internal_error')
    expect(translated.message).toBe('An unexpected error occurred')
    expect(translated.expose).toBe(false)
  })

  it('handles null and undefined input', () => {
    expect(translateDatabaseError(null).status).toBe(500)
    expect(translateDatabaseError(undefined).status).toBe(500)
  })
})
