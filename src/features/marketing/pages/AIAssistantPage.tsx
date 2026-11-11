import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Lightbulb,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDemoData } from '../context/DemoDataContext'
import { useToast } from '../context/ToastContext'
import type { Campaign, ChatMessage, ContentItem, DemoData } from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { SectionCard } from '../components/ui/SectionCard'
import {
  ChartCard,
  ChartTooltip,
  LegendItem,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../components/charts/ChartKit'
import {
  DataNote,
  DemoNote,
  DetailRows,
  EntityCard,
  EntityGrid,
  FilterRow,
  InsightLine,
  MetricCard,
  MetricGrid,
  MiniStat,
  TabIntro,
} from '../components/marketing/ModuleKit'
import {
  budgetUtilisation,
  campaignConversionRate,
  campaignCpa,
  campaignCpl,
  campaignRoi,
  computeLeadStats,
} from '../utils/analytics'
import { downloadCsv } from '../utils/csv'
import { daysUntil, formatRelative } from '../utils/dates'
import { initialAssistantMessage } from '../data/marketing/dashboard'
import {
  formatDate,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatPercent,
  uid,
} from '../utils/format'

/* ------------------------------------------------------------------ */
/* Local templates and helper types                                    */
/* ------------------------------------------------------------------ */

const OBJECTIVES = [
  'Product launch',
  'Lead generation',
  'Brand awareness',
  'Retail / trade activation',
  'Retention & loyalty',
] as const

type Objective = (typeof OBJECTIVES)[number]

const CONTENT_CHANNELS = ['Instagram', 'LinkedIn', 'Email', 'Blog', 'YouTube'] as const
type ContentChannel = (typeof CONTENT_CHANNELS)[number]

const PROMPT_SUGGESTIONS = [
  'Suggest a campaign for a product launch',
  'How should I rebalance the Q3 budget?',
  'Which campaigns have the highest acquisition cost?',
  'Give me content ideas for SmartHome Hub',
  'Which leads need follow-up this week?',
  'How does our brand compare with competitors?',
]

interface PlanDraft {
  name: string
  objective: string
  budget: number
  audience: string
}

interface Suggestion {
  id: string
  title: string
  channel: Campaign['channel']
  objective: string
  audience: string
  budget: number
  rationale: string
  measures: string[]
}

interface SuggestionBlueprint {
  channel: Campaign['channel']
  audience: string
  factor: number
  rationale: string
  measures: string[]
}

interface BudgetRow {
  campaign: Campaign
  current: number
  suggested: number
  delta: number
  roi: number | null
  rationale: string
}

interface ContentIdea {
  id: string
  title: string
  format: string
  channel: ContentChannel
  hook: string
  angle: string
  cta: string
}

interface PerformanceInsight {
  id: string
  category: string
  title: string
  body: string
  impact: string
  tone: BadgeTone
  actionLabel: string
  href: string
}

interface CompetitorRow {
  id: string
  brand: string
  positioning: string
  mediaSpend: number
  shareOfVoice: number
  engagement: number
  sentiment: number
  priceIndex: number
  threat: 'High' | 'Medium' | 'Low' | 'Baseline'
  isUs: boolean
  observations: number
}

interface AssistantReply {
  content: string
  bullets: string[]
}

/* ------------------------------------------------------------------ */
/* Local demo engine                                                   */
/* ------------------------------------------------------------------ */

function totalSpend(campaigns: Campaign[]): number {
  return campaigns.reduce((sum, campaign) => sum + campaign.spend, 0)
}

function totalBudget(campaigns: Campaign[]): number {
  return campaigns.reduce((sum, campaign) => sum + campaign.budget, 0)
}

function topCampaignByRoi(campaigns: Campaign[]): Campaign | undefined {
  return [...campaigns]
    .filter((campaign) => campaign.spend > 0 && campaign.kpis.revenue > 0)
    .sort((a, b) => (campaignRoi(b) ?? -999) - (campaignRoi(a) ?? -999))[0]
}

function productOptions(campaigns: Campaign[]): string[] {
  const preferred = ['SmartHome Hub', 'Home Essentials Range', 'Enterprise Lighting', 'Festive Gift Packs']
  return [...new Set([...preferred, ...campaigns.map((campaign) => campaign.product)])]
}

const SUGGESTION_BLUEPRINTS: Record<Objective, SuggestionBlueprint[]> = {
  'Product launch': [
    {
      channel: 'Digital',
      audience: 'High-intent category searchers and lookalike audiences',
      factor: 1.1,
      rationale:
        'Pair the launch story with search capture and a seven-day retargeting window. This mirrors the strongest demo digital campaigns.',
      measures: ['Launch film plus three cutdowns', 'Search capture on product terms', 'Retargeting for site visitors'],
    },
    {
      channel: 'Influencer',
      audience: 'Home, décor and smart-living creators with regional reach',
      factor: 1.25,
      rationale:
        'Creator proof gives the product context. Keep a mixed creator tier so reach is balanced with credible reviews.',
      measures: ['Three creator demos', 'Usage-rights checklist', 'Whitelisted paid amplification'],
    },
    {
      channel: 'Retail',
      audience: 'High-footfall showrooms in the top eight cities',
      factor: 0.9,
      rationale:
        'A retail reveal weekend converts consideration into hands-on experience and gives field teams a clear talking point.',
      measures: ['Demo unit per store', 'Weekend staff briefing', 'Lead-capture QR code'],
    },
  ],
  'Lead generation': [
    {
      channel: 'Digital',
      audience: 'Procurement and category decision-makers in tier-1 cities',
      factor: 0.95,
      rationale:
        'A focused demand-capture flight keeps the message tight and makes cost per qualified lead easier to judge.',
      measures: ['Two intent-led ad sets', 'Qualification form', 'CRM follow-up within 24 hours'],
    },
    {
      channel: 'Email',
      audience: 'Existing enquiries and past customers',
      factor: 0.65,
      rationale:
        'The demo nurture campaigns show useful engagement from owned lists at a lower media cost.',
      measures: ['Three-email sequence', 'One clear demo CTA', 'Suppression of recent converters'],
    },
    {
      channel: 'Trade',
      audience: 'Active dealers and channel partners',
      factor: 0.8,
      rationale:
        'Give partners a simple referral mechanic and track which dealer sourced each qualified enquiry.',
      measures: ['Partner referral kit', 'Weekly pipeline review', 'Attribution code per dealer'],
    },
  ],
  'Brand awareness': [
    {
      channel: 'Social',
      audience: 'Broad consideration audiences, 22–44',
      factor: 1,
      rationale:
        'Short-form video is the most efficient demo surface for reach. Keep frequency capped so the story does not fatigue.',
      measures: ['Three short-form edits', 'Frequency cap at 3', 'Brand-lift pulse survey'],
    },
    {
      channel: 'Events',
      audience: 'Media, creators and channel partners',
      factor: 1.4,
      rationale:
        'A small, curated activation creates reusable content and partner goodwill without a mass-media budget.',
      measures: ['One evening showcase', 'Content capture crew', 'Post-event partner toolkit'],
    },
    {
      channel: 'Content',
      audience: 'Owned channels and partner screens',
      factor: 0.6,
      rationale:
        'Evergreen brand films keep working after the campaign ends and can be reused across retail screens.',
      measures: ['One brand film', 'Three product chapters', 'Partner screen pack'],
    },
  ],
  'Retail / trade activation': [
    {
      channel: 'Trade',
      audience: 'High-footfall dealer showrooms',
      factor: 1,
      rationale:
        'Showroom visibility has a direct line to assisted conversion in the demo trade data. Start with the top-quartile stores.',
      measures: ['Display refresh in 20 stores', 'Shelf-audit checklist', 'Dealer incentive briefing'],
    },
    {
      channel: 'Field',
      audience: 'Dealers and distributors in West and Central India',
      factor: 0.85,
      rationale:
        'Structured field visits keep activation quality consistent and surface issues before the promotion ends.',
      measures: ['Six visits per field executive', 'Demo follow-up log', 'Two-week impact review'],
    },
    {
      channel: 'Retail',
      audience: 'Festive shoppers in partner stores',
      factor: 1.15,
      rationale:
        'Bundle the activation with a clear in-store offer and measure sell-through, not just footfall.',
      measures: ['In-store offer card', 'Staff incentive', 'Daily sell-through readout'],
    },
  ],
  'Retention & loyalty': [
    {
      channel: 'Email',
      audience: 'Past customers and active warranty registrations',
      factor: 0.55,
      rationale:
        'Owned lifecycle messaging is the lowest-cost way to test retention before adding paid reach.',
      measures: ['Usage-tip series', 'Service reminder', 'Review request'],
    },
    {
      channel: 'Content',
      audience: 'Existing owners and community audiences',
      factor: 0.6,
      rationale:
        'Owner stories make the product feel lived-in and give support teams helpful content to share.',
      measures: ['Three owner stories', 'Care-and-maintenance guide', 'Community Q&A'],
    },
    {
      channel: 'Retail',
      audience: 'Existing customers in metro catchments',
      factor: 0.75,
      rationale:
        'A trade-in window creates a reason to return without discounting the core range.',
      measures: ['Trade-in offer', 'Store appointment slot', 'Owner-only communication'],
    },
  ],
}

function buildCampaignSuggestions(
  product: string,
  objective: Objective,
  variant: number,
  campaigns: Campaign[],
): Suggestion[] {
  const blueprints = SUGGESTION_BLUEPRINTS[objective]
  const relevant = campaigns.filter((campaign) => campaign.product === product && campaign.budget > 0)
  const baseSource = relevant.length > 0 ? relevant : campaigns.filter((campaign) => campaign.budget > 0)
  const average =
    baseSource.length > 0
      ? baseSource.reduce((sum, campaign) => sum + campaign.budget, 0) / baseSource.length
      : 500000
  const base = Math.min(Math.max(average, 250000), 2000000)
  return [0, 1, 2].map((index) => {
    const blueprint = blueprints[(index + variant) % blueprints.length]
    return {
      id: `SUG-${objective.replace(/\s+/g, '-')}-${variant}-${index}`,
      title: `${product} — ${blueprint.channel.toLowerCase()} ${objective === 'Product launch' ? 'launch' : 'plan'}`,
      channel: blueprint.channel,
      objective,
      audience: blueprint.audience,
      budget: Math.round((base * blueprint.factor * (1 + (variant % 3) * 0.04)) / 10000) * 10000,
      rationale: blueprint.rationale,
      measures: blueprint.measures,
    }
  })
}

const CONTENT_HOOKS = [
  (product: string) => `The 30-second room reset with ${product}`,
  (product: string) => `What changed when we moved ${product} into a real home`,
  (product: string) => `Three small choices that make ${product} feel intentional`,
  (product: string) => `The buying checklist nobody gives you before choosing ${product}`,
  (product: string) => `From box to first use: a clean ${product} walkthrough`,
  (product: string) => `Why the best setup is the one you stop noticing`,
]

const CONTENT_ANGLES = [
  'Show the problem first, then the product in use. Keep the first three seconds visual.',
  'Use a real-room setting with natural light and one clear benefit per frame.',
  'Lead with a practical checklist, then add the product as the simplest way to get there.',
  'Compare before and after without exaggerated claims. Let the setup do the talking.',
  'Answer a common pre-purchase objection with a short demonstration.',
  'Close with a low-friction next step: save, compare or book a demo.',
]

const CONTENT_CTAS = [
  'Save this for your next room refresh.',
  'Compare the range and book a demo.',
  'See the full setup guide.',
  'Tell us which room you would start with.',
  'Explore the product page.',
]

const CONTENT_FORMATS: Record<ContentChannel, string[]> = {
  Instagram: ['Reel', 'Carousel', 'Story series'],
  LinkedIn: ['Insight post', 'Case study', 'Poll'],
  Email: ['Nurture email', 'Launch email', 'Re-engagement email'],
  Blog: ['Buying guide', 'SEO explainer', 'Comparison post'],
  YouTube: ['Product demo', 'Short', 'Customer story'],
}

function buildContentIdeas(
  product: string,
  channel: ContentChannel,
  variant: number,
): ContentIdea[] {
  const formats = CONTENT_FORMATS[channel]
  return Array.from({ length: 6 }, (_, index) => {
    const hookIndex = (index + variant) % CONTENT_HOOKS.length
    const angleIndex = (index * 2 + variant) % CONTENT_ANGLES.length
    return {
      id: `IDEA-${channel}-${variant}-${index}`,
      title: CONTENT_HOOKS[hookIndex](product),
      format: formats[(index + variant) % formats.length],
      channel,
      hook: CONTENT_HOOKS[hookIndex](product),
      angle: CONTENT_ANGLES[angleIndex],
      cta: CONTENT_CTAS[(index + variant) % CONTENT_CTAS.length],
    }
  })
}

function buildBudgetRows(campaigns: Campaign[], shiftPct: number): BudgetRow[] {
  const eligible = campaigns.filter(
    (campaign) =>
      campaign.budget > 0 &&
      campaign.status !== 'Archived' &&
      campaign.status !== 'Draft',
  )
  if (eligible.length < 2) return []
  const sorted = [...eligible].sort(
    (a, b) => (campaignRoi(b) ?? -999) - (campaignRoi(a) ?? -999),
  )
  const topCount = Math.min(3, Math.max(1, Math.floor(sorted.length / 3)))
  const lowCount = Math.min(2, Math.max(1, sorted.length - topCount))
  const topIds = new Set(sorted.slice(0, topCount).map((campaign) => campaign.id))
  const lowIds = new Set(sorted.slice(-lowCount).map((campaign) => campaign.id))
  const shift = shiftPct / 100
  return sorted.map((campaign) => {
    let suggested = campaign.budget
    if (topIds.has(campaign.id)) suggested = campaign.budget * (1 + shift / topCount)
    else if (lowIds.has(campaign.id)) suggested = campaign.budget * Math.max(0.65, 1 - shift / lowCount)
    suggested = Math.round(suggested / 10000) * 10000
    const roi = campaignRoi(campaign)
    const rationale = topIds.has(campaign.id)
      ? `Best demo efficiency at ${formatPercent(roi, 0)} ROI. Protect the flight and test a small scale-up.`
      : lowIds.has(campaign.id)
        ? `Lowest demo efficiency at ${formatPercent(roi, 0)} ROI. Cap spend and revisit the audience.`
        : 'Mid-pack demo efficiency. Hold steady while the top and bottom flights are reviewed.'
    return {
      campaign,
      current: campaign.budget,
      suggested,
      delta: suggested - campaign.budget,
      roi,
      rationale,
    }
  })
}

function buildPerformanceInsights(data: DemoData): PerformanceInsight[] {
  const insights: PerformanceInsight[] = []
  const activeCampaigns = data.campaigns.filter((campaign) => campaign.status === 'Active')
  const scored = data.campaigns.filter(
    (campaign) => campaign.spend > 0 && campaign.kpis.revenue > 0,
  )
  const best = [...scored].sort(
    (a, b) => (campaignRoi(b) ?? -999) - (campaignRoi(a) ?? -999),
  )[0]
  const worst = [...scored].sort(
    (a, b) => (campaignRoi(a) ?? 999) - (campaignRoi(b) ?? 999),
  )[0]
  const leadStats = computeLeadStats(data.leads)
  const pending = data.approvals.filter((approval) => approval.status === 'Pending')
  const expiring = data.contracts.filter(
    (contract) => contract.status === 'Expiring Soon',
  )
  const budgetRisks = activeCampaigns.filter(
    (campaign) => campaign.budget > 0 && campaign.spend / campaign.budget >= 0.85,
  )
  const cplRows = activeCampaigns
    .map((campaign) => ({ campaign, cpl: campaignCpl(campaign) }))
    .filter((row): row is { campaign: Campaign; cpl: number } => row.cpl !== null)
    .sort((a, b) => b.cpl - a.cpl)
  const weakEmail = [...data.emails]
    .filter((email) => email.status === 'Sent')
    .sort((a, b) => a.openRate - b.openRate)[0]
  const weakVendor = [...data.agencies]
    .filter((agency) => agency.performanceScore > 0)
    .sort((a, b) => a.performanceScore - b.performanceScore)[0]

  if (best) {
    const roi = campaignRoi(best)
    insights.push({
      id: 'INS-ROI-BEST',
      category: 'Performance',
      title: `${best.name} leads the demo portfolio`,
      body: `${formatINRCompact(best.kpis.revenue)} of sample revenue against ${formatINRCompact(best.spend)} spend. The campaign is the clearest candidate for a controlled scale-up.`,
      impact: `${formatPercent(roi, 0)} demo ROI`,
      tone: 'success',
      actionLabel: 'Review campaign',
      href: '/marketing/digital/campaigns',
    })
  }

  if (worst && worst.id !== best?.id) {
    const roi = campaignRoi(worst)
    insights.push({
      id: 'INS-ROI-WORST',
      category: 'Performance',
      title: `${worst.name} needs an efficiency review`,
      body: `This is the lowest demo ROI among campaigns with recorded spend and revenue. Check the audience, creative and conversion path before committing the next flight.`,
      impact: `${formatPercent(roi, 0)} demo ROI`,
      tone: 'warning',
      actionLabel: 'Open reports',
      href: '/marketing/reports/campaign-performance',
    })
  }

  if (budgetRisks.length > 0) {
    const largest = [...budgetRisks].sort(
      (a, b) => b.spend / b.budget - a.spend / a.budget,
    )[0]
    insights.push({
      id: 'INS-BUDGET',
      category: 'Budget',
      title: 'Budget thresholds need a check',
      body: `${budgetRisks.length} active demo campaign${budgetRisks.length === 1 ? '' : 's'} have used at least 85% of the approved budget. ${largest.name} is furthest along.`,
      impact: `${formatPercent(budgetUtilisation(largest.spend, largest.budget), 0)} utilised`,
      tone: 'warning',
      actionLabel: 'Open budget tracking',
      href: '/marketing/plans/budget-tracking',
    })
  }

  if (leadStats.overdue > 0 || leadStats.dueToday > 0) {
    insights.push({
      id: 'INS-FOLLOWUP',
      category: 'Pipeline',
      title: 'Follow-up queue has live items',
      body: `${leadStats.overdue} CRM demo lead${leadStats.overdue === 1 ? '' : 's'} are overdue and ${leadStats.dueToday} are due today. Start with high-priority records and log the outcome.`,
      impact: `${leadStats.highPriority} high-priority open leads`,
      tone: 'danger',
      actionLabel: 'Open lead tracking',
      href: '/marketing/leads/lead-tracking',
    })
  }

  if (cplRows.length > 0) {
    const highest = cplRows[0]
    insights.push({
      id: 'INS-CPL',
      category: 'Performance',
      title: 'Highest cost per lead is worth a second look',
      body: `${highest.campaign.name} records ${formatINR(highest.cpl)} per demo lead. Compare its audience and creative with the lower-cost campaigns before renewing spend.`,
      impact: `${formatNumber(highest.campaign.kpis.leads)} leads recorded`,
      tone: 'info',
      actionLabel: 'Compare channels',
      href: '/marketing/reports/channel-performance',
    })
  }

  if (pending.length > 0) {
    const reviewable = pending.filter((approval) => !approval.requestedByMe).length
    insights.push({
      id: 'INS-APPROVALS',
      category: 'Approvals',
      title: 'Approval queue is building',
      body: `${pending.length} demo request${pending.length === 1 ? '' : 's'} are pending; ${reviewable} team request${reviewable === 1 ? '' : 's'} can be reviewed by you. Requests raised by Ananya Rao are intentionally blocked from self-approval.`,
      impact: `${pending.length} pending`,
      tone: 'warning',
      actionLabel: 'Open approvals',
      href: '/marketing/approvals/pending-approvals',
    })
  }

  if (expiring.length > 0) {
    const soonest = [...expiring].sort(
      (a, b) => new Date(a.renewalDeadline).getTime() - new Date(b.renewalDeadline).getTime(),
    )[0]
    const days = daysUntil(soonest.renewalDeadline)
    insights.push({
      id: 'INS-CONTRACT',
      category: 'Partners',
      title: 'Contract renewal is approaching',
      body: `${soonest.name} is marked expiring in the demo contract register.${days !== null ? ` The renewal deadline is in ${Math.max(days, 0)} day${Math.max(days, 0) === 1 ? '' : 's'}.` : ''}`,
      impact: formatINRCompact(soonest.value),
      tone: 'danger',
      actionLabel: 'Open renewals',
      href: '/marketing/approvals/renewals',
    })
  }

  if (weakEmail) {
    insights.push({
      id: 'INS-EMAIL',
      category: 'Content',
      title: 'Email engagement has a laggard',
      body: `${weakEmail.name} has the lowest demo open rate among sent emails. Test a shorter subject line and a single, clearer call to action.`,
      impact: `${formatPercent(weakEmail.openRate, 1)} open rate`,
      tone: 'info',
      actionLabel: 'Open email marketing',
      href: '/marketing/digital/email-marketing',
    })
  }

  if (weakVendor && weakVendor.performanceScore < 70) {
    insights.push({
      id: 'INS-VENDOR',
      category: 'Partners',
      title: `${weakVendor.name} is below the demo benchmark`,
      body: `Performance score is ${weakVendor.performanceScore}/100 with ${formatPercent(weakVendor.timeliness, 0)} timeliness. Review the scope and delivery notes before the next statement of work.`,
      impact: `${weakVendor.performanceScore}/100 score`,
      tone: 'info',
      actionLabel: 'Open vendor performance',
      href: '/marketing/agencies/vendor-performance',
    })
  }

  return insights
}

function buildCompetitorRows(data: DemoData): CompetitorRow[] {
  const spend = totalSpend(data.campaigns)
  const impressions = data.campaigns.reduce(
    (sum, campaign) => sum + campaign.kpis.impressions,
    0,
  )
  const clicks = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.clicks, 0)
  const engagement = impressions > 0 ? (clicks / impressions) * 100 : 0
  const observations = (brand: string) =>
    data.research.filter((item) => item.competitor === brand).length
  const competitorRows: CompetitorRow[] = [
    {
      id: 'CMP-OURS',
      brand: 'Totally Home (demo)',
      positioning: 'Connected home and lighting portfolio',
      mediaSpend: spend,
      shareOfVoice: 22,
      engagement,
      sentiment: 71,
      priceIndex: 100,
      threat: 'Baseline',
      isUs: true,
      observations: data.research.length,
    },
    {
      id: 'CMP-LUMINA',
      brand: 'Lumina Living',
      positioning: 'Premium home décor and lighting',
      mediaSpend: 14000000,
      shareOfVoice: 25,
      engagement: 4.6,
      sentiment: 73,
      priceIndex: 106,
      threat: 'High',
      isUs: false,
      observations: observations('Lumina Living'),
    },
    {
      id: 'CMP-CASA',
      brand: 'CasaTech',
      positioning: 'Smart-home challenger',
      mediaSpend: 10500000,
      shareOfVoice: 19,
      engagement: 5.1,
      sentiment: 69,
      priceIndex: 98,
      threat: 'High',
      isUs: false,
      observations: observations('CasaTech'),
    },
    {
      id: 'CMP-NOVA',
      brand: 'NovaGrid',
      positioning: 'Value-led lighting range',
      mediaSpend: 8000000,
      shareOfVoice: 16,
      engagement: 3.7,
      sentiment: 64,
      priceIndex: 91,
      threat: 'Medium',
      isUs: false,
      observations: observations('NovaGrid'),
    },
    {
      id: 'CMP-METRO',
      brand: 'MetroTrade',
      positioning: 'Trade-first distribution',
      mediaSpend: 5500000,
      shareOfVoice: 13,
      engagement: 2.9,
      sentiment: 61,
      priceIndex: 94,
      threat: 'Low',
      isUs: false,
      observations: observations('MetroTrade'),
    },
  ]
  return competitorRows.sort((a, b) => b.shareOfVoice - a.shareOfVoice)
}

