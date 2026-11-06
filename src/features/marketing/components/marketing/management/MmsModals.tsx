import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  IndianRupee,
  Target,
  Users,
} from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Field, FormSection } from '../../ui/Form'
import { useMarketingDepartment } from '../../../context/MarketingDepartmentContext'
import type {
  CampaignDraft,
  CampaignStatus,
  MarketingCampaign,
  MarketingEmployee,
  MarketingPlan,
  MarketingPriority,
  MarketingSector,
  MarketingTask,
  PlanDraft,
  PlanStatus,
  SectorDraft,
  TaskDraft,
} from '../../../types/marketingDepartment'
import { dateOnlyFromNow } from '../../../utils/dates'
import { formatINR } from '../../../utils/format'
import { useToast } from '../../../context/ToastContext'
import { useMmsActor, useMmsScope } from './MmsKit'

const PRIORITIES: MarketingPriority[] = ['Urgent', 'High', 'Medium', 'Low']
const PLAN_TYPES = [
  'Monthly',
  'Weekly',
  'Sector Strategy',
  'Lead Generation',
  'Customer Acquisition',
  'Campaign',
  'Location-Based',
  'Digital',
  'Field',
  'Trade & Retail',
]
const PLAN_STATUSES: PlanStatus[] = ['Draft', 'Pending Manager Review', 'Pending Finance Approval', 'Active', 'Completed', 'Changes Requested', 'Rejected']
const CAMPAIGN_STATUSES: CampaignStatus[] = ['Planned', 'Active', 'Paused', 'Completed']

const TASK_TEMPLATES: Record<string, Array<{ title: string; category: string; expected: string; quantity: number }>> = {
  FIELD: [
    { title: 'Visit 30 businesses', category: 'Field Marketing', expected: '30 business visits with meeting notes and next actions.', quantity: 30 },
    { title: 'Generate 20 potential customer leads', category: 'Lead Generation', expected: '20 verified leads with customer requirements.', quantity: 20 },
    { title: 'Complete 10 follow-ups', category: 'Follow-up', expected: '10 follow-ups completed with outcomes recorded.', quantity: 10 },
  ],
  DIGITAL: [
    { title: 'Create 10 social media posts', category: 'Content Production', expected: '10 approved posts scheduled in the content calendar.', quantity: 10 },
    { title: 'Generate 25 digital enquiries', category: 'Lead Generation', expected: '25 campaign-attributed enquiries.', quantity: 25 },
    { title: 'Prepare weekly campaign report', category: 'Reporting', expected: 'Weekly engagement and enquiry performance report.', quantity: 1 },
  ],
  TRADE: [
    { title: 'Visit 20 retail outlets', category: 'Retail Activation', expected: '20 outlet visits with owner feedback.', quantity: 20 },
    { title: 'Identify 10 potential retail partners', category: 'Partner Acquisition', expected: '10 shortlisted partners with commercial details.', quantity: 10 },
    { title: 'Collect retailer feedback', category: 'Market Research', expected: 'Structured feedback from active retail partners.', quantity: 15 },
  ],
  LEADGEN: [
    { title: 'Generate 50 qualified prospects', category: 'Lead Generation', expected: '50 verified prospects with complete contact details.', quantity: 50 },
    { title: 'Verify customer information', category: 'Data Quality', expected: 'All assigned records verified with no duplicates.', quantity: 40 },
    { title: 'Complete assigned follow-ups', category: 'Follow-up', expected: 'All scheduled follow-ups completed and recorded.', quantity: 18 },
  ],
  CAMPAIGN: [
    { title: 'Plan promotional activities', category: 'Campaign Execution', expected: 'Approved activity calendar with owners and timings.', quantity: 8 },
    { title: 'Coordinate campaign execution', category: 'Campaign Execution', expected: 'Campaign launched on schedule with all owners aligned.', quantity: 1 },
    { title: 'Monitor campaign responses', category: 'Campaign Monitoring', expected: 'Every response logged and followed up within 24 hours.', quantity: 60 },
  ],
}

