import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, count, audit, nextDocNumber } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import {
  paginated,
  parsePagination,
  sendData,
  validateBody,
  validateQuery,
  validatedBody,
  validatedQuery,
} from '../../http.js'
import { authenticate, requirePermission } from '../../middleware/auth.js'
import { optionalText, optionalUuid, uuidSchema } from '../../lib/validation.js'
import { findReplay, readIdempotencyKey } from '../../lib/idempotency.js'

export const salesRouter = Router()

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

salesRouter.use(authenticate)

// -----------------------------------------------------------------------------
// Customers
// -----------------------------------------------------------------------------
salesRouter.get('/customers', requirePermission('sales.customer.read', 'sales.read'), async (req, res) => {
  const auth = req.auth!
  const q = req.query.q ? String(req.query.q).trim() : ''

  const customers = await withRls(auth, async (client) => {
    let sql = `select * from erp.customers where org_id = $1`
    const params: any[] = [auth.orgId]
    if (q) {
      params.push(`%${q}%`)
      sql += ` and (name ilike $2 or company ilike $2 or phone ilike $2 or email ilike $2)`
    }
    sql += ` order by name asc limit 100`
    return many(client, sql, params)
  }, { readOnly: true })

  sendData(res, customers)
})

salesRouter.post('/customers', requirePermission('sales.customer.create', 'sales.create'), async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  const created = await withRls(auth, async (client) => {
    const code = body.code || `CUST-${Date.now().toString().slice(-6)}`
    const customer = await one<{ id: string; code: string; name: string }>(
      client,
      `insert into erp.customers (org_id, code, name, company, phone, email, gstin, address, city, state, credit_limit, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, coalesce($11, 0), coalesce($12, 'active'))
       returning *`,
      [
        auth.orgId,
        code,
        body.name || 'Unnamed Customer',
        body.company || body.businessName || null,
        body.phone || null,
        body.email || null,
        body.gstin || null,
        body.address || body.billingAddress || null,
        body.city || null,
        body.state || null,
        body.creditLimit || 0,
        body.status || 'active',
      ]
    )
    if (!customer) throw new AppError(500, 'internal_error', 'Failed to create customer')
    await logAudit(client, auth, {
      action: 'customer.create',
      entityType: 'customer',
      entityId: customer.id,
      details: { code: customer.code, name: customer.name },
    })
    return customer
  })

  sendData(res, created, 201)
})

salesRouter.patch('/customers/:id', requirePermission('sales.customer.update', 'sales.update'), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = req.body || {}

  const updated = await withRls(auth, async (client) => {
    const customer = await one(
      client,
      `update erp.customers
          set name = coalesce($3, name),
              company = coalesce($4, company),
              phone = coalesce($5, phone),
              email = coalesce($6, email),
              gstin = coalesce($7, gstin),
              address = coalesce($8, address),
              credit_limit = coalesce($9, credit_limit),
              status = coalesce($10, status),
              updated_at = now()
        where id = $1 and org_id = $2
        returning *`,
      [
        id,
        auth.orgId,
        body.name,
        body.company || body.businessName,
        body.phone,
        body.email,
        body.gstin,
        body.address,
        body.creditLimit,
        body.status,
      ]
    )
    return customer
  })

  sendData(res, updated)
})

salesRouter.patch('/customers/:id/credit', requirePermission('sales.customer.update', 'sales.update'), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const creditLimit = Number(req.body.creditLimit ?? 0)

  const updated = await withRls(auth, async (client) => {
    const customer = await one<{ id: string }>(
      client,
      `update erp.customers
          set credit_limit = $3,
              updated_at = now()
        where id = $1 and org_id = $2
        returning *`,
      [id, auth.orgId, creditLimit]
    )
    if (!customer) throw AppError.notFound('Customer not found')
    await logAudit(client, auth, {
      action: 'customer.credit_limit_update',
      entityType: 'customer',
      entityId: id,
      details: { creditLimit },
    })
    return customer
  })

  sendData(res, updated)
})

// -----------------------------------------------------------------------------
// Products & Inventory Summary
// -----------------------------------------------------------------------------
salesRouter.get('/products', async (req, res) => {
  const auth = req.auth!
  const products = await withRls(auth, async (client) => {
    return many(client, `select * from erp.products where org_id = $1 order by name asc limit 200`, [auth.orgId])
  }, { readOnly: true })
  sendData(res, products)
})

