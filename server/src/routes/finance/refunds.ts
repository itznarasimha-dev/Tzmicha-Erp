import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, audit, nextDocNumber } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import {
  sendData,
  validateBody,
  validatedBody,
} from '../../http.js'
import { authenticate } from '../../middleware/auth.js'
import { optionalText, optionalUuid, uuidSchema } from '../../lib/validation.js'
import { findReplay, readIdempotencyKey } from '../../lib/idempotency.js'

export const refundsRouter = Router()

refundsRouter.use(authenticate)

const ADMIN_APPROVAL_THRESHOLD = 50000

const raiseRefundSchema = z.object({
  customerId: uuidSchema,
  invoiceId: optionalUuid,
  serviceTicketId: optionalText(100),
  reason: z.string().min(5).max(500),
  amount: z.number().positive(),
  refundMethod: z.enum(['Bank Transfer', 'UPI', 'Original Payment Method', 'Credit Note', 'Cheque']).default('Bank Transfer'),
  bankDetails: z.record(z.unknown()).optional(),
  idempotencyKey: optionalText(200),
})

// -----------------------------------------------------------------------------
// GET /api/finance/refunds - List Customer Refunds
// -----------------------------------------------------------------------------
refundsRouter.get('/', async (req, res) => {
  const auth = req.auth!
  const status = req.query.status ? String(req.query.status) : null

  const refunds = await withRls(auth, async (client) => {
    let sql = `
      select r.*, c.name as customer_name, c.company as customer_company,
             i.code as invoice_code, u.name as created_by_name, rev.name as reviewed_by_name
      from erp.customer_refunds r
      join erp.customers c on c.id = r.customer_id
      left join erp.invoices i on i.id = r.invoice_id
      left join erp.users u on u.id = r.created_by
      left join erp.users rev on rev.id = r.reviewed_by
      where r.org_id = $1
    `
    const params: any[] = [auth.orgId]
    if (status) {
      params.push(status)
      sql += ` and r.status = $${params.length}`
    }
    sql += ` order by r.created_at desc limit 100`
    return many(client, sql, params)
  }, { readOnly: true })

  sendData(res, refunds)
})

// -----------------------------------------------------------------------------
// POST /api/finance/refunds - Raise Refund Request (Service/Sales/Finance)
// -----------------------------------------------------------------------------
refundsRouter.post('/', validateBody(raiseRefundSchema), async (req, res) => {
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof raiseRefundSchema>>(req)
  const idempotencyKey = readIdempotencyKey(req.headers['idempotency-key']) ?? body.idempotencyKey ?? null

  const result = await withRls(auth, async (client) => {
    if (idempotencyKey) {
      const replay = await findReplay(client, 'customer_refunds', '*', auth.orgId, idempotencyKey)
      if (replay) return { refund: replay, replayed: true }
    }

    // Check: Single open refund per invoice + ticket
    const openRefund = await one<{ id: string; refund_number: string }>(
      client,
      `select id, refund_number from erp.customer_refunds
       where org_id = $1 and coalesce(invoice_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce($2, '00000000-0000-0000-0000-000000000000'::uuid)
         and coalesce(service_ticket_id, '') = coalesce($3, '')
         and status in ('pending_review', 'pending_admin_approval')
       limit 1`,
      [auth.orgId, body.invoiceId || null, body.serviceTicketId || '']
    )
    if (openRefund) {
      throw AppError.badRequest(`An open refund (${openRefund.refund_number}) already exists for this invoice/ticket`)
    }

    // Validation: A refund can never exceed amount paid minus earlier refunds
    if (body.invoiceId) {
      const inv = await one<{ total_amount: number; paid_amount: number }>(
        client,
        `select total_amount, paid_amount from erp.invoices where id = $1 and org_id = $2`,
        [body.invoiceId, auth.orgId]
      )
      if (inv) {
        const priorRefunds = await one<{ sum: number }>(
          client,
          `select coalesce(sum(amount), 0)::numeric as sum from erp.customer_refunds
           where invoice_id = $1 and org_id = $2 and status in ('approved', 'paid')`,
          [body.invoiceId, auth.orgId]
        )
        const netPaid = Number(inv.paid_amount) - Number(priorRefunds?.sum || 0)
        if (body.amount > netPaid) {
          throw AppError.badRequest(
            `Refund amount (₹${body.amount}) exceeds net paid amount (₹${netPaid > 0 ? netPaid : 0}) on invoice`
          )
        }
      }
    }

    const docNum = await nextDocNumber(client, auth.orgId, 'refund')

    const refund = await one(
      client,
      `insert into erp.customer_refunds (
        org_id, refund_number, customer_id, invoice_id, service_ticket_id,
        reason, amount, refund_method, bank_details, status, idempotency_key, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_review', $10, $11)
      returning *`,
      [
        auth.orgId,
        docNum,
        body.customerId,
        body.invoiceId || null,
        body.serviceTicketId || null,
        body.reason,
        body.amount,
        body.refundMethod,
        JSON.stringify(body.bankDetails || {}),
        idempotencyKey,
        auth.userId,
      ]
    )

    await audit(
      client,
      'refund.raise',
      'customer_refund',
      (refund as any).id,
      `Raised refund request ${docNum} for ₹${body.amount}`,
      null,
      { amount: body.amount, reason: body.reason }
    )

    return { refund, replayed: false }
  })

  sendData(res, result, 201)
})

