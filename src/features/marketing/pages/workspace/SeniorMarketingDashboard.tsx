import { useMemo, useState } from 'react'
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
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileBarChart,
  FileText,
  Gauge,
  HandCoins,
  Lightbulb,
  Megaphone,
  Plus,
  ReceiptText,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { WorkspaceLayout, KpiGrid, SectionHeading, RoleBadge, TaskCard, PerformanceCard, IdeaCard, ExpenseCard, ApprovalStepper, AuditTrail, EmptyBlock, PermissionNote, FinanceGateNote, RecentActivity, QuickActionCard, StatPill, DemoFooter, performanceScore } from '../../components/marketing/workspace/WorkspaceKit'
import { TaskAssignModal, TaskProgressModal, ExpenseReviewModal, IdeaSubmitModal, LeadFormModal, LeadUpdateModal, ActivityLogModal } from '../../components/marketing/workspace/WorkspaceModals'
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
  CONVERSION_FUNNEL,
  DAILY_LEAD_SERIES,
  EMPLOYEE_PERFORMANCE,
  LEAD_LOCATION_SERIES,
  LEAD_SOURCE_SERIES,
  MONTHLY_LEAD_SERIES,
  TOTAL_BUDGET_SPENT,
} from '../../data/marketing/workspace'
import { seedCampaigns } from '../../data/marketing/campaigns'
import { seedLeads } from '../../data/marketing/leads'
import type { WorkspaceIdea, WorkspaceLead, WorkspaceTask } from '../../types/workspace'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../../utils/format'
import { formatDateShort } from '../../utils/format'
import { roleWorkspacePath } from '../../config/roleNavigation'
import { FilterTabs, KpiDetailModal, useCsvExport, type KpiDetail } from './workspaceShared'

const BOARD_COLUMNS: Array<{ id: WorkspaceTask['status']; label: string }> = [
  { id: 'Not Started', label: 'Not started' },
  { id: 'In Progress', label: 'In progress' },
  { id: 'Under Review', label: 'Under review' },
  { id: 'Completed', label: 'Completed' },
]

