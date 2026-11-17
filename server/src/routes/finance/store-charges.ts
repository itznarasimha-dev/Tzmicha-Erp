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
import { uuidSchema } from '../../lib/validation.js'

export const financeStoreChargesRouter = Router()

financeStoreChargesRouter.use(authenticate)

// -----------------------------------------------------------------------------
// GET /api/finance/store-charges - Finance Reviews All Submitted Store Charges
// -----------------------------------------------------------------------------
financeStoreChargesRouter.get('/', async (req, res) => {
  const auth = req.auth!
  const status = req.query.status ? String(req.query.status) : null

  const charges = await withRls(auth, async (client) => {
    let sql = `
      select c.*, w.name as warehouse_name, u.name as submitted_by_name, rev.name as reviewed_by_name
      from erp.store_charges c
      join erp.warehouses w on w.id = c.warehouse_id
      left join erp.users u on u.id = c.created_by
      left join erp.users rev on rev.id = c.reviewed_by
      where c.org_id = $1
    `
    const params: any[] = [auth.orgId]
    if (status) {
      params.push(status)
      sql += ` and c.status = $${params.length}`
    }
    sql += ` order by c.created_at desc limit 100`
    return many(client, sql, params)
  }, { readOnly: true })

  sendData(res, charges)
})

// -----------------------------------------------------------------------------
// POST /api/finance/store-charges/:id/review - Approve / Reject Store Charge
// -----------------------------------------------------------------------------
const reviewChargeSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
})

financeStoreChargesRouter.post('/:id/review', validateBody(reviewChargeSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = validatedBody<z.infer<typeof reviewChargeSchema>>(req)

  if (body.action === 'reject' && (!body.reason || body.reason.trim().length === 0)) {
    throw AppError.badRequest('Rejection reason is required')
  }

  const result = await withRls(auth, async (client) => {
    const charge = await one<{
      id: string
      status: string
      total_amount: number
      charge_number: string
      reference_type: string
      reference_id: string | null
      warehouse_id: string
    }>(
      client,
      `select * from erp.store_charges where id = $1 and org_id = $2 for update`,
      [id, auth.orgId]
    )
    if (!charge) throw AppError.notFound('Store charge not found')

    if (charge.status !== 'submitted') {
      throw AppError.badRequest(`Charge is already decided (current status: ${charge.status})`)
    }

    if (body.action === 'reject') {
      const rejected = await one(
        client,
        `update erp.store_charges
         set status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = now(), updated_at = now()
         where id = $3 and org_id = $4
         returning *`,
        [body.reason, auth.userId, id, auth.orgId]
      )
      await audit(client, 'store_charge.reject', 'store_charge', id, `Rejected store charge ${charge.charge_number}`, null, { reason: body.reason })
      return rejected
    }

    // On Approval:
    // 1. Double-entry Journal Entry (Debit: 6200 Freight/Handling Expense, Credit: 2000 Accounts Payable)
    const je = await one<{ id: string }>(
      client,
      `insert into erp.journal_entries (
        org_id, entry_number, entry_date, description, reference_type, reference_id, created_by
      ) values ($1, $2, current_date, $3, 'store_charge', $4, $5)
      returning id`,
      [
        auth.orgId,
        `JE-CHG-${Date.now().toString().slice(-6)}`,
        `Store Charge ${charge.charge_number}`,
        id,
        auth.userId,
      ]
    )

    if (je) {
      await client.query(
        `insert into erp.journal_entry_lines (org_id, journal_entry_id, account_code, debit, credit, description)
         values ($1, $2, '6200', $3, 0, 'Freight & Warehouse Handling Expense')`,
        [auth.orgId, je.id, charge.total_amount]
      )
      await client.query(
        `insert into erp.journal_entry_lines (org_id, journal_entry_id, account_code, debit, credit, description)
         values ($1, $2, '2000', 0, $3, 'Accounts Payable - Logistics')`,
        [auth.orgId, je.id, charge.total_amount]
      )
    }

    // 2. Landed Cost Calculation: If linked to inbound goods (PO or GRN), add charge to landed cost
    let landedCostAdded = false
    if (charge.reference_type === 'grn' && charge.reference_id) {
      const lines = await many<{ id: string; accepted_quantity: number; unit_cost: number }>(
        client,
        `select id, accepted_quantity, unit_cost from erp.goods_receipt_lines where grn_id = $1 and org_id = $2`,
        [charge.reference_id, auth.orgId]
      )
      const totalAccepted = lines.reduce((s, l) => s + Number(l.accepted_quantity), 0)
      if (totalAccepted > 0) {
        for (const line of lines) {
          const share = Number(((Number(line.accepted_quantity) / totalAccepted) * charge.total_amount).toFixed(2))
          const unitLanded = Number((Number(line.unit_cost) + (share / Number(line.accepted_quantity))).toFixed(2))
          await client.query(
            `update erp.goods_receipt_lines
             set landed_cost_share = landed_cost_share + $1, final_unit_landed_cost = $2
             where id = $3`,
            [share, unitLanded, line.id]
          )
        }
        landedCostAdded = true
      }
    }

    const approved = await one(
      client,
      `update erp.store_charges
       set status = 'approved', landed_cost_added = $1, journal_entry_id = $2,
           reviewed_by = $3, reviewed_at = now(), updated_at = now()
       where id = $4 and org_id = $5
       returning *`,
      [landedCostAdded, je?.id || null, auth.userId, id, auth.orgId]
    )

    await audit(client, 'store_charge.approve', 'store_charge', id, `Approved store charge ${charge.charge_number}`, null, {
      totalAmount: charge.total_amount,
      landedCostAdded,
    })

    return approved
  })

  sendData(res, result)
})
