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
import { requirePermission } from '../../middleware/auth.js'
import {
  mapCampaign,
  mapDiscount,
  mapOffer,
} from '../../mappers/marketing.js'
import { buildUpdate, createFilter } from '../../lib/sql.js'
import {
  dateOnlySchema,
  optionalText,
  optionalUuid,
  percentageSchema,
  uuidSchema,
} from '../../lib/validation.js'
import {
  decideEntityApproval,
  raiseApproval,
} from '../../lib/approvals.js'
import { findReplay, readIdempotencyKey } from '../../lib/idempotency.js'
import { activeOrgUser } from './shared.js'

export const campaignsRouter = Router()

const CAMPAIGN_FROM = `
  from erp.mkt_campaigns c
  left join erp.v_campaign_performance p on p.campaign_id = c.id
`

const CAMPAIGN_SELECT = `
  c.*,
  coalesce(p.leads, 0) as leads,
  coalesce(p.qualified_leads, 0) as qualified_leads,
  coalesce(p.conversions, 0) as conversions,
  coalesce(p.converted_value, 0) as converted_value,
  p.roi_percent
`

const campaignQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .enum(['Draft', 'Planned', 'Active', 'Paused', 'Completed', 'Archived'])
    .optional(),
  channel: z
    .enum(['Digital', 'Social', 'Email', 'Field', 'Trade', 'Events', 'Influencer', 'Retail', 'Content'])
    .optional(),
  ownerUserId: optionalUuid,
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  sort: z
    .enum(['startDate:asc', 'startDate:desc', 'budget:asc', 'budget:desc', 'createdAt:asc', 'createdAt:desc'])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

campaignsRouter.get(
  '/campaigns',
  requirePermission('marketing.campaign.read'),
  validateQuery(campaignQuery),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<z.infer<typeof campaignQuery>>(req)
    const pagination = parsePagination(query)
    const sort = parseSort(
      query.sort,
      {
        startDate: 'c.start_date',
        budget: 'c.budget',
        createdAt: 'c.created_at',
      },
      'createdAt',
    )

    const result = await withRls(
      auth,
      async (client) => {
        const filter = createFilter()
        filter.equal('c.status', query.status)
        filter.equal('c.channel', query.channel)
        filter.equal('c.owner_user_id', query.ownerUserId)
        filter.gte('c.start_date', query.from)
        filter.lte('c.end_date', query.to)
        filter.search(['c.name', 'c.code', 'c.objective', 'c.audience'], query.q)

        const total = await count(
          client,
          `select count(*)::text as total from erp.mkt_campaigns c ${filter.where}`,
          filter.params,
        )
        const limit = filter.param(pagination.pageSize)
        const offset = filter.param(pagination.offset)
        const rows = await many(
          client,
          `select ${CAMPAIGN_SELECT} ${CAMPAIGN_FROM} ${filter.where}
            order by ${sort.clause} nulls last, c.id
            limit ${limit} offset ${offset}`,
          filter.params,
        )
        return paginated(rows.map(mapCampaign), total, pagination)
      },
      { readOnly: true },
    )

    res.json(result)
  },
)

campaignsRouter.get('/campaigns/:id', requirePermission('marketing.campaign.read'), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(
    auth,
    async (client) => {
      const row = await one(client, `select ${CAMPAIGN_SELECT} ${CAMPAIGN_FROM} where c.id = $1`, [id])
      if (!row) throw AppError.notFound('Campaign not found')

      const offers = await many(
        client,
        `select * from erp.mkt_campaign_offers
          where campaign_id = $1 order by created_at desc`,
        [id],
      )

      return { ...mapCampaign(row), offers: offers.map(mapOffer) }
    },
    { readOnly: true },
  )

  sendData(res, payload)
})

const campaignCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  objective: optionalText(2000),
  channel: z
    .enum(['Digital', 'Social', 'Email', 'Field', 'Trade', 'Events', 'Influencer', 'Retail', 'Content'])
    .default('Digital'),
  audience: optionalText(500),
  productId: optionalUuid,
  product: optionalText(160),
  startDate: dateOnlySchema,
  endDate: dateOnlySchema,
  budget: z.coerce.number().min(0).max(1_000_000_000).default(0),
  ownerUserId: optionalUuid,
  kpis: z.record(z.string(), z.unknown()).optional(),
})

