/**
 * Row → API mappers for the Marketing module.
 *
 * Status values are returned exactly as stored by Postgres (canonical). The
 * frontend adapter (`src/lib/api/marketing.ts`) translates the one legacy
 * label: "Approved — Ready to Execute" ⇄ "Approved".
 */

type Row = Record<string, any>

function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function dateOnly(value: unknown): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function iso(value: unknown): string {
  if (!value) return ''
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

export function mapLead(row: Row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    company: row.company ?? '',
    phone: row.phone ?? '',
    whatsapp: row.whatsapp ?? '',
    email: row.email ?? '',
    location: row.location ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    country: row.country ?? 'India',
    address: row.address ?? '',
    industry: row.industry ?? '',
    customerType: row.customer_type ?? '',
    jobTitle: row.job_title ?? '',
    sourceId: row.source_id ?? null,
    source: row.source ?? row.source_name ?? 'Other',
    sourceName: row.source_name ?? row.source ?? 'Other',
    sourceCategory: row.source_category ?? row.source_category_name ?? 'Other',
    sourceDetail: row.source_detail ?? '',
    marketingActivity: row.marketing_activity ?? '',
    campaignId: row.campaign_id ?? null,
    campaignName: row.campaign_name ?? '',
    productId: row.product_id ?? null,
    product: row.product_text ?? '',
    assignedTo: row.assigned_to ?? '',
    assignedToName: row.assigned_to_name ?? '',
    generatedBy: row.generated_by ?? '',
    generatedByName: row.generated_by_name ?? '',
    status: row.status,
    priority: row.priority,
    nextFollowUp: row.next_follow_up ? iso(row.next_follow_up) : null,
    lastContact: row.last_contact ? iso(row.last_contact) : '',
    nextAction: row.next_action ?? '',
    notes: row.notes ?? '',
    solutionsDiscussed: row.solutions_discussed ?? '',
    informationShared: row.information_shared ?? '',
    interests: row.interests ?? {},
    qualification: row.qualification ?? {},
    attribution: row.attribution ?? {},
    converted: Boolean(row.converted),
    customerId: row.customer_id ?? undefined,
    lostReason: row.lost_reason ?? '',
    createdBy: row.created_by ?? '',
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    activities: [],
    followUps: [],
  }
}

export function mapLeadActivity(row: Row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.activity_type,
    at: iso(row.occurred_at),
    by: row.actor_name ?? '',
    byId: row.actor_user_id ?? null,
    summary: row.summary,
  }
}

export function mapFollowUp(row: Row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    dueAt: iso(row.due_at),
    method: row.method,
    reason: row.reason,
    reminder: row.reminder ?? '',
    status: row.status,
    createdAt: iso(row.created_at),
    createdBy: row.created_by_name ?? '',
    completedAt: row.completed_at ? iso(row.completed_at) : undefined,
    outcome: row.outcome ?? undefined,
    latestResponse: row.latest_response ?? undefined,
    newRequirements: row.new_requirements ?? undefined,
    concerns: row.concerns ?? undefined,
    updatedBudget: row.updated_budget === null ? null : num(row.updated_budget),
    purchaseReadiness: row.purchase_readiness ?? undefined,
    agreedNextSteps: row.agreed_next_steps ?? undefined,
  }
}

export function mapAssignment(row: Row) {
  return {
    handoverId: row.id,
    leadId: row.lead_id,
    salesRepId: row.sales_rep_id,
    salesRepName: row.sales_rep_name ?? '',
    salesManagerId: row.sales_manager_id ?? null,
    assignedAt: iso(row.assigned_at),
    assignedBy: row.assigned_by ?? null,
    expectedFirstContact: row.expected_first_contact ? iso(row.expected_first_contact) : null,
    firstContactAt: row.first_contact_at ? iso(row.first_contact_at) : null,
    handoffNote: row.handoff_note ?? '',
    salesStatus: row.sales_status,
    dealStatus: row.deal_status ?? undefined,
    lastContact: row.last_contact ? iso(row.last_contact) : null,
    nextAction: row.next_action ?? '',
    nextFollowUp: row.next_follow_up ? iso(row.next_follow_up) : null,
    requirementSummary: row.requirement_summary ?? '',
    communicationStatus: row.communication_status ?? '',
    reassignmentRequired: Boolean(row.reassignment_required),
    handoverHistory: row.handover_history ?? [],
    contactAttempts: row.contact_attempts ?? [],
    reassignments: row.reassignments ?? [],
    supervisoryNotes: row.supervisory_notes ?? [],
    customerNotifications: row.customer_notifications ?? [],
    notifications: row.notifications ?? [],
    isCurrent: Boolean(row.is_current),
  }
}

