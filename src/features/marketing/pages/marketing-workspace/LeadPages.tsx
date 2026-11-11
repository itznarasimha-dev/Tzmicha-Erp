import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Columns3,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Field } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useMarketingDepartment } from '../../context/MarketingDepartmentContext'
import {
  EmployeeAvatar,
  EmptyBlock,
  KpiCard,
  MmsPageHeader,
  MmsSelect,
  MmsTabs,
  SearchField,
  SectionCard,
  SectorChip,
  StatusChip,
  PriorityChip,
  moneyCompact,
  useMmsScope,
} from '../../components/marketing/management/MmsKit'
import {
  ActivityList,
  FollowUpList,
  LeadTableWithSectors,
  MmsKpiGrid,
  MmsTwoCol,
  PipelineFunnel,
} from '../../components/marketing/management/MmsLists'
import {
  FollowUpModal,
  HandoverModal,
  LeadDetailModal,
  LeadFormModal,
} from '../../components/marketing/management/MmsLeadModals'
import type {
  LeadStage,
  MarketingFollowUp,
  MarketingLead,
} from '../../types/marketingDepartment'
import {
  findDuplicateLeads,
  leadStats,
  normalizePhone,
  shortDate,
  stageTone,
} from '../../utils/marketingDepartment'
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '../../utils/format'
import { followUpLabel, isOverdue } from '../../utils/dates'
import { useToast } from '../../context/ToastContext'

const PIPELINE_STAGES: LeadStage[] = [
  'New Lead',
  'Follow-up',
  'Qualification',
  'Senior Review',
  'Manager Review',
  'Sent to Sales',
  'Sales Follow-up',
  'Won',
  'Lost',
  'Rejected',
]

/* ------------------------------------------------------------------ */
/* Lead generation                                                     */
/* ------------------------------------------------------------------ */

