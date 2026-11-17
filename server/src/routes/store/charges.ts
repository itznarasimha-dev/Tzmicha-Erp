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

export const storeChargesRouter = Router()

storeChargesRouter.use(authenticate)

const submitChargeSchema = z.object({
  warehouseId: optionalUuid,
  chargeCategory: z.enum([
    'freight',
    'loading_unloading',
    'manpower',
    'packaging',
    'customs_insurance',
    'product_cost',
    'storage',
    'other',
  ]),
  referenceType: z.enum(['po', 'grn', 'dispatch', 'transfer', 'general']),
  referenceId: optionalUuid,
  vendorName: optionalText(150),
  amount: z.number().positive(),
  taxAmount: z.number().nonnegative().optional().default(0),
  attachmentUrl: optionalText(500),
  remarks: optionalText(500),
})

// -----------------------------------------------------------------------------
// GET /api/store/charges - Store Manager Views Warehouse Charges
// -----------------------------------------------------------------------------
storeChargesRouter.get('/', async (req, res) => {
  const auth = req.auth!
  const targetWarehouse = auth.warehouseId || (req.query.warehouseId ? String(req.query.warehouseId) : null)

  const charges = await withRls(auth, async (client) => {
    let sql = `
      select c.*, w.name as warehouse_name, u.name as created_by_name
      from erp.store_charges c
      join erp.warehouses w on w.id = c.warehouse_id
      left join erp.users u on u.id = c.created_by
      where c.org_id = $1
    `
    const params: any[] = [auth.orgId]
    if (targetWarehouse && !auth.isAdmin) {
      params.push(targetWarehouse)
      sql += ` and c.warehouse_id = $${params.length}`
    }
    sql += ` order by c.created_at desc limit 100`
    return many(client, sql, params)
  }, { readOnly: true })

  // Note: Landed cost details are never exposed here!
  sendData(res, charges)
})

// -----------------------------------------------------------------------------
// POST /api/store/charges - Store Manager Submits Firm Charge
// -----------------------------------------------------------------------------
storeChargesRouter.post('/', validateBody(submitChargeSchema), async (req, res) => {
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof submitChargeSchema>>(req)

  const warehouseId = auth.warehouseId || body.warehouseId
  if (!warehouseId) {
    throw AppError.badRequest('Warehouse ID is required for charge submission')
  }

  // If store manager is restricted to a warehouse, enforce it
  if (auth.warehouseId && body.warehouseId && auth.warehouseId !== body.warehouseId) {
    throw AppError.forbidden('Cannot submit charges for a different warehouse')
  }

  const result = await withRls(auth, async (client) => {
    const docNum = await nextDocNumber(client, auth.orgId, 'store_charge')
    const totalAmount = Number((body.amount + (body.taxAmount || 0)).toFixed(2))

    const charge = await one(
      client,
      `insert into erp.store_charges (
        org_id, charge_number, warehouse_id, charge_category, reference_type,
        reference_id, vendor_name, amount, tax_amount, total_amount, attachment_url,
        remarks, status, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'submitted', $13)
      returning *`,
      [
        auth.orgId,
        docNum,
        warehouseId,
        body.chargeCategory,
        body.referenceType,
        body.referenceId || null,
        body.vendorName || null,
        body.amount,
        body.taxAmount || 0,
        totalAmount,
        body.attachmentUrl || null,
        body.remarks || null,
        auth.userId,
      ]
    )

    await audit(
      client,
      'store_charge.submit',
      'store_charge',
      (charge as any).id,
      `Submitted store charge ${docNum} for ₹${totalAmount}`,
      null,
      { category: body.chargeCategory, totalAmount, warehouseId }
    )

    return charge
  })

  sendData(res, result, 201)
})
