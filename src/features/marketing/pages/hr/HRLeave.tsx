import { useMemo, useState } from 'react'
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Download,
  Plus,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useHRData } from '../../context/HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { hrPermissionSummary } from '../../config/hrNavigation'
import { FilterTabs, useCsvExport } from '../workspace/workspaceShared'
import { HR_TODAY } from '../../data/hr'
import {
  currentEmployee,
  formatDateLong,
  formatDateRange,
  leaveSummary,
  upcomingApprovedLeaves,
} from '../../utils/hr'
import { formatNumber } from '../../utils/format'
import type { HRLeaveBalance, HRLeavePolicy, HRLeaveRequest } from '../../types/hr'
import {
  HRAvatar,
  HRDemoFooter,
  HRFilterSelect,
  HRInfoNote,
  HRPageShell,
  HRPermissionNote,
  HRProgress,
  HRStatusBadge,
  HRSummaryGrid,
  HRSummaryTile,
  useInitialLoading,
} from './hrShared'

type TabId = 'requests' | 'balances' | 'policies'

export function HRLeave() {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const exportCsv = useCsvExport()
  const loading = useInitialLoading()

  const [tab, setTab] = useState<TabId>('requests')
  const [status, setStatus] = useState('All statuses')
  const [leaveType, setLeaveType] = useState('All leave types')
  const [decision, setDecision] = useState<{ request: HRLeaveRequest; approve: boolean } | null>(null)
  const [remarks, setRemarks] = useState('')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [balanceSearch, setBalanceSearch] = useState('All employees')

  const summary = useMemo(() => leaveSummary(hr), [hr])
  const upcoming = useMemo(() => upcomingApprovedLeaves(hr, 30), [hr])
  const myEmployee = currentEmployee(hr, profile)

  const leaveTypes = useMemo(
    () => ['All leave types', ...Array.from(new Set(hr.leaveRequests.map((request) => request.leaveType)))],
    [hr.leaveRequests],
  )

  const requests = useMemo(
    () =>
      hr.leaveRequests
        .filter((request) => status === 'All statuses' || request.status === status)
        .filter((request) => leaveType === 'All leave types' || request.leaveType === leaveType)
        .sort((a, b) => b.requestDate.localeCompare(a.requestDate)),
    [hr.leaveRequests, status, leaveType],
  )

  const employeesForBalances = useMemo(
    () => ['All employees', ...hr.employees.map((employee) => employee.name).sort()],
    [hr.employees],
  )

  const balances = useMemo(
    () =>
      hr.leaveBalances
        .filter((balance) => balanceSearch === 'All employees' || balance.employeeName === balanceSearch)
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.leaveType.localeCompare(b.leaveType)),
    [hr.leaveBalances, balanceSearch],
  )

  const decide = (approve: boolean) => {
    if (!decision) return
    hr.decideLeave(decision.request.id, approve ? 'Approved' : 'Rejected', remarks)
    setDecision(null)
    setRemarks('')
  }

  const exportRequests = () => {
    exportCsv(
      'hr-leave-requests.csv',
      [
        { header: 'Employee', value: (row: HRLeaveRequest) => row.employeeName },
        { header: 'Department', value: (row: HRLeaveRequest) => row.department },
        { header: 'Leave type', value: (row: HRLeaveRequest) => row.leaveType },
        { header: 'Start', value: (row: HRLeaveRequest) => row.startDate },
        { header: 'End', value: (row: HRLeaveRequest) => row.endDate },
        { header: 'Days', value: (row: HRLeaveRequest) => String(row.days) },
        { header: 'Status', value: (row: HRLeaveRequest) => row.status },
        { header: 'Reviewer', value: (row: HRLeaveRequest) => row.reviewer ?? '' },
        { header: 'Remarks', value: (row: HRLeaveRequest) => row.reviewerRemarks },
      ],
      requests,
    )
  }

  return (
    <HRPageShell
      section="leave"
      title="Leave management"
      subtitle="Approve leave against live balances. Approved leave feeds attendance, payroll preparation and the people calendar once."
      eyebrow="Leave & absence"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportRequests}>
            Export requests
          </Button>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setSubmitOpen(true)}>
            Request leave
          </Button>
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>Pending days</small><strong>{summary.pendingDays}</strong></span>
          <span className="hr-inline-meta"><small>Approved days</small><strong>{summary.approvedDays}</strong></span>
          <span className="hr-inline-meta"><small>Upcoming</small><strong>{upcoming.length}</strong></span>
        </>
      }
    >
      <HRSummaryGrid>
        <HRSummaryTile label="Pending requests" value={formatNumber(summary.pendingCount)} hint={`${summary.pendingDays} days requested`} icon={<CalendarClock size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="Approved" value={formatNumber(summary.approvedCount)} hint={`${summary.approvedDays} days approved`} icon={<CheckCircle2 size={16} />} tone="var(--chart-2)" />
        <HRSummaryTile label="Rejected" value={formatNumber(summary.rejectedCount)} hint="Decision recorded" icon={<XCircle size={16} />} tone="var(--chart-4)" />
        <HRSummaryTile label="Upcoming leave" value={formatNumber(upcoming.length)} hint="Next 30 days" icon={<CalendarDays size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="Leave types" value={formatNumber(hr.leavePolicies.length)} hint="Active policies" icon={<CalendarCheck2 size={16} />} tone="var(--chart-6)" />
      </HRSummaryGrid>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="Leave management view"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'requests', label: 'Requests', count: hr.leaveRequests.length },
            { id: 'balances', label: 'Balances', count: hr.leaveBalances.length },
            { id: 'policies', label: 'Policies', count: hr.leavePolicies.length },
          ]}
        />
      </div>

      {tab === 'requests' ? (
        <>
          <DataTable
            data={requests}
            loading={loading}
            rowKey={(row) => row.id}
            searchable={(row) => `${row.employeeName} ${row.department} ${row.leaveType} ${row.reason} ${row.status}`}
            searchPlaceholder="Search employee, leave type, reason or status…"
            filters={
              <>
                <HRFilterSelect label="Status" value={status} options={['All statuses', 'Pending', 'Approved', 'Rejected', 'Cancelled']} onChange={setStatus} />
                <HRFilterSelect label="Leave type" value={leaveType} options={leaveTypes} onChange={setLeaveType} />
              </>
            }
            columns={[
              {
                id: 'employee',
                header: 'Employee',
                sortValue: (row) => row.employeeName,
                render: (row) => {
                  const employee = hr.employees.find((item) => item.employeeId === row.employeeId)
                  return (
                    <span className="hr-person-cell">
                      {employee ? <HRAvatar employee={employee} size="sm" /> : null}
                      <span className="hr-person-cell__text">
                        <strong>{row.employeeName}</strong>
                        <small>{row.department}</small>
                      </span>
                    </span>
                  )
                },
              },
              {
                id: 'type',
                header: 'Leave type',
                sortValue: (row) => row.leaveType,
                mobileLabel: 'Leave type',
                render: (row) => <Badge tone="neutral" dot={false}>{row.leaveType}</Badge>,
              },
              {
                id: 'dates',
                header: 'Dates',
                sortValue: (row) => row.startDate,
                mobileLabel: 'Dates',
                render: (row) => (
                  <span className="hr-table-text">
                    {formatDateRange(row.startDate, row.endDate)}
                    <small className="hr-table-subtext">{row.days} day{row.days === 1 ? '' : 's'} · requested {formatDateLong(row.requestDate)}</small>
                  </span>
                ),
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
                sortValue: (row) => row.status,
                render: (row) => (
                  <span className="hr-table-text">
                    <HRStatusBadge status={row.status} />
                    {row.reviewer ? <small className="hr-table-subtext">{row.reviewer}</small> : null}
                  </span>
                ),
              },
              {
                id: 'actions',
                header: 'Decision',
                align: 'right',
                render: (row) =>
                  row.status === 'Pending' && permissions.canApproveLeave ? (
                    <div className="hr-row-actions">
                      <Button variant="soft" size="xs" onClick={() => { setDecision({ request: row, approve: true }); setRemarks('') }}>
                        Approve
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => { setDecision({ request: row, approve: false }); setRemarks('') }}>
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="faint">{row.status === 'Pending' ? 'Awaiting review' : row.reviewer ?? '—'}</span>
                  ),
              },
            ]}
            emptyTitle="No leave requests in this view"
            emptyDescription="Change the status or leave-type filter, or submit a new leave request."
            footerNote={<span>Approving leave updates the balance once and creates the attendance and payroll link used by the other modules.</span>}
          />

          <div className="hr-dashboard-grid hr-dashboard-grid--1-1">
            <SectionCard title="Upcoming approved leave" subtitle="Next 30 days">
              <div className="hr-leave-list">
                {upcoming.slice(0, 7).map((request) => (
                  <div className="hr-leave-list__row" key={request.id}>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <strong>{request.employeeName}</strong>
                      <small>{request.leaveType} · {request.days} day{request.days === 1 ? '' : 's'} · {request.department}</small>
                    </span>
                    <span className="hr-leave-list__dates">{formatDateRange(request.startDate, request.endDate)}</span>
                    <HRStatusBadge status={request.status} />
                  </div>
                ))}
                {!upcoming.length ? <p className="empty-inline">No approved leave scheduled in the next 30 days.</p> : null}
              </div>
            </SectionCard>

            <SectionCard title="Leave utilisation by type" subtitle="Approved and pending days">
              <div className="hr-legend-stack">
                {summary.byType.map((type, index) => (
                  <div className="hr-legend-row" key={type.name}>
                    <span className="hr-legend-row__dot" style={{ background: `var(--chart-${(index % 6) + 1})` }} />
                    <span className="hr-legend-row__name">{type.name}</span>
                    <span className="hr-legend-row__value">{type.value}d</span>
                    <span className="hr-legend-row__bar">
                      <span style={{ width: `${(type.value / Math.max(1, summary.byType[0]?.value ?? 1)) * 100}%`, background: `var(--chart-${(index % 6) + 1})` }} />
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {tab === 'balances' ? (
        <>
          <DataTable
            data={balances}
            rowKey={(row) => row.id}
            searchable={(row) => `${row.employeeName} ${row.leaveType}`}
            searchPlaceholder="Search employee or leave type…"
            filters={
              <HRFilterSelect label="Employee" value={balanceSearch} options={employeesForBalances} onChange={setBalanceSearch} />
            }
            columns={[
              { id: 'employee', header: 'Employee', sortValue: (row) => row.employeeName, render: (row) => <strong className="hr-table-text">{row.employeeName}</strong> },
              { id: 'type', header: 'Leave type', sortValue: (row) => row.leaveType, mobileLabel: 'Leave type', render: (row) => <Badge tone="neutral" dot={false}>{row.leaveType}</Badge> },
              { id: 'entitled', header: 'Entitled', align: 'right', sortValue: (row) => row.entitled, render: (row) => `${row.entitled}d` },
              { id: 'used', header: 'Used', align: 'right', sortValue: (row) => row.used, render: (row) => `${row.used}d` },
              { id: 'pending', header: 'Pending', align: 'right', sortValue: (row) => row.pending, render: (row) => `${row.pending}d` },
              {
                id: 'available',
                header: 'Available',
                align: 'right',
                sortValue: (row) => row.entitled - row.used - row.pending,
                render: (row) => {
                  const available = Math.max(0, row.entitled - row.used - row.pending)
                  return <strong className={available === 0 ? 'text-danger' : ''}>{available}d</strong>
                },
              },
              {
                id: 'utilisation',
                header: 'Utilisation',
                width: '160px',
                mobileLabel: 'Utilisation',
                sortValue: (row) => (row.entitled ? (row.used + row.pending) / row.entitled : 0),
                render: (row) => {
                  const percent = row.entitled ? ((row.used + row.pending) / row.entitled) * 100 : 0
                  return (
                    <span className="hr-balance-cell">
                      <HRProgress value={percent} tone={percent > 90 ? 'danger' : percent > 70 ? 'warning' : 'success'} />
                      <small>{percent.toFixed(0)}%</small>
                    </span>
                  )
                },
              },
            ]}
            emptyTitle="No leave balances"
            emptyDescription="Choose another employee to view their leave balances."
            footerNote={<span>Available = entitled − used − pending. Balances update when a leave decision is recorded.</span>}
          />
          {!permissions.canViewAllEmployees ? null : (
            <HRInfoNote>
              Leave balances are visible to support approvals. Medical reasons and reviewer remarks should only be shared
              with the employee and their reporting line.
            </HRInfoNote>
          )}
        </>
      ) : null}

      {tab === 'policies' ? (
        <>
          <div className="hr-policy-grid">
            {hr.leavePolicies.map((policy) => (
              <SectionCard
                key={policy.id}
                title={policy.leaveType}
                subtitle={policy.paid ? 'Paid leave' : 'Unpaid leave'}
                actions={<Badge tone={policy.paid ? 'success' : 'warning'}>{policy.annualQuota ? `${policy.annualQuota} days` : 'No quota'}</Badge>}
              >
                <p className="hr-policy-description">{policy.description}</p>
                <div className="hr-policy-meta">
                  <span><small>Annual quota</small><strong>{policy.annualQuota} days</strong></span>
                  <span><small>Carry forward</small><strong>{policy.carryForward} days</strong></span>
                  <span><small>Approval</small><strong>{policy.approval}</strong></span>
                </div>
              </SectionCard>
            ))}
          </div>
          {permissions.canManageSettings ? (
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setPolicyOpen(true)}>
              Add leave policy
            </Button>
          ) : null}
        </>
      ) : null}

      {!permissions.canApproveLeave ? (
        <HRPermissionNote roleId={profile.id}>
          You can request leave and track your own balance. Approving leave requires the Senior or Marketing Manager
          preview role.
        </HRPermissionNote>
      ) : null}

      <HRDemoFooter>
        Approved leave feeds attendance, the people calendar and payroll preparation from the same record. A rejected or
        cancelled request releases its pending balance.
      </HRDemoFooter>

      <SubmitLeaveModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        employeeId={myEmployee?.employeeId ?? ''}
        leaveTypes={hr.leavePolicies.map((policy) => policy.leaveType)}
      />

      <AddPolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} onSubmit={(policy) => { hr.addLeavePolicy(policy); setPolicyOpen(false) }} />

      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.approve ? 'Approve leave request' : 'Reject leave request'}
        description={decision ? `${decision.request.employeeName} · ${decision.request.leaveType} · ${formatDateRange(decision.request.startDate, decision.request.endDate)}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecision(null)}>Cancel</Button>
            <Button variant={decision?.approve ? 'primary' : 'danger'} icon={decision?.approve ? <ShieldCheck size={14} /> : <XCircle size={14} />} onClick={() => decide(Boolean(decision?.approve))}>
              {decision?.approve ? 'Approve leave' : 'Reject leave'}
            </Button>
          </>
        }
      >
        {decision ? (
          <div className="hr-decision">
            <div className="hr-decision__summary">
              <span><small>Requested days</small><strong>{decision.request.days}</strong></span>
              <span><small>Department</small><strong>{decision.request.department}</strong></span>
              <span><small>Requested on</small><strong>{formatDateLong(decision.request.requestDate)}</strong></span>
            </div>
            <p className="text-sm muted">{decision.request.reason}</p>
            <div className="field">
              <label htmlFor="hr-leave-remarks">Reviewer remarks</label>
              <textarea id="hr-leave-remarks" className="textarea" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Add a note for the employee and the audit trail." />
            </div>
            <HRInfoNote tone={decision.approve ? 'success' : 'warning'}>
              {decision.approve
                ? 'The balance updates once and the attendance register shows approved leave for these dates.'
                : 'The pending balance is released. The employee can correct the request and submit again.'}
            </HRInfoNote>
          </div>
        ) : null}
      </Modal>
    </HRPageShell>
  )
}

function SubmitLeaveModal({
  open,
  onClose,
  employeeId,
  leaveTypes,
}: {
  open: boolean
  onClose: () => void
  employeeId: string
  leaveTypes: string[]
}) {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const me = currentEmployee(hr, profile)
  const [leaveType, setLeaveType] = useState(leaveTypes[0] ?? 'Casual Leave')
  const [startDate, setStartDate] = useState(HR_TODAY)
  const [endDate, setEndDate] = useState(HR_TODAY)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const days = Math.max(1, Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86_400_000) + 1)

  const submit = () => {
    if (!employeeId) return setError('No employee record is linked to this preview role.')
    if (endDate < startDate) return setError('End date cannot be earlier than the start date.')
    if (!reason.trim()) return setError('Add a short reason for the leave request.')
    hr.submitLeave({ employeeId, leaveType, startDate, endDate, reason: reason.trim() })
    setReason('')
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request leave"
      description={me ? `${me.name} · leave balance will be checked by your reviewer` : 'Submit a leave request'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Submit request</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-leave-type">Leave type</label>
          <select id="hr-leave-type" className="select" value={leaveType} onChange={(event) => setLeaveType(event.target.value)}>
            {leaveTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hr-leave-days">Days requested</label>
          <input id="hr-leave-days" className="input" value={`${Number.isFinite(days) ? days : 1} day${days === 1 ? '' : 's'}`} readOnly />
        </div>
        <div className="field">
          <label htmlFor="hr-leave-start">Start date</label>
          <input id="hr-leave-start" className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-leave-end">End date</label>
          <input id="hr-leave-end" className="input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="hr-leave-reason">Reason</label>
          <textarea id="hr-leave-reason" className="textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Share enough context for your reviewer." />
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </Modal>
  )
}

function AddPolicyModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (policy: Omit<HRLeavePolicy, 'id'>) => void
}) {
  const [leaveType, setLeaveType] = useState('')
  const [quota, setQuota] = useState('10')
  const [carryForward, setCarryForward] = useState('0')
  const [paid, setPaid] = useState(true)
  const [error, setError] = useState('')

  const submit = () => {
    if (!leaveType.trim()) return setError('Enter a leave type name.')
    onSubmit({
      leaveType: leaveType.trim(),
      annualQuota: Number(quota) || 0,
      carryForward: Number(carryForward) || 0,
      paid,
      approval: 'Reporting manager',
      description: 'Added from HR Settings. Review the eligibility and approval route before the next leave cycle.',
    })
    setLeaveType('')
    setError('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add leave policy"
      description="A new leave type becomes available in the employee leave request form."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Add policy</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="hr-policy-name">Leave type</label>
          <input id="hr-policy-name" className="input" value={leaveType} onChange={(event) => setLeaveType(event.target.value)} placeholder="e.g. Parental Leave" />
        </div>
        <div className="field">
          <label htmlFor="hr-policy-quota">Annual quota (days)</label>
          <input id="hr-policy-quota" className="input" type="number" min={0} value={quota} onChange={(event) => setQuota(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-policy-carry">Carry forward (days)</label>
          <input id="hr-policy-carry" className="input" type="number" min={0} value={carryForward} onChange={(event) => setCarryForward(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-policy-paid">Paid leave</label>
          <select id="hr-policy-paid" className="select" value={paid ? 'Yes' : 'No'} onChange={(event) => setPaid(event.target.value === 'Yes')}>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </Modal>
  )
}
