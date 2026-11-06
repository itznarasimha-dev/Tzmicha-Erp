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
  Award,
  Cake,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Download,
  Gift,
  Megaphone,
  TrendingUp,
  UserPlus,
  Users,
  Video,
} from 'lucide-react'
import { HRPageShell, HRDemoFooter, HRPermissionNote, HRStatusBadge, HRAvatar, HRAvatar as AvatarCell } from './hrShared'
import { KpiCard, useCountUp } from '../../components/marketing/KpiCard'
import {
  ChartCard,
  ChartTooltip,
  Funnel,
  PieLegend,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../../components/charts/ChartKit'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useHRData } from '../../context/HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { FilterTabs, useCsvExport } from '../workspace/workspaceShared'
import { formatNumber, formatPercent, formatDateShort } from '../../utils/format'
import { hrPermissionSummary } from '../../config/hrNavigation'
import { hrWorkspacePath } from '../../config/hrNavigation'
import {
  attendanceMetrics,
  attendanceTrend,
  averageRating,
  distribution,
  formatDateLong,
  leaveSummary,
  peopleMoments,
  pendingHRTasks,
  recruitmentFunnel,
  relativeTime,
} from '../../utils/hr'
import type { AttendanceTrendPoint, PeopleMoment } from '../../utils/hr'

const momentMeta: Record<PeopleMoment['type'], { label: string; icon: typeof Cake; tone: string }> = {
  birthday: { label: 'Birthdays', icon: Cake, tone: 'var(--chart-4)' },
  anniversary: { label: 'Work anniversaries', icon: Award, tone: 'var(--chart-6)' },
  interview: { label: 'Interviews', icon: Video, tone: 'var(--chart-5)' },
  joining: { label: 'Joining dates', icon: UserPlus, tone: 'var(--chart-2)' },
}

export function HRDashboard() {
  const navigate = useNavigate()
  const { profile } = useDemoRole()
  const hr = useHRData()
  const exportCsv = useCsvExport()
  const animate = useChartAnimation()
  const permissions = hrPermissionSummary(profile.id)
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [momentType, setMomentType] = useState<PeopleMoment['type']>('birthday')

  const metrics = useMemo(() => attendanceMetrics(hr), [hr])
  const yesterday = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return attendanceMetrics(hr, key)
  }, [hr])
  const trend = useMemo(() => attendanceTrend(hr, range), [hr, range])
  const leaves = useMemo(() => leaveSummary(hr), [hr])
  const funnel = useMemo(() => recruitmentFunnel(hr), [hr])
  const moments = useMemo(() => peopleMoments(hr, 45), [hr])
  const tasks = useMemo(() => pendingHRTasks(hr), [hr])
  const openJobs = hr.jobOpenings.filter((job) => job.status === 'Open')
  const openPositions = openJobs.reduce((sum, job) => sum + job.vacancies, 0)
  const departments = useMemo(() => distribution(hr.employees, 'department', 7), [hr.employees])
  const designations = useMemo(() => distribution(hr.employees, 'designation', 6), [hr.employees])
  const employmentTypes = useMemo(() => distribution(hr.employees, 'employmentType', 5), [hr.employees])
  const reviewAverage = useMemo(() => averageRating(hr.performanceReviews), [hr.performanceReviews])
  const filteredMoments = moments.filter((moment) => moment.type === momentType)
  const attendanceRate = metrics.attendanceRate
  const animatedRate = useCountUp(attendanceRate)

  const tomorrow = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }, [])
  const interviewsTomorrow = hr.interviews.filter(
    (interview) => interview.status === 'Scheduled' && interview.interviewDate === tomorrow,
  )

  const departmentAttendance = useMemo(() => {
    return departments.map((department) => {
      const records = metrics.records.filter((record) => record.department === department.name)
      const present = records.filter((record) => ['Present', 'Late'].includes(record.status)).length
      return {
        name: department.name,
        total: department.value,
        present,
        rate: department.value ? (present / department.value) * 100 : 0,
      }
    })
  }, [departments, metrics.records])

  const chartLegend = (
    <>
      <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-2)' }} />Present</span>
      <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-3)' }} />On leave</span>
      <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-4)' }} />Absent</span>
    </>
  )

  const exportDashboard = () => {
    exportCsv(
      'hr-workforce-snapshot.csv',
      [
        { header: 'Metric', value: (row: { metric: string; value: string }) => row.metric },
        { header: 'Value', value: (row: { metric: string; value: string }) => row.value },
      ],
      [
        { metric: 'Total employees', value: String(metrics.totalEmployees) },
        { metric: 'Present today', value: String(metrics.present) },
        { metric: 'On leave today', value: String(metrics.onLeave) },
        { metric: 'Absent today', value: String(metrics.absent) },
        { metric: 'Pending leave requests', value: String(leaves.pendingCount) },
        { metric: 'Open positions', value: String(openPositions) },
        { metric: 'Average review rating', value: reviewAverage.toFixed(1) },
      ],
    )
  }

  return (
    <HRPageShell
      section="dashboard"
      title={`Good morning, ${profile.name.split(' ')[0]}`}
      subtitle="A live snapshot of the workforce, attendance, leave, hiring and the HR tasks waiting for you today."
      eyebrow="HR command centre"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportDashboard}>
            Export snapshot
          </Button>
          <Button
            variant="primary"
            icon={<CalendarClock size={14} />}
            onClick={() => navigate(hrWorkspacePath('leave'))}
          >
            Review leave
          </Button>
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>Open positions</small><strong>{openPositions}</strong></span>
          <span className="hr-inline-meta"><small>Reviews average</small><strong>{reviewAverage.toFixed(1)} / 5</strong></span>
          <span className="hr-inline-meta"><small>Interviews next</small><strong>{interviewsTomorrow.length}</strong></span>
        </>
      }
    >
      <section className="hr-hero">
        <div className="hr-hero__main">
          <span className="hr-hero__eyebrow"><TrendingUp size={13} /> People operations snapshot</span>
          <h2>
            {metrics.present} people are checked in today, with {metrics.onLeave} on approved leave and{' '}
            {leaves.pendingCount} leave request{leaves.pendingCount === 1 ? '' : 's'} waiting for review.
          </h2>
          <p>
            Attendance is calculated from recorded ERP punches. Absent counts exclude approved leave and
            applicable holidays. Payroll verification uses the same attendance and leave records once.
          </p>
          <div className="row-8 wrap mt-12">
            <Button variant="primary" icon={<CalendarCheck size={14} />} onClick={() => navigate(hrWorkspacePath('attendance'))}>
              Open attendance
            </Button>
            <Button variant="soft" icon={<ClipboardList size={14} />} onClick={() => navigate(hrWorkspacePath('employees'))}>
              Employee directory
            </Button>
            <Button variant="ghost" icon={<UserPlus size={14} />} onClick={() => navigate(hrWorkspacePath('recruitment'))}>
              Hiring pipeline
            </Button>
          </div>
        </div>
        <div className="hr-hero__side">
          <div
            className="hr-hero__ring"
            style={{ background: `conic-gradient(var(--chart-2) ${Math.min(100, attendanceRate)}%, var(--surface-3) 0)` }}
            aria-label={`Attendance rate ${formatPercent(attendanceRate, 0)}`}
          >
            <div className="hr-hero__ring-inner">
              <strong>{animatedRate.toFixed(0)}%</strong>
              <span>attendance</span>
            </div>
          </div>
          <div className="hr-hero__ring-meta">
            <span><strong>{metrics.present}</strong> present</span>
            <span><strong>{metrics.late}</strong> late</span>
            <span><strong>{metrics.avgHours.toFixed(1)}h</strong> avg hours</span>
          </div>
        </div>
      </section>

      <div className="hr-kpi-grid">
        <KpiCard
          index={0}
          label="Total Employees"
          value={metrics.totalEmployees}
          format={formatNumber}
          icon={<Users size={17} />}
          tone="var(--chart-1)"
          trend={{ value: 3.4, label: 'vs last month' }}
          hint={`${hr.employees.filter((employee) => employee.status === 'Onboarding').length} onboarding`}
          onClick={() => navigate(hrWorkspacePath('employees'))}
        />
        <KpiCard
          index={1}
          label="Present Today"
          value={metrics.present}
          format={formatNumber}
          icon={<CalendarCheck size={17} />}
          tone="var(--chart-2)"
          trend={{
            value: yesterday.present ? ((metrics.present - yesterday.present) / yesterday.present) * 100 : null,
            label: 'vs yesterday',
          }}
          hint="Recorded attendance"
          onClick={() => navigate(hrWorkspacePath('attendance'))}
        />
        <KpiCard
          index={2}
          label="On Leave Today"
          value={metrics.onLeave}
          format={formatNumber}
          icon={<CalendarDays size={17} />}
          tone="var(--chart-3)"
          trend={{ value: null, label: 'Approved leave only' }}
          hint="Approved leave records"
          onClick={() => navigate(hrWorkspacePath('leave'))}
        />
        <KpiCard
          index={3}
          label="Absent Today"
          value={metrics.absent}
          format={formatNumber}
          icon={<CircleAlert size={17} />}
          tone="var(--chart-4)"
          trend={{ value: -2.1, label: 'vs last week', positiveIsGood: false }}
          hint={metrics.holiday ? `Holiday · ${metrics.holidayName}` : 'Excludes approved leave'}
          onClick={() => navigate(hrWorkspacePath('attendance'))}
        />
        <KpiCard
          index={4}
          label="Pending Leave Requests"
          value={leaves.pendingCount}
          format={formatNumber}
          icon={<CalendarClock size={17} />}
          tone="var(--chart-6)"
          trend={{ value: leaves.pendingDays, label: `${leaves.pendingDays} days requested` }}
          hint="Awaiting a decision"
          onClick={() => navigate(hrWorkspacePath('leave'))}
        />
        <KpiCard
          index={5}
          label="Open Positions"
          value={openPositions}
          format={formatNumber}
          icon={<UserPlus size={17} />}
          tone="var(--chart-5)"
          trend={{ value: openJobs.length, label: `${openJobs.length} open requisitions` }}
          hint={`${hr.candidates.filter((candidate) => candidate.stage === 'Interview').length} interviewing`}
          onClick={() => navigate(hrWorkspacePath('recruitment'))}
        />
      </div>

      <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
        <ChartCard
          title="Attendance overview"
          subtitle="Daily attendance built from ERP punches, approved leave and holidays."
          actions={
            <FilterTabs
              ariaLabel="Attendance chart range"
              value={range}
              onChange={(value) => setRange(value as typeof range)}
              options={[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ]}
            />
          }
          legend={chartLegend}
          height="md"
        >
          <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="hr-present" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.34} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="hr-leave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.24} />
                <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="present"
              name="Present"
              stroke="var(--chart-2)"
              fill="url(#hr-present)"
              strokeWidth={2.1}
              isAnimationActive={animate}
            />
            <Area
              type="monotone"
              dataKey="onLeave"
              name="On leave"
              stroke="var(--chart-3)"
              fill="url(#hr-leave)"
              strokeWidth={1.8}
              isAnimationActive={animate}
            />
            <Area
              type="monotone"
              dataKey="absent"
              name="Absent"
              stroke="var(--chart-4)"
              fill="transparent"
              strokeWidth={1.6}
              strokeDasharray="4 3"
              isAnimationActive={animate}
            />
          </AreaChart>
        </ChartCard>

        <ChartCard
          title="Recruitment pipeline"
          subtitle="Applied → Screening → Interview → Offer → Hired"
          height="md"
          isEmpty={hr.candidates.length === 0}
          emptyMessage="No candidates have been added yet."
        >
          <div className="hr-funnel-wrap">
            <Funnel stages={funnel.map((stage) => ({ ...stage, display: String(stage.value) }))} compact />
            <div className="hr-funnel-legend">
              {funnel.map((stage, index) => (
                <span key={stage.label} className="hr-funnel-legend__item">
                  <span style={{ background: stage.color }} />
                  <small>{stage.label}</small>
                  <strong>{stage.value}</strong>
                  {index < funnel.length - 1 ? <em>{funnel[index + 1].value ? Math.round((funnel[index + 1].value / Math.max(1, stage.value)) * 100) : 0}%</em> : null}
                </span>
              ))}
            </div>
            <button type="button" className="hr-inline-link" onClick={() => navigate(hrWorkspacePath('recruitment'))}>
              Open recruitment workspace
            </button>
          </div>
        </ChartCard>
      </div>

      <div className="hr-dashboard-grid hr-dashboard-grid--triple">
        <ChartCard title="Employees by department" subtitle="Current directory distribution" height="sm">
          <PieChart>
            <Pie data={departments} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
              {departments.map((entry, index) => (
                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ChartCard>
        <ChartCard title="By designation" subtitle="Largest employee groups" height="sm">
          <BarChart data={designations} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid {...gridProps} horizontal={false} />
            <XAxis type="number" {...axisProps} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={104} {...axisProps} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Employees" fill="var(--chart-6)" radius={[0, 6, 6, 0]} isAnimationActive={animate} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Employment type" subtitle="Workforce mix" height="sm">
          <PieChart>
            <Pie data={employmentTypes} dataKey="value" nameKey="name" innerRadius={50} outerRadius={76} paddingAngle={3} stroke="none">
              {employmentTypes.map((entry, index) => (
                <Cell key={entry.name} fill={chartColors[(index + 3) % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ChartCard>
      </div>

      <div className="hr-dashboard-grid hr-dashboard-grid--triple">
        <SectionCard title="Department distribution" subtitle="Headcount and present today">
          <div className="hr-legend-stack">
            {departments.map((department, index) => (
              <div className="hr-legend-row" key={department.name}>
                <span className="hr-legend-row__dot" style={{ background: chartColors[index % chartColors.length] }} />
                <span className="hr-legend-row__name">{department.name}</span>
                <span className="hr-legend-row__value">{department.value}</span>
                <span className="hr-legend-row__bar">
                  <span style={{ width: `${(department.value / Math.max(1, departments[0]?.value ?? 1)) * 100}%`, background: chartColors[index % chartColors.length] }} />
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Designation distribution" subtitle="Top employee groups">
          <div className="hr-legend-stack">
            {designations.map((designation, index) => (
              <div className="hr-legend-row" key={designation.name}>
                <span className="hr-legend-row__dot" style={{ background: chartColors[(index + 2) % chartColors.length] }} />
                <span className="hr-legend-row__name">{designation.name}</span>
                <span className="hr-legend-row__value">{designation.value}</span>
                <span className="hr-legend-row__bar">
                  <span style={{ width: `${(designation.value / Math.max(1, designations[0]?.value ?? 1)) * 100}%`, background: chartColors[(index + 2) % chartColors.length] }} />
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Leave summary" subtitle="Current leave requests by type">
          <div className="hr-leave-summary">
            <div className="hr-leave-summary__top">
              <span><strong>{leaves.pendingCount}</strong><small>Pending</small></span>
              <span><strong>{leaves.approvedCount}</strong><small>Approved</small></span>
              <span><strong>{leaves.rejectedCount}</strong><small>Rejected</small></span>
            </div>
            <div className="hr-legend-stack">
              {leaves.byType.slice(0, 5).map((type, index) => (
                <div className="hr-legend-row" key={type.name}>
                  <span className="hr-legend-row__dot" style={{ background: chartColors[(index + 4) % chartColors.length] }} />
                  <span className="hr-legend-row__name">{type.name}</span>
                  <span className="hr-legend-row__value">{type.value}d</span>
                  <span className="hr-legend-row__bar">
                    <span style={{ width: `${(type.value / Math.max(1, leaves.byType[0]?.value ?? 1)) * 100}%`, background: chartColors[(index + 4) % chartColors.length] }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
        <SectionCard
          title="Upcoming approved leave"
          subtitle="Approved absences in the next 30 days"
          actions={<Button variant="ghost" size="xs" onClick={() => navigate(hrWorkspacePath('leave'))}>View all</Button>}
        >
          <div className="hr-leave-list">
            {hr.leaveRequests
              .filter((request) => request.status === 'Approved' && request.endDate >= new Date().toISOString().slice(0, 10))
              .sort((a, b) => a.startDate.localeCompare(b.startDate))
              .slice(0, 6)
              .map((request) => {
                const employee = hr.employees.find((item) => item.employeeId === request.employeeId)
                return (
                  <div className="hr-leave-list__row" key={request.id}>
                    {employee ? <AvatarCell employee={employee} size="sm" /> : null}
                    <span className="grow" style={{ minWidth: 0 }}>
                      <strong>{request.employeeName}</strong>
                      <small>{request.leaveType} · {request.days} day{request.days === 1 ? '' : 's'} · {request.department}</small>
                    </span>
                    <span className="hr-leave-list__dates">{formatDateLong(request.startDate)}</span>
                    <HRStatusBadge status={request.status} />
                  </div>
                )
              })}
            {!hr.leaveRequests.some((request) => request.status === 'Approved' && request.endDate >= new Date().toISOString().slice(0, 10)) ? (
              <p className="empty-inline">No upcoming approved leave.</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Attendance by department" subtitle="Present today against headcount">
          <div className="hr-attendance-list">
            {departmentAttendance.map((department, index) => (
              <div className="hr-attendance-row" key={department.name}>
                <div className="between">
                  <span>{department.name}</span>
                  <strong>{department.present}/{department.total}</strong>
                </div>
                <div className="hr-progress">
                  <span
                    className="hr-progress__bar"
                    style={{
                      width: `${department.rate}%`,
                      background: chartColors[index % chartColors.length],
                    }}
                  />
                </div>
                <small>{formatPercent(department.rate, 0)} present</small>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="hr-dashboard-grid hr-dashboard-grid--1-1">
        <SectionCard title="People moments" subtitle="Birthdays, anniversaries, interviews and joining dates">
          <div className="hr-moment-tabs">
            <FilterTabs
              ariaLabel="People moments filter"
              value={momentType}
              onChange={(value) => setMomentType(value as PeopleMoment['type'])}
              options={(Object.keys(momentMeta) as PeopleMoment['type'][]).map((type) => ({
                id: type,
                label: momentMeta[type].label,
                count: moments.filter((moment) => moment.type === type).length,
              }))}
            />
          </div>
          <div className="hr-moment-list">
            {filteredMoments.slice(0, 6).map((moment) => {
              const meta = momentMeta[moment.type]
              const Icon = meta.icon
              const employee = hr.employees.find((item) => item.employeeId === moment.employeeId)
              return (
                <div className="hr-moment-row" key={moment.id}>
                  <span className="hr-moment-row__icon" style={{ color: meta.tone, background: `color-mix(in srgb, ${meta.tone} 12%, transparent)` }}>
                    <Icon size={15} />
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <strong>{moment.name}</strong>
                    <small>{moment.detail}</small>
                  </span>
                  <span className="hr-moment-row__date">
                    {employee ? <HRAvatar employee={employee} size="sm" /> : null}
                    {formatDateShort(moment.date)}
                  </span>
                </div>
              )
            })}
            {!filteredMoments.length ? <p className="empty-inline">No {momentMeta[momentType].label.toLowerCase()} in the next 45 days.</p> : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Pending HR tasks"
          subtitle="Everything that needs an owner or a decision"
          actions={<Badge tone="warning">{tasks.length} open</Badge>}
        >
          <div className="hr-task-list">
            {tasks.map((task) => (
              <button
                type="button"
                className="hr-task-row"
                key={task.id}
                onClick={() => navigate(task.href)}
              >
                <span className={`hr-task-row__priority hr-task-row__priority--${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <strong>{task.title}</strong>
                  <small>{task.detail}</small>
                </span>
                {task.count ? <span className="hr-task-row__count">{task.count}</span> : null}
                <span className="hr-task-row__arrow">→</span>
              </button>
            ))}
            {!tasks.length ? <p className="empty-inline">No pending HR tasks. The workspace is clear.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
        <SectionCard
          title="Recent HR activity"
          subtitle="A single audit timeline for people operations"
          actions={<Button variant="ghost" size="xs" icon={<ClipboardCheck size={13} />} onClick={() => navigate(hrWorkspacePath('reports'))}>Reports</Button>}
        >
          <ol className="hr-timeline">
            {hr.activity.slice(0, 9).map((entry) => (
              <li key={entry.id} className={`hr-timeline__item hr-timeline__item--${entry.tone}`}>
                <span className="hr-timeline__marker" aria-hidden="true" />
                <div>
                  <p className="hr-timeline__action">{entry.action}</p>
                  <p className="hr-timeline__detail">{entry.detail}</p>
                  <p className="hr-timeline__meta">{entry.actor} · {relativeTime(entry.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>

        <div className="hr-stack">
          <SectionCard title="Interviews & joining dates" subtitle="Next people events">
            <div className="hr-moment-list">
              {moments
                .filter((moment) => moment.type === 'interview' || moment.type === 'joining')
                .slice(0, 5)
                .map((moment) => {
                  const meta = momentMeta[moment.type]
                  const Icon = meta.icon
                  return (
                    <div className="hr-moment-row" key={moment.id}>
                      <span className="hr-moment-row__icon" style={{ color: meta.tone, background: `color-mix(in srgb, ${meta.tone} 12%, transparent)` }}>
                        <Icon size={15} />
                      </span>
                      <span className="grow" style={{ minWidth: 0 }}>
                        <strong>{moment.name}</strong>
                        <small>{moment.detail}</small>
                      </span>
                      <span className="hr-moment-row__date">{formatDateShort(moment.date)}</span>
                    </div>
                  )
                })}
              {!moments.some((moment) => moment.type === 'interview' || moment.type === 'joining') ? (
                <p className="empty-inline">No upcoming interviews or joining dates.</p>
              ) : null}
            </div>
          </SectionCard>

          {!permissions.canViewPayrollAmounts ? (
            <HRPermissionNote roleId={profile.id}>
              Payroll amounts are masked for this preview role. Switch to the Marketing Manager role to
              exercise HR administration actions.
            </HRPermissionNote>
          ) : (
            <HRPermissionNote roleId={profile.id}>
              You are previewing HR administrator access. Payroll payment processing and financial approval
              remain with Finance.
            </HRPermissionNote>
          )}
        </div>
      </div>

      <HRDemoFooter />
    </HRPageShell>
  )
}