campaignsRouter.post(
  '/campaigns',
  requirePermission('marketing.campaign.create'),
  validateBody(campaignCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof campaignCreateSchema>>(req)
    if (input.endDate < input.startDate) {
      throw AppError.badRequest('endDate must be on or after startDate')
    }

    const campaign = await withRls(auth, async (client) => {
      const ownerId = input.ownerUserId ?? auth.userId
      const owner = await activeOrgUser(client, ownerId, 'Campaign owner')
      if (input.productId) {
        const product = await one(client, 'select id from erp.products where id = $1', [input.productId])
        if (!product) throw AppError.badRequest('productId does not reference a product')
      }

      const code = await nextDocNumber(client, auth.orgId, 'campaign')
      const row = await one(
        client,
        `insert into erp.mkt_campaigns (
           org_id, code, name, objective, channel, audience, product_id, product_text,
           start_date, end_date, budget, status, owner_user_id, owner_name, kpis, created_by
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Draft', $11, $12, $13::jsonb,
           erp.current_user_id()
         ) returning id`,
        [
          code,
          input.name,
          input.objective ?? null,
          input.channel,
          input.audience ?? null,
          input.productId ?? null,
          input.product ?? null,
          input.startDate,
          input.endDate,
          input.budget,
          ownerId,
          owner.name,
          JSON.stringify(input.kpis ?? {}),
        ],
      )
      if (!row) throw AppError.badRequest('Could not create the campaign')

      await audit(client, 'marketing.campaign.created', 'mkt_campaigns', row.id, `${code} · ${input.name}`, null, {
        budget: input.budget,
        channel: input.channel,
      })

      const full = await one(client, `select ${CAMPAIGN_SELECT} ${CAMPAIGN_FROM} where c.id = $1`, [row.id])
      return mapCampaign(full!)
    })

    sendData(res, campaign, 201)
  },
)

const campaignUpdateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  objective: optionalText(2000),
  channel: z
    .enum(['Digital', 'Social', 'Email', 'Field', 'Trade', 'Events', 'Influencer', 'Retail', 'Content'])
    .optional(),
  audience: optionalText(500),
  productId: optionalUuid,
  product: optionalText(160),
  startDate: dateOnlySchema.optional(),
  endDate: dateOnlySchema.optional(),
  budget: z.coerce.number().min(0).max(1_000_000_000).optional(),
  spend: z.coerce.number().min(0).max(1_000_000_000).optional(),
  status: z.enum(['Draft', 'Planned', 'Active', 'Paused', 'Completed', 'Archived']).optional(),
  ownerUserId: optionalUuid,
  kpis: z.record(z.string(), z.unknown()).optional(),
})

const CAMPAIGN_UPDATE_COLUMNS = {
  name: 'name',
  objective: 'objective',
  channel: 'channel',
  audience: 'audience',
  productId: 'product_id',
  product: 'product_text',
  startDate: 'start_date',
  endDate: 'end_date',
  budget: 'budget',
  spend: 'spend',
  status: 'status',
  ownerUserId: 'owner_user_id',
  kpis: 'kpis',
} as const

