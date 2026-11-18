/**
 * Component level tests for the HR route guard and navigation filtering.
 *
 * These verify the behaviour the requirements call out:
 *  - permitted HR route renders
 *  - forbidden HR route redirects (direct URL protection)
 *  - nested route access follows the parent module
 *  - employee self-service routes stay reachable
 *  - identity loading does not flash a redirect (deep link / refresh safe)
 *  - an unauthorized `/me` response renders an explicit error state
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'

const accessState = {
  identity: null as null | {
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
  },
  dataSource: 'api' as 'api' | 'demo',
  identityStatus: 'ready' as 'idle' | 'loading' | 'ready' | 'error' | 'anonymous',
  identityError: null as string | null,
}

vi.mock('../store', () => ({
  useStore: () => ({
    dataSource: accessState.dataSource,
    identityStatus: accessState.identityStatus,
    identityError: accessState.identityError,
    identity: accessState.identity ? { user: accessState.identity } : null,
    refreshIdentity: vi.fn(),
  }),
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn(), setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  StoreProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { HrRouteGuard } from './hr-guard'

function Protected({ routeId }: { routeId: string }) {
  return (
    <HrRouteGuard routeId={routeId}>
      <div>protected content</div>
    </HrRouteGuard>
  )
}

function renderAt(path: string, routeId: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/hr" element={<div>hr dashboard</div>} />
        <Route path="/hr/*" element={<Protected routeId={routeId} />} />
      </Routes>
    </MemoryRouter>,
  )
}

function makeIdentity(overrides: Partial<NonNullable<typeof accessState.identity>> = {}) {
  return {
    id: 'user-1',
    authUserId: 'auth-1',
    name: 'Test User',
    email: 'test@example.com',
    employeeCode: 'EMP-000',
    role: 'employee',
    roleName: 'Employee (self-service)',
    roleTier: 4,
    isAdmin: false,
    hrEmployeeId: 'emp-1',
    permissions: [] as string[],
    ...overrides,
  }
}

describe('HrRouteGuard', () => {
  it('renders a permitted route', async () => {
    accessState.dataSource = 'api'
    accessState.identityStatus = 'ready'
    accessState.identity = makeIdentity({ permissions: ['hr.leave.create'] })
    renderAt('/hr/leave', 'leave')
    expect(await screen.findByText('protected content')).toBeInTheDocument()
  })

  it('redirects a forbidden direct URL to the HR dashboard', async () => {
    accessState.dataSource = 'api'
    accessState.identityStatus = 'ready'
    accessState.identity = makeIdentity({ permissions: ['hr.leave.create'] })
    renderAt('/hr/settings', 'settings')
    await waitFor(() => expect(screen.getByText('hr dashboard')).toBeInTheDocument())
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('protects nested employee detail routes', async () => {
    accessState.dataSource = 'api'
    accessState.identityStatus = 'ready'
    accessState.identity = makeIdentity({ permissions: ['hr.leave.create'] })
    renderAt('/hr/employees/emp-1', 'employee-profile')
    await waitFor(() => expect(screen.getByText('hr dashboard')).toBeInTheDocument())
  })

  it('allows the employee self-service leave route', async () => {
    accessState.dataSource = 'api'
    accessState.identityStatus = 'ready'
    accessState.identity = makeIdentity({ permissions: ['hr.leave.create'] })
    renderAt('/hr/leave', 'leave')
    expect(await screen.findByText('protected content')).toBeInTheDocument()
  })

  it('shows a loading skeleton while the identity is being verified', async () => {
    accessState.dataSource = 'api'
    accessState.identityStatus = 'loading'
    accessState.identity = null
    renderAt('/hr/settings', 'settings')
    expect(await screen.findByText('Verifying your ERP permissions…')).toBeInTheDocument()
    expect(screen.queryByText('hr dashboard')).not.toBeInTheDocument()
  })

  it('shows an explicit error state when the identity cannot be verified', async () => {
    accessState.dataSource = 'api'
    accessState.identityStatus = 'error'
    accessState.identity = null
    accessState.identityError = 'Your session has expired.'
    renderAt('/hr/settings', 'settings')
    expect(await screen.findByText('Unable to verify your ERP identity')).toBeInTheDocument()
    expect(screen.getByText('Your session has expired.')).toBeInTheDocument()
  })

  it('keeps every route reachable in demo mode', async () => {
    accessState.dataSource = 'demo'
    accessState.identityStatus = 'anonymous'
    accessState.identity = null
    renderAt('/hr/settings', 'settings')
    expect(await screen.findByText('protected content')).toBeInTheDocument()
  })
})
