import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  Inbox,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useWorkflow } from '../../hooks/useWorkflow'
import { formatDateTime, formatINR, formatINRCompact } from '../../utils/format'
import { Badge, StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { MetricCard, MetricGrid, TabIntro } from '../marketing/ModuleKit'
import { PlanDetailModal } from './PlanDetailModal'
import { ExpenseDetailModal } from './ExpenseDetailModal'

type InboxFilter = 'all' | 'decision' | 'action' | 'plan' | 'expense'

const filterLabels: Array<{ id: InboxFilter; label: string }> = [
  { id: 'all', label: 'All items' },
  { id: 'decision', label: 'Needs my decision' },
  { id: 'action', label: 'My actions' },
  { id: 'plan', label: 'Plans' },
  { id: 'expense', label: 'Expenses' },
]

export function ApprovalInboxPage() {
  const { inboxItems, plans, expenses, roleId, profile, config, metrics } = useWorkflow()
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [openPlanId, setOpenPlanId] = useState<string | null>(null)
  const [openExpenseId, setOpenExpenseId] = useState<string | null>(null)

  const items = useMemo(
    () =>
      inboxItems.filter((item) => {
        if (filter === 'decision') return item.mode === 'decision'
        if (filter === 'action') return item.mode === 'action'
        if (filter === 'plan') return item.kind === 'plan'
        if (filter === 'expense') return item.kind === 'expense'
        return true
      }),
    [inboxItems, filter],
  )

  const decisions = inboxItems.filter((item) => item.mode === 'decision')
  const actions = inboxItems.filter((item) => item.mode === 'action')

  const recentDecisions = useMemo(() => {
    const entries = [
      ...plans.flatMap((plan) =>
        plan.approvals
          .filter((entry) => entry.byName === profile.name)
          .map((entry) => ({
            id: entry.id,
            title: plan.title,
            kind: 'Plan' as const,
            action: entry.action,
            decision: entry.decision,
            at: entry.at,
            comments: entry.comments,
          })),
      ),
      ...expenses.flatMap((expense) =>
        expense.approvals
          .filter((entry) => entry.byName === profile.name)
          .map((entry) => ({
            id: entry.id,
            title: expense.title,
            kind: 'Expense' as const,
            action: entry.action,
            decision: entry.decision,
            at: entry.at,
            comments: entry.comments,
          })),
      ),
    ]
    return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6)
  }, [plans, expenses, profile.name])

  const roleDescription =
    roleId === 'junior'
      ? 'Your draft, changes-requested and ready-to-execute plans and expenses appear here for action.'
      : roleId === 'senior'
        ? 'Junior plans assigned to you for senior review, plus your own plan actions, appear here.'
        : 'Plans and expenses awaiting manager approval, and results submitted for review, appear here. Admin authorization is shown as status only.'

  const monitorCount = inboxItems.filter((item) => item.mode === 'monitor').length

  return (
    <div className="wf-workspace">
      <TabIntro
        title="Approval inbox"
        description={`Role-based records and decisions for ${profile.name} · ${profile.roleLabel}. ${roleDescription}`}
        actions={<Badge tone="accent">{profile.shortLabel} preview</Badge>}
      >
        <p className="text-xs muted">
          Preview-only role. This inbox is not an authentication boundary and no email or notification is sent.
        </p>
      </TabIntro>

      <MetricGrid>
        <MetricCard
          label="Needs my decision"
          value={decisions.length}
          sub="Plans, results or expenses awaiting your role"
          icon={<ClipboardCheck size={15} />}
          tone="var(--chart-3)"
        />
        <MetricCard
          label="My actions"
          value={actions.length}
          sub="Drafts, revisions or execution updates"
          icon={<Clock3 size={15} />}
          tone="var(--chart-1)"
        />
        <MetricCard
          label="Pending value"
          value={formatINRCompact(metrics.pendingExpenseAmount)}
          sub={`${metrics.pendingExpenses} expense records in review`}
          icon={<Wallet size={15} />}
          tone="var(--chart-5)"
        />
        <MetricCard
          label="Admin queue (monitor)"
          value={metrics.pendingAdmin}
          sub={`Plans at or above ${formatINR(config.financeThreshold)} · status only`}
          icon={<ShieldCheck size={15} />}
          tone="var(--chart-2)"
        />
      </MetricGrid>

      <div className="wf-inbox-toolbar">
        <div className="wf-inbox-filters" role="group" aria-label="Filter approval inbox">
          {filterLabels.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`wf-chip ${filter === item.id ? 'is-active' : ''}`.trim()}
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="wf-filters__count">
          <Filter size={13} /> {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="wf-empty">
          <span className="wf-empty__icon"><Inbox size={22} /></span>
          <h3>Nothing in this view</h3>
          <p>
            {inboxItems.length === 0
              ? 'No records need action from this preview role right now. Switch the demo role to see other workflow queues.'
              : 'No items match this filter. Choose All items to see the full inbox.'}
          </p>
          <Button variant="soft" onClick={() => setFilter('all')}>Show all items</Button>
        </div>
      ) : (
        <div className="wf-inbox-list">
          {items.map((item) => (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              className="wf-inbox-card"
              onClick={() => {
                if (item.kind === 'plan') setOpenPlanId(item.id)
                else setOpenExpenseId(item.id)
              }}
            >
              <span className={`wf-inbox-card__icon wf-inbox-card__icon--${item.kind}`} aria-hidden="true">
                {item.kind === 'plan' ? <BadgeCheck size={17} /> : <ReceiptText size={17} />}
              </span>
              <span className="wf-inbox-card__main">
                <span className="wf-inbox-card__title">{item.title}</span>
                <span className="wf-inbox-card__meta">
                  {item.kind === 'plan' ? 'Monthly plan' : 'Expense'} · {item.requester} · {formatINR(item.amount)}
                </span>
                <span className="wf-inbox-card__hint">{item.hint}</span>
              </span>
              <span className="wf-inbox-card__side">
                <StatusBadge status={item.status} />
                <span className="text-xs muted">{formatDateTime(item.at)}</span>
                <span className={`wf-inbox-card__mode wf-inbox-card__mode--${item.mode}`}>
                  {item.mode === 'decision'
                    ? 'Review decision'
                    : item.mode === 'monitor'
                      ? 'Monitor Admin status'
                      : 'Open action'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="wf-detail__grid">
        <section className="wf-detail__block">
          <h4><Sparkles size={14} /> Workflow guardrails</h4>
          <ul className="wf-guardrails">
            <li>No approval stage can be skipped.</li>
            <li>Admin financial authorization is required for plans at or above {formatINR(config.financeThreshold)}.</li>
            <li>Manager review is required for expenses at or above {formatINR(config.expenseManagerThreshold)}.</li>
            <li>Changes and rejections require a written reason; resubmission restarts the chain.</li>
            <li>Plan approval never approves a linked expense.</li>
            <li>Marketing roles cannot make the Admin financial decision; it stays in the existing Admin Dashboard.</li>
          </ul>
        </section>

        <section className="wf-detail__block">
          <h4><CheckCircle2 size={14} /> Recent decisions by you</h4>
          {recentDecisions.length === 0 ? (
            <p className="empty-inline">No decisions recorded by {profile.name} yet.</p>
          ) : (
            <ol className="wf-history">
              {recentDecisions.map((entry) => (
                <li key={entry.id} className="wf-history__item">
                  <span className={`wf-history__dot wf-history__dot--${entry.decision.toLowerCase().replace(/\s+/g, '-')}`} aria-hidden="true" />
                  <div>
                    <p className="wf-history__title">{entry.action} · {entry.title}</p>
                    <p className="text-xs muted">{entry.kind} · {formatDateTime(entry.at)}</p>
                    {entry.comments ? <p className="wf-history__note">{entry.comments}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {openPlanId ? (
        <PlanDetailModal planId={openPlanId} onClose={() => setOpenPlanId(null)} />
      ) : null}
      {openExpenseId ? (
        <ExpenseDetailModal expenseId={openExpenseId} onClose={() => setOpenExpenseId(null)} />
      ) : null}
    </div>
  )
}
