import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, count, audit } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import {
  sendData,
  validateBody,
  validatedBody,
} from '../../http.js'
import { authenticate } from '../../middleware/auth.js'
import { optionalText, optionalUuid, uuidSchema } from '../../lib/validation.js'

export const adminRouter = Router()

adminRouter.use(authenticate)

function assertAdmin(req: any) {
  const auth = req.auth!
  if (!auth.isAdmin && auth.role !== 'admin' && auth.role !== 'system_admin') {
    throw AppError.forbidden('Admin access required')
  }
}

// -----------------------------------------------------------------------------
// Company Profiles
// -----------------------------------------------------------------------------
adminRouter.get('/company-profiles', async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!

  const profiles = await withRls(auth, async (client) => {
    return many(
      client,
      `select * from erp.company_profiles where org_id = $1 order by created_at desc`,
      [auth.orgId]
    )
  }, { readOnly: true })

  sendData(res, profiles)
})

const createProfileSchema = z.object({
  legalName: z.string().min(2).max(200),
  brandName: optionalText(100),
  gstin: optionalText(20),
  pan: optionalText(20),
  cin: optionalText(30),
  registeredAddress: optionalText(500),
  primaryBankName: optionalText(100),
  primaryAccountNo: optionalText(50),
  primaryIfsc: optionalText(20),
  invoicePrefix: z.string().min(1).max(10).default('INV'),
  fyStartMonth: z.number().int().min(1).max(12).default(4),
})

adminRouter.post('/company-profiles', validateBody(createProfileSchema), async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof createProfileSchema>>(req)

  const created = await withRls(auth, async (client) => {
    const profile = await one(
      client,
      `insert into erp.company_profiles (
        org_id, legal_name, brand_name, gstin, pan, cin, registered_address,
        primary_bank_name, primary_account_no, primary_ifsc, invoice_prefix, fy_start_month
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      returning *`,
      [
        auth.orgId,
        body.legalName,
        body.brandName || null,
        body.gstin || null,
        body.pan || null,
        body.cin || null,
        body.registeredAddress || null,
        body.primaryBankName || null,
        body.primaryAccountNo || null,
        body.primaryIfsc || null,
        body.invoicePrefix,
        body.fyStartMonth,
      ]
    )

    await audit(client, 'company_profile.create', 'company_profile', (profile as any).id, `Created company profile ${body.legalName}`)
    return profile
  })

  sendData(res, created, 201)
})

// -----------------------------------------------------------------------------
// Bank Accounts
// -----------------------------------------------------------------------------
adminRouter.get('/bank-accounts', async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!

  const accounts = await withRls(auth, async (client) => {
    return many(
      client,
      `select * from erp.bank_accounts where org_id = $1 order by is_primary desc, created_at desc`,
      [auth.orgId]
    )
  }, { readOnly: true })

  sendData(res, accounts)
})

const createBankAccountSchema = z.object({
  accountName: z.string().min(2).max(100),
  accountNumber: z.string().min(5).max(40),
  ifscCode: z.string().min(4).max(20),
  bankName: z.string().min(2).max(100),
  branch: optionalText(100),
  openingBalance: z.number().default(0),
  isPrimary: z.boolean().default(false),
})

adminRouter.post('/bank-accounts', validateBody(createBankAccountSchema), async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof createBankAccountSchema>>(req)

  const created = await withRls(auth, async (client) => {
    if (body.isPrimary) {
      await client.query(`update erp.bank_accounts set is_primary = false where org_id = $1`, [auth.orgId])
    }

    const bankAcc = await one(
      client,
      `insert into erp.bank_accounts (
        org_id, account_name, account_number, ifsc_code, bank_name, branch,
        opening_balance, current_balance, is_primary
      ) values ($1, $2, $3, $4, $5, $6, $7, $7, $8)
      returning *`,
      [
        auth.orgId,
        body.accountName,
        body.accountNumber,
        body.ifscCode,
        body.bankName,
        body.branch || null,
        body.openingBalance,
        body.isPrimary,
      ]
    )

    await audit(client, 'bank_account.create', 'bank_account', (bankAcc as any).id, `Added bank account ${body.accountName}`)
    return bankAcc
  })

  sendData(res, created, 201)
})

