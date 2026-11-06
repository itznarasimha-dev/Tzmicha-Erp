import { DEMO_MARKETING_EMPLOYEES, DEMO_ROLE_PROFILES } from '../data/marketing/roleWorkflow'
import type {
  DemoRoleId,
  DemoRoleProfile,
  MarketingEmployee,
  MarketingExpenseRequest,
  MonthlyPlan,
  PlanWorkflowStatus,
  RoleWorkflowMetrics,
  WorkflowConfig,
  WorkflowStageKey,
} from '../types/workflow'
import { formatINR } from './format'

/* ============================================================
   Role-based monthly marketing workflow helpers
   All routing is calculated locally from demo records.
   ============================================================ */

export const PLAN_STATUSES: PlanWorkflowStatus[] = [
  'Draft',
  'Pending Senior Review',
  'Pending Manager Approval',
  'Pending Admin Financial Authorization',
  'Changes Requested',
  'Rejected',
  'Approved — Ready to Execute',
  'In Progress',
  'Submitted for Results Review',
  'Completed',
]

export const APPROVED_PLAN_STATUSES: PlanWorkflowStatus[] = [
  'Approved — Ready to Execute',
  'In Progress',
  'Submitted for Results Review',
  'Completed',
]

export const ACTIVE_PLAN_STATUSES: PlanWorkflowStatus[] = [
  'Approved — Ready to Execute',
  'In Progress',
  'Submitted for Results Review',
]

export type PlanStageState =
  | 'done'
  | 'active'
  | 'skipped'
  | 'upcoming'
  | 'changes'
  | 'rejected'

export interface PlanStageView {
  key: WorkflowStageKey
  label: string
  state: PlanStageState
  detail: string
}

export interface WorkflowInboxItem {
  id: string
  kind: 'plan' | 'expense'
  /** Monitor items are informational only and never expose an approval action. */
  mode: 'decision' | 'action' | 'monitor'
  title: string
  requester: string
  amount: number
  status: string
  at: string
  hint: string
}

export function marketingEmployeeById(
  employeeId: string | null | undefined,
): MarketingEmployee | null {
  if (!employeeId) return null
  return DEMO_MARKETING_EMPLOYEES.find((employee) => employee.employeeId === employeeId) ?? null
}

export function employeeNameById(employeeId: string | null | undefined): string {
  if (!employeeId) return 'Unassigned'
  return marketingEmployeeById(employeeId)?.name ?? employeeId
}

export function roleProfile(roleId: DemoRoleId): DemoRoleProfile {
  return DEMO_ROLE_PROFILES.find((profile) => profile.id === roleId) ?? DEMO_ROLE_PROFILES[0]
}

/** Junior employees assigned to a particular senior reviewer. */
export function assignedJuniorsForSenior(seniorEmployeeId: string): MarketingEmployee[] {
  return DEMO_MARKETING_EMPLOYEES.filter(
    (employee) => employee.roleId === 'junior' && employee.seniorReviewerId === seniorEmployeeId,
  )
}

/** All Marketing employees visible to a role, useful for charts and lead filters. */
export function teamEmployeeIdsForRole(
  roleId: DemoRoleId,
  profile: DemoRoleProfile,
): string[] {
  if (roleId === 'manager') {
    return DEMO_MARKETING_EMPLOYEES.filter((employee) => employee.roleId !== 'admin').map(
      (employee) => employee.employeeId,
    )
  }
  if (roleId === 'senior') {
    return [
      profile.employeeId,
      ...assignedJuniorsForSenior(profile.employeeId).map((employee) => employee.employeeId),
    ]
  }
  return [profile.employeeId]
}

export function canCreatePlan(roleId: DemoRoleId): boolean {
  return roleId === 'junior' || roleId === 'senior'
}

export function canCreateExpense(roleId: DemoRoleId): boolean {
  return roleId === 'junior' || roleId === 'senior'
}

export function planBelongsToRole(
  plan: MonthlyPlan,
  roleId: DemoRoleId,
  profile: DemoRoleProfile,
): boolean {
  if (roleId === 'manager') return true
  if (plan.employeeId === profile.employeeId) return true
  if (roleId === 'senior' && plan.seniorReviewerId === profile.employeeId) return true
  return false
}

