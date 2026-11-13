import {
  useState, useEffect, useMemo,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarClock, Check, CheckCircle2,
  ChevronRight, CircleDollarSign, Download, FileText, LayoutGrid, List, Mail, MapPin, Phone, Plus,
  RefreshCw, Star, UserPlus, Users, Video, X,
} from 'lucide-react'

import { useStore } from '../store'
import { describeMissingPermission, useHrAccess } from '../lib/access'
import { useJobs, useCandidates } from '../useHrData'
import { runHrApiAction, hrActions } from '../api-actions'
import type { Candidate, CandidateStage, DocFile, Employee, EmploymentType, JobOpening } from '../types'
import {
  daysAgo, daysAhead, downloadCSV, fmtDate, fmtDateShort, fmtMoney, fullName, relativeTime, todayISO, uid,
} from '../lib/utils'
import {
  Avatar, Badge, Button, Card, Drawer, EmptyState, Field, FileDrop, Input, Modal, PageHeader,
  Pagination, ProgressBar, SearchInput, Select, StatCard, StatusBadge, Tabs, Textarea,
} from '../components/ui'
import { HrPermissionNotice } from '../components/hr-guard'

const STAGES: { key: CandidateStage; label: string; color: string }[] = [
  { key: 'Applied', label: 'Applied', color: '#6366f1' },
  { key: 'Screening', label: 'Screening', color: '#0ea5e9' },
  { key: 'Interview', label: 'Interview', color: '#8b5cf6' },
  { key: 'Offer', label: 'Offer', color: '#f59e0b' },
  { key: 'Hired', label: 'Hired', color: '#10b981' },
]

const stageTone = (stage: string) => {
  if (stage === 'Hired') return 'green' as const
  if (stage === 'Offer') return 'amber' as const
  if (stage === 'Interview') return 'violet' as const
  if (stage === 'Screening') return 'blue' as const
  if (stage === 'Rejected') return 'red' as const
  return 'slate' as const
}

const blankCandidate = { name: '', email: '', phone: '', jobId: '', source: 'LinkedIn', experience: '3', currentCompany: '', expectedSalary: '', notes: '', resumeName: 'Resume.pdf' }
const blankJob = { title: '', department: 'Engineering', location: '', employmentType: 'Full-time' as EmploymentType, openings: '1', deadline: daysAhead(30), hiringManager: '', description: '', status: 'Open' as JobOpening['status'] }

