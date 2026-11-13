/**
 * HR workflow / action-permission tests.
 *
 * These assert the *frontend* gating rules that mirror the backend route
 * contracts. The backend remains authoritative; these tests prove the UI
 * never offers an action the caller is not permitted to use.
 */
import { describe, expect, it } from 'vitest'
import {
  canDo,
  hasAnyHrPermission,
  hasHrPermission,
  HR_CAPABILITY_PERMISSIONS,
  HR_PERMISSION,
  type HrIdentity,
} from './access'
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

const HR_MANAGER = identity({
  role: 'hr_manager',
  roleName: 'HR & People Manager',
  hrEmployeeId: 'emp-hr',
  permissions: [
    ...Object.values(HR_PERMISSION).filter((code) => code.startsWith('hr.')),
    HR_PERMISSION.sharedApprovalDecide,
  ],
})

const FINANCE = identity({
  role: 'finance_controller',
  roleName: 'Financial Controller',
  hrEmployeeId: 'emp-fin',
  permissions: [
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
  ],
})

const EMPLOYEE = identity({ permissions: ['hr.leave.create', 'hr.attendance.read', 'hr.expense.write', 'hr.document.read', 'hr.request.write', 'hr.performance.read'] })

describe('Approval workflow permissions', () => {
  it('lets the HR manager decide leave, attendance and expense approvals', () => {
    expect(canDo(HR_MANAGER, 'leave.approve', 'api')).toBe(true)
    expect(canDo(HR_MANAGER, 'attendance.approve', 'api')).toBe(true)
    expect(canDo(HR_MANAGER, 'expense.approve', 'api')).toBe(true)
  })

  it('never lets the employee role approve anything', () => {
    expect(canDo(EMPLOYEE, 'leave.approve', 'api')).toBe(false)
    expect(canDo(EMPLOYEE, 'attendance.approve', 'api')).toBe(false)
    expect(canDo(EMPLOYEE, 'expense.approve', 'api')).toBe(false)
    expect(canDo(EMPLOYEE, 'expense.reimburse', 'api')).toBe(false)
    expect(canDo(EMPLOYEE, 'payment.approve', 'api')).toBe(false)
    expect(canDo(EMPLOYEE, 'payroll.approve', 'api')).toBe(false)
  })

  it('reserves payroll approval and reimbursement for finance', () => {
    expect(canDo(FINANCE, 'payroll.approve', 'api')).toBe(true)
    expect(canDo(FINANCE, 'expense.reimburse', 'api')).toBe(true)
    // The HR manager prepares payroll but cannot approve the finance stage.
    expect(canDo(HR_MANAGER, 'payroll.prepare', 'api')).toBe(true)
    expect(canDo(HR_MANAGER, 'payroll.approve', 'api')).toBe(false)
    expect(canDo(HR_MANAGER, 'expense.reimburse', 'api')).toBe(false)
  })

  it('allows the HR manager to record and decide attendance corrections', () => {
    expect(canDo(HR_MANAGER, 'attendance.record', 'api')).toBe(true)
    expect(canDo(HR_MANAGER, 'attendance.approve', 'api')).toBe(true)
    expect(canDo(EMPLOYEE, 'attendance.record', 'api')).toBe(false)
  })

  it('allows the employee role to raise but not manage requests', () => {
    expect(canDo(EMPLOYEE, 'request.write', 'api')).toBe(true)
    expect(canDo(EMPLOYEE, 'request.read', 'api')).toBe(false)
  })
})

describe('Contract and payment write permissions', () => {
  it('requires hr.contract.write for contract changes', () => {
    expect(canDo(HR_MANAGER, 'contract.write', 'api')).toBe(true)
    expect(canDo(FINANCE, 'contract.write', 'api')).toBe(false)
    expect(canDo(FINANCE, 'contract.read', 'api')).toBe(true)
  })

  it('accepts hr.payment.create or finance.payment.approve for payment decisions', () => {
    expect(canDo(HR_MANAGER, 'payment.approve', 'api')).toBe(true)
    expect(canDo(FINANCE, 'payment.approve', 'api')).toBe(true)
    expect(canDo(EMPLOYEE, 'payment.approve', 'api')).toBe(false)
  })
})

describe('Talent workflow permissions', () => {
  it('gates recruitment, onboarding, performance and offboarding writes', () => {
    expect(canDo(HR_MANAGER, 'recruitment.write', 'api')).toBe(true)
    expect(canDo(HR_MANAGER, 'onboarding.write', 'api')).toBe(true)
    expect(canDo(HR_MANAGER, 'performance.write', 'api')).toBe(true)
    expect(canDo(HR_MANAGER, 'offboarding.write', 'api')).toBe(true)
    expect(canDo(FINANCE, 'recruitment.write', 'api')).toBe(false)
    expect(canDo(FINANCE, 'onboarding.write', 'api')).toBe(false)
    expect(canDo(EMPLOYEE, 'recruitment.write', 'api')).toBe(false)
  })
})

describe('Capability table integrity', () => {
  it('never maps a capability to an empty permission list', () => {
    for (const [capability, rule] of Object.entries(HR_CAPABILITY_PERMISSIONS)) {
      expect(rule.any.length, capability).toBeGreaterThan(0)
    }
  })

  it('maps delete capabilities to real permission codes', () => {
    expect(HR_CAPABILITY_PERMISSIONS['employee.delete'].any).toContain('hr.employee.write')
    expect(HR_CAPABILITY_PERMISSIONS['document.delete'].any).toContain('hr.document.delete')
  })

  it('keeps hasHrPermission and hasAnyHrPermission consistent with canDo', () => {
    expect(hasHrPermission(HR_MANAGER, 'hr.leave.approve', 'api')).toBe(true)
    expect(hasAnyHrPermission(HR_MANAGER, ['hr.nope.read', 'hr.leave.approve'], 'api')).toBe(true)
    expect(hasAnyHrPermission(EMPLOYEE, ['hr.nope.read'], 'api')).toBe(false)
  })
})