export function expenseBelongsToRole(
  expense: MarketingExpenseRequest,
  roleId: DemoRoleId,
  profile: DemoRoleProfile,
): boolean {
  if (roleId === 'manager') return true
  if (expense.employeeId === profile.employeeId) return true
  if (roleId === 'senior') {
    return assignedJuniorsForSenior(profile.employeeId).some(
      (employee) => employee.employeeId === expense.employeeId,
    )
  }
  return false
}

/** Role-scoped lead visibility: own, assigned team, or department. */
export function leadBelongsToRole(
  lead: { assignedTo?: string; generatedBy?: string },
  roleId: DemoRoleId,
  profile: DemoRoleProfile,
): boolean {
  if (roleId === 'manager') return true
  const names = new Set(
    teamEmployeeIdsForRole(roleId, profile)
      .map((employeeId) => marketingEmployeeById(employeeId)?.name)
      .filter((name): name is string => Boolean(name)),
  )
  return names.has(lead.assignedTo ?? '') || names.has(lead.generatedBy ?? '')
}

export function financeRequiredFor(amount: number, config: WorkflowConfig): boolean {
  return amount >= config.financeThreshold
}

export function managerReviewRequiredFor(amount: number, config: WorkflowConfig): boolean {
  return amount >= config.expenseManagerThreshold
}

export function planDecisionStage(plan: MonthlyPlan): 'senior' | 'manager' | null {
  switch (plan.status) {
    case 'Pending Senior Review':
      return 'senior'
    case 'Pending Manager Approval':
      return 'manager'
    default:
      return null
  }
}

export function isPlanAwaitingAdmin(plan: MonthlyPlan): boolean {
  return plan.status === 'Pending Admin Financial Authorization'
}

export function isExpenseAwaitingAdmin(expense: MarketingExpenseRequest): boolean {
  return expense.status === 'Pending Admin Financial Authorization'
}

export function expenseDecisionStage(
  expense: MarketingExpenseRequest,
): 'manager' | null {
  if (expense.status === 'Pending Manager Review') return 'manager'
  return null
}

export function canEditPlan(
  plan: MonthlyPlan,
  profile: DemoRoleProfile,
): boolean {
  if (plan.employeeId !== profile.employeeId) return false
  return ['Draft', 'Changes Requested', 'Rejected'].includes(plan.status)
}

export function canSubmitPlan(
  plan: MonthlyPlan,
  profile: DemoRoleProfile,
): boolean {
  if (plan.employeeId !== profile.employeeId) return false
  return ['Draft', 'Changes Requested', 'Rejected'].includes(plan.status)
}

export function canDecidePlan(
  plan: MonthlyPlan,
  roleId: DemoRoleId,
  profile: DemoRoleProfile,
): boolean {
  const stage = planDecisionStage(plan)
  if (!stage) return false
  if (roleId === 'senior') {
    return stage === 'senior' && plan.seniorReviewerId === profile.employeeId
  }
  if (roleId === 'manager') return stage === 'manager'
  return false
}

export function canReviewPlanResults(
  plan: MonthlyPlan,
  roleId: DemoRoleId,
): boolean {
  return roleId === 'manager' && plan.status === 'Submitted for Results Review'
}

export function canStartExecution(plan: MonthlyPlan, profile: DemoRoleProfile): boolean {
  return plan.employeeId === profile.employeeId && plan.status === 'Approved — Ready to Execute'
}

export function canUpdateExecution(plan: MonthlyPlan, profile: DemoRoleProfile): boolean {
  return plan.employeeId === profile.employeeId && plan.status === 'In Progress'
}

export function canSubmitResults(plan: MonthlyPlan, profile: DemoRoleProfile): boolean {
  return plan.employeeId === profile.employeeId && plan.status === 'In Progress'
}

export function canEditExpense(
  expense: MarketingExpenseRequest,
  profile: DemoRoleProfile,
): boolean {
  return (
    expense.employeeId === profile.employeeId &&
    ['Draft', 'Rejected', 'Changes Requested'].includes(expense.status)
  )
}

export function canSubmitExpense(
  expense: MarketingExpenseRequest,
  profile: DemoRoleProfile,
): boolean {
  return (
    expense.employeeId === profile.employeeId &&
    ['Draft', 'Rejected', 'Changes Requested'].includes(expense.status)
  )
}

export function canDecideExpense(
  expense: MarketingExpenseRequest,
  roleId: DemoRoleId,
): boolean {
  const stage = expenseDecisionStage(expense)
  if (!stage) return false
  return stage === roleId
}

