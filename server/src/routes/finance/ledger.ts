import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, audit } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import {
  sendData,
  validateBody,
  validatedBody,
} from '../../http.js'
import { authenticate } from '../../middleware/auth.js'
import { optionalText, optionalUuid, uuidSchema } from '../../lib/validation.js'

export const ledgerRouter = Router()

ledgerRouter.use(authenticate)

// -----------------------------------------------------------------------------
// Chart of Accounts
// -----------------------------------------------------------------------------
ledgerRouter.get('/chart-of-accounts', async (req, res) => {
  const auth = req.auth!

  const accounts = await withRls(auth, async (client) => {
    return many(
      client,
      `select * from erp.chart_of_accounts where org_id = $1 order by code asc`,
      [auth.orgId]
    )
  }, { readOnly: true })

  sendData(res, accounts)
})

const createAccountSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  subType: optionalText(50),
  description: optionalText(200),
})

ledgerRouter.post('/chart-of-accounts', validateBody(createAccountSchema), async (req, res) => {
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof createAccountSchema>>(req)

  const created = await withRls(auth, async (client) => {
    const existing = await one(
      client,
      `select id from erp.chart_of_accounts where org_id = $1 and code = $2`,
      [auth.orgId, body.code]
    )
    if (existing) throw AppError.badRequest(`Account with code ${body.code} already exists`)

    const acc = await one(
      client,
      `insert into erp.chart_of_accounts (
        org_id, code, name, account_type, sub_type, description
      ) values ($1, $2, $3, $4, $5, $6)
      returning *`,
      [auth.orgId, body.code, body.name, body.accountType, body.subType || null, body.description || null]
    )

    await audit(client, 'chart_of_accounts.create', 'chart_of_accounts', (acc as any).id, `Created account ${body.code}: ${body.name}`)
    return acc
  })

  sendData(res, created, 201)
})

// -----------------------------------------------------------------------------
// Journal Entries (Double-Entry, Period-Lock Enforced, Append-Only)
// -----------------------------------------------------------------------------
ledgerRouter.get('/journal-entries', async (req, res) => {
  const auth = req.auth!

  const entries = await withRls(auth, async (client) => {
    const jes = await many<{ id: string }>(
      client,
      `select je.*, u.name as created_by_name
       from erp.journal_entries je
       left join erp.users u on u.id = je.created_by
       where je.org_id = $1
       order by je.entry_date desc, je.created_at desc limit 100`,
      [auth.orgId]
    )

    for (const je of jes as any[]) {
      je.lines = await many(
        client,
        `select * from erp.journal_entry_lines where journal_entry_id = $1 and org_id = $2 order by id asc`,
        [je.id, auth.orgId]
      )
    }

    return jes
  }, { readOnly: true })

  sendData(res, entries)
})

const createJournalSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().min(3).max(500),
  referenceType: optionalText(50),
  referenceId: optionalUuid,
  lines: z.array(
    z.object({
      accountCode: z.string().min(1),
      debit: z.number().nonnegative().default(0),
      credit: z.number().nonnegative().default(0),
      description: optionalText(200),
    })
  ).min(2, 'A journal entry must have at least 2 lines (debit & credit)'),
})

ledgerRouter.post('/journal-entries', validateBody(createJournalSchema), async (req, res) => {
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof createJournalSchema>>(req)

  // 1. Balance check: sum(debit) must equal sum(credit)
  const totalDebit = Number(body.lines.reduce((s, l) => s + (l.debit || 0), 0).toFixed(2))
  const totalCredit = Number(body.lines.reduce((s, l) => s + (l.credit || 0), 0).toFixed(2))
  if (totalDebit !== totalCredit) {
    throw AppError.badRequest(`Journal entry is unbalanced: Total Debits (₹${totalDebit}) must equal Total Credits (₹${totalCredit})`)
  }

  // 2. Period Lock check: Check if entryDate falls in a locked accounting period
  const periodName = body.entryDate.slice(0, 7) // 'YYYY-MM'

  const created = await withRls(auth, async (client) => {
    const locked = await one<{ id: string; period_name: string }>(
      client,
      `select id, period_name from erp.accounting_periods
       where org_id = $1 and period_name = $2 and is_locked = true`,
      [auth.orgId, periodName]
    )
    if (locked) {
      throw AppError.badRequest(`Cannot post journal entry: Accounting period ${periodName} is locked`)
    }

    const docNum = `JE-${Date.now().toString().slice(-6)}`

    const je = await one<{ id: string }>(
      client,
      `insert into erp.journal_entries (
        org_id, entry_number, entry_date, description, reference_type, reference_id, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7)
      returning *`,
      [
        auth.orgId,
        docNum,
        body.entryDate,
        body.description,
        body.referenceType || 'manual',
        body.referenceId || null,
        auth.userId,
      ]
    )
    if (!je) throw new AppError(500, 'internal_error', 'Failed to create journal entry')

    for (const line of body.lines) {
      await client.query(
        `insert into erp.journal_entry_lines (
          org_id, journal_entry_id, account_code, debit, credit, description
        ) values ($1, $2, $3, $4, $5, $6)`,
        [auth.orgId, je.id, line.accountCode, line.debit, line.credit, line.description || null]
      )
    }

    await audit(client, 'journal.create', 'journal_entry', je.id, `Created journal entry ${docNum} for ₹${totalDebit}`)
    return je
  })

  sendData(res, created, 201)
})

