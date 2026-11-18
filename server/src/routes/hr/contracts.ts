import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { withRls, one, many, count, audit, nextDocNumber } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import {
  paginated,
  parsePagination,
  parseSort,
  sendData,
  validateBody,
  validateQuery,
  validatedBody,
  validatedQuery,
} from '../../http.js'
import { requirePermission } from '../../middleware/auth.js'
import { mapContract, mapPayment, num } from '../../mappers/hr.js'
import { createFilter } from '../../lib/sql.js'
import { dateOnlySchema, optionalText, optionalUuid, uuidSchema } from '../../lib/validation.js'
import { findReplay, readIdempotencyKey } from '../../lib/idempotency.js'
import { cancelPendingApprovals, decideEntityApproval, raiseApproval } from '../../lib/approvals.js'

export const contractsRouter = Router()

const CONTRACT_FROM = `
  from erp.hr_contracts c
  left join erp.hr_employees e on e.id = c.employee_id
  left join erp.departments d on d.id = c.department_id
`

const CONTRACT_SELECT = `
  c.*, d.name as department_name,
  case when e.id is null then null else e.first_name || ' ' || e.last_name end as employee_name
  ${CONTRACT_FROM}
`

const contractQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .enum([
      'Draft',
      'Pending Review',
      'Pending Signature',
      'Active',
      'Expiring Soon',
      'Expired',
      'Renewed',
      'Terminated',
    ])
    .optional(),
  partyType: z.enum(['Employee', 'Contractor', 'Vendor']).optional(),
  employeeId: optionalUuid,
  expiringWithinDays: z.coerce.number().int().min(1).max(365).optional(),
  sort: z.enum(['createdAt:asc', 'createdAt:desc', 'endDate:asc', 'endDate:desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

contractsRouter.get('/contracts', requirePermission('hr.contract.read'), validateQuery(contractQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof contractQuery>>(req)
  const pagination = parsePagination(query)
  const sort = parseSort(query.sort, { createdAt: 'c.created_at', endDate: 'c.end_date' }, 'createdAt')

  const result = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('c.status', query.status)
    filter.equal('c.party_type', query.partyType)
    filter.equal('c.employee_id', query.employeeId)
    filter.search(['c.title', 'c.party_name', 'c.code'], query.q)
    if (query.expiringWithinDays) {
      filter.raw(`c.end_date between current_date and current_date + ${Number(query.expiringWithinDays)}`)
    }

    const total = await count(client, `select count(*)::text as total ${CONTRACT_FROM} ${filter.where}`, filter.params)
    const limit = filter.param(pagination.pageSize)
    const offset = filter.param(pagination.offset)
    const rows = await many(
      client,
      `select ${CONTRACT_SELECT} ${filter.where}
        order by ${sort.clause} nulls last, c.id
        limit ${limit} offset ${offset}`,
      filter.params,
    )
    return paginated(rows.map(mapContract), total, pagination)
  }, { readOnly: true })

  res.json(result)
})

contractsRouter.get('/contracts/:id', requirePermission('hr.contract.read'), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(auth, async (client) => {
    const contract = await one(client, `select ${CONTRACT_SELECT} where c.id = $1`, [id])
    if (!contract) throw AppError.notFound('Contract not found')

    const [signatures, schedule, documents, approvals] = await Promise.all([
      many(client, 'select * from erp.hr_contract_signatures where contract_id = $1 order by created_at', [id]),
      many(client, 'select * from erp.hr_contract_payments where contract_id = $1 order by due_date', [id]),
      many(client, 'select * from erp.hr_contract_documents where contract_id = $1 order by created_at desc', [id]),
      many(
        client,
        `select g.* from erp.approval_history g
           join erp.approval_requests r on r.id = g.approval_request_id
          where r.entity_type = 'hr_contract' and r.entity_id = $1
          order by g.created_at desc limit 50`,
        [id],
      ),
    ])

    return {
      ...mapContract(contract),
      signatures: signatures.map((row) => ({
        id: row.id,
        name: row.signer_name,
        role: row.signer_role,
        status: row.status,
        signedAt: row.signed_at,
      })),
      paymentSchedule: schedule.map((row) => ({
        id: row.id,
        dueDate: row.due_date,
        amount: num(row.amount),
        status: row.status,
      })),
      documents: documents.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.mime_type ?? 'file',
        size: num(row.size_bytes),
        uploadedAt: row.created_at,
        status: row.status,
        storagePath: row.storage_path,
      })),
      history: approvals.map((row) => ({
        id: row.id,
        date: row.created_at,
        action: row.action,
        actor: row.actor_name ?? '',
      })),
    }
  }, { readOnly: true })

  sendData(res, payload)
})

const contractCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  partyType: z.enum(['Employee', 'Contractor', 'Vendor']).default('Employee'),
  employeeId: optionalUuid,
  partyName: z.string().trim().min(1).max(200),
  departmentId: optionalUuid,
  contractType: z.string().trim().max(80).default('Employment'),
  startDate: dateOnlySchema,
  endDate: dateOnlySchema,
  value: z.coerce.number().min(0).default(0),
  currency: z.string().trim().length(3).default('INR'),
  paymentFrequency: z.enum(['Monthly', 'Quarterly', 'Annual', 'Milestone', 'One-time']).default('Monthly'),
  notes: optionalText(2000),
})

contractsRouter.post(
  '/contracts',
  requirePermission('hr.contract.write'),
  validateBody(contractCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof contractCreateSchema>>(req)
    if (input.endDate < input.startDate) throw AppError.badRequest('endDate must be on or after startDate')
    if (input.employeeId && input.partyType !== 'Employee') {
      throw AppError.badRequest('employeeId is only valid when partyType is Employee')
    }

    const contract = await withRls(auth, async (client) => {
      const code = await nextDocNumber(client, auth.orgId, 'contract')
      const row = await one(
        client,
        `insert into erp.hr_contracts
           (org_id, code, title, party_type, employee_id, party_name, department_id,
            contract_type, start_date, end_date, value, currency, payment_frequency,
            status, notes, created_by)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 'Draft', $13, erp.current_user_id())
         returning id`,
        [
          code,
          input.title,
          input.partyType,
          input.employeeId ?? null,
          input.partyName,
          input.departmentId ?? null,
          input.contractType,
          input.startDate,
          input.endDate,
          input.value,
          input.currency.toUpperCase(),
          input.paymentFrequency,
          input.notes ?? null,
        ],
      )
      await audit(client, 'hr.contract.created', 'hr_contracts', row!.id, `${code} ${input.title}`)
      const full = await one(client, `select ${CONTRACT_SELECT} where c.id = $1`, [row!.id])
      return mapContract(full!)
    })

    sendData(res, contract, 201)
  },
)

const contractUpdateSchema = contractCreateSchema.partial().extend({
  terminatedReason: optionalText(1000),
})

contractsRouter.patch(
  '/contracts/:id',
  requirePermission('hr.contract.write'),
  validateBody(contractUpdateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof contractUpdateSchema>>(req)

    const contract = await withRls(auth, async (client) => {
      const current = await one<{ status: string; start_date: string; end_date: string }>(
        client,
        'select status, start_date, end_date from erp.hr_contracts where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Contract not found')
      if (['Expired', 'Terminated'].includes(current.status)) {
        throw AppError.conflict('An expired or terminated contract cannot be edited')
      }

      const start = input.startDate ?? String(current.start_date).slice(0, 10)
      const end = input.endDate ?? String(current.end_date).slice(0, 10)
      if (end < start) throw AppError.badRequest('endDate must be on or after startDate')

      const updates: string[] = []
      const values: unknown[] = []
      let index = 1
      const set = (column: string, value: unknown) => {
        if (value === undefined) return
        updates.push(`${column} = $${index++}`)
        values.push(value)
      }
      set('title', input.title)
      set('party_type', input.partyType)
      set('employee_id', input.employeeId)
      set('party_name', input.partyName)
      set('department_id', input.departmentId)
      set('contract_type', input.contractType)
      set('start_date', input.startDate)
      set('end_date', input.endDate)
      set('value', input.value)
      set('currency', input.currency?.toUpperCase())
      set('payment_frequency', input.paymentFrequency)
      set('notes', input.notes)
      set('terminated_reason', input.terminatedReason)

      if (updates.length === 0) throw AppError.badRequest('No fields supplied')
      values.push(id)
      await client.query(
        `update erp.hr_contracts set ${updates.join(', ')}, updated_at = now() where id = $${index}`,
        values,
      )
      await audit(client, 'hr.contract.updated', 'hr_contracts', id, null)

      const full = await one(client, `select ${CONTRACT_SELECT} where c.id = $1`, [id])
      return mapContract(full!)
    })

    sendData(res, contract)
  },
)

