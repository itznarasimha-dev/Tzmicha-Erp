import { useMemo, useState, type CSSProperties } from 'react'
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
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardSignature,
  Download,
  FileBarChart,
  FileCheck2,
  Gauge,
  LockKeyhole,
  Star,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import {
  ChartCard,
  ChartTooltip,
  Funnel,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../../components/charts/ChartKit'
import { useHRData } from '../../context/HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { hrPermissionSummary, hrWorkspacePath } from '../../config/hrNavigation'
import { FilterTabs, useCsvExport } from '../workspace/workspaceShared'
import { HR_CURRENT_MONTH_KEY } from '../../data/hr'
import { formatNumber, formatPercent } from '../../utils/format'
import {
  attendanceMetrics,
  attendanceTrend,
  averageRating,
  distribution,
  formatDateLong,
  hrStatusTone,
  leaveSummary,
  maskMoney,
  recruitmentFunnel,
  reviewScore,
  relativeTime,
} from '../../utils/hr'
import type {
  HRAttendanceRecord,
  HRCandidate,
  HREmployee,
  HREmployeeRequest,
  HRLeaveRequest,
  HROffboarding,
  HRPayrollLine,
  HRPerformanceReview,
} from '../../types/hr'
import {
  HRDemoFooter,
  HRFilterSelect,
  HRInfoNote,
  HRPageShell,
  HRPermissionNote,
  HRStatusBadge,
  HRSummaryGrid,
  HRSummaryTile,
  useInitialLoading,
} from './hrShared'

type TabId = 'overview' | 'library' | 'audit'

const RATING_LABELS = ['1 · Needs improvement', '2 · Developing', '3 · Meets expectations', '4 · Exceeds', '5 · Outstanding']

export function HRReports() {
  const navigate = useNavigate()
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const exportCsv = useCsvExport()
  const animate = useChartAnimation()
  const loading = useInitialLoading()
  const masked = !permissions.canViewPayrollAmounts

  const [tab, setTab] = useState<TabId>('overview')
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [moduleFilter, setModuleFilter] = useState('All modules')

  const metrics = useMemo(() => attendanceMetrics(hr), [hr])
  const trend = useMemo(() => attendanceTrend(hr, range), [hr, range])
  const leaves = useMemo(() => leaveSummary(hr), [hr])
  const funnel = useMemo(() => recruitmentFunnel(hr), [hr])
  const average = useMemo(() => averageRating(hr.performanceReviews), [hr.performanceReviews])

  const workforce = useMemo(
    () => hr.employees.filter((employee) => employee.status !== 'Resigned' && employee.status !== 'Terminated'),
    [hr.employees],
  )
  const departments = useMemo(() => distribution(workforce, 'department', 8), [workforce])
  const employmentTypes = useMemo(() => distribution(workforce, 'employmentType', 5), [workforce])

  const payroll = useMemo(
    () =>
      [...hr.payrolls].sort((a, b) => b.monthKey.localeCompare(a.monthKey)).find((item) => item.monthKey === HR_CURRENT_MONTH_KEY) ??
      [...hr.payrolls].sort((a, b) => b.monthKey.localeCompare(a.monthKey))[0],
    [hr.payrolls],
  )

  const payrollLines = useMemo(
    () => hr.payrollLines.filter((line) => line.payrollId === payroll?.id),
    [hr.payrollLines, payroll?.id],
  )

  const payrollByDepartment = useMemo(() => {
    const map = new Map<string, number>()
    payrollLines.forEach((line) => map.set(line.department, (map.get(line.department) ?? 0) + line.net))
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [payrollLines])

  const ratingDistribution = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((rating) => ({
        name: `${rating} star${rating === 1 ? '' : 's'}`,
        label: RATING_LABELS[rating - 1],
        value: hr.performanceReviews.filter((review) => {
          const score = reviewScore(review)
          return score !== null && Math.round(score) === rating
        }).length,
      })),
    [hr.performanceReviews],
  )

  const openPositions = hr.jobOpenings
    .filter((job) => job.status === 'Open')
    .reduce((sum, job) => sum + job.vacancies, 0)

  const requestsOpen = hr.employeeRequests.filter((request) => ['Pending', 'In Progress'].includes(request.status)).length
  const requestsCompleted = hr.employeeRequests.filter((request) => request.status === 'Completed').length
  const exitsInProgress = hr.offboarding.filter((record) => record.status !== 'Completed').length
  const recordedTrend = trend.filter((point) => point.present + point.onLeave + point.absent > 0)
  const attendanceRate = recordedTrend.length
    ? recordedTrend.reduce((sum, point) => sum + point.rate, 0) / recordedTrend.length
    : metrics.attendanceRate
  const leaveUtilisation = leaves.byType.reduce((sum, type) => sum + type.value, 0)
  const pendingDocs = hr.documents.filter((document) => document.status === 'Pending').length
  const scheduledInterviews = hr.interviews.filter((interview) => interview.status === 'Scheduled').length

  const modules = useMemo(
    () => ['All modules', ...Array.from(new Set(hr.activity.map((entry) => entry.module)))],
    [hr.activity],
  )
  const moduleLabel = (module: string) => {
    const navLabels: Record<string, string> = {
      dashboard: 'My Dashboard',
      employees: 'Employees',
      attendance: 'Attendance',
      leave: 'Leave Management',
      recruitment: 'Recruitment',
      onboarding: 'Onboarding',
      payroll: 'Payroll',
      performance: 'Performance',
      requests: 'Employee Requests',
      offboarding: 'Offboarding',
      reports: 'Reports & Analytics',
      settings: 'HR Settings',
      system: 'System',
    }
    return navLabels[module] ?? module
  }

  const filteredActivity = moduleFilter === 'All modules'
    ? hr.activity
    : hr.activity.filter((entry) => entry.module === moduleFilter)

  const exportWorkforce = () => {
    exportCsv<HREmployee>(
      'hr-workforce-report.csv',
      [
        { header: 'Employee ID', value: (row) => row.employeeId },
        { header: 'Name', value: (row) => row.name },
        { header: 'Department', value: (row) => row.department },
        { header: 'Designation', value: (row) => row.designation },
        { header: 'Employment type', value: (row) => row.employmentType },
        { header: 'Status', value: (row) => row.status },
        { header: 'Joining date', value: (row) => row.joiningDate },
        { header: 'Location', value: (row) => row.location },
      ],
      workforce,
    )
  }

  const reportLibrary = [
    {
      id: 'workforce',
      title: 'Workforce headcount',
      description: 'Active people, department distribution, employment type and joining dates.',
      icon: Users,
      tone: 'var(--chart-1)',
      records: workforce.length,
      period: 'Live directory',
      href: hrWorkspacePath('employees'),
      run: exportWorkforce,
    },
    {
      id: 'attendance',
      title: 'Attendance register',
      description: 'Daily punches, late marks, approved leave and authorised corrections.',
      icon: CalendarCheck,
      tone: 'var(--chart-2)',
      records: hr.attendance.length,
      period: `${metrics.present} present today`,
      href: hrWorkspacePath('attendance'),
      run: () =>
        exportCsv<HRAttendanceRecord>(
          'hr-attendance-register.csv',
          [
            { header: 'Date', value: (row) => row.date },
            { header: 'Employee', value: (row) => row.employeeName },
            { header: 'Employee ID', value: (row) => row.employeeId },
            { header: 'Department', value: (row) => row.department },
            { header: 'Check in', value: (row) => row.checkIn ?? '—' },
            { header: 'Check out', value: (row) => row.checkOut ?? '—' },
            { header: 'Hours', value: (row) => String(row.workingHours) },
            { header: 'Status', value: (row) => row.status },
            { header: 'Source', value: (row) => row.source },
          ],
          hr.attendance,
        ),
    },
    {
      id: 'leave',
      title: 'Leave register',
      description: 'Requests, approvals, reviewer remarks and leave days by type.',
      icon: CalendarClock,
      tone: 'var(--chart-3)',
      records: hr.leaveRequests.length,
      period: `${leaves.pendingCount} pending`,
      href: hrWorkspacePath('leave'),
      run: () =>
        exportCsv<HRLeaveRequest>(
          'hr-leave-register.csv',
          [
            { header: 'Employee', value: (row) => row.employeeName },
            { header: 'Department', value: (row) => row.department },
            { header: 'Leave type', value: (row) => row.leaveType },
            { header: 'From', value: (row) => row.startDate },
            { header: 'To', value: (row) => row.endDate },
            { header: 'Days', value: (row) => String(row.days) },
            { header: 'Status', value: (row) => row.status },
            { header: 'Reviewer', value: (row) => row.reviewer ?? '—' },
            { header: 'Remarks', value: (row) => row.reviewerRemarks },
          ],
          hr.leaveRequests,
        ),
    },
    {
      id: 'recruitment',
      title: 'Recruitment pipeline',
      description: 'Open requisitions, candidates, interview stages and offer decisions.',
      icon: UserPlus,
      tone: 'var(--chart-5)',
      records: hr.candidates.length,
      period: `${openPositions} open positions`,
      href: hrWorkspacePath('recruitment'),
      run: () =>
        exportCsv<HRCandidate>(
          'hr-recruitment-pipeline.csv',
          [
            { header: 'Candidate', value: (row) => row.name },
            { header: 'Email', value: (row) => row.email },
            { header: 'Position', value: (row) => row.position },
            { header: 'Stage', value: (row) => row.stage },
            { header: 'Applied', value: (row) => row.appliedDate },
            { header: 'Source', value: (row) => row.source },
            { header: 'Experience', value: (row) => row.experience },
            { header: 'Rating', value: (row) => (row.rating === null ? '—' : String(row.rating)) },
          ],
          hr.candidates,
        ),
    },
    {
      id: 'payroll',
      title: 'Payroll preparation summary',
      description: 'Gross, deductions and net pay by department for the current run.',
      icon: Wallet,
      tone: 'var(--chart-6)',
      records: payrollLines.length,
      period: payroll?.period ?? 'No payroll run',
      href: hrWorkspacePath('payroll'),
      restricted: masked,
      run: () =>
        exportCsv<HRPayrollLine>(
          'hr-payroll-summary.csv',
          [
            { header: 'Employee', value: (row) => row.employeeName },
            { header: 'Employee ID', value: (row) => row.employeeId },
            { header: 'Department', value: (row) => row.department },
            { header: 'Base', value: (row) => String(row.base) },
            { header: 'Allowances', value: (row) => String(row.allowances) },
            { header: 'Deductions', value: (row) => String(row.deductions) },
            { header: 'Loss of pay', value: (row) => String(row.lossOfPay) },
            { header: 'Net pay', value: (row) => String(row.net) },
          ],
          payrollLines,
        ),
    },
    {
      id: 'performance',
      title: 'Performance calibration',
      description: 'Review cycle status, manager and HR ratings, and goal scores.',
      icon: Star,
      tone: 'var(--chart-4)',
      records: hr.performanceReviews.length,
      period: `${average.toFixed(1)} / 5 average`,
      href: hrWorkspacePath('performance'),
      run: () =>
        exportCsv<HRPerformanceReview>(
          'hr-performance-report.csv',
          [
            { header: 'Employee', value: (row) => row.employeeName },
            { header: 'Department', value: (row) => row.department },
            { header: 'Review period', value: (row) => row.reviewPeriod },
            { header: 'Status', value: (row) => row.status },
            { header: 'Self rating', value: (row) => (row.selfRating === null ? '—' : String(row.selfRating)) },
            { header: 'Manager rating', value: (row) => (row.managerRating === null ? '—' : String(row.managerRating)) },
            { header: 'HR rating', value: (row) => (row.hrRating === null ? '—' : String(row.hrRating)) },
          ],
          hr.performanceReviews,
        ),
    },
    {
      id: 'requests',
      title: 'Employee requests',
      description: 'HR queries, document requests and information updates with owners.',
      icon: ClipboardSignature,
      tone: 'var(--chart-7)',
      records: hr.employeeRequests.length,
      period: `${requestsOpen} open`,
      href: hrWorkspacePath('requests'),
      run: () =>
        exportCsv<HREmployeeRequest>(
          'hr-employee-requests.csv',
          [
            { header: 'Employee', value: (row) => row.employeeName },
            { header: 'Category', value: (row) => row.category },
            { header: 'Subject', value: (row) => row.subject },
            { header: 'Priority', value: (row) => row.priority },
            { header: 'Status', value: (row) => row.status },
            { header: 'Assigned to', value: (row) => row.assignedTo },
            { header: 'Raised', value: (row) => row.requestDate },
          ],
          hr.employeeRequests,
        ),
    },
    {
      id: 'offboarding',
      title: 'Exit & clearance report',
      description: 'Resignations, last working days, clearance status and settlements.',
      icon: UserMinus,
      tone: 'var(--chart-8)',
      records: hr.offboarding.length,
      period: `${exitsInProgress} in progress`,
      href: hrWorkspacePath('offboarding'),
      run: () =>
        exportCsv<HROffboarding>(
          'hr-offboarding-report.csv',
          [
            { header: 'Employee', value: (row) => row.employeeName },
            { header: 'Department', value: (row) => row.department },
            { header: 'Resignation date', value: (row) => row.resignationDate },
            { header: 'Last working day', value: (row) => row.lastWorkingDay },
            { header: 'Reason', value: (row) => row.reason },
            { header: 'Clearance', value: (row) => Object.entries(row.clearance).filter(([, done]) => done).map(([area]) => area).join(' / ') },
            { header: 'Settlement', value: (row) => row.finalSettlement },
            { header: 'Status', value: (row) => row.status },
          ],
          hr.offboarding,
        ),
    },
  ]

  const attendanceLegend = (
    <>
      <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-2)' }} />Present</span>
      <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-3)' }} />On leave</span>
      <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-4)' }} />Absent</span>
    </>
  )

  return (
    <HRPageShell
      section="reports"
      title="Reports & analytics"
      subtitle="Workforce, attendance, leave, recruitment, payroll preparation and performance reporting built from the same ERP records used across the workspace."
      eyebrow="People intelligence"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportWorkforce}>
            Export workforce
          </Button>
          <Button variant="primary" icon={<BarChart3 size={14} />} onClick={() => setTab('library')}>
            Report library
          </Button>
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>Attendance rate</small><strong>{formatPercent(attendanceRate, 0)}</strong></span>
          <span className="hr-inline-meta"><small>Open positions</small><strong>{openPositions}</strong></span>
          <span className="hr-inline-meta"><small>Average rating</small><strong>{average.toFixed(1)} / 5</strong></span>
        </>
      }
    >
      <HRSummaryGrid>
        <HRSummaryTile label="Headcount" value={formatNumber(workforce.length)} hint="Active people records" icon={<Users size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="Attendance rate" value={formatPercent(attendanceRate, 0)} hint="Selected reporting range" icon={<CalendarCheck size={16} />} tone="var(--chart-2)" />
        <HRSummaryTile label="Leave days" value={formatNumber(leaveUtilisation)} hint={`${leaves.pendingCount} requests pending`} icon={<CalendarClock size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="Open positions" value={formatNumber(openPositions)} hint={`${scheduledInterviews} interviews scheduled`} icon={<UserPlus size={16} />} tone="var(--chart-5)" />
        <HRSummaryTile label="Current net payroll" value={maskMoney(payroll?.net ?? 0, masked)} hint={masked ? 'Masked for this role' : payroll?.period ?? 'No payroll run'} icon={<Wallet size={16} />} tone="var(--chart-6)" />
        <HRSummaryTile label="Review average" value={`${average.toFixed(1)} / 5`} hint={`${hr.performanceReviews.length} review records`} icon={<Star size={16} />} tone="var(--chart-4)" />
      </HRSummaryGrid>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="Reports view"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'overview', label: 'Analytics overview' },
            { id: 'library', label: 'Report library', count: reportLibrary.length },
            { id: 'audit', label: 'Audit trail', count: hr.activity.length },
          ]}
        />
      </div>

      {tab === 'overview' ? (
        <>
          <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
            <ChartCard
              title="Attendance trend"
              subtitle="Present, approved leave and absent counts from recorded ERP attendance."
              actions={
                <FilterTabs
                  ariaLabel="Report attendance range"
                  value={range}
                  onChange={(value) => setRange(value as typeof range)}
                  options={[
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                  ]}
                />
              }
              legend={attendanceLegend}
              height="md"
            >
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="report-present" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="present" name="Present" stroke="var(--chart-2)" fill="url(#report-present)" strokeWidth={2.1} isAnimationActive={animate} />
                <Area type="monotone" dataKey="onLeave" name="On leave" stroke="var(--chart-3)" fill="transparent" strokeWidth={1.8} isAnimationActive={animate} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke="var(--chart-4)" fill="transparent" strokeWidth={1.6} strokeDasharray="4 3" isAnimationActive={animate} />
              </AreaChart>
            </ChartCard>

            <ChartCard title="Recruitment funnel" subtitle="Candidate conversion across the hiring stages" height="md" isEmpty={!hr.candidates.length} emptyMessage="No candidates have been added yet.">
              <div className="hr-funnel-wrap">
                <Funnel stages={funnel.map((stage) => ({ ...stage, display: String(stage.value) }))} compact />
                <div className="hr-funnel-legend">
                  {funnel.map((stage) => (
                    <span key={stage.label} className="hr-funnel-legend__item">
                      <span style={{ background: stage.color }} />
                      <small>{stage.label}</small>
                      <strong>{stage.value}</strong>
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
            <ChartCard title="Headcount by department" subtitle="Active workforce distribution" height="sm">
              <PieChart>
                <Pie data={departments} dataKey="value" nameKey="name" innerRadius={50} outerRadius={76} paddingAngle={2} stroke="none">
                  {departments.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ChartCard>
            <ChartCard title="Employment type mix" subtitle="Permanent, contract, part time and interns" height="sm">
              <BarChart data={employmentTypes} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Employees" fill="var(--chart-5)" radius={[6, 6, 0, 0]} isAnimationActive={animate} />
              </BarChart>
            </ChartCard>
            <ChartCard title="Leave days by type" subtitle="All leave requests in the register" height="sm" isEmpty={!leaves.byType.length} emptyMessage="No leave records are available.">
              <BarChart data={leaves.byType.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={104} {...axisProps} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Days" fill="var(--chart-3)" radius={[0, 6, 6, 0]} isAnimationActive={animate} />
              </BarChart>
            </ChartCard>
          </div>

          <div className="hr-dashboard-grid hr-dashboard-grid--1-1">
            <ChartCard title="Payroll preparation by department" subtitle={masked ? 'Amounts masked for this preview role' : payroll?.period ?? 'Current payroll run'} height="sm">
              {masked ? (
                <div className="hr-chart-mask">
                  <LockKeyhole size={22} />
                  <strong>Payroll amounts are masked</strong>
                  <span>Switch to the Marketing Manager preview role to review compensation analytics.</span>
                </div>
              ) : (
                <BarChart data={payrollByDepartment} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <YAxis type="category" dataKey="name" width={104} {...axisProps} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Net pay" fill="var(--chart-6)" radius={[0, 6, 6, 0]} isAnimationActive={animate} />
                </BarChart>
              )}
            </ChartCard>

            <SectionCard title="Performance rating distribution" subtitle={`${hr.performanceReviews.length} reviews · ${average.toFixed(1)} average rating`}>
              <div className="hr-rating-distribution">
                {ratingDistribution.map((rating, index) => (
                  <div className="hr-rating-distribution__row" key={rating.name}>
                    <span className="hr-rating-distribution__label">
                      <Star size={12} style={{ color: chartColors[index] }} />
                      {rating.name}
                    </span>
                    <span className="hr-legend-row__bar">
                      <span
                        style={{
                          width: `${(rating.value / Math.max(1, ...ratingDistribution.map((item) => item.value))) * 100}%`,
                          background: chartColors[index],
                        }}
                      />
                    </span>
                    <strong>{rating.value}</strong>
                  </div>
                ))}
              </div>
              <div className="hr-report-health">
                <div>
                  <span><ClipboardCheck size={13} /> Requests completed</span>
                  <strong>{requestsCompleted}</strong>
                </div>
                <div>
                  <span><FileCheck2 size={13} /> Documents pending</span>
                  <strong>{pendingDocs}</strong>
                </div>
                <div>
                  <span><UserMinus size={13} /> Exits in progress</span>
                  <strong>{exitsInProgress}</strong>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
            <SectionCard title="Reporting notes" subtitle="How these figures are calculated">
              <div className="hr-simple-list">
                <div className="hr-simple-row">
                  <span className="hr-simple-row__icon"><CalendarCheck size={14} /></span>
                  <span className="grow"><strong>Attendance</strong><small>Calculated from recorded ERP punches. Absent excludes approved leave and applicable holidays.</small></span>
                </div>
                <div className="hr-simple-row">
                  <span className="hr-simple-row__icon"><CalendarClock size={14} /></span>
                  <span className="grow"><strong>Leave</strong><small>Approved, pending and rejected requests are counted from one shared leave register.</small></span>
                </div>
                <div className="hr-simple-row">
                  <span className="hr-simple-row__icon"><Wallet size={14} /></span>
                  <span className="grow"><strong>Payroll</strong><small>Attendance and approved leave adjustments are applied once. Finance retains payment processing and financial approval.</small></span>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Quick links" subtitle="Jump into the operational module">
              <div className="hr-quick-links">
                {[
                  { label: 'Attendance register', href: hrWorkspacePath('attendance'), icon: CalendarCheck },
                  { label: 'Leave approvals', href: hrWorkspacePath('leave'), icon: CalendarClock },
                  { label: 'Payroll verification', href: hrWorkspacePath('payroll'), icon: Wallet },
                  { label: 'HR settings', href: hrWorkspacePath('settings'), icon: Gauge },
                ].map((link) => {
                  const Icon = link.icon
                  return (
                    <button type="button" className="hr-quick-link" key={link.label} onClick={() => navigate(link.href)}>
                      <Icon size={14} />
                      <span>{link.label}</span>
                      <ArrowUpRight size={13} />
                    </button>
                  )
                })}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {tab === 'library' ? (
        <>
          <div className="hr-report-grid">
            {reportLibrary.map((report) => {
              const Icon = report.icon
              return (
                <article className="hr-report-card" key={report.id} style={{ '--hr-report-tone': report.tone } as CSSProperties}>
                  <div className="hr-report-card__head">
                    <span className="hr-report-card__icon"><Icon size={17} /></span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <h3>{report.title}</h3>
                      <p>{report.description}</p>
                    </div>
                  </div>
                  <div className="hr-report-card__meta">
                    <span><strong>{formatNumber(report.records)}</strong> records</span>
                    <span>{report.period}</span>
                  </div>
                  <div className="hr-report-card__foot">
                    <Button variant="ghost" size="xs" onClick={() => navigate(report.href)}>
                      Open module
                    </Button>
                    {report.restricted ? (
                      <span className="hr-mask-note"><LockKeyhole size={12} /> Manager only</span>
                    ) : (
                      <Button variant="soft" size="xs" icon={<Download size={12} />} onClick={report.run}>
                        Export CSV
                      </Button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
          <HRInfoNote>
            Reports are generated from the local HR records in this browser. Payroll exports containing compensation are
            restricted to HR administrators; Finance retains payment processing and financial approval.
          </HRInfoNote>
        </>
      ) : null}

      {tab === 'audit' ? (
        <>
          <div className="hr-audit-summary">
            <span><strong>{hr.activity.length}</strong><small>Audit entries</small></span>
            <span><strong>{metrics.pendingCorrections}</strong><small>Pending corrections</small></span>
            <span><strong>{leaves.pendingCount}</strong><small>Pending leave</small></span>
            <span><strong>{pendingDocs}</strong><small>Pending documents</small></span>
          </div>
          <DataTable
            data={filteredActivity}
            loading={loading}
            rowKey={(row) => row.id}
            searchable={(row) => `${row.actor} ${row.action} ${row.detail} ${row.module}`}
            searchPlaceholder="Search actor, action or detail…"
            filters={
              <HRFilterSelect
                label="Module"
                value={moduleFilter}
                options={modules}
                onChange={setModuleFilter}
                ariaLabel="Filter audit trail by module"
              />
            }
            columns={[
              {
                id: 'when',
                header: 'When',
                sortValue: (row) => row.at,
                render: (row) => (
                  <span className="hr-table-text">
                    {relativeTime(row.at)}
                    <small className="hr-table-subtext">{formatDateLong(row.at.slice(0, 10))}</small>
                  </span>
                ),
              },
              { id: 'actor', header: 'Actor', sortValue: (row) => row.actor, render: (row) => <strong className="hr-table-text">{row.actor}</strong> },
              {
                id: 'action',
                header: 'Action',
                sortValue: (row) => row.action,
                mobileLabel: 'Action',
                render: (row) => (
                  <span className="hr-table-text">
                    {row.action}
                    <small className="hr-table-subtext">{row.detail}</small>
                  </span>
                ),
              },
              {
                id: 'module',
                header: 'Module',
                sortValue: (row) => row.module,
                mobileLabel: 'Module',
                render: (row) => <Badge tone={hrStatusTone(row.module === 'system' ? 'neutral' : 'info')}>{moduleLabel(row.module)}</Badge>,
              },
              { id: 'tone', header: 'Type', mobileLabel: 'Entry type', render: (row) => <HRStatusBadge status={row.tone} /> },
            ]}
            emptyTitle="No audit entries match this filter"
            emptyDescription="Clear the module filter or perform an HR action to create a new audit entry."
            footerNote={<span>The audit trail records HR actions taken in this browser. Attendance corrections and leave decisions remain traceable.</span>}
          />
        </>
      ) : null}

      <HRPermissionNote roleId={profile.id}>
        {permissions.canViewPayrollAmounts
          ? 'You are viewing HR administrator reporting. Compensation analytics are visible, but payment processing and financial approval remain with Finance.'
          : 'Sensitive salary and payroll reporting is masked in this preview role. Switch to the Marketing Manager role to review compensation analytics.'}
      </HRPermissionNote>

      <HRDemoFooter>
        All reports are generated from local demonstration records. No analytics warehouse, payroll processor or bank
        connection is present.
      </HRDemoFooter>
    </HRPageShell>
  )
}
