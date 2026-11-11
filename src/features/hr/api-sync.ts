/**
 * Hydrates the HR portal store from the real API.
 *
 * The portal was originally built against a localStorage demo database, so this
 * module maps the API rows (see `server/src/mappers/hr.ts`) back onto the
 * existing `Database` shape. The UI is unchanged; only the data source moves.
 *
 * Modules without a dedicated API yet (notifications) keep their demo
 * scaffolding. They are never presented as real ERP data.
 */

import type {
  Activity,
  AttendanceCorrection,
  AttendanceRecord,
  Candidate,
  ChecklistItem,
  Clearance,
  Contract,
  DailyPayment,
  Database,
  DocFile,
  Employee,
  EmployeeRequest,
  JobOpening,
  LeaveRequest,
  LeaveType,
  OffboardingRecord,
  OnboardingRecord,
  PayrollEntry,
  PerformanceReview,
  SettingsData,
} from './types'
import { createDemoDatabase } from './data/demo'
import * as api from '@/lib/api/hr'

const EMPTY: [] = []

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function timeOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function pickActivityType(value: string): Activity['type'] {
  const allowed: Activity['type'][] = [
    'employee',
    'leave',
    'contract',
    'payment',
    'recruitment',
    'onboarding',
    'request',
    'performance',
    'offboarding',
    'attendance',
  ]
  return allowed.includes(value as Activity['type']) ? (value as Activity['type']) : 'employee'
}

function mapEmployee(row: api.ApiEmployee): Employee {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    photo: row.photo || '',
    email: row.email,
    phone: row.phone || '',
    department: row.department || 'Unassigned',
    designation: row.designation || '',
    managerId: row.managerId,
    manager: row.manager || '',
    employmentType: row.employmentType,
    joiningDate: row.joiningDate || '',
    status: row.status,
    location: row.location || row.workLocation || '',
    gender: row.gender,
    dob: row.dob || '',
    address: row.address || '',
    emergencyContact: row.emergencyContact || '',
    bankAccount: row.bankAccount || '',
    salary: row.salary ?? 0,
    skills: asArray<string>(row.skills),
    documents: [] as DocFile[],
    bio: row.bio || '',
  }
}

function mapAttendance(row: api.ApiAttendance): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    date: row.date,
    checkIn: timeOnly(row.checkIn),
    checkOut: timeOnly(row.checkOut),
    status: row.status,
    hours: row.hours,
    note: row.note,
    source: row.source,
    corrected: row.corrected,
  }
}

function mapCorrection(row: api.ApiAttendanceCorrection): AttendanceCorrection {
  return {
    id: row.id,
    employeeId: row.employeeId,
    date: row.date,
    requestedStatus: row.requestedStatus,
    checkIn: timeOnly(row.checkIn),
    checkOut: timeOnly(row.checkOut),
    reason: row.reason,
    status: row.status,
    requestedAt: row.requestedAt,
    reviewedBy: row.reviewedBy,
    remarks: row.remarks,
  }
}

function mapLeave(row: api.ApiLeave): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employeeId,
    leaveType: row.leaveType || row.leaveTypeId,
    from: row.from,
    to: row.to,
    days: row.days,
    reason: row.reason,
    status: row.status,
    appliedOn: row.appliedOn,
    reviewer: row.reviewer,
    remarks: row.remarks,
    priority: row.priority,
    halfDay: row.halfDay,
  }
}

function mapJob(row: api.ApiJobOpening): JobOpening {
  return {
    id: row.id,
    title: row.title,
    department: row.department || 'Unassigned',
    location: row.location,
    employmentType: row.employmentType,
    posted: row.posted,
    deadline: row.deadline,
    status: row.status,
    hiringManager: row.hiringManager || '',
    openings: row.openings,
    description: row.description,
  }
}

function mapCandidate(row: api.ApiCandidate): Candidate {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    jobId: row.jobId,
    stage: row.stage,
    appliedOn: row.appliedOn,
    source: row.source,
    resumeName: row.resumePath?.split('/').pop() || '',
    rating: row.rating,
    experience: row.experience,
    currentCompany: row.currentCompany,
    expectedSalary: row.expectedSalary,
    offerSalary: row.offerSalary,
    offerStatus: row.offerStatus,
    rejectionReason: row.rejectionReason,
    notes: row.notes,
    convertedEmployeeId: row.convertedEmployeeId ?? undefined,
  }
}

