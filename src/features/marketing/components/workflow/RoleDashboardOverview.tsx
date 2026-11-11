import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarRange,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Inbox,
  ListChecks,
  PlayCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
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
import {
  ChartCard,
  ChartTooltip,
  PieLegend,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../charts/ChartKit'
import { KpiCard } from '../marketing/KpiCard'
import { SectionCard } from '../ui/SectionCard'
import { Badge, StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useDemoData } from '../../context/DemoDataContext'
import { useWorkflow } from '../../hooks/useWorkflow'
import {
  DEMO_MARKETING_EMPLOYEES,
  workflowMonthShort,
} from '../../data/marketing/roleWorkflow'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../../utils/format'
import {
  PLAN_STATUSES,
  assignedJuniorsForSenior,
  leadBelongsToRole,
  planStageStates,
} from '../../utils/workflow'
import { RoleWorkflowDiagram } from './RoleWorkflowDiagram'
import { WorkflowTimeline } from './WorkflowTimeline'

interface RoleKpi {
  label: string
  value: number | string
  icon: ReactNode
  tone: string
  hint: string
  format?: (value: number) => string
}

interface NextAction {
  id: string
  title: string
  description: string
  count: number
  buttonLabel: string
  to: string
  icon: ReactNode
  tone: string
}

const ATTENTION_STATUSES = [
  'Pending Senior Review',
  'Pending Manager Approval',
  'Pending Admin Financial Authorization',
]

export function RoleDashboardOverview() {
  const navigate = useNavigate()
  const { data } = useDemoData()
  const {
    visiblePlans,
    visibleExpenses,
    metrics,
    inboxItems,
    config,
    roleId,
    profile,
  } = useWorkflow()
  const chartAnim = useChartAnimation()

  const decisions = inboxItems.filter((item) => item.mode === 'decision')
  const actions = inboxItems.filter((item) => item.mode === 'action')
  const monitors = inboxItems.filter((item) => item.mode === 'monitor')
  const leadAchievement =
    metrics.targetLeads > 0 ? (metrics.actualLeads / metrics.targetLeads) * 100 : null
  const resultsToReview = visiblePlans.filter((plan) => plan.status === 'Submitted for Results Review').length
  const managerExpenseDecisions = visibleExpenses.filter((expense) =>
    ['Submitted', 'Pending Manager Review'].includes(expense.status),
  ).length
  const isTeamRole = roleId === 'senior' || roleId === 'manager'

  const myPlans = useMemo(
    () => visiblePlans.filter((plan) => plan.employeeId === profile.employeeId),
    [visiblePlans, profile.employeeId],
  )
  const myExpenses = useMemo(
    () => visibleExpenses.filter((expense) => expense.employeeId === profile.employeeId),
    [visibleExpenses, profile.employeeId],
  )
  const roleLeads = useMemo(
    () => data.leads.filter((lead) => leadBelongsToRole(lead, roleId, profile)),
    [data.leads, roleId, profile],
  )
  const openFollowUps = useMemo(
    () =>
      roleLeads.filter(
        (lead) =>
          lead.nextFollowUp &&
          !['Converted', 'Lost', 'Rejected', 'Not Interested'].includes(lead.status) &&
          new Date(lead.nextFollowUp).getTime() <= Date.now() + 24 * 60 * 60 * 1000,
      ).length,
    [roleLeads],
  )

  const teamEmployees = useMemo(() => {
    if (roleId === 'manager') {
      return DEMO_MARKETING_EMPLOYEES.filter((employee) => employee.roleId !== 'admin')
    }
    if (roleId === 'senior') {
      const own = DEMO_MARKETING_EMPLOYEES.filter(
        (employee) => employee.employeeId === profile.employeeId,
      )
      return [...own, ...assignedJuniorsForSenior(profile.employeeId)]
    }
    return DEMO_MARKETING_EMPLOYEES.filter(
      (employee) => employee.employeeId === profile.employeeId,
    )
  }, [roleId, profile.employeeId])

  const teamRows = useMemo(
    () =>
      teamEmployees.map((employee) => {
        const employeePlans = visiblePlans.filter(
          (plan) => plan.employeeId === employee.employeeId,
        )
        const target = employeePlans.reduce(
          (sum, plan) => sum + (plan.expectedLeads || plan.monthlyTarget),
          0,
        )
        const actual = employeePlans.reduce(
          (sum, plan) => sum + plan.execution.actualLeads,
          0,
        )
        const pending = employeePlans.filter((plan) =>
          ATTENTION_STATUSES.includes(plan.status),
        ).length
        const budget = employeePlans.reduce((sum, plan) => sum + plan.estimatedBudget, 0)
        return {
          employeeId: employee.employeeId,
          name: employee.name,
          roleLabel: employee.roleLabel,
          initials: employee.initials,
          plans: employeePlans.length,
          pending,
          target,
          actual,
          budget,
          achievement: target > 0 ? (actual / target) * 100 : null,
        }
      }),
    [teamEmployees, visiblePlans],
  )

  const teamTarget = teamRows.reduce((sum, row) => sum + row.target, 0)
  const teamActual = teamRows.reduce((sum, row) => sum + row.actual, 0)

  const kpis = useMemo<RoleKpi[]>(() => {
    if (roleId === 'manager') {
      return [
        {
          label: 'Department plans',
          value: metrics.totalPlans,
          icon: <Users size={17} />,
          tone: 'var(--chart-1)',
          hint: `${metrics.inProgress} in progress · ${teamRows.length} employees`,
        },
        {
          label: 'Manager decisions',
          value: metrics.pendingManager,
          icon: <ClipboardCheck size={17} />,
          tone: 'var(--chart-3)',
          hint: 'Plans awaiting manager approval',
        },
        {
          label: 'Results to review',
          value: resultsToReview,
          icon: <BadgeCheck size={17} />,
          tone: 'var(--chart-2)',
          hint: 'Submitted monthly outcomes',
        },
        {
          label: 'Approved budget',
          value: metrics.approvedBudget,
          icon: <Wallet size={17} />,
          tone: 'var(--chart-5)',
          hint: `${formatINRCompact(metrics.actualSpending)} actual spend`,
          format: formatINRCompact,
        },
      ]
    }
    if (roleId === 'senior') {
      return [
        {
          label: 'My and team plans',
          value: metrics.totalPlans,
          icon: <CalendarRange size={17} />,
          tone: 'var(--chart-1)',
          hint: `${metrics.inProgress} in progress · ${teamRows.length - 1} assigned juniors`,
        },
        {
          label: 'Awaiting my review',
          value: metrics.pendingSenior,
          icon: <ClipboardCheck size={17} />,
          tone: 'var(--chart-3)',
          hint: 'Team plans in senior review',
        },
        {
          label: 'Team lead achievement',
          value: teamTarget > 0 ? teamActual : '—',
          icon: <Target size={17} />,
          tone: 'var(--chart-2)',
          hint:
            teamTarget > 0
              ? `${formatPercent((teamActual / teamTarget) * 100, 0)} of ${formatNumber(teamTarget)} target`
              : 'No team lead target recorded',
          format: (value) => `${formatNumber(value)} leads`,
        },
        {
          label: 'Team pending expenses',
          value: metrics.pendingExpenseAmount,
          icon: <ReceiptText size={17} />,
          tone: 'var(--chart-5)',
          hint: `${metrics.pendingExpenses} awaiting manager or Admin`,
          format: formatINRCompact,
        },
      ]
    }
    return [
      {
        label: 'My monthly plans',
        value: metrics.totalPlans,
        icon: <CalendarRange size={17} />,
        tone: 'var(--chart-1)',
        hint: `${metrics.inProgress} in progress`,
      },
      {
        label: 'Awaiting approval',
        value: metrics.pendingSenior + metrics.pendingManager + metrics.pendingAdmin,
        icon: <Clock3 size={17} />,
        tone: 'var(--chart-3)',
        hint: `${metrics.pendingSenior} senior · ${metrics.pendingManager} manager · ${metrics.pendingAdmin} Admin`,
      },
      {
        label: 'Lead achievement',
        value: leadAchievement === null ? '—' : leadAchievement,
        icon: <Target size={17} />,
        tone: 'var(--chart-2)',
        hint: `${formatNumber(metrics.actualLeads)} actual of ${formatNumber(metrics.targetLeads)} target`,
        format: (value) => formatPercent(value, 0),
      },
      {
        label: 'Pending expenses',
        value: metrics.pendingExpenseAmount,
        icon: <ReceiptText size={17} />,
        tone: 'var(--chart-5)',
        hint: `${metrics.pendingExpenses} awaiting manager or Admin`,
        format: formatINRCompact,
      },
    ]
  }, [
    leadAchievement,
    metrics,
    resultsToReview,
    roleId,
    teamActual,
    teamRows.length,
    teamTarget,
  ])

  const nextActions = useMemo<NextAction[]>(() => {
    const list: NextAction[] = []
    const myDrafts = myPlans.filter((plan) => plan.status === 'Draft').length
    const myChanges = myPlans.filter((plan) => plan.status === 'Changes Requested').length
    const myRejected = myPlans.filter((plan) => plan.status === 'Rejected').length
    const myReady = myPlans.filter((plan) => plan.status === 'Approved — Ready to Execute').length
    const myInProgress = myPlans.filter((plan) => plan.status === 'In Progress').length
    const myExpenseActions = myExpenses.filter((expense) =>
      ['Draft', 'Changes Requested', 'Rejected'].includes(expense.status),
    ).length

    if (roleId === 'junior') {
      if (myDrafts > 0) {
        list.push({
          id: 'drafts',
          title: 'Finish and submit monthly plans',
          description: `${myDrafts} draft plan${myDrafts === 1 ? '' : 's'} still need a submission.`,
          count: myDrafts,
          buttonLabel: 'Open monthly plans',
          to: '/marketing/plans/monthly-plans',
          icon: <Send size={16} />,
          tone: 'var(--chart-1)',
        })
      }
      if (myChanges + myRejected > 0) {
        list.push({
          id: 'corrections',
          title: 'Correct returned plans',
          description: `${myChanges + myRejected} plan${myChanges + myRejected === 1 ? '' : 's'} need revision before resubmission.`,
          count: myChanges + myRejected,
          buttonLabel: 'Revise plans',
          to: '/marketing/plans/monthly-plans',
          icon: <RefreshCw size={16} />,
          tone: 'var(--chart-3)',
        })
      }
      if (myReady > 0) {
        list.push({
          id: 'execute',
          title: 'Start approved execution',
          description: `${myReady} plan${myReady === 1 ? '' : 's'} cleared every approval and can start.`,
          count: myReady,
          buttonLabel: 'Start execution',
          to: '/marketing/plans/monthly-plans',
          icon: <PlayCircle size={16} />,
          tone: 'var(--chart-2)',
        })
      }
      if (myInProgress > 0) {
        list.push({
          id: 'progress',
          title: 'Update execution results',
          description: `${myInProgress} plan${myInProgress === 1 ? '' : 's'} in progress need leads, spend and outcome updates.`,
          count: myInProgress,
          buttonLabel: 'Update results',
          to: '/marketing/plans/monthly-plans',
          icon: <TrendingUp size={16} />,
          tone: 'var(--chart-2)',
        })
      }
      if (myExpenseActions > 0) {
        list.push({
          id: 'expenses',
          title: 'Fix or submit expenses',
          description: `${myExpenseActions} expense record${myExpenseActions === 1 ? '' : 's'} need an owner action.`,
          count: myExpenseActions,
          buttonLabel: 'Open expenses',
          to: '/marketing/expenses/monthly-expenses',
          icon: <ReceiptText size={16} />,
          tone: 'var(--chart-5)',
        })
      }
      if (openFollowUps > 0) {
        list.push({
          id: 'followups',
          title: 'Complete lead follow-ups',
          description: `${openFollowUps} follow-up${openFollowUps === 1 ? '' : 's'} are due or overdue for your leads.`,
          count: openFollowUps,
          buttonLabel: 'Open follow-ups',
          to: '/marketing/leads/follow-ups',
          icon: <Users size={16} />,
          tone: 'var(--chart-1)',
        })
      }
      if (metrics.pendingSenior + metrics.pendingManager + metrics.pendingAdmin > 0) {
        list.push({
          id: 'track',
          title: 'Track approval progress',
          description: 'See exactly which stage each monthly plan has reached.',
          count: metrics.pendingSenior + metrics.pendingManager + metrics.pendingAdmin,
          buttonLabel: 'Open approval inbox',
          to: '/marketing/approvals/approval-inbox',
          icon: <ClipboardList size={16} />,
          tone: 'var(--chart-3)',
        })
      }
    }

    if (roleId === 'senior') {
      if (metrics.pendingSenior > 0) {
        list.push({
          id: 'senior-review',
          title: 'Review assigned junior plans',
          description: `${metrics.pendingSenior} plan${metrics.pendingSenior === 1 ? '' : 's'} await your approve, changes or reject decision.`,
          count: metrics.pendingSenior,
          buttonLabel: 'Open approval inbox',
          to: '/marketing/approvals/approval-inbox',
          icon: <ClipboardCheck size={16} />,
          tone: 'var(--chart-3)',
        })
      }
      if (myDrafts + myChanges + myRejected > 0) {
        list.push({
          id: 'own-plans',
          title: 'Fix your own monthly plan',
          description: `${myDrafts + myChanges + myRejected} of your plans need editing or submission.`,
          count: myDrafts + myChanges + myRejected,
          buttonLabel: 'Open monthly plans',
          to: '/marketing/plans/monthly-plans',
          icon: <RefreshCw size={16} />,
          tone: 'var(--chart-1)',
        })
      }
      if (myReady + myInProgress > 0) {
        list.push({
          id: 'own-execution',
          title: 'Run your approved plan',
          description: `${myReady + myInProgress} plan${myReady + myInProgress === 1 ? '' : 's'} can start or continue execution.`,
          count: myReady + myInProgress,
          buttonLabel: 'Manage execution',
          to: '/marketing/plans/monthly-plans',
          icon: <PlayCircle size={16} />,
          tone: 'var(--chart-2)',
        })
      }
      if (myExpenseActions > 0) {
        list.push({
          id: 'own-expenses',
          title: 'Fix your expense records',
          description: `${myExpenseActions} of your expenses need submission or correction.`,
          count: myExpenseActions,
          buttonLabel: 'Open expenses',
          to: '/marketing/expenses/monthly-expenses',
          icon: <ReceiptText size={16} />,
          tone: 'var(--chart-5)',
        })
      }
      if (openFollowUps > 0) {
        list.push({
          id: 'team-followups',
          title: 'Team follow-ups due',
          description: `${openFollowUps} follow-up${openFollowUps === 1 ? '' : 's'} are due across your team.`,
          count: openFollowUps,
          buttonLabel: 'Open follow-ups',
          to: '/marketing/leads/follow-ups',
          icon: <Users size={16} />,
          tone: 'var(--chart-1)',
        })
      }
      if (myInProgress > 0) {
        list.push({
          id: 'own-results',
          title: 'Submit monthly results',
          description: `${myInProgress} in-progress plan${myInProgress === 1 ? '' : 's'} can submit results for manager review.`,
          count: myInProgress,
          buttonLabel: 'Update results',
          to: '/marketing/plans/monthly-plans',
          icon: <Send size={16} />,
          tone: 'var(--chart-2)',
        })
      }
    }

    if (roleId === 'manager') {
      if (metrics.pendingManager > 0) {
        list.push({
          id: 'manager-review',
          title: 'Decide monthly plans',
          description: `${metrics.pendingManager} plan${metrics.pendingManager === 1 ? '' : 's'} await your approval decision.`,
          count: metrics.pendingManager,
          buttonLabel: 'Open approval inbox',
          to: '/marketing/approvals/approval-inbox',
          icon: <ClipboardCheck size={16} />,
          tone: 'var(--chart-3)',
        })
      }
      if (resultsToReview > 0) {
        list.push({
          id: 'results-review',
          title: 'Review submitted results',
          description: `${resultsToReview} plan${resultsToReview === 1 ? '' : 's'} are waiting for results review.`,
          count: resultsToReview,
          buttonLabel: 'Review results',
          to: '/marketing/approvals/approval-inbox',
          icon: <BadgeCheck size={16} />,
          tone: 'var(--chart-2)',
        })
      }
      if (metrics.pendingAdmin > 0) {
        list.push({
          id: 'admin-monitor',
          title: 'Track Admin financial authorization',
          description: `${metrics.pendingAdmin} approved plan${metrics.pendingAdmin === 1 ? '' : 's'} are awaiting the existing Admin Dashboard. Marketing cannot decide this stage.`,
          count: metrics.pendingAdmin,
          buttonLabel: 'Monitor status',
          to: '/marketing/approvals/approval-inbox',
          icon: <ShieldCheck size={16} />,
          tone: 'var(--chart-4)',
        })
      }
      if (managerExpenseDecisions > 0) {
        list.push({
          id: 'manager-expenses',
          title: 'Review team expenses',
          description: `${managerExpenseDecisions} expense record${managerExpenseDecisions === 1 ? '' : 's'} await your manager decision.`,
          count: managerExpenseDecisions,
          buttonLabel: 'Open expenses',
          to: '/marketing/expenses/monthly-expenses',
          icon: <ReceiptText size={16} />,
          tone: 'var(--chart-5)',
        })
      }
      if (openFollowUps > 0) {
        list.push({
          id: 'department-followups',
          title: 'Department follow-ups due',
          description: `${openFollowUps} follow-up${openFollowUps === 1 ? '' : 's'} are due across the department.`,
          count: openFollowUps,
          buttonLabel: 'Open follow-ups',
          to: '/marketing/leads/follow-ups',
          icon: <Users size={16} />,
          tone: 'var(--chart-1)',
        })
      }
      list.push({
        id: 'budget',
        title: 'Review department budget',
        description: 'Compare planned, manager-approved, Admin-authorized and actual spend.',
        count: metrics.totalPlans,
        buttonLabel: 'Open plans & budgets',
        to: '/marketing/plans/monthly-plans',
        icon: <Wallet size={16} />,
        tone: 'var(--chart-5)',
      })
    }

    return list
  }, [
    managerExpenseDecisions,
    metrics,
    myExpenses,
    myPlans,
    openFollowUps,
    resultsToReview,
    roleId,
  ])

  const statusData = useMemo(
    () =>
      PLAN_STATUSES.map((status, index) => ({
        name: status,
        value: visiblePlans.filter((plan) => plan.status === status).length,
        color: chartColors[index % chartColors.length],
      })).filter((entry) => entry.value > 0),
    [visiblePlans],
  )

  const monthlyRows = useMemo(() => {
    const months = [...new Set(visiblePlans.map((plan) => plan.month))].sort().slice(-5)
    return months.map((month) => {
      const scoped = visiblePlans.filter((plan) => plan.month === month)
      return {
        month: workflowMonthShort(month),
        budget: scoped.reduce((sum, plan) => sum + plan.estimatedBudget, 0),
        actual: scoped.reduce((sum, plan) => sum + plan.execution.actualSpending, 0),
        target: scoped.reduce((sum, plan) => sum + (plan.expectedLeads || plan.monthlyTarget), 0),
        leads: scoped.reduce((sum, plan) => sum + plan.execution.actualLeads, 0),
      }
    })
  }, [visiblePlans])

  const leadRows = useMemo(
    () =>
      [...visiblePlans]
        .sort((a, b) => (b.expectedLeads || b.monthlyTarget) - (a.expectedLeads || a.monthlyTarget))
        .slice(0, 6)
        .map((plan) => ({
          name: plan.title.length > 22 ? `${plan.title.slice(0, 22)}…` : plan.title,
          target: plan.expectedLeads || plan.monthlyTarget,
          actual: plan.execution.actualLeads,
        })),
    [visiblePlans],
  )

  const latestPlan = useMemo(
    () =>
      [...visiblePlans]
        .filter((plan) => plan.status !== 'Completed')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ??
      [...visiblePlans].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0],
    [visiblePlans],
  )

  const teamChartData = useMemo(
    () =>
      teamRows
        .filter((row) => row.plans > 0)
        .map((row) => ({
          name: row.name.split(' ')[0],
          target: row.target,
          actual: row.actual,
        })),
    [teamRows],
  )

  return (
    <section className="wf-overview" aria-label="Role-based monthly marketing workflow">
      <div className="wf-overview__head">
        <div className="wf-overview__identity">
          <span className="wf-overview__avatar" aria-hidden="true">{profile.initials}</span>
          <div>
            <p className="wf-overview__eyebrow">Preview role · not authentication</p>
            <h2>{profile.name} <span>{profile.roleLabel}</span></h2>
            <p className="wf-overview__scope">{profile.scope}</p>
          </div>
        </div>
        <div className="wf-overview__actions">
          {roleId === 'manager' ? (
            <>
              <Button variant="ghost" size="sm" icon={<CalendarRange size={13} />} onClick={() => navigate('/marketing/plans/monthly-plans')}>
                All monthly plans
              </Button>
              <Button variant="primary" size="sm" icon={<Inbox size={13} />} onClick={() => navigate('/marketing/approvals/approval-inbox')}>
                Approval inbox
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" icon={<ReceiptText size={13} />} onClick={() => navigate('/marketing/expenses/monthly-expenses')}>
                Monthly expenses
              </Button>
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => navigate('/marketing/plans/monthly-plans?action=new')}>
                New monthly plan
              </Button>
            </>
          )}
        </div>
      </div>

      {nextActions.length > 0 ? (
        <section className="wf-next-actions" aria-label="My next actions">
          <div className="wf-next-actions__head">
            <span className="wf-next-actions__icon"><ListChecks size={15} /></span>
            <div>
              <p className="wf-next-actions__title">My Next Actions</p>
              <p className="wf-next-actions__sub">
                {roleId === 'manager'
                  ? 'Department decisions and budget checks that need you now.'
                  : roleId === 'senior'
                    ? 'Your own work plus the junior plans waiting on your review.'
                    : 'Your plan, execution, lead and expense tasks in one place.'}
              </p>
            </div>
          </div>
          <div className="wf-next-actions__grid">
            {nextActions.map((action) => (
              <article
                key={action.id}
                className={`wf-next-actions__card${action.id === 'admin-monitor' ? ' wf-next-actions__card--monitor' : ''}`}
                style={{ ['--wf-action-tone' as string]: action.tone }}
              >
                <div className="wf-next-actions__card-head">
                  <span className="wf-next-actions__card-icon">{action.icon}</span>
                  <Badge tone="neutral" className="badge--no-dot">{action.count}</Badge>
                </div>
                <p className="wf-next-actions__card-title">{action.title}</p>
                <p className="wf-next-actions__card-copy">{action.description}</p>
                <Button
                  variant="ghost"
                  size="xs"
                  icon={<ArrowRight size={12} />}
                  onClick={() => navigate(action.to)}
                >
                  {action.buttonLabel}
                </Button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="wf-next-actions wf-next-actions--clear" aria-label="My next actions">
          <span className="wf-next-actions__icon"><BadgeCheck size={15} /></span>
          <div>
            <p className="wf-next-actions__title">My Next Actions</p>
            <p className="wf-next-actions__sub">
              Nothing is waiting on you right now. Switch the preview role to inspect another queue.
            </p>
          </div>
        </section>
      )}

      <div className="grid-kpi">
        {kpis.map((kpi, index) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            tone={kpi.tone}
            hint={kpi.hint}
            format={kpi.format}
            index={index}
          />
        ))}
      </div>

      <div className="dashboard-grid dashboard-grid--three">
        <ChartCard
          title="Plan status mix"
          subtitle={
            roleId === 'manager'
              ? 'Department monthly plans by workflow status'
              : 'Role-scoped monthly plans by workflow status'
          }
          height="md"
          isEmpty={statusData.length === 0}
          legend={
            statusData.length ? (
              <PieLegend items={statusData.map((entry) => ({ ...entry, display: String(entry.value) }))} />
            ) : undefined
          }
        >
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={3}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={chartAnim}
            >
              {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} plans`} />} />
          </PieChart>
        </ChartCard>

        <ChartCard
          title="Budget vs actual by month"
          subtitle="Estimated plan budget and recorded execution spend"
          height="md"
          isEmpty={monthlyRows.length === 0}
          legend={
            <>
              <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-1)' }} />Budget</span>
              <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-3)' }} />Actual</span>
            </>
          }
        >
          <BarChart data={monthlyRows} margin={{ top: 8, right: 6, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={46} tickFormatter={(value: number) => formatINRCompact(value)} />
            <Tooltip content={<ChartTooltip valueFormatter={formatINR} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="budget" name="Budget" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            <Bar dataKey="actual" name="Actual" fill="var(--chart-3)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Lead target vs actual"
          subtitle="Top plans by target lead volume"
          height="md"
          isEmpty={leadRows.length === 0}
          legend={
            <>
              <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-8)' }} />Target</span>
              <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-2)' }} />Actual</span>
            </>
          }
        >
          <BarChart data={leadRows} layout="vertical" margin={{ top: 4, right: 14, left: 4, bottom: 0 }}>
            <CartesianGrid {...gridProps} horizontal={false} vertical />
            <XAxis type="number" {...axisProps} allowDecimals={false} />
            <YAxis type="category" dataKey="name" {...axisProps} width={112} tick={{ fill: 'var(--muted)', fontSize: 9 }} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(value)} leads`} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="target" name="Target" fill="var(--chart-8)" opacity={0.45} radius={[0, 4, 4, 0]} isAnimationActive={chartAnim} />
            <Bar dataKey="actual" name="Actual" fill="var(--chart-2)" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim} />
          </BarChart>
        </ChartCard>
      </div>

      {isTeamRole ? (
        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard
            title={roleId === 'manager' ? 'Department lead performance' : 'Team lead performance'}
            subtitle="Monthly lead target versus recorded actual by employee"
            height="md"
            isEmpty={teamChartData.length === 0}
            legend={
              <>
                <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-8)' }} />Target</span>
                <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-2)' }} />Actual</span>
              </>
            }
          >
            <BarChart data={teamChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <YAxis {...axisProps} width={34} allowDecimals={false} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${formatNumber(value)} leads`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="target" name="Target" fill="var(--chart-8)" opacity={0.45} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="actual" name="Actual" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>

          <SectionCard
            title={roleId === 'manager' ? 'Team overview' : 'Assigned team'}
            subtitle={
              roleId === 'manager'
                ? 'Every Marketing employee, their plan load and current lead delivery.'
                : `${teamRows.length - 1} junior employee${teamRows.length - 1 === 1 ? '' : 's'} assigned to you.`
            }
          >
            <div className="wf-team">
              {teamRows.map((row) => (
                <div className="wf-team__row" key={row.employeeId}>
                  <span className="wf-team__avatar" aria-hidden="true">{row.initials}</span>
                  <span className="wf-team__identity">
                    <span className="wf-team__name truncate">{row.name}</span>
                    <span className="wf-team__meta truncate">
                      {row.roleLabel.replace(' Marketing Executive', '')} · {row.plans} plan{row.plans === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="wf-team__metric">
                    <span className="wf-team__metric-value">{formatNumber(row.actual)}</span>
                    <span className="wf-team__metric-label">of {formatNumber(row.target)}</span>
                  </span>
                  <span className="wf-team__progress" aria-hidden="true">
                    <span
                      className="wf-team__progress-bar"
                      style={{ width: `${Math.min(100, row.achievement ?? 0)}%` }}
                    />
                  </span>
                  <Badge tone={row.pending > 0 ? 'warning' : 'success'} className="badge--no-dot">
                    {row.pending > 0 ? `${row.pending} pending` : 'Clear'}
                  </Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {roleId === 'manager' ? (
        <SectionCard
          title="Budget overview"
          subtitle="Planned, manager-approved, Admin-authorized and actual spend across the department."
          actions={<Badge tone="neutral" className="badge--no-dot">Admin gate {formatINR(config.financeThreshold)}</Badge>}
        >
          <div className="wf-budget">
            {[
              { label: 'Planned budget', value: metrics.plannedBudget, tone: 'var(--chart-1)' },
              { label: 'Manager approved', value: metrics.managerApprovedBudget, tone: 'var(--chart-3)' },
              { label: 'Admin authorized', value: metrics.authorizedBudget, tone: 'var(--chart-2)' },
              { label: 'Actual spend', value: metrics.actualSpending, tone: 'var(--chart-5)' },
            ].map((row) => {
              const share = metrics.plannedBudget > 0 ? (row.value / metrics.plannedBudget) * 100 : 0
              return (
                <div className="wf-budget__row" key={row.label}>
                  <span className="wf-budget__label">{row.label}</span>
                  <span className="wf-budget__track" aria-hidden="true">
                    <span
                      className="wf-budget__fill"
                      style={{ width: `${Math.min(100, share)}%`, background: row.tone }}
                    />
                  </span>
                  <span className="wf-budget__value">{formatINRCompact(row.value)}</span>
                </div>
              )
            })}
          </div>
          <div className="wf-budget__note">
            <ShieldCheck size={13} />
            <span>
              {metrics.pendingAdmin} plan{metrics.pendingAdmin === 1 ? '' : 's'} await financial
              authorization in the existing Totally ERP Admin Dashboard. Marketing cannot authorize
              its own budget.
            </span>
          </div>
        </SectionCard>
      ) : null}

      <div className="wf-overview__split">
        <SectionCard
          title="Needs your attention"
          subtitle="Role-scoped records awaiting a decision or an owner action."
          actions={
            <Button variant="ghost" size="xs" icon={<ArrowRight size={12} />} onClick={() => navigate('/marketing/approvals/approval-inbox')}>
              Open inbox
            </Button>
          }
        >
          {inboxItems.length === 0 ? (
            <div className="wf-overview__clear">
              <BadgeCheck size={18} />
              <div>
                <p className="text-sm font-semibold">Nothing needs action right now</p>
                <p className="text-xs muted">Switch the preview role to see another role's queue.</p>
              </div>
            </div>
          ) : (
            <div className="wf-overview__attention">
              {inboxItems.slice(0, 5).map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  className="wf-overview__attention-row"
                  onClick={() => navigate('/marketing/approvals/approval-inbox')}
                >
                  <span className={`wf-overview__attention-icon wf-overview__attention-icon--${item.mode}`}>
                    {item.kind === 'plan' ? <CalendarRange size={13} /> : <ReceiptText size={13} />}
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="wf-overview__attention-title truncate">{item.title}</span>
                    <span className="wf-overview__attention-meta truncate">{item.hint} · {formatINR(item.amount)}</span>
                  </span>
                  <StatusBadge status={item.status} />
                </button>
              ))}
              <div className="wf-overview__attention-foot">
                <span>{decisions.length} decision{decisions.length === 1 ? '' : 's'} · {actions.length} owner action{actions.length === 1 ? '' : 's'}</span>
                <span>{monitors.length} awaiting Admin authorization</span>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Latest approval timeline"
          subtitle={latestPlan ? `${latestPlan.title} · ${latestPlan.employeeName}` : 'No monthly plans yet'}
          actions={latestPlan ? <StatusBadge status={latestPlan.status} /> : undefined}
        >
          {latestPlan ? (
            <WorkflowTimeline
              compact
              stages={planStageStates(latestPlan, config)}
              label={`${latestPlan.title} approval timeline`}
            />
          ) : (
            <p className="empty-inline">Create a monthly plan to see the approval timeline.</p>
          )}
        </SectionCard>
      </div>

      <RoleWorkflowDiagram config={config} roleId={roleId} />

      <div className="wf-overview__footer">
        <span><CircleAlert size={13} /> Preview roles and workflow records are stored in this browser only.</span>
        <span><ShieldCheck size={13} /> Admin financial authorization gate: {formatINR(config.financeThreshold)} · Manager expense gate: {formatINR(config.expenseManagerThreshold)}</span>
        <span><CircleDollarSign size={13} /> {formatINRCompact(metrics.actualSpending)} actual spend across visible plans</span>
        <span><BarChart3 size={13} /> {roleLeads.length} role-scoped lead{roleLeads.length === 1 ? '' : 's'} · {openFollowUps} follow-up{openFollowUps === 1 ? '' : 's'} due</span>
      </div>
    </section>
  )
}
