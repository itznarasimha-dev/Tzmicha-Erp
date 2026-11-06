import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Info, MessageSquarePlus } from 'lucide-react'
import type { Lead, LeadFollowUp } from '../../types/marketing'
import { Button } from '../ui/Button'
import { Field } from '../ui/Form'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { FOLLOW_UP_METHODS, type FollowUpView } from '../../utils/leads'
import { formatDate, formatDateTime } from '../../utils/format'
import { dateOnlyFromNow } from '../../utils/dates'

export interface FollowUpScheduleValues {
  dueDate: string
  dueTime: string
  method: LeadFollowUp['method']
  reason: string
  reminder: string
}

export interface FollowUpCompletionValues {
  outcome: string
  latestResponse: string
  newRequirements: string
  concerns: string
  updatedBudget: string
  purchaseReadiness: string
  agreedNextSteps: string
  nextDate: string
  nextTime: string
  nextMethod: LeadFollowUp['method']
  nextReason: string
}

export type FollowUpMode = 'schedule' | 'complete'

interface FollowUpModalProps {
  open: boolean
  mode: FollowUpMode
  lead: Lead | null
  followUp?: FollowUpView | null
  onClose: () => void
  onSchedule: (values: FollowUpScheduleValues) => void
  onComplete: (values: FollowUpCompletionValues) => void
}

const REMINDERS = [
  { value: '', label: 'No reminder' },
  { value: '15-minutes', label: '15 minutes before' },
  { value: '1-hour', label: '1 hour before' },
  { value: '1-day', label: '1 day before' },
  { value: 'morning-of', label: 'Morning of the follow-up' },
]

function defaultSchedule(): FollowUpScheduleValues {
  return {
    dueDate: dateOnlyFromNow(1),
    dueTime: '10:00',
    method: 'Call',
    reason: '',
    reminder: '',
  }
}

function blankCompletion(): FollowUpCompletionValues {
  return {
    outcome: '',
    latestResponse: '',
    newRequirements: '',
    concerns: '',
    updatedBudget: '',
    purchaseReadiness: '',
    agreedNextSteps: '',
    nextDate: '',
    nextTime: '10:00',
    nextMethod: 'Call',
    nextReason: '',
  }
}

