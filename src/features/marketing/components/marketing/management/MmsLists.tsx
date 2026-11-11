import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  IndianRupee,
  Lightbulb,
  MapPin,
  Megaphone,
  Phone,
  Send,
  Target,
  UserRound,
  Users,
} from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { ProgressBar } from '../../ui/ProgressBar'
import { Avatar } from '../../ui/Avatar'
import type {
  MarketingActivity,
  MarketingApprovalRequest,
  MarketingCampaign,
  MarketingEmployee,
  MarketingExpense,
  MarketingFollowUp,
  MarketingIdea,
  MarketingLead,
  MarketingSector,
  MarketingTask,
  MarketingPlan,
} from '../../../types/marketingDepartment'
import {
  campaignActualLeads,
  campaignProgress,
  campaignTone,
  employeeStats,
  expenseTone,
  ideaTone,
  planTone,
  priorityRank,
  sectorStats,
  shortDate,
  stageTone,
  taskTone,
} from '../../../utils/marketingDepartment'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../../../utils/format'
import { followUpLabel, isOverdue } from '../../../utils/dates'
import { PriorityChip, SectorChip, StatusChip, EmptyBlock, EmployeeAvatar } from './MmsKit'

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

export function MmsKpiGrid({ children, columns = 4 }: { children: ReactNode; columns?: 3 | 4 | 5 }) {
  return <div className={`mms-kpi-grid mms-kpi-grid--${columns}`}>{children}</div>
}

export function MmsTwoCol({ children, variant = '2-1' }: { children: ReactNode; variant?: '2-1' | '1-1' | '1-2' | '3' }) {
  return <div className={`mms-grid mms-grid--${variant}`}>{children}</div>
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mms-section-heading">
      <div>
        {eyebrow ? <span className="mms-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="mms-section-heading__actions">{actions}</div> : null}
    </div>
  )
}

