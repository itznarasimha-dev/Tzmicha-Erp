import type { PoolClient, QueryResultRow } from 'pg'
import { AppError } from '../errors.js'
import { one } from '../db/transaction.js'

export const IDEMPOTENCY_HEADER = 'idempotency-key'

/** Read and validate an idempotency key. Returns null when not supplied. */
export function readIdempotencyKey(value: unknown): string | null {
  if (value === undefined) return null
  const key = Array.isArray(value) ? value[0] : value
  if (typeof key !== 'string') return null
  const trimmed = key.trim()
  if (!trimmed) return null
  if (trimmed.length < 8 || trimmed.length > 200) {
    throw AppError.badRequest('Idempotency-Key must be between 8 and 200 characters')
  }
  return trimmed
}

/**
 * Replay protection for create endpoints that persist an `idempotency_key`
 * column with a UNIQUE (org_id, idempotency_key) constraint.
 *
 * The endpoint pattern is:
 *   1. `existing = await findReplay(...)`
 *   2. if existing -> return it with `replayed: true`
 *   3. otherwise insert; a concurrent duplicate raises 23505, which the caller
 *      resolves by re-reading (see `resolveUniqueViolation`).
 */
export async function findReplay<T extends QueryResultRow>(
  client: PoolClient,
  table: string,
  columns: string,
  orgId: string,
  key: string | null,
): Promise<T | null> {
  if (!key) return null
  // `table`, `columns` are internal constants, never request input.
  return one<T>(
    client,
    `select ${columns} from ${table} where org_id = $1 and idempotency_key = $2 limit 1`,
    [orgId, key],
  )
}

export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505'
}
