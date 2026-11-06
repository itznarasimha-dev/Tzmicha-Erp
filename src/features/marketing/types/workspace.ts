/* ============================================================
   Totally ERP — Role workspace demonstration models
   Frontend-only. No backend contracts or real approvals.
   ============================================================ */

import type { DemoRoleId } from './workflow'

export type WorkspaceRole = DemoRoleId

export type WorkspaceTaskStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Under Review'
  | 'Completed'
  | 'Blocked'
  | 'Overdue'

export type WorkspacePriority = 'Urgent' | 'High' | 'Medium' | 'Low'

export interface WorkspaceTask {
  id: string
  title: string
  description: string
  assignedToId: string
  assignedToName: string
  assignedById: string
  assignedByName: string
  priority: WorkspacePriority
  status: WorkspaceTaskStatus
  deadline: string
  expectedResult: string
  instructions: string
  progress: number
  category: string
  campaignId?: string
  createdAt: string
  updatedAt: string
  reviewNote?: string
  managerTask?: boolean
}

export type IdeaStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Senior Review'
  | 'Pending Manager Review'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'
  | 'Forwarded to Finance'

export interface WorkspaceIdea {
  id: string
  title: string
  description: string
  expectedBenefits: string
  estimatedBudget: number | null
  supportingInfo: string
  submittedById: string
  submittedByName: string
  submittedByRole: 'junior' | 'senior' | 'manager'
  seniorId: string | null
  status: IdeaStatus
  managerFeedback: string
  seniorFeedback: string
  createdAt: string
  updatedAt: string
  timeline: WorkspaceTimelineEntry[]
}

export type ExpenseStageStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Senior Review'
  | 'Manager Review'
  | 'Finance Review'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'

export interface WorkspaceExpense {
  id: string
  title: string
  amount: number
  category: string
  expenseDate: string
  taskId: string
  taskTitle: string
  description: string
  receiptName: string
  submittedById: string
  submittedByName: string
  seniorId: string | null
  status: ExpenseStageStatus
  comments: string
  createdAt: string
  updatedAt: string
  timeline: WorkspaceTimelineEntry[]
}

export type ApprovalStage = 'junior' | 'senior' | 'manager' | 'finance'

export type ApprovalStatus =
  | 'Draft'
  | 'Pending Senior Review'
  | 'Pending Manager Review'
  | 'Pending Finance Approval'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'

export type ApprovalKind =
  | 'Idea'
  | 'Expense'
  | 'Campaign Proposal'
  | 'Lead Generation Proposal'
  | 'Budget Request'
  | 'Senior Recommendation'

export interface WorkspaceApproval {
  id: string
  kind: ApprovalKind
  title: string
  summary: string
  submittedById: string
  submittedByName: string
  submittedByLabel: string
  amount: number | null
  status: ApprovalStatus
  currentStage: ApprovalStage
  createdAt: string
  updatedAt: string
  timeline: WorkspaceTimelineEntry[]
  relatedIdeaId?: string
  relatedExpenseId?: string
}

export type PlanStatus = 'Draft' | 'In Review' | 'Approved' | 'Active' | 'Completed'

export interface WorkspacePlan {
  id: string
  title: string
  month: string
  objective: string
  targetAudience: string
  locations: string
  digitalActivities: string
  offlineActivities: string
  campaignGoals: string
  expectedLeads: number
  expectedConversionRate: number
  totalBudget: number
  digitalBudget: number
  offlineBudget: number
  leadGenBudget: number
  status: PlanStatus
  owner: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceTimelineEntry {
  id: string
  at: string
  actor: string
  role: string
  action: string
  note?: string
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
}

export type WorkspaceActivityType =
  | 'Customer Visit'
  | 'Phone Call'
  | 'Follow-up'
  | 'Field Marketing'
  | 'Campaign Participation'
  | 'Digital Marketing'
  | 'Lead Collection'

export interface WorkspaceActivity {
  id: string
  type: WorkspaceActivityType
  title: string
  detail: string
  at: string
  duration: number
  employeeId: string
  employeeName: string
  leadsCaptured: number
  status: 'Planned' | 'Completed'
}

export type WorkspaceLeadStatus = 'New Lead' | 'Follow-up' | 'Qualified' | 'Rejected'

export interface WorkspaceLead {
  id: string
  name: string
  company: string
  phone: string
  email: string
  requirement: string
  source: string
  location: string
  followUpAt: string
  status: WorkspaceLeadStatus
  ownerId: string
  ownerName: string
  createdAt: string
  updatedAt: string
  notes: string
}

export interface WorkspaceEmployee {
  employeeId: string
  name: string
  email: string
  roleId: 'manager' | 'senior' | 'junior' | 'admin'
  roleLabel: string
  initials: string
  location: string
  seniorId: string | null
  targetLeads: number
}

export interface EmployeePerformance {
  employeeId: string
  name: string
  roleId: 'senior' | 'junior'
  roleLabel: string
  initials: string
  seniorId: string | null
  location: string
  targetLeads: number
  leadsGenerated: number
  qualifiedLeads: number
  conversions: number
  followUps: number
  campaignParticipation: number
  expenseSubmitted: number
  monthlyTrend: number[]
}

export interface BudgetLine {
  id: string
  label: string
  budget: number
  spent: number
  tone: string
}

export interface MonthlyBudgetPoint {
  month: string
  budget: number
  spent: number
  leads: number
}

export interface WorkspaceMetricSeries {
  label: string
  value: number
  color: string
}

export interface WorkspaceTaskDraft {
  title: string
  description: string
  assignedToId: string
  assignedByName: string
  assignedById: string
  priority: WorkspacePriority
  deadline: string
  expectedResult: string
  instructions: string
  category: string
  managerTask?: boolean
}

export interface WorkspaceIdeaDraft {
  title: string
  description: string
  expectedBenefits: string
  estimatedBudget: number | null
  supportingInfo: string
  submittedById: string
  submittedByName: string
  submittedByRole: 'junior' | 'senior'
  seniorId: string | null
}

export interface WorkspaceExpenseDraft {
  title: string
  amount: number
  category: string
  expenseDate: string
  taskId: string
  taskTitle: string
  description: string
  receiptName: string
  submittedById: string
  submittedByName: string
  seniorId: string | null
}

export interface WorkspaceLeadDraft {
  name: string
  company: string
  phone: string
  email: string
  requirement: string
  source: string
  location: string
  followUpAt: string
  ownerId: string
  ownerName: string
  notes: string
}

export interface WorkspacePlanDraft {
  title: string
  month: string
  objective: string
  targetAudience: string
  locations: string
  digitalActivities: string
  offlineActivities: string
  campaignGoals: string
  expectedLeads: number
  expectedConversionRate: number
  totalBudget: number
  digitalBudget: number
  offlineBudget: number
  leadGenBudget: number
}
