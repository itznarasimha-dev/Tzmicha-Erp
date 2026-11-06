import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Banknote, CalendarDays, Check, CheckCircle2, ChevronRight, CircleDollarSign,
  Download, FileText, Play, Search, Users, Wallet,
} from 'lucide-react'
import { useStore } from '../store'
import type { PayrollEntry, PayrollStatus } from '../types'
import { downloadCSV, fmtDate, fmtMoney, fullName, monthLabel, sum, todayISO } from '../lib/utils'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, Field, Input, Modal, PageHeader,
  Pagination, ProgressBar, SearchInput, Select, StatCard, StatusBadge,
} from '../components/ui'

const FLOW: PayrollStatus[] = ['Draft', 'HR Review', 'Finance Approval', 'Approved', 'Paid']

const nextAction = (status: PayrollStatus): { next: PayrollStatus; label: string; actor: string; description: string } | null => {
  switch (status) {
    case 'Draft': return { next: 'HR Review', label: 'Submit for HR review', actor: 'HR', description: 'Submitting the payroll entry moves it to the HR review queue. Attendance and leave adjustments should be confirmed first.' }
    case 'HR Review': return { next: 'Finance Approval', label: 'Approve as HR', actor: 'HR', description: 'This confirms the salary components and attendance adjustments, and sends the entry to Finance for funding approval.' }
    case 'Finance Approval': return { next: 'Approved', label: 'Approve for payment', actor: 'Finance', description: 'Finance approval locks the amount and marks the entry as approved. No real bank transfer will be initiated in this demo.' }
    case 'Approved': return { next: 'Paid', label: 'Mark as paid', actor: 'Finance', description: 'This simulates marking the payroll entry as paid. In production this would reconcile with the bank transfer file.' }
    default: return null
  }
}

