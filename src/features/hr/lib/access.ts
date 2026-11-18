/**
 * Centralized HR permission / role foundation.
 *
 * Authority model
 * ----------------
 * * The backend (`server/src/middleware/auth.ts` + `server/src/routes/hr/*`)
 *   is the only authorization authority. Every helper in this file exists to
 *   decide what the UI *shows* and *enables*.
 * * In API mode the verified caller identity is read from `GET /me`, which
 *   returns the role code and the permission list resolved from the database
 *   (`erp.roles` / `erp.role_permissions`). The frontend never derives a role
 *   from local demo state while the API is connected.
 * * In demo mode (`dataSource === 'demo'`) the historical, permissive demo
 *   behaviour is preserved so the standalone demo workspace keeps working.
 *
 * Permission identifiers below are the exact strings used by the backend and
 * by `supabase/seed/initial_erp_seed.sql`. Nothing here is invented.
 */

import { useMemo } from 'react'
import type { ApiMe } from '@/lib/api/auth'
import { useStore, type HrDataSource } from '../store'

export type HrIdentity = ApiMe['user'] | null

/** Exact backend permission codes (see `supabase/seed/initial_erp_seed.sql`). */
export const HR_PERMISSION = {
  employeeRead: 'hr.employee.read',
  employeeWrite: 'hr.employee.write',
  salaryRead: 'hr.salary.read',
  documentRead: 'hr.document.read',
  documentWrite: 'hr.document.write',
  documentDelete: 'hr.document.delete',
  attendanceRead: 'hr.attendance.read',
  attendanceWrite: 'hr.attendance.write',
  attendanceApprove: 'hr.attendance.approve',
  leaveRead: 'hr.leave.read',
  leaveCreate: 'hr.leave.create',
  leaveApprove: 'hr.leave.approve',
  payrollRead: 'hr.payroll.read',
  payrollPrepare: 'hr.payroll.prepare',
  contractRead: 'hr.contract.read',
  contractWrite: 'hr.contract.write',
  paymentRead: 'hr.payment.read',
  paymentCreate: 'hr.payment.create',
  expenseRead: 'hr.expense.read',
  expenseWrite: 'hr.expense.write',
  expenseApprove: 'hr.expense.approve',
  recruitmentRead: 'hr.recruitment.read',
  recruitmentWrite: 'hr.recruitment.write',
  onboardingRead: 'hr.onboarding.read',
  onboardingWrite: 'hr.onboarding.write',
  performanceRead: 'hr.performance.read',
  performanceWrite: 'hr.performance.write',
  requestRead: 'hr.request.read',
  requestWrite: 'hr.request.write',
  offboardingRead: 'hr.offboarding.read',
  offboardingWrite: 'hr.offboarding.write',
  settingsWrite: 'hr.settings.write',
  analyticsRead: 'hr.analytics.read',
  approvalDecide: 'hr.approval.decide',
  // Shared / cross-module permissions used by HR workflows.
  sharedApprovalDecide: 'approval.decide',
  financePaymentRead: 'finance.payment.read',
  financePaymentApprove: 'finance.payment.approve',
  financeExpenseRead: 'finance.expense.read',
} as const

export type HrPermission = (typeof HR_PERMISSION)[keyof typeof HR_PERMISSION]

/**
 * User facing capabilities. Each capability maps to the backend permission(s)
 * that guard the matching endpoint. `any` mirrors the backend
 * `requirePermission(a, b)` semantics (OR); `all` requires every code.
 */
