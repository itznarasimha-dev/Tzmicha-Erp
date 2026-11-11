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
  mapActivityRecord,
  mapRewardTransaction,
  mapRewardWallet,
  mapTarget,
} from '../../mappers/marketing.js'
import { buildUpdate, createFilter } from '../../lib/sql.js'
import {
  dateOnlySchema,
  optionalText,
  optionalUuid,
  periodSchema,
  uuidSchema,
} from '../../lib/validation.js'
import { activeOrgUser } from './shared.js'

export const performanceRouter = Router()

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
performanceRouter.get(
  '/dashboard',
  requirePermission('marketing.analytics.read', 'marketing.lead.read'),
  async (req, res) => {
    const auth = req.auth!

    const payload = await withRls(
      auth,
      async (client) => {
        const [summary, pipeline, campaigns, recentActivity, pendingApprovals, expenses] =
          await Promise.all([
            one(client, 'select * from erp.v_marketing_dashboard where org_id = erp.current_org_id()'),
            many(
              client,
              `select * from erp.v_lead_pipeline
                where org_id = erp.current_org_id()
                order by lead_count desc`,
            ),
            many(
              client,
              `select * from erp.v_campaign_performance
                where org_id = erp.current_org_id()
                order by leads desc, name limit 8`,
            ),
            many(
              client,
              `select * from erp.mkt_activity_records
                where org_id = erp.current_org_id()
                order by occurred_at desc limit 12`,
            ),
            many(
              client,
              `select entity_type, count(*)::int as count
                 from erp.approval_requests
                where org_id = erp.current_org_id() and status = 'Pending'
                group by entity_type`,
            ),
            many(
              client,
              `select * from erp.v_marketing_expense_summary
                where org_id = erp.current_org_id()
                order by period desc limit 24`,
            ),
          ])

        return {
          summary: summary
            ? {
                totalLeads: Number(summary.total_leads ?? 0),
                newLeads: Number(summary.new_leads ?? 0),
                qualifiedLeads: Number(summary.qualified_leads ?? 0),
                convertedLeads: Number(summary.converted_leads ?? 0),
                rejectedLeads: Number(summary.rejected_leads ?? 0),
                overdueFollowUps: Number(summary.overdue_follow_ups ?? 0),
                activeCampaigns: Number(summary.active_campaigns ?? 0),
                totalBudget: Number(summary.total_budget ?? 0),
                totalSpend: Number(summary.total_spend ?? 0),
                approvedExpenses: Number(summary.approved_expenses ?? 0),
                pendingApprovals: Number(summary.pending_approvals ?? 0),
                rewardsOutstanding: Number(summary.rewards_outstanding ?? 0),
              }
            : null,
          pipeline,
          topCampaigns: campaigns,
          recentActivity: recentActivity.map(mapActivityRecord),
          pendingApprovalsByType: pendingApprovals,
          expenseSummary: expenses,
        }
      },
      { readOnly: true },
    )

    sendData(res, payload)
  },
)

