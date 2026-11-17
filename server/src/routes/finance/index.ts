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
import { documentsRouter } from './documents.js'
import { importsRouter } from './imports.js'
import { expensesRouter } from './expenses.js'
import { payrollRouter } from './payroll.js'
import { refundsRouter } from './refunds.js'
import { financeStoreChargesRouter } from './store-charges.js'
import { ledgerRouter } from './ledger.js'

export const financeRouter = Router()

async function logAudit(
  client: any,
  auth: any,
  entry: { action: string; entityType: string; entityId: string | null; details?: any }
) {
  await audit(
    client,
    entry.action,
    entry.entityType,
    entry.entityId,
    `Action ${entry.action} by ${auth.name}`,
    null,
    entry.details ?? null
  )
}

financeRouter.use(authenticate)

financeRouter.use('/documents', documentsRouter)
financeRouter.use('/imports', importsRouter)
financeRouter.use('/expenses', expensesRouter)
financeRouter.use('/payroll', payrollRouter)
financeRouter.use('/refunds', refundsRouter)
financeRouter.use('/store-charges', financeStoreChargesRouter)
financeRouter.use('/ledger', ledgerRouter)

// -----------------------------------------------------------------------------
// Invoices
// -----------------------------------------------------------------------------
financeRouter.get('/invoices', async (req, res) => {
  const auth = req.auth!
  const source = req.query.source ? String(req.query.source) : null

  const invoices = await withRls(auth, async (client) => {
    let sql = `
      select i.*, c.name as customer_name, c.company as customer_company
      from erp.invoices i
      left join erp.customers c on c.id = i.customer_id
      where i.org_id = $1
    `
    const params: any[] = [auth.orgId]
    if (source) {
      params.push(source)
      sql += ` and i.source = $2`
    }
    sql += ` order by i.created_at desc limit 100`
    return many(client, sql, params)
  }, { readOnly: true })

  sendData(res, invoices)
})

const createInvoiceSchema = z.object({
  customerId: optionalUuid,
  salesOrderId: optionalUuid,
  issueDate: optionalText(),
  dueDate: optionalText(),
  subtotal: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().positive(),
  notes: optionalText(),
  terms: optionalText(),
})

financeRouter.post('/invoices', validateBody(createInvoiceSchema), async (req, res) => {
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof createInvoiceSchema>>(req)

  const created = await withRls(auth, async (client) => {
    const code = await nextDocNumber(client, auth.orgId, 'invoice')
    const inv = await one<{ id: string; code: string; total_amount: number }>(
      client,
      `insert into erp.invoices (
        org_id, code, customer_id, sales_order_id, status, 
        issue_date, due_date, subtotal, tax_amount, total_amount, notes, terms
      ) values (
        $1, $2, $3, $4, 'issued',
        coalesce($5::date, current_date), $6::date, coalesce($7, 0), coalesce($8, 0), $9, $10, $11
      ) returning *`,
      [
        auth.orgId,
        code,
        body.customerId || null,
        body.salesOrderId || null,
        body.issueDate || null,
        body.dueDate || null,
        body.subtotal || 0,
        body.taxAmount || 0,
        body.totalAmount,
        body.notes || null,
        body.terms || null,
      ]
    )
    if (!inv) throw new AppError(500, 'internal_error', 'Failed to create invoice')

    await logAudit(client, auth, {
      action: 'invoice.create',
      entityType: 'invoice',
      entityId: inv.id,
      details: { code: inv.code, total: inv.total_amount },
    })

    return inv
  })

  sendData(res, created, 201)
})

financeRouter.post('/invoices/:id/approve', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const { reason } = req.body || {}

  const updated = await withRls(auth, async (client) => {
    const inv = await one<{ id: string; status: string }>(
      client,
      `update erp.invoices
       set status = 'approved', updated_at = now()
       where id = $1 and org_id = $2
       returning *`,
      [id, auth.orgId]
    )
    if (!inv) throw new AppError(404, 'not_found', 'Invoice not found')

    await logAudit(client, auth, {
      action: 'invoice.approve',
      entityType: 'invoice',
      entityId: inv.id,
      details: { reason },
    })
    return inv
  })

  sendData(res, updated)
})

financeRouter.post('/invoices/:id/reject', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const { reason } = req.body || {}

  const updated = await withRls(auth, async (client) => {
    const inv = await one<{ id: string; status: string }>(
      client,
      `update erp.invoices
       set status = 'rejected', updated_at = now()
       where id = $1 and org_id = $2
       returning *`,
      [id, auth.orgId]
    )
    if (!inv) throw new AppError(404, 'not_found', 'Invoice not found')

    await logAudit(client, auth, {
      action: 'invoice.reject',
      entityType: 'invoice',
      entityId: inv.id,
      details: { reason },
    })
    return inv
  })

  sendData(res, updated)
})

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------
financeRouter.get('/payments', async (req, res) => {
  const auth = req.auth!

  const payments = await withRls(auth, async (client) => {
    const sql = `
      select p.*, c.name as customer_name, c.company as customer_company
      from erp.payments p
      left join erp.customers c on c.id = p.customer_id
      where p.org_id = $1
      order by p.created_at desc limit 100
    `
    return many(client, sql, [auth.orgId])
  }, { readOnly: true })

  sendData(res, payments)
})

