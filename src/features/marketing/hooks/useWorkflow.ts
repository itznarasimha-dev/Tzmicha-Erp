import { useCallback, useMemo } from 'react'
import { useDemoData } from '../context/DemoDataContext'
import { useDemoRole } from '../context/DemoRoleContext'
import { useToast } from '../context/ToastContext'
import type {
  AdminAuthorizationState,
  MarketingExpenseDraft,
  MarketingExpenseRequest,
  MonthlyPlan,
  MonthlyPlanDraft,
  PlanActivity,
  PlanExecution,
  WorkflowApprovalEntry,
} from '../types/workflow'
import { uid } from '../utils/format'
import {
  canCreateExpense,
  canCreatePlan,
  canDecideExpense,
  canDecidePlan,
  canEditExpense,
  canEditPlan,
  canReviewPlanResults,
  canStartExecution,
  canSubmitExpense,
  canSubmitPlan,
  canUpdateExecution,
  computeRoleMetrics,
  employeeNameById,
  expenseBelongsToRole,
  expenseDecisionStage,
  financeRequiredFor,
  isExpenseAwaitingAdmin,
  isPlanAwaitingAdmin,
  managerReviewRequiredFor,
  planBelongsToRole,
  planDecisionStage,
  routeAfterPlanApproval,
  routeAfterPlanSubmit,
  workflowInboxItems,
} from '../utils/workflow'

export interface ExecutionUpdateInput {
  completedActivities: number
  actualLeads: number
  qualifiedLeads: number
  completedFieldVisits: number
  tradePartnerVisits: number
  actualSpending: number
  executionPercent: number
  results: string
  remarks: string
}