export function LeadGenerationPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const { pushToast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [leadId, setLeadId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [tab, setTab] = useState('all')

  const leads = scope.leads
  const stats = leadStats(leads, scope.followUps)
  const sectors = scope.mySectors.length ? scope.mySectors : department.sectors

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, MarketingLead[]>()
    for (const lead of leads) {
      const key = normalizePhone(lead.phone)
      if (key.length < 8) continue
      map.set(key, [...(map.get(key) ?? []), lead])
    }
    return [...map.entries()].filter(([, group]) => group.length > 1)
  }, [leads])

  const filtered = leads
    .filter((lead) => {
      if (tab === 'new') return lead.stage === 'New Lead'
      if (tab === 'followup') return lead.stage === 'Follow-up' || lead.stage === 'Qualification'
      if (tab === 'review') return lead.stage === 'Senior Review' || lead.stage === 'Manager Review'
      if (tab === 'sales') return ['Sent to Sales', 'Sales Follow-up', 'Won', 'Lost'].includes(lead.stage)
      return true
    })
    .filter((lead) => (stageFilter === 'all' ? true : lead.stage === stageFilter))
    .filter((lead) => (sectorFilter === 'all' ? true : lead.sectorId === sectorFilter))
    .filter((lead) => `${lead.name} ${lead.businessName} ${lead.phone} ${lead.product}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const today = new Date().toISOString().slice(0, 10)
  const todayLeads = leads.filter((lead) => lead.createdAt.slice(0, 10) === today).length
  const sourceCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const lead of leads) map.set(lead.source, (map.get(lead.source) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [leads])

  function reportDuplicate() {
    pushToast({
      title: 'Duplicate protection is active',
      description:
        duplicateGroups.length > 0
          ? `${duplicateGroups.length} legacy duplicate phone group(s) exist in the demonstration data. New captures are blocked before saving.`
          : 'Every new lead is checked against the full department pipeline using its normalized mobile number.',
      tone: duplicateGroups.length ? 'warning' : 'success',
    })
  }

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'junior' ? 'Junior workspace' : scope.roleId === 'senior' ? 'Senior workspace' : 'Manager workspace'}
        title="Lead Generation"
        subtitle="Capture complete customer information and send qualified opportunities into the shared pipeline."
        actions={
          <>
            <Button variant="soft" icon={<ShieldCheck size={15} />} onClick={reportDuplicate}>Duplicate protection</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setFormOpen(true)}>Capture new lead</Button>
          </>
        }
        meta={
          <div className="mms-header-meta">
            <span><Target size={13} /> {leads.length} leads in scope</span>
            <span><BadgeCheck size={13} /> {stats.qualified} qualified</span>
            <span><Plus size={13} /> {todayLeads} captured today</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Total leads" value={leads.length} icon={<Target size={18} />} tone="var(--chart-1)" hint={`${stats.newLeads} new · ${stats.followUpDue} follow-ups due`} />
        <KpiCard label="Qualified" value={stats.qualified} icon={<BadgeCheck size={18} />} tone="var(--chart-2)" hint={`${formatPercent(stats.qualificationRate, 0)} qualification rate`} />
        <KpiCard label="In review" value={stats.underReview} icon={<Columns3 size={18} />} tone="var(--chart-4)" hint="Senior and manager validation" />
        <KpiCard label="Sent to Sales" value={stats.sentToSales} icon={<Send size={18} />} tone="var(--chart-5)" hint={`${stats.converted} won by Sales`} />
      </MmsKpiGrid>

      <MmsTwoCol variant="2-1">
        <SectionCard
          title="Lead register"
          subtitle={`${filtered.length} records in the shared pipeline`}
          actions={<SearchField value={query} onChange={setQuery} placeholder="Search name, business, phone…" />}
        >
          <div className="mms-toolbar-row mms-toolbar-row--wrap mms-toolbar-row--flush">
            <MmsTabs
              value={tab}
              onChange={setTab}
              ariaLabel="Lead generation filters"
              options={[
                { id: 'all', label: 'All', count: leads.length },
                { id: 'new', label: 'New', count: stats.newLeads },
                { id: 'followup', label: 'Working', count: leads.filter((lead) => ['Follow-up', 'Qualification'].includes(lead.stage)).length },
                { id: 'review', label: 'Review', count: stats.underReview },
                { id: 'sales', label: 'Sales', count: stats.sentToSales },
              ]}
            />
            <div className="mms-toolbar-filters">
              <MmsSelect label="Stage" value={stageFilter} onChange={setStageFilter} options={PIPELINE_STAGES.map((stage) => ({ value: stage, label: stage }))} />
              <MmsSelect label="Sector" value={sectorFilter} onChange={setSectorFilter} options={sectors.map((sector) => ({ value: sector.id, label: sector.name }))} />
            </div>
          </div>
          <LeadTableWithSectors leads={filtered.slice(0, 14)} sectors={department.sectors} onOpen={(lead) => setLeadId(lead.id)} compact />
          {filtered.length > 14 ? <p className="mms-empty-line">Showing the 14 most recent records. Use search or open the pipeline for the full list.</p> : null}
        </SectionCard>

        <div className="mms-stack">
          <SectionCard title="Top sources" subtitle="Where leads come from" icon={<TrendingUp size={16} />}>
            <div className="mms-source-list">
              {sourceCounts.map(([source, count]) => (
                <div key={source}>
                  <span>{source}</span>
                  <div><ProgressBar value={(count / Math.max(1, leads.length)) * 100} size="sm" /></div>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Duplicate guard" subtitle="Normalized mobile matching" icon={<ShieldCheck size={16} />}>
            <div className="mms-guard">
              <div><span>Phone-normalized records</span><strong>{leads.filter((lead) => normalizePhone(lead.phone).length >= 8).length}</strong></div>
              <div><span>Duplicate groups</span><strong style={{ color: duplicateGroups.length ? 'var(--danger)' : 'var(--success)' }}>{duplicateGroups.length}</strong></div>
            </div>
            <p className="mms-empty-line">
              New leads are blocked if the same mobile number already exists anywhere in the department. Email and business-name matches are shown as warnings before saving.
            </p>
          </SectionCard>
          <SectionCard title="Today’s conversations" subtitle="Keep momentum with new leads">
            <FollowUpList
              followUps={scope.followUps.filter((followUp) => followUp.status === 'Scheduled').slice(0, 3)}
              leads={leads}
              employees={department.employees}
              onOpenLead={(lead) => setLeadId(lead.id)}
            />
          </SectionCard>
        </div>
      </MmsTwoCol>

      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} defaultSectorId={sectors[0]?.id} />
      <LeadDetailModal open={Boolean(leadId)} leadId={leadId} onClose={() => setLeadId(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pipeline kanban                                                     */
/* ------------------------------------------------------------------ */

function LeadKanbanCard({ lead, onOpen }: { lead: MarketingLead; onOpen: () => void }) {
  const sector = undefined
  return (
    <button type="button" className="mms-lead-kcard" onClick={onOpen}>
      <div className="mms-lead-kcard__top">
        <PriorityChip priority={lead.priority} />
        <span>{formatINRCompact(lead.expectedValue)}</span>
      </div>
      <strong>{lead.name}</strong>
      <small>{lead.businessName || 'Individual'}</small>
      <div className="mms-lead-kcard__meta">
        <span><Phone size={11} /> {lead.phone}</span>
        {lead.followUps[0]?.nextActionAt ? <span className={isOverdue(lead.followUps[0].nextActionAt) ? 'mms-danger-text' : ''}><CalendarClock size={11} /> {followUpLabel(lead.followUps[0].nextActionAt)}</span> : null}
      </div>
      <div className="mms-lead-kcard__foot">
        <span>{lead.source}</span>
        {lead.handover ? <Badge tone="success" dot>Sales</Badge> : sector ? <SectorChip sector={sector} compact /> : null}
      </div>
    </button>
  )
}

export function LeadPipelinePage({ mode = 'pipeline' }: { mode?: 'pipeline' | 'handovers' }) {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [leadId, setLeadId] = useState<string | null>(null)
  const [handoverLead, setHandoverLead] = useState<MarketingLead | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [handoverTab, setHandoverTab] = useState('pending')

  const leads = scope.leads
  const stats = leadStats(leads, scope.followUps)
  const sectors = scope.mySectors.length ? scope.mySectors : department.sectors
  const filtered = leads
    .filter((lead) => (sectorFilter === 'all' ? true : lead.sectorId === sectorFilter))
    .filter((lead) => `${lead.name} ${lead.businessName} ${lead.phone}`.toLowerCase().includes(query.toLowerCase()))

  const handoverLeads = leads.filter((lead) => lead.stage === 'Manager Review' || lead.handover)
  const handoverView = handoverLeads
    .filter((lead) => {
      if (handoverTab === 'pending') return !lead.handover
      if (handoverTab === 'sales') return Boolean(lead.handover) && !lead.salesOutcome
      if (handoverTab === 'closed') return Boolean(lead.salesOutcome)
      return true
    })
    .filter((lead) => `${lead.name} ${lead.businessName}`.toLowerCase().includes(query.toLowerCase()))

  if (mode === 'handovers') {
    const won = handoverLeads.filter((lead) => lead.salesOutcome?.status === 'Won')
    const lost = handoverLeads.filter((lead) => lead.salesOutcome?.status === 'Lost')
    const wonValue = won.reduce((sum, lead) => sum + (lead.salesOutcome?.value ?? lead.expectedValue), 0)
    return (
      <div className="mms-page">
        <MmsPageHeader
          eyebrow="Manager workspace"
          title="Sales Handover"
          subtitle="Approve manager-reviewed leads, hand them to Sales and track sales-owned outcomes. Marketing never records Won or Lost."
          actions={
            <Button variant="primary" icon={<Send size={15} />} onClick={() => setLeadId(leads.find((lead) => lead.stage === 'Manager Review')?.id ?? handoverLeads[0]?.id ?? null)}>Open handover queue</Button>
          }
          meta={
            <div className="mms-header-meta">
              <span><Send size={13} /> {stats.sentToSales} handed over</span>
              <span><CheckCircle2 size={13} /> {won.length} won</span>
              <span><ShieldCheck size={13} /> Sales owns final outcomes</span>
            </div>
          }
        />

        <MmsKpiGrid columns={4}>
          <KpiCard label="Ready to hand over" value={handoverLeads.filter((lead) => !lead.handover).length} icon={<Send size={18} />} tone="var(--chart-5)" hint="Manager review complete" />
          <KpiCard label="Sales owned" value={handoverLeads.filter((lead) => lead.handover && !lead.salesOutcome).length} icon={<Users size={18} />} tone="var(--chart-1)" hint="Outcome pending with Sales" />
          <KpiCard label="Won by Sales" value={won.length} icon={<CheckCircle2 size={18} />} tone="var(--chart-2)" hint={`${moneyCompact(wonValue)} closed value`} />
          <KpiCard label="Lost by Sales" value={lost.length} icon={<XCircle size={18} />} tone="var(--chart-7)" hint="Read-only marketing view" />
        </MmsKpiGrid>

        <SectionCard
          title="Handover register"
          subtitle="Duplicate handovers with the same normalized phone number are blocked before assignment."
          actions={<SearchField value={query} onChange={setQuery} placeholder="Search handovers…" />}
        >
          <div className="mms-toolbar-row mms-toolbar-row--flush">
            <MmsTabs
              value={handoverTab}
              onChange={setHandoverTab}
              ariaLabel="Handover filters"
              options={[
                { id: 'pending', label: 'Ready', count: handoverLeads.filter((lead) => !lead.handover).length },
                { id: 'sales', label: 'With Sales', count: handoverLeads.filter((lead) => lead.handover && !lead.salesOutcome).length },
                { id: 'closed', label: 'Outcome', count: handoverLeads.filter((lead) => lead.salesOutcome).length },
                { id: 'all', label: 'All', count: handoverLeads.length },
              ]}
            />
          </div>
          <div className="mms-handover-table">
            {handoverView.map((lead) => (
              <div key={lead.id} className="mms-handover-row">
                <EmployeeAvatar employee={department.employees.find((employee) => employee.id === lead.assignedJuniorId)} />
                <button type="button" className="mms-handover-row__name" onClick={() => setLeadId(lead.id)}>
                  <strong>{lead.name}</strong>
                  <small>{lead.businessName || 'Individual'} · {lead.phone} · {formatINRCompact(lead.expectedValue)}</small>
                </button>
                <StatusChip status={lead.stage} tone={stageTone(lead.stage)} />
                {lead.handover ? (
                  <div className="mms-handover-row__sales">
                    <span>Sales</span>
                    <strong>{lead.handover.salesRepName}</strong>
                    <small>{lead.salesOutcome ? `${lead.salesOutcome.status} · ${formatINR(lead.salesOutcome.value)}` : 'Outcome pending'}</small>
                  </div>
                ) : (
                  <Button size="xs" variant="primary" onClick={() => setHandoverLead(lead)}>Send to Sales</Button>
                )}
              </div>
            ))}
            {!handoverView.length ? (
              <EmptyBlock
                icon={<Send size={20} />}
                title={handoverTab === 'pending' ? 'No leads ready for handover' : 'No handovers in this view'}
                description={handoverTab === 'pending' ? 'Leads appear here after manager review. Sales owns the outcome after handover.' : 'Change the filter to see other records.'}
              />
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Sales outcome policy" subtitle="Confirm the boundary between Marketing and Sales">
          <ul className="mms-rule-list">
            <li><ShieldCheck size={14} /> Only the Sales team records the final Won or Lost outcome.</li>
            <li><ShieldCheck size={14} /> Marketing controls lock after handover so nobody can overwrite the sales result.</li>
            <li><ShieldCheck size={14} /> A second handover for the same normalized phone number is blocked.</li>
            <li><ShieldCheck size={14} /> Marketing reports show sales-owned records as read-only results.</li>
          </ul>
        </SectionCard>

        <LeadDetailModal open={Boolean(leadId)} leadId={leadId} onClose={() => setLeadId(null)} />
        <HandoverModal open={Boolean(handoverLead)} lead={handoverLead} onClose={() => setHandoverLead(null)} />
        <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      </div>
    )
  }

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'junior' ? 'Junior workspace' : scope.roleId === 'senior' ? 'Senior workspace' : 'Manager workspace'}
        title="Lead Pipeline"
        subtitle="One shared lead record from first contact through senior review, manager review and sales handover."
        actions={
          <>
            <Button variant="soft" icon={<Target size={15} />} onClick={() => setFormOpen(true)}>Capture lead</Button>
            <Button variant="primary" icon={<ArrowRight size={15} />} onClick={() => setLeadId(leads.find((lead) => lead.stage === 'Manager Review')?.id ?? null)}>Open review queue</Button>
          </>
        }
        meta={
          <div className="mms-header-meta">
            <span><Target size={13} /> {stats.inPipeline} in pipeline</span>
            <span><BadgeCheck size={13} /> {stats.qualified} qualified</span>
            <span><Send size={13} /> {stats.sentToSales} with Sales</span>
          </div>
        }
      />

      <MmsKpiGrid columns={5}>
        <KpiCard label="Total pipeline" value={stats.total} icon={<Target size={18} />} tone="var(--chart-1)" hint={`${stats.newLeads} new leads`} />
        <KpiCard label="Follow-up due" value={stats.followUpDue} icon={<CalendarClock size={18} />} tone="var(--chart-4)" hint="Overdue or due today" />
        <KpiCard label="Under review" value={stats.underReview} icon={<Columns3 size={18} />} tone="var(--chart-5)" hint="Senior + manager stages" />
        <KpiCard label="Sent to Sales" value={stats.sentToSales} icon={<Send size={18} />} tone="var(--chart-6)" hint={`${stats.converted} won`} />
        <KpiCard label="Conversion" value={stats.conversionRate} icon={<TrendingUp size={18} />} tone="var(--chart-2)" format={(value) => formatPercent(value)} hint="Sales-recorded wins only" />
      </MmsKpiGrid>

      <MmsTwoCol variant="2-1">
        <SectionCard title="Stage funnel" subtitle="Live movement in the shared pipeline">
          <PipelineFunnel leads={leads} />
        </SectionCard>
        <SectionCard title="Workflow rules" subtitle="Role boundaries">
          <ul className="mms-rule-list">
            <li><BadgeCheck size={14} /> Juniors qualify and submit leads to their senior.</li>
            <li><BadgeCheck size={14} /> Seniors validate qualification and recommend to the manager.</li>
            <li><BadgeCheck size={14} /> Managers approve and complete the sales handover.</li>
            <li><ShieldCheck size={14} /> Sales exclusively records Won or Lost.</li>
          </ul>
        </SectionCard>
      </MmsTwoCol>

      <div className="mms-toolbar-row mms-toolbar-row--wrap">
        <div className="mms-kanban-title">
          <Columns3 size={16} />
          <strong>Pipeline board</strong>
          <span>{filtered.length} leads</span>
        </div>
        <div className="mms-toolbar-filters">
          <SearchField value={query} onChange={setQuery} placeholder="Search pipeline…" />
          <MmsSelect label="Sector" value={sectorFilter} onChange={setSectorFilter} options={sectors.map((sector) => ({ value: sector.id, label: sector.name }))} />
        </div>
      </div>

      <div className="mms-kanban">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = filtered.filter((lead) => lead.stage === stage)
          return (
            <div key={stage} className={`mms-kanban__column mms-kanban__column--${stage.toLowerCase().replace(/\s+/g, '-')}`}>
              <header>
                <span className="mms-kanban__dot" />
                <strong>{stage}</strong>
                <em>{stageLeads.length}</em>
              </header>
              <div className="mms-kanban__cards">
                {stageLeads.map((lead) => <LeadKanbanCard key={lead.id} lead={lead} onOpen={() => setLeadId(lead.id)} />)}
                {!stageLeads.length ? <p className="mms-board__empty">No leads</p> : null}
              </div>
              {stage === 'Manager Review' && scope.roleId === 'manager' && stageLeads.length ? (
                <Button size="xs" variant="soft" block onClick={() => setHandoverLead(stageLeads[0])}>Send first to Sales</Button>
              ) : null}
            </div>
          )
        })}
      </div>

      <LeadDetailModal open={Boolean(leadId)} leadId={leadId} onClose={() => setLeadId(null)} />
      <HandoverModal open={Boolean(handoverLead)} lead={handoverLead} onClose={() => setHandoverLead(null)} />
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Follow-ups                                                          */
/* ------------------------------------------------------------------ */

export function FollowUpsPage() {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const [leadId, setLeadId] = useState<string | null>(null)
  const [complete, setComplete] = useState<MarketingFollowUp | null>(null)
  const [reschedule, setReschedule] = useState<MarketingFollowUp | null>(null)
  const [extension, setExtension] = useState<MarketingFollowUp | null>(null)
  const [inProgress, setInProgress] = useState<MarketingFollowUp | null>(null)
  const [tab, setTab] = useState('due')

  const scheduled = scope.followUps
    .filter((followUp) => followUp.status === 'Scheduled' || followUp.status === 'In Progress')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  const completed = scope.followUps
    .filter((followUp) => followUp.status === 'Completed')
    .sort((a, b) => new Date(b.completedAt ?? b.dueAt).getTime() - new Date(a.completedAt ?? a.dueAt).getTime())
  const overdue = scheduled.filter((followUp) => isOverdue(followUp.dueAt))
  const today = scheduled.filter((followUp) => !isOverdue(followUp.dueAt) && new Date(followUp.dueAt).toDateString() === new Date().toDateString())
  const upcoming = scheduled.filter((followUp) => !overdue.includes(followUp) && !today.includes(followUp))
  const inProgressList = scheduled.filter((followUp) => followUp.status === 'In Progress')
  const pendingExtensions = scope.followUps.filter((followUp) => (followUp.extensionRequests ?? []).some((request) => request.status === 'Pending'))
  const shown =
    tab === 'overdue' ? overdue : tab === 'today' ? today : tab === 'upcoming' ? upcoming : tab === 'completed' ? completed : tab === 'inprogress' ? inProgressList : scheduled

  const getLead = (followUp: MarketingFollowUp) => scope.leads.find((lead) => lead.id === followUp.leadId) ?? null

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow={scope.roleId === 'junior' ? 'Junior workspace' : 'Senior workspace'}
        title="Follow-ups"
        subtitle="Every customer conversation, next action and outcome recorded against the shared lead."
        meta={
          <div className="mms-header-meta">
            <span><CalendarClock size={13} /> {scheduled.length} open</span>
            <span><AlertTriangle size={13} /> {overdue.length} overdue</span>
            <span><CheckCircle2 size={13} /> {completed.length} completed</span>
            {pendingExtensions.length ? <span><AlertTriangle size={13} /> {pendingExtensions.length} extension requests</span> : null}
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Due today" value={today.length} icon={<CalendarClock size={18} />} tone="var(--chart-1)" hint="Customer conversations today" />
        <KpiCard label="Overdue" value={overdue.length} icon={<AlertTriangle size={18} />} tone="var(--chart-7)" hint="Contact the customer now" />
        <KpiCard label="Upcoming" value={upcoming.length} icon={<CalendarClock size={18} />} tone="var(--chart-4)" hint="Scheduled later" />
        <KpiCard label="Completed" value={completed.length} icon={<CheckCircle2 size={18} />} tone="var(--chart-2)" hint="Outcomes recorded" />
      </MmsKpiGrid>

      <div className="mms-toolbar-row mms-toolbar-row--wrap">
        <MmsTabs
          value={tab}
          onChange={setTab}
          ariaLabel="Follow-up filters"
          options={[
            { id: 'due', label: 'All open', count: scheduled.length },
            { id: 'overdue', label: 'Overdue', count: overdue.length },
            { id: 'today', label: 'Today', count: today.length },
            { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
            { id: 'inprogress', label: 'In progress', count: inProgressList.length },
            { id: 'completed', label: 'Completed', count: completed.length },
          ]}
        />
        <div className="mms-header-meta">
          <span><Phone size={13} /> Record every outcome</span>
        </div>
      </div>

      <MmsTwoCol variant="2-1">
        <SectionCard title="Follow-up queue" subtitle={`${shown.length} conversations in this view`}>
          <FollowUpList
            followUps={shown}
            leads={scope.leads}
            employees={department.employees}
            onOpenLead={(lead) => setLeadId(lead.id)}
            onComplete={(followUp) => setComplete(followUp)}
            onReschedule={(followUp) => setReschedule(followUp)}
            onExtension={(followUp) => setExtension(followUp)}
            onInProgress={(followUp) => setInProgress(followUp)}
            emptyTitle={tab === 'overdue' ? 'No overdue follow-ups' : 'No follow-ups in this view'}
          />
        </SectionCard>
        <div className="mms-stack">
          <SectionCard title="Conversation outcomes" subtitle="Most recent completed follow-ups" icon={<CheckCircle2 size={16} />}>
            <div className="mms-conversation-summary">
              {completed.slice(0, 4).map((followUp) => {
                const lead = getLead(followUp)
                return (
                  <button key={followUp.id} type="button" onClick={() => lead && setLeadId(lead.id)}>
                    <span>{lead?.name ?? 'Lead'}</span>
                    <strong>{followUp.result || 'Recorded'}</strong>
                    <small>{shortDate(followUp.completedAt ?? followUp.dueAt)}</small>
                  </button>
                )
              })}
              {!completed.length ? <p className="mms-empty-line">No follow-up outcomes recorded yet.</p> : null}
            </div>
          </SectionCard>
          <SectionCard title="Follow-up discipline" subtitle="Why every conversation is logged">
            <ul className="mms-rule-list">
              <li><CalendarClock size={14} /> Every follow-up has a due date, mode and owner.</li>
              <li><CheckCircle2 size={14} /> Recording an outcome moves a new lead into Follow-up automatically.</li>
              <li><ShieldCheck size={14} /> Full conversation history stays with the shared lead record.</li>
            </ul>
          </SectionCard>
        </div>
      </MmsTwoCol>

      {pendingExtensions.length ? (
        <SectionCard title="Extension requests" subtitle="Reason, proposed date and manager decision for every request" icon={<AlertTriangle size={16} />}>
          <div className="mms-request-list">
            {pendingExtensions.map((followUp) => {
              const lead = getLead(followUp)
              const request = (followUp.extensionRequests ?? []).find((item) => item.status === 'Pending')
              if (!request) return null
              return (
                <div key={request.id} className="mms-request-row">
                  <div>
                    <strong>{lead?.name ?? 'Lead'} · {request.kind === 'in-progress' ? 'In Progress review' : 'Extension request'}</strong>
                    <small>Original due {shortDate(followUp.originalDueAt ?? followUp.dueAt)}{request.proposedDueAt ? ` · Proposed ${shortDate(request.proposedDueAt)}` : ''}</small>
                    <p>{request.reason}</p>
                  </div>
                  {scope.roleId === 'manager' ? (
                    <div className="mms-row-actions">
                      <Button size="xs" variant="danger" onClick={() => department.decideFollowUpExtension(followUp.id, request.id, 'reject', scope.actor, 'Extension rejected by manager.')}>Reject</Button>
                      <Button size="xs" variant="primary" onClick={() => department.decideFollowUpExtension(followUp.id, request.id, 'approve', scope.actor, 'Extension approved by manager.')}>Approve</Button>
                    </div>
                  ) : (
                    <StatusChip status={request.status} tone="warning" />
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Team follow-up activity" subtitle="Open workload by owner" icon={<Users size={16} />}>
        <div className="mms-table-wrap">
          <table className="mms-table">
            <thead>
              <tr><th>Owner</th><th>Scheduled</th><th>Overdue</th><th>Completed</th><th>Discipline</th></tr>
            </thead>
            <tbody>
              {[...new Set(scheduled.map((followUp) => followUp.employeeId))].map((employeeId) => {
                const employee = department.employees.find((item) => item.id === employeeId)
                const own = scope.followUps.filter((followUp) => followUp.employeeId === employeeId)
                const ownScheduled = own.filter((followUp) => followUp.status === 'Scheduled' || followUp.status === 'In Progress')
                const ownCompleted = own.filter((followUp) => followUp.status === 'Completed')
                const ownOverdue = ownScheduled.filter((followUp) => isOverdue(followUp.dueAt))
                return (
                  <tr key={employeeId}>
                    <td><EmployeeAvatar employee={employee} /></td>
                    <td>{ownScheduled.length}</td>
                    <td className={ownOverdue.length ? 'mms-danger-text' : ''}>{ownOverdue.length}</td>
                    <td>{ownCompleted.length}</td>
                    <td><ProgressBar value={own.length ? (ownCompleted.length / own.length) * 100 : 0} size="sm" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!scheduled.length ? <p className="mms-empty-line">No scheduled follow-ups in scope.</p> : null}
        </div>
      </SectionCard>

      <LeadDetailModal open={Boolean(leadId)} leadId={leadId} onClose={() => setLeadId(null)} />
      <FollowUpModal open={Boolean(complete)} mode="complete" followUp={complete} lead={complete ? getLead(complete) : null} onClose={() => setComplete(null)} />
      <FollowUpModal open={Boolean(reschedule)} mode="reschedule" followUp={reschedule} lead={reschedule ? getLead(reschedule) : null} onClose={() => setReschedule(null)} />
      <FollowUpExtensionModal followUp={extension} onClose={() => setExtension(null)} />
      <FollowUpInProgressModal followUp={inProgress} onClose={() => setInProgress(null)} />
    </div>
  )
}

function FollowUpExtensionModal({ followUp, onClose }: { followUp: MarketingFollowUp | null; onClose: () => void }) {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const { pushToast } = useToast()
  const [reason, setReason] = useState('')
  const [proposedDueAt, setProposedDueAt] = useState('')
  const [decisionNote, setDecisionNote] = useState('')

  useEffect(() => {
    if (!followUp) return
    setReason('')
    setProposedDueAt(followUp.dueAt.slice(0, 10))
    setDecisionNote('')
  }, [followUp?.id])

  if (!followUp) return null
  const pending = (followUp.extensionRequests ?? []).find((request) => request.status === 'Pending')
  const canDecide = Boolean(pending) && scope.roleId === 'manager'

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={canDecide ? 'Manager extension decision' : 'Request follow-up extension'}
      description={
        canDecide
          ? 'The original due date remains in history. Approving moves the working due date to the proposed date.'
          : 'Explain why the follow-up cannot be completed on time and propose a new date for manager approval.'
      }
      footer={
        canDecide ? (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="danger" onClick={() => {
              department.decideFollowUpExtension(followUp.id, pending!.id, 'reject', scope.actor, decisionNote || 'Extension declined.')
              pushToast({ title: 'Extension rejected', description: 'The original follow-up due date remains in place.', tone: 'warning' })
              onClose()
            }}>Reject</Button>
            <Button variant="primary" onClick={() => {
              department.decideFollowUpExtension(followUp.id, pending!.id, 'approve', scope.actor, decisionNote || 'Extension approved.')
              pushToast({ title: 'Extension approved', description: `Follow-up moved to ${shortDate(pending!.proposedDueAt ?? followUp.dueAt)}.`, tone: 'success' })
              onClose()
            }}>Approve</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!reason.trim() || !proposedDueAt}
              onClick={() => {
                department.requestFollowUpExtension(followUp.id, reason, proposedDueAt, scope.actor)
                pushToast({ title: 'Extension requested', description: 'Your manager can now review the proposed due date.', tone: 'success' })
                onClose()
              }}
            >
              Submit request
            </Button>
          </>
        )
      }
    >
      <div className="mms-stack">
        <div className="mms-decision-summary">
          <div><span>Original due</span><strong>{shortDate(followUp.originalDueAt ?? followUp.dueAt)}</strong></div>
          <div><span>Current due</span><strong>{shortDate(followUp.dueAt)}</strong></div>
          <div><span>Mode</span><strong>{followUp.mode}</strong></div>
          <div><span>Status</span><strong>{followUp.status}</strong></div>
        </div>
        {canDecide && pending ? (
          <>
            <div className="mms-inline-callout">
              <strong>{pending.requestedByName} proposed {shortDate(pending.proposedDueAt)}</strong>
              <p>{pending.reason}</p>
            </div>
            <Field label="Manager decision note">
              <textarea rows={3} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Reason for extension" required>
              <textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why the follow-up needs more time…" />
            </Field>
            <Field label="Proposed due date" required hint="The original due date is preserved in history.">
              <input type="date" value={proposedDueAt} onChange={(event) => setProposedDueAt(event.target.value)} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  )
}

function FollowUpInProgressModal({ followUp, onClose }: { followUp: MarketingFollowUp | null; onClose: () => void }) {
  const department = useMarketingDepartment()
  const scope = useMmsScope()
  const { pushToast } = useToast()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (followUp) setReason('')
  }, [followUp?.id])

  if (!followUp) return null
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Mark follow-up In Progress"
      description="Use this when the customer conversation has started but needs more time. Your manager reviews the reason before the due date changes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!reason.trim()}
            onClick={() => {
              department.requestFollowUpInProgress(followUp.id, reason, scope.actor)
              pushToast({ title: 'In Progress requested', description: 'Your manager can review the reason.', tone: 'success' })
              onClose()
            }}
          >
            Submit for review
          </Button>
        </>
      }
    >
      <div className="mms-stack">
        <div className="mms-decision-summary">
          <div><span>Due</span><strong>{shortDate(followUp.dueAt)}</strong></div>
          <div><span>Mode</span><strong>{followUp.mode}</strong></div>
          <div><span>Owner</span><strong>{followUp.employeeId}</strong></div>
          <div><span>Status</span><strong>{followUp.status}</strong></div>
        </div>
        <Field label="Why is this still in progress?" required>
          <textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Customer asked for time, meeting overran, decision maker unavailable…" />
        </Field>
      </div>
    </Modal>
  )
}
