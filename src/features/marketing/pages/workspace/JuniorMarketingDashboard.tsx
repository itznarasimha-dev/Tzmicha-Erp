import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
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
  FileText,
  Flag,
  Flame,
  Gauge,
  Lightbulb,
  MapPin,
  Megaphone,
  Phone,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'
import { WorkspaceLayout, KpiGrid, SectionHeading, RoleBadge, TaskCard, IdeaCard, ExpenseCard, ApprovalStepper, AuditTrail, EmptyBlock, PermissionNote, FinanceGateNote, QuickActionCard, StatPill, DemoFooter, expenseStageState } from '../../components/marketing/workspace/WorkspaceKit'
import { TaskProgressModal, IdeaSubmitModal, ExpenseSubmitModal, LeadFormModal, LeadUpdateModal, ActivityLogModal } from '../../components/marketing/workspace/WorkspaceModals'
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
import { EMPLOYEE_PERFORMANCE, CONVERSION_FUNNEL } from '../../data/marketing/workspace'
import { seedLeads } from '../../data/marketing/leads'
import type { WorkspaceExpense, WorkspaceIdea, WorkspaceLead, WorkspaceTask, WorkspaceActivity } from '../../types/workspace'
import { ACTIVITY_TYPES } from '../../context/RoleWorkspaceContext'
import { formatINR, formatINRCompact, formatDateShort, formatNumber, formatPercent, formatTime } from '../../utils/format'
import { daysUntil, isOverdue, isToday } from '../../utils/dates'
import { roleWorkspacePath } from '../../config/roleNavigation'
import { FilterTabs, KpiDetailModal, useCsvExport, type KpiDetail } from './workspaceShared'

const activityIcons: Record<string, typeof Activity> = {
  'Customer Visit': MapPin,
  'Phone Call': Phone,
  'Follow-up': CalendarClock,
  'Field Marketing': Megaphone,
  'Campaign Participation': Sparkles,
  'Digital Marketing': BarChart3,
  'Lead Collection': UserRound,
}