function emptyExecution(): PlanExecution {
  return {
    startedAt: null,
    completedActivities: 0,
    actualLeads: 0,
    qualifiedLeads: 0,
    completedFieldVisits: 0,
    tradePartnerVisits: 0,
    actualSpending: 0,
    executionPercent: 0,
    results: '',
    remarks: '',
    updatedAt: null,
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

const ADMIN_DEMO_ACTOR = 'Existing Admin Dashboard (demo)'

function pendingAdminAuthorization(comments: string): AdminAuthorizationState {
  return {
    required: true,
    status: 'Pending',
    requestedAt: nowIso(),
    decidedAt: null,
    decidedBy: null,
    comments,
    simulated: false,
  }
}

function decidedAdminAuthorization(
  current: AdminAuthorizationState | undefined,
  decision: 'authorize' | 'reject',
  comments: string,
): AdminAuthorizationState {
  return {
    required: current?.required ?? true,
    status: decision === 'authorize' ? 'Authorized' : 'Rejected',
    requestedAt: current?.requestedAt ?? nowIso(),
    decidedAt: nowIso(),
    decidedBy: ADMIN_DEMO_ACTOR,
    comments: comments.trim() || 'Simulated Admin financial decision.',
    simulated: true,
  }
}

function approvalEntry(
  stage: WorkflowApprovalEntry['stage'],
  action: string,
  byRoleId: WorkflowApprovalEntry['byRoleId'],
  byName: string,
  decision: WorkflowApprovalEntry['decision'],
  comments?: string,
): WorkflowApprovalEntry {
  return {
    id: uid('APR'),
    stage,
    action,
    byRoleId,
    byName,
    at: nowIso(),
    decision,
    comments: comments?.trim() || undefined,
  }
}

export function useWorkflow() {
  const { data, update, addNotification } = useDemoData()
  const { roleId, profile } = useDemoRole()
  const { pushToast } = useToast()
  const config = data.workflowConfig

  const plans = data.monthlyPlans
  const expenses = data.marketingExpenses

  const visiblePlans = useMemo(
    () => plans.filter((plan) => planBelongsToRole(plan, roleId, profile)),
    [plans, roleId, profile],
  )

  const visibleExpenses = useMemo(
    () => expenses.filter((expense) => expenseBelongsToRole(expense, roleId, profile)),
    [expenses, roleId, profile],
  )

  const metrics = useMemo(
    () => computeRoleMetrics(plans, expenses, roleId, profile, config),
    [plans, expenses, roleId, profile, config],
  )

  const inboxItems = useMemo(
    () => workflowInboxItems(plans, expenses, roleId, profile, config),
    [plans, expenses, roleId, profile, config],
  )

  const createPlan = useCallback(
    (draft: MonthlyPlanDraft): MonthlyPlan | null => {
      if (!canCreatePlan(roleId)) {
        pushToast({
          title: 'Plan creation is role-based',
          description: 'Monthly plans are created by Junior and Senior Marketing Executives. Switch the preview role to create one.',
          tone: 'warning',
        })
        return null
      }
      const now = nowIso()
      const planRole = roleId === 'senior' ? 'senior' : 'junior'
      const reviewerId =
        planRole === 'junior'
          ? draft.seniorReviewerId !== undefined
            ? draft.seniorReviewerId || null
            : config.reviewersByEmployee[profile.employeeId] ?? null
          : null
      const plan: MonthlyPlan = {
        id: uid(`PLN-M-${draft.month}`),
        title: draft.title.trim(),
        month: draft.month,
        employeeId: profile.employeeId,
        employeeName: profile.name,
        employeeRole: profile.roleLabel,
        roleId: planRole,
        seniorReviewerId: reviewerId,
        objective: draft.objective.trim(),
        targetAudience: draft.targetAudience.trim(),
        plannedActivities: draft.plannedActivities.trim(),
        expectedLeads: draft.expectedLeads,
        expectedConversions: draft.expectedConversions,
        monthlyTarget: draft.monthlyTarget,
        estimatedBudget: draft.estimatedBudget,
        requestedAmount: draft.requestedAmount || draft.estimatedBudget,
        expectedOutcome: draft.expectedOutcome.trim(),
        startDate: draft.startDate,
        endDate: draft.endDate,
        supportingNotes: draft.supportingNotes.trim(),
        activities: draft.activities.map((activity) => ({
          ...activity,
          id: activity.id || uid('ACT'),
        })),
        status: 'Draft',
        financeRequired: financeRequiredFor(draft.estimatedBudget, config),
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
        currentApprover: profile.name,
        previousApprover: null,
        approvals: [],
        execution: emptyExecution(),
      }
      update('monthlyPlans', (current) => [plan, ...current])
      addNotification({
        title: 'Monthly plan saved as draft',
        body: `${plan.title} was created for ${plan.month}. Submit it to start the approval workflow.`,
        kind: 'approval',
        href: '/marketing/plans/monthly-plans',
      })
      pushToast({
        title: 'Draft plan created',
        description: `${plan.title} is stored locally. Submit it when the plan is ready.`,
        tone: 'success',
      })
      return plan
    },
    [addNotification, config, profile, pushToast, roleId, update],
  )

  const updatePlan = useCallback(
    (planId: string, draft: MonthlyPlanDraft): boolean => {
      const plan = plans.find((item) => item.id === planId)
      if (!plan) return false
      if (!canEditPlan(plan, profile)) {
        pushToast({
          title: 'This plan cannot be edited',
          description: 'Only the plan owner can edit a draft, changes-requested or rejected plan.',
          tone: 'warning',
        })
        return false
      }
      update('monthlyPlans', (current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                title: draft.title.trim(),
                month: draft.month,
                objective: draft.objective.trim(),
                targetAudience: draft.targetAudience.trim(),
                plannedActivities: draft.plannedActivities.trim(),
                expectedLeads: draft.expectedLeads,
                expectedConversions: draft.expectedConversions,
                monthlyTarget: draft.monthlyTarget,
                estimatedBudget: draft.estimatedBudget,
                requestedAmount: draft.requestedAmount || draft.estimatedBudget,
                expectedOutcome: draft.expectedOutcome.trim(),
                startDate: draft.startDate,
                endDate: draft.endDate,
                supportingNotes: draft.supportingNotes.trim(),
                seniorReviewerId:
                  item.roleId === 'junior' ? draft.seniorReviewerId || null : null,
                activities: draft.activities.map((activity) => ({
                  ...activity,
                  id: activity.id || uid('ACT'),
                })),
                financeRequired: financeRequiredFor(draft.estimatedBudget, config),
                updatedAt: nowIso(),
              }
            : item,
        ),
      )
      pushToast({
        title: 'Plan updated',
        description: `${draft.title.trim()} was saved. Resubmit it to continue the workflow.`,
        tone: 'success',
      })
      return true
    },
    [config, plans, profile, pushToast, update],
  )

  const submitPlan = useCallback(
    (planId: string): boolean => {
      const plan = plans.find((item) => item.id === planId)
      if (!plan) return false
      if (!canSubmitPlan(plan, profile)) {
        pushToast({
          title: 'Submission blocked',
          description: 'Only the owner can submit a draft, changes-requested or rejected plan.',
          tone: 'warning',
        })
        return false
      }
      if (
        !plan.title.trim() ||
        !plan.objective.trim() ||
        !plan.activities.length ||
        plan.estimatedBudget <= 0
      ) {
        pushToast({
          title: 'Plan is incomplete',
          description: 'Add a title, objective, at least one activity and a budget before submitting.',
          tone: 'error',
        })
        return false
      }

      const financeRequired = financeRequiredFor(plan.estimatedBudget, config)
      // An explicit null reviewer means the owner chose to skip Senior review.
      const reviewerId = plan.seniorReviewerId || null
      const routingPlan: MonthlyPlan = {
        ...plan,
        financeRequired,
        seniorReviewerId: reviewerId,
      }
      const route = routeAfterPlanSubmit(routingPlan, config)
      const resubmission = ['Changes Requested', 'Rejected'].includes(plan.status)
      const entry = approvalEntry(
        'submission',
        resubmission ? 'Resubmitted monthly plan' : 'Submitted monthly plan',
        'employee',
        profile.name,
        'Submitted',
        resubmission ? 'Plan revised and resubmitted for the full approval workflow.' : undefined,
      )

      update('monthlyPlans', (current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                status: route.status,
                financeRequired,
                seniorReviewerId: reviewerId,
                submittedAt: nowIso(),
                updatedAt: nowIso(),
                currentApprover: route.approver,
                previousApprover: profile.name,
                revisionReason: undefined,
                adminAuthorization: undefined,
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${plan.title} submitted`,
        body: `${profile.name} submitted a monthly plan for ${route.approver ?? 'the next review stage'}.`,
        kind: 'approval',
        href: '/marketing/approvals/approval-inbox',
      })
      pushToast({
        title: resubmission ? 'Plan resubmitted' : 'Plan submitted',
        description: `Routed to ${route.approver ?? 'the next stage'}. Approval stages cannot be skipped.`,
        tone: 'success',
      })
      return true
    },
    [addNotification, config, plans, profile, pushToast, update],
  )

  const approvePlan = useCallback(
    (planId: string, comments?: string): boolean => {
      const plan = plans.find((item) => item.id === planId)
      if (!plan) return false
      if (!canDecidePlan(plan, roleId, profile)) {
        pushToast({
          title: 'Approval blocked',
          description: 'This plan is not awaiting a decision from your preview role.',
          tone: 'warning',
        })
        return false
      }
      const stage = planDecisionStage(plan)
      if (!stage) return false
      const route = routeAfterPlanApproval(plan, stage, config)
      const action = stage === 'senior' ? 'Approved and forwarded' : 'Approved plan'
      const entry = approvalEntry(stage, action, roleId, profile.name, 'Approved', comments)
      const awaitingAdmin = route.status === 'Pending Admin Financial Authorization'

      update('monthlyPlans', (current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                status: route.status,
                currentApprover: route.approver,
                previousApprover: profile.name,
                updatedAt: nowIso(),
                adminAuthorization: awaitingAdmin
                  ? pendingAdminAuthorization(
                      'Forwarded to the existing Totally ERP Admin Dashboard for financial authorization.',
                    )
                  : item.adminAuthorization,
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${plan.title} — ${action}`,
        body:
          route.approver
            ? `${profile.name} approved the plan. It is now with ${route.approver}.`
            : `${profile.name} completed the final approval. The plan is ready to execute.`,
        kind: 'approval',
        href: '/marketing/approvals/approval-inbox',
      })
      pushToast({
        title: awaitingAdmin ? 'Forwarded for Admin authorization' : 'Plan approved',
        description: route.approver
          ? `Forwarded to ${route.approver}. The next stage cannot be skipped.`
          : 'The plan is approved and ready for execution.',
        tone: 'success',
      })
      return true
    },
    [addNotification, config, plans, profile, pushToast, roleId, update],
  )

  const requestPlanChanges = useCallback(
    (planId: string, reason: string): boolean => {
      const trimmed = reason.trim()
      if (!trimmed) {
        pushToast({
          title: 'A reason is required',
          description: 'Explain exactly what the plan owner must change before resubmitting.',
          tone: 'warning',
        })
        return false
      }
      const plan = plans.find((item) => item.id === planId)
      if (!plan || !canDecidePlan(plan, roleId, profile)) return false
      const stage = planDecisionStage(plan)
      if (!stage) return false
      const entry = approvalEntry(stage, 'Requested changes', roleId, profile.name, 'Changes Requested', trimmed)

      update('monthlyPlans', (current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                status: 'Changes Requested',
                revisionReason: trimmed,
                currentApprover: item.employeeName,
                previousApprover: profile.name,
                updatedAt: nowIso(),
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${plan.title} — changes requested`,
        body: `${profile.name} requested changes: ${trimmed}`,
        kind: 'approval',
        href: '/marketing/plans/monthly-plans',
      })
      pushToast({
        title: 'Changes requested',
        description: 'The plan owner must revise and resubmit. The approval chain restarts at the first stage.',
        tone: 'warning',
      })
      return true
    },
    [addNotification, plans, profile, pushToast, roleId, update],
  )

  const rejectPlan = useCallback(
    (planId: string, reason: string): boolean => {
      const trimmed = reason.trim()
      if (!trimmed) {
        pushToast({
          title: 'A rejection reason is required',
          description: 'Add a clear reason so the owner understands the decision.',
          tone: 'warning',
        })
        return false
      }
      const plan = plans.find((item) => item.id === planId)
      if (!plan || !canDecidePlan(plan, roleId, profile)) return false
      const stage = planDecisionStage(plan)
      if (!stage) return false
      const entry = approvalEntry(stage, 'Rejected plan', roleId, profile.name, 'Rejected', trimmed)

      update('monthlyPlans', (current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                status: 'Rejected',
                revisionReason: trimmed,
                currentApprover: null,
                previousApprover: profile.name,
                updatedAt: nowIso(),
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${plan.title} — rejected`,
        body: `${profile.name} rejected the plan: ${trimmed}`,
        kind: 'approval',
        href: '/marketing/plans/monthly-plans',
      })
      pushToast({
        title: 'Plan rejected',
        description: 'The owner can revise and resubmit if the plan should continue.',
        tone: 'error',
      })
      return true
    },
    [addNotification, plans, profile, pushToast, roleId, update],
  )

  /**
   * Local demo stand-in for the existing Totally ERP Admin Dashboard.
   * Marketing never presents this as one of its own approval decisions.
   */
  const simulateAdminPlanDecision = useCallback(
    (planId: string, decision: 'authorize' | 'reject', comments: string): boolean => {
      const plan = plans.find((item) => item.id === planId)
      if (!plan || !isPlanAwaitingAdmin(plan)) {
        pushToast({
          title: 'No Admin decision available',
          description: 'This plan is not awaiting financial authorization in the existing Admin Dashboard.',
          tone: 'warning',
        })
        return false
      }
      const trimmed = comments.trim()
      if (decision === 'reject' && !trimmed) {
        pushToast({
          title: 'An Admin rejection reason is required',
          description: 'Record why the budget was not authorized.',
          tone: 'warning',
        })
        return false
      }
      const entry = approvalEntry(
        'admin',
        decision === 'authorize' ? 'Authorized budget (demo)' : 'Rejected budget (demo)',
        'admin-demo',
        ADMIN_DEMO_ACTOR,
        decision === 'authorize' ? 'Approved' : 'Rejected',
        trimmed || 'Simulated Admin financial decision.',
      )
      update('monthlyPlans', (current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                status:
                  decision === 'authorize'
                    ? 'Approved — Ready to Execute'
                    : 'Rejected',
                currentApprover: null,
                previousApprover: ADMIN_DEMO_ACTOR,
                updatedAt: nowIso(),
                revisionReason: decision === 'reject' ? trimmed : item.revisionReason,
                adminAuthorization: decidedAdminAuthorization(
                  item.adminAuthorization,
                  decision,
                  trimmed,
                ),
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${plan.title} — Admin financial ${decision === 'authorize' ? 'authorization' : 'rejection'}`,
        body: `Simulated Admin Dashboard outcome: ${decision === 'authorize' ? 'budget authorized' : `rejected — ${trimmed}`}.`,
        kind: 'approval',
        href: '/marketing/plans/monthly-plans',
      })
      pushToast({
        title:
          decision === 'authorize'
            ? 'Admin budget authorized (demo)'
            : 'Admin budget rejected (demo)',
        description:
          decision === 'authorize'
            ? 'The plan is ready to execute. This outcome was simulated locally, not made in the Marketing Portal.'
            : 'The plan owner can revise and resubmit. The stage was simulated locally, not decided by Marketing.',
        tone: decision === 'authorize' ? 'success' : 'error',
      })
      return true
    },
    [addNotification, plans, pushToast, update],
  )

  const startExecution = useCallback(
    (planId: string): boolean => {
      const plan = plans.find((item) => item.id === planId)
      if (!plan || !canStartExecution(plan, profile)) {
        pushToast({
          title: 'Execution cannot start',
          description: 'Only the plan owner can start an approved plan.',
          tone: 'warning',
        })
        return false
      }
      const entry = approvalEntry('execution', 'Started execution', 'employee', profile.name, 'Started')
      update('monthlyPlans', (current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                status: 'In Progress',
                updatedAt: nowIso(),
                execution: {
                  ...item.execution,
                  startedAt: nowIso(),
                  updatedAt: nowIso(),
                },
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      pushToast({
        title: 'Execution started',
        description: `${plan.title} is now in progress. Update actual leads and spend as the month runs.`,
        tone: 'success',
      })
      return true
    },
    [plans, profile, pushToast, update],
  )

  const updateExecution = useCallback(
    (planId: string, input: ExecutionUpdateInput, submitForReview: boolean): boolean => {
      const plan = plans.find((item) => item.id === planId)
      if (!plan || !canUpdateExecution(plan, profile)) {
        pushToast({
          title: 'Execution update blocked',
          description: 'Only the plan owner can update an in-progress plan.',
          tone: 'warning',
        })
        return false
      }
      if (submitForReview && !input.results.trim()) {
        pushToast({
          title: 'Results summary is required',
          description: 'Record the monthly results before submitting them for review.',
          tone: 'warning',
        })
        return false
      }
      const entry = approvalEntry(
        submitForReview ? 'results' : 'execution',
        submitForReview ? 'Submitted results for review' : 'Progress updated',
        'employee',
        profile.name,
        submitForReview ? 'Results Submitted' : 'Progress Updated',
        submitForReview ? input.results.trim() : input.remarks.trim(),
      )
      update('monthlyPlans', (current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                status: submitForReview ? 'Submitted for Results Review' : 'In Progress',
                updatedAt: nowIso(),
                resultsSubmittedAt: submitForReview ? nowIso() : item.resultsSubmittedAt,
                currentApprover: submitForReview ? employeeNameById(config.managerId) : null,
                previousApprover: profile.name,
                execution: {
                  ...item.execution,
                  completedActivities: input.completedActivities,
                  actualLeads: input.actualLeads,
                  qualifiedLeads: input.qualifiedLeads,
                  completedFieldVisits: input.completedFieldVisits,
                  tradePartnerVisits: input.tradePartnerVisits,
                  actualSpending: input.actualSpending,
                  executionPercent: Math.max(0, Math.min(100, input.executionPercent)),
                  results: input.results.trim(),
                  remarks: input.remarks.trim(),
                  updatedAt: nowIso(),
                },
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      if (submitForReview) {
        addNotification({
          title: `${plan.title} — results submitted`,
          body: `${profile.name} submitted monthly results for manager review.`,
          kind: 'approval',
          href: '/marketing/approvals/approval-inbox',
        })
      }
      pushToast({
        title: submitForReview ? 'Results submitted' : 'Execution updated',
        description: submitForReview
          ? 'The manager must review the results before the plan can be completed.'
          : 'Actual leads, spend and progress were saved locally.',
        tone: 'success',
      })
      return true
    },
    [addNotification, config.managerId, plans, profile, pushToast, update],
  )

  const reviewResults = useCallback(
    (planId: string, decision: 'complete' | 'revision', comments: string): boolean => {
      const plan = plans.find((item) => item.id === planId)
      if (!plan || !canReviewPlanResults(plan, roleId)) {
        pushToast({
          title: 'Results review blocked',
          description: 'Only the Marketing Manager can review submitted results.',
          tone: 'warning',
        })
        return false
      }
      const trimmed = comments.trim()
      if (decision === 'revision' && !trimmed) {
        pushToast({
          title: 'A revision reason is required',
          description: 'Explain what the owner must correct before resubmitting results.',
          tone: 'warning',
        })
        return false
      }
      const entry = approvalEntry(
        'results',
        decision === 'complete' ? 'Results reviewed and completed' : 'Requested results revision',
        roleId,
        profile.name,
        decision === 'complete' ? 'Completed' : 'Revision Requested',
        trimmed,
      )
      update('monthlyPlans', (current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                status: decision === 'complete' ? 'Completed' : 'In Progress',
                completedAt: decision === 'complete' ? nowIso() : item.completedAt,
                revisionReason: decision === 'revision' ? trimmed : undefined,
                currentApprover: decision === 'revision' ? item.employeeName : null,
                previousApprover: profile.name,
                updatedAt: nowIso(),
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${plan.title} — ${decision === 'complete' ? 'completed' : 'results revision requested'}`,
        body:
          decision === 'complete'
            ? `${profile.name} reviewed and completed the monthly plan.`
            : `${profile.name} requested a results revision: ${trimmed}`,
        kind: 'approval',
        href: '/marketing/plans/monthly-plans',
      })
      pushToast({
        title: decision === 'complete' ? 'Plan completed' : 'Results revision requested',
        description:
          decision === 'complete'
            ? 'The monthly plan is closed with reviewed results.'
            : 'The owner can update execution results and resubmit.',
        tone: decision === 'complete' ? 'success' : 'warning',
      })
      return true
    },
    [addNotification, plans, profile, pushToast, roleId, update],
  )

  const createExpense = useCallback(
    (draft: MarketingExpenseDraft): MarketingExpenseRequest | null => {
      if (!canCreateExpense(roleId)) {
        pushToast({
          title: 'Expense creation is role-based',
          description: 'Junior and Senior Marketing Executives can raise plan-linked expenses.',
          tone: 'warning',
        })
        return null
      }
      const plan = plans.find((item) => item.id === draft.planId)
      if (!plan) {
        pushToast({
          title: 'Select a monthly plan',
          description: 'Every expense must be linked to one of your monthly plans.',
          tone: 'warning',
        })
        return null
      }
      const activity = plan.activities.find((item) => item.id === draft.activityId)
      const expense: MarketingExpenseRequest = {
        id: uid('MEXP'),
        title: draft.title.trim(),
        planId: plan.id,
        planTitle: plan.title,
        activityId: activity?.id ?? null,
        activityName: activity?.name ?? 'Plan-level expense',
        activityType: activity?.type ?? '',
        employeeId: profile.employeeId,
        employeeName: profile.name,
        roleId: roleId === 'senior' ? 'senior' : 'junior',
        category: draft.category,
        amount: draft.amount,
        expenseDate: draft.expenseDate,
        description: draft.description.trim(),
        documentName: draft.documentName.trim(),
        submittedAt: null,
        status: 'Draft',
        managerRequired: managerReviewRequiredFor(draft.amount, config),
        reviewerComments: '',
        currentApprover: null,
        approvals: [],
      }
      update('marketingExpenses', (current) => [expense, ...current])
      addNotification({
        title: 'Draft expense saved',
        body: `${expense.title} was saved against ${plan.title}. Plan approval does not approve expenses.`,
        kind: 'expense',
        href: '/marketing/expenses/monthly-expenses',
      })
      pushToast({
        title: 'Draft expense created',
        description: 'Submit it separately for manager review and Admin financial authorization.',
        tone: 'success',
      })
      return expense
    },
    [addNotification, config, plans, profile, pushToast, roleId, update],
  )

  const updateExpense = useCallback(
    (expenseId: string, draft: MarketingExpenseDraft): boolean => {
      const expense = expenses.find((item) => item.id === expenseId)
      if (!expense || !canEditExpense(expense, profile)) {
        pushToast({
          title: 'Expense cannot be edited',
          description: 'Only the owner can edit a draft or rejected expense.',
          tone: 'warning',
        })
        return false
      }
      const plan = plans.find((item) => item.id === draft.planId)
      const activity = plan?.activities.find((item) => item.id === draft.activityId)
      update('marketingExpenses', (current) =>
        current.map((item) =>
          item.id === expenseId
            ? {
                ...item,
                title: draft.title.trim(),
                planId: draft.planId,
                planTitle: plan?.title ?? item.planTitle,
                activityId: activity?.id ?? null,
                activityName: activity?.name ?? 'Plan-level expense',
                activityType: activity?.type ?? '',
                category: draft.category,
                amount: draft.amount,
                expenseDate: draft.expenseDate,
                description: draft.description.trim(),
                documentName: draft.documentName.trim(),
                managerRequired: managerReviewRequiredFor(draft.amount, config),
                adminAuthorization: undefined,
              }
            : item,
        ),
      )
      pushToast({
        title: 'Expense updated',
        description: 'The expense draft was saved locally.',
        tone: 'success',
      })
      return true
    },
    [config, expenses, plans, profile, pushToast, update],
  )

  const submitExpense = useCallback(
    (expenseId: string): boolean => {
      const expense = expenses.find((item) => item.id === expenseId)
      if (!expense || !canSubmitExpense(expense, profile)) {
        pushToast({
          title: 'Submission blocked',
          description: 'Only the owner can submit a draft or rejected expense.',
          tone: 'warning',
        })
        return false
      }
      if (expense.amount <= 0 || !expense.title.trim()) {
        pushToast({
          title: 'Expense is incomplete',
          description: 'Add a title and an amount greater than zero.',
          tone: 'error',
        })
        return false
      }
      const managerRequired = managerReviewRequiredFor(expense.amount, config)
      const status: MarketingExpenseRequest['status'] = managerRequired
        ? 'Pending Manager Review'
        : 'Pending Admin Financial Authorization'
      const approverName = managerRequired
        ? employeeNameById(config.managerId)
        : 'Existing Admin Dashboard'
      const resubmission = ['Rejected', 'Changes Requested'].includes(expense.status)
      const entry = approvalEntry(
        'submission',
        resubmission ? 'Resubmitted expense' : 'Submitted expense',
        'employee',
        profile.name,
        'Submitted',
      )
      update('marketingExpenses', (current) =>
        current.map((item) =>
          item.id === expenseId
            ? {
                ...item,
                status,
                managerRequired,
                submittedAt: nowIso(),
                reviewerComments: '',
                currentApprover: approverName,
                adminAuthorization: managerRequired
                  ? undefined
                  : pendingAdminAuthorization(
                      'Submitted directly to the existing Totally ERP Admin Dashboard for financial authorization.',
                    ),
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${expense.title} submitted`,
        body: `Expense routed to ${approverName}. Approving the monthly plan does not approve this expense.`,
        kind: 'expense',
        href: '/marketing/approvals/approval-inbox',
      })
      pushToast({
        title: 'Expense submitted',
        description: `Routed to ${approverName}. The plan approval and expense approval remain separate.`,
        tone: 'success',
      })
      return true
    },
    [addNotification, config, expenses, profile, pushToast, update],
  )

  const requestExpenseChanges = useCallback(
    (expenseId: string, reason: string): boolean => {
      const trimmed = reason.trim()
      if (!trimmed) {
        pushToast({
          title: 'A reason is required',
          description: 'Explain exactly what the employee must correct before resubmitting.',
          tone: 'warning',
        })
        return false
      }
      const expense = expenses.find((item) => item.id === expenseId)
      if (!expense || !canDecideExpense(expense, roleId)) {
        pushToast({
          title: 'Changes cannot be requested',
          description: 'This expense is not awaiting a manager decision from your preview role.',
          tone: 'warning',
        })
        return false
      }
      const stage = expenseDecisionStage(expense)
      if (!stage) return false
      const entry = approvalEntry(
        stage,
        'Requested expense changes',
        roleId,
        profile.name,
        'Changes Requested',
        trimmed,
      )
      update('marketingExpenses', (current) =>
        current.map((item) =>
          item.id === expenseId
            ? {
                ...item,
                status: 'Changes Requested',
                currentApprover: item.employeeName,
                reviewerComments: trimmed,
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${expense.title} — changes requested`,
        body: `${profile.name} requested expense changes: ${trimmed}`,
        kind: 'expense',
        href: '/marketing/expenses/monthly-expenses',
      })
      pushToast({
        title: 'Expense changes requested',
        description: 'The owner must correct the expense and resubmit it. Manager review restarts.',
        tone: 'warning',
      })
      return true
    },
    [addNotification, expenses, profile, pushToast, roleId, update],
  )

  const decideExpense = useCallback(
    (expenseId: string, decision: 'approve' | 'reject', comments: string): boolean => {
      const expense = expenses.find((item) => item.id === expenseId)
      if (!expense || !canDecideExpense(expense, roleId)) {
        pushToast({
          title: 'Expense decision blocked',
          description: 'This expense is not awaiting a manager decision from your preview role.',
          tone: 'warning',
        })
        return false
      }
      const stage = expenseDecisionStage(expense)
      if (!stage) return false
      const trimmed = comments.trim()
      if (decision === 'reject' && !trimmed) {
        pushToast({
          title: 'A rejection reason is required',
          description: 'Explain why the expense cannot be approved.',
          tone: 'warning',
        })
        return false
      }
      const nextStatus: MarketingExpenseRequest['status'] =
        decision === 'reject' ? 'Rejected' : 'Pending Admin Financial Authorization'
      const nextApprover = decision === 'reject' ? null : 'Existing Admin Dashboard'
      const action = decision === 'reject' ? 'Rejected expense' : 'Approved expense'
      const entry = approvalEntry(
        stage,
        action,
        roleId,
        profile.name,
        decision === 'reject' ? 'Rejected' : 'Approved',
        trimmed,
      )
      update('marketingExpenses', (current) =>
        current.map((item) =>
          item.id === expenseId
            ? {
                ...item,
                status: nextStatus,
                currentApprover: nextApprover,
                reviewerComments: trimmed || item.reviewerComments,
                adminAuthorization:
                  decision === 'reject'
                    ? item.adminAuthorization
                    : pendingAdminAuthorization(
                        'Manager approved. Forwarded to the existing Totally ERP Admin Dashboard for financial authorization.',
                      ),
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${expense.title} — ${action}`,
        body:
          decision === 'reject'
            ? `${profile.name} rejected the expense: ${trimmed}`
            : `${profile.name} approved the expense. It is now with the existing Admin Dashboard for financial authorization.`,
        kind: 'expense',
        href: '/marketing/approvals/approval-inbox',
      })
      pushToast({
        title: decision === 'reject' ? 'Expense rejected' : 'Forwarded for Admin authorization',
        description:
          decision === 'reject'
            ? 'The owner can correct and resubmit the expense.'
            : 'Admin financial authorization is the next required step. Marketing does not make that decision.',
        tone: decision === 'reject' ? 'error' : 'success',
      })
      return true
    },
    [addNotification, expenses, profile, pushToast, roleId, update],
  )

  /** Local demo stand-in for the existing Admin app's expense decision. */
  const simulateAdminExpenseDecision = useCallback(
    (expenseId: string, decision: 'authorize' | 'reject', comments: string): boolean => {
      const expense = expenses.find((item) => item.id === expenseId)
      if (!expense || !isExpenseAwaitingAdmin(expense)) {
        pushToast({
          title: 'No Admin decision available',
          description: 'This expense is not awaiting financial authorization in the existing Admin Dashboard.',
          tone: 'warning',
        })
        return false
      }
      const trimmed = comments.trim()
      if (decision === 'reject' && !trimmed) {
        pushToast({
          title: 'An Admin rejection reason is required',
          description: 'Record why the expense was not financially authorized.',
          tone: 'warning',
        })
        return false
      }
      const entry = approvalEntry(
        'admin',
        decision === 'authorize' ? 'Authorized expense (demo)' : 'Rejected expense (demo)',
        'admin-demo',
        ADMIN_DEMO_ACTOR,
        decision === 'authorize' ? 'Approved' : 'Rejected',
        trimmed || 'Simulated Admin financial decision.',
      )
      update('marketingExpenses', (current) =>
        current.map((item) =>
          item.id === expenseId
            ? {
                ...item,
                status: decision === 'authorize' ? 'Approved' : 'Rejected',
                currentApprover: null,
                reviewerComments: trimmed || item.reviewerComments,
                adminAuthorization: decidedAdminAuthorization(
                  item.adminAuthorization,
                  decision,
                  trimmed,
                ),
                approvals: [...item.approvals, entry],
              }
            : item,
        ),
      )
      addNotification({
        title: `${expense.title} — Admin financial ${decision === 'authorize' ? 'authorization' : 'rejection'}`,
        body: `Simulated Admin Dashboard outcome: ${decision === 'authorize' ? 'expense authorized' : `rejected — ${trimmed}`}.`,
        kind: 'expense',
        href: '/marketing/expenses/monthly-expenses',
      })
      pushToast({
        title:
          decision === 'authorize'
            ? 'Admin expense authorized (demo)'
            : 'Admin expense rejected (demo)',
        description:
          decision === 'authorize'
            ? 'The expense is approved. This outcome was simulated locally, not made in the Marketing Portal.'
            : 'The owner can correct and resubmit. The stage was simulated locally, not decided by Marketing.',
        tone: decision === 'authorize' ? 'success' : 'error',
      })
      return true
    },
    [addNotification, expenses, pushToast, update],
  )

  return {
    config,
    roleId,
    profile,
    plans,
    expenses,
    visiblePlans,
    visibleExpenses,
    metrics,
    inboxItems,
    createPlan,
    updatePlan,
    submitPlan,
    approvePlan,
    requestPlanChanges,
    rejectPlan,
    startExecution,
    updateExecution,
    reviewResults,
    simulateAdminPlanDecision,
    createExpense,
    updateExpense,
    submitExpense,
    requestExpenseChanges,
    decideExpense,
    simulateAdminExpenseDecision,
  }
}

export type { MonthlyPlan, MonthlyPlanDraft, MarketingExpenseDraft, MarketingExpenseRequest, PlanActivity }
