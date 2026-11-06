import type {
  Campaign,
  Lead,
  LeadActivity,
  LeadFollowUp,
  LeadPriority,
  LeadSource,
  LeadSourceCategory,
  LeadStatus,
  Opportunity,
} from '../types/marketing'
import { isOpen, leadConversionRate, safeDivide } from './analytics'
import { MS_PER_DAY, startOfToday } from './dates'

export type BoardStageId =
  | 'new'
  | 'follow-up'
  | 'qualified'
  | 'sent-to-sales'
  | 'converted'
  | 'rejected'
  | 'lost'

export interface BoardStage {
  id: BoardStageId
  label: string
  description: string
  tone: string
}

/** The four sequential marketing stages. Outcomes are tracked separately. */
export const LEAD_BOARD_STAGES: BoardStage[] = [
  { id: 'new', label: 'New Leads', description: 'Captured, not yet contacted', tone: 'var(--chart-1)' },
  { id: 'follow-up', label: 'Follow-up', description: 'In conversation with the customer', tone: 'var(--chart-3)' },
  { id: 'qualified', label: 'Qualified', description: 'Requirements and fit confirmed', tone: 'var(--chart-6)' },
  { id: 'sent-to-sales', label: 'Sent to Sales', description: 'Assigned with a handoff note', tone: 'var(--chart-2)' },
]

/** Closed outcomes shown as filtered views, never as sequential columns. */
export const LEAD_OUTCOME_STAGES: BoardStage[] = [
  { id: 'converted', label: 'Converted', description: 'Customer conversion completed', tone: 'var(--chart-7)' },
  { id: 'rejected', label: 'Rejected', description: 'Disqualified or not interested', tone: 'var(--chart-4)' },
  { id: 'lost', label: 'Lost by sales', description: 'Sales concluded without a deal', tone: 'var(--chart-8)' },
]

export const LEAD_ALL_STAGES: BoardStage[] = [...LEAD_BOARD_STAGES, ...LEAD_OUTCOME_STAGES]

export const REJECTION_REASONS = [
  'Customer is not interested',
  'Lead does not meet qualification requirements',
  'Incorrect or invalid contact information',
  'Duplicate lead',
  'Product or service does not match the customer’s requirements',
  'Customer is not eligible',
  'Other documented reason',
] as const

export type RejectionReason = (typeof REJECTION_REASONS)[number]

export const LEAD_STATUS_OPTIONS: LeadStatus[] = [
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
]

export const LEAD_SOURCE_OPTIONS: LeadSource[] = [
  'Website',
  'Website Enquiry',
  'WhatsApp',
  'Social Media',
  'Campaign',
  'Digital Campaign',
  'Referral',
  'Events',
  'Trade Event',
  'Field Visit',
  'Retail Activity',
  'Manual Entry',
  'Other',
]

/** The seven canonical source categories used by workflow attribution. */
export const LEAD_SOURCE_CATEGORIES: LeadSourceCategory[] = [
  'Digital Marketing',
  'Field Marketing',
  'Trade Marketing',
  'Campaign',
  'Website',
  'Referral',
  'Other',
]

export function sourceCategoryForSource(source: LeadSource | string): LeadSourceCategory {
  switch (source) {
    case 'Digital Campaign':
    case 'Social Media':
    case 'WhatsApp':
      return 'Digital Marketing'
    case 'Field Visit':
      return 'Field Marketing'
    case 'Trade Event':
    case 'Retail Activity':
      return 'Trade Marketing'
    case 'Campaign':
    case 'Events':
      return 'Campaign'
    case 'Website':
    case 'Website Enquiry':
      return 'Website'
    case 'Referral':
      return 'Referral'
    default:
      return 'Other'
  }
}

export const LEAD_PRIORITY_OPTIONS: LeadPriority[] = ['Urgent', 'High', 'Medium', 'Low']

export const SALES_HANDOFF_STATUSES = [
  'Assigned',
  'Contacted',
  'Meeting Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
] as const

