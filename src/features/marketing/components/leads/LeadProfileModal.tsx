import { useEffect, useMemo, useState } from 'react'
import {
  ArchiveRestore,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Send,
  Sparkles,
  Target,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'
import type {
  Campaign,
  Customer,
  Lead,
  LeadActivity,
  LeadFollowUp,
  Opportunity,
  SalesHandoffStatus,
  SalesRepresentative,
} from '../../types/marketing'
import { Button } from '../ui/Button'
import { Badge, PriorityBadge, StatusBadge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Form'
import { Avatar } from '../ui/Avatar'
import { ProgressBar } from '../ui/ProgressBar'
import { DetailRows } from '../marketing/ModuleKit'
import { ActivityTypeIcon } from './LeadsDashboard'
import { SalesHandoverWorkspace, type ContactAttemptValues, type ReassignmentValues } from './SalesHandoverWorkspace'
import {
  SALES_HANDOFF_STATUSES,
  followUpTotals,
  leadConversionDate,
  leadFollowUpViews,
  leadLocation,
  leadLostDate,
  leadNameList,
  leadRejectionDate,
  primaryRequirement,
  qualificationReadiness,
  type FollowUpView,
} from '../../utils/leads'
import { followUpLabel, isOverdue } from '../../utils/dates'
import { formatDate, formatDateTime, formatINR } from '../../utils/format'

type ProfileTab = 'overview' | 'interests' | 'requirements' | 'follow-ups' | 'attribution' | 'activity' | 'sales'

const PROFILE_TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'interests', label: 'Interests' },
  { id: 'requirements', label: 'Requirements & notes' },
  { id: 'follow-ups', label: 'Follow-ups' },
  { id: 'attribution', label: 'Attribution' },
  { id: 'activity', label: 'Activity' },
  { id: 'sales', label: 'Sales handoff' },
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

interface LeadProfileModalProps {
  open: boolean
  lead: Lead | null
  initialTab?: 'overview' | 'sales'
  campaigns: Campaign[]
  salesReps: SalesRepresentative[]
  customers: Customer[]
  opportunities: Opportunity[]
  onClose: () => void
  onEdit: (lead: Lead) => void
  onUpdate: (leadId: string, patch: Partial<Lead>, activity?: Omit<LeadActivity, 'id'>) => void
  onScheduleFollowUp: (lead: Lead) => void
  onCompleteFollowUp: (followUp: FollowUpView) => void
  onSendToSales: (lead: Lead) => void
  onConvert: (lead: Lead) => void
  onSalesStatusChange: (lead: Lead, status: SalesHandoffStatus, note: string) => void
  onRecordContactAttempt: (lead: Lead, values: ContactAttemptValues) => void
  onAddSupervisoryNote: (lead: Lead, note: string) => void
  onReassignHandover: (lead: Lead, values: ReassignmentValues) => void
  currentUserName: string
  onRestore?: (lead: Lead) => void
}

export function LeadProfileModal({
  open,
  lead,
  initialTab = 'overview',
  campaigns,
  salesReps,
  customers,
  opportunities,
  onClose,
  onEdit,
  onUpdate,
  onScheduleFollowUp,
  onCompleteFollowUp,
  onSendToSales,
  onConvert,
  onSalesStatusChange,
  onRecordContactAttempt,
  onAddSupervisoryNote,
  onReassignHandover,
  currentUserName,
  onRestore,
}: LeadProfileModalProps) {
  const [tab, setTab] = useState<ProfileTab>('overview')
  const [activityType, setActivityType] = useState<LeadActivity['type']>('Call')
  const [activitySummary, setActivitySummary] = useState('')
  const [activityError, setActivityError] = useState('')
  const [salesStatus, setSalesStatus] = useState<SalesHandoffStatus>('Assigned')
  const [salesNote, setSalesNote] = useState('')
  const [salesError, setSalesError] = useState('')

  useEffect(() => {
    if (!open) return
    setTab(initialTab)
    setActivityType('Call')
    setActivitySummary('')
    setActivityError('')
    setSalesStatus(lead?.salesAssignment?.salesStatus ?? 'Assigned')
    setSalesNote('')
    setSalesError('')
  }, [open, lead?.id, lead?.salesAssignment?.salesStatus, initialTab])

  const readiness = useMemo(() => (lead ? qualificationReadiness(lead) : null), [lead])
  const followUps = useMemo(() => (lead ? leadFollowUpViews(lead) : []), [lead])
  const followUpSummary = followUpTotals(followUps)

  if (!lead) return null

  const campaign = campaigns.find((item) => item.id === lead.campaignId) ?? null
  const customer = customers.find((item) => item.id === lead.customerId) ?? null
  const opportunity = opportunities.find((item) => item.leadId === lead.id) ?? null
  const assignment = lead.salesAssignment
  const salesRep = assignment ? salesReps.find((rep) => rep.id === assignment.salesRepId) ?? null : null
  const salesManager = assignment ? salesReps.find((manager) => manager.id === assignment.salesManagerId) ?? null : null
  const activities = [...(lead.activities ?? [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const products = lead.interests?.products?.length ? lead.interests.products : lead.product ? [lead.product] : []
  const canSendToSales = lead.status === 'Qualified' && !assignment && !lead.converted
  const canConvert = lead.status === 'Qualified' && !assignment && !lead.converted
  const isClosed = lead.converted || ['Rejected', 'Not Interested', 'Lost'].includes(lead.status)

  const saveActivity = () => {
    if (!activitySummary.trim()) {
      setActivityError('Add a short summary before saving the activity.')
      return
    }
    onUpdate(lead.id, {}, {
      type: activityType,
      at: new Date().toISOString(),
      by: 'Ananya Rao',
      summary: activitySummary.trim(),
    })
    setActivitySummary('')
    setActivityError('')
  }

  const saveSalesStatus = () => {
    if (!assignment) return
    if ((salesStatus === 'Won' || salesStatus === 'Lost') && !salesNote.trim()) {
      setSalesError('Record a short outcome note before closing the sales handoff.')
      return
    }
    onSalesStatusChange(lead, salesStatus, salesNote.trim())
    setSalesNote('')
    setSalesError('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="lead-profile__title">
          {lead.photoUrl ? <img src={lead.photoUrl} alt="" className="lead-profile__title-photo" /> : <Avatar name={lead.name} size="sm" />}
          <span className="truncate">{lead.name}</span>
        </span>
      }
      description={`${lead.company || 'No company'} · ${leadLocation(lead) || 'Location not recorded'} · ${lead.id}`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {['Rejected', 'Not Interested'].includes(lead.status) && onRestore ? (
            <Button variant="soft" icon={<ArchiveRestore size={14} />} onClick={() => onRestore(lead)}>
              Restore lead
            </Button>
          ) : null}
          <Button variant="soft" icon={<Pencil size={14} />} onClick={() => onEdit(lead)}>Edit profile</Button>
          {!isClosed ? (
            <Button variant="soft" icon={<CalendarClock size={14} />} onClick={() => onScheduleFollowUp(lead)}>
              Schedule follow-up
            </Button>
          ) : null}
          {canSendToSales ? (
            <Button variant="primary" icon={<Send size={14} />} onClick={() => onSendToSales(lead)}>Qualify & transfer</Button>
          ) : null}
          {canConvert ? (
            <Button variant="primary" icon={<BadgeCheck size={14} />} onClick={() => onConvert(lead)}>Convert to customer</Button>
          ) : null}
        </>
      }
    >
      <div className="lead-profile stack-16">
        <div className="lead-profile__hero">
          <div className="lead-profile__identity">
            {lead.photoUrl ? (
              <img src={lead.photoUrl} alt="" className="lead-profile__photo" />
            ) : (
              <Avatar name={lead.name} size="lg" />
            )}
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row-8 wrap">
                <StatusBadge status={lead.status} />
                <PriorityBadge priority={lead.priority} />
                <Badge tone="neutral">{lead.source}</Badge>
                {lead.converted ? <Badge tone="success">Converted · {lead.customerId}</Badge> : null}
                {lead.nextFollowUp && isOverdue(lead.nextFollowUp) && !isClosed ? <Badge tone="danger">Follow-up overdue</Badge> : null}
              </div>
              <p className="lead-profile__sub">
                {lead.jobTitle ? `${lead.jobTitle} · ` : ''}{lead.industry || 'Industry not recorded'} · Owned by {lead.assignedTo}
              </p>
              <div className="lead-profile__chips">
                {products.slice(0, 4).map((product) => <Badge key={product} tone="neutral">{product}</Badge>)}
                {lead.customerType ? <Badge tone="info">{lead.customerType}</Badge> : null}
                {lead.qualification?.intent && lead.qualification.intent !== 'Unknown' ? <Badge tone="accent">{lead.qualification.intent} intent</Badge> : null}
              </div>
            </div>
          </div>
          <div className="lead-profile__score">
            <div className="between">
              <span className="text-xs muted">Qualification</span>
              <strong>{readiness?.score ?? 0}%</strong>
            </div>
            <ProgressBar value={readiness?.score ?? 0} size="sm" tone={(readiness?.score ?? 0) >= 70 ? 'success' : (readiness?.score ?? 0) >= 40 ? 'warning' : 'brand'} />
            <p className="text-xs muted">{readiness?.available}/{readiness?.total} signals recorded</p>
            <div className="lead-profile__next">
              <CalendarClock size={12} />
              {lead.nextFollowUp ? followUpLabel(lead.nextFollowUp) : 'No next follow-up'}
            </div>
          </div>
        </div>

        {lead.status === 'Rejected' || lead.status === 'Not Interested' ? (
          <section className="lead-profile__outcome lead-profile__outcome--rejected" aria-label="Rejected lead details">
            <div className="lead-profile__outcome-head">
              <span className="lead-profile__outcome-icon"><XCircle size={16} /></span>
              <div className="grow">
                <h3>Rejected lead</h3>
                <p>This lead is outside the active pipeline. Rejection is a marketing outcome, not a sales stage.</p>
              </div>
              {onRestore ? (
                <Button variant="soft" size="sm" icon={<ArchiveRestore size={13} />} onClick={() => onRestore(lead)}>
                  Restore
                </Button>
              ) : null}
            </div>
            <div className="lead-profile__outcome-grid">
              <div><span>Reason</span><strong>{lead.rejection?.reason ?? lead.lostReason ?? (lead.status === 'Not Interested' ? 'Marked Not Interested — no reason recorded for this legacy lead' : 'Not recorded')}</strong></div>
              <div><span>Recorded</span><strong>{leadRejectionDate(lead) ? formatDateTime(leadRejectionDate(lead) as string) : 'Not recorded'}</strong></div>
              <div><span>Employee</span><strong>{lead.rejection?.rejectedBy ?? 'Not recorded'}</strong></div>
              {lead.rejection?.notes ? (
                <div className="lead-profile__outcome-note"><span>Notes</span><strong>{lead.rejection.notes}</strong></div>
              ) : null}
            </div>
          </section>
        ) : null}

        {lead.status === 'Lost' ? (
          <section className="lead-profile__outcome lead-profile__outcome--lost" aria-label="Lost sales outcome details">
            <div className="lead-profile__outcome-head">
              <span className="lead-profile__outcome-icon"><XCircle size={16} /></span>
              <div className="grow">
                <h3>Lost by sales</h3>
                <p>A qualified customer whose sales deal closed without a purchase. This is not a marketing rejection.</p>
              </div>
            </div>
            <div className="lead-profile__outcome-grid">
              <div><span>Loss reason</span><strong>{lead.lostReason || 'Not recorded'}</strong></div>
              <div><span>Closed</span><strong>{leadLostDate(lead) ? formatDateTime(leadLostDate(lead) as string) : 'Not recorded'}</strong></div>
              <div><span>Sales owner</span><strong>{salesRep?.name ?? 'Not recorded'}</strong></div>
            </div>
          </section>
        ) : null}

        {lead.converted ? (
          <section className="lead-profile__outcome lead-profile__outcome--converted" aria-label="Conversion details">
            <div className="lead-profile__outcome-head">
              <span className="lead-profile__outcome-icon"><BadgeCheck size={16} /></span>
              <div className="grow">
                <h3>Converted customer</h3>
                <p>The conversion workflow completed and the lead is linked to the Customers records below.</p>
              </div>
            </div>
            <div className="lead-profile__outcome-grid">
              <div><span>Customer</span><strong>{customer ? `${customer.id} · ${customer.name}` : lead.customerId ?? 'Not linked'}</strong></div>
              <div><span>Converted</span><strong>{leadConversionDate(lead) ? formatDateTime(leadConversionDate(lead) as string) : 'Not recorded'}</strong></div>
              <div><span>Opportunity</span><strong>{opportunity ? `${opportunity.id} · ${opportunity.stage}` : lead.conversion?.opportunityId ?? 'Not created'}</strong></div>
              {lead.conversion?.outcome ? (
                <div className="lead-profile__outcome-note"><span>Outcome</span><strong>{lead.conversion.outcome}</strong></div>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="lead-profile__tabs" role="tablist" aria-label="Lead profile sections">
          {PROFILE_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`lead-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`lead-panel-${item.id}`}
              className={tab === item.id ? 'is-active' : ''}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {item.id === 'follow-ups' && followUps.length ? <span className="lead-profile__tab-count">{followUps.length}</span> : null}
              {item.id === 'activity' && activities.length ? <span className="lead-profile__tab-count">{activities.length}</span> : null}
              {item.id === 'sales' && assignment ? <span className="lead-profile__tab-dot" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>

        <div
          className="lead-profile__panel"
          role="tabpanel"
          id={`lead-panel-${tab}`}
          aria-labelledby={`lead-tab-${tab}`}
          tabIndex={0}
        >
          {tab === 'overview' ? (
            <div className="stack-16">
              <div className="lead-profile__grid">
                <div className="lead-profile__card">
                  <h3><UserRound size={14} /> Contact details</h3>
                  <DetailRows items={[
                    { label: 'Phone', value: <span className="row-6"><Phone size={12} />{lead.phone || 'Not recorded'}</span> },
                    { label: 'WhatsApp', value: <span className="row-6"><MessageSquare size={12} />{lead.whatsapp || 'Not recorded'}</span> },
                    { label: 'Email', value: <span className="row-6"><Mail size={12} />{lead.email || 'Not recorded'}</span> },
                    { label: 'Location', value: <span className="row-6"><MapPin size={12} />{leadLocation(lead) || 'Not recorded'}</span> },
                    { label: 'Address', value: lead.address || 'Not recorded' },
                    { label: 'Company', value: <span className="row-6"><Building2 size={12} />{lead.company || 'Not recorded'}</span> },
                    { label: 'Job title', value: lead.jobTitle || 'Not recorded' },
                    { label: 'Customer type', value: lead.customerType || 'Not recorded' },
                    { label: 'Industry', value: lead.industry || 'Not recorded' },
                    { label: 'Created', value: formatDate(lead.createdAt) },
                    { label: 'Last contact', value: formatDateTime(lead.lastContact) },
                  ]} />
                </div>
                <div className="lead-profile__card">
                  <h3><Sparkles size={14} /> What the customer needs</h3>
                  <p className="lead-profile__summary">
                    {primaryRequirement(lead)}
                  </p>
                  <div className="lead-profile__facts">
                    <div><span>Budget</span><strong>{lead.interests?.budget ? formatINR(lead.interests.budget) : lead.qualification?.budgetRange || lead.interests?.priceRange || 'Not recorded'}</strong></div>
                    <div><span>Timeline</span><strong>{lead.qualification?.purchaseTimeline || lead.interests?.expectedPurchaseDate || 'Not recorded'}</strong></div>
                    <div><span>Preferred channel</span><strong>{lead.interests?.preferredChannel || 'Not recorded'}</strong></div>
                    <div><span>Decision authority</span><strong>{lead.qualification?.decisionAuthority || 'Unknown'}</strong></div>
                  </div>
                  <p className="form-section-title" style={{ marginTop: 14 }}>Next action</p>
                  <p className="text-sm">{lead.nextAction || 'No next action recorded.'}</p>
                  {lead.solutionsDiscussed ? (
                    <>
                      <p className="form-section-title" style={{ marginTop: 12 }}>Solutions discussed</p>
                      <p className="text-sm">{lead.solutionsDiscussed}</p>
                    </>
                  ) : null}
                  {lead.informationShared ? (
                    <>
                      <p className="form-section-title" style={{ marginTop: 12 }}>Information shared</p>
                      <p className="text-sm">{lead.informationShared}</p>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="lead-profile__grid lead-profile__grid--three">
                <div className="lead-profile__card">
                  <h3><Target size={14} /> Qualification signals</h3>
                  <div className="lead-profile__signals">
                    {readiness?.signals.map((signal) => (
                      <div key={signal.label} className={`lead-profile__signal ${signal.present ? 'is-present' : ''}`.trim()}>
                        {signal.present ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />}
                        <span>{signal.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lead-profile__card">
                  <h3><Link2 size={14} /> Linked records</h3>
                  <DetailRows items={[
                    { label: 'Customer', value: customer ? `${customer.id} · ${customer.name}` : lead.converted ? `${lead.customerId ?? 'Linked'} · record unavailable` : 'Not converted' },
                    { label: 'Opportunity', value: opportunity ? `${opportunity.id} · ${opportunity.stage}` : 'Not created' },
                    { label: 'Campaign', value: campaign?.name ?? 'Unattributed' },
                    { label: 'Attribution', value: lead.attribution?.adSource || lead.source },
                  ]} />
                </div>
                <div className="lead-profile__card">
                  <h3><Send size={14} /> Sales handoff</h3>
                  {assignment ? (
                    <div className="stack-10">
                      <div className="row-8">
                        <Avatar name={salesRep?.name ?? 'Sales'} size="sm" />
                        <div style={{ minWidth: 0 }}>
                          <p className="text-sm font-semibold">{salesRep?.name ?? 'Sales employee unavailable'}</p>
                          <p className="text-xs muted">{salesRep?.role} · {salesRep?.region}</p>
                        </div>
                      </div>
                      <div className="row-8">
                        <Avatar name={salesManager?.name ?? 'Manager'} size="sm" />
                        <div style={{ minWidth: 0 }}>
                          <p className="text-sm font-semibold">{salesManager?.name ?? 'Sales Manager not recorded'}</p>
                          <p className="text-xs muted">Supervising {salesManager?.role ?? 'Sales Manager'}</p>
                        </div>
                      </div>
                      <div className="row-8 wrap">
                        <Badge tone={SALES_TONE[assignment.salesStatus]}>{assignment.salesStatus}</Badge>
                        {assignment.communicationStatus ? <Badge tone="info">{assignment.communicationStatus}</Badge> : null}
                        {assignment.notifications?.length ? <Badge tone="neutral">Notifications simulated</Badge> : null}
                      </div>
                      <p className="text-xs muted">Assigned {formatDateTime(assignment.assignedAt)}</p>
                      <p className="text-sm">{assignment.handoffNote}</p>
                      <Button variant="ghost" size="xs" onClick={() => setTab('sales')}>Open sales handover</Button>
                    </div>
                  ) : (
                    <div className="stack-10">
                      <p className="text-sm muted">This lead has not been sent to the sales team yet.</p>
                      {canSendToSales ? (
                        <Button variant="soft" size="sm" icon={<Send size={13} />} onClick={() => onSendToSales(lead)}>Send to sales</Button>
                      ) : (
                        <p className="text-xs muted">Only Qualified leads can be handed off.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="lead-profile__card">
                <div className="between">
                  <h3><CalendarClock size={14} /> Recent activity</h3>
                  <Button variant="ghost" size="xs" onClick={() => setTab('activity')}>View all</Button>
                </div>
                {activities.length === 0 ? (
                  <p className="empty-inline">No activity has been recorded yet.</p>
                ) : (
                  <div className="lead-profile__timeline">
                    {activities.slice(0, 4).map((activity) => (
                      <div key={activity.id} className="lead-profile__timeline-item">
                        <span className="lead-profile__timeline-icon"><ActivityTypeIcon type={activity.type} /></span>
                        <div>
                          <p className="text-sm"><strong>{activity.type}</strong> · {activity.summary}</p>
                          <p className="text-xs muted">{formatDateTime(activity.at)} · {activity.by}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {tab === 'interests' ? (
            <div className="stack-16">
              <div className="lead-profile__tag-groups">
                <TagGroup title="Product interests" values={products} tone="accent" empty="No product interest recorded." />
                <TagGroup title="Requirements" values={lead.interests?.requirements ?? []} empty="No requirement tags recorded." />
                <TagGroup title="Features required" values={lead.interests?.features ?? []} empty="No specific features recorded." />
                <TagGroup title="Likes" values={lead.interests?.likes ?? []} tone="success" empty="Nothing recorded yet." />
                <TagGroup title="Dislikes" values={lead.interests?.dislikes ?? []} tone="danger" empty="Nothing recorded yet." />
                <TagGroup title="Questions asked" values={lead.interests?.questions ?? []} empty="No questions recorded." />
                <TagGroup title="Problems to solve" values={lead.interests?.problems ?? []} empty="No problems recorded." />
              </div>
              <div className="lead-profile__grid">
                <div className="lead-profile__card">
                  <h3><Sparkles size={14} /> Preferences</h3>
                  <DetailRows items={[
                    { label: 'Category', value: lead.interests?.category || 'Not recorded' },
                    { label: 'Preferred brand', value: lead.interests?.preferredBrand || 'Not recorded' },
                    { label: 'Price range', value: lead.interests?.priceRange || 'Not recorded' },
                    { label: 'Budget', value: lead.interests?.budget ? formatINR(lead.interests.budget) : 'Not recorded' },
                    { label: 'Preferred channel', value: lead.interests?.preferredChannel || 'Not recorded' },
                    { label: 'Preferred contact time', value: lead.interests?.preferredContactTime || 'Not recorded' },
                    { label: 'Preferred language', value: lead.interests?.preferredLanguage || 'Not recorded' },
                    { label: 'Purchase purpose', value: lead.interests?.purchasePurpose || 'Not recorded' },
                    { label: 'Expected purchase', value: lead.interests?.expectedPurchaseDate ? formatDate(lead.interests.expectedPurchaseDate) : 'Not recorded' },
                  ]} />
                </div>
                <div className="lead-profile__card">
                  <h3><MessageSquare size={14} /> Customer context</h3>
                  <p className="lead-profile__summary">
                    {lead.interests?.summary || 'No plain-language customer summary has been recorded yet.'}
                  </p>
                  <p className="form-section-title" style={{ marginTop: 14 }}>Special requirements</p>
                  <p className="text-sm">{lead.interests?.specialRequirements || 'None recorded.'}</p>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'requirements' ? (
            <div className="stack-16">
              <div className="lead-profile__grid">
                <div className="lead-profile__card">
                  <h3><Target size={14} /> Requirement and qualification</h3>
                  <p className="form-section-title">Main requirement</p>
                  <p className="text-sm">{lead.qualification?.mainRequirement || lead.notes || 'Not recorded.'}</p>
                  <p className="form-section-title" style={{ marginTop: 12 }}>Reason for interest</p>
                  <p className="text-sm">{lead.qualification?.reasonForInterest || 'Not recorded.'}</p>
                  <p className="form-section-title" style={{ marginTop: 12 }}>Qualification notes</p>
                  <p className="text-sm">{lead.qualification?.notes || 'Not recorded.'}</p>
                  {lead.qualification?.reasonForRejection ? (
                    <>
                      <p className="form-section-title" style={{ marginTop: 12 }}>Reason for rejection</p>
                      <p className="text-sm danger-text">{lead.qualification.reasonForRejection}</p>
                    </>
                  ) : null}
                </div>
                <div className="lead-profile__card">
                  <h3><CreditCard size={14} /> Commercial context</h3>
                  <DetailRows items={[
                    { label: 'Purchase intent', value: lead.qualification?.intent || 'Unknown' },
                    { label: 'Decision authority', value: lead.qualification?.decisionAuthority || 'Unknown' },
                    { label: 'Estimated value', value: lead.qualification?.estimatedValue ? formatINR(lead.qualification.estimatedValue) : 'Not recorded' },
                    { label: 'Budget range', value: lead.qualification?.budgetRange || 'Not recorded' },
                    { label: 'Purchase timeline', value: lead.qualification?.purchaseTimeline || 'Not recorded' },
                    { label: 'Expected purchase date', value: lead.interests?.expectedPurchaseDate ? formatDate(lead.interests.expectedPurchaseDate) : 'Not recorded' },
                  ]} />
                </div>
              </div>
              <div className="lead-profile__grid">
                <div className="lead-profile__card">
                  <h3><MessageSquare size={14} /> Notes and next steps</h3>
                  <p className="form-section-title">General notes</p>
                  <p className="lead-profile__summary">{lead.notes || 'No notes recorded.'}</p>
                  <p className="form-section-title" style={{ marginTop: 12 }}>Next recommended action</p>
                  <p className="text-sm">{lead.nextAction || 'Not recorded.'}</p>
                  <p className="form-section-title" style={{ marginTop: 12 }}>Solutions discussed</p>
                  <p className="text-sm">{lead.solutionsDiscussed || 'Not recorded.'}</p>
                  <p className="form-section-title" style={{ marginTop: 12 }}>Information shared</p>
                  <p className="text-sm">{lead.informationShared || 'Not recorded.'}</p>
                </div>
                <div className="lead-profile__card">
                  <h3><CircleAlert size={14} /> Qualification gaps</h3>
                  {readiness?.missing.length ? (
                    <ul className="lead-profile__missing">
                      {readiness.missing.map((signal) => (
                        <li key={signal.label}>
                          <strong>{signal.label}</strong>
                          <span>{signal.hint}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm success-text">All tracked qualification signals are recorded.</p>
                  )}
                  <div className="mt-12">
                    <Button variant="soft" size="sm" icon={<Pencil size={13} />} onClick={() => onEdit(lead)}>Update these details</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'follow-ups' ? (
            <div className="stack-16">
              <div className="lead-profile__followup-summary">
                <div><strong>{followUpSummary.dueToday}</strong><span>Due today</span></div>
                <div><strong>{followUpSummary.upcoming}</strong><span>Upcoming</span></div>
                <div><strong className={followUpSummary.overdue ? 'danger-text' : ''}>{followUpSummary.overdue}</strong><span>Overdue</span></div>
                <div><strong>{followUpSummary.completed}</strong><span>Completed</span></div>
                <div><strong>{followUpSummary.completionRate === null ? '—' : `${Math.round(followUpSummary.completionRate)}%`}</strong><span>Completion rate</span></div>
              </div>
              <div className="between">
                <p className="form-section-title" style={{ margin: 0 }}>Follow-up history</p>
                {!isClosed ? <Button variant="soft" size="sm" icon={<CalendarClock size={13} />} onClick={() => onScheduleFollowUp(lead)}>Schedule follow-up</Button> : null}
              </div>
              {followUps.length === 0 ? (
                <p className="empty-inline">No follow-ups recorded for this lead yet.</p>
              ) : (
                <div className="lead-profile__followups">
                  {followUps.map((followUp) => (
                    <div key={followUp.id} className="lead-profile__followup">
                      <div className="lead-profile__followup-head">
                        <div className="row-8 wrap">
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
                          <Badge tone="neutral">{followUp.method}</Badge>
                          {followUp.isImplicit ? <Badge tone="info">From lead date</Badge> : null}
                          <span className="text-xs muted">{formatDateTime(followUp.dueAt)}</span>
                        </div>
                        {followUp.displayStatus !== 'Completed' && followUp.displayStatus !== 'Cancelled' ? (
                          <Button variant="ghost" size="xs" onClick={() => onCompleteFollowUp(followUp)}>Complete</Button>
                        ) : null}
                      </div>
                      <p className="text-sm">{followUp.reason}</p>
                      {followUp.reminder ? <p className="text-xs muted">Reminder preference: {followUp.reminder.replace(/-/g, ' ')}</p> : null}
                      {followUp.status === 'Completed' ? (
                        <div className="lead-profile__followup-outcome">
                          <p><strong>Outcome:</strong> {followUp.outcome}</p>
                          {followUp.latestResponse ? <p><strong>Customer response:</strong> {followUp.latestResponse}</p> : null}
                          {followUp.newRequirements ? <p><strong>New requirements:</strong> {followUp.newRequirements}</p> : null}
                          {followUp.concerns ? <p><strong>Concerns:</strong> {followUp.concerns}</p> : null}
                          {followUp.agreedNextSteps ? <p><strong>Agreed next steps:</strong> {followUp.agreedNextSteps}</p> : null}
                          <p className="text-xs muted">Completed {followUp.completedAt ? formatDateTime(followUp.completedAt) : ''}</p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs muted"><CircleAlert size={12} /> Follow-up reminders are recorded but not sent. Dates use this browser’s clock.</p>
            </div>
          ) : null}

          {tab === 'attribution' ? (
            <div className="stack-16">
              <div className="lead-profile__grid">
                <div className="lead-profile__card">
                  <h3><Target size={14} /> Source and campaign</h3>
                  <DetailRows items={[
                    { label: 'Lead source', value: lead.source },
                    { label: 'Campaign', value: campaign?.name ?? 'Unattributed' },
                    { label: 'Campaign channel', value: campaign?.channel ?? 'Not recorded' },
                    { label: 'Campaign status', value: campaign?.status ?? 'Not recorded' },
                    { label: 'Ad or referral source', value: lead.attribution?.adSource || 'Not recorded' },
                    { label: 'Landing page', value: lead.attribution?.landingPage || 'Not recorded' },
                  ]} />
                </div>
                <div className="lead-profile__card">
                  <h3><CalendarClock size={14} /> Contact attribution</h3>
                  <DetailRows items={[
                    { label: 'First contact', value: lead.attribution?.firstContactDate ? formatDate(lead.attribution.firstContactDate) : 'Not recorded' },
                    { label: 'Latest contact', value: lead.attribution?.latestContactDate ? formatDate(lead.attribution.latestContactDate) : 'Not recorded' },
                    { label: 'Referrer name', value: lead.attribution?.referrerName || 'Not recorded' },
                    { label: 'Referrer contact', value: lead.attribution?.referrerContact || 'Not recorded' },
                    { label: 'Attribution notes', value: lead.attribution?.notes || 'Not recorded' },
                  ]} />
                </div>
              </div>
              <div className="lead-profile__card">
                <h3><Link2 size={14} /> Attribution context</h3>
                <p className="lead-profile__summary">
                  {campaign
                    ? `This lead is linked to ${campaign.name} (${campaign.channel}). The campaign record reports a budget of ${formatINR(campaign.budget)} and spend of ${formatINR(campaign.spend)}.`
                    : 'No campaign is linked to this lead, so only the recorded source is available for attribution.'}
                </p>
                <p className="text-xs muted">
                  Attribution here is the value recorded by the employee. It is not multi-touch measurement or audited marketing data.
                </p>
              </div>
            </div>
          ) : null}

          {tab === 'activity' ? (
            <div className="stack-16">
              <div className="lead-profile__card">
                <h3><MessageSquare size={14} /> Log an activity</h3>
                <div className="form-grid">
                  <Field label="Activity type" htmlFor="profile-activity-type">
                    <select id="profile-activity-type" className="select" value={activityType} onChange={(event) => setActivityType(event.target.value as LeadActivity['type'])}>
                      {(['Call', 'WhatsApp', 'Email', 'Meeting', 'Visit', 'Note'] as LeadActivity['type'][]).map((type) => <option key={type}>{type}</option>)}
                    </select>
                  </Field>
                  <Field label="Summary" htmlFor="profile-activity-summary" error={activityError} className="full">
                    <textarea
                      id="profile-activity-summary"
                      className="textarea"
                      rows={3}
                      value={activitySummary}
                      onChange={(event) => { setActivitySummary(event.target.value); setActivityError('') }}
                      placeholder="What happened, and what is the next step?"
                      aria-invalid={Boolean(activityError)}
                    />
                  </Field>
                </div>
                <div className="row-8 mt-8 wrap">
                  <Button variant="primary" size="sm" onClick={saveActivity}>Save activity</Button>
                  <span className="text-xs muted">Stored locally. No call, email or message is sent.</span>
                </div>
              </div>
              <div className="lead-profile__card">
                <h3><CalendarClock size={14} /> Activity timeline</h3>
                {activities.length === 0 ? (
                  <p className="empty-inline">No activity has been recorded yet.</p>
                ) : (
                  <div className="lead-profile__timeline">
                    {activities.map((activity) => (
                      <div key={activity.id} className="lead-profile__timeline-item">
                        <span className="lead-profile__timeline-icon"><ActivityTypeIcon type={activity.type} /></span>
                        <div>
                          <p className="text-sm"><strong>{activity.type}</strong> · {activity.summary}</p>
                          <p className="text-xs muted">{formatDateTime(activity.at)} · {activity.by}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {tab === 'sales' ? (
            <div className="stack-16">
              {assignment ? (
                <>
                  <SalesHandoverWorkspace
                    lead={lead}
                    assignment={assignment}
                    salesReps={salesReps}
                    campaigns={campaigns}
                    customers={customers}
                    opportunities={opportunities}
                    currentUserName={currentUserName}
                    onSalesStatusChange={onSalesStatusChange}
                    onRecordContactAttempt={onRecordContactAttempt}
                    onScheduleFollowUp={onScheduleFollowUp}
                    onAddSupervisoryNote={onAddSupervisoryNote}
                    onReassign={onReassignHandover}
                  />
                  <p className="text-xs muted"><CircleAlert size={12} /> Sales updates are recorded in this browser. No sales system, CRM, WhatsApp or email provider is contacted.</p>
                </>
              ) : (
                <div className="lead-profile__card lead-profile__card--empty">
                  <Send size={22} />
                  <h3>Not yet sent to sales</h3>
                  <p className="text-sm muted">
                    {lead.status === 'Qualified'
                      ? 'This lead is qualified. Confirm the handover to assign a Sales employee and Sales Manager, notify both and prepare customer messages.'
                      : lead.converted
                        ? 'This lead is already converted and no sales handover was recorded.'
                        : 'Only Qualified leads can be transferred. Complete qualification first.'}
                  </p>
                  {canSendToSales ? (
                    <Button variant="primary" icon={<Send size={14} />} onClick={() => onSendToSales(lead)}>Qualify & transfer to Sales</Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

function TagGroup({
  title,
  values,
  tone = 'neutral',
  empty,
}: {
  title: string
  values: string[]
  tone?: 'neutral' | 'accent' | 'success' | 'danger'
  empty: string
}) {
  return (
    <div className="lead-profile__tag-group">
      <p className="lead-profile__tag-title">{title}</p>
      {values.length ? (
        <div className="row-6 wrap">
          {values.map((value) => <Badge key={value} tone={tone}>{value}</Badge>)}
        </div>
      ) : (
        <p className="text-xs muted">{empty}</p>
      )}
    </div>
  )
}
