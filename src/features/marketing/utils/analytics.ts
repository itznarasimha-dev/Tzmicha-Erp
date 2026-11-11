import type {
  Campaign,
  Lead,
  LeadStatus,
  Opportunity,
  Plan,
} from '../types/marketing'
import { clamp } from './format'
import { LEAD_SOURCE_CATEGORIES } from './leads'

export const LEAD_STAGES: LeadStatus[] = [
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

export const OPEN_LEAD_STAGES: LeadStatus[] = [
  'New',
  'Contacted',
  'Interested',
  'Follow-up Required',
  'Qualified',
  'Sent to Sales',
]

export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null
  }
  return numerator / denominator
}

export function campaignRoi(campaign: Campaign): number | null {
  const ratio = safeDivide(campaign.kpis.revenue - campaign.spend, campaign.spend)
  return ratio === null ? null : ratio * 100
}

export function campaignCpl(campaign: Campaign): number | null {
  return safeDivide(campaign.spend, campaign.kpis.leads)
}

export function campaignCpa(campaign: Campaign): number | null {
  return safeDivide(campaign.spend, campaign.kpis.conversions)
}

export function campaignCtr(campaign: Campaign): number | null {
  const ratio = safeDivide(campaign.kpis.clicks, campaign.kpis.impressions)
  return ratio === null ? null : ratio * 100
}

export function campaignConversionRate(campaign: Campaign): number | null {
  const ratio = safeDivide(campaign.kpis.conversions, campaign.kpis.leads)
  return ratio === null ? null : ratio * 100
}

export function budgetUtilisation(spent: number, budget: number): number | null {
  const ratio = safeDivide(spent, budget)
  return ratio === null ? null : ratio * 100
}

export function leadConversionRate(converted: number, total: number): number | null {
  const ratio = safeDivide(converted, total)
  return ratio === null ? null : ratio * 100
}

export interface LeadStats {
  total: number
  newLeads: number
  contacted: number
  qualified: number
  sentToSales: number
  converted: number
  lost: number
  rejected: number
  notInterested: number
  followUpRequired: number
  conversionRate: number | null
  highPriority: number
  dueToday: number
  overdue: number
}

export function computeLeadStats(leads: Lead[]): LeadStats {
  const total = leads.length
  const count = (status: LeadStatus) => leads.filter((l) => l.status === status).length
  const converted = count('Converted')
  // Lost is a sales outcome, not a marketing rejection.
  const rejected = leads.filter((l) => ['Rejected', 'Not Interested'].includes(l.status)).length
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueToday = leads.filter((lead) => {
    if (!lead.nextFollowUp || lead.converted) return false
    const due = new Date(lead.nextFollowUp)
    due.setHours(0, 0, 0, 0)
    return due.getTime() === today.getTime() && isOpen(lead.status)
  }).length
  const overdue = leads.filter((lead) => {
    if (!lead.nextFollowUp || lead.converted) return false
    return new Date(lead.nextFollowUp).getTime() < today.getTime() && isOpen(lead.status)
  }).length
  return {
    total,
    newLeads: count('New'),
    contacted: count('Contacted'),
    qualified: count('Qualified'),
    sentToSales: count('Sent to Sales'),
    converted,
    lost: count('Lost'),
    rejected,
    notInterested: count('Not Interested'),
    followUpRequired: count('Follow-up Required'),
    conversionRate: leadConversionRate(converted, total),
    highPriority: leads.filter((l) => (l.priority === 'High' || l.priority === 'Urgent') && isOpen(l.status)).length,
    dueToday,
    overdue,
  }
}

export function isOpen(status: LeadStatus): boolean {
  return OPEN_LEAD_STAGES.includes(status)
}