export const FOLLOW_UP_METHODS: LeadFollowUp['method'][] = [
  'Call',
  'WhatsApp',
  'Email',
  'Meeting',
  'Visit',
  'Other',
]

export function normalizeLead(lead: Lead): Lead {
  return {
    ...lead,
    generatedBy: lead.generatedBy ?? lead.assignedTo ?? '',
    sourceCategory: lead.sourceCategory ?? sourceCategoryForSource(lead.source),
    sourceDetail: lead.sourceDetail ?? '',
    marketingActivity: lead.marketingActivity ?? '',
    city: lead.city ?? lead.location.split(',')[0]?.trim() ?? '',
    state: lead.state ?? lead.location.split(',')[1]?.trim() ?? '',
    country: lead.country ?? (lead.location ? 'India' : ''),
    interests: {
      products: lead.interests?.products?.length
        ? lead.interests.products
        : lead.product
          ? [lead.product]
          : [],
      category: lead.interests?.category ?? '',
      features: lead.interests?.features ?? [],
      preferredBrand: lead.interests?.preferredBrand ?? '',
      likes: lead.interests?.likes ?? [],
      dislikes: lead.interests?.dislikes ?? [],
      requirements: lead.interests?.requirements ?? [],
      priceRange: lead.interests?.priceRange ?? '',
      budget: lead.interests?.budget ?? null,
      preferredChannel: lead.interests?.preferredChannel ?? '',
      preferredContactTime: lead.interests?.preferredContactTime ?? '',
      preferredLanguage: lead.interests?.preferredLanguage ?? '',
      purchasePurpose: lead.interests?.purchasePurpose ?? '',
      expectedPurchaseDate: lead.interests?.expectedPurchaseDate ?? '',
      specialRequirements: lead.interests?.specialRequirements ?? '',
      questions: lead.interests?.questions ?? [],
      problems: lead.interests?.problems ?? [],
      summary: lead.interests?.summary ?? '',
    },
    qualification: {
      intent: lead.qualification?.intent ?? 'Unknown',
      estimatedValue: lead.qualification?.estimatedValue ?? null,
      budgetRange: lead.qualification?.budgetRange ?? '',
      decisionAuthority: lead.qualification?.decisionAuthority ?? 'Unknown',
      purchaseTimeline: lead.qualification?.purchaseTimeline ?? '',
      notes: lead.qualification?.notes ?? lead.notes,
      mainRequirement: lead.qualification?.mainRequirement ?? lead.notes,
      reasonForInterest: lead.qualification?.reasonForInterest ?? '',
      reasonForRejection: lead.qualification?.reasonForRejection ?? lead.lostReason ?? '',
    },
    attribution: {
      campaignName: lead.attribution?.campaignName ?? '',
      adSource: lead.attribution?.adSource ?? '',
      landingPage: lead.attribution?.landingPage ?? '',
      firstContactDate: lead.attribution?.firstContactDate ?? lead.createdAt,
      latestContactDate: lead.attribution?.latestContactDate ?? lead.lastContact,
      referrerName: lead.attribution?.referrerName ?? '',
      referrerContact: lead.attribution?.referrerContact ?? '',
      notes: lead.attribution?.notes ?? '',
    },
    followUps: lead.followUps ?? [],
    activities: lead.activities ?? [],
  }
}

export function boardStageFor(lead: Lead): BoardStageId {
  if (lead.status === 'Converted' || lead.converted) return 'converted'
  // A marketing rejection and a lost sales deal are different outcomes.
  if (lead.status === 'Rejected' || lead.status === 'Not Interested') return 'rejected'
  if (lead.status === 'Lost') return 'lost'
  if (lead.status === 'Sent to Sales' || lead.salesAssignment) return 'sent-to-sales'
  if (lead.status === 'Qualified') return 'qualified'
  if (lead.status === 'New') return 'new'
  return 'follow-up'
}

