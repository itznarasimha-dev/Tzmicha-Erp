/**
 * Hydrates the Marketing portal from the real API.
 *
 * The portal was built around a localStorage demo dataset. This adapter maps
 * the canonical API rows (see `server/src/mappers/marketing.ts`) onto the
 * existing `DemoData` shape so the current UI and workflows keep working.
 *
 * Scope note: only collections owned by the Marketing module are replaced.
 * Digital/trade/agency/asset sub-modules that never had backend endpoints keep
 * their demo scaffolding until those APIs exist.
 */

import type {
  DemoData,
  Lead,
  Campaign,
  Customer,
  ExpenseCategory,
  FieldVisit,
  LeadSalesAssignment,
  MarketResearch,
} from './types/marketing'
import type {
  ExpenseWorkflowStatus,
  MarketingActivityType,
  MarketingExpenseRequest,
  MonthlyPlan,
  PlanWorkflowStatus,
  WorkflowApprovalEntry,
} from './types/workflow'
import { buildSeedData } from './data/marketing'
import * as api from '@/lib/api/marketing'

const PLAN_APPROVED_LABEL = 'Approved — Ready to Execute'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

async function mapWithLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let index = 0
  const workers = Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, async () => {
    for (;;) {
      const current = index++
      if (current >= items.length) return
      // Errors in a single detail fetch must not blank the whole dashboard.
      try {
        results[current] = await mapper(items[current])
      } catch {
        results[current] = undefined as unknown as R
      }
    }
  })
  await Promise.all(workers)
  return results.filter((item): item is R => item !== undefined)
}

function mapInterests(value: Record<string, unknown> | undefined): Lead['interests'] {
  const interests = (value ?? {}) as Record<string, unknown>
  return {
    products: Array.isArray(interests.products) ? interests.products.map(String) : [],
    category: optionalText(interests.category),
    features: Array.isArray(interests.features) ? interests.features.map(String) : [],
    preferredBrand: optionalText(interests.preferredBrand),
    likes: Array.isArray(interests.likes) ? interests.likes.map(String) : [],
    dislikes: Array.isArray(interests.dislikes) ? interests.dislikes.map(String) : [],
    requirements: Array.isArray(interests.requirements) ? interests.requirements.map(String) : [],
    priceRange: optionalText(interests.priceRange),
    budget: typeof interests.budget === 'number' ? interests.budget : null,
    preferredChannel: optionalText(interests.preferredChannel),
    preferredContactTime: optionalText(interests.preferredContactTime),
    preferredLanguage: optionalText(interests.preferredLanguage),
    purchasePurpose: optionalText(interests.purchasePurpose),
    expectedPurchaseDate: optionalText(interests.expectedPurchaseDate),
    specialRequirements: optionalText(interests.specialRequirements),
    questions: Array.isArray(interests.questions) ? interests.questions.map(String) : [],
    problems: Array.isArray(interests.problems) ? interests.problems.map(String) : [],
    summary: optionalText(interests.summary),
  }
}

function mapQualification(value: Record<string, unknown> | undefined): Lead['qualification'] {
  const qualification = (value ?? {}) as Record<string, unknown>
  return {
    intent: pick(qualification.intent, ['Unknown', 'Low', 'Medium', 'High'] as const, 'Unknown'),
    estimatedValue: typeof qualification.estimatedValue === 'number' ? qualification.estimatedValue : null,
    budgetRange: optionalText(qualification.budgetRange),
    decisionAuthority: pick(
      qualification.decisionAuthority,
      ['Decision Maker', 'Influencer', 'Evaluator', 'Unknown'] as const,
      'Unknown',
    ),
    purchaseTimeline: optionalText(qualification.purchaseTimeline),
    notes: optionalText(qualification.notes),
    mainRequirement: optionalText(qualification.mainRequirement),
    reasonForInterest: optionalText(qualification.reasonForInterest),
    reasonForRejection: optionalText(qualification.reasonForRejection),
  }
}

