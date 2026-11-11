/**
 * Row → API mappers for the HR module.
 *
 * The API returns the same camelCase shapes the existing HR frontend already
 * uses (`src/features/hr/types.ts`), so pages can switch from localStorage to
 * the API without a UI rewrite.
 */

type Row = Record<string, any>

export function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function dateOnly(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value)
  return text.length >= 10 ? text.slice(0, 10) : text
}

export function iso(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

export function fullName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ').trim()
}

export function mapEmployee(row: Row, options: { includeSalary: boolean }) {
  return {
    id: row.id,
    userId: row.user_id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    name: fullName(row.first_name, row.last_name),
    photo: row.photo_url ?? '',
    email: row.email,
    personalEmail: row.personal_email ?? '',
    phone: row.phone ?? '',
    departmentId: row.department_id,
    department: row.department_name ?? 'Unassigned',
    designationId: row.designation_id,
    designation: row.designation_name ?? '',
    managerId: row.manager_id,
    manager: row.manager_name ?? '',
    employmentType: row.employment_type,
    joiningDate: dateOnly(row.joining_date),
    status: row.employee_status,
    workLocation: row.work_location ?? '',
    location: row.work_location ?? '',
    gender: row.gender ?? 'Other',
    dob: dateOnly(row.date_of_birth),
    address: row.address ?? '',
    emergencyContact: row.emergency_contact ?? '',
    bankAccount: row.bank_account_masked ?? '',
    bankIfsc: row.bank_ifsc ?? '',
    // Confidential: omitted unless the caller may read salaries.
    salary: options.includeSalary ? num(row.current_ctc) : null,
    skills: Array.isArray(row.skills) ? row.skills : [],
    bio: row.bio ?? '',
    terminatedAt: row.terminated_at ? iso(row.terminated_at) : null,
    documents: [],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function mapAttendance(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    date: dateOnly(row.attendance_date),
    checkIn: row.check_in ? iso(row.check_in) : null,
    checkOut: row.check_out ? iso(row.check_out) : null,
    status: row.status,
    hours: num(row.hours),
    note: row.note ?? '',
    source: row.source,
    corrected: Boolean(row.corrected),
    linkedLeaveId: row.linked_leave_id ?? null,
  }
}

export function mapCorrection(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    attendanceId: row.attendance_id ?? null,
    date: dateOnly(row.correction_date),
    requestedStatus: row.requested_status,
    checkIn: row.check_in ? iso(row.check_in) : null,
    checkOut: row.check_out ? iso(row.check_out) : null,
    reason: row.reason,
    status: row.status,
    requestedAt: iso(row.requested_at),
    reviewedBy: row.reviewer_name ?? '',
    remarks: row.remarks ?? '',
  }
}

export function mapLeave(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    leaveTypeId: row.leave_type_id,
    leaveType: row.leave_type_name ?? '',
    from: dateOnly(row.start_date),
    to: dateOnly(row.end_date),
    days: num(row.days),
    reason: row.reason,
    status: row.status,
    appliedOn: iso(row.applied_on),
    reviewer: row.reviewer_name ?? '',
    remarks: row.remarks ?? '',
    priority: row.priority,
    halfDay: Boolean(row.half_day),
  }
}

export function mapLeaveType(row: Row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    allocation: num(row.allocation_days),
    paid: Boolean(row.paid),
    carryForward: Boolean(row.carry_forward),
    requiresApproval: Boolean(row.requires_approval),
    color: row.color,
    description: row.description ?? '',
    isActive: Boolean(row.is_active),
  }
}

export function mapHoliday(row: Row) {
  return {
    id: row.id,
    name: row.name,
    date: dateOnly(row.holiday_date),
    type: row.holiday_type,
  }
}

export function mapLeaveBalance(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeId: row.leave_type_id,
    leaveType: row.leave_type_name ?? '',
    year: num(row.year),
    allocated: num(row.allocated),
    used: num(row.used),
    pending: num(row.pending),
    available: num(row.allocated) - num(row.used) - num(row.pending),
  }
}

