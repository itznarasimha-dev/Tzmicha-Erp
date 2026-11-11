import { useMemo, useState } from 'react'
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDemoData } from '../context/DemoDataContext'
import { useDemoRole } from '../context/DemoRoleContext'
import { useToast } from '../context/ToastContext'
import { useWorkflow } from '../hooks/useWorkflow'
import { DEMO_MARKETING_EMPLOYEES, workflowMonthShort } from '../data/marketing/roleWorkflow'
import { assignedJuniorsForSenior, leadBelongsToRole } from '../utils/workflow'
import type { Campaign, Lead, LeadSource } from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { SectionCard } from '../components/ui/SectionCard'
import { ProgressBar } from '../components/ui/ProgressBar'
import {
  ChartCard,
  ChartTooltip,
  Funnel,
  LegendItem,
  PieLegend,
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
  MetricCard,
  MetricGrid,
  TabIntro,
} from '../components/marketing/ModuleKit'
import { campaignCpa, campaignCpl, campaignCtr, campaignRoi } from '../utils/analytics'
import { downloadCsv } from '../utils/csv'
import { formatDate, formatINR, formatINRCompact, formatNumber, formatPercent, formatRatio } from '../utils/format'
import { performanceSeries } from '../data/marketing/dashboard'

type ReportChannel = {
  channel: string
  campaigns: number
  budget: number
  spend: number
  leads: number
  qualified: number
  conversions: number
  revenue: number
  roi: number | null
  cpl: number | null
  conversionRate: number | null
}

type ProductRow = {
  product: string
  campaigns: number
  budget: number
  spend: number
  leads: number
  conversions: number
  revenue: number
  roi: number | null
}

type RetailerRow = {
  store: string
  location: string
  activities: number
  completed: number
  planned: number
  agreementType: string
  agreementStatus: string
  agreementValue: number
  campaigns: number
}

