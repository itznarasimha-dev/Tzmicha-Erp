import type { CSSProperties, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Compass,
  FileText,
  Flag,
  Lightbulb,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react'
import { PageHeader } from '../../ui/PageHeader'
import { Badge, StatusBadge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { ProgressBar } from '../../ui/ProgressBar'
import { Avatar } from '../../ui/Avatar'
import { useDemoRole } from '../../../context/DemoRoleContext'
import type { DemoRoleId } from '../../../types/workflow'
import type {
  ApprovalStage,
  EmployeePerformance,
  ExpenseStageStatus,
  IdeaStatus,
  WorkspaceApproval,
  WorkspaceExpense,
  WorkspaceIdea,
  WorkspaceTask,
  WorkspaceTimelineEntry,
} from '../../../types/workspace'
import {
  ROLE_ACCENT,
  getRoleNavigation,
  roleWorkspacePath,
} from '../../../config/roleNavigation'
import { formatDateShort, formatINRCompact, formatPercent } from '../../../utils/format'
import { daysUntil, isOverdue } from '../../../utils/dates'

export function WorkspaceLayout({
  roleId,
  section,
  title,
  subtitle,
  eyebrow,
  actions,
  meta,
  children,
  className = '',
}: {
  roleId: DemoRoleId
  section: string
  title: ReactNode
  subtitle: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  children: ReactNode
  className?: string
}) {
  const accent = ROLE_ACCENT[roleId]
  const nav = getRoleNavigation(roleId)
  return (
    <div className={`ws-shell ws-shell--${roleId} ${className}`.trim()}>
      <div className="ws-role-strip">
        <span className="ws-role-strip__dot" style={{ background: accent.accent }} aria-hidden="true" />
        <span className="ws-role-strip__label">{accent.eyebrow}</span>
        <span className="ws-role-strip__divider" aria-hidden="true" />
        <span className="ws-role-strip__scope">{accent.label}</span>
        <span className="ws-role-strip__demo">Preview role · local demo only</span>
      </div>

      <PageHeader
        eyebrow={eyebrow ?? accent.eyebrow}
        title={title}
        subtitle={subtitle}
        actions={actions}
        meta={meta}
      />

      <WorkspaceTabs roleId={roleId} section={section} nav={nav} />

      <motion.div
        key={section}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.65, 0.35, 1] }}
        className="ws-content"
      >
        {children}
      </motion.div>
    </div>
  )
}

function WorkspaceTabs({
  roleId,
  section,
  nav,
}: {
  roleId: DemoRoleId
  section: string
  nav: ReturnType<typeof getRoleNavigation>
}) {
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const active = nav.find((item) => item.id === section) ?? nav[0]

  return (
    <nav className="ws-tabs-shell" aria-label={`${roleId} workspace sections`}>
      <div className="ws-tabs">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = item.id === active?.id
          const href = roleWorkspacePath(item.id)
          return (
            <Link
              key={item.id}
              to={`${href}${location.search}`}
              className={`ws-tab ${isActive ? 'is-active' : ''}`.trim()}
              aria-current={isActive ? 'page' : undefined}
              title={item.description}
            >
              {isActive ? (
                <motion.span
                  layoutId={`ws-tab-indicator-${roleId}`}
                  className="ws-tab__indicator"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 36, mass: 0.7 }
                  }
                  aria-hidden="true"
                />
              ) : null}
              <span className="ws-tab__inner">
                <span className="ws-tab__icon" aria-hidden="true">
                  <Icon size={13} strokeWidth={2} />
                </span>
                <span>{item.label}</span>
              </span>
            </Link>
          )
        })}
      </div>
      <p className="ws-tabs__hint">
        <Compass size={12} aria-hidden="true" /> {active?.description}
      </p>
    </nav>
  )
}

export function KpiGrid({ children, columns = 5 }: { children: ReactNode; columns?: 2 | 3 | 4 | 5 }) {
  return <div className={`ws-kpi-grid ws-kpi-grid--${columns}`}>{children}</div>
}

