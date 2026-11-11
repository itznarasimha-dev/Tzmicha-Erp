/* ============================================================
   Totally ERP — Marketing Department Management System
   Frontend-only demonstration models. No backend contracts.
   ============================================================ */

export type DepartmentRole = 'manager' | 'senior' | 'junior' | 'admin'

export type MarketingPriority = 'Urgent' | 'High' | 'Medium' | 'Low'

export type SectorStatus = 'Active' | 'Paused' | 'Deactivated'

export interface MarketingSector {
  id: string
  name: string
  code: string
  description: string
  objective: string
  leaderId: string | null
  monthlyLeadTarget: number
  monthlyActivityTarget: number
  budget: number
  spent: number
  startDate: string
  endDate: string
  priority: MarketingPriority
  status: SectorStatus
  color: string
  createdAt: string
}

export interface MarketingEmployee {
  id: string
  name: string
  email: string
  phone: string
  role: DepartmentRole
  designation: string
  sectorId: string | null
  seniorId: string | null
  location: string
  joinDate: string
  status: 'Active' | 'Inactive'
  targetLeads: number
  activityStatus: string
  skills: string[]
}

export type MarketingTaskStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Under Review'
  | 'Completed'
  | 'Blocked'

export interface MarketingTaskNote {
  id: string
  at: string
  authorId: string
  authorName: string
  note: string
  kind: 'note' | 'issue' | 'progress' | 'review'
}

export interface TaskAssignmentEvent {
  id: string
  at: string
  assignedById: string
  assignedByName: string
  fromSeniorId: string | null
  fromJuniorId: string | null
  toSeniorId: string | null
  toJuniorId: string | null
  note: string
}

export type ExtensionRequestStatus = 'Pending' | 'Approved' | 'Rejected'

export interface TaskExtensionRequest {
  id: string
  requestedAt: string
  requestedById: string
  requestedByName: string
  reason: string
  originalDeadline: string
  proposedDeadline: string
  status: ExtensionRequestStatus
  decidedAt?: string | null
  decidedById?: string | null
  decidedByName?: string | null
  decisionNote?: string
}

export interface MarketingTask {
  id: string
  title: string
  sectorId: string
  assigneeType: 'sector' | 'senior' | 'junior'
  assignedSeniorId: string | null
  assignedJuniorId: string | null
  createdById: string
  createdByName: string
  category: string
  description: string
  expectedResult: string
  targetQuantity: number
  startDate: string
  deadline: string
  priority: MarketingPriority
  budget: number
  instructions: string
  status: MarketingTaskStatus
  progress: number
  parentId: string | null
  source: 'Manager' | 'Senior'
  notes: MarketingTaskNote[]
  campaignId?: string
  reviewNote?: string
  originalDeadline?: string | null
  assignmentHistory?: TaskAssignmentEvent[]
  extensionRequests?: TaskExtensionRequest[]
  createdAt: string
  updatedAt: string
}

export type LeadStage =
  | 'New Lead'
  | 'Follow-up'
  | 'Qualification'
  | 'Senior Review'
  | 'Manager Review'
  | 'Sent to Sales'
  | 'Sales Follow-up'
  | 'Won'
  | 'Lost'
  | 'Rejected'

export type FollowUpMode = 'Phone Call' | 'WhatsApp' | 'Meeting' | 'Email'

export interface LeadFollowUp {
  id: string
  at: string
  mode: FollowUpMode
  employeeId: string
  employeeName: string
  result: 'Interested' | 'Not Interested' | 'Call Later' | 'No Response' | 'Meeting Scheduled'
  notes: string
  nextActionAt: string | null
}

export interface LeadReview {
  id: string
  at: string
  actorId: string
  actorName: string
  actorRole: string
  action: string
  fromStage: LeadStage
  toStage: LeadStage
  note: string
}

export interface SalesHandoverUpdate {
  id: string
  at: string
  byId: string
  byName: string
  status: SalesHandoverStatus
  progress: number
  note: string
}

export type SalesHandoverStatus = 'Assigned' | 'In Progress' | 'Customer Follow-up' | 'Closed'

export interface SalesHandover {
  id: string
  handoverAt: string
  handoverById: string
  handoverByName: string
  salesRepId: string
  salesRepName: string
  salesManagerId?: string | null
  salesManagerName?: string
  salesStatus?: SalesHandoverStatus
  salesProgress?: number
  lastUpdatedAt?: string | null
  updates?: SalesHandoverUpdate[]
  notes: string
  priority: MarketingPriority
  nextActionDate: string
}

