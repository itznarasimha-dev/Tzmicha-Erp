/**
 * HR API endpoint wrappers.
 *
 * Paths and payload shapes mirror `server/src/routes/hr/*`. Every call is
 * authenticated by the client; the server re-checks permissions and never
 * trusts a client-supplied organisation or role.
 */

import {
  createIdempotencyKey,
  del,
  fetchAllPages,
  get,
  getPaginated,
  patch,
  post,
  put,
  type PaginatedResponse,
  type QueryParams,
} from './client'

export type EmployeeStatus = 'Active' | 'Probation' | 'On Leave' | 'Notice Period' | 'Terminated'
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship'
export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Remote' | 'Half Day'
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
export type PayrollStatus = 'Draft' | 'HR Review' | 'Finance Approval' | 'Approved' | 'Paid' | 'Cancelled'
export type ContractStatus =
  | 'Draft'
  | 'Pending Review'
  | 'Pending Signature'
  | 'Active'
  | 'Expiring Soon'
  | 'Expired'
  | 'Renewed'
  | 'Terminated'
export type PaymentStatus = 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Overdue'
export type RequestStatus = 'Open' | 'In Progress' | 'Resolved' | 'Rejected'
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type ReviewStatus = 'Not Started' | 'Self Assessment' | 'Manager Review' | 'HR Review' | 'Completed'
export type CandidateStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected'

export interface ApiEmployee {
  id: string
  userId: string | null
  employeeCode: string
  firstName: string
  lastName: string
  name: string
  photo: string
  email: string
  personalEmail: string
  phone: string
  departmentId: string | null
  department: string
  designationId: string | null
  designation: string
  managerId: string | null
  manager: string
  employmentType: EmploymentType
  joiningDate: string
  status: EmployeeStatus
  workLocation: string
  location: string
  gender: 'Male' | 'Female' | 'Other'
  dob: string
  address: string
  emergencyContact: string
  bankAccount: string
  bankIfsc: string
  salary: number | null
  skills: string[]
  bio: string
  terminatedAt: string | null
  documents: unknown[]
  createdAt: string
  updatedAt: string
}

export interface EmployeeCreatePayload {
  firstName: string
  lastName: string
  email: string
  phone?: string
  personalEmail?: string
  departmentId?: string
  designationId?: string
  managerId?: string
  employmentType?: EmploymentType
  employeeStatus?: EmployeeStatus
  joiningDate: string
  workLocation?: string
  gender?: 'Male' | 'Female' | 'Other'
  dateOfBirth?: string
  address?: string
  emergencyContact?: string
  bankAccountMasked?: string
  bankIfsc?: string
  currentCtc?: number
  skills?: string[]
  bio?: string
  roleCode?: string
  authUserId?: string
}

export type EmployeeUpdatePayload = Partial<Omit<EmployeeCreatePayload, 'firstName' | 'lastName'>> & {
  firstName?: string
  lastName?: string
}

export interface ApiAttendance {
  id: string
  employeeId: string
  employeeName: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
  hours: number
  note: string
  source: 'Biometric' | 'Web' | 'Manual' | 'Mobile'
  corrected: boolean
  linkedLeaveId: string | null
}

export interface ApiAttendanceCorrection {
  id: string
  employeeId: string
  employeeName: string
  attendanceId: string | null
  date: string
  requestedStatus: AttendanceStatus
  checkIn: string | null
  checkOut: string | null
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  requestedAt: string
  reviewedBy: string
  remarks: string
}

export interface ApiLeave {
  id: string
  employeeId: string
  employeeName: string
  leaveTypeId: string
  leaveType: string
  from: string
  to: string
  days: number
  reason: string
  status: LeaveStatus
  appliedOn: string
  reviewer: string
  remarks: string
  priority: Priority
  halfDay: boolean
}

export interface ApiLeaveType {
  id: string
  code: string
  name: string
  allocation: number
  paid: boolean
  carryForward: boolean
  requiresApproval: boolean
  color: string
  description: string
  isActive: boolean
}

export interface ApiHoliday {
  id: string
  name: string
  date: string
  type: 'Public' | 'Company' | 'Optional'
}

export interface ApiLeaveBalance {
  id: string
  employeeId: string
  leaveTypeId: string
  leaveType: string
  year: number
  allocated: number
  used: number
  pending: number
  available: number
}

