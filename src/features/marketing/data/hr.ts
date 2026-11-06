/* ============================================================
   Totally ERP — HR workspace seed data
   The employee directory is derived from the existing marketing
   department roster plus the existing HR employee records, so the
   HR workspace reads the same ERP people rather than a new system.
   ============================================================ */

import { MARKETING_EMPLOYEES } from './marketingDepartment'
import { dateOnlyFromNow, toISODate } from '../utils/dates'
import type {
  HRDataState,
  HRAttendanceRecord,
  HRLeaveRequest,
  HRLeaveBalance,
  HRPayroll,
  HRPayrollLine,
  HRPerformanceReview,
  HREmployee,
  HREmploymentType,
  HREmployeeStatus,
  HRHoliday,
  HRCandidate,
  HRJobOpening,
  HRInterview,
  HRDocument,
  HROnboarding,
  HREmployeeRequest,
  HROffboarding,
  HRCorrectionRequest,
  HRActivityEntry,
  HRReviewTemplate,
  HRDepartment,
  HRDesignation,
  HRWorkingHours,
  HRAttendancePolicy,
  HRLeavePolicy,
} from '../types/hr'

const today = dateOnlyFromNow(0)

function monthKey(offset = 0): string {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(offset = 0): string {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() + offset)
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(date)
}

function dayInMonth(month: string, day: number): string {
  const [year, m] = month.split('-').map(Number)
  const last = new Date(year, m, 0).getDate()
  const safeDay = Math.min(day, last)
  return `${month}-${String(safeDay).padStart(2, '0')}`
}

function dateOfBirthIn(daysAhead: number, year: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + daysAhead)
  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isWorkingDate(dateStr: string): boolean {
  const day = new Date(`${dateStr}T00:00:00`).getDay()
  return day !== 0 && day !== 6
}