export function SectionHeading({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="ws-section-heading">
      <div>
        {eyebrow ? <p className="ws-section-heading__eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="ws-section-heading__actions">{actions}</div> : null}
    </div>
  )
}

export function RoleBadge({ roleId }: { roleId: DemoRoleId }) {
  const profile = useDemoRole().profile
  const accent = ROLE_ACCENT[roleId]
  return (
    <span className="ws-role-badge" style={{ '--ws-role-tone': accent.accent } as CSSProperties}>
      <span className="ws-role-badge__avatar">{profile.initials}</span>
      <span>
        <strong>{profile.name}</strong>
        <small>{profile.roleLabel}</small>
      </span>
    </span>
  )
}

export function TaskCard({
  task,
  onOpen,
  actions,
  compact = false,
}: {
  task: WorkspaceTask
  onOpen?: () => void
  actions?: ReactNode
  compact?: boolean
}) {
  const dueDays = daysUntil(task.deadline)
  const overdue = task.status !== 'Completed' && isOverdue(task.deadline)
  const dueLabel =
    task.status === 'Completed'
      ? 'Completed'
      : overdue
        ? `${Math.abs(dueDays ?? 0)}d overdue`
        : dueDays === 0
          ? 'Due today'
          : dueDays === 1
            ? 'Due tomorrow'
            : dueDays && dueDays > 1
              ? `Due in ${dueDays}d`
              : formatDateShort(task.deadline)

  return (
    <article
      className={`ws-task-card ${task.status === 'Completed' ? 'is-complete' : ''} ${overdue ? 'is-overdue' : ''} ${compact ? 'ws-task-card--compact' : ''}`.trim()}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen()
              }
            }
          : undefined
      }
    >
      <div className="ws-task-card__top">
        <span className={`priority priority--${task.priority.toLowerCase()}`}>{task.priority}</span>
        <StatusBadge status={task.status} />
      </div>
      <div className="ws-task-card__title-row">
        <h3>{task.title}</h3>
        {onOpen ? <ChevronRight size={15} className="faint" aria-hidden="true" /> : null}
      </div>
      {!compact ? <p className="ws-task-card__description clamp-2">{task.description}</p> : null}
      <div className="ws-task-card__meta">
        <span className="ws-task-meta">
          <UserRound size={12} /> {task.assignedByName}
        </span>
        <span className={`ws-task-due ${overdue ? 'is-late' : dueDays === 0 ? 'is-today' : ''}`.trim()}>
          <CalendarClock size={12} /> {dueLabel}
        </span>
      </div>
      {!compact ? (
        <div className="ws-task-card__expected">
          <Target size={12} aria-hidden="true" />
          <span>{task.expectedResult}</span>
        </div>
      ) : null}
      <div className="ws-task-card__progress">
        <div className="between">
          <span>Progress</span>
          <strong>{task.progress}%</strong>
        </div>
        <ProgressBar
          value={task.progress}
          tone={task.progress >= 100 ? 'success' : task.status === 'Blocked' ? 'danger' : 'brand'}
          size="sm"
        />
      </div>
      {actions ? (
        <div
          className="ws-task-card__actions"
          onClick={(event) => event.stopPropagation()}
          role="group"
          aria-label={`Actions for ${task.title}`}
        >
          {actions}
        </div>
      ) : null}
    </article>
  )
}

export function TaskMiniRow({ task, onClick }: { task: WorkspaceTask; onClick?: () => void }) {
  return (
    <button type="button" className="ws-task-mini" onClick={onClick}>
      <span className={`ws-task-mini__dot ws-task-mini__dot--${task.status.toLowerCase().replace(/\s+/g, '-')}`} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="ws-task-mini__title truncate">{task.title}</span>
        <span className="ws-task-mini__meta">
          {task.assignedToName} · {formatDateShort(task.deadline)}
        </span>
      </span>
      <StatusBadge status={task.status} />
    </button>
  )
}