// -----------------------------------------------------------------------------
// POST /api/finance/ledger/journal-entries/:id/reverse - Append-Only Reversal
// -----------------------------------------------------------------------------
ledgerRouter.post('/journal-entries/:id/reverse', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const reversed = await withRls(auth, async (client) => {
    const original = await one<{ id: string; entry_number: string; description: string }>(
      client,
      `select * from erp.journal_entries where id = $1 and org_id = $2`,
      [id, auth.orgId]
    )
    if (!original) throw AppError.notFound('Journal entry not found')

    const lines = await many<{ account_code: string; debit: number; credit: number; description: string }>(
      client,
      `select * from erp.journal_entry_lines where journal_entry_id = $1 and org_id = $2`,
      [id, auth.orgId]
    )

    const revDocNum = `REV-${original.entry_number}`

    const revJe = await one<{ id: string }>(
      client,
      `insert into erp.journal_entries (
        org_id, entry_number, entry_date, description, reference_type, reference_id, created_by
      ) values ($1, $2, current_date, $3, 'reversal', $4, $5)
      returning *`,
      [
        auth.orgId,
        revDocNum,
        `Reversal of ${original.entry_number}: ${original.description}`,
        id,
        auth.userId,
      ]
    )
    if (!revJe) throw new AppError(500, 'internal_error', 'Failed to create reversal journal entry')

    // Reverse lines: swap debits and credits
    for (const l of lines) {
      await client.query(
        `insert into erp.journal_entry_lines (
          org_id, journal_entry_id, account_code, debit, credit, description
        ) values ($1, $2, $3, $4, $5, $6)`,
        [auth.orgId, revJe.id, l.account_code, l.credit, l.debit, `Reversal of ${l.account_code}`]
      )
    }

    await audit(client, 'journal.reverse', 'journal_entry', revJe.id, `Reversed journal entry ${original.entry_number}`)
    return revJe
  })

  sendData(res, reversed, 201)
})

// -----------------------------------------------------------------------------
// Financial Reports: Trial Balance, Profit & Loss, Balance Sheet, GST Summary
// -----------------------------------------------------------------------------
ledgerRouter.get('/reports/trial-balance', async (req, res) => {
  const auth = req.auth!

  const report = await withRls(auth, async (client) => {
    const rows = await many<{
      code: string
      name: string
      account_type: string
      total_debit: number
      total_credit: number
    }>(
      client,
      `select coa.code, coa.name, coa.account_type,
              coalesce(sum(jel.debit), 0)::numeric as total_debit,
              coalesce(sum(jel.credit), 0)::numeric as total_credit
       from erp.chart_of_accounts coa
       left join erp.journal_entry_lines jel on jel.account_code = coa.code and jel.org_id = coa.org_id
       where coa.org_id = $1
       group by coa.code, coa.name, coa.account_type
       order by coa.code asc`,
      [auth.orgId]
    )

    const sumDebits = Number(rows.reduce((s, r) => s + Number(r.total_debit), 0).toFixed(2))
    const sumCredits = Number(rows.reduce((s, r) => s + Number(r.total_credit), 0).toFixed(2))

    return {
      accounts: rows,
      totalDebits: sumDebits,
      totalCredits: sumCredits,
      isBalanced: sumDebits === sumCredits,
      generatedAt: new Date().toISOString(),
    }
  }, { readOnly: true })

  sendData(res, report)
})

