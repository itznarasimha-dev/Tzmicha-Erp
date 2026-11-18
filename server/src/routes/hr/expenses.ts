import { Router } from 'express'
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
import { hasPermission, requirePermission } from '../../middleware/auth.js'
import { mapExpense } from '../../mappers/hr.js'
import { createFilter } from '../../lib/sql.js'
import { dateOnlySchema, optionalDate, optionalText, optionalUuid, uuidSchema } from '../../lib/validation.js'
import { findReplay, readIdempotencyKey } from '../../lib/idempotency.js'
import { decideEntityApproval, raiseApproval } from '../../lib/approvals.js'

export const hrExpensesRouter = Router()

const EXPENSE_FROM = `
  from erp.hr_expenses x
  join erp.hr_employees e on e.id = x.employee_id
  left join erp.users ca on ca.id = x.current_approver
`

const EXPENSE_SELECT = `
  x.*, e.first_name || ' ' || e.last_name as employee_name,
  ca.name as current_approver_name
  ${EXPENSE_FROM}
`

const expenseQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .enum(['Draft', 'Pending', 'Approved', 'Rejected', 'Paid', 'Reimbursed'])
    .optional(),
  employeeId: optionalUuid,
  category: z.string().trim().max(80).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  sort: z.enum(['date:asc', 'date:desc', 'amount:asc', 'amount:desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

hrExpensesRouter.get('/expenses', validateQuery(expenseQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof expenseQuery>>(req)
  const canReadAll =
    hasPermission(auth, 'hr.expense.read') || hasPermission(auth, 'finance.expense.read')
  if (!canReadAll && !auth.hrEmployeeId) throw AppError.forbidden('Missing permission: hr.expense.read')
  if (!canReadAll && query.employeeId && query.employeeId !== auth.hrEmployeeId) {
    throw AppError.forbidden('You may only view your own expenses')
  }

  const pagination = parsePagination(query)
  const sort = parseSort(query.sort, { date: 'x.expense_date', amount: 'x.amount' }, 'date')

  const result = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('x.employee_id', canReadAll ? query.employeeId : auth.hrEmployeeId)
    filter.equal('x.status', query.status)
    filter.equal('x.category', query.category)
    filter.gte('x.expense_date', query.from)
    filter.lte('x.expense_date', query.to)
    filter.search(['x.code', 'x.description'], query.q)

    const total = await count(client, `select count(*)::text as total ${EXPENSE_FROM} ${filter.where}`, filter.params)
    const limit = filter.param(pagination.pageSize)
    const offset = filter.param(pagination.offset)
    const rows = await many(
      client,
      `select ${EXPENSE_SELECT} ${filter.where}
        order by ${sort.clause} nulls last, x.id
        limit ${limit} offset ${offset}`,
      filter.params,
    )
    return paginated(rows.map(mapExpense), total, pagination)
  }, { readOnly: true })

  res.json(result)
})

const expenseCreateSchema = z.object({
  employeeId: optionalUuid,
  category: z.enum([
    'Travel',
    'Meals',
    'Accommodation',
    'Office Supplies',
    'Training',
    'Medical',
    'Communication',
    'Other',
  ]).default('Other'),
  amount: z.coerce.number().positive(),
  currency: z.string().trim().length(3).default('INR'),
  expenseDate: dateOnlySchema,
  description: z.string().trim().min(5).max(1000),
  receiptPath: optionalText(500),
  submit: z.boolean().default(true),
})

hrExpensesRouter.post(
  '/expenses',
  validateBody(expenseCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof expenseCreateSchema>>(req)
    const idempotencyKey = readIdempotencyKey(req.header('idempotency-key'))

    const employeeId = input.employeeId ?? auth.hrEmployeeId
    if (!employeeId) throw AppError.badRequest('employeeId is required for this account')
    if (employeeId !== auth.hrEmployeeId && !hasPermission(auth, 'hr.expense.write')) {
      throw AppError.forbidden('You may only submit your own expenses')
    }

    const result = await withRls(auth, async (client) => {
      const replay = await findReplay<{ id: string }>(
        client,
        'erp.hr_expenses',
        'id',
        auth.orgId,
        idempotencyKey,
      )
      if (replay) {
        const row = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [replay.id])
        return { expense: mapExpense(row!), replayed: true }
      }

      const code = await nextDocNumber(client, auth.orgId, 'hr_expense')
      const status = input.submit ? 'Pending' : 'Draft'

      const row = await one<{ id: string }>(
        client,
        `insert into erp.hr_expenses
           (org_id, code, employee_id, category, amount, currency, expense_date, description,
            receipt_path, status, submitted_at, idempotency_key, created_by)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9,
                 case when $9 = 'Pending' then now() else null end, $10, erp.current_user_id())
         returning id`,
        [
          code,
          employeeId,
          input.category,
          input.amount,
          input.currency.toUpperCase(),
          input.expenseDate,
          input.description,
          input.receiptPath ?? null,
          status,
          idempotencyKey,
        ],
      )

      if (input.submit) {
        const employee = await one<{ name: string }>(
          client,
          `select first_name || ' ' || last_name as name from erp.hr_employees where id = $1`,
          [employeeId],
        )
        await raiseApproval(client, {
          entityType: 'hr_expense',
          entityId: row!.id,
          title: `Expense claim ${code} — ${employee?.name ?? 'employee'}`,
          stage: 'hr',
          assignedRole: 'hr.expense.approve',
          amount: input.amount,
        })
      }

      await audit(client, 'hr.expense.created', 'hr_expenses', row!.id, `${code} ${input.amount}`)
      const full = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [row!.id])
      return { expense: mapExpense(full!), replayed: false }
    })

    sendData(res, result, result.replayed ? 200 : 201)
  },
)

