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
import { mapPayrollRun, mapPayslip, mapSalaryStructure, num } from '../../mappers/hr.js'
import { createFilter } from '../../lib/sql.js'
import { dateOnlySchema, optionalText, optionalUuid, periodSchema, uuidSchema } from '../../lib/validation.js'
import { findReplay, readIdempotencyKey } from '../../lib/idempotency.js'
import { decideEntityApproval, raiseApproval } from '../../lib/approvals.js'

export const payrollRouter = Router()

const RUN_SELECT = `
  r.*,
  (select count(*) from erp.hr_payslips p where p.payroll_run_id = r.id)::int as payslip_count,
  pu.name as prepared_by_name, ru.name as reviewed_by_name, au.name as approved_by_name
  from erp.hr_payroll_runs r
  left join erp.users pu on pu.id = r.prepared_by
  left join erp.users ru on ru.id = r.reviewed_by
  left join erp.users au on au.id = r.approved_by
`

const RUN_FROM = `
  from erp.hr_payroll_runs r
  left join erp.users pu on pu.id = r.prepared_by
  left join erp.users ru on ru.id = r.reviewed_by
  left join erp.users au on au.id = r.approved_by
`

// ---------------------------------------------------------------------------
// Salary structures
// ---------------------------------------------------------------------------
payrollRouter.get('/salary-structures', requirePermission('hr.salary.read', 'hr.payroll.prepare'), async (req, res) => {
  const auth = req.auth!
  const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined

  const rows = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('employee_id', employeeId)
    return many(
      client,
      `select * from erp.hr_salary_structures ${filter.where}
        order by effective_from desc limit 500`,
      filter.params,
    )
  }, { readOnly: true })

  sendData(res, rows.map(mapSalaryStructure))
})

const salaryStructureSchema = z.object({
  employeeId: uuidSchema,
  effectiveFrom: dateOnlySchema,
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  annualCtc: z.coerce.number().min(0),
  basic: z.coerce.number().min(0),
  hra: z.coerce.number().min(0).default(0),
  allowances: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
  employerPf: z.coerce.number().min(0).default(0),
  note: optionalText(500),
})

payrollRouter.post(
  '/salary-structures',
  requirePermission('hr.payroll.prepare'),
  validateBody(salaryStructureSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof salaryStructureSchema>>(req)

    const row = await withRls(auth, async (client) => {
      const employee = await one(client, 'select id from erp.hr_employees where id = $1 and deleted_at is null', [
        input.employeeId,
      ])
      if (!employee) throw AppError.notFound('Employee not found')

      // Supersede the previous active structure.
      await client.query(
        `update erp.hr_salary_structures
            set status = 'Superseded', effective_to = coalesce(effective_to, ($2::date - 1)), updated_at = now()
          where employee_id = $1 and status = 'Active'`,
        [input.employeeId, input.effectiveFrom],
      )

      const saved = await one(
        client,
        `insert into erp.hr_salary_structures
           (org_id, employee_id, effective_from, effective_to, annual_ctc, basic, hra,
            allowances, deductions, employer_pf, status, note, created_by)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active', $10, erp.current_user_id())
         returning *`,
        [
          input.employeeId,
          input.effectiveFrom,
          input.effectiveTo ?? null,
          input.annualCtc,
          input.basic,
          input.hra,
          input.allowances,
          input.deductions,
          input.employerPf,
          input.note ?? null,
        ],
      )
      await audit(client, 'hr.salary_structure.created', 'hr_salary_structures', saved!.id, `CTC ${input.annualCtc}`)
      return saved!
    })

    sendData(res, mapSalaryStructure(row), 201)
  },
)

