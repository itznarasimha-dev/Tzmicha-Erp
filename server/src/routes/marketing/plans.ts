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
import {
  mapMarketingExpense,
  mapPlan,
  mapPlanActivity,
  mapPlanApproval,
} from '../../mappers/marketing.js'
import { buildUpdate, createFilter } from '../../lib/sql.js'
import {
  dateOnlySchema,
  optionalDate,
  optionalText,
  optionalUuid,
  periodSchema,
  uuidSchema,
} from '../../lib/validation.js'
import {
  decideEntityApproval,
  raiseApproval,
} from '../../lib/approvals.js'
import { findReplay, readIdempotencyKey } from '../../lib/idempotency.js'
import { activeOrgUser } from './shared.js'

export const plansRouter = Router()

const PLAN_STATUSES = [
  'Draft',
  'Pending Senior Review',
  'Pending Manager Approval',
  'Pending Admin Financial Authorization',
  'Changes Requested',
  'Rejected',
  'Approved',
  'In Progress',
  'Submitted for Results Review',
  'Completed',
] as const

const PLAN_FROM = `
  from erp.mkt_plans p
  join erp.users e on e.id = p.employee_id
  left join erp.users sr on sr.id = p.senior_reviewer_id
`

const PLAN_SELECT = `p.*, e.name as employee_name, sr.name as senior_reviewer_name ${PLAN_FROM}`

function canReadAllPlans(auth: AuthContext): boolean {
  return auth.isAdmin || auth.permissions.has('marketing.plan.read')
}

async function planWithRelations(client: Parameters<typeof many>[0], id: string) {
  const row = await one(client, `select ${PLAN_SELECT} where p.id = $1`, [id])
  if (!row) throw AppError.notFound('Marketing plan not found')

  const [activities, approvals] = await Promise.all([
    many(client, 'select * from erp.mkt_plan_activities where plan_id = $1 order by created_at', [id]),
    many(client, 'select * from erp.mkt_plan_approvals where plan_id = $1 order by occurred_at', [id]),
  ])

  return {
    ...mapPlan(row),
    activities: activities.map(mapPlanActivity),
    approvals: approvals.map(mapPlanApproval),
  }
}

