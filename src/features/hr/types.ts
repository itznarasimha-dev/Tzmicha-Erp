export type EmployeeStatus = 'Active' | 'Probation' | 'On Leave' | 'Notice Period' | 'Terminated'
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship'
export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Remote' | 'Half Day'
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
export type CandidateStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected'
export type PayrollStatus = 'Draft' | 'HR Review' | 'Finance Approval' | 'Approved' | 'Paid'
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
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected'
export type RequestStatus = 'Open' | 'In Progress' | 'Resolved' | 'Rejected'
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type ReviewStatus = 'Not Started' | 'Self Assessment' | 'Manager Review' | 'HR Review' | 'Completed'

export interface DocFile {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  status: 'Verified' | 'Pending' | 'Rejected'
  dataUrl?: string
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  photo: string
  email: string
  phone: string
  department: string
  designation: string
  managerId: string | null
  manager: string
  employmentType: EmploymentType
  joiningDate: string
  status: EmployeeStatus
  location: string
  gender: 'Male' | 'Female' | 'Other'
  dob: string
  address: string
  emergencyContact: string
  bankAccount: string
  salary: number
  skills: string[]
  documents: DocFile[]
  bio?: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
  hours: number
  note?: string
  source: 'Biometric' | 'Web' | 'Manual' | 'Mobile'
  corrected?: boolean
}

export interface AttendanceCorrection {
  id: string
  employeeId: string
  date: string
  requestedStatus: AttendanceStatus
  checkIn: string | null
  checkOut: string | null
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  requestedAt: string
  reviewedBy?: string
  remarks?: string
}


export interface LeaveRequest {
  id: string
  employeeId: string
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
  halfDay?: boolean
}

export interface JobOpening {
  id: string
  title: string
  department: string
  location: string
  employmentType: EmploymentType
  posted: string
  deadline: string
  status: 'Open' | 'On Hold' | 'Closed'
  hiringManager: string
  openings: number
  description: string
}

export interface Interview {
  id: string
  round: string
  date: string
  time: string
  interviewer: string
  mode: 'Video' | 'On-site' | 'Phone'
  feedback?: string
  rating?: number
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone: string
  jobId: string
  stage: CandidateStage
  appliedOn: string
  source: string
  resumeName: string
  rating: number
  experience: number
  currentCompany: string
  expectedSalary: number
  interview?: Interview
  offerSalary?: number
  offerStatus?: 'Sent' | 'Accepted' | 'Declined'
  rejectionReason?: string
  notes?: string
  convertedEmployeeId?: string
}

export interface ChecklistItem {
  id: string
  label: string
  owner: string
  done: boolean
  category: 'Documents' | 'IT & Access' | 'People' | 'Compliance'
}

export interface OnboardingRecord {
  id: string
  name: string
  email: string
  designation: string
  department: string
  manager: string
  employmentType: EmploymentType
  joiningDate: string
  status: 'Not Started' | 'In Progress' | 'Ready' | 'Completed'
  employeeId: string
  documents: DocFile[]
  checklist: ChecklistItem[]
  systems: { id: string; name: string; enabled: boolean }[]
  notes: string
}

export interface PayrollEntry {
  id: string
  employeeId: string
  period: string
  basic: number
  allowances: number
  overtime: number
  deductions: number
  leaveDeduction: number
  tax: number
  attendanceDays: number
  leaveDays: number
  status: PayrollStatus
  note?: string
}

export interface ContractSignature {
  id: string
  name: string
  role: string
  status: 'Pending' | 'Signed'
  signedAt?: string
}

export interface PaymentScheduleItem {
  id: string
  dueDate: string
  amount: number
  status: 'Scheduled' | 'Paid' | 'Overdue'
}

export interface Contract {
  id: string
  title: string
  partyType: 'Employee' | 'Contractor' | 'Vendor'
  employeeId?: string
  partyName: string
  department: string
  contractType: string
  startDate: string
  endDate: string
  value: number
  paymentFrequency: 'Monthly' | 'Quarterly' | 'Annual' | 'Milestone' | 'One-time'
  status: ContractStatus
  signatures: ContractSignature[]
  documents: DocFile[]
  notes: string
  paymentSchedule: PaymentScheduleItem[]
  createdAt: string
  history: { id: string; date: string; action: string; actor: string }[]
}

