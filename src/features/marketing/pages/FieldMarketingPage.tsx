import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  MapPin,
  Plus,
  Route,
  Search,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDemoData } from '../context/DemoDataContext'
import { useToast } from '../context/ToastContext'
import type { FieldClaim, FieldVisit, MarketResearch, VisitStatus, VisitType } from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { SectionCard } from '../components/ui/SectionCard'
import { Avatar, AvatarWithName } from '../components/ui/Avatar'
import { ProgressBar } from '../components/ui/ProgressBar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  ChartCard,
  ChartTooltip,
  LegendItem,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../components/charts/ChartKit'
import {
  DataNote,
  DemoNote,
  DetailRows,
  EntityCard,
  EntityGrid,
  MetricCard,
  MetricGrid,
  ScoreRow,
  TabIntro,
} from '../components/marketing/ModuleKit'
import { downloadCsv } from '../utils/csv'
import { dateOnlyFromNow, daysFromNow, followUpLabel, isOverdue, isToday } from '../utils/dates'
import { formatDate, formatINR, formatNumber, formatPercent, formatTime, uid } from '../utils/format'

const VISIT_TYPES: VisitType[] = ['Field Visit', 'Store Visit', 'Demo', 'Dealer Visit']
const VISIT_STATUSES: VisitStatus[] = ['Scheduled', 'In Progress', 'Completed', 'Cancelled']
const REGIONS = ['West India', 'South India', 'East India', 'North India', 'Central India', 'Bengaluru Metro', 'Other']

type VisitFormValues = {
  business: string
  contact: string
  purpose: string
  type: VisitType
  date: string
  time: string
  location: string
  assignedTo: string
  notes: string
  demoFollowUp: string
  checklist: string
}

type ResearchFormValues = {
  competitor: string
  region: string
  observation: string
  productFeedback: string
  interest: 'High' | 'Medium' | 'Low'
  pricingObservation: string
}

type ClaimFormValues = {
  purpose: string
  date: string
  amount: string
  receiptName: string
}

