import crypto from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, count, audit } from '../../db/transaction.js'
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
import { hasPermission, requirePermission } from '../../middleware/auth.js'
import {
  mapCandidate,
  mapEmployeeRequest,
  mapInterview,
  mapJobOpening,
  mapOffboarding,
  mapOnboarding,
  mapReview,
} from '../../mappers/hr.js'
import { createFilter } from '../../lib/sql.js'
import { dateOnlySchema, optionalText, optionalUuid, uuidSchema } from '../../lib/validation.js'

export const talentRouter = Router()

// ---------------------------------------------------------------------------
// Job openings
// ---------------------------------------------------------------------------
const JOB_FROM = `
  from erp.hr_job_openings j
  left join erp.departments d on d.id = j.department_id
  left join erp.users u on u.id = j.hiring_manager_id
`

const JOB_SELECT = `
  j.*, d.name as department_name, u.name as hiring_manager_name,
  (select count(*) from erp.hr_candidates c where c.job_id = j.id)::int as candidate_count
  ${JOB_FROM}
`

talentRouter.get(
  '/jobs',
  requirePermission('hr.recruitment.read'),
  validateQuery(
    z.object({
      status: z.enum(['Open', 'On Hold', 'Closed']).optional(),
      departmentId: optionalUuid,
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<{ status?: string; departmentId?: string }>(req)
    const pagination = parsePagination(req.query)

    const result = await withRls(auth, async (client) => {
      const filter = createFilter()
      filter.equal('j.status', query.status)
      filter.equal('j.department_id', query.departmentId)
      const total = await count(client, `select count(*)::text as total ${JOB_FROM} ${filter.where}`, filter.params)
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${JOB_SELECT} ${filter.where} order by j.posted_on desc limit ${limit} offset ${offset}`,
        filter.params,
      )
      return paginated(rows.map(mapJobOpening), total, pagination)
    }, { readOnly: true })

    res.json(result)
  },
)

const jobCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  departmentId: optionalUuid,
  location: optionalText(160),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).default('Full-time'),
  postedOn: dateOnlySchema.optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['Open', 'On Hold', 'Closed']).default('Open'),
  hiringManagerId: optionalUuid,
  openings: z.coerce.number().int().min(1).max(500).default(1),
  description: optionalText(4000),
})

talentRouter.post(
  '/jobs',
  requirePermission('hr.recruitment.write'),
  validateBody(jobCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof jobCreateSchema>>(req)

    const job = await withRls(auth, async (client) => {
      const row = await one<{ id: string }>(
        client,
        `insert into erp.hr_job_openings
           (org_id, title, department_id, location, employment_type, posted_on, deadline,
            status, hiring_manager_id, openings, description)
         values (erp.current_org_id(), $1, $2, $3, $4, coalesce($5::date, current_date), $6,
                 $7, $8, $9, $10)
         returning id`,
        [
          input.title,
          input.departmentId ?? null,
          input.location ?? null,
          input.employmentType,
          input.postedOn ?? null,
          input.deadline ?? null,
          input.status,
          input.hiringManagerId ?? null,
          input.openings,
          input.description ?? null,
        ],
      )
      await audit(client, 'hr.job.created', 'hr_job_openings', row!.id, input.title)
      return mapJobOpening((await one(client, `select ${JOB_SELECT} where j.id = $1`, [row!.id]))!)
    })

    sendData(res, job, 201)
  },
)

talentRouter.patch(
  '/jobs/:id',
  requirePermission('hr.recruitment.write'),
  validateBody(jobCreateSchema.partial()),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof jobCreateSchema>>(req)

    const job = await withRls(auth, async (client) => {
      const updates: string[] = []
      const values: unknown[] = []
      let index = 1
      const set = (column: string, value: unknown) => {
        if (value === undefined) return
        updates.push(`${column} = $${index++}`)
        values.push(value)
      }
      set('title', input.title)
      set('department_id', input.departmentId)
      set('location', input.location)
      set('employment_type', input.employmentType)
      set('posted_on', input.postedOn)
      set('deadline', input.deadline)
      set('status', input.status)
      set('hiring_manager_id', input.hiringManagerId)
      set('openings', input.openings)
      set('description', input.description)

      if (updates.length === 0) throw AppError.badRequest('No fields supplied')
      values.push(id)
      const updated = await client.query(
        `update erp.hr_job_openings set ${updates.join(', ')}, updated_at = now() where id = $${index} returning id`,
        values,
      )
      if (updated.rowCount === 0) throw AppError.notFound('Job opening not found')
      await audit(client, 'hr.job.updated', 'hr_job_openings', id, null)
      return mapJobOpening((await one(client, `select ${JOB_SELECT} where j.id = $1`, [id]))!)
    })

    sendData(res, job)
  },
)

// ---------------------------------------------------------------------------
// Candidates & interviews
// ---------------------------------------------------------------------------
const CANDIDATE_FROM = `
  from erp.hr_candidates c
  left join erp.hr_job_openings j on j.id = c.job_id
`

const CANDIDATE_SELECT = `
  c.*, j.title as job_title
  ${CANDIDATE_FROM}
`

talentRouter.get(
  '/candidates',
  requirePermission('hr.recruitment.read'),
  validateQuery(
    z.object({
      jobId: optionalUuid,
      stage: z.enum(['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']).optional(),
      q: z.string().trim().max(120).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<{ jobId?: string; stage?: string; q?: string }>(req)
    const pagination = parsePagination(req.query)

    const result = await withRls(auth, async (client) => {
      const filter = createFilter()
      filter.equal('c.job_id', query.jobId)
      filter.equal('c.stage', query.stage)
      filter.search(['c.name', 'c.email', 'c.phone'], query.q)
      const total = await count(client, `select count(*)::text as total ${CANDIDATE_FROM} ${filter.where}`, filter.params)
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${CANDIDATE_SELECT} ${filter.where} order by c.applied_on desc limit ${limit} offset ${offset}`,
        filter.params,
      )
      return paginated(rows.map(mapCandidate), total, pagination)
    }, { readOnly: true })

    res.json(result)
  },
)

talentRouter.get('/candidates/:id', requirePermission('hr.recruitment.read'), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(auth, async (client) => {
    const candidate = await one(client, `select ${CANDIDATE_SELECT} where c.id = $1`, [id])
    if (!candidate) throw AppError.notFound('Candidate not found')
    const interviews = await many(
      client,
      `select i.*, u.name as interviewer_name
         from erp.hr_interviews i
         left join erp.users u on u.id = i.interviewer_id
        where i.candidate_id = $1 order by i.interview_date desc`,
      [id],
    )
    return { ...mapCandidate(candidate), interviews: interviews.map(mapInterview) }
  }, { readOnly: true })

  sendData(res, payload)
})