export interface PaymentHistoryItem {
  id: string
  date: string
  action: string
  actor: string
}

export interface DailyPayment {
  id: string
  payee: string
  partyType: 'Employee' | 'Contractor' | 'Vendor'
  employeeId?: string
  contractId?: string
  date: string
  dueDate: string
  category: string
  amount: number
  method: 'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Card'
  approvalStatus: ApprovalStatus
  paymentStatus: PaymentStatus
  description: string
  remarks?: string
  approvedBy?: string
  history: PaymentHistoryItem[]
}

export interface Goal {
  id: string
  title: string
  target: string
  progress: number
  weight: number
  status: 'On Track' | 'At Risk' | 'Completed'
}

export interface PerformanceReview {
  id: string
  employeeId: string
  period: string
  cycle: string
  dueDate: string
  status: ReviewStatus
  selfRating: number
  managerRating: number
  hrRating: number
  goals: Goal[]
  strengths: string
  improvements: string
  comments: string
  manager: string
  completedAt?: string
}

export interface RequestResponse {
  id: string
  author: string
  message: string
  date: string
}

export interface EmployeeRequest {
  id: string
  employeeId: string
  type: string
  subject: string
  description: string
  status: RequestStatus
  priority: Priority
  assignedTo: string
  createdAt: string
  responses: RequestResponse[]
}

export interface Clearance {
  id: string
  department: 'Department' | 'IT' | 'Finance' | 'HR'
  owner: string
  status: 'Pending' | 'Cleared' | 'Blocked'
  note: string
}

export interface OffboardingRecord {
  id: string
  employeeId: string
  resignationDate: string
  lastWorkingDay: string
  reason: string
  noticePeriodDays: number
  status: 'In Progress' | 'Clearance' | 'Completed'
  exitInterviewDate?: string
  exitInterviewNotes?: string
  clearances: Clearance[]
  settlementAmount: number
  settlementStatus: 'Pending' | 'Processing' | 'Paid'
  settlementNotes: string
  documents: DocFile[]
  history: { id: string; date: string; action: string; actor: string }[]
}

export interface Holiday {
  id: string
  name: string
  date: string
  type: 'Public' | 'Company' | 'Optional'
}

export interface LeaveType {
  id: string
  name: string
  allocation: number
  paid: boolean
  carryForward: boolean
  requiresApproval: boolean
  color: string
  description: string
}

export interface SettingsData {
  departments: { id: string; name: string; head: string; code: string }[]
  designations: { id: string; name: string; department: string; level: string }[]
  employmentTypes: { id: string; name: string; description: string }[]
  employeeStatuses: { id: string; name: string; description: string; color: string }[]
  workingHours: { id: string; day: string; start: string; end: string; hours: number; active: boolean }[]
  attendancePolicies: { id: string; name: string; value: string; description: string }[]
  holidays: Holiday[]
  leaveTypes: LeaveType[]
  recruitmentStages: { id: string; name: string; order: number; sla: string }[]
  onboardingChecklists: { id: string; label: string; owner: string; category: string }[]
  contractTypes: { id: string; name: string; description: string; defaultTerm: string }[]
  paymentCategories: { id: string; name: string; description: string; taxable: boolean }[]
  reviewTemplates: { id: string; name: string; sections: string; cycle: string }[]
}

export interface Activity {
  id: string
  type: 'employee' | 'leave' | 'contract' | 'payment' | 'recruitment' | 'onboarding' | 'request' | 'performance' | 'offboarding' | 'attendance'
  title: string
  detail: string
  actor: string
  date: string
}

export interface Notification {
  id: string
  title: string
  detail: string
  date: string
  read: boolean
  type: 'info' | 'success' | 'warning' | 'danger'
}

export interface Database {
  employees: Employee[]
  attendance: AttendanceRecord[]
  leaves: LeaveRequest[]
  jobs: JobOpening[]
  candidates: Candidate[]
  onboarding: OnboardingRecord[]
  payroll: PayrollEntry[]
  contracts: Contract[]
  payments: DailyPayment[]
  reviews: PerformanceReview[]
  requests: EmployeeRequest[]
  offboarding: OffboardingRecord[]
  corrections: AttendanceCorrection[]
  settings: SettingsData
  activities: Activity[]
  notifications: Notification[]
}
