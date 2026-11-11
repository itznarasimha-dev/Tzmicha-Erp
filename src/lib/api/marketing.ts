/**
 * Marketing API endpoint wrappers.
 *
 * Paths and payload shapes mirror `server/src/routes/marketing/*`. Status
 * values are the canonical database values. `api-sync.ts` translates the one
 * legacy label ("Approved — Ready to Execute") before it reaches the demo
 * context.
 */

import {
  createIdempotencyKey,
  del,
  fetchAllPages,
  get,
  getPaginated,
  patch,
  post,
  type PaginatedResponse,
  type QueryParams,
} from './client'

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up Required'
  | 'Qualified'
  | 'Sent to Sales'
  | 'Converted'
  | 'Rejected'
  | 'Not Interested'
  | 'Lost'

export type LeadPriority = 'Urgent' | 'High' | 'Medium' | 'Low'

export type LeadSourceCategory =
  | 'Digital Marketing'
  | 'Field Marketing'
  | 'Trade Marketing'
  | 'Campaign'
  | 'Website'
  | 'Referral'
  | 'Other'

export type PlanStatus =
  | 'Draft'
  | 'Pending Senior Review'
  | 'Pending Manager Approval'
  | 'Pending Admin Financial Authorization'
  | 'Changes Requested'
  | 'Rejected'
  | 'Approved'
  | 'In Progress'
  | 'Submitted for Results Review'
  | 'Completed'

export type ExpenseStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Manager Review'
  | 'Pending Admin Financial Authorization'
  | 'Changes Requested'
  | 'Approved'
  | 'Rejected'
  | 'Paid'
  | 'Reimbursed'

export type CampaignStatus = 'Draft' | 'Planned' | 'Active' | 'Paused' | 'Completed' | 'Archived'
export type CampaignChannel = 'Digital' | 'Social' | 'Email' | 'Field' | 'Trade' | 'Events' | 'Influencer' | 'Retail' | 'Content'
export type OfferStatus = 'Draft' | 'Pending Approval' | 'Active' | 'Paused' | 'Expired' | 'Rejected'
export type OfferType = 'Discount' | 'Bundle' | 'Cashback' | 'Freebie' | 'Scheme' | 'Other'
export type DiscountStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Expired'
export type VisitStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'
export type VisitType = 'Field Visit' | 'Store Visit' | 'Demo' | 'Dealer Visit'
export type SurveyInterest = 'High' | 'Medium' | 'Low'
export type DealerStage = 'Prospect' | 'Contacted' | 'Interested' | 'Onboarding' | 'Onboarded' | 'Rejected'
export type TargetMetric = 'leads' | 'qualified_leads' | 'conversions' | 'revenue' | 'visits' | 'campaigns'

export interface ApiLead {
  id: string
  code: string
  name: string
  company: string
  phone: string
  whatsapp: string
  email: string
  location: string
  city: string
  state: string
  country: string
  address: string
  industry: string
  customerType: string
  jobTitle: string
  sourceId: string | null
  source: string
  sourceName: string
  sourceCategory: string
  sourceDetail: string
  marketingActivity: string
  campaignId: string | null
  campaignName: string
  productId: string | null
  product: string
  assignedTo: string
  assignedToName: string
  generatedBy: string
  generatedByName: string
  status: LeadStatus
  priority: LeadPriority
  nextFollowUp: string | null
  lastContact: string
  nextAction: string
  notes: string
  solutionsDiscussed: string
  informationShared: string
  interests: Record<string, unknown>
  qualification: Record<string, unknown>
  attribution: Record<string, unknown>
  converted: boolean
  customerId?: string
  lostReason: string
  createdBy: string
  createdAt: string
  updatedAt: string
  activities: ApiLeadActivity[]
  followUps: ApiFollowUp[]
  assignment?: ApiLeadAssignment | null
  rejection?: ApiLeadRejection | null
  conversion?: ApiLeadConversion | null
}

export interface ApiLeadActivity {
  id: string
  leadId: string
  type: string
  at: string
  by: string
  byId: string | null
  summary: string
}

export interface ApiFollowUp {
  id: string
  leadId: string
  dueAt: string
  method: 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Visit' | 'Other'
  reason: string
  reminder: string
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  createdAt: string
  createdBy: string
  completedAt?: string
  outcome?: string
  latestResponse?: string
  newRequirements?: string
  concerns?: string
  updatedBudget: number | null
  purchaseReadiness?: string
  agreedNextSteps?: string
}

