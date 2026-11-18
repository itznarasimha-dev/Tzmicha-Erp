/**
 * HR role / permission foundation tests.
 *
 * These cover the verified identity contract, the permission capability map,
 * navigation + route visibility, ownership/self-service rules and salary
 * confidentiality. The permission codes used here are the exact strings the
 * backend and `supabase/seed/initial_erp_seed.sql` use.
 */
import { describe, expect, it } from 'vitest'
import {
  canAccessHrRoute,
  canAccessSelfServiceModule,
  canDo,
  canViewSalary,
  describeMissingPermission,
  HR_CAPABILITY_PERMISSIONS,
  HR_NAVIGATION,
  HR_PERMISSION,
  hasAnyHrPermission,
  hasHrPermission,
  isSelfEmployee,
  resolveHrDashboardView,
  visibleHrModules,
  type HrIdentity,
} from './access'
import type { ApiMe } from '@/lib/api/auth'

/**
 * Build a verified identity exactly like `GET /me` returns it.
 */
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
    hrEmployeeId: null,
    permissions: [],
    ...overrides,
  } as ApiMe['user']
}

/** The seeded `hr_manager` role: every `hr.*` permission plus `approval.decide`. */
const HR_MANAGER_PERMISSIONS = [
  ...Object.values(HR_PERMISSION).filter((code) => code.startsWith('hr.')),
  HR_PERMISSION.sharedApprovalDecide,
]

/** The seeded `employee` role (self-service). */
const EMPLOYEE_PERMISSIONS = [
  'hr.leave.create',
  'hr.attendance.read',
  'hr.expense.write',
  'hr.document.read',
  'hr.request.write',
  'hr.performance.read',
]

/** The seeded `manager` role: every `*.read` plus approval.decide. */
const MANAGER_PERMISSIONS = [
  'approval.decide',
  'hr.employee.read',
  'hr.attendance.read',
  'hr.leave.read',
  'hr.payroll.read',
  'hr.contract.read',
  'hr.payment.read',
  'hr.expense.read',
  'hr.recruitment.read',
  'hr.onboarding.read',
  'hr.performance.read',
  'hr.request.read',
  'hr.offboarding.read',
  'hr.analytics.read',
  'hr.document.read',
]

/** The seeded `finance_controller` role. */
const FINANCE_PERMISSIONS = [
  'approval.decide',
  'hr.payroll.read',
  'hr.salary.read',
  'hr.payment.read',
  'hr.expense.read',
  'hr.expense.approve',
  'hr.employee.read',
  'hr.contract.read',
  'finance.payment.read',
  'finance.payment.approve',
  'finance.expense.read',
]

describe('HR identity and permission primitives', () => {
  it('resolves permissions from a valid API identity', () => {
    const me = identity({ permissions: ['hr.leave.approve'] })
    expect(hasHrPermission(me, 'hr.leave.approve', 'api')).toBe(true)
    expect(hasHrPermission(me, 'hr.leave.create', 'api')).toBe(false)
  })

  it('denies everything when the identity is missing', () => {
    expect(hasHrPermission(null, 'hr.leave.create', 'api')).toBe(false)
    expect(hasAnyHrPermission(null, ['hr.leave.create'], 'api')).toBe(false)
    expect(canDo(null, 'leave.apply', 'api')).toBe(false)
    expect(canAccessHrRoute('leave', null, 'api')).toBe(false)
  })

  it('treats a tenant admin as holding every permission', () => {
    const admin = identity({ role: 'system_admin', roleName: 'System Administrator', isAdmin: true, permissions: [] })
    expect(hasHrPermission(admin, 'hr.employee.write', 'api')).toBe(true)
    expect(canDo(admin, 'settings.write', 'api')).toBe(true)
    expect(canAccessHrRoute('settings', admin, 'api')).toBe(true)
  })

  it('keeps demo mode permissive so the demo workspace keeps working', () => {
    expect(hasHrPermission(null, 'hr.employee.write', 'demo')).toBe(true)
    expect(canDo(null, 'settings.write', 'demo')).toBe(true)
    expect(canAccessHrRoute('settings', null, 'demo')).toBe(true)
    expect(visibleHrModules(null, 'demo')).toEqual(HR_NAVIGATION.map((item) => item.id))
  })

  it('reports the permission codes behind a missing capability', () => {
    expect(describeMissingPermission('leave.approve')).toContain('hr.leave.approve')
    expect(describeMissingPermission('expense.reimburse')).toContain('finance.payment.approve')
  })

  it('never invents permission strings', () => {
    const known = new Set<string>(Object.values(HR_PERMISSION))
    for (const rule of Object.values(HR_CAPABILITY_PERMISSIONS)) {
      for (const code of rule.any) expect(known.has(code)).toBe(true)
      for (const code of rule.all ?? []) expect(known.has(code)).toBe(true)
    }
  })
})

