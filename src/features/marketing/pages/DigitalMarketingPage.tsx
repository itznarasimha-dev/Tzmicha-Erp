import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  CircleAlert,
  Download,
  Eye,
  Film,
  Globe2,
  Mail,
  Megaphone,
  MousePointerClick,
  Plus,
  Radio,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDemoData } from '../context/DemoDataContext'
import { useToast } from '../context/ToastContext'
import { runMarketingApiAction, marketingApi } from '../api-actions'
import type {
  Campaign,
  CampaignChannel,
  CampaignStatus,
  ContentItem,
  EmailCampaign,
  Influencer,
  PaidAdCampaign,
  SocialPost,
  VideoProject,
} from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { SectionCard } from '../components/ui/SectionCard'
import { Avatar } from '../components/ui/Avatar'
import { ProgressBar } from '../components/ui/ProgressBar'
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
import { campaignConversionRate, campaignCpl, campaignCtr, campaignRoi, safeDivide } from '../utils/analytics'
import { downloadCsv } from '../utils/csv'
import { dateOnlyFromNow } from '../utils/dates'
import {
  formatDate,
  formatDateTime,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatPercent,
  uid,
} from '../utils/format'

const CHANNELS: CampaignChannel[] = ['Digital', 'Social', 'Email', 'Field', 'Trade', 'Events', 'Influencer', 'Retail', 'Content']
const CAMPAIGN_STATUSES: CampaignStatus[] = ['Draft', 'Planned', 'Active', 'Paused', 'Completed', 'Archived']
const CONTENT_STATUSES: ContentItem['status'][] = ['Idea', 'Draft', 'In Review', 'Approved']
const VIDEO_STAGES: VideoProject['stage'][] = ['Brief', 'Script', 'Shoot', 'Editing', 'Review', 'Published']
const CONTACT_STATUSES: Influencer['contactStatus'][] = ['Not Contacted', 'Contacted', 'Negotiating', 'Confirmed', 'Declined']

type CampaignFormValues = {
  name: string
  objective: string
  channel: CampaignChannel
  audience: string
  product: string
  startDate: string
  endDate: string
  budget: string
  status: CampaignStatus
  owner: string
}

function blankCampaignForm(): CampaignFormValues {
  return {
    name: '',
    objective: '',
    channel: 'Digital',
    audience: '',
    product: '',
    startDate: dateOnlyFromNow(0),
    endDate: dateOnlyFromNow(30),
    budget: '',
    status: 'Draft',
    owner: 'Ananya Rao',
  }
}

type SocialFormValues = {
  channel: SocialPost['channel']
  title: string
  content: string
  date: string
  campaignId: string
  status: SocialPost['status']
}

type ContentFormValues = {
  title: string
  type: ContentItem['type']
  channel: string
  campaignId: string
  body: string
  status: ContentItem['status']
}