async function recordPlanApproval(
  client: Parameters<typeof many>[0],
  planId: string,
  input: {
    stage: 'submission' | 'senior' | 'manager' | 'admin' | 'execution' | 'results' | 'completed'
    action: string
    decision:
      | 'Submitted'
      | 'Approved'
      | 'Changes Requested'
      | 'Rejected'
      | 'Started'
      | 'Progress Updated'
      | 'Results Submitted'
      | 'Revision Requested'
      | 'Completed'
    comments?: string | null
    byName: string
    byRole?: string
    byUserId: string
  },
): Promise<void> {
  await client.query(
    `insert into erp.mkt_plan_approvals (
       org_id, plan_id, stage, action, by_user_id, by_name, by_role, decision, comments
     ) values (erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      planId,
      input.stage,
      input.action,
      input.byUserId,
      input.byName,
      input.byRole ?? null,
      input.decision,
      input.comments ?? null,
    ],
  )
}

async function assertPlanEditable(
  client: Parameters<typeof one>[0],
  planId: string,
  auth: AuthContext,
): Promise<{ id: string; employee_id: string; status: string; senior_reviewer_id: string | null; title: string; month: string; estimated_budget: string; requested_amount: string; finance_required: boolean }> {
  const plan = await one<{
    id: string
    employee_id: string
    status: string
    senior_reviewer_id: string | null
    title: string
    month: string
    estimated_budget: string
    requested_amount: string
    finance_required: boolean
  }>(
    client,
    `select id, employee_id, status, senior_reviewer_id, title, month,
            estimated_budget, requested_amount, finance_required
       from erp.mkt_plans where id = $1 for update`,
    [planId],
  )
  if (!plan) throw AppError.notFound('Marketing plan not found')

  const isOwner = plan.employee_id === auth.userId
  const canApprove = hasPermission(auth, 'marketing.plan.approve')
  if (!isOwner && !canApprove) {
    throw AppError.forbidden('You may only manage your own marketing plans')
  }
  return plan
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------
const planQuery = z.object({
  q: z.string().trim().max(120).optional(),
  employeeId: optionalUuid,
  month: periodSchema.optional(),
  status: z.enum(PLAN_STATUSES).optional(),
  from: periodSchema.optional(),
  to: periodSchema.optional(),
  sort: z
    .enum(['month:asc', 'month:desc', 'createdAt:asc', 'createdAt:desc', 'status:asc'])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

plansRouter.get('/plans', validateQuery(planQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof planQuery>>(req)
  const pagination = parsePagination(query)
  const sort = parseSort(query.sort, { month: 'p.month', createdAt: 'p.created_at', status: 'p.status' }, 'month')

  const result = await withRls(
    auth,
    async (client) => {
      const filter = createFilter()
      if (!canReadAllPlans(auth)) {
        filter.raw('(p.employee_id = erp.current_user_id() or p.senior_reviewer_id = erp.current_user_id())')
      }
      filter.equal('p.employee_id', query.employeeId)
      filter.equal('p.month', query.month)
      filter.equal('p.status', query.status)
      filter.gte('p.month', query.from)
      filter.lte('p.month', query.to)
      filter.search(['p.title', 'p.code', 'p.objective'], query.q)

      const total = await count(client, `select count(*)::text as total ${PLAN_FROM} ${filter.where}`, filter.params)
      const limit = filter.param(pagination.pageSize)
      const offset = filter.param(pagination.offset)
      const rows = await many(
        client,
        `select ${PLAN_SELECT} ${filter.where}
          order by ${sort.clause}, p.id
          limit ${limit} offset ${offset}`,
        filter.params,
      )

      const ids = rows.map((row) => row.id as string)
      const activities = ids.length
        ? await many(
            client,
            `select * from erp.mkt_plan_activities where plan_id = any($1::uuid[]) order by created_at`,
            [ids],
          )
        : []
      const byPlan = new Map<string, unknown[]>()
      for (const activity of activities) {
        const list = byPlan.get(activity.plan_id) ?? []
        list.push(mapPlanActivity(activity))
        byPlan.set(activity.plan_id, list)
      }

      return paginated(
        rows.map((row) => ({ ...mapPlan(row), activities: byPlan.get(row.id) ?? [] })),
        total,
        pagination,
      )
    },
    { readOnly: true },
  )

  res.json(result)
})

plansRouter.get('/plans/:id', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(
    auth,
    async (client) => {
      const plan = await one<{ employee_id: string; senior_reviewer_id: string | null }>(
        client,
        'select employee_id, senior_reviewer_id from erp.mkt_plans where id = $1',
        [id],
      )
      if (!plan) throw AppError.notFound('Marketing plan not found')
      if (
        !canReadAllPlans(auth) &&
        plan.employee_id !== auth.userId &&
        plan.senior_reviewer_id !== auth.userId
      ) {
        throw AppError.forbidden('You may only view your own marketing plans')
      }
      return planWithRelations(client, id)
    },
    { readOnly: true },
  )

  sendData(res, payload)
})

const planActivitySchema = z.object({
  type: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  objective: optionalText(1000),
  targetAudience: optionalText(500),
  plannedActivities: optionalText(2000),
  expectedLeads: z.coerce.number().int().min(0).max(1_000_000).default(0),
  expectedConversions: z.coerce.number().int().min(0).max(1_000_000).default(0),
  monthlyTarget: z.coerce.number().int().min(0).max(1_000_000).default(0),
  estimatedBudget: z.coerce.number().min(0).max(1_000_000_000).default(0),
  expectedOutcome: optionalText(1000),
  startDate: optionalDate,
  endDate: optionalDate,
  supportingNotes: optionalText(2000),
})

const planCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  month: periodSchema,
  employeeId: optionalUuid,
  seniorReviewerId: optionalUuid,
  objective: optionalText(2000),
  targetAudience: optionalText(500),
  plannedActivities: optionalText(4000),
  expectedLeads: z.coerce.number().int().min(0).max(1_000_000).default(0),
  expectedConversions: z.coerce.number().int().min(0).max(1_000_000).default(0),
  monthlyTarget: z.coerce.number().int().min(0).max(1_000_000).default(0),
  estimatedBudget: z.coerce.number().min(0).max(1_000_000_000).default(0),
  requestedAmount: z.coerce.number().min(0).max(1_000_000_000).default(0),
  expectedOutcome: optionalText(1000),
  startDate: optionalDate,
  endDate: optionalDate,
  supportingNotes: optionalText(2000),
  financeRequired: z.boolean().optional(),
  activities: z.array(planActivitySchema).max(50).default([]),
})

async function insertPlanActivities(
  client: Parameters<typeof many>[0],
  planId: string,
  activities: z.infer<typeof planActivitySchema>[],
): Promise<void> {
  for (const activity of activities) {
    await client.query(
      `insert into erp.mkt_plan_activities (
         org_id, plan_id, activity_type, name, objective, target_audience,
         planned_activities, expected_leads, expected_conversions, monthly_target,
         estimated_budget, expected_outcome, start_date, end_date, supporting_notes
       ) values (
         erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
       )`,
      [
        planId,
        activity.type,
        activity.name,
        activity.objective ?? null,
        activity.targetAudience ?? null,
        activity.plannedActivities ?? null,
        activity.expectedLeads,
        activity.expectedConversions,
        activity.monthlyTarget,
        activity.estimatedBudget,
        activity.expectedOutcome ?? null,
        activity.startDate ?? null,
        activity.endDate ?? null,
        activity.supportingNotes ?? null,
      ],
    )
  }
}

plansRouter.post('/plans', requirePermission('marketing.plan.create'), validateBody(planCreateSchema), async (req, res) => {
  const auth = req.auth!
  const input = validatedBody<z.infer<typeof planCreateSchema>>(req)
  const idempotencyKey = readIdempotencyKey(req.headers['idempotency-key'])

  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw AppError.badRequest('endDate must be on or after startDate')
  }
  if (input.expectedConversions > input.expectedLeads && input.expectedLeads > 0) {
    throw AppError.badRequest('Expected conversions cannot exceed expected leads')
  }
  if (input.employeeId && input.employeeId !== auth.userId && !hasPermission(auth, 'marketing.plan.approve')) {
    throw AppError.forbidden('You may only create plans for yourself')
  }

  const plan = await withRls(auth, async (client) => {
    const replay = await findReplay<{ id: string }>(client, 'erp.mkt_plans', 'id', auth.orgId, idempotencyKey)
    if (replay) return planWithRelations(client, replay.id)

    const employeeId = input.employeeId ?? auth.userId
    const employee = await activeOrgUser(client, employeeId, 'Employee')
    if (input.seniorReviewerId) {
      await activeOrgUser(client, input.seniorReviewerId, 'Senior reviewer')
    }

    const code = await nextDocNumber(client, auth.orgId, 'plan')
    const row = await one<{ id: string }>(
      client,
      `insert into erp.mkt_plans (
         org_id, code, title, month, employee_id, employee_role, senior_reviewer_id,
         objective, target_audience, planned_activities, expected_leads, expected_conversions,
         monthly_target, estimated_budget, requested_amount, expected_outcome, start_date,
         end_date, supporting_notes, status, finance_required, idempotency_key, created_by
       ) values (
         erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17, $18, 'Draft', $19, $20, erp.current_user_id()
       ) returning id`,
      [
        code,
        input.title,
        input.month,
        employeeId,
        employee.role_code,
        input.seniorReviewerId ?? null,
        input.objective ?? null,
        input.targetAudience ?? null,
        input.plannedActivities ?? null,
        input.expectedLeads,
        input.expectedConversions,
        input.monthlyTarget,
        input.estimatedBudget,
        input.requestedAmount,
        input.expectedOutcome ?? null,
        input.startDate ?? null,
        input.endDate ?? null,
        input.supportingNotes ?? null,
        input.financeRequired ?? input.requestedAmount > 0,
        idempotencyKey,
      ],
    )
    if (!row) throw AppError.badRequest('Could not create the marketing plan')

    await insertPlanActivities(client, row.id, input.activities)
    await recordPlanApproval(client, row.id, {
      stage: 'submission',
      action: 'Plan created',
      decision: 'Submitted',
      comments: null,
      byName: auth.name,
      byUserId: auth.userId,
    })
    await audit(client, 'marketing.plan.created', 'mkt_plans', row.id, `${code} · ${input.title}`, null, {
      month: input.month,
      estimatedBudget: input.estimatedBudget,
    })

    return planWithRelations(client, row.id)
  })

  sendData(res, plan, 201)
})

const planUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  month: periodSchema.optional(),
  seniorReviewerId: optionalUuid,
  objective: optionalText(2000),
  targetAudience: optionalText(500),
  plannedActivities: optionalText(4000),
  expectedLeads: z.coerce.number().int().min(0).max(1_000_000).optional(),
  expectedConversions: z.coerce.number().int().min(0).max(1_000_000).optional(),
  monthlyTarget: z.coerce.number().int().min(0).max(1_000_000).optional(),
  estimatedBudget: z.coerce.number().min(0).max(1_000_000_000).optional(),
  requestedAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
  expectedOutcome: optionalText(1000),
  startDate: optionalDate,
  endDate: optionalDate,
  supportingNotes: optionalText(2000),
  financeRequired: z.boolean().optional(),
  activities: z.array(planActivitySchema).max(50).optional(),
})

const PLAN_UPDATE_COLUMNS = {
  title: 'title',
  month: 'month',
  seniorReviewerId: 'senior_reviewer_id',
  objective: 'objective',
  targetAudience: 'target_audience',
  plannedActivities: 'planned_activities',
  expectedLeads: 'expected_leads',
  expectedConversions: 'expected_conversions',
  monthlyTarget: 'monthly_target',
  estimatedBudget: 'estimated_budget',
  requestedAmount: 'requested_amount',
  expectedOutcome: 'expected_outcome',
  startDate: 'start_date',
  endDate: 'end_date',
  supportingNotes: 'supporting_notes',
  financeRequired: 'finance_required',
} as const

plansRouter.patch(
  '/plans/:id',
  validateBody(planUpdateSchema),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<z.infer<typeof planUpdateSchema>>(req)

    const plan = await withRls(auth, async (client) => {
      const current = await assertPlanEditable(client, id, auth)
      if (current.employee_id !== auth.userId && !hasPermission(auth, 'marketing.plan.approve')) {
        throw AppError.forbidden('You may only edit your own marketing plan')
      }
      if (!['Draft', 'Changes Requested'].includes(current.status)) {
        throw AppError.conflict(`A plan in status "${current.status}" can no longer be edited`)
      }

      const mapped: Record<string, unknown> = {}
      for (const [key, column] of Object.entries(PLAN_UPDATE_COLUMNS)) {
        const value = (input as Record<string, unknown>)[key]
        if (value !== undefined) mapped[column] = value
      }
      const fragment = buildUpdate(mapped, Object.values(PLAN_UPDATE_COLUMNS))
      if (!fragment.text && !input.activities) {
        throw AppError.badRequest('No fields to update')
      }
      if (fragment.text) {
        await client.query(
          `update erp.mkt_plans set ${fragment.text}, updated_at = now() where id = $${fragment.values.length + 1}`,
          [...fragment.values, id],
        )
      }

      if (input.activities) {
        await client.query('delete from erp.mkt_plan_activities where plan_id = $1', [id])
        await insertPlanActivities(client, id, input.activities)
      }

      await recordPlanApproval(client, id, {
        stage: 'submission',
        action: 'Plan updated',
        decision: 'Submitted',
        comments: current.status === 'Changes Requested' ? 'Revised after changes request' : null,
        byName: auth.name,
        byUserId: auth.userId,
      })
      await audit(client, 'marketing.plan.updated', 'mkt_plans', id, current.title, null, {
        fields: Object.keys(input).filter((key) => (input as Record<string, unknown>)[key] !== undefined),
      })

      return planWithRelations(client, id)
    })

    sendData(res, plan)
  },
)

plansRouter.post('/plans/:id/submit', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const plan = await withRls(auth, async (client) => {
    const current = await assertPlanEditable(client, id, auth)
    if (current.employee_id !== auth.userId && !hasPermission(auth, 'marketing.plan.approve')) {
      throw AppError.forbidden('You may only submit your own marketing plan')
    }
    if (!['Draft', 'Changes Requested'].includes(current.status)) {
      throw AppError.conflict(`A plan in status "${current.status}" cannot be submitted`)
    }

    const seniorName = current.senior_reviewer_id
      ? (await one<{ name: string }>(client, 'select name from erp.users where id = $1', [
          current.senior_reviewer_id,
        ]))?.name ?? null
      : null

    const useSenior = Boolean(current.senior_reviewer_id)
    const status = useSenior ? 'Pending Senior Review' : 'Pending Manager Approval'
    const approver = useSenior ? seniorName : 'Marketing Manager'

    await raiseApproval(client, {
      entityType: 'mkt_plan',
      entityId: id,
      title: `Marketing plan approval: ${current.title}`,
      stage: useSenior ? 'senior' : 'manager',
      assignedRole: 'marketing.plan.approve',
      assignedTo: current.senior_reviewer_id,
      amount: Number(current.requested_amount),
      payload: {
        month: current.month,
        estimatedBudget: Number(current.estimated_budget),
        requestedAmount: Number(current.requested_amount),
        financeRequired: current.finance_required,
      },
    })

    await client.query(
      `update erp.mkt_plans
          set status = $2, submitted_at = now(), current_approver_name = $3,
              revision_reason = null, updated_at = now()
        where id = $1`,
      [id, status, approver],
    )
    await recordPlanApproval(client, id, {
      stage: 'submission',
      action: 'Submitted for approval',
      decision: 'Submitted',
      comments: `Routed to ${approver}`,
      byName: auth.name,
      byUserId: auth.userId,
    })
    await audit(client, 'marketing.plan.submitted', 'mkt_plans', id, `Submitted to ${approver}`)

    return planWithRelations(client, id)
  })

  sendData(res, plan)
})

function planApprovalStage(status: string): 'senior' | 'manager' | 'admin' | null {
  if (status === 'Pending Senior Review') return 'senior'
  if (status === 'Pending Manager Approval') return 'manager'
  if (status === 'Pending Admin Financial Authorization') return 'admin'
  return null
}

plansRouter.post(
  '/plans/:id/approve',
  requirePermission('marketing.plan.approve'),
  validateBody(z.object({ comments: optionalText(2000) })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ comments?: string }>(req)

    const plan = await withRls(auth, async (client) => {
      const current = await one<{
        id: string
        employee_id: string
        status: string
        title: string
        month: string
        finance_required: boolean
        requested_amount: string
        estimated_budget: string
      }>(
        client,
        `select id, employee_id, status, title, month, finance_required,
                requested_amount, estimated_budget
           from erp.mkt_plans where id = $1 for update`,
        [id],
      )
      if (!current) throw AppError.notFound('Marketing plan not found')
      if (current.employee_id === auth.userId) throw AppError.forbidden('Self-approval is not permitted')

      const stage = planApprovalStage(current.status)
      if (!stage) {
        throw AppError.conflict(`This plan is not awaiting approval (status: ${current.status})`)
      }

      // Decide the request for the *current* stage before raising the next one.
      // Raising first would create a newer pending row that `decide_approval`
      // would then pick up by mistake.
      const nextStatus =
        stage === 'senior'
          ? 'Pending Manager Approval'
          : stage === 'manager' && current.finance_required
            ? 'Pending Admin Financial Authorization'
            : 'Approved'
      const approver =
        stage === 'senior'
          ? 'Marketing Manager'
          : stage === 'manager' && current.finance_required
            ? 'Finance / Admin'
            : null

      const decided = await decideEntityApproval(
        client,
        'mkt_plan',
        id,
        'Approved',
        input.comments ?? null,
        null,
        stage,
      )
      if (!decided) throw AppError.conflict('No pending approval request was found for this plan')

      if (stage === 'senior') {
        await raiseApproval(client, {
          entityType: 'mkt_plan',
          entityId: id,
          title: `Marketing plan approval: ${current.title}`,
          stage: 'manager',
          assignedRole: 'marketing.plan.approve',
          amount: Number(current.requested_amount),
          payload: { month: current.month, estimatedBudget: Number(current.estimated_budget) },
        })
      } else if (stage === 'manager' && current.finance_required) {
        await raiseApproval(client, {
          entityType: 'mkt_plan',
          entityId: id,
          title: `Financial authorisation: ${current.title}`,
          stage: 'admin',
          assignedRole: 'finance.approval.decide',
          amount: Number(current.requested_amount),
          payload: { month: current.month, estimatedBudget: Number(current.estimated_budget) },
        })
      }

      await client.query(
        `update erp.mkt_plans
            set status = $2, current_approver_name = $3, previous_approver_name = $4,
                updated_at = now()
          where id = $1`,
        [id, nextStatus, approver, auth.name],
      )
      await recordPlanApproval(client, id, {
        stage,
        action: `Approved at ${stage} stage`,
        decision: 'Approved',
        comments: input.comments ?? null,
        byName: auth.name,
        byRole: auth.role,
        byUserId: auth.userId,
      })
      await audit(
        client,
        'marketing.plan.approved',
        'mkt_plans',
        id,
        `${current.title} → ${nextStatus}`,
        { status: current.status },
        { status: nextStatus },
      )

      return planWithRelations(client, id)
    })

    sendData(res, plan)
  },
)

plansRouter.post(
  '/plans/:id/reject',
  requirePermission('marketing.plan.approve'),
  validateBody(z.object({ comments: z.string().trim().min(3).max(2000) })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ comments: string }>(req)

    const plan = await withRls(auth, async (client) => {
      const current = await one<{ id: string; employee_id: string; status: string; title: string }>(
        client,
        'select id, employee_id, status, title from erp.mkt_plans where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Marketing plan not found')
      if (current.employee_id === auth.userId) throw AppError.forbidden('Self-approval is not permitted')
      if (!current.status.startsWith('Pending ')) {
        throw AppError.conflict(`This plan is not awaiting approval (status: ${current.status})`)
      }
      const stage = planApprovalStage(current.status)
      if (!stage) {
        throw AppError.conflict(`This plan is not awaiting approval (status: ${current.status})`)
      }

      const decided = await decideEntityApproval(
        client,
        'mkt_plan',
        id,
        'Rejected',
        input.comments,
        null,
        stage,
      )
      if (!decided) throw AppError.conflict('No pending approval request was found for this plan')

      await client.query(
        `update erp.mkt_plans
            set status = 'Rejected', current_approver_name = null,
                revision_reason = $2, updated_at = now()
          where id = $1`,
        [id, input.comments],
      )
      await recordPlanApproval(client, id, {
        stage,
        action: 'Plan rejected',
        decision: 'Rejected',
        comments: input.comments,
        byName: auth.name,
        byRole: auth.role,
        byUserId: auth.userId,
      })
      await audit(client, 'marketing.plan.rejected', 'mkt_plans', id, input.comments, {
        status: current.status,
      }, { status: 'Rejected' })

      return planWithRelations(client, id)
    })

    sendData(res, plan)
  },
)

plansRouter.post(
  '/plans/:id/request-changes',
  requirePermission('marketing.plan.approve'),
  validateBody(z.object({ comments: z.string().trim().min(3).max(2000) })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ comments: string }>(req)

    const plan = await withRls(auth, async (client) => {
      const current = await one<{ id: string; employee_id: string; status: string; title: string }>(
        client,
        'select id, employee_id, status, title from erp.mkt_plans where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Marketing plan not found')
      if (current.employee_id === auth.userId) throw AppError.forbidden('Self-approval is not permitted')
      if (!current.status.startsWith('Pending ')) {
        throw AppError.conflict(`This plan is not awaiting approval (status: ${current.status})`)
      }
      const stage = planApprovalStage(current.status)
      if (!stage) {
        throw AppError.conflict(`This plan is not awaiting approval (status: ${current.status})`)
      }

      const decided = await decideEntityApproval(
        client,
        'mkt_plan',
        id,
        'Changes Requested',
        input.comments,
        null,
        stage,
      )
      if (!decided) throw AppError.conflict('No pending approval request was found for this plan')

      await client.query(
        `update erp.mkt_plans
            set status = 'Changes Requested', current_approver_name = null,
                revision_reason = $2, updated_at = now()
          where id = $1`,
        [id, input.comments],
      )
      await recordPlanApproval(client, id, {
        stage,
        action: 'Changes requested',
        decision: 'Changes Requested',
        comments: input.comments,
        byName: auth.name,
        byRole: auth.role,
        byUserId: auth.userId,
      })
      await audit(client, 'marketing.plan.changes_requested', 'mkt_plans', id, input.comments)

      return planWithRelations(client, id)
    })

    sendData(res, plan)
  },
)

plansRouter.post('/plans/:id/start', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const plan = await withRls(auth, async (client) => {
    const current = await assertPlanEditable(client, id, auth)
    if (current.status !== 'Approved') {
      throw AppError.conflict('Only an approved plan can be started')
    }
    await client.query(
      `update erp.mkt_plans
          set status = 'In Progress', execution_started_at = coalesce(execution_started_at, now()),
              updated_at = now()
        where id = $1`,
      [id],
    )
    await recordPlanApproval(client, id, {
      stage: 'execution',
      action: 'Execution started',
      decision: 'Started',
      byName: auth.name,
      byUserId: auth.userId,
    })
    await audit(client, 'marketing.plan.started', 'mkt_plans', id, current.title)
    return planWithRelations(client, id)
  })

  sendData(res, plan)
})

const executionSchema = z.object({
  completedActivities: z.coerce.number().int().min(0).max(1_000_000).optional(),
  actualLeads: z.coerce.number().int().min(0).max(1_000_000).optional(),
  qualifiedLeads: z.coerce.number().int().min(0).max(1_000_000).optional(),
  completedFieldVisits: z.coerce.number().int().min(0).max(1_000_000).optional(),
  tradePartnerVisits: z.coerce.number().int().min(0).max(1_000_000).optional(),
  actualSpending: z.coerce.number().min(0).max(1_000_000_000).optional(),
  results: optionalText(4000),
  remarks: optionalText(2000),
  activities: z
    .array(
      z.object({
        id: uuidSchema,
        completedActivities: z.coerce.number().int().min(0).optional(),
        actualLeads: z.coerce.number().int().min(0).optional(),
        qualifiedLeads: z.coerce.number().int().min(0).optional(),
        completedFieldVisits: z.coerce.number().int().min(0).optional(),
        tradePartnerVisits: z.coerce.number().int().min(0).optional(),
        actualSpending: z.coerce.number().min(0).optional(),
        executionPercent: z.coerce.number().min(0).max(100).optional(),
        results: optionalText(2000),
      }),
    )
    .max(50)
    .optional(),
})

plansRouter.patch('/plans/:id/execution', validateBody(executionSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<z.infer<typeof executionSchema>>(req)

  const plan = await withRls(auth, async (client) => {
    const current = await assertPlanEditable(client, id, auth)
    if (!['In Progress', 'Approved'].includes(current.status)) {
      throw AppError.conflict('Execution can only be updated while a plan is approved or in progress')
    }

    const fragment = buildUpdate(
      {
        completed_activities: input.completedActivities,
        actual_leads: input.actualLeads,
        qualified_leads: input.qualifiedLeads,
        completed_field_visits: input.completedFieldVisits,
        trade_partner_visits: input.tradePartnerVisits,
        actual_spending: input.actualSpending,
        results: input.results,
        execution_remarks: input.remarks,
      },
      [
        'completed_activities',
        'actual_leads',
        'qualified_leads',
        'completed_field_visits',
        'trade_partner_visits',
        'actual_spending',
        'results',
        'execution_remarks',
      ],
    )
    if (fragment.text) {
      await client.query(
        `update erp.mkt_plans set ${fragment.text}, updated_at = now() where id = $${fragment.values.length + 1}`,
        [...fragment.values, id],
      )
    }

    if (input.activities?.length) {
      for (const activity of input.activities) {
        const activityFragment = buildUpdate(
          {
            completed_activities: activity.completedActivities,
            actual_leads: activity.actualLeads,
            qualified_leads: activity.qualifiedLeads,
            completed_field_visits: activity.completedFieldVisits,
            trade_partner_visits: activity.tradePartnerVisits,
            actual_spending: activity.actualSpending,
            execution_percent: activity.executionPercent,
            results: activity.results,
          },
          [
            'completed_activities',
            'actual_leads',
            'qualified_leads',
            'completed_field_visits',
            'trade_partner_visits',
            'actual_spending',
            'execution_percent',
            'results',
          ],
        )
        if (activityFragment.text) {
          await client.query(
            `update erp.mkt_plan_activities
                set ${activityFragment.text}, updated_at = now()
              where id = $${activityFragment.values.length + 1} and plan_id = $${activityFragment.values.length + 2}`,
            [...activityFragment.values, activity.id, id],
          )
        }
      }

      const totals = await one<{
        completed: string
        leads: string
        qualified: string
        visits: string
        trade: string
        spend: string
      }>(
        client,
        `select coalesce(sum(completed_activities),0)::text as completed,
                coalesce(sum(actual_leads),0)::text as leads,
                coalesce(sum(qualified_leads),0)::text as qualified,
                coalesce(sum(completed_field_visits),0)::text as visits,
                coalesce(sum(trade_partner_visits),0)::text as trade,
                coalesce(sum(actual_spending),0)::text as spend
           from erp.mkt_plan_activities where plan_id = $1`,
        [id],
      )
      const budget = Number(current.estimated_budget)
      const percent = budget > 0 ? Math.min(100, Math.round((Number(totals?.spend ?? 0) / budget) * 10000) / 100) : 0
      await client.query(
        `update erp.mkt_plans
            set completed_activities = $2, actual_leads = $3, qualified_leads = $4,
                completed_field_visits = $5, trade_partner_visits = $6,
                actual_spending = $7, execution_percent = $8, updated_at = now()
          where id = $1`,
        [
          id,
          Number(totals?.completed ?? 0),
          Number(totals?.leads ?? 0),
          Number(totals?.qualified ?? 0),
          Number(totals?.visits ?? 0),
          Number(totals?.trade ?? 0),
          Number(totals?.spend ?? 0),
          percent,
        ],
      )
    }

    await recordPlanApproval(client, id, {
      stage: 'execution',
      action: 'Progress updated',
      decision: 'Progress Updated',
      comments: input.remarks ?? null,
      byName: auth.name,
      byUserId: auth.userId,
    })
    await audit(client, 'marketing.plan.execution_updated', 'mkt_plans', id, current.title)
    return planWithRelations(client, id)
  })

  sendData(res, plan)
})

plansRouter.post('/plans/:id/submit-results', validateBody(z.object({ results: optionalText(4000) })), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<{ results?: string }>(req)

  const plan = await withRls(auth, async (client) => {
    const current = await assertPlanEditable(client, id, auth)
    if (current.status !== 'In Progress') {
      throw AppError.conflict('Results can only be submitted for a plan that is in progress')
    }
    if (input.results) {
      await client.query('update erp.mkt_plans set results = $2, updated_at = now() where id = $1', [
        id,
        input.results,
      ])
    }
    await client.query(
      `update erp.mkt_plans
          set status = 'Submitted for Results Review', results_submitted_at = now(),
              current_approver_name = 'Marketing Manager', updated_at = now()
        where id = $1`,
      [id],
    )
    await raiseApproval(client, {
      entityType: 'mkt_plan',
      entityId: id,
      title: `Results review: ${current.title}`,
      stage: 'results',
      assignedRole: 'marketing.plan.approve',
      payload: { month: current.month },
    })
    await recordPlanApproval(client, id, {
      stage: 'results',
      action: 'Results submitted',
      decision: 'Results Submitted',
      comments: input.results ?? null,
      byName: auth.name,
      byUserId: auth.userId,
    })
    await audit(client, 'marketing.plan.results_submitted', 'mkt_plans', id, current.title)
    return planWithRelations(client, id)
  })

  sendData(res, plan)
})

plansRouter.post(
  '/plans/:id/complete',
  requirePermission('marketing.plan.approve'),
  validateBody(z.object({ comments: optionalText(2000) })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ comments?: string }>(req)

    const plan = await withRls(auth, async (client) => {
      const current = await one<{ id: string; employee_id: string; status: string; title: string }>(
        client,
        'select id, employee_id, status, title from erp.mkt_plans where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Marketing plan not found')
      if (current.employee_id === auth.userId) throw AppError.forbidden('Self-approval is not permitted')
      if (current.status !== 'Submitted for Results Review') {
        throw AppError.conflict('This plan has no results awaiting review')
      }

      const decided = await decideEntityApproval(client, 'mkt_plan', id, 'Approved', input.comments ?? null)
      if (!decided) throw AppError.conflict('No pending approval request was found for this plan')

      await client.query(
        `update erp.mkt_plans
            set status = 'Completed', completed_at = now(), current_approver_name = null,
                previous_approver_name = $2, updated_at = now()
          where id = $1`,
        [id, auth.name],
      )
      await recordPlanApproval(client, id, {
        stage: 'completed',
        action: 'Plan completed',
        decision: 'Completed',
        comments: input.comments ?? null,
        byName: auth.name,
        byRole: auth.role,
        byUserId: auth.userId,
      })
      await audit(client, 'marketing.plan.completed', 'mkt_plans', id, current.title)

      return planWithRelations(client, id)
    })

    sendData(res, plan)
  },
)

// ---------------------------------------------------------------------------
// Unified marketing expenses
// ---------------------------------------------------------------------------
const EXPENSE_FROM = `
  from erp.mkt_expenses x
  left join erp.mkt_plans p on p.id = x.plan_id
  left join erp.mkt_plan_activities pa on pa.id = x.plan_activity_id
  left join erp.mkt_campaigns c on c.id = x.campaign_id
  left join erp.users e on e.id = x.employee_id
`

const EXPENSE_SELECT = `
  x.*, p.title as plan_title, pa.name as activity_name, pa.activity_type as activity_type,
  c.name as campaign_name, e.name as employee_name
  ${EXPENSE_FROM}
`

const EXPENSE_STATUSES = [
  'Draft',
  'Submitted',
  'Pending Manager Review',
  'Pending Admin Financial Authorization',
  'Changes Requested',
  'Approved',
  'Rejected',
  'Paid',
  'Reimbursed',
] as const

const expenseQuery = z.object({
  q: z.string().trim().max(120).optional(),
  source: z.enum(['campaign', 'monthly_plan', 'field_claim', 'other']).optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  employeeId: optionalUuid,
  planId: optionalUuid,
  campaignId: optionalUuid,
  category: z
    .enum([
      'Advertising',
      'Content Production',
      'Events',
      'Field Marketing',
      'Printing',
      'Influencer Fees',
      'Travel',
      'Other',
    ])
    .optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  sort: z.enum(['expenseDate:asc', 'expenseDate:desc', 'amount:asc', 'amount:desc', 'createdAt:asc', 'createdAt:desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

plansRouter.get('/expenses', validateQuery(expenseQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof expenseQuery>>(req)
  const pagination = parsePagination(query)
  const sort = parseSort(
    query.sort,
    { expenseDate: 'x.expense_date', amount: 'x.amount', createdAt: 'x.created_at' },
    'expenseDate',
  )

  const result = await withRls(
    auth,
    async (client) => {
      const filter = createFilter()
      if (!auth.isAdmin && !hasPermission(auth, 'marketing.expense.read') && !hasPermission(auth, 'finance.expense.read')) {
        filter.raw('x.employee_id = erp.current_user_id()')
      }
      filter.equal('x.source', query.source)
      filter.equal('x.status', query.status)
      filter.equal('x.employee_id', query.employeeId)
      filter.equal('x.plan_id', query.planId)
      filter.equal('x.campaign_id', query.campaignId)
      filter.equal('x.category', query.category)
      filter.gte('x.expense_date', query.from)
      filter.lte('x.expense_date', query.to)
      filter.search(['x.title', 'x.code', 'x.vendor_name', 'x.description'], query.q)

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
      return paginated(rows.map(mapMarketingExpense), total, pagination)
    },
    { readOnly: true },
  )

  res.json(result)
})

plansRouter.get('/expenses/:id', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(
    auth,
    async (client) => {
      const row = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [id])
      if (!row) throw AppError.notFound('Marketing expense not found')
      if (
        !auth.isAdmin &&
        !hasPermission(auth, 'marketing.expense.read') &&
        !hasPermission(auth, 'finance.expense.read') &&
        row.employee_id !== auth.userId
      ) {
        throw AppError.forbidden('You may only view your own expenses')
      }
      const approvals = await many(
        client,
        `select a.*, u.name as approver_name
           from erp.mkt_expense_approvals a
           left join erp.users u on u.id = a.approver_user_id
          where a.expense_id = $1 order by a.decided_at`,
        [id],
      )
      return {
        ...mapMarketingExpense(row),
        approvals: approvals.map((approval) => ({
          id: approval.id,
          stage: approval.stage,
          decision: approval.decision,
          comments: approval.comments ?? '',
          decidedAt: approval.decided_at,
          byName: approval.approver_name ?? '',
          byId: approval.approver_user_id,
        })),
      }
    },
    { readOnly: true },
  )

  sendData(res, payload)
})

const expenseCreateSchema = z.object({
  source: z.enum(['campaign', 'monthly_plan', 'field_claim', 'other']).default('monthly_plan'),
  title: z.string().trim().min(2).max(160),
  planId: optionalUuid,
  activityId: optionalUuid,
  campaignId: optionalUuid,
  employeeId: optionalUuid,
  category: z
    .enum([
      'Advertising',
      'Content Production',
      'Events',
      'Field Marketing',
      'Printing',
      'Influencer Fees',
      'Travel',
      'Other',
    ])
    .default('Other'),
  vendorName: optionalText(160),
  amount: z.coerce.number().positive().max(1_000_000_000),
  currency: z.string().trim().length(3).default('INR'),
  expenseDate: dateOnlySchema,
  description: z.string().trim().min(3).max(2000),
  documentPath: optionalText(500),
  managerRequired: z.boolean().optional(),
  financeRequired: z.boolean().optional(),
  submit: z.boolean().default(true),
})

async function nextExpenseStage(
  client: Parameters<typeof one>[0],
  expense: { id: string; title: string; amount: string },
  status: string,
  approver: string,
): Promise<void> {
  const stage = status === 'Pending Admin Financial Authorization' ? 'admin' : 'manager'
  await raiseApproval(client, {
    entityType: 'mkt_expense',
    entityId: expense.id,
    title: `Expense approval: ${expense.title}`,
    stage,
    assignedRole: stage === 'admin' ? 'finance.approval.decide' : 'marketing.expense.approve',
    amount: Number(expense.amount),
    payload: { status, approver },
  })
}

plansRouter.post('/expenses', requirePermission('marketing.expense.create'), validateBody(expenseCreateSchema), async (req, res) => {
  const auth = req.auth!
  const input = validatedBody<z.infer<typeof expenseCreateSchema>>(req)
  const idempotencyKey = readIdempotencyKey(req.headers['idempotency-key'])

  if (input.employeeId && input.employeeId !== auth.userId && !hasPermission(auth, 'marketing.expense.approve')) {
    throw AppError.forbidden('You may only submit expenses for yourself')
  }

  const expense = await withRls(auth, async (client) => {
    const replay = await findReplay<{ id: string }>(client, 'erp.mkt_expenses', 'id', auth.orgId, idempotencyKey)
    if (replay) {
      const existing = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [replay.id])
      return mapMarketingExpense(existing!)
    }

    const employeeId = input.employeeId ?? auth.userId
    await activeOrgUser(client, employeeId, 'Employee')

    if (input.planId) {
      const plan = await one<{ employee_id: string }>(client, 'select employee_id from erp.mkt_plans where id = $1', [
        input.planId,
      ])
      if (!plan) throw AppError.badRequest('planId does not reference a marketing plan')
      if (plan.employee_id !== employeeId) {
        throw AppError.badRequest('The expense plan belongs to a different employee')
      }
    }
    if (input.activityId) {
      const activity = await one<{ plan_id: string }>(
        client,
        'select plan_id from erp.mkt_plan_activities where id = $1',
        [input.activityId],
      )
      if (!activity) throw AppError.badRequest('activityId does not reference a plan activity')
      if (input.planId && activity.plan_id !== input.planId) {
        throw AppError.badRequest('activityId does not belong to the selected plan')
      }
    }
    if (input.campaignId) {
      const campaign = await one(client, 'select id from erp.mkt_campaigns where id = $1', [input.campaignId])
      if (!campaign) throw AppError.badRequest('campaignId does not reference a campaign')
    }

    const managerRequired = input.managerRequired ?? true
    const financeRequired = input.financeRequired ?? true
    let status = 'Draft'
    if (input.submit) {
      status = managerRequired
        ? 'Pending Manager Review'
        : financeRequired
          ? 'Pending Admin Financial Authorization'
          : 'Approved'
    }

    const code = await nextDocNumber(client, auth.orgId, 'mkt_expense')
    const row = await one<{ id: string; amount: string; title: string }>(
      client,
      `insert into erp.mkt_expenses (
         org_id, code, source, title, plan_id, plan_activity_id, campaign_id, employee_id,
         category, vendor_name, amount, currency, expense_date, description, document_path,
         status, manager_required, finance_required, submitted_at, idempotency_key, created_by
       ) values (
         erp.current_org_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17, $18, $19, erp.current_user_id()
       ) returning id, amount, title`,
      [
        code,
        input.source,
        input.title,
        input.planId ?? null,
        input.activityId ?? null,
        input.campaignId ?? null,
        employeeId,
        input.category,
        input.vendorName ?? null,
        input.amount,
        input.currency.toUpperCase(),
        input.expenseDate,
        input.description,
        input.documentPath ?? null,
        status,
        managerRequired,
        financeRequired,
        input.submit ? new Date().toISOString() : null,
        idempotencyKey,
      ],
    )
    if (!row) throw AppError.badRequest('Could not create the expense')

    if (status === 'Pending Manager Review') {
      await nextExpenseStage(client, row, status, 'Marketing Manager')
      await client.query('update erp.mkt_expenses set current_approver_name = $2 where id = $1', [
        row.id,
        'Marketing Manager',
      ])
    } else if (status === 'Pending Admin Financial Authorization') {
      await nextExpenseStage(client, row, status, 'Finance / Admin')
      await client.query('update erp.mkt_expenses set current_approver_name = $2 where id = $1', [
        row.id,
        'Finance / Admin',
      ])
    }

    await audit(client, 'marketing.expense.created', 'mkt_expenses', row.id, `${code} · ${input.title}`, null, {
      amount: input.amount,
      status,
    })

    const full = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [row.id])
    return mapMarketingExpense(full!)
  })

  sendData(res, expense, 201)
})

const expenseUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  planId: optionalUuid,
  activityId: optionalUuid,
  campaignId: optionalUuid,
  category: z
    .enum([
      'Advertising',
      'Content Production',
      'Events',
      'Field Marketing',
      'Printing',
      'Influencer Fees',
      'Travel',
      'Other',
    ])
    .optional(),
  vendorName: optionalText(160),
  amount: z.coerce.number().positive().max(1_000_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
  expenseDate: dateOnlySchema.optional(),
  description: z.string().trim().min(3).max(2000).optional(),
  documentPath: optionalText(500),
})

const EXPENSE_UPDATE_COLUMNS = {
  title: 'title',
  planId: 'plan_id',
  activityId: 'plan_activity_id',
  campaignId: 'campaign_id',
  category: 'category',
  vendorName: 'vendor_name',
  amount: 'amount',
  currency: 'currency',
  expenseDate: 'expense_date',
  description: 'description',
  documentPath: 'document_path',
} as const

plansRouter.patch('/expenses/:id', validateBody(expenseUpdateSchema), async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)
  const input = validatedBody<z.infer<typeof expenseUpdateSchema>>(req)

  const expense = await withRls(auth, async (client) => {
    const current = await one<{ employee_id: string; status: string; title: string; plan_id: string | null }>(
      client,
      'select employee_id, status, title, plan_id from erp.mkt_expenses where id = $1 for update',
      [id],
    )
    if (!current) throw AppError.notFound('Marketing expense not found')
    if (current.employee_id !== auth.userId && !hasPermission(auth, 'marketing.expense.approve')) {
      throw AppError.forbidden('You may only edit your own expenses')
    }
    if (!['Draft', 'Changes Requested'].includes(current.status)) {
      throw AppError.conflict(`An expense in status "${current.status}" can no longer be edited`)
    }

    if (input.planId) {
      const plan = await one<{ employee_id: string }>(
        client,
        'select employee_id from erp.mkt_plans where id = $1',
        [input.planId],
      )
      if (!plan) throw AppError.badRequest('planId does not reference a marketing plan')
      if (plan.employee_id !== current.employee_id) {
        throw AppError.badRequest('The expense plan belongs to a different employee')
      }
    }
    if (input.activityId) {
      const activity = await one<{ plan_id: string }>(
        client,
        'select plan_id from erp.mkt_plan_activities where id = $1',
        [input.activityId],
      )
      if (!activity) throw AppError.badRequest('activityId does not reference a plan activity')
      const planId = input.planId ?? current.plan_id
      if (planId && activity.plan_id !== planId) {
        throw AppError.badRequest('activityId does not belong to the selected plan')
      }
    }
    if (input.campaignId) {
      const campaign = await one(client, 'select id from erp.mkt_campaigns where id = $1', [
        input.campaignId,
      ])
      if (!campaign) throw AppError.badRequest('campaignId does not reference a campaign')
    }

    const mapped: Record<string, unknown> = {}
    for (const [key, column] of Object.entries(EXPENSE_UPDATE_COLUMNS)) {
      const value = (input as Record<string, unknown>)[key]
      if (value !== undefined) mapped[column] = key === 'currency' ? String(value).toUpperCase() : value
    }
    const fragment = buildUpdate(mapped, Object.values(EXPENSE_UPDATE_COLUMNS))
    if (!fragment.text) throw AppError.badRequest('No fields to update')
    await client.query(
      `update erp.mkt_expenses set ${fragment.text}, updated_at = now() where id = $${fragment.values.length + 1}`,
      [...fragment.values, id],
    )
    await audit(client, 'marketing.expense.updated', 'mkt_expenses', id, current.title)
    const full = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [id])
    return mapMarketingExpense(full!)
  })

  sendData(res, expense)
})

plansRouter.post('/expenses/:id/submit', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const expense = await withRls(auth, async (client) => {
    const current = await one<{
      id: string
      employee_id: string
      status: string
      title: string
      amount: string
      manager_required: boolean
      finance_required: boolean
    }>(
      client,
      `select id, employee_id, status, title, amount, manager_required, finance_required
         from erp.mkt_expenses where id = $1 for update`,
      [id],
    )
    if (!current) throw AppError.notFound('Marketing expense not found')
    if (current.employee_id !== auth.userId && !hasPermission(auth, 'marketing.expense.approve')) {
      throw AppError.forbidden('You may only submit your own expenses')
    }
    if (!['Draft', 'Changes Requested'].includes(current.status)) {
      throw AppError.conflict(`An expense in status "${current.status}" cannot be submitted`)
    }

    const status = current.manager_required
      ? 'Pending Manager Review'
      : current.finance_required
        ? 'Pending Admin Financial Authorization'
        : 'Approved'
    const approver = status === 'Pending Manager Review'
      ? 'Marketing Manager'
      : status === 'Pending Admin Financial Authorization'
        ? 'Finance / Admin'
        : null

    await client.query(
      `update erp.mkt_expenses
          set status = $2, submitted_at = now(), current_approver_name = $3,
              reviewer_comments = null, updated_at = now()
        where id = $1`,
      [id, status, approver],
    )
    if (status !== 'Approved') {
      await nextExpenseStage(client, current, status, approver ?? 'Approver')
    }
    await audit(client, 'marketing.expense.submitted', 'mkt_expenses', id, current.title)

    const full = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [id])
    return mapMarketingExpense(full!)
  })

  sendData(res, expense)
})

plansRouter.post(
  '/expenses/:id/decide',
  requirePermission('marketing.expense.approve', 'marketing.approval.decide', 'finance.approval.decide', 'approval.decide'),
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
      throw AppError.badRequest('A comment is required unless the expense is approved')
    }

    const expense = await withRls(auth, async (client) => {
      const current = await one<{
        id: string
        employee_id: string
        status: string
        title: string
        amount: string
        manager_required: boolean
        finance_required: boolean
      }>(
        client,
        `select id, employee_id, status, title, amount, manager_required, finance_required
           from erp.mkt_expenses where id = $1 for update`,
        [id],
      )
      if (!current) throw AppError.notFound('Marketing expense not found')
      if (current.employee_id === auth.userId) throw AppError.forbidden('Self-approval is not permitted')
      if (!['Pending Manager Review', 'Pending Admin Financial Authorization'].includes(current.status)) {
        throw AppError.conflict(`This expense is not awaiting approval (status: ${current.status})`)
      }

      const stage = current.status === 'Pending Admin Financial Authorization' ? 'admin' : 'manager'
      const decided = await decideEntityApproval(
        client,
        'mkt_expense',
        id,
        input.decision,
        input.comments ?? null,
        null,
        stage,
      )
      if (!decided) throw AppError.conflict('No pending approval request was found for this expense')

      let nextStatus: string
      let approver: string | null = null
      if (input.decision === 'Approved') {
        if (stage === 'manager' && current.finance_required) {
          nextStatus = 'Pending Admin Financial Authorization'
          approver = 'Finance / Admin'
          await raiseApproval(client, {
            entityType: 'mkt_expense',
            entityId: id,
            title: `Finance authorisation: ${current.title}`,
            stage: 'admin',
            assignedRole: 'finance.approval.decide',
            amount: Number(current.amount),
            payload: { approvedBy: auth.name },
          })
        } else {
          nextStatus = 'Approved'
        }
      } else if (input.decision === 'Rejected') {
        nextStatus = 'Rejected'
      } else {
        nextStatus = 'Changes Requested'
      }

      await client.query(
        `update erp.mkt_expenses
            set status = $2, current_approver_name = $3, reviewer_comments = $4,
                decided_at = case when $2 in ('Approved','Rejected') then now() else decided_at end,
                decided_by = case when $2 in ('Approved','Rejected') then erp.current_user_id() else decided_by end,
                updated_at = now()
          where id = $1`,
        [id, nextStatus, approver, input.comments ?? null],
      )
      await client.query(
        `insert into erp.mkt_expense_approvals (
           org_id, expense_id, stage, approver_user_id, decision, comments
         ) values (erp.current_org_id(), $1, $2, erp.current_user_id(), $3, $4)`,
        [id, stage, input.decision, input.comments ?? null],
      )
      await audit(
        client,
        `marketing.expense.${input.decision === 'Approved' ? 'approved' : 'decided'}`,
        'mkt_expenses',
        id,
        `${current.title} → ${nextStatus}`,
        { status: current.status },
        { status: nextStatus },
      )

      const full = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [id])
      return mapMarketingExpense(full!)
    })

    sendData(res, expense)
  },
)

plansRouter.post(
  '/expenses/:id/reimburse',
  requirePermission('marketing.expense.approve', 'finance.approval.decide', 'approval.decide'),
  validateBody(z.object({ comments: optionalText(2000) })),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{ comments?: string }>(req)

    const expense = await withRls(auth, async (client) => {
      const current = await one<{ employee_id: string; status: string; title: string }>(
        client,
        'select employee_id, status, title from erp.mkt_expenses where id = $1 for update',
        [id],
      )
      if (!current) throw AppError.notFound('Marketing expense not found')
      if (current.employee_id === auth.userId) throw AppError.forbidden('Self-approval is not permitted')
      if (current.status !== 'Approved') {
        throw AppError.conflict('Only an approved expense can be marked reimbursed')
      }

      await client.query(
        `update erp.mkt_expenses set status = 'Reimbursed', updated_at = now() where id = $1`,
        [id],
      )
      await client.query(
        `insert into erp.mkt_expense_approvals (
           org_id, expense_id, stage, approver_user_id, decision, comments
         ) values (erp.current_org_id(), $1, 'finance', erp.current_user_id(), 'Approved', $2)`,
        [id, input.comments ?? 'Reimbursed'],
      )
      await audit(client, 'marketing.expense.reimbursed', 'mkt_expenses', id, current.title)

      const full = await one(client, `select ${EXPENSE_SELECT} where x.id = $1`, [id])
      return mapMarketingExpense(full!)
    })

    sendData(res, expense)
  },
)