function mapAttribution(value: Record<string, unknown> | undefined): Lead['attribution'] {
  const attribution = (value ?? {}) as Record<string, unknown>
  return {
    campaignName: optionalText(attribution.campaignName),
    adSource: optionalText(attribution.adSource),
    landingPage: optionalText(attribution.landingPage),
    firstContactDate: optionalText(attribution.firstContactDate),
    latestContactDate: optionalText(attribution.latestContactDate),
    referrerName: optionalText(attribution.referrerName),
    referrerContact: optionalText(attribution.referrerContact),
    notes: optionalText(attribution.notes),
  }
}

function mapLead(row: api.ApiLead): Lead {
  const followUps = asArray<api.ApiFollowUp>(row.followUps).map((followUp) => ({
    id: followUp.id,
    dueAt: followUp.dueAt,
    method: followUp.method,
    reason: followUp.reason,
    reminder: followUp.reminder,
    status: followUp.status,
    createdAt: followUp.createdAt,
    createdBy: followUp.createdBy,
    completedAt: followUp.completedAt,
    outcome: followUp.outcome,
    latestResponse: followUp.latestResponse,
    newRequirements: followUp.newRequirements,
    concerns: followUp.concerns,
    updatedBudget: followUp.updatedBudget,
    purchaseReadiness: followUp.purchaseReadiness,
    agreedNextSteps: followUp.agreedNextSteps,
  }))

  const activities = asArray<api.ApiLeadActivity>(row.activities).map((activity) => ({
    id: activity.id,
    type: activity.type as Lead['activities'][number]['type'],
    at: activity.at,
    by: activity.by,
    summary: activity.summary,
  }))

  const conversionRaw = row.conversion as unknown as Record<string, unknown> | null
  const conversion = conversionRaw
    ? {
        convertedAt: text(conversionRaw.convertedAt ?? conversionRaw.converted_at),
        convertedBy: text(conversionRaw.convertedBy ?? conversionRaw.converted_by),
        customerId: text(conversionRaw.customerId ?? conversionRaw.customer_id),
        opportunityId: optionalText(conversionRaw.opportunityId ?? conversionRaw.opportunity_id),
        outcome: optionalText(conversionRaw.outcome),
      }
    : undefined

  const assignment = row.assignment
    ? {
        handoverId: row.assignment.handoverId,
        salesRepId: row.assignment.salesRepId,
        salesManagerId: row.assignment.salesManagerId ?? undefined,
        assignedAt: row.assignment.assignedAt,
        expectedFirstContact: row.assignment.expectedFirstContact,
        firstContactAt: row.assignment.firstContactAt ?? undefined,
        handoffNote: row.assignment.handoffNote,
        salesStatus: row.assignment.salesStatus as LeadSalesAssignment['salesStatus'],
        lastContact: row.assignment.lastContact,
        nextAction: row.assignment.nextAction,
        dealStatus: row.assignment.dealStatus as LeadSalesAssignment['salesStatus'] | undefined,
        updatedAt: row.assignment.assignedAt,
        nextFollowUp: row.assignment.nextFollowUp,
        requirementSummary: row.assignment.requirementSummary,
        communicationStatus: row.assignment.communicationStatus as LeadSalesAssignment['communicationStatus'],
        customerNotifications: asArray<NonNullable<LeadSalesAssignment['customerNotifications']>[number]>(
          row.assignment.customerNotifications,
        ),
        notifications: asArray<NonNullable<LeadSalesAssignment['notifications']>[number]>(row.assignment.notifications),
        handoverHistory: asArray<NonNullable<LeadSalesAssignment['handoverHistory']>[number]>(row.assignment.handoverHistory),
        contactAttempts: asArray<NonNullable<LeadSalesAssignment['contactAttempts']>[number]>(row.assignment.contactAttempts),
        reassignments: asArray<NonNullable<LeadSalesAssignment['reassignments']>[number]>(row.assignment.reassignments),
        supervisoryNotes: asArray<NonNullable<LeadSalesAssignment['supervisoryNotes']>[number]>(row.assignment.supervisoryNotes),
        reassignmentRequired: row.assignment.reassignmentRequired,
      }
    : undefined

  const rejection = row.rejection
    ? {
        reason: row.rejection.reason,
        notes: row.rejection.notes,
        rejectedAt: row.rejection.rejectedAt,
        rejectedBy: row.rejection.rejectedByName || row.rejection.rejectedBy,
        previousStatus: row.rejection.previousStatus,
        previousNextFollowUp: null,
      }
    : undefined

  return {
    id: row.id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    email: row.email,
    location: row.location || row.city || '',
    industry: row.industry,
    source: pick(
      row.source || row.sourceName,
      [
        'Digital Campaign',
        'Field Visit',
        'Trade Event',
        'Referral',
        'Website Enquiry',
        'Retail Activity',
        'Social Media',
        'Website',
        'WhatsApp',
        'Campaign',
        'Events',
        'Manual Entry',
        'Other',
      ] as const,
      'Other',
    ),
    sourceCategory: pick(
      row.sourceCategory,
      ['Digital Marketing', 'Field Marketing', 'Trade Marketing', 'Campaign', 'Website', 'Referral', 'Other'] as const,
      'Other',
    ),
    sourceDetail: row.sourceDetail,
    marketingActivity: row.marketingActivity,
    campaignId: row.campaignId,
    product: row.product || '',
    assignedTo: row.assignedTo,
    generatedBy: row.generatedBy,
    status: pick(
      row.status,
      [
        'New',
        'Contacted',
        'Interested',
        'Follow-up Required',
        'Qualified',
        'Sent to Sales',
        'Converted',
        'Rejected',
        'Not Interested',
        'Lost',
      ] as const,
      'New',
    ),
    priority: pick(row.priority, ['Urgent', 'High', 'Medium', 'Low'] as const, 'Medium'),
    nextFollowUp: row.nextFollowUp,
    notes: row.notes,
    createdAt: row.createdAt,
    lastContact: row.lastContact,
    converted: row.converted,
    customerId: row.customerId,
    lostReason: row.lostReason,
    activities,
    whatsapp: row.whatsapp,
    jobTitle: row.jobTitle,
    customerType: row.customerType,
    city: row.city,
    state: row.state,
    country: row.country,
    address: row.address,
    interests: mapInterests(row.interests),
    qualification: mapQualification(row.qualification),
    attribution: mapAttribution(row.attribution),
    followUps,
    salesAssignment: assignment,
    rejection,
    conversion,
    nextAction: row.nextAction,
    solutionsDiscussed: row.solutionsDiscussed,
    informationShared: row.informationShared,
  }
}

