/* ============================================================
   Totally ERP — HR Management workspace types
   Frontend demonstration models. Records are stored locally and
   are seeded from the existing ERP employee roster.
   ============================================================ */

export type HREmploymentType = 'Full Time' | 'Part Time' | 'Contract' | 'Intern'

export type HREmployeeStatus = 'Active' | 'Onboarding' | 'On Leave' | 'Resigned' | 'Terminated'

export interface HREmployee {
  id: string
  employeeId: string
  name: string
  email: string
  phone: string
  department: string
  designation: string
  reportingManager: string
  employmentType: HREmploymentType
  joiningDate: string
  status: HREmployeeStatus
  location: string
  dateOfBirth: string
  workAnniversary: string
  salary: number
  bankAccount: string
  emergencyContact: string
  skills: string[]
}

export type HRAttendanceStatus = 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Holiday'

export interface HRAttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  department: string
  date: string
  checkIn: string | null
  checkOut: string | null
  workingHours: number
  status: HRAttendanceStatus
  lateMinutes: number
  source: 'Biometric' | 'Manual' | 'Correction'
  note?: string
}

export type HRLeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'

export interface HRLeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  department: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: HRLeaveStatus
  requestDate: string
  reviewer: string | null
  reviewerRemarks: string
  decidedAt: string | null
}

export interface HRLeaveBalance {
  id: string
  employeeId: string
  employeeName: string
  leaveType: string
  entitled: number
  used: number
  pending: number
}

export interface HRLeavePolicy {
  id: string
  leaveType: string
  annualQuota: number
  carryForward: number
  paid: boolean
  approval: string
  description: string
}

export type HRCorrectionStatus = 'Pending' | 'Approved' | 'Rejected'

export interface HRCorrectionRequest {
  id: string
  attendanceId: string
  employeeId: string
  employeeName: string
  date: string
  requestedCheckIn: string
  requestedCheckOut: string
  reason: string
  status: HRCorrectionStatus
  requestedAt: string
  decidedBy: string | null
  decidedAt: string | null
  reviewNote: string
}

export interface HRAttendancePolicy {
  id: string
  name: string
  department: string
  checkIn: string
  checkOut: string
  graceMinutes: number
  fullDayHours: number
  halfDayHours: number
  workingDays: string
  lateMarkAfter: string
}

export interface HRHoliday {
  id: string
  name: string
  date: string
  type: 'Public' | 'Restricted' | 'Company'
}

export type HRCandidateStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected'

export interface HRJobOpening {
  id: string
  jobTitle: string
  department: string
  designation: string
  vacancies: number
  employmentType: HREmploymentType
  hiringManager: string
  openingDate: string
  closingDate: string
  status: 'Open' | 'Closed' | 'On Hold'
  location: string
  description: string
}

export interface HRCandidate {
  id: string
  name: string
  email: string
  phone: string
  position: string
  jobId: string
  stage: HRCandidateStage
  appliedDate: string
  source: string
  experience: string
  resumeName: string
  feedback: string
  rating: number | null
  offeredAmount: number | null
}

export interface HRInterview {
  id: string
  candidateId: string
  candidateName: string
  position: string
  interviewDate: string
  interviewTime: string
  interviewer: string
  mode: 'In person' | 'Video' | 'Phone'
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  feedback: string
}

export interface HRDocument {
  id: string
  employeeId: string
  employeeName: string
  name: string
  type: string
  uploadedAt: string
  status: 'Verified' | 'Pending' | 'Rejected'
}

export interface HRChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface HROnboarding {
  id: string
  employeeId: string
  name: string
  position: string
  department: string
  startDate: string
  buddy: string
  status: 'In Progress' | 'Completed'
  checklist: HRChecklistItem[]
  completedAt: string | null
}

export type HRPayrollStatus = 'Pending' | 'Prepared' | 'Sent to Finance' | 'Finance Approved' | 'Processed'

export interface HRPayroll {
  id: string
  period: string
  monthKey: string
  employeeCount: number
  status: HRPayrollStatus
  gross: number
  deductions: number
  net: number
  preparedBy: string | null
  preparedAt: string | null
  financeApprovedBy: string | null
  financeApprovedAt: string | null
  note: string
}

export interface HRPayrollLine {
  id: string
  payrollId: string
  employeeId: string
  employeeName: string
  department: string
  base: number
  allowances: number
  deductions: number
  net: number
  attendanceDays: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  lossOfPay: number
  adjustmentKey: string
}

export type HRReviewStatus =
  | 'Pending Self Assessment'
  | 'Self Assessment Submitted'
  | 'Manager Review'
  | 'HR Review'
  | 'Completed'

export interface HRGoal {
  id: string
  title: string
  weight: number
  selfScore: number | null
  managerScore: number | null
  hrScore: number | null
  comment: string
}