export interface SalesOutcome {
  status: 'Won' | 'Lost'
  value: number
  closedAt: string
  recordedBy: string
  note: string
}

export interface MarketingLead {
  id: string
  name: string
  phone: string
  whatsapp: string
  email: string
  businessName: string
  address: string
  location: string
  product: string
  requirements: string
  source: string
  campaignId: string | null
  expectedValue: number
  customerBudget: number
  priority: MarketingPriority
  sectorId: string
  createdById: string
  assignedSeniorId: string | null
  assignedJuniorId: string | null
  stage: LeadStage
  rejectionReason: string
  createdAt: string
  updatedAt: string
  followUps: LeadFollowUp[]
  reviews: LeadReview[]
  handover: SalesHandover | null
  salesOutcome: SalesOutcome | null
}

export type MarketingFollowUpStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Rescheduled' | 'Missed'

export interface FollowUpExtensionRequest {
  id: string
  kind: 'extension' | 'in-progress'
  requestedAt: string
  requestedById: string
  requestedByName: string
  reason: string
  originalDueAt: string
  proposedDueAt: string | null
  status: ExtensionRequestStatus
  decidedAt?: string | null
  decidedById?: string | null
  decidedByName?: string | null
  decisionNote?: string
}

export interface MarketingFollowUp {
  id: string
  leadId: string
  sectorId: string
  employeeId: string
  dueAt: string
  mode: FollowUpMode
  status: MarketingFollowUpStatus
  result: string
  notes: string
  completedAt: string | null
  createdAt: string
  originalDueAt?: string | null
  inProgressReason?: string
  extensionRequests?: FollowUpExtensionRequest[]
}

export type PlanStatus =
  | 'Draft'
  | 'Pending Manager Review'
  | 'Pending Finance Approval'
  | 'Active'
  | 'Completed'
  | 'Rejected'
  | 'Changes Requested'

export interface MarketingPlan {
  id: string
  title: string
  type: string
  objective: string
  sectorId: string
  seniorId: string | null
  targetAudience: string
  expectedResults: string
  budget: number
  startDate: string
  deadline: string
  priority: MarketingPriority
  status: PlanStatus
  createdById: string
  createdAt: string
  updatedAt: string
  submittedAt?: string | null
  managerReviewedAt?: string | null
  managerReviewerName?: string
  managerRemarks?: string
  financeReviewedAt?: string | null
  financeReviewerName?: string
  financeRemarks?: string
  history?: MarketingTimelineEntry[]
}

export type CampaignStatus = 'Planned' | 'Active' | 'Paused' | 'Completed'

export interface MarketingCampaign {
  id: string
  name: string
  objective: string
  sectorId: string
  targetAudience: string
  startDate: string
  endDate: string
  teamIds: string[]
  budget: number
  expectedLeads: number
  baselineLeads: number
  status: CampaignStatus
  priority: MarketingPriority
  createdById: string
  createdAt: string
  updatedAt: string
}

export type ExpenseStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Senior Review'
  | 'Manager Review'
  | 'Finance Review'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'

export interface MarketingTimelineEntry {
  id: string
  at: string
  actorId: string
  actorName: string
  actorRole: string
  action: string
  note: string
  tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
}

export interface MarketingExpense {
  id: string
  title: string
  amount: number
  category: string
  expenseDate: string
  sectorId: string
  employeeId: string
  employeeName: string
  taskId: string
  taskTitle: string
  description: string
  receiptName: string
  status: ExpenseStatus
  comments: string
  createdAt: string
  updatedAt: string
  timeline: MarketingTimelineEntry[]
}

export type IdeaStatus =
  | 'Under Senior Review'
  | 'Pending Manager Review'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'
  | 'Forwarded to Finance'

export interface MarketingIdea {
  id: string
  title: string
  description: string
  expectedBenefit: string
  sectorId: string
  estimatedBudget: number | null
  supportingDetails: string
  submittedById: string
  submittedByName: string
  submittedByRole: 'junior' | 'senior' | 'manager'
  seniorId: string | null
  status: IdeaStatus
  managerFeedback: string
  seniorFeedback: string
  createdAt: string
  updatedAt: string
  timeline: MarketingTimelineEntry[]
}

export type ApprovalRequestStatus =
  | 'Pending Manager Review'
  | 'Pending Finance Approval'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'
  | 'Returned'

export interface MarketingApprovalRequest {
  id: string
  kind: 'Budget Request' | 'Campaign Proposal' | 'Resource Request' | 'Marketing Proposal'
  title: string
  summary: string
  sectorId: string
  amount: number | null
  submittedById: string
  submittedByName: string
  status: ApprovalRequestStatus
  stage: 'manager' | 'finance' | 'closed'
  createdAt: string
  updatedAt: string
  timeline: MarketingTimelineEntry[]
}

