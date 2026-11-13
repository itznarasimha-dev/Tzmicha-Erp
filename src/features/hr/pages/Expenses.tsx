import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useStore } from '../store'
import { useHrExpenses } from '../useHrData'
import { describeMissingPermission, useHrAccess } from '../lib/access'
import { hrActions, runHrApiAction } from '../api-actions'
import { downloadCSV, fmtDate, fmtMoney, todayISO } from '../lib/utils'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
} from '../components/ui'
import { HrPermissionNotice } from '../components/hr-guard'

type ExpenseStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Reimbursed' | string

type DecisionAction = 'approve' | 'reject' | 'request-changes' | 'reimburse'

const CATEGORIES = [
  'Travel',
  'Meals',
  'Accommodation',
  'Office Supplies',
  'Training',
  'Medical',
  'Communication',
  'Other',
] as const

const blankForm = {
  category: 'Other' as (typeof CATEGORIES)[number],
  amount: '',
  currency: 'INR',
  expenseDate: todayISO(),
  description: '',
  receiptPath: '',
  submit: true,
}

export default function Expenses() {
  const { dataSource, refreshFromApi, toast, syncStatus } = useStore()
  const access = useHrAccess()
  const isApi = dataSource === 'api'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [category, setCategory] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [decision, setDecision] = useState<{ id: string; code: string; action: DecisionAction } | null>(null)
  const [remarks, setRemarks] = useState('')
  const [decisionBusy, setDecisionBusy] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [search, status, category, pageSize])

  const query = useHrExpenses({
    q: search || undefined,
    status: status === 'All' ? undefined : status,
    category: category === 'All' ? undefined : category,
    page,
    pageSize,
  })

  const paginated = query.data as any
  const rows = (paginated?.data ?? []) as any[]
  const meta = paginated?.meta
  const total = Number(meta?.total ?? rows.length)
  const totalPages = Math.max(1, Number(meta?.totalPages ?? 1))

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === 'Pending').length
    const approved = rows.filter((r) => r.status === 'Approved').length
    const paid = rows.filter((r) => ['Paid', 'Reimbursed'].includes(r.status)).length
    const amount = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0)
    return { pending, approved, paid, amount }
  }, [rows])

  const resetFilters = () => {
    setSearch('')
    setStatus('All')
    setCategory('All')
    setPage(1)
  }

  const exportExpenses = () => {
    downloadCSV('titan-hr-expenses.csv', [
      ['Expense ID', 'Code', 'Employee', 'Category', 'Amount', 'Currency', 'Date', 'Status', 'Description', 'Reviewer remarks'],
      ...rows.map((r) => [
        r.id ?? '',
        r.code ?? '',
        r.employeeName ?? r.employeeId ?? '',
        r.category ?? '',
        r.amount ?? '',
        r.currency ?? '',
        r.expenseDate ?? '',
        r.status ?? '',
        r.description ?? '',
        r.reviewerRemarks ?? '',
      ]),
    ])
    toast('Expenses exported', 'success', `${rows.length} expense records written to CSV.`)
  }

  const openCreate = () => {
    setForm(blankForm)
    setErrors({})
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    if (!isApi) {
      toast('Live ERP API is not connected', 'warning', 'HR expenses require an authenticated API session. Demo/local expense records are not available in this module.')
      return
    }
    const next: Record<string, string> = {}
    if (!form.amount || Number(form.amount) <= 0) next.amount = 'Enter a valid amount'
    if (!form.expenseDate) next.expenseDate = 'Expense date is required'
    if (!form.description.trim() || form.description.trim().length < 5) next.description = 'Description must be at least 5 characters'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    const res = await runHrApiAction(
      { dataSource, refreshFromApi, toast },
      {
        action: () =>
          hrActions.createHrExpense({
            category: form.category,
            amount: Number(form.amount),
            currency: form.currency || 'INR',
            expenseDate: form.expenseDate,
            description: form.description.trim(),
            receiptPath: form.receiptPath.trim() || undefined,
            submit: form.submit,
          }),
        successMessage: form.submit ? 'Expense submitted' : 'Expense saved',
        successDescription: form.submit
          ? 'The expense claim was submitted to the ERP for review.'
          : 'The expense draft was saved.',
        errorTitle: 'Could not save expense',
      },
    )
    setSaving(false)
    if (res.ok) {
      setCreateOpen(false)
      await query.refetch()
    }
  }

  const runDecision = async () => {
    if (!decision || !isApi) return
    if ((decision.action === 'reject' || decision.action === 'request-changes') && !remarks.trim()) {
      toast('Remarks required', 'warning', 'Please provide remarks for this action.')
      return
    }
    setDecisionBusy(true)
    const actionCall = () => {
      if (decision.action === 'approve') return hrActions.approveHrExpense(decision.id, remarks.trim() || undefined)
      if (decision.action === 'reject') return hrActions.rejectHrExpense(decision.id, remarks.trim())
      if (decision.action === 'request-changes') return hrActions.requestHrExpenseChanges(decision.id, remarks.trim())
      return hrActions.reimburseHrExpense(decision.id, remarks.trim() || undefined)
    }
    const titles: Record<DecisionAction, string> = {
      approve: 'Expense approved',
      reject: 'Expense rejected',
      'request-changes': 'Changes requested',
      reimburse: 'Expense reimbursed',
    }
    const res = await runHrApiAction(
      { dataSource, refreshFromApi, toast },
      {
        action: actionCall,
        successMessage: titles[decision.action],
        errorTitle: 'Could not update expense',
      },
    )
    setDecisionBusy(false)
    if (res.ok) {
      setDecision(null)
      setRemarks('')
      await query.refetch()
    }
  }

  const canApprove = (s: ExpenseStatus) => s === 'Pending' && access.can('expense.approve')
  const canReimburse = (s: ExpenseStatus) => s === 'Approved' && access.can('expense.reimburse')

  return (
    <div>
      <PageHeader
        title="HR Expenses"
        subtitle="Review and manage employee expense claims submitted through the HR expense workflow."
        crumbs={['Finance & Legal', 'HR Expenses']}
        actions={
          <>
            {isApi && (
              <Button
                variant="secondary"
                onClick={() => void query.refetch()}
                disabled={query.loading || syncStatus === 'loading'}
              >
                <RefreshCw className={`h-4 w-4 ${query.loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            )}
            <Button variant="secondary" onClick={exportExpenses} disabled={!rows.length}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={openCreate} disabled={!isApi || !access.can('expense.submit')} title={access.can('expense.submit') ? undefined : describeMissingPermission('expense.submit')}>
              <Plus className="h-4 w-4" /> New expense
            </Button>
          </>
        }
      />

      {isApi && !access.can('expense.approve') && !access.can('expense.reimburse') && (
        <HrPermissionNotice className="mb-4" message={`${describeMissingPermission('expense.approve')} You can submit and track your own expenses but cannot approve or reimburse them.`} />
      )}

      {!isApi && (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Live ERP API connection required</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                HR expenses are managed through the existing backend expense workflow and are not available as local demo records in this module.
                Connect and sign in to the ERP API to view, submit, approve, reject, or reimburse expense claims.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isApi && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard index={0} label="Visible claims" value={total} icon={Wallet} tone="brand" hint="Current query result" />
            <StatCard index={1} label="Pending review" value={stats.pending} icon={Send} tone="amber" hint="On this page" />
            <StatCard index={2} label="Approved" value={stats.approved} icon={CheckCircle2} tone="green" hint="On this page" />
            <StatCard index={3} label="Paid / reimbursed" value={stats.paid} icon={Wallet} tone="teal" hint={fmtMoney(stats.amount, true) + ' visible amount'} />
          </div>

          <Card className="mt-4">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/[0.05] xl:flex-row xl:items-center">
              <SearchInput value={search} onChange={setSearch} placeholder="Search expenses by code or description…" className="w-full xl:max-w-sm" />
              <div className="flex flex-wrap gap-2 xl:ml-auto">
                <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-[150px]">
                  <option value="All">All statuses</option>
                  {['Draft', 'Pending', 'Approved', 'Rejected', 'Paid', 'Reimbursed'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
                <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto min-w-[150px]">
                  <option value="All">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                {(search || status !== 'All' || category !== 'All') && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>Clear filters</Button>
                )}
              </div>
            </div>

            {query.error && (
              <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{query.error}</span>
                  <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>Retry</Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-slate-50/80 dark:bg-white/[0.025]">
                  <tr>
                    <th className="table-head">Expense</th>
                    <th className="table-head">Employee</th>
                    <th className="table-head">Category</th>
                    <th className="table-head">Date</th>
                    <th className="table-head text-right">Amount</th>
                    <th className="table-head">Status</th>
                    <th className="table-head">Remarks</th>
                    <th className="table-head text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="table-row">
                      <td className="table-cell">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{r.code || r.id}</p>
                        <p className="max-w-[260px] truncate text-[11px] text-slate-400">{r.description || '—'}</p>
                      </td>
                      <td className="table-cell">{r.employeeName || r.employeeId || '—'}</td>
                      <td className="table-cell"><Badge tone="slate">{r.category || 'Other'}</Badge></td>
                      <td className="table-cell tabular">{r.expenseDate ? fmtDate(r.expenseDate) : '—'}</td>
                      <td className="table-cell text-right tabular font-semibold">{fmtMoney(Number(r.amount ?? 0))} <span className="text-[10px] font-normal text-slate-400">{r.currency || ''}</span></td>
                      <td className="table-cell"><StatusBadge status={String(r.status || 'Draft')} /></td>
                      <td className="table-cell"><p className="max-w-[220px] truncate text-[11px] text-slate-500 dark:text-slate-400">{r.reviewerRemarks || '—'}</p></td>
                      <td className="table-cell">
                        <div className="flex justify-end gap-1.5">
                          {canApprove(r.status) && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => { setRemarks(''); setDecision({ id: r.id, code: r.code || r.id, action: 'approve' }) }}>Approve</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setRemarks(''); setDecision({ id: r.id, code: r.code || r.id, action: 'request-changes' }) }}><RotateCcw className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 dark:text-rose-400" onClick={() => { setRemarks(''); setDecision({ id: r.id, code: r.code || r.id, action: 'reject' }) }}><XCircle className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                          {canReimburse(r.status) && (
                            <Button size="sm" variant="secondary" onClick={() => { setRemarks(''); setDecision({ id: r.id, code: r.code || r.id, action: 'reimburse' }) }}>Reimburse</Button>
                          )}
                          {!canApprove(r.status) && !canReimburse(r.status) && <span className="text-[11px] text-slate-400">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {query.loading && (
                <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading HR expenses from the ERP API…</div>
              )}

              {!query.loading && !query.error && rows.length === 0 && (
                <EmptyState
                  icon={Wallet}
                  title="No HR expenses found"
                  description={search || status !== 'All' || category !== 'All' ? 'Try adjusting your filters to see more results.' : 'No expense claims have been submitted yet.'}
                  action={(search || status !== 'All' || category !== 'All') ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : <Button onClick={openCreate}><Plus className="h-4 w-4" /> New expense</Button>}
                />
              )}
            </div>

            {total > 0 && (
              <Pagination
                page={meta?.page ?? page}
                totalPages={totalPages}
                total={total}
                from={rows.length ? ((meta?.page ?? page) - 1) * (meta?.pageSize ?? pageSize) + 1 : 0}
                to={rows.length ? ((meta?.page ?? page) - 1) * (meta?.pageSize ?? pageSize) + rows.length : 0}
                onPage={setPage}
                pageSize={meta?.pageSize ?? pageSize}
                onPageSize={(n) => { setPageSize(n); setPage(1) }}
                label="expenses"
              />
            )}
          </Card>
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Submit HR expense"
        description="Create and optionally submit an employee expense claim through the existing ERP workflow."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitCreate()} loading={saving}>{form.submit ? 'Submit expense' : 'Save draft'}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Expense date" required error={errors.expenseDate}>
            <Input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} invalid={!!errors.expenseDate} />
          </Field>
          <Field label="Amount" required error={errors.amount}>
            <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} invalid={!!errors.amount} placeholder="0.00" />
          </Field>
          <Field label="Currency">
            <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="INR" />
          </Field>
          <Field label="Description" required error={errors.description} className="sm:col-span-2">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} invalid={!!errors.description} placeholder="Describe the expense (minimum 5 characters)" />
          </Field>
          <Field label="Receipt path / reference (optional)" className="sm:col-span-2">
            <Input value={form.receiptPath} onChange={(e) => setForm((f) => ({ ...f, receiptPath: e.target.value }))} placeholder="Storage path or receipt reference if available" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 sm:col-span-2">
            <input type="checkbox" checked={form.submit} onChange={(e) => setForm((f) => ({ ...f, submit: e.target.checked }))} />
            Submit for review immediately
          </label>
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 dark:bg-white/[0.03] dark:text-slate-400 sm:col-span-2">
            Receipt upload/storage integration is environment-dependent. Provide a storage path/reference only if your deployment already supports it.
          </div>
        </div>
      </Modal>

      {decision && (
        <Modal
          open={!!decision}
          onClose={() => { if (!decisionBusy) { setDecision(null); setRemarks('') } }}
          title={`${decision.action === 'approve' ? 'Approve' : decision.action === 'reject' ? 'Reject' : decision.action === 'request-changes' ? 'Request changes' : 'Reimburse'} ${decision.code}`}
          description={decision.action === 'reject' || decision.action === 'request-changes' ? 'Provide remarks for the claimant/reviewer (required).' : 'Optionally add remarks for the audit trail.'}
          footer={
            <>
              <Button variant="secondary" onClick={() => { if (!decisionBusy) { setDecision(null); setRemarks('') } }}>Cancel</Button>
              <Button onClick={() => void runDecision()} loading={decisionBusy} variant={decision.action === 'reject' ? 'danger' : 'primary'}>Confirm</Button>
            </>
          }
        >
          <Field label={`Remarks${decision.action === 'reject' || decision.action === 'request-changes' ? ' (required)' : ' (optional)'}`}>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add remarks…" />
          </Field>
        </Modal>
      )}
    </div>
  )
}