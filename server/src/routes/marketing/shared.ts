import type { PoolClient } from 'pg'
import { one } from '../../db/transaction.js'
import { AppError } from '../../errors.js'

export interface OrgUserRow {
  id: string
  name: string
  email: string
  status: string
  department_id: string | null
  role_code: string
}

/** Resolve a user inside the caller's organization (never trusts the body). */
export async function orgUser(client: PoolClient, userId: string, label = 'User'): Promise<OrgUserRow> {
  const row = await one<OrgUserRow>(
    client,
    `select u.id, u.name, u.email, u.status, u.department_id, r.code as role_code
       from erp.users u
       join erp.roles r on r.id = u.role_id
      where u.id = $1 and u.org_id = erp.current_org_id()`,
    [userId],
  )
  if (!row) throw AppError.badRequest(`${label} does not belong to this organization`)
  return row
}

export async function activeOrgUser(
  client: PoolClient,
  userId: string,
  label = 'User',
): Promise<OrgUserRow> {
  const row = await orgUser(client, userId, label)
  if (row.status !== 'active') throw AppError.badRequest(`${label} is not an active user`)
  return row
}

export async function logLeadActivity(
  client: PoolClient,
  leadId: string,
  activityType: string,
  summary: string,
  actor: { id: string; name: string },
  occurredAt?: string | null,
): Promise<void> {
  await client.query(
    `insert into erp.mkt_lead_activities
       (org_id, lead_id, activity_type, summary, actor_user_id, actor_name, occurred_at)
     values (erp.current_org_id(), $1, $2, $3, $4, $5, coalesce($6::timestamptz, now()))`,
    [leadId, activityType, summary.slice(0, 1000), actor.id, actor.name, occurredAt ?? null],
  )
}

/** Shared column list + joins for a fully populated lead row. */
export const LEAD_SELECT = `
  l.*,
  s.name as source_name,
  s.category as source_category_name,
  c.name as campaign_name,
  a.name as assigned_to_name,
  g.name as generated_by_name
`

export const LEAD_FROM = `
  from erp.mkt_leads l
  left join erp.mkt_lead_sources s on s.id = l.source_id
  left join erp.mkt_campaigns c on c.id = l.campaign_id
  left join erp.users a on a.id = l.assigned_to
  left join erp.users g on g.id = l.generated_by
`

export async function findLeadRow(client: PoolClient, leadId: string) {
  return one(client, `select ${LEAD_SELECT} ${LEAD_FROM} where l.id = $1`, [leadId])
}
