import {
  BarChart3,
  Calendar,
  CalendarClock,
  ClipboardCheck,
  ClipboardSignature,
  Gauge,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { HRModuleId } from '../types/hr'

export interface HRNavItem {
  id: HRModuleId
  label: string
  icon: LucideIcon
  description: string
}

/** The complete HR Management workspace navigation. */
export const HR_NAVIGATION: HRNavItem[] = [
  {
    id: 'dashboard',
    label: 'My Dashboard',
    icon: Gauge,
    description: 'Workforce snapshot, attendance, recruitment and pending HR actions.',
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: Users,
    description: 'Employee directory, profiles, documents and employment details.',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: Calendar,
    description: 'Daily, weekly and monthly attendance with authorised corrections.',
  },
  {
    id: 'leave',
    label: 'Leave Management',
    icon: CalendarClock,
    description: 'Leave requests, balances, policies, approvals and reviewer remarks.',
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    icon: UserPlus,
    description: 'Job openings, candidates, interviews, feedback and offers.',
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    icon: ClipboardCheck,
    description: 'New joiners, document verification and onboarding progress.',
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: Wallet,
    description: 'Payroll preparation and attendance/leave verification.',
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: TrendingUp,
    description: 'Goals, self-assessments, manager reviews, HR reviews and appraisals.',
  },
  {
    id: 'requests',
    label: 'Employee Requests',
    icon: ClipboardSignature,
    description: 'HR queries, document requests and employee information updates.',
  },
  {
    id: 'offboarding',
    label: 'Offboarding',
    icon: UserMinus,
    description: 'Resignations, notice periods, exit interviews and clearances.',
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: BarChart3,
    description: 'Workforce, attendance, leave, recruitment and payroll preparation reports.',
  },
  {
    id: 'settings',
    label: 'HR Settings',
    icon: Settings,
    description: 'Departments, designations, policies, holidays and review templates.',
  },
]

export const HR_HOME = '/hr/dashboard'

export function hrWorkspacePath(section: string): string {
  return `/hr/${section}`
}

export function getHRNavigationItem(section: string): HRNavItem | undefined {
  return HR_NAVIGATION.find((item) => item.id === section)
}

export function isHRPath(pathname: string): boolean {
  return pathname === '/hr' || pathname.startsWith('/hr/')
}

export const HR_QUICK_ACTIONS: Array<{ id: string; label: string; href: string; icon: LucideIcon }> = [
  { id: 'hr-leave', label: 'Leave approvals', href: '/hr/leave', icon: CalendarClock },
  { id: 'hr-attendance', label: 'Attendance register', href: '/hr/attendance', icon: Calendar },
  { id: 'hr-recruitment', label: 'Recruitment pipeline', href: '/hr/recruitment', icon: UserPlus },
  { id: 'hr-onboarding', label: 'Onboarding checklist', href: '/hr/onboarding', icon: ClipboardCheck },
  { id: 'hr-settings', label: 'HR settings', href: '/hr/settings', icon: Settings },
  { id: 'hr-reports', label: 'People reports', href: '/hr/reports', icon: BarChart3 },
]

export const HR_ROLE_NOTES: Record<string, string> = {
  manager: 'Marketing Manager · full HR administration in this demo',
  senior: 'Senior Executive · people-lead access with payroll masked',
  junior: 'Junior Executive · employee self-service and directory access',
}

export function hrPermissionSummary(roleId: string) {
  const manager = roleId === 'manager'
  const senior = roleId === 'senior'
  return {
    isManager: manager,
    isSenior: senior,
    canManageEmployees: manager,
    canApproveLeave: manager || senior,
    canCorrectAttendance: manager || senior,
    canManageRecruitment: manager || senior,
    canManageOnboarding: manager || senior,
    canPreparePayroll: manager,
    canViewPayrollAmounts: manager,
    canReviewPerformance: true,
    canCompleteHRReview: manager,
    canAssignRequests: manager || senior,
    canManageOffboarding: manager || senior,
    canManageSettings: manager,
    canViewAllEmployees: true,
    isSelfService: !manager && !senior,
    badge: manager
      ? { label: 'HR administrator', tone: 'accent' as const, icon: ShieldCheck }
      : senior
        ? { label: 'People lead', tone: 'info' as const, icon: Users }
        : { label: 'Self service', tone: 'neutral' as const, icon: Users },
  }
}
