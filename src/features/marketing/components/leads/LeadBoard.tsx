import { useMemo, useState } from 'react'
import {
  ArchiveRestore,
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Columns3,
  Flame,
  GripVertical,
  List,
  Mail,
  Phone,
  Plus,
  Send,
  UserRound,
  UserX,
  XCircle,
} from 'lucide-react'
import type {
  Campaign,
  Customer,
  Lead,
  Opportunity,
  SalesHandoffStatus,
  SalesRepresentative,
} from '../../types/marketing'
import { Button } from '../ui/Button'
import { Badge, PriorityBadge, StatusBadge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Form'
import { Avatar } from '../ui/Avatar'
import {
  LEAD_BOARD_STAGES,
  LEAD_PRIORITY_OPTIONS,
  REJECTION_REASONS,
  SALES_HANDOFF_STATUSES,
  boardStageFor,
  boardStageLabel,
  hasRecordedRequirement,
  isOutcomeStage,
  leadConversionDate,
  leadLocation,
  leadLostDate,
  leadNameList,
  leadRejectionDate,
  primaryRequirement,
  type BoardStageId,
} from '../../utils/leads'
import { followUpLabel, isOverdue, isToday } from '../../utils/dates'
import { formatDate, formatINR, formatNumber } from '../../utils/format'

type OutcomeView = 'pipeline' | 'rejected' | 'converted' | 'lost'
type FollowUpFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'none'

const OUTCOME_VIEWS: Array<{ id: OutcomeView; label: string; icon: typeof UserX; tone: string }> = [
  { id: 'pipeline', label: 'Pipeline', icon: Columns3, tone: 'var(--chart-1)' },
  { id: 'rejected', label: 'Rejected', icon: UserX, tone: 'var(--chart-4)' },
  { id: 'converted', label: 'Converted', icon: BadgeCheck, tone: 'var(--chart-7)' },
  { id: 'lost', label: 'Lost', icon: XCircle, tone: 'var(--chart-8)' },
]

const OUTCOME_META: Record<Exclude<OutcomeView, 'pipeline'>, { label: string; description: string; tone: 'danger' | 'success' | 'neutral' }> = {
  rejected: {
    label: 'Rejected leads',
    description: 'A marketing outcome for disqualified or uninterested leads. These leads never enter the sales workflow and keep their full history.',
    tone: 'danger',
  },
  converted: {
    label: 'Converted customers',
    description: 'Leads that completed the customer-conversion workflow and are linked to an existing or newly created customer record.',
    tone: 'success',
  },
  lost: {
    label: 'Lost by sales',
    description: 'Qualified customers whose sales deal closed without a purchase. This is a sales outcome, not a marketing rejection.',
    tone: 'neutral',
  },
}

export interface LeadBoardProps {
  leads: Lead[]
  salesReps: SalesRepresentative[]
  campaigns: Campaign[]
  customers: Customer[]
  opportunities: Opportunity[]
  onOpenLead: (leadId: string) => void
  onOpenSales: (lead: Lead) => void
  /**
   * Persists a stage move. Sent to Sales, Rejected and Converted are routed
   * through the dedicated workflows by the page, so the board never writes
   * those silently.
   */
  onMoveLead: (
    lead: Lead,
    stage: BoardStageId,
    options?: { reason?: string; notes?: string },
  ) => Promise<boolean> | boolean
  onEditLead: (lead: Lead) => void
  onSendToSales: (lead: Lead) => void
  onConvert: (lead: Lead) => void
  onFollowUp: (lead: Lead) => void
  onRestoreLead: (lead: Lead) => void
  onAddLead: () => void
}

const FLOW_STAGES: BoardStageId[] = ['sent-to-sales']

function matchesFollowUp(lead: Lead, filter: FollowUpFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'none') return !lead.nextFollowUp
  if (!lead.nextFollowUp) return false
  if (filter === 'overdue') return isOverdue(lead.nextFollowUp)
  if (filter === 'today') return isToday(lead.nextFollowUp)
  return !isOverdue(lead.nextFollowUp) && !isToday(lead.nextFollowUp)
}

