import { Fragment, useEffect, useMemo, useState } from 'react'
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
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Compass,
  Download,
  FileBarChart,
  IndianRupee,
  Lightbulb,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { ChartCard, ChartTooltip, axisProps, chartColors, gridProps } from '../../components/charts/ChartKit'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Field } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useMarketingDepartment } from '../../context/MarketingDepartmentContext'
import { roleWorkspacePath } from '../../config/roleNavigation'
import { useNavigate } from 'react-router-dom'
import {
  EmployeeAvatar,
  EmptyBlock,
  KpiCard,
  MmsPageHeader,
  MmsProgress,
  MmsSelect,
  MmsTabs,
  SearchField,
  SectionCard,
  SectorChip,
  StatusChip,
  TimelineList,
  moneyCompact,
  useMmsScope,
} from '../../components/marketing/management/MmsKit'
import {
  ActivityList,
  CampaignCard,
  DateRangeTabs,
  MmsKpiGrid,
  MmsTwoCol,
  PipelineFunnel,
  PlanCard,
  SectorCard,
  TeamMemberCard,
} from '../../components/marketing/management/MmsLists'
import { BudgetAllocationModal, PlanFormModal, ApprovalRequestModal } from '../../components/marketing/management/MmsModals'
import { EmployeeProfileModal } from '../../components/marketing/management/MmsOpsModals'
import type { MarketingEmployee, MarketingLead, MarketingPlan, MarketingSector } from '../../types/marketingDepartment'
import {
  budgetSummary,
  campaignActualLeads,
  employeeStats,
  inRange,
  isFollowUpOverdue,
  leadStats,
  monthKey,
  planTone,
  rangeForPreset,
  roleLabel,
  sectorStats,
  shortDate,
  taskStats,
  walletSummary,
} from '../../utils/marketingDepartment'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../../utils/format'

/* ------------------------------------------------------------------ */
/* Budget management                                                   */
/* ------------------------------------------------------------------ */

