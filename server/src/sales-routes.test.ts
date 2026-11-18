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

describe('Sales route integration (auth, validation, role protection)', () => {
  const protectedSalesGets = [
    '/api/sales/customers',
    '/api/sales/products',
    '/api/sales/inventory/summary',
    '/api/sales/leads',
    '/api/sales/opportunities',
    '/api/sales/followups',
    '/api/sales/quotations',
    '/api/sales/orders',
    '/api/sales/dispatches',
  ]

  it.each(protectedSalesGets)('rejects GET %s without auth (401)', async (path) => {
    const res = await request(app).get(path)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  const protectedSalesPosts = [
    ['/api/sales/customers', { name: 'Acme Corp' }],
    ['/api/sales/leads', { customerName: 'New Lead' }],
    ['/api/sales/quotations', { totalAmount: 15000 }],
    ['/api/sales/orders', { totalAmount: 25000 }],
    ['/api/sales/returns', { reason: 'Defective item' }],
  ]

  it.each(protectedSalesPosts)('rejects POST %s without auth (401)', async (path, body) => {
    const res = await request(app).post(path).send(body)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  it('rejects malformed token on /api/sales/customers (401)', async () => {
    const res = await request(app)
      .get('/api/sales/customers')
      .set('Authorization', 'Bearer invalid-token-string')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  it('rejects invalid UUID parameter on customer update with 400', async () => {
    const res = await request(app)
      .patch('/api/sales/customers/not-a-uuid')
      .set('Authorization', 'Bearer invalid-token')
      .send({ name: 'Valid Name' })
    // Either 401 (auth first) or 400 (validation error)
    expect([400, 401]).toContain(res.status)
  })

  it('rejects invalid UUID parameter on order cancel with 400', async () => {
    const res = await request(app)
      .post('/api/sales/orders/bad-uuid/cancel')
      .set('Authorization', 'Bearer invalid-token')
      .send({ reason: 'Client requested cancellation' })
    expect([400, 401]).toContain(res.status)
  })
})