export default function Recruitment() {
  const access = useHrAccess()
  const { db, update, logActivity, toast, dataSource, refreshFromApi } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'pipeline' | 'jobs'>('pipeline')
  const [view, setView] = useState<'board' | 'table'>('board')
  const [jobFilter, setJobFilter] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [jobOpen, setJobOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null)
  const [candidateForm, setCandidateForm] = useState(blankCandidate)
  const [jobForm, setJobForm] = useState(blankJob)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ round: 'Technical Interview', date: daysAhead(3), time: '10:00', interviewer: '', mode: 'Video' as 'Video' | 'On-site' | 'Phone' })
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState({ rating: 4, feedback: '' })
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [notes, setNotes] = useState('')
  const [resumeOpen, setResumeOpen] = useState(false)
  const [offerSalary, setOfferSalary] = useState('')
  const [dragOver, setDragOver] = useState<string | null>(null)

  const jobsQuery = useJobs({
    status: jobFilter === 'All' ? undefined : 'Open',
    page,
    pageSize,
  })
  const candidatesQuery = useCandidates({
    jobId: jobFilter === 'All' ? undefined : jobFilter,
    stage: stageFilter === 'All' ? undefined : stageFilter as any,
    q: search,
    page,
    pageSize,
  })

  const useApi = dataSource === 'api'
  const jobsData = useApi ? jobsQuery.data : null
  const candidatesData = useApi ? candidatesQuery.data : null
  const allJobs = (jobsData?.data ?? db.jobs) as JobOpening[]
  const allCandidates = (candidatesData?.data ?? db.candidates) as Candidate[]

  const selected = allCandidates.find((c) => c.id === selectedId) || null

  useEffect(() => { setPage(1) }, [jobFilter, stageFilter, search, pageSize])
  useEffect(() => {
    if (selected) {
      setNotes(selected.notes || '')
      setOfferSalary(String(selected.offerSalary || selected.expectedSalary))
    }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const jobMap = useMemo(() => new Map(allJobs.map((j) => [j.id, j])), [allJobs])
  const openJobs = allJobs.filter((j) => j.status === 'Open')
  const openPositions = openJobs.reduce((a, j) => a + j.openings, 0)
  const activeCandidates = allCandidates.filter((c) => c.stage !== 'Rejected' && c.stage !== 'Hired')
  const interviews = allCandidates.filter((c) => c.interview && c.interview.date >= todayISO())
  const offers = allCandidates.filter((c) => c.stage === 'Offer')
  const hired = allCandidates.filter((c) => c.stage === 'Hired')

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allCandidates.filter((c) => {
      const job = jobMap.get(c.jobId)
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (job?.title || '').toLowerCase().includes(q) || c.source.toLowerCase().includes(q)
      return matchSearch && (jobFilter === 'All' || c.jobId === jobFilter) && (stageFilter === 'All' || c.stage === stageFilter)
    }).sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))
  }, [allCandidates, jobMap, search, jobFilter, stageFilter])

  // API mode uses the server pagination metadata; demo mode paginates locally.
  const candidateMeta = (candidatesData as any)?.meta
  const totalItems = useApi ? Number(candidateMeta?.total ?? filteredCandidates.length) : filteredCandidates.length
  const totalPages = useApi ? Math.max(1, Number(candidateMeta?.totalPages ?? 1)) : Math.max(1, Math.ceil(filteredCandidates.length / pageSize))
  const currentPage = useApi ? Number(candidateMeta?.page ?? page) : Math.min(page, totalPages)
  const from = useApi ? (filteredCandidates.length ? (currentPage - 1) * (candidateMeta?.pageSize ?? pageSize) : 0) : (Math.min(page, totalPages) - 1) * pageSize
  const tableRows = filteredCandidates.slice(from, from + pageSize)

  const moveStage = async (candidate: Candidate, stage: CandidateStage) => {
    if (candidate.stage === stage) return
    if (dataSource === 'api') {
      const res = await runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () =>
          hrActions.updateCandidate(candidate.id, {
            stage,
            ...(stage === 'Hired' ? { offerStatus: 'Accepted' as const } : {}),
            ...(stage === 'Rejected' ? { rejectionReason: rejectReason || 'Not selected for this role.' } : {}),
          }),
        successMessage: `Moved to ${stage}`,
        successDescription: `${candidate.name} is now in the ${stage.toLowerCase()} stage.`,
        errorTitle: 'Could not move candidate',
      })
      if (res.ok) return
      return
    }
    update((d) => ({
      ...d,
      candidates: d.candidates.map((c) => (c.id === candidate.id ? {
        ...c,
        stage,
        ...(stage === 'Hired' ? { offerStatus: 'Accepted' as const } : {}),
        ...(stage === 'Rejected' ? { rejectionReason: rejectReason || 'Not selected for this role.' } : {}),
      } : c)),
    }))
    const job = jobMap.get(candidate.jobId)
    logActivity('recruitment', `Candidate moved to ${stage}`, `${candidate.name} · ${job?.title || 'Role'}`)
    toast(`Moved to ${stage}`, stage === 'Rejected' ? 'info' : 'success', `${candidate.name} is now in the ${stage.toLowerCase()} stage.`)
  }

  const rejectCandidate = () => {
    if (!rejectReason.trim()) { toast('Add a reason', 'error', 'A rejection reason is required.'); return }
    if (!selected) return
    moveStage(selected, 'Rejected')
    setRejectOpen(false)
    setRejectReason('')
  }

  const saveCandidate = () => {
    const next: Record<string, string> = {}
    if (!candidateForm.name.trim()) next.name = 'Candidate name is required'
    if (!candidateForm.email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateForm.email)) next.email = 'Enter a valid email'
    if (!candidateForm.jobId) next.jobId = 'Select the role applied for'
    if (!candidateForm.phone.trim()) next.phone = 'Phone is required'
    setErrors(next)
    if (Object.keys(next).length) return
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () =>
          hrActions.createCandidate({
            jobId: candidateForm.jobId,
            name: candidateForm.name.trim(),
            email: candidateForm.email.trim(),
            phone: candidateForm.phone.trim(),
            stage: 'Applied',
            appliedOn: todayISO(),
            source: candidateForm.source,
            experienceYears: Number(candidateForm.experience) || 0,
            currentCompany: candidateForm.currentCompany,
            expectedSalary: Number(candidateForm.expectedSalary) || 0,
            notes: candidateForm.notes,
          }),
        successMessage: 'Candidate added',
        successDescription: `${candidateForm.name.trim()} has been added to the applied stage.`,
        errorTitle: 'Could not add candidate',
      }).then((res) => {
        if (res.ok) {
          setAddOpen(false)
          setCandidateForm(blankCandidate)
        }
      })
      return
    }
    const candidate: Candidate = {
      id: `CND-${String(4000 + db.candidates.length)}`,
      name: candidateForm.name.trim(),
      email: candidateForm.email.trim(),
      phone: candidateForm.phone.trim(),
      jobId: candidateForm.jobId,
      stage: 'Applied',
      appliedOn: todayISO(),
      source: candidateForm.source,
      resumeName: candidateForm.resumeName || `${candidateForm.name.replace(/\s/g, '_')}_Resume.pdf`,
      rating: 0,
      experience: Number(candidateForm.experience) || 0,
      currentCompany: candidateForm.currentCompany,
      expectedSalary: Number(candidateForm.expectedSalary) || 0,
      notes: candidateForm.notes,
    }
    update((d) => ({ ...d, candidates: [candidate, ...d.candidates] }))
    logActivity('recruitment', 'New candidate added', `${candidate.name} · ${jobMap.get(candidate.jobId)?.title}`)
    toast('Candidate added', 'success', `${candidate.name} has been added to the applied stage.`)
    setAddOpen(false)
    setCandidateForm(blankCandidate)
  }

  const openJobModal = (job?: JobOpening) => {
    setErrors({})
    setEditingJob(job || null)
    setJobForm(job ? {
      title: job.title, department: job.department, location: job.location, employmentType: job.employmentType,
      openings: String(job.openings), deadline: job.deadline, hiringManager: job.hiringManager, description: job.description, status: job.status,
    } : { ...blankJob, hiringManager: fullName(db.employees[0]) })
    setJobOpen(true)
  }

  const saveJob = () => {
    const next: Record<string, string> = {}
    if (!jobForm.title.trim()) next.title = 'Job title is required'
    if (!jobForm.department) next.department = 'Department is required'
    if (!jobForm.location.trim()) next.location = 'Location is required'
    if (!jobForm.deadline) next.deadline = 'Deadline is required'
    if (Number(jobForm.openings) < 1) next.openings = 'At least one opening is required'
    setErrors(next)
    if (Object.keys(next).length) return
    const departmentId = db.settings.departments.find((d) => d.name === jobForm.department)?.id
    const jobPayload = {
      title: jobForm.title.trim(),
      ...(departmentId ? { departmentId } : {}),
      location: jobForm.location.trim(),
      employmentType: jobForm.employmentType,
      openings: Number(jobForm.openings),
      deadline: jobForm.deadline,
      description: jobForm.description,
      status: jobForm.status,
    }
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => (editingJob
          ? hrActions.updateJob(editingJob.id, jobPayload)
          : hrActions.createJob(jobPayload)),
        successMessage: editingJob ? 'Job opening updated' : 'Job posted',
        successDescription: editingJob ? undefined : `${jobForm.title.trim()} is now open for applications.`,
        errorTitle: editingJob ? 'Could not update job' : 'Could not post job',
      }).then((res) => {
        if (res.ok) setJobOpen(false)
      })
      return
    }
    if (editingJob) {
      update((d) => ({ ...d, jobs: d.jobs.map((j) => (j.id === editingJob.id ? { ...j, ...jobForm, openings: Number(jobForm.openings) } : j)) }))
      logActivity('recruitment', 'Job opening updated', jobForm.title)
      toast('Job opening updated', 'success')
    } else {
      const job: JobOpening = {
        id: `JOB-${String(100 + db.jobs.length)}`, ...jobForm, openings: Number(jobForm.openings), posted: todayISO(),
      }
      update((d) => ({ ...d, jobs: [job, ...d.jobs] }))
      logActivity('recruitment', 'Job opening created', job.title)
      toast('Job posted', 'success', `${job.title} is now open for applications.`)
    }
    setJobOpen(false)
  }

  const openSchedule = () => {
    if (!selected) return
    setScheduleForm({
      round: selected.interview?.round || 'Technical Interview',
      date: selected.interview?.date || daysAhead(3),
      time: selected.interview?.time || '10:00',
      interviewer: selected.interview?.interviewer || jobMap.get(selected.jobId)?.hiringManager || 'Priya Raman',
      mode: selected.interview?.mode || 'Video',
    })
    setScheduleOpen(true)
  }

  const saveSchedule = () => {
    if (!selected) return
    if (!scheduleForm.date || !scheduleForm.time || !scheduleForm.interviewer.trim()) {
      toast('Complete the interview details', 'error', 'Date, time and interviewer are required.')
      return
    }
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () =>
          hrActions.scheduleInterview(selected.id, {
            round: scheduleForm.round,
            date: scheduleForm.date,
            time: scheduleForm.time,
            interviewerName: scheduleForm.interviewer.trim(),
            mode: scheduleForm.mode,
          }),
        successMessage: 'Interview scheduled',
        successDescription: `${scheduleForm.round} with ${selected.name} on ${fmtDate(scheduleForm.date)} at ${scheduleForm.time}.`,
        errorTitle: 'Could not schedule interview',
      }).then((res) => {
        if (res.ok) setScheduleOpen(false)
      })
      return
    }
    update((d) => ({
      ...d,
      candidates: d.candidates.map((c) => (c.id === selected.id ? {
        ...c,
        stage: c.stage === 'Applied' || c.stage === 'Screening' ? 'Interview' : c.stage,
        interview: { id: c.interview?.id || uid('int'), ...scheduleForm, rating: c.interview?.rating, feedback: c.interview?.feedback },
      } : c)),
    }))
    logActivity('recruitment', 'Interview scheduled', `${selected.name} · ${scheduleForm.round} · ${fmtDate(scheduleForm.date)}`)
    toast('Interview scheduled', 'success', `${scheduleForm.round} with ${selected.name} on ${fmtDate(scheduleForm.date)} at ${scheduleForm.time}.`)
    setScheduleOpen(false)
  }

  const saveFeedback = () => {
    if (!selected?.interview) return
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () =>
          hrActions.submitInterviewFeedback(selected.interview!.id, {
            feedback: feedback.feedback.trim(),
            rating: feedback.rating,
          }),
        successMessage: 'Interview feedback saved',
        errorTitle: 'Could not save feedback',
      }).then((res) => {
        if (res.ok) setFeedbackOpen(false)
      })
      return
    }
    update((d) => ({
      ...d,
      candidates: d.candidates.map((c) => (c.id === selected.id && c.interview ? { ...c, interview: { ...c.interview, rating: feedback.rating, feedback: feedback.feedback } } : c)),
    }))
    toast('Interview feedback saved', 'success')
    setFeedbackOpen(false)
  }

  const saveNotes = () => {
    if (!selected) return
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.updateCandidate(selected.id, { notes }),
        successMessage: 'Notes saved',
        errorTitle: 'Could not save notes',
      })
      return
    }
    update((d) => ({ ...d, candidates: d.candidates.map((c) => (c.id === selected.id ? { ...c, notes } : c)) }))
    toast('Notes saved', 'success')
  }

  const updateOffer = () => {
    if (!selected) return
    const salary = Number(offerSalary) || selected.expectedSalary
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.updateCandidate(selected.id, { offerSalary: salary }),
        successMessage: 'Offer salary updated',
        errorTitle: 'Could not update offer',
      })
      return
    }
    update((d) => ({ ...d, candidates: d.candidates.map((c) => (c.id === selected.id ? { ...c, offerSalary: Number(offerSalary) || c.expectedSalary } : c)) }))
    toast('Offer salary updated', 'success')
  }

  const setOfferStatus = (status: 'Sent' | 'Accepted' | 'Declined') => {
    if (!selected) return
    if (dataSource === 'api') {
      const salary = Number(offerSalary) || selected.offerSalary || selected.expectedSalary
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () =>
          hrActions.updateCandidate(selected.id, {
            offerSalary: salary,
            offerStatus: status,
            ...(status === 'Accepted' ? { stage: 'Hired' as CandidateStage } : {}),
          }),
        successMessage: `Offer ${status.toLowerCase()}`,
        successDescription: status === 'Accepted' ? 'Candidate moved to Hired. Convert them into an employee when ready.' : undefined,
        errorTitle: 'Could not update offer',
      })
      return
    }
    update((d) => ({
      ...d,
      candidates: d.candidates.map((c) => (c.id === selected.id ? {
        ...c,
        offerSalary: Number(offerSalary) || c.offerSalary || c.expectedSalary,
        offerStatus: status,
        ...(status === 'Accepted' ? { stage: 'Hired' as CandidateStage } : {}),
      } : c)),
    }))
    logActivity('recruitment', `Offer ${status.toLowerCase()}`, `${selected.name} · ${jobMap.get(selected.jobId)?.title}`)
    toast(`Offer ${status.toLowerCase()}`, status === 'Accepted' ? 'success' : 'info', status === 'Accepted' ? 'Candidate moved to Hired. Convert them into an employee when ready.' : undefined)
  }

  const convertToEmployee = () => {
    if (!selected) return
    if (selected.convertedEmployeeId) {
      navigate(`/employees/${selected.convertedEmployeeId}`)
      return
    }
    const existing = db.employees.find((e) => e.email.toLowerCase() === selected.email.toLowerCase())
    if (existing) {
      toast('Employee already exists', 'error', `${existing.id} already uses ${selected.email}. No duplicate record was created.`)
      return
    }
    if (dataSource === 'api') {
      const job = jobMap.get(selected.jobId)
      const departmentId = db.settings.departments.find((d) => d.name === job?.department)?.id
      const [first, ...rest] = selected.name.split(' ')
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: async () => {
          const created = await hrActions.createEmployee({
            firstName: first,
            lastName: rest.join(' ') || '—',
            email: selected.email,
            phone: selected.phone,
            ...(departmentId ? { departmentId } : {}),
            employmentType: job?.employmentType || 'Full-time',
            employeeStatus: 'Probation',
            joiningDate: daysAhead(14),
            workLocation: job?.location || undefined,
            currentCtc: selected.offerSalary || selected.expectedSalary || 0,
            bio: `Joined through the ${job?.title || 'hiring'} pipeline. Profile created from a hired candidate.`,
          })
          await hrActions.updateCandidate(selected.id, { stage: 'Hired', offerStatus: 'Accepted' })
          return created
        },
        successMessage: 'Employee record created',
        successDescription: `${selected.name} was created as an employee. Personal details can be completed from the employee profile.`,
        errorTitle: 'Could not convert candidate',
      })
      return
    }
    const job = jobMap.get(selected.jobId)
    const manager = db.employees.find((e) => fullName(e) === job?.hiringManager)
    const maxId = Math.max(...db.employees.map((e) => Number(e.id.replace(/\D/g, '')) || 0), 0)
    const [first, ...rest] = selected.name.split(' ')
    const newId = `EMP-${String(maxId + 1).padStart(3, '0')}`
    const resumeDoc: DocFile = {
      id: uid('doc'), name: selected.resumeName, type: 'application/pdf', size: 186000,
      uploadedAt: new Date().toISOString(), status: 'Pending',
    }
    const employee: Employee = {
      id: newId,
      firstName: first,
      lastName: rest.join(' ') || '—',
      photo: '',
      email: selected.email,
      phone: selected.phone,
      department: job?.department || 'Operations',
      designation: job?.title || 'New Hire',
      managerId: manager?.id || null,
      manager: manager ? fullName(manager) : job?.hiringManager || 'Executive Office',
      employmentType: job?.employmentType || 'Full-time',
      joiningDate: daysAhead(14),
      status: 'Probation',
      location: job?.location || '',
      gender: 'Other',
      dob: '1995-01-01',
      address: '',
      emergencyContact: '',
      bankAccount: '•••• 0000',
      salary: selected.offerSalary || selected.expectedSalary || 0,
      skills: [],
      documents: [resumeDoc],
      bio: `Joined through the ${job?.title || 'hiring'} pipeline. Profile created from a hired candidate.`,
    }
    update((d) => ({
      ...d,
      employees: [employee, ...d.employees],
      candidates: d.candidates.map((c) => (c.id === selected.id ? { ...c, convertedEmployeeId: newId, offerStatus: 'Accepted' } : c)),
    }))
    logActivity('recruitment', 'Candidate converted to employee', `${selected.name} · ${newId}`)
    toast('Employee record created', 'success', `${selected.name} is now ${newId}. Personal details can be completed from the employee profile.`)
  }

  const downloadCandidateResume = () => {
    if (!selected) return
    const content = `TITAN HR — DEMO RESUME\n\nCandidate: ${selected.name}\nRole: ${jobMap.get(selected.jobId)?.title}\nEmail: ${selected.email}\nPhone: ${selected.phone}\nExperience: ${selected.experience} years\nCurrent company: ${selected.currentCompany}\nExpected salary: ${fmtMoney(selected.expectedSalary)}\n\nThis is a placeholder resume generated from demo data. No real document is stored.`
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = selected.resumeName.replace(/\.pdf$/i, '.txt')
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Resume exported', 'success', 'A demo placeholder resume was downloaded.')
  }

  const exportCandidates = () => {
    downloadCSV(`titan-hr-candidates-${todayISO()}.csv`, [
      ['Candidate ID', 'Name', 'Email', 'Phone', 'Role', 'Department', 'Stage', 'Experience (yrs)', 'Current company', 'Expected salary', 'Source', 'Applied on', 'Rating', 'Interview date', 'Rejection reason'],
      ...filteredCandidates.map((c) => { const j = jobMap.get(c.jobId); return [c.id, c.name, c.email, c.phone, j?.title || '', j?.department || '', c.stage, c.experience, c.currentCompany, c.expectedSalary, c.source, c.appliedOn, c.rating, c.interview?.date || '', c.rejectionReason || ''] }),
    ])
    toast('Candidate export ready', 'success', `${filteredCandidates.length} candidates written to CSV.`)
  }

  const boardCandidates = (stage: CandidateStage) => filteredCandidates.filter((c) => c.stage === stage)

  const stageIndex = selected ? STAGES.findIndex((s) => s.key === selected.stage) : -1

  return (
    <div>
      {useApi && (jobsQuery.loading || candidatesQuery.loading) && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading recruitment data…</p>
          </div>
        </div>
      )}
      {useApi && (jobsQuery.error || candidatesQuery.error) && (
        <div className="text-center py-12">
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-6 py-8 max-w-md mx-auto dark:bg-rose-500/10 dark:border-rose-500/20">
            <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-300">Unable to load recruitment data</h3>
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{jobsQuery.error || candidatesQuery.error}</p>
            <button
              onClick={() => { jobsQuery.refetch(); candidatesQuery.refetch() }}
              className="mt-4 px-4 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {!useApi || (!(jobsQuery.loading || candidatesQuery.loading) && !(jobsQuery.error || candidatesQuery.error)) && (
        <>
        <PageHeader
        title="Recruitment"
        subtitle="Move candidates through your hiring pipeline, coordinate interviews and convert hires into employees."
        crumbs={['Talent', 'Recruitment']}
        actions={
          <>
            {useApi && (
              <Button variant="secondary" onClick={() => void jobsQuery.refetch()} disabled={jobsQuery.loading || candidatesQuery.loading}>
                <RefreshCw className={`h-4 w-4 ${jobsQuery.loading || candidatesQuery.loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            )}
            <Button variant="secondary" onClick={exportCandidates}><Download className="h-4 w-4" /> Export</Button>
            {access.can('recruitment.write') && (
              <>
                <Button variant="secondary" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add candidate</Button>
                <Button onClick={() => openJobModal()}><BriefcaseBusiness className="h-4 w-4" /> Post a job</Button>
              </>
            )}
          </>
        }
      />

      {!access.can('recruitment.write') && (
        <HrPermissionNotice className="mb-4" message={`${describeMissingPermission('recruitment.write')} You can review the pipeline but cannot change jobs or candidates.`} />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard index={0} label="Open positions" value={openPositions} icon={BriefcaseBusiness} tone="brand" hint={`${openJobs.length} live job openings`} />
        <StatCard index={1} label="Active candidates" value={activeCandidates.length} icon={Users} tone="blue" hint={`${allCandidates.filter((c) => c.stage === 'Screening').length} in screening`} />
        <StatCard index={2} label="Interviews" value={interviews.length} icon={Video} tone="violet" hint="scheduled upcoming" />
        <StatCard index={3} label="Offers out" value={offers.length} icon={CircleDollarSign} tone="amber" hint={`${offers.filter((o) => o.offerStatus === 'Accepted').length} accepted`} />
        <StatCard index={4} label="Hired" value={hired.length} icon={CheckCircle2} tone="green" hint={`${hired.filter((h) => !h.convertedEmployeeId).length} awaiting conversion`} />
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-2 dark:border-white/[0.05] lg:flex-row lg:items-end lg:justify-between sm:px-5">
          <Tabs<'pipeline' | 'jobs'> value={tab} onChange={setTab} items={[{ id: 'pipeline', label: 'Candidate pipeline', count: activeCandidates.length }, { id: 'jobs', label: 'Job openings', count: openJobs.length }]} />
          {tab === 'pipeline' && (
            <div className="flex rounded-lg bg-slate-100 p-0.5 mb-2 dark:bg-white/[0.05]">
              <button onClick={() => setView('board')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${view === 'board' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}><LayoutGrid className="h-3.5 w-3.5" /> Board</button>
              <button onClick={() => setView('table')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${view === 'table' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}><List className="h-3.5 w-3.5" /> Table</button>
            </div>
          )}
        </div>

        {tab === 'pipeline' && (
          <>
            <div className="flex flex-col gap-2 border-b border-slate-100 p-4 dark:border-white/[0.05] sm:flex-row sm:items-center">
              <SearchInput value={search} onChange={setSearch} placeholder="Search candidates, roles or sources…" className="w-full sm:max-w-sm" />
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}><option value="All">All job openings</option>{allJobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</Select>
                {view === 'table' && <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}><option value="All">All stages</option>{[...STAGES.map((s) => s.key), 'Rejected' as const].map((s) => <option key={s}>{s}</option>)}</Select>}
              </div>
            </div>

            {view === 'board' ? (
              <div className="overflow-x-auto p-4">
                <div className="grid min-w-[1000px] grid-cols-5 gap-3">
                  {STAGES.map((stage) => {
                    const cards = boardCandidates(stage.key)
                    return (
                      <div
                        key={stage.key}
                        onDragOver={(e) => { if (!access.can('recruitment.write')) return; e.preventDefault(); setDragOver(stage.key) }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOver(null)
                          if (!access.can('recruitment.write')) {
                            toast('Action not available', 'warning', `${describeMissingPermission('recruitment.write')} The candidate stage was not changed.`)
                            return
                          }
                          const id = e.dataTransfer.getData('text/plain')
                          const candidate = allCandidates.find((c) => c.id === id)
                          if (candidate) moveStage(candidate, stage.key)
                        }}
                        className={`flex min-h-[420px] flex-col rounded-xl border p-2 transition-colors ${dragOver === stage.key ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-500/10' : 'border-slate-100 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.015]'}`}
                      >
                        <div className="mb-2 flex items-center justify-between px-1.5 py-1">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">{stage.label}</span>
                          </div>
                          <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-300">{cards.length}</span>
                        </div>
                        <div className="space-y-2">
                          {cards.map((c) => {
                            const job = jobMap.get(c.jobId)
                            return (
                              <div
                                key={c.id}
                                draggable={access.can('recruitment.write')}
                                onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move' }}
                                onClick={() => setSelectedId(c.id)}
                                className="group cursor-grab rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md active:cursor-grabbing dark:border-white/[0.08] dark:bg-ink-900 dark:hover:border-brand-500/40"
                              >
                                <div className="flex items-start gap-2.5">
                                  <Avatar name={c.name} size="sm" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">{c.name}</p>
                                    <p className="truncate text-[10px] text-slate-400">{job?.title}</p>
                                  </div>
                                  {c.rating > 0 && <span className="flex shrink-0 items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"><Star className="h-2.5 w-2.5 fill-current" /> {c.rating}</span>}
                                </div>
                                <div className="mt-2.5 flex items-center justify-between text-[9.5px] text-slate-400">
                                  <span className="flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-slate-300" />{c.source}</span>
                                  <span>{c.experience} yrs exp</span>
                                </div>
                                {stage.key === 'Interview' && c.interview && (
                                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-violet-50 px-2 py-1.5 text-[9.5px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                                    <CalendarClock className="h-3 w-3" /> {fmtDateShort(c.interview.date)} · {c.interview.time}
                                  </div>
                                )}
                                {stage.key === 'Offer' && (
                                  <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 px-2 py-1.5 text-[9.5px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                    <span>{fmtMoney(c.offerSalary || c.expectedSalary, true)}</span><span>{c.offerStatus || 'Draft'}</span>
                                  </div>
                                )}
                                {stage.key === 'Hired' && (
                                  <div className={`mt-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[9.5px] font-semibold ${c.convertedEmployeeId ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400'}`}>
                                    {c.convertedEmployeeId ? <><Check className="h-3 w-3" /> {c.convertedEmployeeId}</> : 'Awaiting conversion'}
                                  </div>
                                )}
                                <div className="mt-2 flex items-center justify-between border-t border-slate-50 pt-1.5 dark:border-white/[0.04]">
                                  <span className="text-[9px] text-slate-400">Applied {relativeTime(c.appliedOn)}</span>
                                  <ChevronRight className="h-3 w-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                                </div>
                              </div>
                            )
                          })}
                          {cards.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 px-3 py-7 text-center text-[10px] text-slate-400 dark:border-white/10">Drop candidates here</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-center text-[10px] text-slate-400">Drag candidate cards between columns to update their stage — changes are saved locally.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px]">
                    <thead className="bg-slate-50/80 dark:bg-white/[0.025]"><tr><th className="table-head">Candidate</th><th className="table-head">Applied for</th><th className="table-head">Stage</th><th className="table-head">Experience</th><th className="table-head">Source</th><th className="table-head">Rating</th><th className="table-head">Applied</th><th className="table-head text-right">Actions</th></tr></thead>
                    <tbody>
                      {tableRows.map((c) => {
                        const job = jobMap.get(c.jobId)
                        return (
                          <tr key={c.id} className="table-row cursor-pointer" onClick={() => setSelectedId(c.id)}>
                            <td className="table-cell"><div className="flex items-center gap-2.5"><Avatar name={c.name} size="sm" /><div><p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{c.name}</p><p className="text-[10px] text-slate-400">{c.email}</p></div></div></td>
                            <td className="table-cell"><p className="max-w-[180px] truncate">{job?.title}</p><p className="text-[10px] text-slate-400">{job?.department}</p></td>
                            <td className="table-cell"><Badge tone={stageTone(c.stage)} dot>{c.stage}</Badge></td>
                            <td className="table-cell tabular">{c.experience} yrs</td>
                            <td className="table-cell">{c.source}</td>
                            <td className="table-cell"><span className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < c.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} />)}</span></td>
                            <td className="table-cell">{fmtDate(c.appliedOn)}</td>
                            <td className="table-cell text-right"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedId(c.id) }}>View <ArrowUpRight className="h-3 w-3" /></Button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {tableRows.length === 0 && <EmptyState icon={Users} title="No candidates found" description="Try a different search or filter, or add a new candidate." action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add candidate</Button>} />}
                </div>
                {totalItems > 0 && <Pagination page={currentPage} totalPages={totalPages} total={totalItems} from={filteredCandidates.length ? from + 1 : 0} to={filteredCandidates.length ? from + Math.min(pageSize, filteredCandidates.length) : 0} onPage={setPage} pageSize={candidateMeta?.pageSize ?? pageSize} onPageSize={setPageSize} label="candidates" />}
              </>
            )}
          </>
        )}

        {tab === 'jobs' && (
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage vacancy details, hiring owners and application deadlines.</p>
              <Button size="sm" onClick={() => openJobModal()}><Plus className="h-3.5 w-3.5" /> New job opening</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {allJobs.map((job) => {
                const applicants = allCandidates.filter((c) => c.jobId === job.id)
                const active = applicants.filter((c) => c.stage !== 'Rejected' && c.stage !== 'Hired')
                return (
                  <div key={job.id} className="group flex flex-col rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:shadow-md dark:border-white/[0.07] dark:hover:border-brand-500/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{job.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{job.id} · {job.department}</p>
                      </div>
                      <Badge tone={job.status === 'Open' ? 'green' : job.status === 'On Hold' ? 'amber' : 'slate'} dot>{job.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                      <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3 w-3" /> {job.employmentType}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job.openings} opening{job.openings > 1 ? 's' : ''}</span>
                    </div>
                    <p className="mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{job.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-[10px] dark:bg-white/[0.03]">
                      <div><p className="text-slate-400">Applicants</p><p className="mt-0.5 text-base font-bold text-slate-800 dark:text-slate-100">{applicants.length}</p></div>
                      <div><p className="text-slate-400">Active pipeline</p><p className="mt-0.5 text-base font-bold text-slate-800 dark:text-slate-100">{active.length}</p></div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                      <span>Posted {fmtDateShort(job.posted)}</span><span>·</span><span>Closes {fmtDateShort(job.deadline)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[8px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{job.hiringManager.split(' ').map((n) => n[0]).join('')}</span>{job.hiringManager}</div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openJobModal(job)}>Edit</Button>
                        <Button variant="subtle" size="sm" onClick={() => { setJobFilter(job.id); setTab('pipeline'); setView('board') }}>Pipeline <ArrowUpRight className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name || 'Candidate'}
        description={selected ? `${selected.id} · applied ${fmtDate(selected.appliedOn)}` : ''}
        width="lg"
        footer={selected ? (
          selected.stage === 'Hired' ? (
            selected.convertedEmployeeId
              ? <><Button variant="secondary" onClick={() => navigate(`/employees/${selected.convertedEmployeeId}`)}>View employee</Button><Button onClick={() => setSelectedId(null)}>Close</Button></>
              : <><Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button><Button onClick={convertToEmployee}><UserPlus className="h-4 w-4" /> Convert to employee</Button></>
          ) : selected.stage === 'Rejected' ? (
            <><Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button><Button onClick={() => { setSelectedId(null); setTab('pipeline') }}>Back to pipeline</Button></>
          ) : (
            <>
              {access.can('recruitment.write') ? (
                <>
                  <Button variant="secondary" onClick={() => setRejectOpen(true)}><X className="h-4 w-4" /> Reject</Button>
                  {selected.stage === 'Interview' && <Button variant="secondary" onClick={openSchedule}><CalendarClock className="h-4 w-4" /> Reschedule</Button>}
                  <Button onClick={() => moveStage(selected, STAGES[Math.min(stageIndex + 1, STAGES.length - 1)].key)}>
                    Advance to {STAGES[Math.min(stageIndex + 1, STAGES.length - 1)].label} <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <span className="text-[11px] text-slate-400" title={describeMissingPermission('recruitment.write')}>
                  {describeMissingPermission('recruitment.write')}
                </span>
              )}
            </>
          )
        ) : null}
      >
        {selected && (() => {
          const job = jobMap.get(selected.jobId)
          return (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Avatar name={selected.name} size="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{selected.name}</h3><Badge tone={stageTone(selected.stage)} dot>{selected.stage}</Badge></div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{job?.title} · {job?.department}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selected.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selected.phone}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < selected.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} />)}
                    <span className="ml-1 text-[11px] text-slate-400">{selected.rating}/5 rating</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {STAGES.map((s, i) => {
                  const done = selected.stage !== 'Rejected' && i <= stageIndex
                  return (
                    <div key={s.key} className="flex flex-1 items-center gap-1">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${done ? 'text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`} style={done ? { background: s.color } : undefined}>{done ? <Check className="h-3 w-3" /> : i + 1}</div>
                      {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < stageIndex && selected.stage !== 'Rejected' ? 'bg-brand-400' : 'bg-slate-100 dark:bg-white/10'}`} />}
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-white/[0.03]">
                {[['Experience', `${selected.experience} years`], ['Current company', selected.currentCompany || '—'], ['Expected salary', fmtMoney(selected.expectedSalary)], ['Source', selected.source]].map(([label, value]) => (
                  <div key={label}><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">{value}</p></div>
                ))}
              </div>

              <button onClick={() => setResumeOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-brand-200 dark:border-white/[0.06] dark:hover:border-brand-500/30">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-500/10"><FileText className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{selected.resumeName}</span><span className="block text-[10px] text-slate-400">Resume · demo attachment</span></span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <div className="rounded-xl border border-slate-100 p-4 dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold"><Video className="h-3.5 w-3.5 text-violet-500" /> Interview</h4>
                  <button onClick={openSchedule} className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">{selected.interview ? 'Edit' : 'Schedule'}</button>
                </div>
                {selected.interview ? (
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <Badge tone="violet">{selected.interview.round}</Badge>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{fmtDate(selected.interview.date)} · {selected.interview.time}</span>
                      <span className="text-slate-400">· {selected.interview.mode} · {selected.interview.interviewer}</span>
                    </div>
                    {selected.interview.feedback ? (
                      <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">
                        <div className="mb-1 flex items-center gap-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-2.5 w-2.5 ${i < (selected.interview?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} />)}</div>
                        {selected.interview.feedback}
                      </div>
                    ) : <p className="mt-2 text-[11px] text-slate-400">No feedback recorded yet.</p>}
                    {access.can('recruitment.write') ? (
                      <button onClick={() => { setFeedback({ rating: selected.interview?.rating || 4, feedback: selected.interview?.feedback || '' }); setFeedbackOpen(true) }} className="mt-2 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">{selected.interview.feedback ? 'Update feedback' : 'Add interview feedback'}</button>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-400" title={describeMissingPermission('recruitment.write')}>Feedback requires recruitment write permission.</p>
                    )}
                  </div>
                ) : <p className="mt-2 text-[11px] text-slate-400">No interview scheduled. Schedule one to move this candidate forward.</p>}
              </div>

              {(selected.stage === 'Offer' || selected.stage === 'Hired' || selected.offerSalary) && (
                <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.04]">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold"><CircleDollarSign className="h-3.5 w-3.5 text-amber-500" /> Offer</h4>
                    {selected.offerStatus && <Badge tone={selected.offerStatus === 'Accepted' ? 'green' : selected.offerStatus === 'Declined' ? 'red' : 'amber'}>{selected.offerStatus}</Badge>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span><Input type="number" value={offerSalary} onChange={(e) => setOfferSalary(e.target.value)} className="h-9 pl-7 text-xs" disabled={!access.can('recruitment.write')} /></div>
                    {access.can('recruitment.write') && (
                      <Button size="sm" variant="secondary" onClick={updateOffer}>Update</Button>
                    )}
                  </div>
                  {access.can('recruitment.write') && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => setOfferStatus('Sent')}>Send offer</Button>
                      <Button size="sm" variant="outline" onClick={() => setOfferStatus('Accepted')}><Check className="h-3.5 w-3.5" /> Mark accepted</Button>
                      <Button size="sm" variant="ghost" onClick={() => setOfferStatus('Declined')}>Declined</Button>
                    </div>
                  )}
                </div>
              )}

              {selected.stage === 'Rejected' && selected.rejectionReason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/[0.06] dark:text-rose-300"><p className="font-semibold">Rejection reason</p><p className="mt-1 leading-relaxed">{selected.rejectionReason}</p></div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between"><label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Notes</label>{access.can('recruitment.write') && <button onClick={saveNotes} className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">Save notes</button>}</div>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Interview notes, salary discussion, references…" disabled={!access.can('recruitment.write')} />
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Move to another stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...STAGES.map((s) => s.key), 'Rejected' as const].map((stage) => (
                    <button key={stage} disabled={selected.stage === stage} onClick={() => { if (stage === 'Rejected') setRejectOpen(true); else moveStage(selected, stage) }} className={`rounded-lg px-2.5 py-1.5 text-[10.5px] font-semibold transition disabled:cursor-default ${selected.stage === stage ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-white/10'}`}>{stage}</button>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </Drawer>

      <Modal open={resumeOpen} onClose={() => setResumeOpen(false)} title={selected?.resumeName || 'Resume'} description="Demo attachment — no real file is stored." size="md" footer={<><Button variant="secondary" onClick={() => setResumeOpen(false)}>Close</Button><Button onClick={downloadCandidateResume}><Download className="h-4 w-4" /> Download placeholder</Button></>}>
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10"><FileText className="h-6 w-6" /></div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selected?.name}</p>
          <p className="mt-1 text-xs text-slate-400">{selected?.experience} years experience · {selected?.currentCompany}</p>
          <p className="mt-3 max-w-sm text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Resume previews are simulated for the demo. Uploaded candidate files would be rendered here in a production integration.</p>
        </div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add candidate" description="Create a candidate record in the applied stage." size="lg" footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={saveCandidate}>Add candidate</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}><Input value={candidateForm.name} onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })} placeholder="e.g. Nadia Rahman" invalid={!!errors.name} /></Field>
          <Field label="Email" required error={errors.email}><Input type="email" value={candidateForm.email} onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })} placeholder="candidate@example.com" invalid={!!errors.email} /></Field>
          <Field label="Phone" required error={errors.phone}><Input value={candidateForm.phone} onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })} placeholder="+1 555 000 0000" invalid={!!errors.phone} /></Field>
          <Field label="Applied for" required error={errors.jobId}><Select value={candidateForm.jobId} onChange={(e) => setCandidateForm({ ...candidateForm, jobId: e.target.value })}><option value="">Select job opening</option>{allJobs.filter((j) => j.status !== 'Closed').map((j) => <option key={j.id} value={j.id}>{j.title} · {j.department}</option>)}</Select></Field>
          <Field label="Source"><Select value={candidateForm.source} onChange={(e) => setCandidateForm({ ...candidateForm, source: e.target.value })}>{['LinkedIn', 'Referral', 'Careers page', 'Agency', 'Job board', 'University fair', 'Other'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Experience (years)"><Input type="number" min={0} value={candidateForm.experience} onChange={(e) => setCandidateForm({ ...candidateForm, experience: e.target.value })} /></Field>
          <Field label="Current company"><Input value={candidateForm.currentCompany} onChange={(e) => setCandidateForm({ ...candidateForm, currentCompany: e.target.value })} placeholder="Current employer" /></Field>
          <Field label="Expected salary (USD)"><Input type="number" min={0} value={candidateForm.expectedSalary} onChange={(e) => setCandidateForm({ ...candidateForm, expectedSalary: e.target.value })} placeholder="120000" /></Field>
          <Field label="Resume" className="sm:col-span-2">
            <FileDrop compact label="Upload resume" hint="PDF or DOCX · 10 MB" accept=".pdf,.doc,.docx" onFiles={(docs) => setCandidateForm({ ...candidateForm, resumeName: docs[0]?.name || 'Resume.pdf' })} />
            <p className="mt-1 text-[10px] text-slate-400">Attached: {candidateForm.resumeName}</p>
          </Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea value={candidateForm.notes} onChange={(e) => setCandidateForm({ ...candidateForm, notes: e.target.value })} placeholder="Screening notes, portfolio links, availability…" /></Field>
        </div>
      </Modal>

      <Modal open={jobOpen} onClose={() => setJobOpen(false)} title={editingJob ? 'Edit job opening' : 'Post a new job'} description="Vacancy details appear in the recruitment workspace and reports." size="lg" footer={<><Button variant="secondary" onClick={() => setJobOpen(false)}>Cancel</Button><Button onClick={saveJob}>{editingJob ? 'Save changes' : 'Post job'}</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job title" required error={errors.title} className="sm:col-span-2"><Input value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} placeholder="e.g. Senior Frontend Engineer" invalid={!!errors.title} /></Field>
          <Field label="Department" required error={errors.department}><Select value={jobForm.department} onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select></Field>
          <Field label="Location" required error={errors.location}><Input value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} placeholder="Remote, EU" invalid={!!errors.location} /></Field>
          <Field label="Employment type"><Select value={jobForm.employmentType} onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value as EmploymentType })}>{db.settings.employmentTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}</Select></Field>
          <Field label="Number of openings" required error={errors.openings}><Input type="number" min={1} value={jobForm.openings} onChange={(e) => setJobForm({ ...jobForm, openings: e.target.value })} invalid={!!errors.openings} /></Field>
          <Field label="Application deadline" required error={errors.deadline}><Input type="date" value={jobForm.deadline} onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })} invalid={!!errors.deadline} /></Field>
          <Field label="Hiring manager"><Select value={jobForm.hiringManager} onChange={(e) => setJobForm({ ...jobForm, hiringManager: e.target.value })}>{db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={fullName(e)}>{fullName(e)} · {e.designation}</option>)}</Select></Field>
          <Field label="Status"><Select value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: e.target.value as JobOpening['status'] })}><option>Open</option><option>On Hold</option><option>Closed</option></Select></Field>
          <Field label="Role description" className="sm:col-span-2"><Textarea value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} placeholder="What the role involves and who would thrive in it…" /></Field>
        </div>
      </Modal>

      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Schedule interview" description={selected ? `${selected.name} · ${jobMap.get(selected.jobId)?.title}` : ''} footer={<><Button variant="secondary" onClick={() => setScheduleOpen(false)}>Cancel</Button><Button onClick={saveSchedule}>Schedule interview</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Interview round" className="sm:col-span-2"><Select value={scheduleForm.round} onChange={(e) => setScheduleForm({ ...scheduleForm, round: e.target.value })}>{['Screening Call', 'Technical Interview', 'Portfolio Review', 'Culture Fit', 'Panel Interview', 'Final Interview'].map((r) => <option key={r}>{r}</option>)}</Select></Field>
          <Field label="Date" required><Input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} /></Field>
          <Field label="Time" required><Input type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })} /></Field>
          <Field label="Interviewer" required><Select value={scheduleForm.interviewer} onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer: e.target.value })}>{db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={fullName(e)}>{fullName(e)}</option>)}</Select></Field>
          <Field label="Mode"><Select value={scheduleForm.mode} onChange={(e) => setScheduleForm({ ...scheduleForm, mode: e.target.value as typeof scheduleForm.mode })}><option>Video</option><option>On-site</option><option>Phone</option></Select></Field>
        </div>
      </Modal>

      <Modal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} title="Interview feedback" description={selected ? `${selected.interview?.round} · ${selected.name}` : ''} footer={<><Button variant="secondary" onClick={() => setFeedbackOpen(false)}>Cancel</Button><Button onClick={saveFeedback}>Save feedback</Button></>}>
        <div className="space-y-4">
          <Field label="Overall rating">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setFeedback({ ...feedback, rating: n })} className="rounded-lg p-1"><Star className={`h-7 w-7 transition ${n <= feedback.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-200 dark:text-slate-600'}`} /></button>
              ))}
              <span className="ml-2 self-center text-sm font-semibold text-slate-600 dark:text-slate-300">{feedback.rating}.0 / 5</span>
            </div>
          </Field>
          <Field label="Feedback notes"><Textarea value={feedback.feedback} onChange={(e) => setFeedback({ ...feedback, feedback: e.target.value })} placeholder="Technical depth, communication, collaboration, areas of concern…" /></Field>
        </div>
      </Modal>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject candidate" description={selected ? `${selected.name} will move to the rejected list. This can be changed later.` : ''} footer={<><Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="danger" onClick={rejectCandidate}>Confirm rejection</Button></>}>
        <div className="space-y-4">
          <Field label="Rejection reason" required>
            <Select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
              <option value="">Select a reason</option>
              <option>Experience below the required level for this role.</option>
              <option>Compensation expectations above the approved band.</option>
              <option>Strong candidate, but not the best fit for this team.</option>
              <option>Withdrew from the process.</option>
              <option>Failed to attend the scheduled interview.</option>
              <option value="Other">Other (add a note in candidate notes)</option>
            </Select>
          </Field>
          <Field label="Additional note"><Textarea value={rejectReason.startsWith('Other') ? rejectReason.replace('Other', '').trim() : ''} onChange={(e) => setRejectReason(e.target.value ? e.target.value : 'Other')} placeholder="Optional context for the hiring team…" /></Field>
        </div>
      </Modal>
    </>
  )}
  </div>
  )
}