export interface ApiPayslip {
  id: string
  payrollRunId: string
  employeeId: string
  employeeName: string
  period: string
  basic: number
  allowances: number
  overtime: number
  deductions: number
  leaveDeduction: number
  tax: number
  netPay: number
  attendanceDays: number
  leaveDays: number
  status: PayrollStatus
  note: string
  payslipCode: string
}

export interface ApiPayrollRun {
  id: string
  period: string
  status: PayrollStatus
  totalGross: number
  totalDeductions: number
  totalNet: number
  notes: string
  preparedBy: string
  reviewedBy: string
  approvedBy: string
  approvedAt: string | null
  paidAt: string | null
  payslipCount: number
  createdAt: string
}

export interface ApiSalaryStructure {
  id: string
  employeeId: string
  effectiveFrom: string
  effectiveTo: string | null
  currency: string
  annualCtc: number
  basic: number
  hra: number
  allowances: number
  deductions: number
  employerPf: number
  status: string
  note: string
}

export interface ApiContract {
  id: string
  code: string
  title: string
  partyType: 'Employee' | 'Contractor' | 'Vendor'
  employeeId: string | null
  employeeName: string
  partyName: string
  departmentId: string | null
  department: string
  contractType: string
  startDate: string
  endDate: string
  value: number
  currency: string
  paymentFrequency: 'Monthly' | 'Quarterly' | 'Annual' | 'Milestone' | 'One-time'
  status: ContractStatus
  notes: string
  terminatedReason: string
  signatures: unknown[]
  documents: unknown[]
  paymentSchedule: unknown[]
  history: unknown[]
  createdAt: string
  updatedAt: string
}

export interface ApiPayment {
  id: string
  code: string
  payee: string
  partyType: 'Employee' | 'Contractor' | 'Vendor'
  employeeId: string | null
  contractId: string | null
  date: string
  dueDate: string
  category: string
  amount: number
  currency: string
  method: 'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Card'
  approvalStatus: 'Pending' | 'Approved' | 'Rejected'
  paymentStatus: PaymentStatus
  description: string
  remarks: string
  approvedBy: string
  financePaymentId: string | null
  history: unknown[]
}

export interface ApiHrExpense {
  id: string
  code: string
  employeeId: string
  employeeName: string
  category: string
  amount: number
  currency: string
  expenseDate: string
  description: string
  receiptPath: string
  status: string
  submittedAt: string | null
  decidedAt: string | null
  reviewerRemarks: string
  currentApprover: string
}

export interface ApiJobOpening {
  id: string
  title: string
  departmentId: string | null
  department: string
  location: string
  employmentType: EmploymentType
  posted: string
  deadline: string
  status: 'Open' | 'On Hold' | 'Closed'
  hiringManagerId: string | null
  hiringManager: string
  openings: number
  description: string
  candidateCount: number
}

export interface ApiCandidate {
  id: string
  jobId: string
  jobTitle: string
  name: string
  email: string
  phone: string
  stage: CandidateStage
  appliedOn: string
  source: string
  resumePath: string
  rating: number
  experience: number
  currentCompany: string
  expectedSalary: number
  offerSalary?: number
  offerStatus?: 'Sent' | 'Accepted' | 'Declined'
  rejectionReason: string
  notes: string
  convertedEmployeeId: string | null
  interviews: unknown[]
}

export interface ApiOnboarding {
  id: string
  employeeId: string
  name: string
  email: string
  designationId: string | null
  designation: string
  departmentId: string | null
  department: string
  managerId: string | null
  manager: string
  employmentType: EmploymentType
  joiningDate: string
  status: 'Not Started' | 'In Progress' | 'Ready' | 'Completed'
  checklist: unknown[]
  systems: unknown[]
  notes: string
  documents: unknown[]
}

export interface ApiReview {
  id: string
  employeeId: string
  employeeName: string
  period: string
  cycle: string
  dueDate: string
  status: ReviewStatus
  selfRating: number
  managerRating: number
  hrRating: number
  goals: unknown[]
  strengths: string
  improvements: string
  comments: string
  managerId: string | null
  manager: string
  completedAt: string | null
}

export interface ApiEmployeeRequest {
  id: string
  employeeId: string
  employeeName: string
  type: string
  subject: string
  description: string
  status: RequestStatus
  priority: Priority
  assignedToId: string | null
  assignedTo: string
  createdAt: string
  resolvedAt: string | null
  responses: unknown[]
}

