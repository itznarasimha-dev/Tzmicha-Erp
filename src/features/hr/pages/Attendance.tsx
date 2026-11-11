import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, Clock, Download, Eye, LayoutGrid,
  List, PencilLine, Plus, RefreshCw, RotateCcw, X,
} from 'lucide-react'
import { useStore } from '../store'
import { useAttendance, useCorrections } from '../useHrData'
import type { AttendanceCorrection, AttendanceStatus, Employee } from '../types'
import {
  addDays, downloadCSV, fmtDate, fmtDateShort, fullName, hoursBetween, sum, todayISO, toISO,
} from '../lib/utils'
import { runHrApiAction, hrActions } from '../api-actions'
import {
  Avatar, Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination,
  SearchInput, Select, StatCard, StatusBadge, Tabs, Textarea,
} from '../components/ui'

type Mode = 'day' | 'week' | 'month'
type Tab = 'records' | 'corrections'

const startOfWeek = (iso: string) => {
  const d = new Date(iso + 'T12:00:00')
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return toISO(d)
}

const endOfWeek = (iso: string) => addDays(startOfWeek(iso), 6)

const monthRange = (iso: string) => {
  const d = new Date(iso + 'T12:00:00')
  const start = toISO(new Date(d.getFullYear(), d.getMonth(), 1))
  const end = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  return { start, end }
}

