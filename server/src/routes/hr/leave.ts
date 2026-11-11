import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, count, audit } from '../../db/transaction.js'
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
import { mapLeave, mapLeaveBalance } from '../../mappers/hr.js'
import { createFilter } from '../../lib/sql.js'
import { dateOnlySchema, optionalText, optionalUuid, uuidSchema } from '../../lib/validation.js'
import { cancelPendingApprovals, decideEntityApproval, raiseApproval } from '../../lib/approvals.js'

export const leaveRouter = Router()

const LEAVE_FROM = `
  from erp.hr_leave_requests l
  join erp.hr_leave_types t on t.id = l.leave_type_id
  join erp.hr_employees e on e.id = l.employee_id
  left join erp.users u on u.id = l.reviewer_id
`

const LEAVE_SELECT = `
  l.*, t.name as leave_type_name, e.first_name || ' ' || e.last_name as employee_name,
  coalesce(u.name, l.reviewer_name) as reviewer_name
  ${LEAVE_FROM}
`

const leaveQuery = z.object({
  employeeId: optionalUuid,
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']).optional(),
  leaveTypeId: optionalUuid,
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(['appliedOn:asc', 'appliedOn:desc', 'startDate:asc', 'startDate:desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

leaveRouter.get('/leaves', validateQuery(leaveQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof leaveQuery>>(req)
  const canReadAll = hasPermission(auth, 'hr.leave.read')
  if (!canReadAll && !auth.hrEmployeeId) throw AppError.forbidden('Missing permission: hr.leave.read')
  if (!canReadAll && query.employeeId && query.employeeId !== auth.hrEmployeeId) {
    throw AppError.forbidden('You may only view your own leave requests')
  }

  const pagination = parsePagination(query)
  const sort = parseSort(
    query.sort,
    { appliedOn: 'l.applied_on', startDate: 'l.start_date' },
    'appliedOn',
  )

  const result = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('l.employee_id', canReadAll ? query.employeeId : auth.hrEmployeeId)
    filter.equal('l.status', query.status)
    filter.equal('l.leave_type_id', query.leaveTypeId)
    filter.gte('l.end_date', query.from)
    filter.lte('l.start_date', query.to)

    const total = await count(
      client,
      `select count(*)::text as total ${LEAVE_FROM} ${filter.where}`,
      filter.params,
    )
    const limit = filter.param(pagination.pageSize)
    const offset = filter.param(pagination.offset)
    const rows = await many(
      client,
      `select ${LEAVE_SELECT} ${filter.where}
        order by ${sort.clause} nulls last, l.id
        limit ${limit} offset ${offset}`,
      filter.params,
    )
    return paginated(rows.map(mapLeave), total, pagination)
  }, { readOnly: true })

  res.json(result)
})

const leaveCreateSchema = z.object({
  employeeId: optionalUuid,
  leaveTypeId: uuidSchema,
  from: dateOnlySchema,
  to: dateOnlySchema,
  reason: z.string().trim().min(5).max(1000),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  halfDay: z.boolean().default(false),
})

leaveRouter.post('/leaves', validateBody(leaveCreateSchema), async (req, res) => {
  const auth = req.auth!
  const input = validatedBody<z.infer<typeof leaveCreateSchema>>(req)

  if (input.to < input.from) throw AppError.badRequest('"to" must be on or after "from"')

  const employeeId = input.employeeId ?? auth.hrEmployeeId
  if (!employeeId) throw AppError.badRequest('employeeId is required for this account')
  if (employeeId !== auth.hrEmployeeId && !hasPermission(auth, 'hr.leave.create')) {
    throw AppError.forbidden('You may only apply for your own leave')
  }
  if (input.halfDay && input.from !== input.to) {
    throw AppError.badRequest('A half day must start and end on the same date')
  }

  const created = await withRls(auth, async (client) => {
    const overlap = await one(
      client,
      `select id from erp.hr_leave_requests
        where employee_id = $1
          and status in ('Pending','Approved')
          and daterange(start_date, end_date, '[]') && daterange($2::date, $3::date, '[]')
        limit 1`,
      [employeeId, input.from, input.to],
    )
    if (overlap) throw AppError.conflict('An overlapping leave request already exists')

    const type = await one<{ name: string; requires_approval: boolean }>(
      client,
      'select name, requires_approval from erp.hr_leave_types where id = $1 and is_active',
      [input.leaveTypeId],
    )
    if (!type) throw AppError.badRequest('Unknown or inactive leave type')

    const daysRow = await one<{ days: string }>(
      client,
      `select case when $3::boolean then 0.5 else count(*) end::numeric(5,1)::text as days
         from generate_series($1::date, $2::date, interval '1 day') d
        where extract(isodow from d) < 6
          and not exists (
            select 1 from erp.hr_holidays h
             where h.org_id = erp.current_org_id() and h.holiday_date = d::date
          )`,
      [input.from, input.to, input.halfDay],
    )
    const days = Number(daysRow?.days ?? 0)
    if (!days || days <= 0) {
      throw AppError.badRequest('The selected range contains no working days')
    }

    const row = await one(
      client,
      `insert into erp.hr_leave_requests
         (org_id, employee_id, leave_type_id, start_date, end_date, days, half_day,
          reason, priority, created_by)
       values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, erp.current_user_id())
       returning *`,
      [employeeId, input.leaveTypeId, input.from, input.to, days, input.halfDay, input.reason, input.priority],
    )

    const employee = await one<{ name: string }>(
      client,
      `select first_name || ' ' || last_name as name from erp.hr_employees where id = $1`,
      [employeeId],
    )

    if (type.requires_approval) {
      await raiseApproval(client, {
        entityType: 'hr_leave',
        entityId: row!.id,
        title: `${employee?.name ?? 'Employee'} requested ${days} day(s) of ${type.name}`,
        stage: 'manager',
        assignedRole: 'hr.leave.approve',
        payload: { from: input.from, to: input.to, days },
      })
    }

    await audit(client, 'hr.leave.requested', 'hr_leave_requests', row!.id, `${days} day(s) ${type.name}`, null, {
      from: input.from,
      to: input.to,
    })

    if (!type.requires_approval) {
      await client.query(
        `update erp.hr_leave_requests
            set status = 'Approved', reviewer_id = null, reviewer_name = 'Auto-approved (policy)',
                decided_at = now(), updated_at = now()
          where id = $1`,
        [row!.id],
      )
    }

    const full = await one(client, `select ${LEAVE_SELECT} where l.id = $1`, [row!.id])
    return mapLeave(full!)
  })

  sendData(res, created, 201)
})

const decisionBody = z.object({
  remarks: optionalText(1000),
})

leaveRouter.post(
  '/leaves/:id/approve',
  requirePermission('hr.leave.approve'),
  validateBody(decisionBody),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ remarks?: string }>(req)

    const leave = await withRls(auth, async (client) => {
      const current = await one(client, 'select * from erp.hr_leave_requests where id = $1 for update', [id])
      if (!current) throw AppError.notFound('Leave request not found')
      if (current.status !== 'Pending') {
        throw AppError.conflict(`This request was already ${String(current.status).toLowerCase()}`)
      }
      if (current.created_by === auth.userId) {
        throw AppError.forbidden('Self-approval is not permitted')
      }

      await decideEntityApproval(client, 'hr_leave', id, 'Approved', input.remarks ?? null)

      await client.query(
        `update erp.hr_leave_requests
            set status = 'Approved', reviewer_id = erp.current_user_id(), reviewer_name = $2,
                remarks = $3, decided_at = now(), updated_at = now()
          where id = $1`,
        [id, auth.name, input.remarks ?? null],
      )
      await client.query(
        `insert into erp.hr_leave_approvals (org_id, leave_request_id, approver_user_id, decision, remarks)
         values (erp.current_org_id(), $1, erp.current_user_id(), 'Approved', $2)`,
        [id, input.remarks ?? null],
      )
      await audit(client, 'hr.leave.approved', 'hr_leave_requests', id, input.remarks ?? 'Approved')

      const full = await one(client, `select ${LEAVE_SELECT} where l.id = $1`, [id])
      return mapLeave(full!)
    })

    sendData(res, leave)
  },
)