export function statusForBoardStage(stage: BoardStageId): LeadStatus {
  switch (stage) {
    case 'new':
      return 'New'
    case 'follow-up':
      return 'Follow-up Required'
    case 'qualified':
      return 'Qualified'
    case 'sent-to-sales':
      return 'Sent to Sales'
    case 'converted':
      return 'Converted'
    case 'rejected':
      return 'Rejected'
    case 'lost':
      return 'Lost'
  }
}

export function boardStageLabel(stage: BoardStageId): string {
  return LEAD_ALL_STAGES.find((item) => item.id === stage)?.label ?? stage
}

export function isOutcomeStage(stage: BoardStageId): boolean {
  return LEAD_OUTCOME_STAGES.some((item) => item.id === stage)
}

/** Date shown for a completed conversion, including older saved records. */
export function leadConversionDate(lead: Lead): string | null {
  if (lead.conversion?.convertedAt) return lead.conversion.convertedAt
  const conversionActivity = [...(lead.activities ?? [])]
    .filter((activity) => activity.type === 'Conversion')
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]
  return conversionActivity?.at ?? (lead.converted ? lead.lastContact || lead.createdAt : null)
}

/** Date a marketing rejection was recorded, including older saved records. */
export function leadRejectionDate(lead: Lead): string | null {
  if (lead.rejection?.rejectedAt) return lead.rejection.rejectedAt
  const rejectedActivity = [...(lead.activities ?? [])]
    .filter((activity) => /rejected/i.test(activity.summary))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]
  return rejectedActivity?.at ?? lead.lastContact ?? null
}

/** Date a sales deal was closed as Lost, where the assignment records it. */
export function leadLostDate(lead: Lead): string | null {
  if (lead.status !== 'Lost') return null
  if (lead.salesAssignment?.updatedAt) return lead.salesAssignment.updatedAt
  const lostActivity = [...(lead.activities ?? [])]
    .filter((activity) => activity.type === 'Sales Update' && /lost/i.test(activity.summary))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]
  return lostActivity?.at ?? lead.lastContact ?? null
}

export function leadNameList(lead: Lead): string {
  return lead.interests?.products?.length ? lead.interests.products.join(', ') : lead.product || 'Not recorded'
}

export function leadLocation(lead: Lead): string {
  const parts = [lead.city || lead.location, lead.state, lead.country].filter(Boolean)
  return [...new Set(parts)].join(', ')
}

export function primaryRequirement(lead: Lead): string {
  return (
    lead.qualification?.mainRequirement ||
    lead.interests?.summary ||
    lead.notes ||
    lead.qualification?.notes ||
    'Requirement not recorded yet'
  )
}

/** True when a real requirement is recorded, not just a generic lead note. */
export function hasRecordedRequirement(lead: Lead): boolean {
  return Boolean(
    lead.qualification?.mainRequirement?.trim() ||
      lead.interests?.requirements?.length ||
      lead.interests?.summary?.trim(),
  )
}

export interface QualificationSignal {
  label: string
  present: boolean
  hint: string
}

export interface QualificationReadiness {
  score: number
  available: number
  total: number
  signals: QualificationSignal[]
  missing: QualificationSignal[]
}

/**
 * A transparent, field-based indicator. It never changes the lead status on its
 * own and only reflects information an employee has actually recorded.
 */
