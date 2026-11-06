import { useMemo, useState, type ReactNode } from 'react'
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Landmark,
  LockKeyhole,
  Plus,
  Settings2,
  ShieldCheck,
  Star,
  Trash2,
  Users,
} from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useHRData } from '../../context/HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { hrPermissionSummary } from '../../config/hrNavigation'
import { FilterTabs, useCsvExport } from '../workspace/workspaceShared'
import { formatNumber } from '../../utils/format'
import { formatDateLong } from '../../utils/hr'
import type { HRAttendancePolicy, HRHoliday, HRLeavePolicy, HRReviewTemplate } from '../../types/hr'
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

type TabId = 'organisation' | 'policies' | 'calendar' | 'templates'
type DeleteKind = 'department' | 'designation' | 'leave' | 'attendance' | 'holiday' | 'template'

interface DeleteTarget {
  kind: DeleteKind
  id: string
  label: string
  detail: string
}

export function HRSettings() {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const canManage = permissions.canManageSettings
  const exportCsv = useCsvExport()
  const loading = useInitialLoading()

  const [tab, setTab] = useState<TabId>('organisation')
  const [department, setDepartment] = useState('All departments')
  const [addKind, setAddKind] = useState<DeleteKind | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const departmentOptions = useMemo(
    () => ['All departments', ...hr.departments.map((item) => item.name).sort()],
    [hr.departments],
  )

  const designationRows = useMemo(
    () =>
      hr.designations
        .filter((item) => department === 'All departments' || item.department === department)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [hr.designations, department],
  )

  const peopleIn = (name: string) => hr.employees.filter((employee) => employee.department === name).length
  const designationIn = (title: string) => hr.employees.filter((employee) => employee.designation === title).length

  const activeLeavePolicies = hr.leavePolicies.filter((policy) => policy.paid).length
  const upcomingHolidays = hr.holidays.filter(
    (holiday) => holiday.date >= new Date().toISOString().slice(0, 10),
  ).length

  const confirmDelete = () => {
    if (!deleteTarget) return
    switch (deleteTarget.kind) {
      case 'department':
        hr.removeDepartment(deleteTarget.id)
        break
      case 'designation':
        hr.removeDesignation(deleteTarget.id)
        break
      case 'leave':
        hr.removeLeavePolicy(deleteTarget.id)
        break
      case 'attendance':
        hr.removeAttendancePolicy(deleteTarget.id)
        break
      case 'holiday':
        hr.removeHoliday(deleteTarget.id)
        break
      case 'template':
        hr.removeReviewTemplate(deleteTarget.id)
        break
    }
    setDeleteTarget(null)
  }

  const exportSettings = () => {
    const rows = [
      ...hr.departments.map((item) => ({
        area: 'Department',
        name: item.name,
        detail: `${item.head} · cost centre ${item.costCentre}`,
      })),
      ...hr.designations.map((item) => ({
        area: 'Designation',
        name: item.title,
        detail: `${item.department} · level ${item.level}`,
      })),
      ...hr.leavePolicies.map((item) => ({
        area: 'Leave policy',
        name: item.leaveType,
        detail: `${item.annualQuota} days · ${item.paid ? 'paid' : 'unpaid'} · ${item.approval}`,
      })),
      ...hr.attendancePolicies.map((item) => ({
        area: 'Attendance policy',
        name: item.name,
        detail: `${item.checkIn}–${item.checkOut} · ${item.graceMinutes}m grace · ${item.workingDays}`,
      })),
      ...hr.holidays.map((item) => ({
        area: 'Holiday',
        name: item.name,
        detail: `${item.date} · ${item.type}`,
      })),
      ...hr.reviewTemplates.map((item) => ({
        area: 'Review template',
        name: item.name,
        detail: `${item.cycle} · ${item.ratingScale} · ${item.status}`,
      })),
    ]
    exportCsv(
      'hr-settings.csv',
      [
        { header: 'Area', value: (row: (typeof rows)[number]) => row.area },
        { header: 'Record', value: (row: (typeof rows)[number]) => row.name },
        { header: 'Detail', value: (row: (typeof rows)[number]) => row.detail },
      ],
      rows,
    )
  }

  const primaryAction = (() => {
    if (!canManage) return null
    const labelByTab: Record<TabId, string> = {
      organisation: 'Add department',
      policies: 'Add leave policy',
      calendar: 'Add holiday',
      templates: 'Add review template',
    }
    const kindByTab: Record<TabId, DeleteKind> = {
      organisation: 'department',
      policies: 'leave',
      calendar: 'holiday',
      templates: 'template',
    }
    return (
      <Button variant="primary" icon={<Plus size={14} />} onClick={() => setAddKind(kindByTab[tab])}>
        {labelByTab[tab]}
      </Button>
    )
  })()

  return (
    <HRPageShell
      section="settings"
      title="HR settings"
      subtitle="The organisation structure, policies, leave calendar and review templates that power every HR module."
      eyebrow="People configuration"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportSettings}>
            Export settings
          </Button>
          {primaryAction}
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>Departments</small><strong>{hr.departments.length}</strong></span>
          <span className="hr-inline-meta"><small>Policies</small><strong>{hr.leavePolicies.length + hr.attendancePolicies.length}</strong></span>
          <span className="hr-inline-meta"><small>Upcoming holidays</small><strong>{upcomingHolidays}</strong></span>
        </>
      }
    >
      {!canManage ? (
        <HRInfoNote tone="warning">
          You are viewing HR settings in read-only mode. Organisation structure, policies and templates can only be
          changed by the Marketing Manager preview role.
        </HRInfoNote>
      ) : null}

      <HRSummaryGrid>
        <HRSummaryTile label="Departments" value={formatNumber(hr.departments.length)} hint="With named heads and cost centres" icon={<Building2 size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="Designations" value={formatNumber(hr.designations.length)} hint="Across all departments" icon={<Users size={16} />} tone="var(--chart-5)" />
        <HRSummaryTile label="Leave policies" value={formatNumber(hr.leavePolicies.length)} hint={`${activeLeavePolicies} paid policies`} icon={<CalendarDays size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="Attendance policies" value={formatNumber(hr.attendancePolicies.length)} hint="Shifts, grace and full-day rules" icon={<Clock3 size={16} />} tone="var(--chart-2)" />
        <HRSummaryTile label="Holidays" value={formatNumber(hr.holidays.length)} hint={`${upcomingHolidays} still upcoming`} icon={<Landmark size={16} />} tone="var(--chart-6)" />
        <HRSummaryTile label="Review templates" value={formatNumber(hr.reviewTemplates.length)} hint="Performance cycle definitions" icon={<Star size={16} />} tone="var(--chart-4)" />
      </HRSummaryGrid>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="HR settings view"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'organisation', label: 'Organisation', count: hr.departments.length },
            { id: 'policies', label: 'Policies', count: hr.leavePolicies.length + hr.attendancePolicies.length },
            { id: 'calendar', label: 'Calendar', count: hr.holidays.length },
            { id: 'templates', label: 'Templates', count: hr.reviewTemplates.length },
          ]}
        />
      </div>

      {tab === 'organisation' ? (
        <>
          <DataTable
            data={hr.departments}
            loading={loading}
            rowKey={(row) => row.id}
            searchable={(row) => `${row.name} ${row.head} ${row.costCentre}`}
            searchPlaceholder="Search department, head or cost centre…"
            toolbarActions={
              canManage ? (
                <Button variant="soft" size="sm" icon={<Plus size={13} />} onClick={() => setAddKind('department')}>
                  Add department
                </Button>
              ) : undefined
            }
            columns={[
              {
                id: 'name',
                header: 'Department',
                sortValue: (row) => row.name,
                render: (row) => (
                  <span className="hr-table-text">
                    <strong>{row.name}</strong>
                    <small className="hr-table-subtext">Cost centre {row.costCentre}</small>
                  </span>
                ),
              },
              { id: 'head', header: 'Department head', sortValue: (row) => row.head, mobileLabel: 'Head', render: (row) => <span className="hr-table-text">{row.head}</span> },
              {
                id: 'people',
                header: 'People',
                align: 'right',
                sortValue: (row) => peopleIn(row.name),
                mobileLabel: 'People',
                render: (row) => <span className="hr-money">{peopleIn(row.name)}</span>,
              },
              {
                id: 'actions',
                header: '',
                align: 'right',
                render: (row) =>
                  canManage ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={<Trash2 size={12} />}
                      onClick={(event) => {
                        event.stopPropagation()
                        setDeleteTarget({
                          kind: 'department',
                          id: row.id,
                          label: row.name,
                          detail: `${peopleIn(row.name)} people currently use this department. Remove only after reassigning them.`,
                        })
                      }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <span className="faint">Read only</span>
                  ),
              },
            ]}
            emptyTitle="No departments configured"
            emptyDescription="Add a department to start assigning employees, budgets and approvals."
            footerNote={<span>Departments are referenced by employees, job openings and payroll preparation.</span>}
          />

          <SectionCard
            title="Designations"
            subtitle="Job titles available to employee records and requisitions"
            actions={
              canManage ? (
                <Button variant="soft" size="sm" icon={<Plus size={13} />} onClick={() => setAddKind('designation')}>
                  Add designation
                </Button>
              ) : null
            }
          >
            <div className="hr-day-toolbar hr-settings-toolbar">
              <HRFilterSelect label="Department" value={department} options={departmentOptions} onChange={setDepartment} />
            </div>
            <DataTable
              data={designationRows}
              rowKey={(row) => row.id}
              searchable={(row) => `${row.title} ${row.department} ${row.level}`}
              searchPlaceholder="Search designation, department or level…"
              columns={[
                { id: 'title', header: 'Designation', sortValue: (row) => row.title, render: (row) => <strong className="hr-table-text">{row.title}</strong> },
                { id: 'department', header: 'Department', sortValue: (row) => row.department, mobileLabel: 'Department', render: (row) => <span className="hr-table-text">{row.department}</span> },
                { id: 'level', header: 'Level', sortValue: (row) => row.level, mobileLabel: 'Level', render: (row) => <Badge tone="neutral" dot={false}>{row.level}</Badge> },
                {
                  id: 'people',
                  header: 'People',
                  align: 'right',
                  sortValue: (row) => designationIn(row.title),
                  mobileLabel: 'People',
                  render: (row) => <span className="hr-money">{designationIn(row.title)}</span>,
                },
                {
                  id: 'actions',
                  header: '',
                  align: 'right',
                  render: (row) =>
                    canManage ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Trash2 size={12} />}
                        onClick={() =>
                          setDeleteTarget({
                            kind: 'designation',
                            id: row.id,
                            label: row.title,
                            detail: `${designationIn(row.title)} employees currently use this designation.`,
                          })
                        }
                      >
                        Remove
                      </Button>
                    ) : (
                      <span className="faint">Read only</span>
                    ),
                },
              ]}
              emptyTitle="No designations match this department"
              emptyDescription="Choose another department or add a designation."
              footerNote={<span>Designations drive salary bands and job-opening defaults.</span>}
            />
          </SectionCard>

          <div className="hr-settings-grid">
            <SectionCard title="Employment types" subtitle="Engagement models available in the employee master">
              <div className="hr-setting-list">
                {hr.employmentTypes.map((type) => (
                  <div className="hr-setting-row" key={type.id}>
                    <span className="hr-setting-row__icon"><Users size={14} /></span>
                    <span className="grow"><strong>{type.name}</strong><small>{type.description}</small></span>
                    <Badge tone={type.active ? 'success' : 'neutral'}>{type.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Working hours" subtitle="Standard schedules used for attendance calculations">
              <div className="hr-setting-list">
                {hr.workingHours.map((hours) => (
                  <div className="hr-setting-row" key={hours.id}>
                    <span className="hr-setting-row__icon"><Clock3 size={14} /></span>
                    <span className="grow"><strong>{hours.name}</strong><small>{hours.appliesTo} · {hours.breakMinutes}m break</small></span>
                    <span className="hr-readonly-value">{hours.start}–{hours.end} · {hours.weeklyHours}h</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {tab === 'policies' ? (
        <>
          <SectionCard
            title="Leave policies"
            subtitle="Quotas, carry-forward rules and approval owners"
            actions={
              canManage ? (
                <Button variant="soft" size="sm" icon={<Plus size={13} />} onClick={() => setAddKind('leave')}>
                  Add leave policy
                </Button>
              ) : null
            }
          >
            <div className="hr-policy-grid">
              {hr.leavePolicies.map((policy) => (
                <article className="hr-policy-card" key={policy.id}>
                  <div className="hr-policy-card__head">
                    <span className="hr-policy-card__icon"><CalendarDays size={16} /></span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <h3>{policy.leaveType}</h3>
                      <span className="hr-policy-meta">{policy.annualQuota} days per year · {policy.approval}</span>
                    </div>
                    <Badge tone={policy.paid ? 'success' : 'neutral'}>{policy.paid ? 'Paid' : 'Unpaid'}</Badge>
                  </div>
                  <p className="hr-policy-description">{policy.description}</p>
                  <div className="hr-policy-card__grid">
                    <span><small>Annual quota</small><strong>{policy.annualQuota} days</strong></span>
                    <span><small>Carry forward</small><strong>{policy.carryForward} days</strong></span>
                    <span><small>Approval</small><strong>{policy.approval}</strong></span>
                  </div>
                  <div className="hr-policy-card__foot">
                    <span className="faint">{hr.leaveRequests.filter((request) => request.leaveType === policy.leaveType).length} requests this period</span>
                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Trash2 size={12} />}
                        onClick={() =>
                          setDeleteTarget({
                            kind: 'leave',
                            id: policy.id,
                            label: policy.leaveType,
                            detail: 'Existing leave requests remain in the register, but new requests will no longer offer this policy.',
                          })
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Attendance policies"
            subtitle="Shift timings, grace periods and full-day rules by team"
            actions={
              canManage ? (
                <Button variant="soft" size="sm" icon={<Plus size={13} />} onClick={() => setAddKind('attendance')}>
                  Add attendance policy
                </Button>
              ) : null
            }
          >
            <div className="hr-policy-grid">
              {hr.attendancePolicies.map((policy) => (
                <article className="hr-policy-card" key={policy.id}>
                  <div className="hr-policy-card__head">
                    <span className="hr-policy-card__icon hr-policy-card__icon--info"><Clock3 size={16} /></span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <h3>{policy.name}</h3>
                      <span className="hr-policy-meta">{policy.department} · {policy.workingDays}</span>
                    </div>
                    <Badge tone="info">{policy.graceMinutes}m grace</Badge>
                  </div>
                  <div className="hr-policy-card__grid">
                    <span><small>Check in</small><strong>{policy.checkIn}</strong></span>
                    <span><small>Check out</small><strong>{policy.checkOut}</strong></span>
                    <span><small>Late after</small><strong>{policy.lateMarkAfter}</strong></span>
                    <span><small>Full day</small><strong>{policy.fullDayHours}h</strong></span>
                    <span><small>Half day</small><strong>{policy.halfDayHours}h</strong></span>
                  </div>
                  <div className="hr-policy-card__foot">
                    <span className="faint">Applied to recorded attendance and payroll verification</span>
                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Trash2 size={12} />}
                        onClick={() =>
                          setDeleteTarget({
                            kind: 'attendance',
                            id: policy.id,
                            label: policy.name,
                            detail: 'Recorded attendance is preserved. This policy will no longer apply to future records.',
                          })
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
          <HRInfoNote>
            Attendance policy changes apply to future records. Historical punches and approved corrections remain in the
            audit trail and are used once in payroll verification.
          </HRInfoNote>
        </>
      ) : null}

      {tab === 'calendar' ? (
        <>
          <DataTable
            data={[...hr.holidays].sort((a, b) => a.date.localeCompare(b.date))}
            loading={loading}
            rowKey={(row) => row.id}
            searchable={(row) => `${row.name} ${row.date} ${row.type}`}
            searchPlaceholder="Search holiday or date…"
            initialSort={{ columnId: 'date', direction: 'asc' }}
            toolbarActions={
              canManage ? (
                <Button variant="soft" size="sm" icon={<Plus size={13} />} onClick={() => setAddKind('holiday')}>
                  Add holiday
                </Button>
              ) : undefined
            }
            columns={[
              {
                id: 'date',
                header: 'Date',
                sortValue: (row) => row.date,
                render: (row) => (
                  <span className="hr-table-text">
                    <strong>{formatDateLong(row.date)}</strong>
                    <small className="hr-table-subtext">{row.date}</small>
                  </span>
                ),
              },
              { id: 'name', header: 'Holiday', sortValue: (row) => row.name, render: (row) => <span className="hr-table-text">{row.name}</span> },
              { id: 'type', header: 'Type', sortValue: (row) => row.type, mobileLabel: 'Type', render: (row) => <Badge tone={row.type === 'Public' ? 'accent' : row.type === 'Company' ? 'info' : 'neutral'}>{row.type}</Badge> },
              {
                id: 'status',
                header: 'Status',
                mobileLabel: 'Status',
                render: (row) => (
                  <HRStatusBadge status={row.date < new Date().toISOString().slice(0, 10) ? 'Completed' : 'Scheduled'} />
                ),
              },
              {
                id: 'actions',
                header: '',
                align: 'right',
                render: (row) =>
                  canManage ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={<Trash2 size={12} />}
                      onClick={() =>
                        setDeleteTarget({
                          kind: 'holiday',
                          id: row.id,
                          label: row.name,
                          detail: 'Removing a holiday will make that date a normal working day for attendance calculations.',
                        })
                      }
                    >
                      Remove
                    </Button>
                  ) : (
                    <span className="faint">Read only</span>
                  ),
              },
            ]}
            emptyTitle="No holidays configured"
            emptyDescription="Add public, restricted or company holidays to the HR calendar."
            footerNote={<span>Holidays are excluded from absent calculations and used by leave and payroll preparation.</span>}
          />

          <div className="hr-dashboard-grid hr-dashboard-grid--1-1">
            <SectionCard title="Holiday calendar" subtitle="Public, restricted and company days">
              <div className="hr-holiday-list">
                {[...hr.holidays].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6).map((holiday) => (
                  <div className="hr-holiday-row" key={holiday.id}>
                    <span className="hr-holiday-row__date">
                      <strong>{new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(new Date(`${holiday.date}T00:00:00`))}</strong>
                      <small>{new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(`${holiday.date}T00:00:00`))}</small>
                    </span>
                    <span className="grow"><strong>{holiday.name}</strong><small>{holiday.type} holiday · {formatDateLong(holiday.date)}</small></span>
                    <Badge tone={holiday.type === 'Public' ? 'accent' : 'info'}>{holiday.type}</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Attendance and leave impact" subtitle="How the calendar is used across HR">
              <div className="hr-simple-list">
                <div className="hr-simple-row">
                  <span className="hr-simple-row__icon"><CheckCircle2 size={14} /></span>
                  <span className="grow"><strong>Absenteeism</strong><small>Holidays are excluded from absent counts on the HR dashboard and reports.</small></span>
                </div>
                <div className="hr-simple-row">
                  <span className="hr-simple-row__icon"><CalendarDays size={14} /></span>
                  <span className="grow"><strong>Leave planning</strong><small>Approved leave that overlaps a holiday is still recorded against the employee balance.</small></span>
                </div>
                <div className="hr-simple-row">
                  <span className="hr-simple-row__icon"><ShieldCheck size={14} /></span>
                  <span className="grow"><strong>Payroll</strong><small>Working days and paid leave feed payroll verification once, with no duplicate adjustment.</small></span>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {tab === 'templates' ? (
        <div className="hr-policy-grid">
          {hr.reviewTemplates.map((template) => (
            <article className="hr-policy-card" key={template.id}>
              <div className="hr-policy-card__head">
                <span className="hr-policy-card__icon hr-policy-card__icon--template"><FileText size={16} /></span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <h3>{template.name}</h3>
                  <span className="hr-policy-meta">{template.cycle} cycle · {template.ratingScale}</span>
                </div>
                <Badge tone={template.status === 'Active' ? 'success' : 'neutral'}>{template.status}</Badge>
              </div>
              <div className="row-6 wrap">
                {template.sections.map((section) => (
                  <Badge key={section} tone="neutral" dot={false}>{section}</Badge>
                ))}
              </div>
              <div className="hr-policy-card__foot">
                <span className="faint">Used by the Performance module</span>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={<Trash2 size={12} />}
                    onClick={() =>
                      setDeleteTarget({
                        kind: 'template',
                        id: template.id,
                        label: template.name,
                        detail: 'Completed reviews remain in employee history. New cycles will no longer use this template.',
                      })
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
          {canManage ? (
            <button type="button" className="hr-policy-card hr-policy-card--add" onClick={() => setAddKind('template')}>
              <Plus size={20} />
              <strong>Add review template</strong>
              <small>Define the cycle, sections and rating scale.</small>
            </button>
          ) : null}
        </div>
      ) : null}

      {!canManage ? (
        <HRPermissionNote roleId={profile.id}>
          HR settings are read-only for this preview role. Switch to the Marketing Manager role to add or remove
          departments, designations, policies, holidays and review templates.
        </HRPermissionNote>
      ) : (
        <HRPermissionNote roleId={profile.id}>
          Changes are stored in this browser and recorded in the HR audit trail. Finance retains payment processing and
          financial approval.
        </HRPermissionNote>
      )}

      <HRDemoFooter>
        Configuration changes affect the local demonstration records only. Nothing is sent to an external HR, payroll or
        benefits provider.
      </HRDemoFooter>

      <DepartmentModal
        open={addKind === 'department'}
        onClose={() => setAddKind(null)}
        onSave={(name, head, costCentre) => {
          hr.addDepartment(name, head, costCentre)
          setAddKind(null)
        }}
      />
      <DesignationModal
        open={addKind === 'designation'}
        onClose={() => setAddKind(null)}
        departments={hr.departments.map((item) => item.name)}
        onSave={(title, departmentName, level) => {
          hr.addDesignation(title, departmentName, level)
          setAddKind(null)
        }}
      />
      <LeavePolicyModal
        open={addKind === 'leave'}
        onClose={() => setAddKind(null)}
        onSave={(policy) => {
          hr.addLeavePolicy(policy)
          setAddKind(null)
        }}
      />
      <AttendancePolicyModal
        open={addKind === 'attendance'}
        onClose={() => setAddKind(null)}
        departments={hr.departments.map((item) => item.name)}
        onSave={(policy) => {
          hr.addAttendancePolicy(policy)
          setAddKind(null)
        }}
      />
      <HolidayModal
        open={addKind === 'holiday'}
        onClose={() => setAddKind(null)}
        onSave={(holiday) => {
          hr.addHoliday(holiday)
          setAddKind(null)
        }}
      />
      <ReviewTemplateModal
        open={addKind === 'template'}
        onClose={() => setAddKind(null)}
        onSave={(template) => {
          hr.addReviewTemplate(template)
          setAddKind(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Remove ${deleteTarget?.label ?? 'record'}?`}
        description={deleteTarget?.detail ?? 'This configuration will be removed from the local HR records.'}
        confirmLabel="Remove record"
      />
    </HRPageShell>
  )
}

function FormShell({
  open,
  onClose,
  title,
  description,
  onSubmit,
  submitLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  onSubmit: () => void
  submitLabel: string
  children: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Plus size={14} />} onClick={onSubmit}>{submitLabel}</Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}

function DepartmentModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (name: string, head: string, costCentre: string) => void
}) {
  const [name, setName] = useState('')
  const [head, setHead] = useState('')
  const [costCentre, setCostCentre] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) return setError('Enter a department name.')
    if (!head.trim()) return setError('Enter the department head.')
    setError('')
    onSave(name.trim(), head.trim(), costCentre.trim() || 'CC-NEW-01')
    setName('')
    setHead('')
    setCostCentre('')
  }

  return (
    <FormShell open={open} onClose={onClose} title="Add department" description="Departments group employees, cost centres and reporting lines." onSubmit={submit} submitLabel="Add department">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-dept-name">Department name</label>
          <input id="hr-dept-name" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Brand Marketing" />
        </div>
        <div className="field">
          <label htmlFor="hr-dept-head">Department head</label>
          <input id="hr-dept-head" className="input" value={head} onChange={(event) => setHead(event.target.value)} placeholder="e.g. Meera Iyer" />
        </div>
        <div className="field">
          <label htmlFor="hr-dept-cost">Cost centre</label>
          <input id="hr-dept-cost" className="input" value={costCentre} onChange={(event) => setCostCentre(event.target.value)} placeholder="e.g. CC-MKT-11" />
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </FormShell>
  )
}

function DesignationModal({
  open,
  onClose,
  departments,
  onSave,
}: {
  open: boolean
  onClose: () => void
  departments: string[]
  onSave: (title: string, department: string, level: string) => void
}) {
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState(departments[0] ?? 'Marketing')
  const [level, setLevel] = useState('E2')
  const [error, setError] = useState('')

  const submit = () => {
    if (!title.trim()) return setError('Enter a designation title.')
    setError('')
    onSave(title.trim(), department, level)
    setTitle('')
  }

  return (
    <FormShell open={open} onClose={onClose} title="Add designation" description="Designations are available to employee records, job openings and salary bands." onSubmit={submit} submitLabel="Add designation">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-des-title">Designation title</label>
          <input id="hr-des-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Brand Manager" />
        </div>
        <div className="field">
          <label htmlFor="hr-des-department">Department</label>
          <select id="hr-des-department" className="select" value={department} onChange={(event) => setDepartment(event.target.value)}>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hr-des-level">Level</label>
          <input id="hr-des-level" className="input" value={level} onChange={(event) => setLevel(event.target.value)} placeholder="e.g. M2" />
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </FormShell>
  )
}

function LeavePolicyModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (policy: Omit<HRLeavePolicy, 'id'>) => void
}) {
  const [draft, setDraft] = useState<Omit<HRLeavePolicy, 'id'>>({
    leaveType: '',
    annualQuota: 12,
    carryForward: 0,
    paid: true,
    approval: 'Manager',
    description: '',
  })
  const [error, setError] = useState('')

  const update = <Key extends keyof Omit<HRLeavePolicy, 'id'>>(key: Key, value: Omit<HRLeavePolicy, 'id'>[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = () => {
    if (!draft.leaveType.trim()) return setError('Enter a leave type.')
    setError('')
    onSave({ ...draft, leaveType: draft.leaveType.trim(), description: draft.description.trim() || 'Policy configured in HR settings.' })
    setDraft((current) => ({ ...current, leaveType: '', description: '' }))
  }

  return (
    <FormShell open={open} onClose={onClose} title="Add leave policy" description="The policy is used by leave requests, balances and payroll verification." onSubmit={submit} submitLabel="Add leave policy">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-lp-type">Leave type</label>
          <input id="hr-lp-type" className="input" value={draft.leaveType} onChange={(event) => update('leaveType', event.target.value)} placeholder="e.g. Study Leave" />
        </div>
        <div className="field">
          <label htmlFor="hr-lp-quota">Annual quota (days)</label>
          <input id="hr-lp-quota" className="input" type="number" min={0} value={draft.annualQuota} onChange={(event) => update('annualQuota', Number(event.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="hr-lp-carry">Carry forward (days)</label>
          <input id="hr-lp-carry" className="input" type="number" min={0} value={draft.carryForward} onChange={(event) => update('carryForward', Number(event.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="hr-lp-paid">Paid leave</label>
          <select id="hr-lp-paid" className="select" value={draft.paid ? 'Yes' : 'No'} onChange={(event) => update('paid', event.target.value === 'Yes')}>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="hr-lp-approval">Approval owner</label>
          <select id="hr-lp-approval" className="select" value={draft.approval} onChange={(event) => update('approval', event.target.value)}>
            <option>Manager</option>
            <option>Senior</option>
            <option>HR</option>
            <option>Manager and HR</option>
          </select>
        </div>
        <div className="field field--full">
          <label htmlFor="hr-lp-description">Description</label>
          <textarea id="hr-lp-description" className="input" rows={3} value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="How this leave type can be used…" />
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </FormShell>
  )
}

function AttendancePolicyModal({
  open,
  onClose,
  departments,
  onSave,
}: {
  open: boolean
  onClose: () => void
  departments: string[]
  onSave: (policy: Omit<HRAttendancePolicy, 'id'>) => void
}) {
  const [draft, setDraft] = useState<Omit<HRAttendancePolicy, 'id'>>({
    name: '',
    department: departments[0] ?? 'All departments',
    checkIn: '09:00',
    checkOut: '18:00',
    graceMinutes: 15,
    fullDayHours: 8,
    halfDayHours: 4,
    workingDays: 'Monday to Friday',
    lateMarkAfter: '09:15',
  })
  const [error, setError] = useState('')

  const update = <Key extends keyof Omit<HRAttendancePolicy, 'id'>>(key: Key, value: Omit<HRAttendancePolicy, 'id'>[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = () => {
    if (!draft.name.trim()) return setError('Enter a policy name.')
    setError('')
    onSave({ ...draft, name: draft.name.trim() })
    setDraft((current) => ({ ...current, name: '' }))
  }

  return (
    <FormShell open={open} onClose={onClose} title="Add attendance policy" description="Shift rules are used to classify present, late, half-day and full-day attendance." onSubmit={submit} submitLabel="Add attendance policy">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-ap-name">Policy name</label>
          <input id="hr-ap-name" className="input" value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Night Shift" />
        </div>
        <div className="field">
          <label htmlFor="hr-ap-department">Department</label>
          <select id="hr-ap-department" className="select" value={draft.department} onChange={(event) => update('department', event.target.value)}>
            <option>All departments</option>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hr-ap-in">Check in</label>
          <input id="hr-ap-in" className="input" type="time" value={draft.checkIn} onChange={(event) => update('checkIn', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-ap-out">Check out</label>
          <input id="hr-ap-out" className="input" type="time" value={draft.checkOut} onChange={(event) => update('checkOut', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-ap-grace">Grace minutes</label>
          <input id="hr-ap-grace" className="input" type="number" min={0} value={draft.graceMinutes} onChange={(event) => update('graceMinutes', Number(event.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="hr-ap-late">Late mark after</label>
          <input id="hr-ap-late" className="input" type="time" value={draft.lateMarkAfter} onChange={(event) => update('lateMarkAfter', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-ap-full">Full day hours</label>
          <input id="hr-ap-full" className="input" type="number" min={1} value={draft.fullDayHours} onChange={(event) => update('fullDayHours', Number(event.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="hr-ap-half">Half day hours</label>
          <input id="hr-ap-half" className="input" type="number" min={1} value={draft.halfDayHours} onChange={(event) => update('halfDayHours', Number(event.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="hr-ap-days">Working days</label>
          <input id="hr-ap-days" className="input" value={draft.workingDays} onChange={(event) => update('workingDays', event.target.value)} />
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </FormShell>
  )
}

function HolidayModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (holiday: Omit<HRHoliday, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<HRHoliday['type']>('Public')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) return setError('Enter the holiday name.')
    if (!date) return setError('Choose a holiday date.')
    setError('')
    onSave({ name: name.trim(), date, type })
    setName('')
  }

  return (
    <FormShell open={open} onClose={onClose} title="Add holiday" description="Holidays are excluded from absent calculations and used by leave and payroll." onSubmit={submit} submitLabel="Add holiday">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-hol-name">Holiday name</label>
          <input id="hr-hol-name" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Regional Festival" />
        </div>
        <div className="field">
          <label htmlFor="hr-hol-date">Date</label>
          <input id="hr-hol-date" className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-hol-type">Holiday type</label>
          <select id="hr-hol-type" className="select" value={type} onChange={(event) => setType(event.target.value as HRHoliday['type'])}>
            <option>Public</option>
            <option>Restricted</option>
            <option>Company</option>
          </select>
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </FormShell>
  )
}

function ReviewTemplateModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (template: Omit<HRReviewTemplate, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [cycle, setCycle] = useState('Annual')
  const [sections, setSections] = useState('Goals, Competencies, Development plan')
  const [ratingScale, setRatingScale] = useState('1 to 5')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) return setError('Enter a template name.')
    const parsedSections = sections.split(',').map((item) => item.trim()).filter(Boolean)
    if (!parsedSections.length) return setError('Add at least one review section.')
    setError('')
    onSave({ name: name.trim(), cycle, sections: parsedSections, ratingScale, status: 'Active' })
    setName('')
  }

  return (
    <FormShell open={open} onClose={onClose} title="Add review template" description="Templates define the sections and rating scale used by the performance cycle." onSubmit={submit} submitLabel="Add template">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-rt-name">Template name</label>
          <input id="hr-rt-name" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Quarterly Check-in" />
        </div>
        <div className="field">
          <label htmlFor="hr-rt-cycle">Cycle</label>
          <select id="hr-rt-cycle" className="select" value={cycle} onChange={(event) => setCycle(event.target.value)}>
            <option>Annual</option>
            <option>Half year</option>
            <option>Quarterly</option>
            <option>Probation</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="hr-rt-scale">Rating scale</label>
          <select id="hr-rt-scale" className="select" value={ratingScale} onChange={(event) => setRatingScale(event.target.value)}>
            <option>1 to 5</option>
            <option>Meets / Exceeds</option>
            <option>1 to 10</option>
          </select>
        </div>
        <div className="field field--full">
          <label htmlFor="hr-rt-sections">Sections</label>
          <input id="hr-rt-sections" className="input" value={sections} onChange={(event) => setSections(event.target.value)} placeholder="Goals, Competencies, Development plan" />
          <small className="field-hint">Separate each review section with a comma.</small>
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
      <div className="hr-info-note hr-info-note--info mt-16">
        <ShieldCheck size={14} />
        <span>Completed reviews remain readable in employee history even if the template is later removed.</span>
      </div>
    </FormShell>
  )
}
