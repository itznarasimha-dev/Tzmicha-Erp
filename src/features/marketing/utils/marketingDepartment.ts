import type {
  CampaignStatus,
  ExpenseStatus,
  IdeaStatus,
  LeadStage,
  MarketingActivity,
  MarketingCampaign,
  MarketingEmployee,
  MarketingExpense,
  MarketingFollowUp,
  MarketingIdea,
  MarketingLead,
  MarketingSector,
  MarketingTask,
  MarketingTaskStatus,
  PlanStatus,
  SectorStatus,
} from '../types/marketingDepartment'
import type { BadgeTone } from '../components/ui/Badge'
import { daysUntil, startOfToday, toISODate } from './dates'

export interface DateRange {
  preset: 'daily' | 'weekly' | 'monthly' | 'custom'
  from: string
  to: string
}

export function rangeForPreset(preset: DateRange['preset']): DateRange {
  const today = startOfToday()
  const from = new Date(today)
  if (preset === 'daily') {
    return { preset, from: toISODate(from), to: toISODate(today) }
  }
  if (preset === 'weekly') {
    from.setDate(from.getDate() - 6)
    return { preset, from: toISODate(from), to: toISODate(today) }
  }
  if (preset === 'monthly') {
    from.setDate(1)
    return { preset, from: toISODate(from), to: toISODate(today) }
  }
  return { preset, from: toISODate(from), to: toISODate(today) }
}

