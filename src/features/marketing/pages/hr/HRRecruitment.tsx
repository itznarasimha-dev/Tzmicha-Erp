import { useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  Plus,
  Star,
  UserPlus,
  Users,
  Video,
} from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import { SectionCard } from '../../components/ui/SectionCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ChartCard, Funnel, useChartAnimation } from '../../components/charts/ChartKit'
import { useHRData } from '../../context/HRContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { hrPermissionSummary } from '../../config/hrNavigation'
import { FilterTabs, useCsvExport } from '../workspace/workspaceShared'
import { HR_TODAY } from '../../data/hr'
import {
  formatDateLong,
  recruitmentFunnel,
} from '../../utils/hr'
import { formatNumber } from '../../utils/format'
import type { HRCandidate, HRCandidateDraft, HRCandidateStage, HRInterview, HRJobDraft, HRJobOpening } from '../../types/hr'
import {
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

type TabId = 'pipeline' | 'jobs' | 'interviews'

const STAGES: HRCandidateStage[] = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired']
const nextStage: Partial<Record<HRCandidateStage, HRCandidateStage>> = {
  Applied: 'Screening',
  Screening: 'Interview',
  Interview: 'Offer',
  Offer: 'Hired',
}

export function HRRecruitment() {
  const hr = useHRData()
  const { profile } = useDemoRole()
  const permissions = hrPermissionSummary(profile.id)
  const exportCsv = useCsvExport()
  const animate = useChartAnimation()
  const loading = useInitialLoading()

  const [tab, setTab] = useState<TabId>('pipeline')
  const [jobOpen, setJobOpen] = useState(false)
  const [candidateOpen, setCandidateOpen] = useState(false)
  const [interviewOpen, setInterviewOpen] = useState(false)
  const [jobStatus, setJobStatus] = useState('All statuses')
  const [interviewStatus, setInterviewStatus] = useState('All statuses')
  const [selectedJob, setSelectedJob] = useState<HRJobOpening | null>(null)

  const funnel = useMemo(() => recruitmentFunnel(hr), [hr])
  const openJobs = hr.jobOpenings.filter((job) => job.status === 'Open')
  const openPositions = openJobs.reduce((sum, job) => sum + job.vacancies, 0)
  const scheduledInterviews = hr.interviews.filter((interview) => interview.status === 'Scheduled')
  const offers = hr.candidates.filter((candidate) => candidate.stage === 'Offer')
  const hired = hr.candidates.filter((candidate) => candidate.stage === 'Hired')

  const filteredJobs = jobStatus === 'All statuses' ? hr.jobOpenings : hr.jobOpenings.filter((job) => job.status === jobStatus)
  const filteredInterviews = interviewStatus === 'All statuses' ? hr.interviews : hr.interviews.filter((interview) => interview.status === interviewStatus)

  const exportPipeline = () => {
    exportCsv(
      'hr-recruitment-pipeline.csv',
      [
        { header: 'Candidate', value: (row: HRCandidate) => row.name },
        { header: 'Email', value: (row: HRCandidate) => row.email },
        { header: 'Position', value: (row: HRCandidate) => row.position },
        { header: 'Stage', value: (row: HRCandidate) => row.stage },
        { header: 'Source', value: (row: HRCandidate) => row.source },
        { header: 'Experience', value: (row: HRCandidate) => row.experience },
        { header: 'Applied', value: (row: HRCandidate) => row.appliedDate },
        { header: 'Rating', value: (row: HRCandidate) => (row.rating ? String(row.rating) : '') },
      ],
      hr.candidates,
    )
  }

  return (
    <HRPageShell
      section="recruitment"
      title="Recruitment"
      subtitle="A single hiring pipeline from application through offer and hire. Hiring a candidate creates the onboarding checklist automatically."
      eyebrow="Talent acquisition"
      actions={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={exportPipeline}>
            Export pipeline
          </Button>
          {permissions.canManageRecruitment ? (
            <>
              <Button variant="soft" icon={<BriefcaseBusiness size={14} />} onClick={() => setJobOpen(true)}>
                Post a job
              </Button>
              <Button variant="primary" icon={<UserPlus size={14} />} onClick={() => setCandidateOpen(true)}>
                Add candidate
              </Button>
            </>
          ) : null}
        </>
      }
      meta={
        <>
          <span className="hr-inline-meta"><small>Open positions</small><strong>{openPositions}</strong></span>
          <span className="hr-inline-meta"><small>Interviews scheduled</small><strong>{scheduledInterviews.length}</strong></span>
          <span className="hr-inline-meta"><small>Offers out</small><strong>{offers.length}</strong></span>
        </>
      }
    >
      <HRSummaryGrid>
        <HRSummaryTile label="Open positions" value={formatNumber(openPositions)} hint={`${openJobs.length} requisitions`} icon={<BriefcaseBusiness size={16} />} tone="var(--chart-1)" />
        <HRSummaryTile label="Candidates" value={formatNumber(hr.candidates.length)} hint="Across all stages" icon={<Users size={16} />} tone="var(--chart-5)" />
        <HRSummaryTile label="Interviews" value={formatNumber(scheduledInterviews.length)} hint="Scheduled" icon={<Video size={16} />} tone="var(--chart-6)" />
        <HRSummaryTile label="Offers" value={formatNumber(offers.length)} hint="Awaiting acceptance" icon={<ClipboardList size={16} />} tone="var(--chart-3)" />
        <HRSummaryTile label="Hired" value={formatNumber(hired.length)} hint="Onboarding created" icon={<CheckCircle2 size={16} />} tone="var(--chart-2)" />
      </HRSummaryGrid>

      <div className="hr-tab-row">
        <FilterTabs
          ariaLabel="Recruitment view"
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          options={[
            { id: 'pipeline', label: 'Pipeline', count: hr.candidates.length },
            { id: 'jobs', label: 'Job openings', count: hr.jobOpenings.length },
            { id: 'interviews', label: 'Interviews', count: hr.interviews.length },
          ]}
        />
      </div>

      {tab === 'pipeline' ? (
        <>
          <div className="hr-dashboard-grid hr-dashboard-grid--2-1">
            <SectionCard title="Hiring pipeline" subtitle="Move candidates forward as each stage is completed">
              <div className="hr-kanban">
                {STAGES.map((stage) => {
                  const candidates = hr.candidates.filter((candidate) => candidate.stage === stage)
                  return (
                    <div className="hr-kanban__column" key={stage}>
                      <div className="hr-kanban__head">
                        <strong>{stage}</strong>
                        <Badge tone={stage === 'Hired' ? 'success' : stage === 'Offer' ? 'accent' : 'neutral'}>{candidates.length}</Badge>
                      </div>
                      <div className="hr-kanban__body">
                        {candidates.map((candidate) => (
                          <CandidateCard
                            key={candidate.id}
                            candidate={candidate}
                            canManage={permissions.canManageRecruitment}
                            onNext={() => {
                              const next = nextStage[candidate.stage]
                              if (next) hr.moveCandidateStage(candidate.id, next)
                            }}
                            onHire={() => hr.hireCandidate(candidate.id)}
                            onReject={() => hr.moveCandidateStage(candidate.id, 'Rejected')}
                            onSchedule={() => setInterviewOpen(true)}
                          />
                        ))}
                        {!candidates.length ? <p className="empty-inline">No candidates at this stage.</p> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>

            <div className="hr-stack">
              <ChartCard title="Conversion funnel" subtitle="Applied → hired" height="sm">
                <Funnel stages={funnel.map((stage) => ({ ...stage, display: String(stage.value) }))} compact />
              </ChartCard>
              <SectionCard title="Hiring summary" subtitle="Stage conversion">
                <div className="hr-funnel-legend">
                  {funnel.map((stage, index) => (
                    <span key={stage.label} className="hr-funnel-legend__item">
                      <span style={{ background: stage.color }} />
                      <small>{stage.label}</small>
                      <strong>{stage.value}</strong>
                      {index < funnel.length - 1 ? (
                        <em>{funnel[index + 1].value ? Math.round((funnel[index + 1].value / Math.max(1, stage.value)) * 100) : 0}%</em>
                      ) : null}
                    </span>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>

          {!hr.candidates.length ? <HRInfoNote>No candidates yet. Add a candidate to start the hiring pipeline.</HRInfoNote> : null}
        </>
      ) : null}

      {tab === 'jobs' ? (
        <DataTable
          data={filteredJobs}
          loading={loading}
          rowKey={(row) => row.id}
          searchable={(row) => `${row.jobTitle} ${row.department} ${row.hiringManager} ${row.location} ${row.status}`}
          searchPlaceholder="Search job title, department or hiring manager…"
          filters={
            <HRFilterSelect label="Status" value={jobStatus} options={['All statuses', 'Open', 'Closed', 'On Hold']} onChange={setJobStatus} />
          }
          onRowClick={setSelectedJob}
          columns={[
            {
              id: 'job',
              header: 'Job opening',
              sortValue: (row) => row.jobTitle,
              render: (row) => (
                <span className="hr-table-text">
                  <strong>{row.jobTitle}</strong>
                  <small className="hr-table-subtext">{row.department} · {row.location}</small>
                </span>
              ),
            },
            {
              id: 'vacancies',
              header: 'Vacancies',
              align: 'right',
              sortValue: (row) => row.vacancies,
              render: (row) => <span>{row.vacancies}</span>,
            },
            {
              id: 'type',
              header: 'Type',
              mobileLabel: 'Employment type',
              render: (row) => <Badge tone="neutral" dot={false}>{row.employmentType}</Badge>,
            },
            {
              id: 'manager',
              header: 'Hiring manager',
              mobileLabel: 'Hiring manager',
              render: (row) => <span className="hr-table-text">{row.hiringManager}</span>,
            },
            {
              id: 'closing',
              header: 'Closes',
              sortValue: (row) => row.closingDate,
              mobileLabel: 'Closing date',
              render: (row) => <span className="hr-table-text">{formatDateLong(row.closingDate)}</span>,
            },
            { id: 'status', header: 'Status', render: (row) => <HRStatusBadge status={row.status} /> },
            {
              id: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) =>
                permissions.canManageRecruitment ? (
                  <div className="hr-row-actions">
                    {row.status !== 'Open' ? (
                      <Button variant="soft" size="xs" onClick={(event) => { event.stopPropagation(); hr.updateJobStatus(row.id, 'Open') }}>Reopen</Button>
                    ) : (
                      <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); hr.updateJobStatus(row.id, 'Closed') }}>Close</Button>
                    )}
                    <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); hr.updateJobStatus(row.id, 'On Hold') }}>Hold</Button>
                  </div>
                ) : (
                  <span className="faint">View only</span>
                ),
            },
          ]}
          emptyTitle="No job openings in this view"
          emptyDescription="Change the status filter or post a new requisition."
          footerNote={<span>Open positions are the sum of vacancies on all open requisitions.</span>}
        />
      ) : null}

      {tab === 'interviews' ? (
        <>
          <DataTable
            data={filteredInterviews}
            rowKey={(row) => row.id}
            searchable={(row) => `${row.candidateName} ${row.position} ${row.interviewer} ${row.mode} ${row.status}`}
            searchPlaceholder="Search candidate, role or interviewer…"
            filters={
              <HRFilterSelect label="Status" value={interviewStatus} options={['All statuses', 'Scheduled', 'Completed', 'Cancelled']} onChange={setInterviewStatus} />
            }
            columns={[
              {
                id: 'candidate',
                header: 'Candidate',
                sortValue: (row) => row.candidateName,
                render: (row) => (
                  <span className="hr-table-text">
                    <strong>{row.candidateName}</strong>
                    <small className="hr-table-subtext">{row.position}</small>
                  </span>
                ),
              },
              {
                id: 'when',
                header: 'When',
                sortValue: (row) => `${row.interviewDate} ${row.interviewTime}`,
                mobileLabel: 'When',
                render: (row) => (
                  <span className="hr-table-text">
                    {formatDateLong(row.interviewDate)}
                    <small className="hr-table-subtext">{row.interviewTime}</small>
                  </span>
                ),
              },
              { id: 'mode', header: 'Mode', render: (row) => <Badge tone="neutral" dot={false}>{row.mode}</Badge> },
              { id: 'interviewer', header: 'Interviewer', mobileLabel: 'Interviewer', render: (row) => <span className="hr-table-text">{row.interviewer}</span> },
              { id: 'status', header: 'Status', render: (row) => <HRStatusBadge status={row.status} /> },
              {
                id: 'actions',
                header: 'Outcome',
                align: 'right',
                render: (row) =>
                  permissions.canManageRecruitment && row.status === 'Scheduled' ? (
                    <div className="hr-row-actions">
                      <Button variant="soft" size="xs" onClick={() => hr.updateInterview(row.id, { status: 'Completed' })}>Complete</Button>
                      <Button variant="ghost" size="xs" onClick={() => hr.updateInterview(row.id, { status: 'Cancelled' })}>Cancel</Button>
                    </div>
                  ) : (
                    <span className="faint">{row.feedback || '—'}</span>
                  ),
              },
            ]}
            emptyTitle="No interviews in this view"
            emptyDescription="Schedule an interview from the pipeline or change the status filter."
            toolbarActions={
              permissions.canManageRecruitment ? (
                <Button variant="primary" size="sm" icon={<CalendarClock size={14} />} onClick={() => setInterviewOpen(true)}>
                  Schedule interview
                </Button>
              ) : null
            }
          />
          <HRInfoNote>Completing an interview records the outcome. Hiring a candidate creates the onboarding checklist and notifies the department.</HRInfoNote>
        </>
      ) : null}

      {!permissions.canManageRecruitment ? (
        <HRPermissionNote roleId={profile.id}>
          Recruitment is read-only in this preview role. Switch to Senior or Marketing Manager to move candidates, post
          jobs and schedule interviews.
        </HRPermissionNote>
      ) : null}

      <HRDemoFooter>
        Recruitment is a local demo pipeline. Candidate records you add or move are stored in this browser only.
      </HRDemoFooter>

      <JobModal
        open={jobOpen}
        onClose={() => setJobOpen(false)}
        departments={hr.departments.map((department) => department.name)}
        managers={hr.employees.filter((employee) => employee.status !== 'Resigned').map((employee) => employee.name)}
        onSubmit={(draft) => { hr.addJob(draft); setJobOpen(false) }}
      />

      <CandidateModal
        open={candidateOpen}
        onClose={() => setCandidateOpen(false)}
        jobs={hr.jobOpenings.filter((job) => job.status === 'Open')}
        onSubmit={(draft) => { hr.addCandidate(draft); setCandidateOpen(false) }}
      />

      <InterviewModal
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
        candidates={hr.candidates.filter((candidate) => !['Hired', 'Rejected'].includes(candidate.stage))}
        interviewers={hr.employees.map((employee) => employee.name)}
        onSubmit={(draft) => { hr.scheduleInterview(draft); setInterviewOpen(false) }}
      />

      <Modal
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.jobTitle ?? 'Job opening'}
        description={selectedJob ? `${selectedJob.department} · ${selectedJob.location}` : undefined}
        footer={<Button variant="ghost" onClick={() => setSelectedJob(null)}>Close</Button>}
      >
        {selectedJob ? (
          <div className="hr-detail-modal">
            <div className="hr-detail-modal__stats">
              <span><small>Vacancies</small><strong>{selectedJob.vacancies}</strong></span>
              <span><small>Employment</small><strong>{selectedJob.employmentType}</strong></span>
              <span><small>Status</small><strong>{selectedJob.status}</strong></span>
            </div>
            <p>{selectedJob.description}</p>
            <div className="hr-detail-modal__grid">
              <span><small>Hiring manager</small><strong>{selectedJob.hiringManager}</strong></span>
              <span><small>Opened</small><strong>{formatDateLong(selectedJob.openingDate)}</strong></span>
              <span><small>Closing</small><strong>{formatDateLong(selectedJob.closingDate)}</strong></span>
            </div>
            <div className="hr-profile__section">
              <h4>Candidates</h4>
              <div className="hr-doc-list">
                {hr.candidates.filter((candidate) => candidate.jobId === selectedJob.id).map((candidate) => (
                  <div className="hr-doc-row" key={candidate.id}>
                    <Users size={14} />
                    <span className="grow"><strong>{candidate.name}</strong><small>{candidate.position} · {candidate.stage}</small></span>
                    <HRStatusBadge status={candidate.stage} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </HRPageShell>
  )
}

function CandidateCard({
  candidate,
  canManage,
  onNext,
  onHire,
  onReject,
  onSchedule,
}: {
  candidate: HRCandidate
  canManage: boolean
  onNext: () => void
  onHire: () => void
  onReject: () => void
  onSchedule: () => void
}) {
  return (
    <article className="hr-candidate-card">
      <div className="hr-candidate-card__top">
        <span className="hr-candidate-card__avatar">{candidate.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
        <span className="grow" style={{ minWidth: 0 }}>
          <strong>{candidate.name}</strong>
          <small>{candidate.position}</small>
        </span>
        {candidate.rating ? (
          <span className="hr-rating" title={`${candidate.rating} out of 5`}>
            <Star size={11} fill="currentColor" /> {candidate.rating}
          </span>
        ) : null}
      </div>
      <div className="hr-candidate-card__meta">
        <span>{candidate.source}</span>
        <span>{candidate.experience}</span>
        <span>{formatDateLong(candidate.appliedDate)}</span>
      </div>
      {candidate.feedback ? <p className="hr-candidate-card__feedback">{candidate.feedback}</p> : null}
      {canManage ? (
        <div className="hr-candidate-card__actions">
          {candidate.stage === 'Offer' ? (
            <Button variant="primary" size="xs" onClick={onHire}>Mark hired</Button>
          ) : (
            <Button variant="soft" size="xs" onClick={onNext}>Move forward</Button>
          )}
          {candidate.stage === 'Interview' || candidate.stage === 'Screening' ? (
            <Button variant="ghost" size="xs" icon={<CalendarClock size={12} />} onClick={onSchedule}>Interview</Button>
          ) : null}
          <Button variant="ghost" size="xs" onClick={onReject}>Reject</Button>
        </div>
      ) : null}
    </article>
  )
}

function JobModal({
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
  onSubmit: (draft: HRJobDraft) => void
}) {
  const [draft, setDraft] = useState<HRJobDraft>({
    jobTitle: '',
    department: departments[0] ?? 'Marketing',
    designation: '',
    vacancies: 1,
    employmentType: 'Full Time',
    hiringManager: managers[0] ?? 'Meera Iyer',
    openingDate: HR_TODAY,
    closingDate: HR_TODAY,
    location: 'Bengaluru, India',
    description: '',
  })
  const [error, setError] = useState('')
  const update = <Key extends keyof HRJobDraft>(key: Key, value: HRJobDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = () => {
    if (!draft.jobTitle.trim()) return setError('Enter a job title.')
    if (draft.closingDate < draft.openingDate) return setError('Closing date cannot be earlier than the opening date.')
    onSubmit({ ...draft, jobTitle: draft.jobTitle.trim(), designation: draft.designation.trim() || draft.jobTitle.trim() })
    setError('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Post a job opening" description="Create a requisition and start collecting candidates." size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Publish opening</Button></>}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="hr-job-title">Job title</label><input id="hr-job-title" className="input" value={draft.jobTitle} onChange={(event) => update('jobTitle', event.target.value)} placeholder="e.g. Performance Marketing Specialist" /></div>
        <div className="field"><label htmlFor="hr-job-dept">Department</label><select id="hr-job-dept" className="select" value={draft.department} onChange={(event) => update('department', event.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="hr-job-designation">Designation</label><input id="hr-job-designation" className="input" value={draft.designation} onChange={(event) => update('designation', event.target.value)} /></div>
        <div className="field"><label htmlFor="hr-job-vacancies">Vacancies</label><input id="hr-job-vacancies" className="input" type="number" min={1} value={draft.vacancies} onChange={(event) => update('vacancies', Number(event.target.value))} /></div>
        <div className="field"><label htmlFor="hr-job-type">Employment type</label><select id="hr-job-type" className="select" value={draft.employmentType} onChange={(event) => update('employmentType', event.target.value as HRJobDraft['employmentType'])}>{['Full Time', 'Part Time', 'Contract', 'Intern'].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="hr-job-manager">Hiring manager</label><select id="hr-job-manager" className="select" value={draft.hiringManager} onChange={(event) => update('hiringManager', event.target.value)}>{managers.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="hr-job-location">Location</label><input id="hr-job-location" className="input" value={draft.location} onChange={(event) => update('location', event.target.value)} /></div>
        <div className="field"><label htmlFor="hr-job-open">Opening date</label><input id="hr-job-open" className="input" type="date" value={draft.openingDate} onChange={(event) => update('openingDate', event.target.value)} /></div>
        <div className="field"><label htmlFor="hr-job-close">Closing date</label><input id="hr-job-close" className="input" type="date" value={draft.closingDate} onChange={(event) => update('closingDate', event.target.value)} /></div>
        <div className="field full"><label htmlFor="hr-job-description">Role summary</label><textarea id="hr-job-description" className="textarea" value={draft.description} onChange={(event) => update('description', event.target.value)} /></div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </Modal>
  )
}

function CandidateModal({
  open,
  onClose,
  jobs,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  jobs: HRJobOpening[]
  onSubmit: (draft: HRCandidateDraft) => void
}) {
  const [draft, setDraft] = useState<HRCandidateDraft>({
    name: '',
    email: '',
    phone: '',
    position: jobs[0]?.jobTitle ?? '',
    jobId: jobs[0]?.id ?? '',
    source: 'LinkedIn',
    experience: '2 years',
    resumeName: 'candidate-resume.pdf',
  })
  const [error, setError] = useState('')
  const update = <Key extends keyof HRCandidateDraft>(key: Key, value: HRCandidateDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = () => {
    if (!draft.name.trim()) return setError('Enter the candidate name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) return setError('Enter a valid email address.')
    onSubmit({ ...draft, name: draft.name.trim(), email: draft.email.trim() })
    setError('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Add candidate" description="Candidates enter the Applied stage and can be moved through the pipeline."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add candidate</Button></>}>
      <div className="form-grid">
        <div className="field"><label htmlFor="hr-cand-name">Full name</label><input id="hr-cand-name" className="input" value={draft.name} onChange={(event) => update('name', event.target.value)} /></div>
        <div className="field"><label htmlFor="hr-cand-email">Email</label><input id="hr-cand-email" className="input" type="email" value={draft.email} onChange={(event) => update('email', event.target.value)} /></div>
        <div className="field"><label htmlFor="hr-cand-phone">Phone</label><input id="hr-cand-phone" className="input" value={draft.phone} onChange={(event) => update('phone', event.target.value)} /></div>
        <div className="field"><label htmlFor="hr-cand-job">Applied for</label><select id="hr-cand-job" className="select" value={draft.jobId} onChange={(event) => {
          const job = jobs.find((item) => item.id === event.target.value)
          update('jobId', event.target.value)
          if (job) update('position', job.jobTitle)
        }}>{jobs.map((item) => <option key={item.id} value={item.id}>{item.jobTitle} · {item.department}</option>)}</select></div>
        <div className="field"><label htmlFor="hr-cand-source">Source</label><select id="hr-cand-source" className="select" value={draft.source} onChange={(event) => update('source', event.target.value)}>{['LinkedIn', 'Careers page', 'Employee referral', 'Naukri', 'Agency referral'].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="hr-cand-exp">Experience</label><input id="hr-cand-exp" className="input" value={draft.experience} onChange={(event) => update('experience', event.target.value)} /></div>
        <div className="field full"><label htmlFor="hr-cand-resume">Resume file name</label><input id="hr-cand-resume" className="input" value={draft.resumeName} onChange={(event) => update('resumeName', event.target.value)} /></div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </Modal>
  )
}

function InterviewModal({
  open,
  onClose,
  candidates,
  interviewers,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  candidates: HRCandidate[]
  interviewers: string[]
  onSubmit: (draft: { candidateId: string; interviewDate: string; interviewTime: string; interviewer: string; mode: HRInterview['mode'] }) => void
}) {
  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? '')
  const [date, setDate] = useState(HR_TODAY)
  const [time, setTime] = useState('10:00')
  const [interviewer, setInterviewer] = useState(interviewers[0] ?? 'Meera Iyer')
  const [mode, setMode] = useState<HRInterview['mode']>('Video')
  const [error, setError] = useState('')

  const submit = () => {
    if (!candidateId) return setError('Choose a candidate for the interview.')
    onSubmit({ candidateId, interviewDate: date, interviewTime: time, interviewer, mode })
    setError('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule interview" description="Set the interview slot and interviewer. The candidate moves to screening if still applied."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Schedule interview</Button></>}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="hr-int-candidate">Candidate</label><select id="hr-int-candidate" className="select" value={candidateId} onChange={(event) => setCandidateId(event.target.value)}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.position}</option>)}</select></div>
        <div className="field"><label htmlFor="hr-int-date">Date</label><input id="hr-int-date" className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
        <div className="field"><label htmlFor="hr-int-time">Time</label><input id="hr-int-time" className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div>
        <div className="field"><label htmlFor="hr-int-interviewer">Interviewer</label><select id="hr-int-interviewer" className="select" value={interviewer} onChange={(event) => setInterviewer(event.target.value)}>{interviewers.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="hr-int-mode">Mode</label><select id="hr-int-mode" className="select" value={mode} onChange={(event) => setMode(event.target.value as HRInterview['mode'])}>{['Video', 'In person', 'Phone'].map((item) => <option key={item}>{item}</option>)}</select></div>
      </div>
      {error ? <p className="field-error mt-12" role="alert">{error}</p> : null}
    </Modal>
  )
}