const candidateCreateSchema = z.object({
  jobId: optionalUuid,
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().optional(),
  phone: optionalText(32),
  stage: z.enum(['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']).default('Applied'),
  appliedOn: dateOnlySchema.optional(),
  source: optionalText(80),
  resumePath: optionalText(500),
  rating: z.coerce.number().min(0).max(5).optional(),
  experienceYears: z.coerce.number().min(0).max(60).optional(),
  currentCompany: optionalText(160),
  expectedSalary: z.coerce.number().min(0).optional(),
  notes: optionalText(2000),
})

talentRouter.post(
  '/candidates',
  requirePermission('hr.recruitment.write'),
  validateBody(candidateCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof candidateCreateSchema>>(req)

    const candidate = await withRls(auth, async (client) => {
      const row = await one<{ id: string }>(
        client,
        `insert into erp.hr_candidates
           (org_id, job_id, name, email, phone, stage, applied_on, source, resume_path,
            rating, experience_years, current_company, expected_salary, notes)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, coalesce($6::date, current_date),
                 $7, $8, $9, $10, $11, $12, $13)
         returning id`,
        [
          input.jobId ?? null,
          input.name,
          input.email ?? null,
          input.phone ?? null,
          input.stage,
          input.appliedOn ?? null,
          input.source ?? null,
          input.resumePath ?? null,
          input.rating ?? null,
          input.experienceYears ?? null,
          input.currentCompany ?? null,
          input.expectedSalary ?? null,
          input.notes ?? null,
        ],
      )
      await audit(client, 'hr.candidate.created', 'hr_candidates', row!.id, input.name)
      return mapCandidate((await one(client, `select ${CANDIDATE_SELECT} where c.id = $1`, [row!.id]))!)
    })

    sendData(res, candidate, 201)
  },
)

