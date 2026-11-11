import 'dotenv/config'
import { z } from 'zod'

const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1).optional(),
  DB_SSL: booleanish.default('true'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(15000),
  DB_ENFORCE_RLS: booleanish.default('true'),
  DB_RLS_ROLE: z
    .string()
    .regex(/^[a-z_][a-z0-9_]*$/i, 'DB_RLS_ROLE must be a plain Postgres role name')
    .default('authenticated'),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_JWT_SECRET: z.string().min(16).optional(),
  SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
})

export type AppConfig = z.infer<typeof schema> & {
  corsOrigins: string[]
  isProduction: boolean
}

let cachedConfig: AppConfig | null = null

/** Process-wide configuration, validated once at first use. */
export function getConfig(): AppConfig {
  if (!cachedConfig) cachedConfig = loadConfig()
  return cachedConfig
}

/** Intended for tests only. */
export function resetConfigCache(): void {
  cachedConfig = null
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid environment configuration — ${detail}`)
  }

  const value = parsed.data

  if (!value.DATABASE_URL && value.NODE_ENV !== 'test') {
    throw new Error(
      'DATABASE_URL is required. Copy server/.env.example to server/.env and set the Supabase connection string.',
    )
  }

  if (!value.SUPABASE_URL && value.NODE_ENV !== 'test') {
    throw new Error('SUPABASE_URL is required to verify access tokens.')
  }

  return {
    ...value,
    corsOrigins: value.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    isProduction: value.NODE_ENV === 'production',
  }
}
