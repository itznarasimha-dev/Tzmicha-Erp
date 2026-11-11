import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, count } from '../db/transaction.js'
import { AppError } from '../errors.js'
import {
  paginated,
  parsePagination,
  sendData,
  validateBody,
  validateQuery,
  validatedBody,
  validatedQuery,
} from '../http.js'
import { hasPermission, authenticate } from '../middleware/auth.js'
import { decideApproval, type ApprovalDecision } from '../lib/approvals.js'
import { optionalUuid, uuidSchema } from '../lib/validation.js'

export const approvalsRouter = Router()

approvalsRouter.use(authenticate)

const approvalQuery = z.object({
  entityType: z
    .enum([
      'hr_leave',
      'hr_attendance_correction',
      'hr_expense',
      'hr_payment',
      'hr_payroll_run',
      'hr_contract',
      'mkt_plan',
      'mkt_expense',
      'mkt_discount',
      'mkt_offer',
      'mkt_campaign',
      'mkt_contract',
    ])
    .optional(),
  status: z
    .enum(['Pending', 'Approved', 'Rejected', 'Changes Requested', 'Cancelled', 'Expired'])
    .optional(),
  mine: z.enum(['requested', 'assigned']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

/**
 * The approval queue. A caller with an approval permission sees every request
 * in their tenant; everyone else only sees requests they raised or that are
 * assigned to them.
 */
approvalsRouter.get('/', validateQuery(approvalQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof approvalQuery>>(req)
  const canDecide = hasPermission(auth, 'approval.decide') ||
    hasPermission(auth, 'hr.approval.decide') ||
    hasPermission(auth, 'marketing.approval.decide') ||
    hasPermission(auth, 'finance.approval.decide')
  const pagination = parsePagination(query)

  const result = await withRls(auth, async (client) => {
    const conditions: string[] = ['org_id = erp.current_org_id()']
    const values: unknown[] = []
    const bind = (value: unknown) => {
      values.push(value)
      return `$${values.length}`
    }

    if (query.entityType) conditions.push(`entity_type = ${bind(query.entityType)}`)
    if (query.status) conditions.push(`status = ${bind(query.status)}`)
    if (query.mine === 'requested') conditions.push(`requested_by = erp.current_user_id()`)
    if (query.mine === 'assigned') conditions.push(`assigned_to = erp.current_user_id()`)
    if (!canDecide) {
      conditions.push(`(requested_by = erp.current_user_id() or assigned_to = erp.current_user_id())`)
    }

    const where = `where ${conditions.join(' and ')}`
    const total = await count(client, `select count(*)::text as total from erp.approval_requests ${where}`, values)
    const limit = `$${values.length + 1}`
    const offset = `$${values.length + 2}`
    const rows = await many(
      client,
      `select a.*, u.name as requested_by_name, d.name as decided_by_name,
              ru.name as assigned_to_name
         from erp.approval_requests a
         left join erp.users u on u.id = a.requested_by
         left join erp.users d on d.id = a.decided_by
         left join erp.users ru on ru.id = a.assigned_to
         ${where}
        order by a.status = 'Pending' desc, a.created_at desc
        limit ${limit} offset ${offset}`,
      [...values, pagination.pageSize, pagination.offset],
    )

    return paginated(
      rows.map((row) => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        title: row.title,
        stage: row.stage,
        status: row.status,
        requestedBy: row.requested_by,
        requestedByName: row.requested_by_name ?? '',
        assignedTo: row.assigned_to,
        assignedToName: row.assigned_to_name ?? '',
        assignedRole: row.assigned_role,
        amount: row.amount === null ? null : Number(row.amount),
        approvedPercent: row.approved_percent === null ? null : Number(row.approved_percent),
        payload: row.payload,
        comments: row.comments,
        decidedBy: row.decided_by,
        decidedByName: row.decided_by_name ?? '',
        decidedAt: row.decided_at,
        createdAt: row.created_at,
      })),
      total,
      pagination,
    )
  }, { readOnly: true })

  res.json(result)
})

const bulkQuery = z.object({
  entityType: z.string().min(1).max(60),
  entityId: uuidSchema,
})

approvalsRouter.get('/pending-for-entity', validateQuery(bulkQuery), async (req, res) => {
  const auth = req.auth!
  const query = validatedQuery<z.infer<typeof bulkQuery>>(req)
  const row = await withRls(
    auth,
    (client) =>
      one(
        client,
        `select id, status, stage, title from erp.approval_requests
          where org_id = erp.current_org_id()
            and entity_type = $1 and entity_id = $2 and status = 'Pending'
          order by created_at desc limit 1`,
        [query.entityType, query.entityId],
      ),
    { readOnly: true },
  )
  sendData(res, row ?? null)
})

approvalsRouter.get('/:id', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const payload = await withRls(auth, async (client) => {
    const row = await one(
      client,
      `select a.*, u.name as requested_by_name, d.name as decided_by_name
         from erp.approval_requests a
         left join erp.users u on u.id = a.requested_by
         left join erp.users d on d.id = a.decided_by
        where a.id = $1`,
      [id],
    )
    if (!row) throw AppError.notFound('Approval request not found')

    const canDecide = hasPermission(auth, 'approval.decide') ||
      hasPermission(auth, 'hr.approval.decide') ||
      hasPermission(auth, 'marketing.approval.decide') ||
      hasPermission(auth, 'finance.approval.decide')
    if (!canDecide && row.requested_by !== auth.userId && row.assigned_to !== auth.userId) {
      throw AppError.forbidden('You cannot view this approval request')
    }

    const history = await many(
      client,
      `select h.*, u.name as actor_name from erp.approval_history h
         left join erp.users u on u.id = h.actor_user_id
        where h.approval_request_id = $1 order by h.created_at`,
      [id],
    )

    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      title: row.title,
      stage: row.stage,
      status: row.status,
      requestedByName: row.requested_by_name ?? '',
      amount: row.amount === null ? null : Number(row.amount),
      approvedPercent: row.approved_percent === null ? null : Number(row.approved_percent),
      payload: row.payload,
      comments: row.comments,
      decidedByName: row.decided_by_name ?? '',
      decidedAt: row.decided_at,
      createdAt: row.created_at,
      history: history.map((item) => ({
        id: item.id,
        action: item.action,
        actor: item.actor_name ?? '',
        fromStatus: item.from_status,
        toStatus: item.to_status,
        comments: item.comments ?? '',
        at: item.created_at,
      })),
    }
  }, { readOnly: true })

  sendData(res, payload)
})

approvalsRouter.post(
  '/:id/decide',
  validateBody(
    z.object({
      decision: z.enum(['Approved', 'Rejected', 'Changes Requested', 'Cancelled']),
      comments: z.string().trim().max(2000).optional(),
      approvedPercent: z.coerce.number().min(0).max(100).optional(),
    }),
  ),
  async (req, res) => {
    const auth = req.auth!
    const id = uuidSchema.parse(req.params.id)
    const input = validatedBody<{
      decision: ApprovalDecision
      comments?: string
      approvedPercent?: number
    }>(req)

    if (input.decision === 'Rejected' && !input.comments) {
      throw AppError.badRequest('A comment is required when rejecting')
    }

    const decided = await withRls(auth, async (client) => decideApproval(
      client,
      id,
      input.decision,
      input.comments ?? null,
      input.approvedPercent ?? null,
    ))

    sendData(res, {
      id: decided.id,
      status: decided.status,
      entityType: decided.entity_type,
      entityId: decided.entity_id,
      decidedAt: decided.decided_at,
      approvedPercent: decided.approved_percent === null ? null : Number(decided.approved_percent),
    })
  },
)
