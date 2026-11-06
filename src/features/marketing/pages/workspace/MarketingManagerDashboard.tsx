import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarRange,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Compass,
  Download,
  FileBarChart,
  FileText,
  Gauge,
  HandCoins,
  Lightbulb,
  Megaphone,
  PencilLine,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { WorkspaceLayout, KpiGrid, SectionHeading, RoleBadge, TaskCard, PerformanceCard, IdeaCard, ExpenseCard, ApprovalStepper, AuditTrail, EmptyBlock, PermissionNote, FinanceGateNote, RecentActivity, QuickActionCard, MetricRow, StatPill, DemoFooter, performanceScore } from '../../components/marketing/workspace/WorkspaceKit'
import { TaskAssignModal, TaskProgressModal, ExpenseReviewModal, DecisionModal } from '../../components/marketing/workspace/WorkspaceModals'
import { KpiCard } from '../../components/marketing/KpiCard'
import { ChartCard, ChartTooltip, LegendItem, PieLegend, Funnel, gridProps, axisProps, useChartAnimation } from '../../components/charts/ChartKit'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Avatar } from '../../components/ui/Avatar'
import { useRoleWorkspace } from '../../context/RoleWorkspaceContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { useToast } from '../../context/ToastContext'
import {
  BUDGET_LINES,
  CONVERSION_FUNNEL,
  DAILY_LEAD_SERIES,
  EMPLOYEE_PERFORMANCE,
  LEAD_LOCATION_SERIES,
  LEAD_SOURCE_SERIES,
  MONTHLY_BUDGET_SERIES,
  MONTHLY_LEAD_SERIES,
  REMAINING_BUDGET,
  STRATEGY_WORKFLOW,
  TEAM_LEAD_COMPARISON,
  TOTAL_BUDGET_SPENT,
  TOTAL_MONTHLY_BUDGET,
  WEEKLY_ACTIVITIES,
} from '../../data/marketing/workspace'
import { seedCampaigns } from '../../data/marketing/campaigns'
import { seedLeads } from '../../data/marketing/leads'
import type { ApprovalStatus, WorkspaceApproval, WorkspaceExpense, WorkspaceIdea, WorkspacePlan, WorkspaceTask } from '../../types/workspace'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../../utils/format'
import { formatDateShort } from '../../utils/format'
import { roleWorkspacePath } from '../../config/roleNavigation'
import { FilterTabs, KpiDetailModal, useCsvExport, type KpiDetail } from './workspaceShared'

const managerTeam = EMPLOYEE_PERFORMANCE

const kpiSparks = {
  budget: MONTHLY_BUDGET_SERIES.map((item) => item.budget),
  spent: MONTHLY_BUDGET_SERIES.map((item) => item.spent),
  leads: MONTHLY_LEAD_SERIES.map((item) => item.leads),
  qualified: MONTHLY_LEAD_SERIES.map((item) => item.qualified),
  conversions: MONTHLY_LEAD_SERIES.map((item) => item.conversions),
  team: managerTeam.map((item) => item.leadsGenerated),
}

type DecisionTarget =
  | { type: 'approval'; record: WorkspaceApproval }
  | { type: 'idea'; record: WorkspaceIdea }
  | null