export function mapPayslip(row: Row) {
  return {
    id: row.id,
    payrollRunId: row.payroll_run_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    period: row.period,
    basic: num(row.basic),
    allowances: num(row.allowances),
    overtime: num(row.overtime),
    deductions: num(row.deductions),
    leaveDeduction: num(row.leave_deduction),
    tax: num(row.tax),
    netPay: num(row.net_pay),
    attendanceDays: num(row.attendance_days),
    leaveDays: num(row.leave_days),
    status: row.status,
    note: row.note ?? '',
    payslipCode: row.payslip_code ?? '',
  }
}

export function mapPayrollRun(row: Row) {
  return {
    id: row.id,
    period: row.period,
    status: row.status,
    totalGross: num(row.total_gross),
    totalDeductions: num(row.total_deductions),
    totalNet: num(row.total_net),
    notes: row.notes ?? '',
    preparedBy: row.prepared_by_name ?? '',
    reviewedBy: row.reviewed_by_name ?? '',
    approvedBy: row.approved_by_name ?? '',
    approvedAt: row.approved_at ? iso(row.approved_at) : null,
    paidAt: row.paid_at ? iso(row.paid_at) : null,
    payslipCount: num(row.payslip_count),
    createdAt: iso(row.created_at),
  }
}

export function mapSalaryStructure(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    effectiveFrom: dateOnly(row.effective_from),
    effectiveTo: row.effective_to ? dateOnly(row.effective_to) : null,
    currency: row.currency,
    annualCtc: num(row.annual_ctc),
    basic: num(row.basic),
    hra: num(row.hra),
    allowances: num(row.allowances),
    deductions: num(row.deductions),
    employerPf: num(row.employer_pf),
    status: row.status,
    note: row.note ?? '',
  }
}

export function mapContract(row: Row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    partyType: row.party_type,
    employeeId: row.employee_id ?? null,
    employeeName: row.employee_name ?? '',
    partyName: row.party_name,
    departmentId: row.department_id ?? null,
    department: row.department_name ?? '',
    contractType: row.contract_type,
    startDate: dateOnly(row.start_date),
    endDate: dateOnly(row.end_date),
    value: num(row.value),
    currency: row.currency,
    paymentFrequency: row.payment_frequency,
    status: row.status,
    notes: row.notes ?? '',
    terminatedReason: row.terminated_reason ?? '',
    signatures: [],
    documents: [],
    paymentSchedule: [],
    history: [],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function mapPayment(row: Row) {
  return {
    id: row.id,
    code: row.code,
    payee: row.payee,
    partyType: row.party_type,
    employeeId: row.employee_id ?? null,
    contractId: row.contract_id ?? null,
    date: dateOnly(row.payment_date),
    dueDate: dateOnly(row.due_date),
    category: row.category,
    amount: num(row.amount),
    currency: row.currency,
    method: row.method,
    approvalStatus: row.approval_status,
    paymentStatus: row.payment_status,
    description: row.description ?? '',
    remarks: row.remarks ?? '',
    approvedBy: row.approved_by_name ?? '',
    financePaymentId: row.finance_payment_id ?? null,
    history: [],
  }
}

export function mapExpense(row: Row) {
  return {
    id: row.id,
    code: row.code,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    category: row.category,
    amount: num(row.amount),
    currency: row.currency,
    expenseDate: dateOnly(row.expense_date),
    description: row.description,
    receiptPath: row.receipt_path ?? '',
    status: row.status,
    submittedAt: row.submitted_at ? iso(row.submitted_at) : null,
    decidedAt: row.decided_at ? iso(row.decided_at) : null,
    reviewerRemarks: row.reviewer_remarks ?? '',
    currentApprover: row.current_approver_name ?? '',
  }
}

export function mapJobOpening(row: Row) {
  return {
    id: row.id,
    title: row.title,
    departmentId: row.department_id ?? null,
    department: row.department_name ?? '',
    location: row.location ?? '',
    employmentType: row.employment_type,
    posted: dateOnly(row.posted_on),
    deadline: row.deadline ? dateOnly(row.deadline) : '',
    status: row.status,
    hiringManagerId: row.hiring_manager_id ?? null,
    hiringManager: row.hiring_manager_name ?? '',
    openings: num(row.openings, 1),
    description: row.description ?? '',
    candidateCount: num(row.candidate_count),
  }
}

export function mapCandidate(row: Row) {
  return {
    id: row.id,
    jobId: row.job_id ?? '',
    jobTitle: row.job_title ?? '',
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    stage: row.stage,
    appliedOn: dateOnly(row.applied_on),
    source: row.source ?? '',
    resumePath: row.resume_path ?? '',
    rating: num(row.rating),
    experience: num(row.experience_years),
    currentCompany: row.current_company ?? '',
    expectedSalary: num(row.expected_salary),
    offerSalary: row.offer_salary === null ? undefined : num(row.offer_salary),
    offerStatus: row.offer_status ?? undefined,
    rejectionReason: row.rejection_reason ?? '',
    notes: row.notes ?? '',
    convertedEmployeeId: row.converted_employee_id ?? null,
    interviews: [],
  }
}

export function mapInterview(row: Row) {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    round: row.round,
    date: dateOnly(row.interview_date),
    time: row.interview_time ?? '',
    interviewerId: row.interviewer_id ?? null,
    interviewer: row.interviewer_name ?? '',
    mode: row.mode,
    feedback: row.feedback ?? '',
    rating: row.rating === null ? undefined : num(row.rating),
  }
}