export type HrCapability =
  | 'employee.read'
  | 'employee.create'
  | 'employee.update'
  | 'employee.delete'
  | 'employee.salary'
  | 'document.read'
  | 'document.write'
  | 'document.delete'
  | 'attendance.read'
  | 'attendance.record'
  | 'attendance.approve'
  | 'leave.read'
  | 'leave.apply'
  | 'leave.approve'
  | 'leave.cancel'
  | 'leave.balance.manage'
  | 'payroll.read'
  | 'payroll.prepare'
  | 'payroll.approve'
  | 'contract.read'
  | 'contract.write'
  | 'payment.read'
  | 'payment.create'
  | 'payment.approve'
  | 'expense.read'
  | 'expense.submit'
  | 'expense.approve'
  | 'expense.reimburse'
  | 'recruitment.read'
  | 'recruitment.write'
  | 'onboarding.read'
  | 'onboarding.write'
  | 'performance.read'
  | 'performance.write'
  | 'request.read'
  | 'request.write'
  | 'offboarding.read'
  | 'offboarding.write'
  | 'settings.read'
  | 'settings.write'
  | 'analytics.read'
  | 'approval.decide'

export const HR_CAPABILITY_PERMISSIONS: Record<HrCapability, { any: string[]; all?: string[] }> = {
  'employee.read': { any: [HR_PERMISSION.employeeRead] },
  'employee.create': { any: [HR_PERMISSION.employeeWrite] },
  'employee.update': { any: [HR_PERMISSION.employeeWrite] },
  // DELETE /hr/employees/:id is guarded by `hr.employee.write` server-side.
  'employee.delete': { any: [HR_PERMISSION.employeeWrite] },
  'employee.salary': { any: [HR_PERMISSION.salaryRead, HR_PERMISSION.payrollPrepare] },
  'document.read': { any: [HR_PERMISSION.documentRead] },
  'document.write': { any: [HR_PERMISSION.documentWrite, HR_PERMISSION.employeeWrite] },
  'document.delete': { any: [HR_PERMISSION.documentDelete] },
  'attendance.read': { any: [HR_PERMISSION.attendanceRead] },
  'attendance.record': { any: [HR_PERMISSION.attendanceWrite] },
  'attendance.approve': { any: [HR_PERMISSION.attendanceApprove] },
  'leave.read': { any: [HR_PERMISSION.leaveRead] },
  'leave.apply': { any: [HR_PERMISSION.leaveCreate] },
  'leave.approve': { any: [HR_PERMISSION.leaveApprove] },
  'leave.cancel': { any: [HR_PERMISSION.leaveCreate, HR_PERMISSION.leaveApprove] },
  'leave.balance.manage': { any: [HR_PERMISSION.settingsWrite] },
  'payroll.read': { any: [HR_PERMISSION.payrollRead] },
  'payroll.prepare': { any: [HR_PERMISSION.payrollPrepare] },
  // `approve` / `mark-paid` payroll transitions require finance.payment.approve.
  'payroll.approve': { any: [HR_PERMISSION.financePaymentApprove] },
  'contract.read': { any: [HR_PERMISSION.contractRead] },
  'contract.write': { any: [HR_PERMISSION.contractWrite] },
  'payment.read': { any: [HR_PERMISSION.paymentRead] },
  'payment.create': { any: [HR_PERMISSION.paymentCreate] },
  // Payment approve/reject/status transitions accept hr.payment.create OR finance.payment.approve.
  'payment.approve': { any: [HR_PERMISSION.paymentCreate, HR_PERMISSION.financePaymentApprove] },
  'expense.read': { any: [HR_PERMISSION.expenseRead, HR_PERMISSION.financeExpenseRead] },
  'expense.submit': { any: [HR_PERMISSION.expenseWrite] },
  'expense.approve': { any: [HR_PERMISSION.expenseApprove] },
  'expense.reimburse': { any: [HR_PERMISSION.financePaymentApprove] },
  'recruitment.read': { any: [HR_PERMISSION.recruitmentRead] },
  'recruitment.write': { any: [HR_PERMISSION.recruitmentWrite] },
  'onboarding.read': { any: [HR_PERMISSION.onboardingRead] },
  'onboarding.write': { any: [HR_PERMISSION.onboardingWrite] },
  'performance.read': { any: [HR_PERMISSION.performanceRead] },
  'performance.write': { any: [HR_PERMISSION.performanceWrite] },
  'request.read': { any: [HR_PERMISSION.requestRead] },
  'request.write': { any: [HR_PERMISSION.requestWrite] },
  'offboarding.read': { any: [HR_PERMISSION.offboardingRead] },
  'offboarding.write': { any: [HR_PERMISSION.offboardingWrite] },
  'settings.read': { any: [HR_PERMISSION.settingsWrite, HR_PERMISSION.employeeRead] },
  'settings.write': { any: [HR_PERMISSION.settingsWrite] },
  'analytics.read': { any: [HR_PERMISSION.analyticsRead] },
  'approval.decide': {
    any: [
      HR_PERMISSION.approvalDecide,
      HR_PERMISSION.sharedApprovalDecide,
      HR_PERMISSION.financePaymentApprove,
    ],
  },
}

