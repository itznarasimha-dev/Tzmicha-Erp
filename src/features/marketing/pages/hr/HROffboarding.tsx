import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  LogOut,
  Plus,
  Send,
  ShieldCheck,
  UserMinus,
  Users,
  Video,
} from 'lucide-react'
import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { DataTable } from '../../components/ui/DataTable'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ChartCard, ChartTooltip, PieLegend, chartColors } from '../../components/charts/ChartKit'
import { useHRData } from '../../context/HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { hrPermissionSummary } from '../../config/hrNavigation'
import { FilterTabs, useCsvExport } from '../workspace/workspaceShared'
import { HR_TODAY } from '../../data/hr'
import { formatDateLong } from '../../utils/hr'
import { formatNumber } from '../../utils/format'
import { addDays, toISODate } from '../../utils/dates'
import type { HROffboarding as HROffboardingRecord, HROffboardingDraft } from '../../types/hr'
import {
  HRAvatar,
  HRDemoFooter,
  HRFilterSelect,
  HRInfoNote,
  HRListEmpty,
  HRPageShell,
  HRPermissionNote,
  HRProgress,
  HRStatusBadge,
  HRSummaryGrid,
  HRSummaryTile,
  useInitialLoading,
} from './hrShared'

type TabId = 'pipeline' | 'clearance' | 'insights'

const CLEARANCE_LABELS: Array<{ key: keyof HROffboardingRecord['clearance']; label: string; detail: string }> = [
  { key: 'it', label: 'IT assets & access', detail: 'Laptop, devices, accounts and system access returned' },
  { key: 'finance', label: 'Finance dues', detail: 'Advances, reimbursements and company dues settled' },
  { key: 'manager', label: 'Manager handover', detail: 'Projects, customers and knowledge transfer completed' },
  { key: 'hr', label: 'HR documentation', detail: 'Exit interview, documents and full-and-final inputs' },
]

const REASONS = [
  'Higher studies',
  'Relocation',
  'Career change',
  'Better opportunity',
  'Personal reasons',
  'Health',
  'Retirement',
  'Other',
]

function daysFromToday(date: string): number {
  const target = new Date(`${date}T00:00:00`).getTime()
  const today = new Date(`${HR_TODAY}T00:00:00`).getTime()
  return Math.round((target - today) / 86_400_000)
}

function clearanceDone(record: HROffboardingRecord): number {
  return Object.values(record.clearance).filter(Boolean).length
}