export default function Attendance() {
  const { db, update, toast, logActivity, dataSource, refreshFromApi } = useStore()
  const navigate = useNavigate()
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [decidingCorrection, setDecidingCorrection] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestSaving, setRequestSaving] = useState(false)
  const [requestForm, setRequestForm] = useState({
    employeeId: db.employees[0]?.id || '',
    date: todayISO(),
    status: 'Present' as AttendanceStatus,
    checkIn: '09:00',
    checkOut: '17:30',
    reason: '',
  })
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<Tab>('records')
  const [view, setView] = useState<'table' | 'calendar'>('table')
  const [mode, setMode] = useState<Mode>('day')
  const [date, setDate] = useState(todayISO())
  const [calMonth, setCalMonth] = useState(todayISO().slice(0, 7))
  const [department, setDepartment] = useState('All')
  const [status, setStatus] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editing, setEditing] = useState<{ employeeId: string; date: string; checkIn: string; checkOut: string; status: AttendanceStatus; reason: string } | null>(null)
  const [correctTarget, setCorrectTarget] = useState<AttendanceCorrection | null>(null)
  const [decision, setDecision] = useState<'Approved' | 'Rejected'>('Approved')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')

  const attendanceQuery = useAttendance({
    employeeId: undefined,
    departmentId: department === 'All' ? undefined : undefined,
    status: status === 'All' ? undefined : status as any,
    from: range.start,
    to: range.end,
    page,
    pageSize,
  })
  const correctionsQuery = useCorrections({ status: 'Pending' })

  const useApi = dataSource === 'api'
  const attendanceData = useApi ? attendanceQuery.data : null
  const correctionsData = useApi ? correctionsQuery.data : null

  const allAttendance = attendanceData?.data ?? db.attendance
  const allCorrections = correctionsData?.data ?? (db.corrections || [])

  useEffect(() => { setPage(1) }, [mode, date, department, status, search, pageSize])

  const range = useMemo(() => {
    if (mode === 'day') return { start: date, end: date, label: fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
    if (mode === 'week') return { start: startOfWeek(date), end: endOfWeek(date), label: `${fmtDateShort(startOfWeek(date))} – ${fmtDate(endOfWeek(date))}` }
    const r = monthRange(date)
    return { ...r, label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
  }, [mode, date])

  const rangeRecords = useMemo(() => allAttendance.filter((a) => a.date >= range.start && a.date <= range.end), [allAttendance, range])

  const empMap = useMemo(() => new Map(db.employees.map((e) => [e.id, e])), [db.employees])

  const matchEmployee = (e?: Employee) => {
    if (!e) return false
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || fullName(e).toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q)
    return matchesSearch && (department === 'All' || e.department === department)
  }

  const summary = useMemo(() => {
    const records = rangeRecords
    const presentish = records.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length
    return {
      present: records.filter((a) => a.status === 'Present').length,
      late: records.filter((a) => a.status === 'Late').length,
      absent: records.filter((a) => a.status === 'Absent').length,
      leave: records.filter((a) => a.status === 'On Leave').length,
      remote: records.filter((a) => a.status === 'Remote').length,
      hours: sum(records.map((a) => a.hours)),
      rate: records.length ? Math.round((presentish / records.length) * 100) : 0,
      total: records.length,
    }
  }, [rangeRecords])

  const dailyRows = useMemo(() => {
    return rangeRecords
      .map((a) => ({ record: a, employee: empMap.get(a.employeeId) }))
      .filter((r) => r.employee && matchEmployee(r.employee) && (status === 'All' || r.record.status === status))
      .sort((a, b) => fullName(a.employee!).localeCompare(fullName(b.employee!)))
  }, [rangeRecords, empMap, search, department, status])

  const aggregateRows = useMemo(() => {
    const byEmployee = new Map<string, typeof rangeRecords>()
    rangeRecords.forEach((r) => {
      const list = byEmployee.get(r.employeeId) || []
      list.push(r)
      byEmployee.set(r.employeeId, list)
    })
    return Array.from(byEmployee.entries())
      .map(([employeeId, records]) => {
        const employee = empMap.get(employeeId)
        const present = records.filter((r) => ['Present', 'Late', 'Remote', 'Half Day'].includes(r.status)).length
        return {
          employee,
          records,
          present,
          late: records.filter((r) => r.status === 'Late').length,
          absent: records.filter((r) => r.status === 'Absent').length,
          leave: records.filter((r) => r.status === 'On Leave').length,
          remote: records.filter((r) => r.status === 'Remote').length,
          hours: sum(records.map((r) => r.hours)),
          rate: records.length ? Math.round((present / records.length) * 100) : 0,
        }
      })
      .filter((r) => r.employee && matchEmployee(r.employee))
      .sort((a, b) => fullName(a.employee!).localeCompare(fullName(b.employee!)))
  }, [rangeRecords, empMap, department, search])

  const rowCount = mode === 'day' ? dailyRows.length : aggregateRows.length
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize))
  const currentPage = Math.min(page, totalPages)
  const from = (currentPage - 1) * pageSize
  const rowsDaily = dailyRows.slice(from, from + pageSize)
  const rowsAgg = aggregateRows.slice(from, from + pageSize)

  const pendingCorrections = allCorrections.filter((c) => c.status === 'Pending').length

  const exportData = () => {
    let rows: (string | number)[][]
    if (mode === 'day') {
      rows = [['Employee ID', 'Employee', 'Department', 'Date', 'Check in', 'Check out', 'Hours', 'Source', 'Status', 'Note'], ...dailyRows.map(({ record: r, employee: e }) => [e!.id, fullName(e!), e!.department, r.date, r.checkIn || '', r.checkOut || '', r.hours, r.source, r.status, r.note || ''])]
    } else {
      rows = [['Employee ID', 'Employee', 'Department', 'Range', 'Present', 'Late', 'Absent', 'On leave', 'Remote', 'Hours', 'Attendance rate'], ...aggregateRows.map((r) => [r.employee!.id, fullName(r.employee!), r.employee!.department, `${range.start} to ${range.end}`, r.present, r.late, r.absent, r.leave, r.remote, r.hours, `${r.rate}%`])]
    }
    downloadCSV(`titan-hr-attendance-${range.start}-${range.end}.csv`, rows)
    toast('Attendance exported', 'success', `${Math.max(rowCount, 0)} rows written to CSV.`)
  }

  const openCorrection = (employeeId: string, date: string, record?: { checkIn: string | null; checkOut: string | null; status: AttendanceStatus }) => {
    setError('')
    setEditing({
      employeeId,
      date,
      checkIn: record?.checkIn || '09:00',
      checkOut: record?.checkOut || '17:30',
      status: record?.status || 'Present',
      reason: '',
    })
  }

  const saveCorrection = async () => {
    if (!editing || savingCorrection) return
    if (!editing.employeeId) { setError('Select an employee'); return }
    if (!editing.date) { setError('Select a date'); return }
    if (!editing.reason.trim()) { setError('Add a reason for the manual correction'); return }
    if (['Present', 'Late', 'Remote', 'Half Day'].includes(editing.status) && (!editing.checkIn || !editing.checkOut)) {
      setError('Check-in and check-out are required for this status')
      return
    }
    const emp = db.employees.find((e) => e.id === editing.employeeId)
    const hours = editing.checkIn && editing.checkOut && ['Present', 'Late', 'Remote', 'Half Day'].includes(editing.status) ? hoursBetween(editing.checkIn, editing.checkOut) : 0

    if (dataSource === 'api') {
      setSavingCorrection(true)
      const toIso = (t: string) => new Date(`${editing.date}T${t}:00`).toISOString()
      const checkIn = ['Absent', 'On Leave'].includes(editing.status) ? undefined : (editing.checkIn ? toIso(editing.checkIn) : undefined)
      const checkOut = ['Absent', 'On Leave'].includes(editing.status) ? undefined : (editing.checkOut ? toIso(editing.checkOut) : undefined)
      const res = await runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.recordAttendance({
          employeeId: editing.employeeId,
          date: editing.date,
          status: editing.status,
          checkIn,
          checkOut,
          hours,
          note: editing.reason,
          source: 'Manual',
        }),
        successMessage: 'Attendance saved',
        successDescription: `${emp ? fullName(emp) : 'Employee'} marked ${editing.status} for ${fmtDate(editing.date)}.`,
        errorTitle: 'Could not save attendance',
      })
      setSavingCorrection(false)
      if (res.ok) setEditing(null)
      return
    }

    update((d) => {
      const existing = d.attendance.find((a) => a.employeeId === editing.employeeId && a.date === editing.date)
      const record = {
        id: existing?.id || `ATT-${editing.employeeId.replace('EMP-', '')}-${editing.date.replace(/-/g, '')}`,
        employeeId: editing.employeeId,
        date: editing.date,
        checkIn: ['Absent', 'On Leave'].includes(editing.status) ? null : editing.checkIn || null,
        checkOut: ['Absent', 'On Leave'].includes(editing.status) ? null : editing.checkOut || null,
        status: editing.status,
        hours,
        note: editing.reason,
        source: 'Manual' as const,
        corrected: true,
      }
      return {
        ...d,
        attendance: existing ? d.attendance.map((a) => (a.id === existing.id ? record : a)) : [record, ...d.attendance],
      }
    })
    logActivity('attendance', 'Manual attendance correction', `${emp ? fullName(emp) : editing.employeeId} - ${editing.date} - ${editing.status}`)
    toast('Attendance corrected (demo)', 'success', `${emp ? fullName(emp) : 'Employee'} marked ${editing.status} for ${fmtDate(editing.date)} (demo data only).`)
    setEditing(null)
  }

  const submitCorrectionRequest = async () => {
    const next: Record<string, string> = {}
    if (!requestForm.employeeId) next.employeeId = 'Select an employee'
    if (!requestForm.date) next.date = 'Select a date'
    if (!requestForm.reason.trim()) next.reason = 'Add a reason for the correction request'
    if (['Present', 'Late', 'Remote', 'Half Day'].includes(requestForm.status) && (!requestForm.checkIn || !requestForm.checkOut)) {
      next.reason = next.reason ? `${next.reason} Check-in and check-out are required for this status.` : 'Check-in and check-out are required for this status.'
    }
    setRequestErrors(next)
    if (Object.keys(next).length || requestSaving) return

    if (dataSource === 'api') {
      setRequestSaving(true)
      const toIso = (t: string) => new Date(`${requestForm.date}T${t}:00`).toISOString()
      const res = await runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.requestCorrection({
          employeeId: requestForm.employeeId,
          date: requestForm.date,
          requestedStatus: requestForm.status,
          checkIn: ['Absent', 'On Leave'].includes(requestForm.status) ? undefined : (requestForm.checkIn ? toIso(requestForm.checkIn) : undefined),
          checkOut: ['Absent', 'On Leave'].includes(requestForm.status) ? undefined : (requestForm.checkOut ? toIso(requestForm.checkOut) : undefined),
          reason: requestForm.reason.trim(),
        }),
        successMessage: 'Correction request submitted',
        successDescription: 'The request has been sent for review and will appear in the corrections queue.',
        errorTitle: 'Could not submit correction request',
      })
      setRequestSaving(false)
      if (res.ok) setRequestOpen(false)
      return
    }

    setRequestSaving(true)
    window.setTimeout(() => {
      const hr = db.employees.find((e) => e.id === requestForm.employeeId)
      const local: AttendanceCorrection = {
        id: `CR-${Math.max(9000, ...(db.corrections || []).map((c) => Number(c.id.replace(/\D/g, '')) || 9000)) + 1}`,
        employeeId: requestForm.employeeId,
        date: requestForm.date,
        requestedStatus: requestForm.status,
        checkIn: ['Absent', 'On Leave'].includes(requestForm.status) ? null : requestForm.checkIn || null,
        checkOut: ['Absent', 'On Leave'].includes(requestForm.status) ? null : requestForm.checkOut || null,
        reason: requestForm.reason.trim(),
        status: 'Pending',
        requestedAt: todayISO(),
        reviewedBy: undefined,
        remarks: undefined,
      }
      update((d) => ({ ...d, corrections: [...(d.corrections || []), local] }))
      logActivity('attendance', 'Correction request submitted', `${hr ? fullName(hr) : requestForm.employeeId} · ${requestForm.date} · ${requestForm.status}`)
      toast('Correction request submitted (demo)', 'success', `${hr ? fullName(hr) : 'Employee'} requested ${requestForm.status} for ${fmtDate(requestForm.date)}. Demo data is not saved to the database.`)
      setRequestSaving(false)
      setRequestOpen(false)
    }, 350)
  }

  const applyDecision = async () => {
    if (!correctTarget || decidingCorrection) return
    if (decision === 'Rejected' && !remarks.trim()) {
      toast('Add a remark', 'error', 'A reason is required when rejecting a correction request.')
      return
    }
    const target = correctTarget
    const emp = db.employees.find((e) => e.id === target.employeeId)

    if (dataSource === 'api') {
      setDecidingCorrection(true)
      const res = await runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.decideCorrection(target.id, { decision, remarks: remarks.trim() || undefined }),
        successMessage: `Correction ${decision.toLowerCase()}`,
        successDescription: decision === 'Approved' ? 'The attendance record has been updated.' : 'The correction request was rejected.',
        errorTitle: 'Could not process correction',
      })
      setDecidingCorrection(false)
      if (res.ok) { setCorrectTarget(null); setRemarks('') }
      return
    }

    update((d) => {
      const correctionList = d.corrections || []
      let attendanceList = d.attendance
      if (decision === 'Approved') {
        const existing = attendanceList.find((a) => a.employeeId === target.employeeId && a.date === target.date)
        const hours = target.checkIn && target.checkOut ? hoursBetween(target.checkIn, target.checkOut) : 0
        const record = {
          id: existing?.id || `ATT-${target.employeeId.replace('EMP-', '')}-${target.date.replace(/-/g, '')}`,
          employeeId: target.employeeId,
          date: target.date,
          checkIn: target.checkIn,
          checkOut: target.checkOut,
          status: target.requestedStatus,
          hours,
          note: target.reason,
          source: 'Manual' as const,
          corrected: true,
        }
        attendanceList = existing ? attendanceList.map((a) => (a.id === existing.id ? record : a)) : [record, ...attendanceList]
      }
      return {
        ...d,
        attendance: attendanceList,
        corrections: correctionList.map((c) => (c.id === target.id ? { ...c, status: decision, reviewedBy: 'Amara Okafor', remarks } : c)),
      }
    })
    logActivity('attendance', `Attendance correction ${decision.toLowerCase()}`, `${emp ? fullName(emp) : target.employeeId} - ${target.date}`)
    toast(`Correction ${decision.toLowerCase()} (demo)`, decision === 'Approved' ? 'success' : 'info', decision === 'Approved' ? 'Attendance updated in demo data only.' : 'Decision saved in demo data only.')
    setCorrectTarget(null)
    setRemarks('')
  }

  // calendar cells
  const calendar = useMemo(() => {
    const [year, month] = calMonth.split('-').map(Number)
    const first = new Date(year, month - 1, 1)
    const offset = (first.getDay() + 6) % 7
    const days = new Date(year, month, 0).getDate()
    const cells: { iso: string | null; day: number; present: number; absent: number; leave: number }[] = []
    for (let i = 0; i < offset; i++) cells.push({ iso: null, day: 0, present: 0, absent: 0, leave: 0 })
    for (let d = 1; d <= days; d++) {
      const iso = toISO(new Date(year, month - 1, d))
      const records = db.attendance.filter((a) => a.date === iso)
      cells.push({
        iso,
        day: d,
        present: records.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length,
        absent: records.filter((a) => a.status === 'Absent').length,
        leave: records.filter((a) => a.status === 'On Leave').length,
      })
    }
    while (cells.length % 7 !== 0) cells.push({ iso: null, day: 0, present: 0, absent: 0, leave: 0 })
    return cells
  }, [calMonth, db.attendance])

  const shiftMonth = (delta: number) => {
    const [y, m] = calMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div>
      {useApi && attendanceQuery.loading && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading attendance data…</p>
          </div>
        </div>
      )}
      {useApi && attendanceQuery.error && (
        <div className="text-center py-12">
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-6 py-8 max-w-md mx-auto dark:bg-rose-500/10 dark:border-rose-500/20">
            <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-300">Unable to load attendance data</h3>
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{attendanceQuery.error}</p>
            <button
              onClick={() => attendanceQuery.refetch()}
              className="mt-4 px-4 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {!useApi || (!attendanceQuery.loading && !attendanceQuery.error) && (
        <>
        <PageHeader
        title="Attendance"
        subtitle="Track presence, working hours and corrections across every team — with an audit trail for manual changes."
        crumbs={['People', 'Attendance']}
        actions={<><Button variant="secondary" onClick={exportData}><Download className="h-4 w-4" /> Export</Button><Button onClick={() => openCorrection(db.employees[0]?.id || '', date)}><Plus className="h-4 w-4" /> Manual correction</Button><Button onClick={() => { setRequestForm({ employeeId: db.employees[0]?.id || '', date, status: 'Present', checkIn: '09:00', checkOut: '17:30', reason: '' }); setRequestErrors({}); setRequestOpen(true) }}><RefreshCw className="h-4 w-4" /> Request correction</Button></>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard index={0} label="Present" value={summary.present + summary.remote} icon={Check} tone="green" hint={`${summary.remote} remote`} />
        <StatCard index={1} label="Late arrivals" value={summary.late} icon={Clock} tone="violet" hint="after grace period" />
        <StatCard index={2} label="Absent" value={summary.absent} icon={Clock} tone="red" hint="unplanned" />
        <StatCard index={3} label="On leave" value={summary.leave} icon={CalendarDays} tone="amber" hint="approved" />
        <StatCard index={4} label="Attendance rate" value={`${summary.rate}%`} icon={CalendarRange} tone="brand" hint={`${summary.total} records`} />
        <StatCard index={5} label="Hours logged" value={`${Math.round(summary.hours).toLocaleString()}h`} icon={Clock} tone="blue" hint="selected range" />
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-3 dark:border-white/[0.05] lg:flex-row lg:items-end lg:justify-between">
          <Tabs<Tab> value={tab} onChange={setTab} items={[{ id: 'records', label: 'Attendance records' }, { id: 'corrections', label: 'Correction requests', count: pendingCorrections }]} />
          <div className="flex items-center gap-1 pb-2">
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/[0.05]">
              <button onClick={() => setView('table')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${view === 'table' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}><List className="h-3.5 w-3.5" /> Table</button>
              <button onClick={() => setView('calendar')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${view === 'calendar' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}><LayoutGrid className="h-3.5 w-3.5" /> Calendar</button>
            </div>
          </div>
        </div>

        {tab === 'records' && view === 'table' && (
          <>
            <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/[0.05]">
                  {(['day', 'week', 'month'] as Mode[]).map((m) => (
                    <button key={m} onClick={() => setMode(m)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize transition ${mode === m ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{m === 'day' ? 'Daily' : m === 'week' ? 'Weekly' : 'Monthly'}</button>
                  ))}
                </div>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} className="field h-9 w-[160px] pl-9 text-xs" />
                </div>
                <div className="flex items-center gap-1">
                  <IconButton aria-label="Previous period" onClick={() => setDate(addDays(date, mode === 'day' ? -1 : mode === 'week' ? -7 : -30))} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></IconButton>
                  <IconButton aria-label="Next period" onClick={() => setDate(addDays(date, mode === 'day' ? 1 : mode === 'week' ? 7 : 30))} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></IconButton>
                  <button onClick={() => setDate(todayISO())} className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">Today</button>
                </div>
                <Badge tone="slate">{range.label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:ml-auto xl:flex">
                <SearchInput value={search} onChange={setSearch} placeholder="Search employee…" className="col-span-2 sm:col-span-1" />
                <Select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="All">All departments</option>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select>
                {mode === 'day' ? (
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="All">All statuses</option>{['Present', 'Late', 'Remote', 'Absent', 'On Leave', 'Half Day'].map((s) => <option key={s}>{s}</option>)}</Select>
                ) : <div className="hidden xl:block" />}
              </div>
            </div>

            <div className="overflow-x-auto">
              {mode === 'day' ? (
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
                    <tr><th className="table-head">Employee</th><th className="table-head">Check in / out</th><th className="table-head">Hours</th><th className="table-head">Status</th><th className="table-head text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {rowsDaily.map(({ record: r, employee: e }) => (
                      <tr key={r.id} className="table-row">
                        <td className="table-cell">
                          <button onClick={() => navigate(`/employees/${e!.id}`)} className="flex items-center gap-2.5 text-left">
                            <Avatar name={fullName(e!)} src={e!.photo} size="sm" />
                            <span><span className="block text-[13px] font-semibold text-slate-800 hover:text-brand-600 dark:text-slate-100">{fullName(e!)}</span><span className="block text-[10px] text-slate-400">{e!.department} · {e!.designation}</span></span>
                          </button>
                        </td>
                        <td className="table-cell tabular">{r.checkIn ? <span>{r.checkIn} <span className="px-1 text-slate-300">→</span> {r.checkOut || '—'}</span> : '—'}</td>
                        <td className="table-cell tabular">{r.hours ? <span className={r.hours < 6 ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}>{r.hours}h</span> : '—'}</td>
                        <td className="table-cell">
                          <StatusBadge status={r.status} />
                          <p className="mt-1 text-[10px] text-slate-400">{r.source}{r.corrected ? ' · corrected' : ''}</p>
                        </td>
                        <td className="table-cell text-right"><Button variant="ghost" size="sm" onClick={() => openCorrection(e!.id, r.date, r)}><PencilLine className="h-3.5 w-3.5" /> Correct</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[880px]">
                  <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
                    <tr><th className="table-head">Employee</th><th className="table-head">Present</th><th className="table-head">Late</th><th className="table-head">Absent</th><th className="table-head">Leave</th><th className="table-head">Hours</th><th className="table-head">Attendance</th><th className="table-head text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {rowsAgg.map((r) => (
                      <tr key={r.employee!.id} className="table-row">
                        <td className="table-cell">
                          <button onClick={() => navigate(`/employees/${r.employee!.id}`)} className="flex items-center gap-2.5 text-left">
                            <Avatar name={fullName(r.employee!)} src={r.employee!.photo} size="sm" />
                            <span><span className="block text-[13px] font-semibold text-slate-800 hover:text-brand-600 dark:text-slate-100">{fullName(r.employee!)}</span><span className="block text-[10px] text-slate-400">{r.employee!.department} · {r.records.length} days</span></span>
                          </button>
                        </td>
                        <td className="table-cell tabular font-semibold text-emerald-600 dark:text-emerald-400">{r.present}</td>
                        <td className="table-cell tabular text-violet-600 dark:text-violet-400">{r.late}</td>
                        <td className="table-cell tabular text-rose-600 dark:text-rose-400">{r.absent}</td>
                        <td className="table-cell tabular text-amber-600 dark:text-amber-400">{r.leave}</td>
                        <td className="table-cell tabular">{Math.round(r.hours)}h</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className={`h-full rounded-full ${r.rate >= 90 ? 'bg-emerald-500' : r.rate >= 75 ? 'bg-brand-500' : 'bg-amber-500'}`} style={{ width: `${r.rate}%` }} /></div>
                            <span className="w-8 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{r.rate}%</span>
                          </div>
                        </td>
                        <td className="table-cell text-right"><IconButton aria-label={`View ${fullName(r.employee!)}`} onClick={() => navigate(`/employees/${r.employee!.id}`)}><Eye className="h-4 w-4" /></IconButton></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {rowCount === 0 && <EmptyState icon={CalendarDays} title="No attendance records" description="No records match this date range and filters. Try a different date or clear the filters." action={<Button variant="secondary" onClick={() => { setSearch(''); setDepartment('All'); setStatus('All') }}><RotateCcw className="h-4 w-4" /> Clear filters</Button>} />}
            </div>
            {rowCount > 0 && <Pagination page={currentPage} totalPages={totalPages} total={rowCount} from={from} to={Math.min(from + pageSize, rowCount)} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} label={mode === 'day' ? 'records' : 'employees'} />}
          </>
        )}

        {tab === 'records' && view === 'calendar' && (
          <div className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IconButton aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></IconButton>
                <h3 className="min-w-[150px] text-center text-sm font-semibold">{new Date(calMonth + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <IconButton aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight className="h-4 w-4" /></IconButton>
                <button onClick={() => setCalMonth(todayISO().slice(0, 7))} className="ml-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">This month</button>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Leave</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Weekend</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">{d}</div>)}
              {calendar.map((cell, i) => {
                if (!cell.iso) return <div key={i} className="min-h-[86px] rounded-xl border border-transparent bg-slate-50/40 dark:bg-white/[0.01]" />
                const weekend = [0, 6].includes(new Date(cell.iso + 'T12:00:00').getDay())
                const isToday = cell.iso === todayISO()
                return (
                  <button
                    key={cell.iso}
                    onClick={() => { setDate(cell.iso!); setMode('day'); setView('table') }}
                    className={`group min-h-[86px] rounded-xl border p-2 text-left transition hover:border-brand-300 hover:shadow-sm dark:hover:border-brand-500/40 ${weekend ? 'border-slate-100 bg-slate-50/70 dark:border-white/[0.04] dark:bg-white/[0.015]' : 'border-slate-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.025]'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-semibold ${isToday ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>{cell.day}</span>
                      {cell.present + cell.absent + cell.leave > 0 && <span className="text-[9px] text-slate-400">{cell.present + cell.absent + cell.leave}</span>}
                    </div>
                    {!weekend && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{cell.present} present</div>
                        {cell.absent > 0 && <div className="flex items-center gap-1 text-[9px] text-rose-500"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />{cell.absent} absent</div>}
                        {cell.leave > 0 && <div className="flex items-center gap-1 text-[9px] text-amber-500"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{cell.leave} leave</div>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'corrections' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Employees can request changes within 7 days. Approved corrections update the attendance record and retain an audit trail.</p>
              <Badge tone="amber">{pendingCorrections} pending</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-slate-50/80 dark:bg-white/[0.025]"><tr><th className="table-head">Employee</th><th className="table-head">Date</th><th className="table-head">Requested</th><th className="table-head">Reason</th><th className="table-head">Requested on</th><th className="table-head">Reviewer</th><th className="table-head">Status</th><th className="table-head text-right">Actions</th></tr></thead>
                <tbody>
                  {(db.corrections || []).map((c) => {
                    const e = empMap.get(c.employeeId)
                    return (
                      <tr key={c.id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center gap-2.5"><Avatar name={e ? fullName(e) : c.employeeId} src={e?.photo} size="xs" /><span><span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">{e ? fullName(e) : c.employeeId}</span><span className="block text-[10px] text-slate-400">{c.id}</span></span></div>
                        </td>
                        <td className="table-cell">{fmtDate(c.date)}</td>
                        <td className="table-cell"><StatusBadge status={c.requestedStatus} /><span className="ml-2 text-[11px] text-slate-400">{c.checkIn}–{c.checkOut}</span></td>
                        <td className="table-cell"><p className="max-w-[260px] truncate text-[11.5px]" title={c.reason}>{c.reason}</p></td>
                        <td className="table-cell">{fmtDate(c.requestedAt)}</td>
                        <td className="table-cell">{c.reviewedBy || '—'}</td>
                        <td className="table-cell"><StatusBadge status={c.status} /></td>
                        <td className="table-cell text-right">
                          {c.status === 'Pending' ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => { setCorrectTarget(c); setDecision('Approved'); setRemarks('') }} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"><Check className="h-3 w-3" /> Approve</button>
                              <button onClick={() => { setCorrectTarget(c); setDecision('Rejected'); setRemarks('') }} className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400"><X className="h-3 w-3" /> Reject</button>
                            </div>
                          ) : <span className="text-[11px] text-slate-400">{c.remarks || 'Reviewed'}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {(db.corrections || []).length === 0 && <EmptyState icon={PencilLine} title="No correction requests" description="Attendance correction requests raised by employees will appear here." />}
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Manual attendance correction"
        description="Authorized HR action. This updates the attendance record immediately and logs the change."
        footer={<><Button variant="secondary" onClick={() => setEditing(null)} disabled={savingCorrection}>Cancel</Button><Button onClick={saveCorrection} loading={savingCorrection} disabled={savingCorrection}>Save correction</Button></>}
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee" required className="sm:col-span-2">
              <Select value={editing.employeeId} onChange={(e) => setEditing({ ...editing, employeeId: e.target.value })}>
                <option value="">Select employee</option>
                {db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={e.id}>{fullName(e)} · {e.department}</option>)}
              </Select>
            </Field>
            <Field label="Date" required><Input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
            <Field label="Status" required>
              <Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as AttendanceStatus })}>
                {['Present', 'Late', 'Remote', 'Half Day', 'Absent', 'On Leave'].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Check in"><Input type="time" value={editing.checkIn} disabled={['Absent', 'On Leave'].includes(editing.status)} onChange={(e) => setEditing({ ...editing, checkIn: e.target.value })} /></Field>
            <Field label="Check out"><Input type="time" value={editing.checkOut} disabled={['Absent', 'On Leave'].includes(editing.status)} onChange={(e) => setEditing({ ...editing, checkOut: e.target.value })} /></Field>
            <Field label="Reason for correction" required className="sm:col-span-2">
              <Textarea value={editing.reason} onChange={(e) => setEditing({ ...editing, reason: e.target.value })} placeholder="Explain why this manual correction is required…" invalid={!!error} />
            </Field>
            {error && <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>}
            {editing.checkIn && editing.checkOut && ['Present', 'Late', 'Remote', 'Half Day'].includes(editing.status) && (
              <p className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">Calculated working hours: <b className="text-slate-700 dark:text-slate-200">{hoursBetween(editing.checkIn, editing.checkOut)} hours</b></p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!correctTarget}
        onClose={() => setCorrectTarget(null)}
        title={decision === 'Approved' ? 'Approve correction request' : 'Reject correction request'}
        description={correctTarget ? `${correctTarget.id} · ${empMap.get(correctTarget.employeeId) ? fullName(empMap.get(correctTarget.employeeId)!) : correctTarget.employeeId} · ${fmtDate(correctTarget.date)}` : ''}
        footer={<><Button variant="secondary" onClick={() => setCorrectTarget(null)} disabled={decidingCorrection}>Cancel</Button><Button variant={decision === 'Approved' ? 'primary' : 'danger'} onClick={applyDecision} loading={decidingCorrection} disabled={decidingCorrection}>{decision === 'Approved' ? 'Approve correction' : 'Reject request'}</Button></>}
      >
        {correctTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/[0.03]">
              <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Requested status</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{correctTarget.requestedStatus}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Times</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{correctTarget.checkIn} – {correctTarget.checkOut}</p></div>
              <div className="col-span-2"><p className="text-[10px] uppercase tracking-wide text-slate-400">Employee reason</p><p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">{correctTarget.reason}</p></div>
            </div>
            <Field label={decision === 'Approved' ? 'Reviewer remarks (optional)' : 'Reason for rejection'} required={decision === 'Rejected'}>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={decision === 'Approved' ? 'Approved — verified with the reporting manager.' : 'Explain why this request cannot be approved…'} />
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request an attendance correction"
        description="Ask HR to review and correct an attendance record. The request enters the corrections queue for approval."
        footer={<><Button variant="secondary" onClick={() => setRequestOpen(false)} disabled={requestSaving}>Cancel</Button><Button onClick={submitCorrectionRequest} loading={requestSaving} disabled={requestSaving}>Submit request</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee" required error={requestErrors.employeeId} className="sm:col-span-2">
            <Select value={requestForm.employeeId} onChange={(e) => setRequestForm({ ...requestForm, employeeId: e.target.value })}>
              <option value="">Select employee</option>
              {db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={e.id}>{fullName(e)} · {e.department}</option>)}
            </Select>
          </Field>
          <Field label="Date" required error={requestErrors.date}>
            <Input type="date" value={requestForm.date} onChange={(e) => setRequestForm({ ...requestForm, date: e.target.value })} invalid={!!requestErrors.date} />
          </Field>
          <Field label="Requested status" required>
            <Select value={requestForm.status} onChange={(e) => setRequestForm({ ...requestForm, status: e.target.value as AttendanceStatus })}>
              {['Present', 'Late', 'Remote', 'Half Day', 'Absent', 'On Leave'].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Check in">
            <Input type="time" value={requestForm.checkIn} disabled={['Absent', 'On Leave'].includes(requestForm.status)} onChange={(e) => setRequestForm({ ...requestForm, checkIn: e.target.value })} />
          </Field>
          <Field label="Check out">
            <Input type="time" value={requestForm.checkOut} disabled={['Absent', 'On Leave'].includes(requestForm.status)} onChange={(e) => setRequestForm({ ...requestForm, checkOut: e.target.value })} />
          </Field>
          <Field label="Reason" required error={requestErrors.reason} className="sm:col-span-2">
            <Textarea value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} placeholder="Explain why the recorded attendance needs correction…" invalid={!!requestErrors.reason} />
          </Field>
          {Object.values(requestErrors).length > 0 && <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">Please fix the errors above before submitting.</p>}
        </div>
      </Modal>
    </>
  )}
  </div>
  )
}