export function JuniorMarketingDashboard({ section = 'dashboard' }: { section?: string }) {
  const navigate = useNavigate()
  const { profile } = useDemoRole()
  const { pushToast } = useToast()
  const exportCsv = useCsvExport()
  const {
    tasks,
    leads,
    activities,
    expenses,
    ideas,
    leadIncrements,
    updateTask,
    updateLead,
  } = useRoleWorkspace()
  const chartAnim = useChartAnimation()

  const [kpiDetail, setKpiDetail] = useState<KpiDetail | null>(null)
  const [taskModalTask, setTaskModalTask] = useState<WorkspaceTask | null>(null)
  const [ideaModal, setIdeaModal] = useState(false)
  const [expenseModal, setExpenseModal] = useState(false)
  const [leadModal, setLeadModal] = useState(false)
  const [activityModal, setActivityModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<WorkspaceLead | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<WorkspaceExpense | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<WorkspaceIdea | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<WorkspaceActivity | null>(null)
  const [taskFilter, setTaskFilter] = useState('open')
  const [leadFilter, setLeadFilter] = useState('All')
  const [leadSearch, setLeadSearch] = useState('')
  const [followFilter, setFollowFilter] = useState('today')
  const [activityFilter, setActivityFilter] = useState('today')
  const [expenseFilter, setExpenseFilter] = useState('all')

  const performance = EMPLOYEE_PERFORMANCE.find((member) => member.employeeId === profile.employeeId)
  const myTasks = tasks.filter((task) => task.assignedToId === profile.employeeId)
  const myLeads = leads.filter((lead) => lead.ownerId === profile.employeeId)
  const myActivities = activities.filter((item) => item.employeeId === profile.employeeId)
  const myExpenses = expenses.filter((expense) => expense.submittedById === profile.employeeId)
  const myIdeas = ideas.filter((idea) => idea.submittedById === profile.employeeId)
  const additions = leadIncrements[profile.employeeId] ?? 0
  const generated = (performance?.leadsGenerated ?? 0) + additions
  const qualified = (performance?.qualifiedLeads ?? 0) + myLeads.filter((lead) => lead.status === 'Qualified').length
  const target = performance?.targetLeads ?? 220
  const targetProgress = target ? (generated / target) * 100 : 0
  const openTasks = myTasks.filter((task) => task.status !== 'Completed')
  const todayTasks = myTasks.filter((task) => isToday(task.deadline) || task.status === 'In Progress')
  const completedTasks = myTasks.filter((task) => task.status === 'Completed')
  const followUpLeads = myLeads.filter((lead) => lead.status === 'Follow-up' || lead.status === 'Qualified')
  const dueFollowUps = followUpLeads.filter((lead) => {
    const days = daysUntil(lead.followUpAt)
    return days !== null && days <= 0
  })
  const displayedFollowUps = followUpLeads.filter((lead) => {
    const days = daysUntil(lead.followUpAt)
    if (followFilter === 'today') return days !== null && days <= 0
    if (followFilter === 'upcoming') return days !== null && days > 0
    if (followFilter === 'overdue') return days !== null && days < 0
    return true
  })
  const activityChart = ACTIVITY_TYPES.map((type, index) => ({
    type,
    count: myActivities.filter((item) => item.type === type).length,
    color: `var(--chart-${(index % 6) + 1})`,
  }))
  const filteredTasks = myTasks.filter((task) => {
    if (taskFilter === 'open') return task.status !== 'Completed'
    if (taskFilter === 'review') return task.status === 'Under Review'
    if (taskFilter === 'completed') return task.status === 'Completed'
    if (taskFilter === 'blocked') return ['Blocked', 'Overdue'].includes(task.status)
    return true
  })
  const displayedLeads = myLeads.filter((lead) => {
    if (leadFilter !== 'All' && lead.status !== leadFilter) return false
    if (!leadSearch.trim()) return true
    const term = leadSearch.toLowerCase()
    return `${lead.name} ${lead.company} ${lead.location} ${lead.requirement}`.toLowerCase().includes(term)
  })
  const visibleActivities = myActivities.filter((item) => {
    if (activityFilter === 'today') return isToday(item.at)
    if (activityFilter === 'planned') return item.status === 'Planned'
    return true
  })
  const filteredExpenses = myExpenses.filter((expense) => {
    if (expenseFilter === 'all') return true
    if (expenseFilter === 'pending') return ['Submitted', 'Under Senior Review', 'Manager Review', 'Finance Review'].includes(expense.status)
    if (expenseFilter === 'approved') return expense.status === 'Approved'
    if (expenseFilter === 'rejected') return ['Rejected', 'Changes Requested'].includes(expense.status)
    return true
  })
  const followUpCount = myLeads.filter((lead) => lead.status === 'Follow-up').length

  const kpiDetails: Record<string, KpiDetail> = {
    today: { label: "Today's Tasks", value: String(todayTasks.length), previous: '3', change: '+1 today', description: 'Tasks scheduled for today or currently in progress.', points: ['Prioritise the festive retail activation.', 'One task is under review with your senior.', 'Update progress before end of day.'] },
    completed: { label: 'Completed Tasks', value: String(completedTasks.length), previous: '4', change: '+1 this week', description: 'Tasks you have completed in the current workspace.', points: ['Completed work stays available for review.', 'Your senior can reopen work if evidence is missing.', 'Task completion feeds team reporting.'] },
    pending: { label: 'Pending Tasks', value: String(openTasks.length), previous: '5', change: '-2 this week', description: 'Assigned tasks that are not yet completed.', points: ['Blocked tasks need a comment.', 'Overdue work is flagged to your senior.', 'Open a task to update progress.'] },
    leads: { label: 'Leads Generated', value: formatNumber(generated), previous: '208', change: '+2.9%', description: 'Cumulative lead generation for the month including new leads you add.', points: ['New leads appear immediately in this workspace.', 'Your target is 220 leads for the month.', 'Lead quality is reviewed by your senior.'] },
    followups: { label: 'Follow-ups Due', value: String(dueFollowUps.length), previous: '2', change: 'Needs action', description: 'Customer follow-ups due today or overdue.', points: ['Update the lead after every conversation.', 'Schedule the next action before closing.', 'Follow-up completion is reported to your senior.'] },
    qualified: { label: 'Qualified Leads', value: formatNumber(qualified), previous: '104', change: '+3.8%', description: 'Qualified leads attributed to you this month.', points: ['Qualified leads continue through the existing ERP workflow.', 'Use verified requirements before qualifying.', 'No customer conversion happens in this demo.'] },
    target: { label: 'Monthly Target Progress', value: formatPercent(targetProgress, 1), previous: '94.5%', change: '+3.2 pts', description: 'Your personal lead target progress.', points: [`${generated} leads against a ${target} target.`, 'Positive performance is visible to your senior.', 'Targets are local demonstration values.'] },
    expenses: { label: 'My Expense Requests', value: String(myExpenses.length), previous: '2', change: `${myExpenses.filter((expense) => expense.status === 'Approved').length} approved`, description: 'Expense claims you have submitted for marketing activities.', points: ['You can only see your own claims.', 'Every claim moves through senior and manager review.', 'Finance/Admin gives final financial approval.'] },
  }

  const pageMap: Record<string, { title: string; subtitle: string; eyebrow: string }> = {
    dashboard: { title: `Good morning, ${profile.name.split(' ')[0]}`, subtitle: 'Here is what to do today, who is waiting for you and how your month is tracking.', eyebrow: 'Junior executive workspace' },
    tasks: { title: 'My Assigned Work', subtitle: 'Pick up a task, update progress and send completed work for review.', eyebrow: 'My tasks' },
    leads: { title: 'Lead Generation', subtitle: 'Capture customer details, requirements and the next follow-up.', eyebrow: 'Field workspace' },
    followups: { title: 'Follow-ups', subtitle: 'Stay close to every customer conversation and next action.', eyebrow: 'Customer contact' },
    activities: { title: 'Daily Marketing Activities', subtitle: 'Log your field, digital and customer work so your day is visible.', eyebrow: 'Activity log' },
    expenses: { title: 'Submit Expenses', subtitle: 'Raise claims for approved marketing activity and track every approval stage.', eyebrow: 'My claims' },
    ideas: { title: 'Submit Ideas', subtitle: 'Share field opportunities with your senior and the marketing manager.', eyebrow: 'Ideas' },
    performance: { title: 'My Performance', subtitle: 'See your target progress, lead quality and delivery trend.', eyebrow: 'Performance' },
  }
  const page = pageMap[section] ?? pageMap.dashboard

  return (
    <WorkspaceLayout
      roleId="junior"
      section={section}
      title={page.title}
      subtitle={page.subtitle}
      eyebrow={page.eyebrow}
      actions={
        <>
          <RoleBadge roleId="junior" />
          {section === 'dashboard' || section === 'tasks' ? <Button variant="primary" icon={<Activity size={15} />} onClick={() => setActivityModal(true)}>Log activity</Button> : null}
          {section === 'leads' ? <Button variant="primary" icon={<Plus size={15} />} onClick={() => setLeadModal(true)}>Add lead</Button> : null}
          {section === 'expenses' ? <Button variant="primary" icon={<ReceiptText size={15} />} onClick={() => setExpenseModal(true)}>Submit expense</Button> : null}
          {section === 'ideas' ? <Button variant="primary" icon={<Lightbulb size={15} />} onClick={() => setIdeaModal(true)}>Submit new idea</Button> : null}
          {section === 'followups' ? <Button variant="primary" icon={<Activity size={15} />} onClick={() => setActivityModal(true)}>Log follow-up</Button> : null}
        </>
      }
      meta={
        <>
          <StatPill icon={<Target size={13} />} label="Monthly target" value={`${targetProgress.toFixed(0)}%`} />
          <StatPill icon={<ClipboardList size={13} />} label="Open tasks" value={openTasks.length} />
          <StatPill icon={<ReceiptText size={13} />} label="My claims" value={myExpenses.length} />
        </>
      }
    >
      {section === 'dashboard' ? (
        <>
          <div className="ws-junior-hero">
            <div className="ws-junior-hero__main">
              <span className="ws-junior-hero__eyebrow"><Flame size={13} /> Today’s focus</span>
              <h2>Your festive field plan is moving. Finish the retail activation and clear the follow-ups on your list.</h2>
              <p>You have {openTasks.length} open {openTasks.length === 1 ? 'task' : 'tasks'} to move forward and {dueFollowUps.length} {dueFollowUps.length === 1 ? 'follow-up' : 'follow-ups'} due today. Your monthly target is {targetProgress.toFixed(1)}% complete.</p>
              <div className="row-8 wrap mt-12">
                <Button variant="primary" icon={<ClipboardCheck size={14} />} onClick={() => navigate(roleWorkspacePath('tasks'))}>Open my tasks</Button>
                <Button variant="soft" icon={<Plus size={14} />} onClick={() => setLeadModal(true)}>Add new lead</Button>
                <Button variant="ghost" icon={<Lightbulb size={14} />} onClick={() => setIdeaModal(true)}>Submit idea</Button>
              </div>
            </div>
            <div className="ws-target-ring" style={{ ['--ws-ring-value' as string]: `${Math.min(100, targetProgress)}%` }}>
              <div className="ws-target-ring__inner"><strong>{targetProgress.toFixed(0)}%</strong><span>of target</span></div>
              <p>{generated} / {target} leads</p>
            </div>
          </div>

          <KpiGrid columns={4}>
            <KpiCard index={0} label="Today's Tasks" value={todayTasks.length} format={formatNumber} icon={<CalendarClock size={17} />} tone="var(--chart-6)" trend={{ value: 10, label: 'vs yesterday' }} hint="Scheduled for today" onClick={() => setKpiDetail(kpiDetails.today)} />
            <KpiCard index={1} label="Completed Tasks" value={completedTasks.length} format={formatNumber} icon={<Check size={17} />} tone="var(--chart-7)" trend={{ value: 8.3, label: 'this week' }} hint={`${myTasks.length} total assignments`} onClick={() => setKpiDetail(kpiDetails.completed)} />
            <KpiCard index={2} label="Pending Tasks" value={openTasks.length} format={formatNumber} icon={<ClipboardList size={17} />} tone="var(--chart-3)" trend={{ value: -4.8, label: 'vs last week', positiveIsGood: false }} hint="Including one blocked task" onClick={() => setKpiDetail(kpiDetails.pending)} />
            <KpiCard index={3} label="Leads Generated" value={generated} format={formatNumber} icon={<Target size={17} />} tone="var(--chart-1)" trend={{ value: 2.9, label: 'vs last month' }} spark={performance?.monthlyTrend ?? []} hint="Including new local leads" onClick={() => setKpiDetail(kpiDetails.leads)} />
            <KpiCard index={4} label="Follow-ups Due" value={dueFollowUps.length} format={formatNumber} icon={<Phone size={17} />} tone="var(--chart-4)" trend={{ value: null, label: 'Due today' }} hint="Customers waiting for a response" onClick={() => setKpiDetail(kpiDetails.followups)} />
            <KpiCard index={5} label="Qualified Leads" value={qualified} format={formatNumber} icon={<BadgeCheck size={17} />} tone="var(--chart-2)" trend={{ value: 3.8, label: 'vs last month' }} hint="Ready for the existing sales workflow" onClick={() => setKpiDetail(kpiDetails.qualified)} />
            <KpiCard index={6} label="Monthly Target Progress" value={targetProgress} format={(value) => `${value.toFixed(1)}%`} icon={<TrendingUp size={17} />} tone="var(--chart-5)" trend={{ value: 3.2, label: 'points vs last month' }} hint={`${generated} of ${target} leads`} onClick={() => setKpiDetail(kpiDetails.target)} />
            <KpiCard index={7} label="My Expense Requests" value={myExpenses.length} format={formatNumber} icon={<ReceiptText size={17} />} tone="var(--chart-8)" hint={`${myExpenses.filter((expense) => expense.status === 'Approved').length} approved · ${myExpenses.filter((expense) => expense.status !== 'Approved' && expense.status !== 'Rejected').length} in progress`} onClick={() => setKpiDetail(kpiDetails.expenses)} />
          </KpiGrid>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="Priority tasks" subtitle="Work through these first" actions={<Button variant="ghost" size="xs" onClick={() => navigate(roleWorkspacePath('tasks'))}>All tasks <ArrowRight size={12} /></Button>}>
              <div className="ws-task-list">
                {openTasks.slice(0, 4).map((task) => (
                  <button type="button" key={task.id} className="ws-today-task" onClick={() => setTaskModalTask(task)}>
                    <span className={`ws-today-task__priority is-${task.priority.toLowerCase()}`} />
                    <span className="grow"><strong>{task.title}</strong><small>{task.assignedByName} · {task.expectedResult}</small><span className="ws-today-task__bar"><ProgressBar value={task.progress} tone={task.status === 'Blocked' ? 'danger' : 'brand'} size="sm" /></span></span>
                    <span className="ws-today-task__meta"><StatusBadge status={task.status} /><small>{isOverdue(task.deadline) ? 'Overdue' : isToday(task.deadline) ? 'Due today' : formatDateShort(task.deadline)}</small></span>
                    <ChevronRight size={15} className="faint" />
                  </button>
                ))}
                {!openTasks.length ? <EmptyBlock title="All caught up" description="You have no open assignments. Check back for new work from your senior." icon={<BadgeCheck size={20} />} /> : null}
              </div>
            </SectionCard>
            <SectionCard title="Follow-ups due" subtitle="Keep every customer conversation warm" actions={<Button variant="ghost" size="xs" onClick={() => navigate(roleWorkspacePath('followups'))}>Open <ArrowRight size={12} /></Button>}>
              <div className="ws-stack">
                {followUpLeads.slice(0, 3).map((lead) => (
                  <button type="button" key={lead.id} className="ws-follow-mini" onClick={() => setSelectedLead(lead)}>
                    <span className="ws-follow-mini__avatar"><Avatar name={lead.name} size="sm" /></span>
                    <span className="grow"><strong>{lead.name}</strong><small>{lead.company} · {lead.requirement.slice(0, 44)}…</small></span>
                    <span className={`ws-follow-mini__when ${isOverdue(lead.followUpAt) ? 'is-late' : ''}`}>{isOverdue(lead.followUpAt) ? 'Overdue' : 'Today'}</span>
                  </button>
                ))}
                {!followUpLeads.length ? <EmptyBlock title="No follow-ups due" description="Your lead workspace is clear for now." icon={<Phone size={20} />} /> : null}
              </div>
              <div className="callout callout--info mt-12"><CalendarClock size={14} /><span>Log the conversation after every call so your senior can see what changed.</span></div>
            </SectionCard>
          </div>

          <SectionHeading title="Quick actions" subtitle="The things you do most often, one tap away." />
          <div className="ws-quick-grid">
            <QuickActionCard title="Add a new lead" description="Capture customer details and schedule follow-up" icon={<UserRound size={17} />} tone="var(--chart-1)" onClick={() => setLeadModal(true)} />
            <QuickActionCard title="Log today’s activity" description="Customer visits, calls and field work" icon={<Activity size={17} />} tone="var(--chart-2)" onClick={() => setActivityModal(true)} />
            <QuickActionCard title="Submit an expense" description="Link a claim to an assigned task" icon={<ReceiptText size={17} />} tone="var(--chart-3)" onClick={() => setExpenseModal(true)} />
            <QuickActionCard title="Share an idea" description="Tell your senior about a new opportunity" icon={<Lightbulb size={17} />} tone="var(--chart-6)" onClick={() => setIdeaModal(true)} />
          </div>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="Today’s activity timeline" subtitle="What you have completed so far">
              <div className="ws-activity-timeline">
                {myActivities.slice(0, 5).map((activity) => {
                  const Icon = activityIcons[activity.type] ?? Activity
                  return (
                    <button type="button" className="ws-activity-row" key={activity.id} onClick={() => setSelectedActivity(activity)}>
                      <span className={`ws-activity-row__icon ${activity.status === 'Planned' ? 'is-planned' : ''}`}><Icon size={14} /></span>
                      <span className="ws-activity-row__line" aria-hidden="true" />
                      <span className="grow"><strong>{activity.title}</strong><small>{activity.type} · {activity.duration} min{activity.leadsCaptured ? ` · ${activity.leadsCaptured} leads` : ''}</small></span>
                      <span className="ws-activity-row__time">{activity.status === 'Planned' ? 'Planned' : formatTime(activity.at)}</span>
                    </button>
                  )
                })}
              </div>
            </SectionCard>
            <div className="ws-stack">
              <SectionCard title="Latest idea" subtitle="Your submission status">
                {myIdeas[0] ? <IdeaCard idea={myIdeas[0]} onClick={() => setSelectedIdea(myIdeas[0])} actions={<Button variant="ghost" size="xs" onClick={() => setSelectedIdea(myIdeas[0])}>View feedback</Button>} /> : <EmptyBlock title="No ideas yet" description="Share a field insight with your senior." action={<Button variant="soft" size="sm" onClick={() => setIdeaModal(true)}>Submit idea</Button>} />}
              </SectionCard>
              <SectionCard title="Latest expense" subtitle="Track who needs to act next">
                {myExpenses[0] ? <ExpenseCard expense={myExpenses[0]} onClick={() => setSelectedExpense(myExpenses[0])} actions={<Button variant="ghost" size="xs" onClick={() => setSelectedExpense(myExpenses[0])}>Track status</Button>} /> : <EmptyBlock title="No claims submitted" description="Raise an expense for an assigned activity." action={<Button variant="soft" size="sm" onClick={() => setExpenseModal(true)}>Submit expense</Button>} />}
              </SectionCard>
            </div>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'tasks' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="My task filter" value={taskFilter} onChange={setTaskFilter} options={[
              { id: 'open', label: 'Open', count: openTasks.length },
              { id: 'review', label: 'Under review', count: myTasks.filter((task) => task.status === 'Under Review').length },
              { id: 'blocked', label: 'Issues', count: myTasks.filter((task) => ['Blocked', 'Overdue'].includes(task.status)).length },
              { id: 'completed', label: 'Completed', count: completedTasks.length },
              { id: 'all', label: 'All', count: myTasks.length },
            ]} />
            <Button variant="soft" size="sm" icon={<Activity size={14} />} onClick={() => setActivityModal(true)}>Log work</Button>
          </div>
          <div className="ws-task-grid">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={() => setTaskModalTask(task)}
                actions={
                  <>
                    {task.status !== 'Completed' && task.status !== 'Under Review' ? <Button variant="soft" size="xs" onClick={() => updateTask(task.id, { status: 'In Progress', progress: Math.max(task.progress, 10) })}>Start</Button> : null}
                    {task.status === 'In Progress' ? <Button variant="primary" size="xs" onClick={() => updateTask(task.id, { status: 'Under Review', progress: Math.max(task.progress, 90) })}>Submit review</Button> : null}
                    {task.status === 'Under Review' ? <Button variant="ghost" size="xs" onClick={() => setTaskModalTask(task)}>View feedback</Button> : null}
                    {task.status === 'Completed' ? <Badge tone="success">Completed</Badge> : <Button variant="ghost" size="xs" onClick={() => setTaskModalTask(task)}>Update</Button>}
                  </>
                }
              />
            ))}
          </div>
          {!filteredTasks.length ? <EmptyBlock title="No tasks in this view" description="Switch the filter or wait for a new assignment from your manager or senior." icon={<ClipboardList size={20} />} /> : null}
          <div className="callout callout--info mt-16"><Flag size={14} /><span>If something is blocking delivery, open the task and report the issue. Your senior will see the note and can help.</span></div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'leads' ? (
        <>
          <div className="ws-summary-strip">
            <StatPill icon={<Target size={14} />} label="My leads" value={myLeads.length} />
            <StatPill icon={<Phone size={14} />} label="Follow-up due" value={followUpCount} />
            <StatPill icon={<BadgeCheck size={14} />} label="Qualified" value={myLeads.filter((lead) => lead.status === 'Qualified').length} />
            <StatPill icon={<TrendingUp size={14} />} label="Target progress" value={formatPercent(targetProgress, 1)} />
            <StatPill icon={<CalendarClock size={14} />} label="Added this month" value={additions} />
          </div>

          <div className="ws-inline-toolbar mt-18">
            <FilterTabs ariaLabel="Lead status" value={leadFilter} onChange={setLeadFilter} options={[
              { id: 'All', label: 'All', count: myLeads.length },
              { id: 'New Lead', label: 'New', count: myLeads.filter((lead) => lead.status === 'New Lead').length },
              { id: 'Follow-up', label: 'Follow-up', count: myLeads.filter((lead) => lead.status === 'Follow-up').length },
              { id: 'Qualified', label: 'Qualified', count: myLeads.filter((lead) => lead.status === 'Qualified').length },
              { id: 'Rejected', label: 'Rejected', count: myLeads.filter((lead) => lead.status === 'Rejected').length },
            ]} />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setLeadModal(true)}>Add new lead</Button>
          </div>

          <SectionCard title="My lead workspace" subtitle="Only leads assigned to you appear here." actions={<input className="input ws-search" placeholder="Search name, company or location" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} aria-label="Search my leads" />}>
            <div className="ws-lead-grid">
              {displayedLeads.map((lead) => (
                <button type="button" className="ws-lead-card" key={lead.id} onClick={() => setSelectedLead(lead)}>
                  <div className="ws-lead-card__head"><Avatar name={lead.name} size="sm" /><StatusBadge status={lead.status} /></div>
                  <h3>{lead.name}</h3>
                  <p>{lead.company}</p>
                  <div className="ws-lead-requirement">{lead.requirement}</div>
                  <div className="ws-lead-card__meta"><span><MapPin size={11} /> {lead.location}</span><span>{lead.source}</span></div>
                  <div className="ws-lead-card__foot"><span>Follow-up · {formatDateShort(lead.followUpAt)}</span><span className={isOverdue(lead.followUpAt) ? 'is-late' : ''}>{isOverdue(lead.followUpAt) ? 'Overdue' : isToday(lead.followUpAt) ? 'Today' : 'Scheduled'}</span></div>
                </button>
              ))}
            </div>
            {!displayedLeads.length ? <EmptyBlock title="No leads in this view" description={myLeads.length ? 'Try another status or search term.' : 'Add your first lead to start building your pipeline.'} icon={<Target size={20} />} action={<Button variant="primary" size="sm" onClick={() => setLeadModal(true)}>Add lead</Button>} /> : null}
          </SectionCard>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <ChartCard title="My monthly lead trend" subtitle="Generated leads over six months" height="md" legend={<LegendItem color="var(--chart-1)" label="Leads generated" />}>
              <AreaChart data={(performance?.monthlyTrend ?? []).map((value, index) => ({ month: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][index], leads: value }))}>
                <defs><linearGradient id="junior-lead-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid {...gridProps} /><XAxis dataKey="month" {...axisProps} /><YAxis {...axisProps} width={34} /><Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" fill="url(#junior-lead-area)" strokeWidth={2.2} isAnimationActive={chartAnim} />
              </AreaChart>
            </ChartCard>
            <SectionCard title="Lead quality guide" subtitle="Capture the details that matter">
              <div className="ws-checklist">
                {['Customer name and verified phone number', 'Requirement, preferred product and timeline', 'Location and best time to contact', 'Lead source and campaign context', 'A specific next follow-up date', 'Notes from the conversation'].map((item) => <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>)}
              </div>
              <div className="callout callout--info mt-12"><Target size={14} /><span>Qualified leads continue through the existing ERP customer-conversion workflow. This workspace only captures the marketing activity.</span></div>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'followups' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Follow-up filter" value={followFilter} onChange={setFollowFilter} options={[
              { id: 'today', label: 'Due today', count: dueFollowUps.length },
              { id: 'overdue', label: 'Overdue', count: followUpLeads.filter((lead) => isOverdue(lead.followUpAt)).length },
              { id: 'upcoming', label: 'Upcoming', count: followUpLeads.filter((lead) => (daysUntil(lead.followUpAt) ?? 0) > 0).length },
              { id: 'all', label: 'All', count: followUpLeads.length },
            ]} />
            <Button variant="primary" size="sm" icon={<Activity size={14} />} onClick={() => setActivityModal(true)}>Log follow-up</Button>
          </div>

          <div className="ws-follow-layout">
            <SectionCard title="Follow-up queue" subtitle="Keep the next action visible for every customer." className="ws-follow-layout__queue">
              <div className="ws-follow-list">
                {displayedFollowUps.map((lead) => {
                  const days = daysUntil(lead.followUpAt)
                  const workspaceLead = myLeads.find((item) => item.id === lead.id)
                  return (
                    <article className="ws-follow-card" key={lead.id}>
                      <div className="ws-follow-card__head"><Avatar name={lead.name} size="md" /><div className="grow"><h3>{lead.name}</h3><p>{lead.company} · {lead.location}</p></div><span className={`ws-follow-card__badge ${days !== null && days < 0 ? 'is-late' : days === 0 ? 'is-today' : ''}`}>{days === null ? 'No date' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `In ${days}d`}</span></div>
                      <p className="ws-follow-card__requirement">{lead.requirement}</p>
                      <div className="ws-follow-card__meta"><span><Phone size={12} /> {lead.phone}</span><span><CalendarClock size={12} /> {formatDateShort(lead.followUpAt)}</span><StatusBadge status={lead.status} /></div>
                      <div className="ws-follow-card__actions">
                        <Button variant="soft" size="xs" onClick={() => { if (workspaceLead) setSelectedLead(workspaceLead); else pushToast({ title: 'Sample lead', description: 'Add this customer as a workspace lead to update their follow-up here.', tone: 'info' }) }}>Update lead</Button>
                        <Button variant="ghost" size="xs" icon={<Activity size={12} />} onClick={() => setActivityModal(true)}>Log contact</Button>
                      </div>
                    </article>
                  )
                })}
                {!displayedFollowUps.length ? <EmptyBlock title="No follow-ups in this view" description="Great work. Switch to upcoming to see what is next." icon={<Phone size={20} />} /> : null}
              </div>
            </SectionCard>
            <div className="ws-stack">
              <SectionCard title="Follow-up health" subtitle="Your customer discipline">
                <div className="ws-follow-health">
                  <div className="ws-follow-health__ring" style={{ ['--ws-ring-value' as string]: `${Math.min(100, (1 - dueFollowUps.length / Math.max(1, followUpLeads.length)) * 100)}%` }}><strong>{Math.round((1 - dueFollowUps.length / Math.max(1, followUpLeads.length)) * 100)}%</strong><span>on time</span></div>
                  <div className="ws-follow-health__list"><span><strong>{dueFollowUps.length}</strong>Due today / overdue</span><span><strong>{followUpLeads.filter((lead) => (daysUntil(lead.followUpAt) ?? 0) > 0).length}</strong>Upcoming</span><span><strong>{myLeads.filter((lead) => lead.status === 'Qualified').length}</strong>Qualified</span></div>
                </div>
              </SectionCard>
              <SectionCard title="Good follow-up habits" subtitle="Simple actions that improve quality">
                <div className="ws-checklist">
                  {['Call at the time the customer requested', 'Confirm the requirement before recommending a product', 'Set the next follow-up before ending the call', 'Log the outcome while it is fresh', 'Escalate a stuck lead to your senior'].map((item) => <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>)}
                </div>
              </SectionCard>
            </div>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'activities' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Activity period" value={activityFilter} onChange={setActivityFilter} options={[{ id: 'today', label: 'Today', count: myActivities.filter((item) => isToday(item.at)).length }, { id: 'week', label: 'This week', count: myActivities.length }, { id: 'planned', label: 'Planned', count: myActivities.filter((item) => item.status === 'Planned').length }]} />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setActivityModal(true)}>Log activity</Button>
          </div>

          <KpiGrid columns={4}>
            <KpiCard index={0} label="Activities today" value={myActivities.filter((item) => isToday(item.at)).length} format={formatNumber} icon={<Activity size={17} />} tone="var(--chart-2)" hint="Logged or completed today" />
            <KpiCard index={1} label="Leads captured" value={myActivities.reduce((sum, item) => sum + item.leadsCaptured, 0)} format={formatNumber} icon={<UserRound size={17} />} tone="var(--chart-1)" hint="From logged field activity" />
            <KpiCard index={2} label="Time in field" value={myActivities.reduce((sum, item) => sum + item.duration, 0)} format={(value) => `${Math.round(value / 60)}h`} icon={<CalendarClock size={17} />} tone="var(--chart-3)" hint="Customer and field minutes logged" />
            <KpiCard index={3} label="Planned next" value={myActivities.filter((item) => item.status === 'Planned').length} format={formatNumber} icon={<ClipboardCheck size={17} />} tone="var(--chart-6)" hint="Activities on the calendar" />
          </KpiGrid>

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="Activity timeline" subtitle={activityFilter === 'today' ? 'Today’s work' : 'Recent marketing activity'}>
              <div className="ws-activity-timeline">
                {visibleActivities.map((activity) => {
                  const Icon = activityIcons[activity.type] ?? Activity
                  return (
                    <button type="button" key={activity.id} className="ws-activity-row" onClick={() => setSelectedActivity(activity)}>
                      <span className={`ws-activity-row__icon ${activity.status === 'Planned' ? 'is-planned' : ''}`}><Icon size={14} /></span>
                      <span className="ws-activity-row__line" aria-hidden="true" />
                      <span className="grow"><strong>{activity.title}</strong><small>{activity.detail}</small><em>{activity.type} · {activity.duration} min{activity.leadsCaptured ? ` · ${activity.leadsCaptured} leads` : ''}</em></span>
                      <span className="ws-activity-row__time">{activity.status === 'Planned' ? 'Planned' : formatTime(activity.at)}</span>
                    </button>
                  )
                })}
              </div>
              {!visibleActivities.length ? <EmptyBlock title="Nothing logged here yet" description="Log your first activity or switch to this week." action={<Button variant="primary" size="sm" onClick={() => setActivityModal(true)}>Log activity</Button>} /> : null}
            </SectionCard>
            <ChartCard title="Activity mix" subtitle="How you spend your field time" height="md" legend={<PieLegend items={activityChart.map((item) => ({ name: item.type, value: item.count, color: item.color }))} />}>
              <PieChart><Pie data={activityChart} dataKey="count" nameKey="type" innerRadius="55%" outerRadius="82%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={chartAnim}>{activityChart.map((item) => <Cell key={item.type} fill={item.color} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart>
            </ChartCard>
          </div>

          <div className="ws-grid ws-grid--1-1 mt-18">
            <ChartCard title="Weekly activity volume" subtitle="Logged activity count by type" height="md">
              <BarChart data={activityChart} layout="vertical" margin={{ left: 3, right: 12 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical /><XAxis type="number" {...axisProps} allowDecimals={false} /><YAxis type="category" dataKey="type" {...axisProps} width={112} /><Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Activities" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={chartAnim} />
              </BarChart>
            </ChartCard>
            <SectionCard title="Daily activity checklist" subtitle="A balanced field day">
              <div className="ws-checklist">
                {['Customer visits and requirement notes', 'Follow-up calls with clear outcomes', 'New lead collection with verified details', 'Campaign or retail partner support', 'Digital engagement where relevant', 'End-of-day update to your senior'].map((item) => <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>)}
              </div>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'expenses' ? (
        <>
          <div className="ws-inline-toolbar">
            <FilterTabs ariaLabel="Expense status" value={expenseFilter} onChange={setExpenseFilter} options={[
              { id: 'all', label: 'All claims', count: myExpenses.length },
              { id: 'pending', label: 'In progress', count: myExpenses.filter((expense) => ['Submitted', 'Under Senior Review', 'Manager Review', 'Finance Review'].includes(expense.status)).length },
              { id: 'approved', label: 'Approved', count: myExpenses.filter((expense) => expense.status === 'Approved').length },
              { id: 'rejected', label: 'Returned', count: myExpenses.filter((expense) => ['Rejected', 'Changes Requested'].includes(expense.status)).length },
            ]} />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setExpenseModal(true)}>Submit expense</Button>
          </div>

          <div className="ws-summary-strip">
            <StatPill icon={<ReceiptText size={14} />} label="Claims submitted" value={myExpenses.length} />
            <StatPill icon={<BadgeCheck size={14} />} label="Approved" value={myExpenses.filter((expense) => expense.status === 'Approved').length} />
            <StatPill icon={<CalendarClock size={14} />} label="In review" value={myExpenses.filter((expense) => ['Submitted', 'Under Senior Review', 'Manager Review', 'Finance Review'].includes(expense.status)).length} />
            <StatPill icon={<TrendingUp size={14} />} label="Reimbursed value" value={formatINRCompact(myExpenses.filter((expense) => expense.status === 'Approved').reduce((sum, expense) => sum + expense.amount, 0))} />
            <StatPill icon={<ShieldCheck size={14} />} label="Final approver" value="Finance/Admin" />
          </div>

          <div className="ws-expense-grid mt-18">
            {filteredExpenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} onClick={() => setSelectedExpense(expense)} actions={<Button variant="ghost" size="xs" onClick={() => setSelectedExpense(expense)}>Track approval</Button>} />
            ))}
          </div>
          {!filteredExpenses.length ? <EmptyBlock title="No claims in this view" description={myExpenses.length ? 'Switch the filter to see other expenses.' : 'Submit a claim for travel, meetings, printing or field activity.'} icon={<ReceiptText size={20} />} action={<Button variant="primary" size="sm" onClick={() => setExpenseModal(true)}>Submit expense</Button>} /> : null}

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="How your expense approval works" subtitle="You can track every stage, but only reviewers can act.">
              <ApprovalStepper currentStage="senior" status="Under Senior Review" />
              <div className="ws-route-list mt-12">
                <div><span>1</span><strong>You submit</strong><small>Attach the expense to an assigned task</small></div>
                <div><span>2</span><strong>Senior reviews</strong><small>Checks the activity and receipt</small></div>
                <div><span>3</span><strong>Manager reviews</strong><small>Checks marketing need and budget</small></div>
                <div><span>4</span><strong>Finance/Admin</strong><small>Gives final financial approval</small></div>
              </div>
            </SectionCard>
            <SectionCard title="Claim tips" subtitle="Faster review starts here">
              <div className="ws-checklist">
                {['Link the expense to the right task', 'Add a clear title and description', 'Attach a readable receipt name', 'Use the correct expense category', 'Submit within the month of spend'].map((item) => <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>)}
              </div>
              <FinanceGateNote />
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'ideas' ? (
        <>
          <div className="ws-junior-hero ws-junior-hero--idea">
            <div className="ws-junior-hero__main">
              <span className="ws-junior-hero__eyebrow"><Lightbulb size={13} /> You see the customer first</span>
              <h2>Have an idea that could win more customers?</h2>
              <p>Share a new location, campaign improvement, advertising opportunity or resource need. Your senior reviews it first, then the marketing manager decides.</p>
              <div className="row-8 wrap mt-12"><Button variant="primary" icon={<Plus size={14} />} onClick={() => setIdeaModal(true)}>Submit new idea</Button><Button variant="ghost" onClick={() => navigate(roleWorkspacePath('performance'))}>See my performance</Button></div>
            </div>
            <div className="ws-idea-count"><strong>{myIdeas.length}</strong><span>ideas shared</span><small>{myIdeas.filter((idea) => ['Approved', 'Forwarded to Finance'].includes(idea.status)).length} approved</small></div>
          </div>

          <SectionHeading title="My ideas" subtitle="Track status, senior feedback and the manager’s decision." />
          <div className="ws-idea-grid">
            {myIdeas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onClick={() => setSelectedIdea(idea)} actions={<Button variant="ghost" size="xs" onClick={() => setSelectedIdea(idea)}>View status</Button>} />
            ))}
          </div>
          {!myIdeas.length ? <EmptyBlock title="No ideas submitted yet" description="The best ideas often come from conversations in the field. Share what you are seeing." icon={<Lightbulb size={20} />} action={<Button variant="primary" size="sm" onClick={() => setIdeaModal(true)}>Submit idea</Button>} /> : null}

          <div className="ws-grid ws-grid--2-1 mt-18">
            <SectionCard title="Idea workflow" subtitle="What happens after you submit">
              <ApprovalStepper currentStage="senior" status="Under Senior Review" />
              <div className="ws-route-list mt-12">
                <div><span>1</span><strong>You submit</strong><small>Add the opportunity and expected benefit</small></div>
                <div><span>2</span><strong>Senior reviews</strong><small>Recommends or asks for more detail</small></div>
                <div><span>3</span><strong>Manager decides</strong><small>Approves the marketing direction</small></div>
                <div><span>4</span><strong>Finance/Admin</strong><small>Only if a budget is required</small></div>
              </div>
            </SectionCard>
            <SectionCard title="Make your idea stronger" subtitle="A simple structure">
              <div className="ws-checklist">
                {['What customer problem did you observe?', 'Which location or audience is affected?', 'What activity do you recommend?', 'What result do you expect?', 'What would it cost?', 'What evidence can you attach?'].map((item) => <div key={item} className="ws-checklist__row"><span><Check size={12} /></span>{item}</div>)}
              </div>
              <div className="callout callout--info mt-12"><Sparkles size={14} /><span>Manager approval is a marketing decision. Finance/Admin gives final financial approval when budget is needed.</span></div>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      {section === 'performance' ? (
        <>
          <div className="ws-grid ws-grid--1-2">
            <SectionCard title="Monthly target" subtitle={`${generated} of ${target} leads delivered`}>
              <div className="ws-perf-target">
                <div className="ws-target-ring ws-target-ring--large" style={{ ['--ws-ring-value' as string]: `${Math.min(100, targetProgress)}%` }}><div className="ws-target-ring__inner"><strong>{targetProgress.toFixed(0)}%</strong><span>complete</span></div></div>
                <div className="ws-perf-target__copy"><h3>{target - generated} leads to go</h3><p>You are {targetProgress >= 90 ? 'ahead of the monthly pace' : 'within reach of the monthly target'}. Keep follow-up quality high as you close the gap.</p><ProgressBar showValue value={targetProgress} tone={targetProgress >= 90 ? 'success' : 'brand'} /></div>
              </div>
            </SectionCard>
            <ChartCard title="Six-month lead trend" subtitle="Your personal lead generation" height="md" legend={<LegendItem color="var(--chart-1)" label="Leads generated" />}>
              <AreaChart data={(performance?.monthlyTrend ?? []).map((value, index) => ({ month: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][index], leads: value }))}>
                <defs><linearGradient id="junior-perf-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid {...gridProps} /><XAxis dataKey="month" {...axisProps} /><YAxis {...axisProps} width={34} /><Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" fill="url(#junior-perf-area)" strokeWidth={2.2} isAnimationActive={chartAnim} />
              </AreaChart>
            </ChartCard>
          </div>

          <div className="ws-perf-stat-grid mt-18">
            <div className="ws-perf-stat"><span><Target size={15} /></span><strong>{generated}</strong><small>Leads generated</small><em>+2.9% vs last month</em></div>
            <div className="ws-perf-stat"><span><BadgeCheck size={15} /></span><strong>{qualified}</strong><small>Qualified leads</small><em>{formatPercent((qualified / Math.max(1, generated)) * 100, 1)} quality rate</em></div>
            <div className="ws-perf-stat"><span><TrendingUp size={15} /></span><strong>{performance?.conversions ?? 0}</strong><small>Conversions</small><em>Existing sales workflow</em></div>
            <div className="ws-perf-stat"><span><Phone size={15} /></span><strong>{performance?.followUps ?? 0}</strong><small>Follow-ups</small><em>Customer conversations</em></div>
            <div className="ws-perf-stat"><span><ClipboardCheck size={15} /></span><strong>{myTasks.length ? Math.round((completedTasks.length / myTasks.length) * 100) : 0}%</strong><small>Task completion</small><em>{completedTasks.length} of {myTasks.length} tasks</em></div>
            <div className="ws-perf-stat"><span><Megaphone size={15} /></span><strong>{performance?.campaignParticipation ?? 0}</strong><small>Campaigns</small><em>Active participation</em></div>
          </div>

          <div className="ws-grid ws-grid--1-1-1 mt-18">
            <SectionCard title="Lead quality funnel" subtitle="Your marketing contribution">
              <Funnel stages={CONVERSION_FUNNEL} compact />
            </SectionCard>
            <ChartCard title="Activity contribution" subtitle="Where your week goes" height="md">
              <BarChart data={activityChart} layout="vertical" margin={{ left: 2, right: 10 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical /><XAxis type="number" {...axisProps} allowDecimals={false} /><YAxis type="category" dataKey="type" {...axisProps} width={105} /><Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Activities" fill="var(--chart-6)" radius={[0, 4, 4, 0]} maxBarSize={13} isAnimationActive={chartAnim} />
              </BarChart>
            </ChartCard>
            <SectionCard title="Feedback & next steps" subtitle="What your senior is seeing">
              <div className="ws-feedback-list">
                <div><span className="ws-feedback-list__icon is-success"><BadgeCheck size={13} /></span><p><strong>Strong field consistency.</strong> Keep capturing verified requirements with every new lead.</p></div>
                <div><span className="ws-feedback-list__icon is-warning"><TrendingUp size={13} /></span><p><strong>Close the follow-up gap.</strong> Two customers are waiting for today’s call.</p></div>
                <div><span className="ws-feedback-list__icon is-info"><Lightbulb size={13} /></span><p><strong>Keep sharing ideas.</strong> Your apartment activation idea is being reviewed.</p></div>
              </div>
              <Button variant="ghost" size="sm" className="mt-12" icon={<ArrowRight size={13} />} onClick={() => navigate(roleWorkspacePath('tasks'))}>Open my tasks</Button>
            </SectionCard>
          </div>
          <DemoFooter />
        </>
      ) : null}

      <KpiDetailModal detail={kpiDetail} onClose={() => setKpiDetail(null)} />
      <TaskProgressModal open={Boolean(taskModalTask)} onClose={() => setTaskModalTask(null)} task={taskModalTask} />
      <IdeaSubmitModal open={ideaModal} onClose={() => setIdeaModal(false)} role="junior" />
      <ExpenseSubmitModal open={expenseModal} onClose={() => setExpenseModal(false)} tasks={myTasks} />
      <LeadFormModal open={leadModal} onClose={() => setLeadModal(false)} />
      <LeadUpdateModal open={Boolean(selectedLead)} onClose={() => setSelectedLead(null)} lead={selectedLead} />
      <ActivityLogModal open={activityModal} onClose={() => setActivityModal(false)} />

      <Modal
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        title={selectedExpense?.title ?? 'Expense status'}
        description={selectedExpense ? `${selectedExpense.category} · ${formatINR(selectedExpense.amount)} · ${selectedExpense.submittedByName}` : undefined}
        size="wide"
        footer={<Button variant="ghost" onClick={() => setSelectedExpense(null)}>Close</Button>}
      >
        {selectedExpense ? (
          <div>
            <div className="ws-expense-detail">
              <div className="ws-detail-amount">{formatINR(selectedExpense.amount)}</div>
              <div className="ws-detail-grid">
                <div><span>Expense date</span><strong>{formatDateShort(selectedExpense.expenseDate)}</strong></div>
                <div><span>Related task</span><strong>{selectedExpense.taskTitle}</strong></div>
                <div><span>Receipt</span><strong>{selectedExpense.receiptName}</strong></div>
                <div><span>Current status</span><strong>{selectedExpense.status}</strong></div>
              </div>
              <p className="text-sm muted mt-12">{selectedExpense.description}</p>
              {selectedExpense.comments ? <div className="callout callout--info mt-12"><FileText size={14} /><span>{selectedExpense.comments}</span></div> : null}
            </div>
            <ApprovalStepper currentStage={expenseStageState(selectedExpense.status).stage} status={selectedExpense.status} />
            <h4 className="mt-16">Approval history</h4>
            <AuditTrail entries={selectedExpense.timeline} />
            <FinanceGateNote amount={selectedExpense.amount} />
            <div className="callout callout--info mt-12"><ShieldCheck size={14} /><span>You can view only your own submissions. Finance/Admin completes the final financial approval.</span></div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedIdea)}
        onClose={() => setSelectedIdea(null)}
        title={selectedIdea?.title ?? 'Idea status'}
        description={selectedIdea ? `Submitted ${formatDateShort(selectedIdea.createdAt)} · ${selectedIdea.status}` : undefined}
        size="wide"
        footer={<Button variant="ghost" onClick={() => setSelectedIdea(null)}>Close</Button>}
      >
        {selectedIdea ? (
          <div>
            <p className="text-sm">{selectedIdea.description}</p>
            <div className="ws-detail-grid mt-12">
              <div><span>Expected benefits</span><strong>{selectedIdea.expectedBenefits}</strong></div>
              <div><span>Estimated budget</span><strong>{selectedIdea.estimatedBudget ? formatINR(selectedIdea.estimatedBudget) : 'No budget requested'}</strong></div>
              <div><span>Supporting information</span><strong>{selectedIdea.supportingInfo || 'No additional notes'}</strong></div>
              <div><span>Current status</span><strong>{selectedIdea.status}</strong></div>
            </div>
            {selectedIdea.seniorFeedback ? <div className="ws-feedback mt-12"><span>Senior feedback</span><p>{selectedIdea.seniorFeedback}</p></div> : null}
            {selectedIdea.managerFeedback ? <div className="ws-feedback mt-12"><span>Manager feedback</span><p>{selectedIdea.managerFeedback}</p></div> : null}
            <ApprovalStepper currentStage={selectedIdea.status === 'Under Senior Review' ? 'senior' : selectedIdea.status === 'Pending Manager Review' ? 'manager' : selectedIdea.status === 'Forwarded to Finance' ? 'finance' : 'manager'} status={selectedIdea.status} />
            <h4 className="mt-16">Idea timeline</h4>
            <AuditTrail entries={selectedIdea.timeline} />
            {selectedIdea.estimatedBudget ? <div className="callout callout--warning mt-12"><ShieldCheck size={14} /><span>A budget request needs final financial approval from Finance/Admin. Marketing approval alone does not release funds.</span></div> : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedActivity)}
        onClose={() => setSelectedActivity(null)}
        title={selectedActivity?.title ?? 'Activity'}
        description={selectedActivity ? `${selectedActivity.type} · ${formatDateShort(selectedActivity.at)} · ${formatTime(selectedActivity.at)}` : undefined}
        footer={<Button variant="ghost" onClick={() => setSelectedActivity(null)}>Close</Button>}
      >
        {selectedActivity ? (
          <div>
            <p className="text-sm">{selectedActivity.detail}</p>
            <div className="ws-detail-grid mt-12">
              <div><span>Duration</span><strong>{selectedActivity.duration} minutes</strong></div>
              <div><span>Leads captured</span><strong>{selectedActivity.leadsCaptured}</strong></div>
              <div><span>Status</span><strong>{selectedActivity.status}</strong></div>
              <div><span>Owner</span><strong>{selectedActivity.employeeName}</strong></div>
            </div>
            <div className="callout callout--info mt-12"><Activity size={14} /><span>This activity is local demonstration data. It has not been sent to a manager or external system.</span></div>
          </div>
        ) : null}
      </Modal>

    </WorkspaceLayout>
  )
}
