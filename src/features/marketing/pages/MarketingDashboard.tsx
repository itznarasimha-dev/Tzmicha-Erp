import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  Megaphone,
  Radio,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { ProgressBar, utilisationTone } from '../components/ui/ProgressBar'
import { Avatar } from '../components/ui/Avatar'
import { KpiCard } from '../components/marketing/KpiCard'
import { WorkflowStrip, WorkflowLegend } from '../components/marketing/WorkflowStrip'
import {
  ChartCard,
  ChartTooltip,
  LegendItem,
  PieLegend,
  Funnel,
  chartColors,
  gridProps,
  axisProps,
  useChartAnimation,
} from '../components/charts/ChartKit'
import { useDemoData } from '../context/DemoDataContext'
import { useMarketingDashboard } from '../useMarketingData'
import { aiRecommendations, priorities } from '../data/marketing/dashboard'
import { DEMO_WORKFLOW, type WorkflowStage } from '../data/marketing/workflow'
import { demoEmployee } from '../data/marketing/plans'
import { RoleDashboardOverview } from '../components/workflow/RoleDashboardOverview'
import {
  campaignRoi,
  computeLeadStats,
  funnelData,
  growth,
  leadSourceCategoryData,
  safeDivide,
} from '../utils/analytics'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../utils/format'
import { followUpLabel, isOverdue, isToday } from '../utils/dates'
import { formatDateShort } from '../utils/format'

const activityIconMap = {
  campaign: Megaphone,
  lead: Users,
  approval: BadgeCheck,
  expense: Wallet,
  content: Sparkles,
} as const

type DashboardActivityKind = keyof typeof activityIconMap

interface DashboardActivity {
  id: string
  title: string
  detail: string
  at: string
  kind: DashboardActivityKind
}

interface MonthBucket {
  key: string
  label: string
}

const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short' })

function monthKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function recentMonths(count: number): MonthBucket[] {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1)
    return {
      key: monthKey(date),
      label: monthFormatter.format(date),
    }
  })
}