const candidateUpdateSchema = candidateCreateSchema.partial().extend({
  offerSalary: z.coerce.number().min(0).optional(),
  offerStatus: z.enum(['Sent', 'Accepted', 'Declined']).optional(),
  rejectionReason: optionalText(1000),
})

talentRouter.patch(
  '/candidates/:id',
  requirePermission('hr.recruitment.write'),
  validateBody(candidateUpdateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof candidateUpdateSchema>>(req)

    const candidate = await withRls(auth, async (client) => {
      const current = await one<{ stage: string }>(
        client,
        'select stage from erp.hr_candidates where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Candidate not found')
      if (current.stage === 'Hired' && input.stage && input.stage !== 'Hired') {
        throw AppError.conflict('A hired candidate cannot be moved back in the pipeline')
      }
      if (input.stage === 'Rejected' && !input.rejectionReason) {
        // Allow an existing reason to carry over.
        const existingReason = await one<{ rejection_reason: string | null }>(
          client,
          'select rejection_reason from erp.hr_candidates where id = $1',
          [id],
        )
        if (!existingReason?.rejection_reason) {
          throw AppError.badRequest('A rejection reason is required')
        }
      }

      const updates: string[] = []
      const values: unknown[] = []
      let index = 1
      const set = (column: string, value: unknown) => {
        if (value === undefined) return
        updates.push(`${column} = $${index++}`)
        values.push(value)
      }
      set('job_id', input.jobId)
      set('name', input.name)
      set('email', input.email)
      set('phone', input.phone)
      set('stage', input.stage)
      set('applied_on', input.appliedOn)
      set('source', input.source)
      set('resume_path', input.resumePath)
      set('rating', input.rating)
      set('experience_years', input.experienceYears)
      set('current_company', input.currentCompany)
      set('expected_salary', input.expectedSalary)
      set('offer_salary', input.offerSalary)
      set('offer_status', input.offerStatus)
      set('rejection_reason', input.rejectionReason)
      set('notes', input.notes)

      if (updates.length === 0) throw AppError.badRequest('No fields supplied')
      values.push(id)
      await client.query(
        `update erp.hr_candidates set ${updates.join(', ')}, updated_at = now() where id = $${index}`,
        values,
      )
      await audit(client, 'hr.candidate.updated', 'hr_candidates', id, input.stage ?? null)
      return mapCandidate((await one(client, `select ${CANDIDATE_SELECT} where c.id = $1`, [id]))!)
    })

    sendData(res, candidate)
  },
)

const interviewCreateSchema = z.object({
  round: z.string().trim().min(1).max(80),
  date: dateOnlySchema,
  time: optionalText(20),
  interviewerId: optionalUuid,
  interviewerName: optionalText(160),
  mode: z.enum(['Video', 'On-site', 'Phone']).default('Video'),
})

talentRouter.post(
  '/candidates/:id/interviews',
  requirePermission('hr.recruitment.write'),
  validateBody(interviewCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof interviewCreateSchema>>(req)

    const interview = await withRls(auth, async (client) => {
      const candidate = await one(client, 'select id from erp.hr_candidates where id = $1', [id])
      if (!candidate) throw AppError.notFound('Candidate not found')

      const row = await one(
        client,
        `insert into erp.hr_interviews
           (org_id, candidate_id, round, interview_date, interview_time, interviewer_id,
            interviewer_name, mode)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7)
         returning *`,
        [
          id,
          input.round,
          input.date,
          input.time ?? null,
          input.interviewerId ?? null,
          input.interviewerName ?? null,
          input.mode,
        ],
      )
      await client.query(
        `update erp.hr_candidates set stage = 'Interview', updated_at = now()
          where id = $1 and stage in ('Applied','Screening')`,
        [id],
      )
      await audit(client, 'hr.interview.scheduled', 'hr_interviews', row!.id, input.round)
      return mapInterview(row!)
    })

    sendData(res, interview, 201)
  },
)

