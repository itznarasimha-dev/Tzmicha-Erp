import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  CircleAlert,
  CircleDollarSign,
  Pencil,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react'
import type { MarketingExpenseRequest, MonthlyPlan } from '../../types/workflow'
import { useWorkflow } from '../../hooks/useWorkflow'
import {
  canCreateExpense,
  canDecideExpense,
  canEditExpense,
  canSubmitExpense,
} from '../../utils/workflow'
import { formatDate, formatINR, formatINRCompact, formatNumber } from '../../utils/format'
import { Button } from '../ui/Button'
import { DataTable, type DataTableColumn } from '../ui/DataTable'
import { StatusBadge } from '../ui/Badge'
import { MetricCard, MetricGrid, TabIntro } from '../marketing/ModuleKit'
import { ExpenseFormModal } from './ExpenseFormModal'
import { ExpenseDetailModal } from './ExpenseDetailModal'

const EXPENSE_STATUSES: MarketingExpenseRequest['status'][] = [
  'Draft',
  'Submitted',
  'Pending Manager Review',
  'Pending Admin Financial Authorization',
  'Changes Requested',
  'Approved',
  'Rejected',
]

const EXPENSE_ELIGIBLE_PLAN_STATUSES: MonthlyPlan['status'][] = [
  'Approved — Ready to Execute',
  'In Progress',
  'Submitted for Results Review',
  'Completed',
]