// ---------------------------------------------------------------------------
// Payroll runs
// ---------------------------------------------------------------------------
payrollRouter.get('/payroll/runs', requirePermission('hr.payroll.read'), validateQuery(z.object({
  period: periodSchema.optional(),
  status: z.enum(['Draft', 'HR Review', 'Finance Approval', 'Approved', 'Paid', 'Cancelled']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<{ period?: string; status?: string }>(req)
  const pagination = parsePagination(req.query)

  const result = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('r.period', query.period)
    filter.equal('r.status', query.status)

    const total = await count(client, `select count(*)::text as total ${RUN_FROM} ${filter.where}`, filter.params)
    const limit = filter.param(pagination.pageSize)
    const offset = filter.param(pagination.offset)
    const rows = await many(
      client,
      `select ${RUN_SELECT} ${filter.where}
        order by r.period desc limit ${limit} offset ${offset}`,
      filter.params,
    )
    return paginated(rows.map(mapPayrollRun), total, pagination)
  }, { readOnly: true })

  res.json(result)
})

const payrollRunSchema = z.object({
  period: periodSchema,
  notes: optionalText(1000),
  employeeIds: z.array(uuidSchema).max(500).optional(),
})

payrollRouter.post(
  '/payroll/runs',
  requirePermission('hr.payroll.prepare'),
  validateBody(payrollRunSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof payrollRunSchema>>(req)
    const idempotencyKey = readIdempotencyKey(req.header('idempotency-key'))

    const result = await withRls(auth, async (client) => {
      const replay = await findReplay<Record<string, unknown>>(
        client,
        'erp.hr_payroll_runs',
        'id',
        auth.orgId,
        idempotencyKey,
      )
      if (replay) {
        const row = await one(client, `select ${RUN_SELECT} where r.id = $1`, [replay.id])
        return { run: mapPayrollRun(row!), replayed: true }
      }

      const existing = await one(client, 'select id from erp.hr_payroll_runs where period = $1', [input.period])
      if (existing) throw AppError.conflict(`A payroll run already exists for ${input.period}`)

      const [year, month] = input.period.split('-').map(Number)
      const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
      const fiscalYear = `${year}-${String(year + 1).slice(-2)}`

      const createdAt = await one<{ id: string }>(
        client,
        `insert into erp.hr_payroll_runs
           (org_id, period, status, prepared_by, notes, idempotency_key)
         values (erp.current_org_id(), $1, 'Draft', erp.current_user_id(), $2, $3)
         returning id`,
        [input.period, input.notes ?? null, idempotencyKey],
      )
      const runId = createdAt!.id

      // Employees with an active salary structure effective by period end.
      const employees = await many<{ employee_id: string; basic: string; hra: string; allowances: string; deductions: string }>(
        client,
        `select distinct on (s.employee_id)
                s.employee_id, s.basic, s.hra, s.allowances, s.deductions
           from erp.hr_salary_structures s
           join erp.hr_employees e on e.id = s.employee_id and e.deleted_at is null
          where s.status = 'Active'
            and s.effective_from <= $1::date
            and (s.effective_to is null or s.effective_to >= $1::date)
            ${input.employeeIds ? 'and s.employee_id = any($2::uuid[])' : ''}
          order by s.employee_id, s.effective_from desc`,
        input.employeeIds ? [periodEnd, input.employeeIds] : [periodEnd],
      )

      if (employees.length === 0) {
        throw AppError.badRequest('No employees have an active salary structure for this period')
      }

      for (const employee of employees) {
        const attendance = await one<{ present_days: number; late_days: number; half_days: number; total_hours: string }>(
          client,
          `select present_days, late_days, half_days, total_hours
             from erp.v_hr_attendance_summary
            where employee_id = $1 and period = $2`,
          [employee.employee_id, input.period],
        )

        const unpaid = await one<{ days: string }>(
          client,
          `select coalesce(sum(l.days), 0)::text as days
             from erp.hr_leave_requests l
             join erp.hr_leave_types t on t.id = l.leave_type_id
            where l.employee_id = $1
              and l.status = 'Approved'
              and not t.paid
              and to_char(l.start_date, 'YYYY-MM') = $2`,
          [employee.employee_id, input.period],
        )

        const basic = num(employee.basic)
        const allowances = num(employee.hra) + num(employee.allowances)
        const unpaidDays = num(unpaid?.days)
        const leaveDeduction = unpaidDays > 0 ? Math.round((basic / 30) * unpaidDays * 100) / 100 : 0
        const attendanceDays =
          num(attendance?.present_days) + num(attendance?.late_days) + num(attendance?.half_days) * 0.5

        const payslipCode = await nextDocNumber(client, auth.orgId, 'payslip', fiscalYear)
        await client.query(
          `insert into erp.hr_payslips
             (org_id, payroll_run_id, employee_id, period, basic, allowances, overtime,
              deductions, leave_deduction, tax, net_pay, attendance_days, leave_days,
              status, payslip_code)
           values (erp.current_org_id(), $1, $2, $3, $4, $5, 0, $6, $7, 0, 0, $8, $9, 'Draft', $10)`,
          [
            runId,
            employee.employee_id,
            input.period,
            basic,
            allowances,
            num(employee.deductions),
            leaveDeduction,
            attendanceDays,
            unpaidDays,
            payslipCode,
          ],
        )
      }

      await audit(client, 'hr.payroll_run.created', 'hr_payroll_runs', runId, `Payroll ${input.period}`)

      const row = await one(client, `select ${RUN_SELECT} where r.id = $1`, [runId])
      return { run: mapPayrollRun(row!), replayed: false }
    })

    sendData(res, result, result.replayed ? 200 : 201)
  },
)

payrollRouter.get('/payroll/runs/:id', requirePermission('hr.payroll.read'), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(auth, async (client) => {
    const run = await one(client, `select ${RUN_SELECT} where r.id = $1`, [id])
    if (!run) throw AppError.notFound('Payroll run not found')

    const payslips = await many(
      client,
      `select p.*, e.first_name || ' ' || e.last_name as employee_name
         from erp.hr_payslips p
         join erp.hr_employees e on e.id = p.employee_id
        where p.payroll_run_id = $1
        order by e.first_name, e.last_name`,
      [id],
    )

    return { ...mapPayrollRun(run), payslips: payslips.map(mapPayslip) }
  }, { readOnly: true })

  sendData(res, payload)
})

