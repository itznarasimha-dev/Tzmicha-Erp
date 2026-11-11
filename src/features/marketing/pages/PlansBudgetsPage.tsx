import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarRange,
  Download,
  Gauge,
  Layers3,
  PiggyBank,
  Plus,
  TrendingUp,
  Wallet,
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
import { useDemoData } from '../context/DemoDataContext'
import { useToast } from '../context/ToastContext'
import { runMarketingApiAction, marketingApi } from '../api-actions'
import type { Plan, PlanStatus, PlanType } from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { SectionCard } from '../components/ui/SectionCard'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { ProgressBar, utilisationTone } from '../components/ui/ProgressBar'
import {
  ChartCard,
  ChartTooltip,
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
  MetricCard,
  MetricGrid,
  TabIntro,
} from '../components/marketing/ModuleKit'
import { planTotals } from '../utils/analytics'
import { budgetSeries } from '../data/marketing/dashboard'
import { downloadCsv } from '../utils/csv'
import { daysBetween } from '../utils/dates'
import { formatDate, formatINR, formatINRCompact, formatPercent, uid } from '../utils/format'

const PLAN_TYPES: PlanType[] = ['Annual', 'Quarterly', 'Campaign']
const PLAN_STATUSES: PlanStatus[] = ['Draft', 'In Review', 'Approved', 'Active', 'Closed']

type PlanFormValues = {
  title: string
  type: PlanType
  year: string
  quarter: string
  goal: string
  budget: string
  owner: string
  status: PlanStatus
  notes: string
}

function blankPlanForm(type: PlanType = 'Annual'): PlanFormValues {
  return {
    title: '',
    type,
    year: '2026',
    quarter: type === 'Quarterly' ? '3' : '',
    goal: '',
    budget: '',
    owner: 'Ananya Rao',
    status: 'Draft',
    notes: '',
  }
}