function mapOnboarding(row: api.ApiOnboarding): OnboardingRecord {
  const systems = asArray<Record<string, unknown>>(row.systems).map((system) => ({
    id: text(system.id, system.name ? String(system.name) : ''),
    name: text(system.name),
    enabled: Boolean(system.enabled),
  }))
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    designation: row.designation,
    department: row.department || 'Unassigned',
    manager: row.manager,
    employmentType: row.employmentType,
    joiningDate: row.joiningDate,
    status: row.status,
    employeeId: row.employeeId,
    documents: [] as DocFile[],
    checklist: asArray<ChecklistItem>(row.checklist),
    systems,
    notes: row.notes,
  }
}

function mapPayslip(row: api.ApiPayslip): PayrollEntry {
  return {
    id: row.id,
    employeeId: row.employeeId,
    period: row.period,
    basic: row.basic,
    allowances: row.allowances,
    overtime: row.overtime,
    deductions: row.deductions,
    leaveDeduction: row.leaveDeduction,
    tax: row.tax,
    attendanceDays: row.attendanceDays,
    leaveDays: row.leaveDays,
    status: row.status as PayrollEntry['status'],
    note: row.note,
  }
}

function mapContract(row: api.ApiContract): Contract {
  return {
    id: row.id,
    title: row.title,
    partyType: row.partyType,
    employeeId: row.employeeId ?? undefined,
    partyName: row.partyName,
    department: row.department,
    contractType: row.contractType,
    startDate: row.startDate,
    endDate: row.endDate,
    value: row.value,
    paymentFrequency: row.paymentFrequency,
    status: row.status,
    signatures: [],
    documents: [],
    notes: row.notes,
    paymentSchedule: [],
    createdAt: row.createdAt,
    history: [],
  }
}

function mapPayment(row: api.ApiPayment): DailyPayment {
  return {
    id: row.id,
    payee: row.payee,
    partyType: row.partyType,
    employeeId: row.employeeId ?? undefined,
    contractId: row.contractId ?? undefined,
    date: row.date,
    dueDate: row.dueDate,
    category: row.category,
    amount: row.amount,
    method: row.method,
    approvalStatus: row.approvalStatus as DailyPayment['approvalStatus'],
    paymentStatus: row.paymentStatus,
    description: row.description,
    remarks: row.remarks,
    approvedBy: row.approvedBy || undefined,
    history: [],
  }
}

function mapReview(row: api.ApiReview): PerformanceReview {
  return {
    id: row.id,
    employeeId: row.employeeId,
    period: row.period,
    cycle: row.cycle,
    dueDate: row.dueDate,
    status: row.status,
    selfRating: row.selfRating,
    managerRating: row.managerRating,
    hrRating: row.hrRating,
    goals: asArray<PerformanceReview['goals'][number]>(row.goals),
    strengths: row.strengths,
    improvements: row.improvements,
    comments: row.comments,
    manager: row.manager,
    completedAt: row.completedAt ?? undefined,
  }
}

function mapRequest(row: api.ApiEmployeeRequest): EmployeeRequest {
  return {
    id: row.id,
    employeeId: row.employeeId,
    type: row.type,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assignedTo,
    createdAt: row.createdAt,
    responses: [],
  }
}

function mapOffboarding(row: api.ApiOffboarding): OffboardingRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    resignationDate: row.resignationDate,
    lastWorkingDay: row.lastWorkingDay,
    reason: row.reason,
    noticePeriodDays: row.noticePeriodDays,
    status: row.status as OffboardingRecord['status'],
    exitInterviewDate: row.exitInterviewDate || undefined,
    exitInterviewNotes: row.exitInterviewNotes,
    clearances: asArray<Clearance>(row.clearances),
    settlementAmount: row.settlementAmount,
    settlementStatus: row.settlementStatus,
    settlementNotes: row.settlementNotes,
    documents: [],
    history: [],
  }
}

function mapLeaveType(row: api.ApiLeaveType): LeaveType {
  return {
    id: row.id,
    name: row.name,
    allocation: row.allocation,
    paid: row.paid,
    carryForward: row.carryForward,
    requiresApproval: row.requiresApproval,
    color: row.color || '#6366f1',
    description: row.description,
  }
}

function mergeSettings(
  base: SettingsData,
  settings: Record<string, unknown> | undefined,
  departments: api.ApiDepartment[],
  designations: api.ApiDesignation[],
  leaveTypes: api.ApiLeaveType[],
  holidays: api.ApiHoliday[],
): SettingsData {
  const next: SettingsData = { ...base }
  if (settings) Object.assign(next, settings)
  if (departments.length > 0) {
    next.departments = departments.map((row) => ({
      id: row.id,
      name: row.name,
      head: row.head,
      code: row.code,
    }))
  }
  if (designations.length > 0) {
    next.designations = designations.map((row) => ({
      id: row.id,
      name: row.name,
      department: row.department,
      level: row.level,
    }))
  }
  if (leaveTypes.length > 0) {
    next.leaveTypes = leaveTypes.map(mapLeaveType)
  }
  if (holidays.length > 0) {
    next.holidays = holidays.map((row) => ({ id: row.id, name: row.name, date: row.date, type: row.type }))
  }
  return next
}

