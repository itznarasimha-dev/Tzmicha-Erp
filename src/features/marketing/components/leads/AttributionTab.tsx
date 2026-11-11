import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Filter,
  RefreshCw,
  Send,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Campaign, Lead, Opportunity, SalesRepresentative } from '../../types/marketing'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { DataTable, type DataTableColumn } from '../ui/DataTable'
import { SectionCard } from '../ui/SectionCard'
import {
  ChartCard,
  ChartTooltip,
  PieLegend,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../charts/ChartKit'
import {
  SALES_HANDOFF_STATUSES,
  allFollowUpViews,
  campaignAnalytics,
  dateRangeFor,
  filterLeads,
  followUpTotals,
  leadFunnel,
  sourceAnalytics,
  type CampaignAnalyticsRow,
  type DateRangeId,
  type SourceAnalyticsRow,
} from '../../utils/leads'
import { leadConversionRate, leadSourceCategoryData, safeDivide } from '../../utils/analytics'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../../utils/format'

interface AttributionTabProps {
  leads: Lead[]
  campaigns: Campaign[]
  opportunities: Opportunity[]
  salesReps: SalesRepresentative[]
  onOpenLead: (leadId: string) => void
  onRefresh: () => void
}

export function AttributionTab({ leads, campaigns, opportunities, salesReps, onOpenLead, onRefresh }: AttributionTabProps) {
  const [range, setRange] = useState<DateRangeId>('all')
  const [source, setSource] = useState('All')
  const [campaign, setCampaign] = useState('All')
  const [employee, setEmployee] = useState('All')
  const chartAnimation = useChartAnimation()

  const owners = useMemo(() => [...new Set(leads.map((lead) => lead.assignedTo).filter(Boolean))].sort(), [leads])
  const dateRange = useMemo(() => dateRangeFor(range), [range])

  const filtered = useMemo(
    () => filterLeads(leads, { dateRange, source, campaign, employee }),
    [leads, dateRange, source, campaign, employee],
  )

  const sources = useMemo(() => sourceAnalytics(filtered), [filtered])
  const categoryRows = useMemo(() => leadSourceCategoryData(filtered), [filtered])
  const campaignRows = useMemo(() => campaignAnalytics(campaigns, filtered, opportunities), [campaigns, filtered, opportunities])
  const followUps = useMemo(() => allFollowUpViews(filtered), [filtered])
  const followTotals = followUpTotals(followUps)
  const funnel = useMemo(() => leadFunnel(filtered), [filtered])

  const qualified = filtered.filter((lead) => ['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status)).length
  const sentToSales = filtered.filter((lead) => Boolean(lead.salesAssignment) || ['Sent to Sales', 'Converted', 'Lost'].includes(lead.status)).length
  const converted = filtered.filter((lead) => lead.status === 'Converted' || lead.converted).length
  const assigned = filtered.filter((lead) => Boolean(lead.salesAssignment))
  const wonHandoffs = assigned.filter((lead) => lead.salesAssignment?.salesStatus === 'Won').length
  const lostHandoffs = assigned.filter((lead) => lead.salesAssignment?.salesStatus === 'Lost').length
  const wonValue = opportunities
    .filter((opportunity) => opportunity.stage === 'Won' && filtered.some((lead) => lead.id === opportunity.leadId))
    .reduce((sum, opportunity) => sum + opportunity.value, 0)
  const conversionRate = leadConversionRate(converted, filtered.length)
  const assignmentRate = leadConversionRate(sentToSales, filtered.length)

  const methodBreakdown = useMemo(() => {
    const map = new Map<string, { method: string; total: number; completed: number; overdue: number }>()
    followUps.forEach((followUp) => {
      const row = map.get(followUp.method) ?? { method: followUp.method, total: 0, completed: 0, overdue: 0 }
      row.total += 1
      if (followUp.displayStatus === 'Completed') row.completed += 1
      if (followUp.displayStatus === 'Overdue') row.overdue += 1
      map.set(followUp.method, row)
    })
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [followUps])

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    assigned.forEach((lead) => {
      const status = lead.salesAssignment?.salesStatus ?? 'Assigned'
      counts.set(status, (counts.get(status) ?? 0) + 1)
    })
    return SALES_HANDOFF_STATUSES.filter((status) => counts.has(status)).map((status, index) => ({
      name: status,
      value: counts.get(status) ?? 0,
      color: status === 'Won' ? 'var(--chart-2)' : status === 'Lost' ? 'var(--chart-4)' : chartColors[index % chartColors.length],
    }))
  }, [assigned])

  const repRows = useMemo(
    () => salesReps
      .filter((rep) => rep.active)
      .map((rep) => {
        const assignedLeads = filtered.filter((lead) => lead.salesAssignment?.salesRepId === rep.id)
        const won = assignedLeads.filter((lead) => lead.salesAssignment?.salesStatus === 'Won').length
        const lost = assignedLeads.filter((lead) => lead.salesAssignment?.salesStatus === 'Lost').length
        const activeConversations = assignedLeads.filter((lead) => {
          const status = lead.salesAssignment?.salesStatus
          return status && status !== 'Won' && status !== 'Lost'
        }).length
        const value = opportunities
          .filter((opportunity) => opportunity.stage === 'Won' && assignedLeads.some((lead) => lead.id === opportunity.leadId))
          .reduce((sum, opportunity) => sum + opportunity.value, 0)
        return {
          rep,
          total: assignedLeads.length,
          active: activeConversations,
          won,
          lost,
          value,
          winRate: leadConversionRate(won, won + lost),
        }
      })
      .sort((a, b) => b.total - a.total),
    [salesReps, filtered, opportunities],
  )

  const employeeRows = useMemo(() => {
    const map = new Map<string, { owner: string; total: number; qualified: number; converted: number }>()
    filtered.forEach((lead) => {
      const row = map.get(lead.assignedTo) ?? { owner: lead.assignedTo, total: 0, qualified: 0, converted: 0 }
      row.total += 1
      if (['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status)) row.qualified += 1
      if (lead.status === 'Converted' || lead.converted) row.converted += 1
      map.set(lead.assignedTo, row)
    })
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [filtered])

  const sourceColumns: DataTableColumn<SourceAnalyticsRow>[] = [
    { id: 'source', header: 'Source', sortValue: (row) => row.source, mobileLabel: 'Source', render: (row) => <span className="cell-primary">{row.source}</span> },
    { id: 'total', header: 'Leads', align: 'right', sortValue: (row) => row.total, mobileLabel: 'Leads', render: (row) => formatNumber(row.total) },
    { id: 'qualified', header: 'Qualified', align: 'right', sortValue: (row) => row.qualified, mobileLabel: 'Qualified', render: (row) => formatNumber(row.qualified) },
    { id: 'sent', header: 'Sent to sales', align: 'right', sortValue: (row) => row.sentToSales, mobileLabel: 'Sent to sales', render: (row) => formatNumber(row.sentToSales) },
    { id: 'converted', header: 'Converted', align: 'right', sortValue: (row) => row.converted, mobileLabel: 'Converted', render: (row) => formatNumber(row.converted) },
    { id: 'assignment', header: 'Assignment rate', align: 'right', sortValue: (row) => row.assignmentRate ?? -1, mobileLabel: 'Assignment rate', render: (row) => formatPercent(row.assignmentRate) },
    { id: 'conversion', header: 'Conversion rate', align: 'right', sortValue: (row) => row.conversionRate ?? -1, mobileLabel: 'Conversion rate', render: (row) => <span className="cell-strong">{formatPercent(row.conversionRate)}</span> },
  ]

  const categoryColumns: DataTableColumn<{
    source: string
    leads: number
    qualified: number
    converted: number
  }>[] = [
    { id: 'category', header: 'Canonical category', sortValue: (row) => row.source, mobileLabel: 'Category', render: (row) => <span className="cell-primary">{row.source}</span> },
    { id: 'leads', header: 'Leads', align: 'right', sortValue: (row) => row.leads, mobileLabel: 'Leads', render: (row) => formatNumber(row.leads) },
    { id: 'qualified', header: 'Qualified', align: 'right', sortValue: (row) => row.qualified, mobileLabel: 'Qualified', render: (row) => formatNumber(row.qualified) },
    { id: 'converted', header: 'Converted', align: 'right', sortValue: (row) => row.converted, mobileLabel: 'Converted', render: (row) => formatNumber(row.converted) },
    { id: 'rate', header: 'Conversion rate', align: 'right', sortValue: (row) => (row.leads ? row.converted / row.leads : -1), mobileLabel: 'Conversion rate', render: (row) => <span className="cell-strong">{formatPercent(leadConversionRate(row.converted, row.leads))}</span> },
  ]

  const campaignColumns: DataTableColumn<CampaignAnalyticsRow>[] = [
    {
      id: 'campaign',
      header: 'Campaign',
      sortValue: (row) => row.campaign.name,
      mobileLabel: 'Campaign',
      render: (row) => (
        <div>
          <p className="cell-primary">{row.campaign.name}</p>
          <p className="text-xs muted">{row.campaign.channel} · {row.campaign.status}</p>
        </div>
      ),
    },
    { id: 'leads', header: 'Leads', align: 'right', sortValue: (row) => row.leads, mobileLabel: 'Leads', render: (row) => formatNumber(row.leads) },
    { id: 'qualified', header: 'Qualified', align: 'right', sortValue: (row) => row.qualified, mobileLabel: 'Qualified', hideMobile: true, render: (row) => formatNumber(row.qualified) },
    { id: 'sent', header: 'Sent', align: 'right', sortValue: (row) => row.sentToSales, mobileLabel: 'Sent to sales', hideMobile: true, render: (row) => formatNumber(row.sentToSales) },
    { id: 'converted', header: 'Converted', align: 'right', sortValue: (row) => row.converted, mobileLabel: 'Converted', render: (row) => formatNumber(row.converted) },
    { id: 'wonValue', header: 'Won value', align: 'right', sortValue: (row) => row.wonValue, mobileLabel: 'Won value', render: (row) => <span className="cell-strong">{formatINRCompact(row.wonValue)}</span> },
    { id: 'followup', header: 'Follow-up completion', align: 'right', sortValue: (row) => row.followUpCompletionRate ?? -1, mobileLabel: 'Follow-up completion', render: (row) => formatPercent(row.followUpCompletionRate) },
    { id: 'conversion', header: 'Conversion', align: 'right', sortValue: (row) => row.conversionRate ?? -1, mobileLabel: 'Conversion rate', render: (row) => formatPercent(row.conversionRate) },
  ]

  const topSources = sources.slice(0, 7)
  const topCampaigns = campaignRows.filter((row) => row.leads > 0).slice(0, 6)

  const reset = () => {
    setRange('all')
    setSource('All')
    setCampaign('All')
    setEmployee('All')
    onRefresh()
  }

  return (
    <div className="lead-attribution stack-16">
      <div className="lead-attribution__toolbar">
        <label className="lead-attribution__filter">
          <span>Date range</span>
          <select className="select" value={range} onChange={(event) => setRange(event.target.value as DateRangeId)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="quarter">This quarter</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label className="lead-attribution__filter">
          <span>Source</span>
          <select className="select" value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="All">All sources</option>
            {[...new Set(leads.map((lead) => lead.source))].sort().map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="lead-attribution__filter">
          <span>Campaign</span>
          <select className="select" value={campaign} onChange={(event) => setCampaign(event.target.value)}>
            <option value="All">All campaigns</option>
            {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="lead-attribution__filter">
          <span>Employee</span>
          <select className="select" value={employee} onChange={(event) => setEmployee(event.target.value)}>
            <option value="All">All employees</option>
            {owners.map((owner) => <option key={owner}>{owner}</option>)}
          </select>
        </label>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={onRefresh}>Refresh</Button>
        <Button variant="ghost" size="sm" icon={<Filter size={13} />} onClick={reset}>Reset</Button>
      </div>

      {filtered.length === 0 ? (
        <div className="lead-dashboard__empty">
          <Filter size={22} />
          <h3>No leads match these attribution filters</h3>
          <p>Widen the date range or clear the source, campaign or employee filter.</p>
          <Button variant="soft" onClick={reset}>Reset filters</Button>
        </div>
      ) : null}

      <div className="lead-attribution__kpis">
        <Kpi icon={<Users size={15} />} label="Attributed leads" value={formatNumber(filtered.length)} sub={`${formatPercent(assignmentRate)} assigned to sales`} tone="var(--chart-1)" />
        <Kpi icon={<UserCheck size={15} />} label="Qualified" value={formatNumber(qualified)} sub={`${formatPercent(leadConversionRate(qualified, filtered.length))} of attributed leads`} tone="var(--chart-6)" />
        <Kpi icon={<Send size={15} />} label="Sent to sales" value={formatNumber(sentToSales)} sub={`${assigned.length} with a recorded handoff`} tone="var(--chart-2)" />
        <Kpi icon={<BadgeCheck size={15} />} label="Converted" value={formatNumber(converted)} sub={`${formatPercent(conversionRate)} conversion rate`} tone="var(--chart-7)" />
        <Kpi icon={<TrendingUp size={15} />} label="Won value" value={formatINRCompact(wonValue)} sub={`${wonHandoffs} won · ${lostHandoffs} lost handoffs`} tone="var(--chart-3)" />
        <Kpi icon={<CalendarClock size={15} />} label="Follow-up rate" value={followTotals.completionRate === null ? '—' : `${Math.round(followTotals.completionRate)}%`} sub={`${followTotals.completed} completed · ${followTotals.overdue} overdue`} tone="var(--chart-5)" />
      </div>

      <div className="lead-attribution__chart-grid">
        <ChartCard title="Source performance" subtitle="Leads and conversions by recorded source" height="md" isEmpty={topSources.length === 0}>
          <BarChart data={topSources} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 0 }}>
            <CartesianGrid {...gridProps} horizontal={false} vertical />
            <XAxis type="number" {...axisProps} allowDecimals={false} />
            <YAxis type="category" dataKey="source" {...axisProps} width={106} tick={{ fill: 'var(--muted)', fontSize: 9.5 }} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="total" name="Leads" radius={[0, 4, 4, 0]} fill="var(--chart-1)" isAnimationActive={chartAnimation} />
            <Bar dataKey="converted" name="Converted" radius={[0, 4, 4, 0]} fill="var(--chart-2)" isAnimationActive={chartAnimation} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Campaign conversion" subtitle="Conversion rate for campaigns with leads" height="md" isEmpty={topCampaigns.length === 0}>
          <BarChart data={topCampaigns.map((row) => ({
            name: row.campaign.name.length > 18 ? `${row.campaign.name.slice(0, 18)}…` : row.campaign.name,
            conversion: Number((row.conversionRate ?? 0).toFixed(1)),
          }))} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 0 }}>
            <CartesianGrid {...gridProps} horizontal={false} vertical />
            <XAxis type="number" {...axisProps} tickFormatter={(value: number) => `${value}%`} />
            <YAxis type="category" dataKey="name" {...axisProps} width={106} tick={{ fill: 'var(--muted)', fontSize: 9.5 }} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value.toFixed(1)}%`} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="conversion" name="Conversion rate" radius={[0, 4, 4, 0]} isAnimationActive={chartAnimation}>
              {topCampaigns.map((row, index) => <Cell key={row.campaign.id} fill={chartColors[index % chartColors.length]} />)}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      <div>
        <div className="lead-attribution__section-head">
          <div>
            <h3>Canonical source categories</h3>
            <p>The seven source categories used by the monthly marketing workflow and dashboard.</p>
          </div>
          <Badge tone="accent">{categoryRows.length} categories</Badge>
        </div>
        <div className="lead-attribution__chart-grid">
          <ChartCard
            title="Category performance"
            subtitle="Attributed leads and conversions by canonical source category"
            height="md"
            isEmpty={categoryRows.length === 0}
          >
            <BarChart data={categoryRows} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 0 }}>
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="source" {...axisProps} width={118} tick={{ fill: 'var(--muted)', fontSize: 9.5 }} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="leads" name="Leads" radius={[0, 4, 4, 0]} fill="var(--chart-1)" isAnimationActive={chartAnimation} />
              <Bar dataKey="converted" name="Converted" radius={[0, 4, 4, 0]} fill="var(--chart-2)" isAnimationActive={chartAnimation} />
            </BarChart>
          </ChartCard>

          <SectionCard
            title="Category attribution"
            subtitle="Qualified and converted outcomes grouped into the canonical categories."
            actions={<Badge tone="neutral">{formatNumber(filtered.length)} leads</Badge>}
          >
            <DataTable
              data={categoryRows}
              columns={categoryColumns}
              rowKey={(row) => row.source}
              searchable={(row) => row.source}
              searchPlaceholder="Search categories…"
              pageSize={7}
              initialSort={{ columnId: 'leads', direction: 'desc' }}
              emptyTitle="No category data in this view"
              emptyDescription="Clear a filter or add a lead with a recorded source category."
              caption="Canonical lead source category attribution"
            />
          </SectionCard>
        </div>
      </div>

      <div className="lead-attribution__grid">
        <SectionCard title="Conversion funnel" subtitle="Calculated from the filtered lead records" actions={<Badge tone="neutral">{formatNumber(filtered.length)} leads</Badge>}>
          <div className="lead-attribution__funnel">
            {funnel.map((stage, index) => {
              const share = safeDivide(stage.value, funnel[0].value) ?? 0
              return (
                <div key={stage.label} className="lead-attribution__funnel-row">
                  <span className="lead-attribution__funnel-label">{stage.label}</span>
                  <span className="lead-attribution__funnel-rail">
                    <span style={{ width: `${Math.max(2, share * 100)}%`, background: chartColors[index % chartColors.length] }} />
                  </span>
                  <strong>{formatNumber(stage.value)}</strong>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title="Sales handoff status" subtitle="Current status reported by the sales team" actions={<Badge tone="accent">{assigned.length} assigned</Badge>}>
          {statusDistribution.length === 0 ? (
            <p className="empty-inline">No leads have been sent to sales in this view.</p>
          ) : (
            <div className="lead-attribution__donut">
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius="54%" outerRadius="82%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={chartAnimation}>
                  {statusDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} />
              </PieChart>
              <PieLegend items={statusDistribution} />
            </div>
          )}
          <div className="lead-attribution__handoff-rate">
            <span>Win rate on closed handoffs</span>
            <strong>{formatPercent(leadConversionRate(wonHandoffs, wonHandoffs + lostHandoffs))}</strong>
          </div>
        </SectionCard>

        <SectionCard title="Follow-up performance" subtitle="Scheduled follow-ups in this filtered view" actions={<Badge tone={followTotals.overdue ? 'danger' : 'success'}>{followTotals.overdue ? `${followTotals.overdue} overdue` : 'On track'}</Badge>}>
          <div className="lead-attribution__followup-grid">
            <div><strong>{followTotals.dueToday}</strong><span>Due today</span></div>
            <div><strong>{followTotals.upcoming}</strong><span>Upcoming</span></div>
            <div><strong className={followTotals.overdue ? 'danger-text' : ''}>{followTotals.overdue}</strong><span>Overdue</span></div>
            <div><strong>{followTotals.completed}</strong><span>Completed</span></div>
          </div>
          <div className="lead-attribution__methods">
            {methodBreakdown.map((row) => (
              <div key={row.method} className="bar-track">
                <span className="bar-track__label">{row.method}</span>
                <span className="bar-track__rail"><span className="bar-track__fill" style={{ width: `${safeDivide(row.completed, row.total) ? (row.completed / row.total) * 100 : 0}%` }} /></span>
                <span className="bar-track__value">{row.completed}/{row.total}</span>
              </div>
            ))}
            {methodBreakdown.length === 0 ? <p className="empty-inline">No follow-ups recorded.</p> : null}
          </div>
          <p className="text-xs muted"><CircleAlert size={12} /> Completion rate counts recorded follow-ups only. Reminders are not sent.</p>
        </SectionCard>
      </div>

      <div>
        <div className="lead-attribution__section-head">
          <div>
            <h3>Source attribution</h3>
            <p>Every metric below uses the filtered lead records, not sample marketing benchmarks.</p>
          </div>
          <Badge tone="neutral">{sources.length} sources</Badge>
        </div>
        <DataTable
          data={sources}
          columns={sourceColumns}
          rowKey={(row) => row.source}
          searchable={(row) => row.source}
          searchPlaceholder="Search sources…"
          pageSize={8}
          initialSort={{ columnId: 'total', direction: 'desc' }}
          emptyTitle="No source data in this view"
          emptyDescription="Clear a filter or add a lead with a recorded source."
          caption="Lead source attribution"
        />
      </div>

      <div>
        <div className="lead-attribution__section-head">
          <div>
            <h3>Campaign attribution</h3>
            <p>Lead, follow-up, handoff and conversion outcomes linked to each campaign.</p>
          </div>
          <Badge tone="neutral">{campaignRows.filter((row) => row.leads > 0).length} active in view</Badge>
        </div>
        <DataTable
          data={campaignRows}
          columns={campaignColumns}
          rowKey={(row) => row.campaign.id}
          searchable={(row) => `${row.campaign.name} ${row.campaign.channel} ${row.campaign.status}`}
          searchPlaceholder="Search campaigns…"
          pageSize={8}
          initialSort={{ columnId: 'leads', direction: 'desc' }}
          emptyTitle="No campaign attribution in this view"
          emptyDescription="Campaigns without leads in the filtered period are still listed with zero values."
          caption="Campaign attribution"
        />
      </div>

      <div className="lead-attribution__grid lead-attribution__grid--two">
        <SectionCard title="Sales assignment performance" subtitle="Handoffs by existing sales employee" actions={<Badge tone="neutral">{repRows.filter((row) => row.total > 0).length} active</Badge>}>
          <div className="table-wrap">
            <table className="table table--compact">
              <caption className="sr-only">Sales assignment performance</caption>
              <thead>
                <tr><th scope="col">Sales employee</th><th scope="col" style={{ textAlign: 'right' }}>Assigned</th><th scope="col" style={{ textAlign: 'right' }}>Open</th><th scope="col" style={{ textAlign: 'right' }}>Won</th><th scope="col" style={{ textAlign: 'right' }}>Lost</th><th scope="col" style={{ textAlign: 'right' }}>Win rate</th></tr>
              </thead>
              <tbody>
                {repRows.map((row) => (
                  <tr key={row.rep.id}>
                    <td>
                      <p className="cell-primary">{row.rep.name}</p>
                      <p className="text-xs muted">{row.rep.region}</p>
                    </td>
                    <td style={{ textAlign: 'right' }}>{row.total}</td>
                    <td style={{ textAlign: 'right' }}>{row.active}</td>
                    <td style={{ textAlign: 'right' }} className="success-text">{row.won}</td>
                    <td style={{ textAlign: 'right' }} className={row.lost ? 'danger-text' : ''}>{row.lost}</td>
                    <td style={{ textAlign: 'right' }}>{formatPercent(row.winRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Conversion by marketing owner" subtitle="Which employees are advancing and converting their leads" actions={<Badge tone="neutral">{employeeRows.length} owners</Badge>}>
          <div className="table-wrap">
            <table className="table table--compact">
              <caption className="sr-only">Conversion by marketing owner</caption>
              <thead>
                <tr><th scope="col">Owner</th><th scope="col" style={{ textAlign: 'right' }}>Leads</th><th scope="col" style={{ textAlign: 'right' }}>Qualified</th><th scope="col" style={{ textAlign: 'right' }}>Converted</th><th scope="col" style={{ textAlign: 'right' }}>Rate</th></tr>
              </thead>
              <tbody>
                {employeeRows.map((row) => (
                  <tr key={row.owner}>
                    <td className="cell-primary">{row.owner}</td>
                    <td style={{ textAlign: 'right' }}>{row.total}</td>
                    <td style={{ textAlign: 'right' }}>{row.qualified}</td>
                    <td style={{ textAlign: 'right' }}>{row.converted}</td>
                    <td style={{ textAlign: 'right' }}>{formatPercent(leadConversionRate(row.converted, row.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recent handoffs" subtitle="Open a lead to update the sales handoff status" actions={<Badge tone="accent">{assigned.length}</Badge>}>
        {assigned.length === 0 ? (
          <p className="empty-inline">No leads have been sent to sales in this view.</p>
        ) : (
          <div className="stack-6">
            {[...assigned]
              .sort((a, b) => new Date(b.salesAssignment?.assignedAt ?? 0).getTime() - new Date(a.salesAssignment?.assignedAt ?? 0).getTime())
              .slice(0, 6)
              .map((lead) => {
                const rep = salesReps.find((item) => item.id === lead.salesAssignment?.salesRepId)
                return (
                  <button key={lead.id} type="button" className="lead-dashboard__row" onClick={() => onOpenLead(lead.id)}>
                    <span className="lead-activity-feed__icon" aria-hidden="true"><Send size={13} /></span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="lead-dashboard__row-title truncate">{lead.name} · {lead.company || 'No company'}</span>
                      <span className="lead-dashboard__row-meta truncate">{rep?.name ?? 'Sales employee unavailable'} · {lead.salesAssignment?.nextAction || 'No next action recorded'}</span>
                    </span>
                    <Badge tone={lead.salesAssignment?.salesStatus === 'Won' ? 'success' : lead.salesAssignment?.salesStatus === 'Lost' ? 'danger' : 'accent'}>
                      {lead.salesAssignment?.salesStatus}
                    </Badge>
                  </button>
                )
              })}
          </div>
        )}
      </SectionCard>

      <div className="callout callout--info">
        <CheckCircle2 size={14} />
        <span>
          Attributed revenue uses won opportunities in the local demo records. It is not audited financial data and no external advertising or CRM platform is connected.
        </span>
      </div>
      <p className="text-xs muted">
        <Target size={12} /> {formatINR(wonValue)} in won value across {wonHandoffs} won handoffs. Win rate on closed handoffs uses won ÷ (won + lost).
      </p>
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  tone: string
}) {
  return (
    <div className="lead-attribution__kpi" style={{ '--lead-kpi-tone': tone } as React.CSSProperties}>
      <span className="lead-attribution__kpi-icon">{icon}</span>
      <span className="lead-attribution__kpi-label">{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  )
}
