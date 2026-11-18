import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, count, audit, nextDocNumber } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import {
  sendData,
  validateBody,
  validatedBody,
} from '../../http.js'
import { authenticate, requirePermission } from '../../middleware/auth.js'
import { optionalText, optionalUuid, uuidSchema } from '../../lib/validation.js'
import { findReplay, readIdempotencyKey } from '../../lib/idempotency.js'

export const expensesRouter = Router()

expensesRouter.use(authenticate)

const createExpenseSchema = z.object({
  category: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  taxAmount: z.number().nonnegative().optional().default(0),
  gstin: optionalText(20),
  vendorName: optionalText(150),
  invoiceNumber: optionalText(100),
  invoiceDate: optionalText(30),
  paymentMode: z.enum(['Bank Transfer', 'UPI', 'Cheque', 'Credit Card', 'Cash', 'Petty Cash']).default('Bank Transfer'),
  budgetTag: optionalText(50),
  receiptUrl: optionalText(500),
  idempotencyKey: optionalText(200),
})

// -----------------------------------------------------------------------------
// GET /api/finance/expenses - List Company Expenses
// -----------------------------------------------------------------------------
expensesRouter.get('/', async (req, res) => {
  const auth = req.auth!
  const status = req.query.status ? String(req.query.status) : null
  const category = req.query.category ? String(req.query.category) : null

  const expenses = await withRls(auth, async (client) => {
    let sql = `
      select e.*, u.name as created_by_name, p.name as paid_by_name
      from erp.company_expenses e
      left join erp.users u on u.id = e.created_by
      left join erp.users p on p.id = e.paid_by
      where e.org_id = $1
    `
    const params: any[] = [auth.orgId]
    if (status) {
      params.push(status)
      sql += ` and e.status = $${params.length}`
    }
    if (category) {
      params.push(category)
      sql += ` and e.category = $${params.length}`
    }
    sql += ` order by e.created_at desc limit 100`
    return many(client, sql, params)
  }, { readOnly: true })

  sendData(res, expenses)
})

// -----------------------------------------------------------------------------
// POST /api/finance/expenses - Create Company Expense
// -----------------------------------------------------------------------------
expensesRouter.post('/', validateBody(createExpenseSchema), async (req, res) => {
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof createExpenseSchema>>(req)
  const idempotencyKey = readIdempotencyKey(req.headers['idempotency-key']) ?? body.idempotencyKey ?? null

  const result = await withRls(auth, async (client) => {
    if (idempotencyKey) {
      const replay = await findReplay(client, 'company_expenses', '*', auth.orgId, idempotencyKey)
      if (replay) return { expense: replay, replayed: true, warning: null }
    }

    // Check for duplicate invoice/receipt warning within org
    let warning: string | null = null
    if (body.invoiceNumber && body.vendorName) {
      const dup = await one<{ id: string; expense_number: string }>(
        client,
        `select id, expense_number from erp.company_expenses
         where org_id = $1 and lower(invoice_number) = lower($2) and lower(vendor_name) = lower($3)
         limit 1`,
        [auth.orgId, body.invoiceNumber, body.vendorName]
      )
      if (dup) {
        warning = `Potential duplicate: Expense ${dup.expense_number} already recorded for vendor "${body.vendorName}" with invoice "${body.invoiceNumber}"`
      }
    }

    const docNum = await nextDocNumber(client, auth.orgId, 'expense')
    const totalAmount = Number((body.amount + (body.taxAmount || 0)).toFixed(2))

    const expense = await one(
      client,
      `insert into erp.company_expenses (
        org_id, expense_number, category, description, amount, tax_amount, total_amount,
        gstin, vendor_name, invoice_number, invoice_date, payment_mode, budget_tag,
        receipt_url, status, idempotency_key, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', $15, $16)
      returning *`,
      [
        auth.orgId,
        docNum,
        body.category,
        body.description,
        body.amount,
        body.taxAmount || 0,
        totalAmount,
        body.gstin || null,
        body.vendorName || null,
        body.invoiceNumber || null,
        body.invoiceDate || null,
        body.paymentMode,
        body.budgetTag || null,
        body.receiptUrl || null,
        idempotencyKey,
        auth.userId,
      ]
    )

    await audit(
      client,
      'expense.create',
      'company_expense',
      (expense as any).id,
      `Created company expense ${docNum}`,
      null,
      { totalAmount, category: body.category, warning }
    )

    return { expense, replayed: false, warning }
  })

  sendData(res, result, 201)
})

// -----------------------------------------------------------------------------
// POST /api/finance/expenses/:id/pay - Idempotent Payout with Ledger Entry
// -----------------------------------------------------------------------------
const payExpenseSchema = z.object({
  paymentRef: z.string().min(1).max(100),
  paymentMode: z.enum(['Bank Transfer', 'UPI', 'Cheque', 'Credit Card', 'Cash', 'Petty Cash']).default('Bank Transfer'),
  idempotencyKey: optionalText(200),
})

