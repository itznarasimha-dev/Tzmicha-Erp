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

describe('Service route integration (auth, validation, role protection)', () => {
  const protectedServiceGets = [
    '/api/service/overview',
    '/api/service/requests',
    '/api/service/assignments',
    '/api/service/executions',
    '/api/service/spare-parts',
    '/api/service/requisitions',
    '/api/service/warranties',
    '/api/service/amc-contracts',
    '/api/service/billing-approvals',
  ]

  it.each(protectedServiceGets)('rejects GET %s without auth (401)', async (path) => {
    const res = await request(app).get(path)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  const protectedServicePosts = [
    ['/api/service/requests', { category: 'Breakdown' }],
    ['/api/service/requests/00000000-0000-0000-0000-000000000001/triage', { action: 'accepted' }],
    ['/api/service/requests/00000000-0000-0000-0000-000000000001/escalate', { reason: 'Urgent failure' }],
    ['/api/service/assignments', { requestId: '00000000-0000-0000-0000-000000000001' }],
    ['/api/service/executions', { assignmentId: '00000000-0000-0000-0000-000000000001' }],
    ['/api/service/requisitions', { partSku: 'VALVE-01', quantity: 2 }],
    ['/api/service/warranties', { serialNumber: 'SN-10293' }],
    ['/api/service/amc-contracts', { customerId: '00000000-0000-0000-0000-000000000001' }],
    ['/api/service/billing-approvals/00000000-0000-0000-0000-000000000001/decide', { action: 'approve' }],
  ]

  it.each(protectedServicePosts)('rejects POST %s without auth (401)', async (path, body) => {
    const res = await request(app).post(path).send(body)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  it('rejects malformed token on /api/service/overview (401)', async () => {
    const res = await request(app)
      .get('/api/service/overview')
      .set('Authorization', 'Bearer invalid-token')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })
})
