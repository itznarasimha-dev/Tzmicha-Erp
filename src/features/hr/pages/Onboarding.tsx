import {
  useState, useMemo,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowUpRight, CalendarClock, Check, CheckCircle2, ClipboardCheck, Copy, Download,
  KeyRound, LayoutGrid, List, MonitorSmartphone, Plus, RefreshCw, ShieldCheck, UserCheck, UserPlus,
} from 'lucide-react'

import { useStore } from '../store'
import { describeMissingPermission, useHrAccess } from '../lib/access'
import { useOnboarding } from '../useHrData'
import { runHrApiAction, hrActions } from '../api-actions'
import type { DocFile, Employee, EmploymentType, OnboardingRecord } from '../types'
import { daysAhead, diffDays, downloadCSV, fmtDate, fullName, todayISO, uid } from '../lib/utils'
import {
  Avatar, Badge, Button, Card, DocumentPreview, DocumentRow, Drawer, EmptyState, Field, FileDrop,
  IconButton, Input, Modal, PageHeader, ProgressBar, SearchInput, Select, StatCard, StatusBadge,
  Tabs, Textarea, Toggle,
} from '../components/ui'
import { HrPermissionNotice } from '../components/hr-guard'

const progressOf = (o: OnboardingRecord) => {
  const checklist = o.checklist.length ? o.checklist.filter((c) => c.done).length / o.checklist.length : 0
  const docs = o.documents.length ? o.documents.filter((d) => d.status === 'Verified').length / o.documents.length : 0
  const systems = o.systems.length ? o.systems.filter((s) => s.enabled).length / o.systems.length : 1
  return Math.round(checklist * 60 + docs * 25 + systems * 15)
}

function ProgressRing({ value, size = 58 }: { value: number; size?: number }) {
  const stroke = 5
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-100 dark:text-white/[0.08]" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#ringGradient)" strokeWidth={stroke} strokeDasharray={`${(value / 100) * circ} ${circ}`} strokeLinecap="round" />
        <defs><linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#14b8a6" /></linearGradient></defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular text-slate-700 dark:text-slate-200">{value}%</span>
    </div>
  )
}