const recordPaymentSchema = z.object({
  customerId: optionalUuid,
  invoiceId: optionalUuid,
  amount: z.number().positive(),
  method: z.string().default('Bank Transfer'),
  reference: optionalText(),
  idempotencyKey: optionalText(),
})

financeRouter.post('/payments', validateBody(recordPaymentSchema), async (req, res) => {
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof recordPaymentSchema>>(req)

  const created = await withRls(auth, async (client) => {
    const code = `PAY-${Date.now().toString().slice(-6)}`
    const payment = await one<{ id: string; code: string; amount: number }>(
      client,
      `insert into erp.payments (
        org_id, code, customer_id, method, amount, reference, idempotency_key, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning *`,
      [
        auth.orgId,
        code,
        body.customerId || null,
        body.method,
        body.amount,
        body.reference || null,
        body.idempotencyKey || null,
        auth.userId,
      ]
    )
    if (!payment) throw new AppError(500, 'internal_error', 'Failed to record payment')

    if (body.invoiceId) {
      await client.query(
        `insert into erp.payment_allocations (org_id, payment_id, invoice_id, amount)
         values ($1, $2, $3, $4)`,
        [auth.orgId, payment.id, body.invoiceId, body.amount]
      )
      await client.query(
        `update erp.invoices
         set paid_amount = paid_amount + $1,
             status = case when paid_amount + $1 >= total_amount then 'paid' else 'partially_paid' end,
             updated_at = now()
         where id = $2 and org_id = $3`,
        [body.amount, body.invoiceId, auth.orgId]
      )
    }

    await logAudit(client, auth, {
      action: 'payment.record',
      entityType: 'payment',
      entityId: payment.id,
      details: { amount: payment.amount, method: body.method },
    })

    return payment
  })

  sendData(res, created, 201)
})

financeRouter.post('/payments/:id/verify', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const { reason } = req.body || {}

  const updated = await withRls(auth, async (client) => {
    const pmt = await one<{ id: string }>(
      client,
      `update erp.payments
       set updated_at = now()
       where id = $1 and org_id = $2
       returning *`,
      [id, auth.orgId]
    )
    if (!pmt) throw new AppError(404, 'not_found', 'Payment not found')

    await logAudit(client, auth, {
      action: 'payment.verify',
      entityType: 'payment',
      entityId: pmt.id,
      details: { reason },
    })
    return pmt
  })

  sendData(res, updated)
})

financeRouter.post('/payments/:id/flag', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const { reason } = req.body || {}

  const updated = await withRls(auth, async (client) => {
    const pmt = await one<{ id: string }>(
      client,
      `update erp.payments
       set updated_at = now()
       where id = $1 and org_id = $2
       returning *`,
      [id, auth.orgId]
    )
    if (!pmt) throw new AppError(404, 'not_found', 'Payment not found')

    await logAudit(client, auth, {
      action: 'payment.flag',
      entityType: 'payment',
      entityId: pmt.id,
      details: { reason },
    })
    return pmt
  })

  sendData(res, updated)
})

// -----------------------------------------------------------------------------
// Ledgers & Accounts
// -----------------------------------------------------------------------------
financeRouter.get('/ledgers', async (req, res) => {
  const auth = req.auth!

  const result = await withRls(auth, async (client) => {
    const accounts = await many(
      client,
      `select * from erp.chart_of_accounts where org_id = $1 order by code asc`,
      [auth.orgId]
    )
    const journalEntries = await many(
      client,
      `select * from erp.journal_entries where org_id = $1 order by entry_date desc limit 100`,
      [auth.orgId]
    )
    const refundClaims = await many(
      client,
      `select * from erp.credit_notes where org_id = $1 and note_type = 'credit_note' order by created_at desc limit 100`,
      [auth.orgId]
    )

    return {
      refundClaims,
      commissionPolicies: [],
      settlements: [],
      journalEntries,
      accounts,
    }
  }, { readOnly: true })

  sendData(res, result)
})

financeRouter.post('/incentives', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  const created = await withRls(auth, async (client) => {
    const id = `INC-${Date.now().toString().slice(-6)}`
    await logAudit(client, auth, {
      action: 'incentive.create',
      entityType: 'incentive_settlement',
      entityId: id,
      details: body,
    })
    return { id, ...body, status: 'submitted', createdAt: new Date().toISOString() }
  })

  sendData(res, created, 201)
})
