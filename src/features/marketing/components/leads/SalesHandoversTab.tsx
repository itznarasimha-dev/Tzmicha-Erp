import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Clock3,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react'
import type {
  Campaign,
  CustomerCommunicationStatus,
  Lead,
  SalesHandoffStatus,
  SalesRepresentative,
} from '../../types/marketing'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Avatar } from '../ui/Avatar'
import { DataTable, type DataTableColumn } from '../ui/DataTable'
import { MetricCard, MetricGrid, TabIntro } from '../marketing/ModuleKit'
import {
  activeSalesManagers,
  businessPhone,
  communicationStatusForSalesStatus,
  firstContactOverdue,
  handoverAgeDays,
  isAwaitingFirstContact,
  isHandoverStalled,
  nextFollowUpOverdue,
  reassignmentRequired,
  salesDesignation,
} from '../../utils/handover'
import { isOverdue } from '../../utils/dates'
import { formatDate, formatDateTime } from '../../utils/format'

type HandoverFilter = 'all' | 'awaiting' | 'overdue' | 'stalled' | 'closed'

const FILTERS: Array<{ id: HandoverFilter; label: string }> = [
  { id: 'all', label: 'All handovers' },
  { id: 'awaiting', label: 'Awaiting first contact' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'stalled', label: 'Stalled / reassign' },
  { id: 'closed', label: 'Converted or lost' },
]

const SALES_TONE: Record<SalesHandoffStatus, 'neutral' | 'info' | 'warning' | 'accent' | 'success' | 'danger'> = {
  Assigned: 'accent',
  Contacted: 'info',
  'Meeting Scheduled': 'warning',
  'Proposal Sent': 'warning',
  Negotiation: 'warning',
  Won: 'success',
  Lost: 'danger',
}

const COMM_TONE: Record<CustomerCommunicationStatus, 'neutral' | 'info' | 'warning' | 'accent' | 'success' | 'danger'> = {
  'Handover Created': 'neutral',
  'Sales Employee Assigned': 'accent',
  'Awaiting First Contact': 'warning',
  'Contact Attempted': 'warning',
  'Customer Contacted': 'info',
  'Follow-Up Scheduled': 'info',
  'Meeting Scheduled': 'warning',
  'Proposal in Progress': 'warning',
  Negotiation: 'warning',
  Converted: 'success',
  Lost: 'danger',
  'Reassignment Required': 'danger',
}

interface SalesHandoversTabProps {
  leads: Lead[]
  campaigns: Campaign[]
  salesReps: SalesRepresentative[]
  onOpenLead: (leadId: string) => void
  onOpenSales: (lead: Lead) => void
}