function mapCampaign(row: api.ApiCampaign): Campaign {
  const kpis = (row.kpis ?? {}) as Record<string, unknown>
  return {
    id: row.id,
    name: row.name,
    objective: row.objective,
    channel: pick(
      row.channel,
      ['Digital', 'Social', 'Email', 'Field', 'Trade', 'Events', 'Influencer', 'Retail', 'Content'] as const,
      'Digital',
    ),
    audience: row.audience,
    product: row.product || '',
    startDate: row.startDate,
    endDate: row.endDate,
    budget: row.budget,
    spend: row.spend,
    status: pick(
      row.status,
      ['Draft', 'Planned', 'Active', 'Paused', 'Completed', 'Archived'] as const,
      'Draft',
    ),
    owner: row.owner,
    kpis: {
      impressions: number(kpis.impressions),
      clicks: number(kpis.clicks),
      leads: number(kpis.leads ?? row.leads),
      qualifiedLeads: number(kpis.qualifiedLeads ?? row.qualifiedLeads),
      conversions: number(kpis.conversions ?? row.conversions),
      revenue: number(kpis.revenue ?? row.convertedValue),
    },
    createdAt: row.createdAt,
  }
}

function mapPlanApproval(row: api.ApiPlanApproval): WorkflowApprovalEntry {
  const rawRole = pick(
    row.byRoleId,
    ['junior', 'senior', 'manager', 'hr', 'finance', 'employee', 'admin'] as const,
    'employee',
  )
  return {
    id: row.id,
    stage: pick(
      row.stage,
      ['submission', 'senior', 'manager', 'admin', 'execution', 'results', 'completed'] as const,
      'submission',
    ),
    action: row.action,
    byRoleId: rawRole === 'admin' ? 'admin-demo' : rawRole,
    byName: row.byName,
    at: row.at,
    decision: pick(
      row.decision,
      [
        'Submitted',
        'Approved',
        'Changes Requested',
        'Rejected',
        'Started',
        'Progress Updated',
        'Results Submitted',
        'Revision Requested',
        'Completed',
      ] as const,
      'Submitted',
    ),
    comments: row.comments,
  }
}