export function mapOnboarding(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id ?? '',
    name: row.name,
    email: row.email ?? '',
    designationId: row.designation_id ?? null,
    designation: row.designation ?? '',
    departmentId: row.department_id ?? null,
    department: row.department_name ?? '',
    managerId: row.manager_id ?? null,
    manager: row.manager_name ?? '',
    employmentType: row.employment_type,
    joiningDate: dateOnly(row.joining_date),
    status: row.status,
    checklist: row.checklist ?? [],
    systems: row.systems ?? [],
    notes: row.notes ?? '',
    documents: [],
  }
}

export function mapReview(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    period: row.period,
    cycle: row.cycle,
    dueDate: row.due_date ? dateOnly(row.due_date) : '',
    status: row.status,
    selfRating: row.self_rating === null ? 0 : num(row.self_rating),
    managerRating: row.manager_rating === null ? 0 : num(row.manager_rating),
    hrRating: row.hr_rating === null ? 0 : num(row.hr_rating),
    goals: row.goals ?? [],
    strengths: row.strengths ?? '',
    improvements: row.improvements ?? '',
    comments: row.comments ?? '',
    managerId: row.manager_id ?? null,
    manager: row.manager_name ?? '',
    completedAt: row.completed_at ? iso(row.completed_at) : null,
  }
}

export function mapEmployeeRequest(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    type: row.request_type,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedToId: row.assigned_to ?? null,
    assignedTo: row.assigned_to_name ?? '',
    createdAt: iso(row.created_at),
    resolvedAt: row.resolved_at ? iso(row.resolved_at) : null,
    responses: row.responses ?? [],
  }
}

export function mapOffboarding(row: Row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    resignationDate: dateOnly(row.resignation_date),
    lastWorkingDay: dateOnly(row.last_working_day),
    reason: row.reason ?? '',
    noticePeriodDays: num(row.notice_period_days),
    status: row.status,
    exitInterviewDate: row.exit_interview_date ? dateOnly(row.exit_interview_date) : '',
    exitInterviewNotes: row.exit_interview_notes ?? '',
    clearances: row.clearances ?? [],
    settlementAmount: num(row.settlement_amount),
    settlementStatus: row.settlement_status,
    settlementNotes: row.settlement_notes ?? '',
    history: row.history ?? [],
    documents: [],
    completedAt: row.completed_at ? iso(row.completed_at) : null,
  }
}

export function mapActivity(row: Row) {
  return {
    id: row.id,
    type: row.activity_type,
    title: row.title,
    detail: row.detail ?? '',
    actor: row.actor_name ?? '',
    date: iso(row.created_at),
  }
}

export function mapDepartment(row: Row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    headUserId: row.head_user_id ?? null,
    head: row.head_name ?? '',
    isActive: Boolean(row.is_active),
    headcount: num(row.headcount),
  }
}

export function mapDesignation(row: Row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    departmentId: row.department_id ?? null,
    department: row.department_name ?? '',
    level: row.level,
  }
}
