import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarRange,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Pencil,
  Play,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import type { MonthlyPlan } from '../../types/workflow'
import { workflowMonthLabel } from '../../data/marketing/roleWorkflow'
import { useWorkflow, type ExecutionUpdateInput } from '../../hooks/useWorkflow'
import {
  canDecidePlan,
  canEditPlan,
  canReviewPlanResults,
  canStartExecution,
  canSubmitPlan,
  canUpdateExecution,
  employeeNameById,
  isPlanAwaitingAdmin,
  planExecutionProgress,
  planLeadAchievement,
  planStageStates,
} from '../../utils/workflow'
import { formatDate, formatDateTime, formatINR, formatNumber, formatPercent } from '../../utils/format'
import { Badge, StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Field } from '../ui/Form'
import { Modal } from '../ui/Modal'
import { ProgressBar, utilisationTone } from '../ui/ProgressBar'
import { WorkflowTimeline } from './WorkflowTimeline'

interface PlanDetailModalProps {
  planId: string
  onClose: () => void
  onEdit?: (plan: MonthlyPlan) => void
}

interface ExecutionForm {
  completedActivities: string
  actualLeads: string
  qualifiedLeads: string
  completedFieldVisits: string
  tradePartnerVisits: string
  actualSpending: string
  executionPercent: string
  results: string
  remarks: string
}

function executionForm(plan: MonthlyPlan): ExecutionForm {
  return {
    completedActivities: String(plan.execution.completedActivities || ''),
    actualLeads: String(plan.execution.actualLeads || ''),
    qualifiedLeads: String(plan.execution.qualifiedLeads || ''),
    completedFieldVisits: String(plan.execution.completedFieldVisits || ''),
    tradePartnerVisits: String(plan.execution.tradePartnerVisits || ''),
    actualSpending: String(plan.execution.actualSpending || ''),
    executionPercent: String(plan.execution.executionPercent || ''),
    results: plan.execution.results,
    remarks: plan.execution.remarks,
  }
}

const toNumber = (value: string): number => Math.max(0, Math.round(Number(value) || 0))

