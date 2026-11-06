import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Plus,
  Power,
  Settings2,
  Target,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Field } from '../../components/ui/Form'
import { roleWorkspacePath } from '../../config/roleNavigation'
import { useMarketingDepartment } from '../../context/MarketingDepartmentContext'
import { useToast } from '../../context/ToastContext'
import {
  KpiCard,
  MmsPageHeader,
  MmsProgress,
  MmsTabs,
  SearchField,
  SectionCard,
  SectorChip,
  StatusChip,
  EmployeeAvatar,
  moneyCompact,
  useMmsActor,
  useMmsScope,
} from '../../components/marketing/management/MmsKit'
import {
  MmsKpiGrid,
  MmsTwoCol,
  SectorCard,
  TeamMemberCard,
  MmsKpiGrid as KpiGrid,
} from '../../components/marketing/management/MmsLists'
import {
  AddEmployeeModal,
  AssignSeniorModal,
  BudgetAllocationModal,
  SectorFormModal,
  SectorTargetsModal,
  TransferEmployeeModal,
} from '../../components/marketing/management/MmsModals'
import type { MarketingEmployee, MarketingSector } from '../../types/marketingDepartment'
import {
  budgetSummary,
  employeeStats,
  employeesInSector,
  leadStats,
  sectorStats,
  shortDate,
  taskStats,
} from '../../utils/marketingDepartment'
import { formatINR, formatINRCompact, formatPercent } from '../../utils/format'

/* ------------------------------------------------------------------ */
/* Manager: Marketing Department                                       */
/* ------------------------------------------------------------------ */

