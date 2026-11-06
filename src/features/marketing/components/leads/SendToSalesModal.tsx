import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleAlert,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  UserRound,
  Users,
} from 'lucide-react'
import type { Campaign, Lead, SalesRepresentative } from '../../types/marketing'
import { Button } from '../ui/Button'
import { Badge, PriorityBadge, StatusBadge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Form'
import { Avatar } from '../ui/Avatar'
import { ProgressBar } from '../ui/ProgressBar'
import {
  activeSalesEmployees,
  activeSalesManagers,
  businessEmail,
  businessPhone,
  customerEmailBody,
  customerEmailSubject,
  customerWhatsAppMessage,
  defaultFirstContactTarget,
  handoverReadiness,
  managerForSalesRep,
  salesDesignation,
} from '../../utils/handover'
import {
  handoffNoteTemplate,
  leadLocation,
  leadNameList,
  primaryRequirement,
} from '../../utils/leads'
import { formatDate, formatDateTime } from '../../utils/format'

export interface SendToSalesValues {
  salesRepId: string
  salesManagerId: string
  handoffNote: string
  nextAction: string
  expectedFirstContact: string
  whatsappMessage: string
  emailSubject: string
  emailBody: string
  companyName: string
}

export interface SendToSalesResult {
  handoverId: string
  leadId: string
  salesRepName: string
  salesManagerName: string
  expectedFirstContact: string
  notificationCount: number
  customerNotificationCount: number
}

interface SendToSalesModalProps {
  open: boolean
  lead: Lead | null
  salesReps: SalesRepresentative[]
  campaigns: Campaign[]
  currentUserName: string
  onClose: () => void
  onConfirm: (values: SendToSalesValues) => Promise<SendToSalesResult | void> | SendToSalesResult | void
  onOpenLead?: (leadId: string) => void
}

type MessageTab = 'whatsapp' | 'email'

const STEPS = [
  { title: 'Review & qualify', hint: 'Confirm required customer details' },
  { title: 'Assign Sales team', hint: 'Responsible employee and manager' },
  { title: 'Customer messages', hint: 'Preview WhatsApp and email' },
  { title: 'Confirm handover', hint: 'Create the shared record' },
]

export function SendToSalesModal({
  open,
  lead,
  salesReps,
  campaigns,
  currentUserName,
  onClose,
  onConfirm,
  onOpenLead,
}: SendToSalesModalProps) {
  const [step, setStep] = useState(1)
  const [repId, setRepId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [note, setNote] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [expectedFirstContact, setExpectedFirstContact] = useState('')
  const [companyName, setCompanyName] = useState('Totally ERP')
  const [whatsappBody, setWhatsappBody] = useState('')
  const [emailSubject, setEmailSubject] = useState(customerEmailSubject())
  const [emailBody, setEmailBody] = useState('')
  const [messageTab, setMessageTab] = useState<MessageTab>('whatsapp')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendToSalesResult | null>(null)

  const employees = useMemo(() => activeSalesEmployees(salesReps), [salesReps])
  const managers = useMemo(() => activeSalesManagers(salesReps), [salesReps])
  const selectedRep = employees.find((rep) => rep.id === repId) ?? null
  const selectedManager = managers.find((manager) => manager.id === managerId) ?? null
  const campaign = campaigns.find((item) => item.id === lead?.campaignId) ?? null
  const readiness = lead ? handoverReadiness(lead) : null
  const assignmentDate = useMemo(() => new Date().toISOString(), [open, lead?.id])

  const buildMessages = (rep: SalesRepresentative | null, manager: SalesRepresentative | null) => {
    if (!lead) return
    const context = {
      lead,
      salesRep: rep,
      salesManager: manager,
      campaign,
      companyName: companyName.trim() || 'Totally ERP',
      nextStep: nextAction.trim(),
    }
    setWhatsappBody(customerWhatsAppMessage(context))
    setEmailSubject(customerEmailSubject())
    setEmailBody(customerEmailBody(context))
  }

  useEffect(() => {
    if (!open || !lead) return
    const defaultRep = employees.length === 1 ? employees[0] : null
    const defaultManager = managerForSalesRep(defaultRep ?? undefined, salesReps) ?? managers[0] ?? null
    setStep(1)
    setRepId(defaultRep?.id ?? '')
    setManagerId(defaultManager?.id ?? '')
    setNote(handoffNoteTemplate(lead, campaigns, defaultRep?.name))
    setNextAction(lead.nextAction || '')
    setExpectedFirstContact(defaultFirstContactTarget())
    setCompanyName('Totally ERP')
    setMessageTab('whatsapp')
    setError('')
    setSending(false)
    setResult(null)
    const context = {
      lead,
      salesRep: defaultRep,
      salesManager: defaultManager,
      campaign: campaigns.find((item) => item.id === lead.campaignId) ?? null,
      companyName: 'Totally ERP',
      nextStep: lead.nextAction || '',
    }
    setWhatsappBody(customerWhatsAppMessage(context))
    setEmailSubject(customerEmailSubject())
    setEmailBody(customerEmailBody(context))
  }, [open, lead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !lead || result) return
    buildMessages(selectedRep, selectedManager)
  }, [repId, managerId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !lead || result) return
    buildMessages(selectedRep, selectedManager)
  }, [companyName]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!lead) return null

  if (result) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Lead qualified and transferred to Sales"
        description={`${result.handoverId} · ${lead.name} · ${lead.id}`}
        size="wide"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {onOpenLead ? (
              <Button variant="primary" onClick={() => { onClose(); onOpenLead(lead.id) }}>
                Open handover tracking
              </Button>
            ) : null}
          </>
        }
      >
        <div className="lead-send__success">
          <span className="lead-send__success-icon"><CheckCircle2 size={30} /></span>
          <h3>Shared handover record created</h3>
          <p>
            {lead.name} is now marked <strong>Sent to Sales</strong>. The original lead, attribution and activity
            history are preserved; no duplicate lead or customer record was created.
          </p>
          <div className="lead-send__success-grid">
            <div><span>Handover ID</span><strong>{result.handoverId}</strong></div>
            <div><span>Marketing lead</span><strong>{result.leadId}</strong></div>
            <div><span>Sales employee</span><strong>{result.salesRepName}</strong></div>
            <div><span>Sales manager</span><strong>{result.salesManagerName}</strong></div>
            <div><span>First contact due</span><strong>{formatDateTime(result.expectedFirstContact)}</strong></div>
            <div><span>Sales status</span><strong>Assigned · Awaiting first contact</strong></div>
          </div>
          <div className="lead-send__notice-grid">
            <div className="lead-send__notice">
              <Badge tone="info">Simulated</Badge>
              <div>
                <strong>{result.notificationCount} in-app notifications generated</strong>
                <p>Separate demo notifications were added for the Sales employee and Sales Manager.</p>
              </div>
            </div>
            <div className="lead-send__notice">
              <Badge tone="warning">Not delivered</Badge>
              <div>
                <strong>{result.customerNotificationCount} customer messages prepared</strong>
                <p>WhatsApp and email previews were stored as simulated. No provider was contacted.</p>
              </div>
            </div>
          </div>
          <div className="callout callout--info">
            <Info size={14} />
            <span>
              This frontend demo does not send WhatsApp messages, emails, CRM updates or push notifications. All
              notification outcomes are simulated and clearly labelled.
            </span>
          </div>
        </div>
      </Modal>
    )
  }

  const alreadyAssigned = Boolean(lead.salesAssignment)
  const isConverted = lead.converted || lead.status === 'Converted'
  const notQualified = lead.status !== 'Qualified' && !alreadyAssigned

  if (alreadyAssigned || isConverted || notQualified) {
    const rep = salesReps.find((item) => item.id === lead.salesAssignment?.salesRepId)
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={alreadyAssigned || isConverted ? 'Lead already sent to sales' : 'Qualify the lead first'}
        description={`${lead.name} · ${lead.company || 'No company'} · ${lead.id}`}
        size="md"
        footer={<Button variant="primary" onClick={onClose}>Close</Button>}
      >
        <div className="stack-16">
          <div className="callout callout--warning">
            <CircleAlert size={15} />
            <span>
              {alreadyAssigned || isConverted
                ? `This lead already has a shared sales handover${rep ? ` for ${rep.name}` : ''}. Duplicate handovers are blocked; open the lead profile to monitor or update it.`
                : 'Only Qualified leads can be transferred. Complete the missing qualification details, save the lead as Qualified, then confirm the handover.'}
            </span>
          </div>
          {readiness ? (
            <div className="lead-send__readiness">
              <div className="between">
                <span className="text-xs font-semibold">Required handover information</span>
                <span className="text-xs muted">{readiness.complete}/{readiness.total} recorded</span>
              </div>
              <ProgressBar value={(readiness.complete / readiness.total) * 100} size="sm" tone={readiness.ready ? 'success' : 'warning'} />
              {readiness.missing.length ? (
                <ul className="lead-send__missing">
                  {readiness.missing.map((item) => <li key={item.label}>{item.label}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
          <div className="row-8 wrap">
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
            {lead.nextFollowUp ? <Badge tone="warning">Follow-up {formatDate(lead.nextFollowUp)}</Badge> : null}
          </div>
          {onOpenLead ? (
            <Button variant="soft" icon={<UserRound size={14} />} onClick={() => { onClose(); onOpenLead(lead.id) }}>
              Open lead profile
            </Button>
          ) : null}
        </div>
      </Modal>
    )
  }

  const next = () => {
    setError('')
    if (step === 1) {
      if (!readiness?.ready) {
        setError(`Complete the required customer information before transferring: ${readiness?.missing.map((item) => item.label).join(', ')}.`)
        return
      }
      setStep(2)
      return
    }
    if (step === 2) {
      if (!selectedRep) {
        setError('Choose the responsible Sales employee.')
        return
      }
      if (!selectedManager) {
        setError('Choose the supervising Sales Manager.')
        return
      }
      if (!expectedFirstContact) {
        setError('Set the expected first-contact date and time.')
        return
      }
      if (!note.trim()) {
        setError('The handover note cannot be empty. Sales needs the customer context.')
        return
      }
      if (!nextAction.trim()) {
        setError('Add the next action the Sales employee should take.')
        return
      }
      setStep(3)
      return
    }
    if (step === 3) {
      if (!whatsappBody.trim()) {
        setError('The WhatsApp preview cannot be empty.')
        return
      }
      if (!emailSubject.trim() || !emailBody.trim()) {
        setError('The email subject and body are required before confirming the handover.')
        return
      }
      setStep(4)
    }
  }

  const submit = async () => {
    if (!selectedRep || !selectedManager) {
      setError('Choose both a Sales employee and a Sales Manager.')
      return
    }
    setSending(true)
    setError('')
    try {
      const response = await onConfirm({
        salesRepId: selectedRep.id,
        salesManagerId: selectedManager.id,
        handoffNote: note.trim(),
        nextAction: nextAction.trim(),
        expectedFirstContact: new Date(expectedFirstContact).toISOString(),
        whatsappMessage: whatsappBody.trim(),
        emailSubject: emailSubject.trim(),
        emailBody: emailBody.trim(),
        companyName: companyName.trim() || 'Totally ERP',
      })
      if (response) setResult(response)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The handover could not be saved.')
    } finally {
      setSending(false)
    }
  }

  const messageContext = {
    lead,
    salesRep: selectedRep,
    salesManager: selectedManager,
    campaign,
    companyName: companyName.trim() || 'Totally ERP',
    nextStep: nextAction.trim(),
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Qualify & transfer lead to Sales"
      description={`${lead.name} · ${lead.company || 'No company'} · ${lead.id}`}
      size="xl"
      footer={
        <>
          <span className="lead-form__footer-note"><Info size={13} /> Demo handover — notifications are simulated.</span>
          {step > 1 ? <Button variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => { setStep(step - 1); setError('') }}>Back</Button> : null}
          {step < 4 ? (
            <Button variant="primary" onClick={next}>
              Continue <ArrowRight size={14} />
            </Button>
          ) : (
            <Button variant="primary" icon={<Send size={14} />} loading={sending} onClick={submit}>
              Qualify & Transfer to Sales
            </Button>
          )}
        </>
      }
    >
      <div className="lead-send stack-16">
        <ol className="lead-send__steps" aria-label="Marketing to Sales handover steps">
          {STEPS.map((item, index) => {
            const number = index + 1
            const state = step > number ? 'is-complete' : step === number ? 'is-current' : ''
            return (
              <li key={item.title} className={state} aria-current={step === number ? 'step' : undefined}>
                <span>{step > number ? <CheckCircle2 size={13} /> : number}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.hint}</small>
                </div>
              </li>
            )
          })}
        </ol>

        {step === 1 ? (
          <div className="stack-14">
            <div className="lead-send__hero">
              <Avatar name={lead.name} size="lg" />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row-8 wrap">
                  <h3>{lead.name}</h3>
                  <StatusBadge status={lead.status} />
                  <PriorityBadge priority={lead.priority} />
                  {readiness?.ready ? <Badge tone="success">Qualification complete</Badge> : <Badge tone="warning">Missing details</Badge>}
                </div>
                <p className="text-xs muted">
                  {lead.company || 'No company'} · {leadLocation(lead) || 'Location not recorded'} · Marketing owner {lead.generatedBy || lead.assignedTo}
                </p>
                <div className="row-8 wrap mt-6">
                  {leadNameList(lead).split(', ').filter(Boolean).slice(0, 4).map((product) => <Badge key={product} tone="neutral">{product}</Badge>)}
                </div>
              </div>
            </div>

            <div className="lead-send__review-grid">
              <div><span>Customer name</span><strong>{lead.name || 'Not recorded'}</strong></div>
              <div><span>Phone number</span><strong><Phone size={12} /> {lead.phone || 'Not recorded'}</strong></div>
              <div><span>Email address</span><strong><Mail size={12} /> {lead.email || 'Not recorded'}</strong></div>
              <div><span>Company</span><strong><Building2 size={12} /> {lead.company || 'Not applicable'}</strong></div>
              <div><span>Customer location</span><strong><MapPin size={12} /> {leadLocation(lead) || 'Not recorded'}</strong></div>
              <div><span>Product or service</span><strong>{leadNameList(lead)}</strong></div>
              <div><span>Original lead source</span><strong>{lead.source}</strong></div>
              <div><span>Marketing campaign</span><strong>{campaign?.name ?? lead.marketingActivity ?? 'Unattributed'}</strong></div>
              <div><span>Marketing employee</span><strong>{lead.generatedBy || lead.assignedTo || 'Not recorded'}</strong></div>
              <div><span>Last follow-up</span><strong>{lead.nextFollowUp ? formatDateTime(lead.nextFollowUp) : lead.attribution?.latestContactDate ? formatDate(lead.attribution.latestContactDate) : 'Not recorded'}</strong></div>
            </div>

            <div className="lead-send__panel">
              <p className="form-section-title">Customer requirements</p>
              <p className="text-sm" style={{ marginBottom: 10 }}>{primaryRequirement(lead)}</p>
              <p className="form-section-title">Qualification notes</p>
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{lead.qualification?.notes || lead.notes || 'Not recorded.'}</p>
              <div className="lead-send__facts">
                <div><span>Budget</span><strong>{lead.interests?.budget ? `₹${lead.interests.budget.toLocaleString('en-IN')}` : lead.qualification?.budgetRange || lead.interests?.priceRange || 'Not recorded'}</strong></div>
                <div><span>Timeline</span><strong>{lead.qualification?.purchaseTimeline || lead.interests?.expectedPurchaseDate || 'Not recorded'}</strong></div>
                <div><span>Decision authority</span><strong>{lead.qualification?.decisionAuthority || 'Unknown'}</strong></div>
                <div><span>Preferred channel</span><strong>{lead.interests?.preferredChannel || 'Not recorded'}</strong></div>
              </div>
            </div>

            <div className={`lead-send__validation ${readiness?.ready ? 'is-ready' : ''}`.trim()}>
              <div className="between">
                <span className="text-xs font-semibold">Required handover information</span>
                <span className="text-xs muted">{readiness?.complete}/{readiness?.total} recorded</span>
              </div>
              <ProgressBar value={readiness ? (readiness.complete / readiness.total) * 100 : 0} size="sm" tone={readiness?.ready ? 'success' : 'warning'} />
              <div className="lead-send__checks">
                {readiness?.items.map((item) => (
                  <span key={item.label} className={item.present ? 'is-present' : 'is-missing'}>
                    {item.present ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />}
                    {item.label}
                  </span>
                ))}
              </div>
              {readiness?.missing.length ? (
                <div className="lead-send__missing-box">
                  <strong>Complete these details before transferring:</strong>
                  <ul>
                    {readiness.missing.map((item) => (
                      <li key={item.label}><span>{item.label}</span> — {item.hint}</li>
                    ))}
                  </ul>
                  <p className="text-xs muted">Close this dialog, edit the customer profile, save it as Qualified, then confirm the transfer.</p>
                </div>
              ) : (
                <div className="callout callout--success">
                  <BadgeCheck size={14} />
                  <span>All required customer details are recorded. No transfer happens until you confirm on the final step.</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="stack-16">
            <div className="lead-send__assignment-head">
              <div>
                <p className="form-section-title" style={{ margin: 0 }}>Assign the Sales team</p>
                <p className="text-xs muted">One responsible Sales employee and one supervising Sales Manager are required.</p>
              </div>
              <Badge tone="accent">Assignment date {formatDate(assignmentDate)}</Badge>
            </div>

            <div>
              <p className="form-section-title">Responsible Sales employee</p>
              <div className="lead-send__reps" role="radiogroup" aria-label="Responsible Sales employee">
                {employees.map((rep) => {
                  const selected = rep.id === repId
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`lead-send__rep ${selected ? 'is-selected' : ''}`.trim()}
                      onClick={() => {
                        setRepId(rep.id)
                        const manager = managerForSalesRep(rep, salesReps)
                        if (manager) setManagerId(manager.id)
                        else if (!managerId && managers[0]) setManagerId(managers[0].id)
                        setError('')
                      }}
                    >
                      <Avatar name={rep.name} size="md" />
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span className="lead-send__rep-name">{rep.name}</span>
                        <span className="lead-send__rep-meta truncate">{salesDesignation(rep)} · {rep.region}</span>
                        <span className="lead-send__rep-contact truncate">{businessEmail(rep)} · {businessPhone(rep)}</span>
                      </span>
                      <span className="lead-send__rep-side">
                        <Badge tone={rep.availability === 'Available' ? 'success' : rep.availability === 'On leave' ? 'danger' : 'warning'}>{rep.availability ?? 'Available'}</Badge>
                        {selected ? <BadgeCheck size={17} className="success-text" /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="form-section-title">Supervising Sales Manager</p>
              <p className="text-xs muted" style={{ marginBottom: 8 }}>
                Pre-selected from the employee's existing reporting relationship. An authorized user can change it.
              </p>
              <div className="lead-send__reps lead-send__reps--managers" role="radiogroup" aria-label="Supervising Sales Manager">
                {managers.map((manager) => {
                  const selected = manager.id === managerId
                  const derived = selectedRep?.managerId === manager.id
                  return (
                    <button
                      key={manager.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`lead-send__rep ${selected ? 'is-selected' : ''}`.trim()}
                      onClick={() => { setManagerId(manager.id); setError('') }}
                    >
                      <Avatar name={manager.name} size="md" />
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span className="lead-send__rep-name">{manager.name}</span>
                        <span className="lead-send__rep-meta truncate">{salesDesignation(manager)} · {manager.region}</span>
                        <span className="lead-send__rep-contact truncate">{businessEmail(manager)} · {businessPhone(manager)}</span>
                      </span>
                      <span className="lead-send__rep-side">
                        {derived ? <Badge tone="info">Reporting manager</Badge> : null}
                        {selected ? <BadgeCheck size={17} className="success-text" /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="lead-send__assignment-grid">
              <Field
                label="Expected first contact"
                htmlFor="handover-first-contact"
                hint="Configurable target for this handover. Overdue handovers are highlighted for the Sales Manager."
                required
              >
                <input
                  id="handover-first-contact"
                  className="input"
                  type="datetime-local"
                  value={expectedFirstContact}
                  onChange={(event) => { setExpectedFirstContact(event.target.value); setError('') }}
                />
              </Field>
              <Field label="Assignment date" htmlFor="handover-date" hint="Recorded automatically when the handover is created.">
                <input id="handover-date" className="input" value={formatDateTime(assignmentDate)} readOnly />
              </Field>
            </div>

            <Field label="Handover notes for Sales" htmlFor="send-note" required error={error || undefined}>
              <textarea
                id="send-note"
                className="textarea"
                rows={5}
                value={note}
                onChange={(event) => { setNote(event.target.value); setError('') }}
                aria-invalid={Boolean(error)}
              />
            </Field>
            <Field label="Next action for the Sales employee" htmlFor="send-next-action" required>
              <input
                id="send-next-action"
                className="input"
                value={nextAction}
                onChange={(event) => { setNextAction(event.target.value); setError('') }}
                placeholder="e.g. Call the customer and schedule a product demo"
              />
            </Field>

            {selectedRep && selectedManager ? (
              <div className="lead-send__assignment-summary">
                <div>
                  <span>Responsible employee</span>
                  <strong>{selectedRep.name}</strong>
                  <small>{salesDesignation(selectedRep)} · {businessPhone(selectedRep)}</small>
                </div>
                <div>
                  <span>Supervising manager</span>
                  <strong>{selectedManager.name}</strong>
                  <small>{salesDesignation(selectedManager)} · {businessPhone(selectedManager)}</small>
                </div>
                <div>
                  <span>Availability</span>
                  <strong>{selectedRep.availability ?? 'Available'}</strong>
                  <small>{selectedRep.availability === 'Busy' || selectedRep.availability === 'On leave' ? 'Manager is notified even when the employee is unavailable.' : 'Both recipients receive simulated notifications.'}</small>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="stack-16">
            <div className="lead-send__assignment-head">
              <div>
                <p className="form-section-title" style={{ margin: 0 }}>Prepare the customer notification</p>
                <p className="text-xs muted">Uses approved business contacts only. Nothing is sent from this demo.</p>
              </div>
              <Badge tone={lead.interests?.preferredChannel ? 'info' : 'neutral'}>
                Preferred: {lead.interests?.preferredChannel || 'Not recorded'}
              </Badge>
            </div>

            <Field label="Company name used in the message" htmlFor="handover-company">
              <input id="handover-company" className="input" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </Field>

            <div className="segmented" role="tablist" aria-label="Customer message channel">
              <button type="button" role="tab" aria-selected={messageTab === 'whatsapp'} className={messageTab === 'whatsapp' ? 'is-active' : ''} onClick={() => setMessageTab('whatsapp')}>
                <MessageSquare size={13} /> WhatsApp preview
              </button>
              <button type="button" role="tab" aria-selected={messageTab === 'email'} className={messageTab === 'email' ? 'is-active' : ''} onClick={() => setMessageTab('email')}>
                <Mail size={13} /> Email preview
              </button>
            </div>

            {messageTab === 'whatsapp' ? (
              <div className="customer-message">
                <div className="customer-message__head">
                  <div className="row-8">
                    <span className="customer-message__icon"><MessageSquare size={15} /></span>
                    <div>
                      <strong>WhatsApp message preview</strong>
                      <p className="text-xs muted">To {lead.name} · {lead.whatsapp || lead.phone || 'No phone recorded'}</p>
                    </div>
                  </div>
                  <Badge tone="warning">Simulated · not delivered</Badge>
                </div>
                <div className="customer-message__preview customer-message__preview--chat">
                  <p>{whatsappBody}</p>
                </div>
                <Field label="Edit WhatsApp message" htmlFor="handover-whatsapp">
                  <textarea
                    id="handover-whatsapp"
                    className="textarea"
                    rows={12}
                    value={whatsappBody}
                    onChange={(event) => { setWhatsappBody(event.target.value); setError('') }}
                  />
                </Field>
              </div>
            ) : (
              <div className="customer-message">
                <div className="customer-message__head">
                  <div className="row-8">
                    <span className="customer-message__icon"><Mail size={15} /></span>
                    <div>
                      <strong>Email preview</strong>
                      <p className="text-xs muted">To {lead.name} · {lead.email || 'No email recorded'}</p>
                    </div>
                  </div>
                  <Badge tone="warning">Simulated · not delivered</Badge>
                </div>
                <div className="customer-message__preview customer-message__preview--email">
                  <p className="customer-message__subject">{emailSubject}</p>
                  <pre>{emailBody}</pre>
                </div>
                <Field label="Email subject" htmlFor="handover-email-subject" required>
                  <input id="handover-email-subject" className="input" value={emailSubject} onChange={(event) => { setEmailSubject(event.target.value); setError('') }} />
                </Field>
                <Field label="Edit email body" htmlFor="handover-email-body" required>
                  <textarea
                    id="handover-email-body"
                    className="textarea"
                    rows={12}
                    value={emailBody}
                    onChange={(event) => { setEmailBody(event.target.value); setError('') }}
                  />
                </Field>
              </div>
            )}

            <div className="row-8 wrap">
              <Button variant="ghost" size="sm" onClick={() => {
                const context = { ...messageContext }
                setWhatsappBody(customerWhatsAppMessage(context))
                setEmailSubject(customerEmailSubject())
                setEmailBody(customerEmailBody(context))
              }}>
                Reset messages to template
              </Button>
              <span className="text-xs muted"><CircleAlert size={12} /> Preview first, then confirm. Delivery is never claimed.</span>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="stack-16">
            <div className="lead-send__hero">
              <Avatar name={lead.name} size="lg" />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row-8 wrap">
                  <h3>Ready to transfer {lead.name}</h3>
                  <Badge tone="success">Shared handover record</Badge>
                </div>
                <p className="text-xs muted">
                  The lead stays linked to {lead.id}. Attribution, customer details and activity history are preserved.
                </p>
              </div>
            </div>

            <div className="lead-send__review-grid">
              <div><span>Handover ID</span><strong>Created on confirmation</strong></div>
              <div><span>Marketing lead</span><strong>{lead.id}</strong></div>
              <div><span>Sales employee</span><strong>{selectedRep?.name}</strong></div>
              <div><span>Sales Manager</span><strong>{selectedManager?.name}</strong></div>
              <div><span>Handover date</span><strong>{formatDateTime(assignmentDate)}</strong></div>
              <div><span>Expected first contact</span><strong>{expectedFirstContact ? formatDateTime(new Date(expectedFirstContact).toISOString()) : 'Not set'}</strong></div>
              <div><span>Lead status after transfer</span><strong>Sent to Sales</strong></div>
              <div><span>Customer record</span><strong>Reused · no duplicate created</strong></div>
            </div>

            <div className="lead-send__panel">
              <p className="form-section-title">Handover notes</p>
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{note}</p>
              <p className="form-section-title" style={{ marginTop: 12 }}>Next action</p>
              <p className="text-sm">{nextAction}</p>
            </div>

            <div className="lead-send__notice-grid">
              <div className="lead-send__notice">
                <Badge tone="info">Simulated</Badge>
                <div>
                  <strong>Two in-app notifications</strong>
                  <p>{selectedRep?.name} gets “New Qualified Lead Assigned”; {selectedManager?.name} gets “New Qualified Lead — Team Assignment”.</p>
                </div>
              </div>
              <div className="lead-send__notice">
                <Badge tone="warning">Not delivered</Badge>
                <div>
                  <strong>Two customer previews</strong>
                  <p>WhatsApp and email are stored as simulated. No external provider receives the message.</p>
                </div>
              </div>
            </div>

            <div className="callout callout--info">
              <Info size={14} />
              <span>
                Confirming creates one shared handover record on the original lead, notifies both Sales recipients, and
                updates Marketing tracking. No duplicate lead or customer is created.
              </span>
            </div>
            {error ? <p className="field-error" role="alert">{error}</p> : null}
          </div>
        ) : null}

        {error && step < 4 ? <p className="field-error" role="alert">{error}</p> : null}
      </div>
    </Modal>
  )
}