expensesRouter.post('/:id/pay', validateBody(payExpenseSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = validatedBody<z.infer<typeof payExpenseSchema>>(req)

  const result = await withRls(auth, async (client) => {
    const expense = await one<{
      id: string
      status: string
      expense_number: string
      total_amount: number
      category: string
      paid_at: string | null
    }>(
      client,
      `select * from erp.company_expenses where id = $1 and org_id = $2 for update`,
      [id, auth.orgId]
    )
    if (!expense) throw AppError.notFound('Expense not found')

    if (expense.status === 'paid') {
      return { expense, replayed: true, message: 'Expense is already paid' }
    }

    const updated = await one(
      client,
      `update erp.company_expenses
       set status = 'paid', payment_ref = $1, payment_mode = $2, paid_at = now(), paid_by = $3, updated_at = now()
       where id = $4 and org_id = $5
       returning *`,
      [body.paymentRef, body.paymentMode, auth.userId, id, auth.orgId]
    )

    // Double-entry ledger posting (Append-only journal entry)
    const je = await one<{ id: string }>(
      client,
      `insert into erp.journal_entries (
        org_id, entry_number, entry_date, description, reference_type, reference_id, created_by
      ) values ($1, $2, current_date, $3, 'expense', $4, $5)
      returning id`,
      [
        auth.orgId,
        `JE-EXP-${Date.now().toString().slice(-6)}`,
        `Payout for ${expense.expense_number}: ${expense.category}`,
        id,
        auth.userId,
      ]
    )

    if (je) {
      // Debit: Operating Expense (e.g., Code 6000 or category)
      await client.query(
        `insert into erp.journal_entry_lines (org_id, journal_entry_id, account_code, debit, credit, description)
         values ($1, $2, '6000', $3, 0, $4)`,
        [auth.orgId, je.id, expense.total_amount, `Expense ${expense.expense_number}`]
      )
      // Credit: Cash / Bank (Code 1000)
      await client.query(
        `insert into erp.journal_entry_lines (org_id, journal_entry_id, account_code, debit, credit, description)
         values ($1, $2, '1000', 0, $3, $4)`,
        [auth.orgId, je.id, expense.total_amount, `Bank Payout Ref ${body.paymentRef}`]
      )
    }

    await audit(
      client,
      'expense.pay',
      'company_expense',
      id,
      `Disbursed expense ${expense.expense_number}`,
      null,
      { amount: expense.total_amount, paymentRef: body.paymentRef }
    )

    return { expense: updated, replayed: false, message: 'Expense disbursed successfully' }
  })

  sendData(res, result)
})

// -----------------------------------------------------------------------------
// GET /api/finance/expenses/claims - Employee Reimbursement Claims
// -----------------------------------------------------------------------------
expensesRouter.get('/claims', async (req, res) => {
  const auth = req.auth!

  const claims = await withRls(auth, async (client) => {
    return many(
      client,
      `select e.*, emp.full_name as employee_name, emp.employee_code
       from erp.hr_expenses e
       join erp.hr_employees emp on emp.id = e.employee_id
       where e.org_id = $1
       order by e.created_at desc limit 100`,
      [auth.orgId]
    )
  }, { readOnly: true })

  sendData(res, claims)
})

// -----------------------------------------------------------------------------
// POST /api/finance/expenses/claims/:id/pay - Disburse Employee Claim
// -----------------------------------------------------------------------------
expensesRouter.post('/claims/:id/pay', validateBody(payExpenseSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = validatedBody<z.infer<typeof payExpenseSchema>>(req)

  const result = await withRls(auth, async (client) => {
    const claim = await one<{ id: string; status: string; amount: number; code: string }>(
      client,
      `select * from erp.hr_expenses where id = $1 and org_id = $2 for update`,
      [id, auth.orgId]
    )
    if (!claim) throw AppError.notFound('Employee expense claim not found')

    if (claim.status === 'Paid' || claim.status === 'Reimbursed') {
      return { claim, replayed: true, message: 'Claim already disbursed' }
    }

    const updated = await one(
      client,
      `update erp.hr_expenses
       set status = 'Paid', reviewer_remarks = coalesce(reviewer_remarks, '') || ' [Paid via ' || $1 || ' ref: ' || $2 || ']', updated_at = now()
       where id = $3 and org_id = $4
       returning *`,
      [body.paymentMode, body.paymentRef, id, auth.orgId]
    )

    await audit(
      client,
      'claim.pay',
      'hr_expense',
      id,
      `Disbursed employee claim ${claim.code}`,
      null,
      { amount: claim.amount, paymentRef: body.paymentRef }
    )

    return { claim: updated, replayed: false, message: 'Claim disbursed successfully' }
  })

  sendData(res, result)
})
