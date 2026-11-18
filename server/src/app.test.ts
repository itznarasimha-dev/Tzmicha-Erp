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

describe('app wiring', () => {
  it('returns a structured 404 for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body.error).toMatchObject({
      code: 'not_found',
      message: expect.stringContaining('No route matches GET /api/does-not-exist'),
    })
    expect(response.body.error.requestId).toBeTruthy()
  })

  it('issues a request id when the caller does not supply one', async () => {
    const response = await request(app).get('/api/nope')

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })

  it('echoes a valid caller-supplied request id', async () => {
    const response = await request(app).get('/api/nope').set('X-Request-Id', 'trace-12345678')

    expect(response.headers['x-request-id']).toBe('trace-12345678')
    expect(response.body.error.requestId).toBe('trace-12345678')
  })

  it('replaces an invalid caller-supplied request id', async () => {
    const response = await request(app).get('/api/nope').set('X-Request-Id', 'bad id!')

    expect(response.headers['x-request-id']).not.toBe('bad id!')
    expect(response.headers['x-request-id']).toBeTruthy()
  })

  it('allows the configured CORS origin only', async () => {
    const allowed = await request(app).get('/api/nope').set('Origin', 'http://localhost:5173')
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173')

    const denied = await request(app).get('/api/nope').set('Origin', 'https://evil.example')
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('returns 400 for malformed JSON instead of pretending it is a server fault', async () => {
    const response = await request(app)
      .post('/api/hr/employees')
      .set('Content-Type', 'application/json')
      .send('{ "firstName": ')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('validation_error')
  })
})

describe('authentication gate', () => {
  it.each(['/api/hr/employees', '/api/marketing/leads', '/api/approvals', '/api/me'])(
    'rejects %s without a bearer token',
    async (path) => {
      const response = await request(app).get(path)

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('unauthorized')
    },
  )

  it('rejects a malformed Authorization header', async () => {
    const response = await request(app).get('/api/hr/employees').set('Authorization', 'Basic abc123')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('unauthorized')
  })

  it('rejects an invalid JWT', async () => {
    const response = await request(app)
      .get('/api/marketing/leads')
      .set('Authorization', 'Bearer not-a-real-token')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('unauthorized')
  })

  it('does not expose authorization details in the error body', async () => {
    const response = await request(app).get('/api/hr/employees')

    expect(JSON.stringify(response.body)).not.toContain('postgres')
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_URL')
  })
})