export function MarketingDashboard() {
  const navigate = useNavigate()
  const { data, dataSource, syncStatus, syncError } = useDemoData()
  const chartAnim = useChartAnimation()
  const [completedPriorities, setCompletedPriorities] = useState<Set<string>>(new Set())

  const dashboard = useMarketingDashboard()
  const apiLoading = dashboard.loading
  const apiError = dashboard.error
  const useApi = dataSource === 'api'

  // API-backed summary for KPI cards when in API mode
  const apiSummary = useApi ? dashboard.data?.summary : null

  const months = useMemo(() => recentMonths(6), [])
  const monthlyLeadTarget = demoEmployee.targets.monthlyLeads

  const totals = useMemo(() => {
    const budget = data.campaigns.reduce((sum, campaign) => sum + campaign.budget, 0)
    const spend = data.campaigns.reduce((sum, campaign) => sum + campaign.spend, 0)
    const revenue = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.revenue, 0)
    const campaignLeads = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.leads, 0)
    const campaignQualified = data.campaigns.reduce(
      (sum, campaign) => sum + campaign.kpis.qualifiedLeads,
      0,
    )
    const campaignConversions = data.campaigns.reduce(
      (sum, campaign) => sum + campaign.kpis.conversions,
      0,
    )
    const active = data.campaigns.filter((campaign) => campaign.status === 'Active').length
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : null
    return {
      budget,
      spend,
      revenue,
      campaignLeads,
      campaignQualified,
      campaignConversions,
      active,
      total: data.campaigns.length,
      roi,
    }
  }, [data.campaigns])

  const leadStats = useMemo(() => computeLeadStats(data.leads), [data.leads])
  const openOpportunities = data.opportunities.filter(
    (opportunity) => opportunity.stage !== 'Won' && opportunity.stage !== 'Lost',
  ).length
  const sourceData = useMemo(() => leadSourceCategoryData(data.leads).slice(0, 7), [data.leads])

  const campaignSeries = useMemo(() => {
    const buckets = new Map(
      months.map((month) => [
        month.key,
        {
          month: month.label,
          campaigns: 0,
          leads: 0,
          qualified: 0,
          conversions: 0,
          revenue: 0,
          budget: 0,
          spend: 0,
        },
      ]),
    )
    data.campaigns.forEach((campaign) => {
      const bucket = buckets.get(monthKey(campaign.startDate))
      if (!bucket) return
      bucket.campaigns += 1
      bucket.leads += campaign.kpis.leads
      bucket.qualified += campaign.kpis.qualifiedLeads
      bucket.conversions += campaign.kpis.conversions
      bucket.revenue += campaign.kpis.revenue
      bucket.budget += campaign.budget
      bucket.spend += campaign.spend
    })
    return [...buckets.values()]
  }, [data.campaigns, months])

  const leadFlowSeries = useMemo(() => {
    const buckets = new Map(
      months.map((month) => [
        month.key,
        {
          month: month.label,
          leads: 0,
          qualified: 0,
          conversions: 0,
          target: monthlyLeadTarget,
        },
      ]),
    )
    data.leads.forEach((lead) => {
      const bucket = buckets.get(monthKey(lead.createdAt))
      if (!bucket) return
      bucket.leads += 1
      if (lead.status === 'Qualified' || lead.status === 'Converted') bucket.qualified += 1
      if (lead.status === 'Converted') bucket.conversions += 1
    })
    return [...buckets.values()]
  }, [data.leads, months, monthlyLeadTarget])

  const currentMonthKey = months[months.length - 1]?.key ?? monthKey(new Date().toISOString())
  const currentMonthFlow = leadFlowSeries.find(
    (point, index) => months[index]?.key === currentMonthKey,
  )
  const currentMonthLeads = currentMonthFlow?.leads ?? 0
  const targetAchievement =
    monthlyLeadTarget > 0 ? (currentMonthLeads / monthlyLeadTarget) * 100 : null

  const previousCampaignPoint = campaignSeries[campaignSeries.length - 2]
  const currentCampaignPoint = campaignSeries[campaignSeries.length - 1]
  const previousLeadPoint = leadFlowSeries[leadFlowSeries.length - 2]
  const currentLeadPoint = leadFlowSeries[leadFlowSeries.length - 1]

  const leadsDelta = growth(currentLeadPoint?.leads ?? 0, previousLeadPoint?.leads ?? 0)
  const qualifiedDelta = growth(
    currentLeadPoint?.qualified ?? 0,
    previousLeadPoint?.qualified ?? 0,
  )
  const conversionDelta = growth(
    currentLeadPoint?.conversions ?? 0,
    previousLeadPoint?.conversions ?? 0,
  )
  const spendDelta = growth(
    currentCampaignPoint?.spend ?? 0,
    previousCampaignPoint?.spend ?? 0,
  )
  const roiDelta = growth(
    currentCampaignPoint?.spend
      ? (currentCampaignPoint.revenue - currentCampaignPoint.spend) / currentCampaignPoint.spend
      : 0,
    previousCampaignPoint?.spend
      ? (previousCampaignPoint.revenue - previousCampaignPoint.spend) /
          previousCampaignPoint.spend
      : 0,
  )

  const leadSpark = leadFlowSeries.map((point) => point.leads)
  const qualifiedSpark = leadFlowSeries.map((point) => point.qualified)
  const conversionSpark = leadFlowSeries.map((point) => point.conversions)
  const targetSpark = leadFlowSeries.map((point) =>
    monthlyLeadTarget > 0 ? (point.leads / monthlyLeadTarget) * 100 : 0,
  )
  const spendSpark = campaignSeries.map((point) => point.spend)
  const campaignSpark = campaignSeries.map((point) => point.campaigns)
  const roiSpark = campaignSeries.map((point) =>
    point.spend > 0 ? ((point.revenue - point.spend) / point.spend) * 100 : 0,
  )

  const channelStats = useMemo(() => {
    const buckets = new Map<
      string,
      { channel: string; spend: number; leads: number; revenue: number }
    >()
    data.campaigns.forEach((campaign) => {
      const bucket = buckets.get(campaign.channel) ?? {
        channel: campaign.channel,
        spend: 0,
        leads: 0,
        revenue: 0,
      }
      bucket.spend += campaign.spend
      bucket.leads += campaign.kpis.leads
      bucket.revenue += campaign.kpis.revenue
      buckets.set(campaign.channel, bucket)
    })
    return [...buckets.values()]
      .map((bucket) => ({
        ...bucket,
        roi: bucket.spend > 0 ? ((bucket.revenue - bucket.spend) / bucket.spend) * 100 : null,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [data.campaigns])

  const funnel = useMemo(
    () =>
      funnelData(data.leads, data.opportunities).map((stage, index) => ({
        label: stage.stage,
        value: stage.value,
        display: formatNumber(stage.value),
        color: chartColors[index % chartColors.length],
      })),
    [data.leads, data.opportunities],
  )

  const roiCampaigns = useMemo(
    () =>
      [...data.campaigns]
        .filter((campaign) => campaign.spend > 0)
        .sort((a, b) => (campaignRoi(b) ?? 0) - (campaignRoi(a) ?? 0))
        .slice(0, 6),
    [data.campaigns],
  )

  const upcomingCampaigns = useMemo(
    () =>
      [...data.campaigns]
        .filter((campaign) => campaign.status === 'Planned' || campaign.status === 'Active')
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
        .slice(0, 4),
    [data.campaigns],
  )

  const pendingApprovals = data.approvals
    .filter((approval) => approval.status === 'Pending')
    .slice(0, 3)
  const pendingApprovalCount = data.approvals.filter(
    (approval) => approval.status === 'Pending',
  ).length
  const dueFollowUps = data.leads
    .filter(
      (lead) =>
        lead.nextFollowUp &&
        !lead.converted &&
        (isToday(lead.nextFollowUp) || isOverdue(lead.nextFollowUp)),
    )
    .slice(0, 4)

  const budgetRows = [...data.campaigns]
    .filter((campaign) => campaign.budget > 0 && campaign.spend > 0)
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 4)

  const assignedCustomers = data.customers.filter((customer) =>
    Boolean(customer.salesRepId),
  ).length
  const loggedExpenses = data.expenses
    .filter((expense) => expense.status !== 'Rejected')
    .reduce((sum, expense) => sum + expense.amount, 0)
  const settledExpenses = data.expenses
    .filter((expense) => expense.status === 'Approved' || expense.status === 'Paid')
    .reduce((sum, expense) => sum + expense.amount, 0)
  const expenseProgress = safeDivide(settledExpenses, loggedExpenses)

  const workflowStages = useMemo<WorkflowStage[]>(() => {
    const stageData: Record<
      string,
      Pick<WorkflowStage, 'status' | 'metric' | 'progress'>
    > = {
      plan: {
        status: data.plans.length ? 'Completed' : 'Not Started',
        metric: data.plans.length
          ? `${formatINRCompact(totals.budget)} campaign budgets`
          : 'No plans created yet',
        progress: data.plans.length ? 100 : 0,
      },
      approval: {
        status: pendingApprovalCount ? 'Pending Approval' : 'Completed',
        metric: pendingApprovalCount
          ? `${pendingApprovalCount} request${pendingApprovalCount === 1 ? '' : 's'} awaiting review`
          : 'No approvals pending',
        progress: data.approvals.length
          ? ((data.approvals.length - pendingApprovalCount) / data.approvals.length) * 100
          : 0,
      },
      execute: {
        status: totals.active ? 'In Progress' : 'Not Started',
        metric: `${totals.active} live of ${totals.total} campaigns`,
        progress: totals.total ? (totals.active / totals.total) * 100 : 0,
      },
      expenses: {
        status: data.expenses.length ? 'In Progress' : 'Not Started',
        metric: `${formatINRCompact(loggedExpenses)} logged · ${
          data.expenses.filter((expense) => expense.status === 'Pending Approval').length
        } pending`,
        progress: (expenseProgress ?? 0) * 100,
      },
      leads: {
        status: data.leads.length ? 'In Progress' : 'Not Started',
        metric: `${formatNumber(data.leads.length)} lead records in the workspace`,
        progress: (safeDivide(currentMonthLeads, monthlyLeadTarget) ?? 0) * 100,
      },
      qualification: {
        status: leadStats.qualified ? 'In Progress' : 'Not Started',
        metric: `${formatNumber(leadStats.qualified)} qualified · ${formatPercent(
          leadStats.conversionRate,
        )} converted`,
        progress: (safeDivide(leadStats.qualified, leadStats.total) ?? 0) * 100,
      },
      convert: {
        status: data.customers.length ? 'In Progress' : 'Not Started',
        metric: `${formatNumber(data.customers.length)} customers · ${formatNumber(
          data.opportunities.length,
        )} opportunities`,
        progress: (safeDivide(data.customers.length, data.leads.length) ?? 0) * 100,
      },
      assign: {
        status:
          data.customers.length && assignedCustomers === data.customers.length
            ? 'Completed'
            : assignedCustomers
              ? 'In Progress'
              : 'Not Started',
        metric: `${assignedCustomers}/${data.customers.length} customers assigned to a rep`,
        progress: (safeDivide(assignedCustomers, data.customers.length) ?? 0) * 100,
      },
      roi: {
        status: totals.roi === null ? 'Not Started' : 'In Progress',
        metric:
          totals.roi === null
            ? 'No campaign spend recorded'
            : `${formatPercent(totals.roi)} ROI on ${formatINRCompact(totals.spend)} spend`,
        progress: totals.roi === null ? 0 : 82,
      },
    }

    return DEMO_WORKFLOW.map((stage) => ({
      ...stage,
      ...(stageData[stage.id] ?? {}),
    }))
  }, [
    assignedCustomers,
    currentMonthLeads,
    data.approvals.length,
    data.customers.length,
    data.expenses,
    data.leads.length,
    data.opportunities.length,
    data.plans.length,
    expenseProgress,
    leadStats.conversionRate,
    leadStats.qualified,
    leadStats.total,
    loggedExpenses,
    monthlyLeadTarget,
    pendingApprovalCount,
    totals.active,
    totals.roi,
    totals.spend,
    totals.total,
    totals.budget,
  ])

  const dashboardActivity = useMemo<DashboardActivity[]>(() => {
    const items: DashboardActivity[] = []
    data.leads.forEach((lead) => {
      lead.activities.forEach((activity) => {
        items.push({
          id: activity.id,
          title: `${activity.type} · ${lead.name}`,
          detail: activity.summary,
          at: activity.at,
          kind: 'lead',
        })
      })
    })
    data.approvals.forEach((approval) => {
      items.push({
        id: `approval-${approval.id}`,
        title: approval.title,
        detail: `${approval.type} · ${approval.status} · requested by ${approval.requestedBy}`,
        at: approval.submissionDate,
        kind: 'approval',
      })
    })
    data.expenses.forEach((expense) => {
      items.push({
        id: `expense-${expense.id}`,
        title: expense.purpose,
        detail: `${expense.category} · ${expense.status} · ${formatINR(expense.amount)}`,
        at: expense.date,
        kind: 'expense',
      })
    })
    data.campaigns.forEach((campaign) => {
      items.push({
        id: `campaign-${campaign.id}`,
        title: campaign.name,
        detail: `${campaign.status} campaign · ${campaign.channel} · ${campaign.owner}`,
        at: campaign.createdAt,
        kind: 'campaign',
      })
    })
    return items
      .filter((item) => Number.isFinite(new Date(item.at).getTime()))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6)
  }, [data])

  const togglePriority = (id: string) => {
    setCompletedPriorities((currentSet) => {
      const next = new Set(currentSet)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // API-mode loading / error guard: never silently fall back to demo data.
  if (useApi && apiLoading) {
    return (
      <div className="stack-24">
        <PageHeader
          eyebrow="Marketing workspace · API"
          title="Marketing dashboard"
          subtitle="Loading live marketing data from the API…"
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Fetching dashboard metrics…</p>
          </div>
        </div>
      </div>
    )
  }

  if (useApi && apiError) {
    return (
      <div className="stack-24">
        <PageHeader
          eyebrow="Marketing workspace · API"
          title="Marketing dashboard"
          subtitle="Unable to load dashboard data."
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md rounded-xl border border-rose-200 bg-rose-50 px-6 py-8 dark:border-rose-500/20 dark:bg-rose-500/10 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-rose-500 border-t-transparent mx-auto mb-3 animate-spin" />
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-300">Dashboard data unavailable</h3>
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{apiError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-300"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stack-24">
      <PageHeader
        eyebrow={`Marketing workspace · ${useApi ? 'Live API' : 'Live demo analytics'}`}
        title="Marketing dashboard"
        subtitle={
          useApi
            ? "A consolidated view of campaigns, leads, pipeline, customers, budgets and approvals. Metrics are calculated from live API data."
            : "A consolidated view of campaigns, leads, pipeline, customers, budgets and approvals. Metrics are calculated from the local demo records stored in this browser."
        }
        actions={
          <>
            <Button
              variant="ghost"
              icon={<Wand2 size={15} />}
              onClick={() => navigate('/marketing/assistant/campaign-suggestions')}
            >
              Ask AI assistant
            </Button>
            <Button
              variant="primary"
              icon={<Megaphone size={15} />}
              onClick={() => navigate('/marketing/digital/campaigns?action=new')}
            >
              New campaign
            </Button>
          </>
        }
        meta={
          <>
            <span className="page-meta-item">
              <TrendingUp size={13} /> FY 2026–27 · Q3
            </span>
            <span className="page-meta-item">
              <Radio size={13} /> {totals.active} live campaigns
            </span>
            <span className="page-meta-item">
              <Check size={13} />
              {useApi ? 'Live API data · server-backed' : 'Local demo data · stored in this browser'}
            </span>
          </>
        }
      />

      <RoleDashboardOverview />

      <section aria-label="Key marketing metrics" className="dashboard-kpis">
        <div className="section-heading dashboard-kpis__head">
          <div>
            <h2>Performance snapshot</h2>
            <p>Campaign reach, pipeline, customer conversion and spend health.</p>
          </div>
          <span className="badge badge--neutral badge--no-dot">10 tracked metrics</span>
        </div>
        <div className="grid-kpi">
          <KpiCard
            label="Total campaigns"
            value={useApi && apiSummary ? apiSummary.activeCampaigns : totals.total}
            icon={<Megaphone size={17} />}
            tone="var(--chart-1)"
            trend={{
              value: growth(
                currentCampaignPoint?.campaigns ?? 0,
                previousCampaignPoint?.campaigns ?? 0,
              ),
              label: 'campaigns started vs previous month',
            }}
            hint={useApi && apiSummary ? 'Live API data · active campaigns' : 'Across all channels'}
            spark={campaignSpark}
            index={0}
            onClick={() => navigate('/marketing/digital/campaigns')}
          />
          <KpiCard
            label="Active campaigns"
            value={useApi && apiSummary ? apiSummary.activeCampaigns : totals.active}
            icon={<Radio size={17} />}
            tone="var(--chart-2)"
            hint={useApi && apiSummary ? 'Live API data' : `${formatPercent((safeDivide(totals.active, totals.total) ?? 0) * 100)} of all campaigns`}
            spark={campaignSpark}
            index={1}
            onClick={() => navigate('/marketing/digital/campaigns?status=Active')}
          />
          <KpiCard
            label="Total leads"
            value={useApi && apiSummary ? apiSummary.totalLeads : data.leads.length}
            icon={<Users size={17} />}
            tone="var(--chart-5)"
            trend={{ value: leadsDelta, label: 'new leads vs previous month' }}
            hint={useApi && apiSummary ? 'Live API data · total leads' : 'Live lead records'}
            spark={leadSpark}
            format={formatNumber}
            index={2}
            onClick={() => navigate('/marketing/leads/campaign-leads')}
          />
          <KpiCard
            label="Qualified leads"
            value={useApi && apiSummary ? apiSummary.qualifiedLeads : leadStats.qualified}
            icon={<UserCheck size={17} />}
            tone="var(--chart-7)"
            trend={{ value: qualifiedDelta, label: 'qualified vs previous month' }}
            hint={useApi && apiSummary ? 'Live API data · qualified leads' : `${formatPercent((safeDivide(leadStats.qualified, leadStats.total) ?? 0) * 100, 1)} of lead records`}
            spark={qualifiedSpark}
            format={formatNumber}
            index={3}
            onClick={() => navigate('/marketing/leads/campaign-leads?status=Qualified')}
          />
          <KpiCard
            label="Sales opportunities"
            value={data.opportunities.length}
            icon={<Target size={17} />}
            tone="var(--chart-3)"
            hint={`${openOpportunities} open · ${data.opportunities.length - openOpportunities} closed`}
            spark={conversionSpark}
            format={formatNumber}
            index={4}
            onClick={() => navigate('/marketing/leads/sales-opportunities')}
          />
          <KpiCard
            label="Converted customers"
            value={useApi && apiSummary ? apiSummary.convertedLeads : data.customers.length}
            icon={<BadgeCheck size={17} />}
            tone="var(--chart-4)"
            trend={{ value: conversionDelta, label: 'converted leads vs previous month' }}
            hint={useApi && apiSummary ? 'Live API data · converted leads' : 'Customer records in the workspace'}
            spark={conversionSpark}
            format={formatNumber}
            index={5}
            onClick={() => navigate('/marketing/leads/campaign-to-sales')}
          />
          <KpiCard
            label="Marketing budget"
            value={useApi && apiSummary ? apiSummary.totalBudget : totals.budget}
            icon={<CircleDollarSign size={17} />}
            tone="var(--chart-6)"
            hint={useApi && apiSummary ? 'Live API data · total budget' : 'Across all demo campaigns'}
            spark={spendSpark}
            format={formatINRCompact}
            index={6}
            onClick={() => navigate('/marketing/plans/campaign-budgets')}
          />
          <KpiCard
            label="Actual marketing spend"
            value={useApi && apiSummary ? apiSummary.totalSpend : totals.spend}
            icon={<Wallet size={17} />}
            tone="var(--chart-5)"
            trend={{ value: spendDelta, label: 'campaign spend vs previous month', positiveIsGood: false }}
            hint={useApi && apiSummary ? 'Live API data · total spend' : `${formatPercent((safeDivide(totals.spend, totals.budget) ?? 0) * 100)} of budget utilised`}
            spark={spendSpark}
            format={formatINRCompact}
            index={7}
            onClick={() => navigate('/marketing/expenses/campaign-expenses')}
          />
          <KpiCard
            label="Campaign ROI"
            value={totals.roi === null ? '—' : totals.roi}
            icon={<TrendingUp size={17} />}
            tone="var(--chart-2)"
            trend={{ value: roiDelta, label: 'attributed revenue vs campaign spend' }}
            hint={`${formatINRCompact(totals.revenue)} attributed revenue`}
            spark={roiSpark}
            format={(value) => formatPercent(value)}
            index={8}
            onClick={() => navigate('/marketing/leads/roi-analysis')}
          />
          <KpiCard
            label="Target achievement"
            value={targetAchievement === null ? '—' : targetAchievement}
            icon={<Trophy size={17} />}
            tone="var(--chart-3)"
            trend={{ value: growth(currentMonthLeads, previousLeadPoint?.leads ?? 0), label: 'this month vs previous month' }}
            hint={`${formatNumber(currentMonthLeads)} of ${formatNumber(monthlyLeadTarget)} leads this month`}
            spark={targetSpark}
            format={(value) => formatPercent(value, 1)}
            index={9}
            onClick={() => navigate('/marketing/reports/campaign-performance')}
          />
        </div>
      </section>

      <SectionCard
        title="Marketing workflow"
        subtitle="Follow the nine-stage marketing process. Select a stage to open its workspace; scroll the strip to see every stage."
        actions={<WorkflowLegend />}
        bodyClassName="workflow-body"
        className="workflow-card"
      >
        <WorkflowStrip stages={workflowStages} />
      </SectionCard>

      <div className="dashboard-grid">
        <ChartCard
          title="Campaign performance"
          subtitle="Campaign-reported leads, conversions and attributed revenue grouped by start month."
          height="lg"
          actions={
            <span className="badge badge--neutral badge--no-dot">
              Last 6 months
            </span>
          }
          legend={
            <>
              <LegendItem color="var(--chart-1)" label="Leads" />
              <LegendItem color="var(--chart-2)" label="Conversions" />
              <LegendItem color="var(--chart-5)" label="Revenue" />
            </>
          }
          isEmpty={data.campaigns.length === 0}
        >
          <ComposedChart data={campaignSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis yAxisId="left" {...axisProps} width={38} />
            <YAxis
              yAxisId="right"
              orientation="right"
              {...axisProps}
              width={44}
              tickFormatter={(value: number) => formatINRCompact(value)}
            />
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(value) => {
                    if (value > 100000) return formatINR(value)
                    return formatNumber(value)
                  }}
                />
              }
              cursor={{ stroke: 'var(--border)' }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="leads"
              name="Leads"
              stroke="var(--chart-1)"
              strokeWidth={2.2}
              fill="url(#leadsGradient)"
              isAnimationActive={chartAnim}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="conversions"
              name="Conversions"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: 'var(--chart-2)' }}
              isAnimationActive={chartAnim}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="var(--chart-5)"
              strokeWidth={1.8}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={chartAnim}
            />
          </ComposedChart>
        </ChartCard>

        <section className="card chart-card">
          <div className="chart-card__head">
            <div>
              <h2 className="chart-card__title">Leads by source category</h2>
              <p className="chart-card__subtitle">Seven canonical source categories across demo lead records</p>
            </div>
            <span className="badge badge--neutral badge--no-dot">{data.leads.length} records</span>
          </div>
          <div className="chart-wrap donut-wrap" style={{ height: 225 }}>
            {sourceData.length ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="leads"
                      nameKey="source"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={3}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      isAnimationActive={chartAnim}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={entry.source} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center" aria-hidden="true">
                  <strong>{formatNumber(sourceData.reduce((sum, item) => sum + item.leads, 0))}</strong>
                  <span>leads</span>
                </div>
              </>
            ) : (
              <div className="chart-empty">No lead source data is available.</div>
            )}
          </div>
          <PieLegend
            items={sourceData.map((entry, index) => ({
              name: entry.source,
              value: entry.leads,
              color: chartColors[index % chartColors.length],
              display: `${entry.leads}`,
            }))}
          />
          <div style={{ padding: '0 18px 16px' }}>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowRight size={13} />}
              onClick={() => navigate('/marketing/leads/campaign-leads')}
            >
              View all leads
            </Button>
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--three">
        <ChartCard
          title="Lead conversion funnel"
          subtitle="Campaign-reported demo funnel"
          height="sm"
          isEmpty={funnel.length === 0}
        >
          <Funnel stages={funnel} />
        </ChartCard>

        <ChartCard
          title="Budget vs actual spend"
          subtitle="Campaign budgets and spend grouped by campaign start month."
          height="sm"
          legend={
            <>
              <LegendItem color="var(--chart-1)" label="Budget" />
              <LegendItem color="var(--chart-3)" label="Actual" />
            </>
          }
          isEmpty={data.campaigns.length === 0}
        >
          <BarChart data={campaignSeries} margin={{ top: 8, right: 4, left: -2, bottom: 0 }} barGap={2}>
            <defs>
              <linearGradient id="budgetPlannedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="budgetActualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={42} tickFormatter={(value: number) => formatINRCompact(value)} />
            <Tooltip content={<ChartTooltip valueFormatter={formatINR} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar
              dataKey="budget"
              name="Budget"
              fill="url(#budgetPlannedGradient)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={chartAnim}
            />
            <Bar
              dataKey="actual"
              name="Actual"
              fill="url(#budgetActualGradient)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={chartAnim}
            />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Campaign ROI comparison"
          subtitle="Attributed revenue against campaign spend"
          height="sm"
          isEmpty={roiCampaigns.length === 0}
        >
          <BarChart
            data={roiCampaigns.map((campaign) => ({
              name: campaign.name.length > 18 ? `${campaign.name.slice(0, 18)}…` : campaign.name,
              roi: Number((campaignRoi(campaign) ?? 0).toFixed(1)),
            }))}
            layout="vertical"
            margin={{ top: 4, right: 18, left: 4, bottom: 0 }}
          >
            <CartesianGrid {...gridProps} horizontal={false} vertical />
            <XAxis type="number" {...axisProps} tickFormatter={(value: number) => `${value}%`} />
            <YAxis type="category" dataKey="name" {...axisProps} width={112} tick={{ fill: 'var(--muted)', fontSize: 9.5 }} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value.toFixed(1)}%`} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="roi" name="ROI" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim}>
              {roiCampaigns.map((campaign, index) => (
                <Cell
                  key={campaign.id}
                  fill={index === 0 ? 'var(--chart-2)' : 'var(--chart-1)'}
                  opacity={index === 0 ? 1 : 0.72}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      <div className="dashboard-grid dashboard-grid--three">
        <ChartCard
          title="Monthly marketing performance"
          subtitle="Lead records created, qualified and converted in each month."
          height="md"
          legend={
            <>
              <LegendItem color="var(--chart-1)" label="Leads" />
              <LegendItem color="var(--chart-2)" label="Qualified" />
              <LegendItem color="var(--chart-3)" label="Converted" />
            </>
          }
          isEmpty={data.leads.length === 0}
        >
          <ComposedChart data={leadFlowSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="monthlyLeadsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={32} allowDecimals={false} />
            <Tooltip
              content={<ChartTooltip valueFormatter={(value) => `${formatNumber(value)} leads`} />}
              cursor={{ stroke: 'var(--border)' }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              name="Leads"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#monthlyLeadsGradient)"
              isAnimationActive={chartAnim}
            />
            <Area
              type="monotone"
              dataKey="qualified"
              name="Qualified"
              stroke="var(--chart-2)"
              strokeWidth={1.8}
              fill="transparent"
              isAnimationActive={chartAnim}
            />
            <Line
              type="monotone"
              dataKey="conversions"
              name="Converted"
              stroke="var(--chart-3)"
              strokeWidth={1.8}
              dot={{ r: 2.2, fill: 'var(--chart-3)' }}
              isAnimationActive={chartAnim}
            />
          </ComposedChart>
        </ChartCard>

        <ChartCard
          title="Marketing target progress"
          subtitle={`Lead records against a ${formatNumber(monthlyLeadTarget)} monthly lead target.`}
          height="md"
          legend={
            <>
              <LegendItem color="var(--chart-8)" label="Target" />
              <LegendItem color="var(--chart-2)" label="Achieved" />
            </>
          }
          isEmpty={data.leads.length === 0}
        >
          <BarChart data={leadFlowSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={34} allowDecimals={false} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(value)} leads`} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="target" name="Target" fill="var(--chart-8)" opacity={0.35} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            <Bar dataKey="leads" name="Achieved" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Channel performance"
          subtitle="Attributed revenue and campaign-reported leads by channel."
          height="md"
          legend={
            <>
              <LegendItem color="var(--chart-1)" label="Attributed revenue" />
              <LegendItem color="var(--chart-2)" label="Leads" />
            </>
          }
          isEmpty={channelStats.length === 0}
        >
          <ComposedChart data={channelStats} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="channel" {...axisProps} interval={0} tick={{ fill: 'var(--muted)', fontSize: 9 }} />
            <YAxis yAxisId="left" {...axisProps} width={42} tickFormatter={(value: number) => formatINRCompact(value)} />
            <YAxis yAxisId="right" orientation="right" {...axisProps} width={30} allowDecimals={false} />
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(value) =>
                    value >= 1000 ? formatINR(value) : `${formatNumber(value)} leads`
                  }
                />
              }
              cursor={{ fill: 'var(--surface-2)' }}
            />
            <Bar yAxisId="left" dataKey="revenue" name="Attributed revenue" radius={[4, 4, 0, 0]} fill="var(--chart-1)" isAnimationActive={chartAnim}>
              {channelStats.map((entry, index) => (
                <Cell key={entry.channel} fill={chartColors[index % chartColors.length]} />
              ))}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--chart-2)' }} isAnimationActive={chartAnim} />
          </ComposedChart>
        </ChartCard>
      </div>

      <section aria-label="Today at a glance">
        <div className="section-heading">
          <div>
            <h2>Today at a glance</h2>
            <p>Priorities, follow-ups and approvals that need your attention.</p>
          </div>
          <span className="badge badge--warning">{dueFollowUps.length + pendingApprovals.length} items need attention</span>
        </div>
        <div className="dashboard-grid dashboard-grid--three">
          <SectionCard
            title="Today's priorities"
            subtitle="Tick items off locally — changes are not saved to a server."
            actions={<span className="text-xs faint">{completedPriorities.size}/{priorities.length}</span>}
          >
            <div className="task-list">
              {priorities.map((item) => {
                const done = completedPriorities.has(item.id)
                return (
                  <div key={item.id} className={`task-item ${done ? 'is-done' : ''}`.trim()}>
                    <button
                      type="button"
                      className={`task-check ${done ? 'is-done' : ''}`.trim()}
                      onClick={() => togglePriority(item.id)}
                      aria-label={done ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`}
                      aria-pressed={done}
                    >
                      <Check size={11} />
                    </button>
                    <div className="task-body">
                      <p className="task-title">{item.title}</p>
                      <p className="task-meta">{item.meta}</p>
                    </div>
                    <span
                      className={`task-due ${item.due.includes('Overdue') ? 'task-due--late' : item.due === 'Today' ? 'task-due--today' : ''}`.trim()}
                    >
                      {item.due}
                    </span>
                  </div>
                )
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowRight size={13} />}
              className="mt-8"
              onClick={() => navigate('/marketing/leads/lead-tracking')}
            >
              Open lead tracking
            </Button>
          </SectionCard>

          <SectionCard
            title="Follow-ups due"
            subtitle="Calculated from local browser dates in this demo."
            actions={
              <span className={`badge ${dueFollowUps.length ? 'badge--warning' : 'badge--success'}`}>
                {dueFollowUps.length ? `${dueFollowUps.length} due` : 'All clear'}
              </span>
            }
          >
            {dueFollowUps.length === 0 ? (
              <p className="text-sm muted">No follow-ups are due today in the demo dataset.</p>
            ) : (
              <div className="stack-12">
                {dueFollowUps.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className="activity-followup"
                    onClick={() => navigate(`/marketing/leads/lead-tracking?lead=${lead.id}`)}
                  >
                    <Avatar name={lead.name} size="sm" />
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="row-6">
                        <span
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {lead.name}
                        </span>
                        {lead.priority === 'High' ? <span className="badge badge--danger">High</span> : null}
                      </span>
                      <span className="text-xs muted truncate" style={{ display: 'block' }}>
                        {lead.company} · {lead.nextFollowUp ? followUpLabel(lead.nextFollowUp) : ''}
                      </span>
                    </span>
                    <ChevronRight size={14} className="faint" />
                  </button>
                ))}
              </div>
            )}
            <div className="callout callout--info mt-12">
              <CircleAlert size={14} />
              <span>No SMS, WhatsApp, email or calls are triggered by this portal.</span>
            </div>
          </SectionCard>

          <SectionCard
            title="Pending approvals"
            subtitle="Requested by your team and awaiting review."
            actions={
              <Button variant="ghost" size="xs" onClick={() => navigate('/marketing/approvals/pending-approvals')}>
                View all
              </Button>
            }
          >
            <div className="stack-10">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm muted">No approvals are pending.</p>
              ) : (
                pendingApprovals.map((approval) => (
                  <button
                    key={approval.id}
                    type="button"
                    className="approval-mini"
                    onClick={() => navigate('/marketing/approvals/pending-approvals')}
                  >
                    <span className="approval-mini__icon">
                      <CircleDollarSign size={15} />
                    </span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="approval-mini__title truncate">{approval.title}</span>
                      <span className="approval-mini__meta">
                        {approval.type} · {approval.requestedBy}
                        {approval.amount ? ` · ${formatINR(approval.amount)}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={approval.status} />
                  </button>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </section>

      <div className="dashboard-grid dashboard-grid--three">
        <SectionCard
          title="Upcoming activities"
          subtitle="Live and planned campaign windows that need attention next."
          actions={
            <Button variant="ghost" size="xs" onClick={() => navigate('/marketing/digital/campaigns')}>
              All campaigns
            </Button>
          }
        >
          <div className="stack-12">
            {upcomingCampaigns.length === 0 ? (
              <p className="empty-inline">No live or planned campaigns are available.</p>
            ) : null}
            {upcomingCampaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                className="campaign-mini"
                onClick={() => navigate('/marketing/digital/campaigns')}
              >
                <span className="campaign-mini__date">
                  <span className="campaign-mini__day">{formatDateShort(campaign.endDate).split(' ')[0]}</span>
                  <span>{formatDateShort(campaign.endDate).split(' ')[1]}</span>
                </span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="campaign-mini__name truncate">{campaign.name}</span>
                  <span className="campaign-mini__meta">
                    {campaign.channel} · {formatINRCompact(campaign.budget)} budget · ends {formatDateShort(campaign.endDate)}
                  </span>
                </span>
                <StatusBadge status={campaign.status} />
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Budget utilisation"
          subtitle="Spend against approved campaign budgets. Amber starts at 85%."
          actions={
            <Button variant="ghost" size="xs" onClick={() => navigate('/marketing/plans/budget-tracking')}>
              View budget
            </Button>
          }
        >
          <div className="stack-12">
            {budgetRows.length === 0 ? (
              <p className="empty-inline">No campaign spend has been recorded yet.</p>
            ) : null}
            {budgetRows.map((campaign) => {
              const utilisation = campaign.budget > 0 ? (campaign.spend / campaign.budget) * 100 : 0
              return (
                <div key={campaign.id} className="budget-row" style={{ paddingTop: 0 }}>
                  <div className="budget-row__top">
                    <span className="budget-row__name truncate">{campaign.name}</span>
                    <span className="budget-row__amount">{formatPercent(utilisation)}</span>
                  </div>
                  <ProgressBar value={utilisation} tone={utilisationTone(utilisation)} size="sm" />
                  <div className="budget-row__meta">
                    <span>{formatINRCompact(campaign.spend)} spent</span>
                    <span>of {formatINRCompact(campaign.budget)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Target progress"
          subtitle="Current-month lead records against the employee lead target."
          actions={
            <Button variant="ghost" size="xs" onClick={() => navigate('/marketing/reports/campaign-performance')}>
              View report
            </Button>
          }
        >
          <div className="target-progress">
            <div className="between" style={{ alignItems: 'flex-end' }}>
              <div>
                <p className="target-progress__value">
                  {targetAchievement === null ? '—' : formatPercent(targetAchievement)}
                </p>
                <p className="text-xs muted">
                  {formatNumber(currentMonthLeads)} of {formatNumber(monthlyLeadTarget)} leads this month
                </p>
              </div>
              <Badge tone={targetAchievement !== null && targetAchievement >= 100 ? 'success' : 'warning'}>
                {targetAchievement !== null && targetAchievement >= 100 ? 'On target' : 'In progress'}
              </Badge>
            </div>
            <ProgressBar
              value={targetAchievement ?? 0}
              tone={
                targetAchievement === null
                  ? 'brand'
                  : targetAchievement >= 100
                    ? 'success'
                    : targetAchievement >= 50
                      ? 'warning'
                      : 'danger'
              }
              size="md"
              label="Monthly lead target"
              showValue
            />
            <div className="target-progress__stats">
              <span>
                <strong>{formatNumber(leadStats.qualified)}</strong>
                <span>Qualified leads</span>
              </span>
              <span>
                <strong>{formatNumber(data.customers.length)}</strong>
                <span>Customers</span>
              </span>
              <span>
                <strong>{formatNumber(assignedCustomers)}</strong>
                <span>Reps assigned</span>
              </span>
            </div>
            <div className="callout callout--info mt-12">
              <CircleAlert size={14} />
              <span>The target is the monthly lead goal from the demo employee profile.</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <section className="card card--dark" style={{ padding: 20 }}>
        <div className="between wrap" style={{ marginBottom: 14, gap: 10 }}>
          <div>
            <p className="eyebrow" style={{ color: '#8ea2c4' }}>AI marketing recommendations</p>
            <h2 style={{ fontSize: '1.02rem', marginTop: 2 }}>Demo guidance based on local sample data</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            style={{ color: '#c7d2fe' }}
            icon={<Wand2 size={14} />}
            onClick={() => navigate('/marketing/assistant/campaign-suggestions')}
          >
            Open assistant
          </Button>
        </div>
        <div className="grid-3">
          {aiRecommendations.map((recommendation) => (
            <button
              key={recommendation.id}
              type="button"
              className="ai-reco"
              onClick={() => navigate(recommendation.href)}
              style={{ '--reco-tone': recommendation.tone } as CSSProperties}
            >
              <span className="row-6">
                <span className="ai-reco__icon"><Sparkles size={14} /></span>
                <span className="ai-reco__impact">{recommendation.impact}</span>
              </span>
              <span className="ai-reco__title">{recommendation.title}</span>
              <span className="ai-reco__body">{recommendation.body}</span>
              <span className="ai-reco__action">
                {recommendation.action} <ArrowRight size={12} />
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: '#7f8ea6', marginTop: 12 }}>
          Template-generated suggestions. No LLM API is called and no real AI analysis is performed.
        </p>
      </section>

      <SectionCard
        title="Recent marketing activity"
        subtitle="Latest locally recorded demo events across the workspace."
        actions={
          <span className="badge badge--neutral badge--no-dot">
            <CalendarClock size={12} /> Local demo feed
          </span>
        }
      >
        <div className="timeline">
          {dashboardActivity.length === 0 ? (
            <p className="empty-inline">No activity has been recorded in this workspace yet.</p>
          ) : null}
          {dashboardActivity.map((activity) => {
            const Icon = activityIconMap[activity.kind]
            return (
              <div className="timeline-item" key={activity.id}>
                <span className={`timeline-icon timeline-icon--${activity.kind}`}>
                  <Icon size={14} />
                </span>
                <div className="timeline-body">
                  <p className="timeline-title">{activity.title}</p>
                  <p className="timeline-detail">{activity.detail}</p>
                </div>
                <span className="timeline-time">{followUpRelative(activity.at)}</span>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}

function followUpRelative(value: string): string {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