function mapPlan(row: api.ApiPlan): MonthlyPlan {
  const status: PlanWorkflowStatus = row.status === 'Approved' ? PLAN_APPROVED_LABEL : (row.status as PlanWorkflowStatus)
  const needsAdmin = row.financeRequired
  const adminAuthorization =
    needsAdmin && row.status === 'Pending Admin Financial Authorization'
      ? {
          required: true,
          status: 'Pending' as const,
          requestedAt: row.submittedAt,
          decidedAt: null,
          decidedBy: null,
          comments: 'Awaiting Admin financial authorization.',
          simulated: false,
        }
      : needsAdmin
        ? {
            required: true,
            status: 'Authorized' as const,
            requestedAt: row.submittedAt,
            decidedAt: row.updatedAt,
            decidedBy: row.currentApprover,
            comments: '',
            simulated: false,
          }
        : undefined

  return {
    id: row.id,
    title: row.title,
    month: row.month,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    employeeRole: row.employeeRole,
    roleId: pick(row.roleId, ['junior', 'senior'] as const, 'junior'),
    seniorReviewerId: row.seniorReviewerId,
    objective: row.objective,
    targetAudience: row.targetAudience,
    plannedActivities: row.plannedActivities,
    expectedLeads: row.expectedLeads,
    expectedConversions: row.expectedConversions,
    monthlyTarget: row.monthlyTarget,
    estimatedBudget: row.estimatedBudget,
    requestedAmount: row.requestedAmount,
    expectedOutcome: row.expectedOutcome,
    startDate: row.startDate,
    endDate: row.endDate,
    supportingNotes: row.supportingNotes,
    activities: asArray<api.ApiPlanActivity>(row.activities).map((activity) => ({
      id: activity.id,
      type: activity.type as MarketingActivityType,
      name: activity.name,
      objective: activity.objective,
      targetAudience: activity.targetAudience,
      plannedActivities: activity.plannedActivities,
      expectedLeads: activity.expectedLeads,
      expectedConversions: activity.expectedConversions,
      monthlyTarget: activity.monthlyTarget,
      estimatedBudget: activity.estimatedBudget,
      expectedOutcome: activity.expectedOutcome,
      startDate: activity.startDate,
      endDate: activity.endDate,
      supportingNotes: activity.supportingNotes,
      completedActivities: activity.completedActivities,
      actualLeads: activity.actualLeads,
      qualifiedLeads: activity.qualifiedLeads,
      completedFieldVisits: activity.completedFieldVisits,
      tradePartnerVisits: activity.tradePartnerVisits,
      actualSpending: activity.actualSpending,
      executionPercent: activity.executionPercent,
      results: activity.results,
    })),
    status,
    financeRequired: row.financeRequired,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt,
    revisionReason: row.revisionReason || undefined,
    currentApprover: row.currentApprover,
    previousApprover: row.previousApprover,
    approvals: asArray<api.ApiPlanApproval>(row.approvals).map(mapPlanApproval),
    execution: {
      startedAt: row.execution.startedAt,
      completedActivities: row.execution.completedActivities,
      actualLeads: row.execution.actualLeads,
      qualifiedLeads: row.execution.qualifiedLeads,
      completedFieldVisits: row.execution.completedFieldVisits,
      tradePartnerVisits: row.execution.tradePartnerVisits,
      actualSpending: row.execution.actualSpending,
      executionPercent: row.execution.executionPercent,
      results: row.execution.results,
      remarks: row.execution.remarks,
      updatedAt: row.execution.updatedAt,
    },
    adminAuthorization,
    resultsSubmittedAt: row.resultsSubmittedAt,
    completedAt: row.completedAt,
  }
}

