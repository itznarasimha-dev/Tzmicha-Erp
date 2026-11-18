import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, count, audit, nextDocNumber } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import { sendData, validateBody, validatedBody } from '../../http.js'
import { authenticate } from '../../middleware/auth.js'
import { optionalText, uuidSchema, dateOnlySchema } from '../../lib/validation.js'
import { storeChargesRouter } from './charges.js'

export const storeRouter = Router()

storeRouter.use(authenticate)
storeRouter.use('/charges', storeChargesRouter)

/**
 * Helper to enforce Store Manager warehouse isolation.
 * Admins can access all warehouses. Store managers with an assigned warehouseId
 * are restricted strictly to orders and GRNs destined for their warehouse.
 */
function verifyWarehouseScoping(auth: any, orderWarehouseId: string | null) {
  if (auth.isAdmin) return
  if (auth.warehouseId && orderWarehouseId && auth.warehouseId !== orderWarehouseId) {
    throw AppError.forbidden('You are only authorized to manage incoming orders for your assigned warehouse')
  }
}

// -----------------------------------------------------------------------------
// 1. Incoming Purchase Orders (Scoped to Store Manager's Assigned Warehouse)
// -----------------------------------------------------------------------------
storeRouter.get('/incoming-orders', async (req, res) => {
  const auth = req.auth!
  const statusFilter = req.query.status ? String(req.query.status) : null

  const orders = await withRls(auth, async (client) => {
    let sql = `
      select 
        po.id,
        po.code as po_number,
        po.status,
        po.order_date,
        po.expected_arrival_date,
        case 
          when po.expected_arrival_date < current_date and po.status not in ('received', 'completed', 'cancelled') 
          then true else false 
        end as is_overdue,
        po.total_amount,
        po.transporter_name,
        po.vehicle_number,
        po.lr_number,
        po.notes,
        po.warehouse_id,
        w.name as warehouse_name,
        w.code as warehouse_code,
        s.id as supplier_id,
        s.name as supplier_name,
        s.gstin as supplier_gstin,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', pol.id,
                'productId', pol.product_id,
                'productName', p.name,
                'productSku', p.sku,
                'orderedQuantity', pol.quantity,
                'receivedQuantity', pol.received_quantity,
                'outstandingQuantity', greatest(0, pol.quantity - pol.received_quantity),
                'unitPrice', pol.unit_price,
                'taxRate', pol.tax_rate
              ) order by pol.created_at asc
            )
            from erp.purchase_order_lines pol
            join erp.products p on p.id = pol.product_id
            where pol.purchase_order_id = po.id
          ),
          '[]'::jsonb
        ) as lines
      from erp.purchase_orders po
      left join erp.warehouses w on w.id = po.warehouse_id
      left join erp.suppliers s on s.id = po.supplier_id
      where po.org_id = $1
    `
    const params: any[] = [auth.orgId]

    // Store manager warehouse scoping
    if (!auth.isAdmin && auth.warehouseId) {
      params.push(auth.warehouseId)
      sql += ` and (po.warehouse_id = $${params.length} or po.warehouse_id is null)`
    }

    if (statusFilter && statusFilter !== 'all') {
      params.push(statusFilter)
      sql += ` and po.status = $${params.length}`
    }

    sql += ` order by po.expected_arrival_date asc nulls last, po.created_at desc limit 100`

    return many(client, sql, params)
  }, { readOnly: true })

  sendData(res, orders)
})

// -----------------------------------------------------------------------------
// 2. Acknowledge Incoming Order
// -----------------------------------------------------------------------------
storeRouter.post('/incoming-orders/:id/acknowledge', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const updated = await withRls(auth, async (client) => {
    const po = await one<any>(
      client,
      `select id, code, status, warehouse_id from erp.purchase_orders where id = $1 and org_id = $2 for update`,
      [id, auth.orgId]
    )
    if (!po) throw AppError.notFound('Purchase Order not found')
    verifyWarehouseScoping(auth, po.warehouse_id)

    if (po.status === 'cancelled') {
      throw AppError.badRequest('Cannot acknowledge a cancelled purchase order')
    }

    const order = await one<any>(
      client,
      `update erp.purchase_orders
       set status = case when status in ('draft', 'sent') then 'acknowledged' else status end,
           acknowledged_at = coalesce(acknowledged_at, now()),
           acknowledged_by = coalesce(acknowledged_by, $1),
           updated_at = now()
       where id = $2 and org_id = $3
       returning *`,
      [auth.userId, id, auth.orgId]
    )

    await audit(
      client,
      'po.acknowledge',
      'purchase_order',
      id,
      `Order ${po.code} acknowledged by store manager ${auth.name}`,
      null,
      { poNumber: po.code, status: order.status }
    )

    return order
  })

  sendData(res, updated)
})