// ---------------------------------------------------------------------------
// Identity / permission primitives
// ---------------------------------------------------------------------------

export function hasHrPermission(
  identity: HrIdentity,
  permission: string,
  dataSource: HrDataSource = 'api',
): boolean {
  if (dataSource !== 'api') return true
  if (!identity) return false
  if (identity.isAdmin) return true
  return identity.permissions?.includes(permission) ?? false
}

export function hasAnyHrPermission(
  identity: HrIdentity,
  permissions: readonly string[],
  dataSource: HrDataSource = 'api',
): boolean {
  if (dataSource !== 'api') return true
  if (!identity) return false
  if (identity.isAdmin) return true
  const set = new Set(identity.permissions ?? [])
  return permissions.some((permission) => set.has(permission))
}

export function hasAllHrPermissions(
  identity: HrIdentity,
  permissions: readonly string[],
  dataSource: HrDataSource = 'api',
): boolean {
  if (dataSource !== 'api') return true
  if (!identity) return false
  if (identity.isAdmin) return true
  const set = new Set(identity.permissions ?? [])
  return permissions.every((permission) => set.has(permission))
}

export function canDo(
  identity: HrIdentity,
  capability: HrCapability,
  dataSource: HrDataSource = 'api',
): boolean {
  if (dataSource !== 'api') return true
  if (!identity) return false
  if (identity.isAdmin) return true
  const rule = HR_CAPABILITY_PERMISSIONS[capability]
  if (!rule) return false
  if (rule.all && !hasAllHrPermissions(identity, rule.all, dataSource)) return false
  return hasAnyHrPermission(identity, rule.any, dataSource)
}

/** True when the signed-in caller owns the given employee record. */
export function isSelfEmployee(
  identity: HrIdentity,
  employeeId?: string | null,
  dataSource: HrDataSource = 'api',
): boolean {
  if (dataSource !== 'api') return false
  if (!identity || !identity.hrEmployeeId || !employeeId) return false
  return identity.hrEmployeeId === employeeId
}

/**
 * Salary/confidential data is visible to the owner, to holders of
 * `hr.salary.read` / `hr.payroll.prepare`, and to tenant admins.
 */
export function canViewSalary(
  identity: HrIdentity,
  dataSource: HrDataSource = 'api',
  targetEmployeeId?: string | null,
): boolean {
  if (dataSource !== 'api') return true
  if (!identity) return false
  if (identity.isAdmin) return true
  if (isSelfEmployee(identity, targetEmployeeId, dataSource)) return true
  return canDo(identity, 'employee.salary', dataSource)
}

// ---------------------------------------------------------------------------
// Dashboard / navigation scope
// ---------------------------------------------------------------------------

export type HrDashboardView = 'admin' | 'hr' | 'manager' | 'finance' | 'employee'

/**
 * Resolve the dashboard scope from the *verified* identity.
 *
 * The resolution is permission driven (not role-name driven) so it stays
 * correct for any role/permission combination the database defines:
 *  - admin        : tenant administrator
 *  - hr           : full HR write access (HR manager)
 *  - finance      : finance controller (payroll/payment/expense approvals)
 *  - manager      : approval rights without HR write access
 *  - employee     : self-service only
 */