describe('HR capability mapping (mirrors backend requirePermission)', () => {
  const hrManager = identity({ role: 'hr_manager', roleName: 'HR & People Manager', permissions: HR_MANAGER_PERMISSIONS })
  const employee = identity({ permissions: EMPLOYEE_PERMISSIONS })
  const manager = identity({ role: 'manager', roleName: 'Operations General Manager', permissions: MANAGER_PERMISSIONS })
  const finance = identity({ role: 'finance_controller', roleName: 'Financial Controller', permissions: FINANCE_PERMISSIONS })

  it('gives the HR manager full employee administration', () => {
    expect(canDo(hrManager, 'employee.create', 'api')).toBe(true)
    expect(canDo(hrManager, 'employee.update', 'api')).toBe(true)
    expect(canDo(hrManager, 'employee.delete', 'api')).toBe(true)
    expect(canDo(hrManager, 'settings.write', 'api')).toBe(true)
    expect(canDo(hrManager, 'leave.approve', 'api')).toBe(true)
    expect(canDo(hrManager, 'attendance.approve', 'api')).toBe(true)
  })

  it('restricts the employee role to self-service capabilities', () => {
    expect(canDo(employee, 'leave.apply', 'api')).toBe(true)
    expect(canDo(employee, 'attendance.read', 'api')).toBe(true)
    expect(canDo(employee, 'expense.submit', 'api')).toBe(true)
    expect(canDo(employee, 'request.write', 'api')).toBe(true)
    expect(canDo(employee, 'performance.read', 'api')).toBe(true)

    // Not granted by the seeded employee role.
    expect(canDo(employee, 'employee.read', 'api')).toBe(false)
    expect(canDo(employee, 'leave.approve', 'api')).toBe(false)
    expect(canDo(employee, 'attendance.approve', 'api')).toBe(false)
    expect(canDo(employee, 'payroll.read', 'api')).toBe(false)
    expect(canDo(employee, 'settings.write', 'api')).toBe(false)
    expect(canDo(employee, 'expense.approve', 'api')).toBe(false)
  })

  it('keeps the operations manager read + approval only', () => {
    expect(canDo(manager, 'employee.read', 'api')).toBe(true)
    expect(canDo(manager, 'attendance.approve', 'api')).toBe(false)
    expect(canDo(manager, 'leave.approve', 'api')).toBe(false)
    expect(canDo(manager, 'approval.decide', 'api')).toBe(true)
    expect(canDo(manager, 'employee.create', 'api')).toBe(false)
    expect(canDo(manager, 'settings.write', 'api')).toBe(false)
  })

  it('gives finance payroll/payment authority but no HR write access', () => {
    expect(canDo(finance, 'payroll.read', 'api')).toBe(true)
    expect(canDo(finance, 'payroll.approve', 'api')).toBe(true)
    expect(canDo(finance, 'payment.approve', 'api')).toBe(true)
    expect(canDo(finance, 'expense.approve', 'api')).toBe(true)
    expect(canDo(finance, 'expense.reimburse', 'api')).toBe(true)
    expect(canDo(finance, 'employee.create', 'api')).toBe(false)
    expect(canDo(finance, 'employee.read', 'api')).toBe(true)
    expect(canDo(finance, 'recruitment.read', 'api')).toBe(false)
  })
})

describe('Ownership and confidentiality', () => {
  const owner = identity({ hrEmployeeId: 'emp-self' })
  const other = identity({ hrEmployeeId: 'emp-other', permissions: ['hr.employee.read'] })

  it('recognises the signed-in employee', () => {
    expect(isSelfEmployee(owner, 'emp-self', 'api')).toBe(true)
    expect(isSelfEmployee(owner, 'emp-other', 'api')).toBe(false)
    expect(isSelfEmployee(other, 'emp-self', 'api')).toBe(false)
    expect(isSelfEmployee(null, 'emp-self', 'api')).toBe(false)
  })

  it('shows salary to the owner and to salary/payroll holders only', () => {
    expect(canViewSalary(owner, 'api', 'emp-self')).toBe(true)
    expect(canViewSalary(owner, 'api', 'emp-other')).toBe(false)

    const payrollReader = identity({ permissions: ['hr.salary.read'] })
    expect(canViewSalary(payrollReader, 'api', 'emp-other')).toBe(true)

    const plainReader = identity({ permissions: ['hr.employee.read'] })
    expect(canViewSalary(plainReader, 'api', 'emp-other')).toBe(false)
  })

  it('always allows salary visibility in demo mode', () => {
    expect(canViewSalary(null, 'demo', 'emp-other')).toBe(true)
  })
})

