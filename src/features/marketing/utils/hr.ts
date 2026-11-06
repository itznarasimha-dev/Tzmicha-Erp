import { HR_TODAY } from '../data/hr'
import type {
  HRAttendanceRecord,
  HRDataState,
  HREmployee,
  HRLeaveRequest,
  HRPerformanceReview,
} from '../types/hr'
import type { BadgeTone } from '../components/ui/Badge'
import type { DemoRoleProfile } from '../types/workflow'

export const HR_MODULE_LABELS: Record<string, string> = {
  dashboard: 'My Dashboard',
  employees: 'Employees',
  attendance: 'Attendance',
  leave: 'Leave Management',
  recruitment: 'Recruitment',
  onboarding: 'Onboarding',
  payroll: 'Payroll',
  performance: 'Performance',
  requests: 'Employee Requests',
  offboarding: 'Offboarding',
  reports: 'Reports & Analytics',
  settings: 'HR Settings',
}

export function hrStatusTone(status: string): BadgeTone {
  const s = status.toLowerCase()
  if (
    [
      'active',
      'approved',
      'completed',
      'verified',
      'processed',
      'finance approved',
      'settled',
      'hired',
      'present',
      'success',
    ].some((value) => s === value)
  )
    return 'success'
  if (
    [
      'pending',
      'pending review',
      'pending self assessment',
      'self assessment submitted',
      'manager review',
      'hr review',
      'in progress',
      'prepared',
      'sent to finance',
      'onboarding',
      'on leave',
      'late',
      'scheduled',
      'clearance pending',
      'on hold',
      'restricted',
    ].some((value) => s === value)
  )
    return 'warning'
  if (['rejected', 'absent', 'cancelled', 'terminated', 'resigned', 'failed'].some((value) => s === value))
    return 'danger'
  if (['interview', 'screening', 'offer', 'open', 'accent'].some((value) => s === value)) return 'accent'
  if (['applied', 'closed', 'holiday', 'neutral'].some((value) => s === value)) return 'neutral'
  return 'info'
}

export function formatDateRange(start: string, end: string): string {
  const format = (value: string) =>
    new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(
      new Date(`${value}T00:00:00`),
    )
  if (start === end) return format(start)
  return `${format(start)} – ${format(end)}`
}