// -----------------------------------------------------------------------------
// 3. Update Expected Arrival Date (ETA) with Mandatory History Log
// -----------------------------------------------------------------------------
const updateEtaSchema = z.object({
  expectedArrivalDate: dateOnlySchema,
  reason: z.string().trim().min(3, 'A clear reason for the ETA change is mandatory'),
})

storeRouter.post('/incoming-orders/:id/update-eta', validateBody(updateEtaSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const { expectedArrivalDate, reason } = validatedBody<z.infer<typeof updateEtaSchema>>(req)

  const result = await withRls(auth, async (client) => {
    const po = await one<any>(
      client,
      `select id, code, expected_arrival_date, warehouse_id from erp.purchase_orders where id = $1 and org_id = $2 for update`,
      [id, auth.orgId]
    )
    if (!po) throw AppError.notFound('Purchase Order not found')
    verifyWarehouseScoping(auth, po.warehouse_id)

    const oldDate = po.expected_arrival_date ? String(po.expected_arrival_date).split('T')[0] : null

    // Insert into ETA history
    await client.query(
      `insert into erp.po_eta_history (
        org_id, purchase_order_id, old_date, new_date, reason, changed_by
      ) values ($1, $2, $3, $4, $5, $6)`,
      [auth.orgId, id, oldDate, expectedArrivalDate, reason, auth.userId]
    )

    // Update PO
    const updated = await one<any>(
      client,
      `update erp.purchase_orders
       set expected_arrival_date = $1, updated_at = now()
       where id = $2 and org_id = $3
       returning id, code, expected_arrival_date, updated_at`,
      [expectedArrivalDate, id, auth.orgId]
    )

    await audit(
      client,
      'po.eta_change',
      'purchase_order',
      id,
      `ETA for ${po.code} updated from ${oldDate || 'N/A'} to ${expectedArrivalDate}: ${reason}`,
      null,
      { oldDate, newDate: expectedArrivalDate, reason }
    )

    return { ...updated, oldDate, reason }
  })

  sendData(res, result)
})

// -----------------------------------------------------------------------------
// 4. Goods Receipt Note (GRN) Creation & Stock Movements
// -----------------------------------------------------------------------------
const grnLineSchema = z.object({
  poLineId: uuidSchema,
  productId: uuidSchema,
  orderedQuantity: z.number().nonnegative(),
  receivedQuantity: z.number().nonnegative(),
  acceptedQuantity: z.number().nonnegative(),
  shortageQuantity: z.number().nonnegative().default(0),
  damagedQuantity: z.number().nonnegative().default(0),
  excessQuantity: z.number().nonnegative().default(0),
  batchNumber: optionalText(),
  expiryDate: z.string().optional(),
  storageLocation: optionalText(),
  unitCost: z.number().nonnegative().default(0),
})

const createGrnSchema = z.object({
  deliveryChallanNumber: optionalText(),
  transporterName: optionalText(),
  vehicleNumber: optionalText(),
  lrNumber: optionalText(),
  notes: optionalText(),
  lines: z.array(grnLineSchema).min(1, 'At least one line item is required for goods receipt'),
})

