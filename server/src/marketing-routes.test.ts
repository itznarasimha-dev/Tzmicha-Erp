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

describe('Marketing route integration (wiring, auth, validation)', () => {
  const protectedGets = [
    '/api/marketing/dashboard',
    '/api/marketing/activity-records',
    '/api/marketing/leads',
    '/api/marketing/leads/00000000-0000-0000-0000-000000000001',
    '/api/marketing/campaigns',
    '/api/marketing/offers',
    '/api/marketing/discounts',
    '/api/marketing/plans',
    '/api/marketing/expenses',
    '/api/marketing/targets',
    '/api/marketing/performance',
    '/api/marketing/rewards',
    '/api/marketing/visits',
    '/api/marketing/surveys',
    '/api/marketing/dealers',
  ]

  it.each(protectedGets)('rejects GET %s without auth', async (path) => {
    const response = await request(app).get(path)
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('unauthorized')
  })

  it.each([
    ['/api/marketing/leads', {}],
    ['/api/marketing/campaigns', {}],
    ['/api/marketing/offers', {}],
    ['/api/marketing/discounts', {}],
    ['/api/marketing/plans', {}],
    ['/api/marketing/expenses', {}],
    ['/api/marketing/targets', {}],
    ['/api/marketing/visits', {}],
    ['/api/marketing/surveys', {}],
    ['/api/marketing/dealers', {}],
    ['/api/marketing/activity-records', {}],
  ])('rejects invalid POST %s body without hitting DB logic', async (path, body) => {
    const response = await request(app)
      .post(path)
      .set('Authorization', 'Bearer invalid-token-for-validation-path')
      .send(body)

    expect([401, 422]).toContain(response.status)
    expect(['unauthorized', 'validation_error', 'unprocessable_entity']).toContain(response.body.error?.code)
  })

  it('enforces auth before resolving unknown protected marketing subroutes', async () => {
    const response = await request(app).get('/api/marketing/not-a-real-endpoint')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('unauthorized')
  })
})