export function DigitalMarketingPage({ tab }: { tab: string }) {
  const { data, update, addNotification, dataSource, refreshFromApi } = useDemoData()
  const { pushToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const chartAnim = useChartAnimation()
  const [campaignOpen, setCampaignOpen] = useState(false)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null)
  const [contentPreviewId, setContentPreviewId] = useState<string | null>(null)
  const [socialOpen, setSocialOpen] = useState(false)
  const [contentOpen, setContentOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [channelFilter, setChannelFilter] = useState('All')

  useEffect(() => {
    if (tab !== 'campaigns') return
    if (searchParams.get('action') === 'new') setCampaignOpen(true)
    const status = searchParams.get('status')
    if (status) setStatusFilter(status)
  }, [searchParams, tab])

  const activeCampaign = data.campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null
  const previewEmail = data.emails.find((email) => email.id === emailPreviewId) ?? null
  const previewContent = data.content.find((item) => item.id === contentPreviewId) ?? null

  const filteredCampaigns = useMemo(
    () =>
      data.campaigns.filter((campaign) => {
        if (statusFilter !== 'All' && campaign.status !== statusFilter) return false
        if (channelFilter !== 'All' && campaign.channel !== channelFilter) return false
        return true
      }),
    [data.campaigns, statusFilter, channelFilter],
  )

  const totals = useMemo(() => {
    const spend = data.campaigns.reduce((sum, campaign) => sum + campaign.spend, 0)
    const revenue = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.revenue, 0)
    const leads = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.leads, 0)
    const conversions = data.campaigns.reduce((sum, campaign) => sum + campaign.kpis.conversions, 0)
    return {
      spend,
      revenue,
      leads,
      conversions,
      roi: spend > 0 ? ((revenue - spend) / spend) * 100 : null,
      active: data.campaigns.filter((campaign) => campaign.status === 'Active').length,
    }
  }, [data.campaigns])

  const clearParam = (key: string) => {
    const next = new URLSearchParams(searchParams)
    next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const updateCampaignStatus = async (campaign: Campaign, status: CampaignStatus) => {
    if (dataSource === 'api') {
      await runMarketingApiAction({ dataSource, refreshFromApi, pushToast }, {
        action: () => marketingApi.updateCampaign(campaign.id, { status }),
        successTitle: 'Campaign status updated',
        successDescription: `${campaign.name} is now ${status}.`,
        errorTitle: 'Could not update campaign status',
        refresh: true,
      })
      return
    }
    update('campaigns', (current) => current.map((item) => (item.id === campaign.id ? { ...item, status } : item)))
    pushToast({
      title: 'Campaign status updated (demo)',
      description: `${campaign.name} is now ${status}. Demo data is not saved to the database.`,
      tone: 'success',
    })
  }

  const createCampaign = async (values: CampaignFormValues) => {
    if (dataSource === 'api') {
      await runMarketingApiAction({ dataSource, refreshFromApi, pushToast }, {
        action: () => marketingApi.createCampaign({
          name: values.name.trim(),
          objective: values.objective.trim(),
          channel: values.channel,
          audience: values.audience.trim(),
          product: values.product.trim() || undefined,
          startDate: values.startDate,
          endDate: values.endDate,
          budget: Math.round(Number(values.budget) || 0),
          spend: 0,
          status: values.status,
          ownerUserId: undefined,
        }),
        successTitle: 'Campaign added',
        successDescription: `${values.name.trim()} is now in the ERP with zero spend.`,
        errorTitle: 'Could not create campaign',
        refresh: true,
      })
      setCampaignOpen(false)
      clearParam('action')
      return
    }

    const campaign: Campaign = {
      id: uid('CMP'),
      name: values.name.trim(),
      objective: values.objective.trim(),
      channel: values.channel,
      audience: values.audience.trim(),
      product: values.product.trim() || 'Portfolio',
      startDate: values.startDate,
      endDate: values.endDate,
      budget: Math.round(Number(values.budget) || 0),
      spend: 0,
      status: values.status,
      owner: values.owner.trim() || 'Ananya Rao',
      kpis: { impressions: 0, clicks: 0, leads: 0, qualifiedLeads: 0, conversions: 0, revenue: 0 },
      createdAt: new Date().toISOString(),
    }
    update('campaigns', (current) => [campaign, ...current])
    addNotification({
      title: 'Demo campaign created',
      body: `${campaign.name} was added to local campaign records. No live ads or external platform were changed.`,
      kind: 'system',
      href: '/marketing/digital/campaigns',
    })
    pushToast({
      title: 'Campaign added (demo)',
      description: `${campaign.name} is now in the local demo workspace with zero spend. Demo data is not saved to the database.`,
      tone: 'success',
    })
    setCampaignOpen(false)
    clearParam('action')
  }

  const exportCampaigns = (rows: Campaign[], label = 'campaigns') => {
    const result = downloadCsv(`marketing-${label}-demo`, [
      { header: 'Campaign ID', value: (campaign: Campaign) => campaign.id },
      { header: 'Name', value: (campaign: Campaign) => campaign.name },
      { header: 'Objective', value: (campaign: Campaign) => campaign.objective },
      { header: 'Channel', value: (campaign: Campaign) => campaign.channel },
      { header: 'Product', value: (campaign: Campaign) => campaign.product },
      { header: 'Audience', value: (campaign: Campaign) => campaign.audience },
      { header: 'Start', value: (campaign: Campaign) => campaign.startDate },
      { header: 'End', value: (campaign: Campaign) => campaign.endDate },
      { header: 'Budget', value: (campaign: Campaign) => campaign.budget },
      { header: 'Spend', value: (campaign: Campaign) => campaign.spend },
      { header: 'Status', value: (campaign: Campaign) => campaign.status },
      { header: 'Owner', value: (campaign: Campaign) => campaign.owner },
      { header: 'Leads', value: (campaign: Campaign) => campaign.kpis.leads },
      { header: 'Conversions', value: (campaign: Campaign) => campaign.kpis.conversions },
      { header: 'Revenue', value: (campaign: Campaign) => campaign.kpis.revenue },
    ], rows)
    pushToast({ title: result.ok ? 'CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const addSocialPost = (values: SocialFormValues) => {
    const post: SocialPost = {
      id: uid('SP'),
      channel: values.channel,
      title: values.title.trim(),
      content: values.content.trim(),
      date: values.date,
      status: values.status,
      campaignId: values.campaignId || null,
      engagement: 0,
    }
    update('socialPosts', (current) => [post, ...current])
    pushToast({ title: 'Social draft saved locally', description: `${post.title} was added as a ${post.status.toLowerCase()} demo post. Nothing was published.`, tone: 'success' })
    setSocialOpen(false)
  }

  const addContent = (values: ContentFormValues) => {
    const item: ContentItem = {
      id: uid('CN'),
      title: values.title.trim(),
      type: values.type,
      campaignId: values.campaignId || null,
      status: values.status,
      body: values.body.trim(),
      owner: 'Ananya Rao',
      createdAt: new Date().toISOString(),
      channel: values.channel.trim() || 'Website',
    }
    update('content', (current) => [item, ...current])
    pushToast({ title: 'Content idea saved', description: `${item.title} was added to the local Content Studio demo.`, tone: 'success' })
    setContentOpen(false)
  }

  const campaignColumns: DataTableColumn<Campaign>[] = [
    {
      id: 'name', header: 'Campaign', sortValue: (campaign) => campaign.name, mobileLabel: 'Campaign',
      render: (campaign) => (
        <div>
          <p className="cell-primary">{campaign.name}</p>
          <p className="text-xs muted">{campaign.channel} · {campaign.product}</p>
        </div>
      ),
    },
    { id: 'owner', header: 'Owner', sortValue: (campaign) => campaign.owner, mobileLabel: 'Owner', hideMobile: true, render: (campaign) => <span className="text-xs">{campaign.owner}</span> },
    { id: 'window', header: 'Window', sortValue: (campaign) => campaign.startDate, mobileLabel: 'Window', hideMobile: true, render: (campaign) => <span className="text-xs">{formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</span> },
    { id: 'budget', header: 'Budget', align: 'right', sortValue: (campaign) => campaign.budget, mobileLabel: 'Budget', render: (campaign) => <span className="cell-strong">{formatINRCompact(campaign.budget)}</span> },
    { id: 'spend', header: 'Spend', align: 'right', sortValue: (campaign) => campaign.spend, mobileLabel: 'Spend', render: (campaign) => formatINRCompact(campaign.spend) },
    { id: 'leads', header: 'Leads', align: 'right', sortValue: (campaign) => campaign.kpis.leads, mobileLabel: 'Leads', render: (campaign) => <>{campaign.kpis.leads}<span className="text-xs muted"> / {campaign.kpis.qualifiedLeads} qual.</span></> },
    { id: 'roi', header: 'ROI', align: 'right', sortValue: (campaign) => campaignRoi(campaign) ?? -999, mobileLabel: 'ROI', render: (campaign) => <span className={(campaignRoi(campaign) ?? 0) >= 0 ? 'success-text' : 'danger-text'}>{formatPercent(campaignRoi(campaign))}</span> },
    {
      id: 'status', header: 'Status', sortValue: (campaign) => campaign.status, mobileLabel: 'Status',
      render: (campaign) => (
        <select
          className="select"
          style={{ minHeight: 30, padding: '4px 26px 4px 8px', width: 116, fontSize: '0.7rem' }}
          value={campaign.status}
          aria-label={`Update status for ${campaign.name}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => updateCampaignStatus(campaign, event.target.value as CampaignStatus)}
        >
          {CAMPAIGN_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      ),
    },
  ]

  const channelSpend = useMemo(() => {
    const map = new Map<string, { channel: string; spend: number; revenue: number; leads: number }>()
    data.campaigns.forEach((campaign) => {
      const existing = map.get(campaign.channel) ?? { channel: campaign.channel, spend: 0, revenue: 0, leads: 0 }
      existing.spend += campaign.spend
      existing.revenue += campaign.kpis.revenue
      existing.leads += campaign.kpis.leads
      map.set(campaign.channel, existing)
    })
    return [...map.values()].sort((a, b) => b.spend - a.spend)
  }, [data.campaigns])

  const socialByChannel = useMemo(() => {
    const map = new Map<string, { channel: string; posts: number; engagement: number }>()
    data.socialPosts.forEach((post) => {
      const existing = map.get(post.channel) ?? { channel: post.channel, posts: 0, engagement: 0 }
      existing.posts += 1
      existing.engagement += post.engagement
      map.set(post.channel, existing)
    })
    return [...map.values()]
  }, [data.socialPosts])

  const campaignForm = campaignOpen ? (
    <CampaignFormModal open onClose={() => { setCampaignOpen(false); clearParam('action') }} onSave={createCampaign} />
  ) : null
  const campaignDetail = activeCampaign ? (
    <CampaignDetailModal campaign={activeCampaign} onClose={() => setActiveCampaignId(null)} />
  ) : null
  const emailPreview = previewEmail ? (
    <EmailPreviewModal email={previewEmail} onClose={() => setEmailPreviewId(null)} onStatusChange={(status) => {
      update('emails', (current) => current.map((item) => item.id === previewEmail.id ? { ...item, status } : item))
      pushToast({ title: 'Email status updated', description: `Marked as ${status} in local demo data. No email was sent.`, tone: 'success' })
    }} />
  ) : null
  const contentPreview = previewContent ? (
    <ContentPreviewModal item={previewContent} onClose={() => setContentPreviewId(null)} onStatusChange={(status) => {
      update('content', (current) => current.map((item) => item.id === previewContent.id ? { ...item, status } : item))
      pushToast({ title: 'Content status updated', description: `Moved to ${status} in the local Content Studio.`, tone: 'success' })
    }} />
  ) : null

  if (tab === 'overview') {
    const topCampaigns = [...data.campaigns].filter((campaign) => campaign.spend > 0).sort((a, b) => (campaignRoi(b) ?? 0) - (campaignRoi(a) ?? 0)).slice(0, 5)
    const scheduled = [...data.socialPosts].filter((post) => post.status === 'Scheduled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
    return (
      <div className="stack-20">
        <TabIntro
          title="Digital marketing overview"
          description="Plan and review paid, social, email, search, content, creator and video work. All performance figures are sample campaign reports stored locally."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportCampaigns(data.campaigns)}>Export campaigns</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCampaignOpen(true)}>New campaign</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Active campaigns" value={totals.active} sub={`${data.campaigns.length} total including drafts`} icon={<Radio size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Digital spend" value={formatINRCompact(totals.spend)} sub="Reported across all channels" icon={<Megaphone size={15} />} tone="var(--chart-6)" />
          <MetricCard label="Campaign leads" value={formatNumber(totals.leads)} sub={`${formatNumber(totals.conversions)} reported conversions`} icon={<Users size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Blended ROI" value={formatPercent(totals.roi, 0)} sub="Attributed revenue vs spend · demo" icon={<TrendingUp size={15} />} tone="var(--chart-3)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Spend by channel" subtitle="Campaign-reported spend and revenue · sample data" height="md" legend={<><LegendItem color="var(--chart-1)" label="Spend" /><LegendItem color="var(--chart-2)" label="Revenue" /></>} isEmpty={channelSpend.length === 0}>
            <BarChart data={channelSpend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="channel" {...axisProps} />
              <YAxis {...axisProps} width={46} tickFormatter={(value: number) => formatINRCompact(value)} />
              <Tooltip content={<ChartTooltip valueFormatter={formatINR} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="spend" name="Spend" fill="var(--chart-1)" opacity={0.6} radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
              <Bar dataKey="revenue" name="Revenue" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>

          <SectionCard title="Best performing campaigns" subtitle="Ranked by demo ROI where spend is recorded." actions={<Button variant="ghost" size="xs" onClick={() => exportCampaigns(topCampaigns, 'top-campaigns')}>Export</Button>}>
            <div className="stack-12">
              {topCampaigns.map((campaign, index) => (
                <button key={campaign.id} type="button" className="campaign-mini" onClick={() => setActiveCampaignId(campaign.id)}>
                  <span className={`avatar avatar--sm ${index === 0 ? 'avatar--teal' : 'avatar--indigo'}`}>{index + 1}</span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="campaign-mini__name truncate">{campaign.name}</span>
                    <span className="campaign-mini__meta">{formatINRCompact(campaign.spend)} spend · {formatPercent(campaignRoi(campaign))} ROI</span>
                  </span>
                  <StatusBadge status={campaign.status} />
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="dashboard-grid dashboard-grid--three">
          <SectionCard title="Content pipeline" subtitle="Ideas, drafts and reviews in the local studio." actions={<Button variant="ghost" size="xs" onClick={() => setContentOpen(true)}>Add idea</Button>}>
            <div className="mini-stats">
              {CONTENT_STATUSES.map((status) => (
                <div className="mini-stat" key={status}>
                  <p className="mini-stat__label">{status}</p>
                  <p className="mini-stat__value">{data.content.filter((item) => item.status === status).length}</p>
                </div>
              ))}
            </div>
            <div className="stack-8 mt-12">
              {data.content.slice(0, 3).map((item) => (
                <button key={item.id} type="button" className="activity-followup" onClick={() => setContentPreviewId(item.id)}>
                  <span className="approval-mini__icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}><Sparkles size={14} /></span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text)' }} className="truncate">{item.title}</span>
                    <span style={{ display: 'block', fontSize: '0.64rem', color: 'var(--muted)' }}>{item.type} · {item.channel}</span>
                  </span>
                  <StatusBadge status={item.status} />
                </button>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Upcoming social posts" subtitle="Scheduled locally; nothing is published automatically.">
            <div className="stack-10">
              {scheduled.length === 0 ? <p className="empty-inline">No scheduled demo posts.</p> : scheduled.map((post) => (
                <div key={post.id} className="between" style={{ gap: 10, padding: '8px 2px', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{post.title}</p>
                    <p className="text-xs muted">{post.channel} · {formatDate(post.date)}</p>
                  </div>
                  <StatusBadge status={post.status} />
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Channel quick stats" subtitle="Paid media and email sample records.">
            <div className="mini-stats">
              <div className="mini-stat"><p className="mini-stat__label">Paid campaigns</p><p className="mini-stat__value">{data.paidAds.length}</p></div>
              <div className="mini-stat"><p className="mini-stat__label">Email sends</p><p className="mini-stat__value">{data.emails.reduce((sum, email) => sum + email.sent, 0).toLocaleString('en-IN')}</p></div>
              <div className="mini-stat"><p className="mini-stat__label">SEO tasks</p><p className="mini-stat__value">{data.seoTasks.filter((task) => task.status !== 'Done').length} open</p></div>
              <div className="mini-stat"><p className="mini-stat__label">Videos in flight</p><p className="mini-stat__value">{data.videos.filter((video) => video.stage !== 'Published').length}</p></div>
            </div>
            <DataNote>No ad platform, email service provider or analytics API is connected.</DataNote>
          </SectionCard>
        </div>

        <DemoNote>
          Campaign KPIs are campaign-reported sample figures. Changing a status or adding a campaign only updates localStorage in this browser.
        </DemoNote>
        {campaignForm}
        {campaignDetail}
        {contentPreview}
        {emailPreview}
      </div>
    )
  }

  if (tab === 'campaigns') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Campaign register"
          description="Search, filter, sort and export every campaign. Status changes are local demo updates and do not launch or pause any real advertising."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportCampaigns(filteredCampaigns)}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCampaignOpen(true)}>New campaign</Button>
            </>
          }
        />
        <div className="grid-4">
          <div className="soft-tile"><p className="soft-tile__label">Visible</p><p className="soft-tile__value">{filteredCampaigns.length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Active</p><p className="soft-tile__value">{filteredCampaigns.filter((campaign) => campaign.status === 'Active').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Planned</p><p className="soft-tile__value">{filteredCampaigns.filter((campaign) => campaign.status === 'Planned').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Budget</p><p className="soft-tile__value">{formatINRCompact(filteredCampaigns.reduce((sum, campaign) => sum + campaign.budget, 0))}</p></div>
        </div>
        <DataTable
          data={filteredCampaigns}
          columns={campaignColumns}
          rowKey={(campaign) => campaign.id}
          searchable={(campaign) => `${campaign.name} ${campaign.objective} ${campaign.channel} ${campaign.product} ${campaign.audience} ${campaign.owner}`}
          searchPlaceholder="Search campaigns, products, owners…"
          pageSize={8}
          initialSort={{ columnId: 'window', direction: 'desc' }}
          filters={
            <>
              <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by campaign status">
                <option value="All">All statuses</option>
                {CAMPAIGN_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="select" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)} aria-label="Filter by campaign channel">
                <option value="All">All channels</option>
                {CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}
              </select>
            </>
          }
          onRowClick={(campaign) => setActiveCampaignId(campaign.id)}
          caption="Campaign register"
          emptyTitle="No campaigns match these filters"
          emptyDescription="Adjust the filters or create a new demo campaign."
        />
        <DataNote>Status selectors write to local state only. No platform API is called and no budget is committed.</DataNote>

        <SectionCard
          title="Paid media plans"
          subtitle="Ad-set budgets, spend and platform status folded into the campaign workspace."
          actions={
            <Button variant="ghost" size="xs" onClick={() => {
              const result = downloadCsv('paid-advertising-demo', [
                { header: 'ID', value: (ad: PaidAdCampaign) => ad.id },
                { header: 'Platform', value: (ad: PaidAdCampaign) => ad.platform },
                { header: 'Campaign', value: (ad: PaidAdCampaign) => ad.name },
                { header: 'Budget', value: (ad: PaidAdCampaign) => ad.budget },
                { header: 'Spend', value: (ad: PaidAdCampaign) => ad.spend },
                { header: 'Clicks', value: (ad: PaidAdCampaign) => ad.clicks },
                { header: 'Conversions', value: (ad: PaidAdCampaign) => ad.conversions },
                { header: 'Status', value: (ad: PaidAdCampaign) => ad.status },
              ], data.paidAds)
              pushToast({ title: result.ok ? 'Paid media CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
            }}>Export paid media</Button>
          }
        >
          <div className="mini-stats" style={{ marginBottom: 12 }}>
            <div className="mini-stat"><p className="mini-stat__label">Paid spend</p><p className="mini-stat__value">{formatINRCompact(data.paidAds.reduce((sum, ad) => sum + ad.spend, 0))}</p></div>
            <div className="mini-stat"><p className="mini-stat__label">Conversions</p><p className="mini-stat__value">{formatNumber(data.paidAds.reduce((sum, ad) => sum + ad.conversions, 0))}</p></div>
            <div className="mini-stat"><p className="mini-stat__label">Active ad sets</p><p className="mini-stat__value">{data.paidAds.filter((ad) => ad.status === 'Active').length}</p></div>
            <div className="mini-stat"><p className="mini-stat__label">Platforms</p><p className="mini-stat__value">{new Set(data.paidAds.map((ad) => ad.platform)).size}</p></div>
          </div>
          <DataTable
            data={data.paidAds}
            compact
            columns={[
              { id: 'name', header: 'Ad set', sortValue: (ad) => ad.name, mobileLabel: 'Ad set', render: (ad) => <div><p className="cell-primary">{ad.name}</p><p className="text-xs muted">{ad.platform} · {data.campaigns.find((campaign) => campaign.id === ad.campaignId)?.name ?? 'Unattributed'}</p></div> },
              { id: 'budget', header: 'Budget', align: 'right', sortValue: (ad) => ad.budget, mobileLabel: 'Budget', render: (ad) => formatINRCompact(ad.budget) },
              { id: 'spend', header: 'Spend', align: 'right', sortValue: (ad) => ad.spend, mobileLabel: 'Spend', render: (ad) => <span className="cell-strong">{formatINRCompact(ad.spend)}</span> },
              { id: 'conversions', header: 'Conversions', align: 'right', sortValue: (ad) => ad.conversions, mobileLabel: 'Conversions', render: (ad) => ad.conversions },
              {
                id: 'status', header: 'Status', mobileLabel: 'Status', sortValue: (ad) => ad.status,
                render: (ad) => (
                  <select className="select" style={{ minHeight: 30, padding: '4px 26px 4px 8px', width: 104, fontSize: '0.7rem' }} value={ad.status} aria-label={`Update status for ${ad.name}`} onChange={(event) => {
                    update('paidAds', (current) => current.map((item) => item.id === ad.id ? { ...item, status: event.target.value as PaidAdCampaign['status'] } : item))
                    pushToast({ title: 'Ad set status updated', description: `${ad.name} marked ${event.target.value} locally. No ad platform was changed.`, tone: 'success' })
                  }}>
                    {['Draft', 'Active', 'Paused', 'Ended'].map((status) => <option key={status}>{status}</option>)}
                  </select>
                ),
              },
            ]}
            rowKey={(ad) => ad.id}
            searchable={(ad) => `${ad.name} ${ad.platform}`}
            searchPlaceholder="Search paid ad sets…"
            pageSize={5}
            caption="Paid media ad sets"
          />
          <DataNote>No ad platform is connected. Paid status changes are local record edits only.</DataNote>
        </SectionCard>

        <SectionCard
          title="Creator and influencer partnerships"
          subtitle="Celebrity, creator and influencer campaign activity kept with the campaigns that fund it."
        >
          <EntityGrid columns={3}>
            {data.influencers.map((influencer) => (
              <EntityCard
                key={influencer.id}
                title={influencer.name}
                subtitle={`${influencer.handle} · ${influencer.category}`}
                badge={<StatusBadge status={influencer.contactStatus} />}
                meta={
                  <>
                    <span>{formatNumber(influencer.followers)} followers</span>
                    <span>{formatINRCompact(influencer.estimatedFee)} estimated fee</span>
                    <span>{influencer.campaignId ? data.campaigns.find((campaign) => campaign.id === influencer.campaignId)?.name ?? 'Campaign' : 'No campaign linked'}</span>
                  </>
                }
              >
                <div className="between" style={{ gap: 8 }}>
                  <span className="text-xs muted">Contact status</span>
                  <select className="select" style={{ minHeight: 28, padding: '3px 24px 3px 7px', width: 122, fontSize: '0.68rem' }} value={influencer.contactStatus} aria-label={`Update contact status for ${influencer.name}`} onChange={(event) => {
                    update('influencers', (current) => current.map((item) => item.id === influencer.id ? { ...item, contactStatus: event.target.value as Influencer['contactStatus'] } : item))
                    pushToast({ title: 'Creator status updated', description: `${influencer.name} marked ${event.target.value} in local demo data.`, tone: 'success' })
                  }}>
                    {CONTACT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
              </EntityCard>
            ))}
          </EntityGrid>
          <DataNote>Creator records and fees are sample values. No contract or payment is triggered here.</DataNote>
        </SectionCard>
        {campaignForm}
        {campaignDetail}
        {emailPreview}
        {contentPreview}
      </div>
    )
  }

  if (tab === 'paid-advertising') {
    const spend = data.paidAds.reduce((sum, ad) => sum + ad.spend, 0)
    const conversions = data.paidAds.reduce((sum, ad) => sum + ad.conversions, 0)
    const clicks = data.paidAds.reduce((sum, ad) => sum + ad.clicks, 0)
    const platformData = ['Google Ads', 'Meta Ads', 'LinkedIn Ads', 'YouTube Ads'].map((platform) => {
      const rows = data.paidAds.filter((ad) => ad.platform === platform)
      return {
        platform,
        spend: rows.reduce((sum, ad) => sum + ad.spend, 0),
        conversions: rows.reduce((sum, ad) => sum + ad.conversions, 0),
      }
    }).filter((row) => row.spend > 0 || row.conversions > 0)
    return (
      <div className="stack-16">
        <TabIntro title="Paid advertising" description="A local snapshot of paid media plans. No ad account is connected, so these figures are sample records only." actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => {
          const result = downloadCsv('paid-advertising-demo', [
            { header: 'ID', value: (ad: PaidAdCampaign) => ad.id },
            { header: 'Platform', value: (ad: PaidAdCampaign) => ad.platform },
            { header: 'Campaign', value: (ad: PaidAdCampaign) => ad.name },
            { header: 'Budget', value: (ad: PaidAdCampaign) => ad.budget },
            { header: 'Spend', value: (ad: PaidAdCampaign) => ad.spend },
            { header: 'Impressions', value: (ad: PaidAdCampaign) => ad.impressions },
            { header: 'Clicks', value: (ad: PaidAdCampaign) => ad.clicks },
            { header: 'Conversions', value: (ad: PaidAdCampaign) => ad.conversions },
            { header: 'Status', value: (ad: PaidAdCampaign) => ad.status },
          ], data.paidAds)
          pushToast({ title: result.ok ? 'Paid media CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
        }}>Export CSV</Button>} />
        <MetricGrid>
          <MetricCard label="Paid spend" value={formatINRCompact(spend)} sub={`${data.paidAds.filter((ad) => ad.status === 'Active').length} active demo ad sets`} icon={<Megaphone size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Paid conversions" value={formatNumber(conversions)} sub={`${formatNumber(clicks)} clicks recorded`} icon={<MousePointerClick size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Cost per conversion" value={formatINR(safeDivide(spend, conversions) ?? 0)} sub="Spend ÷ conversions" icon={<TrendingUp size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Click-through rate" value={formatPercent((safeDivide(clicks, data.paidAds.reduce((sum, ad) => sum + ad.impressions, 0)) ?? 0) * 100)} sub="Across paid records" icon={<Eye size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Paid spend by platform" subtitle="Sample platform records" height="md" isEmpty={platformData.length === 0}>
            <BarChart data={platformData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="platform" {...axisProps} />
              <YAxis {...axisProps} width={46} tickFormatter={(value: number) => formatINRCompact(value)} />
              <Tooltip content={<ChartTooltip valueFormatter={formatINR} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="spend" name="Spend" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim}>
                {platformData.map((entry, index) => <Cell key={entry.platform} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          </ChartCard>
          <ChartCard title="Conversions by platform" subtitle="Reported sample conversions" height="md" isEmpty={platformData.length === 0}>
            <BarChart data={platformData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="platform" {...axisProps} />
              <YAxis {...axisProps} width={34} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} conversions`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="conversions" name="Conversions" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim}>
                {platformData.map((entry, index) => <Cell key={entry.platform} fill={chartColors[(index + 2) % chartColors.length]} />)}
              </Bar>
            </BarChart>
          </ChartCard>
        </div>
        <SectionCard title="Paid ad sets" subtitle="Cost per conversion is derived from local demo numbers.">
          <DataTable
            data={data.paidAds}
            columns={[
              { id: 'name', header: 'Ad set', sortValue: (ad) => ad.name, mobileLabel: 'Ad set', render: (ad) => <div><p className="cell-primary">{ad.name}</p><p className="text-xs muted">{ad.platform} · {data.campaigns.find((campaign) => campaign.id === ad.campaignId)?.name ?? 'Unattributed'}</p></div> },
              { id: 'budget', header: 'Budget', align: 'right', sortValue: (ad) => ad.budget, mobileLabel: 'Budget', render: (ad) => formatINRCompact(ad.budget) },
              { id: 'spend', header: 'Spend', align: 'right', sortValue: (ad) => ad.spend, mobileLabel: 'Spend', render: (ad) => <span className="cell-strong">{formatINRCompact(ad.spend)}</span> },
              { id: 'clicks', header: 'Clicks', align: 'right', sortValue: (ad) => ad.clicks, mobileLabel: 'Clicks', render: (ad) => formatNumber(ad.clicks) },
              { id: 'cpc', header: 'CPC', align: 'right', sortValue: (ad) => safeDivide(ad.spend, ad.clicks) ?? 0, mobileLabel: 'CPC', render: (ad) => formatINR(safeDivide(ad.spend, ad.clicks) ?? 0) },
              { id: 'conversions', header: 'Conversions', align: 'right', sortValue: (ad) => ad.conversions, mobileLabel: 'Conversions', render: (ad) => ad.conversions },
              {
                id: 'status', header: 'Status', mobileLabel: 'Status', sortValue: (ad) => ad.status,
                render: (ad) => (
                  <select className="select" style={{ minHeight: 30, padding: '4px 26px 4px 8px', width: 104, fontSize: '0.7rem' }} value={ad.status} aria-label={`Update status for ${ad.name}`} onChange={(event) => {
                    update('paidAds', (current) => current.map((item) => item.id === ad.id ? { ...item, status: event.target.value as PaidAdCampaign['status'] } : item))
                    pushToast({ title: 'Ad set status updated', description: `${ad.name} marked ${event.target.value} locally. No ad platform was changed.`, tone: 'success' })
                  }}>
                    {['Draft', 'Active', 'Paused', 'Ended'].map((status) => <option key={status}>{status}</option>)}
                  </select>
                ),
              },
            ]}
            rowKey={(ad) => ad.id}
            searchable={(ad) => `${ad.name} ${ad.platform}`}
            searchPlaceholder="Search ad sets…"
            pageSize={6}
            caption="Paid ad sets"
          />
        </SectionCard>
        <DemoNote>No Google, Meta, LinkedIn or YouTube account is connected. Status changes here are local record edits and never pause real spend.</DemoNote>
      </div>
    )
  }

  if (tab === 'social-media') {
    const published = data.socialPosts.filter((post) => post.status === 'Published')
    const avgEngagement = published.length ? published.reduce((sum, post) => sum + post.engagement, 0) / published.length : null
    return (
      <div className="stack-16">
        <TabIntro title="Social media" description="Plan and review sample social posts. Scheduling or publishing here never reaches a live network." actions={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setSocialOpen(true)}>New post draft</Button>} />
        <MetricGrid>
          <MetricCard label="Total posts" value={data.socialPosts.length} sub={`${data.socialPosts.filter((post) => post.status === 'Scheduled').length} scheduled`} icon={<Send size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Published" value={published.length} sub="Sample published records" icon={<BadgeCheck size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Avg engagement" value={formatPercent(avgEngagement)} sub="Published posts only" icon={<TrendingUp size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Drafts" value={data.socialPosts.filter((post) => post.status === 'Draft').length} sub="Local content drafts" icon={<Sparkles size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Posts by network" subtitle="Sample social content mix" height="md" isEmpty={socialByChannel.length === 0}>
            <BarChart data={socialByChannel} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="channel" {...axisProps} />
              <YAxis {...axisProps} width={30} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} posts`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="posts" name="Posts" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim}>
                {socialByChannel.map((entry, index) => <Cell key={entry.channel} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          </ChartCard>
          <SectionCard title="Publishing calendar" subtitle="Next sample posts by date.">
            <div className="stack-10">
              {[...data.socialPosts].filter((post) => post.status !== 'Archived').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6).map((post) => (
                <div key={post.id} className="between" style={{ gap: 10, padding: '8px 2px', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{post.title}</p>
                    <p className="text-xs muted">{post.channel} · {formatDate(post.date)}</p>
                  </div>
                  <StatusBadge status={post.status} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
        <EntityGrid columns={3}>
          {data.socialPosts.map((post) => (
            <EntityCard
              key={post.id}
              title={post.title}
              subtitle={`${post.channel} · ${formatDate(post.date)}`}
              badge={<StatusBadge status={post.status} />}
              meta={
                <>
                  <span>{post.campaignId ? data.campaigns.find((campaign) => campaign.id === post.campaignId)?.name ?? 'Campaign' : 'No campaign'}</span>
                  {post.status === 'Published' ? <span>{formatPercent(post.engagement)} engagement</span> : <span>Engagement not available</span>}
                </>
              }
            >
              <p className="text-xs muted preview-copy" style={{ whiteSpace: 'normal' }}>{post.content}</p>
            </EntityCard>
          ))}
        </EntityGrid>

        <SectionCard
          title="Content studio"
          subtitle="Ideas, drafts and reviews for social and campaign content."
          actions={<Button variant="ghost" size="xs" icon={<Plus size={13} />} onClick={() => setContentOpen(true)}>Add idea</Button>}
        >
          <div className="mini-stats" style={{ marginBottom: 12 }}>
            {CONTENT_STATUSES.map((status) => (
              <div className="mini-stat" key={status}>
                <p className="mini-stat__label">{status}</p>
                <p className="mini-stat__value">{data.content.filter((item) => item.status === status).length}</p>
              </div>
            ))}
          </div>
          <EntityGrid columns={3}>
            {data.content.slice(0, 6).map((item) => (
              <EntityCard
                key={item.id}
                title={item.title}
                subtitle={`${item.type} · ${item.channel}`}
                badge={<StatusBadge status={item.status} />}
                meta={
                  <>
                    <span>{item.owner}</span>
                    <span>{item.campaignId ? data.campaigns.find((campaign) => campaign.id === item.campaignId)?.name ?? 'Campaign' : 'No campaign'}</span>
                  </>
                }
              >
                <p className="text-xs muted preview-copy" style={{ whiteSpace: 'normal' }}>{item.body}</p>
                <Button variant="ghost" size="xs" onClick={() => setContentPreviewId(item.id)}>Preview idea</Button>
              </EntityCard>
            ))}
          </EntityGrid>
          <DataNote>Content records are local drafts only. No brand, legal or CMS workflow is triggered.</DataNote>
        </SectionCard>

        <SectionCard
          title="Video production"
          subtitle="Production stages for social and campaign video work."
        >
          <EntityGrid columns={3}>
            {data.videos.map((video) => (
              <EntityCard
                key={video.id}
                title={video.title}
                subtitle={`${video.team.join(', ')} · publish ${formatDate(video.publishDate)}`}
                badge={<StatusBadge status={video.status} />}
                meta={
                  <>
                    <span>{video.campaignId ? data.campaigns.find((campaign) => campaign.id === video.campaignId)?.name ?? 'Campaign' : 'No campaign'}</span>
                    <span>{video.progress}% complete</span>
                  </>
                }
              >
                <div className="stack-8">
                  <ProgressBar value={video.progress} size="sm" tone={video.status === 'Completed' ? 'success' : video.status === 'At Risk' ? 'warning' : 'brand'} />
                  <div className="between" style={{ gap: 8 }}>
                    <span className="text-xs muted">Production stage</span>
                    <select className="select" style={{ minHeight: 28, padding: '3px 24px 3px 7px', width: 112, fontSize: '0.68rem' }} value={video.stage} aria-label={`Update stage for ${video.title}`} onChange={(event) => {
                      update('videos', (current) => current.map((item) => item.id === video.id ? { ...item, stage: event.target.value as VideoProject['stage'] } : item))
                      pushToast({ title: 'Video stage updated', description: `${video.title} moved to ${event.target.value} in local demo data.`, tone: 'success' })
                    }}>
                      {VIDEO_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
                    </select>
                  </div>
                </div>
              </EntityCard>
            ))}
          </EntityGrid>
          <DataNote>Video projects are sample records. No render, publishing or media platform is connected.</DataNote>
        </SectionCard>

        <DataNote>Engagement figures are sample values on published posts. Draft and scheduled posts have no measured performance.</DataNote>
        {socialOpen ? <SocialPostModal open onClose={() => setSocialOpen(false)} onSave={addSocialPost} campaigns={data.campaigns} /> : null}
        {contentPreview}
        {contentOpen ? <ContentModal open onClose={() => setContentOpen(false)} onSave={addContent} campaigns={data.campaigns} /> : null}
      </div>
    )
  }

  if (tab === 'email-marketing') {
    const sent = data.emails.filter((email) => email.status === 'Sent')
    const totalSent = sent.reduce((sum, email) => sum + email.sent, 0)
    const avgOpen = sent.length ? sent.reduce((sum, email) => sum + email.openRate, 0) / sent.length : null
    return (
      <div className="stack-16">
        <TabIntro title="Email marketing" description="Draft, schedule and review sample email campaigns. No email service provider is connected and no messages are sent." actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => {
          const result = downloadCsv('email-campaigns-demo', [
            { header: 'ID', value: (email: EmailCampaign) => email.id },
            { header: 'Name', value: (email: EmailCampaign) => email.name },
            { header: 'Subject', value: (email: EmailCampaign) => email.subject },
            { header: 'Audience', value: (email: EmailCampaign) => email.audience },
            { header: 'Status', value: (email: EmailCampaign) => email.status },
            { header: 'Scheduled', value: (email: EmailCampaign) => email.scheduledAt },
            { header: 'Sent', value: (email: EmailCampaign) => email.sent },
            { header: 'Open rate %', value: (email: EmailCampaign) => email.openRate },
            { header: 'Click rate %', value: (email: EmailCampaign) => email.clickRate },
          ], data.emails)
          pushToast({ title: result.ok ? 'Email CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
        }}>Export CSV</Button>} />
        <MetricGrid>
          <MetricCard label="Email campaigns" value={data.emails.length} sub={`${data.emails.filter((email) => email.status === 'Scheduled').length} scheduled`} icon={<Mail size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Sample sends" value={formatNumber(totalSent)} sub="Reported on sent records" icon={<Send size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Avg open rate" value={formatPercent(avgOpen)} sub="Sent campaigns only" icon={<Eye size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Avg click rate" value={formatPercent(sent.length ? sent.reduce((sum, email) => sum + email.clickRate, 0) / sent.length : null)} sub="Sent campaigns only" icon={<MousePointerClick size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <SectionCard title="Email campaigns" subtitle="Open a record to read the full demo email content.">
          <DataTable
            data={data.emails}
            columns={[
              { id: 'name', header: 'Campaign', sortValue: (email) => email.name, mobileLabel: 'Campaign', render: (email) => <div><p className="cell-primary">{email.name}</p><p className="text-xs muted">{email.subject}</p></div> },
              { id: 'audience', header: 'Audience', sortValue: (email) => email.audience, mobileLabel: 'Audience', hideMobile: true, render: (email) => <span className="text-xs">{email.audience}</span> },
              { id: 'sent', header: 'Sent', align: 'right', sortValue: (email) => email.sent, mobileLabel: 'Sent', render: (email) => formatNumber(email.sent) },
              { id: 'open', header: 'Open rate', align: 'right', sortValue: (email) => email.openRate, mobileLabel: 'Open rate', render: (email) => email.sent ? formatPercent(email.openRate) : <span className="muted">—</span> },
              { id: 'click', header: 'Click rate', align: 'right', sortValue: (email) => email.clickRate, mobileLabel: 'Click rate', render: (email) => email.sent ? formatPercent(email.clickRate) : <span className="muted">—</span> },
              { id: 'date', header: 'Schedule / sent', sortValue: (email) => email.scheduledAt, mobileLabel: 'Schedule', render: (email) => <span className="text-xs">{email.scheduledAt ? formatDateTime(email.scheduledAt) : 'Not scheduled'}</span> },
              { id: 'status', header: 'Status', sortValue: (email) => email.status, mobileLabel: 'Status', render: (email) => <StatusBadge status={email.status} /> },
              { id: 'actions', header: '', align: 'right', mobileLabel: 'Actions', render: (email) => <Button variant="ghost" size="xs" onClick={() => setEmailPreviewId(email.id)}>Preview</Button> },
            ]}
            rowKey={(email) => email.id}
            searchable={(email) => `${email.name} ${email.subject} ${email.audience} ${email.previewText}`}
            searchPlaceholder="Search emails…"
            pageSize={6}
            onRowClick={(email) => setEmailPreviewId(email.id)}
            caption="Email campaigns"
          />
        </SectionCard>
        <DataNote>Open and click rates are sample numbers on sent records. Nothing is dispatched from this portal.</DataNote>
        {emailPreview}
      </div>
    )
  }

  if (tab === 'website-seo') {
    const done = data.seoTasks.filter((task) => task.status === 'Done').length
    const avgPosition = data.keywords.length ? data.keywords.reduce((sum, keyword) => sum + keyword.position, 0) / data.keywords.length : null
    return (
      <div className="stack-16">
        <TabIntro title="Website & SEO" description="Track sample on-page tasks and keyword positions. No search console or analytics integration is connected." actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => {
          const result = downloadCsv('seo-keywords-demo', [
            { header: 'Keyword', value: (keyword: typeof data.keywords[number]) => keyword.keyword },
            { header: 'Volume', value: (keyword: typeof data.keywords[number]) => keyword.volume },
            { header: 'Position', value: (keyword: typeof data.keywords[number]) => keyword.position },
            { header: 'Change', value: (keyword: typeof data.keywords[number]) => keyword.change },
            { header: 'Intent', value: (keyword: typeof data.keywords[number]) => keyword.intent },
          ], data.keywords)
          pushToast({ title: result.ok ? 'Keyword CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
        }}>Export keywords</Button>} />
        <MetricGrid>
          <MetricCard label="SEO tasks" value={data.seoTasks.length} sub={`${done} complete · ${data.seoTasks.length - done} open`} icon={<Globe2 size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Tracked keywords" value={data.keywords.length} sub="Sample search portfolio" icon={<Search size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Avg position" value={avgPosition ? avgPosition.toFixed(1) : '—'} sub="Lower is better" icon={<TrendingUp size={15} />} tone="var(--chart-3)" />
          <MetricCard label="High priority open" value={data.seoTasks.filter((task) => task.priority === 'High' && task.status !== 'Done').length} sub="Needs local attention" icon={<CircleAlert size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Keyword volume and position" subtitle="Sample keyword dataset" height="md" isEmpty={data.keywords.length === 0}>
            <BarChart data={data.keywords.map((keyword) => ({ name: keyword.keyword.length > 18 ? `${keyword.keyword.slice(0, 18)}…` : keyword.keyword, volume: keyword.volume, position: keyword.position }))} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 0 }}>
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" {...axisProps} />
              <YAxis type="category" dataKey="name" {...axisProps} width={112} tick={{ fill: 'var(--muted)', fontSize: 9 }} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => formatNumber(value)} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="volume" name="Monthly volume" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim}>
                {data.keywords.map((keyword, index) => <Cell key={keyword.id} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          </ChartCard>
          <SectionCard title="SEO task status" subtitle="Local task board, not connected to a CMS.">
            <div className="stack-12">
              {(['To Do', 'In Progress', 'Done'] as const).map((status) => {
                const rows = data.seoTasks.filter((task) => task.status === status)
                return (
                  <div key={status}>
                    <div className="between" style={{ marginBottom: 5 }}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{status}</span>
                      <span className="text-xs muted">{rows.length} tasks</span>
                    </div>
                    <ProgressBar value={(rows.length / Math.max(1, data.seoTasks.length)) * 100} size="sm" tone={status === 'Done' ? 'success' : status === 'In Progress' ? 'warning' : 'brand'} />
                  </div>
                )
              })}
            </div>
            <div className="stack-8 mt-12">
              {data.seoTasks.filter((task) => task.status !== 'Done').slice(0, 4).map((task) => (
                <div key={task.id} className="between" style={{ gap: 10, padding: '7px 2px', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{task.task}</p>
                    <p className="text-xs muted truncate">{task.page} · due {formatDate(task.dueDate)}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
        <div className="dashboard-grid dashboard-grid--equal">
          <SectionCard title="On-page task register" subtitle="Update status in local demo data.">
            <DataTable
              data={data.seoTasks}
              compact
              columns={[
                { id: 'task', header: 'Task', sortValue: (task) => task.task, mobileLabel: 'Task', render: (task) => <div><p className="cell-primary">{task.task}</p><p className="text-xs muted">{task.page}</p></div> },
                { id: 'owner', header: 'Owner', sortValue: (task) => task.owner, mobileLabel: 'Owner', hideMobile: true, render: (task) => task.owner },
                { id: 'due', header: 'Due', sortValue: (task) => task.dueDate, mobileLabel: 'Due', render: (task) => formatDate(task.dueDate) },
                {
                  id: 'status', header: 'Status', mobileLabel: 'Status', sortValue: (task) => task.status,
                  render: (task) => (
                    <select className="select" style={{ minHeight: 28, padding: '3px 24px 3px 7px', width: 104, fontSize: '0.68rem' }} value={task.status} aria-label={`Update ${task.task}`} onChange={(event) => {
                      update('seoTasks', (current) => current.map((item) => item.id === task.id ? { ...item, status: event.target.value as typeof task.status } : item))
                      pushToast({ title: 'SEO task updated', description: `${task.task} moved to ${event.target.value} locally.`, tone: 'success' })
                    }}>
                      {['To Do', 'In Progress', 'Done'].map((status) => <option key={status}>{status}</option>)}
                    </select>
                  ),
                },
              ]}
              rowKey={(task) => task.id}
              searchable={(task) => `${task.task} ${task.page} ${task.owner}`}
              searchPlaceholder="Search SEO tasks…"
              pageSize={5}
              caption="SEO tasks"
            />
          </SectionCard>
          <SectionCard title="Keyword watch list" subtitle="Illustrative positions and movement.">
            <DataTable
              data={data.keywords}
              compact
              columns={[
                { id: 'keyword', header: 'Keyword', sortValue: (keyword) => keyword.keyword, mobileLabel: 'Keyword', render: (keyword) => <span className="cell-primary">{keyword.keyword}</span> },
                { id: 'volume', header: 'Volume', align: 'right', sortValue: (keyword) => keyword.volume, mobileLabel: 'Volume', render: (keyword) => formatNumber(keyword.volume) },
                { id: 'position', header: 'Position', align: 'right', sortValue: (keyword) => keyword.position, mobileLabel: 'Position', render: (keyword) => `#${keyword.position}` },
                { id: 'change', header: 'Change', align: 'right', sortValue: (keyword) => keyword.change, mobileLabel: 'Change', render: (keyword) => <span className={keyword.change > 0 ? 'success-text' : keyword.change < 0 ? 'danger-text' : ''}>{keyword.change > 0 ? `+${keyword.change}` : keyword.change}</span> },
                { id: 'intent', header: 'Intent', sortValue: (keyword) => keyword.intent, mobileLabel: 'Intent', render: (keyword) => <span className="text-xs">{keyword.intent}</span> },
              ]}
              rowKey={(keyword) => keyword.id}
              searchable={(keyword) => `${keyword.keyword} ${keyword.intent}`}
              searchPlaceholder="Search keywords…"
              pageSize={5}
              caption="Keywords"
            />
          </SectionCard>
        </div>
        {emailPreview}
      </div>
    )
  }

  if (tab === 'content-studio') {
    const approved = data.content.filter((item) => item.status === 'Approved').length
    return (
      <div className="stack-16">
        <TabIntro title="Content Studio" description="Collect ideas, draft copy and briefs, then move them through a local review state. No documents are published or shared." actions={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setContentOpen(true)}>New content idea</Button>} />
        <MetricGrid>
          <MetricCard label="Content items" value={data.content.length} sub={`${approved} approved · ${data.content.length - approved} in progress`} icon={<Sparkles size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Ideas" value={data.content.filter((item) => item.status === 'Idea').length} sub="Unworked demo concepts" icon={<TrendingUp size={15} />} tone="var(--chart-5)" />
          <MetricCard label="In review" value={data.content.filter((item) => item.status === 'In Review').length} sub="Waiting for a local reviewer" icon={<Eye size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Approved" value={approved} sub="Ready for the next demo step" icon={<BadgeCheck size={15} />} tone="var(--chart-2)" />
        </MetricGrid>
        <div className="entity-grid entity-grid--3">
          {data.content.map((item) => (
            <EntityCard
              key={item.id}
              title={item.title}
              subtitle={`${item.type} · ${item.channel}${item.campaignId ? ` · ${data.campaigns.find((campaign) => campaign.id === item.campaignId)?.name ?? 'Campaign'}` : ''}`}
              badge={<StatusBadge status={item.status} />}
              meta={<><span>{item.owner}</span><span>Added {formatDate(item.createdAt)}</span></>}
              actions={
                <>
                  <Button variant="ghost" size="xs" onClick={() => setContentPreviewId(item.id)}>Open</Button>
                  {item.status !== 'Approved' ? (
                    <Button variant="ghost" size="xs" onClick={() => {
                      const next = item.status === 'Idea' ? 'Draft' : item.status === 'Draft' ? 'In Review' : 'Approved'
                      update('content', (current) => current.map((row) => row.id === item.id ? { ...row, status: next } : row))
                      pushToast({ title: 'Content moved forward', description: `${item.title} is now ${next} in local demo data.`, tone: 'success' })
                    }}>
                      Move to {item.status === 'Idea' ? 'Draft' : item.status === 'Draft' ? 'Review' : 'Approved'}
                    </Button>
                  ) : null}
                </>
              }
            >
              <p className="text-xs muted" style={{ lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.body}</p>
            </EntityCard>
          ))}
        </div>
        <DataNote>Content approval is a demo state change in this browser only. Nothing is sent for legal or brand review.</DataNote>
        {contentOpen ? <ContentModal open onClose={() => setContentOpen(false)} onSave={addContent} campaigns={data.campaigns} /> : null}
        {contentPreview}
      </div>
    )
  }

  if (tab === 'influencers') {
    const confirmed = data.influencers.filter((influencer) => influencer.contactStatus === 'Confirmed')
    const totalFee = confirmed.reduce((sum, influencer) => sum + influencer.estimatedFee, 0)
    return (
      <div className="stack-16">
        <TabIntro title="Influencers & celebrities" description="Review fictional creator profiles, fees and contact status. Fees are estimates, not commitments, and no outreach is sent." actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => {
          const result = downloadCsv('influencers-demo', [
            { header: 'Name', value: (influencer: Influencer) => influencer.name },
            { header: 'Handle', value: (influencer: Influencer) => influencer.handle },
            { header: 'Category', value: (influencer: Influencer) => influencer.category },
            { header: 'Followers', value: (influencer: Influencer) => influencer.followers },
            { header: 'Fee', value: (influencer: Influencer) => influencer.estimatedFee },
            { header: 'Status', value: (influencer: Influencer) => influencer.contactStatus },
            { header: 'Engagement %', value: (influencer: Influencer) => influencer.engagementRate },
          ], data.influencers)
          pushToast({ title: result.ok ? 'Influencer CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
        }}>Export CSV</Button>} />
        <MetricGrid>
          <MetricCard label="Creator roster" value={data.influencers.length} sub={`${confirmed.length} confirmed for demo campaigns`} icon={<Users size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Estimated fees" value={formatINRCompact(totalFee)} sub="Confirmed creators only" icon={<TrendingUp size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Avg engagement" value={formatPercent(data.influencers.length ? data.influencers.reduce((sum, influencer) => sum + influencer.engagementRate, 0) / data.influencers.length : null)} sub="Sample profile metrics" icon={<Sparkles size={15} />} tone="var(--chart-5)" />
          <MetricCard label="Negotiating" value={data.influencers.filter((influencer) => influencer.contactStatus === 'Negotiating').length} sub="No messages have been sent" icon={<Send size={15} />} tone="var(--chart-2)" />
        </MetricGrid>
        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard title="Estimated fee by creator" subtitle="Sample fee benchmarks · INR" height="md" isEmpty={data.influencers.length === 0}>
            <BarChart data={[...data.influencers].sort((a, b) => b.estimatedFee - a.estimatedFee).map((influencer) => ({ name: influencer.name, fee: influencer.estimatedFee }))} layout="vertical" margin={{ top: 4, right: 14, left: 4, bottom: 0 }}>
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" {...axisProps} tickFormatter={(value: number) => formatINRCompact(value)} />
              <YAxis type="category" dataKey="name" {...axisProps} width={96} tick={{ fill: 'var(--muted)', fontSize: 9.5 }} />
              <Tooltip content={<ChartTooltip valueFormatter={formatINR} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="fee" name="Estimated fee" radius={[0, 4, 4, 0]} isAnimationActive={chartAnim}>
                {data.influencers.map((influencer) => <Cell key={influencer.id} fill={influencer.contactStatus === 'Confirmed' ? 'var(--chart-2)' : 'var(--chart-1)'} />)}
              </Bar>
            </BarChart>
          </ChartCard>
          <SectionCard title="Contact status" subtitle="Update the local demo stage. This sends no email or DM.">
            <div className="stack-12">
              {CONTACT_STATUSES.map((status) => (
                <div key={status} className="between" style={{ gap: 10 }}>
                  <span className="text-xs">{status}</span>
                  <Badge tone={status === 'Confirmed' ? 'success' : status === 'Declined' ? 'danger' : status === 'Negotiating' ? 'warning' : 'neutral'}>{data.influencers.filter((influencer) => influencer.contactStatus === status).length}</Badge>
                </div>
              ))}
            </div>
            <div className="callout callout--info mt-12">
              <CircleAlert size={14} />
              <span>Creator names and handles are fictional demo records. No social platform is queried.</span>
            </div>
          </SectionCard>
        </div>
        <EntityGrid columns={3}>
          {data.influencers.map((influencer) => (
            <EntityCard
              key={influencer.id}
              title={influencer.name}
              subtitle={`${influencer.handle} · ${influencer.category}`}
              badge={<StatusBadge status={influencer.contactStatus} />}
              meta={<><span>{formatNumber(influencer.followers)} followers</span><span>{formatPercent(influencer.engagementRate)} engagement</span></>}
              actions={
                <>
                  <select
                    className="select"
                    style={{ minHeight: 30, padding: '4px 26px 4px 8px', width: 132, fontSize: '0.7rem' }}
                    value={influencer.contactStatus}
                    aria-label={`Contact status for ${influencer.name}`}
                    onChange={(event) => {
                      update('influencers', (current) => current.map((item) => item.id === influencer.id ? { ...item, contactStatus: event.target.value as Influencer['contactStatus'] } : item))
                      pushToast({ title: 'Creator status updated', description: `${influencer.name} marked ${event.target.value} locally.`, tone: 'success' })
                    }}
                  >
                    {CONTACT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <Button variant="ghost" size="xs" onClick={() => pushToast({ title: 'Fee is illustrative', description: `${formatINR(influencer.estimatedFee)} is a demo estimate, not a signed commitment.`, tone: 'info' })}>Fee</Button>
                </>
              }
            >
              <div className="mini-stats">
                <div className="mini-stat"><p className="mini-stat__label">Est. fee</p><p className="mini-stat__value">{formatINRCompact(influencer.estimatedFee)}</p></div>
                <div className="mini-stat"><p className="mini-stat__label">Score</p><p className="mini-stat__value">{influencer.performanceScore || '—'}</p></div>
              </div>
            </EntityCard>
          ))}
        </EntityGrid>
        <DataNote>Audience descriptions, fees and performance scores are fictional. No creator contract or payment is created here.</DataNote>
      </div>
    )
  }

  if (tab === 'video-production') {
    return (
      <div className="stack-16">
        <TabIntro title="Video production" description="Track sample briefs, scripts, shoots and edits. Uploading or publishing video is not supported in this frontend demo." actions={<Badge tone="neutral">{data.videos.length} projects</Badge>} />
        <MetricGrid>
          <MetricCard label="Video projects" value={data.videos.length} sub={`${data.videos.filter((video) => video.stage === 'Published').length} published in demo`} icon={<Film size={15} />} tone="var(--chart-1)" />
          <MetricCard label="In production" value={data.videos.filter((video) => !['Published', 'Brief'].includes(video.stage)).length} sub="Script, shoot, edit or review" icon={<Video size={15} />} tone="var(--chart-3)" />
          <MetricCard label="At risk" value={data.videos.filter((video) => video.status === 'At Risk' || video.status === 'Delayed').length} sub="Sample status flag" icon={<CircleAlert size={15} />} tone="var(--chart-4)" />
          <MetricCard label="Avg progress" value={formatPercent(data.videos.length ? data.videos.reduce((sum, video) => sum + video.progress, 0) / data.videos.length : null, 0)} sub="Across all projects" icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
        </MetricGrid>
        <div className="entity-grid entity-grid--2">
          {data.videos.map((video) => (
            <article className="card card--pad" key={video.id}>
              <div className="between" style={{ alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p className="text-xs faint">{video.id} · publish {formatDate(video.publishDate)}</p>
                  <h3 style={{ marginTop: 3, fontSize: '0.9rem' }}>{video.title}</h3>
                  <p className="text-xs muted">{video.campaignId ? data.campaigns.find((campaign) => campaign.id === video.campaignId)?.name ?? 'Campaign' : 'No campaign'}</p>
                </div>
                <StatusBadge status={video.status} />
              </div>
              <p className="text-xs muted mt-10" style={{ lineHeight: 1.55 }}>{video.brief}</p>
              <div className="between mt-12" style={{ gap: 8 }}>
                <span className="text-xs muted">Stage: <strong style={{ color: 'var(--text)' }}>{video.stage}</strong></span>
                <span className="text-xs muted">{video.progress}%</span>
              </div>
              <ProgressBar value={video.progress} tone={video.progress >= 80 ? 'success' : video.progress >= 40 ? 'warning' : 'brand'} size="sm" className="mt-4" />
              <div className="between mt-10" style={{ gap: 8, flexWrap: 'wrap' }}>
                <div className="row-6">
                  {video.team.map((member) => <Avatar key={member} name={member} size="sm" />)}
                </div>
                <select
                  className="select"
                  style={{ minHeight: 30, padding: '4px 26px 4px 8px', width: 118, fontSize: '0.7rem' }}
                  value={video.stage}
                  aria-label={`Production stage for ${video.title}`}
                  onChange={(event) => {
                    update('videos', (current) => current.map((item) => item.id === video.id ? { ...item, stage: event.target.value as VideoProject['stage'] } : item))
                    pushToast({ title: 'Production stage updated', description: `${video.title} moved to ${event.target.value} in local demo data.`, tone: 'success' })
                  }}
                >
                  {VIDEO_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
                </select>
              </div>
            </article>
          ))}
        </div>
        <DemoNote>Video projects are planning records only. No video files are stored on a server and nothing is published to a channel.</DemoNote>
      </div>
    )
  }

  return null
}

function CampaignFormModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (values: CampaignFormValues) => void }) {
  const [values, setValues] = useState<CampaignFormValues>(blankCampaignForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setValues(blankCampaignForm())
      setErrors({})
    }
  }, [open])

  const set = <K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.name.trim()) next.name = 'Campaign name is required.'
    if (!values.objective.trim()) next.objective = 'Describe the campaign objective.'
    if (!values.startDate) next.startDate = 'Choose a start date.'
    if (!values.endDate) next.endDate = 'Choose an end date.'
    if (values.startDate && values.endDate && values.endDate < values.startDate) next.endDate = 'End date must be on or after the start date.'
    const budget = Number(values.budget)
    if (!values.budget || !Number.isFinite(budget) || budget <= 0) next.budget = 'Enter a budget greater than zero.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a demo campaign"
      description="Adds a campaign to localStorage only. No ad account, budget or external system is changed."
      size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save campaign</Button></>}
    >
      <div className="form-grid">
        <Field label="Campaign name" htmlFor="cmp-name" required error={errors.name} className="form-grid__full">
          <input id="cmp-name" className="input" value={values.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Festive Creator Series" aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Channel" htmlFor="cmp-channel">
          <select id="cmp-channel" className="select" value={values.channel} onChange={(event) => set('channel', event.target.value as CampaignChannel)}>
            {CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}
          </select>
        </Field>
        <Field label="Initial status" htmlFor="cmp-status">
          <select id="cmp-status" className="select" value={values.status} onChange={(event) => set('status', event.target.value as CampaignStatus)}>
            {CAMPAIGN_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Product" htmlFor="cmp-product">
          <input id="cmp-product" className="input" value={values.product} onChange={(event) => set('product', event.target.value)} placeholder="e.g. SmartHome Hub" />
        </Field>
        <Field label="Budget (INR)" htmlFor="cmp-budget" required error={errors.budget}>
          <input id="cmp-budget" className="input" type="number" min={0} step={1000} value={values.budget} onChange={(event) => set('budget', event.target.value)} placeholder="e.g. 500000" aria-invalid={Boolean(errors.budget)} />
        </Field>
        <Field label="Start date" htmlFor="cmp-start" required error={errors.startDate}>
          <input id="cmp-start" className="input" type="date" value={values.startDate} onChange={(event) => set('startDate', event.target.value)} aria-invalid={Boolean(errors.startDate)} />
        </Field>
        <Field label="End date" htmlFor="cmp-end" required error={errors.endDate}>
          <input id="cmp-end" className="input" type="date" value={values.endDate} onChange={(event) => set('endDate', event.target.value)} aria-invalid={Boolean(errors.endDate)} />
        </Field>
        <Field label="Owner" htmlFor="cmp-owner">
          <input id="cmp-owner" className="input" value={values.owner} onChange={(event) => set('owner', event.target.value)} />
        </Field>
        <Field label="Audience" htmlFor="cmp-audience" className="form-grid__full">
          <input id="cmp-audience" className="input" value={values.audience} onChange={(event) => set('audience', event.target.value)} placeholder="Who is this campaign for?" />
        </Field>
        <Field label="Objective" htmlFor="cmp-objective" required error={errors.objective} className="form-grid__full">
          <textarea id="cmp-objective" className="textarea" rows={3} value={values.objective} onChange={(event) => set('objective', event.target.value)} placeholder="What should this campaign achieve?" aria-invalid={Boolean(errors.objective)} />
        </Field>
      </div>
    </Modal>
  )
}

function CampaignDetailModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={campaign.name} description={`${campaign.channel} campaign · ${campaign.status}`} size="wide" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="stack-16">
        <div className="row-8" style={{ flexWrap: 'wrap' }}>
          <StatusBadge status={campaign.status} />
          <Badge tone="neutral">{campaign.id}</Badge>
          <Badge tone="neutral">{campaign.owner}</Badge>
        </div>
        <div className="mini-stats">
          <div className="mini-stat"><p className="mini-stat__label">Budget</p><p className="mini-stat__value">{formatINRCompact(campaign.budget)}</p></div>
          <div className="mini-stat"><p className="mini-stat__label">Spend</p><p className="mini-stat__value">{formatINRCompact(campaign.spend)}</p></div>
          <div className="mini-stat"><p className="mini-stat__label">Leads</p><p className="mini-stat__value">{formatNumber(campaign.kpis.leads)}</p></div>
        </div>
        <DetailRows
          items={[
            { label: 'Objective', value: campaign.objective },
            { label: 'Audience', value: campaign.audience || 'Not specified' },
            { label: 'Product', value: campaign.product },
            { label: 'Window', value: `${formatDate(campaign.startDate)} – ${formatDate(campaign.endDate)}` },
            { label: 'Qualified leads', value: formatNumber(campaign.kpis.qualifiedLeads) },
            { label: 'Conversions', value: formatNumber(campaign.kpis.conversions) },
            { label: 'Impressions', value: formatNumber(campaign.kpis.impressions) },
            { label: 'Clicks', value: formatNumber(campaign.kpis.clicks) },
            { label: 'CTR', value: formatPercent(campaignCtr(campaign)) },
            { label: 'CPL', value: formatINR(campaignCpl(campaign) ?? 0) },
            { label: 'Lead → conversion', value: formatPercent(campaignConversionRate(campaign)) },
            { label: 'Attributed revenue', value: formatINR(campaign.kpis.revenue) },
          ]}
          columns={3}
        />
        <div>
          <p className="detail-label">Budget utilisation</p>
          <ProgressBar value={campaign.budget > 0 ? (campaign.spend / campaign.budget) * 100 : 0} tone="brand" showValue />
        </div>
        <DataNote>Campaign KPIs are sample figures. This dialog does not connect to any ad or analytics platform.</DataNote>
      </div>
    </Modal>
  )
}

function SocialPostModal({ open, onClose, onSave, campaigns }: { open: boolean; onClose: () => void; onSave: (values: SocialFormValues) => void; campaigns: Campaign[] }) {
  const [values, setValues] = useState<SocialFormValues>(() => ({ channel: 'Instagram', title: '', content: '', date: dateOnlyFromNow(1), campaignId: '', status: 'Draft' }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof SocialFormValues>(key: K, value: SocialFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.title.trim()) next.title = 'Add a post title.'
    if (!values.content.trim()) next.content = 'Write the post copy.'
    if (!values.date) next.date = 'Choose a date.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a demo social post" description="Saves a draft locally. Nothing is scheduled or published to a social network." size="wide" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save draft</Button></>}>
      <div className="form-grid">
        <Field label="Title" htmlFor="social-title" required error={errors.title} className="form-grid__full">
          <input id="social-title" className="input" value={values.title} onChange={(event) => set('title', event.target.value)} aria-invalid={Boolean(errors.title)} />
        </Field>
        <Field label="Network" htmlFor="social-channel">
          <select id="social-channel" className="select" value={values.channel} onChange={(event) => set('channel', event.target.value as SocialPost['channel'])}>
            {['Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'X'].map((channel) => <option key={channel}>{channel}</option>)}
          </select>
        </Field>
        <Field label="Date" htmlFor="social-date" required error={errors.date}>
          <input id="social-date" className="input" type="date" value={values.date} onChange={(event) => set('date', event.target.value)} aria-invalid={Boolean(errors.date)} />
        </Field>
        <Field label="Campaign" htmlFor="social-campaign">
          <select id="social-campaign" className="select" value={values.campaignId} onChange={(event) => set('campaignId', event.target.value)}>
            <option value="">No campaign</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </Field>
        <Field label="Status" htmlFor="social-status">
          <select id="social-status" className="select" value={values.status} onChange={(event) => set('status', event.target.value as SocialPost['status'])}>
            {['Draft', 'Scheduled'].map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Post copy" htmlFor="social-content" required error={errors.content} className="form-grid__full" hint="Saved locally as demo content. Emoji and links are not validated.">
          <textarea id="social-content" className="textarea" rows={5} value={values.content} onChange={(event) => set('content', event.target.value)} aria-invalid={Boolean(errors.content)} />
        </Field>
      </div>
    </Modal>
  )
}

function ContentModal({ open, onClose, onSave, campaigns }: { open: boolean; onClose: () => void; onSave: (values: ContentFormValues) => void; campaigns: Campaign[] }) {
  const [values, setValues] = useState<ContentFormValues>(() => ({ title: '', type: 'Idea', channel: 'Social', campaignId: '', body: '', status: 'Idea' }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof ContentFormValues>(key: K, value: ContentFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.title.trim()) next.title = 'Add a content title.'
    if (!values.body.trim()) next.body = 'Describe the content idea or copy.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }

  return (
    <Modal open={open} onClose={onClose} title="New content idea" description="Stored in local demo data only. No brand, legal or CMS workflow is triggered." size="wide" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save idea</Button></>}>
      <div className="form-grid">
        <Field label="Title" htmlFor="content-title" required error={errors.title} className="form-grid__full">
          <input id="content-title" className="input" value={values.title} onChange={(event) => set('title', event.target.value)} aria-invalid={Boolean(errors.title)} />
        </Field>
        <Field label="Type" htmlFor="content-type">
          <select id="content-type" className="select" value={values.type} onChange={(event) => set('type', event.target.value as ContentItem['type'])}>
            {['Idea', 'Copy', 'Brief'].map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Channel" htmlFor="content-channel">
          <input id="content-channel" className="input" value={values.channel} onChange={(event) => set('channel', event.target.value)} placeholder="Blog, Social, Video, Print…" />
        </Field>
        <Field label="Campaign" htmlFor="content-campaign">
          <select id="content-campaign" className="select" value={values.campaignId} onChange={(event) => set('campaignId', event.target.value)}>
            <option value="">No campaign</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </Field>
        <Field label="Status" htmlFor="content-status">
          <select id="content-status" className="select" value={values.status} onChange={(event) => set('status', event.target.value as ContentItem['status'])}>
            {CONTENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Idea / copy / brief" htmlFor="content-body" required error={errors.body} className="form-grid__full">
          <textarea id="content-body" className="textarea" rows={5} value={values.body} onChange={(event) => set('body', event.target.value)} aria-invalid={Boolean(errors.body)} />
        </Field>
      </div>
    </Modal>
  )
}

function EmailPreviewModal({ email, onClose, onStatusChange }: { email: EmailCampaign; onClose: () => void; onStatusChange: (status: EmailCampaign['status']) => void }) {
  return (
    <Modal open onClose={onClose} title={email.name} description="Demo email content. No email has been or will be sent." size="wide" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="stack-16">
        <div className="email-preview">
          <div className="email-preview__head">
            <p className="email-preview__subject">{email.subject}</p>
            <p className="email-preview__meta">{email.previewText}</p>
            <p className="email-preview__meta">Audience: {email.audience}</p>
          </div>
          <div className="email-preview__body">{email.body}</div>
        </div>
        <div className="mini-stats">
          <div className="mini-stat"><p className="mini-stat__label">Sent</p><p className="mini-stat__value">{formatNumber(email.sent)}</p></div>
          <div className="mini-stat"><p className="mini-stat__label">Open rate</p><p className="mini-stat__value">{formatPercent(email.openRate)}</p></div>
          <div className="mini-stat"><p className="mini-stat__label">Click rate</p><p className="mini-stat__value">{formatPercent(email.clickRate)}</p></div>
        </div>
        <Field label="Demo status" htmlFor="email-status" hint="This only changes the local record. No send is triggered.">
          <select id="email-status" className="select" value={email.status} onChange={(event) => onStatusChange(event.target.value as EmailCampaign['status'])}>
            {['Draft', 'Scheduled', 'Sent'].map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <DataNote>Scheduling here does not queue an email. The sender, ESP and audience lists are fictional.</DataNote>
      </div>
    </Modal>
  )
}

function ContentPreviewModal({ item, onClose, onStatusChange }: { item: ContentItem; onClose: () => void; onStatusChange: (status: ContentItem['status']) => void }) {
  return (
    <Modal open onClose={onClose} title={item.title} description={`${item.type} · ${item.channel} · added ${formatDate(item.createdAt)}`} size="md" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="stack-16">
        <div className="row-8" style={{ flexWrap: 'wrap' }}>
          <StatusBadge status={item.status} />
          <Badge tone="neutral">{item.owner}</Badge>
        </div>
        <p className="preview-copy">{item.body}</p>
        <Field label="Demo status" htmlFor="content-preview-status" hint="Local state change only. No review is sent.">
          <select id="content-preview-status" className="select" value={item.status} onChange={(event) => onStatusChange(event.target.value as ContentItem['status'])}>
            {CONTENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <DataNote>Content is illustrative and not linked to a real CMS, brand team or legal review.</DataNote>
      </div>
    </Modal>
  )
}
