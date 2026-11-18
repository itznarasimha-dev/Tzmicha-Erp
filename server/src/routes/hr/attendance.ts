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
import { mapAttendance, mapCorrection } from '../../mappers/hr.js'
import { createFilter } from '../../lib/sql.js'
import { dateOnlySchema, optionalText, optionalUuid, paginationQuerySchema, uuidSchema } from '../../lib/validation.js'
import { decideEntityApproval, raiseApproval } from '../../lib/approvals.js'

export const attendanceRouter = Router()

const ATTENDANCE_FROM = `
  from erp.hr_attendance a
  join erp.hr_employees e on e.id = a.employee_id
`

const ATTENDANCE_SELECT = `
  a.*, e.first_name || ' ' || e.last_name as employee_name
  ${ATTENDANCE_FROM}
`

const attendanceQuery = z.object({
  employeeId: optionalUuid,
  status: z.enum(['Present', 'Late', 'Absent', 'On Leave', 'Remote', 'Half Day']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(['date:asc', 'date:desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

attendanceRouter.get('/attendance', validateQuery(attendanceQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof attendanceQuery>>(req)
  const canReadAll = hasPermission(auth, 'hr.attendance.read')
  const canReadSelf = Boolean(auth.hrEmployeeId)

  if (!canReadAll && !canReadSelf) throw AppError.forbidden('Missing permission: hr.attendance.read')
  if (!canReadAll && query.employeeId && query.employeeId !== auth.hrEmployeeId) {
    throw AppError.forbidden('You may only view your own attendance')
  }

  const pagination = parsePagination(query)
  const sort = parseSort(query.sort, { date: 'a.attendance_date' }, 'date')

  const result = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('a.employee_id', canReadAll ? query.employeeId : auth.hrEmployeeId)
    filter.equal('a.status', query.status)
    filter.gte('a.attendance_date', query.from)
    filter.lte('a.attendance_date', query.to)

    const total = await count(
      client,
      `select count(*)::text as total ${ATTENDANCE_FROM} ${filter.where}`,
      filter.params,
    )
    const limit = filter.param(pagination.pageSize)
    const offset = filter.param(pagination.offset)

    const rows = await many(
      client,
      `select ${ATTENDANCE_SELECT} ${filter.where}
        order by ${sort.clause}, a.id
        limit ${limit} offset ${offset}`,
      filter.params,
    )
    return paginated(rows.map(mapAttendance), total, pagination)
  }, { readOnly: true })

  res.json(result)
})

const attendanceCreateSchema = z.object({
  employeeId: uuidSchema,
  date: dateOnlySchema,
  status: z.enum(['Present', 'Late', 'Absent', 'On Leave', 'Remote', 'Half Day']).default('Present'),
  checkIn: z.string().datetime({ offset: true }).optional(),
  checkOut: z.string().datetime({ offset: true }).optional(),
  hours: z.coerce.number().min(0).max(24).optional(),
  note: optionalText(500),
  source: z.enum(['Biometric', 'Web', 'Manual', 'Mobile']).default('Manual'),
})

attendanceRouter.post(
  '/attendance',
  requirePermission('hr.attendance.write'),
  validateBody(attendanceCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof attendanceCreateSchema>>(req)

    if (input.checkIn && input.checkOut && new Date(input.checkOut) < new Date(input.checkIn)) {
      throw AppError.badRequest('checkOut must be after checkIn')
    }

    const record = await withRls(auth, async (client) => {
      const employee = await one(
        client,
        'select id from erp.hr_employees where id = $1 and deleted_at is null',
        [input.employeeId],
      )
      if (!employee) throw AppError.notFound('Employee not found')

      let hours = input.hours
      if (hours === undefined && input.checkIn && input.checkOut) {
        hours = Math.round(
          ((new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / 3_600_000) * 100,
        ) / 100
      }

      const row = await one(
        client,
        `insert into erp.hr_attendance
           (org_id, employee_id, attendance_date, check_in, check_out, status, hours, note, source, recorded_by)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, coalesce($6, 0), $7, $8, erp.current_user_id())
         on conflict (org_id, employee_id, attendance_date) do update
           set check_in = excluded.check_in,
               check_out = excluded.check_out,
               status = excluded.status,
               hours = excluded.hours,
               note = excluded.note,
               source = excluded.source,
               corrected = true,
               recorded_by = excluded.recorded_by,
               updated_at = now()
         returning *`,
        [
          input.employeeId,
          input.date,
          input.checkIn ?? null,
          input.checkOut ?? null,
          input.status,
          hours ?? null,
          input.note ?? null,
          input.source,
        ],
      )

      await audit(
        client,
        'hr.attendance.recorded',
        'hr_attendance',
        row!.id,
        `${input.status} on ${input.date}`,
      )
      return mapAttendance({ ...row!, employee_name: '' })
    })

    sendData(res, record, 201)
  },
)

attendanceRouter.get('/attendance/summary', validateQuery(attendanceQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof attendanceQuery>>(req)
  const canReadAll = hasPermission(auth, 'hr.attendance.read')
  if (!canReadAll && !auth.hrEmployeeId) throw AppError.forbidden('Missing permission: hr.attendance.read')

  const rows = await withRls(auth, async (client) => {
    const filter = createFilter()
    filter.equal('s.employee_id', canReadAll ? query.employeeId : auth.hrEmployeeId)
    filter.gte('s.period', query.from?.slice(0, 7))
    filter.lte('s.period', query.to?.slice(0, 7))
    return many(
      client,
      `select s.*, e.first_name || ' ' || e.last_name as employee_name
         from erp.v_hr_attendance_summary s
         join erp.hr_employees e on e.id = s.employee_id
         ${filter.where}
        order by s.period desc`,
      filter.params,
    )
  }, { readOnly: true })

  sendData(res, rows)
})

// ---------------------------------------------------------------------------
// Corrections
// ---------------------------------------------------------------------------
const correctionCreateSchema = z.object({
  employeeId: optionalUuid,
  date: dateOnlySchema,
  requestedStatus: z.enum(['Present', 'Late', 'Absent', 'On Leave', 'Remote', 'Half Day']),
  checkIn: z.string().datetime({ offset: true }).optional(),
  checkOut: z.string().datetime({ offset: true }).optional(),
  reason: z.string().trim().min(5).max(1000),
})

attendanceRouter.get('/attendance/corrections', async (req, res) => {
  const auth = req.auth!
  const canReadAll = hasPermission(auth, 'hr.attendance.read')
  if (!canReadAll && !auth.hrEmployeeId) throw AppError.forbidden('Missing permission: hr.attendance.read')

  const rows = await withRls(auth, async (client) => {
    const filter = createFilter()
    if (!canReadAll) filter.equal('c.employee_id', auth.hrEmployeeId)
    filter.equal('c.status', typeof req.query.status === 'string' ? req.query.status : undefined)

    return many(
      client,
      `select c.*, e.first_name || ' ' || e.last_name as employee_name,
              u.name as reviewer_name
         from erp.hr_attendance_corrections c
         join erp.hr_employees e on e.id = c.employee_id
         left join erp.users u on u.id = c.reviewed_by
         ${filter.where}
        order by c.requested_at desc
        limit 200`,
      filter.params,
    )
  }, { readOnly: true })

  sendData(res, rows.map(mapCorrection))
})

attendanceRouter.post(
  '/attendance/corrections',
  validateBody(correctionCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof correctionCreateSchema>>(req)

    const employeeId = input.employeeId ?? auth.hrEmployeeId
    if (!employeeId) {
      throw AppError.badRequest('employeeId is required for accounts without an HR profile')
    }
    if (employeeId !== auth.hrEmployeeId && !hasPermission(auth, 'hr.attendance.write')) {
      throw AppError.forbidden('You may only request corrections for yourself')
    }

    const correction = await withRls(auth, async (client) => {
      const existing = await one<{ id: string }>(
        client,
        `select id from erp.hr_attendance
          where employee_id = $1 and attendance_date = $2`,
        [employeeId, input.date],
      )

      const row = await one(
        client,
        `insert into erp.hr_attendance_corrections
           (org_id, employee_id, attendance_id, correction_date, requested_status,
            check_in, check_out, reason)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7)
         returning *`,
        [
          employeeId,
          existing?.id ?? null,
          input.date,
          input.requestedStatus,
          input.checkIn ?? null,
          input.checkOut ?? null,
          input.reason,
        ],
      )

      const name = await one<{ name: string }>(
        client,
        'select first_name || \' \' || last_name as name from erp.hr_employees where id = $1',
        [employeeId],
      )

      await raiseApproval(client, {
        entityType: 'hr_attendance_correction',
        entityId: row!.id,
        title: `Attendance correction for ${name?.name ?? 'employee'} on ${input.date}`,
        stage: 'manager',
        assignedRole: 'hr.attendance.approve',
      })
      await audit(client, 'hr.attendance_correction.requested', 'hr_attendance_corrections', row!.id, input.reason)

      return row!
    })

    sendData(res, mapCorrection({ ...correction, employee_name: '' }), 201)
  },
)

const decideSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
  remarks: optionalText(1000),
})

attendanceRouter.post(
  '/attendance/corrections/:id/decide',
  requirePermission('hr.attendance.approve'),
  validateBody(decideSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof decideSchema>>(req)

    if (input.decision === 'Rejected' && !input.remarks) {
      throw AppError.badRequest('A remark is required when rejecting a correction')
    }

    const correction = await withRls(auth, async (client) => {
      const current = await one(
        client,
        `select * from erp.hr_attendance_corrections where id = $1 for update`,
        [id],
      )
      if (!current) throw AppError.notFound('Correction request not found')
      if (current.status !== 'Pending') {
        throw AppError.conflict(`This correction was already ${String(current.status).toLowerCase()}`)
      }

      await decideEntityApproval(
        client,
        'hr_attendance_correction',
        id,
        input.decision,
        input.remarks ?? null,
      )

      const updated = await one(
        client,
        `update erp.hr_attendance_corrections
            set status = $2, reviewed_by = erp.current_user_id(), reviewed_at = now(),
                remarks = $3, updated_at = now()
          where id = $1
          returning *`,
        [id, input.decision, input.remarks ?? null],
      )

      // `erp.hr_apply_attendance_correction` (migration 033) applies the
      // approved correction to the attendance register. Do not duplicate it.

      await audit(
        client,
        `hr.attendance_correction.${input.decision.toLowerCase()}`,
        'hr_attendance_corrections',
        id,
        input.remarks ?? input.decision,
      )

      return updated!
    })

    sendData(res, mapCorrection({ ...correction, employee_name: '' }))
  },
)
