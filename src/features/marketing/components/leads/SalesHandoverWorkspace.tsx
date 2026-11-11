import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Link2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Target,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'
import type {
  Campaign,
  Customer,
  CustomerCommunicationStatus,
  Lead,
  LeadFollowUp,
  LeadSalesAssignment,
  Opportunity,
  SalesHandoffStatus,
  SalesRepresentative,
} from '../../types/marketing'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Form'
import { Avatar } from '../ui/Avatar'
import { DetailRows } from '../marketing/ModuleKit'
import {
  SALES_HANDOFF_STATUSES,
  followUpTotals,
  leadFollowUpViews,
} from '../../utils/leads'
import {
  activeSalesEmployees,
  activeSalesManagers,
  businessEmail,
  businessPhone,
  communicationStatusForSalesStatus,
  firstContactOverdue,
  handoverAgeDays,
  handoverTimeline,
  isAwaitingFirstContact,
  isHandoverStalled,
  managerForSalesRep,
  nextFollowUpOverdue,
  reassignmentRequired,
  salesDesignation,
} from '../../utils/handover'
import { formatDate, formatDateTime, formatINR } from '../../utils/format'

export interface ContactAttemptValues {
  method: LeadFollowUp['method']
  outcome: string
  notes: string
  reachedCustomer: boolean
}

export interface ReassignmentValues {
  salesRepId: string
  salesManagerId: string
  reason: string
}

type WorkspaceView = 'overview' | 'employee' | 'manager'