// -----------------------------------------------------------------------------
// POST /api/finance/refunds/:id/review - Finance Review & Tiered Approval
// -----------------------------------------------------------------------------
const reviewRefundSchema = z.object({
  action: z.enum(['approve', 'reject', 'partially_approve']),
  reason: z.string().min(3).max(500),
  adjustedAmount: z.number().positive().optional(),
})

refundsRouter.post('/:id/review', validateBody(reviewRefundSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = validatedBody<z.infer<typeof reviewRefundSchema>>(req)

  const updated = await withRls(auth, async (client) => {
    const refund = await one<{ id: string; status: string; amount: number; refund_number: string }>(
      client,
      `select * from erp.customer_refunds where id = $1 and org_id = $2 for update`,
      [id, auth.orgId]
    )
    if (!refund) throw AppError.notFound('Refund not found')

    if (refund.status !== 'pending_review') {
      throw AppError.badRequest(`Refund is not in pending_review status (current: ${refund.status})`)
    }

    let targetAmount = refund.amount
    let targetStatus: string

    if (body.action === 'reject') {
      targetStatus = 'rejected'
    } else {
      if (body.action === 'partially_approve') {
        if (!body.adjustedAmount || body.adjustedAmount >= refund.amount) {
          throw AppError.badRequest('Adjusted amount must be less than original amount for partial approval')
        }
        targetAmount = body.adjustedAmount
      }
      targetStatus = targetAmount > ADMIN_APPROVAL_THRESHOLD ? 'pending_admin_approval' : 'approved'
    }

    const resRefund = await one(
      client,
      `update erp.customer_refunds
       set status = $1, amount = $2, review_notes = $3, reviewed_by = $4, reviewed_at = now(), updated_at = now()
       where id = $5 and org_id = $6
       returning *`,
      [targetStatus, targetAmount, body.reason, auth.userId, id, auth.orgId]
    )

    await audit(
      client,
      `refund.${body.action}`,
      'customer_refund',
      id,
      `Finance reviewed refund ${refund.refund_number}: ${targetStatus}`,
      null,
      { action: body.action, reason: body.reason, amount: targetAmount }
    )

    return resRefund
  })

  sendData(res, updated)
})

// -----------------------------------------------------------------------------
// POST /api/finance/refunds/:id/admin-approve - Admin Approval for High Value
// -----------------------------------------------------------------------------
refundsRouter.post('/:id/admin-approve', async (req, res) => {
  const auth = req.auth!
  if (!auth.isAdmin && auth.role !== 'admin' && auth.role !== 'system_admin') {
    throw AppError.forbidden('Only Admins can approve high-value refunds')
  }
  const id = uuidSchema.parse(req.params.id)

  const updated = await withRls(auth, async (client) => {
    const refund = await one<{ id: string; status: string; refund_number: string }>(
      client,
      `select * from erp.customer_refunds where id = $1 and org_id = $2 for update`,
      [id, auth.orgId]
    )
    if (!refund) throw AppError.notFound('Refund not found')

    if (refund.status !== 'pending_admin_approval') {
      throw AppError.badRequest(`Refund is not pending admin approval (current: ${refund.status})`)
    }

    const resRefund = await one(
      client,
      `update erp.customer_refunds
       set status = 'approved', admin_approved_by = $1, admin_approved_at = now(), updated_at = now()
       where id = $2 and org_id = $3
       returning *`,
      [auth.userId, id, auth.orgId]
    )

    await audit(client, 'refund.admin_approve', 'customer_refund', id, `Admin approved refund ${refund.refund_number}`)
    return resRefund
  })

  sendData(res, updated)
})

