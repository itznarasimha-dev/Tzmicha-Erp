/**
 * Minimal Supabase Auth bridge.
 *
 * There is no Supabase SDK dependency in this repository, so the two calls the
 * HR/Marketing portals need are made directly against the Auth REST API:
 *   POST /auth/v1/token?grant_type=password
 *   POST /auth/v1/logout
 *
 * The anon key is safe to ship to the browser. The service-role key is never
 * referenced here and must remain server-side only.
 */

import { get, setAccessToken, setRefreshToken, type TokenStorage } from './client'

export interface SupabaseAuthConfig {
  url: string
  anonKey: string
}

export function getSupabaseConfig(): SupabaseAuthConfig | null {
  const url = import.meta.env?.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return { url: url.replace(/\/+$/, ''), anonKey }
}

export interface SignInResult {
  ok: boolean
  error?: string
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  user?: {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
  }
  error?: string
  error_description?: string
}

async function callSupabase<T>(
  path: string,
  init: RequestInit,
  config: SupabaseAuthConfig,
): Promise<T> {
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  const payload = text ? (JSON.parse(text) as T) : ({} as T)
  if (!response.ok) {
    const message =
      (payload as TokenResponse)?.error_description ||
      (payload as TokenResponse)?.error ||
      `Supabase request failed (${response.status})`
    throw new Error(message)
  }
  return payload
}

/** Sign in with email + password and persist the resulting access token. */
export async function signInWithPassword(
  email: string,
  password: string,
  remember = true,
): Promise<SignInResult> {
  const config = getSupabaseConfig()
  if (!config) {
    return { ok: false, error: 'Supabase is not configured on this deployment.' }
  }

  try {
    const result = await callSupabase<TokenResponse>(
      '/auth/v1/token?grant_type=password',
      { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) },
      config,
    )
    if (!result.access_token) {
      return { ok: false, error: 'Supabase did not return an access token.' }
    }
    const storage: TokenStorage = remember ? 'localStorage' : 'sessionStorage'
    setAccessToken(result.access_token, storage)
    setRefreshToken(result.refresh_token ?? null)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Sign-in failed. Please try again.',
    }
  }
}

/** Best-effort server-side sign-out; the local session is always cleared. */
export async function signOutWithSupabase(): Promise<void> {
  const config = getSupabaseConfig()
  const token = localStorage.getItem('erp.api.access_token') ??
    sessionStorage.getItem('erp.api.access_token')
  try {
    if (config && token) {
      await callSupabase('/auth/v1/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }, config)
    }
  } catch {
    // Local sign-out must continue even if the network call fails.
  }
}

export interface ApiMeUser {
  id: string
  authUserId: string
  name: string
  email: string
  employeeCode: string
  role: string
  roleName: string
  roleTier: number
  isAdmin: boolean
  hrEmployeeId: string | null
  permissions: string[]
}

export interface ApiOrganization {
  id: string
  name: string
  legalName: string | null
  currency: string
  timezone: string
}

export interface ApiMe {
  user: ApiMeUser
  organization: ApiOrganization
}

/** Verified caller profile; the frontend never derives authorization from this. */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<ApiMe> {
  return get<ApiMe>('/me', { signal })
}