export function mapCustomer(row: Row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    company: row.company ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    location: row.city ?? row.address ?? '',
    industry: row.industry ?? '',
    source: row.source ?? '',
    campaignId: row.campaign_id ?? null,
    product: row.product ?? '',
    leadId: row.lead_id ?? row.source_lead_id ?? '',
    salesRepId: row.owner_user_id ?? '',
    status: row.status === 'active' ? 'Active' : row.status,
    notes: row.notes ?? '',
    createdAt: iso(row.created_at),
  }
}

export function mapCampaign(row: Row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    objective: row.objective ?? '',
    channel: row.channel,
    audience: row.audience ?? '',
    productId: row.product_id ?? null,
    product: row.product_text ?? '',
    startDate: dateOnly(row.start_date),
    endDate: dateOnly(row.end_date),
    budget: num(row.budget),
    spend: num(row.spend),
    status: row.status,
    ownerUserId: row.owner_user_id ?? null,
    owner: row.owner_name ?? '',
    kpis: row.kpis ?? {},
    leads: num(row.leads),
    qualifiedLeads: num(row.qualified_leads),
    conversions: num(row.conversions),
    convertedValue: num(row.converted_value),
    roiPercent: row.roi_percent === null || row.roi_percent === undefined ? null : num(row.roi_percent),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function mapOffer(row: Row) {
  return {
    id: row.id,
    code: row.code,
    campaignId: row.campaign_id ?? null,
    campaignName: row.campaign_name ?? '',
    title: row.title,
    description: row.description ?? '',
    offerType: row.offer_type,
    discountPercent: row.discount_percent === null ? null : num(row.discount_percent),
    discountAmount: row.discount_amount === null ? null : num(row.discount_amount),
    productId: row.product_id ?? null,
    validFrom: row.valid_from ? dateOnly(row.valid_from) : '',
    validTo: row.valid_to ? dateOnly(row.valid_to) : '',
    status: row.status,
    createdBy: row.created_by ?? null,
    createdAt: iso(row.created_at),
  }
}

export function mapDiscount(row: Row) {
  return {
    id: row.id,
    code: row.code,
    offerId: row.offer_id ?? null,
    customerId: row.customer_id ?? null,
    customerName: row.customer_name ?? '',
    salesOrderId: row.sales_order_id ?? null,
    requestedBy: row.requested_by ?? null,
    requestedByName: row.requested_by_name ?? '',
    requestedPercent: num(row.requested_percent),
    approvedPercent: row.approved_percent === null ? null : num(row.approved_percent),
    status: row.status,
    reason: row.reason,
    decidedAt: row.decided_at ? iso(row.decided_at) : null,
    decidedBy: row.decided_by ?? null,
    decidedByName: row.decided_by_name ?? '',
    createdAt: iso(row.created_at),
  }
}

export function mapPlanActivity(row: Row) {
  return {
    id: row.id,
    planId: row.plan_id,
    type: row.activity_type,
    name: row.name,
    objective: row.objective ?? '',
    targetAudience: row.target_audience ?? '',
    plannedActivities: row.planned_activities ?? '',
    expectedLeads: num(row.expected_leads),
    expectedConversions: num(row.expected_conversions),
    monthlyTarget: num(row.monthly_target),
    estimatedBudget: num(row.estimated_budget),
    expectedOutcome: row.expected_outcome ?? '',
    startDate: row.start_date ? dateOnly(row.start_date) : '',
    endDate: row.end_date ? dateOnly(row.end_date) : '',
    supportingNotes: row.supporting_notes ?? '',
    completedActivities: num(row.completed_activities),
    actualLeads: num(row.actual_leads),
    qualifiedLeads: num(row.qualified_leads),
    completedFieldVisits: num(row.completed_field_visits),
    tradePartnerVisits: num(row.trade_partner_visits),
    actualSpending: num(row.actual_spending),
    executionPercent: num(row.execution_percent),
    results: row.results ?? '',
  }
}

export function mapPlan(row: Row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    month: row.month,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    employeeRole: row.employee_role ?? '',
    roleId: row.role_id ?? 'junior',
    seniorReviewerId: row.senior_reviewer_id ?? null,
    objective: row.objective ?? '',
    targetAudience: row.target_audience ?? '',
    plannedActivities: row.planned_activities ?? '',
    expectedLeads: num(row.expected_leads),
    expectedConversions: num(row.expected_conversions),
    monthlyTarget: num(row.monthly_target),
    estimatedBudget: num(row.estimated_budget),
    requestedAmount: num(row.requested_amount),
    expectedOutcome: row.expected_outcome ?? '',
    startDate: row.start_date ? dateOnly(row.start_date) : '',
    endDate: row.end_date ? dateOnly(row.end_date) : '',
    supportingNotes: row.supporting_notes ?? '',
    status: row.status,
    financeRequired: Boolean(row.finance_required),
    revisionReason: row.revision_reason ?? '',
    currentApprover: row.current_approver_name ?? null,
    previousApprover: row.previous_approver_name ?? null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    submittedAt: row.submitted_at ? iso(row.submitted_at) : null,
    resultsSubmittedAt: row.results_submitted_at ? iso(row.results_submitted_at) : null,
    completedAt: row.completed_at ? iso(row.completed_at) : null,
    activities: [],
    approvals: [],
    execution: {
      startedAt: row.execution_started_at ? iso(row.execution_started_at) : null,
      completedActivities: num(row.completed_activities),
      actualLeads: num(row.actual_leads),
      qualifiedLeads: num(row.qualified_leads),
      completedFieldVisits: num(row.completed_field_visits),
      tradePartnerVisits: num(row.trade_partner_visits),
      actualSpending: num(row.actual_spending),
      executionPercent: num(row.execution_percent),
      results: row.results ?? '',
      remarks: row.execution_remarks ?? '',
      updatedAt: row.updated_at ? iso(row.updated_at) : null,
    },
  }
}