const advanceSchema = z.object({
  action: z.enum(['submit', 'review', 'approve', 'mark-paid', 'cancel']),
  notes: optionalText(1000),
})

/** Explicit, permission-checked workflow transitions (no arbitrary status writes). */
const TRANSITIONS: Record<
  string,
  { from: string[]; to: string; permission: string; audit: string }
> = {
  submit: { from: ['Draft'], to: 'HR Review', permission: 'hr.payroll.prepare', audit: 'hr.payroll.submitted' },
  review: {
    from: ['HR Review'],
    to: 'Finance Approval',
    permission: 'hr.payroll.prepare',
    audit: 'hr.payroll.finance_review',
  },
  approve: {
    from: ['Finance Approval'],
    to: 'Approved',
    permission: 'finance.payment.approve',
    audit: 'hr.payroll.approved',
  },
  'mark-paid': {
    from: ['Approved'],
    to: 'Paid',
    permission: 'finance.payment.approve',
    audit: 'hr.payroll.paid',
  },
  cancel: {
    from: ['Draft', 'HR Review', 'Finance Approval'],
    to: 'Cancelled',
    permission: 'hr.payroll.prepare',
    audit: 'hr.payroll.cancelled',
  },
}

payrollRouter.post(
  '/payroll/runs/:id/advance',
  requirePermission('hr.payroll.prepare', 'finance.payment.approve'),
  validateBody(advanceSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof advanceSchema>>(req)
    const transition = TRANSITIONS[input.action]

    const run = await withRls(auth, async (client) => {
      const current = await one<{ status: string; period: string }>(
        client,
        'select status, period from erp.hr_payroll_runs where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Payroll run not found')
      if (!transition.from.includes(current.status)) {
        throw AppError.conflict(`Cannot ${input.action} a run that is ${current.status}`)
      }
      if (!hasPermission(auth, transition.permission)) {
        throw AppError.forbidden(`Missing permission: ${transition.permission}`)
      }

      if (input.action === 'submit') {
        await raiseApproval(client, {
          entityType: 'hr_payroll_run',
          entityId: id,
          title: `Payroll ${current.period}`,
          stage: 'finance',
          assignedRole: 'finance.payment.approve',
          amount: 0,
        })
        await client.query(
          `update erp.hr_payroll_runs set status = $2, reviewed_by = erp.current_user_id(), updated_at = now()
            where id = $1`,
          [id, transition.to],
        )
        await client.query(
          `update erp.hr_payslips set status = $2, updated_at = now() where payroll_run_id = $1`,
          [id, transition.to],
        )
      } else if (input.action === 'review') {
        await client.query(
          `update erp.hr_payroll_runs set status = $2, reviewed_by = erp.current_user_id(), updated_at = now()
            where id = $1`,
          [id, transition.to],
        )
        await client.query(
          `update erp.hr_payslips set status = $2, updated_at = now() where payroll_run_id = $1`,
          [id, transition.to],
        )
      } else if (input.action === 'approve') {
        await decideEntityApproval(client, 'hr_payroll_run', id, 'Approved', input.notes ?? null)
        await client.query(
          `update erp.hr_payroll_runs
              set status = $2, approved_by = erp.current_user_id(), approved_at = now(), updated_at = now()
            where id = $1`,
          [id, transition.to],
        )
        await client.query(
          `update erp.hr_payslips set status = $2, updated_at = now() where payroll_run_id = $1`,
          [id, transition.to],
        )
      } else if (input.action === 'mark-paid') {
        await client.query(
          `update erp.hr_payroll_runs set status = $2, paid_at = now(), updated_at = now() where id = $1`,
          [id, transition.to],
        )
        await client.query(
          `update erp.hr_payslips set status = $2, updated_at = now() where payroll_run_id = $1`,
          [id, transition.to],
        )
      } else {
        await client.query(
          `update erp.hr_payroll_runs set status = $2, updated_at = now() where id = $1`,
          [id, transition.to],
        )
      }

      await audit(client, transition.audit, 'hr_payroll_runs', id, input.notes ?? transition.to)
      const row = await one(client, `select ${RUN_SELECT} where r.id = $1`, [id])
      return mapPayrollRun(row!)
    })

    sendData(res, run)
  },
)