talentRouter.post(
  '/interviews/:id/feedback',
  requirePermission('hr.recruitment.write'),
  validateBody(z.object({ feedback: z.string().trim().min(5).max(4000), rating: z.coerce.number().min(0).max(5).optional() })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ feedback: string; rating?: number }>(req)

    const interview = await withRls(auth, async (client) => {
      const row = await one(
        client,
        `update erp.hr_interviews
            set feedback = $2, rating = coalesce($3, rating), updated_at = now()
          where id = $1 returning *`,
        [id, input.feedback, input.rating ?? null],
      )
      if (!row) throw AppError.notFound('Interview not found')
      await audit(client, 'hr.interview.feedback', 'hr_interviews', id, null)
      return mapInterview(row)
    })

    sendData(res, interview)
  },
)

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------
const ONBOARDING_FROM = `
  from erp.hr_onboarding_records o
  left join erp.departments d on d.id = o.department_id
  left join erp.users u on u.id = o.manager_id
`

const ONBOARDING_SELECT = `
  o.*, d.name as department_name, u.name as manager_name
  ${ONBOARDING_FROM}
`

talentRouter.get('/onboarding', requirePermission('hr.onboarding.read'), async (req, res) => {
  const auth = req.auth!
  const rows = await withRls(
    auth,
    (client) =>
      many(
        client,
        `select ${ONBOARDING_SELECT} order by o.joining_date desc limit 300`,
      ),
    { readOnly: true },
  )
  sendData(res, rows.map(mapOnboarding))
})

const onboardingCreateSchema = z.object({
  employeeId: optionalUuid,
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().optional(),
  designationId: optionalUuid,
  designation: optionalText(120),
  departmentId: optionalUuid,
  managerId: optionalUuid,
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).default('Full-time'),
  joiningDate: dateOnlySchema,
  status: z.enum(['Not Started', 'In Progress', 'Ready', 'Completed']).default('Not Started'),
  checklist: z.array(z.record(z.string(), z.unknown())).default([]),
  systems: z.array(z.record(z.string(), z.unknown())).default([]),
  notes: optionalText(2000),
})

talentRouter.post(
  '/onboarding',
  requirePermission('hr.onboarding.write'),
  validateBody(onboardingCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof onboardingCreateSchema>>(req)

    const record = await withRls(auth, async (client) => {
      const row = await one<{ id: string }>(
        client,
        `insert into erp.hr_onboarding_records
           (org_id, employee_id, name, email, designation_id, designation, department_id,
            manager_id, employment_type, joining_date, status, checklist, systems, notes)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                 $11::jsonb, $12::jsonb, $13)
         returning id`,
        [
          input.employeeId ?? null,
          input.name,
          input.email ?? null,
          input.designationId ?? null,
          input.designation ?? null,
          input.departmentId ?? null,
          input.managerId ?? null,
          input.employmentType,
          input.joiningDate,
          input.status,
          JSON.stringify(input.checklist),
          JSON.stringify(input.systems),
          input.notes ?? null,
        ],
      )
      await audit(client, 'hr.onboarding.created', 'hr_onboarding_records', row!.id, input.name)
      return mapOnboarding((await one(client, `select ${ONBOARDING_SELECT} where o.id = $1`, [row!.id]))!)
    })

    sendData(res, record, 201)
  },
)

talentRouter.patch(
  '/onboarding/:id',
  requirePermission('hr.onboarding.write'),
  validateBody(onboardingCreateSchema.partial().extend({ employeeName: optionalText(160) })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof onboardingCreateSchema>>(req)

    const record = await withRls(auth, async (client) => {
      const updates: string[] = []
      const values: unknown[] = []
      let index = 1
      const set = (column: string, value: unknown) => {
        if (value === undefined) return
        updates.push(`${column} = $${index++}`)
        values.push(value)
      }
      set('employee_id', input.employeeId)
      set('name', input.name)
      set('email', input.email)
      set('designation_id', input.designationId)
      set('designation', input.designation)
      set('department_id', input.departmentId)
      set('manager_id', input.managerId)
      set('employment_type', input.employmentType)
      set('joining_date', input.joiningDate)
      set('status', input.status)
      set('notes', input.notes)
      if (input.checklist) {
        updates.push(`checklist = $${index++}::jsonb`)
        values.push(JSON.stringify(input.checklist))
      }
      if (input.systems) {
        updates.push(`systems = $${index++}::jsonb`)
        values.push(JSON.stringify(input.systems))
      }

      if (updates.length === 0) throw AppError.badRequest('No fields supplied')
      values.push(id)
      const updated = await client.query(
        `update erp.hr_onboarding_records set ${updates.join(', ')}, updated_at = now()
          where id = $${index} returning id`,
        values,
      )
      if (updated.rowCount === 0) throw AppError.notFound('Onboarding record not found')
      await audit(client, 'hr.onboarding.updated', 'hr_onboarding_records', id, input.status ?? null)
      return mapOnboarding((await one(client, `select ${ONBOARDING_SELECT} where o.id = $1`, [id]))!)
    })

    sendData(res, record)
  },
)

