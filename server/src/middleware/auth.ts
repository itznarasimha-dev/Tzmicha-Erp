import type { NextFunction, Request, Response } from 'express'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { getConfig } from '../config.js'
import { queryAsOwner } from '../db/pool.js'
import { AppError } from '../errors.js'
import { logger } from '../logger.js'

export interface AuthContext {
  authUserId: string
  orgId: string
  userId: string
  employeeCode: string
  name: string
  email: string
  role: string
  roleName: string
  roleTier: number
  isAdmin: boolean
  permissions: Set<string>
  hrEmployeeId: string | null
  org: {
    id: string
    name: string
    legalName: string | null
    currency: string
    timezone: string
  }
}

interface IdentityRow {
  id: string
  org_id: string
  name: string
  email: string
  employee_code: string
  status: string
  role_code: string
  role_tier: number
  role_name: string
  org_name: string
  org_legal_name: string | null
  org_currency: string
  org_timezone: string
  org_active: boolean
  hr_employee_id: string | null
  permissions: string[] | null
}

const ADMIN_ROLES = new Set(['system_admin', 'admin'])
const CACHE_TTL_MS = 30_000

interface CacheEntry {
  context: AuthContext
  expiresAt: number
}

const identityCache = new Map<string, CacheEntry>()

export function invalidateIdentityCache(authUserId?: string): void {
  if (authUserId) identityCache.delete(authUserId)
  else identityCache.clear()
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  const config = getConfig()
  if (!jwks) {
    if (!config.SUPABASE_URL) throw new Error('SUPABASE_URL is required for JWKS verification')
    jwks = createRemoteJWKSet(new URL(`${config.SUPABASE_URL}/auth/v1/.well-known/jwks.json`), {
      cooldownDuration: 30_000,
      cacheMaxAge: 600_000,
    })
  }
  return jwks
}

/** Verify a Supabase access token (HS256 secret or asymmetric JWKS). */
export async function verifySupabaseToken(token: string): Promise<JWTPayload> {
  const config = getConfig()
  const issuer = config.SUPABASE_URL ? `${config.SUPABASE_URL}/auth/v1` : undefined
  const options = {
    audience: config.SUPABASE_JWT_AUDIENCE,
    issuer,
  }

  try {
    if (config.SUPABASE_JWT_SECRET) {
      const secret = new TextEncoder().encode(config.SUPABASE_JWT_SECRET)
      const { payload } = await jwtVerify(token, secret, options)
      return payload
    }

    const { payload } = await jwtVerify(token, getJwks(), options)
    return payload
  } catch (error) {
    logger.debug({ err: error }, 'Access token verification failed')
    throw AppError.unauthorized('Invalid or expired access token')
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!token || scheme.toLowerCase() !== 'bearer') return null
  return token.trim()
}

/**
 * Resolve the ERP identity for a verified Supabase auth user. Org and role are
 * read from the database, never from signup metadata or request input.
 */
async function loadIdentity(authUserId: string): Promise<AuthContext> {
  const cached = identityCache.get(authUserId)
  if (cached && cached.expiresAt > Date.now()) return cached.context

  const rows = await queryAsOwner<IdentityRow>(
    `select
        u.id,
        u.org_id,
        u.name,
        u.email,
        u.employee_code,
        u.status,
        r.code  as role_code,
        r.tier  as role_tier,
        r.name  as role_name,
        o.name  as org_name,
        o.legal_name as org_legal_name,
        o.currency as org_currency,
        o.timezone as org_timezone,
        o.is_active as org_active,
        e.id    as hr_employee_id,
        coalesce(array(
          select rp.permission_code
            from erp.role_permissions rp
           where rp.role_id = r.id
        ), '{}'::text[]) as permissions
       from erp.users u
       join erp.roles r         on r.id = u.role_id
       join erp.organizations o on o.id = u.org_id
       left join erp.hr_employees e
              on e.user_id = u.id and e.deleted_at is null
      where u.auth_user_id = $1
      limit 1`,
    [authUserId],
  )

  const row = rows[0]
  if (!row) {
    throw new AppError(
      403,
      'account_not_provisioned',
      'Your account is not provisioned for this ERP tenant. Ask an administrator to create your ERP user.',
    )
  }

  if (row.status !== 'active') {
    throw new AppError(403, 'forbidden', `Your ERP account is ${row.status}.`)
  }

  if (!row.org_active) {
    throw new AppError(403, 'forbidden', 'This organization is inactive.')
  }

  const context: AuthContext = {
    authUserId,
    orgId: row.org_id,
    userId: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    email: row.email,
    role: row.role_code,
    roleName: row.role_name,
    roleTier: row.role_tier,
    isAdmin: ADMIN_ROLES.has(row.role_code),
    permissions: new Set(row.permissions ?? []),
    hrEmployeeId: row.hr_employee_id,
    org: {
      id: row.org_id,
      name: row.org_name,
      legalName: row.org_legal_name,
      currency: row.org_currency,
      timezone: row.org_timezone,
    },
  }

  identityCache.set(authUserId, { context, expiresAt: Date.now() + CACHE_TTL_MS })
  return context
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(req)
  if (!token) throw AppError.unauthorized()

  const payload = await verifySupabaseToken(token)
  const authUserId = typeof payload.sub === 'string' ? payload.sub : null
  if (!authUserId) throw AppError.unauthorized('Access token is missing a subject')

  req.auth = await loadIdentity(authUserId)
  next()
}

export function hasPermission(context: AuthContext, permission: string): boolean {
  return context.isAdmin || context.permissions.has(permission)
}

export function hasAnyPermission(context: AuthContext, permissions: readonly string[]): boolean {
  if (context.isAdmin) return true
  return permissions.some((permission) => context.permissions.has(permission))
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const context = req.auth
    if (!context) throw AppError.unauthorized()
    if (!hasAnyPermission(context, permissions)) {
      throw AppError.forbidden(`Missing permission: ${permissions.join(' or ')}`)
    }
    next()
  }
}

/** Throw-based variant for use inside services. */
export function assertPermission(context: AuthContext, ...permissions: string[]): void {
  if (!hasAnyPermission(context, permissions)) {
    throw AppError.forbidden(`Missing permission: ${permissions.join(' or ')}`)
  }
}

export function requireSelfOrPermission(
  resolveEmployeeUserId: (req: Request) => string | null,
  ...permissions: string[]
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const context = req.auth
    if (!context) throw AppError.unauthorized()

    const targetUserId = resolveEmployeeUserId(req)
    if (targetUserId && targetUserId === context.userId) return next()

    if (!hasAnyPermission(context, permissions)) {
      throw AppError.forbidden(`Missing permission: ${permissions.join(' or ')}`)
    }
    next()
  }
}