// ---------------------------------------------------------------------------
// Targets (shared erp.marketing_targets)
// ---------------------------------------------------------------------------
const targetQuery = z.object({
  userId: optionalUuid,
  metric: z.enum(['leads', 'qualified_leads', 'conversions', 'revenue', 'visits', 'campaigns']).optional(),
  period: periodSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

performanceRouter.get(
  '/targets',
  requirePermission('marketing.target.read'),
  validateQuery(targetQuery),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<z.infer<typeof targetQuery>>(req)
    const pagination = parsePagination(query)

    const result = await withRls(
      auth,
      async (client) => {
        const filter = createFilter()
        filter.equal('t.user_id', query.userId)
        filter.equal('t.metric', query.metric)
        if (query.period) {
          filter.raw(`to_char(t.period_start, 'YYYY-MM') <= ${filter.param(query.period)}`)
          filter.raw(`to_char(t.period_end, 'YYYY-MM') >= ${filter.param(query.period)}`)
        }
        filter.gte('t.period_end', query.from)
        filter.lte('t.period_start', query.to)

        const total = await count(
          client,
          `select count(*)::text as total from erp.marketing_targets t ${filter.where}`,
          filter.params,
        )
        const limit = filter.param(pagination.pageSize)
        const offset = filter.param(pagination.offset)
        const rows = await many(
          client,
          `select t.*, u.name as user_name
             from erp.marketing_targets t
             join erp.users u on u.id = t.user_id
             ${filter.where}
            order by t.period_start desc, u.name, t.metric
            limit ${limit} offset ${offset}`,
          filter.params,
        )
        return paginated(rows.map(mapTarget), total, pagination)
      },
      { readOnly: true },
    )

    res.json(result)
  },
)

const targetUpsertSchema = z.object({
  userId: optionalUuid,
  periodStart: dateOnlySchema,
  periodEnd: dateOnlySchema,
  metric: z.enum(['leads', 'qualified_leads', 'conversions', 'revenue', 'visits', 'campaigns']).default('leads'),
  targetValue: z.coerce.number().min(0).max(1_000_000_000),
  achievedValue: z.coerce.number().min(0).max(1_000_000_000).optional(),
  unit: z.string().trim().min(1).max(20).default('count'),
  notes: optionalText(1000),
  planId: optionalUuid,
})

performanceRouter.post(
  '/targets',
  requirePermission('marketing.target.write'),
  validateBody(targetUpsertSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof targetUpsertSchema>>(req)
    if (input.periodEnd < input.periodStart) {
      throw AppError.badRequest('periodEnd must be on or after periodStart')
    }

    const target = await withRls(auth, async (client) => {
      const userId = input.userId ?? auth.userId
      await activeOrgUser(client, userId, 'Employee')
      if (input.planId) {
        const plan = await one(client, 'select id from erp.mkt_plans where id = $1', [input.planId])
        if (!plan) throw AppError.badRequest('planId does not reference a marketing plan')
      }

      const row = await one<{ id: string }>(
        client,
        `insert into erp.marketing_targets (
           org_id, user_id, period_start, period_end, metric, target_value,
           achieved_value, unit, notes, plan_id, created_by
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, erp.current_user_id()
         )
         on conflict (org_id, user_id, period_start, period_end, metric) do update
           set target_value = excluded.target_value,
               achieved_value = excluded.achieved_value,
               unit = excluded.unit,
               notes = excluded.notes,
               plan_id = excluded.plan_id,
               updated_at = now()
         returning id`,
        [
          userId,
          input.periodStart,
          input.periodEnd,
          input.metric,
          input.targetValue,
          input.achievedValue ?? 0,
          input.unit,
          input.notes ?? null,
          input.planId ?? null,
        ],
      )
      await audit(client, 'marketing.target.upserted', 'marketing_targets', row!.id, `${input.metric} target ${input.targetValue}`)

      const full = await one(
        client,
        `select t.*, u.name as user_name from erp.marketing_targets t
           join erp.users u on u.id = t.user_id where t.id = $1`,
        [row!.id],
      )
      return mapTarget(full!)
    })

    sendData(res, target, 201)
  },
)

const targetUpdateSchema = z.object({
  targetValue: z.coerce.number().min(0).max(1_000_000_000).optional(),
  achievedValue: z.coerce.number().min(0).max(1_000_000_000).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  notes: optionalText(1000),
  planId: optionalUuid,
})

const TARGET_UPDATE_COLUMNS = {
  targetValue: 'target_value',
  achievedValue: 'achieved_value',
  unit: 'unit',
  notes: 'notes',
  planId: 'plan_id',
} as const

performanceRouter.patch(
  '/targets/:id',
  requirePermission('marketing.target.write'),
  validateBody(targetUpdateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof targetUpdateSchema>>(req)

    const target = await withRls(auth, async (client) => {
      const mapped: Record<string, unknown> = {}
      for (const [key, column] of Object.entries(TARGET_UPDATE_COLUMNS)) {
        const value = (input as Record<string, unknown>)[key]
        if (value !== undefined) mapped[column] = value
      }
      const fragment = buildUpdate(mapped, Object.values(TARGET_UPDATE_COLUMNS))
      if (!fragment.text) throw AppError.badRequest('No fields to update')

      const updated = await one(
        client,
        `update erp.marketing_targets t
            set ${fragment.text}, updated_at = now()
          where t.id = $${fragment.values.length + 1}
          returning t.id`,
        [...fragment.values, id],
      )
      if (!updated) throw AppError.notFound('Target not found')
      await audit(client, 'marketing.target.updated', 'marketing_targets', id, 'Target updated')

      const full = await one(
        client,
        `select t.*, u.name as user_name from erp.marketing_targets t
           join erp.users u on u.id = t.user_id where t.id = $1`,
        [id],
      )
      return mapTarget(full!)
    })

    sendData(res, target)
  },
)

// ---------------------------------------------------------------------------
// Employee performance snapshots (derived)
// ---------------------------------------------------------------------------
performanceRouter.get(
  '/performance',
  requirePermission('marketing.performance.read', 'marketing.analytics.read'),
  validateQuery(
    z.object({
      employeeId: optionalUuid,
      period: periodSchema.optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<{ employeeId?: string; period?: string }>(req)
    const pagination = parsePagination(query)

    const result = await withRls(
      auth,
      async (client) => {
        const filter = createFilter()
        filter.equal('p.employee_id', query.employeeId)
        filter.equal('p.period', query.period)

        const total = await count(
          client,
          `select count(*)::text as total from erp.mkt_employee_performance p ${filter.where}`,
          filter.params,
        )
        const limit = filter.param(pagination.pageSize)
        const offset = filter.param(pagination.offset)
        const rows = await many(
          client,
          `select * from erp.v_employee_performance p ${filter.where}
            order by p.period desc, p.leads_generated desc
            limit ${limit} offset ${offset}`,
          filter.params,
        )
        return paginated(rows, total, pagination)
      },
      { readOnly: true },
    )

    res.json(result)
  },
)

performanceRouter.post(
  '/performance/refresh',
  requirePermission('marketing.target.write', 'marketing.performance.read'),
  validateBody(z.object({ period: periodSchema })),
  async (req, res) => {
    const auth = req.auth!
    const { period } = validatedBody<{ period: string }>(req)

    const rows = await withRls(auth, async (client) => {
      await client.query(
        `insert into erp.mkt_employee_performance (
           org_id, employee_id, period, leads_generated, leads_qualified, conversions,
           field_visits, campaigns_owned, revenue_attributed, target_leads, score, computed_at
         )
         select
           erp.current_org_id(),
           u.id,
           $1::text,
           (select count(*) from erp.mkt_leads l
             where l.org_id = erp.current_org_id()
               and coalesce(l.generated_by, l.assigned_to) = u.id
               and l.created_at >= $1::date
               and l.created_at < ($1::date + interval '1 month'))::int,
           (select count(*) from erp.mkt_leads l
             where l.org_id = erp.current_org_id()
               and coalesce(l.generated_by, l.assigned_to) = u.id
               and l.status in ('Qualified','Sent to Sales','Converted')
               and l.created_at >= $1::date
               and l.created_at < ($1::date + interval '1 month'))::int,
           (select count(*) from erp.mkt_leads l
             where l.org_id = erp.current_org_id()
               and coalesce(l.generated_by, l.assigned_to) = u.id
               and l.converted
               and l.updated_at >= $1::date
               and l.updated_at < ($1::date + interval '1 month'))::int,
           (select count(*) from erp.mkt_field_visits v
             where v.org_id = erp.current_org_id()
               and v.assigned_to = u.id
               and v.visit_date >= $1::date
               and v.visit_date < ($1::date + interval '1 month'))::int,
           (select count(*) from erp.mkt_campaigns c
             where c.org_id = erp.current_org_id()
               and c.owner_user_id = u.id
               and c.start_date >= $1::date
               and c.start_date < ($1::date + interval '1 month'))::int,
           (select coalesce(sum((l.qualification ->> 'estimatedValue')::numeric), 0)
              from erp.mkt_leads l
             where l.org_id = erp.current_org_id()
               and coalesce(l.generated_by, l.assigned_to) = u.id
               and l.converted
               and l.updated_at >= $1::date
               and l.updated_at < ($1::date + interval '1 month'))::numeric(14,2),
           (select coalesce(sum(t.target_value), 0) from erp.marketing_targets t
             where t.org_id = erp.current_org_id()
               and t.user_id = u.id
               and t.metric = 'leads'
               and t.period_start <= ($1::date + interval '1 month - 1 day')::date
               and t.period_end >= $1::date)::int,
           0,
           now()
         from erp.users u
         where u.org_id = erp.current_org_id()
           and u.status = 'active'
           and (
             exists (select 1 from erp.mkt_leads l
                      where l.org_id = erp.current_org_id()
                        and coalesce(l.generated_by, l.assigned_to) = u.id)
             or exists (select 1 from erp.mkt_field_visits v
                         where v.org_id = erp.current_org_id() and v.assigned_to = u.id)
             or exists (select 1 from erp.mkt_campaigns c
                         where c.org_id = erp.current_org_id() and c.owner_user_id = u.id)
             or exists (select 1 from erp.marketing_targets t
                         where t.org_id = erp.current_org_id() and t.user_id = u.id)
           )
         on conflict (org_id, employee_id, period) do update
           set leads_generated = excluded.leads_generated,
               leads_qualified = excluded.leads_qualified,
               conversions = excluded.conversions,
               field_visits = excluded.field_visits,
               campaigns_owned = excluded.campaigns_owned,
               revenue_attributed = excluded.revenue_attributed,
               target_leads = excluded.target_leads,
               score = case when excluded.target_leads > 0
                            then round(least(100, excluded.leads_generated::numeric
                                              / excluded.target_leads * 100), 2)
                            else 0 end,
               computed_at = now(),
               updated_at = now()`,
        [period],
      )

      // Recompute the score for both freshly inserted and updated snapshots.
      // The insert path previously left a brand-new row at score = 0.
      await client.query(
        `update erp.mkt_employee_performance
            set score = case
                          when target_leads > 0
                          then round(least(100, leads_generated::numeric / target_leads * 100), 2)
                          else 0
                        end,
                updated_at = now()
          where org_id = erp.current_org_id() and period = $1`,
        [period],
      )

      await audit(client, 'marketing.performance.refreshed', 'mkt_employee_performance', null, `Period ${period}`)

      return many(
        client,
        `select * from erp.v_employee_performance
          where org_id = erp.current_org_id() and period = $1
          order by leads_generated desc`,
        [period],
      )
    })

    sendData(res, rows)
  },
)

// ---------------------------------------------------------------------------
// Rewards ledger
// ---------------------------------------------------------------------------
const WALLET_SELECT = `
  select w.id, w.employee_id, u.name as employee_name, w.currency, w.balance,
         coalesce(sum(t.amount) filter (where t.entry_type in ('Award','Adjustment','Opening')), 0)::numeric(14,2) as total_awarded,
         coalesce(abs(sum(t.amount) filter (where t.entry_type in ('Redemption','Reversal'))), 0)::numeric(14,2) as total_redeemed,
         max(t.created_at) as last_transaction_at
    from erp.mkt_reward_wallets w
    join erp.users u on u.id = w.employee_id
    left join erp.mkt_reward_transactions t on t.wallet_id = w.id
`

performanceRouter.get(
  '/rewards',
  requirePermission('marketing.reward.read'),
  validateQuery(
    z.object({
      employeeId: optionalUuid,
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const query = validatedQuery<{ employeeId?: string }>(req)
    const pagination = parsePagination(query)

    const result = await withRls(
      auth,
      async (client) => {
        const filter = createFilter()
        filter.equal('w.employee_id', query.employeeId)
        const total = await count(
          client,
          `select count(*)::text as total from erp.mkt_reward_wallets w ${filter.where}`,
          filter.params,
        )
        const limit = filter.param(pagination.pageSize)
        const offset = filter.param(pagination.offset)
        const rows = await many(
          client,
          `${WALLET_SELECT} ${filter.where}
            group by w.id, w.employee_id, u.name, w.currency, w.balance
            order by w.balance desc
            limit ${limit} offset ${offset}`,
          filter.params,
        )
        return paginated(rows.map(mapRewardWallet), total, pagination)
      },
      { readOnly: true },
    )

    res.json(result)
  },
)

performanceRouter.get('/rewards/:employeeId/transactions', async (req, res) => {
  const auth = req.auth!
  const employeeId = uuidSchema.parse(req.params.employeeId)
  if (employeeId !== auth.userId && !hasPermission(auth, 'marketing.reward.read')) {
    throw AppError.forbidden('You may only view your own reward history')
  }

  const rows = await withRls(
    auth,
    (client) =>
      many(
        client,
        `select t.*, u.name as created_by_name
           from erp.mkt_reward_transactions t
           left join erp.users u on u.id = t.created_by
          where t.employee_id = $1
          order by t.created_at desc limit 200`,
        [employeeId],
      ),
    { readOnly: true },
  )

  sendData(res, rows.map(mapRewardTransaction))
})

async function walletForUpdate(client: Parameters<typeof one>[0], employeeId: string, currency: string) {
  await client.query(
    `insert into erp.mkt_reward_wallets (org_id, employee_id, currency)
     values (erp.current_org_id(), $1, $2)
     on conflict (org_id, employee_id) do nothing`,
    [employeeId, currency],
  )
  const wallet = await one<{ id: string; balance: string; currency: string }>(
    client,
    `select id, balance, currency from erp.mkt_reward_wallets
      where employee_id = $1 and org_id = erp.current_org_id()
      for update`,
    [employeeId],
  )
  if (!wallet) throw AppError.badRequest('Could not open a reward wallet')
  return wallet
}

const awardSchema = z.object({
  employeeId: uuidSchema,
  amount: z.coerce.number().positive().max(1_000_000_000),
  entryType: z.enum(['Award', 'Adjustment', 'Opening']).default('Award'),
  note: optionalText(500),
  referenceType: optionalText(60),
  referenceId: optionalUuid,
})

performanceRouter.post(
  '/rewards/award',
  requirePermission('marketing.reward.write'),
  validateBody(awardSchema),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<z.infer<typeof awardSchema>>(req)

    const payload = await withRls(auth, async (client) => {
      await activeOrgUser(client, input.employeeId, 'Employee')
      const wallet = await walletForUpdate(client, input.employeeId, auth.org.currency)
      const tx = await one<{ id: string }>(
        client,
        `insert into erp.mkt_reward_transactions (
           org_id, wallet_id, employee_id, entry_type, amount, balance_after,
           reference_type, reference_id, note, created_by
         ) values (
           erp.current_org_id(), $1, $2, $3, $4, 0, $5, $6, $7, erp.current_user_id()
         ) returning id`,
        [
          wallet.id,
          input.employeeId,
          input.entryType,
          input.amount,
          input.referenceType ?? null,
          input.referenceId ?? null,
          input.note ?? null,
        ],
      )
      await audit(
        client,
        'marketing.reward.awarded',
        'mkt_reward_transactions',
        tx!.id,
        `${input.entryType} ${input.amount} to ${input.employeeId}`,
      )

      const saved = await one(
        client,
        `${WALLET_SELECT} where w.employee_id = $1
          group by w.id, w.employee_id, u.name, w.currency, w.balance`,
        [input.employeeId],
      )
      const transaction = await one(client, 'select * from erp.mkt_reward_transactions where id = $1', [tx!.id])
      return {
        wallet: mapRewardWallet(saved!),
        transaction: mapRewardTransaction(transaction!),
      }
    })

    sendData(res, payload, 201)
  },
)

performanceRouter.post(
  '/rewards/redeem',
  validateBody(
    z.object({
      employeeId: optionalUuid,
      amount: z.coerce.number().positive().max(1_000_000_000),
      note: optionalText(500),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const input = validatedBody<{ employeeId?: string; amount: number; note?: string }>(req)
    const employeeId = input.employeeId ?? auth.userId
    if (employeeId !== auth.userId && !hasPermission(auth, 'marketing.reward.write')) {
      throw AppError.forbidden('You may only redeem from your own reward wallet')
    }

    const payload = await withRls(auth, async (client) => {
      await activeOrgUser(client, employeeId, 'Employee')
      const wallet = await walletForUpdate(client, employeeId, auth.org.currency)
      if (Number(wallet.balance) < input.amount) {
        throw AppError.conflict('Redemption exceeds the available reward balance')
      }

      const tx = await one<{ id: string }>(
        client,
        `insert into erp.mkt_reward_transactions (
           org_id, wallet_id, employee_id, entry_type, amount, balance_after,
           note, created_by
         ) values (
           erp.current_org_id(), $1, $2, 'Redemption', $3, 0, $4, erp.current_user_id()
         ) returning id`,
        [wallet.id, employeeId, -input.amount, input.note ?? null],
      )
      await audit(client, 'marketing.reward.redeemed', 'mkt_reward_transactions', tx!.id, `${input.amount} redeemed`)

      const saved = await one(
        client,
        `${WALLET_SELECT} where w.employee_id = $1
          group by w.id, w.employee_id, u.name, w.currency, w.balance`,
        [employeeId],
      )
      const transaction = await one(client, 'select * from erp.mkt_reward_transactions where id = $1', [tx!.id])
      return {
        wallet: mapRewardWallet(saved!),
        transaction: mapRewardTransaction(transaction!),
      }
    })

    sendData(res, payload, 201)
  },
)