function buildLocalReply(prompt: string, data: DemoData): AssistantReply {
  const text = prompt.toLowerCase()
  const campaigns = data.campaigns
  const spend = totalSpend(campaigns)
  const budget = totalBudget(campaigns)
  const active = campaigns.filter((campaign) => campaign.status === 'Active')
  const best = topCampaignByRoi(campaigns)
  const stats = computeLeadStats(data.leads)
  const pending = data.approvals.filter((approval) => approval.status === 'Pending')
  const budgetRisks = active.filter(
    (campaign) => campaign.budget > 0 && campaign.spend / campaign.budget >= 0.85,
  )
  const contractsExpiring = data.contracts.filter(
    (contract) => contract.status === 'Expiring Soon',
  )

  if (/budget|spend|realloc|roi|cost|efficien/.test(text)) {
    return {
      content:
        'Here is a local, spreadsheet-style read of the demo workspace. It is a planning prompt, not an approved budget change.',
      bullets: [
        `${formatINRCompact(spend)} of sample spend is recorded against ${formatINRCompact(budget)} planned (${formatPercent(budgetUtilisation(spend, budget), 0)} utilisation).`,
        best
          ? `${best.name} has the strongest demo ROI at ${formatPercent(campaignRoi(best), 0)}. It is the first candidate for a controlled scale-up.`
          : 'No campaign currently has both recorded spend and revenue, so ROI cannot be ranked.',
        budgetRisks.length > 0
          ? `${budgetRisks.length} active campaign${budgetRisks.length === 1 ? '' : 's'} are at or above 85% budget use. Review those before increasing any flight.`
          : 'No active campaign is above the 85% budget-use threshold in this demo.',
        'Open Budget Optimization to stage an indicative reallocation and save it as a local plan.',
      ],
    }
  }

  if (/content|idea|caption|creative|social|post/.test(text)) {
    const product = best?.product ?? 'SmartHome Hub'
    return {
      content: `For ${product}, the demo data supports a practical content test rather than a large production. Start with formats that can be reused across owned and paid channels.`,
      bullets: [
        'Lead with a real-room demonstration and one clear benefit per edit.',
        'Use a short-form cut for reach, a carousel for product detail and a demo film for retail screens.',
        'Keep the call to action low-friction: save, compare or book a demo.',
        'Open Content Ideas to generate local templates, then save selected ideas to the demo content library.',
      ],
    }
  }

  if (/compet|market|share|share of voice|benchmark/.test(text)) {
    const observations = data.research.length
    return {
      content:
        'The competitor view in this portal is an illustrative benchmark set, not live market intelligence. It is useful for framing questions, not for making factual market claims.',
      bullets: [
        `The workspace holds ${observations} field research observation${observations === 1 ? '' : 's'} across named competitors.`,
        'Lumina Living is positioned as the premium benchmark; CasaTech is the closest smart-home challenger in the sample.',
        'Compare share of voice alongside price index and sentiment rather than spend alone.',
        'Open Competitor Comparison to review the sample table and export it for a discussion.',
      ],
    }
  }

  if (/field|visit|dealer|store|demo/.test(text)) {
    const completedVisits = data.fieldVisits.filter((visit) => visit.status === 'Completed').length
    const openVisits = data.fieldVisits.filter(
      (visit) => visit.status === 'Scheduled' || visit.status === 'In Progress',
    ).length
    return {
      content:
        'A field plan works best when visits have a clear purpose, a named owner and a follow-up that is logged the same day.',
      bullets: [
        `${completedVisits} demo visits are completed and ${openVisits} remain scheduled or in progress.`,
        `${data.fieldTeams.length} field team members are available in the demo roster.`,
        'Prioritise dealer and showroom visits where a demo can be tied to a live opportunity.',
        'Open Field Visits to schedule a visit and attach the checklist before the team leaves.',
      ],
    }
  }

  if (/lead|follow|pipeline|convert|enquir/.test(text)) {
    return {
      content:
        'The CRM tables and the campaign-reported totals use different scopes in this demo. Treat the lead queue as a workflow sample, not a reconciled pipeline.',
      bullets: [
        `${stats.total} CRM demo leads are visible, with ${stats.qualified} qualified and ${stats.converted} converted.`,
        `${stats.overdue} follow-up${stats.overdue === 1 ? ' is' : 's are'} overdue and ${stats.dueToday} due today.`,
        `${stats.highPriority} open lead${stats.highPriority === 1 ? '' : 's'} carry high priority.`,
        'Only qualified leads can be converted, and a duplicate email or phone is blocked in the demo workflow.',
      ],
    }
  }

  if (/approval|contract|renew|legal|rights/.test(text)) {
    return {
      content:
        'Approvals and contracts are workflow demonstrations. Nothing is sent to a real approver and no contract is executed.',
      bullets: [
        `${pending.length} demo request${pending.length === 1 ? '' : 's'} are pending review.`,
        `${contractsExpiring.length} contract${contractsExpiring.length === 1 ? '' : 's'} are marked expiring soon.`,
        'Self-approval is intentionally blocked for requests raised by Ananya Rao in this demo.',
        'Open Approvals & Contracts to review the queue, audit trail and renewal alerts.',
      ],
    }
  }

  if (/campaign|launch|awareness|promotion|product/.test(text)) {
    const activeCount = active.length
    return {
      content: best
        ? `A launch plan should borrow the structure of ${best.name}, but not its exact budget. Use a short pilot, one clear audience and a defined review point.`
        : 'A launch plan should start with one clear audience, one product story and a short pilot before scaling.',
      bullets: [
        `${activeCount} campaign${activeCount === 1 ? ' is' : 's are'} active in the demo workspace.`,
        'Split the plan into three moves: demand capture, proof content and a retail or field moment.',
        'Set a review point at 14 days and judge qualified leads, not impressions alone.',
        'Open Campaign Suggestions to generate three local templates and save a chosen plan.',
      ],
    }
  }

  return {
    content:
      'I can work through the sample workspace in a few directions. This is a local template engine, so the response is based on the demo records currently in this browser.',
    bullets: [
      `The workspace holds ${campaigns.length} campaigns, ${data.leads.length} CRM leads, ${formatINRCompact(spend)} of sample spend and ${formatINRCompact(budget)} planned.`,
      best
        ? `${best.name} is the strongest demo campaign by ROI (${formatPercent(campaignRoi(best), 0)}).`
        : 'No campaign has enough recorded data to rank ROI yet.',
      pending.length > 0
        ? `${pending.length} approval request${pending.length === 1 ? '' : 's'} need a review decision.`
        : 'There are no pending approval requests in the demo queue.',
      'Try a prompt about campaign ideas, budget, content, leads, field visits, approvals or competitors.',
    ],
  }
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function SavePlanModal({
  draft,
  onClose,
}: {
  draft: PlanDraft
  onClose: () => void
}) {
  const { update } = useDemoData()
  const { pushToast } = useToast()
  const formId = useId()
  const [name, setName] = useState(draft.name)
  const [objective, setObjective] = useState(draft.objective)
  const [audience, setAudience] = useState(draft.audience)
  const [budget, setBudget] = useState(String(draft.budget))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = 'Give the plan a name.'
    if (!objective.trim()) nextErrors.objective = 'Add a short objective.'
    if (!audience.trim()) nextErrors.audience = 'Describe the intended audience.'
    const numericBudget = Number(budget)
    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      nextErrors.budget = 'Enter a budget greater than zero.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    update('assistantPlans', (current) => [
      {
        id: uid('AIP'),
        name: name.trim(),
        objective: objective.trim(),
        budget: Math.round(numericBudget),
        audience: audience.trim(),
        createdAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 20))
    pushToast({
      title: 'Assistant plan saved locally',
      description: 'Stored in this browser only. No budget, campaign or approval record was changed.',
      tone: 'success',
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Save assistant plan"
      description="Keep a local copy of this generated outline. It is not submitted to any approval or finance workflow."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form={formId}
            icon={<Save size={14} />}
          >
            Save demo plan
          </Button>
        </>
      }
    >
      <form id={formId} className="stack-16" onSubmit={handleSubmit} noValidate>
        <Field
          label="Plan name"
          htmlFor={`${formId}-name`}
          required
          error={errors.name}
        >
          <input
            id={`${formId}-name`}
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. SmartHome Hub launch pilot"
          />
        </Field>
        <div className="grid-2">
          <Field
            label="Budget (INR)"
            htmlFor={`${formId}-budget`}
            required
            error={errors.budget}
          >
            <input
              id={`${formId}-budget`}
              className="input"
              type="number"
              min={1}
              step={10000}
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
            />
          </Field>
          <Field
            label="Audience"
            htmlFor={`${formId}-audience`}
            required
            error={errors.audience}
          >
            <input
              id={`${formId}-audience`}
              className="input"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Who is this for?"
            />
          </Field>
        </div>
        <Field
          label="Objective"
          htmlFor={`${formId}-objective`}
          required
          error={errors.objective}
          hint="A short, testable objective works best for a demo plan."
        >
          <textarea
            id={`${formId}-objective`}
            className="input"
            rows={3}
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          />
        </Field>
        <div className="ai-note">
          <ShieldCheck size={12} aria-hidden="true" /> Saved to assistant plans in local storage. No
          network request is made and nothing is approved automatically.
        </div>
      </form>
    </Modal>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const { pushToast } = useToast()
  const isUser = message.role === 'user'

  const copyMessage = async () => {
    const text = [message.content, ...(message.bullets ?? []).map((bullet) => `• ${bullet}`)].join('\n')
    try {
      if (!navigator.clipboard) throw new Error('Clipboard not available')
      await navigator.clipboard.writeText(text)
      pushToast({ title: 'Copied response', description: 'The demo response is on your clipboard.', tone: 'success' })
    } catch {
      pushToast({ title: 'Copy unavailable', description: 'Your browser did not allow clipboard access.', tone: 'error' })
    }
  }

  return (
    <div className={`ai-message ${isUser ? 'ai-message--user' : 'ai-message--assistant'}`}>
      <span className="ai-message__avatar" aria-hidden="true">
        {isUser ? <Users size={13} /> : <Bot size={13} />}
      </span>
      <div>
        <div className="ai-message__bubble">
          {message.content.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {message.bullets && message.bullets.length > 0 ? (
            <ul>
              {message.bullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="ai-message__foot">
          <span>{formatRelative(message.at)}</span>
          {!isUser ? (
            <button type="button" className="ai-copy" onClick={copyMessage}>
              <Copy size={10} /> Copy
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function AssistantOverview() {
  const { data, update } = useDemoData()
  const { pushToast } = useToast()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)

  const spend = totalSpend(data.campaigns)
  const budget = totalBudget(data.campaigns)
  const pending = data.approvals.filter((approval) => approval.status === 'Pending').length
  const activeCampaigns = data.campaigns.filter((campaign) => campaign.status === 'Active').length

  useEffect(() => {
    const container = messagesRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [data.aiHistory.length, busy])

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const sendPrompt = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || busy) return
    const reply = buildLocalReply(trimmed, data)
    const userMessage: ChatMessage = {
      id: uid('MSG'),
      role: 'user',
      content: trimmed,
      at: new Date().toISOString(),
    }
    update('aiHistory', (current) => [...current, userMessage].slice(-40))
    setInput('')
    setBusy(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: uid('MSG'),
        role: 'assistant',
        content: reply.content,
        bullets: reply.bullets,
        at: new Date().toISOString(),
      }
      update('aiHistory', (current) => [...current, assistantMessage].slice(-40))
      setBusy(false)
      timerRef.current = null
    }, 720)
  }

  const resetConversation = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setBusy(false)
    update('aiHistory', () => [
      { ...initialAssistantMessage, at: new Date().toISOString() },
    ])
    pushToast({
      title: 'Demo conversation reset',
      description: 'The welcome message has been restored. Saved plans were not changed.',
      tone: 'info',
    })
  }

  const removePlan = (id: string) => {
    update('assistantPlans', (current) => current.filter((plan) => plan.id !== id))
    pushToast({ title: 'Saved plan removed', description: 'This only affects the local demo copy.', tone: 'info' })
  }

  return (
    <div className="stack-20">
      <TabIntro
        title="Local marketing co-pilot"
        description="Explore the workspace with a template-driven assistant. It reads the demo records in this browser, suggests next steps and can save outline plans locally."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={resetConversation}
            >
              Reset conversation
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles size={14} />}
              onClick={() => sendPrompt(PROMPT_SUGGESTIONS[0])}
              disabled={busy}
            >
              Ask a sample question
            </Button>
          </>
        }
      />

      <DemoNote>
        This is not a live AI model. Responses come from local keyword rules and templates applied to
        demo data. No prompt leaves this browser, and the assistant cannot approve, send, pay or
        change a real record.
      </DemoNote>

      <div className="ai-layout">
        <div className="card ai-chat">
          <div className="ai-chat__header">
            <span className="ai-avatar">
              <Bot size={18} />
            </span>
            <div className="grow">
              <p className="cell-primary">Marketing demo assistant</p>
              <p className="text-xs muted">Local templates · demo data only · no network calls</p>
            </div>
            <Badge tone="info" dot={false}>
              Local
            </Badge>
          </div>

          <div className="ai-chat__messages" ref={messagesRef} aria-live="polite">
            {data.aiHistory.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {busy ? (
              <div className="ai-message ai-message--assistant" aria-label="Generating a local response">
                <span className="ai-message__avatar" aria-hidden="true">
                  <Bot size={13} />
                </span>
                <div className="ai-message__bubble">
                  <span className="ai-thinking" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="ai-chat__composer">
            <div className="prompt-chips" style={{ padding: '0 0 10px' }}>
              {PROMPT_SUGGESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="prompt-chip"
                  onClick={() => sendPrompt(prompt)}
                  disabled={busy}
                >
                  <Sparkles size={10} /> {prompt}
                </button>
              ))}
            </div>
            <form
              className="ai-composer-box"
              onSubmit={(event) => {
                event.preventDefault()
                sendPrompt(input)
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    sendPrompt(input)
                  }
                }}
                rows={1}
                maxLength={400}
                placeholder="Ask about campaigns, budget, content, leads or competitors…"
                aria-label="Ask the local demo assistant"
              />
              <button
                type="submit"
                className="ai-send"
                aria-label="Send prompt"
                disabled={!input.trim() || busy}
              >
                <Send size={15} />
              </button>
            </form>
            <p className="ai-disclaimer" style={{ marginTop: 10 }}>
              Template responses only. Nothing is sent to an LLM or external service. Press Enter to
              send, Shift + Enter for a new line.
            </p>
          </div>
        </div>

        <aside className="ai-side">
          <SectionCard title="Workspace context" subtitle="What the local engine can see">
            <div className="chat-context-list">
              <div className="chat-context-row">
                <span>Campaigns</span>
                <strong>{data.campaigns.length}</strong>
              </div>
              <div className="chat-context-row">
                <span>Active campaigns</span>
                <strong>{activeCampaigns}</strong>
              </div>
              <div className="chat-context-row">
                <span>CRM demo leads</span>
                <strong>{data.leads.length}</strong>
              </div>
              <div className="chat-context-row">
                <span>Sample spend</span>
                <strong>{formatINRCompact(spend)}</strong>
              </div>
              <div className="chat-context-row">
                <span>Planned budget</span>
                <strong>{formatINRCompact(budget)}</strong>
              </div>
              <div className="chat-context-row">
                <span>Pending approvals (all)</span>
                <strong>{pending}</strong>
              </div>
            </div>
            <p className="text-xs muted mt-12">
              Campaign totals are campaign-reported sample figures. CRM leads are a separate demo
              scope and are not reconciled to campaign totals.
            </p>
          </SectionCard>

          <SectionCard
            title="Saved assistant plans"
            subtitle={`${data.assistantPlans.length} local outline${data.assistantPlans.length === 1 ? '' : 's'}`}
          >
            {data.assistantPlans.length === 0 ? (
              <div className="stack-8">
                <p className="text-xs muted">
                  No plans saved yet. Generate a campaign or budget outline and choose “Save demo
                  plan”.
                </p>
                <Button
                  variant="soft"
                  size="xs"
                  icon={<Wand2 size={12} />}
                  onClick={() => sendPrompt('Suggest a campaign for a product launch')}
                >
                  Start with a campaign outline
                </Button>
              </div>
            ) : (
              <div className="stack-4">
                {data.assistantPlans.slice(0, 5).map((plan) => (
                  <div className="chat-context-row" key={plan.id}>
                    <div style={{ minWidth: 0 }}>
                      <p className="cell-primary" style={{ fontSize: '0.76rem' }}>
                        {plan.name}
                      </p>
                      <p className="text-xs muted">
                        {formatINRCompact(plan.budget)} · {formatDate(plan.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removePlan(plan.id)}
                      aria-label={`Remove ${plan.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="ai-note">
            <ShieldCheck size={12} aria-hidden="true" /> Demo guardrails: no model call, no message
            sending, no payment, no approval. Saved plans live in local storage and disappear on
            demo reset.
          </div>
        </aside>
      </div>

      <div className="grid-3">
        <SectionCard title="Template-driven">
          <p className="text-sm muted">
            Keyword rules choose a response shape, then fill it with the current demo records. Two
            different prompts can share a template.
          </p>
        </SectionCard>
        <SectionCard title="Workspace-aware">
          <p className="text-sm muted">
            Campaign ROI, budget use, lead follow-ups and approvals are read from the same local data
            as the rest of the portal.
          </p>
        </SectionCard>
        <SectionCard title="Human decides">
          <p className="text-sm muted">
            Generated plans are drafts. You still choose what to save, and no downstream workflow is
            triggered automatically.
          </p>
        </SectionCard>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Campaign suggestions                                                */
/* ------------------------------------------------------------------ */

function CampaignSuggestionsTab() {
  const { data } = useDemoData()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const [product, setProduct] = useState('SmartHome Hub')
  const [objective, setObjective] = useState<Objective>('Product launch')
  const [variant, setVariant] = useState(0)
  const [channelFilter, setChannelFilter] = useState('All')
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null)

  const products = useMemo(() => productOptions(data.campaigns), [data.campaigns])
  const suggestions = useMemo(
    () => buildCampaignSuggestions(product, objective, variant, data.campaigns),
    [product, objective, variant, data.campaigns],
  )
  const filtered = useMemo(
    () =>
      channelFilter === 'All'
        ? suggestions
        : suggestions.filter((suggestion) => suggestion.channel === channelFilter),
    [suggestions, channelFilter],
  )

  const productCampaigns = data.campaigns.filter((campaign) => campaign.product === product)
  const bestChannel = useMemo(() => {
    const map = new Map<string, { spend: number; revenue: number }>()
    const source = productCampaigns.length > 0 ? productCampaigns : data.campaigns
    source.forEach((campaign) => {
      const bucket = map.get(campaign.channel) ?? { spend: 0, revenue: 0 }
      bucket.spend += campaign.spend
      bucket.revenue += campaign.kpis.revenue
      map.set(campaign.channel, bucket)
    })
    return [...map.entries()]
      .map(([channel, totals]) => ({
        channel,
        roi: totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : null,
      }))
      .filter((item) => item.roi !== null)
      .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))[0]
  }, [productCampaigns, data.campaigns])

  const indicativeBudget = filtered.reduce((sum, suggestion) => sum + suggestion.budget, 0)

  const exportSuggestions = () => {
    const result = downloadCsv(
      'assistant-campaign-suggestions-demo',
      [
        { header: 'Suggestion', value: (row: Suggestion) => row.title },
        { header: 'Channel', value: (row: Suggestion) => row.channel },
        { header: 'Objective', value: (row: Suggestion) => row.objective },
        { header: 'Audience', value: (row: Suggestion) => row.audience },
        { header: 'Indicative budget (INR)', value: (row: Suggestion) => row.budget },
        { header: 'Rationale', value: (row: Suggestion) => row.rationale },
      ],
      filtered,
    )
    pushToast({
      title: result.ok ? 'Suggestions exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  const saveSuggestion = (suggestion: Suggestion) => {
    setPlanDraft({
      name: suggestion.title,
      objective: `${suggestion.objective}. ${suggestion.rationale}`,
      budget: suggestion.budget,
      audience: suggestion.audience,
    })
  }

  return (
    <div className="stack-16">
      <TabIntro
        title="Campaign suggestion generator"
        description="Pick a product and objective to assemble three local campaign outlines from the demo campaign patterns. Change the variation to rotate the starting points."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={() => setVariant((current) => current + 1)}
            >
              New variation
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Download size={14} />}
              onClick={exportSuggestions}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <SectionCard>
        <div className="grid-3">
          <Field label="Product" htmlFor="assistant-product">
            <select
              id="assistant-product"
              className="select"
              value={product}
              onChange={(event) => {
                setProduct(event.target.value)
                setVariant(0)
              }}
            >
              {products.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Objective" htmlFor="assistant-objective">
            <select
              id="assistant-objective"
              className="select"
              value={objective}
              onChange={(event) => {
                setObjective(event.target.value as Objective)
                setVariant(0)
              }}
            >
              {OBJECTIVES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel filter" htmlFor="assistant-suggestion-channel">
            <select
              id="assistant-suggestion-channel"
              className="select"
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value)}
            >
              <option value="All">All channels</option>
              {[...new Set(suggestions.map((suggestion) => suggestion.channel))].map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </SectionCard>

      <MetricGrid>
        <MetricCard
          label="Suggestions"
          value={filtered.length}
          sub={`${objective} · ${product}`}
          icon={<Lightbulb size={15} />}
          tone="var(--chart-1)"
        />
        <MetricCard
          label="Indicative budget"
          value={formatINRCompact(indicativeBudget)}
          sub="Sum of visible outlines, before review"
          icon={<Wallet size={15} />}
          tone="var(--chart-3)"
        />
        <MetricCard
          label="Product campaigns"
          value={productCampaigns.length}
          sub={productCampaigns.length > 0 ? 'Demo records used for context' : 'No direct demo match; portfolio context used'}
          icon={<Target size={15} />}
          tone="var(--chart-2)"
        />
        <MetricCard
          label="Strongest demo channel"
          value={bestChannel?.channel ?? '—'}
          sub={bestChannel?.roi !== null && bestChannel !== undefined ? `${formatPercent(bestChannel.roi, 0)} demo ROI` : 'Not enough data'}
          icon={<TrendingUp size={15} />}
          tone="var(--chart-5)"
        />
      </MetricGrid>

      <FilterRow count={`${filtered.length} of ${suggestions.length} outlines`}>
        <span className="text-sm muted">
          Generated from local campaign patterns. Budget figures are indicative and are not reserved
          anywhere.
        </span>
      </FilterRow>

      {filtered.length === 0 ? (
        <SectionCard>
          <p className="text-sm muted">No outlines match this channel filter. Choose “All channels”.</p>
        </SectionCard>
      ) : (
        <EntityGrid columns={3}>
          {filtered.map((suggestion) => (
            <EntityCard
              key={suggestion.id}
              title={suggestion.title}
              subtitle={suggestion.audience}
              badge={<Badge tone="accent">{suggestion.channel}</Badge>}
              meta={
                <>
                  <span>{formatINRCompact(suggestion.budget)} indicative</span>
                  <span>{suggestion.objective}</span>
                </>
              }
              actions={
                <>
                  <Button
                    variant="primary"
                    size="xs"
                    icon={<Save size={12} />}
                    onClick={() => saveSuggestion(suggestion)}
                  >
                    Save demo plan
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={<ArrowRight size={12} />}
                    onClick={() => navigate('/marketing/plans/campaign-budgets')}
                  >
                    Budgets
                  </Button>
                </>
              }
            >
              <p className="text-sm muted">{suggestion.rationale}</p>
              <ul className="stack-4" style={{ margin: '10px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                {suggestion.measures.map((measure) => (
                  <li key={measure} className="row-6 text-xs muted">
                    <CheckCircle2 size={11} aria-hidden="true" /> {measure}
                  </li>
                ))}
              </ul>
            </EntityCard>
          ))}
        </EntityGrid>
      )}

      <InsightLine>
        A useful next step is to compare the chosen outline with the current campaign budget sheet,
        then route any real spend through the normal approval process outside this demo.
      </InsightLine>

      <DemoNote>
        Suggestions are assembled from fixed local templates and existing demo records. They are not
        generated by a language model, are not market research, and do not create a campaign when
        saved.
      </DemoNote>

      {planDraft ? (
        <SavePlanModal draft={planDraft} onClose={() => setPlanDraft(null)} />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Budget optimization                                                 */
/* ------------------------------------------------------------------ */

function BudgetOptimizationTab() {
  const { data } = useDemoData()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const chartAnim = useChartAnimation()
  const [shiftPct, setShiftPct] = useState(15)
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null)

  const rows = useMemo(() => buildBudgetRows(data.campaigns, shiftPct), [data.campaigns, shiftPct])
  const budget = totalBudget(data.campaigns)
  const spend = totalSpend(data.campaigns)
  const remaining = budget - spend
  const increases = rows.filter((row) => row.delta > 0)
  const reductions = rows.filter((row) => row.delta < 0)
  const chartRows = [...rows]
    .sort((a, b) => b.current - a.current)
    .slice(0, 7)
    .map((row) => ({
      name: row.campaign.name.split(' ').slice(0, 2).join(' '),
      current: row.current,
      suggested: row.suggested,
    }))

  const saveOptimization = () => {
    setPlanDraft({
      name: 'Indicative Q3 budget reallocation',
      objective: `Shift up to ${shiftPct}% of budget from the lowest-efficiency demo campaigns to the strongest three. Review before any real allocation change.`,
      budget,
      audience: 'Active marketing campaigns in the demo workspace',
    })
  }

  const exportRows = () => {
    const result = downloadCsv(
      'assistant-budget-optimization-demo',
      [
        { header: 'Campaign', value: (row: BudgetRow) => row.campaign.name },
        { header: 'Channel', value: (row: BudgetRow) => row.campaign.channel },
        { header: 'Current budget (INR)', value: (row: BudgetRow) => row.current },
        { header: 'Suggested budget (INR)', value: (row: BudgetRow) => row.suggested },
        { header: 'Delta (INR)', value: (row: BudgetRow) => row.delta },
        { header: 'Demo ROI (%)', value: (row: BudgetRow) => row.roi },
        { header: 'Rationale', value: (row: BudgetRow) => row.rationale },
      ],
      rows,
    )
    pushToast({
      title: result.ok ? 'Budget outline exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  return (
    <div className="stack-16">
      <TabIntro
        title="Budget optimization"
        description="Stage an indicative reallocation between demo campaigns. The model is simple: protect the strongest demo ROI and trim the weakest, with a visible intensity control."
        actions={
          <>
            <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={exportRows}>
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save size={14} />}
              onClick={saveOptimization}
            >
              Save optimization plan
            </Button>
          </>
        }
      />

      <DemoNote>
        This is a planning aid, not a reconciled budget. No allocation is changed, no finance system
        is updated and no approval is submitted. The numbers are derived only from demo campaigns.
      </DemoNote>

      <MetricGrid>
        <MetricCard
          label="Planned budget"
          value={formatINRCompact(budget)}
          sub={`${data.campaigns.length} demo campaigns`}
          icon={<Wallet size={15} />}
          tone="var(--chart-1)"
        />
        <MetricCard
          label="Recorded spend"
          value={formatINRCompact(spend)}
          sub={`${formatPercent(budgetUtilisation(spend, budget), 0)} of planned`}
          icon={<BarChart3 size={15} />}
          tone="var(--chart-2)"
          progress={budgetUtilisation(spend, budget) ?? 0}
        />
        <MetricCard
          label="Budget headroom"
          value={formatINRCompact(remaining)}
          sub={remaining < 0 ? 'Demo budget is oversubscribed' : 'Unspent against the demo plan'}
          icon={<TrendingUp size={15} />}
          tone={remaining < 0 ? 'var(--danger)' : 'var(--chart-5)'}
        />
        <MetricCard
          label="Reallocation intensity"
          value={`${shiftPct}%`}
          sub={`${increases.length} scale-ups · ${reductions.length} trims`}
          icon={<Wand2 size={15} />}
          tone="var(--chart-3)"
        />
      </MetricGrid>

      <SectionCard title="Adjust the suggestion" subtitle="Move the intensity to see how the indicative outline changes.">
        <div className="grid-2" style={{ alignItems: 'center' }}>
          <Field
            label={`Reallocation intensity: ${shiftPct}%`}
            htmlFor="budget-shift"
            hint="Per-campaign indicative movement. Higher values create a wider gap between scale-ups and trims."
          >
            <input
              id="budget-shift"
              type="range"
              min={5}
              max={30}
              step={5}
              value={shiftPct}
              onChange={(event) => setShiftPct(Number(event.target.value))}
              style={{ width: '100%' }}
            />
          </Field>
          <div className="mini-stats">
            <MiniStat label="Scale-up pool" value={formatINRCompact(increases.reduce((sum, row) => sum + row.delta, 0))} sub="Indicative increase" tone="var(--chart-2)" />
            <MiniStat label="Trim pool" value={formatINRCompact(Math.abs(reductions.reduce((sum, row) => sum + row.delta, 0)))} sub="Indicative reduction" tone="var(--chart-3)" />
          </div>
        </div>
        <div className="row-8 wrap mt-12">
          <Button variant="soft" size="xs" onClick={() => setShiftPct(10)}>
            Conservative 10%
          </Button>
          <Button variant="soft" size="xs" onClick={() => setShiftPct(15)}>
            Balanced 15%
          </Button>
          <Button variant="soft" size="xs" onClick={() => setShiftPct(25)}>
            Aggressive 25%
          </Button>
          <Button
            variant="ghost"
            size="xs"
            icon={<ArrowRight size={12} />}
            onClick={() => navigate('/marketing/plans/budget-tracking')}
          >
            Open budget tracking
          </Button>
        </div>
      </SectionCard>

      <ChartCard
        title="Current vs indicative budget"
        subtitle="Seven largest demo campaigns, ranked by current budget"
        height="lg"
        isEmpty={chartRows.length === 0}
        legend={
          <>
            <LegendItem color="var(--chart-8)" label="Current" />
            <LegendItem color="var(--chart-2)" label="Indicative" />
          </>
        }
      >
        <BarChart data={chartRows} margin={{ top: 8, right: 12, left: 2, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
          <YAxis {...axisProps} width={56} tickFormatter={(value) => formatINRCompact(Number(value))} />
          <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} cursor={{ fill: 'var(--surface-2)' }} />
          <Bar dataKey="current" name="Current" fill="var(--chart-8)" opacity={0.45} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
          <Bar dataKey="suggested" name="Indicative" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
        </BarChart>
      </ChartCard>

      <DataTable
        data={rows}
        rowKey={(row) => row.campaign.id}
        searchable={(row) => `${row.campaign.name} ${row.campaign.channel} ${row.rationale}`}
        searchPlaceholder="Search campaigns…"
        pageSize={8}
        initialSort={{ columnId: 'roi', direction: 'desc' }}
        columns={[
          {
            id: 'campaign',
            header: 'Campaign',
            mobileLabel: 'Campaign',
            sortValue: (row) => row.campaign.name,
            render: (row) => (
              <div>
                <p className="cell-primary">{row.campaign.name}</p>
                <p className="text-xs muted">{row.campaign.channel} · {row.campaign.status}</p>
              </div>
            ),
          },
          {
            id: 'current',
            header: 'Current',
            align: 'right',
            mobileLabel: 'Current budget',
            sortValue: (row) => row.current,
            render: (row) => formatINRCompact(row.current),
          },
          {
            id: 'suggested',
            header: 'Indicative',
            align: 'right',
            mobileLabel: 'Indicative budget',
            sortValue: (row) => row.suggested,
            render: (row) => <span className="cell-strong">{formatINRCompact(row.suggested)}</span>,
          },
          {
            id: 'delta',
            header: 'Change',
            align: 'right',
            mobileLabel: 'Change',
            sortValue: (row) => row.delta,
            render: (row) => (
              <Badge tone={row.delta > 0 ? 'success' : row.delta < 0 ? 'warning' : 'neutral'} dot={false}>
                {row.delta > 0 ? '+' : ''}
                {formatINRCompact(row.delta)}
              </Badge>
            ),
          },
          {
            id: 'roi',
            header: 'Demo ROI',
            align: 'right',
            mobileLabel: 'Demo ROI',
            sortValue: (row) => row.roi ?? -999,
            render: (row) => formatPercent(row.roi, 0),
          },
          {
            id: 'rationale',
            header: 'Why',
            mobileLabel: 'Rationale',
            hideMobile: true,
            render: (row) => <span className="text-xs muted">{row.rationale}</span>,
          },
        ]}
        footerNote="Indicative demo outline — not an approved budget."
      />

      <div className="grid-2">
        <SectionCard title="How the outline is built" subtitle="Transparent, deterministic rules">
          <DetailRows
            columns={1}
            items={[
              { label: 'Rank', value: 'Eligible campaigns are ordered by demo ROI, using campaign-reported spend and revenue.' },
              { label: 'Scale', value: 'The top three receive an indicative increase split across them.' },
              { label: 'Trim', value: 'The two lowest-ranked eligible campaigns receive an indicative reduction, with a 65% floor.' },
              { label: 'Review', value: 'A human still decides whether any real allocation should change.' },
            ]}
          />
        </SectionCard>
        <SectionCard title="Useful review questions">
          <ul className="stack-6 text-sm secondary" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Is the ROI figure campaign-reported or independently verified?</li>
            <li>Would the trim break a committed vendor scope or contract?</li>
            <li>Does the scale-up have creative and landing-page capacity?</li>
            <li>Which finance owner needs to review the real reallocation?</li>
          </ul>
          <DataNote>
            Demo ROI is a gross comparison, not audited profit. Campaign-reported revenue can
            include unattributed or estimated value.
          </DataNote>
        </SectionCard>
      </div>

      {planDraft ? (
        <SavePlanModal draft={planDraft} onClose={() => setPlanDraft(null)} />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Content ideas                                                       */
/* ------------------------------------------------------------------ */

function ContentIdeasTab() {
  const { data, update } = useDemoData()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const [product, setProduct] = useState('SmartHome Hub')
  const [channel, setChannel] = useState<ContentChannel>('Instagram')
  const [variant, setVariant] = useState(0)
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null)

  const products = useMemo(() => productOptions(data.campaigns), [data.campaigns])
  const ideas = useMemo(
    () => buildContentIdeas(product, channel, variant),
    [product, channel, variant],
  )
  const savedTitles = useMemo(
    () => new Set(data.content.map((item) => item.title.toLowerCase())),
    [data.content],
  )

  const saveIdea = (idea: ContentIdea) => {
    if (savedTitles.has(idea.title.toLowerCase())) {
      pushToast({
        title: 'Already in the content library',
        description: 'This demo idea has already been saved.',
        tone: 'info',
      })
      return
    }
    const item: ContentItem = {
      id: uid('CNT'),
      title: idea.title,
      type: 'Idea',
      campaignId: null,
      status: 'Idea',
      body: `Hook: ${idea.hook}\n\nFormat: ${idea.format} (${idea.channel})\n\nAngle: ${idea.angle}\n\nCTA: ${idea.cta}`,
      owner: 'Ananya Rao',
      createdAt: new Date().toISOString(),
      channel: idea.channel,
    }
    update('content', (current) => [item, ...current])
    pushToast({
      title: 'Idea saved to content library',
      description: `“${idea.title}” is now a local demo content idea.`,
      tone: 'success',
    })
  }

  const saveAll = () => {
    const fresh = ideas.filter((idea) => !savedTitles.has(idea.title.toLowerCase()))
    if (fresh.length === 0) {
      pushToast({ title: 'All ideas already saved', description: 'Generate a new variation to add more.', tone: 'info' })
      return
    }
    const items: ContentItem[] = fresh.map((idea) => ({
      id: uid('CNT'),
      title: idea.title,
      type: 'Idea',
      campaignId: null,
      status: 'Idea',
      body: `Hook: ${idea.hook}\n\nFormat: ${idea.format} (${idea.channel})\n\nAngle: ${idea.angle}\n\nCTA: ${idea.cta}`,
      owner: 'Ananya Rao',
      createdAt: new Date().toISOString(),
      channel: idea.channel,
    }))
    update('content', (current) => [...items, ...current])
    pushToast({
      title: `${items.length} ideas saved locally`,
      description: 'They now appear in the demo content library as ideas.',
      tone: 'success',
    })
  }

  const copyIdea = async (idea: ContentIdea) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard not available')
      await navigator.clipboard.writeText(
        `${idea.title}\n\nHook: ${idea.hook}\nFormat: ${idea.format} (${idea.channel})\nAngle: ${idea.angle}\nCTA: ${idea.cta}`,
      )
      pushToast({ title: 'Idea copied', description: 'Use it in your own brief or document.', tone: 'success' })
    } catch {
      pushToast({ title: 'Copy unavailable', description: 'Your browser did not allow clipboard access.', tone: 'error' })
    }
  }

  const exportIdeas = () => {
    const result = downloadCsv(
      'assistant-content-ideas-demo',
      [
        { header: 'Title', value: (row: ContentIdea) => row.title },
        { header: 'Channel', value: (row: ContentIdea) => row.channel },
        { header: 'Format', value: (row: ContentIdea) => row.format },
        { header: 'Hook', value: (row: ContentIdea) => row.hook },
        { header: 'Angle', value: (row: ContentIdea) => row.angle },
        { header: 'CTA', value: (row: ContentIdea) => row.cta },
      ],
      ideas,
    )
    pushToast({
      title: result.ok ? 'Content ideas exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  return (
    <div className="stack-16">
      <TabIntro
        title="Content idea studio"
        description="Generate local content starters for a product and channel, then save the useful ones to the demo content library."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={() => setVariant((current) => current + 1)}
            >
              New variation
            </Button>
            <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={exportIdeas}>
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save size={14} />}
              onClick={saveAll}
            >
              Save all new
            </Button>
          </>
        }
      />

      <SectionCard>
        <div className="grid-3">
          <Field label="Product" htmlFor="content-product">
            <select
              id="content-product"
              className="select"
              value={product}
              onChange={(event) => {
                setProduct(event.target.value)
                setVariant(0)
              }}
            >
              {products.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel" htmlFor="content-channel">
            <select
              id="content-channel"
              className="select"
              value={channel}
              onChange={(event) => {
                setChannel(event.target.value as ContentChannel)
                setVariant(0)
              }}
            >
              {CONTENT_CHANNELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Saved ideas" htmlFor="content-saved">
            <input
              id="content-saved"
              className="input"
              value={`${data.content.filter((item) => item.type === 'Idea').length} in the demo library`}
              readOnly
              aria-readonly="true"
            />
          </Field>
        </div>
      </SectionCard>

      <MetricGrid>
        <MetricCard label="Ideas generated" value={ideas.length} sub={`${channel} · ${product}`} icon={<Lightbulb size={15} />} tone="var(--chart-3)" />
        <MetricCard label="Formats in the mix" value={new Set(ideas.map((idea) => idea.format)).size} sub="Reusable across the channel" icon={<FileText size={15} />} tone="var(--chart-1)" />
        <MetricCard label="Already saved" value={ideas.filter((idea) => savedTitles.has(idea.title.toLowerCase())).length} sub="Exact-title match in the demo library" icon={<CheckCircle2 size={15} />} tone="var(--chart-2)" />
        <MetricCard label="Content library ideas" value={data.content.filter((item) => item.type === 'Idea').length} sub="Across all demo products" icon={<MessageSquare size={15} />} tone="var(--chart-5)" />
      </MetricGrid>

      <EntityGrid columns={3}>
        {ideas.map((idea) => {
          const saved = savedTitles.has(idea.title.toLowerCase())
          return (
            <EntityCard
              key={idea.id}
              title={idea.title}
              subtitle={`${idea.channel} · ${idea.format}`}
              badge={<Badge tone={saved ? 'success' : 'accent'}>{saved ? 'Saved' : 'New'}</Badge>}
              actions={
                <>
                  <Button
                    variant={saved ? 'soft' : 'primary'}
                    size="xs"
                    icon={saved ? <CheckCircle2 size={12} /> : <Save size={12} />}
                    onClick={() => saveIdea(idea)}
                    disabled={saved}
                  >
                    {saved ? 'In library' : 'Save idea'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={<Copy size={12} />}
                    onClick={() => copyIdea(idea)}
                  >
                    Copy
                  </Button>
                </>
              }
            >
              <p className="text-sm secondary">{idea.angle}</p>
              <p className="text-xs muted mt-8">CTA: {idea.cta}</p>
            </EntityCard>
          )
        })}
      </EntityGrid>

      <div className="row-8 wrap">
        <Button
          variant="soft"
          size="sm"
          icon={<ArrowRight size={14} />}
          onClick={() => navigate('/marketing/digital/content-studio')}
        >
          Open demo content studio
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Target size={14} />}
          onClick={() =>
            setPlanDraft({
              name: `${product} content pilot — ${channel}`,
              objective: `Save and produce a small ${channel.toLowerCase()} content pilot for ${product}. Review formats and calls to action before production.`,
              budget: 180000,
              audience: 'Owned-channel audience and existing enquiries',
            })
          }
        >
          Save content pilot plan
        </Button>
      </div>

      <DemoNote>
        Ideas are fixed local prompts filled with the selected product and channel. Copying or saving
        them does not schedule, publish or send anything. You can delete saved ideas from the content
        library if you are exploring.
      </DemoNote>

      {planDraft ? (
        <SavePlanModal draft={planDraft} onClose={() => setPlanDraft(null)} />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Performance insights                                                */
/* ------------------------------------------------------------------ */

function PerformanceInsightsTab() {
  const { data } = useDemoData()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const chartAnim = useChartAnimation()
  const [categoryFilter, setCategoryFilter] = useState('All')
  const insights = useMemo(() => buildPerformanceInsights(data), [data])
  const assets = useMemo(() => buildBudgetRows(data.campaigns, 10), [data.campaigns])

  const categories = ['All', ...new Set(insights.map((insight) => insight.category))]
  const filtered = useMemo(
    () =>
      categoryFilter === 'All'
        ? insights
        : insights.filter((insight) => insight.category === categoryFilter),
    [insights, categoryFilter],
  )

  const spend = totalSpend(data.campaigns)
  const revenue = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.revenue, 0)
  const blendedRoi = spend > 0 ? ((revenue - spend) / spend) * 100 : null
  const totalLeads = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.leads, 0)
  const totalConversions = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.conversions, 0)
  const blendedCpl = totalLeads > 0 ? spend / totalLeads : null

  const exportInsights = () => {
    const result = downloadCsv(
      'assistant-performance-insights-demo',
      [
        { header: 'Category', value: (row: PerformanceInsight) => row.category },
        { header: 'Insight', value: (row: PerformanceInsight) => row.title },
        { header: 'Detail', value: (row: PerformanceInsight) => row.body },
        { header: 'Impact', value: (row: PerformanceInsight) => row.impact },
        { header: 'Action', value: (row: PerformanceInsight) => row.actionLabel },
      ],
      filtered,
    )
    pushToast({
      title: result.ok ? 'Insights exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  return (
    <div className="stack-16">
      <TabIntro
        title="Performance insights"
        description="A deterministic review of the demo workspace: strongest and weakest campaigns, budget pressure, follow-ups, approvals and partner signals."
        actions={
          <>
            <select
              className="select"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter insights by category"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={exportInsights}>
              Export CSV
            </Button>
          </>
        }
      />

      <MetricGrid>
        <MetricCard label="Blended demo ROI" value={formatPercent(blendedRoi, 0)} sub={`${formatINRCompact(revenue)} revenue vs ${formatINRCompact(spend)} spend`} icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
        <MetricCard label="Blended cost per lead" value={blendedCpl !== null ? formatINR(blendedCpl) : '—'} sub={`${formatNumber(totalLeads)} campaign-reported leads`} icon={<Target size={15} />} tone="var(--chart-1)" />
        <MetricCard label="Lead-to-conversion" value={formatPercent(totalLeads > 0 ? (totalConversions / totalLeads) * 100 : null, 1)} sub={`${formatNumber(totalConversions)} conversions in the sample`} icon={<Users size={15} />} tone="var(--chart-5)" />
        <MetricCard label="Signals found" value={filtered.length} sub={`${insights.length} total across ${categories.length - 1} categories`} icon={<AlertTriangle size={15} />} tone="var(--chart-3)" />
      </MetricGrid>

      <DemoNote>
        Insights are generated from the demo records currently in this browser. They are rule-based
        observations, not an audit, forecast or recommendation from a live analytics service.
      </DemoNote>

      <div className="grid-2">
        <ChartCard
          title="Demo ROI by campaign"
          subtitle="Campaigns with both recorded spend and revenue"
          height="md"
          isEmpty={assets.length === 0}
        >
          <BarChart
            data={assets
              .filter((row) => row.roi !== null)
              .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
              .slice(0, 8)
              .map((row) => ({
                name: row.campaign.name.split(' ')[0],
                roi: Math.round(row.roi ?? 0),
              }))}
            margin={{ top: 8, right: 8, left: 2, bottom: 0 }}
          >
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
            <YAxis {...axisProps} width={42} tickFormatter={(value) => `${value}%`} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value.toFixed(0)}%`} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="roi" name="Demo ROI" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
          </BarChart>
        </ChartCard>
        <SectionCard title="How to read these signals" subtitle="A short review checklist">
          <DetailRows
            columns={1}
            items={[
              { label: 'Scope', value: 'Campaign metrics are sample campaign-reported values; CRM lead counts are a separate demo queue.' },
              { label: 'Thresholds', value: 'Budget pressure starts at 85% use. ROI is gross revenue against spend, not profit.' },
              { label: 'Action', value: 'Every action opens the relevant module. Nothing is changed automatically from this page.' },
              { label: 'Limits', value: 'There is no statistical model, forecast confidence interval or external benchmark feed.' },
            ]}
          />
        </SectionCard>
      </div>

      <div className="row-8 wrap">
        <Badge tone="info" dot={false}>{filtered.length} visible</Badge>
        <Badge tone="neutral" dot={false}>Local rules</Badge>
        <Badge tone="neutral" dot={false}>No live analytics</Badge>
      </div>

      <EntityGrid columns={2}>
        {filtered.map((insight) => (
          <EntityCard
            key={insight.id}
            title={insight.title}
            subtitle={insight.category}
            badge={<Badge tone={insight.tone}>{insight.impact}</Badge>}
            meta={<span>{insight.body}</span>}
            actions={
              <Button
                variant="soft"
                size="xs"
                icon={<ArrowRight size={12} />}
                onClick={() => navigate(insight.href)}
              >
                {insight.actionLabel}
              </Button>
            }
          />
        ))}
      </EntityGrid>

      {filtered.length === 0 ? (
        <SectionCard>
          <p className="text-sm muted">No signals in this category for the current demo data.</p>
        </SectionCard>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Competitor comparison                                               */
/* ------------------------------------------------------------------ */

function CompetitorComparisonTab() {
  const { data } = useDemoData()
  const { pushToast } = useToast()
  const chartAnim = useChartAnimation()
  const [threatFilter, setThreatFilter] = useState('All')
  const rows = useMemo(() => buildCompetitorRows(data), [data])
  const filtered = useMemo(
    () =>
      threatFilter === 'All'
        ? rows
        : rows.filter((row) => row.threat === threatFilter || (threatFilter === 'Reference' && row.isUs)),
    [rows, threatFilter],
  )
  const us = rows.find((row) => row.isUs)
  const leader = rows.filter((row) => !row.isUs).sort((a, b) => b.shareOfVoice - a.shareOfVoice)[0]
  const highestEngagement = rows.filter((row) => !row.isUs).sort((a, b) => b.engagement - a.engagement)[0]
  const highestPrice = rows.filter((row) => !row.isUs).sort((a, b) => b.priceIndex - a.priceIndex)[0]

  const exportRows = () => {
    const result = downloadCsv(
      'assistant-competitor-benchmark-demo',
      [
        { header: 'Brand', value: (row: CompetitorRow) => row.brand },
        { header: 'Positioning', value: (row: CompetitorRow) => row.positioning },
        { header: 'Illustrative media spend (INR)', value: (row: CompetitorRow) => row.mediaSpend },
        { header: 'Share of voice (%)', value: (row: CompetitorRow) => row.shareOfVoice },
        { header: 'Engagement rate (%)', value: (row: CompetitorRow) => row.engagement },
        { header: 'Sentiment score', value: (row: CompetitorRow) => row.sentiment },
        { header: 'Price index', value: (row: CompetitorRow) => row.priceIndex },
        { header: 'Field observations', value: (row: CompetitorRow) => row.observations },
      ],
      filtered,
    )
    pushToast({
      title: result.ok ? 'Benchmark exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  return (
    <div className="stack-16">
      <TabIntro
        title="Competitor comparison"
        description="An illustrative benchmark built for discussion: our demo campaign data beside a fixed competitor set. It is not live market intelligence."
        actions={
          <>
            <select
              className="select"
              value={threatFilter}
              onChange={(event) => setThreatFilter(event.target.value)}
              aria-label="Filter competitors by threat level"
            >
              <option value="All">All brands</option>
              <option value="High">High threat</option>
              <option value="Medium">Medium threat</option>
              <option value="Low">Low threat</option>
              <option value="Reference">Reference only</option>
            </select>
            <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={exportRows}>
              Export CSV
            </Button>
          </>
        }
      />

      <DemoNote>
        Competitor figures are illustrative sample values, not measured market data. Field
        observations come from the local market-research demo records.
      </DemoNote>

      <MetricGrid>
        <MetricCard
          label="Our share of voice"
          value={formatPercent(us?.shareOfVoice ?? null, 0)}
          sub="Illustrative benchmark position"
          icon={<BarChart3 size={15} />}
          tone="var(--chart-2)"
        />
        <MetricCard
          label="Sample media spend"
          value={formatINRCompact(us?.mediaSpend ?? 0)}
          sub={`${formatNumber(us?.observations ?? 0)} field observations`}
          icon={<Wallet size={15} />}
          tone="var(--chart-1)"
        />
        <MetricCard
          label="Nearest leader"
          value={leader?.brand ?? '—'}
          sub={leader ? `${formatPercent(leader.shareOfVoice, 0)} | ${formatINRCompact(leader.mediaSpend)} sample spend` : 'No competitor set'}
          icon={<Target size={15} />}
          tone="var(--chart-3)"
        />
        <MetricCard
          label="Highest engagement"
          value={highestEngagement?.brand ?? '—'}
          sub={highestEngagement ? `${formatPercent(highestEngagement.engagement, 1)} sample rate` : 'No competitor set'}
          icon={<TrendingUp size={15} />}
          tone="var(--chart-5)"
        />
      </MetricGrid>

      <div className="grid-2">
        <ChartCard
          title="Illustrative share of voice"
          subtitle="Fixed benchmark values, not measured share"
          height="md"
          isEmpty={rows.length === 0}
          legend={<><LegendItem color="var(--chart-2)" label="Our demo brand" /><LegendItem color="var(--chart-8)" label="Benchmark set" /></>}
        >
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
            <CartesianGrid {...gridProps} vertical horizontal={false} />
            <XAxis type="number" {...axisProps} domain={[0, 30]} tickFormatter={(value) => `${value}%`} />
            <YAxis type="category" dataKey="brand" {...axisProps} width={112} tick={{ ...axisProps.tick, fontSize: 9.5 }} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value.toFixed(0)}%`} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="shareOfVoice" name="Share of voice" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim}>
              {rows.map((row, index) => (
                <Cell key={row.id} fill={row.isUs ? 'var(--chart-2)' : chartColors[(index + 2) % chartColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <SectionCard title="What the sample suggests" subtitle="Conversation starters, not conclusions">
          <ul className="stack-8 text-sm secondary" style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              {leader
                ? `${leader.brand} sits at the top of the illustrative share table. Compare message, not just spend.`
                : 'No competitor benchmark is available.'}
            </li>
            <li>
              {highestEngagement
                ? `${highestEngagement.brand} has the strongest sample engagement rate, which may indicate a more useful creative format to study.`
                : 'Engagement comparison is unavailable.'}
            </li>
            <li>
              {highestPrice
                ? `${highestPrice.brand} carries the highest sample price index. There may be room to defend value rather than discount.`
                : 'Price index comparison is unavailable.'}
            </li>
            <li>
              Use the field research notes to test whether these illustrative positions match what
              teams actually see in stores.
            </li>
          </ul>
          <DataNote>
            Values are static demo benchmarks. Do not present them as measured market share or
            competitor performance.
          </DataNote>
        </SectionCard>
      </div>

      <DataTable
        data={filtered}
        rowKey={(row) => row.id}
        searchable={(row) => `${row.brand} ${row.positioning} ${row.threat}`}
        searchPlaceholder="Search brands or positioning…"
        pageSize={8}
        columns={[
          {
            id: 'brand',
            header: 'Brand',
            mobileLabel: 'Brand',
            sortValue: (row) => row.brand,
            render: (row) => (
              <div>
                <p className="cell-primary">
                  {row.brand} {row.isUs ? <Badge tone="info" dot={false}>Us</Badge> : null}
                </p>
                <p className="text-xs muted">{row.positioning}</p>
              </div>
            ),
          },
          {
            id: 'share',
            header: 'Share of voice',
            align: 'right',
            mobileLabel: 'Share of voice',
            sortValue: (row) => row.shareOfVoice,
            render: (row) => formatPercent(row.shareOfVoice, 0),
          },
          {
            id: 'spend',
            header: 'Media spend',
            align: 'right',
            mobileLabel: 'Media spend',
            sortValue: (row) => row.mediaSpend,
            render: (row) => formatINRCompact(row.mediaSpend),
          },
          {
            id: 'engagement',
            header: 'Engagement',
            align: 'right',
            mobileLabel: 'Engagement',
            hideMobile: true,
            sortValue: (row) => row.engagement,
            render: (row) => formatPercent(row.engagement, 1),
          },
          {
            id: 'sentiment',
            header: 'Sentiment',
            align: 'right',
            mobileLabel: 'Sentiment',
            hideMobile: true,
            sortValue: (row) => row.sentiment,
            render: (row) => `${row.sentiment}/100`,
          },
          {
            id: 'price',
            header: 'Price index',
            align: 'right',
            mobileLabel: 'Price index',
            hideMobile: true,
            sortValue: (row) => row.priceIndex,
            render: (row) => row.priceIndex,
          },
          {
            id: 'threat',
            header: 'Threat',
            align: 'right',
            mobileLabel: 'Threat',
            sortValue: (row) => row.threat,
            render: (row) => (
              <Badge tone={row.threat === 'High' ? 'danger' : row.threat === 'Medium' ? 'warning' : row.isUs ? 'info' : 'neutral'}>
                {row.threat}
              </Badge>
            ),
          },
          {
            id: 'observations',
            header: 'Field notes',
            align: 'right',
            mobileLabel: 'Field notes',
            sortValue: (row) => row.observations,
            render: (row) => row.observations,
          },
        ]}
        footerNote="Illustrative benchmark set — not live market data."
      />

      <InsightLine>
        The useful output here is a better question: where should our message, price or creative
        differ from the benchmark rather than simply outspend it?
      </InsightLine>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page switch                                                         */
/* ------------------------------------------------------------------ */

export function AIAssistantPage({ tab }: { tab: string }) {
  if (tab === 'campaign-suggestions') return <CampaignSuggestionsTab />
  if (tab === 'budget-optimization') return <BudgetOptimizationTab />
  if (tab === 'content-ideas') return <ContentIdeasTab />
  if (tab === 'performance-insights') return <PerformanceInsightsTab />
  if (tab === 'competitor-comparison') return <CompetitorComparisonTab />
  return <AssistantOverview />
}