const statusTransitions: Record<string, { from: string[]; to: string; permission: string }> = {
  submit: { from: ['Draft'], to: 'Pending Review', permission: 'hr.contract.write' },
  request_signature: { from: ['Pending Review'], to: 'Pending Signature', permission: 'hr.contract.write' },
  activate: { from: ['Pending Signature'], to: 'Active', permission: 'hr.contract.write' },
  renew: { from: ['Active', 'Expiring Soon', 'Expired'], to: 'Renewed', permission: 'hr.contract.write' },
  terminate: { from: ['Active', 'Expiring Soon', 'Pending Signature'], to: 'Terminated', permission: 'hr.contract.write' },
}

contractsRouter.post(
  '/contracts/:id/status',
  requirePermission('hr.contract.write'),
  validateBody(
    z.object({
      action: z.enum(['submit', 'request_signature', 'activate', 'renew', 'terminate']),
      reason: optionalText(1000),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ action: keyof typeof statusTransitions; reason?: string }>(req)
    const transition = statusTransitions[input.action]
    if (!transition) throw AppError.badRequest('Unknown contract action')
    if (input.action === 'terminate' && !input.reason) {
      throw AppError.badRequest('A termination reason is required')
    }

    const contract = await withRls(auth, async (client) => {
      const current = await one<{ status: string; title: string; value: string }>(
        client,
        'select status, title, value from erp.hr_contracts where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Contract not found')
      if (!transition.from.includes(current.status)) {
        throw AppError.conflict(`Cannot ${input.action} a contract that is ${current.status}`)
      }

      await client.query(
        `update erp.hr_contracts
            set status = $2, terminated_reason = $3, updated_at = now()
          where id = $1`,
        [id, transition.to, input.reason ?? null],
      )

      if (input.action === 'submit') {
        await raiseApproval(client, {
          entityType: 'hr_contract',
          entityId: id,
          title: `Contract ${current.title}`,
          stage: 'manager',
          assignedRole: 'hr.contract.write',
          amount: num(current.value),
        })
      }
      if (input.action === 'terminate') {
        await cancelPendingApprovals(client, 'hr_contract', id, 'Contract terminated')
      }

      await audit(client, `hr.contract.${input.action}`, 'hr_contracts', id, input.reason ?? transition.to)
      const full = await one(client, `select ${CONTRACT_SELECT} where c.id = $1`, [id])
      return mapContract(full!)
    })

    sendData(res, contract)
  },
)

contractsRouter.post(
  '/contracts/:id/signatures',
  requirePermission('hr.contract.write'),
  validateBody(
    z.object({
      name: z.string().trim().min(1).max(160),
      role: z.string().trim().min(1).max(80),
      signaturePath: optionalText(500),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ name: string; role: string; signaturePath?: string }>(req)

    const signature = await withRls(auth, async (client) => {
      const exists = await one(client, 'select 1 from erp.hr_contracts where id = $1', [id])
      if (!exists) throw AppError.notFound('Contract not found')

      const row = await one(
        client,
        `insert into erp.hr_contract_signatures
           (org_id, contract_id, signer_name, signer_role, status, signed_at, signature_path)
         values (erp.current_org_id(), $1, $2, $3,
                 case when $4::text is null then 'Pending' else 'Signed' end,
                 case when $4::text is null then null else now() end, $4)
         returning *`,
        [id, input.name, input.role, input.signaturePath ?? null],
      )
      await audit(client, 'hr.contract.signature_added', 'hr_contract_signatures', row!.id, input.name)
      return row!
    })

    sendData(
      res,
      {
        id: signature.id,
        name: signature.signer_name,
        role: signature.signer_role,
        status: signature.status,
        signedAt: signature.signed_at,
      },
      201,
    )
  },
)

contractsRouter.post(
  '/contracts/:id/payments',
  requirePermission('hr.contract.write', 'hr.payment.create'),
  validateBody(
    z.object({
      dueDate: dateOnlySchema,
      amount: z.coerce.number().positive(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ dueDate: string; amount: number }>(req)

    const row = await withRls(auth, async (client) => {
      const contract = await one<{ value: string }>(
        client,
        'select value from erp.hr_contracts where id = $1',
        [id],
      )
      if (!contract) throw AppError.notFound('Contract not found')

      const scheduled = await one<{ total: string }>(
        client,
        `select coalesce(sum(amount),0)::text as total
           from erp.hr_contract_payments
          where contract_id = $1 and status <> 'Cancelled'`,
        [id],
      )
      if (num(scheduled?.total) + input.amount > num(contract.value)) {
        throw AppError.unprocessable('Scheduled payments would exceed the contract value')
      }

      const created = await one(
        client,
        `insert into erp.hr_contract_payments (org_id, contract_id, due_date, amount)
         values (erp.current_org_id(), $1, $2, $3)
         returning *`,
        [id, input.dueDate, input.amount],
      )
      await audit(client, 'hr.contract.payment_scheduled', 'hr_contract_payments', created!.id, `Amount ${input.amount}`)
      return created!
    })

    sendData(res, { id: row.id, dueDate: row.due_date, amount: num(row.amount), status: row.status }, 201)
  },
)

contractsRouter.post(
  '/contract-payments/:id/mark-paid',
  requirePermission('hr.payment.create', 'hr.contract.write'),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)

    const row = await withRls(auth, async (client) => {
      const updated = await one(
        client,
        `update erp.hr_contract_payments
            set status = 'Paid', paid_at = now(), updated_at = now()
          where id = $1 and status in ('Scheduled','Overdue')
          returning *`,
        [id],
      )
      if (!updated) throw AppError.conflict('Payment is not in a payable state')
      await audit(client, 'hr.contract.payment_paid', 'hr_contract_payments', id, null)
      return updated
    })

    sendData(res, { id: row.id, dueDate: row.due_date, amount: num(row.amount), status: row.status })
  },
)

// ---------------------------------------------------------------------------
// Daily payments
// ---------------------------------------------------------------------------
const PAYMENT_FROM = `
  from erp.hr_daily_payments p
  left join erp.users a on a.id = p.approved_by
`

const PAYMENT_SELECT = `
  p.*, a.name as approved_by_name
  ${PAYMENT_FROM}
`

const paymentQuery = z.object({
  q: z.string().trim().max(120).optional(),
  approvalStatus: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  paymentStatus: z.enum(['Pending', 'Processing', 'Paid', 'Failed', 'Overdue']).optional(),
  employeeId: optionalUuid,
  partyType: z.enum(['Employee', 'Contractor', 'Vendor']).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  sort: z.enum(['date:asc', 'date:desc', 'amount:asc', 'amount:desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

contractsRouter.get('/payments', requirePermission('hr.payment.read'), validateQuery(paymentQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof paymentQuery>>(req)
  const pagination = parsePagination(query)
  const sort = parseSort(
    query.sort,
    { date: 'p.payment_date', amount: 'p.amount' },
    'date',
  )

  const result = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('p.approval_status', query.approvalStatus)
    filter.equal('p.payment_status', query.paymentStatus)
    filter.equal('p.employee_id', query.employeeId)
    filter.equal('p.party_type', query.partyType)
    filter.gte('p.payment_date', query.from)
    filter.lte('p.payment_date', query.to)
    filter.search(['p.payee', 'p.code', 'p.description'], query.q)

    const total = await count(client, `select count(*)::text as total ${PAYMENT_FROM} ${filter.where}`, filter.params)
    const limit = filter.param(pagination.pageSize)
    const offset = filter.param(pagination.offset)
    const rows = await many(
      client,
      `select ${PAYMENT_SELECT} ${filter.where}
        order by ${sort.clause} nulls last, p.id
        limit ${limit} offset ${offset}`,
      filter.params,
    )
    return paginated(rows.map(mapPayment), total, pagination)
  }, { readOnly: true })

  res.json(result)
})

const paymentCreateSchema = z.object({
  payee: z.string().trim().min(1).max(200),
  partyType: z.enum(['Employee', 'Contractor', 'Vendor']).default('Employee'),
  employeeId: optionalUuid,
  contractId: optionalUuid,
  paymentDate: dateOnlySchema,
  dueDate: dateOnlySchema.optional(),
  category: z.string().trim().min(1).max(80).default('Salary'),
  amount: z.coerce.number().positive(),
  currency: z.string().trim().length(3).default('INR'),
  method: z.enum(['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Card']).default('Bank Transfer'),
  description: optionalText(1000),
})

contractsRouter.post(
  '/payments',
  requirePermission('hr.payment.create'),
  validateBody(paymentCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof paymentCreateSchema>>(req)
    const idempotencyKey = readIdempotencyKey(req.header('idempotency-key'))

    const result = await withRls(auth, async (client) => {
      const replay = await findReplay<{ id: string }>(
        client,
        'erp.hr_daily_payments',
        'id',
        auth.orgId,
        idempotencyKey,
      )
      if (replay) {
        const row = await one(client, `select ${PAYMENT_SELECT} where p.id = $1`, [replay.id])
        return { payment: mapPayment(row!), replayed: true }
      }

      const code = await nextDocNumber(client, auth.orgId, 'hr_payment')
      const row = await one<{ id: string }>(
        client,
        `insert into erp.hr_daily_payments
           (org_id, code, payee, party_type, employee_id, contract_id, payment_date, due_date,
            category, amount, currency, method, approval_status, payment_status, description,
            idempotency_key, created_by)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                 'Pending', 'Pending', $12, $13, erp.current_user_id())
         returning id`,
        [
          code,
          input.payee,
          input.partyType,
          input.employeeId ?? null,
          input.contractId ?? null,
          input.paymentDate,
          input.dueDate ?? null,
          input.category,
          input.amount,
          input.currency.toUpperCase(),
          input.method,
          input.description ?? null,
          idempotencyKey,
        ],
      )

      await client.query(
        `insert into erp.hr_payment_history (org_id, payment_id, action, actor_user_id, note)
         values (erp.current_org_id(), $1, 'created', erp.current_user_id(), $2)`,
        [row!.id, `Scheduled ${code}`],
      )
      await raiseApproval(client, {
        entityType: 'hr_payment',
        entityId: row!.id,
        title: `${input.category} payment to ${input.payee}`,
        stage: 'finance',
        assignedRole: 'finance.payment.approve',
        amount: input.amount,
      })
      await audit(client, 'hr.payment.created', 'hr_daily_payments', row!.id, `${code} ${input.amount}`)

      const full = await one(client, `select ${PAYMENT_SELECT} where p.id = $1`, [row!.id])
      return { payment: mapPayment(full!), replayed: false }
    })

    sendData(res, result, result.replayed ? 200 : 201)
  },
)

const decidePaymentSchema = z.object({
  remarks: optionalText(1000),
})

async function decidePayment(req: Request, res: Response, decision: 'Approved' | 'Rejected') {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<{ remarks?: string }>(req)
  if (decision === 'Rejected' && !input.remarks) {
    throw AppError.badRequest('A remark is required when rejecting a payment')
  }

  const payment = await withRls(auth, async (client) => {
    const current = await one<{ approval_status: string; code: string; amount: string }>(
      client,
      'select approval_status, code, amount from erp.hr_daily_payments where id = $1 for update',
      [id],
    )
    if (!current) throw AppError.notFound('Payment not found')
    if (current.approval_status !== 'Pending') {
      throw AppError.conflict(`Payment was already ${current.approval_status.toLowerCase()}`)
    }

    await decideEntityApproval(client, 'hr_payment', id, decision, input.remarks ?? null)

    await client.query(
      `update erp.hr_daily_payments
          set approval_status = $2, approved_by = erp.current_user_id(), approved_at = now(),
              remarks = $3, updated_at = now()
        where id = $1`,
      [id, decision, input.remarks ?? null],
    )
    await client.query(
      `insert into erp.hr_payment_history (org_id, payment_id, action, actor_user_id, note)
       values (erp.current_org_id(), $1, $2, erp.current_user_id(), $3)`,
      [id, decision.toLowerCase(), input.remarks ?? null],
    )
    await audit(client, `hr.payment.${decision.toLowerCase()}`, 'hr_daily_payments', id, input.remarks ?? decision)

    const row = await one(client, `select ${PAYMENT_SELECT} where p.id = $1`, [id])
    return mapPayment(row!)
  })

  sendData(res, payment)
}

contractsRouter.post(
  '/payments/:id/approve',
  requirePermission('hr.payment.create', 'finance.payment.approve'),
  validateBody(decidePaymentSchema),
  (req, res) => decidePayment(req, res, 'Approved'),
)

contractsRouter.post(
  '/payments/:id/reject',
  requirePermission('hr.payment.create', 'finance.payment.approve'),
  validateBody(decidePaymentSchema),
  (req, res) => decidePayment(req, res, 'Rejected'),
)

contractsRouter.post(
  '/payments/:id/status',
  requirePermission('hr.payment.create', 'finance.payment.approve'),
  validateBody(
    z.object({
      paymentStatus: z.enum(['Processing', 'Paid', 'Failed', 'Overdue']),
      remarks: optionalText(1000),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ paymentStatus: string; remarks?: string }>(req)

    const payment = await withRls(auth, async (client) => {
      const current = await one<{ approval_status: string; payment_status: string }>(
        client,
        'select approval_status, payment_status from erp.hr_daily_payments where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Payment not found')
      if (current.approval_status !== 'Approved') {
        throw AppError.conflict('Only approved payments can change payment status')
      }
      if (current.payment_status === 'Paid') {
        throw AppError.conflict('Payment is already marked paid')
      }

      await client.query(
        `update erp.hr_daily_payments
            set payment_status = $2, remarks = coalesce($3, remarks), updated_at = now()
          where id = $1`,
        [id, input.paymentStatus, input.remarks ?? null],
      )
      await client.query(
        `insert into erp.hr_payment_history (org_id, payment_id, action, actor_user_id, note)
         values (erp.current_org_id(), $1, $2, erp.current_user_id(), $3)`,
        [id, `status:${input.paymentStatus}`, input.remarks ?? null],
      )
      await audit(client, 'hr.payment.status_changed', 'hr_daily_payments', id, input.paymentStatus)

      const row = await one(client, `select ${PAYMENT_SELECT} where p.id = $1`, [id])
      return mapPayment(row!)
    })

    sendData(res, payment)
  },
)

contractsRouter.get('/payments/:id/history', requirePermission('hr.payment.read'), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(
    auth,
    async (client) => {
      const payment = await one(client, `select ${PAYMENT_SELECT} where p.id = $1`, [id])
      if (!payment) throw AppError.notFound('Payment not found')

      const rows = await many(
        client,
        `select h.*, u.name as actor_name
           from erp.hr_payment_history h
           left join erp.users u on u.id = h.actor_user_id
          where h.payment_id = $1
          order by h.created_at desc`,
        [id],
      )

      return {
        payment: mapPayment(payment),
        history: rows.map((row) => ({
          id: row.id,
          date: row.created_at,
          action: row.action,
          actor: row.actor_name ?? '',
          note: row.note ?? '',
        })),
      }
    },
    { readOnly: true },
  )

  sendData(res, payload)
})