// ---------------------------------------------------------------------------
// Performance reviews
// ---------------------------------------------------------------------------
const REVIEW_FROM = `
  from erp.hr_performance_reviews r
  join erp.hr_employees e on e.id = r.employee_id
  left join erp.users u on u.id = r.manager_id
`

const REVIEW_SELECT = `
  r.*, e.first_name || ' ' || e.last_name as employee_name, u.name as manager_name
  ${REVIEW_FROM}
`

talentRouter.get(
  '/reviews',
  validateQuery(
    z.object({
      employeeId: optionalUuid,
      period: z.string().trim().max(20).optional(),
      status: z
        .enum(['Not Started', 'Self Assessment', 'Manager Review', 'HR Review', 'Completed'])
        .optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<{ employeeId?: string; period?: string; status?: string }>(req)
    const canReadAll = hasPermission(auth, 'hr.performance.read')
    if (!canReadAll && !auth.hrEmployeeId) throw AppError.forbidden('Missing permission: hr.performance.read')
    if (!canReadAll && query.employeeId && query.employeeId !== auth.hrEmployeeId) {
      throw AppError.forbidden('You may only view your own reviews')
    }

    const pagination = parsePagination(req.query)
    const result = await withRls(auth, async (client) => {
      const filter = createFilter()
      filter.equal('r.employee_id', canReadAll ? query.employeeId : auth.hrEmployeeId)
      filter.equal('r.period', query.period)
      filter.equal('r.status', query.status)
      const total = await count(client, `select count(*)::text as total ${REVIEW_FROM} ${filter.where}`, filter.params)
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${REVIEW_SELECT} ${filter.where} order by r.period desc limit ${limit} offset ${offset}`,
        filter.params,
      )
      return paginated(rows.map(mapReview), total, pagination)
    }, { readOnly: true })

    res.json(result)
  },
)

const reviewCreateSchema = z.object({
  employeeId: uuidSchema,
  period: z.string().trim().min(4).max(20),
  cycle: z.string().trim().min(1).max(60),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  managerId: optionalUuid,
  goals: z.array(z.record(z.string(), z.unknown())).default([]),
})

talentRouter.post(
  '/reviews',
  requirePermission('hr.performance.write'),
  validateBody(reviewCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof reviewCreateSchema>>(req)

    const review = await withRls(auth, async (client) => {
      const row = await one<{ id: string }>(
        client,
        `insert into erp.hr_performance_reviews
           (org_id, employee_id, period, cycle, due_date, manager_id, goals)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6::jsonb)
         returning id`,
        [
          input.employeeId,
          input.period,
          input.cycle,
          input.dueDate ?? null,
          input.managerId ?? null,
          JSON.stringify(input.goals),
        ],
      )
      await audit(client, 'hr.review.created', 'hr_performance_reviews', row!.id, `${input.period} ${input.cycle}`)
      return mapReview((await one(client, `select ${REVIEW_SELECT} where r.id = $1`, [row!.id]))!)
    })

    sendData(res, review, 201)
  },
)

const reviewUpdateSchema = z.object({
  status: z
    .enum(['Not Started', 'Self Assessment', 'Manager Review', 'HR Review', 'Completed'])
    .optional(),
  selfRating: z.coerce.number().min(0).max(5).optional(),
  managerRating: z.coerce.number().min(0).max(5).optional(),
  hrRating: z.coerce.number().min(0).max(5).optional(),
  goals: z.array(z.record(z.string(), z.unknown())).optional(),
  strengths: optionalText(4000),
  improvements: optionalText(4000),
  comments: optionalText(4000),
})

talentRouter.patch('/reviews/:id', validateBody(reviewUpdateSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<z.infer<typeof reviewUpdateSchema>>(req)

  const review = await withRls(auth, async (client) => {
    const current = await one<{ employee_id: string; status: string }>(
      client,
      'select employee_id, status from erp.hr_performance_reviews where id = $1 for update',
      [id],
    )
    if (!current) throw AppError.notFound('Review not found')

    const isOwner = current.employee_id === auth.hrEmployeeId
    if (!isOwner && !hasPermission(auth, 'hr.performance.write')) {
      throw AppError.forbidden('Missing permission: hr.performance.write')
    }
    // Employees may only update their self-assessment.
    if (isOwner && !hasPermission(auth, 'hr.performance.write')) {
      if (input.status && input.status !== 'Self Assessment') {
        throw AppError.forbidden('You may only submit your self assessment')
      }
      if (input.managerRating !== undefined || input.hrRating !== undefined) {
        throw AppError.forbidden('You cannot submit manager or HR ratings')
      }
    }

    const updates: string[] = []
    const values: unknown[] = []
    let index = 1
    const set = (column: string, value: unknown) => {
      if (value === undefined) return
      updates.push(`${column} = $${index++}`)
      values.push(value)
    }
    set('status', input.status)
    set('self_rating', input.selfRating)
    set('manager_rating', input.managerRating)
    set('hr_rating', input.hrRating)
    set('strengths', input.strengths)
    set('improvements', input.improvements)
    set('comments', input.comments)
    if (input.goals) {
      updates.push(`goals = $${index++}::jsonb`)
      values.push(JSON.stringify(input.goals))
    }
    if (input.status === 'Completed') {
      updates.push('completed_at = now()')
    }

    if (updates.length === 0) throw AppError.badRequest('No fields supplied')
    values.push(id)
    await client.query(
      `update erp.hr_performance_reviews set ${updates.join(', ')}, updated_at = now() where id = $${index}`,
      values,
    )
    await audit(client, 'hr.review.updated', 'hr_performance_reviews', id, input.status ?? null)
    return mapReview((await one(client, `select ${REVIEW_SELECT} where r.id = $1`, [id]))!)
  })

  sendData(res, review)
})

// ---------------------------------------------------------------------------
// Employee requests (HR helpdesk)
// ---------------------------------------------------------------------------
const REQUEST_FROM = `
  from erp.hr_employee_requests q
  join erp.hr_employees e on e.id = q.employee_id
  left join erp.users a on a.id = q.assigned_to
`

const REQUEST_SELECT = `
  q.*, e.first_name || ' ' || e.last_name as employee_name, a.name as assigned_to_name
  ${REQUEST_FROM}
`

talentRouter.get(
  '/requests',
  validateQuery(
    z.object({
      employeeId: optionalUuid,
      status: z.enum(['Open', 'In Progress', 'Resolved', 'Rejected']).optional(),
      priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<{ employeeId?: string; status?: string; priority?: string }>(req)
    const canReadAll = hasPermission(auth, 'hr.request.read')
    if (!canReadAll && !auth.hrEmployeeId) throw AppError.forbidden('Missing permission: hr.request.read')
    if (!canReadAll && query.employeeId && query.employeeId !== auth.hrEmployeeId) {
      throw AppError.forbidden('You may only view your own requests')
    }

    const pagination = parsePagination(req.query)
    const result = await withRls(auth, async (client) => {
      const filter = createFilter()
      filter.equal('q.employee_id', canReadAll ? query.employeeId : auth.hrEmployeeId)
      filter.equal('q.status', query.status)
      filter.equal('q.priority', query.priority)
      const total = await count(client, `select count(*)::text as total ${REQUEST_FROM} ${filter.where}`, filter.params)
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${REQUEST_SELECT} ${filter.where} order by q.created_at desc limit ${limit} offset ${offset}`,
        filter.params,
      )
      return paginated(rows.map(mapEmployeeRequest), total, pagination)
    }, { readOnly: true })

    res.json(result)
  },
)