export default function Onboarding() {
  const access = useHrAccess()
  const { db, update, logActivity, toast, dataSource, refreshFromApi } = useStore()
  const navigate = useNavigate()
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('All')
  const [status, setStatus] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [preview, setPreview] = useState<DocFile | null>(null)
  const [notes, setNotes] = useState('')
  const [form, setForm] = useState({ name: '', email: '', designation: '', department: 'Engineering', manager: '', employmentType: 'Full-time' as EmploymentType, joiningDate: daysAhead(14) })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const onboardingQuery = useOnboarding()

  const useApi = dataSource === 'api'
  const onboardingData = useApi ? onboardingQuery.data : null
  const allOnboarding = (onboardingData ?? db.onboarding) as OnboardingRecord[]

  const selected = allOnboarding.find((o) => o.id === selectedId) || null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allOnboarding.filter((o) => {
      const matchSearch = !q || o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.designation.toLowerCase().includes(q)
      return matchSearch && (department === 'All' || o.department === department) && (status === 'All' || o.status === status)
    }).sort((a, b) => a.joiningDate.localeCompare(b.joiningDate))
  }, [allOnboarding, search, department, status])

  const upcoming = allOnboarding.filter((o) => o.status !== 'Completed')
  const inProgress = allOnboarding.filter((o) => o.status === 'In Progress').length
  const ready = allOnboarding.filter((o) => o.status === 'Ready').length
  const pendingDocs = allOnboarding.flatMap((o) => o.documents).filter((d) => d.status === 'Pending').length

  const nextEmployeeId = () => {
    const max = Math.max(...db.employees.map((e) => Number(e.id.replace(/\D/g, '')) || 0), ...db.onboarding.map((o) => Number((o.employeeId || '').replace(/\D/g, '')) || 0), 0)
    return `EMP-${String(max + 1).padStart(3, '0')}`
  }

  const patchOnboarding = (id: string, patch: Partial<OnboardingRecord>) => {
    update((d) => ({ ...d, onboarding: d.onboarding.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))
  }

  const toggleChecklist = (record: OnboardingRecord, itemId: string) => {
    const checklist = record.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c))
    const done = checklist.filter((c) => c.done).length
    const newStatus: OnboardingRecord['status'] = record.status === 'Completed' ? 'Completed' : done === checklist.length ? 'Ready' : done > 0 ? 'In Progress' : 'Not Started'
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.updateOnboarding(record.id, { checklist, status: newStatus }),
        successMessage: 'Checklist updated',
        successDescription: `${done}/${checklist.length} items complete.`,
        errorTitle: 'Could not update checklist',
      })
      return
    }
    patchOnboarding(record.id, { checklist, status: newStatus })
  }

  const toggleSystem = (record: OnboardingRecord, systemId: string) => {
    const systems = record.systems.map((s) => (s.id === systemId ? { ...s, enabled: !s.enabled } : s))
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.updateOnboarding(record.id, { systems }),
        successMessage: 'Access updated',
        errorTitle: 'Could not update access',
      })
      return
    }
    patchOnboarding(record.id, { systems })
    toast('Access updated', 'success', 'ERP access changes are simulated locally.')
  }

  const verifyDoc = (record: OnboardingRecord, docId: string) => {
    if (dataSource === 'api') {
      toast('Document verification is not supported by the API', 'warning', 'Onboarding documents are not persisted by the backend yet. No change was saved.')
      return
    }
    patchOnboarding(record.id, { documents: record.documents.map((d) => (d.id === docId ? { ...d, status: 'Verified' } : d)) })
    logActivity('onboarding', 'Joiner document verified', `${record.name} · ${record.documents.find((d) => d.id === docId)?.name}`)
    toast('Document verified', 'success')
  }

  const addDocs = (record: OnboardingRecord, docs: DocFile[]) => {
    if (dataSource === 'api') {
      toast('Document upload is not supported by the API', 'warning', 'Onboarding documents are not persisted by the backend yet. Upload remains demo-only and no change was saved.')
      return
    }
    patchOnboarding(record.id, { documents: [...docs, ...record.documents] })
    toast(`${docs.length} document${docs.length > 1 ? 's' : ''} uploaded`, 'success', 'Stored locally for preview in this session.')
  }

  const generateId = (record: OnboardingRecord) => {
    if (dataSource === 'api') {
      toast('Employee IDs are assigned by the database', 'warning', 'Complete onboarding to create the employee record; the API assigns the real employee ID. Nothing was changed.')
      return
    }
    const id = record.employeeId || nextEmployeeId()
    patchOnboarding(record.id, { employeeId: id, status: record.status === 'Not Started' ? 'In Progress' : record.status })
    logActivity('onboarding', 'Employee ID generated', `${record.name} · ${id}`)
    toast('Employee ID generated', 'success', `${id} is reserved for ${record.name}.`)
  }

  const completeOnboarding = (record: OnboardingRecord) => {
    const incomplete = record.checklist.filter((c) => !c.done).length
    const unverified = record.documents.filter((d) => d.status !== 'Verified').length
    if (incomplete || unverified) {
      toast('Onboarding is not ready', 'error', `${incomplete} checklist item(s) and ${unverified} document(s) still need attention.`)
      return
    }
    const existing = db.employees.find((e) => e.email.toLowerCase() === record.email.toLowerCase())
    if (dataSource === 'api') {
      const [first, ...rest] = record.name.split(' ')
      const departmentId = db.settings.departments.find((d) => d.name === record.department)?.id
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: async () => {
          let employeeId = existing?.id
          if (!existing) {
            if (!record.email) throw new Error('An email address is required to create the employee record.')
            const created = await hrActions.createEmployee({
              firstName: first,
              lastName: rest.join(' ') || '—',
              email: record.email,
              ...(departmentId ? { departmentId } : {}),
              employmentType: record.employmentType,
              employeeStatus: 'Active',
              joiningDate: record.joiningDate,
            })
            employeeId = created.id
          }
          return hrActions.updateOnboarding(record.id, {
            status: 'Completed',
            ...(employeeId ? { employeeId } : {}),
            systems: record.systems.map((s) => ({ ...s, enabled: true })),
          })
        },
        successMessage: 'Onboarding completed',
        successDescription: `${record.name} is now an active employee.`,
        errorTitle: 'Could not complete onboarding',
      }).then((res) => {
        if (res.ok) setSelectedId(null)
      })
      return
    }
    const employeeId = record.employeeId || nextEmployeeId()
    if (!existing) {
      const [first, ...rest] = record.name.split(' ')
      const manager = db.employees.find((e) => fullName(e) === record.manager)
      const employee: Employee = {
        id: employeeId, firstName: first, lastName: rest.join(' ') || '—', photo: '', email: record.email, phone: '',
        department: record.department, designation: record.designation, managerId: manager?.id || null, manager: record.manager || 'Executive Office',
        employmentType: record.employmentType, joiningDate: record.joiningDate, status: 'Active', location: '', gender: 'Other',
        dob: '1995-01-01', address: '', emergencyContact: '', bankAccount: '•••• 0000', salary: 75000, skills: [],
        documents: record.documents, bio: 'Created from the onboarding workspace on completion.',
      }
      update((d) => ({ ...d, employees: [employee, ...d.employees] }))
      logActivity('employee', 'Employee created from onboarding', `${record.name} · ${employeeId}`)
    }
    patchOnboarding(record.id, { status: 'Completed', employeeId: existing?.id || employeeId, systems: record.systems.map((s) => ({ ...s, enabled: true })) })
    logActivity('onboarding', 'Onboarding completed', `${record.name} · ${employeeId}`)
    toast('Onboarding completed', 'success', `${record.name} is now an active employee${existing ? '' : ` (${employeeId})`}.`)
    setSelectedId(null)
  }

  const saveNotes = () => {
    if (!selected) return
    if (dataSource === 'api') {
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.updateOnboarding(selected.id, { notes }),
        successMessage: 'Notes saved',
        errorTitle: 'Could not save notes',
      })
      return
    }
    patchOnboarding(selected.id, { notes })
    toast('Notes saved', 'success')
  }

  const addJoiner = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Full name is required'
    if (!form.email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email'
    if (!form.designation.trim()) next.designation = 'Designation is required'
    if (!form.joiningDate) next.joiningDate = 'Joining date is required'
    setErrors(next)
    if (Object.keys(next).length) return
    const checklist = db.settings.onboardingChecklists.map((c, i) => ({
      id: `OB-${uid('c')}-${i}`, label: c.label, owner: c.owner, category: c.category as OnboardingRecord['checklist'][number]['category'], done: false,
    }))
    const systems = [
      { id: uid('sys'), name: 'Email & Workspace', enabled: true },
      { id: uid('sys'), name: 'Titan ERP access', enabled: false },
      { id: uid('sys'), name: 'Slack workspace', enabled: false },
      { id: uid('sys'), name: 'VPN & SSO', enabled: false },
    ]
    if (dataSource === 'api') {
      const departmentId = db.settings.departments.find((d) => d.name === form.department)?.id
      void runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () =>
          hrActions.createOnboarding({
            name: form.name.trim(),
            email: form.email.trim(),
            designation: form.designation.trim(),
            ...(departmentId ? { departmentId } : {}),
            employmentType: form.employmentType,
            joiningDate: form.joiningDate,
            status: 'Not Started',
            checklist,
            systems,
            notes: 'Created from the onboarding workspace.',
          }),
        successMessage: 'Joiner added',
        successDescription: `${form.name.trim()} has been added to the onboarding pipeline.`,
        errorTitle: 'Could not add joiner',
      }).then((res) => {
        if (res.ok) {
          setAddOpen(false)
          setForm({ name: '', email: '', designation: '', department: 'Engineering', manager: '', employmentType: 'Full-time', joiningDate: daysAhead(14) })
        }
      })
      return
    }
    const record: OnboardingRecord = {
      id: `ONB-${String(1000 + db.onboarding.length)}`, name: form.name, email: form.email, designation: form.designation,
      department: form.department, manager: form.manager || 'Amara Okafor', employmentType: form.employmentType, joiningDate: form.joiningDate,
      status: 'Not Started', employeeId: '', documents: [], checklist,
      systems,
      notes: 'Created from the onboarding workspace.',
    }
    update((d) => ({ ...d, onboarding: [record, ...d.onboarding] }))
    logActivity('onboarding', 'New joiner added', `${record.name} · starts ${fmtDate(record.joiningDate)}`)
    toast('Joiner added', 'success', `${record.name} has been added to the onboarding pipeline.`)
    setAddOpen(false)
    setForm({ name: '', email: '', designation: '', department: 'Engineering', manager: '', employmentType: 'Full-time', joiningDate: daysAhead(14) })
  }

  const exportOnboarding = () => {
    downloadCSV(`titan-hr-onboarding-${todayISO()}.csv`, [
      ['Onboarding ID', 'Name', 'Email', 'Designation', 'Department', 'Manager', 'Joining date', 'Employee ID', 'Status', 'Progress', 'Checklist done', 'Documents verified'],
      ...filtered.map((o) => [o.id, o.name, o.email, o.designation, o.department, o.manager, o.joiningDate, o.employeeId, o.status, `${progressOf(o)}%`, `${o.checklist.filter((c) => c.done).length}/${o.checklist.length}`, `${o.documents.filter((d) => d.status === 'Verified').length}/${o.documents.length}`]),
    ])
    toast('Onboarding export ready', 'success', `${filtered.length} joiners written to CSV.`)
  }

  return (
    <div>
      {useApi && onboardingQuery.loading && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading onboarding data…</p>
          </div>
        </div>
      )}
      {useApi && onboardingQuery.error && (
        <div className="text-center py-12">
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-6 py-8 max-w-md mx-auto dark:bg-rose-500/10 dark:border-rose-500/20">
            <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-300">Unable to load onboarding data</h3>
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{onboardingQuery.error}</p>
            <button
              onClick={() => onboardingQuery.refetch()}
              className="mt-4 px-4 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {!useApi || (!onboardingQuery.loading && !onboardingQuery.error) && (
        <>
        <PageHeader
        title="Onboarding"
        subtitle="A guided first day for every new joiner — documents, access, introductions and induction in one checklist."
        crumbs={['Talent', 'Onboarding']}
        actions={
          <>
            {useApi && (
              <Button variant="secondary" onClick={() => void onboardingQuery.refetch()} disabled={onboardingQuery.loading}>
                <RefreshCw className={`h-4 w-4 ${onboardingQuery.loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            )}
            <Button variant="secondary" onClick={exportOnboarding}><Download className="h-4 w-4" /> Export</Button>
            {access.can('onboarding.write') && (
              <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add joiner</Button>
            )}
          </>
        }
      />

      {!access.can('onboarding.write') && (
        <HrPermissionNotice className="mb-4" message={`${describeMissingPermission('onboarding.write')} You can review onboarding records but cannot change checklists, access or status.`} />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} label="Upcoming joiners" value={upcoming.length} icon={UserPlus} tone="brand" hint="not yet completed" />
        <StatCard index={1} label="In progress" value={inProgress} icon={ClipboardCheck} tone="amber" hint="checklists underway" />
        <StatCard index={2} label="Ready to start" value={ready} icon={CheckCircle2} tone="green" hint="all checks nearly done" />
        <StatCard index={3} label="Documents pending" value={pendingDocs} icon={ShieldCheck} tone="violet" hint="awaiting verification" />
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/[0.05] xl:flex-row xl:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search joiner, role or email…" className="w-full xl:max-w-sm" />
          <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="All">All departments</option>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="All">All statuses</option>{['Not Started', 'In Progress', 'Ready', 'Completed'].map((s) => <option key={s}>{s}</option>)}</Select>
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/[0.05]">
              <button onClick={() => setView('cards')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${view === 'cards' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}><LayoutGrid className="h-3.5 w-3.5" /> Cards</button>
              <button onClick={() => setView('table')} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${view === 'table' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}><List className="h-3.5 w-3.5" /> Table</button>
            </div>
          </div>
        </div>

        {view === 'cards' ? (
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((o) => {
              const progress = progressOf(o)
              const days = diffDays(todayISO(), o.joiningDate)
              const docsVerified = o.documents.filter((d) => d.status === 'Verified').length
              const checklistDone = o.checklist.filter((c) => c.done).length
              return (
                <button key={o.id} onClick={() => { setSelectedId(o.id); setNotes(o.notes) }} className="group rounded-2xl border border-slate-200 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg dark:border-white/[0.07] dark:hover:border-brand-500/40">
                  <div className="flex items-start gap-3">
                    <Avatar name={o.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{o.name}</p><StatusBadge status={o.status} /></div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{o.designation} · {o.department}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400"><CalendarClock className="h-3 w-3" /> Starts {fmtDate(o.joiningDate)} · {days === 0 ? 'today' : days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`}</p>
                    </div>
                    <ProgressRing value={progress} size={52} />
                  </div>
                  <div className="mt-3.5">
                    <ProgressBar value={progress} size="sm" tone={progress >= 85 ? 'green' : progress > 40 ? 'brand' : 'amber'} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-white/[0.03]"><p className="text-slate-400">Checklist</p><p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{checklistDone}/{o.checklist.length}</p></div>
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-white/[0.03]"><p className="text-slate-400">Documents</p><p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{docsVerified}/{o.documents.length}</p></div>
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-white/[0.03]"><p className="text-slate-400">ERP access</p><p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{o.systems.filter((s) => s.enabled).length}/{o.systems.length}</p></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-white/[0.06]">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><UserCheck className="h-3 w-3" /> {o.manager}</span>
                    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-brand-600 transition group-hover:gap-1.5 dark:text-brand-400">Open checklist <ArrowUpRight className="h-3 w-3" /></span>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && <div className="col-span-full"><EmptyState icon={UserPlus} title="No joiners found" description="Adjust the filters or add a new joiner to begin onboarding." action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add joiner</Button>} /></div>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-50/80 dark:bg-white/[0.025]"><tr><th className="table-head">Joiner</th><th className="table-head">Role & department</th><th className="table-head">Manager</th><th className="table-head">Joining date</th><th className="table-head">Documents</th><th className="table-head">Progress</th><th className="table-head">Status</th><th className="table-head text-right">Action</th></tr></thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="table-row cursor-pointer" onClick={() => { setSelectedId(o.id); setNotes(o.notes) }}>
                    <td className="table-cell"><div className="flex items-center gap-2.5"><Avatar name={o.name} size="sm" /><div><p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{o.name}</p><p className="text-[10px] text-slate-400">{o.email}</p></div></div></td>
                    <td className="table-cell"><p>{o.designation}</p><p className="text-[10px] text-slate-400">{o.department}</p></td>
                    <td className="table-cell">{o.manager}</td>
                    <td className="table-cell">{fmtDate(o.joiningDate)}</td>
                    <td className="table-cell"><Badge tone={o.documents.some((d) => d.status === 'Pending') ? 'amber' : 'green'}>{o.documents.filter((d) => d.status === 'Verified').length}/{o.documents.length} verified</Badge></td>
                    <td className="table-cell"><div className="flex w-28 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-brand-500" style={{ width: `${progressOf(o)}%` }} /></div><span className="text-[10px] font-semibold">{progressOf(o)}%</span></div></td>
                    <td className="table-cell"><StatusBadge status={o.status} /></td>
                    <td className="table-cell text-right"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedId(o.id); setNotes(o.notes) }}>Open <ArrowUpRight className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <EmptyState icon={UserPlus} title="No joiners found" description="No onboarding records match the filters." />}
          </div>
        )}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name || 'Onboarding'}
        description={selected ? `${selected.id} · ${selected.designation}` : ''}
        width="lg"
        footer={selected ? (
          <>
            <Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button>
            {access.can('onboarding.write') && !selected.employeeId && <Button variant="secondary" onClick={() => generateId(selected)}><KeyRound className="h-4 w-4" /> Generate employee ID</Button>}
            {access.can('onboarding.write') && selected.status !== 'Completed' && <Button onClick={() => completeOnboarding(selected)}><CheckCircle2 className="h-4 w-4" /> Complete onboarding</Button>}
            {selected.status === 'Completed' && selected.employeeId && <Button onClick={() => navigate(`/employees/${selected.employeeId}`)}>View employee <ArrowUpRight className="h-4 w-4" /></Button>}
          </>
        ) : null}
      >
        {selected && (() => {
          const progress = progressOf(selected)
          const categories = ['Documents', 'IT & Access', 'People', 'Compliance'] as const
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                <Avatar name={selected.name} size="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-800 dark:text-slate-100">{selected.name}</p><StatusBadge status={selected.status} /></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selected.email}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Joining {fmtDate(selected.joiningDate)} · {selected.employmentType}</p>
                </div>
                <ProgressRing value={progress} size={62} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[['Checklist', `${selected.checklist.filter((c) => c.done).length}/${selected.checklist.length}`, 'brand'], ['Documents', `${selected.documents.filter((d) => d.status === 'Verified').length}/${selected.documents.length}`, 'violet'], ['Systems', `${selected.systems.filter((s) => s.enabled).length}/${selected.systems.length}`, 'teal']].map(([label, value, tone]) => (
                  <div key={label} className={`rounded-xl border p-3 ${tone === 'brand' ? 'border-brand-100 bg-brand-50/40 dark:border-brand-500/20 dark:bg-brand-500/[0.06]' : tone === 'violet' ? 'border-violet-100 bg-violet-50/40 dark:border-violet-500/20 dark:bg-violet-500/[0.06]' : 'border-teal-100 bg-teal-50/40 dark:border-teal-500/20 dark:bg-teal-500/[0.06]'}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="tabular mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department">
                  <Select value={selected.department} disabled={!access.can('onboarding.write')} onChange={(e) => patchOnboarding(selected.id, { department: e.target.value })}>
                    {db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </Select>
                </Field>
                <Field label="Reporting manager">
                  <Select value={selected.manager} disabled={!access.can('onboarding.write')} onChange={(e) => patchOnboarding(selected.id, { manager: e.target.value })}>
                    {db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={fullName(e)}>{fullName(e)} · {e.designation}</option>)}
                  </Select>
                </Field>
                <div className="sm:col-span-2 rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-brand-500" />
                      <div><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Employee ID</p><p className="text-[10px] text-slate-400">Reserved ahead of the joining date</p></div>
                    </div>
                    {selected.employeeId ? (
                      <div className="flex items-center gap-1.5"><code className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{selected.employeeId}</code><button onClick={() => { navigator.clipboard?.writeText(selected.employeeId); toast('Employee ID copied', 'info') }} className="rounded-md p-1 text-slate-400 hover:text-brand-600"><Copy className="h-3.5 w-3.5" /></button></div>
                    ) : access.can('onboarding.write') ? <Button size="sm" variant="secondary" onClick={() => generateId(selected)}>Generate ID</Button> : <span className="text-[10px] text-slate-400" title={describeMissingPermission('onboarding.write')}>Read only</span>}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400"><MonitorSmartphone className="h-3.5 w-3.5 text-teal-500" /> ERP & systems access</h4>
                  <Badge tone="teal">{selected.systems.filter((s) => s.enabled).length}/{selected.systems.length} enabled</Badge>
                </div>
                <div className="space-y-1 rounded-xl border border-slate-100 p-2 dark:border-white/[0.06]">
                  {selected.systems.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300"><MonitorSmartphone className="h-3.5 w-3.5" /></span>
                      <span className="flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">{s.name}</span>
                      <span className={`text-[10px] font-semibold ${s.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{s.enabled ? 'Enabled' : 'Not set up'}</span>
                      <button onClick={() => toggleSystem(selected, s.id)} disabled={!access.can('onboarding.write')} role="switch" aria-checked={s.enabled} title={access.can('onboarding.write') ? `Toggle ${s.name}` : describeMissingPermission('onboarding.write')} className={`relative h-5 w-9 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${s.enabled ? 'bg-teal-500' : 'bg-slate-200 dark:bg-white/10'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${s.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-violet-500" /> Documents & verification</h4>
                  <Badge tone={selected.documents.some((d) => d.status === 'Pending') ? 'amber' : 'green'}>{selected.documents.filter((d) => d.status === 'Verified').length}/{selected.documents.length} verified</Badge>
                </div>
                {access.can('onboarding.write') ? (
                  <FileDrop compact label="Upload joiner document" hint="Offer letter, ID proof, tax forms · PDF or image" onFiles={(docs) => addDocs(selected, docs)} />
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-[11px] text-slate-400 dark:border-white/10" title={describeMissingPermission('onboarding.write')}>
                    Document upload requires onboarding write permission.
                  </p>
                )}
                <div className="mt-2.5 space-y-2">
                  {selected.documents.map((d) => <DocumentRow key={d.id} doc={d} onPreview={() => setPreview(d)} onVerify={() => verifyDoc(selected, d.id)} onRemove={() => patchOnboarding(selected.id, { documents: selected.documents.filter((x) => x.id !== d.id) })} />)}
                  {selected.documents.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-[11px] text-slate-400 dark:border-white/10">No documents uploaded yet.</p>}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400"><ClipboardCheck className="h-3.5 w-3.5 text-brand-500" /> Induction checklist</h4>
                  <Badge tone="brand">{selected.checklist.filter((c) => c.done).length}/{selected.checklist.length} complete</Badge>
                </div>
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const items = selected.checklist.filter((c) => c.category === cat)
                    if (!items.length) return null
                    return (
                      <div key={cat}>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{cat}</p>
                        <div className="space-y-1">
                          {items.map((c) => (
                            <button key={c.id} onClick={() => toggleChecklist(selected, c.id)} disabled={!access.can('onboarding.write')} title={access.can('onboarding.write') ? `Toggle ${c.label}` : describeMissingPermission('onboarding.write')} className="flex w-full items-start gap-3 rounded-lg border border-slate-100 p-2.5 text-left transition hover:border-brand-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.06] dark:hover:border-brand-500/30">
                              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${c.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-white/20'}`}>{c.done && <Check className="h-2.5 w-2.5" />}</span>
                              <span className="min-w-0 flex-1"><span className={`block text-[11.5px] font-medium ${c.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{c.label}</span><span className="mt-0.5 block text-[10px] text-slate-400">Responsible: {c.owner}</span></span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between"><label className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Onboarding notes</label><button onClick={saveNotes} className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">Save notes</button></div>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Buddy assignment, special equipment, first-week plan…" />
              </div>
            </div>
          )
        })()}
      </Drawer>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a new joiner" description="Start an onboarding record before the employee's first day." size="lg" footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addJoiner}>Create onboarding</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Iris van Dijk" invalid={!!errors.name} /></Field>
          <Field label="Personal email" required error={errors.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" invalid={!!errors.email} /></Field>
          <Field label="Designation" required error={errors.designation}><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Product Designer" invalid={!!errors.designation} /></Field>
          <Field label="Department"><Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select></Field>
          <Field label="Reporting manager"><Select value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })}><option value="">Select manager</option>{db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={fullName(e)}>{fullName(e)} · {e.designation}</option>)}</Select></Field>
          <Field label="Employment type"><Select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}>{db.settings.employmentTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}</Select></Field>
          <Field label="Joining date" required error={errors.joiningDate}><Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} invalid={!!errors.joiningDate} /></Field>
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400 sm:col-span-2">
            <p className="font-semibold text-slate-700 dark:text-slate-200">What happens next?</p>
            <p className="mt-1 leading-relaxed">An 8-step induction checklist and ERP access controls are created automatically. Generate an employee ID, verify documents, then complete onboarding to create the employee record.</p>
          </div>
        </div>
      </Modal>

      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />
    </>
  )}
  </div>
  )
}