export function SalesHandoversTab({
  leads,
  campaigns,
  salesReps,
  onOpenLead,
  onOpenSales,
}: SalesHandoversTabProps) {
  const [filter, setFilter] = useState<HandoverFilter>('all')

  const assigned = useMemo(() => leads.filter((lead) => Boolean(lead.salesAssignment)), [leads])
  const awaitingTransfer = useMemo(
    () => leads.filter((lead) => lead.status === 'Qualified' && !lead.salesAssignment && !lead.converted),
    [leads],
  )

  const metrics = useMemo(() => {
    const open = assigned.filter((lead) => !lead.converted && lead.status !== 'Lost')
    return {
      total: assigned.length,
      awaiting: open.filter(isAwaitingFirstContact).length,
      firstContactOverdue: open.filter((lead) => firstContactOverdue(lead.salesAssignment)).length,
      followUpOverdue: open.filter(nextFollowUpOverdue).length,
      stalled: open.filter(isHandoverStalled).length,
      reassign: open.filter(reassignmentRequired).length,
      converted: assigned.filter((lead) => lead.converted || lead.status === 'Converted').length,
      lost: assigned.filter((lead) => lead.status === 'Lost').length,
      notifications: assigned.filter((lead) => lead.salesAssignment?.notifications?.length).length,
      customerPreviews: assigned.filter((lead) => lead.salesAssignment?.customerNotifications?.length).length,
    }
  }, [assigned])

  const rows = useMemo(() => {
    return assigned.filter((lead) => {
      const open = !lead.converted && lead.status !== 'Lost'
      if (filter === 'awaiting') return open && isAwaitingFirstContact(lead)
      if (filter === 'overdue') return open && (firstContactOverdue(lead.salesAssignment) || nextFollowUpOverdue(lead))
      if (filter === 'stalled') return open && (isHandoverStalled(lead) || reassignmentRequired(lead))
      if (filter === 'closed') return lead.converted || lead.status === 'Lost'
      return true
    })
  }, [assigned, filter])

  const columns: DataTableColumn<Lead>[] = [
    {
      id: 'customer',
      header: 'Customer & lead',
      sortValue: (lead) => lead.name,
      mobileLabel: 'Customer',
      render: (lead) => (
        <div className="row-8">
          <Avatar name={lead.name} size="sm" />
          <div style={{ minWidth: 0 }}>
            <p className="cell-primary truncate">{lead.name}</p>
            <p className="text-xs muted truncate">{lead.company || 'No company'} · {lead.id}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'attribution',
      header: 'Marketing attribution',
      sortValue: (lead) => lead.source,
      mobileLabel: 'Attribution',
      hideMobile: true,
      render: (lead) => (
        <div>
          <p className="text-xs">{lead.source}</p>
          <p className="text-xs muted truncate">{campaigns.find((campaign) => campaign.id === lead.campaignId)?.name ?? 'Unattributed'}</p>
          <p className="text-xs muted">Owner {lead.generatedBy || lead.assignedTo}</p>
        </div>
      ),
    },
    {
      id: 'team',
      header: 'Sales team',
      sortValue: (lead) => salesReps.find((rep) => rep.id === lead.salesAssignment?.salesRepId)?.name ?? '',
      mobileLabel: 'Sales team',
      render: (lead) => {
        const rep = salesReps.find((item) => item.id === lead.salesAssignment?.salesRepId)
        const manager = salesReps.find((item) => item.id === lead.salesAssignment?.salesManagerId)
        return (
          <div>
            <p className="text-xs font-semibold truncate">{rep?.name ?? 'Employee unavailable'}</p>
            <p className="text-xs muted truncate">Manager: {manager?.name ?? 'Not recorded'}</p>
            <p className="text-xs muted truncate">{rep ? businessPhone(rep) : ''}</p>
          </div>
        )
      },
    },
    {
      id: 'handover',
      header: 'Handover',
      sortValue: (lead) => lead.salesAssignment?.assignedAt ?? '',
      mobileLabel: 'Handover',
      hideMobile: true,
      render: (lead) => (
        <div>
          <p className="text-xs">{lead.salesAssignment?.assignedAt ? formatDate(lead.salesAssignment.assignedAt) : 'Not recorded'}</p>
          <p className="text-xs muted truncate">{lead.salesAssignment?.handoverId ?? 'Legacy assignment'}</p>
          <p className="text-xs muted">Age {handoverAgeDays(lead.salesAssignment)}d</p>
        </div>
      ),
    },
    {
      id: 'firstContact',
      header: 'First contact',
      sortValue: (lead) => lead.salesAssignment?.firstContactAt ?? lead.salesAssignment?.expectedFirstContact ?? '',
      mobileLabel: 'First contact',
      render: (lead) => {
        const assignment = lead.salesAssignment
        if (!assignment) return null
        const late = firstContactOverdue(assignment)
        return (
          <div>
            {assignment.firstContactAt ? (
              <Badge tone="success">Contacted {formatDate(assignment.firstContactAt)}</Badge>
            ) : late ? (
              <Badge tone="danger">Overdue</Badge>
            ) : (
              <Badge tone="warning">Awaiting</Badge>
            )}
            <p className={late ? 'text-xs danger-text' : 'text-xs muted'}>
              {assignment.firstContactAt
                ? `First recorded ${formatDateTime(assignment.firstContactAt)}`
                : assignment.expectedFirstContact
                  ? `Target ${formatDateTime(assignment.expectedFirstContact)}`
                  : 'No target set'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'followUp',
      header: 'Follow-up',
      sortValue: (lead) => (lead.nextFollowUp ? new Date(lead.nextFollowUp).getTime() : 0),
      mobileLabel: 'Follow-up',
      hideMobile: true,
      render: (lead) => (
        <div>
          <p className="text-xs">{lead.nextFollowUp ? formatDate(lead.nextFollowUp) : 'Not scheduled'}</p>
          <p className={lead.nextFollowUp && isOverdue(lead.nextFollowUp) ? 'text-xs danger-text' : 'text-xs muted'}>
            Last {lead.salesAssignment?.lastContact ? formatDate(lead.salesAssignment.lastContact) : 'not recorded'}
          </p>
          {nextFollowUpOverdue(lead) ? <Badge tone="danger">Overdue follow-up</Badge> : null}
        </div>
      ),
    },
    {
      id: 'communication',
      header: 'Customer comms',
      sortValue: (lead) => lead.salesAssignment?.communicationStatus ?? '',
      mobileLabel: 'Customer comms',
      hideMobile: true,
      render: (lead) => {
        const assignment = lead.salesAssignment
        if (!assignment) return null
        const status = assignment.communicationStatus ?? communicationStatusForSalesStatus(assignment.salesStatus)
        return (
          <div>
            <Badge tone={COMM_TONE[status]}>{status}</Badge>
            <p className="text-xs muted mt-4">
              {assignment.notifications?.length ? <><BellDot /> Recipients simulated</> : 'Notifications not recorded'}
            </p>
            <p className="text-xs muted">
              {assignment.customerNotifications?.length ? 'Customer preview simulated' : 'No customer preview'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'sales',
      header: 'Sales outcome',
      sortValue: (lead) => lead.salesAssignment?.salesStatus ?? '',
      mobileLabel: 'Sales outcome',
      render: (lead) => {
        const assignment = lead.salesAssignment
        if (!assignment) return null
        return (
          <div>
            <Badge tone={SALES_TONE[assignment.salesStatus]}>{assignment.salesStatus}</Badge>
            {reassignmentRequired(lead) ? <p className="text-xs danger-text">Reassignment required</p> : null}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      mobileLabel: 'Actions',
      render: (lead) => (
        <Button
          variant="ghost"
          size="xs"
          onClick={(event) => {
            event.stopPropagation()
            onOpenSales(lead)
          }}
        >
          Monitor <ChevronRight size={12} />
        </Button>
      ),
    },
  ]

  return (
    <div className="stack-16">
      <TabIntro
        title="Marketing → Sales handover tracking"
        description="One shared handover record per qualified lead. Marketing keeps attribution and outcome visibility; the Sales employee and Sales Manager work from the same record."
        actions={<Badge tone="accent">{metrics.total} shared handover{metrics.total === 1 ? '' : 's'}</Badge>}
      />

      <MetricGrid>
        <MetricCard label="Handed over" value={metrics.total} sub={`${metrics.notifications} with simulated notifications`} icon={<Send size={15} />} tone="var(--chart-1)" />
        <MetricCard label="Awaiting first contact" value={metrics.awaiting} sub={`${metrics.firstContactOverdue} past the configured target`} icon={<Clock3 size={15} />} tone="var(--chart-3)" />
        <MetricCard label="Overdue follow-ups" value={metrics.followUpOverdue} sub="Sales Manager watchlist" icon={<CalendarClock size={15} />} tone="var(--chart-4)" />
        <MetricCard label="Stalled / reassign" value={metrics.reassign || metrics.stalled} sub="Authorized reassignment available" icon={<CircleAlert size={15} />} tone="var(--chart-5)" />
        <MetricCard label="Converted" value={metrics.converted} sub={`${metrics.lost} lost · latest Sales outcome`} icon={<BadgeCheck size={15} />} tone="var(--chart-2)" />
      </MetricGrid>

      {awaitingTransfer.length ? (
        <div className="qualified-transfer-strip">
          <span className="qualified-transfer-strip__icon"><Target size={16} /></span>
          <div className="grow">
            <strong>{awaitingTransfer.length} qualified lead{awaitingTransfer.length === 1 ? '' : 's'} awaiting transfer</strong>
            <p className="text-xs muted">Qualified is not the same as handed over. Confirm the handover to notify Sales and prepare customer messages.</p>
          </div>
          <div className="row-8 wrap">
            {awaitingTransfer.slice(0, 3).map((lead) => (
              <Button key={lead.id} variant="ghost" size="xs" onClick={() => onOpenLead(lead.id)}>{lead.name}</Button>
            ))}
            {awaitingTransfer.length > 3 ? <Badge tone="neutral">+{awaitingTransfer.length - 3} more</Badge> : null}
          </div>
        </div>
      ) : null}

      <div className="segmented sales-handover__filters" role="group" aria-label="Handover filter">
        {FILTERS.map((option) => (
          <button key={option.id} type="button" className={filter === option.id ? 'is-active' : ''} aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>
            {option.label}
          </button>
        ))}
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(lead) => lead.id}
        searchable={(lead) => {
          const rep = salesReps.find((item) => item.id === lead.salesAssignment?.salesRepId)
          const manager = salesReps.find((item) => item.id === lead.salesAssignment?.salesManagerId)
          return `${lead.name} ${lead.company} ${lead.id} ${lead.source} ${rep?.name ?? ''} ${manager?.name ?? ''} ${lead.salesAssignment?.salesStatus ?? ''}`
        }}
        searchPlaceholder="Search customers, employees, managers or outcomes…"
        pageSize={8}
        initialSort={{ columnId: 'handover', direction: 'desc' }}
        onRowClick={(lead) => onOpenSales(lead)}
        caption="Shared Marketing to Sales handovers"
        emptyTitle="No handovers match this filter"
        emptyDescription="Qualify a lead, confirm the Sales handover and it will appear here with its employee, manager and tracking status."
        toolbarActions={<span className="text-xs muted">{rows.length} in view · first-contact targets are recorded per handover</span>}
      />

      <div className="sales-handover__tab-notes">
        <div className="sales-handover__tab-note">
          <MessageSquare size={15} />
          <div>
            <strong>Customer communication is separate from Sales status</strong>
            <p className="text-xs muted">“Customer notified” describes a simulated message preview. “Negotiation” describes the Sales opportunity.</p>
          </div>
        </div>
        <div className="sales-handover__tab-note">
          <ShieldCheck size={15} />
          <div>
            <strong>Manager exceptions are visible</strong>
            <p className="text-xs muted">Expected first contact, overdue follow-ups and stalled handovers are highlighted with a reassignment path.</p>
          </div>
        </div>
        <div className="sales-handover__tab-note">
          <Mail size={15} />
          <div>
            <strong>No delivery is claimed</strong>
            <p className="text-xs muted">WhatsApp and email previews are stored as simulated. No external provider or CRM receives data.</p>
          </div>
        </div>
        <div className="sales-handover__tab-note">
          <Users size={15} />
          <div>
            <strong>{activeSalesManagers(salesReps).length} Sales Managers available</strong>
            <p className="text-xs muted">{[...new Set(activeSalesManagers(salesReps).map((manager) => salesDesignation(manager)))].join(' · ')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BellDot() {
  return <span className="inline-dot" aria-hidden="true" />
}
