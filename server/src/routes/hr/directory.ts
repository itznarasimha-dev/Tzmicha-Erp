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
  type Pagination,
} from '../../http.js'
import { hasPermission, requirePermission } from '../../middleware/auth.js'
import {
  mapActivity,
  mapDepartment,
  mapDesignation,
  mapEmployee,
  mapHoliday,
  mapLeaveType,
  num,
} from '../../mappers/hr.js'
import { createFilter } from '../../lib/sql.js'
import {
  dateOnlySchema,
  optionalDate,
  optionalText,
  optionalUuid,
  paginationQuerySchema,
  percentageSchema,
  uuidSchema,
} from '../../lib/validation.js'

export const directoryRouter = Router()

// ---------------------------------------------------------------------------
// Shared SQL
// ---------------------------------------------------------------------------
const EMPLOYEE_SELECT = `
  e.id, e.user_id, e.first_name, e.last_name, e.photo_url, e.personal_email,
  e.date_of_birth, e.gender, e.phone, e.address, e.emergency_contact,
  e.joining_date, e.employment_type, e.employee_status,
  e.department_id, d.name as department_name,
  e.designation_id, dg.name as designation_name,
  e.manager_id, m.first_name || ' ' || m.last_name as manager_name,
  e.work_location, e.bank_account_masked, e.bank_ifsc, e.current_ctc,
  e.skills, e.bio, e.terminated_at, e.created_at, e.updated_at,
  u.email, u.employee_code
`

const EMPLOYEE_FROM = `
  from erp.hr_employees e
  join erp.users u on u.id = e.user_id
  left join erp.departments d on d.id = e.department_id
  left join erp.designations dg on dg.id = e.designation_id
  left join erp.hr_employees m on m.id = e.manager_id
`

const employeeListQuery = z.object({
  q: z.string().trim().max(120).optional(),
  departmentId: optionalUuid,
  designationId: optionalUuid,
  status: z
    .enum(['Active', 'Probation', 'On Leave', 'Notice Period', 'Terminated'])
    .optional(),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).optional(),
  sort: z
    .enum(['name:asc', 'name:desc', 'joiningDate:asc', 'joiningDate:desc', 'createdAt:asc', 'createdAt:desc'])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

type EmployeeListQuery = z.infer<typeof employeeListQuery>

const employeeCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(32).optional(),
  personalEmail: z.string().trim().email().max(255).optional(),
  departmentId: optionalUuid,
  designationId: optionalUuid,
  managerId: optionalUuid,
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).default('Full-time'),
  employeeStatus: z
    .enum(['Active', 'Probation', 'On Leave', 'Notice Period', 'Terminated'])
    .default('Active'),
  joiningDate: dateOnlySchema,
  workLocation: optionalText(160),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dateOfBirth: optionalDate,
  address: optionalText(500),
  emergencyContact: optionalText(160),
  bankAccountMasked: z
    .string()
    .trim()
    .max(40)
    .regex(/^[Xx*•\d\s-]*$/, 'Only a masked account number may be stored')
    .optional(),
  bankIfsc: z.string().trim().max(16).optional(),
  currentCtc: z.coerce.number().finite().min(0).optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
  bio: optionalText(2000),
  roleCode: z.string().trim().max(40).optional(),
  authUserId: uuidSchema.optional(),
})

const employeeUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: optionalText(32),
  personalEmail: z.string().trim().email().max(255).optional(),
  departmentId: optionalUuid,
  designationId: optionalUuid,
  managerId: optionalUuid,
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).optional(),
  employeeStatus: z
    .enum(['Active', 'Probation', 'On Leave', 'Notice Period', 'Terminated'])
    .optional(),
  joiningDate: dateOnlySchema.optional(),
  workLocation: optionalText(160),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dateOfBirth: optionalDate,
  address: optionalText(500),
  emergencyContact: optionalText(160),
  bankAccountMasked: z.string().trim().max(40).optional(),
  bankIfsc: z.string().trim().max(16).optional(),
  currentCtc: z.coerce.number().finite().min(0).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  bio: optionalText(2000),
})

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------
directoryRouter.get(
  '/employees',
  requirePermission('hr.employee.read'),
  validateQuery(employeeListQuery),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<EmployeeListQuery>(req)
    const pagination = parsePagination(query)
    const sort = parseSort(
      query.sort,
      {
        name: 'e.first_name',
        joiningDate: 'e.joining_date',
        createdAt: 'e.created_at',
      },
      'createdAt',
    )

    const data = await withRls(auth, async (client) => {
      const filter = createFilter()
      filter.raw('e.deleted_at is null')
      filter.equal('e.department_id', query.departmentId)
      filter.equal('e.designation_id', query.designationId)
      filter.equal('e.employee_status', query.status)
      filter.equal('e.employment_type', query.employmentType)
      filter.search(
        ['e.first_name', 'e.last_name', 'u.email', 'u.employee_code', 'e.phone'],
        query.q,
      )

      const total = await count(
        client,
        `select count(*)::text as total ${EMPLOYEE_FROM} ${filter.where}`,
        filter.params,
      )

      const limitPlaceholder = filter.param(pagination.pageSize)
      const offsetPlaceholder = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM} ${filter.where}
          order by ${sort.clause} nulls last, e.id
          limit ${limitPlaceholder} offset ${offsetPlaceholder}`,
        filter.params,
      )

      const canReadSalary =
        hasPermission(auth, 'hr.salary.read') || hasPermission(auth, 'hr.payroll.prepare')

      return paginated(
        rows.map((row) =>
          mapEmployee(row, {
            includeSalary: canReadSalary || row.user_id === auth.userId,
          }),
        ),
        total,
        pagination,
      )
    }, { readOnly: true })

    res.json(data)
  },
)

directoryRouter.get('/employees/:id', requirePermission('hr.employee.read'), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(auth, async (client) => {
    const employee = await one(
      client,
      `select ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM} where e.id = $1 and e.deleted_at is null`,
      [id],
    )
    if (!employee) throw AppError.notFound('Employee not found')

    const canReadSalary =
      hasPermission(auth, 'hr.salary.read') ||
      hasPermission(auth, 'hr.payroll.prepare') ||
      employee.user_id === auth.userId

    const [documents, salaryRows, leaveBalances] = await Promise.all([
      many(
        client,
        `select id, doc_type, name, storage_path, mime_type, size_bytes, status,
                verified_at, uploaded_by, created_at
           from erp.hr_employee_documents
          where employee_id = $1
          order by created_at desc`,
        [id],
      ),
      canReadSalary
        ? many(
            client,
            `select * from erp.hr_salary_structures
              where employee_id = $1 order by effective_from desc limit 5`,
            [id],
          )
        : Promise.resolve([]),
      many(
        client,
        `select b.*, t.name as leave_type_name
           from erp.hr_leave_balances b
           join erp.hr_leave_types t on t.id = b.leave_type_id
          where b.employee_id = $1
          order by b.year desc, t.name`,
        [id],
      ),
    ])

    return {
      ...mapEmployee(employee, { includeSalary: canReadSalary }),
      documents: documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.mime_type ?? doc.doc_type,
        size: num(doc.size_bytes),
        uploadedAt: doc.created_at,
        status: doc.status,
        storagePath: doc.storage_path,
      })),
      salaryStructures: salaryRows.map((row) => ({
        id: row.id,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
        annualCtc: num(row.annual_ctc),
        basic: num(row.basic),
        hra: num(row.hra),
        allowances: num(row.allowances),
        deductions: num(row.deductions),
        employerPf: num(row.employer_pf),
        status: row.status,
      })),
      leaveBalances: leaveBalances.map((row) => ({
        id: row.id,
        leaveTypeId: row.leave_type_id,
        leaveType: row.leave_type_name,
        year: num(row.year),
        allocated: num(row.allocated),
        used: num(row.used),
        pending: num(row.pending),
        available: num(row.allocated) - num(row.used) - num(row.pending),
      })),
    }
  }, { readOnly: true })

  sendData(res, payload)
})

directoryRouter.post(
  '/employees',
  requirePermission('hr.employee.write'),
  validateBody(employeeCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof employeeCreateSchema>>(req)

    const employee = await withRls(auth, async (client) => {
      let managerUserId: string | null = null
      if (input.managerId) {
        const manager = await one<{ user_id: string }>(
          client,
          'select user_id from erp.hr_employees where id = $1 and deleted_at is null',
          [input.managerId],
        )
        if (!manager) throw AppError.badRequest('managerId does not reference an employee')
        managerUserId = manager.user_id
      }

      const created = await one<{ hr_create_user: string }>(
        client,
        `select erp.hr_create_user($1, $2, $3, $4, $5, $6, $7, $8) as hr_create_user`,
        [
          input.authUserId ?? null,
          input.email,
          `${input.firstName} ${input.lastName}`.trim(),
          input.phone ?? null,
          input.departmentId ?? null,
          input.designationId ?? null,
          managerUserId,
          input.roleCode ?? 'employee',
        ],
      )
      if (!created) throw AppError.badRequest('Could not create the ERP user')
      const userId = created.hr_create_user

      const inserted = await one<{ id: string }>(
        client,
        `insert into erp.hr_employees (
           org_id, user_id, first_name, last_name, date_of_birth, gender, personal_email,
           phone, address, emergency_contact, joining_date, employment_type, employee_status,
           department_id, designation_id, manager_id, work_location, bank_account_masked,
           bank_ifsc, current_ctc, skills, bio
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
           $13, $14, $15, $16, $17, $18, $19, $20::text[], $21
         ) returning id`,
        [
          userId,
          input.firstName,
          input.lastName,
          input.dateOfBirth ?? null,
          input.gender ?? null,
          input.personalEmail ?? null,
          input.phone ?? null,
          input.address ?? null,
          input.emergencyContact ?? null,
          input.joiningDate,
          input.employmentType,
          input.employeeStatus,
          input.departmentId ?? null,
          input.designationId ?? null,
          input.managerId ?? null,
          input.workLocation ?? null,
          input.bankAccountMasked ?? null,
          input.bankIfsc ?? null,
          input.currentCtc ?? null,
          input.skills,
          input.bio ?? null,
        ],
      )
      if (!inserted) throw AppError.badRequest('Could not create the employee profile')

      await audit(
        client,
        'hr.employee.created',
        'hr_employees',
        inserted.id,
        `Employee ${input.firstName} ${input.lastName} created`,
        null,
        { userId, departmentId: input.departmentId ?? null },
      )

      const row = await one(
        client,
        `select ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM} where e.id = $1`,
        [inserted.id],
      )
      return mapEmployee(row!, {
        includeSalary: hasPermission(auth, 'hr.salary.read'),
      })
    })

    sendData(res, employee, 201)
  },
)

directoryRouter.patch(
  '/employees/:id',
  requirePermission('hr.employee.write'),
  validateBody(employeeUpdateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof employeeUpdateSchema>>(req)

    const employee = await withRls(auth, async (client) => {
      const existing = await one<{ user_id: string; first_name: string; last_name: string }>(
        client,
        'select user_id, first_name, last_name from erp.hr_employees where id = $1 and deleted_at is null',
        [id],
      )
      if (!existing) throw AppError.notFound('Employee not found')

      let managerUserId: string | null = null
      if (input.managerId) {
        if (input.managerId === id) throw AppError.badRequest('An employee cannot manage themselves')
        const manager = await one<{ user_id: string }>(
          client,
          'select user_id from erp.hr_employees where id = $1 and deleted_at is null',
          [input.managerId],
        )
        if (!manager) throw AppError.badRequest('managerId does not reference an employee')
        managerUserId = manager.user_id
      }

      if (input.email || input.phone || input.departmentId || input.designationId || managerUserId) {
        const fullName =
          input.firstName || input.lastName
            ? `${input.firstName ?? existing.first_name} ${input.lastName ?? existing.last_name}`.trim()
            : null
        await client.query('select erp.hr_update_user($1, $2, $3, $4, $5, $6, $7, $8)', [
          existing.user_id,
          fullName,
          input.email ?? null,
          input.phone ?? null,
          input.departmentId ?? null,
          input.designationId ?? null,
          managerUserId,
          null,
        ])
      }

      const updates: string[] = []
      const values: unknown[] = []
      let index = 1
      const set = (column: string, value: unknown) => {
        if (value === undefined) return
        updates.push(`${column} = $${index}`)
        values.push(value)
        index += 1
      }

      set('first_name', input.firstName)
      set('last_name', input.lastName)
      set('phone', input.phone)
      set('personal_email', input.personalEmail)
      set('department_id', input.departmentId)
      set('designation_id', input.designationId)
      set('manager_id', input.managerId)
      set('employment_type', input.employmentType)
      set('employee_status', input.employeeStatus)
      set('joining_date', input.joiningDate)
      set('work_location', input.workLocation)
      set('gender', input.gender)
      set('date_of_birth', input.dateOfBirth)
      set('address', input.address)
      set('emergency_contact', input.emergencyContact)
      set('bank_account_masked', input.bankAccountMasked)
      set('bank_ifsc', input.bankIfsc)
      set('current_ctc', input.currentCtc === null ? null : input.currentCtc)
      set('skills', input.skills)
      set('bio', input.bio)

      if (updates.length > 0) {
        values.push(id)
        await client.query(
          `update erp.hr_employees set ${updates.join(', ')}, updated_at = now() where id = $${index}`,
          values,
        )
      }

      await audit(client, 'hr.employee.updated', 'hr_employees', id, 'Employee profile updated', null, {
        fields: Object.keys(input).filter((key) => (input as Record<string, unknown>)[key] !== undefined),
      })

      const row = await one(
        client,
        `select ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM} where e.id = $1`,
        [id],
      )
      return mapEmployee(row!, {
        includeSalary:
          hasPermission(auth, 'hr.salary.read') || row!.user_id === auth.userId,
      })
    })

    sendData(res, employee)
  },
)

directoryRouter.delete(
  '/employees/:id',
  requirePermission('hr.employee.write'),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)

    await withRls(auth, async (client) => {
      const existing = await one<{ user_id: string; employee_status: string }>(
        client,
        'select user_id, employee_status from erp.hr_employees where id = $1 and deleted_at is null',
        [id],
      )
      if (!existing) throw AppError.notFound('Employee not found')

      await client.query(
        `update erp.hr_employees
            set deleted_at = now(), terminated_at = now(),
                employee_status = 'Terminated', updated_at = now()
          where id = $1`,
        [id],
      )
      await client.query('select erp.hr_update_user($1, null, null, null, null, null, null, $2)', [
        existing.user_id,
        'inactive',
      ])
      await audit(
        client,
        'hr.employee.terminated',
        'hr_employees',
        id,
        'Employee soft-deleted (no data removed)',
        { status: existing.employee_status },
        { status: 'Terminated' },
      )
    })

    res.json({ data: { id, deleted: true } })
  },
)

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
const documentCreateSchema = z.object({
  docType: z.string().trim().max(60).default('Other'),
  name: z.string().trim().min(1).max(255),
  storagePath: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().max(120).optional(),
  sizeBytes: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
})

directoryRouter.post(
  '/employees/:id/documents',
  requirePermission('hr.document.write', 'hr.employee.write'),
  validateBody(documentCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const employeeId = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof documentCreateSchema>>(req)

    const document = await withRls(auth, async (client) => {
      const exists = await one(client, 'select 1 from erp.hr_employees where id = $1', [employeeId])
      if (!exists) throw AppError.notFound('Employee not found')

      const row = await one(
        client,
        `insert into erp.hr_employee_documents
           (org_id, employee_id, doc_type, name, storage_path, mime_type, size_bytes, uploaded_by)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, erp.current_user_id())
         returning id, doc_type, name, storage_path, mime_type, size_bytes, status, created_at`,
        [employeeId, input.docType, input.name, input.storagePath, input.mimeType ?? null, input.sizeBytes ?? null],
      )
      await audit(client, 'hr.document.uploaded', 'hr_employee_documents', row!.id, input.name)
      return row!
    })

    sendData(res, document, 201)
  },
)

directoryRouter.post(
  '/documents/:id/verify',
  requirePermission('hr.document.write', 'hr.employee.write'),
  validateBody(z.object({ status: z.enum(['Verified', 'Rejected']), remarks: optionalText(500) })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ status: 'Verified' | 'Rejected'; remarks?: string }>(req)

    const document = await withRls(auth, async (client) => {
      const row = await one(
        client,
        `update erp.hr_employee_documents
            set status = $2, verified_by = erp.current_user_id(),
                verified_at = now(), updated_at = now()
          where id = $1
          returning id, doc_type, name, storage_path, mime_type, size_bytes, status, created_at`,
        [id, input.status],
      )
      if (!row) throw AppError.notFound('Document not found')
      await audit(client, 'hr.document.verified', 'hr_employee_documents', id, input.status)
      return row
    })

    sendData(res, document)
  },
)

// ---------------------------------------------------------------------------
// Departments & designations
// ---------------------------------------------------------------------------
directoryRouter.get('/departments', requirePermission('hr.employee.read'), async (req, res) => {
  const auth = req.auth!
  const rows = await withRls(
    auth,
    (client) =>
      many(
        client,
        `select d.id, d.code, d.name, d.head_user_id, d.is_active,
                u.name as head_name,
                (select count(*) from erp.hr_employees e
                  where e.department_id = d.id and e.deleted_at is null)::int as headcount
           from erp.departments d
           left join erp.users u on u.id = d.head_user_id
          order by d.name`,
      ),
    { readOnly: true },
  )
  sendData(res, rows.map(mapDepartment))
})

directoryRouter.post(
  '/departments',
  requirePermission('hr.settings.write', 'hr.employee.write'),
  validateBody(
    z.object({
      code: z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, _ or -'),
      name: z.string().trim().min(1).max(120),
      headUserId: optionalUuid,
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<{ code: string; name: string; headUserId?: string }>(req)

    const row = await withRls(auth, async (client) => {
      const created = await one(
        client,
        `insert into erp.departments (org_id, code, name, head_user_id)
         values (erp.current_org_id(), $1, $2, $3)
         returning id, code, name, head_user_id, is_active`,
        [input.code, input.name, input.headUserId ?? null],
      )
      await audit(client, 'hr.department.created', 'departments', created!.id, input.name)
      return created!
    })

    sendData(res, mapDepartment({ ...row, headcount: 0 }), 201)
  },
)

directoryRouter.get('/designations', requirePermission('hr.employee.read'), async (req, res) => {
  const auth = req.auth!
  const rows = await withRls(
    auth,
    (client) =>
      many(
        client,
        `select dg.id, dg.code, dg.name, dg.level, dg.department_id, d.name as department_name
           from erp.designations dg
           left join erp.departments d on d.id = dg.department_id
          order by dg.name`,
      ),
    { readOnly: true },
  )
  sendData(res, rows.map(mapDesignation))
})

directoryRouter.post(
  '/designations',
  requirePermission('hr.settings.write', 'hr.employee.write'),
  validateBody(
    z.object({
      code: z.string().trim().min(1).max(20),
      name: z.string().trim().min(1).max(120),
      departmentId: optionalUuid,
      level: z.enum(['Junior', 'Mid', 'Senior', 'Lead', 'Head']).default('Mid'),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<{
      code: string
      name: string
      departmentId?: string
      level: string
    }>(req)

    const row = await withRls(auth, async (client) => {
      const created = await one(
        client,
        `insert into erp.designations (org_id, code, name, department_id, level)
         values (erp.current_org_id(), $1, $2, $3, $4)
         returning id, code, name, level, department_id`,
        [input.code, input.name, input.departmentId ?? null, input.level],
      )
      await audit(client, 'hr.designation.created', 'designations', created!.id, input.name)
      return created!
    })

    sendData(res, mapDesignation(row), 201)
  },
)

// ---------------------------------------------------------------------------
// Leave types, holidays, settings, activities
// ---------------------------------------------------------------------------
directoryRouter.get('/leave-types', requirePermission('hr.leave.read', 'hr.employee.read'), async (req, res) => {
  const auth = req.auth!
  const rows = await withRls(
    auth,
    (client) =>
      many(client, 'select * from erp.hr_leave_types order by name'),
    { readOnly: true },
  )
  sendData(res, rows.map(mapLeaveType))
})

directoryRouter.get('/holidays', requirePermission('hr.leave.read', 'hr.employee.read'), async (req, res) => {
  const auth = req.auth!
  const year = Number(req.query.year) || new Date().getFullYear()
  const rows = await withRls(
    auth,
    (client) =>
      many(
        client,
        `select * from erp.hr_holidays
          where extract(year from holiday_date) = $1
          order by holiday_date`,
        [year],
      ),
    { readOnly: true },
  )
  sendData(res, rows.map(mapHoliday))
})

directoryRouter.post(
  '/holidays',
  requirePermission('hr.settings.write', 'hr.employee.write'),
  validateBody(
    z.object({
      name: z.string().trim().min(1).max(120),
      date: dateOnlySchema,
      type: z.enum(['Public', 'Company', 'Optional']).default('Public'),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<{ name: string; date: string; type: string }>(req)

    const row = await withRls(auth, async (client) => {
      const created = await one(
        client,
        `insert into erp.hr_holidays (org_id, name, holiday_date, holiday_type)
         values (erp.current_org_id(), $1, $2, $3)
         returning *`,
        [input.name, input.date, input.type],
      )
      await audit(client, 'hr.holiday.created', 'hr_holidays', created!.id, input.name)
      return created!
    })

    sendData(res, mapHoliday(row), 201)
  },
)

directoryRouter.delete(
  '/holidays/:id',
  requirePermission('hr.settings.write'),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    await withRls(auth, async (client) => {
      const deleted = await client.query('delete from erp.hr_holidays where id = $1 returning id', [id])
      if (deleted.rowCount === 0) throw AppError.notFound('Holiday not found')
      await audit(client, 'hr.holiday.deleted', 'hr_holidays', id, null)
    })
    res.json({ data: { id, deleted: true } })
  },
)

directoryRouter.get('/settings', requirePermission('hr.settings.write', 'hr.employee.read'), async (req, res) => {
  const auth = req.auth!
  const row = await withRls(
    auth,
    (client) => one(client, 'select data, updated_at from erp.hr_settings where org_id = erp.current_org_id()'),
    { readOnly: true },
  )
  sendData(res, { data: row?.data ?? {}, updatedAt: row?.updated_at ?? null })
})

directoryRouter.put(
  '/settings',
  requirePermission('hr.settings.write'),
  validateBody(z.object({ data: z.record(z.string(), z.unknown()) })),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<{ data: Record<string, unknown> }>(req)

    const row = await withRls(auth, async (client) => {
      const saved = await one(
        client,
        `insert into erp.hr_settings (org_id, data, updated_by)
         values (erp.current_org_id(), $1::jsonb, erp.current_user_id())
         on conflict (org_id) do update
           set data = excluded.data, updated_by = excluded.updated_by, updated_at = now()
         returning data, updated_at`,
        [JSON.stringify(input.data)],
      )
      await audit(client, 'hr.settings.updated', 'hr_settings', auth.orgId, 'HR settings updated')
      return saved!
    })

    sendData(res, { data: row.data, updatedAt: row.updated_at })
  },
)

directoryRouter.get('/activities', requirePermission('hr.employee.read'), async (req, res) => {
  const auth = req.auth!
  const pagination = parsePagination(req.query)
  const rows = await withRls(
    auth,
    (client) =>
      many(
        client,
        `select * from erp.hr_activities
          order by created_at desc
          limit $1 offset $2`,
        [pagination.pageSize, pagination.offset],
      ),
    { readOnly: true },
  )
  sendData(res, rows.map(mapActivity))
})
