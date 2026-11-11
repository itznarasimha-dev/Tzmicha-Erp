import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  GraduationCap,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useHRData } from '../../context/HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { hrPermissionSummary } from '../../config/hrNavigation'
import { FilterTabs, useCsvExport } from '../workspace/workspaceShared'
import { formatDateLong } from '../../utils/hr'
import { formatNumber } from '../../utils/format'
import type { HRDocument, HROnboarding as HROnboardingRecord } from '../../types/hr'
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

type TabId = 'joiners' | 'documents' | 'journey'

const journeySteps = [
  { id: 'offer', label: 'Offer accepted', detail: 'Signed offer letter and compensation approved' },
  { id: 'docs', label: 'Documents verified', detail: 'Identity, education and previous employment checks' },
  { id: 'setup', label: 'ERP and payroll setup', detail: 'Access, reporting line and bank details configured' },
  { id: 'dayone', label: 'Day-one induction', detail: 'Team introduction, buddy and first-week plan' },
  { id: 'confirm', label: 'Probation check-in', detail: '30 and 90 day confirmation with the reporting manager' },
]

export function HROnboarding() {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const exportCsv = useCsvExport()
  const loading = useInitialLoading()

  const [tab, setTab] = useState<TabId>('joiners')
  const [status, setStatus] = useState('All statuses')
  const [department, setDepartment] = useState('All departments')
  const [query, setQuery] = useState('')
  const [docStatus, setDocStatus] = useState('All statuses')

  const departments = useMemo(
    () => ['All departments', ...Array.from(new Set(hr.onboarding.map((record) => record.department))).sort()],
    [hr.onboarding],
  )

  const records = useMemo(
    () =>
      hr.onboarding
        .filter((record) => status === 'All statuses' || record.status === status)
        .filter((record) => department === 'All departments' || record.department === department)
        .filter((record) =>
          query.trim()
            ? `${record.name} ${record.position} ${record.department} ${record.buddy}`
                .toLowerCase()
                .includes(query.trim().toLowerCase())
            : true,
        )
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [hr.onboarding, status, department, query],
  )

  const counts = useMemo(() => {
    const pendingDocs = hr.documents.filter((document) => document.status === 'Pending')
    const checklistItems = hr.onboarding.flatMap((record) => record.checklist)
    const doneItems = checklistItems.filter((item) => item.done)
    return {
      total: hr.onboarding.length,
      inProgress: hr.onboarding.filter((record) => record.status === 'In Progress').length,
      completed: hr.onboarding.filter((record) => record.status === 'Completed').length,
      pendingDocs: pendingDocs.length,
      documentTotal: hr.documents.length,
      checklistPercent: checklistItems.length ? (doneItems.length / checklistItems.length) * 100 : 0,
    }
  }, [hr.onboarding, hr.documents])

  const docs = useMemo(
    () => (docStatus === 'All statuses' ? hr.documents : hr.documents.filter((document) => document.status === docStatus)),
    [hr.documents, docStatus],
  )

  const exportOnboarding = () => {
    exportCsv(
      'hr-onboarding-progress.csv',
      [
        { header: 'Employee', value: (row: HROnboardingRecord) => row.name },
        { header: 'Position', value: (row: HROnboardingRecord) => row.position },
        { header: 'Department', value: (row: HROnboardingRecord) => row.department },
        { header: 'Start date', value: (row: HROnboardingRecord) => row.startDate },
        { header: 'Buddy', value: (row: HROnboardingRecord) => row.buddy },
        { header: 'Status', value: (row: HROnboardingRecord) => row.status },
        {
          header: 'Checklist complete',
          value: (row: HROnboardingRecord) =>
            `${row.checklist.filter((item) => item.done).length}/${row.checklist.length}`,
        },
      ],
      hr.onboarding,
    )
  }

  return (
    <HRPageShell
      section="onboarding"
      title="Onboarding"
      subtitle="A single joining checklist across offer acceptance, documents, ERP access, payroll setup and day-one induction."
      eyebrow="Employee lifecycle"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportOnboarding}>
            Export progress
          </Button>
          <Button variant="primary" icon={<FileCheck2 size={14} />} onClick={() => setTab('documents')}>
            Review documents
          </Button>
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>In progress</small><strong>{counts.inProgress}</strong></span>
          <span className="hr-inline-meta"><small>Pending documents</small><strong>{counts.pendingDocs}</strong></span>
          <span className="hr-inline-meta"><small>Checklist done</small><strong>{counts.checklistPercent.toFixed(0)}%</strong></span>
        </>
      }
    >
      <HRSummaryGrid>
        <HRSummaryTile label="New joiners" value={formatNumber(counts.total)} hint="Active onboarding records" icon={<UserPlus size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="In progress" value={formatNumber(counts.inProgress)} hint="Checklist not yet complete" icon={<ClipboardCheck size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="Completed" value={formatNumber(counts.completed)} hint="Ready for the team" icon={<CheckCircle2 size={16} />} tone="var(--chart-2)" />
        <HRSummaryTile label="Documents" value={formatNumber(counts.documentTotal)} hint={`${counts.pendingDocs} awaiting verification`} icon={<FileCheck2 size={16} />} tone="var(--chart-6)" />
        <HRSummaryTile label="Checklist health" value={`${counts.checklistPercent.toFixed(0)}%`} hint="Across all onboarding records" icon={<GraduationCap size={16} />} tone="var(--chart-4)" />
      </HRSummaryGrid>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="Onboarding view"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'joiners', label: 'New joiners', count: hr.onboarding.length },
            { id: 'documents', label: 'Document verification', count: hr.documents.length },
            { id: 'journey', label: 'Journey & hand-offs' },
          ]}
        />
      </div>

      {tab === 'joiners' ? (
        <>
          <div className="hr-day-toolbar">
            <label className="hr-search-field">
              <Search size={14} aria-hidden="true" />
              <input
                className="input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search joiner, role, department or buddy…"
                aria-label="Search onboarding records"
              />
            </label>
            <HRFilterSelect label="Department" value={department} options={departments} onChange={setDepartment} />
            <HRFilterSelect label="Status" value={status} options={['All statuses', 'In Progress', 'Completed']} onChange={setStatus} />
          </div>

          {records.length ? (
            <div className="hr-onboarding-grid">
              {records.map((record) => {
                const done = record.checklist.filter((item) => item.done).length
                const percent = record.checklist.length ? (done / record.checklist.length) * 100 : 0
                const employee = hr.employees.find((item) => item.employeeId === record.employeeId)
                return (
                  <article className="hr-onboarding-card" key={record.id}>
                    <div className="hr-onboarding-card__head">
                      {employee ? (
                        <HRAvatar employee={employee} size="md" />
                      ) : (
                        <span className="hr-onboarding-card__avatar">{record.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                      )}
                      <span className="grow" style={{ minWidth: 0 }}>
                        <strong>{record.name}</strong>
                        <small>{record.position} · {record.department}</small>
                      </span>
                      <HRStatusBadge status={record.status} />
                    </div>

                    <div className="hr-onboarding-card__meta">
                      <span><CalendarDays size={12} /> Starts {formatDateLong(record.startDate)}</span>
                      <span><Users size={12} /> Buddy {record.buddy}</span>
                    </div>

                    <div className="hr-onboarding-card__progress">
                      <div className="between">
                        <span>Checklist progress</span>
                        <strong>{done}/{record.checklist.length}</strong>
                      </div>
                      <HRProgress value={percent} tone={percent === 100 ? 'success' : percent > 55 ? 'brand' : 'warning'} />
                    </div>

                    <div className="hr-checklist">
                      {record.checklist.map((item) => (
                        <label key={item.id} className={`hr-checklist__item ${item.done ? 'is-done' : ''}`.trim()}>
                          <input
                            type="checkbox"
                            checked={item.done}
                            disabled={!permissions.canManageOnboarding || record.status === 'Completed'}
                            onChange={() => hr.toggleOnboardingItem(record.id, item.id)}
                          />
                          <span>{item.label}</span>
                          {item.done ? <BadgeCheck size={13} aria-hidden="true" /> : null}
                        </label>
                      ))}
                    </div>

                    <div className="hr-onboarding-card__foot">
                      {record.completedAt ? (
                        <small>Completed {formatDateLong(record.completedAt)}</small>
                      ) : (
                        <small>{record.checklist.length - done} item{record.checklist.length - done === 1 ? '' : 's'} remaining</small>
                      )}
                      <Button
                        variant={percent === 100 ? 'soft' : 'ghost'}
                        size="xs"
                        disabled={!permissions.canManageOnboarding || record.status === 'Completed'}
                        onClick={() => hr.completeOnboarding(record.id)}
                      >
                        {record.status === 'Completed' ? 'Completed' : 'Mark complete'}
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <HRListEmpty
              title="No onboarding records match this view"
              description="Clear the department or status filter, or hire a candidate from Recruitment to create a checklist automatically."
              action={
                <Button variant="soft" onClick={() => { setStatus('All statuses'); setDepartment('All departments'); setQuery('') }}>
                  Reset filters
                </Button>
              }
            />
          )}
        </>
      ) : null}

      {tab === 'documents' ? (
        <>
          <DataTable
            data={docs}
            loading={loading}
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
                sortValue: (row) => row.employeeName,
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
                sortValue: (row) => row.uploadedAt,
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
                      <Button variant="soft" size="xs" onClick={() => hr.updateDocumentStatus(row.id, 'Verified')}>Verify</Button>
                      <Button variant="ghost" size="xs" onClick={() => hr.updateDocumentStatus(row.id, 'Rejected')}>Reject</Button>
                    </div>
                  ) : (
                    <span className="faint">{row.status === 'Verified' ? 'Verified' : '—'}</span>
                  ),
              },
            ]}
            emptyTitle="No documents in this view"
            emptyDescription="Change the status filter to see pending or verified employee documents."
            footerNote={<span>Verification decisions are saved with the employee record and shown to the onboarding owner.</span>}
          />
          <HRInfoNote>
            Employment documents are visible to the onboarding team. Salary and bank details stay masked for preview roles
            without payroll access.
          </HRInfoNote>
        </>
      ) : null}

      {tab === 'journey' ? (
        <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
          <SectionCard title="Onboarding journey" subtitle="The shared hand-off between HR, the manager and IT">
            <ol className="hr-journey">
              {journeySteps.map((step, index) => {
                const activeRecords = hr.onboarding.filter((record) => record.status === 'In Progress').length
                const completion = index < 2 ? 100 : index === 2 ? (activeRecords ? 55 : 100) : 0
                return (
                  <li className={`hr-journey__step ${completion === 100 ? 'is-done' : completion > 0 ? 'is-current' : ''}`.trim()} key={step.id}>
                    <span className="hr-journey__marker">{index + 1}</span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <strong>{step.label}</strong>
                      <small>{step.detail}</small>
                    </span>
                    <Badge tone={completion === 100 ? 'success' : completion > 0 ? 'warning' : 'neutral'}>
                      {completion === 100 ? 'Done' : completion > 0 ? 'In progress' : 'Upcoming'}
                    </Badge>
                  </li>
                )
              })}
            </ol>
            <HRInfoNote>
              Hiring a candidate from Recruitment creates this checklist automatically, so the same joining record is used by
              HR, the reporting manager and payroll setup.
            </HRInfoNote>
          </SectionCard>

          <SectionCard title="Hand-off checklist" subtitle="What HR still owns">
            <div className="hr-task-list">
              <div className="hr-simple-row">
                <ShieldCheck size={15} />
                <span className="grow"><strong>{counts.pendingDocs} documents awaiting verification</strong><small>Identity, education and previous employment checks</small></span>
                <Button variant="ghost" size="xs" onClick={() => setTab('documents')}>Open</Button>
              </div>
              <div className="hr-simple-row">
                <ClipboardCheck size={15} />
                <span className="grow"><strong>{counts.inProgress} checklists in progress</strong><small>ERP access, payroll setup and induction</small></span>
                <Button variant="ghost" size="xs" onClick={() => setTab('joiners')}>Open</Button>
              </div>
              <div className="hr-simple-row">
                <UserPlus size={15} />
                <span className="grow"><strong>{hr.candidates.filter((candidate) => candidate.stage === 'Hired').length} hired candidates</strong><small>Onboarding record created from recruitment</small></span>
                <Button variant="ghost" size="xs" onClick={() => setTab('joiners')}>View</Button>
              </div>
              <div className="hr-simple-row">
                <CheckCircle2 size={15} />
                <span className="grow"><strong>{counts.completed} completed onboardings</strong><small>Employee marked active in the directory</small></span>
                <Button variant="ghost" size="xs" onClick={() => setTab('joiners')}>View</Button>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {!permissions.canManageOnboarding ? (
        <HRPermissionNote roleId={profile.id}>
          You can follow onboarding progress in this preview role. Updating checklists and verifying documents requires the
          Senior or Marketing Manager preview role.
        </HRPermissionNote>
      ) : null}

      <HRDemoFooter>
        Onboarding uses the same employee, document and recruitment records as the rest of the HR workspace. Changes are
        stored in this browser only.
      </HRDemoFooter>
    </HRPageShell>
  )
}

export type { HRDocument }