ledgerRouter.get('/reports/profit-and-loss', async (req, res) => {
  const auth = req.auth!

  const pnl = await withRls(auth, async (client) => {
    const rows = await many<{ account_type: string; total_debit: number; total_credit: number }>(
      client,
      `select coa.account_type,
              coalesce(sum(jel.debit), 0)::numeric as total_debit,
              coalesce(sum(jel.credit), 0)::numeric as total_credit
       from erp.chart_of_accounts coa
       join erp.journal_entry_lines jel on jel.account_code = coa.code and jel.org_id = coa.org_id
       where coa.org_id = $1 and coa.account_type in ('revenue', 'expense')
       group by coa.account_type`,
      [auth.orgId]
    )

    let totalRevenue = 0
    let totalExpense = 0

    for (const r of rows) {
      if (r.account_type === 'revenue') {
        totalRevenue += (Number(r.total_credit) - Number(r.total_debit))
      } else if (r.account_type === 'expense') {
        totalExpense += (Number(r.total_debit) - Number(r.total_credit))
      }
    }

    return {
      revenue: Number(totalRevenue.toFixed(2)),
      expenses: Number(totalExpense.toFixed(2)),
      netProfit: Number((totalRevenue - totalExpense).toFixed(2)),
      generatedAt: new Date().toISOString(),
    }
  }, { readOnly: true })

  sendData(res, pnl)
})

ledgerRouter.get('/reports/gst-summary', async (req, res) => {
  const auth = req.auth!

  const gst = await withRls(auth, async (client) => {
    const outward = await one<{ taxable: number; tax: number }>(
      client,
      `select coalesce(sum(subtotal), 0)::numeric as taxable, coalesce(sum(tax_amount), 0)::numeric as tax
       from erp.invoices where org_id = $1`,
      [auth.orgId]
    )
    const inward = await one<{ taxable: number; tax: number }>(
      client,
      `select coalesce(sum(amount), 0)::numeric as taxable, coalesce(sum(tax_amount), 0)::numeric as tax
       from erp.company_expenses where org_id = $1 and status = 'paid'`,
      [auth.orgId]
    )

    const outwardTax = Number(outward?.tax || 0)
    const itcAvailable = Number(inward?.tax || 0)

    return {
      gstr1Outward: {
        taxableValue: Number(outward?.taxable || 0),
        taxLiability: outwardTax,
      },
      gstr3bInwardITC: {
        taxableValue: Number(inward?.taxable || 0),
        itcAvailable,
      },
      netGstPayable: Number(Math.max(0, outwardTax - itcAvailable).toFixed(2)),
      generatedAt: new Date().toISOString(),
    }
  }, { readOnly: true })

  sendData(res, gst)
})

// -----------------------------------------------------------------------------
// Accounting Periods & Period Locking
// -----------------------------------------------------------------------------
ledgerRouter.get('/periods', async (req, res) => {
  const auth = req.auth!

  const periods = await withRls(auth, async (client) => {
    return many(
      client,
      `select p.*, u.name as locked_by_name
       from erp.accounting_periods p
       left join erp.users u on u.id = p.locked_by
       where p.org_id = $1
       order by p.period_name desc limit 24`,
      [auth.orgId]
    )
  }, { readOnly: true })

  sendData(res, periods)
})

ledgerRouter.post('/periods/:period/lock', async (req, res) => {
  const auth = req.auth!
  const period = req.params.period

  const result = await withRls(auth, async (client) => {
    const existing = await one<{ id: string; is_locked: boolean }>(
      client,
      `select id, is_locked from erp.accounting_periods where org_id = $1 and period_name = $2`,
      [auth.orgId, period]
    )

    let record
    if (existing) {
      record = await one(
        client,
        `update erp.accounting_periods
         set is_locked = true, locked_by = $1, locked_at = now(), updated_at = now()
         where id = $2 and org_id = $3
         returning *`,
        [auth.userId, existing.id, auth.orgId]
      )
    } else {
      const startDate = `${period}-01`
      const endDate = `${period}-28`
      record = await one(
        client,
        `insert into erp.accounting_periods (
          org_id, period_name, start_date, end_date, is_locked, locked_by, locked_at
        ) values ($1, $2, $3, $4, true, $5, now())
        returning *`,
        [auth.orgId, period, startDate, endDate, auth.userId]
      )
    }

    await audit(client, 'period.lock', 'accounting_period', (record as any).id, `Locked accounting period ${period}`)
    return record
  })

  sendData(res, result)
})

ledgerRouter.post('/periods/:period/unlock', async (req, res) => {
  const auth = req.auth!
  const period = req.params.period

  const result = await withRls(auth, async (client) => {
    const record = await one(
      client,
      `update erp.accounting_periods
       set is_locked = false, locked_by = null, locked_at = null, updated_at = now()
       where period_name = $1 and org_id = $2
       returning *`,
      [period, auth.orgId]
    )
    if (!record) throw AppError.notFound(`Accounting period ${period} not found`)

    await audit(client, 'period.unlock', 'accounting_period', (record as any).id, `Unlocked accounting period ${period}`)
    return record
  })

  sendData(res, result)
})
