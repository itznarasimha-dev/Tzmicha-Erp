import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Express } from 'express'
import { closePool } from './db/pool.js'
import { resetConfigCache } from './config.js'

let app: Express

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'silent'
  process.env.DB_ENFORCE_RLS = 'false'
  process.env.SUPABASE_JWT_SECRET = 'test-secret-value-that-is-long-enough-1234567890'
  delete process.env.SUPABASE_URL
  resetConfigCache()

  const { createApp } = await import('./app.js')
  app = createApp()
})

afterAll(async () => {
  await closePool()
})

describe('HR route integration (wiring, auth, validation)', () => {
  const protectedGets = [
    '/api/hr/employees',
    '/api/hr/employees/00000000-0000-0000-0000-000000000001',
    '/api/hr/departments',
    '/api/hr/designations',
    '/api/hr/leave-types',
    '/api/hr/holidays',
    '/api/hr/settings',
    '/api/hr/activities',
    '/api/hr/attendance',
    '/api/hr/attendance/summary',
    '/api/hr/attendance/corrections',
    '/api/hr/leaves',
    '/api/hr/leave-balances',
    '/api/hr/salary-structures',
    '/api/hr/payroll/runs',
    '/api/hr/payroll/payslips',
    '/api/hr/contracts',
    '/api/hr/payments',
    '/api/hr/payments/00000000-0000-0000-0000-000000000001/history',
    '/api/hr/expenses',
    '/api/hr/jobs',
    '/api/hr/candidates',
    '/api/hr/onboarding',
    '/api/hr/reviews',
    '/api/hr/requests',
    '/api/hr/offboarding',
    '/api/hr/dashboard',
    '/api/hr/analytics',
    '/api/hr/analytics/attendance',
    '/api/hr/analytics/payroll',
  ]

  it.each(protectedGets)('rejects GET %s without auth', async (path) => {
    const response = await request(app).get(path)
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('unauthorized')
  })

  it.each([
    ['/api/hr/employees', {}],
    ['/api/hr/departments', {}],
    ['/api/hr/designations', {}],
    ['/api/hr/holidays', {}],
    ['/api/hr/attendance', {}],
    ['/api/hr/attendance/corrections', {}],
    ['/api/hr/leaves', {}],
    ['/api/hr/leave-balances', {}],
    ['/api/hr/salary-structures', {}],
    ['/api/hr/payroll/runs', {}],
    ['/api/hr/contracts', {}],
    ['/api/hr/payments', {}],
    ['/api/hr/expenses', {}],
    ['/api/hr/jobs', {}],
    ['/api/hr/candidates', {}],
    ['/api/hr/onboarding', {}],
    ['/api/hr/reviews', {}],
    ['/api/hr/requests', {}],
    ['/api/hr/offboarding', {}],
  ])('rejects invalid POST %s body without hitting DB logic', async (path, body) => {
    const response = await request(app)
      .post(path)
      .set('Authorization', 'Bearer invalid-token-for-validation-path')
      .send(body)

    // Auth runs before validation in most HR routes; invalid token should fail as unauthorized.
    // If a route validates first in future, 422 is also acceptable as a contract signal.
    expect([401, 422]).toContain(response.status)
    expect(['unauthorized', 'validation_error', 'unprocessable_entity']).toContain(response.body.error?.code)
  })

  it('enforces auth before resolving unknown protected HR subroutes', async () => {
    const response = await request(app).get('/api/hr/not-a-real-endpoint')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('unauthorized')
  })
})