export function PlanDetailModal({ planId, onClose, onEdit }: PlanDetailModalProps) {
  const {
    plans,
    config,
    roleId,
    profile,
    submitPlan,
    approvePlan,
    requestPlanChanges,
    rejectPlan,
    startExecution,
    updateExecution,
    reviewResults,
    simulateAdminPlanDecision,
  } = useWorkflow()
  const plan = plans.find((item) => item.id === planId) ?? null
  const [note, setNote] = useState('')
  const [exec, setExec] = useState<ExecutionForm | null>(plan ? executionForm(plan) : null)

  useEffect(() => {
    if (!plan) return
    setExec(executionForm(plan))
    setNote('')
  }, [plan?.id, plan?.execution.updatedAt, plan?.status])

  const stages = useMemo(() => (plan ? planStageStates(plan, config) : []), [plan, config])

  if (!plan) return null

  const canEdit = canEditPlan(plan, profile)
  const canSubmit = canSubmitPlan(plan, profile)
  const canDecide = canDecidePlan(plan, roleId, profile)
  const canReview = canReviewPlanResults(plan, roleId)
  const canStart = canStartExecution(plan, profile)
  const canUpdate = canUpdateExecution(plan, profile)
  const awaitingAdmin = isPlanAwaitingAdmin(plan)
  const progress = planExecutionProgress(plan)
  const achievement = planLeadAchievement(plan)

  const setExecution = (key: keyof ExecutionForm, value: string) => {
    setExec((current) => (current ? { ...current, [key]: value } : current))
  }

  const executionInput = (): ExecutionUpdateInput => ({
    completedActivities: toNumber(exec?.completedActivities ?? ''),
    actualLeads: toNumber(exec?.actualLeads ?? ''),
    qualifiedLeads: toNumber(exec?.qualifiedLeads ?? ''),
    completedFieldVisits: toNumber(exec?.completedFieldVisits ?? ''),
    tradePartnerVisits: toNumber(exec?.tradePartnerVisits ?? ''),
    actualSpending: toNumber(exec?.actualSpending ?? ''),
    executionPercent: Math.min(100, toNumber(exec?.executionPercent ?? '')),
    results: exec?.results ?? '',
    remarks: exec?.remarks ?? '',
  })

  const primaryActions = (
    <div className="wf-action-panel">
      {canSubmit || canEdit ? (
        <div className="wf-action-panel__row">
          <div>
            <p className="wf-action-panel__title">Plan owner actions</p>
            <p className="text-xs muted">
              {plan.status === 'Draft'
                ? 'Submit the draft to start the approval chain.'
                : 'Revise the plan and resubmit it. Approval restarts at the first required stage.'}
            </p>
          </div>
          <div className="row-8 wrap">
            {canEdit && onEdit ? (
              <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => onEdit(plan)}>
                Edit plan
              </Button>
            ) : null}
            {canSubmit ? (
              <Button variant="primary" size="sm" icon={<Send size={13} />} onClick={() => submitPlan(plan.id)}>
                {plan.status === 'Draft' ? 'Submit plan' : 'Resubmit plan'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {canDecide ? (
        <div className="wf-decision">
          <div className="wf-decision__head">
            <div>
              <p className="wf-action-panel__title">Approval decision</p>
              <p className="text-xs muted">
                {plan.status === 'Pending Senior Review'
                  ? 'Senior review forwards the plan to the Marketing Manager.'
                  : plan.financeRequired
                    ? 'Approving forwards the plan to the existing Admin Dashboard for financial authorization.'
                    : 'Approving completes the approval chain and makes the plan ready to execute.'}
              </p>
            </div>
            <Badge tone="warning">Action required</Badge>
          </div>
          <Field label="Decision note" htmlFor="wf-plan-note" hint="Required when requesting changes or rejecting.">
            <textarea
              id="wf-plan-note"
              className="textarea"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add context for the plan owner or the next approver"
            />
          </Field>
          <div className="row-8 wrap">
            <Button variant="success" size="sm" icon={<BadgeCheck size={13} />} onClick={() => approvePlan(plan.id, note)}>
              {plan.status === 'Pending Senior Review' ? 'Approve & forward' : 'Approve'}
            </Button>
            <Button variant="soft" size="sm" icon={<CircleAlert size={13} />} onClick={() => requestPlanChanges(plan.id, note)}>
              Request changes
            </Button>
            <Button variant="outline-danger" size="sm" icon={<XCircle size={13} />} onClick={() => rejectPlan(plan.id, note)}>
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      {canStart ? (
        <div className="wf-action-panel__row">
          <div>
            <p className="wf-action-panel__title">Ready to execute</p>
            <p className="text-xs muted">All required approvals are complete. Start execution when activity begins.</p>
          </div>
          <Button variant="primary" size="sm" icon={<Play size={13} />} onClick={() => startExecution(plan.id)}>
            Start execution
          </Button>
        </div>
      ) : null}

      {canReview ? (
        <div className="wf-decision">
          <div className="wf-decision__head">
            <div>
              <p className="wf-action-panel__title">Results review</p>
              <p className="text-xs muted">Review the owner's submitted results and close the monthly plan.</p>
            </div>
            <Badge tone="warning">Results submitted</Badge>
          </div>
          <Field label="Review note" htmlFor="wf-results-note" hint="Required when requesting a results revision.">
            <textarea id="wf-results-note" className="textarea" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <div className="row-8 wrap">
            <Button variant="success" size="sm" icon={<BadgeCheck size={13} />} onClick={() => reviewResults(plan.id, 'complete', note)}>
              Complete plan
            </Button>
            <Button variant="soft" size="sm" icon={<CircleAlert size={13} />} onClick={() => reviewResults(plan.id, 'revision', note)}>
              Request revision
            </Button>
          </div>
        </div>
      ) : null}

      {!canSubmit && !canEdit && !canDecide && !canStart && !canUpdate && !canReview && !awaitingAdmin ? (
        <p className="empty-inline">
          No action is available for {profile.name} at this stage. Switch the preview role to continue the workflow.
        </p>
      ) : null}
    </div>
  )

  const executionPanel = canUpdate && exec ? (
    <div className="wf-action-panel">
      <div className="wf-execution">
        <div className="wf-decision__head">
          <div>
            <p className="wf-action-panel__title">Execution update</p>
            <p className="text-xs muted">Record actual activity, leads and spend for this monthly plan.</p>
          </div>
          <Badge tone="accent">In progress</Badge>
        </div>
        <div className="wf-form__grid wf-form__grid--tight">
          <Field label="Completed activities" htmlFor="wf-exec-completed">
            <input id="wf-exec-completed" className="input" type="number" min={0} value={exec.completedActivities} onChange={(event) => setExecution('completedActivities', event.target.value)} />
          </Field>
          <Field label="Execution progress %" htmlFor="wf-exec-progress">
            <input id="wf-exec-progress" className="input" type="number" min={0} max={100} value={exec.executionPercent} onChange={(event) => setExecution('executionPercent', event.target.value)} />
          </Field>
          <Field label="Actual leads" htmlFor="wf-exec-leads">
            <input id="wf-exec-leads" className="input" type="number" min={0} value={exec.actualLeads} onChange={(event) => setExecution('actualLeads', event.target.value)} />
          </Field>
          <Field label="Qualified leads" htmlFor="wf-exec-qualified">
            <input id="wf-exec-qualified" className="input" type="number" min={0} value={exec.qualifiedLeads} onChange={(event) => setExecution('qualifiedLeads', event.target.value)} />
          </Field>
          <Field label="Field visits" htmlFor="wf-exec-visits">
            <input id="wf-exec-visits" className="input" type="number" min={0} value={exec.completedFieldVisits} onChange={(event) => setExecution('completedFieldVisits', event.target.value)} />
          </Field>
          <Field label="Trade partner visits" htmlFor="wf-exec-trade">
            <input id="wf-exec-trade" className="input" type="number" min={0} value={exec.tradePartnerVisits} onChange={(event) => setExecution('tradePartnerVisits', event.target.value)} />
          </Field>
          <Field label="Actual spending" htmlFor="wf-exec-spend">
            <input id="wf-exec-spend" className="input" type="number" min={0} value={exec.actualSpending} onChange={(event) => setExecution('actualSpending', event.target.value)} />
          </Field>
          <Field label="Remarks" htmlFor="wf-exec-remarks">
            <input id="wf-exec-remarks" className="input" value={exec.remarks} onChange={(event) => setExecution('remarks', event.target.value)} />
          </Field>
          <Field label="Results summary" htmlFor="wf-exec-results" className="wf-form__span-2" hint="Required before submitting results for review.">
            <textarea id="wf-exec-results" className="textarea" rows={2} value={exec.results} onChange={(event) => setExecution('results', event.target.value)} />
          </Field>
        </div>
        <div className="row-8 wrap">
          <Button variant="soft" size="sm" onClick={() => updateExecution(plan.id, executionInput(), false)}>
            Save progress
          </Button>
          <Button variant="primary" size="sm" icon={<ClipboardCheck size={13} />} onClick={() => updateExecution(plan.id, executionInput(), true)}>
            Submit results for review
          </Button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={plan.title}
      description={`${workflowMonthLabel(plan.month)} · ${plan.employeeName} · ${plan.employeeRole}`}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="wf-detail">
        <div className="wf-detail__hero">
          <div className="wf-detail__hero-main">
            <StatusBadge status={plan.status} />
            <Badge tone={plan.financeRequired ? 'accent' : 'neutral'}>
              {plan.financeRequired ? `Admin authorization required · ${formatINR(config.financeThreshold)}+` : 'Admin authorization not required'}
            </Badge>
            {plan.currentApprover ? <span className="text-xs muted">With {plan.currentApprover}</span> : null}
          </div>
          <div className="wf-detail__hero-metrics">
            <span><strong>{formatINR(plan.estimatedBudget)}</strong><small>Estimated budget</small></span>
            <span><strong>{formatNumber(plan.expectedLeads || plan.monthlyTarget)}</strong><small>Target leads</small></span>
            <span><strong>{formatPercent(achievement)}</strong><small>Lead achievement</small></span>
            <span><strong>{formatPercent(progress, 0)}</strong><small>Execution</small></span>
          </div>
        </div>

        {plan.revisionReason ? (
          <div className="callout callout--warning">
            <CircleAlert size={14} />
            <span><strong>Revision note:</strong> {plan.revisionReason}</span>
          </div>
        ) : null}

        {primaryActions}
        {executionPanel}

        {awaitingAdmin ? (
          <div className="wf-admin-sim" role="region" aria-label="Admin financial authorization demo simulator">
            <div className="wf-decision__head">
              <div>
                <p className="wf-action-panel__title">
                  <ShieldCheck size={14} /> Admin financial authorization · demo simulator
                </p>
                <p className="text-xs muted">
                  This stage belongs to the existing Totally ERP Admin Dashboard. These buttons only simulate that
                  external decision locally so the demo workflow can continue. No Marketing role is approving this budget.
                </p>
              </div>
              <Badge tone="neutral">Demo only</Badge>
            </div>
            <Field
              label="Simulated Admin note"
              htmlFor="wf-admin-plan-note"
              hint="Required when simulating a rejection."
            >
              <textarea
                id="wf-admin-plan-note"
                className="textarea"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Budget authorized against the current quarter allocation (simulated)"
              />
            </Field>
            <div className="row-8 wrap">
              <Button
                variant="success"
                size="sm"
                icon={<BadgeCheck size={13} />}
                onClick={() => simulateAdminPlanDecision(plan.id, 'authorize', note)}
              >
                Simulate Admin authorization
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                icon={<XCircle size={13} />}
                onClick={() => simulateAdminPlanDecision(plan.id, 'reject', note)}
              >
                Simulate Admin rejection
              </Button>
            </div>
          </div>
        ) : null}

        {plan.adminAuthorization && plan.adminAuthorization.status !== 'Not required' ? (
          <div className={`callout ${plan.adminAuthorization.status === 'Rejected' ? 'callout--warning' : 'callout--info'}`}>
            <ShieldCheck size={14} />
            <span>
              <strong>Admin financial status: {plan.adminAuthorization.status}</strong>
              {plan.adminAuthorization.simulated ? ' · simulated locally in this demo' : ' · handled by the existing Admin Dashboard'}
              {plan.adminAuthorization.comments ? ` — ${plan.adminAuthorization.comments}` : ''}
            </span>
          </div>
        ) : null}

        <WorkflowTimeline stages={stages} label={`${plan.title} workflow`} />

        <div className="wf-detail__grid">
          <section className="wf-detail__block">
            <h4><FileText size={14} /> Plan summary</h4>
            <dl className="wf-detail__rows">
              <div><dt>Objective</dt><dd>{plan.objective || '—'}</dd></div>
              <div><dt>Target audience</dt><dd>{plan.targetAudience || '—'}</dd></div>
              <div><dt>Planned activities</dt><dd>{plan.plannedActivities || '—'}</dd></div>
              <div><dt>Expected outcome</dt><dd>{plan.expectedOutcome || '—'}</dd></div>
              <div><dt>Supporting notes</dt><dd>{plan.supportingNotes || '—'}</dd></div>
            </dl>
          </section>

          <section className="wf-detail__block">
            <h4><CalendarRange size={14} /> Plan facts</h4>
            <dl className="wf-detail__rows">
              <div><dt>Month</dt><dd>{workflowMonthLabel(plan.month)}</dd></div>
              <div><dt>Dates</dt><dd>{formatDate(plan.startDate)} → {formatDate(plan.endDate)}</dd></div>
              <div><dt>Expected leads / conversions</dt><dd>{formatNumber(plan.expectedLeads)} / {formatNumber(plan.expectedConversions)}</dd></div>
              <div><dt>Requested amount</dt><dd>{formatINR(plan.requestedAmount || plan.estimatedBudget)}</dd></div>
              <div><dt>Senior reviewer</dt><dd>{plan.seniorReviewerId ? employeeNameById(plan.seniorReviewerId) : 'Not assigned — routes to Manager'}</dd></div>
              <div><dt>Submitted</dt><dd>{plan.submittedAt ? formatDateTime(plan.submittedAt) : 'Not submitted'}</dd></div>
              <div><dt>Last updated</dt><dd>{formatDateTime(plan.updatedAt)}</dd></div>
            </dl>
          </section>
        </div>

        <section className="wf-detail__block">
          <h4><Target size={14} /> Activities</h4>
          <div className="wf-activity-view">
            {plan.activities.map((activity) => (
              <div key={activity.id} className="wf-activity-view__row">
                <div className="wf-activity-view__main">
                  <p className="cell-primary">{activity.name}</p>
                  <p className="text-xs muted">{activity.type} · {activity.objective || 'No objective recorded'}</p>
                  <p className="text-xs muted">{activity.targetAudience || 'No audience recorded'}</p>
                </div>
                <div className="wf-activity-view__stats">
                  <span><strong>{formatINR(activity.estimatedBudget)}</strong><small>Budget</small></span>
                  <span><strong>{formatNumber(activity.expectedLeads)}</strong><small>Leads</small></span>
                  <span><strong>{formatNumber(activity.actualLeads ?? 0)}</strong><small>Actual</small></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {plan.execution.startedAt || plan.execution.actualLeads > 0 || plan.execution.actualSpending > 0 ? (
          <section className="wf-detail__block">
            <h4><TrendingUp size={14} /> Execution and results</h4>
            <div className="wf-execution__metrics">
              <span><strong>{formatNumber(plan.execution.actualLeads)}</strong><small>Actual leads</small></span>
              <span><strong>{formatNumber(plan.execution.qualifiedLeads)}</strong><small>Qualified</small></span>
              <span><strong>{formatINR(plan.execution.actualSpending)}</strong><small>Actual spend</small></span>
              <span><strong>{formatNumber(plan.execution.completedActivities)}</strong><small>Activities done</small></span>
            </div>
            <ProgressBar value={progress} tone={progress === 0 ? 'brand' : utilisationTone(progress)} size="sm" label="Execution progress" showValue />
            {plan.execution.results ? (
              <p className="wf-detail__results"><strong>Results:</strong> {plan.execution.results}</p>
            ) : null}
            {plan.execution.remarks ? (
              <p className="wf-detail__results"><strong>Remarks:</strong> {plan.execution.remarks}</p>
            ) : null}
          </section>
        ) : null}

        <section className="wf-detail__block">
          <h4><CircleDollarSign size={14} /> Approval history</h4>
          {plan.approvals.length === 0 ? (
            <p className="empty-inline">No approval activity yet. Submit the plan to start the audit trail.</p>
          ) : (
            <ol className="wf-history">
              {[...plan.approvals].reverse().map((entry) => (
                <li key={entry.id} className="wf-history__item">
                  <span className={`wf-history__dot wf-history__dot--${entry.decision.toLowerCase().replace(/\s+/g, '-')}`} aria-hidden="true" />
                  <div>
                    <p className="wf-history__title">
                      {entry.action} · <span>{entry.byName}</span>
                    </p>
                    <p className="text-xs muted">{entry.stage} · {formatDateTime(entry.at)}</p>
                    {entry.comments ? <p className="wf-history__note">{entry.comments}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

      </div>
    </Modal>
  )
}
