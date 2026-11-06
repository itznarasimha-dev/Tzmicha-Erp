import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  CalendarRange,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  Pencil,
  Play,
  Plus,
  Send,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { MonthlyPlan } from '../../types/workflow'
import { workflowMonthLabel } from '../../data/marketing/roleWorkflow'
import { useWorkflow } from '../../hooks/useWorkflow'
import {
  canCreatePlan,
  canEditPlan,
  canStartExecution,
  canSubmitPlan,
  employeeNameById,
  planExecutionProgress,
  planLeadAchievement,
  planMonthOptions,
  PLAN_STATUSES,
} from '../../utils/workflow'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../../utils/format'
import { Button } from '../ui/Button'
import { DataTable, type DataTableColumn } from '../ui/DataTable'
import { ProgressBar, utilisationTone } from '../ui/ProgressBar'
import { StatusBadge } from '../ui/Badge'
import { MetricCard, MetricGrid, TabIntro } from '../marketing/ModuleKit'
import { MonthlyPlanFormModal } from './MonthlyPlanFormModal'
import { PlanDetailModal } from './PlanDetailModal'

export function MonthlyPlansWorkspace() {
  const {
    plans,
    visiblePlans,
    config,
    roleId,
    profile,
    metrics,
    createPlan,
    updatePlan,
    submitPlan,
    startExecution,
  } = useWorkflow()

  const [month, setMonth] = useState('All')
  const [status, setStatus] = useState('All')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MonthlyPlan | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('action') !== 'new') return
    if (canCreatePlan(roleId)) {
      setEditing(null)
      setFormOpen(true)
    }
    const next = new URLSearchParams(searchParams)
    next.delete('action')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, roleId])

  const months = useMemo(() => planMonthOptions(plans), [plans])
  const reviewerOptions = useMemo(
    () => [{ id: config.seniorId, name: employeeNameById(config.seniorId) }],
    [config.seniorId],
  )
  const defaultReviewerId = config.reviewersByEmployee[profile.employeeId] ?? null

  const rows = useMemo(
    () =>
      visiblePlans
        .filter((plan) => (month === 'All' ? true : plan.month === month))
        .filter((plan) => (status === 'All' ? true : plan.status === status))
        .sort((a, b) => {
          if (a.month !== b.month) return b.month.localeCompare(a.month)
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        }),
    [visiblePlans, month, status],
  )

  const awaiting = metrics.pendingSenior + metrics.pendingManager + metrics.pendingAdmin
  const leadAchievement =
    metrics.targetLeads > 0 ? (metrics.actualLeads / metrics.targetLeads) * 100 : null

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (plan: MonthlyPlan) => {
    setDetailId(null)
    setEditing(plan)
    setFormOpen(true)
  }

  const handleSave = (draft: Parameters<typeof createPlan>[0]): boolean => {
    if (editing) return updatePlan(editing.id, draft)
    return Boolean(createPlan(draft))
  }

  const columns: DataTableColumn<MonthlyPlan>[] = [
    {
      id: 'plan',
      header: 'Monthly plan',
      mobileLabel: 'Plan',
      sortValue: (plan) => plan.title,
      render: (plan) => (
        <div>
          <p className="cell-primary">{plan.title}</p>
          <p className="text-xs muted">{workflowMonthLabel(plan.month)} · {plan.employeeRole}</p>
        </div>
      ),
    },
    {
      id: 'owner',
      header: 'Owner',
      mobileLabel: 'Owner',
      sortValue: (plan) => plan.employeeName,
      render: (plan) => <span className="text-xs">{plan.employeeName}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      sortValue: (plan) => plan.status,
      render: (plan) => (
        <div>
          <StatusBadge status={plan.status} />
          <p className="text-xs muted" style={{ marginTop: 3 }}>
            {plan.currentApprover ? `With ${plan.currentApprover}` : plan.financeRequired ? 'Admin gated' : 'No Admin gate'}
          </p>
        </div>
      ),
    },
    {
      id: 'budget',
      header: 'Budget',
      align: 'right',
      mobileLabel: 'Budget',
      sortValue: (plan) => plan.estimatedBudget,
      render: (plan) => (
        <div>
          <p className="cell-strong">{formatINR(plan.estimatedBudget)}</p>
          <p className="text-xs muted">{plan.financeRequired ? 'Admin authorization required' : 'Below threshold'}</p>
        </div>
      ),
    },
    {
      id: 'leads',
      header: 'Leads target / actual',
      align: 'right',
      mobileLabel: 'Leads',
      hideMobile: true,
      sortValue: (plan) => plan.expectedLeads,
      render: (plan) => (
        <span className="text-xs">
          {formatNumber(plan.expectedLeads || plan.monthlyTarget)} / {formatNumber(plan.execution.actualLeads)}
        </span>
      ),
    },
    {
      id: 'progress',
      header: 'Execution',
      mobileLabel: 'Execution',
      sortValue: (plan) => planExecutionProgress(plan),
      render: (plan) => {
        const progress = planExecutionProgress(plan)
        return (
          <div style={{ minWidth: 96 }}>
            <span className="text-xs">{formatPercent(progress, 0)}</span>
            <ProgressBar value={progress} size="sm" tone={progress === 0 ? 'brand' : progress >= 100 ? 'success' : utilisationTone(progress)} className="mt-4" />
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      mobileLabel: 'Actions',
      render: (plan) => (
        <div className="row-6 wrap" style={{ justifyContent: 'flex-end' }}>
          {canSubmitPlan(plan, profile) ? (
            <Button
              variant="ghost"
              size="xs"
              icon={<Send size={12} />}
              onClick={(event) => {
                event.stopPropagation()
                submitPlan(plan.id)
              }}
            >
              {plan.status === 'Draft' ? 'Submit' : 'Resubmit'}
            </Button>
          ) : null}
          {canStartExecution(plan, profile) ? (
            <Button
              variant="ghost"
              size="xs"
              icon={<Play size={12} />}
              onClick={(event) => {
                event.stopPropagation()
                startExecution(plan.id)
              }}
            >
              Start
            </Button>
          ) : null}
          {canEditPlan(plan, profile) ? (
            <Button
              variant="ghost"
              size="xs"
              icon={<Pencil size={12} />}
              onClick={(event) => {
                event.stopPropagation()
                openEdit(plan)
              }}
            >
              Edit
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="xs"
            onClick={(event) => {
              event.stopPropagation()
              setDetailId(plan.id)
            }}
          >
            Open
          </Button>
        </div>
      ),
    },
  ]

  const roleHint =
    roleId === 'junior'
      ? 'You see your own monthly plans. Assigned senior reviews appear in the approval inbox.'
      : roleId === 'senior'
        ? 'You see your own plans plus junior plans assigned to you for senior review.'
        : 'You see all team monthly plans, pending manager approvals and submitted results.'

  return (
    <div className="wf-workspace">
      <TabIntro
        title="Monthly marketing plans"
        description="Plan one month at a time. Plans route through Senior review, Manager approval and Admin financial authorization before execution. No annual or quarterly planning is used in this workspace."
        actions={
          canCreatePlan(roleId) ? (
            <Button variant="primary" icon={<Plus size={14} />} onClick={openCreate}>
              New monthly plan
            </Button>
          ) : (
            <span className="badge badge--neutral badge--no-dot">{profile.shortLabel} view</span>
          )
        }
      >
        <p className="text-xs muted">{roleHint}</p>
      </TabIntro>

      <MetricGrid>
        <MetricCard
          label="Visible plans"
          value={metrics.totalPlans}
          sub={`${rows.length} match the current filters`}
          icon={<CalendarRange size={15} />}
          tone="var(--chart-1)"
        />
        <MetricCard
          label="Awaiting approval"
          value={awaiting}
          sub={`${metrics.pendingSenior} senior · ${metrics.pendingManager} manager · ${metrics.pendingAdmin} Admin`}
          icon={<ClipboardCheck size={15} />}
          tone="var(--chart-3)"
        />
        <MetricCard
          label="Approved budget"
          value={formatINRCompact(metrics.approvedBudget)}
          sub={`${formatINRCompact(metrics.plannedBudget)} planned in total`}
          icon={<Wallet size={15} />}
          tone="var(--chart-2)"
        />
        <MetricCard
          label="Lead achievement"
          value={leadAchievement === null ? '—' : formatPercent(leadAchievement, 0)}
          sub={`${formatNumber(metrics.actualLeads)} actual of ${formatNumber(metrics.targetLeads)} target`}
          icon={<Target size={15} />}
          tone="var(--chart-5)"
          progress={leadAchievement ?? 0}
        />
      </MetricGrid>

      <div className="wf-filters">
        <label className="wf-filters__field">
          <span>Month</span>
          <select className="select" value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="All">All months</option>
            {months.map((item) => <option key={item} value={item}>{workflowMonthLabel(item)}</option>)}
          </select>
        </label>
        <label className="wf-filters__field">
          <span>Status</span>
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="All">All statuses</option>
            {PLAN_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <span className="wf-filters__count">
          <TrendingUp size={13} /> Admin financial authorization at {formatINR(config.financeThreshold)} or above
        </span>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(plan) => plan.id}
        searchable={(plan) => `${plan.title} ${plan.employeeName} ${plan.employeeRole} ${plan.month} ${plan.status}`}
        searchPlaceholder="Search plans, owners, months or statuses…"
        pageSize={8}
        initialSort={{ columnId: 'budget', direction: 'desc' }}
        onRowClick={(plan) => setDetailId(plan.id)}
        emptyTitle="No monthly plans in this view"
        emptyDescription="Create a monthly plan or widen the month and status filters. Plans are stored only in this browser."
        emptyAction={canCreatePlan(roleId) ? <Button variant="soft" onClick={openCreate}>Create monthly plan</Button> : undefined}
        caption="Monthly marketing plans"
      />

      <div className="callout callout--info">
        <CircleAlert size={14} />
        <span>
          Approval stages cannot be skipped. Changes requested or rejected plans restart at the first required stage when
          resubmitted. The existing Admin Dashboard is only involved at or above {formatINR(config.financeThreshold)}.
        </span>
      </div>

      <div className="wf-inline-stats">
        <span><BadgeCheck size={13} /> {metrics.completed} completed</span>
        <span><Play size={13} /> {metrics.inProgress} in progress</span>
        <span><CircleDollarSign size={13} /> {formatINRCompact(metrics.actualSpending)} actual spend</span>
        <span><Target size={13} /> {metrics.changesRequested} awaiting revision</span>
      </div>

      <MonthlyPlanFormModal
        open={formOpen}
        plan={editing}
        monthOptions={months}
        reviewerOptions={reviewerOptions}
        defaultReviewerId={defaultReviewerId}
        showReviewer={roleId === 'junior'}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSave={handleSave}
      />

      {detailId ? (
        <PlanDetailModal
          planId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={openEdit}
        />
      ) : null}
    </div>
  )
}