/** The first approval stage after an employee submits a plan. */
export function routeAfterPlanSubmit(
  plan: MonthlyPlan,
  config: WorkflowConfig,
): { status: PlanWorkflowStatus; approver: string | null } {
  if (plan.roleId === 'junior') {
    // An explicit null reviewer means the owner chose to skip Senior review.
    const reviewerId = plan.seniorReviewerId || null
    if (reviewerId) {
      return {
        status: 'Pending Senior Review',
        approver: employeeNameById(reviewerId),
      }
    }
  }
  return { status: 'Pending Manager Approval', approver: employeeNameById(config.managerId) }
}

/** The next stage after an approver approves the current stage. */
export function routeAfterPlanApproval(
  plan: MonthlyPlan,
  stage: 'senior' | 'manager',
  config: WorkflowConfig,
): { status: PlanWorkflowStatus; approver: string | null } {
  if (stage === 'senior') {
    return { status: 'Pending Manager Approval', approver: employeeNameById(config.managerId) }
  }
  if (plan.financeRequired) {
    return {
      status: 'Pending Admin Financial Authorization',
      approver: 'Existing Admin Dashboard',
    }
  }
  return { status: 'Approved — Ready to Execute', approver: null }
}

export function latestChangeStage(plan: MonthlyPlan): WorkflowStageKey | null {
  const changes = plan.approvals.filter(
    (entry) => entry.decision === 'Changes Requested' || entry.decision === 'Revision Requested',
  )
  return changes.length ? changes[changes.length - 1].stage : null
}

export function latestRejectionStage(plan: MonthlyPlan): WorkflowStageKey | null {
  const rejected = plan.approvals.filter((entry) => entry.decision === 'Rejected')
  return rejected.length ? rejected[rejected.length - 1].stage : null
}

function hasApprovedStage(plan: MonthlyPlan, stage: WorkflowStageKey): boolean {
  return plan.approvals.some((entry) => entry.stage === stage && entry.decision === 'Approved')
}

export function planStageStates(plan: MonthlyPlan, config: WorkflowConfig): PlanStageView[] {
  const seniorSkipped = plan.roleId === 'senior' || !plan.seniorReviewerId
  const financeSkipped = !plan.financeRequired
  const changeStage = latestChangeStage(plan)
  const rejectionStage = latestRejectionStage(plan)
  const submitted = Boolean(plan.submittedAt) && plan.status !== 'Draft'
  const completed = plan.status === 'Completed'
  const resultsSubmitted = plan.status === 'Submitted for Results Review'
  const inExecution = plan.status === 'In Progress'
  const ready = plan.status === 'Approved — Ready to Execute'

  const stage = (
    key: WorkflowStageKey,
    label: string,
    state: PlanStageState,
    detail: string,
  ): PlanStageView => ({ key, label, state, detail })

  const stageState = (key: WorkflowStageKey, base: PlanStageState): PlanStageState => {
    if (rejectionStage === key) return 'rejected'
    if (changeStage === key) return 'changes'
    return base
  }

  return [
    stage(
      'submission',
      'Plan submitted',
      plan.status === 'Draft' ? 'active' : submitted ? 'done' : 'upcoming',
      plan.status === 'Draft' ? 'Draft is with the plan owner' : 'Submitted by the plan owner',
    ),
    stage(
      'senior',
      'Senior review',
      seniorSkipped
        ? 'skipped'
        : stageState(
            'senior',
            hasApprovedStage(plan, 'senior')
              ? 'done'
              : plan.status === 'Pending Senior Review'
                ? 'active'
                : 'upcoming',
          ),
      seniorSkipped
        ? plan.roleId === 'senior'
          ? 'Not required for a senior-owned plan'
          : 'No senior reviewer assigned — routes to the manager'
        : plan.status === 'Pending Senior Review'
          ? `Awaiting ${employeeNameById(plan.seniorReviewerId)}`
          : hasApprovedStage(plan, 'senior')
            ? 'Reviewed and forwarded'
            : 'Senior review step',
    ),
    stage(
      'manager',
      'Manager approval',
      stageState(
        'manager',
        hasApprovedStage(plan, 'manager')
          ? 'done'
          : plan.status === 'Pending Manager Approval'
            ? 'active'
            : 'upcoming',
      ),
      plan.status === 'Pending Manager Approval'
        ? `Awaiting ${employeeNameById(config.managerId)}`
        : hasApprovedStage(plan, 'manager')
          ? 'Manager approved'
          : 'Manager approval step',
    ),
    stage(
      'admin',
      'Admin financial authorization',
      financeSkipped
        ? 'skipped'
        : stageState(
            'admin',
            hasApprovedStage(plan, 'admin')
              ? 'done'
              : plan.status === 'Pending Admin Financial Authorization'
                ? 'active'
                : 'upcoming',
          ),
      financeSkipped
        ? `Budget is below the ${formatINR(config.financeThreshold)} Admin threshold`
        : plan.status === 'Pending Admin Financial Authorization'
          ? 'Awaiting the existing Totally ERP Admin Dashboard'
          : hasApprovedStage(plan, 'admin')
            ? 'Budget authorized by the Admin workflow'
            : 'Admin financial authorization step',
    ),
    stage(
      'execution',
      'Execution',
      stageState(
        'execution',
        completed || resultsSubmitted ? 'done' : inExecution || ready ? 'active' : 'upcoming',
      ),
      inExecution
        ? 'Activities are running'
        : ready
          ? 'Approved and ready to start'
          : completed || resultsSubmitted
            ? 'Execution recorded'
            : 'Starts after all approvals',
    ),
    stage(
      'results',
      'Results review',
      stageState(
        'results',
        completed ? 'done' : resultsSubmitted ? 'active' : 'upcoming',
      ),
      resultsSubmitted
        ? `Awaiting results review by ${employeeNameById(config.managerId)}`
        : completed
          ? 'Results reviewed and closed'
          : 'Owner submits execution results',
    ),
    stage(
      'completed',
      'Completed',
      completed ? 'done' : 'upcoming',
      completed ? 'Plan closed with reviewed results' : 'Final monthly outcome',
    ),
  ]
}