export function qualificationReadiness(lead: Lead): QualificationReadiness {
  const signals: QualificationSignal[] = [
    { label: 'Contact details', present: Boolean(lead.phone && lead.email), hint: 'Phone and email recorded' },
    { label: 'Product interest', present: Boolean(lead.product || lead.interests?.products?.length), hint: 'Product or service captured' },
    { label: 'Requirement', present: Boolean(lead.qualification?.mainRequirement || lead.interests?.summary || lead.notes), hint: 'Customer need described' },
    { label: 'Budget', present: Boolean(lead.interests?.budget || lead.qualification?.estimatedValue || lead.qualification?.budgetRange || lead.interests?.priceRange), hint: 'Budget or price range recorded' },
    { label: 'Purchase timeline', present: Boolean(lead.qualification?.purchaseTimeline || lead.interests?.expectedPurchaseDate), hint: 'Expected purchase date or timeline' },
    { label: 'Decision authority', present: Boolean(lead.qualification?.decisionAuthority && lead.qualification.decisionAuthority !== 'Unknown'), hint: 'Who can approve the purchase' },
    { label: 'Purchase intent', present: Boolean(lead.qualification?.intent && lead.qualification.intent !== 'Unknown'), hint: 'How interested the customer is' },
    { label: 'Follow-up scheduled', present: Boolean(lead.nextFollowUp), hint: 'A next contact date is set' },
    { label: 'Attribution', present: Boolean(lead.campaignId || (lead.source && lead.source !== 'Other' && lead.source !== 'Manual Entry')), hint: 'Source or campaign is known' },
    { label: 'Preferred channel', present: Boolean(lead.interests?.preferredChannel), hint: 'How the customer prefers to be contacted' },
  ]
  const available = signals.filter((signal) => signal.present).length
  return {
    score: Math.round((available / signals.length) * 100),
    available,
    total: signals.length,
    signals,
    missing: signals.filter((signal) => !signal.present),
  }
}

export interface FollowUpView extends LeadFollowUp {
  leadId: string
  leadName: string
  company: string
  displayStatus: 'Overdue' | 'Due Today' | 'Upcoming' | 'Completed' | 'Cancelled'
  isImplicit: boolean
}

export function followUpDisplayStatus(followUp: LeadFollowUp): FollowUpView['displayStatus'] {
  if (followUp.status === 'Completed') return 'Completed'
  if (followUp.status === 'Cancelled') return 'Cancelled'
  const due = new Date(followUp.dueAt)
  due.setHours(0, 0, 0, 0)
  const today = startOfToday().getTime()
  if (due.getTime() < today) return 'Overdue'
  if (due.getTime() === today) return 'Due Today'
  return 'Upcoming'
}

export function leadFollowUpViews(lead: Lead): FollowUpView[] {
  const recorded = (lead.followUps ?? []).map<FollowUpView>((followUp) => ({
    ...followUp,
    leadId: lead.id,
    leadName: lead.name,
    company: lead.company,
    displayStatus: followUpDisplayStatus(followUp),
    isImplicit: false,
  }))

  const hasOpenRecordForNext = recorded.some(
    (followUp) =>
      followUp.status === 'Scheduled' &&
      lead.nextFollowUp &&
      Math.abs(new Date(followUp.dueAt).getTime() - new Date(lead.nextFollowUp).getTime()) < 60_000,
  )

  if (lead.nextFollowUp && !hasOpenRecordForNext && isOpen(lead.status)) {
    const implicit: LeadFollowUp = {
      id: `implicit-${lead.id}-${lead.nextFollowUp}`,
      dueAt: lead.nextFollowUp,
      method: 'Call',
      reason: 'Next follow-up recorded on the lead.',
      status: 'Scheduled',
      createdAt: lead.createdAt,
      createdBy: lead.assignedTo,
    }
    recorded.push({
      ...implicit,
      leadId: lead.id,
      leadName: lead.name,
      company: lead.company,
      displayStatus: followUpDisplayStatus(implicit),
      isImplicit: true,
    })
  }

  return recorded.sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime())
}

export function allFollowUpViews(leads: Lead[]): FollowUpView[] {
  return leads.flatMap((lead) => leadFollowUpViews(lead))
}

export interface DuplicateCandidate {
  lead: Lead
  reasons: string[]
}