export function funnelData(leads: Lead[], opportunities: Opportunity[]) {
  const total = leads.length
  const engaged = leads.filter((l) => l.status !== 'New' && l.status !== 'Lost').length
  const qualified = leads.filter(
    (l) => ['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(l.status),
  ).length
  const opps = opportunities.length
  const converted = leads.filter((l) => l.status === 'Converted').length
  return [
    { stage: 'Leads', value: total },
    { stage: 'Contacted', value: Math.max(engaged, qualified) },
    { stage: 'Qualified', value: Math.max(qualified, opps) },
    { stage: 'Opportunities', value: Math.max(opps, converted) },
    { stage: 'Converted', value: converted },
  ]
}

export function leadSourceData(leads: Lead[]) {
  const map = new Map<string, { source: string; leads: number; converted: number }>()
  leads.forEach((lead) => {
    const existing = map.get(lead.source) ?? { source: lead.source, leads: 0, converted: 0 }
    existing.leads += 1
    if (lead.status === 'Converted') existing.converted += 1
    map.set(lead.source, existing)
  })
  return [...map.values()].sort((a, b) => b.leads - a.leads)
}

/** Canonical seven-category source attribution used by the workflow dashboard. */
export function leadSourceCategoryData(leads: Lead[]) {
  const map = new Map<
    string,
    { source: string; leads: number; qualified: number; converted: number }
  >()
  LEAD_SOURCE_CATEGORIES.forEach((category) => {
    map.set(category, { source: category, leads: 0, qualified: 0, converted: 0 })
  })
  leads.forEach((lead) => {
    const category = lead.sourceCategory ?? 'Other'
    const existing = map.get(category) ?? {
      source: category,
      leads: 0,
      qualified: 0,
      converted: 0,
    }
    existing.leads += 1
    if (['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status)) {
      existing.qualified += 1
    }
    if (lead.status === 'Converted' || lead.converted) existing.converted += 1
    map.set(category, existing)
  })
  return [...map.values()].sort((a, b) => b.leads - a.leads)
}

export function channelData(leads: Lead[]) {
  const map = new Map<string, { channel: string; leads: number }>()
  leads.forEach((lead) => {
    const bucket = channelBucket(lead.source)
    const existing = map.get(bucket) ?? { channel: bucket, leads: 0 }
    existing.leads += 1
    map.set(bucket, existing)
  })
  return [...map.values()].sort((a, b) => b.leads - a.leads)
}

export function channelBucket(source: string): string {
  if (source === 'Digital Campaign' || source === 'Website Enquiry' || source === 'Social Media')
    return 'Digital'
  if (source === 'Field Visit') return 'Field'
  if (source === 'Trade Event') return 'Events'
  if (source === 'Retail Activity') return 'Retail'
  if (source === 'Referral') return 'Referral'
  return 'Other'
}

export interface CampaignAttributionRow {
  campaign: Campaign
  leads: number
  qualified: number
  opportunities: number
  conversions: number
  revenue: number
  spend: number
  roi: number | null
  firstTouch: number
  lastTouch: number
  linear: number
}

export function attributionRows(
  campaigns: Campaign[],
  leads: Lead[],
  opportunities: Opportunity[],
): CampaignAttributionRow[] {
  return campaigns
    .filter((c) => c.status !== 'Archived')
    .map((campaign) => {
      const campaignLeads = leads.filter((l) => l.campaignId === campaign.id)
      const campaignOpps = opportunities.filter((o) => o.campaignId === campaign.id)
      const conversions = campaign.kpis.conversions
      return {
        campaign,
        leads: campaignLeads.length,
        qualified: campaignLeads.filter(
          (l) => l.status === 'Qualified' || l.status === 'Converted',
        ).length,
        opportunities: campaignOpps.length,
        conversions,
        revenue: campaign.kpis.revenue,
        spend: campaign.spend,
        roi: campaignRoi(campaign),
        firstTouch: 100,
        lastTouch: 100,
        linear: 100,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

export function modelCredit(
  model: 'First Touch' | 'Last Touch' | 'Linear',
): { label: string; weights: number[]; note: string } {
  if (model === 'First Touch') {
    return {
      label: 'First Touch',
      weights: [100, 0, 0],
      note: '100% of demo revenue credit is assigned to the campaign that first generated the lead.',
    }
  }
  if (model === 'Last Touch') {
    return {
      label: 'Last Touch',
      weights: [0, 0, 100],
      note: '100% of demo revenue credit is assigned to the touchpoint immediately before conversion.',
    }
  }
  return {
    label: 'Linear',
    weights: [34, 33, 33],
    note: 'Demo revenue credit is split evenly across the three recorded journey touchpoints.',
  }
}

export function weightedAttributedRevenue(campaign: Campaign, weights: number[]): number {
  return Math.round((campaign.kpis.revenue * weights[2]) / 100 + (campaign.kpis.revenue * weights[1]) / 100 + (campaign.kpis.revenue * weights[0]) / 100)
}

export function opportunityWeightedValue(opportunities: Opportunity[]): number {
  return opportunities.reduce((sum, opp) => sum + (opp.value * opp.probability) / 100, 0)
}

export function planTotals(plans: Plan[]) {
  const budget = plans.reduce((sum, p) => sum + p.budget, 0)
  const spent = plans.reduce((sum, p) => sum + p.spent, 0)
  return {
    budget,
    spent,
    remaining: budget - spent,
    utilisation: budgetUtilisation(spent, budget),
  }
}

export function campaignStatusCounts(campaigns: Campaign[]) {
  return {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'Active').length,
    completed: campaigns.filter((c) => c.status === 'Completed').length,
    planned: campaigns.filter((c) => c.status === 'Planned').length,
    paused: campaigns.filter((c) => c.status === 'Paused').length,
    draft: campaigns.filter((c) => c.status === 'Draft').length,
  }
}

export function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent' {
  const s = status.toLowerCase()
  if (
    [
      'active',
      'approved',
      'won',
      'converted',
      'completed',
      'paid',
      'published',
      'confirmed',
      'done',
      'distributed',
      'reimbursed',
      'approved — ready to execute',
      'approved - ready to execute',
    ].includes(s)
  )
    return 'success'
  if (
    [
      'pending',
      'pending approval',
      'pending senior review',
      'pending manager approval',
      'pending finance/admin approval',
      'pending admin financial authorization',
      'pending manager review',
      'pending finance review',
      'submitted for results review',
      'in review',
      'under review',
      'scheduled',
      'expiring soon',
      'follow-up required',
      'changes requested',
      'contacted',
      'interested',
      'in progress',
      'at risk',
      'negotiating',
      'submitted',
      'printing',
    ].includes(s)
  )
    return 'warning'
  if (
    ['rejected', 'lost', 'failed', 'overdue', 'expired', 'not interested', 'cancelled', 'delayed', 'declined'].includes(s)
  )
    return 'danger'
  if (['draft', 'archived', 'not started', 'not contacted', 'new', 'idea', 'closed', 'to do'].includes(s))
    return 'neutral'
  if (['qualified', 'proposal', 'negotiation', 'sent', 'sent to sales', 'ready', 'review', 'assigned', 'meeting scheduled'].includes(s)) return 'accent'
  return 'info'
}

export function scoreTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

export function growth(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function budgetHealth(spent: number, budget: number): 'healthy' | 'watch' | 'over' {
  const util = budgetUtilisation(spent, budget)
  if (util === null) return 'healthy'
  if (util > 100) return 'over'
  if (util >= 85) return 'watch'
  return 'healthy'
}

export function clampPercent(value: number): number {
  return clamp(value, 0, 100)
}
