import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileCheck2,
  LockKeyhole,
  Send,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ChartCard, ChartTooltip, axisProps, gridProps, useChartAnimation } from '../../components/charts/ChartKit'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { useHRData } from '../../context/HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { hrPermissionSummary } from '../../config/hrNavigation'
import { FilterTabs, useCsvExport } from '../workspace/workspaceShared'
import { HR_CURRENT_MONTH_KEY } from '../../data/hr'
import { formatINR, formatNumber } from '../../utils/format'
import { formatDateLong, formatDateTime, maskMoney, payrollVerification, relativeTime } from '../../utils/hr'
import type { HRPayroll, HRPayrollLine } from '../../types/hr'
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

type TabId = 'overview' | 'register' | 'history'

export function HRPayroll() {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const exportCsv = useCsvExport()
  const animate = useChartAnimation()
  const loading = useInitialLoading()
  const masked = !permissions.canViewPayrollAmounts

  const sortedPayrolls = useMemo(
    () => [...hr.payrolls].sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
    [hr.payrolls],
  )
  const [monthKey, setMonthKey] = useState(HR_CURRENT_MONTH_KEY)
  const [tab, setTab] = useState<TabId>('overview')
  const [department, setDepartment] = useState('All departments')

  const payroll = hr.payrolls.find((item) => item.monthKey === monthKey) ?? sortedPayrolls[0]
  const verification = useMemo(() => payrollVerification(hr, payroll?.monthKey ?? HR_CURRENT_MONTH_KEY), [hr, payroll?.monthKey])
  const lines = useMemo(
    () =>
      hr.payrollLines
        .filter((line) => line.payrollId === payroll?.id)
        .filter((line) => department === 'All departments' || line.department === department)
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
    [hr.payrollLines, payroll?.id, department],
  )

  const departments = useMemo(
    () => ['All departments', ...Array.from(new Set(hr.payrollLines.map((line) => line.department))).sort()],
    [hr.payrollLines],
  )

  const departmentChart = useMemo(() => {
    const map = new Map<string, number>()
    hr.payrollLines
      .filter((line) => line.payrollId === payroll?.id)
      .forEach((line) => map.set(line.department, (map.get(line.department) ?? 0) + line.net))
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [hr.payrollLines, payroll?.id])

  const canPrepare = permissions.canPreparePayroll && payroll?.status === 'Pending'
  const canSend = permissions.canPreparePayroll && payroll?.status === 'Prepared'

  const exportRegister = () => {
    exportCsv(
      `hr-payroll-register-${payroll?.monthKey ?? 'current'}.csv`,
      [
        { header: 'Employee', value: (row: HRPayrollLine) => row.employeeName },
        { header: 'Employee ID', value: (row: HRPayrollLine) => row.employeeId },
        { header: 'Department', value: (row: HRPayrollLine) => row.department },
        { header: 'Base', value: (row: HRPayrollLine) => String(row.base) },
        { header: 'Allowances', value: (row: HRPayrollLine) => String(row.allowances) },
        { header: 'Deductions', value: (row: HRPayrollLine) => String(row.deductions) },
        { header: 'Loss of pay', value: (row: HRPayrollLine) => String(row.lossOfPay) },
        { header: 'Net pay', value: (row: HRPayrollLine) => String(row.net) },
        { header: 'Attendance days', value: (row: HRPayrollLine) => String(row.attendanceDays) },
        { header: 'Paid leave days', value: (row: HRPayrollLine) => String(row.paidLeaveDays) },
        { header: 'Unpaid leave days', value: (row: HRPayrollLine) => String(row.unpaidLeaveDays) },
      ],
      lines,
    )
  }

  const statusStep = (() => {
    if (!payroll) return 0
    if (payroll.status === 'Pending') return 0
    if (payroll.status === 'Prepared') return 1
    if (payroll.status === 'Sent to Finance') return 2
    if (payroll.status === 'Finance Approved') return 3
    return 4
  })()

  return (
    <HRPageShell
      section="payroll"
      title="Payroll preparation"
      subtitle="Verify attendance and approved leave once, prepare the payroll run, then hand it to Finance for payment processing and financial approval."
      eyebrow="Payroll & compensation"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportRegister}>
            Export register
          </Button>
          {canPrepare ? (
            <Button variant="primary" icon={<FileCheck2 size={14} />} onClick={() => payroll && hr.preparePayroll(payroll.monthKey)}>
              Verify & prepare
            </Button>
          ) : null}
          {canSend ? (
            <Button variant="primary" icon={<Send size={14} />} onClick={() => payroll && hr.sendPayrollToFinance(payroll.id)}>
              Send to Finance
            </Button>
          ) : null}
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>Period</small><strong>{payroll?.period ?? '—'}</strong></span>
          <span className="hr-inline-meta"><small>Employees</small><strong>{payroll?.employeeCount ?? 0}</strong></span>
          <span className="hr-inline-meta"><small>Status</small><strong>{payroll?.status ?? '—'}</strong></span>
        </>
      }
    >
      <div className="hr-day-toolbar">
        <HRFilterSelect
          label="Payroll period"
          value={payroll?.monthKey ?? ''}
          options={sortedPayrolls.map((item) => item.monthKey)}
          onChange={setMonthKey}
        />
        <div className="hr-payroll-period">
          <span className="hr-payroll-period__icon"><Wallet size={16} /></span>
          <span>
            <strong>{payroll?.period ?? 'No payroll run'}</strong>
            <small>{payroll?.status === 'Pending' ? 'Attendance and leave ready for verification' : payroll?.note}</small>
          </span>
          {payroll ? <HRStatusBadge status={payroll.status} /> : null}
        </div>
        {masked ? (
          <span className="hr-mask-note"><LockKeyhole size={13} /> Amounts masked for this preview role</span>
        ) : null}
      </div>

      <HRSummaryGrid>
        <HRSummaryTile label="Employees" value={formatNumber(payroll?.employeeCount ?? 0)} hint="Active payroll records" icon={<Users size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="Gross pay" value={maskMoney(payroll?.gross ?? 0, masked)} hint="Base plus allowances" icon={<CircleDollarSign size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="Deductions" value={maskMoney(payroll?.deductions ?? 0, masked)} hint="Statutory and loss of pay" icon={<Banknote size={16} />} tone="var(--chart-4)" />
        <HRSummaryTile label="Net payable" value={maskMoney(payroll?.net ?? 0, masked)} hint="Handed to Finance for payment" icon={<Wallet size={16} />} tone="var(--chart-2)" />
        <HRSummaryTile label="Verified days" value={formatNumber(verification.presentDays)} hint={`${verification.leaveDays} approved leave days`} icon={<CalendarCheck size={16} />} tone="var(--chart-6)" />
      </HRSummaryGrid>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="Payroll view"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'overview', label: 'Run overview' },
            { id: 'register', label: 'Employee register', count: lines.length },
            { id: 'history', label: 'Payroll history', count: hr.payrolls.length },
          ]}
        />
      </div>

      {tab === 'overview' ? (
        <>
          <SectionCard title="Payroll workflow" subtitle="HR prepares and verifies. Finance owns payment and financial approval.">
            <div className="hr-payroll-steps">
              {[
                { label: 'Attendance verified', detail: 'Recorded punches and corrections', icon: CalendarCheck },
                { label: 'Payroll prepared', detail: 'Leave and loss of pay applied once', icon: FileCheck2 },
                { label: 'Sent to Finance', detail: 'Payment processing begins', icon: Send },
                { label: 'Finance approval', detail: 'Financial sign-off recorded', icon: ShieldCheck },
                { label: 'Payment processed', detail: 'Salary credited by Finance', icon: BadgeCheck },
              ].map((step, index) => {
                const Icon = step.icon
                const state = index < statusStep ? 'is-done' : index === statusStep ? 'is-current' : ''
                return (
                  <div className={`hr-payroll-step ${state}`.trim()} key={step.label}>
                    <span className="hr-payroll-step__icon"><Icon size={15} /></span>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </div>
                )
              })}
            </div>
            <div className="hr-payroll-callout">
              <LockKeyhole size={15} />
              <span>
                <strong>Finance retains payment processing and financial approval.</strong> HR prepares and verifies the run,
                but never releases the payment in this demo.
              </span>
            </div>
          </SectionCard>

          <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
            <SectionCard title="Verification checklist" subtitle={`Attendance and leave for ${payroll?.period ?? 'the selected period'}`}>
              <div className="hr-verification-grid">
                <div className="hr-verification-tile">
                  <span><CalendarCheck size={15} /> Present days</span>
                  <strong>{verification.presentDays}</strong>
                  <small>Recorded ERP punches</small>
                </div>
                <div className="hr-verification-tile">
                  <span><CheckCircle2 size={15} /> Approved leave</span>
                  <strong>{verification.leaveDays}</strong>
                  <small>{verification.unpaidDays} unpaid day{verification.unpaidDays === 1 ? '' : 's'}</small>
                </div>
                <div className="hr-verification-tile">
                  <span><AlertTriangle size={15} /> Absent days</span>
                  <strong>{verification.absentDays}</strong>
                  <small>Excludes approved leave</small>
                </div>
                <div className="hr-verification-tile">
                  <span><FileCheck2 size={15} /> Corrections</span>
                  <strong>{verification.corrections}</strong>
                  <small>Approved and auditable</small>
                </div>
              </div>
              <HRInfoNote tone={verification.duplicateAdjustments ? 'warning' : 'info'}>
                {verification.duplicateAdjustments
                  ? 'A duplicate adjustment was detected. Review the attendance and leave records before sending to Finance.'
                  : 'Attendance and approved leave are counted once. There are no duplicate payroll adjustments in this run.'}
              </HRInfoNote>
              <div className="hr-verification-actions">
                {canPrepare ? (
                  <Button variant="primary" icon={<FileCheck2 size={14} />} onClick={() => payroll && hr.preparePayroll(payroll.monthKey)}>
                    Verify & prepare payroll
                  </Button>
                ) : null}
                {canSend ? (
                  <Button variant="primary" icon={<Send size={14} />} onClick={() => payroll && hr.sendPayrollToFinance(payroll.id)}>
                    Send prepared payroll to Finance
                  </Button>
                ) : null}
                {!canPrepare && !canSend ? (
                  <span className="faint">
                    {payroll?.status === 'Sent to Finance' || payroll?.status === 'Finance Approved' || payroll?.status === 'Processed'
                      ? 'This run is now with Finance for payment processing and financial approval.'
                      : 'Switch to the Marketing Manager preview role to prepare and send payroll.'}
                  </span>
                ) : null}
              </div>
            </SectionCard>

            <div className="hr-stack">
              <ChartCard title="Net pay by department" subtitle={masked ? 'Amounts masked for this preview role' : payroll?.period} height="sm">
                {masked ? (
                  <div className="hr-chart-mask">
                    <LockKeyhole size={22} />
                    <strong>Payroll amounts are masked</strong>
                    <span>Switch to the Marketing Manager preview role to review compensation.</span>
                  </div>
                ) : (
                  <BarChart data={departmentChart} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid {...gridProps} horizontal={false} />
                    <XAxis type="number" {...axisProps} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                    <YAxis type="category" dataKey="name" width={104} {...axisProps} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Net pay" fill="var(--chart-2)" radius={[0, 6, 6, 0]} isAnimationActive={animate} />
                  </BarChart>
                )}
              </ChartCard>

              <SectionCard title="Finance hand-off" subtitle="Ownership and audit">
                <div className="hr-simple-list">
                  <div className="hr-simple-row">
                    <span className="hr-simple-row__icon"><FileCheck2 size={14} /></span>
                    <span className="grow"><strong>Prepared by HR</strong><small>{payroll?.preparedBy ? `${payroll.preparedBy} · ${formatDateTime(payroll.preparedAt)}` : 'Not prepared yet'}</small></span>
                  </div>
                  <div className="hr-simple-row">
                    <span className="hr-simple-row__icon"><ShieldCheck size={14} /></span>
                    <span className="grow"><strong>Finance approval</strong><small>{payroll?.financeApprovedBy ? `${payroll.financeApprovedBy} · ${formatDateTime(payroll.financeApprovedAt)}` : 'Awaiting Finance'}</small></span>
                  </div>
                  <div className="hr-simple-row">
                    <span className="hr-simple-row__icon"><ArrowRight size={14} /></span>
                    <span className="grow"><strong>Payment processing</strong><small>Finance owns disbursement and the final financial record</small></span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          <SectionCard title="Recent payroll activity" subtitle="The audit trail for this workspace">
            <ol className="hr-timeline">
              {hr.activity.filter((entry) => entry.module === 'payroll').slice(0, 5).map((entry) => (
                <li key={entry.id} className={`hr-timeline__item hr-timeline__item--${entry.tone}`}>
                  <span className="hr-timeline__marker" aria-hidden="true" />
                  <div>
                    <p className="hr-timeline__action">{entry.action}</p>
                    <p className="hr-timeline__detail">{entry.detail}</p>
                    <p className="hr-timeline__meta">{entry.actor} · {relativeTime(entry.at)}</p>
                  </div>
                </li>
              ))}
              {!hr.activity.some((entry) => entry.module === 'payroll') ? (
                <p className="empty-inline">No payroll activity has been recorded yet.</p>
              ) : null}
            </ol>
          </SectionCard>
        </>
      ) : null}

      {tab === 'register' ? (
        <>
          <DataTable
            data={lines}
            loading={loading}
            rowKey={(row) => row.id}
            searchable={(row) => `${row.employeeName} ${row.employeeId} ${row.department}`}
            searchPlaceholder="Search employee, ID or department…"
            filters={<HRFilterSelect label="Department" value={department} options={departments} onChange={setDepartment} />}
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
              { id: 'base', header: 'Base', align: 'right', sortValue: (row) => row.base, render: (row) => <span className="hr-money">{maskMoney(row.base, masked)}</span> },
              { id: 'allowances', header: 'Allowances', align: 'right', sortValue: (row) => row.allowances, render: (row) => <span className="hr-money">{maskMoney(row.allowances, masked)}</span> },
              { id: 'deductions', header: 'Deductions', align: 'right', sortValue: (row) => row.deductions, render: (row) => <span className="hr-money">{maskMoney(row.deductions, masked)}</span> },
              {
                id: 'attendance',
                header: 'Attendance',
                align: 'right',
                mobileLabel: 'Attendance',
                render: (row) => (
                  <span className="hr-table-text">
                    {row.attendanceDays}d present
                    <small className="hr-table-subtext">{row.paidLeaveDays}d paid · {row.unpaidLeaveDays}d unpaid</small>
                  </span>
                ),
              },
              { id: 'lop', header: 'Loss of pay', align: 'right', sortValue: (row) => row.lossOfPay, render: (row) => <span className="hr-money">{maskMoney(row.lossOfPay, masked)}</span> },
              { id: 'net', header: 'Net pay', align: 'right', sortValue: (row) => row.net, render: (row) => <strong className="hr-money hr-money--strong">{maskMoney(row.net, masked)}</strong> },
            ]}
            emptyTitle="No payroll lines for this period"
            emptyDescription="Prepare this payroll run to calculate employee lines from attendance and approved leave."
            footerNote={
              <span>
                Net pay = base + allowances − deductions − loss of pay. Attendance and leave adjustments are applied once.
                {masked ? ' Amounts are masked for this preview role.' : ''}
              </span>
            }
          />
          {masked ? (
            <HRInfoNote tone="warning">
              Salary, bank details and payroll amounts are visible to HR administrators only. Switch to the Marketing Manager
              preview role to exercise full payroll verification.
            </HRInfoNote>
          ) : (
            <HRInfoNote>
              Payroll is prepared by HR from verified attendance and approved leave. Finance retains payment processing and
              financial approval.
            </HRInfoNote>
          )}
        </>
      ) : null}

      {tab === 'history' ? (
        <DataTable
          data={sortedPayrolls}
          rowKey={(row) => row.id}
          searchable={(row) => `${row.period} ${row.status} ${row.monthKey}`}
          searchPlaceholder="Search period or status…"
          onRowClick={(row) => { setMonthKey(row.monthKey); setTab('overview') }}
          columns={[
            {
              id: 'period',
              header: 'Payroll run',
              sortValue: (row) => row.monthKey,
              render: (row) => (
                <span className="hr-table-text">
                  <strong>{row.period}</strong>
                  <small className="hr-table-subtext">{row.monthKey} · {row.employeeCount} employees</small>
                </span>
              ),
            },
            { id: 'gross', header: 'Gross', align: 'right', render: (row) => <span className="hr-money">{maskMoney(row.gross, masked)}</span> },
            { id: 'net', header: 'Net', align: 'right', render: (row) => <strong className="hr-money">{maskMoney(row.net, masked)}</strong> },
            { id: 'status', header: 'Status', sortValue: (row) => row.status, render: (row) => <HRStatusBadge status={row.status} /> },
            {
              id: 'prepared',
              header: 'Prepared',
              mobileLabel: 'Prepared by',
              render: (row) => (
                <span className="hr-table-text">
                  {row.preparedBy ?? '—'}
                  <small className="hr-table-subtext">{row.preparedAt ? formatDateLong(row.preparedAt.slice(0, 10)) : 'Not prepared'}</small>
                </span>
              ),
            },
            {
              id: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); setMonthKey(row.monthKey); setTab('overview') }}>
                  Open run
                </Button>
              ),
            },
          ]}
          emptyTitle="No payroll history"
          emptyDescription="Payroll runs appear here once they are created."
          footerNote={<span>Past runs stay available for audit. Payment processing and financial approval remain with Finance.</span>}
        />
      ) : null}

      {!permissions.canPreparePayroll ? (
        <HRPermissionNote roleId={profile.id}>
          Payroll is read-only in this preview role. Preparing payroll and sending it to Finance requires the Marketing
          Manager preview role.
        </HRPermissionNote>
      ) : null}

      <HRDemoFooter>
        Payroll preparation uses recorded attendance and approved leave once. No payment processor or bank connection is
        present in this demo.
      </HRDemoFooter>
    </HRPageShell>
  )
}
