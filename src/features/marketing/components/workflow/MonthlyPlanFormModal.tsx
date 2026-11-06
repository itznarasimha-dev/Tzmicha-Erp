import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Plus, Trash2 } from 'lucide-react'
import type { MonthlyPlan, MonthlyPlanDraft, PlanActivity } from '../../types/workflow'
import { MARKETING_ACTIVITY_TYPES, type MarketingActivityType } from '../../types/workflow'
import { workflowDateInMonth, workflowMonthLabel, workflowToday } from '../../data/marketing/roleWorkflow'
import { formatINR } from '../../utils/format'
import { Button } from '../ui/Button'
import { Field, FormSection } from '../ui/Form'
import { Modal } from '../ui/Modal'

interface MonthlyPlanFormModalProps {
  open: boolean
  plan?: MonthlyPlan | null
  monthOptions: string[]
  reviewerOptions: { id: string; name: string }[]
  defaultReviewerId: string | null
  showReviewer: boolean
  onClose: () => void
  onSave: (draft: MonthlyPlanDraft) => boolean
}

interface FormState {
  title: string
  month: string
  objective: string
  targetAudience: string
  plannedActivities: string
  expectedLeads: string
  expectedConversions: string
  monthlyTarget: string
  estimatedBudget: string
  requestedAmount: string
  expectedOutcome: string
  startDate: string
  endDate: string
  supportingNotes: string
  seniorReviewerId: string
  activities: PlanActivity[]
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function lastDayOf(month: string): number {
  const [year, value] = month.split('-').map(Number)
  return new Date(year, value || 1, 0).getDate()
}

function blankActivity(month: string, index: number): PlanActivity {
  return {
    id: `draft-act-${Date.now().toString(36)}-${index}`,
    type: 'Digital Marketing',
    name: '',
    objective: '',
    targetAudience: '',
    plannedActivities: '',
    expectedLeads: 0,
    expectedConversions: 0,
    monthlyTarget: 0,
    estimatedBudget: 0,
    expectedOutcome: '',
    startDate: workflowDateInMonth(month, 1),
    endDate: workflowDateInMonth(month, lastDayOf(month)),
    supportingNotes: '',
  }
}

function fromPlan(
  plan: MonthlyPlan | null | undefined,
  monthOptions: string[],
  defaultReviewerId: string | null,
): FormState {
  const month = plan?.month ?? monthOptions[0] ?? currentMonth()
  if (!plan) {
    return {
      title: '',
      month,
      objective: '',
      targetAudience: '',
      plannedActivities: '',
      expectedLeads: '',
      expectedConversions: '',
      monthlyTarget: '',
      estimatedBudget: '',
      requestedAmount: '',
      expectedOutcome: '',
      startDate: workflowDateInMonth(month, 1),
      endDate: workflowDateInMonth(month, lastDayOf(month)),
      supportingNotes: '',
      seniorReviewerId: defaultReviewerId ?? '',
      activities: [blankActivity(month, 1)],
    }
  }
  return {
    title: plan.title,
    month: plan.month,
    objective: plan.objective,
    targetAudience: plan.targetAudience,
    plannedActivities: plan.plannedActivities,
    expectedLeads: String(plan.expectedLeads || ''),
    expectedConversions: String(plan.expectedConversions || ''),
    monthlyTarget: String(plan.monthlyTarget || ''),
    estimatedBudget: String(plan.estimatedBudget || ''),
    requestedAmount: String(plan.requestedAmount || ''),
    expectedOutcome: plan.expectedOutcome,
    startDate: plan.startDate,
    endDate: plan.endDate,
    supportingNotes: plan.supportingNotes,
    seniorReviewerId: plan.seniorReviewerId ?? '',
    activities: plan.activities.length
      ? plan.activities.map((activity) => ({ ...activity }))
      : [blankActivity(plan.month, 1)],
  }
}

const toNumber = (value: string): number => Math.max(0, Math.round(Number(value) || 0))

export function MonthlyPlanFormModal({
  open,
  plan,
  monthOptions,
  reviewerOptions,
  defaultReviewerId,
  showReviewer,
  onClose,
  onSave,
}: MonthlyPlanFormModalProps) {
  const [form, setForm] = useState<FormState>(() => fromPlan(plan, monthOptions, defaultReviewerId))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(fromPlan(plan, monthOptions, defaultReviewerId))
    setError('')
  }, [open, plan, monthOptions, defaultReviewerId])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const updateActivity = (id: string, patch: Partial<PlanActivity>) => {
    setForm((current) => ({
      ...current,
      activities: current.activities.map((activity) =>
        activity.id === id ? { ...activity, ...patch } : activity,
      ),
    }))
  }

  const addActivity = () => {
    setForm((current) => ({
      ...current,
      activities: [...current.activities, blankActivity(current.month, current.activities.length + 1)],
    }))
  }

  const removeActivity = (id: string) => {
    setForm((current) => ({
      ...current,
      activities: current.activities.filter((activity) => activity.id !== id),
    }))
  }

  const monthChanged = (month: string) => {
    setForm((current) => ({
      ...current,
      month,
      startDate: current.startDate || workflowDateInMonth(month, 1),
      endDate: current.endDate || workflowDateInMonth(month, lastDayOf(month)),
    }))
  }

  const activityTotal = useMemo(
    () => form.activities.reduce((sum, activity) => sum + (Number(activity.estimatedBudget) || 0), 0),
    [form.activities],
  )

  const submit = () => {
    if (!form.title.trim()) return setError('Add a clear plan title.')
    if (!form.month) return setError('Select the plan month.')
    if (!form.objective.trim()) return setError('Describe the monthly objective.')
    if (!form.activities.length) return setError('Add at least one marketing activity.')
    if (form.activities.some((activity) => !activity.name.trim())) {
      return setError('Every activity needs a name.')
    }
    if (form.activities.some((activity) => !activity.objective.trim())) {
      return setError('Every activity needs an objective.')
    }
    if (toNumber(form.estimatedBudget) <= 0) return setError('Enter an estimated budget greater than zero.')

    const draft: MonthlyPlanDraft = {
      title: form.title.trim(),
      month: form.month,
      objective: form.objective.trim(),
      targetAudience: form.targetAudience.trim(),
      plannedActivities: form.plannedActivities.trim(),
      expectedLeads: toNumber(form.expectedLeads),
      expectedConversions: toNumber(form.expectedConversions),
      monthlyTarget: toNumber(form.monthlyTarget) || toNumber(form.expectedLeads),
      estimatedBudget: toNumber(form.estimatedBudget),
      requestedAmount: toNumber(form.requestedAmount) || toNumber(form.estimatedBudget),
      expectedOutcome: form.expectedOutcome.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      supportingNotes: form.supportingNotes.trim(),
      seniorReviewerId: form.seniorReviewerId || null,
      activities: form.activities.map((activity) => ({
        ...activity,
        name: activity.name.trim(),
        objective: activity.objective.trim(),
        targetAudience: activity.targetAudience.trim(),
        plannedActivities: activity.plannedActivities.trim(),
        expectedOutcome: activity.expectedOutcome.trim(),
        supportingNotes: activity.supportingNotes.trim(),
        expectedLeads: toNumber(String(activity.expectedLeads)),
        expectedConversions: toNumber(String(activity.expectedConversions)),
        monthlyTarget: toNumber(String(activity.monthlyTarget)) || toNumber(String(activity.expectedLeads)),
        estimatedBudget: toNumber(String(activity.estimatedBudget)),
      })),
    }
    if (onSave(draft)) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={plan ? 'Edit monthly plan' : 'Create monthly plan'}
      description={
        plan
          ? `Revise ${plan.title}. Changes requested plans restart at the first approval stage when resubmitted.`
          : 'Plan one month of marketing activity. Submitting starts the role-based approval workflow.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<CalendarRange size={14} />} onClick={submit}>
            {plan ? 'Save changes' : 'Save draft plan'}
          </Button>
        </>
      }
    >
      <div className="wf-form">
        {error ? <div className="callout callout--warning" role="alert">{error}</div> : null}

        <FormSection title="Plan details" />
        <div className="wf-form__grid">
          <Field label="Plan title" htmlFor="wf-plan-title" required className="wf-form__span-2">
            <input
              id="wf-plan-title"
              className="input"
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="e.g. October SmartHome demand plan"
            />
          </Field>
          <Field label="Plan month" htmlFor="wf-plan-month" required>
            <select
              id="wf-plan-month"
              className="select"
              value={form.month}
              onChange={(event) => monthChanged(event.target.value)}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>{workflowMonthLabel(month)}</option>
              ))}
            </select>
          </Field>
          {showReviewer ? (
            <Field
              label="Senior reviewer"
              htmlFor="wf-plan-reviewer"
              hint="Junior plans go to a senior reviewer when assigned; otherwise they route directly to the Manager."
            >
              <select
                id="wf-plan-reviewer"
                className="select"
                value={form.seniorReviewerId}
                onChange={(event) => set('seniorReviewerId', event.target.value)}
              >
                <option value="">No senior reviewer — route directly to Manager</option>
                {reviewerOptions.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Monthly target" htmlFor="wf-plan-target" hint="Used when expected leads is empty.">
            <input
              id="wf-plan-target"
              className="input"
              type="number"
              min={0}
              value={form.monthlyTarget}
              onChange={(event) => set('monthlyTarget', event.target.value)}
            />
          </Field>
          <Field label="Objective" htmlFor="wf-plan-objective" required className="wf-form__span-2">
            <textarea
              id="wf-plan-objective"
              className="textarea"
              rows={2}
              value={form.objective}
              onChange={(event) => set('objective', event.target.value)}
              placeholder="What should this month's marketing achieve?"
            />
          </Field>
          <Field label="Target audience" htmlFor="wf-plan-audience">
            <input
              id="wf-plan-audience"
              className="input"
              value={form.targetAudience}
              onChange={(event) => set('targetAudience', event.target.value)}
              placeholder="Customers, dealers, region…"
            />
          </Field>
          <Field label="Planned activities summary" htmlFor="wf-plan-summary">
            <input
              id="wf-plan-summary"
              className="input"
              value={form.plannedActivities}
              onChange={(event) => set('plannedActivities', event.target.value)}
              placeholder="Digital, field and trade activity"
            />
          </Field>
          <Field label="Expected leads" htmlFor="wf-plan-leads">
            <input
              id="wf-plan-leads"
              className="input"
              type="number"
              min={0}
              value={form.expectedLeads}
              onChange={(event) => set('expectedLeads', event.target.value)}
            />
          </Field>
          <Field label="Expected conversions" htmlFor="wf-plan-conversions">
            <input
              id="wf-plan-conversions"
              className="input"
              type="number"
              min={0}
              value={form.expectedConversions}
              onChange={(event) => set('expectedConversions', event.target.value)}
            />
          </Field>
          <Field
            label="Estimated budget"
            htmlFor="wf-plan-budget"
            required
            hint={activityTotal > 0 ? `Activity lines total ${formatINR(activityTotal)}.` : undefined}
          >
            <input
              id="wf-plan-budget"
              className="input"
              type="number"
              min={0}
              value={form.estimatedBudget}
              onChange={(event) => set('estimatedBudget', event.target.value)}
            />
          </Field>
          <Field label="Requested amount" htmlFor="wf-plan-requested" hint="Defaults to the estimated budget.">
            <input
              id="wf-plan-requested"
              className="input"
              type="number"
              min={0}
              value={form.requestedAmount}
              onChange={(event) => set('requestedAmount', event.target.value)}
            />
          </Field>
          <Field label="Start date" htmlFor="wf-plan-start">
            <input
              id="wf-plan-start"
              className="input"
              type="date"
              value={form.startDate}
              onChange={(event) => set('startDate', event.target.value)}
            />
          </Field>
          <Field label="End date" htmlFor="wf-plan-end">
            <input
              id="wf-plan-end"
              className="input"
              type="date"
              value={form.endDate}
              onChange={(event) => set('endDate', event.target.value)}
            />
          </Field>
          <Field label="Expected outcome" htmlFor="wf-plan-outcome" className="wf-form__span-2">
            <textarea
              id="wf-plan-outcome"
              className="textarea"
              rows={2}
              value={form.expectedOutcome}
              onChange={(event) => set('expectedOutcome', event.target.value)}
              placeholder="Measurable outcome for the month"
            />
          </Field>
          <Field label="Supporting notes" htmlFor="wf-plan-notes" className="wf-form__span-2">
            <textarea
              id="wf-plan-notes"
              className="textarea"
              rows={2}
              value={form.supportingNotes}
              onChange={(event) => set('supportingNotes', event.target.value)}
              placeholder="Assumptions, dependencies or approvals already in place"
            />
          </Field>
        </div>

        <div className="wf-form__section-head">
          <div>
            <FormSection title="Marketing activities" />
            <p className="text-xs muted">Each activity carries its own budget, audience and target.</p>
          </div>
          <Button variant="soft" size="sm" icon={<Plus size={13} />} onClick={addActivity}>
            Add activity
          </Button>
        </div>

        <div className="wf-activity-list">
          {form.activities.map((activity, index) => (
            <div key={activity.id} className="wf-activity">
              <div className="wf-activity__head">
                <div>
                  <p className="wf-activity__title">Activity {index + 1}</p>
                  <p className="text-xs muted">{activity.type} · {formatINR(Number(activity.estimatedBudget) || 0)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  icon={<Trash2 size={13} />}
                  onClick={() => removeActivity(activity.id)}
                  disabled={form.activities.length === 1}
                  aria-label={`Remove activity ${index + 1}`}
                >
                  Remove
                </Button>
              </div>
              <div className="wf-form__grid">
                <Field label="Activity type" htmlFor={`${activity.id}-type`}>
                  <select
                    id={`${activity.id}-type`}
                    className="select"
                    value={activity.type}
                    onChange={(event) =>
                      updateActivity(activity.id, { type: event.target.value as MarketingActivityType })
                    }
                  >
                    {MARKETING_ACTIVITY_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label="Activity name" htmlFor={`${activity.id}-name`} required>
                  <input
                    id={`${activity.id}-name`}
                    className="input"
                    value={activity.name}
                    onChange={(event) => updateActivity(activity.id, { name: event.target.value })}
                    placeholder="e.g. Festive paid social campaign"
                  />
                </Field>
                <Field label="Objective" htmlFor={`${activity.id}-objective`} required className="wf-form__span-2">
                  <input
                    id={`${activity.id}-objective`}
                    className="input"
                    value={activity.objective}
                    onChange={(event) => updateActivity(activity.id, { objective: event.target.value })}
                    placeholder="What this activity should achieve"
                  />
                </Field>
                <Field label="Expected leads" htmlFor={`${activity.id}-leads`}>
                  <input
                    id={`${activity.id}-leads`}
                    className="input"
                    type="number"
                    min={0}
                    value={activity.expectedLeads || ''}
                    onChange={(event) =>
                      updateActivity(activity.id, { expectedLeads: Number(event.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Expected conversions" htmlFor={`${activity.id}-conversions`}>
                  <input
                    id={`${activity.id}-conversions`}
                    className="input"
                    type="number"
                    min={0}
                    value={activity.expectedConversions || ''}
                    onChange={(event) =>
                      updateActivity(activity.id, { expectedConversions: Number(event.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Estimated budget" htmlFor={`${activity.id}-budget`}>
                  <input
                    id={`${activity.id}-budget`}
                    className="input"
                    type="number"
                    min={0}
                    value={activity.estimatedBudget || ''}
                    onChange={(event) =>
                      updateActivity(activity.id, { estimatedBudget: Number(event.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Monthly target" htmlFor={`${activity.id}-target`}>
                  <input
                    id={`${activity.id}-target`}
                    className="input"
                    type="number"
                    min={0}
                    value={activity.monthlyTarget || ''}
                    onChange={(event) =>
                      updateActivity(activity.id, { monthlyTarget: Number(event.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Start date" htmlFor={`${activity.id}-start`}>
                  <input
                    id={`${activity.id}-start`}
                    className="input"
                    type="date"
                    value={activity.startDate}
                    onChange={(event) => updateActivity(activity.id, { startDate: event.target.value })}
                  />
                </Field>
                <Field label="End date" htmlFor={`${activity.id}-end`}>
                  <input
                    id={`${activity.id}-end`}
                    className="input"
                    type="date"
                    value={activity.endDate}
                    onChange={(event) => updateActivity(activity.id, { endDate: event.target.value })}
                  />
                </Field>
              </div>
              <details className="wf-activity__more">
                <summary>Audience, plan and expected outcome</summary>
                <div className="wf-form__grid">
                  <Field label="Target audience" htmlFor={`${activity.id}-audience`}>
                    <input
                      id={`${activity.id}-audience`}
                      className="input"
                      value={activity.targetAudience}
                      onChange={(event) => updateActivity(activity.id, { targetAudience: event.target.value })}
                    />
                  </Field>
                  <Field label="Planned activities" htmlFor={`${activity.id}-planned`}>
                    <input
                      id={`${activity.id}-planned`}
                      className="input"
                      value={activity.plannedActivities}
                      onChange={(event) => updateActivity(activity.id, { plannedActivities: event.target.value })}
                    />
                  </Field>
                  <Field label="Expected outcome" htmlFor={`${activity.id}-outcome`} className="wf-form__span-2">
                    <input
                      id={`${activity.id}-outcome`}
                      className="input"
                      value={activity.expectedOutcome}
                      onChange={(event) => updateActivity(activity.id, { expectedOutcome: event.target.value })}
                    />
                  </Field>
                  <Field label="Supporting notes" htmlFor={`${activity.id}-notes`} className="wf-form__span-2">
                    <input
                      id={`${activity.id}-notes`}
                      className="input"
                      value={activity.supportingNotes}
                      onChange={(event) => updateActivity(activity.id, { supportingNotes: event.target.value })}
                    />
                  </Field>
                </div>
              </details>
            </div>
          ))}
        </div>

        <div className="callout callout--info">
          <span>
            Today is {workflowToday()}. Plan approval does not approve expenses. Save as a draft first, then submit it to
            start the Senior review (when assigned) → Manager → Admin financial authorization (when required) routing.
          </span>
        </div>
      </div>
    </Modal>
  )
}
