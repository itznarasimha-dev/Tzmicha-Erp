import { useMemo, useState } from 'react'
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
  AlarmClock,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Download,
  LogIn,
  LogOut,
  PenLine,
  ShieldCheck,
  Timer,
} from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ChartCard, ChartTooltip, axisProps, chartColors, gridProps, useChartAnimation } from '../../components/charts/ChartKit'
import { useHRData } from '../../context/HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { hrPermissionSummary } from '../../config/hrNavigation'
import { FilterTabs, useCsvExport } from '../workspace/workspaceShared'
import { HR_TODAY } from '../../data/hr'
import {
  attendanceMetrics,
  attendanceTrend,
  currentEmployee,
  formatDateLong,
} from '../../utils/hr'
import { formatNumber, formatPercent } from '../../utils/format'
import type { HRAttendanceRecord, HRCorrectionRequest } from '../../types/hr'
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

type TabId = 'register' | 'trends' | 'corrections' | 'policies'

export function HRAttendance() {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const exportCsv = useCsvExport()
  const animate = useChartAnimation()
  const loading = useInitialLoading()

  const [tab, setTab] = useState<TabId>('register')
  const [date, setDate] = useState(HR_TODAY)
  const [department, setDepartment] = useState('All departments')
  const [status, setStatus] = useState('All statuses')
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [decision, setDecision] = useState<HRCorrectionRequest | null>(null)
  const [decisionNote, setDecisionNote] = useState('')

  const me = currentEmployee(hr, profile)
  const metrics = useMemo(() => attendanceMetrics(hr, date), [hr, date])
  const trend = useMemo(() => attendanceTrend(hr, range), [hr, range])

  const departments = useMemo(
    () => ['All departments', ...Array.from(new Set(hr.attendance.map((record) => record.department))).sort()],
    [hr.attendance],
  )

  const records = useMemo(
    () =>
      hr.attendance
        .filter((record) => record.date === date)
        .filter((record) => department === 'All departments' || record.department === department)
        .filter((record) => status === 'All statuses' || record.status === status)
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
    [hr.attendance, date, department, status],
  )

  const departmentAttendance = useMemo(() => {
    return Array.from(new Set(hr.employees.map((employee) => employee.department)))
      .map((name) => {
        const total = hr.employees.filter((employee) => employee.department === name).length
        const present = metrics.records.filter(
          (record) => record.department === name && ['Present', 'Late'].includes(record.status),
        ).length
        return { name, total, present, rate: total ? (present / total) * 100 : 0 }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [hr.employees, metrics.records])

  const statusMix = useMemo(() => {
    const counts = [
      { name: 'Present', value: metrics.presentRecords.filter((record) => record.status === 'Present').length, color: 'var(--chart-2)' },
      { name: 'Late', value: metrics.lateRecords.length, color: 'var(--chart-3)' },
      { name: 'On leave', value: metrics.onLeave, color: 'var(--chart-1)' },
      { name: 'Absent', value: metrics.absent, color: 'var(--chart-4)' },
    ]
    return counts.filter((item) => item.value > 0)
  }, [metrics])

  const todayRecord = me ? hr.attendance.find((record) => record.employeeId === me.employeeId && record.date === HR_TODAY) : undefined

  const exportRegister = () => {
    exportCsv(
      `hr-attendance-${date}.csv`,
      [
        { header: 'Employee', value: (row: HRAttendanceRecord) => row.employeeName },
        { header: 'Employee ID', value: (row: HRAttendanceRecord) => row.employeeId },
        { header: 'Department', value: (row: HRAttendanceRecord) => row.department },
        { header: 'Date', value: (row: HRAttendanceRecord) => row.date },
        { header: 'Check in', value: (row: HRAttendanceRecord) => row.checkIn ?? '' },
        { header: 'Check out', value: (row: HRAttendanceRecord) => row.checkOut ?? '' },
        { header: 'Hours', value: (row: HRAttendanceRecord) => String(row.workingHours) },
        { header: 'Status', value: (row: HRAttendanceRecord) => row.status },
        { header: 'Source', value: (row: HRAttendanceRecord) => row.source },
      ],
      records,
    )
  }

  const decide = (next: 'Approved' | 'Rejected') => {
    if (!decision) return
    hr.decideCorrection(decision.id, next, decisionNote)
    setDecision(null)
    setDecisionNote('')
  }

  return (
    <HRPageShell
      section="attendance"
      title="Attendance"
      subtitle="Attendance is calculated from recorded ERP punches. Absent counts exclude approved leave and holidays, and every correction is auditable."
      eyebrow="Time & attendance"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportRegister}>
            Export register
          </Button>
          <Button variant="primary" icon={<PenLine size={14} />} onClick={() => setCorrectionOpen(true)}>
            Request correction
          </Button>
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>Attendance rate</small><strong>{formatPercent(metrics.attendanceRate, 0)}</strong></span>
          <span className="hr-inline-meta"><small>Pending corrections</small><strong>{metrics.pendingCorrections}</strong></span>
        </>
      }
    >
      <HRSummaryGrid>
        <HRSummaryTile label="Present" value={formatNumber(metrics.present)} hint="Recorded punches" icon={<CalendarCheck size={16} />} tone="var(--chart-2)" />
        <HRSummaryTile label="Late" value={formatNumber(metrics.late)} hint="After the grace period" icon={<AlarmClock size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="On leave" value={formatNumber(metrics.onLeave)} hint="Approved leave only" icon={<CalendarDays size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="Absent" value={formatNumber(metrics.absent)} hint={metrics.holiday ? `Holiday · ${metrics.holidayName}` : 'Excludes approved leave'} icon={<Calendar size={16} />} tone="var(--chart-4)" />
        <HRSummaryTile label="Average hours" value={`${metrics.avgHours.toFixed(1)}h`} hint="Across present records" icon={<Timer size={16} />} tone="var(--chart-6)" />
      </HRSummaryGrid>

      <div className="hr-day-toolbar">
        <label className="ws-filter-select hr-filter-select">
          <span>Attendance date</span>
          <input className="input" type="date" value={date} max={HR_TODAY} onChange={(event) => setDate(event.target.value)} />
        </label>
        {me ? (
          <div className="hr-self-punch">
            <span className="hr-self-punch__who">
              <strong>{me.name}</strong>
              <small>{todayRecord?.checkIn ? `Checked in at ${todayRecord.checkIn}` : 'No check-in recorded today'}</small>
            </span>
            <Button
              variant="soft"
              size="sm"
              icon={<LogIn size={14} />}
              onClick={() => hr.markCheckIn(me.employeeId)}
              disabled={Boolean(todayRecord?.checkIn)}
            >
              Check in
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<LogOut size={14} />}
              onClick={() => hr.markCheckOut(me.employeeId)}
              disabled={!todayRecord?.checkIn || Boolean(todayRecord?.checkOut)}
            >
              Check out
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="Attendance views"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'register', label: 'Daily register', count: metrics.records.length },
            { id: 'trends', label: 'Trends & distribution' },
            { id: 'corrections', label: 'Corrections', count: hr.correctionRequests.filter((item) => item.status === 'Pending').length },
            { id: 'policies', label: 'Policies & holidays' },
          ]}
        />
      </div>

      {tab === 'register' ? (
        <>
          <DataTable
            data={records}
            loading={loading}
            rowKey={(row) => row.id}
            searchable={(row) => `${row.employeeName} ${row.employeeId} ${row.department} ${row.status}`}
            searchPlaceholder="Search employee, department or status…"
            filters={
              <>
                <HRFilterSelect label="Department" value={department} options={departments} onChange={setDepartment} />
                <HRFilterSelect
                  label="Status"
                  value={status}
                  options={['All statuses', 'Present', 'Late', 'On Leave', 'Absent', 'Holiday']}
                  onChange={setStatus}
                />
              </>
            }
            columns={[
              {
                id: 'employee',
                header: 'Employee',
                sortValue: (row) => row.employeeName,
                render: (row) => (
                  <span className="hr-table-text">
                    <strong>{row.employeeName}</strong>
                    <small className="hr-table-subtext">{row.employeeId} · {row.department}</small>
                  </span>
                ),
              },
              {
                id: 'checkIn',
                header: 'Check in',
                sortValue: (row) => row.checkIn ?? '',
                mobileLabel: 'Check in',
                render: (row) => <span className="hr-time-cell">{row.checkIn ?? '—'}</span>,
              },
              {
                id: 'checkOut',
                header: 'Check out',
                sortValue: (row) => row.checkOut ?? '',
                mobileLabel: 'Check out',
                render: (row) => <span className="hr-time-cell">{row.checkOut ?? '—'}</span>,
              },
              {
                id: 'hours',
                header: 'Hours',
                align: 'right',
                sortValue: (row) => row.workingHours,
                mobileLabel: 'Working hours',
                render: (row) => <span className="hr-table-text">{row.workingHours ? `${row.workingHours.toFixed(1)}h` : '—'}</span>,
              },
              {
                id: 'status',
                header: 'Status',
                sortValue: (row) => row.status,
                mobileLabel: 'Status',
                render: (row) => (
                  <span className="hr-attendance-status">
                    <HRStatusBadge status={row.status} />
                    {row.lateMinutes ? <small>{row.lateMinutes}m late</small> : null}
                  </span>
                ),
              },
              {
                id: 'source',
                header: 'Source',
                mobileLabel: 'Source',
                render: (row) => (
                  <Badge tone={row.source === 'Correction' ? 'accent' : 'neutral'} dot={false}>
                    {row.source}
                  </Badge>
                ),
              },
            ]}
            emptyTitle="No attendance records for this day"
            emptyDescription="Choose another date or clear the department and status filters."
            footerNote={
              <span>
                Showing {formatDateLong(date)}. Absences exclude approved leave and holidays. Corrections are applied once
                and added to the audit trail.
              </span>
            }
          />
          {metrics.holiday ? (
            <HRInfoNote tone="success">Today is recorded as a holiday ({metrics.holidayName}). Absent is not counted.</HRInfoNote>
          ) : null}
        </>
      ) : null}

      {tab === 'trends' ? (
        <>
          <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
            <ChartCard
              title="Attendance trend"
              subtitle="Recorded ERP attendance across the selected range"
              height="md"
              actions={
                <FilterTabs
                  ariaLabel="Attendance trend range"
                  value={range}
                  onChange={(value) => setRange(value as typeof range)}
                  options={[
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                  ]}
                />
              }
              legend={
                <>
                  <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-2)' }} />Present</span>
                  <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-3)' }} />On leave</span>
                  <span className="chart-legend__item"><span className="chart-legend__dot" style={{ background: 'var(--chart-4)' }} />Absent</span>
                </>
              }
            >
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="hr-att-present" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="present" name="Present" stroke="var(--chart-2)" fill="url(#hr-att-present)" strokeWidth={2} isAnimationActive={animate} />
                <Area type="monotone" dataKey="onLeave" name="On leave" stroke="var(--chart-3)" fill="transparent" strokeWidth={1.8} isAnimationActive={animate} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke="var(--chart-4)" fill="transparent" strokeWidth={1.6} strokeDasharray="4 3" isAnimationActive={animate} />
              </AreaChart>
            </ChartCard>

            <ChartCard title="Today's status mix" subtitle={`${formatDateLong(date)}`} height="md" isEmpty={!statusMix.length} emptyMessage="No attendance recorded for this date.">
              <PieChart>
                <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2} stroke="none">
                  {statusMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ChartCard>
          </div>

          <div className="hr-dashboard-grid hr-dashboard-grid--1-1">
            <SectionCard title="Attendance by department" subtitle="Present against headcount">
              <div className="hr-attendance-list">
                {departmentAttendance.map((item, index) => (
                  <div className="hr-attendance-row" key={item.name}>
                    <div className="between">
                      <span>{item.name}</span>
                      <strong>{item.present}/{item.total}</strong>
                    </div>
                    <div className="hr-progress">
                      <span className="hr-progress__bar" style={{ width: `${item.rate}%`, background: chartColors[index % chartColors.length] }} />
                    </div>
                    <small>{formatPercent(item.rate, 0)} present</small>
                  </div>
                ))}
              </div>
            </SectionCard>

            <ChartCard title="Late arrivals" subtitle="Count by day in the selected range" height="sm">
              <BarChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="late" name="Late arrivals" fill="var(--chart-3)" radius={[6, 6, 0, 0]} isAnimationActive={animate} />
              </BarChart>
            </ChartCard>
          </div>
        </>
      ) : null}

      {tab === 'corrections' ? (
        <DataTable
          data={hr.correctionRequests}
          rowKey={(row) => row.id}
          searchable={(row) => `${row.employeeName} ${row.reason} ${row.status} ${row.date}`}
          searchPlaceholder="Search employee, reason or status…"
          columns={[
            {
              id: 'employee',
              header: 'Employee',
              render: (row) => (
                <span className="hr-table-text">
                  <strong>{row.employeeName}</strong>
                  <small className="hr-table-subtext">{formatDateLong(row.date)}</small>
                </span>
              ),
            },
            {
              id: 'requested',
              header: 'Requested punch',
              mobileLabel: 'Requested punch',
              render: (row) => <span className="hr-time-cell">{row.requestedCheckIn} – {row.requestedCheckOut}</span>,
            },
            {
              id: 'reason',
              header: 'Reason',
              mobileLabel: 'Reason',
              render: (row) => <span className="hr-table-text hr-table-text--clamp">{row.reason}</span>,
            },
            {
              id: 'status',
              header: 'Status',
              render: (row) => (
                <span className="hr-table-text">
                  <HRStatusBadge status={row.status} />
                  {row.reviewNote ? <small className="hr-table-subtext">{row.reviewNote}</small> : null}
                </span>
              ),
            },
            {
              id: 'actions',
              header: 'Decision',
              align: 'right',
              render: (row) =>
                row.status === 'Pending' && permissions.canCorrectAttendance ? (
                  <Button variant="soft" size="xs" onClick={() => { setDecision(row); setDecisionNote('') }}>
                    Review
                  </Button>
                ) : (
                  <span className="faint">{row.decidedBy ?? '—'}</span>
                ),
            },
          ]}
          emptyTitle="No correction requests"
          emptyDescription="Employees can raise an attendance correction from the daily register."
          footerNote={<span>Approved corrections update the attendance register once, with the approver and note saved for audit.</span>}
        />
      ) : null}

      {tab === 'policies' ? (
        <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
          <SectionCard title="Attendance policies" subtitle="Shift, grace period and late-mark rules by department">
            <div className="hr-policy-list">
              {hr.attendancePolicies.map((policy) => (
                <div className="hr-policy-card" key={policy.id}>
                  <div className="between">
                    <strong>{policy.name}</strong>
                    <Badge tone="neutral" dot={false}>{policy.department}</Badge>
                  </div>
                  <div className="hr-policy-card__grid">
                    <span><small>Shift</small><strong>{policy.checkIn} – {policy.checkOut}</strong></span>
                    <span><small>Grace</small><strong>{policy.graceMinutes} min</strong></span>
                    <span><small>Full day</small><strong>{policy.fullDayHours}h</strong></span>
                    <span><small>Late after</small><strong>{policy.lateMarkAfter}</strong></span>
                  </div>
                  <small className="hr-policy-card__foot">Working days: {policy.workingDays}</small>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Holidays" subtitle="Company and public holidays in this demo year">
            <div className="hr-holiday-list">
              {hr.holidays
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((holiday) => (
                  <div className="hr-holiday-row" key={holiday.id}>
                    <span className="hr-holiday-row__date">{formatDateLong(holiday.date)}</span>
                    <span className="grow"><strong>{holiday.name}</strong><small>{holiday.type} holiday</small></span>
                    <Badge tone={holiday.date === HR_TODAY ? 'success' : 'neutral'}>{holiday.date === HR_TODAY ? 'Today' : holiday.type}</Badge>
                  </div>
                ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {!permissions.canCorrectAttendance ? (
        <HRPermissionNote roleId={profile.id}>
          You can raise a correction for your own attendance. Approving corrections requires the Senior or Marketing
          Manager preview role.
        </HRPermissionNote>
      ) : null}

      <HRDemoFooter>
        Attendance uses recorded ERP punches, approved leave and the holiday calendar. Corrections never create a second
        payroll adjustment.
      </HRDemoFooter>

      <RequestCorrectionModal open={correctionOpen} onClose={() => setCorrectionOpen(false)} />

      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title="Review attendance correction"
        description={decision ? `${decision.employeeName} · ${formatDateLong(decision.date)}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecision(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => decide('Rejected')}>Reject</Button>
            <Button variant="primary" icon={<ShieldCheck size={14} />} onClick={() => decide('Approved')}>Approve</Button>
          </>
        }
      >
        {decision ? (
          <div className="hr-decision">
            <div className="hr-decision__punch">
              <Clock3 size={16} />
              <span><small>Recorded</small><strong>{decision.requestedCheckIn} – {decision.requestedCheckOut}</strong></span>
            </div>
            <p>{decision.reason}</p>
            <div className="field">
              <label htmlFor="hr-correction-note">Reviewer note</label>
              <textarea
                id="hr-correction-note"
                className="textarea"
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                placeholder="Add an audit note for this decision (optional)."
              />
            </div>
            <HRInfoNote>Approving updates the register once and records the approver, timestamp and note.</HRInfoNote>
          </div>
        ) : null}
      </Modal>
    </HRPageShell>
  )
}

function RequestCorrectionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const me = currentEmployee(hr, profile)
  const [date, setDate] = useState(HR_TODAY)
  const [checkIn, setCheckIn] = useState('09:00')
  const [checkOut, setCheckOut] = useState('18:00')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!me) return setError('No employee record is linked to this preview role.')
    if (!reason.trim()) return setError('Add a short reason for the correction.')
    hr.requestCorrection({ employeeId: me.employeeId, date, requestedCheckIn: checkIn, requestedCheckOut: checkOut, reason: reason.trim() })
    setReason('')
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request attendance correction"
      description="Corrections are reviewed before they change the attendance register."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Submit request</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-corr-employee">Employee</label>
          <input id="hr-corr-employee" className="input" value={me?.name ?? ''} readOnly />
        </div>
        <div className="field">
          <label htmlFor="hr-corr-date">Date</label>
          <input id="hr-corr-date" className="input" type="date" max={HR_TODAY} value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-corr-in">Correct check-in</label>
          <input id="hr-corr-in" className="input" type="time" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-corr-out">Correct check-out</label>
          <input id="hr-corr-out" className="input" type="time" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="hr-corr-reason">Reason</label>
          <textarea id="hr-corr-reason" className="textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why the recorded punch is wrong." />
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </Modal>
  )
}