export function PlansBudgetsPage({ tab }: { tab: string }) {
  const { data, update, addNotification, dataSource, refreshFromApi } = useDemoData()
  const { pushToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const chartAnim = useChartAnimation()
  const [formOpen, setFormOpen] = useState(false)
  const [formType, setFormType] = useState<PlanType>('Annual')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setFormType(tab === 'quarterly-plans' ? 'Quarterly' : tab === 'campaign-budgets' ? 'Campaign' : 'Annual')
      setFormOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, tab])

  const totals = useMemo(() => planTotals(data.plans), [data.plans])
  const annual = data.plans.filter((plan) => plan.type === 'Annual')
  const quarterly = data.plans.filter((plan) => plan.type === 'Quarterly')
  const campaignPlans = data.plans.filter((plan) => plan.type === 'Campaign')
  const active = data.plans.filter((plan) => plan.status === 'Active')
  const pending = data.plans.filter((plan) => plan.status === 'In Review')
  const detail = data.plans.find((plan) => plan.id === detailId) ?? null

  const filteredPlans = data.plans.filter((plan) => {
    if (typeFilter !== 'All' && plan.type !== typeFilter) return false
    if (statusFilter !== 'All' && plan.status !== statusFilter) return false
    return true
  })

  const openCreate = (type: PlanType) => {
    setFormType(type)
    setFormOpen(true)
  }

  const createPlan = async (values: PlanFormValues) => {
    if (dataSource === 'api') {
      await runMarketingApiAction({ dataSource, refreshFromApi, pushToast }, {
        action: () => marketingApi.createPlan({
          title: values.title.trim(),
          month: `${values.year}-${values.type === 'Quarterly' ? String(values.quarter).padStart(2, '0') : '01'}`,
          objective: values.goal.trim(),
          estimatedBudget: Math.round(Number(values.budget) || 0),
          supportingNotes: values.notes.trim() || undefined,
        }),
        successTitle: 'Plan created',
        successDescription: `${values.title.trim()} has been created in the ERP.`,
        errorTitle: 'Could not create plan',
        refresh: true,
      })
      setFormOpen(false)
      return
    }

    const newPlan: Plan = {
      id: uid('PLN'),
      title: values.title.trim(),
      type: values.type,
      year: Number(values.year) || 2026,
      quarter: values.type === 'Quarterly' && values.quarter ? (Number(values.quarter) as 1 | 2 | 3 | 4) : undefined,
      goal: values.goal.trim(),
      budget: Math.round(Number(values.budget) || 0),
      spent: 0,
      status: values.status,
      owner: values.owner.trim() || 'Ananya Rao',
      campaignId: null,
      createdAt: new Date().toISOString(),
      notes: values.notes.trim(),
    }
    update('plans', (current) => [newPlan, ...current])
    addNotification({
      title: 'Demo plan created',
      body: `${newPlan.title} was added to local demo plans. No approval workflow was triggered.`,
      kind: 'budget',
      href: '/marketing/plans/annual-plans',
    })
    pushToast({
      title: 'Plan added to demo data',
      description: `${newPlan.title} is stored in this browser only and starts at zero spend.`,
      tone: 'success',
    })
    setFormOpen(false)
  }

  const PLAN_STATUS_TO_ACTION: Record<PlanStatus, 'submit' | 'approve' | 'reject' | 'request-changes' | 'start' | 'submit-results' | 'complete'> = {
    Draft: 'submit',
    'In Review': 'approve',
    Approved: 'start',
    Active: 'complete',
    Closed: 'complete',
  }

  const updatePlanStatus = async (plan: Plan, status: PlanStatus) => {
    if (dataSource === 'api') {
      const action = PLAN_STATUS_TO_ACTION[status]
      await runMarketingApiAction({ dataSource, refreshFromApi, pushToast }, {
        action: () => {
          switch (action) {
            case 'submit': return marketingApi.submitPlan(plan.id)
            case 'approve': return marketingApi.approvePlan(plan.id)
            case 'reject': return marketingApi.rejectPlan(plan.id, 'Status changed via plan detail view.')
            case 'request-changes': return marketingApi.requestPlanChanges(plan.id, 'Status changed via plan detail view.')
            case 'start': return marketingApi.startPlan(plan.id)
            case 'submit-results': return marketingApi.submitPlanResults(plan.id)
            case 'complete': return marketingApi.completePlan(plan.id)
          }
        },
        successTitle: 'Plan status updated',
        successDescription: `${plan.title} is now ${status}.`,
        errorTitle: `Could not ${action} plan`,
        refresh: true,
      })
      return
    }
    update('plans', (current) => current.map((item) => (item.id === plan.id ? { ...item, status } : item)))
    pushToast({
      title: 'Plan status updated (demo)',
      description: `${plan.title} is now ${status}. Demo data is not saved to the database.`,
      tone: 'success',
    })
  }

  const exportPlans = (rows: Plan[], label = 'plans') => {
    const result = downloadCsv(`marketing-${label}-demo`, [
      { header: 'Plan ID', value: (plan: Plan) => plan.id },
      { header: 'Title', value: (plan: Plan) => plan.title },
      { header: 'Type', value: (plan: Plan) => plan.type },
      { header: 'Year', value: (plan: Plan) => plan.year },
      { header: 'Quarter', value: (plan: Plan) => plan.quarter ?? '' },
      { header: 'Goal', value: (plan: Plan) => plan.goal },
      { header: 'Budget', value: (plan: Plan) => plan.budget },
      { header: 'Spent', value: (plan: Plan) => plan.spent },
      { header: 'Status', value: (plan: Plan) => plan.status },
      { header: 'Owner', value: (plan: Plan) => plan.owner },
    ], rows)
    pushToast({
      title: result.ok ? 'CSV exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  const planColumns: DataTableColumn<Plan>[] = [
    {
      id: 'title',
      header: 'Plan',
      sortValue: (plan) => plan.title,
      mobileLabel: 'Plan',
      render: (plan) => (
        <div>
          <p className="cell-primary">{plan.title}</p>
          <p className="text-xs muted">
            {plan.type}
            {plan.quarter ? ` · Q${plan.quarter}` : ''} · FY {plan.year}
          </p>
        </div>
      ),
    },
    { id: 'owner', header: 'Owner', sortValue: (plan) => plan.owner, mobileLabel: 'Owner', hideMobile: true, render: (plan) => <span className="text-xs">{plan.owner}</span> },
    { id: 'budget', header: 'Budget', align: 'right', sortValue: (plan) => plan.budget, mobileLabel: 'Budget', render: (plan) => <span className="cell-strong">{formatINRCompact(plan.budget)}</span> },
    { id: 'spent', header: 'Spent', align: 'right', sortValue: (plan) => plan.spent, mobileLabel: 'Spent', render: (plan) => formatINRCompact(plan.spent) },
    {
      id: 'utilisation',
      header: 'Utilisation',
      align: 'right',
      sortValue: (plan) => (plan.budget > 0 ? plan.spent / plan.budget : 0),
      mobileLabel: 'Utilisation',
      render: (plan) => {
        const value = plan.budget > 0 ? (plan.spent / plan.budget) * 100 : 0
        return (
          <div style={{ minWidth: 92 }}>
            <span className="text-xs font-semibold">{formatPercent(value, 0)}</span>
            <ProgressBar value={value} tone={utilisationTone(value)} size="sm" />
          </div>
        )
      },
    },
    { id: 'status', header: 'Status', sortValue: (plan) => plan.status, mobileLabel: 'Status', render: (plan) => <StatusBadge status={plan.status} /> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      mobileLabel: 'Actions',
      render: (plan) => (
        <Button variant="ghost" size="xs" onClick={() => setDetailId(plan.id)}>
          Open
        </Button>
      ),
    },
  ]

  const planStatusData = PLAN_STATUSES.map((status) => ({
    name: status,
    value: data.plans.filter((plan) => plan.status === status).length,
  })).filter((item) => item.value > 0)

  const topPlans = [...data.plans].filter((plan) => plan.budget > 0).sort((a, b) => b.budget - a.budget).slice(0, 6)

  const planFormModal = formOpen ? (
    <PlanFormModal
      open
      initialType={formType}
      onClose={() => setFormOpen(false)}
      onSave={createPlan}
      campaigns={data.campaigns}
    />
  ) : null

  const detailModal = detail ? (
    <PlanDetailModal
      plan={detail}
      onClose={() => setDetailId(null)}
      onStatusChange={(status) => updatePlanStatus(detail, status)}
    />
  ) : null

  const exportButton = (rows: Plan[], label?: string) => (
    <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportPlans(rows, label)}>
      Export CSV
    </Button>
  )

  if (tab === 'overview') {
    return (
      <div className="stack-20">
        <TabIntro
          title="Plans and budget overview"
          description="Build annual, quarterly and campaign plans, then watch utilisation against local demo spend. Nothing here is posted to a finance system."
          actions={
            <>
              {exportButton(data.plans, 'plans')}
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => openCreate('Annual')}>
                New plan
              </Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Approved plan budget" value={formatINRCompact(totals.budget)} sub={`${data.plans.length} plans across all types`} icon={<Wallet size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Recorded spend" value={formatINRCompact(totals.spent)} sub={`${formatPercent(totals.utilisation, 0)} of plan budget`} icon={<PiggyBank size={15} />} tone="var(--chart-3)" progress={totals.utilisation ?? 0} />
          <MetricCard label="Remaining budget" value={formatINRCompact(totals.remaining)} sub="Plan budget minus recorded spend" icon={<Gauge size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Awaiting review" value={pending.length} sub={`${active.length} plans currently active`} icon={<CalendarRange size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard
            title="Largest plans by budget"
            subtitle="Planned budget against recorded spend · demo data"
            height="md"
            legend={<><LegendItem color="var(--chart-1)" label="Budget" /><LegendItem color="var(--chart-3)" label="Spent" /></>}
            isEmpty={topPlans.length === 0}
          >
            <BarChart data={topPlans.map((plan) => ({ name: plan.title.length > 22 ? `${plan.title.slice(0, 22)}…` : plan.title, budget: plan.budget, spent: plan.spent }))} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }} barGap={2}>
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" {...axisProps} tickFormatter={(value: number) => formatINRCompact(value)} />
              <YAxis type="category" dataKey="name" {...axisProps} width={116} tick={{ fill: 'var(--muted)', fontSize: 9 }} />
              <Tooltip content={<ChartTooltip valueFormatter={formatINR} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="budget" name="Budget" fill="var(--chart-1)" opacity={0.45} radius={[0, 4, 4, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="spent" name="Spent" fill="var(--chart-3)" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>

          <section className="card chart-card">
            <div className="chart-card__head">
              <div>
                <h2 className="chart-card__title">Plan status mix</h2>
                <p className="chart-card__subtitle">Local workflow states across {data.plans.length} plans</p>
              </div>
            </div>
            <div className="chart-wrap" style={{ height: 215 }}>
              {planStatusData.length ? (
                <PieChart>
                  <Pie data={planStatusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3} stroke="var(--surface)" strokeWidth={2} isAnimationActive={chartAnim}>
                    {planStatusData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} plans`} />} />
                </PieChart>
              ) : (
                <div className="chart-empty">No plans are available.</div>
              )}
            </div>
            <PieLegend items={planStatusData.map((entry, index) => ({ name: entry.name, value: entry.value, color: chartColors[index % chartColors.length], display: `${entry.value}` }))} />
          </section>
        </div>

        <SectionCard
          title="Plan register"
          subtitle="Search across every annual, quarterly and campaign plan."
          actions={<Badge tone="neutral">{filteredPlans.length} visible</Badge>}
        >
          <DataTable
            data={filteredPlans}
            columns={planColumns}
            rowKey={(plan) => plan.id}
            searchable={(plan) => `${plan.title} ${plan.goal} ${plan.owner} ${plan.type} ${plan.status}`}
            searchPlaceholder="Search plans, goals or owners…"
            pageSize={7}
            initialSort={{ columnId: 'budget', direction: 'desc' }}
            filters={
              <>
                <select className="select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by plan type">
                  <option value="All">All types</option>
                  {PLAN_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
                <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by plan status">
                  <option value="All">All statuses</option>
                  {PLAN_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </>
            }
            onRowClick={(plan) => setDetailId(plan.id)}
            caption="Marketing plans"
          />
        </SectionCard>

        <DemoNote>
          Budgets, spend and approval states are local sample records. Creating a plan does not trigger any real finance, ERP or approval workflow.
        </DemoNote>
        {planFormModal}
        {detailModal}
      </div>
    )
  }

  if (tab === 'annual-plans' || tab === 'quarterly-plans') {
    const isAnnual = tab === 'annual-plans'
    const rows = isAnnual ? annual : quarterly
    const type: PlanType = isAnnual ? 'Annual' : 'Quarterly'
    const sectionTotal = planTotals(rows)
    return (
      <div className="stack-16">
        <TabIntro
          title={isAnnual ? 'Annual marketing plans' : 'Quarterly marketing plans'}
          description={
            isAnnual
              ? 'The long-range plan that anchors annual budget, goals and ownership. Only one annual plan is normally active at a time in this demo.'
              : 'Quarterly plans break annual goals into seasonal programmes, campaign budgets and measurable targets.'
          }
          actions={
            <>
              {exportButton(rows, isAnnual ? 'annual-plans' : 'quarterly-plans')}
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => openCreate(type)}>
                New {isAnnual ? 'annual' : 'quarterly'} plan
              </Button>
            </>
          }
        />
        <MetricGrid columns={3}>
          <MetricCard label="Plans" value={rows.length} sub={isAnnual ? 'Annual planning records' : 'Quarterly planning records'} icon={<Layers3 size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Budget" value={formatINRCompact(sectionTotal.budget)} sub="Combined across visible plans" icon={<Wallet size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Utilisation" value={formatPercent(sectionTotal.utilisation, 0)} sub={`${formatINRCompact(sectionTotal.spent)} recorded spend`} icon={<Gauge size={15} />} tone="var(--chart-3)" progress={sectionTotal.utilisation ?? 0} />
        </MetricGrid>

        <div className="entity-grid entity-grid--2">
          {rows.map((plan) => {
            const utilisation = plan.budget > 0 ? (plan.spent / plan.budget) * 100 : 0
            return (
              <article className="card card--pad" key={plan.id}>
                <div className="between" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs faint">{plan.id} · FY {plan.year}{plan.quarter ? ` · Q${plan.quarter}` : ''}</p>
                    <h3 style={{ marginTop: 3, fontSize: '0.92rem' }}>{plan.title}</h3>
                  </div>
                  <StatusBadge status={plan.status} />
                </div>
                <p className="text-sm muted" style={{ marginTop: 7 }}>{plan.goal}</p>
                <div className="mini-stats" style={{ marginTop: 12 }}>
                  <div className="mini-stat"><p className="mini-stat__label">Budget</p><p className="mini-stat__value">{formatINRCompact(plan.budget)}</p></div>
                  <div className="mini-stat"><p className="mini-stat__label">Spent</p><p className="mini-stat__value">{formatINRCompact(plan.spent)}</p></div>
                  <div className="mini-stat"><p className="mini-stat__label">Owner</p><p className="mini-stat__value" style={{ fontSize: '0.78rem' }}>{plan.owner}</p></div>
                </div>
                <ProgressBar value={utilisation} tone={utilisationTone(utilisation)} size="sm" className="mt-12" />
                <div className="between mt-8">
                  <span className="text-xs muted">{formatPercent(utilisation, 0)} utilised</span>
                  <Button variant="ghost" size="xs" onClick={() => setDetailId(plan.id)}>View plan</Button>
                </div>
              </article>
            )
          })}
        </div>

        {rows.length === 0 ? <p className="empty-inline">No plans of this type yet. Create one to populate the local demo.</p> : null}
        <DataNote>Annual and quarterly plan records are demo planning artefacts. They are not accounting entries and do not lock budgets in any finance system.</DataNote>
        {planFormModal}
        {detailModal}
      </div>
    )
  }

  if (tab === 'campaign-budgets') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Campaign budgets"
          description="Every active, planned and completed campaign with its approved demo budget and recorded spend. Use this view to spot over- or under-investment."
          actions={
            <>
              <Button
                variant="ghost"
                icon={<Download size={14} />}
                onClick={() => {
                  const result = downloadCsv('marketing-campaign-budgets-demo', [
                    { header: 'Campaign', value: (campaign: (typeof data.campaigns)[number]) => campaign.name },
                    { header: 'Channel', value: (campaign: (typeof data.campaigns)[number]) => campaign.channel },
                    { header: 'Owner', value: (campaign: (typeof data.campaigns)[number]) => campaign.owner },
                    { header: 'Budget', value: (campaign: (typeof data.campaigns)[number]) => campaign.budget },
                    { header: 'Spend', value: (campaign: (typeof data.campaigns)[number]) => campaign.spend },
                    { header: 'Status', value: (campaign: (typeof data.campaigns)[number]) => campaign.status },
                  ], data.campaigns)
                  pushToast({ title: result.ok ? 'Campaign budgets exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
                }}
              >
                Export CSV
              </Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => openCreate('Campaign')}>
                New campaign plan
              </Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Campaign budget" value={formatINRCompact(data.campaigns.reduce((sum, campaign) => sum + campaign.budget, 0))} sub={`${data.campaigns.length} demo campaigns`} icon={<Wallet size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Campaign spend" value={formatINRCompact(data.campaigns.reduce((sum, campaign) => sum + campaign.spend, 0))} sub="Reported by campaign records" icon={<PiggyBank size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Budget remaining" value={formatINRCompact(data.campaigns.reduce((sum, campaign) => sum + Math.max(0, campaign.budget - campaign.spend), 0))} sub="Across campaigns not over budget" icon={<Gauge size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Over budget" value={data.campaigns.filter((campaign) => campaign.spend > campaign.budget).length} sub="Requires review in this demo" icon={<AlertTriangle size={15} />} tone="var(--chart-4)" />
        </MetricGrid>
        <SectionCard title="Campaign budget register" subtitle="Approved budget and reported spend by campaign.">
          <DataTable
            data={data.campaigns}
            columns={[
              { id: 'campaign', header: 'Campaign', sortValue: (campaign) => campaign.name, mobileLabel: 'Campaign', render: (campaign) => <div><p className="cell-primary">{campaign.name}</p><p className="text-xs muted">{campaign.channel} · {campaign.status}</p></div> },
              { id: 'owner', header: 'Owner', sortValue: (campaign) => campaign.owner, mobileLabel: 'Owner', hideMobile: true, render: (campaign) => <span className="text-xs">{campaign.owner}</span> },
              { id: 'budget', header: 'Budget', align: 'right', sortValue: (campaign) => campaign.budget, mobileLabel: 'Budget', render: (campaign) => <span className="cell-strong">{formatINRCompact(campaign.budget)}</span> },
              { id: 'spend', header: 'Spend', align: 'right', sortValue: (campaign) => campaign.spend, mobileLabel: 'Spend', render: (campaign) => formatINRCompact(campaign.spend) },
              {
                id: 'utilisation', header: 'Utilisation', align: 'right', mobileLabel: 'Utilisation',
                sortValue: (campaign) => (campaign.budget > 0 ? campaign.spend / campaign.budget : 0),
                render: (campaign) => {
                  const value = campaign.budget > 0 ? (campaign.spend / campaign.budget) * 100 : 0
                  return <div style={{ minWidth: 92 }}><span className="text-xs font-semibold">{formatPercent(value, 0)}</span><ProgressBar value={value} tone={utilisationTone(value)} size="sm" /></div>
                },
              },
              { id: 'roi', header: 'ROI', align: 'right', sortValue: (campaign) => (campaign.spend > 0 ? (campaign.kpis.revenue - campaign.spend) / campaign.spend : -1), mobileLabel: 'ROI', render: (campaign) => campaign.spend > 0 ? <span className="text-xs">{formatPercent(((campaign.kpis.revenue - campaign.spend) / campaign.spend) * 100)}</span> : <span className="muted">—</span> },
            ]}
            rowKey={(campaign) => campaign.id}
            searchable={(campaign) => `${campaign.name} ${campaign.channel} ${campaign.product} ${campaign.owner}`}
            searchPlaceholder="Search campaigns…"
            pageSize={8}
            initialSort={{ columnId: 'budget', direction: 'desc' }}
            caption="Campaign budgets"
          />
        </SectionCard>
        <div className="grid-3">
          {campaignPlans.map((plan) => (
            <div className="soft-tile" key={plan.id}>
              <p className="soft-tile__label">Campaign plan</p>
              <p className="soft-tile__value" style={{ fontSize: '0.78rem' }}>{plan.title}</p>
              <p className="text-xs muted mt-4">{formatINRCompact(plan.budget)} · {plan.status}</p>
            </div>
          ))}
        </div>
        <DemoNote>
          Campaign budgets are illustrative planning figures. This portal does not reserve funds, create purchase orders or post to any ERP.
        </DemoNote>
        {planFormModal}
        {detailModal}
      </div>
    )
  }

  if (tab === 'budget-tracking') {
    const rows = [...data.campaigns].filter((campaign) => campaign.budget > 0).sort((a, b) => (b.spend / b.budget) - (a.spend / a.budget))
    const over = rows.filter((campaign) => campaign.spend > campaign.budget)
    const watch = rows.filter((campaign) => campaign.spend / campaign.budget >= 0.85 && campaign.spend <= campaign.budget)
    return (
      <div className="stack-16">
        <TabIntro
          title="Budget tracking"
          description="Utilisation is calculated locally as recorded spend ÷ approved budget. Amber begins at 85%; red marks an overrun."
          actions={exportButton(data.plans, 'budget-tracking')}
        />
        <MetricGrid>
          <MetricCard label="Campaigns tracked" value={rows.length} sub="With a budget above zero" icon={<Gauge size={15} />} tone="var(--chart-1)" />
          <MetricCard label="At or above 85%" value={watch.length} sub="Watch list · no automatic alerts" icon={<AlertTriangle size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Over budget" value={over.length} sub={over.length ? 'Requires local review' : 'No overruns in demo data'} icon={<TrendingUp size={15} />} tone="var(--chart-4)" />
          <MetricCard label="Remaining" value={formatINRCompact(rows.reduce((sum, campaign) => sum + Math.max(0, campaign.budget - campaign.spend), 0))} sub="Across tracked campaigns" icon={<Wallet size={15} />} tone="var(--chart-2)" />
        </MetricGrid>
        <SectionCard title="Utilisation watch list" subtitle="Sorted by the highest utilisation first.">
          <div className="stack-14">
            {rows.map((campaign) => {
              const utilisation = (campaign.spend / campaign.budget) * 100
              return (
                <div key={campaign.id}>
                  <div className="between" style={{ gap: 10, alignItems: 'flex-end', marginBottom: 4 }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{campaign.name}</p>
                      <p className="text-xs muted">{campaign.status} · {formatINRCompact(campaign.spend)} of {formatINRCompact(campaign.budget)}</p>
                    </div>
                    <div className="row-8">
                      {utilisation > 100 ? <Badge tone="danger">Over</Badge> : utilisation >= 85 ? <Badge tone="warning">Watch</Badge> : <Badge tone="success">Healthy</Badge>}
                      <span className="text-xs font-semibold">{formatPercent(utilisation, 0)}</span>
                    </div>
                  </div>
                  <ProgressBar value={utilisation} tone={utilisationTone(utilisation)} size="sm" />
                </div>
              )
            })}
          </div>
        </SectionCard>
        <DataNote>No budget alerts are emailed or pushed. Refresh after adding demo expenses to see the local utilisation recalculate.</DataNote>
        {planFormModal}
        {detailModal}
      </div>
    )
  }

  if (tab === 'forecast-vs-actual') {
    const campaignRows = [...data.campaigns].filter((campaign) => campaign.budget > 0)
    return (
      <div className="stack-16">
        <TabIntro
          title="Forecast vs actual"
          description="Compare the sample monthly plan with actual spend and review campaign-level remaining budgets. Forecasts are simple straight-line estimates, not predictive models."
          actions={exportButton(data.plans, 'forecast-vs-actual')}
        />
        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard
            title="Monthly planned vs actual spend"
            subtitle="Illustrative budget series · demo data"
            height="md"
            legend={<><LegendItem color="var(--chart-1)" label="Planned" /><LegendItem color="var(--chart-3)" label="Actual" /></>}
            isEmpty={budgetSeries.length === 0}
          >
            <BarChart data={budgetSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} width={44} tickFormatter={(value: number) => formatINRCompact(value)} />
              <Tooltip content={<ChartTooltip valueFormatter={formatINR} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="planned" name="Planned" fill="var(--chart-1)" opacity={0.45} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="actual" name="Actual" fill="var(--chart-3)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
          <SectionCard title="Forecast signals" subtitle="Derived from the sample monthly series">
            <div className="mini-stats">
              <div className="mini-stat"><p className="mini-stat__label">Planned (6 mo)</p><p className="mini-stat__value">{formatINRCompact(budgetSeries.reduce((sum, point) => sum + point.planned, 0))}</p></div>
              <div className="mini-stat"><p className="mini-stat__label">Actual (6 mo)</p><p className="mini-stat__value">{formatINRCompact(budgetSeries.reduce((sum, point) => sum + point.actual, 0))}</p></div>
              <div className="mini-stat"><p className="mini-stat__label">Variance</p><p className="mini-stat__value">{formatPercent(((budgetSeries.reduce((sum, point) => sum + point.actual, 0) - budgetSeries.reduce((sum, point) => sum + point.planned, 0)) / Math.max(1, budgetSeries.reduce((sum, point) => sum + point.planned, 0))) * 100)}</p></div>
            </div>
            <div className="callout callout--info mt-12">
              <AlertTriangle size={14} />
              <span>These are illustrative allocations from the demo dashboard series, not an approved forecast. No finance system is queried.</span>
            </div>
            <div className="mt-12">
              <p className="detail-label">Simple runway view</p>
              {campaignRows.slice(0, 5).map((campaign) => {
                const elapsed = Math.max(1, daysBetween(campaign.startDate, new Date()))
                const total = Math.max(1, daysBetween(campaign.startDate, campaign.endDate))
                const burn = campaign.spend / elapsed
                const projected = Math.round(burn * total)
                return (
                  <div className="bar-track" key={campaign.id} style={{ marginTop: 8 }}>
                    <span className="bar-track__label" title={campaign.name}>{campaign.name}</span>
                    <span className="bar-track__rail"><span className="bar-track__fill" style={{ width: `${Math.min(100, (projected / Math.max(1, campaign.budget)) * 100)}%`, background: projected > campaign.budget ? 'var(--danger)' : 'var(--chart-2)' }} /></span>
                    <span className="bar-track__value">{formatINRCompact(projected)}</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
        <SectionCard title="Campaign forecast detail" subtitle="Straight-line spend projection based on elapsed campaign days.">
          <DataTable
            data={campaignRows}
            columns={[
              { id: 'campaign', header: 'Campaign', sortValue: (campaign) => campaign.name, mobileLabel: 'Campaign', render: (campaign) => <span className="cell-primary">{campaign.name}</span> },
              { id: 'dates', header: 'Window', sortValue: (campaign) => campaign.startDate, mobileLabel: 'Window', hideMobile: true, render: (campaign) => <span className="text-xs">{formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</span> },
              { id: 'budget', header: 'Budget', align: 'right', sortValue: (campaign) => campaign.budget, mobileLabel: 'Budget', render: (campaign) => <span className="cell-strong">{formatINRCompact(campaign.budget)}</span> },
              { id: 'spend', header: 'Actual', align: 'right', sortValue: (campaign) => campaign.spend, mobileLabel: 'Actual', render: (campaign) => formatINRCompact(campaign.spend) },
              {
                id: 'projected', header: 'Projected', align: 'right', mobileLabel: 'Projected',
                sortValue: (campaign) => Math.round((campaign.spend / Math.max(1, daysBetween(campaign.startDate, new Date()))) * Math.max(1, daysBetween(campaign.startDate, campaign.endDate))),
                render: (campaign) => {
                  const projected = Math.round((campaign.spend / Math.max(1, daysBetween(campaign.startDate, new Date()))) * Math.max(1, daysBetween(campaign.startDate, campaign.endDate)))
                  return <span className={projected > campaign.budget ? 'danger-text' : ''}>{formatINRCompact(projected)}</span>
                },
              },
              {
                id: 'risk', header: 'Signal', mobileLabel: 'Signal', sortValue: (campaign) => (campaign.spend / Math.max(1, daysBetween(campaign.startDate, new Date()))) * Math.max(1, daysBetween(campaign.startDate, campaign.endDate)) > campaign.budget ? 1 : 0,
                render: (campaign) => {
                  const projected = (campaign.spend / Math.max(1, daysBetween(campaign.startDate, new Date()))) * Math.max(1, daysBetween(campaign.startDate, campaign.endDate))
                  return projected > campaign.budget ? <Badge tone="danger">Potential overrun</Badge> : <Badge tone="success">Within budget</Badge>
                },
              },
            ]}
            rowKey={(campaign) => campaign.id}
            searchable={(campaign) => `${campaign.name} ${campaign.channel}`}
            searchPlaceholder="Search campaigns…"
            pageSize={8}
            caption="Campaign forecast"
          />
        </SectionCard>
        <DataNote>Projection formula: current spend ÷ elapsed days × total campaign days. It is a simple demo estimate and can be misleading for paused or uneven campaigns.</DataNote>
        {planFormModal}
        {detailModal}
      </div>
    )
  }

  return null
}

function PlanFormModal({
  open,
  initialType,
  onClose,
  onSave,
  campaigns,
}: {
  open: boolean
  initialType: PlanType
  onClose: () => void
  onSave: (values: PlanFormValues) => void
  campaigns: { id: string; name: string }[]
}) {
  const [values, setValues] = useState<PlanFormValues>(() => blankPlanForm(initialType))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setValues(blankPlanForm(initialType))
    setErrors({})
  }, [initialType, open])

  const set = <K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.title.trim()) next.title = 'A plan title is required.'
    if (!values.goal.trim()) next.goal = 'Describe the plan goal.'
    const budget = Number(values.budget)
    if (!values.budget || !Number.isFinite(budget) || budget <= 0) next.budget = 'Enter a budget greater than zero.'
    if (values.type === 'Quarterly' && !values.quarter) next.quarter = 'Select a quarter.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a demo plan"
      description="This plan is stored in your browser only. It does not enter any approval or finance workflow."
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Save demo plan</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Plan title" htmlFor="plan-title" required error={errors.title} className="form-grid__full">
          <input id="plan-title" className="input" value={values.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. FY 2027–28 Regional Growth Plan" aria-invalid={Boolean(errors.title)} />
        </Field>
        <Field label="Plan type" htmlFor="plan-type">
          <select id="plan-type" className="select" value={values.type} onChange={(event) => set('type', event.target.value as PlanType)}>
            {PLAN_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Financial year" htmlFor="plan-year">
          <input id="plan-year" className="input" type="number" min={2024} max={2035} value={values.year} onChange={(event) => set('year', event.target.value)} />
        </Field>
        {values.type === 'Quarterly' ? (
          <Field label="Quarter" htmlFor="plan-quarter" required error={errors.quarter}>
            <select id="plan-quarter" className="select" value={values.quarter} onChange={(event) => set('quarter', event.target.value)}>
              <option value="">Select quarter</option>
              <option value="1">Q1</option>
              <option value="2">Q2</option>
              <option value="3">Q3</option>
              <option value="4">Q4</option>
            </select>
          </Field>
        ) : null}
        <Field label="Budget (INR)" htmlFor="plan-budget" required error={errors.budget}>
          <input id="plan-budget" className="input" type="number" min={0} step={1000} value={values.budget} onChange={(event) => set('budget', event.target.value)} placeholder="e.g. 4500000" aria-invalid={Boolean(errors.budget)} />
        </Field>
        <Field label="Owner" htmlFor="plan-owner">
          <input id="plan-owner" className="input" value={values.owner} onChange={(event) => set('owner', event.target.value)} />
        </Field>
        <Field label="Initial status" htmlFor="plan-status">
          <select id="plan-status" className="select" value={values.status} onChange={(event) => set('status', event.target.value as PlanStatus)}>
            {PLAN_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Goal" htmlFor="plan-goal" required error={errors.goal} className="form-grid__full">
          <textarea id="plan-goal" className="textarea" rows={3} value={values.goal} onChange={(event) => set('goal', event.target.value)} placeholder="What should this plan achieve?" aria-invalid={Boolean(errors.goal)} />
        </Field>
        <Field label="Notes" htmlFor="plan-notes" className="form-grid__full" hint="Visible in the plan detail view. Stored locally.">
          <textarea id="plan-notes" className="textarea" rows={3} value={values.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Assumptions, channel mix or review cadence…" />
        </Field>
        {campaigns.length ? (
          <p className="text-xs faint form-grid__full">
            Campaign plans can be linked later from the campaign budget register. {campaigns.length} demo campaigns are available.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

function PlanDetailModal({
  plan,
  onClose,
  onStatusChange,
}: {
  plan: Plan
  onClose: () => void
  onStatusChange: (status: PlanStatus) => void
}) {
  const utilisation = plan.budget > 0 ? (plan.spent / plan.budget) * 100 : 0
  return (
    <Modal
      open
      onClose={onClose}
      title={plan.title}
      description={`${plan.type} plan · FY ${plan.year}${plan.quarter ? ` · Q${plan.quarter}` : ''}`}
      size="wide"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="stack-16">
        <div className="row-8" style={{ flexWrap: 'wrap' }}>
          <StatusBadge status={plan.status} />
          <Badge tone="neutral">{plan.owner}</Badge>
          <Badge tone="neutral">{plan.id}</Badge>
        </div>
        <div className="mini-stats">
          <div className="mini-stat"><p className="mini-stat__label">Budget</p><p className="mini-stat__value">{formatINRCompact(plan.budget)}</p></div>
          <div className="mini-stat"><p className="mini-stat__label">Spent</p><p className="mini-stat__value">{formatINRCompact(plan.spent)}</p></div>
          <div className="mini-stat"><p className="mini-stat__label">Utilisation</p><p className="mini-stat__value">{formatPercent(utilisation, 0)}</p></div>
        </div>
        <ProgressBar value={utilisation} tone={utilisationTone(utilisation)} showValue label="Budget utilisation" />
        <DetailRows
          items={[
            { label: 'Goal', value: plan.goal },
            { label: 'Owner', value: plan.owner },
            { label: 'Created', value: formatDate(plan.createdAt) },
            { label: 'Status', value: plan.status },
            { label: 'Notes', value: plan.notes || 'No notes recorded.' },
          ]}
        />
        <Field label="Update demo status" htmlFor="plan-detail-status" hint="Changing status affects this browser only; it does not submit or approve anything.">
          <select id="plan-detail-status" className="select" value={plan.status} onChange={(event) => onStatusChange(event.target.value as PlanStatus)}>
            {PLAN_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}
