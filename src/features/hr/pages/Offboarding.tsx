import {
  useState, useEffect, useMemo,
} from 'react'
import {
  AlertTriangle, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, ChevronRight,
  ClipboardCheck, Clock3, Download, FileText, LogOut, Plus, RefreshCw, ShieldCheck, Trash2,
  UserMinus, Wallet, XCircle,
} from 'lucide-react'

import { useStore } from '../store'
import { describeMissingPermission, useHrAccess } from '../lib/access'
import { runHrApiAction, hrActions } from '../api-actions'
import { useOffboarding } from '../useHrData'
import type { Clearance, DocFile, OffboardingRecord } from '../types'
import { addDays, downloadCSV, fmtDate, fmtMoney, sum, todayISO, uid } from '../lib/utils'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, DocumentPreview, DocumentRow, Drawer, EmptyState, Field,
  FileDrop, Input, Modal, PageHeader, Pagination, ProgressBar, SearchInput, Select, StatCard, StatusBadge,
  Tabs, Textarea,
} from '../components/ui'
import { HrPermissionNotice } from '../components/hr-guard'

type OffTab = 'overview' | 'clearances' | 'settlement' | 'documents' | 'activity'

const blankForm = {
  employeeId: '', resignationDate: todayISO(), lastWorkingDay: addDays(todayISO(), 30),
  reason: '', noticePeriodDays: '30', settlementAmount: '', settlementNotes: '',
}

