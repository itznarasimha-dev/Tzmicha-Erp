/* ============================================================
   Totally ERP — Marketing role-based workflow types
   Frontend-only demo models. No backend contracts.
   ============================================================ */

import type { ExpenseCategory } from './marketing'

/**
 * Totally ERP preview roles include Marketing roles and HR.
 * Finance/Admin roles may exist in the broader ERP but are represented
 * here with appropriate scope/permissions.
 */
export type DemoRoleId = 'junior' | 'senior' | 'manager' | 'hr' | 'finance' | 'employee'

export interface DemoRoleProfile {
  id: DemoRoleId
  employeeId: string
  name: string
  email: string
  roleLabel: string
  shortLabel: string
  initials: string
  department: string
  scope: string
  isHR?: boolean
  isFinance?: boolean
  isManager?: boolean
}

/** Shared demo employee directory used by team, lead and approval views. */
export interface MarketingEmployee {
  employeeId: string
  name: string
  email: string
  roleId: DemoRoleId | 'admin'
  roleLabel: string
  initials: string
  department: string
  location: string
  monthlyLeadTarget: number
  seniorReviewerId: string | null
}

export const MARKETING_ACTIVITY_TYPES = [
  'Digital Marketing',
  'Field Marketing',
  'Trade Marketing',
  'Campaigns and Offers',
  'Customer Engagement',
  'Lead Generation',
  'Other Marketing Activities',
] as const

export type MarketingActivityType = (typeof MARKETING_ACTIVITY_TYPES)[number]

export type PlanWorkflowStatus =
  | 'Draft'
  | 'Pending Senior Review'
  | 'Pending Manager Approval'
  | 'Pending Admin Financial Authorization'
  | 'Changes Requested'
  | 'Rejected'
  | 'Approved — Ready to Execute'
  | 'In Progress'
  | 'Submitted for Results Review'
  | 'Completed'

export type WorkflowStageKey =
  | 'submission'
  | 'senior'
  | 'manager'
  | 'admin'
  | 'execution'
  | 'results'
  | 'completed'

/**
 * Shape kept ready for a future Admin Dashboard integration. The Marketing
 * Portal only reads and displays this state; it never performs the decision
 * except through an explicitly labelled local demo simulator.
 */
export type AdminAuthorizationStatus = 'Not required' | 'Pending' | 'Authorized' | 'Rejected'

export interface AdminAuthorizationState {
  required: boolean
  status: AdminAuthorizationStatus
  requestedAt: string | null
  decidedAt: string | null
  decidedBy: string | null
  comments: string
  /** True when the outcome came from the local demo simulator, not a real Admin app. */
  simulated: boolean
}

export type WorkflowDecision =
  | 'Submitted'
  | 'Approved'
  | 'Changes Requested'
  | 'Rejected'
  | 'Started'
  | 'Progress Updated'
  | 'Results Submitted'
  | 'Revision Requested'
  | 'Completed'

export interface WorkflowApprovalEntry {
  id: string
  stage: WorkflowStageKey
  action: string
  byRoleId: DemoRoleId | 'employee' | 'admin-demo'
  byName: string
  at: string
  decision: WorkflowDecision
  comments?: string
}

export interface PlanActivity {
  id: string
  type: MarketingActivityType
  name: string
  objective: string
  targetAudience: string
  plannedActivities: string
  expectedLeads: number
  expectedConversions: number
  monthlyTarget: number
  estimatedBudget: number
  expectedOutcome: string
  startDate: string
  endDate: string
  supportingNotes: string
  completedActivities?: number
  actualLeads?: number
  qualifiedLeads?: number
  completedFieldVisits?: number
  tradePartnerVisits?: number
  actualSpending?: number
  executionPercent?: number
  results?: string
}

export interface PlanExecution {
  startedAt: string | null
  completedActivities: number
  actualLeads: number
  qualifiedLeads: number
  completedFieldVisits: number
  tradePartnerVisits: number
  actualSpending: number
  executionPercent: number
  results: string
  remarks: string
  updatedAt: string | null
}

export interface MonthlyPlan {
  id: string
  title: string
  /** YYYY-MM */
  month: string
  employeeId: string
  employeeName: string
  employeeRole: string
  roleId: 'junior' | 'senior'
  seniorReviewerId: string | null
  objective: string
  targetAudience: string
  plannedActivities: string
  expectedLeads: number
  expectedConversions: number
  monthlyTarget: number
  estimatedBudget: number
  requestedAmount: number
  expectedOutcome: string
  startDate: string
  endDate: string
  supportingNotes: string
  activities: PlanActivity[]
  status: PlanWorkflowStatus
  financeRequired: boolean
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  revisionReason?: string
  currentApprover: string | null
  previousApprover: string | null
  approvals: WorkflowApprovalEntry[]
  execution: PlanExecution
  adminAuthorization?: AdminAuthorizationState
  resultsSubmittedAt?: string | null
  completedAt?: string | null
}

export type ExpenseWorkflowStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Manager Review'
  | 'Pending Admin Financial Authorization'
  | 'Changes Requested'
  | 'Approved'
  | 'Rejected'

export interface MarketingExpenseRequest {
  id: string
  title: string
  planId: string
  planTitle: string
  activityId: string | null
  activityName: string
  activityType: MarketingActivityType | ''
  employeeId: string
  employeeName: string
  roleId: 'junior' | 'senior'
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description: string
  documentName: string
  submittedAt: string | null
  status: ExpenseWorkflowStatus
  managerRequired: boolean
  reviewerComments: string
  currentApprover: string | null
  approvals: WorkflowApprovalEntry[]
  adminAuthorization?: AdminAuthorizationState
}

export interface WorkflowConfig {
  /** Plans at or above this estimated budget need Finance/Admin authorization. */
  financeThreshold: number
  /** Expenses at or above this amount need a Manager decision before Finance. */
  expenseManagerThreshold: number
  managerId: string
  financeId: string
  seniorId: string
  /** Junior employee id -> assigned senior reviewer id, or null for direct-to-manager routing. */
  reviewersByEmployee: Record<string, string | null>
}

/** Form payload used when a marketing employee creates or edits a monthly plan. */
export interface MonthlyPlanDraft {
  title: string
  month: string
  objective: string
  targetAudience: string
  plannedActivities: string
  expectedLeads: number
  expectedConversions: number
  monthlyTarget: number
  estimatedBudget: number
  requestedAmount: number
  expectedOutcome: string
  startDate: string
  endDate: string
  supportingNotes: string
  seniorReviewerId?: string | null
  activities: PlanActivity[]
}

/** Form payload used when an employee raises a plan-linked expense. */
export interface MarketingExpenseDraft {
  title: string
  planId: string
  activityId: string | null
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description: string
  documentName: string
}

export interface RoleWorkflowMetrics {
  totalPlans: number
  pendingSenior: number
  pendingManager: number
  pendingAdmin: number
  inProgress: number
  completed: number
  changesRequested: number
  rejected: number
  plannedBudget: number
  managerApprovedBudget: number
  authorizedBudget: number
  approvedBudget: number
  actualSpending: number
  targetLeads: number
  actualLeads: number
  qualifiedLeads: number
  rejectedLeads: number
  pendingExpenses: number
  approvedExpenses: number
  rejectedExpenses: number
  approvedExpenseAmount: number
  pendingExpenseAmount: number
}
