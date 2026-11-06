import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight, CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, Download,
  Pencil, Plus, Settings2, Users, X,
} from 'lucide-react'
import { useStore } from '../store'
import type { LeaveRequest, LeaveType, Priority } from '../types'
import {
  addDays, diffDays, downloadCSV, fmtDate, fmtDateShort, fullName, sum, todayISO, toISO,
} from '../lib/utils'
import {
  Avatar, Badge, Button, Card, Drawer, EmptyState, Field, IconButton, Input, Modal, PageHeader,
  Pagination, ProgressBar, SearchInput, Select, StatCard, StatusBadge, Tabs, Textarea, Toggle,
} from '../components/ui'

type TabKey = 'requests' | 'balances' | 'calendar' | 'policies'
type Decision = 'Approved' | 'Rejected'

const priorityTone = (p: Priority) => (p === 'Urgent' || p === 'High' ? 'red' : p === 'Medium' ? 'amber' : 'slate')

export default function Leave() {
  const { db, update, logActivity, toast } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('requests')
  const [status, setStatus] = useState('All')
  const [type, setType] = useState('All')
  const [department, setDepartment] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [detail, setDetail] = useState<LeaveRequest | null>(null)
  const [decision, setDecision] = useState<{ request: LeaveRequest; action: Decision } | null>(null)
  const [remarks, setRemarks] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [policyOpen, setPolicyOpen] = useState<LeaveType | null>(null)
  const [calMonth, setCalMonth] = useState(todayISO().slice(0, 7))

  const [form, setForm] = useState({ employeeId: '', leaveType: 'Annual Leave', from: addDays(todayISO(), 3), to: addDays(todayISO(), 4), reason: '', priority: 'Medium' as Priority, halfDay: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [policyForm, setPolicyForm] = useState({ allocation: 0, paid: true, carryForward: false, requiresApproval: true, description: '' })

  useEffect(() => { setPage(1) }, [status, type, department, search, pageSize])
  useEffect(() => {
    if (policyOpen) setPolicyForm({ allocation: policyOpen.allocation, paid: policyOpen.paid, carryForward: policyOpen.carryForward, requiresApproval: policyOpen.requiresApproval, description: policyOpen.description })
  }, [policyOpen])

  const empMap = useMemo(() => new Map(db.employees.map((e) => [e.id, e])), [db.employees])
  const pending = db.leaves.filter((l) => l.status === 'Pending').length
  const approved = db.leaves.filter((l) => l.status === 'Approved')
  const onLeaveToday = db.attendance.filter((a) => a.date === todayISO() && a.status === 'On Leave').length
  const totalApprovedDays = approved.reduce((a, l) => a + l.days, 0)
  const utilization = Math.round((totalApprovedDays / Math.max(1, db.employees.filter((e) => e.status !== 'Terminated').length * 20)) * 100)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.leaves
      .filter((l) => {
        const emp = empMap.get(l.employeeId)
        const matchSearch = !q || (emp && (fullName(emp).toLowerCase().includes(q) || emp.id.toLowerCase().includes(q))) || l.leaveType.toLowerCase().includes(q) || l.reason.toLowerCase().includes(q)
        return matchSearch && (status === 'All' || l.status === status) && (type === 'All' || l.leaveType === type) && (department === 'All' || emp?.department === department)
      })
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))
  }, [db.leaves, empMap, search, status, type, department])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const from = (currentPage - 1) * pageSize
  const rows = filtered.slice(from, from + pageSize)

  const typeUsage = db.settings.leaveTypes.map((t) => ({
    ...t,
    used: approved.filter((l) => l.leaveType === t.name).reduce((a, l) => a + l.days, 0),
    pending: db.leaves.filter((l) => l.leaveType === t.name && l.status === 'Pending').reduce((a, l) => a + l.days, 0),
  }))

  const openNew = () => {
    setForm({ employeeId: db.employees[0]?.id || '', leaveType: db.settings.leaveTypes[0]?.name || 'Annual Leave', from: addDays(todayISO(), 3), to: addDays(todayISO(), 4), reason: '', priority: 'Medium', halfDay: false })
    setErrors({})
    setNewOpen(true)
  }

  const submitRequest = () => {
    const next: Record<string, string> = {}
    if (!form.employeeId) next.employeeId = 'Select an employee'
    if (!form.from) next.from = 'Start date is required'
    if (!form.to) next.to = 'End date is required'
    if (form.from && form.to && form.to < form.from) next.to = 'End date must be on or after the start date'
    if (!form.reason.trim()) next.reason = 'Provide a reason for the leave request'
    setErrors(next)
    if (Object.keys(next).length) return
    const days = form.halfDay ? 0.5 : diffDays(form.from, form.to) + 1
    const request: LeaveRequest = {
      id: `LV-${String(3000 + db.leaves.length)}`,
      employeeId: form.employeeId,
      leaveType: form.leaveType,
      from: form.from,
      to: form.to,
      days,
      reason: form.reason,
      status: 'Pending',
      appliedOn: todayISO(),
      reviewer: 'Amara Okafor',
      remarks: '',
      priority: form.priority,
      halfDay: form.halfDay,
    }
    update((d) => ({ ...d, leaves: [request, ...d.leaves] }))
    const emp = empMap.get(form.employeeId)
    logActivity('leave', 'Leave request submitted', `${emp ? fullName(emp) : form.employeeId} · ${form.leaveType} · ${days} day(s)`)
    toast('Leave request submitted', 'success', `${days} day${days === 1 ? '' : 's'} requested for ${emp ? fullName(emp) : 'employee'}.`)
    setNewOpen(false)
  }

  const openDecision = (request: LeaveRequest, action: Decision) => {
    setDecision({ request, action })
    setRemarks('')
  }

  const applyDecision = () => {
    if (!decision) return
    if (decision.action === 'Rejected' && !remarks.trim()) {
      toast('Reviewer remarks required', 'error', 'Please add a comment explaining the rejection.')
      return
    }
    const { request, action } = decision
    update((d) => ({
      ...d,
      leaves: d.leaves.map((l) => (l.id === request.id ? { ...l, status: action, reviewer: 'Amara Okafor', remarks: remarks.trim() || 'Approved — coverage confirmed with the reporting manager.' } : l)),
    }))
    const emp = empMap.get(request.employeeId)
    logActivity('leave', `Leave request ${action.toLowerCase()}`, `${emp ? fullName(emp) : request.employeeId} · ${request.leaveType} · ${request.days} day(s)`)
    toast(`Leave ${action.toLowerCase()}`, action === 'Approved' ? 'success' : 'info', `${emp ? fullName(emp) : 'Employee'}'s request has been updated.`)
    setDecision(null)
    setDetail(null)
  }

  const savePolicy = () => {
    if (!policyOpen) return
    update((d) => ({
      ...d,
      settings: { ...d.settings, leaveTypes: d.settings.leaveTypes.map((t) => (t.id === policyOpen.id ? { ...t, ...policyForm } : t)) },
    }))
    logActivity('leave', 'Leave policy updated', policyOpen.name)
    toast('Leave policy updated', 'success', `${policyOpen.name} settings have been saved.`)
    setPolicyOpen(null)
  }

  const exportLeaves = () => {
    downloadCSV(`titan-hr-leave-${todayISO()}.csv`, [
      ['Request ID', 'Employee ID', 'Employee', 'Department', 'Leave type', 'From', 'To', 'Days', 'Status', 'Priority', 'Applied on', 'Reviewer', 'Remarks', 'Reason'],
      ...filtered.map((l) => { const e = empMap.get(l.employeeId); return [l.id, l.employeeId, e ? fullName(e) : l.employeeId, e?.department || '', l.leaveType, l.from, l.to, l.days, l.status, l.priority, l.appliedOn, l.reviewer, l.remarks, l.reason] }),
    ])
    toast('Leave register exported', 'success', `${filtered.length} requests written to CSV.`)
  }

  // calendar
  const calendar = useMemo(() => {
    const [year, month] = calMonth.split('-').map(Number)
    const first = new Date(year, month - 1, 1)
    const offset = (first.getDay() + 6) % 7
    const total = new Date(year, month, 0).getDate()
    const cells: { iso: string | null; day: number; leaves: LeaveRequest[] }[] = []
    for (let i = 0; i < offset; i++) cells.push({ iso: null, day: 0, leaves: [] })
    for (let d = 1; d <= total; d++) {
      const iso = toISO(new Date(year, month - 1, d))
      cells.push({ iso, day: d, leaves: db.leaves.filter((l) => ['Approved', 'Pending'].includes(l.status) && l.from <= iso && l.to >= iso) })
    }
    while (cells.length % 7 !== 0) cells.push({ iso: null, day: 0, leaves: [] })
    return cells
  }, [calMonth, db.leaves])

  const shiftMonth = (delta: number) => {
    const [y, m] = calMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle="Review requests, track balances and keep an eye on upcoming absences across the organization."
        crumbs={['People', 'Leave Management']}
        actions={<><Button variant="secondary" onClick={exportLeaves}><Download className="h-4 w-4" /> Export</Button><Button onClick={openNew}><Plus className="h-4 w-4" /> New request</Button></>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} label="Pending requests" value={pending} icon={CalendarDays} tone="amber" hint="awaiting review" />
        <StatCard index={1} label="On leave today" value={onLeaveToday} icon={Users} tone="blue" hint="approved absences" />
        <StatCard index={2} label="Approved days" value={totalApprovedDays} icon={Check} tone="green" hint={`${approved.length} requests this cycle`} />
        <StatCard index={3} label="Leave utilization" value={`${utilization}%`} icon={CalendarRange} tone="brand" hint="of annual allocation" />
      </div>

      <Card className="mt-4">
        <div className="px-4 pt-2 sm:px-5">
          <Tabs<TabKey> value={tab} onChange={setTab} items={[{ id: 'requests', label: 'Requests', count: db.leaves.length }, { id: 'balances', label: 'Employee balances' }, { id: 'calendar', label: 'Leave calendar' }, { id: 'policies', label: 'Policies' }]} />
        </div>

        {tab === 'requests' && (
          <>
            <div className="flex flex-col gap-2 border-b border-slate-100 p-4 dark:border-white/[0.05] xl:flex-row xl:items-center">
              <SearchInput value={search} onChange={setSearch} placeholder="Search employee, leave type or reason…" className="w-full xl:max-w-sm" />
              <div className="flex flex-wrap gap-2 xl:ml-auto">
                {[['All', 'All'], ['Pending', 'Pending'], ['Approved', 'Approved'], ['Rejected', 'Rejected']].map(([value, label]) => (
                  <button key={value} onClick={() => setStatus(value)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${status === value ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-white/10'}`}>{label}{value === 'Pending' ? ` (${pending})` : ''}</button>
                ))}
                <Select value={type} onChange={(e) => setType(e.target.value)} className="min-w-[130px]"><option value="All">All types</option>{db.settings.leaveTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}</Select>
                <Select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="All">All departments</option>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
                  <tr><th className="table-head">Employee</th><th className="table-head">Leave</th><th className="table-head">Dates</th><th className="table-head">Reason</th><th className="table-head">Status</th><th className="table-head text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const emp = empMap.get(l.employeeId)
                    return (
                      <tr key={l.id} className="table-row cursor-pointer" onClick={() => setDetail(l)}>
                        <td className="table-cell">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={emp ? fullName(emp) : l.employeeId} src={emp?.photo} size="sm" />
                            <div><p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{emp ? fullName(emp) : l.employeeId}</p><p className="text-[10px] text-slate-400">{emp?.department || '—'} · {l.id}</p></div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <Badge tone="brand">{l.leaveType}</Badge>
                          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${l.priority === 'High' ? 'bg-rose-500' : l.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-300'}`} />{l.priority} · {l.days}d</p>
                        </td>
                        <td className="table-cell"><p>{fmtDateShort(l.from)} – {fmtDateShort(l.to)}</p><p className="text-[10px] text-slate-400">Applied {fmtDate(l.appliedOn)}</p></td>
                        <td className="table-cell"><p className="max-w-[170px] truncate text-[11.5px]" title={l.reason}>{l.reason}</p></td>
                        <td className="table-cell"><StatusBadge status={l.status} /></td>
                        <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                          {l.status === 'Pending' ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openDecision(l, 'Approved')} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"><Check className="h-3 w-3" /> Approve</button>
                              <button onClick={() => openDecision(l, 'Rejected')} className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400"><X className="h-3 w-3" /> Reject</button>
                            </div>
                          ) : <div className="text-right"><StatusBadge status={l.status} /><p className="mt-1 text-[10px] text-slate-400">{l.reviewer}</p></div>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <EmptyState icon={CalendarDays} title="No leave requests" description="No requests match the current filters." action={<Button onClick={openNew}><Plus className="h-4 w-4" /> Create request</Button>} />}
            </div>
            {filtered.length > 0 && <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} from={from} to={Math.min(from + pageSize, filtered.length)} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} label="requests" />}
          </>
        )}

        {tab === 'balances' && (
          <div className="p-4 sm:p-5">
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
              {typeUsage.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><span className={`h-2 w-2 rounded-full ${t.color === 'teal' ? 'bg-teal-500' : t.color === 'rose' ? 'bg-rose-500' : t.color === 'amber' ? 'bg-amber-500' : t.color === 'violet' ? 'bg-violet-500' : t.color === 'slate' ? 'bg-slate-400' : 'bg-indigo-500'}`} />{t.name}</span>
                    <Badge tone="slate">{t.allocation}d</Badge>
                  </div>
                  <ProgressBar className="mt-2.5" value={(t.used / Math.max(t.allocation, 1)) * 100} tone={t.used / Math.max(t.allocation, 1) > 0.8 ? 'red' : 'brand'} size="sm" />
                  <p className="mt-1.5 text-[10px] text-slate-400">{t.used} used · {t.pending} pending</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/[0.06]">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 dark:bg-white/[0.03]">
                  <tr><th className="table-head">Employee</th><th className="table-head">Department</th>{db.settings.leaveTypes.slice(0, 4).map((t) => <th key={t.id} className="table-head text-center">{t.name.replace(' Leave', '')}</th>)}<th className="table-head">Total used</th><th className="table-head text-right">Action</th></tr>
                </thead>
                <tbody>
                  {db.employees.filter((e) => e.status !== 'Terminated').map((e) => {
                    const used = approved.filter((l) => l.employeeId === e.id).reduce((a, l) => a + l.days, 0)
                    return (
                      <tr key={e.id} className="table-row">
                        <td className="table-cell"><div className="flex items-center gap-2.5"><Avatar name={fullName(e)} src={e.photo} size="xs" /><div><p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{fullName(e)}</p><p className="text-[10px] text-slate-400">{e.id}</p></div></div></td>
                        <td className="table-cell">{e.department}</td>
                        {db.settings.leaveTypes.slice(0, 4).map((t) => {
                          const usedType = approved.filter((l) => l.employeeId === e.id && l.leaveType === t.name).reduce((a, l) => a + l.days, 0)
                          const remaining = Math.max(0, t.allocation - usedType)
                          return <td key={t.id} className="table-cell text-center"><span className={`tabular text-[12px] font-semibold ${remaining <= 2 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>{remaining}</span><span className="text-[10px] text-slate-400"> / {t.allocation}</span></td>
                        })}
                        <td className="table-cell tabular font-semibold">{used}d</td>
                        <td className="table-cell text-right"><Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${e.id}`)}>Profile <ArrowUpRight className="h-3 w-3" /></Button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Balances are calculated from approved leave requests against the policy allocation configured in HR Settings.</p>
          </div>
        )}

        {tab === 'calendar' && (
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IconButton aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></IconButton>
                <h3 className="min-w-[150px] text-center text-sm font-semibold">{new Date(calMonth + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <IconButton aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight className="h-4 w-4" /></IconButton>
                <button onClick={() => setCalMonth(todayISO().slice(0, 7))} className="ml-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">This month</button>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-dashed border-amber-500 bg-amber-100" /> Pending</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">{d}</div>)}
              {calendar.map((cell, i) => {
                if (!cell.iso) return <div key={i} className="min-h-[104px] rounded-xl bg-slate-50/50 dark:bg-white/[0.01]" />
                const isToday = cell.iso === todayISO()
                return (
                  <div key={cell.iso} className={`min-h-[104px] rounded-xl border p-1.5 ${isToday ? 'border-brand-300 bg-brand-50/40 dark:border-brand-500/40 dark:bg-brand-500/[0.06]' : 'border-slate-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]'}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold ${isToday ? 'bg-brand-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>{cell.day}</span>
                    <div className="mt-1 space-y-1">
                      {cell.leaves.slice(0, 3).map((l) => {
                        const emp = empMap.get(l.employeeId)
                        return (
                          <button key={l.id} onClick={() => setDetail(l)} title={`${emp ? fullName(emp) : ''} · ${l.leaveType}`} className={`block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border border-dashed border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                            {emp ? emp.firstName : l.employeeId} · {l.leaveType.replace(' Leave', '')}
                          </button>
                        )
                      })}
                      {cell.leaves.length > 3 && <p className="pl-1 text-[9px] font-semibold text-slate-400">+{cell.leaves.length - 3} more</p>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-5">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Upcoming approved leave</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {approved.filter((l) => l.to >= todayISO()).sort((a, b) => a.from.localeCompare(b.from)).slice(0, 6).map((l) => {
                  const emp = empMap.get(l.employeeId)
                  return (
                    <button key={l.id} onClick={() => setDetail(l)} className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-3 text-left transition hover:border-brand-200 dark:border-white/[0.06] dark:hover:border-brand-500/30">
                      <Avatar name={emp ? fullName(emp) : l.employeeId} src={emp?.photo} size="sm" />
                      <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">{emp ? fullName(emp) : l.employeeId}</p><p className="text-[10px] text-slate-400">{fmtDateShort(l.from)} – {fmtDateShort(l.to)} · {l.leaveType}</p></div>
                      <Badge tone="green">{l.days}d</Badge>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'policies' && (
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50/60 p-3.5 dark:bg-brand-500/[0.06]">
              <p className="text-xs text-slate-600 dark:text-slate-300">These policies power leave balances and approval rules across the workspace. Edit thresholds directly or manage them in HR Settings.</p>
              <Button variant="secondary" size="sm" onClick={() => navigate('/settings')}><Settings2 className="h-3.5 w-3.5" /> HR Settings</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {typeUsage.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-100 p-4 transition hover:border-brand-200 dark:border-white/[0.06] dark:hover:border-brand-500/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.name}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{t.description}</p>
                    </div>
                    <button onClick={() => setPolicyOpen(t)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/10"><Pencil className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone="brand">{t.allocation} days / year</Badge>
                    <Badge tone={t.paid ? 'green' : 'slate'}>{t.paid ? 'Paid' : 'Unpaid'}</Badge>
                    {t.carryForward && <Badge tone="violet">Carry forward</Badge>}
                    <Badge tone={t.requiresApproval ? 'amber' : 'slate'}>{t.requiresApproval ? 'Approval required' : 'No approval'}</Badge>
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between text-[10px] text-slate-400"><span>Used this cycle</span><span>{t.used} of {t.allocation} days</span></div>
                    <ProgressBar className="mt-1.5" value={(t.used / Math.max(t.allocation, 1)) * 100} tone="brand" size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Leave request"
        description={detail ? `${detail.id} · submitted ${fmtDate(detail.appliedOn)}` : ''}
        footer={detail && detail.status === 'Pending' ? <><Button variant="secondary" onClick={() => openDecision(detail, 'Rejected')}><X className="h-4 w-4" /> Reject</Button><Button onClick={() => openDecision(detail, 'Approved')}><Check className="h-4 w-4" /> Approve</Button></> : <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && (() => {
          const emp = empMap.get(detail.employeeId)
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                <Avatar name={emp ? fullName(emp) : detail.employeeId} src={emp?.photo} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{emp ? fullName(emp) : detail.employeeId}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{emp?.designation} · {emp?.department}</p>
                  <p className="text-[11px] text-slate-400">{emp?.email}</p>
                </div>
                <StatusBadge status={detail.status} />
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Leave type</dt><dd className="mt-1 text-sm font-medium">{detail.leaveType}</dd></div>
                <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority</dt><dd className="mt-1"><Badge tone={priorityTone(detail.priority)}>{detail.priority}</Badge></dd></div>
                <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">From</dt><dd className="mt-1 text-sm font-medium">{fmtDate(detail.from)}</dd></div>
                <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">To</dt><dd className="mt-1 text-sm font-medium">{fmtDate(detail.to)}</dd></div>
                <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total days</dt><dd className="mt-1 text-sm font-semibold">{detail.days} day{detail.days === 1 ? '' : 's'}</dd></div>
                <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reviewer</dt><dd className="mt-1 text-sm font-medium">{detail.reviewer}</dd></div>
              </dl>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Employee reason</p>
                <p className="mt-1.5 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">{detail.reason}</p>
              </div>
              {detail.remarks && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reviewer remarks</p>
                  <p className="mt-1.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm leading-relaxed text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06] dark:text-emerald-300">{detail.remarks}</p>
                </div>
              )}
              <div className="relative space-y-4 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
                {[
                  { label: 'Request submitted', date: detail.appliedOn, done: true },
                  { label: detail.status === 'Pending' ? 'Awaiting HR review' : `Request ${detail.status.toLowerCase()}`, date: detail.status === 'Pending' ? undefined : detail.appliedOn, done: detail.status !== 'Pending' },
                ].map((step) => (
                  <div key={step.label} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${step.done ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}>{step.done ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>
                    <div><p className="text-xs font-medium text-slate-700 dark:text-slate-200">{step.label}</p><p className="text-[10px] text-slate-400">{step.date ? fmtDate(step.date) : 'In progress'}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </Drawer>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New leave request"
        description="Record a leave request on behalf of an employee. It enters the approval queue as pending."
        footer={<><Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={submitRequest}>Submit request</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee" required error={errors.employeeId} className="sm:col-span-2">
            <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Select employee</option>
              {db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={e.id}>{fullName(e)} · {e.department}</option>)}
            </Select>
          </Field>
          <Field label="Leave type" required>
            <Select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>{db.settings.leaveTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}</Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>{['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}</Select>
          </Field>
          <Field label="From" required error={errors.from}><Input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: e.target.value > form.to ? e.target.value : form.to })} invalid={!!errors.from} /></Field>
          <Field label="To" required error={errors.to}><Input type="date" value={form.to} min={form.from} onChange={(e) => setForm({ ...form, to: e.target.value })} invalid={!!errors.to} /></Field>
          <div className="sm:col-span-2"><Toggle checked={form.halfDay} onChange={(v) => setForm({ ...form, halfDay: v })} label="Half-day request" description="Counts as 0.5 days regardless of the selected range." /></div>
          <Field label="Reason" required error={errors.reason} className="sm:col-span-2"><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Describe the reason for this leave request…" invalid={!!errors.reason} /></Field>
          <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
            Total requested: <b className="text-slate-800 dark:text-slate-200">{form.halfDay ? 0.5 : form.from && form.to && form.to >= form.from ? diffDays(form.from, form.to) + 1 : 0} day(s)</b> · reviewer will be <b className="text-slate-800 dark:text-slate-200">Amara Okafor</b>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision?.action === 'Approved' ? 'Approve leave request' : 'Reject leave request'}
        description={decision ? `${decision.request.leaveType} · ${decision.request.days} day(s) · ${fmtDate(decision.request.from)}` : ''}
        footer={<><Button variant="secondary" onClick={() => setDecision(null)}>Cancel</Button><Button variant={decision?.action === 'Approved' ? 'primary' : 'danger'} onClick={applyDecision}>{decision?.action === 'Approved' ? 'Approve request' : 'Reject request'}</Button></>}
      >
        <Field label={decision?.action === 'Approved' ? 'Reviewer remarks (optional)' : 'Reason for rejection'} required={decision?.action === 'Rejected'}>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={decision?.action === 'Approved' ? 'Approved — coverage and handover confirmed.' : 'Explain the reason for rejecting this leave request…'} />
        </Field>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">The employee will see this remark in their request history.</p>
      </Modal>

      <Modal
        open={!!policyOpen}
        onClose={() => setPolicyOpen(null)}
        title={`Edit ${policyOpen?.name || 'leave'} policy`}
        description="Changes apply to balances and future requests immediately."
        footer={<><Button variant="secondary" onClick={() => setPolicyOpen(null)}>Cancel</Button><Button onClick={savePolicy}>Save policy</Button></>}
      >
        {policyOpen && (
          <div className="space-y-4">
            <Field label="Annual allocation (days)"><Input type="number" min={0} max={365} value={policyForm.allocation} onChange={(e) => setPolicyForm({ ...policyForm, allocation: Number(e.target.value) })} /></Field>
            <Field label="Description"><Textarea value={policyForm.description} onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })} /></Field>
            <div className="space-y-3 rounded-xl border border-slate-100 p-4 dark:border-white/[0.06]">
              <Toggle checked={policyForm.paid} onChange={(v) => setPolicyForm({ ...policyForm, paid: v })} label="Paid leave" description="Salary continues during approved leave." />
              <Toggle checked={policyForm.carryForward} onChange={(v) => setPolicyForm({ ...policyForm, carryForward: v })} label="Carry forward" description="Unused days roll into the next cycle." />
              <Toggle checked={policyForm.requiresApproval} onChange={(v) => setPolicyForm({ ...policyForm, requiresApproval: v })} label="Requires approval" description="Requests must be approved by HR or a manager." />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