export default function Payroll() {
  const { db, update, logActivity, toast } = useStore()
  const navigate = useNavigate()
  const periods = useMemo(() => Array.from(new Set(db.payroll.map((p) => p.period))).sort().reverse(), [db.payroll])
  const [period, setPeriod] = useState(periods[0] || todayISO().slice(0, 7))
  const [status, setStatus] = useState('All')
  const [department, setDepartment] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<PayrollEntry | null>(null)
  const [runOpen, setRunOpen] = useState(false)
  const [runPeriod, setRunPeriod] = useState(periods[0] || todayISO().slice(0, 7))

  const empMap = useMemo(() => new Map(db.employees.map((e) => [e.id, e])), [db.employees])
  const periodEntries = useMemo(() => db.payroll.filter((p) => p.period === period), [db.payroll, period])
  const selected = db.payroll.find((p) => p.id === selectedId) || null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return periodEntries.filter((p) => {
      const e = empMap.get(p.employeeId)
      const matchSearch = !q || (e && (fullName(e).toLowerCase().includes(q) || e.id.toLowerCase().includes(q))) || p.id.toLowerCase().includes(q)
      return matchSearch && (status === 'All' || p.status === status) && (department === 'All' || e?.department === department)
    }).sort((a, b) => {
      const nameA = empMap.get(a.employeeId) ? fullName(empMap.get(a.employeeId)!) : ''
      const nameB = empMap.get(b.employeeId) ? fullName(empMap.get(b.employeeId)!) : ''
      return nameA.localeCompare(nameB)
    })
  }, [periodEntries, empMap, search, status, department])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const from = (currentPage - 1) * pageSize
  const rows = filtered.slice(from, from + pageSize)

  const gross = (p: PayrollEntry) => p.basic + p.allowances + p.overtime
  const deductions = (p: PayrollEntry) => p.deductions + p.leaveDeduction + p.tax
  const net = (p: PayrollEntry) => gross(p) - deductions(p)

  const totals = {
    gross: sum(periodEntries.map(gross)),
    deductions: sum(periodEntries.map(deductions)),
    net: sum(periodEntries.map(net)),
    paid: sum(periodEntries.filter((p) => p.status === 'Paid').map(net)),
    pending: periodEntries.filter((p) => ['HR Review', 'Finance Approval'].includes(p.status)).length,
  }

  const stepCounts = FLOW.map((s) => ({ status: s, count: periodEntries.filter((p) => p.status === s).length }))

  const applyAction = () => {
    if (!confirm) return
    const action = nextAction(confirm.status)
    if (!action) return
    update((d) => ({ ...d, payroll: d.payroll.map((p) => (p.id === confirm.id ? { ...p, status: action.next } : p)) }))
    const e = empMap.get(confirm.employeeId)
    logActivity('payment', `Payroll moved to ${action.next}`, `${e ? fullName(e) : confirm.employeeId} · ${monthLabel(confirm.period)}`)
    toast(action.next === 'Paid' ? 'Payroll marked as paid' : `Moved to ${action.next}`, 'success', `${e ? fullName(e) : 'Employee'} · ${monthLabel(confirm.period)}`)
    setConfirm(null)
    setSelectedId(null)
  }

  const runPayroll = () => {
    if (!runPeriod) return
    const existing = new Set(db.payroll.filter((p) => p.period === runPeriod).map((p) => p.employeeId))
    const targets = db.employees.filter((e) => e.status !== 'Terminated' && !existing.has(e.id))
    if (!targets.length) {
      toast('Payroll already prepared', 'info', `${monthLabel(runPeriod)} already has entries for every active employee.`)
      return
    }
    const entries: PayrollEntry[] = targets.map((e, i) => {
      const basic = Math.round(e.salary / 12)
      const allowances = Math.round(basic * 0.18)
      const overtime = i % 6 === 0 ? 240 : 0
      const leaveDeduction = i % 7 === 0 ? Math.round(basic * 0.03) : 0
      return {
        id: `PR-${runPeriod.replace('-', '')}-${e.id.replace('EMP-', '')}`, employeeId: e.id, period: runPeriod,
        basic, allowances, overtime, deductions: i % 5 === 0 ? 90 : 0, leaveDeduction,
        tax: Math.round((basic + allowances) * 0.22), attendanceDays: 21 - (i % 3), leaveDays: i % 7 === 0 ? 1 : 0,
        status: 'Draft', note: 'Payroll run created from the preparation workspace.',
      }
    })
    update((d) => ({ ...d, payroll: [...entries, ...d.payroll] }))
    logActivity('payment', 'Payroll run prepared', `${monthLabel(runPeriod)} · ${entries.length} employees`)
    toast('Payroll entries prepared', 'success', `${entries.length} draft entries created for ${monthLabel(runPeriod)}.`)
    setRunOpen(false)
    setPeriod(runPeriod)
  }

  const exportPayroll = () => {
    downloadCSV(`titan-hr-payroll-${period}.csv`, [
      ['Period', 'Employee ID', 'Employee', 'Department', 'Basic', 'Allowances', 'Overtime', 'Deductions', 'Leave adjustment', 'Tax', 'Net pay', 'Attendance days', 'Leave days', 'Status'],
      ...filtered.map((p) => { const e = empMap.get(p.employeeId); return [monthLabel(p.period), p.employeeId, e ? fullName(e) : p.employeeId, e?.department || '', p.basic, p.allowances, p.overtime, p.deductions, p.leaveDeduction, p.tax, net(p), p.attendanceDays, p.leaveDays, p.status] }),
    ])
    toast('Payroll export ready', 'success', `${filtered.length} entries written to CSV.`)
  }

  const downloadPayslip = (p: PayrollEntry) => {
    const e = empMap.get(p.employeeId)
    downloadCSV(`payslip-${p.employeeId}-${p.period}.csv`, [
      ['TITAN HR — DEMO PAYSLIP'], ['Period', monthLabel(p.period)], ['Employee', e ? fullName(e) : p.employeeId], ['Employee ID', p.employeeId], ['Department', e?.department || ''],
      [], ['EARNINGS'], ['Basic salary', p.basic], ['Allowances', p.allowances], ['Overtime', p.overtime], ['Gross pay', gross(p)],
      [], ['DEDUCTIONS'], ['Other deductions', p.deductions], ['Leave adjustment', p.leaveDeduction], ['Tax', p.tax], ['Total deductions', deductions(p)],
      [], ['NET PAY', net(p)], ['Status', p.status], ['Attendance days', p.attendanceDays], ['Leave days', p.leaveDays], ['Note', p.note || ''],
      [], ['This is demo data. No real payroll was processed.'],
    ])
    toast('Payslip downloaded', 'success', `Demo payslip for ${e ? fullName(e) : p.employeeId} exported.`)
  }

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Coordinate the payroll cycle, review attendance adjustments and move entries through HR review and Finance approval."
        crumbs={['Finance & Legal', 'Payroll']}
        actions={<><Button variant="secondary" onClick={exportPayroll}><Download className="h-4 w-4" /> Export</Button><Button onClick={() => setRunOpen(true)}><Play className="h-4 w-4" /> Run payroll</Button></>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-soft dark:border-white/[0.06] dark:bg-ink-900">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><CalendarDays className="h-4 w-4 text-brand-500" /> Payroll period</span>
        <Select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1) }} className="h-9 w-auto min-w-[170px] text-xs">
          {periods.map((p) => <option key={p} value={p}>{monthLabel(p)}</option>)}
        </Select>
        <Badge tone={period === periods[0] ? 'amber' : 'green'}>{period === periods[0] ? 'Current cycle' : 'Closed cycle'}</Badge>
        <span className="ml-auto text-[11px] text-slate-400">All amounts in USD · Demo payroll — no real bank transfers</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} label="Gross payroll" value={fmtMoney(totals.gross, true)} icon={Wallet} tone="brand" hint={`${periodEntries.length} employees`} />
        <StatCard index={1} label="Net payable" value={fmtMoney(totals.net, true)} icon={Banknote} tone="green" hint={`${fmtMoney(totals.deductions, true)} deductions`} />
        <StatCard index={2} label="Pending approval" value={totals.pending} icon={CircleDollarSign} tone="amber" hint="HR + Finance review" />
        <StatCard index={3} label="Paid" value={fmtMoney(totals.paid, true)} icon={CheckCircle2} tone="violet" hint={`${periodEntries.filter((p) => p.status === 'Paid').length} settlements complete`} />
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Payroll workflow</h3>
          <span className="text-[11px] text-slate-400">Click a stage to filter the table</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {stepCounts.map((step, i) => (
            <div key={step.status} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => setStatus(status === step.status ? 'All' : step.status)}
                className={`flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition ${status === step.status ? 'border-brand-300 bg-brand-50/60 shadow-sm dark:border-brand-500/40 dark:bg-brand-500/[0.08]' : 'border-slate-100 hover:border-slate-200 dark:border-white/[0.06] dark:hover:border-white/15'}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300' : i === FLOW.length - 1 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'}`}>
                  {i === FLOW.length - 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{step.status}</span>
                  <span className="block text-[10px] text-slate-400">{step.count} {step.count === 1 ? 'entry' : 'entries'}</span>
                </span>
              </button>
              {i < FLOW.length - 1 && <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:block" />}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-4 dark:border-white/[0.05] xl:flex-row xl:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search employee or payroll ID…" className="w-full xl:max-w-sm" />
          <div className="flex flex-wrap gap-2 xl:ml-auto">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="All">All departments</option>{db.settings.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="All">All statuses</option>{FLOW.map((s) => <option key={s}>{s}</option>)}</Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
              <tr><th className="table-head">Employee</th><th className="table-head text-right">Basic</th><th className="table-head text-right">Allowances</th><th className="table-head text-right">Overtime</th><th className="table-head text-right">Deductions</th><th className="table-head text-right">Leave adj.</th><th className="table-head text-right">Tax</th><th className="table-head text-right">Net pay</th><th className="table-head">Attendance</th><th className="table-head">Status</th><th className="table-head text-right">Action</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const e = empMap.get(p.employeeId)
                return (
                  <tr key={p.id} className="table-row cursor-pointer" onClick={() => setSelectedId(p.id)}>
                    <td className="table-cell"><div className="flex items-center gap-2.5"><Avatar name={e ? fullName(e) : p.employeeId} src={e?.photo} size="sm" /><div><p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{e ? fullName(e) : p.employeeId}</p><p className="text-[10px] text-slate-400">{e?.department} · {p.id}</p></div></div></td>
                    <td className="table-cell text-right tabular">{fmtMoney(p.basic)}</td>
                    <td className="table-cell text-right tabular">{fmtMoney(p.allowances)}</td>
                    <td className="table-cell text-right tabular">{p.overtime ? fmtMoney(p.overtime) : '—'}</td>
                    <td className="table-cell text-right tabular text-rose-600 dark:text-rose-400">{p.deductions ? `−${fmtMoney(p.deductions)}` : '—'}</td>
                    <td className="table-cell text-right tabular text-rose-600 dark:text-rose-400">{p.leaveDeduction ? `−${fmtMoney(p.leaveDeduction)}` : '—'}</td>
                    <td className="table-cell text-right tabular text-rose-600 dark:text-rose-400">−{fmtMoney(p.tax)}</td>
                    <td className="table-cell text-right tabular font-bold text-slate-900 dark:text-white">{fmtMoney(net(p))}</td>
                    <td className="table-cell"><p className="text-[11px]">{p.attendanceDays} days · {p.leaveDays} leave</p><p className="text-[10px] text-slate-400">attendance-based</p></td>
                    <td className="table-cell"><StatusBadge status={p.status} /></td>
                    <td className="table-cell text-right"><Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); setSelectedId(p.id) }}>View <ChevronRight className="h-3 w-3" /></Button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState icon={Wallet} title="No payroll entries" description="No payroll entries match this period and filters. Prepare a payroll run or adjust your filters." action={<Button onClick={() => setRunOpen(true)}><Play className="h-4 w-4" /> Run payroll</Button>} />}
        </div>
        {filtered.length > 0 && <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} from={from} to={Math.min(from + pageSize, filtered.length)} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} label="entries" />}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title="Payroll entry"
        description={selected ? `${selected.id} · ${monthLabel(selected.period)}` : ''}
        width="md"
        footer={selected ? (
          <>
            <Button variant="secondary" onClick={() => downloadPayslip(selected)}><Download className="h-4 w-4" /> Payslip</Button>
            {nextAction(selected.status) ? <Button onClick={() => setConfirm(selected)}>{nextAction(selected.status)!.label} <ArrowRight className="h-4 w-4" /></Button> : <Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button>}
          </>
        ) : null}
      >
        {selected && (() => {
          const e = empMap.get(selected.employeeId)
          const action = nextAction(selected.status)
          const stage = FLOW.indexOf(selected.status)
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                <Avatar name={e ? fullName(e) : selected.employeeId} src={e?.photo} size="lg" />
                <div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 dark:text-slate-100">{e ? fullName(e) : selected.employeeId}</p><p className="text-[11px] text-slate-400">{e?.designation} · {e?.department}</p><p className="text-[10px] text-slate-400">{e?.id} · {monthLabel(selected.period)}</p></div>
                <StatusBadge status={selected.status} />
              </div>

              <div>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Earnings</h4>
                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-white/[0.06]">
                  {[['Basic salary', selected.basic], ['Allowances', selected.allowances], ['Overtime', selected.overtime]].map(([label, value], i) => (
                    <div key={label as string} className={`flex items-center justify-between px-3.5 py-2.5 text-xs ${i > 0 ? 'border-t border-slate-100 dark:border-white/[0.05]' : ''}`}><span className="text-slate-500 dark:text-slate-400">{label}</span><span className="tabular font-semibold text-slate-800 dark:text-slate-200">{fmtMoney(value as number)}</span></div>
                  ))}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs dark:border-white/[0.05] dark:bg-white/[0.02]"><span className="font-semibold text-slate-600 dark:text-slate-300">Gross pay</span><span className="tabular font-bold text-slate-900 dark:text-white">{fmtMoney(gross(selected))}</span></div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Deductions & adjustments</h4>
                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-white/[0.06]">
                  {[['Other deductions', selected.deductions], ['Leave-related adjustment', selected.leaveDeduction], ['Estimated tax', selected.tax]].map(([label, value], i) => (
                    <div key={label as string} className={`flex items-center justify-between px-3.5 py-2.5 text-xs ${i > 0 ? 'border-t border-slate-100 dark:border-white/[0.05]' : ''}`}><span className="text-slate-500 dark:text-slate-400">{label}</span><span className="tabular font-semibold text-rose-600 dark:text-rose-400">−{fmtMoney(value as number)}</span></div>
                  ))}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs dark:border-white/[0.05] dark:bg-white/[0.02]"><span className="font-semibold text-slate-600 dark:text-slate-300">Total deductions</span><span className="tabular font-bold text-rose-600 dark:text-rose-400">−{fmtMoney(deductions(selected))}</span></div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-3.5 text-white">
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-brand-100">Net payable</p><p className="text-[10px] text-brand-200">{monthLabel(selected.period)}</p></div>
                <p className="tabular text-2xl font-bold">{fmtMoney(net(selected))}</p>
              </div>

              <div className="rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]">
                <h4 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400"><CalendarDays className="h-3.5 w-3.5" /> Attendance-based adjustments</h4>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div><p className="text-slate-400">Attendance days credited</p><p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{selected.attendanceDays} days</p></div>
                  <div><p className="text-slate-400">Leave days deducted</p><p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{selected.leaveDays} days</p></div>
                  <div><p className="text-slate-400">Leave adjustment</p><p className="mt-0.5 font-semibold text-rose-500">{fmtMoney(selected.leaveDeduction)}</p></div>
                  <div><p className="text-slate-400">Overtime credit</p><p className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoney(selected.overtime)}</p></div>
                </div>
                <p className="mt-2.5 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-slate-400 dark:border-white/[0.06]">Calculated from {selected.attendanceDays} credited attendance days and {selected.leaveDays} unpaid leave days in this cycle.</p>
              </div>

              <div>
                <h4 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Approval progress</h4>
                <div className="space-y-2.5">
                  {FLOW.map((s, i) => (
                    <div key={s} className="flex items-center gap-2.5">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${i <= stage ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}>{i < stage ? <Check className="h-3 w-3" /> : i + 1}</span>
                      <span className={`flex-1 text-[11px] ${i <= stage ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{s}</span>
                      {i === stage && <Badge tone="brand">Current</Badge>}
                      {i < stage && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    </div>
                  ))}
                </div>
              </div>

              {action && (
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3.5 text-[11px] leading-relaxed text-slate-600 dark:border-brand-500/20 dark:bg-brand-500/[0.05] dark:text-slate-300">
                  <p className="font-semibold text-brand-700 dark:text-brand-300">Next step · {action.actor}</p>
                  <p className="mt-1">{action.description}</p>
                </div>
              )}

              {selected.note && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] italic text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">{selected.note}</p>}
            </div>
          )
        })()}
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={applyAction}
        title={confirm && nextAction(confirm.status) ? nextAction(confirm.status)!.label : 'Update payroll'}
        description={confirm && nextAction(confirm.status) ? nextAction(confirm.status)!.description : ''}
        confirmLabel={confirm && nextAction(confirm.status) ? nextAction(confirm.status)!.label : 'Confirm'}
        tone={confirm?.status === 'Approved' ? 'primary' : 'primary'}
      />

      <Modal open={runOpen} onClose={() => setRunOpen(false)} title="Run payroll" description="Prepare draft payroll entries for active employees in a period. Existing entries are never duplicated." footer={<><Button variant="secondary" onClick={() => setRunOpen(false)}>Cancel</Button><Button onClick={runPayroll}><Play className="h-4 w-4" /> Prepare payroll</Button></>}>
        <div className="space-y-4">
          <Field label="Payroll period" required><Input type="month" value={runPeriod} onChange={(e) => setRunPeriod(e.target.value)} /></Field>
          <div className="rounded-xl bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
            <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">What this does</p>
            <p>Creates draft entries with basic salary, allowances, estimated tax and attendance adjustments for every active employee who does not already have a payroll entry in the selected period.</p>
            <p className="mt-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {db.employees.filter((e) => e.status !== 'Terminated' && !db.payroll.some((p) => p.period === runPeriod && p.employeeId === e.id)).length} employees need an entry for {runPeriod ? monthLabel(runPeriod) : 'this period'}.</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
