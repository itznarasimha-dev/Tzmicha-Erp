import { ApiError, isApiConfigured } from '@/lib/api/client'
import * as marketingApi from '@/lib/api/marketing'

export type MktDataSource = 'demo' | 'api'

export interface MktActionUi {
  dataSource: MktDataSource
  refreshFromApi: () => Promise<void>
  pushToast: (toast: { title: string; description?: string; tone?: 'success' | 'error' | 'info' | 'warning' }) => void
}

function errMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message || error.code
  if (error instanceof Error) return error.message
  return 'Request failed'
}

export function canUseMarketingApi(dataSource: MktDataSource): boolean {
  return dataSource === 'api' && isApiConfigured()
}

export async function runMarketingApiAction<T>(
  ui: MktActionUi,
  opts: {
    action: () => Promise<T>
    successTitle: string
    successDescription?: string
    errorTitle?: string
    refresh?: boolean
  },
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  if (!canUseMarketingApi(ui.dataSource)) {
    ui.pushToast({
      title: 'Live ERP API is not connected',
      description:
        'This action requires an authenticated API session. Demo/local changes are not treated as saved database records.',
      tone: 'warning',
    })
    return { ok: false, error: new Error('api_unavailable') }
  }
  try {
    const value = await opts.action()
    ui.pushToast({ title: opts.successTitle, description: opts.successDescription, tone: 'success' })
    if (opts.refresh !== false) {
      try {
        await ui.refreshFromApi()
      } catch (refreshError) {
        ui.pushToast({ title: 'Saved, but refresh failed', description: errMessage(refreshError), tone: 'warning' })
      }
    }
    return { ok: true, value }
  } catch (error) {
    ui.pushToast({ title: opts.errorTitle ?? 'Action failed', description: errMessage(error), tone: 'error' })
    return { ok: false, error }
  }
}

export { marketingApi }
