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
import { hasPermission, requirePermission, type AuthContext } from '../../middleware/auth.js'
import { mapActivityRecord, mapDealer, mapFieldVisit, mapSurvey } from '../../mappers/marketing.js'
import { buildUpdate, createFilter } from '../../lib/sql.js'
import {
  dateOnlySchema,
  dateTimeSchema,
  optionalText,
  optionalUuid,
  uuidSchema,
} from '../../lib/validation.js'
import { activeOrgUser } from './shared.js'

export const fieldRouter = Router()

function canManageVisits(auth: AuthContext): boolean {
  return auth.isAdmin || auth.permissions.has('marketing.visit.write')
}

/** Supervisors can see and edit the whole team's field activity. */
function canSuperviseVisits(auth: AuthContext): boolean {
  return auth.isAdmin || auth.permissions.has('marketing.analytics.read')
}

// ---------------------------------------------------------------------------
// Field visits
// ---------------------------------------------------------------------------
const VISIT_FROM = `
  from erp.mkt_field_visits v
  left join erp.users u on u.id = v.assigned_to
`

const VISIT_SELECT = `v.*, u.name as assigned_to_name ${VISIT_FROM}`

const visitQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled']).optional(),
  type: z.enum(['Field Visit', 'Store Visit', 'Demo', 'Dealer Visit']).optional(),
  assignedTo: optionalUuid,
  leadId: optionalUuid,
  customerId: optionalUuid,
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  sort: z.enum(['visitDate:asc', 'visitDate:desc', 'createdAt:asc', 'createdAt:desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

fieldRouter.get('/visits', requirePermission('marketing.visit.read'), validateQuery(visitQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof visitQuery>>(req)
  const pagination = parsePagination(query)
  const sort = parseSort(query.sort, { visitDate: 'v.visit_date', createdAt: 'v.created_at' }, 'visitDate')

  const result = await withRls(
    auth,
    async (client) => {
      const filter = createFilter()
      if (!canSuperviseVisits(auth)) filter.raw('v.assigned_to = erp.current_user_id()')
      filter.equal('v.status', query.status)
      filter.equal('v.visit_type', query.type)
      filter.equal('v.assigned_to', query.assignedTo)
      filter.equal('v.lead_id', query.leadId)
      filter.equal('v.customer_id', query.customerId)
      filter.gte('v.visit_date', query.from)
      filter.lte('v.visit_date', query.to)
      filter.search(['v.business', 'v.code', 'v.contact_name', 'v.contact_phone', 'v.location'], query.q)

      const total = await count(client, `select count(*)::text as total ${VISIT_FROM} ${filter.where}`, filter.params)
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${VISIT_SELECT} ${filter.where}
          order by ${sort.clause} nulls last, v.id
          limit ${limit} offset ${offset}`,
        filter.params,
      )
      return paginated(rows.map(mapFieldVisit), total, pagination)
    },
    { readOnly: true },
  )

  res.json(result)
})

fieldRouter.get('/visits/:id', requirePermission('marketing.visit.read'), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const visit = await withRls(
    auth,
    async (client) => {
      const row = await one(client, `select ${VISIT_SELECT} where v.id = $1`, [id])
      if (!row) throw AppError.notFound('Field visit not found')
      if (!canSuperviseVisits(auth) && row.assigned_to !== auth.userId) {
        throw AppError.forbidden('You may only view visits assigned to you')
      }
      return mapFieldVisit(row)
    },
    { readOnly: true },
  )

  sendData(res, visit)
})

const visitCreateSchema = z.object({
  business: z.string().trim().min(2).max(160),
  contactName: optionalText(120),
  contactPhone: optionalText(32),
  leadId: optionalUuid,
  customerId: optionalUuid,
  purpose: optionalText(500),
  type: z.enum(['Field Visit', 'Store Visit', 'Demo', 'Dealer Visit']).default('Field Visit'),
  date: dateOnlySchema,
  time: optionalText(20),
  location: optionalText(300),
  assignedTo: optionalUuid,
  notes: optionalText(2000),
  demoFollowUp: optionalText(500),
  checklist: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
})

fieldRouter.post(
  '/visits',
  requirePermission('marketing.visit.write'),
  validateBody(visitCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof visitCreateSchema>>(req)

    const visit = await withRls(auth, async (client) => {
      const assignedTo = input.assignedTo ?? auth.userId
      if (assignedTo !== auth.userId && !canSuperviseVisits(auth)) {
        throw AppError.forbidden('You may only create visits assigned to yourself')
      }
      await activeOrgUser(client, assignedTo, 'Assignee')
      if (input.leadId) {
        const lead = await one(client, 'select id from erp.mkt_leads where id = $1', [input.leadId])
        if (!lead) throw AppError.badRequest('leadId does not reference a lead')
      }
      if (input.customerId) {
        const customer = await one(client, 'select id from erp.customers where id = $1', [input.customerId])
        if (!customer) throw AppError.badRequest('customerId does not reference a customer')
      }

      const code = await nextDocNumber(client, auth.orgId, 'visit')
      const row = await one<{ id: string }>(
        client,
        `insert into erp.mkt_field_visits (
           org_id, code, business, contact_name, contact_phone, lead_id, customer_id,
           purpose, visit_type, visit_date, visit_time, location, assigned_to, notes,
           demo_follow_up, checklist, created_by
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
           $13, $14, $15::jsonb, erp.current_user_id()
         ) returning id`,
        [
          code,
          input.business,
          input.contactName ?? null,
          input.contactPhone ?? null,
          input.leadId ?? null,
          input.customerId ?? null,
          input.purpose ?? null,
          input.type,
          input.date,
          input.time ?? null,
          input.location ?? null,
          assignedTo,
          input.notes ?? null,
          input.demoFollowUp ?? null,
          JSON.stringify(input.checklist),
        ],
      )
      await audit(client, 'marketing.visit.created', 'mkt_field_visits', row!.id, `${code} · ${input.business}`, null, {
        assignedTo,
        date: input.date,
      })

      const full = await one(client, `select ${VISIT_SELECT} where v.id = $1`, [row!.id])
      return mapFieldVisit(full!)
    })

    sendData(res, visit, 201)
  },
)

const visitUpdateSchema = z.object({
  business: z.string().trim().min(2).max(160).optional(),
  contactName: optionalText(120),
  contactPhone: optionalText(32),
  leadId: optionalUuid,
  customerId: optionalUuid,
  purpose: optionalText(500),
  type: z.enum(['Field Visit', 'Store Visit', 'Demo', 'Dealer Visit']).optional(),
  date: dateOnlySchema.optional(),
  time: optionalText(20),
  location: optionalText(300),
  assignedTo: optionalUuid,
  notes: optionalText(2000),
  demoFollowUp: optionalText(500),
  checklist: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled']).optional(),
})

const VISIT_UPDATE_COLUMNS = {
  business: 'business',
  contactName: 'contact_name',
  contactPhone: 'contact_phone',
  leadId: 'lead_id',
  customerId: 'customer_id',
  purpose: 'purpose',
  type: 'visit_type',
  date: 'visit_date',
  time: 'visit_time',
  location: 'location',
  assignedTo: 'assigned_to',
  notes: 'notes',
  demoFollowUp: 'demo_follow_up',
  checklist: 'checklist',
  status: 'status',
} as const

fieldRouter.patch('/visits/:id', requirePermission('marketing.visit.write'), validateBody(visitUpdateSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<z.infer<typeof visitUpdateSchema>>(req)

  const visit = await withRls(auth, async (client) => {
    const current = await one<{ assigned_to: string | null; status: string }>(
      client,
      'select assigned_to, status from erp.mkt_field_visits where id = $1 for update',
      [id],
    )
    if (!current) throw AppError.notFound('Field visit not found')
    if (!canSuperviseVisits(auth) && current.assigned_to !== auth.userId) {
      throw AppError.forbidden('You may only update visits assigned to you')
    }
    if (
      input.assignedTo &&
      input.assignedTo !== auth.userId &&
      !canSuperviseVisits(auth)
    ) {
      throw AppError.forbidden('You may only assign visits to yourself')
    }
    if (input.assignedTo) await activeOrgUser(client, input.assignedTo, 'Assignee')

    const mapped: Record<string, unknown> = {}
    for (const [key, column] of Object.entries(VISIT_UPDATE_COLUMNS)) {
      const value = (input as Record<string, unknown>)[key]
      if (value === undefined) continue
      mapped[column] = key === 'checklist' ? JSON.stringify(value) : value
    }
    const fragment = buildUpdate(mapped, Object.values(VISIT_UPDATE_COLUMNS))
    if (fragment.text) {
      await client.query(
        `update erp.mkt_field_visits set ${fragment.text}, updated_at = now()
          where id = $${fragment.values.length + 1}`,
        [...fragment.values, id],
      )
    }
    await audit(client, 'marketing.visit.updated', 'mkt_field_visits', id, 'Visit updated', null, {
      fields: Object.keys(input).filter((key) => (input as Record<string, unknown>)[key] !== undefined),
    })

    const full = await one(client, `select ${VISIT_SELECT} where v.id = $1`, [id])
    return mapFieldVisit(full!)
  })

  sendData(res, visit)
})

fieldRouter.post('/visits/:id/check-in', validateBody(z.object({ notes: optionalText(2000) })), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<{ notes?: string }>(req)

  const visit = await withRls(auth, async (client) => {
    const current = await one<{ assigned_to: string | null; status: string }>(
      client,
      'select assigned_to, status from erp.mkt_field_visits where id = $1 for update',
      [id],
    )
    if (!current) throw AppError.notFound('Field visit not found')
    if (!canSuperviseVisits(auth) && current.assigned_to !== auth.userId) {
      throw AppError.forbidden('You can only check in to your own visit')
    }
    if (current.status !== 'Scheduled') {
      throw AppError.conflict(`This visit cannot be checked in (status: ${current.status})`)
    }

    await client.query(
      `update erp.mkt_field_visits
          set status = 'In Progress', check_in_at = now(),
              notes = coalesce($2, notes), updated_at = now()
        where id = $1`,
      [id, input.notes ?? null],
    )
    await audit(client, 'marketing.visit.checked_in', 'mkt_field_visits', id, 'Checked in')

    const full = await one(client, `select ${VISIT_SELECT} where v.id = $1`, [id])
    return mapFieldVisit(full!)
  })

  sendData(res, visit)
})

const checkOutSchema = z.object({
  outcome: z.string().trim().min(2).max(2000),
  competitorBrands: optionalText(500),
  samplesDispensed: optionalText(500),
  notes: optionalText(2000),
  checklist: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
})

fieldRouter.post('/visits/:id/check-out', validateBody(checkOutSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<z.infer<typeof checkOutSchema>>(req)

  const visit = await withRls(auth, async (client) => {
    const current = await one<{ assigned_to: string | null; status: string }>(
      client,
      'select assigned_to, status from erp.mkt_field_visits where id = $1 for update',
      [id],
    )
    if (!current) throw AppError.notFound('Field visit not found')
    if (!canSuperviseVisits(auth) && current.assigned_to !== auth.userId) {
      throw AppError.forbidden('You can only check out of your own visit')
    }
    if (current.status !== 'In Progress') {
      throw AppError.conflict('Only an in-progress visit can be checked out')
    }

    await client.query(
      `update erp.mkt_field_visits
          set status = 'Completed', check_out_at = now(), outcome = $2,
              competitor_brands = $3, samples_dispensed = $4,
              notes = coalesce($5, notes),
              checklist = coalesce($6::jsonb, checklist),
              updated_at = now()
        where id = $1`,
      [
        id,
        input.outcome,
        input.competitorBrands ?? null,
        input.samplesDispensed ?? null,
        input.notes ?? null,
        input.checklist ? JSON.stringify(input.checklist) : null,
      ],
    )
    await audit(client, 'marketing.visit.checked_out', 'mkt_field_visits', id, input.outcome)

    const full = await one(client, `select ${VISIT_SELECT} where v.id = $1`, [id])
    return mapFieldVisit(full!)
  })

  sendData(res, visit)
})

// ---------------------------------------------------------------------------
// Market surveys
// ---------------------------------------------------------------------------
const SURVEY_FROM = `
  from erp.mkt_market_surveys s
  left join erp.regions r on r.id = s.region_id
  left join erp.users u on u.id = s.submitted_by
`

const SURVEY_SELECT = `s.*, r.name as region_name, u.name as submitter_name ${SURVEY_FROM}`

const surveyQuery = z.object({
  q: z.string().trim().max(120).optional(),
  competitor: z.string().trim().max(120).optional(),
  regionId: optionalUuid,
  interest: z.enum(['High', 'Medium', 'Low']).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

fieldRouter.get('/surveys', requirePermission('marketing.survey.read'), validateQuery(surveyQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof surveyQuery>>(req)
  const pagination = parsePagination(query)

  const result = await withRls(
    auth,
    async (client) => {
      const filter = createFilter()
      filter.equal('s.region_id', query.regionId)
      filter.equal('s.interest', query.interest)
      filter.gte('s.survey_date', query.from)
      filter.lte('s.survey_date', query.to)
      filter.search(['s.competitor', 's.observation', 's.product_feedback', 's.pricing_observation'], query.q ?? query.competitor)

      const total = await count(client, `select count(*)::text as total ${SURVEY_FROM} ${filter.where}`, filter.params)
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${SURVEY_SELECT} ${filter.where}
          order by s.survey_date desc, s.id
          limit ${limit} offset ${offset}`,
        filter.params,
      )
      return paginated(rows.map(mapSurvey), total, pagination)
    },
    { readOnly: true },
  )

  res.json(result)
})

const surveyCreateSchema = z.object({
  competitor: z.string().trim().min(2).max(120),
  regionId: optionalUuid,
  region: optionalText(120),
  observation: z.string().trim().min(5).max(4000),
  productFeedback: optionalText(2000),
  interest: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  pricingObservation: optionalText(2000),
  date: dateOnlySchema.optional(),
})

fieldRouter.post(
  '/surveys',
  requirePermission('marketing.survey.write'),
  validateBody(surveyCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof surveyCreateSchema>>(req)

    const survey = await withRls(auth, async (client) => {
      if (input.regionId) {
        const region = await one(client, 'select id from erp.regions where id = $1', [input.regionId])
        if (!region) throw AppError.badRequest('regionId does not reference a region')
      }
      const row = await one<{ id: string }>(
        client,
        `insert into erp.mkt_market_surveys (
           org_id, competitor, region_id, region_text, observation, product_feedback,
           interest, pricing_observation, submitted_by, survey_date
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, erp.current_user_id(),
           coalesce($8::date, current_date)
         ) returning id`,
        [
          input.competitor,
          input.regionId ?? null,
          input.region ?? null,
          input.observation,
          input.productFeedback ?? null,
          input.interest,
          input.pricingObservation ?? null,
          input.date ?? null,
        ],
      )
      await audit(client, 'marketing.survey.submitted', 'mkt_market_surveys', row!.id, input.competitor)

      const full = await one(client, `select ${SURVEY_SELECT} where s.id = $1`, [row!.id])
      return mapSurvey(full!)
    })

    sendData(res, survey, 201)
  },
)

// ---------------------------------------------------------------------------
// Dealer prospects
// ---------------------------------------------------------------------------
const DEALER_FROM = `
  from erp.mkt_dealer_prospects d
  left join erp.users u on u.id = d.owner_user_id
`

const DEALER_SELECT = `d.*, u.name as owner_name ${DEALER_FROM}`

const dealerQuery = z.object({
  q: z.string().trim().max(120).optional(),
  stage: z.enum(['Prospect', 'Contacted', 'Interested', 'Onboarding', 'Onboarded', 'Rejected']).optional(),
  ownerUserId: optionalUuid,
  city: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

fieldRouter.get('/dealers', requirePermission('marketing.dealer.read'), validateQuery(dealerQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof dealerQuery>>(req)
  const pagination = parsePagination(query)

  const result = await withRls(
    auth,
    async (client) => {
      const filter = createFilter()
      filter.equal('d.stage', query.stage)
      filter.equal('d.owner_user_id', query.ownerUserId)
      filter.equal('d.city', query.city)
      filter.search(['d.code', 'd.business_name', 'd.contact_name', 'd.phone', 'd.email'], query.q)

      const total = await count(client, `select count(*)::text as total ${DEALER_FROM} ${filter.where}`, filter.params)
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${DEALER_SELECT} ${filter.where}
          order by d.created_at desc, d.id
          limit ${limit} offset ${offset}`,
        filter.params,
      )
      return paginated(rows.map(mapDealer), total, pagination)
    },
    { readOnly: true },
  )

  res.json(result)
})

const dealerCreateSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  contactName: optionalText(120),
  phone: optionalText(32),
  email: z.string().trim().email().max(255).optional(),
  city: optionalText(80),
  state: optionalText(80),
  address: optionalText(500),
  category: optionalText(80),
  stage: z.enum(['Prospect', 'Contacted', 'Interested', 'Onboarding', 'Onboarded', 'Rejected']).default('Prospect'),
  leadId: optionalUuid,
  customerId: optionalUuid,
  ownerUserId: optionalUuid,
  notes: optionalText(2000),
  nextFollowUp: dateOnlySchema.optional(),
})

fieldRouter.post(
  '/dealers',
  requirePermission('marketing.dealer.write'),
  validateBody(dealerCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof dealerCreateSchema>>(req)

    const dealer = await withRls(auth, async (client) => {
      const ownerId = input.ownerUserId ?? auth.userId
      await activeOrgUser(client, ownerId, 'Dealer owner')
      if (input.leadId) {
        const lead = await one(client, 'select id from erp.mkt_leads where id = $1', [input.leadId])
        if (!lead) throw AppError.badRequest('leadId does not reference a lead')
      }
      if (input.customerId) {
        const customer = await one(client, 'select id from erp.customers where id = $1', [input.customerId])
        if (!customer) throw AppError.badRequest('customerId does not reference a customer')
      }

      const code = await nextDocNumber(client, auth.orgId, 'dealer')
      const row = await one<{ id: string }>(
        client,
        `insert into erp.mkt_dealer_prospects (
           org_id, code, business_name, contact_name, phone, email, city, state, address,
           category, stage, lead_id, customer_id, owner_user_id, notes, next_follow_up
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15
         ) returning id`,
        [
          code,
          input.businessName,
          input.contactName ?? null,
          input.phone ?? null,
          input.email ?? null,
          input.city ?? null,
          input.state ?? null,
          input.address ?? null,
          input.category ?? null,
          input.stage,
          input.leadId ?? null,
          input.customerId ?? null,
          ownerId,
          input.notes ?? null,
          input.nextFollowUp ?? null,
        ],
      )
      await audit(client, 'marketing.dealer.created', 'mkt_dealer_prospects', row!.id, `${code} · ${input.businessName}`)

      const full = await one(client, `select ${DEALER_SELECT} where d.id = $1`, [row!.id])
      return mapDealer(full!)
    })

    sendData(res, dealer, 201)
  },
)

const dealerUpdateSchema = z.object({
  businessName: z.string().trim().min(2).max(160).optional(),
  contactName: optionalText(120),
  phone: optionalText(32),
  email: z.string().trim().email().max(255).optional(),
  city: optionalText(80),
  state: optionalText(80),
  address: optionalText(500),
  category: optionalText(80),
  stage: z.enum(['Prospect', 'Contacted', 'Interested', 'Onboarding', 'Onboarded', 'Rejected']).optional(),
  leadId: optionalUuid,
  customerId: optionalUuid,
  ownerUserId: optionalUuid,
  notes: optionalText(2000),
  nextFollowUp: dateOnlySchema.optional(),
})

const DEALER_UPDATE_COLUMNS = {
  businessName: 'business_name',
  contactName: 'contact_name',
  phone: 'phone',
  email: 'email',
  city: 'city',
  state: 'state',
  address: 'address',
  category: 'category',
  stage: 'stage',
  leadId: 'lead_id',
  customerId: 'customer_id',
  ownerUserId: 'owner_user_id',
  notes: 'notes',
  nextFollowUp: 'next_follow_up',
} as const

fieldRouter.patch('/dealers/:id', requirePermission('marketing.dealer.write'), validateBody(dealerUpdateSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<z.infer<typeof dealerUpdateSchema>>(req)

  const dealer = await withRls(auth, async (client) => {
    const current = await one<{ id: string; business_name: string }>(
      client,
      'select id, business_name from erp.mkt_dealer_prospects where id = $1 for update',
      [id],
    )
    if (!current) throw AppError.notFound('Dealer prospect not found')
    if (input.ownerUserId) await activeOrgUser(client, input.ownerUserId, 'Dealer owner')

    const mapped: Record<string, unknown> = {}
    for (const [key, column] of Object.entries(DEALER_UPDATE_COLUMNS)) {
      const value = (input as Record<string, unknown>)[key]
      if (value !== undefined) mapped[column] = value
    }
    const fragment = buildUpdate(mapped, Object.values(DEALER_UPDATE_COLUMNS))
    if (fragment.text) {
      await client.query(
        `update erp.mkt_dealer_prospects set ${fragment.text}, updated_at = now()
          where id = $${fragment.values.length + 1}`,
        [...fragment.values, id],
      )
    }
    await audit(client, 'marketing.dealer.updated', 'mkt_dealer_prospects', id, current.business_name, null, {
      fields: Object.keys(input).filter((key) => (input as Record<string, unknown>)[key] !== undefined),
    })

    const full = await one(client, `select ${DEALER_SELECT} where d.id = $1`, [id])
    return mapDealer(full!)
  })

  sendData(res, dealer)
})

// ---------------------------------------------------------------------------
// Consolidated activity records (append-only)
// ---------------------------------------------------------------------------
const activityQuery = z.object({
  q: z.string().trim().max(120).optional(),
  employeeId: optionalUuid,
  activityType: z.string().trim().max(80).optional(),
  referenceType: z.string().trim().max(60).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

fieldRouter.get(
  '/activity-records',
  requirePermission('marketing.analytics.read', 'marketing.lead.read'),
  validateQuery(activityQuery),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<z.infer<typeof activityQuery>>(req)
    const pagination = parsePagination(query)

    const result = await withRls(
      auth,
      async (client) => {
        const filter = createFilter()
        if (!auth.isAdmin && !hasPermission(auth, 'marketing.analytics.read')) {
          filter.raw('employee_id = erp.current_user_id()')
        }
        filter.equal('employee_id', query.employeeId)
        filter.equal('activity_type', query.activityType)
        filter.equal('reference_type', query.referenceType)
        filter.gte('occurred_at', query.from)
        filter.lte('occurred_at', query.to ? `${query.to}T23:59:59Z` : undefined)
        filter.search(['subject', 'detail', 'employee_name'], query.q)

        const total = await count(
          client,
          `select count(*)::text as total from erp.mkt_activity_records ${filter.where}`,
          filter.params,
        )
        const limit = filter.param(pagination.pageSize)
        const offset = filter.param(pagination.offset)
        const rows = await many(
          client,
          `select * from erp.mkt_activity_records ${filter.where}
            order by occurred_at desc
            limit ${limit} offset ${offset}`,
          filter.params,
        )
        return paginated(rows.map(mapActivityRecord), total, pagination)
      },
      { readOnly: true },
    )

    res.json(result)
  },
)

fieldRouter.post(
  '/activity-records',
  requirePermission('marketing.lead.update', 'marketing.visit.write'),
  validateBody(
    z.object({
      employeeId: optionalUuid,
      activityType: z.string().trim().min(1).max(80).default('Other Marketing Activities'),
      subject: z.string().trim().min(2).max(200),
      detail: optionalText(4000),
      referenceType: optionalText(60),
      referenceId: optionalUuid,
      occurredAt: dateTimeSchema.optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<{
      employeeId?: string
      activityType: string
      subject: string
      detail?: string
      referenceType?: string
      referenceId?: string
      occurredAt?: string
    }>(req)

    const record = await withRls(auth, async (client) => {
      const employeeId = input.employeeId ?? auth.userId
      const employee = await activeOrgUser(client, employeeId, 'Employee')

      const row = await one(
        client,
        `insert into erp.mkt_activity_records (
           org_id, employee_id, employee_name, activity_type, subject, detail,
           reference_type, reference_id, occurred_at, created_by
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7,
           coalesce($8::timestamptz, now()), erp.current_user_id()
         ) returning *`,
        [
          employeeId,
          employee.name,
          input.activityType,
          input.subject,
          input.detail ?? null,
          input.referenceType ?? null,
          input.referenceId ?? null,
          input.occurredAt ?? null,
        ],
      )
      await audit(client, 'marketing.activity.recorded', 'mkt_activity_records', row!.id, input.subject)
      return mapActivityRecord(row!)
    })

    sendData(res, record, 201)
  },
)
