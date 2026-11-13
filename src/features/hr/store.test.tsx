/**
 * HR store identity lifecycle tests.
 *
 * Covers the API-mode identity handling required by the specification:
 *  - valid API identity is stored and exposed
 *  - missing identity keeps the portal in a safe (no-permission) state
 *  - expired / unauthorized `/me` responses are surfaced as errors
 *  - identity is cleared on logout / reset / demo transition
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'

const apiState = {
  configured: true,
  token: 'token-1',
  database: {
    employees: [], attendance: [], leaves: [], jobs: [], candidates: [], onboarding: [],
    payroll: [], contracts: [], payments: [], reviews: [], requests: [], offboarding: [],
    corrections: [], activities: [], notifications: [],
    settings: {
      departments: [], designations: [], leaveTypes: [], holidays: [],
      employeeStatuses: [], employmentTypes: [],
    },
  } as any,
  me: null as any,
  meError: null as Error | null,
}

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<any>('@/lib/api/client')
  return {
    ...actual,
    isApiConfigured: () => apiState.configured,
    hasApiToken: () => Boolean(apiState.token),
    setAccessToken: (token: string | null) => { apiState.token = token ?? '' },
    setUnauthorizedHandler: (handler: (() => void) | null) => { (globalThis as any).__unauthorized = handler },
  }
})

vi.mock('@/lib/api/auth', () => ({
  fetchCurrentUser: async () => {
    if (apiState.meError) throw apiState.meError
    if (!apiState.me) throw new Error('no identity')
    return apiState.me
  },
}))

vi.mock('../api-sync', () => ({
  fetchHrDatabase: async () => ({ database: apiState.database, errors: {} }),
}))

import { StoreProvider, useStore } from './store'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(StoreProvider, null, children)

beforeEach(() => {
  apiState.configured = true
  apiState.token = 'token-1'
  apiState.me = null
  apiState.meError = null
  localStorage.clear()
})

describe('HR store identity lifecycle', () => {
  it('stores a valid API identity and marks it ready', async () => {
    apiState.me = {
      user: {
        id: 'user-1', authUserId: 'auth-1', name: 'Amara Okafor', email: 'amara@example.com',
        employeeCode: 'EMP-001', role: 'hr_manager', roleName: 'HR & People Manager',
        roleTier: 1, isAdmin: false, hrEmployeeId: 'emp-1', permissions: ['hr.employee.read'],
      },
      organization: { id: 'org-1', name: 'Tzmicha', legalName: null, currency: 'INR', timezone: 'UTC' },
    }

    const { result } = renderHook(() => useStore(), { wrapper })

    await waitFor(() => expect(result.current.identityStatus).toBe('ready'))
    expect(result.current.identity?.user.role).toBe('hr_manager')
    expect(result.current.dataSource).toBe('api')
    expect(result.current.identityError).toBeNull()
  })

  it('reports an error when the identity cannot be verified', async () => {
    apiState.meError = new Error('Unable to verify your ERP identity.')

    const { result } = renderHook(() => useStore(), { wrapper })

    await waitFor(() => expect(result.current.identityStatus).toBe('error'))
    expect(result.current.identity).toBeNull()
    expect(result.current.identityError).toContain('Unable to verify')
  })

  it('falls back to demo mode when no API token is present', async () => {
    apiState.token = ''

    const { result } = renderHook(() => useStore(), { wrapper })

    await waitFor(() => expect(result.current.dataSource).toBe('demo'))
    expect(result.current.identityStatus).toBe('anonymous')
    expect(result.current.identity).toBeNull()
  })

  it('clears the identity when the session is rejected', async () => {
    apiState.me = {
      user: {
        id: 'user-1', authUserId: 'auth-1', name: 'Amara Okafor', email: 'amara@example.com',
        employeeCode: 'EMP-001', role: 'hr_manager', roleName: 'HR & People Manager',
        roleTier: 1, isAdmin: false, hrEmployeeId: 'emp-1', permissions: ['hr.employee.read'],
      },
      organization: { id: 'org-1', name: 'Tzmicha', legalName: null, currency: 'INR', timezone: 'UTC' },
    }

    const { result } = renderHook(() => useStore(), { wrapper })
    await waitFor(() => expect(result.current.identityStatus).toBe('ready'))

    act(() => { (globalThis as any).__unauthorized?.() })

    await waitFor(() => expect(result.current.identity).toBeNull())
    expect(result.current.identityStatus).toBe('anonymous')
    expect(result.current.dataSource).toBe('demo')
  })

  it('clears the identity when the demo workspace is reset', async () => {
    apiState.me = {
      user: {
        id: 'user-1', authUserId: 'auth-1', name: 'Amara Okafor', email: 'amara@example.com',
        employeeCode: 'EMP-001', role: 'hr_manager', roleName: 'HR & People Manager',
        roleTier: 1, isAdmin: false, hrEmployeeId: 'emp-1', permissions: ['hr.employee.read'],
      },
      organization: { id: 'org-1', name: 'Tzmicha', legalName: null, currency: 'INR', timezone: 'UTC' },
    }

    const { result } = renderHook(() => useStore(), { wrapper })
    await waitFor(() => expect(result.current.identityStatus).toBe('ready'))

    act(() => { result.current.resetDemo() })

    await waitFor(() => expect(result.current.identity).toBeNull())
    expect(result.current.identityStatus).toBe('anonymous')
    expect(result.current.dataSource).toBe('demo')
  })
})