export function inRange(value: string | null | undefined, range: DateRange): boolean {
  if (!value) return false
  const date = value.slice(0, 10)
  return date >= range.from && date <= range.to
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function findDuplicateLeads(
  leads: MarketingLead[],
  phone: string,
  email?: string,
  businessName?: string,
): MarketingLead[] {
  const normalizedPhone = normalizePhone(phone)
  const normalizedEmail = email ? normalizeEmail(email) : ''
  const normalizedBusiness = businessName?.trim().toLowerCase() ?? ''
  return leads.filter((lead) => {
    const phoneMatch = normalizedPhone.length >= 8 && normalizePhone(lead.phone) === normalizedPhone
    const emailMatch = Boolean(normalizedEmail) && normalizeEmail(lead.email) === normalizedEmail
    const businessMatch =
      Boolean(normalizedBusiness) &&
      lead.businessName.trim().toLowerCase() === normalizedBusiness &&
      lead.stage !== 'Rejected'
    return phoneMatch || emailMatch || businessMatch
  })
}

export function employeeById(employees: MarketingEmployee[], id: string | null | undefined) {
  if (!id) return undefined
  return employees.find((employee) => employee.id === id)
}

export function employeesInSector(employees: MarketingEmployee[], sectorId: string) {
  return employees.filter((employee) => employee.sectorId === sectorId && employee.status === 'Active')
}

export function juniorsInSector(employees: MarketingEmployee[], sectorId: string) {
  return employeesInSector(employees, sectorId).filter((employee) => employee.role === 'junior')
}

export function seniorsInSector(employees: MarketingEmployee[], sectorId: string) {
  return employeesInSector(employees, sectorId).filter((employee) => employee.role === 'senior')
}

export function sectorsForSenior(sectors: MarketingSector[], seniorId: string) {
  return sectors.filter((sector) => sector.leaderId === seniorId)
}

export function juniorTeamFor(sectors: MarketingSector[], employees: MarketingEmployee[], seniorId: string) {
  const ownSectors = sectorsForSenior(sectors, seniorId)
  const ids = new Set(ownSectors.map((sector) => sector.id))
  return employees.filter(
    (employee) => employee.role === 'junior' && employee.sectorId && ids.has(employee.sectorId) && employee.status === 'Active',
  )
}

/** One shared lead pipeline. Role scope is applied consistently everywhere. */
export function leadsInScope(
  leads: MarketingLead[],
  role: 'manager' | 'senior' | 'junior',
  employeeId: string,
  sectors: MarketingSector[],
) {
  if (role === 'manager') return leads
  if (role === 'senior') {
    const sectorIds = new Set(sectorsForSenior(sectors, employeeId).map((sector) => sector.id))
    return leads.filter(
      (lead) =>
        lead.assignedSeniorId === employeeId ||
        (lead.sectorId && sectorIds.has(lead.sectorId)),
    )
  }
  return leads.filter(
    (lead) => lead.createdById === employeeId || lead.assignedJuniorId === employeeId,
  )
}

export function tasksInScope(
  tasks: MarketingTask[],
  role: 'manager' | 'senior' | 'junior',
  employeeId: string,
  sectors: MarketingSector[],
  employees: MarketingEmployee[],
) {
  if (role === 'manager') return tasks
  if (role === 'senior') {
    const sectorIds = new Set(sectorsForSenior(sectors, employeeId).map((sector) => sector.id))
    const juniorIds = new Set(juniorTeamFor(sectors, employees, employeeId).map((employee) => employee.id))
    return tasks.filter(
      (task) =>
        task.assignedSeniorId === employeeId ||
        sectorIds.has(task.sectorId) ||
        (task.assignedJuniorId !== null && juniorIds.has(task.assignedJuniorId)),
    )
  }
  return tasks.filter(
    (task) =>
      task.assignedJuniorId === employeeId ||
      (task.assigneeType === 'junior' && task.assignedJuniorId === null && task.assignedSeniorId === getSeniorId(employees, employeeId)),
  )
}

export function expensesInScope(
  expenses: MarketingExpense[],
  role: 'manager' | 'senior' | 'junior',
  employeeId: string,
  sectors: MarketingSector[],
) {
  if (role === 'manager') return expenses
  if (role === 'senior') {
    const sectorIds = new Set(sectorsForSenior(sectors, employeeId).map((sector) => sector.id))
    return expenses.filter((expense) => sectorIds.has(expense.sectorId))
  }
  return expenses.filter((expense) => expense.employeeId === employeeId)
}

export function ideasInScope(
  ideas: MarketingIdea[],
  role: 'manager' | 'senior' | 'junior',
  employeeId: string,
  sectors: MarketingSector[],
) {
  if (role === 'manager') return ideas
  if (role === 'senior') {
    const sectorIds = new Set(sectorsForSenior(sectors, employeeId).map((sector) => sector.id))
    return ideas.filter((idea) => sectorIds.has(idea.sectorId) || idea.seniorId === employeeId)
  }
  return ideas.filter((idea) => idea.submittedById === employeeId)
}

export function getSeniorId(employees: MarketingEmployee[], employeeId: string) {
  return employees.find((employee) => employee.id === employeeId)?.seniorId ?? null
}

export interface LeadStats {
  total: number
  newLeads: number
  followUpDue: number
  qualified: number
  rejected: number
  sentToSales: number
  converted: number
  lost: number
  underReview: number
  inPipeline: number
  conversionRate: number
  qualificationRate: number
}

export function leadStats(leads: MarketingLead[], followUps: MarketingFollowUp[] = []): LeadStats {
  const stageSet = (stages: LeadStage[]) => leads.filter((lead) => stages.includes(lead.stage)).length
  const qualified = stageSet(['Qualification', 'Senior Review', 'Manager Review', 'Sent to Sales', 'Sales Follow-up', 'Won'])
  const sentToSales = leads.filter((lead) => Boolean(lead.handover)).length
  const converted = stageSet(['Won'])
  const newLeads = stageSet(['New Lead'])
  const rejected = stageSet(['Rejected'])
  const lost = stageSet(['Lost'])
  const underReview = stageSet(['Senior Review', 'Manager Review'])
  const total = leads.length
  const activeFollowUps = followUps.filter((followUp) => followUp.status === 'Scheduled' || followUp.status === 'In Progress')
  const followUpDue = activeFollowUps.filter((followUp) => {
    const days = daysUntil(followUp.dueAt)
    return days !== null && days <= 0
  }).length
  return {
    total,
    newLeads,
    followUpDue,
    qualified,
    rejected,
    sentToSales,
    converted,
    lost,
    underReview,
    inPipeline: leads.filter((lead) => !['Won', 'Lost', 'Rejected'].includes(lead.stage)).length,
    conversionRate: total ? (converted / total) * 100 : 0,
    qualificationRate: total ? (qualified / total) * 100 : 0,
  }
}

export interface TaskStats {
  total: number
  completed: number
  pending: number
  inProgress: number
  review: number
  blocked: number
  overdue: number
  completion: number
}

export function taskStats(tasks: MarketingTask[]): TaskStats {
  const completed = tasks.filter((task) => task.status === 'Completed').length
  const pending = tasks.filter((task) => task.status !== 'Completed').length
  const inProgress = tasks.filter((task) => task.status === 'In Progress').length
  const review = tasks.filter((task) => task.status === 'Under Review').length
  const blocked = tasks.filter((task) => task.status === 'Blocked').length
  const overdue = tasks.filter(
    (task) => task.status !== 'Completed' && new Date(task.deadline).getTime() < startOfToday().getTime(),
  ).length
  return {
    total: tasks.length,
    completed,
    pending,
    inProgress,
    review,
    blocked,
    overdue,
    completion: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  }
}

export interface SectorStats {
  teamMembers: number
  juniors: number
  activeTasks: number
  completedTasks: number
  totalLeads: number
  qualifiedLeads: number
  targetAchievement: number
  remainingBudget: number
  budgetUtilisation: number
  performance: number
  conversions: number
}

export function sectorStats(
  sector: MarketingSector,
  employees: MarketingEmployee[],
  leads: MarketingLead[],
  tasks: MarketingTask[],
): SectorStats {
  const sectorLeads = leads.filter((lead) => lead.sectorId === sector.id)
  const sectorTasks = tasks.filter((task) => task.sectorId === sector.id)
  const team = employeesInSector(employees, sector.id)
  const juniors = team.filter((employee) => employee.role === 'junior').length
  const qualified = sectorLeads.filter((lead) =>
    ['Qualification', 'Senior Review', 'Manager Review', 'Sent to Sales', 'Sales Follow-up', 'Won'].includes(lead.stage),
  ).length
  const completedTasks = sectorTasks.filter((task) => task.status === 'Completed').length
  const targetAchievement = sector.monthlyLeadTarget
    ? Math.min(160, Math.round((sectorLeads.length / sector.monthlyLeadTarget) * 100))
    : 0
  const performance = Math.round(
    (Math.min(100, targetAchievement) * 0.45 +
      (sectorTasks.length ? (completedTasks / sectorTasks.length) * 100 : 0) * 0.3 +
      Math.min(100, (sector.budget ? (sector.spent / sector.budget) * 100 : 0)) * 0.25),
  )
  return {
    teamMembers: team.length,
    juniors,
    activeTasks: sectorTasks.filter((task) => task.status !== 'Completed').length,
    completedTasks,
    totalLeads: sectorLeads.length,
    qualifiedLeads: qualified,
    targetAchievement,
    remainingBudget: Math.max(0, sector.budget - sector.spent),
    budgetUtilisation: sector.budget ? (sector.spent / sector.budget) * 100 : 0,
    performance,
    conversions: sectorLeads.filter((lead) => lead.stage === 'Won').length,
  }
}

export interface EmployeeStats {
  assignedTasks: number
  completedTasks: number
  pendingTasks: number
  leadsGenerated: number
  qualifiedLeads: number
  followUpsCompleted: number
  targetAchievement: number
  activityCount: number
  conversionRate: number
}

export function employeeStats(
  employee: MarketingEmployee,
  leads: MarketingLead[],
  tasks: MarketingTask[],
  followUps: MarketingFollowUp[],
  activities: MarketingActivity[],
): EmployeeStats {
  const ownLeads = leads.filter(
    (lead) => lead.assignedJuniorId === employee.id || lead.createdById === employee.id,
  )
  const ownTasks = tasks.filter(
    (task) =>
      task.assignedJuniorId === employee.id ||
      (task.assigneeType !== 'junior' && task.assignedSeniorId === employee.id),
  )
  const completed = ownTasks.filter((task) => task.status === 'Completed').length
  const qualified = ownLeads.filter((lead) =>
    ['Qualification', 'Senior Review', 'Manager Review', 'Sent to Sales', 'Sales Follow-up', 'Won'].includes(lead.stage),
  ).length
  const conversions = ownLeads.filter((lead) => lead.stage === 'Won').length
  return {
    assignedTasks: ownTasks.length,
    completedTasks: completed,
    pendingTasks: ownTasks.length - completed,
    leadsGenerated: ownLeads.length,
    qualifiedLeads: qualified,
    followUpsCompleted: followUps.filter(
      (followUp) => followUp.employeeId === employee.id && followUp.status === 'Completed',
    ).length,
    targetAchievement: employee.targetLeads
      ? Math.min(160, Math.round((ownLeads.length / employee.targetLeads) * 100))
      : 0,
    activityCount: activities.filter((activity) => activity.employeeId === employee.id).length,
    conversionRate: ownLeads.length ? (conversions / ownLeads.length) * 100 : 0,
  }
}

export function budgetSummary(sectors: MarketingSector[]) {
  const total = sectors.reduce((sum, sector) => sum + sector.budget, 0)
  const spent = sectors.reduce((sum, sector) => sum + sector.spent, 0)
  return {
    total,
    spent,
    remaining: total - spent,
    utilisation: total ? (spent / total) * 100 : 0,
  }
}

export function campaignActualLeads(campaign: MarketingCampaign, leads: MarketingLead[]) {
  return campaign.baselineLeads + leads.filter((lead) => lead.campaignId === campaign.id).length
}

export function campaignProgress(campaign: MarketingCampaign, leads: MarketingLead[]) {
  const actual = campaignActualLeads(campaign, leads)
  return campaign.expectedLeads ? Math.min(180, Math.round((actual / campaign.expectedLeads) * 100)) : 0
}

export function stageTone(stage: LeadStage): BadgeTone {
  switch (stage) {
    case 'New Lead':
      return 'info'
    case 'Follow-up':
      return 'warning'
    case 'Qualification':
      return 'accent'
    case 'Senior Review':
    case 'Manager Review':
      return 'warning'
    case 'Sent to Sales':
    case 'Sales Follow-up':
    case 'Won':
      return 'success'
    case 'Lost':
    case 'Rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function taskTone(status: MarketingTaskStatus): BadgeTone {
  if (status === 'Completed') return 'success'
  if (status === 'In Progress') return 'info'
  if (status === 'Under Review') return 'warning'
  if (status === 'Blocked') return 'danger'
  return 'neutral'
}

export function expenseTone(status: ExpenseStatus): BadgeTone {
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'danger'
  if (status === 'Changes Requested') return 'warning'
  if (status === 'Finance Review') return 'accent'
  if (status === 'Manager Review') return 'warning'
  if (status === 'Under Senior Review') return 'info'
  return 'neutral'
}

export function ideaTone(status: IdeaStatus): BadgeTone {
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'danger'
  if (status === 'Changes Requested') return 'warning'
  if (status === 'Forwarded to Finance') return 'accent'
  if (status === 'Pending Manager Review') return 'warning'
  return 'info'
}

export function planTone(status: PlanStatus): BadgeTone {
  if (status === 'Active' || status === 'Completed') return 'success'
  if (status === 'Pending Manager Review' || status === 'Pending Finance Approval') return 'warning'
  if (status === 'Changes Requested') return 'info'
  if (status === 'Rejected') return 'danger'
  return 'neutral'
}

export function campaignTone(status: CampaignStatus): BadgeTone {
  if (status === 'Active') return 'success'
  if (status === 'Completed') return 'info'
  if (status === 'Paused') return 'warning'
  return 'neutral'
}

export function sectorTone(status: SectorStatus): BadgeTone {
  if (status === 'Active') return 'success'
  if (status === 'Paused') return 'warning'
  return 'danger'
}

export function priorityRank(priority: string): number {
  if (priority === 'Urgent') return 0
  if (priority === 'High') return 1
  if (priority === 'Medium') return 2
  return 3
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date)
}

export function roleLabel(role: string): string {
  if (role === 'manager') return 'Marketing Manager'
  if (role === 'senior') return 'Senior Marketing Executive'
  if (role === 'junior') return 'Junior Marketing Executive'
  return 'Finance / Admin'
}

export function isOpenFollowUp(status: MarketingFollowUp['status']): boolean {
  return status === 'Scheduled' || status === 'In Progress'
}

export function isFollowUpOverdue(followUp: MarketingFollowUp): boolean {
  if (!isOpenFollowUp(followUp.status)) return false
  const days = daysUntil(followUp.dueAt)
  return days !== null && days < 0
}

export function monthKey(value: Date | string = new Date()): string {
  if (typeof value === 'string') return value.slice(0, 7)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
}

export function walletSummary(
  expenses: MarketingExpense[],
  allocations: Array<{ employeeId: string; month: string; amount: number }>,
  employeeId: string,
  month = monthKey(),
) {
  const allocation = allocations
    .filter((item) => item.employeeId === employeeId && item.month === month)
    .reduce((sum, item) => sum + item.amount, 0)
  const monthly = expenses.filter(
    (expense) => expense.employeeId === employeeId && monthKey(expense.expenseDate) === month,
  )
  const approved = monthly.filter((expense) => expense.status === 'Approved')
  const rejected = monthly.filter((expense) => expense.status === 'Rejected')
  const pending = monthly.filter((expense) => !['Approved', 'Rejected'].includes(expense.status))
  const approvedAmount = approved.reduce((sum, expense) => sum + expense.amount, 0)
  const pendingAmount = pending.reduce((sum, expense) => sum + expense.amount, 0)
  const rejectedAmount = rejected.reduce((sum, expense) => sum + expense.amount, 0)
  return {
    month,
    allocation,
    approvedAmount,
    pendingAmount,
    rejectedAmount,
    spent: approvedAmount,
    remaining: allocation - approvedAmount,
    pendingCount: pending.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    utilisation: allocation ? (approvedAmount / allocation) * 100 : 0,
    expenses: monthly,
  }
}
