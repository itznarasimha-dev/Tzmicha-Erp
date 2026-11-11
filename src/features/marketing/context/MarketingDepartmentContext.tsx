import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  ApprovalRequestDraft,
  CampaignDraft,
  FollowUpExtensionRequest,
  IdeaDraft,
  LeadDraft,
  LeadFollowUp,
  LeadStage,
  MarketingActivity,
  MarketingApprovalRequest,
  MarketingCampaign,
  MarketingDepartmentState,
  MarketingEmployee,
  MarketingExpense,
  MarketingFollowUp,
  MarketingIdea,
  MarketingLead,
  MarketingPlan,
  MarketingSector,
  MarketingTask,
  MarketingTeamRequest,
  MarketingTimelineEntry,
  MarketingWalletAllocation,
  PlanDraft,
  PlanStatus,
  SectorDraft,
  TaskDraft,
  ExpenseDraft,
} from '../types/marketingDepartment'
import { buildMarketingDepartmentSeed } from '../data/marketingDepartment'
import { uid } from '../utils/format'
import { dateOnlyFromNow } from '../utils/dates'

const STORAGE_KEY = 'totally-erp-marketing-department-v1'

export interface Actor {
  id: string
  name: string
  role: string
  roleLabel: string
}

interface HandoverDraft {
  salesRepId: string
  salesRepName: string
  notes: string
  priority: MarketingLead['priority']
  nextActionDate: string
}

interface TeamRequestDraft {
  employeeName: string
  employeeEmail: string
  reason: string
  targetLeads: number
  sectorId: string
}

interface ReassignmentInput {
  assigneeType: MarketingTask['assigneeType']
  assignedSeniorId: string | null
  assignedJuniorId: string | null
  deadline?: string
  note: string
}

interface LeadCallInput {
  mode: MarketingFollowUp['mode']
  outcome: LeadFollowUp['result']
  notes: string
  nextActionAt: string | null
}

interface SalesHandoverInput {
  salesStatus: NonNullable<MarketingLead['handover']>['salesStatus']
  salesProgress: number
  note: string
}

interface MarketingDepartmentContextValue extends MarketingDepartmentState {
  createSector: (draft: SectorDraft, actor: Actor) => MarketingSector
  updateSector: (id: string, patch: Partial<MarketingSector>) => void
  deactivateSector: (id: string) => void
  assignSectorLeader: (sectorId: string, seniorId: string | null) => void
  addEmployee: (draft: {
    name: string
    email: string
    phone?: string
    role: 'senior' | 'junior'
    designation: string
    sectorId: string
    location: string
    targetLeads: number
  }) => MarketingEmployee
  transferEmployee: (employeeId: string, sectorId: string) => void
  setSectorTargets: (sectorId: string, monthlyLeadTarget: number, monthlyActivityTarget: number) => void
  allocateBudget: (sectorId: string, totalBudget: number, actor: Actor) => void

  addTask: (draft: TaskDraft, actor: Actor) => MarketingTask
  updateTask: (id: string, patch: Partial<MarketingTask>) => void
  addTaskNote: (
    id: string,
    note: string,
    actor: Actor,
    kind: MarketingTask['notes'][number]['kind'],
  ) => void
  reviewTask: (id: string, decision: 'approve' | 'return', actor: Actor, note: string) => void
  reassignTask: (id: string, input: ReassignmentInput, actor: Actor) => void
  requestTaskExtension: (
    id: string,
    reason: string,
    proposedDeadline: string,
    actor: Actor,
  ) => void
  decideTaskExtension: (
    taskId: string,
    requestId: string,
    decision: 'approve' | 'reject',
    actor: Actor,
    note: string,
  ) => void

  createPlan: (draft: PlanDraft, actor: Actor) => MarketingPlan
  updatePlan: (id: string, patch: Partial<MarketingPlan>, actor: Actor, note?: string) => void
  updatePlanStatus: (id: string, status: MarketingPlan['status'], actor: Actor, note?: string) => void
  submitPlan: (id: string, actor: Actor) => void
  decidePlanManager: (
    id: string,
    decision: 'approve' | 'reject' | 'changes',
    actor: Actor,
    note: string,
  ) => void
  decidePlanFinance: (
    id: string,
    decision: 'approve' | 'reject',
    actor: Actor,
    note: string,
  ) => void
  createCampaign: (draft: CampaignDraft, actor: Actor) => MarketingCampaign
  updateCampaignStatus: (id: string, status: MarketingCampaign['status'], actor: Actor, note?: string) => void

  addLead: (draft: LeadDraft, actor: Actor) => MarketingLead
  updateLeadStage: (
    id: string,
    stage: LeadStage,
    actor: Actor,
    action: string,
    note: string,
    patch?: Partial<MarketingLead>,
  ) => void
  scheduleFollowUp: (input: {
    leadId: string
    dueAt: string
    mode: MarketingFollowUp['mode']
    employeeId: string
    notes: string
  }) => MarketingFollowUp
  completeFollowUp: (
    id: string,
    result: string,
    notes: string,
    nextActionAt: string | null,
    actor: Actor,
  ) => void
  rescheduleFollowUp: (id: string, dueAt: string, notes: string) => void
  requestFollowUpExtension: (
    id: string,
    reason: string,
    proposedDueAt: string,
    actor: Actor,
  ) => void
  requestFollowUpInProgress: (id: string, reason: string, actor: Actor) => void
  decideFollowUpExtension: (
    followUpId: string,
    requestId: string,
    decision: 'approve' | 'reject',
    actor: Actor,
    note: string,
  ) => void
  addLeadRemark: (leadId: string, note: string, actor: Actor) => void
  logLeadCall: (leadId: string, input: LeadCallInput, actor: Actor) => void

  submitExpense: (draft: ExpenseDraft, actor: Actor) => MarketingExpense
  advanceExpense: (
    id: string,
    status: MarketingExpense['status'],
    action: string,
    actor: Actor,
    comments: string,
  ) => void

  submitIdea: (draft: IdeaDraft, actor: Actor) => MarketingIdea
  reviewIdea: (
    id: string,
    status: MarketingIdea['status'],
    actor: Actor,
    feedback: { managerFeedback?: string; seniorFeedback?: string },
    action: string,
  ) => void

  createApprovalRequest: (draft: ApprovalRequestDraft, actor: Actor) => MarketingApprovalRequest
  decideApprovalRequest: (
    id: string,
    status: MarketingApprovalRequest['status'],
    actor: Actor,
    note: string,
  ) => void

  logActivity: (draft: Omit<MarketingActivity, 'id' | 'employeeName'>, actor: Actor) => MarketingActivity
  assignHandover: (leadId: string, draft: HandoverDraft, actor: Actor) => boolean
  updateSalesHandover: (leadId: string, input: SalesHandoverInput, actor: Actor) => void
  createTeamRequest: (draft: TeamRequestDraft, actor: Actor) => MarketingTeamRequest
  decideTeamRequest: (
    id: string,
    decision: 'approve' | 'reject',
    actor: Actor,
    note: string,
  ) => void
  allocateWallet: (employeeId: string, month: string, amount: number, actor: Actor) => void
  resetDepartment: () => void
}

