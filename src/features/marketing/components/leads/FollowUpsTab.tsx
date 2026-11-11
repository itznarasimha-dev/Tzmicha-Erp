import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, ChevronRight, CircleAlert, RefreshCw, UserRound } from 'lucide-react'
import type { Lead } from '../../types/marketing'
import { Button } from '../ui/Button'
import { Badge, PriorityBadge, StatusBadge } from '../ui/Badge'
import { DataTable, type DataTableColumn } from '../ui/DataTable'
import { Avatar } from '../ui/Avatar'
import { SectionCard } from '../ui/SectionCard'
import {
  FOLLOW_UP_METHODS,
  allFollowUpViews,
  followUpTotals,
  type FollowUpView,
} from '../../utils/leads'
import { followUpLabel } from '../../utils/dates'
import { formatDate, formatDateTime } from '../../utils/format'

type FollowUpTab = 'Due Today' | 'Upcoming' | 'Overdue' | 'Completed' | 'All'

const TABS: FollowUpTab[] = ['Due Today', 'Upcoming', 'Overdue', 'Completed', 'All']

interface FollowUpsTabProps {
  leads: Lead[]
  onOpenLead: (leadId: string) => void
  onSchedule: (lead: Lead) => void
  onComplete: (followUp: FollowUpView) => void
  onRefresh: () => void
}