export function duplicateCandidates(
  leads: Lead[],
  values: { name?: string; email?: string; phone?: string; company?: string },
  excludeLeadId?: string,
): DuplicateCandidate[] {
  const email = (values.email ?? '').trim().toLowerCase()
  const phone = (values.phone ?? '').replace(/[^\d]/g, '')
  const name = (values.name ?? '').trim().toLowerCase()
  const company = (values.company ?? '').trim().toLowerCase()

  return leads
    .filter((lead) => lead.id !== excludeLeadId)
    .map<DuplicateCandidate | null>((lead) => {
      const reasons: string[] = []
      if (email && lead.email.trim().toLowerCase() === email) reasons.push('same email')
      if (phone && lead.phone.replace(/[^\d]/g, '') === phone) reasons.push('same phone')
      if (name && company && lead.name.trim().toLowerCase() === name && lead.company.trim().toLowerCase() === company) {
        reasons.push('same name and company')
      }
      return reasons.length ? { lead, reasons } : null
    })
    .filter((item): item is DuplicateCandidate => Boolean(item))
}

export function handoffNoteTemplate(lead: Lead, campaigns: Campaign[], salesRepName?: string): string {
  const products = lead.interests?.products?.length ? lead.interests.products.join(', ') : lead.product
  const requirement = lead.qualification?.mainRequirement || lead.notes
  const budget =
    lead.interests?.budget !== null && lead.interests?.budget !== undefined
      ? `₹${lead.interests.budget.toLocaleString('en-IN')}`
      : lead.qualification?.budgetRange || lead.interests?.priceRange || ''
  const channel = lead.interests?.preferredChannel || ''
  const timeline = lead.qualification?.purchaseTimeline || lead.interests?.expectedPurchaseDate || ''
  const campaign = campaigns.find((item) => item.id === lead.campaignId)?.name

  const lines = [
    `Customer is interested in ${products || 'the recorded product interest'}.`,
    requirement ? `Recorded requirement: ${requirement}` : '',
    budget ? `Budget recorded: ${budget}.` : '',
    timeline ? `Expected purchase timeline: ${timeline}.` : '',
    channel ? `Preferred contact channel: ${channel}.` : '',
    campaign ? `Source campaign: ${campaign}.` : '',
    lead.qualification?.notes && lead.qualification.notes !== requirement
      ? `Qualification notes: ${lead.qualification.notes}`
      : '',
    salesRepName ? `Please continue the conversation as ${salesRepName}.` : '',
  ].filter(Boolean)

  return lines.join(' ')
}

export interface SourceAnalyticsRow {
  source: string
  total: number
  qualified: number
  sentToSales: number
  converted: number
  conversionRate: number | null
  assignmentRate: number | null
}

