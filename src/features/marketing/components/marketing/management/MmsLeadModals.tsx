import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  MessageSquare,
  Phone,
  Send,
  ShoppingBag,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Field, FormSection } from '../../ui/Form'
import { ProgressBar } from '../../ui/ProgressBar'
import { useMarketingDepartment } from '../../../context/MarketingDepartmentContext'
import { SALES_REPS } from '../../../data/marketingDepartment'
import type {
  LeadDraft,
  LeadStage,
  MarketingFollowUp,
  MarketingLead,
  MarketingPriority,
} from '../../../types/marketingDepartment'
import {
  findDuplicateLeads,
  leadStats,
  normalizePhone,
  shortDate,
  stageTone,
} from '../../../utils/marketingDepartment'
import { formatINR } from '../../../utils/format'
import { followUpLabel } from '../../../utils/dates'
import { useToast } from '../../../context/ToastContext'
import { useMmsActor, useMmsScope, StatusChip, PriorityChip, SectorChip, TimelineList } from './MmsKit'

const PRIORITIES: MarketingPriority[] = ['Urgent', 'High', 'Medium', 'Low']
const SOURCES = [
  'Field Visit',
  'Referral',
  'Website Enquiry',
  'Social Media',
  'Campaign Response',
  'Event',
  'Cold Call',
  'Retail Walk-in',
  'Partner',
]

function localDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function nowLocal(): string {
  return localDateTime(new Date().toISOString())
}

const emptyLead: LeadDraft = {
  name: '',
  phone: '',
  whatsapp: '',
  email: '',
  businessName: '',
  address: '',
  location: '',
  product: 'Totally ERP Growth Suite',
  requirements: '',
  source: 'Field Visit',
  campaignId: null,
  expectedValue: 250000,
  customerBudget: 200000,
  priority: 'Medium',
  sectorId: '',
  nextFollowUpAt: null,
}

/* ------------------------------------------------------------------ */
/* Lead creation with normalized-phone duplicate protection            */
/* ------------------------------------------------------------------ */