export function planExecutionProgress(plan: MonthlyPlan): number {
  if (plan.status === 'Completed') return 100
  return Math.max(0, Math.min(100, Math.round(plan.execution.executionPercent || 0)))
}

export function planLeadAchievement(plan: MonthlyPlan): number | null {
  const target = plan.expectedLeads || plan.monthlyTarget
  if (!target) return null
  return (plan.execution.actualLeads / target) * 100
}

export function expenseStageStates(expense: MarketingExpenseRequest): PlanStageView[] {
  const managerRequired = expense.managerRequired
  const submitted = expense.status !== 'Draft'
  const managerDone = expense.approvals.some(
    (entry) => entry.stage === 'manager' && entry.decision === 'Approved',
  )
  const adminDone = expense.approvals.some(
    (entry) => entry.stage === 'admin' && entry.decision === 'Approved',
  )
  const rejected = expense.status === 'Rejected'
  const changesRequested = expense.status === 'Changes Requested'

  return [
    {
      key: 'submission',
      label: 'Submitted',
      state: expense.status === 'Draft' ? 'active' : submitted ? 'done' : 'upcoming',
      detail: expense.status === 'Draft' ? 'Draft expense' : 'Submitted by the employee',
    },
    {
      key: 'manager',
      label: 'Manager review',
      state: !managerRequired
        ? 'skipped'
        : rejected && !managerDone
          ? 'rejected'
          : managerDone
            ? 'done'
            : changesRequested
              ? 'changes'
              : expense.status === 'Pending Manager Review'
                ? 'active'
                : 'upcoming',
      detail: !managerRequired
        ? 'Below the manager review threshold'
        : managerDone
          ? 'Manager approved'
          : changesRequested
            ? 'Changes requested by the manager'
            : expense.status === 'Pending Manager Review'
              ? 'Awaiting manager review'
              : 'Manager review step',
    },
    {
      key: 'admin',
      label: 'Admin financial authorization',
      state: rejected && managerDone
        ? 'rejected'
        : adminDone
          ? 'done'
          : expense.status === 'Pending Admin Financial Authorization'
            ? 'active'
            : 'upcoming',
      detail: adminDone
        ? 'Financially authorized by the Admin workflow'
        : expense.status === 'Pending Admin Financial Authorization'
          ? 'Awaiting the existing Totally ERP Admin Dashboard'
          : 'Admin financial decision',
    },
    {
      key: 'completed',
      label: 'Approved',
      state: expense.status === 'Approved' ? 'done' : rejected ? 'rejected' : 'upcoming',
      detail:
        expense.status === 'Approved'
          ? 'Expense approved'
          : rejected
            ? 'Expense rejected'
            : 'Final expense outcome',
    },
  ]
}

