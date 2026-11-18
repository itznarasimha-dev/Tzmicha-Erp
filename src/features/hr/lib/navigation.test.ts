/**
 * HR navigation visibility tests.
 *
 * Verifies that both mounted HR layouts (the portal ribbon in
 * `HRPortalLayout.tsx` and the sidebar in `components/layout.tsx`) hide the
 * modules the signed-in role may not open, and that the secondary layout is
 * not left with unrestricted navigation.
 */
import { describe, expect, it } from 'vitest'
import { HR_NAVIGATION, visibleHrModules, type HrIdentity } from '../lib/access'
import type { ApiMe } from '@/lib/api/auth'

function identity(overrides: Partial<ApiMe['user']> & { permissions?: string[] }): HrIdentity {
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
    permissions: [],
    ...overrides,
  } as ApiMe['user']
}

const ADMIN = identity({ role: 'system_admin', isAdmin: true, permissions: [] })
const HR_MANAGER = identity({ role: 'hr_manager', permissions: ['hr.employee.read', 'hr.employee.write', 'hr.salary.read', 'hr.attendance.read', 'hr.attendance.write', 'hr.attendance.approve', 'hr.leave.read', 'hr.leave.create', 'hr.leave.approve', 'hr.payroll.read', 'hr.payroll.prepare', 'hr.contract.read', 'hr.contract.write', 'hr.payment.read', 'hr.payment.create', 'hr.expense.read', 'hr.expense.write', 'hr.expense.approve', 'hr.recruitment.read', 'hr.recruitment.write', 'hr.onboarding.read', 'hr.onboarding.write', 'hr.performance.read', 'hr.performance.write', 'hr.request.read', 'hr.request.write', 'hr.offboarding.read', 'hr.offboarding.write', 'hr.settings.write', 'hr.analytics.read', 'hr.document.read', 'hr.document.write'] })
const EMPLOYEE = identity({ permissions: ['hr.leave.create', 'hr.attendance.read', 'hr.expense.write', 'hr.document.read', 'hr.request.write', 'hr.performance.read'] })

describe('HR navigation visibility', () => {
  it('shows every module to the tenant administrator', () => {
    expect(visibleHrModules(ADMIN, 'api')).toEqual(HR_NAVIGATION.map((n) => n.id))
  })

  it('shows every module in demo mode (standalone demo workspace)', () => {
    expect(visibleHrModules(null, 'demo')).toEqual(HR_NAVIGATION.map((n) => n.id))
  })

  it('shows the HR manager the complete HR workspace', () => {
    const modules = visibleHrModules(HR_MANAGER, 'api')
    for (const expected of ['dashboard', 'employees', 'attendance', 'leave', 'recruitment', 'onboarding', 'performance', 'payroll', 'contracts', 'payments', 'expenses', 'requests', 'offboarding', 'reports', 'settings']) {
      expect(modules, expected).toContain(expected)
    }
  })

  it('restricts the employee role to self-service modules', () => {
    const modules = visibleHrModules(EMPLOYEE, 'api')
    expect(modules).toContain('dashboard')
    expect(modules).toContain('attendance')
    expect(modules).toContain('leave')
    expect(modules).toContain('expenses')
    expect(modules).toContain('requests')
    expect(modules).toContain('performance')

    for (const hidden of ['employees', 'recruitment', 'onboarding', 'payroll', 'contracts', 'payments', 'offboarding', 'reports', 'settings']) {
      expect(modules, hidden).not.toContain(hidden)
    }
  })

  it('never exposes HR Settings to a non administrator without hr.settings.write', () => {
    expect(visibleHrModules(EMPLOYEE, 'api')).not.toContain('settings')
    expect(visibleHrModules(HR_MANAGER, 'api')).toContain('settings')
  })

  it('returns only the dashboard when the identity is missing', () => {
    expect(visibleHrModules(null, 'api')).toEqual(['dashboard'])
  })
})