export function SeniorMarketingDashboard({ section = 'dashboard' }: { section?: string }) {
  const navigate = useNavigate()
  const { profile } = useDemoRole()
  const { pushToast } = useToast()
  const exportCsv = useCsvExport()
  const {
    tasks,
    ideas,
    expenses,
    leads,
    updateTask,
    updateIdeaStatus,
    logActivity,
  } = useRoleWorkspace()
  const chartAnim = useChartAnimation()

  const [kpiDetail, setKpiDetail] = useState<KpiDetail | null>(null)
  const [taskModal, setTaskModal] = useState(false)
  const [ideaModal, setIdeaModal] = useState(false)
  const [leadModal, setLeadModal] = useState(false)
  const [activityModal, setActivityModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null)
  const [selectedLead, setSelectedLead] = useState<WorkspaceLead | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<WorkspaceIdea | null>(null)
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [taskScope, setTaskScope] = useState('team')
  const [taskFilter, setTaskFilter] = useState('all')
  const [expenseTab, setExpenseTab] = useState('pending')
  const [ideaTab, setIdeaTab] = useState('junior')
  const [reportPeriod, setReportPeriod] = useState('week')
  const [leadFilter, setLeadFilter] = useState('All')

  const teamMembers = useMemo(
    () => EMPLOYEE_PERFORMANCE.filter((member) => member.seniorId === profile.employeeId),
    [profile.employeeId],
  )
  const myPerformance = EMPLOYEE_PERFORMANCE.find((member) => member.employeeId === profile.employeeId)
  const teamIds = teamMembers.map((member) => member.employeeId)
  const myTasks = tasks.filter((task) => task.assignedToId === profile.employeeId)
  const teamTasks = tasks.filter((task) => teamIds.includes(task.assignedToId) || task.assignedById === profile.employeeId)
  const allVisibleTasks = tasks.filter((task) => task.assignedToId === profile.employeeId || teamIds.includes(task.assignedToId) || task.assignedById === profile.employeeId)
  const pendingIdeas = ideas.filter((idea) => idea.status === 'Under Senior Review' && (idea.seniorId === profile.employeeId || !idea.seniorId))
  const pendingExpenses = expenses.filter((expense) => expense.status === 'Under Senior Review' && (expense.seniorId === profile.employeeId || !expense.seniorId))
  const financeExpenses = expenses.filter((expense) => expense.status === 'Finance Review' && (expense.seniorId === profile.employeeId || teamIds.includes(expense.submittedById)))
  const reviewedExpenses = expenses.filter((expense) => teamIds.includes(expense.submittedById))
  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId) ?? null
  const selectedEmployeeData = EMPLOYEE_PERFORMANCE.find((member) => member.employeeId === selectedEmployee)
  const selectedCampaignData = seedCampaigns.find((campaign) => campaign.id === selectedCampaign)

  const teamStats = useMemo(() => {
    const target = teamMembers.reduce((sum, member) => sum + member.targetLeads, 0) + (myPerformance?.targetLeads ?? 0)
    const generated = teamMembers.reduce((sum, member) => sum + member.leadsGenerated, 0) + (myPerformance?.leadsGenerated ?? 0)
    const qualified = teamMembers.reduce((sum, member) => sum + member.qualifiedLeads, 0) + (myPerformance?.qualifiedLeads ?? 0)
    const conversions = teamMembers.reduce((sum, member) => sum + member.conversions, 0) + (myPerformance?.conversions ?? 0)
    const completedTeamTasks = teamTasks.filter((task) => task.status === 'Completed').length
    const pendingActivities = allVisibleTasks.filter((task) => task.status !== 'Completed').length
    return {
      target,
      generated,
      qualified,
      conversions,
      completion: teamTasks.length ? (completedTeamTasks / teamTasks.length) * 100 : 0,
      pendingActivities,
      targetProgress: target ? (generated / target) * 100 : 0,
      pendingApprovals: pendingIdeas.length + pendingExpenses.length,
    }
  }, [teamMembers, myPerformance, teamTasks, allVisibleTasks, pendingIdeas.length, pendingExpenses.length])

  const scopedTasks = taskScope === 'mine' ? myTasks : taskScope === 'team' ? teamTasks : allVisibleTasks
  const filteredTasks = scopedTasks.filter((task) => {
    if (taskFilter === 'open') return task.status !== 'Completed'
    if (taskFilter === 'review') return task.status === 'Under Review'
    if (taskFilter === 'completed') return task.status === 'Completed'
    if (taskFilter === 'blocked') return ['Blocked', 'Overdue'].includes(task.status)
    return true
  })

  const teamTrend = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
    return months.map((month, index) => {
      const row: Record<string, string | number> = { month }
      teamMembers.forEach((member) => { row[member.name.split(' ')[0]] = member.monthlyTrend[index] ?? 0 })
      row.Team = teamMembers.reduce((sum, member) => sum + (member.monthlyTrend[index] ?? 0), 0)
      return row
    })
  }, [teamMembers])

  const teamLeads = [...leads.filter((lead) => lead.ownerId === profile.employeeId || teamIds.includes(lead.ownerId))]
  const sampleTeamLeads = seedLeads.filter((lead) => teamMembers.some((member) => member.name === lead.assignedTo) || lead.assignedTo === profile.name)
  const displayedLeads = [...teamLeads, ...sampleTeamLeads].filter((lead) => {
    if (leadFilter === 'All') return true
    if (leadFilter === 'Follow-up') return ['Follow-up', 'Interested', 'Contacted'].includes(lead.status)
    if (leadFilter === 'Qualified') return ['Qualified', 'Converted'].includes(lead.status)
    if (leadFilter === 'Rejected') return ['Rejected', 'Lost', 'Not Interested'].includes(lead.status)
    return true
  }).slice(0, 8)

  const campaignsInFlight = seedCampaigns.filter((campaign) => campaign.status === 'Active' || campaign.status === 'Planned')
  const campaignActivities = allVisibleTasks.filter((task) => task.category.includes('Campaign') || task.category.includes('Activation') || task.category.includes('Trade')).length

  const kpiDetails: Record<string, KpiDetail> = {
    myTasks: { label: 'My Assigned Tasks', value: String(myTasks.length), previous: '5', change: '+1 task', description: 'Tasks assigned to you by the marketing manager.', points: ['Two tasks are already under review.', 'The weekly team report is due today.', 'Deadlines are set by the manager.'] },
    members: { label: 'Team Members', value: String(teamMembers.length), previous: '3', change: 'No change', description: 'Junior executives who report to you for marketing delivery.', points: ['Ananya Rao, Vikram Shetty and Rohan Mehta.', 'All three have active lead-generation targets.', 'Neha Kapoor and Aarav Joshi report to Kavya Nair.'] },
    teamCompleted: { label: 'Team Tasks Completed', value: String(teamTasks.filter((task) => task.status === 'Completed').length), previous: '8', change: '+2 tasks', description: 'Team tasks completed in the current demonstration cycle.', points: ['Completion is based on local workspace task state.', 'You can approve work that is under review.', 'Blocked tasks are excluded from completion.'] },
    pending: { label: 'Pending Activities', value: String(teamStats.pendingActivities), previous: '11', change: '-2 activities', description: 'Tasks and activities across your own and team assignments that are still open.', points: ['Overdue follow-ups need attention first.', 'One dealer task is blocked on a venue decision.', 'Use the team board to rebalance work.'] },
    leads: { label: 'Team Leads Generated', value: formatNumber(teamStats.generated), previous: '828', change: '+7.4%', description: 'Combined leads generated by you and your direct junior team.', points: ['Ananya Rao is the largest contributor.', 'Lead generation is tracked to the individual owner.', 'Figures are local demonstration data.'] },
    qualified: { label: 'Qualified Leads', value: formatNumber(teamStats.qualified), previous: '394', change: '+5.8%', description: 'Qualified leads from your team pipeline.', points: ['Qualification follows the agreed field standard.', 'Qualified leads are ready for the existing conversion workflow.', 'No customer contact is made by this demo.'] },
    target: { label: 'Team Target Progress', value: formatPercent(teamStats.targetProgress, 1), previous: '91.2%', change: '+4.1 pts', description: 'Combined lead target achievement for you and your direct reports.', points: [`${formatNumber(teamStats.generated)} leads against ${formatNumber(teamStats.target)} target.`, 'Targets include your own senior executive target.', 'Progress is recalculated from demo data.'] },
    approvals: { label: 'Pending Approvals', value: String(teamStats.pendingApprovals), previous: '2', change: 'Needs action', description: 'Junior ideas and expense claims waiting for your review.', points: ['Expense claims must be forwarded to the manager.', 'You can recommend ideas but cannot give final budget approval.', 'Finance/Admin remains the final financial approver.'] },
    campaigns: { label: 'Campaign Activities', value: String(campaignActivities), previous: '6', change: '+2 activities', description: 'Team assignments linked to live campaign or activation execution.', points: ['Diwali Retail Blitz is the largest active campaign.', 'Retail and trade activities dominate this week.', 'Campaign outcomes are demonstration data.'] },
  }

  const pageMap: Record<string, { title: string; subtitle: string; eyebrow: string }> = {
    dashboard: { title: 'Team Execution Hub', subtitle: 'Your assignments, your team and the reviews that need action today.', eyebrow: 'Senior executive workspace' },
    tasks: { title: 'My Work & Task Board', subtitle: 'Execute manager assignments, split work into subtasks and move delivery forward.', eyebrow: 'Execution board' },
    team: { title: 'Team Management', subtitle: 'Guide junior executives, balance workload and monitor delivery quality.', eyebrow: 'Team coordination' },
    leads: { title: 'Lead Generation', subtitle: 'Team lead volume, follow-up quality and the next conversion-ready opportunities.', eyebrow: 'Pipeline execution' },
    campaigns: { title: 'Campaign Execution', subtitle: 'Track live campaign activity, field execution and team contribution.', eyebrow: 'Campaign delivery' },
    performance: { title: 'Team Performance', subtitle: 'Junior executive delivery, client outcomes and target achievement.', eyebrow: 'Performance review' },
    expenses: { title: 'Expense Review', subtitle: 'Review junior claims, add comments and forward them to the manager.', eyebrow: 'Team expenses' },
    ideas: { title: 'Ideas & Recommendations', subtitle: 'Submit practical ideas and review what your junior team is proposing.', eyebrow: 'Innovation' },
    reports: { title: 'Senior Reports', subtitle: 'Daily, weekly and campaign reporting for your team.', eyebrow: 'Reporting' },
  }
  const page = pageMap[section] ?? pageMap.dashboard

  return (
    <WorkspaceLayout
      roleId="senior"
      section={section}
      title={page.title}
      subtitle={page.subtitle}
      eyebrow={page.eyebrow}
      actions={
        <>
          <RoleBadge roleId="senior" />
          {section === 'tasks' || section === 'dashboard' || section === 'team' ? <Button variant="primary" icon={<Plus size={15} />} onClick={() => setTaskModal(true)}>Assign subtask</Button> : null}
          {section === 'ideas' ? <Button variant="primary" icon={<Lightbulb size={15} />} onClick={() => setIdeaModal(true)}>Submit idea</Button> : null}
          {section === 'leads' ? <Button variant="primary" icon={<Plus size={15} />} onClick={() => setLeadModal(true)}>Add lead</Button> : null}
          {section === 'expenses' ? <Button variant="soft" icon={<Activity size={15} />} onClick={() => setActivityModal(true)}>Log activity</Button> : null}
        </>
      }
      meta={
        <>
          <StatPill icon={<Users size={13} />} label="Direct reports" value={teamMembers.length} />
          <StatPill icon={<ClipboardList size={13} />} label="Open team tasks" value={teamTasks.filter((task) => task.status !== 'Completed').length} />
          <StatPill icon={<BadgeCheck size={13} />} label="Awaiting my review" value={teamStats.pendingApprovals} />
        </>
      }
    >
      {section === 'dashboard' ? (
        <>
          <div className="ws-team-hero">
            <div className="ws-team-hero__copy">
              <span className="ws-team-hero__eyebrow"><Sparkles size={13} /> Today’s team focus</span>
              <h2>Keep the festive field plan moving, then clear the review queue.</h2>
              <p>You have {myTasks.filter((task) => task.status !== 'Completed').length} open assignments, {pendingExpenses.length} expenses to review and {pendingIdeas.length} junior idea waiting for your recommendation.</p>
              <div className="row-8 wrap mt-12">
                <Button variant="primary" size="sm" icon={<ClipboardCheck size={14} />} onClick={() => navigate(roleWorkspacePath('tasks'))}>Open my board</Button>
                <Button variant="soft" size="sm" icon={<ReceiptText size={14} />} onClick={() => navigate(roleWorkspacePath('expenses'))}>Review expenses</Button>
                <Button variant="ghost" size="sm" icon={<Activity size={14} />} onClick={() => setActivityModal(true)}>Log today’s activity</Button>
              </div>
            </div>
            <div className="ws-team-hero__side">
              <div className="ws-hero-stat"><span>Team target</span><strong>{formatPercent(teamStats.targetProgress, 1)}</strong><ProgressBar value={teamStats.targetProgress} tone="success" size="sm" /></div>
              <div className="ws-hero-stat"><span>Team leads</span><strong>{formatNumber(teamStats.generated)}</strong><small>{formatNumber(teamStats.qualified)} qualified</small></div>
              <div className="ws-hero-stat"><span>Task completion</span><strong>{teamStats.completion.toFixed(0)}%</strong><small>{teamTasks.length} team tasks</small></div>
            </div>
          </div>

          <KpiGrid columns={3}>
            <KpiCard index={0} label="My Assigned Tasks" value={myTasks.length} format={formatNumber} icon={<ClipboardList size={17} />} tone="var(--chart-2)" trend={{ value: 12.5, label: 'vs last week' }} hint="Assigned by the marketing manager" onClick={() => setKpiDetail(kpiDetails.myTasks)} />
            <KpiCard index={1} label="Team Members" value={teamMembers.length} format={formatNumber} icon={<Users size={17} />} tone="var(--chart-1)" hint="Direct junior reports" onClick={() => setKpiDetail(kpiDetails.members)} />
            <KpiCard index={2} label="Team Tasks Completed" value={teamTasks.filter((task) => task.status === 'Completed').length} format={formatNumber} icon={<Check size={17} />} tone="var(--chart-7)" trend={{ value: 9.4, label: 'vs last week' }} hint={`${teamStats.completion.toFixed(0)}% completion`} onClick={() => setKpiDetail(kpiDetails.teamCompleted)} />
            <KpiCard index={3} label="Pending Activities" value={teamStats.pendingActivities} format={formatNumber} icon={<CalendarClock size={17} />} tone="var(--chart-3)" trend={{ value: -4.2, label: 'vs last week', positiveIsGood: false }} hint="Open across you and the team" onClick={() => setKpiDetail(kpiDetails.pending)} />
            <KpiCard index={4} label="Total Leads Generated" value={teamStats.generated} format={formatNumber} icon={<Target size={17} />} tone="var(--chart-5)" trend={{ value: 7.4, label: 'vs September' }} spark={MONTHLY_LEAD_SERIES.map((item) => item.leads)} hint="You + direct reports" onClick={() => setKpiDetail(kpiDetails.leads)} />
            <KpiCard index={5} label="Qualified Leads" value={teamStats.qualified} format={formatNumber} icon={<BadgeCheck size={17} />} tone="var(--chart-6)" trend={{ value: 5.8, label: 'vs September' }} spark={MONTHLY_LEAD_SERIES.map((item) => item.qualified)} hint="Team qualification quality" onClick={() => setKpiDetail(kpiDetails.qualified)} />
            <KpiCard index={6} label="Team Target Progress" value={teamStats.targetProgress} format={(value) => `${value.toFixed(1)}%`} icon={<TrendingUp size={17} />} tone="var(--chart-2)" trend={{ value: 4.1, label: 'pts vs September' }} hint={`${formatNumber(teamStats.generated)} of ${formatNumber(teamStats.target)} target`} onClick={() => setKpiDetail(kpiDetails.target)} />
            <KpiCard index={7} label="Pending Approvals" value={teamStats.pendingApprovals} format={formatNumber} icon={<BadgeCheck size={17} />} tone="var(--chart-4)" hint="Ideas + expenses waiting on you" onClick={() => setKpiDetail(kpiDetails.approvals)} />
            <KpiCard index={8} label="Campaign Activities" value={campaignActivities} format={formatNumber} icon={<Rocket size={17} />} tone="var(--chart-8)" trend={{ value: 14.3, label: 'vs last week' }} hint="Campaign-linked team tasks" onClick={() => setKpiDetail(kpiDetails.campaigns)} />
          </KpiGrid>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="Today’s team board" subtitle="The work that matters before end of day" actions={<Button variant="ghost" size="xs" onClick={() => navigate(roleWorkspacePath('tasks'))}>Full board <ArrowRight size={12} /></Button>}>
              <div className="ws-mini-board">
                {BOARD_COLUMNS.slice(0, 3).map((column) => {
                  const columnTasks = teamTasks.filter((task) => task.status === column.id).slice(0, 3)
                  return (
                    <div className="ws-mini-board__column" key={column.id}>
                      <div className="ws-mini-board__head"><span className={`ws-board-dot is-${column.id.toLowerCase().replace(/\s+/g, '-')}`} />{column.label}<em>{teamTasks.filter((task) => task.status === column.id).length}</em></div>
                      {columnTasks.map((task) => (
                        <button type="button" key={task.id} className="ws-mini-board__task" onClick={() => setSelectedTask(task)}>
                          <span>{task.title}</span>
                          <small>{task.assignedToName} · {formatDateShort(task.deadline)}</small>
                          <ProgressBar value={task.progress} tone={task.status === 'Blocked' ? 'danger' : 'brand'} size="sm" />
                        </button>
                      ))}
                      {!columnTasks.length ? <p className="ws-mini-board__empty">Nothing here.</p> : null}
                    </div>
                  )
                })}
              </div>
            </SectionCard>
            <SectionCard title="Review queue" subtitle="Items that need a senior decision" actions={<Badge tone={teamStats.pendingApprovals ? 'warning' : 'success'}>{teamStats.pendingApprovals || 'Clear'}</Badge>}>
              <div className="ws-stack">
                {pendingExpenses.map((expense) => (
                  <button type="button" key={expense.id} className="ws-decision-mini" onClick={() => setSelectedExpenseId(expense.id)}>
                    <span className="ws-decision-mini__icon is-expense"><ReceiptText size={14} /></span>
                    <span className="grow"><strong>{expense.title}</strong><small>{expense.submittedByName} · {expense.category}</small></span>
                    <span className="ws-decision-mini__amount">{formatINRCompact(expense.amount)}</span>
                    <ChevronRight size={14} className="faint" />
                  </button>
                ))}
                {pendingIdeas.map((idea) => (
                  <button type="button" key={idea.id} className="ws-decision-mini" onClick={() => setSelectedIdea(idea)}>
                    <span className="ws-decision-mini__icon is-idea"><Lightbulb size={14} /></span>
                    <span className="grow"><strong>{idea.title}</strong><small>Idea · {idea.submittedByName}</small></span>
                    <ChevronRight size={14} className="faint" />
                  </button>
                ))}
                {!teamStats.pendingApprovals ? <EmptyBlock title="Review queue is clear" description="New junior submissions will appear here." icon={<BadgeCheck size={20} />} /> : null}
              </div>
              <PermissionNote role="senior">You can recommend and forward. You cannot give final marketing or financial approval.</PermissionNote>
            </SectionCard>
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title="Team lead trend" subtitle="Monthly lead volume by junior executive" height="lg" legend={<>{teamMembers.map((member, index) => <LegendItem key={member.employeeId} color={`var(--chart-${(index % 6) + 1})`} label={member.name.split(' ')[0]} />)}<LegendItem color="var(--text)" label="Team total" /></>}>
              <LineChart data={teamTrend}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={36} />
                <Tooltip content={<ChartTooltip />} />
                {teamMembers.map((member, index) => <Line key={member.employeeId} type="monotone" dataKey={member.name.split(' ')[0]} stroke={`var(--chart-${(index % 6) + 1})`} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={chartAnim} />)}
                <Line type="monotone" dataKey="Team" stroke="var(--text)" strokeWidth={1.6} strokeDasharray="4 4" dot={false} isAnimationActive={chartAnim} />
              </LineChart>
            </ChartCard>
            <SectionCard title="My focus" subtitle="Your own assignments and target">
              {myPerformance ? (
                <div className="ws-focus-panel">
                  <span className="ws-focus-panel__icon"><Gauge size={18} /></span>
                  <h3>{myPerformance.leadsGenerated} leads generated</h3>
                  <p>{myPerformance.qualifiedLeads} qualified · {myPerformance.conversions} conversions · {myPerformance.followUps} follow-ups</p>
                  <ProgressBar showValue label="Personal target" value={(myPerformance.leadsGenerated / myPerformance.targetLeads) * 100} tone="success" />
                  <div className="ws-focus-panel__meta"><StatusBadge status="On Track" /><span>{formatINRCompact(myPerformance.expenseSubmitted)} expenses</span></div>
                  <Button variant="soft" size="sm" icon={<ClipboardList size={13} />} onClick={() => setTaskScope('mine')}>View my tasks</Button>
                </div>
              ) : null}
            </SectionCard>
          </div>

          <SectionHeading title="Team management shortcuts" subtitle="Coordinate work, review quality and report progress." />
          <div className="ws-quick-grid">
            <QuickActionCard title="Split an assignment" description="Create a junior subtask with a clear result" icon={<ClipboardList size={17} />} tone="var(--chart-2)" onClick={() => setTaskModal(true)} />
            <QuickActionCard title="Review junior work" description="Approve or return completed tasks" icon={<BadgeCheck size={17} />} tone="var(--chart-1)" onClick={() => navigate(roleWorkspacePath('tasks'))} />
            <QuickActionCard title="Forward expenses" description="Review claims and send to the manager" icon={<ReceiptText size={17} />} tone="var(--chart-3)" onClick={() => navigate(roleWorkspacePath('expenses'))} />
            <QuickActionCard title="Recommend an idea" description="Share a field insight with your manager" icon={<Lightbulb size={17} />} tone="var(--chart-6)" onClick={() => setIdeaModal(true)} />
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'tasks' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Task scope" value={taskScope} onChange={setTaskScope} options={[{ id: 'mine', label: 'Assigned to me', count: myTasks.length }, { id: 'team', label: 'My team', count: teamTasks.length }, { id: 'all', label: 'All visible', count: allVisibleTasks.length }]} />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setTaskModal(true)}>Break into subtask</Button>
          </div>
          <div className="ws-inline-toolbar muted-toolbar">
            <FilterTabs ariaLabel="Task status" value={taskFilter} onChange={setTaskFilter} options={[{ id: 'all', label: 'All' }, { id: 'open', label: 'Open' }, { id: 'review', label: 'Review' }, { id: 'blocked', label: 'Blocked / overdue' }, { id: 'completed', label: 'Completed' }]} />
            <span className="text-xs muted">{filteredTasks.length} tasks in this lane</span>
          </div>
          <div className="ws-kanban">
            {BOARD_COLUMNS.map((column) => {
              const columnTasks = filteredTasks.filter((task) => task.status === column.id)
              return (
                <div className="ws-kanban__column" key={column.id}>
                  <div className="ws-kanban__head"><span className={`ws-board-dot is-${column.id.toLowerCase().replace(/\s+/g, '-')}`} /><strong>{column.label}</strong><em>{columnTasks.length}</em></div>
                  <div className="ws-kanban__body">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        compact
                        onOpen={() => setSelectedTask(task)}
                        actions={
                          <>
                            <Button variant="ghost" size="xs" onClick={() => setSelectedTask(task)}>Open</Button>
                            {task.status === 'Under Review' && task.assignedToId !== profile.employeeId ? <Button variant="success" size="xs" onClick={() => updateTask(task.id, { status: 'Completed', progress: 100 })}>Approve</Button> : null}
                          </>
                        }
                      />
                    ))}
                    {!columnTasks.length ? <div className="ws-kanban__empty">Drop work here as it progresses.</div> : null}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="callout callout--info mt-16"><ClipboardList size={14} /><span>Move work through Not Started → In Progress → Under Review → Completed. Blocked and Overdue tasks stay visible in their current lane with a warning state.</span></div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'team' ? (
        <>
          <div className="ws-inline-toolbar">
            <Badge tone="info" dot={false}>Direct reports · {teamMembers.length}</Badge>
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setTaskModal(true)}>Assign work</Button>
          </div>
          <div className="ws-summary-strip">
            <StatPill icon={<Users size={14} />} label="Team members" value={teamMembers.length} />
            <StatPill icon={<Target size={14} />} label="Team target" value={formatNumber(teamStats.target)} />
            <StatPill icon={<Check size={14} />} label="Leads delivered" value={formatNumber(teamStats.generated)} />
            <StatPill icon={<ClipboardList size={14} />} label="Open work" value={teamStats.pendingActivities} />
            <StatPill icon={<TrendingUp size={14} />} label="Target progress" value={formatPercent(teamStats.targetProgress, 1)} />
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title="Team workload and delivery" subtitle="Assigned tasks by junior executive" height="lg">
              <BarChart data={teamMembers.map((member) => ({ name: member.name.split(' ')[0], assigned: teamTasks.filter((task) => task.assignedToId === member.employeeId).length, completed: teamTasks.filter((task) => task.assignedToId === member.employeeId && task.status === 'Completed').length, leads: member.leadsGenerated }))}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={34} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="assigned" name="Assigned" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={chartAnim} />
                <Bar dataKey="completed" name="Completed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={chartAnim} />
              </BarChart>
            </ChartCard>
            <SectionCard title="Workload balance" subtitle="A quick read on capacity">
              <div className="ws-workload-list">
                {teamMembers.map((member) => {
                  const assigned = teamTasks.filter((task) => task.assignedToId === member.employeeId)
                  const open = assigned.filter((task) => task.status !== 'Completed').length
                  const load = Math.min(100, (open / 4) * 100)
                  return (
                    <div className="ws-workload-row" key={member.employeeId}>
                      <Avatar name={member.name} size="sm" />
                      <div className="grow"><strong>{member.name}</strong><small>{open} open · {assigned.length} total</small></div>
                      <div className="ws-workload-row__bar"><ProgressBar value={load} tone={load >= 75 ? 'warning' : 'brand'} size="sm" /></div>
                      <span className="text-xs muted">{load >= 75 ? 'High' : load >= 45 ? 'Balanced' : 'Available'}</span>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          </div>

          <SectionHeading title="Junior executive performance" subtitle="Open a card for the individual performance report and assigned work." />
          <div className="ws-perf-grid">
            {teamMembers.map((member) => {
              const assigned = teamTasks.filter((task) => task.assignedToId === member.employeeId)
              return (
                <PerformanceCard
                  key={member.employeeId}
                  employee={member}
                  assignedTasks={assigned.length}
                  completedTasks={assigned.filter((task) => task.status === 'Completed').length}
                  pendingTasks={assigned.filter((task) => task.status !== 'Completed').length}
                  onClick={() => setSelectedEmployee(member.employeeId)}
                />
              )
            })}
          </div>

          <SectionCard title="Team task board" subtitle="Everything currently assigned across your direct team" className="mt-18">
            <div className="ws-table-wrap">
              <table className="table">
                <thead><tr><th>Task</th><th>Owner</th><th>Status</th><th>Deadline</th><th>Progress</th><th /></tr></thead>
                <tbody>
                  {teamTasks.slice(0, 10).map((task) => (
                    <tr key={task.id}>
                      <td><strong>{task.title}</strong><small>{task.category} · {task.priority} priority</small></td>
                      <td>{task.assignedToName}</td>
                      <td><StatusBadge status={task.status} /></td>
                      <td>{formatDateShort(task.deadline)}</td>
                      <td><div className="ws-table-progress"><ProgressBar value={task.progress} size="sm" /><span>{task.progress}%</span></div></td>
                      <td><Button variant="ghost" size="xs" onClick={() => setSelectedTask(task)}>Review</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <DemoFooter />
        </>
      ) : null}

      {section === 'leads' ? (
        <>
          <KpiGrid columns={4}>
            <KpiCard index={0} label="Team leads" value={teamStats.generated} format={formatNumber} icon={<Target size={17} />} tone="var(--chart-2)" trend={{ value: 7.4, label: 'vs September' }} spark={DAILY_LEAD_SERIES.map((item) => item.leads)} hint="You and your direct team" />
            <KpiCard index={1} label="Qualified" value={teamStats.qualified} format={formatNumber} icon={<BadgeCheck size={17} />} tone="var(--chart-1)" trend={{ value: 5.8, label: 'vs September' }} hint={`${((teamStats.qualified / teamStats.generated) * 100).toFixed(1)}% qualification`} />
            <KpiCard index={2} label="Follow-ups due" value={teamLeads.filter((lead) => lead.status === 'Follow-up').length + sampleTeamLeads.filter((lead) => ['Follow-up', 'Interested', 'Contacted'].includes(lead.status)).length} format={formatNumber} icon={<CalendarClock size={17} />} tone="var(--chart-3)" hint="Team-wide next contacts" />
            <KpiCard index={3} label="Conversions" value={teamStats.conversions} format={formatNumber} icon={<TrendingUp size={17} />} tone="var(--chart-5)" trend={{ value: 3.9, label: 'vs September' }} hint="Team-attributed customers" />
          </KpiGrid>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title="Lead source mix" subtitle="Where the team pipeline is coming from" height="lg" legend={<PieLegend items={LEAD_SOURCE_SERIES.map((item) => ({ name: item.label, value: item.value, color: item.color }))} />}>
              <PieChart><Pie data={LEAD_SOURCE_SERIES} dataKey="value" nameKey="label" innerRadius="54%" outerRadius="82%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={chartAnim}>{LEAD_SOURCE_SERIES.map((item) => <Cell key={item.label} fill={item.color} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart>
            </ChartCard>
            <ChartCard title="Leads by market" subtitle="Team coverage" height="lg">
              <BarChart data={LEAD_LOCATION_SERIES} layout="vertical" margin={{ left: 2, right: 14 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="label" {...axisProps} width={64} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Leads" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={15} isAnimationActive={chartAnim} />
              </BarChart>
            </ChartCard>
          </div>

          <SectionCard title="Team lead workspace" subtitle="Add leads, update follow-ups and keep quality visible." className="mt-18" actions={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setLeadModal(true)}>Add lead</Button>}>
            <div className="ws-inline-toolbar muted-toolbar">
              <FilterTabs ariaLabel="Team lead filter" value={leadFilter} onChange={setLeadFilter} options={[{ id: 'All', label: 'All' }, { id: 'Follow-up', label: 'Follow-up' }, { id: 'Qualified', label: 'Qualified' }, { id: 'Rejected', label: 'Rejected' }]} />
              <span className="text-xs muted">{displayedLeads.length} sample leads</span>
            </div>
            <div className="ws-lead-grid">
              {displayedLeads.map((lead) => (
                <button type="button" className="ws-lead-card" key={lead.id} onClick={() => {
                  const workspaceLead = leads.find((item) => item.id === lead.id)
                  if (workspaceLead) setSelectedLead(workspaceLead)
                  else pushToast({ title: lead.name, description: 'This is a read-only sample lead from the existing ERP lead module. Add a workspace lead to update follow-ups here.', tone: 'info' })
                }}>
                  <div className="ws-lead-card__head"><Avatar name={lead.name} size="sm" /><StatusBadge status={lead.status} /></div>
                  <h3>{lead.name}</h3>
                  <p>{lead.company}</p>
                  <div className="ws-lead-card__meta"><span>{lead.location}</span><span>{lead.source}</span></div>
                  <div className="ws-lead-card__foot"><span>Owner · {'assignedTo' in lead ? lead.assignedTo : lead.ownerName}</span><span>{formatDateShort(lead.createdAt)}</span></div>
                </button>
              ))}
            </div>
            {!displayedLeads.length ? <EmptyBlock title="No leads in this view" description="Try another filter or add a new lead." action={<Button variant="primary" size="sm" onClick={() => setLeadModal(true)}>Add lead</Button>} /> : null}
          </SectionCard>

          <div className="ws-grid ws-grid--1-1 mt-18">
            <SectionCard title="Conversion funnel" subtitle="Team pipeline quality">
              <Funnel stages={CONVERSION_FUNNEL} compact />
            </SectionCard>
            <SectionCard title="Follow-up discipline" subtitle="Why quality matters">
              <div className="ws-checklist">
                {['Follow-up within 24 hours of lead capture', 'Capture requirement and decision timeline', 'Mark qualified only with a verified next step', 'Hand qualified leads to the existing sales workflow', 'Record every field activity for manager visibility'].map((item) => <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>)}
              </div>
              <div className="callout callout--info mt-12"><Target size={14} /><span>Qualified leads remain in the workspace for demonstration. The existing ERP lead module continues to own conversion.</span></div>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'campaigns' ? (
        <>
          <div className="ws-inline-toolbar">
            <Badge tone="info" dot={false}>{campaignsInFlight.length} campaigns in flight</Badge>
            <div className="ws-toolbar-actions">
              <Button variant="ghost" size="sm" icon={<Activity size={14} />} onClick={() => setActivityModal(true)}>Log campaign activity</Button>
              <Button variant="soft" size="sm" icon={<Download size={14} />} onClick={() => exportCsv('senior-campaign-execution', [{ header: 'Campaign', value: (row) => row.name }, { header: 'Status', value: (row) => row.status }, { header: 'Spend', value: (row) => row.spend }, { header: 'Leads', value: (row) => row.kpis.leads }], seedCampaigns)}>Export</Button>
            </div>
          </div>

          <div className="ws-campaign-grid">
            {campaignsInFlight.map((campaign) => {
              const activationTasks = allVisibleTasks.filter((task) => task.campaignId === campaign.id || task.category.includes('Campaign') || task.category.includes('Activation'))
              return (
                <button type="button" className="ws-campaign-card" key={campaign.id} onClick={() => setSelectedCampaign(campaign.id)}>
                  <div className="ws-campaign-card__head"><Badge tone={campaign.status === 'Active' ? 'success' : 'warning'}>{campaign.status}</Badge><span>{campaign.channel}</span></div>
                  <h3>{campaign.name}</h3>
                  <p className="clamp-2">{campaign.objective}</p>
                  <div className="ws-campaign-card__metrics"><span><strong>{formatINRCompact(campaign.spend)}</strong>Spend</span><span><strong>{campaign.kpis.leads}</strong>Leads</span><span><strong>{campaign.kpis.qualifiedLeads}</strong>Qualified</span><span><strong>{activationTasks.length}</strong>Team tasks</span></div>
                  <ProgressBar value={campaign.budget ? (campaign.spend / campaign.budget) * 100 : 0} tone="brand" size="sm" />
                  <div className="between ws-campaign-card__foot"><span>{formatPercent(campaign.budget ? (campaign.spend / campaign.budget) * 100 : 0, 0)} budget used</span><span>{campaign.owner}</span></div>
                </button>
              )
            })}
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="Execution activity" subtitle="Recent team work tied to live campaigns">
              <div className="ws-timeline">
                {allVisibleTasks.filter((task) => task.status !== 'Not Started').slice(0, 6).map((task) => (
                  <div className="ws-timeline__row" key={task.id}>
                    <span className={`ws-timeline__dot is-${task.status.toLowerCase().replace(/\s+/g, '-')}`} />
                    <div className="grow"><strong>{task.title}</strong><small>{task.assignedToName} · {task.category} · {task.progress}%</small></div>
                    <StatusBadge status={task.status} />
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Execution checklist" subtitle="What to confirm with the team">
              <div className="ws-checklist">
                {['Campaign brief understood by every assigned executive', 'Field material and collateral available', 'Lead capture form tested', 'Follow-up owner named for each activity', 'Daily activity evidence captured', 'Issues escalated before the deadline'].map((item) => <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>)}
              </div>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'performance' ? (
        <>
          <div className="ws-summary-strip">
            <StatPill icon={<Users size={14} />} label="Junior executives" value={teamMembers.length} />
            <StatPill icon={<Target size={14} />} label="Team leads" value={formatNumber(teamStats.generated)} />
            <StatPill icon={<BadgeCheck size={14} />} label="Qualified" value={formatNumber(teamStats.qualified)} />
            <StatPill icon={<TrendingUp size={14} />} label="Target progress" value={formatPercent(teamStats.targetProgress, 1)} />
            <StatPill icon={<Check size={14} />} label="Task completion" value={`${teamStats.completion.toFixed(0)}%`} />
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title="Junior comparison" subtitle="Target, generated and qualified leads" height="lg" legend={<><LegendItem color="var(--chart-1)" label="Target" /><LegendItem color="var(--chart-2)" label="Generated" /><LegendItem color="var(--chart-3)" label="Qualified" /></>}>
              <BarChart data={teamMembers.map((member) => ({ name: member.name.split(' ')[0], target: member.targetLeads, generated: member.leadsGenerated, qualified: member.qualifiedLeads }))}>
                <CartesianGrid {...gridProps} /><XAxis dataKey="name" {...axisProps} /><YAxis {...axisProps} width={34} /><Tooltip content={<ChartTooltip />} />
                <Bar dataKey="target" name="Target" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={chartAnim} />
                <Bar dataKey="generated" name="Generated" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={chartAnim} />
                <Bar dataKey="qualified" name="Qualified" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={chartAnim} />
              </BarChart>
            </ChartCard>
            <SectionCard title="Performance summary" subtitle="Junior cohort average">
              <div className="ws-perf-score ws-perf-score--large"><strong>{(teamMembers.reduce((sum, member) => sum + performanceScore(member), 0) / Math.max(1, teamMembers.length)).toFixed(0)}%</strong><span>Composite performance</span></div>
              <div className="ws-detail-grid mt-16">
                <div><span>Avg. target achievement</span><strong>{formatPercent((teamMembers.reduce((sum, member) => sum + member.leadsGenerated / member.targetLeads, 0) / Math.max(1, teamMembers.length)) * 100, 1)}</strong></div>
                <div><span>Avg. qualification</span><strong>{formatPercent((teamMembers.reduce((sum, member) => sum + (member.qualifiedLeads / member.leadsGenerated), 0) / Math.max(1, teamMembers.length)) * 100, 1)}</strong></div>
                <div><span>Total follow-ups</span><strong>{teamMembers.reduce((sum, member) => sum + member.followUps, 0)}</strong></div>
                <div><span>Campaign participation</span><strong>{teamMembers.reduce((sum, member) => sum + member.campaignParticipation, 0)}</strong></div>
              </div>
              <div className="callout callout--info mt-12"><TrendingUp size={14} /><span>Open any junior performance card for task-level detail and coaching context.</span></div>
            </SectionCard>
          </div>

          <SectionHeading title="Individual performance cards" subtitle="Tasks, leads, follow-ups, expenses and target achievement." />
          <div className="ws-perf-grid">
            {teamMembers.map((member) => {
              const assigned = teamTasks.filter((task) => task.assignedToId === member.employeeId)
              return <PerformanceCard key={member.employeeId} employee={member} assignedTasks={assigned.length} completedTasks={assigned.filter((task) => task.status === 'Completed').length} pendingTasks={assigned.filter((task) => task.status !== 'Completed').length} onClick={() => setSelectedEmployee(member.employeeId)} />
            })}
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'expenses' ? (
        <>
          <KpiGrid columns={4}>
            <KpiCard index={0} label="Team expenses" value={reviewedExpenses.reduce((sum, expense) => sum + expense.amount, 0)} format={formatINRCompact} icon={<ReceiptText size={17} />} tone="var(--chart-2)" hint={`${reviewedExpenses.length} junior claims`} />
            <KpiCard index={1} label="Awaiting my review" value={pendingExpenses.length} format={formatNumber} icon={<ClipboardCheck size={17} />} tone="var(--chart-3)" hint="Forward reviewed claims to the manager" />
            <KpiCard index={2} label="With Finance/Admin" value={financeExpenses.length} format={formatNumber} icon={<ShieldCheck size={17} />} tone="var(--chart-5)" hint="Final financial approval pending" />
            <KpiCard index={3} label="Approved claims" value={reviewedExpenses.filter((expense) => expense.status === 'Approved').length} format={formatNumber} icon={<BadgeCheck size={17} />} tone="var(--chart-7)" hint="Demo-approved records" />
          </KpiGrid>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="Assigned team budget" subtitle="Field and activity spend available to your team" actions={<Badge tone="info" dot={false}>Local demo</Badge>}>
              <div className="ws-budget-band">
                <div><span>Assigned budget</span><strong>{formatINR(1650000)}</strong><small>Field, travel and activation support</small></div>
                <div><span>Committed claims</span><strong>{formatINR(TOTAL_BUDGET_SPENT * 0.16)}</strong><small>Local team estimate</small></div>
                <div><span>Available</span><strong>{formatINR(1650000 - TOTAL_BUDGET_SPENT * 0.16)}</strong><small>Before pending approvals</small></div>
              </div>
              <div className="mt-16"><ProgressBar showValue label="Budget utilisation" value={Math.min(100, (TOTAL_BUDGET_SPENT * 0.16 / 1650000) * 100)} tone="success" /></div>
              <div className="callout callout--warning mt-12"><ShieldCheck size={14} /><span>Your review is a recommendation. The manager reviews the business need and Finance/Admin gives final approval.</span></div>
            </SectionCard>
            <SectionCard title="Expense workflow" subtitle="Who acts next">
              <ApprovalStepper currentStage="senior" status="Under Senior Review" />
              <div className="ws-route-list mt-12">
                <div><span>1</span><strong>Junior submits</strong><small>Claim linked to an assigned task</small></div>
                <div><span>2</span><strong>You review</strong><small>Verify evidence and forward with comments</small></div>
                <div><span>3</span><strong>Manager</strong><small>Checks budget and marketing need</small></div>
                <div><span>4</span><strong>Finance/Admin</strong><small>Final financial approval only</small></div>
              </div>
            </SectionCard>
          </div>

          <div className="ws-inline-toolbar mt-18">
            <FilterTabs ariaLabel="Expense review queue" value={expenseTab} onChange={setExpenseTab} options={[
              { id: 'pending', label: 'Awaiting review', count: pendingExpenses.length },
              { id: 'finance', label: 'Finance stage', count: financeExpenses.length },
              { id: 'all', label: 'All team claims', count: reviewedExpenses.length },
            ]} />
            <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => exportCsv('senior-expense-review', [{ header: 'Claim', value: (row) => row.title }, { header: 'Employee', value: (row) => row.submittedByName }, { header: 'Amount', value: (row) => row.amount }, { header: 'Status', value: (row) => row.status }], reviewedExpenses)}>Export claims</Button>
          </div>
          <div className="ws-expense-grid">
            {(expenseTab === 'pending' ? pendingExpenses : expenseTab === 'finance' ? financeExpenses : reviewedExpenses).map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} onClick={() => setSelectedExpenseId(expense.id)} actions={
                expense.status === 'Under Senior Review'
                  ? <Button variant="soft" size="xs" onClick={() => setSelectedExpenseId(expense.id)}>Review claim</Button>
                  : <Badge tone="neutral">Read-only</Badge>
              } />
            ))}
          </div>
          {!(expenseTab === 'pending' ? pendingExpenses : expenseTab === 'finance' ? financeExpenses : reviewedExpenses).length ? <EmptyBlock title="No claims in this view" description="Junior expenses will appear here as they move through the workflow." icon={<ReceiptText size={20} />} /> : null}
          <FinanceGateNote />
          <DemoFooter />
        </>
      ) : null}

      {section === 'ideas' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Idea scope" value={ideaTab} onChange={setIdeaTab} options={[{ id: 'junior', label: 'From my juniors', count: pendingIdeas.length }, { id: 'mine', label: 'My ideas', count: ideas.filter((idea) => idea.submittedById === profile.employeeId).length }, { id: 'all', label: 'All visible', count: ideas.length }]} />
            <Button variant="primary" size="sm" icon={<Lightbulb size={14} />} onClick={() => setIdeaModal(true)}>Submit new idea</Button>
          </div>

          {ideaTab === 'junior' ? (
            <>
              <SectionHeading title="Junior ideas awaiting recommendation" subtitle="Review the opportunity and either recommend it to the manager or return it with feedback." />
              <div className="ws-idea-grid">
                {pendingIdeas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} actions={<><Button variant="ghost" size="xs" onClick={() => setSelectedIdea(idea)}>Open</Button><Button variant="soft" size="xs" onClick={() => setSelectedIdea(idea)}>Review</Button></>} />
                ))}
              </div>
              {!pendingIdeas.length ? <EmptyBlock title="No junior ideas waiting" description="New submissions from your direct reports will appear here." icon={<Lightbulb size={20} />} /> : null}
            </>
          ) : null}

          {ideaTab === 'mine' || ideaTab === 'all' ? (
            <>
              <SectionHeading title={ideaTab === 'mine' ? 'My submitted ideas' : 'All visible ideas'} subtitle="Track the manager’s response and the status of each recommendation." />
              <div className="ws-idea-grid">
                {(ideaTab === 'mine' ? ideas.filter((idea) => idea.submittedById === profile.employeeId) : ideas).map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} actions={idea.status === 'Under Senior Review' && idea.submittedById !== profile.employeeId ? <Button variant="soft" size="xs" onClick={() => setSelectedIdea(idea)}>Review</Button> : <Badge tone="neutral">View only</Badge>} />
                ))}
              </div>
            </>
          ) : null}

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="What makes a strong idea" subtitle="Guidance for your team">
              <div className="ws-checklist">
                {['A specific customer or market problem', 'Evidence from field or digital activity', 'A clear expected benefit and measurement', 'A realistic budget or resource ask', 'The owner and next step if approved'].map((item) => <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>)}
              </div>
            </SectionCard>
            <SectionCard title="Approval route" subtitle="Idea progression">
              <ApprovalStepper currentStage="senior" status="Under Senior Review" />
              <p className="text-sm muted mt-12">Junior → Senior recommendation → Manager marketing decision → Finance/Admin only when a budget is required.</p>
              <PermissionNote role="senior">You can recommend, request changes or return an idea. The manager owns the marketing approval.</PermissionNote>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'reports' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Senior report period" value={reportPeriod} onChange={setReportPeriod} options={[{ id: 'today', label: 'Today' }, { id: 'week', label: 'This week' }, { id: 'month', label: 'This month' }]} />
            <Button variant="soft" size="sm" icon={<Download size={14} />} onClick={() => setPreview('team-pack')}>Preview team pack</Button>
          </div>

          <div className="ws-report-grid">
            {[
              { id: 'daily', title: 'Daily Team Report', detail: 'Tasks, activities, follow-ups and blockers', icon: <CalendarClock size={18} />, tone: 'var(--chart-2)' },
              { id: 'weekly', title: 'Weekly Performance Report', detail: 'Target progress, quality and coaching notes', icon: <BarChart3 size={18} />, tone: 'var(--chart-1)' },
              { id: 'lead', title: 'Lead Generation Report', detail: 'Team volume, source, location and quality', icon: <Target size={18} />, tone: 'var(--chart-3)' },
              { id: 'campaign', title: 'Campaign Execution Report', detail: 'Live activities, delivery and team contribution', icon: <Rocket size={18} />, tone: 'var(--chart-5)' },
              { id: 'expense', title: 'Expense Report', detail: 'Claims reviewed, forwarded and finance status', icon: <ReceiptText size={18} />, tone: 'var(--chart-6)' },
              { id: 'coaching', title: 'Team Coaching Summary', detail: 'Individual strengths and next actions', icon: <UsersRound size={18} />, tone: 'var(--chart-7)' },
            ].map((report) => (
              <article className="ws-report-card" key={report.id}>
                <span className="ws-report-card__icon" style={{ background: report.tone }}>{report.icon}</span>
                <div className="grow"><h3>{report.title}</h3><p>{report.detail}</p><small>Updated today · local demo data</small></div>
                <div className="ws-report-card__actions"><Button variant="ghost" size="xs" onClick={() => setPreview(report.id)}>Preview</Button><Button variant="soft" size="xs" icon={<Download size={12} />} onClick={() => exportCsv(`senior-${report.id}-report`, [{ header: 'Employee', value: (row) => row.name }, { header: 'Target', value: (row) => row.targetLeads }, { header: 'Leads', value: (row) => row.leadsGenerated }, { header: 'Qualified', value: (row) => row.qualifiedLeads }, { header: 'Follow-ups', value: (row) => row.followUps }], teamMembers)}>CSV</Button></div>
              </article>
            ))}
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title="Team delivery trend" subtitle="Monthly lead output for your direct reports" height="lg" legend={<>{teamMembers.map((member, index) => <LegendItem key={member.employeeId} color={`var(--chart-${(index % 6) + 1})`} label={member.name.split(' ')[0]} />)}</>}>
              <AreaChart data={teamTrend}>
                <defs>{teamMembers.map((member, index) => <linearGradient key={member.employeeId} id={`senior-area-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={`var(--chart-${(index % 6) + 1})`} stopOpacity={0.18} /><stop offset="100%" stopColor={`var(--chart-${(index % 6) + 1})`} stopOpacity={0} /></linearGradient>)}</defs>
                <CartesianGrid {...gridProps} /><XAxis dataKey="month" {...axisProps} /><YAxis {...axisProps} width={34} /><Tooltip content={<ChartTooltip />} />
                {teamMembers.map((member, index) => <Area key={member.employeeId} type="monotone" dataKey={member.name.split(' ')[0]} stroke={`var(--chart-${(index % 6) + 1})`} fill={`url(#senior-area-${index})`} strokeWidth={2} isAnimationActive={chartAnim} />)}
              </AreaChart>
            </ChartCard>
            <SectionCard title="Report contents" subtitle="Built from the local workspace">
              <div className="ws-checklist">
                {['Team tasks and completion status', 'Individual lead and quality metrics', 'Campaign-linked activity', 'Expense review and finance stage', 'Coaching notes and blockers', 'No real customer or finance data'].map((item) => <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>)}
              </div>
              <div className="callout callout--info mt-12"><FileText size={14} /><span>Reports are downloadable CSV demonstrations. They are not official financial or performance records.</span></div>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      <KpiDetailModal detail={kpiDetail} onClose={() => setKpiDetail(null)} />
      <TaskAssignModal open={taskModal} onClose={() => setTaskModal(false)} role="senior" />
      <TaskProgressModal open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)} task={selectedTask} canReview={Boolean(selectedTask && selectedTask.assignedToId !== profile.employeeId)} />
      <IdeaSubmitModal open={ideaModal} onClose={() => setIdeaModal(false)} role="senior" />
      <LeadFormModal open={leadModal} onClose={() => setLeadModal(false)} />
      <LeadUpdateModal open={Boolean(selectedLead)} onClose={() => setSelectedLead(null)} lead={selectedLead} />
      <ActivityLogModal open={activityModal} onClose={() => setActivityModal(false)} />
      <ExpenseReviewModal open={Boolean(selectedExpense)} onClose={() => setSelectedExpenseId(null)} expense={selectedExpense} mode="senior" />
      <SeniorIdeaReviewModal idea={selectedIdea} onClose={() => setSelectedIdea(null)} />

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
              <Avatar name={selectedEmployeeData.name} size="xl" tone="indigo" />
              <div className="grow"><h3>{selectedEmployeeData.name}</h3><p>{selectedEmployeeData.leadsGenerated} leads · {selectedEmployeeData.qualifiedLeads} qualified · {selectedEmployeeData.followUps} follow-ups</p></div>
              <div className="ws-perf-score"><strong>{performanceScore(selectedEmployeeData)}%</strong><span>Performance</span></div>
            </div>
            <div className="ws-detail-grid mt-16">
              <div><span>Target</span><strong>{selectedEmployeeData.targetLeads} leads</strong></div>
              <div><span>Target achievement</span><strong>{formatPercent((selectedEmployeeData.leadsGenerated / selectedEmployeeData.targetLeads) * 100, 1)}</strong></div>
              <div><span>Qualifications</span><strong>{selectedEmployeeData.qualifiedLeads}</strong></div>
              <div><span>Conversions</span><strong>{selectedEmployeeData.conversions}</strong></div>
              <div><span>Campaign participation</span><strong>{selectedEmployeeData.campaignParticipation}</strong></div>
              <div><span>Expense submissions</span><strong>{formatINR(selectedEmployeeData.expenseSubmitted)}</strong></div>
            </div>
            <div className="mt-16"><ProgressBar showValue label="Lead target" value={(selectedEmployeeData.leadsGenerated / selectedEmployeeData.targetLeads) * 100} tone="success" /></div>
            <h4 className="mt-16">Current tasks</h4>
            {teamTasks.filter((task) => task.assignedToId === selectedEmployeeData.employeeId).slice(0, 5).map((task) => (
              <button type="button" className="ws-detail-task-row" key={task.id} onClick={() => { setSelectedEmployee(null); setSelectedTask(task) }}>
                <span className="grow"><strong>{task.title}</strong><small>{task.category} · due {formatDateShort(task.deadline)}</small></span>
                <StatusBadge status={task.status} />
              </button>
            ))}
            <div className="callout callout--info mt-12"><TrendingUp size={14} /><span>Performance is a demonstration composite. Coaching decisions and targets remain local UI state.</span></div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedCampaignData)}
        onClose={() => setSelectedCampaign(null)}
        title={selectedCampaignData?.name ?? 'Campaign execution'}
        description={selectedCampaignData ? `${selectedCampaignData.channel} · ${selectedCampaignData.product}` : undefined}
        size="wide"
        footer={<Button variant="ghost" onClick={() => setSelectedCampaign(null)}>Close</Button>}
      >
        {selectedCampaignData ? (
          <div>
            <p className="text-sm">{selectedCampaignData.objective}</p>
            <div className="ws-detail-grid mt-12">
              <div><span>Status</span><strong>{selectedCampaignData.status}</strong></div>
              <div><span>Owner</span><strong>{selectedCampaignData.owner}</strong></div>
              <div><span>Budget</span><strong>{formatINR(selectedCampaignData.budget)}</strong></div>
              <div><span>Spend</span><strong>{formatINR(selectedCampaignData.spend)}</strong></div>
              <div><span>Leads</span><strong>{selectedCampaignData.kpis.leads}</strong></div>
              <div><span>Qualified</span><strong>{selectedCampaignData.kpis.qualifiedLeads}</strong></div>
            </div>
            <ProgressBar showValue label="Budget utilisation" value={(selectedCampaignData.spend / selectedCampaignData.budget) * 100} tone="brand" />
            <h4 className="mt-16">Assigned team activity</h4>
            {allVisibleTasks.filter((task) => task.campaignId === selectedCampaignData.id).map((task) => (
              <button type="button" className="ws-detail-task-row" key={task.id} onClick={() => { setSelectedCampaign(null); setSelectedTask(task) }}>
                <span className="grow"><strong>{task.title}</strong><small>{task.assignedToName} · {task.progress}% complete</small></span>
                <StatusBadge status={task.status} />
              </button>
            ))}
            <div className="callout callout--info mt-12"><Activity size={14} /><span>Log field or digital activity to update the demonstration execution record.</span></div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="Senior team report preview"
        description="A demonstration report generated from local workspace records."
        size="wide"
        footer={<><Button variant="ghost" onClick={() => setPreview(null)}>Close</Button><Button variant="primary" icon={<Download size={14} />} onClick={() => { exportCsv('senior-team-report-preview', [{ header: 'Employee', value: (row) => row.name }, { header: 'Leads', value: (row) => row.leadsGenerated }, { header: 'Qualified', value: (row) => row.qualifiedLeads }, { header: 'Target', value: (row) => row.targetLeads }], teamMembers); setPreview(null) }}>Download CSV</Button></>}
      >
        <div className="ws-report-preview">
          <div className="ws-report-preview__head"><Badge tone="warning">Demo data</Badge><span>{reportPeriod === 'today' ? 'Today' : reportPeriod === 'month' ? 'October 2026' : 'Week 44 · 2026'}</span></div>
          <div className="ws-report-preview__grid">
            <div><span>Team leads</span><strong>{formatNumber(teamStats.generated)}</strong><small>{formatNumber(teamStats.qualified)} qualified</small></div>
            <div><span>Target progress</span><strong>{formatPercent(teamStats.targetProgress, 1)}</strong><small>{formatNumber(teamStats.target)} target</small></div>
            <div><span>Task completion</span><strong>{teamStats.completion.toFixed(0)}%</strong><small>{teamTasks.length} tasks</small></div>
            <div><span>Pending reviews</span><strong>{teamStats.pendingApprovals}</strong><small>Ideas + expenses</small></div>
          </div>
          <p className="text-sm muted mt-12">This is a local frontend demonstration. It contains no real employee, customer or financial records and is not sent to a manager or Finance/Admin automatically.</p>
        </div>
      </Modal>

    </WorkspaceLayout>
  )
}

function SeniorIdeaReviewModal({ idea, onClose }: { idea: WorkspaceIdea | null; onClose: () => void }) {
  const { updateIdeaStatus } = useRoleWorkspace()
  const { profile } = useDemoRole()
  const { pushToast } = useToast()
  const [comment, setComment] = useState('')

  if (!idea) return null

  const decide = (next: 'Pending Manager Review' | 'Changes Requested' | 'Rejected') => {
    updateIdeaStatus(
      idea.id,
      next,
      {
        actor: profile.name,
        role: profile.roleLabel,
        note: comment.trim() || (next === 'Pending Manager Review' ? 'Recommended to the marketing manager.' : next === 'Rejected' ? 'Returned by the senior executive.' : 'Changes requested before recommendation.'),
        tone: next === 'Rejected' ? 'danger' : next === 'Changes Requested' ? 'warning' : 'success',
      },
      { seniorFeedback: comment.trim() || (next === 'Pending Manager Review' ? 'Recommended for manager review based on field feasibility.' : 'Please refine the idea and resubmit.') },
    )
    pushToast({
      title: next === 'Pending Manager Review' ? 'Recommended to manager' : next === 'Changes Requested' ? 'Changes requested' : 'Idea closed',
      description: 'The junior executive will see your feedback in the local idea timeline.',
      tone: next === 'Rejected' ? 'warning' : 'success',
    })
    onClose()
  }

  return (
    <Modal
      open={Boolean(idea)}
      onClose={onClose}
      title={idea.title}
      description={`Submitted by ${idea.submittedByName} · ${idea.createdAt ? formatDateShort(idea.createdAt) : 'Local demo'}`}
      size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="danger" onClick={() => decide('Rejected')}>Reject</Button><Button variant="soft" onClick={() => decide('Changes Requested')}>Request changes</Button><Button variant="primary" onClick={() => decide('Pending Manager Review')} icon={<Send size={14} />}>Recommend to manager</Button></>}
    >
      <div className="ws-idea-detail">
        <p className="text-sm">{idea.description}</p>
        <div className="ws-detail-grid mt-12">
          <div><span>Expected benefits</span><strong>{idea.expectedBenefits}</strong></div>
          <div><span>Estimated budget</span><strong>{idea.estimatedBudget ? formatINR(idea.estimatedBudget) : 'Not specified'}</strong></div>
          <div><span>Supporting information</span><strong>{idea.supportingInfo || 'No additional notes'}</strong></div>
          <div><span>Current status</span><strong>{idea.status}</strong></div>
        </div>
        {idea.seniorFeedback ? <div className="ws-feedback mt-12"><span>Senior feedback</span><p>{idea.seniorFeedback}</p></div> : null}
        <div className="field mt-16"><label htmlFor="senior-idea-comment">Your recommendation / feedback</label><textarea id="senior-idea-comment" className="textarea" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Explain why this should move to the manager, or what needs to change." /></div>
        <div className="callout callout--warning mt-12"><ShieldCheck size={14} /><span>Your recommendation is not a budget approval. The manager decides whether to take the idea forward and Finance/Admin gives final financial approval if required.</span></div>
      </div>
    </Modal>
  )
}
