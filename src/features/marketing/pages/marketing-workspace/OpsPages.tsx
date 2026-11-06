import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  IndianRupee,
  Lightbulb,
  Megaphone,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Field } from '../../components/ui/Form'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useMarketingDepartment } from '../../context/MarketingDepartmentContext'
import { useToast } from '../../context/ToastContext'
import { roleWorkspacePath } from '../../config/roleNavigation'
import { useNavigate } from 'react-router-dom'
import {
  EmployeeAvatar,
  EmptyBlock,
  KpiCard,
  MmsPageHeader,
  MmsProgress,
  MmsSelect,
  MmsTabs,
  SearchField,
  SectionCard,
  SectorChip,
  StatusChip,
  TimelineList,
  moneyCompact,
  useMmsActor,
  useMmsScope,
} from '../../components/marketing/management/MmsKit'
import {
  ActivityList,
  ApprovalList,
  CampaignCard,
  DateRangeTabs,
  ExpenseTable,
  IdeaList,
  MmsKpiGrid,
  MmsTwoCol,
} from '../../components/marketing/management/MmsLists'
import {
  ApprovalRequestModal,
  CampaignFormModal,
} from '../../components/marketing/management/MmsModals'
import {
  ActivityFormModal,
  ApprovalDecisionModal,
  ExpenseDecisionModal,
  ExpenseFormModal,
  IdeaFormModal,
  IdeaReviewModal,
} from '../../components/marketing/management/MmsOpsModals'
import type {
  MarketingApprovalRequest,
  MarketingCampaign,
  MarketingExpense,
  MarketingIdea,
} from '../../types/marketingDepartment'
import {
  campaignActualLeads,
  campaignProgress,
  campaignTone,
  expenseTone,
  ideaTone,
  leadStats,
  monthKey,
  shortDate,
  walletSummary,
} from '../../utils/marketingDepartment'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../../utils/format'
import { rangeForPreset, inRange } from '../../utils/marketingDepartment'

/* ------------------------------------------------------------------ */
/* Campaign management                                                 */
/* ------------------------------------------------------------------ */

