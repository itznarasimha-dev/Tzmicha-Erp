import { useMemo, useState } from 'react'
import {
  ArrowRight, CheckCircle2, ChevronRight, Clock3, Download, Inbox, MessageSquareText, Plus,
  RotateCcw, Send, ShieldCheck, Trash2, UserCheck, Users, XCircle,
} from 'lucide-react'
import { useStore } from '../store'
import type { EmployeeRequest, Priority, RequestStatus } from '../types'
import { downloadCSV, fmtDate, fmtDateTime, relativeTime, todayISO, uid } from '../lib/utils'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, Field, Input, Modal, PageHeader,
  Pagination, SearchInput, Select, StatCard, StatusBadge, Tabs, Textarea,
} from '../components/ui'

const STATUSES: RequestStatus[] = ['Open', 'In Progress', 'Resolved', 'Rejected']
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent']
const TYPES = ['Employment Certificate', 'Experience Letter', 'Profile Update', 'Document Request', 'HR Query', 'Other']

const blankForm = {
  employeeId: '', type: 'Employment Certificate', subject: '', description: '',
  priority: 'Medium' as Priority, assignedTo: 'Aisha Bello',
}

export default function Requests() {
  const { db, update, logActivity, toast } = useStore()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [priority, setPriority] = useState('All')
  const [type, setType] = useState('All')
  const [assignee, setAssignee] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [view, setView] = useState<'all' | 'queue'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [response, setResponse] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRequest | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ request: EmployeeRequest; action: 'start' | 'resolve' | 'reject' | 'reopen' } | null>(null)

  const empMap = useMemo(() => new Map(db.employees.map((e) => [e.id, e])), [db.employees])
  const selected = db.requests.find((r) => r.id === selectedId) || null
  const assignees = useMemo(() => Array.from(new Set(db.requests.map((r) => r.assignedTo))).sort(), [db.requests])

  const counts = useMemo(() => ({
    open: db.requests.filter((r) => r.status === 'Open').length,
    progress: db.requests.filter((r) => r.status === 'In Progress').length,
    resolved: db.requests.filter((r) => r.status === 'Resolved').length,
    urgent: db.requests.filter((r) => ['Urgent', 'High'].includes(r.priority) && !['Resolved', 'Rejected'].includes(r.status)).length,
    responses: db.requests.reduce((acc, r) => acc + r.responses.length, 0),
  }), [db.requests])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.requests.filter((r) => {
      const e = empMap.get(r.employeeId)
      const matchSearch = !q || r.subject.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || (e && `${e.firstName} ${e.lastName}`.toLowerCase().includes(q))
      const matchView = view === 'all' || (view === 'queue' && r.assignedTo === 'Aisha Bello' && !['Resolved', 'Rejected'].includes(r.status))
      return matchSearch && matchView && (status === 'All' || r.status === status) && (priority === 'All' || r.priority === priority) && (type === 'All' || r.type === type) && (assignee === 'All' || r.assignedTo === assignee)
    }).sort((a, b) => {
      const rank = (s: string) => s === 'Urgent' ? 0 : s === 'High' ? 1 : s === 'Medium' ? 2 : 3
      if (a.status === 'Open' && b.status !== 'Open') return -1
      if (b.status === 'Open' && a.status !== 'Open') return 1
      return rank(a.priority) - rank(b.priority) || b.createdAt.localeCompare(a.createdAt)
    })
  }, [db.requests, empMap, search, status, priority, type, assignee, view])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const from = (currentPage - 1) * pageSize
  const rows = filtered.slice(from, from + pageSize)

  const setField = (key: keyof typeof blankForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const createRequest = () => {
    const next: Record<string, string> = {}
    if (!form.employeeId) next.employeeId = 'Select an employee'
    if (!form.subject.trim()) next.subject = 'Add a short subject'
    if (form.description.trim().length < 10) next.description = 'Describe the request in at least 10 characters'
    setErrors(next)
    if (Object.keys(next).length) return
    const request: EmployeeRequest = {
      id: `REQ-${Math.max(8500, ...db.requests.map((r) => Number(r.id.replace(/\D/g, '')) || 8500)) + 1}`,
      employeeId: form.employeeId, type: form.type, subject: form.subject.trim(), description: form.description.trim(),
      status: 'Open', priority: form.priority, assignedTo: form.assignedTo, createdAt: todayISO(),
      responses: [{ id: uid('rr'), author: empMap.get(form.employeeId) ? `${empMap.get(form.employeeId)!.firstName} ${empMap.get(form.employeeId)!.lastName}` : 'Employee', message: form.description.trim(), date: todayISO() }],
    }
    update((d) => ({ ...d, requests: [request, ...d.requests] }))
    logActivity('request', 'Employee request created', `${request.id} · ${request.subject}`)
    toast('Request created', 'success', `${request.id} assigned to ${request.assignedTo}.`)
    setCreateOpen(false)
    setForm(blankForm)
    setPage(1)
  }

  const changeStatus = (request: EmployeeRequest, next: RequestStatus, note: string) => {
    update((d) => ({
      ...d,
      requests: d.requests.map((r) => r.id === request.id ? {
        ...r, status: next,
        responses: [...r.responses, { id: uid('rr'), author: 'Aisha Bello', message: note, date: todayISO() }],
      } : r),
    }))
    logActivity('request', `Request ${next.toLowerCase()}`, `${request.id} · ${request.subject}`)
    toast(next === 'Resolved' ? 'Request resolved' : `Request ${next.toLowerCase()}`, next === 'Rejected' ? 'warning' : 'success', `${request.id} · ${request.subject}`)
    setConfirmAction(null)
    if (next === 'Resolved' || next === 'Rejected') setSelectedId(null)
  }

  const runAction = () => {
    if (!confirmAction) return
    const { request, action } = confirmAction
    if (action === 'start') changeStatus(request, 'In Progress', 'Work started on this request. Expect an update within two business days.')
    if (action === 'resolve') changeStatus(request, 'Resolved', 'Request completed. The employee has been notified via the demo workspace.')
    if (action === 'reject') changeStatus(request, 'Rejected', 'Unable to fulfil this request in its current form. Please contact People Ops to discuss alternatives.')
    if (action === 'reopen') changeStatus(request, 'Open', 'Request reopened for further review.')
  }

  const sendResponse = () => {
    if (!selected) return
    if (!response.trim()) { toast('Write a response first', 'warning'); return }
    update((d) => ({
      ...d,
      requests: d.requests.map((r) => r.id === selected.id ? {
        ...r,
        status: r.status === 'Open' ? 'In Progress' : r.status,
        responses: [...r.responses, { id: uid('rr'), author: 'Aisha Bello', message: response.trim(), date: new Date().toISOString() }],
      } : r),
    }))
    logActivity('request', 'Response added', `${selected.id} · ${selected.subject}`)
    toast('Response sent', 'success', 'The employee can see your reply in the demo request thread.')
    setResponse('')
  }

  const reassign = (value: string) => {
    if (!selected) return
    update((d) => ({ ...d, requests: d.requests.map((r) => (r.id === selected.id ? { ...r, assignedTo: value } : r)) }))
    logActivity('request', 'Request reassigned', `${selected.id} · ${value}`)
    toast('Request reassigned', 'info', `${selected.id} is now owned by ${value}.`)
  }

  const removeRequest = () => {
    if (!deleteTarget) return
    update((d) => ({ ...d, requests: d.requests.filter((r) => r.id !== deleteTarget.id) }))
    logActivity('request', 'Request deleted', `${deleteTarget.id} · ${deleteTarget.subject}`)
    toast('Request deleted', 'success', `${deleteTarget.id} was removed from the local workspace.`)
    setDeleteTarget(null)
    setSelectedId(null)
  }

  const exportRequests = () => {
    downloadCSV('titan-hr-employee-requests.csv', [
      ['Request ID', 'Employee', 'Employee ID', 'Type', 'Subject', 'Status', 'Priority', 'Assigned to', 'Created', 'Responses'],
      ...filtered.map((r) => { const e = empMap.get(r.employeeId); return [r.id, e ? `${e.firstName} ${e.lastName}` : r.employeeId, r.employeeId, r.type, r.subject, r.status, r.priority, r.assignedTo, r.createdAt, r.responses.length] }),
    ])
    toast('Requests exported', 'success', `${filtered.length} requests written to CSV.`)
  }

  const priorityTone = (p: Priority) => p === 'Urgent' ? 'red' : p === 'High' ? 'orange' : p === 'Medium' ? 'amber' : 'slate'

  const resetFilters = () => { setSearch(''); setStatus('All'); setPriority('All'); setType('All'); setAssignee('All'); setView('all'); setPage(1) }

  return (
    <div>
      <PageHeader
        title="Employee Requests"
        subtitle="A single queue for HR letters, document requests, profile updates and policy questions — with clear ownership and response history."
        crumbs={['People Ops', 'Employee Requests']}
        actions={<><Button variant="secondary" onClick={exportRequests} disabled={!filtered.length}><Download className="h-4 w-4" /> Export</Button><Button onClick={() => { setForm(blankForm); setErrors({}); setCreateOpen(true) }}><Plus className="h-4 w-4" /> New request</Button></>}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard index={0} label="Open requests" value={counts.open} icon={Inbox} tone="brand" hint="Awaiting first response" onClick={() => { setStatus('Open'); setPage(1) }} />
        <StatCard index={1} label="In progress" value={counts.progress} icon={Clock3} tone="amber" hint="Being worked on" onClick={() => { setStatus('In Progress'); setPage(1) }} />
        <StatCard index={2} label="High priority" value={counts.urgent} icon={XCircle} tone="red" hint="Unresolved high or urgent" onClick={() => { setPriority('High'); setPage(1) }} />
        <StatCard index={3} label="Resolved" value={counts.resolved} icon={CheckCircle2} tone="green" hint={`${counts.responses} thread messages`} onClick={() => { setStatus('Resolved'); setPage(1) }} />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs items={[{ id: 'all', label: 'All requests', count: db.requests.length }, { id: 'queue', label: 'My queue', count: db.requests.filter((r) => r.assignedTo === 'Aisha Bello' && !['Resolved', 'Rejected'].includes(r.status)).length }]} value={view} onChange={(v) => { setView(v); setPage(1) }} className="border-0" />
        <div className="flex flex-wrap gap-2">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search requests or employees…" className="w-full sm:w-64" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-auto"><option value="All">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }} className="w-auto"><option value="All">All priorities</option>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</Select>
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className="w-auto"><option value="All">All types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
          <Select value={assignee} onChange={(e) => { setAssignee(e.target.value); setPage(1) }} className="w-auto"><option value="All">All assignees</option>{assignees.map((a) => <option key={a}>{a}</option>)}</Select>
          {(search || status !== 'All' || priority !== 'All' || type !== 'All' || assignee !== 'All' || view !== 'all') && <Button variant="ghost" size="sm" onClick={resetFilters}>Clear</Button>}
        </div>
      </div>

      <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
                <tr><th className="table-head">Request</th><th className="table-head">Employee</th><th className="table-head">Type</th><th className="table-head">Priority</th><th className="table-head">Assigned to</th><th className="table-head">Created</th><th className="table-head">Status</th><th className="table-head text-right">Action</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const e = empMap.get(r.employeeId)
                  return (
                    <tr key={r.id} className="table-row cursor-pointer" onClick={() => { setSelectedId(r.id); setResponse('') }}>
                      <td className="table-cell">
                        <div className="max-w-[280px]">
                          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{r.subject}</p>
                          <p className="text-[10px] text-slate-400">{r.id} · {r.responses.length} messages</p>
                        </div>
                      </td>
                      <td className="table-cell"><div className="flex items-center gap-2"><Avatar name={e ? `${e.firstName} ${e.lastName}` : r.employeeId} src={e?.photo} size="xs" /><div><p className="text-[12px] font-medium">{e ? `${e.firstName} ${e.lastName}` : r.employeeId}</p><p className="text-[10px] text-slate-400">{e?.department}</p></div></div></td>
                      <td className="table-cell"><span className="text-[11.5px]">{r.type}</span></td>
                      <td className="table-cell"><Badge tone={priorityTone(r.priority)} dot>{r.priority}</Badge></td>
                      <td className="table-cell"><span className="text-[11.5px]">{r.assignedTo}</span></td>
                      <td className="table-cell"><p className="text-[11.5px]">{relativeTime(r.createdAt)}</p><p className="text-[10px] text-slate-400">{fmtDate(r.createdAt)}</p></td>
                      <td className="table-cell"><StatusBadge status={r.status} /></td>
                      <td className="table-cell text-right"><Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); setSelectedId(r.id); setResponse('') }}>Open <ChevronRight className="h-3 w-3" /></Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!rows.length && <EmptyState icon={MessageSquareText} title="No requests here" description={view === 'queue' ? 'Your personal queue is clear. Switch to all requests to see the wider team queue.' : 'No requests match the current filters. Try clearing a filter.'} action={<Button variant="secondary" onClick={resetFilters}>Clear filters</Button>} />}
          </div>
          {filtered.length > 0 && <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} from={from} to={Math.min(from + pageSize, filtered.length)} onPage={setPage} pageSize={pageSize} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="requests" />}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Queue by owner</h3>
            <p className="mt-0.5 text-xs text-slate-400">Unresolved requests per assignee</p>
            <div className="mt-4 space-y-3">
              {assignees.map((a) => {
                const count = db.requests.filter((r) => r.assignedTo === a && !['Resolved', 'Rejected'].includes(r.status)).length
                return (
                  <button key={a} onClick={() => { setAssignee(a); setStatus('All'); setView('all'); setPage(1) }} className="flex w-full items-center gap-2.5 text-left">
                    <Avatar name={a} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-slate-600 dark:text-slate-300">{a}</span>
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, count * 22)}%` }} /></span>
                    <span className="w-5 text-right text-[11px] font-semibold">{count}</span>
                  </button>
                )
              })}
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-brand-600 to-violet-700 p-5 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><ShieldCheck className="h-4.5 w-4.5" /></div>
            <h3 className="mt-3 text-sm font-semibold text-white">Response promise</h3>
            <p className="mt-1 text-xs leading-relaxed text-brand-100">Acknowledge every request within one business day. High and urgent requests are reviewed first.</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-brand-100"><Users className="h-3.5 w-3.5" /> {counts.open + counts.progress} active conversations</div>
          </Card>
        </div>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title="Request thread"
        description={selected ? `${selected.id} · ${selected.type}` : ''}
        width="lg"
        footer={selected ? (
          <>
            <Button variant="ghost" className="mr-auto text-rose-600 dark:text-rose-400" onClick={() => setDeleteTarget(selected)}><Trash2 className="h-4 w-4" /> Delete</Button>
            {selected.status === 'Open' && <Button onClick={() => setConfirmAction({ request: selected, action: 'start' })}><ArrowRight className="h-4 w-4" /> Start working</Button>}
            {selected.status === 'In Progress' && <><Button variant="danger" onClick={() => setConfirmAction({ request: selected, action: 'reject' })}>Reject</Button><Button onClick={() => setConfirmAction({ request: selected, action: 'resolve' })}><CheckCircle2 className="h-4 w-4" /> Resolve</Button></>}
            {['Resolved', 'Rejected'].includes(selected.status) && <Button variant="secondary" onClick={() => setConfirmAction({ request: selected, action: 'reopen' })}><RotateCcw className="h-4 w-4" /> Reopen</Button>}
          </>
        ) : null}
      >
        {selected && (() => {
          const e = empMap.get(selected.employeeId)
          return (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={selected.status} /><Badge tone={priorityTone(selected.priority)} dot>{selected.priority} priority</Badge><Badge tone="slate">{selected.type}</Badge></div>
                <h3 className="mt-2 text-lg font-bold leading-snug">{selected.subject}</h3>
                <p className="mt-1 text-[11px] text-slate-400">Raised {fmtDate(selected.createdAt)} · {selected.responses.length} messages</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-white/[0.03]">
                <Avatar name={e ? `${e.firstName} ${e.lastName}` : selected.employeeId} src={e?.photo} size="md" />
                <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{e ? `${e.firstName} ${e.lastName}` : selected.employeeId}</p><p className="text-[10px] text-slate-400">{e?.designation} · {e?.department} · {e?.email}</p></div>
                <div className="w-full sm:w-44">
                  <label className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Assigned to</label>
                  <Select value={selected.assignedTo} onChange={(ev) => reassign(ev.target.value)} className="h-8 py-1 text-xs">{assignees.map((a) => <option key={a}>{a}</option>)}</Select>
                </div>
              </div>

              <div>
                <h4 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400"><MessageSquareText className="h-3.5 w-3.5" /> Conversation</h4>
                <div className="space-y-3">
                  {selected.responses.map((resp, i) => {
                    const isAgent = resp.author !== (e ? `${e.firstName} ${e.lastName}` : '')
                    return (
                      <div key={resp.id} className={`flex gap-2.5 ${isAgent ? 'flex-row-reverse' : ''}`}>
                        <Avatar name={resp.author} size="sm" className="mt-0.5" />
                        <div className={`max-w-[82%] rounded-xl px-3.5 py-2.5 ${isAgent ? 'rounded-tr-sm bg-brand-600 text-white' : 'rounded-tl-sm bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-200'}`}>
                          <div className="flex items-center gap-2"><span className={`text-[10px] font-semibold ${isAgent ? 'text-brand-100' : 'text-slate-500 dark:text-slate-300'}`}>{resp.author}</span><span className={`text-[9px] ${isAgent ? 'text-brand-200' : 'text-slate-400'}`}>{fmtDateTime(resp.date)}</span></div>
                          <p className={`mt-1 text-xs leading-relaxed ${isAgent ? 'text-white' : ''}`}>{resp.message}</p>
                          {i === 0 && <span className={`mt-1 block text-[9px] ${isAgent ? 'text-brand-200' : 'text-slate-400'}`}>Original request</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {!['Resolved', 'Rejected'].includes(selected.status) ? (
                <div className="rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Reply to employee</h4>
                  <Textarea value={response} onChange={(ev) => setResponse(ev.target.value)} placeholder="Share an update, ask for documents, or confirm next steps…" className="mt-2 min-h-[80px]" />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400"><ShieldCheck className="h-3 w-3" /> Reply is stored locally</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setConfirmAction({ request: selected, action: 'resolve' })}><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</Button>
                      <Button size="sm" onClick={sendResponse} disabled={!response.trim()}><Send className="h-3.5 w-3.5" /> Send reply</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-white/[0.03]">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">This request is {selected.status.toLowerCase()}.</p>
                  <p className="mt-1 text-[11px] text-slate-400">Reopen it to continue the conversation or add a final note.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 p-3.5 text-[11px] dark:border-white/[0.06]">
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Employee ID</p><p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">{selected.employeeId}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Request type</p><p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">{selected.type}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Assigned owner</p><p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">{selected.assignedTo}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Created</p><p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">{fmtDate(selected.createdAt)}</p></div>
              </div>
            </div>
          )
        })()}
      </Drawer>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New employee request"
        description="Log an HR request on behalf of an employee. It starts in the Open queue."
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={createRequest}><Plus className="h-4 w-4" /> Create request</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee" required error={errors.employeeId}>
            <Select value={form.employeeId} onChange={(e) => setField('employeeId', e.target.value)}><option value="">Select employee</option>{db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.department}</option>)}</Select>
          </Field>
          <Field label="Request type"><Select value={form.type} onChange={(e) => setField('type', e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Subject" required error={errors.subject} className="sm:col-span-2"><Input value={form.subject} onChange={(e) => setField('subject', e.target.value)} placeholder="e.g. Employment certificate for visa application" invalid={!!errors.subject} /></Field>
          <Field label="Priority"><Select value={form.priority} onChange={(e) => setField('priority', e.target.value)}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label="Assign to"><Select value={form.assignedTo} onChange={(e) => setField('assignedTo', e.target.value)}>{['Aisha Bello', 'Amara Okafor', 'Victor Nwosu', 'Hassan Ali', 'Tom Becker'].map((a) => <option key={a}>{a}</option>)}</Select></Field>
          <Field label="Description" required error={errors.description} className="sm:col-span-2"><Textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Add the details the employee shared, including dates and document requirements." invalid={!!errors.description} /></Field>
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 dark:bg-white/[0.03] dark:text-slate-400 sm:col-span-2">The request will be visible in the shared queue and assigned directly to the selected owner. No email is sent in this demo.</div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={runAction}
        title={confirmAction?.action === 'start' ? 'Start working on this request?' : confirmAction?.action === 'resolve' ? 'Resolve this request?' : confirmAction?.action === 'reject' ? 'Reject this request?' : 'Reopen this request?'}
        description={confirmAction ? (confirmAction.action === 'start' ? `${confirmAction.request.id} moves to In Progress and appears in your active queue.` : confirmAction.action === 'resolve' ? `${confirmAction.request.id} will be marked Resolved and a completion note added to the thread.` : confirmAction.action === 'reject' ? `${confirmAction.request.id} will be marked Rejected with a final note in the thread.` : `${confirmAction.request.id} returns to the Open queue.`) : ''}
        confirmLabel={confirmAction?.action === 'start' ? 'Start working' : confirmAction?.action === 'resolve' ? 'Resolve request' : confirmAction?.action === 'reject' ? 'Reject request' : 'Reopen request'}
        tone={confirmAction?.action === 'reject' ? 'danger' : 'primary'}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeRequest}
        title="Delete this request?"
        description={deleteTarget ? `${deleteTarget.id} · ${deleteTarget.subject} and its conversation will be removed from the local demo.` : ''}
        confirmLabel="Delete request"
        tone="danger"
      />
    </div>
  )
}
