import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { buildHRSeed, currentTimeValue, isoToday } from '../data/hr'
import { useDemoRole } from './DemoRoleContext'
import { useToast } from './ToastContext'
import { uid } from '../utils/format'
import { addDays, toISODate } from '../utils/dates'
import type {
  HRCandidate,
  HRCandidateDraft,
  HRCandidateStage,
  HRCorrectionDraft,
  HRCorrectionRequest,
  HRDataState,
  HRDocument,
  HREmployee,
  HREmployeeDraft,
  HREmployeeRequest,
  HREmployeeRequestDraft,
  HRInterview,
  HRInterviewDraft,
  HRJobDraft,
  HRJobOpening,
  HRLeaveDraft,
  HRLeaveRequest,
  HRModuleId,
  HROffboarding,
  HROffboardingDraft,
  HRPayrollLine,
  HRPerformanceReview,
  HRLeavePolicy,
  HRHoliday,
  HRReviewTemplate,
  HRAttendancePolicy,
} from '../types/hr'

const STORAGE_KEY = 'totally-erp-hr-v1'

interface HRDataContextValue extends HRDataState {
  resetHR: () => void
  addEmployee: (draft: HREmployeeDraft) => HREmployee
  updateEmployee: (id: string, patch: Partial<HREmployee>) => void
  markCheckIn: (employeeId: string) => void
  markCheckOut: (employeeId: string) => void
  requestCorrection: (draft: HRCorrectionDraft) => HRCorrectionRequest
  decideCorrection: (id: string, decision: 'Approved' | 'Rejected', note: string) => void
  submitLeave: (draft: HRLeaveDraft) => HRLeaveRequest
  decideLeave: (id: string, decision: 'Approved' | 'Rejected', remarks: string) => void
  addJob: (draft: HRJobDraft) => HRJobOpening
  updateJobStatus: (id: string, status: HRJobOpening['status']) => void
  addCandidate: (draft: HRCandidateDraft) => HRCandidate
  moveCandidateStage: (id: string, stage: HRCandidateStage) => void
  scheduleInterview: (draft: HRInterviewDraft) => HRInterview
  updateInterview: (id: string, patch: Partial<HRInterview>) => void
  hireCandidate: (id: string) => void
  toggleOnboardingItem: (recordId: string, itemId: string) => void
  completeOnboarding: (recordId: string) => void
  updateDocumentStatus: (id: string, status: HRDocument['status']) => void
  preparePayroll: (monthKey: string) => void
  sendPayrollToFinance: (payrollId: string) => void
  submitSelfAssessment: (id: string, rating: number, comment: string, goalScores: Record<string, number>) => void
  submitManagerReview: (id: string, rating: number, comment: string, goalScores: Record<string, number>) => void
  submitHRReview: (id: string, rating: number, comment: string, goalScores: Record<string, number>) => void
  addEmployeeRequest: (draft: HREmployeeRequestDraft) => HREmployeeRequest
  updateEmployeeRequest: (id: string, patch: Partial<HREmployeeRequest>) => void
  addOffboarding: (draft: HROffboardingDraft) => HROffboarding
  updateOffboarding: (id: string, patch: Partial<HROffboarding>) => void
  toggleClearance: (id: string, key: keyof HROffboarding['clearance']) => void
  sendSettlementToFinance: (id: string) => void
  addDepartment: (name: string, head: string, costCentre: string) => void
  removeDepartment: (id: string) => void
  addDesignation: (title: string, department: string, level: string) => void
  removeDesignation: (id: string) => void
  addHoliday: (holiday: Omit<HRHoliday, 'id'>) => void
  removeHoliday: (id: string) => void
  addLeavePolicy: (policy: Omit<HRLeavePolicy, 'id'>) => void
  removeLeavePolicy: (id: string) => void
  addAttendancePolicy: (policy: Omit<HRAttendancePolicy, 'id'>) => void
  removeAttendancePolicy: (id: string) => void
  addReviewTemplate: (template: Omit<HRReviewTemplate, 'id'>) => void
  removeReviewTemplate: (id: string) => void
}

const HRDataContext = createContext<HRDataContextValue | null>(null)

