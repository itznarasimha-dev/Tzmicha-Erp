import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight, Banknote, BriefcaseBusiness, Cake, CalendarClock, CalendarDays, CheckCircle2,
  ClipboardList, Clock, Download, FileSignature, PartyPopper, Plus, Sparkles, TrendingUp, UserCheck,
  UserPlus, UserX, Users, Video, Wallet,
} from 'lucide-react'
import { useStore } from '../store'
import type { Employee } from '../types'
import {
  addDays, CHART_COLORS, daysAgo, diffDays, fmtDate, fmtDateShort, fmtMoney, fullName,
  nextOccurrence, relativeTime, sum, todayISO,
} from '../lib/utils'
import { Avatar, Button, Card, PageHeader, ProgressBar, SectionCard, Skeleton, StatCard, StatusBadge, Badge } from '../components/ui'
import { AreaTrend, Donut, Funnel, Legend, Sparkline } from '../components/charts'

type Period = 'daily' | 'weekly' | 'monthly'

export default function Dashboard() {
  const { db, toast } = useStore()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('daily')
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('titan-hr-dashboard-seen'))

  useEffect(() => {
    if (!loading) return
    const t = window.setTimeout(() => {
      setLoading(false)
      sessionStorage.setItem('titan-hr-dashboard-seen', '1')
    }, 420)
    return () => window.clearTimeout(t)
  }, [loading])

  const today = todayISO()
  const activeEmployees = useMemo(() => db.employees.filter((e) => e.status !== 'Terminated'), [db.employees])
  const todayAttendance = useMemo(() => db.attendance.filter((a) => a.date === today), [db.attendance, today])

  const present = todayAttendance.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length
  const late = todayAttendance.filter((a) => a.status === 'Late').length
  const absent = todayAttendance.filter((a) => a.status === 'Absent').length
  const onLeave = todayAttendance.filter((a) => a.status === 'On Leave').length
  const pendingLeaves = db.leaves.filter((l) => l.status === 'Pending').length
  const activeContracts = db.contracts.filter((c) => c.status === 'Active' || c.status === 'Expiring Soon').length
  const pendingPayments = db.payments.filter((p) => p.approvalStatus === 'Pending' || ['Pending', 'Overdue'].includes(p.paymentStatus))
  const openJobs = db.jobs.filter((j) => j.status === 'Open')
  const openPositions = openJobs.reduce((a, j) => a + j.openings, 0)

  const attendanceSeries = useMemo(() => {
    const countByDate = (date: string) => {
      const records = db.attendance.filter((a) => a.date === date)
      return {
        present: records.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length,
        absent: records.filter((a) => a.status === 'Absent').length,
        leave: records.filter((a) => a.status === 'On Leave').length,
      }
    }
    if (period === 'daily') {
      const dates = Array.from(new Set(db.attendance.map((a) => a.date))).sort().slice(-7)
      return dates.map((date) => ({ label: fmtDateShort(date), ...countByDate(date) }))
    }
    if (period === 'weekly') {
      return Array.from({ length: 6 }).map((_, i) => {
        const start = addDays(today, -(5 - i) * 7 - 6)
        const end = addDays(today, -(5 - i) * 7)
        const records = db.attendance.filter((a) => a.date >= start && a.date <= end)
        return {
          label: fmtDateShort(start),
          present: records.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length,
          absent: records.filter((a) => a.status === 'Absent').length,
          leave: records.filter((a) => a.status === 'On Leave').length,
        }
      })
    }
    return Array.from({ length: 5 }).map((_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (4 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const records = db.attendance.filter((a) => a.date.startsWith(key))
      return {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        present: records.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length,
        absent: records.filter((a) => a.status === 'Absent').length,
        leave: records.filter((a) => a.status === 'On Leave').length,
      }
    })
  }, [db.attendance, period, today])

  const deptData = useMemo(() => {
    const map = new Map<string, number>()
    activeEmployees.forEach((e) => map.set(e.department, (map.get(e.department) || 0) + 1))
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }))
  }, [activeEmployees])

  const designationData = useMemo(() => {
    const groups: Record<string, number> = {}
    activeEmployees.forEach((e) => {
      const key = /director|head|vp/i.test(e.designation) ? 'Leadership' : /manager|lead/i.test(e.designation) ? 'Managers' : /senior/i.test(e.designation) ? 'Senior ICs' : /intern/i.test(e.designation) ? 'Interns' : 'Individual contributors'
      groups[key] = (groups[key] || 0) + 1
    })
    return Object.entries(groups).map(([name, value]) => ({ name, value }))
  }, [activeEmployees])

  const pipeline = useMemo(() => {
    const stages: { name: string; key: string; color: string }[] = [
      { name: 'Applied', key: 'Applied', color: '#6366f1' },
      { name: 'Screening', key: 'Screening', color: '#0ea5e9' },
      { name: 'Interview', key: 'Interview', color: '#8b5cf6' },
      { name: 'Offer', key: 'Offer', color: '#f59e0b' },
      { name: 'Hired', key: 'Hired', color: '#10b981' },
    ]
    return stages.map((s, i) => ({
      name: s.name,
      color: s.color,
      value: db.candidates.filter((c) => {
        if (c.stage === 'Rejected') return false
        const order = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired']
        return order.indexOf(c.stage) >= i
      }).length,
    }))
  }, [db.candidates])

  const leaveSummary = useMemo(() => {
    const approved = db.leaves.filter((l) => l.status === 'Approved').length
    const rejected = db.leaves.filter((l) => l.status === 'Rejected').length
    const pending = db.leaves.filter((l) => l.status === 'Pending').length
    const total = db.leaves.length
    const byType = Array.from(
      db.leaves.reduce((map, l) => {
        map.set(l.leaveType, (map.get(l.leaveType) || 0) + l.days)
        return map
      }, new Map<string, number>()),
    ).sort((a, b) => b[1] - a[1]).slice(0, 4)
    return { approved, rejected, pending, total, byType }
  }, [db.leaves])

  const contractSummary = useMemo(() => {
    const statuses = ['Active', 'Expiring Soon', 'Pending Signature', 'Pending Review', 'Draft', 'Expired', 'Renewed', 'Terminated']
    return statuses.map((s) => ({ status: s, count: db.contracts.filter((c) => c.status === s).length }))
  }, [db.contracts])

  const paymentSummary = useMemo(() => {
    const todayPaid = db.payments.filter((p) => p.date === today && p.paymentStatus === 'Paid')
    const pendingAmount = db.payments.filter((p) => p.approvalStatus === 'Pending' || p.paymentStatus === 'Pending').reduce((a, p) => a + p.amount, 0)
    const paidAmount = db.payments.filter((p) => p.paymentStatus === 'Paid').reduce((a, p) => a + p.amount, 0)
    const failed = db.payments.filter((p) => ['Failed', 'Overdue'].includes(p.paymentStatus)).length
    const week = Array.from({ length: 7 }).map((_, i) => {
      const date = daysAgo(6 - i)
      return db.payments.filter((p) => p.paymentStatus === 'Paid' && p.date <= date).reduce((a, p) => a + p.amount, 0)
    })
    return { todayPaid, pendingAmount, paidAmount, failed, week }
  }, [db.payments, today])

  const upcoming = useMemo(() => {
    const monthDay = (iso: string) => nextOccurrence(iso)
    const birthdays = activeEmployees
      .map((e) => ({ employee: e, date: monthDay(e.dob), inDays: diffDays(today, monthDay(e.dob)) }))
      .filter((x) => x.inDays >= 0 && x.inDays <= 30)
      .sort((a, b) => a.inDays - b.inDays)
      .slice(0, 3)
    const anniversaries = activeEmployees
      .map((e) => ({ employee: e, date: monthDay(e.joiningDate), inDays: diffDays(today, monthDay(e.joiningDate)), years: new Date().getFullYear() - new Date(e.joiningDate).getFullYear() }))
      .filter((x) => x.inDays > 0 && x.inDays <= 30 && x.years > 0)
      .sort((a, b) => a.inDays - b.inDays)
      .slice(0, 3)
    const interviews = db.candidates
      .filter((c) => c.interview && c.interview.date >= today)
      .sort((a, b) => (a.interview!.date > b.interview!.date ? 1 : -1))
      .slice(0, 3)
    const joiners = [...db.onboarding]
      .filter((o) => o.joiningDate >= today)
      .sort((a, b) => (a.joiningDate > b.joiningDate ? 1 : -1))
      .slice(0, 3)
    return { birthdays, anniversaries, interviews, joiners }
  }, [activeEmployees, db.candidates, db.onboarding, today])

  const pendingTasks = [
    { label: 'Leave requests awaiting review', count: pendingLeaves, to: '/leave', tone: 'amber' as const },
    { label: 'Contracts awaiting signature', count: db.contracts.filter((c) => c.status === 'Pending Signature').length, to: '/contracts', tone: 'violet' as const },
    { label: 'Payroll entries in review', count: db.payroll.filter((p) => p.status === 'HR Review' || p.status === 'Finance Approval').length, to: '/payroll', tone: 'blue' as const },
    { label: 'Payments pending approval', count: db.payments.filter((p) => p.approvalStatus === 'Pending').length, to: '/payments', tone: 'green' as const },
    { label: 'Onboarding documents to verify', count: db.onboarding.flatMap((o) => o.documents).filter((d) => d.status === 'Pending').length, to: '/onboarding', tone: 'orange' as const },
    { label: 'Performance reviews in progress', count: db.reviews.filter((r) => r.status !== 'Completed').length, to: '/performance', tone: 'rose' as const },
  ]

  const exportSnapshot = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total employees', activeEmployees.length],
      ['Present today', present],
      ['Absent today', absent],
      ['On leave today', onLeave],
      ['Pending leave requests', pendingLeaves],
      ['Active contracts', activeContracts],
      ['Pending payments', pendingPayments.length],
      ['Open positions', openPositions],
      ['Snapshot date', today],
    ]
    import('../lib/utils').then(({ downloadCSV }) => {
      downloadCSV(`titan-hr-dashboard-${today}.csv`, rows)
      toast('Dashboard snapshot exported', 'success', 'The CSV contains the KPI snapshot shown on this page.')
    })
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Good morning, Amara" subtitle="Preparing your people operations snapshot…" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[340px] lg:col-span-2" />
          <Skeleton className="h-[340px]" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Good morning, Amara`}
        subtitle={`${new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Here's what's happening across your workforce today.`}
        actions={
          <>
            <Button variant="secondary" onClick={exportSnapshot}><Download className="h-4 w-4" /> Export snapshot</Button>
            <Button onClick={() => navigate('/employees?new=1')}><Plus className="h-4 w-4" /> Add employee</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard index={0} label="Total employees" value={activeEmployees.length} icon={Users} tone="brand" delta={{ value: '3 this month', up: true }} hint="incl. 2 in probation" onClick={() => navigate('/employees')} />
        <StatCard index={1} label="Present today" value={present} icon={UserCheck} tone="green" delta={{ value: '92.4%', up: true }} hint={`${late} arrived late`} onClick={() => navigate('/attendance')} />
        <StatCard index={2} label="Absent today" value={absent} icon={UserX} tone="red" delta={{ value: '1.2%', up: false }} hint="unplanned absence" onClick={() => navigate('/attendance')} />
        <StatCard index={3} label="On leave today" value={onLeave} icon={CalendarDays} tone="amber" hint="approved absences" onClick={() => navigate('/leave')} />
        <StatCard index={4} label="Pending leave" value={pendingLeaves} icon={ClipboardList} tone="violet" hint="awaiting your review" onClick={() => navigate('/leave')} />
        <StatCard index={5} label="Active contracts" value={activeContracts} icon={FileSignature} tone="teal" hint={`${db.contracts.filter((c) => c.status === 'Expiring Soon').length} expiring soon`} onClick={() => navigate('/contracts')} />
        <StatCard index={6} label="Pending payments" value={pendingPayments.length} icon={Wallet} tone="orange" hint={`${fmtMoney(pendingPayments.reduce((a, p) => a + p.amount, 0), true)} awaiting action`} onClick={() => navigate('/payments')} />
        <StatCard index={7} label="Open positions" value={openPositions} icon={BriefcaseBusiness} tone="blue" hint={`across ${openJobs.length} job openings`} onClick={() => navigate('/recruitment')} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
            <div>
              <h3 className="text-[15px] font-semibold">Attendance overview</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Workforce presence across the selected period · demo records</p>
            </div>
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/[0.05]">
              {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition ${period === p ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5 px-5 pt-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> Present <b className="text-slate-700 dark:text-slate-200">{sum(attendanceSeries.map((d) => d.present))}</b></span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent <b className="text-slate-700 dark:text-slate-200">{sum(attendanceSeries.map((d) => d.absent))}</b></span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> On leave <b className="text-slate-700 dark:text-slate-200">{sum(attendanceSeries.map((d) => d.leave))}</b></span>
            <button onClick={() => navigate('/attendance')} className="ml-auto flex items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-400">View attendance <ArrowUpRight className="h-3 w-3" /></button>
          </div>
          <div className="px-2 pb-4 pt-2">
            <AreaTrend data={attendanceSeries} series={[{ key: 'present', name: 'Present', color: '#6366f1' }, { key: 'absent', name: 'Absent', color: '#f43f5e' }, { key: 'leave', name: 'On leave', color: '#f59e0b' }]} height={262} />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between px-5 pt-5">
            <div>
              <h3 className="text-[15px] font-semibold">By department</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{activeEmployees.length} active employees</p>
            </div>
            <Badge tone="slate">9 teams</Badge>
          </div>
          <div className="px-3">
            <Donut data={deptData} height={196} centerValue={activeEmployees.length} centerLabel="people" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-5 pb-5">
            {deptData.slice(0, 6).map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">{d.name}</span>
                <span className="font-semibold tabular text-slate-800 dark:text-slate-200">{d.value}</span>
              </div>
            ))}
            {deptData.length > 6 && <button onClick={() => navigate('/employees')} className="col-span-2 text-left text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400">+{deptData.length - 6} more teams</button>}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Recruitment pipeline</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{db.candidates.length} candidates · {openPositions} openings</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"><BriefcaseBusiness className="h-4 w-4" /></div>
          </div>
          <div className="mt-4"><Funnel stages={pipeline} /></div>
          <button onClick={() => navigate('/recruitment')} className="mt-4 flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]">Open pipeline <ArrowUpRight className="h-3.5 w-3.5" /></button>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Leave summary</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">All requests this cycle</p>
            </div>
            <Badge tone="amber">{pendingLeaves} pending</Badge>
          </div>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <div className="bg-emerald-500" style={{ width: `${(leaveSummary.approved / leaveSummary.total) * 100}%` }} />
            <div className="bg-amber-400" style={{ width: `${(leaveSummary.pending / leaveSummary.total) * 100}%` }} />
            <div className="bg-rose-400" style={{ width: `${(leaveSummary.rejected / leaveSummary.total) * 100}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[['Approved', leaveSummary.approved, 'text-emerald-600 dark:text-emerald-400'], ['Pending', leaveSummary.pending, 'text-amber-600 dark:text-amber-400'], ['Rejected', leaveSummary.rejected, 'text-rose-600 dark:text-rose-400']].map(([label, value, color]) => (
              <div key={label as string} className="rounded-lg bg-slate-50 py-2 dark:bg-white/[0.03]">
                <p className={`tabular text-lg font-bold ${color}`}>{value as number}</p>
                <p className="text-[10px] text-slate-400">{label as string}</p>
              </div>
            ))}
          </div>
          <div className="mt-3.5 space-y-2">
            {leaveSummary.byType.map(([type, days], i) => (
              <div key={type} className="flex items-center gap-2 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                <span className="flex-1 truncate text-slate-500 dark:text-slate-400">{type}</span>
                <span className="tabular font-semibold text-slate-700 dark:text-slate-200">{days}d</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Contract status</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{db.contracts.length} contracts in register</p>
            </div>
            <StatusBadge status={`${db.contracts.filter((c) => c.status === 'Expiring Soon').length} expiring`} />
          </div>
          <div className="mt-4 space-y-2.5">
            {contractSummary.slice(0, 5).map((c) => (
              <div key={c.status} className="flex items-center gap-2.5">
                <span className="w-[92px] shrink-0 text-[11px] text-slate-500 dark:text-slate-400">{c.status}</span>
                <ProgressBar value={(c.count / db.contracts.length) * 100} tone={c.status === 'Active' ? 'green' : c.status === 'Expiring Soon' ? 'amber' : c.status === 'Expired' ? 'red' : 'violet'} size="sm" />
                <span className="tabular w-5 text-right text-[11px] font-semibold text-slate-700 dark:text-slate-200">{c.count}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/contracts')} className="mt-4 flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]">Contract directory <ArrowUpRight className="h-3.5 w-3.5" /></button>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Daily payments</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Last 7 days payout curve</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><Banknote className="h-4 w-4" /></div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="tabular text-2xl font-bold text-slate-900 dark:text-white">{fmtMoney(paymentSummary.todayPaid.reduce((a, p) => a + p.amount, 0))}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">paid today · {paymentSummary.todayPaid.length} payments</p>
            </div>
            <div className="text-right">
              <p className="tabular text-sm font-bold text-amber-600 dark:text-amber-400">{fmtMoney(paymentSummary.pendingAmount, true)}</p>
              <p className="text-[10px] text-slate-400">pending</p>
            </div>
          </div>
          <Sparkline data={paymentSummary.week} color="#10b981" height={54} />
          <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px] dark:bg-white/[0.03]">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> {fmtMoney(paymentSummary.paidAmount, true)} total paid</span>
            {paymentSummary.failed > 0 && <span className="font-semibold text-rose-500">{paymentSummary.failed} need attention</span>}
          </div>
          <button onClick={() => navigate('/payments')} className="mt-2.5 flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]">Payment workspace <ArrowUpRight className="h-3.5 w-3.5" /></button>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/[0.05]">
            <div>
              <h3 className="text-[15px] font-semibold">Upcoming moments</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Birthdays, anniversaries, interviews and new joiners</p>
            </div>
            <CalendarClock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <MomentList title="Birthdays" icon={Cake} tone="bg-pink-50 text-pink-500 dark:bg-pink-500/10 dark:text-pink-400" items={upcoming.birthdays.map((b) => ({ key: b.employee.id, name: fullName(b.employee), photo: b.employee.photo, detail: `${fmtDate(b.date)} · turns ${new Date().getFullYear() - new Date(b.employee.dob).getFullYear()}`, tag: b.inDays === 0 ? 'Today' : `in ${b.inDays}d`, to: `/employees/${b.employee.id}` }))} empty="No birthdays in the next 30 days" />
            <MomentList title="Work anniversaries" icon={PartyPopper} tone="bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400" items={upcoming.anniversaries.map((a) => ({ key: a.employee.id, name: fullName(a.employee), photo: a.employee.photo, detail: `${fmtDate(a.date)} · ${a.years} years`, tag: `in ${a.inDays}d`, to: `/employees/${a.employee.id}` }))} empty="No anniversaries in the next 30 days" />
            <MomentList title="Interviews" icon={Video} tone="bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-400" items={upcoming.interviews.map((c) => ({ key: c.id, name: c.name, detail: `${c.interview!.round} · ${c.interview!.time}`, tag: fmtDateShort(c.interview!.date), to: '/recruitment' }))} empty="No interviews scheduled" />
            <MomentList title="New joiners" icon={UserPlus} tone="bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400" items={upcoming.joiners.map((j) => ({ key: j.id, name: j.name, detail: `${j.designation} · ${j.department}`, tag: j.joiningDate === today ? 'Today' : `in ${diffDays(today, j.joiningDate)}d`, to: '/onboarding' }))} empty="No upcoming joiners" />
          </div>
        </Card>

        <SectionCard title="Pending HR tasks" subtitle="Actions that need a people team decision" bodyClassName="p-3" action={<Badge tone="amber">{pendingTasks.reduce((a, t) => a + t.count, 0)} open</Badge>}>
          <div className="space-y-1">
            {pendingTasks.map((task) => (
              <button key={task.label} onClick={() => navigate(task.to)} className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${task.tone === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : task.tone === 'violet' ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' : task.tone === 'blue' ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' : task.tone === 'green' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : task.tone === 'orange' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                  <Clock className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">{task.label}</span>
                <span className={task.count > 0 ? 'rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/[0.07] dark:text-slate-300' : 'text-[10px] font-semibold text-emerald-500'}>{task.count > 0 ? task.count : '0'}</span>
                <ArrowUpRight className="h-3 w-3 text-slate-300 transition group-hover:text-brand-500" />
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/[0.05]">
            <div>
              <h3 className="text-[15px] font-semibold">Recent activity</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Actions across the HR workspace</p>
            </div>
            <Badge tone="slate">{db.activities.length} events</Badge>
          </div>
          <div className="p-5">
            <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-white/10">
              {db.activities.slice(0, 6).map((act) => {
                const iconMap = {
                  employee: Users, leave: CalendarDays, contract: FileSignature, payment: Wallet,
                  recruitment: BriefcaseBusiness, onboarding: UserPlus, request: ClipboardList,
                  performance: TrendingUp, offboarding: UserCheck, attendance: Clock,
                }
                const Icon = iconMap[act.type] || Sparkles
                const colors: Record<string, string> = {
                  employee: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
                  leave: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
                  contract: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
                  payment: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
                  recruitment: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
                  onboarding: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
                  request: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
                  performance: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
                  offboarding: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
                  attendance: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
                }
                return (
                  <div key={act.id} className="relative flex gap-3.5">
                    <span className={`relative z-10 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-ink-900 ${colors[act.type]}`}><Icon className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0 flex-1 pb-0.5">
                      <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{act.title}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-slate-500 dark:text-slate-400">{act.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-slate-400">{relativeTime(act.date)}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{act.actor}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-violet-700 p-5 text-white">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-teal-400/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-100"><Sparkles className="h-3.5 w-3.5" /> People pulse</div>
              <p className="mt-3 font-display text-[17px] font-semibold leading-snug">Attendance is healthy. Focus on leave and payroll approvals today.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <p className="tabular text-xl font-bold">{Math.round((present / Math.max(activeEmployees.length, 1)) * 100)}%</p>
                  <p className="text-[10px] text-brand-100">attendance rate</p>
                </div>
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <p className="tabular text-xl font-bold">{db.reviews.filter((r) => r.status === 'Completed').length}/{db.reviews.length}</p>
                  <p className="text-[10px] text-brand-100">reviews completed</p>
                </div>
              </div>
              <button onClick={() => navigate('/reports')} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/15 py-2 text-xs font-semibold backdrop-blur transition hover:bg-white/25">Open analytics <ArrowUpRight className="h-3.5 w-3.5" /></button>
            </div>
          </Card>

          <SectionCard title="Quick actions" bodyClassName="p-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Add employee', icon: UserPlus, to: '/employees?new=1' },
                { label: 'Review leave', icon: CalendarDays, to: '/leave' },
                { label: 'Record payment', icon: Wallet, to: '/payments?new=1' },
                { label: 'Post a job', icon: BriefcaseBusiness, to: '/recruitment?new=1' },
                { label: 'Run payroll', icon: Banknote, to: '/payroll' },
                { label: 'Reports', icon: TrendingUp, to: '/reports' },
              ].map((a) => (
                <button key={a.label} onClick={() => navigate(a.to)} className="flex flex-col items-start gap-2 rounded-xl border border-slate-100 p-3 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm dark:border-white/[0.06] dark:hover:border-brand-500/30">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><a.icon className="h-3.5 w-3.5" /></span>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{a.label}</span>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function MomentList({ title, icon: Icon, tone, items, empty }: { title: string; icon: React.ComponentType<{ className?: string }>; tone: string; items: { key: string; name: string; photo?: string; detail: string; tag: string; to: string }[]; empty: string }) {
  const navigate = useNavigate()
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${tone}`}><Icon className="h-3.5 w-3.5" /></span>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{title}</p>
        <span className="ml-auto text-[10px] text-slate-400">{items.length} upcoming</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-white/10">{empty}</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <button key={item.key} onClick={() => navigate(item.to)} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
              {item.photo ? <Avatar name={item.name} src={item.photo} size="sm" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">{item.name.split(' ').map((n) => n[0]).join('')}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">{item.name}</span>
                <span className="block truncate text-[10.5px] text-slate-400">{item.detail}</span>
              </span>
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">{item.tag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
