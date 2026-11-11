import pg from 'pg'
import { getConfig } from '../config.js'
import { logger } from '../logger.js'

const { Pool } = pg

let pool: pg.Pool | null = null

/**
 * The API never uses the Supabase service-role key. It connects with a normal
 * Postgres role and every authenticated request is downgraded to the RLS role
 * (`authenticated`) inside a transaction. See `db/transaction.ts`.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    const config = getConfig()
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.DB_SSL ? { rejectUnauthorized: true } : undefined,
      max: config.DB_POOL_MAX,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: config.DB_STATEMENT_TIMEOUT_MS,
      query_timeout: config.DB_STATEMENT_TIMEOUT_MS,
      application_name: 'totally-erp-api',
    })

    pool.on('error', (error) => {
      logger.error({ err: error }, 'Idle Postgres client emitted an error')
    })
  }

  return pool
}

/**
 * Owner-level query. Reserved for identity resolution and health checks.
 * Never pass user-controlled SQL here.
 */
export async function queryAsOwner<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, values)
  return result.rows
}

export async function closePool(): Promise<void> {
  if (pool) {
    const current = pool
    pool = null
    await current.end()
  }
}

/**
 * Verify at boot that the API can downgrade to the configured RLS role.
 * Failing fast is preferable to silently running with elevated privileges.
 */
export async function assertRlsRoleAvailable(): Promise<void> {
  const config = getConfig()
  if (!config.DB_ENFORCE_RLS) {
    logger.warn(
      'DB_ENFORCE_RLS is disabled — Postgres row level security will NOT be enforced. Use only for local debugging.',
    )
    return
  }

  const rows = await queryAsOwner<{ can_switch: boolean; current_role: string }>(
    `select
       (current_user = $1 or pg_has_role(current_user, $1, 'member') or
        (select rolsuper from pg_roles where rolname = current_user)) as can_switch,
       current_user as current_role`,
    [config.DB_RLS_ROLE],
  )

  if (!rows[0]?.can_switch) {
    throw new Error(
      `Database role "${rows[0]?.current_role}" cannot SET ROLE "${config.DB_RLS_ROLE}". ` +
        'Grant membership (GRANT "' +
        config.DB_RLS_ROLE +
        '" TO your_login_role;) or connect as the postgres role.',
    )
  }
}
