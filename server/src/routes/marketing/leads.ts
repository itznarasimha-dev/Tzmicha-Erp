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
import { requirePermission, type AuthContext } from '../../middleware/auth.js'
import {
  mapAssignment,
  mapCustomer,
  mapFollowUp,
  mapLead,
  mapLeadActivity,
} from '../../mappers/marketing.js'
import { createFilter } from '../../lib/sql.js'
import { buildUpdate } from '../../lib/sql.js'
import {
  dateOnlySchema,
  dateTimeSchema,
  optionalText,
  optionalUuid,
  uuidSchema,
} from '../../lib/validation.js'
import { findReplay, readIdempotencyKey } from '../../lib/idempotency.js'
import {
  activeOrgUser,
  findLeadRow,
  LEAD_FROM,
  LEAD_SELECT,
  logLeadActivity,
} from './shared.js'

export const leadsRouter = Router()

const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Interested',
  'Follow-up Required',
  'Qualified',
  'Sent to Sales',
  'Converted',
  'Rejected',
  'Not Interested',
  'Lost',
] as const

const leadQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(['Urgent', 'High', 'Medium', 'Low']).optional(),
  sourceId: optionalUuid,
  campaignId: optionalUuid,
  assignedTo: optionalUuid,
  generatedBy: optionalUuid,
  converted: z.enum(['true', 'false']).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  sort: z
    .enum([
      'createdAt:asc',
      'createdAt:desc',
      'updatedAt:asc',
      'updatedAt:desc',
      'name:asc',
      'name:desc',
      'nextFollowUp:asc',
      'nextFollowUp:desc',
    ])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

type LeadQuery = z.infer<typeof leadQuery>

function canReadAllLeads(auth: AuthContext): boolean {
  return (
    auth.isAdmin ||
    auth.permissions.has('marketing.lead.read') ||
    auth.permissions.has('sales.lead.read')
  )
}

function leadAccessFilter(auth: AuthContext, filter: ReturnType<typeof createFilter>) {
  if (!canReadAllLeads(auth)) {
    filter.raw('(l.assigned_to = erp.current_user_id() or l.generated_by = erp.current_user_id())')
  }
}