/** Sales status for filtering and list display, including legacy outcome records. */
function salesStatusForLead(lead: Lead): SalesHandoffStatus | null {
  if (lead.salesAssignment) return lead.salesAssignment.salesStatus
  if (lead.status === 'Lost') return 'Lost'
  if (lead.status === 'Converted' || lead.converted) return 'Won'
  return null
}

export function LeadBoard({
  leads,
  salesReps,
  campaigns,
  customers,
  opportunities,
  onOpenLead,
  onOpenSales,
  onMoveLead,
  onEditLead,
  onSendToSales,
  onConvert,
  onFollowUp,
  onRestoreLead,
  onAddLead,
}: LeadBoardProps) {
  const [view, setView] = useState<'board' | 'list'>('board')
  const [outcome, setOutcome] = useState<OutcomeView>('pipeline')
  const [stageFilter, setStageFilter] = useState<'all' | BoardStageId>('all')
  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'unassigned' | SalesHandoffStatus>('all')
  const [salesRepFilter, setSalesRepFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropStage, setDropStage] = useState<BoardStageId | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [rejectLead, setRejectLead] = useState<Lead | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [rejectError, setRejectError] = useState('')

  const sourceOptions = useMemo(
    () => [...new Set(leads.map((lead) => lead.source))].sort(),
    [leads],
  )
  const activeReps = useMemo(() => salesReps.filter((rep) => rep.active), [salesReps])

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        if (priorityFilter !== 'all' && lead.priority !== priorityFilter) return false
        if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false
        if (campaignFilter !== 'all' && lead.campaignId !== campaignFilter) return false
        if (salesRepFilter !== 'all' && lead.salesAssignment?.salesRepId !== salesRepFilter) return false
        const salesStatus = salesStatusForLead(lead)
        if (salesStatusFilter === 'unassigned' && salesStatus) return false
        if (
          salesStatusFilter !== 'all' &&
          salesStatusFilter !== 'unassigned' &&
          salesStatus !== salesStatusFilter
        ) {
          return false
        }
        if (!matchesFollowUp(lead, followUpFilter)) return false
        return true
      }),
    [leads, priorityFilter, sourceFilter, campaignFilter, salesRepFilter, salesStatusFilter, followUpFilter],
  )

  const outcomeCounts = useMemo(() => {
    const counts: Record<OutcomeView, number> = { pipeline: 0, rejected: 0, converted: 0, lost: 0 }
    filteredLeads.forEach((lead) => {
      const stage = boardStageFor(lead)
      if (isOutcomeStage(stage)) counts[stage as Exclude<OutcomeView, 'pipeline'>] += 1
      else counts.pipeline += 1
    })
    return counts
  }, [filteredLeads])

  const pipelineLeads = useMemo(
    () =>
      filteredLeads.filter((lead) => {
        const stage = boardStageFor(lead)
        if (isOutcomeStage(stage)) return false
        if (stageFilter !== 'all' && stage !== stageFilter) return false
        return true
      }),
    [filteredLeads, stageFilter],
  )

  const outcomeLeads = useMemo(
    () => (outcome === 'pipeline' ? [] : filteredLeads.filter((lead) => boardStageFor(lead) === outcome)),
    [filteredLeads, outcome],
  )

  const listLeads = outcome === 'pipeline' ? pipelineLeads : outcomeLeads

  const grouped = useMemo(() => {
    const map = new Map<BoardStageId, Lead[]>()
    LEAD_BOARD_STAGES.forEach((stage) => map.set(stage.id, []))
    pipelineLeads.forEach((lead) => {
      const stage = boardStageFor(lead)
      map.set(stage, [...(map.get(stage) ?? []), lead])
    })
    return map
  }, [pipelineLeads])

  const visibleStages = useMemo(
    () =>
      stageFilter === 'all'
        ? LEAD_BOARD_STAGES
        : LEAD_BOARD_STAGES.filter((stage) => stage.id === stageFilter),
    [stageFilter],
  )

  const activeFilterCount = [
    stageFilter !== 'all',
    salesStatusFilter !== 'all',
    salesRepFilter !== 'all',
    priorityFilter !== 'all',
    followUpFilter !== 'all',
    sourceFilter !== 'all',
    campaignFilter !== 'all',
  ].filter(Boolean).length

  const resetFilters = () => {
    setStageFilter('all')
    setSalesStatusFilter('all')
    setSalesRepFilter('all')
    setPriorityFilter('all')
    setFollowUpFilter('all')
    setSourceFilter('all')
    setCampaignFilter('all')
  }

  const requestMove = async (lead: Lead, stage: BoardStageId, options?: { reason?: string; notes?: string }) => {
    const current = boardStageFor(lead)
    if (current === stage) return false

    if (lead.converted || lead.status === 'Converted') {
      setAnnouncement(`${lead.name} is already converted and cannot be moved back into the open pipeline.`)
      return false
    }
    if (stage === 'lost') {
      setAnnouncement('Lost is a sales outcome. Update the sales handoff status from the lead profile.')
      return false
    }
    if (lead.salesAssignment && stage !== 'converted') {
      setAnnouncement(`${lead.name} is owned by sales. Update the sales handoff status from the profile instead of moving it back through marketing.`)
      return false
    }
    if (stage === 'sent-to-sales') {
      onSendToSales(lead)
      return false
    }
    if (stage === 'converted') {
      onConvert(lead)
      return false
    }
    if (stage === 'rejected') {
      setRejectLead(lead)
      setRejectReason('')
      setRejectNotes('')
      setRejectError('')
      return false
    }
    if (stage === 'qualified') {
      const hasProduct = Boolean(lead.product || lead.interests?.products?.length)
      if (!hasProduct || !hasRecordedRequirement(lead)) {
        setAnnouncement(`Add a product interest and a customer requirement before moving ${lead.name} to Qualified.`)
        return false
      }
    }

    setSavingId(lead.id)
    try {
      const saved = await onMoveLead(lead, stage, options)
      if (saved) {
        setAnnouncement(`${lead.name} moved to ${boardStageLabel(stage)}. Saved in this browser.`)
      }
      return saved
    } finally {
      setSavingId(null)
    }
  }

  const confirmReject = async () => {
    if (!rejectLead) return
    if (!rejectReason.trim()) {
      setRejectError('Choose the reason this lead is being rejected. It is kept in the lead history.')
      return
    }
    if (rejectReason === 'Other documented reason' && !rejectNotes.trim()) {
      setRejectError('Add a short note describing the documented reason.')
      return
    }
    const lead = rejectLead
    setSavingId(lead.id)
    try {
      const saved = await onMoveLead(lead, 'rejected', {
        reason: rejectReason,
        notes: rejectNotes.trim() || undefined,
      })
      if (saved) {
        setRejectLead(null)
        setAnnouncement(`${lead.name} was rejected with a recorded reason. It stays available in Rejected leads.`)
      } else {
        setRejectError('The rejection could not be saved. Check the lead record and try again.')
      }
    } finally {
      setSavingId(null)
    }
  }

  const stageControl = (lead: Lead, stage: BoardStageId) => {
    if (stage === 'lost') return <Badge tone="danger">Lost by sales</Badge>
    if (stage === 'converted') return <Badge tone="success">Converted</Badge>
    if (lead.salesAssignment) {
      return (
        <button
          type="button"
          className="lead-board__sales-link"
          onClick={() => onOpenSales(lead)}
          aria-label={`Open the sales handoff for ${lead.name}`}
        >
          <span>Sales-owned</span>
          <strong>{lead.salesAssignment.salesStatus}</strong>
          <ChevronRight size={11} aria-hidden="true" />
        </button>
      )
    }

    return (
      <label className="lead-board__stage-select">
        <span className="sr-only">Move {lead.name} to another stage</span>
        <select
          className="select"
          value={stage}
          disabled={savingId === lead.id}
          onChange={(event) => {
            const next = event.target.value as BoardStageId
            void requestMove(lead, next)
          }}
        >
          {LEAD_BOARD_STAGES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
          <option value="rejected">Rejected</option>
          <option value="converted">Converted</option>
        </select>
      </label>
    )
  }

  const handoffDetails = (lead: Lead) => {
    const assignment = lead.salesAssignment
    if (!assignment) return null
    const rep = salesReps.find((item) => item.id === assignment.salesRepId)
    const campaign = campaigns.find((item) => item.id === lead.campaignId)
    const budget =
      lead.interests?.budget !== null && lead.interests?.budget !== undefined
        ? formatINR(lead.interests.budget)
        : lead.qualification?.budgetRange || lead.interests?.priceRange || 'Not recorded'
    const timeline = lead.qualification?.purchaseTimeline || lead.interests?.expectedPurchaseDate || 'Not recorded'

    return (
      <span className="lead-card__handoff-panel">
        <span className="lead-card__handoff-row">
          <span>Contact</span>
          <strong>
            <span className="row-4"><Phone size={10} />{lead.phone || 'Not recorded'}</span>
            <span className="row-4"><Mail size={10} />{lead.email || 'Not recorded'}</span>
          </strong>
        </span>
        <span className="lead-card__handoff-row">
          <span>Requirement</span>
          <strong className="lead-card__clamp">{primaryRequirement(lead)}</strong>
        </span>
        <span className="lead-card__handoff-row">
          <span>Budget · timeline</span>
          <strong>{budget} · {timeline}</strong>
        </span>
        <span className="lead-card__handoff-row">
          <span>Source · campaign</span>
          <strong>{lead.source} · {campaign?.name ?? 'Unattributed'}</strong>
        </span>
        <span className="lead-card__handoff-row">
          <span>Sales owner</span>
          <strong>{rep?.name ?? 'Sales employee unavailable'} · {assignment.salesStatus}</strong>
        </span>
        <span className="lead-card__handoff-row">
          <span>Assigned</span>
          <strong>{formatDate(assignment.assignedAt)}</strong>
        </span>
        <span className="lead-card__handoff-row lead-card__handoff-row--full">
          <span>Handoff note</span>
          <strong className="lead-card__clamp">{assignment.handoffNote || 'No handoff note recorded'}</strong>
        </span>
        {assignment.nextAction ? (
          <span className="lead-card__handoff-row lead-card__handoff-row--full">
            <span>Next action</span>
            <strong className="lead-card__clamp">{assignment.nextAction}</strong>
          </span>
        ) : null}
      </span>
    )
  }

  const outcomeCard = (lead: Lead) => {
    const stage = boardStageFor(lead)
    const assignment = lead.salesAssignment
    const rep = assignment ? salesReps.find((item) => item.id === assignment.salesRepId) : null
    const campaign = campaigns.find((item) => item.id === lead.campaignId)
    const customer = lead.customerId ? customers.find((item) => item.id === lead.customerId) : null
    const opportunity = opportunities.find((item) => item.leadId === lead.id)

    return (
      <article key={lead.id} className="lead-outcome-card">
        <div className="lead-outcome-card__head">
          <Avatar name={lead.name} size="sm" />
          <div className="grow" style={{ minWidth: 0 }}>
            <p className="lead-outcome-card__name truncate">{lead.name}</p>
            <p className="lead-outcome-card__company truncate">{lead.company || 'No company'}</p>
          </div>
          <StatusBadge status={lead.status} />
        </div>

        <div className="lead-outcome-card__meta">
          <PriorityBadge priority={lead.priority} />
          <span>{lead.source}</span>
          <span>{campaign?.name ?? 'Unattributed'}</span>
        </div>

        {stage === 'rejected' ? (
          <div className="lead-outcome-card__reason">
            <p className="lead-outcome-card__reason-label">Rejection reason</p>
            <p>{lead.rejection?.reason ?? lead.lostReason ?? (lead.status === 'Not Interested' ? 'Marked Not Interested — no reason recorded for this legacy lead' : 'Reason not recorded')}</p>
            {lead.rejection?.notes ? <p className="lead-outcome-card__notes">{lead.rejection.notes}</p> : null}
            <p className="text-xs muted">
              {leadRejectionDate(lead) ? formatDate(leadRejectionDate(lead) as string) : 'Date not recorded'}
              {lead.rejection?.rejectedBy ? ` · ${lead.rejection.rejectedBy}` : ''}
            </p>
          </div>
        ) : null}

        {stage === 'lost' ? (
          <div className="lead-outcome-card__reason lead-outcome-card__reason--lost">
            <p className="lead-outcome-card__reason-label">Sales loss reason</p>
            <p>{lead.lostReason || 'No loss reason recorded'}</p>
            <p className="text-xs muted">
              {leadLostDate(lead) ? formatDate(leadLostDate(lead) as string) : 'Date not recorded'}
              {rep ? ` · ${rep.name}` : ''}
            </p>
          </div>
        ) : null}

        {stage === 'converted' ? (
          <div className="lead-outcome-card__conversion">
            <div><span>Customer</span><strong>{customer ? `${customer.id} · ${customer.name}` : lead.customerId ?? 'Linked record unavailable'}</strong></div>
            <div><span>Converted</span><strong>{leadConversionDate(lead) ? formatDate(leadConversionDate(lead) as string) : 'Date not recorded'}</strong></div>
            <div><span>Opportunity</span><strong>{opportunity ? `${opportunity.id} · ${opportunity.stage}` : lead.conversion?.opportunityId ?? 'Not created'}</strong></div>
            <div><span>Sales owner</span><strong>{rep?.name ?? (assignment ? 'Sales employee unavailable' : 'Not assigned')}</strong></div>
          </div>
        ) : null}

        <div className="lead-outcome-card__foot">
          <Button variant="ghost" size="xs" onClick={() => onOpenLead(lead.id)}>Open</Button>
          {stage === 'rejected' ? (
            <Button variant="soft" size="xs" icon={<ArchiveRestore size={11} />} onClick={() => onRestoreLead(lead)}>
              Restore lead
            </Button>
          ) : null}
          {stage === 'lost' && assignment ? (
            <Button variant="ghost" size="xs" onClick={() => onOpenSales(lead)}>Sales handoff</Button>
          ) : null}
        </div>
      </article>
    )
  }

  const outcomeMeta = outcome === 'pipeline' ? null : OUTCOME_META[outcome]

  return (
    <div className="lead-board stack-12">
      <div className="lead-board__toolbar">
        <div className="lead-board__view-toggle segmented" role="group" aria-label="Lead board view">
          <button type="button" className={view === 'board' ? 'is-active' : ''} onClick={() => setView('board')} aria-pressed={view === 'board'}>
            <Columns3 size={13} /> Board
          </button>
          <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}>
            <List size={13} /> List
          </button>
        </div>
        <div className="lead-board__toolbar-meta">
          <Badge tone="neutral">{formatNumber(listLeads.length)} leads</Badge>
          <Button variant="soft" size="sm" icon={<Plus size={14} />} onClick={onAddLead}>New lead</Button>
        </div>
      </div>

      <div className="lead-board__outcomes segmented" role="group" aria-label="Lead outcome view">
        {OUTCOME_VIEWS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={outcome === item.id ? 'is-active' : ''}
              onClick={() => setOutcome(item.id)}
              aria-pressed={outcome === item.id}
            >
              <Icon size={13} />
              {item.label}
              <span className="lead-board__outcome-count">{formatNumber(outcomeCounts[item.id])}</span>
            </button>
          )
        })}
      </div>

      <div className="lead-board__filters" role="group" aria-label="Lead board filters">
        <label className="lead-board__filter">
          <span>Stage</span>
          <select
            className="select"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value as 'all' | BoardStageId)}
            disabled={outcome !== 'pipeline'}
          >
            <option value="all">All stages</option>
            {LEAD_BOARD_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </select>
        </label>
        <label className="lead-board__filter">
          <span>Sales status</span>
          <select className="select" value={salesStatusFilter} onChange={(event) => setSalesStatusFilter(event.target.value as typeof salesStatusFilter)}>
            <option value="all">All sales statuses</option>
            <option value="unassigned">Not sent to sales</option>
            {SALES_HANDOFF_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="lead-board__filter">
          <span>Sales employee</span>
          <select className="select" value={salesRepFilter} onChange={(event) => setSalesRepFilter(event.target.value)}>
            <option value="all">All sales employees</option>
            {activeReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
          </select>
        </label>
        <label className="lead-board__filter">
          <span>Priority</span>
          <select className="select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="all">All priorities</option>
            {LEAD_PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </label>
        <label className="lead-board__filter">
          <span>Follow-up</span>
          <select className="select" value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value as FollowUpFilter)}>
            <option value="all">All follow-up dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="upcoming">Upcoming</option>
            <option value="none">Not scheduled</option>
          </select>
        </label>
        <label className="lead-board__filter">
          <span>Source</span>
          <select className="select" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="all">All sources</option>
            {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
          </select>
        </label>
        <label className="lead-board__filter">
          <span>Campaign</span>
          <select className="select" value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}>
            <option value="all">All campaigns</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </label>
        <div className="lead-board__filter-reset">
          <span className="text-xs muted">{activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active` : 'No filters active'}</span>
          <Button variant="ghost" size="xs" onClick={resetFilters} disabled={!activeFilterCount}>Reset</Button>
        </div>
      </div>

      <div className="callout callout--info">
        <CircleAlert size={14} />
        <span>
          Four marketing stages: New Leads → Follow-up → Qualified → Sent to Sales. Rejected, Converted and
          Lost are separate outcome views. Send to Sales, rejection and conversion always open their required
          workflow instead of changing status silently.
        </span>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      {announcement ? <div className="lead-board__announcement" aria-hidden="true">{announcement}</div> : null}

      {outcome !== 'pipeline' && outcomeMeta ? (
        <section className="lead-outcome" aria-labelledby={`lead-outcome-${outcome}`}>
          <header className="lead-outcome__head">
            <span className="lead-board__dot" style={{ background: OUTCOME_VIEWS.find((item) => item.id === outcome)?.tone }} aria-hidden="true" />
            <div className="grow">
              <h3 id={`lead-outcome-${outcome}`}>{outcomeMeta.label}</h3>
              <p>{outcomeMeta.description}</p>
            </div>
            <Badge tone={outcomeMeta.tone}>{formatNumber(outcomeLeads.length)}</Badge>
          </header>
          {outcomeLeads.length === 0 ? (
            <div className="lead-board__empty">No leads in this outcome with the current filters.</div>
          ) : (
            <div className="lead-outcome__grid">{outcomeLeads.map(outcomeCard)}</div>
          )}
        </section>
      ) : view === 'board' ? (
        <div className={`lead-board__grid ${visibleStages.length === 1 ? 'lead-board__grid--single' : ''}`.trim()}>
          {visibleStages.map((stage) => {
            const stageLeads = grouped.get(stage.id) ?? []
            const isDropTarget = dropStage === stage.id
            return (
              <section
                key={stage.id}
                className={`lead-board__col ${isDropTarget ? 'is-drop-target' : ''} ${FLOW_STAGES.includes(stage.id) ? 'is-flow-stage' : ''}`.trim()}
                aria-labelledby={`lead-stage-${stage.id}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDropStage(stage.id)
                }}
                onDragLeave={() => setDropStage((current) => (current === stage.id ? null : current))}
                onDrop={(event) => {
                  event.preventDefault()
                  setDropStage(null)
                  const lead = leads.find((item) => item.id === draggingId)
                  setDraggingId(null)
                  if (lead) void requestMove(lead, stage.id)
                }}
              >
                <header className="lead-board__col-head">
                  <span className="lead-board__dot" style={{ background: stage.tone }} aria-hidden="true" />
                  <h3 id={`lead-stage-${stage.id}`}>{stage.label}</h3>
                  <span className="lead-board__count">{stageLeads.length}</span>
                </header>
                <p className="lead-board__col-hint">{stage.description}</p>

                {stageLeads.length === 0 ? (
                  <div className="lead-board__empty">
                    {isDropTarget ? 'Drop here' : 'No leads in this stage'}
                  </div>
                ) : null}

                {stageLeads.map((lead) => {
                  const saving = savingId === lead.id
                  return (
                    <article
                      key={lead.id}
                      className={`lead-card ${saving ? 'is-saving' : ''} ${draggingId === lead.id ? 'is-dragging' : ''}`.trim()}
                      draggable={!lead.converted && !saving}
                      onDragStart={() => setDraggingId(lead.id)}
                      onDragEnd={() => { setDraggingId(null); setDropStage(null) }}
                      aria-busy={saving || undefined}
                    >
                      <button type="button" className="lead-card__main" onClick={() => onOpenLead(lead.id)}>
                        <span className="lead-card__top">
                          <Avatar name={lead.name} size="sm" />
                          <span className="grow" style={{ minWidth: 0 }}>
                            <span className="lead-card__name truncate">{lead.name}</span>
                            <span className="lead-card__company truncate">{lead.company || 'No company'}</span>
                          </span>
                          <GripVertical size={13} className="lead-card__drag" aria-hidden="true" />
                        </span>
                        <span className="lead-card__meta">
                          <PriorityBadge priority={lead.priority} />
                          {lead.priority === 'Urgent' ? <Flame size={11} className="danger-text" aria-label="Urgent" /> : null}
                          <span className="lead-card__source truncate">{lead.source}</span>
                        </span>
                        <span className="lead-card__detail truncate">{leadNameList(lead)}</span>
                        <span className="lead-card__location truncate">{leadLocation(lead) || 'Location not recorded'}</span>
                        <span className="lead-card__footer">
                          <CalendarClock size={11} />
                          {lead.nextFollowUp ? (
                            <span className={isOverdue(lead.nextFollowUp) ? 'danger-text' : ''}>
                              {followUpLabel(lead.nextFollowUp)}
                            </span>
                          ) : (
                            <span>No follow-up</span>
                          )}
                          {lead.salesAssignment ? (
                            <span className="lead-card__handoff">{lead.salesAssignment.salesStatus}</span>
                          ) : null}
                        </span>
                      </button>

                      {stage.id === 'sent-to-sales' ? handoffDetails(lead) : null}

                      {stageControl(lead, stage.id)}

                      <div className="lead-card__actions">
                        <Button variant="ghost" size="xs" onClick={() => onOpenLead(lead.id)}>Open</Button>
                        {stage.id === 'qualified' ? (
                          <Button variant="primary" size="xs" onClick={() => onSendToSales(lead)} icon={<Send size={11} />}>
                            Send to Sales
                          </Button>
                        ) : null}
                        {stage.id === 'sent-to-sales' ? (
                          <Button variant="ghost" size="xs" onClick={() => onOpenSales(lead)} icon={<UserRound size={11} />}>
                            Sales status
                          </Button>
                        ) : (
                          <Button variant="ghost" size="xs" onClick={() => onFollowUp(lead)} icon={<CalendarClock size={11} />}>
                            Follow-up
                          </Button>
                        )}
                        {stage.id === 'new' || stage.id === 'follow-up' ? (
                          <Button variant="ghost" size="xs" onClick={() => onEditLead(lead)}>Edit</Button>
                        ) : null}
                        {!lead.salesAssignment && stage.id !== 'sent-to-sales' ? (
                          <Button variant="ghost" size="xs" onClick={() => { setRejectLead(lead); setRejectReason(''); setRejectNotes(''); setRejectError('') }}>
                            Reject
                          </Button>
                        ) : null}
                      </div>
                      {saving ? <span className="lead-card__saving" aria-hidden="true">Saving…</span> : null}
                    </article>
                  )
                })}
              </section>
            )
          })}
        </div>
      ) : (
        <div className="card card--flush lead-board__list">
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">All leads with their current board stage</caption>
              <thead>
                <tr>
                  <th scope="col">Lead</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Sales status</th>
                  <th scope="col">Next follow-up</th>
                  <th scope="col">Owner</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {listLeads.length === 0 ? (
                  <tr><td colSpan={7}><p className="empty-inline">No leads match the current filters.</p></td></tr>
                ) : null}
                {[...listLeads]
                  .sort((a, b) => LEAD_BOARD_STAGES.findIndex((stage) => stage.id === boardStageFor(a)) - LEAD_BOARD_STAGES.findIndex((stage) => stage.id === boardStageFor(b)))
                  .map((lead) => {
                    const stage = boardStageFor(lead)
                    const salesStatus = salesStatusForLead(lead)
                    return (
                      <tr key={lead.id}>
                        <td>
                          <div className="row-8" style={{ minWidth: 0 }}>
                            <Avatar name={lead.name} size="sm" />
                            <div style={{ minWidth: 0 }}>
                              <p className="cell-primary truncate">{lead.name}</p>
                              <p className="text-xs muted truncate">{lead.company || 'No company'} · {formatDate(lead.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td>{stageControl(lead, stage)}</td>
                        <td><PriorityBadge priority={lead.priority} /></td>
                        <td>
                          {salesStatus ? (
                            <Badge tone="accent">{salesStatus}</Badge>
                          ) : <span className="text-xs muted">Not sent</span>}
                        </td>
                        <td>
                          {lead.nextFollowUp ? (
                            <span className={isOverdue(lead.nextFollowUp) ? 'danger-text text-xs' : 'text-xs'}>
                              {followUpLabel(lead.nextFollowUp)}
                            </span>
                          ) : <span className="text-xs muted">Not scheduled</span>}
                        </td>
                        <td><span className="text-xs">{lead.assignedTo}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="row-4" style={{ justifyContent: 'flex-end' }}>
                            {stage === 'rejected' ? (
                              <Button variant="ghost" size="xs" onClick={() => onRestoreLead(lead)}>Restore</Button>
                            ) : null}
                            <Button variant="ghost" size="xs" onClick={() => onOpenLead(lead.id)}>Open <ChevronRight size={12} /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(rejectLead)}
        onClose={() => setRejectLead(null)}
        title="Reject this lead?"
        description={rejectLead ? `${rejectLead.name} · ${rejectLead.company || 'No company'} · ${rejectLead.id}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectLead(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmReject} disabled={Boolean(rejectLead && savingId === rejectLead.id)}>
              {rejectLead && savingId === rejectLead.id ? 'Rejecting…' : 'Reject lead'}
            </Button>
          </>
        }
      >
        <div className="stack-12">
          <StatusBadge status="Rejected" />
          <p className="text-sm muted">
            Rejection is a marketing outcome, not a pipeline stage. The lead leaves the active pipeline, keeps
            its notes, attribution and activity history, and never enters the sales workflow.
          </p>
          <Field label="Reason for rejection" htmlFor="lead-reject-reason" required error={rejectError}>
            <select
              id="lead-reject-reason"
              className="select"
              value={rejectReason}
              onChange={(event) => { setRejectReason(event.target.value); setRejectError('') }}
              aria-invalid={Boolean(rejectError)}
            >
              <option value="">Choose a reason…</option>
              {REJECTION_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </Field>
          <Field
            label="Additional notes"
            htmlFor="lead-reject-notes"
            hint={rejectReason === 'Other documented reason' ? 'Required when choosing “Other documented reason”.' : 'Optional context kept in the lead history.'}
          >
            <textarea
              id="lead-reject-notes"
              className="textarea"
              rows={3}
              value={rejectNotes}
              onChange={(event) => { setRejectNotes(event.target.value); setRejectError('') }}
              placeholder="e.g. Customer asked to revisit after the festive season"
            />
          </Field>
          <p className="text-xs muted">
            Recorded by {rejectLead ? 'the signed-in marketing employee' : 'you'} with today’s date. You can restore
            the lead from the Rejected outcome view if this was accidental.
          </p>
          {rejectLead?.nextFollowUp ? (
            <p className="text-xs muted">The scheduled follow-up on {formatDate(rejectLead.nextFollowUp)} will be paused and restored with the lead.</p>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