export function FieldMarketingPage({ tab }: { tab: string }) {
  const { data, update, addNotification } = useDemoData()
  const { pushToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const chartAnim = useChartAnimation()
  const [visitOpen, setVisitOpen] = useState(false)
  const [visitId, setVisitId] = useState<string | null>(null)
  const [researchOpen, setResearchOpen] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [visitTypeFilter, setVisitTypeFilter] = useState('All')
  const [visitStatusFilter, setVisitStatusFilter] = useState('All')
  const [claimDelete, setClaimDelete] = useState<FieldClaim | null>(null)
  const [visitDelete, setVisitDelete] = useState<FieldVisit | null>(null)

  useEffect(() => {
    if (tab === 'field-visits' && searchParams.get('action') === 'new') {
      setVisitOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, tab])

  const activeVisit = data.fieldVisits.find((visit) => visit.id === visitId) ?? null

  const filteredVisits = useMemo(
    () =>
      data.fieldVisits.filter((visit) => {
        if (visitTypeFilter !== 'All' && visit.type !== visitTypeFilter) return false
        if (visitStatusFilter !== 'All' && visit.status !== visitStatusFilter) return false
        return true
      }),
    [data.fieldVisits, visitTypeFilter, visitStatusFilter],
  )

  const todayVisits = data.fieldVisits.filter((visit) => isToday(visit.date) && visit.status !== 'Cancelled')
  const completed = data.fieldVisits.filter((visit) => visit.status === 'Completed')
  const openClaims = data.fieldClaims.filter((claim) => claim.status === 'Submitted' || claim.status === 'Approved')

  const teamData = [...data.fieldTeams].sort((a, b) => (b.visitsCompleted / Math.max(1, b.target)) - (a.visitsCompleted / Math.max(1, a.target)))

  const setVisitStatus = (visit: FieldVisit, status: VisitStatus) => {
    update('fieldVisits', (current) => current.map((item) => item.id === visit.id ? { ...item, status } : item))
    pushToast({
      title: 'Visit status updated',
      description: `${visit.business} is now ${status} in local demo data. No field app is notified.`,
      tone: 'success',
    })
  }

  const createVisit = (values: VisitFormValues) => {
    const visit: FieldVisit = {
      id: uid('FV'),
      business: values.business.trim(),
      contact: values.contact.trim(),
      leadId: null,
      purpose: values.purpose.trim(),
      type: values.type,
      date: values.date,
      time: values.time || '10:00',
      location: values.location.trim(),
      assignedTo: values.assignedTo,
      notes: values.notes.trim(),
      demoFollowUp: values.demoFollowUp.trim(),
      checklist: values.checklist.split('\n').map((line) => line.trim()).filter(Boolean),
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
    }
    update('fieldVisits', (current) => [visit, ...current])
    addNotification({
      title: 'Field visit scheduled in demo',
      body: `${visit.business} · ${formatDate(visit.date)} at ${formatTime(visit.time)}. No calendar invite was sent.`,
      kind: 'followup',
      href: '/marketing/field/field-visits',
    })
    pushToast({ title: 'Visit scheduled locally', description: `${visit.business} was added to the demo field calendar.`, tone: 'success' })
    setVisitOpen(false)
  }

  const addResearch = (values: ResearchFormValues) => {
    const research: MarketResearch = {
      id: uid('MR'),
      competitor: values.competitor.trim(),
      region: values.region,
      observation: values.observation.trim(),
      productFeedback: values.productFeedback.trim(),
      interest: values.interest,
      pricingObservation: values.pricingObservation.trim(),
      submittedBy: 'Ananya Rao',
      date: dateOnlyFromNow(0),
    }
    update('research', (current) => [research, ...current])
    pushToast({ title: 'Research note saved', description: `${research.competitor} observation added to local demo research.`, tone: 'success' })
    setResearchOpen(false)
  }

  const addClaim = (values: ClaimFormValues) => {
    const claim: FieldClaim = {
      id: uid('FC'),
      ref: `CLM-2026-${String(100 + data.fieldClaims.length).padStart(3, '0')}`,
      employee: 'Ananya Rao',
      purpose: values.purpose.trim(),
      date: values.date,
      amount: Math.round(Number(values.amount) || 0),
      status: 'Draft',
      receiptName: values.receiptName.trim() || undefined,
    }
    update('fieldClaims', (current) => [claim, ...current])
    pushToast({ title: 'Claim draft saved', description: `${claim.ref} is a local demo draft. No reimbursement workflow was started.`, tone: 'success' })
    setClaimOpen(false)
  }

  const updateClaimStatus = (claim: FieldClaim, status: FieldClaim['status']) => {
    update('fieldClaims', (current) => current.map((item) => item.id === claim.id ? { ...item, status } : item))
    pushToast({ title: 'Claim status updated', description: `${claim.ref} marked ${status} locally. No payment was made.`, tone: 'success' })
  }

  const exportVisits = (rows: FieldVisit[], label = 'field-visits') => {
    const result = downloadCsv(`marketing-${label}-demo`, [
      { header: 'Visit ID', value: (visit: FieldVisit) => visit.id },
      { header: 'Business', value: (visit: FieldVisit) => visit.business },
      { header: 'Contact', value: (visit: FieldVisit) => visit.contact },
      { header: 'Type', value: (visit: FieldVisit) => visit.type },
      { header: 'Date', value: (visit: FieldVisit) => visit.date },
      { header: 'Time', value: (visit: FieldVisit) => visit.time },
      { header: 'Location', value: (visit: FieldVisit) => visit.location },
      { header: 'Assigned To', value: (visit: FieldVisit) => visit.assignedTo },
      { header: 'Status', value: (visit: FieldVisit) => visit.status },
      { header: 'Purpose', value: (visit: FieldVisit) => visit.purpose },
      { header: 'Follow-up', value: (visit: FieldVisit) => visit.demoFollowUp },
    ], rows)
    pushToast({ title: result.ok ? 'Visits exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const visitColumns = (rows: FieldVisit[]): DataTableColumn<FieldVisit>[] => [
    {
      id: 'business', header: 'Business', sortValue: (visit) => visit.business, mobileLabel: 'Business',
      render: (visit) => <div><p className="cell-primary">{visit.business}</p><p className="text-xs muted">{visit.contact}</p></div>,
    },
    { id: 'type', header: 'Type', sortValue: (visit) => visit.type, mobileLabel: 'Type', render: (visit) => <Badge tone="neutral">{visit.type}</Badge> },
    { id: 'schedule', header: 'Schedule', sortValue: (visit) => `${visit.date}T${visit.time}`, mobileLabel: 'Schedule', render: (visit) => <div><p className="text-xs">{formatDate(visit.date)}</p><p className="text-xs muted">{formatTime(visit.time)}</p></div> },
    { id: 'location', header: 'Location', sortValue: (visit) => visit.location, mobileLabel: 'Location', hideMobile: true, render: (visit) => <span className="text-xs">{visit.location}</span> },
    { id: 'owner', header: 'Assigned to', sortValue: (visit) => visit.assignedTo, mobileLabel: 'Assigned to', render: (visit) => <AvatarWithName name={visit.assignedTo} sub={visit.type === 'Demo' ? 'Demo owner' : 'Field owner'} /> },
    {
      id: 'status', header: 'Status', sortValue: (visit) => visit.status, mobileLabel: 'Status',
      render: (visit) => (
        <select
          className="select"
          style={{ minHeight: 30, padding: '4px 26px 4px 8px', width: 118, fontSize: '0.7rem' }}
          value={visit.status}
          aria-label={`Status for ${visit.business}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setVisitStatus(visit, event.target.value as VisitStatus)}
        >
          {VISIT_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      ),
    },
    { id: 'actions', header: '', align: 'right', mobileLabel: 'Actions', render: (visit) => <Button variant="ghost" size="xs" onClick={(event) => { event.stopPropagation(); setVisitId(visit.id) }}>Open</Button> },
  ]

  const visitModal = visitOpen ? <VisitModal open onClose={() => setVisitOpen(false)} onSave={createVisit} teams={data.fieldTeams} /> : null
  const singleVisitModal = activeVisit ? <VisitDetailModal visit={activeVisit} onClose={() => setVisitId(null)} onStatusChange={(status) => setVisitStatus(activeVisit, status)} /> : null
  const researchModal = researchOpen ? <ResearchModal open onClose={() => setResearchOpen(false)} onSave={addResearch} /> : null
  const claimModal = claimOpen ? <ClaimModal open onClose={() => setClaimOpen(false)} onSave={addClaim} /> : null

  if (tab === 'overview') {
    const upcoming = [...data.fieldVisits].filter((visit) => visit.status === 'Scheduled' || visit.status === 'In Progress').sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)).slice(0, 5)
    return (
      <div className="stack-20">
        <TabIntro
          title="Field marketing overview"
          description="Coordinate field teams, dealer visits, store demos and market research. Schedules and outcome notes are local demo records."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportVisits(data.fieldVisits)}>Export visits</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setVisitOpen(true)}>Schedule visit</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Visits today" value={todayVisits.length} sub={`${todayVisits.filter((visit) => visit.status === 'Completed').length} completed so far`} icon={<CalendarClock size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Open visits" value={data.fieldVisits.filter((visit) => visit.status === 'Scheduled' || visit.status === 'In Progress').length} sub={`${data.fieldVisits.length} total demo visits`} icon={<Route size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Field claims open" value={openClaims.length} sub={`${formatINR(openClaims.reduce((sum, claim) => sum + claim.amount, 0))} awaiting demo action`} icon={<ClipboardList size={15} />} tone="var(--chart-5)" />
          <MetricCard label="Research notes" value={data.research.length} sub="Competitor and product observations" icon={<Search size={15} />} tone="var(--chart-2)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Field team progress" subtitle="Completed visits against local demo target" height="md" legend={<><LegendItem color="var(--chart-1)" label="Completed" /><LegendItem color="var(--chart-8)" label="Target" /></>} isEmpty={teamData.length === 0}>
            <BarChart data={teamData.map((member) => ({ name: member.name.split(' ')[0], completed: member.visitsCompleted, target: member.target }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} width={34} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} visits`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="target" name="Target" fill="var(--chart-8)" opacity={0.3} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="completed" name="Completed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
          <SectionCard title="Upcoming visits" subtitle="Next scheduled demo field activity." actions={<Button variant="ghost" size="xs" onClick={() => exportVisits(upcoming, 'upcoming-visits')}>Export</Button>}>
            <div className="stack-10">
              {upcoming.length === 0 ? <p className="empty-inline">No scheduled visits.</p> : upcoming.map((visit) => (
                <button key={visit.id} type="button" className="campaign-mini" onClick={() => setVisitId(visit.id)}>
                  <span className="campaign-mini__date"><span className="campaign-mini__day">{formatDate(visit.date).split(' ')[0]}</span><span>{formatDate(visit.date).split(' ')[1]}</span></span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="campaign-mini__name truncate">{visit.business}</span>
                    <span className="campaign-mini__meta">{visit.type} · {formatTime(visit.time)} · {visit.location}</span>
                  </span>
                  <StatusBadge status={visit.status} />
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="dashboard-grid dashboard-grid--equal">
          <SectionCard title="Visits by status" subtitle="Local field workflow states.">
            <div className="stack-12">
              {VISIT_STATUSES.map((status) => {
                const rows = data.fieldVisits.filter((visit) => visit.status === status)
                return (
                  <div key={status}>
                    <div className="between" style={{ marginBottom: 4 }}>
                      <span className="text-xs">{status}</span>
                      <span className="text-xs muted">{rows.length} / {data.fieldVisits.length}</span>
                    </div>
                    <ProgressBar value={(rows.length / Math.max(1, data.fieldVisits.length)) * 100} size="sm" tone={status === 'Completed' ? 'success' : status === 'Cancelled' ? 'danger' : status === 'In Progress' ? 'warning' : 'brand'} />
                  </div>
                )
              })}
            </div>
            <DataNote>No calendar, GPS or mobile field app is connected.</DataNote>
          </SectionCard>
          <SectionCard title="Team snapshot" subtitle="Demo visit completion by field member.">
            <div className="stack-12">
              {teamData.slice(0, 5).map((member) => {
                const progress = (member.visitsCompleted / Math.max(1, member.target)) * 100
                return (
                  <div key={member.id} className="between" style={{ gap: 10 }}>
                    <AvatarWithName name={member.name} sub={`${member.region} · ${member.visitsToday} today`} />
                    <div style={{ width: 120 }}>
                      <ProgressBar value={progress} size="sm" tone={progress >= 85 ? 'success' : progress >= 60 ? 'warning' : 'brand'} />
                      <p className="text-xs muted" style={{ textAlign: 'right', marginTop: 2 }}>{formatPercent(progress, 0)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>

        <DemoNote>
          Field schedules, visit outcomes, claims and research are demo records only. Creating a visit does not send invites, assign routes or notify anyone.
        </DemoNote>
        {visitModal}
        {singleVisitModal}
      </div>
    )
  }

  if (tab === 'field-teams') {
    return (
      <div className="stack-16">
        <TabIntro title="Field teams" description="Regional team capacity and sample completion rates. This is not live attendance or GPS tracking." actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => {
          const result = downloadCsv('field-teams-demo', [
            { header: 'Name', value: (member: typeof data.fieldTeams[number]) => member.name },
            { header: 'Region', value: (member: typeof data.fieldTeams[number]) => member.region },
            { header: 'Visits today', value: (member: typeof data.fieldTeams[number]) => member.visitsToday },
            { header: 'Visits completed', value: (member: typeof data.fieldTeams[number]) => member.visitsCompleted },
            { header: 'Leads', value: (member: typeof data.fieldTeams[number]) => member.leads },
            { header: 'Target', value: (member: typeof data.fieldTeams[number]) => member.target },
            { header: 'Phone', value: (member: typeof data.fieldTeams[number]) => member.phone },
          ], data.fieldTeams)
          pushToast({ title: result.ok ? 'Team CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
        }}>Export CSV</Button>} />
        <MetricGrid>
          <MetricCard label="Field members" value={data.fieldTeams.length} sub={`${new Set(data.fieldTeams.map((member) => member.region)).size} demo regions`} icon={<Users size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Visits completed" value={data.fieldTeams.reduce((sum, member) => sum + member.visitsCompleted, 0)} sub="Across the team target" icon={<CheckCircle2 size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Field leads" value={data.fieldTeams.reduce((sum, member) => sum + member.leads, 0)} sub="Sample attributed leads" icon={<Route size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Visits today" value={data.fieldTeams.reduce((sum, member) => sum + member.visitsToday, 0)} sub="Planned demo activity today" icon={<CalendarClock size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <EntityGrid columns={3}>
          {data.fieldTeams.map((member) => {
            const progress = (member.visitsCompleted / Math.max(1, member.target)) * 100
            return (
              <article className="card card--pad" key={member.id}>
                <div className="between" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <AvatarWithName name={member.name} sub={member.region} size="md" />
                  <Badge tone={progress >= 85 ? 'success' : progress >= 60 ? 'warning' : 'neutral'}>{formatPercent(progress, 0)}</Badge>
                </div>
                <div className="mini-stats mt-12">
                  <div className="mini-stat"><p className="mini-stat__label">Completed</p><p className="mini-stat__value">{member.visitsCompleted}</p></div>
                  <div className="mini-stat"><p className="mini-stat__label">Target</p><p className="mini-stat__value">{member.target}</p></div>
                  <div className="mini-stat"><p className="mini-stat__label">Leads</p><p className="mini-stat__value">{member.leads}</p></div>
                </div>
                <ProgressBar value={progress} size="sm" tone={progress >= 85 ? 'success' : progress >= 60 ? 'warning' : 'brand'} className="mt-12" />
                <div className="between mt-8">
                  <span className="text-xs muted">{member.visitsToday} visits today</span>
                  <span className="text-xs muted">{member.phone}</span>
                </div>
              </article>
            )
          })}
        </EntityGrid>
        <DataNote>Phone numbers and performance numbers are fictional demo values. No location tracking is used.</DataNote>
      </div>
    )
  }

  if (tab === 'field-visits') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Field visits"
          description="Plan visits, log outcomes and keep follow-ups visible. Status changes are local and do not notify the assigned employee."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportVisits(filteredVisits)}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setVisitOpen(true)}>Schedule visit</Button>
            </>
          }
        />
        <div className="grid-4">
          <div className="soft-tile"><p className="soft-tile__label">Visible</p><p className="soft-tile__value">{filteredVisits.length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Scheduled</p><p className="soft-tile__value">{filteredVisits.filter((visit) => visit.status === 'Scheduled').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Completed</p><p className="soft-tile__value">{filteredVisits.filter((visit) => visit.status === 'Completed').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Today</p><p className="soft-tile__value">{filteredVisits.filter((visit) => isToday(visit.date)).length}</p></div>
        </div>
        <DataTable
          data={filteredVisits}
          columns={visitColumns(filteredVisits)}
          rowKey={(visit) => visit.id}
          searchable={(visit) => `${visit.business} ${visit.contact} ${visit.location} ${visit.assignedTo} ${visit.purpose}`}
          searchPlaceholder="Search businesses, contacts, locations…"
          pageSize={8}
          initialSort={{ columnId: 'schedule', direction: 'asc' }}
          onRowClick={(visit) => setVisitId(visit.id)}
          filters={
            <>
              <select className="select" value={visitTypeFilter} onChange={(event) => setVisitTypeFilter(event.target.value)} aria-label="Filter by visit type">
                <option value="All">All visit types</option>
                {VISIT_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
              <select className="select" value={visitStatusFilter} onChange={(event) => setVisitStatusFilter(event.target.value)} aria-label="Filter by visit status">
                <option value="All">All statuses</option>
                {VISIT_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </>
          }
          caption="Field visits"
          emptyTitle="No visits match these filters"
          emptyDescription="Adjust the filters or schedule a demo visit."
        />
        <DataNote>Visit statuses are demo workflow labels. No route planning, check-in or notification service is connected.</DataNote>
        {visitModal}
        {singleVisitModal}
        <ConfirmDialog
          open={Boolean(visitDelete)}
          onClose={() => setVisitDelete(null)}
          onConfirm={() => {
            if (!visitDelete) return
            update('fieldVisits', (current) => current.filter((visit) => visit.id !== visitDelete.id))
            pushToast({ title: 'Demo visit removed', description: `${visitDelete.business} was removed from local field visits.`, tone: 'success' })
            setVisitDelete(null)
          }}
          title="Remove this demo visit?"
          description="The visit will be deleted from localStorage only. No external calendar or team member is affected."
          confirmLabel="Remove visit"
        />
      </div>
    )
  }

  if (tab === 'store-visits') {
    const rows = data.fieldVisits.filter((visit) => visit.type === 'Store Visit' || visit.type === 'Demo')
    return (
      <div className="stack-16">
        <TabIntro
          title="Store visits & demos"
          description="A focused queue of in-store visits and product demonstrations. Checklists are local planning aids, not completed audit evidence."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportVisits(rows, 'store-visits-demos')}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Store or demo visits" value={rows.length} sub={`${rows.filter((visit) => visit.status === 'Completed').length} completed`} icon={<Store size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Demos" value={rows.filter((visit) => visit.type === 'Demo').length} sub="Product demonstration visits" icon={<CheckCircle2 size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Checklist items" value={rows.reduce((sum, visit) => sum + visit.checklist.length, 0)} sub="Across store and demo plans" icon={<ClipboardList size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Follow-ups noted" value={rows.filter((visit) => visit.demoFollowUp.trim()).length} sub="Demo follow-up fields populated" icon={<Route size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <EntityGrid columns={2}>
          {rows.map((visit) => (
            <EntityCard
              key={visit.id}
              title={visit.business}
              subtitle={`${visit.type} · ${visit.location}`}
              badge={<StatusBadge status={visit.status} />}
              meta={<><span>{formatDate(visit.date)} at {formatTime(visit.time)}</span><span>{visit.assignedTo}</span></>}
              actions={<Button variant="ghost" size="xs" onClick={() => setVisitId(visit.id)}>Open visit plan</Button>}
            >
              <p className="text-xs muted" style={{ lineHeight: 1.55 }}>{visit.purpose}</p>
              <div className="stack-6 mt-8">
                {visit.checklist.map((item) => (
                  <p className="text-xs" key={item} style={{ color: 'var(--text-secondary)' }}>• {item}</p>
                ))}
              </div>
              {visit.demoFollowUp ? <p className="text-xs muted mt-8"><strong style={{ color: 'var(--text-secondary)' }}>Follow-up:</strong> {visit.demoFollowUp}</p> : null}
            </EntityCard>
          ))}
        </EntityGrid>
        <DataNote>No in-store audit, stock or sell-out service is connected. Checklist items are illustrative.</DataNote>
        {singleVisitModal}
      </div>
    )
  }

  if (tab === 'event-activities') {
    const demos = data.fieldVisits.filter((visit) => visit.type === 'Demo')
    const completedDemos = demos.filter((visit) => visit.status === 'Completed')
    return (
      <div className="stack-16">
        <TabIntro
          title="Event activities"
          description="Demo-led field events and activations. These records sit alongside the Trade & Retail module, but no event booking or venue service is connected."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportVisits(demos, 'event-activities')}>Export demos</Button>}
        />
        <MetricGrid>
          <MetricCard label="Demo events" value={demos.length} sub={`${completedDemos.length} completed`} icon={<CalendarClock size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Upcoming" value={demos.filter((visit) => visit.status === 'Scheduled').length} sub="Scheduled locally" icon={<Route size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Checklist coverage" value={formatPercent(demos.length ? (demos.reduce((sum, visit) => sum + visit.checklist.length, 0) / Math.max(1, demos.length * 3)) * 100 : null, 0)} sub="Average items against a 3-item plan" icon={<ClipboardList size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Follow-ups" value={demos.filter((visit) => visit.demoFollowUp.trim()).length} sub="Notes captured for next steps" icon={<CheckCircle2 size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <div className="stack-12">
          {demos.map((visit) => (
            <article className="card card--pad" key={visit.id}>
              <div className="between" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p className="text-xs faint">{visit.id} · {formatDate(visit.date)} · {formatTime(visit.time)}</p>
                  <h3 style={{ marginTop: 3, fontSize: '0.92rem' }}>{visit.business}</h3>
                  <p className="text-xs muted">{visit.location} · {visit.assignedTo}</p>
                </div>
                <StatusBadge status={visit.status} />
              </div>
              <p className="text-sm muted mt-8">{visit.purpose}</p>
              {visit.demoFollowUp ? <div className="callout callout--info mt-10"><CheckCircle2 size={14} /><span>{visit.demoFollowUp}</span></div> : null}
              <div className="between mt-10">
                <div className="row-6 wrap">{visit.checklist.map((item) => <Badge key={item} tone="neutral">{item}</Badge>)}</div>
                <Button variant="ghost" size="xs" onClick={() => setVisitId(visit.id)}>Open</Button>
              </div>
            </article>
          ))}
        </div>
        {singleVisitModal}
      </div>
    )
  }

  if (tab === 'market-research') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Market research"
          description="Capture competitor observations, pricing signals and product feedback from the field. This is a local note library, not a syndicated research feed."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => {
                const result = downloadCsv('market-research-demo', [
                  { header: 'ID', value: (row: MarketResearch) => row.id },
                  { header: 'Competitor', value: (row: MarketResearch) => row.competitor },
                  { header: 'Region', value: (row: MarketResearch) => row.region },
                  { header: 'Observation', value: (row: MarketResearch) => row.observation },
                  { header: 'Product feedback', value: (row: MarketResearch) => row.productFeedback },
                  { header: 'Interest', value: (row: MarketResearch) => row.interest },
                  { header: 'Pricing', value: (row: MarketResearch) => row.pricingObservation },
                  { header: 'Submitted by', value: (row: MarketResearch) => row.submittedBy },
                  { header: 'Date', value: (row: MarketResearch) => row.date },
                ], data.research)
                pushToast({ title: result.ok ? 'Research CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
              }}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setResearchOpen(true)}>Add observation</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Research notes" value={data.research.length} sub={`${new Set(data.research.map((row) => row.region)).size} regions covered`} icon={<Search size={15} />} tone="var(--chart-1)" />
          <MetricCard label="High interest" value={data.research.filter((row) => row.interest === 'High').length} sub="Field-reported product interest" icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Competitors tracked" value={new Set(data.research.map((row) => row.competitor)).size} sub="Fictional competitor names" icon={<Store size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Contributors" value={new Set(data.research.map((row) => row.submittedBy)).size} sub="Demo field contributors" icon={<Users size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <DataTable
          data={data.research}
          columns={[
            { id: 'competitor', header: 'Competitor', sortValue: (row) => row.competitor, mobileLabel: 'Competitor', render: (row) => <div><p className="cell-primary">{row.competitor}</p><p className="text-xs muted">{row.region}</p></div> },
            { id: 'observation', header: 'Observation', mobileLabel: 'Observation', render: (row) => <span className="text-xs" style={{ display: 'block', maxWidth: 280, lineHeight: 1.5 }}>{row.observation}</span> },
            { id: 'feedback', header: 'Product feedback', mobileLabel: 'Feedback', hideMobile: true, render: (row) => <span className="text-xs" style={{ display: 'block', maxWidth: 260, lineHeight: 1.5 }}>{row.productFeedback}</span> },
            { id: 'interest', header: 'Interest', sortValue: (row) => row.interest, mobileLabel: 'Interest', render: (row) => <Badge tone={row.interest === 'High' ? 'success' : row.interest === 'Medium' ? 'warning' : 'neutral'}>{row.interest}</Badge> },
            { id: 'owner', header: 'By', sortValue: (row) => row.submittedBy, mobileLabel: 'Submitted by', render: (row) => <span className="text-xs">{row.submittedBy}</span> },
            { id: 'date', header: 'Date', sortValue: (row) => row.date, mobileLabel: 'Date', render: (row) => formatDate(row.date) },
          ]}
          rowKey={(row) => row.id}
          searchable={(row) => `${row.competitor} ${row.region} ${row.observation} ${row.productFeedback} ${row.pricingObservation}`}
          searchPlaceholder="Search competitors, regions, feedback…"
          pageSize={6}
          initialSort={{ columnId: 'date', direction: 'desc' }}
          caption="Market research observations"
        />
        <div className="entity-grid entity-grid--3">
          {data.research.map((row) => (
            <EntityCard key={row.id} title={row.competitor} subtitle={`${row.region} · ${formatDate(row.date)}`} badge={<Badge tone={row.interest === 'High' ? 'success' : row.interest === 'Medium' ? 'warning' : 'neutral'}>{row.interest} interest</Badge>} meta={<span>By {row.submittedBy}</span>}>
              <p className="text-xs muted" style={{ lineHeight: 1.55 }}>{row.observation}</p>
              <p className="text-xs mt-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}><strong>Pricing:</strong> {row.pricingObservation}</p>
            </EntityCard>
          ))}
        </div>
        {researchModal}
      </div>
    )
  }

  if (tab === 'expense-claims') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Field expense claims"
          description="Log field travel and local expenses. Status actions are demo-only; no reimbursement, payroll or payment service is connected."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => {
                const result = downloadCsv('field-expense-claims-demo', [
                  { header: 'Ref', value: (claim: FieldClaim) => claim.ref },
                  { header: 'Employee', value: (claim: FieldClaim) => claim.employee },
                  { header: 'Purpose', value: (claim: FieldClaim) => claim.purpose },
                  { header: 'Date', value: (claim: FieldClaim) => claim.date },
                  { header: 'Amount', value: (claim: FieldClaim) => claim.amount },
                  { header: 'Status', value: (claim: FieldClaim) => claim.status },
                  { header: 'Receipt', value: (claim: FieldClaim) => claim.receiptName ?? '' },
                ], data.fieldClaims)
                pushToast({ title: result.ok ? 'Claims CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
              }}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setClaimOpen(true)}>New claim</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Claims" value={data.fieldClaims.length} sub={`${data.fieldClaims.filter((claim) => claim.status === 'Submitted').length} submitted`} icon={<FileText size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Claim value" value={formatINR(data.fieldClaims.reduce((sum, claim) => sum + claim.amount, 0))} sub="Across all statuses" icon={<ClipboardList size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Approved" value={data.fieldClaims.filter((claim) => claim.status === 'Approved').length} sub="Awaiting demo reimbursement" icon={<CheckCircle2 size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Reimbursed" value={data.fieldClaims.filter((claim) => claim.status === 'Reimbursed').length} sub="Marked paid in demo data" icon={<BadgeCheck size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <DataTable
          data={data.fieldClaims}
          columns={[
            { id: 'ref', header: 'Claim', sortValue: (claim) => claim.ref, mobileLabel: 'Claim', render: (claim) => <div><p className="cell-primary">{claim.ref}</p><p className="text-xs muted">{claim.employee}</p></div> },
            { id: 'purpose', header: 'Purpose', sortValue: (claim) => claim.purpose, mobileLabel: 'Purpose', render: (claim) => <span className="text-xs">{claim.purpose}</span> },
            { id: 'date', header: 'Date', sortValue: (claim) => claim.date, mobileLabel: 'Date', render: (claim) => formatDate(claim.date) },
            { id: 'amount', header: 'Amount', align: 'right', sortValue: (claim) => claim.amount, mobileLabel: 'Amount', render: (claim) => <span className="cell-strong">{formatINR(claim.amount)}</span> },
            { id: 'receipt', header: 'Receipt', mobileLabel: 'Receipt', hideMobile: true, render: (claim) => claim.receiptName ? <span className="text-xs">{claim.receiptName}</span> : <span className="muted text-xs">No file</span> },
            { id: 'status', header: 'Status', sortValue: (claim) => claim.status, mobileLabel: 'Status', render: (claim) => <StatusBadge status={claim.status} /> },
            {
              id: 'actions', header: '', align: 'right', mobileLabel: 'Actions',
              render: (claim) => (
                <div className="row-6" style={{ justifyContent: 'flex-end' }}>
                  {claim.status === 'Draft' ? <Button variant="ghost" size="xs" onClick={() => updateClaimStatus(claim, 'Submitted')}>Submit</Button> : null}
                  {claim.status === 'Submitted' ? <Button variant="ghost" size="xs" onClick={() => updateClaimStatus(claim, 'Approved')}>Approve</Button> : null}
                  {claim.status === 'Approved' ? <Button variant="ghost" size="xs" onClick={() => updateClaimStatus(claim, 'Reimbursed')}>Mark reimbursed</Button> : null}
                  <Button variant="ghost" size="xs" onClick={() => setClaimDelete(claim)}>Delete</Button>
                </div>
              ),
            },
          ]}
          rowKey={(claim) => claim.id}
          searchable={(claim) => `${claim.ref} ${claim.employee} ${claim.purpose} ${claim.status}`}
          searchPlaceholder="Search claims…"
          pageSize={6}
          caption="Field expense claims"
        />
        <DemoNote>
          Approving or marking a claim reimbursed only changes local demo status. No bank transfer, payroll entry or finance approval is created.
        </DemoNote>
        {claimModal}
        <ConfirmDialog
          open={Boolean(claimDelete)}
          onClose={() => setClaimDelete(null)}
          onConfirm={() => {
            if (!claimDelete) return
            update('fieldClaims', (current) => current.filter((claim) => claim.id !== claimDelete.id))
            pushToast({ title: 'Demo claim removed', description: `${claimDelete.ref} was deleted from local field claims.`, tone: 'success' })
            setClaimDelete(null)
          }}
          title="Delete this demo claim?"
          description="The claim will be removed from localStorage. No reimbursement record exists outside this browser."
          confirmLabel="Delete claim"
        />
      </div>
    )
  }

  if (tab === 'visit-reports') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Visit reports"
          description="Review completed field visits and their recorded outcomes. Reports are assembled from local notes and checklists, not uploaded documents."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportVisits(completed, 'visit-reports')}>Export reports</Button>}
        />
        <MetricGrid>
          <MetricCard label="Completed visits" value={completed.length} sub={`${data.fieldVisits.length - completed.length} still open or cancelled`} icon={<CheckCircle2 size={15} />} tone="var(--chart-2)" />
          <MetricCard label="With follow-up" value={completed.filter((visit) => visit.demoFollowUp.trim()).length} sub="Notes recorded for next action" icon={<Route size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Checklist items" value={completed.reduce((sum, visit) => sum + visit.checklist.length, 0)} sub="Across completed visits" icon={<ClipboardList size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Team members" value={new Set(completed.map((visit) => visit.assignedTo)).size} sub="Owners of completed demo visits" icon={<Users size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <div className="stack-12">
          {completed.map((visit) => (
            <article className="card card--pad" key={visit.id}>
              <div className="between" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p className="text-xs faint">{visit.id} · {visit.type} · {formatDate(visit.date)}</p>
                  <h3 style={{ marginTop: 3, fontSize: '0.92rem' }}>{visit.business} · {visit.contact}</h3>
                  <p className="text-xs muted">{visit.location} · {visit.assignedTo}</p>
                </div>
                <StatusBadge status={visit.status} />
              </div>
              <div className="detail-grid mt-12">
                <div className="detail-item"><dt>Purpose</dt><dd>{visit.purpose}</dd></div>
                <div className="detail-item"><dt>Notes</dt><dd>{visit.notes || 'No notes recorded.'}</dd></div>
                <div className="detail-item"><dt>Demo follow-up</dt><dd>{visit.demoFollowUp || 'None recorded.'}</dd></div>
                <div className="detail-item"><dt>Checklist</dt><dd>{visit.checklist.join(' · ') || 'No checklist.'}</dd></div>
              </div>
              <div className="row-8 mt-12">
                <Button variant="ghost" size="xs" onClick={() => setVisitId(visit.id)}>Open visit record</Button>
              </div>
            </article>
          ))}
        </div>
        <DataNote>No visit report attachments are stored. This view is a readable summary of local demo fields.</DataNote>
        {singleVisitModal}
      </div>
    )
  }

  return null
}

function VisitModal({ open, onClose, onSave, teams }: { open: boolean; onClose: () => void; onSave: (values: VisitFormValues) => void; teams: { name: string }[] }) {
  const [values, setValues] = useState<VisitFormValues>(() => ({
    business: '',
    contact: '',
    purpose: '',
    type: 'Field Visit',
    date: dateOnlyFromNow(1),
    time: '10:00',
    location: '',
    assignedTo: teams[0]?.name ?? 'Ananya Rao',
    notes: '',
    demoFollowUp: '',
    checklist: 'Portfolio brochure\nPrice list\nFeedback form',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof VisitFormValues>(key: K, value: VisitFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.business.trim()) next.business = 'Business name is required.'
    if (!values.contact.trim()) next.contact = 'Contact name is required.'
    if (!values.purpose.trim()) next.purpose = 'Describe the visit purpose.'
    if (!values.date) next.date = 'Choose a visit date.'
    if (!values.location.trim()) next.location = 'Add a visit location.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule a demo field visit" description="Creates a local record only. No calendar invite, route or notification is sent." size="wide" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Schedule visit</Button></>}>
      <div className="form-grid">
        <Field label="Business" htmlFor="visit-business" required error={errors.business}>
          <input id="visit-business" className="input" value={values.business} onChange={(event) => set('business', event.target.value)} aria-invalid={Boolean(errors.business)} />
        </Field>
        <Field label="Contact" htmlFor="visit-contact" required error={errors.contact}>
          <input id="visit-contact" className="input" value={values.contact} onChange={(event) => set('contact', event.target.value)} aria-invalid={Boolean(errors.contact)} />
        </Field>
        <Field label="Visit type" htmlFor="visit-type">
          <select id="visit-type" className="select" value={values.type} onChange={(event) => set('type', event.target.value as VisitType)}>
            {VISIT_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Assigned to" htmlFor="visit-owner">
          <select id="visit-owner" className="select" value={values.assignedTo} onChange={(event) => set('assignedTo', event.target.value)}>
            {teams.map((team) => <option key={team.name}>{team.name}</option>)}
          </select>
        </Field>
        <Field label="Date" htmlFor="visit-date" required error={errors.date}>
          <input id="visit-date" className="input" type="date" value={values.date} onChange={(event) => set('date', event.target.value)} aria-invalid={Boolean(errors.date)} />
        </Field>
        <Field label="Time" htmlFor="visit-time">
          <input id="visit-time" className="input" type="time" value={values.time} onChange={(event) => set('time', event.target.value)} />
        </Field>
        <Field label="Location" htmlFor="visit-location" required error={errors.location} className="form-grid__full">
          <input id="visit-location" className="input" value={values.location} onChange={(event) => set('location', event.target.value)} placeholder="Area, city" aria-invalid={Boolean(errors.location)} />
        </Field>
        <Field label="Purpose" htmlFor="visit-purpose" required error={errors.purpose} className="form-grid__full">
          <textarea id="visit-purpose" className="textarea" rows={3} value={values.purpose} onChange={(event) => set('purpose', event.target.value)} aria-invalid={Boolean(errors.purpose)} />
        </Field>
        <Field label="Notes" htmlFor="visit-notes" className="form-grid__full">
          <textarea id="visit-notes" className="textarea" rows={2} value={values.notes} onChange={(event) => set('notes', event.target.value)} />
        </Field>
        <Field label="Demo follow-up" htmlFor="visit-followup" className="form-grid__full">
          <textarea id="visit-followup" className="textarea" rows={2} value={values.demoFollowUp} onChange={(event) => set('demoFollowUp', event.target.value)} />
        </Field>
        <Field label="Checklist" htmlFor="visit-checklist" className="form-grid__full" hint="One item per line. Stored as local planning notes.">
          <textarea id="visit-checklist" className="textarea" rows={4} value={values.checklist} onChange={(event) => set('checklist', event.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

function VisitDetailModal({ visit, onClose, onStatusChange }: { visit: FieldVisit; onClose: () => void; onStatusChange: (status: VisitStatus) => void }) {
  return (
    <Modal open onClose={onClose} title={visit.business} description={`${visit.type} · ${formatDate(visit.date)} at ${formatTime(visit.time)}`} size="wide" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="stack-16">
        <div className="row-8" style={{ flexWrap: 'wrap' }}>
          <StatusBadge status={visit.status} />
          <Badge tone="neutral">{visit.assignedTo}</Badge>
          <Badge tone="neutral">{visit.location}</Badge>
        </div>
        <DetailRows
          items={[
            { label: 'Contact', value: visit.contact },
            { label: 'Purpose', value: visit.purpose },
            { label: 'Notes', value: visit.notes || 'No notes.' },
            { label: 'Demo follow-up', value: visit.demoFollowUp || 'No follow-up recorded.' },
            { label: 'Checklist', value: visit.checklist.length ? visit.checklist.join(' · ') : 'No checklist.' },
            { label: 'Created', value: formatDate(visit.createdAt) },
          ]}
        />
        <Field label="Demo status" htmlFor="visit-detail-status" hint="Local status only. No calendar or mobile field app is updated.">
          <select id="visit-detail-status" className="select" value={visit.status} onChange={(event) => onStatusChange(event.target.value as VisitStatus)}>
            {VISIT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <DataNote>This visit is a demo record. Any address or contact details are fictional.</DataNote>
      </div>
    </Modal>
  )
}

function ResearchModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (values: ResearchFormValues) => void }) {
  const [values, setValues] = useState<ResearchFormValues>({ competitor: '', region: 'West India', observation: '', productFeedback: '', interest: 'Medium', pricingObservation: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof ResearchFormValues>(key: K, value: ResearchFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.competitor.trim()) next.competitor = 'Competitor name is required.'
    if (!values.observation.trim()) next.observation = 'Add the field observation.'
    if (!values.productFeedback.trim()) next.productFeedback = 'Add product feedback.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add market research observation" description="Stored locally as demo research. No external research source is queried." size="wide" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save observation</Button></>}>
      <div className="form-grid">
        <Field label="Competitor" htmlFor="research-competitor" required error={errors.competitor}>
          <input id="research-competitor" className="input" value={values.competitor} onChange={(event) => set('competitor', event.target.value)} aria-invalid={Boolean(errors.competitor)} />
        </Field>
        <Field label="Region" htmlFor="research-region">
          <select id="research-region" className="select" value={values.region} onChange={(event) => set('region', event.target.value)}>
            {REGIONS.map((region) => <option key={region}>{region}</option>)}
          </select>
        </Field>
        <Field label="Interest" htmlFor="research-interest">
          <select id="research-interest" className="select" value={values.interest} onChange={(event) => set('interest', event.target.value as ResearchFormValues['interest'])}>
            {['High', 'Medium', 'Low'].map((interest) => <option key={interest}>{interest}</option>)}
          </select>
        </Field>
        <Field label="Observation" htmlFor="research-observation" required error={errors.observation} className="form-grid__full">
          <textarea id="research-observation" className="textarea" rows={3} value={values.observation} onChange={(event) => set('observation', event.target.value)} aria-invalid={Boolean(errors.observation)} />
        </Field>
        <Field label="Product feedback" htmlFor="research-feedback" required error={errors.productFeedback} className="form-grid__full">
          <textarea id="research-feedback" className="textarea" rows={3} value={values.productFeedback} onChange={(event) => set('productFeedback', event.target.value)} aria-invalid={Boolean(errors.productFeedback)} />
        </Field>
        <Field label="Pricing observation" htmlFor="research-pricing" className="form-grid__full">
          <textarea id="research-pricing" className="textarea" rows={2} value={values.pricingObservation} onChange={(event) => set('pricingObservation', event.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

function ClaimModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (values: ClaimFormValues) => void }) {
  const [values, setValues] = useState<ClaimFormValues>({ purpose: '', date: dateOnlyFromNow(0), amount: '', receiptName: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof ClaimFormValues>(key: K, value: ClaimFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.purpose.trim()) next.purpose = 'Describe the expense purpose.'
    if (!values.date) next.date = 'Choose the expense date.'
    const amount = Number(values.amount)
    if (!values.amount || !Number.isFinite(amount) || amount <= 0) next.amount = 'Enter an amount greater than zero.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }

  return (
    <Modal open={open} onClose={onClose} title="New field expense claim" description="Creates a local demo draft. No receipt is uploaded and no reimbursement is processed." size="md" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save draft</Button></>}>
      <div className="form-grid">
        <Field label="Purpose" htmlFor="claim-purpose" required error={errors.purpose} className="form-grid__full">
          <input id="claim-purpose" className="input" value={values.purpose} onChange={(event) => set('purpose', event.target.value)} aria-invalid={Boolean(errors.purpose)} />
        </Field>
        <Field label="Date" htmlFor="claim-date" required error={errors.date}>
          <input id="claim-date" className="input" type="date" value={values.date} onChange={(event) => set('date', event.target.value)} aria-invalid={Boolean(errors.date)} />
        </Field>
        <Field label="Amount (INR)" htmlFor="claim-amount" required error={errors.amount}>
          <input id="claim-amount" className="input" type="number" min={0} step={50} value={values.amount} onChange={(event) => set('amount', event.target.value)} aria-invalid={Boolean(errors.amount)} />
        </Field>
        <Field label="Receipt file name" htmlFor="claim-receipt" className="form-grid__full" hint="Optional label only. No file is uploaded or stored.">
          <input id="claim-receipt" className="input" value={values.receiptName} onChange={(event) => set('receiptName', event.target.value)} placeholder="e.g. local-travel-bills.pdf" />
        </Field>
      </div>
    </Modal>
  )
}
