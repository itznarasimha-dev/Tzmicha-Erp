import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CircleAlert,
  FileText,
  Pencil,
  ReceiptText,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import type { MarketingExpenseRequest } from '../../types/workflow'
import { useWorkflow } from '../../hooks/useWorkflow'
import {
  canDecideExpense,
  canEditExpense,
  canSubmitExpense,
  expenseDecisionStage,
  expenseStageStates,
  isExpenseAwaitingAdmin,
} from '../../utils/workflow'
import { formatDate, formatDateTime, formatINR } from '../../utils/format'
import { Badge, StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Field } from '../ui/Form'
import { Modal } from '../ui/Modal'
import { WorkflowTimeline } from './WorkflowTimeline'

interface ExpenseDetailModalProps {
  expenseId: string
  onClose: () => void
  onEdit?: (expense: MarketingExpenseRequest) => void
}

export function ExpenseDetailModal({ expenseId, onClose, onEdit }: ExpenseDetailModalProps) {
  const { expenses, plans, config, roleId, profile, submitExpense, decideExpense, requestExpenseChanges, simulateAdminExpenseDecision } = useWorkflow()
  const expense = expenses.find((item) => item.id === expenseId) ?? null
  const [note, setNote] = useState('')

  const stages = useMemo(() => (expense ? expenseStageStates(expense) : []), [expense])

  if (!expense) return null

  const plan = plans.find((item) => item.id === expense.planId)
  const canSubmit = canSubmitExpense(expense, profile)
  const canEdit = canEditExpense(expense, profile)
  const canDecide = canDecideExpense(expense, roleId)
  const stage = expenseDecisionStage(expense)
  const awaitingAdmin = isExpenseAwaitingAdmin(expense)

  return (
    <Modal
      open
      onClose={onClose}
      size="wide"
      title={expense.title}
      description={`${expense.employeeName} · ${expense.planTitle}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {canEdit && onEdit ? (
            <Button variant="soft" icon={<Pencil size={14} />} onClick={() => onEdit(expense)}>Edit expense</Button>
          ) : null}
          {canSubmit ? (
            <Button variant="primary" icon={<Send size={14} />} onClick={() => submitExpense(expense.id)}>
              {expense.status === 'Rejected' ? 'Resubmit expense' : 'Submit expense'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="wf-detail">
        <div className="wf-detail__hero">
          <div className="wf-detail__hero-main">
            <StatusBadge status={expense.status} />
            <Badge tone={expense.managerRequired ? 'accent' : 'neutral'}>
              {expense.managerRequired
                ? `Manager review · ${formatINR(config.expenseManagerThreshold)}+`
                : 'Manager review not required'}
            </Badge>
            {expense.currentApprover ? <span className="text-xs muted">With {expense.currentApprover}</span> : null}
          </div>
          <div className="wf-detail__hero-metrics">
            <span><strong>{formatINR(expense.amount)}</strong><small>Expense amount</small></span>
            <span><strong>{expense.category}</strong><small>Category</small></span>
            <span><strong>{formatDate(expense.expenseDate)}</strong><small>Expense date</small></span>
            <span><strong>{expense.approvals.length}</strong><small>Audit entries</small></span>
          </div>
        </div>

        {canDecide && stage ? (
          <div className="wf-decision">
            <div className="wf-decision__head">
              <div>
                <p className="wf-action-panel__title">
                  {stage === 'manager' ? 'Manager review' : 'Expense review'}
                </p>
                <p className="text-xs muted">
                  Approving forwards the expense to the existing Admin Dashboard for financial authorization. Plan
                  approval does not approve this expense.
                </p>
              </div>
              <Badge tone="warning">Action required</Badge>
            </div>
            <Field label="Decision note" htmlFor="wf-expense-note" hint="Required when requesting changes or rejecting.">
              <textarea
                id="wf-expense-note"
                className="textarea"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add context for the employee or the Admin Dashboard"
              />
            </Field>
            <div className="row-8 wrap">
              <Button variant="success" size="sm" icon={<BadgeCheck size={13} />} onClick={() => decideExpense(expense.id, 'approve', note)}>
                Approve
              </Button>
              <Button variant="soft" size="sm" icon={<CircleAlert size={13} />} onClick={() => requestExpenseChanges(expense.id, note)}>
                Request changes
              </Button>
              <Button variant="outline-danger" size="sm" icon={<XCircle size={13} />} onClick={() => decideExpense(expense.id, 'reject', note)}>
                Reject
              </Button>
            </div>
          </div>
        ) : null}

        {awaitingAdmin ? (
          <div className="wf-admin-sim" role="region" aria-label="Admin expense authorization demo simulator">
            <div className="wf-decision__head">
              <div>
                <p className="wf-action-panel__title">
                  <ShieldCheck size={14} /> Admin financial authorization · demo simulator
                </p>
                <p className="text-xs muted">
                  This decision belongs to the existing Totally ERP Admin Dashboard. These buttons only simulate that
                  external outcome locally. Marketing does not approve this expense.
                </p>
              </div>
              <Badge tone="neutral">Demo only</Badge>
            </div>
            <Field
              label="Simulated Admin note"
              htmlFor="wf-admin-expense-note"
              hint="Required when simulating a rejection."
            >
              <textarea
                id="wf-admin-expense-note"
                className="textarea"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Invoice verified against the approved plan (simulated)"
              />
            </Field>
            <div className="row-8 wrap">
              <Button variant="success" size="sm" icon={<BadgeCheck size={13} />} onClick={() => simulateAdminExpenseDecision(expense.id, 'authorize', note)}>
                Simulate Admin authorization
              </Button>
              <Button variant="outline-danger" size="sm" icon={<XCircle size={13} />} onClick={() => simulateAdminExpenseDecision(expense.id, 'reject', note)}>
                Simulate Admin rejection
              </Button>
            </div>
          </div>
        ) : null}

        {expense.adminAuthorization ? (
          <div className={`callout ${expense.adminAuthorization.status === 'Rejected' ? 'callout--warning' : 'callout--info'}`}>
            <ShieldCheck size={14} />
            <span>
              <strong>Admin financial status: {expense.adminAuthorization.status}</strong>
              {expense.adminAuthorization.simulated ? ' · simulated locally in this demo' : ' · handled by the existing Admin Dashboard'}
              {expense.adminAuthorization.comments ? ` — ${expense.adminAuthorization.comments}` : ''}
            </span>
          </div>
        ) : null}

        <WorkflowTimeline stages={stages} label={`${expense.title} workflow`} />

        <div className="wf-detail__grid">
          <section className="wf-detail__block">
            <h4><ReceiptText size={14} /> Expense details</h4>
            <dl className="wf-detail__rows">
              <div><dt>Linked plan</dt><dd>{expense.planTitle}</dd></div>
              <div><dt>Activity</dt><dd>{expense.activityName || 'Plan-level expense'}</dd></div>
              <div><dt>Activity type</dt><dd>{expense.activityType || '—'}</dd></div>
              <div><dt>Description</dt><dd>{expense.description || '—'}</dd></div>
              <div><dt>Supporting document</dt><dd>{expense.documentName || 'No document label'}</dd></div>
              <div><dt>Submitted</dt><dd>{expense.submittedAt ? formatDateTime(expense.submittedAt) : 'Not submitted'}</dd></div>
            </dl>
          </section>
          <section className="wf-detail__block">
            <h4><FileText size={14} /> Plan context</h4>
            <dl className="wf-detail__rows">
              <div><dt>Plan status</dt><dd>{plan ? <StatusBadge status={plan.status} /> : 'Plan unavailable'}</dd></div>
              <div><dt>Plan budget</dt><dd>{plan ? formatINR(plan.estimatedBudget) : '—'}</dd></div>
              <div><dt>Plan owner</dt><dd>{plan?.employeeName ?? expense.employeeName}</dd></div>
              <div><dt>Manager review</dt><dd>{expense.managerRequired ? 'Required by amount' : 'Not required'}</dd></div>
              <div><dt>Reviewer comments</dt><dd>{expense.reviewerComments || '—'}</dd></div>
            </dl>
          </section>
        </div>

        <div className="callout callout--info">
          <CircleAlert size={14} />
          <span>Approving the linked monthly plan does not approve this expense. Manager review and Admin financial authorization are separate decisions.</span>
        </div>

        <section className="wf-detail__block">
          <h4><BadgeCheck size={14} /> Approval history</h4>
          {expense.approvals.length === 0 ? (
            <p className="empty-inline">No approval activity yet. Submit the expense to start the audit trail.</p>
          ) : (
            <ol className="wf-history">
              {[...expense.approvals].reverse().map((entry) => (
                <li key={entry.id} className="wf-history__item">
                  <span className={`wf-history__dot wf-history__dot--${entry.decision.toLowerCase().replace(/\s+/g, '-')}`} aria-hidden="true" />
                  <div>
                    <p className="wf-history__title">{entry.action} · <span>{entry.byName}</span></p>
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