const MarketingDepartmentContext = createContext<MarketingDepartmentContextValue | null>(null)

const LEGACY_PLAN_STATUS: Record<string, PlanStatus> = {
  'In Review': 'Pending Manager Review',
  Approved: 'Pending Finance Approval',
}

function hydrate(): MarketingDepartmentState {
  const seed = buildMarketingDepartmentSeed()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed
    const parsed = JSON.parse(raw) as Partial<MarketingDepartmentState>
    if (!parsed || typeof parsed !== 'object') return seed
    const now = new Date().toISOString()
    const plans = (Array.isArray(parsed.plans) ? parsed.plans : seed.plans).map((plan) => {
      const normalized = LEGACY_PLAN_STATUS[plan.status] ?? plan.status
      return {
        ...plan,
        status: normalized,
        history: Array.isArray(plan.history) ? plan.history : [],
      }
    })
    const tasks = (Array.isArray(parsed.tasks) ? parsed.tasks : seed.tasks).map((task) => ({
      ...task,
      originalDeadline: task.originalDeadline ?? task.deadline,
      assignmentHistory: Array.isArray(task.assignmentHistory) ? task.assignmentHistory : [],
      extensionRequests: Array.isArray(task.extensionRequests) ? task.extensionRequests : [],
    }))
    const followUps = (Array.isArray(parsed.followUps) ? parsed.followUps : seed.followUps).map((followUp) => ({
      ...followUp,
      originalDueAt: followUp.originalDueAt ?? followUp.dueAt,
      extensionRequests: Array.isArray(followUp.extensionRequests) ? followUp.extensionRequests : [],
    }))
    const leads = (Array.isArray(parsed.leads) ? parsed.leads : seed.leads).map((lead) => ({
      ...lead,
      handover: lead.handover
        ? {
            ...lead.handover,
            salesManagerId: lead.handover.salesManagerId ?? null,
            salesManagerName: lead.handover.salesManagerName ?? 'Sales Manager',
            salesStatus: lead.handover.salesStatus ?? 'Assigned',
            salesProgress: typeof lead.handover.salesProgress === 'number' ? lead.handover.salesProgress : 10,
            lastUpdatedAt: lead.handover.lastUpdatedAt ?? lead.handover.handoverAt ?? now,
            updates: Array.isArray(lead.handover.updates) ? lead.handover.updates : [],
          }
        : null,
    }))
    return {
      sectors: Array.isArray(parsed.sectors) ? parsed.sectors : seed.sectors,
      employees: Array.isArray(parsed.employees) ? parsed.employees : seed.employees,
      tasks,
      plans,
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : seed.campaigns,
      leads,
      followUps,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : seed.expenses,
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas : seed.ideas,
      approvalRequests: Array.isArray(parsed.approvalRequests) ? parsed.approvalRequests : seed.approvalRequests,
      activities: Array.isArray(parsed.activities) ? parsed.activities : seed.activities,
      monthly: Array.isArray(parsed.monthly) ? parsed.monthly : seed.monthly,
      teamRequests: Array.isArray(parsed.teamRequests) ? parsed.teamRequests : seed.teamRequests,
      walletAllocations: Array.isArray(parsed.walletAllocations) ? parsed.walletAllocations : seed.walletAllocations,
    }
  } catch {
    return seed
  }
}

function timeline(actor: Actor, action: string, note: string, tone: MarketingTimelineEntry['tone'] = 'info'): MarketingTimelineEntry {
  return {
    id: uid('MTL'),
    at: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.roleLabel,
    action,
    note,
    tone,
  }
}