export function formatDateLong(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function getEmployee(state: HRDataState, employeeId: string): HREmployee | undefined {
  return state.employees.find(
    (employee) => employee.employeeId === employeeId || employee.id === employeeId,
  )
}

export function currentEmployee(state: HRDataState, profile: DemoRoleProfile): HREmployee | undefined {
  return (
    state.employees.find(
      (employee) =>
        employee.employeeId === profile.employeeId ||
        employee.email.toLowerCase() === profile.email.toLowerCase() ||
        employee.name.toLowerCase() === profile.name.toLowerCase(),
    ) ?? state.employees[0]
  )
}

export function isOnApprovedLeave(
  state: HRDataState,
  employeeId: string,
  date: string = HR_TODAY,
): HRLeaveRequest | undefined {
  return state.leaveRequests.find(
    (request) =>
      request.employeeId === employeeId &&
      request.status === 'Approved' &&
      date >= request.startDate &&
      date <= request.endDate,
  )
}

export function getTodayRecords(state: HRDataState, date: string = HR_TODAY): HRAttendanceRecord[] {
  return state.attendance.filter((record) => record.date === date)
}

export function attendanceMetrics(state: HRDataState, date: string = HR_TODAY) {
  const activeEmployees = state.employees.filter((employee) =>
    ['Active', 'On Leave', 'Onboarding'].includes(employee.status),
  )
  const records = getTodayRecords(state, date)
  const holidays = state.holidays.filter((holiday) => holiday.date === date)
  const present = records.filter((record) => ['Present', 'Late'].includes(record.status))
  const onLeave = records.filter((record) => record.status === 'On Leave')
  const late = records.filter((record) => record.status === 'Late')
  const approvedLeaveWithoutRecord = activeEmployees.filter(
    (employee) =>
      isOnApprovedLeave(state, employee.employeeId, date) &&
      !onLeave.some((record) => record.employeeId === employee.employeeId),
  )
  const onLeaveCount = onLeave.length + approvedLeaveWithoutRecord.length
  const absent = holidays.length ? 0 : Math.max(0, activeEmployees.length - present.length - onLeaveCount)
  const totalWorking = present.length + onLeaveCount + absent
  return {
    totalEmployees: state.employees.filter((employee) => employee.status !== 'Terminated' && employee.status !== 'Resigned').length,
    activeEmployees: activeEmployees.length,
    present: present.length,
    late: late.length,
    onLeave: onLeaveCount,
    absent,
    holiday: holidays.length > 0,
    holidayName: holidays[0]?.name,
    attendanceRate: totalWorking ? (present.length / totalWorking) * 100 : 0,
    avgHours:
      present.length > 0
        ? present.reduce((sum, record) => sum + record.workingHours, 0) / present.length
        : 0,
    pendingCorrections: state.correctionRequests.filter((request) => request.status === 'Pending').length,
    records,
    presentRecords: present,
    onLeaveRecords: onLeave,
    lateRecords: late,
  }
}

export interface AttendanceTrendPoint {
  label: string
  fullLabel: string
  present: number
  onLeave: number
  absent: number
  late: number
  rate: number
}

export function attendanceTrend(state: HRDataState, range: 'daily' | 'weekly' | 'monthly'): AttendanceTrendPoint[] {
  const points: AttendanceTrendPoint[] = []
  const now = new Date()
  if (range === 'daily') {
    for (let offset = -6; offset <= 0; offset += 1) {
      const date = new Date(now)
      date.setDate(date.getDate() + offset)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const metrics = attendanceMetrics(state, key)
      points.push({
        label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
        fullLabel: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date),
        present: metrics.present,
        onLeave: metrics.onLeave,
        absent: metrics.absent,
        late: metrics.late,
        rate: metrics.attendanceRate,
      })
    }
    return points
  }
  if (range === 'weekly') {
    for (let week = 7; week >= 0; week -= 1) {
      const end = new Date(now)
      end.setDate(end.getDate() - week * 7)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
      const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
      const records = state.attendance.filter((record) => record.date >= startKey && record.date <= endKey)
      const present = records.filter((record) => ['Present', 'Late'].includes(record.status)).length
      const onLeave = records.filter((record) => record.status === 'On Leave').length
      const absent = records.filter((record) => record.status === 'Absent').length
      const late = records.filter((record) => record.status === 'Late').length
      const total = present + onLeave + absent
      points.push({
        label: `W${8 - week}`,
        fullLabel: `${formatDateRange(startKey, endKey)}`,
        present,
        onLeave,
        absent,
        late,
        rate: total ? (present / total) * 100 : 0,
      })
    }
    return points
  }
  for (let offset = -5; offset <= 0; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const records = state.attendance.filter((record) => record.date.startsWith(key))
    const present = records.filter((record) => ['Present', 'Late'].includes(record.status)).length
    const onLeave = records.filter((record) => record.status === 'On Leave').length
    const absent = records.filter((record) => record.status === 'Absent').length
    const late = records.filter((record) => record.status === 'Late').length
    const total = present + onLeave + absent
    points.push({
      label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date),
      fullLabel: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date),
      present,
      onLeave,
      absent,
      late,
      rate: total ? (present / total) * 100 : 0,
    })
  }
  return points
}