describe('HR navigation and direct URL protection', () => {
  const hrManager = identity({ role: 'hr_manager', permissions: HR_MANAGER_PERMISSIONS })
  const employee = identity({ permissions: EMPLOYEE_PERMISSIONS })
  const manager = identity({ role: 'manager', permissions: MANAGER_PERMISSIONS })
  const finance = identity({ role: 'finance_controller', permissions: FINANCE_PERMISSIONS })

  it('hides HR-only modules from the employee role', () => {
    const modules = visibleHrModules(employee, 'api')
    expect(modules).toContain('dashboard')
    expect(modules).not.toContain('settings')
    expect(modules).not.toContain('payroll')
    expect(modules).not.toContain('recruitment')
    expect(modules).not.toContain('offboarding')
  })

  it('protects restricted routes from direct URL access', () => {
    expect(canAccessHrRoute('settings', employee, 'api')).toBe(false)
    expect(canAccessHrRoute('payroll', employee, 'api')).toBe(false)
    expect(canAccessHrRoute('settings', hrManager, 'api')).toBe(true)
  })

  it('protects nested routes through their parent module', () => {
    expect(canAccessHrRoute('employee-profile', employee, 'api')).toBe(false)
    expect(canAccessHrRoute('employee-profile', hrManager, 'api')).toBe(true)
    expect(canAccessHrRoute('contract-detail', hrManager, 'api')).toBe(true)
    expect(canAccessHrRoute('contract-detail', employee, 'api')).toBe(false)
  })

  it('keeps the dashboard reachable for every identified caller', () => {
    for (const me of [hrManager, employee, manager, finance]) {
      expect(canAccessHrRoute('dashboard', me, 'api')).toBe(true)
    }
  })

  it('lets the employee open own-record modules', () => {
    expect(canAccessSelfServiceModule('leave', employee, 'api')).toBe(true)
    expect(canAccessSelfServiceModule('expenses', employee, 'api')).toBe(true)
    expect(canAccessSelfServiceModule('attendance', employee, 'api')).toBe(true)
    expect(canAccessSelfServiceModule('requests', employee, 'api')).toBe(true)
    expect(canAccessSelfServiceModule('payroll', employee, 'api')).toBe(false)
    expect(canAccessSelfServiceModule('settings', employee, 'api')).toBe(false)
  })

  it('shows the finance role only its authorised modules', () => {
    const modules = visibleHrModules(finance, 'api')
    expect(modules).toContain('payroll')
    expect(modules).toContain('payments')
    expect(modules).toContain('expenses')
    expect(modules).toContain('employees')
    expect(modules).not.toContain('recruitment')
    expect(modules).not.toContain('settings')
  })

  it('shows the operations manager read-only modules', () => {
    const modules = visibleHrModules(manager, 'api')
    expect(modules).toContain('employees')
    expect(modules).toContain('attendance')
    expect(modules).toContain('leave')
    expect(modules).not.toContain('settings')
  })
})

describe('Role based dashboard scope', () => {
  it('maps the tenant admin to the admin dashboard', () => {
    const admin = identity({ role: 'system_admin', isAdmin: true })
    expect(resolveHrDashboardView(admin, 'api')).toBe('admin')
  })

  it('maps the HR manager to the HR dashboard', () => {
    const hrManager = identity({ role: 'hr_manager', permissions: HR_MANAGER_PERMISSIONS })
    expect(resolveHrDashboardView(hrManager, 'api')).toBe('hr')
  })

  it('maps the finance controller to the finance dashboard', () => {
    const finance = identity({ role: 'finance_controller', permissions: FINANCE_PERMISSIONS })
    expect(resolveHrDashboardView(finance, 'api')).toBe('finance')
  })

  it('maps the operations manager to the manager dashboard', () => {
    const manager = identity({ role: 'manager', permissions: MANAGER_PERMISSIONS })
    expect(resolveHrDashboardView(manager, 'api')).toBe('manager')
  })

  it('maps the employee to the self-service dashboard', () => {
    const employee = identity({ permissions: EMPLOYEE_PERMISSIONS })
    expect(resolveHrDashboardView(employee, 'api')).toBe('employee')
  })

  it('falls back to the self-service dashboard when the identity is unknown', () => {
    expect(resolveHrDashboardView(null, 'api')).toBe('employee')
  })

  it('keeps the full demo dashboard in demo mode', () => {
    expect(resolveHrDashboardView(null, 'demo')).toBe('admin')
  })
})