export function FollowUpsTab({ leads, onOpenLead, onSchedule, onComplete, onRefresh }: FollowUpsTabProps) {
  const [tab, setTab] = useState<FollowUpTab>('Due Today')
  const [method, setMethod] = useState('All')
  const [owner, setOwner] = useState('All')

  const allViews = useMemo(() => allFollowUpViews(leads), [leads])
  const totals = followUpTotals(allViews)
  const owners = useMemo(() => [...new Set(leads.map((lead) => lead.assignedTo).filter(Boolean))].sort(), [leads])

  const rows = useMemo(() => {
    return allViews
      .filter((followUp) => {
        if (tab !== 'All' && followUp.displayStatus !== tab) return false
        if (method !== 'All' && followUp.method !== method) return false
        if (owner !== 'All') {
          const lead = leads.find((item) => item.id === followUp.leadId)
          if (lead?.assignedTo !== owner) return false
        }
        return true
      })
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  }, [allViews, tab, method, owner, leads])

  const leadFor = (followUp: FollowUpView) => leads.find((lead) => lead.id === followUp.leadId) ?? null

  const columns: DataTableColumn<FollowUpView>[] = [
    {
      id: 'lead',
      header: 'Customer',
      sortValue: (followUp) => followUp.leadName,
      mobileLabel: 'Customer',
      render: (followUp) => (
        <div className="row-8" style={{ minWidth: 0 }}>
          <Avatar name={followUp.leadName} size="sm" />
          <div style={{ minWidth: 0 }}>
            <p className="cell-primary truncate">{followUp.leadName}</p>
            <p className="text-xs muted truncate">{followUp.company || 'No company'}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'reason',
      header: 'Follow-up',
      sortValue: (followUp) => followUp.reason,
      render: (followUp) => (
        <div>
          <p className="text-xs">{followUp.reason}</p>
          <p className="text-xs muted">
            {followUp.method}
            {followUp.reminder ? ` · reminder recorded` : ''}
            {followUp.isImplicit ? ' · from the lead’s next follow-up date' : ''}
          </p>
        </div>
      ),
    },
    {
      id: 'due',
      header: 'Due',
      sortValue: (followUp) => new Date(followUp.dueAt).getTime(),
      mobileLabel: 'Due',
      render: (followUp) => (
        <div>
          <p className={followUp.displayStatus === 'Overdue' ? 'danger-text text-xs font-semibold' : 'text-xs'}>
            {formatDate(followUp.dueAt)}
          </p>
          <p className="text-xs muted">{followUpLabel(followUp.dueAt)}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (followUp) => followUp.displayStatus,
      mobileLabel: 'Status',
      render: (followUp) => (
        <Badge tone={
          followUp.displayStatus === 'Overdue'
            ? 'danger'
            : followUp.displayStatus === 'Due Today'
              ? 'warning'
              : followUp.displayStatus === 'Completed'
                ? 'success'
                : followUp.displayStatus === 'Cancelled'
                  ? 'neutral'
                  : 'info'
        }>
          {followUp.displayStatus}
        </Badge>
      ),
    },
    {
      id: 'leadStatus',
      header: 'Lead stage',
      sortValue: (followUp) => leadFor(followUp)?.status ?? '',
      mobileLabel: 'Lead stage',
      hideMobile: true,
      render: (followUp) => {
        const lead = leadFor(followUp)
        return lead ? <StatusBadge status={lead.status} /> : <span className="text-xs muted">Lead unavailable</span>
      },
    },
    {
      id: 'priority',
      header: 'Priority',
      sortValue: (followUp) => leadFor(followUp)?.priority ?? '',
      mobileLabel: 'Priority',
      hideMobile: true,
      render: (followUp) => {
        const lead = leadFor(followUp)
        return lead ? <PriorityBadge priority={lead.priority} /> : <span className="text-xs muted">—</span>
      },
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      mobileLabel: 'Actions',
      render: (followUp) => (
        <div className="row-4" style={{ justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="xs"
            onClick={(event) => {
              event.stopPropagation()
              onOpenLead(followUp.leadId)
            }}
          >
            Open
          </Button>
          {followUp.displayStatus === 'Completed' || followUp.displayStatus === 'Cancelled' ? (
            <Badge tone="success">Done</Badge>
          ) : (
            <Button
              variant="soft"
              size="xs"
              icon={<CheckCircle2 size={12} />}
              onClick={(event) => {
                event.stopPropagation()
                onComplete(followUp)
              }}
            >
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="lead-followups stack-16">
      <div className="lead-followups__tiles">
        <button type="button" className={`lead-followups__tile ${tab === 'Due Today' ? 'is-active' : ''}`.trim()} onClick={() => setTab('Due Today')}>
          <span className="lead-followups__tile-icon" style={{ color: 'var(--chart-3)' }}><CalendarClock size={16} /></span>
          <span><strong>{totals.dueToday}</strong><small>Due today</small></span>
        </button>
        <button type="button" className={`lead-followups__tile ${tab === 'Upcoming' ? 'is-active' : ''}`.trim()} onClick={() => setTab('Upcoming')}>
          <span className="lead-followups__tile-icon" style={{ color: 'var(--chart-5)' }}><CalendarClock size={16} /></span>
          <span><strong>{totals.upcoming}</strong><small>Upcoming</small></span>
        </button>
        <button type="button" className={`lead-followups__tile ${tab === 'Overdue' ? 'is-active' : ''} ${totals.overdue ? 'is-alert' : ''}`.trim()} onClick={() => setTab('Overdue')}>
          <span className="lead-followups__tile-icon" style={{ color: 'var(--chart-4)' }}><CircleAlert size={16} /></span>
          <span><strong>{totals.overdue}</strong><small>Overdue</small></span>
        </button>
        <button type="button" className={`lead-followups__tile ${tab === 'Completed' ? 'is-active' : ''}`.trim()} onClick={() => setTab('Completed')}>
          <span className="lead-followups__tile-icon" style={{ color: 'var(--chart-7)' }}><CheckCircle2 size={16} /></span>
          <span><strong>{totals.completed}</strong><small>Completed</small></span>
        </button>
        <div className="lead-followups__tile lead-followups__tile--rate">
          <span className="lead-followups__tile-icon" style={{ color: 'var(--chart-2)' }}><UserRound size={16} /></span>
          <span>
            <strong>{totals.completionRate === null ? '—' : `${Math.round(totals.completionRate)}%`}</strong>
            <small>Completion rate · {totals.total} recorded</small>
          </span>
        </div>
      </div>

      <div className="lead-followups__toolbar">
        <div className="segmented" role="group" aria-label="Follow-up period">
          {TABS.map((item) => (
            <button key={item} type="button" className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)} aria-pressed={tab === item}>
              {item}
              {item === 'Overdue' && totals.overdue ? <span className="lead-followups__badge">{totals.overdue}</span> : null}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={onRefresh}>Refresh</Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(followUp) => followUp.id}
        searchable={(followUp) => `${followUp.leadName} ${followUp.company} ${followUp.reason} ${followUp.method} ${followUp.outcome ?? ''}`}
        searchPlaceholder="Search follow-ups, customers or outcomes…"
        pageSize={10}
        initialSort={{ columnId: 'due', direction: 'asc' }}
        onRowClick={(followUp) => onOpenLead(followUp.leadId)}
        filters={
          <>
            <select className="select" value={method} onChange={(event) => setMethod(event.target.value)} aria-label="Filter by follow-up method">
              <option value="All">All methods</option>
              {FOLLOW_UP_METHODS.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="select" value={owner} onChange={(event) => setOwner(event.target.value)} aria-label="Filter by owner">
              <option value="All">All owners</option>
              {owners.map((item) => <option key={item}>{item}</option>)}
            </select>
          </>
        }
        emptyTitle={tab === 'Due Today' ? 'Nothing due today' : tab === 'Overdue' ? 'No overdue follow-ups' : 'No follow-ups in this view'}
        emptyDescription="Schedule a follow-up from a lead profile or the campaign leads table. Dates are based on this browser’s clock."
      />

      {tab !== 'Completed' && rows.length > 0 ? (
        <p className="text-xs muted">
          <CircleAlert size={12} /> Reminders and messages are not sent by this frontend demo. Completing a follow-up stores the outcome and can schedule the next one.
        </p>
      ) : null}

      {totals.overdue > 0 ? (
        <SectionCard title="Overdue attention" subtitle="Open the customer and complete or reschedule these follow-ups." actions={<Badge tone="danger">{totals.overdue} overdue</Badge>}>
          <div className="stack-6">
            {allViews
              .filter((followUp) => followUp.displayStatus === 'Overdue')
              .slice(0, 5)
              .map((followUp) => (
                <button key={followUp.id} type="button" className="lead-dashboard__row" onClick={() => onOpenLead(followUp.leadId)}>
                  <Avatar name={followUp.leadName} size="sm" />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="lead-dashboard__row-title truncate">{followUp.leadName} · {followUp.company || 'No company'}</span>
                    <span className="lead-dashboard__row-meta truncate">{followUp.reason} · due {formatDateTime(followUp.dueAt)}</span>
                  </span>
                  <span className="danger-text text-xs">{followUpLabel(followUp.dueAt)}</span>
                  <ChevronRight size={13} className="faint" />
                </button>
              ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="lead-followups__quick">
        {leads
          .filter((lead) => !['Converted', 'Rejected', 'Not Interested', 'Lost'].includes(lead.status) && !lead.nextFollowUp)
          .slice(0, 4)
          .map((lead) => (
            <button key={lead.id} type="button" className="lead-followups__quick-item" onClick={() => onSchedule(lead)}>
              <CalendarClock size={14} />
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="truncate">{lead.name} has no next follow-up</span>
                <span className="text-xs muted truncate">Schedule the next contact</span>
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}