function minutesFromTime(time: string | null): number {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

function timeFromMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function isDateWithin(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function includesWeekend(dateStr: string): boolean {
  return !isWorkingDate(dateStr)
}

/* ------------------------------------------------------------------
   Employee directory
   ------------------------------------------------------------------ */

const BASE_HR_EMPLOYEES: Array<{
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
  salary: number
  dateOfBirth: string
  skills: string[]
}> = [
  {
    employeeId: 'TOT-EMP-0101',
    name: 'Karan Singh',
    email: 'karan.singh@totallyerp.demo',
    phone: '+91 98765 43210',
    department: 'Operations',
    designation: 'Operations Executive',
    reportingManager: 'Meera Iyer',
    employmentType: 'Full Time',
    joiningDate: dateOnlyFromNow(-880),
    status: 'Active',
    location: 'Bengaluru, India',
    salary: 62000,
    dateOfBirth: dateOfBirthIn(2, 1991),
    skills: ['Operations', 'Vendor management', 'Process control'],
  },
  {
    employeeId: 'TOT-EMP-0201',
    name: 'Priya Patel',
    email: 'priya.patel@totallyerp.demo',
    phone: '+91 98765 43211',
    department: 'Sales',
    designation: 'Sales Executive',
    reportingManager: 'Meera Iyer',
    employmentType: 'Full Time',
    joiningDate: dateOnlyFromNow(-620),
    status: 'Active',
    location: 'Ahmedabad, India',
    salary: 58000,
    dateOfBirth: dateOfBirthIn(18, 1993),
    skills: ['Inside sales', 'CRM', 'Customer success'],
  },
  {
    employeeId: 'TOT-EMP-0301',
    name: 'Rahul Kumar',
    email: 'rahul.kumar@totallyerp.demo',
    phone: '+91 98765 43212',
    department: 'Marketing',
    designation: 'Marketing Executive',
    reportingManager: 'Meera Iyer',
    employmentType: 'Full Time',
    joiningDate: dateOnlyFromNow(-430),
    status: 'Active',
    location: 'Delhi NCR, India',
    salary: 54000,
    dateOfBirth: dateOfBirthIn(9, 1994),
    skills: ['Campaigns', 'Content', 'Market research'],
  },
  {
    employeeId: 'TOT-HR-0001',
    name: 'Nisha Verma',
    email: 'nisha.verma@totallyerp.demo',
    phone: '+91 98765 43213',
    department: 'Human Resources',
    designation: 'HR Manager',
    reportingManager: 'Meera Iyer',
    employmentType: 'Full Time',
    joiningDate: dateOnlyFromNow(-1340),
    status: 'Active',
    location: 'Bengaluru, India',
    salary: 142000,
    dateOfBirth: dateOfBirthIn(27, 1988),
    skills: ['HR operations', 'Talent acquisition', 'Employee relations'],
  },
  {
    employeeId: 'FIN-0101',
    name: 'Priya Sharma',
    email: 'priya.sharma@totallyerp.demo',
    phone: '+91 98765 43214',
    department: 'Finance',
    designation: 'Finance Manager',
    reportingManager: 'Meera Iyer',
    employmentType: 'Full Time',
    joiningDate: dateOnlyFromNow(-1200),
    status: 'Active',
    location: 'Bengaluru, India',
    salary: 156000,
    dateOfBirth: dateOfBirthIn(-12, 1987),
    skills: ['Payroll', 'Financial controls', 'Compliance'],
  },
  {
    employeeId: 'TOT-EMP-0401',
    name: 'Amit Singh',
    email: 'amit.singh@totallyerp.demo',
    phone: '+91 98765 43215',
    department: 'Operations',
    designation: 'Operations Associate',
    reportingManager: 'Karan Singh',
    employmentType: 'Full Time',
    joiningDate: dateOnlyFromNow(-4),
    status: 'Onboarding',
    location: 'Jaipur, India',
    salary: 38000,
    dateOfBirth: dateOfBirthIn(6, 1998),
    skills: ['Logistics', 'Documentation'],
  },
  {
    employeeId: 'TOT-MKT-0471',
    name: 'Meghna Rao',
    email: 'meghna.rao@totallyerp.demo',
    phone: '+91 98860 20471',
    department: 'Digital Marketing',
    designation: 'Performance Marketing Associate',
    reportingManager: 'Kavya Nair',
    employmentType: 'Full Time',
    joiningDate: dateOnlyFromNow(-2),
    status: 'Onboarding',
    location: 'Mumbai, India',
    salary: 42000,
    dateOfBirth: dateOfBirthIn(-6, 1997),
    skills: ['Meta ads', 'Reporting', 'Creative testing'],
  },
  {
    employeeId: 'TOT-MKT-0482',
    name: 'Tanvi Deshpande',
    email: 'tanvi.deshpande@totallyerp.demo',
    phone: '+91 98860 20482',
    department: 'Trade & Retail',
    designation: 'Trade Marketing Associate',
    reportingManager: 'Arjun Desai',
    employmentType: 'Contract',
    joiningDate: dateOnlyFromNow(3),
    status: 'Onboarding',
    location: 'Pune, India',
    salary: 36000,
    dateOfBirth: dateOfBirthIn(11, 1996),
    skills: ['Retail activation', 'Merchandising'],
  },
]

const marketingDepartmentMap: Record<string, string> = {
  'SEC-FIELD': 'Field Marketing',
  'SEC-DIGITAL': 'Digital Marketing',
  'SEC-TRADE': 'Trade & Retail',
  'SEC-LEAD': 'Lead Generation',
  'SEC-CAMP': 'Campaigns',
}

function salaryFor(designation: string, role: string, index: number): number {
  if (role === 'manager') return 168000
  if (designation.toLowerCase().includes('senior')) return 96000 + (index % 3) * 4000
  if (designation.toLowerCase().includes('lead')) return 88000
  if (role === 'junior') return 44000 + (index % 4) * 2000
  return 52000 + (index % 3) * 2500
}

function employeeStatusFor(index: number): HREmployeeStatus {
  return index % 13 === 0 ? 'Active' : 'Active'
}

function buildDirectory(): HREmployee[] {
  const records: HREmployee[] = []
  const seen = new Set<string>()

  BASE_HR_EMPLOYEES.forEach((employee) => {
    seen.add(employee.email.toLowerCase())
    records.push({
      id: employee.employeeId,
      ...employee,
      workAnniversary: employee.joiningDate,
      bankAccount: `•••• ${String(4000 + records.length).slice(-4)}`,
      emergencyContact: '+91 90000 00000',
    })
  })

  MARKETING_EMPLOYEES.forEach((employee, index) => {
    const email = employee.email.toLowerCase()
    if (seen.has(email)) return
    seen.add(email)
    const reportingManager =
      employee.role === 'manager'
        ? 'Board'
        : employee.seniorId
          ? MARKETING_EMPLOYEES.find((item) => item.id === employee.seniorId)?.name ?? 'Meera Iyer'
          : 'Meera Iyer'
    records.push({
      id: employee.id,
      employeeId: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: marketingDepartmentMap[employee.sectorId ?? ''] ?? 'Marketing',
      designation: employee.designation,
      reportingManager,
      employmentType: index === 8 ? 'Contract' : index === 5 ? 'Intern' : 'Full Time',
      joiningDate: employee.joinDate,
      status: employeeStatusFor(index),
      location: employee.location,
      dateOfBirth: dateOfBirthIn((index * 5) % 40 - 12, 1988 + (index % 8)),
      workAnniversary: employee.joinDate,
      salary: salaryFor(employee.designation, employee.role, index),
      bankAccount: `•••• ${String(5200 + index).slice(-4)}`,
      emergencyContact: '+91 90000 00000',
      skills: employee.skills.length ? employee.skills : ['Marketing', 'Execution'],
    })
  })

  return records
}

/* ------------------------------------------------------------------
   Leave requests, policies and balances
   ------------------------------------------------------------------ */

const leavePolicies: HRLeavePolicy[] = [
  {
    id: 'lp-1',
    leaveType: 'Casual Leave',
    annualQuota: 12,
    carryForward: 3,
    paid: true,
    approval: 'Reporting manager',
    description: 'Personal errands and short breaks. Apply at least one day in advance where possible.',
  },
  {
    id: 'lp-2',
    leaveType: 'Sick Leave',
    annualQuota: 8,
    carryForward: 0,
    paid: true,
    approval: 'Reporting manager',
    description: 'Medical appointments and recovery. A medical note is required for three or more days.',
  },
  {
    id: 'lp-3',
    leaveType: 'Earned Leave',
    annualQuota: 15,
    carryForward: 5,
    paid: true,
    approval: 'HR Manager',
    description: 'Planned time off accrued monthly. Carry-forward is capped at five days.',
  },
  {
    id: 'lp-4',
    leaveType: 'Work From Home',
    annualQuota: 10,
    carryForward: 0,
    paid: true,
    approval: 'Reporting manager',
    description: 'Remote working days. Attendance is recorded against the approved WFH request.',
  },
  {
    id: 'lp-5',
    leaveType: 'Unpaid Leave',
    annualQuota: 0,
    carryForward: 0,
    paid: false,
    approval: 'HR Manager',
    description: 'Used only when paid balances are exhausted. Feeds payroll as a single loss-of-pay adjustment.',
  },
]

function buildLeaveRequests(employees: HREmployee[]): HRLeaveRequest[] {
  const byName = (name: string) => employees.find((employee) => employee.name === name)
  const requests: Array<Omit<HRLeaveRequest, 'id' | 'employeeId' | 'employeeName' | 'department'>> = [
    {
      leaveType: 'Casual Leave',
      startDate: today,
      endDate: today,
      days: 1,
      reason: 'Personal errand and family commitment.',
      status: 'Approved',
      requestDate: dateOnlyFromNow(-5),
      reviewer: 'Meera Iyer',
      reviewerRemarks: 'Approved. Handover shared with the sector team.',
      decidedAt: dateOnlyFromNow(-4),
    },
    {
      leaveType: 'Sick Leave',
      startDate: today,
      endDate: dateOnlyFromNow(1),
      days: 2,
      reason: 'Fever and doctor-advised rest.',
      status: 'Approved',
      requestDate: dateOnlyFromNow(-1),
      reviewer: 'Nisha Verma',
      reviewerRemarks: 'Approved on medical grounds. Update project status.',
      decidedAt: dateOnlyFromNow(0),
    },
    {
      leaveType: 'Sick Leave',
      startDate: dateOnlyFromNow(2),
      endDate: dateOnlyFromNow(3),
      days: 2,
      reason: 'Scheduled dental procedure.',
      status: 'Pending',
      requestDate: dateOnlyFromNow(-2),
      reviewer: null,
      reviewerRemarks: '',
      decidedAt: null,
    },
    {
      leaveType: 'Earned Leave',
      startDate: dateOnlyFromNow(5),
      endDate: dateOnlyFromNow(8),
      days: 4,
      reason: 'Family holiday booked earlier this year.',
      status: 'Pending',
      requestDate: dateOnlyFromNow(-1),
      reviewer: null,
      reviewerRemarks: '',
      decidedAt: null,
    },
    {
      leaveType: 'Casual Leave',
      startDate: dateOnlyFromNow(-10),
      endDate: dateOnlyFromNow(-9),
      days: 2,
      reason: 'House shifting.',
      status: 'Approved',
      requestDate: dateOnlyFromNow(-13),
      reviewer: 'Rohit Menon',
      reviewerRemarks: 'Approved with team coverage confirmed.',
      decidedAt: dateOnlyFromNow(-12),
    },
    {
      leaveType: 'Work From Home',
      startDate: dateOnlyFromNow(1),
      endDate: dateOnlyFromNow(1),
      days: 1,
      reason: 'Home internet installation.',
      status: 'Pending',
      requestDate: dateOnlyFromNow(0),
      reviewer: null,
      reviewerRemarks: '',
      decidedAt: null,
    },
    {
      leaveType: 'Earned Leave',
      startDate: dateOnlyFromNow(10),
      endDate: dateOnlyFromNow(12),
      days: 3,
      reason: 'Family function out of town.',
      status: 'Approved',
      requestDate: dateOnlyFromNow(-8),
      reviewer: 'Meera Iyer',
      reviewerRemarks: 'Approved. Ensure claim handover before travel.',
      decidedAt: dateOnlyFromNow(-7),
    },
    {
      leaveType: 'Sick Leave',
      startDate: dateOnlyFromNow(14),
      endDate: dateOnlyFromNow(15),
      days: 2,
      reason: 'Medical follow-up appointment.',
      status: 'Pending',
      requestDate: dateOnlyFromNow(-1),
      reviewer: null,
      reviewerRemarks: '',
      decidedAt: null,
    },
    {
      leaveType: 'Casual Leave',
      startDate: dateOnlyFromNow(-20),
      endDate: dateOnlyFromNow(-20),
      days: 1,
      reason: 'Personal work.',
      status: 'Approved',
      requestDate: dateOnlyFromNow(-22),
      reviewer: 'Meera Iyer',
      reviewerRemarks: 'Approved.',
      decidedAt: dateOnlyFromNow(-21),
    },
    {
      leaveType: 'Earned Leave',
      startDate: dateOnlyFromNow(20),
      endDate: dateOnlyFromNow(21),
      days: 2,
      reason: 'Short break after campaign launch.',
      status: 'Approved',
      requestDate: dateOnlyFromNow(-6),
      reviewer: 'Nisha Verma',
      reviewerRemarks: 'Approved subject to launch checklist completion.',
      decidedAt: dateOnlyFromNow(-5),
    },
    {
      leaveType: 'Unpaid Leave',
      startDate: dateOnlyFromNow(-30),
      endDate: dateOnlyFromNow(-28),
      days: 3,
      reason: 'Extended personal leave after paid balance was exhausted.',
      status: 'Approved',
      requestDate: dateOnlyFromNow(-35),
      reviewer: 'Nisha Verma',
      reviewerRemarks: 'Approved as unpaid. One payroll adjustment only.',
      decidedAt: dateOnlyFromNow(-34),
    },
    {
      leaveType: 'Sick Leave',
      startDate: dateOnlyFromNow(-5),
      endDate: dateOnlyFromNow(-5),
      days: 1,
      reason: 'Unwell.',
      status: 'Rejected',
      requestDate: dateOnlyFromNow(-6),
      reviewer: 'Rohit Menon',
      reviewerRemarks: 'No leave balance available. Please apply unpaid leave if required.',
      decidedAt: dateOnlyFromNow(-6),
    },
    {
      leaveType: 'Casual Leave',
      startDate: dateOnlyFromNow(7),
      endDate: dateOnlyFromNow(7),
      days: 1,
      reason: 'Parent-teacher meeting.',
      status: 'Pending',
      requestDate: dateOnlyFromNow(0),
      reviewer: null,
      reviewerRemarks: '',
      decidedAt: null,
    },
  ]

  const names = [
    'Ananya Rao',
    'Rahul Kumar',
    'Priya Patel',
    'Vikram Shetty',
    'Rohan Mehta',
    'Kavya Nair',
    'Karan Singh',
    'Isha Verma',
    'Neha Kapoor',
    'Aarav Joshi',
    'Diya Malhotra',
    'Kabir Shah',
    'Priya Sharma',
  ]

  return requests.map((request, index) => {
    const employee = byName(names[index]) ?? employees[index % employees.length]
    return {
      id: `leave-${index + 1}`,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department,
      ...request,
    }
  })
}

function buildLeaveBalances(employees: HREmployee[], requests: HRLeaveRequest[]): HRLeaveBalance[] {
  const types = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Work From Home']
  const balances: HRLeaveBalance[] = []
  employees.forEach((employee) => {
    types.forEach((leaveType) => {
      const policy = leavePolicies.find((item) => item.leaveType === leaveType)
      const employeeRequests = requests.filter(
        (request) => request.employeeId === employee.employeeId && request.leaveType === leaveType,
      )
      const used = employeeRequests
        .filter((request) => request.status === 'Approved')
        .reduce((sum, request) => sum + request.days, 0)
      const pending = employeeRequests
        .filter((request) => request.status === 'Pending')
        .reduce((sum, request) => sum + request.days, 0)
      balances.push({
        id: `${employee.employeeId}-${leaveType}`,
        employeeId: employee.employeeId,
        employeeName: employee.name,
        leaveType,
        entitled: policy?.annualQuota ?? 0,
        used,
        pending,
      })
    })
  })
  return balances
}

/* ------------------------------------------------------------------
   Attendance and corrections
   ------------------------------------------------------------------ */

function buildAttendance(employees: HREmployee[], requests: HRLeaveRequest[], holidays: HRHoliday[]): HRAttendanceRecord[] {
  const records: HRAttendanceRecord[] = []
  const holidayDates = new Set(holidays.map((holiday) => holiday.date))
  const workingEmployees = employees.filter((employee) => employee.status === 'Active' || employee.status === 'On Leave')
  const dates: string[] = []
  for (let offset = -46; offset <= 0; offset += 1) {
    dates.push(dateOnlyFromNow(offset))
  }

  dates.forEach((date, dateIndex) => {
    const isToday = date === today
    if (!isToday && !isWorkingDate(date)) return
    const isHoliday = holidayDates.has(date)
    workingEmployees.forEach((employee, employeeIndex) => {
      const approvedLeave = requests.find(
        (request) =>
          request.employeeId === employee.employeeId &&
          request.status === 'Approved' &&
          isDateWithin(date, request.startDate, request.endDate),
      )
      const id = `att-${date}-${employee.employeeId}`
      if (isHoliday) {
        records.push({
          id,
          employeeId: employee.employeeId,
          employeeName: employee.name,
          department: employee.department,
          date,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          status: 'Holiday',
          lateMinutes: 0,
          source: 'Manual',
          note: holidays.find((holiday) => holiday.date === date)?.name,
        })
        return
      }
      if (approvedLeave) {
        if (approvedLeave.leaveType === 'Work From Home') {
          const start = minutesFromTime('09:00') + (employeeIndex % 4) * 5
          const end = minutesFromTime('18:00')
          records.push({
            id,
            employeeId: employee.employeeId,
            employeeName: employee.name,
            department: employee.department,
            date,
            checkIn: timeFromMinutes(start),
            checkOut: timeFromMinutes(end),
            workingHours: 8,
            status: 'Present',
            lateMinutes: 0,
            source: 'Manual',
            note: 'Approved work from home',
          })
          return
        }
        records.push({
          id,
          employeeId: employee.employeeId,
          employeeName: employee.name,
          department: employee.department,
          date,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          status: 'On Leave',
          lateMinutes: 0,
          source: 'Manual',
          note: approvedLeave.leaveType,
        })
        return
      }
      const seed = (employeeIndex * 7 + dateIndex * 13) % 100
      if (!isToday && seed < 5) {
        records.push({
          id,
          employeeId: employee.employeeId,
          employeeName: employee.name,
          department: employee.department,
          date,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          status: 'Absent',
          lateMinutes: 0,
          source: 'Biometric',
          note: 'No punch recorded',
        })
        return
      }
      const late = seed >= 88
      const startMinutes = late ? 9 * 60 + 25 + (seed % 30) : 9 * 60 + (seed % 14)
      const endMinutes = 18 * 60 + (seed % 18)
      const breakMinutes = 60
      const workingHours = Math.max(0, Math.round(((endMinutes - startMinutes - breakMinutes) / 60) * 10) / 10)
      records.push({
        id,
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department,
        date,
        checkIn: timeFromMinutes(startMinutes),
        checkOut: isToday && employeeIndex % 5 === 0 ? null : timeFromMinutes(endMinutes),
        workingHours: isToday && employeeIndex % 5 === 0 ? 0 : workingHours,
        status: late ? 'Late' : 'Present',
        lateMinutes: late ? startMinutes - (9 * 60 + 15) : 0,
        source: 'Biometric',
      })
    })
  })
  return records
}

function buildCorrections(employees: HREmployee[]): HRCorrectionRequest[] {
  const byName = (name: string) => employees.find((employee) => employee.name === name) ?? employees[0]
  const karan = byName('Karan Singh')
  const ananya = byName('Ananya Rao')
  const priya = byName('Priya Patel')
  return [
    {
      id: 'corr-1',
      attendanceId: `att-${today}-${karan.employeeId}`,
      employeeId: karan.employeeId,
      employeeName: karan.name,
      date: today,
      requestedCheckIn: '09:02',
      requestedCheckOut: '18:06',
      reason: 'Biometric device did not capture the morning punch.',
      status: 'Pending',
      requestedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      decidedBy: null,
      decidedAt: null,
      reviewNote: '',
    },
    {
      id: 'corr-2',
      attendanceId: `att-${dateOnlyFromNow(-1)}-${ananya.employeeId}`,
      employeeId: ananya.employeeId,
      employeeName: ananya.name,
      date: dateOnlyFromNow(-1),
      requestedCheckIn: '09:00',
      requestedCheckOut: '18:12',
      reason: 'Worked from the client site and could not use the office device.',
      status: 'Pending',
      requestedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      decidedBy: null,
      decidedAt: null,
      reviewNote: '',
    },
    {
      id: 'corr-3',
      attendanceId: `att-${dateOnlyFromNow(-2)}-${priya.employeeId}`,
      employeeId: priya.employeeId,
      employeeName: priya.name,
      date: dateOnlyFromNow(-2),
      requestedCheckIn: '09:10',
      requestedCheckOut: '18:20',
      reason: 'Late punch due to a customer call on the way in.',
      status: 'Approved',
      requestedAt: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
      decidedBy: 'Nisha Verma',
      decidedAt: new Date(Date.now() - 32 * 60 * 60 * 1000).toISOString(),
      reviewNote: 'Verified with the sales manager and corrected once in the attendance register.',
    },
  ]
}

/* ------------------------------------------------------------------
   Recruitment, documents and onboarding
   ------------------------------------------------------------------ */

const jobOpenings: HRJobOpening[] = [
  {
    id: 'job-1',
    jobTitle: 'Software Engineer',
    department: 'IT',
    designation: 'Software Engineer',
    vacancies: 2,
    employmentType: 'Full Time',
    hiringManager: 'Meera Iyer',
    openingDate: dateOnlyFromNow(-26),
    closingDate: dateOnlyFromNow(20),
    status: 'Open',
    location: 'Bengaluru, India',
    description: 'Build and maintain internal ERP modules and integrations.',
  },
  {
    id: 'job-2',
    jobTitle: 'Sales Executive',
    department: 'Sales',
    designation: 'Sales Executive',
    vacancies: 1,
    employmentType: 'Full Time',
    hiringManager: 'Priya Patel',
    openingDate: dateOnlyFromNow(-19),
    closingDate: dateOnlyFromNow(12),
    status: 'Open',
    location: 'Ahmedabad, India',
    description: 'Own the mid-market sales pipeline for the west region.',
  },
  {
    id: 'job-3',
    jobTitle: 'Performance Marketing Specialist',
    department: 'Digital Marketing',
    designation: 'Performance Marketing Specialist',
    vacancies: 1,
    employmentType: 'Full Time',
    hiringManager: 'Kavya Nair',
    openingDate: dateOnlyFromNow(-12),
    closingDate: dateOnlyFromNow(26),
    status: 'Open',
    location: 'Mumbai, India',
    description: 'Run paid acquisition across Meta, Google and marketplace channels.',
  },
  {
    id: 'job-4',
    jobTitle: 'HR Executive',
    department: 'Human Resources',
    designation: 'HR Executive',
    vacancies: 1,
    employmentType: 'Full Time',
    hiringManager: 'Nisha Verma',
    openingDate: dateOnlyFromNow(-8),
    closingDate: dateOnlyFromNow(30),
    status: 'Open',
    location: 'Bengaluru, India',
    description: 'Support onboarding, attendance and employee lifecycle operations.',
  },
  {
    id: 'job-5',
    jobTitle: 'Finance Analyst',
    department: 'Finance',
    designation: 'Finance Analyst',
    vacancies: 1,
    employmentType: 'Contract',
    hiringManager: 'Priya Sharma',
    openingDate: dateOnlyFromNow(-30),
    closingDate: dateOnlyFromNow(5),
    status: 'On Hold',
    location: 'Bengaluru, India',
    description: 'Payroll analytics and financial reporting support.',
  },
  {
    id: 'job-6',
    jobTitle: 'Graphic Designer',
    department: 'Marketing',
    designation: 'Graphic Designer',
    vacancies: 1,
    employmentType: 'Full Time',
    hiringManager: 'Meera Iyer',
    openingDate: dateOnlyFromNow(-60),
    closingDate: dateOnlyFromNow(-10),
    status: 'Closed',
    location: 'Pune, India',
    description: 'Brand and campaign creative design.',
  },
]

const candidates: HRCandidate[] = [
  {
    id: 'cand-1',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@example.com',
    phone: '+91 99999 11111',
    position: 'Software Engineer',
    jobId: 'job-1',
    stage: 'Interview',
    appliedDate: dateOnlyFromNow(-18),
    source: 'LinkedIn',
    experience: '4 years',
    resumeName: 'arjun-mehta-resume.pdf',
    feedback: 'Strong ERP integration experience. Technical round in progress.',
    rating: 4,
    offeredAmount: null,
  },
  {
    id: 'cand-2',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@example.com',
    phone: '+91 99999 22222',
    position: 'Sales Executive',
    jobId: 'job-2',
    stage: 'Applied',
    appliedDate: dateOnlyFromNow(-6),
    source: 'Employee referral',
    experience: '3 years',
    resumeName: 'sneha-reddy-resume.pdf',
    feedback: '',
    rating: null,
    offeredAmount: null,
  },
  {
    id: 'cand-3',
    name: 'Vikram Joshi',
    email: 'vikram.joshi@example.com',
    phone: '+91 99999 33333',
    position: 'Software Engineer',
    jobId: 'job-1',
    stage: 'Offer',
    appliedDate: dateOnlyFromNow(-22),
    source: 'Careers page',
    experience: '6 years',
    resumeName: 'vikram-joshi-resume.pdf',
    feedback: 'Excellent systems design. Offer approved by the hiring manager.',
    rating: 5,
    offeredAmount: 145000,
  },
  {
    id: 'cand-4',
    name: 'Ritika Sen',
    email: 'ritika.sen@example.com',
    phone: '+91 99999 44444',
    position: 'Performance Marketing Specialist',
    jobId: 'job-3',
    stage: 'Screening',
    appliedDate: dateOnlyFromNow(-4),
    source: 'LinkedIn',
    experience: '2 years',
    resumeName: 'ritika-sen-resume.pdf',
    feedback: 'Portfolio shortlisted for a screening call.',
    rating: null,
    offeredAmount: null,
  },
  {
    id: 'cand-5',
    name: 'Aman Gupta',
    email: 'aman.gupta@example.com',
    phone: '+91 99999 55555',
    position: 'HR Executive',
    jobId: 'job-4',
    stage: 'Applied',
    appliedDate: dateOnlyFromNow(-2),
    source: 'Naukri',
    experience: '2 years',
    resumeName: 'aman-gupta-resume.pdf',
    feedback: '',
    rating: null,
    offeredAmount: null,
  },
  {
    id: 'cand-6',
    name: 'Pooja Menon',
    email: 'pooja.menon@example.com',
    phone: '+91 99999 66666',
    position: 'Performance Marketing Specialist',
    jobId: 'job-3',
    stage: 'Interview',
    appliedDate: dateOnlyFromNow(-11),
    source: 'Agency referral',
    experience: '5 years',
    resumeName: 'pooja-menon-resume.pdf',
    feedback: 'Great paid media depth. Final panel scheduled.',
    rating: 4,
    offeredAmount: null,
  },
  {
    id: 'cand-7',
    name: 'Rahul Bansal',
    email: 'rahul.bansal@example.com',
    phone: '+91 99999 77777',
    position: 'Sales Executive',
    jobId: 'job-2',
    stage: 'Screening',
    appliedDate: dateOnlyFromNow(-8),
    source: 'Careers page',
    experience: '4 years',
    resumeName: 'rahul-bansal-resume.pdf',
    feedback: 'Strong west-region network. Screening completed.',
    rating: 3,
    offeredAmount: null,
  },
  {
    id: 'cand-8',
    name: 'Neeraj Kulkarni',
    email: 'neeraj.kulkarni@example.com',
    phone: '+91 99999 88888',
    position: 'Finance Analyst',
    jobId: 'job-5',
    stage: 'Rejected',
    appliedDate: dateOnlyFromNow(-15),
    source: 'Naukri',
    experience: '1 year',
    resumeName: 'neeraj-kulkarni-resume.pdf',
    feedback: 'Not enough payroll analytics experience for this role.',
    rating: 2,
    offeredAmount: null,
  },
  {
    id: 'cand-9',
    name: 'Ishita Kapoor',
    email: 'ishita.kapoor@example.com',
    phone: '+91 99999 99999',
    position: 'HR Executive',
    jobId: 'job-4',
    stage: 'Hired',
    appliedDate: dateOnlyFromNow(-24),
    source: 'Employee referral',
    experience: '3 years',
    resumeName: 'ishita-kapoor-resume.pdf',
    feedback: 'Offer accepted. Joining the HR operations team in the next cycle.',
    rating: 5,
    offeredAmount: 62000,
  },
]

const interviews: HRInterview[] = [
  {
    id: 'int-1',
    candidateId: 'cand-1',
    candidateName: 'Arjun Mehta',
    position: 'Software Engineer',
    interviewDate: dateOnlyFromNow(1),
    interviewTime: '10:00',
    interviewer: 'Meera Iyer',
    mode: 'Video',
    status: 'Scheduled',
    feedback: '',
  },
  {
    id: 'int-2',
    candidateId: 'cand-6',
    candidateName: 'Pooja Menon',
    position: 'Performance Marketing Specialist',
    interviewDate: dateOnlyFromNow(2),
    interviewTime: '14:30',
    interviewer: 'Kavya Nair',
    mode: 'In person',
    status: 'Scheduled',
    feedback: '',
  },
  {
    id: 'int-3',
    candidateId: 'cand-7',
    candidateName: 'Rahul Bansal',
    position: 'Sales Executive',
    interviewDate: dateOnlyFromNow(4),
    interviewTime: '11:15',
    interviewer: 'Priya Patel',
    mode: 'Phone',
    status: 'Scheduled',
    feedback: '',
  },
  {
    id: 'int-4',
    candidateId: 'cand-3',
    candidateName: 'Vikram Joshi',
    position: 'Software Engineer',
    interviewDate: dateOnlyFromNow(-3),
    interviewTime: '15:00',
    interviewer: 'Meera Iyer',
    mode: 'Video',
    status: 'Completed',
    feedback: 'Strong architecture and stakeholder communication.',
  },
]

function buildDocuments(employees: HREmployee[]): HRDocument[] {
  const records: HRDocument[] = []
  const names = ['Amit Singh', 'Meghna Rao', 'Tanvi Deshpande', 'Ananya Rao', 'Rahul Kumar']
  const types = ['Offer letter', 'ID proof', 'Education certificate', 'Previous employment letter', 'PAN card']
  names.forEach((name, employeeIndex) => {
    const employee = employees.find((item) => item.name === name) ?? employees[employeeIndex]
    types.forEach((type, typeIndex) => {
      const status: HRDocument['status'] =
        employee.status === 'Onboarding' && typeIndex > 1
          ? 'Pending'
          : typeIndex === 3 && employeeIndex === 4
            ? 'Rejected'
            : 'Verified'
      records.push({
        id: `doc-${employeeIndex + 1}-${typeIndex + 1}`,
        employeeId: employee.employeeId,
        employeeName: employee.name,
        name: `${name.replace(/\s+/g, '-').toLowerCase()}-${type.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        type,
        uploadedAt: dateOnlyFromNow(-typeIndex - 1),
        status,
      })
    })
  })
  return records
}

function buildOnboarding(employees: HREmployee[]): HROnboarding[] {
  const checklistLabels = [
    'Offer letter accepted',
    'Personal details submitted',
    'Employment documents uploaded',
    'Documents verified',
    'Department and reporting manager assigned',
    'ERP access configured',
    'Payroll and bank details added',
    'Day-one induction scheduled',
  ]
  return employees
    .filter((employee) => employee.status === 'Onboarding')
    .map((employee, index) => {
      const doneCount = Math.min(checklistLabels.length, 2 + index * 2)
      const checklist = checklistLabels.map((label, itemIndex) => ({
        id: `chk-${employee.employeeId}-${itemIndex + 1}`,
        label,
        done: itemIndex < doneCount,
      }))
      return {
        id: `onb-${employee.employeeId}`,
        employeeId: employee.employeeId,
        name: employee.name,
        position: employee.designation,
        department: employee.department,
        startDate: employee.joiningDate,
        buddy: employee.reportingManager,
        status: doneCount === checklistLabels.length ? 'Completed' : 'In Progress',
        checklist,
        completedAt: null,
      }
    })
}

/* ------------------------------------------------------------------
   Payroll
   ------------------------------------------------------------------ */

function buildPayrolls(employees: HREmployee[], requests: HRLeaveRequest[], attendance: HRAttendanceRecord[]): {
  payrolls: HRPayroll[]
  lines: HRPayrollLine[]
} {
  const periods = [-2, -1, 0]
  const statuses: HRPayroll['status'][] = ['Processed', 'Sent to Finance', 'Pending']
  const payrolls: HRPayroll[] = []
  const lines: HRPayrollLine[] = []
  const activeEmployees = employees.filter((employee) => employee.status !== 'Terminated')

  periods.forEach((offset, index) => {
    const key = monthKey(offset)
    const period = monthLabel(offset)
    const payrollId = `pay-${key}`
    let gross = 0
    let deductions = 0
    let net = 0
    activeEmployees.forEach((employee) => {
      const monthRecords = attendance.filter(
        (record) => record.employeeId === employee.employeeId && record.date.startsWith(key),
      )
      const attendanceDays = monthRecords.filter((record) => ['Present', 'Late'].includes(record.status)).length
      const approvedMonthLeaves = requests.filter(
        (request) =>
          request.employeeId === employee.employeeId &&
          request.status === 'Approved' &&
          request.startDate.startsWith(key),
      )
      const paidLeaveDays = approvedMonthLeaves
        .filter((request) => request.leaveType !== 'Unpaid Leave')
        .reduce((sum, request) => sum + request.days, 0)
      const unpaidLeaveDays = approvedMonthLeaves
        .filter((request) => request.leaveType === 'Unpaid Leave')
        .reduce((sum, request) => sum + request.days, 0)
      const base = employee.salary
      const allowances = Math.round(base * 0.24)
      const standardDeductions = Math.round(base * 0.12)
      const lossOfPay = Math.round((base / 22) * unpaidLeaveDays)
      const employeeNet = base + allowances - standardDeductions - lossOfPay
      gross += base + allowances
      deductions += standardDeductions + lossOfPay
      net += employeeNet
      lines.push({
        id: `line-${key}-${employee.employeeId}`,
        payrollId,
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department,
        base,
        allowances,
        deductions: standardDeductions,
        net: employeeNet,
        attendanceDays,
        paidLeaveDays,
        unpaidLeaveDays,
        lossOfPay,
        adjustmentKey: `${payrollId}-${employee.employeeId}`,
      })
    })
    payrolls.push({
      id: payrollId,
      period,
      monthKey: key,
      employeeCount: activeEmployees.length,
      status: statuses[index],
      gross,
      deductions,
      net,
      preparedBy: index === 2 ? null : 'Nisha Verma',
      preparedAt: index === 2 ? null : new Date().toISOString(),
      financeApprovedBy: index === 2 ? null : 'Priya Sharma',
      financeApprovedAt: index === 2 ? null : new Date().toISOString(),
      note:
        index === 2
          ? 'Attendance and approved leave are ready for verification before preparation.'
          : 'Prepared by HR. Payment processing remains with Finance.',
    })
  })

  return { payrolls, lines }
}

/* ------------------------------------------------------------------
   Performance
   ------------------------------------------------------------------ */

function buildPerformanceReviews(employees: HREmployee[]): HRPerformanceReview[] {
  const names = [
    'Ananya Rao',
    'Rohit Menon',
    'Kavya Nair',
    'Vikram Shetty',
    'Rohan Mehta',
    'Neha Kapoor',
    'Karan Singh',
    'Priya Patel',
    'Aarav Joshi',
    'Isha Verma',
  ]
  const statuses: HRPerformanceReview['status'][] = [
    'Pending Self Assessment',
    'Manager Review',
    'Completed',
    'HR Review',
    'Self Assessment Submitted',
    'Pending Self Assessment',
    'Completed',
    'Manager Review',
    'Completed',
    'Self Assessment Submitted',
  ]
  const titles = [
    'Campaign lead target achievement',
    'Customer follow-up quality',
    'Quarterly pipeline contribution',
    'Execution discipline and timeliness',
    'Cross-team collaboration',
  ]
  return names.map((name, index) => {
    const employee = employees.find((item) => item.name === name) ?? employees[index % employees.length]
    const status = statuses[index]
    const selfRating = status === 'Pending Self Assessment' ? null : 4 + (index % 2)
    const managerRating = ['Manager Review', 'HR Review', 'Completed'].includes(status)
      ? 3 + (index % 3)
      : null
    const hrRating = ['HR Review', 'Completed'].includes(status) ? 4 : null
    return {
      id: `pr-${index + 1}`,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department,
      designation: employee.designation,
      reviewPeriod: `H${(index % 2) + 1} ${new Date().getFullYear()}`,
      manager: employee.reportingManager,
      status,
      selfRating,
      managerRating,
      hrRating,
      goals: titles.map((title, goalIndex) => ({
        id: `goal-${index + 1}-${goalIndex + 1}`,
        title,
        weight: goalIndex === 0 ? 30 : 20,
        selfScore: selfRating ? Math.min(5, selfRating - (goalIndex % 2)) : null,
        managerScore: managerRating ? Math.min(5, managerRating - (goalIndex % 2)) : null,
        hrScore: hrRating ? Math.min(5, hrRating) : null,
        comment:
          goalIndex === 0 && status === 'Completed'
            ? 'Consistently met the target with good quality.'
            : '',
      })),
      selfComment:
        status === 'Pending Self Assessment'
          ? ''
          : 'I delivered the agreed goals and improved turnaround time on customer follow-ups.',
      managerComment: managerRating
        ? 'Strong delivery this cycle. Focus next on qualification quality and documentation.'
        : '',
      hrComment: hrRating ? 'Rating calibrated with the department scorecard.' : '',
      updatedAt: new Date(Date.now() - index * 36 * 60 * 60 * 1000).toISOString(),
    }
  })
}

/* ------------------------------------------------------------------
   Employee requests, offboarding and settings
   ------------------------------------------------------------------ */

function buildEmployeeRequests(employees: HREmployee[]): HREmployeeRequest[] {
  const byName = (name: string) => employees.find((employee) => employee.name === name) ?? employees[0]
  const definitions: Array<{
    name: string
    category: string
    subject: string
    description: string
    status: HREmployeeRequest['status']
    priority: HREmployeeRequest['priority']
    assignedTo: string
    resolutionNote: string
  }> = [
    {
      name: 'Karan Singh',
      category: 'Employment Certificate',
      subject: 'Employment certificate for a home loan',
      description: 'Need a stamped employment certificate with designation and annual salary.',
      status: 'Pending',
      priority: 'Normal',
      assignedTo: 'Nisha Verma',
      resolutionNote: '',
    },
    {
      name: 'Priya Patel',
      category: 'Experience Letter',
      subject: 'Experience letter for higher studies',
      description: 'Experience letter covering the full tenure with the sales team.',
      status: 'In Progress',
      priority: 'High',
      assignedTo: 'Nisha Verma',
      resolutionNote: 'Draft prepared, pending finance sign-off on the tenure dates.',
    },
    {
      name: 'Ananya Rao',
      category: 'Bank Details Update',
      subject: 'Update salary account',
      description: 'New salary account opened with the same bank. Cancelled cheque attached.',
      status: 'Pending',
      priority: 'Normal',
      assignedTo: 'Nisha Verma',
      resolutionNote: '',
    },
    {
      name: 'Rahul Kumar',
      category: 'Address Update',
      subject: 'Update residential address',
      description: 'Moved within Delhi NCR. Updated address proof uploaded.',
      status: 'Completed',
      priority: 'Low',
      assignedTo: 'Nisha Verma',
      resolutionNote: 'Address updated in the employee master and payroll records.',
    },
    {
      name: 'Vikram Shetty',
      category: 'ID Card',
      subject: 'Replacement access card',
      description: 'Access card lost. Requesting a replacement with the same access level.',
      status: 'In Progress',
      priority: 'High',
      assignedTo: 'Karan Singh',
      resolutionNote: 'Security has been informed and the old card is blocked.',
    },
    {
      name: 'Neha Kapoor',
      category: 'PF Query',
      subject: 'PF contribution mismatch',
      description: 'September PF contribution does not match the payslip deduction.',
      status: 'Pending',
      priority: 'Urgent',
      assignedTo: 'Priya Sharma',
      resolutionNote: '',
    },
    {
      name: 'Rohan Mehta',
      category: 'Document Request',
      subject: 'Salary slips for the last three months',
      description: 'Need signed salary slips for a rental application.',
      status: 'Completed',
      priority: 'Normal',
      assignedTo: 'Nisha Verma',
      resolutionNote: 'Salary slips generated from payroll and shared with the employee.',
    },
  ]
  return definitions.map((definition, index) => {
    const employee = byName(definition.name)
    return {
      id: `req-${index + 1}`,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department,
      category: definition.category,
      subject: definition.subject,
      description: definition.description,
      requestDate: dateOnlyFromNow(-index * 2 - 1),
      status: definition.status,
      priority: definition.priority,
      assignedTo: definition.assignedTo,
      resolutionNote: definition.resolutionNote,
      resolvedAt: definition.status === 'Completed' ? dateOnlyFromNow(-index) : null,
    }
  })
}

function buildOffboarding(employees: HREmployee[]): HROffboarding[] {
  const byName = (name: string) => employees.find((employee) => employee.name === name) ?? employees[0]
  const definitions: Array<{
    name: string
    resignationDate: string
    noticePeriodDays: number
    noticePeriodEnd: string
    lastWorkingDay: string
    reason: string
    exitInterviewDate: string | null
    exitInterviewStatus: HROffboarding['exitInterviewStatus']
    clearance: HROffboarding['clearance']
    finalSettlement: HROffboarding['finalSettlement']
    status: HROffboarding['status']
    note: string
  }> = [
    {
      name: 'Kabir Shah',
      resignationDate: dateOnlyFromNow(-8),
      noticePeriodDays: 30,
      noticePeriodEnd: dateOnlyFromNow(22),
      lastWorkingDay: dateOnlyFromNow(22),
      reason: 'Higher studies',
      exitInterviewDate: dateOnlyFromNow(16),
      exitInterviewStatus: 'Scheduled',
      clearance: { it: true, finance: false, manager: true, hr: false },
      finalSettlement: 'Pending',
      status: 'Clearance Pending',
      note: 'Exit interview scheduled. Finance clearance is pending the asset recovery note.',
    },
    {
      name: 'Isha Verma',
      resignationDate: dateOnlyFromNow(-2),
      noticePeriodDays: 45,
      noticePeriodEnd: dateOnlyFromNow(43),
      lastWorkingDay: dateOnlyFromNow(43),
      reason: 'Relocation',
      exitInterviewDate: null,
      exitInterviewStatus: 'Pending',
      clearance: { it: false, finance: false, manager: false, hr: false },
      finalSettlement: 'Pending',
      status: 'Pending Review',
      note: 'Manager acknowledgement pending. Notice period starts after acceptance.',
    },
    {
      name: 'Diya Malhotra',
      resignationDate: dateOnlyFromNow(-50),
      noticePeriodDays: 30,
      noticePeriodEnd: dateOnlyFromNow(-20),
      lastWorkingDay: dateOnlyFromNow(-20),
      reason: 'Career change',
      exitInterviewDate: dateOnlyFromNow(-28),
      exitInterviewStatus: 'Completed',
      clearance: { it: true, finance: true, manager: true, hr: true },
      finalSettlement: 'Sent to Finance',
      status: 'Completed',
      note: 'Exit interview completed. Final settlement prepared by HR and sent to Finance for payment.',
    },
  ]
  return definitions.map((definition, index) => {
    const employee = byName(definition.name)
    return {
      id: `off-${index + 1}`,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department,
      designation: employee.designation,
      resignationDate: definition.resignationDate,
      noticePeriodDays: definition.noticePeriodDays,
      noticePeriodEnd: definition.noticePeriodEnd,
      lastWorkingDay: definition.lastWorkingDay,
      reason: definition.reason,
      exitInterviewDate: definition.exitInterviewDate,
      exitInterviewStatus: definition.exitInterviewStatus,
      clearance: definition.clearance,
      finalSettlement: definition.finalSettlement,
      status: definition.status,
      manager: employee.reportingManager,
      note: definition.note,
    }
  })
}

const departments: HRDepartment[] = [
  { id: 'dept-1', name: 'Marketing', head: 'Meera Iyer', costCentre: 'CC-MKT-01' },
  { id: 'dept-2', name: 'Field Marketing', head: 'Rohit Menon', costCentre: 'CC-MKT-02' },
  { id: 'dept-3', name: 'Digital Marketing', head: 'Kavya Nair', costCentre: 'CC-MKT-03' },
  { id: 'dept-4', name: 'Trade & Retail', head: 'Arjun Desai', costCentre: 'CC-MKT-04' },
  { id: 'dept-5', name: 'Lead Generation', head: 'Sneha Pillai', costCentre: 'CC-MKT-05' },
  { id: 'dept-6', name: 'Sales', head: 'Priya Patel', costCentre: 'CC-SAL-01' },
  { id: 'dept-7', name: 'Human Resources', head: 'Nisha Verma', costCentre: 'CC-HR-01' },
  { id: 'dept-8', name: 'Finance', head: 'Priya Sharma', costCentre: 'CC-FIN-01' },
  { id: 'dept-9', name: 'Operations', head: 'Karan Singh', costCentre: 'CC-OPS-01' },
  { id: 'dept-10', name: 'IT', head: 'Meera Iyer', costCentre: 'CC-IT-01' },
]

const designations: HRDesignation[] = [
  { id: 'des-1', title: 'Marketing Manager', department: 'Marketing', level: 'M3' },
  { id: 'des-2', title: 'Senior Marketing Executive', department: 'Field Marketing', level: 'E3' },
  { id: 'des-3', title: 'Junior Marketing Executive', department: 'Marketing', level: 'E1' },
  { id: 'des-4', title: 'HR Manager', department: 'Human Resources', level: 'M2' },
  { id: 'des-5', title: 'Finance Manager', department: 'Finance', level: 'M2' },
  { id: 'des-6', title: 'Sales Executive', department: 'Sales', level: 'E2' },
  { id: 'des-7', title: 'Operations Executive', department: 'Operations', level: 'E2' },
  { id: 'des-8', title: 'Software Engineer', department: 'IT', level: 'E3' },
]

const attendancePolicies: HRAttendancePolicy[] = [
  {
    id: 'pol-1',
    name: 'Corporate Standard',
    department: 'All departments',
    checkIn: '09:00',
    checkOut: '18:00',
    graceMinutes: 15,
    fullDayHours: 8,
    halfDayHours: 4,
    workingDays: 'Monday to Friday',
    lateMarkAfter: '09:15',
  },
  {
    id: 'pol-2',
    name: 'Field Marketing',
    department: 'Field Marketing',
    checkIn: '09:30',
    checkOut: '18:30',
    graceMinutes: 20,
    fullDayHours: 8,
    halfDayHours: 4,
    workingDays: 'Monday to Saturday',
    lateMarkAfter: '09:50',
  },
  {
    id: 'pol-3',
    name: 'Digital & Support',
    department: 'Digital Marketing / IT',
    checkIn: '10:00',
    checkOut: '19:00',
    graceMinutes: 15,
    fullDayHours: 8,
    halfDayHours: 4,
    workingDays: 'Monday to Friday',
    lateMarkAfter: '10:15',
  },
]

const workingHours: HRWorkingHours[] = [
  {
    id: 'wh-1',
    name: 'Corporate standard',
    start: '09:00',
    end: '18:00',
    breakMinutes: 60,
    weeklyHours: 40,
    appliesTo: 'All departments',
  },
  {
    id: 'wh-2',
    name: 'Field shift',
    start: '09:30',
    end: '18:30',
    breakMinutes: 60,
    weeklyHours: 44,
    appliesTo: 'Field Marketing',
  },
  {
    id: 'wh-3',
    name: 'Digital shift',
    start: '10:00',
    end: '19:00',
    breakMinutes: 60,
    weeklyHours: 40,
    appliesTo: 'Digital Marketing / IT',
  },
]

const holidays: HRHoliday[] = [
  { id: 'hol-1', name: 'Company Foundation Day', date: dateOnlyFromNow(8), type: 'Company' },
  { id: 'hol-2', name: 'Diwali Holiday', date: dateOnlyFromNow(21), type: 'Public' },
  { id: 'hol-3', name: 'Year-end Company Break', date: dateOnlyFromNow(52), type: 'Company' },
  { id: 'hol-4', name: 'Independence Day', date: `${new Date().getFullYear()}-08-15`, type: 'Public' },
  { id: 'hol-5', name: 'Gandhi Jayanti', date: `${new Date().getFullYear()}-10-02`, type: 'Public' },
]

const reviewTemplates: HRReviewTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Annual Performance Review',
    cycle: 'Annual',
    sections: ['Goals', 'Competencies', 'Development plan'],
    ratingScale: '1 to 5',
    status: 'Active',
  },
  {
    id: 'tpl-2',
    name: 'Mid-year Check-in',
    cycle: 'Half year',
    sections: ['Goals', 'Manager feedback'],
    ratingScale: '1 to 5',
    status: 'Active',
  },
  {
    id: 'tpl-3',
    name: 'Probation Confirmation',
    cycle: 'Probation',
    sections: ['Role fit', 'Manager recommendation', 'HR decision'],
    ratingScale: 'Meets / Exceeds',
    status: 'Active',
  },
]

const employmentTypes: HRDataState['employmentTypes'] = [
  { id: 'et-1', name: 'Full Time', description: 'Permanent payroll employee', active: true },
  { id: 'et-2', name: 'Part Time', description: 'Fixed part-time schedule', active: true },
  { id: 'et-3', name: 'Contract', description: 'Fixed-term contract with an end date', active: true },
  { id: 'et-4', name: 'Intern', description: 'Internship or trainee engagement', active: true },
]

/* ------------------------------------------------------------------
   Activity
   ------------------------------------------------------------------ */

function buildActivity(): HRActivityEntry[] {
  const definitions: Array<{
    actor: string
    action: string
    detail: string
    module: HRActivityEntry['module']
    tone: HRActivityEntry['tone']
    hoursAgo: number
  }> = [
    {
      actor: 'Meera Iyer',
      action: 'Approved leave request',
      detail: 'Ananya Rao · Casual Leave · 1 day',
      module: 'leave',
      tone: 'success',
      hoursAgo: 2,
    },
    {
      actor: 'Nisha Verma',
      action: 'Scheduled an interview',
      detail: 'Arjun Mehta · Software Engineer · tomorrow at 10:00',
      module: 'recruitment',
      tone: 'info',
      hoursAgo: 4,
    },
    {
      actor: 'Karan Singh',
      action: 'Raised an attendance correction',
      detail: 'Missing morning punch · awaiting review',
      module: 'attendance',
      tone: 'warning',
      hoursAgo: 6,
    },
    {
      actor: 'Amit Singh',
      action: 'Completed onboarding step',
      detail: 'Employment documents uploaded',
      module: 'onboarding',
      tone: 'success',
      hoursAgo: 22,
    },
    {
      actor: 'Nisha Verma',
      action: 'Updated payroll preparation',
      detail: 'Current month attendance and leave verified',
      module: 'payroll',
      tone: 'info',
      hoursAgo: 30,
    },
    {
      actor: 'Priya Patel',
      action: 'Requested sick leave',
      detail: '2 days · dental procedure',
      module: 'leave',
      tone: 'warning',
      hoursAgo: 38,
    },
    {
      actor: 'Rohit Menon',
      action: 'Submitted a manager review',
      detail: 'Vikram Shetty · H1 performance cycle',
      module: 'performance',
      tone: 'info',
      hoursAgo: 52,
    },
    {
      actor: 'Nisha Verma',
      action: 'Verified employee documents',
      detail: 'Meghna Rao · 3 documents verified',
      module: 'employees',
      tone: 'success',
      hoursAgo: 70,
    },
    {
      actor: 'Kabir Shah',
      action: 'Resignation accepted',
      detail: 'Notice period ends in 22 days',
      module: 'offboarding',
      tone: 'neutral',
      hoursAgo: 92,
    },
    {
      actor: 'Kavya Nair',
      action: 'Added a new job opening',
      detail: 'Performance Marketing Specialist · Digital Marketing',
      module: 'recruitment',
      tone: 'info',
      hoursAgo: 110,
    },
    {
      actor: 'Priya Sharma',
      action: 'Finance approved payroll',
      detail: 'Previous month payroll approved for disbursement',
      module: 'payroll',
      tone: 'success',
      hoursAgo: 140,
    },
    {
      actor: 'Vikram Shetty',
      action: 'Raised an employee request',
      detail: 'Replacement access card · high priority',
      module: 'requests',
      tone: 'warning',
      hoursAgo: 166,
    },
  ]
  return definitions.map((definition, index) => ({
    id: `activity-${index + 1}`,
    at: new Date(Date.now() - definition.hoursAgo * 60 * 60 * 1000).toISOString(),
    actor: definition.actor,
    action: definition.action,
    detail: definition.detail,
    module: definition.module,
    tone: definition.tone,
  }))
}

/* ------------------------------------------------------------------
   Export seed builder
   ------------------------------------------------------------------ */

export function buildHRSeed(): HRDataState {
  const employees = buildDirectory()
  const leaveRequests = buildLeaveRequests(employees)
  const leaveBalances = buildLeaveBalances(employees, leaveRequests)
  const attendance = buildAttendance(employees, leaveRequests, holidays)
  const correctionRequests = buildCorrections(employees)
  const { payrolls, lines } = buildPayrolls(employees, leaveRequests, attendance)
  return {
    employees,
    attendance,
    leaveRequests,
    leaveBalances,
    leavePolicies,
    correctionRequests,
    attendancePolicies,
    holidays,
    jobOpenings,
    candidates,
    interviews,
    documents: buildDocuments(employees),
    onboarding: buildOnboarding(employees),
    payrolls,
    payrollLines: lines,
    performanceReviews: buildPerformanceReviews(employees),
    employeeRequests: buildEmployeeRequests(employees),
    offboarding: buildOffboarding(employees),
    departments,
    designations,
    employmentTypes,
    workingHours,
    reviewTemplates,
    activity: buildActivity(),
  }
}

export const HR_TODAY = today
export const HR_CURRENT_MONTH_KEY = monthKey(0)
export const HR_PREVIOUS_MONTH_KEY = monthKey(-1)
export const HR_MONTH_LABEL = monthLabel(0)

/** Utility exported for payroll and attendance pages. */
export function periodDays(month: string): string[] {
  const [year, m] = month.split('-').map(Number)
  const total = new Date(year, m, 0).getDate()
  return Array.from({ length: total }, (_, index) => dayInMonth(month, index + 1))
}

export function workingDaysInMonth(month: string): number {
  return periodDays(month).filter((date) => !includesWeekend(date)).length
}

export function monthFromDate(date: string): string {
  return date.slice(0, 7)
}

export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${date}T00:00:00`),
  )
}

export function currentTimeValue(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function isoToday(): string {
  return toISODate(new Date())
}