salesRouter.get('/inventory/summary', async (req, res) => {
  const auth = req.auth!
  const summary = await withRls(auth, async (client) => {
    const warehouses = await many(client, `select * from erp.warehouses where org_id = $1`, [auth.orgId])
    const regions = await many(client, `select * from erp.regions where org_id = $1`, [auth.orgId])
    const batches = await many(
      client,
      `select p.id as product_id, p.name as product_name, p.sku,
              coalesce(sum(m.quantity), 0) as total_quantity
         from erp.products p
         left join erp.stock_movements m on m.product_id = p.id
        where p.org_id = $1
        group by p.id, p.name, p.sku
        limit 100`,
      [auth.orgId]
    )
    return { warehouses, regions, batches }
  }, { readOnly: true })
  sendData(res, summary)
})

// -----------------------------------------------------------------------------
// Leads & Opportunities (Sales Bridge)
// -----------------------------------------------------------------------------
salesRouter.get('/leads', async (req, res) => {
  const auth = req.auth!
  const leads = await withRls(auth, async (client) => {
    return many(
      client,
      `select * from erp.mkt_leads where org_id = $1 order by created_at desc limit 100`,
      [auth.orgId]
    )
  }, { readOnly: true })
  sendData(res, leads)
})

salesRouter.post('/leads', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}
  const lead = await withRls(auth, async (client) => {
    const code = `LEAD-${Date.now().toString().slice(-6)}`
    return one(
      client,
      `insert into erp.mkt_leads (org_id, code, title, customer_name, contact_name, phone, email, city, status, priority, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, 'New'), coalesce($10, 'Medium'), $11)
       returning *`,
      [
        auth.orgId,
        code,
        body.customerName || 'Inbound Lead',
        body.customerName || 'Inbound Lead',
        body.contactName || null,
        body.phone || null,
        body.email || null,
        body.city || null,
        body.status || 'New',
        body.priority || 'Medium',
        body.notes || null,
      ]
    )
  })
  sendData(res, lead, 201)
})

salesRouter.patch('/leads/:id/decide', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const { action, reason, assignedToId } = req.body || {}

  const updated = await withRls(auth, async (client) => {
    const nextStatus = action === 'accept' ? 'Qualified' : 'Rejected'
    return one(
      client,
      `update erp.mkt_leads
          set status = $3,
              assigned_to_id = coalesce($4, assigned_to_id),
              notes = coalesce(notes || ' | ' || $5, notes),
              updated_at = now()
        where id = $1 and org_id = $2
        returning *`,
      [id, auth.orgId, nextStatus, assignedToId || null, reason || null]
    )
  })
  sendData(res, updated)
})

salesRouter.get('/opportunities', async (req, res) => {
  const auth = req.auth!
  const opportunities = await withRls(auth, async (client) => {
    return many(
      client,
      `select q.*, c.name as customer_name
         from erp.quotations q
         left join erp.customers c on c.id = q.customer_id
        where q.org_id = $1
        order by q.created_at desc limit 100`,
      [auth.orgId]
    )
  }, { readOnly: true })
  sendData(res, opportunities)
})

salesRouter.post('/opportunities', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}
  const opp = await withRls(auth, async (client) => {
    const code = `OPP-${Date.now().toString().slice(-6)}`
    return one(
      client,
      `insert into erp.quotations (org_id, code, customer_id, sales_user_id, status, total_amount)
       values ($1, $2, $3, $4, coalesce($5, 'Draft'), coalesce($6, 0))
       returning *`,
      [auth.orgId, code, body.partyId || body.customerId || null, auth.userId, body.stage || 'Draft', body.estimatedValue || 0]
    )
  })
  sendData(res, opp, 201)
})

salesRouter.patch('/opportunities/:id/stage', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const { stage } = req.body || {}
  const updated = await withRls(auth, async (client) => {
    return one(
      client,
      `update erp.quotations set status = $3, updated_at = now() where id = $1 and org_id = $2 returning *`,
      [id, auth.orgId, stage || 'Draft']
    )
  })
  sendData(res, updated)
})

salesRouter.get('/followups', async (req, res) => {
  const auth = req.auth!
  const followups = await withRls(auth, async (client) => {
    return many(
      client,
      `select * from erp.mkt_lead_followups where org_id = $1 order by scheduled_at desc limit 100`,
      [auth.orgId]
    )
  }, { readOnly: true })
  sendData(res, followups)
})

salesRouter.post('/followups', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}
  const followup = await withRls(auth, async (client) => {
    return one(
      client,
      `insert into erp.mkt_lead_followups (org_id, lead_id, scheduled_at, status, notes)
       values ($1, $2, coalesce($3::timestamptz, now()), 'Scheduled', $4)
       returning *`,
      [auth.orgId, body.partyId || body.leadId || body.opportunityId, body.dueDate || null, body.subject || body.notes || 'Sales Follow-up']
    )
  })
  sendData(res, followup, 201)
})

