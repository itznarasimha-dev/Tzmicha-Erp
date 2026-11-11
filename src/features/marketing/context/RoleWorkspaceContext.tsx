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
  ApprovalStatus,
  ExpenseStageStatus,
  WorkspaceActivity,
  WorkspaceActivityType,
  WorkspaceApproval,
  WorkspaceExpense,
  WorkspaceExpenseDraft,
  WorkspaceIdea,
  WorkspaceIdeaDraft,
  WorkspaceLead,
  WorkspaceLeadDraft,
  WorkspaceLeadStatus,
  WorkspacePlan,
  WorkspacePlanDraft,
  WorkspaceTask,
  WorkspaceTaskDraft,
  WorkspaceTimelineEntry,
} from '../types/workspace'
import {
  SEED_ACTIVITIES,
  SEED_APPROVALS,
  SEED_EXPENSES,
  SEED_IDEAS,
  SEED_PLANS,
  SEED_TASKS,
  SEED_WORKSPACE_LEADS,
  employeeName,
} from '../data/marketing/workspace'
import { uid } from '../utils/format'

const STORAGE_KEY = 'totally-erp-marketing-role-workspace-v1'

interface WorkspaceState {
  tasks: WorkspaceTask[]
  ideas: WorkspaceIdea[]
  expenses: WorkspaceExpense[]
  approvals: WorkspaceApproval[]
  plans: WorkspacePlan[]
  activities: WorkspaceActivity[]
  leads: WorkspaceLead[]
  leadIncrements: Record<string, number>
}

interface UpdateMeta {
  actor: string
  role: string
  note?: string
  tone?: WorkspaceTimelineEntry['tone']
}

interface RoleWorkspaceContextValue extends WorkspaceState {
  addTask: (draft: WorkspaceTaskDraft) => WorkspaceTask
  updateTask: (id: string, patch: Partial<WorkspaceTask>) => void
  addIdea: (draft: WorkspaceIdeaDraft) => WorkspaceIdea
  updateIdeaStatus: (
    id: string,
    status: WorkspaceIdea['status'],
    meta: UpdateMeta,
    feedback?: { managerFeedback?: string; seniorFeedback?: string },
  ) => void
  addExpense: (draft: WorkspaceExpenseDraft) => WorkspaceExpense
  updateExpenseStatus: (
    id: string,
    status: ExpenseStageStatus,
    meta: UpdateMeta,
    comments?: string,
  ) => void
  addApproval: (approval: Omit<WorkspaceApproval, 'id' | 'createdAt' | 'updatedAt' | 'timeline'> & {
    timeline?: WorkspaceTimelineEntry[]
  }) => WorkspaceApproval
  updateApprovalStatus: (
    id: string,
    status: ApprovalStatus,
    stage: WorkspaceApproval['currentStage'],
    meta: UpdateMeta,
  ) => void
  addPlan: (draft: WorkspacePlanDraft) => WorkspacePlan
  updatePlan: (id: string, patch: Partial<WorkspacePlan>) => void
  logActivity: (activity: Omit<WorkspaceActivity, 'id'>) => WorkspaceActivity
  addLead: (draft: WorkspaceLeadDraft) => WorkspaceLead
  updateLead: (id: string, patch: Partial<WorkspaceLead>) => void
  resetWorkspace: () => void
}

const RoleWorkspaceContext = createContext<RoleWorkspaceContextValue | null>(null)

function seedState(): WorkspaceState {
  return {
    tasks: structuredClone(SEED_TASKS),
    ideas: structuredClone(SEED_IDEAS),
    expenses: structuredClone(SEED_EXPENSES),
    approvals: structuredClone(SEED_APPROVALS),
    plans: structuredClone(SEED_PLANS),
    activities: structuredClone(SEED_ACTIVITIES),
    leads: structuredClone(SEED_WORKSPACE_LEADS),
    leadIncrements: {},
  }
}

function hydrate(): WorkspaceState {
  const seed = seedState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>
    if (!parsed || typeof parsed !== 'object') return seed
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seed.tasks,
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas : seed.ideas,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : seed.expenses,
      approvals: Array.isArray(parsed.approvals) ? parsed.approvals : seed.approvals,
      plans: Array.isArray(parsed.plans) ? parsed.plans : seed.plans,
      activities: Array.isArray(parsed.activities) ? parsed.activities : seed.activities,
      leads: Array.isArray(parsed.leads) ? parsed.leads : seed.leads,
      leadIncrements:
        parsed.leadIncrements && typeof parsed.leadIncrements === 'object'
          ? parsed.leadIncrements
          : seed.leadIncrements,
    }
  } catch {
    return seed
  }
}