export interface ApiLeadAssignment {
  handoverId: string
  leadId: string
  salesRepId: string
  salesRepName: string
  salesManagerId: string | null
  assignedAt: string
  assignedBy: string | null
  expectedFirstContact: string | null
  firstContactAt: string | null
  handoffNote: string
  salesStatus: string
  dealStatus?: string
  lastContact: string | null
  nextAction: string
  nextFollowUp: string | null
  requirementSummary: string
  communicationStatus: string
  reassignmentRequired: boolean
  handoverHistory: unknown[]
  contactAttempts: unknown[]
  reassignments: unknown[]
  supervisoryNotes: unknown[]
  customerNotifications: unknown[]
  notifications: unknown[]
  isCurrent: boolean
}

export interface ApiLeadRejection {
  id: string
  reason: string
  notes: string
  rejectedAt: string
  rejectedBy: string
  rejectedByName: string
  previousStatus: LeadStatus
}

export interface ApiLeadConversion {
  id?: string
  convertedAt?: string
  convertedBy?: string
  customerId: string
  opportunityId?: string
  outcome?: string
}

export interface ApiCustomer {
  id: string
  code: string
  name: string
  company: string
  phone: string
  email: string
  location: string
  industry: string
  source: string
  campaignId: string | null
  product: string
  leadId: string
  salesRepId: string
  status: string
  notes: string
  createdAt: string
}

export interface ApiCampaign {
  id: string
  code: string
  name: string
  objective: string
  channel: CampaignChannel
  audience: string
  productId: string | null
  product: string
  startDate: string
  endDate: string
  budget: number
  spend: number
  status: CampaignStatus
  ownerUserId: string | null
  owner: string
  kpis: Record<string, unknown>
  leads: number
  qualifiedLeads: number
  conversions: number
  convertedValue: number
  roiPercent: number | null
  createdAt: string
  updatedAt: string
}

export interface ApiOffer {
  id: string
  code: string
  campaignId: string | null
  campaignName: string
  title: string
  description: string
  offerType: OfferType
  discountPercent: number | null
  discountAmount: number | null
  productId: string | null
  validFrom: string
  validTo: string
  status: OfferStatus
  createdBy: string | null
  createdAt: string
}

export interface ApiDiscount {
  id: string
  code: string
  offerId: string | null
  customerId: string | null
  customerName: string
  salesOrderId: string | null
  requestedBy: string | null
  requestedByName: string
  requestedPercent: number
  approvedPercent: number | null
  status: DiscountStatus
  reason: string
  decidedAt: string | null
  decidedBy: string | null
  decidedByName: string
  createdAt: string
}

export interface ApiPlanActivity {
  id: string
  planId: string
  type: string
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
  completedActivities: number
  actualLeads: number
  qualifiedLeads: number
  completedFieldVisits: number
  tradePartnerVisits: number
  actualSpending: number
  executionPercent: number
  results: string
}

export interface ApiPlanApproval {
  id: string
  stage: string
  action: string
  byRoleId: string
  byName: string
  at: string
  decision: string
  comments: string
}