function yearLater(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

export function SectorFormModal({
  open,
  onClose,
  sector,
}: {
  open: boolean
  onClose: () => void
  sector?: MarketingSector | null
}) {
  const { sectors, employees, createSector, updateSector, assignSectorLeader } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const seniors = employees.filter((employee) => employee.role === 'senior' && employee.status === 'Active')
  const juniors = employees.filter((employee) => employee.role === 'junior' && employee.status === 'Active')
  const [form, setForm] = useState<SectorDraft>({
    name: '',
    description: '',
    objective: '',
    leaderId: null,
    juniorIds: [],
    monthlyLeadTarget: 250,
    monthlyActivityTarget: 100,
    budget: 500000,
    startDate: dateOnlyFromNow(0),
    endDate: yearLater(),
    priority: 'Medium',
  })

  useEffect(() => {
    if (!open) return
    if (sector) {
      setForm({
        name: sector.name,
        description: sector.description,
        objective: sector.objective,
        leaderId: sector.leaderId,
        juniorIds: juniors.filter((employee) => employee.sectorId === sector.id).map((employee) => employee.id),
        monthlyLeadTarget: sector.monthlyLeadTarget,
        monthlyActivityTarget: sector.monthlyActivityTarget,
        budget: sector.budget,
        startDate: sector.startDate,
        endDate: sector.endDate,
        priority: sector.priority,
      })
    } else {
      setForm({
        name: '',
        description: '',
        objective: '',
        leaderId: null,
        juniorIds: [],
        monthlyLeadTarget: 250,
        monthlyActivityTarget: 100,
        budget: 500000,
        startDate: dateOnlyFromNow(0),
        endDate: yearLater(),
        priority: 'Medium',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sector?.id])

  const canSubmit = form.name.trim().length >= 3 && form.objective.trim().length >= 5

  const submit = () => {
    if (!canSubmit) {
      pushToast({ title: 'Sector details required', description: 'Add a sector name and objective before continuing.', tone: 'warning' })
      return
    }
    if (sector) {
      updateSector(sector.id, {
        name: form.name,
        description: form.description,
        objective: form.objective,
        monthlyLeadTarget: form.monthlyLeadTarget,
        monthlyActivityTarget: form.monthlyActivityTarget,
        budget: form.budget,
        startDate: form.startDate,
        endDate: form.endDate,
        priority: form.priority,
      })
      if (form.leaderId !== sector.leaderId) assignSectorLeader(sector.id, form.leaderId)
      pushToast({ title: 'Sector updated', description: `${form.name} has been updated across the department.`, tone: 'success' })
    } else {
      const created = createSector(form, actor)
      pushToast({
        title: 'Sector created',
        description: `${created.name} is now active and available in the Work Assignment Center.`,
        tone: 'success',
      })
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={sector ? 'Edit sector' : 'Create a new sector'}
      description={
        sector
          ? 'Update the sector details, leader, targets and budget. Changes appear immediately for the team.'
          : 'Define the sector, assign a senior leader and select junior team members. The sector becomes available for plans, budgets and work assignments instantly.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
            {sector ? 'Save sector' : 'Create sector'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Sector name" required className="full">
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. Regional Partner Marketing"
            autoFocus
          />
        </Field>
        <Field label="Sector description" className="full">
          <textarea
            rows={2}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="What does this sector own?"
          />
        </Field>
        <Field label="Sector objective" required className="full">
          <textarea
            rows={2}
            value={form.objective}
            onChange={(event) => setForm({ ...form, objective: event.target.value })}
            placeholder="The measurable outcome this sector must deliver."
          />
        </Field>
        <Field label="Assigned Senior Executive" hint="Sector leaders manage the junior team and distribute work.">
          <select
            value={form.leaderId ?? ''}
            onChange={(event) => setForm({ ...form, leaderId: event.target.value || null })}
          >
            <option value="">Unassigned</option>
            {seniors.map((senior) => (
              <option key={senior.id} value={senior.id}>
                {senior.name} · {senior.designation}
              </option>
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
        {!sector ? (
          <Field label="Junior team members" className="full" hint="Selected employees move into this sector and report to the assigned senior.">
            <div className="mms-check-grid">
              {juniors.map((junior) => {
                const checked = form.juniorIds.includes(junior.id)
                return (
                  <label key={junior.id} className={`mms-check-card ${checked ? 'is-checked' : ''}`.trim()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setForm({
                          ...form,
                          juniorIds: checked
                            ? form.juniorIds.filter((id) => id !== junior.id)
                            : [...form.juniorIds, junior.id],
                        })
                      }
                    />
                    <span>
                      <strong>{junior.name}</strong>
                      <small>{junior.designation}</small>
                    </span>
                  </label>
                )
              })}
            </div>
          </Field>
        ) : null}
        <FormSection title="Targets and budget" />
        <Field label="Monthly lead target">
          <input
            type="number"
            min={0}
            value={form.monthlyLeadTarget}
            onChange={(event) => setForm({ ...form, monthlyLeadTarget: Number(event.target.value) })}
          />
        </Field>
        <Field label="Monthly activity target">
          <input
            type="number"
            min={0}
            value={form.monthlyActivityTarget}
            onChange={(event) => setForm({ ...form, monthlyActivityTarget: Number(event.target.value) })}
          />
        </Field>
        <Field label="Budget allocation (₹)">
          <input
            type="number"
            min={0}
            step={10000}
            value={form.budget}
            onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })}
          />
        </Field>
        <Field label="Start date">
          <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
        </Field>
        <Field label="End date">
          <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
        </Field>
      </div>
      <div className="mms-form-summary">
        <span><Users size={14} /> {form.juniorIds.length} junior members selected</span>
        <span><Target size={14} /> {form.monthlyLeadTarget} leads / month</span>
        <span><IndianRupee size={14} /> {formatINR(form.budget)} allocated</span>
      </div>
      {sectors.some((item) => item.name.toLowerCase() === form.name.trim().toLowerCase() && item.id !== sector?.id) ? (
        <div className="mms-inline-warning"><AlertCircle size={14} /> A sector with this name already exists.</div>
      ) : null}
    </Modal>
  )
}

export function AssignSeniorModal({
  open,
  onClose,
  sector,
}: {
  open: boolean
  onClose: () => void
  sector: MarketingSector | null
}) {
  const { employees, assignSectorLeader } = useMarketingDepartment()
  const { pushToast } = useToast()
  const seniors = employees.filter((employee) => employee.role === 'senior' && employee.status === 'Active')
  const [seniorId, setSeniorId] = useState('')
  useEffect(() => {
    if (open && sector) setSeniorId(sector.leaderId ?? '')
  }, [open, sector])
  if (!sector) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign Senior Executive"
      description={`Choose the sector leader for ${sector.name}. The leader can manage the junior team but cannot change manager-level budgets.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              assignSectorLeader(sector.id, seniorId || null)
              pushToast({
                title: seniorId ? 'Sector leader updated' : 'Sector leader removed',
                description: `${sector.name} has been reassigned in the shared department structure.`,
                tone: 'success',
              })
              onClose()
            }}
          >
            Save assignment
          </Button>
        </>
      }
    >
      <Field label="Senior Executive">
        <select value={seniorId} onChange={(event) => setSeniorId(event.target.value)}>
          <option value="">Unassigned</option>
          {seniors.map((senior) => (
            <option key={senior.id} value={senior.id}>
              {senior.name} · {senior.designation} · {senior.location}
            </option>
          ))}
        </select>
      </Field>
      <div className="mms-banner mms-banner--info mt-16">
        <span className="mms-banner__icon"><AlertCircle size={15} /></span>
        <div>
          <strong>Permission note</strong>
          <div>Senior Executives can distribute work and review leads inside their sector. Budget allocation remains a Marketing Manager control.</div>
        </div>
      </div>
    </Modal>
  )
}

export function AddEmployeeModal({
  open,
  onClose,
  sectorId,
  lockedRole,
}: {
  open: boolean
  onClose: () => void
  sectorId?: string | null
  lockedRole?: 'junior' | 'senior'
}) {
  const { sectors, addEmployee } = useMarketingDepartment()
  const { pushToast } = useToast()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: lockedRole ?? ('junior' as 'junior' | 'senior'),
    designation: '',
    sectorId: sectorId ?? sectors[0]?.id ?? '',
    location: 'Bengaluru, India',
    targetLeads: 100,
  })
  useEffect(() => {
    if (!open) return
    setForm((current) => ({
      ...current,
      role: lockedRole ?? current.role,
      sectorId: sectorId ?? current.sectorId ?? sectors[0]?.id ?? '',
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sectorId, lockedRole])
  const submit = () => {
    if (!form.name.trim() || !form.email.includes('@') || !form.sectorId) {
      pushToast({ title: 'Employee details required', description: 'Add a name, valid email and sector.', tone: 'warning' })
      return
    }
    const employee = addEmployee({
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      designation:
        form.designation ||
        (form.role === 'senior' ? 'Senior Marketing Executive' : 'Junior Marketing Executive'),
      sectorId: form.sectorId,
      location: form.location,
      targetLeads: form.targetLeads,
    })
    pushToast({
      title: 'Team member added',
      description: `${employee.name} was added to the sector and is visible to the team immediately.`,
      tone: 'success',
    })
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add team member"
      description="Create a demonstration employee record and attach it to a marketing sector."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Add team member</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Full name" required>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus />
        </Field>
        <Field label="Email" required>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </Field>
        <Field label="Phone">
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91" />
        </Field>
        <Field label="Role">
          <select
            value={form.role}
            disabled={Boolean(lockedRole)}
            onChange={(event) =>
              setForm({
                ...form,
                role: event.target.value as 'junior' | 'senior',
                designation: event.target.value === 'senior' ? 'Senior Marketing Executive' : 'Junior Marketing Executive',
              })
            }
          >
            <option value="junior">Junior Marketing Executive</option>
            <option value="senior">Senior Marketing Executive</option>
          </select>
        </Field>
        <Field label="Designation">
          <input
            value={form.designation}
            onChange={(event) => setForm({ ...form, designation: event.target.value })}
            placeholder="Junior Field Marketing Executive"
          />
        </Field>
        <Field label="Sector">
          <select value={form.sectorId} onChange={(event) => setForm({ ...form, sectorId: event.target.value })}>
            {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        </Field>
        <Field label="Monthly lead target">
          <input
            type="number"
            min={0}
            value={form.targetLeads}
            onChange={(event) => setForm({ ...form, targetLeads: Number(event.target.value) })}
          />
        </Field>
      </div>
    </Modal>
  )
}

export function TransferEmployeeModal({
  open,
  onClose,
  employee,
}: {
  open: boolean
  onClose: () => void
  employee: MarketingEmployee | null
}) {
  const { sectors, transferEmployee } = useMarketingDepartment()
  const { pushToast } = useToast()
  const [sectorId, setSectorId] = useState('')
  useEffect(() => {
    if (open && employee) setSectorId(employee.sectorId ?? sectors[0]?.id ?? '')
  }, [open, employee, sectors])
  if (!employee) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transfer employee"
      description={`Move ${employee.name} to another sector. Their reporting line updates automatically.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              transferEmployee(employee.id, sectorId)
              pushToast({ title: 'Employee transferred', description: `${employee.name} is now attached to the selected sector.`, tone: 'success' })
              onClose()
            }}
          >
            Transfer
          </Button>
        </>
      }
    >
      <Field label="Destination sector">
        <select value={sectorId} onChange={(event) => setSectorId(event.target.value)}>
          {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
        </select>
      </Field>
      <p className="text-sm muted mt-8">Current sector: {sectors.find((sector) => sector.id === employee.sectorId)?.name ?? 'Unassigned'}</p>
    </Modal>
  )
}

export function SectorTargetsModal({
  open,
  onClose,
  sector,
}: {
  open: boolean
  onClose: () => void
  sector: MarketingSector | null
}) {
  const { setSectorTargets } = useMarketingDepartment()
  const { pushToast } = useToast()
  const [leadTarget, setLeadTarget] = useState(0)
  const [activityTarget, setActivityTarget] = useState(0)
  useEffect(() => {
    if (open && sector) {
      setLeadTarget(sector.monthlyLeadTarget)
      setActivityTarget(sector.monthlyActivityTarget)
    }
  }, [open, sector])
  if (!sector) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set sector targets"
      description={`Monthly targets for ${sector.name}. Target changes are visible to the senior and junior team.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setSectorTargets(sector.id, leadTarget, activityTarget)
              pushToast({ title: 'Sector targets updated', tone: 'success' })
              onClose()
            }}
          >
            Save targets
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Monthly lead target">
          <input type="number" min={0} value={leadTarget} onChange={(event) => setLeadTarget(Number(event.target.value))} />
        </Field>
        <Field label="Monthly activity target">
          <input type="number" min={0} value={activityTarget} onChange={(event) => setActivityTarget(Number(event.target.value))} />
        </Field>
      </div>
    </Modal>
  )
}

export function BudgetAllocationModal({
  open,
  onClose,
  sector,
}: {
  open: boolean
  onClose: () => void
  sector: MarketingSector | null
}) {
  const { allocateBudget } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [budget, setBudget] = useState(0)
  useEffect(() => {
    if (open && sector) setBudget(sector.budget)
  }, [open, sector])
  if (!sector) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Allocate sector budget"
      description="Set the total budget available to this sector. Final financial disbursement remains with Finance/Admin."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              allocateBudget(sector.id, budget, actor)
              pushToast({
                title: 'Budget allocation updated',
                description: `${sector.name} now has a total budget of ${formatINR(budget)}.`,
                tone: 'success',
              })
              onClose()
            }}
          >
            Save allocation
          </Button>
        </>
      }
    >
      <Field label="Total sector budget (₹)">
        <input type="number" min={0} step={10000} value={budget} onChange={(event) => setBudget(Number(event.target.value))} />
      </Field>
      <div className="mms-form-summary">
        <span>Allocated: {formatINR(budget)}</span>
        <span>Already used: {formatINR(sector.spent)}</span>
        <span>Remaining: {formatINR(Math.max(0, budget - sector.spent))}</span>
      </div>
    </Modal>
  )
}

export function TaskFormModal({
  open,
  onClose,
  initialSectorId,
  initialSeniorId,
  initialJuniorId,
  parentTask,
  campaignId,
}: {
  open: boolean
  onClose: () => void
  initialSectorId?: string | null
  initialSeniorId?: string | null
  initialJuniorId?: string | null
  parentTask?: MarketingTask | null
  campaignId?: string | null
}) {
  const { sectors, employees, campaigns, tasks, addTask } = useMarketingDepartment()
  const { roleId } = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [form, setForm] = useState<TaskDraft>({
    title: '',
    sectorId: initialSectorId ?? sectors[0]?.id ?? '',
    assigneeType: initialJuniorId ? 'junior' : initialSeniorId ? 'senior' : 'sector',
    assignedSeniorId: initialSeniorId ?? null,
    assignedJuniorId: initialJuniorId ?? null,
    category: 'Lead Generation',
    description: '',
    expectedResult: '',
    targetQuantity: 10,
    startDate: dateOnlyFromNow(0),
    deadline: dateOnlyFromNow(7),
    priority: 'High',
    budget: 0,
    instructions: '',
    source: roleId === 'senior' ? 'Senior' : 'Manager',
    parentId: parentTask?.id ?? null,
    campaignId: campaignId ?? undefined,
  })

  useEffect(() => {
    if (!open) return
    const sectorId = initialSectorId ?? parentTask?.sectorId ?? sectors[0]?.id ?? ''
    const sector = sectors.find((item) => item.id === sectorId)
    setForm({
      title: parentTask ? '' : '',
      sectorId,
      assigneeType: initialJuniorId ? 'junior' : initialSeniorId || parentTask ? 'senior' : 'sector',
      assignedSeniorId: initialSeniorId ?? parentTask?.assignedSeniorId ?? sector?.leaderId ?? null,
      assignedJuniorId: initialJuniorId ?? null,
      category: parentTask?.category ?? 'Lead Generation',
      description: '',
      expectedResult: '',
      targetQuantity: parentTask ? Math.max(1, Math.round(parentTask.targetQuantity / 3)) : 10,
      startDate: dateOnlyFromNow(0),
      deadline: dateOnlyFromNow(7),
      priority: parentTask?.priority ?? 'High',
      budget: parentTask ? Math.round(parentTask.budget / 3) : 0,
      instructions: parentTask ? `Subtask of: ${parentTask.title}. ${parentTask.instructions}` : '',
      source: roleId === 'senior' ? 'Senior' : 'Manager',
      parentId: parentTask?.id ?? null,
      campaignId: campaignId ?? parentTask?.campaignId,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSectorId, initialSeniorId, initialJuniorId, parentTask?.id, campaignId])

  const sector = sectors.find((item) => item.id === form.sectorId)
  const juniors = employees.filter(
    (employee) => employee.role === 'junior' && employee.sectorId === form.sectorId && employee.status === 'Active',
  )
  const seniors = employees.filter(
    (employee) => employee.role === 'senior' && (employee.sectorId === form.sectorId || employee.id === sector?.leaderId),
  )
  const templates = TASK_TEMPLATES[sector?.code ?? 'FIELD'] ?? TASK_TEMPLATES.FIELD
  const canSubmit = form.title.trim().length >= 3 && form.sectorId && form.deadline

  const updateSector = (sectorId: string) => {
    const nextSector = sectors.find((item) => item.id === sectorId)
    setForm({
      ...form,
      sectorId,
      assignedSeniorId: nextSector?.leaderId ?? null,
      assignedJuniorId: null,
      assigneeType: 'sector',
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={parentTask ? 'Create subtask' : 'Assign marketing work'}
      description={
        parentTask
          ? `Divide “${parentTask.title}” into a smaller task for a team member. The original manager assignment remains unchanged.`
          : 'Assign to an entire sector, a senior executive or an individual junior executive. The task appears in the assignee dashboard immediately.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!canSubmit}
            onClick={() => {
              const task = addTask(form, actor)
              pushToast({
                title: parentTask ? 'Subtask assigned' : 'Work assigned',
                description: `${task.title} is now visible to the assignee and updates the shared department workload.`,
                tone: 'success',
              })
              onClose()
            }}
          >
            {parentTask ? 'Assign subtask' : 'Assign work'}
          </Button>
        </>
      }
    >
      {!parentTask ? (
        <div className="mms-template-row">
          {templates.map((template) => (
            <button
              key={template.title}
              type="button"
              className="mms-template"
              onClick={() =>
                setForm({
                  ...form,
                  title: template.title,
                  category: template.category,
                  expectedResult: template.expected,
                  targetQuantity: template.quantity,
                  description: `Execute: ${template.title}. Capture evidence and update progress before the deadline.`,
                  instructions: `Follow the sector playbook. ${template.expected}`,
                })
              }
            >
              <ClipboardList size={14} />
              <span>{template.title}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="form-grid">
        <Field label="Task title" required className="full">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} autoFocus />
        </Field>
        <Field label="Sector" required>
          <select value={form.sectorId} onChange={(event) => updateSector(event.target.value)} disabled={Boolean(parentTask)}>
            {sectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Assignment level">
          <select
            value={form.assigneeType}
            onChange={(event) => {
              const assigneeType = event.target.value as TaskDraft['assigneeType']
              setForm({
                ...form,
                assigneeType,
                assignedJuniorId: assigneeType === 'junior' ? form.assignedJuniorId ?? juniors[0]?.id ?? null : null,
              })
            }}
          >
            <option value="sector">Entire sector</option>
            <option value="senior">Senior Executive</option>
            <option value="junior">Individual Junior Executive</option>
          </select>
        </Field>
        <Field label="Assigned Senior Executive">
          <select
            value={form.assignedSeniorId ?? ''}
            onChange={(event) => setForm({ ...form, assignedSeniorId: event.target.value || null })}
          >
            <option value="">Select senior</option>
            {seniors.map((senior) => <option key={senior.id} value={senior.id}>{senior.name}</option>)}
            {sector?.leaderId && !seniors.some((senior) => senior.id === sector.leaderId) ? (
              <option value={sector.leaderId}>{employees.find((employee) => employee.id === sector.leaderId)?.name}</option>
            ) : null}
          </select>
        </Field>
        <Field label="Assigned Junior Executive" hint={form.assigneeType === 'junior' ? 'Required for individual assignment.' : 'Optional for sector or senior assignment.'}>
          <select
            value={form.assignedJuniorId ?? ''}
            onChange={(event) => setForm({ ...form, assignedJuniorId: event.target.value || null })}
            disabled={form.assigneeType === 'sector'}
          >
            <option value="">No individual junior</option>
            {juniors.map((junior) => <option key={junior.id} value={junior.id}>{junior.name}</option>)}
          </select>
        </Field>
        <Field label="Task category">
          <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
        </Field>
        <Field label="Target quantity">
          <input type="number" min={1} value={form.targetQuantity} onChange={(event) => setForm({ ...form, targetQuantity: Number(event.target.value) })} />
        </Field>
        <Field label="Description" className="full">
          <textarea rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </Field>
        <Field label="Expected results" className="full">
          <textarea rows={2} value={form.expectedResult} onChange={(event) => setForm({ ...form, expectedResult: event.target.value })} />
        </Field>
        <Field label="Start date">
          <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
        </Field>
        <Field label="Deadline" required>
          <input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
        </Field>
        <Field label="Priority">
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as MarketingPriority })}>
            {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </Field>
        <Field label="Budget allocation (₹)" hint={roleId === 'senior' ? 'Senior tasks cannot exceed the original sector assignment budget.' : undefined}>
          <input type="number" min={0} step={1000} value={form.budget} onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })} />
        </Field>
        <Field label="Campaign (optional)">
          <select value={form.campaignId ?? ''} onChange={(event) => setForm({ ...form, campaignId: event.target.value || undefined })}>
            <option value="">Not linked to a campaign</option>
            {campaigns.filter((campaign) => campaign.sectorId === form.sectorId).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Supporting instructions" className="full">
          <textarea rows={2} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} />
        </Field>
      </div>
      <div className="mms-form-summary">
        <span><Users size={14} /> {form.assigneeType === 'sector' ? `${sector?.name ?? 'Sector'} team` : form.assigneeType === 'senior' ? employees.find((employee) => employee.id === form.assignedSeniorId)?.name ?? 'Senior' : employees.find((employee) => employee.id === form.assignedJuniorId)?.name ?? 'Junior'}</span>
        <span><Target size={14} /> {form.targetQuantity} target</span>
        <span><CalendarClock size={14} /> Due {new Date(form.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
        <span><IndianRupee size={14} /> {formatINR(form.budget)}</span>
      </div>
      <p className="mms-faint-note">{tasks.filter((task) => task.parentId === parentTask?.id).length} subtasks already exist under this assignment.</p>
    </Modal>
  )
}

export function PlanFormModal({
  open,
  onClose,
  plan,
}: {
  open: boolean
  onClose: () => void
  plan?: MarketingPlan | null
}) {
  const { sectors, employees, createPlan, updatePlan } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [form, setForm] = useState<PlanDraft>({
    title: '',
    type: 'Monthly',
    objective: '',
    sectorId: sectors[0]?.id ?? '',
    seniorId: sectors[0]?.leaderId ?? null,
    targetAudience: '',
    expectedResults: '',
    budget: 100000,
    startDate: dateOnlyFromNow(0),
    deadline: dateOnlyFromNow(30),
    priority: 'High',
    status: 'Draft',
  })
  useEffect(() => {
    if (!open) return
    if (plan) {
      setForm({
        title: plan.title,
        type: plan.type,
        objective: plan.objective,
        sectorId: plan.sectorId,
        seniorId: plan.seniorId,
        targetAudience: plan.targetAudience,
        expectedResults: plan.expectedResults,
        budget: plan.budget,
        startDate: plan.startDate,
        deadline: plan.deadline,
        priority: plan.priority,
        status: plan.status,
      })
    } else {
      setForm((current) => ({ ...current, title: '', objective: '', targetAudience: '', expectedResults: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan?.id])
  const canSubmit = form.title.trim().length >= 3 && form.objective.trim().length >= 5 && form.sectorId
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={plan ? 'Edit marketing plan' : 'Create marketing plan'}
      description="Plan the objective, sector, responsible senior, audience, budget, deadline and priority. The plan becomes available in the planning workflow."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!canSubmit}
            onClick={() => {
              if (plan) {
                updatePlan(plan.id, form, actor, 'Plan details updated.')
              } else {
                const created = createPlan(form, actor)
                pushToast({ title: 'Marketing plan created', description: `${created.title} is now in the planning workflow.`, tone: 'success' })
              }
              onClose()
            }}
          >
            {plan ? 'Save plan' : 'Create plan'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Plan title" required className="full">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} autoFocus />
        </Field>
        <Field label="Plan type">
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            {PLAN_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as MarketingPriority })}>
            {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </Field>
        <Field label="Sector" required>
          <select
            value={form.sectorId}
            onChange={(event) => {
              const sectorId = event.target.value
              setForm({ ...form, sectorId, seniorId: sectors.find((sector) => sector.id === sectorId)?.leaderId ?? null })
            }}
          >
            {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
          </select>
        </Field>
        <Field label="Responsible Senior">
          <select value={form.seniorId ?? ''} onChange={(event) => setForm({ ...form, seniorId: event.target.value || null })}>
            <option value="">Unassigned</option>
            {employees.filter((employee) => employee.role === 'senior').map((senior) => (
              <option key={senior.id} value={senior.id}>{senior.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Objective" required className="full">
          <textarea rows={2} value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} />
        </Field>
        <Field label="Target audience" className="full">
          <input value={form.targetAudience} onChange={(event) => setForm({ ...form, targetAudience: event.target.value })} />
        </Field>
        <Field label="Expected results" className="full">
          <textarea rows={2} value={form.expectedResults} onChange={(event) => setForm({ ...form, expectedResults: event.target.value })} />
        </Field>
        <Field label="Budget (₹)">
          <input type="number" min={0} step={10000} value={form.budget} onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })} />
        </Field>
        <Field label="Start date">
          <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
        </Field>
        <Field label="Deadline">
          <input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

export function CampaignFormModal({
  open,
  onClose,
  campaign,
  lockedSectorIds,
}: {
  open: boolean
  onClose: () => void
  campaign?: MarketingCampaign | null
  lockedSectorIds?: string[]
}) {
  const { sectors, employees, createCampaign, updateCampaignStatus } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const availableSectors = useMemo(
    () => (lockedSectorIds?.length ? sectors.filter((sector) => lockedSectorIds.includes(sector.id)) : sectors),
    [sectors, lockedSectorIds],
  )
  const [form, setForm] = useState<CampaignDraft>({
    name: '',
    objective: '',
    sectorId: availableSectors[0]?.id ?? sectors[0]?.id ?? '',
    targetAudience: '',
    startDate: dateOnlyFromNow(0),
    endDate: dateOnlyFromNow(21),
    teamIds: [],
    budget: 150000,
    expectedLeads: 100,
    status: 'Planned',
    priority: 'High',
  })
  useEffect(() => {
    if (!open) return
    if (campaign) {
      setForm({
        name: campaign.name,
        objective: campaign.objective,
        sectorId: campaign.sectorId,
        targetAudience: campaign.targetAudience,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        teamIds: campaign.teamIds,
        budget: campaign.budget,
        expectedLeads: campaign.expectedLeads,
        status: campaign.status,
        priority: campaign.priority,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id])
  const team = employees.filter((employee) => employee.sectorId === form.sectorId && employee.role !== 'manager')
  const canSubmit = form.name.trim().length >= 3 && form.objective.trim().length >= 5
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={campaign ? 'Edit campaign' : 'Create campaign'}
      description="Campaign leads automatically enter the shared Lead Pipeline with the campaign source attached."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!canSubmit}
            onClick={() => {
              if (campaign) {
                updateCampaignStatus(campaign.id, form.status, actor, 'Campaign details updated.')
              } else {
                createCampaign(form, actor)
                pushToast({ title: 'Campaign created', description: 'The campaign is available for sector activities and campaign-attributed leads.', tone: 'success' })
              }
              onClose()
            }}
          >
            {campaign ? 'Save campaign' : 'Create campaign'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Campaign name" required className="full">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus />
        </Field>
        <Field label="Sector">
          <select
            value={form.sectorId}
            onChange={(event) => setForm({ ...form, sectorId: event.target.value, teamIds: [] })}
          >
            {availableSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CampaignStatus })}>
            {CAMPAIGN_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Objective" required className="full">
          <textarea rows={2} value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} />
        </Field>
        <Field label="Target audience" className="full">
          <input value={form.targetAudience} onChange={(event) => setForm({ ...form, targetAudience: event.target.value })} />
        </Field>
        <Field label="Start date">
          <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
        </Field>
        <Field label="End date">
          <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
        </Field>
        <Field label="Budget (₹)">
          <input type="number" min={0} step={10000} value={form.budget} onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })} />
        </Field>
        <Field label="Expected leads">
          <input type="number" min={0} value={form.expectedLeads} onChange={(event) => setForm({ ...form, expectedLeads: Number(event.target.value) })} />
        </Field>
        <Field label="Priority">
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as MarketingPriority })}>
            {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </Field>
        <Field label="Assigned team" className="full" hint="Select the senior and junior members responsible for execution.">
          <div className="mms-check-grid">
            {team.map((member) => {
              const checked = form.teamIds.includes(member.id)
              return (
                <label key={member.id} className={`mms-check-card ${checked ? 'is-checked' : ''}`.trim()}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setForm({
                        ...form,
                        teamIds: checked
                          ? form.teamIds.filter((id) => id !== member.id)
                          : [...form.teamIds, member.id],
                      })
                    }
                  />
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.role === 'senior' ? 'Senior' : 'Junior'} · {member.designation}</small>
                  </span>
                </label>
              )
            })}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

export function ApprovalRequestModal({
  open,
  onClose,
  defaultSectorId,
}: {
  open: boolean
  onClose: () => void
  defaultSectorId?: string | null
}) {
  const { sectors, createApprovalRequest } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [form, setForm] = useState({
    kind: 'Budget Request' as 'Budget Request' | 'Campaign Proposal' | 'Resource Request' | 'Marketing Proposal',
    title: '',
    summary: '',
    sectorId: defaultSectorId ?? sectors[0]?.id ?? '',
    amount: 50000,
  })
  useEffect(() => {
    if (open) setForm((current) => ({ ...current, sectorId: defaultSectorId ?? current.sectorId }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultSectorId])
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit proposal for approval"
      description="Proposals route to the Marketing Manager. Budget-related approvals are forwarded to Finance/Admin for final financial authorization."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={form.title.trim().length < 3 || form.summary.trim().length < 5}
            onClick={() => {
              createApprovalRequest(form, actor)
              pushToast({ title: 'Proposal submitted', description: 'The request is now in the manager approval queue.', tone: 'success' })
              onClose()
            }}
          >
            Submit proposal
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Proposal type">
          <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as typeof form.kind })}>
            <option>Budget Request</option>
            <option>Campaign Proposal</option>
            <option>Resource Request</option>
            <option>Marketing Proposal</option>
          </select>
        </Field>
        <Field label="Sector">
          <select value={form.sectorId} onChange={(event) => setForm({ ...form, sectorId: event.target.value })}>
            {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
          </select>
        </Field>
        <Field label="Title" required className="full">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} autoFocus />
        </Field>
        <Field label="Business summary" required className="full">
          <textarea rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
        </Field>
        <Field label="Estimated amount (₹)" hint="Leave as zero for non-financial proposals.">
          <input type="number" min={0} step={5000} value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} />
        </Field>
      </div>
    </Modal>
  )
}

export function TaskProgressModal({
  open,
  onClose,
  task,
}: {
  open: boolean
  onClose: () => void
  task: MarketingTask | null
}) {
  const { updateTask, addTaskNote } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [progress, setProgress] = useState(0)
  const [note, setNote] = useState('')
  useEffect(() => {
    if (open && task) {
      setProgress(task.progress)
      setNote('')
    }
  }, [open, task])
  if (!task) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update task progress"
      description={task.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              updateTask(task.id, {
                progress,
                status: progress >= 100 ? 'Under Review' : progress > 0 ? 'In Progress' : 'Not Started',
              })
              if (note.trim()) addTaskNote(task.id, note.trim(), actor, 'progress')
              pushToast({ title: 'Task progress updated', description: `${progress}% complete. Your senior sees this update immediately.`, tone: 'success' })
              onClose()
            }}
          >
            Save progress
          </Button>
        </>
      }
    >
      <Field label={`Progress: ${progress}%`}>
        <input type="range" min={0} max={100} step={5} value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="mms-range" />
      </Field>
      <div className="mms-progress mt-8">
        <div className="mms-progress__labels"><span>Completion</span><strong>{progress}%</strong></div>
        <div className="mms-progress__bar"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <Field label="Progress note" className="mt-16">
        <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was completed? Any blockers?" />
      </Field>
    </Modal>
  )
}

export function TaskNoteModal({
  open,
  onClose,
  task,
  kind = 'note',
  title = 'Add task note',
}: {
  open: boolean
  onClose: () => void
  task: MarketingTask | null
  kind?: 'note' | 'issue'
  title?: string
}) {
  const { addTaskNote } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [note, setNote] = useState('')
  useEffect(() => {
    if (open) setNote('')
  }, [open])
  if (!task) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={task.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!note.trim()}
            onClick={() => {
              addTaskNote(task.id, note.trim(), actor, kind)
              pushToast({ title: kind === 'issue' ? 'Issue reported' : 'Note added', tone: kind === 'issue' ? 'warning' : 'success' })
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <Field label="Note">
        <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} autoFocus />
      </Field>
    </Modal>
  )
}

export function ReviewTaskModal({
  open,
  onClose,
  task,
}: {
  open: boolean
  onClose: () => void
  task: MarketingTask | null
}) {
  const { reviewTask } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [note, setNote] = useState('')
  useEffect(() => {
    if (open) setNote('')
  }, [open])
  if (!task) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review submitted work"
      description={task.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              reviewTask(task.id, 'return', actor, note || 'Returned for further work.')
              pushToast({ title: 'Work returned', description: 'The assignee has been notified in the shared workspace.', tone: 'warning' })
              onClose()
            }}
          >
            Return for changes
          </Button>
          <Button
            variant="success"
            onClick={() => {
              reviewTask(task.id, 'approve', actor, note || 'Work reviewed and approved.')
              pushToast({ title: 'Task approved', description: 'The task is marked complete and the manager dashboard is updated.', tone: 'success' })
              onClose()
            }}
          >
            Approve completion
          </Button>
        </>
      }
    >
      <div className="mms-detail-grid">
        <div><span>Assigned to</span><strong>{task.assignedJuniorId ? 'Junior executive' : 'Senior / sector'}</strong></div>
        <div><span>Progress</span><strong>{task.progress}%</strong></div>
        <div><span>Target</span><strong>{task.targetQuantity}</strong></div>
        <div><span>Deadline</span><strong>{new Date(task.deadline).toLocaleDateString('en-IN')}</strong></div>
      </div>
      <Field label="Review comment" className="mt-16">
        <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add feedback for the assignee." />
      </Field>
    </Modal>
  )
}

export function TaskDetailModal({
  open,
  onClose,
  task,
  onAssignSubtask,
}: {
  open: boolean
  onClose: () => void
  task: MarketingTask | null
  onAssignSubtask?: (task: MarketingTask) => void
}) {
  const { employees, tasks, campaigns, sectors } = useMarketingDepartment()
  if (!task) return null
  const senior = employees.find((employee) => employee.id === task.assignedSeniorId)
  const junior = employees.find((employee) => employee.id === task.assignedJuniorId)
  const sector = sectors.find((item) => item.id === task.sectorId)
  const campaign = campaigns.find((item) => item.id === task.campaignId)
  const subtasks = tasks.filter((item) => item.parentId === task.id)
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title={task.title}
      description={`${sector?.name ?? 'Marketing'} · ${task.category}`}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="mms-detail-grid">
        <div><span>Assigned by</span><strong>{task.createdByName}</strong></div>
        <div><span>Senior</span><strong>{senior?.name ?? '—'}</strong></div>
        <div><span>Junior</span><strong>{junior?.name ?? 'Entire sector'}</strong></div>
        <div><span>Status</span><strong>{task.status}</strong></div>
        <div><span>Progress</span><strong>{task.progress}%</strong></div>
        <div><span>Target</span><strong>{task.targetQuantity}</strong></div>
        <div><span>Deadline</span><strong>{new Date(task.deadline).toLocaleDateString('en-IN')}</strong></div>
        <div><span>Budget</span><strong>{formatINR(task.budget)}</strong></div>
      </div>
      <div className="mms-modal-copy">
        <h4>Description</h4>
        <p>{task.description || 'No description provided.'}</p>
        <h4>Expected result</h4>
        <p>{task.expectedResult || 'No expected result documented.'}</p>
        <h4>Instructions</h4>
        <p>{task.instructions || 'No supporting instructions.'}</p>
        {campaign ? <p className="mt-8"><strong>Campaign:</strong> {campaign.name}</p> : null}
      </div>
      {subtasks.length ? (
        <div className="mt-16">
          <h4>Subtasks · {subtasks.length}</h4>
          <div className="mms-subtask-list">
            {subtasks.map((subtask) => {
              const assignee = employees.find((employee) => employee.id === subtask.assignedJuniorId)
              return (
                <div key={subtask.id} className="mms-subtask">
                  <div>
                    <strong>{subtask.title}</strong>
                    <small>{assignee?.name ?? 'Sector team'} · Due {new Date(subtask.deadline).toLocaleDateString('en-IN')}</small>
                  </div>
                  <span>{subtask.progress}%</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
      {task.notes.length ? (
        <div className="mt-16">
          <h4>Activity notes</h4>
          <div className="mms-note-list">
            {task.notes.map((note) => (
              <div key={note.id} className="mms-note">
                <div><strong>{note.authorName}</strong><span>{new Date(note.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
                <p>{note.note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {onAssignSubtask ? (
        <div className="mt-16">
          <Button variant="soft" onClick={() => onAssignSubtask(task)}>Create subtask</Button>
        </div>
      ) : null}
    </Modal>
  )
}

export function yearLaterDate() {
  return yearLater()
}