export function HROffboarding() {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const exportCsv = useCsvExport()
  const loading = useInitialLoading()

  const [tab, setTab] = useState<TabId>('pipeline')
  const [status, setStatus] = useState('All statuses')
  const [department, setDepartment] = useState('All departments')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<HROffboardingRecord | null>(null)

  const departments = useMemo(
    () => ['All departments', ...Array.from(new Set(hr.offboarding.map((record) => record.department))).sort()],
    [hr.offboarding],
  )

  const records = useMemo(
    () =>
      hr.offboarding
        .filter((record) => status === 'All statuses' || record.status === status)
        .filter((record) => department === 'All departments' || record.department === department)
        .sort((a, b) => a.lastWorkingDay.localeCompare(b.lastWorkingDay)),
    [hr.offboarding, status, department],
  )

  const counts = useMemo(() => {
    const active = hr.offboarding.filter((record) => record.status !== 'Completed')
    const clearancePending = hr.offboarding.filter(
      (record) => clearanceDone(record) < CLEARANCE_LABELS.length && record.status !== 'Completed',
    ).length
    const interviews = hr.offboarding.filter(
      (record) => record.exitInterviewStatus === 'Scheduled',
    ).length
    const settlements = hr.offboarding.filter(
      (record) => ['Pending', 'Prepared'].includes(record.finalSettlement),
    ).length
    const completed = hr.offboarding.filter((record) => record.status === 'Completed').length
    const joiningExits = hr.employees.filter((employee) => employee.status === 'Resigned').length
    return {
      active: active.length,
      clearancePending,
      interviews,
      settlements,
      completed,
      joiningExits,
      total: hr.offboarding.length,
    }
  }, [hr.offboarding, hr.employees])

  const reasonData = useMemo(() => {
    const map = new Map<string, number>()
    hr.offboarding.forEach((record) => map.set(record.reason, (map.get(record.reason) ?? 0) + 1))
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [hr.offboarding])

  const exportOffboarding = () => {
    exportCsv(
      'hr-offboarding-register.csv',
      [
        { header: 'Employee', value: (row: HROffboardingRecord) => row.employeeName },
        { header: 'Employee ID', value: (row: HROffboardingRecord) => row.employeeId },
        { header: 'Department', value: (row: HROffboardingRecord) => row.department },
        { header: 'Designation', value: (row: HROffboardingRecord) => row.designation },
        { header: 'Resignation date', value: (row: HROffboardingRecord) => row.resignationDate },
        { header: 'Notice days', value: (row: HROffboardingRecord) => String(row.noticePeriodDays) },
        { header: 'Last working day', value: (row: HROffboardingRecord) => row.lastWorkingDay },
        { header: 'Reason', value: (row: HROffboardingRecord) => row.reason },
        { header: 'Exit interview', value: (row: HROffboardingRecord) => row.exitInterviewStatus },
        {
          header: 'Clearance complete',
          value: (row: HROffboardingRecord) => `${clearanceDone(row)}/${CLEARANCE_LABELS.length}`,
        },
        { header: 'Final settlement', value: (row: HROffboardingRecord) => row.finalSettlement },
        { header: 'Status', value: (row: HROffboardingRecord) => row.status },
      ],
      hr.offboarding,
    )
  }

  return (
    <HRPageShell
      section="offboarding"
      title="Offboarding"
      subtitle="Manage resignations, notice periods, exit interviews, asset clearance and the final settlement hand-off to Finance."
      eyebrow="Employee lifecycle"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportOffboarding}>
            Export register
          </Button>
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            disabled={!permissions.canManageOffboarding}
            onClick={() => setCreateOpen(true)}
          >
            Record resignation
          </Button>
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>In notice</small><strong>{counts.active}</strong></span>
          <span className="hr-inline-meta"><small>Clearance pending</small><strong>{counts.clearancePending}</strong></span>
          <span className="hr-inline-meta"><small>Exit interviews</small><strong>{counts.interviews}</strong></span>
        </>
      }
    >
      <HRSummaryGrid>
        <HRSummaryTile label="Active exits" value={formatNumber(counts.active)} hint="Notice and clearance in progress" icon={<UserMinus size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="Clearance pending" value={formatNumber(counts.clearancePending)} hint="Assets, finance, manager or HR" icon={<ClipboardCheck size={16} />} tone="var(--chart-4)" />
        <HRSummaryTile label="Exit interviews" value={formatNumber(counts.interviews)} hint="Scheduled conversations" icon={<Video size={16} />} tone="var(--chart-6)" />
        <HRSummaryTile label="Settlements" value={formatNumber(counts.settlements)} hint="Pending or prepared for Finance" icon={<FileCheck2 size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="Completed exits" value={formatNumber(counts.completed)} hint="Handed to Finance" icon={<CheckCircle2 size={16} />} tone="var(--chart-2)" />
      </HRSummaryGrid>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="Offboarding view"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'pipeline', label: 'Exit pipeline', count: hr.offboarding.length },
            { id: 'clearance', label: 'Clearance & settlement', count: counts.clearancePending },
            { id: 'insights', label: 'Exit insights' },
          ]}
        />
      </div>

      {tab === 'pipeline' ? (
        <>
          <DataTable
            data={records}
            loading={loading}
            rowKey={(row) => row.id}
            initialSort={{ columnId: 'lastDay', direction: 'asc' }}
            searchable={(row) => `${row.employeeName} ${row.department} ${row.designation} ${row.reason} ${row.manager} ${row.status}`}
            searchPlaceholder="Search employee, department, reason or manager…"
            filters={
              <>
                <HRFilterSelect label="Status" value={status} options={['All statuses', 'Pending Review', 'In Progress', 'Clearance Pending', 'Completed']} onChange={setStatus} />
                <HRFilterSelect label="Department" value={department} options={departments} onChange={setDepartment} />
              </>
            }
            onRowClick={setSelected}
            columns={[
              {
                id: 'employee',
                header: 'Employee',
                sortValue: (row) => row.employeeName,
                render: (row) => {
                  const employee = hr.employees.find((item) => item.employeeId === row.employeeId)
                  return employee ? (
                    <span className="hr-person-cell">
                      <HRAvatar employee={employee} size="sm" />
                      <span className="hr-person-cell__text">
                        <strong>{row.employeeName}</strong>
                        <small>{row.designation} · {row.department}</small>
                      </span>
                    </span>
                  ) : <strong className="hr-table-text">{row.employeeName}</strong>
                },
              },
              {
                id: 'lastDay',
                header: 'Last working day',
                sortValue: (row) => row.lastWorkingDay,
                mobileLabel: 'Last working day',
                render: (row) => {
                  const days = daysFromToday(row.lastWorkingDay)
                  return (
                    <span className="hr-table-text">
                      <strong>{formatDateLong(row.lastWorkingDay)}</strong>
                      <small className="hr-table-subtext">
                        {days > 0 ? `${days} day${days === 1 ? '' : 's'} remaining` : days === 0 ? 'Last day today' : `Exited ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`}
                      </small>
                    </span>
                  )
                },
              },
              {
                id: 'notice',
                header: 'Notice',
                mobileLabel: 'Notice period',
                render: (row) => (
                  <span className="hr-table-text">
                    <strong>{row.noticePeriodDays} days</strong>
                    <small className="hr-table-subtext">From {formatDateLong(row.resignationDate)}</small>
                  </span>
                ),
              },
              {
                id: 'clearance',
                header: 'Clearance',
                sortValue: (row) => clearanceDone(row),
                mobileLabel: 'Clearance',
                render: (row) => {
                  const done = clearanceDone(row)
                  return (
                    <span className="hr-clearance-cell">
                      <span className="between"><small>{done}/{CLEARANCE_LABELS.length} complete</small></span>
                      <HRProgress value={(done / CLEARANCE_LABELS.length) * 100} tone={done === CLEARANCE_LABELS.length ? 'success' : 'warning'} />
                    </span>
                  )
                },
              },
              {
                id: 'interview',
                header: 'Exit interview',
                mobileLabel: 'Exit interview',
                render: (row) => <HRStatusBadge status={row.exitInterviewStatus} />,
              },
              {
                id: 'settlement',
                header: 'Settlement',
                mobileLabel: 'Final settlement',
                render: (row) => <HRStatusBadge status={row.finalSettlement} />,
              },
              { id: 'status', header: 'Status', sortValue: (row) => row.status, render: (row) => <HRStatusBadge status={row.status} /> },
              {
                id: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelected(row)
                    }}
                  >
                    {permissions.canManageOffboarding ? 'Manage' : 'View'}
                  </Button>
                ),
              },
            ]}
            emptyTitle="No exits match this view"
            emptyDescription="Change the status or department filter, or record a new resignation."
            emptyAction={
              permissions.canManageOffboarding ? (
                <Button variant="soft" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
                  Record resignation
                </Button>
              ) : undefined
            }
            footerNote={<span>Notice dates, clearance and settlement are kept in the same employee lifecycle record.</span>}
          />
          <HRInfoNote>
            Resignations move the employee to a notice-period state in the directory. Final settlement is prepared by HR and
            sent to Finance, which keeps payment processing and financial approval.
          </HRInfoNote>
        </>
      ) : null}

      {tab === 'clearance' ? (
        records.length ? (
          <div className="hr-offboarding-grid">
            {records.map((record) => {
              const employee = hr.employees.find((item) => item.employeeId === record.employeeId)
              const done = clearanceDone(record)
              return (
                <article className="hr-offboarding-card" key={record.id}>
                  <div className="hr-offboarding-card__head">
                    {employee ? <HRAvatar employee={employee} size="md" /> : null}
                    <span className="grow" style={{ minWidth: 0 }}>
                      <strong>{record.employeeName}</strong>
                      <small>{record.designation} · {record.department}</small>
                    </span>
                    <HRStatusBadge status={record.status} />
                  </div>

                  <div className="hr-offboarding-card__meta">
                    <span><CalendarDays size={12} /> Last day {formatDateLong(record.lastWorkingDay)}</span>
                    <span><UserMinus size={12} /> Notice {record.noticePeriodDays} days</span>
                  </div>

                  <div className="hr-offboarding-card__progress">
                    <div className="between">
                      <span>Exit clearance</span>
                      <strong>{done}/{CLEARANCE_LABELS.length}</strong>
                    </div>
                    <HRProgress value={(done / CLEARANCE_LABELS.length) * 100} tone={done === CLEARANCE_LABELS.length ? 'success' : 'warning'} />
                  </div>

                  <div className="hr-clearance-list">
                    {CLEARANCE_LABELS.map((item) => (
                      <label key={item.key} className={`hr-clearance-row ${record.clearance[item.key] ? 'is-done' : ''}`.trim()}>
                        <input
                          type="checkbox"
                          checked={record.clearance[item.key]}
                          disabled={!permissions.canManageOffboarding || record.status === 'Completed'}
                          onChange={() => hr.toggleClearance(record.id, item.key)}
                        />
                        <span className="grow">
                          <strong>{item.label}</strong>
                          <small>{item.detail}</small>
                        </span>
                        {record.clearance[item.key] ? <CheckCircle2 size={14} /> : null}
                      </label>
                    ))}
                  </div>

                  <div className="hr-offboarding-card__foot">
                    <span className="hr-table-text">
                      <small>Final settlement</small>
                      <strong>{record.finalSettlement}</strong>
                    </span>
                    <Button variant="ghost" size="xs" onClick={() => setSelected(record)}>
                      Open record
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <HRListEmpty
            title="No exit records match this view"
            description="Clear the filters or record a resignation to begin clearance tracking."
            action={
              <Button variant="soft" onClick={() => { setStatus('All statuses'); setDepartment('All departments') }}>
                Reset filters
              </Button>
            }
          />
        )
      ) : null}

      {tab === 'insights' ? (
        <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
          <ChartCard title="Exit reasons" subtitle="Why employees are leaving this cycle" height="sm" isEmpty={!reasonData.length} emptyMessage="No exit records are available yet.">
            <PieChart>
              <Pie data={reasonData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3} stroke="none">
                {reasonData.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ChartCard>

          <SectionCard title="Exit distribution" subtitle="Records by reason">
            {reasonData.length ? (
              <>
                <PieLegend
                  items={reasonData.map((entry, index) => ({
                    name: entry.name,
                    value: entry.value,
                    color: chartColors[index % chartColors.length],
                    display: String(entry.value),
                  }))}
                />
                <HRInfoNote>
                  Exit reasons help HR target retention actions. They are recorded from the resignation and exit interview.
                </HRInfoNote>
              </>
            ) : (
              <p className="empty-inline">No exit reasons recorded.</p>
            )}
          </SectionCard>

          <SectionCard title="Lifecycle hand-offs" subtitle="Who owns each step">
            <div className="hr-simple-list">
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><LogOut size={14} /></span>
                <span className="grow"><strong>Manager acknowledgement</strong><small>Accept the resignation and confirm the last working day</small></span>
              </div>
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><ClipboardCheck size={14} /></span>
                <span className="grow"><strong>IT, Finance and manager clearance</strong><small>Assets, dues and handover signed off separately</small></span>
              </div>
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><ShieldCheck size={14} /></span>
                <span className="grow"><strong>HR documentation and exit interview</strong><small>Feedback, documents and full-and-final inputs</small></span>
              </div>
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><ArrowRight size={14} /></span>
                <span className="grow"><strong>Settlement to Finance</strong><small>HR prepares; Finance processes payment and approves the final settlement</small></span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Upcoming last working days" subtitle="Next exits in the register">
            <div className="hr-simple-list">
              {[...hr.offboarding]
                .filter((record) => record.status !== 'Completed')
                .sort((a, b) => a.lastWorkingDay.localeCompare(b.lastWorkingDay))
                .slice(0, 6)
                .map((record) => (
                  <button type="button" className="hr-simple-row hr-simple-row--button" key={record.id} onClick={() => setSelected(record)}>
                    <span className="hr-simple-row__icon"><CalendarDays size={14} /></span>
                    <span className="grow"><strong>{record.employeeName}</strong><small>{record.department} · {record.reason}</small></span>
                    <span className="hr-table-text" style={{ textAlign: 'right' }}>{formatDateLong(record.lastWorkingDay)}</span>
                  </button>
                ))}
              {!hr.offboarding.some((record) => record.status !== 'Completed') ? (
                <p className="empty-inline">No upcoming exits.</p>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {!permissions.canManageOffboarding ? (
        <HRPermissionNote roleId={profile.id}>
          You can view exit records in this preview role. Recording resignations, updating clearance and sending settlements
          requires the Senior or Marketing Manager preview role.
        </HRPermissionNote>
      ) : null}

      <HRDemoFooter>
        Offboarding uses the same employee directory as the rest of the HR workspace. Final settlement remains a Finance
        responsibility in this demo.
      </HRDemoFooter>

      <ResignationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(draft) => {
          hr.addOffboarding(draft)
          setCreateOpen(false)
        }}
      />

      {selected ? (
        <ExitDetailModal
          key={selected.id}
          record={selected}
          canManage={permissions.canManageOffboarding}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </HRPageShell>
  )
}

function ResignationModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (draft: HROffboardingDraft) => void
}) {
  const hr = useHRData()
  const eligible = useMemo(
    () =>
      hr.employees.filter(
        (employee) =>
          !['Resigned', 'Terminated'].includes(employee.status) &&
          !hr.offboarding.some((record) => record.employeeId === employee.employeeId && record.status !== 'Completed'),
      ),
    [hr.employees, hr.offboarding],
  )
  const [employeeId, setEmployeeId] = useState('')
  const [resignationDate, setResignationDate] = useState(HR_TODAY)
  const [noticePeriodDays, setNoticePeriodDays] = useState(30)
  const [lastWorkingDay, setLastWorkingDay] = useState(toISODate(addDays(HR_TODAY, 30)))
  const [reason, setReason] = useState(REASONS[0])
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && !employeeId && eligible[0]) setEmployeeId(eligible[0].employeeId)
  }, [open, employeeId, eligible])

  useEffect(() => {
    setLastWorkingDay(toISODate(addDays(resignationDate, noticePeriodDays)))
  }, [resignationDate, noticePeriodDays])

  const employee = eligible.find((item) => item.employeeId === employeeId)

  const submit = () => {
    if (!employeeId) return setError('Choose an employee for this exit record.')
    if (lastWorkingDay < resignationDate) return setError('The last working day cannot be before the resignation date.')
    onSubmit({
      employeeId,
      resignationDate,
      noticePeriodDays: Math.max(1, noticePeriodDays),
      lastWorkingDay,
      reason,
      manager: employee?.reportingManager ?? 'Meera Iyer',
    })
    setError('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a resignation"
      description="Start the exit workflow with the notice period, last working day and reason."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<UserMinus size={14} />} onClick={submit}>Start offboarding</Button>
        </>
      }
    >
      {eligible.length ? (
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="hr-off-employee">Employee</label>
            <select id="hr-off-employee" className="select" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              {eligible.map((item) => (
                <option key={item.employeeId} value={item.employeeId}>
                  {item.name} · {item.designation} · {item.department}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="hr-off-resignation">Resignation date</label>
            <input id="hr-off-resignation" className="input" type="date" max={HR_TODAY} value={resignationDate} onChange={(event) => setResignationDate(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hr-off-notice">Notice period (days)</label>
            <input id="hr-off-notice" className="input" type="number" min={1} value={noticePeriodDays} onChange={(event) => setNoticePeriodDays(Number(event.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="hr-off-last">Last working day</label>
            <input id="hr-off-last" className="input" type="date" value={lastWorkingDay} onChange={(event) => setLastWorkingDay(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hr-off-reason">Reason</label>
            <select id="hr-off-reason" className="select" value={reason} onChange={(event) => setReason(event.target.value)}>
              {REASONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="hr-off-manager">Reporting manager</label>
            <input id="hr-off-manager" className="input" value={employee?.reportingManager ?? ''} readOnly />
          </div>
        </div>
      ) : (
        <HRInfoNote tone="warning">
          Every active employee already has an open exit record. Complete or remove the existing record before starting another.
        </HRInfoNote>
      )}
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
      <HRInfoNote>
        The employee is moved to a notice-period state and the exit record appears in the clearance register immediately.
      </HRInfoNote>
    </Modal>
  )
}

function ExitDetailModal({
  record,
  canManage,
  onClose,
}: {
  record: HROffboardingRecord
  canManage: boolean
  onClose: () => void
}) {
  const hr = useHRData()
  const live = hr.offboarding.find((item) => item.id === record.id) ?? record
  const done = clearanceDone(live)
  const allCleared = done === CLEARANCE_LABELS.length
  const [interviewDate, setInterviewDate] = useState(live.exitInterviewDate ?? '')
  const [note, setNote] = useState(live.note)
  const [error, setError] = useState('')

  useEffect(() => {
    setInterviewDate(live.exitInterviewDate ?? '')
    setNote(live.note)
  }, [live.id, live.exitInterviewDate, live.note])

  const saveInterview = () => {
    if (!interviewDate) return setError('Choose a date for the exit interview.')
    hr.updateOffboarding(live.id, {
      exitInterviewDate: interviewDate,
      exitInterviewStatus: 'Scheduled',
      note: note.trim() || live.note,
    })
    setError('')
  }

  const markInterviewComplete = () => {
    hr.updateOffboarding(live.id, {
      exitInterviewStatus: 'Completed',
      exitInterviewDate: live.exitInterviewDate ?? HR_TODAY,
      note: note.trim() || 'Exit interview completed.',
    })
  }

  const prepareSettlement = () => {
    hr.updateOffboarding(live.id, {
      finalSettlement: 'Prepared',
      note: note.trim() || 'Full-and-final settlement prepared by HR. Awaiting Finance processing.',
    })
  }

  const sendToFinance = () => {
    if (!allCleared) return setError('All four clearance areas must be complete before the settlement is sent to Finance.')
    hr.sendSettlementToFinance(live.id)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${live.employeeName} · offboarding`}
      description={`${live.designation} · ${live.department} · last working day ${formatDateLong(live.lastWorkingDay)}`}
      size="wide"
      footer={
        canManage ? (
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="soft" icon={<FileCheck2 size={14} />} onClick={prepareSettlement} disabled={live.finalSettlement === 'Sent to Finance' || live.finalSettlement === 'Settled'}>
              Prepare settlement
            </Button>
            <Button
              variant="primary"
              icon={<Send size={14} />}
              onClick={sendToFinance}
              disabled={!allCleared || live.finalSettlement !== 'Prepared'}
              title={!allCleared ? 'Complete all clearance areas first' : live.finalSettlement !== 'Prepared' ? 'Prepare the settlement first' : undefined}
            >
              Send to Finance
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="hr-exit-detail">
        <div className="hr-exit-detail__stats">
          <div><small>Status</small><strong><HRStatusBadge status={live.status} /></strong></div>
          <div><small>Resignation</small><strong>{formatDateLong(live.resignationDate)}</strong></div>
          <div><small>Notice</small><strong>{live.noticePeriodDays} days</strong></div>
          <div><small>Clearance</small><strong>{done}/{CLEARANCE_LABELS.length}</strong></div>
          <div><small>Final settlement</small><strong><HRStatusBadge status={live.finalSettlement} /></strong></div>
        </div>

        <div className="hr-exit-detail__grid">
          <SectionCard title="Exit details" subtitle="Resignation and reporting line">
            <div className="hr-detail-modal__grid">
              <span><small>Employee ID</small><strong>{live.employeeId}</strong></span>
              <span><small>Manager</small><strong>{live.manager}</strong></span>
              <span><small>Resignation date</small><strong>{formatDateLong(live.resignationDate)}</strong></span>
              <span><small>Last working day</small><strong>{formatDateLong(live.lastWorkingDay)}</strong></span>
              <span><small>Reason</small><strong>{live.reason}</strong></span>
              <span><small>Exit interview</small><strong>{live.exitInterviewStatus}</strong></span>
            </div>
            <HRInfoNote tone={live.reason ? 'info' : 'warning'}>{live.note}</HRInfoNote>
          </SectionCard>

          <SectionCard title="Exit clearance" subtitle="Each owner signs off separately">
            <div className="hr-clearance-list">
              {CLEARANCE_LABELS.map((item) => (
                <label key={item.key} className={`hr-clearance-row ${live.clearance[item.key] ? 'is-done' : ''}`.trim()}>
                  <input
                    type="checkbox"
                    checked={live.clearance[item.key]}
                    disabled={!canManage || live.status === 'Completed'}
                    onChange={() => hr.toggleClearance(live.id, item.key)}
                  />
                  <span className="grow">
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                  {live.clearance[item.key] ? <CheckCircle2 size={14} /> : null}
                </label>
              ))}
            </div>
            <HRProgress value={(done / CLEARANCE_LABELS.length) * 100} tone={allCleared ? 'success' : 'warning'} />
          </SectionCard>

          <SectionCard title="Exit interview" subtitle="Schedule and confirm the conversation">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="hr-exit-date">Interview date</label>
                <input
                  id="hr-exit-date"
                  className="input"
                  type="date"
                  value={interviewDate}
                  min={live.resignationDate}
                  onChange={(event) => setInterviewDate(event.target.value)}
                  disabled={!canManage}
                />
              </div>
              <div className="field">
                <label>Current status</label>
                <div className="hr-readonly-value"><HRStatusBadge status={live.exitInterviewStatus} /></div>
              </div>
              <div className="field full">
                <label htmlFor="hr-exit-note">HR note</label>
                <textarea
                  id="hr-exit-note"
                  className="textarea"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={!canManage}
                  placeholder="Record handover notes, clearance blockers or the settlement basis."
                />
              </div>
            </div>
            {canManage ? (
              <div className="hr-row-actions mt-8">
                <Button variant="soft" size="sm" icon={<Video size={14} />} onClick={saveInterview}>Schedule interview</Button>
                <Button variant="ghost" size="sm" icon={<CheckCircle2 size={14} />} onClick={markInterviewComplete} disabled={live.exitInterviewStatus === 'Completed'}>
                  Mark completed
                </Button>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Finance hand-off" subtitle="Final settlement ownership">
            <div className="hr-simple-list">
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><ShieldCheck size={14} /></span>
                <span className="grow"><strong>HR prepares the full-and-final amount</strong><small>Uses verified attendance, leave and clearance records</small></span>
              </div>
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><Send size={14} /></span>
                <span className="grow"><strong>Finance processes the payment</strong><small>Financial approval and disbursement remain with Finance</small></span>
              </div>
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><Users size={14} /></span>
                <span className="grow"><strong>Employee record is closed</strong><small>The directory keeps the exit history for audit and references</small></span>
              </div>
            </div>
            {!allCleared ? (
              <HRInfoNote tone="warning">
                Complete IT, Finance, manager and HR clearance before sending the settlement to Finance.
              </HRInfoNote>
            ) : null}
            {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
          </SectionCard>
        </div>
      </div>
    </Modal>
  )
}