// -----------------------------------------------------------------------------
// POST /api/finance/refunds/:id/disburse - Disburse Refund, Post Ledger & Credit Note
// -----------------------------------------------------------------------------
const disburseRefundSchema = z.object({
  paymentRef: z.string().min(1).max(100),
  idempotencyKey: optionalText(200),
})

refundsRouter.post('/:id/disburse', validateBody(disburseRefundSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = validatedBody<z.infer<typeof disburseRefundSchema>>(req)

  const result = await withRls(auth, async (client) => {
    const refund = await one<{
      id: string
      status: string
      amount: number
      refund_number: string
      customer_id: string
      invoice_id: string | null
      service_ticket_id: string | null
    }>(
      client,
      `select * from erp.customer_refunds where id = $1 and org_id = $2 for update`,
      [id, auth.orgId]
    )
    if (!refund) throw AppError.notFound('Refund not found')

    if (refund.status === 'paid') {
      return { refund, replayed: true, message: 'Refund already disbursed' }
    }

    if (refund.status !== 'approved') {
      throw AppError.badRequest(`Refund must be approved before disbursement (current: ${refund.status})`)
    }

    // 1. Create Credit Note
    const cnCode = `CN-${Date.now().toString().slice(-6)}`
    const creditNote = await one<{ id: string }>(
      client,
      `insert into erp.credit_notes (
        org_id, code, customer_id, invoice_id, note_type, reason, amount, status, created_by
      ) values ($1, $2, $3, $4, 'credit_note', $5, $6, 'issued', $7)
      returning id`,
      [
        auth.orgId,
        cnCode,
        refund.customer_id,
        refund.invoice_id,
        `Refund ${refund.refund_number}`,
        refund.amount,
        auth.userId,
      ]
    )

    // 2. Double-entry Journal Entry (Debit: 4100 Sales Returns & Refunds, Credit: 1000 Bank)
    const je = await one<{ id: string }>(
      client,
      `insert into erp.journal_entries (
        org_id, entry_number, entry_date, description, reference_type, reference_id, created_by
      ) values ($1, $2, current_date, $3, 'refund', $4, $5)
      returning id`,
      [
        auth.orgId,
        `JE-REF-${Date.now().toString().slice(-6)}`,
        `Customer Refund for ${refund.refund_number}`,
        id,
        auth.userId,
      ]
    )

    if (je) {
      await client.query(
        `insert into erp.journal_entry_lines (org_id, journal_entry_id, account_code, debit, credit, description)
         values ($1, $2, '4100', $3, 0, 'Sales Returns & Customer Refunds')`,
        [auth.orgId, je.id, refund.amount]
      )
      await client.query(
        `insert into erp.journal_entry_lines (org_id, journal_entry_id, account_code, debit, credit, description)
         values ($1, $2, '1000', 0, $3, 'Bank Payout Customer Refund')`,
        [auth.orgId, je.id, refund.amount]
      )
    }

    // 3. Mark Refund as Paid
    const updated = await one(
      client,
      `update erp.customer_refunds
       set status = 'paid', payment_ref = $1, credit_note_id = $2, paid_at = now(), updated_at = now()
       where id = $3 and org_id = $4
       returning *`,
      [body.paymentRef, creditNote?.id || null, id, auth.orgId]
    )

    // 4. Send Notification to Service team
    await client.query(
      `insert into erp.notifications (
        org_id, user_id, title, message, channel, metadata
      ) values (
        $1, $2, 'Customer Refund Disbursed', $3, 'in_app', $4
      )`,
      [
        auth.orgId,
        auth.userId,
        `Refund ${refund.refund_number} for ₹${refund.amount} has been paid via Ref ${body.paymentRef}`,
        JSON.stringify({ refundId: id, refundNumber: refund.refund_number, amount: refund.amount }),
      ]
    )

    await audit(client, 'refund.disburse', 'customer_refund', id, `Disbursed refund ${refund.refund_number}`, null, {
      amount: refund.amount,
      paymentRef: body.paymentRef,
      creditNoteId: creditNote?.id,
    })

    return { refund: updated, creditNoteId: creditNote?.id, replayed: false, message: 'Refund disbursed successfully' }
  })

  sendData(res, result)
})