export function resolveHrDashboardView(
  identity: HrIdentity,
  dataSource: HrDataSource = 'api',
): HrDashboardView {
  if (dataSource !== 'api') return 'admin'
  if (!identity) return 'employee'
  if (identity.isAdmin) return 'admin'

  const hrWrite =
    canDo(identity, 'employee.update', dataSource) ||
    canDo(identity, 'payroll.prepare', dataSource) ||
    canDo(identity, 'settings.write', dataSource) ||
    canDo(identity, 'recruitment.write', dataSource)

  if (hrWrite) return 'hr'

  if (canDo(identity, 'expense.reimburse', dataSource) || canDo(identity, 'payroll.approve', dataSource)) {
    return 'finance'
  }

  if (
    canDo(identity, 'approval.decide', dataSource) ||
    canDo(identity, 'leave.approve', dataSource) ||
    canDo(identity, 'attendance.approve', dataSource)
  ) {
    return 'manager'
  }

  return 'employee'
}

/**
 * Navigation entries of the HR portal.
 *
 * `access` lists every capability that unlocks the module. A module is
 * visible when the caller holds *any* of them, which mirrors the backend:
 * `hr.leave.read` opens the leave register for HR/managers while
 * `hr.leave.create` lets an employee open their own leave requests.
 */
export const HR_NAVIGATION: Array<{ id: string; access: HrCapability[] }> = [
  { id: 'dashboard', access: [] },
  { id: 'employees', access: ['employee.read'] },
  { id: 'attendance', access: ['attendance.read', 'attendance.record', 'attendance.approve'] },
  { id: 'leave', access: ['leave.read', 'leave.apply', 'leave.approve'] },
  { id: 'recruitment', access: ['recruitment.read', 'recruitment.write'] },
  { id: 'onboarding', access: ['onboarding.read', 'onboarding.write'] },
  { id: 'performance', access: ['performance.read', 'performance.write'] },
  { id: 'payroll', access: ['payroll.read', 'payroll.prepare'] },
  { id: 'contracts', access: ['contract.read', 'contract.write'] },
  { id: 'payments', access: ['payment.read', 'payment.create', 'payment.approve'] },
  { id: 'expenses', access: ['expense.read', 'expense.submit', 'expense.approve', 'expense.reimburse'] },
  { id: 'requests', access: ['request.read', 'request.write'] },
  { id: 'offboarding', access: ['offboarding.read', 'offboarding.write'] },
  { id: 'reports', access: ['analytics.read'] },
  { id: 'settings', access: ['settings.write'] },
]

/**
 * Nested HR routes inherit the permission of their parent module.
 * `employees/:id` needs the employee module, `contracts/:id` the contract module.
 */
export const HR_ROUTE_ALIASES: Record<string, string> = {
  'employee-profile': 'employees',
  'contract-detail': 'contracts',
}

/**
 * Which HR modules the caller may open. Demo mode keeps every module
 * visible so the standalone demo workspace is unaffected.
 */
export function visibleHrModules(
  identity: HrIdentity,
  dataSource: HrDataSource = 'api',
): string[] {
  if (dataSource !== 'api') return HR_NAVIGATION.map((item) => item.id)
  if (!identity) return ['dashboard']
  return HR_NAVIGATION.filter((item) => {
    if (item.access.length === 0) return true
    return item.access.some((capability) => canDo(identity, capability, dataSource))
  }).map((item) => item.id)
}

/**
 * Route guard used by both mounted HR layouts. Nested pages (employee detail,
 * contract detail) reuse their parent module id.
 */
export function canAccessHrRoute(
  routeId: string,
  identity: HrIdentity,
  dataSource: HrDataSource = 'api',
): boolean {
  if (dataSource !== 'api') return true
  if (!identity) return false
  if (identity.isAdmin) return true
  const moduleId = HR_ROUTE_ALIASES[routeId] ?? routeId
  const entry = HR_NAVIGATION.find((item) => item.id === moduleId)
  if (!entry) return true
  if (entry.access.length === 0) return true
  return entry.access.some((capability) => canDo(identity, capability, dataSource))
}