export function ReportsAnalyticsPage({ tab }: { tab: string }) {
  const { data } = useDemoData()
  const { roleId, profile } = useDemoRole()
  const { visiblePlans, visibleExpenses, metrics } = useWorkflow()
  const { pushToast } = useToast()
  const chartAnim = useChartAnimation()
  const [statusFilter, setStatusFilter] = useState('All')
  const [channelFilter, setChannelFilter] = useState('All')

  const totals = useMemo(() => {
    const spend = data.campaigns.reduce((sum, campaign) => sum + campaign.spend, 0)
    const budget = data.campaigns.reduce((sum, campaign) => sum + campaign.budget, 0)
    const revenue = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.revenue, 0)
    const leads = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.leads, 0)
    const qualified = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.qualifiedLeads, 0)
    const conversions = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.conversions, 0)
    return {
      spend,
      budget,
      revenue,
      leads,
      qualified,
      conversions,
      roi: spend > 0 ? ((revenue - spend) / spend) * 100 : null,
      cpl: leads > 0 ? spend / leads : null,
      cpa: conversions > 0 ? spend / conversions : null,
      conversionRate: leads > 0 ? (conversions / leads) * 100 : null,
      budgetUtilisation: budget > 0 ? (spend / budget) * 100 : null,
    }
  }, [data.campaigns])

  const channelRows = useMemo<ReportChannel[]>(() => {
    const map = new Map<string, ReportChannel>()
    data.campaigns.forEach((campaign) => {
      const bucket = map.get(campaign.channel) ?? {
        channel: campaign.channel,
        campaigns: 0,
        budget: 0,
        spend: 0,
        leads: 0,
        qualified: 0,
        conversions: 0,
        revenue: 0,
        roi: null,
        cpl: null,
        conversionRate: null,
      }
      bucket.campaigns += 1
      bucket.budget += campaign.budget
      bucket.spend += campaign.spend
      bucket.leads += campaign.kpis.leads
      bucket.qualified += campaign.kpis.qualifiedLeads
      bucket.conversions += campaign.kpis.conversions
      bucket.revenue += campaign.kpis.revenue
      map.set(campaign.channel, bucket)
    })
    return [...map.values()]
      .map((row) => ({
        ...row,
        roi: row.spend > 0 ? ((row.revenue - row.spend) / row.spend) * 100 : null,
        cpl: row.leads > 0 ? row.spend / row.leads : null,
        conversionRate: row.leads > 0 ? (row.conversions / row.leads) * 100 : null,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [data.campaigns])

  const productRows = useMemo<ProductRow[]>(() => {
    const map = new Map<string, ProductRow>()
    data.campaigns.forEach((campaign) => {
      const bucket = map.get(campaign.product) ?? {
        product: campaign.product,
        campaigns: 0,
        budget: 0,
        spend: 0,
        leads: 0,
        conversions: 0,
        revenue: 0,
        roi: null,
      }
      bucket.campaigns += 1
      bucket.budget += campaign.budget
      bucket.spend += campaign.spend
      bucket.leads += campaign.kpis.leads
      bucket.conversions += campaign.kpis.conversions
      bucket.revenue += campaign.kpis.revenue
      map.set(campaign.product, bucket)
    })
    return [...map.values()]
      .map((row) => ({
        ...row,
        roi: row.spend > 0 ? ((row.revenue - row.spend) / row.spend) * 100 : null,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [data.campaigns])

  const retailerRows = useMemo<RetailerRow[]>(() => {
    const map = new Map<string, RetailerRow>()
    data.storeActivities.forEach((activity) => {
      const bucket = map.get(activity.store) ?? {
        store: activity.store,
        location: activity.location,
        activities: 0,
        completed: 0,
        planned: 0,
        agreementType: 'No agreement',
        agreementStatus: '—',
        agreementValue: 0,
        campaigns: 0,
      }
      bucket.activities += 1
      if (activity.status === 'Completed') bucket.completed += 1
      if (activity.status === 'Planned' || activity.status === 'In Progress') bucket.planned += 1
      if (activity.campaignId) bucket.campaigns += 1
      const agreement = data.storeAgreements.find((item) => item.store === activity.store)
      if (agreement) {
        bucket.agreementType = agreement.type
        bucket.agreementStatus = agreement.status
        bucket.agreementValue = agreement.value
      }
      map.set(activity.store, bucket)
    })
    return [...map.values()].sort((a, b) => b.activities - a.activities)
  }, [data.storeActivities, data.storeAgreements])

  const leadSourceRows = useMemo(() => {
    const map = new Map<LeadSource, { source: LeadSource; leads: number; converted: number }>()
    data.leads.forEach((lead) => {
      const bucket = map.get(lead.source) ?? { source: lead.source, leads: 0, converted: 0 }
      bucket.leads += 1
      if (lead.status === 'Converted') bucket.converted += 1
      map.set(lead.source, bucket)
    })
    return [...map.values()].sort((a, b) => b.leads - a.leads)
  }, [data.leads])

  /* ---- Role-scoped monthly performance reporting ---- */
  const scopedLeads = useMemo(
    () => data.leads.filter((lead) => leadBelongsToRole(lead, roleId, profile)),
    [data.leads, roleId, profile],
  )
  const roleEmployees = useMemo(() => {
    if (roleId === 'manager') {
      return DEMO_MARKETING_EMPLOYEES.filter((employee) => employee.roleId !== 'admin')
    }
    if (roleId === 'senior') {
      return [
        ...DEMO_MARKETING_EMPLOYEES.filter(
          (employee) => employee.employeeId === profile.employeeId,
        ),
        ...assignedJuniorsForSenior(profile.employeeId),
      ]
    }
    return DEMO_MARKETING_EMPLOYEES.filter(
      (employee) => employee.employeeId === profile.employeeId,
    )
  }, [roleId, profile.employeeId])

  const rolePerformanceRows = useMemo(
    () =>
      roleEmployees.map((employee) => {
        const employeePlans = visiblePlans.filter(
          (plan) => plan.employeeId === employee.employeeId,
        )
        const employeeExpenses = visibleExpenses.filter(
          (expense) => expense.employeeId === employee.employeeId,
        )
        const budget = employeePlans.reduce((sum, plan) => sum + plan.estimatedBudget, 0)
        const actualSpend = employeePlans.reduce(
          (sum, plan) => sum + plan.execution.actualSpending,
          0,
        )
        const target = employeePlans.reduce(
          (sum, plan) => sum + (plan.expectedLeads || plan.monthlyTarget),
          0,
        )
        const actualLeads = employeePlans.reduce(
          (sum, plan) => sum + plan.execution.actualLeads,
          0,
        )
        const qualified = employeePlans.reduce(
          (sum, plan) => sum + plan.execution.qualifiedLeads,
          0,
        )
        const pendingPlans = employeePlans.filter((plan) =>
          [
            'Pending Senior Review',
            'Pending Manager Approval',
            'Pending Admin Financial Authorization',
            'Submitted for Results Review',
          ].includes(plan.status),
        ).length
        return {
          employeeId: employee.employeeId,
          name: employee.name,
          roleLabel: employee.roleLabel,
          plans: employeePlans.length,
          completed: employeePlans.filter((plan) => plan.status === 'Completed').length,
          pendingPlans,
          budget,
          actualSpend,
          target,
          actualLeads,
          qualified,
          achievement: target > 0 ? (actualLeads / target) * 100 : null,
          expenses: employeeExpenses.length,
          expenseAmount: employeeExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        }
      }),
    [roleEmployees, visiblePlans, visibleExpenses],
  )

  const roleMonthlyRows = useMemo(() => {
    const months = [...new Set(visiblePlans.map((plan) => plan.month))].sort()
    return months.map((month) => {
      const scoped = visiblePlans.filter((plan) => plan.month === month)
      return {
        month,
        budget: scoped.reduce((sum, plan) => sum + plan.estimatedBudget, 0),
        actual: scoped.reduce((sum, plan) => sum + plan.execution.actualSpending, 0),
        target: scoped.reduce((sum, plan) => sum + (plan.expectedLeads || plan.monthlyTarget), 0),
        leads: scoped.reduce((sum, plan) => sum + plan.execution.actualLeads, 0),
      }
    })
  }, [visiblePlans])

  const roleLeadStats = useMemo(() => {
    const total = scopedLeads.length
    const qualified = scopedLeads.filter((lead) =>
      ['Qualified', 'Sent to Sales', 'Converted'].includes(lead.status),
    ).length
    const converted = scopedLeads.filter((lead) => lead.converted).length
    const rejected = scopedLeads.filter((lead) =>
      ['Rejected', 'Not Interested'].includes(lead.status),
    ).length
    return {
      total,
      qualified,
      converted,
      rejected,
      conversionRate: total > 0 ? (converted / total) * 100 : null,
      qualifiedRate: total > 0 ? (qualified / total) * 100 : null,
    }
  }, [scopedLeads])

  const roleSourceRows = useMemo(() => {
    const map = new Map<string, { source: string; leads: number; converted: number }>()
    scopedLeads.forEach((lead) => {
      const bucket = map.get(lead.source) ?? { source: lead.source, leads: 0, converted: 0 }
      bucket.leads += 1
      if (lead.converted) bucket.converted += 1
      map.set(lead.source, bucket)
    })
    return [...map.values()].sort((a, b) => b.leads - a.leads)
  }, [scopedLeads])

  const roleStatusRows = useMemo(() => {
    const map = new Map<string, number>()
    visiblePlans.forEach((plan) => {
      map.set(plan.status, (map.get(plan.status) ?? 0) + 1)
    })
    return [...map.entries()]
      .map(([status, value], index) => ({
        name: status,
        value,
        color: chartColors[index % chartColors.length],
      }))
      .filter((entry) => entry.value > 0)
  }, [visiblePlans])

  const exportRolePerformance = () => {
    const result = downloadCsv(`role-performance-${roleId}-demo`, [
      { header: 'Employee ID', value: (row: typeof rolePerformanceRows[number]) => row.employeeId },
      { header: 'Employee', value: (row: typeof rolePerformanceRows[number]) => row.name },
      { header: 'Role', value: (row: typeof rolePerformanceRows[number]) => row.roleLabel },
      { header: 'Monthly plans', value: (row: typeof rolePerformanceRows[number]) => row.plans },
      { header: 'Completed plans', value: (row: typeof rolePerformanceRows[number]) => row.completed },
      { header: 'Pending plans', value: (row: typeof rolePerformanceRows[number]) => row.pendingPlans },
      { header: 'Planned budget', value: (row: typeof rolePerformanceRows[number]) => row.budget },
      { header: 'Actual spend', value: (row: typeof rolePerformanceRows[number]) => row.actualSpend },
      { header: 'Lead target', value: (row: typeof rolePerformanceRows[number]) => row.target },
      { header: 'Actual leads', value: (row: typeof rolePerformanceRows[number]) => row.actualLeads },
      { header: 'Qualified leads', value: (row: typeof rolePerformanceRows[number]) => row.qualified },
      { header: 'Lead achievement %', value: (row: typeof rolePerformanceRows[number]) => row.achievement?.toFixed(1) ?? '' },
      { header: 'Expenses', value: (row: typeof rolePerformanceRows[number]) => row.expenses },
      { header: 'Expense amount', value: (row: typeof rolePerformanceRows[number]) => row.expenseAmount },
    ], rolePerformanceRows)
    pushToast({
      title: result.ok ? 'Role performance exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  const filteredCampaigns = data.campaigns.filter((campaign) => {
    if (statusFilter !== 'All' && campaign.status !== statusFilter) return false
    if (channelFilter !== 'All' && campaign.channel !== channelFilter) return false
    return true
  })

  const funnelStages = [
    { label: 'Campaign leads', value: totals.leads, display: formatNumber(totals.leads), color: 'var(--chart-1)' },
    { label: 'Qualified', value: totals.qualified, display: formatNumber(totals.qualified), color: 'var(--chart-2)' },
    { label: 'Conversions', value: totals.conversions, display: formatNumber(totals.conversions), color: 'var(--chart-3)' },
  ]

  const exportCampaigns = (rows: Campaign[], label = 'campaign-performance') => {
    const result = downloadCsv(`marketing-${label}-demo`, [
      { header: 'ID', value: (campaign: Campaign) => campaign.id },
      { header: 'Campaign', value: (campaign: Campaign) => campaign.name },
      { header: 'Channel', value: (campaign: Campaign) => campaign.channel },
      { header: 'Status', value: (campaign: Campaign) => campaign.status },
      { header: 'Owner', value: (campaign: Campaign) => campaign.owner },
      { header: 'Start', value: (campaign: Campaign) => campaign.startDate },
      { header: 'End', value: (campaign: Campaign) => campaign.endDate },
      { header: 'Budget', value: (campaign: Campaign) => campaign.budget },
      { header: 'Spend', value: (campaign: Campaign) => campaign.spend },
      { header: 'Impressions', value: (campaign: Campaign) => campaign.kpis.impressions },
      { header: 'Clicks', value: (campaign: Campaign) => campaign.kpis.clicks },
      { header: 'Leads', value: (campaign: Campaign) => campaign.kpis.leads },
      { header: 'Qualified leads', value: (campaign: Campaign) => campaign.kpis.qualifiedLeads },
      { header: 'Conversions', value: (campaign: Campaign) => campaign.kpis.conversions },
      { header: 'Revenue', value: (campaign: Campaign) => campaign.kpis.revenue },
      { header: 'ROI %', value: (campaign: Campaign) => campaignRoi(campaign)?.toFixed(1) ?? '' },
      { header: 'CPL', value: (campaign: Campaign) => campaignCpl(campaign)?.toFixed(2) ?? '' },
    ], rows)
    pushToast({ title: result.ok ? 'Campaign report exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportChannels = () => {
    const result = downloadCsv('channel-performance-demo', [
      { header: 'Channel', value: (row: ReportChannel) => row.channel },
      { header: 'Campaigns', value: (row: ReportChannel) => row.campaigns },
      { header: 'Budget', value: (row: ReportChannel) => row.budget },
      { header: 'Spend', value: (row: ReportChannel) => row.spend },
      { header: 'Leads', value: (row: ReportChannel) => row.leads },
      { header: 'Qualified', value: (row: ReportChannel) => row.qualified },
      { header: 'Conversions', value: (row: ReportChannel) => row.conversions },
      { header: 'Revenue', value: (row: ReportChannel) => row.revenue },
      { header: 'ROI %', value: (row: ReportChannel) => row.roi?.toFixed(1) ?? '' },
      { header: 'CPL', value: (row: ReportChannel) => row.cpl?.toFixed(2) ?? '' },
      { header: 'Conversion rate %', value: (row: ReportChannel) => row.conversionRate?.toFixed(1) ?? '' },
    ], channelRows)
    pushToast({ title: result.ok ? 'Channel report exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportProducts = () => {
    const result = downloadCsv('product-brand-analysis-demo', [
      { header: 'Product', value: (row: ProductRow) => row.product },
      { header: 'Campaigns', value: (row: ProductRow) => row.campaigns },
      { header: 'Budget', value: (row: ProductRow) => row.budget },
      { header: 'Spend', value: (row: ProductRow) => row.spend },
      { header: 'Leads', value: (row: ProductRow) => row.leads },
      { header: 'Conversions', value: (row: ProductRow) => row.conversions },
      { header: 'Revenue', value: (row: ProductRow) => row.revenue },
      { header: 'ROI %', value: (row: ProductRow) => row.roi?.toFixed(1) ?? '' },
    ], productRows)
    pushToast({ title: result.ok ? 'Product report exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportRetailers = () => {
    const result = downloadCsv('retailer-performance-demo', [
      { header: 'Store', value: (row: RetailerRow) => row.store },
      { header: 'Location', value: (row: RetailerRow) => row.location },
      { header: 'Activities', value: (row: RetailerRow) => row.activities },
      { header: 'Completed', value: (row: RetailerRow) => row.completed },
      { header: 'Open / planned', value: (row: RetailerRow) => row.planned },
      { header: 'Agreement', value: (row: RetailerRow) => row.agreementType },
      { header: 'Agreement status', value: (row: RetailerRow) => row.agreementStatus },
      { header: 'Agreement value', value: (row: RetailerRow) => row.agreementValue },
      { header: 'Campaign-linked activities', value: (row: RetailerRow) => row.campaigns },
    ], retailerRows)
    pushToast({ title: result.ok ? 'Retailer report exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportLeads = () => {
    const result = downloadCsv('lead-attribution-summary-demo', [
      { header: 'Lead source', value: (row: typeof leadSourceRows[number]) => row.source },
      { header: 'Leads', value: (row: typeof leadSourceRows[number]) => row.leads },
      { header: 'Converted', value: (row: typeof leadSourceRows[number]) => row.converted },
      { header: 'Conversion rate %', value: (row: typeof leadSourceRows[number]) => row.leads ? ((row.converted / row.leads) * 100).toFixed(1) : '' },
    ], leadSourceRows)
    pushToast({ title: result.ok ? 'Lead summary exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportExpenses = () => {
    const result = downloadCsv('expense-summary-demo', [
      { header: 'Ref', value: (row: typeof data.expenses[number]) => row.ref },
      { header: 'Category', value: (row: typeof data.expenses[number]) => row.category },
      { header: 'Campaign', value: (row: typeof data.expenses[number]) => data.campaigns.find((campaign) => campaign.id === row.campaignId)?.name ?? 'Unattributed' },
      { header: 'Amount', value: (row: typeof data.expenses[number]) => row.amount },
      { header: 'Date', value: (row: typeof data.expenses[number]) => row.date },
      { header: 'Status', value: (row: typeof data.expenses[number]) => row.status },
      { header: 'Submitted by', value: (row: typeof data.expenses[number]) => row.submittedBy },
    ], data.expenses)
    pushToast({ title: result.ok ? 'Expense summary exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportVendors = () => {
    const result = downloadCsv('vendor-performance-demo', [
      { header: 'Partner', value: (row: typeof data.agencies[number]) => row.name },
      { header: 'Type', value: (row: typeof data.agencies[number]) => row.category },
      { header: 'Contract', value: (row: typeof data.agencies[number]) => row.contractStatus },
      { header: 'Performance', value: (row: typeof data.agencies[number]) => row.performanceScore },
      { header: 'Completion', value: (row: typeof data.agencies[number]) => row.completion },
      { header: 'Budget adherence', value: (row: typeof data.agencies[number]) => row.budgetAdherence },
      { header: 'Quality', value: (row: typeof data.agencies[number]) => row.quality },
      { header: 'Timeliness', value: (row: typeof data.agencies[number]) => row.timeliness },
    ], data.agencies)
    pushToast({ title: result.ok ? 'Vendor report exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  if (tab === 'role-performance') {
    const scopeLabel =
      roleId === 'manager'
        ? 'Department'
        : roleId === 'senior'
          ? 'My team'
          : 'My'
    const leadAchievement =
      metrics.targetLeads > 0 ? (metrics.actualLeads / metrics.targetLeads) * 100 : null
    return (
      <div className="stack-16">
        <TabIntro
          title={`${scopeLabel} performance`}
          description={`Monthly plan, budget, lead and expense reporting for the ${profile.roleLabel} preview role. Every figure is calculated from the same local demo records used across the dashboards and workflow pages.`}
          actions={
            <Button variant="ghost" icon={<Download size={14} />} onClick={exportRolePerformance}>
              Export CSV
            </Button>
          }
        />
        <MetricGrid>
          <MetricCard
            label={roleId === 'manager' ? 'Department plans' : 'Monthly plans'}
            value={metrics.totalPlans}
            sub={`${metrics.inProgress} in progress · ${metrics.completed} completed`}
            icon={<BarChart3 size={15} />}
            tone="var(--chart-1)"
          />
          <MetricCard
            label="Approved budget"
            value={formatINRCompact(metrics.approvedBudget)}
            sub={`${formatINRCompact(metrics.actualSpending)} actual spend`}
            icon={<Wallet size={15} />}
            tone="var(--chart-2)"
          />
          <MetricCard
            label="Lead achievement"
            value={formatPercent(leadAchievement, 0)}
            sub={`${formatNumber(metrics.actualLeads)} of ${formatNumber(metrics.targetLeads)} target leads`}
            icon={<Target size={15} />}
            tone="var(--chart-3)"
          />
          <MetricCard
            label="Qualified leads"
            value={formatNumber(roleLeadStats.qualified)}
            sub={`${formatPercent(roleLeadStats.qualifiedRate, 1)} of ${formatNumber(roleLeadStats.total)} visible leads`}
            icon={<TrendingUp size={15} />}
            tone="var(--chart-5)"
          />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard
            title="Budget vs actual by month"
            subtitle="Estimated monthly plan budget and recorded execution spend"
            height="md"
            isEmpty={roleMonthlyRows.length === 0}
            legend={
              <>
                <LegendItem color="var(--chart-1)" label="Budget" />
                <LegendItem color="var(--chart-3)" label="Actual" />
              </>
            }
          >
            <BarChart
              data={roleMonthlyRows.map((row) => ({
                month: workflowMonthShort(row.month),
                budget: row.budget,
                actual: row.actual,
              }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} width={46} tickFormatter={(value) => formatINRCompact(Number(value))} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="budget" name="Budget" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="actual" name="Actual" fill="var(--chart-3)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>

          <ChartCard
            title="Plan status mix"
            subtitle="Role-scoped monthly plans by workflow status"
            height="md"
            isEmpty={roleStatusRows.length === 0}
            legend={<PieLegend items={roleStatusRows.map((entry) => ({ ...entry, display: String(entry.value) }))} />}
          >
            <PieChart>
              <Pie
                data={roleStatusRows}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={3}
                stroke="var(--surface)"
                strokeWidth={2}
                isAnimationActive={chartAnim}
              >
                {roleStatusRows.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} plans`} />} />
            </PieChart>
          </ChartCard>
        </div>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard
            title="Lead target vs actual by employee"
            subtitle="Monthly plan targets against recorded execution leads"
            height="md"
            isEmpty={rolePerformanceRows.every((row) => row.plans === 0)}
            legend={
              <>
                <LegendItem color="var(--chart-8)" label="Target" />
                <LegendItem color="var(--chart-2)" label="Actual" />
              </>
            }
          >
            <BarChart
              data={rolePerformanceRows
                .filter((row) => row.plans > 0)
                .map((row) => ({
                  name: row.name.split(' ')[0],
                  target: row.target,
                  actual: row.actualLeads,
                }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <YAxis {...axisProps} width={34} allowDecimals={false} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(value)} leads`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="target" name="Target" fill="var(--chart-8)" opacity={0.45} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="actual" name="Actual" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>

          <ChartCard
            title="Lead sources in scope"
            subtitle="Visible demo leads by acquisition source"
            height="md"
            isEmpty={roleSourceRows.length === 0}
          >
            <BarChart
              data={roleSourceRows.map((row) => ({ name: row.source, leads: row.leads }))}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
            >
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={104} {...axisProps} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="leads" name="Leads" fill="var(--chart-1)" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
        </div>

        <SectionCard
          title={roleId === 'manager' ? 'Department scorecard' : 'Team scorecard'}
          subtitle="Plans, pending work, budget, lead delivery and linked expenses by employee."
          actions={<Badge tone="accent" className="badge--no-dot">{rolePerformanceRows.length} {rolePerformanceRows.length === 1 ? 'employee' : 'employees'}</Badge>}
        >
          <DataTable
            data={rolePerformanceRows}
            rowKey={(row) => row.employeeId}
            searchable={(row) => `${row.name} ${row.roleLabel} ${row.employeeId}`}
            searchPlaceholder="Search employees…"
            pageSize={10}
            initialSort={{ columnId: 'actualLeads', direction: 'desc' }}
            caption="Role performance scorecard"
            columns={[
              {
                id: 'name',
                header: 'Employee',
                mobileLabel: 'Employee',
                sortValue: (row) => row.name,
                render: (row) => (
                  <div>
                    <p className="cell-primary">{row.name}</p>
                    <p className="text-xs muted">{row.roleLabel}</p>
                  </div>
                ),
              },
              {
                id: 'plans',
                header: 'Plans',
                align: 'right',
                mobileLabel: 'Plans',
                sortValue: (row) => row.plans,
                render: (row) => formatNumber(row.plans),
              },
              {
                id: 'pendingPlans',
                header: 'Pending',
                align: 'right',
                mobileLabel: 'Pending',
                sortValue: (row) => row.pendingPlans,
                render: (row) => row.pendingPlans > 0 ? <Badge tone="warning" className="badge--no-dot">{row.pendingPlans}</Badge> : <span className="muted text-xs">Clear</span>,
              },
              {
                id: 'budget',
                header: 'Budget',
                align: 'right',
                mobileLabel: 'Budget',
                hideMobile: true,
                sortValue: (row) => row.budget,
                render: (row) => formatINRCompact(row.budget),
              },
              {
                id: 'actualSpend',
                header: 'Actual spend',
                align: 'right',
                mobileLabel: 'Actual spend',
                hideMobile: true,
                sortValue: (row) => row.actualSpend,
                render: (row) => formatINRCompact(row.actualSpend),
              },
              {
                id: 'target',
                header: 'Lead target',
                align: 'right',
                mobileLabel: 'Lead target',
                hideMobile: true,
                sortValue: (row) => row.target,
                render: (row) => formatNumber(row.target),
              },
              {
                id: 'actualLeads',
                header: 'Actual leads',
                align: 'right',
                mobileLabel: 'Actual leads',
                sortValue: (row) => row.actualLeads,
                render: (row) => <span className="cell-strong">{formatNumber(row.actualLeads)}</span>,
              },
              {
                id: 'achievement',
                header: 'Achievement',
                align: 'right',
                mobileLabel: 'Achievement',
                sortValue: (row) => row.achievement ?? -1,
                render: (row) => row.achievement === null ? <span className="muted text-xs">—</span> : <Badge tone={row.achievement >= 100 ? 'success' : row.achievement >= 70 ? 'warning' : 'danger'}>{formatPercent(row.achievement, 0)}</Badge>,
              },
              {
                id: 'qualified',
                header: 'Qualified',
                align: 'right',
                mobileLabel: 'Qualified',
                hideMobile: true,
                sortValue: (row) => row.qualified,
                render: (row) => formatNumber(row.qualified),
              },
              {
                id: 'expenses',
                header: 'Expenses',
                align: 'right',
                mobileLabel: 'Expenses',
                hideMobile: true,
                sortValue: (row) => row.expenseAmount,
                render: (row) => `${row.expenses} · ${formatINRCompact(row.expenseAmount)}`,
              },
            ]}
          />
        </SectionCard>

        <DemoNote>
          {scopeLabel} reports use the same browser-stored monthly plans, execution updates, expenses and lead records as the rest of the portal. Admin financial authorization remains a status here; no Admin or Finance decision is made in the Marketing Portal.
        </DemoNote>
      </div>
    )
  }

  if (tab === 'overview') {
    return (
      <div className="stack-20">
        <TabIntro
          title="Marketing analytics overview"
          description="A board-ready view of sample campaign spend, pipeline, revenue and channel mix. Figures are demo workbook aggregates, not audited results."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportCampaigns(data.campaigns, 'overview')}>Export campaign data</Button>}
        />
        <MetricGrid>
          <MetricCard label="Sample spend" value={formatINRCompact(totals.spend)} sub={`${formatPercent(totals.budgetUtilisation, 0)} of ${formatINRCompact(totals.budget)} planned`} icon={<Wallet size={15} />} tone="var(--chart-1)" progress={totals.budgetUtilisation ?? 0} />
          <MetricCard label="Attributed revenue" value={formatINRCompact(totals.revenue)} sub="Campaign-reported demo revenue" icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Blended ROI" value={formatPercent(totals.roi, 0)} sub="Gross revenue against spend" icon={<BarChart3 size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Campaign leads" value={formatNumber(totals.leads)} sub={`${formatNumber(totals.conversions)} conversions · ${formatPercent(totals.conversionRate, 1)}`} icon={<Target size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard
            title="Six-month performance"
            subtitle="Sample spend and attributed revenue trend"
            height="md"
            legend={<><LegendItem color="var(--chart-1)" label="Revenue" /><LegendItem color="var(--chart-8)" label="Spend" /></>}
          >
            <LineChart data={performanceSeries} margin={{ top: 8, right: 10, left: 2, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} width={54} tickFormatter={(value) => formatINRCompact(Number(value))} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-1)" strokeWidth={2.4} dot={false} isAnimationActive={chartAnim} />
              <Line type="monotone" dataKey="spend" name="Spend" stroke="var(--chart-8)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={chartAnim} />
            </LineChart>
          </ChartCard>
          <ChartCard title="Lead-to-conversion funnel" subtitle="Campaign-reported sample leads" height="md" isEmpty={totals.leads === 0}>
            <div style={{ padding: '6px 4px 0' }}>
              <Funnel stages={funnelStages} />
              <div className="mini-stats mt-16">
                <div className="mini-stat"><p className="mini-stat__label">Qualified rate</p><p className="mini-stat__value">{formatPercent(totals.leads ? (totals.qualified / totals.leads) * 100 : null, 1)}</p></div>
                <div className="mini-stat"><p className="mini-stat__label">Conversion rate</p><p className="mini-stat__value">{formatPercent(totals.conversionRate, 1)}</p></div>
                <div className="mini-stat"><p className="mini-stat__label">Cost per lead</p><p className="mini-stat__value">{totals.cpl !== null ? formatINR(totals.cpl) : '—'}</p></div>
              </div>
            </div>
          </ChartCard>
        </div>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Revenue by channel" subtitle="Campaign-reported revenue by channel" height="md" isEmpty={channelRows.length === 0}>
            <BarChart data={channelRows.map((row) => ({ name: row.channel, revenue: row.revenue, spend: row.spend }))} margin={{ top: 8, right: 8, left: 2, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <YAxis {...axisProps} width={54} tickFormatter={(value) => formatINRCompact(Number(value))} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="spend" name="Spend" fill="var(--chart-8)" opacity={0.4} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Lead sources" subtitle="CRM demo records by source" height="md" isEmpty={leadSourceRows.length === 0}>
            <PieChart>
              <Pie data={leadSourceRows.map((row, index) => ({ name: row.source, value: row.leads, color: chartColors[index % chartColors.length] }))} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3} stroke="none" isAnimationActive={chartAnim}>
                {leadSourceRows.map((row, index) => <Cell key={row.source} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} />
            </PieChart>
          </ChartCard>
        </div>

        <SectionCard title="Campaign snapshot" subtitle="Top campaigns by attributed demo revenue." actions={<Button variant="ghost" size="xs" onClick={() => exportCampaigns([...data.campaigns].sort((a, b) => b.kpis.revenue - a.kpis.revenue).slice(0, 8), 'campaign-snapshot')}>Export</Button>}>
          <DataTable
            data={[...data.campaigns].sort((a, b) => b.kpis.revenue - a.kpis.revenue).slice(0, 8)}
            rowKey={(campaign) => campaign.id}
            pageSize={8}
            compact
            columns={[
              { id: 'name', header: 'Campaign', mobileLabel: 'Campaign', sortValue: (campaign) => campaign.name, render: (campaign) => <div><p className="cell-primary">{campaign.name}</p><p className="text-xs muted">{campaign.channel}</p></div> },
              { id: 'spend', header: 'Spend', align: 'right', mobileLabel: 'Spend', sortValue: (campaign) => campaign.spend, render: (campaign) => formatINRCompact(campaign.spend) },
              { id: 'leads', header: 'Leads', align: 'right', mobileLabel: 'Leads', sortValue: (campaign) => campaign.kpis.leads, render: (campaign) => formatNumber(campaign.kpis.leads) },
              { id: 'conversions', header: 'Conversions', align: 'right', mobileLabel: 'Conversions', hideMobile: true, sortValue: (campaign) => campaign.kpis.conversions, render: (campaign) => formatNumber(campaign.kpis.conversions) },
              { id: 'revenue', header: 'Revenue', align: 'right', mobileLabel: 'Revenue', sortValue: (campaign) => campaign.kpis.revenue, render: (campaign) => <span className="cell-strong">{formatINRCompact(campaign.kpis.revenue)}</span> },
              { id: 'roi', header: 'ROI', align: 'right', mobileLabel: 'ROI', sortValue: (campaign) => campaignRoi(campaign) ?? -999, render: (campaign) => <Badge tone={(campaignRoi(campaign) ?? 0) >= 200 ? 'success' : (campaignRoi(campaign) ?? 0) >= 100 ? 'warning' : 'neutral'}>{formatPercent(campaignRoi(campaign), 0)}</Badge> },
            ]}
          />
        </SectionCard>

        <DemoNote>
          These reports are computed from local demo data only. Campaign revenue is sample attributed revenue, not audited profit. There is no data warehouse, BI server or scheduled reporting service.
        </DemoNote>
      </div>
    )
  }

  if (tab === 'campaign-performance') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Campaign performance"
          description="Compare every sample campaign on spend, leads, conversions, revenue and ROI. Use the search, filters and column sorting to explore the workbook."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportCampaigns(filteredCampaigns)}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Visible campaigns" value={filteredCampaigns.length} sub={`${data.campaigns.length} total demo campaigns`} icon={<BarChart3 size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Visible spend" value={formatINRCompact(filteredCampaigns.reduce((sum, campaign) => sum + campaign.spend, 0))} sub="Filtered campaign spend" icon={<Wallet size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Visible leads" value={formatNumber(filteredCampaigns.reduce((sum, campaign) => sum + campaign.kpis.leads, 0))} sub="Campaign-reported leads" icon={<Target size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Visible revenue" value={formatINRCompact(filteredCampaigns.reduce((sum, campaign) => sum + campaign.kpis.revenue, 0))} sub="Attributed demo revenue" icon={<TrendingUp size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <ChartCard title="Top campaigns by revenue" subtitle="Visible campaigns, ranked by attributed sample revenue" height="lg" isEmpty={filteredCampaigns.length === 0} legend={<><LegendItem color="var(--chart-1)" label="Revenue" /><LegendItem color="var(--chart-8)" label="Spend" /></>}>
          <BarChart
            data={[...filteredCampaigns].sort((a, b) => b.kpis.revenue - a.kpis.revenue).slice(0, 10).map((campaign) => ({
              name: campaign.name.split(' ').slice(0, 2).join(' '),
              revenue: campaign.kpis.revenue,
              spend: campaign.spend,
            }))}
            margin={{ top: 8, right: 8, left: 2, bottom: 0 }}
          >
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
            <YAxis {...axisProps} width={54} tickFormatter={(value) => formatINRCompact(Number(value))} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            <Bar dataKey="spend" name="Spend" fill="var(--chart-8)" opacity={0.4} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
          </BarChart>
        </ChartCard>

        <DataTable
          data={filteredCampaigns}
          rowKey={(campaign) => campaign.id}
          searchable={(campaign) => `${campaign.name} ${campaign.channel} ${campaign.owner} ${campaign.product} ${campaign.status}`}
          searchPlaceholder="Search campaigns, channels, owners…"
          pageSize={8}
          initialSort={{ columnId: 'revenue', direction: 'desc' }}
          caption="Campaign performance"
          filters={
            <>
              <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter campaign status">
                <option value="All">All statuses</option>
                {['Draft', 'Planned', 'Active', 'Paused', 'Completed', 'Archived'].map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="select" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)} aria-label="Filter campaign channel">
                <option value="All">All channels</option>
                {[...new Set(data.campaigns.map((campaign) => campaign.channel))].map((channel) => <option key={channel}>{channel}</option>)}
              </select>
            </>
          }
          columns={[
            { id: 'name', header: 'Campaign', mobileLabel: 'Campaign', sortValue: (campaign) => campaign.name, render: (campaign) => <div><p className="cell-primary">{campaign.name}</p><p className="text-xs muted">{campaign.channel} · {campaign.owner}</p></div> },
            { id: 'status', header: 'Status', mobileLabel: 'Status', sortValue: (campaign) => campaign.status, render: (campaign) => <StatusBadge status={campaign.status} /> },
            { id: 'budget', header: 'Budget', align: 'right', mobileLabel: 'Budget', hideMobile: true, sortValue: (campaign) => campaign.budget, render: (campaign) => formatINRCompact(campaign.budget) },
            { id: 'spend', header: 'Spend', align: 'right', mobileLabel: 'Spend', sortValue: (campaign) => campaign.spend, render: (campaign) => formatINRCompact(campaign.spend) },
            { id: 'leads', header: 'Leads', align: 'right', mobileLabel: 'Leads', sortValue: (campaign) => campaign.kpis.leads, render: (campaign) => formatNumber(campaign.kpis.leads) },
            { id: 'conversions', header: 'Conversions', align: 'right', mobileLabel: 'Conversions', hideMobile: true, sortValue: (campaign) => campaign.kpis.conversions, render: (campaign) => formatNumber(campaign.kpis.conversions) },
            { id: 'revenue', header: 'Revenue', align: 'right', mobileLabel: 'Revenue', sortValue: (campaign) => campaign.kpis.revenue, render: (campaign) => <span className="cell-strong">{formatINRCompact(campaign.kpis.revenue)}</span> },
            { id: 'roi', header: 'ROI', align: 'right', mobileLabel: 'ROI', sortValue: (campaign) => campaignRoi(campaign) ?? -999, render: (campaign) => formatPercent(campaignRoi(campaign), 0) },
            { id: 'ctr', header: 'CTR', align: 'right', mobileLabel: 'CTR', hideMobile: true, sortValue: (campaign) => campaignCtr(campaign) ?? 0, render: (campaign) => formatPercent(campaignCtr(campaign), 2) },
          ]}
        />
        <DataNote>Campaign metrics are pre-seeded sample values. Revenue is attributed demo revenue, not verified sales or profit.</DataNote>
      </div>
    )
  }

  if (tab === 'channel-performance') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Channel performance"
          description="Aggregate sample campaigns by channel to compare efficiency and revenue contribution. Channel totals roll up the campaign workbook."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={exportChannels}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Channels" value={channelRows.length} sub="Channels represented in demo campaigns" icon={<BarChart3 size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Highest revenue" value={channelRows[0]?.channel ?? '—'} sub={channelRows[0] ? formatINRCompact(channelRows[0].revenue) : 'No data'} icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Best ROI" value={channelRows.length ? [...channelRows].sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))[0].channel : '—'} sub={channelRows.length ? formatPercent([...channelRows].sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))[0].roi, 0) : 'No data'} icon={<Target size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Blended ROI" value={formatPercent(totals.roi, 0)} sub="All campaigns" icon={<Wallet size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Spend and revenue by channel" subtitle="Sample campaign totals" height="md" legend={<><LegendItem color="var(--chart-1)" label="Revenue" /><LegendItem color="var(--chart-8)" label="Spend" /></>} isEmpty={channelRows.length === 0}>
            <BarChart data={channelRows} margin={{ top: 8, right: 8, left: 2, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="channel" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <YAxis {...axisProps} width={54} tickFormatter={(value) => formatINRCompact(Number(value))} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="spend" name="Spend" fill="var(--chart-8)" opacity={0.4} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
          <ChartCard title="ROI by channel" subtitle="Gross demo return against spend" height="md" isEmpty={channelRows.length === 0}>
            <BarChart data={[...channelRows].sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 0 }}>
              <CartesianGrid {...gridProps} vertical horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="channel" width={68} {...axisProps} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value.toFixed(0)}%`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="roi" name="ROI" fill="var(--chart-2)" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
        </div>

        <DataTable
          data={channelRows}
          rowKey={(row) => row.channel}
          searchable={(row) => row.channel}
          searchPlaceholder="Search channels…"
          pageSize={10}
          initialSort={{ columnId: 'revenue', direction: 'desc' }}
          caption="Channel performance"
          columns={[
            { id: 'channel', header: 'Channel', mobileLabel: 'Channel', sortValue: (row) => row.channel, render: (row) => <div><p className="cell-primary">{row.channel}</p><p className="text-xs muted">{row.campaigns} campaigns</p></div> },
            { id: 'budget', header: 'Budget', align: 'right', mobileLabel: 'Budget', hideMobile: true, sortValue: (row) => row.budget, render: (row) => formatINRCompact(row.budget) },
            { id: 'spend', header: 'Spend', align: 'right', mobileLabel: 'Spend', sortValue: (row) => row.spend, render: (row) => formatINRCompact(row.spend) },
            { id: 'leads', header: 'Leads', align: 'right', mobileLabel: 'Leads', sortValue: (row) => row.leads, render: (row) => formatNumber(row.leads) },
            { id: 'conversions', header: 'Conversions', align: 'right', mobileLabel: 'Conversions', hideMobile: true, sortValue: (row) => row.conversions, render: (row) => formatNumber(row.conversions) },
            { id: 'revenue', header: 'Revenue', align: 'right', mobileLabel: 'Revenue', sortValue: (row) => row.revenue, render: (row) => <span className="cell-strong">{formatINRCompact(row.revenue)}</span> },
            { id: 'roi', header: 'ROI', align: 'right', mobileLabel: 'ROI', sortValue: (row) => row.roi ?? -999, render: (row) => <Badge tone={(row.roi ?? 0) >= 200 ? 'success' : (row.roi ?? 0) >= 100 ? 'warning' : 'neutral'}>{formatPercent(row.roi, 0)}</Badge> },
            { id: 'cpl', header: 'CPL', align: 'right', mobileLabel: 'CPL', hideMobile: true, sortValue: (row) => row.cpl ?? 0, render: (row) => row.cpl !== null ? formatINR(row.cpl) : '—' },
            { id: 'conv', header: 'Lead → sale', align: 'right', mobileLabel: 'Conversion rate', sortValue: (row) => row.conversionRate ?? 0, render: (row) => formatPercent(row.conversionRate, 1) },
          ]}
        />
        <DataNote>Channel totals are derived from campaign-reported sample data. There is no media-platform API, attribution engine or verified revenue feed.</DataNote>
      </div>
    )
  }

  if (tab === 'product-brand') {
    const productPie = productRows.map((row, index) => ({ name: row.product, value: row.revenue, color: chartColors[index % chartColors.length] }))
    return (
      <div className="stack-16">
        <TabIntro
          title="Product & brand analysis"
          description="Compare sample campaigns by product family. Brand health, awareness and sentiment are not measured here — only campaign-reported performance."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={exportProducts}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Product families" value={productRows.length} sub="Products represented in campaigns" icon={<PieChartIcon size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Top revenue product" value={productRows[0]?.product ?? '—'} sub={productRows[0] ? formatINRCompact(productRows[0].revenue) : 'No data'} icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Top ROI product" value={productRows.length ? [...productRows].sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))[0].product : '—'} sub={productRows.length ? formatPercent([...productRows].sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))[0].roi, 0) : 'No data'} icon={<Target size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Portfolio revenue" value={formatINRCompact(productRows.reduce((sum, row) => sum + row.revenue, 0))} sub="Attributed demo revenue" icon={<Wallet size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Revenue share by product" subtitle="Attributed sample revenue mix" height="md" isEmpty={productPie.length === 0}>
            <PieChart>
              <Pie data={productPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3} stroke="none" isAnimationActive={chartAnim}>
                {productPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} />
            </PieChart>
          </ChartCard>
          <ChartCard title="ROI by product" subtitle="Campaign-reported gross return" height="md" isEmpty={productRows.length === 0}>
            <BarChart data={productRows} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 0 }}>
              <CartesianGrid {...gridProps} vertical horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="product" width={100} {...axisProps} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value.toFixed(0)}%`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="roi" name="ROI" fill="var(--chart-3)" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
        </div>

        <DataTable
          data={productRows}
          rowKey={(row) => row.product}
          searchable={(row) => row.product}
          searchPlaceholder="Search products…"
          pageSize={10}
          initialSort={{ columnId: 'revenue', direction: 'desc' }}
          caption="Product analysis"
          columns={[
            { id: 'product', header: 'Product', mobileLabel: 'Product', sortValue: (row) => row.product, render: (row) => <div><p className="cell-primary">{row.product}</p><p className="text-xs muted">{row.campaigns} campaigns</p></div> },
            { id: 'budget', header: 'Budget', align: 'right', mobileLabel: 'Budget', hideMobile: true, sortValue: (row) => row.budget, render: (row) => formatINRCompact(row.budget) },
            { id: 'spend', header: 'Spend', align: 'right', mobileLabel: 'Spend', sortValue: (row) => row.spend, render: (row) => formatINRCompact(row.spend) },
            { id: 'leads', header: 'Leads', align: 'right', mobileLabel: 'Leads', sortValue: (row) => row.leads, render: (row) => formatNumber(row.leads) },
            { id: 'conversions', header: 'Conversions', align: 'right', mobileLabel: 'Conversions', hideMobile: true, sortValue: (row) => row.conversions, render: (row) => formatNumber(row.conversions) },
            { id: 'revenue', header: 'Revenue', align: 'right', mobileLabel: 'Revenue', sortValue: (row) => row.revenue, render: (row) => <span className="cell-strong">{formatINRCompact(row.revenue)}</span> },
            { id: 'roi', header: 'ROI', align: 'right', mobileLabel: 'ROI', sortValue: (row) => row.roi ?? -999, render: (row) => formatPercent(row.roi, 0) },
          ]}
        />
        <DataNote>Product grouping uses campaign product labels. No brand tracker, sentiment feed or sell-out dataset is connected.</DataNote>
      </div>
    )
  }

  if (tab === 'retailer-performance') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Retailer performance"
          description="Compare demo store activity, completion and agreement coverage. This is activation tracking, not live sell-out or inventory data."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={exportRetailers}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Retailers" value={retailerRows.length} sub="Stores with demo trade activity" icon={<BarChart3 size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Activities logged" value={retailerRows.reduce((sum, row) => sum + row.activities, 0)} sub={`${retailerRows.reduce((sum, row) => sum + row.completed, 0)} completed`} icon={<Target size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Agreement coverage" value={formatPercent(retailerRows.length ? (retailerRows.filter((row) => row.agreementValue > 0).length / retailerRows.length) * 100 : null, 0)} sub="Retailers with a demo agreement" icon={<Wallet size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Agreement value" value={formatINRCompact(retailerRows.reduce((sum, row) => sum + row.agreementValue, 0))} sub="Sample store agreement value" icon={<TrendingUp size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <ChartCard
          title="Store activity completion"
          subtitle="Completed versus open demo activities by retailer"
          height="lg"
          legend={<><LegendItem color="var(--chart-2)" label="Completed" /><LegendItem color="var(--chart-3)" label="Open / planned" /></>}
          isEmpty={retailerRows.length === 0}
        >
          <BarChart data={retailerRows.slice(0, 10)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="store" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
            <YAxis {...axisProps} width={32} allowDecimals={false} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} activities`} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="completed" name="Completed" fill="var(--chart-2)" stackId="a" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            <Bar dataKey="planned" name="Open" fill="var(--chart-3)" stackId="a" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
          </BarChart>
        </ChartCard>

        <DataTable
          data={retailerRows}
          rowKey={(row) => row.store}
          searchable={(row) => `${row.store} ${row.location} ${row.agreementType} ${row.agreementStatus}`}
          searchPlaceholder="Search retailers, locations…"
          pageSize={8}
          initialSort={{ columnId: 'activities', direction: 'desc' }}
          caption="Retailer performance"
          columns={[
            { id: 'store', header: 'Retailer', mobileLabel: 'Retailer', sortValue: (row) => row.store, render: (row) => <div><p className="cell-primary">{row.store}</p><p className="text-xs muted">{row.location}</p></div> },
            { id: 'activities', header: 'Activities', align: 'right', mobileLabel: 'Activities', sortValue: (row) => row.activities, render: (row) => formatNumber(row.activities) },
            { id: 'completed', header: 'Completed', align: 'right', mobileLabel: 'Completed', sortValue: (row) => row.completed, render: (row) => <span className="cell-strong">{formatNumber(row.completed)}</span> },
            { id: 'planned', header: 'Open', align: 'right', mobileLabel: 'Open', hideMobile: true, sortValue: (row) => row.planned, render: (row) => formatNumber(row.planned) },
            { id: 'agreement', header: 'Agreement', mobileLabel: 'Agreement', hideMobile: true, render: (row) => <span className="text-xs">{row.agreementType}</span> },
            { id: 'agreementStatus', header: 'Agreement status', mobileLabel: 'Agreement status', sortValue: (row) => row.agreementStatus, render: (row) => row.agreementStatus === '—' ? <span className="muted text-xs">No agreement</span> : <StatusBadge status={row.agreementStatus} /> },
            { id: 'value', header: 'Value', align: 'right', mobileLabel: 'Agreement value', sortValue: (row) => row.agreementValue, render: (row) => row.agreementValue ? formatINR(row.agreementValue) : '—' },
            { id: 'campaigns', header: 'Linked activities', align: 'right', mobileLabel: 'Linked activities', hideMobile: true, sortValue: (row) => row.campaigns, render: (row) => formatNumber(row.campaigns) },
          ]}
        />
        <DataNote>No point-of-sale, sell-out, stock or retailer portal data is connected. Retailer names and activities are fictional demo records.</DataNote>
      </div>
    )
  }

  if (tab === 'roi-profitability') {
    const roiRows = [...data.campaigns]
      .filter((campaign) => campaign.spend > 0)
      .sort((a, b) => (campaignRoi(b) ?? 0) - (campaignRoi(a) ?? 0))
    return (
      <div className="stack-16">
        <TabIntro
          title="ROI & profitability"
          description="Explore gross campaign return against sample spend. This is not a profit-and-loss statement; creative, people and overhead costs are excluded."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportCampaigns(roiRows, 'roi-profitability')}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Attributed revenue" value={formatINRCompact(totals.revenue)} sub="Gross campaign-reported revenue" icon={<TrendingUp size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Sample spend" value={formatINRCompact(totals.spend)} sub="Campaign-reported spend" icon={<Wallet size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Gross return" value={formatINRCompact(totals.revenue - totals.spend)} sub="Revenue minus sample spend" icon={<BarChart3 size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Blended ROI" value={formatPercent(totals.roi, 0)} sub="Before overheads and margin" icon={<Target size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Campaign ROI ranking" subtitle="Gross return on sample spend" height="lg" isEmpty={roiRows.length === 0}>
            <BarChart data={roiRows.slice(0, 10).map((campaign) => ({ name: campaign.name.split(' ').slice(0, 2).join(' '), roi: campaignRoi(campaign) ?? 0 }))} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 0 }}>
              <CartesianGrid {...gridProps} vertical horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="name" width={92} {...axisProps} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value.toFixed(0)}%`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="roi" name="ROI" fill="var(--chart-2)" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
          <SectionCard title="Efficiency snapshot" subtitle="Sample cost metrics across the campaign workbook.">
            <div className="mini-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="mini-stat"><p className="mini-stat__label">Cost per lead</p><p className="mini-stat__value">{totals.cpl !== null ? formatINR(totals.cpl) : '—'}</p><p className="mini-stat__sub">Sample spend ÷ leads</p></div>
              <div className="mini-stat"><p className="mini-stat__label">Cost per acquisition</p><p className="mini-stat__value">{totals.cpa !== null ? formatINR(totals.cpa) : '—'}</p><p className="mini-stat__sub">Sample spend ÷ conversions</p></div>
              <div className="mini-stat"><p className="mini-stat__label">Lead → conversion</p><p className="mini-stat__value">{formatPercent(totals.conversionRate, 1)}</p><p className="mini-stat__sub">Campaign-reported</p></div>
              <div className="mini-stat"><p className="mini-stat__label">Budget utilisation</p><p className="mini-stat__value">{formatPercent(totals.budgetUtilisation, 0)}</p><p className="mini-stat__sub">Spend against budget</p></div>
            </div>
            <div className="mt-16">
              <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Read with care</p>
              <p className="text-xs muted" style={{ lineHeight: 1.6 }}>This demo excludes gross margin, media rebates, people costs, agency retainers, overheads and taxes. Do not use these numbers for financial reporting.</p>
            </div>
          </SectionCard>
        </div>

        <DataTable
          data={roiRows}
          rowKey={(campaign) => campaign.id}
          searchable={(campaign) => `${campaign.name} ${campaign.channel} ${campaign.product} ${campaign.owner}`}
          searchPlaceholder="Search campaigns…"
          pageSize={8}
          initialSort={{ columnId: 'roi', direction: 'desc' }}
          caption="ROI and profitability"
          columns={[
            { id: 'name', header: 'Campaign', mobileLabel: 'Campaign', sortValue: (campaign) => campaign.name, render: (campaign) => <div><p className="cell-primary">{campaign.name}</p><p className="text-xs muted">{campaign.channel} · {campaign.product}</p></div> },
            { id: 'spend', header: 'Spend', align: 'right', mobileLabel: 'Spend', sortValue: (campaign) => campaign.spend, render: (campaign) => formatINRCompact(campaign.spend) },
            { id: 'revenue', header: 'Revenue', align: 'right', mobileLabel: 'Revenue', sortValue: (campaign) => campaign.kpis.revenue, render: (campaign) => <span className="cell-strong">{formatINRCompact(campaign.kpis.revenue)}</span> },
            { id: 'return', header: 'Gross return', align: 'right', mobileLabel: 'Gross return', hideMobile: true, sortValue: (campaign) => campaign.kpis.revenue - campaign.spend, render: (campaign) => formatINRCompact(campaign.kpis.revenue - campaign.spend) },
            { id: 'roi', header: 'ROI', align: 'right', mobileLabel: 'ROI', sortValue: (campaign) => campaignRoi(campaign) ?? -999, render: (campaign) => <Badge tone={(campaignRoi(campaign) ?? 0) >= 200 ? 'success' : (campaignRoi(campaign) ?? 0) >= 100 ? 'warning' : 'neutral'}>{formatPercent(campaignRoi(campaign), 0)}</Badge> },
            { id: 'cpl', header: 'CPL', align: 'right', mobileLabel: 'CPL', hideMobile: true, sortValue: (campaign) => campaignCpl(campaign) ?? 0, render: (campaign) => campaignCpl(campaign) !== null ? formatINR(campaignCpl(campaign) as number) : '—' },
            { id: 'cpa', header: 'CPA', align: 'right', mobileLabel: 'CPA', hideMobile: true, sortValue: (campaign) => campaignCpa(campaign) ?? 0, render: (campaign) => campaignCpa(campaign) !== null ? formatINR(campaignCpa(campaign) as number) : '—' },
            { id: 'ratio', header: 'Revenue / spend', align: 'right', mobileLabel: 'Revenue / spend', sortValue: (campaign) => campaign.spend > 0 ? campaign.kpis.revenue / campaign.spend : 0, render: (campaign) => campaign.spend > 0 ? formatRatio(campaign.kpis.revenue / campaign.spend) : '—' },
          ]}
        />
        <DemoNote>Gross ROI is sample attributed revenue divided by sample spend. It is not audited profit, contribution margin or return on invested capital. No finance or BI system is connected.</DemoNote>
      </div>
    )
  }

  if (tab === 'export-reports') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Export reports"
          description="Generate client-side CSV extracts from the local demo dataset. Exports are created in your browser — there is no scheduled report, email delivery or server export."
        />
        <div className="callout callout--info">
          <Download size={15} />
          <span>Every export includes a clear demo filename and is written directly to your downloads folder. No report is stored on a server or shared with anyone.</span>
        </div>
        <EntityGrid columns={2}>
          <EntityCard
            title="Campaign performance"
            subtitle="Campaign-level budget, spend, funnel and ROI"
            badge={<Badge tone="neutral">CSV</Badge>}
            meta={<span>{data.campaigns.length} campaign rows</span>}
          >
            <p className="text-xs muted" style={{ lineHeight: 1.55 }}>Includes budget, spend, impressions, clicks, leads, qualified leads, conversions, attributed revenue and ROI.</p>
            <Button variant="primary" size="sm" icon={<FileSpreadsheet size={14} />} onClick={() => exportCampaigns(data.campaigns, 'export-campaigns')}>Download campaign CSV</Button>
          </EntityCard>
          <EntityCard
            title="Channel performance"
            subtitle="Channel-level roll-up and efficiency"
            badge={<Badge tone="neutral">CSV</Badge>}
            meta={<span>{channelRows.length} channel rows</span>}
          >
            <p className="text-xs muted" style={{ lineHeight: 1.55 }}>Includes campaigns, budget, spend, leads, qualified leads, conversions, revenue, ROI, CPL and lead-to-sale rate.</p>
            <Button variant="primary" size="sm" icon={<LineChartIcon size={14} />} onClick={exportChannels}>Download channel CSV</Button>
          </EntityCard>
          <EntityCard
            title="Product & brand"
            subtitle="Product-family performance"
            badge={<Badge tone="neutral">CSV</Badge>}
            meta={<span>{productRows.length} product rows</span>}
          >
            <p className="text-xs muted" style={{ lineHeight: 1.55 }}>Includes campaign count, budget, spend, leads, conversions, revenue and gross ROI by product label.</p>
            <Button variant="primary" size="sm" icon={<PieChartIcon size={14} />} onClick={exportProducts}>Download product CSV</Button>
          </EntityCard>
          <EntityCard
            title="Retailer performance"
            subtitle="Store activation and agreement view"
            badge={<Badge tone="neutral">CSV</Badge>}
            meta={<span>{retailerRows.length} retailer rows</span>}
          >
            <p className="text-xs muted" style={{ lineHeight: 1.55 }}>Includes demo activities, completions, open tasks, agreement type/status/value and campaign-linked activity counts.</p>
            <Button variant="primary" size="sm" icon={<BarChart3 size={14} />} onClick={exportRetailers}>Download retailer CSV</Button>
          </EntityCard>
          <EntityCard
            title="Lead attribution summary"
            subtitle="Leads and conversions by source"
            badge={<Badge tone="neutral">CSV</Badge>}
            meta={<span>{leadSourceRows.length} source rows</span>}
          >
            <p className="text-xs muted" style={{ lineHeight: 1.55 }}>Aggregates CRM demo leads by source and includes converted counts and conversion rate.</p>
            <Button variant="primary" size="sm" icon={<Target size={14} />} onClick={exportLeads}>Download lead summary</Button>
          </EntityCard>
          <EntityCard
            title="Expense summary"
            subtitle="Campaign expense register"
            badge={<Badge tone="neutral">CSV</Badge>}
            meta={<span>{data.expenses.length} expense rows</span>}
          >
            <p className="text-xs muted" style={{ lineHeight: 1.55 }}>Includes expense reference, category, campaign, amount, date, status and submitter.</p>
            <Button variant="primary" size="sm" icon={<Wallet size={14} />} onClick={exportExpenses}>Download expense CSV</Button>
          </EntityCard>
          <EntityCard
            title="Vendor performance"
            subtitle="Partner scorecard extract"
            badge={<Badge tone="neutral">CSV</Badge>}
            meta={<span>{data.agencies.length} partner rows</span>}
          >
            <p className="text-xs muted" style={{ lineHeight: 1.55 }}>Includes partner type, contract status and sample completion, budget, quality and timeliness scores.</p>
            <Button variant="primary" size="sm" icon={<BarChart3 size={14} />} onClick={exportVendors}>Download vendor CSV</Button>
          </EntityCard>
          <EntityCard
            title="Trade activity"
            subtitle="Store activity register"
            badge={<Badge tone="neutral">CSV</Badge>}
            meta={<span>{data.storeActivities.length} activity rows</span>}
          >
            <p className="text-xs muted" style={{ lineHeight: 1.55 }}>Exports store activity IDs, stores, activity types, locations, owners, statuses and campaign links.</p>
            <Button variant="primary" size="sm" icon={<FileSpreadsheet size={14} />} onClick={() => {
              const result = downloadCsv('trade-activity-report-demo', [
                { header: 'ID', value: (row: typeof data.storeActivities[number]) => row.id },
                { header: 'Store', value: (row: typeof data.storeActivities[number]) => row.store },
                { header: 'Activity', value: (row: typeof data.storeActivities[number]) => row.activityType },
                { header: 'Location', value: (row: typeof data.storeActivities[number]) => row.location },
                { header: 'Date', value: (row: typeof data.storeActivities[number]) => row.date },
                { header: 'Owner', value: (row: typeof data.storeActivities[number]) => row.assignedTo },
                { header: 'Status', value: (row: typeof data.storeActivities[number]) => row.status },
                { header: 'Campaign', value: (row: typeof data.storeActivities[number]) => row.campaignId ?? '' },
              ], data.storeActivities)
              pushToast({ title: result.ok ? 'Trade activity exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
            }}>Download trade CSV</Button>
          </EntityCard>
        </EntityGrid>

        <SectionCard title="Board summary" subtitle="Key sample metrics available for an offline narrative.">
          <DetailRows
            items={[
              { label: 'Total campaigns', value: formatNumber(data.campaigns.length) },
              { label: 'Active campaigns', value: formatNumber(data.campaigns.filter((campaign) => campaign.status === 'Active').length) },
              { label: 'Sample spend', value: formatINR(totals.spend) },
              { label: 'Attributed revenue', value: formatINR(totals.revenue) },
              { label: 'Blended ROI', value: formatPercent(totals.roi, 0) },
              { label: 'Campaign leads', value: formatNumber(totals.leads) },
              { label: 'CRM leads in table', value: formatNumber(data.leads.length) },
              { label: 'Retailers with activity', value: formatNumber(retailerRows.length) },
            ]}
          />
          <DataNote>Values come from separate demo scopes: campaign-reported aggregates, CRM lead rows and trade activity records. They are not reconciled into a single financial statement.</DataNote>
        </SectionCard>

        <DemoNote>
          The exports are client-side CSV files only. No PDF renderer, email delivery, report scheduler, BI workspace or data-warehouse extract is available in this frontend demo.
        </DemoNote>
      </div>
    )
  }

  return null
}