export function MarketingDepartmentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MarketingDepartmentState>(hydrate)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* Session-only when browser storage is unavailable. */
    }
  }, [state])

  const createSector = useCallback<MarketingDepartmentContextValue['createSector']>((draft, actor) => {
    const now = new Date().toISOString()
    const baseCode = draft.name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase()
      .slice(0, 14)
    const sector: MarketingSector = {
      id: uid('SEC'),
      name: draft.name,
      code: baseCode || 'SECTOR',
      description: draft.description,
      objective: draft.objective,
      leaderId: draft.leaderId,
      monthlyLeadTarget: draft.monthlyLeadTarget,
      monthlyActivityTarget: draft.monthlyActivityTarget,
      budget: draft.budget,
      spent: 0,
      startDate: draft.startDate,
      endDate: draft.endDate,
      priority: draft.priority,
      status: 'Active',
      color: 'var(--chart-6)',
      createdAt: now,
    }
    setState((current) => {
      const senior = current.employees.find((employee) => employee.id === draft.leaderId)
      const employees = current.employees.map((employee) => {
        if (draft.leaderId && employee.id === draft.leaderId) {
          return { ...employee, sectorId: sector.id }
        }
        if (draft.juniorIds.includes(employee.id)) {
          return { ...employee, sectorId: sector.id, seniorId: draft.leaderId ?? senior?.id ?? null }
        }
        return employee
      })
      return {
        ...current,
        sectors: [sector, ...current.sectors],
        employees,
        activities: [
          {
            id: uid('ACT'),
            employeeId: actor.id,
            employeeName: actor.name,
            sectorId: sector.id,
            type: 'Meeting',
            title: `Created sector: ${sector.name}`,
            detail: `New marketing sector created with a monthly lead target of ${draft.monthlyLeadTarget}.`,
            at: now,
            duration: 0,
            leadsCaptured: 0,
            status: 'Completed',
          },
          ...current.activities,
        ],
      }
    })
    return sector
  }, [])

  const updateSector = useCallback<MarketingDepartmentContextValue['updateSector']>((id, patch) => {
    setState((current) => ({
      ...current,
      sectors: current.sectors.map((sector) => (sector.id === id ? { ...sector, ...patch } : sector)),
    }))
  }, [])

  const deactivateSector = useCallback<MarketingDepartmentContextValue['deactivateSector']>((id) => {
    setState((current) => ({
      ...current,
      sectors: current.sectors.map((sector) =>
        sector.id === id
          ? { ...sector, status: sector.status === 'Deactivated' ? 'Active' : 'Deactivated' }
          : sector,
      ),
    }))
  }, [])

  const assignSectorLeader = useCallback<MarketingDepartmentContextValue['assignSectorLeader']>(
    (sectorId, seniorId) => {
      setState((current) => {
        const sector = current.sectors.find((item) => item.id === sectorId)
        if (!sector) return current
        const employees = current.employees.map((employee) => {
          if (employee.role !== 'senior') return employee
          if (employee.id === seniorId) return { ...employee, sectorId }
          if (employee.id === sector.leaderId) return { ...employee, sectorId: null }
          return employee
        })
        return {
          ...current,
          sectors: current.sectors.map((item) =>
            item.id === sectorId ? { ...item, leaderId: seniorId } : item,
          ),
          employees: employees.map((employee) =>
            employee.sectorId === sectorId && employee.role === 'junior'
              ? { ...employee, seniorId }
              : employee,
          ),
        }
      })
    },
    [],
  )

  const addEmployee = useCallback<MarketingDepartmentContextValue['addEmployee']>((draft) => {
    const now = new Date().toISOString()
    const sector = state.sectors.find((item) => item.id === draft.sectorId)
    const employee: MarketingEmployee = {
      id: uid('MKT-EMP'),
      name: draft.name,
      email: draft.email,
      phone: draft.phone ?? '+91 90000 00000',
      role: draft.role,
      designation: draft.designation,
      sectorId: draft.sectorId,
      seniorId: draft.role === 'junior' ? sector?.leaderId ?? null : null,
      location: draft.location,
      joinDate: dateOnlyFromNow(0),
      status: 'Active',
      targetLeads: draft.targetLeads,
      activityStatus: 'Available',
      skills: [],
    }
    setState((current) => ({ ...current, employees: [...current.employees, employee] }))
    return employee
  }, [state.sectors])

  const transferEmployee = useCallback<MarketingDepartmentContextValue['transferEmployee']>(
    (employeeId, sectorId) => {
      setState((current) => {
        const sector = current.sectors.find((item) => item.id === sectorId)
        return {
          ...current,
          employees: current.employees.map((employee) =>
            employee.id === employeeId
              ? {
                  ...employee,
                  sectorId,
                  seniorId: employee.role === 'junior' ? sector?.leaderId ?? null : employee.seniorId,
                }
              : employee,
          ),
        }
      })
    },
    [],
  )

  const setSectorTargets = useCallback<MarketingDepartmentContextValue['setSectorTargets']>(
    (sectorId, monthlyLeadTarget, monthlyActivityTarget) => {
      setState((current) => ({
        ...current,
        sectors: current.sectors.map((sector) =>
          sector.id === sectorId ? { ...sector, monthlyLeadTarget, monthlyActivityTarget } : sector,
        ),
      }))
    },
    [],
  )

  const allocateBudget = useCallback<MarketingDepartmentContextValue['allocateBudget']>(
    (sectorId, totalBudget, actor) => {
      setState((current) => ({
        ...current,
        sectors: current.sectors.map((sector) =>
          sector.id === sectorId
            ? {
                ...sector,
                budget: Math.max(0, totalBudget),
              }
            : sector,
        ),
        activities: [
          {
            id: uid('ACT'),
            employeeId: actor.id,
            employeeName: actor.name,
            sectorId,
            type: 'Meeting',
            title: 'Sector budget updated',
            detail: `Total sector budget set to ₹${Math.round(totalBudget).toLocaleString('en-IN')}.`,
            at: new Date().toISOString(),
            duration: 0,
            leadsCaptured: 0,
            status: 'Completed',
          },
          ...current.activities,
        ],
      }))
    },
    [],
  )

  const addTask = useCallback<MarketingDepartmentContextValue['addTask']>((draft, actor) => {
    const now = new Date().toISOString()
    const task: MarketingTask = {
      ...draft,
      id: uid('TSK'),
      createdById: actor.id,
      createdByName: actor.name,
      assignedSeniorId: draft.assignedSeniorId,
      assignedJuniorId: draft.assignedJuniorId,
      status: 'Not Started',
      progress: 0,
      parentId: draft.parentId ?? null,
      notes: [],
      originalDeadline: draft.deadline,
      assignmentHistory: [
        {
          id: uid('TSKA'),
          at: now,
          assignedById: actor.id,
          assignedByName: actor.name,
          fromSeniorId: null,
          fromJuniorId: null,
          toSeniorId: draft.assignedSeniorId,
          toJuniorId: draft.assignedJuniorId,
          note: 'Assigned at task creation.',
        },
      ],
      extensionRequests: [],
      createdAt: now,
      updatedAt: now,
    }
    setState((current) => ({ ...current, tasks: [task, ...current.tasks] }))
    return task
  }, [])

  const updateTask = useCallback<MarketingDepartmentContextValue['updateTask']>((id, patch) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task,
      ),
    }))
  }, [])

  const addTaskNote = useCallback<MarketingDepartmentContextValue['addTaskNote']>(
    (id, note, actor, kind) => {
      const entry = {
        id: uid('TSKN'),
        at: new Date().toISOString(),
        authorId: actor.id,
        authorName: actor.name,
        note,
        kind,
      }
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id
            ? { ...task, notes: [entry, ...task.notes], updatedAt: entry.at }
            : task,
        ),
      }))
    },
    [],
  )

  const reviewTask = useCallback<MarketingDepartmentContextValue['reviewTask']>((id, decision, actor, note) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== id) return task
        const entry = {
          id: uid('TSKN'),
          at: new Date().toISOString(),
          authorId: actor.id,
          authorName: actor.name,
          note,
          kind: 'review' as const,
        }
        return {
          ...task,
          status: decision === 'approve' ? ('Completed' as const) : ('In Progress' as const),
          progress: decision === 'approve' ? 100 : Math.min(90, task.progress),
          reviewNote: note,
          notes: [entry, ...task.notes],
          updatedAt: entry.at,
        }
      }),
    }))
  }, [])

  const reassignTask = useCallback<MarketingDepartmentContextValue['reassignTask']>((id, input, actor) => {
    const now = new Date().toISOString()
    setState((current) => {
      const task = current.tasks.find((item) => item.id === id)
      if (!task) return current
      const event = {
        id: uid('TSKA'),
        at: now,
        assignedById: actor.id,
        assignedByName: actor.name,
        fromSeniorId: task.assignedSeniorId,
        fromJuniorId: task.assignedJuniorId,
        toSeniorId: input.assignedSeniorId,
        toJuniorId: input.assignedJuniorId,
        note: input.note || 'Assignment updated by the manager.',
      }
      return {
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === id
            ? {
                ...item,
                assigneeType: input.assigneeType,
                assignedSeniorId: input.assignedSeniorId,
                assignedJuniorId: input.assignedJuniorId,
                deadline: input.deadline || item.deadline,
                originalDeadline: item.originalDeadline ?? item.deadline,
                assignmentHistory: [event, ...(item.assignmentHistory ?? [])],
                updatedAt: now,
              }
            : item,
        ),
        activities: [
          {
            id: uid('ACT'),
            employeeId: actor.id,
            employeeName: actor.name,
            sectorId: task.sectorId,
            type: 'Meeting',
            title: 'Task reassigned',
            detail: `${task.title} was reassigned. ${event.note}`,
            at: now,
            duration: 0,
            leadsCaptured: 0,
            status: 'Completed',
          },
          ...current.activities,
        ],
      }
    })
  }, [])

  const requestTaskExtension = useCallback<MarketingDepartmentContextValue['requestTaskExtension']>(
    (id, reason, proposedDeadline, actor) => {
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                originalDeadline: task.originalDeadline ?? task.deadline,
                extensionRequests: [
                  {
                    id: uid('TSKX'),
                    requestedAt: new Date().toISOString(),
                    requestedById: actor.id,
                    requestedByName: actor.name,
                    reason,
                    originalDeadline: task.originalDeadline ?? task.deadline,
                    proposedDeadline,
                    status: 'Pending',
                    decidedAt: null,
                    decidedById: null,
                    decidedByName: null,
                    decisionNote: '',
                  },
                  ...(task.extensionRequests ?? []),
                ],
                updatedAt: new Date().toISOString(),
              }
            : task,
        ),
      }))
    },
    [],
  )

  const decideTaskExtension = useCallback<MarketingDepartmentContextValue['decideTaskExtension']>(
    (taskId, requestId, decision, actor, note) => {
      const now = new Date().toISOString()
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) => {
          if (task.id !== taskId) return task
          const request = (task.extensionRequests ?? []).find((item) => item.id === requestId)
          if (!request) return task
          const approved = decision === 'approve'
          return {
            ...task,
            deadline: approved ? request.proposedDeadline : task.deadline,
            originalDeadline: task.originalDeadline ?? request.originalDeadline,
            extensionRequests: (task.extensionRequests ?? []).map((item) =>
              item.id === requestId
                ? {
                    ...item,
                    status: approved ? ('Approved' as const) : ('Rejected' as const),
                    decidedAt: now,
                    decidedById: actor.id,
                    decidedByName: actor.name,
                    decisionNote: note,
                  }
                : item,
            ),
            notes: [
              {
                id: uid('TSKN'),
                at: now,
                authorId: actor.id,
                authorName: actor.name,
                note: approved
                  ? `Extension approved to ${request.proposedDeadline}. ${note}`.trim()
                  : `Extension rejected. ${note}`.trim(),
                kind: 'review' as const,
              },
              ...task.notes,
            ],
            updatedAt: now,
          }
        }),
      }))
    },
    [],
  )

  const createPlan = useCallback<MarketingDepartmentContextValue['createPlan']>((draft, actor) => {
    const now = new Date().toISOString()
    const plan: MarketingPlan = {
      ...draft,
      id: uid('PLN'),
      createdById: actor.id,
      createdAt: now,
      updatedAt: now,
      submittedAt: draft.status === 'Draft' ? null : now,
      history: [
        timeline(actor, 'Plan created', `${draft.title} was created for ${draft.type.toLowerCase()} planning.`, 'info'),
      ],
    }
    setState((current) => ({ ...current, plans: [plan, ...current.plans] }))
    return plan
  }, [])

  const updatePlan = useCallback<MarketingDepartmentContextValue['updatePlan']>(
    (id, patch, actor, note = 'Plan details updated.') => {
      const now = new Date().toISOString()
      setState((current) => ({
        ...current,
        plans: current.plans.map((plan) =>
          plan.id === id
            ? {
                ...plan,
                ...patch,
                updatedAt: now,
                history: [
                  timeline(actor, 'Plan updated', note, 'neutral'),
                  ...(plan.history ?? []),
                ],
              }
            : plan,
        ),
      }))
    },
    [],
  )

  const submitPlan = useCallback<MarketingDepartmentContextValue['submitPlan']>((id, actor) => {
    const now = new Date().toISOString()
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === id
          ? {
              ...plan,
              status: 'Pending Manager Review',
              submittedAt: now,
              updatedAt: now,
              managerRemarks: '',
              financeRemarks: '',
              history: [
                timeline(
                  actor,
                  'Submitted to manager',
                  'Plan submitted for manager review. Finance review follows manager approval.',
                  'info',
                ),
                ...(plan.history ?? []),
              ],
            }
          : plan,
      ),
    }))
  }, [])

  const decidePlanManager = useCallback<MarketingDepartmentContextValue['decidePlanManager']>(
    (id, decision, actor, note) => {
      const now = new Date().toISOString()
      setState((current) => ({
        ...current,
        plans: current.plans.map((plan) => {
          if (plan.id !== id) return plan
          const status: PlanStatus =
            decision === 'approve'
              ? 'Pending Finance Approval'
              : decision === 'reject'
                ? 'Rejected'
                : 'Changes Requested'
          const action =
            decision === 'approve'
              ? 'Manager approved and forwarded to Finance'
              : decision === 'reject'
                ? 'Manager rejected the plan'
                : 'Manager requested changes'
          return {
            ...plan,
            status,
            managerReviewedAt: now,
            managerReviewerName: actor.name,
            managerRemarks: note,
            updatedAt: now,
            history: [
              timeline(
                actor,
                action,
                note || 'Manager review recorded.',
                decision === 'approve' ? 'success' : decision === 'reject' ? 'danger' : 'warning',
              ),
              ...(plan.history ?? []),
            ],
          }
        }),
      }))
    },
    [],
  )

  const decidePlanFinance = useCallback<MarketingDepartmentContextValue['decidePlanFinance']>(
    (id, decision, actor, note) => {
      const now = new Date().toISOString()
      setState((current) => ({
        ...current,
        plans: current.plans.map((plan) => {
          if (plan.id !== id) return plan
          return {
            ...plan,
            status: decision === 'approve' ? 'Active' : 'Rejected',
            financeReviewedAt: now,
            financeReviewerName: actor.name,
            financeRemarks: note,
            updatedAt: now,
            history: [
              timeline(
                actor,
                decision === 'approve' ? 'Finance approved — plan active' : 'Finance rejected the plan',
                note || 'Finance/Admin decision recorded.',
                decision === 'approve' ? 'success' : 'danger',
              ),
              ...(plan.history ?? []),
            ],
          }
        }),
      }))
    },
    [],
  )

  const updatePlanStatus = useCallback<MarketingDepartmentContextValue['updatePlanStatus']>(
    (id, status, actor, note = '') => {
      setState((current) => ({
        ...current,
        plans: current.plans.map((plan) =>
          plan.id === id
            ? {
                ...plan,
                status,
                updatedAt: new Date().toISOString(),
                history: [
                  timeline(actor, `Plan status: ${status}`, note || `Marketing plan moved to ${status}.`, 'info'),
                  ...(plan.history ?? []),
                ],
              }
            : plan,
        ),
        activities: [
          {
            id: uid('ACT'),
            employeeId: actor.id,
            employeeName: actor.name,
            sectorId: current.plans.find((plan) => plan.id === id)?.sectorId ?? '',
            type: 'Meeting',
            title: `Plan status: ${status}`,
            detail: note || `Marketing plan moved to ${status}.`,
            at: new Date().toISOString(),
            duration: 0,
            leadsCaptured: 0,
            status: 'Completed',
          },
          ...current.activities,
        ],
      }))
    },
    [],
  )

  const createCampaign = useCallback<MarketingDepartmentContextValue['createCampaign']>((draft, actor) => {
    const now = new Date().toISOString()
    const campaign: MarketingCampaign = {
      ...draft,
      id: uid('CMP'),
      baselineLeads: 0,
      createdById: actor.id,
      createdAt: now,
      updatedAt: now,
    }
    setState((current) => ({ ...current, campaigns: [campaign, ...current.campaigns] }))
    return campaign
  }, [])

  const updateCampaignStatus = useCallback<MarketingDepartmentContextValue['updateCampaignStatus']>(
    (id, status, _actor, _note = '') => {
      setState((current) => ({
        ...current,
        campaigns: current.campaigns.map((campaign) =>
          campaign.id === id
            ? { ...campaign, status, updatedAt: new Date().toISOString() }
            : campaign,
        ),
      }))
    },
    [],
  )

  const addLead = useCallback<MarketingDepartmentContextValue['addLead']>((draft, actor) => {
    const now = new Date().toISOString()
    const employee = state.employees.find((item) => item.id === actor.id)
    const seniorId =
      actor.role === 'senior'
        ? actor.id
        : actor.role === 'manager'
          ? state.sectors.find((sector) => sector.id === draft.sectorId)?.leaderId ?? null
          : employee?.seniorId ?? null
    const lead: MarketingLead = {
      ...draft,
      id: uid('LD'),
      assignedSeniorId: seniorId,
      assignedJuniorId: actor.role === 'junior' ? actor.id : null,
      createdById: actor.id,
      stage: 'New Lead',
      rejectionReason: '',
      createdAt: now,
      updatedAt: now,
      followUps: [],
      reviews: [
        {
          id: uid('LRV'),
          at: now,
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.roleLabel,
          action: 'Lead created',
          fromStage: 'New Lead',
          toStage: 'New Lead',
          note: `Lead registered from ${draft.source}.`,
        },
      ],
      handover: null,
      salesOutcome: null,
    }
    setState((current) => {
      const followUps = draft.nextFollowUpAt
        ? [
            {
              id: uid('FU'),
              leadId: lead.id,
              sectorId: lead.sectorId,
              employeeId: actor.id,
              dueAt: draft.nextFollowUpAt,
              mode: 'Phone Call' as const,
              status: 'Scheduled' as const,
              result: '',
              notes: 'First follow-up scheduled during lead creation.',
              completedAt: null,
              createdAt: now,
              originalDueAt: draft.nextFollowUpAt,
              extensionRequests: [],
            },
            ...current.followUps,
          ]
        : current.followUps
      return { ...current, leads: [lead, ...current.leads], followUps }
    })
    return lead
  }, [state.employees, state.sectors])

  const updateLeadStage = useCallback<MarketingDepartmentContextValue['updateLeadStage']>(
    (id, stage, actor, action, note, patch) => {
      setState((current) => ({
        ...current,
        leads: current.leads.map((lead) => {
          if (lead.id !== id) return lead
          const review = {
            id: uid('LRV'),
            at: new Date().toISOString(),
            actorId: actor.id,
            actorName: actor.name,
            actorRole: actor.roleLabel,
            action,
            fromStage: lead.stage,
            toStage: stage,
            note,
          }
          return {
            ...lead,
            ...patch,
            stage,
            updatedAt: review.at,
            reviews: [review, ...lead.reviews],
          }
        }),
      }))
    },
    [],
  )

  const scheduleFollowUp = useCallback<MarketingDepartmentContextValue['scheduleFollowUp']>((input) => {
    const followUp: MarketingFollowUp = {
      id: uid('FU'),
      leadId: input.leadId,
      sectorId: state.leads.find((lead) => lead.id === input.leadId)?.sectorId ?? '',
      employeeId: input.employeeId,
      dueAt: input.dueAt,
      mode: input.mode,
      status: 'Scheduled',
      result: '',
      notes: input.notes,
      completedAt: null,
      createdAt: new Date().toISOString(),
      originalDueAt: input.dueAt,
      extensionRequests: [],
    }
    setState((current) => ({ ...current, followUps: [followUp, ...current.followUps] }))
    return followUp
  }, [state.leads])

  const completeFollowUp = useCallback<MarketingDepartmentContextValue['completeFollowUp']>(
    (id, result, notes, nextActionAt, actor) => {
      const now = new Date().toISOString()
      setState((current) => {
        const followUp = current.followUps.find((item) => item.id === id)
        if (!followUp) return current
        const lead = current.leads.find((item) => item.id === followUp.leadId)
        const leadFollowUp = {
          id: uid('LFU'),
          at: now,
          mode: followUp.mode,
          employeeId: actor.id,
          employeeName: actor.name,
          result: result as MarketingLead['followUps'][number]['result'],
          notes,
          nextActionAt,
        }
        const nextFollowUp: MarketingFollowUp | null = nextActionAt
          ? {
              id: uid('FU'),
              leadId: followUp.leadId,
              sectorId: followUp.sectorId,
              employeeId: followUp.employeeId,
              dueAt: nextActionAt,
              mode: 'Phone Call',
              status: 'Scheduled',
              result: '',
              notes: 'Next follow-up scheduled from the previous conversation.',
              completedAt: null,
              createdAt: now,
              originalDueAt: nextActionAt,
              extensionRequests: [],
            }
          : null
        return {
          ...current,
          followUps: [
            ...(nextFollowUp ? [nextFollowUp] : []),
            ...current.followUps.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: 'Completed' as const,
                    result,
                    notes,
                    completedAt: now,
                  }
                : item,
            ),
          ],
          leads: current.leads.map((item) =>
            item.id === followUp.leadId
              ? {
                  ...item,
                  stage:
                    item.stage === 'New Lead' && result !== 'Not Interested'
                      ? ('Follow-up' as const)
                      : item.stage,
                  updatedAt: now,
                  followUps: [leadFollowUp, ...item.followUps],
                }
              : item,
          ),
          activities: lead
            ? [
                {
                  id: uid('ACT'),
                  employeeId: actor.id,
                  employeeName: actor.name,
                  sectorId: lead.sectorId,
                  type: 'Follow-up' as const,
                  title: `Follow-up completed — ${lead.name}`,
                  detail: `${followUp.mode}: ${result}. ${notes}`,
                  at: now,
                  duration: 15,
                  leadsCaptured: 0,
                  status: 'Completed' as const,
                },
                ...current.activities,
              ]
            : current.activities,
        }
      })
    },
    [],
  )

  const rescheduleFollowUp = useCallback<MarketingDepartmentContextValue['rescheduleFollowUp']>(
    (id, dueAt, notes) => {
      setState((current) => ({
        ...current,
        followUps: current.followUps.map((followUp) =>
          followUp.id === id
            ? { ...followUp, dueAt, notes, status: 'Scheduled' as const, completedAt: null }
            : followUp,
        ),
      }))
    },
    [],
  )

  const requestFollowUpExtension = useCallback<MarketingDepartmentContextValue['requestFollowUpExtension']>(
    (id, reason, proposedDueAt, actor) => {
      setState((current) => ({
        ...current,
        followUps: current.followUps.map((followUp) =>
          followUp.id === id
            ? {
                ...followUp,
                originalDueAt: followUp.originalDueAt ?? followUp.dueAt,
                extensionRequests: [
                  {
                    id: uid('FUX'),
                    kind: 'extension',
                    requestedAt: new Date().toISOString(),
                    requestedById: actor.id,
                    requestedByName: actor.name,
                    reason,
                    originalDueAt: followUp.originalDueAt ?? followUp.dueAt,
                    proposedDueAt,
                    status: 'Pending',
                    decidedAt: null,
                    decidedById: null,
                    decidedByName: null,
                    decisionNote: '',
                  },
                  ...(followUp.extensionRequests ?? []),
                ],
              }
            : followUp,
        ),
      }))
    },
    [],
  )

  const requestFollowUpInProgress = useCallback<MarketingDepartmentContextValue['requestFollowUpInProgress']>(
    (id, reason, actor) => {
      setState((current) => ({
        ...current,
        followUps: current.followUps.map((followUp) =>
          followUp.id === id
            ? {
                ...followUp,
                originalDueAt: followUp.originalDueAt ?? followUp.dueAt,
                inProgressReason: reason,
                extensionRequests: [
                  {
                    id: uid('FUX'),
                    kind: 'in-progress',
                    requestedAt: new Date().toISOString(),
                    requestedById: actor.id,
                    requestedByName: actor.name,
                    reason,
                    originalDueAt: followUp.originalDueAt ?? followUp.dueAt,
                    proposedDueAt: null,
                    status: 'Pending',
                    decidedAt: null,
                    decidedById: null,
                    decidedByName: null,
                    decisionNote: '',
                  },
                  ...(followUp.extensionRequests ?? []),
                ],
              }
            : followUp,
        ),
      }))
    },
    [],
  )

  const decideFollowUpExtension = useCallback<MarketingDepartmentContextValue['decideFollowUpExtension']>(
    (followUpId, requestId, decision, actor, note) => {
      const now = new Date().toISOString()
      setState((current) => ({
        ...current,
        followUps: current.followUps.map((followUp) => {
          if (followUp.id !== followUpId) return followUp
          const request = (followUp.extensionRequests ?? []).find((item) => item.id === requestId)
          if (!request) return followUp
          const approved = decision === 'approve'
          return {
            ...followUp,
            dueAt:
              approved && request.kind === 'extension' && request.proposedDueAt
                ? request.proposedDueAt
                : followUp.dueAt,
            status:
              approved && request.kind === 'in-progress'
                ? ('In Progress' as const)
                : approved && request.kind === 'extension'
                  ? ('Scheduled' as const)
                  : followUp.status,
            originalDueAt: followUp.originalDueAt ?? request.originalDueAt,
            inProgressReason:
              request.kind === 'in-progress' ? request.reason : followUp.inProgressReason,
            extensionRequests: (followUp.extensionRequests ?? []).map((item) =>
              item.id === requestId
                ? {
                    ...item,
                    status: approved ? ('Approved' as const) : ('Rejected' as const),
                    decidedAt: now,
                    decidedById: actor.id,
                    decidedByName: actor.name,
                    decisionNote: note,
                  }
                : item,
            ),
          }
        }),
      }))
    },
    [],
  )

  const addLeadRemark = useCallback<MarketingDepartmentContextValue['addLeadRemark']>(
    (leadId, note, actor) => {
      const now = new Date().toISOString()
      setState((current) => ({
        ...current,
        leads: current.leads.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                updatedAt: now,
                reviews: [
                  {
                    id: uid('LRV'),
                    at: now,
                    actorId: actor.id,
                    actorName: actor.name,
                    actorRole: actor.roleLabel,
                    action: 'Remark added',
                    fromStage: lead.stage,
                    toStage: lead.stage,
                    note,
                  },
                  ...lead.reviews,
                ],
              }
            : lead,
        ),
      }))
    },
    [],
  )

  const logLeadCall = useCallback<MarketingDepartmentContextValue['logLeadCall']>(
    (leadId, input, actor) => {
      const now = new Date().toISOString()
      setState((current) => {
        const lead = current.leads.find((item) => item.id === leadId)
        if (!lead) return current
        const entry: LeadFollowUp = {
          id: uid('LFU'),
          at: now,
          mode: input.mode,
          employeeId: actor.id,
          employeeName: actor.name,
          result: input.outcome,
          notes: input.notes,
          nextActionAt: input.nextActionAt,
        }
        return {
          ...current,
          leads: current.leads.map((item) =>
            item.id === leadId
              ? {
                  ...item,
                  stage:
                    item.stage === 'New Lead' && input.outcome !== 'Not Interested'
                      ? ('Follow-up' as const)
                      : item.stage,
                  followUps: [entry, ...item.followUps],
                  updatedAt: now,
                  reviews: [
                    {
                      id: uid('LRV'),
                      at: now,
                      actorId: actor.id,
                      actorName: actor.name,
                      actorRole: actor.roleLabel,
                      action: 'Call logged',
                      fromStage: item.stage,
                      toStage:
                        item.stage === 'New Lead' && input.outcome !== 'Not Interested'
                          ? ('Follow-up' as const)
                          : item.stage,
                      note: `${input.mode}: ${input.outcome}. ${input.notes}`.trim(),
                    },
                    ...item.reviews,
                  ],
                }
              : item,
          ),
          activities: [
            {
              id: uid('ACT'),
              employeeId: actor.id,
              employeeName: actor.name,
              sectorId: lead.sectorId,
              type: 'Phone Call',
              title: `Call logged — ${lead.name}`,
              detail: `${input.mode}: ${input.outcome}. ${input.notes}`.trim(),
              at: now,
              duration: 15,
              leadsCaptured: 0,
              status: 'Completed',
              customerName: lead.name,
              customerPhone: lead.phone,
              callOutcome: input.outcome,
              followUpAt: input.nextActionAt,
              leadId: lead.id,
              remarks: input.notes,
            },
            ...current.activities,
          ],
        }
      })
    },
    [],
  )

  const submitExpense = useCallback<MarketingDepartmentContextValue['submitExpense']>((draft, actor) => {
    const now = new Date().toISOString()
    const status: MarketingExpense['status'] = actor.role === 'junior' ? 'Under Senior Review' : 'Manager Review'
    const expense: MarketingExpense = {
      ...draft,
      id: uid('EXP'),
      employeeId: actor.id,
      employeeName: actor.name,
      status,
      comments: '',
      createdAt: now,
      updatedAt: now,
      timeline: [timeline(actor, 'Expense submitted', draft.description, 'info')],
    }
    setState((current) => ({ ...current, expenses: [expense, ...current.expenses] }))
    return expense
  }, [])

  const advanceExpense = useCallback<MarketingDepartmentContextValue['advanceExpense']>(
    (id, status, action, actor, comments) => {
      setState((current) => ({
        ...current,
        expenses: current.expenses.map((expense) =>
          expense.id === id
            ? {
                ...expense,
                status,
                comments,
                updatedAt: new Date().toISOString(),
                timeline: [
                  timeline(
                    actor,
                    action,
                    comments,
                    status === 'Rejected'
                      ? 'danger'
                      : status === 'Changes Requested'
                        ? 'warning'
                        : status === 'Approved'
                          ? 'success'
                          : 'info',
                  ),
                  ...expense.timeline,
                ],
              }
            : expense,
        ),
      }))
    },
    [],
  )

  const submitIdea = useCallback<MarketingDepartmentContextValue['submitIdea']>((draft, actor) => {
    const now = new Date().toISOString()
    const employee = state.employees.find((item) => item.id === actor.id)
    const status: MarketingIdea['status'] =
      actor.role === 'junior' && employee?.seniorId ? 'Under Senior Review' : 'Pending Manager Review'
    const idea: MarketingIdea = {
      ...draft,
      id: uid('IDEA'),
      submittedById: actor.id,
      submittedByName: actor.name,
      submittedByRole: actor.role === 'senior' ? 'senior' : actor.role === 'manager' ? 'manager' : 'junior',
      seniorId: employee?.seniorId ?? null,
      status,
      managerFeedback: '',
      seniorFeedback: '',
      createdAt: now,
      updatedAt: now,
      timeline: [timeline(actor, 'Idea submitted', draft.description, 'info')],
    }
    setState((current) => ({ ...current, ideas: [idea, ...current.ideas] }))
    return idea
  }, [state.employees])

  const reviewIdea = useCallback<MarketingDepartmentContextValue['reviewIdea']>(
    (id, status, actor, feedback, action) => {
      setState((current) => ({
        ...current,
        ideas: current.ideas.map((idea) =>
          idea.id === id
            ? {
                ...idea,
                status,
                managerFeedback: feedback.managerFeedback ?? idea.managerFeedback,
                seniorFeedback: feedback.seniorFeedback ?? idea.seniorFeedback,
                updatedAt: new Date().toISOString(),
                timeline: [
                  timeline(
                    actor,
                    action || status,
                    feedback.managerFeedback ?? feedback.seniorFeedback ?? '',
                    status === 'Rejected'
                      ? 'danger'
                      : status === 'Changes Requested'
                        ? 'warning'
                        : 'success',
                  ),
                  ...idea.timeline,
                ],
              }
            : idea,
        ),
      }))
    },
    [],
  )

  const createApprovalRequest = useCallback<MarketingDepartmentContextValue['createApprovalRequest']>(
    (draft, actor) => {
      const now = new Date().toISOString()
      const request: MarketingApprovalRequest = {
        ...draft,
        id: uid('APR'),
        submittedById: actor.id,
        submittedByName: actor.name,
        status: 'Pending Manager Review',
        stage: 'manager',
        createdAt: now,
        updatedAt: now,
        timeline: [timeline(actor, `Submitted ${draft.kind.toLowerCase()}`, draft.summary, 'info')],
      }
      setState((current) => ({ ...current, approvalRequests: [request, ...current.approvalRequests] }))
      return request
    },
    [],
  )

  const decideApprovalRequest = useCallback<MarketingDepartmentContextValue['decideApprovalRequest']>(
    (id, status, actor, note) => {
      setState((current) => ({
        ...current,
        approvalRequests: current.approvalRequests.map((request) => {
          if (request.id !== id) return request
          const forwarding = status === 'Approved' && request.stage === 'manager'
          return {
            ...request,
            status: forwarding ? 'Pending Finance Approval' : status,
            stage: forwarding ? 'finance' : status === 'Approved' ? 'closed' : 'closed',
            updatedAt: new Date().toISOString(),
            timeline: [
              timeline(
                actor,
                forwarding ? 'Approved and forwarded to Finance/Admin' : status,
                note,
                status === 'Rejected' ? 'danger' : status === 'Changes Requested' ? 'warning' : 'success',
              ),
              ...request.timeline,
            ],
          }
        }),
      }))
    },
    [],
  )

  const logActivity = useCallback<MarketingDepartmentContextValue['logActivity']>((draft, actor) => {
    const activity: MarketingActivity = {
      ...draft,
      id: uid('ACT'),
      employeeId: actor.id,
      employeeName: actor.name,
    }
    setState((current) => ({ ...current, activities: [activity, ...current.activities] }))
    return activity
  }, [])

  const assignHandover = useCallback<MarketingDepartmentContextValue['assignHandover']>(
    (leadId, draft, actor) => {
      const lead = state.leads.find((item) => item.id === leadId)
      if (!lead || lead.handover) return false
      const now = new Date().toISOString()
      setState((current) => ({
        ...current,
        leads: current.leads.map((item) =>
          item.id === leadId
            ? {
                ...item,
                stage: 'Sent to Sales',
                updatedAt: now,
                handover: {
                  id: uid('HO'),
                  handoverAt: now,
                  handoverById: actor.id,
                  handoverByName: actor.name,
                  salesRepId: draft.salesRepId,
                  salesRepName: draft.salesRepName,
                  salesManagerId: 'SALES-MGR-01',
                  salesManagerName: 'Vikram Sethi',
                  salesStatus: 'Assigned',
                  salesProgress: 10,
                  lastUpdatedAt: now,
                  updates: [
                    {
                      id: uid('HOU'),
                      at: now,
                      byId: actor.id,
                      byName: actor.name,
                      status: 'Assigned',
                      progress: 10,
                      note: `Handed over to ${draft.salesRepName}. ${draft.notes}`.trim(),
                    },
                  ],
                  notes: draft.notes,
                  priority: draft.priority,
                  nextActionDate: draft.nextActionDate,
                },
                reviews: [
                  {
                    id: uid('LRV'),
                    at: now,
                    actorId: actor.id,
                    actorName: actor.name,
                    actorRole: actor.roleLabel,
                    action: 'Sales handover completed',
                    fromStage: item.stage,
                    toStage: 'Sent to Sales',
                    note: `Assigned to ${draft.salesRepName}. ${draft.notes}`,
                  },
                  ...item.reviews,
                ],
              }
            : item,
        ),
      }))
      return true
    },
    [state.leads],
  )

  const updateSalesHandover = useCallback<MarketingDepartmentContextValue['updateSalesHandover']>(
    (leadId, input, actor) => {
      const now = new Date().toISOString()
      setState((current) => ({
        ...current,
        leads: current.leads.map((lead) =>
          lead.id === leadId && lead.handover
            ? {
                ...lead,
                updatedAt: now,
                handover: {
                  ...lead.handover,
                  salesStatus: input.salesStatus,
                  salesProgress: Math.max(0, Math.min(100, input.salesProgress)),
                  lastUpdatedAt: now,
                  updates: [
                    {
                      id: uid('HOU'),
                      at: now,
                      byId: actor.id,
                      byName: actor.name,
                      status: input.salesStatus ?? 'In Progress',
                      progress: input.salesProgress,
                      note: input.note,
                    },
                    ...(lead.handover.updates ?? []),
                  ],
                },
              }
            : lead,
        ),
      }))
    },
    [],
  )

  const createTeamRequest = useCallback<MarketingDepartmentContextValue['createTeamRequest']>(
    (draft, actor) => {
      const now = new Date().toISOString()
      const request: MarketingTeamRequest = {
        id: uid('TRQ'),
        seniorId: actor.id,
        seniorName: actor.name,
        sectorId: draft.sectorId,
        employeeName: draft.employeeName,
        employeeEmail: draft.employeeEmail,
        reason: draft.reason,
        targetLeads: draft.targetLeads,
        status: 'Pending',
        requestedAt: now,
        decidedAt: null,
        decidedById: null,
        decidedByName: null,
        decisionNote: '',
        addedEmployeeId: null,
        addedAt: null,
      }
      setState((current) => ({ ...current, teamRequests: [request, ...current.teamRequests] }))
      return request
    },
    [],
  )

  const decideTeamRequest = useCallback<MarketingDepartmentContextValue['decideTeamRequest']>(
    (id, decision, actor, note) => {
      const now = new Date().toISOString()
      setState((current) => {
        const request = current.teamRequests.find((item) => item.id === id)
        if (!request) return current
        let employee: MarketingEmployee | null = null
        if (decision === 'approve' && !request.addedEmployeeId) {
          const sector = current.sectors.find((item) => item.id === request.sectorId)
          employee = {
            id: uid('MKT-EMP'),
            name: request.employeeName,
            email: request.employeeEmail,
            phone: '+91 90000 00000',
            role: 'junior',
            designation: sector ? `Junior ${sector.name} Executive` : 'Junior Marketing Executive',
            sectorId: request.sectorId,
            seniorId: request.seniorId,
            location: 'Bengaluru, India',
            joinDate: dateOnlyFromNow(0),
            status: 'Active',
            targetLeads: request.targetLeads,
            activityStatus: 'Onboarding · team request approved',
            skills: [],
          }
        }
        return {
          ...current,
          employees:
            decision === 'approve' && employee
              ? [...current.employees, employee]
              : current.employees,
          teamRequests: current.teamRequests.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: decision === 'approve' ? ('Approved' as const) : ('Rejected' as const),
                  decidedAt: now,
                  decidedById: actor.id,
                  decidedByName: actor.name,
                  decisionNote: note,
                  addedEmployeeId: employee?.id ?? item.addedEmployeeId ?? null,
                  addedAt: employee ? now : item.addedAt ?? null,
                }
              : item,
          ),
          activities: [
            {
              id: uid('ACT'),
              employeeId: actor.id,
              employeeName: actor.name,
              sectorId: request.sectorId,
              type: 'Meeting',
              title: decision === 'approve' ? 'Team member request approved' : 'Team member request rejected',
              detail: employee
                ? `${employee.name} was added to the team. ${note}`.trim()
                : `${request.employeeName}'s request was rejected. ${note}`.trim(),
              at: now,
              duration: 0,
              leadsCaptured: 0,
              status: 'Completed',
            },
            ...current.activities,
          ],
        }
      })
    },
    [],
  )

  const allocateWallet = useCallback<MarketingDepartmentContextValue['allocateWallet']>(
    (employeeId, month, amount, actor) => {
      setState((current) => {
        const employee = current.employees.find((item) => item.id === employeeId)
        const existing = current.walletAllocations.find(
          (allocation) => allocation.employeeId === employeeId && allocation.month === month,
        )
        const now = new Date().toISOString()
        if (existing) {
          return {
            ...current,
            walletAllocations: current.walletAllocations.map((allocation) =>
              allocation.id === existing.id
                ? {
                    ...allocation,
                    amount: Math.max(0, amount),
                    allocatedById: actor.id,
                    allocatedByName: actor.name,
                    updatedAt: now,
                  }
                : allocation,
            ),
          }
        }
        const allocation: MarketingWalletAllocation = {
          id: uid('WAL'),
          employeeId,
          employeeName: employee?.name ?? 'Marketing executive',
          month,
          amount: Math.max(0, amount),
          allocatedById: actor.id,
          allocatedByName: actor.name,
          createdAt: now,
          updatedAt: now,
        }
        return { ...current, walletAllocations: [allocation, ...current.walletAllocations] }
      })
    },
    [],
  )

  const resetDepartment = useCallback(() => {
    setState(buildMarketingDepartmentSeed())
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<MarketingDepartmentContextValue>(
    () => ({
      ...state,
      createSector,
      updateSector,
      deactivateSector,
      assignSectorLeader,
      addEmployee,
      transferEmployee,
      setSectorTargets,
      allocateBudget,
      addTask,
      updateTask,
      addTaskNote,
      reviewTask,
      reassignTask,
      requestTaskExtension,
      decideTaskExtension,
      createPlan,
      updatePlan,
      updatePlanStatus,
      submitPlan,
      decidePlanManager,
      decidePlanFinance,
      createCampaign,
      updateCampaignStatus,
      addLead,
      updateLeadStage,
      scheduleFollowUp,
      completeFollowUp,
      rescheduleFollowUp,
      requestFollowUpExtension,
      requestFollowUpInProgress,
      decideFollowUpExtension,
      addLeadRemark,
      logLeadCall,
      submitExpense,
      advanceExpense,
      submitIdea,
      reviewIdea,
      createApprovalRequest,
      decideApprovalRequest,
      logActivity,
      assignHandover,
      updateSalesHandover,
      createTeamRequest,
      decideTeamRequest,
      allocateWallet,
      resetDepartment,
    }),
    [
      state,
      createSector,
      updateSector,
      deactivateSector,
      assignSectorLeader,
      addEmployee,
      transferEmployee,
      setSectorTargets,
      allocateBudget,
      addTask,
      updateTask,
      addTaskNote,
      reviewTask,
      reassignTask,
      requestTaskExtension,
      decideTaskExtension,
      createPlan,
      updatePlan,
      updatePlanStatus,
      submitPlan,
      decidePlanManager,
      decidePlanFinance,
      createCampaign,
      updateCampaignStatus,
      addLead,
      updateLeadStage,
      scheduleFollowUp,
      completeFollowUp,
      rescheduleFollowUp,
      requestFollowUpExtension,
      requestFollowUpInProgress,
      decideFollowUpExtension,
      addLeadRemark,
      logLeadCall,
      submitExpense,
      advanceExpense,
      submitIdea,
      reviewIdea,
      createApprovalRequest,
      decideApprovalRequest,
      logActivity,
      assignHandover,
      updateSalesHandover,
      createTeamRequest,
      decideTeamRequest,
      allocateWallet,
      resetDepartment,
    ],
  )

  return (
    <MarketingDepartmentContext.Provider value={value}>{children}</MarketingDepartmentContext.Provider>
  )
}

export function useMarketingDepartment(): MarketingDepartmentContextValue {
  const ctx = useContext(MarketingDepartmentContext)
  if (!ctx) throw new Error('useMarketingDepartment must be used inside MarketingDepartmentProvider')
  return ctx
}