/**
 * Self-service modules an employee without broad read access may still open.
 * These map to endpoints that explicitly support the owner (leave, expenses,
 * attendance, requests, own documents).
 */
export function canAccessSelfServiceModule(
  routeId: string,
  identity: HrIdentity,
  dataSource: HrDataSource = 'api',
): boolean {
  if (dataSource !== 'api') return true
  if (!identity) return false
  if (identity.isAdmin) return true
  const selfService: Record<string, HrCapability> = {
    attendance: 'attendance.read',
    leave: 'leave.apply',
    expenses: 'expense.submit',
    requests: 'request.write',
    performance: 'performance.read',
  }
  const capability = selfService[routeId]
  if (!capability) return false
  return canDo(identity, capability, dataSource)
}

// ---------------------------------------------------------------------------
// React binding
// ---------------------------------------------------------------------------

export interface HrAccess {
  identity: HrIdentity
  dataSource: HrDataSource
  /** True once the API identity has been resolved (or demo mode is active). */
  ready: boolean
  view: HrDashboardView
  /** Backend role code exactly as returned by `GET /me` (e.g. `hr_manager`). */
  role: string
  roleName: string
  isAdmin: boolean
  /** Employee id of the signed-in caller (`identity.hrEmployeeId`). */
  employeeId: string | null
  /** True when the API session is gone / identity could not be resolved. */
  unauthenticated: boolean
  can: (capability: HrCapability) => boolean
  canAny: (permissions: readonly string[]) => boolean
  canAll: (permissions: readonly string[]) => boolean
  isSelf: (employeeId?: string | null) => boolean
  canViewSalary: (employeeId?: string | null) => boolean
  canAccess: (routeId: string) => boolean
  visibleModules: string[]
}

/**
 * Bind the verified identity + permission model to the React tree.
 * Pages use this instead of hardcoded role-name comparisons.
 */
export function useHrAccess(): HrAccess {
  const { identity, dataSource, syncStatus } = useStore()

  return useMemo(() => {
    const user = identity?.user ?? null
    const unauthenticated = dataSource === 'api' && syncStatus === 'error' && !identity
    const can = (capability: HrCapability) => canDo(user, capability, dataSource)
    const canAny = (permissions: readonly string[]) => hasAnyHrPermission(user, permissions, dataSource)
    const canAll = (permissions: readonly string[]) => hasAllHrPermissions(user, permissions, dataSource)
    return {
      identity: user,
      dataSource,
      ready: dataSource !== 'api' || !!identity,
      view: resolveHrDashboardView(user, dataSource),
      role: user?.role ?? '',
      roleName: user?.roleName ?? '',
      isAdmin: user?.isAdmin ?? false,
      employeeId: user?.hrEmployeeId ?? null,
      unauthenticated,
      can,
      canAny,
      canAll,
      isSelf: (employeeId?: string | null) => isSelfEmployee(user, employeeId, dataSource),
      canViewSalary: (employeeId?: string | null) => canViewSalary(user, dataSource, employeeId),
      canAccess: (routeId: string) =>
        canAccessHrRoute(routeId, user, dataSource) ||
        canAccessSelfServiceModule(routeId, user, dataSource),
      visibleModules: visibleHrModules(user, dataSource),
    }
  }, [identity, dataSource, syncStatus])
}

/**
 * Human readable reason shown when an action is unavailable, so the UI never
 * presents a dead button without explanation.
 */
export function describeMissingPermission(capability: HrCapability): string {
  const rule = HR_CAPABILITY_PERMISSIONS[capability]
  const codes = rule?.any ?? []
  if (codes.length === 0) return 'This action is not available for your role.'
  return `Your role does not include ${codes.join(' or ')}.`
}