function hydrate(): HRDataState {
  const seed = buildHRSeed()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed
    const parsed = JSON.parse(raw) as Partial<HRDataState>
    if (!parsed || !Array.isArray(parsed.employees) || parsed.employees.length === 0) return seed
    return {
      employees: parsed.employees,
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance : seed.attendance,
      leaveRequests: Array.isArray(parsed.leaveRequests) ? parsed.leaveRequests : seed.leaveRequests,
      leaveBalances: Array.isArray(parsed.leaveBalances) ? parsed.leaveBalances : seed.leaveBalances,
      leavePolicies: Array.isArray(parsed.leavePolicies) ? parsed.leavePolicies : seed.leavePolicies,
      correctionRequests: Array.isArray(parsed.correctionRequests)
        ? parsed.correctionRequests
        : seed.correctionRequests,
      attendancePolicies: Array.isArray(parsed.attendancePolicies)
        ? parsed.attendancePolicies
        : seed.attendancePolicies,
      holidays: Array.isArray(parsed.holidays) ? parsed.holidays : seed.holidays,
      jobOpenings: Array.isArray(parsed.jobOpenings) ? parsed.jobOpenings : seed.jobOpenings,
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : seed.candidates,
      interviews: Array.isArray(parsed.interviews) ? parsed.interviews : seed.interviews,
      documents: Array.isArray(parsed.documents) ? parsed.documents : seed.documents,
      onboarding: Array.isArray(parsed.onboarding) ? parsed.onboarding : seed.onboarding,
      payrolls: Array.isArray(parsed.payrolls) ? parsed.payrolls : seed.payrolls,
      payrollLines: Array.isArray(parsed.payrollLines) ? parsed.payrollLines : seed.payrollLines,
      performanceReviews: Array.isArray(parsed.performanceReviews)
        ? parsed.performanceReviews
        : seed.performanceReviews,
      employeeRequests: Array.isArray(parsed.employeeRequests)
        ? parsed.employeeRequests
        : seed.employeeRequests,
      offboarding: Array.isArray(parsed.offboarding) ? parsed.offboarding : seed.offboarding,
      departments: Array.isArray(parsed.departments) ? parsed.departments : seed.departments,
      designations: Array.isArray(parsed.designations) ? parsed.designations : seed.designations,
      employmentTypes: Array.isArray(parsed.employmentTypes)
        ? parsed.employmentTypes
        : seed.employmentTypes,
      workingHours: Array.isArray(parsed.workingHours) ? parsed.workingHours : seed.workingHours,
      reviewTemplates: Array.isArray(parsed.reviewTemplates)
        ? parsed.reviewTemplates
        : seed.reviewTemplates,
      activity: Array.isArray(parsed.activity) ? parsed.activity : seed.activity,
    }
  } catch {
    return seed
  }
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime()
  const b = new Date(`${end}T00:00:00`).getTime()
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