leaveRouter.post(
  '/leaves/:id/reject',
  requirePermission('hr.leave.approve'),
  validateBody(decisionBody),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ remarks?: string }>(req)
    if (!input.remarks) throw AppError.badRequest('A remark is required when rejecting leave')

    const leave = await withRls(auth, async (client) => {
      const current = await one(client, 'select * from erp.hr_leave_requests where id = $1 for update', [id])
      if (!current) throw AppError.notFound('Leave request not found')
      if (current.status !== 'Pending') {
        throw AppError.conflict(`This request was already ${String(current.status).toLowerCase()}`)
      }
      if (current.created_by === auth.userId) {
        throw AppError.forbidden('Self-approval is not permitted')
      }

      await decideEntityApproval(client, 'hr_leave', id, 'Rejected', input.remarks ?? null)

      await client.query(
        `update erp.hr_leave_requests
            set status = 'Rejected', reviewer_id = erp.current_user_id(), reviewer_name = $2,
                remarks = $3, decided_at = now(), updated_at = now()
          where id = $1`,
        [id, auth.name, input.remarks],
      )
      await client.query(
        `insert into erp.hr_leave_approvals (org_id, leave_request_id, approver_user_id, decision, remarks)
         values (erp.current_org_id(), $1, erp.current_user_id(), 'Rejected', $2)`,
        [id, input.remarks],
      )
      await audit(client, 'hr.leave.rejected', 'hr_leave_requests', id, input.remarks ?? 'Rejected')

      const full = await one(client, `select ${LEAVE_SELECT} where l.id = $1`, [id])
      return mapLeave(full!)
    })

    sendData(res, leave)
  },
)