function mapExpense(row: api.ApiMarketingExpense): MarketingExpenseRequest {
  // The portal workflow models reimbursement as the terminal "Approved"
  // state; the backend distinguishes Reimbursed/Paid for finance reporting.
  const status: ExpenseWorkflowStatus =
    row.status === 'Reimbursed' || row.status === 'Paid'
      ? 'Approved'
      : (row.status as ExpenseWorkflowStatus)
  const needsAdmin = row.financeRequired
  const adminAuthorization =
    needsAdmin && row.status === 'Pending Admin Financial Authorization'
      ? {
          required: true,
          status: 'Pending' as const,
          requestedAt: row.submittedAt,
          decidedAt: null,
          decidedBy: null,
          comments: 'Awaiting Admin financial authorization.',
          simulated: false,
        }
      : needsAdmin
        ? {
            required: true,
            status: 'Authorized' as const,
            requestedAt: row.submittedAt,
            decidedAt: row.decidedAt,
            decidedBy: row.currentApprover,
            comments: '',
            simulated: false,
          }
        : undefined

  return {
    id: row.id,
    title: row.title,
    planId: row.planId || '',
    planTitle: row.planTitle,
    activityId: row.activityId,
    activityName: row.activityName,
    activityType: pick(
      row.activityType,
      [
        'Digital Marketing',
        'Field Marketing',
        'Trade Marketing',
        'Campaigns and Offers',
        'Customer Engagement',
        'Lead Generation',
        'Other Marketing Activities',
      ] as const,
      'Other Marketing Activities',
    ),
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    roleId: pick(row.roleId, ['junior', 'senior'] as const, 'junior'),
    category: pick(
      row.category,
      ['Advertising', 'Content Production', 'Events', 'Field Marketing', 'Printing', 'Influencer Fees', 'Travel', 'Other'] as const,
      'Other',
    ) as ExpenseCategory,
    amount: row.amount,
    expenseDate: row.expenseDate,
    description: row.description,
    documentName: row.documentPath?.split('/').pop() || '',
    submittedAt: row.submittedAt,
    status,
    managerRequired: row.managerRequired,
    reviewerComments: row.reviewerComments,
    currentApprover: row.currentApprover,
    approvals: asArray<Record<string, unknown>>(row.approvals).map((approval) => {
      const rawRole = pick(
        text(approval.byRoleId ?? approval.by_role, 'employee'),
        ['junior', 'senior', 'manager', 'hr', 'finance', 'employee', 'admin'] as const,
        'employee',
      )
      return {
        id: text(approval.id),
        stage: pick(
          text(approval.stage),
          ['submission', 'senior', 'manager', 'admin', 'execution', 'results', 'completed'] as const,
          'submission',
        ),
        action: text(approval.action),
        byRoleId: rawRole === 'admin' ? 'admin-demo' : rawRole,
        byName: text(approval.byName ?? approval.by_name),
        at: text(approval.at ?? approval.decidedAt),
        decision: pick(
          text(approval.decision, 'Approved'),
          [
            'Submitted',
            'Approved',
            'Changes Requested',
            'Rejected',
            'Started',
            'Progress Updated',
            'Results Submitted',
            'Revision Requested',
            'Completed',
          ] as const,
          'Approved',
        ),
        comments: text(approval.comments),
      }
    }),
    adminAuthorization,
  }
}