// -----------------------------------------------------------------------------
// Quotations
// -----------------------------------------------------------------------------
salesRouter.get('/quotations', async (req, res) => {
  const auth = req.auth!
  const quotes = await withRls(auth, async (client) => {
    return many(
      client,
      `select q.*, c.name as customer_name, c.company as customer_company
         from erp.quotations q
         left join erp.customers c on c.id = q.customer_id
        where q.org_id = $1
        order by q.created_at desc limit 100`,
      [auth.orgId]
    )
  }, { readOnly: true })
  sendData(res, quotes)
})

salesRouter.post('/quotations', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}
  const code = body.code || `QT-${Date.now().toString().slice(-6)}`

  const created = await withRls(auth, async (client) => {
    const q = await one<{ id: string; code: string; total_amount: number }>(
      client,
      `insert into erp.quotations (org_id, code, customer_id, sales_user_id, status, valid_until, total_amount)
       values ($1, $2, $3, $4, coalesce($5, 'draft'), $6, coalesce($7, 0))
       returning *`,
      [
        auth.orgId,
        code,
        body.partyId || body.customerId || null,
        auth.userId,
        body.status || 'draft',
        body.validUntil || null,
        body.totalAmount || body.grandTotal || 0,
      ]
    )
    if (!q) throw new AppError(500, 'internal_error', 'Failed to create quotation')
    await logAudit(client, auth, {
      action: 'quotation.create',
      entityType: 'quotation',
      entityId: q.id,
      details: { code: q.code, totalAmount: q.total_amount },
    })
    return q
  })

  sendData(res, created, 201)
})

salesRouter.patch('/quotations/:id', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = req.body || {}

  const updated = await withRls(auth, async (client) => {
    return one(
      client,
      `update erp.quotations
          set valid_until = coalesce($3, valid_until),
              status = coalesce($4, status),
              total_amount = coalesce($5, total_amount),
              updated_at = now()
        where id = $1 and org_id = $2
        returning *`,
      [id, auth.orgId, body.validUntil || null, body.status || null, body.totalAmount ?? body.grandTotal ?? null]
    )
  })

  sendData(res, updated)
})

salesRouter.post('/quotations/:id/approve', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const updated = await withRls(auth, async (client) => {
    const q = await one<{ id: string; code: string }>(
      client,
      `update erp.quotations set status = 'approved', updated_at = now() where id = $1 and org_id = $2 returning *`,
      [id, auth.orgId]
    )
    if (!q) throw AppError.notFound('Quotation not found')
    await logAudit(client, auth, {
      action: 'quotation.approve',
      entityType: 'quotation',
      entityId: id,
      details: { code: q.code },
    })
    return q
  })

  sendData(res, updated)
})

salesRouter.post('/quotations/:id/reject', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const updated = await withRls(auth, async (client) => {
    const q = await one<{ id: string; code: string }>(
      client,
      `update erp.quotations set status = 'rejected', updated_at = now() where id = $1 and org_id = $2 returning *`,
      [id, auth.orgId]
    )
    if (!q) throw AppError.notFound('Quotation not found')
    await logAudit(client, auth, {
      action: 'quotation.reject',
      entityType: 'quotation',
      entityId: id,
      details: { code: q.code },
    })
    return q
  })

  sendData(res, updated)
})

// -----------------------------------------------------------------------------
// Sales Orders
// -----------------------------------------------------------------------------
salesRouter.get('/orders', async (req, res) => {
  const auth = req.auth!
  const orders = await withRls(auth, async (client) => {
    return many(
      client,
      `select o.*, c.name as customer_name, c.company as customer_company
         from erp.sales_orders o
         left join erp.customers c on c.id = o.customer_id
        where o.org_id = $1
        order by o.created_at desc limit 100`,
      [auth.orgId]
    )
  }, { readOnly: true })
  sendData(res, orders)
})