const decideExpenseSchema = z.object({
  remarks: optionalText(1000),
})

async function decideExpense(
  req: import('express').Request,
  res: import('express').Response,
  decision: 'Approved' | 'Rejected' | 'Changes Requested',
) {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<{ remarks?: string }>(req)
  if (decision === 'Rejected' && !input.remarks) {
    throw AppError.badRequest('A remark is required when rejecting an expense')
  }

  const expense = await withRls(auth, async (client) => {
    const current = await one<{ status: string; code: string; amount: string; employee_id: string }>(
      client,
      'select status, code, amount, employee_id from erp.hr_expenses where id = $1 for update',
      [id],
    )
    if (!current) throw AppError.notFound('Expense not found')
    if (current.status !== 'Pending') {
      throw AppError.conflict(`Expense is already ${current.status.toLowerCase()}`)
    }

    await decideEntityApproval(client, 'hr_expense', id, decision, input.remarks ?? null)

    const nextStatus = decision === 'Approved' ? 'Approved' : decision === 'Rejected' ? 'Rejected' : 'Draft'
    await client.query(
      `update erp.hr_expenses
          set status = $2, decided_by = erp.current_user_id(), decided_at = now(),
              reviewer_remarks = $3, updated_at = now()
        where id = $1`,
      [id, nextStatus, input.remarks ?? null],
    )
    await client.query(
      `insert into erp.hr_expense_approvals
         (org_id, expense_id, stage, approver_user_id, decision, remarks)
       values (erp.current_org_id(), $1, 'HR Review', erp.current_user_id(), $2, $3)`,
      [id, decision, input.remarks ?? null],
    )
    await audit(client, `hr.expense.${decision.toLowerCase()}`, 'hr_expenses', id, input.remarks ?? decision)

    const row = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [id])
    return mapExpense(row!)
  })

  sendData(res, expense)
}

hrExpensesRouter.post(
  '/expenses/:id/approve',
  requirePermission('hr.expense.approve'),
  validateBody(decideExpenseSchema),
  (req, res) => decideExpense(req, res, 'Approved'),
)

hrExpensesRouter.post(
  '/expenses/:id/reject',
  requirePermission('hr.expense.approve'),
  validateBody(decideExpenseSchema),
  (req, res) => decideExpense(req, res, 'Rejected'),
)

hrExpensesRouter.post(
  '/expenses/:id/request-changes',
  requirePermission('hr.expense.approve'),
  validateBody(decideExpenseSchema),
  (req, res) => decideExpense(req, res, 'Changes Requested'),
)

hrExpensesRouter.post(
  '/expenses/:id/reimburse',
  requirePermission('finance.payment.approve', 'hr.expense.approve'),
  validateBody(z.object({ remarks: optionalText(1000) })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ remarks?: string }>(req)

    const expense = await withRls(auth, async (client) => {
      const updated = await one(
        client,
        `update erp.hr_expenses
            set status = 'Reimbursed', decided_at = coalesce(decided_at, now()), updated_at = now(),
                reviewer_remarks = coalesce($2, reviewer_remarks)
          where id = $1 and status = 'Approved'
          returning id`,
        [id, input.remarks ?? null],
      )
      if (!updated) throw AppError.conflict('Only approved expenses can be reimbursed')

      await client.query(
        `insert into erp.hr_expense_approvals
           (org_id, expense_id, stage, approver_user_id, decision, remarks)
         values (erp.current_org_id(), $1, 'Finance Review', erp.current_user_id(), 'Approved', $2)`,
        [id, input.remarks ?? 'Reimbursed'],
      )
      await audit(client, 'hr.expense.reimbursed', 'hr_expenses', id, input.remarks ?? null)

      const row = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [id])
      return mapExpense(row!)
    })

    sendData(res, expense)
  },
)

hrExpensesRouter.get('/expenses/:id', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const canReadAll =
    hasPermission(auth, 'hr.expense.read') || hasPermission(auth, 'finance.expense.read')

  const payload = await withRls(auth, async (client) => {
    const row = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [id])
    if (!row) throw AppError.notFound('Expense not found')
    if (!canReadAll && row.employee_id !== auth.hrEmployeeId) {
      throw AppError.forbidden('You may only view your own expenses')
    }

    const approvals = await many(
      client,
      `select a.*, u.name as approver_name
         from erp.hr_expense_approvals a
         left join erp.users u on u.id = a.approver_user_id
        where a.expense_id = $1
        order by a.decided_at desc`,
      [id],
    )

    return {
      ...mapExpense(row),
      approvals: approvals.map((item) => ({
        id: item.id,
        stage: item.stage,
        decision: item.decision,
        remarks: item.remarks ?? '',
        approver: item.approver_name ?? '',
        decidedAt: item.decided_at,
      })),
    }
  }, { readOnly: true })

  sendData(res, payload)
})
