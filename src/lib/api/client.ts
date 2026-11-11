/**
 * Thin fetch client for the Totally ERP HR + Marketing API.
 *
 * Responsibilities:
 *  - attach the verified Supabase access token (never a service-role key)
 *  - unwrap the `{ data }` envelope and typed pagination
 *  - normalise every failure into a single `ApiError`
 *  - support idempotency keys for sensitive mutations
 *  - surface 401s so the auth bridge can drop a stale token
 */

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface ApiEnvelope<T> {
  data: T
}

export type QueryValue = string | number | boolean | undefined | null

export type QueryParams = Record<string, QueryValue | QueryValue[]>

export interface RequestOptions {
  query?: QueryParams
  body?: unknown
  /** Idempotency-Key; reuse the same value to replay a safe mutation. */
  idempotencyKey?: string
  timeoutMs?: number
  signal?: AbortSignal
}

interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
    details?: unknown
    requestId?: string
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  readonly requestId?: string

  constructor(status: number, code: string, message: string, details?: unknown, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }

  get isAuthError(): boolean {
    return this.status === 401
  }

  get isPermissionError(): boolean {
    return this.status === 403
  }

  get isConflict(): boolean {
    return this.status === 409
  }

  get isValidation(): boolean {
    return this.status === 400 || this.status === 422
  }

  /** First field-level validation message, when the API returned one. */
  get firstDetailMessage(): string {
    const details = this.details
    if (Array.isArray(details) && details.length > 0) {
      const first = details[0] as { message?: string }
      return first?.message ?? this.message
    }
    return this.message
  }
}

/** Default base URL; override with VITE_API_URL in a deployed environment. */
export function getApiBaseUrl(): string {
  const configured = import.meta.env?.VITE_API_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  return '/api'
}

let onUnauthorized: (() => void) | null = null

/** Register the callback used when the API rejects the access token. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

function buildQuery(query?: QueryParams): string {
  if (!query) return ''
  const search = new URLSearchParams()
  for (const [key, raw] of Object.entries(query)) {
    if (raw === undefined || raw === null || raw === '') continue
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') search.append(key, String(item))
      })
    } else {
      search.append(key, String(raw))
    }
  }
  const value = search.toString()
  return value ? `?${value}` : ''
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { query, body, idempotencyKey, timeoutMs = 20_000, signal } = options
  const token = getAccessToken()
  const url = `${getApiBaseUrl()}${path}${buildQuery(query)}`

  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller, { once: true })

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'network_error', 'The request timed out or was cancelled', error)
    }
    throw new ApiError(0, 'network_error', 'Unable to reach the ERP API', error)
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromCaller)
  }

  const payload = await parseBody(response)

  if (!response.ok) {
    const errorBody = (payload as ApiErrorBody | null)?.error
    const code = errorBody?.code ?? (response.status === 404 ? 'not_found' : 'internal_error')
    const message = errorBody?.message ?? `Request failed (${response.status})`
    if (response.status === 401 && onUnauthorized) onUnauthorized()
    throw new ApiError(response.status, code, message, errorBody?.details, errorBody?.requestId)
  }

  return payload as T
}

/** GET returning the unwrapped `{ data }` payload. */
export function get<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>('GET', path, options)
}

/** GET returning the full paginated payload. */
export function getPaginated<T>(path: string, options?: RequestOptions): Promise<PaginatedResponse<T>> {
  return get<PaginatedResponse<T>>(path, options)
}

export function post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('POST', path, { ...options, body: body ?? {} })
}

export function patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('PATCH', path, { ...options, body: body ?? {} })
}

export function put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('PUT', path, { ...options, body: body ?? {} })
}

export function del<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>('DELETE', path, options)
}

/**
 * Fetch every page of a paginated endpoint. The server caps `pageSize` at 100,
 * so dashboards that need a full collection (employee directory, visits) use
 * this instead of a single 25-row response.
 */
export async function fetchAllPages<T>(
  path: string,
  baseQuery: QueryParams = {},
  options: Omit<RequestOptions, 'query'> = {},
): Promise<T[]> {
  const results: T[] = []
  let page = 1
  // Hard stop guards against a misbehaving endpoint that never reaches the end.
  const maxPages = 50
  for (;;) {
    const response = await getPaginated<T>(path, {
      ...options,
      query: { ...baseQuery, page, pageSize: 100 },
    })
    results.push(...response.data)
    if (results.length >= response.pagination.total || response.data.length === 0 || page >= maxPages) {
      break
    }
    page += 1
  }
  return results
}

/** Collision-resistant idempotency key for mutations that must not double-apply. */
export function createIdempotencyKey(prefix = 'idem'): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}

// Token storage lives here to avoid a circular import with `auth.ts`.
const TOKEN_KEY = 'erp.api.access_token'
const TOKEN_STORAGE_KEY = 'erp.api.access_token_storage'
const REFRESH_KEY = 'erp.api.refresh_token'

export type TokenStorage = 'localStorage' | 'sessionStorage'

export function setAccessToken(token: string | null, storage: TokenStorage = 'localStorage'): void {
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
      return
    }
    const target = storage === 'sessionStorage' ? sessionStorage : localStorage
    const other = storage === 'sessionStorage' ? localStorage : sessionStorage
    target.setItem(TOKEN_KEY, token)
    target.setItem(TOKEN_STORAGE_KEY, storage)
    other.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be unavailable (private mode); in-memory calls still work.
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setRefreshToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token)
    else localStorage.removeItem(REFRESH_KEY)
  } catch {
    /* ignore */
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function hasApiToken(): boolean {
  return Boolean(getAccessToken())
}

/** True when the app can actually talk to a deployed API. */
export function isApiConfigured(): boolean {
  const url = import.meta.env?.VITE_API_URL?.trim()
  const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL?.trim()
  return Boolean(url || supabaseUrl)
}