export function PerformanceCard({
  employee,
  assignedTasks,
  completedTasks,
  pendingTasks,
  onClick,
}: {
  employee: EmployeePerformance
  assignedTasks: number
  completedTasks: number
  pendingTasks: number
  onClick?: () => void
}) {
  const achievement = employee.targetLeads > 0 ? (employee.leadsGenerated / employee.targetLeads) * 100 : 0
  const trendLength = employee.monthlyTrend.length
  const last = trendLength ? employee.monthlyTrend[trendLength - 1] : 0
  const previous = trendLength > 1 ? employee.monthlyTrend[trendLength - 2] : 0
  const delta = previous > 0 ? ((last - previous) / previous) * 100 : 0
  return (
    <article
      className={`ws-perf-card ${onClick ? 'is-clickable' : ''}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <div className="ws-perf-card__head">
        <Avatar name={employee.name} size="lg" tone={employee.roleId === 'senior' ? 'teal' : 'indigo'} />
        <div className="grow" style={{ minWidth: 0 }}>
          <h3 className="truncate">{employee.name}</h3>
          <p className="ws-perf-card__role">
            {employee.roleId === 'senior' ? 'Senior Executive' : 'Junior Executive'} · {employee.location}
          </p>
        </div>
        <span className={`ws-perf-delta ${delta >= 0 ? 'is-up' : 'is-down'}`}>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)}%
        </span>
      </div>

      <div className="ws-perf-card__target">
        <div className="between">
          <span>Target achievement</span>
          <strong>{formatPercent(achievement, 0)}</strong>
        </div>
        <ProgressBar
          value={achievement}
          tone={achievement >= 90 ? 'success' : achievement >= 70 ? 'warning' : 'danger'}
          size="sm"
        />
        <p>
          {employee.leadsGenerated} of {employee.targetLeads} leads · {employee.qualifiedLeads} qualified
        </p>
      </div>

      <div className="ws-perf-card__grid">
        <span><strong>{assignedTasks}</strong>Assigned</span>
        <span><strong>{completedTasks}</strong>Completed</span>
        <span><strong>{pendingTasks}</strong>Pending</span>
        <span><strong>{employee.followUps}</strong>Follow-ups</span>
        <span><strong>{employee.campaignParticipation}</strong>Campaigns</span>
        <span><strong>{formatINRCompact(employee.expenseSubmitted)}</strong>Expenses</span>
      </div>

      <div className="ws-perf-card__foot">
        <span>Performance score</span>
        <strong>{performanceScore(employee)}%</strong>
      </div>
    </article>
  )
}

export function performanceScore(employee: EmployeePerformance): number {
  const target = employee.targetLeads > 0 ? employee.leadsGenerated / employee.targetLeads : 0
  const quality = employee.leadsGenerated > 0 ? employee.qualifiedLeads / employee.leadsGenerated : 0
  const conversion = employee.qualifiedLeads > 0 ? employee.conversions / employee.qualifiedLeads : 0
  return Math.round((target * 0.45 + quality * 0.3 + conversion * 0.25) * 100)
}

export function IdeaCard({
  idea,
  actions,
  onClick,
}: {
  idea: WorkspaceIdea
  actions?: ReactNode
  onClick?: () => void
}) {
  return (
    <article className={`ws-idea-card ${onClick ? 'is-clickable' : ''}`.trim()} onClick={onClick}>
      <div className="ws-idea-card__top">
        <span className="ws-idea-card__icon"><Lightbulb size={15} /></span>
        <StatusBadge status={idea.status} />
      </div>
      <h3>{idea.title}</h3>
      <p className="ws-idea-card__description clamp-2">{idea.description}</p>
      <div className="ws-idea-card__meta">
        <span><UserRound size={12} /> {idea.submittedByName}</span>
        <span><CalendarClock size={12} /> {formatDateShort(idea.createdAt)}</span>
        {idea.estimatedBudget ? <span><ReceiptText size={12} /> {formatINRCompact(idea.estimatedBudget)}</span> : null}
      </div>
      {idea.managerFeedback ? (
        <div className="ws-feedback">
          <span>Manager feedback</span>
          <p>{idea.managerFeedback}</p>
        </div>
      ) : idea.seniorFeedback ? (
        <div className="ws-feedback">
          <span>Senior feedback</span>
          <p>{idea.seniorFeedback}</p>
        </div>
      ) : null}
      {actions ? (
        <div className="ws-card-actions" onClick={(event) => event.stopPropagation()}>
          {actions}
        </div>
      ) : null}
    </article>
  )
}

export function ExpenseCard({
  expense,
  actions,
  onClick,
}: {
  expense: WorkspaceExpense
  actions?: ReactNode
  onClick?: () => void
}) {
  const stage = expenseStageState(expense.status)
  return (
    <article className={`ws-expense-card ${onClick ? 'is-clickable' : ''}`.trim()} onClick={onClick}>
      <div className="ws-expense-card__top">
        <span className="ws-expense-card__icon"><ReceiptText size={15} /></span>
        <StatusBadge status={expense.status} />
      </div>
      <div className="ws-expense-card__main">
        <div>
          <h3>{expense.title}</h3>
          <p>{expense.category} · {formatDateShort(expense.expenseDate)} · {expense.submittedByName}</p>
        </div>
        <strong className="ws-expense-card__amount">{formatINRCompact(expense.amount)}</strong>
      </div>
      <p className="ws-expense-card__task">
        <Target size={12} /> {expense.taskTitle}
      </p>
      <ApprovalStepper currentStage={stage.stage} status={stage.status} compact />
      {expense.comments ? <p className="ws-expense-card__comment">{expense.comments}</p> : null}
      {actions ? (
        <div className="ws-card-actions" onClick={(event) => event.stopPropagation()}>
          {actions}
        </div>
      ) : null}
    </article>
  )
}

export function ApprovalStepper({
  currentStage,
  status,
  compact = false,
}: {
  currentStage: ApprovalStage
  status: string
  compact?: boolean
}) {
  const stages: Array<{ key: ApprovalStage; label: string; detail: string }> = [
    { key: 'junior', label: 'Junior', detail: 'Submit' },
    { key: 'senior', label: 'Senior', detail: 'Review' },
    { key: 'manager', label: 'Manager', detail: 'Marketing approval' },
    { key: 'finance', label: 'Finance/Admin', detail: 'Final financial approval' },
  ]
  const normalized = status.toLowerCase()
  const rejected = normalized.includes('rejected')
  const changes = normalized.includes('changes')
  const approved = normalized === 'approved'
  const currentIndex = Math.max(0, stages.findIndex((stage) => stage.key === currentStage))
  return (
    <div className={`ws-approval-stepper ${compact ? 'is-compact' : ''}`.trim()} aria-label={`Approval progress: ${status}`}>
      {stages.map((stage, index) => {
        const done = approved || index < currentIndex
        const current = !approved && index === currentIndex && !rejected && !changes
        const issue = index === currentIndex && (rejected || changes)
        const state = done ? 'done' : issue ? (rejected ? 'rejected' : 'changes') : current ? 'current' : 'pending'
        return (
          <div className={`ws-approval-step is-${state}`} key={stage.key}>
            <span className="ws-approval-step__marker">
              {state === 'done' ? <Check size={11} /> : state === 'rejected' ? <CircleAlert size={11} /> : state === 'changes' ? <Flag size={11} /> : index + 1}
            </span>
            <span className="ws-approval-step__text">
              <strong>{stage.label}</strong>
              {!compact ? <small>{stage.detail}</small> : null}
            </span>
            {index < stages.length - 1 ? <span className="ws-approval-step__line" aria-hidden="true" /> : null}
          </div>
        )
      })}
    </div>
  )
}

export function expenseStageState(status: ExpenseStageStatus): { stage: ApprovalStage; status: string } {
  if (status === 'Under Senior Review' || status === 'Submitted') return { stage: 'senior', status }
  if (status === 'Manager Review') return { stage: 'manager', status }
  if (status === 'Finance Review') return { stage: 'finance', status }
  if (status === 'Approved') return { stage: 'finance', status: 'Approved' }
  if (status === 'Rejected' || status === 'Changes Requested') return { stage: 'manager', status }
  return { stage: 'junior', status }
}

export function approvalStageState(approval: WorkspaceApproval): { stage: ApprovalStage; status: string } {
  return { stage: approval.currentStage, status: approval.status }
}

export function AuditTrail({ entries }: { entries: WorkspaceTimelineEntry[] }) {
  return (
    <ol className="ws-audit">
      {entries.map((entryItem) => (
        <li key={entryItem.id} className={`ws-audit__item ws-audit__item--${entryItem.tone ?? 'info'}`}>
          <span className="ws-audit__marker" aria-hidden="true" />
          <div>
            <p className="ws-audit__action">
              {entryItem.action} <span>· {entryItem.actor}</span>
            </p>
            <p className="ws-audit__meta">{entryItem.role} · {formatDateShort(entryItem.at)}</p>
            {entryItem.note ? <p className="ws-audit__note">{entryItem.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function EmptyBlock({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="ws-empty">
      <span className="ws-empty__icon">{icon ?? <ClipboardCheck size={20} />}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function PermissionNote({
  role,
  children,
}: {
  role: 'manager' | 'senior' | 'junior'
  children: ReactNode
}) {
  const Icon = role === 'manager' ? ShieldCheck : role === 'senior' ? BadgeCheck : LockKeyhole
  return (
    <div className={`ws-permission-note ws-permission-note--${role}`}>
      <Icon size={14} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function FinanceGateNote({ amount }: { amount?: number | null }) {
  return (
    <div className="ws-finance-gate">
      <ShieldCheck size={15} aria-hidden="true" />
      <div>
        <strong>Finance/Admin final approval is a separate stage</strong>
        <p>
          The Marketing Manager can approve for finance review, but cannot authorize the payment.
          {amount ? ` ${formatINRCompact(amount)} remains subject to the existing Totally ERP Admin Dashboard.` : ' Final financial approval stays in the existing Totally ERP Admin Dashboard.'}
        </p>
      </div>
    </div>
  )
}

export function RecentActivity({
  items,
  empty = 'No workspace activity yet.',
}: {
  items: Array<{ id: string; title: string; detail: string; at: string; tone?: WorkspaceTimelineEntry['tone'] }>
  empty?: string
}) {
  if (!items.length) return <p className="empty-inline">{empty}</p>
  return (
    <div className="ws-feed">
      {items.map((item) => (
        <div className={`ws-feed__item ws-feed__item--${item.tone ?? 'info'}`} key={item.id}>
          <span className="ws-feed__dot" aria-hidden="true" />
          <div className="grow" style={{ minWidth: 0 }}>
            <p className="ws-feed__title">{item.title}</p>
            <p className="ws-feed__detail">{item.detail}</p>
          </div>
          <span className="ws-feed__time">{formatDateShort(item.at)}</span>
        </div>
      ))}
    </div>
  )
}

export function IdeaStatusHint({ status }: { status: IdeaStatus }) {
  if (status === 'Approved' || status === 'Forwarded to Finance') {
    return (
      <span className="ws-status-hint is-success">
        <BadgeCheck size={12} /> Approved at marketing stage
      </span>
    )
  }
  if (status === 'Rejected') {
    return <span className="ws-status-hint is-danger"><CircleAlert size={12} /> Closed with feedback</span>
  }
  if (status === 'Changes Requested') {
    return <span className="ws-status-hint is-warning"><Flag size={12} /> Changes requested</span>
  }
  return <span className="ws-status-hint is-info"><Clock3 size={12} /> Awaiting review</span>
}

export function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  tone = 'var(--brand)',
}: {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
  tone?: string
}) {
  return (
    <button
      type="button"
      className="ws-quick-card"
      style={{ '--ws-quick-tone': tone } as CSSProperties}
      onClick={onClick}
    >
      <span className="ws-quick-card__icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowRight size={14} className="faint" aria-hidden="true" />
    </button>
  )
}

export function MetricRow({
  label,
  value,
  budget,
}: {
  label: string
  value: number
  budget: number
}) {
  const percent = budget > 0 ? (value / budget) * 100 : 0
  return (
    <div className="ws-metric-row">
      <div className="between">
        <span>{label}</span>
        <strong>{formatINRCompact(value)}</strong>
      </div>
      <ProgressBar value={percent} tone={percent >= 90 ? 'warning' : 'brand'} size="sm" />
      <div className="between ws-metric-row__meta">
        <span>{formatPercent(percent)} of {formatINRCompact(budget)}</span>
        <span>{formatINRCompact(budget - value)} left</span>
      </div>
    </div>
  )
}

export function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <span className="ws-stat-pill">
      <span className="ws-stat-pill__icon">{icon}</span>
      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </span>
  )
}

export function DemoFooter({ children }: { children?: ReactNode }) {
  return (
    <div className="ws-demo-footer">
      <Sparkles size={13} aria-hidden="true" />
      <span>
        {children ?? 'All records, approvals and financial figures on this page are local frontend demonstrations. No backend, payment or notification service is connected.'}
      </span>
    </div>
  )
}

export function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button variant="ghost" size="xs" icon={<ArrowRight size={12} />} onClick={() => { window.location.href = to }}>
      {children}
    </Button>
  )
}

export function FileChip({ name }: { name: string }) {
  return (
    <span className="ws-file-chip">
      <FileText size={12} /> {name}
    </span>
  )
}
