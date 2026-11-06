import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  CalendarClock,
  Download,
  Film,
  Handshake,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
  Plus,
  Printer,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDemoData } from '../context/DemoDataContext'
import { useToast } from '../context/ToastContext'
import type { Agency, Influencer, PartnerCategory } from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { DataTable } from '../components/ui/DataTable'
import { SectionCard } from '../components/ui/SectionCard'
import { AvatarWithName } from '../components/ui/Avatar'
import { ProgressBar } from '../components/ui/ProgressBar'
import {
  ChartCard,
  ChartTooltip,
  LegendItem,
  PieLegend,
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
import { campaignName } from '../data/marketing'
import { downloadCsv } from '../utils/csv'
import { dateOnlyFromNow } from '../utils/dates'
import { formatDate, formatINR, formatINRCompact, formatNumber, formatPercent, uid } from '../utils/format'

const PARTNER_CATEGORIES: PartnerCategory[] = [
  'Creative Agency',
  'Media Agency',
  'Influencer',
  'Production House',
  'Printing Vendor',
  'Event Organizer',
]

const CONTRACT_STATUSES: Agency['contractStatus'][] = ['Active', 'Expiring', 'Expired', 'Draft']
const CONTACT_STATUSES: Influencer['contactStatus'][] = [
  'Not Contacted',
  'Contacted',
  'Negotiating',
  'Confirmed',
  'Declined',
]

type PartnerFormValues = {
  name: string
  category: PartnerCategory
  contactPerson: string
  email: string
  phone: string
  location: string
  notes: string
}

const categoryIcons: Record<PartnerCategory, typeof Handshake> = {
  'Creative Agency': Sparkles,
  'Media Agency': TrendingUp,
  Influencer: Users,
  'Production House': Film,
  'Printing Vendor': Printer,
  'Event Organizer': PartyPopper,
}

export function AgenciesPartnersPage({ tab }: { tab: string }) {
  const { data, update, addNotification } = useDemoData()
  const { pushToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const chartAnim = useChartAnimation()
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addCategory, setAddCategory] = useState<PartnerCategory>('Creative Agency')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [contactFilter, setContactFilter] = useState('All')

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setAddCategory(tab === 'printing-vendors' ? 'Printing Vendor' : tab === 'event-organizers' ? 'Event Organizer' : tab === 'production-houses' ? 'Production House' : 'Creative Agency')
      setAddOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, tab])

  const activePartner = data.agencies.find((agency) => agency.id === partnerId) ?? null

  const scoredPartners = useMemo(
    () => data.agencies.filter((agency) => agency.performanceScore > 0).sort((a, b) => b.performanceScore - a.performanceScore),
    [data.agencies],
  )

  const filteredBench = data.influencers.filter(
    (influencer) => contactFilter === 'All' || influencer.contactStatus === contactFilter,
  )

  const categoryData = PARTNER_CATEGORIES.map((category, index) => ({
    name: category,
    value: data.agencies.filter((agency) => agency.category === category).length,
    color: chartColors[index % chartColors.length],
  })).filter((entry) => entry.value > 0)

  const contractStatusData = CONTRACT_STATUSES.map((status, index) => ({
    name: status,
    value: data.agencies.filter((agency) => agency.contractStatus === status).length,
    color: chartColors[index % chartColors.length],
  })).filter((entry) => entry.value > 0)

  const activePartners = data.agencies.filter((agency) => agency.contractStatus === 'Active')
  const expiringPartners = data.agencies.filter((agency) => agency.contractStatus === 'Expiring' || agency.contractStatus === 'Expired')
  const averageScore = scoredPartners.length
    ? scoredPartners.reduce((sum, agency) => sum + agency.performanceScore, 0) / scoredPartners.length
    : null
  const assignedCampaignCount = new Set(data.agencies.flatMap((agency) => agency.assignedCampaigns)).size

  const openAdd = (category: PartnerCategory = 'Creative Agency') => {
    setAddCategory(category)
    setAddOpen(true)
  }

  const setContractStatus = (partner: Agency, contractStatus: Agency['contractStatus']) => {
    update('agencies', (current) => current.map((item) => (item.id === partner.id ? { ...item, contractStatus } : item)))
    pushToast({
      title: 'Partner contract status updated',
      description: `${partner.name} is now ${contractStatus} in local demo data. No contract system is connected.`,
      tone: 'success',
    })
  }

  const addPartner = (values: PartnerFormValues) => {
    const partner: Agency = {
      id: uid('AG'),
      name: values.name.trim(),
      category: values.category,
      contactPerson: values.contactPerson.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      location: values.location.trim(),
      assignedCampaigns: [],
      contractStatus: 'Draft',
      performanceScore: 0,
      completion: 0,
      budgetAdherence: 0,
      quality: 0,
      timeliness: 0,
      notes: values.notes.trim(),
    }
    update('agencies', (current) => [partner, ...current])
    addNotification({
      title: 'Partner added to demo directory',
      body: `${partner.name} (${partner.category}) was added locally. No vendor onboarding was started.`,
      kind: 'system',
      href: '/marketing/agencies/agencies',
    })
    pushToast({
      title: 'Partner added locally',
      description: `${partner.name} is a draft demo vendor. No contract or onboarding workflow was created.`,
      tone: 'success',
    })
    setAddOpen(false)
  }

  const updateInfluencerContact = (influencer: Influencer, contactStatus: Influencer['contactStatus']) => {
    update('influencers', (current) =>
      current.map((item) => (item.id === influencer.id ? { ...item, contactStatus } : item)),
    )
    pushToast({
      title: 'Creator contact status updated',
      description: `${influencer.name} marked ${contactStatus}. No message or outreach was sent.`,
      tone: 'success',
    })
  }

  const exportPartners = (rows: Agency[], label = 'partners') => {
    const result = downloadCsv(`agencies-${label}-demo`, [
      { header: 'ID', value: (row: Agency) => row.id },
      { header: 'Name', value: (row: Agency) => row.name },
      { header: 'Category', value: (row: Agency) => row.category },
      { header: 'Contact', value: (row: Agency) => row.contactPerson },
      { header: 'Email', value: (row: Agency) => row.email },
      { header: 'Phone', value: (row: Agency) => row.phone },
      { header: 'Location', value: (row: Agency) => row.location },
      { header: 'Campaigns', value: (row: Agency) => row.assignedCampaigns.join(' | ') },
      { header: 'Contract', value: (row: Agency) => row.contractStatus },
      { header: 'Performance score', value: (row: Agency) => row.performanceScore },
      { header: 'Completion', value: (row: Agency) => row.completion },
      { header: 'Budget adherence', value: (row: Agency) => row.budgetAdherence },
      { header: 'Quality', value: (row: Agency) => row.quality },
      { header: 'Timeliness', value: (row: Agency) => row.timeliness },
    ], rows)
    pushToast({
      title: result.ok ? 'Partner CSV exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  const exportBench = () => {
    const result = downloadCsv('creator-bench-demo', [
      { header: 'ID', value: (row: Influencer) => row.id },
      { header: 'Name', value: (row: Influencer) => row.name },
      { header: 'Handle', value: (row: Influencer) => row.handle },
      { header: 'Category', value: (row: Influencer) => row.category },
      { header: 'Audience', value: (row: Influencer) => row.audience },
      { header: 'Followers', value: (row: Influencer) => row.followers },
      { header: 'Estimated fee', value: (row: Influencer) => row.estimatedFee },
      { header: 'Contact status', value: (row: Influencer) => row.contactStatus },
      { header: 'Performance', value: (row: Influencer) => row.performanceScore },
      { header: 'Engagement %', value: (row: Influencer) => row.engagementRate },
    ], filteredBench)
    pushToast({ title: result.ok ? 'Creator bench exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const partnerModal = activePartner ? (
    <PartnerModal
      partner={activePartner}
      onClose={() => setPartnerId(null)}
      onContractStatus={(status) => setContractStatus(activePartner, status)}
    />
  ) : null

  const addModal = addOpen ? (
    <AddPartnerModal
      open
      defaultCategory={addCategory}
      onClose={() => setAddOpen(false)}
      onSave={addPartner}
    />
  ) : null

  const renderPartnerGrid = (categories: PartnerCategory[], label: string) => {
    const partners = data.agencies.filter((agency) => categories.includes(agency.category))
    return (
      <div className="stack-16">
        <TabIntro
          title={label}
          description="Partner contacts, contract states and sample performance signals. No vendor is actually contacted or contracted from this demo."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportPartners(partners, label.toLowerCase().replace(/\s+/g, '-'))}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => openAdd(categories[0])}>Add partner</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Partners" value={partners.length} sub={`${partners.filter((agency) => agency.contractStatus === 'Active').length} active contracts`} icon={<Handshake size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Average score" value={formatPercent(partners.filter((agency) => agency.performanceScore > 0).length ? partners.filter((agency) => agency.performanceScore > 0).reduce((sum, agency) => sum + agency.performanceScore, 0) / partners.filter((agency) => agency.performanceScore > 0).length : null, 0)} sub="Only scored demo partners" icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Assigned campaigns" value={new Set(partners.flatMap((agency) => agency.assignedCampaigns)).size} sub="Campaign links in demo data" icon={<Sparkles size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Contract attention" value={partners.filter((agency) => agency.contractStatus !== 'Active').length} sub="Draft, expiring or expired" icon={<CalendarClock size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <EntityGrid columns={3}>
          {partners.map((partner) => {
            const Icon = categoryIcons[partner.category]
            return (
              <EntityCard
                key={partner.id}
                title={partner.name}
                subtitle={`${partner.category} · ${partner.location}`}
                badge={<StatusBadge status={partner.contractStatus} />}
                meta={<><span>{partner.assignedCampaigns.length} campaign{partner.assignedCampaigns.length === 1 ? '' : 's'}</span><span>{partner.performanceScore > 0 ? `${partner.performanceScore}/100 score` : 'Not yet scored'}</span></>}
                onClick={() => setPartnerId(partner.id)}
              >
                <div className="row-8" style={{ alignItems: 'center' }}>
                  <span className="metric-card__icon" style={{ '--metric-tone': 'var(--brand)' } as CSSProperties}><Icon size={15} /></span>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs">{partner.contactPerson}</p>
                    <p className="text-xs muted truncate">{partner.email}</p>
                  </div>
                </div>
                {partner.performanceScore > 0 ? (
                  <div className="mt-10">
                    <ScoreRow label="Sample performance" value={partner.performanceScore} />
                  </div>
                ) : null}
              </EntityCard>
            )
          })}
        </EntityGrid>
        <DataNote>Contact details, emails and scores are fictional demo values. No outreach, contract or payment action is connected.</DataNote>
        {partnerModal}
        {addModal}
      </div>
    )
  }

  if (tab === 'overview') {
    return (
      <div className="stack-20">
        <TabIntro
          title="Partner ecosystem overview"
          description="See the sample agency, creator, production, print and event partner bench alongside contract and performance signals."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportPartners(data.agencies, 'overview')}>Export directory</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => openAdd()}>Add partner</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Active partners" value={activePartners.length} sub={`${data.agencies.length} partners in the demo directory`} icon={<Handshake size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Average performance" value={formatPercent(averageScore, 0)} sub={`${scoredPartners.length} partners with a demo score`} icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Linked campaigns" value={assignedCampaignCount} sub="Unique campaign references" icon={<Sparkles size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Contract attention" value={expiringPartners.length} sub="Expiring or expired in demo" icon={<CalendarClock size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Partner mix" subtitle="Directory composition by partner type" height="md" isEmpty={categoryData.length === 0}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={3} stroke="none" isAnimationActive={chartAnim}>
                {categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} partners`} />} />
            </PieChart>
          </ChartCard>
          <ChartCard
            title="Top demo performers"
            subtitle="Sample performance scores, not a live vendor rating"
            height="md"
            isEmpty={scoredPartners.length === 0}
            legend={<><LegendItem color="var(--chart-1)" label="Performance score" /><LegendItem color="var(--chart-8)" label="80 / 100" /></>}
          >
            <BarChart data={scoredPartners.slice(0, 6).map((partner) => ({ name: partner.name.split(' ')[0], score: partner.performanceScore }))} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 0 }}>
              <CartesianGrid {...gridProps} vertical horizontal={false} />
              <XAxis type="number" domain={[0, 100]} {...axisProps} />
              <YAxis type="category" dataKey="name" width={68} {...axisProps} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} / 100`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="score" name="Performance" fill="var(--chart-1)" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
        </div>

        <div className="dashboard-grid dashboard-grid--equal">
          <SectionCard title="Contract watchlist" subtitle="Demo partners that need attention." actions={<Button variant="ghost" size="xs" onClick={() => exportPartners(expiringPartners, 'contract-watchlist')}>Export</Button>}>
            <div className="stack-10">
              {expiringPartners.length === 0 ? <p className="empty-inline">No contracts need attention.</p> : expiringPartners.map((partner) => (
                <button key={partner.id} type="button" className="campaign-mini" onClick={() => setPartnerId(partner.id)}>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="campaign-mini__name truncate">{partner.name}</span>
                    <span className="campaign-mini__meta">{partner.category} · {partner.contactPerson}</span>
                  </span>
                  <StatusBadge status={partner.contractStatus} />
                </button>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Contract status" subtitle="Directory contract states in local demo data.">
            <div className="stack-12">
              {contractStatusData.map((entry) => (
                <div key={entry.name}>
                  <div className="between" style={{ marginBottom: 4 }}>
                    <span className="text-xs">{entry.name}</span>
                    <span className="text-xs muted">{entry.value} / {data.agencies.length}</span>
                  </div>
                  <ProgressBar value={(entry.value / Math.max(1, data.agencies.length)) * 100} size="sm" tone={entry.name === 'Active' ? 'success' : entry.name === 'Draft' ? 'brand' : 'warning'} />
                </div>
              ))}
            </div>
            <DataNote>No procurement, legal or vendor-management system is connected.</DataNote>
          </SectionCard>
        </div>

        <SectionCard title="Partner performance snapshot" subtitle="Sample completion, budget adherence, quality and timeliness scores." actions={<Button variant="ghost" size="xs" onClick={() => exportPartners(scoredPartners, 'performance-snapshot')}>Export</Button>}>
          <div className="vendor-score-list">
            {scoredPartners.slice(0, 5).map((partner) => (
              <div key={partner.id} className="vendor-score-row">
                <AvatarWithName name={partner.name} sub={partner.category} size="sm" />
                <div className="grow" style={{ minWidth: 140 }}>
                  <ScoreRow label="Overall" value={partner.performanceScore} />
                </div>
                <Badge tone={partner.performanceScore >= 85 ? 'success' : partner.performanceScore >= 70 ? 'warning' : 'danger'}>
                  {partner.performanceScore >= 85 ? 'Strong' : partner.performanceScore >= 70 ? 'Watch' : 'At risk'}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <DemoNote>
          This partner directory is fictional demo data. Adding, editing or scoring a partner never sends an email, starts onboarding, creates a contract or triggers a payment.
        </DemoNote>
        {partnerModal}
        {addModal}
      </div>
    )
  }

  if (tab === 'agencies') {
    const partners = data.agencies.filter((agency) => agency.category === 'Creative Agency' || agency.category === 'Media Agency')
    return (
      <div className="stack-16">
        <TabIntro
          title="Agencies"
          description="Creative and media agency roster with sample campaign links, contract states and scorecards."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportPartners(partners, 'agencies')}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => openAdd('Creative Agency')}>Add agency</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Agencies" value={partners.length} sub={`${partners.filter((agency) => agency.contractStatus === 'Active').length} active`} icon={<Handshake size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Creative" value={partners.filter((agency) => agency.category === 'Creative Agency').length} sub="Brand and campaign partners" icon={<Sparkles size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Media" value={partners.filter((agency) => agency.category === 'Media Agency').length} sub="Paid and B2B media partners" icon={<TrendingUp size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Average score" value={formatPercent(partners.filter((agency) => agency.performanceScore > 0).length ? partners.filter((agency) => agency.performanceScore > 0).reduce((sum, agency) => sum + agency.performanceScore, 0) / partners.filter((agency) => agency.performanceScore > 0).length : null, 0)} sub="Sample performance" icon={<BadgeCheck size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <div className="stack-12">
          {partners.map((partner) => (
            <article className="card card--pad" key={partner.id}>
              <div className="between" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p className="text-xs faint">{partner.id} · {partner.category}</p>
                  <h3 style={{ marginTop: 3, fontSize: '0.95rem' }}>{partner.name}</h3>
                  <p className="text-xs muted">{partner.location} · {partner.contactPerson}</p>
                </div>
                <StatusBadge status={partner.contractStatus} />
              </div>
              <div className="detail-grid mt-12">
                <div className="detail-item"><dt>Email</dt><dd>{partner.email}</dd></div>
                <div className="detail-item"><dt>Phone</dt><dd>{partner.phone}</dd></div>
                <div className="detail-item"><dt>Campaigns</dt><dd>{partner.assignedCampaigns.map((id) => campaignName(data.campaigns, id)).join(' · ') || 'No campaign links'}</dd></div>
                <div className="detail-item"><dt>Notes</dt><dd>{partner.notes}</dd></div>
              </div>
              <div className="between mt-12" style={{ gap: 12 }}>
                <div className="grow"><ScoreRow label="Demo performance" value={partner.performanceScore} /></div>
                <Button variant="ghost" size="xs" onClick={() => setPartnerId(partner.id)}>Open scorecard</Button>
              </div>
            </article>
          ))}
        </div>
        <DataNote>No agency portal or work-order system is connected. Contact details are fictional.</DataNote>
        {partnerModal}
        {addModal}
      </div>
    )
  }

  if (tab === 'influencers') {
    const partnerCreators = data.agencies.filter((agency) => agency.category === 'Influencer')
    return (
      <div className="stack-16">
        <TabIntro
          title="Influencers"
          description="Creator partners and the campaign creator bench. Contact states are local demo labels; no outreach is sent."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={exportBench}>Export bench</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => openAdd('Influencer')}>Add creator</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Creator partners" value={partnerCreators.length} sub="Directory records in this module" icon={<Users size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Creator bench" value={data.influencers.length} sub={`${data.influencers.filter((influencer) => influencer.contactStatus === 'Confirmed').length} confirmed in demo`} icon={<Sparkles size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Total followers" value={formatINRCompact(data.influencers.reduce((sum, influencer) => sum + influencer.followers, 0)).replace('₹', '')} sub="Sample combined audience" icon={<TrendingUp size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Estimated fees" value={formatINRCompact(data.influencers.reduce((sum, influencer) => sum + influencer.estimatedFee, 0))} sub="Not committed or paid" icon={<Handshake size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <SectionCard title="Creator bench" subtitle="Sample creator roster from the digital campaign workbook." actions={
          <select className="select" value={contactFilter} onChange={(event) => setContactFilter(event.target.value)} aria-label="Filter creator contact status">
            <option value="All">All contact statuses</option>
            {CONTACT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        }>
          <DataTable
            data={filteredBench}
            rowKey={(influencer) => influencer.id}
            searchable={(influencer) => `${influencer.name} ${influencer.handle} ${influencer.category} ${influencer.audience}`}
            searchPlaceholder="Search creators, handles, categories…"
            pageSize={7}
            caption="Creator bench"
            columns={[
              { id: 'name', header: 'Creator', mobileLabel: 'Creator', sortValue: (influencer) => influencer.name, render: (influencer) => <div><p className="cell-primary">{influencer.name}</p><p className="text-xs muted">{influencer.handle} · {influencer.category}</p></div> },
              { id: 'followers', header: 'Followers', align: 'right', mobileLabel: 'Followers', sortValue: (influencer) => influencer.followers, render: (influencer) => formatNumber(influencer.followers) },
              { id: 'engagement', header: 'Engagement', align: 'right', mobileLabel: 'Engagement', hideMobile: true, sortValue: (influencer) => influencer.engagementRate, render: (influencer) => formatPercent(influencer.engagementRate) },
              { id: 'fee', header: 'Estimated fee', align: 'right', mobileLabel: 'Estimated fee', sortValue: (influencer) => influencer.estimatedFee, render: (influencer) => <span className="cell-strong">{formatINR(influencer.estimatedFee)}</span> },
              { id: 'campaign', header: 'Campaign', mobileLabel: 'Campaign', hideMobile: true, render: (influencer) => <span className="text-xs">{campaignName(data.campaigns, influencer.campaignId)}</span> },
              {
                id: 'contact',
                header: 'Contact',
                mobileLabel: 'Contact',
                sortValue: (influencer) => influencer.contactStatus,
                render: (influencer) => (
                  <select
                    className="select"
                    style={{ minHeight: 30, padding: '4px 26px 4px 8px', width: 130, fontSize: '0.7rem' }}
                    value={influencer.contactStatus}
                    aria-label={`Contact status for ${influencer.name}`}
                    onChange={(event) => updateInfluencerContact(influencer, event.target.value as Influencer['contactStatus'])}
                  >
                    {CONTACT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                ),
              },
            ]}
            mobileActions={(influencer) => (
              <select
                className="select"
                value={influencer.contactStatus}
                aria-label={`Contact status for ${influencer.name}`}
                onChange={(event) => updateInfluencerContact(influencer, event.target.value as Influencer['contactStatus'])}
              >
                {CONTACT_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            )}
          />
        </SectionCard>

        <SectionCard title="Creator partners" subtitle="Directory records handled as influencer partners.">
          <EntityGrid columns={2}>
            {partnerCreators.map((partner) => (
              <EntityCard
                key={partner.id}
                title={partner.name}
                subtitle={`${partner.category} · ${partner.location}`}
                badge={<StatusBadge status={partner.contractStatus} />}
                meta={<span>{partner.email}</span>}
                onClick={() => setPartnerId(partner.id)}
              >
                <p className="text-xs muted" style={{ lineHeight: 1.55 }}>{partner.notes}</p>
              </EntityCard>
            ))}
          </EntityGrid>
        </SectionCard>
        <DemoNote>Creator follower counts, fees and engagement rates are fictional demo values. No creator has been contacted or paid.</DemoNote>
        {partnerModal}
        {addModal}
      </div>
    )
  }

  if (tab === 'production-houses') return renderPartnerGrid(['Production House'], 'Production houses')
  if (tab === 'printing-vendors') return renderPartnerGrid(['Printing Vendor'], 'Printing vendors')
  if (tab === 'event-organizers') return renderPartnerGrid(['Event Organizer'], 'Event organizers')

  if (tab === 'vendor-performance') {
    const rows = [...data.agencies].sort((a, b) => b.performanceScore - a.performanceScore)
    return (
      <div className="stack-16">
        <TabIntro
          title="Vendor performance"
          description="Compare sample completion, budget adherence, quality and timeliness across the partner directory. Scores are demo values."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => exportPartners(rows, 'vendor-performance')}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Scored vendors" value={scoredPartners.length} sub={`${data.agencies.length - scoredPartners.length} not yet scored`} icon={<BadgeCheck size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Average performance" value={formatPercent(averageScore, 0)} sub="Across scored demo partners" icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Above 85" value={scoredPartners.filter((agency) => agency.performanceScore >= 85).length} sub="Strong sample performers" icon={<Sparkles size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Below 75" value={scoredPartners.filter((agency) => agency.performanceScore < 75).length} sub="Need a demo review" icon={<CalendarClock size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Performance by partner" subtitle="Overall sample score out of 100" height="md" isEmpty={scoredPartners.length === 0}>
            <BarChart data={scoredPartners.map((partner) => ({ name: partner.name.split(' ')[0], score: partner.performanceScore }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <YAxis domain={[0, 100]} {...axisProps} width={32} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} / 100`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="score" name="Score" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Score composition" subtitle="Sample averages across all scored partners" height="md" isEmpty={scoredPartners.length === 0} legend={<><LegendItem color="var(--chart-1)" label="Completion" /><LegendItem color="var(--chart-2)" label="Budget" /><LegendItem color="var(--chart-3)" label="Quality" /><LegendItem color="var(--chart-5)" label="Timeliness" /></>}>
            <BarChart
              data={[{
                name: 'Average',
                completion: scoredPartners.length ? scoredPartners.reduce((sum, partner) => sum + partner.completion, 0) / scoredPartners.length : 0,
                budget: scoredPartners.length ? scoredPartners.reduce((sum, partner) => sum + partner.budgetAdherence, 0) / scoredPartners.length : 0,
                quality: scoredPartners.length ? scoredPartners.reduce((sum, partner) => sum + partner.quality, 0) / scoredPartners.length : 0,
                timeliness: scoredPartners.length ? scoredPartners.reduce((sum, partner) => sum + partner.timeliness, 0) / scoredPartners.length : 0,
              }]}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis domain={[0, 100]} {...axisProps} width={32} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value.toFixed(1)} / 100`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="completion" name="Completion" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="budget" name="Budget" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="quality" name="Quality" fill="var(--chart-3)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="timeliness" name="Timeliness" fill="var(--chart-5)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
        </div>

        <DataTable
          data={rows.filter((agency) => categoryFilter === 'All' || agency.category === categoryFilter)}
          rowKey={(agency) => agency.id}
          searchable={(agency) => `${agency.name} ${agency.category} ${agency.location} ${agency.contactPerson} ${agency.contractStatus}`}
          searchPlaceholder="Search vendors, categories, contacts…"
          pageSize={8}
          initialSort={{ columnId: 'score', direction: 'desc' }}
          caption="Vendor performance"
          filters={
            <select className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter vendor category">
              <option value="All">All partner types</option>
              {PARTNER_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          }
          columns={[
            { id: 'name', header: 'Partner', mobileLabel: 'Partner', sortValue: (agency) => agency.name, render: (agency) => <div><p className="cell-primary">{agency.name}</p><p className="text-xs muted">{agency.category} · {agency.location}</p></div> },
            { id: 'score', header: 'Overall', align: 'right', mobileLabel: 'Overall', sortValue: (agency) => agency.performanceScore, render: (agency) => <span className="cell-strong">{agency.performanceScore || '—'}</span> },
            { id: 'completion', header: 'Completion', align: 'right', mobileLabel: 'Completion', hideMobile: true, sortValue: (agency) => agency.completion, render: (agency) => formatPercent(agency.completion, 0) },
            { id: 'budget', header: 'Budget', align: 'right', mobileLabel: 'Budget adherence', hideMobile: true, sortValue: (agency) => agency.budgetAdherence, render: (agency) => formatPercent(agency.budgetAdherence, 0) },
            { id: 'quality', header: 'Quality', align: 'right', mobileLabel: 'Quality', hideMobile: true, sortValue: (agency) => agency.quality, render: (agency) => formatPercent(agency.quality, 0) },
            { id: 'timeliness', header: 'Timeliness', align: 'right', mobileLabel: 'Timeliness', hideMobile: true, sortValue: (agency) => agency.timeliness, render: (agency) => formatPercent(agency.timeliness, 0) },
            { id: 'contract', header: 'Contract', mobileLabel: 'Contract', sortValue: (agency) => agency.contractStatus, render: (agency) => <StatusBadge status={agency.contractStatus} /> },
            { id: 'actions', header: '', align: 'right', mobileLabel: 'Actions', render: (agency) => <Button variant="ghost" size="xs" onClick={() => setPartnerId(agency.id)}>Open</Button> },
          ]}
        />
        <DataNote>Performance scores are sample values. No vendor scorecard, SLA engine or procurement review is connected.</DataNote>
        {partnerModal}
      </div>
    )
  }

  return null
}

function PartnerModal({
  partner,
  onClose,
  onContractStatus,
}: {
  partner: Agency
  onClose: () => void
  onContractStatus: (status: Agency['contractStatus']) => void
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={partner.name}
      description={`${partner.category} · ${partner.location}`}
      size="wide"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="stack-16">
        <div className="row-8 wrap">
          <StatusBadge status={partner.contractStatus} />
          <Badge tone="neutral">{partner.id}</Badge>
          {partner.performanceScore > 0 ? <Badge tone={partner.performanceScore >= 85 ? 'success' : partner.performanceScore >= 70 ? 'warning' : 'danger'}>{partner.performanceScore}/100 demo score</Badge> : null}
        </div>
        <div className="detail-grid">
          <div className="detail-item"><dt>Contact</dt><dd>{partner.contactPerson}</dd></div>
          <div className="detail-item"><dt>Email</dt><dd><span className="row-6"><Mail size={13} /> {partner.email}</span></dd></div>
          <div className="detail-item"><dt>Phone</dt><dd><span className="row-6"><Phone size={13} /> {partner.phone}</span></dd></div>
          <div className="detail-item"><dt>Location</dt><dd><span className="row-6"><MapPin size={13} /> {partner.location}</span></dd></div>
        </div>
        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Assigned campaigns</p>
          <div className="row-8 wrap">
            {partner.assignedCampaigns.length === 0 ? <span className="text-xs muted">No campaign links.</span> : partner.assignedCampaigns.map((id) => <Badge key={id} tone="neutral">{id}</Badge>)}
          </div>
        </div>
        {partner.performanceScore > 0 ? (
          <div className="stack-10">
            <ScoreRow label="Completion" value={partner.completion} />
            <ScoreRow label="Budget adherence" value={partner.budgetAdherence} />
            <ScoreRow label="Quality" value={partner.quality} />
            <ScoreRow label="Timeliness" value={partner.timeliness} />
          </div>
        ) : <p className="empty-inline">This partner has no demo performance score yet.</p>}
        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Notes</p>
          <p className="text-sm" style={{ lineHeight: 1.6 }}>{partner.notes || 'No notes recorded.'}</p>
        </div>
        <Field label="Demo contract status" htmlFor="partner-contract-status" hint="Local status only. No contract, approval or procurement record is changed.">
          <select id="partner-contract-status" className="select" value={partner.contractStatus} onChange={(event) => onContractStatus(event.target.value as Agency['contractStatus'])}>
            {CONTRACT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <DataNote>Contact details, campaign assignments and scores are fictional demo data. No partner has been contacted.</DataNote>
      </div>
    </Modal>
  )
}

function AddPartnerModal({
  open,
  defaultCategory,
  onClose,
  onSave,
}: {
  open: boolean
  defaultCategory: PartnerCategory
  onClose: () => void
  onSave: (values: PartnerFormValues) => void
}) {
  const [values, setValues] = useState<PartnerFormValues>({
    name: '',
    category: defaultCategory,
    contactPerson: '',
    email: '',
    phone: '',
    location: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof PartnerFormValues>(key: K, value: PartnerFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }
  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.name.trim()) next.name = 'Partner name is required.'
    if (!values.contactPerson.trim()) next.contactPerson = 'Contact person is required.'
    if (!values.email.trim()) next.email = 'Email is required.'
    else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = 'Enter a valid demo email address.'
    if (!values.location.trim()) next.location = 'Location is required.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a demo partner"
      description="Adds a draft partner to the local directory only. No onboarding, email or contract is created."
      size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add partner</Button></>}
    >
      <div className="form-grid">
        <Field label="Partner name" htmlFor="partner-name" required error={errors.name}>
          <input id="partner-name" className="input" value={values.name} onChange={(event) => set('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Partner type" htmlFor="partner-category">
          <select id="partner-category" className="select" value={values.category} onChange={(event) => set('category', event.target.value as PartnerCategory)}>
            {PARTNER_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </Field>
        <Field label="Contact person" htmlFor="partner-contact" required error={errors.contactPerson}>
          <input id="partner-contact" className="input" value={values.contactPerson} onChange={(event) => set('contactPerson', event.target.value)} aria-invalid={Boolean(errors.contactPerson)} />
        </Field>
        <Field label="Email" htmlFor="partner-email" required error={errors.email}>
          <input id="partner-email" className="input" type="email" value={values.email} onChange={(event) => set('email', event.target.value)} aria-invalid={Boolean(errors.email)} />
        </Field>
        <Field label="Phone" htmlFor="partner-phone">
          <input id="partner-phone" className="input" value={values.phone} onChange={(event) => set('phone', event.target.value)} />
        </Field>
        <Field label="Location" htmlFor="partner-location" required error={errors.location}>
          <input id="partner-location" className="input" value={values.location} onChange={(event) => set('location', event.target.value)} aria-invalid={Boolean(errors.location)} />
        </Field>
        <Field label="Notes" htmlFor="partner-notes" className="form-grid__full">
          <textarea id="partner-notes" className="textarea" rows={3} value={values.notes} onChange={(event) => set('notes', event.target.value)} />
        </Field>
      </div>
      <div className="callout callout--warning mt-12">
        <Handshake size={14} />
        <span>This demo has no vendor onboarding, background checks, contracts or payments. Use fictional details.</span>
      </div>
    </Modal>
  )
}