export function MarketingDepartmentPage() {
  const department = useMarketingDepartment()
  const actor = useMmsActor()
  const navigate = useNavigate()
  const [tab, setTab] = useState('sectors')
  const [query, setQuery] = useState('')
  const [sectorModal, setSectorModal] = useState<{ open: boolean; sector: MarketingSector | null }>({ open: false, sector: null })
  const [leaderModal, setLeaderModal] = useState<MarketingSector | null>(null)
  const [targetsModal, setTargetsModal] = useState<MarketingSector | null>(null)
  const [budgetModal, setBudgetModal] = useState<MarketingSector | null>(null)
  const [transferEmployee, setTransferEmployee] = useState<MarketingEmployee | null>(null)
  const [addEmployee, setAddEmployee] = useState<{ open: boolean; sectorId?: string | null; role?: 'junior' | 'senior' }>({ open: false })
  const [detail, setDetail] = useState<MarketingSector | null>(null)

  const sectors = department.sectors.filter((sector) =>
    `${sector.name} ${sector.code} ${sector.objective}`.toLowerCase().includes(query.toLowerCase()),
  )
  const budget = budgetSummary(department.sectors)
  const stats = leadStats(department.leads, department.followUps)
  const tasks = taskStats(department.tasks)
  const team = department.employees.filter((employee) => employee.role === 'senior' || employee.role === 'junior')
  const juniors = team.filter((employee) => employee.role === 'junior')
  const seniors = team.filter((employee) => employee.role === 'senior')

  const filteredTeam = team.filter((employee) =>
    `${employee.name} ${employee.email} ${employee.designation}`.toLowerCase().includes(query.toLowerCase()),
  )

  const sectorOptions = useMemo(
    () => department.sectors.map((sector) => ({ value: sector.id, label: sector.name })),
    [department.sectors],
  )

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow="Department structure"
        title="Marketing Department"
        subtitle="Create dynamic sectors, assign senior leaders, move juniors between teams and control targets and budgets."
        actions={
          <>
            <Button variant="soft" icon={<UserPlus size={15} />} onClick={() => setAddEmployee({ open: true })}>Add team member</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setSectorModal({ open: true, sector: null })}>Create sector</Button>
          </>
        }
        meta={
          <div className="mms-header-meta">
            <span><BriefcaseBusiness size={13} /> {department.sectors.filter((sector) => sector.status === 'Active').length} active sectors</span>
            <span><Users size={13} /> {juniors.length} juniors · {seniors.length} seniors</span>
            <span><Wallet size={13} /> {moneyCompact(budget.total)} department budget</span>
          </div>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Active sectors" value={department.sectors.filter((sector) => sector.status === 'Active').length} icon={<BriefcaseBusiness size={18} />} tone="var(--chart-1)" hint={`${department.sectors.length} sectors configured`} />
        <KpiCard label="Department leads" value={stats.total} icon={<Target size={18} />} tone="var(--chart-2)" hint={`${stats.qualified} qualified · ${stats.inPipeline} active`} />
        <KpiCard label="Team strength" value={team.length} icon={<UsersRound size={18} />} tone="var(--chart-3)" hint={`${juniors.length} juniors · ${seniors.length} seniors`} />
        <KpiCard label="Budget allocated" value={budget.utilisation} icon={<CircleDollarSign size={18} />} tone="var(--chart-5)" format={(value) => `${Math.round(value)}%`} hint={`${moneyCompact(budget.spent)} spent · ${moneyCompact(budget.remaining)} left`} />
      </MmsKpiGrid>

      <div className="mms-toolbar-row">
        <MmsTabs
          value={tab}
          onChange={setTab}
          ariaLabel="Department view"
          options={[
            { id: 'sectors', label: 'Sectors', count: department.sectors.length },
            { id: 'team', label: 'People', count: team.length },
            { id: 'budget', label: 'Targets & budget', count: department.sectors.length },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search sectors or people…" />
      </div>

      {tab === 'sectors' ? (
        <div className="mms-sector-grid mms-sector-grid--wide">
          {sectors.map((sector) => {
            const sectorStat = sectorStats(sector, department.employees, department.leads, department.tasks)
            return (
              <SectorCard
                key={sector.id}
                sector={sector}
                employees={department.employees}
                leads={department.leads}
                tasks={department.tasks}
                onOpen={() => setDetail(sector)}
                actions={
                  <>
                    <Button size="xs" variant="ghost" onClick={() => setSectorModal({ open: true, sector })}>Edit</Button>
                    <Button size="xs" variant="ghost" onClick={() => setLeaderModal(sector)}>Leader</Button>
                    <Button size="xs" variant="ghost" onClick={() => setTargetsModal(sector)}>Targets</Button>
                    <Button size="xs" variant="ghost" onClick={() => setBudgetModal(sector)}>Budget</Button>
                    <Button
                      size="xs"
                      variant={sector.status === 'Deactivated' ? 'soft' : 'ghost'}
                      onClick={() => department.deactivateSector(sector.id)}
                      title={sector.status === 'Deactivated' ? 'Reactivate sector' : 'Deactivate sector'}
                    >
                      <Power size={12} />
                    </Button>
                  </>
                }
              />
            )
          })}
          {!sectors.length ? (
            <SectionCard title="No sectors match" subtitle="Clear the search or create a new sector.">
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setSectorModal({ open: true, sector: null })}>Create sector</Button>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {tab === 'team' ? (
        <SectionCard
          title="Department people"
          subtitle="Seniors lead sectors; juniors can be transferred without losing their lead history."
          actions={<Button size="xs" variant="soft" icon={<UserPlus size={12} />} onClick={() => setAddEmployee({ open: true })}>Add member</Button>}
        >
          <div className="mms-person-grid mms-person-grid--wide">
            {filteredTeam.map((employee) => (
              <div key={employee.id} className="mms-people-card">
                <TeamMemberCard
                  employee={employee}
                  leads={department.leads}
                  tasks={department.tasks}
                  followUps={department.followUps}
                  activities={department.activities}
                  onOpen={() => navigate(roleWorkspacePath('performance'))}
                />
                <div className="mms-people-card__actions">
                  <Button size="xs" variant="ghost" onClick={() => setTransferEmployee(employee)}>Transfer sector</Button>
                  <SectorChip sector={department.sectors.find((sector) => sector.id === employee.sectorId)} compact />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === 'budget' ? (
        <MmsTwoCol variant="2-1">
          <SectionCard title="Sector targets and budget" subtitle="Manager-level controls. Financial changes still require Finance/Admin approval.">
            <div className="mms-table-wrap">
              <table className="mms-table">
                <thead>
                  <tr>
                    <th>Sector</th>
                    <th>Lead target</th>
                    <th>Activity target</th>
                    <th>Budget</th>
                    <th>Used</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {department.sectors.map((sector) => {
                    const sectorStat = sectorStats(sector, department.employees, department.leads, department.tasks)
                    return (
                      <tr key={sector.id}>
                        <td><SectorChip sector={sector} /></td>
                        <td>{sector.monthlyLeadTarget}</td>
                        <td>{sector.monthlyActivityTarget}</td>
                        <td>{formatINR(sector.budget)}</td>
                        <td>
                          <div className="mms-target-cell">
                            <span>{formatPercent(sectorStat.budgetUtilisation)}</span>
                            <MmsProgress value={Math.min(100, sectorStat.budgetUtilisation)} />
                          </div>
                        </td>
                        <td>
                          <div className="mms-table__actions">
                            <Button size="xs" variant="ghost" onClick={() => setTargetsModal(sector)}>Targets</Button>
                            <Button size="xs" variant="ghost" onClick={() => setBudgetModal(sector)}>Budget</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <SectionCard title="Budget summary" subtitle="Department-level view">
            <div className="mms-amount-grid">
              <div><span>Total allocated</span><strong>{formatINR(budget.total)}</strong></div>
              <div><span>Spent</span><strong>{formatINR(budget.spent)}</strong></div>
              <div><span>Remaining</span><strong>{formatINR(budget.remaining)}</strong></div>
              <div><span>Utilisation</span><strong>{formatPercent(budget.utilisation)}</strong></div>
            </div>
            <div className="mms-divider" />
            <p className="mms-empty-line">
              Managers can allocate and adjust sector budgets for planning. Any new funding request must be submitted to the Approval Center and approved by Finance/Admin before spend.
            </p>
            <Button variant="soft" block onClick={() => navigate(roleWorkspacePath('budgets'))}>Open budget management</Button>
          </SectionCard>
        </MmsTwoCol>
      ) : null}

      <SectionCard title="Department activity" subtitle="Structural changes and deliveries" actions={<Button size="xs" variant="ghost" onClick={() => navigate(roleWorkspacePath('reports'))}>Reports <ArrowRight size={12} /></Button>}>
        <div className="mms-audit-strip">
          {department.activities.slice(0, 6).map((activity) => (
            <div key={activity.id}>
              <span>{shortDate(activity.at)}</span>
              <strong>{activity.title}</strong>
              <small>{activity.employeeName}</small>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectorFormModal open={sectorModal.open} sector={sectorModal.sector} onClose={() => setSectorModal({ open: false, sector: null })} />
      <AssignSeniorModal open={Boolean(leaderModal)} sector={leaderModal} onClose={() => setLeaderModal(null)} />
      <SectorTargetsModal open={Boolean(targetsModal)} sector={targetsModal} onClose={() => setTargetsModal(null)} />
      <BudgetAllocationModal open={Boolean(budgetModal)} sector={budgetModal} onClose={() => setBudgetModal(null)} />
      <TransferEmployeeModal open={Boolean(transferEmployee)} employee={transferEmployee} onClose={() => setTransferEmployee(null)} />
      <AddEmployeeModal
        open={addEmployee.open}
        sectorId={addEmployee.sectorId}
        lockedRole={addEmployee.role}
        onClose={() => setAddEmployee({ open: false })}
      />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="xl"
        title={detail?.name ?? 'Sector'}
        description={detail?.objective}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            {detail ? (
              <>
                <Button variant="soft" onClick={() => { setLeaderModal(detail); setDetail(null) }}>Change leader</Button>
                <Button variant="primary" onClick={() => { setSectorModal({ open: true, sector: detail }); setDetail(null) }}>Edit sector</Button>
              </>
            ) : null}
          </>
        }
      >
        {detail ? (
          <div className="mms-sector-detail">
            <div className="mms-sector-detail__head">
              <SectorChip sector={detail} />
              <StatusChip status={detail.status} />
              <Badge tone="info" dot>{detail.code}</Badge>
              <Badge tone={detail.priority === 'Urgent' ? 'danger' : detail.priority === 'High' ? 'warning' : 'neutral'}>{detail.priority} priority</Badge>
            </div>
            <div className="mms-profile-grid">
              <div className="mms-profile-stat"><span>Team</span><strong>{employeesInSector(department.employees, detail.id).length}</strong><small>{employeesInSector(department.employees, detail.id).filter((item) => item.role === 'junior').length} juniors</small></div>
              <div className="mms-profile-stat"><span>Leads captured</span><strong>{department.leads.filter((lead) => lead.sectorId === detail.id).length}</strong><small>of {detail.monthlyLeadTarget} target</small></div>
              <div className="mms-profile-stat"><span>Budget</span><strong>{formatINRCompact(detail.budget)}</strong><small>{moneyCompact(detail.spent)} spent</small></div>
              <div className="mms-profile-stat"><span>Active tasks</span><strong>{department.tasks.filter((task) => task.sectorId === detail.id && task.status !== 'Completed').length}</strong><small>{department.tasks.filter((task) => task.sectorId === detail.id && task.status === 'Completed').length} completed</small></div>
            </div>
            <div className="mms-detail-block">
              <h3>Sector objective</h3>
              <p>{detail.objective}</p>
              <h3>Description</h3>
              <p>{detail.description}</p>
              <div className="mms-detail-grid">
                <div><span>Leader</span><strong>{department.employees.find((employee) => employee.id === detail.leaderId)?.name ?? 'Unassigned'}</strong></div>
                <div><span>Start date</span><strong>{shortDate(detail.startDate)}</strong></div>
                <div><span>End date</span><strong>{shortDate(detail.endDate)}</strong></div>
                <div><span>Activity target</span><strong>{detail.monthlyActivityTarget} / month</strong></div>
              </div>
            </div>
            <div className="mms-detail-block">
              <h3>Junior team</h3>
              <div className="mms-person-grid">
                {employeesInSector(department.employees, detail.id).filter((employee) => employee.role === 'junior').map((employee) => {
                  const employeeStat = employeeStats(employee, department.leads, department.tasks, department.followUps, department.activities)
                  return (
                    <div key={employee.id} className="mms-person-mini">
                      <EmployeeAvatar employee={employee} size="md" />
                      <div><strong>{employee.name}</strong><small>{employeeStat.leadsGenerated} leads · {employeeStat.pendingTasks} open tasks</small></div>
                    </div>
                  )
                })}
                {!employeesInSector(department.employees, detail.id).filter((employee) => employee.role === 'junior').length ? <p className="mms-empty-line">No juniors assigned.</p> : null}
              </div>
              <Button size="sm" variant="soft" icon={<UserPlus size={13} />} onClick={() => { setAddEmployee({ open: true, sectorId: detail.id, role: 'junior' }); setDetail(null) }}>Add junior to sector</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Senior: My Sector                                                   */
/* ------------------------------------------------------------------ */

export function SeniorSectorPage() {
  const department = useMarketingDepartment()
  const { mySectors, team, leads, tasks, followUps } = useMmsScope()
  const navigate = useNavigate()
  const sector = mySectors[0]

  if (!sector) {
    return (
      <div className="mms-page">
        <MmsPageHeader eyebrow="Senior workspace" title="My Sector" subtitle="You are not currently leading an active sector." />
        <SectionCard title="No sector assigned" subtitle="The marketing manager controls sector ownership.">
          <p className="mms-empty-line">Ask your manager to assign you as a sector leader. Until then, manager work assigned to you still appears in My Tasks.</p>
          <Button variant="primary" onClick={() => navigate(roleWorkspacePath('tasks'))}>Open my tasks</Button>
        </SectionCard>
      </div>
    )
  }

  const stat = sectorStats(sector, department.employees, department.leads, department.tasks)
  const leadSummary = leadStats(leads, followUps)
  const taskSummary = taskStats(tasks)
  const budget = budgetSummary([sector])
  const sectorFollowUps = followUps.filter((followUp) => followUp.status === 'Scheduled')
  const sectorCampaigns = department.campaigns.filter((campaign) => campaign.sectorId === sector.id)

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow="Senior workspace"
        title={sector.name}
        subtitle={sector.objective}
        actions={
          <>
            <Button variant="soft" icon={<UserPlus size={15} />} onClick={() => navigate(roleWorkspacePath('team'))}>Manage team</Button>
            <Button variant="primary" icon={<Settings2 size={15} />} onClick={() => navigate(roleWorkspacePath('assignment'))}>Assign work</Button>
          </>
        }
        meta={
          <div className="mms-header-meta">
            <SectorChip sector={sector} />
            <StatusChip status={sector.status} />
            <span>{shortDate(sector.startDate)} – {shortDate(sector.endDate)}</span>
          </div>
        }
      />

      <KpiGrid columns={5}>
        <KpiCard label="Sector leads" value={leadSummary.total} icon={<Target size={18} />} tone="var(--chart-2)" hint={`${leadSummary.qualified} qualified`} />
        <KpiCard label="Target progress" value={Math.min(160, stat.targetAchievement)} icon={<Settings2 size={18} />} tone="var(--chart-1)" format={(value) => `${Math.round(value)}%`} hint={`${stat.totalLeads} of ${sector.monthlyLeadTarget}`} />
        <KpiCard label="Team" value={team.length} icon={<Users size={18} />} tone="var(--chart-3)" hint={`${stat.juniors} juniors`} />
        <KpiCard label="Open tasks" value={taskSummary.pending} icon={<BriefcaseBusiness size={18} />} tone="var(--chart-4)" hint={`${taskSummary.overdue} overdue`} />
        <KpiCard label="Budget used" value={budget.utilisation} icon={<CircleDollarSign size={18} />} tone="var(--chart-5)" format={(value) => `${Math.round(value)}%`} hint={`${moneyCompact(budget.remaining)} remaining`} />
      </KpiGrid>

      <MmsTwoCol variant="2-1">
        <SectionCard title="Sector execution" subtitle="Leads, tasks and campaign delivery for this sector">
          <div className="mms-execution-grid">
            <div>
              <MmsProgress label="Monthly lead target" value={Math.min(100, stat.targetAchievement)} />
              <MmsProgress label="Budget utilisation" value={Math.min(100, budget.utilisation)} />
              <MmsProgress label="Task completion" value={taskSummary.completion} />
              <MmsProgress label="Qualification rate" value={leadSummary.qualificationRate} />
            </div>
            <div className="mms-execution-stats">
              <div><span>Qualified</span><strong>{stat.qualifiedLeads}</strong></div>
              <div><span>Conversions</span><strong>{stat.conversions}</strong></div>
              <div><span>Follow-ups</span><strong>{sectorFollowUps.length}</strong></div>
              <div><span>Campaigns</span><strong>{sectorCampaigns.length}</strong></div>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Budget" subtitle="Manager and Finance control funding" icon={<Wallet size={16} />}>
          <div className="mms-amount-grid">
            <div><span>Allocated</span><strong>{formatINR(sector.budget)}</strong></div>
            <div><span>Spent</span><strong>{formatINR(sector.spent)}</strong></div>
            <div><span>Remaining</span><strong>{formatINR(budget.remaining)}</strong></div>
            <div><span>Utilisation</span><strong>{formatPercent(budget.utilisation)}</strong></div>
          </div>
          <p className="mms-empty-line">Seniors cannot change manager-level sector budgets. Any additional funding must go through the manager and Finance/Admin.</p>
        </SectionCard>
      </MmsTwoCol>

      <SectionCard title="Junior team" subtitle="Sector delivery and workload" icon={<Users size={16} />} actions={<Button size="xs" variant="ghost" onClick={() => navigate(roleWorkspacePath('team'))}>Manage <ArrowRight size={12} /></Button>}>
        <div className="mms-person-grid">
          {team.map((member) => (
            <TeamMemberCard
              key={member.id}
              employee={member}
              leads={leads}
              tasks={tasks}
              followUps={followUps}
              activities={department.activities}
              onOpen={() => navigate(roleWorkspacePath('team'))}
            />
          ))}
          {!team.length ? <p className="mms-empty-line">No juniors assigned to this sector.</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Campaigns in this sector" subtitle="Live delivery and lead attribution" icon={<Target size={16} />} actions={<Button size="xs" variant="ghost" onClick={() => navigate(roleWorkspacePath('campaigns'))}>Open campaigns <ArrowRight size={12} /></Button>}>
        <div className="mms-stack">
          {sectorCampaigns.map((campaign) => (
            <div key={campaign.id} className="mms-mini-row">
              <span className="mms-mini-row__icon"><Target size={14} /></span>
              <div><strong>{campaign.name}</strong><small>{campaign.status} · {formatINRCompact(campaign.budget)} · {campaign.expectedLeads} target leads</small></div>
              <StatusChip status={campaign.status} />
            </div>
          ))}
          {!sectorCampaigns.length ? <p className="mms-empty-line">No campaigns for this sector.</p> : null}
        </div>
      </SectionCard>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Senior: Team Management                                             */
/* ------------------------------------------------------------------ */

export function SeniorTeamPage() {
  const department = useMarketingDepartment()
  const { team, leads, tasks, followUps, mySectors, profile } = useMmsScope()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [transfer, setTransfer] = useState<MarketingEmployee | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const sector = mySectors[0]
  const myTeamRequests = department.teamRequests.filter((request) => request.seniorId === profile.employeeId)

  const filtered = team.filter((employee) => `${employee.name} ${employee.designation}`.toLowerCase().includes(query.toLowerCase()))
  const availableLeads = leads.filter((lead) => !lead.handover && !['Won', 'Lost', 'Rejected'].includes(lead.stage))

  return (
    <div className="mms-page">
      <MmsPageHeader
        eyebrow="Senior workspace"
        title="Team Management"
        subtitle={`Manage the junior team delivering ${sector?.name ?? 'your sector'} without changing manager-level structure or budgets.`}
        actions={
          <>
            <Button variant="soft" icon={<UserPlus size={15} />} onClick={() => setAddOpen(true)}>Request team member</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate(roleWorkspacePath('assignment'))}>Assign work</Button>
          </>
        }
      />

      <MmsKpiGrid columns={4}>
        <KpiCard label="Team size" value={team.length} icon={<Users size={18} />} tone="var(--chart-2)" hint={sector?.name ?? 'No sector'} />
        <KpiCard label="Active leads" value={availableLeads.length} icon={<Target size={18} />} tone="var(--chart-1)" hint={`${leads.filter((lead) => lead.assignedJuniorId).length} assigned to juniors`} />
        <KpiCard label="Open tasks" value={taskStats(tasks).pending} icon={<BriefcaseBusiness size={18} />} tone="var(--chart-3)" hint={`${taskStats(tasks).overdue} overdue`} />
        <KpiCard label="Follow-ups" value={followUps.filter((followUp) => followUp.status === 'Scheduled').length} icon={<Target size={18} />} tone="var(--chart-4)" hint="Scheduled across the team" />
      </MmsKpiGrid>

      <SectionCard
        title="My junior team"
        subtitle="Profiles, workload and target progress"
        actions={<SearchField value={query} onChange={setQuery} placeholder="Search team…" />}
      >
        <div className="mms-person-grid mms-person-grid--wide">
          {filtered.map((member) => (
            <TeamMemberCard
              key={member.id}
              employee={member}
              leads={leads}
              tasks={tasks}
              followUps={followUps}
              activities={department.activities}
              onOpen={() => navigate(roleWorkspacePath('performance'))}
            />
          ))}
          {!filtered.length ? <p className="mms-empty-line">No team members match your search.</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Workload allocation" subtitle="Balance lead ownership and open tasks" icon={<UsersRound size={16} />}>
        <div className="mms-table-wrap">
          <table className="mms-table">
            <thead>
              <tr>
                <th>Junior</th>
                <th>Active leads</th>
                <th>Open tasks</th>
                <th>Follow-ups</th>
                <th>Target</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {team.map((member) => {
                const memberLeads = leads.filter((lead) => lead.assignedJuniorId === member.id && !lead.handover)
                const memberTasks = tasks.filter((task) => task.assignedJuniorId === member.id && task.status !== 'Completed')
                const memberFollowUps = followUps.filter((followUp) => followUp.employeeId === member.id && followUp.status === 'Scheduled')
                const employeeStat = employeeStats(member, leads, tasks, followUps, department.activities)
                return (
                  <tr key={member.id}>
                    <td><EmployeeAvatar employee={member} /></td>
                    <td>{memberLeads.length}</td>
                    <td>{memberTasks.length}</td>
                    <td>{memberFollowUps.length}</td>
                    <td>{formatPercent(employeeStat.targetAchievement)}</td>
                    <td>
                      <div className="mms-table__actions">
                        <Button size="xs" variant="ghost" onClick={() => navigate(roleWorkspacePath('assignment'))}>Assign</Button>
                        <Button size="xs" variant="ghost" onClick={() => setTransfer(member)}>Move sector</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Team member requests" subtitle="Requests for additional junior capacity with manager status" icon={<UserPlus size={16} />}>
        <div className="mms-request-list">
          {myTeamRequests.length ? myTeamRequests.map((request) => (
            <div key={request.id} className="mms-request-row">
              <div>
                <strong>{request.employeeName}</strong>
                <small>{request.employeeEmail} · {request.targetLeads} lead target · requested {shortDate(request.requestedAt)}</small>
                <p>{request.reason}</p>
                {request.decisionNote ? <p className="mms-audit-note">Manager note: {request.decisionNote}</p> : null}
              </div>
              <StatusChip status={request.status} tone={request.status === 'Approved' ? 'success' : request.status === 'Rejected' ? 'danger' : 'warning'} />
            </div>
          )) : <p className="mms-empty-line">No team-member requests raised yet.</p>}
        </div>
      </SectionCard>

      <TeamRequestModal open={addOpen} sectorId={sector?.id} onClose={() => setAddOpen(false)} />
      <TransferEmployeeModal open={Boolean(transfer)} employee={transfer} onClose={() => setTransfer(null)} />
    </div>
  )
}

function TeamRequestModal({ open, onClose, sectorId }: { open: boolean; onClose: () => void; sectorId?: string }) {
  const { createTeamRequest } = useMarketingDepartment()
  const actor = useMmsActor()
  const { pushToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [targetLeads, setTargetLeads] = useState(100)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Request a team member"
      description="Send a junior capacity request to the manager. The employee is added to your sector only after manager approval."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!name.trim() || !email.includes('@') || !reason.trim() || !sectorId}
            onClick={() => {
              createTeamRequest({ employeeName: name, employeeEmail: email, reason, targetLeads, sectorId: sectorId ?? '' }, actor)
              pushToast({ title: 'Team request submitted', description: 'The manager can approve or reject the request.', tone: 'success' })
              onClose()
            }}
          >
            Submit request
          </Button>
        </>
      }
    >
      <div className="mms-stack">
        <Field label="Proposed employee name" required>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New junior executive" />
        </Field>
        <Field label="Email" required>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@totallyerp.com" />
        </Field>
        <Field label="Reason for additional capacity" required>
          <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lead volume, campaign workload, coverage gap…" />
        </Field>
        <Field label="Monthly lead target">
          <input type="number" min={0} step={10} value={targetLeads} onChange={(event) => setTargetLeads(Number(event.target.value))} />
        </Field>
      </div>
    </Modal>
  )
}
