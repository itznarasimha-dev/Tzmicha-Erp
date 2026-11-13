import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight, CalendarDays, CheckCircle2, ClipboardList, Clock, FileText, MessageSquareText,
  Plane, Receipt, Sparkles, TrendingUp, UserCheck, Users, Wallet,
} from 'lucide-react'
import { useStore } from '../store'
import { useHrAccess } from '../lib/access'
import type { HrDashboardView } from '../lib/access'
import { addDays, fmtDate, fmtDateShort, fullName, monthLabel, sum, todayISO } from '../lib/utils'
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, ProgressBar, SectionCard, StatCard, StatusBadge } from './ui'

/**
 * Self-service dashboard shown to callers whose role only grants personal
 * HR modules (the seeded `employee` role, and any role without broad read
 * permissions).
 *
 * Every figure is derived from the store data that the API returned for this
 * caller — the backend already scopes attendance, leave, expenses, requests
 * and reviews to the signed-in employee.
 */
export function SelfServiceDashboard({ view }: { view: HrDashboardView }) {
  const { db, dataSource, toast } = useStore()
  const access = useHrAccess()
  const navigate = useNavigate()

  const meId = access.employeeId
  const today = todayISO()
  const weekStart = addDays(today, -6)

  const me = useMemo(
    () => db.employees.find((e) => e.id === meId) ?? null,
    [db.employees, meId],
  )

  const myAttendance = useMemo(
    () => (meId ? db.attendance.filter((a) => a.employeeId === meId) : []),
    [db.attendance, meId],
  )
  const myLeaves = useMemo(
    () => (meId ? db.leaves.filter((l) => l.employeeId === meId) : []),
    [db.leaves, meId],
  )
  const myPayslips = useMemo(
    () => (meId ? db.payroll.filter((p) => p.employeeId === meId) : []),
    [db.payroll, meId],
  )
  const myRequests = useMemo(
    () => (meId ? db.requests.filter((r) => r.employeeId === meId) : []),
    [db.requests, meId],
  )
  const myReviews = useMemo(
    () => (meId ? db.reviews.filter((r) => r.employeeId === meId) : []),
    [db.reviews, meId],
  )
  const myOnboarding = useMemo(
    () => (meId ? db.onboarding.filter((o) => o.employeeId === meId) : []),
    [db.onboarding, meId],
  )

  const weekRecords = myAttendance.filter((a) => a.date >= weekStart && a.date <= today)
  const presentDays = weekRecords.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length
  const attendanceRate = weekRecords.length ? Math.round((presentDays / weekRecords.length) * 100) : 0
  const hoursLogged = sum(weekRecords.map((a) => a.hours))

  const pendingLeaves = myLeaves.filter((l) => l.status === 'Pending').length
  const approvedLeaves = myLeaves.filter((l) => l.status === 'Approved')
  const leaveDays = sum(approvedLeaves.map((l) => l.days))
  const openRequests = myRequests.filter((r) => r.status === 'Open' || r.status === 'In Progress').length
  const latestPayslip = [...myPayslips].sort((a, b) => b.period.localeCompare(a.period))[0] ?? null
  const netPay = latestPayslip
    ? latestPayslip.basic + latestPayslip.allowances + latestPayslip.overtime - latestPayslip.deductions - latestPayslip.leaveDeduction - latestPayslip.tax
    : 0
  const activeReview = myReviews.find((r) => r.status !== 'Completed') ?? null
  const onboardingProgress = myOnboarding[0]
    ? Math.round(
        (myOnboarding[0].checklist.filter((c) => c.done).length /
          Math.max(1, myOnboarding[0].checklist.length)) * 100,
      )
    : 0

  const recentAttendance = [...myAttendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  const recentLeaves = [...myLeaves].sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)).slice(0, 6)
  const recentRequests = [...myRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)

  const exportMySummary = () => {
    const rows: (string | number)[][] = [
      ['Personal HR summary'],
      ['Employee', me ? fullName(me) : meId ?? ''],
      ['Generated', today],
      [],
      ['Metric', 'Value'],
      ['Attendance records (7 days)', weekRecords.length],
      ['Attendance rate (%)', attendanceRate],
      ['Hours logged', hoursLogged],
      ['Leave requests (all)', myLeaves.length],
      ['Pending leave requests', pendingLeaves],
      ['Approved leave days', leaveDays],
      ['Open HR requests', openRequests],
      ['Payslips on record', myPayslips.length],
    ]
    import('../lib/utils').then(({ downloadCSV }) => {
      downloadCSV(`titan-hr-personal-summary-${today}.csv`, rows)
      toast('Personal summary exported', 'success', 'The CSV contains only your own HR records.')
    })
  }

  return (
    <div>
      <PageHeader
        title={me ? `Hello, ${me.firstName}` : 'My HR workspace'}
        subtitle={`${new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Your personal attendance, leave, payslips and requests.`}
        actions={
          <>
            <Button variant="secondary" onClick={exportMySummary}>Export my summary</Button>
            {access.can('leave.apply') && (
              <Button onClick={() => navigate('/leave?new=1')}><Plane className="h-4 w-4" /> Apply for leave</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          index={0}
          label="Attendance rate"
          value={`${attendanceRate}%`}
          icon={UserCheck}
          tone="green"
          hint={`${weekRecords.length} records · 7 days`}
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          index={1}
          label="Hours logged"
          value={`${Math.round(hoursLogged)}h`}
          icon={Clock}
          tone="brand"
          hint="last 7 days"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          index={2}
          label="Pending leave"
          value={pendingLeaves}
          icon={CalendarDays}
          tone="amber"
          hint={`${approvedLeaves.length} approved requests`}
          onClick={() => navigate('/leave')}
        />
        <StatCard
          index={3}
          label="Open requests"
          value={openRequests}
          icon={MessageSquareText}
          tone="violet"
          hint={`${myRequests.length} raised in total`}
          onClick={() => navigate('/requests')}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/[0.05]">
            <div>
              <h3 className="text-[15px] font-semibold">My recent attendance</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Only your own records — the ERP API scopes attendance to the signed-in employee.
              </p>
            </div>
            <button onClick={() => navigate('/attendance')} className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          {recentAttendance.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No attendance recorded yet"
              description={
                dataSource === 'api'
                  ? 'The ERP API has no attendance rows for your employee record.'
                  : 'Attendance records will appear here once they are logged.'
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {recentAttendance.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-[92px] shrink-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    {fmtDateShort(a.date)}
                  </span>
                  <StatusBadge status={a.status} />
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    {a.checkIn ? `${a.checkIn} – ${a.checkOut ?? '—'}` : 'no check-in recorded'}
                  </span>
                  <span className="ml-auto tabular text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">
                    {Math.round(a.hours)}h
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <SectionCard title="My leave" subtitle="Approved and pending requests" bodyClassName="p-4">
            {myLeaves.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-white/10">
                No leave requests yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentLeaves.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">{l.leaveType}</span>
                      <span className="block text-[10.5px] text-slate-400">
                        {fmtDateShort(l.from)} – {fmtDateShort(l.to)} · {l.days}d
                      </span>
                    </span>
                    <StatusBadge status={l.status} />
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-slate-400">{leaveDays} approved day(s) in total.</p>
          </SectionCard>

          <SectionCard title="My payslips" subtitle={access.can('payroll.read') ? 'Latest available period' : 'Restricted by your role'} bodyClassName="p-4">
            {latestPayslip && access.can('payroll.read') ? (
              <>
                <p className="tabular text-2xl font-bold text-slate-900 dark:text-white">{netPay.toLocaleString()}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  net pay · {monthLabel(latestPayslip.period)}
                </p>
                <div className="mt-3 space-y-1.5 text-[11.5px]">
                  <div className="flex justify-between"><span className="text-slate-500">Basic</span><span className="tabular font-semibold">{latestPayslip.basic.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Allowances</span><span className="tabular font-semibold">{latestPayslip.allowances.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Overtime</span><span className="tabular font-semibold">{latestPayslip.overtime.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Deductions</span><span className="tabular font-semibold text-rose-500">-{latestPayslip.deductions.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="tabular font-semibold text-rose-500">-{latestPayslip.tax.toLocaleString()}</span></div>
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-white/10">
                Payslip data is not available for your role. The ERP API requires payroll read permission.
              </p>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/[0.05]">
            <div>
              <h3 className="text-[15px] font-semibold">My HR requests</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Requests you raised and their current status</p>
            </div>
            {access.can('request.write') && (
              <Button size="sm" variant="secondary" onClick={() => navigate('/requests?new=1')}>New request</Button>
            )}
          </div>
          {recentRequests.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No HR requests"
              description="Requests you raise in the ERP appear here with their full status history."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {recentRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{r.subject}</span>
                    <span className="block text-[10.5px] text-slate-400">
                      {r.type} · raised {fmtDate(r.createdAt)}
                      {r.assignedTo ? ` · assigned to ${r.assignedTo}` : ''}
                    </span>
                  </span>
                  <Badge tone={r.priority === 'Urgent' || r.priority === 'High' ? 'red' : 'slate'}>{r.priority}</Badge>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <SectionCard title="My performance" subtitle="Review cycle status" bodyClassName="p-4">
            {myReviews.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-white/10">
                No performance review has been assigned to you.
              </p>
            ) : (
              <div className="space-y-3">
                {myReviews.slice(0, 3).map((r) => (
                  <div key={r.id} className="rounded-lg bg-slate-50 p-3 dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{r.cycle}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-slate-400">Period {r.period}</p>
                    {r.selfRating > 0 && (
                      <ProgressBar className="mt-2" size="sm" value={(r.selfRating / 5) * 100} tone="brand" showLabel />
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="My onboarding" subtitle="Assigned checklist progress" bodyClassName="p-4">
            {myOnboarding.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-white/10">
                No onboarding checklist is assigned to you.
              </p>
            ) : (
              <>
                <p className="tabular text-2xl font-bold text-slate-900 dark:text-white">{onboardingProgress}%</p>
                <p className="mt-0.5 text-[11px] text-slate-400">checklist complete</p>
                <ProgressBar className="mt-3" value={onboardingProgress} tone="green" />
              </>
            )}
          </SectionCard>

          <Card className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-violet-700 p-5 text-white">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-100">
                <Sparkles className="h-3.5 w-3.5" /> Personal pulse
              </div>
              <p className="mt-3 font-display text-[16px] font-semibold leading-snug">
                {attendanceRate >= 90
                  ? 'Your attendance is on track. Keep your leave requests up to date.'
                  : 'Your attendance needs attention this week. Log any corrections early.'}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <p className="tabular text-xl font-bold">{pendingLeaves}</p>
                  <p className="text-[10px] text-brand-100">leave requests pending</p>
                </div>
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <p className="tabular text-xl font-bold">{openRequests}</p>
                  <p className="text-[10px] text-brand-100">open HR requests</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * Manager dashboard: only the team the signed-in caller actually manages
 * (`hr_employees.manager_id`) plus their own approvals.
 */
export function ManagerDashboard() {
  const { db } = useStore()
  const access = useHrAccess()
  const navigate = useNavigate()
  const today = todayISO()

  const meId = access.employeeId
  const team = useMemo(
    () => (meId ? db.employees.filter((e) => e.managerId === meId && e.status !== 'Terminated') : []),
    [db.employees, meId],
  )
  const teamIds = useMemo(() => new Set(team.map((e) => e.id)), [team])

  const teamAttendance = useMemo(
    () => db.attendance.filter((a) => teamIds.has(a.employeeId) && a.date === today),
    [db.attendance, teamIds, today],
  )
  const present = teamAttendance.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length
  const absent = teamAttendance.filter((a) => a.status === 'Absent').length
  const onLeave = teamAttendance.filter((a) => a.status === 'On Leave').length

  const teamLeaves = useMemo(
    () => db.leaves.filter((l) => teamIds.has(l.employeeId)),
    [db.leaves, teamIds],
  )
  const pendingLeaves = teamLeaves.filter((l) => l.status === 'Pending')
  const teamReviews = useMemo(
    () => db.reviews.filter((r) => teamIds.has(r.employeeId)),
    [db.reviews, teamIds],
  )
  const pendingReviews = teamReviews.filter((r) => r.status !== 'Completed')
  const teamRequests = useMemo(
    () => db.requests.filter((r) => teamIds.has(r.employeeId)),
    [db.requests, teamIds],
  )
  const openRequests = teamRequests.filter((r) => r.status === 'Open' || r.status === 'In Progress')

  return (
    <div>
      <PageHeader
        title="Team overview"
        subtitle="Attendance, leave and performance for the employees who report to you."
        crumbs={['Dashboard']}
        actions={
          access.can('leave.approve') ? (
            <Button onClick={() => navigate('/leave')}>
              <CheckCircle2 className="h-4 w-4" /> Review pending leave
            </Button>
          ) : undefined
        }
      />

      {team.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">No reporting team assigned</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            The ERP directory does not list any employee with you as their reporting manager. Ask an HR administrator to
            set the manager relationship in the employee record.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard index={0} label="Team size" value={team.length} icon={UserCheck} tone="brand" hint="direct reports" onClick={() => navigate('/employees')} />
            <StatCard index={1} label="Present today" value={present} icon={CheckCircle2} tone="green" hint={`${absent} absent · ${onLeave} on leave`} onClick={() => navigate('/attendance')} />
            <StatCard index={2} label="Pending leave" value={pendingLeaves.length} icon={CalendarDays} tone="amber" hint="awaiting review" onClick={() => navigate('/leave')} />
            <StatCard index={3} label="Open requests" value={openRequests.length} icon={MessageSquareText} tone="violet" hint={`${pendingReviews.length} reviews in progress`} onClick={() => navigate('/requests')} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/[0.05]">
                <div>
                  <h3 className="text-[15px] font-semibold">My team</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Employees whose manager you are</p>
                </div>
                <Badge tone="slate">{team.length} people</Badge>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {team.map((e) => {
                  const record = teamAttendance.find((a) => a.employeeId === e.id)
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={fullName(e)} src={e.photo} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{fullName(e)}</span>
                        <span className="block truncate text-[10.5px] text-slate-400">{e.designation} · {e.department}</span>
                      </span>
                      {record ? <StatusBadge status={record.status} /> : <span className="text-[11px] text-slate-400">no record</span>}
                    </div>
                  )
                })}
              </div>
            </Card>

            <SectionCard title="Pending approvals" subtitle="Items waiting on a decision" bodyClassName="p-3">
              {pendingLeaves.length === 0 && openRequests.length === 0 && pendingReviews.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400 dark:border-white/10">
                  Nothing is waiting for your review.
                </p>
              ) : (
                <div className="space-y-1">
                  {pendingLeaves.slice(0, 4).map((l) => (
                    <button key={l.id} onClick={() => navigate('/leave')} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"><CalendarDays className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">{l.leaveType} · {l.days}d</span>
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/[0.07] dark:text-slate-300">{pendingLeaves.length}</span>
                    </button>
                  ))}
                  {openRequests.slice(0, 4).map((r) => (
                    <button key={r.id} onClick={() => navigate('/requests')} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"><MessageSquareText className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-600 dark:text-slate-300">{r.subject}</span>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Finance dashboard: only the payroll, payment and expense information the
 * finance role is actually authorised to see.
 */
export function FinanceDashboard() {
  const { db } = useStore()
  const access = useHrAccess()
  const navigate = useNavigate()

  const pendingPayments = db.payments.filter((p) => p.approvalStatus === 'Pending')
  const pendingAmount = sum(pendingPayments.map((p) => p.amount))
  const paidThisPeriod = sum(db.payments.filter((p) => p.paymentStatus === 'Paid').map((p) => p.amount))
  const payrollByPeriod = useMemo(() => {
    const map = new Map<string, number>()
    db.payroll.forEach((p) => {
      map.set(p.period, (map.get(p.period) ?? 0) + p.basic + p.allowances + p.overtime - p.deductions - p.leaveDeduction - p.tax)
    })
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6)
  }, [db.payroll])
  const maxPayroll = payrollByPeriod.length ? payrollByPeriod[0][1] : 0

  return (
    <div>
      <PageHeader
        title="Finance & payroll overview"
        subtitle="Payroll positions, payment approvals and reimbursement workload for your finance scope."
        crumbs={['Dashboard']}
        actions={
          access.can('payment.approve') || access.can('expense.reimburse') ? (
            <Button onClick={() => navigate('/payments')}>
              <Wallet className="h-4 w-4" /> Review payments
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard index={0} label="Pending approvals" value={pendingPayments.length} icon={ClipboardList} tone="amber" hint="payment approvals" onClick={() => navigate('/payments')} />
        <StatCard index={1} label="Pending value" value={pendingAmount.toLocaleString()} icon={Wallet} tone="brand" hint="awaiting disbursement" />
        <StatCard index={2} label="Paid to date" value={paidThisPeriod.toLocaleString()} icon={CheckCircle2} tone="green" hint="settled payments" />
        <StatCard index={3} label="Payslips" value={db.payroll.length} icon={FileText} tone="violet" hint="across all periods" onClick={() => navigate('/payroll')} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Net payroll by period" subtitle="Derived from the payslips returned by the ERP API" bodyClassName="p-5">
          {payrollByPeriod.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400 dark:border-white/10">
              No payroll data is available for your scope.
            </p>
          ) : (
            <div className="space-y-2.5">
              {payrollByPeriod.map(([period, value]) => (
                <div key={period} className="flex items-center gap-3">
                  <span className="w-[92px] shrink-0 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{monthLabel(period)}</span>
                  <ProgressBar className="flex-1" size="sm" value={maxPayroll ? (value / maxPayroll) * 100 : 0} tone="brand" />
                  <span className="tabular w-24 text-right text-[11px] font-semibold text-slate-700 dark:text-slate-200">{value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Payments awaiting approval" subtitle="HR daily payments queued for finance" bodyClassName="p-3">
          {pendingPayments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-400 dark:border-white/10">
              No payments are waiting for approval.
            </p>
          ) : (
            <div className="space-y-1">
              {pendingPayments.slice(0, 8).map((p) => (
                <button key={p.id} onClick={() => navigate('/payments')} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"><Receipt className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-slate-600 dark:text-slate-300">{p.payee}</span>
                    <span className="block text-[10.5px] text-slate-400">{p.category} · due {fmtDate(p.dueDate)}</span>
                  </span>
                  <span className="tabular text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{p.amount.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

/**
 * Icons used above but referenced only for typing clarity.
 */
export const MANAGER_DASHBOARD_ICON = Users
export const FINANCE_DASHBOARD_ICON = TrendingUp