// ---------------------------------------------------------------------------
// Payslips
// ---------------------------------------------------------------------------
const payslipQuery = z.object({
  employeeId: optionalUuid,
  period: periodSchema.optional(),
  status: z.enum(['Draft', 'HR Review', 'Finance Approval', 'Approved', 'Paid']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

payrollRouter.get('/payroll/payslips', validateQuery(payslipQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof payslipQuery>>(req)
  const canReadAll = hasPermission(auth, 'hr.payroll.read') || hasPermission(auth, 'hr.salary.read')
  if (!canReadAll && !auth.hrEmployeeId) throw AppError.forbidden('Missing permission: hr.payroll.read')
  if (!canReadAll && query.employeeId && query.employeeId !== auth.hrEmployeeId) {
    throw AppError.forbidden('You may only view your own payslips')
  }

  const pagination = parsePagination(query)

  const result = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('p.employee_id', canReadAll ? query.employeeId : auth.hrEmployeeId)
    filter.equal('p.period', query.period)
    filter.equal('p.status', query.status)

    const total = await count(
      client,
      `select count(*)::text as total from erp.hr_payslips p ${filter.where}`,
      filter.params,
    )
    const limit = filter.param(pagination.pageSize)
    const offset = filter.param(pagination.offset)
    const rows = await many(
      client,
      `select p.*, e.first_name || ' ' || e.last_name as employee_name
         from erp.hr_payslips p
         join erp.hr_employees e on e.id = p.employee_id
         ${filter.where}
        order by p.period desc, e.first_name
        limit ${limit} offset ${offset}`,
      filter.params,
    )
    return paginated(rows.map(mapPayslip), total, pagination)
  }, { readOnly: true })

  res.json(result)
})

const payslipUpdateSchema = z.object({
  basic: z.coerce.number().min(0).optional(),
  allowances: z.coerce.number().min(0).optional(),
  overtime: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
  leaveDeduction: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  attendanceDays: z.coerce.number().min(0).max(31).optional(),
  leaveDays: z.coerce.number().min(0).max(31).optional(),
  note: optionalText(500),
})

payrollRouter.patch(
  '/payroll/payslips/:id',
  requirePermission('hr.payroll.prepare'),
  validateBody(payslipUpdateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof payslipUpdateSchema>>(req)

    const payslip = await withRls(auth, async (client) => {
      const current = await one<{ payroll_run_id: string; status: string }>(
        client,
        `select p.payroll_run_id, p.status
           from erp.hr_payslips p
          where p.id = $1`,
        [id],
      )
      if (!current) throw AppError.notFound('Payslip not found')
      if (!['Draft', 'HR Review'].includes(current.status)) {
        throw AppError.conflict('Payslips can only be edited while the run is Draft or HR Review')
      }

      const updates: string[] = []
      const values: unknown[] = []
      let index = 1
      const set = (column: string, value: unknown) => {
        if (value === undefined) return
        updates.push(`${column} = $${index++}`)
        values.push(value)
      }
      set('basic', input.basic)
      set('allowances', input.allowances)
      set('overtime', input.overtime)
      set('deductions', input.deductions)
      set('leave_deduction', input.leaveDeduction)
      set('tax', input.tax)
      set('attendance_days', input.attendanceDays)
      set('leave_days', input.leaveDays)
      set('note', input.note)

      if (updates.length === 0) throw AppError.badRequest('No editable fields supplied')
      values.push(id)
      await client.query(
        `update erp.hr_payslips set ${updates.join(', ')}, updated_at = now() where id = $${index}`,
        values,
      )
      await audit(client, 'hr.payslip.updated', 'hr_payslips', id, 'Payslip values adjusted')

      const row = await one(
        client,
        `select p.*, e.first_name || ' ' || e.last_name as employee_name
           from erp.hr_payslips p join erp.hr_employees e on e.id = p.employee_id
          where p.id = $1`,
        [id],
      )
      return mapPayslip(row!)
    })

    sendData(res, payslip)
  },
)