export function distribution(
  employees: HREmployee[],
  key: 'department' | 'designation' | 'employmentType',
  limit = 7,
): Array<{ name: string; value: number }> {
  const counts = new Map<string, number>()
  employees.forEach((employee) => {
    const label = employee[key] || 'Unassigned'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  })
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

export function recruitmentFunnel(state: HRDataState): Array<{ label: string; value: number; color: string }> {
  const stages: Array<{ label: string; stage: string; color: string }> = [
    { label: 'Applied', stage: 'Applied', color: 'var(--chart-5)' },
    { label: 'Screening', stage: 'Screening', color: 'var(--chart-1)' },
    { label: 'Interview', stage: 'Interview', color: 'var(--chart-6)' },
    { label: 'Offer', stage: 'Offer', color: 'var(--chart-3)' },
    { label: 'Hired', stage: 'Hired', color: 'var(--chart-2)' },
  ]
  return stages.map((stage) => ({
    label: stage.label,
    value: state.candidates.filter((candidate) => candidate.stage === stage.stage).length,
    color: stage.color,
  }))
}

export function leaveSummary(state: HRDataState) {
  const pending = state.leaveRequests.filter((request) => request.status === 'Pending')
  const approved = state.leaveRequests.filter((request) => request.status === 'Approved')
  const rejected = state.leaveRequests.filter((request) => request.status === 'Rejected')
  const pendingDays = pending.reduce((sum, request) => sum + request.days, 0)
  const approvedDays = approved.reduce((sum, request) => sum + request.days, 0)
  const byType = new Map<string, number>()
  state.leaveRequests.forEach((request) => {
    byType.set(request.leaveType, (byType.get(request.leaveType) ?? 0) + request.days)
  })
  return {
    pending,
    approved,
    rejected,
    pendingDays,
    approvedDays,
    pendingCount: pending.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    byType: [...byType.entries()].map(([name, value]) => ({ name, value })),
  }
}

export function upcomingApprovedLeaves(state: HRDataState, days = 30): HRLeaveRequest[] {
  const now = new Date()
  const limit = new Date()
  limit.setDate(limit.getDate() + days)
  return state.leaveRequests
    .filter(
      (request) =>
        request.status === 'Approved' &&
        new Date(`${request.startDate}T00:00:00`) >= new Date(HR_TODAY + 'T00:00:00') &&
        new Date(`${request.startDate}T00:00:00`) <= limit &&
        request.startDate >= HR_TODAY,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export interface PeopleMoment {
  id: string
  employeeId: string
  name: string
  detail: string
  date: string
  type: 'birthday' | 'anniversary' | 'interview' | 'joining'
}

function nextOccurrence(value: string, today: Date): string | null {
  if (!value) return null
  const source = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(source.getTime())) return null
  const candidate = new Date(today.getFullYear(), source.getMonth(), source.getDate())
  if (candidate.getTime() < today.getTime()) candidate.setFullYear(candidate.getFullYear() + 1)
  return `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`
}

export function peopleMoments(state: HRDataState, days = 30): PeopleMoment[] {
  const today = new Date(`${HR_TODAY}T00:00:00`)
  const limit = new Date(today)
  limit.setDate(limit.getDate() + days)
  const moments: PeopleMoment[] = []
  state.employees.forEach((employee) => {
    const birthday = nextOccurrence(employee.dateOfBirth, today)
    if (birthday && birthday <= `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`) {
      moments.push({
        id: `birthday-${employee.employeeId}`,
        employeeId: employee.employeeId,
        name: employee.name,
        detail: `${employee.designation} · ${employee.department}`,
        date: birthday,
        type: 'birthday',
      })
    }
    const anniversary = nextOccurrence(employee.workAnniversary, today)
    if (anniversary && anniversary >= HR_TODAY) {
      const years = new Date(anniversary).getFullYear() - new Date(employee.workAnniversary).getFullYear()
      if (years > 0) {
        moments.push({
          id: `anniversary-${employee.employeeId}`,
          employeeId: employee.employeeId,
          name: employee.name,
          detail: `${years} year${years === 1 ? '' : 's'} with Totally ERP`,
          date: anniversary,
          type: 'anniversary',
        })
      }
    }
  })
  state.interviews
    .filter((interview) => interview.status === 'Scheduled' && interview.interviewDate <= `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`)
    .forEach((interview) => {
      moments.push({
        id: `interview-${interview.id}`,
        employeeId: interview.candidateId,
        name: interview.candidateName,
        detail: `${interview.position} interview · ${interview.interviewer} · ${interview.mode}`,
        date: interview.interviewDate,
        type: 'interview',
      })
    })
  state.onboarding.forEach((record) => {
    if (record.startDate >= HR_TODAY) {
      moments.push({
        id: `joining-${record.id}`,
        employeeId: record.employeeId,
        name: record.name,
        detail: `${record.position} joining ${record.department}`,
        date: record.startDate,
        type: 'joining',
      })
    }
  })
  return moments.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12)
}

export interface PendingHRTask {
  id: string
  title: string
  detail: string
  module: string
  priority: 'High' | 'Normal' | 'Low'
  href: string
  count?: number
}

export function pendingHRTasks(state: HRDataState): PendingHRTask[] {
  const pendingLeaves = state.leaveRequests.filter((request) => request.status === 'Pending')
  const pendingCorrections = state.correctionRequests.filter((request) => request.status === 'Pending')
  const pendingRequests = state.employeeRequests.filter((request) =>
    ['Pending', 'In Progress'].includes(request.status),
  )
  const onboardingDocs = state.documents.filter((document) => document.status === 'Pending')
  const openInterviews = state.interviews.filter((interview) => interview.status === 'Scheduled')
  const payroll = state.payrolls.find((item) => item.status === 'Pending' || item.status === 'Prepared')
  const tasks: PendingHRTask[] = []
  if (pendingLeaves.length) {
    tasks.push({
      id: 'leaves',
      title: 'Review pending leave requests',
      detail: `${pendingLeaves.length} request${pendingLeaves.length === 1 ? '' : 's'} awaiting a decision`,
      module: 'leave',
      priority: 'High',
      href: '/hr/leave',
      count: pendingLeaves.length,
    })
  }
  if (pendingCorrections.length) {
    tasks.push({
      id: 'corrections',
      title: 'Authorise attendance corrections',
      detail: `${pendingCorrections.length} correction${pendingCorrections.length === 1 ? '' : 's'} awaiting review`,
      module: 'attendance',
      priority: 'High',
      href: '/hr/attendance',
      count: pendingCorrections.length,
    })
  }
  if (onboardingDocs.length) {
    tasks.push({
      id: 'documents',
      title: 'Verify onboarding documents',
      detail: `${onboardingDocs.length} document${onboardingDocs.length === 1 ? '' : 's'} pending verification`,
      module: 'onboarding',
      priority: 'Normal',
      href: '/hr/onboarding',
      count: onboardingDocs.length,
    })
  }
  if (openInterviews.length) {
    tasks.push({
      id: 'interviews',
      title: 'Prepare upcoming interviews',
      detail: `${openInterviews.length} interview${openInterviews.length === 1 ? '' : 's'} scheduled`,
      module: 'recruitment',
      priority: 'Normal',
      href: '/hr/recruitment',
      count: openInterviews.length,
    })
  }
  if (payroll) {
    tasks.push({
      id: 'payroll',
      title: payroll.status === 'Pending' ? 'Prepare this month payroll' : 'Send payroll to Finance',
      detail: payroll.status === 'Pending' ? 'Verify attendance and leave before preparation' : 'Finance retains payment processing',
      module: 'payroll',
      priority: 'Normal',
      href: '/hr/payroll',
    })
  }
  if (pendingRequests.length) {
    tasks.push({
      id: 'requests',
      title: 'Resolve employee requests',
      detail: `${pendingRequests.length} request${pendingRequests.length === 1 ? '' : 's'} open`,
      module: 'requests',
      priority: 'Low',
      href: '/hr/requests',
      count: pendingRequests.length,
    })
  }
  const order = { High: 0, Normal: 1, Low: 2 }
  return tasks.sort((a, b) => order[a.priority] - order[b.priority])
}

export function averageRating(reviews: HRPerformanceReview[]): number {
  const ratings = reviews
    .map((review) => review.hrRating ?? review.managerRating ?? review.selfRating)
    .filter((rating): rating is number => typeof rating === 'number')
  if (!ratings.length) return 0
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
}

export function reviewScore(review: HRPerformanceReview): number | null {
  return review.hrRating ?? review.managerRating ?? review.selfRating
}

export function payrollVerification(state: HRDataState, monthKey: string) {
  const records = state.attendance.filter((record) => record.date.startsWith(monthKey))
  const presentDays = records.filter((record) => ['Present', 'Late'].includes(record.status)).length
  const absentDays = records.filter((record) => record.status === 'Absent').length
  const leaveDays = state.leaveRequests
    .filter((request) => request.status === 'Approved' && request.startDate.startsWith(monthKey))
    .reduce((sum, request) => sum + request.days, 0)
  const unpaidDays = state.leaveRequests
    .filter(
      (request) =>
        request.status === 'Approved' &&
        request.leaveType === 'Unpaid Leave' &&
        request.startDate.startsWith(monthKey),
    )
    .reduce((sum, request) => sum + request.days, 0)
  const corrections = state.correctionRequests.filter(
    (request) => request.date.startsWith(monthKey) && request.status === 'Approved',
  ).length
  return {
    presentDays,
    absentDays,
    leaveDays,
    unpaidDays,
    corrections,
    duplicateAdjustments: 0,
  }
}

export function maskMoney(value: number, masked: boolean): string {
  return masked ? '••••••' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

export function relativeTime(value: string): string {
  const then = new Date(value).getTime()
  const now = Date.now()
  const minutes = Math.max(0, Math.floor((now - then) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDateLong(value)
}
