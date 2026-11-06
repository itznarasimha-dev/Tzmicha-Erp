import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  Download,
  FileCheck2,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
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
import { formatDateLong, maskMoney } from '../../utils/hr'
import { formatNumber } from '../../utils/format'
import type { HREmployee, HREmployeeDraft, HREmploymentType, HREmployeeStatus } from '../../types/hr'
import {
  HRAvatar,
  HRDemoFooter,
  HRFilterSelect,
  HRPageShell,
  HRPermissionNote,
  HRPersonCell,
  HRStatusBadge,
  HRSummaryGrid,
  HRSummaryTile,
  useInitialLoading,
} from './hrShared'

type TabId = 'directory' | 'org' | 'documents'

const EMPLOYMENT_TYPES: HREmploymentType[] = ['Full Time', 'Part Time', 'Contract', 'Intern']
const STATUSES: HREmployeeStatus[] = ['Active', 'Onboarding', 'On Leave', 'Resigned', 'Terminated']

const emptyDraft: HREmployeeDraft = {
  name: '',
  email: '',
  phone: '',
  department: 'Marketing',
  designation: '',
  reportingManager: 'Meera Iyer',
  employmentType: 'Full Time',
  joiningDate: new Date().toISOString().slice(0, 10),
  location: 'Bengaluru, India',
  salary: 45000,
  status: 'Active',
}

