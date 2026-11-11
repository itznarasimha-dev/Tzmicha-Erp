import {
  Activity,
  BadgeCheck,
  BarChart3,
  PieChart,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileBarChart,
  Gauge,
  HandCoins,
  Columns3,
  LayoutGrid,
  Lightbulb,
  LineChart,
  Megaphone,
  ReceiptText,
  Rocket,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRoundCheck,
  Users,
  UsersRound,
  Wallet,
  UserPlus,
  Calendar,
  FileCheck,
  Briefcase,
  GraduationCap,
  ClipboardSignature,
  UserMinus,
  BarChart2,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { DemoRoleId } from '../types/workflow'

export interface RoleNavItem {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

/**
 * Role-specific department navigation.
 * These sections are the only Marketing navigation shown in the sidebar.
 * Legacy marketing modules remain routable for compatibility but are not linked.
 */
export const ROLE_NAVIGATION: Record<DemoRoleId, RoleNavItem[]> = {
  manager: [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge, description: 'Department command centre: pipeline, targets, budget and team delivery.' },
    { id: 'department', label: 'Marketing Department', icon: LayoutGrid, description: 'Create sectors, assign leaders and manage department structure.' },
    { id: 'planning', label: 'Marketing Planning', icon: Compass, description: 'Monthly and sector plans with objectives, budgets and approval status.' },
    { id: 'assignment', label: 'Work Assignment Center', icon: Columns3, description: 'Create, assign and track work across every sector and team.' },
    { id: 'budgets', label: 'Budget Management', icon: Wallet, description: 'Allocate sector budgets, track utilisation and request Finance approval.' },
    { id: 'pipeline', label: 'Lead Pipeline', icon: Target, description: 'One shared pipeline from new lead through senior and manager review.' },
    { id: 'handovers', label: 'Sales Handover', icon: Send, description: 'Qualified marketing leads waiting for or completed sales handover.' },
    { id: 'campaigns', label: 'Campaign Management', icon: Megaphone, description: 'Plan campaigns, monitor delivery and attribute lead outcomes.' },
    { id: 'performance', label: 'Team Performance', icon: UsersRound, description: 'Compare sector, senior and junior delivery against targets.' },
    { id: 'expenses', label: 'Expense Approvals', icon: ReceiptText, description: 'Review team expenses before Finance/Admin final approval.' },
    { id: 'ideas', label: 'Ideas & Recommendations', icon: Lightbulb, description: 'Review team ideas and forward budgeted proposals to Finance.' },
    { id: 'approvals', label: 'Approval Center', icon: BadgeCheck, description: 'Budget, campaign and resource requests awaiting manager action.' },
    { id: 'reports', label: 'Reports', icon: FileBarChart, description: 'Department performance, conversion, campaign and spend reporting.' },
  ],
  senior: [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge, description: 'Your sector, team delivery and approval queue in one view.' },
    { id: 'planning', label: 'Marketing Planning', icon: Compass, description: 'Create sector plans and track manager and Finance approval.' },
    { id: 'sector', label: 'My Sector', icon: BriefcaseBusiness, description: 'Live sector targets, budget, leads and campaign execution.' },
    { id: 'team', label: 'Team Management', icon: Users, description: 'Manage your junior team, workload and daily availability.' },
    { id: 'assignment', label: 'Work Assignment', icon: Columns3, description: 'Split manager work into clear junior assignments.' },
    { id: 'tasks', label: 'My Tasks', icon: ClipboardList, description: 'Manager assignments, your own work and junior review.' },
    { id: 'lead-generation', label: 'Lead Generation', icon: Target, description: 'Capture leads and monitor sector lead quality.' },
    { id: 'pipeline', label: 'Lead Pipeline', icon: LineChart, description: 'Validate qualification and recommend leads to the manager.' },
    { id: 'follow-ups', label: 'Follow-ups', icon: CalendarClock, description: 'Sector follow-up schedule and conversion conversations.' },
    { id: 'campaigns', label: 'Campaign Activities', icon: Rocket, description: 'Execute live campaigns and log sector activity.' },
    { id: 'performance', label: 'Team Performance', icon: TrendingUp, description: 'Junior scorecards, target progress and coaching needs.' },
    { id: 'expenses', label: 'Expense Review', icon: ReceiptText, description: 'Review junior claims and forward them to the manager.' },
    { id: 'ideas', label: 'Ideas & Recommendations', icon: Lightbulb, description: 'Submit recommendations and review junior ideas.' },
  ],
  junior: [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge, description: "Today's priorities, targets and quick actions." },
    { id: 'planning', label: 'Marketing Planning', icon: Compass, description: 'Create activity plans and track manager and Finance approval.' },
    { id: 'tasks', label: 'My Tasks', icon: ClipboardCheck, description: 'Execute assigned work and update progress.' },
    { id: 'lead-generation', label: 'Lead Generation', icon: Target, description: 'Capture new leads, requirements and the first follow-up.' },
    { id: 'follow-ups', label: 'Follow-ups', icon: CalendarClock, description: 'Every scheduled customer conversation and next action.' },
    { id: 'pipeline', label: 'Lead Pipeline', icon: Columns3, description: 'Track your leads through qualification and review.' },
    { id: 'activities', label: 'Daily Activities', icon: Activity, description: 'Log field, digital and customer activity.' },
    { id: 'campaigns', label: 'Campaign Activities', icon: Rocket, description: 'Your campaign assignments and participation.' },
    { id: 'expenses', label: 'Submit Expenses', icon: ReceiptText, description: 'Raise claims and track approval progress.' },
    { id: 'ideas', label: 'Submit Ideas', icon: Lightbulb, description: 'Share opportunities with your senior and manager.' },
    { id: 'performance', label: 'My Performance', icon: UserRoundCheck, description: 'Your target progress, lead quality and delivery trends.' },
  ],
  hr: [
    { id: 'dashboard', label: 'My Dashboard', icon: Gauge, description: 'HR overview of workforce operations.' },
    { id: 'employees', label: 'Employees', icon: Users, description: 'Employee directory and profiles.' },
    { id: 'attendance', label: 'Attendance', icon: Calendar, description: 'Attendance management and corrections.' },
    { id: 'leave', label: 'Leave Management', icon: CalendarClock, description: 'Leave requests, balances, policies, approvals.' },
    { id: 'recruitment', label: 'Recruitment', icon: UserPlus, description: 'Job openings, candidates, pipeline.' },
    { id: 'onboarding', label: 'Onboarding', icon: GraduationCap, description: 'New joiners and onboarding checklist.' },
    { id: 'payroll', label: 'Payroll', icon: Wallet, description: 'Payroll preparation and coordination.' },
    { id: 'performance', label: 'Performance', icon: TrendingUp, description: 'Goals, reviews, appraisals.' },
    { id: 'requests', label: 'Employee Requests', icon: ClipboardSignature, description: 'HR service requests.' },
    { id: 'offboarding', label: 'Offboarding', icon: UserMinus, description: 'Resignations, exits, clearance.' },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart2, description: 'HR reports and analytics.' },
    { id: 'settings', label: 'HR Settings', icon: Settings, description: 'HR configuration and policies.' },
  ],
  finance: [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge, description: 'Finance overview.' },
    { id: 'payroll', label: 'Payroll', icon: Wallet, description: 'Process salaries and approvals.' },
    { id: 'approvals', label: 'Approvals', icon: BadgeCheck, description: 'Financial approvals.' },
    { id: 'reports', label: 'Reports', icon: FileBarChart, description: 'Financial reports.' },
  ],
  employee: [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge, description: 'My personal dashboard.' },
    { id: 'profile', label: 'My Profile', icon: UserRoundCheck, description: 'Personal and employment details.' },
    { id: 'attendance', label: 'My Attendance', icon: Calendar, description: 'Check-in/out and history.' },
    { id: 'leave', label: 'My Leave', icon: CalendarClock, description: 'Leave requests and balances.' },
    { id: 'requests', label: 'My Requests', icon: ClipboardSignature, description: 'HR service requests.' },
  ],
}