export function mapPlanApproval(row: Row) {
  return {
    id: row.id,
    stage: row.stage,
    action: row.action,
    byRoleId: row.by_role ?? 'employee',
    byName: row.by_name ?? '',
    at: iso(row.occurred_at),
    decision: row.decision,
    comments: row.comments ?? '',
  }
}

export function mapMarketingExpense(row: Row) {
  return {
    id: row.id,
    code: row.code,
    source: row.source,
    title: row.title,
    planId: row.plan_id ?? '',
    planTitle: row.plan_title ?? '',
    activityId: row.plan_activity_id ?? null,
    activityName: row.activity_name ?? '',
    activityType: row.activity_type ?? '',
    campaignId: row.campaign_id ?? null,
    campaignName: row.campaign_name ?? '',
    employeeId: row.employee_id ?? '',
    employeeName: row.employee_name ?? '',
    roleId: row.role_id ?? 'junior',
    category: row.category,
    vendorName: row.vendor_name ?? '',
    amount: num(row.amount),
    currency: row.currency,
    expenseDate: dateOnly(row.expense_date),
    description: row.description,
    documentPath: row.document_path ?? '',
    status: row.status,
    managerRequired: Boolean(row.manager_required),
    financeRequired: Boolean(row.finance_required),
    submittedAt: row.submitted_at ? iso(row.submitted_at) : null,
    reviewerComments: row.reviewer_comments ?? '',
    currentApprover: row.current_approver_name ?? null,
    decidedAt: row.decided_at ? iso(row.decided_at) : null,
    approvals: [],
  }
}