campaignsRouter.patch(
  '/campaigns/:id',
  requirePermission('marketing.campaign.update'),
  validateBody(campaignUpdateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof campaignUpdateSchema>>(req)

    const campaign = await withRls(auth, async (client) => {
      const current = await one<{ start_date: string; end_date: string; spend: string; budget: string }>(
        client,
        'select start_date, end_date, spend, budget from erp.mkt_campaigns where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Campaign not found')

      const startDate = input.startDate ?? current.start_date
      const endDate = input.endDate ?? current.end_date
      if (endDate < startDate) throw AppError.badRequest('endDate must be on or after startDate')

      const nextSpend = input.spend ?? Number(current.spend)
      const nextBudget = input.budget ?? Number(current.budget)
      if (nextSpend > nextBudget) {
        throw AppError.badRequest('Campaign spend cannot exceed the approved budget')
      }

      const mapped: Record<string, unknown> = {}
      for (const [key, column] of Object.entries(CAMPAIGN_UPDATE_COLUMNS)) {
        const value = (input as Record<string, unknown>)[key]
        if (value === undefined) continue
        if (key === 'kpis') {
          mapped[column] = JSON.stringify(value)
        } else {
          mapped[column] = value
        }
      }

      if (input.ownerUserId) {
        const owner = await activeOrgUser(client, input.ownerUserId, 'Campaign owner')
        mapped.owner_name = owner.name
      }

      const fragment = buildUpdate(mapped, [...Object.values(CAMPAIGN_UPDATE_COLUMNS), 'owner_name'])
      if (!fragment.text) throw AppError.badRequest('No fields to update')
      await client.query(
        `update erp.mkt_campaigns set ${fragment.text}, updated_at = now()
          where id = $${fragment.values.length + 1}`,
        [...fragment.values, id],
      )
      await audit(client, 'marketing.campaign.updated', 'mkt_campaigns', id, 'Campaign updated', null, {
        fields: Object.keys(input).filter(
          (key) => (input as Record<string, unknown>)[key] !== undefined,
        ),
      })

      const full = await one(client, `select ${CAMPAIGN_SELECT} ${CAMPAIGN_FROM} where c.id = $1`, [id])
      return mapCampaign(full!)
    })

    sendData(res, campaign)
  },
)

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------
const OFFER_FROM = `
  from erp.mkt_campaign_offers o
  left join erp.mkt_campaigns c on c.id = o.campaign_id
`

const OFFER_SELECT = `o.*, c.name as campaign_name ${OFFER_FROM}`