export function computeRoleMetrics(
  plans: MonthlyPlan[],
  expenses: MarketingExpenseRequest[],
  roleId: DemoRoleId,
  profile: DemoRoleProfile,
  config: WorkflowConfig,
): RoleWorkflowMetrics {
  const scopedPlans = plans.filter((plan) => planBelongsToRole(plan, roleId, profile))
  const scopedExpenses = expenses.filter((expense) =>
    expenseBelongsToRole(expense, roleId, profile),
  )
  const pendingStatuses = [
    'Submitted',
    'Pending Manager Review',
    'Pending Admin Financial Authorization',
  ]
  const approvedStatuses = ['Approved']

  return {
    totalPlans: scopedPlans.length,
    pendingSenior: scopedPlans.filter(
      (plan) =>
        plan.status === 'Pending Senior Review' &&
        (roleId !== 'senior' || plan.seniorReviewerId === profile.employeeId),
    ).length,
    pendingManager: scopedPlans.filter((plan) => plan.status === 'Pending Manager Approval').length,
    pendingAdmin: scopedPlans.filter(
      (plan) => plan.status === 'Pending Admin Financial Authorization',
    ).length,
    inProgress: scopedPlans.filter((plan) => plan.status === 'In Progress').length,
    completed: scopedPlans.filter((plan) => plan.status === 'Completed').length,
    changesRequested: scopedPlans.filter((plan) => plan.status === 'Changes Requested').length,
    rejected: scopedPlans.filter((plan) => plan.status === 'Rejected').length,
    plannedBudget: scopedPlans.reduce((sum, plan) => sum + plan.estimatedBudget, 0),
    managerApprovedBudget: scopedPlans
      .filter((plan) =>
        plan.approvals.some(
          (entry) => entry.stage === 'manager' && entry.decision === 'Approved',
        ),
      )
      .reduce((sum, plan) => sum + plan.estimatedBudget, 0),
    authorizedBudget: scopedPlans
      .filter((plan) => APPROVED_PLAN_STATUSES.includes(plan.status))
      .reduce((sum, plan) => sum + plan.estimatedBudget, 0),
    approvedBudget: scopedPlans
      .filter((plan) => APPROVED_PLAN_STATUSES.includes(plan.status))
      .reduce((sum, plan) => sum + plan.estimatedBudget, 0),
    actualSpending: scopedPlans.reduce((sum, plan) => sum + plan.execution.actualSpending, 0),
    targetLeads: scopedPlans.reduce(
      (sum, plan) => sum + (plan.expectedLeads || plan.monthlyTarget),
      0,
    ),
    actualLeads: scopedPlans.reduce((sum, plan) => sum + plan.execution.actualLeads, 0),
    qualifiedLeads: scopedPlans.reduce((sum, plan) => sum + plan.execution.qualifiedLeads, 0),
    rejectedLeads: 0,
    pendingExpenses: scopedExpenses.filter((expense) => pendingStatuses.includes(expense.status))
      .length,
    approvedExpenses: scopedExpenses.filter((expense) => approvedStatuses.includes(expense.status))
      .length,
    rejectedExpenses: scopedExpenses.filter((expense) => expense.status === 'Rejected').length,
    approvedExpenseAmount: scopedExpenses
      .filter((expense) => approvedStatuses.includes(expense.status))
      .reduce((sum, expense) => sum + expense.amount, 0),
    pendingExpenseAmount: scopedExpenses
      .filter((expense) => pendingStatuses.includes(expense.status))
      .reduce((sum, expense) => sum + expense.amount, 0),
  }
}