storeRouter.post('/incoming-orders/:id/grn', validateBody(createGrnSchema), async (req, res) => {
  const auth = req.auth!
  const poId = uuidSchema.parse(req.params.id)
  const body = validatedBody<z.infer<typeof createGrnSchema>>(req)

  const result = await withRls(auth, async (client) => {
    // 1. Fetch & lock PO
    const po = await one<any>(
      client,
      `select id, code, warehouse_id, status from erp.purchase_orders where id = $1 and org_id = $2 for update`,
      [poId, auth.orgId]
    )
    if (!po) throw AppError.notFound('Purchase Order not found')
    verifyWarehouseScoping(auth, po.warehouse_id)

    if (po.status === 'received' || po.status === 'completed') {
      throw AppError.badRequest('This purchase order has already been fully received')
    }

    const warehouseId = po.warehouse_id || auth.warehouseId
    if (!warehouseId) {
      throw AppError.badRequest('Destination warehouse is required before receiving goods')
    }

    // 2. Generate GRN code
    const grnNumber = await nextDocNumber(client, auth.orgId, 'grn')

    // 3. Create GRN Header
    const grn = await one<any>(
      client,
      `insert into erp.goods_receipt_notes (
        org_id, grn_number, purchase_order_id, warehouse_id,
        supplier_delivery_ref, transporter_name, vehicle_number, lr_number,
        received_by, notes, status
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'verified')
      returning *`,
      [
        auth.orgId,
        grnNumber,
        poId,
        warehouseId,
        body.deliveryChallanNumber || null,
        body.transporterName || null,
        body.vehicleNumber || null,
        body.lrNumber || null,
        auth.userId,
        body.notes || null,
      ]
    )

    let totalAccepted = 0
    let totalDiscrepancies = 0

    // 4. Process each received line
    for (const line of body.lines) {
      const accepted = Number(line.acceptedQuantity || 0)
      const shortage = Number(line.shortageQuantity || 0)
      const damaged = Number(line.damagedQuantity || 0)
      const excess = Number(line.excessQuantity || 0)

      // Post immutable stock movement for accepted physical items
      let stockMovementId: string | null = null
      if (accepted > 0) {
        const sm = await one<{ id: string }>(
          client,
          `insert into erp.stock_movements (
            org_id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by
          ) values ($1, $2, $3, 'inward', $4, 'grn', $5, $6)
          returning id`,
          [auth.orgId, line.productId, warehouseId, accepted, grn.id, auth.userId]
        )
        stockMovementId = sm?.id || null
        totalAccepted += accepted
      }

      // Record GRN Line
      await client.query(
        `insert into erp.goods_receipt_lines (
          org_id, grn_id, po_line_id, product_id, ordered_quantity, received_quantity,
          accepted_quantity, shortage_quantity, damaged_quantity, excess_quantity,
          batch_number, expiry_date, storage_location, unit_cost, stock_movement_id
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::date, $13, $14, $15)`,
        [
          auth.orgId,
          grn.id,
          line.poLineId,
          line.productId,
          line.orderedQuantity,
          line.receivedQuantity,
          accepted,
          shortage,
          damaged,
          excess,
          line.batchNumber || null,
          line.expiryDate || null,
          line.storageLocation || null,
          line.unitCost || 0,
          stockMovementId,
        ]
      )

      // Update PO line received quantity
      if (accepted > 0) {
        await client.query(
          `update erp.purchase_order_lines
           set received_quantity = received_quantity + $1
           where id = $2 and purchase_order_id = $3 and org_id = $4`,
          [accepted, line.poLineId, poId, auth.orgId]
        )
      }

      // Record Discrepancy if shortage or damage occurred
      if (shortage > 0 || damaged > 0 || excess > 0) {
        const discType = shortage > 0 ? 'shortage' : damaged > 0 ? 'damaged' : 'excess'
        const varianceQty = shortage > 0 ? shortage : damaged > 0 ? damaged : excess
        const discNumber = await nextDocNumber(client, auth.orgId, 'discrepancy')

        await client.query(
          `insert into erp.receiving_discrepancies (
            org_id, discrepancy_number, grn_id, purchase_order_id, product_id,
            discrepancy_type, variance_quantity, financial_value, status, reported_by, notes
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_review', $9, $10)`,
          [
            auth.orgId,
            discNumber,
            grn.id,
            poId,
            line.productId,
            discType,
            varianceQty,
            varianceQty * line.unitCost,
            auth.userId,
            `GRN ${grnNumber} - ${discType.toUpperCase()} of ${varianceQty} units`,
          ]
        )
        totalDiscrepancies++
      }
    }

    // 5. Update PO Status
    const poLines = await many<any>(
      client,
      `select quantity, received_quantity from erp.purchase_order_lines where purchase_order_id = $1 and org_id = $2`,
      [poId, auth.orgId]
    )

    const isFullyReceived = poLines.every((l) => Number(l.received_quantity) >= Number(l.quantity))
    const newStatus = isFullyReceived ? 'received' : 'partially_received'

    await client.query(
      `update erp.purchase_orders
       set status = $1, updated_at = now()
       where id = $2 and org_id = $3`,
      [newStatus, poId, auth.orgId]
    )

    await audit(
      client,
      'grn.create',
      'goods_receipt_note',
      grn.id,
      `GRN ${grnNumber} recorded for PO ${po.code} (${totalAccepted} units accepted, status ${newStatus})`,
      null,
      { grnNumber, poCode: po.code, newStatus, totalAccepted, totalDiscrepancies }
    )

    return {
      grnId: grn.id,
      grnNumber,
      poStatus: newStatus,
      totalAccepted,
      discrepanciesFlagged: totalDiscrepancies,
    }
  })

  sendData(res, result, 201)
})

