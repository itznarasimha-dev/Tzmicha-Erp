import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Field, FormSection } from '../../ui/Form'
import { Avatar } from '../../ui/Avatar'
import { useMarketingDepartment } from '../../../context/MarketingDepartmentContext'
import type {
  ApprovalRequestDraft,
  ExpenseDraft,
  IdeaDraft,
  MarketingActivity,
  MarketingApprovalRequest,
  MarketingEmployee,
  MarketingExpense,
  MarketingIdea,
} from '../../../types/marketingDepartment'
import { formatINR, formatNumber, formatPercent } from '../../../utils/format'
import { dateOnlyFromNow } from '../../../utils/dates'
import {
  employeeStats,
  expenseTone,
  ideaTone,
  shortDate,
} from '../../../utils/marketingDepartment'
import { useToast } from '../../../context/ToastContext'
import { useMmsActor, useMmsScope, StatusChip, PriorityChip, TimelineList } from './MmsKit'

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

export function ExpenseFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tasks, submitExpense } = useMarketingDepartment()
  const { mySectors, tasks: scopedTasks, department } = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const sectorOptions = mySectors.length ? mySectors : department.sectors
  const taskOptions = scopedTasks.length ? scopedTasks : tasks
  const [form, setForm] = useState<ExpenseDraft>({
    title: '',
    amount: 5000,
    category: 'Travel',
    expenseDate: dateOnlyFromNow(0),
    taskId: '',
    taskTitle: '',
    description: '',
    receiptName: '',
    sectorId: sectorOptions[0]?.id ?? '',
  })

  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        amount: 5000,
        category: 'Travel',
        expenseDate: dateOnlyFromNow(0),
        taskId: '',
        taskTitle: '',
        description: '',
        receiptName: '',
        sectorId: sectorOptions[0]?.id ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const canSubmit = form.title.trim().length > 2 && form.amount > 0 && form.sectorId

  function submit() {
    if (!canSubmit) {
      pushToast({ title: 'Expense details required', description: 'Add a title, amount and sector.', tone: 'warning' })
      return
    }
    submitExpense(
      {
        ...form,
        taskTitle: tasks.find((task) => task.id === form.taskId)?.title ?? form.taskTitle,
        receiptName: form.receiptName || 'receipt-demo.pdf',
      },
      actor,
    )
    pushToast({
      title: 'Expense submitted',
      description:
        actor.role === 'junior'
          ? 'Sent to your senior for review, then manager and Finance/Admin final approval.'
          : 'Sent to the manager review queue. Finance/Admin provides final approval.',
      tone: 'success',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit marketing expense"
      description="Expenses follow Senior → Manager → Finance/Admin. A manager cannot bypass the final Finance/Admin decision."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} icon={<ReceiptText size={15} />}>
            Submit expense
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Expense title" required className="full">
          <input
            value={form.title}
            autoFocus
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. Customer visit travel — Indiranagar"
          />
        </Field>
        <Field label="Amount (₹)" required>
          <input
            type="number"
            min={1}
            step={100}
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          >
            {['Travel', 'Meals', 'Customer Meeting', 'Campaign Spend', 'Printing', 'Samples', 'Vendor', 'Other'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Expense date">
          <input
            type="date"
            value={form.expenseDate}
            onChange={(event) => setForm({ ...form, expenseDate: event.target.value })}
          />
        </Field>
        <Field label="Sector">
          <select value={form.sectorId} onChange={(event) => setForm({ ...form, sectorId: event.target.value })}>
            {sectorOptions.map((sector) => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Linked task">
          <select
            value={form.taskId}
            onChange={(event) => setForm({ ...form, taskId: event.target.value })}
          >
            <option value="">Not linked to a task</option>
            {taskOptions.map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Receipt file name">
          <input
            value={form.receiptName}
            onChange={(event) => setForm({ ...form, receiptName: event.target.value })}
            placeholder="receipt-demo.pdf"
          />
        </Field>
        <Field label="Business justification" className="full">
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="What was purchased and how does it support the marketing plan?"
          />
        </Field>
      </div>
      <div className="mms-form-summary">
        <span><IndianRupee size={14} /> {formatINR(form.amount)} claim</span>
        <span><ShieldCheck size={14} /> Final approval stays with Finance / Admin</span>
        <span><CalendarDays size={14} /> {shortDate(form.expenseDate)}</span>
      </div>
    </Modal>
  )
}

export function ExpenseDecisionModal({
  open,
  onClose,
  expense,
  decision,
}: {
  open: boolean
  onClose: () => void
  expense: MarketingExpense | null
  decision: 'approve' | 'reject' | 'changes'
}) {
  const { advanceExpense } = useMarketingDepartment()
  const { roleId } = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [comments, setComments] = useState('')

  useEffect(() => {
    if (open) setComments('')
  }, [open])

  if (!expense) return null

  function submit() {
    if (!expense) return
    if (decision !== 'approve' && comments.trim().length < 6) {
      pushToast({ title: 'Add a comment', description: 'Explain the decision for the employee.', tone: 'warning' })
      return
    }
    let status: MarketingExpense['status'] = expense.status
    let action = ''
    if (decision === 'reject') {
      status = 'Rejected'
      action = 'Expense rejected'
    } else if (decision === 'changes') {
      status = 'Changes Requested'
      action = 'Changes requested'
    } else if (roleId === 'senior') {
      status = 'Manager Review'
      action = 'Forwarded to manager review'
    } else if (roleId === 'manager') {
      status = 'Finance Review'
      action = 'Manager approved and forwarded to Finance/Admin'
    } else {
      status = 'Approved'
      action = 'Finance/Admin final approval'
    }
    advanceExpense(expense.id, status, action, actor, comments)
    pushToast({
      title: action,
      description:
        decision === 'approve' && roleId === 'manager'
          ? 'Finance/Admin still holds the final financial approval. The expense is not yet reimbursable.'
          : `${expense.title} · ${formatINR(expense.amount)}`,
      tone: decision === 'reject' ? 'error' : decision === 'changes' ? 'warning' : 'success',
    })
    onClose()
  }

  const title =
    decision === 'approve'
      ? roleId === 'senior'
        ? 'Forward expense to manager'
        : roleId === 'manager'
          ? 'Approve and send to Finance/Admin'
          : 'Record final Finance/Admin approval'
      : decision === 'reject'
        ? 'Reject expense'
        : 'Request changes'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`${expense.title} · ${expense.employeeName} · ${formatINR(expense.amount)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={decision === 'reject' ? 'danger' : decision === 'changes' ? 'soft' : 'primary'}
            onClick={submit}
            icon={decision === 'reject' ? <XCircle size={15} /> : decision === 'changes' ? <ArrowRight size={15} /> : <CheckCircle2 size={15} />}
          >
            {title}
          </Button>
        </>
      }
    >
      {roleId === 'manager' && decision === 'approve' ? (
        <div className="mms-inline-warning">
          <ShieldCheck size={14} />
          Manager approval only forwards this claim. Finance/Admin gives the final financial approval and releases payment.
        </div>
      ) : null}
      <div className="mms-review-summary">
        <div><span>Category</span><strong>{expense.category}</strong></div>
        <div><span>Expense date</span><strong>{shortDate(expense.expenseDate)}</strong></div>
        <div><span>Task</span><strong>{expense.taskTitle || 'Not linked'}</strong></div>
        <div><span>Receipt</span><strong>{expense.receiptName || 'Attached'}</strong></div>
        <div className="full"><span>Justification</span><strong>{expense.description || '—'}</strong></div>
      </div>
      <Field label={decision === 'approve' ? 'Review note (optional)' : 'Comment'} className="full">
        <textarea
          rows={3}
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          placeholder={
            decision === 'reject'
              ? 'Why is this claim rejected?'
              : decision === 'changes'
                ? 'What must the employee correct or attach?'
                : 'Add context for the next approver.'
          }
        />
      </Field>
      <TimelineList
        items={expense.timeline.map((entry) => ({
          id: entry.id,
          at: entry.at,
          actorName: entry.actorName,
          actorRole: entry.actorRole,
          action: entry.action,
          note: entry.note,
          tone: entry.tone,
        }))}
        limit={5}
      />
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Ideas                                                               */
/* ------------------------------------------------------------------ */

export function IdeaFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { submitIdea } = useMarketingDepartment()
  const { mySectors, department } = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const sectorOptions = mySectors.length ? mySectors : department.sectors
  const [form, setForm] = useState<IdeaDraft>({
    title: '',
    description: '',
    expectedBenefit: '',
    sectorId: sectorOptions[0]?.id ?? '',
    estimatedBudget: 25000,
    supportingDetails: '',
  })

  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        expectedBenefit: '',
        sectorId: sectorOptions[0]?.id ?? '',
        estimatedBudget: 25000,
        supportingDetails: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function submit() {
    if (form.title.trim().length < 3 || form.description.trim().length < 10) {
      pushToast({ title: 'More detail required', description: 'Add a clear idea title and description.', tone: 'warning' })
      return
    }
    submitIdea({ ...form, expectedBenefit: form.expectedBenefit || 'Improved marketing efficiency' }, actor)
    pushToast({
      title: 'Idea submitted',
      description:
        actor.role === 'junior'
          ? 'Your senior reviews it first, then the manager.'
          : 'Added to the manager review queue.',
      tone: 'success',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share a marketing idea"
      description="Ideas with a budget request are reviewed by the senior and manager, then forwarded to Finance/Admin when financial approval is required."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} icon={<Lightbulb size={15} />}>Submit idea</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Idea title" required className="full">
          <input
            value={form.title}
            autoFocus
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. WhatsApp re-engagement for dormant retail leads"
          />
        </Field>
        <Field label="Sector">
          <select value={form.sectorId} onChange={(event) => setForm({ ...form, sectorId: event.target.value })}>
            {sectorOptions.map((sector) => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Estimated budget (₹)" hint="Leave 0 when no spend is needed.">
          <input
            type="number"
            min={0}
            step={5000}
            value={form.estimatedBudget ?? 0}
            onChange={(event) => setForm({ ...form, estimatedBudget: Number(event.target.value) })}
          />
        </Field>
        <Field label="Idea description" required className="full">
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="What should we try, where and for which customer group?"
          />
        </Field>
        <Field label="Expected benefit" className="full">
          <textarea
            rows={2}
            value={form.expectedBenefit}
            onChange={(event) => setForm({ ...form, expectedBenefit: event.target.value })}
            placeholder="Expected leads, conversion lift, cost saving or customer experience improvement."
          />
        </Field>
        <Field label="Supporting details" className="full">
          <textarea
            rows={2}
            value={form.supportingDetails}
            onChange={(event) => setForm({ ...form, supportingDetails: event.target.value })}
            placeholder="Examples, vendor quotes, campaign references or data."
          />
        </Field>
      </div>
    </Modal>
  )
}

export function IdeaReviewModal({
  open,
  onClose,
  idea,
  decision,
}: {
  open: boolean
  onClose: () => void
  idea: MarketingIdea | null
  decision: 'approve' | 'reject' | 'changes' | 'forward'
}) {
  const { reviewIdea } = useMarketingDepartment()
  const { roleId } = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (open) setFeedback('')
  }, [open])

  if (!idea) return null

  function submit() {
    if (!idea) return
    if (decision !== 'approve' && feedback.trim().length < 6) {
      pushToast({ title: 'Add review feedback', description: 'Feedback is required for this decision.', tone: 'warning' })
      return
    }
    let status: MarketingIdea['status'] = idea.status
    let action = ''
    if (decision === 'reject') {
      status = 'Rejected'
      action = 'Idea rejected'
    } else if (decision === 'changes') {
      status = 'Changes Requested'
      action = 'Changes requested'
    } else if (decision === 'forward') {
      status = 'Forwarded to Finance'
      action = 'Forwarded to Finance/Admin'
    } else if (roleId === 'senior' && idea.status === 'Under Senior Review') {
      status = 'Pending Manager Review'
      action = 'Senior recommended idea to manager'
    } else {
      status = 'Approved'
      action = 'Idea approved'
    }
    reviewIdea(
      idea.id,
      status,
      actor,
      roleId === 'senior'
        ? { seniorFeedback: feedback }
        : { managerFeedback: feedback },
      action,
    )
    pushToast({
      title: action,
      description:
        decision === 'forward'
          ? 'Finance/Admin now owns the budget decision. Marketing approval alone does not release funds.'
          : idea.title,
      tone: decision === 'reject' ? 'error' : decision === 'changes' ? 'warning' : 'success',
    })
    onClose()
  }

  const title =
    decision === 'reject'
      ? 'Reject idea'
      : decision === 'changes'
        ? 'Request changes'
        : decision === 'forward'
          ? 'Forward idea to Finance/Admin'
          : roleId === 'senior'
            ? 'Recommend idea to manager'
            : 'Approve idea'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`${idea.title} · ${idea.submittedByName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={decision === 'reject' ? 'danger' : decision === 'changes' ? 'soft' : 'primary'}
            onClick={submit}
            icon={decision === 'reject' ? <XCircle size={15} /> : <BadgeCheck size={15} />}
          >
            {title}
          </Button>
        </>
      }
    >
      {decision === 'forward' ? (
        <div className="mms-inline-warning">
          <ShieldCheck size={14} /> Forwarding is a recommendation only. Finance/Admin makes the final budget decision.
        </div>
      ) : null}
      <div className="mms-review-summary">
        <div><span>Submitted by</span><strong>{idea.submittedByName} · {idea.submittedByRole}</strong></div>
        <div><span>Estimated budget</span><strong>{idea.estimatedBudget ? formatINR(idea.estimatedBudget) : 'No spend'}</strong></div>
        <div className="full"><span>Description</span><strong>{idea.description}</strong></div>
        <div className="full"><span>Expected benefit</span><strong>{idea.expectedBenefit || '—'}</strong></div>
      </div>
      {idea.seniorFeedback ? (
        <div className="mms-note-block"><span>Senior feedback</span><p>{idea.seniorFeedback}</p></div>
      ) : null}
      <Field label={decision === 'approve' ? 'Feedback (optional)' : 'Review feedback'} className="full">
        <textarea
          rows={3}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Add guidance, conditions or the reason for this decision."
        />
      </Field>
      <TimelineList
        items={idea.timeline.map((entry) => ({
          id: entry.id,
          at: entry.at,
          actorName: entry.actorName,
          actorRole: entry.actorRole,
          action: entry.action,
          note: entry.note,
          tone: entry.tone,
        }))}
        limit={5}
      />
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Approval requests                                                   */
/* ------------------------------------------------------------------ */

export function ApprovalDecisionModal({
  open,
  onClose,
  request,
  decision,
}: {
  open: boolean
  onClose: () => void
  request: MarketingApprovalRequest | null
  decision: 'approve' | 'reject' | 'changes'
}) {
  const { decideApprovalRequest } = useMarketingDepartment()
  const actor = useMmsActor()
  const { roleId } = useMmsScope()
  const { pushToast } = useToast()
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) setNote('')
  }, [open])

  if (!request) return null
  const financeStage = request.stage === 'finance'

  function submit() {
    if (!request) return
    if (decision !== 'approve' && note.trim().length < 6) {
      pushToast({ title: 'Add a decision note', description: 'Explain the decision for the requester.', tone: 'warning' })
      return
    }
    decideApprovalRequest(
      request.id,
      decision === 'approve' ? 'Approved' : decision === 'reject' ? 'Rejected' : 'Changes Requested',
      actor,
      note,
    )
    pushToast({
      title: decision === 'approve' ? 'Request approved' : decision === 'reject' ? 'Request rejected' : 'Changes requested',
      description:
        decision === 'approve' && !financeStage
          ? 'Forwarded to Finance/Admin for final financial approval.'
          : decision === 'approve'
            ? 'Final Finance/Admin approval recorded.'
            : request.title,
      tone: decision === 'reject' ? 'error' : decision === 'changes' ? 'warning' : 'success',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        decision === 'approve'
          ? financeStage
            ? 'Record Finance/Admin final approval'
            : 'Approve and forward to Finance/Admin'
          : decision === 'reject'
            ? 'Reject request'
            : 'Request changes'
      }
      description={`${request.title} · ${request.submittedByName} · ${request.kind}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={decision === 'reject' ? 'danger' : decision === 'changes' ? 'soft' : 'primary'}
            onClick={submit}
            icon={<BadgeCheck size={15} />}
          >
            {decision === 'approve' ? (financeStage ? 'Record final approval' : 'Approve & forward') : decision === 'reject' ? 'Reject request' : 'Request changes'}
          </Button>
        </>
      }
    >
      {!financeStage && decision === 'approve' ? (
        <div className="mms-inline-warning">
          <ShieldCheck size={14} />
          {roleId === 'manager'
            ? 'Manager approval forwards this request to Finance/Admin. Marketing cannot release budget or mark it finally approved.'
            : 'This request will be forwarded to Finance/Admin for the final financial decision.'}
        </div>
      ) : null}
      <div className="mms-review-summary">
        <div><span>Request type</span><strong>{request.kind}</strong></div>
        <div><span>Requested amount</span><strong>{request.amount ? formatINR(request.amount) : 'No spend'}</strong></div>
        <div className="full"><span>Summary</span><strong>{request.summary}</strong></div>
        <div><span>Current stage</span><strong>{request.stage === 'manager' ? 'Manager review' : request.stage === 'finance' ? 'Finance / Admin' : 'Closed'}</strong></div>
        <div><span>Status</span><StatusChip status={request.status} /></div>
      </div>
      <Field label={decision === 'approve' ? 'Decision note (optional)' : 'Decision note'} className="full">
        <textarea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add the commercial rationale or the correction required."
        />
      </Field>
      <TimelineList
        items={request.timeline.map((entry) => ({
          id: entry.id,
          at: entry.at,
          actorName: entry.actorName,
          actorRole: entry.actorRole,
          action: entry.action,
          note: entry.note,
          tone: entry.tone,
        }))}
        limit={5}
      />
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Daily activity                                                      */
/* ------------------------------------------------------------------ */

export function ActivityFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logActivity } = useMarketingDepartment()
  const { mySectors, department } = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const sectorOptions = mySectors.length ? mySectors : department.sectors
  const [form, setForm] = useState({
    sectorId: sectorOptions[0]?.id ?? '',
    type: 'Customer Visit' as MarketingActivity['type'],
    title: '',
    detail: '',
    at: new Date().toISOString().slice(0, 16),
    duration: 45,
    leadsCaptured: 0,
  })

  useEffect(() => {
    if (open) {
      setForm((current) => ({ ...current, title: '', detail: '', leadsCaptured: 0, at: new Date().toISOString().slice(0, 16) }))
    }
  }, [open])

  function submit() {
    if (form.title.trim().length < 3) {
      pushToast({ title: 'Activity title required', description: 'Describe the activity you completed.', tone: 'warning' })
      return
    }
    logActivity(
      {
        ...form,
        employeeId: actor.id,
        at: new Date(form.at).toISOString(),
        status: 'Completed',
      },
      actor,
    )
    pushToast({ title: 'Activity logged', description: 'Your daily activity record is now visible to your senior.', tone: 'success' })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log daily marketing activity"
      description="Field visits, calls, meetings and campaign work are visible to your senior and the manager."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} icon={<CheckCircle2 size={15} />}>Save activity</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Activity type">
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value as MarketingActivity['type'] })}
          >
            {['Customer Visit', 'Phone Call', 'Meeting', 'Field Activity', 'Digital Activity', 'Campaign Participation', 'Lead Collection', 'Follow-up'].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="Sector">
          <select value={form.sectorId} onChange={(event) => setForm({ ...form, sectorId: event.target.value })}>
            {sectorOptions.map((sector) => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Activity title" required className="full">
          <input
            value={form.title}
            autoFocus
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. Visited 8 retail outlets in Indiranagar"
          />
        </Field>
        <Field label="When">
          <input type="datetime-local" value={form.at} onChange={(event) => setForm({ ...form, at: event.target.value })} />
        </Field>
        <Field label="Duration (minutes)">
          <input
            type="number"
            min={0}
            value={form.duration}
            onChange={(event) => setForm({ ...form, duration: Number(event.target.value) })}
          />
        </Field>
        <Field label="Leads captured">
          <input
            type="number"
            min={0}
            value={form.leadsCaptured}
            onChange={(event) => setForm({ ...form, leadsCaptured: Number(event.target.value) })}
          />
        </Field>
        <Field label="Details" className="full">
          <textarea
            rows={3}
            value={form.detail}
            onChange={(event) => setForm({ ...form, detail: event.target.value })}
            placeholder="Who did you meet, what was discussed and what happens next?"
          />
        </Field>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Employee profile                                                    */
/* ------------------------------------------------------------------ */

export function EmployeeProfileModal({
  open,
  onClose,
  employee,
}: {
  open: boolean
  onClose: () => void
  employee: MarketingEmployee | null
}) {
  const { leads, tasks, followUps, activities, sectors } = useMarketingDepartment()
  const [tab, setTab] = useState<'overview' | 'work' | 'development'>('overview')
  if (!employee) return null

  const sector = sectors.find((item) => item.id === employee.sectorId)
  const stats = employeeStats(employee, leads, tasks, followUps, activities)
  const employeeTasks = tasks.filter(
    (task) => task.assignedJuniorId === employee.id || task.assignedSeniorId === employee.id,
  )
  const employeeLeads = leads.filter(
    (lead) => lead.assignedJuniorId === employee.id || lead.createdById === employee.id,
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title={employee.name}
      description={`${employee.designation} · ${sector?.name ?? 'Unassigned sector'} · ${employee.location}`}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="mms-profile-head">
        <Avatar name={employee.name} size="xl" />
        <div>
          <div className="mms-profile-head__meta">
            <StatusChip status={employee.status} />
            <span>{employee.role === 'senior' ? 'Senior executive' : 'Junior executive'}</span>
            <span>Joined {shortDate(employee.joinDate)}</span>
          </div>
          <div className="mms-profile-head__contacts">
            <span><Mail size={13} /> {employee.email}</span>
            <span><Phone size={13} /> {employee.phone}</span>
            <span><MapPin size={13} /> {employee.location}</span>
          </div>
        </div>
      </div>

      <div className="mms-tabs mms-tabs--inline">
        {(['overview', 'work', 'development'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`mms-tab ${tab === option ? 'is-active' : ''}`.trim()}
            onClick={() => setTab(option)}
          >
            <span>{option === 'overview' ? 'Overview' : option === 'work' ? 'Current work' : 'Skills & targets'}</span>
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="mms-profile-grid">
          <div className="mms-profile-stat"><span>Leads generated</span><strong>{formatNumber(stats.leadsGenerated)}</strong><small>{formatPercent(stats.targetAchievement)} of target</small></div>
          <div className="mms-profile-stat"><span>Qualified leads</span><strong>{formatNumber(stats.qualifiedLeads)}</strong><small>{formatPercent(stats.conversionRate)} conversion</small></div>
          <div className="mms-profile-stat"><span>Tasks completed</span><strong>{stats.completedTasks}/{stats.assignedTasks}</strong><small>{stats.pendingTasks} pending</small></div>
          <div className="mms-profile-stat"><span>Follow-ups</span><strong>{formatNumber(stats.followUpsCompleted)}</strong><small>{stats.activityCount} activities logged</small></div>
          <div className="mms-profile-stat"><span>Current status</span><strong style={{ fontSize: '0.95rem' }}>{employee.activityStatus}</strong><small>Live activity</small></div>
          <div className="mms-profile-stat"><span>Reporting senior</span><strong style={{ fontSize: '0.95rem' }}>{sector?.leaderId ? 'Assigned' : '—'}</strong><small>{sector?.name ?? 'No sector'}</small></div>
        </div>
      ) : tab === 'work' ? (
        <div className="mms-profile-work">
          <div>
            <h4>Open tasks</h4>
            {employeeTasks.filter((task) => task.status !== 'Completed').slice(0, 5).map((task) => (
              <div key={task.id} className="mms-profile-row">
                <span>{task.title}</span>
                <StatusChip status={task.status} />
                <PriorityChip priority={task.priority} />
              </div>
            ))}
            {!employeeTasks.filter((task) => task.status !== 'Completed').length ? <p className="mms-empty-line">No open tasks.</p> : null}
          </div>
          <div>
            <h4>Recent leads</h4>
            {employeeLeads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="mms-profile-row">
                <span>{lead.name} · {lead.businessName}</span>
                <StatusChip status={lead.stage} />
              </div>
            ))}
            {!employeeLeads.length ? <p className="mms-empty-line">No leads captured yet.</p> : null}
          </div>
        </div>
      ) : (
        <div className="mms-profile-work">
          <div>
            <h4>Skills</h4>
            <div className="mms-chip-wrap">
              {employee.skills.length ? employee.skills.map((skill) => <span key={skill} className="mms-chip">{skill}</span>) : <p className="mms-empty-line">No skills recorded.</p>}
            </div>
            <h4 style={{ marginTop: 18 }}>Targets</h4>
            <div className="mms-profile-row"><span>Monthly lead target</span><strong>{formatNumber(employee.targetLeads)}</strong></div>
            <div className="mms-profile-row"><span>Activity focus</span><span>{employee.activityStatus}</span></div>
          </div>
          <div>
            <h4>Manager notes</h4>
            <div className="mms-note-block">
              <span>Coaching opportunity</span>
              <p>
                {employee.role === 'junior'
                  ? 'Focus on qualification depth and same-day follow-up notes. Verify budget authority before submitting to senior review.'
                  : 'Strengthen junior coaching cadence and review every submitted lead before manager escalation.'}
              </p>
            </div>
            <div className="mms-profile-row"><span>Sector</span><span>{sector?.name ?? 'Unassigned'}</span></div>
            <div className="mms-profile-row"><span>Department</span><span>Marketing</span></div>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Generic quick approval-request creation is provided by MmsModals.    */
/* ------------------------------------------------------------------ */