const offerQuery = z.object({
  campaignId: optionalUuid,
  status: z
    .enum(['Draft', 'Pending Approval', 'Active', 'Paused', 'Expired', 'Rejected'])
    .optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(['createdAt:asc', 'createdAt:desc', 'validFrom:asc', 'validFrom:desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

campaignsRouter.get('/offers', requirePermission('marketing.offer.read'), validateQuery(offerQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof offerQuery>>(req)
  const pagination = parsePagination(query)
  const sort = parseSort(query.sort, { createdAt: 'o.created_at', validFrom: 'o.valid_from' }, 'createdAt')

  const result = await withRls(
    auth,
    async (client) => {
      const filter = createFilter()
      filter.equal('o.campaign_id', query.campaignId)
      filter.equal('o.status', query.status)
      filter.search(['o.title', 'o.code', 'o.description'], query.q)

      const total = await count(client, `select count(*)::text as total ${OFFER_FROM} ${filter.where}`, filter.params)
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${OFFER_SELECT} ${filter.where}
          order by ${sort.clause} nulls last, o.id
          limit ${limit} offset ${offset}`,
        filter.params,
      )
      return paginated(rows.map(mapOffer), total, pagination)
    },
    { readOnly: true },
  )

  res.json(result)
})

const offerCreateSchema = z
  .object({
    campaignId: optionalUuid,
    title: z.string().trim().min(2).max(160),
    description: optionalText(2000),
    offerType: z.enum(['Discount', 'Bundle', 'Cashback', 'Freebie', 'Scheme', 'Other']).default('Discount'),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
    productId: optionalUuid,
    validFrom: dateOnlySchema.optional(),
    validTo: dateOnlySchema.optional(),
  })
  .refine(
    (value) =>
      (value.discountPercent === undefined) !== (value.discountAmount === undefined),
    { message: 'Provide exactly one of discountPercent or discountAmount', path: ['discountPercent'] },
  )

campaignsRouter.post(
  '/offers',
  requirePermission('marketing.offer.create'),
  validateBody(offerCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof offerCreateSchema>>(req)
    if (input.validFrom && input.validTo && input.validTo < input.validFrom) {
      throw AppError.badRequest('validTo must be on or after validFrom')
    }

    const offer = await withRls(auth, async (client) => {
      if (input.campaignId) {
        const campaign = await one(client, 'select id from erp.mkt_campaigns where id = $1', [
          input.campaignId,
        ])
        if (!campaign) throw AppError.badRequest('campaignId does not reference a campaign')
      }

      const code = await nextDocNumber(client, auth.orgId, 'offer')
      const row = await one<{ id: string }>(
        client,
        `insert into erp.mkt_campaign_offers (
           org_id, code, campaign_id, title, description, offer_type, discount_percent,
           discount_amount, product_id, valid_from, valid_to, status, created_by
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Draft',
           erp.current_user_id()
         ) returning id`,
        [
          code,
          input.campaignId ?? null,
          input.title,
          input.description ?? null,
          input.offerType,
          input.discountPercent ?? null,
          input.discountAmount ?? null,
          input.productId ?? null,
          input.validFrom ?? null,
          input.validTo ?? null,
        ],
      )
      await audit(client, 'marketing.offer.created', 'mkt_campaign_offers', row!.id, `${code} · ${input.title}`)
      const full = await one(client, `select ${OFFER_SELECT} where o.id = $1`, [row!.id])
      return mapOffer(full!)
    })

    sendData(res, offer, 201)
  },
)

campaignsRouter.post(
  '/offers/:id/submit',
  requirePermission('marketing.offer.create'),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)

    const offer = await withRls(auth, async (client) => {
      const current = await one<{ id: string; status: string; title: string; discount_percent: string | null }>(
        client,
        'select id, status, title, discount_percent from erp.mkt_campaign_offers where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Offer not found')
      if (!['Draft', 'Rejected', 'Paused'].includes(current.status)) {
        throw AppError.conflict(`An offer in status "${current.status}" cannot be submitted`)
      }

      await raiseApproval(client, {
        entityType: 'mkt_offer',
        entityId: id,
        title: `Offer approval: ${current.title}`,
        stage: 'manager',
        assignedRole: 'marketing.approval.decide',
        payload: { discountPercent: current.discount_percent },
      })
      await client.query(
        `update erp.mkt_campaign_offers
            set status = 'Pending Approval', updated_at = now()
          where id = $1`,
        [id],
      )
      await audit(client, 'marketing.offer.submitted', 'mkt_campaign_offers', id, current.title)

      const full = await one(client, `select ${OFFER_SELECT} where o.id = $1`, [id])
      return mapOffer(full!)
    })

    sendData(res, offer)
  },
)

campaignsRouter.post(
  '/offers/:id/decide',
  requirePermission('marketing.approval.decide', 'approval.decide'),
  validateBody(
    z.object({
      decision: z.enum(['Approved', 'Rejected', 'Changes Requested']),
      comments: optionalText(2000),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ decision: 'Approved' | 'Rejected' | 'Changes Requested'; comments?: string }>(req)
    if (input.decision !== 'Approved' && !input.comments) {
      throw AppError.badRequest('A comment is required unless the offer is approved')
    }

    const offer = await withRls(auth, async (client) => {
      const current = await one<{ id: string; status: string; title: string; created_by: string | null }>(
        client,
        'select id, status, title, created_by from erp.mkt_campaign_offers where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Offer not found')
      if (current.status !== 'Pending Approval') {
        throw AppError.conflict(`This offer is not awaiting approval (status: ${current.status})`)
      }
      if (current.created_by === auth.userId) {
        throw AppError.forbidden('Self-approval is not permitted')
      }

      const decided = await decideEntityApproval(
        client,
        'mkt_offer',
        id,
        input.decision,
        input.comments ?? null,
        null,
        'manager',
      )
      if (!decided) throw AppError.conflict('No pending approval request was found for this offer')

      const nextStatus =
        input.decision === 'Approved'
          ? 'Active'
          : input.decision === 'Rejected'
            ? 'Rejected'
            : 'Draft'
      await client.query(
        `update erp.mkt_campaign_offers
            set status = $2, updated_at = now()
          where id = $1`,
        [id, nextStatus],
      )
      await audit(
        client,
        `marketing.offer.${input.decision === 'Approved' ? 'approved' : 'decided'}`,
        'mkt_campaign_offers',
        id,
        input.comments ?? input.decision,
      )

      const full = await one(client, `select ${OFFER_SELECT} where o.id = $1`, [id])
      return mapOffer(full!)
    })

    sendData(res, offer)
  },
)

// ---------------------------------------------------------------------------
// Discount requests
// ---------------------------------------------------------------------------
const DISCOUNT_FROM = `
  from erp.mkt_discounts d
  left join erp.customers c on c.id = d.customer_id
  left join erp.users rb on rb.id = d.requested_by
  left join erp.users db on db.id = d.decided_by
`

const DISCOUNT_SELECT = `
  d.*, c.name as customer_name, rb.name as requested_by_name, db.name as decided_by_name
  ${DISCOUNT_FROM}
`

const discountQuery = z.object({
  status: z.enum(['Draft', 'Pending', 'Approved', 'Rejected', 'Expired']).optional(),
  customerId: optionalUuid,
  offerId: optionalUuid,
  q: z.string().trim().max(120).optional(),
  sort: z.enum(['createdAt:asc', 'createdAt:desc', 'requestedPercent:asc', 'requestedPercent:desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

campaignsRouter.get(
  '/discounts',
  requirePermission('marketing.discount.read'),
  validateQuery(discountQuery),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<z.infer<typeof discountQuery>>(req)
    const pagination = parsePagination(query)
    const sort = parseSort(
      query.sort,
      { createdAt: 'd.created_at', requestedPercent: 'd.requested_percent' },
      'createdAt',
    )

    const result = await withRls(
      auth,
      async (client) => {
        const filter = createFilter()
        filter.equal('d.status', query.status)
        filter.equal('d.customer_id', query.customerId)
        filter.equal('d.offer_id', query.offerId)
        filter.search(['d.code', 'd.reason', 'c.name'], query.q)

        const total = await count(client, `select count(*)::text as total ${DISCOUNT_FROM} ${filter.where}`, filter.params)
        const limit = filter.param(pagination.pageSize)
        const offset = filter.param(pagination.offset)
        const rows = await many(
          client,
          `select ${DISCOUNT_SELECT} ${filter.where}
            order by ${sort.clause} nulls last, d.id
            limit ${limit} offset ${offset}`,
          filter.params,
        )
        return paginated(rows.map(mapDiscount), total, pagination)
      },
      { readOnly: true },
    )

    res.json(result)
  },
)

const discountCreateSchema = z.object({
  offerId: optionalUuid,
  customerId: optionalUuid,
  salesOrderId: optionalUuid,
  requestedPercent: percentageSchema.refine((value) => value > 0, 'Discount must be greater than 0'),
  reason: z.string().trim().min(5).max(1000),
})

campaignsRouter.post(
  '/discounts',
  requirePermission('marketing.discount.request'),
  validateBody(discountCreateSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof discountCreateSchema>>(req)
    const idempotencyKey = readIdempotencyKey(req.headers['idempotency-key'])

    const discount = await withRls(auth, async (client) => {
      const replay = await findReplay<{ id: string }>(
        client,
        'erp.mkt_discounts',
        'id',
        auth.orgId,
        idempotencyKey,
      )
      if (replay) {
        const existing = await one(client, `select ${DISCOUNT_SELECT} where d.id = $1`, [replay.id])
        if (existing) return mapDiscount(existing)
      }

      if (input.customerId) {
        const customer = await one(client, 'select id from erp.customers where id = $1', [input.customerId])
        if (!customer) throw AppError.badRequest('customerId does not reference a customer')
      }
      if (input.offerId) {
        const offer = await one(client, 'select id from erp.mkt_campaign_offers where id = $1', [input.offerId])
        if (!offer) throw AppError.badRequest('offerId does not reference an offer')
      }
      if (input.salesOrderId) {
        const order = await one(client, 'select id from erp.sales_orders where id = $1', [input.salesOrderId])
        if (!order) throw AppError.badRequest('salesOrderId does not reference a sales order')
      }

      const code = await nextDocNumber(client, auth.orgId, 'discount')
      const row = await one<{ id: string }>(
        client,
        `insert into erp.mkt_discounts (
           org_id, code, offer_id, customer_id, sales_order_id, requested_by,
           requested_percent, status, reason, idempotency_key
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, erp.current_user_id(), $5, 'Pending', $6, $7
         ) returning id`,
        [
          code,
          input.offerId ?? null,
          input.customerId ?? null,
          input.salesOrderId ?? null,
          input.requestedPercent,
          input.reason,
          idempotencyKey,
        ],
      )

      await raiseApproval(client, {
        entityType: 'mkt_discount',
        entityId: row!.id,
        title: `Discount approval: ${input.requestedPercent}% on ${code}`,
        stage: 'discount',
        assignedRole: 'marketing.discount.approve',
        payload: {
          requestedPercent: input.requestedPercent,
          customerId: input.customerId ?? null,
          offerId: input.offerId ?? null,
        },
      })
      await audit(client, 'marketing.discount.requested', 'mkt_discounts', row!.id, `${code} · ${input.requestedPercent}%`, null, {
        requestedPercent: input.requestedPercent,
        customerId: input.customerId ?? null,
      })

      const full = await one(client, `select ${DISCOUNT_SELECT} where d.id = $1`, [row!.id])
      return mapDiscount(full!)
    })

    sendData(res, discount, 201)
  },
)

campaignsRouter.post(
  '/discounts/:id/decide',
  requirePermission('marketing.discount.approve', 'marketing.approval.decide', 'approval.decide'),
  validateBody(
    z.object({
      decision: z.enum(['Approved', 'Rejected', 'Changes Requested']),
      comments: optionalText(2000),
      approvedPercent: z.coerce.number().min(0).max(100).optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{
      decision: 'Approved' | 'Rejected' | 'Changes Requested'
      comments?: string
      approvedPercent?: number
    }>(req)

    if (input.decision !== 'Approved' && !input.comments) {
      throw AppError.badRequest('A comment is required unless the discount is approved')
    }

    const discount = await withRls(auth, async (client) => {
      const current = await one<{
        id: string
        status: string
        requested_percent: string
        requested_by: string | null
        code: string
      }>(
        client,
        'select id, status, requested_percent, requested_by, code from erp.mkt_discounts where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Discount request not found')
      if (current.status !== 'Pending') {
        throw AppError.conflict(`This request is not pending (status: ${current.status})`)
      }
      if (current.requested_by === auth.userId) {
        throw AppError.forbidden('Self-approval is not permitted')
      }

      const approvedPercent =
        input.decision === 'Approved'
          ? (input.approvedPercent ?? Number(current.requested_percent))
          : null
      if (approvedPercent !== null && approvedPercent > Number(current.requested_percent)) {
        throw AppError.badRequest('approvedPercent cannot exceed the requested percentage')
      }

      const decided = await decideEntityApproval(
        client,
        'mkt_discount',
        id,
        input.decision,
        input.comments ?? null,
        approvedPercent,
        'discount',
      )
      if (!decided) {
        throw AppError.conflict('No pending approval request was found for this discount')
      }

      const nextStatus =
        input.decision === 'Approved'
          ? 'Approved'
          : input.decision === 'Rejected'
            ? 'Rejected'
            : 'Draft'

      await client.query(
        `update erp.mkt_discounts
            set status = $2, approved_percent = $3,
                decided_at = now(), decided_by = erp.current_user_id(), updated_at = now()
          where id = $1`,
        [id, nextStatus, approvedPercent],
      )
      await client.query(
        `insert into erp.mkt_discount_approvals (
           org_id, discount_id, approver_user_id, decision, approved_percent, remarks
         ) values (
           erp.current_org_id(), $1, erp.current_user_id(), $2, $3, $4
         )`,
        [id, input.decision, approvedPercent, input.comments ?? null],
      )
      await audit(
        client,
        `marketing.discount.${input.decision === 'Approved' ? 'approved' : 'decided'}`,
        'mkt_discounts',
        id,
        `${current.code} · ${input.decision}`,
        { status: 'Pending' },
        { status: nextStatus, approvedPercent },
      )

      const full = await one(client, `select ${DISCOUNT_SELECT} where d.id = $1`, [id])
      return mapDiscount(full!)
    })

    sendData(res, discount)
  },
)