export function HREmployees() {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const exportCsv = useCsvExport()
  const loading = useInitialLoading()

  const [tab, setTab] = useState<TabId>('directory')
  const [department, setDepartment] = useState('All departments')
  const [status, setStatus] = useState('All statuses')
  const [employment, setEmployment] = useState('All types')
  const [docStatus, setDocStatus] = useState('All statuses')
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<HREmployee | null>(null)

  const departments = useMemo(
    () => ['All departments', ...Array.from(new Set(hr.employees.map((employee) => employee.department))).sort()],
    [hr.employees],
  )

  const filtered = useMemo(
    () =>
      hr.employees.filter((employee) => {
        if (department !== 'All departments' && employee.department !== department) return false
        if (status !== 'All statuses' && employee.status !== status) return false
        if (employment !== 'All types' && employee.employmentType !== employment) return false
        return true
      }),
    [hr.employees, department, status, employment],
  )

  const counts = useMemo(
    () => ({
      total: hr.employees.length,
      active: hr.employees.filter((employee) => employee.status === 'Active').length,
      onboarding: hr.employees.filter((employee) => employee.status === 'Onboarding').length,
      onLeave: hr.employees.filter((employee) => employee.status === 'On Leave').length,
      departments: new Set(hr.employees.map((employee) => employee.department)).size,
      pendingDocs: hr.documents.filter((document) => document.status === 'Pending').length,
    }),
    [hr.employees, hr.documents],
  )

  const selectedDocuments = selected
    ? hr.documents.filter((document) => document.employeeId === selected.employeeId)
    : []

  const exportDirectory = () => {
    exportCsv(
      'hr-employee-directory.csv',
      [
        { header: 'Employee ID', value: (row: HREmployee) => row.employeeId },
        { header: 'Name', value: (row: HREmployee) => row.name },
        { header: 'Email', value: (row: HREmployee) => row.email },
        { header: 'Department', value: (row: HREmployee) => row.department },
        { header: 'Designation', value: (row: HREmployee) => row.designation },
        { header: 'Manager', value: (row: HREmployee) => row.reportingManager },
        { header: 'Employment type', value: (row: HREmployee) => row.employmentType },
        { header: 'Joining date', value: (row: HREmployee) => row.joiningDate },
        { header: 'Status', value: (row: HREmployee) => row.status },
      ],
      filtered,
    )
  }

  return (
    <HRPageShell
      section="employees"
      title="Employee directory"
      subtitle="One people record for attendance, leave, payroll, recruitment and performance. Sensitive salary and bank details follow the preview role."
      eyebrow="People master"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportDirectory}>
            Export directory
          </Button>
          {permissions.canManageEmployees ? (
            <Button variant="primary" icon={<UserPlus size={14} />} onClick={() => setAddOpen(true)}>
              Add employee
            </Button>
          ) : null}
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>Active</small><strong>{counts.active}</strong></span>
          <span className="hr-inline-meta"><small>Onboarding</small><strong>{counts.onboarding}</strong></span>
          <span className="hr-inline-meta"><small>Pending documents</small><strong>{counts.pendingDocs}</strong></span>
        </>
      }
    >
      <HRSummaryGrid>
        <HRSummaryTile label="Total employees" value={formatNumber(counts.total)} hint="All people records" icon={<Users size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="Active" value={formatNumber(counts.active)} hint="Currently working" icon={<BadgeCheck size={16} />} tone="var(--chart-2)" />
        <HRSummaryTile label="Onboarding" value={formatNumber(counts.onboarding)} hint="Joining or just joined" icon={<UserPlus size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="Departments" value={formatNumber(counts.departments)} hint="Across the organisation" icon={<Building2 size={16} />} tone="var(--chart-6)" />
        <HRSummaryTile label="Pending documents" value={formatNumber(counts.pendingDocs)} hint="Awaiting verification" icon={<FileCheck2 size={16} />} tone="var(--chart-4)" />
      </HRSummaryGrid>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="Employee directory view"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'directory', label: 'Directory', count: hr.employees.length },
            { id: 'org', label: 'Organisation', count: counts.departments },
            { id: 'documents', label: 'Documents', count: hr.documents.length },
          ]}
        />
      </div>

      {tab === 'directory' ? (
        <DataTable
          data={filtered}
          loading={loading}
          rowKey={(row) => row.id}
          initialSort={{ columnId: 'name', direction: 'asc' }}
          onRowClick={setSelected}
          searchable={(row) =>
            `${row.name} ${row.email} ${row.employeeId} ${row.department} ${row.designation} ${row.location}`
          }
          searchPlaceholder="Search name, employee ID, email or role…"
          filters={
            <>
              <HRFilterSelect label="Department" value={department} options={departments} onChange={setDepartment} />
              <HRFilterSelect label="Status" value={status} options={['All statuses', ...STATUSES]} onChange={setStatus} />
              <HRFilterSelect label="Type" value={employment} options={['All types', ...EMPLOYMENT_TYPES]} onChange={setEmployment} />
            </>
          }
          columns={[
            {
              id: 'name',
              header: 'Employee',
              sortValue: (row) => row.name,
              render: (row) => <HRPersonCell employee={row} detail={`${row.email} · ${row.employeeId}`} />,
            },
            {
              id: 'department',
              header: 'Department',
              sortValue: (row) => row.department,
              mobileLabel: 'Department',
              render: (row) => <span className="hr-table-text">{row.department}</span>,
            },
            {
              id: 'designation',
              header: 'Designation',
              sortValue: (row) => row.designation,
              mobileLabel: 'Designation',
              render: (row) => <span className="hr-table-text">{row.designation}</span>,
            },
            {
              id: 'type',
              header: 'Type',
              sortValue: (row) => row.employmentType,
              mobileLabel: 'Employment type',
              render: (row) => <Badge tone="neutral" dot={false}>{row.employmentType}</Badge>,
            },
            {
              id: 'joining',
              header: 'Joined',
              sortValue: (row) => row.joiningDate,
              mobileLabel: 'Joining date',
              render: (row) => <span className="hr-table-text">{formatDateLong(row.joiningDate)}</span>,
            },
            {
              id: 'status',
              header: 'Status',
              sortValue: (row) => row.status,
              mobileLabel: 'Status',
              render: (row) => <HRStatusBadge status={row.status} />,
            },
            {
              id: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); setSelected(row) }}>
                  View
                </Button>
              ),
            },
          ]}
          emptyTitle="No employees match these filters"
          emptyDescription="Clear the department, status or employment type filter to see more people."
          footerNote={
            <span>
              Directory is seeded from the existing ERP employee roster and merged by email. Salary is masked unless you
              preview the Marketing Manager role.
            </span>
          }
        />
      ) : null}

      {tab === 'org' ? (
        <div className="hr-org-grid">
          {hr.departments.map((departmentRecord) => {
            const members = hr.employees.filter((employee) => employee.department === departmentRecord.name)
            const head = hr.employees.find((employee) => employee.name === departmentRecord.head)
            return (
              <SectionCard
                key={departmentRecord.id}
                title={departmentRecord.name}
                subtitle={`${members.length} ${members.length === 1 ? 'person' : 'people'} · cost centre ${departmentRecord.costCentre}`}
                actions={head ? <HRAvatar employee={head} size="sm" /> : null}
              >
                <div className="hr-org-head">
                  <span>Department head</span>
                  <strong>{departmentRecord.head}</strong>
                </div>
                <div className="hr-org-list">
                  {members.slice(0, 8).map((employee) => (
                    <button
                      type="button"
                      key={employee.id}
                      className="hr-org-person"
                      onClick={() => setSelected(employee)}
                    >
                      <HRAvatar employee={employee} size="xs" />
                      <span>
                        <strong>{employee.name}</strong>
                        <small>{employee.designation}</small>
                      </span>
                      <HRStatusBadge status={employee.status} />
                    </button>
                  ))}
                  {!members.length ? <p className="empty-inline">No employees assigned to this department yet.</p> : null}
                  {members.length > 8 ? <p className="hr-more-note">+{members.length - 8} more people in the directory</p> : null}
                </div>
              </SectionCard>
            )
          })}
        </div>
      ) : null}

      {tab === 'documents' ? (
        <DataTable
          data={docStatus === 'All statuses' ? hr.documents : hr.documents.filter((document) => document.status === docStatus)}
          rowKey={(row) => row.id}
          searchable={(row) => `${row.employeeName} ${row.name} ${row.type} ${row.status}`}
          searchPlaceholder="Search employee, document or type…"
          filters={
            <HRFilterSelect
              label="Status"
              value={docStatus}
              options={['All statuses', 'Verified', 'Pending', 'Rejected']}
              onChange={setDocStatus}
            />
          }
          columns={[
            {
              id: 'employee',
              header: 'Employee',
              render: (row) => <strong className="hr-table-text">{row.employeeName}</strong>,
            },
            {
              id: 'document',
              header: 'Document',
              mobileLabel: 'Document',
              render: (row) => (
                <span className="hr-table-text">
                  {row.type}
                  <small className="hr-table-subtext">{row.name}</small>
                </span>
              ),
            },
            {
              id: 'uploaded',
              header: 'Uploaded',
              mobileLabel: 'Uploaded',
              render: (row) => formatDateLong(row.uploadedAt),
            },
            { id: 'status', header: 'Status', render: (row) => <HRStatusBadge status={row.status} /> },
            {
              id: 'actions',
              header: 'Verification',
              align: 'right',
              render: (row) =>
                permissions.canManageOnboarding && row.status !== 'Verified' ? (
                  <div className="hr-row-actions">
                    <Button variant="soft" size="xs" onClick={() => hr.updateDocumentStatus(row.id, 'Verified')}>
                      Verify
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => hr.updateDocumentStatus(row.id, 'Rejected')}>
                      Reject
                    </Button>
                  </div>
                ) : (
                  <span className="faint">—</span>
                ),
            },
          ]}
          emptyTitle="No documents in this view"
          emptyDescription="Switch the status filter to see verified or pending employee documents."
        />
      ) : null}

      {!permissions.canViewPayrollAmounts ? (
        <HRPermissionNote roleId={profile.id}>
          Salary, bank details and payroll amounts are masked in this preview. Switch to Marketing Manager to exercise
          full HR administration.
        </HRPermissionNote>
      ) : null}

      <HRDemoFooter>
        Employee records are merged from the existing marketing roster and HR records. Changes are stored in this browser
        only.
      </HRDemoFooter>

      <AddEmployeeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        departments={departments.filter((item) => item !== 'All departments')}
        managers={hr.employees.filter((employee) => employee.status !== 'Resigned').map((employee) => employee.name)}
        onSubmit={(draft) => {
          hr.addEmployee(draft)
          setAddOpen(false)
        }}
      />

      <EmployeeProfileModal
        employee={selected}
        documents={selectedDocuments}
        canViewSalary={permissions.canViewPayrollAmounts}
        onClose={() => setSelected(null)}
      />
    </HRPageShell>
  )
}