export function DateRangeTabs({
  preset,
  from,
  to,
  onChange,
}: {
  preset: 'daily' | 'weekly' | 'monthly' | 'custom'
  from: string
  to: string
  onChange: (next: { preset: 'daily' | 'weekly' | 'monthly' | 'custom'; from: string; to: string }) => void
}) {
  const presets: Array<{ id: typeof preset; label: string }> = [
    { id: 'daily', label: 'Today' },
    { id: 'weekly', label: '7 days' },
    { id: 'monthly', label: 'This month' },
    { id: 'custom', label: 'Custom' },
  ]
  return (
    <div className="mms-range">
      <div className="mms-range__tabs">
        {presets.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mms-range__tab ${preset === item.id ? 'is-active' : ''}`.trim()}
            onClick={() => onChange({ preset: item.id, from, to })}
          >
            {item.label}
          </button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="mms-range__inputs">
          <input type="date" value={from} onChange={(event) => onChange({ preset, from: event.target.value, to })} />
          <span>to</span>
          <input type="date" value={to} onChange={(event) => onChange({ preset, from, to: event.target.value })} />
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Lead list                                                           */
/* ------------------------------------------------------------------ */

export function LeadTable({
  leads,
  sectors,
  onOpen,
  compact = false,
  emptyTitle = 'No leads in this view',
  emptyDescription = 'Capture a new lead or adjust the filters.',
  actions,
}: {
  leads: MarketingLead[]
  sectors?: MarketingSector[]
  onOpen: (lead: MarketingLead) => void
  compact?: boolean
  emptyTitle?: string
  emptyDescription?: string
  actions?: ReactNode
}) {
  if (!leads.length) {
    return <EmptyBlock icon={<Target size={20} />} title={emptyTitle} description={emptyDescription} action={actions} />
  }
  return (
    <div className="mms-table-wrap">
      <table className={`mms-table ${compact ? 'mms-table--compact' : ''}`.trim()}>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Stage</th>
            <th>Priority</th>
            <th>Sector</th>
            <th>Value</th>
            <th>Next follow-up</th>
            <th aria-label="Open lead" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const next = lead.followUps.find((item) => item.nextActionAt)
            return (
              <tr key={lead.id} onClick={() => onOpen(lead)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onOpen(lead)}>
                <td>
                  <div className="mms-table__person">
                    <Avatar name={lead.name} size="sm" />
                    <div>
                      <strong>{lead.name}</strong>
                      <small>{lead.businessName || lead.phone}</small>
                    </div>
                  </div>
                </td>
                <td><StatusChip status={lead.stage} tone={stageTone(lead.stage)} /></td>
                <td><PriorityChip priority={lead.priority} /></td>
                <td><SectorChip sector={sectors?.find((sector) => sector.id === lead.sectorId)} compact /></td>
                <td><strong>{formatINRCompact(lead.expectedValue)}</strong></td>
                <td>
                  {lead.handover ? (
                    <span className="mms-muted"><Send size={12} /> Sales owned</span>
                  ) : next ? (
                    <span className={isOverdue(next.nextActionAt) ? 'mms-danger-text' : 'mms-muted'}>
                      <CalendarClock size={12} /> {followUpLabel(next.nextActionAt)}
                    </span>
                  ) : (
                    <span className="mms-muted">Not scheduled</span>
                  )}
                </td>
                <td><ArrowRight size={14} className="mms-row-arrow" /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function LeadTableWithSectors({
  leads,
  sectors,
  onOpen,
  compact,
  emptyTitle,
  emptyDescription,
}: {
  leads: MarketingLead[]
  sectors: MarketingSector[]
  onOpen: (lead: MarketingLead) => void
  compact?: boolean
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (!leads.length) {
    return <EmptyBlock icon={<Target size={20} />} title={emptyTitle ?? 'No leads in this view'} description={emptyDescription} />
  }
  return (
    <div className="mms-table-wrap">
      <table className={`mms-table ${compact ? 'mms-table--compact' : ''}`.trim()}>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Stage</th>
            <th>Sector</th>
            <th>Value</th>
            <th>Priority</th>
            <th>Follow-up</th>
            <th aria-label="Open lead" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const sector = sectors.find((item) => item.id === lead.sectorId)
            const scheduled = lead.followUps.find((item) => item.nextActionAt)
            return (
              <tr key={lead.id} onClick={() => onOpen(lead)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onOpen(lead)}>
                <td>
                  <div className="mms-table__person">
                    <Avatar name={lead.name} size="sm" />
                    <div>
                      <strong>{lead.name}</strong>
                      <small>{lead.businessName || lead.phone}</small>
                    </div>
                  </div>
                </td>
                <td><StatusChip status={lead.stage} tone={stageTone(lead.stage)} /></td>
                <td><SectorChip sector={sector} compact /></td>
                <td><strong>{formatINRCompact(lead.expectedValue)}</strong></td>
                <td><PriorityChip priority={lead.priority} /></td>
                <td>
                  {lead.handover ? (
                    <Badge tone="success" dot>Sales · {lead.handover.salesRepName.split(' ')[0]}</Badge>
                  ) : scheduled ? (
                    <span className={isOverdue(scheduled.nextActionAt) ? 'mms-danger-text' : 'mms-muted'}>
                      <CalendarClock size={12} /> {followUpLabel(scheduled.nextActionAt)}
                    </span>
                  ) : (
                    <span className="mms-muted">Not scheduled</span>
                  )}
                </td>
                <td><ArrowRight size={14} className="mms-row-arrow" /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sector cards                                                        */
/* ------------------------------------------------------------------ */

export function SectorCard({
  sector,
  employees,
  leads,
  tasks,
  onOpen,
  actions,
}: {
  sector: MarketingSector
  employees: MarketingEmployee[]
  leads: MarketingLead[]
  tasks: MarketingTask[]
  onOpen?: () => void
  actions?: ReactNode
}) {
  const stats = sectorStats(sector, employees, leads, tasks)
  const leader = employees.find((item) => item.id === sector.leaderId)
  return (
    <article className={`mms-sector-card ${sector.status !== 'Active' ? 'is-inactive' : ''}`.trim()}>
      <span className="mms-sector-card__tone" style={{ background: sector.color }} aria-hidden="true" />
      <header>
        <div>
          <div className="mms-sector-card__title">
            <h3>{sector.name}</h3>
            <StatusChip status={sector.status} />
          </div>
          <p>{sector.objective}</p>
        </div>
        <PriorityChip priority={sector.priority} />
      </header>
      <div className="mms-sector-card__meta">
        <span><UserRound size={13} /> {leader?.name ?? 'No senior leader'}</span>
        <span><Users size={13} /> {stats.teamMembers} members · {stats.juniors} juniors</span>
        <span><MapPin size={13} /> {sector.code}</span>
      </div>
      <div className="mms-sector-card__bars">
        <div>
          <span>Lead target <b>{stats.totalLeads}/{sector.monthlyLeadTarget}</b></span>
          <ProgressBar value={Math.min(100, stats.targetAchievement)} size="sm" tone={stats.targetAchievement >= 80 ? 'success' : stats.targetAchievement >= 50 ? 'brand' : 'warning'} />
        </div>
        <div>
          <span>Budget used <b>{formatPercent(stats.budgetUtilisation)}</b></span>
          <ProgressBar value={Math.min(100, stats.budgetUtilisation)} size="sm" tone={stats.budgetUtilisation > 100 ? 'danger' : 'brand'} />
        </div>
      </div>
      <footer>
        <div className="mms-sector-card__stats">
          <span><strong>{stats.qualifiedLeads}</strong> qualified</span>
          <span><strong>{stats.activeTasks}</strong> active tasks</span>
          <span><strong>{stats.conversions}</strong> won</span>
        </div>
        <div className="mms-sector-card__actions">
          {actions}
          {onOpen ? <Button size="xs" variant="ghost" onClick={onOpen}>Open <ArrowRight size={12} /></Button> : null}
        </div>
      </footer>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export function TaskCard({
  task,
  employees,
  sectors,
  onOpen,
  onProgress,
}: {
  task: MarketingTask
  employees: MarketingEmployee[]
  sectors: MarketingSector[]
  onOpen: () => void
  onProgress?: () => void
}) {
  const junior = employees.find((item) => item.id === task.assignedJuniorId)
  const senior = employees.find((item) => item.id === task.assignedSeniorId)
  const sector = sectors.find((item) => item.id === task.sectorId)
  const overdue = task.status !== 'Completed' && isOverdue(task.deadline)
  return (
    <article className={`mms-task-card ${overdue ? 'is-overdue' : ''}`.trim()}>
      <header>
        <div className="mms-task-card__chips">
          <StatusChip status={task.status} tone={taskTone(task.status)} />
          <PriorityChip priority={task.priority} />
        </div>
        <span className={`mms-task-card__source mms-task-card__source--${task.source.toLowerCase()}`}>{task.source}</span>
      </header>
      <button type="button" className="mms-task-card__title" onClick={onOpen}>{task.title}</button>
      <p>{task.expectedResult || task.description}</p>
      <div className="mms-task-card__meta">
        <SectorChip sector={sector} compact />
        <span className={overdue ? 'mms-danger-text' : ''}><CalendarDays size={12} /> {shortDate(task.deadline)}</span>
      </div>
      <div className="mms-task-card__people">
        <EmployeeAvatar employee={junior ?? senior} />
        <span>{task.targetQuantity ? `${task.targetQuantity} target` : ''}</span>
      </div>
      <div className="mms-task-card__progress">
        <div><span>Progress</span><strong>{task.progress}%</strong></div>
        <ProgressBar value={task.progress} size="sm" tone={task.progress === 100 ? 'success' : 'brand'} />
      </div>
      <footer>
        {onProgress ? (
          <Button size="xs" variant="soft" onClick={onProgress}>Update progress</Button>
        ) : null}
        <Button size="xs" variant="ghost" onClick={onOpen}>Details <ArrowRight size={11} /></Button>
      </footer>
    </article>
  )
}

export function TaskBoard({
  tasks,
  employees,
  sectors,
  onOpen,
  onProgress,
}: {
  tasks: MarketingTask[]
  employees: MarketingEmployee[]
  sectors: MarketingSector[]
  onOpen: (task: MarketingTask) => void
  onProgress?: (task: MarketingTask) => void
}) {
  const lanes: Array<{ status: MarketingTask['status']; label: string }> = [
    { status: 'Not Started', label: 'Not started' },
    { status: 'In Progress', label: 'In progress' },
    { status: 'Under Review', label: 'Under review' },
    { status: 'Completed', label: 'Completed' },
    { status: 'Blocked', label: 'Blocked' },
  ]
  return (
    <div className="mms-board">
      {lanes.map((lane) => {
        const laneTasks = tasks
          .filter((task) => task.status === lane.status)
          .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
        return (
          <div key={lane.status} className={`mms-board__lane mms-board__lane--${lane.status.toLowerCase().replace(/\s+/g, '-')}`}>
            <header>
              <span>{lane.label}</span>
              <em>{laneTasks.length}</em>
            </header>
            <div className="mms-board__cards">
              {laneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  employees={employees}
                  sectors={sectors}
                  onOpen={() => onOpen(task)}
                  onProgress={onProgress ? () => onProgress(task) : undefined}
                />
              ))}
              {!laneTasks.length ? <p className="mms-board__empty">No tasks</p> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Follow-ups                                                          */
/* ------------------------------------------------------------------ */

export function FollowUpList({
  followUps,
  leads,
  employees,
  onOpenLead,
  onComplete,
  onReschedule,
  onExtension,
  onInProgress,
  emptyTitle = 'No follow-ups scheduled',
}: {
  followUps: MarketingFollowUp[]
  leads: MarketingLead[]
  employees: MarketingEmployee[]
  onOpenLead: (lead: MarketingLead) => void
  onComplete?: (followUp: MarketingFollowUp) => void
  onReschedule?: (followUp: MarketingFollowUp) => void
  onExtension?: (followUp: MarketingFollowUp) => void
  onInProgress?: (followUp: MarketingFollowUp) => void
  emptyTitle?: string
}) {
  if (!followUps.length) {
    return <EmptyBlock icon={<CalendarClock size={20} />} title={emptyTitle} description="Schedule a follow-up from any lead to keep the conversation moving." />
  }
  return (
    <ul className="mms-followup-cards">
      {followUps.map((followUp) => {
        const lead = leads.find((item) => item.id === followUp.leadId)
        const employee = employees.find((item) => item.id === followUp.employeeId)
        const open = followUp.status === 'Scheduled' || followUp.status === 'In Progress'
        const overdue = open && isOverdue(followUp.dueAt)
        const pendingExtension = (followUp.extensionRequests ?? []).find((request) => request.status === 'Pending')
        return (
          <li key={followUp.id} className={overdue ? 'is-overdue' : ''}>
            <span className="mms-followup-cards__icon">
              {followUp.mode === 'Phone Call' ? <Phone size={15} /> : followUp.mode === 'Meeting' ? <Users size={15} /> : <CalendarClock size={15} />}
            </span>
            <div className="mms-followup-cards__main">
              <div className="mms-followup-cards__head">
                <button type="button" onClick={() => lead && onOpenLead(lead)}>{lead?.name ?? 'Lead removed'}</button>
                <StatusChip status={followUp.status} />
                {pendingExtension ? <Badge tone="warning" dot>Extension pending</Badge> : null}
                <span className={overdue ? 'mms-danger-text' : 'mms-muted'}>{followUpLabel(followUp.dueAt)}</span>
              </div>
              <p>{followUp.notes || `${followUp.mode} follow-up`}</p>
              <div className="mms-followup-cards__meta">
                <span>{lead?.businessName || 'Individual'}</span>
                <span>{employee?.name ?? 'Unassigned'}</span>
                <span>{new Date(followUp.dueAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            {open ? (
              <div className="mms-followup-cards__actions">
                {onComplete ? <Button size="xs" variant="primary" onClick={() => onComplete(followUp)}>Record</Button> : null}
                {onReschedule && !pendingExtension ? <Button size="xs" variant="ghost" onClick={() => onReschedule(followUp)}>Move</Button> : null}
                {onExtension && !pendingExtension ? <Button size="xs" variant="ghost" onClick={() => onExtension(followUp)}>Extend</Button> : null}
                {onInProgress && !pendingExtension && followUp.status === 'Scheduled' ? <Button size="xs" variant="ghost" onClick={() => onInProgress(followUp)}>In progress</Button> : null}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

export function ExpenseTable({
  expenses,
  sectors,
  onOpen,
  actions,
}: {
  expenses: MarketingExpense[]
  sectors: MarketingSector[]
  onOpen: (expense: MarketingExpense) => void
  actions?: (expense: MarketingExpense) => ReactNode
}) {
  if (!expenses.length) {
    return <EmptyBlock icon={<IndianRupee size={20} />} title="No expense records" description="Submitted claims appear here with their approval trail." />
  }
  return (
    <div className="mms-table-wrap">
      <table className="mms-table">
        <thead>
          <tr>
            <th>Expense</th>
            <th>Employee</th>
            <th>Sector</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Submitted</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>
                <button type="button" className="mms-table__link" onClick={() => onOpen(expense)}>{expense.title}</button>
                <small className="mms-table__sub">{expense.category} · {expense.taskTitle || 'No task'}</small>
              </td>
              <td>{expense.employeeName}</td>
              <td><SectorChip sector={sectors.find((sector) => sector.id === expense.sectorId)} compact /></td>
              <td><strong>{formatINR(expense.amount)}</strong></td>
              <td><StatusChip status={expense.status} tone={expenseTone(expense.status)} /></td>
              <td>{shortDate(expense.expenseDate)}</td>
              <td>{actions ? <div className="mms-table__actions">{actions(expense)}</div> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ideas                                                               */
/* ------------------------------------------------------------------ */

export function IdeaList({
  ideas,
  sectors,
  onOpen,
  actions,
}: {
  ideas: MarketingIdea[]
  sectors: MarketingSector[]
  onOpen: (idea: MarketingIdea) => void
  actions?: (idea: MarketingIdea) => ReactNode
}) {
  if (!ideas.length) {
    return <EmptyBlock icon={<Lightbulb size={20} />} title="No ideas submitted" description="Team recommendations and improvement ideas will appear here." />
  }
  return (
    <div className="mms-idea-grid">
      {ideas.map((idea) => (
        <article key={idea.id} className="mms-idea-card">
          <header>
            <span className="mms-idea-card__icon"><Lightbulb size={15} /></span>
            <StatusChip status={idea.status} tone={ideaTone(idea.status)} />
          </header>
          <button type="button" onClick={() => onOpen(idea)}>{idea.title}</button>
          <p>{idea.description}</p>
          <div className="mms-idea-card__meta">
            <SectorChip sector={sectors.find((sector) => sector.id === idea.sectorId)} compact />
            <span>{idea.estimatedBudget ? formatINRCompact(idea.estimatedBudget) : 'No budget'}</span>
            <span>{idea.submittedByName}</span>
          </div>
          {idea.managerFeedback || idea.seniorFeedback ? (
            <div className="mms-idea-card__feedback">
              <strong>{idea.managerFeedback ? 'Manager' : 'Senior'} feedback</strong>
              <p>{idea.managerFeedback || idea.seniorFeedback}</p>
            </div>
          ) : null}
          {actions ? <footer>{actions(idea)}</footer> : null}
        </article>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */

export function ApprovalList({
  requests,
  sectors,
  onOpen,
  actions,
}: {
  requests: MarketingApprovalRequest[]
  sectors: MarketingSector[]
  onOpen: (request: MarketingApprovalRequest) => void
  actions?: (request: MarketingApprovalRequest) => ReactNode
}) {
  if (!requests.length) {
    return <EmptyBlock icon={<CheckCircle2 size={20} />} title="Approval queue is clear" description="Budget, campaign and resource requests awaiting action will appear here." />
  }
  return (
    <ul className="mms-approval-list">
      {requests.map((request) => (
        <li key={request.id}>
          <div className="mms-approval-list__main">
            <div className="mms-approval-list__head">
              <button type="button" onClick={() => onOpen(request)}>{request.title}</button>
              <StatusChip status={request.status} />
            </div>
            <p>{request.summary}</p>
            <div className="mms-approval-list__meta">
              <SectorChip sector={sectors.find((sector) => sector.id === request.sectorId)} compact />
              <span>{request.kind}</span>
              <span>{request.submittedByName}</span>
              {request.amount ? <strong>{formatINR(request.amount)}</strong> : null}
            </div>
          </div>
          <div className="mms-approval-list__actions">
            {actions ? actions(request) : <Button size="xs" variant="ghost" onClick={() => onOpen(request)}>Review <ArrowRight size={12} /></Button>}
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

export function CampaignCard({
  campaign,
  sector,
  leads,
  team,
  onOpen,
  actions,
}: {
  campaign: MarketingCampaign
  sector?: MarketingSector
  leads: MarketingLead[]
  team: MarketingEmployee[]
  onOpen?: () => void
  actions?: ReactNode
}) {
  const progress = campaignProgress(campaign, leads)
  const actual = campaignActualLeads(campaign, leads)
  const members = team.filter((employee) => campaign.teamIds.includes(employee.id))
  return (
    <article className="mms-campaign-card">
      <header>
        <span className="mms-campaign-card__icon"><Megaphone size={16} /></span>
        <div>
          <h3>{campaign.name}</h3>
          <p>{campaign.objective}</p>
        </div>
        <StatusChip status={campaign.status} tone={campaignTone(campaign.status)} />
      </header>
      <div className="mms-campaign-card__meta">
        <SectorChip sector={sector} compact />
        <span><CalendarDays size={12} /> {shortDate(campaign.startDate)} – {shortDate(campaign.endDate)}</span>
        <span><PriorityChip priority={campaign.priority} /></span>
      </div>
      <div className="mms-campaign-card__numbers">
        <div><span>Budget</span><strong>{formatINRCompact(campaign.budget)}</strong></div>
        <div><span>Actual leads</span><strong>{formatNumber(actual)}</strong></div>
        <div><span>Target leads</span><strong>{formatNumber(campaign.expectedLeads)}</strong></div>
      </div>
      <div className="mms-campaign-card__progress">
        <div><span>Lead delivery</span><strong>{progress}%</strong></div>
        <ProgressBar value={Math.min(100, progress)} size="sm" tone={progress >= 100 ? 'success' : progress >= 60 ? 'brand' : 'warning'} />
      </div>
      <footer>
        <div className="mms-avatar-stack">
          {members.slice(0, 5).map((member) => <Avatar key={member.id} name={member.name} size="sm" />)}
          {!members.length ? <small>No team assigned</small> : null}
        </div>
        <div className="mms-campaign-card__actions">
          {actions}
          {onOpen ? <Button size="xs" variant="ghost" onClick={onOpen}>Open <ArrowRight size={11} /></Button> : null}
        </div>
      </footer>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

export function PlanCard({
  plan,
  sector,
  senior,
  actions,
}: {
  plan: MarketingPlan
  sector?: MarketingSector
  senior?: MarketingEmployee
  actions?: ReactNode
}) {
  return (
    <article className="mms-plan-card">
      <header>
        <span className="mms-plan-card__type">{plan.type}</span>
        <StatusChip status={plan.status} tone={planTone(plan.status)} />
      </header>
      <h3>{plan.title}</h3>
      <p>{plan.objective}</p>
      <div className="mms-plan-card__meta">
        <SectorChip sector={sector} compact />
        <span>{senior?.name ?? 'No senior owner'}</span>
        <span>{shortDate(plan.startDate)} – {shortDate(plan.deadline)}</span>
      </div>
      <div className="mms-plan-card__footer">
        <div>
          <span>Budget</span>
          <strong>{formatINRCompact(plan.budget)}</strong>
        </div>
        <div>
          <span>Audience</span>
          <strong>{plan.targetAudience || '—'}</strong>
        </div>
        {actions ? <div className="mms-plan-card__actions">{actions}</div> : null}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Team and employees                                                  */
/* ------------------------------------------------------------------ */

export function TeamTable({
  employees,
  leads,
  tasks,
  followUps,
  activities,
  onOpen,
  actions,
}: {
  employees: MarketingEmployee[]
  leads: MarketingLead[]
  tasks: MarketingTask[]
  followUps: MarketingFollowUp[]
  activities: MarketingActivity[]
  onOpen: (employee: MarketingEmployee) => void
  actions?: (employee: MarketingEmployee) => ReactNode
}) {
  if (!employees.length) {
    return <EmptyBlock icon={<Users size={20} />} title="No team members in scope" description="Team members appear once they are assigned to your sector." />
  }
  return (
    <div className="mms-table-wrap">
      <table className="mms-table">
        <thead>
          <tr>
            <th>Team member</th>
            <th>Role</th>
            <th>Leads</th>
            <th>Tasks</th>
            <th>Follow-ups</th>
            <th>Target</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            const stats = employeeStats(employee, leads, tasks, followUps, activities)
            return (
              <tr key={employee.id}>
                <td onClick={() => onOpen(employee)} className="mms-table__clickable">
                  <div className="mms-table__person">
                    <Avatar name={employee.name} size="sm" />
                    <div>
                      <strong>{employee.name}</strong>
                      <small>{employee.designation}</small>
                    </div>
                  </div>
                </td>
                <td><span className={`mms-role-pill mms-role-pill--${employee.role}`}>{employee.role}</span></td>
                <td><strong>{stats.leadsGenerated}</strong> <small>· {stats.qualifiedLeads} qualified</small></td>
                <td><strong>{stats.completedTasks}</strong> <small>/ {stats.assignedTasks}</small></td>
                <td>{stats.followUpsCompleted}</td>
                <td>
                  <div className="mms-target-cell">
                    <span>{stats.targetAchievement}%</span>
                    <ProgressBar value={Math.min(100, stats.targetAchievement)} size="sm" tone={stats.targetAchievement >= 80 ? 'success' : 'brand'} />
                  </div>
                </td>
                <td>{actions ? <div className="mms-table__actions">{actions(employee)}</div> : null}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function TeamMemberCard({
  employee,
  leads,
  tasks,
  followUps,
  activities,
  onOpen,
}: {
  employee: MarketingEmployee
  leads: MarketingLead[]
  tasks: MarketingTask[]
  followUps: MarketingFollowUp[]
  activities: MarketingActivity[]
  onOpen: () => void
}) {
  const stats = employeeStats(employee, leads, tasks, followUps, activities)
  return (
    <article className="mms-person-card">
      <header>
        <Avatar name={employee.name} size="md" />
        <div>
          <button type="button" onClick={onOpen}>{employee.name}</button>
          <span>{employee.designation}</span>
        </div>
        <Badge tone={employee.status === 'Active' ? 'success' : 'neutral'} dot>{employee.status}</Badge>
      </header>
      <p className="mms-person-card__activity"><Clock size={12} /> {employee.activityStatus}</p>
      <div className="mms-person-card__stats">
        <div><strong>{stats.leadsGenerated}</strong><span>Leads</span></div>
        <div><strong>{stats.qualifiedLeads}</strong><span>Qualified</span></div>
        <div><strong>{stats.completedTasks}/{stats.assignedTasks}</strong><span>Tasks</span></div>
        <div><strong>{stats.followUpsCompleted}</strong><span>Follow-ups</span></div>
      </div>
      <div className="mms-person-card__target">
        <span>Target achievement</span>
        <strong>{stats.targetAchievement}%</strong>
        <ProgressBar value={Math.min(100, stats.targetAchievement)} size="sm" tone={stats.targetAchievement >= 80 ? 'success' : stats.targetAchievement >= 50 ? 'brand' : 'warning'} />
      </div>
      <footer>
        <span>{employee.skills.slice(0, 2).join(' · ') || 'No skills listed'}</span>
        <Button size="xs" variant="ghost" onClick={onOpen}>Profile <ArrowRight size={11} /></Button>
      </footer>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Activities                                                          */
/* ------------------------------------------------------------------ */

export function ActivityList({
  activities,
  sectors,
  limit,
}: {
  activities: MarketingActivity[]
  sectors: MarketingSector[]
  limit?: number
}) {
  const shown = limit ? activities.slice(0, limit) : activities
  if (!shown.length) {
    return <EmptyBlock icon={<Target size={20} />} title="No activity logged" description="Field visits, calls and campaign work will appear here." />
  }
  return (
    <ol className="mms-activity-list">
      {shown.map((activity) => (
        <li key={activity.id}>
          <span className={`mms-activity-list__icon mms-activity-list__icon--${activity.type.toLowerCase().replace(/\s+/g, '-')}`}>
            {activity.leadsCaptured ? <Target size={14} /> : activity.type === 'Phone Call' ? <Phone size={14} /> : <CheckCircle2 size={14} />}
          </span>
          <div>
            <div className="mms-activity-list__head">
              <strong>{activity.title}</strong>
              <span>{shortDate(activity.at)}</span>
            </div>
            <p>{activity.detail}</p>
            <div className="mms-activity-list__meta">
              <span>{activity.employeeName}</span>
              <SectorChip sector={sectors.find((sector) => sector.id === activity.sectorId)} compact />
              <span>{activity.duration} min</span>
              {activity.leadsCaptured ? <span>{activity.leadsCaptured} leads</span> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* Funnel / pipeline summary                                           */
/* ------------------------------------------------------------------ */

export function PipelineFunnel({ leads }: { leads: MarketingLead[] }) {
  const stages: Array<{ stage: MarketingLead['stage']; color: string }> = [
    { stage: 'New Lead', color: 'var(--chart-1)' },
    { stage: 'Follow-up', color: 'var(--chart-2)' },
    { stage: 'Qualification', color: 'var(--chart-3)' },
    { stage: 'Senior Review', color: 'var(--chart-4)' },
    { stage: 'Manager Review', color: 'var(--chart-5)' },
    { stage: 'Sent to Sales', color: 'var(--chart-6)' },
    { stage: 'Won', color: 'var(--chart-7)' },
  ]
  const max = Math.max(1, ...stages.map(({ stage }) => leads.filter((lead) => lead.stage === stage).length))
  return (
    <div className="mms-funnel">
      {stages.map(({ stage, color }, index) => {
        const count = leads.filter((lead) => lead.stage === stage).length
        return (
          <div key={stage} className="mms-funnel__row">
            <span className="mms-funnel__label">{stage}</span>
            <div className="mms-funnel__track">
              <span style={{ width: `${Math.max(6, (count / max) * 100)}%`, background: color }}>
                {count}
              </span>
            </div>
            <small>{index === 0 ? 'Entry' : 'Stage'}</small>
          </div>
        )
      })}
      <div className="mms-funnel__lost">
        <span><AlertTriangle size={12} /> Rejected {leads.filter((lead) => lead.stage === 'Rejected').length}</span>
        <span>Lost {leads.filter((lead) => lead.stage === 'Lost').length}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Small metric helpers                                                */
/* ------------------------------------------------------------------ */

export function AmountStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: string
}) {
  return (
    <div className="mms-amount-stat">
      <span>{label}</span>
      <strong style={tone ? { color: tone } : undefined}>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}
