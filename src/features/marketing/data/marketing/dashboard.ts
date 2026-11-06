import type { AppNotification, ChatMessage } from '../../types/marketing'
import { daysFromNow } from '../../utils/dates'
import { DEMO_WORKFLOW } from './workflow'

export interface PerformancePoint {
  month: string
  leads: number
  qualified: number
  conversions: number
  revenue: number
  spend: number
  campaigns: number
}

export interface BudgetPoint {
  month: string
  planned: number
  actual: number
}

export interface TargetPoint {
  month: string
  target: number
  achieved: number
}

export interface ChannelPoint {
  channel: string
  spend: number
  leads: number
  revenue: number
  roi: number
}

export interface ActivityPoint {
  id: string
  title: string
  detail: string
  at: string
  kind: 'campaign' | 'lead' | 'approval' | 'expense' | 'content'
}

export interface PriorityItem {
  id: string
  title: string
  meta: string
  due: string
  priority: 'High' | 'Medium' | 'Low'
  href: string
}

export interface AiRecommendation {
  id: string
  title: string
  body: string
  impact: string
  action: string
  href: string
  tone: 'indigo' | 'teal' | 'amber' | 'rose'
}

export const performanceSeries: PerformancePoint[] = [
  { month: 'May', leads: 138, qualified: 58, conversions: 24, revenue: 2240000, spend: 820000, campaigns: 5 },
  { month: 'Jun', leads: 164, qualified: 71, conversions: 29, revenue: 2980000, spend: 1060000, campaigns: 6 },
  { month: 'Jul', leads: 152, qualified: 63, conversions: 27, revenue: 2510000, spend: 940000, campaigns: 6 },
  { month: 'Aug', leads: 198, qualified: 86, conversions: 38, revenue: 3860000, spend: 1380000, campaigns: 7 },
  { month: 'Sep', leads: 231, qualified: 104, conversions: 46, revenue: 4520000, spend: 1560000, campaigns: 8 },
  { month: 'Oct', leads: 268, qualified: 121, conversions: 54, revenue: 5180000, spend: 1720000, campaigns: 9 },
]

export const budgetSeries: BudgetPoint[] = [
  { month: 'May', planned: 900000, actual: 820000 },
  { month: 'Jun', planned: 1100000, actual: 1060000 },
  { month: 'Jul', planned: 1000000, actual: 940000 },
  { month: 'Aug', planned: 1420000, actual: 1380000 },
  { month: 'Sep', planned: 1500000, actual: 1560000 },
  { month: 'Oct', planned: 1800000, actual: 1720000 },
]

export const targetSeries: TargetPoint[] = [
  { month: 'May', target: 180, achieved: 138 },
  { month: 'Jun', target: 200, achieved: 164 },
  { month: 'Jul', target: 200, achieved: 152 },
  { month: 'Aug', target: 220, achieved: 198 },
  { month: 'Sep', target: 250, achieved: 231 },
  { month: 'Oct', target: 250, achieved: 268 },
]

export const channelPerformance: ChannelPoint[] = [
  { channel: 'Digital', spend: 3060000, leads: 702, revenue: 11980000, roi: 291 },
  { channel: 'Retail', spend: 1240000, leads: 260, revenue: 4320000, roi: 248 },
  { channel: 'Field', spend: 580000, leads: 192, revenue: 1480000, roi: 155 },
  { channel: 'Events', spend: 840000, leads: 170, revenue: 2700000, roi: 221 },
  { channel: 'Social', spend: 456000, leads: 84, revenue: 1050000, roi: 130 },
  { channel: 'Trade', spend: 520000, leads: 74, revenue: 1610000, roi: 210 },
]

export const recentActivity: ActivityPoint[] = [
  {
    id: 'ACT-01',
    title: 'Festive print production submitted',
    detail: 'Ananya submitted ₹1.86 L for festive print collateral.',
    at: daysFromNow(0, 9, 42),
    kind: 'expense',
  },
  {
    id: 'ACT-02',
    title: 'SmartHome launch film entered review',
    detail: 'Frame & Field Studio delivered the final 60-second cut.',
    at: daysFromNow(-1, 17, 10),
    kind: 'content',
  },
  {
    id: 'ACT-03',
    title: 'Qualified lead: Divya Sharma',
    detail: 'Moved to Proposal with an estimated opportunity value of ₹24 L.',
    at: daysFromNow(-1, 15, 5),
    kind: 'lead',
  },
  {
    id: 'ACT-04',
    title: 'Meta Ads budget increase requested',
    detail: 'Meera Iyer requested an additional ₹1.5 L for the festive flight.',
    at: daysFromNow(-1, 9, 40),
    kind: 'approval',
  },
  {
    id: 'ACT-05',
    title: 'Festive social sprint passed 1.8 M impressions',
    detail: 'Creator-led short-form content is the top-performing format.',
    at: daysFromNow(-2, 12, 20),
    kind: 'campaign',
  },
  {
    id: 'ACT-06',
    title: 'Field visit completed — Bansal Home Decor',
    detail: 'Rohan logged a completed store visit with one follow-up task.',
    at: daysFromNow(-2, 11, 0),
    kind: 'lead',
  },
]

