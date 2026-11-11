import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
  Target,
  Users,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Field } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import { useMarketingDepartment } from '../../context/MarketingDepartmentContext'
import {
  KpiCard,
  MmsPageHeader,
  MmsProgress,
  MmsTabs,
  SearchField,
  SectionCard,
  MmsSelect,
  StatusChip,
  PriorityChip,
  SectorChip,
  EmployeeAvatar,
  useMmsActor,
  useMmsScope,
  EmptyBlock,
} from '../../components/marketing/management/MmsKit'
import {
  MmsKpiGrid,
  MmsTwoCol,
  TaskBoard,
  TaskCard,
} from '../../components/marketing/management/MmsLists'
import {
  ReviewTaskModal,
  TaskDetailModal,
  TaskFormModal,
  TaskNoteModal,
  TaskProgressModal,
} from '../../components/marketing/management/MmsModals'
import type { MarketingPriority, MarketingTask, MarketingTaskStatus } from '../../types/marketingDepartment'
import { employeeStats, priorityRank, taskStats, taskTone, shortDate } from '../../utils/marketingDepartment'
import { formatINR, formatPercent } from '../../utils/format'
import { useToast } from '../../context/ToastContext'

const STATUS_FILTERS: Array<{ id: string; label: string; status?: MarketingTaskStatus }> = [
  { id: 'active', label: 'Active' },
  { id: 'review', label: 'Review', status: 'Under Review' },
  { id: 'completed', label: 'Completed', status: 'Completed' },
  { id: 'blocked', label: 'Blocked', status: 'Blocked' },
  { id: 'all', label: 'All' },
]

const PRIORITY_ORDER: MarketingPriority[] = ['Urgent', 'High', 'Medium', 'Low']

/* ------------------------------------------------------------------ */
/* Work Assignment Center                                              */
/* ------------------------------------------------------------------ */