function entry(meta: UpdateMeta): WorkspaceTimelineEntry {
  return {
    id: uid('WTL'),
    at: new Date().toISOString(),
    actor: meta.actor,
    role: meta.role,
    action: meta.role,
    note: meta.note,
    tone: meta.tone ?? 'info',
  }
}

export function RoleWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(hydrate)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* The workspace remains in memory if browser storage is unavailable. */
    }
  }, [state])

  const addTask = useCallback((draft: WorkspaceTaskDraft) => {
    const now = new Date().toISOString()
    const task: WorkspaceTask = {
      ...draft,
      id: uid('TSK'),
      assignedToName: employeeName(draft.assignedToId),
      status: 'Not Started',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    }
    setState((current) => ({ ...current, tasks: [task, ...current.tasks] }))
    return task
  }, [])

  const updateTask = useCallback((id: string, patch: Partial<WorkspaceTask>) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task,
      ),
    }))
  }, [])

  const addIdea = useCallback((draft: WorkspaceIdeaDraft) => {
    const now = new Date().toISOString()
    const status: WorkspaceIdea['status'] =
      draft.submittedByRole === 'senior'
        ? 'Pending Manager Review'
        : draft.seniorId
          ? 'Under Senior Review'
          : 'Pending Manager Review'
    const idea: WorkspaceIdea = {
      ...draft,
      id: uid('IDEA'),
      status,
      managerFeedback: '',
      seniorFeedback: '',
      createdAt: now,
      updatedAt: now,
      timeline: [
        {
          id: uid('WTL'),
          at: now,
          actor: draft.submittedByName,
          role: draft.submittedByRole === 'senior' ? 'Senior Marketing Executive' : 'Junior Marketing Executive',
          action: 'Idea submitted',
          note: draft.expectedBenefits,
          tone: 'info',
        },
      ],
    }
    setState((current) => ({ ...current, ideas: [idea, ...current.ideas] }))
    return idea
  }, [])

  const updateIdeaStatus = useCallback<RoleWorkspaceContextValue['updateIdeaStatus']>(
    (id, status, meta, feedback) => {
      setState((current) => ({
        ...current,
        ideas: current.ideas.map((idea) =>
          idea.id === id
            ? {
                ...idea,
                status,
                updatedAt: new Date().toISOString(),
                managerFeedback: feedback?.managerFeedback ?? idea.managerFeedback,
                seniorFeedback: feedback?.seniorFeedback ?? idea.seniorFeedback,
                timeline: [
                  ...idea.timeline,
                  {
                    ...entry(meta),
                    action: meta.note ? status : status,
                  },
                ],
              }
            : idea,
        ),
      }))
    },
    [],
  )

  const addExpense = useCallback((draft: WorkspaceExpenseDraft) => {
    const now = new Date().toISOString()
    const status: ExpenseStageStatus = draft.seniorId ? 'Under Senior Review' : 'Manager Review'
    const expense: WorkspaceExpense = {
      ...draft,
      id: uid('EXP'),
      status,
      comments: '',
      createdAt: now,
      updatedAt: now,
      timeline: [
        {
          id: uid('WTL'),
          at: now,
          actor: draft.submittedByName,
          role: 'Junior Marketing Executive',
          action: 'Expense submitted',
          note: draft.description,
          tone: 'info',
        },
      ],
    }
    setState((current) => ({ ...current, expenses: [expense, ...current.expenses] }))
    return expense
  }, [])

  const updateExpenseStatus = useCallback<RoleWorkspaceContextValue['updateExpenseStatus']>(
    (id, status, meta, comments) => {
      setState((current) => ({
        ...current,
        expenses: current.expenses.map((expense) =>
          expense.id === id
            ? {
                ...expense,
                status,
                comments: comments ?? expense.comments,
                updatedAt: new Date().toISOString(),
                timeline: [...expense.timeline, { ...entry(meta), action: status }],
              }
            : expense,
        ),
      }))
    },
    [],
  )

  const addApproval = useCallback<RoleWorkspaceContextValue['addApproval']>((approval) => {
    const now = new Date().toISOString()
    const record: WorkspaceApproval = {
      ...approval,
      id: uid('APR'),
      createdAt: now,
      updatedAt: now,
      timeline: approval.timeline ?? [
        {
          id: uid('WTL'),
          at: now,
          actor: approval.submittedByName,
          role: approval.submittedByLabel,
          action: 'Submitted',
          note: approval.summary,
          tone: 'info',
        },
      ],
    }
    setState((current) => ({ ...current, approvals: [record, ...current.approvals] }))
    return record
  }, [])

  const updateApprovalStatus = useCallback<RoleWorkspaceContextValue['updateApprovalStatus']>(
    (id, status, stage, meta) => {
      setState((current) => ({
        ...current,
        approvals: current.approvals.map((approval) =>
          approval.id === id
            ? {
                ...approval,
                status,
                currentStage: stage,
                updatedAt: new Date().toISOString(),
                timeline: [...approval.timeline, { ...entry(meta), action: status }],
              }
            : approval,
        ),
      }))
    },
    [],
  )

  const addPlan = useCallback((draft: WorkspacePlanDraft) => {
    const now = new Date().toISOString()
    const plan: WorkspacePlan = {
      ...draft,
      id: uid('PLAN'),
      status: 'Draft',
      owner: 'Meera Iyer',
      createdAt: now,
      updatedAt: now,
    }
    setState((current) => ({ ...current, plans: [plan, ...current.plans] }))
    return plan
  }, [])

  const updatePlan = useCallback((id: string, patch: Partial<WorkspacePlan>) => {
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === id ? { ...plan, ...patch, updatedAt: new Date().toISOString() } : plan,
      ),
    }))
  }, [])

  const logActivity = useCallback((activity: Omit<WorkspaceActivity, 'id'>) => {
    const record: WorkspaceActivity = { ...activity, id: uid('ACT') }
    setState((current) => ({ ...current, activities: [record, ...current.activities] }))
    return record
  }, [])

  const addLead = useCallback((draft: WorkspaceLeadDraft) => {
    const now = new Date().toISOString()
    const lead: WorkspaceLead = {
      ...draft,
      id: uid('WLEAD'),
      status: 'New Lead',
      createdAt: now,
      updatedAt: now,
    }
    setState((current) => ({
      ...current,
      leads: [lead, ...current.leads],
      leadIncrements: {
        ...current.leadIncrements,
        [draft.ownerId]: (current.leadIncrements[draft.ownerId] ?? 0) + 1,
      },
    }))
    return lead
  }, [])

  const updateLead = useCallback((id: string, patch: Partial<WorkspaceLead>) => {
    setState((current) => ({
      ...current,
      leads: current.leads.map((lead) =>
        lead.id === id ? { ...lead, ...patch, updatedAt: new Date().toISOString() } : lead,
      ),
    }))
  }, [])

  const resetWorkspace = useCallback(() => {
    setState(seedState())
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      addTask,
      updateTask,
      addIdea,
      updateIdeaStatus,
      addExpense,
      updateExpenseStatus,
      addApproval,
      updateApprovalStatus,
      addPlan,
      updatePlan,
      logActivity,
      addLead,
      updateLead,
      resetWorkspace,
    }),
    [
      state,
      addTask,
      updateTask,
      addIdea,
      updateIdeaStatus,
      addExpense,
      updateExpenseStatus,
      addApproval,
      updateApprovalStatus,
      addPlan,
      updatePlan,
      logActivity,
      addLead,
      updateLead,
      resetWorkspace,
    ],
  )

  return <RoleWorkspaceContext.Provider value={value}>{children}</RoleWorkspaceContext.Provider>
}

export function useRoleWorkspace(): RoleWorkspaceContextValue {
  const ctx = useContext(RoleWorkspaceContext)
  if (!ctx) throw new Error('useRoleWorkspace must be used inside RoleWorkspaceProvider')
  return ctx
}

export const ACTIVITY_TYPES: WorkspaceActivityType[] = [
  'Customer Visit',
  'Phone Call',
  'Follow-up',
  'Field Marketing',
  'Campaign Participation',
  'Digital Marketing',
  'Lead Collection',
]

export const LEAD_STATUSES: WorkspaceLeadStatus[] = ['New Lead', 'Follow-up', 'Qualified', 'Rejected']
