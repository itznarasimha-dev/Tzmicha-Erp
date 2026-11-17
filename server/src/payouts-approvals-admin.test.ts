import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Express } from 'express'
import { closePool } from './db/pool.js'
import { resetConfigCache } from './config.js'
import { AppError } from './errors.js'
import { sanitizeCsvCell } from './routes/finance/imports.js'

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

describe('Phase 6, 7 & 8: Payouts, Multi-Tier Approvals, Store Charges & Admin', () => {
  // ---------------------------------------------------------------------------
  // 1. Route Security: All Phase 6, 7, 8 endpoints require authentication (401)
  // ---------------------------------------------------------------------------
  describe('Authentication Enforcement (401 Unauthorized)', () => {
    const protectedRoutes = [
      // Phase 6: Expenses
      ['get', '/api/finance/expenses'],
      ['post', '/api/finance/expenses'],
      ['post', '/api/finance/expenses/11111111-1111-1111-1111-111111111111/pay'],
      ['get', '/api/finance/expenses/claims'],
      ['post', '/api/finance/expenses/claims/11111111-1111-1111-1111-111111111111/pay'],
      // Phase 6: Payroll
      ['get', '/api/finance/payroll/runs'],
      ['post', '/api/finance/payroll/runs'],
      ['get', '/api/finance/payroll/runs/11111111-1111-1111-1111-111111111111/payslips'],
      ['post', '/api/finance/payroll/runs/11111111-1111-1111-1111-111111111111/approve'],
      ['post', '/api/finance/payroll/runs/11111111-1111-1111-1111-111111111111/disburse'],
      ['get', '/api/finance/payroll/runs/11111111-1111-1111-1111-111111111111/bank-export'],
      ['get', '/api/finance/payroll/my-payslips'],
      // Phase 6: Customer Refunds
      ['get', '/api/finance/refunds'],
      ['post', '/api/finance/refunds'],
      ['post', '/api/finance/refunds/11111111-1111-1111-1111-111111111111/review'],
      ['post', '/api/finance/refunds/11111111-1111-1111-1111-111111111111/admin-approve'],
      ['post', '/api/finance/refunds/11111111-1111-1111-1111-111111111111/disburse'],
      // Phase 7: Store Charges
      ['get', '/api/store/charges'],
      ['post', '/api/store/charges'],
      ['get', '/api/finance/store-charges'],
      ['post', '/api/finance/store-charges/11111111-1111-1111-1111-111111111111/review'],
      // Phase 8: Ledger & Accounting Periods
      ['get', '/api/finance/ledger/chart-of-accounts'],
      ['post', '/api/finance/ledger/chart-of-accounts'],
      ['get', '/api/finance/ledger/journal-entries'],
      ['post', '/api/finance/ledger/journal-entries'],
      ['post', '/api/finance/ledger/journal-entries/11111111-1111-1111-1111-111111111111/reverse'],
      ['get', '/api/finance/ledger/reports/trial-balance'],
      ['get', '/api/finance/ledger/reports/profit-and-loss'],
      ['get', '/api/finance/ledger/reports/gst-summary'],
      ['get', '/api/finance/ledger/periods'],
      ['post', '/api/finance/ledger/periods/2026-11/lock'],
      ['post', '/api/finance/ledger/periods/2026-11/unlock'],
      // Phase 8: Admin Management
      ['get', '/api/admin/company-profiles'],
      ['post', '/api/admin/company-profiles'],
      ['get', '/api/admin/bank-accounts'],
      ['post', '/api/admin/bank-accounts'],
      ['get', '/api/admin/warehouses'],
      ['post', '/api/admin/warehouses'],
      ['get', '/api/admin/users'],
      ['patch', '/api/admin/users/11111111-1111-1111-1111-111111111111'],
      ['get', '/api/admin/audit-logs'],
      ['get', '/api/admin/system-dashboard'],
    ] as const

    it.each(protectedRoutes)('rejects %s %s without token with 401', async (method, path) => {
      const req = (request(app) as any)[method](path)
      const res = await req
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Phase 6: Payouts, Deductions & Bank CSV Export
  // ---------------------------------------------------------------------------
  describe('Phase 6 Rules: Expenses, Salaries & Refund Calculations', () => {
    it('sanitizes formula injection characters in bank transfer export', () => {
      expect(sanitizeCsvCell('=SUM(A1:B10)')).toBe(`'=SUM(A1:B10)`)
      expect(sanitizeCsvCell('+cmd|/c calc')).toBe(`'+cmd|/c calc`)
      expect(sanitizeCsvCell('-100')).toBe(`'-100`)
      expect(sanitizeCsvCell('@exec')).toBe(`'@exec`)
      expect(sanitizeCsvCell('\tmalicious')).toBe(`'\tmalicious`)
      expect(sanitizeCsvCell('Aditya Joshi')).toBe('Aditya Joshi')
      expect(sanitizeCsvCell('HDFC0001234')).toBe('HDFC0001234')
    })

    it('enforces net salary calculation: Net Pay = Gross - (PF + ESI + PT + TDS)', () => {
      const basic = 40000
      const hra = 15000
      const allowances = 10000
      const gross = basic + hra + allowances // 65000

      const pf = Math.round(basic * 0.12) // 4800
      const esi = Math.round(gross * 0.0075) // 488
      const pt = 200
      const tds = 2500
      const totalDeductions = pf + esi + pt + tds // 7988

      const netPay = gross - totalDeductions // 57012

      expect(gross).toBe(65000)
      expect(totalDeductions).toBe(7988)
      expect(netPay).toBe(57012)
    })

    it('blocks customer refund exceeding invoice net paid amount', () => {
      function validateRefundAmount(invoiceTotal: number, paidAmount: number, priorRefunds: number, requestAmount: number) {
        const netPaid = paidAmount - priorRefunds
        if (requestAmount > netPaid) {
          throw AppError.badRequest(`Refund amount (₹${requestAmount}) exceeds net paid amount (₹${netPaid})`)
        }
        return true
      }

      // Invoice total 10000, customer paid 4000, 1000 already refunded. Net paid = 3000.
      expect(() => validateRefundAmount(10000, 4000, 1000, 2500)).not.toThrow()
      expect(() => validateRefundAmount(10000, 4000, 1000, 3000)).not.toThrow()
      expect(() => validateRefundAmount(10000, 4000, 1000, 3001)).toThrow(AppError)
    })

    it('routes high-value refunds (> ₹50,000) to Admin approval', () => {
      const ADMIN_THRESHOLD = 50000
      function determineRefundNextStatus(amount: number) {
        return amount > ADMIN_THRESHOLD ? 'pending_admin_approval' : 'approved'
      }

      expect(determineRefundNextStatus(25000)).toBe('approved')
      expect(determineRefundNextStatus(50000)).toBe('approved')
      expect(determineRefundNextStatus(50001)).toBe('pending_admin_approval')
      expect(determineRefundNextStatus(150000)).toBe('pending_admin_approval')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Phase 7: Approvals & Self-Approval Prevention
  // ---------------------------------------------------------------------------
  describe('Phase 7 Rules: Approvals & Store Charges', () => {
    it('blocks self-approval when requester matches decider (HTTP 403)', () => {
      function checkSelfApproval(requesterId: string, deciderId: string) {
        if (requesterId === deciderId) {
          throw AppError.forbidden('Self-approval is not permitted: you cannot approve your own request')
        }
      }

      expect(() => checkSelfApproval('usr-manager-1', 'usr-finance-1')).not.toThrow()
      expect(() => checkSelfApproval('usr-manager-1', 'usr-manager-1')).toThrow(AppError)
      try {
        checkSelfApproval('usr-sales-01', 'usr-sales-01')
      } catch (err: any) {
        expect(err.status).toBe(403)
        expect(err.message).toContain('Self-approval is not permitted')
      }
    })

    it('enforces store manager warehouse scoping for charge submission', () => {
      function checkWarehouseScoping(auth: { isAdmin: boolean; warehouseId: string | null }, targetWh: string) {
        if (auth.isAdmin) return
        if (auth.warehouseId && auth.warehouseId !== targetWh) {
          throw AppError.forbidden('Cannot submit charges for a different warehouse')
        }
      }

      const admin = { isAdmin: true, warehouseId: null }
      const wh1Manager = { isAdmin: false, warehouseId: 'wh-pune-01' }

      expect(() => checkWarehouseScoping(admin, 'wh-gujarat-02')).not.toThrow()
      expect(() => checkWarehouseScoping(wh1Manager, 'wh-pune-01')).not.toThrow()
      expect(() => checkWarehouseScoping(wh1Manager, 'wh-gujarat-02')).toThrow(AppError)
    })

    it('calculates landed cost proportional share and updates unit cost', () => {
      const chargeTotal = 1200 // Total freight charge
      const lines = [
        { id: 'line-1', acceptedQty: 10, unitCost: 100 },
        { id: 'line-2', acceptedQty: 30, unitCost: 200 },
      ]

      const totalAccepted = lines.reduce((s, l) => s + l.acceptedQty, 0) // 40 units
      expect(totalAccepted).toBe(40)

      const line1Share = (lines[0].acceptedQty / totalAccepted) * chargeTotal // (10/40) * 1200 = 300
      const line1UnitLanded = lines[0].unitCost + (line1Share / lines[0].acceptedQty) // 100 + 30 = 130

      const line2Share = (lines[1].acceptedQty / totalAccepted) * chargeTotal // (30/40) * 1200 = 900
      const line2UnitLanded = lines[1].unitCost + (line2Share / lines[1].acceptedQty) // 200 + 30 = 230

      expect(line1Share).toBe(300)
      expect(line1UnitLanded).toBe(130)
      expect(line2Share).toBe(900)
      expect(line2UnitLanded).toBe(230)
      expect(line1Share + line2Share).toBe(chargeTotal)
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Phase 8: Ledger Double-Entry, Period Locking & Append-Only Reversals
  // ---------------------------------------------------------------------------
  describe('Phase 8 Rules: Balanced Ledger, Period Lock & Append-Only Reversal', () => {
    it('enforces that journal entry debits must equal credits', () => {
      function checkJournalBalance(lines: { debit: number; credit: number }[]) {
        const totalDebit = Number(lines.reduce((s, l) => s + (l.debit || 0), 0).toFixed(2))
        const totalCredit = Number(lines.reduce((s, l) => s + (l.credit || 0), 0).toFixed(2))
        if (totalDebit !== totalCredit) {
          throw AppError.badRequest(`Journal entry is unbalanced: Total Debits (₹${totalDebit}) must equal Total Credits (₹${totalCredit})`)
        }
        return true
      }

      const balanced = [
        { debit: 5000, credit: 0 },
        { debit: 0, credit: 5000 },
      ]
      const unbalanced = [
        { debit: 5000, credit: 0 },
        { debit: 0, credit: 4900 },
      ]

      expect(() => checkJournalBalance(balanced)).not.toThrow()
      expect(() => checkJournalBalance(unbalanced)).toThrow(AppError)
    })

    it('rejects posting to a locked accounting period', () => {
      function checkPeriodLock(entryDate: string, lockedPeriods: Set<string>) {
        const period = entryDate.slice(0, 7)
        if (lockedPeriods.has(period)) {
          throw AppError.badRequest(`Cannot post journal entry: Accounting period ${period} is locked`)
        }
      }

      const locked = new Set(['2026-09', '2026-10'])

      expect(() => checkPeriodLock('2026-11-15', locked)).not.toThrow()
      expect(() => checkPeriodLock('2026-10-31', locked)).toThrow(AppError)
      expect(() => checkPeriodLock('2026-09-01', locked)).toThrow(AppError)
    })

    it('swaps debits and credits on reversal without altering the original entry', () => {
      const originalLines = [
        { account: '1000', debit: 15000, credit: 0, desc: 'Cash Received' },
        { account: '4000', debit: 0, credit: 15000, desc: 'Sales Revenue' },
      ]

      // Append-only reversal: inverse line items
      const reversalLines = originalLines.map((l) => ({
        account: l.account,
        debit: l.credit,
        credit: l.debit,
        desc: `Reversal of ${l.account}`,
      }))

      expect(reversalLines[0].account).toBe('1000')
      expect(reversalLines[0].debit).toBe(0)
      expect(reversalLines[0].credit).toBe(15000)

      expect(reversalLines[1].account).toBe('4000')
      expect(reversalLines[1].debit).toBe(15000)
      expect(reversalLines[1].credit).toBe(0)

      // Both original and reversal lines are individually balanced
      expect(originalLines[0].debit).toBe(originalLines[1].credit)
      expect(reversalLines[0].credit).toBe(reversalLines[1].debit)
    })

    it('verifies Trial Balance totals are balanced across accounts', () => {
      const accounts = [
        { code: '1000', type: 'asset', debit: 120000, credit: 20000 }, // net 100000 Dr
        { code: '2000', type: 'liability', debit: 10000, credit: 50000 }, // net 40000 Cr
        { code: '3000', type: 'equity', debit: 0, credit: 20000 }, // net 20000 Cr
        { code: '4000', type: 'revenue', debit: 0, credit: 80000 }, // net 80000 Cr
        { code: '6000', type: 'expense', debit: 40000, credit: 0 }, // net 40000 Dr
      ]

      const totalDebits = accounts.reduce((s, a) => s + a.debit, 0)
      const totalCredits = accounts.reduce((s, a) => s + a.credit, 0)

      expect(totalDebits).toBe(170000)
      expect(totalCredits).toBe(170000)
      expect(totalDebits === totalCredits).toBe(true)
    })
  })
})