leadsRouter.get('/leads', validateQuery(leadQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<LeadQuery>(req)
  const pagination = parsePagination(query)
  const sort = parseSort(
    query.sort,
    {
      createdAt: 'l.created_at',
      updatedAt: 'l.updated_at',
      name: 'l.name',
      nextFollowUp: 'l.next_follow_up',
    },
    'createdAt',
  )

  const result = await withRls(
    auth,
    async (client) => {
      const filter = createFilter()
      leadAccessFilter(auth, filter)
      filter.equal('l.status', query.status)
      filter.equal('l.priority', query.priority)
      filter.equal('l.source_id', query.sourceId)
      filter.equal('l.campaign_id', query.campaignId)
      filter.equal('l.assigned_to', query.assignedTo)
      filter.equal('l.generated_by', query.generatedBy)
      if (query.converted === 'true') filter.raw('l.converted = true')
      if (query.converted === 'false') filter.raw('l.converted = false')
      filter.gte('l.created_at', query.from)
      filter.lte('l.created_at', query.to ? `${query.to}T23:59:59Z` : undefined)
      filter.search(
        ['l.name', 'l.company', 'l.phone', 'l.email', 'l.code', 'l.city'],
        query.q,
      )

      const total = await count(
        client,
        `select count(*)::text as total ${LEAD_FROM} ${filter.where}`,
        filter.params,
      )
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${LEAD_SELECT} ${LEAD_FROM} ${filter.where}
          order by ${sort.clause} nulls last, l.id
          limit ${limit} offset ${offset}`,
        filter.params,
      )
      return paginated(rows.map(mapLead), total, pagination)
    },
    { readOnly: true },
  )

  res.json(result)
})

leadsRouter.get('/leads/:id', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(
    auth,
    async (client) => {
      const lead = await findLeadRow(client, id)
      if (!lead) throw AppError.notFound('Lead not found')
      if (
        !canReadAllLeads(auth) &&
        lead.assigned_to !== auth.userId &&
        lead.generated_by !== auth.userId
      ) {
        throw AppError.forbidden('You may only view leads assigned to you')
      }

      const [activities, followUps, assignment, rejection, conversion] = await Promise.all([
        many(
          client,
          `select * from erp.mkt_lead_activities
            where lead_id = $1 order by occurred_at desc limit 100`,
          [id],
        ),
        many(
          client,
          `select * from erp.mkt_lead_follow_ups
            where lead_id = $1 order by due_at desc limit 100`,
          [id],
        ),
        one(
          client,
          `select a.*, u.name as sales_rep_name
             from erp.mkt_lead_assignments a
             left join erp.users u on u.id = a.sales_rep_id
            where a.lead_id = $1 and a.is_current
            limit 1`,
          [id],
        ),
        one(
          client,
          `select r.*, u.name as rejected_by_name
             from erp.mkt_lead_rejections r
             left join erp.users u on u.id = r.rejected_by
            where r.lead_id = $1 order by r.rejected_at desc limit 1`,
          [id],
        ),
        one(
          client,
          `select * from erp.mkt_lead_conversions where lead_id = $1 limit 1`,
          [id],
        ),
      ])

      const mapped = mapLead(lead)
      return {
        ...mapped,
        activities: activities.map(mapLeadActivity),
        followUps: followUps.map(mapFollowUp),
        assignment: assignment ? mapAssignment(assignment) : null,
        rejection: rejection
          ? {
              id: rejection.id,
              reason: rejection.reason,
              notes: rejection.notes ?? '',
              rejectedAt: rejection.rejected_at,
              rejectedBy: rejection.rejected_by,
              rejectedByName: rejection.rejected_by_name ?? '',
              previousStatus: rejection.previous_status,
            }
          : null,
        conversion: conversion ?? null,
      }
    },
    { readOnly: true },
  )

  sendData(res, payload)
})

const leadCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    company: optionalText(160),
    phone: z.string().trim().max(32).optional(),
    whatsapp: z.string().trim().max(32).optional(),
    email: z.string().trim().email().max(255).optional(),
    location: optionalText(160),
    city: optionalText(80),
    state: optionalText(80),
    country: optionalText(80),
    address: optionalText(500),
    industry: optionalText(120),
    customerType: optionalText(80),
    jobTitle: optionalText(120),
    sourceId: optionalUuid,
    source: optionalText(120),
    sourceCategory: z
      .enum([
        'Digital Marketing',
        'Field Marketing',
        'Trade Marketing',
        'Campaign',
        'Website',
        'Referral',
        'Other',
      ])
      .optional(),
    sourceDetail: optionalText(160),
    marketingActivity: optionalText(120),
    campaignId: optionalUuid,
    productId: optionalUuid,
    product: optionalText(160),
    assignedTo: optionalUuid,
    status: z.enum(LEAD_STATUSES).default('New'),
    priority: z.enum(['Urgent', 'High', 'Medium', 'Low']).default('Medium'),
    nextFollowUp: dateTimeSchema.optional(),
    nextAction: optionalText(500),
    notes: optionalText(4000),
    solutionsDiscussed: optionalText(2000),
    informationShared: optionalText(2000),
    interests: z.record(z.string(), z.unknown()).default({}),
    qualification: z.record(z.string(), z.unknown()).default({}),
    attribution: z.record(z.string(), z.unknown()).default({}),
  })
  .refine((value) => Boolean(value.phone?.trim() || value.email?.trim()), {
    message: 'A phone number or email address is required',
    path: ['phone'],
  })

leadsRouter.post('/leads', requirePermission('marketing.lead.create'), validateBody(leadCreateSchema), async (req, res) => {
  const auth = req.auth!
  const input = validatedBody<z.infer<typeof leadCreateSchema>>(req)

  if (input.status === 'Converted' || input.status === 'Rejected') {
    throw AppError.badRequest('New leads cannot be created as Converted or Rejected')
  }

  const created = await withRls(auth, async (client) => {
    if (input.assignedTo) await activeOrgUser(client, input.assignedTo, 'Assignee')
    if (input.campaignId) {
      const campaign = await one(client, 'select id from erp.mkt_campaigns where id = $1', [
        input.campaignId,
      ])
      if (!campaign) throw AppError.badRequest('campaignId does not reference a campaign')
    }
    if (input.sourceId) {
      const source = await one(client, 'select id from erp.mkt_lead_sources where id = $1', [
        input.sourceId,
      ])
      if (!source) throw AppError.badRequest('sourceId does not reference a lead source')
    }

    const duplicate = await one<{ id: string }>(
      client,
      `select id from erp.mkt_leads
        where status not in ('Converted','Rejected','Lost')
          and (($1::text is not null and phone = $1)
               or ($2::text is not null and lower(email) = lower($2)))
        limit 1`,
      [input.phone?.trim() || null, input.email?.trim() || null],
    )
    if (duplicate) {
      throw AppError.conflict('An open lead with this phone number or email already exists', {
        leadId: duplicate.id,
      })
    }

    const code = await nextDocNumber(client, auth.orgId, 'lead')
    const row = await one(
      client,
      `insert into erp.mkt_leads (
         org_id, code, name, company, phone, whatsapp, email, location, city, state,
         country, address, industry, customer_type, job_title, source_id, source,
         source_category, source_detail, marketing_activity, campaign_id, product_id,
         product_text, assigned_to, generated_by, status, priority, next_follow_up,
         next_action, notes, solutions_discussed, information_shared, interests,
         qualification, attribution, created_by
       ) values (
         erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
         $27, $28, $29, $30, $31, $32::jsonb, $33::jsonb, $34::jsonb, erp.current_user_id()
       ) returning id`,
      [
        code,
        input.name,
        input.company ?? null,
        input.phone ?? null,
        input.whatsapp ?? null,
        input.email ?? null,
        input.location ?? null,
        input.city ?? null,
        input.state ?? null,
        input.country ?? 'India',
        input.address ?? null,
        input.industry ?? null,
        input.customerType ?? null,
        input.jobTitle ?? null,
        input.sourceId ?? null,
        input.source ?? null,
        input.sourceCategory ?? null,
        input.sourceDetail ?? null,
        input.marketingActivity ?? null,
        input.campaignId ?? null,
        input.productId ?? null,
        input.product ?? null,
        input.assignedTo ?? auth.userId,
        auth.userId,
        input.status,
        input.priority,
        input.nextFollowUp ?? null,
        input.nextAction ?? null,
        input.notes ?? null,
        input.solutionsDiscussed ?? null,
        input.informationShared ?? null,
        JSON.stringify(input.interests),
        JSON.stringify(input.qualification),
        JSON.stringify(input.attribution),
      ],
    )
    if (!row) throw AppError.badRequest('Could not create the lead')

    await logLeadActivity(client, row.id, 'Created', `Lead ${code} created`, {
      id: auth.userId,
      name: auth.name,
    })
    await audit(client, 'marketing.lead.created', 'mkt_leads', row.id, `${code} · ${input.name}`, null, {
      status: input.status,
      source: input.source ?? null,
    })

    const full = await findLeadRow(client, row.id)
    return mapLead(full!)
  })

  sendData(res, created, 201)
})

const leadUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  company: optionalText(160),
  phone: optionalText(32),
  whatsapp: optionalText(32),
  email: z.string().trim().email().max(255).optional(),
  location: optionalText(160),
  city: optionalText(80),
  state: optionalText(80),
  country: optionalText(80),
  address: optionalText(500),
  industry: optionalText(120),
  customerType: optionalText(80),
  jobTitle: optionalText(120),
  sourceId: optionalUuid,
  source: optionalText(120),
  sourceCategory: z
    .enum([
      'Digital Marketing',
      'Field Marketing',
      'Trade Marketing',
      'Campaign',
      'Website',
      'Referral',
      'Other',
    ])
    .optional(),
  sourceDetail: optionalText(160),
  marketingActivity: optionalText(120),
  campaignId: optionalUuid,
  productId: optionalUuid,
  product: optionalText(160),
  assignedTo: optionalUuid,
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(['Urgent', 'High', 'Medium', 'Low']).optional(),
  nextFollowUp: z.union([dateTimeSchema, z.null()]).optional(),
  lastContact: z.union([dateTimeSchema, z.null()]).optional(),
  nextAction: optionalText(500),
  notes: optionalText(4000),
  solutionsDiscussed: optionalText(2000),
  informationShared: optionalText(2000),
  interests: z.record(z.string(), z.unknown()).optional(),
  qualification: z.record(z.string(), z.unknown()).optional(),
  attribution: z.record(z.string(), z.unknown()).optional(),
  lostReason: optionalText(500),
})

const LEAD_UPDATE_COLUMNS = {
  name: 'name',
  company: 'company',
  phone: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  location: 'location',
  city: 'city',
  state: 'state',
  country: 'country',
  address: 'address',
  industry: 'industry',
  customerType: 'customer_type',
  jobTitle: 'job_title',
  sourceId: 'source_id',
  source: 'source',
  sourceCategory: 'source_category',
  sourceDetail: 'source_detail',
  marketingActivity: 'marketing_activity',
  campaignId: 'campaign_id',
  productId: 'product_id',
  product: 'product_text',
  assignedTo: 'assigned_to',
  status: 'status',
  priority: 'priority',
  nextFollowUp: 'next_follow_up',
  lastContact: 'last_contact',
  nextAction: 'next_action',
  notes: 'notes',
  solutionsDiscussed: 'solutions_discussed',
  informationShared: 'information_shared',
  interests: 'interests',
  qualification: 'qualification',
  attribution: 'attribution',
  lostReason: 'lost_reason',
} as const

leadsRouter.patch(
  '/leads/:id',
  requirePermission('marketing.lead.update'),
  validateBody(leadUpdateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof leadUpdateSchema>>(req)

    if (input.status === 'Converted') {
      throw AppError.badRequest('Use POST /leads/:id/convert to convert a lead')
    }
    if (input.status === 'Rejected') {
      throw AppError.badRequest('Use POST /leads/:id/reject to reject a lead')
    }

    const updated = await withRls(auth, async (client) => {
      const current = await one<{ id: string; converted: boolean; status: string }>(
        client,
        'select id, converted, status from erp.mkt_leads where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Lead not found')
      if (current.converted) {
        throw AppError.conflict('Converted leads can no longer be edited')
      }
      if (input.assignedTo) await activeOrgUser(client, input.assignedTo, 'Assignee')

      if (input.phone || input.email) {
        const duplicate = await one<{ id: string }>(
          client,
          `select id from erp.mkt_leads
            where id <> $1
              and status not in ('Converted','Rejected','Lost')
              and (($2::text is not null and phone = $2)
                   or ($3::text is not null and lower(email) = lower($3)))
            limit 1`,
          [id, input.phone?.trim() || null, input.email?.trim() || null],
        )
        if (duplicate) {
          throw AppError.conflict('Another open lead already uses this phone number or email', {
            leadId: duplicate.id,
          })
        }
      }

      if (input.campaignId) {
        const campaign = await one(client, 'select id from erp.mkt_campaigns where id = $1', [
          input.campaignId,
        ])
        if (!campaign) throw AppError.badRequest('campaignId does not reference a campaign')
      }
      if (input.sourceId) {
        const source = await one(client, 'select id from erp.mkt_lead_sources where id = $1', [
          input.sourceId,
        ])
        if (!source) throw AppError.badRequest('sourceId does not reference a lead source')
      }

      const mapped: Record<string, unknown> = {}
      for (const [key, column] of Object.entries(LEAD_UPDATE_COLUMNS)) {
        const value = (input as Record<string, unknown>)[key]
        if (value === undefined) continue
        if (key === 'interests' || key === 'qualification' || key === 'attribution') {
          mapped[column] = JSON.stringify(value)
        } else {
          mapped[column] = value
        }
      }

      const fragment = buildUpdate(mapped, Object.values(LEAD_UPDATE_COLUMNS))
      if (fragment.text) {
        await client.query(
          `update erp.mkt_leads
              set ${fragment.text}, updated_at = now()
            where id = $${fragment.values.length + 1}`,
          [...fragment.values, id],
        )
      }

      await logLeadActivity(client, id, 'Updated', 'Lead details updated', {
        id: auth.userId,
        name: auth.name,
      })
      await audit(client, 'marketing.lead.updated', 'mkt_leads', id, 'Lead updated', null, {
        fields: Object.keys(input).filter(
          (key) => (input as Record<string, unknown>)[key] !== undefined,
        ),
      })

      const full = await findLeadRow(client, id)
      return mapLead(full!)
    })

    sendData(res, updated)
  },
)

// ---------------------------------------------------------------------------
// Sales handover
// ---------------------------------------------------------------------------
const assignSchema = z.object({
  salesRepId: uuidSchema,
  salesManagerId: optionalUuid,
  expectedFirstContact: dateTimeSchema.optional(),
  handoffNote: optionalText(2000),
  requirementSummary: optionalText(2000),
})

leadsRouter.post(
  '/leads/:id/assign',
  requirePermission('marketing.lead.assign'),
  validateBody(assignSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof assignSchema>>(req)

    const assignment = await withRls(auth, async (client) => {
      const lead = await one<{ id: string; status: string; converted: boolean; name: string }>(
        client,
        'select id, status, converted, name from erp.mkt_leads where id = $1 for update',
        [id],
      )
      if (!lead) throw AppError.notFound('Lead not found')
      if (lead.converted) throw AppError.conflict('This lead is already converted')
      if (lead.status === 'Rejected' || lead.status === 'Lost') {
        throw AppError.conflict('A rejected or lost lead cannot be handed to sales')
      }

      const rep = await activeOrgUser(client, input.salesRepId, 'Sales representative')
      if (input.salesManagerId) {
        await activeOrgUser(client, input.salesManagerId, 'Sales manager')
      }

      await client.query(
        `update erp.mkt_lead_assignments
            set is_current = false, updated_at = now()
          where lead_id = $1 and is_current`,
        [id],
      )
      const row = await one<{ id: string }>(
        client,
        `insert into erp.mkt_lead_assignments (
           org_id, lead_id, sales_rep_id, sales_manager_id, assigned_by,
           expected_first_contact, handoff_note, requirement_summary, sales_status, is_current
         ) values (
           erp.current_org_id(), $1, $2, $3, erp.current_user_id(), $4, $5, $6, 'Assigned', true
         ) returning id`,
        [
          id,
          input.salesRepId,
          input.salesManagerId ?? null,
          input.expectedFirstContact ?? null,
          input.handoffNote ?? null,
          input.requirementSummary ?? null,
        ],
      )
      if (!row) throw AppError.badRequest('Could not create the sales assignment')

      await client.query(
        `update erp.mkt_leads
            set status = case when status in ('Converted','Rejected','Lost') then status
                              else 'Sent to Sales' end,
                updated_at = now()
          where id = $1`,
        [id],
      )

      await logLeadActivity(
        client,
        id,
        'Assigned',
        `Handed over to ${rep.name}${input.handoffNote ? ` — ${input.handoffNote}` : ''}`,
        { id: auth.userId, name: auth.name },
      )
      await audit(client, 'marketing.lead.assigned', 'mkt_leads', id, `Assigned to ${rep.name}`, null, {
        salesRepId: input.salesRepId,
        salesManagerId: input.salesManagerId ?? null,
      })

      const full = await one(
        client,
        `select a.*, u.name as sales_rep_name
           from erp.mkt_lead_assignments a
           left join erp.users u on u.id = a.sales_rep_id
          where a.id = $1`,
        [row.id],
      )
      return mapAssignment(full!)
    })

    sendData(res, assignment, 201)
  },
)

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------
const followUpCreateSchema = z.object({
  dueAt: dateTimeSchema,
  method: z.enum(['Call', 'WhatsApp', 'Email', 'Meeting', 'Visit', 'Other']).default('Call'),
  reason: z.string().trim().min(3).max(1000),
  reminder: optionalText(160),
})

leadsRouter.post(
  '/leads/:id/follow-ups',
  requirePermission('marketing.lead.followup'),
  validateBody(followUpCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof followUpCreateSchema>>(req)

    const followUp = await withRls(auth, async (client) => {
      const lead = await one<{ id: string; status: string; converted: boolean }>(
        client,
        'select id, status, converted from erp.mkt_leads where id = $1 for update',
        [id],
      )
      if (!lead) throw AppError.notFound('Lead not found')
      if (lead.converted) throw AppError.conflict('Converted leads do not need follow-ups')

      const row = await one<{ id: string }>(
        client,
        `insert into erp.mkt_lead_follow_ups
           (org_id, lead_id, due_at, method, reason, reminder, created_by, created_by_name)
         values (erp.current_org_id(), $1, $2, $3, $4, $5, erp.current_user_id(), $6)
         returning id`,
        [id, input.dueAt, input.method, input.reason, input.reminder ?? null, auth.name],
      )

      await client.query(
        `update erp.mkt_leads
            set next_follow_up = $2,
                next_action = $3,
                status = case when status = 'New' then 'Follow-up Required' else status end,
                updated_at = now()
          where id = $1`,
        [id, input.dueAt, input.reason],
      )
      await logLeadActivity(
        client,
        id,
        'Follow-up',
        `Follow-up scheduled by ${input.method} for ${input.dueAt}`,
        { id: auth.userId, name: auth.name },
      )
      await audit(client, 'marketing.lead.followup_scheduled', 'mkt_leads', id, input.reason, null, {
        dueAt: input.dueAt,
        method: input.method,
      })

      const full = await one(client, 'select * from erp.mkt_lead_follow_ups where id = $1', [row!.id])
      return mapFollowUp(full!)
    })

    sendData(res, followUp, 201)
  },
)

const followUpCompleteSchema = z.object({
  outcome: z.string().trim().min(3).max(2000),
  latestResponse: optionalText(2000),
  newRequirements: optionalText(2000),
  concerns: optionalText(2000),
  updatedBudget: z.coerce.number().min(0).max(1_000_000_000).nullable().optional(),
  purchaseReadiness: optionalText(120),
  agreedNextSteps: optionalText(2000),
  nextFollowUpAt: z.union([dateTimeSchema, z.null()]).optional(),
})

leadsRouter.post(
  '/leads/:id/follow-ups/:followUpId/complete',
  requirePermission('marketing.lead.followup'),
  validateBody(followUpCompleteSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const followUpId = uuidSchema.parse(req.params.followUpId)
    const input = validatedBody<z.infer<typeof followUpCompleteSchema>>(req)

    const followUp = await withRls(auth, async (client) => {
      const current = await one<{ id: string; lead_id: string; status: string }>(
        client,
        'select id, lead_id, status from erp.mkt_lead_follow_ups where id = $1 for update',
        [followUpId],
      )
      if (!current || current.lead_id !== id) throw AppError.notFound('Follow-up not found')
      if (current.status !== 'Scheduled') {
        throw AppError.conflict(`This follow-up is already ${current.status.toLowerCase()}`)
      }

      await client.query(
        `update erp.mkt_lead_follow_ups
            set status = 'Completed', completed_at = now(), updated_at = now(),
                outcome = $2, latest_response = $3, new_requirements = $4, concerns = $5,
                updated_budget = $6, purchase_readiness = $7, agreed_next_steps = $8
          where id = $1`,
        [
          followUpId,
          input.outcome,
          input.latestResponse ?? null,
          input.newRequirements ?? null,
          input.concerns ?? null,
          input.updatedBudget ?? null,
          input.purchaseReadiness ?? null,
          input.agreedNextSteps ?? null,
        ],
      )
      await client.query(
        `update erp.mkt_leads
            set last_contact = now(),
                next_follow_up = $2,
                next_action = $3,
                updated_at = now()
          where id = $1`,
        [id, input.nextFollowUpAt ?? null, input.agreedNextSteps ?? null],
      )
      await logLeadActivity(
        client,
        id,
        'Follow-up',
        `Follow-up completed — ${input.outcome}`,
        { id: auth.userId, name: auth.name },
      )
      await audit(client, 'marketing.lead.followup_completed', 'mkt_leads', id, input.outcome, null, {
        followUpId,
        nextFollowUpAt: input.nextFollowUpAt ?? null,
      })

      const full = await one(client, 'select * from erp.mkt_lead_follow_ups where id = $1', [followUpId])
      return mapFollowUp(full!)
    })

    sendData(res, followUp)
  },
)

leadsRouter.post(
  '/leads/:id/follow-ups/:followUpId/cancel',
  requirePermission('marketing.lead.followup'),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const followUpId = uuidSchema.parse(req.params.followUpId)

    const followUp = await withRls(auth, async (client) => {
      const current = await one<{ lead_id: string; status: string }>(
        client,
        'select lead_id, status from erp.mkt_lead_follow_ups where id = $1 for update',
        [followUpId],
      )
      if (!current || current.lead_id !== id) throw AppError.notFound('Follow-up not found')
      if (current.status !== 'Scheduled') {
        throw AppError.conflict(`This follow-up is already ${current.status.toLowerCase()}`)
      }

      await client.query(
        `update erp.mkt_lead_follow_ups
            set status = 'Cancelled', updated_at = now()
          where id = $1`,
        [followUpId],
      )
      await client.query(
        `update erp.mkt_leads
            set next_follow_up = (
              select min(due_at) from erp.mkt_lead_follow_ups
               where lead_id = $1 and status = 'Scheduled'
            ), updated_at = now()
          where id = $1`,
        [id],
      )
      await logLeadActivity(client, id, 'Follow-up', 'Follow-up cancelled', {
        id: auth.userId,
        name: auth.name,
      })
      const full = await one(client, 'select * from erp.mkt_lead_follow_ups where id = $1', [followUpId])
      return mapFollowUp(full!)
    })

    sendData(res, followUp)
  },
)

// ---------------------------------------------------------------------------
// Manual activity log
// ---------------------------------------------------------------------------
leadsRouter.get('/leads/:id/activities', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const rows = await withRls(
    auth,
    (client) =>
      many(
        client,
        `select * from erp.mkt_lead_activities
          where lead_id = $1 order by occurred_at desc limit 200`,
        [id],
      ),
    { readOnly: true },
  )
  sendData(res, rows.map(mapLeadActivity))
})

leadsRouter.post(
  '/leads/:id/activities',
  requirePermission('marketing.lead.update'),
  validateBody(
    z.object({
      type: z.string().trim().min(1).max(80).default('Note'),
      summary: z.string().trim().min(3).max(2000),
      occurredAt: dateTimeSchema.optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ type: string; summary: string; occurredAt?: string }>(req)

    const activity = await withRls(auth, async (client) => {
      const lead = await one(client, 'select id from erp.mkt_leads where id = $1', [id])
      if (!lead) throw AppError.notFound('Lead not found')

      await logLeadActivity(client, id, input.type, input.summary, {
        id: auth.userId,
        name: auth.name,
      }, input.occurredAt ?? null)

      const row = await one(
        client,
        `select * from erp.mkt_lead_activities
          where lead_id = $1 order by created_at desc limit 1`,
        [id],
      )
      return mapLeadActivity(row!)
    })

    sendData(res, activity, 201)
  },
)

// ---------------------------------------------------------------------------
// Rejection
// ---------------------------------------------------------------------------
leadsRouter.post(
  '/leads/:id/reject',
  requirePermission('marketing.lead.reject'),
  validateBody(
    z.object({
      reason: z.string().trim().min(3).max(500),
      notes: optionalText(2000),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ reason: string; notes?: string }>(req)

    const lead = await withRls(auth, async (client) => {
      const current = await one<{
        id: string
        status: string
        converted: boolean
        next_follow_up: string | null
      }>(
        client,
        'select id, status, converted, next_follow_up from erp.mkt_leads where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Lead not found')
      if (current.converted) throw AppError.conflict('A converted lead cannot be rejected')
      if (current.status === 'Rejected') throw AppError.conflict('This lead was already rejected')

      await client.query(
        `insert into erp.mkt_lead_rejections (
           org_id, lead_id, reason, notes, rejected_by, rejected_by_name,
           previous_status, previous_next_follow_up
         ) values (
           erp.current_org_id(), $1, $2, $3, erp.current_user_id(), $4, $5, $6
         )`,
        [
          id,
          input.reason,
          input.notes ?? null,
          auth.name,
          current.status,
          current.next_follow_up,
        ],
      )
      await client.query(
        `update erp.mkt_leads
            set status = 'Rejected', lost_reason = $2, next_follow_up = null, updated_at = now()
          where id = $1`,
        [id, input.reason],
      )
      await client.query(
        `update erp.mkt_lead_follow_ups
            set status = 'Cancelled', updated_at = now()
          where lead_id = $1 and status = 'Scheduled'`,
        [id],
      )
      await logLeadActivity(
        client,
        id,
        'Rejected',
        `Lead rejected — ${input.reason}`,
        { id: auth.userId, name: auth.name },
      )
      await audit(client, 'marketing.lead.rejected', 'mkt_leads', id, input.reason, {
        status: current.status,
      }, { status: 'Rejected' })

      const full = await findLeadRow(client, id)
      return mapLead(full!)
    })

    sendData(res, lead)
  },
)

// ---------------------------------------------------------------------------
// Conversion to a shared customer record
// ---------------------------------------------------------------------------
const convertSchema = z.object({
  customerName: optionalText(160),
  company: optionalText(160),
  email: z.string().trim().email().max(255).optional(),
  phone: optionalText(32),
  gstin: optionalText(20),
  notes: optionalText(2000),
  outcome: optionalText(500),
})

leadsRouter.post(
  '/leads/:id/convert',
  requirePermission('marketing.lead.convert'),
  validateBody(convertSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof convertSchema>>(req)
    const idempotencyKey = readIdempotencyKey(req.headers['idempotency-key'])

    const result = await withRls(auth, async (client) => {
      const lead = await one<{
        id: string
        name: string
        company: string | null
        phone: string | null
        email: string | null
        city: string | null
        state: string | null
        country: string | null
        address: string | null
        industry: string | null
        notes: string | null
        assigned_to: string | null
        customer_id: string | null
        converted: boolean
        status: string
      }>(
        client,
        `select id, name, company, phone, email, city, state, country, address,
                industry, notes, assigned_to, customer_id, converted, status
           from erp.mkt_leads where id = $1 for update`,
        [id],
      )
      if (!lead) throw AppError.notFound('Lead not found')

      if (lead.converted && lead.customer_id) {
        const existing = await one(client, 'select * from erp.customers where id = $1', [
          lead.customer_id,
        ])
        return { customer: mapCustomer(existing!), replayed: true }
      }

      const replay = await findReplay<{ customer_id: string; lead_id: string }>(
        client,
        'erp.mkt_lead_conversions',
        'customer_id, lead_id',
        auth.orgId,
        idempotencyKey,
      )
      if (replay) {
        if (replay.lead_id !== id) {
          throw AppError.conflict('This Idempotency-Key was already used for a different lead')
        }
        const existing = await one(client, 'select * from erp.customers where id = $1', [
          replay.customer_id,
        ])
        if (existing) return { customer: mapCustomer(existing), replayed: true }
      }

      if (lead.status === 'Rejected' || lead.status === 'Lost' || lead.status === 'Not Interested') {
        throw AppError.conflict(`A ${lead.status.toLowerCase()} lead cannot be converted`)
      }

      const code = await nextDocNumber(client, auth.orgId, 'customer')
      const customer = await one<{ id: string }>(
        client,
        `insert into erp.customers (
           org_id, code, name, company, phone, email, gstin, address, city, state,
           country, industry, owner_user_id, source_lead_id, notes
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
         ) returning id`,
        [
          code,
          input.customerName ?? lead.name,
          input.company ?? lead.company,
          input.phone ?? lead.phone,
          input.email ?? lead.email,
          input.gstin ?? null,
          lead.address,
          lead.city,
          lead.state,
          lead.country ?? 'India',
          lead.industry,
          lead.assigned_to ?? auth.userId,
          id,
          input.notes ?? lead.notes,
        ],
      )
      if (!customer) throw AppError.badRequest('Could not create the customer')

      try {
        await client.query(
          `insert into erp.mkt_lead_conversions
             (org_id, lead_id, customer_id, converted_by, outcome, idempotency_key)
           values (erp.current_org_id(), $1, $2, erp.current_user_id(), $3, $4)`,
          [id, customer.id, input.outcome ?? 'Converted from marketing lead', idempotencyKey],
        )
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          const current = await one<{ customer_id: string | null }>(
            client,
            'select customer_id from erp.mkt_leads where id = $1',
            [id],
          )
          if (current?.customer_id) {
            const existing = await one(client, 'select * from erp.customers where id = $1', [
              current.customer_id,
            ])
            if (existing) return { customer: mapCustomer(existing), replayed: true }
          }
        }
        throw error
      }

      await client.query(
        `insert into erp.mkt_customer_references (org_id, lead_id, customer_id, note)
         values (erp.current_org_id(), $1, $2, $3)
         on conflict (org_id, lead_id, customer_id) do nothing`,
        [id, customer.id, input.notes ?? null],
      )
      await logLeadActivity(
        client,
        id,
        'Converted',
        `Converted to customer ${code}`,
        { id: auth.userId, name: auth.name },
      )
      await audit(
        client,
        'marketing.lead.converted',
        'mkt_leads',
        id,
        `Converted to customer ${code}`,
        { status: lead.status },
        { customerId: customer.id },
      )

      const saved = await one(client, 'select * from erp.customers where id = $1', [customer.id])
      return { customer: mapCustomer(saved!), replayed: false }
    })

    sendData(res, result, result.replayed ? 200 : 201)
  },
)