const requestCreateSchema = z.object({
  employeeId: optionalUuid,
  type: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(4000),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
})

talentRouter.post('/requests', validateBody(requestCreateSchema), async (req, res) => {
  const auth = req.auth!
  const input = validatedBody<z.infer<typeof requestCreateSchema>>(req)

  const employeeId = input.employeeId ?? auth.hrEmployeeId
  if (!employeeId) throw AppError.badRequest('employeeId is required for this account')
  if (employeeId !== auth.hrEmployeeId && !hasPermission(auth, 'hr.request.write')) {
    throw AppError.forbidden('You may only raise requests for yourself')
  }

  const request = await withRls(auth, async (client) => {
    const row = await one<{ id: string }>(
      client,
      `insert into erp.hr_employee_requests
         (org_id, employee_id, request_type, subject, description, priority)
       values (erp.current_org_id(), $1, $2, $3, $4, $5)
       returning id`,
      [employeeId, input.type, input.subject, input.description, input.priority],
    )
    await audit(client, 'hr.request.created', 'hr_employee_requests', row!.id, input.subject)
    return mapEmployeeRequest((await one(client, `select ${REQUEST_SELECT} where q.id = $1`, [row!.id]))!)
  })

  sendData(res, request, 201)
})

const requestUpdateSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Rejected']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  assignedTo: optionalUuid,
})