export function sourceAnalytics(leads: Lead[]): SourceAnalyticsRow[] {
  const map = new Map<string, Lead[]>()
  leads.forEach((lead) => {
    const key = lead.source || 'Unattributed'
    map.set(key, [...(map.get(key) ?? []), lead])
  })
  return [...map.entries()]
    .map(([source, rows]) => {
      const qualified = rows.filter((lead) =>
        ['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status),
      ).length
      const sentToSales = rows.filter((lead) => Boolean(lead.salesAssignment) || ['Sent to Sales', 'Converted', 'Lost'].includes(lead.status)).length
      const converted = rows.filter((lead) => lead.status === 'Converted' || lead.converted).length
      return {
        source,
        total: rows.length,
        qualified,
        sentToSales,
        converted,
        conversionRate: leadConversionRate(converted, rows.length),
        assignmentRate: leadConversionRate(sentToSales, rows.length),
      }
    })
    .sort((a, b) => b.total - a.total)
}

export interface CampaignAnalyticsRow {
  campaign: Campaign
  leads: number
  qualified: number
  sentToSales: number
  converted: number
  wonValue: number
  conversionRate: number | null
  assignmentRate: number | null
  followUpCompletionRate: number | null
}

export function campaignAnalytics(
  campaigns: Campaign[],
  leads: Lead[],
  opportunities: Opportunity[],
): CampaignAnalyticsRow[] {
  return campaigns
    .filter((campaign) => campaign.status !== 'Archived')
    .map((campaign) => {
      const campaignLeads = leads.filter((lead) => lead.campaignId === campaign.id)
      const qualified = campaignLeads.filter((lead) =>
        ['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status),
      ).length
      const sentToSales = campaignLeads.filter(
        (lead) => Boolean(lead.salesAssignment) || ['Sent to Sales', 'Converted', 'Lost'].includes(lead.status),
      ).length
      const converted = campaignLeads.filter((lead) => lead.status === 'Converted' || lead.converted).length
      const wonValue = opportunities
        .filter(
          (opportunity) =>
            opportunity.stage === 'Won' &&
            campaignLeads.some((lead) => lead.id === opportunity.leadId),
        )
        .reduce((sum, opportunity) => sum + opportunity.value, 0)
      const followUps = campaignLeads.flatMap((lead) => lead.followUps ?? [])
      const completed = followUps.filter((followUp) => followUp.status === 'Completed').length
      return {
        campaign,
        leads: campaignLeads.length,
        qualified,
        sentToSales,
        converted,
        wonValue,
        conversionRate: leadConversionRate(converted, campaignLeads.length),
        assignmentRate: leadConversionRate(sentToSales, campaignLeads.length),
        followUpCompletionRate: followUps.length ? (completed / followUps.length) * 100 : null,
      }
    })
    .sort((a, b) => b.leads - a.leads)
}

export interface BoardFunnelStage {
  label: string
  value: number
  description: string
}

export function leadFunnel(leads: Lead[]): BoardFunnelStage[] {
  const total = leads.length
  const contacted = leads.filter(
    (lead) =>
      Boolean(lead.activities?.length) ||
      !['New', 'Rejected', 'Not Interested', 'Lost'].includes(lead.status),
  ).length
  const qualified = leads.filter((lead) =>
    ['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status),
  ).length
  const sent = leads.filter(
    (lead) => Boolean(lead.salesAssignment) || ['Sent to Sales', 'Converted', 'Lost'].includes(lead.status),
  ).length
  const converted = leads.filter((lead) => lead.status === 'Converted' || lead.converted).length
  return [
    { label: 'Captured', value: total, description: 'All leads in this view' },
    { label: 'Contacted', value: Math.max(contacted, qualified), description: 'Has contact activity or advanced status' },
    { label: 'Qualified', value: Math.max(qualified, sent), description: 'Marketing-qualified' },
    { label: 'Sent to sales', value: Math.max(sent, converted), description: 'Assigned with handoff' },
    { label: 'Converted', value: converted, description: 'Won deal or customer created' },
  ]
}

export interface TrendPoint {
  label: string
  leads: number
  qualified: number
  converted: number
}

export function weeklyLeadTrend(leads: Lead[], weeks = 8): TrendPoint[] {
  const now = startOfToday()
  const points: TrendPoint[] = []
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const end = new Date(now.getTime() - index * 7 * MS_PER_DAY + MS_PER_DAY - 1)
    const start = new Date(end.getTime() - 6 * MS_PER_DAY)
    start.setHours(0, 0, 0, 0)
    const rows = leads.filter((lead) => {
      const at = new Date(lead.createdAt).getTime()
      return at >= start.getTime() && at <= end.getTime()
    })
    points.push({
      label: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(start),
      leads: rows.length,
      qualified: rows.filter((lead) => ['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status)).length,
      converted: rows.filter((lead) => lead.status === 'Converted').length,
    })
  }
  return points
}

export function monthlyLeadTrend(leads: Lead[], months = 6): TrendPoint[] {
  const now = startOfToday()
  const points: TrendPoint[] = []
  for (let index = months - 1; index >= 0; index -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - index + 1, 1)
    const rows = leads.filter((lead) => {
      const at = new Date(lead.createdAt).getTime()
      return at >= start.getTime() && at < end.getTime()
    })
    points.push({
      label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(start),
      leads: rows.length,
      qualified: rows.filter((lead) => ['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status)).length,
      converted: rows.filter((lead) => lead.status === 'Converted').length,
    })
  }
  return points
}

export interface LeadActivityFeedItem extends LeadActivity {
  leadId: string
  leadName: string
  company: string
}

export function leadActivityFeed(leads: Lead[], limit = 8): LeadActivityFeedItem[] {
  return leads
    .flatMap((lead) =>
      (lead.activities ?? []).map((activity) => ({
        ...activity,
        leadId: lead.id,
        leadName: lead.name,
        company: lead.company,
      })),
    )
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

export interface FollowUpTotals {
  dueToday: number
  upcoming: number
  overdue: number
  completed: number
  total: number
  completionRate: number | null
}

export function followUpTotals(followUps: FollowUpView[]): FollowUpTotals {
  const dueToday = followUps.filter((followUp) => followUp.displayStatus === 'Due Today').length
  const upcoming = followUps.filter((followUp) => followUp.displayStatus === 'Upcoming').length
  const overdue = followUps.filter((followUp) => followUp.displayStatus === 'Overdue').length
  const completed = followUps.filter((followUp) => followUp.displayStatus === 'Completed').length
  return {
    dueToday,
    upcoming,
    overdue,
    completed,
    total: followUps.length,
    completionRate: safeDivide(completed, followUps.length) === null ? null : (completed / Math.max(1, followUps.length)) * 100,
  }
}

export type DateRangeId = '7d' | '30d' | 'quarter' | 'year' | 'all' | 'custom'

export interface DateRangeValue {
  id: DateRangeId
  start: string
  end: string
}

export function dateRangeFor(id: DateRangeId): DateRangeValue {
  const end = new Date()
  const start = new Date()
  if (id === '7d') start.setDate(start.getDate() - 6)
  else if (id === '30d') start.setDate(start.getDate() - 29)
  else if (id === 'quarter') {
    const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3
    start.setMonth(quarterStartMonth, 1)
  } else if (id === 'year') {
    start.setMonth(0, 1)
  } else if (id === 'all') {
    start.setFullYear(2000, 0, 1)
  }
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { id, start: start.toISOString(), end: end.toISOString() }
}

export function inDateRange(value: string | null | undefined, range: DateRangeValue): boolean {
  if (!value) return false
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return false
  return time >= new Date(range.start).getTime() && time <= new Date(range.end).getTime()
}

export function filterLeads(
  leads: Lead[],
  options: {
    dateRange: DateRangeValue
    source?: string
    status?: string
    employee?: string
    campaign?: string
    priority?: string
    search?: string
  },
): Lead[] {
  const query = (options.search ?? '').trim().toLowerCase()
  return leads.filter((lead) => {
    if (options.dateRange.id !== 'all' && !inDateRange(lead.createdAt, options.dateRange)) return false
    if (options.source && options.source !== 'All' && lead.source !== options.source) return false
    if (options.status && options.status !== 'All' && lead.status !== options.status) return false
    if (options.employee && options.employee !== 'All' && lead.assignedTo !== options.employee) return false
    if (options.campaign && options.campaign !== 'All' && lead.campaignId !== options.campaign) return false
    if (options.priority && options.priority !== 'All' && lead.priority !== options.priority) return false
    if (query) {
      const haystack = [
        lead.name,
        lead.company,
        lead.phone,
        lead.email,
        lead.product,
        lead.assignedTo,
        lead.location,
        ...(lead.interests?.products ?? []),
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
}

export function leadOwnerOptions(leads: Lead[], currentUserName: string): string[] {
  const names = new Set<string>()
  if (currentUserName) names.add(currentUserName)
  leads.forEach((lead) => {
    if (lead.assignedTo) names.add(lead.assignedTo)
  })
  return [...names].sort((a, b) => a.localeCompare(b))
}