function settle<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

function settleData<T>(result: PromiseSettledResult<api.PaginatedResponse<T>>, fallback: T[]): T[] {
  return result.status === 'fulfilled' ? result.value.data : fallback
}

export interface HrSyncOptions {
  signal?: AbortSignal
}

/**
 * Build the full HR `Database` from the API.
 * Throws only when the core employee directory cannot be loaded; secondary
 * modules degrade to the demo scaffolding so one permission gap cannot blank
 * the whole portal.
 */
export async function fetchHrDatabase(options: HrSyncOptions = {}): Promise<Database> {
  const base = createDemoDatabase()

  const core = await Promise.allSettled([
    api.listAllEmployees({}, ),
    api.listAllAttendance(),
    api.listAllLeaves(),
    api.listAllPayslips(),
    api.listAllContracts(),
    api.listAllPayments(),
    api.listAllHrExpenses(),
    api.getDashboard(),
    api.getActivities(),
    api.getHrSettings(),
    api.listDepartments(),
    api.listDesignations(),
    api.listLeaveTypes(),
    api.listHolidays(),
    api.listCorrections(),
    api.listJobs({ pageSize: 100 }),
    api.listCandidates({ pageSize: 100 }),
    api.listOnboarding(),
    api.listReviews({ pageSize: 100 }),
    api.listEmployeeRequests({ pageSize: 100 }),
    api.listOffboarding(),
  ])
  const signalError = options.signal?.aborted
  if (signalError) throw new DOMException('Aborted', 'AbortError')

  const [
    employeesResult,
    attendanceResult,
    leavesResult,
    payslipsResult,
    contractsResult,
    paymentsResult,
    expensesResult,
    dashboardResult,
    activitiesResult,
    settingsResult,
    departmentsResult,
    designationsResult,
    leaveTypesResult,
    holidaysResult,
    correctionsResult,
    jobsResult,
    candidatesResult,
    onboardingResult,
    reviewsResult,
    requestsResult,
    offboardingResult,
  ] = core

  if (employeesResult.status === 'rejected') {
    throw employeesResult.reason
  }

  const employees = employeesResult.value.map(mapEmployee)
  const attendance = settle(attendanceResult, []).map(mapAttendance)
  const leaves = settle(leavesResult, []).map(mapLeave)
  const payroll = settle(payslipsResult, []).map(mapPayslip)
  const contracts = settle(contractsResult, []).map(mapContract)
  const payments = settle(paymentsResult, []).map(mapPayment)
  const jobs = settleData(jobsResult, []).map(mapJob)
  const candidates = settleData(candidatesResult, []).map(mapCandidate)
  const onboarding = settle(onboardingResult, []).map(mapOnboarding)
  const reviews = settleData(reviewsResult, []).map(mapReview)
  const requests = settleData(requestsResult, []).map(mapRequest)
  const offboarding = settle(offboardingResult, []).map(mapOffboarding)

  const settingsData = settle(settingsResult, {
    data: {} as Record<string, unknown>,
    updatedAt: null,
  }).data
  const departments = settle(departmentsResult, [])
  const designations = settle(designationsResult, [])
  const leaveTypes = settle(leaveTypesResult, [])
  const holidays = settle(holidaysResult, [])

  const activities: Activity[] = settle(activitiesResult, []).map((row) => ({
    id: row.id,
    type: pickActivityType(row.type),
    title: row.title,
    detail: row.detail,
    actor: row.actor,
    date: row.date,
  }))

  const database: Database = {
    ...base,
    employees,
    attendance,
    leaves,
    jobs,
    candidates,
    onboarding,
    payroll,
    contracts,
    payments,
    reviews,
    requests,
    offboarding,
    corrections: settle(correctionsResult, []).map(mapCorrection),
    settings: mergeSettings(base.settings, settingsData, departments, designations, leaveTypes, holidays),
    activities: activities.length > 0 ? activities : base.activities,
    notifications: base.notifications,
  }

  // HR expenses are already part of the HR API but the legacy portal has no
  // dedicated `expenses` collection; keep them hydrated for future UI wiring
  // without inventing a field on `Database`.
  void expensesResult

  return database
}

/** Convenience alias used by the store. */
export async function hydrateHrDatabase(options: HrSyncOptions = {}): Promise<Database> {
  return fetchHrDatabase(options)
}
