import { ApiError, isApiConfigured } from '@/lib/api/client'
import * as hrApi from '@/lib/api/hr'
import type { ToastType } from './store'
import type { Database } from './types'

export type HrApiMode = 'demo' | 'api'

export interface ActionUi {
  dataSource: HrApiMode
  refreshFromApi: () => Promise<void>
  toast: (message: string, type?: ToastType, description?: string) => void
}

function errMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message || error.code
  if (error instanceof Error) return error.message
  return 'Request failed'
}

export function canUseHrApi(dataSource: HrApiMode): boolean {
  return dataSource === 'api' && isApiConfigured()
}

/**
 * Run a real HR API mutation. Never falls back to demo data on failure and
 * never reports success unless the server confirmed the operation.
 */
export async function runHrApiAction<T>(
  ui: ActionUi,
  opts: {
    action: () => Promise<T>
    successMessage: string
    successDescription?: string
    errorTitle?: string
    refresh?: boolean
  },
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  if (!canUseHrApi(ui.dataSource)) {
    ui.toast(
      'Live ERP API is not connected',
      'warning',
      'This action requires an authenticated API session. Demo/local changes are not treated as saved database records.',
    )
    return { ok: false, error: new Error('api_unavailable') }
  }
  try {
    const value = await opts.action()
    ui.toast(opts.successMessage, 'success', opts.successDescription)
    if (opts.refresh !== false) {
      try {
        await ui.refreshFromApi()
      } catch (refreshError) {
        ui.toast('Saved, but refresh failed', 'warning', errMessage(refreshError))
      }
    }
    return { ok: true, value }
  } catch (error) {
    ui.toast(opts.errorTitle ?? 'Action failed', 'error', errMessage(error))
    return { ok: false, error }
  }
}

// Convenience wrappers for common HR mutations (use existing API client)
export const hrActions = {
  ...hrApi,
}

export function apiUnavailableMessage(): string {
  return 'Connect and sign in to the ERP API to perform this action against the real database.'
}