leaveRouter.post('/leaves/:id/cancel', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const leave = await withRls(auth, async (client) => {
    const current = await one<{ employee_id: string; created_by: string | null; status: string }>(
      client,
      'select employee_id, created_by, status from erp.hr_leave_requests where id = $1 for update',
      [id],
    )
    if (!current) throw AppError.notFound('Leave request not found')
    if (current.status !== 'Pending') {
      throw AppError.conflict(`This request was already ${current.status.toLowerCase()}`)
    }

    const isOwner = current.employee_id === auth.hrEmployeeId || current.created_by === auth.userId
    if (!isOwner && !hasPermission(auth, 'hr.leave.approve')) {
      throw AppError.forbidden('You may only cancel your own leave request')
    }

    await cancelPendingApprovals(client, 'hr_leave', id, 'Cancelled by requester')
    await client.query(
      `update erp.hr_leave_requests
          set status = 'Cancelled', decided_at = now(), updated_at = now()
        where id = $1`,
      [id],
    )
    await audit(client, 'hr.leave.cancelled', 'hr_leave_requests', id, null)

    const full = await one(client, `select ${LEAVE_SELECT} where l.id = $1`, [id])
    return mapLeave(full!)
  })

  sendData(res, leave)
})

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------
leaveRouter.get('/leave-balances', async (req, res) => {
  const auth = req.auth!
  const year = Number(req.query.year) || new Date().getFullYear()
  const canReadAll = hasPermission(auth, 'hr.leave.read')
  const requestedEmployee = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined
  if (!canReadAll && !auth.hrEmployeeId) throw AppError.forbidden('Missing permission: hr.leave.read')
  if (!canReadAll && requestedEmployee && requestedEmployee !== auth.hrEmployeeId) {
    throw AppError.forbidden('You may only view your own leave balances')
  }

  const rows = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('b.employee_id', canReadAll ? requestedEmployee : auth.hrEmployeeId)
    filter.equal('b.year', year)
    return many(
      client,
      `select b.*, t.name as leave_type_name
         from erp.hr_leave_balances b
         join erp.hr_leave_types t on t.id = b.leave_type_id
         ${filter.where}
        order by t.name`,
      filter.params,
    )
  }, { readOnly: true })

  sendData(res, rows.map(mapLeaveBalance))
})

const balanceUpsertSchema = z.object({
  employeeId: uuidSchema,
  leaveTypeId: uuidSchema,
  year: z.coerce.number().int().min(2000).max(2100),
  allocated: z.coerce.number().min(0).max(365),
})

leaveRouter.post(
  '/leave-balances',
  requirePermission('hr.settings.write', 'hr.leave.approve'),
  validateBody(balanceUpsertSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof balanceUpsertSchema>>(req)

    const row = await withRls(auth, async (client) => {
      const saved = await one(
        client,
        `insert into erp.hr_leave_balances
           (org_id, employee_id, leave_type_id, year, allocated)
         values (erp.current_org_id(), $1, $2, $3, $4)
         on conflict (org_id, employee_id, leave_type_id, year) do update
           set allocated = excluded.allocated, updated_at = now()
         returning *`,
        [input.employeeId, input.leaveTypeId, input.year, input.allocated],
      )
      await audit(
        client,
        'hr.leave_balance.updated',
        'hr_leave_balances',
        saved!.id,
        `Allocated ${input.allocated} day(s)`,
      )
      return saved!
    })

    sendData(res, mapLeaveBalance(row))
  },
)