function mapVisit(row: api.ApiFieldVisit): FieldVisit {
  return {
    id: row.id,
    business: row.business,
    contact: row.contact,
    leadId: row.leadId,
    purpose: row.purpose,
    type: pick(row.type, ['Field Visit', 'Store Visit', 'Demo', 'Dealer Visit'] as const, 'Field Visit'),
    date: row.date,
    time: row.time,
    location: row.location,
    assignedTo: row.assignedTo,
    notes: row.notes,
    demoFollowUp: row.demoFollowUp,
    checklist: asArray<string>(row.checklist),
    status: pick(row.status, ['Scheduled', 'In Progress', 'Completed', 'Cancelled'] as const, 'Scheduled'),
    createdAt: row.createdAt,
  }
}

function mapSurvey(row: api.ApiSurvey): MarketResearch {
  return {
    id: row.id,
    competitor: row.competitor,
    region: row.region,
    observation: row.observation,
    productFeedback: row.productFeedback,
    interest: pick(row.interest, ['High', 'Medium', 'Low'] as const, 'Medium'),
    pricingObservation: row.pricingObservation,
    submittedBy: row.submittedBy,
    date: row.date,
  }
}

function customerFromLead(lead: Lead): Customer | null {
  if (!lead.converted || !lead.customerId) return null
  return {
    id: lead.customerId,
    name: lead.name,
    company: lead.company,
    phone: lead.phone,
    email: lead.email,
    location: lead.location,
    industry: lead.industry,
    source: lead.source,
    campaignId: lead.campaignId,
    product: lead.product,
    leadId: lead.id,
    salesRepId: lead.salesAssignment?.salesRepId || lead.assignedTo,
    status: 'Active',
    notes: lead.notes,
    createdAt: lead.createdAt,
  }
}

export interface MarketingSyncOptions {
  signal?: AbortSignal
}

/** Build the full Marketing `DemoData` shape from the API. */
export async function fetchMarketingDatabase(options: MarketingSyncOptions = {}): Promise<DemoData> {
  const seed = buildSeedData()

  const [leadsResult, campaignsResult, plansResult, expensesResult, visitsResult, surveysResult] =
    await Promise.allSettled([
      api.listAllLeads(),
      api.listAllCampaigns(),
      api.listAllPlans(),
      api.listAllExpenses(),
      api.listAllVisits(),
      api.listSurveys({ pageSize: 100 }),
    ])

  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  if (leadsResult.status === 'rejected') throw leadsResult.reason

  const leads = leadsResult.value.map(mapLead)
  const campaigns = campaignsResult.status === 'fulfilled' ? campaignsResult.value.map(mapCampaign) : seed.campaigns
  const expenses =
    expensesResult.status === 'fulfilled'
      ? expensesResult.value.map((row) => mapExpense(row))
      : seed.marketingExpenses
  const visits = visitsResult.status === 'fulfilled' ? visitsResult.value.map(mapVisit) : seed.fieldVisits
  const research = surveysResult.status === 'fulfilled' ? surveysResult.value.data.map(mapSurvey) : seed.research

  // Plan list responses omit activities/approvals; hydrate details concurrently.
  const planRows = plansResult.status === 'fulfilled' ? plansResult.value : []
  const monthlyPlans =
    plansResult.status === 'fulfilled'
      ? await mapWithLimit(planRows, 5, async (row) => mapPlan(await api.getPlan(row.id)))
      : seed.monthlyPlans

  const customers = leads
    .map(customerFromLead)
    .filter((customer): customer is Customer => customer !== null)

  return {
    ...seed,
    leads,
    campaigns,
    monthlyPlans,
    marketingExpenses: expenses,
    fieldVisits: visits,
    research,
    customers,
  }
}

/** Convenience alias used by the provider. */
export async function hydrateMarketingDatabase(options: MarketingSyncOptions = {}): Promise<DemoData> {
  return fetchMarketingDatabase(options)
}