export function CampaignsPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<MarketingCampaign | null>(null)
  const navigate = useNavigate()

  const campaigns = department.campaigns.filter((campaign) =>
    scope.roleId === 'manager' ? true : scope.mySectors.some((sector) => sector.id === campaign.sectorId),
  )
  const active = campaigns.filter((campaign) => campaign.status === 'Active')
  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0)
  const totalLeads = campaigns.reduce((sum, campaign) => sum + campaignActualLeads(campaign, department.leads), 0)
  const totalTarget = campaigns.reduce((sum, campaign) => sum + campaign.expectedLeads, 0)
  const leadStatsValue = leadStats(scope.leads, scope.followUps)

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'junior' ? 'Junior workspace' : scope.roleId === 'senior' ? 'Senior workspace' : 'Manager workspace'}
        title="Campaign Management"
        subtitle={
          scope.roleId === 'manager'
            ? 'Plan campaigns, assign teams, track delivery and attribute pipeline outcomes.'
            : scope.roleId === 'senior'
              ? 'Execute live campaigns with your sector team and monitor lead delivery.'
              : 'Your campaign assignments, activities and participation.'
        }
        actions={
          scope.roleId !== 'junior' ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>Create campaign</Button>
          ) : (
            <Button variant="soft" icon={<Activity size={15} />} onClick={() => navigate(roleWorkspacePath('activities'))}>Log campaign activity</Button>
          )
        }
        meta={
          <div className="mms-header-meta">
            <span><Megaphone size={13} /> {active.length} active campaigns</span>
            <span><Target size={13} /> {formatNumber(totalLeads)} attributed leads</span>
            <span><Wallet size={13} /> {moneyCompact(totalBudget)} budget</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Campaigns" value={campaigns.length} icon={<Megaphone size={18} />} tone="var(--chart-1)" hint={`${active.length} active`} />
        <KpiCard label="Attributed leads" value={totalLeads} icon={<Target size={18} />} tone="var(--chart-2)" hint={`of ${formatNumber(totalTarget)} campaign target`} />
        <KpiCard label="Campaign budget" value={totalBudget} icon={<IndianRupee size={18} />} tone="var(--chart-3)" format={(value) => moneyCompact(value)} hint="Planned campaign spend" />
        <KpiCard label="Qualified pipeline" value={leadStatsValue.qualified} icon={<BadgeCheck size={18} />} tone="var(--chart-5)" hint="From sector activity" />
      </MmsKpiGrid>

      <SectionCard
        title="Campaign portfolio"
        subtitle="Every card shows budget, lead delivery and assigned team"
        actions={<Button size="xs" variant="ghost" onClick={() => navigate(roleWorkspacePath('reports'))}>Campaign report <ArrowRight size={12} /></Button>}
      >
        <div className="mms-campaign-grid">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              sector={department.sectors.find((sector) => sector.id === campaign.sectorId)}
              leads={department.leads}
              team={department.employees}
              onOpen={() => setDetail(campaign)}
              actions={
                scope.roleId === 'junior' ? null : (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => department.updateCampaignStatus(campaign.id, campaign.status === 'Active' ? 'Paused' : 'Active', scope.actor)}
                  >
                    {campaign.status === 'Active' ? 'Pause' : 'Activate'}
                  </Button>
                )
              }
            />
          ))}
          {!campaigns.length ? <EmptyBlock icon={<Megaphone size={20} />} title="No campaigns in scope" description="Create a campaign to plan budget, target audience and delivery." /> : null}
        </div>
      </SectionCard>

      <MmsTwoCol variant="1-1">
        <SectionCard title="Delivery by campaign" subtitle="Actual leads against target" icon={<TrendingUp size={16} />}>
          <div className="mms-campaign-progress-list">
            {campaigns.slice(0, 6).map((campaign) => {
              const progress = campaignProgress(campaign, department.leads)
              return (
                <div key={campaign.id}>
                  <div><span>{campaign.name}</span><strong>{progress}%</strong></div>
                  <ProgressBar value={Math.min(100, progress)} size="sm" tone={progress >= 100 ? 'success' : progress >= 60 ? 'brand' : 'warning'} />
                  <small>{campaignActualLeads(campaign, department.leads)} of {campaign.expectedLeads} leads</small>
                </div>
              )
            })}
          </div>
        </SectionCard>
        <SectionCard title="Campaign activity" subtitle="Recent sector execution" icon={<Activity size={16} />} actions={<Button size="xs" variant="ghost" onClick={() => navigate(roleWorkspacePath('activities'))}>All activity <ArrowRight size={12} /></Button>}>
          <ActivityList
            activities={department.activities.filter((entry) => /campaign/i.test(`${entry.type} ${entry.title} ${entry.detail}`))}
            sectors={department.sectors}
            limit={5}
          />
        </SectionCard>
      </MmsTwoCol>

      <CampaignFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        lockedSectorIds={scope.roleId === 'manager' ? undefined : scope.mySectors.map((sector) => sector.id)}
      />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="wide"
        title={detail?.name ?? 'Campaign'}
        description={detail ? `${detail.objective}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            {detail ? (
              <Button
                variant="primary"
                onClick={() => {
                  department.updateCampaignStatus(detail.id, detail.status === 'Active' ? 'Paused' : 'Active', scope.actor)
                  setDetail({ ...detail, status: detail.status === 'Active' ? 'Paused' : 'Active' })
                }}
              >
                {detail.status === 'Active' ? 'Pause campaign' : 'Activate campaign'}
              </Button>
            ) : null}
          </>
        }
      >
        {detail ? (
          <div className="mms-campaign-detail">
            <div className="mms-sector-detail__head">
              <StatusChip status={detail.status} tone={campaignTone(detail.status)} />
              <SectorChip sector={department.sectors.find((sector) => sector.id === detail.sectorId)} />
              <Badge tone="info" dot>{detail.priority} priority</Badge>
            </div>
            <div className="mms-profile-grid">
              <div className="mms-profile-stat"><span>Budget</span><strong>{formatINR(detail.budget)}</strong><small>Planned spend</small></div>
              <div className="mms-profile-stat"><span>Target leads</span><strong>{formatNumber(detail.expectedLeads)}</strong><small>{campaignActualLeads(detail, department.leads)} delivered</small></div>
              <div className="mms-profile-stat"><span>Team</span><strong>{detail.teamIds.length}</strong><small>Assigned members</small></div>
              <div className="mms-profile-stat"><span>Timeline</span><strong>{shortDate(detail.startDate)}</strong><small>to {shortDate(detail.endDate)}</small></div>
            </div>
            <div className="mms-detail-block">
              <h3>Target audience</h3>
              <p>{detail.targetAudience || '—'}</p>
              <h3>Assigned team</h3>
              <div className="mms-person-grid">
                {department.employees.filter((employee) => detail.teamIds.includes(employee.id)).map((employee) => (
                  <div key={employee.id} className="mms-person-mini"><EmployeeAvatar employee={employee} size="md" /><div><strong>{employee.name}</strong><small>{employee.designation}</small></div></div>
                ))}
                {!detail.teamIds.length ? <p className="mms-empty-line">No team assigned.</p> : null}
              </div>
            </div>
            <div className="mms-detail-block">
              <h3>Campaign leads</h3>
              <div className="mms-mini-queue-list">
                {department.leads.filter((lead) => lead.campaignId === detail.id).slice(0, 5).map((lead) => (
                  <div key={lead.id} className="mms-mini-row">
                    <span className="mms-mini-row__icon"><Target size={14} /></span>
                    <div><strong>{lead.name}</strong><small>{lead.businessName} · {formatINRCompact(lead.expectedValue)}</small></div>
                    <StatusChip status={lead.stage} />
                  </div>
                ))}
                {!department.leads.some((lead) => lead.campaignId === detail.id) ? <p className="mms-empty-line">No leads attributed yet.</p> : null}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

export function ExpensesPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [tab, setTab] = useState('queue')
  const [formOpen, setFormOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<MarketingExpense | null>(null)
  const [decision, setDecision] = useState<{ expense: MarketingExpense; decision: 'approve' | 'reject' | 'changes' } | null>(null)
  const [month, setMonth] = useState(monthKey())
  const [walletOpen, setWalletOpen] = useState(false)

  const expenses = scope.expenses
  const monthOptions = Array.from(new Set([
    monthKey(),
    ...expenses.map((expense) => monthKey(expense.expenseDate)),
    ...department.walletAllocations.map((allocation) => allocation.month),
  ])).sort().reverse()
  const monthlyExpenses = expenses.filter((expense) => monthKey(expense.expenseDate) === month)
  const pending = monthlyExpenses.filter((expense) => ['Submitted', 'Under Senior Review', 'Manager Review', 'Finance Review'].includes(expense.status))
  const approved = monthlyExpenses.filter((expense) => expense.status === 'Approved')
  const rejected = monthlyExpenses.filter((expense) => expense.status === 'Rejected' || expense.status === 'Changes Requested')
  const shown =
    tab === 'approved' ? approved : tab === 'rejected' ? rejected : tab === 'queue' ? pending : monthlyExpenses
  const filtered = shown
    .filter((expense) => `${expense.title} ${expense.employeeName} ${expense.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const totalPending = pending.reduce((sum, expense) => sum + expense.amount, 0)
  const totalApproved = approved.reduce((sum, expense) => sum + expense.amount, 0)
  const financeStage = monthlyExpenses.filter((expense) => expense.status === 'Finance Review')
  const myWallet = walletSummary(department.expenses, department.walletAllocations, scope.actor.id, month)
  const teamAllocation = department.walletAllocations
    .filter((allocation) => allocation.month === month)
    .reduce((sum, allocation) => sum + allocation.amount, 0)
  const allocation = scope.roleId === 'manager' ? teamAllocation : myWallet.allocation
  const spent = scope.roleId === 'manager' ? totalApproved : myWallet.spent
  const pendingAmount = scope.roleId === 'manager' ? totalPending : myWallet.pendingAmount
  const rejectedAmount = scope.roleId === 'manager' ? rejected.reduce((sum, expense) => sum + expense.amount, 0) : myWallet.rejectedAmount
  const remaining = allocation - spent

  const walletHistory = monthOptions.slice(0, 6).map((key) => {
    const monthExpenses = expenses.filter((expense) => monthKey(expense.expenseDate) === key)
    const monthApproved = monthExpenses.filter((expense) => expense.status === 'Approved')
    const allocated = scope.roleId === 'manager'
      ? department.walletAllocations.filter((allocationItem) => allocationItem.month === key).reduce((sum, allocationItem) => sum + allocationItem.amount, 0)
      : department.walletAllocations.filter((allocationItem) => allocationItem.month === key && allocationItem.employeeId === scope.actor.id).reduce((sum, allocationItem) => sum + allocationItem.amount, 0)
    const monthSpent = monthApproved.reduce((sum, expense) => sum + expense.amount, 0)
    return { key, allocated, monthSpent, remaining: allocated - monthSpent, pending: monthExpenses.filter((expense) => !['Approved', 'Rejected'].includes(expense.status)).length }
  })

  function actionsFor(expense: MarketingExpense) {
    if (scope.roleId === 'junior') return null
    if (scope.roleId === 'senior' && expense.status === 'Under Senior Review') {
      return (
        <>
          <Button size="xs" variant="ghost" onClick={() => setDecision({ expense, decision: 'reject' })}>Reject</Button>
          <Button size="xs" variant="primary" onClick={() => setDecision({ expense, decision: 'approve' })}>Forward</Button>
        </>
      )
    }
    if (scope.roleId === 'manager' && expense.status === 'Manager Review') {
      return (
        <>
          <Button size="xs" variant="ghost" onClick={() => setDecision({ expense, decision: 'reject' })}>Reject</Button>
          <Button size="xs" variant="primary" onClick={() => setDecision({ expense, decision: 'approve' })}>Send to Finance</Button>
        </>
      )
    }
    if (expense.status === 'Finance Review') {
      return <Badge tone="accent" dot>Finance/Admin</Badge>
    }
    return <Button size="xs" variant="ghost" onClick={() => setDetail(expense)}>Details</Button>
  }

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'junior' ? 'Junior workspace' : scope.roleId === 'senior' ? 'Senior workspace' : 'Manager workspace'}
        title={scope.roleId === 'junior' ? 'Submit Expenses' : 'Expense Approvals'}
        subtitle={
          scope.roleId === 'junior'
            ? 'Raise claims with receipts and track the Senior → Manager → Finance approval trail.'
            : scope.roleId === 'senior'
              ? 'Review junior claims and forward them to the manager. Finance/Admin gives final approval.'
              : 'Approve team claims and forward them to Finance/Admin. Marketing cannot release the final payment.'
        }
        actions={
          <>
            <label className="mms-select">
              <span>Month</span>
              <select value={month} onChange={(event) => setMonth(event.target.value)}>
                {monthOptions.map((key) => <option key={key} value={key}>{new Date(`${key}-01`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</option>)}
              </select>
            </label>
            {scope.roleId === 'manager' ? <Button variant="soft" icon={<Wallet size={15} />} onClick={() => setWalletOpen(true)}>Allocate wallet</Button> : null}
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setFormOpen(true)}>Submit expense</Button>
          </>
        }
        meta={
          <div className="mms-header-meta">
            <span><ReceiptText size={13} /> {monthlyExpenses.length} claims this month</span>
            <span><Wallet size={13} /> {moneyCompact(remaining)} remaining</span>
            <span><ShieldCheck size={13} /> Finance/Admin final approval</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Monthly allocation" value={allocation} icon={<Wallet size={18} />} tone="var(--chart-1)" format={(value) => moneyCompact(value)} hint={month} />
        <KpiCard label="Spent this month" value={spent} icon={<ReceiptText size={18} />} tone="var(--chart-3)" format={(value) => moneyCompact(value)} hint="Approved claims only" />
        <KpiCard label="Remaining balance" value={remaining} icon={<IndianRupee size={18} />} tone="var(--chart-2)" format={(value) => moneyCompact(value)} hint={`${allocation ? Math.round((spent / allocation) * 100) : 0}% of allocation used`} />
        <KpiCard label="Pending expenses" value={pendingAmount} icon={<CalendarClock size={18} />} tone="var(--chart-4)" format={(value) => moneyCompact(value)} hint={`${pending.length} claims awaiting approval`} />
      </MmsKpiGrid>

      <SectionCard
        title="Wallet summary"
        subtitle="Monthly allocation is separate from the expenses spent against it."
        icon={<Wallet size={16} />}
        actions={<Badge tone="info" dot>{month}</Badge>}
      >
        <div className="mms-wallet-grid">
          <div><span>Allocated</span><strong>{moneyCompact(allocation)}</strong><small>Monthly envelope</small></div>
          <div><span>Spent</span><strong>{moneyCompact(spent)}</strong><small>{approved.length} approved claims</small></div>
          <div><span>Remaining</span><strong>{moneyCompact(remaining)}</strong><small>Balance available</small></div>
          <div><span>Pending</span><strong>{moneyCompact(pendingAmount)}</strong><small>{pending.length} claims in review</small></div>
          <div><span>Approved</span><strong>{moneyCompact(totalApproved)}</strong><small>{approved.length} claims</small></div>
          <div><span>Rejected</span><strong>{moneyCompact(rejectedAmount)}</strong><small>{rejected.length} claims returned</small></div>
        </div>
        <div className="mms-wallet-progress">
          <MmsProgress label="Allocation used" value={allocation ? Math.min(100, (spent / allocation) * 100) : 0} />
          <span>Pending claims are not counted as spent until Finance/Admin approves them.</span>
        </div>
      </SectionCard>

      <div className="mms-inline-notice">
        <ShieldCheck size={15} />
        <div>
          <strong>Final financial approval stays with Finance/Admin.</strong>
          <span>Manager approval only forwards a claim. Marketing cannot mark it paid or override the Finance decision.</span>
        </div>
      </div>

      <div className="mms-toolbar-row mms-toolbar-row--wrap">
        <MmsTabs
          value={tab}
          onChange={setTab}
          ariaLabel="Expense filters"
          options={[
            { id: 'queue', label: 'In review', count: pending.length },
            { id: 'approved', label: 'Approved', count: approved.length },
            { id: 'rejected', label: 'Returned', count: rejected.length },
            { id: 'all', label: 'All', count: expenses.length },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search expenses…" />
      </div>

      <SectionCard title="Expense register" subtitle={`${filtered.length} records · click a claim for its full approval trail`} flush>
        <ExpenseTable
          expenses={filtered}
          sectors={department.sectors}
          onOpen={setDetail}
          actions={(expense) => actionsFor(expense)}
        />
      </SectionCard>

      <MmsTwoCol variant="1-1">
        <SectionCard title="Approval stage summary" subtitle="Where claims are currently waiting">
          <div className="mms-stage-summary">
            {['Under Senior Review', 'Manager Review', 'Finance Review', 'Approved', 'Changes Requested', 'Rejected'].map((status) => (
              <div key={status}>
                <StatusChip status={status} tone={expenseTone(status as MarketingExpense['status'])} />
                <strong>{monthlyExpenses.filter((expense) => expense.status === status).length}</strong>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Spend by category" subtitle="Submitted claims this month">
          <div className="mms-category-bars">
            {[...new Set(monthlyExpenses.map((expense) => expense.category))].map((category) => {
              const categoryTotal = monthlyExpenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0)
              return (
                <div key={category}>
                  <span>{category}</span>
                  <ProgressBar value={(categoryTotal / Math.max(1, monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0))) * 100} size="sm" />
                  <strong>{moneyCompact(categoryTotal)}</strong>
                </div>
              )
            })}
            {!monthlyExpenses.length ? <p className="mms-empty-line">No expenses recorded in this month.</p> : null}
          </div>
        </SectionCard>
      </MmsTwoCol>

      <SectionCard title="Wallet history" subtitle="Monthly allocation, approved spend and remaining balance" icon={<Wallet size={16} />}>
        <div className="mms-table-wrap">
          <table className="mms-table">
            <thead>
              <tr><th>Month</th><th>Allocation</th><th>Spent</th><th>Remaining</th><th>Pending claims</th><th>Utilisation</th></tr>
            </thead>
            <tbody>
              {walletHistory.map((row) => (
                <tr key={row.key}>
                  <td>{new Date(`${row.key}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</td>
                  <td>{moneyCompact(row.allocated)}</td>
                  <td>{moneyCompact(row.monthSpent)}</td>
                  <td className={row.remaining < 0 ? 'mms-danger-text' : ''}>{moneyCompact(row.remaining)}</td>
                  <td>{row.pending}</td>
                  <td><div className="mms-target-cell"><span>{row.allocated ? Math.round((row.monthSpent / row.allocated) * 100) : 0}%</span><MmsProgress value={row.allocated ? Math.min(100, (row.monthSpent / row.allocated) * 100) : 0} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <ExpenseFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      <WalletAllocationModal open={walletOpen} onClose={() => setWalletOpen(false)} month={month} />
      <ExpenseDecisionModal open={Boolean(decision)} expense={decision?.expense ?? null} decision={decision?.decision ?? 'approve'} onClose={() => setDecision(null)} />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="wide"
        title={detail?.title ?? 'Expense'}
        description={detail ? `${detail.employeeName} · ${formatINR(detail.amount)} · ${detail.category}` : undefined}
        footer={<Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail ? (
          <div className="mms-expense-detail">
            <div className="mms-profile-grid">
              <div className="mms-profile-stat"><span>Status</span><strong style={{ fontSize: '0.9rem' }}>{detail.status}</strong><small>Current stage</small></div>
              <div className="mms-profile-stat"><span>Amount</span><strong>{formatINR(detail.amount)}</strong><small>{detail.category}</small></div>
              <div className="mms-profile-stat"><span>Expense date</span><strong style={{ fontSize: '0.9rem' }}>{shortDate(detail.expenseDate)}</strong><small>{detail.receiptName}</small></div>
              <div className="mms-profile-stat"><span>Linked task</span><strong style={{ fontSize: '0.85rem' }}>{detail.taskTitle || 'None'}</strong><small>{detail.sectorId}</small></div>
            </div>
            <div className="mms-detail-block">
              <h3>Justification</h3>
              <p>{detail.description}</p>
              <h3>Approval trail</h3>
              <TimelineList
                items={detail.timeline.map((entry) => ({
                  id: entry.id,
                  at: entry.at,
                  actorName: entry.actorName,
                  actorRole: entry.actorRole,
                  action: entry.action,
                  note: entry.note,
                  tone: entry.tone,
                }))}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ideas                                                               */
/* ------------------------------------------------------------------ */

function WalletAllocationModal({ open, onClose, month }: { open: boolean; onClose: () => void; month: string }) {
  const { employees, allocateWallet } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [monthValue, setMonthValue] = useState(month)
  const [amount, setAmount] = useState(10000)

  useEffect(() => {
    if (!open) return
    const first = employees.find((employee) => employee.role === 'junior' || employee.role === 'senior')
    setEmployeeId(first?.id ?? '')
    setMonthValue(month)
    setAmount(10000)
  }, [open, month, employees])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Allocate monthly wallet"
      description="Set the monthly expense envelope for a team member. Allocation is separate from the amount they have already spent."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!employeeId || !monthValue || amount <= 0}
            onClick={() => {
              allocateWallet(employeeId, monthValue, amount, actor)
              pushToast({ title: 'Wallet allocated', description: `${moneyCompact(amount)} allocated for ${monthValue}.`, tone: 'success' })
              onClose()
            }}
          >
            Save allocation
          </Button>
        </>
      }
    >
      <div className="mms-stack">
        <Field label="Team member">
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            <option value="">Select a team member</option>
            {employees.filter((employee) => employee.role === 'junior' || employee.role === 'senior').map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name} · {employee.role}</option>
            ))}
          </select>
        </Field>
        <Field label="Month">
          <input type="month" value={monthValue} onChange={(event) => setMonthValue(event.target.value)} />
        </Field>
        <Field label="Monthly allocation (₹)">
          <input type="number" min={0} step={1000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </Field>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Ideas                                                               */
/* ------------------------------------------------------------------ */

export function IdeasPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [formOpen, setFormOpen] = useState(false)
  const [review, setReview] = useState<{ idea: MarketingIdea; decision: 'approve' | 'reject' | 'changes' | 'forward' } | null>(null)
  const [detail, setDetail] = useState<MarketingIdea | null>(null)
  const [tab, setTab] = useState('all')

  const ideas = scope.ideas
  const shown =
    tab === 'review'
      ? ideas.filter((idea) => idea.status === 'Under Senior Review' || idea.status === 'Pending Manager Review')
      : tab === 'approved'
        ? ideas.filter((idea) => ['Approved', 'Forwarded to Finance'].includes(idea.status))
        : tab === 'returned'
          ? ideas.filter((idea) => ['Rejected', 'Changes Requested'].includes(idea.status))
          : ideas

  function actions(idea: MarketingIdea) {
    const canSenior = scope.roleId === 'senior' && idea.status === 'Under Senior Review'
    const canManager = scope.roleId === 'manager' && idea.status === 'Pending Manager Review'
    if (!canSenior && !canManager) return null
    return (
      <>
        <Button size="xs" variant="ghost" onClick={() => setReview({ idea, decision: 'reject' })}>Reject</Button>
        <Button size="xs" variant="ghost" onClick={() => setReview({ idea, decision: 'changes' })}>Changes</Button>
        {canManager && idea.estimatedBudget ? (
          <Button size="xs" variant="soft" onClick={() => setReview({ idea, decision: 'forward' })}>Finance</Button>
        ) : null}
        <Button size="xs" variant="primary" onClick={() => setReview({ idea, decision: 'approve' })}>{canSenior ? 'Recommend' : 'Approve'}</Button>
      </>
    )
  }

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'junior' ? 'Junior workspace' : scope.roleId === 'senior' ? 'Senior workspace' : 'Manager workspace'}
        title={scope.roleId === 'junior' ? 'Submit Ideas' : 'Ideas & Recommendations'}
        subtitle={
          scope.roleId === 'junior'
            ? 'Share customer opportunities and campaign ideas with your senior and manager.'
            : 'Review team recommendations, add guidance and forward budgeted ideas to Finance/Admin.'
        }
        actions={<Button variant="primary" icon={<Lightbulb size={15} />} onClick={() => setFormOpen(true)}>Submit idea</Button>}
        meta={
          <div className="mms-header-meta">
            <span><Lightbulb size={13} /> {ideas.length} ideas</span>
            <span><BadgeCheck size={13} /> {ideas.filter((idea) => idea.status === 'Approved').length} approved</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Total ideas" value={ideas.length} icon={<Lightbulb size={18} />} tone="var(--chart-5)" hint="Team recommendations" />
        <KpiCard label="Awaiting review" value={ideas.filter((idea) => ['Under Senior Review', 'Pending Manager Review'].includes(idea.status)).length} icon={<ClipboardCheck size={18} />} tone="var(--chart-4)" hint="Senior or manager action" />
        <KpiCard label="Approved" value={ideas.filter((idea) => idea.status === 'Approved').length} icon={<CheckCircle2 size={18} />} tone="var(--chart-2)" hint="Validated by marketing" />
        <KpiCard label="With Finance" value={ideas.filter((idea) => idea.status === 'Forwarded to Finance').length} icon={<ShieldCheck size={18} />} tone="var(--chart-1)" hint="Budget decision pending" />
      </MmsKpiGrid>

      <div className="mms-toolbar-row">
        <MmsTabs
          value={tab}
          onChange={setTab}
          ariaLabel="Idea filters"
          options={[
            { id: 'all', label: 'All', count: ideas.length },
            { id: 'review', label: 'In review', count: ideas.filter((idea) => ['Under Senior Review', 'Pending Manager Review'].includes(idea.status)).length },
            { id: 'approved', label: 'Approved', count: ideas.filter((idea) => ['Approved', 'Forwarded to Finance'].includes(idea.status)).length },
            { id: 'returned', label: 'Returned', count: ideas.filter((idea) => ['Rejected', 'Changes Requested'].includes(idea.status)).length },
          ]}
        />
      </div>

      <IdeaList ideas={shown} sectors={department.sectors} onOpen={setDetail} actions={actions} />

      <SectionCard title="How ideas move" subtitle="Review path and financial boundary">
        <div className="mms-idea-flow">
          <div><span>1</span><strong>Junior submits</strong><small>Idea, benefit and estimated budget</small></div>
          <ArrowRight size={16} />
          <div><span>2</span><strong>Senior reviews</strong><small>Validates fit and recommends</small></div>
          <ArrowRight size={16} />
          <div><span>3</span><strong>Manager decides</strong><small>Approves or forwards to Finance</small></div>
          <ArrowRight size={16} />
          <div><span>4</span><strong>Finance approves</strong><small>Final budget release only</small></div>
        </div>
      </SectionCard>

      <IdeaFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      <IdeaReviewModal open={Boolean(review)} idea={review?.idea ?? null} decision={review?.decision ?? 'approve'} onClose={() => setReview(null)} />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="wide"
        title={detail?.title ?? 'Idea'}
        description={detail ? `${detail.submittedByName} · ${detail.status}` : undefined}
        footer={
          <div className="mms-modal-footer">
            <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            {detail && actions(detail) ? <div className="mms-modal-footer__actions">{actions(detail)}</div> : null}
          </div>
        }
      >
        {detail ? (
          <div className="mms-idea-detail">
            <div className="mms-sector-detail__head">
              <StatusChip status={detail.status} tone={ideaTone(detail.status)} />
              <SectorChip sector={department.sectors.find((sector) => sector.id === detail.sectorId)} />
              {detail.estimatedBudget ? <Badge tone="info" dot>{formatINR(detail.estimatedBudget)}</Badge> : <Badge tone="neutral" dot>No budget</Badge>}
            </div>
            <div className="mms-detail-block">
              <h3>Description</h3>
              <p>{detail.description}</p>
              <h3>Expected benefit</h3>
              <p>{detail.expectedBenefit || '—'}</p>
              <h3>Supporting details</h3>
              <p>{detail.supportingDetails || '—'}</p>
            </div>
            {detail.managerFeedback || detail.seniorFeedback ? (
              <div className="mms-note-block">
                <span>Review feedback</span>
                <p>{detail.managerFeedback || detail.seniorFeedback}</p>
              </div>
            ) : null}
            <div className="mms-detail-block">
              <h3>Approval trail</h3>
              <TimelineList
                items={detail.timeline.map((entry) => ({
                  id: entry.id,
                  at: entry.at,
                  actorName: entry.actorName,
                  actorRole: entry.actorRole,
                  action: entry.action,
                  note: entry.note,
                  tone: entry.tone,
                }))}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Approval center                                                     */
/* ------------------------------------------------------------------ */

export function ApprovalsPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [tab, setTab] = useState('manager')
  const [createOpen, setCreateOpen] = useState(false)
  const [decision, setDecision] = useState<{ request: MarketingApprovalRequest; decision: 'approve' | 'reject' | 'changes' } | null>(null)
  const [detail, setDetail] = useState<MarketingApprovalRequest | null>(null)

  const requests = department.approvalRequests
  const managerQueue = requests.filter((request) => request.status === 'Pending Manager Review')
  const financeQueue = requests.filter((request) => request.status === 'Pending Finance Approval')
  const approved = requests.filter((request) => request.status === 'Approved')
  const closed = requests.filter((request) => ['Rejected', 'Changes Requested', 'Returned'].includes(request.status))
  const followUpExtensions = department.followUps.flatMap((followUp) =>
    (followUp.extensionRequests ?? [])
      .filter((request) => request.status === 'Pending')
      .map((request) => ({ followUp, request })),
  )
  const taskExtensions = department.tasks.flatMap((task) =>
    (task.extensionRequests ?? [])
      .filter((request) => request.status === 'Pending')
      .map((request) => ({ task, request })),
  )
  const pendingPlans = department.plans.filter((plan) => plan.status === 'Pending Manager Review')
  const pendingTeamRequests = department.teamRequests.filter((request) => request.status === 'Pending')
  const shown =
    tab === 'finance' ? financeQueue : tab === 'approved' ? approved : tab === 'closed' ? closed : managerQueue

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow="Manager workspace"
        title="Approval Center"
        subtitle="Budget, campaign and resource requests move from manager review to Finance/Admin final approval."
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>New request</Button>}
        meta={
          <div className="mms-header-meta">
            <span><BadgeCheck size={13} /> {managerQueue.length} awaiting manager</span>
            <span><ShieldCheck size={13} /> {financeQueue.length} with Finance</span>
            <span><CheckCircle2 size={13} /> {approved.length} approved</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Manager queue" value={managerQueue.length} icon={<BadgeCheck size={18} />} tone="var(--chart-4)" hint="Your decision" />
        <KpiCard label="Finance queue" value={financeQueue.length} icon={<ShieldCheck size={18} />} tone="var(--chart-5)" hint="Final approval outside marketing" />
        <KpiCard label="Approved" value={approved.length} icon={<CheckCircle2 size={18} />} tone="var(--chart-2)" hint="Fully approved requests" />
        <KpiCard label="Returned" value={closed.length} icon={<XCircle size={18} />} tone="var(--chart-7)" hint="Rejected or changes requested" />
      </MmsKpiGrid>

      <div className="mms-inline-notice">
        <ShieldCheck size={15} />
        <div>
          <strong>Finance/Admin owns the final financial decision.</strong>
          <span>Manager approval forwards a request. It cannot be marked finally approved or funded from this workspace.</span>
        </div>
      </div>

      <div className="mms-toolbar-row">
        <MmsTabs
          value={tab}
          onChange={setTab}
          ariaLabel="Approval filters"
          options={[
            { id: 'manager', label: 'Manager queue', count: managerQueue.length },
            { id: 'finance', label: 'Finance queue', count: financeQueue.length },
            { id: 'approved', label: 'Approved', count: approved.length },
            { id: 'closed', label: 'Returned', count: closed.length },
          ]}
        />
      </div>

      <SectionCard
        title="Requests"
        subtitle={tab === 'finance' ? 'Read-only in marketing. Finance/Admin completes this stage.' : 'Review the request, then approve, reject or request changes.'}
        flush
      >
        <ApprovalList
          requests={shown}
          sectors={department.sectors}
          onOpen={setDetail}
          actions={(request) => {
            if (request.stage === 'finance') return <Badge tone="accent" dot>Finance/Admin</Badge>
            if (request.status !== 'Pending Manager Review') return <Button size="xs" variant="ghost" onClick={() => setDetail(request)}>View</Button>
            return (
              <div className="mms-table__actions">
                <Button size="xs" variant="ghost" onClick={() => setDecision({ request, decision: 'reject' })}>Reject</Button>
                <Button size="xs" variant="ghost" onClick={() => setDecision({ request, decision: 'changes' })}>Changes</Button>
                <Button size="xs" variant="primary" onClick={() => setDecision({ request, decision: 'approve' })}>Approve</Button>
              </div>
            )
          }}
        />
      </SectionCard>

      <SectionCard
        title="Execution approvals"
        subtitle="Extension requests from tasks and follow-ups, plus plan and team requests awaiting manager action"
        icon={<BadgeCheck size={16} />}
      >
        <div className="mms-request-list">
          {followUpExtensions.map(({ followUp, request }) => {
            const lead = department.leads.find((item) => item.id === followUp.leadId)
            return (
              <div key={request.id} className="mms-request-row">
                <div>
                  <strong>Follow-up extension · {lead?.name ?? followUp.leadId}</strong>
                  <small>Original {shortDate(followUp.originalDueAt ?? followUp.dueAt)}{request.proposedDueAt ? ` → proposed ${shortDate(request.proposedDueAt)}` : ''} · {request.requestedByName}</small>
                  <p>{request.reason}</p>
                </div>
                <div className="mms-row-actions">
                  <Button size="xs" variant="danger" onClick={() => department.decideFollowUpExtension(followUp.id, request.id, 'reject', scope.actor, 'Extension rejected in Approval Center.')}>Reject</Button>
                  <Button size="xs" variant="primary" onClick={() => department.decideFollowUpExtension(followUp.id, request.id, 'approve', scope.actor, 'Extension approved in Approval Center.')}>Approve</Button>
                </div>
              </div>
            )
          })}
          {taskExtensions.map(({ task, request }) => (
            <div key={request.id} className="mms-request-row">
              <div>
                <strong>Task extension · {task.title}</strong>
                <small>Original {shortDate(task.originalDeadline ?? task.deadline)} → proposed {shortDate(request.proposedDeadline)} · {request.requestedByName}</small>
                <p>{request.reason}</p>
              </div>
              <div className="mms-row-actions">
                <Button size="xs" variant="danger" onClick={() => department.decideTaskExtension(task.id, request.id, 'reject', scope.actor, 'Extension rejected in Approval Center.')}>Reject</Button>
                <Button size="xs" variant="primary" onClick={() => department.decideTaskExtension(task.id, request.id, 'approve', scope.actor, 'Extension approved in Approval Center.')}>Approve</Button>
              </div>
            </div>
          ))}
          {pendingPlans.map((plan) => (
            <div key={plan.id} className="mms-request-row">
              <div>
                <strong>Plan approval · {plan.title}</strong>
                <small>{moneyCompact(plan.budget)} · {plan.sectorId}</small>
                <p>{plan.objective}</p>
              </div>
              <Button size="xs" variant="soft" onClick={() => department.decidePlanManager(plan.id, 'approve', scope.actor, 'Approved from Approval Center.')}>Approve &amp; forward</Button>
            </div>
          ))}
          {pendingTeamRequests.map((request) => (
            <div key={request.id} className="mms-request-row">
              <div>
                <strong>Team request · {request.employeeName}</strong>
                <small>{request.seniorName} · {request.targetLeads} lead target</small>
                <p>{request.reason}</p>
              </div>
              <div className="mms-row-actions">
                <Button size="xs" variant="danger" onClick={() => department.decideTeamRequest(request.id, 'reject', scope.actor, 'Team request rejected.')}>Reject</Button>
                <Button size="xs" variant="primary" onClick={() => department.decideTeamRequest(request.id, 'approve', scope.actor, 'Team request approved.')}>Approve</Button>
              </div>
            </div>
          ))}
          {!followUpExtensions.length && !taskExtensions.length && !pendingPlans.length && !pendingTeamRequests.length ? (
            <p className="mms-empty-line">No execution approvals are pending.</p>
          ) : null}
        </div>
      </SectionCard>

      <MmsTwoCol variant="1-1">
        <SectionCard title="Approval workflow" subtitle="Who owns each stage">
          <div className="mms-approval-flow">
            <div className="is-done"><span>1</span><strong>Marketing submits</strong><small>Budget or proposal request</small></div>
            <div className="is-active"><span>2</span><strong>Manager review</strong><small>Validate need and priority</small></div>
            <div><span>3</span><strong>Finance/Admin</strong><small>Final financial approval</small></div>
          </div>
          <p className="mms-empty-line">Requests at stage 3 are read-only here. Only Finance/Admin can mark them finally approved.</p>
        </SectionCard>
        <SectionCard title="Request mix" subtitle="Current requests by type">
          <div className="mms-stage-summary">
            {['Budget Request', 'Campaign Proposal', 'Resource Request', 'Marketing Proposal'].map((kind) => (
              <div key={kind}>
                <span>{kind}</span>
                <strong>{requests.filter((request) => request.kind === kind).length}</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </MmsTwoCol>

      <ApprovalRequestModal open={createOpen} onClose={() => setCreateOpen(false)} defaultSectorId={scope.mySectors[0]?.id} />
      <ApprovalDecisionModal open={Boolean(decision)} request={decision?.request ?? null} decision={decision?.decision ?? 'approve'} onClose={() => setDecision(null)} />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="wide"
        title={detail?.title ?? 'Approval request'}
        description={detail ? `${detail.kind} · ${detail.submittedByName}` : undefined}
        footer={<Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail ? (
          <div>
            <div className="mms-profile-grid">
              <div className="mms-profile-stat"><span>Status</span><strong style={{ fontSize: '0.9rem' }}>{detail.status}</strong><small>{detail.stage === 'manager' ? 'Manager stage' : detail.stage === 'finance' ? 'Finance/Admin stage' : 'Closed'}</small></div>
              <div className="mms-profile-stat"><span>Requested amount</span><strong>{detail.amount ? formatINR(detail.amount) : 'No spend'}</strong><small>{detail.kind}</small></div>
              <div className="mms-profile-stat"><span>Sector</span><strong style={{ fontSize: '0.9rem' }}>{department.sectors.find((sector) => sector.id === detail.sectorId)?.name ?? 'Department'}</strong><small>Submitting team</small></div>
              <div className="mms-profile-stat"><span>Submitted</span><strong style={{ fontSize: '0.9rem' }}>{shortDate(detail.createdAt)}</strong><small>{detail.submittedByName}</small></div>
            </div>
            <div className="mms-detail-block">
              <h3>Summary</h3>
              <p>{detail.summary}</p>
              <h3>Approval trail</h3>
              <TimelineList
                items={detail.timeline.map((entry) => ({
                  id: entry.id,
                  at: entry.at,
                  actorName: entry.actorName,
                  actorRole: entry.actorRole,
                  action: entry.action,
                  note: entry.note,
                  tone: entry.tone,
                }))}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Daily activities                                                    */
/* ------------------------------------------------------------------ */

export function ActivitiesPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [formOpen, setFormOpen] = useState(false)
  const [range, setRange] = useState<{ preset: 'daily' | 'weekly' | 'monthly' | 'custom'; from: string; to: string }>(() => rangeForPreset('weekly'))
  const [typeFilter, setTypeFilter] = useState('all')

  const scoped = department.activities.filter((activity) =>
    scope.roleId === 'manager'
      ? true
      : scope.roleId === 'senior'
        ? scope.mySectors.some((sector) => sector.id === activity.sectorId)
        : activity.employeeId === scope.actor.id,
  )
  const filtered = scoped
    .filter((activity) => inRange(activity.at, range))
    .filter((activity) => (typeFilter === 'all' ? true : activity.type === typeFilter))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const totalLeads = filtered.reduce((sum, activity) => sum + activity.leadsCaptured, 0)
  const totalMinutes = filtered.reduce((sum, activity) => sum + activity.duration, 0)
  const completed = filtered.filter((activity) => activity.status === 'Completed').length
  const types = [...new Set(scoped.map((activity) => activity.type))]

  function handleRange(next: { preset: 'daily' | 'weekly' | 'monthly' | 'custom'; from: string; to: string }) {
    if (next.preset === 'custom') setRange(next)
    else setRange(rangeForPreset(next.preset))
  }

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'junior' ? 'Junior workspace' : 'Senior workspace'}
        title="Daily Activities"
        subtitle="Field visits, calls, meetings and campaign work logged against the sector plan."
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setFormOpen(true)}>Log activity</Button>}
        meta={
          <div className="mms-header-meta">
            <span><Activity size={13} /> {filtered.length} activities in range</span>
            <span><Target size={13} /> {totalLeads} leads captured</span>
          </div>
        }
      />

      <div className="mms-toolbar-row mms-toolbar-row--wrap">
        <DateRangeTabs preset={range.preset} from={range.from} to={range.to} onChange={handleRange} />
        <MmsSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={types.map((type) => ({ value: type, label: type }))} />
      </div>

      <MmsKpiGrid columns={4}>
        <KpiCard label="Activities" value={filtered.length} icon={<Activity size={18} />} tone="var(--chart-1)" hint={`${completed} completed`} />
        <KpiCard label="Leads captured" value={totalLeads} icon={<Target size={18} />} tone="var(--chart-2)" hint="From field and digital activity" />
        <KpiCard label="Time invested" value={totalMinutes} icon={<CalendarClock size={18} />} tone="var(--chart-3)" format={(value) => `${Math.round(value / 60)}h`} hint={`${totalMinutes} minutes logged`} />
        <KpiCard label="Active days" value={new Set(filtered.map((activity) => activity.at.slice(0, 10))).size} icon={<CheckCircle2 size={18} />} tone="var(--chart-5)" hint="Days with recorded work" />
      </MmsKpiGrid>

      <MmsTwoCol variant="2-1">
        <SectionCard title="Activity log" subtitle={`${filtered.length} records`}>
          <ActivityList activities={filtered} sectors={department.sectors} />
        </SectionCard>
        <div className="mms-stack">
          <SectionCard title="Activity mix" subtitle="What the team is doing">
            <div className="mms-source-list">
              {types.map((type) => {
                const count = filtered.filter((activity) => activity.type === type).length
                return (
                  <div key={type}>
                    <span>{type}</span>
                    <div><ProgressBar value={(count / Math.max(1, filtered.length)) * 100} size="sm" /></div>
                    <strong>{count}</strong>
                  </div>
                )
              })}
            </div>
          </SectionCard>
          <SectionCard title="Activity standards">
            <ul className="mms-rule-list">
              <li><Camera size={14} /> Log customer visits on the same day.</li>
              <li><Target size={14} /> Record leads captured against the activity.</li>
              <li><ClipboardCheck size={14} /> Link campaign participation to the campaign plan.</li>
            </ul>
          </SectionCard>
        </div>
      </MmsTwoCol>

      <ActivityFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
