import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  FileSignature,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
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
import type {
  Approval,
  ApprovalStatus,
  ApprovalType,
  Contract,
  ContractStatus,
} from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
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
import { downloadCsv } from '../utils/csv'
import { dateOnlyFromNow, daysUntil } from '../utils/dates'
import { formatDate, formatDateTime, formatINR, formatINRCompact, formatNumber, uid } from '../utils/format'

const APPROVAL_TYPES: ApprovalType[] = ['Campaign', 'Budget', 'Offer', 'Contract', 'Creative', 'Expense']
const APPROVAL_STATUSES: ApprovalStatus[] = ['Draft', 'Pending', 'Approved', 'Rejected', 'Changes Requested', 'Expired']
const CONTRACT_STATUSES: ContractStatus[] = ['Active', 'Expiring Soon', 'Expired', 'Draft']

type Decision = 'Approve' | 'Reject' | 'Request changes'
type DemoRole = 'Employee' | 'Admin'
type ApprovalFormValues = {
  title: string
  type: ApprovalType
  amount: string
  summary: string
  comments: string
}

const ROLE_KEY = 'totally-erp-demo-approval-role'

export function ApprovalsContractsPage({ tab }: { tab: string }) {
  const { data, update, addNotification } = useDemoData()
  const { pushToast } = useToast()
  const chartAnim = useChartAnimation()
  const [approvalId, setApprovalId] = useState<string | null>(null)
  const [contractId, setContractId] = useState<string | null>(null)
  const [approvalFormOpen, setApprovalFormOpen] = useState(false)
  const [editingApprovalId, setEditingApprovalId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [ownerFilter, setOwnerFilter] = useState('All')
  const [demoRole, setDemoRole] = useState<DemoRole>(() => {
    try {
      return sessionStorage.getItem(ROLE_KEY) === 'Admin' ? 'Admin' : 'Employee'
    } catch {
      return 'Employee'
    }
  })

  const actorName = demoRole === 'Admin' ? 'Admin Reviewer' : 'Ananya Rao'
  const activeApproval = data.approvals.find((approval) => approval.id === approvalId) ?? null
  const editingApproval = data.approvals.find((approval) => approval.id === editingApprovalId) ?? null
  const activeContract = data.contracts.find((contract) => contract.id === contractId) ?? null

  const pendingApprovals = data.approvals.filter((approval) => approval.status === 'Pending')
  const awaitingMyReview = pendingApprovals.filter((approval) => !approval.requestedByMe)
  const myPendingRequests = pendingApprovals.filter((approval) => approval.requestedByMe)
  const expiringContracts = data.contracts.filter(
    (contract) => contract.status === 'Expiring Soon' || daysUntil(contract.renewalDeadline) !== null && (daysUntil(contract.renewalDeadline) ?? 0) <= 30,
  )

  const filteredApprovals = useMemo(
    () =>
      data.approvals.filter((approval) => {
        if (statusFilter !== 'All' && approval.status !== statusFilter) return false
        if (typeFilter !== 'All' && approval.type !== typeFilter) return false
        if (ownerFilter === 'Mine' && !approval.requestedByMe) return false
        if (ownerFilter === 'Team' && approval.requestedByMe) return false
        return true
      }),
    [data.approvals, statusFilter, typeFilter, ownerFilter],
  )

  const typeData = APPROVAL_TYPES.map((type) => ({
    type,
    pending: data.approvals.filter((approval) => approval.type === type && approval.status === 'Pending').length,
    approved: data.approvals.filter((approval) => approval.type === type && approval.status === 'Approved').length,
  }))

  const statusData = APPROVAL_STATUSES.map((status, index) => ({
    name: status,
    value: data.approvals.filter((approval) => approval.status === status).length,
    color: chartColors[index % chartColors.length],
  })).filter((entry) => entry.value > 0)

  const recentHistory = useMemo(
    () =>
      data.approvals
        .flatMap((approval) =>
          approval.history.map((entry) => ({
            ...entry,
            approvalId: approval.id,
            approvalTitle: approval.title,
            approvalType: approval.type,
          })),
        )
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 8),
    [data.approvals],
  )

  const partnerName = (partnerId: string) =>
    data.agencies.find((agency) => agency.id === partnerId)?.name ?? partnerId

  const decide = (approval: Approval, decision: Decision, comment: string) => {
    if (demoRole !== 'Admin') {
      pushToast({
        title: 'Admin review required',
        description: 'Switch the demo role to Admin to make approval decisions. Employees can submit, edit and track requests only.',
        tone: 'warning',
      })
      return
    }
    if (approval.requestedByMe) {
      pushToast({
        title: 'Self-approval is blocked',
        description: 'Your own request cannot be approved, even in the Admin demo role. Ask another reviewer to act on it.',
        tone: 'warning',
      })
      return
    }
    if (approval.status !== 'Pending') {
      pushToast({
        title: 'Request is not pending',
        description: 'Only submitted requests can receive an approval decision.',
        tone: 'warning',
      })
      return
    }
    const status: ApprovalStatus =
      decision === 'Approve' ? 'Approved' : decision === 'Reject' ? 'Rejected' : 'Changes Requested'
    const action = decision === 'Approve' ? 'Approved' : decision === 'Reject' ? 'Rejected' : 'Requested changes'
    update('approvals', (current) =>
      current.map((item) =>
        item.id === approval.id
          ? {
              ...item,
              status,
              reviewer: actorName,
              reviewerComment: comment.trim() || item.reviewerComment,
              history: [
                ...item.history,
                {
                  at: new Date().toISOString(),
                  by: actorName,
                  action,
                  note: comment.trim() || undefined,
                },
              ],
            }
          : item,
      ),
    )
    addNotification({
      title: `Approval ${status.toLowerCase()} in demo`,
      body: `${approval.title} · ${decision} by ${actorName}. No real approval was recorded.`,
      kind: 'approval',
      href: '/marketing/approvals/pending-approvals',
    })
    pushToast({
      title: `Demo approval ${status.toLowerCase()}`,
      description: `${approval.title}. No external approver or workflow engine was contacted.`,
      tone: decision === 'Approve' ? 'success' : decision === 'Reject' ? 'warning' : 'info',
    })
  }

  const withdraw = (approval: Approval) => {
    if (!approval.requestedByMe) return
    update('approvals', (current) =>
      current.map((item) =>
        item.id === approval.id
          ? {
              ...item,
              status: 'Draft',
              history: [
                ...item.history,
                { at: new Date().toISOString(), by: 'Ananya Rao', action: 'Withdrew request', note: 'Withdrawn in local demo.' },
              ],
            }
          : item,
      ),
    )
    pushToast({
      title: 'Demo request withdrawn',
      description: `${approval.title} moved to Draft locally. No reviewer was notified.`,
      tone: 'success',
    })
  }

  const saveApproval = (values: ApprovalFormValues, submit: boolean) => {
    const now = new Date().toISOString()
    const amount = values.amount.trim() ? Math.max(0, Number(values.amount) || 0) : undefined
    const nextStatus: ApprovalStatus = submit ? 'Pending' : 'Draft'

    if (editingApproval) {
      const canEdit =
        editingApproval.requestedByMe &&
        ['Draft', 'Changes Requested', 'Rejected'].includes(editingApproval.status)
      if (!canEdit) {
        pushToast({
          title: 'Request cannot be edited',
          description: 'Only your own draft, rejected or changes-requested items can be edited.',
          tone: 'warning',
        })
        return
      }
      update('approvals', (current) =>
        current.map((item) =>
          item.id === editingApproval.id
            ? {
                ...item,
                title: values.title.trim(),
                type: values.type,
                amount,
                summary: values.summary.trim(),
                comments: values.comments.trim(),
                status: nextStatus,
                submissionDate: submit ? now : item.submissionDate,
                history: [
                  ...item.history,
                  {
                    at: now,
                    by: actorName,
                    action: submit ? 'Edited and resubmitted' : 'Edited draft saved',
                    note: values.comments.trim() || undefined,
                  },
                ],
              }
            : item,
        ),
      )
      pushToast({
        title: submit ? 'Request resubmitted' : 'Draft saved',
        description: submit
          ? `${values.title.trim()} is pending Admin review in local demo data.`
          : `${values.title.trim()} remains an editable local draft.`,
        tone: 'success',
      })
      if (submit) {
        addNotification({
          title: 'Approval request resubmitted',
          body: `${values.title.trim()} is awaiting Admin review in the local demo.`,
          kind: 'approval',
          href: '/marketing/approvals/pending-approvals',
        })
      }
      setEditingApprovalId(null)
      setApprovalFormOpen(false)
      return
    }

    const highest = data.approvals.reduce((max, approval) => {
      const match = approval.id.match(/(\d+)$/)
      return match ? Math.max(max, Number(match[1])) : max
    }, 7000)
    const approval: Approval = {
      id: `AP-${highest + 1}`,
      title: values.title.trim(),
      type: values.type,
      requestedBy: actorName,
      requestedByMe: true,
      submissionDate: submit ? now : dateOnlyFromNow(0),
      amount,
      status: nextStatus,
      reviewer: 'Admin Reviewer',
      comments: values.comments.trim(),
      summary: values.summary.trim(),
      history: [
        {
          at: now,
          by: actorName,
          action: submit ? 'Submitted for approval' : 'Created draft',
          note: values.comments.trim() || undefined,
        },
      ],
    }
    update('approvals', (current) => [approval, ...current])
    if (submit) {
      addNotification({
        title: 'Approval request submitted',
        body: `${approval.title} is awaiting Admin review in the local demo.`,
        kind: 'approval',
        href: '/marketing/approvals/pending-approvals',
      })
    }
    pushToast({
      title: submit ? 'Request submitted for approval' : 'Approval draft saved',
      description: submit
        ? `${approval.title} is pending Admin review. Employees cannot approve their own request.`
        : `${approval.title} is a local draft. Edit or submit it when ready.`,
      tone: 'success',
    })
    setApprovalFormOpen(false)
  }

  const openApprovalEditor = (approval: Approval) => {
    if (!approval.requestedByMe || !['Draft', 'Changes Requested', 'Rejected'].includes(approval.status)) {
      pushToast({
        title: 'Editing not available',
        description: 'Only your own draft, rejected or changes-requested approvals can be edited.',
        tone: 'warning',
      })
      return
    }
    setApprovalId(null)
    setEditingApprovalId(approval.id)
    setApprovalFormOpen(true)
  }

  const setContractStatus = (contract: Contract, status: ContractStatus) => {
    update('contracts', (current) => current.map((item) => (item.id === contract.id ? { ...item, status } : item)))
    pushToast({
      title: 'Contract status updated',
      description: `${contract.name} marked ${status}. No legal document or signature is stored.`,
      tone: 'success',
    })
  }

  const renewContract = (contract: Contract) => {
    const newEnd = dateOnlyFromNow(365)
    update('contracts', (current) =>
      current.map((item) =>
        item.id === contract.id
          ? {
              ...item,
              startDate: dateOnlyFromNow(0),
              endDate: newEnd,
              renewalDeadline: dateOnlyFromNow(335),
              status: 'Active',
            }
          : item,
      ),
    )
    pushToast({
      title: 'Contract renewed in demo',
      description: `${contract.name} now runs through ${formatDate(newEnd)}. No contract was signed or sent.`,
      tone: 'success',
    })
  }

  const exportApprovals = (rows: Approval[], label = 'approvals') => {
    const result = downloadCsv(`marketing-${label}-demo`, [
      { header: 'ID', value: (approval: Approval) => approval.id },
      { header: 'Title', value: (approval: Approval) => approval.title },
      { header: 'Type', value: (approval: Approval) => approval.type },
      { header: 'Requested by', value: (approval: Approval) => approval.requestedBy },
      { header: 'Requested by me', value: (approval: Approval) => (approval.requestedByMe ? 'Yes' : 'No') },
      { header: 'Submitted', value: (approval: Approval) => approval.submissionDate },
      { header: 'Amount', value: (approval: Approval) => approval.amount ?? '' },
      { header: 'Status', value: (approval: Approval) => approval.status },
      { header: 'Reviewer', value: (approval: Approval) => approval.reviewer },
      { header: 'Requester comment', value: (approval: Approval) => approval.comments },
      { header: 'Reviewer comment', value: (approval: Approval) => approval.reviewerComment ?? '' },
      { header: 'Summary', value: (approval: Approval) => approval.summary },
    ], rows)
    pushToast({ title: result.ok ? 'Approvals exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportContracts = (rows: Contract[], label = 'contracts') => {
    const result = downloadCsv(`marketing-${label}-demo`, [
      { header: 'ID', value: (contract: Contract) => contract.id },
      { header: 'Name', value: (contract: Contract) => contract.name },
      { header: 'Partner', value: (contract: Contract) => partnerName(contract.partnerId) },
      { header: 'Start', value: (contract: Contract) => contract.startDate },
      { header: 'End', value: (contract: Contract) => contract.endDate },
      { header: 'Status', value: (contract: Contract) => contract.status },
      { header: 'Renewal deadline', value: (contract: Contract) => contract.renewalDeadline },
      { header: 'Usage rights', value: (contract: Contract) => contract.usageRights },
      { header: 'Rights expiry', value: (contract: Contract) => contract.rightsExpiry },
      { header: 'Value', value: (contract: Contract) => contract.value },
      { header: 'Scope', value: (contract: Contract) => contract.scope },
    ], rows)
    pushToast({ title: result.ok ? 'Contracts exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const approvalColumns = (rows: Approval[]): DataTableColumn<Approval>[] => [
    {
      id: 'title',
      header: 'Request',
      mobileLabel: 'Request',
      sortValue: (approval: Approval) => approval.title,
      render: (approval: Approval) => (
        <div>
          <p className="cell-primary">{approval.title}</p>
          <p className="text-xs muted">{approval.id} · {approval.type}</p>
        </div>
      ),
    },
    {
      id: 'requester',
      header: 'Requested by',
      mobileLabel: 'Requested by',
      sortValue: (approval: Approval) => approval.requestedBy,
      render: (approval: Approval) => <AvatarWithName name={approval.requestedBy} sub={approval.requestedByMe ? 'You' : 'Team request'} size="sm" />,
    },
    {
      id: 'submitted',
      header: 'Submitted',
      mobileLabel: 'Submitted',
      hideMobile: true,
      sortValue: (approval: Approval) => approval.submissionDate,
      render: (approval: Approval) => formatDate(approval.submissionDate),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      mobileLabel: 'Amount',
      sortValue: (approval: Approval) => approval.amount ?? 0,
      render: (approval: Approval) => approval.amount ? <span className="cell-strong">{formatINR(approval.amount)}</span> : <span className="muted text-xs">—</span>,
    },
    {
      id: 'reviewer',
      header: 'Reviewer',
      mobileLabel: 'Reviewer',
      hideMobile: true,
      sortValue: (approval: Approval) => approval.reviewer,
      render: (approval: Approval) => <span className="text-xs">{approval.reviewer}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      sortValue: (approval: Approval) => approval.status,
      render: (approval: Approval) => <StatusBadge status={approval.status} />,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      mobileLabel: 'Actions',
      render: (approval: Approval) => (
        <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); setApprovalId(approval.id) }}>Review</Button>
      ),
    },
  ]

  const approvalModal = activeApproval ? (
    <ApprovalModal
      approval={activeApproval}
      demoRole={demoRole}
      onClose={() => setApprovalId(null)}
      onDecide={(decision, comment) => decide(activeApproval, decision, comment)}
      onWithdraw={() => withdraw(activeApproval)}
      onEdit={() => openApprovalEditor(activeApproval)}
    />
  ) : null

  const approvalFormModal = approvalFormOpen ? (
    <ApprovalFormModal
      open
      approval={editingApproval}
      role={demoRole}
      onClose={() => {
        setApprovalFormOpen(false)
        setEditingApprovalId(null)
      }}
      onSave={saveApproval}
    />
  ) : null

  const contractModal = activeContract ? (
    <ContractModal
      contract={activeContract}
      partner={partnerName(activeContract.partnerId)}
      onClose={() => setContractId(null)}
      onStatus={(status) => setContractStatus(activeContract, status)}
      onRenew={() => renewContract(activeContract)}
    />
  ) : null

  if (tab === 'overview') {
    return (
      <div className="stack-20">
        <TabIntro
          title="Approvals & contracts overview"
          description="Review sample campaign, budget, offer, creative, expense and contract requests. Action buttons are demo-only and self-approval is blocked."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportApprovals(data.approvals, 'approval-register')}>Export register</Button>}
        />
        <MetricGrid>
          <MetricCard label="Pending approvals" value={pendingApprovals.length} sub={`${formatINRCompact(pendingApprovals.reduce((sum, approval) => sum + (approval.amount ?? 0), 0))} in local requests`} icon={<Clock size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Awaiting your review" value={awaitingMyReview.length} sub="Team requests assigned to this demo reviewer" icon={<BadgeCheck size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Your open requests" value={myPendingRequests.length} sub="Self-approval is blocked" icon={<UserCheckIcon />} tone="var(--chart-5)" />
          <MetricCard label="Contracts expiring" value={expiringContracts.length} sub="Expiring or due within 30 demo days" icon={<CalendarClock size={15} />} tone="var(--chart-2)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard
            title="Approval queue by type"
            subtitle="Pending and approved demo requests"
            height="md"
            legend={<><LegendItem color="var(--chart-3)" label="Pending" /><LegendItem color="var(--chart-1)" label="Approved" /></>}
            isEmpty={data.approvals.length === 0}
          >
            <BarChart data={typeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="type" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <YAxis {...axisProps} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} requests`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="approved" name="Approved" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="pending" name="Pending" fill="var(--chart-3)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Approval status mix" subtitle="All demo request records" height="md" isEmpty={statusData.length === 0}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={3} stroke="none" isAnimationActive={chartAnim}>
                {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} requests`} />} />
            </PieChart>
          </ChartCard>
        </div>

        <div className="dashboard-grid dashboard-grid--equal">
          <SectionCard title="Awaiting your review" subtitle="Demo requests where you are the reviewer." actions={<Button variant="ghost" size="xs" onClick={() => exportApprovals(awaitingMyReview, 'awaiting-review')}>Export</Button>}>
            <div className="stack-10">
              {awaitingMyReview.length === 0 ? <p className="empty-inline">No team requests are waiting for review.</p> : awaitingMyReview.map((approval) => (
                <button key={approval.id} type="button" className="campaign-mini" onClick={() => setApprovalId(approval.id)}>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="campaign-mini__name truncate">{approval.title}</span>
                    <span className="campaign-mini__meta">{approval.type} · {approval.requestedBy} · {formatDate(approval.submissionDate)}</span>
                  </span>
                  <span className="text-xs font-semibold no-shrink">{approval.amount ? formatINRCompact(approval.amount) : '—'}</span>
                  <StatusBadge status={approval.status} />
                </button>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Contract renewals" subtitle="Sample deadlines that would need legal or procurement action." actions={<Button variant="ghost" size="xs" onClick={() => exportContracts(expiringContracts, 'renewal-watchlist')}>Export</Button>}>
            <div className="stack-10">
              {expiringContracts.length === 0 ? <p className="empty-inline">No contracts are near renewal.</p> : expiringContracts.map((contract) => {
                const days = daysUntil(contract.renewalDeadline)
                return (
                  <button key={contract.id} type="button" className="campaign-mini" onClick={() => setContractId(contract.id)}>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="campaign-mini__name truncate">{contract.name}</span>
                      <span className="campaign-mini__meta">{partnerName(contract.partnerId)} · {days !== null && days < 0 ? `${Math.abs(days)}d overdue` : `${days ?? 0}d to renewal`}</span>
                    </span>
                    <StatusBadge status={contract.status} />
                  </button>
                )
              })}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Recent approval activity" subtitle="Audit-trail entries from the local demo records.">
          <div className="stack-12">
            {recentHistory.map((entry, index) => (
              <div key={`${entry.approvalId}-${index}`} className="row-12" style={{ alignItems: 'flex-start' }}>
                <span className="metric-card__icon" aria-hidden="true">
                  {entry.action.toLowerCase().includes('approved') ? <CheckCircle2 size={15} /> : entry.action.toLowerCase().includes('reject') ? <XCircle size={15} /> : <Clock size={15} />}
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <p className="text-xs font-semibold">{entry.action} · {entry.approvalTitle}</p>
                  <p className="text-xs muted">{entry.by} · {formatDateTime(entry.at)} · {entry.approvalType}</p>
                  {entry.note ? <p className="text-xs muted" style={{ marginTop: 2 }}>{entry.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <DemoNote>
          Approvals are simulated in this browser. Self-approval is blocked for requests marked “requested by you”. No workflow engine, email, e-signature or legal repository is connected.
        </DemoNote>
        {approvalModal}
        {contractModal}
      </div>
    )
  }

  if (tab === 'contract-management') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Contract management"
          description="Track demo partner agreements, renewal dates and usage rights. No signed document or e-signature is stored."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportContracts(data.contracts)}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Contracts" value={data.contracts.length} sub={`${data.contracts.filter((contract) => contract.status === 'Active').length} active`} icon={<FileSignature size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Contract value" value={formatINRCompact(data.contracts.reduce((sum, contract) => sum + contract.value, 0))} sub="Sample agreement values" icon={<FileText size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Expiring soon" value={data.contracts.filter((contract) => contract.status === 'Expiring Soon').length} sub="Renewal action needed in demo" icon={<CalendarClock size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Drafts / expired" value={data.contracts.filter((contract) => contract.status === 'Draft' || contract.status === 'Expired').length} sub="Not currently active" icon={<AlertTriangle size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <DataTable
          data={data.contracts}
          rowKey={(contract) => contract.id}
          searchable={(contract) => `${contract.name} ${partnerName(contract.partnerId)} ${contract.scope} ${contract.status}`}
          searchPlaceholder="Search contracts, partners, scopes…"
          pageSize={7}
          initialSort={{ columnId: 'renewal', direction: 'asc' }}
          caption="Contracts"
          columns={[
            { id: 'name', header: 'Contract', mobileLabel: 'Contract', sortValue: (contract) => contract.name, render: (contract) => <div><p className="cell-primary">{contract.name}</p><p className="text-xs muted">{partnerName(contract.partnerId)}</p></div> },
            { id: 'scope', header: 'Scope', mobileLabel: 'Scope', hideMobile: true, render: (contract) => <span className="text-xs" style={{ display: 'block', maxWidth: 280, lineHeight: 1.5 }}>{contract.scope}</span> },
            { id: 'end', header: 'End date', mobileLabel: 'End date', sortValue: (contract) => contract.endDate, render: (contract) => formatDate(contract.endDate) },
            { id: 'renewal', header: 'Renewal', mobileLabel: 'Renewal deadline', sortValue: (contract) => contract.renewalDeadline, render: (contract) => formatDate(contract.renewalDeadline) },
            { id: 'value', header: 'Value', align: 'right', mobileLabel: 'Value', sortValue: (contract) => contract.value, render: (contract) => <span className="cell-strong">{formatINR(contract.value)}</span> },
            { id: 'status', header: 'Status', mobileLabel: 'Status', sortValue: (contract) => contract.status, render: (contract) => <StatusBadge status={contract.status} /> },
            { id: 'actions', header: '', align: 'right', mobileLabel: 'Actions', render: (contract) => <Button variant="ghost" size="xs" onClick={() => setContractId(contract.id)}>Open</Button> },
          ]}
        />
        <DataNote>Contract names, values, partners and documents are fictional. No document file, digital signature or legal approval is stored.</DataNote>
        {contractModal}
      </div>
    )
  }

  if (tab === 'usage-rights') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Usage rights"
          description="Review sample creative and content rights by partner. Rights labels are demo text and do not represent legal advice or a signed licence."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportContracts(data.contracts, 'usage-rights')}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Rights records" value={data.contracts.length} sub="Linked to demo partner contracts" icon={<ShieldCheck size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Expiring rights" value={data.contracts.filter((contract) => (daysUntil(contract.rightsExpiry) ?? 0) <= 90).length} sub="Within the next 90 demo days" icon={<CalendarClock size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Expired rights" value={data.contracts.filter((contract) => (daysUntil(contract.rightsExpiry) ?? 0) < 0).length} sub="Need a demo review before reuse" icon={<AlertTriangle size={15} />} tone="var(--chart-5)" />
          <MetricCard label="Active contracts" value={data.contracts.filter((contract) => contract.status === 'Active').length} sub="Current demo agreements" icon={<BadgeCheck size={15} />} tone="var(--chart-2)" />
        </MetricGrid>
        <EntityGrid columns={2}>
          {data.contracts.map((contract) => {
            const days = daysUntil(contract.rightsExpiry)
            return (
              <EntityCard
                key={contract.id}
                title={contract.name}
                subtitle={partnerName(contract.partnerId)}
                badge={<Badge tone={days !== null && days < 0 ? 'danger' : days !== null && days <= 90 ? 'warning' : 'success'}>{days !== null && days < 0 ? 'Rights expired' : `${days ?? 0}d to rights expiry`}</Badge>}
                meta={<><span>Rights expiry {formatDate(contract.rightsExpiry)}</span><span>Contract {contract.status}</span></>}
                onClick={() => setContractId(contract.id)}
              >
                <p className="text-xs muted" style={{ lineHeight: 1.6 }}>{contract.usageRights}</p>
                <div className="mt-10"><ProgressBar value={days !== null ? Math.max(0, Math.min(100, (days / 365) * 100)) : 0} size="sm" tone={days !== null && days <= 90 ? 'warning' : 'success'} /></div>
              </EntityCard>
            )
          })}
        </EntityGrid>
        <DataNote>Usage rights, expiry dates and partner names are sample values. Confirm actual rights with legal before reusing any creative.</DataNote>
        {contractModal}
      </div>
    )
  }

  if (tab === 'renewals') {
    const renewals = [...data.contracts].sort((a, b) => a.renewalDeadline.localeCompare(b.renewalDeadline))
    return (
      <div className="stack-16">
        <TabIntro
          title="Renewal & expiry alerts"
          description="Local reminder view for demo contracts. No email, calendar reminder or legal notification is sent."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportContracts(renewals, 'renewals')}>Export CSV</Button>}
        />
        <div className="callout callout--warning">
          <CalendarClock size={15} />
          <span>These are sample alerts only. The portal does not own or send reminders, and no one outside this browser is notified.</span>
        </div>
        <div className="stack-12">
          {renewals.map((contract) => {
            const days = daysUntil(contract.renewalDeadline)
            const overdue = days !== null && days < 0
            return (
              <article className="card card--pad" key={contract.id}>
                <div className="between" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs faint">{contract.id} · {partnerName(contract.partnerId)}</p>
                    <h3 style={{ marginTop: 3, fontSize: '0.95rem' }}>{contract.name}</h3>
                    <p className="text-xs muted">Renewal deadline {formatDate(contract.renewalDeadline)} · ends {formatDate(contract.endDate)}</p>
                  </div>
                  <div className="row-8 no-shrink">
                    <Badge tone={overdue ? 'danger' : days !== null && days <= 30 ? 'warning' : 'neutral'}>
                      {overdue ? `${Math.abs(days ?? 0)}d overdue` : `${days ?? 0}d remaining`}
                    </Badge>
                    <StatusBadge status={contract.status} />
                  </div>
                </div>
                <p className="text-sm muted mt-10" style={{ lineHeight: 1.55 }}>{contract.scope}</p>
                <div className="between mt-12" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <span className="text-xs faint">{formatINR(contract.value)} sample value</span>
                  <div className="row-8">
                    <Button variant="ghost" size="xs" onClick={() => setContractId(contract.id)}>Open contract</Button>
                    <Button variant="primary" size="xs" icon={<RefreshCw size={13} />} onClick={() => renewContract(contract)}>Renew 12 months (demo)</Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
        <DataNote>Renewing only extends the stored demo dates. No contract is generated, signed or sent to the partner.</DataNote>
        {contractModal}
      </div>
    )
  }

  const typeForTab: Record<string, ApprovalType> = {
    'campaign-approvals': 'Campaign',
    'budget-approvals': 'Budget',
    'offer-approvals': 'Offer',
  }

  if (tab === 'pending-approvals' || typeForTab[tab]) {
    const type = typeForTab[tab]
    const baseRows = type
      ? data.approvals.filter((approval) => approval.type === type)
      : data.approvals.filter((approval) => approval.status === 'Pending' || approval.requestedByMe)
    const rows = baseRows.filter((approval) => {
      if (type) return true
      if (statusFilter !== 'All' && approval.status !== statusFilter) return false
      if (typeFilter !== 'All' && approval.type !== typeFilter) return false
      if (ownerFilter === 'Mine' && !approval.requestedByMe) return false
      if (ownerFilter === 'Team' && approval.requestedByMe) return false
      return true
    })
    return (
      <div className="stack-16">
        <div className="approval-toolbar card card--pad-sm">
          <div className="approval-toolbar__role">
            <div>
              <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em' }}>Acting as</p>
              <p className="text-sm font-semibold">{actorName}</p>
            </div>
            <select
              className="select"
              value={demoRole}
              aria-label="Demo approval role"
              onChange={(event) => {
                const role = event.target.value as DemoRole
                setDemoRole(role)
                try {
                  sessionStorage.setItem(ROLE_KEY, role)
                } catch {
                  // Session storage is optional for this demo control.
                }
                pushToast({
                  title: `Demo role: ${role}`,
                  description:
                    role === 'Admin'
                      ? 'You can now review team requests. Your own requests still cannot be self-approved.'
                      : 'Employees can submit, edit and track their own approval requests. Admin decisions are disabled.',
                  tone: 'info',
                })
              }}
            >
              <option value="Employee">Employee · Ananya Rao</option>
              <option value="Admin">Admin reviewer</option>
            </select>
            <Badge tone={demoRole === 'Admin' ? 'accent' : 'neutral'}>{demoRole === 'Admin' ? 'Admin controls enabled' : 'Employee controls'}</Badge>
          </div>
          <div className="row-8 wrap">
            <Button
              variant="soft"
              icon={<Plus size={14} />}
              onClick={() => {
                setEditingApprovalId(null)
                setApprovalFormOpen(true)
              }}
            >
              New request
            </Button>
            <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportApprovals(rows, type ? `${type.toLowerCase()}-approvals` : 'pending-approvals')}>Export CSV</Button>
          </div>
        </div>
        <TabIntro
          title={type ? `${type} approvals` : 'Pending approvals'}
          description={type
            ? `Review ${type.toLowerCase()} requests in the local demo workflow. Employees submit and track; Admin decisions are required.`
            : 'Submit and track your own requests, or switch to the Admin demo role to review team requests. Self-approval is always blocked.'}
        />
        <MetricGrid>
          <MetricCard label={type ? `${type} requests` : 'Requests in view'} value={rows.length} sub={`${rows.filter((approval) => approval.status === 'Pending').length} pending · ${awaitingMyReview.length} for Admin review`} icon={<Clock size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Awaiting your action" value={rows.filter((approval) => !approval.requestedByMe && approval.status === 'Pending').length} sub="Team requests you can review" icon={<BadgeCheck size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Your pending requests" value={rows.filter((approval) => approval.requestedByMe && approval.status === 'Pending').length} sub="Drafts and returned items stay below" icon={<ShieldCheck size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Request value" value={formatINRCompact(rows.reduce((sum, approval) => sum + (approval.amount ?? 0), 0))} sub="Sample amounts only" icon={<FileText size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <DataTable
          data={rows}
          columns={approvalColumns(rows)}
          rowKey={(approval) => approval.id}
          searchable={(approval) => `${approval.title} ${approval.type} ${approval.requestedBy} ${approval.reviewer} ${approval.status}`}
          searchPlaceholder="Search requests, requesters, reviewers…"
          pageSize={8}
          initialSort={{ columnId: 'submitted', direction: 'desc' }}
          onRowClick={(approval) => setApprovalId(approval.id)}
          caption={type ? `${type} approvals` : 'Pending approvals'}
          filters={type ? undefined : (
            <>
              <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter approval status">
                <option value="All">All statuses</option>
                {APPROVAL_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter approval type">
                <option value="All">All request types</option>
                {APPROVAL_TYPES.map((approvalType) => <option key={approvalType}>{approvalType}</option>)}
              </select>
              <select className="select" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} aria-label="Filter approvals by requester">
                <option value="All">All requesters</option>
                <option value="Mine">My requests</option>
                <option value="Team">Team requests</option>
              </select>
            </>
          )}
          emptyTitle="No requests match these filters"
        />

        <div className="callout callout--warning">
          <ShieldCheck size={15} />
          <span><strong>Permissions:</strong> employees can create, edit, withdraw, resubmit and track their own requests. Only the Admin demo role can approve, reject or request changes, and no one can approve their own request.</span>
        </div>
        <DataNote>Approval decisions change local demo status and append an audit-trail entry. No email, workflow tool, e-signature or finance system is updated.</DataNote>
        {approvalModal}
        {approvalFormModal}
      </div>
    )
  }

  // Fallback for an unknown tab is handled by the module wrapper.
  return (
    <div className="stack-16">
      <TabIntro title="Approvals" description="Select a tab to review requests and contracts." />
      {approvalModal}
      {contractModal}
      <EntityGrid columns={2}>
        {filteredApprovals.slice(0, 4).map((approval) => (
          <EntityCard key={approval.id} title={approval.title} subtitle={approval.type} badge={<StatusBadge status={approval.status} />} onClick={() => setApprovalId(approval.id)} />
        ))}
      </EntityGrid>
    </div>
  )
}

function UserCheckIcon() {
  return <ShieldCheck size={15} />
}

function ApprovalModal({
  approval,
  demoRole,
  onClose,
  onDecide,
  onWithdraw,
  onEdit,
}: {
  approval: Approval
  demoRole: DemoRole
  onClose: () => void
  onDecide: (decision: Decision, comment: string) => void
  onWithdraw: () => void
  onEdit: () => void
}) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const canReview = demoRole === 'Admin' && !approval.requestedByMe && approval.status === 'Pending'
  const canWithdraw = approval.requestedByMe && approval.status === 'Pending'
  const canEdit =
    approval.requestedByMe && ['Draft', 'Changes Requested', 'Rejected'].includes(approval.status)

  const submit = (decision: Decision) => {
    if ((decision === 'Reject' || decision === 'Request changes') && !comment.trim()) {
      setError('Add a short reason before rejecting or requesting changes.')
      return
    }
    setError('')
    onDecide(decision, comment)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={approval.title}
      description={`${approval.id} · ${approval.type} · ${approval.status}`}
      size="wide"
      footer={
        canReview ? (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="ghost" onClick={() => submit('Request changes')}>Request changes</Button>
            <Button variant="outline-danger" onClick={() => submit('Reject')}>Reject</Button>
            <Button variant="success" icon={<CheckCircle2 size={14} />} onClick={() => submit('Approve')}>Approve</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {canEdit ? (
              <Button variant="soft" icon={<Pencil size={14} />} onClick={onEdit}>
                {approval.status === 'Draft' ? 'Edit draft' : 'Edit & resubmit'}
              </Button>
            ) : null}
          </>
        )
      }
    >
      <div className="stack-16">
        <div className="row-8 wrap">
          <StatusBadge status={approval.status} />
          <Badge tone="neutral">{approval.type}</Badge>
          {approval.amount ? <Badge tone="neutral">{formatINR(approval.amount)}</Badge> : null}
          {approval.requestedByMe ? <Badge tone="warning">Your request</Badge> : <Badge tone="accent">Team request</Badge>}
        </div>

        {approval.requestedByMe ? (
          <div className="callout callout--warning">
            <ShieldCheck size={15} />
            <span><strong>Self-approval is blocked.</strong> You submitted this request, so reviewer actions are disabled even in the Admin demo role. Employees can edit and resubmit when changes are requested.</span>
          </div>
        ) : canReview ? (
          <div className="callout callout--info">
            <BadgeCheck size={15} />
            <span>You are reviewing this team request in the Admin demo role. Decisions update local status and append an audit-trail entry only.</span>
          </div>
        ) : (
          <div className="callout callout--info">
            <ShieldCheck size={15} />
            <span><strong>Admin decision required.</strong> Switch the demo role to Admin to approve, reject or request changes. Employees can track status and comments here.</span>
          </div>
        )}

        <DetailRows
          items={[
            { label: 'Requested by', value: <AvatarWithName name={approval.requestedBy} sub={approval.requestedByMe ? 'You' : 'Demo teammate'} size="sm" /> },
            { label: 'Reviewer', value: approval.reviewer },
            { label: 'Submitted', value: formatDate(approval.submissionDate) },
            { label: 'Request type', value: approval.type },
            { label: 'Amount', value: approval.amount ? formatINR(approval.amount) : 'No amount recorded' },
            { label: 'Status', value: <StatusBadge status={approval.status} /> },
          ]}
        />

        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Summary</p>
          <p className="text-sm" style={{ lineHeight: 1.6 }}>{approval.summary}</p>
        </div>

        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Requester comment</p>
          <p className="text-sm muted" style={{ lineHeight: 1.6 }}>{approval.comments || 'No comment provided.'}</p>
        </div>

        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Admin reviewer comment</p>
          <p className="text-sm muted" style={{ lineHeight: 1.6 }}>{approval.reviewerComment || 'No Admin comment recorded.'}</p>
        </div>

        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Audit trail</p>
          <div className="stack-10">
            {approval.history.map((entry, index) => (
              <div key={`${entry.at}-${index}`} className="row-12" style={{ alignItems: 'flex-start' }}>
                <span className="metric-card__icon" aria-hidden="true">
                  {entry.action.toLowerCase().includes('approved') ? <CheckCircle2 size={14} /> : entry.action.toLowerCase().includes('reject') ? <XCircle size={14} /> : <Clock size={14} />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p className="text-xs font-semibold">{entry.action}</p>
                  <p className="text-xs muted">{entry.by} · {formatDateTime(entry.at)}</p>
                  {entry.note ? <p className="text-xs muted" style={{ marginTop: 2, lineHeight: 1.5 }}>{entry.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {canReview ? (
          <Field label="Reviewer comment" htmlFor="approval-comment" error={error} hint="Required for rejection or changes requested. Stored locally in the audit trail.">
            <textarea
              id="approval-comment"
              className="textarea"
              rows={3}
              value={comment}
              onChange={(event) => { setComment(event.target.value); setError('') }}
              placeholder="Add a demo review note…"
              aria-invalid={Boolean(error)}
            />
          </Field>
        ) : null}

        {canWithdraw ? (
          <div className="between" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="text-xs muted">You can withdraw your own pending request, but you cannot approve it.</span>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={onWithdraw}>Withdraw request (demo)</Button>
          </div>
        ) : null}

        <DataNote>No real approver, legal team or finance system is contacted. Decisions are persisted only in this browser.</DataNote>
      </div>
    </Modal>
  )
}

function ApprovalFormModal({
  open,
  approval,
  role,
  onClose,
  onSave,
}: {
  open: boolean
  approval: Approval | null
  role: DemoRole
  onClose: () => void
  onSave: (values: ApprovalFormValues, submit: boolean) => void
}) {
  const [values, setValues] = useState<ApprovalFormValues>(() => ({
    title: approval?.title ?? '',
    type: approval?.type ?? 'Campaign',
    amount: approval?.amount ? String(approval.amount) : '',
    summary: approval?.summary ?? '',
    comments: approval?.comments ?? '',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setValues({
      title: approval?.title ?? '',
      type: approval?.type ?? 'Campaign',
      amount: approval?.amount ? String(approval.amount) : '',
      summary: approval?.summary ?? '',
      comments: approval?.comments ?? '',
    })
    setErrors({})
  }, [approval, open])

  const set = <K extends keyof ApprovalFormValues>(key: K, value: ApprovalFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = (submitForReview: boolean) => {
    const next: Record<string, string> = {}
    if (!values.title.trim()) next.title = 'Give the request a clear title.'
    if (!values.summary.trim()) next.summary = 'Describe what needs approval.'
    if (values.amount.trim() && (Number.isNaN(Number(values.amount)) || Number(values.amount) < 0)) {
      next.amount = 'Enter a valid amount or leave it blank.'
    }
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values, submitForReview)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={approval ? `Edit ${approval.id}` : 'New approval request'}
      description={
        approval
          ? 'Update your request and resubmit it for Admin review.'
          : `Creating as ${role === 'Admin' ? 'Admin Reviewer' : 'Ananya Rao'}. Your request cannot be approved by you.`
      }
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="soft" onClick={() => submit(false)}>Save draft</Button>
          <Button variant="primary" icon={<BadgeCheck size={14} />} onClick={() => submit(true)}>
            {approval && ['Changes Requested', 'Rejected'].includes(approval.status) ? 'Resubmit for approval' : 'Submit for approval'}
          </Button>
        </>
      }
    >
      <div className="stack-16">
        {approval?.reviewerComment ? (
          <div className="callout callout--warning">
            <AlertTriangle size={14} />
            <span><strong>Admin feedback:</strong> {approval.reviewerComment}</span>
          </div>
        ) : null}
        <div className="form-grid">
          <Field label="Request title" htmlFor="approval-title" required error={errors.title} className="form-grid__full">
            <input id="approval-title" className="input" value={values.title} onChange={(event) => set('title', event.target.value)} aria-invalid={Boolean(errors.title)} placeholder="e.g. Festive campaign budget increase" />
          </Field>
          <Field label="Request type" htmlFor="approval-type">
            <select id="approval-type" className="select" value={values.type} onChange={(event) => set('type', event.target.value as ApprovalType)}>
              {APPROVAL_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Amount (₹)" htmlFor="approval-amount" error={errors.amount} hint="Optional. Required only when the request has a financial value.">
            <input id="approval-amount" className="input" type="number" min="0" value={values.amount} onChange={(event) => set('amount', event.target.value)} aria-invalid={Boolean(errors.amount)} />
          </Field>
          <Field label="What needs approval?" htmlFor="approval-summary" required error={errors.summary} className="form-grid__full">
            <textarea id="approval-summary" className="textarea" rows={4} value={values.summary} onChange={(event) => set('summary', event.target.value)} aria-invalid={Boolean(errors.summary)} placeholder="Scope, campaign, rationale and any deadline…" />
          </Field>
          <Field label="Requester comment" htmlFor="approval-comments" hint="Visible to the Admin reviewer with the request." className="form-grid__full">
            <textarea id="approval-comments" className="textarea" rows={3} value={values.comments} onChange={(event) => set('comments', event.target.value)} placeholder="Any supporting context for the reviewer…" />
          </Field>
        </div>
        <div className="callout callout--info">
          <ShieldCheck size={14} />
          <span>Drafts can be edited. Submitting changes the status to Pending and notifies only this local demo. Admin approval is required; self-approval is always blocked.</span>
        </div>
        <DataNote>No email, workflow tool, e-signature or finance system is contacted. Requests and decisions remain in this browser.</DataNote>
      </div>
    </Modal>
  )
}

function ContractModal({
  contract,
  partner,
  onClose,
  onStatus,
  onRenew,
}: {
  contract: Contract
  partner: string
  onClose: () => void
  onStatus: (status: ContractStatus) => void
  onRenew: () => void
}) {
  const renewalDays = daysUntil(contract.renewalDeadline)
  const rightsDays = daysUntil(contract.rightsExpiry)
  return (
    <Modal
      open
      onClose={onClose}
      title={contract.name}
      description={`${partner} · ${contract.id}`}
      size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" icon={<RefreshCw size={14} />} onClick={onRenew}>Renew 12 months (demo)</Button></>}
    >
      <div className="stack-16">
        <div className="row-8 wrap">
          <StatusBadge status={contract.status} />
          <Badge tone={renewalDays !== null && renewalDays <= 30 ? 'warning' : 'neutral'}>
            {renewalDays !== null && renewalDays < 0 ? `${Math.abs(renewalDays)}d past renewal` : `${renewalDays ?? 0}d to renewal`}
          </Badge>
          <Badge tone={rightsDays !== null && rightsDays <= 90 ? 'warning' : 'neutral'}>
            {rightsDays !== null && rightsDays < 0 ? 'Rights expired' : `${rightsDays ?? 0}d of rights`}
          </Badge>
          <Badge tone="neutral">{formatINR(contract.value)}</Badge>
        </div>
        <DetailRows
          items={[
            { label: 'Partner', value: partner },
            { label: 'Start date', value: formatDate(contract.startDate) },
            { label: 'End date', value: formatDate(contract.endDate) },
            { label: 'Renewal deadline', value: formatDate(contract.renewalDeadline) },
            { label: 'Contract value', value: formatINR(contract.value) },
            { label: 'Rights expiry', value: formatDate(contract.rightsExpiry) },
          ]}
        />
        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Scope</p>
          <p className="text-sm" style={{ lineHeight: 1.6 }}>{contract.scope}</p>
        </div>
        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Usage rights</p>
          <p className="text-sm" style={{ lineHeight: 1.6 }}>{contract.usageRights}</p>
        </div>
        <Field label="Demo contract status" htmlFor="contract-status" hint="Local label only. No contract or legal record is changed.">
          <select id="contract-status" className="select" value={contract.status} onChange={(event) => onStatus(event.target.value as ContractStatus)}>
            {CONTRACT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <DataNote>No signed contract, legal repository, e-signature or renewal notice is connected. Renewing only extends local demo dates.</DataNote>
      </div>
    </Modal>
  )
}
