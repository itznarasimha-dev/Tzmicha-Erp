import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, CalendarClock, CircleAlert, FileText, Plus, ReceiptText, Send, ShieldCheck, Upload } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { useToast } from '../../../context/ToastContext'
import { useRoleWorkspace } from '../../../context/RoleWorkspaceContext'
import { useDemoRole } from '../../../context/DemoRoleContext'
import type {
  WorkspaceEmployee,
  WorkspaceExpense,
  WorkspaceLead,
  WorkspaceTask,
} from '../../../types/workspace'
import {
  ACTIVITY_TYPES,
  LEAD_STATUSES,
} from '../../../context/RoleWorkspaceContext'
import {
  TEAM_EMPLOYEES,
  WORKSPACE_EMPLOYEES,
  directReportsFor,
} from '../../../data/marketing/workspace'
import { dateOnlyFromNow } from '../../../utils/dates'
import { formatINR } from '../../../utils/format'

const EXPENSE_CATEGORIES = [
  'Travel',
  'Food',
  'Advertising',
  'Printing',
  'Customer Meetings',
  'Field Marketing',
  'Other Expenses',
]

const LEAD_SOURCES = [
  'Field Visit',
  'Digital Campaign',
  'Referral',
  'Trade Event',
  'Retail Activity',
  'Website Enquiry',
  'Apartment Activation',
  'Mall Activation',
  'Other',
]

const TASK_CATEGORIES = [
  'Campaign Execution',
  'Lead Generation',
  'Retail Activation',
  'Field Activation',
  'Dealer Engagement',
  'Customer Engagement',
  'Digital Marketing',
  'Reporting',
  'Expense Review',
  'Lead Quality',
]