export function MarketingManagerDashboard({ section = 'dashboard' }: { section?: string }) {
  const navigate = useNavigate()
  const { profile } = useDemoRole()
  const { pushToast } = useToast()
  const exportCsv = useCsvExport()
  const {
    tasks,
    ideas,
    expenses,
    approvals,
    plans,
    leads,
    updateTask,
    updateIdeaStatus,
    updateApprovalStatus,
    updatePlan,
    addApproval,
  } = useRoleWorkspace()
  const chartAnim = useChartAnimation()

  const [kpiDetail, setKpiDetail] = useState<KpiDetail | null>(null)
  const [taskModal, setTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null)
  const [selectedApproval, setSelectedApproval] = useState<WorkspaceApproval | null>(null)
  const [decision, setDecision] = useState<DecisionTarget>(null)
  const [selectedExpense, setSelectedExpense] = useState<WorkspaceExpense | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id ?? '')
  const [planModal, setPlanModal] = useState(false)
  const [budgetModal, setBudgetModal] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const [taskFilter, setTaskFilter] = useState('all')
  const [taskOwner, setTaskOwner] = useState('all')
  const [teamFilter, setTeamFilter] = useState<'all' | 'senior' | 'junior'>('all')
  const [leadPeriod, setLeadPeriod] = useState('monthly')
  const [leadSearch, setLeadSearch] = useState('')
  const [leadStatus, setLeadStatus] = useState('All statuses')
  const [campaignFilter, setCampaignFilter] = useState('All')
  const [approvalTab, setApprovalTab] = useState('pending')
  const [planningStep, setPlanningStep] = useState(0)
  const [reportPeriod, setReportPeriod] = useState('month')

  const totals = useMemo(() => {
    const target = managerTeam.reduce((sum, item) => sum + item.targetLeads, 0)
    const generated = managerTeam.reduce((sum, item) => sum + item.leadsGenerated, 0)
    const qualified = managerTeam.reduce((sum, item) => sum + item.qualifiedLeads, 0)
    const conversions = managerTeam.reduce((sum, item) => sum + item.conversions, 0)
    const averageScore = managerTeam.reduce((sum, item) => sum + performanceScore(item), 0) / managerTeam.length
    return {
      target,
      generated,
      qualified,
      conversions,
      conversionRate: generated ? (conversions / generated) * 100 : 0,
      targetAchievement: target ? (generated / target) * 100 : 0,
      averageScore,
      activeCampaigns: seedCampaigns.filter((campaign) => campaign.status === 'Active').length,
      totalSpent: TOTAL_BUDGET_SPENT,
      remaining: REMAINING_BUDGET,
      utilization: (TOTAL_BUDGET_SPENT / TOTAL_MONTHLY_BUDGET) * 100,
    }
  }, [])

  const pendingApprovals = approvals.filter((item) => item.status === 'Pending Manager Review')
  const pendingIdeas = ideas.filter((item) => item.status === 'Pending Manager Review')
  const pendingExpenses = expenses.filter((item) => item.status === 'Manager Review')
  const financeApprovals = approvals.filter((item) => item.status === 'Pending Finance Approval')
  const pendingCount = pendingApprovals.length + pendingIdeas.length + pendingExpenses.length
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0]
  const selectedEmployeeData = managerTeam.find((member) => member.employeeId === selectedEmployee)
  const selectedCampaignData = seedCampaigns.find((campaign) => campaign.id === selectedCampaign)

  const taskCounts = useMemo(() => {
    const counts: Record<string, { assigned: number; completed: number; pending: number }> = {}
    tasks.forEach((task) => {
      const current = counts[task.assignedToId] ?? { assigned: 0, completed: 0, pending: 0 }
      current.assigned += 1
      if (task.status === 'Completed') current.completed += 1
      else current.pending += 1
      counts[task.assignedToId] = current
    })
    return counts
  }, [tasks])

  const seniorAssigneeIds = managerTeam.filter((member) => member.roleId === 'senior').map((member) => member.employeeId)
  const juniorAssigneeIds = managerTeam.filter((member) => member.roleId === 'junior').map((member) => member.employeeId)

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (taskFilter === 'pending' && task.status === 'Completed') return false
      if (taskFilter === 'completed' && task.status !== 'Completed') return false
      if (taskFilter === 'review' && task.status !== 'Under Review') return false
      if (taskFilter === 'blocked' && !['Blocked', 'Overdue'].includes(task.status)) return false
      if (taskOwner === 'senior' && !seniorAssigneeIds.includes(task.assignedToId)) return false
      if (taskOwner === 'junior' && !juniorAssigneeIds.includes(task.assignedToId)) return false
      if (taskOwner === 'mine' && task.assignedById !== profile.employeeId) return false
      return true
    })
  }, [tasks, taskFilter, taskOwner, profile.employeeId, seniorAssigneeIds, juniorAssigneeIds])

  const filteredTeam = teamFilter === 'all' ? managerTeam : managerTeam.filter((member) => member.roleId === teamFilter)

  const filteredCampaigns = campaignFilter === 'All'
    ? seedCampaigns
    : seedCampaigns.filter((campaign) => campaign.status === campaignFilter)

  const leadChart = leadPeriod === 'daily' ? DAILY_LEAD_SERIES : MONTHLY_LEAD_SERIES
  const filteredLeads = seedLeads
    .filter((lead) => {
      if (leadStatus !== 'All statuses' && lead.status !== leadStatus) return false
      if (!leadSearch.trim()) return true
      const term = leadSearch.toLowerCase()
      return `${lead.name} ${lead.company} ${lead.location} ${lead.assignedTo}`.toLowerCase().includes(term)
    })
    .slice(0, 9)

  const kpiDetails: Record<string, KpiDetail> = {
    budget: {
      label: 'Total Marketing Budget',
      value: formatINR(TOTAL_MONTHLY_BUDGET),
      previous: '₹41.50 L',
      change: '+2.4%',
      description: 'The approved October marketing budget across six spending heads.',
      points: ['Digital marketing is the largest allocation at ₹14.50 L.', 'Budget increased ₹1.00 L over September.', 'This is a local plan figure, not a finance ledger balance.'],
    },
    used: {
      label: 'Budget Utilized',
      value: formatPercent(totals.utilization, 1),
      previous: '68.4%',
      change: '+5.2 pts',
      description: 'Committed spend against the monthly budget. The month is not closed.',
      points: ['₹31.26 L has been committed so far.', 'Digital and lead generation are tracking on plan.', 'Field travel remains the most controlled head at 84.6% used.'],
    },
    remaining: {
      label: 'Remaining Budget',
      value: formatINR(REMAINING_BUDGET),
      previous: '₹13.10 L',
      change: '-8.2%',
      description: 'Uncommitted balance available for the rest of the month.',
      points: ['Digital has ₹4.30 L left.', 'Remaining balance is before any pending finance approvals.', 'Pending proposals are not deducted until approved.'],
    },
    leads: {
      label: 'Total Leads Generated',
      value: formatNumber(totals.generated),
      previous: '1,082',
      change: '+8.1%',
      description: 'Leads generated by the marketing team across digital, field and trade activity.',
      points: ['Ananya Rao leads the team with 214 leads.', '1,170 leads represent 97.5% of the combined individual target.', 'Lead totals are demonstration analytics.'],
    },
    qualified: {
      label: 'Qualified Leads',
      value: formatNumber(totals.qualified),
      previous: '546',
      change: '+6.4%',
      description: 'Leads that meet the agreed qualification standard.',
      points: ['Qualification rate is 49.7%.', 'Bengaluru and Mumbai contribute the largest qualified volume.', 'Finance approval is unrelated to lead qualification.'],
    },
    conversion: {
      label: 'Lead Conversion Rate',
      value: formatPercent(totals.conversionRate, 1),
      previous: '21.2%',
      change: '+1.4 pts',
      description: 'Converted customers divided by total leads generated this month.',
      points: ['265 conversions are recorded in the demonstration data.', 'Conversion is measured at campaign attribution level.', 'Customer conversion remains in the existing ERP lead workflow.'],
    },
    campaigns: {
      label: 'Active Campaigns',
      value: String(totals.activeCampaigns),
      previous: '8',
      change: '+12.5%',
      description: 'Campaigns currently live across digital, retail, field and trade channels.',
      points: ['Three campaigns are in review or planning.', 'Diwali Retail Blitz is the largest active programme.', 'Campaign status is local demo state.'],
    },
    expenses: {
      label: 'Total Marketing Expenses',
      value: formatINR(totals.totalSpent),
      previous: '₹29.84 L',
      change: '+4.8%',
      description: 'Committed campaign and field marketing expenditure for the month.',
      points: ['Includes digital media, retail activation and field travel.', 'Expense claims awaiting approval are excluded until reviewed.', 'No real payment or reimbursement has occurred.'],
    },
    performance: {
      label: 'Team Performance',
      value: formatPercent(totals.averageScore, 1),
      previous: '84.7%',
      change: '+2.8 pts',
      description: 'Composite score across target delivery, lead quality and conversion.',
      points: ['Ananya Rao has the strongest junior performance score.', 'Rohit Menon leads the senior cohort on qualified volume.', 'Scores are calculated from local demo data.'],
    },
    target: {
      label: 'Target Achievement',
      value: formatPercent(totals.targetAchievement, 1),
      previous: '92.3%',
      change: '+5.2 pts',
      description: 'Combined lead target achievement across all marketing executives.',
      points: ['1,170 leads against a combined target of 1,230.', 'The team is 60 leads short of the full monthly target.', 'Targets are demonstration values.'],
    },
  }

  const openKpi = (key: string) => setKpiDetail(kpiDetails[key] ?? null)

  const handleDecision = (value: string, comment: string) => {
    if (!decision) return
    if (decision.type === 'approval') {
      const record = decision.record
      if (value === 'finance') {
        updateApprovalStatus(record.id, 'Pending Finance Approval', 'finance', {
          actor: profile.name,
          role: profile.roleLabel,
          note: comment || 'Marketing approval completed. Forwarded for final financial approval.',
          tone: 'success',
        })
        pushToast({ title: 'Sent for finance review', description: 'Marketing approval is complete. Finance/Admin must still give final financial approval.', tone: 'success' })
      } else if (value === 'reject') {
        updateApprovalStatus(record.id, 'Rejected', 'manager', {
          actor: profile.name,
          role: profile.roleLabel,
          note: comment || 'Rejected by the marketing manager.',
          tone: 'danger',
        })
        pushToast({ title: 'Proposal rejected', description: 'The submitter will see the decision in the local workflow timeline.', tone: 'warning' })
      } else {
        updateApprovalStatus(record.id, 'Changes Requested', 'manager', {
          actor: profile.name,
          role: profile.roleLabel,
          note: comment || 'More information is required before approval.',
          tone: 'warning',
        })
        pushToast({ title: 'Changes requested', description: 'The proposal has been returned for revision.', tone: 'info' })
      }
    } else {
      const record = decision.record
      const status = value === 'approve'
        ? (record.estimatedBudget ? 'Forwarded to Finance' : 'Approved')
        : value === 'reject'
          ? 'Rejected'
          : 'Changes Requested'
      updateIdeaStatus(
        record.id,
        status,
        {
          actor: profile.name,
          role: profile.roleLabel,
          note: comment || (status === 'Forwarded to Finance' ? 'Approved at the marketing stage and forwarded for budget review.' : 'Manager decision recorded.'),
          tone: status === 'Rejected' ? 'danger' : status === 'Changes Requested' ? 'warning' : 'success',
        },
        { managerFeedback: comment || (status === 'Forwarded to Finance' ? 'Approved for budget review. Finance/Admin must give final financial approval.' : 'Reviewed by the marketing manager.') },
      )
      if (status === 'Forwarded to Finance' && record.estimatedBudget) {
        addApproval({
          kind: 'Idea',
          title: `Budget review · ${record.title}`,
          summary: `${record.description} Estimated budget ${formatINR(record.estimatedBudget)} for the proposed pilot.`,
          submittedById: record.submittedById,
          submittedByName: record.submittedByName,
          submittedByLabel: record.submittedByRole === 'manager'
            ? 'Marketing Manager'
            : record.submittedByRole === 'senior'
              ? 'Senior Marketing Executive'
              : 'Junior Marketing Executive',
          amount: record.estimatedBudget,
          status: 'Pending Finance Approval',
          currentStage: 'finance',
          relatedIdeaId: record.id,
        })
      }
      pushToast({
        title: status === 'Forwarded to Finance' ? 'Idea approved for finance review' : `Idea ${status.toLowerCase()}`,
        description: status === 'Forwarded to Finance'
          ? 'The idea is now in the read-only Finance/Admin queue. Final financial approval is still required.'
          : 'The idea timeline has been updated with your local demo decision.',
        tone: status === 'Rejected' ? 'warning' : 'success',
      })
    }
    setDecision(null)
    setSelectedApproval(null)
  }

  const submitPlan = (plan: WorkspacePlan) => {
    updatePlan(plan.id, { status: 'In Review' })
    addApproval({
      kind: 'Budget Request',
      title: `Budget approval · ${plan.title}`,
      summary: `${plan.objective} Requested budget is ${formatINR(plan.totalBudget)} for ${plan.month}.`,
      submittedById: profile.employeeId,
      submittedByName: profile.name,
      submittedByLabel: profile.roleLabel,
      amount: plan.totalBudget,
      status: 'Pending Finance Approval',
      currentStage: 'finance',
    })
    pushToast({ title: 'Plan sent to Finance/Admin', description: 'The marketing plan is in review and its budget is pending final financial approval in this demo.', tone: 'success' })
  }

  const titleMap: Record<string, { title: string; subtitle: string; eyebrow: string }> = {
    dashboard: { title: 'Marketing Command Center', subtitle: 'October 2026 performance, budget position and the decisions that need your attention today.', eyebrow: 'Manager workspace' },
    planning: { title: 'Marketing Planning & Strategy', subtitle: 'Build the monthly strategy, allocate budget and turn the plan into assigned execution.', eyebrow: 'Plan the month' },
    budget: { title: 'Budget Management', subtitle: 'Track allocation, utilisation and proposals across every marketing spending head.', eyebrow: 'Financial planning' },
    leads: { title: 'Lead Analytics', subtitle: 'Understand generation, quality and conversion across employees, campaigns and locations.', eyebrow: 'Pipeline intelligence' },
    campaigns: { title: 'Campaign Performance', subtitle: 'Monitor live campaign delivery, spend efficiency and attributed business outcomes.', eyebrow: 'Execution oversight' },
    team: { title: 'Team Performance', subtitle: 'Compare senior and junior delivery against targets, quality and workload.', eyebrow: 'People performance' },
    tasks: { title: 'Task Assignment', subtitle: 'Create clear marketing assignments and keep delivery visible across the team.', eyebrow: 'Work allocation' },
    approvals: { title: 'Approval Center', subtitle: 'Review marketing proposals, ideas, expenses and budget requests. Finance/Admin remains the final financial approver.', eyebrow: 'Decision queue' },
    reports: { title: 'Marketing Reports', subtitle: 'Prepare leadership-ready performance, campaign and expense reporting from local demo data.', eyebrow: 'Reporting' },
  }
  const page = titleMap[section] ?? titleMap.dashboard
  const decisionAmount = decision?.type === 'approval'
    ? decision.record.amount
    : decision?.type === 'idea'
      ? decision.record.estimatedBudget
      : null

  const headerActions = (
    <>
      <RoleBadge roleId="manager" />
      {section === 'tasks' || section === 'dashboard' ? (
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setTaskModal(true)}>Assign work</Button>
      ) : null}
      {section === 'planning' ? (
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setPlanModal(true)}>New monthly plan</Button>
      ) : null}
      {section === 'budget' ? (
        <Button variant="primary" icon={<HandCoins size={15} />} onClick={() => setBudgetModal(true)}>Prepare budget proposal</Button>
      ) : null}
      {section === 'approvals' ? (
        <Badge tone={pendingCount ? 'warning' : 'success'}>{pendingCount} pending decisions</Badge>
      ) : null}
      {section === 'reports' ? (
        <Button variant="soft" icon={<Download size={15} />} onClick={() => setPreview('management-pack')}>Export management pack</Button>
      ) : null}
    </>
  )

  return (
    <WorkspaceLayout
      roleId="manager"
      section={section}
      title={page.title}
      subtitle={page.subtitle}
      eyebrow={page.eyebrow}
      actions={headerActions}
      meta={
        <>
          <StatPill icon={<Users size={13} />} label="Team" value="7 executives" />
          <StatPill icon={<Megaphone size={13} />} label="Live campaigns" value={totals.activeCampaigns} />
          <StatPill icon={<BadgeCheck size={13} />} label="Pending decisions" value={pendingCount} />
        </>
      }
    >
      {section === 'dashboard' ? (
        <>
          <KpiGrid columns={5}>
            <KpiCard index={0} label="Total Marketing Budget" value={TOTAL_MONTHLY_BUDGET} format={formatINRCompact} icon={<Wallet size={17} />} tone="var(--chart-1)" trend={{ value: 2.4, label: 'vs September · budget increased' }} spark={kpiSparks.budget} hint="₹42.50 L approved · +2.4% vs Sep" onClick={() => openKpi('budget')} />
            <KpiCard index={1} label="Budget Utilized" value={totals.utilization} format={(value) => `${value.toFixed(1)}%`} icon={<Gauge size={17} />} tone="var(--chart-2)" trend={{ value: 5.2, label: 'vs September · 68.4% used' }} spark={kpiSparks.spent} hint="₹31.26 L committed · 73.6% of plan" onClick={() => openKpi('used')} />
            <KpiCard index={2} label="Remaining Budget" value={REMAINING_BUDGET} format={formatINRCompact} icon={<HandCoins size={17} />} tone="var(--chart-3)" trend={{ value: -8.2, label: 'vs September · lower uncommitted balance' }} hint="₹11.24 L available · before pending approvals" onClick={() => openKpi('remaining')} />
            <KpiCard index={3} label="Total Leads Generated" value={totals.generated} format={formatNumber} icon={<Target size={17} />} tone="var(--chart-4)" trend={{ value: 8.1, label: 'vs September · 1,082 leads' }} spark={kpiSparks.leads} hint="1,170 leads · 13 campaigns" onClick={() => openKpi('leads')} />
            <KpiCard index={4} label="Qualified Leads" value={totals.qualified} format={formatNumber} icon={<BadgeCheck size={17} />} tone="var(--chart-5)" trend={{ value: 6.4, label: 'vs September · 546 qualified' }} spark={kpiSparks.qualified} hint="49.7% qualification rate" onClick={() => openKpi('qualified')} />
          </KpiGrid>
          <KpiGrid columns={5}>
            <KpiCard index={5} label="Lead Conversion Rate" value={totals.conversionRate} format={(value) => `${value.toFixed(1)}%`} icon={<TrendingUp size={17} />} tone="var(--chart-6)" trend={{ value: 1.4, label: 'vs September · 21.2%' }} spark={kpiSparks.conversions} hint="265 converted customers · +1.4 pts" onClick={() => openKpi('conversion')} />
            <KpiCard index={6} label="Active Campaigns" value={totals.activeCampaigns} format={formatNumber} icon={<Megaphone size={17} />} tone="var(--chart-7)" trend={{ value: 12.5, label: 'vs September · 8 active' }} hint="9 live across 4 channels" onClick={() => openKpi('campaigns')} />
            <KpiCard index={7} label="Total Marketing Expenses" value={TOTAL_BUDGET_SPENT} format={formatINRCompact} icon={<ReceiptText size={17} />} tone="var(--chart-8)" trend={{ value: 4.8, label: 'vs September · committed spend' }} hint="₹31.26 L committed · finance review separate" onClick={() => openKpi('expenses')} />
            <KpiCard index={8} label="Team Performance" value={totals.averageScore} format={(value) => `${value.toFixed(1)}%`} icon={<UsersRound size={17} />} tone="var(--chart-1)" trend={{ value: 2.8, label: 'vs September · 84.7%' }} spark={kpiSparks.team} hint="7 executives · composite delivery score" onClick={() => openKpi('performance')} />
            <KpiCard index={9} label="Target Achievement" value={totals.targetAchievement} format={(value) => `${value.toFixed(1)}%`} icon={<Target size={17} />} tone="var(--chart-2)" trend={{ value: 5.2, label: 'vs September · 92.3%' }} hint={`${totals.generated} of ${totals.target} combined target`} onClick={() => openKpi('target')} />
          </KpiGrid>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard
              title="Budget vs delivery"
              subtitle="Monthly marketing investment, committed spend and lead generation"
              legend={<><LegendItem color="var(--chart-1)" label="Budget" /><LegendItem color="var(--chart-2)" label="Committed spend" /><LegendItem color="var(--chart-3)" label="Leads" /></>}
              actions={<Badge tone="info" dot={false}>Oct 2026</Badge>}
              height="lg"
            >
              <ComposedChart data={MONTHLY_BUDGET_SERIES}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis yAxisId="left" {...axisProps} tickFormatter={(value: number) => formatINRCompact(value)} width={52} />
                <YAxis yAxisId="right" orientation="right" {...axisProps} tickFormatter={(value: number) => formatNumber(value)} width={42} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => formatNumber(value)} />} />
                <Bar yAxisId="left" dataKey="budget" name="Budget" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={26} isAnimationActive={chartAnim} />
                <Bar yAxisId="left" dataKey="spent" name="Committed spend" fill="var(--chart-2)" radius={[5, 5, 0, 0]} maxBarSize={26} isAnimationActive={chartAnim} />
                <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-3)" strokeWidth={2.4} dot={{ r: 3 }} isAnimationActive={chartAnim} />
              </ComposedChart>
            </ChartCard>

            <ChartCard
              title="Spend allocation"
              subtitle="Where the October budget is committed"
              legend={<PieLegend items={BUDGET_LINES.map((line) => ({ name: line.label, value: line.spent, color: line.tone, display: formatINRCompact(line.spent) }))} />}
              height="lg"
            >
              <PieChart>
                <Pie data={BUDGET_LINES} dataKey="spent" nameKey="label" innerRadius="58%" outerRadius="84%" paddingAngle={2.5} stroke="var(--surface)" strokeWidth={2} isAnimationActive={chartAnim}>
                  {BUDGET_LINES.map((line) => <Cell key={line.id} fill={line.tone} />)}
                </Pie>
                <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} />
              </PieChart>
            </ChartCard>
          </div>

          <div className="ws-grid ws-grid--1-1-1 mt-18">
            <SectionCard title="Lead conversion funnel" subtitle="Campaign to customer conversion this month">
              <Funnel stages={CONVERSION_FUNNEL} />
              <div className="ws-note-strip mt-12"><Target size={13} /> 1,170 leads generated · 581 qualified · 265 converted</div>
            </SectionCard>
            <ChartCard title="Team lead performance" subtitle="Actual against assigned monthly target" height="md">
              <BarChart data={TEAM_LEAD_COMPARISON} layout="vertical" margin={{ left: 4, right: 18 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="name" {...axisProps} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="target" name="Target" fill="var(--chart-8)" radius={[0, 4, 4, 0]} maxBarSize={12} isAnimationActive={chartAnim} />
                <Bar dataKey="actual" name="Actual" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={12} isAnimationActive={chartAnim} />
              </BarChart>
            </ChartCard>
            <SectionCard
              title="Decisions waiting"
              subtitle={`${pendingCount} marketing items need your review`}
              actions={<Button variant="ghost" size="xs" onClick={() => navigate(roleWorkspacePath('approvals'))}>Open center <ArrowRight size={12} /></Button>}
            >
              <div className="ws-stack">
                {pendingApprovals.slice(0, 2).map((item) => (
                  <button type="button" className="ws-decision-mini" key={item.id} onClick={() => setSelectedApproval(item)}>
                    <span className="ws-decision-mini__icon"><FileText size={14} /></span>
                    <span className="grow"><strong>{item.title}</strong><small>{item.kind} · {item.submittedByName}</small></span>
                    <span className="ws-decision-mini__amount">{item.amount ? formatINRCompact(item.amount) : '—'}</span>
                    <ChevronRight size={14} className="faint" />
                  </button>
                ))}
                {pendingIdeas.slice(0, 1).map((item) => (
                  <button type="button" className="ws-decision-mini" key={item.id} onClick={() => setDecision({ type: 'idea', record: item })}>
                    <span className="ws-decision-mini__icon is-idea"><Lightbulb size={14} /></span>
                    <span className="grow"><strong>{item.title}</strong><small>Idea · {item.submittedByName}</small></span>
                    <span className="ws-decision-mini__amount">{item.estimatedBudget ? formatINRCompact(item.estimatedBudget) : 'No budget'}</span>
                    <ChevronRight size={14} className="faint" />
                  </button>
                ))}
                {pendingExpenses.slice(0, 1).map((item) => (
                  <button type="button" className="ws-decision-mini" key={item.id} onClick={() => setSelectedExpense(item)}>
                    <span className="ws-decision-mini__icon is-expense"><ReceiptText size={14} /></span>
                    <span className="grow"><strong>{item.title}</strong><small>Expense · {item.submittedByName}</small></span>
                    <span className="ws-decision-mini__amount">{formatINRCompact(item.amount)}</span>
                    <ChevronRight size={14} className="faint" />
                  </button>
                ))}
                {pendingCount === 0 ? <EmptyBlock title="Inbox clear" description="There are no marketing decisions waiting." icon={<BadgeCheck size={20} />} /> : null}
              </div>
              <PermissionNote role="manager">Manager approval is a marketing decision. Final financial approval always remains with Finance/Admin.</PermissionNote>
            </SectionCard>
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="Planning workflow" subtitle="Strategy through performance analysis" actions={<Button variant="ghost" size="sm" onClick={() => navigate(roleWorkspacePath('planning'))}>Open planning <ArrowRight size={13} /></Button>}>
              <div className="ws-workflow">
                {STRATEGY_WORKFLOW.map((step, index) => (
                  <button type="button" key={step.id} className={`ws-workflow__step is-${step.status.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => { setPlanningStep(index); navigate(roleWorkspacePath('planning')) }}>
                    <span className="ws-workflow__index">{index + 1}</span>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                    <StatusBadge status={step.status} />
                  </button>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Latest activity" subtitle="Local demonstration timeline">
              <RecentActivity items={[
                { id: 'a1', title: 'Festive retargeting proposal submitted', detail: 'Rohit Menon · Senior Executive', at: new Date(Date.now() - 2 * 86400000).toISOString(), tone: 'info' },
                { id: 'a2', title: 'Bengaluru apartment lead drive recommended', detail: 'Ananya Rao → Rohit Menon → Manager', at: new Date(Date.now() - 86400000).toISOString(), tone: 'success' },
                { id: 'a3', title: 'Budget utilisation reached 73.6%', detail: '₹31.26 L of ₹42.50 L committed', at: new Date().toISOString(), tone: 'warning' },
                { id: 'a4', title: 'Finance approval received for print expense', detail: 'Finance/Admin demo record · ₹12,400', at: new Date().toISOString(), tone: 'success' },
              ]} />
            </SectionCard>
          </div>

          <SectionHeading title="Command shortcuts" subtitle="Jump into the work that needs a manager decision." />
          <div className="ws-quick-grid">
            <QuickActionCard title="Plan next month" description="Strategy, audience and expected outcomes" icon={<Compass size={17} />} tone="var(--chart-1)" onClick={() => navigate(roleWorkspacePath('planning'))} />
            <QuickActionCard title="Review budget" description="Allocation, utilisation and proposals" icon={<Wallet size={17} />} tone="var(--chart-2)" onClick={() => navigate(roleWorkspacePath('budget'))} />
            <QuickActionCard title="Assign team work" description="Create an assignment with a result" icon={<ClipboardList size={17} />} tone="var(--chart-3)" onClick={() => setTaskModal(true)} />
            <QuickActionCard title="Clear approvals" description={`${pendingCount} items awaiting marketing review`} icon={<BadgeCheck size={17} />} tone="var(--chart-5)" onClick={() => navigate(roleWorkspacePath('approvals'))} />
          </div>
        </>
      ) : null}

      {section === 'planning' ? (
        <>
          <div className="ws-grid ws-grid--2-1">
            <SectionCard title="Monthly planning workflow" subtitle="Click a stage to focus the plan; every stage is visible and interactive." actions={<Badge tone="info" dot={false}>October plan active</Badge>}>
              <div className="ws-workflow ws-workflow--vertical">
                {STRATEGY_WORKFLOW.map((step, index) => (
                  <button type="button" key={step.id} className={`ws-workflow__row ${planningStep === index ? 'is-selected' : ''} is-${step.status.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setPlanningStep(index)}>
                    <span className="ws-workflow__index">{index + 1}</span>
                    <span className="grow"><strong>{step.label}</strong><small>{step.detail}</small></span>
                    <StatusBadge status={step.status} />
                  </button>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Stage focus" subtitle={STRATEGY_WORKFLOW[planningStep]?.label}>
              <div className="ws-focus-panel">
                <span className="ws-focus-panel__icon"><Target size={18} /></span>
                <h3>{STRATEGY_WORKFLOW[planningStep]?.label}</h3>
                <p>{STRATEGY_WORKFLOW[planningStep]?.detail}</p>
                <div className="ws-focus-panel__meta"><StatusBadge status={STRATEGY_WORKFLOW[planningStep]?.status ?? 'Pending'} /><span>Owner: Meera Iyer</span></div>
                <Button variant="soft" size="sm" icon={<ArrowRight size={13} />} onClick={() => navigate(roleWorkspacePath(planningStep >= 3 ? 'tasks' : 'budget'))}>Go to related work</Button>
              </div>
            </SectionCard>
          </div>

          <SectionHeading title="Marketing plans" subtitle="Build, review and activate monthly plans. Only one plan should be active at a time." actions={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setPlanModal(true)}>New plan</Button>} />
          <div className="ws-plan-grid">
            {plans.map((plan) => (
              <article className={`ws-plan-card ${selectedPlanId === plan.id ? 'is-selected' : ''}`.trim()} key={plan.id}>
                <div className="ws-plan-card__head">
                  <Badge tone={plan.status === 'Active' ? 'success' : plan.status === 'Draft' ? 'neutral' : 'warning'}>{plan.status}</Badge>
                  <span>{plan.month}</span>
                </div>
                <h3>{plan.title}</h3>
                <p className="clamp-2">{plan.objective}</p>
                <div className="ws-plan-card__metrics">
                  <span><strong>{formatINRCompact(plan.totalBudget)}</strong>Budget</span>
                  <span><strong>{formatNumber(plan.expectedLeads)}</strong>Expected leads</span>
                  <span><strong>{formatPercent(plan.expectedConversionRate, 0)}</strong>Conversion</span>
                </div>
                <div className="ws-plan-card__actions">
                  <Button variant="ghost" size="xs" onClick={() => setSelectedPlanId(plan.id)}>View plan</Button>
                  {plan.status === 'Draft' ? <Button variant="soft" size="xs" onClick={() => submitPlan(plan)}>Send for finance review</Button> : null}
                  {plan.status === 'In Review' ? <Button variant="success" size="xs" onClick={() => { updatePlan(plan.id, { status: 'Active' }); pushToast({ title: 'Plan activated', description: 'The plan is now the active local demonstration plan.', tone: 'success' }) }}>Activate</Button> : null}
                </div>
              </article>
            ))}
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title={selectedPlan?.title ?? 'Plan detail'} subtitle={selectedPlan ? `${selectedPlan.month} · ${selectedPlan.owner}` : undefined} actions={selectedPlan ? <Badge tone={selectedPlan.status === 'Active' ? 'success' : 'warning'}>{selectedPlan.status}</Badge> : null}>
              {selectedPlan ? (
                <div className="ws-plan-detail">
                  <div className="ws-detail-grid">
                    <div><span>Target audience</span><strong>{selectedPlan.targetAudience}</strong></div>
                    <div><span>Locations</span><strong>{selectedPlan.locations}</strong></div>
                    <div><span>Digital activities</span><strong>{selectedPlan.digitalActivities}</strong></div>
                    <div><span>Offline activities</span><strong>{selectedPlan.offlineActivities}</strong></div>
                    <div><span>Campaign goals</span><strong>{selectedPlan.campaignGoals}</strong></div>
                    <div><span>Expected outcome</span><strong>{formatNumber(selectedPlan.expectedLeads)} leads · {formatPercent(selectedPlan.expectedConversionRate, 0)} conversion</strong></div>
                  </div>
                  <div className="ws-budget-split">
                    <MetricRow label="Digital" value={selectedPlan.digitalBudget} budget={selectedPlan.totalBudget} />
                    <MetricRow label="Offline" value={selectedPlan.offlineBudget} budget={selectedPlan.totalBudget} />
                    <MetricRow label="Lead generation" value={selectedPlan.leadGenBudget} budget={selectedPlan.totalBudget} />
                  </div>
                </div>
              ) : <EmptyBlock title="No plan selected" description="Create a monthly plan to see the strategy detail here." />}
            </SectionCard>
            <SectionCard title="Weekly activity plan" subtitle="Execution focus for the month">
              <div className="ws-week-list">
                {WEEKLY_ACTIVITIES.map((week) => (
                  <div className="ws-week-row" key={week.id}>
                    <span className="ws-week-row__dot" />
                    <div className="grow"><strong>{week.week}</strong><small>{week.focus} · {week.owner}</small></div>
                    <span className="ws-week-row__stats">{week.activities} activities<br />{week.leads} leads</span>
                    <StatusBadge status={week.status} />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'budget' ? (
        <>
          <KpiGrid columns={4}>
            <KpiCard index={0} label="Total Monthly Budget" value={TOTAL_MONTHLY_BUDGET} format={formatINRCompact} icon={<Wallet size={17} />} tone="var(--chart-1)" trend={{ value: 2.4, label: 'vs September' }} spark={kpiSparks.budget} hint="₹42.50 L approved across six heads" />
            <KpiCard index={1} label="Committed Spend" value={TOTAL_BUDGET_SPENT} format={formatINRCompact} icon={<ReceiptText size={17} />} tone="var(--chart-2)" trend={{ value: 4.8, label: 'vs September' }} spark={kpiSparks.spent} hint="73.6% of the approved plan" />
            <KpiCard index={2} label="Remaining Budget" value={REMAINING_BUDGET} format={formatINRCompact} icon={<HandCoins size={17} />} tone="var(--chart-3)" hint="Available before pending proposals" />
            <KpiCard index={3} label="Budget Utilisation" value={totals.utilization} format={(value) => `${value.toFixed(1)}%`} icon={<Gauge size={17} />} tone="var(--chart-5)" trend={{ value: 5.2, label: 'pts vs September' }} hint="On track for the month" />
          </KpiGrid>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title="Budget vs committed spend" subtitle="Oct 2026 · six spending heads" height="lg" legend={<><LegendItem color="var(--chart-1)" label="Budget" /><LegendItem color="var(--chart-2)" label="Committed" /><LegendItem color="var(--chart-3)" label="Remaining" /></>}>
              <BarChart data={BUDGET_LINES.map((line) => ({ label: line.label.replace(' Marketing', '').replace(' & Field Expenses', ' & Field'), budget: line.budget, spent: line.spent, remaining: Math.max(0, line.budget - line.spent) }))} margin={{ bottom: 12 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis {...axisProps} tickFormatter={(value: number) => formatINRCompact(value)} width={54} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} />
                <Bar dataKey="budget" name="Budget" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={chartAnim} />
                <Bar dataKey="spent" name="Committed" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={chartAnim} />
                <Bar dataKey="remaining" name="Remaining" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={chartAnim} />
              </BarChart>
            </ChartCard>
            <ChartCard title="Allocation mix" subtitle="Share of committed spend" height="lg" legend={<PieLegend items={BUDGET_LINES.map((line) => ({ name: line.label, value: line.spent, color: line.tone, display: formatINRCompact(line.spent) }))} />}>
              <PieChart>
                <Pie data={BUDGET_LINES} dataKey="spent" nameKey="label" innerRadius="55%" outerRadius="82%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={chartAnim}>
                  {BUDGET_LINES.map((line) => <Cell key={line.id} fill={line.tone} />)}
                </Pie>
                <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINR(value)} />} />
              </PieChart>
            </ChartCard>
          </div>

          <div className="ws-grid ws-grid--1-1 mt-18">
            <SectionCard title="Head-wise utilisation" subtitle="Committed against approved budget">
              <div className="ws-budget-list">
                {BUDGET_LINES.map((line) => <MetricRow key={line.id} label={line.label} value={line.spent} budget={line.budget} />)}
              </div>
            </SectionCard>
            <SectionCard title="Monthly expenditure trend" subtitle="Budget, spend and lead generation" actions={<Button variant="ghost" size="xs" onClick={() => setBudgetModal(true)}>Raise proposal</Button>}>
              <div className="ws-mini-chart chart-wrap chart-wrap--md">
                <BarChart data={MONTHLY_BUDGET_SERIES}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={(value: number) => formatINRCompact(value)} width={52} />
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => formatINRCompact(value)} />} />
                  <Bar dataKey="spent" name="Committed" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={chartAnim} />
                </BarChart>
              </div>
              <div className="callout callout--info mt-12"><ShieldCheck size={14} /><span>Budget proposals are routed to Finance/Admin for final approval. Manager approval alone does not release funds.</span></div>
            </SectionCard>
          </div>

          <SectionCard title="Budget requests in the workflow" subtitle="Marketing-approved items still waiting for Finance/Admin" className="mt-18">
            {financeApprovals.length ? (
              <div className="ws-table-wrap">
                <table className="table">
                  <thead><tr><th>Request</th><th>Submitted by</th><th>Amount</th><th>Stage</th><th>Updated</th><th /></tr></thead>
                  <tbody>
                    {financeApprovals.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.title}</strong><small>{item.kind}</small></td>
                        <td>{item.submittedByName}</td>
                        <td className="mono">{item.amount ? formatINR(item.amount) : '—'}</td>
                        <td><Badge tone="warning">Finance/Admin review</Badge></td>
                        <td>{formatDateShort(item.updatedAt)}</td>
                        <td><Button variant="ghost" size="xs" onClick={() => setSelectedApproval(item)}>View</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyBlock title="No finance-stage requests" description="Marketing-approved budget requests will appear here while Finance/Admin completes final approval." icon={<HandCoins size={20} />} />}
          </SectionCard>
          <DemoFooter />
        </>
      ) : null}

      {section === 'leads' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Lead analytics period" value={leadPeriod} onChange={setLeadPeriod} options={[{ id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' }, { id: 'monthly', label: 'Monthly' }]} />
            <div className="ws-toolbar-actions">
              <Badge tone="info" dot={false}>Oct 01–31, 2026</Badge>
              <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => exportCsv('marketing-lead-analytics', [
                { header: 'Employee', value: (row) => row.name },
                { header: 'Target', value: (row) => row.targetLeads },
                { header: 'Generated', value: (row) => row.leadsGenerated },
                { header: 'Qualified', value: (row) => row.qualifiedLeads },
                { header: 'Conversions', value: (row) => row.conversions },
              ], managerTeam)}>Export report</Button>
            </div>
          </div>

          <KpiGrid columns={4}>
            <KpiCard index={0} label="Leads this month" value={totals.generated} format={formatNumber} icon={<Target size={17} />} tone="var(--chart-1)" trend={{ value: 8.1, label: 'vs September' }} spark={kpiSparks.leads} hint="1,170 generated · 3,442 follow-ups" />
            <KpiCard index={1} label="Qualified rate" value={(totals.qualified / totals.generated) * 100} format={(value) => `${value.toFixed(1)}%`} icon={<BadgeCheck size={17} />} tone="var(--chart-2)" trend={{ value: 1.2, label: 'pts vs September' }} spark={kpiSparks.qualified} hint="581 qualified from 1,170 leads" />
            <KpiCard index={2} label="Converted customers" value={totals.conversions} format={formatNumber} icon={<TrendingUp size={17} />} tone="var(--chart-3)" trend={{ value: 4.7, label: 'vs September' }} spark={kpiSparks.conversions} hint="22.6% conversion from generated leads" />
            <KpiCard index={3} label="Rejected / lost" value={186} format={formatNumber} icon={<CircleAlert size={17} />} tone="var(--chart-4)" trend={{ value: -3.1, label: 'lower than September', positiveIsGood: false }} hint="15.9% of generated leads" />
          </KpiGrid>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title={`${leadPeriod === 'daily' ? 'Daily' : leadPeriod === 'weekly' ? 'Weekly' : 'Monthly'} lead generation`} subtitle="Generated and qualified leads" height="lg" legend={<><LegendItem color="var(--chart-1)" label="Generated" /><LegendItem color="var(--chart-2)" label="Qualified" /></>}>
              {leadPeriod === 'daily' ? (
                <AreaChart data={DAILY_LEAD_SERIES}>
                  <defs>
                    <linearGradient id="mgr-lead-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="leads" name="Generated" stroke="var(--chart-1)" fill="url(#mgr-lead-area)" strokeWidth={2.2} isAnimationActive={chartAnim} />
                  <Line type="monotone" dataKey="qualified" name="Qualified" stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={chartAnim} />
                </AreaChart>
              ) : (
                <ComposedChart data={MONTHLY_LEAD_SERIES}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} width={38} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="leads" name="Generated" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={32} isAnimationActive={chartAnim} />
                  <Bar dataKey="qualified" name="Qualified" fill="var(--chart-2)" radius={[5, 5, 0, 0]} maxBarSize={32} isAnimationActive={chartAnim} />
                  <Line type="monotone" dataKey="conversions" name="Converted" stroke="var(--chart-3)" strokeWidth={2.2} dot={{ r: 3 }} isAnimationActive={chartAnim} />
                </ComposedChart>
              )}
            </ChartCard>
            <ChartCard title="Leads by location" subtitle="Top six markets this month" height="lg">
              <BarChart data={LEAD_LOCATION_SERIES} layout="vertical" margin={{ left: 2, right: 16 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="label" {...axisProps} width={66} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Leads" fill="var(--chart-1)" radius={[0, 5, 5, 0]} maxBarSize={16} isAnimationActive={chartAnim} />
              </BarChart>
            </ChartCard>
          </div>

          <div className="ws-grid ws-grid--1-1-1 mt-18">
            <ChartCard title="Lead sources" subtitle="Share of generated leads" height="md" legend={<PieLegend items={LEAD_SOURCE_SERIES.map((item) => ({ name: item.label, value: item.value, color: item.color }))} />}>
              <PieChart><Pie data={LEAD_SOURCE_SERIES} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="82%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={chartAnim}>{LEAD_SOURCE_SERIES.map((item) => <Cell key={item.label} fill={item.color} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart>
            </ChartCard>
            <SectionCard title="Conversion funnel" subtitle="Campaign to customer">
              <Funnel stages={CONVERSION_FUNNEL} compact />
            </SectionCard>
            <SectionCard title="Employee leaderboard" subtitle="Qualified leads and conversion">
              <div className="ws-leaderboard">
                {[...managerTeam].sort((a, b) => b.qualifiedLeads - a.qualifiedLeads).slice(0, 6).map((member, index) => (
                  <button type="button" className="ws-leaderboard__row" key={member.employeeId} onClick={() => setSelectedEmployee(member.employeeId)}>
                    <span className="ws-leaderboard__rank">{index + 1}</span>
                    <Avatar name={member.name} size="sm" />
                    <span className="grow"><strong>{member.name}</strong><small>{member.roleId === 'senior' ? 'Senior' : 'Junior'} · {member.location}</small></span>
                    <span className="ws-leaderboard__value">{member.qualifiedLeads}<small>qualified</small></span>
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Recent lead activity" subtitle="A sample of leads across employees and sources" className="mt-18" actions={<Button variant="ghost" size="xs" onClick={() => navigate('/marketing/leads/lead-tracking')}>Open full lead module <ArrowRight size={12} /></Button>}>
            <div className="ws-inline-toolbar muted-toolbar">
              <input className="input ws-search" placeholder="Search name, company, location or owner" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} aria-label="Search leads" />
              <select className="select ws-status-select" value={leadStatus} onChange={(event) => setLeadStatus(event.target.value)} aria-label="Filter lead status">
                {['All statuses', 'New', 'Contacted', 'Interested', 'Qualified', 'Converted', 'Rejected'].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div className="ws-table-wrap">
              <table className="table">
                <thead><tr><th>Lead</th><th>Source</th><th>Owner</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td><strong>{lead.name}</strong><small>{lead.company} · {lead.location}</small></td>
                      <td>{lead.source}</td>
                      <td>{lead.assignedTo}</td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td>{formatDateShort(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredLeads.length ? <EmptyBlock title="No leads match" description="Try a different search term or status filter." icon={<Target size={20} />} /> : null}
            </div>
          </SectionCard>
          <DemoFooter />
        </>
      ) : null}

      {section === 'campaigns' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Campaign status" value={campaignFilter} onChange={setCampaignFilter} options={[
              { id: 'All', label: 'All', count: seedCampaigns.length },
              { id: 'Active', label: 'Active', count: seedCampaigns.filter((item) => item.status === 'Active').length },
              { id: 'Planned', label: 'Planned', count: seedCampaigns.filter((item) => item.status === 'Planned').length },
              { id: 'Completed', label: 'Completed', count: seedCampaigns.filter((item) => item.status === 'Completed').length },
            ]} />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setPlanModal(true) }}>Propose campaign</Button>
          </div>

          <KpiGrid columns={4}>
            <KpiCard index={0} label="Campaign investment" value={seedCampaigns.reduce((sum, item) => sum + item.budget, 0)} format={formatINRCompact} icon={<Wallet size={17} />} tone="var(--chart-1)" hint="Across all demo campaigns" />
            <KpiCard index={1} label="Attributed leads" value={seedCampaigns.reduce((sum, item) => sum + item.kpis.leads, 0)} format={formatNumber} icon={<Target size={17} />} tone="var(--chart-2)" hint="Campaign-attributed leads" />
            <KpiCard index={2} label="Average CPL" value={seedCampaigns.reduce((sum, item) => sum + item.spend, 0) / Math.max(1, seedCampaigns.reduce((sum, item) => sum + item.kpis.leads, 0))} format={(value) => formatINR(Math.round(value))} icon={<HandCoins size={17} />} tone="var(--chart-3)" trend={{ value: -6.2, label: 'lower cost per lead', positiveIsGood: false }} hint="Committed spend ÷ attributed leads" />
            <KpiCard index={3} label="Attributed revenue" value={seedCampaigns.reduce((sum, item) => sum + item.kpis.revenue, 0)} format={formatINRCompact} icon={<TrendingUp size={17} />} tone="var(--chart-5)" trend={{ value: 9.4, label: 'vs September' }} hint="Demonstration campaign revenue" />
          </KpiGrid>

          <ChartCard title="Campaign efficiency" subtitle="Spend against attributed leads" className="mt-18" height="lg" legend={<><LegendItem color="var(--chart-1)" label="Spend" /><LegendItem color="var(--chart-2)" label="Leads" /><LegendItem color="var(--chart-4)" label="Qualified" /></>}>
            <ComposedChart data={seedCampaigns.map((item) => ({ name: item.name.length > 18 ? `${item.name.slice(0, 17)}…` : item.name, spend: item.spend, leads: item.kpis.leads, qualified: item.kpis.qualifiedLeads }))} margin={{ bottom: 16 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} interval={0} angle={-14} textAnchor="end" height={55} />
              <YAxis yAxisId="left" {...axisProps} tickFormatter={(value: number) => formatINRCompact(value)} width={50} />
              <YAxis yAxisId="right" orientation="right" {...axisProps} width={34} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => formatNumber(value)} />} />
              <Bar yAxisId="left" dataKey="spend" name="Spend" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={chartAnim} />
              <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={chartAnim} />
              <Line yAxisId="right" type="monotone" dataKey="qualified" name="Qualified" stroke="var(--chart-4)" strokeWidth={2} dot={false} isAnimationActive={chartAnim} />
            </ComposedChart>
          </ChartCard>

          <div className="ws-campaign-grid mt-18">
            {filteredCampaigns.map((campaign) => {
              const utilisation = campaign.budget ? (campaign.spend / campaign.budget) * 100 : 0
              return (
                <button type="button" className="ws-campaign-card" key={campaign.id} onClick={() => setSelectedCampaign(campaign.id)}>
                  <div className="ws-campaign-card__head">
                    <Badge tone={campaign.status === 'Active' ? 'success' : campaign.status === 'Completed' ? 'neutral' : 'warning'}>{campaign.status}</Badge>
                    <span>{campaign.channel}</span>
                  </div>
                  <h3>{campaign.name}</h3>
                  <p className="clamp-2">{campaign.objective}</p>
                  <div className="ws-campaign-card__metrics">
                    <span><strong>{formatINRCompact(campaign.spend)}</strong>Spend</span>
                    <span><strong>{campaign.kpis.leads}</strong>Leads</span>
                    <span><strong>{campaign.kpis.qualifiedLeads}</strong>Qualified</span>
                    <span><strong>{formatPercent(campaign.kpis.leads ? (campaign.kpis.conversions / campaign.kpis.leads) * 100 : 0, 0)}</strong>Conversion</span>
                  </div>
                  <ProgressBar value={utilisation} tone={utilisation >= 90 ? 'warning' : 'brand'} size="sm" />
                  <div className="between ws-campaign-card__foot"><span>{formatPercent(utilisation, 0)} of budget used</span><span>Owner: {campaign.owner}</span></div>
                </button>
              )
            })}
          </div>
          {!filteredCampaigns.length ? <EmptyBlock title="No campaigns in this view" description="Switch the status filter to see other campaigns." icon={<Megaphone size={20} />} /> : null}
          <DemoFooter />
        </>
      ) : null}

      {section === 'team' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Team cohort" value={teamFilter} onChange={(value) => setTeamFilter(value as typeof teamFilter)} options={[{ id: 'all', label: 'Everyone', count: managerTeam.length }, { id: 'senior', label: 'Senior executives', count: managerTeam.filter((item) => item.roleId === 'senior').length }, { id: 'junior', label: 'Junior executives', count: managerTeam.filter((item) => item.roleId === 'junior').length }]} />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setTaskModal(true)}>Assign work</Button>
          </div>

          <div className="ws-summary-strip">
            <StatPill icon={<Users size={14} />} label="Team members" value={managerTeam.length} />
            <StatPill icon={<Target size={14} />} label="Combined target" value={formatNumber(totals.target)} />
            <StatPill icon={<Check size={14} />} label="Leads delivered" value={formatNumber(totals.generated)} />
            <StatPill icon={<TrendingUp size={14} />} label="Avg. performance" value={`${totals.averageScore.toFixed(1)}%`} />
            <StatPill icon={<ClipboardList size={14} />} label="Open tasks" value={tasks.filter((task) => task.status !== 'Completed').length} />
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title="Target vs delivery" subtitle="Leads, qualified leads and conversion by employee" height="lg" legend={<><LegendItem color="var(--chart-1)" label="Target" /><LegendItem color="var(--chart-2)" label="Generated" /><LegendItem color="var(--chart-3)" label="Qualified" /></>}>
              <BarChart data={TEAM_LEAD_COMPARISON}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={38} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="target" name="Target" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={chartAnim} />
                <Bar dataKey="actual" name="Generated" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={chartAnim} />
                <Bar dataKey="qualified" name="Qualified" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={chartAnim} />
              </BarChart>
            </ChartCard>
            <SectionCard title="Team delivery" subtitle="Task completion by cohort">
              <div className="ws-cohort-list">
                {['senior', 'junior'].map((role) => {
                  const members = managerTeam.filter((member) => member.roleId === role)
                  const memberTasks = tasks.filter((task) => members.some((member) => member.employeeId === task.assignedToId))
                  const completed = memberTasks.filter((task) => task.status === 'Completed').length
                  return (
                    <div className="ws-cohort-row" key={role}>
                      <span className={`ws-cohort-row__icon is-${role}`}>{role === 'senior' ? <UsersRound size={15} /> : <Users size={15} />}</span>
                      <div className="grow"><strong>{role === 'senior' ? 'Senior executives' : 'Junior executives'}</strong><small>{members.length} employees · {memberTasks.length} tasks</small></div>
                      <div className="ws-cohort-row__bar"><ProgressBar value={memberTasks.length ? (completed / memberTasks.length) * 100 : 0} tone="brand" size="sm" /></div>
                      <strong>{memberTasks.length ? Math.round((completed / memberTasks.length) * 100) : 0}%</strong>
                    </div>
                  )
                })}
              </div>
              <div className="callout callout--info mt-12"><Users size={14} /><span>Every employee card opens a detailed individual performance view.</span></div>
            </SectionCard>
          </div>

          <SectionHeading title="Individual performance" subtitle="Assigned tasks, leads, follow-ups, campaign participation and expense activity." />
          <div className="ws-perf-grid">
            {filteredTeam.map((member) => {
              const counts = taskCounts[member.employeeId] ?? { assigned: 0, completed: 0, pending: 0 }
              return <PerformanceCard key={member.employeeId} employee={member} assignedTasks={counts.assigned} completedTasks={counts.completed} pendingTasks={counts.pending} onClick={() => setSelectedEmployee(member.employeeId)} />
            })}
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'tasks' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Task status" value={taskFilter} onChange={setTaskFilter} options={[
              { id: 'all', label: 'All tasks', count: tasks.length },
              { id: 'pending', label: 'Open', count: tasks.filter((task) => task.status !== 'Completed').length },
              { id: 'review', label: 'Under review', count: tasks.filter((task) => task.status === 'Under Review').length },
              { id: 'blocked', label: 'Needs attention', count: tasks.filter((task) => ['Blocked', 'Overdue'].includes(task.status)).length },
              { id: 'completed', label: 'Completed', count: tasks.filter((task) => task.status === 'Completed').length },
            ]} />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setTaskModal(true)}>Create assignment</Button>
          </div>
          <div className="ws-inline-toolbar muted-toolbar">
            <select className="select ws-status-select" value={taskOwner} onChange={(event) => setTaskOwner(event.target.value)} aria-label="Filter by assignee group">
              <option value="all">All assignees</option>
              <option value="senior">Assigned to seniors</option>
              <option value="junior">Assigned to juniors</option>
              <option value="mine">Assigned by me</option>
            </select>
            <span className="text-xs muted">{filteredTasks.length} assignments in this view</span>
          </div>
          <div className="ws-task-grid">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={() => setSelectedTask(task)}
                actions={
                  <>
                    <Button variant="ghost" size="xs" onClick={() => setSelectedTask(task)}>Review</Button>
                    {task.status !== 'Completed' ? <Button variant="soft" size="xs" onClick={() => updateTask(task.id, { status: 'Completed', progress: 100 })}>Mark complete</Button> : null}
                  </>
                }
              />
            ))}
          </div>
          {!filteredTasks.length ? <EmptyBlock title="No tasks in this view" description="Change the status or assignee filter, or create a new assignment." icon={<ClipboardList size={20} />} action={<Button variant="primary" size="sm" onClick={() => setTaskModal(true)}>Create assignment</Button>} /> : null}
          <DemoFooter />
        </>
      ) : null}

      {section === 'approvals' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Approval queue" value={approvalTab} onChange={setApprovalTab} options={[
              { id: 'pending', label: 'Needs my review', count: pendingCount },
              { id: 'proposals', label: 'Proposals', count: pendingApprovals.length },
              { id: 'ideas', label: 'Ideas', count: pendingIdeas.length },
              { id: 'expenses', label: 'Expenses', count: pendingExpenses.length },
              { id: 'finance', label: 'With Finance/Admin', count: financeApprovals.length },
            ]} />
            <Badge tone={pendingCount ? 'warning' : 'success'}>{pendingCount ? `${pendingCount} actions required` : 'Queue clear'}</Badge>
          </div>

          <div className="ws-approval-summary">
            <StatPill icon={<FileText size={14} />} label="Campaign & budget proposals" value={pendingApprovals.length} />
            <StatPill icon={<Lightbulb size={14} />} label="Ideas awaiting manager" value={pendingIdeas.length} />
            <StatPill icon={<ReceiptText size={14} />} label="Expense claims" value={pendingExpenses.length} />
            <StatPill icon={<ShieldCheck size={14} />} label="With Finance/Admin" value={financeApprovals.length} />
          </div>

          {approvalTab === 'pending' || approvalTab === 'proposals' ? (
            <SectionHeading title="Marketing proposals" subtitle="Campaign, lead generation and budget requests. Review the business case before forwarding." />
          ) : null}
          {(approvalTab === 'pending' || approvalTab === 'proposals') && pendingApprovals.length ? (
            <div className="ws-approval-grid">
              {pendingApprovals.map((item) => (
                <article className="ws-approval-card" key={item.id}>
                  <div className="ws-approval-card__head"><Badge tone="warning">{item.kind}</Badge><span>{formatDateShort(item.updatedAt)}</span></div>
                  <h3>{item.title}</h3>
                  <p className="clamp-2">{item.summary}</p>
                  <div className="ws-approval-card__meta"><span>By {item.submittedByName}</span><strong>{item.amount ? formatINR(item.amount) : 'No amount'}</strong></div>
                  <ApprovalStepper currentStage={item.currentStage} status={item.status} compact />
                  <div className="ws-card-actions">
                    <Button variant="ghost" size="xs" onClick={() => setSelectedApproval(item)}>Review details</Button>
                    <Button variant="soft" size="xs" onClick={() => setDecision({ type: 'approval', record: item })}>Decide</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {approvalTab === 'pending' || approvalTab === 'ideas' ? (
            <>
              <SectionHeading title="Ideas awaiting your review" subtitle="Junior ideas arrive through their senior; senior recommendations come directly to you." />
              <div className="ws-idea-grid">
                {pendingIdeas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} actions={<><Button variant="ghost" size="xs" onClick={() => setDecision({ type: 'idea', record: idea })}>Review</Button><Button variant="soft" size="xs" onClick={() => setDecision({ type: 'idea', record: idea })}>Decide</Button></>} />
                ))}
              </div>
              {!pendingIdeas.length ? <EmptyBlock title="No ideas waiting" description="New junior and senior ideas will appear here for review." icon={<Lightbulb size={20} />} /> : null}
            </>
          ) : null}

          {approvalTab === 'pending' || approvalTab === 'expenses' ? (
            <>
              <SectionHeading title="Expense approvals" subtitle="These claims have completed senior review and require a manager marketing decision." />
              <div className="ws-expense-grid">
                {pendingExpenses.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} onClick={() => setSelectedExpense(expense)} actions={<Button variant="soft" size="xs" onClick={() => setSelectedExpense(expense)}>Review expense</Button>} />
                ))}
              </div>
              {!pendingExpenses.length ? <EmptyBlock title="No expense claims in manager review" description="Senior executives forward reviewed junior claims here." icon={<ReceiptText size={20} />} /> : null}
            </>
          ) : null}

          {approvalTab === 'finance' ? (
            <>
              <SectionHeading title="Finance/Admin queue" subtitle="Marketing approval is complete. These items are read-only in the marketing workspace." />
              {financeApprovals.length ? (
                <div className="ws-table-wrap">
                  <table className="table">
                    <thead><tr><th>Request</th><th>Submitted by</th><th>Amount</th><th>Status</th><th>Updated</th></tr></thead>
                    <tbody>
                      {financeApprovals.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.title}</strong><small>{item.kind}</small></td>
                          <td>{item.submittedByName}</td>
                          <td className="mono">{item.amount ? formatINR(item.amount) : '—'}</td>
                          <td><Badge tone="warning">Awaiting final financial approval</Badge></td>
                          <td>{formatDateShort(item.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyBlock title="Nothing with Finance/Admin" description="Items you approve for finance will wait here for the final financial decision." icon={<ShieldCheck size={20} />} />}
              <FinanceGateNote />
            </>
          ) : null}

          <PermissionNote role="manager">You can approve marketing proposals and forward financial requests. You cannot give final financial approval or release payment.</PermissionNote>
          <DemoFooter />
        </>
      ) : null}

      {section === 'reports' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Report period" value={reportPeriod} onChange={setReportPeriod} options={[{ id: 'week', label: 'This week' }, { id: 'month', label: 'This month' }, { id: 'quarter', label: 'This quarter' }]} />
            <div className="ws-toolbar-actions"><Badge tone="info" dot={false}>{reportPeriod === 'week' ? 'Oct 25–31, 2026' : reportPeriod === 'quarter' ? 'Aug–Oct 2026' : 'Oct 01–31, 2026'}</Badge><Button variant="soft" size="sm" icon={<Download size={14} />} onClick={() => setPreview('management-pack')}>Export pack</Button></div>
          </div>

          <div className="ws-report-grid">
            {[
              { id: 'daily', title: 'Daily marketing summary', detail: 'Leads, tasks, activities and escalations', icon: <CalendarRange size={18} />, tone: 'var(--chart-1)' },
              { id: 'weekly', title: 'Weekly performance report', detail: 'Team delivery, target progress and approvals', icon: <BarChart3 size={18} />, tone: 'var(--chart-2)' },
              { id: 'lead', title: 'Lead generation report', detail: 'Employee, campaign, location and source analysis', icon: <Target size={18} />, tone: 'var(--chart-3)' },
              { id: 'campaign', title: 'Campaign performance report', detail: 'Spend, leads, qualification and conversion', icon: <Megaphone size={18} />, tone: 'var(--chart-5)' },
              { id: 'expense', title: 'Expense & budget report', detail: 'Allocation, claims and finance-stage status', icon: <ReceiptText size={18} />, tone: 'var(--chart-6)' },
              { id: 'management', title: 'Management performance pack', detail: 'One-page leadership summary of the month', icon: <FileBarChart size={18} />, tone: 'var(--chart-7)' },
            ].map((report) => (
              <article className="ws-report-card" key={report.id}>
                <span className="ws-report-card__icon" style={{ background: report.tone }}>{report.icon}</span>
                <div className="grow"><h3>{report.title}</h3><p>{report.detail}</p><small>Updated today · local demo data</small></div>
                <div className="ws-report-card__actions">
                  <Button variant="ghost" size="xs" onClick={() => setPreview(report.id)}>Preview</Button>
                  <Button variant="soft" size="xs" icon={<Download size={12} />} onClick={() => {
                    if (report.id === 'lead') {
                      exportCsv('manager-lead-report', [{ header: 'Employee', value: (row) => row.name }, { header: 'Leads', value: (row) => row.leadsGenerated }, { header: 'Qualified', value: (row) => row.qualifiedLeads }], managerTeam)
                    } else {
                      exportCsv(`manager-${report.id}-report`, [{ header: 'Metric', value: (row) => row.metric }, { header: 'Value', value: (row) => row.value }], [
                        { metric: 'Total budget', value: formatINR(TOTAL_MONTHLY_BUDGET) },
                        { metric: 'Committed spend', value: formatINR(TOTAL_BUDGET_SPENT) },
                        { metric: 'Leads generated', value: totals.generated },
                        { metric: 'Qualified leads', value: totals.qualified },
                        { metric: 'Conversions', value: totals.conversions },
                        { metric: 'Pending manager decisions', value: pendingCount },
                      ])
                    }
                  }}>CSV</Button>
                </div>
              </article>
            ))}
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title="Lead and conversion trend" subtitle="Six-month view for leadership reporting" height="lg" legend={<><LegendItem color="var(--chart-1)" label="Leads" /><LegendItem color="var(--chart-2)" label="Qualified" /><LegendItem color="var(--chart-3)" label="Converted" /></>}>
              <AreaChart data={MONTHLY_LEAD_SERIES}>
                <defs><linearGradient id="mgr-report-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.24} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid {...gridProps} /><XAxis dataKey="month" {...axisProps} /><YAxis {...axisProps} width={38} /><Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" fill="url(#mgr-report-area)" strokeWidth={2.2} isAnimationActive={chartAnim} />
                <Line type="monotone" dataKey="qualified" name="Qualified" stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={chartAnim} />
                <Line type="monotone" dataKey="conversions" name="Converted" stroke="var(--chart-3)" strokeWidth={2} dot={false} isAnimationActive={chartAnim} />
              </AreaChart>
            </ChartCard>
            <SectionCard title="Report readiness" subtitle="What is included in the local pack">
              <div className="ws-checklist">
                {['Budget and committed spend summary', 'Lead, qualification and conversion metrics', 'Employee task and target delivery', 'Approval queue and ageing', 'Expense claims by workflow stage', 'Campaign investment and attributed outcomes'].map((item) => (
                  <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>
                ))}
              </div>
              <div className="callout callout--warning mt-12"><ShieldCheck size={14} /><span>Reports use demonstration data only and do not represent audited financial statements.</span></div>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      <KpiDetailModal detail={kpiDetail} onClose={() => setKpiDetail(null)} />
      <TaskAssignModal open={taskModal} onClose={() => setTaskModal(false)} role="manager" />
      <TaskProgressModal open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)} task={selectedTask} canReview />
      <ExpenseReviewModal open={Boolean(selectedExpense)} onClose={() => setSelectedExpense(null)} expense={selectedExpense} mode="manager" />
      <DecisionModal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.type === 'idea' ? 'Review marketing idea' : 'Review marketing proposal'}
        subject={decision?.record.title ?? ''}
        amount={decisionAmount}
        description={decision?.type === 'idea' ? `${decision.record.description} Expected benefits: ${decision.record.expectedBenefits}` : decision?.record.summary ?? ''}
        currentStage={decision?.type === 'idea' ? (decision.record.status === 'Under Senior Review' ? 'Senior review' : 'Manager review') : 'Manager review'}
        decisions={[
          { label: 'Request changes', value: 'changes', variant: 'ghost' },
          { label: 'Reject', value: 'reject', variant: 'danger' },
          { label: decision?.type === 'idea' ? (decision.record.estimatedBudget ? 'Approve & send to finance' : 'Approve idea') : 'Approve for finance', value: decision?.type === 'idea' ? 'approve' : 'finance', variant: 'primary' },
        ]}
        onSubmit={handleDecision}
      />
      {decision?.type === 'idea' ? (
        <div className="sr-only" aria-live="polite">Idea decision dialog open</div>
      ) : null}

      <Modal
        open={Boolean(selectedApproval)}
        onClose={() => setSelectedApproval(null)}
        title={selectedApproval?.title ?? 'Approval detail'}
        description={selectedApproval ? `${selectedApproval.kind} · ${selectedApproval.submittedByName} · ${formatDateShort(selectedApproval.createdAt)}` : undefined}
        size="wide"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelectedApproval(null)}>Close</Button>
            {selectedApproval?.status === 'Pending Manager Review' ? (
              <>
                <Button variant="soft" onClick={() => setDecision({ type: 'approval', record: selectedApproval })}>Request changes</Button>
                <Button variant="danger" onClick={() => setDecision({ type: 'approval', record: selectedApproval })}>Reject</Button>
                <Button variant="primary" onClick={() => setDecision({ type: 'approval', record: selectedApproval })}>Review decision</Button>
              </>
            ) : <Badge tone="warning">No marketing action required</Badge>}
          </>
        }
      >
        {selectedApproval ? (
          <div className="ws-approval-detail">
            <p className="text-sm">{selectedApproval.summary}</p>
            <div className="ws-detail-grid mt-12">
              <div><span>Submitted by</span><strong>{selectedApproval.submittedByName}</strong></div>
              <div><span>Requested amount</span><strong>{selectedApproval.amount ? formatINR(selectedApproval.amount) : 'No amount'}</strong></div>
              <div><span>Current stage</span><strong>{selectedApproval.currentStage === 'finance' ? 'Finance/Admin' : 'Marketing Manager'}</strong></div>
              <div><span>Status</span><strong>{selectedApproval.status}</strong></div>
            </div>
            <ApprovalStepper currentStage={selectedApproval.currentStage} status={selectedApproval.status} />
            <h4 className="mt-16">Workflow history</h4>
            <AuditTrail entries={selectedApproval.timeline} />
            {selectedApproval.currentStage === 'finance' ? <FinanceGateNote amount={selectedApproval.amount} /> : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedCampaignData)}
        onClose={() => setSelectedCampaign(null)}
        title={selectedCampaignData?.name ?? 'Campaign'}
        description={selectedCampaignData ? `${selectedCampaignData.channel} · ${selectedCampaignData.product} · Owner ${selectedCampaignData.owner}` : undefined}
        size="wide"
        footer={<Button variant="ghost" onClick={() => setSelectedCampaign(null)}>Close</Button>}
      >
        {selectedCampaignData ? (
          <div>
            <p className="text-sm">{selectedCampaignData.objective}</p>
            <div className="ws-detail-grid mt-12">
              <div><span>Budget</span><strong>{formatINR(selectedCampaignData.budget)}</strong></div>
              <div><span>Committed spend</span><strong>{formatINR(selectedCampaignData.spend)}</strong></div>
              <div><span>Attributed leads</span><strong>{formatNumber(selectedCampaignData.kpis.leads)}</strong></div>
              <div><span>Qualified leads</span><strong>{formatNumber(selectedCampaignData.kpis.qualifiedLeads)}</strong></div>
              <div><span>Conversions</span><strong>{formatNumber(selectedCampaignData.kpis.conversions)}</strong></div>
              <div><span>Attributed revenue</span><strong>{formatINR(selectedCampaignData.kpis.revenue)}</strong></div>
            </div>
            <div className="mt-16"><ProgressBar showValue label="Budget utilisation" value={selectedCampaignData.budget ? (selectedCampaignData.spend / selectedCampaignData.budget) * 100 : 0} tone="brand" /></div>
            <div className="ws-detail-grid mt-16">
              <div><span>Audience</span><strong>{selectedCampaignData.audience}</strong></div>
              <div><span>Duration</span><strong>{formatDateShort(selectedCampaignData.startDate)} → {formatDateShort(selectedCampaignData.endDate)}</strong></div>
            </div>
            <div className="callout callout--info mt-12"><Target size={14} /><span>Campaign outcomes are local demonstration data and are not connected to live advertising platforms.</span></div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedEmployeeData)}
        onClose={() => setSelectedEmployee(null)}
        title={selectedEmployeeData?.name ?? 'Employee performance'}
        description={selectedEmployeeData ? `${selectedEmployeeData.roleLabel} · ${selectedEmployeeData.location}` : undefined}
        size="wide"
        footer={<Button variant="ghost" onClick={() => setSelectedEmployee(null)}>Close</Button>}
      >
        {selectedEmployeeData ? (
          <div>
            <div className="ws-perf-detail-head">
              <Avatar name={selectedEmployeeData.name} size="xl" tone={selectedEmployeeData.roleId === 'senior' ? 'teal' : 'indigo'} />
              <div className="grow"><h3>{selectedEmployeeData.name}</h3><p>{selectedEmployeeData.roleLabel} · Target {formatNumber(selectedEmployeeData.targetLeads)} leads</p></div>
              <div className="ws-perf-score"><strong>{performanceScore(selectedEmployeeData)}%</strong><span>Performance</span></div>
            </div>
            <div className="ws-detail-grid mt-16">
              <div><span>Leads generated</span><strong>{selectedEmployeeData.leadsGenerated}</strong></div>
              <div><span>Qualified leads</span><strong>{selectedEmployeeData.qualifiedLeads}</strong></div>
              <div><span>Conversions</span><strong>{selectedEmployeeData.conversions}</strong></div>
              <div><span>Follow-ups</span><strong>{selectedEmployeeData.followUps}</strong></div>
              <div><span>Campaigns</span><strong>{selectedEmployeeData.campaignParticipation}</strong></div>
              <div><span>Expense submissions</span><strong>{formatINR(selectedEmployeeData.expenseSubmitted)}</strong></div>
            </div>
            <div className="mt-16"><ProgressBar showValue label="Lead target achievement" value={(selectedEmployeeData.leadsGenerated / selectedEmployeeData.targetLeads) * 100} tone="success" /></div>
            <h4 className="mt-16">Assigned tasks</h4>
            {tasks.filter((task) => task.assignedToId === selectedEmployeeData.employeeId).slice(0, 5).map((task) => (
              <button type="button" className="ws-detail-task-row" key={task.id} onClick={() => { setSelectedEmployee(null); setSelectedTask(task) }}>
                <span className="grow"><strong>{task.title}</strong><small>{task.category} · due {formatDateShort(task.deadline)}</small></span>
                <StatusBadge status={task.status} />
              </button>
            ))}
            <div className="callout callout--info mt-12"><TrendingUp size={14} /><span>Performance is a demonstration composite of target delivery, lead quality and conversion.</span></div>
          </div>
        ) : null}
      </Modal>

      <PlanComposerModal open={planModal} onClose={() => setPlanModal(false)} />
      <BudgetProposalModal open={budgetModal} onClose={() => setBudgetModal(false)} onSubmit={(draft) => {
        addApproval({
          kind: 'Budget Request',
          title: draft.title,
          summary: draft.summary,
          submittedById: profile.employeeId,
          submittedByName: profile.name,
          submittedByLabel: profile.roleLabel,
          amount: draft.amount,
          status: 'Pending Finance Approval',
          currentStage: 'finance',
        })
        pushToast({ title: 'Budget proposal submitted', description: 'Marketing review is complete. Finance/Admin must give final financial approval in this demo.', tone: 'success' })
        setBudgetModal(false)
      }} />

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="Report preview"
        description="A frontend-only demonstration report. Download the CSV for the sample dataset."
        size="wide"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            <Button variant="primary" icon={<Download size={14} />} onClick={() => {
              exportCsv(`manager-${preview ?? 'report'}-preview`, [
                { header: 'Metric', value: (row) => row.metric },
                { header: 'Value', value: (row) => row.value },
                { header: 'Comparison', value: (row) => row.comparison },
              ], [
                { metric: 'Budget', value: formatINR(TOTAL_MONTHLY_BUDGET), comparison: '+2.4% vs September' },
                { metric: 'Committed spend', value: formatINR(TOTAL_BUDGET_SPENT), comparison: '73.6% used' },
                { metric: 'Leads generated', value: String(totals.generated), comparison: '+8.1% vs September' },
                { metric: 'Qualified leads', value: String(totals.qualified), comparison: '49.7% qualification' },
                { metric: 'Conversions', value: String(totals.conversions), comparison: '22.6% of leads' },
                { metric: 'Pending decisions', value: String(pendingCount), comparison: 'Manager queue' },
              ])
              setPreview(null)
            }}>Download CSV</Button>
          </>
        }
      >
        <div className="ws-report-preview">
          <div className="ws-report-preview__head"><Badge tone="warning">Demo data</Badge><span>{reportPeriod === 'week' ? 'Week 44 · 2026' : reportPeriod === 'quarter' ? 'Q3 · 2026' : 'October 2026'}</span></div>
          <div className="ws-report-preview__grid">
            <div><span>Budget</span><strong>{formatINRCompact(TOTAL_MONTHLY_BUDGET)}</strong><small>+2.4% vs Sep</small></div>
            <div><span>Leads</span><strong>{formatNumber(totals.generated)}</strong><small>+8.1% vs Sep</small></div>
            <div><span>Qualified</span><strong>{formatNumber(totals.qualified)}</strong><small>49.7% of leads</small></div>
            <div><span>Conversions</span><strong>{formatNumber(totals.conversions)}</strong><small>22.6% conversion</small></div>
          </div>
          <p className="text-sm muted mt-12">This preview is assembled from local workspace records. It contains no real customer data and does not imply any payment, approval or campaign delivery outside this browser.</p>
        </div>
      </Modal>

      <div className="sr-only" aria-live="polite">{decision ? 'Decision dialog opened' : ''}</div>
    </WorkspaceLayout>
  )
}

function PlanComposerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addPlan } = useRoleWorkspace()
  const { pushToast } = useToast()
  const [title, setTitle] = useState('November 2026 Growth Plan')
  const [month, setMonth] = useState('November 2026')
  const [objective, setObjective] = useState('Grow qualified lead volume while improving conversion quality across digital and field channels.')
  const [audience, setAudience] = useState('Urban homeowners, interior designers and channel partners.')
  const [locations, setLocations] = useState('Bengaluru, Mumbai, Delhi NCR, Pune')
  const [digital, setDigital] = useState('Paid search, social retargeting, creator content and lifecycle email.')
  const [offline, setOffline] = useState('Retail activations, dealer meets and weekend apartment desks.')
  const [goals, setGoals] = useState('1,050 leads, 46% qualification and 21% conversion.')
  const [expectedLeads, setExpectedLeads] = useState('1050')
  const [conversion, setConversion] = useState('21')
  const [budget, setBudget] = useState('3800000')
  const [digitalBudget, setDigitalBudget] = useState('1250000')
  const [offlineBudget, setOfflineBudget] = useState('800000')
  const [leadBudget, setLeadBudget] = useState('620000')

  const submit = () => {
    if (!title.trim() || !objective.trim()) {
      pushToast({ title: 'Plan needs a title and objective', tone: 'warning' })
      return
    }
    addPlan({
      title: title.trim(),
      month,
      objective: objective.trim(),
      targetAudience: audience.trim(),
      locations: locations.trim(),
      digitalActivities: digital.trim(),
      offlineActivities: offline.trim(),
      campaignGoals: goals.trim(),
      expectedLeads: Number(expectedLeads) || 0,
      expectedConversionRate: Number(conversion) || 0,
      totalBudget: Number(budget) || 0,
      digitalBudget: Number(digitalBudget) || 0,
      offlineBudget: Number(offlineBudget) || 0,
      leadGenBudget: Number(leadBudget) || 0,
    })
    pushToast({ title: 'Monthly plan created', description: 'The plan is saved as a local draft and is visible in the planning workspace.', tone: 'success' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a monthly marketing plan" description="Capture strategy, audience, channel activity and expected outcomes. This creates a local draft only." size="wide" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Compass size={14} />} onClick={submit}>Save plan draft</Button></>}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="manager-plan-title">Plan title</label><input id="manager-plan-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="field"><label htmlFor="manager-plan-month">Month</label><input id="manager-plan-month" className="input" value={month} onChange={(event) => setMonth(event.target.value)} /></div>
        <div className="field"><label htmlFor="manager-plan-locations">Locations</label><input id="manager-plan-locations" className="input" value={locations} onChange={(event) => setLocations(event.target.value)} /></div>
        <div className="field full"><label htmlFor="manager-plan-objective">Monthly objective</label><textarea id="manager-plan-objective" className="textarea" value={objective} onChange={(event) => setObjective(event.target.value)} /></div>
        <div className="field full"><label htmlFor="manager-plan-audience">Target audience</label><input id="manager-plan-audience" className="input" value={audience} onChange={(event) => setAudience(event.target.value)} /></div>
        <div className="field full"><label htmlFor="manager-plan-digital">Digital marketing activities</label><textarea id="manager-plan-digital" className="textarea" value={digital} onChange={(event) => setDigital(event.target.value)} /></div>
        <div className="field full"><label htmlFor="manager-plan-offline">Offline marketing activities</label><textarea id="manager-plan-offline" className="textarea" value={offline} onChange={(event) => setOffline(event.target.value)} /></div>
        <div className="field full"><label htmlFor="manager-plan-goals">Campaign goals</label><input id="manager-plan-goals" className="input" value={goals} onChange={(event) => setGoals(event.target.value)} /></div>
        <div className="field"><label htmlFor="manager-plan-leads">Expected leads</label><input id="manager-plan-leads" type="number" className="input" value={expectedLeads} onChange={(event) => setExpectedLeads(event.target.value)} /></div>
        <div className="field"><label htmlFor="manager-plan-conversion">Expected conversion (%)</label><input id="manager-plan-conversion" type="number" className="input" value={conversion} onChange={(event) => setConversion(event.target.value)} /></div>
        <div className="field"><label htmlFor="manager-plan-budget">Total budget (₹)</label><input id="manager-plan-budget" type="number" className="input" value={budget} onChange={(event) => setBudget(event.target.value)} /></div>
        <div className="field"><label htmlFor="manager-plan-digital-budget">Digital budget (₹)</label><input id="manager-plan-digital-budget" type="number" className="input" value={digitalBudget} onChange={(event) => setDigitalBudget(event.target.value)} /></div>
        <div className="field"><label htmlFor="manager-plan-offline-budget">Offline budget (₹)</label><input id="manager-plan-offline-budget" type="number" className="input" value={offlineBudget} onChange={(event) => setOfflineBudget(event.target.value)} /></div>
        <div className="field"><label htmlFor="manager-plan-lead-budget">Lead generation budget (₹)</label><input id="manager-plan-lead-budget" type="number" className="input" value={leadBudget} onChange={(event) => setLeadBudget(event.target.value)} /></div>
      </div>
      <div className="callout callout--info mt-12"><ShieldCheck size={14} /><span>A plan with budget impact must be sent to Finance/Admin separately. Creating this draft does not authorize spend.</span></div>
    </Modal>
  )
}

function BudgetProposalModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (draft: { title: string; summary: string; amount: number }) => void }) {
  const [title, setTitle] = useState('Additional festive media budget')
  const [amount, setAmount] = useState('250000')
  const [summary, setSummary] = useState('Request additional paid media budget for the final festive week to protect lead volume and retarget high-intent visitors.')
  return (
    <Modal open={open} onClose={onClose} title="Prepare a budget proposal" description="This records a marketing-approved proposal for Finance/Admin. It does not release budget." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Send size={14} />} onClick={() => onSubmit({ title: title.trim(), summary: summary.trim(), amount: Number(amount) || 0 })}>Submit to Finance/Admin</Button></>}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="manager-budget-title">Proposal title</label><input id="manager-budget-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="field"><label htmlFor="manager-budget-amount">Additional amount (₹)</label><input id="manager-budget-amount" type="number" className="input" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
        <div className="field"><label>Approval route</label><div className="ws-route-preview"><span>Manager</span><i>→</i><span>Finance/Admin final</span></div></div>
        <div className="field full"><label htmlFor="manager-budget-summary">Business case</label><textarea id="manager-budget-summary" className="textarea" value={summary} onChange={(event) => setSummary(event.target.value)} /></div>
      </div>
      <div className="callout callout--warning mt-12"><ShieldCheck size={14} /><span>Marketing approval is complete when this is submitted. Only Finance/Admin can give final financial approval.</span></div>
    </Modal>
  )
}