export default function Offboarding() {
  const access = useHrAccess()
  const { db, update, logActivity, toast, dataSource, refreshFromApi } = useStore()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [department, setDepartment] = useState('All')
  const [sort, setSort] = useState('lastDay')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<OffTab>('overview')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<OffboardingRecord | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [preview, setPreview] = useState<DocFile | null>(null)
  const [note, setNote] = useState('')
  const [settlementAmount, setSettlementAmount] = useState('')
  const [settlementNotes, setSettlementNotes] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewNotes, setInterviewNotes] = useState('')

  const offboardingQuery = useOffboarding()

  const useApi = dataSource === 'api'
  const offboardingData = useApi ? offboardingQuery.data : null
  const allOffboarding = (offboardingData ?? db.offboarding) as OffboardingRecord[]

  const empMap = useMemo(() => new Map(db.employees.map((e) => [e.id, e])), [db.employees])
  const selected = allOffboarding.find((o) => o.id === selectedId) || null

  useEffect(() => {
    if (!selected) return
    setSettlementAmount(String(selected.settlementAmount || ''))
    setSettlementNotes(selected.settlementNotes || '')
    setInterviewDate(selected.exitInterviewDate || '')
    setInterviewNotes(selected.exitInterviewNotes || '')
    setNote('')
    setTab('overview')
  }, [selectedId])

  const pendingClearances = useMemo(() => allOffboarding.reduce((acc, o) => acc + o.clearances.filter((c) => c.status === 'Pending').length, 0), [allOffboarding])
  const blockedClearances = useMemo(() => allOffboarding.reduce((acc, o) => acc + o.clearances.filter((c) => c.status === 'Blocked').length, 0), [allOffboarding])
  const active = allOffboarding.filter((o) => o.status !== 'Completed')
  const upcoming = active.filter((o) => o.lastWorkingDay >= todayISO() && o.lastWorkingDay <= addDays(todayISO(), 30))
  const settlementPending = sum(active.filter((o) => o.settlementStatus !== 'Paid').map((o) => o.settlementAmount))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = allOffboarding.filter((o) => {
      const e = empMap.get(o.employeeId)
      const matchSearch = !q || o.id.toLowerCase().includes(q) || o.reason.toLowerCase().includes(q) || (e && `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)) || o.employeeId.toLowerCase().includes(q)
      return matchSearch && (status === 'All' || o.status === status) && (department === 'All' || e?.department === department)
    })
    return list.sort((a, b) => sort === 'name'
      ? (empMap.get(a.employeeId)?.firstName || '').localeCompare(empMap.get(b.employeeId)?.firstName || '')
      : a.lastWorkingDay.localeCompare(b.lastWorkingDay))
  }, [allOffboarding, empMap, search, status, department, sort])

  // API mode uses the server pagination metadata; demo mode paginates locally.
  const offboardingMeta = (offboardingData as any)?.meta
  const totalItems = useApi ? Number(offboardingMeta?.total ?? filtered.length) : filtered.length
  const totalPages = useApi ? Math.max(1, Number(offboardingMeta?.totalPages ?? 1)) : Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = useApi ? Number(offboardingMeta?.page ?? page) : Math.min(page, totalPages)
  const from = useApi ? (filtered.length ? (currentPage - 1) * (offboardingMeta?.pageSize ?? pageSize) : 0) : (Math.min(page, totalPages) - 1) * pageSize
  const rows = useApi ? filtered : filtered.slice(from, from + pageSize)

  const setField = (key: keyof typeof blankForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const createRecord = () => {
    const next: Record<string, string> = {}
    if (!form.employeeId) next.employeeId = 'Select an employee'
    if (!form.resignationDate) next.resignationDate = 'Resignation date is required'
    if (!form.lastWorkingDay) next.lastWorkingDay = 'Last working day is required'
    if (form.lastWorkingDay < form.resignationDate) next.lastWorkingDay = 'Last working day must follow the resignation date'
    if (!form.reason.trim()) next.reason = 'Add the reason for leaving'
    setErrors(next)
    if (Object.keys(next).length) return
    const amount = Number(form.settlementAmount) || 0
    const managers = ['Isabella Rossi', 'Noah Bennett', 'Grace Kim', 'Aisha Bello']
    const clearances: Clearance[] = [
      { id: uid('cl'), department: 'Department', owner: managers[0], status: 'Pending', note: '' },
      { id: uid('cl'), department: 'IT', owner: managers[1], status: 'Pending', note: '' },
      { id: uid('cl'), department: 'Finance', owner: managers[2], status: 'Pending', note: '' },
      { id: uid('cl'), department: 'HR', owner: managers[3], status: 'Pending', note: '' },
    ]
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () =>
          hrActions.createOffboarding({
            employeeId: form.employeeId,
            resignationDate: form.resignationDate,
            lastWorkingDay: form.lastWorkingDay,
            reason: form.reason.trim(),
            noticePeriodDays: Number(form.noticePeriodDays) || 30,
            clearances,
            settlementAmount: amount,
          }),
        successMessage: 'Offboarding initiated',
        successDescription: 'Clearance owners have been assigned and the employee is marked Notice Period.',
        errorTitle: 'Could not initiate offboarding',
      }).then((res) => {
        if (res.ok) {
          setCreateOpen(false)
          setForm(blankForm)
          setPage(1)
        }
      })
      return
    }
    const record: OffboardingRecord = {
      id: `OFF-${2200 + db.offboarding.length + 1}`,
      employeeId: form.employeeId,
      resignationDate: form.resignationDate,
      lastWorkingDay: form.lastWorkingDay,
      reason: form.reason.trim(),
      noticePeriodDays: Number(form.noticePeriodDays) || 30,
      status: 'In Progress',
      clearances,
      settlementAmount: amount,
      settlementStatus: 'Pending',
      settlementNotes: form.settlementNotes.trim(),
      documents: [],
      history: [{ id: uid('oh'), date: todayISO(), action: 'Offboarding record created', actor: 'Aisha Bello' }],
    }
    update((d) => ({
      ...d,
      offboarding: [record, ...d.offboarding],
      employees: d.employees.map((e) => (e.id === form.employeeId ? { ...e, status: 'Notice Period' } : e)),
    }))
    logActivity('offboarding', 'Offboarding initiated', `${record.id} · ${empMap.get(record.employeeId)?.firstName || ''} ${empMap.get(record.employeeId)?.lastName || ''}`)
    toast('Offboarding initiated', 'success', `${record.id} created. Clearance owners have been assigned.`)
    setCreateOpen(false)
    setForm(blankForm)
    setPage(1)
  }

  const patchRecord = (patch: Partial<OffboardingRecord>, action: string, message: string, description?: string) => {
    if (!selected) return
    if (dataSource === 'api') {
      const payload: Record<string, unknown> = {}
      if (patch.status !== undefined) payload.status = patch.status
      if (patch.exitInterviewDate !== undefined) payload.exitInterviewDate = patch.exitInterviewDate || undefined
      if (patch.exitInterviewNotes !== undefined) payload.exitInterviewNotes = patch.exitInterviewNotes
      if (patch.clearances !== undefined) payload.clearances = patch.clearances
      if (patch.settlementAmount !== undefined) payload.settlementAmount = patch.settlementAmount
      if (patch.settlementStatus !== undefined) payload.settlementStatus = patch.settlementStatus
      if (patch.settlementNotes !== undefined) payload.settlementNotes = patch.settlementNotes
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.updateOffboarding(selected.id, payload),
        successMessage: message,
        successDescription: description,
        errorTitle: action,
      })
      return
    }
    update((d) => ({
      ...d,
      offboarding: d.offboarding.map((o) => (o.id === selected.id ? { ...o, ...patch, history: [...o.history, { id: uid('oh'), date: todayISO(), action, actor: 'Aisha Bello' }] } : o)),
    }))
    logActivity('offboarding', message, `${selected.id} · ${empMap.get(selected.employeeId)?.firstName || ''} ${empMap.get(selected.employeeId)?.lastName || ''}`)
    toast(message, 'success', description)
  }

  const setClearance = (clearance: Clearance, statusValue: Clearance['status']) => {
    if (!selected) return
    const clearances = selected.clearances.map((c) => (c.id === clearance.id ? { ...c, status: statusValue, note: statusValue === 'Cleared' ? c.note || 'Cleared by ' + c.owner : statusValue === 'Blocked' ? c.note || 'Blocked pending follow-up.' : c.note } : c))
    const allCleared = clearances.every((c) => c.status === 'Cleared')
    const statusNext = allCleared && selected.status !== 'Completed' ? 'Clearance' : selected.status
    if (dataSource === 'api') {
      patchRecord({ clearances, status: statusNext }, 'Clearance update failed', `Clearance ${statusValue.toLowerCase()}`, `${clearance.department} · ${clearance.owner}`)
      return
    }
    update((d) => ({
      ...d,
      offboarding: d.offboarding.map((o) => (o.id === selected.id ? {
        ...o, clearances,
        status: statusNext,
        history: [...o.history, { id: uid('oh'), date: todayISO(), action: `${clearance.department} clearance ${statusValue.toLowerCase()}`, actor: 'Aisha Bello' }],
      } : o)),
    }))
    toast(`Clearance ${statusValue.toLowerCase()}`, statusValue === 'Blocked' ? 'warning' : 'success', `${clearance.department} · ${clearance.owner}`)
  }

  const saveSettlement = () => {
    if (!selected) return
    patchRecord({ settlementAmount: Number(settlementAmount) || 0, settlementNotes }, 'Settlement update failed', 'Settlement updated', 'The final settlement estimate and notes were saved.')
  }

  const setSettlementStatus = (value: OffboardingRecord['settlementStatus']) => {
    if (!selected) return
    patchRecord({ settlementStatus: value }, 'Settlement update failed', `Settlement ${value.toLowerCase()}`, dataSource === 'api' ? `${selected.id} settlement is now ${value}.` : `${selected.id} settlement is now ${value}. This is demo data — no money moves.`)
  }

  const saveInterview = () => {
    if (!selected) return
    patchRecord({ exitInterviewDate: interviewDate, exitInterviewNotes: interviewNotes }, 'Exit interview update failed', 'Exit interview saved', 'The scheduled date and interview notes were updated.')
  }

  const uploadDocs = (docs: DocFile[]) => {
    if (!selected) return
    if (dataSource === 'api') {
      toast('Document upload is not supported by the API', 'warning', 'Offboarding documents are not persisted by the backend yet. No change was saved.')
      return
    }
    patchRecord({ documents: [...docs, ...selected.documents] }, `${docs.length} document${docs.length === 1 ? '' : 's'} uploaded`, 'Documents uploaded', 'Files are stored locally for preview in this demo.')
  }

  const verifyDoc = (doc: DocFile) => {
    if (!selected) return
    if (dataSource === 'api') {
      toast('Document verification is not supported by the API', 'warning', 'Offboarding documents are not persisted by the backend yet. No change was saved.')
      return
    }
    patchRecord({ documents: selected.documents.map((x) => (x.id === doc.id ? { ...x, status: 'Verified' } : x)) }, `${doc.name} verified`, 'Document verified', doc.name)
  }

  const removeDoc = (doc: DocFile) => {
    if (!selected) return
    if (dataSource === 'api') {
      toast('Document removal is not supported by the API', 'warning', 'Offboarding documents are not persisted by the backend yet. No change was saved.')
      return
    }
    patchRecord({ documents: selected.documents.filter((x) => x.id !== doc.id) }, `${doc.name} removed`, 'Document removed', doc.name)
  }

  const addNote = () => {
    if (!selected) return
    if (!note.trim()) { toast('Add a note first', 'warning'); return }
    if (dataSource === 'api') {
      toast('Free-form timeline notes are not supported by the API', 'warning', 'Offboarding history is generated from audited changes. Use the settlement notes field for persistent notes. Nothing was saved.')
      return
    }
    update((d) => ({
      ...d,
      offboarding: d.offboarding.map((o) => (o.id === selected.id ? { ...o, history: [...o.history, { id: uid('oh'), date: todayISO(), action: note.trim(), actor: 'Aisha Bello' }] } : o)),
    }))
    logActivity('offboarding', 'Offboarding note added', selected.id)
    toast('Note added', 'success', 'The note is recorded in the offboarding timeline.')
    setNote('')
  }

  const completeOffboarding = () => {
    if (!selected) return
    const allCleared = selected.clearances.every((c) => c.status === 'Cleared')
    if (!allCleared) { toast('Clearances incomplete', 'warning', 'All four department clearances must be cleared before completing offboarding.'); setCompleteOpen(false); return }
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.updateOffboarding(selected.id, { status: 'Completed', settlementStatus: 'Paid' }),
        successMessage: 'Offboarding completed',
        successDescription: 'The employee record is now Terminated and the settlement is marked Paid.',
        errorTitle: 'Could not complete offboarding',
      }).then((res) => {
        if (res.ok) {
          setCompleteOpen(false)
          setSelectedId(null)
        }
      })
      return
    }
    update((d) => ({
      ...d,
      offboarding: d.offboarding.map((o) => (o.id === selected.id ? { ...o, status: 'Completed', settlementStatus: 'Paid', history: [...o.history, { id: uid('oh'), date: todayISO(), action: 'Offboarding completed', actor: 'Amara Okafor' }] } : o)),
      employees: d.employees.map((e) => (e.id === selected.employeeId ? { ...e, status: 'Terminated' } : e)),
    }))
    logActivity('offboarding', 'Offboarding completed', `${selected.id} · employee marked terminated`)
    toast('Offboarding completed', 'success', 'The employee record is now Terminated and the settlement is marked Paid in this demo.')
    setCompleteOpen(false)
    setSelectedId(null)
  }

  const deleteRecord = () => {
    if (!deleteTarget) return
    if (dataSource === 'api') {
      toast('Deleting offboarding records is not supported', 'warning', 'The API keeps an audited offboarding history. Mark the record Cancelled instead of deleting it. Nothing was removed.')
      setDeleteTarget(null)
      return
    }
    update((d) => ({ ...d, offboarding: d.offboarding.filter((o) => o.id !== deleteTarget.id) }))
    logActivity('offboarding', 'Offboarding record deleted', deleteTarget.id)
    toast('Record deleted', 'success', `${deleteTarget.id} was removed from the local workspace.`)
    setDeleteTarget(null)
    setSelectedId(null)
  }

  const exportOffboarding = () => {
    downloadCSV('titan-hr-offboarding.csv', [
      ['Record ID', 'Employee ID', 'Employee', 'Department', 'Resignation date', 'Last working day', 'Notice days', 'Status', 'Clearances cleared', 'Settlement amount', 'Settlement status', 'Reason'],
      ...filtered.map((o) => { const e = empMap.get(o.employeeId); return [o.id, o.employeeId, e ? `${e.firstName} ${e.lastName}` : '', e?.department || '', o.resignationDate, o.lastWorkingDay, o.noticePeriodDays, o.status, `${o.clearances.filter((c) => c.status === 'Cleared').length}/${o.clearances.length}`, o.settlementAmount, o.settlementStatus, o.reason] }),
    ])
    toast('Offboarding report exported', 'success', `${filtered.length} records written to CSV.`)
  }

  const resetFilters = () => { setSearch(''); setStatus('All'); setDepartment('All'); setPage(1) }

  return (
    <div>
      {useApi && offboardingQuery.loading && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading offboarding data…</p>
          </div>
        </div>
      )}
      {useApi && offboardingQuery.error && (
        <div className="text-center py-12">
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-6 py-8 max-w-md mx-auto dark:bg-rose-500/10 dark:border-rose-500/20">
            <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-300">Unable to load offboarding data</h3>
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{offboardingQuery.error}</p>
            <button
              onClick={() => offboardingQuery.refetch()}
              className="mt-4 px-4 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {!useApi || (!offboardingQuery.loading && !offboardingQuery.error) && (
        <>
        <PageHeader
        title="Offboarding"
        subtitle="Run a dignified, compliant exit — coordinate department clearances, capture exit feedback and settle final pay."
        crumbs={['People Ops', 'Offboarding']}
        actions={
          <>
            {useApi && (
              <Button variant="secondary" onClick={() => void offboardingQuery.refetch()} disabled={offboardingQuery.loading}>
                <RefreshCw className={`h-4 w-4 ${offboardingQuery.loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            )}
            <Button variant="secondary" onClick={exportOffboarding} disabled={!filtered.length}><Download className="h-4 w-4" /> Export</Button>
            {access.can('offboarding.write') && (
              <Button onClick={() => { setForm(blankForm); setErrors({}); setCreateOpen(true) }}><Plus className="h-4 w-4" /> Start offboarding</Button>
            )}
          </>
        }
      />

      {!access.can('offboarding.write') && (
        <HrPermissionNotice className="mb-4" message={`${describeMissingPermission('offboarding.write')} You can review offboarding records but cannot change clearances, settlement or status.`} />
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard index={0} label="Active exits" value={active.length} icon={UserMinus} tone="brand" hint={`${allOffboarding.length} total records`} />
        <StatCard index={1} label="Clearances pending" value={pendingClearances} icon={ClipboardCheck} tone="amber" hint={`${blockedClearances} blocked`} />
        <StatCard index={2} label="Exits next 30 days" value={upcoming.length} icon={CalendarDays} tone="violet" hint="Last working day" />
        <StatCard index={3} label="Settlement pending" value={fmtMoney(settlementPending, true)} icon={Wallet} tone="blue" hint="Not yet paid" />
      </div>

      {active.length > 0 && (
        <Card className="mt-4 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Exit pipeline</h3><span className="text-[11px] text-slate-400">Click a record to open it</span></div>
          <div className="grid gap-2 lg:grid-cols-3">
            {active.slice(0, 3).map((o) => {
              const e = empMap.get(o.employeeId)
              const cleared = o.clearances.filter((c) => c.status === 'Cleared').length
              return (
                <button key={o.id} onClick={() => setSelectedId(o.id)} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-brand-200 hover:bg-brand-50/30 dark:border-white/[0.06] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/[0.04]">
                  <Avatar name={e ? `${e.firstName} ${e.lastName}` : o.employeeId} src={e?.photo} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{e ? `${e.firstName} ${e.lastName}` : o.employeeId}</p>
                    <p className="text-[10px] text-slate-400">Last day {fmtDate(o.lastWorkingDay)}</p>
                    <div className="mt-1 flex items-center gap-1.5"><ProgressBar value={(cleared / Math.max(o.clearances.length, 1)) * 100} tone={cleared === o.clearances.length ? 'green' : 'amber'} className="w-20" size="sm" /><span className="text-[9px] text-slate-400">{cleared}/{o.clearances.length}</span></div>
                  </div>
                  <Badge tone={o.status === 'Clearance' ? 'amber' : 'brand'}>{o.status}</Badge>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/[0.05] xl:flex-row xl:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search employees, records or reasons…" className="w-full xl:max-w-sm" />
          <div className="flex flex-wrap gap-2 xl:ml-auto">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-auto"><option value="All">All statuses</option><option>In Progress</option><option>Clearance</option><option>Completed</option></Select>
            <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1) }} className="w-auto"><option value="All">All departments</option>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto"><option value="lastDay">Last working day</option><option value="name">Employee A–Z</option></Select>
            {(search || status !== 'All' || department !== 'All') && <Button variant="ghost" size="sm" onClick={resetFilters}>Clear</Button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
              <tr><th className="table-head">Employee</th><th className="table-head">Reason</th><th className="table-head">Resignation</th><th className="table-head">Last working day</th><th className="table-head">Clearances</th><th className="table-head">Settlement</th><th className="table-head">Status</th><th className="table-head text-right">Action</th></tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const e = empMap.get(o.employeeId)
                const cleared = o.clearances.filter((c) => c.status === 'Cleared').length
                const blocked = o.clearances.filter((c) => c.status === 'Blocked').length
                return (
                  <tr key={o.id} className="table-row cursor-pointer" onClick={() => setSelectedId(o.id)}>
                    <td className="table-cell"><div className="flex items-center gap-2.5"><Avatar name={e ? `${e.firstName} ${e.lastName}` : o.employeeId} src={e?.photo} size="sm" /><div><p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{e ? `${e.firstName} ${e.lastName}` : o.employeeId}</p><p className="text-[10px] text-slate-400">{o.id} · {e?.department}</p></div></div></td>
                    <td className="table-cell"><p className="max-w-[180px] truncate text-[11.5px]">{o.reason}</p><p className="text-[10px] text-slate-400">{o.noticePeriodDays} days notice</p></td>
                    <td className="table-cell">{fmtDate(o.resignationDate)}</td>
                    <td className="table-cell"><p className="text-[12px]">{fmtDate(o.lastWorkingDay)}</p><p className={`text-[10px] ${o.lastWorkingDay < todayISO() && o.status !== 'Completed' ? 'text-rose-500' : 'text-slate-400'}`}>{o.lastWorkingDay < todayISO() ? 'Passed' : `${Math.round((new Date(o.lastWorkingDay).getTime() - new Date(todayISO()).getTime()) / 86400000)} days`}</p></td>
                    <td className="table-cell"><div className="flex items-center gap-2"><ProgressBar value={(cleared / Math.max(o.clearances.length, 1)) * 100} tone={blocked ? 'red' : cleared === o.clearances.length ? 'green' : 'amber'} className="w-20" /><span className="text-[10px] font-semibold">{cleared}/{o.clearances.length}</span>{blocked > 0 && <Badge tone="red">Blocked</Badge>}</div></td>
                    <td className="table-cell"><p className="tabular text-[12px] font-semibold">{fmtMoney(o.settlementAmount)}</p><StatusBadge status={o.settlementStatus} /></td>
                    <td className="table-cell"><StatusBadge status={o.status} /></td>
                    <td className="table-cell text-right"><Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); setSelectedId(o.id) }}>Open <ChevronRight className="h-3 w-3" /></Button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && <EmptyState icon={LogOut} title="No offboarding records" description={allOffboarding.length ? 'No records match the current filters.' : 'Start an offboarding to coordinate clearances and final settlement.'} action={allOffboarding.length ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : <Button onClick={() => { setForm(blankForm); setCreateOpen(true) }}><Plus className="h-4 w-4" /> Start offboarding</Button>} />}
        </div>
        {totalItems > 0 && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={totalItems}
            from={rows.length ? from + 1 : 0}
            to={rows.length ? from + rows.length : 0}
            onPage={setPage}
            pageSize={offboardingMeta?.pageSize ?? pageSize}
            onPageSize={(n) => { setPageSize(n); setPage(1) }}
            label="records"
          />
        )}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title="Offboarding record"
        description={selected ? `${selected.id} · ${empMap.get(selected.employeeId)?.firstName || ''} ${empMap.get(selected.employeeId)?.lastName || ''}` : ''}
        width="lg"
        footer={selected ? (
          <>
            {access.can('offboarding.write') && (
              <Button variant="ghost" className="mr-auto text-rose-600 dark:text-rose-400" onClick={() => setDeleteTarget(selected)}><Trash2 className="h-4 w-4" /> Delete</Button>
            )}
            <Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button>
            {access.can('offboarding.write') && selected.status !== 'Completed' && <Button onClick={() => setCompleteOpen(true)} disabled={!selected.clearances.every((c) => c.status === 'Cleared')}><CheckCircle2 className="h-4 w-4" /> Complete offboarding</Button>}
          </>
        ) : null}
      >
        {selected && (() => {
          const e = empMap.get(selected.employeeId)
          const cleared = selected.clearances.filter((c) => c.status === 'Cleared').length
          const allCleared = cleared === selected.clearances.length
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                <Avatar name={e ? `${e.firstName} ${e.lastName}` : selected.employeeId} src={e?.photo} size="lg" />
                <div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 dark:text-slate-100">{e ? `${e.firstName} ${e.lastName}` : selected.employeeId}</p><p className="text-[11px] text-slate-400">{e?.designation} · {e?.department}</p><p className="text-[10px] text-slate-400">Last working day {fmtDate(selected.lastWorkingDay)}</p></div>
                <StatusBadge status={selected.status} />
              </div>

              <Tabs
                items={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'clearances', label: 'Clearances', count: selected.clearances.length },
                  { id: 'settlement', label: 'Settlement' },
                  { id: 'documents', label: 'Documents', count: selected.documents.length },
                  { id: 'activity', label: 'Activity', count: selected.history.length },
                ]}
                value={tab}
                onChange={setTab}
                variant="pills"
                className="w-full"
              />

              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Resignation date</p><p className="mt-1 text-sm font-semibold">{fmtDate(selected.resignationDate)}</p></div>
                    <div className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Notice period</p><p className="mt-1 text-sm font-semibold">{selected.noticePeriodDays} days</p></div>
                    <div className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Last working day</p><p className="mt-1 text-sm font-semibold">{fmtDate(selected.lastWorkingDay)}</p></div>
                    <div className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Settlement</p><p className="mt-1 text-sm font-semibold">{fmtMoney(selected.settlementAmount)}</p></div>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4 dark:border-white/[0.06]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason for leaving</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{selected.reason}</p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between"><h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Exit progress</h4><span className="text-[10px] text-slate-400">{cleared}/{selected.clearances.length} clearances</span></div>
                    <div className="space-y-2.5">
                      {[{ label: 'Resignation logged', done: true }, { label: 'Department clearances', done: allCleared, active: !allCleared }, { label: 'Exit interview', done: !!selected.exitInterviewNotes, active: !!selected.exitInterviewDate && !selected.exitInterviewNotes }, { label: 'Final settlement', done: selected.settlementStatus === 'Paid', active: selected.settlementStatus !== 'Paid' }, { label: 'Offboarding completed', done: selected.status === 'Completed' }].map((step, i) => (
                        <div key={step.label} className="flex items-center gap-2.5">
                          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${step.done ? 'bg-emerald-500 text-white' : step.active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}>{step.done ? <Check className="h-3 w-3" /> : i + 1}</span>
                          <span className={`flex-1 text-[11px] ${step.done || step.active ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{step.label}</span>
                          {step.active && <Badge tone="brand">Current</Badge>}
                          {step.done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4 dark:border-white/[0.06]">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Exit interview</h4>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <Field label="Scheduled date"><Input type="date" value={interviewDate} onChange={(ev) => setInterviewDate(ev.target.value)} /></Field>
                      <Field label="Status"><Input value={selected.exitInterviewNotes ? 'Completed' : interviewDate ? 'Scheduled' : 'Not scheduled'} readOnly className="bg-slate-50 dark:bg-white/[0.03]" /></Field>
                    </div>
                    <Field label="Interview notes" className="mt-3"><Textarea value={interviewNotes} onChange={(ev) => setInterviewNotes(ev.target.value)} placeholder="Capture candid feedback, handover notes and themes…" /></Field>
                    <div className="mt-2 flex justify-end"><Button size="sm" onClick={saveInterview}><Check className="h-3.5 w-3.5" /> Save interview</Button></div>
                  </div>
                </div>
              )}

              {tab === 'clearances' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                    <div><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{cleared} of {selected.clearances.length} clearances complete</p><p className="text-[10px] text-slate-400">All departments must clear before exit can complete</p></div>
                    <ProgressBar value={(cleared / Math.max(selected.clearances.length, 1)) * 100} tone={allCleared ? 'green' : 'amber'} className="w-24" showLabel />
                  </div>
                  {selected.clearances.map((c) => (
                    <div key={c.id} className="rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.status === 'Cleared' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : c.status === 'Blocked' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}><BriefcaseBusiness className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1"><p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{c.department} clearance</p><p className="text-[10px] text-slate-400">Owner · {c.owner}</p></div>
                        <StatusBadge status={c.status} />
                      </div>
                      {c.note && <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10.5px] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">{c.note}</p>}
                      <div className="mt-2.5 flex flex-wrap justify-end gap-2">
                        {c.status !== 'Blocked' && <Button size="sm" variant="secondary" onClick={() => setClearance(c, 'Blocked')} disabled={selected.status === 'Completed'}><XCircle className="h-3.5 w-3.5" /> Block</Button>}
                        {c.status !== 'Cleared' && <Button size="sm" onClick={() => setClearance(c, 'Cleared')} disabled={selected.status === 'Completed'}><CheckCircle2 className="h-3.5 w-3.5" /> Mark cleared</Button>}
                        {c.status === 'Cleared' && <Button size="sm" variant="secondary" onClick={() => setClearance(c, 'Pending')} disabled={selected.status === 'Completed'}>Reopen</Button>}
                      </div>
                    </div>
                  ))}
                  {!allCleared && <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> Complete every clearance before closing the offboarding.</p>}
                </div>
              )}

              {tab === 'settlement' && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 p-4 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-100">Final settlement</p>
                    <p className="tabular mt-1 text-3xl font-bold">{fmtMoney(selected.settlementAmount)}</p>
                    <p className="mt-1 text-[11px] text-brand-200">Full and final · demo calculation</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Settlement amount (USD)"><Input type="number" min={0} value={settlementAmount} onChange={(ev) => setSettlementAmount(ev.target.value)} disabled={selected.status === 'Completed'} /></Field>
                    <Field label="Settlement status"><Select value={selected.settlementStatus} onChange={(ev) => setSettlementStatus(ev.target.value as OffboardingRecord['settlementStatus'])} disabled={selected.status === 'Completed'}><option>Pending</option><option>Processing</option><option>Paid</option></Select></Field>
                  </div>
                  <Field label="Settlement notes"><Textarea value={settlementNotes} onChange={(ev) => setSettlementNotes(ev.target.value)} placeholder="Leave encashment, deductions, bonus, equipment recovery…" disabled={selected.status === 'Completed'} /></Field>
                  <div className="flex flex-wrap justify-between gap-2">
                    <Button variant="secondary" onClick={() => setSettlementStatus('Processing')} disabled={selected.status === 'Completed'}><Clock3 className="h-4 w-4" /> Mark processing</Button>
                    <div className="flex gap-2"><Button variant="secondary" onClick={saveSettlement} disabled={selected.status === 'Completed'}>Save details</Button><Button onClick={() => setSettlementStatus('Paid')} disabled={selected.status === 'Completed'}><Wallet className="h-4 w-4" /> Mark paid</Button></div>
                  </div>
                  <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-400 dark:bg-white/[0.03]"><ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Settlement is simulated. No payroll or bank transaction is created.</p>
                </div>
              )}

              {tab === 'documents' && (
                <div className="space-y-4">
                  <FileDrop onFiles={uploadDocs} label="Upload exit documents" hint="Resignation, relieving letter, experience certificate · PDF or image" />
                  <div className="space-y-2">
                    {selected.documents.map((doc) => <DocumentRow key={doc.id} doc={doc} onPreview={() => setPreview(doc)} onVerify={() => verifyDoc(doc)} onRemove={() => removeDoc(doc)} />)}
                    {!selected.documents.length && <EmptyState icon={FileText} title="No exit documents" description="Upload the resignation letter or relieving documentation." />}
                  </div>
                </div>
              )}

              {tab === 'activity' && (
                <div className="space-y-4">
                  <div className="relative space-y-5 pl-6">
                    <span className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-200 dark:bg-white/10" />
                    {[...selected.history].reverse().map((h, i) => (
                      <div key={h.id} className="relative">
                        <span className={`absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-ink-900 ${i === 0 ? 'bg-brand-500' : 'bg-slate-300 dark:bg-white/20'}`}><span className="h-1.5 w-1.5 rounded-full bg-white" /></span>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{h.action}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{fmtDate(h.date)} · {h.actor}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Add note</h4>
                    <Textarea value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="e.g. Laptop returned and asset tag logged…" className="mt-2 min-h-[70px]" />
                    <div className="mt-2 flex justify-end"><Button size="sm" onClick={addNote}><Plus className="h-3.5 w-3.5" /> Add note</Button></div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </Drawer>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Start an offboarding"
        description="Create an exit record and assign the four standard department clearances."
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={createRecord}><UserMinus className="h-4 w-4" /> Start offboarding</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee" required error={errors.employeeId} className="sm:col-span-2"><Select value={form.employeeId} onChange={(e) => setField('employeeId', e.target.value)}><option value="">Select employee</option>{db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.designation} · {e.department}</option>)}</Select></Field>
          <Field label="Resignation date" required error={errors.resignationDate}><Input type="date" value={form.resignationDate} onChange={(e) => setField('resignationDate', e.target.value)} invalid={!!errors.resignationDate} /></Field>
          <Field label="Last working day" required error={errors.lastWorkingDay}><Input type="date" value={form.lastWorkingDay} onChange={(e) => setField('lastWorkingDay', e.target.value)} invalid={!!errors.lastWorkingDay} /></Field>
          <Field label="Notice period (days)"><Input type="number" min={0} value={form.noticePeriodDays} onChange={(e) => setField('noticePeriodDays', e.target.value)} /></Field>
          <Field label="Settlement estimate (USD)"><Input type="number" min={0} value={form.settlementAmount} onChange={(e) => setField('settlementAmount', e.target.value)} placeholder="8400" /></Field>
          <Field label="Reason for leaving" required error={errors.reason} className="sm:col-span-2"><Textarea value={form.reason} onChange={(e) => setField('reason', e.target.value)} placeholder="Resignation reason, role context, or end-of-contract note…" invalid={!!errors.reason} /></Field>
          <Field label="Settlement notes" className="sm:col-span-2"><Textarea value={form.settlementNotes} onChange={(e) => setField('settlementNotes', e.target.value)} placeholder="Leave encashment, bonus, deductions or equipment recovery…" /></Field>
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 dark:bg-white/[0.03] dark:text-slate-400 sm:col-span-2">The employee will be marked Notice Period. Department, IT, Finance and HR clearances are created automatically as Pending.</div>
        </div>
      </Modal>

      <ConfirmDialog open={!!completeOpen} onClose={() => setCompleteOpen(false)} onConfirm={completeOffboarding} title="Complete this offboarding?" description="The record is marked Completed, the settlement is marked Paid and the employee status becomes Terminated. This is demo data only." confirmLabel="Complete offboarding" />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteRecord} title="Delete offboarding record?" description={deleteTarget ? `${deleteTarget.id} and its clearance history will be removed from this local demo.` : ''} confirmLabel="Delete record" tone="danger" />
      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />
    </>
  )}
  </div>
  )
}
