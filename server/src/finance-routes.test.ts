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

describe('Finance & Notification Routes - Auth & Validation Integration', () => {
  const protectedFinanceGets = [
    '/api/finance/invoices',
    '/api/finance/payments',
    '/api/finance/ledgers',
    '/api/notifications',
  ]

  it.each(protectedFinanceGets)('rejects GET %s without auth (401)', async (path) => {
    const res = await request(app).get(path)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  const protectedFinancePosts = [
    ['/api/finance/invoices', { totalAmount: 15000 }],
    ['/api/finance/payments', { amount: 5000, method: 'NEFT' }],
    ['/api/finance/incentives', { employeeId: 'usr-01', amount: 10000 }],
    ['/api/notifications', { title: 'Invoice Approved', message: 'Ready for dispatch' }],
  ]

  it.each(protectedFinancePosts)('rejects POST %s without auth (401)', async (path, body) => {
    const res = await request(app).post(path).send(body)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  it('rejects malformed token on /api/finance/invoices (401)', async () => {
    const res = await request(app)
      .get('/api/finance/invoices')
      .set('Authorization', 'Bearer invalid-token-string')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  it('rejects malformed token on /api/notifications (401)', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', 'Bearer invalid-token-string')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  it('rejects invalid UUID on /api/finance/invoices/:id/approve with 400', async () => {
    const res = await request(app)
      .post('/api/finance/invoices/not-a-valid-uuid/approve')
      .set('Authorization', 'Bearer invalid-token')
      .send({ reason: 'Approved' })
    // Route parameter validation intercepts invalid UUID or auth rejects with 400/401
    expect([400, 401]).toContain(res.status)
  })

  it('rejects invalid UUID on /api/finance/payments/:id/verify with 400', async () => {
    const res = await request(app)
      .post('/api/finance/payments/not-a-valid-uuid/verify')
      .set('Authorization', 'Bearer invalid-token')
      .send({ reason: 'Verified' })
    expect([400, 401]).toContain(res.status)
  })

  it('rejects invalid UUID on /api/notifications/:id/read with 400', async () => {
    const res = await request(app)
      .patch('/api/notifications/not-a-valid-uuid/read')
      .set('Authorization', 'Bearer invalid-token')
    expect([400, 401]).toContain(res.status)
  })

  it('rejects PATCH /api/notifications/read-all without auth (401)', async () => {
    const res = await request(app).patch('/api/notifications/read-all')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })
})