function AddEmployeeModal({
  open,
  onClose,
  departments,
  managers,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  departments: string[]
  managers: string[]
  onSubmit: (draft: HREmployeeDraft) => void
}) {
  const [draft, setDraft] = useState<HREmployeeDraft>(emptyDraft)
  const [error, setError] = useState('')

  const update = <Key extends keyof HREmployeeDraft>(key: Key, value: HREmployeeDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = () => {
    if (!draft.name.trim()) return setError('Enter the employee name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) return setError('Enter a valid work email address.')
    if (!draft.designation.trim()) return setError('Enter a designation.')
    setError('')
    onSubmit({ ...draft, name: draft.name.trim(), email: draft.email.trim(), designation: draft.designation.trim() })
    setDraft(emptyDraft)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add employee"
      description="Create a people record that is immediately available to attendance, leave, payroll and performance."
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<UserPlus size={14} />} onClick={submit}>Add employee</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-emp-name">Full name</label>
          <input id="hr-emp-name" className="input" value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Aditi Rao" />
        </div>
        <div className="field">
          <label htmlFor="hr-emp-email">Work email</label>
          <input id="hr-emp-email" className="input" type="email" value={draft.email} onChange={(event) => update('email', event.target.value)} placeholder="name@totallyerp.demo" />
        </div>
        <div className="field">
          <label htmlFor="hr-emp-phone">Phone</label>
          <input id="hr-emp-phone" className="input" value={draft.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+91 …" />
        </div>
        <div className="field">
          <label htmlFor="hr-emp-dept">Department</label>
          <select id="hr-emp-dept" className="select" value={draft.department} onChange={(event) => update('department', event.target.value)}>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hr-emp-designation">Designation</label>
          <input id="hr-emp-designation" className="input" value={draft.designation} onChange={(event) => update('designation', event.target.value)} placeholder="e.g. Marketing Executive" />
        </div>
        <div className="field">
          <label htmlFor="hr-emp-manager">Reporting manager</label>
          <select id="hr-emp-manager" className="select" value={draft.reportingManager} onChange={(event) => update('reportingManager', event.target.value)}>
            {managers.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hr-emp-type">Employment type</label>
          <select id="hr-emp-type" className="select" value={draft.employmentType} onChange={(event) => update('employmentType', event.target.value as HREmploymentType)}>
            {EMPLOYMENT_TYPES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hr-emp-joining">Joining date</label>
          <input id="hr-emp-joining" className="input" type="date" value={draft.joiningDate} onChange={(event) => update('joiningDate', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-emp-location">Location</label>
          <input id="hr-emp-location" className="input" value={draft.location} onChange={(event) => update('location', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hr-emp-salary">Annual salary (INR)</label>
          <input id="hr-emp-salary" className="input" type="number" min={0} value={draft.salary} onChange={(event) => update('salary', Number(event.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="hr-emp-status">Initial status</label>
          <select id="hr-emp-status" className="select" value={draft.status} onChange={(event) => update('status', event.target.value as HREmployeeStatus)}>
            {STATUSES.filter((item) => item !== 'Terminated').map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
      <div className="hr-info-note hr-info-note--info mt-16">
        <ShieldCheck size={14} />
        <span>Salary and bank details are visible to HR administrators only. Finance retains final payment processing.</span>
      </div>
    </Modal>
  )
}

function EmployeeProfileModal({
  employee,
  documents,
  canViewSalary,
  onClose,
}: {
  employee: HREmployee | null
  documents: ReturnType<typeof useHRData>['documents']
  canViewSalary: boolean
  onClose: () => void
}) {
  return (
    <Modal
      open={Boolean(employee)}
      onClose={onClose}
      title={employee?.name ?? 'Employee profile'}
      description={employee ? `${employee.designation} · ${employee.department}` : undefined}
      size="wide"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {employee ? (
        <div className="hr-profile">
          <div className="hr-profile__hero">
            <HRAvatar employee={employee} size="lg" />
            <div className="grow" style={{ minWidth: 0 }}>
              <h3>{employee.name}</h3>
              <p>{employee.employeeId} · {employee.employmentType} · joined {formatDateLong(employee.joiningDate)}</p>
              <div className="row-8 wrap mt-8">
                <HRStatusBadge status={employee.status} />
                <Badge tone="neutral">{employee.location}</Badge>
              </div>
            </div>
          </div>
          <div className="hr-profile__grid">
            <span><Mail size={13} /><small>Email</small><strong>{employee.email}</strong></span>
            <span><Phone size={13} /><small>Phone</small><strong>{employee.phone}</strong></span>
            <span><Users size={13} /><small>Reporting manager</small><strong>{employee.reportingManager}</strong></span>
            <span><MapPin size={13} /><small>Location</small><strong>{employee.location}</strong></span>
            <span><Building2 size={13} /><small>Department</small><strong>{employee.department}</strong></span>
            <span><ShieldCheck size={13} /><small>Annual salary</small><strong>{maskMoney(employee.salary, !canViewSalary)}</strong></span>
          </div>
          <div className="hr-profile__section">
            <h4>Skills</h4>
            <div className="row-6 wrap">
              {employee.skills.length ? employee.skills.map((skill) => <Badge key={skill} tone="neutral" dot={false}>{skill}</Badge>) : <span className="faint">No skills recorded.</span>}
            </div>
          </div>
          <div className="hr-profile__section">
            <h4>Documents</h4>
            {documents.length ? (
              <div className="hr-doc-list">
                {documents.map((document) => (
                  <div className="hr-doc-row" key={document.id}>
                    <FileCheck2 size={14} />
                    <span className="grow"><strong>{document.type}</strong><small>{document.name}</small></span>
                    <HRStatusBadge status={document.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-inline">No documents uploaded for this employee.</p>
            )}
          </div>
          <div className="hr-info-note hr-info-note--info">
            <Search size={14} />
            <span>This is the same employee record used across attendance, leave, payroll preparation and performance.</span>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