export function HRDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HRDataState>(hydrate)
  const { profile } = useDemoRole()
  const { pushToast } = useToast()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore storage errors in private browsing */
    }
  }, [state])

  const log = useCallback(
    (
      module: HRModuleId | 'system',
      action: string,
      detail: string,
      tone: HRActivityEntryTone = 'info',
    ) => {
      setState((current) => ({
        ...current,
        activity: [
          {
            id: uid('hr-act'),
            at: new Date().toISOString(),
            actor: profile.name,
            action,
            detail,
            module,
            tone,
          },
          ...current.activity,
        ].slice(0, 60),
      }))
    },
    [profile.name],
  )

  const resetHR = useCallback(() => {
    setState(buildHRSeed())
  }, [])

  /* ------------------------------ Employees ------------------------------ */

  const addEmployee = useCallback<HRDataContextValue['addEmployee']>((draft) => {
    const id = uid('emp').toUpperCase()
    const employee: HREmployee = {
      id,
      employeeId: `TOT-EMP-${String(Date.now()).slice(-4)}`,
      ...draft,
      dateOfBirth: '1995-01-01',
      workAnniversary: draft.joiningDate,
      bankAccount: '•••• 0000',
      emergencyContact: '+91 90000 00000',
      skills: [],
    }
    setState((current) => ({ ...current, employees: [employee, ...current.employees] }))
    log('employees', 'Added an employee', `${employee.name} · ${employee.designation}`, 'success')
    pushToast({ title: 'Employee added', description: `${employee.name} is now in the employee directory.`, tone: 'success' })
    return employee
  }, [log, pushToast])

  const updateEmployee = useCallback<HRDataContextValue['updateEmployee']>((id, patch) => {
    setState((current) => ({
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === id ? { ...employee, ...patch } : employee,
      ),
    }))
    log('employees', 'Updated employee record', patch.name ?? id, 'info')
  }, [log])

  /* ------------------------------ Attendance ------------------------------ */

  const markCheckIn = useCallback<HRDataContextValue['markCheckIn']>((employeeId) => {
    const today = isoToday()
    const time = currentTimeValue()
    setState((current) => {
      const employee = current.employees.find((item) => item.employeeId === employeeId)
      if (!employee) return current
      const existing = current.attendance.find(
        (record) => record.employeeId === employeeId && record.date === today,
      )
      if (existing) {
        return {
          ...current,
          attendance: current.attendance.map((record) =>
            record.id === existing.id
              ? {
                  ...record,
                  checkIn: record.checkIn ?? time,
                  status: record.status === 'On Leave' ? record.status : 'Present',
                  source: 'Manual',
                }
              : record,
          ),
        }
      }
      const [h, m] = time.split(':').map(Number)
      const lateMinutes = Math.max(0, h * 60 + m - (9 * 60 + 15))
      return {
        ...current,
        attendance: [
          {
            id: `att-${today}-${employeeId}`,
            employeeId,
            employeeName: employee.name,
            department: employee.department,
            date: today,
            checkIn: time,
            checkOut: null,
            workingHours: 0,
            status: lateMinutes > 0 ? 'Late' : 'Present',
            lateMinutes,
            source: 'Manual',
          },
          ...current.attendance.filter(
            (record) => !(record.employeeId === employeeId && record.date === today),
          ),
        ],
      }
    })
    log('attendance', 'Recorded check-in', `${profile.name} · ${time}`, 'success')
    pushToast({ title: 'Check-in recorded', description: `Your check-in was saved at ${time}.`, tone: 'success' })
  }, [log, profile.name, pushToast])

  const markCheckOut = useCallback<HRDataContextValue['markCheckOut']>((employeeId) => {
    const today = isoToday()
    const time = currentTimeValue()
    setState((current) => ({
      ...current,
      attendance: current.attendance.map((record) => {
        if (record.employeeId !== employeeId || record.date !== today) return record
        const [inH, inM] = (record.checkIn ?? '09:00').split(':').map(Number)
        const [outH, outM] = time.split(':').map(Number)
        const worked = Math.max(0, (outH * 60 + outM - (inH * 60 + inM) - 60) / 60)
        return {
          ...record,
          checkOut: time,
          workingHours: Math.round(worked * 10) / 10,
          source: 'Manual',
        }
      }),
    }))
    log('attendance', 'Recorded check-out', `${profile.name} · ${time}`, 'info')
    pushToast({ title: 'Check-out recorded', description: `Your check-out was saved at ${time}.`, tone: 'success' })
  }, [log, profile.name, pushToast])

  const requestCorrection = useCallback<HRDataContextValue['requestCorrection']>((draft) => {
    const employee = state.employees.find((item) => item.employeeId === draft.employeeId)
    const request: HRCorrectionRequest = {
      id: uid('corr'),
      attendanceId: `att-${draft.date}-${draft.employeeId}`,
      employeeId: draft.employeeId,
      employeeName: employee?.name ?? profile.name,
      date: draft.date,
      requestedCheckIn: draft.requestedCheckIn,
      requestedCheckOut: draft.requestedCheckOut,
      reason: draft.reason,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
      decidedBy: null,
      decidedAt: null,
      reviewNote: '',
    }
    setState((current) => ({ ...current, correctionRequests: [request, ...current.correctionRequests] }))
    log('attendance', 'Raised an attendance correction', `${request.employeeName} · ${request.date}`, 'warning')
    pushToast({ title: 'Correction requested', description: 'Your attendance correction is awaiting authorisation.', tone: 'success' })
    return request
  }, [log, profile.name, pushToast, state.employees])

  const decideCorrection = useCallback<HRDataContextValue['decideCorrection']>((id, decision, note) => {
    setState((current) => {
      const request = current.correctionRequests.find((item) => item.id === id)
      if (!request || request.status !== 'Pending') return current
      const attendance = current.attendance.map((record) => {
        if (record.employeeId !== request.employeeId || record.date !== request.date) return record
        if (decision !== 'Approved') return record
        const [inH, inM] = request.requestedCheckIn.split(':').map(Number)
        const [outH, outM] = request.requestedCheckOut.split(':').map(Number)
        const workingHours = Math.max(0, Math.round((((outH * 60 + outM - (inH * 60 + inM) - 60) / 60) * 10))) / 10
        return {
          ...record,
          checkIn: request.requestedCheckIn,
          checkOut: request.requestedCheckOut,
          workingHours,
          status: 'Present' as const,
          lateMinutes: 0,
          source: 'Correction' as const,
          note: `Correction approved by ${profile.name}`,
        }
      })
      return {
        ...current,
        attendance,
        correctionRequests: current.correctionRequests.map((item) =>
          item.id === id
            ? {
                ...item,
                status: decision,
                decidedBy: profile.name,
                decidedAt: new Date().toISOString(),
                reviewNote: note,
              }
            : item,
        ),
      }
    })
    log(
      'attendance',
      `${decision === 'Approved' ? 'Approved' : 'Rejected'} an attendance correction`,
      `${state.correctionRequests.find((item) => item.id === id)?.employeeName ?? 'Employee'}${note ? ` · ${note}` : ''}`,
      decision === 'Approved' ? 'success' : 'danger',
    )
    pushToast({
      title: `Correction ${decision.toLowerCase()}`,
      description: 'The decision is recorded in the audit trail and attendance register.',
      tone: decision === 'Approved' ? 'success' : 'warning',
    })
  }, [log, profile.name, pushToast, state.correctionRequests])

  /* -------------------------------- Leave -------------------------------- */

  const submitLeave = useCallback<HRDataContextValue['submitLeave']>((draft) => {
    const employee = state.employees.find((item) => item.employeeId === draft.employeeId)
    const days = daysBetween(draft.startDate, draft.endDate)
    const request: HRLeaveRequest = {
      id: uid('leave'),
      employeeId: draft.employeeId,
      employeeName: employee?.name ?? profile.name,
      department: employee?.department ?? 'Marketing',
      leaveType: draft.leaveType,
      startDate: draft.startDate,
      endDate: draft.endDate,
      days,
      reason: draft.reason,
      status: 'Pending',
      requestDate: isoToday(),
      reviewer: null,
      reviewerRemarks: '',
      decidedAt: null,
    }
    setState((current) => ({
      ...current,
      leaveRequests: [request, ...current.leaveRequests],
      leaveBalances: current.leaveBalances.map((balance) =>
        balance.employeeId === request.employeeId && balance.leaveType === request.leaveType
          ? { ...balance, pending: balance.pending + days }
          : balance,
      ),
    }))
    log('leave', 'Submitted a leave request', `${request.employeeName} · ${request.leaveType} · ${days}d`, 'info')
    pushToast({ title: 'Leave request submitted', description: `${days} day${days === 1 ? '' : 's'} sent for manager review.`, tone: 'success' })
    return request
  }, [log, profile.name, pushToast, state.employees])

  const decideLeave = useCallback<HRDataContextValue['decideLeave']>((id, decision, remarks) => {
    setState((current) => {
      const request = current.leaveRequests.find((item) => item.id === id)
      if (!request || request.status !== 'Pending') return current
      const leaveBalances = current.leaveBalances.map((balance) => {
        if (balance.employeeId !== request.employeeId || balance.leaveType !== request.leaveType) return balance
        const nextPending = Math.max(0, balance.pending - request.days)
        return {
          ...balance,
          pending: nextPending,
          used: decision === 'Approved' ? balance.used + request.days : balance.used,
        }
      })
      return {
        ...current,
        leaveBalances,
        leaveRequests: current.leaveRequests.map((item) =>
          item.id === id
            ? {
                ...item,
                status: decision,
                reviewer: profile.name,
                reviewerRemarks: remarks,
                decidedAt: new Date().toISOString(),
              }
            : item,
        ),
      }
    })
    log(
      'leave',
      `${decision} a leave request`,
      `${state.leaveRequests.find((item) => item.id === id)?.employeeName ?? 'Employee'}${remarks ? ` · ${remarks}` : ''}`,
      decision === 'Approved' ? 'success' : 'danger',
    )
    pushToast({
      title: `Leave ${decision.toLowerCase()}`,
      description: 'The leave balance and payroll adjustment will be updated once.',
      tone: decision === 'Approved' ? 'success' : 'warning',
    })
  }, [log, profile.name, pushToast, state.leaveRequests])

  /* ------------------------------ Recruitment ------------------------------ */

  const addJob = useCallback<HRDataContextValue['addJob']>((draft) => {
    const job: HRJobOpening = {
      id: uid('job'),
      ...draft,
      status: 'Open',
    }
    setState((current) => ({ ...current, jobOpenings: [job, ...current.jobOpenings] }))
    log('recruitment', 'Posted a job opening', `${job.jobTitle} · ${job.department}`, 'success')
    pushToast({ title: 'Job opening published', description: `Applications are now open for ${job.jobTitle}.`, tone: 'success' })
    return job
  }, [log, pushToast])

  const updateJobStatus = useCallback<HRDataContextValue['updateJobStatus']>((id, status) => {
    setState((current) => ({
      ...current,
      jobOpenings: current.jobOpenings.map((job) => (job.id === id ? { ...job, status } : job)),
    }))
    log('recruitment', `Job opening marked ${status.toLowerCase()}`, id, 'info')
  }, [log])

  const addCandidate = useCallback<HRDataContextValue['addCandidate']>((draft) => {
    const candidate: HRCandidate = {
      id: uid('cand'),
      ...draft,
      stage: 'Applied',
      appliedDate: isoToday(),
      feedback: '',
      rating: null,
      offeredAmount: null,
    }
    setState((current) => ({ ...current, candidates: [candidate, ...current.candidates] }))
    log('recruitment', 'Added a candidate', `${candidate.name} · ${candidate.position}`, 'info')
    pushToast({ title: 'Candidate added', description: `${candidate.name} was added to the Applied stage.`, tone: 'success' })
    return candidate
  }, [log, pushToast])

  const moveCandidateStage = useCallback<HRDataContextValue['moveCandidateStage']>((id, stage) => {
    setState((current) => ({
      ...current,
      candidates: current.candidates.map((candidate) =>
        candidate.id === id ? { ...candidate, stage } : candidate,
      ),
    }))
    const candidate = state.candidates.find((item) => item.id === id)
    log('recruitment', 'Moved a candidate', `${candidate?.name ?? 'Candidate'} → ${stage}`, 'info')
  }, [log, state.candidates])

  const scheduleInterview = useCallback<HRDataContextValue['scheduleInterview']>((draft) => {
    const candidate = state.candidates.find((item) => item.id === draft.candidateId)
    const interview: HRInterview = {
      id: uid('int'),
      candidateId: draft.candidateId,
      candidateName: candidate?.name ?? 'Candidate',
      position: candidate?.position ?? '',
      interviewDate: draft.interviewDate,
      interviewTime: draft.interviewTime,
      interviewer: draft.interviewer,
      mode: draft.mode,
      status: 'Scheduled',
      feedback: '',
    }
    setState((current) => ({
      ...current,
      interviews: [interview, ...current.interviews],
      candidates: current.candidates.map((item) =>
        item.id === draft.candidateId && item.stage === 'Applied'
          ? { ...item, stage: 'Screening' }
          : item,
      ),
    }))
    log('recruitment', 'Scheduled an interview', `${interview.candidateName} · ${interview.interviewDate}`, 'success')
    pushToast({ title: 'Interview scheduled', description: `${interview.candidateName} on ${interview.interviewDate} at ${interview.interviewTime}.`, tone: 'success' })
    return interview
  }, [log, pushToast, state.candidates])

  const updateInterview = useCallback<HRDataContextValue['updateInterview']>((id, patch) => {
    setState((current) => ({
      ...current,
      interviews: current.interviews.map((interview) =>
        interview.id === id ? { ...interview, ...patch } : interview,
      ),
    }))
    log('recruitment', 'Updated an interview', id, 'info')
  }, [log])

  const hireCandidate = useCallback<HRDataContextValue['hireCandidate']>((id) => {
    setState((current) => {
      const candidate = current.candidates.find((item) => item.id === id)
      if (!candidate) return current
      const job = current.jobOpenings.find((opening) => opening.id === candidate.jobId)
      const existingOnboarding = current.onboarding.find(
        (item) =>
          item.employeeId === candidate.id ||
          (item.name === candidate.name && item.position === candidate.position),
      )
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
      const department = job?.department ?? 'Marketing'
      const startDate = toISODate(addDays(new Date(), 14))
      const employeeId = `TOT-EMP-${String(Date.now()).slice(-6)}`
      const newEmployee: HREmployee | null = existingOnboarding
        ? null
        : {
            id: uid('emp').toUpperCase(),
            employeeId,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            department,
            designation: job?.designation ?? candidate.position,
            reportingManager:
              current.departments.find((item) => item.name === department)?.head ?? 'Nisha Verma',
            employmentType: job?.employmentType ?? 'Full Time',
            joiningDate: startDate,
            status: 'Onboarding',
            location: job?.location ?? 'Mumbai, India',
            dateOfBirth: '1995-01-01',
            workAnniversary: startDate,
            salary: candidate.offeredAmount ?? 45000,
            bankAccount: ' 0000',
            emergencyContact: '+91 90000 00000',
            skills: [],
          }
      return {
        ...current,
        candidates: current.candidates.map((item) =>
          item.id === id ? { ...item, stage: 'Hired' } : item,
        ),
        employees: newEmployee ? [newEmployee, ...current.employees] : current.employees,
        onboarding: existingOnboarding
          ? current.onboarding
          : [
              {
                id: uid('onb'),
                employeeId: newEmployee?.employeeId ?? candidate.id,
                name: candidate.name,
                position: candidate.position,
                department,
                startDate,
                buddy: 'Nisha Verma',
                status: 'In Progress',
                checklist: checklistLabels.map((label, index) => ({
                  id: uid('chk'),
                  label,
                  done: index === 0,
                })),
                completedAt: null,
              },
              ...current.onboarding,
            ],
      }
    })
    log('recruitment', 'Marked a candidate as hired', state.candidates.find((item) => item.id === id)?.name ?? id, 'success')
    pushToast({
      title: 'Candidate hired',
      description: 'A directory record and onboarding checklist were created automatically.',
      tone: 'success',
    })
  }, [log, pushToast, state.candidates])

  /* ------------------------------- Onboarding ------------------------------- */

  const toggleOnboardingItem = useCallback<HRDataContextValue['toggleOnboardingItem']>((recordId, itemId) => {
    setState((current) => ({
      ...current,
      onboarding: current.onboarding.map((record) => {
        if (record.id !== recordId) return record
        const checklist = record.checklist.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item,
        )
        const completed = checklist.every((item) => item.done)
        return {
          ...record,
          checklist,
          status: completed ? 'Completed' : 'In Progress',
          completedAt: completed ? new Date().toISOString() : null,
        }
      }),
    }))
    log('onboarding', 'Updated an onboarding checklist', recordId, 'info')
  }, [log])

  const completeOnboarding = useCallback<HRDataContextValue['completeOnboarding']>((recordId) => {
    setState((current) => {
      const record = current.onboarding.find((item) => item.id === recordId)
      if (!record) return current
      return {
        ...current,
        onboarding: current.onboarding.map((item) =>
          item.id === recordId
            ? {
                ...item,
                status: 'Completed',
                completedAt: new Date().toISOString(),
                checklist: item.checklist.map((check) => ({ ...check, done: true })),
              }
            : item,
        ),
        employees: current.employees.map((employee) =>
          employee.name === record.name || employee.id === record.employeeId
            ? { ...employee, status: 'Active' }
            : employee,
        ),
      }
    })
    log('onboarding', 'Completed onboarding', state.onboarding.find((item) => item.id === recordId)?.name ?? recordId, 'success')
    pushToast({ title: 'Onboarding completed', description: 'The employee is now marked active in the directory.', tone: 'success' })
  }, [log, pushToast, state.onboarding])

  /* -------------------------------- Payroll -------------------------------- */

  const updateDocumentStatus = useCallback<HRDataContextValue['updateDocumentStatus']>((id, status) => {
    setState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === id ? { ...document, status } : document,
      ),
    }))
    log('onboarding', `Document marked ${status.toLowerCase()}`, id, status === 'Verified' ? 'success' : 'warning')
    pushToast({
      title: `Document ${status.toLowerCase()}`,
      description: 'The verification decision is saved in the local HR record.',
      tone: status === 'Verified' ? 'success' : 'warning',
    })
  }, [log, pushToast])

  /* -------------------------------- Payroll -------------------------------- */

  const preparePayroll = useCallback<HRDataContextValue['preparePayroll']>((monthKeyValue) => {
    setState((current) => {
      const payroll = current.payrolls.find((item) => item.monthKey === monthKeyValue)
      if (!payroll) return current
      const activeEmployees = current.employees.filter(
        (employee) => employee.status === 'Active' || employee.status === 'On Leave',
      )
      let gross = 0
      let deductions = 0
      let net = 0
      const lines: HRPayrollLine[] = activeEmployees.map((employee) => {
        const monthRecords = current.attendance.filter(
          (record) => record.employeeId === employee.employeeId && record.date.startsWith(monthKeyValue),
        )
        const attendanceDays = monthRecords.filter((record) =>
          ['Present', 'Late'].includes(record.status),
        ).length
        const approvedMonthLeaves = current.leaveRequests.filter(
          (request) =>
            request.employeeId === employee.employeeId &&
            request.status === 'Approved' &&
            request.startDate.startsWith(monthKeyValue),
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
        return {
          id: `line-${monthKeyValue}-${employee.employeeId}`,
          payrollId: payroll.id,
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
          adjustmentKey: `${payroll.id}-${employee.employeeId}`,
        }
      })
      return {
        ...current,
        payrolls: current.payrolls.map((item) =>
          item.id === payroll.id
            ? {
                ...item,
                status: 'Prepared',
                employeeCount: activeEmployees.length,
                gross,
                deductions,
                net,
                preparedBy: profile.name,
                preparedAt: new Date().toISOString(),
                note: 'Attendance and approved leave verified by HR. Awaiting Finance processing.',
              }
            : item,
        ),
        payrollLines: [
          ...current.payrollLines.filter((line) => line.payrollId !== payroll.id),
          ...lines,
        ],
      }
    })
    log('payroll', 'Prepared payroll', `${monthKeyValue} · attendance and leave verified once`, 'success')
    pushToast({ title: 'Payroll prepared', description: 'Attendance and leave were verified once. Finance retains payment processing.', tone: 'success' })
  }, [log, profile.name, pushToast])

  const sendPayrollToFinance = useCallback<HRDataContextValue['sendPayrollToFinance']>((payrollId) => {
    setState((current) => ({
      ...current,
      payrolls: current.payrolls.map((payroll) =>
        payroll.id === payrollId && (payroll.status === 'Prepared' || payroll.status === 'Pending')
          ? {
              ...payroll,
              status: 'Sent to Finance',
              note: 'Sent to Finance for payment processing and financial approval.',
            }
          : payroll,
      ),
    }))
    log('payroll', 'Sent payroll to Finance', payrollId, 'info')
    pushToast({ title: 'Sent to Finance', description: 'Finance now owns payment processing and financial approval.', tone: 'success' })
  }, [log, pushToast])

  /* ------------------------------- Performance ------------------------------- */

  const updatePerformanceReview = useCallback(
    (id: string, updater: (review: HRPerformanceReview) => HRPerformanceReview, action: string) => {
      setState((current) => ({
        ...current,
        performanceReviews: current.performanceReviews.map((review) =>
          review.id === id ? { ...updater(review), updatedAt: new Date().toISOString() } : review,
        ),
      }))
      log('performance', action, state.performanceReviews.find((item) => item.id === id)?.employeeName ?? id, 'info')
    },
    [log, state.performanceReviews],
  )

  const submitSelfAssessment = useCallback<HRDataContextValue['submitSelfAssessment']>(
    (id, rating, comment, goalScores) => {
      updatePerformanceReview(
        id,
        (review) => ({
          ...review,
          status: 'Self Assessment Submitted',
          selfRating: rating,
          selfComment: comment,
          goals: review.goals.map((goal) => ({
            ...goal,
            selfScore: goalScores[goal.id] ?? goal.selfScore,
          })),
        }),
        'Submitted a self assessment',
      )
      pushToast({ title: 'Self assessment submitted', description: 'Your manager can now complete the review.', tone: 'success' })
    },
    [pushToast, updatePerformanceReview],
  )

  const submitManagerReview = useCallback<HRDataContextValue['submitManagerReview']>(
    (id, rating, comment, goalScores) => {
      updatePerformanceReview(
        id,
        (review) => ({
          ...review,
          status: 'HR Review',
          managerRating: rating,
          managerComment: comment,
          goals: review.goals.map((goal) => ({
            ...goal,
            managerScore: goalScores[goal.id] ?? goal.managerScore,
          })),
        }),
        'Submitted a manager review',
      )
      pushToast({ title: 'Manager review submitted', description: 'The review is now with HR for calibration.', tone: 'success' })
    },
    [pushToast, updatePerformanceReview],
  )

  const submitHRReview = useCallback<HRDataContextValue['submitHRReview']>(
    (id, rating, comment, goalScores) => {
      updatePerformanceReview(
        id,
        (review) => ({
          ...review,
          status: 'Completed',
          hrRating: rating,
          hrComment: comment,
          goals: review.goals.map((goal) => ({
            ...goal,
            hrScore: goalScores[goal.id] ?? goal.hrScore,
          })),
        }),
        'Completed an HR review',
      )
      pushToast({ title: 'Review completed', description: 'The appraisal is locked and added to the employee history.', tone: 'success' })
    },
    [pushToast, updatePerformanceReview],
  )

  /* ----------------------------- Employee requests ----------------------------- */

  const addEmployeeRequest = useCallback<HRDataContextValue['addEmployeeRequest']>((draft) => {
    const employee = state.employees.find((item) => item.employeeId === draft.employeeId)
    const request: HREmployeeRequest = {
      id: uid('req'),
      employeeId: draft.employeeId,
      employeeName: employee?.name ?? profile.name,
      department: employee?.department ?? 'Marketing',
      category: draft.category,
      subject: draft.subject,
      description: draft.description,
      requestDate: isoToday(),
      status: 'Pending',
      priority: draft.priority,
      assignedTo: 'Nisha Verma',
      resolutionNote: '',
      resolvedAt: null,
    }
    setState((current) => ({ ...current, employeeRequests: [request, ...current.employeeRequests] }))
    log('requests', 'Raised an employee request', `${request.employeeName} · ${request.category}`, 'info')
    pushToast({ title: 'Request submitted', description: 'HR will assign an owner and keep you updated.', tone: 'success' })
    return request
  }, [log, profile.name, pushToast, state.employees])

  const updateEmployeeRequest = useCallback<HRDataContextValue['updateEmployeeRequest']>((id, patch) => {
    setState((current) => ({
      ...current,
      employeeRequests: current.employeeRequests.map((request) => {
        if (request.id !== id) return request
        const next = { ...request, ...patch }
        if (next.status === 'Completed' && request.status !== 'Completed') {
          next.resolvedAt = new Date().toISOString()
        }
        return next
      }),
    }))
    log('requests', 'Updated an employee request', patch.status ?? id, 'info')
  }, [log])

  /* -------------------------------- Offboarding -------------------------------- */

  const addOffboarding = useCallback<HRDataContextValue['addOffboarding']>((draft) => {
    const employee = state.employees.find((item) => item.employeeId === draft.employeeId)
    const record: HROffboarding = {
      id: uid('off'),
      employeeId: draft.employeeId,
      employeeName: employee?.name ?? profile.name,
      department: employee?.department ?? 'Marketing',
      designation: employee?.designation ?? '',
      resignationDate: draft.resignationDate,
      noticePeriodDays: draft.noticePeriodDays,
      noticePeriodEnd: draft.lastWorkingDay,
      lastWorkingDay: draft.lastWorkingDay,
      reason: draft.reason,
      exitInterviewDate: null,
      exitInterviewStatus: 'Pending',
      clearance: { it: false, finance: false, manager: false, hr: false },
      finalSettlement: 'Pending',
      status: 'Pending Review',
      manager: draft.manager,
      note: 'Resignation recorded. Manager acknowledgement and clearance are pending.',
    }
    setState((current) => ({
      ...current,
      offboarding: [record, ...current.offboarding],
      employees: current.employees.map((item) =>
        item.employeeId === draft.employeeId ? { ...item, status: 'Resigned' } : item,
      ),
    }))
    log('offboarding', 'Recorded a resignation', `${record.employeeName} · last day ${record.lastWorkingDay}`, 'warning')
    pushToast({ title: 'Resignation recorded', description: 'Offboarding and clearance tracking has started.', tone: 'success' })
    return record
  }, [log, profile.name, pushToast, state.employees])

  const updateOffboarding = useCallback<HRDataContextValue['updateOffboarding']>((id, patch) => {
    setState((current) => ({
      ...current,
      offboarding: current.offboarding.map((record) =>
        record.id === id ? { ...record, ...patch } : record,
      ),
    }))
    log('offboarding', 'Updated an offboarding record', id, 'info')
  }, [log])

  const toggleClearance = useCallback<HRDataContextValue['toggleClearance']>((id, key) => {
    setState((current) => ({
      ...current,
      offboarding: current.offboarding.map((record) => {
        if (record.id !== id) return record
        const clearance = { ...record.clearance, [key]: !record.clearance[key] }
        const allDone = Object.values(clearance).every(Boolean)
        return {
          ...record,
          clearance,
          status: allDone ? 'Completed' : 'Clearance Pending',
        }
      }),
    }))
    log('offboarding', 'Updated exit clearance', `${id} · ${key}`, 'info')
  }, [log])

  const sendSettlementToFinance = useCallback<HRDataContextValue['sendSettlementToFinance']>((id) => {
    setState((current) => ({
      ...current,
      offboarding: current.offboarding.map((record) =>
        record.id === id
          ? { ...record, finalSettlement: 'Sent to Finance', status: 'Completed' }
          : record,
      ),
    }))
    log('offboarding', 'Sent final settlement to Finance', id, 'info')
    pushToast({ title: 'Settlement sent to Finance', description: 'Finance will process the final payment.', tone: 'success' })
  }, [log, pushToast])

  /* --------------------------------- Settings --------------------------------- */

  const addDepartment = useCallback<HRDataContextValue['addDepartment']>((name, head, costCentre) => {
    setState((current) => ({
      ...current,
      departments: [
        ...current.departments,
        { id: uid('dept'), name, head, costCentre },
      ],
    }))
    log('settings', 'Added a department', name, 'success')
  }, [log])

  const removeDepartment = useCallback<HRDataContextValue['removeDepartment']>((id) => {
    setState((current) => ({
      ...current,
      departments: current.departments.filter((department) => department.id !== id),
    }))
    log('settings', 'Removed a department', id, 'warning')
  }, [log])

  const addDesignation = useCallback<HRDataContextValue['addDesignation']>((title, department, level) => {
    setState((current) => ({
      ...current,
      designations: [...current.designations, { id: uid('des'), title, department, level }],
    }))
    log('settings', 'Added a designation', `${title} · ${department}`, 'success')
  }, [log])

  const removeDesignation = useCallback<HRDataContextValue['removeDesignation']>((id) => {
    setState((current) => ({
      ...current,
      designations: current.designations.filter((designation) => designation.id !== id),
    }))
    log('settings', 'Removed a designation', id, 'warning')
  }, [log])

  const addHoliday = useCallback<HRDataContextValue['addHoliday']>((holiday) => {
    setState((current) => ({
      ...current,
      holidays: [...current.holidays, { ...holiday, id: uid('hol') }],
    }))
    log('settings', 'Added a holiday', `${holiday.name} · ${holiday.date}`, 'success')
  }, [log])

  const removeHoliday = useCallback<HRDataContextValue['removeHoliday']>((id) => {
    setState((current) => ({
      ...current,
      holidays: current.holidays.filter((holiday) => holiday.id !== id),
    }))
    log('settings', 'Removed a holiday', id, 'warning')
  }, [log])

  const addLeavePolicy = useCallback<HRDataContextValue['addLeavePolicy']>((policy) => {
    setState((current) => ({
      ...current,
      leavePolicies: [...current.leavePolicies, { ...policy, id: uid('lp') }],
    }))
    log('settings', 'Added a leave policy', policy.leaveType, 'success')
  }, [log])

  const removeLeavePolicy = useCallback<HRDataContextValue['removeLeavePolicy']>((id) => {
    setState((current) => ({
      ...current,
      leavePolicies: current.leavePolicies.filter((policy) => policy.id !== id),
    }))
    log('settings', 'Removed a leave policy', id, 'warning')
  }, [log])

  const addAttendancePolicy = useCallback<HRDataContextValue['addAttendancePolicy']>((policy) => {
    setState((current) => ({
      ...current,
      attendancePolicies: [...current.attendancePolicies, { ...policy, id: uid('pol') }],
    }))
    log('settings', 'Added an attendance policy', policy.name, 'success')
  }, [log])

  const removeAttendancePolicy = useCallback<HRDataContextValue['removeAttendancePolicy']>((id) => {
    setState((current) => ({
      ...current,
      attendancePolicies: current.attendancePolicies.filter((policy) => policy.id !== id),
    }))
    log('settings', 'Removed an attendance policy', id, 'warning')
  }, [log])

  const addReviewTemplate = useCallback<HRDataContextValue['addReviewTemplate']>((template) => {
    setState((current) => ({
      ...current,
      reviewTemplates: [...current.reviewTemplates, { ...template, id: uid('tpl') }],
    }))
    log('settings', 'Added a review template', template.name, 'success')
  }, [log])

  const removeReviewTemplate = useCallback<HRDataContextValue['removeReviewTemplate']>((id) => {
    setState((current) => ({
      ...current,
      reviewTemplates: current.reviewTemplates.filter((template) => template.id !== id),
    }))
    log('settings', 'Removed a review template', id, 'warning')
  }, [log])

  const value = useMemo<HRDataContextValue>(
    () => ({
      ...state,
      resetHR,
      addEmployee,
      updateEmployee,
      markCheckIn,
      markCheckOut,
      requestCorrection,
      decideCorrection,
      submitLeave,
      decideLeave,
      addJob,
      updateJobStatus,
      addCandidate,
      moveCandidateStage,
      scheduleInterview,
      updateInterview,
      hireCandidate,
      toggleOnboardingItem,
      completeOnboarding,
      updateDocumentStatus,
      preparePayroll,
      sendPayrollToFinance,
      submitSelfAssessment,
      submitManagerReview,
      submitHRReview,
      addEmployeeRequest,
      updateEmployeeRequest,
      addOffboarding,
      updateOffboarding,
      toggleClearance,
      sendSettlementToFinance,
      addDepartment,
      removeDepartment,
      addDesignation,
      removeDesignation,
      addHoliday,
      removeHoliday,
      addLeavePolicy,
      removeLeavePolicy,
      addAttendancePolicy,
      removeAttendancePolicy,
      addReviewTemplate,
      removeReviewTemplate,
    }),
    [
      state,
      resetHR,
      addEmployee,
      updateEmployee,
      markCheckIn,
      markCheckOut,
      requestCorrection,
      decideCorrection,
      submitLeave,
      decideLeave,
      addJob,
      updateJobStatus,
      addCandidate,
      moveCandidateStage,
      scheduleInterview,
      updateInterview,
      hireCandidate,
      toggleOnboardingItem,
      completeOnboarding,
      updateDocumentStatus,
      preparePayroll,
      sendPayrollToFinance,
      submitSelfAssessment,
      submitManagerReview,
      submitHRReview,
      addEmployeeRequest,
      updateEmployeeRequest,
      addOffboarding,
      updateOffboarding,
      toggleClearance,
      sendSettlementToFinance,
      addDepartment,
      removeDepartment,
      addDesignation,
      removeDesignation,
      addHoliday,
      removeHoliday,
      addLeavePolicy,
      removeLeavePolicy,
      addAttendancePolicy,
      removeAttendancePolicy,
      addReviewTemplate,
      removeReviewTemplate,
    ],
  )

  return <HRDataContext.Provider value={value}>{children}</HRDataContext.Provider>
}

type HRActivityEntryTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

export function useHRData(): HRDataContextValue {
  const ctx = useContext(HRDataContext)
  if (!ctx) throw new Error('useHRData must be used inside HRDataProvider')
  return ctx
}
