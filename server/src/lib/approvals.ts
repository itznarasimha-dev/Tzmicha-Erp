import type { PoolClient } from 'pg'
import { AppError } from '../errors.js'
import { one } from '../db/transaction.js'

export type ApprovalEntityType =
  | 'hr_leave'
  | 'hr_attendance_correction'
  | 'hr_expense'
  | 'hr_payment'
  | 'hr_payroll_run'
  | 'hr_contract'
  | 'mkt_plan'
  | 'mkt_expense'
  | 'mkt_discount'
  | 'mkt_offer'
  | 'mkt_campaign'
  | 'mkt_contract'

export type ApprovalDecision = 'Approved' | 'Rejected' | 'Changes Requested' | 'Cancelled'

export interface ApprovalRequestRow {
  id: string
  org_id: string
  entity_type: string
  entity_id: string
  title: string
  stage: string
  status: string
  requested_by: string | null
  assigned_to: string | null
  assigned_role: string | null
  amount: string | null
  approved_percent: string | null
  payload: Record<string, unknown>
  comments: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

/** Raise (or refresh) a pending approval request for an entity. */
export async function raiseApproval(
  client: PoolClient,
  input: {
    entityType: ApprovalEntityType
    entityId: string
    title: string
    stage?: string
    assignedRole?: string | null
    assignedTo?: string | null
    amount?: number | null
    payload?: Record<string, unknown>
  },
): Promise<string> {
  const row = await one<{ id: string }>(
    client,
    `select erp.request_approval($1, $2, $3, $4, $5, $6, $7, $8::jsonb) as id`,
    [
      input.entityType,
      input.entityId,
      input.title.slice(0, 300),
      input.stage ?? 'manager',
      input.assignedRole ?? null,
      input.assignedTo ?? null,
      input.amount ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  )
  if (!row) throw new AppError(500, 'internal_error', 'Could not create approval request')
  return row.id
}

/** Cancel any still-pending request for an entity (e.g. the record was withdrawn). */
export async function cancelPendingApprovals(
  client: PoolClient,
  entityType: ApprovalEntityType,
  entityId: string,
  reason: string,
): Promise<void> {
  const rows = await client.query<{ id: string }>(
    `update erp.approval_requests
        set status = 'Cancelled', comments = $3, decided_at = now(), updated_at = now()
      where org_id = erp.current_org_id()
        and entity_type = $1
        and entity_id = $2
        and status = 'Pending'
      returning id`,
    [entityType, entityId, reason],
  )
  for (const row of rows.rows) {
    await client.query(
      `insert into erp.approval_history (
         org_id, approval_request_id, action, actor_user_id, actor_name,
         from_status, to_status, comments
       ) values (erp.current_org_id(), $1, 'cancelled', erp.current_user_id(),
                 (select name from erp.users where id = erp.current_user_id()),
                 'Pending', 'Cancelled', $2)`,
      [row.id, reason],
    )
  }
}

/**
 * Decide through the shared engine. Enforces no self-approval and the
 * approval.* permissions server-side. Returns the updated request row.
 */
export async function decideApproval(
  client: PoolClient,
  requestId: string,
  decision: ApprovalDecision,
  comments: string | null,
  approvedPercent: number | null = null,
): Promise<ApprovalRequestRow> {
  const row = await one<ApprovalRequestRow>(
    client,
    `select * from erp.decide_approval($1, $2, $3, $4)`,
    [requestId, decision, comments, approvedPercent],
  )
  if (!row) throw AppError.notFound('Approval request not found')
  return row
}

export async function findPendingApproval(
  client: PoolClient,
  entityType: ApprovalEntityType,
  entityId: string,
  stage?: string,
): Promise<ApprovalRequestRow | null> {
  const values: unknown[] = [entityType, entityId]
  let stageClause = ''
  if (stage) {
    values.push(stage)
    stageClause = ` and stage = $${values.length}`
  }

  return one<ApprovalRequestRow>(
    client,
    `select * from erp.approval_requests
      where org_id = erp.current_org_id()
        and entity_type = $1
        and entity_id = $2
        and status = 'Pending'${stageClause}
      order by created_at desc
      limit 1`,
    values,
  )
}

/**
 * Decide the pending request for an entity, if one exists. Pass `stage` when the
 * caller already knows which workflow stage it is deciding so a newer request
 * for the next stage cannot be picked up by mistake.
 */
export async function decideEntityApproval(
  client: PoolClient,
  entityType: ApprovalEntityType,
  entityId: string,
  decision: ApprovalDecision,
  comments: string | null,
  approvedPercent: number | null = null,
  stage?: string,
): Promise<ApprovalRequestRow | null> {
  const request = await findPendingApproval(client, entityType, entityId, stage)
  if (!request) return null
  return decideApproval(client, request.id, decision, comments, approvedPercent)
}