export const priorities: PriorityItem[] = [
  {
    id: 'PRI-01',
    title: 'Review Meta festive flight budget request',
    meta: 'Approval requested by Meera Iyer',
    due: 'Today',
    priority: 'High',
    href: '/marketing/approvals/pending-approvals',
  },
  {
    id: 'PRI-02',
    title: 'Follow up with Arvind Patel on dealer margins',
    meta: 'Field visit follow-up · West region',
    due: 'Overdue by 1 day',
    priority: 'High',
    href: '/marketing/leads/lead-tracking',
  },
  {
    id: 'PRI-03',
    title: 'Submit festive print expense for approval',
    meta: '₹1.86 L · PixelPress Print Co.',
    due: 'Today',
    priority: 'Medium',
    href: '/marketing/expenses/campaign-expenses',
  },
  {
    id: 'PRI-04',
    title: 'Approve dealer loyalty poster changes',
    meta: 'Creative approval · Rohan Mehta',
    due: 'Tomorrow',
    priority: 'Medium',
    href: '/marketing/approvals/pending-approvals',
  },
  {
    id: 'PRI-05',
    title: 'Plan Q4 creator series production',
    meta: 'Campaign starts in 14 days',
    due: 'This week',
    priority: 'Low',
    href: '/marketing/digital/campaigns',
  },
]

export const aiRecommendations: AiRecommendation[] = [
  {
    id: 'AI-01',
    title: 'Shift 12% of Meta prospecting budget to retargeting',
    body: 'Demo data shows retargeting delivering a lower cost per demo request than cold prospecting in the festive flight.',
    impact: 'Estimated 9–14 additional qualified leads',
    action: 'Review channel mix',
    href: '/marketing/digital/paid-advertising',
    tone: 'indigo',
  },
  {
    id: 'AI-02',
    title: 'Follow up on 3 overdue high-intent leads',
    body: 'Three leads with High priority have follow-ups past their due date, including one qualified enterprise opportunity.',
    impact: '₹27 L estimated pipeline at risk',
    action: 'Open lead tracking',
    href: '/marketing/leads/lead-tracking',
    tone: 'amber',
  },
  {
    id: 'AI-03',
    title: 'Field visits convert best in West India',
    body: 'West region field visits show the strongest demo-to-qualified rate in the demo dataset. Consider adding 6 visits this month.',
    impact: 'Potential 8–10 qualified leads',
    action: 'Plan field visits',
    href: '/marketing/field/field-visits',
    tone: 'teal',
  },
]

export const seedNotifications: AppNotification[] = [
  {
    id: 'NT-01',
    title: 'Approval requested by Meera Iyer',
    body: 'Meta Ads festive flight increase — ₹1.5 L. Your review is pending.',
    at: daysFromNow(-1, 9, 40),
    read: false,
    kind: 'approval',
    href: '/marketing/approvals/pending-approvals',
  },
  {
    id: 'NT-02',
    title: 'Follow-up overdue',
    body: 'Arvind Patel (Patel Electricals) was due yesterday. Priority: High.',
    at: daysFromNow(-1, 8, 0),
    read: false,
    kind: 'followup',
    href: '/marketing/leads/lead-tracking',
  },
  {
    id: 'NT-03',
    title: 'Budget threshold warning',
    body: 'Festive Social Sprint has used 72% of its approved budget.',
    at: daysFromNow(-2, 16, 20),
    read: false,
    kind: 'budget',
    href: '/marketing/plans/budget-tracking',
  },
  {
    id: 'NT-04',
    title: 'Contract renewal approaching',
    body: 'Frame & Field Studio renewal deadline is in 7 days.',
    at: daysFromNow(-3, 10, 0),
    read: true,
    kind: 'system',
    href: '/marketing/approvals/renewals',
  },
  {
    id: 'NT-05',
    title: 'Campaign milestone reached',
    body: 'SmartHome Hub Launch crossed 3.1 M impressions in the demo dataset.',
    at: daysFromNow(-4, 12, 0),
    read: true,
    kind: 'system',
    href: '/marketing/digital/campaigns',
  },
]

export const initialAssistantMessage: ChatMessage = {
  id: 'AI-WELCOME',
  role: 'assistant',
  content:
    'Hello Ananya — I’m your marketing demo assistant. I can help you explore campaign ideas, review budget allocation, and turn the demo data in this workspace into practical next steps.\n\nThis assistant runs on local templates and sample data only. It is not connected to a live AI service and does not send messages or make changes on its own.',
  at: daysFromNow(0, 9, 0),
  bullets: [
    'Try: “Suggest a campaign for a product launch.”',
    'Try: “Which campaigns have the highest acquisition costs?”',
    'Try: “Create a field marketing activity plan.”',
  ],
}

export const stackData = {
  workflow: DEMO_WORKFLOW,
}
