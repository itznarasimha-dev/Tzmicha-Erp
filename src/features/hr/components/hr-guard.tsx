import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AlertTriangle, Lock, RefreshCw, ShieldAlert } from 'lucide-react'
import { useHrAccess } from '../lib/access'
import { useStore } from '../store'
import { Button, Card, Skeleton } from './ui'

/**
 * Shared HR route guard used by every mounted HR layout.
 *
 * Behaviour in API mode:
 *  - while the verified identity is still loading we render a skeleton instead
 *    of redirecting (avoids a redirect loop / flash on deep links and refresh)
 *  - when the identity could not be resolved (expired session / unauthorized)
 *    we render an explicit access state with a retry action
 *  - when the identity is resolved but the module is not permitted we redirect
 *    to the HR dashboard, which every authenticated HR caller may open
 *
 * Demo mode is unaffected: every HR route stays reachable.
 */
export function HrRouteGuard({ routeId, children }: { routeId: string; children: React.ReactNode }) {
  const access = useHrAccess()
  const { dataSource, identityStatus, identityError, refreshIdentity } = useStore()
  const location = useLocation()

  if (dataSource !== 'api') return <>{children}</>

  if (identityStatus === 'loading' || identityStatus === 'idle') {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />)}
        </div>
        <Skeleton className="h-[320px]" />
        <p className="text-center text-xs text-slate-400">Verifying your ERP permissions…</p>
      </div>
    )
  }

  if (identityStatus === 'error' || !access.identity) {
    return (
      <Card className="p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-rose-500" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
          Unable to verify your ERP identity
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {identityError ??
            'The ERP API did not return a verified identity for this session. HR data stays hidden until your access is confirmed.'}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="secondary" onClick={() => void refreshIdentity()}>
            <RefreshCw className="h-4 w-4" /> Retry identity check
          </Button>
        </div>
      </Card>
    )
  }

  if (!access.canAccess(routeId)) {
    // The dashboard route is always permitted, so this cannot loop.
    if (routeId !== 'dashboard') {
      return <Navigate to="/hr" replace state={{ from: location.pathname }} />
    }
    return (
      <Card className="p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-amber-500" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
          HR workspace is not available for your role
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Your ERP role ({access.roleName || access.role || 'unknown'}) does not include any HR module
          permissions. Contact an administrator if you believe this is wrong.
        </p>
      </Card>
    )
  }

  return <>{children}</>
}

/**
 * Compact inline notice used by pages when a specific action is not available
 * for the signed-in role. The reason is derived from the backend permission
 * codes so the user always knows why the control is disabled.
 */
export function HrPermissionNotice({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 ${className ?? ''}`}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