export function mapTarget(row: Row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? '',
    periodStart: dateOnly(row.period_start),
    periodEnd: dateOnly(row.period_end),
    metric: row.metric,
    targetValue: num(row.target_value),
    achievedValue: num(row.achieved_value),
    unit: row.unit,
    notes: row.notes ?? '',
    planId: row.plan_id ?? null,
    createdAt: iso(row.created_at),
  }
}

export function mapRewardWallet(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    currency: row.currency,
    balance: num(row.balance),
    totalAwarded: num(row.total_awarded),
    totalRedeemed: num(row.total_redeemed),
    lastTransactionAt: row.last_transaction_at ? iso(row.last_transaction_at) : null,
  }
}

export function mapRewardTransaction(row: Row) {
  return {
    id: row.id,
    walletId: row.wallet_id,
    employeeId: row.employee_id,
    entryType: row.entry_type,
    amount: num(row.amount),
    balanceAfter: num(row.balance_after),
    referenceType: row.reference_type ?? '',
    referenceId: row.reference_id ?? null,
    note: row.note ?? '',
    createdBy: row.created_by ?? null,
    createdByName: row.created_by_name ?? '',
    createdAt: iso(row.created_at),
  }
}

export function mapFieldVisit(row: Row) {
  return {
    id: row.id,
    code: row.code,
    business: row.business,
    contact: row.contact_name ?? '',
    contactPhone: row.contact_phone ?? '',
    leadId: row.lead_id ?? null,
    customerId: row.customer_id ?? null,
    purpose: row.purpose ?? '',
    type: row.visit_type,
    date: dateOnly(row.visit_date),
    time: row.visit_time ?? '',
    location: row.location ?? '',
    checkInAt: row.check_in_at ? iso(row.check_in_at) : null,
    checkOutAt: row.check_out_at ? iso(row.check_out_at) : null,
    assignedTo: row.assigned_to ?? '',
    assignedToName: row.assigned_to_name ?? '',
    notes: row.notes ?? '',
    demoFollowUp: row.demo_follow_up ?? '',
    checklist: row.checklist ?? [],
    outcome: row.outcome ?? '',
    competitorBrands: row.competitor_brands ?? '',
    samplesDispensed: row.samples_dispensed ?? '',
    status: row.status,
    createdAt: iso(row.created_at),
  }
}

export function mapSurvey(row: Row) {
  return {
    id: row.id,
    competitor: row.competitor,
    regionId: row.region_id ?? null,
    region: row.region_text ?? row.region_name ?? '',
    observation: row.observation,
    productFeedback: row.product_feedback ?? '',
    interest: row.interest,
    pricingObservation: row.pricing_observation ?? '',
    submittedBy: row.submitted_by ?? '',
    submittedByName: row.submitter_name ?? '',
    date: dateOnly(row.survey_date),
  }
}

export function mapDealer(row: Row) {
  return {
    id: row.id,
    code: row.code,
    businessName: row.business_name,
    contactName: row.contact_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    address: row.address ?? '',
    category: row.category ?? '',
    stage: row.stage,
    leadId: row.lead_id ?? null,
    customerId: row.customer_id ?? null,
    ownerUserId: row.owner_user_id ?? null,
    ownerName: row.owner_name ?? '',
    notes: row.notes ?? '',
    nextFollowUp: row.next_follow_up ? dateOnly(row.next_follow_up) : '',
    createdAt: iso(row.created_at),
  }
}

export function mapActivityRecord(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id ?? '',
    employeeName: row.employee_name ?? '',
    activityType: row.activity_type,
    subject: row.subject,
    detail: row.detail ?? '',
    referenceType: row.reference_type ?? '',
    referenceId: row.reference_id ?? null,
    occurredAt: iso(row.occurred_at),
    createdAt: iso(row.created_at),
  }
}