// -----------------------------------------------------------------------------
// 5. Receiving Discrepancies Register
// -----------------------------------------------------------------------------
storeRouter.get('/discrepancies', async (req, res) => {
  const auth = req.auth!

  const discrepancies = await withRls(auth, async (client) => {
    let sql = `
      select 
        d.*,
        p.name as product_name,
        p.sku as product_sku,
        po.code as po_number,
        grn.grn_number,
        s.name as supplier_name
      from erp.receiving_discrepancies d
      join erp.products p on p.id = d.product_id
      join erp.purchase_orders po on po.id = d.purchase_order_id
      join erp.goods_receipt_notes grn on grn.id = d.grn_id
      left join erp.suppliers s on s.id = po.supplier_id
      where d.org_id = $1
    `
    const params: any[] = [auth.orgId]

    if (!auth.isAdmin && auth.warehouseId) {
      params.push(auth.warehouseId)
      sql += ` and grn.warehouse_id = $${params.length}`
    }

    sql += ` order by d.created_at desc limit 100`
    return many(client, sql, params)
  }, { readOnly: true })

  sendData(res, discrepancies)
})

// -----------------------------------------------------------------------------
// 6. 3-Way Matching Calculation (PO vs GRN vs Supplier Bill)
// -----------------------------------------------------------------------------
storeRouter.get('/3-way-match/:id', async (req, res) => {
  const auth = req.auth!
  const poId = uuidSchema.parse(req.params.id)

  const matchData = await withRls(auth, async (client) => {
    const po = await one<any>(
      client,
      `select id, code, total_amount, status, billed_amount from erp.purchase_orders where id = $1 and org_id = $2`,
      [poId, auth.orgId]
    )
    if (!po) throw AppError.notFound('Purchase Order not found')

    const lines = await many<any>(
      client,
      `select 
         pol.id,
         p.name as product_name,
         p.sku as product_sku,
         pol.quantity as ordered_qty,
         pol.received_quantity as received_qty,
         pol.unit_price,
         (pol.quantity * pol.unit_price) as po_value,
         (pol.received_quantity * pol.unit_price) as received_value
       from erp.purchase_order_lines pol
       join erp.products p on p.id = pol.product_id
       where pol.purchase_order_id = $1 and pol.org_id = $2`,
      [poId, auth.orgId]
    )

    const totalOrderedQty = lines.reduce((acc, l) => acc + Number(l.ordered_qty), 0)
    const totalReceivedQty = lines.reduce((acc, l) => acc + Number(l.received_qty), 0)
    const totalPoValue = lines.reduce((acc, l) => acc + Number(l.po_value), 0)
    const totalReceivedValue = lines.reduce((acc, l) => acc + Number(l.received_value), 0)

    let matchStatus = 'matched'
    if (totalReceivedQty === 0) matchStatus = 'unmatched'
    else if (totalReceivedQty < totalOrderedQty) matchStatus = 'partially_matched'
    else if (Number(po.billed_amount) > totalReceivedValue) matchStatus = 'price_variance'

    return {
      poNumber: po.code,
      poStatus: po.status,
      matchStatus,
      summary: {
        totalOrderedQty,
        totalReceivedQty,
        totalPoValue,
        totalReceivedValue,
        billedAmount: Number(po.billed_amount || 0),
        varianceAmount: Math.abs(totalReceivedValue - Number(po.billed_amount || 0)),
      },
      lines,
    }
  }, { readOnly: true })

  sendData(res, matchData)
})