salesRouter.post('/orders', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}
  const code = body.code || `SO-${Date.now().toString().slice(-6)}`

  const created = await withRls(auth, async (client) => {
    const order = await one<{ id: string; code: string; total_amount: number }>(
      client,
      `insert into erp.sales_orders (org_id, code, customer_id, quotation_id, sales_user_id, status, discount_percent, total_amount)
       values ($1, $2, $3, $4, $5, coalesce($6, 'draft'), coalesce($7, 0), coalesce($8, 0))
       returning *`,
      [
        auth.orgId,
        code,
        body.partyId || body.customerId || null,
        body.quotationId || null,
        auth.userId,
        body.status || 'draft',
        body.discountPercent || 0,
        body.totalAmount || 0,
      ]
    )
    if (!order) throw new AppError(500, 'internal_error', 'Failed to create sales order')
    await logAudit(client, auth, {
      action: 'sales_order.create',
      entityType: 'sales_order',
      entityId: order.id,
      details: { code: order.code, totalAmount: order.total_amount },
    })
    return order
  })

  sendData(res, created, 201)
})

salesRouter.post('/orders/:id/cancel', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const { reason } = req.body || {}

  const updated = await withRls(auth, async (client) => {
    const o = await one<{ id: string; code: string }>(
      client,
      `update erp.sales_orders set status = 'cancelled', updated_at = now() where id = $1 and org_id = $2 returning *`,
      [id, auth.orgId]
    )
    if (!o) throw AppError.notFound('Sales order not found')
    await logAudit(client, auth, {
      action: 'sales_order.cancel',
      entityType: 'sales_order',
      entityId: id,
      details: { code: o.code, reason },
    })
    return o
  })

  sendData(res, updated)
})

salesRouter.post('/orders/:id/approve-discount', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const updated = await withRls(auth, async (client) => {
    const o = await one<{ id: string; code: string }>(
      client,
      `update erp.sales_orders set status = 'approved', updated_at = now() where id = $1 and org_id = $2 returning *`,
      [id, auth.orgId]
    )
    if (!o) throw AppError.notFound('Sales order not found')
    await logAudit(client, auth, {
      action: 'sales_order.approve_discount',
      entityType: 'sales_order',
      entityId: id,
      details: { code: o.code },
    })
    return o
  })

  sendData(res, updated)
})

salesRouter.post('/orders/:id/reject-discount', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const updated = await withRls(auth, async (client) => {
    const o = await one<{ id: string; code: string }>(
      client,
      `update erp.sales_orders set status = 'discount_rejected', updated_at = now() where id = $1 and org_id = $2 returning *`,
      [id, auth.orgId]
    )
    if (!o) throw AppError.notFound('Sales order not found')
    await logAudit(client, auth, {
      action: 'sales_order.reject_discount',
      entityType: 'sales_order',
      entityId: id,
      details: { code: o.code },
    })
    return o
  })

  sendData(res, updated)
})

salesRouter.post('/orders/:id/dispatch', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = req.body || {}

  const updated = await withRls(auth, async (client) => {
    const o = await one<{ id: string; code: string }>(
      client,
      `update erp.sales_orders set status = 'dispatched', updated_at = now() where id = $1 and org_id = $2 returning *`,
      [id, auth.orgId]
    )
    if (!o) throw AppError.notFound('Sales order not found')
    await logAudit(client, auth, {
      action: 'sales_order.dispatch',
      entityType: 'sales_order',
      entityId: id,
      details: { code: o.code, carrier: body.carrierName, tracking: body.trackingNumber },
    })
    return o
  })

  sendData(res, updated, 201)
})

salesRouter.post('/orders/:id/handover-service', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = req.body || {}

  const updated = await withRls(auth, async (client) => {
    const o = await one<{ id: string; code: string }>(
      client,
      `update erp.sales_orders set status = 'service_handover', updated_at = now() where id = $1 and org_id = $2 returning *`,
      [id, auth.orgId]
    )
    if (!o) throw AppError.notFound('Sales order not found')
    await logAudit(client, auth, {
      action: 'sales_order.handover_service',
      entityType: 'sales_order',
      entityId: id,
      details: { code: o.code, category: body.category, serial: body.serialNumber },
    })
    return o
  })

  sendData(res, updated, 201)
})

salesRouter.get('/dispatches', async (req, res) => {
  const auth = req.auth!
  const dispatches = await withRls(auth, async (client) => {
    const orders = await many(
      client,
      `select o.*, c.name as customer_name from erp.sales_orders o
         left join erp.customers c on c.id = o.customer_id
        where o.org_id = $1 and o.status = 'dispatched'
        order by o.updated_at desc limit 50`,
      [auth.orgId]
    )
    return { dispatches: orders, returns: [] }
  }, { readOnly: true })
  sendData(res, dispatches)
})

salesRouter.post('/returns', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'customer_return.create',
      entityType: 'customer_return',
      entityId: body.salesOrderId || auth.orgId,
      details: body,
    })
  })

  sendData(res, { ok: true, message: 'Return recorded successfully' }, 201)
})