// -----------------------------------------------------------------------------
// Warehouses
// -----------------------------------------------------------------------------
adminRouter.get('/warehouses', async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!

  const warehouses = await withRls(auth, async (client) => {
    return many(
      client,
      `select * from erp.warehouses where org_id = $1 order by code asc`,
      [auth.orgId]
    )
  }, { readOnly: true })

  sendData(res, warehouses)
})

const createWarehouseSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  address: optionalText(300),
  isDefault: z.boolean().default(false),
})

adminRouter.post('/warehouses', validateBody(createWarehouseSchema), async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof createWarehouseSchema>>(req)

  const created = await withRls(auth, async (client) => {
    const wh = await one(
      client,
      `insert into erp.warehouses (
        org_id, code, name, address, is_default
      ) values ($1, $2, $3, $4, $5)
      returning *`,
      [auth.orgId, body.code, body.name, body.address || null, body.isDefault]
    )

    await audit(client, 'warehouse.create', 'warehouse', (wh as any).id, `Created warehouse ${body.code}`)
    return wh
  })

  sendData(res, created, 201)
})

// -----------------------------------------------------------------------------
// Users Management
// -----------------------------------------------------------------------------
adminRouter.get('/users', async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!

  const users = await withRls(auth, async (client) => {
    return many(
      client,
      `select u.id, u.name, u.email, u.employee_code, u.status, u.warehouse_id,
              r.code as role_code, r.name as role_name, w.name as warehouse_name
       from erp.users u
       left join erp.roles r on r.id = u.role_id
       left join erp.warehouses w on w.id = u.warehouse_id
       where u.org_id = $1
       order by u.name asc`,
      [auth.orgId]
    )
  }, { readOnly: true })

  sendData(res, users)
})

const updateUserSchema = z.object({
  warehouseId: optionalUuid,
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
})

adminRouter.patch('/users/:id', validateBody(updateUserSchema), async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const body = validatedBody<z.infer<typeof updateUserSchema>>(req)

  const updated = await withRls(auth, async (client) => {
    const user = await one(
      client,
      `update erp.users
       set warehouse_id = coalesce($1, warehouse_id),
           status = coalesce($2, status),
           updated_at = now()
       where id = $3 and org_id = $4
       returning id, name, email, employee_code, status, warehouse_id`,
      [body.warehouseId || null, body.status || null, id, auth.orgId]
    )
    if (!user) throw AppError.notFound('User not found')

    await audit(client, 'user.update', 'user', id, `Updated user ${id}`)
    return user
  })

  sendData(res, updated)
})

// -----------------------------------------------------------------------------
// Audit Logs
// -----------------------------------------------------------------------------
adminRouter.get('/audit-logs', async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!

  const logs = await withRls(auth, async (client) => {
    return many(
      client,
      `select a.*, u.name as user_name
       from erp.audit_logs a
       left join erp.users u on u.id = a.user_id
       where a.org_id = $1
       order by a.created_at desc limit 100`,
      [auth.orgId]
    )
  }, { readOnly: true })

  sendData(res, logs)
})

// -----------------------------------------------------------------------------
// System Dashboard KPIs
// -----------------------------------------------------------------------------
adminRouter.get('/system-dashboard', async (req, res) => {
  assertAdmin(req)
  const auth = req.auth!

  const dashboard = await withRls(auth, async (client) => {
    const userCount = await count(client, `select count(*) from erp.users where org_id = $1`, [auth.orgId])
    const invoiceSum = await one<{ sum: number }>(
      client,
      `select coalesce(sum(total_amount), 0)::numeric as sum from erp.invoices where org_id = $1`,
      [auth.orgId]
    )
    const paidSum = await one<{ sum: number }>(
      client,
      `select coalesce(sum(amount), 0)::numeric as sum from erp.payments where org_id = $1`,
      [auth.orgId]
    )
    const pendingApprovals = await count(
      client,
      `select count(*) from erp.approval_requests where org_id = $1 and status = 'Pending'`,
      [auth.orgId]
    )

    return {
      activeUsers: userCount,
      totalInvoiced: Number(invoiceSum?.sum || 0),
      totalCollected: Number(paidSum?.sum || 0),
      pendingApprovals,
      systemHealth: 'operational',
      timestamp: new Date().toISOString(),
    }
  }, { readOnly: true })

  sendData(res, dashboard)
})