export interface HRPerformanceReview {
  id: string
  employeeId: string
  employeeName: string
  department: string
  designation: string
  reviewPeriod: string
  manager: string
  status: HRReviewStatus
  selfRating: number | null
  managerRating: number | null
  hrRating: number | null
  goals: HRGoal[]
  selfComment: string
  managerComment: string
  hrComment: string
  updatedAt: string
}

export type HREmployeeRequestStatus = 'Pending' | 'In Progress' | 'Completed' | 'Rejected'

export interface HREmployeeRequest {
  id: string
  employeeId: string
  employeeName: string
  department: string
  category: string
  subject: string
  description: string
  requestDate: string
  status: HREmployeeRequestStatus
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  assignedTo: string
  resolutionNote: string
  resolvedAt: string | null
}

export interface HRClearance {
  it: boolean
  finance: boolean
  manager: boolean
  hr: boolean
}

export type HROffboardingStatus =
  | 'Pending Review'
  | 'In Progress'
  | 'Clearance Pending'
  | 'Completed'

export interface HROffboarding {
  id: string
  employeeId: string
  employeeName: string
  department: string
  designation: string
  resignationDate: string
  noticePeriodDays: number
  noticePeriodEnd: string
  lastWorkingDay: string
  reason: string
  exitInterviewDate: string | null
  exitInterviewStatus: 'Pending' | 'Scheduled' | 'Completed'
  clearance: HRClearance
  finalSettlement: 'Pending' | 'Prepared' | 'Sent to Finance' | 'Settled'
  status: HROffboardingStatus
  manager: string
  note: string
}

export interface HRDepartment {
  id: string
  name: string
  head: string
  costCentre: string
}

export interface HRDesignation {
  id: string
  title: string
  department: string
  level: string
}

export interface HRWorkingHours {
  id: string
  name: string
  start: string
  end: string
  breakMinutes: number
  weeklyHours: number
  appliesTo: string
}

export interface HRReviewTemplate {
  id: string
  name: string
  cycle: string
  sections: string[]
  ratingScale: string
  status: 'Active' | 'Archived'
}

export type HRModuleId =
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'leave'
  | 'recruitment'
  | 'onboarding'
  | 'payroll'
  | 'performance'
  | 'requests'
  | 'offboarding'
  | 'reports'
  | 'settings'

export interface HRActivityEntry {
  id: string
  at: string
  actor: string
  action: string
  detail: string
  module: HRModuleId | 'system'
  tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
}

export interface HRDataState {
  employees: HREmployee[]
  attendance: HRAttendanceRecord[]
  leaveRequests: HRLeaveRequest[]
  leaveBalances: HRLeaveBalance[]
  leavePolicies: HRLeavePolicy[]
  correctionRequests: HRCorrectionRequest[]
  attendancePolicies: HRAttendancePolicy[]
  holidays: HRHoliday[]
  jobOpenings: HRJobOpening[]
  candidates: HRCandidate[]
  interviews: HRInterview[]
  documents: HRDocument[]
  onboarding: HROnboarding[]
  payrolls: HRPayroll[]
  payrollLines: HRPayrollLine[]
  performanceReviews: HRPerformanceReview[]
  employeeRequests: HREmployeeRequest[]
  offboarding: HROffboarding[]
  departments: HRDepartment[]
  designations: HRDesignation[]
  employmentTypes: Array<{ id: string; name: string; description: string; active: boolean }>
  workingHours: HRWorkingHours[]
  reviewTemplates: HRReviewTemplate[]
  activity: HRActivityEntry[]
}

export interface HREmployeeDraft {
  name: string
  email: string
  phone: string
  department: string
  designation: string
  reportingManager: string
  employmentType: HREmploymentType
  joiningDate: string
  location: string
  salary: number
  status: HREmployeeStatus
}

export interface HRLeaveDraft {
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
}

export interface HRCorrectionDraft {
  employeeId: string
  date: string
  requestedCheckIn: string
  requestedCheckOut: string
  reason: string
}

export interface HRJobDraft {
  jobTitle: string
  department: string
  designation: string
  vacancies: number
  employmentType: HREmploymentType
  hiringManager: string
  openingDate: string
  closingDate: string
  location: string
  description: string
}

export interface HRCandidateDraft {
  name: string
  email: string
  phone: string
  position: string
  jobId: string
  source: string
  experience: string
  resumeName: string
}

export interface HRInterviewDraft {
  candidateId: string
  interviewDate: string
  interviewTime: string
  interviewer: string
  mode: HRInterview['mode']
}

export interface HROffboardingDraft {
  employeeId: string
  resignationDate: string
  noticePeriodDays: number
  lastWorkingDay: string
  reason: string
  manager: string
}

export interface HREmployeeRequestDraft {
  employeeId: string
  category: string
  subject: string
  description: string
  priority: HREmployeeRequest['priority']
}