export interface ApiOffboarding {
  id: string
  employeeId: string
  employeeName: string
  resignationDate: string
  lastWorkingDay: string
  reason: string
  noticePeriodDays: number
  status: 'In Progress' | 'Clearance' | 'Completed' | 'Cancelled'
  exitInterviewDate: string
  exitInterviewNotes: string
  clearances: unknown[]
  settlementAmount: number
  settlementStatus: 'Pending' | 'Processing' | 'Paid'
  settlementNotes: string
  history: unknown[]
  documents: unknown[]
  completedAt: string | null
}

export interface ApiDepartment {
  id: string
  code: string
  name: string
  headUserId: string | null
  head: string
  isActive: boolean
  headcount: number
}

export interface ApiDesignation {
  id: string
  code: string
  name: string
  departmentId: string | null
  department: string
  level: string
}

export interface ApiActivity {
  id: string
  type: string
  title: string
  detail: string
  actor: string
  date: string
}

export interface ApiDocument {
  id: string
  doc_type?: string
  docType?: string
  name: string
  storage_path?: string
  storagePath?: string
  mime_type?: string
  size_bytes?: number | null
  status?: 'Pending' | 'Verified' | 'Rejected'
  created_at?: string
}

export interface HrDashboardPayload {
  summary: {
    totalEmployees: number
    activeEmployees: number
    probationEmployees: number
    onLeaveEmployees: number
    pendingLeaves: number
    pendingPayments: number
    pendingExpenses: number
    openRequests: number
    presentToday: number
    payrollThisMonth: number
    activeContracts: number
  } | null
  headcountByDepartment: Array<{ department: string; headcount: number; active: number; probation: number }>
  attendanceToday: Array<{ status: string; count: number }>
  recentActivities: ApiActivity[]
  upcomingHolidays: ApiHoliday[]
  pendingApprovalsByType: Array<{ entity_type: string; count: number }>
}

export interface HrAnalyticsPayload {
  headcount: Array<Record<string, unknown>>
  attendanceSummary: Array<Record<string, unknown>>
  leaveSummary: Array<Record<string, unknown>>
  payrollSummary: Array<Record<string, unknown>>
  tenureDistribution: Array<{ bucket: string; count: number }>
  monthlyJoiners: Array<{ month: string; joiners: number }>
}

// ---------------------------------------------------------------------------
// Dashboard & analytics
// ---------------------------------------------------------------------------

export const getDashboard = () => get<HrDashboardPayload>('/hr/dashboard')
export const getAnalytics = () => get<HrAnalyticsPayload>('/hr/analytics')
export const getAttendanceAnalytics = () => get<Array<Record<string, unknown>>>('/hr/analytics/attendance')
export const getPayrollAnalytics = () => get<Array<Record<string, unknown>>>('/hr/analytics/payroll')
export const getActivities = (query: QueryParams = {}) =>
  get<ApiActivity[]>('/hr/activities', { query })

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------

export interface EmployeeListQuery extends QueryParams {
  q?: string
  departmentId?: string
  designationId?: string
  status?: EmployeeStatus
  employmentType?: EmploymentType
  sort?: 'name:asc' | 'name:desc' | 'joiningDate:asc' | 'joiningDate:desc' | 'createdAt:asc' | 'createdAt:desc'
  page?: number
  pageSize?: number
}

export const listEmployees = (query: EmployeeListQuery = {}) =>
  getPaginated<ApiEmployee>('/hr/employees', { query })

export const listAllEmployees = (query: EmployeeListQuery = {}) =>
  fetchAllPages<ApiEmployee>('/hr/employees', query)

export const getEmployee = (id: string) => get<ApiEmployee>(`/hr/employees/${id}`)

export const createEmployee = (payload: EmployeeCreatePayload) =>
  post<ApiEmployee>('/hr/employees', payload, { idempotencyKey: createIdempotencyKey('hr-employee') })

export const updateEmployee = (id: string, payload: EmployeeUpdatePayload) =>
  patch<ApiEmployee>(`/hr/employees/${id}`, payload)

export const deleteEmployee = (id: string) => del<{ id: string }>(`/hr/employees/${id}`)

export const uploadEmployeeDocument = (
  employeeId: string,
  payload: { docType?: string; name: string; storagePath: string; mimeType?: string; sizeBytes?: number },
) => post<ApiDocument>(`/hr/employees/${employeeId}/documents`, payload)