export interface ApiPlan {
  id: string
  code: string
  title: string
  month: string
  employeeId: string
  employeeName: string
  employeeRole: string
  roleId: string
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
  status: PlanStatus
  financeRequired: boolean
  revisionReason: string
  currentApprover: string | null
  previousApprover: string | null
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  resultsSubmittedAt: string | null
  completedAt: string | null
  activities: ApiPlanActivity[]
  approvals: ApiPlanApproval[]
  execution: {
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
}

export interface ApiMarketingExpense {
  id: string
  code: string
  source: 'campaign' | 'monthly_plan' | 'field_claim' | 'other'
  title: string
  planId: string
  planTitle: string
  activityId: string | null
  activityName: string
  activityType: string
  campaignId: string | null
  campaignName: string
  employeeId: string
  employeeName: string
  roleId: string
  category: string
  vendorName: string
  amount: number
  currency: string
  expenseDate: string
  description: string
  documentPath: string
  status: ExpenseStatus
  managerRequired: boolean
  financeRequired: boolean
  submittedAt: string | null
  reviewerComments: string
  currentApprover: string | null
  decidedAt: string | null
  approvals: Array<Record<string, unknown>>
}

export interface ApiTarget {
  id: string
  userId: string
  userName: string
  periodStart: string
  periodEnd: string
  metric: TargetMetric
  targetValue: number
  achievedValue: number
  unit: string
  notes: string
  planId: string | null
  createdAt: string
}

export interface ApiRewardWallet {
  id: string
  employeeId: string
  employeeName: string
  currency: string
  balance: number
  totalAwarded: number
  totalRedeemed: number
  lastTransactionAt: string | null
}

export interface ApiRewardTransaction {
  id: string
  walletId: string
  employeeId: string
  entryType: string
  amount: number
  balanceAfter: number
  referenceType: string
  referenceId: string | null
  note: string
  createdBy: string | null
  createdByName: string
  createdAt: string
}

export interface ApiFieldVisit {
  id: string
  code: string
  business: string
  contact: string
  contactPhone: string
  leadId: string | null
  customerId: string | null
  purpose: string
  type: VisitType
  date: string
  time: string
  location: string
  checkInAt: string | null
  checkOutAt: string | null
  assignedTo: string
  assignedToName: string
  notes: string
  demoFollowUp: string
  checklist: string[]
  outcome: string
  competitorBrands: string
  samplesDispensed: string
  status: VisitStatus
  createdAt: string
}

export interface ApiSurvey {
  id: string
  competitor: string
  regionId: string | null
  region: string
  observation: string
  productFeedback: string
  interest: SurveyInterest
  pricingObservation: string
  submittedBy: string
  submittedByName: string
  date: string
}

export interface ApiDealer {
  id: string
  code: string
  businessName: string
  contactName: string
  phone: string
  email: string
  city: string
  state: string
  address: string
  category: string
  stage: DealerStage
  leadId: string | null
  customerId: string | null
  ownerUserId: string | null
  ownerName: string
  notes: string
  nextFollowUp: string
  createdAt: string
}

export interface ApiActivityRecord {
  id: string
  employeeId: string
  employeeName: string
  activityType: string
  subject: string
  detail: string
  referenceType: string
  referenceId: string | null
  occurredAt: string
  createdAt: string
}

export interface MarketingDashboardPayload {
  summary: {
    totalLeads: number
    newLeads: number
    qualifiedLeads: number
    convertedLeads: number
    rejectedLeads: number
    overdueFollowUps: number
    activeCampaigns: number
    totalBudget: number
    totalSpend: number
    approvedExpenses: number
    pendingApprovals: number
    rewardsOutstanding: number
  } | null
  pipeline: Array<Record<string, unknown>>
  topCampaigns: ApiCampaign[]
  recentActivity: ApiActivityRecord[]
  pendingApprovalsByType: Array<{ entity_type: string; count: number }>
  expenseSummary: Array<Record<string, unknown>>
}

// ---------------------------------------------------------------------------
// Dashboard & analytics
// ---------------------------------------------------------------------------

export const getMarketingDashboard = () => get<MarketingDashboardPayload>('/marketing/dashboard')
export const listActivityRecords = (query: QueryParams = {}) =>
  getPaginated<ApiActivityRecord>('/marketing/activity-records', { query })

export const createActivityRecord = (payload: {
  employeeId?: string
  activityType?: string
  subject: string
  detail?: string
  referenceType?: string
  referenceId?: string
  occurredAt?: string
}) => post<ApiActivityRecord>('/marketing/activity-records', payload)

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export interface LeadQuery extends QueryParams {
  q?: string
  status?: LeadStatus
  priority?: LeadPriority
  sourceId?: string
  campaignId?: string
  assignedTo?: string
  generatedBy?: string
  converted?: 'true' | 'false'
  from?: string
  to?: string
  sort?:
    | 'createdAt:asc'
    | 'createdAt:desc'
    | 'updatedAt:asc'
    | 'updatedAt:desc'
    | 'name:asc'
    | 'name:desc'
    | 'nextFollowUp:asc'
    | 'nextFollowUp:desc'
  page?: number
  pageSize?: number
}

export const listLeads = (query: LeadQuery = {}) =>
  getPaginated<ApiLead>('/marketing/leads', { query })

export const listAllLeads = (query: LeadQuery = {}) => fetchAllPages<ApiLead>('/marketing/leads', query)

export const getLead = (id: string) => get<ApiLead>(`/marketing/leads/${id}`)

export interface LeadCreatePayload {
  name: string
  company?: string
  phone?: string
  whatsapp?: string
  email?: string
  location?: string
  city?: string
  state?: string
  country?: string
  address?: string
  industry?: string
  customerType?: string
  jobTitle?: string
  sourceId?: string
  source?: string
  sourceCategory?: LeadSourceCategory
  sourceDetail?: string
  marketingActivity?: string
  campaignId?: string
  productId?: string
  product?: string
  assignedTo?: string
  status?: LeadStatus
  priority?: LeadPriority
  nextFollowUp?: string
  nextAction?: string
  notes?: string
  solutionsDiscussed?: string
  informationShared?: string
  interests?: Record<string, unknown>
  qualification?: Record<string, unknown>
  attribution?: Record<string, unknown>
}

export const createLead = (payload: LeadCreatePayload) =>
  post<ApiLead>('/marketing/leads', payload, { idempotencyKey: createIdempotencyKey('mkt-lead') })

export type LeadUpdatePayload = Partial<LeadCreatePayload> & {
  lastContact?: string | null
  lostReason?: string
}

export const updateLead = (id: string, payload: LeadUpdatePayload) =>
  patch<ApiLead>(`/marketing/leads/${id}`, payload)

export const assignLead = (id: string, payload: {
  salesRepId: string
  salesManagerId?: string
  expectedFirstContact?: string
  handoffNote?: string
  requirementSummary?: string
}) => post<ApiLeadAssignment>(`/marketing/leads/${id}/assign`, payload)

export const createFollowUp = (leadId: string, payload: {
  dueAt: string
  method?: 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Visit' | 'Other'
  reason: string
  reminder?: string
}) => post<ApiFollowUp>(`/marketing/leads/${leadId}/follow-ups`, payload)

export const completeFollowUp = (leadId: string, followUpId: string, payload: {
  outcome: string
  latestResponse?: string
  newRequirements?: string
  concerns?: string
  updatedBudget?: number | null
  purchaseReadiness?: string
  agreedNextSteps?: string
  nextFollowUpAt?: string | null
}) => post<ApiFollowUp>(`/marketing/leads/${leadId}/follow-ups/${followUpId}/complete`, payload)

export const cancelFollowUp = (leadId: string, followUpId: string) =>
  post<ApiFollowUp>(`/marketing/leads/${leadId}/follow-ups/${followUpId}/cancel`, {})

export const listLeadActivities = (leadId: string) =>
  get<ApiLeadActivity[]>(`/marketing/leads/${leadId}/activities`)

export const addLeadActivity = (leadId: string, payload: { type: string; summary: string }) =>
  post<ApiLeadActivity>(`/marketing/leads/${leadId}/activities`, payload)

export const rejectLead = (id: string, payload: { reason: string; notes?: string }) =>
  post<ApiLead>(`/marketing/leads/${id}/reject`, payload)

export const convertLead = (id: string, payload: {
  customerName?: string
  company?: string
  email?: string
  phone?: string
  gstin?: string
  notes?: string
  outcome?: string
}) => post<{ customer: ApiCustomer; lead?: ApiLead; replayed?: boolean }>(
  `/marketing/leads/${id}/convert`,
  payload,
  { idempotencyKey: createIdempotencyKey('mkt-convert') },
)

// ---------------------------------------------------------------------------
// Campaigns, offers, discounts
// ---------------------------------------------------------------------------

export interface CampaignQuery extends QueryParams {
  q?: string
  status?: CampaignStatus
  channel?: CampaignChannel
  ownerUserId?: string
  from?: string
  to?: string
  sort?: 'startDate:asc' | 'startDate:desc' | 'budget:asc' | 'budget:desc' | 'createdAt:asc' | 'createdAt:desc'
  page?: number
  pageSize?: number
}

export const listCampaigns = (query: CampaignQuery = {}) =>
  getPaginated<ApiCampaign>('/marketing/campaigns', { query })

export const listAllCampaigns = (query: CampaignQuery = {}) =>
  fetchAllPages<ApiCampaign>('/marketing/campaigns', query)

export const getCampaign = (id: string) => get<ApiCampaign>(`/marketing/campaigns/${id}`)

export interface CampaignPayload {
  name: string
  objective?: string
  channel?: CampaignChannel
  audience?: string
  productId?: string
  product?: string
  startDate: string
  endDate: string
  budget?: number
  spend?: number
  status?: CampaignStatus
  ownerUserId?: string
  kpis?: Record<string, unknown>
}

export const createCampaign = (payload: CampaignPayload) =>
  post<ApiCampaign>('/marketing/campaigns', payload, { idempotencyKey: createIdempotencyKey('mkt-campaign') })

export const updateCampaign = (id: string, payload: Partial<CampaignPayload>) =>
  patch<ApiCampaign>(`/marketing/campaigns/${id}`, payload)

export const listOffers = (query: QueryParams = {}) =>
  getPaginated<ApiOffer>('/marketing/offers', { query })

export const createOffer = (payload: {
  campaignId?: string
  title: string
  description?: string
  offerType?: OfferType
  discountPercent?: number
  discountAmount?: number
  productId?: string
  validFrom?: string
  validTo?: string
}) => post<ApiOffer>('/marketing/offers', payload)

export const submitOffer = (id: string) => post<ApiOffer>(`/marketing/offers/${id}/submit`, {})

export const decideOffer = (id: string, payload: { decision: 'Approved' | 'Rejected' | 'Changes Requested'; comments?: string }) =>
  post<ApiOffer>(`/marketing/offers/${id}/decide`, payload)

export const listDiscounts = (query: QueryParams = {}) =>
  getPaginated<ApiDiscount>('/marketing/discounts', { query })

export const requestDiscount = (payload: {
  offerId?: string
  customerId?: string
  salesOrderId?: string
  requestedPercent: number
  reason: string
}) => post<ApiDiscount>('/marketing/discounts', payload, { idempotencyKey: createIdempotencyKey('mkt-discount') })

export const decideDiscount = (id: string, payload: { decision: 'Approved' | 'Rejected'; approvedPercent?: number; comments?: string }) =>
  post<ApiDiscount>(`/marketing/discounts/${id}/decide`, payload)

// ---------------------------------------------------------------------------
// Plans & marketing expenses
// ---------------------------------------------------------------------------

export interface PlanQuery extends QueryParams {
  q?: string
  employeeId?: string
  month?: string
  status?: PlanStatus
  from?: string
  to?: string
  sort?: 'month:asc' | 'month:desc' | 'createdAt:asc' | 'createdAt:desc' | 'status:asc'
  page?: number
  pageSize?: number
}

export const listPlans = (query: PlanQuery = {}) =>
  getPaginated<ApiPlan>('/marketing/plans', { query })

export const listAllPlans = (query: PlanQuery = {}) => fetchAllPages<ApiPlan>('/marketing/plans', query)

export const getPlan = (id: string) => get<ApiPlan>(`/marketing/plans/${id}`)

export interface PlanActivityPayload {
  type: string
  name: string
  objective?: string
  targetAudience?: string
  plannedActivities?: string
  expectedLeads?: number
  expectedConversions?: number
  monthlyTarget?: number
  estimatedBudget?: number
  expectedOutcome?: string
  startDate?: string
  endDate?: string
  supportingNotes?: string
}

export interface PlanPayload {
  title: string
  month: string
  employeeId?: string
  seniorReviewerId?: string
  objective?: string
  targetAudience?: string
  plannedActivities?: string
  expectedLeads?: number
  expectedConversions?: number
  monthlyTarget?: number
  estimatedBudget?: number
  requestedAmount?: number
  expectedOutcome?: string
  startDate?: string
  endDate?: string
  supportingNotes?: string
  financeRequired?: boolean
  activities?: PlanActivityPayload[]
}

export const createPlan = (payload: PlanPayload) =>
  post<ApiPlan>('/marketing/plans', payload, { idempotencyKey: createIdempotencyKey('mkt-plan') })

export const updatePlan = (id: string, payload: Partial<PlanPayload>) =>
  patch<ApiPlan>(`/marketing/plans/${id}`, payload)

export const submitPlan = (id: string) => post<ApiPlan>(`/marketing/plans/${id}/submit`, {})
export const approvePlan = (id: string, comments?: string) =>
  post<ApiPlan>(`/marketing/plans/${id}/approve`, { comments })
export const rejectPlan = (id: string, comments: string) =>
  post<ApiPlan>(`/marketing/plans/${id}/reject`, { comments })
export const requestPlanChanges = (id: string, comments: string) =>
  post<ApiPlan>(`/marketing/plans/${id}/request-changes`, { comments })
export const startPlan = (id: string) => post<ApiPlan>(`/marketing/plans/${id}/start`, {})
export const submitPlanResults = (id: string, results?: string) =>
  post<ApiPlan>(`/marketing/plans/${id}/submit-results`, { results })
export const completePlan = (id: string, comments?: string) =>
  post<ApiPlan>(`/marketing/plans/${id}/complete`, { comments })

export const updatePlanExecution = (id: string, payload: {
  completedActivities?: number
  actualLeads?: number
  qualifiedLeads?: number
  completedFieldVisits?: number
  tradePartnerVisits?: number
  actualSpending?: number
  results?: string
  remarks?: string
  activities?: Array<{
    id: string
    completedActivities?: number
    actualLeads?: number
    qualifiedLeads?: number
    completedFieldVisits?: number
    tradePartnerVisits?: number
    actualSpending?: number
    executionPercent?: number
    results?: string
  }>
}) => patch<ApiPlan>(`/marketing/plans/${id}/execution`, payload)

export interface ExpenseQuery extends QueryParams {
  q?: string
  source?: 'campaign' | 'monthly_plan' | 'field_claim' | 'other'
  status?: ExpenseStatus
  employeeId?: string
  planId?: string
  campaignId?: string
  category?: string
  from?: string
  to?: string
  sort?: 'expenseDate:asc' | 'expenseDate:desc' | 'amount:asc' | 'amount:desc' | 'createdAt:asc' | 'createdAt:desc'
  page?: number
  pageSize?: number
}

export const listExpenses = (query: ExpenseQuery = {}) =>
  getPaginated<ApiMarketingExpense>('/marketing/expenses', { query })

export const listAllExpenses = (query: ExpenseQuery = {}) =>
  fetchAllPages<ApiMarketingExpense>('/marketing/expenses', query)

export const getExpense = (id: string) => get<ApiMarketingExpense>(`/marketing/expenses/${id}`)

export const createExpense = (payload: {
  source?: 'campaign' | 'monthly_plan' | 'field_claim' | 'other'
  title: string
  planId?: string
  activityId?: string
  campaignId?: string
  employeeId?: string
  category?: string
  vendorName?: string
  amount: number
  currency?: string
  expenseDate: string
  description: string
  documentPath?: string
  managerRequired?: boolean
  financeRequired?: boolean
  submit?: boolean
}) => post<ApiMarketingExpense>('/marketing/expenses', payload, {
  idempotencyKey: createIdempotencyKey('mkt-expense'),
})

export const updateExpense = (id: string, payload: {
  title?: string
  planId?: string
  activityId?: string
  campaignId?: string
  category?: string
  vendorName?: string
  amount?: number
  currency?: string
  expenseDate?: string
  description?: string
  documentPath?: string
}) => patch<ApiMarketingExpense>(`/marketing/expenses/${id}`, payload)

export const submitExpense = (id: string) => post<ApiMarketingExpense>(`/marketing/expenses/${id}/submit`, {})

export const decideExpense = (id: string, payload: { decision: 'Approved' | 'Rejected' | 'Changes Requested'; comments?: string }) =>
  post<ApiMarketingExpense>(`/marketing/expenses/${id}/decide`, payload)

export const reimburseExpense = (id: string, comments?: string) =>
  post<ApiMarketingExpense>(`/marketing/expenses/${id}/reimburse`, { comments })

// ---------------------------------------------------------------------------
// Targets, performance, rewards
// ---------------------------------------------------------------------------

export const listTargets = (query: QueryParams = {}) =>
  getPaginated<ApiTarget>('/marketing/targets', { query })

export const upsertTarget = (payload: {
  userId?: string
  periodStart: string
  periodEnd: string
  metric?: TargetMetric
  targetValue: number
  achievedValue?: number
  unit?: string
  notes?: string
  planId?: string
}) => post<ApiTarget>('/marketing/targets', payload, { idempotencyKey: createIdempotencyKey('mkt-target') })

export const updateTarget = (id: string, payload: {
  targetValue?: number
  achievedValue?: number
  unit?: string
  notes?: string
  planId?: string
}) => patch<ApiTarget>(`/marketing/targets/${id}`, payload)

export const listPerformance = (query: { employeeId?: string; period?: string } & QueryParams = {}) =>
  getPaginated<Record<string, unknown>>('/marketing/performance', { query })

export const refreshPerformance = (period: string) =>
  post<Array<Record<string, unknown>>>('/marketing/performance/refresh', { period })

export const listRewards = (query: { employeeId?: string } & QueryParams = {}) =>
  getPaginated<ApiRewardWallet>('/marketing/rewards', { query })

export const listRewardTransactions = (employeeId: string) =>
  get<ApiRewardTransaction[]>(`/marketing/rewards/${employeeId}/transactions`)

export const awardReward = (payload: {
  employeeId: string
  amount: number
  entryType?: 'Award' | 'Adjustment' | 'Opening'
  note?: string
  referenceType?: string
  referenceId?: string
}) => post<{ wallet: ApiRewardWallet; transaction: ApiRewardTransaction }>('/marketing/rewards/award', payload, {
  idempotencyKey: createIdempotencyKey('mkt-reward'),
})

export const redeemReward = (payload: { employeeId?: string; amount: number; note?: string }) =>
  post<{ wallet: ApiRewardWallet; transaction: ApiRewardTransaction }>('/marketing/rewards/redeem', payload, {
    idempotencyKey: createIdempotencyKey('mkt-redeem'),
  })

// ---------------------------------------------------------------------------
// Field marketing
// ---------------------------------------------------------------------------

export interface VisitQuery extends QueryParams {
  q?: string
  status?: VisitStatus
  type?: VisitType
  assignedTo?: string
  leadId?: string
  customerId?: string
  from?: string
  to?: string
  sort?: 'visitDate:asc' | 'visitDate:desc' | 'createdAt:asc' | 'createdAt:desc'
  page?: number
  pageSize?: number
}

export const listVisits = (query: VisitQuery = {}) =>
  getPaginated<ApiFieldVisit>('/marketing/visits', { query })

export const listAllVisits = (query: VisitQuery = {}) =>
  fetchAllPages<ApiFieldVisit>('/marketing/visits', query)

export const getVisit = (id: string) => get<ApiFieldVisit>(`/marketing/visits/${id}`)

export interface VisitPayload {
  business: string
  contactName?: string
  contactPhone?: string
  leadId?: string
  customerId?: string
  purpose?: string
  type?: VisitType
  date: string
  time?: string
  location?: string
  assignedTo?: string
  notes?: string
  demoFollowUp?: string
  checklist?: string[]
  status?: VisitStatus
}

export const createVisit = (payload: VisitPayload) =>
  post<ApiFieldVisit>('/marketing/visits', payload, { idempotencyKey: createIdempotencyKey('mkt-visit') })

export const updateVisit = (id: string, payload: Partial<VisitPayload>) =>
  patch<ApiFieldVisit>(`/marketing/visits/${id}`, payload)

export const checkInVisit = (id: string, notes?: string) =>
  post<ApiFieldVisit>(`/marketing/visits/${id}/check-in`, { notes })

export const checkOutVisit = (id: string, payload: {
  outcome: string
  competitorBrands?: string
  samplesDispensed?: string
  notes?: string
  checklist?: string[]
}) => post<ApiFieldVisit>(`/marketing/visits/${id}/check-out`, payload)

export const listSurveys = (query: QueryParams = {}) =>
  getPaginated<ApiSurvey>('/marketing/surveys', { query })

export const createSurvey = (payload: {
  competitor: string
  regionId?: string
  region?: string
  observation: string
  productFeedback?: string
  interest?: SurveyInterest
  pricingObservation?: string
  date?: string
}) => post<ApiSurvey>('/marketing/surveys', payload)

export const listDealers = (query: QueryParams = {}) =>
  getPaginated<ApiDealer>('/marketing/dealers', { query })

export interface DealerPayload {
  businessName: string
  contactName?: string
  phone?: string
  email?: string
  city?: string
  state?: string
  address?: string
  category?: string
  stage?: DealerStage
  leadId?: string
  customerId?: string
  ownerUserId?: string
  notes?: string
  nextFollowUp?: string
}

export const createDealer = (payload: DealerPayload) =>
  post<ApiDealer>('/marketing/dealers', payload, { idempotencyKey: createIdempotencyKey('mkt-dealer') })

export const updateDealer = (id: string, payload: Partial<DealerPayload>) =>
  patch<ApiDealer>(`/marketing/dealers/${id}`, payload)

export type { PaginatedResponse }
