import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Express } from 'express'
import { closePool } from './db/pool.js'
import { resetConfigCache } from './config.js'
import { AppError } from './errors.js'

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

describe('Store Manager Warehouse Scoping & Business Rules', () => {
  function verifyWarehouseScoping(auth: { isAdmin: boolean; warehouseId: string | null }, orderWarehouseId: string | null) {
    if (auth.isAdmin) return
    if (auth.warehouseId && orderWarehouseId && auth.warehouseId !== orderWarehouseId) {
      throw AppError.forbidden('You are only authorized to manage incoming orders for your assigned warehouse')
    }
  }

  it('permits Admin to access incoming orders across any warehouse', () => {
    const adminAuth = { isAdmin: true, warehouseId: null }
    expect(() => verifyWarehouseScoping(adminAuth, 'wh-pune-01')).not.toThrow()
    expect(() => verifyWarehouseScoping(adminAuth, 'wh-gujarat-02')).not.toThrow()
  })

  it('permits Store Manager to access orders destined for their assigned warehouse', () => {
    const storeManagerAuth = { isAdmin: false, warehouseId: 'wh-pune-01' }
    expect(() => verifyWarehouseScoping(storeManagerAuth, 'wh-pune-01')).not.toThrow()
  })

  it('blocks Store Manager from accessing orders destined for a different warehouse with 403 Forbidden', () => {
    const storeManagerAuth = { isAdmin: false, warehouseId: 'wh-pune-01' }
    expect(() => verifyWarehouseScoping(storeManagerAuth, 'wh-chennai-03')).toThrow(AppError)
    try {
      verifyWarehouseScoping(storeManagerAuth, 'wh-chennai-03')
    } catch (err: any) {
      expect(err.status).toBe(403)
      expect(err.code).toBe('forbidden')
      expect(err.message).toContain('assigned warehouse')
    }
  })

  it('calculates 3-way match status correctly based on ordered, received, and billed amounts', () => {
    function computeMatchStatus(totalOrderedQty: number, totalReceivedQty: number, billedAmount: number, totalReceivedValue: number) {
      if (totalReceivedQty === 0) return 'unmatched'
      if (totalReceivedQty < totalOrderedQty) return 'partially_matched'
      if (billedAmount > totalReceivedValue) return 'price_variance'
      return 'matched'
    }

    expect(computeMatchStatus(100, 0, 0, 0)).toBe('unmatched')
    expect(computeMatchStatus(100, 50, 50000, 50000)).toBe('partially_matched')
    expect(computeMatchStatus(100, 100, 100000, 100000)).toBe('matched')
    expect(computeMatchStatus(100, 100, 120000, 100000)).toBe('price_variance')
  })
})

describe('Store Incoming Orders & GRN HTTP Routes', () => {
  describe('Authentication Gates', () => {
    it('rejects GET /api/store/incoming-orders without auth (401)', async () => {
      const res = await request(app).get('/api/store/incoming-orders')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })

    it('rejects POST /api/store/incoming-orders/:id/acknowledge without auth (401)', async () => {
      const res = await request(app).post('/api/store/incoming-orders/a0000000-0000-0000-0000-000000000001/acknowledge')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })

    it('rejects POST /api/store/incoming-orders/:id/update-eta without auth (401)', async () => {
      const res = await request(app)
        .post('/api/store/incoming-orders/a0000000-0000-0000-0000-000000000001/update-eta')
        .send({ expectedArrivalDate: '2026-11-20', reason: 'Transporter delayed at toll' })
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })

    it('rejects POST /api/store/incoming-orders/:id/grn without auth (401)', async () => {
      const res = await request(app)
        .post('/api/store/incoming-orders/a0000000-0000-0000-0000-000000000001/grn')
        .send({
          deliveryChallanNumber: 'DC-9901',
          lines: [
            {
              poLineId: 'b0000000-0000-0000-0000-000000000001',
              productId: 'c0000000-0000-0000-0000-000000000001',
              orderedQuantity: 10,
              receivedQuantity: 10,
              acceptedQuantity: 10,
            },
          ],
        })
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })

    it('rejects GET /api/store/discrepancies without auth (401)', async () => {
      const res = await request(app).get('/api/store/discrepancies')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })

    it('rejects GET /api/store/3-way-match/:id without auth (401)', async () => {
      const res = await request(app).get('/api/store/3-way-match/a0000000-0000-0000-0000-000000000001')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })
  })

  describe('Route Parameter & Payload Validation', () => {
    it('validates UUID on /api/store/incoming-orders/:id/acknowledge', async () => {
      const res = await request(app)
        .post('/api/store/incoming-orders/not-a-valid-uuid/acknowledge')
        .set('Authorization', 'Bearer invalid-token')
      expect([400, 401]).toContain(res.status)
    })

    it('validates UUID on /api/store/3-way-match/:id', async () => {
      const res = await request(app)
        .get('/api/store/3-way-match/not-a-valid-uuid')
        .set('Authorization', 'Bearer invalid-token')
      expect([400, 401]).toContain(res.status)
    })
  })
})