talentRouter.patch(
  '/requests/:id',
  validateBody(requestUpdateSchema.extend({ response: optionalText(4000) })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof requestUpdateSchema> & { response?: string }>(req)

    const request = await withRls(auth, async (client) => {
      const current = await one<{ employee_id: string; responses: unknown[] }>(
        client,
        'select employee_id, responses from erp.hr_employee_requests where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Request not found')

      const isOwner = current.employee_id === auth.hrEmployeeId
      const canManage = hasPermission(auth, 'hr.request.write')
      if (!isOwner && !canManage) throw AppError.forbidden('Missing permission: hr.request.write')
      if (isOwner && !canManage && (input.status || input.assignedTo)) {
        throw AppError.forbidden('Only HR can change request status or assignment')
      }

      const updates: string[] = []
      const values: unknown[] = []
      let index = 1
      const set = (column: string, value: unknown) => {
        if (value === undefined) return
        updates.push(`${column} = $${index++}`)
        values.push(value)
      }
      set('status', input.status)
      set('priority', input.priority)
      set('assigned_to', input.assignedTo)
      if (input.status === 'Resolved') updates.push("resolved_at = now()")

      if (input.response) {
        const nextResponses = [
          ...(Array.isArray(current.responses) ? current.responses : []),
          {
            id: crypto.randomUUID(),
            author: auth.name,
            message: input.response,
            date: new Date().toISOString(),
          },
        ]
        updates.push(`responses = $${index++}::jsonb`)
        values.push(JSON.stringify(nextResponses))
      }

      if (updates.length === 0) throw AppError.badRequest('No fields supplied')
      values.push(id)
      await client.query(
        `update erp.hr_employee_requests set ${updates.join(', ')}, updated_at = now() where id = $${index}`,
        values,
      )
      await audit(client, 'hr.request.updated', 'hr_employee_requests', id, input.status ?? 'response added')
      return mapEmployeeRequest((await one(client, `select ${REQUEST_SELECT} where q.id = $1`, [id]))!)
    })

    sendData(res, request)
  },
)

// ---------------------------------------------------------------------------
// Offboarding
// ---------------------------------------------------------------------------
const OFFBOARDING_FROM = `
  from erp.hr_offboarding_records f
  join erp.hr_employees e on e.id = f.employee_id
`

const OFFBOARDING_SELECT = `
  f.*, e.first_name || ' ' || e.last_name as employee_name
  ${OFFBOARDING_FROM}
`

talentRouter.get('/offboarding', requirePermission('hr.offboarding.read'), async (req, res) => {
  const auth = req.auth!
  const rows = await withRls(
    auth,
    (client) => many(client, `select ${OFFBOARDING_SELECT} order by f.last_working_day desc limit 300`),
    { readOnly: true },
  )
  sendData(res, rows.map(mapOffboarding))
})

const offboardingCreateSchema = z.object({
  employeeId: uuidSchema,
  resignationDate: dateOnlySchema,
  lastWorkingDay: dateOnlySchema,
  reason: optionalText(1000),
  noticePeriodDays: z.coerce.number().int().min(0).max(365).default(0),
  clearances: z.array(z.record(z.string(), z.unknown())).default([]),
  settlementAmount: z.coerce.number().min(0).default(0),
})