export const verifyEmployeeDocument = (documentId: string, payload: { status: 'Verified' | 'Rejected'; remarks?: string }) =>
  post<ApiDocument>(`/hr/documents/${documentId}/verify`, payload)

export const listDepartments = () => get<ApiDepartment[]>('/hr/departments')
export const createDepartment = (payload: { code: string; name: string; headUserId?: string }) =>
  post<ApiDepartment>('/hr/departments', payload)
export const listDesignations = () => get<ApiDesignation[]>('/hr/designations')
export const createDesignation = (payload: { code: string; name: string; departmentId?: string; level?: string }) =>
  post<ApiDesignation>('/hr/designations', payload)

export const listLeaveTypes = () => get<ApiLeaveType[]>('/hr/leave-types')
export const listHolidays = () => get<ApiHoliday[]>('/hr/holidays')
export const createHoliday = (payload: { name: string; date: string; type: 'Public' | 'Company' | 'Optional' }) =>
  post<ApiHoliday>('/hr/holidays', payload)
export const deleteHoliday = (id: string) => del<{ id: string; deleted: true }>(`/hr/holidays/${id}`)

export const getHrSettings = () => get<{ data: Record<string, unknown>; updatedAt: string | null }>('/hr/settings')
export const saveHrSettings = (data: Record<string, unknown>) =>
  put<{ data: Record<string, unknown>; updatedAt: string }>('/hr/settings', { data })

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export interface AttendanceQuery extends QueryParams {
  employeeId?: string
  departmentId?: string
  status?: AttendanceStatus
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export const listAttendance = (query: AttendanceQuery = {}) =>
  getPaginated<ApiAttendance>('/hr/attendance', { query })

export const listAllAttendance = (query: AttendanceQuery = {}) =>
  fetchAllPages<ApiAttendance>('/hr/attendance', query)

export const recordAttendance = (payload: {
  employeeId: string
  date: string
  status?: AttendanceStatus
  checkIn?: string
  checkOut?: string
  hours?: number
  note?: string
  source?: 'Biometric' | 'Web' | 'Manual' | 'Mobile'
}) => post<ApiAttendance>('/hr/attendance', payload)

export const getAttendanceSummary = (query: AttendanceQuery = {}) =>
  get<Array<Record<string, unknown>>>('/hr/attendance/summary', { query })

export const listCorrections = (query: { status?: string } = {}) =>
  get<ApiAttendanceCorrection[]>('/hr/attendance/corrections', { query })

export const requestCorrection = (payload: {
  employeeId?: string
  date: string
  requestedStatus: AttendanceStatus
  checkIn?: string
  checkOut?: string
  reason: string
}) => post<ApiAttendanceCorrection>('/hr/attendance/corrections', payload)

export const decideCorrection = (id: string, payload: { decision: 'Approved' | 'Rejected'; remarks?: string }) =>
  post<ApiAttendanceCorrection>(`/hr/attendance/corrections/${id}/decide`, payload)

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------

export interface LeaveQuery extends QueryParams {
  employeeId?: string
  leaveTypeId?: string
  status?: LeaveStatus
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export const listLeaves = (query: LeaveQuery = {}) =>
  getPaginated<ApiLeave>('/hr/leaves', { query })

export const listAllLeaves = (query: LeaveQuery = {}) => fetchAllPages<ApiLeave>('/hr/leaves', query)

export const applyLeave = (payload: {
  employeeId?: string
  leaveTypeId: string
  from: string
  to: string
  reason: string
  priority?: Priority
  halfDay?: boolean
}) => post<ApiLeave>('/hr/leaves', payload, { idempotencyKey: createIdempotencyKey('hr-leave') })

export const approveLeave = (id: string, remarks?: string) =>
  post<ApiLeave>(`/hr/leaves/${id}/approve`, { remarks })

export const rejectLeave = (id: string, remarks?: string) =>
  post<ApiLeave>(`/hr/leaves/${id}/reject`, { remarks })

export const cancelLeave = (id: string) => post<ApiLeave>(`/hr/leaves/${id}/cancel`, {})

export const listLeaveBalances = (query: { employeeId?: string; year?: number } = {}) =>
  get<ApiLeaveBalance[]>('/hr/leave-balances', { query })

export const upsertLeaveBalance = (payload: {
  employeeId: string
  leaveTypeId: string
  year: number
  allocated: number
}) => post<ApiLeaveBalance>('/hr/leave-balances', payload)

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

export const listSalaryStructures = (query: { employeeId?: string } = {}) =>
  get<ApiSalaryStructure[]>('/hr/salary-structures', { query })

export const createSalaryStructure = (payload: {
  employeeId: string
  effectiveFrom: string
  effectiveTo?: string | null
  annualCtc: number
  basic: number
  hra?: number
  allowances?: number
  deductions?: number
  employerPf?: number
  note?: string
}) => post<ApiSalaryStructure>('/hr/salary-structures', payload)

export const listPayrollRuns = (query: { period?: string; status?: PayrollStatus; page?: number; pageSize?: number } = {}) =>
  getPaginated<ApiPayrollRun>('/hr/payroll/runs', { query })

export const createPayrollRun = (payload: { period: string; notes?: string; employeeIds?: string[] }) =>
  post<{ run: ApiPayrollRun; replayed: boolean }>('/hr/payroll/runs', payload, {
    idempotencyKey: createIdempotencyKey('hr-payroll'),
  })

export const getPayrollRun = (id: string) =>
  get<{ run: ApiPayrollRun; payslips: ApiPayslip[] }>(`/hr/payroll/runs/${id}`)

export type PayrollRunAction = 'submit' | 'review' | 'approve' | 'mark-paid' | 'cancel'

export const advancePayrollRun = (id: string, action: PayrollRunAction, notes?: string) =>
  post<ApiPayrollRun>(`/hr/payroll/runs/${id}/advance`, { action, notes })

export interface PayslipQuery extends QueryParams {
  period?: string
  employeeId?: string
  status?: PayrollStatus
  page?: number
  pageSize?: number
}

export const listPayslips = (query: PayslipQuery = {}) =>
  getPaginated<ApiPayslip>('/hr/payroll/payslips', { query })

export const listAllPayslips = (query: PayslipQuery = {}) =>
  fetchAllPages<ApiPayslip>('/hr/payroll/payslips', query)

export const updatePayslip = (
  id: string,
  payload: Partial<{
    basic: number
    allowances: number
    overtime: number
    deductions: number
    leaveDeduction: number
    tax: number
    attendanceDays: number
    leaveDays: number
    note: string
  }>,
) => patch<ApiPayslip>(`/hr/payroll/payslips/${id}`, payload)

// ---------------------------------------------------------------------------
// Contracts & daily payments
// ---------------------------------------------------------------------------

export interface ContractQuery extends QueryParams {
  status?: ContractStatus
  partyType?: 'Employee' | 'Contractor' | 'Vendor'
  employeeId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export const listContracts = (query: ContractQuery = {}) =>
  getPaginated<ApiContract>('/hr/contracts', { query })

export const listAllContracts = (query: ContractQuery = {}) =>
  fetchAllPages<ApiContract>('/hr/contracts', query)

export const getContract = (id: string) => get<ApiContract>(`/hr/contracts/${id}`)

export interface ContractPayload {
  title: string
  partyType?: 'Employee' | 'Contractor' | 'Vendor'
  employeeId?: string
  partyName: string
  departmentId?: string
  contractType?: string
  startDate: string
  endDate: string
  value?: number
  currency?: string
  paymentFrequency?: 'Monthly' | 'Quarterly' | 'Annual' | 'Milestone' | 'One-time'
  notes?: string
}

export const createContract = (payload: ContractPayload) =>
  post<ApiContract>('/hr/contracts', payload, { idempotencyKey: createIdempotencyKey('hr-contract') })

export const updateContract = (id: string, payload: Partial<ContractPayload> & { terminatedReason?: string }) =>
  patch<ApiContract>(`/hr/contracts/${id}`, payload)

export type ContractAction = 'submit' | 'request_signature' | 'activate' | 'renew' | 'terminate'

export const changeContractStatus = (id: string, action: ContractAction, reason?: string) =>
  post<ApiContract>(`/hr/contracts/${id}/status`, { action, reason })

export const addContractSignature = (id: string, payload: { name: string; role: string; signaturePath?: string }) =>
  post<ApiContract>(`/hr/contracts/${id}/signatures`, payload)

export interface PaymentQuery extends QueryParams {
  approvalStatus?: string
  paymentStatus?: string
  partyType?: string
  employeeId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export const listPayments = (query: PaymentQuery = {}) =>
  getPaginated<ApiPayment>('/hr/payments', { query })

export const listAllPayments = (query: PaymentQuery = {}) => fetchAllPages<ApiPayment>('/hr/payments', query)

export const createPayment = (payload: {
  payee: string
  partyType?: 'Employee' | 'Contractor' | 'Vendor'
  employeeId?: string
  contractId?: string
  paymentDate: string
  dueDate?: string
  category?: string
  amount: number
  currency?: string
  method?: 'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Card'
  description?: string
}) => post<{ payment: ApiPayment; replayed: boolean }>('/hr/payments', payload, {
  idempotencyKey: createIdempotencyKey('hr-payment'),
})

export const approvePayment = (id: string, remarks?: string) =>
  post<ApiPayment>(`/hr/payments/${id}/approve`, { remarks })

export const rejectPayment = (id: string, remarks?: string) =>
  post<ApiPayment>(`/hr/payments/${id}/reject`, { remarks })

export const changePaymentStatus = (id: string, paymentStatus: 'Processing' | 'Paid' | 'Failed' | 'Overdue', remarks?: string) =>
  post<ApiPayment>(`/hr/payments/${id}/status`, { paymentStatus, remarks })

export const getPaymentHistory = (id: string) =>
  get<{ payment: ApiPayment; history: Array<Record<string, unknown>> }>(`/hr/payments/${id}/history`)

export const markContractPaymentPaid = (id: string, payload: { paymentDate?: string; method?: string }) =>
  post<{ id: string; dueDate: string; amount: number; status: string }>(`/hr/contract-payments/${id}/mark-paid`, payload)

// ---------------------------------------------------------------------------
// HR expenses
// ---------------------------------------------------------------------------

export interface HrExpenseQuery extends QueryParams {
  status?: string
  employeeId?: string
  category?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export const listHrExpenses = (query: HrExpenseQuery = {}) =>
  getPaginated<ApiHrExpense>('/hr/expenses', { query })

export const listAllHrExpenses = (query: HrExpenseQuery = {}) =>
  fetchAllPages<ApiHrExpense>('/hr/expenses', query)

export const getHrExpense = (id: string) => get<ApiHrExpense>(`/hr/expenses/${id}`)

export const createHrExpense = (payload: {
  employeeId?: string
  category?:
    | 'Travel'
    | 'Meals'
    | 'Accommodation'
    | 'Office Supplies'
    | 'Training'
    | 'Medical'
    | 'Communication'
    | 'Other'
  amount: number
  currency?: string
  expenseDate: string
  description: string
  receiptPath?: string
  submit?: boolean
}) => post<{ expense: ApiHrExpense; replayed: boolean }>('/hr/expenses', payload, {
  idempotencyKey: createIdempotencyKey('hr-expense'),
})

export const approveHrExpense = (id: string, remarks?: string) =>
  post<ApiHrExpense>(`/hr/expenses/${id}/approve`, { remarks })

export const rejectHrExpense = (id: string, remarks?: string) =>
  post<ApiHrExpense>(`/hr/expenses/${id}/reject`, { remarks })

export const requestHrExpenseChanges = (id: string, remarks?: string) =>
  post<ApiHrExpense>(`/hr/expenses/${id}/request-changes`, { remarks })

export const reimburseHrExpense = (id: string, remarks?: string) =>
  post<ApiHrExpense>(`/hr/expenses/${id}/reimburse`, { remarks })

// ---------------------------------------------------------------------------
// Recruitment & talent
// ---------------------------------------------------------------------------

export const listJobs = (query: { status?: string; departmentId?: string } & QueryParams = {}) =>
  getPaginated<ApiJobOpening>('/hr/jobs', { query })

export const createJob = (payload: {
  title: string
  departmentId?: string
  location?: string
  employmentType?: EmploymentType
  postedOn?: string
  deadline?: string
  status?: 'Open' | 'On Hold' | 'Closed'
  hiringManagerId?: string
  openings?: number
  description?: string
}) => post<ApiJobOpening>('/hr/jobs', payload)

export const updateJob = (id: string, payload: Record<string, unknown>) =>
  patch<ApiJobOpening>(`/hr/jobs/${id}`, payload)

export const listCandidates = (query: { jobId?: string; stage?: CandidateStage; q?: string } & QueryParams = {}) =>
  getPaginated<ApiCandidate>('/hr/candidates', { query })

export const getCandidate = (id: string) =>
  get<ApiCandidate & { interviews: Array<Record<string, unknown>> }>(`/hr/candidates/${id}`)

export interface CandidatePayload {
  jobId?: string
  name: string
  email?: string
  phone?: string
  stage?: CandidateStage
  appliedOn?: string
  source?: string
  resumePath?: string
  rating?: number
  experienceYears?: number
  currentCompany?: string
  expectedSalary?: number
  offerSalary?: number
  offerStatus?: 'Sent' | 'Accepted' | 'Declined'
  rejectionReason?: string
  notes?: string
}

export const createCandidate = (payload: CandidatePayload) =>
  post<ApiCandidate>('/hr/candidates', payload)

export const updateCandidate = (id: string, payload: Partial<CandidatePayload>) =>
  patch<ApiCandidate>(`/hr/candidates/${id}`, payload)

export const scheduleInterview = (candidateId: string, payload: {
  round: string
  date: string
  time?: string
  interviewerId?: string
  interviewerName?: string
  mode?: 'Video' | 'On-site' | 'Phone'
}) => post<Record<string, unknown>>(`/hr/candidates/${candidateId}/interviews`, payload)

export const submitInterviewFeedback = (interviewId: string, payload: { feedback: string; rating?: number }) =>
  post<Record<string, unknown>>(`/hr/interviews/${interviewId}/feedback`, payload)

export const listOnboarding = () => get<ApiOnboarding[]>('/hr/onboarding')

export const createOnboarding = (payload: {
  employeeId?: string
  name: string
  email?: string
  designationId?: string
  designation?: string
  departmentId?: string
  managerId?: string
  employmentType?: EmploymentType
  joiningDate: string
  status?: 'Not Started' | 'In Progress' | 'Ready' | 'Completed'
  checklist?: unknown[]
  systems?: unknown[]
  notes?: string
}) => post<ApiOnboarding>('/hr/onboarding', payload)

export const updateOnboarding = (id: string, payload: Record<string, unknown>) =>
  patch<ApiOnboarding>(`/hr/onboarding/${id}`, payload)

export const listReviews = (query: { employeeId?: string; period?: string; status?: ReviewStatus } & QueryParams = {}) =>
  getPaginated<ApiReview>('/hr/reviews', { query })

export const createReview = (payload: {
  employeeId: string
  period: string
  cycle: string
  dueDate?: string
  managerId?: string
  goals?: unknown[]
}) => post<ApiReview>('/hr/reviews', payload)

export const updateReview = (id: string, payload: {
  status?: ReviewStatus
  selfRating?: number
  managerRating?: number
  hrRating?: number
  goals?: unknown[]
  strengths?: string
  improvements?: string
  comments?: string
}) => patch<ApiReview>(`/hr/reviews/${id}`, payload)

export const listEmployeeRequests = (
  query: { employeeId?: string; status?: RequestStatus; priority?: Priority } & QueryParams = {},
) => getPaginated<ApiEmployeeRequest>('/hr/requests', { query })

export const createEmployeeRequest = (payload: {
  employeeId?: string
  type: string
  subject: string
  description: string
  priority?: Priority
}) => post<ApiEmployeeRequest>('/hr/requests', payload)

export const updateEmployeeRequest = (
  id: string,
  payload: { status?: RequestStatus; priority?: Priority; assignedTo?: string; response?: string },
) => patch<ApiEmployeeRequest>(`/hr/requests/${id}`, payload)

export const listOffboarding = () => get<ApiOffboarding[]>('/hr/offboarding')

export const createOffboarding = (payload: {
  employeeId: string
  resignationDate: string
  lastWorkingDay: string
  reason?: string
  noticePeriodDays?: number
  clearances?: unknown[]
  settlementAmount?: number
}) => post<ApiOffboarding>('/hr/offboarding', payload)

export const updateOffboarding = (id: string, payload: {
  status?: 'In Progress' | 'Clearance' | 'Completed' | 'Cancelled'
  exitInterviewDate?: string
  exitInterviewNotes?: string
  clearances?: unknown[]
  settlementAmount?: number
  settlementStatus?: 'Pending' | 'Processing' | 'Paid'
  settlementNotes?: string
}) => patch<ApiOffboarding>(`/hr/offboarding/${id}`, payload)

// Re-exported so callers can type `Promise<PaginatedResponse<...>>` results.
export type { PaginatedResponse }
