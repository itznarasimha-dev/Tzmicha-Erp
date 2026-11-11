import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardSignature,
  Clock3,
  Download,
  MessageSquareText,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Tags,
  UserRoundCheck,
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
import { formatNumber } from '../../utils/format'
import { currentEmployee, formatDateLong, formatDateTime, relativeTime } from '../../utils/hr'
import type { HREmployeeRequest, HREmployeeRequestDraft } from '../../types/hr'
import {
  HRAvatar,
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

type TabId = 'requests' | 'categories'

const CATEGORIES = [
  'Employment Certificate',
  'Experience Letter',
  'Bank Details Update',
  'Address Update',
  'ID Card',
  'PF Query',
  'Document Request',
  'Payroll Query',
  'IT Access',
  'Other',
]

const PRIORITIES: HREmployeeRequest['priority'][] = ['Low', 'Normal', 'High', 'Urgent']

export function HRRequests() {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const exportCsv = useCsvExport()
  const loading = useInitialLoading()

  const [tab, setTab] = useState<TabId>('requests')
  const [status, setStatus] = useState('All statuses')
  const [priority, setPriority] = useState('All priorities')
  const [category, setCategory] = useState('All categories')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<HREmployeeRequest | null>(null)

  const me = currentEmployee(hr, profile)
  const visible = useMemo(
    () =>
      permissions.isSelfService
        ? hr.employeeRequests.filter((request) => request.employeeId === me?.employeeId)
        : hr.employeeRequests,
    [hr.employeeRequests, permissions.isSelfService, me?.employeeId],
  )

  const requests = useMemo(
    () =>
      visible
        .filter((request) => status === 'All statuses' || request.status === status)
        .filter((request) => priority === 'All priorities' || request.priority === priority)
        .filter((request) => category === 'All categories' || request.category === category)
        .sort((a, b) => b.requestDate.localeCompare(a.requestDate)),
    [visible, status, priority, category],
  )

  const counts = useMemo(() => {
    const pending = visible.filter((request) => request.status === 'Pending').length
    const inProgress = visible.filter((request) => request.status === 'In Progress').length
    const completed = visible.filter((request) => request.status === 'Completed').length
    const urgent = visible.filter((request) => request.priority === 'Urgent' && request.status !== 'Completed').length
    const resolved = visible.filter((request) => request.status === 'Completed' && request.resolvedAt)
    const averageHours = resolved.length
      ? resolved.reduce((sum, request) => sum + Math.max(0, new Date(request.resolvedAt as string).getTime() - new Date(`${request.requestDate}T00:00:00`).getTime()), 0) /
        resolved.length /
        3_600_000
      : 0
    return { pending, inProgress, completed, urgent, averageHours, total: visible.length }
  }, [visible])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    visible.forEach((request) => map.set(request.category, (map.get(request.category) ?? 0) + 1))
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [visible])

  const exportRequests = () => {
    exportCsv(
      'hr-employee-requests.csv',
      [
        { header: 'Employee', value: (row: HREmployeeRequest) => row.employeeName },
        { header: 'Department', value: (row: HREmployeeRequest) => row.department },
        { header: 'Category', value: (row: HREmployeeRequest) => row.category },
        { header: 'Subject', value: (row: HREmployeeRequest) => row.subject },
        { header: 'Priority', value: (row: HREmployeeRequest) => row.priority },
        { header: 'Status', value: (row: HREmployeeRequest) => row.status },
        { header: 'Assigned to', value: (row: HREmployeeRequest) => row.assignedTo },
        { header: 'Raised', value: (row: HREmployeeRequest) => row.requestDate },
        { header: 'Resolution', value: (row: HREmployeeRequest) => row.resolutionNote },
      ],
      visible,
    )
  }

  return (
    <HRPageShell
      section="requests"
      title="Employee requests"
      subtitle="HR service requests from employees — certificates, documents, bank updates, payroll queries and access changes — with a clear owner and resolution."
      eyebrow="HR service desk"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportRequests}>
            Export requests
          </Button>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            New request
          </Button>
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>Open</small><strong>{counts.pending + counts.inProgress}</strong></span>
          <span className="hr-inline-meta"><small>Urgent</small><strong>{counts.urgent}</strong></span>
          <span className="hr-inline-meta"><small>Avg resolution</small><strong>{counts.averageHours ? `${counts.averageHours.toFixed(0)}h` : '—'}</strong></span>
        </>
      }
    >
      <HRSummaryGrid>
        <HRSummaryTile label="Pending" value={formatNumber(counts.pending)} hint="Awaiting an owner" icon={<Clock3 size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="In progress" value={formatNumber(counts.inProgress)} hint="Being worked on" icon={<MessageSquareText size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="Urgent" value={formatNumber(counts.urgent)} hint="Open high-priority requests" icon={<ArrowUpRight size={16} />} tone="var(--chart-4)" />
        <HRSummaryTile label="Completed" value={formatNumber(counts.completed)} hint="Resolution recorded" icon={<CheckCircle2 size={16} />} tone="var(--chart-2)" />
        <HRSummaryTile label="Categories" value={formatNumber(byCategory.length)} hint="Request types in use" icon={<Tags size={16} />} tone="var(--chart-6)" />
      </HRSummaryGrid>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="Employee request view"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'requests', label: 'Requests', count: visible.length },
            { id: 'categories', label: 'Categories', count: byCategory.length },
          ]}
        />
      </div>

      {tab === 'requests' ? (
        <>
          <DataTable
            data={requests}
            loading={loading}
            rowKey={(row) => row.id}
            initialSort={{ columnId: 'raised', direction: 'desc' }}
            searchable={(row) => `${row.employeeName} ${row.department} ${row.category} ${row.subject} ${row.description} ${row.assignedTo} ${row.status}`}
            searchPlaceholder="Search employee, category, subject or owner…"
            filters={
              <>
                <HRFilterSelect label="Status" value={status} options={['All statuses', 'Pending', 'In Progress', 'Completed', 'Rejected']} onChange={setStatus} />
                <HRFilterSelect label="Priority" value={priority} options={['All priorities', ...PRIORITIES]} onChange={setPriority} />
                <HRFilterSelect label="Category" value={category} options={['All categories', ...CATEGORIES]} onChange={setCategory} />
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
                  return employee ? <HRAvatar employee={employee} size="sm" /> : null
                },
              },
              {
                id: 'subject',
                header: 'Request',
                sortValue: (row) => row.subject,
                render: (row) => (
                  <span className="hr-table-text">
                    <strong>{row.subject}</strong>
                    <small className="hr-table-subtext">{row.employeeName} · {row.category}</small>
                  </span>
                ),
              },
              {
                id: 'priority',
                header: 'Priority',
                sortValue: (row) => PRIORITIES.indexOf(row.priority),
                mobileLabel: 'Priority',
                render: (row) => (
                  <Badge tone={row.priority === 'Urgent' ? 'danger' : row.priority === 'High' ? 'warning' : row.priority === 'Normal' ? 'info' : 'neutral'}>
                    {row.priority}
                  </Badge>
                ),
              },
              {
                id: 'assigned',
                header: 'Owner',
                mobileLabel: 'Assigned to',
                render: (row) => <span className="hr-table-text">{row.assignedTo}</span>,
              },
              {
                id: 'raised',
                header: 'Raised',
                sortValue: (row) => row.requestDate,
                mobileLabel: 'Raised',
                render: (row) => <span className="hr-table-text">{formatDateLong(row.requestDate)}<small className="hr-table-subtext">{relativeTime(`${row.requestDate}T09:00:00`)}</small></span>,
              },
              { id: 'status', header: 'Status', sortValue: (row) => row.status, render: (row) => <HRStatusBadge status={row.status} /> },
              {
                id: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); setSelected(row) }}>
                    {permissions.canAssignRequests ? 'Manage' : 'View'}
                  </Button>
                ),
              },
            ]}
            emptyTitle="No employee requests match this view"
            emptyDescription="Change the status, priority or category filter, or raise a new request."
            footerNote={
              <span>
                {permissions.isSelfService
                  ? 'You can see your own requests. HR owns assignment and resolution.'
                  : 'Requests are visible to HR. Resolution notes are shared with the employee and kept in the audit trail.'}
              </span>
            }
          />
          <HRInfoNote>
            Employees can request certificates, document updates and payroll clarifications. Sensitive salary details are only
            shared with the employee and HR administrators.
          </HRInfoNote>
        </>
      ) : null}

      {tab === 'categories' ? (
        <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
          <SectionCard title="Request categories" subtitle="Where employee questions are concentrated">
            <div className="hr-legend-stack">
              {byCategory.map((item, index) => (
                <div className="hr-legend-row" key={item.name}>
                  <span className="hr-legend-row__dot" style={{ background: `var(--chart-${(index % 6) + 1})` }} />
                  <span className="hr-legend-row__name">{item.name}</span>
                  <span className="hr-legend-row__value">{item.value}</span>
                  <span className="hr-legend-row__bar">
                    <span style={{ width: `${(item.value / Math.max(1, byCategory[0]?.value ?? 1)) * 100}%`, background: `var(--chart-${(index % 6) + 1})` }} />
                  </span>
                </div>
              ))}
              {!byCategory.length ? <p className="empty-inline">No requests have been raised yet.</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Service commitments" subtitle="How this demo routes requests">
            <div className="hr-simple-list">
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><UserRoundCheck size={14} /></span>
                <span className="grow"><strong>HR assigns an owner</strong><small>Every request gets a named owner from the HR team</small></span>
              </div>
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><Clock3 size={14} /></span>
                <span className="grow"><strong>Urgent requests are prioritised</strong><small>Payroll and access issues are reviewed first</small></span>
              </div>
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><ShieldCheck size={14} /></span>
                <span className="grow"><strong>Resolution is recorded</strong><small>The employee sees the outcome and the audit trail is retained</small></span>
              </div>
              <div className="hr-simple-row">
                <span className="hr-simple-row__icon"><BadgeCheck size={14} /></span>
                <span className="grow"><strong>Documents come from the employee master</strong><small>Certificates use the same verified employee record</small></span>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {!permissions.canAssignRequests ? (
        <HRPermissionNote roleId={profile.id}>
          You can raise and follow your own requests in this preview role. Assigning owners and recording resolutions requires
          the Senior or Marketing Manager preview role.
        </HRPermissionNote>
      ) : null}

      <HRDemoFooter>
        Employee requests are stored locally and do not send email or notifications to a real HR service.
      </HRDemoFooter>

      <NewRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        employeeId={me?.employeeId ?? ''}
        employeeName={me?.name ?? profile.name}
        onSubmit={(draft) => { hr.addEmployeeRequest(draft); setCreateOpen(false) }}
      />

      <RequestDetailModal
        request={selected}
        canManage={permissions.canAssignRequests}
        owners={['Nisha Verma', 'Karan Singh', 'Priya Sharma', ...hr.employees.filter((employee) => employee.department === 'Human Resources').map((employee) => employee.name)]}
        onClose={() => setSelected(null)}
      />
    </HRPageShell>
  )
}

function NewRequestModal({
  open,
  onClose,
  employeeId,
  employeeName,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  employeeId: string
  employeeName: string
  onSubmit: (draft: HREmployeeRequestDraft) => void
}) {
  const [draft, setDraft] = useState<HREmployeeRequestDraft>({
    employeeId,
    category: CATEGORIES[0],
    subject: '',
    description: '',
    priority: 'Normal',
  })
  const [error, setError] = useState('')

  const update = <Key extends keyof HREmployeeRequestDraft>(key: Key, value: HREmployeeRequestDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = () => {
    if (!employeeId) return setError('No employee record is linked to this preview role.')
    if (!draft.subject.trim()) return setError('Enter a short subject for the request.')
    if (!draft.description.trim()) return setError('Describe what you need so HR can help.')
    onSubmit({ ...draft, employeeId, subject: draft.subject.trim(), description: draft.description.trim() })
    setError('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise an HR request"
      description={`${employeeName} · HR will assign an owner and share the resolution.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Send size={14} />} onClick={submit}>Submit request</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="hr-req-category">Category</label>
          <select id="hr-req-category" className="select" value={draft.category} onChange={(event) => update('category', event.target.value)}>
            {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hr-req-priority">Priority</label>
          <select id="hr-req-priority" className="select" value={draft.priority} onChange={(event) => update('priority', event.target.value as HREmployeeRequest['priority'])}>
            {PRIORITIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="hr-req-subject">Subject</label>
          <input id="hr-req-subject" className="input" value={draft.subject} onChange={(event) => update('subject', event.target.value)} placeholder="e.g. Employment certificate for a home loan" />
        </div>
        <div className="field full">
          <label htmlFor="hr-req-description">What do you need?</label>
          <textarea id="hr-req-description" className="textarea" value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="Add the context HR needs to resolve this request." />
        </div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
      <HRInfoNote>Requests are stored in this browser only. No email or notification is sent in the demo.</HRInfoNote>
    </Modal>
  )
}

function RequestDetailModal({
  request,
  canManage,
  owners,
  onClose,
}: {
  request: HREmployeeRequest | null
  canManage: boolean
  owners: string[]
  onClose: () => void
}) {
  const hr = useHRData()
  const [status, setStatus] = useState<HREmployeeRequest['status']>(request?.status ?? 'Pending')
  const [owner, setOwner] = useState(request?.assignedTo ?? owners[0] ?? 'Nisha Verma')
  const [note, setNote] = useState(request?.resolutionNote ?? '')

  const updateRequest = (next: HREmployeeRequest | null) => {
    if (!next) return
    setStatus(next.status)
    setOwner(next.assignedTo)
    setNote(next.resolutionNote)
  }

  const save = () => {
    if (!request) return
    hr.updateEmployeeRequest(request.id, { status, assignedTo: owner, resolutionNote: note })
    onClose()
  }

  return (
    <Modal
      open={Boolean(request)}
      onClose={() => { updateRequest(null); onClose() }}
      title={request?.subject ?? 'Employee request'}
      description={request ? `${request.employeeName} · ${request.category} · raised ${formatDateLong(request.requestDate)}` : undefined}
      size="wide"
      footer={
        canManage ? (
          <>
            <Button variant="ghost" onClick={() => { updateRequest(null); onClose() }}>Cancel</Button>
            <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={save}>Save update</Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => { updateRequest(null); onClose() }}>Close</Button>
        )
      }
    >
      {request ? (
        <div className="hr-request-detail">
          <div className="hr-request-detail__head">
            <span className="hr-request-detail__icon"><ClipboardSignature size={18} /></span>
            <span className="grow">
              <strong>{request.subject}</strong>
              <small>{request.department} · {request.employeeName}</small>
            </span>
            <Badge tone={request.priority === 'Urgent' ? 'danger' : request.priority === 'High' ? 'warning' : request.priority === 'Normal' ? 'info' : 'neutral'}>
              {request.priority}
            </Badge>
            <HRStatusBadge status={request.status} />
          </div>

          <p className="hr-request-detail__description">{request.description}</p>

          <div className="hr-detail-modal__grid">
            <span><small>Category</small><strong>{request.category}</strong></span>
            <span><small>Assigned to</small><strong>{request.assignedTo}</strong></span>
            <span><small>Raised</small><strong>{formatDateLong(request.requestDate)}</strong></span>
            <span><small>Resolved</small><strong>{request.resolvedAt ? formatDateTime(request.resolvedAt) : 'Not yet'}</strong></span>
          </div>

          {canManage ? (
            <div className="hr-request-detail__form">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="hr-req-status">Status</label>
                  <select
                    id="hr-req-status"
                    className="select"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as HREmployeeRequest['status'])}
                  >
                    {['Pending', 'In Progress', 'Completed', 'Rejected'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="hr-req-owner">Owner</label>
                  <select id="hr-req-owner" className="select" value={owner} onChange={(event) => setOwner(event.target.value)}>
                    {Array.from(new Set(owners)).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="hr-req-note">Resolution note</label>
                  <textarea
                    id="hr-req-note"
                    className="textarea"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Share the outcome with the employee and keep the audit trail clear."
                  />
                </div>
              </div>
              <HRInfoNote>
                Completing the request records a resolution time. Salary and bank details are only shared with the employee and
                HR administrators.
              </HRInfoNote>
            </div>
          ) : (
            <HRInfoNote>
              {request.resolutionNote
                ? `HR update: ${request.resolutionNote}`
                : 'HR has not recorded a resolution yet. You can follow progress from this request.'}
            </HRInfoNote>
          )}
        </div>
      ) : null}
    </Modal>
  )
}