export function BudgetsPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const navigate = useNavigate()
  const [budgetSector, setBudgetSector] = useState<MarketingSector | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)

  const sectors = scope.mySectors.length ? scope.mySectors : department.sectors
  const budget = budgetSummary(sectors)
  const pendingRequests = department.approvalRequests.filter(
    (request) => request.kind === 'Budget Request' && request.status !== 'Approved' && request.status !== 'Rejected',
  )
  const expenses = scope.expenses
  const committed = expenses
    .filter((expense) => ['Under Senior Review', 'Manager Review', 'Finance Review', 'Approved'].includes(expense.status))
    .reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow="Manager workspace"
        title="Budget Management"
        subtitle="Allocate sector budgets for planning, track spend and send new funding requests to Finance/Admin for final approval."
        actions={
          <>
            <Button variant="soft" icon={<ClipboardList size={15} />} onClick={() => navigate(roleWorkspacePath('approvals'))}>Approval center</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setRequestOpen(true)}>Request budget</Button>
          </>
        }
        meta={
          <div className="mms-header-meta">
            <span><Wallet size={13} /> {moneyCompact(budget.total)} allocated</span>
            <span><IndianRupee size={13} /> {moneyCompact(budget.spent)} spent</span>
            <span><ShieldCheck size={13} /> Finance/Admin final approval</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Total allocated" value={budget.total} icon={<Wallet size={18} />} tone="var(--chart-1)" format={(value) => moneyCompact(value)} hint={`${sectors.length} sectors`} />
        <KpiCard label="Spent" value={budget.spent} icon={<IndianRupee size={18} />} tone="var(--chart-3)" format={(value) => moneyCompact(value)} hint={`${formatPercent(budget.utilisation)} utilisation`} />
        <KpiCard label="Remaining" value={budget.remaining} icon={<BadgeCheck size={18} />} tone="var(--chart-2)" format={(value) => moneyCompact(value)} hint="Available for planning" />
        <KpiCard label="Committed claims" value={committed} icon={<ClipboardList size={18} />} tone="var(--chart-5)" format={(value) => moneyCompact(value)} hint={`${pendingRequests.length} budget requests pending`} />
      </MmsKpiGrid>

      <div className="mms-inline-notice">
        <ShieldCheck size={15} />
        <div>
          <strong>Sector allocation is a manager planning control.</strong>
          <span>New funding, reallocation above the approved envelope and final payment release require Finance/Admin approval.</span>
        </div>
      </div>

      <SectionCard title="Sector budgets" subtitle="Allocated budget, committed spend and utilisation" flush>
        <div className="mms-table-wrap">
          <table className="mms-table">
            <thead>
              <tr>
                <th>Sector</th>
                <th>Allocated</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Utilisation</th>
                <th>Lead target</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sectors.map((sector) => {
                const stat = sectorStats(sector, department.employees, department.leads, department.tasks)
                return (
                  <tr key={sector.id}>
                    <td><SectorChip sector={sector} /></td>
                    <td><strong>{formatINR(sector.budget)}</strong></td>
                    <td>{formatINR(sector.spent)}</td>
                    <td>{formatINR(stat.remainingBudget)}</td>
                    <td>
                      <div className="mms-target-cell">
                        <span>{formatPercent(stat.budgetUtilisation)}</span>
                        <ProgressBar value={Math.min(100, stat.budgetUtilisation)} size="sm" tone={stat.budgetUtilisation > 95 ? 'danger' : 'brand'} />
                      </div>
                    </td>
                    <td>{formatNumber(sector.monthlyLeadTarget)}</td>
                    <td>
                      <div className="mms-table__actions">
                        <Button size="xs" variant="ghost" onClick={() => setBudgetSector(sector)}>Allocate</Button>
                        <Button size="xs" variant="ghost" onClick={() => navigate(roleWorkspacePath('department'))}>Manage</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <MmsTwoCol variant="2-1">
        <ChartCard title="Budget vs actual by sector" subtitle="Allocated budget and recorded spend" height="md">
          <BarChart
            data={sectors.map((sector) => ({ name: sector.code, budget: sector.budget, spent: sector.spent }))}
            margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={(value) => moneyCompact(Number(value))} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} />
            <Bar dataKey="budget" name="Allocated" fill="var(--chart-1)" radius={[5, 5, 0, 0]} />
            <Bar dataKey="spent" name="Spent" fill="var(--chart-3)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ChartCard>

        <SectionCard title="Expense commitment" subtitle="Claims in the approval pipeline" icon={<ClipboardList size={16} />}>
          <div className="mms-stage-summary">
            {['Under Senior Review', 'Manager Review', 'Finance Review', 'Approved'].map((status) => {
              const amount = expenses.filter((expense) => expense.status === status).reduce((sum, expense) => sum + expense.amount, 0)
              return (
                <div key={status}>
                  <StatusChip status={status} />
                  <strong>{moneyCompact(amount)}</strong>
                </div>
              )
            })}
          </div>
          <p className="mms-empty-line">Manager approval only forwards a claim. Finance/Admin final approval controls release.</p>
          <Button variant="soft" block onClick={() => navigate(roleWorkspacePath('expenses'))}>Review expenses</Button>
        </SectionCard>
      </MmsTwoCol>

      <SectionCard title="Pending budget requests" subtitle="Marketing requests waiting for manager or Finance action" icon={<Wallet size={16} />}>
        <div className="mms-mini-queue-list">
          {pendingRequests.map((request) => (
            <div key={request.id} className="mms-mini-row">
              <span className="mms-mini-row__icon"><Wallet size={14} /></span>
              <div>
                <strong>{request.title}</strong>
                <small>{request.submittedByName} · {request.amount ? formatINR(request.amount) : 'No amount'} · {request.status}</small>
              </div>
              <StatusChip status={request.status} />
            </div>
          ))}
          {!pendingRequests.length ? <p className="mms-empty-line">No pending budget requests.</p> : null}
        </div>
      </SectionCard>

      <BudgetAllocationModal open={Boolean(budgetSector)} sector={budgetSector} onClose={() => setBudgetSector(null)} />
      <ApprovalRequestModal open={requestOpen} onClose={() => setRequestOpen(false)} defaultSectorId={sectors[0]?.id} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Marketing planning                                                  */
/* ------------------------------------------------------------------ */

type PlanSortKey = 'title' | 'budget' | 'deadline' | 'status'

export function PlanningPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [formOpen, setFormOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<MarketingPlan | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<PlanSortKey>('deadline')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [decision, setDecision] = useState<{ plan: MarketingPlan; stage: 'manager' | 'finance' } | null>(null)
  const pageSize = 8

  const employeeById = (id: string | null | undefined) =>
    department.employees.find((employee) => employee.id === id)
  const sectorById = (id: string) => department.sectors.find((sector) => sector.id === id)

  const plans = department.plans.filter((plan) => {
    if (scope.roleId === 'manager') return true
    if (plan.createdById === scope.profile.employeeId) return true
    return scope.mySectors.some((sector) => sector.id === plan.sectorId)
  })

  const monthOptions = Array.from(new Set(plans.map((plan) => plan.startDate.slice(0, 7)))).sort()
  const scoped = plans.filter((plan) => {
    const creator = employeeById(plan.createdById)
    const text = `${plan.title} ${plan.type} ${plan.objective} ${plan.targetAudience}`.toLowerCase()
    if (search.trim() && !text.includes(search.trim().toLowerCase())) return false
    if (roleFilter !== 'all' && creator?.role !== roleFilter) return false
    if (teamFilter !== 'all' && plan.seniorId !== teamFilter) return false
    if (monthFilter !== 'all' && plan.startDate.slice(0, 7) !== monthFilter) return false
    if (statusFilter !== 'all' && plan.status !== statusFilter) return false
    return true
  })

  const sorted = [...scoped].sort((a, b) => {
    const direction = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'budget') return (a.budget - b.budget) * direction
    if (sortKey === 'title') return a.title.localeCompare(b.title) * direction
    if (sortKey === 'status') return a.status.localeCompare(b.status) * direction
    return a.deadline.localeCompare(b.deadline) * direction
  })
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const totalBudget = plans.reduce((sum, plan) => sum + plan.budget, 0)
  const pendingManager = plans.filter((plan) => plan.status === 'Pending Manager Review').length
  const pendingFinance = plans.filter((plan) => plan.status === 'Pending Finance Approval').length

  function toggleSort(key: PlanSortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function resetFilters() {
    setSearch('')
    setRoleFilter('all')
    setTeamFilter('all')
    setMonthFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  const canEditPlan = (plan: MarketingPlan) =>
    scope.roleId === 'manager' ||
    (plan.createdById === scope.profile.employeeId &&
      ['Draft', 'Changes Requested', 'Rejected'].includes(plan.status))

  const SortHeader = ({ label, column }: { label: string; column: PlanSortKey }) => (
    <button type="button" className="mms-sort-btn" onClick={() => toggleSort(column)}>
      {label}
      <ArrowUpDown size={12} className={sortKey === column ? 'is-active' : ''} />
    </button>
  )

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'manager' ? 'Manager workspace' : 'Planning workspace'}
        title="Marketing Planning"
        subtitle="Create plans, route them through manager and Finance review, and track every approval decision."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setEditPlan(null); setFormOpen(true) }}>Create plan</Button>
        }
        meta={
          <div className="mms-header-meta">
            <span><Compass size={13} /> {plans.length} plans</span>
            <span><ClipboardList size={13} /> {pendingManager + pendingFinance} awaiting approval</span>
            <span><Wallet size={13} /> {moneyCompact(totalBudget)} planned</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Total plans" value={plans.length} icon={<Compass size={18} />} tone="var(--chart-1)" hint={`${plans.filter((plan) => plan.status === 'Active').length} active`} />
        <KpiCard label="Manager review" value={pendingManager} icon={<ClipboardList size={18} />} tone="var(--chart-4)" hint="Awaiting manager decision" />
        <KpiCard label="Finance review" value={pendingFinance} icon={<BadgeCheck size={18} />} tone="var(--chart-2)" hint="Manager approved, Finance pending" />
        <KpiCard label="Planned budget" value={totalBudget} icon={<Wallet size={18} />} tone="var(--chart-3)" format={(value) => moneyCompact(value)} hint="Across visible plans" />
      </MmsKpiGrid>

      <SectionCard
        title="Plan register"
        subtitle="Primary list view with workable filters, approval history and role-based actions."
        icon={<Compass size={16} />}
        actions={<span className="mms-list-count">{sorted.length} of {plans.length} plans</span>}
      >
        <div className="mms-filter-bar">
          <SearchField value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search plans, objectives or audience." />
          <MmsSelect label="Role" value={roleFilter} onChange={(value) => { setRoleFilter(value); setPage(1) }} allLabel="All roles" options={[{ value: 'manager', label: 'Manager' }, { value: 'senior', label: 'Senior' }, { value: 'junior', label: 'Junior' }]} />
          <MmsSelect label="Team" value={teamFilter} onChange={(value) => { setTeamFilter(value); setPage(1) }} allLabel="All teams" options={department.employees.filter((employee) => employee.role === 'senior').map((senior) => ({ value: senior.id, label: senior.name }))} />
          <MmsSelect label="Month" value={monthFilter} onChange={(value) => { setMonthFilter(value); setPage(1) }} allLabel="All months" options={monthOptions.map((month) => ({ value: month, label: new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) }))} />
          <MmsSelect label="Status" value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1) }} allLabel="All statuses" options={PLAN_FLOW_STATUSES.map((status) => ({ value: status, label: status }))} />
          <Button size="xs" variant="ghost" onClick={resetFilters}>Reset filters</Button>
        </div>

        <div className="mms-table-wrap">
          <table className="mms-table mms-plan-table">
            <thead>
              <tr>
                <th><SortHeader label="Plan" column="title" /></th>
                <th>Team &amp; owner</th>
                <th>Created by</th>
                <th><SortHeader label="Window" column="deadline" /></th>
                <th><SortHeader label="Budget" column="budget" /></th>
                <th><SortHeader label="Status" column="status" /></th>
                <th>Approval</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((plan) => {
                const creator = employeeById(plan.createdById)
                const senior = employeeById(plan.seniorId)
                const sector = sectorById(plan.sectorId)
                const expanded = expandedId === plan.id
                const pendingDecision = plan.status === 'Pending Manager Review' || plan.status === 'Pending Finance Approval'
                return (
                  <Fragment key={plan.id}>
                    <tr className={expanded ? 'is-expanded' : ''}>
                      <td>
                        <button type="button" className="mms-plan-title-btn" onClick={() => setExpandedId(expanded ? null : plan.id)}>
                          <ChevronDown size={14} className={expanded ? 'is-open' : ''} />
                          <span>
                            <strong>{plan.title}</strong>
                            <small>{plan.type} &middot; {plan.priority} priority</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="mms-cell-stack">
                          <strong>{sector?.name ?? 'No sector'}</strong>
                          <small>{senior?.name ?? 'No senior owner'}</small>
                        </span>
                      </td>
                      <td>
                        <span className="mms-cell-stack">
                          <strong>{creator?.name ?? 'Marketing team'}</strong>
                          <small>{roleLabel(creator?.role ?? 'junior')}</small>
                        </span>
                      </td>
                      <td>{shortDate(plan.startDate)} – {shortDate(plan.deadline)}</td>
                      <td>{moneyCompact(plan.budget)}</td>
                      <td><StatusChip status={plan.status} tone={planTone(plan.status)} /></td>
                      <td>
                        <PlanApprovalTrail plan={plan} />
                      </td>
                      <td>
                        <div className="mms-row-actions">
                          {pendingDecision ? (
                            <Button size="xs" variant="soft" onClick={() => setDecision({ plan, stage: plan.status === 'Pending Manager Review' ? 'manager' : 'finance' })}>
                              Review
                            </Button>
                          ) : null}
                          {canEditPlan(plan) ? (
                            <Button size="xs" variant="ghost" onClick={() => { setEditPlan(plan); setFormOpen(true) }}>Edit</Button>
                          ) : null}
                          {plan.status === 'Draft' && plan.createdById === scope.profile.employeeId ? (
                            <Button size="xs" variant="primary" onClick={() => department.submitPlan(plan.id, scope.actor)}>Submit</Button>
                          ) : null}
                          {plan.status === 'Changes Requested' || plan.status === 'Rejected' ? (
                            <Button size="xs" variant="soft" onClick={() => department.submitPlan(plan.id, scope.actor)}>Resubmit</Button>
                          ) : null}
                          {scope.roleId === 'manager' && plan.status === 'Active' ? (
                            <Button size="xs" variant="ghost" onClick={() => department.updatePlan(plan.id, { status: 'Completed' }, scope.actor, 'Plan marked completed.')}>Complete</Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="mms-expand-row">
                        <td colSpan={8}>
                          <div className="mms-plan-detail">
                            <div className="mms-plan-detail__main">
                              <div>
                                <span className="mms-eyebrow">Objective</span>
                                <p>{plan.objective}</p>
                              </div>
                              <div className="mms-plan-detail__grid">
                                <div><span>Target audience</span><strong>{plan.targetAudience || '-'}</strong></div>
                                <div><span>Expected results</span><strong>{plan.expectedResults || '-'}</strong></div>
                                <div><span>Created</span><strong>{shortDate(plan.createdAt)}</strong></div>
                                <div><span>Submitted</span><strong>{shortDate(plan.submittedAt)}</strong></div>
                                <div><span>Manager remarks</span><strong>{plan.managerRemarks || '—'}</strong></div>
                                <div><span>Finance remarks</span><strong>{plan.financeRemarks || '—'}</strong></div>
                              </div>
                              <PlanWorkflow plan={plan} />
                            </div>
                            <div className="mms-plan-detail__history">
                              <h4>Approval history</h4>
                              <TimelineList items={(plan.history ?? []).map((entry) => ({ ...entry, tone: entry.tone }))} emptyLabel="No workflow history recorded." />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {!visible.length ? <EmptyBlock icon={<Compass size={20} />} title="No plans match these filters" description="Adjust the search, role, team, month or status filters to see more plans." /> : null}
        </div>

        <div className="mms-pagination">
          <span>Showing {visible.length} of {sorted.length} plans</span>
          <div>
            <Button size="xs" variant="ghost" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
            <span className="mms-pagination__page">Page {currentPage} of {pageCount}</span>
            <Button size="xs" variant="ghost" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button>
          </div>
        </div>
      </SectionCard>

      <PlanFormModal open={formOpen} plan={editPlan} onClose={() => { setFormOpen(false); setEditPlan(null) }} />
      <PlanDecisionModal
        decision={decision}
        onClose={() => setDecision(null)}
        onDecide={(choice, note) => {
          if (!decision) return
          if (decision.stage === 'manager') {
            department.decidePlanManager(decision.plan.id, choice, scope.actor, note)
          } else {
            department.decidePlanFinance(decision.plan.id, choice === 'changes' ? 'reject' : choice, scope.actor, note)
          }
          setDecision(null)
        }}
      />
    </div>
  )
}

const PLAN_FLOW_STATUSES: MarketingPlan['status'][] = [
  'Draft',
  'Pending Manager Review',
  'Pending Finance Approval',
  'Active',
  'Completed',
  'Changes Requested',
  'Rejected',
]

function PlanApprovalTrail({ plan }: { plan: MarketingPlan }) {
  const managerDone = ['Pending Finance Approval', 'Active', 'Completed'].includes(plan.status)
  const financeDone = ['Active', 'Completed'].includes(plan.status)
  return (
    <div className="mms-approval-trail">
      <span className={managerDone ? 'is-done' : plan.status === 'Pending Manager Review' ? 'is-current' : ''}>M</span>
      <i />
      <span className={financeDone ? 'is-done' : plan.status === 'Pending Finance Approval' ? 'is-current' : ''}>F</span>
      <i />
      <span className={['Active', 'Completed'].includes(plan.status) ? 'is-done' : plan.status === 'Rejected' ? 'is-rejected' : ''}>A</span>
    </div>
  )
}

function PlanWorkflow({ plan }: { plan: MarketingPlan }) {
  const steps = [
    { label: 'Created', done: true, note: plan.createdAt },
    {
      label: 'Manager review',
      done: ['Pending Finance Approval', 'Active', 'Completed'].includes(plan.status),
      current: plan.status === 'Pending Manager Review',
      note: plan.managerReviewerName ? `${plan.managerReviewerName} · ${shortDate(plan.managerReviewedAt)}` : 'Pending',
    },
    {
      label: 'Finance approval',
      done: ['Active', 'Completed'].includes(plan.status),
      current: plan.status === 'Pending Finance Approval',
      note: plan.financeReviewerName ? `${plan.financeReviewerName} · ${shortDate(plan.financeReviewedAt)}` : 'Pending',
    },
    {
      label: 'Active',
      done: ['Active', 'Completed'].includes(plan.status),
      current: false,
      note: plan.status === 'Completed' ? 'Completed' : plan.status === 'Active' ? 'Live plan' : 'Not active',
    },
  ]
  return (
    <div className="mms-workflow-steps">
      {steps.map((step, index) => (
        <div key={step.label} className={`mms-workflow-step ${step.done ? 'is-done' : ''} ${step.current ? 'is-current' : ''}`.trim()}>
          <span>{step.done ? <CheckCircle2 size={13} /> : index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <small>{step.note}</small>
          </div>
          {index < steps.length - 1 ? <i aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  )
}

function PlanDecisionModal({
  decision,
  onClose,
  onDecide,
}: {
  decision: { plan: MarketingPlan; stage: 'manager' | 'finance' } | null
  onClose: () => void
  onDecide: (choice: 'approve' | 'reject' | 'changes', note: string) => void
}) {
  const [note, setNote] = useState('')
  useEffect(() => {
    if (decision) setNote('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision?.plan.id, decision?.stage])
  if (!decision) return null
  const isManager = decision.stage === 'manager'
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={isManager ? 'Manager review decision' : 'Record Finance/Admin decision'}
      description={
        isManager
          ? `Review ${decision.plan.title}. Approval forwards the plan to Finance; rejection or change requests return it to the creator.`
          : `Record the Finance/Admin outcome for ${decision.plan.title}. Finance decisions are captured here because this demo has no separate Finance login.`
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {isManager ? <Button variant="soft" onClick={() => onDecide('changes', note || 'Changes requested by the manager.')}>Request changes</Button> : null}
          <Button variant="danger" onClick={() => onDecide('reject', note || 'Rejected during review.')}>Reject</Button>
          <Button variant="primary" onClick={() => onDecide('approve', note || (isManager ? 'Approved and forwarded to Finance.' : 'Finance/Admin approved the plan.'))}>
            {isManager ? 'Approve & forward' : 'Record approval'}
          </Button>
        </>
      }
    >
      <div className="mms-stack">
        <div className="mms-decision-summary">
          <div><span>Plan</span><strong>{decision.plan.title}</strong></div>
          <div><span>Budget</span><strong>{moneyCompact(decision.plan.budget)}</strong></div>
          <div><span>Sector</span><strong>{decision.plan.sectorId}</strong></div>
          <div><span>Deadline</span><strong>{shortDate(decision.plan.deadline)}</strong></div>
        </div>
        <Field label="Remarks" hint="The remarks are saved in the approval history and shared with the creator.">
          <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder={isManager ? 'Add budget, scope or timing guidance…' : 'Add Finance/Admin approval note…'} />
        </Field>
      </div>
    </Modal>
  )
}

function MegaphoneIcon() {
  return <TrendingUp size={13} />
}

/* ------------------------------------------------------------------ */
/* Team performance                                                    */
/* ------------------------------------------------------------------ */

type PerfMetric = 'score' | 'leads' | 'qualified' | 'sent' | 'calls' | 'followUps' | 'overdue' | 'expenses'

export function TeamPerformancePage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [selected, setSelected] = useState<MarketingEmployee | null>(null)
  const [view, setView] = useState('team')
  const [teamFilter, setTeamFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const defaultExpenseMonth =
    department.expenses
      .filter((expense) => expense.status === 'Approved')
      .map((expense) => monthKey(expense.expenseDate))
      .sort()
      .reverse()[0] ?? monthKey()
  const [monthFilter, setMonthFilter] = useState(() => defaultExpenseMonth)
  const [sortKey, setSortKey] = useState<PerfMetric>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const baseTeam =
    scope.roleId === 'manager'
      ? department.employees.filter((employee) => employee.role === 'senior' || employee.role === 'junior')
      : scope.roleId === 'senior'
        ? scope.team
        : scope.employee
          ? [scope.employee]
          : []
  const teamSectors = scope.roleId === 'manager' ? department.sectors : scope.mySectors
  const monthOptions = Array.from(new Set([
    monthKey(),
    ...department.walletAllocations.map((allocation) => allocation.month),
    ...department.expenses.map((expense) => monthKey(expense.expenseDate)),
  ])).sort().reverse()
  const monthLabel = new Date(`${monthFilter}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const effectiveTeamFilter = teamSectors.some((sector) => sector.id === teamFilter) ? teamFilter : 'all'
  const effectiveRoleFilter = scope.roleId === 'manager' ? roleFilter : 'all'
  const team = baseTeam.filter((employee) => {
    if (effectiveTeamFilter !== 'all' && employee.sectorId !== effectiveTeamFilter) return false
    if (effectiveRoleFilter !== 'all' && employee.role !== effectiveRoleFilter) return false
    return true
  })
  const teamIds = new Set(team.map((employee) => employee.id))

  const performance = team.map((employee) => {
    const stat = employeeStats(employee, department.leads, department.tasks, department.followUps, department.activities)
    const ownLeads = department.leads.filter(
      (lead) => lead.assignedJuniorId === employee.id || lead.createdById === employee.id,
    )
    const ownTasks = department.tasks.filter(
      (task) =>
        task.assignedJuniorId === employee.id ||
        (task.assigneeType !== 'junior' && task.assignedSeniorId === employee.id),
    )
    const ownFollowUps = department.followUps.filter((followUp) => followUp.employeeId === employee.id)
    const wallet = walletSummary(department.expenses, department.walletAllocations, employee.id, monthFilter)
    const sentToSales = ownLeads.filter((lead) => Boolean(lead.handover)).length
    const calls = department.activities.filter((entry) => entry.employeeId === employee.id && entry.type === 'Phone Call').length
    const overdueTasks = taskStats(ownTasks).overdue
    const overdueFollowUps = ownFollowUps.filter(isFollowUpOverdue).length
    const taskCompletion = stat.assignedTasks ? (stat.completedTasks / stat.assignedTasks) * 100 : 0
    const followUpCompletion = ownFollowUps.length ? (stat.followUpsCompleted / ownFollowUps.length) * 100 : 0
    const score = Math.round(
      Math.min(100, stat.targetAchievement) * 0.4 + taskCompletion * 0.3 + followUpCompletion * 0.3,
    )
    return {
      employee,
      sector: department.sectors.find((sector) => sector.id === employee.sectorId),
      stat,
      ownLeads,
      sentToSales,
      calls,
      followUps: ownFollowUps.length,
      overdueTasks,
      overdueFollowUps,
      wallet,
      score,
    }
  })

  const sortedPerformance = [...performance].sort((a, b) => {
    const value = (row: typeof a) => {
      if (sortKey === 'leads') return row.stat.leadsGenerated
      if (sortKey === 'qualified') return row.stat.qualifiedLeads
      if (sortKey === 'sent') return row.sentToSales
      if (sortKey === 'calls') return row.calls
      if (sortKey === 'followUps') return row.stat.followUpsCompleted
      if (sortKey === 'overdue') return row.overdueTasks + row.overdueFollowUps
      if (sortKey === 'expenses') return row.wallet.spent
      return row.score
    }
    return (value(a) - value(b)) * (sortDir === 'asc' ? 1 : -1)
  })

  const ranking = [...performance].sort((a, b) => b.score - a.score)
  const scopedLeadMap = new Map<string, MarketingLead>()
  performance.forEach((row) => row.ownLeads.forEach((lead) => scopedLeadMap.set(lead.id, lead)))
  const scopedLeads = [...scopedLeadMap.values()]
  const scopedLeadIds = new Set(scopedLeads.map((lead) => lead.id))
  const scopedFollowUps = department.followUps.filter(
    (followUp) => teamIds.has(followUp.employeeId) || scopedLeadIds.has(followUp.leadId),
  )
  const scopedTasks = department.tasks.filter(
    (task) => teamIds.has(task.assignedJuniorId ?? '') || teamIds.has(task.assignedSeniorId ?? ''),
  )
  const leadSummary = leadStats(scopedLeads, scopedFollowUps)
  const taskSummary = taskStats(scopedTasks)
  const callsLogged = performance.reduce((sum, row) => sum + row.calls, 0)
  const expensesSpent = performance.reduce((sum, row) => sum + row.wallet.spent, 0)
  const overdueFollowUps = performance.reduce((sum, row) => sum + row.overdueFollowUps, 0)
  const completedFollowUps = scopedFollowUps.filter((followUp) => followUp.status === 'Completed').length
  const teamActivity = department.activities
    .filter((entry) => teamIds.has(entry.employeeId))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const performanceChart = sortedPerformance.map((row) => ({
    name: row.employee.name.split(' ')[0],
    leads: row.stat.leadsGenerated,
    qualified: row.stat.qualifiedLeads,
    sent: row.sentToSales,
  }))
  const sectorPerformance = teamSectors.map((sector) => {
    const stat = sectorStats(sector, department.employees, department.leads, department.tasks)
    return { name: sector.code, target: sector.monthlyLeadTarget, actual: stat.totalLeads, performance: stat.performance }
  })

  function toggleSort(next: PerfMetric) {
    if (sortKey === next) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(next)
      setSortDir('desc')
    }
  }

  function resetFilters() {
    setTeamFilter('all')
    setRoleFilter('all')
    setMonthFilter(defaultExpenseMonth)
    setSortKey('score')
    setSortDir('desc')
  }

  const SortHeader = ({ label, column }: { label: string; column: PerfMetric }) => (
    <button type="button" className="mms-sort-btn" onClick={() => toggleSort(column)}>
      {label}
      <ArrowUpDown size={12} className={sortKey === column ? 'is-active' : ''} />
    </button>
  )

  if (scope.roleId === 'junior') {
    const me = scope.employee
    const stat = me ? employeeStats(me, department.leads, department.tasks, department.followUps, department.activities) : null
    const target = me?.targetLeads ?? 120
    const personalWallet = me ? walletSummary(department.expenses, department.walletAllocations, me.id, monthFilter) : null
    return (
      <div className="mms-page">
        <MmsPageHeader eyebrow="Junior workspace" title="My Performance" subtitle="Target progress, lead quality, follow-up discipline and delivery trends." />
        <div className="mms-junior-hero">
          <div className="mms-junior-hero__ring">
            <div className="mms-ring" style={{ width: 116, height: 116 }}>
              <svg width={116} height={116} viewBox="0 0 116 116" aria-hidden="true">
                <circle cx={58} cy={58} r={53} fill="none" stroke="var(--surface-3)" strokeWidth={7} />
                <circle cx={58} cy={58} r={53} fill="none" stroke="var(--chart-6)" strokeWidth={7} strokeLinecap="round" strokeDasharray={2 * Math.PI * 53} strokeDashoffset={2 * Math.PI * 53 * (1 - Math.min(100, stat?.targetAchievement ?? 0) / 100)} transform="rotate(-90 58 58)" />
              </svg>
              <span className="mms-ring__value"><strong>{stat?.targetAchievement ?? 0}%</strong><small>of target</small></span>
            </div>
          </div>
          <div className="mms-junior-hero__copy">
            <span className="mms-eyebrow">Monthly performance</span>
            <h2>{stat?.leadsGenerated ?? 0} of {target} leads</h2>
            <p>Qualification quality matters more than raw volume. Keep follow-up notes complete and submit only qualified leads to your senior.</p>
          </div>
        </div>
        <MmsKpiGrid columns={4}>
          <KpiCard label="Leads" value={stat?.leadsGenerated ?? 0} icon={<Target size={18} />} tone="var(--chart-6)" hint={`${stat?.qualifiedLeads ?? 0} qualified`} />
          <KpiCard label="Tasks" value={stat?.completedTasks ?? 0} icon={<ClipboardList size={18} />} tone="var(--chart-2)" hint={`${stat?.pendingTasks ?? 0} pending`} />
          <KpiCard label="Follow-ups" value={stat?.followUpsCompleted ?? 0} icon={<CalendarDays size={18} />} tone="var(--chart-4)" hint="Completed conversations" />
          <KpiCard label="Conversion" value={stat?.conversionRate ?? 0} icon={<TrendingUp size={18} />} tone="var(--chart-1)" format={(value) => formatPercent(value)} hint="Sales-recorded wins" />
        </MmsKpiGrid>
        <SectionCard title="Wallet summary" subtitle={`Approved spend against your ${monthLabel} allocation.`} icon={<Wallet size={16} />}>
          <div className="mms-wallet-inline">
            <div><span>Allocated</span><strong>{moneyCompact(personalWallet?.allocation ?? 0)}</strong></div>
            <div><span>Spent</span><strong>{moneyCompact(personalWallet?.spent ?? 0)}</strong></div>
            <div><span>Remaining</span><strong>{moneyCompact(personalWallet?.remaining ?? 0)}</strong></div>
            <div><span>Pending</span><strong>{moneyCompact(personalWallet?.pendingAmount ?? 0)}</strong></div>
          </div>
        </SectionCard>
        <MmsTwoCol variant="1-1">
          <ChartCard title="Department trend" subtitle="Monthly leads and qualification" height="md">
            <LineChart data={department.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" strokeWidth={2} />
              <Line type="monotone" dataKey="qualified" name="Qualified" stroke="var(--chart-2)" strokeWidth={2} />
            </LineChart>
          </ChartCard>
          <SectionCard title="Coaching focus" subtitle="How to improve this month">
            <ul className="mms-rule-list">
              <li><Target size={14} /> Verify customer budget and authority before submitting for review.</li>
              <li><CalendarDays size={14} /> Complete every follow-up on the scheduled day.</li>
              <li><CheckCircle2 size={14} /> Add clear outcome notes so your senior can validate quickly.</li>
            </ul>
          </SectionCard>
        </MmsTwoCol>
      </div>
    )
  }

  const topPerformer = ranking[0]
  const needsSupport = [...performance].sort((a, b) => a.score - b.score)[0]

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'manager' ? 'Manager workspace' : 'Senior workspace'}
        title="Team Performance"
        subtitle={scope.roleId === 'manager' ? 'Compare teams and executives across leads, qualification, sales handovers, follow-ups, expenses and productivity.' : 'Junior scorecards, target progress, delivery quality and coaching needs.'}
        meta={
          <div className="mms-header-meta">
            <span><Users size={13} /> {team.length} team members</span>
            <span><Target size={13} /> {leadSummary.total} leads in scope</span>
            <span><CalendarDays size={13} /> {monthLabel}</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Team members" value={team.length} icon={<Users size={18} />} tone="var(--chart-1)" hint={`${team.filter((employee) => employee.role === 'junior').length} juniors · ${team.filter((employee) => employee.role === 'senior').length} seniors`} />
        <KpiCard label="Leads generated" value={leadSummary.total} icon={<Target size={18} />} tone="var(--chart-3)" hint={`${leadSummary.inPipeline} still in pipeline`} />
        <KpiCard label="Qualified leads" value={leadSummary.qualified} icon={<BadgeCheck size={18} />} tone="var(--chart-2)" format={(value) => formatNumber(value)} hint={`${formatPercent(leadSummary.qualificationRate, 0)} qualification rate`} />
        <KpiCard label="Sent to Sales" value={leadSummary.sentToSales} icon={<Send size={18} />} tone="var(--chart-5)" hint={`${leadSummary.converted} won by Sales`} />
      </MmsKpiGrid>

      <MmsKpiGrid columns={4}>
        <KpiCard label="Calls logged" value={callsLogged} icon={<Phone size={18} />} tone="var(--chart-4)" hint="Team phone activity" />
        <KpiCard label="Follow-ups completed" value={completedFollowUps} icon={<CheckCircle2 size={18} />} tone="var(--chart-6)" hint={`${overdueFollowUps} overdue follow-ups`} />
        <KpiCard label="Overdue tasks" value={taskSummary.overdue} icon={<AlertTriangle size={18} />} tone="var(--chart-7)" hint={`${taskSummary.pending} open · ${taskSummary.review} in review`} />
        <KpiCard label={`Expenses · ${monthLabel}`} value={expensesSpent} icon={<Wallet size={18} />} tone="var(--chart-1)" format={(value) => moneyCompact(value)} hint="Approved claims only" />
      </MmsKpiGrid>

      <MmsTwoCol variant="2-1">
        <ChartCard title="Executive delivery" subtitle="Leads, qualification and sales handovers by team member" height="md">
          <BarChart data={performanceChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="leads" name="Leads" fill="var(--chart-1)" radius={[5, 5, 0, 0]} />
            <Bar dataKey="qualified" name="Qualified" fill="var(--chart-2)" radius={[5, 5, 0, 0]} />
            <Bar dataKey="sent" name="Sent to Sales" fill="var(--chart-5)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ChartCard>
        <SectionCard title="Productivity ranking" subtitle="Target, task and follow-up discipline" icon={<TrendingUp size={16} />}>
          <div className="mms-ranking-list">
            {ranking.map((row, index) => (
              <button key={row.employee.id} type="button" className="mms-ranking-row" onClick={() => setSelected(row.employee)}>
                <span className={`mms-ranking-rank ${index < 3 ? 'is-top' : ''}`.trim()}>{index + 1}</span>
                <EmployeeAvatar employee={row.employee} />
                <div className="mms-ranking-main">
                  <strong>{row.employee.name}</strong>
                  <small>{row.sector?.code ?? 'No sector'} · {row.employee.role}</small>
                  <ProgressBar value={Math.min(100, row.score)} size="sm" tone={row.score >= 80 ? 'success' : row.score >= 50 ? 'brand' : 'warning'} />
                </div>
                <span className="mms-ranking-score"><strong>{row.score}</strong><small>score</small></span>
              </button>
            ))}
            {!ranking.length ? <p className="mms-empty-line">No team members match these filters.</p> : null}
          </div>
        </SectionCard>
      </MmsTwoCol>

      <MmsTwoCol variant="1-1">
        <ChartCard title="Lead progression trend" subtitle="Monthly leads, qualification and Sales wins" height="md">
          <LineChart data={department.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" strokeWidth={2} />
            <Line type="monotone" dataKey="qualified" name="Qualified" stroke="var(--chart-2)" strokeWidth={2} />
            <Line type="monotone" dataKey="converted" name="Won" stroke="var(--chart-7)" strokeWidth={2} />
          </LineChart>
        </ChartCard>
        <SectionCard title="Pipeline funnel" subtitle="Shared pipeline across the selected team" icon={<Target size={16} />}>
          <PipelineFunnel leads={scopedLeads} />
        </SectionCard>
      </MmsTwoCol>

      <div className="mms-toolbar-row">
        <MmsTabs
          value={view}
          onChange={setView}
          ariaLabel="Performance view"
          options={[{ id: 'team', label: 'Team scorecard' }, { id: 'cards', label: 'Member cards' }]}
        />
      </div>

      {view === 'team' ? (
        <SectionCard
          title="Team performance register"
          subtitle="Leads, qualification, calls, follow-ups, overdue work, monthly expenses and productivity."
          icon={<ClipboardList size={16} />}
          actions={<span className="mms-list-count">{sortedPerformance.length} of {baseTeam.length} members</span>}
        >
          <div className="mms-filter-bar">
            <MmsSelect label="Team" value={effectiveTeamFilter} onChange={setTeamFilter} allLabel="All teams" options={teamSectors.map((sector) => ({ value: sector.id, label: sector.name }))} />
            {scope.roleId === 'manager' ? <MmsSelect label="Role" value={effectiveRoleFilter} onChange={setRoleFilter} allLabel="All roles" options={[{ value: 'senior', label: 'Seniors' }, { value: 'junior', label: 'Juniors' }]} /> : null}
            <label className="mms-select">
              <span>Month</span>
              <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
                {monthOptions.map((key) => <option key={key} value={key}>{new Date(`${key}-01`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</option>)}
              </select>
            </label>
            <label className="mms-select">
              <span>Sort by</span>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as PerfMetric)}>
                <option value="score">Productivity</option>
                <option value="leads">Leads</option>
                <option value="qualified">Qualified</option>
                <option value="sent">Sent to Sales</option>
                <option value="calls">Calls</option>
                <option value="followUps">Follow-ups</option>
                <option value="overdue">Overdue</option>
                <option value="expenses">Expenses</option>
              </select>
            </label>
            <Button size="xs" variant="ghost" onClick={resetFilters}>Reset filters</Button>
          </div>
          <div className="mms-table-wrap">
            <table className="mms-table mms-table--compact mms-plan-table">
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Team</th>
                  <th>Role</th>
                  <th><SortHeader label="Leads" column="leads" /></th>
                  <th><SortHeader label="Qualified" column="qualified" /></th>
                  <th><SortHeader label="Sent to Sales" column="sent" /></th>
                  <th><SortHeader label="Calls" column="calls" /></th>
                  <th><SortHeader label="Follow-ups" column="followUps" /></th>
                  <th><SortHeader label="Overdue" column="overdue" /></th>
                  <th><SortHeader label="Expenses" column="expenses" /></th>
                  <th>Target</th>
                  <th><SortHeader label="Productivity" column="score" /></th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sortedPerformance.map((row) => {
                  const overdue = row.overdueTasks + row.overdueFollowUps
                  return (
                    <tr key={row.employee.id}>
                      <td className="mms-table__clickable" onClick={() => setSelected(row.employee)}>
                        <EmployeeAvatar employee={row.employee} showRole />
                      </td>
                      <td><SectorChip sector={row.sector} compact /></td>
                      <td><span className={`mms-role-pill mms-role-pill--${row.employee.role}`}>{row.employee.role}</span></td>
                      <td><strong>{row.stat.leadsGenerated}</strong></td>
                      <td>{row.stat.qualifiedLeads}</td>
                      <td>{row.sentToSales}</td>
                      <td>{row.calls}</td>
                      <td><strong>{row.stat.followUpsCompleted}</strong> <small>of {row.followUps}</small></td>
                      <td>{overdue ? <Badge tone="danger" dot>{overdue}</Badge> : '—'}</td>
                      <td>
                        <span className="mms-cell-stack">
                          <strong>{moneyCompact(row.wallet.spent)}</strong>
                          <small>of {moneyCompact(row.wallet.allocation)}</small>
                        </span>
                      </td>
                      <td>
                        <div className="mms-target-cell">
                          <span>{row.stat.targetAchievement}%</span>
                          <ProgressBar value={Math.min(100, row.stat.targetAchievement)} size="sm" tone={row.stat.targetAchievement >= 80 ? 'success' : 'brand'} />
                        </div>
                      </td>
                      <td>
                        <div className="mms-target-cell">
                          <span>{row.score}</span>
                          <ProgressBar value={Math.min(100, row.score)} size="sm" tone={row.score >= 80 ? 'success' : row.score >= 50 ? 'brand' : 'warning'} />
                        </div>
                      </td>
                      <td><Button size="xs" variant="ghost" onClick={() => setSelected(row.employee)}>Open</Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!sortedPerformance.length ? <EmptyBlock icon={<Users size={20} />} title="No team members match these filters" description="Change the team, role or month filter to see performance." /> : null}
          </div>
        </SectionCard>
      ) : (
        <div className="mms-person-grid">
          {sortedPerformance.map((row) => (
            <TeamMemberCard
              key={row.employee.id}
              employee={row.employee}
              leads={department.leads}
              tasks={department.tasks}
              followUps={department.followUps}
              activities={department.activities}
              onOpen={() => setSelected(row.employee)}
            />
          ))}
        </div>
      )}

      <MmsTwoCol variant="2-1">
        <SectionCard title="Recent team activity" subtitle="Calls, visits, follow-ups and campaign work" icon={<CalendarDays size={16} />}>
          <ActivityList activities={teamActivity} sectors={department.sectors} limit={8} />
        </SectionCard>
        <SectionCard title="Coaching signals" subtitle="Based on the current filters" icon={<Lightbulb size={16} />}>
          <ul className="mms-rule-list">
            <li><TrendingUp size={14} /> {topPerformer ? `${topPerformer.employee.name} leads the productivity ranking at ${topPerformer.score}%.` : 'No team members in scope.'}</li>
            <li><AlertTriangle size={14} /> {taskSummary.overdue} overdue tasks and {overdueFollowUps} overdue follow-ups need attention.</li>
            <li><BadgeCheck size={14} /> {needsSupport && needsSupport.score < 50 ? `${needsSupport.employee.name} may need coaching at ${needsSupport.score}% productivity.` : 'Every team member is above the 50% productivity threshold.'}</li>
            <li><Wallet size={14} /> {moneyCompact(expensesSpent)} approved expenses in {monthLabel}.</li>
          </ul>
        </SectionCard>
      </MmsTwoCol>

      <SectionCard title="Sector comparison" subtitle="One shared pipeline across every sector" icon={<Target size={16} />}>
        <div className="mms-sector-grid">
          {teamSectors.map((sector) => (
            <SectorCard key={sector.id} sector={sector} employees={department.employees} leads={department.leads} tasks={department.tasks} />
          ))}
        </div>
      </SectionCard>

      <EmployeeProfileModal open={Boolean(selected)} employee={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export function ReportsPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [range, setRange] = useState(() => rangeForPreset('monthly'))
  const [report, setReport] = useState('overview')

  const sectors = scope.roleId === 'manager' ? department.sectors : scope.mySectors
  const leads = scope.leads.filter((lead) => inRange(lead.createdAt, range))
  const tasks = scope.tasks.filter((task) => inRange(task.createdAt, range) || inRange(task.deadline, range))
  const expenses = scope.expenses.filter((expense) => inRange(expense.expenseDate, range))
  const stats = leadStats(leads, scope.followUps)
  const taskSummary = taskStats(tasks)
  const budget = budgetSummary(sectors)

  const sourceData = useMemo(() => {
    const map = new Map<string, number>()
    for (const lead of leads) map.set(lead.source, (map.get(lead.source) ?? 0) + 1)
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [leads])

  const sectorData = sectors.map((sector) => {
    const sectorLeads = department.leads.filter((lead) => lead.sectorId === sector.id && inRange(lead.createdAt, range))
    return {
      name: sector.code,
      leads: sectorLeads.length,
      qualified: sectorLeads.filter((lead) => ['Qualification', 'Senior Review', 'Manager Review', 'Sent to Sales', 'Sales Follow-up', 'Won'].includes(lead.stage)).length,
      won: sectorLeads.filter((lead) => lead.stage === 'Won').length,
      budget: sector.budget,
      spent: sector.spent,
    }
  })

  function exportCsv() {
    const header = ['Sector', 'Leads', 'Qualified', 'Won', 'Budget', 'Spent']
    const rows = sectorData.map((row) => [row.name, row.leads, row.qualified, row.won, row.budget, row.spent])
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `marketing-report-${range.from}-to-${range.to}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handleRange(next: { preset: 'daily' | 'weekly' | 'monthly' | 'custom'; from: string; to: string }) {
    if (next.preset === 'custom') setRange(next)
    else setRange(rangeForPreset(next.preset))
  }

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'manager' ? 'Manager workspace' : 'Senior workspace'}
        title="Reports"
        subtitle="Department performance, lead conversion, campaign delivery, spend and sales outcomes."
        actions={<Button variant="primary" icon={<Download size={15} />} onClick={exportCsv}>Export CSV</Button>}
        meta={
          <div className="mms-header-meta">
            <span><CalendarDays size={13} /> {range.from} to {range.to}</span>
            <span><FileBarChart size={13} /> Demonstration reporting</span>
          </div>
        }
      />

      <div className="mms-toolbar-row mms-toolbar-row--wrap">
        <DateRangeTabs preset={range.preset} from={range.from} to={range.to} onChange={handleRange} />
        <div className="mms-toolbar-filters">
          <MmsTabs
            value={report}
            onChange={setReport}
            ariaLabel="Report type"
            options={[
              { id: 'overview', label: 'Overview' },
              { id: 'pipeline', label: 'Pipeline' },
              { id: 'spend', label: 'Spend' },
              { id: 'campaigns', label: 'Campaigns' },
            ]}
          />
        </div>
      </div>

      <MmsKpiGrid columns={4}>
        <KpiCard label="Leads in range" value={leads.length} icon={<Target size={18} />} tone="var(--chart-1)" hint={`${stats.qualified} qualified`} />
        <KpiCard label="Sent to Sales" value={stats.sentToSales} icon={<BadgeCheck size={18} />} tone="var(--chart-5)" hint={`${stats.converted} won by Sales`} />
        <KpiCard label="Task completion" value={taskSummary.completion} icon={<ClipboardList size={18} />} tone="var(--chart-3)" format={(value) => `${Math.round(value)}%`} hint={`${taskSummary.completed} of ${taskSummary.total} tasks`} />
        <KpiCard label="Budget utilisation" value={budget.utilisation} icon={<Wallet size={18} />} tone="var(--chart-2)" format={(value) => `${Math.round(value)}%`} hint={`${moneyCompact(budget.spent)} of ${moneyCompact(budget.total)}`} />
      </MmsKpiGrid>

      {report === 'overview' ? (
        <MmsTwoCol variant="2-1">
          <ChartCard title="Lead generation trend" subtitle="Monthly leads, qualification and conversions" height="lg">
            <LineChart data={department.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" strokeWidth={2.2} />
              <Line type="monotone" dataKey="qualified" name="Qualified" stroke="var(--chart-2)" strokeWidth={2.2} />
              <Line type="monotone" dataKey="converted" name="Won" stroke="var(--chart-7)" strokeWidth={2.2} />
            </LineChart>
          </ChartCard>
          <ChartCard title="Lead sources" subtitle="Capture channel mix" height="lg">
            <PieChart>
              <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2}>
                {sourceData.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ChartCard>
        </MmsTwoCol>
      ) : null}

      {report === 'pipeline' ? (
        <MmsTwoCol variant="1-1">
          <ChartCard title="Stage distribution" subtitle="Current pipeline by sector" height="lg">
            <BarChart data={sectorData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="leads" name="Leads" fill="var(--chart-1)" radius={[5, 5, 0, 0]} />
              <Bar dataKey="qualified" name="Qualified" fill="var(--chart-2)" radius={[5, 5, 0, 0]} />
              <Bar dataKey="won" name="Won" fill="var(--chart-7)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ChartCard>
          <SectionCard title="Conversion funnel" subtitle="Qualification and handover performance">
            <div className="mms-report-funnel">
              {[
                { label: 'Leads', value: leads.length, color: 'var(--chart-1)' },
                { label: 'Qualified', value: stats.qualified, color: 'var(--chart-2)' },
                { label: 'Sent to Sales', value: stats.sentToSales, color: 'var(--chart-5)' },
                { label: 'Won', value: stats.converted, color: 'var(--chart-7)' },
              ].map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <div><span style={{ width: `${leads.length ? (item.value / leads.length) * 100 : 0}%`, background: item.color }} /></div>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="mms-inline-stats">
              <div><span>Qualification rate</span><strong>{formatPercent(stats.qualificationRate)}</strong></div>
              <div><span>Conversion rate</span><strong>{formatPercent(stats.conversionRate)}</strong></div>
              <div><span>Rejected</span><strong>{stats.rejected}</strong></div>
            </div>
          </SectionCard>
        </MmsTwoCol>
      ) : null}

      {report === 'spend' ? (
        <MmsTwoCol variant="2-1">
          <ChartCard title="Budget vs actual" subtitle="Sector allocation and spend" height="lg">
            <BarChart data={sectorData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(value) => moneyCompact(Number(value))} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} />
              <Bar dataKey="budget" name="Budget" fill="var(--chart-1)" radius={[5, 5, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="var(--chart-3)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ChartCard>
          <SectionCard title="Expense summary" subtitle="Claims in the selected period">
            <div className="mms-amount-grid">
              <div><span>Claims</span><strong>{expenses.length}</strong></div>
              <div><span>Value</span><strong>{formatINR(expenses.reduce((sum, expense) => sum + expense.amount, 0))}</strong></div>
              <div><span>Approved</span><strong>{expenses.filter((expense) => expense.status === 'Approved').length}</strong></div>
              <div><span>Pending</span><strong>{expenses.filter((expense) => expense.status !== 'Approved' && expense.status !== 'Rejected').length}</strong></div>
            </div>
            <p className="mms-empty-line">Finance/Admin final approval remains outside marketing reporting and is shown as a read-only status.</p>
          </SectionCard>
        </MmsTwoCol>
      ) : null}

      {report === 'campaigns' ? (
        <div className="mms-campaign-grid">
          {department.campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              sector={department.sectors.find((sector) => sector.id === campaign.sectorId)}
              leads={department.leads}
              team={department.employees}
            />
          ))}
        </div>
      ) : null}

      <SectionCard title="Sector report" subtitle="Export-ready summary for the selected period" flush>
        <div className="mms-table-wrap">
          <table className="mms-table">
            <thead>
              <tr>
                <th>Sector</th>
                <th>Leads</th>
                <th>Qualified</th>
                <th>Won</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Qualification rate</th>
              </tr>
            </thead>
            <tbody>
              {sectorData.map((row) => (
                <tr key={row.name}>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.leads}</td>
                  <td>{row.qualified}</td>
                  <td>{row.won}</td>
                  <td>{formatINR(row.budget)}</td>
                  <td>{formatINR(row.spent)}</td>
                  <td>{formatPercent(row.leads ? (row.qualified / row.leads) * 100 : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Report notes" subtitle="Demonstration data and boundaries">
        <div className="mms-report-notes">
          <div><ShieldCheck size={15} /><span>Won and Lost outcomes are recorded by Sales and shown read-only in marketing reports.</span></div>
          <div><ShieldCheck size={15} /><span>Manager approval never replaces Finance/Admin final financial approval.</span></div>
          <div><BadgeCheck size={15} /><span>All figures are illustrative demonstration data stored in this browser.</span></div>
        </div>
      </SectionCard>
    </div>
  )
}