export function TaskAssignModal({
  open,
  onClose,
  role,
  defaultAssigneeId,
  parentTask,
}: {
  open: boolean
  onClose: () => void
  role: 'manager' | 'senior'
  defaultAssigneeId?: string
  parentTask?: WorkspaceTask
}) {
  const { profile } = useDemoRole()
  const { addTask } = useRoleWorkspace()
  const { pushToast } = useToast()
  const assignable = useMemo(() => {
    if (role === 'manager') return TEAM_EMPLOYEES
    const direct = directReportsFor(profile.employeeId)
    return direct.length ? direct : TEAM_EMPLOYEES.filter((employee) => employee.roleId === 'junior')
  }, [profile.employeeId, role])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedToId, setAssignedToId] = useState(defaultAssigneeId ?? assignable[0]?.employeeId ?? '')
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('High')
  const [deadline, setDeadline] = useState(dateOnlyFromNow(3))
  const [expectedResult, setExpectedResult] = useState('')
  const [instructions, setInstructions] = useState('')
  const [category, setCategory] = useState('Campaign Execution')

  useEffect(() => {
    if (!open) return
    setTitle(parentTask ? `${parentTask.title} — execution subtask` : '')
    setDescription('')
    setAssignedToId(defaultAssigneeId ?? assignable[0]?.employeeId ?? '')
    setPriority(parentTask?.priority ?? 'High')
    setDeadline(dateOnlyFromNow(parentTask ? 2 : 3))
    setExpectedResult('')
    setInstructions(parentTask ? `Break down the parent assignment: ${parentTask.title}. Capture evidence and update progress.` : '')
    setCategory(parentTask?.category ?? 'Campaign Execution')
  }, [open, defaultAssigneeId, assignable, parentTask])

  const submit = () => {
    if (!title.trim() || !expectedResult.trim() || !assignedToId) {
      pushToast({ title: 'Complete the assignment', description: 'Add a title, assignee and expected result.', tone: 'warning' })
      return
    }
    addTask({
      title: title.trim(),
      description: description.trim() || 'Execute the assigned marketing activity and record the outcome in the workspace.',
      assignedToId,
      assignedByName: profile.name,
      assignedById: profile.employeeId,
      priority,
      deadline,
      expectedResult: expectedResult.trim(),
      instructions: instructions.trim(),
      category,
      managerTask: role === 'manager',
    })
    pushToast({
      title: role === 'manager' ? 'Marketing assignment created' : 'Subtask assigned',
      description: `${title.trim()} is now visible in the assignee’s task workspace.`,
      tone: 'success',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={role === 'manager' ? 'Create marketing assignment' : 'Assign a subtask'}
      description={
        role === 'manager'
          ? 'Assign work to a senior executive or directly to a junior executive. Deadlines, priorities and expected results are saved in this browser.'
          : 'Break the parent assignment into a clear, deliverable subtask for a junior executive.'
      }
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Plus size={15} />} onClick={submit}>Create assignment</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="ws-task-title">Task title <span className="req">*</span></label>
          <input id="ws-task-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Festive retail activation — Bengaluru zone" />
        </div>
        <div className="field">
          <label htmlFor="ws-task-assignee">Assign to</label>
          <select id="ws-task-assignee" className="select" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
            {assignable.map((employee) => (
              <option key={employee.employeeId} value={employee.employeeId}>
                {employee.name} · {employee.roleId === 'senior' ? 'Senior' : 'Junior'}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ws-task-priority">Priority</label>
          <select id="ws-task-priority" className="select" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
            {['Urgent', 'High', 'Medium', 'Low'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ws-task-deadline">Deadline</label>
          <input id="ws-task-deadline" type="date" className="input" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ws-task-category">Work category</label>
          <select id="ws-task-category" className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
            {TASK_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="ws-task-description">Description</label>
          <textarea id="ws-task-description" className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the scope, market, audience and activity expectations." />
        </div>
        <div className="field full">
          <label htmlFor="ws-task-expected">Expected result <span className="req">*</span></label>
          <input id="ws-task-expected" className="input" value={expectedResult} onChange={(event) => setExpectedResult(event.target.value)} placeholder="e.g. 40 qualified leads and 8 store activations" />
        </div>
        <div className="field full">
          <label htmlFor="ws-task-instructions">Instructions</label>
          <textarea id="ws-task-instructions" className="textarea" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Add execution guidance, reporting expectations or links to existing campaign material." />
        </div>
      </div>
      <div className="callout callout--info mt-12">
        <CircleAlert size={14} />
        <span>Creating a task only changes local demo state. It does not send email, SMS or a real work notification.</span>
      </div>
    </Modal>
  )
}

export function TaskProgressModal({
  open,
  onClose,
  task,
  canReview,
}: {
  open: boolean
  onClose: () => void
  task: WorkspaceTask | null
  canReview?: boolean
}) {
  const { updateTask } = useRoleWorkspace()
  const { pushToast } = useToast()
  const [progress, setProgress] = useState(task?.progress ?? 0)
  const [status, setStatus] = useState<WorkspaceTask['status']>(task?.status ?? 'Not Started')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!task) return
    setProgress(task.progress)
    setStatus(task.status)
    setNote('')
  }, [task])

  if (!task) return null

  const save = (nextStatus: WorkspaceTask['status'], nextProgress?: number) => {
    const finalProgress = nextProgress ?? progress
    updateTask(task.id, {
      status: nextStatus,
      progress: nextStatus === 'Completed' ? 100 : finalProgress,
      reviewNote: note.trim() || task.reviewNote,
    })
    pushToast({
      title: 'Task updated',
      description: `${task.title} is now ${nextStatus}.`,
      tone: nextStatus === 'Blocked' ? 'warning' : 'success',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task.title}
      description={`Assigned by ${task.assignedByName} · ${task.category} · Deadline ${task.deadline}`}
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="danger" onClick={() => save('Blocked')} icon={<CircleAlert size={14} />}>Report issue</Button>
          {canReview ? (
            <Button variant="success" onClick={() => save('Completed')} icon={<BadgeCheck size={14} />}>Approve work</Button>
          ) : (
            <Button variant="primary" onClick={() => save('Under Review')} icon={<Send size={14} />}>Submit for review</Button>
          )}
        </>
      }
    >
      <div className="ws-task-detail">
        <div className="ws-task-detail__hero">
          <div>
            <span className="badge badge--neutral badge--no-dot">{task.category}</span>
            <h3 className="mt-8">{task.expectedResult}</h3>
            <p className="text-sm muted mt-4">{task.description}</p>
          </div>
          <div className="ws-task-detail__assignee">
            <span>Assigned to</span>
            <strong>{task.assignedToName}</strong>
          </div>
        </div>

        <div className="ws-task-detail__meta">
          <span><CalendarClock size={13} /> Deadline {task.deadline}</span>
          <span><BadgeCheck size={13} /> Status {task.status}</span>
          <span><FileText size={13} /> {task.progress}% complete</span>
        </div>

        <div className="field mt-16">
          <label htmlFor="ws-task-progress">Progress: {progress}%</label>
          <input
            id="ws-task-progress"
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
          />
        </div>

        <div className="field mt-12">
          <label htmlFor="ws-task-status">Task status</label>
          <select id="ws-task-status" className="select" value={status} onChange={(event) => setStatus(event.target.value as WorkspaceTask['status'])}>
            {['Not Started', 'In Progress', 'Under Review', 'Blocked', 'Overdue', 'Completed'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        <div className="field mt-12">
          <label htmlFor="ws-task-note">Progress note / review comment</label>
          <textarea id="ws-task-note" className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add what was completed, evidence captured, or the reason for an issue." />
        </div>

        <div className="ws-task-detail__instructions">
          <h4>Manager instructions</h4>
          <p>{task.instructions || 'No additional instructions were recorded for this assignment.'}</p>
          {task.reviewNote ? (
            <div className="callout callout--warning mt-8">
              <CircleAlert size={14} />
              <span>{task.reviewNote}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="row-8 wrap mt-16">
        <Button variant="soft" size="sm" onClick={() => save('In Progress')}>Start / continue</Button>
        <Button variant="ghost" size="sm" onClick={() => save(status)}>Save progress</Button>
        <Button variant="success" size="sm" onClick={() => save('Completed', 100)}>Mark completed</Button>
      </div>
    </Modal>
  )
}

export function IdeaSubmitModal({ open, onClose, role }: { open: boolean; onClose: () => void; role: 'senior' | 'junior' }) {
  const { profile } = useDemoRole()
  const { addIdea } = useRoleWorkspace()
  const { pushToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [benefits, setBenefits] = useState('')
  const [budget, setBudget] = useState('')
  const [supporting, setSupporting] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setBenefits('')
    setBudget('')
    setSupporting('')
  }, [open])

  const submit = () => {
    if (!title.trim() || !description.trim() || !benefits.trim()) {
      pushToast({ title: 'Complete the idea', description: 'Add a title, description and expected benefits.', tone: 'warning' })
      return
    }
    addIdea({
      title: title.trim(),
      description: description.trim(),
      expectedBenefits: benefits.trim(),
      estimatedBudget: budget.trim() ? Number(budget) : null,
      supportingInfo: supporting.trim(),
      submittedById: profile.employeeId,
      submittedByName: profile.name,
      submittedByRole: role,
      seniorId: role === 'junior' ? 'TOT-MKT-0218' : null,
    })
    pushToast({
      title: 'Idea submitted',
      description: role === 'junior' ? 'Your senior executive can now review and recommend it.' : 'The manager can now review your recommendation.',
      tone: 'success',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit a marketing idea"
      description="Share a field insight, campaign improvement or new acquisition opportunity. This demo routes the idea through the marketing approval workflow only."
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Send size={14} />} onClick={submit}>Submit idea</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="ws-idea-title">Idea title <span className="req">*</span></label>
          <input id="ws-idea-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Weekend apartment activation in Whitefield" />
        </div>
        <div className="field full">
          <label htmlFor="ws-idea-description">Description <span className="req">*</span></label>
          <textarea id="ws-idea-description" className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain the opportunity, the activity and how it would work." />
        </div>
        <div className="field full">
          <label htmlFor="ws-idea-benefits">Expected benefits <span className="req">*</span></label>
          <textarea id="ws-idea-benefits" className="textarea" value={benefits} onChange={(event) => setBenefits(event.target.value)} placeholder="Expected leads, conversion impact, market coverage or customer value." />
        </div>
        <div className="field">
          <label htmlFor="ws-idea-budget">Estimated budget (optional)</label>
          <input id="ws-idea-budget" type="number" min={0} className="input" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="₹ 0" />
        </div>
        <div className="field">
          <label>Approval route</label>
          <div className="ws-route-preview">
            <span>{role === 'junior' ? 'Junior' : 'Senior'}</span>
            {role === 'junior' ? <><i>→</i><span>Senior</span></> : null}
            <i>→</i><span>Manager</span>
            <i>→</i><span>Finance/Admin if budget</span>
          </div>
        </div>
        <div className="field full">
          <label htmlFor="ws-idea-support">Supporting information</label>
          <textarea id="ws-idea-support" className="textarea" value={supporting} onChange={(event) => setSupporting(event.target.value)} placeholder="Add vendor quotes, customer feedback, location details or other supporting notes." />
        </div>
      </div>
      <div className="callout callout--info mt-12">
        <ShieldCheck size={14} />
        <span>The manager can approve the marketing idea but cannot give final financial approval when a budget is required.</span>
      </div>
    </Modal>
  )
}

export function ExpenseSubmitModal({
  open,
  onClose,
  tasks,
}: {
  open: boolean
  onClose: () => void
  tasks: WorkspaceTask[]
}) {
  const { profile } = useDemoRole()
  const { addExpense } = useRoleWorkspace()
  const { pushToast } = useToast()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Travel')
  const [date, setDate] = useState(dateOnlyFromNow(0))
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [receiptName, setReceiptName] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle('')
    setAmount('')
    setCategory('Travel')
    setDate(dateOnlyFromNow(0))
    setTaskId(tasks[0]?.id ?? '')
    setDescription('')
    setReceiptName('')
  }, [open, tasks])

  const selectedTask = tasks.find((task) => task.id === taskId)

  const submit = () => {
    const numeric = Number(amount)
    if (!title.trim() || !Number.isFinite(numeric) || numeric <= 0 || !selectedTask) {
      pushToast({ title: 'Complete the expense', description: 'Add a title, amount and related task.', tone: 'warning' })
      return
    }
    addExpense({
      title: title.trim(),
      amount: numeric,
      category,
      expenseDate: date,
      taskId: selectedTask.id,
      taskTitle: selectedTask.title,
      description: description.trim() || 'Marketing expense linked to an assigned activity.',
      receiptName: receiptName || 'No receipt attached',
      submittedById: profile.employeeId,
      submittedByName: profile.name,
      seniorId: 'TOT-MKT-0218',
    })
    pushToast({
      title: 'Expense submitted',
      description: 'The claim is now visible to your assigned senior executive for review.',
      tone: 'success',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit a marketing expense"
      description="Raise a claim against an assigned marketing task. Submission does not create a real payment."
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Save draft locally</Button>
          <Button variant="primary" icon={<Send size={14} />} onClick={submit}>Submit expense</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="ws-expense-title">Expense title <span className="req">*</span></label>
          <input id="ws-expense-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Cab fare for customer demo" />
        </div>
        <div className="field">
          <label htmlFor="ws-expense-amount">Amount (₹) <span className="req">*</span></label>
          <input id="ws-expense-amount" type="number" min={0} className="input" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
        </div>
        <div className="field">
          <label htmlFor="ws-expense-category">Category</label>
          <select id="ws-expense-category" className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
            {EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ws-expense-date">Expense date</label>
          <input id="ws-expense-date" type="date" className="input" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ws-expense-task">Related task <span className="req">*</span></label>
          <select id="ws-expense-task" className="select" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="ws-expense-description">Description</label>
          <textarea id="ws-expense-description" className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what the expense was for and why it was necessary." />
        </div>
        <div className="field full">
          <label>Receipt attachment</label>
          <label className="ws-upload" htmlFor="ws-expense-receipt">
            <Upload size={17} />
            <span>
              <strong>{receiptName || 'Choose a receipt file'}</strong>
              <small>PDF, JPG or PNG. The file name is stored locally; the file is not uploaded.</small>
            </span>
            <input
              id="ws-expense-receipt"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(event) => setReceiptName(event.target.files?.[0]?.name ?? '')}
            />
          </label>
        </div>
      </div>
      <div className="ws-route-preview mt-12">
        <span>Junior</span><i>→</i><span>Senior review</span><i>→</i><span>Manager</span><i>→</i><span>Finance/Admin final</span>
      </div>
      <div className="callout callout--info mt-12">
        <CircleAlert size={14} />
        <span>{selectedTask ? `This claim will be linked to “${selectedTask.title}” and is visible only to you and the reviewers in this demo.` : 'Link the expense to one of your assigned tasks.'}</span>
      </div>
    </Modal>
  )
}

export function LeadFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useDemoRole()
  const { addLead } = useRoleWorkspace()
  const { pushToast } = useToast()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [requirement, setRequirement] = useState('')
  const [source, setSource] = useState('Field Visit')
  const [location, setLocation] = useState('')
  const [followUpAt, setFollowUpAt] = useState(dateOnlyFromNow(1))
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setCompany('')
    setPhone('')
    setEmail('')
    setRequirement('')
    setSource('Field Visit')
    setLocation('')
    setFollowUpAt(dateOnlyFromNow(1))
    setNotes('')
  }, [open])

  const submit = () => {
    if (!name.trim() || !phone.trim() || !requirement.trim()) {
      pushToast({ title: 'Complete the lead', description: 'Add the customer name, phone number and requirement.', tone: 'warning' })
      return
    }
    addLead({
      name: name.trim(),
      company: company.trim() || 'Individual customer',
      phone: phone.trim(),
      email: email.trim(),
      requirement: requirement.trim(),
      source,
      location: location.trim() || 'Bengaluru, India',
      followUpAt: new Date(`${followUpAt}T10:00:00`).toISOString(),
      ownerId: profile.employeeId,
      ownerName: profile.name,
      notes: notes.trim(),
    })
    pushToast({ title: 'Lead added', description: `${name.trim()} is now in your lead workspace with a follow-up scheduled.`, tone: 'success' })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a new lead"
      description="Capture the customer information and schedule the next follow-up. This is a frontend demonstration record."
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Save lead</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="ws-lead-name">Customer name <span className="req">*</span></label>
          <input id="ws-lead-name" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
        </div>
        <div className="field">
          <label htmlFor="ws-lead-company">Company / household</label>
          <input id="ws-lead-company" className="input" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company or individual" />
        </div>
        <div className="field">
          <label htmlFor="ws-lead-phone">Phone <span className="req">*</span></label>
          <input id="ws-lead-phone" className="input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91" />
        </div>
        <div className="field">
          <label htmlFor="ws-lead-email">Email</label>
          <input id="ws-lead-email" type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
        </div>
        <div className="field full">
          <label htmlFor="ws-lead-requirement">Customer requirement <span className="req">*</span></label>
          <textarea id="ws-lead-requirement" className="textarea" value={requirement} onChange={(event) => setRequirement(event.target.value)} placeholder="What is the customer looking for? Include product, scope and timing." />
        </div>
        <div className="field">
          <label htmlFor="ws-lead-source">Lead source</label>
          <select id="ws-lead-source" className="select" value={source} onChange={(event) => setSource(event.target.value)}>
            {LEAD_SOURCES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ws-lead-location">Location</label>
          <input id="ws-lead-location" className="input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Area, city" />
        </div>
        <div className="field">
          <label htmlFor="ws-lead-followup">Follow-up date</label>
          <input id="ws-lead-followup" type="date" className="input" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ws-lead-notes">Notes</label>
          <input id="ws-lead-notes" className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Preferred contact time, budget, next step" />
        </div>
      </div>
      <div className="ws-route-preview mt-12">
        <span>New Lead</span><i>→</i><span>Follow-up</span><i>→</i><span>Qualified</span><i>→</i><span>Existing customer conversion workflow</span>
      </div>
    </Modal>
  )
}

export function LeadUpdateModal({
  open,
  onClose,
  lead,
}: {
  open: boolean
  onClose: () => void
  lead: WorkspaceLead | null
}) {
  const { updateLead } = useRoleWorkspace()
  const { pushToast } = useToast()
  const [status, setStatus] = useState<WorkspaceLead['status']>(lead?.status ?? 'New Lead')
  const [followUpAt, setFollowUpAt] = useState(lead?.followUpAt.slice(0, 10) ?? dateOnlyFromNow(1))
  const [notes, setNotes] = useState(lead?.notes ?? '')

  useEffect(() => {
    if (!lead) return
    setStatus(lead.status)
    setFollowUpAt(lead.followUpAt.slice(0, 10))
    setNotes(lead.notes)
  }, [lead])

  if (!lead) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead.name}
      description={`${lead.company} · ${lead.source} · ${lead.location}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            onClick={() => {
              updateLead(lead.id, {
                status,
                followUpAt: new Date(`${followUpAt}T10:00:00`).toISOString(),
                notes,
              })
              pushToast({ title: 'Lead updated', description: `${lead.name} is now marked ${status}.`, tone: 'success' })
              onClose()
            }}
          >
            Save lead update
          </Button>
        </>
      }
    >
      <div className="ws-lead-summary">
        <div><span>Requirement</span><strong>{lead.requirement}</strong></div>
        <div><span>Phone</span><strong>{lead.phone}</strong></div>
        <div><span>Email</span><strong>{lead.email || 'Not provided'}</strong></div>
      </div>
      <div className="form-grid mt-16">
        <div className="field">
          <label htmlFor="ws-lead-status">Lead status</label>
          <select id="ws-lead-status" className="select" value={status} onChange={(event) => setStatus(event.target.value as WorkspaceLead['status'])}>
            {LEAD_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ws-lead-followup-edit">Next follow-up</label>
          <input id="ws-lead-followup-edit" type="date" className="input" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="ws-lead-notes-edit">Notes</label>
          <textarea id="ws-lead-notes-edit" className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </div>
      {status === 'Qualified' ? (
        <div className="callout callout--info mt-12">
          <BadgeCheck size={14} />
          <span>Qualified leads remain in this workspace for demonstration. Use the existing Leads &amp; Attribution module for the real ERP customer-conversion workflow.</span>
        </div>
      ) : null}
    </Modal>
  )
}

export function ActivityLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useDemoRole()
  const { logActivity } = useRoleWorkspace()
  const { pushToast } = useToast()
  const [type, setType] = useState<(typeof ACTIVITY_TYPES)[number]>('Customer Visit')
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [duration, setDuration] = useState('30')
  const [leadsCaptured, setLeadsCaptured] = useState('0')

  useEffect(() => {
    if (!open) return
    setType('Customer Visit')
    setTitle('')
    setDetail('')
    setDuration('30')
    setLeadsCaptured('0')
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a daily marketing activity"
      description="Record what you completed today so your senior executive and manager can see delivery progress."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!title.trim()) {
                pushToast({ title: 'Add an activity title', tone: 'warning' })
                return
              }
              logActivity({
                type,
                title: title.trim(),
                detail: detail.trim() || 'Daily marketing activity recorded in the workspace.',
                at: new Date().toISOString(),
                duration: Number(duration) || 0,
                employeeId: profile.employeeId,
                employeeName: profile.name,
                leadsCaptured: Number(leadsCaptured) || 0,
                status: 'Completed',
              })
              pushToast({ title: 'Activity logged', description: 'Your daily activity timeline has been updated.', tone: 'success' })
              onClose()
            }}
          >
            Save activity
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="ws-activity-type">Activity type</label>
          <select id="ws-activity-type" className="select" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
            {ACTIVITY_TYPES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ws-activity-duration">Duration (minutes)</label>
          <input id="ws-activity-duration" type="number" min={0} className="input" value={duration} onChange={(event) => setDuration(event.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="ws-activity-title">Activity title</label>
          <input id="ws-activity-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Customer visit — Indiranagar" />
        </div>
        <div className="field full">
          <label htmlFor="ws-activity-detail">What was completed?</label>
          <textarea id="ws-activity-detail" className="textarea" value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Customers met, calls made, material distributed or digital work completed." />
        </div>
        <div className="field">
          <label htmlFor="ws-activity-leads">Leads captured</label>
          <input id="ws-activity-leads" type="number" min={0} className="input" value={leadsCaptured} onChange={(event) => setLeadsCaptured(event.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

export function DecisionModal({
  open,
  onClose,
  title,
  subject,
  amount,
  description,
  decisions,
  onSubmit,
  currentStage,
}: {
  open: boolean
  onClose: () => void
  title: string
  subject: string
  amount?: number | null
  description: string
  decisions: Array<{ label: string; value: string; variant: 'primary' | 'danger' | 'ghost' | 'success' }>
  onSubmit: (decision: string, comment: string) => void
  currentStage: string
}) {
  const [comment, setComment] = useState('')
  useEffect(() => {
    if (open) setComment('')
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`${subject} · Current stage: ${currentStage}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {decisions.map((decision) => (
            <Button
              key={decision.value}
              variant={decision.variant}
              onClick={() => {
                onSubmit(decision.value, comment.trim())
                onClose()
              }}
            >
              {decision.label}
            </Button>
          ))}
        </>
      }
    >
      <div className="ws-decision-summary">
        <p>{description}</p>
        {amount ? <div className="ws-decision-amount">{formatINR(amount)}</div> : null}
      </div>
      <div className="field mt-16">
        <label htmlFor="ws-decision-comment">Comment for the workflow record</label>
        <textarea
          id="ws-decision-comment"
          className="textarea"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add your review note, requested change or budget rationale."
        />
      </div>
      <div className="callout callout--warning mt-12">
        <ShieldCheck size={14} />
        <span>
          A manager approval is a marketing decision, not a financial authorization. Finance/Admin
          remains the final financial approver.
        </span>
      </div>
    </Modal>
  )
}

export function ExpenseReviewModal({
  open,
  onClose,
  expense,
  mode,
}: {
  open: boolean
  onClose: () => void
  expense: WorkspaceExpense | null
  mode: 'senior' | 'manager'
}) {
  const { updateExpenseStatus, addApproval } = useRoleWorkspace()
  const { profile } = useDemoRole()
  const { pushToast } = useToast()
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (open) setComment('')
  }, [open])

  if (!expense) return null

  const decide = (status: 'Manager Review' | 'Finance Review' | 'Changes Requested' | 'Rejected') => {
    updateExpenseStatus(
      expense.id,
      status,
      {
        actor: profile.name,
        role: profile.roleLabel,
        note: comment.trim() || undefined,
        tone: status === 'Changes Requested' ? 'warning' : status === 'Rejected' ? 'danger' : 'success',
      },
      comment.trim() || expense.comments,
    )
    if (mode === 'manager' && status === 'Finance Review') {
      addApproval({
        kind: 'Expense',
        title: `Finance review · ${expense.title}`,
        summary: `${expense.category} claim from ${expense.submittedByName} for ${formatINR(expense.amount)}. Manager review is complete.`,
        submittedById: expense.submittedById,
        submittedByName: expense.submittedByName,
        submittedByLabel: 'Marketing team',
        amount: expense.amount,
        status: 'Pending Finance Approval',
        currentStage: 'finance',
        relatedExpenseId: expense.id,
      })
    }
    pushToast({ title: `Expense moved to ${status}`, description: 'The approval timeline has been updated in this browser.', tone: 'success' })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense.title}
      description={`${expense.category} · ${expense.submittedByName} · ${formatINR(expense.amount)}`}
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="danger" onClick={() => decide('Rejected')}>Reject</Button>
          <Button variant="soft" onClick={() => decide('Changes Requested')}>Request changes</Button>
          {mode === 'senior' ? (
            <Button variant="primary" onClick={() => decide('Manager Review')}>Forward to manager</Button>
          ) : (
            <Button variant="primary" onClick={() => decide('Finance Review')}>Approve for finance</Button>
          )}
        </>
      }
    >
      <div className="ws-expense-detail">
        <div className="ws-detail-amount">{formatINR(expense.amount)}</div>
        <div className="ws-detail-grid">
          <div><span>Category</span><strong>{expense.category}</strong></div>
          <div><span>Date</span><strong>{expense.expenseDate}</strong></div>
          <div><span>Submitted by</span><strong>{expense.submittedByName}</strong></div>
          <div><span>Related task</span><strong>{expense.taskTitle}</strong></div>
        </div>
        <p className="text-sm muted mt-12">{expense.description}</p>
        <div className="ws-file-row"><ReceiptText size={14} /> {expense.receiptName}</div>
      </div>
      <div className="field mt-16">
        <label htmlFor="ws-expense-review-comment">Review comment</label>
        <textarea id="ws-expense-review-comment" className="textarea" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a note for the junior executive and next approver." />
      </div>
      <div className="callout callout--warning mt-12">
        <ShieldCheck size={14} />
        <span>
          {mode === 'senior'
            ? 'Senior review is a recommendation only. The manager and Finance/Admin still need to act.'
            : 'Manager approval sends the claim for finance review. It does not release a payment and is not final financial approval.'}
        </span>
      </div>
    </Modal>
  )
}

export const WORKSHEET_EMPLOYEES: WorkspaceEmployee[] = WORKSPACE_EMPLOYEES