const VIEW_OPTIONS: Array<{ id: WorkspaceView; label: string }> = [
  { id: 'overview', label: 'Handover overview' },
  { id: 'employee', label: 'Sales employee workspace' },
  { id: 'manager', label: 'Sales manager monitoring' },
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

const COMMUNICATION_TONE: Record<CustomerCommunicationStatus, 'neutral' | 'info' | 'warning' | 'accent' | 'success' | 'danger'> = {
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

interface SalesHandoverWorkspaceProps {
  lead: Lead
  assignment: LeadSalesAssignment
  salesReps: SalesRepresentative[]
  campaigns: Campaign[]
  customers: Customer[]
  opportunities: Opportunity[]
  currentUserName: string
  onSalesStatusChange: (lead: Lead, status: SalesHandoffStatus, note: string) => void
  onRecordContactAttempt: (lead: Lead, values: ContactAttemptValues) => void
  onScheduleFollowUp: (lead: Lead) => void
  onAddSupervisoryNote: (lead: Lead, note: string) => void
  onReassign: (lead: Lead, values: ReassignmentValues) => void
}

export function SalesHandoverWorkspace({
  lead,
  assignment,
  salesReps,
  campaigns,
  customers,
  opportunities,
  currentUserName,
  onSalesStatusChange,
  onRecordContactAttempt,
  onScheduleFollowUp,
  onAddSupervisoryNote,
  onReassign,
}: SalesHandoverWorkspaceProps) {
  const [view, setView] = useState<WorkspaceView>('overview')
  const [salesStatus, setSalesStatus] = useState<SalesHandoffStatus>(assignment.salesStatus)
  const [salesNote, setSalesNote] = useState('')
  const [salesError, setSalesError] = useState('')
  const [contactOpen, setContactOpen] = useState(false)
  const [contact, setContact] = useState<ContactAttemptValues>({ method: 'Call', outcome: '', notes: '', reachedCustomer: true })
  const [contactError, setContactError] = useState('')
  const [supervisorNote, setSupervisorNote] = useState('')
  const [supervisorError, setSupervisorError] = useState('')
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignRepId, setReassignRepId] = useState('')
  const [reassignManagerId, setReassignManagerId] = useState('')
  const [reassignReason, setReassignReason] = useState('')
  const [reassignError, setReassignError] = useState('')
  const [previewChannel, setPreviewChannel] = useState<'WhatsApp' | 'Email' | null>(null)

  useEffect(() => {
    setSalesStatus(assignment.salesStatus)
    setSalesNote('')
    setSalesError('')
    setContact({ method: 'Call', outcome: '', notes: '', reachedCustomer: true })
    setContactError('')
    setSupervisorNote('')
    setSupervisorError('')
    setReassignReason('')
    setReassignError('')
    setPreviewChannel(null)
  }, [lead.id, assignment.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const salesRep = salesReps.find((rep) => rep.id === assignment.salesRepId) ?? null
  const salesManager = salesReps.find((manager) => manager.id === assignment.salesManagerId) ?? null
  const campaign = campaigns.find((item) => item.id === lead.campaignId) ?? null
  const customer = customers.find((item) => item.id === lead.customerId) ?? null
  const opportunity = opportunities.find((item) => item.leadId === lead.id) ?? null
  const followUps = leadFollowUpViews(lead)
  const followUpSummary = followUpTotals(followUps)
  const timeline = useMemo(() => handoverTimeline(lead), [lead])
  const commStatus = assignment.communicationStatus ?? communicationStatusForSalesStatus(assignment.salesStatus)
  const customerNotifications = assignment.customerNotifications ?? []
  const notifications = assignment.notifications ?? []
  const contactAttempts = assignment.contactAttempts ?? []
  const reassignments = assignment.reassignments ?? []
  const supervisoryNotes = assignment.supervisoryNotes ?? []
  const employees = activeSalesEmployees(salesReps)
  const managers = activeSalesManagers(salesReps)
  const selectedReassignRep = employees.find((rep) => rep.id === reassignRepId) ?? null
  const selectedReassignManager = managers.find((manager) => manager.id === reassignManagerId) ?? null
  const firstContactLate = firstContactOverdue(assignment)
  const followUpLate = nextFollowUpOverdue(lead)
  const stalled = isHandoverStalled(lead)
  const needsReassignment = reassignmentRequired(lead)
  const waitingFirstContact = isAwaitingFirstContact(lead)
  const previewNotification = customerNotifications.find((item) => item.channel === previewChannel) ?? null
  const isClosed = lead.converted || lead.status === 'Lost' || assignment.salesStatus === 'Won' || assignment.salesStatus === 'Lost'

  const submitSalesStatus = () => {
    if (!assignment) return
    if ((salesStatus === 'Won' || salesStatus === 'Lost') && !salesNote.trim()) {
      setSalesError('Record a short outcome note before closing the handover.')
      return
    }
    onSalesStatusChange(lead, salesStatus, salesNote.trim())
    setSalesNote('')
    setSalesError('')
  }

  const submitContactAttempt = () => {
    if (!contact.outcome.trim()) {
      setContactError('Record the outcome of the contact attempt.')
      return
    }
    onRecordContactAttempt(lead, { ...contact, outcome: contact.outcome.trim(), notes: contact.notes.trim() })
    setContactOpen(false)
    setContact({ method: 'Call', outcome: '', notes: '', reachedCustomer: true })
    setContactError('')
  }

  const submitSupervisorNote = () => {
    if (!supervisorNote.trim()) {
      setSupervisorError('Add a supervisory note before saving.')
      return
    }
    onAddSupervisoryNote(lead, supervisorNote.trim())
    setSupervisorNote('')
    setSupervisorError('')
  }

  const openReassignment = () => {
    const defaultRep = employees.find((rep) => rep.id !== assignment.salesRepId) ?? employees[0] ?? null
    const defaultManager = managerForSalesRep(defaultRep ?? undefined, salesReps) ?? salesManager ?? managers[0] ?? null
    setReassignRepId(defaultRep?.id ?? '')
    setReassignManagerId(defaultManager?.id ?? '')
    setReassignReason('')
    setReassignError('')
    setReassignOpen(true)
  }

  const submitReassignment = () => {
    if (!selectedReassignRep || !selectedReassignManager) {
      setReassignError('Choose both the new Sales employee and supervising Sales Manager.')
      return
    }
    if (!reassignReason.trim()) {
      setReassignError('Record the reason for reassignment. The history is preserved.')
      return
    }
    onReassign(lead, {
      salesRepId: selectedReassignRep.id,
      salesManagerId: selectedReassignManager.id,
      reason: reassignReason.trim(),
    })
    setReassignOpen(false)
  }

  return (
    <div className="sales-handover stack-16">
      <div className="sales-handover__top">
        <div>
          <div className="row-8 wrap">
            <Badge tone="accent">{assignment.handoverId ?? 'Shared handover'}</Badge>
            <Badge tone={SALES_TONE[assignment.salesStatus]}>{assignment.salesStatus}</Badge>
            <Badge tone={COMMUNICATION_TONE[commStatus]}>{commStatus}</Badge>
            {firstContactLate ? <Badge tone="danger">First contact overdue</Badge> : null}
            {followUpLate ? <Badge tone="danger">Follow-up overdue</Badge> : null}
          </div>
          <h3>Marketing → Sales handover</h3>
          <p className="text-xs muted">
            Created {formatDateTime(assignment.assignedAt)} · Lead {lead.id} · Source {lead.source} · {campaign?.name ?? 'Unattributed'}
          </p>
        </div>
        <div className="sales-handover__top-actions">
          <Button variant="soft" size="sm" icon={<CalendarClock size={13} />} onClick={() => onScheduleFollowUp(lead)}>
            Schedule follow-up
          </Button>
          {!isClosed ? (
            <Button variant="primary" size="sm" icon={<Phone size={13} />} onClick={() => setContactOpen(true)}>
              Record contact
            </Button>
          ) : null}
        </div>
      </div>

      <div className="segmented sales-handover__views" role="tablist" aria-label="Sales handover workspace">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={view === option.id}
            className={view === option.id ? 'is-active' : ''}
            onClick={() => setView(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === 'overview' ? (
        <div className="stack-16">
          <div className="sales-handover__contacts">
            <SalesContactCard
              person={salesRep}
              roleLabel="Responsible Sales employee"
              responsibility="Owns day-to-day customer contact, requirements, follow-ups and opportunity progress."
              nextAction={assignment.nextAction || 'Contact the customer and confirm requirements.'}
              status={assignment.salesStatus}
              statusTone={SALES_TONE[assignment.salesStatus]}
            />
            <SalesContactCard
              person={salesManager}
              roleLabel="Supervising Sales Manager"
              responsibility="Monitors first contact, overdue follow-ups, stalled opportunities and authorized reassignment."
              nextAction={firstContactLate ? 'Intervene because first contact is overdue.' : 'Monitor the next follow-up and sales outcome.'}
              status={firstContactLate || stalled ? 'Intervention needed' : 'Monitoring'}
              statusTone={firstContactLate || stalled ? 'danger' : 'info'}
            />
          </div>

          <div className="lead-profile__grid">
            <div className="lead-profile__card">
              <h3><BadgeCheck size={14} /> Handover record</h3>
              <DetailRows items={[
                { label: 'Handover ID', value: assignment.handoverId ?? 'Legacy assignment' },
                { label: 'Original lead', value: `${lead.id} · ${lead.name}` },
                { label: 'Customer', value: `${lead.name}${lead.company ? ` · ${lead.company}` : ''}` },
                { label: 'Phone', value: lead.phone || 'Not recorded' },
                { label: 'Email', value: lead.email || 'Not recorded' },
                { label: 'Handover date', value: formatDateTime(assignment.assignedAt) },
                { label: 'Expected first contact', value: assignment.expectedFirstContact ? formatDateTime(assignment.expectedFirstContact) : 'Not set' },
                { label: 'Customer status', value: <Badge tone={COMMUNICATION_TONE[commStatus]}>{commStatus}</Badge> },
              ]} />
            </div>
            <div className="lead-profile__card">
              <h3><Target size={14} /> Sales progress</h3>
              <DetailRows items={[
                { label: 'Sales status', value: <Badge tone={SALES_TONE[assignment.salesStatus]}>{assignment.salesStatus}</Badge> },
                { label: 'Last contact', value: assignment.lastContact ? formatDateTime(assignment.lastContact) : 'No contact recorded' },
                { label: 'Next follow-up', value: lead.nextFollowUp ? formatDateTime(lead.nextFollowUp) : 'Not scheduled' },
                { label: 'First contact', value: assignment.firstContactAt ? formatDateTime(assignment.firstContactAt) : 'Awaiting first contact' },
                { label: 'Contact attempts', value: `${contactAttempts.length} recorded` },
                { label: 'Customer notification', value: customerNotifications.length ? 'Simulated (not delivered)' : 'Not prepared' },
                { label: 'Linked customer', value: customer ? `${customer.id} · ${customer.name}` : 'Not created' },
                { label: 'Opportunity', value: opportunity ? `${opportunity.id} · ${opportunity.stage} · ${formatINR(opportunity.value)}` : 'Not created' },
              ]} />
            </div>
          </div>

          <div className="lead-profile__card">
            <div className="between">
              <h3><Clock3 size={14} /> Handover timeline</h3>
              <Badge tone="neutral">Current stage highlighted</Badge>
            </div>
            <ol className="handover-timeline" aria-label="Lead to sales handover timeline">
              {timeline.map((item) => (
                <li key={item.stage} className={`${item.done ? 'is-done' : ''} ${item.current ? 'is-current' : ''}`.trim()}>
                  <span className="handover-timeline__marker">
                    {item.done && !item.current ? <CheckCircle2 size={12} /> : item.current ? <span /> : null}
                  </span>
                  <div>
                    <strong>{item.stage}</strong>
                    <small>{item.detail}</small>
                    {item.at ? <em>{formatDateTime(item.at)}</em> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lead-profile__grid">
            <div className="lead-profile__card">
              <h3><MessageSquare size={14} /> Customer notifications</h3>
              {customerNotifications.length ? (
                <div className="stack-10">
                  {customerNotifications.map((notification) => (
                    <div key={notification.id} className="customer-notification-row">
                      <span className={`customer-notification-row__icon customer-notification-row__icon--${notification.channel.toLowerCase()}`}>
                        {notification.channel === 'WhatsApp' ? <MessageSquare size={14} /> : <Mail size={14} />}
                      </span>
                      <div className="grow" style={{ minWidth: 0 }}>
                        <p className="text-sm font-semibold">{notification.channel}</p>
                        <p className="text-xs muted truncate">{notification.subject ?? notification.recipient}</p>
                        <p className="text-xs muted">Prepared {formatDateTime(notification.preparedAt)}</p>
                      </div>
                      <div className="stack-6" style={{ alignItems: 'flex-end' }}>
                        <Badge tone={notification.status === 'Simulated (not delivered)' ? 'warning' : 'info'}>{notification.status}</Badge>
                        <Button variant="ghost" size="xs" onClick={() => setPreviewChannel(notification.channel)}>Preview</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-inline">No customer message preview was stored for this handover.</p>
              )}
              <p className="text-xs muted mt-8"><CircleAlert size={12} /> No WhatsApp message or email is delivered by this demo.</p>
            </div>

            <div className="lead-profile__card">
              <h3><Send size={14} /> Simulated notifications</h3>
              {notifications.length ? (
                <div className="stack-10">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="handover-notification-row">
                      <span className={`handover-notification-row__dot handover-notification-row__dot--${notification.recipientRole === 'Sales Manager' ? 'manager' : 'employee'}`} />
                      <div style={{ minWidth: 0 }}>
                        <p className="text-sm font-semibold">{notification.title}</p>
                        <p className="text-xs muted">{notification.recipientName} · {notification.recipientRole} · {formatDateTime(notification.at)}</p>
                        <p className="text-xs muted">{notification.actionLabel}</p>
                      </div>
                      <Badge tone="info">{notification.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-inline">No handover notifications recorded.</p>
              )}
            </div>
          </div>

          <div className="callout callout--info">
            <ShieldCheck size={14} />
            <span>
              Marketing retains read-only visibility of the original lead and latest Sales outcome. Customer contact
              details are only shown to the assigned Sales team and authorized Marketing roles in this demo.
            </span>
          </div>
        </div>
      ) : null}

      {view === 'employee' ? (
        <div className="stack-16">
          <div className="sales-handover__workspace-head">
            <div>
              <h3><UserRound size={15} /> Sales employee workspace</h3>
              <p className="text-xs muted">Acting for {salesRep?.name ?? 'the assigned employee'}. Update only customer-facing Sales activity.</p>
            </div>
            <Badge tone="info">Sales employee preview</Badge>
          </div>

          <div className="sales-handover__actions">
            <Button variant="primary" icon={<Phone size={14} />} onClick={() => setContactOpen(true)} disabled={isClosed}>
              Record contact attempt
            </Button>
            <Button variant="soft" icon={<CalendarClock size={14} />} onClick={() => onScheduleFollowUp(lead)} disabled={isClosed}>
              Schedule next follow-up
            </Button>
            <Button variant="ghost" icon={<RefreshCw size={14} />} onClick={() => setView('manager')}>
              View manager monitoring
            </Button>
          </div>

          <div className="lead-profile__grid">
            <div className="lead-profile__card">
              <h3><CalendarClock size={14} /> Follow-up summary</h3>
              <div className="lead-profile__followup-summary">
                <div><strong>{followUpSummary.dueToday}</strong><span>Due today</span></div>
                <div><strong>{followUpSummary.upcoming}</strong><span>Upcoming</span></div>
                <div><strong className={followUpSummary.overdue ? 'danger-text' : ''}>{followUpSummary.overdue}</strong><span>Overdue</span></div>
                <div><strong>{followUpSummary.completed}</strong><span>Completed</span></div>
              </div>
              <DetailRows items={[
                { label: 'Expected first contact', value: assignment.expectedFirstContact ? formatDateTime(assignment.expectedFirstContact) : 'Not set' },
                { label: 'First contact recorded', value: assignment.firstContactAt ? formatDateTime(assignment.firstContactAt) : 'Not yet' },
                { label: 'Next follow-up', value: lead.nextFollowUp ? formatDateTime(lead.nextFollowUp) : 'Not scheduled' },
                { label: 'Customer communication', value: <Badge tone={COMMUNICATION_TONE[commStatus]}>{commStatus}</Badge> },
              ]} />
            </div>
            <div className="lead-profile__card">
              <h3><Target size={14} /> Update opportunity status</h3>
              <div className="form-grid">
                <Field label="Sales status" htmlFor="sales-workspace-status">
                  <select id="sales-workspace-status" className="select" value={salesStatus} onChange={(event) => { setSalesStatus(event.target.value as SalesHandoffStatus); setSalesError('') }}>
                    {SALES_HANDOFF_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </Field>
                <Field label="Outcome note" htmlFor="sales-workspace-note" error={salesError} className="full" hint={salesStatus === 'Won' || salesStatus === 'Lost' ? 'Required when closing the handover.' : 'Optional context for this update.'}>
                  <textarea
                    id="sales-workspace-note"
                    className="textarea"
                    rows={3}
                    value={salesNote}
                    onChange={(event) => { setSalesNote(event.target.value); setSalesError('') }}
                    placeholder="What changed, what did the customer say, and what is next?"
                    aria-invalid={Boolean(salesError)}
                  />
                </Field>
              </div>
              <div className="row-8 mt-8 wrap">
                <Button variant="primary" size="sm" onClick={submitSalesStatus} disabled={isClosed}>Save sales update</Button>
                {salesStatus === 'Won' ? <span className="text-xs muted">Won converts the lead and links the customer and opportunity.</span> : null}
                {salesStatus === 'Lost' ? <span className="text-xs muted">Lost closes the lead as a Sales outcome.</span> : null}
              </div>
            </div>
          </div>

          <div className="lead-profile__card">
            <div className="between">
              <h3><MessageSquare size={14} /> Contact attempt history</h3>
              <Badge tone="neutral">{contactAttempts.length} recorded</Badge>
            </div>
            {contactAttempts.length === 0 ? (
              <p className="empty-inline">No contact attempts recorded yet. Use “Record contact attempt” to log a call, message or meeting.</p>
            ) : (
              <div className="stack-8">
                {[...contactAttempts].reverse().map((attempt) => (
                  <div key={attempt.id} className="contact-attempt">
                    <span className={`contact-attempt__icon ${attempt.reachedCustomer ? 'is-reached' : ''}`.trim()}>
                      {attempt.method === 'Email' ? <Mail size={13} /> : attempt.method === 'WhatsApp' ? <MessageSquare size={13} /> : attempt.method === 'Meeting' ? <Users size={13} /> : <Phone size={13} />}
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row-8 wrap">
                        <strong>{attempt.method}</strong>
                        <Badge tone={attempt.reachedCustomer ? 'success' : 'warning'}>{attempt.reachedCustomer ? 'Customer reached' : 'No answer'}</Badge>
                        <span className="text-xs muted">{formatDateTime(attempt.at)} · {attempt.by}</span>
                      </div>
                      <p className="text-sm">{attempt.outcome}</p>
                      {attempt.notes ? <p className="text-xs muted">{attempt.notes}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lead-profile__card">
            <h3><CalendarClock size={14} /> Follow-up history</h3>
            {followUps.length === 0 ? (
              <p className="empty-inline">No follow-up has been scheduled for this lead yet.</p>
            ) : (
              <div className="lead-profile__followups">
                {followUps.slice(0, 6).map((followUp) => (
                  <div key={followUp.id} className="lead-profile__followup">
                    <div className="lead-profile__followup-head">
                      <div className="row-8 wrap">
                        <Badge tone={followUp.displayStatus === 'Overdue' ? 'danger' : followUp.displayStatus === 'Completed' ? 'success' : 'info'}>{followUp.displayStatus}</Badge>
                        <Badge tone="neutral">{followUp.method}</Badge>
                        <span className="text-xs muted">{formatDateTime(followUp.dueAt)}</span>
                      </div>
                    </div>
                    <p className="text-sm">{followUp.reason}</p>
                    {followUp.outcome ? <p className="text-xs muted">Outcome: {followUp.outcome}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {view === 'manager' ? (
        <div className="stack-16">
          <div className="sales-handover__workspace-head">
            <div>
              <h3><ShieldCheck size={15} /> Sales manager monitoring</h3>
              <p className="text-xs muted">Acting for {salesManager?.name ?? 'the supervising manager'}. Intervene when first contact or follow-up is late.</p>
            </div>
            <Badge tone={needsReassignment ? 'danger' : 'success'}>{needsReassignment ? 'Action required' : 'On track'}</Badge>
          </div>

          <div className="sales-handover__alerts">
            <ManagerSignal
              label="Awaiting first contact"
              active={waitingFirstContact}
              tone={firstContactLate ? 'danger' : 'warning'}
              detail={assignment.expectedFirstContact ? `Target ${formatDateTime(assignment.expectedFirstContact)}` : 'No target set'}
            />
            <ManagerSignal
              label="First contact overdue"
              active={firstContactLate}
              tone="danger"
              detail={firstContactLate ? `Handover age ${handoverAgeDays(assignment)} days` : 'Within the configured target'}
            />
            <ManagerSignal
              label="Overdue follow-up"
              active={followUpLate}
              tone="danger"
              detail={lead.nextFollowUp ? `Due ${formatDateTime(lead.nextFollowUp)}` : 'No follow-up scheduled'}
            />
            <ManagerSignal
              label="Stalled opportunity"
              active={stalled}
              tone="warning"
              detail={stalled ? `No recent contact for more than ${7} days` : 'Recent Sales activity recorded'}
            />
          </div>

          <div className="lead-profile__grid">
            <div className="lead-profile__card">
              <h3><Users size={14} /> Team assignment</h3>
              <DetailRows items={[
                { label: 'Sales employee', value: salesRep ? `${salesRep.name} · ${salesDesignation(salesRep)}` : 'Unavailable' },
                { label: 'Employee availability', value: salesRep?.availability ?? 'Available' },
                { label: 'Sales Manager', value: salesManager ? `${salesManager.name} · ${salesDesignation(salesManager)}` : 'Unavailable' },
                { label: 'Assignment date', value: formatDateTime(assignment.assignedAt) },
                { label: 'Expected first contact', value: assignment.expectedFirstContact ? formatDateTime(assignment.expectedFirstContact) : 'Not set' },
                { label: 'Contact attempts', value: `${contactAttempts.length}` },
                { label: 'Last contact', value: assignment.lastContact ? formatDateTime(assignment.lastContact) : 'None yet' },
                { label: 'Sales outcome', value: <Badge tone={SALES_TONE[assignment.salesStatus]}>{assignment.salesStatus}</Badge> },
              ]} />
              <div className="row-8 mt-12 wrap">
                <Button variant="soft" size="sm" icon={<RefreshCw size={13} />} onClick={openReassignment} disabled={lead.converted || lead.status === 'Lost'}>
                  Reassign handover
                </Button>
                <span className="text-xs muted">Authorized demo action. Previous assignment and customer history stay intact.</span>
              </div>
            </div>

            <div className="lead-profile__card">
              <h3><CircleAlert size={14} /> Supervisory notes</h3>
              <Field label="Add a manager note" htmlFor="supervisor-note" error={supervisorError}>
                <textarea
                  id="supervisor-note"
                  className="textarea"
                  rows={3}
                  value={supervisorNote}
                  onChange={(event) => { setSupervisorNote(event.target.value); setSupervisorError('') }}
                  placeholder="e.g. Employee unavailable. Reassign to the regional cover and preserve customer history."
                  aria-invalid={Boolean(supervisorError)}
                />
              </Field>
              <div className="row-8 mt-8 wrap">
                <Button variant="primary" size="sm" onClick={submitSupervisorNote}>Save supervisory note</Button>
                <span className="text-xs muted">Stored on the shared handover record.</span>
              </div>
              {supervisoryNotes.length ? (
                <div className="stack-8 mt-12">
                  {[...supervisoryNotes].reverse().map((note) => (
                    <div key={note.id} className="supervisor-note">
                      <p className="text-sm">{note.note}</p>
                      <p className="text-xs muted">{note.by} · {formatDateTime(note.at)}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="lead-profile__grid">
            <div className="lead-profile__card">
              <h3><BadgeCheck size={14} /> Notification delivery status</h3>
              <div className="stack-10">
                {notifications.map((notification) => (
                  <div key={notification.id} className="handover-notification-row">
                    <span className={`handover-notification-row__dot handover-notification-row__dot--${notification.recipientRole === 'Sales Manager' ? 'manager' : 'employee'}`} />
                    <div style={{ minWidth: 0 }}>
                      <p className="text-sm font-semibold">{notification.recipientName}</p>
                      <p className="text-xs muted">{notification.recipientRole} · {formatDateTime(notification.at)}</p>
                      <p className="text-xs muted">{notification.actionLabel}</p>
                    </div>
                    <Badge tone="info">{notification.status}</Badge>
                  </div>
                ))}
                {notifications.length === 0 ? <p className="empty-inline">No notifications recorded.</p> : null}
              </div>
              <p className="text-xs muted mt-8">Status is simulated only. No email, push or messaging provider is connected.</p>
            </div>

            <div className="lead-profile__card">
              <h3><RefreshCw size={14} /> Reassignment history</h3>
              {reassignments.length === 0 ? (
                <p className="empty-inline">No reassignment has been recorded for this handover.</p>
              ) : (
                <div className="stack-10">
                  {[...reassignments].reverse().map((record) => {
                    const from = salesReps.find((rep) => rep.id === record.fromSalesRepId)
                    const to = salesReps.find((rep) => rep.id === record.toSalesRepId)
                    return (
                      <div key={record.id} className="reassignment-record">
                        <div className="row-8 wrap">
                          <Badge tone="warning">Reassigned</Badge>
                          <span className="text-xs muted">{formatDateTime(record.at)} · {record.authorizedBy}</span>
                        </div>
                        <p className="text-sm">{from?.name ?? record.fromSalesRepId} → {to?.name ?? record.toSalesRepId}</p>
                        <p className="text-xs muted">{record.reason}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="callout callout--info">
            <CircleAlert size={14} />
            <span>
              First-contact and follow-up thresholds are recorded on the handover, not hard-coded company-wide.
              Reassignment keeps the original handover, communications, notifications and manager notes in history.
            </span>
          </div>
        </div>
      ) : null}

      <Modal
        open={contactOpen}
        onClose={() => { setContactOpen(false); setContactError('') }}
        title="Record contact attempt"
        description={`${lead.name} · ${lead.id} · ${salesRep?.name ?? 'Sales employee'}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setContactOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={<Phone size={14} />} onClick={submitContactAttempt}>Save contact attempt</Button>
          </>
        }
      >
        <div className="stack-16">
          <div className="segmented" role="group" aria-label="Contact outcome">
            <button type="button" className={contact.reachedCustomer ? 'is-active' : ''} onClick={() => setContact({ ...contact, reachedCustomer: true })}>Customer reached</button>
            <button type="button" className={!contact.reachedCustomer ? 'is-active' : ''} onClick={() => setContact({ ...contact, reachedCustomer: false })}>No answer</button>
          </div>
          <div className="form-grid">
            <Field label="Contact method" htmlFor="contact-method">
              <select id="contact-method" className="select" value={contact.method} onChange={(event) => setContact({ ...contact, method: event.target.value as LeadFollowUp['method'] })}>
                {(['Call', 'WhatsApp', 'Email', 'Meeting', 'Visit', 'Other'] as LeadFollowUp['method'][]).map((method) => <option key={method}>{method}</option>)}
              </select>
            </Field>
            <Field label="Outcome" htmlFor="contact-outcome" required error={contactError} className="full">
              <textarea
                id="contact-outcome"
                className="textarea"
                rows={3}
                value={contact.outcome}
                onChange={(event) => { setContact({ ...contact, outcome: event.target.value }); setContactError('') }}
                placeholder={contact.reachedCustomer ? 'What did the customer say and what is the next step?' : 'What happened and when will you try again?'}
                aria-invalid={Boolean(contactError)}
              />
            </Field>
            <Field label="Internal note" htmlFor="contact-notes" className="full">
              <textarea id="contact-notes" className="textarea" rows={2} value={contact.notes} onChange={(event) => setContact({ ...contact, notes: event.target.value })} />
            </Field>
          </div>
          <div className="callout callout--info">
            <CircleAlert size={14} />
            <span>Recording a contact attempt does not send a call, WhatsApp message or email. It updates demo state only.</span>
          </div>
        </div>
      </Modal>

      <Modal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        title="Authorized handover reassignment"
        description={`${lead.name} · ${assignment.handoverId ?? lead.id}`}
        size="wide"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReassignOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={<RefreshCw size={14} />} onClick={submitReassignment}>Reassign handover</Button>
          </>
        }
      >
        <div className="stack-16">
          <div className="callout callout--warning">
            <CircleAlert size={14} />
            <span>
              Reassignment changes the responsible employee and manager but keeps the original handover, contacts,
              customer notifications, follow-ups and manager notes in history.
            </span>
          </div>
          <div className="lead-send__reps" role="radiogroup" aria-label="New Sales employee">
            {employees.map((rep) => {
              const selected = rep.id === reassignRepId
              return (
                <button
                  key={rep.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`lead-send__rep ${selected ? 'is-selected' : ''}`.trim()}
                  onClick={() => {
                    setReassignRepId(rep.id)
                    const manager = managerForSalesRep(rep, salesReps)
                    if (manager) setReassignManagerId(manager.id)
                    setReassignError('')
                  }}
                >
                  <Avatar name={rep.name} size="md" />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="lead-send__rep-name">{rep.name}</span>
                    <span className="lead-send__rep-meta truncate">{salesDesignation(rep)} · {rep.region} · {rep.availability}</span>
                    <span className="lead-send__rep-contact truncate">{businessEmail(rep)} · {businessPhone(rep)}</span>
                  </span>
                  {selected ? <BadgeCheck size={17} className="success-text" /> : null}
                </button>
              )
            })}
          </div>
          <Field label="Supervising Sales Manager" htmlFor="reassign-manager" required>
            <select id="reassign-manager" className="select" value={reassignManagerId} onChange={(event) => { setReassignManagerId(event.target.value); setReassignError('') }}>
              <option value="">Choose a manager</option>
              {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} · {salesDesignation(manager)}</option>)}
            </select>
          </Field>
          <Field label="Reason for reassignment" htmlFor="reassign-reason" required error={reassignError}>
            <textarea
              id="reassign-reason"
              className="textarea"
              rows={3}
              value={reassignReason}
              onChange={(event) => { setReassignReason(event.target.value); setReassignError('') }}
              placeholder="e.g. Employee is on leave and the customer has not been contacted."
              aria-invalid={Boolean(reassignError)}
            />
          </Field>
          <p className="text-xs muted">Authorized by: {salesManager?.name ?? currentUserName} · Sales Manager (demo)</p>
        </div>
      </Modal>

      <Modal
        open={Boolean(previewChannel && previewNotification)}
        onClose={() => setPreviewChannel(null)}
        title={`${previewChannel ?? ''} preview`}
        description={previewNotification ? `${previewNotification.recipient} · Simulated, not delivered` : ''}
        size="md"
        footer={<Button variant="primary" onClick={() => setPreviewChannel(null)}>Close preview</Button>}
      >
        {previewNotification ? (
          <div className="stack-14">
            <div className="callout callout--warning">
              <CircleAlert size={14} />
              <span>This is a saved customer message preview. No {previewNotification.channel.toLowerCase()} message has been sent or delivered.</span>
            </div>
            {previewNotification.subject ? <p className="customer-message__subject">{previewNotification.subject}</p> : null}
            <div className="customer-message__preview">
              <p style={{ whiteSpace: 'pre-wrap' }}>{previewNotification.body}</p>
            </div>
            <div className="row-8 wrap">
              <Badge tone="warning">{previewNotification.status}</Badge>
              <span className="text-xs muted">Prepared {formatDateTime(previewNotification.preparedAt)}</span>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function SalesContactCard({
  person,
  roleLabel,
  responsibility,
  nextAction,
  status,
  statusTone,
}: {
  person: SalesRepresentative | null
  roleLabel: string
  responsibility: string
  nextAction: string
  status: string
  statusTone: 'neutral' | 'info' | 'warning' | 'accent' | 'success' | 'danger'
}) {
  return (
    <div className="sales-contact-card">
      <div className="sales-contact-card__head">
        <Avatar name={person?.name ?? 'Sales team'} size="md" />
        <div className="grow" style={{ minWidth: 0 }}>
          <p className="sales-contact-card__role">{roleLabel}</p>
          <h4>{person?.name ?? 'Employee unavailable'}</h4>
          <p className="text-xs muted">{salesDesignation(person)} · {person?.region ?? 'Region not recorded'}</p>
        </div>
        <Badge tone={statusTone}>{status}</Badge>
      </div>
      <div className="sales-contact-card__contacts">
        <span><Phone size={12} /> {businessPhone(person)}</span>
        <span><Mail size={12} /> {businessEmail(person)}</span>
      </div>
      <p className="sales-contact-card__responsibility">{responsibility}</p>
      <div className="sales-contact-card__next">
        <span>Next responsibility</span>
        <strong>{nextAction}</strong>
      </div>
    </div>
  )
}

function ManagerSignal({
  label,
  active,
  tone,
  detail,
}: {
  label: string
  active: boolean
  tone: 'warning' | 'danger'
  detail: string
}) {
  return (
    <div className={`manager-signal ${active ? 'is-active' : ''} ${active ? `manager-signal--${tone}` : ''}`.trim()}>
      <span className="manager-signal__icon">
        {active ? <CircleAlert size={14} /> : <CheckCircle2 size={14} />}
      </span>
      <div>
        <strong>{label}</strong>
        <small>{active ? detail : 'No exception'}</small>
      </div>
    </div>
  )
}