export function WorkAssignmentPage({ mode = 'center' }: { mode?: 'center' | 'senior' }) {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [tab, setTab] = useState('list')
  const [query, setQuery] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reassignTask, setReassignTask] = useState<MarketingTask | null>(null)
  const [extensionTask, setExtensionTask] = useState<MarketingTask | null>(null)
  const [taskModal, setTaskModal] = useState<{ open: boolean; parent?: MarketingTask | null; sectorId?: string | null; seniorId?: string | null; juniorId?: string | null }>({ open: false })
  const [detailTask, setDetailTask] = useState<MarketingTask | null>(null)
  const [progressTask, setProgressTask] = useState<MarketingTask | null>(null)
  const [reviewTask, setReviewTask] = useState<MarketingTask | null>(null)
  const [noteTask, setNoteTask] = useState<MarketingTask | null>(null)

  const sectors = mode === 'senior' ? scope.mySectors : department.sectors
  const tasks = scope.tasks
  const stats = taskStats(tasks)
  const team = mode === 'senior' ? scope.team : department.employees.filter((employee) => employee.role === 'junior')
  const seniors = department.employees.filter((employee) => employee.role === 'senior')
  const juniors = department.employees.filter((employee) => employee.role === 'junior')
  const sectorOptions = sectors.map((sector) => ({ value: sector.id, label: sector.name }))
  const taskTemplates = [
    { title: 'Field visits and lead capture', detail: 'Visit target businesses, capture verified leads and schedule the first follow-up.', quantity: 30 },
    { title: 'Customer follow-up sprint', detail: 'Complete every scheduled follow-up with a recorded outcome and next action.', quantity: 20 },
    { title: 'Campaign activation', detail: 'Execute the campaign activity calendar and log participation.', quantity: 1 },
    { title: 'Data quality clean-up', detail: 'Verify phone numbers, requirements and duplicate records in the assigned sector.', quantity: 40 },
  ]

  const filtered = tasks
    .filter((task) => (sectorFilter === 'all' ? true : task.sectorId === sectorFilter))
    .filter((task) => (priorityFilter === 'all' ? true : task.priority === priorityFilter))
    .filter((task) => (statusFilter === 'all' ? true : task.status === statusFilter))
    .filter((task) => `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))

  function duplicate(task: MarketingTask) {
    const created = department.addTask(
      {
        title: `${task.title} (copy)`,
        sectorId: task.sectorId,
        assigneeType: task.assigneeType,
        assignedSeniorId: task.assignedSeniorId,
        assignedJuniorId: task.assignedJuniorId,
        category: task.category,
        description: task.description,
        expectedResult: task.expectedResult,
        targetQuantity: task.targetQuantity,
        startDate: task.startDate,
        deadline: task.deadline,
        priority: task.priority,
        budget: task.budget,
        instructions: task.instructions,
        source: task.source,
        parentId: task.parentId,
        campaignId: task.campaignId,
      },
      actor,
    )
    pushToast({ title: 'Task duplicated', description: `${created.title} is ready for assignment.`, tone: 'success' })
  }

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={mode === 'senior' ? 'Senior workspace' : 'Manager workspace'}
        title={mode === 'senior' ? 'Work Assignment' : 'Work Assignment Center'}
        subtitle={
          mode === 'senior'
            ? 'Turn manager assignments into clear junior work with deadlines, targets and expected results.'
            : 'Create work across sectors, assign seniors or juniors, and monitor delivery in one place.'
        }
        actions={
          <>
            <Button variant="soft" icon={<Target size={15} />} onClick={() => setTaskModal({ open: true, sectorId: sectors[0]?.id })}>Use template</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setTaskModal({ open: true, sectorId: sectors[0]?.id })}>Create task</Button>
          </>
        }
        meta={
          <div className="mms-header-meta">
            <span><ClipboardList size={13} /> {stats.total} tasks</span>
            <span><AlertTriangle size={13} /> {stats.overdue} overdue</span>
            <span><Users size={13} /> {team.length} assignable juniors</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Active work" value={stats.pending} icon={<ClipboardList size={18} />} tone="var(--chart-1)" hint={`${stats.inProgress} in progress`} />
        <KpiCard label="Awaiting review" value={stats.review} icon={<CheckCircle2 size={18} />} tone="var(--chart-4)" hint="Junior submissions to validate" />
        <KpiCard label="Completed" value={stats.completed} icon={<CheckCircle2 size={18} />} tone="var(--chart-2)" hint={`${stats.completion}% completion rate`} />
        <KpiCard label="Overdue" value={stats.overdue} icon={<AlertTriangle size={18} />} tone="var(--chart-7)" hint="Past deadline and still open" />
      </MmsKpiGrid>

      <div className="mms-template-strip">
        {taskTemplates.map((template) => (
          <button
            key={template.title}
            type="button"
            onClick={() =>
              setTaskModal({
                open: true,
                sectorId: sectors[0]?.id,
                juniorId: mode === 'senior' ? team[0]?.id : undefined,
              })
            }
          >
            <span><Target size={14} /></span>
            <div>
              <strong>{template.title}</strong>
              <small>{template.detail}</small>
            </div>
            <em>{template.quantity}</em>
          </button>
        ))}
      </div>

      <div className="mms-toolbar-row mms-toolbar-row--wrap">
        <MmsTabs
          value={tab}
          onChange={setTab}
          ariaLabel="Assignment view"
          options={[
            { id: 'list', label: 'Assignment list' },
            { id: 'board', label: 'Kanban board' },
          ]}
        />
        <div className="mms-toolbar-filters">
          <SearchField value={query} onChange={setQuery} placeholder="Search tasks…" />
          <MmsSelect label="Sector" value={sectorFilter} onChange={setSectorFilter} options={sectorOptions} />
          <MmsSelect label="Status" value={statusFilter} onChange={setStatusFilter} allLabel="All statuses" options={['Not Started', 'In Progress', 'Under Review', 'Completed', 'Blocked'].map((status) => ({ value: status, label: status }))} />
          <label className="mms-select">
            <span>Priority</span>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="all">All</option>
              {PRIORITY_ORDER.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </label>
        </div>
      </div>

      {tab === 'board' ? (
        <TaskBoard
          tasks={filtered}
          employees={department.employees}
          sectors={department.sectors}
          onOpen={setDetailTask}
          onProgress={(task) => {
            if (task.status === 'Under Review') setReviewTask(task)
            else setProgressTask(task)
          }}
        />
      ) : (
        <SectionCard title="Assignment register" subtitle={`${filtered.length} tasks in view`} flush>
          <div className="mms-table-wrap">
            <table className="mms-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Sector</th>
                  <th>Owner</th>
                  <th>Priority</th>
                  <th>Deadline</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => {
                  const junior = department.employees.find((employee) => employee.id === task.assignedJuniorId)
                  const senior = department.employees.find((employee) => employee.id === task.assignedSeniorId)
                  const pendingExtension = (task.extensionRequests ?? []).find((request) => request.status === 'Pending')
                  const expanded = expandedId === task.id
                  const canManage = scope.roleId === 'manager' || mode === 'senior'
                  return (
                    <Fragment key={task.id}>
                      <tr className={expanded ? 'is-expanded' : ''}>
                        <td>
                          <button type="button" className="mms-plan-title-btn" onClick={() => setExpandedId(expanded ? null : task.id)}>
                            <List size={13} className={expanded ? 'is-open' : ''} />
                            <span>
                              <strong>{task.title}</strong>
                              <small>{task.category} · {task.source}</small>
                            </span>
                          </button>
                        </td>
                        <td><SectorChip sector={department.sectors.find((sector) => sector.id === task.sectorId)} compact /></td>
                        <td><EmployeeAvatar employee={junior ?? senior} /></td>
                        <td><PriorityChip priority={task.priority} /></td>
                        <td>
                          <span className="mms-cell-stack">
                            <strong>{shortDate(task.deadline)}</strong>
                            {task.originalDeadline && task.originalDeadline !== task.deadline ? <small>Originally {shortDate(task.originalDeadline)}</small> : null}
                            {pendingExtension ? <Badge tone="warning" dot>Extension pending</Badge> : null}
                          </span>
                        </td>
                        <td><div className="mms-target-cell"><span>{task.progress}%</span><MmsProgress value={task.progress} /></div></td>
                        <td><StatusChip status={task.status} tone={taskTone(task.status)} /></td>
                        <td>
                          <div className="mms-table__actions">
                            <Button size="xs" variant="ghost" onClick={() => setDetailTask(task)}>Open</Button>
                            {canManage && task.status !== 'Completed' ? (
                              <Button size="xs" variant="ghost" onClick={() => setReassignTask(task)}>Reassign</Button>
                            ) : null}
                            {pendingExtension && scope.roleId === 'manager' ? (
                              <Button size="xs" variant="soft" onClick={() => setExtensionTask(task)}>Extension</Button>
                            ) : null}
                            {!pendingExtension && task.status !== 'Completed' && !canManage ? (
                              <Button size="xs" variant="ghost" onClick={() => setExtensionTask(task)}>Request extension</Button>
                            ) : null}
                            <Button size="xs" variant="ghost" onClick={() => setTaskModal({ open: true, parent: task, sectorId: task.sectorId, seniorId: task.assignedSeniorId, juniorId: task.assignedJuniorId })}>Subtask</Button>
                            <Button size="xs" variant="ghost" onClick={() => duplicate(task)} title="Duplicate"><Copy size={12} /></Button>
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="mms-expand-row">
                          <td colSpan={8}>
                            <div className="mms-assignment-detail">
                              <div>
                                <h4>Assignment history</h4>
                                <ol className="mms-audit-list">
                                  {(task.assignmentHistory ?? []).map((event) => (
                                    <li key={event.id}>
                                      <span className="mms-audit-dot" />
                                      <div>
                                        <strong>{event.assignedByName} reassigned work</strong>
                                        <small>{new Date(event.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                                        <p>{event.note}</p>
                                      </div>
                                    </li>
                                  ))}
                                  {!(task.assignmentHistory ?? []).length ? <p className="mms-empty-line">No assignment changes recorded.</p> : null}
                                </ol>
                              </div>
                              <div>
                                <h4>Extension requests</h4>
                                <ol className="mms-audit-list">
                                  {(task.extensionRequests ?? []).map((request) => (
                                    <li key={request.id}>
                                      <span className={`mms-audit-dot is-${request.status.toLowerCase()}`} />
                                      <div>
                                        <strong>{request.requestedByName} · {request.status}</strong>
                                        <small>Original {shortDate(request.originalDeadline)} → proposed {shortDate(request.proposedDeadline)}</small>
                                        <p>{request.reason}</p>
                                        {request.decisionNote ? <p className="mms-audit-note">Manager note: {request.decisionNote}</p> : null}
                                      </div>
                                    </li>
                                  ))}
                                  {!(task.extensionRequests ?? []).length ? <p className="mms-empty-line">No extension requests.</p> : null}
                                </ol>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
            {!filtered.length ? <EmptyBlock icon={<ClipboardList size={20} />} title="No tasks match these filters" description="Change the sector or priority filter." /> : null}
          </div>
        </SectionCard>
      )}

      <MmsTwoCol variant="1-1">
        <SectionCard title="Load balance" subtitle="Open work by junior">
          <div className="mms-load-list">
            {team.map((member) => {
              const memberTasks = tasks.filter((task) => task.assignedJuniorId === member.id && task.status !== 'Completed')
              const stat = employeeStats(member, department.leads, department.tasks, department.followUps, department.activities)
              return (
                <div key={member.id}>
                  <EmployeeAvatar employee={member} />
                  <span>{memberTasks.length} open</span>
                  <div className="mms-load-list__bar"><span style={{ width: `${Math.min(100, memberTasks.length * 18)}%` }} /></div>
                  <small>{stat.pendingTasks} pending</small>
                </div>
              )
            })}
            {!team.length ? <p className="mms-empty-line">No juniors available in this scope.</p> : null}
          </div>
        </SectionCard>
        <SectionCard title="Assignment rules" subtitle="How this workspace behaves">
          <ul className="mms-rule-list">
            <li><CheckCircle2 size={14} /> Managers can assign work to any sector, senior or junior.</li>
            <li><CheckCircle2 size={14} /> Seniors can split manager work into junior subtasks but cannot alter department structure.</li>
            <li><CheckCircle2 size={14} /> Junior progress and notes are visible to the senior and manager.</li>
            <li><CheckCircle2 size={14} /> Reviewing a completed task records the decision in the audit trail.</li>
          </ul>
        </SectionCard>
      </MmsTwoCol>

      <TaskFormModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false })}
        parentTask={taskModal.parent ?? null}
        initialSectorId={taskModal.sectorId}
        initialSeniorId={taskModal.seniorId ?? (mode === 'senior' ? actor.id : null)}
        initialJuniorId={taskModal.juniorId}
      />
      <TaskDetailModal
        open={Boolean(detailTask)}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onAssignSubtask={(task) =>
          setTaskModal({ open: true, parent: task, sectorId: task.sectorId, seniorId: task.assignedSeniorId, juniorId: task.assignedJuniorId })
        }
      />
      <TaskProgressModal open={Boolean(progressTask)} task={progressTask} onClose={() => setProgressTask(null)} />
      <TaskNoteModal open={Boolean(noteTask)} task={noteTask} onClose={() => setNoteTask(null)} />
      <ReviewTaskModal open={Boolean(reviewTask)} task={reviewTask} onClose={() => setReviewTask(null)} />
      <TaskReassignModal task={reassignTask} onClose={() => setReassignTask(null)} />
      <TaskExtensionModal task={extensionTask} onClose={() => setExtensionTask(null)} />
    </div>
  )
}

function TaskReassignModal({ task, onClose }: { task: MarketingTask | null; onClose: () => void }) {
  const { employees, reassignTask } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [assigneeType, setAssigneeType] = useState<MarketingTask['assigneeType']>('junior')
  const [seniorId, setSeniorId] = useState('')
  const [juniorId, setJuniorId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!task) return
    setAssigneeType(task.assigneeType)
    setSeniorId(task.assignedSeniorId ?? '')
    setJuniorId(task.assignedJuniorId ?? '')
    setDeadline(task.deadline)
    setNote('')
  }, [task?.id])

  if (!task) return null
  const seniors = employees.filter((employee) => employee.role === 'senior')
  const juniors = employees.filter((employee) => employee.role === 'junior' && employee.sectorId === task.sectorId)
  const valid = assigneeType === 'sector' ? Boolean(seniorId) : assigneeType === 'senior' ? Boolean(seniorId) : Boolean(juniorId)

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Reassign work"
      description="Move this task to another senior, junior or sector team. The change is recorded in the assignment history."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => {
              reassignTask(
                task.id,
                {
                  assigneeType,
                  assignedSeniorId: seniorId || null,
                  assignedJuniorId: assigneeType === 'junior' ? juniorId || null : null,
                  deadline: deadline || undefined,
                  note: note || 'Assignment updated.',
                },
                actor,
              )
              pushToast({ title: 'Work reassigned', description: `${task.title} now has an updated owner.`, tone: 'success' })
              onClose()
            }}
          >
            Save assignment
          </Button>
        </>
      }
    >
      <div className="mms-stack">
        <div className="mms-decision-summary">
          <div><span>Task</span><strong>{task.title}</strong></div>
          <div><span>Current owner</span><strong>{employees.find((employee) => employee.id === (task.assignedJuniorId ?? task.assignedSeniorId))?.name ?? 'Sector team'}</strong></div>
          <div><span>Deadline</span><strong>{shortDate(task.deadline)}</strong></div>
          <div><span>Progress</span><strong>{task.progress}%</strong></div>
        </div>
        <Field label="Assign to">
          <select value={assigneeType} onChange={(event) => setAssigneeType(event.target.value as MarketingTask['assigneeType'])}>
            <option value="sector">Sector team</option>
            <option value="senior">A senior executive</option>
            <option value="junior">A junior executive</option>
          </select>
        </Field>
        <Field label="Senior owner">
          <select value={seniorId} onChange={(event) => setSeniorId(event.target.value)}>
            <option value="">Unassigned</option>
            {seniors.map((senior) => <option key={senior.id} value={senior.id}>{senior.name}</option>)}
          </select>
        </Field>
        {assigneeType === 'junior' ? (
          <Field label="Junior executive" hint="Only juniors in the task sector are listed.">
            <select value={juniorId} onChange={(event) => setJuniorId(event.target.value)}>
              <option value="">Select a junior</option>
              {juniors.map((junior) => <option key={junior.id} value={junior.id}>{junior.name}</option>)}
            </select>
          </Field>
        ) : null}
        <Field label="Deadline">
          <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
        </Field>
        <Field label="Reassignment note">
          <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why is this work moving?" />
        </Field>
      </div>
    </Modal>
  )
}

function TaskExtensionModal({ task, onClose }: { task: MarketingTask | null; onClose: () => void }) {
  const { requestTaskExtension, decideTaskExtension } = useMarketingDepartment()
  const scope = useMmsScope()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [reason, setReason] = useState('')
  const [proposedDeadline, setProposedDeadline] = useState('')
  const [decisionNote, setDecisionNote] = useState('')

  useEffect(() => {
    if (!task) return
    setReason('')
    setProposedDeadline(task.deadline)
    setDecisionNote('')
  }, [task?.id])

  if (!task) return null
  const pending = (task.extensionRequests ?? []).find((request) => request.status === 'Pending')
  const canDecide = Boolean(pending) && scope.roleId === 'manager'

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={canDecide ? 'Manager extension decision' : 'Request deadline extension'}
      description={
        canDecide
          ? 'Review the proposed date and reason. Approving keeps the original deadline in history and moves the working deadline.'
          : 'Submit a reason and proposed date. The original deadline is preserved and the manager records the decision.'
      }
      footer={
        canDecide ? (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="danger" onClick={() => {
              decideTaskExtension(task.id, pending!.id, 'reject', actor, decisionNote || 'Extension declined.')
              pushToast({ title: 'Extension rejected', description: 'The original deadline remains in place.', tone: 'warning' })
              onClose()
            }}>Reject extension</Button>
            <Button variant="primary" onClick={() => {
              decideTaskExtension(task.id, pending!.id, 'approve', actor, decisionNote || 'Extension approved.')
              pushToast({ title: 'Extension approved', description: `New deadline: ${shortDate(pending!.proposedDeadline)}.`, tone: 'success' })
              onClose()
            }}>Approve extension</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!reason.trim() || !proposedDeadline}
              onClick={() => {
                requestTaskExtension(task.id, reason, proposedDeadline, actor)
                pushToast({ title: 'Extension requested', description: 'Your manager can now review the proposed deadline.', tone: 'success' })
                onClose()
              }}
            >
              Submit request
            </Button>
          </>
        )
      }
    >
      <div className="mms-stack">
        <div className="mms-decision-summary">
          <div><span>Task</span><strong>{task.title}</strong></div>
          <div><span>Original deadline</span><strong>{shortDate(task.originalDeadline ?? task.deadline)}</strong></div>
          <div><span>Current deadline</span><strong>{shortDate(task.deadline)}</strong></div>
          <div><span>Progress</span><strong>{task.progress}%</strong></div>
        </div>
        {canDecide && pending ? (
          <>
            <div className="mms-inline-callout">
              <strong>{pending.requestedByName} requested {shortDate(pending.proposedDeadline)}</strong>
              <p>{pending.reason}</p>
            </div>
            <Field label="Manager decision note">
              <textarea rows={3} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Add the rationale for the decision…" />
            </Field>
          </>
        ) : (
          <>
            <Field label="Reason for extension" required>
              <textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why the current deadline cannot be met…" />
            </Field>
            <Field label="Proposed deadline" required hint="The original deadline stays visible in task and approval history.">
              <input type="date" value={proposedDeadline} onChange={(event) => setProposedDeadline(event.target.value)} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Tasks workspace (all roles)                                         */
/* ------------------------------------------------------------------ */

export function TasksPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const actor = useMmsActor()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [filter, setFilter] = useState('active')
  const [query, setQuery] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [taskModal, setTaskModal] = useState(false)
  const [detailTask, setDetailTask] = useState<MarketingTask | null>(null)
  const [progressTask, setProgressTask] = useState<MarketingTask | null>(null)
  const [reviewTask, setReviewTask] = useState<MarketingTask | null>(null)
  const [noteTask, setNoteTask] = useState<MarketingTask | null>(null)

  const stats = taskStats(scope.tasks)
  const sectors = scope.mySectors.length ? scope.mySectors : department.sectors
  const allTasks = scope.tasks
    .filter((task) => {
      if (filter === 'active') return task.status !== 'Completed'
      if (filter === 'review') return task.status === 'Under Review'
      if (filter === 'completed') return task.status === 'Completed'
      if (filter === 'blocked') return task.status === 'Blocked'
      return true
    })
    .filter((task) => (sectorFilter === 'all' ? true : task.sectorId === sectorFilter))
    .filter((task) => `${task.title} ${task.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))

  const myOpen = scope.tasks.filter((task) => task.status !== 'Completed')
  const myReview = scope.tasks.filter((task) => task.status === 'Under Review')

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'manager' ? 'Manager workspace' : scope.roleId === 'senior' ? 'Senior workspace' : 'Junior workspace'}
        title={scope.roleId === 'junior' ? 'My Tasks' : scope.roleId === 'senior' ? 'My Tasks & Team Review' : 'Task Oversight'}
        subtitle={
          scope.roleId === 'junior'
            ? 'Execute assigned work, update progress and submit completed work for senior review.'
            : scope.roleId === 'senior'
              ? 'Your manager assignments plus junior work awaiting your review.'
              : 'Department-wide task delivery, reviews and overdue work.'
        }
        actions={
          scope.roleId !== 'junior' ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setTaskModal(true)}>Create task</Button>
          ) : (
            <Button variant="soft" icon={<Target size={15} />} onClick={() => setFilter('active')}>Show active work</Button>
          )
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Open tasks" value={stats.pending} icon={<ClipboardList size={18} />} tone="var(--chart-3)" hint={`${stats.inProgress} in progress`} />
        <KpiCard label="Awaiting review" value={stats.review} icon={<CheckCircle2 size={18} />} tone="var(--chart-4)" hint={scope.roleId === 'junior' ? 'Submitted for validation' : 'Ready for your decision'} />
        <KpiCard label="Completed" value={stats.completed} icon={<CheckCircle2 size={18} />} tone="var(--chart-2)" hint={`${stats.completion}% completion`} />
        <KpiCard label="Overdue" value={stats.overdue} icon={<AlertTriangle size={18} />} tone="var(--chart-7)" hint="Needs attention today" />
      </MmsKpiGrid>

      {scope.roleId === 'senior' && myReview.length ? (
        <SectionCard title="Junior submissions awaiting review" subtitle="Approve to close the task or return it with guidance" icon={<CheckCircle2 size={16} />}>
          <div className="mms-review-strip">
            {myReview.map((task) => (
              <div key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <small>{department.employees.find((employee) => employee.id === task.assignedJuniorId)?.name ?? 'Junior'} · {task.progress}%</small>
                </div>
                <Button size="xs" variant="primary" onClick={() => setReviewTask(task)}>Review</Button>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="mms-toolbar-row mms-toolbar-row--wrap">
        <MmsTabs
          value={filter}
          onChange={setFilter}
          ariaLabel="Task filters"
          options={STATUS_FILTERS.map((item) => ({
            id: item.id,
            label: item.label,
            count:
              item.id === 'active'
                ? scope.tasks.filter((task) => task.status !== 'Completed').length
                : item.id === 'all'
                  ? scope.tasks.length
                  : scope.tasks.filter((task) => task.status === item.status).length,
          }))}
        />
        <div className="mms-toolbar-filters">
          <SearchField value={query} onChange={setQuery} placeholder="Search tasks…" />
          <MmsSelect label="Sector" value={sectorFilter} onChange={setSectorFilter} options={sectors.map((sector) => ({ value: sector.id, label: sector.name }))} />
          <div className="mms-view-toggle">
            <button type="button" className={view === 'board' ? 'is-active' : ''} onClick={() => setView('board')} aria-label="Board view"><LayoutGrid size={14} /></button>
            <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={14} /></button>
          </div>
        </div>
      </div>

      {view === 'board' ? (
        <TaskBoard
          tasks={allTasks}
          employees={department.employees}
          sectors={department.sectors}
          onOpen={setDetailTask}
          onProgress={(task) => (task.status === 'Under Review' ? setReviewTask(task) : setProgressTask(task))}
        />
      ) : (
        <SectionCard title="Task register" subtitle={`${allTasks.length} tasks`} flush>
          <div className="mms-table-wrap">
            <table className="mms-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Sector</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {allTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <button type="button" className="mms-table__link" onClick={() => setDetailTask(task)}>{task.title}</button>
                      <small className="mms-table__sub">{task.progress}% · {task.category}</small>
                    </td>
                    <td><SectorChip sector={department.sectors.find((sector) => sector.id === task.sectorId)} compact /></td>
                    <td><EmployeeAvatar employee={department.employees.find((employee) => employee.id === task.assignedJuniorId) ?? department.employees.find((employee) => employee.id === task.assignedSeniorId)} /></td>
                    <td><PriorityChip priority={task.priority} /></td>
                    <td>{shortDate(task.deadline)}</td>
                    <td><StatusChip status={task.status} tone={taskTone(task.status)} /></td>
                    <td>
                      <div className="mms-table__actions">
                        <Button size="xs" variant="ghost" onClick={() => setProgressTask(task)}>Progress</Button>
                        <Button size="xs" variant="ghost" onClick={() => setNoteTask(task)}>Note</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!allTasks.length ? <EmptyBlock icon={<ClipboardList size={20} />} title="No tasks in this view" description="Try a different filter or ask your senior for the next priority." /> : null}
          </div>
        </SectionCard>
      )}

      <MmsTwoCol variant="1-1">
        <SectionCard title="My workload" subtitle="Your open tasks, follow-ups and reviews">
          <div className="mms-workload">
            <div><span>Open tasks</span><strong>{myOpen.length}</strong><MmsProgress value={stats.completion} label="Completion" /></div>
            <div><span>Awaiting review</span><strong>{myReview.length}</strong><p>Submitted tasks need a senior or manager decision before they close.</p></div>
            <div><span>Follow-ups</span><strong>{scope.followUps.filter((followUp) => followUp.status === 'Scheduled').length}</strong><p>Scheduled customer conversations across your leads.</p></div>
          </div>
        </SectionCard>
        <SectionCard title="Recently updated" subtitle="Last movement across the task board">
          <ol className="mms-simple-list">
            {[...scope.tasks]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 5)
              .map((task) => (
                <li key={task.id}>
                  <span><strong>{task.title}</strong><small>{task.assignedJuniorId ? department.employees.find((employee) => employee.id === task.assignedJuniorId)?.name : 'Team'} · {shortDate(task.updatedAt)}</small></span>
                  <StatusChip status={task.status} tone={taskTone(task.status)} />
                </li>
              ))}
          </ol>
        </SectionCard>
      </MmsTwoCol>

      <TaskFormModal open={taskModal} onClose={() => setTaskModal(false)} initialSectorId={sectors[0]?.id} initialSeniorId={scope.roleId === 'senior' ? actor.id : null} />
      <TaskDetailModal open={Boolean(detailTask)} task={detailTask} onClose={() => setDetailTask(null)} />
      <TaskProgressModal open={Boolean(progressTask)} task={progressTask} onClose={() => setProgressTask(null)} />
      <TaskNoteModal open={Boolean(noteTask)} task={noteTask} onClose={() => setNoteTask(null)} />
      <ReviewTaskModal open={Boolean(reviewTask)} task={reviewTask} onClose={() => setReviewTask(null)} />
    </div>
  )
}
