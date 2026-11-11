import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight, BarChart3, BriefcaseBusiness, Building2, CalendarCheck, CalendarDays, Download,
  FileBarChart, FileSignature, FileText, Gauge, Printer, Target, TrendingDown, TrendingUp,
  UserCheck, UserMinus, Users, Wallet,
} from 'lucide-react'
import { useStore } from '../store'
import {
  addDays, downloadCSV, fmtDate, fmtMoney, monthLabel, sum, todayISO,
} from '../lib/utils'
import { AreaTrend, BarDistribution, Donut, Funnel, Legend, LineTrend } from '../components/charts'
import {
  Badge, Button, Card, PageHeader, ProgressBar, SectionCard, Select, StatCard, StatusBadge,
} from '../components/ui'

const RANGES = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All demo data' },
]

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default function Reports() {
  const { db, toast } = useStore()
  const [range, setRange] = useState('90')
  const [tab, setTab] = useState<'workforce' | 'finance' | 'talent'>('workforce')

  const empMap = useMemo(() => new Map(db.employees.map((e) => [e.id, e])), [db.employees])
  const activeEmployees = db.employees.filter((e) => e.status !== 'Terminated')
  const startDate = range === 'all' ? '1900-01-01' : addDays(todayISO(), -Number(range))
  const rangeAttendance = db.attendance.filter((a) => a.date >= startDate)
  const rangeLeaves = db.leaves.filter((l) => l.from >= startDate)
  const latestPeriod = useMemo(() => Array.from(new Set(db.payroll.map((p) => p.period))).sort().reverse()[0], [db.payroll])
  const periodPayroll = db.payroll.filter((p) => p.period === latestPeriod)

  const attendanceRate = rangeAttendance.length
    ? Math.round((rangeAttendance.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length / rangeAttendance.length) * 100)
    : 0

  const netPay = (p: (typeof db.payroll)[number]) => p.basic + p.allowances + p.overtime - p.deductions - p.leaveDeduction - p.tax
  const monthlyPayroll = sum(periodPayroll.map(netPay))
  const completedExits = db.offboarding.filter((o) => o.status === 'Completed').length
  const attrition = activeEmployees.length ? Math.round((completedExits / (activeEmployees.length + completedExits)) * 1000) / 10 : 0
  const openRoles = db.jobs.filter((j) => j.status === 'Open').reduce((acc, j) => acc + j.openings, 0)
  const hires = db.candidates.filter((c) => c.stage === 'Hired').length
  const pipeline = db.candidates.filter((c) => !['Rejected', 'Hired'].includes(c.stage)).length
  const pendingLeave = db.leaves.filter((l) => l.status === 'Pending').length
  const pendingPayments = db.payments.filter((p) => p.approvalStatus === 'Pending').length

  const headcountTrend = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const count = db.employees.filter((e) => new Date(e.joiningDate + 'T12:00:00') <= end && e.status !== 'Terminated').length
      return { label: d.toLocaleDateString('en-US', { month: 'short' }), headcount: count, hires: db.employees.filter((e) => e.joiningDate.slice(0, 7) === monthKey(d)).length }
    })
    return months
  }, [db.employees])

  const attendanceTrend = useMemo(() => {
    const days = Math.min(range === 'all' ? 30 : Number(range), 30)
    const list: { label: string; attendance: number; late: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(todayISO(), -i)
      const records = db.attendance.filter((a) => a.date === date)
      if (!records.length) continue
      const present = records.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length
      list.push({ label: fmtDate(date, { day: '2-digit', month: 'short' }), attendance: Math.round((present / records.length) * 100), late: records.filter((a) => a.status === 'Late').length })
    }
    return list
  }, [db.attendance, range])

  const deptReport = useMemo(() => db.settings.departments.map((d) => {
    const emps = activeEmployees.filter((e) => e.department === d.name)
    const ids = new Set(emps.map((e) => e.id))
    const payroll = sum(periodPayroll.filter((p) => ids.has(p.employeeId)).map(netPay))
    const att = db.attendance.filter((a) => ids.has(a.employeeId) && a.date >= startDate)
    const attRate = att.length ? Math.round((att.filter((a) => ['Present', 'Late', 'Remote', 'Half Day'].includes(a.status)).length / att.length) * 100) : 0
    const jobs = db.jobs.filter((j) => j.department === d.name && j.status === 'Open').reduce((a, j) => a + j.openings, 0)
    return { ...d, headcount: emps.length, payroll, attendance: attRate, openRoles: jobs }
  }).filter((d) => d.headcount > 0 || d.payroll > 0).sort((a, b) => b.headcount - a.headcount), [activeEmployees, periodPayroll, db.attendance, db.jobs, startDate])

  const payrollByDept = deptReport.filter((d) => d.payroll > 0).map((d) => ({ name: d.name, value: Math.round(d.payroll / 1000) })).sort((a, b) => b.value - a.value).slice(0, 8)

  const leaveByType = useMemo(() => {
    const map = new Map<string, number>()
    rangeLeaves.forEach((l) => map.set(l.leaveType, (map.get(l.leaveType) || 0) + l.days))
    return [...map.entries()].map(([name, value], i) => ({ name, value, color: ['#6366f1', '#ec4899', '#f59e0b', '#14b8a6', '#8b5cf6', '#0ea5e9'][i % 6] })).sort((a, b) => b.value - a.value)
  }, [rangeLeaves])

  const leaveStatus = useMemo(() => {
    const statuses = ['Approved', 'Pending', 'Rejected', 'Cancelled'] as const
    const colors = ['#22c55e', '#f59e0b', '#ef4444', '#94a3b8']
    return statuses.map((s, i) => ({ name: s, value: db.leaves.filter((l) => l.status === s).length, color: colors[i] })).filter((s) => s.value > 0)
  }, [db.leaves])

  const funnel = useMemo(() => {
    const stages = [
      { name: 'Applied', value: db.candidates.filter((c) => ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'].includes(c.stage)).length, color: '#6366f1' },
      { name: 'Screening', value: db.candidates.filter((c) => ['Screening', 'Interview', 'Offer', 'Hired'].includes(c.stage)).length, color: '#0ea5e9' },
      { name: 'Interview', value: db.candidates.filter((c) => ['Interview', 'Offer', 'Hired'].includes(c.stage)).length, color: '#8b5cf6' },
      { name: 'Offer', value: db.candidates.filter((c) => ['Offer', 'Hired'].includes(c.stage)).length, color: '#f59e0b' },
      { name: 'Hired', value: db.candidates.filter((c) => c.stage === 'Hired').length, color: '#22c55e' },
    ]
    return stages
  }, [db.candidates])

  const contractMix = useMemo(() => {
    const statuses = ['Active', 'Expiring Soon', 'Pending Signature', 'Pending Review', 'Expired', 'Terminated', 'Renewed', 'Draft']
    const colors: Record<string, string> = { Active: '#22c55e', 'Expiring Soon': '#f59e0b', 'Pending Signature': '#8b5cf6', 'Pending Review': '#6366f1', Expired: '#ef4444', Terminated: '#64748b', Renewed: '#14b8a6', Draft: '#94a3b8' }
    return statuses.map((s) => ({ name: s, value: db.contracts.filter((c) => c.status === s).length, color: colors[s] })).filter((s) => s.value > 0)
  }, [db.contracts])

  const download = (name: string, rows: (string | number)[][], count: number) => {
    downloadCSV(name, rows)
    toast('Report exported', 'success', `${count} rows written to ${name}.`)
  }

  const reportCards = [
    { name: 'Headcount report', description: 'Employees by department, status and employment type', icon: Users, tone: 'text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400', run: () => download('titan-hr-headcount-report.csv', [['Employee ID', 'Name', 'Department', 'Designation', 'Type', 'Status', 'Joining date', 'Location'], ...db.employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`, e.department, e.designation, e.employmentType, e.status, e.joiningDate, e.location])], db.employees.length) },
    { name: 'Attendance register', description: 'Daily attendance with hours, source and corrections', icon: CalendarCheck, tone: 'text-teal-600 bg-teal-50 dark:bg-teal-500/10 dark:text-teal-400', run: () => download('titan-hr-attendance-register.csv', [['Date', 'Employee ID', 'Employee', 'Status', 'Check in', 'Check out', 'Hours', 'Source'], ...rangeAttendance.map((a) => { const e = empMap.get(a.employeeId); return [a.date, a.employeeId, e ? `${e.firstName} ${e.lastName}` : '', a.status, a.checkIn || '', a.checkOut || '', a.hours, a.source] })], rangeAttendance.length) },
    { name: 'Payroll summary', description: 'Latest cycle gross, deductions and net pay', icon: Wallet, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400', run: () => download('titan-hr-payroll-summary.csv', [['Period', 'Employee ID', 'Employee', 'Basic', 'Allowances', 'Overtime', 'Deductions', 'Tax', 'Net pay', 'Status'], ...periodPayroll.map((p) => { const e = empMap.get(p.employeeId); return [monthLabel(p.period), p.employeeId, e ? `${e.firstName} ${e.lastName}` : '', p.basic, p.allowances, p.overtime, p.deductions + p.leaveDeduction, p.tax, netPay(p), p.status] })], periodPayroll.length) },
    { name: 'Leave utilisation', description: 'Requests, days taken and approval status', icon: CalendarDays, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', run: () => download('titan-hr-leave-utilisation.csv', [['Request ID', 'Employee', 'Leave type', 'From', 'To', 'Days', 'Status', 'Priority'], ...db.leaves.map((l) => { const e = empMap.get(l.employeeId); return [l.id, e ? `${e.firstName} ${e.lastName}` : l.employeeId, l.leaveType, l.from, l.to, l.days, l.status, l.priority] })], db.leaves.length) },
    { name: 'Recruitment pipeline', description: 'Candidates, stages, ratings and salary expectations', icon: BriefcaseBusiness, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400', run: () => download('titan-hr-recruitment-pipeline.csv', [['Candidate ID', 'Name', 'Role', 'Stage', 'Source', 'Rating', 'Experience', 'Expected salary'], ...db.candidates.map((c) => [c.id, c.name, db.jobs.find((j) => j.id === c.jobId)?.title || '', c.stage, c.source, c.rating, c.experience, c.expectedSalary])], db.candidates.length) },
    { name: 'Contract register', description: 'Every agreement, expiry and signature status', icon: FileSignature, tone: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400', run: () => download('titan-hr-contract-register.csv', [['Contract ID', 'Title', 'Party', 'Type', 'Value', 'Start', 'End', 'Status', 'Signatures pending'], ...db.contracts.map((c) => [c.id, c.title, c.partyName, c.contractType, c.value, c.startDate, c.endDate, c.status, c.signatures.filter((s) => s.status === 'Pending').length])], db.contracts.length) },
    { name: 'Payment ledger', description: 'Daily payments, approvals and settlement states', icon: FileBarChart, tone: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400', run: () => download('titan-hr-payment-ledger.csv', [['Payment ID', 'Date', 'Payee', 'Category', 'Amount', 'Method', 'Approval', 'Payment'], ...db.payments.map((p) => [p.id, p.date, p.payee, p.category, p.amount, p.method, p.approvalStatus, p.paymentStatus])], db.payments.length) },
    { name: 'Performance reviews', description: 'Cycle status, ratings and goal progress', icon: Target, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400', run: () => download('titan-hr-performance-reviews.csv', [['Review ID', 'Employee ID', 'Employee', 'Cycle', 'Status', 'Self', 'Manager', 'HR', 'Goals'], ...db.reviews.map((r) => { const e = empMap.get(r.employeeId); return [r.id, r.employeeId, e ? `${e.firstName} ${e.lastName}` : '', r.cycle, r.status, r.selfRating, r.managerRating, r.hrRating, r.goals.length] })], db.reviews.length) },
  ]

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Turn the demo workspace into decisions — workforce health, cost, attendance and hiring performance in one view."
        crumbs={['Insights', 'Reports & Analytics']}
        actions={
          <>
            <Select value={range} onChange={(e) => setRange(e.target.value)} className="h-10 w-auto text-xs">{RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select>
            <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
            <Button onClick={() => download('titan-hr-executive-summary.csv', [['TITAN HR — EXECUTIVE SUMMARY'], ['Generated', todayISO()], ['Range', RANGES.find((r) => r.value === range)?.label || ''], [], ['Headcount', activeEmployees.length], ['Attendance rate', `${attendanceRate}%`], ['Monthly payroll', monthlyPayroll], ['Attrition', `${attrition}%`], ['Open roles', openRoles], ['Candidates in pipeline', pipeline], ['Pending leave approvals', pendingLeave], ['Pending payment approvals', pendingPayments]], 8)}><Download className="h-4 w-4" /> Executive summary</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <StatCard index={0} label="Headcount" value={activeEmployees.length} icon={Users} tone="brand" hint={`${db.employees.length} total records`} />
        <StatCard index={1} label="Attendance" value={`${attendanceRate}%`} icon={CalendarCheck} tone="teal" hint={range === 'all' ? 'All records' : `Last ${range} days`} />
        <StatCard index={2} label="Monthly payroll" value={fmtMoney(monthlyPayroll, true)} icon={Wallet} tone="green" hint={latestPeriod ? monthLabel(latestPeriod) : 'No cycle'} />
        <StatCard index={3} label="Attrition" value={`${attrition}%`} icon={UserMinus} tone="red" hint={`${completedExits} completed exits`} />
        <StatCard index={4} label="Open roles" value={openRoles} icon={BriefcaseBusiness} tone="violet" hint={`${db.jobs.filter((j) => j.status === 'Open').length} open job posts`} />
        <StatCard index={5} label="Pipeline" value={pipeline} icon={UserCheck} tone="amber" hint={`${hires} hires this demo`} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {[
          { id: 'workforce', label: 'Workforce', icon: Users },
          { id: 'finance', label: 'Finance', icon: Wallet },
          { id: 'talent', label: 'Talent', icon: Target },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} className={`focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${tab === t.id ? 'bg-ink-950 text-white shadow-md dark:bg-white dark:text-ink-950' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
        <Badge tone="slate" className="ml-auto">Live demo data · {fmtDate(todayISO())}</Badge>
      </div>

      {tab === 'workforce' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Headcount growth" subtitle="Cumulative headcount and new hires over the last six months">
              <AreaTrend data={headcountTrend} series={[{ key: 'headcount', name: 'Headcount', color: '#6366f1' }, { key: 'hires', name: 'New hires', color: '#14b8a6' }]} height={240} />
            </SectionCard>
            <SectionCard title="Attendance rate" subtitle={`Daily attendance percentage · ${range === 'all' ? 'last 30 days' : `last ${range} days`}`} action={<Badge tone={attendanceRate >= 92 ? 'green' : 'amber'}>{attendanceRate}% average</Badge>}>
              <LineTrend data={attendanceTrend} series={[{ key: 'attendance', name: 'Attendance %', color: '#14b8a6' }]} height={240} />
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Headcount by department" subtitle="Active employees" className="lg:col-span-2">
              <BarDistribution data={deptReport.map((d) => ({ name: d.name, value: d.headcount }))} layout="vertical" height={280} color="#6366f1" />
            </SectionCard>
            <SectionCard title="Leave composition" subtitle="Approved and pending days by type">
              {leaveByType.length ? <><Donut data={leaveByType} height={190} centerLabel="Days" centerValue={sum(leaveByType.map((l) => l.value))} /><Legend items={leaveByType.map((l) => ({ name: l.name, value: `${l.value}d`, color: l.color }))} className="mt-3" /></> : <p className="py-10 text-center text-xs text-slate-400">No leave data in this range.</p>}
            </SectionCard>
          </div>

          <SectionCard title="Department scorecard" subtitle="Headcount, payroll and attendance by team" action={<Button size="sm" variant="secondary" onClick={() => download('titan-hr-department-scorecard.csv', [['Department', 'Head', 'Headcount', 'Monthly payroll', 'Attendance %', 'Open roles'], ...deptReport.map((d) => [d.name, d.head, d.headcount, d.payroll, d.attendance, d.openRoles])], deptReport.length)}><Download className="h-3.5 w-3.5" /> Export</Button>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead><tr className="border-b border-slate-100 dark:border-white/[0.06]"><th className="table-head pl-0">Department</th><th className="table-head">Head</th><th className="table-head text-right">Headcount</th><th className="table-head text-right">Monthly payroll</th><th className="table-head">Attendance</th><th className="table-head text-right">Open roles</th></tr></thead>
                <tbody>
                  {deptReport.map((d) => (
                    <tr key={d.id} className="table-row">
                      <td className="table-cell pl-0"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Building2 className="h-3.5 w-3.5" /></span><span className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</span></div></td>
                      <td className="table-cell text-[12px]">{d.head}</td>
                      <td className="table-cell text-right tabular font-semibold">{d.headcount}</td>
                      <td className="table-cell text-right tabular">{fmtMoney(d.payroll)}</td>
                      <td className="table-cell"><div className="flex items-center gap-2"><ProgressBar value={d.attendance} tone={d.attendance >= 92 ? 'green' : d.attendance >= 85 ? 'amber' : 'red'} className="w-24" /><span className="tabular text-[11px] font-semibold">{d.attendance}%</span></div></td>
                      <td className="table-cell text-right">{d.openRoles ? <Badge tone="violet">{d.openRoles}</Badge> : <span className="text-slate-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </motion.div>
      )}

      {tab === 'finance' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Payroll by department" subtitle={`Net pay · ${latestPeriod ? monthLabel(latestPeriod) : 'latest cycle'} · $k`} className="lg:col-span-2">
              <BarDistribution data={payrollByDept} layout="vertical" height={280} color="#22c55e" prefix="$" />
            </SectionCard>
            <div className="space-y-3">
              <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cost per employee</p><p className="tabular mt-1 text-2xl font-bold">{fmtMoney(activeEmployees.length ? monthlyPayroll / activeEmployees.length : 0)}</p><p className="mt-1 text-[11px] text-slate-400">Average net monthly cost</p></Card>
              <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payroll entries</p><p className="tabular mt-1 text-2xl font-bold">{periodPayroll.length}</p><p className="mt-1 text-[11px] text-slate-400">{periodPayroll.filter((p) => p.status === 'Paid').length} marked paid · {periodPayroll.filter((p) => p.status !== 'Paid').length} in progress</p></Card>
              <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily payment exposure</p><p className="tabular mt-1 text-2xl font-bold">{fmtMoney(sum(db.payments.filter((p) => p.paymentStatus !== 'Paid' && p.paymentStatus !== 'Failed').map((p) => p.amount)), true)}</p><p className="mt-1 text-[11px] text-slate-400">{db.payments.filter((p) => p.approvalStatus === 'Pending').length} awaiting approval</p></Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Payment settlement" subtitle="Daily payments by state">
              <Donut data={(['Paid', 'Processing', 'Pending', 'Overdue', 'Failed'] as const).map((s) => ({ name: s, value: db.payments.filter((p) => p.paymentStatus === s).length, color: s === 'Paid' ? '#22c55e' : s === 'Processing' ? '#6366f1' : s === 'Pending' ? '#f59e0b' : s === 'Overdue' ? '#ef4444' : '#94a3b8' })).filter((s) => s.value > 0)} height={200} centerLabel="Payments" centerValue={db.payments.length} />
              <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] dark:bg-amber-500/[0.07]"><span className="flex items-center gap-2 text-amber-700 dark:text-amber-300"><Gauge className="h-3.5 w-3.5" /> Overdue exposure</span><span className="tabular font-bold text-amber-700 dark:text-amber-300">{fmtMoney(sum(db.payments.filter((p) => p.paymentStatus === 'Overdue').map((p) => p.amount)))}</span></div>
            </SectionCard>
            <SectionCard title="Contract value portfolio" subtitle="Agreements by status">
              {contractMix.length ? <><Donut data={contractMix} height={200} centerLabel="Contracts" centerValue={db.contracts.length} /><Legend items={contractMix.map((c) => ({ name: c.name, value: c.value, color: c.color }))} className="mt-3" /></> : <p className="py-10 text-center text-xs text-slate-400">No contracts yet.</p>}
            </SectionCard>
          </div>

          <SectionCard title="Finance watchlist" subtitle="What needs a decision this week">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Pending payment approvals', value: pendingPayments, detail: 'Daily payments waiting for Finance', tone: 'amber', icon: Wallet },
                { label: 'Payroll entries unapproved', value: periodPayroll.filter((p) => !['Approved', 'Paid'].includes(p.status)).length, detail: latestPeriod ? monthLabel(latestPeriod) : 'Current cycle', tone: 'brand', icon: FileText },
                { label: 'Expiring contracts', value: db.contracts.filter((c) => c.status === 'Expiring Soon').length, detail: 'Renewals due in 30 days', tone: 'red', icon: FileSignature },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 dark:border-white/[0.06]">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.tone === 'red' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : item.tone === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'}`}><item.icon className="h-4 w-4" /></span>
                  <div><p className="text-lg font-bold leading-none">{item.value}</p><p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">{item.label}</p><p className="text-[10px] text-slate-400">{item.detail}</p></div>
                </div>
              ))}
            </div>
          </SectionCard>
        </motion.div>
      )}

      {tab === 'talent' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Recruitment funnel" subtitle="Candidate progression across all open roles" action={<Badge tone="brand">{db.candidates.length} candidates</Badge>}>
              <Funnel stages={funnel} />
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Offer rate</p><p className="mt-1 text-lg font-bold">{funnel[0].value ? Math.round((funnel[3].value / funnel[0].value) * 100) : 0}%</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Hires</p><p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{hires}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">In pipeline</p><p className="mt-1 text-lg font-bold">{pipeline}</p></div>
              </div>
            </SectionCard>
            <SectionCard title="Leave decisions" subtitle="Approval status across all requests">
              {leaveStatus.length ? <><Donut data={leaveStatus} height={200} centerLabel="Requests" centerValue={db.leaves.length} /><Legend items={leaveStatus.map((l) => ({ name: l.name, value: l.value, color: l.color }))} className="mt-3" /></> : <p className="py-10 text-center text-xs text-slate-400">No leave requests.</p>}
              {pendingLeave > 0 && <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] dark:bg-amber-500/[0.07]"><span className="text-amber-700 dark:text-amber-300">{pendingLeave} requests waiting on a decision</span><Badge tone="amber">Action needed</Badge></div>}
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Performance cycle" subtitle="Review status distribution" className="lg:col-span-2">
              <div className="space-y-3">
                {['Not Started', 'Self Assessment', 'Manager Review', 'HR Review', 'Completed'].map((s) => {
                  const count = db.reviews.filter((r) => r.status === s).length
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">{s}</span>
                      <ProgressBar value={db.reviews.length ? (count / db.reviews.length) * 100 : 0} tone={s === 'Completed' ? 'green' : s === 'HR Review' ? 'violet' : s === 'Manager Review' ? 'brand' : 'amber'} className="flex-1" />
                      <span className="tabular w-8 text-right text-[11px] font-semibold">{count}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] dark:bg-white/[0.03]"><span className="text-slate-500 dark:text-slate-400">Overall completion</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{db.reviews.length ? Math.round((db.reviews.filter((r) => r.status === 'Completed').length / db.reviews.length) * 100) : 0}%</span></div>
            </SectionCard>
            <SectionCard title="Open roles" subtitle="Live hiring demand">
              <div className="space-y-2.5">
                {db.jobs.filter((j) => j.status === 'Open').slice(0, 5).map((j) => (
                  <div key={j.id} className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                    <div className="flex items-start justify-between gap-2"><p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{j.title}</p><Badge tone="green">{j.openings} open</Badge></div>
                    <p className="mt-0.5 text-[10px] text-slate-400">{j.department} · {j.location} · closes {fmtDate(j.deadline)}</p>
                  </div>
                ))}
                {!db.jobs.some((j) => j.status === 'Open') && <p className="py-8 text-center text-xs text-slate-400">No open roles.</p>}
              </div>
            </SectionCard>
          </div>
        </motion.div>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <div><h2 className="text-lg font-bold">Report library</h2><p className="text-xs text-slate-400">Download ready-to-share CSV extracts from every module</p></div>
          <Badge tone="slate">{reportCards.length} reports</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {reportCards.map((r, i) => (
            <motion.button key={r.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035 }} onClick={r.run} className="card group p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift dark:hover:border-brand-500/30">
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${r.tone}`}><r.icon className="h-4 w-4" /></span>
                <Download className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
              </div>
              <p className="mt-3 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{r.name}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{r.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <Card className="mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white"><TrendingUp className="h-5 w-5" /></div>
        <div className="flex-1"><h3 className="text-sm font-semibold">Demo analytics note</h3><p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Every number on this page is derived from local demo data — seeded employees, attendance, payroll, contracts and candidate records. Date-sensitive values refresh relative to today. No analytics service or backend is connected.</p></div>
        <Badge tone="brand" dot>Frontend only</Badge>
      </Card>
    </div>
  )
}