export function getRoleNavigation(roleId: DemoRoleId): RoleNavItem[] {
  return ROLE_NAVIGATION[roleId] ?? ROLE_NAVIGATION.junior
}

export function getRoleDefaultSection(roleId: DemoRoleId): string {
  return getRoleNavigation(roleId)[0]?.id ?? 'dashboard'
}

export function roleWorkspacePath(section: string): string {
  return `/marketing/workspace/${section}`
}

export function roleWorkspaceHome(roleId: DemoRoleId): string {
  return roleWorkspacePath(getRoleDefaultSection(roleId))
}

export const ROLE_ACCENT: Record<DemoRoleId, { accent: string; accent2: string; label: string; eyebrow: string }> = {
  manager: {
    accent: 'var(--chart-1)',
    accent2: 'var(--chart-3)',
    label: 'Marketing Command Center',
    eyebrow: 'Manager workspace',
  },
  senior: {
    accent: 'var(--chart-2)',
    accent2: 'var(--chart-5)',
    label: 'Team Execution Hub',
    eyebrow: 'Senior executive workspace',
  },
  junior: {
    accent: 'var(--chart-6)',
    accent2: 'var(--chart-7)',
    label: 'My Marketing Workspace',
    eyebrow: 'Junior executive workspace',
  },
  hr: {
    accent: 'var(--chart-1)',
    accent2: 'var(--chart-4)',
    label: 'HR Management System',
    eyebrow: 'HR workspace',
  },
  finance: {
    accent: 'var(--chart-3)',
    accent2: 'var(--chart-2)',
    label: 'Finance Workspace',
    eyebrow: 'Finance workspace',
  },
  employee: {
    accent: 'var(--chart-5)',
    accent2: 'var(--chart-6)',
    label: 'Employee Self Service',
    eyebrow: 'Employee workspace',
  },
}

