import type { PoolClient, QueryResultRow } from 'pg'
import { getConfig } from '../config.js'
import { logger } from '../logger.js'
import { getPool } from './pool.js'

export interface RlsContext {
  authUserId: string
  orgId: string
  userId: string
}

export interface TxOptions {
  /** GET handlers run in a READ ONLY transaction as defence in depth. */
  readOnly?: boolean
}

function claimsFor(context: RlsContext): string {
  return JSON.stringify({
    sub: context.authUserId,
    role: 'authenticated',
    aud: 'authenticated',
    app_metadata: {
      // Server-derived, never taken from the browser.
      org_id: context.orgId,
      user_id: context.userId,
    },
  })
}

/**
 * Run a unit of work inside a transaction that is scoped to the caller:
 *
 *   1. injects server-derived JWT claims (org, ERP user id),
 *   2. switches to the RLS role so table owner bypass does not apply,
 *   3. runs `fn`,
 *   4. commits or rolls back.
 *
 * All application queries must go through this helper. `queryAsOwner` is only
 * for identity resolution and health checks.
 */
export async function withRls<T>(
  context: RlsContext,
  fn: (client: PoolClient) => Promise<T>,
  options: TxOptions = {},
): Promise<T> {
  const config = getConfig()
  const client = await getPool().connect()

  try {
    await client.query(options.readOnly ? 'begin read only' : 'begin')
    await client.query('select set_config($1, $2, true)', [
      'request.jwt.claims',
      claimsFor(context),
    ])
    await client.query('select set_config($1, $2, true)', ['app.org_id', context.orgId])
    await client.query('select set_config($1, $2, true)', ['app.user_id', context.userId])

    if (config.DB_ENFORCE_RLS) {
      // DB_RLS_ROLE is validated against /^[a-z_][a-z0-9_]*$/i at config load,
      // so direct interpolation is safe here.
      await client.query(`set local role ${config.DB_RLS_ROLE}`)
    }

    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (error) {
    try {
      await client.query('rollback')
    } catch (rollbackError) {
      logger.error({ err: rollbackError }, 'Failed to roll back transaction')
    }
    throw error
  } finally {
    client.release()
  }
}

export async function one<T extends QueryResultRow>(
  client: PoolClient,
  text: string,
  values: unknown[] = [],
): Promise<T | null> {
  const result = await client.query<T>(text, values)
  return result.rows[0] ?? null
}

export async function many<T extends QueryResultRow>(
  client: PoolClient,
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await client.query<T>(text, values)
  return result.rows
}

export async function count(client: PoolClient, text: string, values: unknown[] = []): Promise<number> {
  const row = await one<{ total: string }>(client, text, values)
  return Number(row?.total ?? 0)
}

/** Append an audit entry inside the same transaction as the change. */
export async function audit(
  client: PoolClient,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string | null,
  before: unknown = null,
  after: unknown = null,
): Promise<void> {
  await client.query('select erp.log_audit($1, $2, $3, $4, $5, $6)', [
    action,
    entity,
    entityId,
    summary,
    before === null ? null : JSON.stringify(before),
    after === null ? null : JSON.stringify(after),
  ])
}

/** Convenience wrapper for `erp.next_doc_number`. */
export async function nextDocNumber(
  client: PoolClient,
  orgId: string,
  docType: string,
  fiscalYear?: string,
): Promise<string> {
  const row = await one<{ code: string }>(client, 'select erp.next_doc_number($1, $2, $3) as code', [
    orgId,
    docType,
    fiscalYear ?? null,
  ])
  if (!row) throw new Error('next_doc_number returned no value')
  return row.code
}