export function MonthlyExpensesWorkspace() {
  const {
    visibleExpenses,
    visiblePlans,
    config,
    roleId,
    profile,
    metrics,
    createExpense,
    updateExpense,
    submitExpense,
  } = useWorkflow()

  const [status, setStatus] = useState('All')
  const [planFilter, setPlanFilter] = useState('All')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MarketingExpenseRequest | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const ownPlans = useMemo(
    () => visiblePlans.filter((plan) => plan.employeeId === profile.employeeId),
    [visiblePlans, profile.employeeId],
  )

  const formPlans = useMemo(() => {
    const eligible = ownPlans.filter((plan) => EXPENSE_ELIGIBLE_PLAN_STATUSES.includes(plan.status))
    if (editing && !eligible.some((plan) => plan.id === editing.planId)) {
      const linked = ownPlans.find((plan) => plan.id === editing.planId)
      if (linked) return [linked, ...eligible]
    }
    return eligible
  }, [ownPlans, editing])

  const canRaiseExpense = canCreateExpense(roleId) && formPlans.length > 0

  useEffect(() => {
    if (searchParams.get('action') !== 'new') return
    if (canRaiseExpense) {
      setEditing(null)
      setFormOpen(true)
    }
    const next = new URLSearchParams(searchParams)
    next.delete('action')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, canRaiseExpense])

  const planChoices = useMemo(() => {
    const map = new Map<string, string>()
    visibleExpenses.forEach((expense) => map.set(expense.planId, expense.planTitle))
    ownPlans.forEach((plan) => map.set(plan.id, plan.title))
    return [...map.entries()].map(([id, title]) => ({ id, title }))
  }, [visibleExpenses, ownPlans])

  const rows = useMemo(
    () =>
      visibleExpenses
        .filter((expense) => (status === 'All' ? true : expense.status === status))
        .filter((expense) => (planFilter === 'All' ? true : expense.planId === planFilter))
        .sort((a, b) => {
          const aDate = a.submittedAt ?? a.expenseDate
          const bDate = b.submittedAt ?? b.expenseDate
          return new Date(bDate).getTime() - new Date(aDate).getTime()
        }),
    [visibleExpenses, status, planFilter],
  )

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (expense: MarketingExpenseRequest) => {
    setDetailId(null)
    setEditing(expense)
    setFormOpen(true)
  }

  const handleSave = (draft: Parameters<typeof createExpense>[0]): boolean => {
    if (editing) return updateExpense(editing.id, draft)
    return Boolean(createExpense(draft))
  }

  const columns: DataTableColumn<MarketingExpenseRequest>[] = [
    {
      id: 'expense',
      header: 'Expense',
      mobileLabel: 'Expense',
      sortValue: (expense) => expense.title,
      render: (expense) => (
        <div>
          <p className="cell-primary">{expense.title}</p>
          <p className="text-xs muted">{expense.category} · {expense.employeeName}</p>
        </div>
      ),
    },
    {
      id: 'plan',
      header: 'Monthly plan / activity',
      mobileLabel: 'Plan',
      sortValue: (expense) => expense.planTitle,
      render: (expense) => (
        <div>
          <p className="text-xs">{expense.planTitle}</p>
          <p className="text-xs muted">{expense.activityName || 'Plan-level expense'}</p>
        </div>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      mobileLabel: 'Date',
      sortValue: (expense) => expense.expenseDate,
      render: (expense) => <span className="text-xs">{formatDate(expense.expenseDate)}</span>,
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      mobileLabel: 'Amount',
      sortValue: (expense) => expense.amount,
      render: (expense) => <span className="cell-strong">{formatINR(expense.amount)}</span>,
    },
    {
      id: 'route',
      header: 'Route',
      mobileLabel: 'Route',
      hideMobile: true,
      sortValue: (expense) => (expense.managerRequired ? 1 : 0),
      render: (expense) => (
        <span className="text-xs muted">
          {expense.managerRequired ? 'Manager → Admin' : 'Direct to Admin'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      sortValue: (expense) => expense.status,
      render: (expense) => (
        <div>
          <StatusBadge status={expense.status} />
          {expense.currentApprover ? <p className="text-xs muted" style={{ marginTop: 3 }}>With {expense.currentApprover}</p> : null}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      mobileLabel: 'Actions',
      render: (expense) => (
        <div className="row-6 wrap" style={{ justifyContent: 'flex-end' }}>
          {canSubmitExpense(expense, profile) ? (
            <Button
              variant="ghost"
              size="xs"
              icon={<Send size={12} />}
              onClick={(event) => {
                event.stopPropagation()
                submitExpense(expense.id)
              }}
            >
              {expense.status === 'Rejected' ? 'Resubmit' : 'Submit'}
            </Button>
          ) : null}
          {canEditExpense(expense, profile) ? (
            <Button
              variant="ghost"
              size="xs"
              icon={<Pencil size={12} />}
              onClick={(event) => {
                event.stopPropagation()
                openEdit(expense)
              }}
            >
              Edit
            </Button>
          ) : null}
          {canDecideExpense(expense, roleId) ? (
            <Button
              variant="soft"
              size="xs"
              onClick={(event) => {
                event.stopPropagation()
                setDetailId(expense.id)
              }}
            >
              Review
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              onClick={(event) => {
                event.stopPropagation()
                setDetailId(expense.id)
              }}
            >
              Open
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="wf-workspace">
      <TabIntro
        title="Monthly marketing expenses"
        description="Raise plan-linked expenses and route them through Manager review and Admin financial authorization. A plan approval never approves an expense."
        actions={
          canRaiseExpense ? (
            <Button variant="primary" icon={<Plus size={14} />} onClick={openCreate}>
              Raise expense
            </Button>
          ) : (
            <span className="badge badge--neutral badge--no-dot">{profile.shortLabel} view</span>
          )
        }
      >
        <p className="text-xs muted">
          Expenses at {formatINR(config.expenseManagerThreshold)} or above need Manager review first. Admin financial
          authorization is the final decision for every expense.
        </p>
        {canCreateExpense(roleId) && formPlans.length === 0 ? (
          <p className="text-xs muted">
            Approve a monthly plan before raising an expense. Expenses can only link to approved, in-progress or completed plans.
          </p>
        ) : null}
      </TabIntro>

      <MetricGrid>
        <MetricCard
          label="Visible expenses"
          value={visibleExpenses.length}
          sub={`${rows.length} match the current filters`}
          icon={<ReceiptText size={15} />}
          tone="var(--chart-1)"
        />
        <MetricCard
          label="Pending value"
          value={formatINRCompact(metrics.pendingExpenseAmount)}
          sub={`${metrics.pendingExpenses} awaiting Manager or Admin`}
          icon={<Wallet size={15} />}
          tone="var(--chart-3)"
        />
        <MetricCard
          label="Approved value"
          value={formatINRCompact(metrics.approvedExpenseAmount)}
          sub={`${metrics.approvedExpenses} approved expenses`}
          icon={<BadgeCheck size={15} />}
          tone="var(--chart-2)"
        />
        <MetricCard
          label="Rejected"
          value={metrics.rejectedExpenses}
          sub="Owners can correct and resubmit"
          icon={<XCircle size={15} />}
          tone="var(--chart-4)"
        />
      </MetricGrid>

      <div className="wf-filters">
        <label className="wf-filters__field">
          <span>Status</span>
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="All">All statuses</option>
            {EXPENSE_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="wf-filters__field">
          <span>Plan</span>
          <select className="select" value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
            <option value="All">All plans</option>
            {planChoices.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
          </select>
        </label>
        <span className="wf-filters__count">
          <ShieldCheck size={13} /> Manager threshold {formatINR(config.expenseManagerThreshold)}
        </span>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(expense) => expense.id}
        searchable={(expense) => `${expense.title} ${expense.planTitle} ${expense.activityName} ${expense.employeeName} ${expense.category} ${expense.status}`}
        searchPlaceholder="Search expenses, plans, owners or statuses…"
        pageSize={8}
        initialSort={{ columnId: 'amount', direction: 'desc' }}
        onRowClick={(expense) => setDetailId(expense.id)}
        emptyTitle="No expenses in this view"
        emptyDescription="Raise a plan-linked expense or widen the status and plan filters."
        emptyAction={canRaiseExpense ? <Button variant="soft" onClick={openCreate}>Raise expense</Button> : undefined}
        caption="Monthly marketing expenses"
      />

      <div className="callout callout--info">
        <CircleAlert size={14} />
        <span>
          Plan approval and expense approval are separate. Expenses at {formatINR(config.expenseManagerThreshold)} or
          above need Manager review, then Admin financial authorization. No payment, reimbursement or accounting entry
          is created in this demo.
        </span>
      </div>

      <div className="wf-inline-stats">
        <span><CircleDollarSign size={13} /> {formatNumber(visibleExpenses.filter((expense) => expense.status === 'Draft').length)} drafts</span>
        <span><ReceiptText size={13} /> {formatNumber(visibleExpenses.filter((expense) => expense.status === 'Pending Manager Review').length)} with manager</span>
        <span><ShieldCheck size={13} /> {formatNumber(visibleExpenses.filter((expense) => expense.status === 'Pending Admin Financial Authorization').length)} with Admin</span>
        <span><BadgeCheck size={13} /> {formatNumber(metrics.approvedExpenses)} approved</span>
      </div>

      <ExpenseFormModal
        open={formOpen}
        expense={editing}
        plans={formPlans}
        config={config}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSave={handleSave}
      />

      {detailId ? (
        <ExpenseDetailModal
          expenseId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={openEdit}
        />
      ) : null}

      {visibleExpenses.length === 0 ? (
        <p className="text-xs muted">
          {roleId === 'manager'
            ? 'No plan-linked expenses are in the workspace yet.'
            : `No expenses are linked to ${profile.name}'s plans yet.`}
        </p>
      ) : null}
    </div>
  )
}