export function workflowInboxItems(
  plans: MonthlyPlan[],
  expenses: MarketingExpenseRequest[],
  roleId: DemoRoleId,
  profile: DemoRoleProfile,
  config: WorkflowConfig,
): WorkflowInboxItem[] {
  const items: WorkflowInboxItem[] = []

  plans.forEach((plan) => {
    if (canDecidePlan(plan, roleId, profile)) {
      const stage = planDecisionStage(plan)
      items.push({
        id: plan.id,
        kind: 'plan',
        mode: 'decision',
        title: plan.title,
        requester: plan.employeeName,
        amount: plan.estimatedBudget,
        status: plan.status,
        at: plan.updatedAt,
        hint:
          stage === 'senior'
            ? 'Senior review required'
            : 'Manager approval required',
      })
      return
    }

    if (isPlanAwaitingAdmin(plan) && planBelongsToRole(plan, roleId, profile)) {
      items.push({
        id: plan.id,
        kind: 'plan',
        mode: 'monitor',
        title: plan.title,
        requester: plan.employeeName,
        amount: plan.estimatedBudget,
        status: plan.status,
        at: plan.updatedAt,
        hint: 'Financial authorization pending in the existing Admin Dashboard',
      })
      return
    }

    if (canReviewPlanResults(plan, roleId)) {
      items.push({
        id: plan.id,
        kind: 'plan',
        mode: 'decision',
        title: plan.title,
        requester: plan.employeeName,
        amount: plan.estimatedBudget,
        status: plan.status,
        at: plan.resultsSubmittedAt ?? plan.updatedAt,
        hint: 'Review submitted results',
      })
      return
    }

    if (plan.employeeId !== profile.employeeId) return

    let hint = ''
    if (plan.status === 'Draft') hint = 'Finish and submit your monthly plan'
    else if (plan.status === 'Changes Requested') hint = 'Revise and resubmit the requested changes'
    else if (plan.status === 'Rejected') hint = 'Revise and resubmit the rejected plan'
    else if (plan.status === 'Approved — Ready to Execute') hint = 'Start executing the approved plan'
    else if (plan.status === 'In Progress') hint = 'Update execution and submit results'
    if (!hint) return

    items.push({
      id: plan.id,
      kind: 'plan',
      mode: 'action',
      title: plan.title,
      requester: plan.employeeName,
      amount: plan.estimatedBudget,
      status: plan.status,
      at: plan.updatedAt,
      hint,
    })
  })

  expenses.forEach((expense) => {
    if (canDecideExpense(expense, roleId)) {
      items.push({
        id: expense.id,
        kind: 'expense',
        mode: 'decision',
        title: expense.title,
        requester: expense.employeeName,
        amount: expense.amount,
        status: expense.status,
        at: expense.submittedAt ?? expense.expenseDate,
        hint:
          expense.status === 'Pending Manager Review'
            ? 'Manager review required'
            : 'Admin financial authorization pending',
      })
      return
    }

    if (isExpenseAwaitingAdmin(expense) && expenseBelongsToRole(expense, roleId, profile)) {
      items.push({
        id: expense.id,
        kind: 'expense',
        mode: 'monitor',
        title: expense.title,
        requester: expense.employeeName,
        amount: expense.amount,
        status: expense.status,
        at: expense.submittedAt ?? expense.expenseDate,
        hint: 'Financial authorization pending in the existing Admin Dashboard',
      })
      return
    }

    if (expense.employeeId !== profile.employeeId) return
    if (!['Draft', 'Rejected', 'Changes Requested'].includes(expense.status)) return

    items.push({
      id: expense.id,
      kind: 'expense',
      mode: 'action',
      title: expense.title,
      requester: expense.employeeName,
      amount: expense.amount,
      status: expense.status,
      at: expense.submittedAt ?? expense.expenseDate,
      hint:
        expense.status === 'Draft'
          ? 'Submit the draft expense'
          : expense.status === 'Changes Requested'
            ? 'Correct and resubmit the requested expense changes'
            : 'Correct and resubmit the expense',
    })
  })

  return items.sort((a, b) => {
    if (a.mode !== b.mode) {
      const order: Record<WorkflowInboxItem['mode'], number> = { decision: 0, action: 1, monitor: 2 }
      return order[a.mode] - order[b.mode]
    }
    return new Date(b.at).getTime() - new Date(a.at).getTime()
  })
}

export function pendingDecisionCount(
  plans: MonthlyPlan[],
  expenses: MarketingExpenseRequest[],
  roleId: DemoRoleId,
  profile: DemoRoleProfile,
): number {
  return (
    plans.filter((plan) => canDecidePlan(plan, roleId, profile)).length +
    plans.filter((plan) => canReviewPlanResults(plan, roleId)).length +
    expenses.filter((expense) => canDecideExpense(expense, roleId)).length
  )
}

export function planMonthOptions(plans: MonthlyPlan[]): string[] {
  const months = new Set(plans.map((plan) => plan.month))
  const now = new Date()
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  months.add(current)
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  months.add(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  return [...months].sort((a, b) => b.localeCompare(a))
}
