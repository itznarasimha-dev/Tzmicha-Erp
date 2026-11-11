import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, Banknote, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3,
  CreditCard, Download, FileText, Plus, Receipt, ShieldCheck, Send, ThumbsDown, ThumbsUp,
  Users, Wallet, XCircle,
} from 'lucide-react'
import { useStore } from '../store'
import { runHrApiAction, hrActions } from '../api-actions'
import type { DailyPayment } from '../types'
import { downloadCSV, fmtDate, fmtDateTime, fmtMoney, sum, todayISO, uid } from '../lib/utils'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, Field, Input, Modal, PageHeader,
  Pagination, SearchInput, Select, StatCard, StatusBadge, Textarea,
} from '../components/ui'

type SortKey = 'newest' | 'amount' | 'due'

const blankForm = {
  payee: '', partyType: 'Employee' as DailyPayment['partyType'], employeeId: '', category: 'Reimbursement',
  amount: '', dueDate: todayISO(), method: 'Bank Transfer' as DailyPayment['method'], description: '',
}

export default function DailyPayments() {
  const { db, update, logActivity, toast, dataSource, refreshFromApi } = useStore()
  const [search, setSearch] = useState('')
  const [approval, setApproval] = useState('All')
  const [payment, setPayment] = useState('All')
  const [partyType, setPartyType] = useState('All')
  const [category, setCategory] = useState('All')
  const [period, setPeriod] = useState('All')
  const [sort, setSort] = useState<SortKey>('newest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ payment: DailyPayment; action: 'approve' | 'reject' | 'pay' } | null>(null)
  const [recordOpen, setRecordOpen] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const selected = db.payments.find((p) => p.id === selectedId) || null
  const empMap = useMemo(() => new Map(db.employees.map((e) => [e.id, e])), [db.employees])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const today = todayISO()
    const list = db.payments.filter((p) => {
      const matchSearch = !q || p.payee.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      const payee = p.employeeId ? empMap.get(p.employeeId) : undefined
      const matchEmployee = !q || (payee && `${payee.firstName} ${payee.lastName}`.toLowerCase().includes(q))
      const withinPeriod = period === 'All'
        || (period === 'Today' && p.date === today)
        || (period === 'This week' && p.date >= new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
        || (period === 'This month' && p.date.slice(0, 7) === today.slice(0, 7))
        || (period === 'Overdue' && p.paymentStatus === 'Overdue')
      return (matchSearch || matchEmployee) && withinPeriod && (approval === 'All' || p.approvalStatus === approval) && (payment === 'All' || p.paymentStatus === payment) && (partyType === 'All' || p.partyType === partyType) && (category === 'All' || p.category === category)
    })
    return list.sort((a, b) => {
      if (sort === 'amount') return b.amount - a.amount
      if (sort === 'due') return a.dueDate.localeCompare(b.dueDate)
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    })
  }, [db.payments, empMap, search, approval, payment, partyType, category, period, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const from = (currentPage - 1) * pageSize
  const rows = filtered.slice(from, from + pageSize)
  const today = todayISO()
  const month = today.slice(0, 7)

  const totals = useMemo(() => {
    const all = db.payments
    return {
      recordedToday: sum(all.filter((p) => p.date === today).map((p) => p.amount)),
      todayCount: all.filter((p) => p.date === today).length,
      awaiting: sum(all.filter((p) => p.approvalStatus === 'Pending').map((p) => p.amount)),
      awaitingCount: all.filter((p) => p.approvalStatus === 'Pending').length,
      toPay: sum(all.filter((p) => p.approvalStatus === 'Approved' && !['Paid', 'Failed'].includes(p.paymentStatus)).map((p) => p.amount)),
      toPayCount: all.filter((p) => p.approvalStatus === 'Approved' && !['Paid', 'Failed'].includes(p.paymentStatus)).length,
      paidMonth: sum(all.filter((p) => p.paymentStatus === 'Paid' && p.date.slice(0, 7) === month).map((p) => p.amount)),
      overdue: sum(all.filter((p) => p.paymentStatus === 'Overdue').map((p) => p.amount)),
      overdueCount: all.filter((p) => p.paymentStatus === 'Overdue').length,
    }
  }, [db.payments, today, month])

  const stageCounts = {
    recorded: db.payments.length,
    approval: db.payments.filter((p) => p.approvalStatus === 'Pending').length,
    approved: db.payments.filter((p) => p.approvalStatus === 'Approved' && !['Paid', 'Failed'].includes(p.paymentStatus)).length,
    paid: db.payments.filter((p) => p.paymentStatus === 'Paid').length,
  }

  const resetFilters = () => {
    setSearch(''); setApproval('All'); setPayment('All'); setPartyType('All'); setCategory('All'); setPeriod('All'); setPage(1)
  }

  const setField = (key: keyof typeof blankForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const selectEmployee = (employeeId: string) => {
    const emp = db.employees.find((e) => e.id === employeeId)
    setForm((f) => ({ ...f, employeeId, payee: emp ? `${emp.firstName} ${emp.lastName}` : f.payee }))
    setErrors((e) => ({ ...e, employeeId: '', payee: '' }))
  }

  const recordPayment = async () => {
    const next: Record<string, string> = {}
    if (!form.payee.trim()) next.payee = form.partyType === 'Employee' ? 'Select an employee' : 'Payee name is required'
    if (!form.amount || Number(form.amount) <= 0) next.amount = 'Enter an amount greater than zero'
    if (!form.dueDate) next.dueDate = 'Due date is required'
    if (!form.description.trim()) next.description = 'Add a short description'
    setErrors(next)
    if (Object.keys(next).length || saving) return

    if (dataSource === 'api') {
      setSaving(true)
      const res = await runHrApiAction({ dataSource, refreshFromApi, toast }, {
        action: () => hrActions.createPayment({
          payee: form.payee.trim(),
          partyType: form.partyType,
          employeeId: form.partyType === 'Employee' ? form.employeeId || undefined : undefined,
          paymentDate: todayISO(),
          dueDate: form.dueDate,
          category: form.category,
          amount: Number(form.amount),
          method: form.method,
          description: form.description.trim(),
        }),
        successMessage: 'Payment recorded',
        successDescription: `${form.payee.trim()} · ${fmtMoney(Number(form.amount))} submitted for Finance approval.`,
        errorTitle: 'Could not record payment',
      })
      setSaving(false)
      if (res.ok) {
        setRecordOpen(false)
        setForm(blankForm)
        setPage(1)
      }
      return
    }

    setSaving(true)
    window.setTimeout(() => {
      const amount = Number(form.amount)
      const payment: DailyPayment = {
        id: `PAY-${Math.max(8000, ...db.payments.map((p) => Number(p.id.replace(/\D/g, '')) || 8000)) + 1}`,
        payee: form.payee.trim(),
        partyType: form.partyType,
        employeeId: form.partyType === 'Employee' ? form.employeeId || undefined : undefined,
        date: todayISO(),
        dueDate: form.dueDate,
        category: form.category,
        amount,
        method: form.method,
        approvalStatus: 'Pending',
        paymentStatus: 'Pending',
        description: form.description.trim(),
        history: [
          { id: uid('ph'), date: todayISO(), action: 'Payment recorded', actor: 'Aisha Bello' },
          { id: uid('ph'), date: todayISO(), action: 'Submitted for approval', actor: 'Aisha Bello' },
        ],
      }
      update((d) => ({ ...d, payments: [payment, ...d.payments] }))
      logActivity('payment', 'Daily payment recorded', `${payment.id} · ${payment.payee} · ${fmtMoney(payment.amount)}`)
      toast('Payment recorded (demo)', 'success', `${payment.id} · ${fmtMoney(payment.amount)} submitted for Finance approval. Demo data is not saved to the database.`)
      setSaving(false)
      setRecordOpen(false)
      setForm(blankForm)
      setPage(1)
    }, 350)
  }

  const applyAction = async () => {
    if (!confirm) return
    const { payment, action } = confirm

    if (dataSource === 'api') {
      const ui = { dataSource, refreshFromApi, toast }
      if (action === 'approve') {
        await runHrApiAction(ui, {
          action: () => hrActions.approvePayment(payment.id),
          successMessage: 'Payment approved',
          successDescription: `${payment.id} · ${payment.payee} approved and queued for payment.`,
          errorTitle: 'Could not approve payment',
        })
      } else if (action === 'reject') {
        await runHrApiAction(ui, {
          action: () => hrActions.rejectPayment(payment.id, 'Rejected through the ERP approval workflow.'),
          successMessage: 'Payment rejected',
          successDescription: `${payment.id} · ${payment.payee} was rejected and will not be paid.`,
          errorTitle: 'Could not reject payment',
        })
      } else {
        await runHrApiAction(ui, {
          action: () => hrActions.changePaymentStatus(payment.id, 'Paid', 'Marked as paid through the ERP.'),
          successMessage: 'Payment marked as paid',
          successDescription: `${payment.id} · ${fmtMoney(payment.amount)} to ${payment.payee}.`,
          errorTitle: 'Could not mark payment as paid',
        })
      }
      setConfirm(null)
      if (action === 'pay') setSelectedId(null)
      return
    }

    const patch: Partial<DailyPayment> = {}
    let title = ''
    let detail = ''
    if (action === 'approve') {
      patch.approvalStatus = 'Approved'
      patch.paymentStatus = 'Processing'
      patch.approvedBy = 'Grace Kim'
      title = 'Payment approved'
      detail = `${payment.id} · ${payment.payee} approved and queued for payment.`
    } else if (action === 'reject') {
      patch.approvalStatus = 'Rejected'
      patch.paymentStatus = 'Failed'
      patch.remarks = 'Rejected in the demo approval workspace.'
      title = 'Payment rejected'
      detail = `${payment.id} · ${payment.payee} was rejected and will not be paid.`
    } else {
      patch.paymentStatus = 'Paid'
      title = 'Payment marked as paid'
      detail = `${payment.id} · ${fmtMoney(payment.amount)} to ${payment.payee}. No real transfer was made.`
    }
    update((d) => ({
      ...d,
      payments: d.payments.map((p) => (p.id === payment.id ? {
        ...p, ...patch,
        history: [...p.history, { id: uid('ph'), date: todayISO(), action: title, actor: 'Grace Kim' }],
      } : p)),
    }))
    logActivity('payment', title, detail.split(' · ')[1] || detail)
    toast(title, action === 'reject' ? 'warning' : 'success', `${detail} Demo data is not saved to the database.`)
    setConfirm(null)
    if (action === 'pay') setSelectedId(null)
  }

  const exportPayments = () => {
    downloadCSV('titan-hr-daily-payments.csv', [
      ['Payment ID', 'Date', 'Due date', 'Payee', 'Party type', 'Category', 'Amount (USD)', 'Method', 'Approval status', 'Payment status', 'Approved by', 'Description'],
      ...filtered.map((p) => [p.id, p.date, p.dueDate, p.payee, p.partyType, p.category, p.amount, p.method, p.approvalStatus, p.paymentStatus, p.approvedBy || '', p.description]),
    ])
    toast('Payments exported', 'success', `${filtered.length} payments written to CSV.`)
  }

  const actionFor = (p: DailyPayment) => {
    if (p.approvalStatus === 'Pending') return { label: 'Review', type: 'approve' as const }
    if (p.approvalStatus === 'Approved' && !['Paid', 'Failed'].includes(p.paymentStatus)) return { label: 'Mark paid', type: 'pay' as const }
    return null
  }

  return (
    <div>
      <PageHeader
        title="Daily Payments"
        subtitle="Record one-off reimbursements, contractor fees and vendor invoices, then route them through Finance approval and simulated payment."
        crumbs={['Finance & Legal', 'Daily Payments']}
        actions={
          <>
            <Button variant="secondary" onClick={exportPayments} disabled={!filtered.length}><Download className="h-4 w-4" /> Export</Button>
            <Button onClick={() => setRecordOpen(true)}><Plus className="h-4 w-4" /> Record payment</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-soft dark:border-white/[0.06] dark:bg-ink-900">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><CalendarDays className="h-4 w-4 text-brand-500" /> {fmtDate(today)}</span>
        <Badge tone="brand" dot>Live daily ledger</Badge>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> Demo only — no real payments or bank transfers</span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard index={0} label="Recorded today" value={fmtMoney(totals.recordedToday, true)} icon={Receipt} tone="brand" hint={`${totals.todayCount} payments`} onClick={() => { setPeriod('Today'); setPage(1) }} />
        <StatCard index={1} label="Awaiting approval" value={fmtMoney(totals.awaiting, true)} icon={Clock3} tone="amber" hint={`${totals.awaitingCount} in queue`} onClick={() => { setApproval('Pending'); setPage(1) }} />
        <StatCard index={2} label="Approved to pay" value={fmtMoney(totals.toPay, true)} icon={Wallet} tone="blue" hint={`${totals.toPayCount} ready`} onClick={() => { setApproval('Approved'); setPayment('Processing'); setPage(1) }} />
        <StatCard index={3} label="Paid this month" value={fmtMoney(totals.paidMonth, true)} icon={CheckCircle2} tone="green" hint="Settled demo payments" onClick={() => { setPayment('Paid'); setPeriod('This month'); setPage(1) }} />
        <StatCard index={4} label="Overdue" value={fmtMoney(totals.overdue, true)} icon={AlertTriangle} tone="red" hint={`${totals.overdueCount} payments late`} onClick={() => { setPeriod('Overdue'); setPage(1) }} />
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Payment workflow</h3>
          <span className="text-[11px] text-slate-400">Recorded → Approval → Approved → Paid</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {[
            { label: 'Recorded', count: stageCounts.recorded, icon: FileText, tone: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300' },
            { label: 'Approval', count: stageCounts.approval, icon: Clock3, tone: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
            { label: 'Approved', count: stageCounts.approved, icon: ThumbsUp, tone: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400' },
            { label: 'Paid', count: stageCounts.paid, icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
          ].map((step, i) => (
            <div key={step.label} className="flex flex-1 items-center gap-2">
              <div className="flex w-full items-center gap-2.5 rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${step.tone}`}><step.icon className="h-4 w-4" /></span>
                <span><span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">{step.label}</span><span className="block text-[10px] text-slate-400">{step.count} payments</span></span>
              </div>
              {i < 3 && <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:block" />}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/[0.05] xl:flex-row xl:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search payee, description or payment ID…" className="w-full xl:max-w-sm" />
          <div className="flex flex-wrap gap-2 xl:ml-auto">
            <Select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1) }} className="w-auto"><option value="All">All dates</option><option>Today</option><option>This week</option><option>This month</option><option value="Overdue">Overdue only</option></Select>
            <Select value={approval} onChange={(e) => { setApproval(e.target.value); setPage(1) }} className="w-auto"><option value="All">All approvals</option><option>Pending</option><option>Approved</option><option>Rejected</option></Select>
            <Select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1) }} className="w-auto"><option value="All">All payment states</option><option>Pending</option><option>Processing</option><option>Paid</option><option>Failed</option><option>Overdue</option></Select>
            <Select value={partyType} onChange={(e) => { setPartyType(e.target.value); setPage(1) }} className="w-auto"><option value="All">All parties</option><option>Employee</option><option>Contractor</option><option>Vendor</option></Select>
            <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="w-auto"><option value="All">All categories</option>{db.settings.paymentCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-auto"><option value="newest">Newest first</option><option value="amount">Highest amount</option><option value="due">Due date</option></Select>
            {(search || approval !== 'All' || payment !== 'All' || partyType !== 'All' || category !== 'All' || period !== 'All') && <Button variant="ghost" size="sm" onClick={resetFilters}>Clear</Button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px]">
            <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
              <tr>
                <th className="table-head">Payee</th>
                <th className="table-head">Category</th>
                <th className="table-head">Date</th>
                <th className="table-head">Method</th>
                <th className="table-head text-right">Amount</th>
                <th className="table-head">Approval</th>
                <th className="table-head">Payment</th>
                <th className="table-head text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const emp = p.employeeId ? empMap.get(p.employeeId) : undefined
                const action = actionFor(p)
                return (
                  <tr key={p.id} className="table-row cursor-pointer" onClick={() => setSelectedId(p.id)}>
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.payee} src={emp?.photo} size="sm" />
                        <div className="min-w-0">
                          <p className="max-w-[190px] truncate text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{p.payee}</p>
                          <p className="text-[10px] text-slate-400">{p.id} · {p.partyType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell"><p className="text-[12px]">{p.category}</p><p className="max-w-[190px] truncate text-[10px] text-slate-400">{p.description}</p></td>
                    <td className="table-cell"><p className="text-[12px]">{fmtDate(p.date)}</p><p className={`text-[10px] ${p.paymentStatus === 'Overdue' ? 'text-rose-500' : 'text-slate-400'}`}>due {fmtDate(p.dueDate)}</p></td>
                    <td className="table-cell"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><CreditCard className="h-3.5 w-3.5" /> {p.method}</span></td>
                    <td className="table-cell text-right tabular font-bold text-slate-900 dark:text-white">{fmtMoney(p.amount)}</td>
                    <td className="table-cell"><StatusBadge status={p.approvalStatus} /></td>
                    <td className="table-cell"><StatusBadge status={p.paymentStatus} /></td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {action && (
                          <Button size="sm" variant={action.type === 'pay' ? 'subtle' : 'outline'} onClick={() => setConfirm({ payment: p, action: action.type })}>{action.label}</Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(p.id)}>View <ChevronRight className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && (
            <EmptyState
              icon={Banknote}
              title="No payments match your filters"
              description={db.payments.length ? 'Try a different date range, approval or payment state.' : 'Record your first daily payment to start the approval workflow.'}
              action={db.payments.length ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : <Button onClick={() => setRecordOpen(true)}><Plus className="h-4 w-4" /> Record payment</Button>}
            />
          )}
        </div>
        {filtered.length > 0 && <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} from={from} to={Math.min(from + pageSize, filtered.length)} onPage={setPage} pageSize={pageSize} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="payments" />}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title="Payment details"
        description={selected ? `${selected.id} · ${selected.payee}` : ''}
        width="md"
        footer={selected ? (
          <>
            <Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button>
            {selected.approvalStatus === 'Pending' && <><Button variant="danger" onClick={() => setConfirm({ payment: selected, action: 'reject' })}>Reject</Button><Button onClick={() => setConfirm({ payment: selected, action: 'approve' })}><Check className="h-4 w-4" /> Approve</Button></>}
            {selected.approvalStatus === 'Approved' && !['Paid', 'Failed'].includes(selected.paymentStatus) && <Button onClick={() => setConfirm({ payment: selected, action: 'pay' })}><Send className="h-4 w-4" /> Mark as paid</Button>}
          </>
        ) : null}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.03]">
              <Avatar name={selected.payee} src={selected.employeeId ? empMap.get(selected.employeeId)?.photo : undefined} size="lg" />
              <div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 dark:text-slate-100">{selected.payee}</p><p className="text-[11px] text-slate-400">{selected.partyType} · {selected.category}</p><p className="text-[10px] text-slate-400">{selected.id}</p></div>
              <StatusBadge status={selected.paymentStatus} />
            </div>

            <div className="rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-4 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-100">Payment amount</p>
              <p className="tabular mt-1 text-3xl font-bold">{fmtMoney(selected.amount)}</p>
              <p className="mt-1 text-[11px] text-brand-200">{fmtDate(selected.date)} · {selected.method} · due {fmtDate(selected.dueDate)}</p>
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Approval workflow</h4>
              <div className="space-y-2.5">
                {[
                  { label: 'Recorded', done: true, active: false },
                  { label: 'Finance approval', done: selected.approvalStatus === 'Approved', active: selected.approvalStatus === 'Pending' },
                  { label: 'Approved', done: selected.approvalStatus === 'Approved', active: false },
                  { label: 'Paid', done: selected.paymentStatus === 'Paid', active: selected.approvalStatus === 'Approved' && selected.paymentStatus !== 'Paid' },
                ].map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2.5">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${s.done ? 'bg-emerald-500 text-white' : s.active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}>{s.done ? <Check className="h-3 w-3" /> : i + 1}</span>
                    <span className={`flex-1 text-[11px] ${s.done || s.active ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{s.label}</span>
                    {s.active && <Badge tone="brand">Current</Badge>}
                    {s.done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                ))}
              </div>
              {selected.approvalStatus === 'Rejected' && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-[11px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><XCircle className="h-3.5 w-3.5" /> Rejected — no payment will be processed.</div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-white/[0.06]">
              {[
                ['Description', selected.description],
                ['Category', selected.category],
                ['Party type', selected.partyType],
                ['Method', selected.method],
                ['Recorded date', fmtDate(selected.date)],
                ['Due date', fmtDate(selected.dueDate)],
                ['Approved by', selected.approvedBy || '—'],
              ].map(([label, value], i) => (
                <div key={label} className={`flex items-start justify-between gap-4 px-3.5 py-2.5 text-xs ${i > 0 ? 'border-t border-slate-100 dark:border-white/[0.05]' : ''}`}>
                  <span className="shrink-0 text-slate-400">{label}</span>
                  <span className="text-right font-medium text-slate-700 dark:text-slate-200">{value}</span>
                </div>
              ))}
            </div>

            {selected.remarks && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] italic text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{selected.remarks}</p>}

            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400"><Clock3 className="h-3.5 w-3.5" /> Payment history</h4>
              <div className="space-y-3">
                {[...selected.history].reverse().map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 0 ? 'bg-brand-500' : 'bg-slate-300 dark:bg-white/20'}`} />
                    <div><p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{h.action}</p><p className="text-[10px] text-slate-400">{h.actor} · {fmtDate(h.date)}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-400 dark:bg-white/[0.03]"><ShieldCheck className="h-3.5 w-3.5 shrink-0" /> This workflow is simulated. No bank transfer, card charge or real money movement occurs.</p>
          </div>
        )}
      </Drawer>

      <Modal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record a payment"
        description="Add a one-off payment to the local ledger. It will start in Pending approval."
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setRecordOpen(false)}>Cancel</Button><Button onClick={recordPayment} loading={saving}><Plus className="h-4 w-4" /> Record payment</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Party type">
            <Select value={form.partyType} onChange={(e) => { setForm((f) => ({ ...f, partyType: e.target.value as DailyPayment['partyType'], employeeId: '', payee: '' })) }}>
              <option>Employee</option><option>Contractor</option><option>Vendor</option>
            </Select>
          </Field>
          {form.partyType === 'Employee' ? (
            <Field label="Employee" required error={errors.employeeId}>
              <Select value={form.employeeId} onChange={(e) => selectEmployee(e.target.value)}>
                <option value="">Select employee</option>
                {db.employees.filter((e) => e.status !== 'Terminated').map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.department}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Payee name" required error={errors.payee}><Input value={form.payee} onChange={(e) => setField('payee', e.target.value)} placeholder={form.partyType === 'Vendor' ? 'e.g. Northwind Cloud' : 'Contractor name'} invalid={!!errors.payee} /></Field>
          )}
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setField('category', e.target.value)}>{db.settings.paymentCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</Select>
          </Field>
          <Field label="Amount (USD)" required error={errors.amount}><Input type="number" min={1} value={form.amount} onChange={(e) => setField('amount', e.target.value)} placeholder="450" invalid={!!errors.amount} /></Field>
          <Field label="Payment method">
            <Select value={form.method} onChange={(e) => setField('method', e.target.value)}>{(['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Card'] as const).map((m) => <option key={m}>{m}</option>)}</Select>
          </Field>
          <Field label="Due date" required error={errors.dueDate}><Input type="date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)} invalid={!!errors.dueDate} /></Field>
          <Field label="Description" required error={errors.description} className="sm:col-span-2"><Textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="What is this payment for? Include invoice or receipt references." invalid={!!errors.description} /></Field>
          <div className="rounded-xl bg-brand-50/70 p-3 text-[11px] leading-relaxed text-brand-700 dark:bg-brand-500/[0.07] dark:text-brand-300 sm:col-span-2">
            <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-3.5 w-3.5" /> Demo payment only</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">The payment is stored locally and routed through a simulated Finance approval. No real money moves.</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={applyAction}
        title={confirm?.action === 'approve' ? 'Approve this payment?' : confirm?.action === 'reject' ? 'Reject this payment?' : 'Mark payment as paid?'}
        description={confirm ? (confirm.action === 'approve'
          ? `${confirm.payment.id} · ${confirm.payment.payee} · ${fmtMoney(confirm.payment.amount)} will move to Approved and be queued for payment.`
          : confirm.action === 'reject'
            ? `${confirm.payment.id} · ${confirm.payment.payee} will be rejected and marked Failed. This is recorded in the payment history.`
            : `${confirm.payment.id} · ${fmtMoney(confirm.payment.amount)} to ${confirm.payment.payee} will be marked Paid. No real transfer is initiated in this demo.`) : ''}
        confirmLabel={confirm?.action === 'approve' ? 'Approve payment' : confirm?.action === 'reject' ? 'Reject payment' : 'Mark as paid'}
        tone={confirm?.action === 'reject' ? 'danger' : 'primary'}
      />
    </div>
  )
}