talentRouter.post(
  '/offboarding',
  requirePermission('hr.offboarding.write'),
  validateBody(offboardingCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof offboardingCreateSchema>>(req)
    if (input.lastWorkingDay < input.resignationDate) {
      throw AppError.badRequest('lastWorkingDay must be on or after resignationDate')
    }

    const record = await withRls(auth, async (client) => {
      const employee = await one<{ id: string }>(
        client,
        'select id from erp.hr_employees where id = $1 and deleted_at is null',
        [input.employeeId],
      )
      if (!employee) throw AppError.notFound('Employee not found')

      const row = await one<{ id: string }>(
        client,
        `insert into erp.hr_offboarding_records
           (org_id, employee_id, resignation_date, last_working_day, reason,
            notice_period_days, clearances, settlement_amount, history)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb)
         returning id`,
        [
          input.employeeId,
          input.resignationDate,
          input.lastWorkingDay,
          input.reason ?? null,
          input.noticePeriodDays,
          JSON.stringify(input.clearances),
          input.settlementAmount,
          JSON.stringify([
            { id: crypto.randomUUID(), date: new Date().toISOString(), action: 'Offboarding initiated', actor: auth.name },
          ]),
        ],
      )

      await client.query(
        `update erp.hr_employees
            set employee_status = 'Notice Period', updated_at = now()
          where id = $1 and employee_status <> 'Terminated'`,
        [input.employeeId],
      )
      await audit(client, 'hr.offboarding.created', 'hr_offboarding_records', row!.id, input.lastWorkingDay)
      return mapOffboarding((await one(client, `select ${OFFBOARDING_SELECT} where f.id = $1`, [row!.id]))!)
    })

    sendData(res, record, 201)
  },
)

const offboardingUpdateSchema = z.object({
  status: z.enum(['In Progress', 'Clearance', 'Completed', 'Cancelled']).optional(),
  exitInterviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  exitInterviewNotes: optionalText(4000),
  clearances: z.array(z.record(z.string(), z.unknown())).optional(),
  settlementAmount: z.coerce.number().min(0).optional(),
  settlementStatus: z.enum(['Pending', 'Processing', 'Paid']).optional(),
  settlementNotes: optionalText(2000),
})

talentRouter.patch(
  '/offboarding/:id',
  requirePermission('hr.offboarding.write'),
  validateBody(offboardingUpdateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof offboardingUpdateSchema>>(req)

    const record = await withRls(auth, async (client) => {
      const current = await one<{ employee_id: string; history: unknown[] }>(
        client,
        'select employee_id, history from erp.hr_offboarding_records where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Offboarding record not found')

      const updates: string[] = []
      const values: unknown[] = []
      let index = 1
      const set = (column: string, value: unknown) => {
        if (value === undefined) return
        updates.push(`${column} = $${index++}`)
        values.push(value)
      }
      set('status', input.status)
      set('exit_interview_date', input.exitInterviewDate)
      set('exit_interview_notes', input.exitInterviewNotes)
      set('settlement_amount', input.settlementAmount)
      set('settlement_status', input.settlementStatus)
      set('settlement_notes', input.settlementNotes)
      if (input.clearances) {
        updates.push(`clearances = $${index++}::jsonb`)
        values.push(JSON.stringify(input.clearances))
      }

      const history = [
        ...(Array.isArray(current.history) ? current.history : []),
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          action: input.status ? `Status → ${input.status}` : 'Offboarding updated',
          actor: auth.name,
        },
      ]
      updates.push(`history = $${index++}::jsonb`)
      values.push(JSON.stringify(history))

      if (input.status === 'Completed') {
        updates.push('completed_at = now()')
      }

      values.push(id)
      await client.query(
        `update erp.hr_offboarding_records set ${updates.join(', ')}, updated_at = now() where id = $${index}`,
        values,
      )

      if (input.status === 'Completed') {
        await client.query(
          `update erp.hr_employees
              set employee_status = 'Terminated', terminated_at = now(), updated_at = now()
            where id = $1`,
          [current.employee_id],
        )
      }

      await audit(client, 'hr.offboarding.updated', 'hr_offboarding_records', id, input.status ?? null)
      return mapOffboarding((await one(client, `select ${OFFBOARDING_SELECT} where f.id = $1`, [id]))!)
    })

    sendData(res, record)
  },
)
