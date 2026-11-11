import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  CircleAlert,
  Download,
  FileText,
  Landmark,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDemoData } from '../context/DemoDataContext'
import { useToast } from '../context/ToastContext'
import { runMarketingApiAction, marketingApi } from '../api-actions'
import type {
  CelebrityPayment,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  FieldClaim,
  Invoice,
} from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { DataTable } from '../components/ui/DataTable'
import { SectionCard } from '../components/ui/SectionCard'
import { AvatarWithName } from '../components/ui/Avatar'
import { ProgressBar, utilisationTone } from '../components/ui/ProgressBar'
import {
  ChartCard,
  ChartTooltip,
  LegendItem,
  PieLegend,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../components/charts/ChartKit'
import {
  DataNote,
  DemoNote,
  DetailRows,
  EntityCard,
  EntityGrid,
  MetricCard,
  MetricGrid,
  TabIntro,
} from '../components/marketing/ModuleKit'
import { campaignName } from '../data/marketing'
import { budgetUtilisation } from '../utils/analytics'
import { downloadCsv } from '../utils/csv'
import { dateOnlyFromNow, daysUntil } from '../utils/dates'
import { formatDate, formatINR, formatINRCompact, formatNumber, formatPercent, uid } from '../utils/format'

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Advertising',
  'Content Production',
  'Events',
  'Field Marketing',
  'Printing',
  'Influencer Fees',
  'Travel',
  'Other',
]
const EXPENSE_STATUSES: ExpenseStatus[] = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Paid']
const INVOICE_STATUSES: Invoice['status'][] = ['Pending', 'Approved', 'Scheduled', 'Paid']
const CELEB_STATUSES: CelebrityPayment['status'][] = ['Pending', 'Approved', 'Scheduled', 'Paid']

type ExpenseFormValues = {
  category: ExpenseCategory
  campaignId: string
  vendorId: string
  amount: string
  date: string
  purpose: string
  receiptName: string
}

type ClaimFormValues = {
  purpose: string
  amount: string
  date: string
  receiptName: string
}