export function LeadFormModal({
  open,
  onClose,
  defaultSectorId,
}: {
  open: boolean
  onClose: () => void
  defaultSectorId?: string | null
}) {
  const { leads, campaigns, addLead } = useMarketingDepartment()
  const { mySectors, department } = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const sectorOptions = mySectors.length ? mySectors : department.sectors
  const [form, setForm] = useState<LeadDraft>({
    ...emptyLead,
    sectorId: defaultSectorId ?? sectorOptions[0]?.id ?? '',
  })
  const [showAllDuplicates, setShowAllDuplicates] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ ...emptyLead, sectorId: defaultSectorId ?? sectorOptions[0]?.id ?? '' })
      setShowAllDuplicates(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultSectorId])

  const duplicates = useMemo(
    () =>
      form.phone.trim().length >= 8
        ? findDuplicateLeads(leads, form.phone, form.email, form.businessName)
        : [],
    [leads, form.phone, form.email, form.businessName],
  )
  const phoneDuplicate = duplicates.find(
    (lead) => normalizePhone(lead.phone) === normalizePhone(form.phone) && normalizePhone(form.phone).length >= 8,
  )
  const canSubmit =
    form.name.trim().length > 1 &&
    form.phone.trim().replace(/\D/g, '').length >= 10 &&
    form.sectorId &&
    !phoneDuplicate

  function submit() {
    if (!canSubmit) {
      pushToast({
        title: 'Lead cannot be saved',
        description: phoneDuplicate
          ? 'This mobile number is already registered. Open the existing lead instead of creating a duplicate.'
          : 'Add a customer name, a valid 10-digit mobile number and a sector.',
        tone: 'warning',
      })
      return
    }
    const lead = addLead(
      {
        ...form,
        name: form.name.trim(),
        whatsapp: form.whatsapp || form.phone,
        nextFollowUpAt: form.nextFollowUpAt || null,
      },
      actor,
    )
    pushToast({
      title: 'Lead captured',
      description: `${lead.name} was added to the shared pipeline and assigned to your sector workflow.`,
      tone: 'success',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Capture a new lead"
      description="One shared lead record for every sector. Mobile numbers are normalised and checked against the complete department pipeline before saving."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} icon={<UserRound size={15} />}>
            Create lead
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormSection title="Customer identity" />
        <Field label="Contact name" required>
          <input
            value={form.name}
            autoFocus
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. Priya Sharma"
          />
        </Field>
        <Field label="Business / company">
          <input
            value={form.businessName}
            onChange={(event) => setForm({ ...form, businessName: event.target.value })}
            placeholder="e.g. Sharma Textiles"
          />
        </Field>
        <Field label="Mobile number" required hint="Stored in normalized form for duplicate detection.">
          <input
            value={form.phone}
            inputMode="tel"
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="+91 98765 43210"
          />
        </Field>
        <Field label="WhatsApp number" hint="Leave blank to use the mobile number.">
          <input
            value={form.whatsapp}
            inputMode="tel"
            onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
            placeholder="+91 98765 43210"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="name@business.com"
          />
        </Field>
        <Field label="Location">
          <input
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            placeholder="Area, city"
          />
        </Field>
        <Field label="Full address" className="full">
          <textarea
            rows={2}
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            placeholder="Billing / site address"
          />
        </Field>

        <FormSection title="Opportunity and routing" />
        <Field label="Product / solution interest">
          <input
            value={form.product}
            onChange={(event) => setForm({ ...form, product: event.target.value })}
          />
        </Field>
        <Field label="Lead source">
          <select
            value={form.source}
            onChange={(event) => setForm({ ...form, source: event.target.value })}
          >
            {SOURCES.map((source) => <option key={source}>{source}</option>)}
          </select>
        </Field>
        <Field label="Sector" required>
          <select
            value={form.sectorId}
            onChange={(event) => setForm({ ...form, sectorId: event.target.value })}
          >
            {sectorOptions.map((sector) => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Campaign (optional)">
          <select
            value={form.campaignId ?? ''}
            onChange={(event) => setForm({ ...form, campaignId: event.target.value || null })}
          >
            <option value="">Not campaign-attributed</option>
            {campaigns
              .filter((campaign) => campaign.sectorId === form.sectorId)
              .map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={form.priority}
            onChange={(event) => setForm({ ...form, priority: event.target.value as MarketingPriority })}
          >
            {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </Field>
        <Field label="Expected deal value (₹)">
          <input
            type="number"
            min={0}
            step={10000}
            value={form.expectedValue}
            onChange={(event) => setForm({ ...form, expectedValue: Number(event.target.value) })}
          />
        </Field>
        <Field label="Customer budget (₹)">
          <input
            type="number"
            min={0}
            step={10000}
            value={form.customerBudget}
            onChange={(event) => setForm({ ...form, customerBudget: Number(event.target.value) })}
          />
        </Field>
        <Field label="First follow-up">
          <input
            type="datetime-local"
            value={form.nextFollowUpAt ?? ''}
            onChange={(event) => setForm({ ...form, nextFollowUpAt: event.target.value || null })}
          />
        </Field>
        <Field label="Customer requirements" className="full">
          <textarea
            rows={3}
            value={form.requirements}
            onChange={(event) => setForm({ ...form, requirements: event.target.value })}
            placeholder="What does the customer need? Capture quantities, timelines and decision makers."
          />
        </Field>
      </div>

      {phoneDuplicate ? (
        <div className="mms-duplicate-alert">
          <AlertTriangle size={17} />
          <div>
            <strong>Duplicate mobile number blocked</strong>
            <p>
              {phoneDuplicate.name} ({phoneDuplicate.businessName || 'Individual'}) already exists at stage{' '}
              <b>{phoneDuplicate.stage}</b> with the same normalized number{' '}
              <code>{normalizePhone(form.phone)}</code>.
            </p>
          </div>
        </div>
      ) : duplicates.length ? (
        <div className="mms-inline-warning">
          <AlertTriangle size={14} />
          <span>
            {duplicates.length} possible match{duplicates.length > 1 ? 'es' : ''} found by email or business name.
            Review before continuing.
            <button type="button" className="mms-link" onClick={() => setShowAllDuplicates((value) => !value)}>
              {showAllDuplicates ? 'Hide' : 'Show matches'}
            </button>
          </span>
        </div>
      ) : null}

      {showAllDuplicates && duplicates.length ? (
        <ul className="mms-duplicate-list">
          {duplicates.map((lead) => (
            <li key={lead.id}>
              <strong>{lead.name}</strong> · {lead.businessName || 'Individual'}
              <span>{lead.phone} · {lead.stage}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Follow-up scheduling and completion                                 */
/* ------------------------------------------------------------------ */

export function FollowUpModal({
  open,
  onClose,
  lead,
  followUp,
  mode = 'schedule',
}: {
  open: boolean
  onClose: () => void
  lead: MarketingLead | null
  followUp?: MarketingFollowUp | null
  mode?: 'schedule' | 'complete' | 'reschedule'
}) {
  const { scheduleFollowUp, completeFollowUp, rescheduleFollowUp, employees } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [dueAt, setDueAt] = useState(nowLocal())
  const [modeValue, setModeValue] = useState<MarketingFollowUp['mode']>('Phone Call')
  const [result, setResult] = useState('Interested')
  const [notes, setNotes] = useState('')
  const [nextActionAt, setNextActionAt] = useState('')

  useEffect(() => {
    if (!open) return
    setDueAt(localDateTime(followUp?.dueAt) || nowLocal())
    setModeValue(followUp?.mode ?? 'Phone Call')
    setResult('Interested')
    setNotes('')
    setNextActionAt('')
  }, [open, followUp])

  if (!lead) return null

  const isComplete = mode === 'complete'
  const isReschedule = mode === 'reschedule'

  function submit() {
    if (!lead) return
    if (!isComplete && !dueAt) {
      pushToast({ title: 'Choose a follow-up date', description: 'A due date is required.', tone: 'warning' })
      return
    }
    if (isComplete && followUp) {
      completeFollowUp(followUp.id, result, notes, nextActionAt || null, actor)
      pushToast({
        title: 'Follow-up recorded',
        description: nextActionAt
          ? 'Outcome saved and the next follow-up is scheduled.'
          : 'Outcome saved against the shared lead record.',
        tone: 'success',
      })
    } else if (isReschedule && followUp) {
      rescheduleFollowUp(followUp.id, dueAt, notes)
      pushToast({ title: 'Follow-up rescheduled', description: `Moved to ${new Date(dueAt).toLocaleString('en-IN')}.`, tone: 'success' })
    } else {
      scheduleFollowUp({
        leadId: lead.id,
        dueAt,
        mode: modeValue,
        employeeId: actor.id,
        notes,
      })
      pushToast({ title: 'Follow-up scheduled', description: `${lead.name} · ${new Date(dueAt).toLocaleString('en-IN')}`, tone: 'success' })
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isComplete ? 'Record follow-up outcome' : isReschedule ? 'Reschedule follow-up' : 'Schedule follow-up'}
      description={`${lead.name} · ${lead.businessName || 'Individual'} · ${lead.phone}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} icon={<CalendarClock size={15} />}>
            {isComplete ? 'Save outcome' : isReschedule ? 'Reschedule' : 'Schedule follow-up'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {!isComplete || isReschedule ? (
          <Field label="Follow-up date and time" required className="full">
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </Field>
        ) : null}
        {!isReschedule ? (
          <Field label="Contact mode">
            <select
              value={isComplete ? followUp?.mode ?? modeValue : modeValue}
              disabled={isComplete}
              onChange={(event) => setModeValue(event.target.value as MarketingFollowUp['mode'])}
            >
              {['Phone Call', 'WhatsApp', 'Meeting', 'Email'].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        ) : null}
        {isComplete ? (
          <Field label="Outcome">
            <select value={result} onChange={(event) => setResult(event.target.value)}>
              {['Interested', 'Not Interested', 'Call Later', 'No Response', 'Meeting Scheduled'].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label={isComplete ? 'Conversation notes' : 'Instructions'} className="full">
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={
              isComplete
                ? 'What did the customer say? Capture objections, requirements and the agreed next step.'
                : 'What should the team cover in this follow-up?'
            }
          />
        </Field>
        {isComplete ? (
          <Field label="Schedule next follow-up (optional)" className="full">
            <input
              type="datetime-local"
              value={nextActionAt}
              onChange={(event) => setNextActionAt(event.target.value)}
            />
          </Field>
        ) : null}
      </div>
      <div className="mms-form-summary">
        <span><Phone size={14} /> {employees.length ? 'Every touchpoint is visible to the whole department' : 'Shared pipeline'}</span>
        <span><ClipboardCheck size={14} /> {lead.followUps.length} previous follow-ups</span>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Sales handover                                                      */
/* ------------------------------------------------------------------ */

export function HandoverModal({
  open,
  onClose,
  lead,
}: {
  open: boolean
  onClose: () => void
  lead: MarketingLead | null
}) {
  const { leads, assignHandover } = useMarketingDepartment()
  const salesReps = SALES_REPS
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [salesRepId, setSalesRepId] = useState(salesReps[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<MarketingPriority>('High')
  const [nextActionDate, setNextActionDate] = useState('')

  useEffect(() => {
    if (!open) return
    setSalesRepId(salesReps[0]?.id ?? '')
    setNotes('')
    setPriority('High')
    setNextActionDate('')
  }, [open, salesReps])

  if (!lead) return null
  const duplicateHandover = leads.find(
    (item) =>
      item.id !== lead.id &&
      normalizePhone(item.phone) === normalizePhone(lead.phone) &&
      Boolean(item.handover),
  )
  const alreadyHandedOver = Boolean(lead.handover)
  const canSubmit = Boolean(salesRepId) && !duplicateHandover && !alreadyHandedOver

  function submit() {
    if (!canSubmit || !lead) return
    const rep = salesReps.find((item) => item.id === salesRepId)
    const ok = assignHandover(
      lead.id,
      {
        salesRepId,
        salesRepName: rep?.name ?? 'Unassigned sales representative',
        notes,
        priority,
        nextActionDate,
      },
      actor,
    )
    if (ok) {
      pushToast({
        title: 'Lead handed over to Sales',
        description: `${lead.name} is now owned by ${rep?.name ?? 'the sales team'}. Marketing cannot mark this lead Won or Lost.`,
        tone: 'success',
      })
      onClose()
    } else {
      pushToast({ title: 'Handover blocked', description: 'This lead already has a sales handover.', tone: 'warning' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send qualified lead to Sales"
      description="Handover removes the lead from marketing validation. The sales team owns the outcome and is the only team allowed to record Won or Lost."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} icon={<Send size={15} />}>
            Send to Sales
          </Button>
        </>
      }
    >
      {alreadyHandedOver ? (
        <div className="mms-inline-warning">
          <AlertTriangle size={14} /> This lead has already been handed over to {lead.handover?.salesRepName}.
        </div>
      ) : null}
      {duplicateHandover ? (
        <div className="mms-duplicate-alert">
          <AlertTriangle size={17} />
          <div>
            <strong>Duplicate handover blocked</strong>
            <p>
              {duplicateHandover.name} with the same mobile number was already sent to Sales
              ({duplicateHandover.handover?.salesRepName}).
            </p>
          </div>
        </div>
      ) : null}
      <div className="mms-handover-lead">
        <div>
          <strong>{lead.name}</strong>
          <span>{lead.businessName || 'Individual'} · {lead.phone}</span>
        </div>
        <div>
          <StatusChip status={lead.stage} tone={stageTone(lead.stage)} />
          <PriorityChip priority={lead.priority} />
        </div>
      </div>
      <div className="form-grid">
        <Field label="Sales representative" required>
          <select value={salesRepId} onChange={(event) => setSalesRepId(event.target.value)}>
            {salesReps.map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.name} · {rep.region}</option>
            ))}
          </select>
        </Field>
        <Field label="Handover priority">
          <select value={priority} onChange={(event) => setPriority(event.target.value as MarketingPriority)}>
            {PRIORITIES.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Sales first action date">
          <input type="date" value={nextActionDate} onChange={(event) => setNextActionDate(event.target.value)} />
        </Field>
        <Field label="Handover notes" className="full" hint="Requirements, decision makers, agreed commercials and anything Sales must know.">
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Customer is evaluating a 3-year rollout. Budget approved. Needs an implementation timeline."
          />
        </Field>
      </div>
      <div className="mms-form-summary">
        <span><ShoppingBag size={14} /> {formatINR(lead.expectedValue)} expected value</span>
        <span><MessageSquare size={14} /> {lead.followUps.length} marketing conversations</span>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Full lead detail + role-aware workflow                              */
/* ------------------------------------------------------------------ */

const STAGE_FLOW: LeadStage[] = ['New Lead', 'Follow-up', 'Qualification', 'Senior Review', 'Manager Review', 'Sent to Sales', 'Sales Follow-up', 'Won']

export function LeadDetailModal({
  open,
  onClose,
  leadId,
}: {
  open: boolean
  onClose: () => void
  leadId: string | null
}) {
  const { leads, followUps, updateLeadStage, updateSalesHandover, employees } = useMarketingDepartment()
  const { roleId, department } = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [showReject, setShowReject] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [followUpMode, setFollowUpMode] = useState<'schedule' | 'complete' | null>(null)
  const [handoverOpen, setHandoverOpen] = useState(false)
  const [salesUpdateOpen, setSalesUpdateOpen] = useState(false)
  const [salesStatus, setSalesStatus] = useState<NonNullable<MarketingLead['handover']>['salesStatus']>('In Progress')
  const [salesProgress, setSalesProgress] = useState(10)
  const [salesNote, setSalesNote] = useState('')

  const lead = leads.find((item) => item.id === leadId) ?? null
  const leadFollowUps = followUps
    .filter((item) => item.leadId === leadId)
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime())
  const schedule = leadFollowUps.find((item) => item.status === 'Scheduled')

  useEffect(() => {
    if (!open) {
      setShowReject(false)
      setRejectionReason('')
      setFollowUpMode(null)
      setHandoverOpen(false)
    }
  }, [open])

  if (!lead) return null

  const junior = employees.find((item) => item.id === lead.assignedJuniorId)
  const senior = employees.find((item) => item.id === lead.assignedSeniorId)
  const stats = leadStats([lead], leadFollowUps)
  const currentIndex = STAGE_FLOW.indexOf(lead.stage)
  const terminal = ['Won', 'Lost', 'Rejected'].includes(lead.stage)
  const canAct = !terminal && !lead.handover

  function move(stage: LeadStage, action: string, note: string) {
    if (!lead) return
    updateLeadStage(lead.id, stage, actor, action, note)
    pushToast({ title: action, description: `${lead.name} moved to ${stage}.`, tone: 'success' })
  }

  function reject() {
    if (!lead) return
    if (rejectionReason.trim().length < 8) {
      pushToast({ title: 'Add a rejection reason', description: 'Explain why this lead is being rejected.', tone: 'warning' })
      return
    }
    updateLeadStage(lead.id, 'Rejected', actor, 'Lead rejected', rejectionReason.trim(), {
      rejectionReason: rejectionReason.trim(),
    })
    pushToast({ title: 'Lead rejected', description: 'The record remains visible with its full history.', tone: 'error' })
    setShowReject(false)
  }

  const actions: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'soft' | 'danger' | 'ghost'; icon: React.ReactNode }> = []

  if (canAct) {
    if (roleId === 'junior') {
      if (lead.stage === 'New Lead' || lead.stage === 'Follow-up') {
        actions.push({
          label: 'Schedule follow-up',
          onClick: () => setFollowUpMode('schedule'),
          variant: 'soft',
          icon: <CalendarClock size={14} />,
        })
        if (schedule) {
          actions.push({
            label: 'Record follow-up',
            onClick: () => setFollowUpMode('complete'),
            variant: 'primary',
            icon: <Phone size={14} />,
          })
        }
        if (lead.stage === 'Follow-up') {
          actions.push({
            label: 'Submit for qualification',
            onClick: () => move('Qualification', 'Submitted for qualification', 'Customer requirements captured and the lead is ready for review.'),
            variant: 'soft',
            icon: <ArrowRight size={14} />,
          })
        }
      }
      if (lead.stage === 'Qualification') {
        actions.push({
          label: 'Send to Manager',
          onClick: () => move('Manager Review', 'Sent directly to manager', 'Qualified lead submitted to the manager with full customer and follow-up history.'),
          variant: 'primary',
          icon: <Send size={14} />,
        })
        actions.push({
          label: 'Send to Senior review',
          onClick: () => move('Senior Review', 'Submitted for senior review', 'Qualification complete. Requesting senior validation.'),
          variant: 'soft',
          icon: <ArrowRight size={14} />,
        })
      }
    }

    if (roleId === 'senior') {
      if (lead.stage === 'Senior Review') {
        actions.push({
          label: 'Send to Manager',
          onClick: () => move('Manager Review', 'Recommended to manager', 'Qualified and recommended for manager approval and sales handover.'),
          variant: 'primary',
          icon: <Send size={14} />,
        })
        actions.push({
          label: 'Return to qualification',
          onClick: () => move('Qualification', 'Returned to qualification', 'More customer detail is required before senior sign-off.'),
          variant: 'soft',
          icon: <XCircle size={14} />,
        })
      }
      if (lead.stage === 'Qualification') {
        actions.push({
          label: 'Send to Manager',
          onClick: () => move('Manager Review', 'Sent directly to manager', 'Qualified lead submitted to the manager with full customer and follow-up history.'),
          variant: 'primary',
          icon: <Send size={14} />,
        })
        actions.push({
          label: 'Start senior review',
          onClick: () => move('Senior Review', 'Senior review started', 'Reviewing customer requirement and qualification notes.'),
          variant: 'soft',
          icon: <ClipboardCheck size={14} />,
        })
      }
    }

    if (roleId === 'manager') {
      if (lead.stage === 'Manager Review') {
        actions.push({
          label: 'Send to Sales',
          onClick: () => setHandoverOpen(true),
          variant: 'primary',
          icon: <Send size={14} />,
        })
        actions.push({
          label: 'Return to senior',
          onClick: () => move('Senior Review', 'Returned to senior review', 'Additional validation is required before handover.'),
          variant: 'soft',
          icon: <XCircle size={14} />,
        })
      }
      if (lead.stage === 'Senior Review') {
        actions.push({
          label: 'Approve as manager',
          onClick: () => move('Manager Review', 'Manager review started', 'Accepting the senior recommendation for final review.'),
          variant: 'soft',
          icon: <ClipboardCheck size={14} />,
        })
      }
    }

    if (!['Rejected', 'Won', 'Lost', 'Sent to Sales', 'Sales Follow-up'].includes(lead.stage)) {
      actions.push({
        label: 'Reject lead',
        onClick: () => setShowReject(true),
        variant: 'danger',
        icon: <XCircle size={14} />,
      })
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="xl"
        title={
          <span className="mms-modal-title">
            {lead.name}
            <StatusChip status={lead.stage} tone={stageTone(lead.stage)} />
            <PriorityChip priority={lead.priority} />
          </span>
        }
        description={`${lead.businessName || 'Individual'} · ${lead.phone} · ${lead.location || 'Location not captured'}`}
        footer={
          <div className="mms-modal-footer">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <div className="mms-modal-footer__actions">
              {actions.map((action) => (
                <Button key={action.label} variant={action.variant ?? 'soft'} size="sm" onClick={action.onClick} icon={action.icon}>
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        }
      >
        <div className="mms-lead-detail">
          <div className="mms-lead-detail__main">
            <section className="mms-detail-block">
              <h3>Pipeline progress</h3>
              <ol className="mms-stage-flow">
                {STAGE_FLOW.map((stage, index) => {
                  const complete = currentIndex >= 0 && index < currentIndex
                  const active = lead.stage === stage
                  const skipped = currentIndex < 0
                  return (
                    <li
                      key={stage}
                      className={`${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''} ${skipped ? 'is-skipped' : ''}`.trim()}
                    >
                      <span className="mms-stage-flow__dot">{complete ? <CheckCircle2 size={12} /> : index + 1}</span>
                      <small>{stage}</small>
                    </li>
                  )
                })}
              </ol>
              {lead.stage === 'Rejected' ? (
                <div className="mms-inline-warning"><XCircle size={14} /> Rejected: {lead.rejectionReason}</div>
              ) : null}
              {lead.handover ? (
                <div className="mms-handover-box mms-handover-box--full">
                  <div className="mms-handover-box__head">
                    <div>
                      <span className="mms-eyebrow">Sales ownership</span>
                      <strong>{lead.handover.salesRepName}</strong>
                      <small>Handed over by {lead.handover.handoverByName} · {shortDate(lead.handover.handoverAt)}</small>
                    </div>
                    <StatusChip status={lead.handover.salesStatus ?? 'Assigned'} tone={lead.handover.salesStatus === 'Closed' ? 'success' : lead.handover.salesStatus === 'Customer Follow-up' ? 'warning' : 'info'} />
                  </div>
                  <div className="mms-handover-box__grid">
                    <div><span>Sales manager</span><strong>{lead.handover.salesManagerName || 'Not assigned'}</strong></div>
                    <div><span>Sales employee</span><strong>{lead.handover.salesRepName}</strong></div>
                    <div><span>Next action</span><strong>{lead.handover.nextActionDate ? shortDate(lead.handover.nextActionDate) : 'Not set'}</strong></div>
                    <div><span>Priority</span><strong>{lead.handover.priority}</strong></div>
                    <div className="full"><span>Handover notes</span><strong>{lead.handover.notes || 'No handover notes.'}</strong></div>
                  </div>
                  <div className="mms-handover-box__progress">
                    <span>Sales progress</span>
                    <strong>{lead.handover.salesProgress ?? 0}%</strong>
                    <ProgressBar value={lead.handover.salesProgress ?? 0} size="sm" />
                  </div>
                  {(lead.handover.updates ?? []).length ? (
                    <ol className="mms-audit-list">
                      {(lead.handover.updates ?? []).map((update) => (
                        <li key={update.id}>
                          <span className="mms-audit-dot" />
                          <div>
                            <strong>{update.status} · {update.progress}%</strong>
                            <small>{update.byName} · {shortDate(update.at)}</small>
                            <p>{update.note}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="mms-empty-line">No sales updates recorded yet.</p>}
                  {roleId === 'manager' ? (
                    <Button size="xs" variant="soft" onClick={() => {
                      setSalesStatus(lead.handover?.salesStatus ?? 'In Progress')
                      setSalesProgress(lead.handover?.salesProgress ?? 0)
                      setSalesNote('')
                      setSalesUpdateOpen((current) => !current)
                    }}>
                      {salesUpdateOpen ? 'Close update form' : 'Update sales status'}
                    </Button>
                  ) : null}
                  {salesUpdateOpen ? (
                    <div className="mms-sales-update">
                      <Field label="Sales status">
                        <select value={salesStatus} onChange={(event) => setSalesStatus(event.target.value as NonNullable<MarketingLead['handover']>['salesStatus'])}>
                          {['Assigned', 'In Progress', 'Customer Follow-up', 'Closed'].map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </Field>
                      <Field label="Progress (%)">
                        <input type="number" min={0} max={100} value={salesProgress} onChange={(event) => setSalesProgress(Number(event.target.value))} />
                      </Field>
                      <Field label="Update note">
                        <textarea rows={2} value={salesNote} onChange={(event) => setSalesNote(event.target.value)} placeholder="Customer response, demo outcome or next step…" />
                      </Field>
                      <Button size="sm" variant="primary" disabled={!salesNote.trim()} onClick={() => {
                        updateSalesHandover(lead.id, { salesStatus, salesProgress, note: salesNote }, actor)
                        pushToast({ title: 'Sales status updated', description: `${lead.name} is now ${salesStatus}.`, tone: 'success' })
                        setSalesUpdateOpen(false)
                      }}>Save sales update</Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {lead.salesOutcome ? (
                <div className={`mms-outcome mms-outcome--${lead.salesOutcome.status.toLowerCase()}`}>
                  <span>Recorded by Sales</span>
                  <strong>{lead.salesOutcome.status} · {formatINR(lead.salesOutcome.value)}</strong>
                  <small>{lead.salesOutcome.recordedBy} · {shortDate(lead.salesOutcome.closedAt)} · {lead.salesOutcome.note}</small>
                </div>
              ) : lead.handover ? (
                <p className="mms-empty-line">Outcome is pending with Sales. Marketing cannot edit Won or Lost.</p>
              ) : null}
            </section>

            <section className="mms-detail-block">
              <h3>Customer and opportunity</h3>
              <div className="mms-detail-grid">
                <div><span>Email</span><strong>{lead.email || '—'}</strong></div>
                <div><span>WhatsApp</span><strong>{lead.whatsapp || lead.phone}</strong></div>
                <div><span>Product</span><strong>{lead.product || '—'}</strong></div>
                <div><span>Source</span><strong>{lead.source}</strong></div>
                <div><span>Expected value</span><strong>{formatINR(lead.expectedValue)}</strong></div>
                <div><span>Customer budget</span><strong>{formatINR(lead.customerBudget)}</strong></div>
                <div><span>Assigned junior</span><strong>{junior?.name ?? 'Unassigned'}</strong></div>
                <div><span>Sector senior</span><strong>{senior?.name ?? 'Unassigned'}</strong></div>
                <div className="full"><span>Requirement</span><strong>{lead.requirements || 'No requirement notes captured.'}</strong></div>
                <div className="full"><span>Address</span><strong>{lead.address || '—'}</strong></div>
              </div>
            </section>

            <section className="mms-detail-block">
              <h3>Follow-up history</h3>
              {leadFollowUps.length ? (
                <ul className="mms-followup-list">
                  {leadFollowUps.map((followUp) => (
                    <li key={followUp.id}>
                      <span className={`mms-followup-list__icon mms-followup-list__icon--${followUp.status.toLowerCase()}`}>
                        {followUp.status === 'Completed' ? <CheckCircle2 size={14} /> : <CalendarClock size={14} />}
                      </span>
                      <div>
                        <div className="mms-followup-list__head">
                          <strong>{followUp.mode}</strong>
                          <StatusChip status={followUp.status} />
                          <span>{followUpLabel(followUp.dueAt)}</span>
                        </div>
                        <p>{followUp.notes || 'No notes recorded.'}</p>
                        {followUp.result ? <small>Outcome: {followUp.result}</small> : null}
                        {followUp.status === 'Scheduled' && !lead.handover && !terminal ? (
                          <Button size="xs" variant="soft" onClick={() => setFollowUpMode('complete')}>
                            Record outcome
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mms-empty-line">No follow-ups scheduled. Add the first customer touchpoint.</p>
              )}
              {lead.followUps.length ? (
                <div className="mms-conversation-log">
                  {lead.followUps.map((entry) => (
                    <div key={entry.id}>
                      <strong>{entry.result}</strong>
                      <span>{entry.mode} · {entry.employeeName} · {shortDate(entry.at)}</span>
                      <p>{entry.notes}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {showReject ? (
              <section className="mms-detail-block mms-reject-box">
                <h3>Reject this lead</h3>
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Reason for rejection (budget, authority, requirement fit)…"
                />
                <div className="mms-modal-footer__actions">
                  <Button variant="ghost" size="sm" onClick={() => setShowReject(false)}>Cancel</Button>
                  <Button variant="danger" size="sm" onClick={reject}>Confirm rejection</Button>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="mms-lead-detail__aside">
            <div className="mms-detail-stat">
              <span>Pipeline age</span>
              <strong>{Math.max(0, Math.round((Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000))} days</strong>
            </div>
            <div className="mms-detail-stat">
              <span>Follow-ups</span>
              <strong>{stats.followUpDue ? `${stats.followUpDue} due` : `${leadFollowUps.length} logged`}</strong>
            </div>
            <div className="mms-detail-stat">
              <span>Sector</span>
              <SectorChip sector={department.sectors.find((sector) => sector.id === lead.sectorId)} />
            </div>
            <div className="mms-detail-block">
              <h3>Audit trail</h3>
              <TimelineList
                items={lead.reviews.map((review) => ({
                  id: review.id,
                  at: review.at,
                  actorName: review.actorName,
                  actorRole: review.actorRole,
                  action: review.action,
                  note: review.note,
                  tone: review.toStage === 'Rejected' ? 'danger' : 'info',
                }))}
                limit={7}
              />
            </div>
            <div className="mms-detail-block">
              <h3>Role controls</h3>
              <p className="mms-empty-line">
                {lead.handover
                  ? 'Ownership transferred to Sales. Marketing controls are locked.'
                  : roleId === 'junior'
                    ? 'Juniors capture leads, schedule follow-ups and submit qualified opportunities to their senior.'
                    : roleId === 'senior'
                      ? 'Seniors validate qualification and recommend leads to the manager.'
                      : 'Managers approve qualified leads and complete the sales handover.'}
              </p>
            </div>
          </aside>
        </div>
      </Modal>
      <FollowUpModal
        open={followUpMode !== null}
        onClose={() => setFollowUpMode(null)}
        lead={lead}
        followUp={schedule}
        mode={followUpMode === 'complete' ? 'complete' : 'schedule'}
      />
      <HandoverModal open={handoverOpen} onClose={() => setHandoverOpen(false)} lead={lead} />
    </>
  )
}