/** Section shortcuts used by the topbar quick-action menu. */
export const ROLE_QUICK_ACTIONS: Record<DemoRoleId, Array<{ id: string; label: string; href: string; icon: LucideIcon }>> = {
  manager: [
    { id: 'new-lead', label: 'Open lead pipeline', href: '/marketing/workspace/pipeline', icon: Target },
    { id: 'new-task', label: 'Assign work', href: '/marketing/workspace/assignment', icon: ClipboardList },
    { id: 'new-plan', label: 'Marketing planning', href: '/marketing/workspace/planning', icon: Compass },
    { id: 'review-expenses', label: 'Expense approvals', href: '/marketing/workspace/expenses', icon: ReceiptText },
    { id: 'approval-inbox', label: 'Approval center', href: '/marketing/workspace/approvals', icon: BadgeCheck },
  ],
  senior: [
    { id: 'new-lead', label: 'Capture lead', href: '/marketing/workspace/lead-generation', icon: Target },
    { id: 'assign-work', label: 'Assign junior work', href: '/marketing/workspace/assignment', icon: ClipboardList },
    { id: 'follow-ups', label: "Today’s follow-ups", href: '/marketing/workspace/follow-ups', icon: CalendarClock },
    { id: 'review-expenses', label: 'Review expenses', href: '/marketing/workspace/expenses', icon: ReceiptText },
    { id: 'team', label: 'Team management', href: '/marketing/workspace/team', icon: Users },
  ],
  junior: [
    { id: 'new-lead', label: 'Capture new lead', href: '/marketing/workspace/lead-generation', icon: Target },
    { id: 'my-tasks', label: 'My tasks', href: '/marketing/workspace/tasks', icon: ClipboardCheck },
    { id: 'follow-ups', label: "Today’s follow-ups", href: '/marketing/workspace/follow-ups', icon: CalendarClock },
    { id: 'log-activity', label: 'Log activity', href: '/marketing/workspace/activities', icon: Activity },
    { id: 'submit-expense', label: 'Submit expense', href: '/marketing/workspace/expenses', icon: ReceiptText },
  ],
  hr: [
    { id: 'add-employee', label: 'Add Employee', href: '/marketing/workspace/employees', icon: UserPlus },
    { id: 'leave-approvals', label: 'Leave Approvals', href: '/marketing/workspace/leave', icon: CalendarClock },
    { id: 'recruitment', label: 'Recruitment', href: '/marketing/workspace/recruitment', icon: UserPlus },
    { id: 'onboarding', label: 'Onboarding', href: '/marketing/workspace/onboarding', icon: GraduationCap },
    { id: 'reports', label: 'Reports', href: '/marketing/workspace/reports', icon: BarChart2 },
  ],
  finance: [
    { id: 'payroll', label: 'Payroll', href: '/marketing/workspace/payroll', icon: Wallet },
    { id: 'approvals', label: 'Approvals', href: '/marketing/workspace/approvals', icon: BadgeCheck },
    { id: 'reports', label: 'Reports', href: '/marketing/workspace/reports', icon: FileBarChart },
  ],
  employee: [
    { id: 'my-attendance', label: 'My Attendance', href: '/marketing/workspace/attendance', icon: Calendar },
    { id: 'request-leave', label: 'Request Leave', href: '/marketing/workspace/leave', icon: CalendarClock },
    { id: 'my-requests', label: 'My Requests', href: '/marketing/workspace/requests', icon: ClipboardSignature },
  ],
}

/**
 * Legacy utility links are kept for external imports but no longer shown in
 * the primary sidebar. New navigation lives in ROLE_NAVIGATION above.
 */
export const ROLE_UTILITY_LINKS: Array<{ id: string; label: string; icon: LucideIcon; href: string }> = [
  { id: 'pipeline', label: 'Lead Pipeline', icon: HandCoins, href: '/marketing/workspace/pipeline' },
  { id: 'campaigns', label: 'Campaign Activities', icon: Megaphone, href: '/marketing/workspace/campaigns' },
  { id: 'expense-records', label: 'Expenses', icon: ReceiptText, href: '/marketing/workspace/expenses' },
  { id: 'approval-inbox', label: 'Approval Center', icon: BadgeCheck, href: '/marketing/workspace/approvals' },
]

export const ROLE_EXTRA_LINKS: Array<{ id: string; label: string; icon: LucideIcon; href: string }> = [
  { id: 'plan-calendar', label: 'Marketing Planning', icon: Compass, href: '/marketing/workspace/planning' },
  { id: 'reporting', label: 'Reports', icon: BarChart3, href: '/marketing/workspace/reports' },
  { id: 'spend-analytics', label: 'Budget Management', icon: Wallet, href: '/marketing/workspace/budgets' },
  { id: 'performance', label: 'Team Performance', icon: PieChart, href: '/marketing/workspace/performance' },
  { id: 'send', label: 'Sales Handover', icon: Send, href: '/marketing/workspace/handovers' },
  { id: 'compliance', label: 'Approvals', icon: ShieldCheck, href: '/marketing/workspace/approvals' },
]