export function ExpensesPaymentsPage({ tab }: { tab: string }) {
  const { data, update, addNotification, dataSource, refreshFromApi } = useDemoData()
  const { pushToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const chartAnim = useChartAnimation()
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expenseId, setExpenseId] = useState<string | null>(null)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [claimOpen, setClaimOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setExpenseOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const activeExpense = data.expenses.find((expense) => expense.id === expenseId) ?? null
  const editingExpense = data.expenses.find((expense) => expense.id === editingExpenseId) ?? null

  const filteredExpenses = useMemo(
    () =>
      data.expenses.filter((expense) => {
        if (statusFilter !== 'All' && expense.status !== statusFilter) return false
        if (categoryFilter !== 'All' && expense.category !== categoryFilter) return false
        return true
      }),
    [data.expenses, statusFilter, categoryFilter],
  )

  const recognisedExpenses = data.expenses.filter((expense) => expense.status !== 'Rejected' && expense.status !== 'Draft')
  const pendingExpenses = data.expenses.filter((expense) => expense.status === 'Pending Approval')
  const outstandingInvoices = data.invoices.filter((invoice) => invoice.status !== 'Paid')
  const openClaims = data.fieldClaims.filter((claim) => claim.status === 'Submitted' || claim.status === 'Approved')

  const categorySpend = EXPENSE_CATEGORIES.map((category, index) => ({
    name: category,
    value: recognisedExpenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0),
    color: chartColors[index % chartColors.length],
  })).filter((entry) => entry.value > 0)

  const invoiceStatusData = (['Pending', 'Approved', 'Scheduled', 'Paid'] as Invoice['status'][]).map((status, index) => ({
    name: status,
    value: data.invoices.filter((invoice) => invoice.status === status).length,
    color: chartColors[index % chartColors.length],
  }))

  const budgetRows = useMemo(
    () =>
      data.campaigns
        .filter((campaign) => campaign.status !== 'Archived')
        .map((campaign) => {
          const committed = data.expenses
            .filter(
              (expense) =>
                expense.campaignId === campaign.id &&
                (expense.status === 'Pending Approval' || expense.status === 'Approved'),
            )
            .reduce((sum, expense) => sum + expense.amount, 0)
          const forecast = campaign.spend + committed
          const utilisation = budgetUtilisation(forecast, campaign.budget)
          return { campaign, committed, forecast, utilisation }
        })
        .sort((a, b) => (b.utilisation ?? 0) - (a.utilisation ?? 0)),
    [data.campaigns, data.expenses],
  )

  const vendorName = (vendorId: string | null) =>
    vendorId ? data.agencies.find((agency) => agency.id === vendorId)?.name ?? vendorId : 'Internal / no vendor'
  const influencerName = (influencerId: string) =>
    data.influencers.find((influencer) => influencer.id === influencerId)?.name ?? influencerId

  const setExpenseStatus = async (expense: Expense, status: ExpenseStatus, note?: string) => {
    const allowed: Record<ExpenseStatus, ExpenseStatus[]> = {
      Draft: ['Pending Approval'],
      'Pending Approval': ['Draft', 'Approved', 'Rejected'],
      Approved: ['Paid'],
      Rejected: ['Draft'],
      Paid: [],
    }
    if (!allowed[expense.status].includes(status)) {
      pushToast({
        title: 'Action not available',
        description: `${expense.ref} cannot move from ${expense.status} to ${status}. Approved and Paid are separate steps.`,
        tone: 'warning',
      })
      return
    }

    if (dataSource === 'api') {
      const ui = { dataSource, refreshFromApi, pushToast }
      if (status === 'Pending Approval' && expense.status === 'Draft') {
        await runMarketingApiAction(ui, {
          action: () => marketingApi.submitExpense(expense.id),
          successTitle: 'Expense submitted for approval',
          successDescription: `${expense.ref} · ${formatINR(expense.amount)} · ${expense.purpose}`,
          errorTitle: 'Could not submit expense',
          refresh: true,
        })
        return
      }
      if (status === 'Approved' && expense.status === 'Pending Approval') {
        await runMarketingApiAction(ui, {
          action: () => marketingApi.decideExpense(expense.id, { decision: 'Approved', comments: note?.trim() }),
          successTitle: 'Expense approved',
          successDescription: `${expense.ref} · ${formatINR(expense.amount)} · ${expense.purpose}`,
          errorTitle: 'Could not approve expense',
          refresh: true,
        })
        return
      }
      if (status === 'Rejected' && expense.status === 'Pending Approval') {
        await runMarketingApiAction(ui, {
          action: () => marketingApi.decideExpense(expense.id, { decision: 'Rejected', comments: note?.trim() }),
          successTitle: 'Expense rejected',
          successDescription: `${expense.ref} · ${formatINR(expense.amount)} · ${expense.purpose}`,
          errorTitle: 'Could not reject expense',
          refresh: true,
        })
        return
      }
      if (status === 'Paid' && expense.status === 'Approved') {
        await runMarketingApiAction(ui, {
          action: () => marketingApi.reimburseExpense(expense.id, note?.trim()),
          successTitle: 'Expense reimbursed',
          successDescription: `${expense.ref} · ${formatINR(expense.amount)} · ${expense.purpose}`,
          errorTitle: 'Could not reimburse expense',
          refresh: true,
        })
        return
      }
    }

    const reviewerComment =
      status === 'Approved'
        ? note?.trim() || 'Approved in local demo review. Payment is still outstanding.'
        : status === 'Rejected'
          ? note?.trim() || 'Rejected in local demo review.'
          : status === 'Draft'
            ? ''
            : expense.reviewerComment
    update('expenses', (current) =>
      current.map((item) => (item.id === expense.id ? { ...item, status, reviewerComment } : item)),
    )
    addNotification({
      title:
        status === 'Pending Approval'
          ? 'Expense submitted for approval (demo)'
          : status === 'Paid'
            ? 'Expense marked paid in demo'
            : `Expense ${status.toLowerCase()} in demo`,
      body: `${expense.ref} · ${formatINR(expense.amount)} · ${expense.purpose}`,
      kind: 'budget',
      href: '/marketing/expenses/campaign-expenses',
    })
    pushToast({
      title:
        status === 'Pending Approval'
          ? 'Expense submitted for approval'
          : status === 'Approved'
            ? 'Expense approved — not paid'
            : status === 'Paid'
              ? 'Expense marked paid'
              : `Expense marked ${status}`,
      description:
        status === 'Approved'
          ? `${expense.ref} is approved. It remains outstanding until a separate Mark paid action.`
          : `${expense.ref} marked ${status}. No invoice was paid and no finance entry was posted.`,
      tone: status === 'Rejected' ? 'warning' : 'success',
    })
  }

  const saveExpense = async (values: ExpenseFormValues) => {
    const amount = Math.round(Number(values.amount) || 0)

    if (dataSource === 'api') {
      if (editingExpense) {
        await runMarketingApiAction({ dataSource, refreshFromApi, pushToast }, {
          action: () => marketingApi.updateExpense(editingExpense.id, {
            category: values.category,
            campaignId: values.campaignId || undefined,
            vendorName: values.vendorId || undefined,
            amount,
            expenseDate: values.date,
            description: values.purpose.trim(),
            documentPath: values.receiptName.trim() || undefined,
          }),
          successTitle: 'Expense updated',
          successDescription: `${editingExpense.ref} · ${formatINR(amount)} · ${values.purpose.trim()}`,
          errorTitle: 'Could not update expense',
          refresh: true,
        })
        setEditingExpenseId(null)
        setExpenseOpen(false)
        return
      }
      await runMarketingApiAction({ dataSource, refreshFromApi, pushToast }, {
        action: () => marketingApi.createExpense({
          source: 'other',
          title: values.purpose.trim(),
          campaignId: values.campaignId || undefined,
          vendorName: values.vendorId || undefined,
          category: values.category,
          amount,
          expenseDate: values.date,
          description: values.purpose.trim(),
          documentPath: values.receiptName.trim() || undefined,
          submit: false,
        }),
        successTitle: 'Expense draft created',
        successDescription: `${values.purpose.trim()} · ${formatINR(amount)}`,
        errorTitle: 'Could not create expense',
        refresh: true,
      })
      setExpenseOpen(false)
      return
    }

    if (editingExpense) {
      update('expenses', (current) =>
        current.map((item) =>
          item.id === editingExpense.id
            ? {
                ...item,
                category: values.category,
                campaignId: values.campaignId || null,
                vendorId: values.vendorId || null,
                amount,
                date: values.date,
                purpose: values.purpose.trim(),
                receiptName: values.receiptName.trim() || undefined,
                status: item.status === 'Rejected' ? 'Draft' : item.status,
                reviewerComment: item.status === 'Rejected' ? '' : item.reviewerComment,
              }
            : item,
        ),
      )
      pushToast({
        title: 'Expense draft updated (demo)',
        description: `${editingExpense.ref} saved locally. Submit it when ready for demo approval.`,
        tone: 'success',
      })
      setEditingExpenseId(null)
      setExpenseOpen(false)
      return
    }

    const expense: Expense = {
      id: uid('EX'),
      ref: `EXP-2026-${String(460 + data.expenses.length).padStart(4, '0')}`,
      category: values.category,
      campaignId: values.campaignId || null,
      vendorId: values.vendorId || null,
      amount,
      date: values.date,
      purpose: values.purpose.trim(),
      status: 'Draft',
      submittedBy: 'Ananya Rao',
      reviewerComment: '',
      receiptName: values.receiptName.trim() || undefined,
      createdAt: dateOnlyFromNow(0),
    }
    update('expenses', (current) => [expense, ...current])
    addNotification({
      title: 'Expense draft created in demo',
      body: `${expense.ref} · ${formatINR(expense.amount)} · ${expense.purpose}`,
      kind: 'budget',
      href: '/marketing/expenses/campaign-expenses',
    })
    pushToast({
      title: 'Expense draft saved locally (demo)',
      description: `${expense.ref} is a demo draft. Submit it locally or review the status workflow — no finance system was contacted.`,
      tone: 'success',
    })
    setExpenseOpen(false)
  }

  const openExpenseEditor = (expense: Expense) => {
    if (expense.status !== 'Draft' && expense.status !== 'Rejected') {
      pushToast({
        title: 'Editing not available',
        description: 'Withdraw the expense to Draft before editing. Approved and paid records are locked in this demo.',
        tone: 'warning',
      })
      return
    }
    setExpenseId(null)
    setEditingExpenseId(expense.id)
    setExpenseOpen(true)
  }

  const addClaim = (values: ClaimFormValues) => {
    const claim: FieldClaim = {
      id: uid('FC'),
      ref: `CLM-2026-${String(90 + data.fieldClaims.length).padStart(3, '0')}`,
      employee: 'Ananya Rao',
      purpose: values.purpose.trim(),
      date: values.date,
      amount: Math.round(Number(values.amount) || 0),
      status: 'Draft',
      receiptName: values.receiptName.trim() || undefined,
    }
    update('fieldClaims', (current) => [claim, ...current])
    pushToast({
      title: 'Field claim draft saved',
      description: `${claim.ref} is a local demo claim. No reimbursement or payroll action was started.`,
      tone: 'success',
    })
    setClaimOpen(false)
  }

  const setInvoiceStatus = (invoice: Invoice, status: Invoice['status']) => {
    update('invoices', (current) => current.map((item) => (item.id === invoice.id ? { ...item, status } : item)))
    pushToast({
      title: 'Invoice status updated',
      description: `${invoice.ref} marked ${status} in local demo data. No bank transfer or accounts-payable entry was created.`,
      tone: 'success',
    })
  }

  const setCelebrityStatus = (payment: CelebrityPayment, status: CelebrityPayment['status']) => {
    update('celebrityPayments', (current) => current.map((item) => (item.id === payment.id ? { ...item, status } : item)))
    pushToast({
      title: 'Creator payment status updated',
      description: `${payment.ref} marked ${status}. No celebrity or creator payment was made.`,
      tone: 'success',
    })
  }

  const setClaimStatus = (claim: FieldClaim, status: FieldClaim['status']) => {
    const allowed: Record<FieldClaim['status'], FieldClaim['status'][]> = {
      Draft: ['Submitted'],
      Submitted: ['Draft'],
      Approved: ['Reimbursed'],
      Rejected: [],
      Reimbursed: [],
    }
    if (!allowed[claim.status].includes(status)) {
      pushToast({
        title: 'Claim action not available',
        description: `${claim.ref} cannot move from ${claim.status} to ${status}.`,
        tone: 'warning',
      })
      return
    }
    update('fieldClaims', (current) => current.map((item) => (item.id === claim.id ? { ...item, status } : item)))
    addNotification({
      title: status === 'Submitted' ? 'Field claim submitted' : `Field claim ${status.toLowerCase()}`,
      body: `${claim.ref} · ${formatINR(claim.amount)} · ${claim.purpose}`,
      kind: 'budget',
      href: '/marketing/expenses/field-expense-claims',
    })
    pushToast({
      title: status === 'Submitted' ? 'Field claim submitted for review' : `Field claim ${status.toLowerCase()}`,
      description: `${claim.ref} marked ${status}. No reimbursement was processed.`,
      tone: 'success',
    })
  }

  const expenseColumns = (rows: Expense[]) => [
    {
      id: 'ref',
      header: 'Expense',
      mobileLabel: 'Expense',
      sortValue: (expense: Expense) => expense.ref,
      render: (expense: Expense) => (
        <div>
          <p className="cell-primary">{expense.ref}</p>
          <p className="text-xs muted">{expense.category} · {expense.submittedBy}</p>
        </div>
      ),
    },
    {
      id: 'purpose',
      header: 'Purpose',
      mobileLabel: 'Purpose',
      hideMobile: true,
      render: (expense: Expense) => <span className="text-xs" style={{ display: 'block', maxWidth: 280, lineHeight: 1.5 }}>{expense.purpose}</span>,
    },
    {
      id: 'campaign',
      header: 'Campaign',
      mobileLabel: 'Campaign',
      sortValue: (expense: Expense) => campaignName(data.campaigns, expense.campaignId),
      render: (expense: Expense) => <span className="text-xs">{campaignName(data.campaigns, expense.campaignId)}</span>,
    },
    { id: 'date', header: 'Date', mobileLabel: 'Date', sortValue: (expense: Expense) => expense.date, render: (expense: Expense) => formatDate(expense.date) },
    { id: 'amount', header: 'Amount', align: 'right' as const, mobileLabel: 'Amount', sortValue: (expense: Expense) => expense.amount, render: (expense: Expense) => <span className="cell-strong">{formatINR(expense.amount)}</span> },
    {
      id: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      sortValue: (expense: Expense) => expense.status,
      render: (expense: Expense) => (
        <div>
          <StatusBadge status={expense.status} />
          {expense.status === 'Approved' ? <p className="text-xs muted" style={{ marginTop: 3 }}>Awaiting separate payment</p> : null}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right' as const,
      mobileLabel: 'Actions',
      render: (expense: Expense) => (
        <div className="row-6" style={{ justifyContent: 'flex-end' }}>
          {expense.status === 'Draft' ? (
            <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); setExpenseStatus(expense, 'Pending Approval') }}>Submit</Button>
          ) : null}
          {expense.status === 'Pending Approval' ? (
            <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); setExpenseStatus(expense, 'Draft') }}>Withdraw</Button>
          ) : null}
          {expense.status === 'Approved' ? (
            <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); setExpenseStatus(expense, 'Paid') }}>Mark paid</Button>
          ) : null}
          {expense.status === 'Draft' || expense.status === 'Rejected' ? (
            <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); openExpenseEditor(expense) }}>Edit</Button>
          ) : null}
          <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); setExpenseId(expense.id) }}>Open</Button>
        </div>
      ),
    },
  ]

  const exportExpenses = (rows: Expense[], label = 'campaign-expenses') => {
    const result = downloadCsv(`marketing-${label}-demo`, [
      { header: 'Ref', value: (expense: Expense) => expense.ref },
      { header: 'Category', value: (expense: Expense) => expense.category },
      { header: 'Campaign', value: (expense: Expense) => campaignName(data.campaigns, expense.campaignId) },
      { header: 'Vendor', value: (expense: Expense) => vendorName(expense.vendorId) },
      { header: 'Amount', value: (expense: Expense) => expense.amount },
      { header: 'Date', value: (expense: Expense) => expense.date },
      { header: 'Purpose', value: (expense: Expense) => expense.purpose },
      { header: 'Status', value: (expense: Expense) => expense.status },
      { header: 'Submitted by', value: (expense: Expense) => expense.submittedBy },
      { header: 'Receipt', value: (expense: Expense) => expense.receiptName ?? '' },
      { header: 'Reviewer comment', value: (expense: Expense) => expense.reviewerComment },
    ], rows)
    pushToast({ title: result.ok ? 'Expense CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportInvoices = () => {
    const result = downloadCsv('vendor-invoices-demo', [
      { header: 'ID', value: (invoice: Invoice) => invoice.id },
      { header: 'Ref', value: (invoice: Invoice) => invoice.ref },
      { header: 'Vendor', value: (invoice: Invoice) => vendorName(invoice.vendorId) },
      { header: 'Campaign', value: (invoice: Invoice) => campaignName(data.campaigns, invoice.campaignId) },
      { header: 'Description', value: (invoice: Invoice) => invoice.description },
      { header: 'Amount', value: (invoice: Invoice) => invoice.amount },
      { header: 'Due date', value: (invoice: Invoice) => invoice.dueDate },
      { header: 'Status', value: (invoice: Invoice) => invoice.status },
    ], data.invoices)
    pushToast({ title: result.ok ? 'Invoice CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportCelebPayments = () => {
    const result = downloadCsv('celebrity-payments-demo', [
      { header: 'Ref', value: (payment: CelebrityPayment) => payment.ref },
      { header: 'Creator', value: (payment: CelebrityPayment) => influencerName(payment.influencerId) },
      { header: 'Campaign', value: (payment: CelebrityPayment) => campaignName(data.campaigns, payment.campaignId) },
      { header: 'Description', value: (payment: CelebrityPayment) => payment.description },
      { header: 'Amount', value: (payment: CelebrityPayment) => payment.amount },
      { header: 'Due date', value: (payment: CelebrityPayment) => payment.dueDate },
      { header: 'Status', value: (payment: CelebrityPayment) => payment.status },
    ], data.celebrityPayments)
    pushToast({ title: result.ok ? 'Celebrity payments exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportClaims = () => {
    const result = downloadCsv('field-expense-claims-demo', [
      { header: 'Ref', value: (claim: FieldClaim) => claim.ref },
      { header: 'Employee', value: (claim: FieldClaim) => claim.employee },
      { header: 'Purpose', value: (claim: FieldClaim) => claim.purpose },
      { header: 'Date', value: (claim: FieldClaim) => claim.date },
      { header: 'Amount', value: (claim: FieldClaim) => claim.amount },
      { header: 'Status', value: (claim: FieldClaim) => claim.status },
      { header: 'Receipt', value: (claim: FieldClaim) => claim.receiptName ?? '' },
    ], data.fieldClaims)
    pushToast({ title: result.ok ? 'Field claims exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportBudgetRows = () => {
    const result = downloadCsv('budget-vs-actual-demo', [
      { header: 'Campaign', value: (row: typeof budgetRows[number]) => row.campaign.name },
      { header: 'Channel', value: (row: typeof budgetRows[number]) => row.campaign.channel },
      { header: 'Budget', value: (row: typeof budgetRows[number]) => row.campaign.budget },
      { header: 'Reported spend', value: (row: typeof budgetRows[number]) => row.campaign.spend },
      { header: 'Committed expenses', value: (row: typeof budgetRows[number]) => row.committed },
      { header: 'Forecast', value: (row: typeof budgetRows[number]) => row.forecast },
      { header: 'Utilisation %', value: (row: typeof budgetRows[number]) => row.utilisation?.toFixed(1) ?? '' },
    ], budgetRows)
    pushToast({ title: result.ok ? 'Budget vs actual exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const expenseModal = expenseOpen ? (
    <ExpenseModal
      open
      expense={editingExpense}
      onClose={() => {
        setExpenseOpen(false)
        setEditingExpenseId(null)
      }}
      onSave={saveExpense}
      campaigns={data.campaigns}
      vendors={data.agencies}
    />
  ) : null

  const claimModal = claimOpen ? <ClaimModal open onClose={() => setClaimOpen(false)} onSave={addClaim} /> : null

  const expenseDetailModal = activeExpense ? (
    <ExpenseDetailModal
      expense={activeExpense}
      vendorLabel={vendorName(activeExpense.vendorId)}
      campaignLabel={campaignName(data.campaigns, activeExpense.campaignId)}
      onClose={() => setExpenseId(null)}
      onEdit={() => openExpenseEditor(activeExpense)}
      onStatus={(status) => setExpenseStatus(activeExpense, status)}
    />
  ) : null

  if (tab === 'overview') {
    return (
      <div className="stack-20">
        <TabIntro
          title="Expenses & payments overview"
          description="Review sample campaign expenses, vendor invoices, creator fees and field claims. Nothing here moves real money."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportExpenses(data.expenses, 'overview')}>Export register</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setExpenseOpen(true)}>Record expense</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Recorded expenses" value={formatINRCompact(recognisedExpenses.reduce((sum, expense) => sum + expense.amount, 0))} sub={`${recognisedExpenses.length} non-draft, non-rejected records`} icon={<ReceiptText size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Pending approval" value={formatINRCompact(pendingExpenses.reduce((sum, expense) => sum + expense.amount, 0))} sub={`${pendingExpenses.length} expense records`} icon={<AlertTriangle size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Invoices outstanding" value={formatINRCompact(outstandingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))} sub={`${outstandingInvoices.length} demo invoices not paid`} icon={<FileText size={15} />} tone="var(--chart-5)" />
          <MetricCard label="Field claims open" value={formatINRCompact(openClaims.reduce((sum, claim) => sum + claim.amount, 0))} sub={`${openClaims.length} submitted or approved`} icon={<Wallet size={15} />} tone="var(--chart-2)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Expense mix by category" subtitle="Recognised demo expenses, excluding drafts and rejected records" height="md" isEmpty={categorySpend.length === 0}>
            <PieChart>
              <Pie data={categorySpend} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={3} stroke="none" isAnimationActive={chartAnim}>
                {categorySpend.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} />
            </PieChart>
          </ChartCard>
          <ChartCard title="Invoice pipeline" subtitle="Vendor invoice statuses in the demo register" height="md" legend={<>{invoiceStatusData.map((entry) => <LegendItem key={entry.name} color={entry.color} label={entry.name} value={entry.value} />)}</>}>
            <BarChart data={invoiceStatusData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} invoices`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="value" name="Invoices" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
        </div>

        <div className="dashboard-grid dashboard-grid--equal">
          <SectionCard title="Recent expenses" subtitle="Local demo expense records." actions={<Button variant="ghost" size="xs" onClick={() => exportExpenses(data.expenses.slice(0, 6), 'recent-expenses')}>Export</Button>}>
            <div className="stack-10">
              {[...data.expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((expense) => (
                <button key={expense.id} type="button" className="campaign-mini" onClick={() => setExpenseId(expense.id)}>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="campaign-mini__name truncate">{expense.purpose}</span>
                    <span className="campaign-mini__meta">{expense.ref} · {expense.category} · {formatDate(expense.date)}</span>
                  </span>
                  <span className="text-xs font-semibold no-shrink">{formatINRCompact(expense.amount)}</span>
                  <StatusBadge status={expense.status} />
                </button>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Invoices due soon" subtitle="Outstanding demo invoices by due date." actions={<Button variant="ghost" size="xs" onClick={exportInvoices}>Export</Button>}>
            <div className="stack-10">
              {[...outstandingInvoices].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5).map((invoice) => {
                const days = daysUntil(invoice.dueDate)
                return (
                  <div key={invoice.id} className="between" style={{ gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="text-xs font-semibold truncate">{vendorName(invoice.vendorId)}</p>
                      <p className="text-xs muted">{invoice.ref} · due {days !== null && days < 0 ? `${Math.abs(days)}d ago` : `in ${days ?? 0}d`}</p>
                    </div>
                    <span className="text-xs font-semibold no-shrink">{formatINRCompact(invoice.amount)}</span>
                  </div>
                )
              })}
            </div>
            <DataNote>Due dates and amounts are fictional. No accounts-payable system is connected.</DataNote>
          </SectionCard>
        </div>

        <DemoNote>
          All expense, invoice, creator fee and claim records are demo data. Approving, scheduling or marking anything paid only changes a localStorage label — no bank transfer, ERP posting or statutory filing occurs.
        </DemoNote>
        {expenseModal}
        {claimModal}
        {expenseDetailModal}
      </div>
    )
  }

  if (tab === 'campaign-expenses') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Campaign expenses"
          description="Record and review campaign-linked expenses. Status changes are local demo labels and do not create a payment or accounting entry."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportExpenses(filteredExpenses)}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setExpenseOpen(true)}>Record expense</Button>
            </>
          }
        />
        <div className="grid-4">
          <div className="soft-tile"><p className="soft-tile__label">Visible</p><p className="soft-tile__value">{filteredExpenses.length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Pending</p><p className="soft-tile__value">{filteredExpenses.filter((expense) => expense.status === 'Pending Approval').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Approved</p><p className="soft-tile__value">{filteredExpenses.filter((expense) => expense.status === 'Approved').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Value</p><p className="soft-tile__value">{formatINRCompact(filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0))}</p></div>
        </div>
        <DataTable
          data={filteredExpenses}
          columns={expenseColumns(filteredExpenses)}
          rowKey={(expense) => expense.id}
          searchable={(expense) => `${expense.ref} ${expense.purpose} ${expense.category} ${expense.submittedBy} ${campaignName(data.campaigns, expense.campaignId)} ${expense.status}`}
          searchPlaceholder="Search expenses, refs, purposes…"
          pageSize={8}
          initialSort={{ columnId: 'date', direction: 'desc' }}
          onRowClick={(expense) => setExpenseId(expense.id)}
          caption="Campaign expenses"
          filters={
            <>
              <select className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by expense category">
                <option value="All">All categories</option>
                {EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by expense status">
                <option value="All">All statuses</option>
                {EXPENSE_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </>
          }
          mobileActions={(expense) => (
            <div className="stack-8">
              <StatusBadge status={expense.status} />
              <div className="row-6 wrap">
                {expense.status === 'Draft' ? (
                  <Button variant="ghost" size="xs" onClick={() => setExpenseStatus(expense, 'Pending Approval')}>Submit</Button>
                ) : null}
                {expense.status === 'Pending Approval' ? (
                  <Button variant="ghost" size="xs" onClick={() => setExpenseStatus(expense, 'Draft')}>Withdraw</Button>
                ) : null}
                {expense.status === 'Approved' ? (
                  <Button variant="ghost" size="xs" onClick={() => setExpenseStatus(expense, 'Paid')}>Mark paid</Button>
                ) : null}
                {expense.status === 'Draft' || expense.status === 'Rejected' ? (
                  <Button variant="ghost" size="xs" onClick={() => openExpenseEditor(expense)}>Edit</Button>
                ) : null}
                <Button variant="ghost" size="xs" onClick={() => setExpenseId(expense.id)}>Open</Button>
              </div>
            </div>
          )}
        />
        <DataNote>No finance approval, invoice matching, receipt storage or payment service is connected. Receipt names are demo labels only.</DataNote>
        {expenseModal}
        {expenseDetailModal}
      </div>
    )
  }

  if (tab === 'vendor-invoices') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Vendor invoices"
          description="Track sample vendor invoices through a local approval and payment-scheduling demo. No vendor is paid."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={exportInvoices}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Invoices" value={data.invoices.length} sub={`${data.invoices.filter((invoice) => invoice.status === 'Paid').length} marked paid`} icon={<FileText size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Outstanding" value={formatINRCompact(outstandingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))} sub={`${outstandingInvoices.length} not paid`} icon={<Banknote size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Pending" value={data.invoices.filter((invoice) => invoice.status === 'Pending').length} sub="Need a demo decision" icon={<AlertTriangle size={15} />} tone="var(--chart-5)" />
          <MetricCard label="Scheduled" value={data.invoices.filter((invoice) => invoice.status === 'Scheduled').length} sub="Queued in local demo" icon={<CheckCircle2 size={15} />} tone="var(--chart-2)" />
        </MetricGrid>
        <DataTable
          data={data.invoices}
          rowKey={(invoice) => invoice.id}
          searchable={(invoice) => `${invoice.ref} ${invoice.description} ${vendorName(invoice.vendorId)} ${invoice.status}`}
          searchPlaceholder="Search invoices, vendors, descriptions…"
          pageSize={7}
          initialSort={{ columnId: 'due', direction: 'asc' }}
          caption="Vendor invoices"
          columns={[
            { id: 'ref', header: 'Invoice', mobileLabel: 'Invoice', sortValue: (invoice) => invoice.ref, render: (invoice) => <div><p className="cell-primary">{invoice.ref}</p><p className="text-xs muted">{vendorName(invoice.vendorId)}</p></div> },
            { id: 'description', header: 'Description', mobileLabel: 'Description', hideMobile: true, render: (invoice) => <span className="text-xs" style={{ display: 'block', maxWidth: 270, lineHeight: 1.5 }}>{invoice.description}</span> },
            { id: 'due', header: 'Due date', mobileLabel: 'Due date', sortValue: (invoice) => invoice.dueDate, render: (invoice) => formatDate(invoice.dueDate) },
            { id: 'amount', header: 'Amount', align: 'right', mobileLabel: 'Amount', sortValue: (invoice) => invoice.amount, render: (invoice) => <span className="cell-strong">{formatINR(invoice.amount)}</span> },
            { id: 'status', header: 'Status', mobileLabel: 'Status', sortValue: (invoice) => invoice.status, render: (invoice) => <StatusBadge status={invoice.status} /> },
            {
              id: 'actions',
              header: '',
              align: 'right',
              mobileLabel: 'Actions',
              render: (invoice) => (
                <div className="row-6" style={{ justifyContent: 'flex-end' }}>
                  {invoice.status === 'Pending' ? <Button variant="ghost" size="xs" onClick={() => setInvoiceStatus(invoice, 'Approved')}>Approve</Button> : null}
                  {invoice.status === 'Approved' ? <Button variant="ghost" size="xs" onClick={() => setInvoiceStatus(invoice, 'Scheduled')}>Schedule</Button> : null}
                  {invoice.status === 'Scheduled' ? <Button variant="ghost" size="xs" onClick={() => setInvoiceStatus(invoice, 'Paid')}>Mark paid</Button> : null}
                  <select
                    className="select"
                    style={{ minHeight: 28, padding: '2px 22px 2px 7px', width: 100, fontSize: '0.68rem' }}
                    value={invoice.status}
                    aria-label={`Status for invoice ${invoice.ref}`}
                    onChange={(event) => setInvoiceStatus(invoice, event.target.value as Invoice['status'])}
                  >
                    {INVOICE_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
              ),
            },
          ]}
        />
        <DemoNote>Marking an invoice paid is a demo-only status change. No bank, UPI, card or accounts-payable integration exists.</DemoNote>
      </div>
    )
  }

  if (tab === 'celebrity-payments') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Celebrity payments"
          description="Track sample creator and celebrity fee milestones. These are fictional commitments, not payable invoices."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={exportCelebPayments}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Creator payments" value={data.celebrityPayments.length} sub={`${data.celebrityPayments.filter((payment) => payment.status === 'Paid').length} marked paid`} icon={<BadgeCheck size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Committed value" value={formatINRCompact(data.celebrityPayments.reduce((sum, payment) => sum + payment.amount, 0))} sub="Across demo fee records" icon={<Banknote size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Pending" value={data.celebrityPayments.filter((payment) => payment.status === 'Pending').length} sub="No approval recorded" icon={<AlertTriangle size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Scheduled" value={data.celebrityPayments.filter((payment) => payment.status === 'Scheduled').length} sub="Queued in demo only" icon={<CheckCircle2 size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <DataTable
          data={data.celebrityPayments}
          rowKey={(payment) => payment.id}
          searchable={(payment) => `${payment.ref} ${influencerName(payment.influencerId)} ${payment.description} ${payment.status}`}
          searchPlaceholder="Search creator payments…"
          pageSize={7}
          initialSort={{ columnId: 'due', direction: 'asc' }}
          caption="Celebrity payments"
          columns={[
            { id: 'ref', header: 'Payment', mobileLabel: 'Payment', sortValue: (payment) => payment.ref, render: (payment) => <div><p className="cell-primary">{influencerName(payment.influencerId)}</p><p className="text-xs muted">{payment.ref}</p></div> },
            { id: 'description', header: 'Description', mobileLabel: 'Description', hideMobile: true, render: (payment) => <span className="text-xs" style={{ display: 'block', maxWidth: 260, lineHeight: 1.5 }}>{payment.description}</span> },
            { id: 'campaign', header: 'Campaign', mobileLabel: 'Campaign', hideMobile: true, render: (payment) => <span className="text-xs">{campaignName(data.campaigns, payment.campaignId)}</span> },
            { id: 'due', header: 'Due date', mobileLabel: 'Due date', sortValue: (payment) => payment.dueDate, render: (payment) => formatDate(payment.dueDate) },
            { id: 'amount', header: 'Amount', align: 'right', mobileLabel: 'Amount', sortValue: (payment) => payment.amount, render: (payment) => <span className="cell-strong">{formatINR(payment.amount)}</span> },
            { id: 'status', header: 'Status', mobileLabel: 'Status', sortValue: (payment) => payment.status, render: (payment) => <StatusBadge status={payment.status} /> },
            {
              id: 'actions',
              header: '',
              align: 'right',
              mobileLabel: 'Actions',
              render: (payment) => (
                <div className="row-6" style={{ justifyContent: 'flex-end' }}>
                  {payment.status === 'Pending' ? <Button variant="ghost" size="xs" onClick={() => setCelebrityStatus(payment, 'Approved')}>Approve</Button> : null}
                  {payment.status === 'Approved' ? <Button variant="ghost" size="xs" onClick={() => setCelebrityStatus(payment, 'Scheduled')}>Schedule</Button> : null}
                  {payment.status === 'Scheduled' ? <Button variant="ghost" size="xs" onClick={() => setCelebrityStatus(payment, 'Paid')}>Mark paid</Button> : null}
                  <select
                    className="select"
                    style={{ minHeight: 28, padding: '2px 22px 2px 7px', width: 100, fontSize: '0.68rem' }}
                    value={payment.status}
                    aria-label={`Status for ${payment.ref}`}
                    onChange={(event) => setCelebrityStatus(payment, event.target.value as CelebrityPayment['status'])}
                  >
                    {CELEB_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
              ),
            },
          ]}
        />
        <DataNote>Creator names, fee amounts and statuses are fictional demo records. No contract, invoice or payment was created.</DataNote>
      </div>
    )
  }

  if (tab === 'field-expense-claims') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Field expense claims"
          description="Shared demo claims with the Field Marketing module. Submitting or reimbursing here only changes local status."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={exportClaims}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setClaimOpen(true)}>New claim</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Claims" value={data.fieldClaims.length} sub={`${data.fieldClaims.filter((claim) => claim.status === 'Submitted').length} submitted`} icon={<ReceiptText size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Claim value" value={formatINRCompact(data.fieldClaims.reduce((sum, claim) => sum + claim.amount, 0))} sub="Across all demo statuses" icon={<Wallet size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Approved" value={data.fieldClaims.filter((claim) => claim.status === 'Approved').length} sub="Awaiting demo reimbursement" icon={<CheckCircle2 size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Reimbursed" value={data.fieldClaims.filter((claim) => claim.status === 'Reimbursed').length} sub="Paid marker in local data" icon={<BadgeCheck size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <DataTable
          data={data.fieldClaims}
          rowKey={(claim) => claim.id}
          searchable={(claim) => `${claim.ref} ${claim.employee} ${claim.purpose} ${claim.status}`}
          searchPlaceholder="Search claims, employees, purposes…"
          pageSize={7}
          caption="Field expense claims"
          columns={[
            { id: 'ref', header: 'Claim', mobileLabel: 'Claim', sortValue: (claim) => claim.ref, render: (claim) => <div><p className="cell-primary">{claim.ref}</p><p className="text-xs muted">{claim.employee}</p></div> },
            { id: 'purpose', header: 'Purpose', mobileLabel: 'Purpose', render: (claim) => <span className="text-xs">{claim.purpose}</span> },
            { id: 'date', header: 'Date', mobileLabel: 'Date', sortValue: (claim) => claim.date, render: (claim) => formatDate(claim.date) },
            { id: 'amount', header: 'Amount', align: 'right', mobileLabel: 'Amount', sortValue: (claim) => claim.amount, render: (claim) => <span className="cell-strong">{formatINR(claim.amount)}</span> },
            { id: 'status', header: 'Status', mobileLabel: 'Status', sortValue: (claim) => claim.status, render: (claim) => <StatusBadge status={claim.status} /> },
            {
              id: 'actions',
              header: '',
              align: 'right',
              mobileLabel: 'Actions',
              render: (claim) => {
                const ownClaim = claim.employee === 'Ananya Rao'
                if (!ownClaim) return <span className="text-xs faint">Owned by {claim.employee}</span>
                return (
                  <div className="row-6" style={{ justifyContent: 'flex-end' }}>
                    {claim.status === 'Draft' ? <Button variant="ghost" size="xs" onClick={() => setClaimStatus(claim, 'Submitted')}>Submit</Button> : null}
                    {claim.status === 'Submitted' ? <Button variant="ghost" size="xs" onClick={() => setClaimStatus(claim, 'Draft')}>Withdraw</Button> : null}
                    {claim.status === 'Approved' ? <Button variant="ghost" size="xs" onClick={() => setClaimStatus(claim, 'Reimbursed')}>Mark reimbursed</Button> : null}
                    {claim.status === 'Reimbursed' ? <Badge tone="success">Reimbursed</Badge> : null}
                  </div>
                )
              },
            },
          ]}
        />
        <DemoNote>No reimbursement, payroll, bank transfer or receipt storage is connected. Claims are shared with the Field Marketing demo module.</DemoNote>
        {claimModal}
      </div>
    )
  }

  if (tab === 'budget-vs-actual') {
    const totalBudget = budgetRows.reduce((sum, row) => sum + row.campaign.budget, 0)
    const totalActual = budgetRows.reduce((sum, row) => sum + row.campaign.spend, 0)
    const totalCommitted = budgetRows.reduce((sum, row) => sum + row.committed, 0)
    return (
      <div className="stack-16">
        <TabIntro
          title="Budget vs actual"
          description="Compare campaign budgets with reported spend and committed demo expenses. These are separate sample sources, not a reconciled ledger."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={exportBudgetRows}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Campaign budget" value={formatINRCompact(totalBudget)} sub={`${budgetRows.length} non-archived campaigns`} icon={<Wallet size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Reported spend" value={formatINRCompact(totalActual)} sub="Campaign sample spend" icon={<TrendingUp size={15} />} tone="var(--chart-2)" progress={totalBudget ? (totalActual / totalBudget) * 100 : 0} />
          <MetricCard label="Committed expenses" value={formatINRCompact(totalCommitted)} sub="Pending or approved demo expenses" icon={<ReceiptText size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Forecast total" value={formatINRCompact(totalActual + totalCommitted)} sub={`${formatPercent(totalBudget ? ((totalActual + totalCommitted) / totalBudget) * 100 : null, 0)} of total budget`} icon={<AlertTriangle size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <ChartCard title="Budget, spend and commitments" subtitle="Top campaigns by budget in the demo workbook" height="lg" isEmpty={budgetRows.length === 0} legend={<><LegendItem color="var(--chart-8)" label="Budget" /><LegendItem color="var(--chart-1)" label="Reported spend" /><LegendItem color="var(--chart-3)" label="Committed" /></>}>
          <BarChart
            data={[...budgetRows].sort((a, b) => b.campaign.budget - a.campaign.budget).slice(0, 8).map((row) => ({
              name: row.campaign.name.split(' ').slice(0, 2).join(' '),
              budget: row.campaign.budget,
              actual: row.campaign.spend,
              committed: row.committed,
            }))}
            margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
          >
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
            <YAxis {...axisProps} width={56} tickFormatter={(value) => formatINRCompact(Number(value))} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="budget" name="Budget" fill="var(--chart-8)" opacity={0.35} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            <Bar dataKey="actual" name="Spend" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            <Bar dataKey="committed" name="Committed" fill="var(--chart-3)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
          </BarChart>
        </ChartCard>

        <DataTable
          data={budgetRows}
          rowKey={(row) => row.campaign.id}
          searchable={(row) => `${row.campaign.name} ${row.campaign.channel} ${row.campaign.owner}`}
          searchPlaceholder="Search campaigns…"
          pageSize={8}
          initialSort={{ columnId: 'utilisation', direction: 'desc' }}
          caption="Budget vs actual"
          columns={[
            { id: 'campaign', header: 'Campaign', mobileLabel: 'Campaign', sortValue: (row) => row.campaign.name, render: (row) => <div><p className="cell-primary">{row.campaign.name}</p><p className="text-xs muted">{row.campaign.channel} · {row.campaign.owner}</p></div> },
            { id: 'budget', header: 'Budget', align: 'right', mobileLabel: 'Budget', sortValue: (row) => row.campaign.budget, render: (row) => formatINR(row.campaign.budget) },
            { id: 'spend', header: 'Spend', align: 'right', mobileLabel: 'Spend', sortValue: (row) => row.campaign.spend, render: (row) => formatINR(row.campaign.spend) },
            { id: 'committed', header: 'Committed', align: 'right', mobileLabel: 'Committed', hideMobile: true, sortValue: (row) => row.committed, render: (row) => formatINR(row.committed) },
            { id: 'forecast', header: 'Forecast', align: 'right', mobileLabel: 'Forecast', sortValue: (row) => row.forecast, render: (row) => <span className="cell-strong">{formatINR(row.forecast)}</span> },
            {
              id: 'utilisation',
              header: 'Utilisation',
              align: 'right',
              mobileLabel: 'Utilisation',
              sortValue: (row) => row.utilisation ?? 0,
              render: (row) => (
                <div style={{ minWidth: 100 }}>
                  <span className="text-xs">{formatPercent(row.utilisation, 0)}</span>
                  <ProgressBar value={row.utilisation ?? 0} size="sm" tone={row.utilisation !== null ? utilisationTone(row.utilisation) : 'brand'} className="mt-4" />
                </div>
              ),
            },
          ]}
        />
        <DemoNote>Campaign reported spend and expense records are separate demo datasets and may not reconcile. No general ledger, cost centre or statutory accounting system is connected.</DemoNote>
      </div>
    )
  }

  if (tab === 'finance-integration') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Finance integration"
          description="This portal is intentionally frontend-only. Here is an explicit view of what is not connected and what a real integration would need."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportExpenses(data.expenses, 'finance-pack')}>Export expense pack</Button>}
        />
        <div className="callout callout--warning">
          <ShieldCheck size={15} />
          <span><strong>No real financial operations occur here.</strong> There is no ERP, accounts-payable, payment gateway, bank reconciliation, GST filing or payroll connection. All statuses and amounts are local demo data.</span>
        </div>
        <EntityGrid columns={2}>
          <EntityCard
            title="ERP / general ledger"
            subtitle="Accounting sync"
            badge={<Badge tone="danger">Not connected</Badge>}
            meta={<span>Would post approved expenses and invoices to cost centres.</span>}
          >
            <DetailRows
              columns={1}
              items={[
                { label: 'Required in production', value: 'Chart of accounts, cost centres, tax codes, posting periods and reconciliation rules.' },
                { label: 'Demo behaviour', value: 'Records stay in localStorage only. Nothing is posted.' },
              ]}
            />
            <Button variant="ghost" size="sm" disabled icon={<Building2 size={14} />}>Connect ERP (unavailable in demo)</Button>
          </EntityCard>
          <EntityCard
            title="Payment gateway / bank"
            subtitle="Vendor and creator payouts"
            badge={<Badge tone="danger">Not connected</Badge>}
            meta={<span>Would execute scheduled vendor and creator payments.</span>}
          >
            <DetailRows
              columns={1}
              items={[
                { label: 'Required in production', value: 'Beneficiary verification, maker-checker approvals, payment rails and settlement reconciliation.' },
                { label: 'Demo behaviour', value: '“Mark paid” only changes a label. No money moves.' },
              ]}
            />
            <Button variant="ghost" size="sm" disabled icon={<Landmark size={14} />}>Connect bank (unavailable in demo)</Button>
          </EntityCard>
          <EntityCard
            title="Tax & compliance"
            subtitle="GST, TDS and e-invoicing"
            badge={<Badge tone="danger">Not connected</Badge>}
            meta={<span>Would validate tax treatment and invoice compliance.</span>}
          >
            <DetailRows
              columns={1}
              items={[
                { label: 'Required in production', value: 'GSTIN validation, HSN/SAC mapping, TDS rules, e-invoice IRN and filing periods.' },
                { label: 'Demo behaviour', value: 'No tax is calculated, validated or filed.' },
              ]}
            />
            <Button variant="ghost" size="sm" disabled icon={<FileText size={14} />}>Connect tax engine (unavailable in demo)</Button>
          </EntityCard>
          <EntityCard
            title="Receipt & document storage"
            subtitle="Invoice and claim evidence"
            badge={<Badge tone="danger">Not connected</Badge>}
            meta={<span>Would store and validate uploaded receipts.</span>}
          >
            <DetailRows
              columns={1}
              items={[
                { label: 'Required in production', value: 'Object storage, virus scanning, retention policy and access controls.' },
                { label: 'Demo behaviour', value: 'Only file names are shown. No receipt file is stored.' },
              ]}
            />
            <Button variant="ghost" size="sm" disabled icon={<ReceiptText size={14} />}>Connect document store (unavailable in demo)</Button>
          </EntityCard>
        </EntityGrid>

        <SectionCard title="What the demo can do instead" subtitle="Local, transparent controls with no external side effects.">
          <div className="stack-12">
            {[
              { icon: <Download size={15} />, title: 'Export a CSV register', description: 'Download the local expense, invoice, creator fee or claim rows for offline review.' },
              { icon: <BadgeCheck size={15} />, title: 'Model workflow statuses', description: 'Use Draft, Pending Approval, Approved, Scheduled and Paid labels to explore a process.' },
              { icon: <AlertTriangle size={15} />, title: 'Check budget coverage', description: 'Compare reported campaign spend and committed demo expenses against budgets.' },
              { icon: <ShieldCheck size={15} />, title: 'Reset at any time', description: 'Use the demo data reset in the profile menu to restore the original sample records.' },
            ].map((item) => (
              <div key={item.title} className="row-12" style={{ alignItems: 'flex-start', padding: '4px 0' }}>
                <span className="metric-card__icon" aria-hidden="true">{item.icon}</span>
                <div>
                  <p className="text-sm" style={{ fontWeight: 600 }}>{item.title}</p>
                  <p className="text-xs muted" style={{ lineHeight: 1.55 }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <DataNote>Integration descriptions are illustrative and intentionally non-functional. No API keys, webhooks or server endpoints are present in this project.</DataNote>
      </div>
    )
  }

  return null
}

function ExpenseModal({
  open,
  expense,
  onClose,
  onSave,
  campaigns,
  vendors,
}: {
  open: boolean
  expense?: Expense | null
  onClose: () => void
  onSave: (values: ExpenseFormValues) => void
  campaigns: { id: string; name: string }[]
  vendors: { id: string; name: string; category: string }[]
}) {
  const [values, setValues] = useState<ExpenseFormValues>(() => ({
    category: expense?.category ?? 'Advertising',
    campaignId: expense?.campaignId ?? '',
    vendorId: expense?.vendorId ?? '',
    amount: expense ? String(expense.amount) : '',
    date: expense?.date ?? dateOnlyFromNow(0),
    purpose: expense?.purpose ?? '',
    receiptName: expense?.receiptName ?? '',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setValues({
      category: expense?.category ?? 'Advertising',
      campaignId: expense?.campaignId ?? '',
      vendorId: expense?.vendorId ?? '',
      amount: expense ? String(expense.amount) : '',
      date: expense?.date ?? dateOnlyFromNow(0),
      purpose: expense?.purpose ?? '',
      receiptName: expense?.receiptName ?? '',
    })
    setErrors({})
  }, [expense, open])
  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }
  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.purpose.trim()) next.purpose = 'Describe the expense purpose.'
    const amount = Number(values.amount)
    if (!values.amount.trim() || !Number.isFinite(amount) || amount <= 0) next.amount = 'Enter an amount greater than zero.'
    if (!values.date) next.date = 'Choose an expense date.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? `Edit ${expense.ref}` : 'Record a campaign expense'}
      description={expense ? 'Update this draft, then submit it for demo approval. No invoice is matched and no payment is initiated.' : 'Creates a local demo draft. No invoice is matched and no payment is initiated.'}
      size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>{expense ? 'Save draft changes' : 'Save expense draft'}</Button></>}
    >
      <div className="form-grid">
        <Field label="Category" htmlFor="expense-category">
          <select id="expense-category" className="select" value={values.category} onChange={(event) => set('category', event.target.value as ExpenseCategory)}>
            {EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </Field>
        <Field label="Campaign" htmlFor="expense-campaign">
          <select id="expense-campaign" className="select" value={values.campaignId} onChange={(event) => set('campaignId', event.target.value)}>
            <option value="">No campaign link</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </Field>
        <Field label="Vendor" htmlFor="expense-vendor">
          <select id="expense-vendor" className="select" value={values.vendorId} onChange={(event) => set('vendorId', event.target.value)}>
            <option value="">Internal / no vendor</option>
            {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name} · {vendor.category}</option>)}
          </select>
        </Field>
        <Field label="Amount (₹)" htmlFor="expense-amount" required error={errors.amount}>
          <input id="expense-amount" className="input" type="number" min={1} value={values.amount} onChange={(event) => set('amount', event.target.value)} aria-invalid={Boolean(errors.amount)} />
        </Field>
        <Field label="Expense date" htmlFor="expense-date" required error={errors.date}>
          <input id="expense-date" className="input" type="date" value={values.date} onChange={(event) => set('date', event.target.value)} aria-invalid={Boolean(errors.date)} />
        </Field>
        <Field label="Receipt file name" htmlFor="expense-receipt" hint="Demo label only — no file is uploaded or stored.">
          <input id="expense-receipt" className="input" value={values.receiptName} onChange={(event) => set('receiptName', event.target.value)} placeholder="e.g. vendor-invoice.pdf" />
        </Field>
        <Field label="Purpose" htmlFor="expense-purpose" required error={errors.purpose} className="form-grid__full">
          <textarea id="expense-purpose" className="textarea" rows={3} value={values.purpose} onChange={(event) => set('purpose', event.target.value)} aria-invalid={Boolean(errors.purpose)} />
        </Field>
      </div>
      <div className="callout callout--warning mt-12">
        <ReceiptText size={14} />
        <span>This is a frontend demo. No receipt is stored, no approval is routed and no finance system is contacted. Saving keeps the record as a draft; submitting it changes only the local status.</span>
      </div>
    </Modal>
  )
}

function ClaimModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (values: ClaimFormValues) => void }) {
  const [values, setValues] = useState<ClaimFormValues>({
    purpose: '',
    amount: '',
    date: dateOnlyFromNow(0),
    receiptName: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof ClaimFormValues>(key: K, value: ClaimFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }
  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.purpose.trim()) next.purpose = 'Describe the claim purpose.'
    const amount = Number(values.amount)
    if (!values.amount.trim() || !Number.isFinite(amount) || amount <= 0) next.amount = 'Enter an amount greater than zero.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New field expense claim"
      description="Creates a local demo draft. No reimbursement or payroll action is started."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save draft</Button></>}
    >
      <div className="form-grid">
        <Field label="Purpose" htmlFor="claim-purpose" required error={errors.purpose} className="form-grid__full">
          <textarea id="claim-purpose" className="textarea" rows={2} value={values.purpose} onChange={(event) => set('purpose', event.target.value)} aria-invalid={Boolean(errors.purpose)} />
        </Field>
        <Field label="Amount (₹)" htmlFor="claim-amount" required error={errors.amount}>
          <input id="claim-amount" className="input" type="number" min={1} value={values.amount} onChange={(event) => set('amount', event.target.value)} aria-invalid={Boolean(errors.amount)} />
        </Field>
        <Field label="Date" htmlFor="claim-date">
          <input id="claim-date" className="input" type="date" value={values.date} onChange={(event) => set('date', event.target.value)} />
        </Field>
        <Field label="Receipt file name" htmlFor="claim-receipt" hint="Demo label only. No file is stored." className="form-grid__full">
          <input id="claim-receipt" className="input" value={values.receiptName} onChange={(event) => set('receiptName', event.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

function ExpenseDetailModal({
  expense,
  vendorLabel,
  campaignLabel,
  onClose,
  onEdit,
  onStatus,
}: {
  expense: Expense
  vendorLabel: string
  campaignLabel: string
  onClose: () => void
  onEdit: () => void
  onStatus: (status: ExpenseStatus) => void
}) {
  const stageNote =
    expense.status === 'Draft'
      ? 'This is a draft. Submit it for approval when the details and receipt label are ready.'
      : expense.status === 'Pending Approval'
        ? 'Awaiting a reviewer decision. Withdrawing returns it to Draft without losing the record.'
        : expense.status === 'Approved'
          ? 'Approved means the expense is accepted. Payment is a separate step and has not happened.'
          : expense.status === 'Paid'
            ? 'Marked paid in this local demo. No money moved and no finance entry exists.'
            : 'Rejected. Edit the draft and submit it again when the issue is resolved.'

  return (
    <Modal
      open
      onClose={onClose}
      title={expense.ref}
      description={`${expense.category} · ${formatDate(expense.date)}`}
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {expense.status === 'Draft' || expense.status === 'Rejected' ? (
            <Button variant="soft" icon={<Pencil size={14} />} onClick={onEdit}>Edit draft</Button>
          ) : null}
        </>
      }
    >
      <div className="stack-16">
        <div className="row-8 wrap">
          <StatusBadge status={expense.status} />
          <Badge tone="neutral">{formatINR(expense.amount)}</Badge>
          <Badge tone="neutral">{expense.submittedBy}</Badge>
          {expense.status === 'Approved' ? <Badge tone="warning">Payment outstanding</Badge> : null}
        </div>
        <div className="callout callout--info">
          <CircleAlert size={14} />
          <span>{stageNote}</span>
        </div>
        <DetailRows
          items={[
            { label: 'Campaign', value: campaignLabel },
            { label: 'Vendor', value: vendorLabel },
            { label: 'Purpose', value: expense.purpose },
            { label: 'Submitted by', value: expense.submittedBy },
            { label: 'Expense date', value: formatDate(expense.date) },
            { label: 'Created', value: formatDate(expense.createdAt) },
            { label: 'Receipt', value: expense.receiptName ?? 'No receipt file name recorded' },
            { label: 'Reviewer comment', value: expense.reviewerComment || 'No review comment' },
          ]}
        />
        <div className="expense-workflow-actions">
          {expense.status === 'Draft' ? (
            <Button variant="primary" size="sm" icon={<ArrowRight size={14} />} onClick={() => onStatus('Pending Approval')}>Submit for approval</Button>
          ) : null}
          {expense.status === 'Pending Approval' ? (
            <>
              <Button variant="soft" size="sm" onClick={() => onStatus('Draft')}>Withdraw to draft</Button>
              <Button variant="primary" size="sm" icon={<CheckCircle2 size={14} />} onClick={() => onStatus('Approved')}>Approve expense</Button>
              <Button variant="ghost" size="sm" onClick={() => onStatus('Rejected')}>Reject</Button>
            </>
          ) : null}
          {expense.status === 'Approved' ? (
            <Button variant="primary" size="sm" icon={<Banknote size={14} />} onClick={() => onStatus('Paid')}>Mark paid (separate step)</Button>
          ) : null}
          {expense.status === 'Paid' ? <Badge tone="success">Paid in local demo only</Badge> : null}
          {expense.status === 'Rejected' ? <span className="text-xs muted">Edit and resubmit to create a new pending draft.</span> : null}
        </div>
        <DataNote>Amounts, vendor links and receipt labels are fictional demo data. No finance system, file store or payment rail is connected. Approving never marks an expense paid automatically.</DataNote>
      </div>
    </Modal>
  )
}