export function FollowUpModal({
  open,
  mode,
  lead,
  followUp,
  onClose,
  onSchedule,
  onComplete,
}: FollowUpModalProps) {
  const [schedule, setSchedule] = useState<FollowUpScheduleValues>(defaultSchedule)
  const [completion, setCompletion] = useState<FollowUpCompletionValues>(blankCompletion)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setSchedule(defaultSchedule())
    setCompletion(blankCompletion())
    setErrors({})
  }, [open, lead?.id, followUp?.id])

  if (!lead) return null

  const submitSchedule = () => {
    const next: Record<string, string> = {}
    if (!schedule.dueDate) next.dueDate = 'Choose the follow-up date.'
    if (!schedule.dueTime) next.dueTime = 'Choose the follow-up time.'
    if (!schedule.reason.trim()) next.reason = 'Record why this follow-up is needed.'
    const due = schedule.dueDate ? new Date(`${schedule.dueDate}T${schedule.dueTime || '10:00'}:00`) : null
    if (due && due.getTime() < new Date().setHours(0, 0, 0, 0)) {
      next.dueDate = 'Choose today or a future date. Past dates would be created as overdue.'
    }
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSchedule({ ...schedule, reason: schedule.reason.trim() })
  }

  const submitCompletion = () => {
    const next: Record<string, string> = {}
    if (!completion.outcome.trim()) next.outcome = 'Record the outcome of this conversation.'
    if (completion.updatedBudget.trim() && (Number.isNaN(Number(completion.updatedBudget)) || Number(completion.updatedBudget) < 0)) {
      next.updatedBudget = 'Enter a valid budget amount.'
    }
    if (completion.nextDate && !completion.nextReason.trim()) {
      next.nextReason = 'Record why another follow-up is needed.'
    }
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onComplete({ ...completion, outcome: completion.outcome.trim() })
  }

  if (mode === 'complete') {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Complete follow-up"
        description={`${lead.name} · ${lead.company || 'No company'}`}
        size="wide"
        footer={
          <>
            <span className="lead-form__footer-note"><Info size={13} /> Saved locally — no call, message or reminder is sent.</span>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="success" icon={<CheckCircle2 size={14} />} onClick={submitCompletion}>
              Mark completed
            </Button>
          </>
        }
      >
        <div className="stack-16">
          <div className="lead-followup-modal__due">
            <span className="lead-followup-modal__due-icon"><CalendarClock size={17} /></span>
            <div>
              <p className="lead-followup-modal__due-title">
                {followUp?.reason || 'Follow-up recorded on this lead'}
              </p>
              <p className="text-xs muted">
                {followUp ? `${followUp.method} · due ${formatDateTime(followUp.dueAt)}` : 'Due date not recorded'}
                {followUp?.isImplicit ? ' · created from the lead’s next follow-up date' : ''}
              </p>
            </div>
            <Badge tone="warning">Scheduled</Badge>
          </div>

          <div>
            <p className="form-section-title">Conversation outcome</p>
            <div className="form-grid">
              <Field label="Outcome" htmlFor="fu-outcome" required error={errors.outcome} className="full" hint="What was agreed, and what should the team remember?">
                <textarea
                  id="fu-outcome"
                  className="textarea"
                  rows={3}
                  value={completion.outcome}
                  onChange={(event) => { setCompletion((current) => ({ ...current, outcome: event.target.value })); setErrors((current) => ({ ...current, outcome: '' })) }}
                  placeholder="e.g. Customer confirmed interest and asked for a revised quote."
                  aria-invalid={Boolean(errors.outcome)}
                />
              </Field>
              <Field label="Latest customer response" htmlFor="fu-response">
                <input
                  id="fu-response"
                  className="input"
                  value={completion.latestResponse}
                  onChange={(event) => setCompletion((current) => ({ ...current, latestResponse: event.target.value }))}
                  placeholder="e.g. Positive, wants to compare one more option"
                />
              </Field>
              <Field label="Purchase readiness" htmlFor="fu-readiness">
                <input
                  id="fu-readiness"
                  className="input"
                  value={completion.purchaseReadiness}
                  onChange={(event) => setCompletion((current) => ({ ...current, purchaseReadiness: event.target.value }))}
                  placeholder="e.g. Ready to receive a proposal"
                />
              </Field>
              <Field label="New requirements" htmlFor="fu-new-requirements" className="full">
                <textarea
                  id="fu-new-requirements"
                  className="textarea"
                  rows={2}
                  value={completion.newRequirements}
                  onChange={(event) => setCompletion((current) => ({ ...current, newRequirements: event.target.value }))}
                  placeholder="Anything new the customer asked for"
                />
              </Field>
              <Field label="Concerns or objections" htmlFor="fu-concerns" className="full">
                <textarea
                  id="fu-concerns"
                  className="textarea"
                  rows={2}
                  value={completion.concerns}
                  onChange={(event) => setCompletion((current) => ({ ...current, concerns: event.target.value }))}
                  placeholder="Budget, timing, approvals or other blockers"
                />
              </Field>
              <Field label="Updated budget (INR)" htmlFor="fu-budget" error={errors.updatedBudget}>
                <input
                  id="fu-budget"
                  className="input"
                  type="number"
                  min="0"
                  step="1000"
                  value={completion.updatedBudget}
                  onChange={(event) => { setCompletion((current) => ({ ...current, updatedBudget: event.target.value })); setErrors((current) => ({ ...current, updatedBudget: '' })) }}
                  placeholder="If the budget changed"
                  aria-invalid={Boolean(errors.updatedBudget)}
                />
              </Field>
              <Field label="Agreed next steps" htmlFor="fu-next-steps" className="full">
                <textarea
                  id="fu-next-steps"
                  className="textarea"
                  rows={2}
                  value={completion.agreedNextSteps}
                  onChange={(event) => setCompletion((current) => ({ ...current, agreedNextSteps: event.target.value }))}
                  placeholder="e.g. Send proposal by Friday and review with the project team"
                />
              </Field>
            </div>
          </div>

          <div className="card card--pad-sm">
            <p className="form-section-title">Schedule the next follow-up</p>
            <p className="text-xs muted" style={{ marginBottom: 12 }}>
              Optional. If you leave the date blank, the lead is left without a next follow-up.
            </p>
            <div className="form-grid">
              <Field label="Next date" htmlFor="fu-next-date">
                <input
                  id="fu-next-date"
                  className="input"
                  type="date"
                  value={completion.nextDate}
                  onChange={(event) => setCompletion((current) => ({ ...current, nextDate: event.target.value }))}
                />
              </Field>
              <Field label="Next time" htmlFor="fu-next-time">
                <input
                  id="fu-next-time"
                  className="input"
                  type="time"
                  value={completion.nextTime}
                  onChange={(event) => setCompletion((current) => ({ ...current, nextTime: event.target.value }))}
                />
              </Field>
              <Field label="Next method" htmlFor="fu-next-method">
                <select
                  id="fu-next-method"
                  className="select"
                  value={completion.nextMethod}
                  onChange={(event) => setCompletion((current) => ({ ...current, nextMethod: event.target.value as LeadFollowUp['method'] }))}
                >
                  {FOLLOW_UP_METHODS.map((method) => <option key={method}>{method}</option>)}
                </select>
              </Field>
              <Field label="Next reason" htmlFor="fu-next-reason" error={errors.nextReason}>
                <input
                  id="fu-next-reason"
                  className="input"
                  value={completion.nextReason}
                  onChange={(event) => { setCompletion((current) => ({ ...current, nextReason: event.target.value })); setErrors((current) => ({ ...current, nextReason: '' })) }}
                  placeholder="e.g. Review revised proposal"
                  aria-invalid={Boolean(errors.nextReason)}
                />
              </Field>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule a follow-up"
      description={`${lead.name} · ${lead.company || 'No company'}`}
      size="md"
      footer={
        <>
          <span className="lead-form__footer-note"><Info size={13} /> Reminders are recorded only; no notification is sent.</span>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<MessageSquarePlus size={14} />} onClick={submitSchedule}>
            Schedule follow-up
          </Button>
        </>
      }
    >
      <div className="stack-14">
        <div className="lead-followup-modal__lead">
          <div>
            <p className="text-xs muted">Next contact will be added to</p>
            <p className="text-sm font-semibold">{lead.name} · {lead.company || 'No company'}</p>
          </div>
          {lead.nextFollowUp ? (
            <Badge tone="warning">Currently {formatDate(lead.nextFollowUp)}</Badge>
          ) : (
            <Badge tone="neutral">No follow-up scheduled</Badge>
          )}
        </div>
        <div className="form-grid">
          <Field label="Date" htmlFor="fu-date" required error={errors.dueDate}>
            <input
              id="fu-date"
              className="input"
              type="date"
              value={schedule.dueDate}
              onChange={(event) => { setSchedule((current) => ({ ...current, dueDate: event.target.value })); setErrors((current) => ({ ...current, dueDate: '' })) }}
              aria-invalid={Boolean(errors.dueDate)}
            />
          </Field>
          <Field label="Time" htmlFor="fu-time" required error={errors.dueTime}>
            <input
              id="fu-time"
              className="input"
              type="time"
              value={schedule.dueTime}
              onChange={(event) => { setSchedule((current) => ({ ...current, dueTime: event.target.value })); setErrors((current) => ({ ...current, dueTime: '' })) }}
              aria-invalid={Boolean(errors.dueTime)}
            />
          </Field>
          <Field label="Method" htmlFor="fu-method">
            <select
              id="fu-method"
              className="select"
              value={schedule.method}
              onChange={(event) => setSchedule((current) => ({ ...current, method: event.target.value as LeadFollowUp['method'] }))}
            >
              {FOLLOW_UP_METHODS.map((method) => <option key={method}>{method}</option>)}
            </select>
          </Field>
          <Field label="Reminder" htmlFor="fu-reminder" hint="Stored on the follow-up record for reference only.">
            <select
              id="fu-reminder"
              className="select"
              value={schedule.reminder}
              onChange={(event) => setSchedule((current) => ({ ...current, reminder: event.target.value }))}
            >
              {REMINDERS.map((reminder) => <option key={reminder.value} value={reminder.value}>{reminder.label}</option>)}
            </select>
          </Field>
          <Field label="Reason for this follow-up" htmlFor="fu-reason" required error={errors.reason} className="full">
            <textarea
              id="fu-reason"
              className="textarea"
              rows={3}
              value={schedule.reason}
              onChange={(event) => { setSchedule((current) => ({ ...current, reason: event.target.value })); setErrors((current) => ({ ...current, reason: '' })) }}
              placeholder="e.g. Review the revised quote and confirm the implementation date"
              aria-invalid={Boolean(errors.reason)}
            />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