export type ActivityType =
  | 'Customer Visit'
  | 'Phone Call'
  | 'Meeting'
  | 'Field Activity'
  | 'Digital Activity'
  | 'Campaign Participation'
  | 'Lead Collection'
  | 'Follow-up'

export interface MarketingActivity {
  id: string
  employeeId: string
  employeeName: string
  sectorId: string
  type: ActivityType
  title: string
  detail: string
  at: string
  duration: number
  leadsCaptured: number
  status: 'Planned' | 'Completed'
  customerName?: string
  customerPhone?: string
  leadSource?: string
  callOutcome?: string
  followUpAt?: string | null
  assignmentId?: string | null
  leadId?: string | null
  remarks?: string
}

export interface MarketingTeamRequest {
  id: string
  seniorId: string
  seniorName: string
  sectorId: string
  employeeName: string
  employeeEmail: string
  reason: string
  targetLeads: number
  status: ExtensionRequestStatus
  requestedAt: string
  decidedAt?: string | null
  decidedById?: string | null
  decidedByName?: string | null
  decisionNote?: string
  addedEmployeeId?: string | null
  addedAt?: string | null
}

export interface MarketingWalletAllocation {
  id: string
  employeeId: string
  employeeName: string
  month: string
  amount: number
  allocatedById: string
  allocatedByName: string
  createdAt: string
  updatedAt: string
}

export interface MonthlyPerformancePoint {
  month: string
  label: string
  leads: number
  qualified: number
  converted: number
  spend: number
}

export interface SalesRep {
  id: string
  name: string
  region: string
  managerId?: string
  managerName?: string
}

export interface MarketingDepartmentState {
  sectors: MarketingSector[]
  employees: MarketingEmployee[]
  tasks: MarketingTask[]
  plans: MarketingPlan[]
  campaigns: MarketingCampaign[]
  leads: MarketingLead[]
  followUps: MarketingFollowUp[]
  expenses: MarketingExpense[]
  ideas: MarketingIdea[]
  approvalRequests: MarketingApprovalRequest[]
  activities: MarketingActivity[]
  monthly: MonthlyPerformancePoint[]
  teamRequests: MarketingTeamRequest[]
  walletAllocations: MarketingWalletAllocation[]
}

/* -------------------- Drafts -------------------- */

export interface SectorDraft {
  name: string
  description: string
  objective: string
  leaderId: string | null
  juniorIds: string[]
  monthlyLeadTarget: number
  monthlyActivityTarget: number
  budget: number
  startDate: string
  endDate: string
  priority: MarketingPriority
}

export interface TaskDraft {
  title: string
  sectorId: string
  assigneeType: MarketingTask['assigneeType']
  assignedSeniorId: string | null
  assignedJuniorId: string | null
  category: string
  description: string
  expectedResult: string
  targetQuantity: number
  startDate: string
  deadline: string
  priority: MarketingPriority
  budget: number
  instructions: string
  source: 'Manager' | 'Senior'
  parentId?: string | null
  campaignId?: string
}

export interface LeadDraft {
  name: string
  phone: string
  whatsapp: string
  email: string
  businessName: string
  address: string
  location: string
  product: string
  requirements: string
  source: string
  campaignId: string | null
  expectedValue: number
  customerBudget: number
  priority: MarketingPriority
  sectorId: string
  nextFollowUpAt?: string | null
}

export interface ExpenseDraft {
  title: string
  amount: number
  category: string
  expenseDate: string
  taskId: string
  taskTitle: string
  description: string
  receiptName: string
  sectorId: string
}

export interface IdeaDraft {
  title: string
  description: string
  expectedBenefit: string
  sectorId: string
  estimatedBudget: number | null
  supportingDetails: string
}

export interface PlanDraft {
  title: string
  type: string
  objective: string
  sectorId: string
  seniorId: string | null
  targetAudience: string
  expectedResults: string
  budget: number
  startDate: string
  deadline: string
  priority: MarketingPriority
  status: PlanStatus
}

export interface CampaignDraft {
  name: string
  objective: string
  sectorId: string
  targetAudience: string
  startDate: string
  endDate: string
  teamIds: string[]
  budget: number
  expectedLeads: number
  status: CampaignStatus
  priority: MarketingPriority
}

export interface ApprovalRequestDraft {
  kind: MarketingApprovalRequest['kind']
  title: string
  summary: string
  sectorId: string
  amount: number | null
}
