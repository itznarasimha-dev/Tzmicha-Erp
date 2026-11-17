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

/**
 * Frontend endpoints declared and invoked across Marketing, Sales, Service, HR, Finance, and Ops.
 * This test guarantees that every single route called by the UI is mounted in the Express backend
 * and does not return 404.
 */
const FRONTEND_ENDPOINTS: Array<{ method: 'get' | 'post' | 'patch' | 'delete'; path: string }> = [
  // Me & Core
  { method: 'get', path: '/api/me' },
  { method: 'get', path: '/api/health' },

  // HR Module
  { method: 'get', path: '/api/hr/employees' },
  { method: 'get', path: '/api/hr/departments' },
  { method: 'get', path: '/api/hr/designations' },
  { method: 'get', path: '/api/hr/attendance' },
  { method: 'get', path: '/api/hr/leaves' },
  { method: 'get', path: '/api/hr/payroll' },

  // Marketing Module
  { method: 'get', path: '/api/marketing/dashboard' },
  { method: 'get', path: '/api/marketing/leads' },
  { method: 'get', path: '/api/marketing/campaigns' },
  { method: 'get', path: '/api/marketing/plans' },
  { method: 'get', path: '/api/marketing/expenses' },
  { method: 'get', path: '/api/marketing/targets' },
  { method: 'get', path: '/api/marketing/rewards' },
  { method: 'get', path: '/api/marketing/field-visits' },
  { method: 'get', path: '/api/marketing/surveys' },
  { method: 'get', path: '/api/marketing/dealers' },
  { method: 'get', path: '/api/marketing/activity-records' },

  // Sales Module
  { method: 'get', path: '/api/sales/customers' },
  { method: 'get', path: '/api/sales/products' },
  { method: 'get', path: '/api/sales/inventory/summary' },
  { method: 'get', path: '/api/sales/leads' },
  { method: 'get', path: '/api/sales/opportunities' },
  { method: 'get', path: '/api/sales/followups' },
  { method: 'get', path: '/api/sales/quotations' },
  { method: 'get', path: '/api/sales/orders' },
  { method: 'get', path: '/api/sales/dispatches' },

  // Service Module
  { method: 'get', path: '/api/service/overview' },
  { method: 'get', path: '/api/service/requests' },
  { method: 'get', path: '/api/service/assignments' },
  { method: 'get', path: '/api/service/executions' },
  { method: 'get', path: '/api/service/spare-parts' },
  { method: 'get', path: '/api/service/requisitions' },
  { method: 'get', path: '/api/service/warranties' },
  { method: 'get', path: '/api/service/amc-contracts' },
  { method: 'get', path: '/api/service/billing-approvals' },

  // Approvals Engine
  { method: 'get', path: '/api/approvals/pending' },
  { method: 'get', path: '/api/approvals/history' },

  // Finance Module
  { method: 'get', path: '/api/finance/invoices' },
  { method: 'get', path: '/api/finance/payments' },
  { method: 'get', path: '/api/finance/ledgers' },
  { method: 'get', path: '/api/finance/imports/history' },

  // Notifications
  { method: 'get', path: '/api/notifications' },
]

describe('API Route Coverage Verification', () => {
  it.each(FRONTEND_ENDPOINTS)('mounted backend route exists for $method $path', { timeout: 15000 }, async ({ method, path }) => {
    const res = await request(app)[method](path)
    // The route MUST exist and be mounted.
    // If it requires authentication, it returns 401 Unauthorized (which confirms the route handler / auth middleware matched).
    // If public or mock, it returns 200 or 201.
    // It must NEVER return 404 (Not Found / no route matches).
    expect(res.status).not.toBe(404)
    if (res.body?.error) {
      expect(res.body.error.code).not.toBe('not_found')
    }
  })
})
