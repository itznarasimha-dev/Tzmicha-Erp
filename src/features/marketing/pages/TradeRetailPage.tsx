import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Download,
  Layers3,
  Megaphone,
  Plus,
  Printer,
  Store,
  Tag,
  TicketPercent,
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
import type {
  DealerScheme,
  Poster,
  Promotion,
  StoreActivity,
  StoreAgreement,
  TradeEvent,
} from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { SectionCard } from '../components/ui/SectionCard'
import { AvatarWithName } from '../components/ui/Avatar'
import { ProgressBar, utilisationTone } from '../components/ui/ProgressBar'
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
  TabIntro,
} from '../components/marketing/ModuleKit'
import { campaignName } from '../data/marketing'
import { downloadCsv } from '../utils/csv'
import { dateOnlyFromNow, daysUntil } from '../utils/dates'
import { formatDate, formatINR, formatINRCompact, formatNumber, formatPercent, uid } from '../utils/format'

const ACTIVITY_TYPES: StoreActivity['activityType'][] = [
  'Poster Display',
  'Product Demo',
  'In-store Promo',
  'Dealer Meet',
  'Shelf Audit',
]
const ACTIVITY_STATUSES: StoreActivity['status'][] = ['Planned', 'In Progress', 'Completed', 'Cancelled']
const POSTER_STATUSES: Poster['status'][] = ['Design', 'Printing', 'Ready', 'Distributed']
const PROMOTION_STATUSES: Promotion['status'][] = ['Draft', 'Scheduled', 'Active', 'Ended']
const SCHEME_STATUSES: DealerScheme['status'][] = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Expired']
const EVENT_STATUSES: TradeEvent['status'][] = ['Planning', 'Confirmed', 'Completed', 'Cancelled']

type ActivityFormValues = {
  store: string
  dealer: string
  activityType: StoreActivity['activityType']
  location: string
  date: string
  assignedTo: string
  campaignId: string
}

type PromotionFormValues = {
  name: string
  product: string
  offer: string
  stores: string
  startDate: string
  endDate: string
  campaignId: string
  status: Promotion['status']
}

export function TradeRetailPage({ tab }: { tab: string }) {
  const { data, update, addNotification } = useDemoData()
  const { pushToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const chartAnim = useChartAnimation()
  const [activityOpen, setActivityOpen] = useState(false)
  const [activityTypeFilter, setActivityTypeFilter] = useState('All')
  const [activityStatusFilter, setActivityStatusFilter] = useState('All')
  const [posterId, setPosterId] = useState<string | null>(null)
  const [promotionOpen, setPromotionOpen] = useState(false)
  const [promotionStatusFilter, setPromotionStatusFilter] = useState('All')
  const [schemeId, setSchemeId] = useState<string | null>(null)
  const [agreementId, setAgreementId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)

  useEffect(() => {
    if (tab === 'store-activities' && searchParams.get('action') === 'new') {
      setActivityOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, tab])

  const activePoster = data.posters.find((poster) => poster.id === posterId) ?? null
  const activeScheme = data.dealerSchemes.find((scheme) => scheme.id === schemeId) ?? null
  const activeAgreement = data.storeAgreements.find((agreement) => agreement.id === agreementId) ?? null
  const activeEvent = data.tradeEvents.find((event) => event.id === eventId) ?? null

  const filteredActivities = useMemo(
    () =>
      data.storeActivities.filter((activity) => {
        if (activityTypeFilter !== 'All' && activity.activityType !== activityTypeFilter) return false
        if (activityStatusFilter !== 'All' && activity.status !== activityStatusFilter) return false
        return true
      }),
    [data.storeActivities, activityTypeFilter, activityStatusFilter],
  )

  const filteredPromotions = data.promotions.filter(
    (promotion) => promotionStatusFilter === 'All' || promotion.status === promotionStatusFilter,
  )

  const tradeCampaigns = data.campaigns.filter(
    (campaign) => campaign.channel === 'Trade' || campaign.channel === 'Retail',
  )

  const totalPosterQuantity = data.posters.reduce((sum, poster) => sum + poster.quantity, 0)
  const totalDistributed = data.posters.reduce((sum, poster) => sum + poster.distributed, 0)
  const activePromotions = data.promotions.filter((promotion) => promotion.status === 'Active')
  const openActivities = data.storeActivities.filter(
    (activity) => activity.status === 'Planned' || activity.status === 'In Progress',
  )
  const expiringAgreements = data.storeAgreements.filter(
    (agreement) => agreement.status === 'Expiring Soon' || agreement.status === 'Expired',
  )
  const upcomingEvents = [...data.tradeEvents]
    .filter((event) => event.status === 'Planning' || event.status === 'Confirmed')
    .sort((a, b) => a.date.localeCompare(b.date))

  const activityTypeData = ACTIVITY_TYPES.map((type) => ({
    type,
    count: data.storeActivities.filter((activity) => activity.activityType === type).length,
  }))

  const posterStatusData = POSTER_STATUSES.map((status, index) => ({
    name: status,
    value: data.posters.filter((poster) => poster.status === status).length,
    color: chartColors[index % chartColors.length],
  })).filter((item) => item.value > 0)

  const promotionStatusData = PROMOTION_STATUSES.map((status, index) => ({
    name: status,
    value: data.promotions.filter((promotion) => promotion.status === status).length,
    color: chartColors[index % chartColors.length],
  })).filter((item) => item.value > 0)

  const setActivityStatus = (activity: StoreActivity, status: StoreActivity['status']) => {
    update('storeActivities', (current) =>
      current.map((item) => (item.id === activity.id ? { ...item, status } : item)),
    )
    pushToast({
      title: 'Store activity updated',
      description: `${activity.store} is now ${status} in local demo data. No store team is notified.`,
      tone: 'success',
    })
  }

  const createActivity = (values: ActivityFormValues) => {
    const activity: StoreActivity = {
      id: uid('SA'),
      store: values.store.trim(),
      dealer: values.dealer.trim(),
      activityType: values.activityType,
      location: values.location.trim(),
      date: values.date,
      assignedTo: values.assignedTo,
      status: 'Planned',
      campaignId: values.campaignId || null,
    }
    update('storeActivities', (current) => [activity, ...current])
    addNotification({
      title: 'Store activity planned in demo',
      body: `${activity.activityType} at ${activity.store} on ${formatDate(activity.date)}.`,
      kind: 'followup',
      href: '/marketing/trade/store-activities',
    })
    pushToast({
      title: 'Store activity planned locally',
      description: `${activity.store} was added to the demo trade calendar.`,
      tone: 'success',
    })
    setActivityOpen(false)
  }

  const updatePosterDistribution = (poster: Poster, distributed: number) => {
    const safeDistributed = Math.min(poster.quantity, Math.max(0, Math.round(distributed)))
    const status: Poster['status'] =
      safeDistributed >= poster.quantity ? 'Distributed' : safeDistributed > 0 ? 'Ready' : poster.status
    update('posters', (current) =>
      current.map((item) =>
        item.id === poster.id
          ? { ...item, distributed: safeDistributed, status, updatedAt: dateOnlyFromNow(0) }
          : item,
      ),
    )
    pushToast({
      title: 'Distribution updated',
      description: `${poster.name} now shows ${safeDistributed} of ${poster.quantity} units distributed locally.`,
      tone: 'success',
    })
  }

  const createPromotion = (values: PromotionFormValues) => {
    const promotion: Promotion = {
      id: uid('PR'),
      name: values.name.trim(),
      product: values.product.trim(),
      stores: Math.max(0, Math.round(Number(values.stores) || 0)),
      startDate: values.startDate,
      endDate: values.endDate,
      status: values.status,
      campaignId: values.campaignId || null,
      offer: values.offer.trim(),
    }
    update('promotions', (current) => [promotion, ...current])
    pushToast({
      title: 'Promotion draft created',
      description: `${promotion.name} is stored locally. No store offer or POS system was updated.`,
      tone: 'success',
    })
    setPromotionOpen(false)
  }

  const setPromotionStatus = (promotion: Promotion, status: Promotion['status']) => {
    update('promotions', (current) =>
      current.map((item) => (item.id === promotion.id ? { ...item, status } : item)),
    )
    pushToast({
      title: 'Promotion status updated',
      description: `${promotion.name} marked ${status}. This is a local demo label only.`,
      tone: 'success',
    })
  }

  const setSchemeStatus = (scheme: DealerScheme, status: DealerScheme['status']) => {
    update('dealerSchemes', (current) =>
      current.map((item) => (item.id === scheme.id ? { ...item, status } : item)),
    )
    pushToast({
      title: 'Dealer scheme updated',
      description: `${scheme.name} marked ${status}. No finance or dealer payout was triggered.`,
      tone: 'success',
    })
  }

  const renewAgreement = (agreement: StoreAgreement) => {
    const newEnd = dateOnlyFromNow(365)
    update('storeAgreements', (current) =>
      current.map((item) =>
        item.id === agreement.id
          ? {
              ...item,
              startDate: dateOnlyFromNow(0),
              endDate: newEnd,
              renewalReminder: dateOnlyFromNow(335),
              status: 'Active',
            }
          : item,
      ),
    )
    pushToast({
      title: 'Agreement renewed in demo',
      description: `${agreement.store} now renews through ${formatDate(newEnd)}. No document was signed.`,
      tone: 'success',
    })
  }

  const toggleChecklist = (event: TradeEvent, index: number) => {
    update('tradeEvents', (current) =>
      current.map((item) =>
        item.id === event.id
          ? {
              ...item,
              checklist: item.checklist.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, done: !entry.done } : entry,
              ),
            }
          : item,
      ),
    )
  }

  const exportActivities = (rows: StoreActivity[], label = 'store-activities') => {
    const result = downloadCsv(`trade-${label}-demo`, [
      { header: 'Activity ID', value: (row: StoreActivity) => row.id },
      { header: 'Store', value: (row: StoreActivity) => row.store },
      { header: 'Dealer', value: (row: StoreActivity) => row.dealer },
      { header: 'Activity', value: (row: StoreActivity) => row.activityType },
      { header: 'Location', value: (row: StoreActivity) => row.location },
      { header: 'Date', value: (row: StoreActivity) => row.date },
      { header: 'Assigned to', value: (row: StoreActivity) => row.assignedTo },
      { header: 'Status', value: (row: StoreActivity) => row.status },
      { header: 'Campaign', value: (row: StoreActivity) => campaignName(data.campaigns, row.campaignId) },
    ], rows)
    pushToast({
      title: result.ok ? 'Store activities exported' : 'Export failed',
      description: result.message,
      tone: result.ok ? 'success' : 'error',
    })
  }

  const exportPosters = () => {
    const result = downloadCsv('trade-posters-banners-demo', [
      { header: 'ID', value: (row: Poster) => row.id },
      { header: 'Name', value: (row: Poster) => row.name },
      { header: 'Campaign', value: (row: Poster) => campaignName(data.campaigns, row.campaignId) },
      { header: 'Size', value: (row: Poster) => row.size },
      { header: 'Quantity', value: (row: Poster) => row.quantity },
      { header: 'Distributed', value: (row: Poster) => row.distributed },
      { header: 'Status', value: (row: Poster) => row.status },
      { header: 'Updated', value: (row: Poster) => row.updatedAt },
    ], data.posters)
    pushToast({ title: result.ok ? 'Poster stock exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportPromotions = () => {
    const result = downloadCsv('trade-retail-promotions-demo', [
      { header: 'ID', value: (row: Promotion) => row.id },
      { header: 'Name', value: (row: Promotion) => row.name },
      { header: 'Product', value: (row: Promotion) => row.product },
      { header: 'Offer', value: (row: Promotion) => row.offer },
      { header: 'Stores', value: (row: Promotion) => row.stores },
      { header: 'Start', value: (row: Promotion) => row.startDate },
      { header: 'End', value: (row: Promotion) => row.endDate },
      { header: 'Status', value: (row: Promotion) => row.status },
    ], filteredPromotions)
    pushToast({ title: result.ok ? 'Promotions exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportAgreements = () => {
    const result = downloadCsv('trade-store-agreements-demo', [
      { header: 'ID', value: (row: StoreAgreement) => row.id },
      { header: 'Store', value: (row: StoreAgreement) => row.store },
      { header: 'Type', value: (row: StoreAgreement) => row.type },
      { header: 'Start', value: (row: StoreAgreement) => row.startDate },
      { header: 'End', value: (row: StoreAgreement) => row.endDate },
      { header: 'Renewal reminder', value: (row: StoreAgreement) => row.renewalReminder },
      { header: 'Value', value: (row: StoreAgreement) => row.value },
      { header: 'Status', value: (row: StoreAgreement) => row.status },
      { header: 'Document', value: (row: StoreAgreement) => row.documentName },
    ], data.storeAgreements)
    pushToast({ title: result.ok ? 'Agreements exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const exportEvents = () => {
    const result = downloadCsv('trade-events-demo', [
      { header: 'ID', value: (row: TradeEvent) => row.id },
      { header: 'Name', value: (row: TradeEvent) => row.name },
      { header: 'Venue', value: (row: TradeEvent) => row.venue },
      { header: 'City', value: (row: TradeEvent) => row.city },
      { header: 'Date', value: (row: TradeEvent) => row.date },
      { header: 'Budget', value: (row: TradeEvent) => row.budget },
      { header: 'Status', value: (row: TradeEvent) => row.status },
      { header: 'Checklist done', value: (row: TradeEvent) => row.checklist.filter((item) => item.done).length },
      { header: 'Checklist total', value: (row: TradeEvent) => row.checklist.length },
      { header: 'Results', value: (row: TradeEvent) => row.results },
    ], data.tradeEvents)
    pushToast({ title: result.ok ? 'Trade events exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const activityColumns: DataTableColumn<StoreActivity>[] = [
    {
      id: 'store',
      header: 'Store / dealer',
      mobileLabel: 'Store',
      sortValue: (activity) => activity.store,
      render: (activity) => (
        <div>
          <p className="cell-primary">{activity.store}</p>
          <p className="text-xs muted">{activity.dealer}</p>
        </div>
      ),
    },
    {
      id: 'activity',
      header: 'Activity',
      mobileLabel: 'Activity',
      sortValue: (activity) => activity.activityType,
      render: (activity) => <Badge tone="neutral">{activity.activityType}</Badge>,
    },
    {
      id: 'location',
      header: 'Location',
      mobileLabel: 'Location',
      hideMobile: true,
      sortValue: (activity) => activity.location,
      render: (activity) => <span className="text-xs">{activity.location}</span>,
    },
    {
      id: 'date',
      header: 'Date',
      mobileLabel: 'Date',
      sortValue: (activity) => activity.date,
      render: (activity) => formatDate(activity.date),
    },
    {
      id: 'owner',
      header: 'Owner',
      mobileLabel: 'Owner',
      sortValue: (activity) => activity.assignedTo,
      render: (activity) => <AvatarWithName name={activity.assignedTo} sub="Trade owner" size="sm" />,
    },
    {
      id: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      sortValue: (activity) => activity.status,
      render: (activity) => (
        <select
          className="select"
          style={{ minHeight: 30, padding: '4px 26px 4px 8px', width: 118, fontSize: '0.7rem' }}
          value={activity.status}
          aria-label={`Status for ${activity.store}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setActivityStatus(activity, event.target.value as StoreActivity['status'])}
        >
          {ACTIVITY_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      ),
    },
  ]

  const posterModal = activePoster ? (
    <PosterModal
      poster={activePoster}
      campaignLabel={campaignName(data.campaigns, activePoster.campaignId)}
      onClose={() => setPosterId(null)}
      onSave={(distributed) => updatePosterDistribution(activePoster, distributed)}
    />
  ) : null

  const schemeModal = activeScheme ? (
    <SchemeModal
      scheme={activeScheme}
      onClose={() => setSchemeId(null)}
      onStatus={(status) => setSchemeStatus(activeScheme, status)}
    />
  ) : null

  const agreementModal = activeAgreement ? (
    <AgreementModal
      agreement={activeAgreement}
      onClose={() => setAgreementId(null)}
      onRenew={() => renewAgreement(activeAgreement)}
    />
  ) : null

  const eventModal = activeEvent ? (
    <TradeEventModal
      event={activeEvent}
      campaigns={data.campaigns}
      onClose={() => setEventId(null)}
      onToggle={(index) => toggleChecklist(activeEvent, index)}
    />
  ) : null

  if (tab === 'overview') {
    return (
      <div className="stack-20">
        <TabIntro
          title="Trade & retail overview"
          description="Coordinate store activations, collateral, promotions and dealer programmes. Every figure here is a local demo value."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportActivities(data.storeActivities, 'overview')}>Export activities</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setActivityOpen(true)}>Plan store activity</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Open store activities" value={openActivities.length} sub={`${data.storeActivities.length} total demo activities`} icon={<Store size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Posters distributed" value={`${formatNumber(totalDistributed)} / ${formatNumber(totalPosterQuantity)}`} sub={`${formatPercent(totalPosterQuantity ? (totalDistributed / totalPosterQuantity) * 100 : null, 0)} of printed units`} icon={<Printer size={15} />} tone="var(--chart-2)" progress={totalPosterQuantity ? (totalDistributed / totalPosterQuantity) * 100 : 0} />
          <MetricCard label="Active promotions" value={activePromotions.length} sub={`${activePromotions.reduce((sum, promotion) => sum + promotion.stores, 0)} participating store records`} icon={<TicketPercent size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Agreements at risk" value={expiringAgreements.length} sub="Expiring or already expired" icon={<BadgeCheck size={15} />} tone="var(--chart-5)" />
        </MetricGrid>

        <div className="dashboard-grid dashboard-grid--equal">
          <ChartCard
            title="Store activity mix"
            subtitle="Demo activities by activation type"
            height="md"
            isEmpty={activityTypeData.length === 0}
          >
            <BarChart data={activityTypeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="type" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 9 }} />
              <YAxis {...axisProps} width={32} allowDecimals={false} />
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} activities`} />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="count" name="Activities" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={chartAnim} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Poster stock status" subtitle="Print production and distribution pipeline" height="md" isEmpty={posterStatusData.length === 0}>
            <PieChart>
              <Pie data={posterStatusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={3} stroke="none" isAnimationActive={chartAnim}>
                {posterStatusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} items`} />} />
            </PieChart>
          </ChartCard>
        </div>

        <div className="dashboard-grid dashboard-grid--equal">
          <SectionCard title="Upcoming trade events" subtitle="Planning and confirmed demo events." actions={<Button variant="ghost" size="xs" onClick={exportEvents}>Export</Button>}>
            <div className="stack-10">
              {upcomingEvents.length === 0 ? <p className="empty-inline">No upcoming trade events.</p> : upcomingEvents.map((event) => (
                <button key={event.id} type="button" className="campaign-mini" onClick={() => setEventId(event.id)}>
                  <span className="campaign-mini__date">
                    <span className="campaign-mini__day">{formatDate(event.date).split(' ')[0]}</span>
                    <span>{formatDate(event.date).split(' ')[1]}</span>
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="campaign-mini__name truncate">{event.name}</span>
                    <span className="campaign-mini__meta">{event.city} · {formatINRCompact(event.budget)} budget · {event.checklist.filter((item) => item.done).length}/{event.checklist.length} ready</span>
                  </span>
                  <StatusBadge status={event.status} />
                </button>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Agreements needing attention" subtitle="Renewal reminders from local demo records." actions={<Button variant="ghost" size="xs" onClick={exportAgreements}>Export</Button>}>
            <div className="stack-12">
              {expiringAgreements.length === 0 ? <p className="empty-inline">No agreements need attention.</p> : expiringAgreements.map((agreement) => {
                const days = daysUntil(agreement.endDate)
                return (
                  <button key={agreement.id} type="button" className="campaign-mini" onClick={() => setAgreementId(agreement.id)}>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="campaign-mini__name truncate">{agreement.store}</span>
                      <span className="campaign-mini__meta">{agreement.type} · {days !== null && days < 0 ? `${Math.abs(days)}d expired` : `${days ?? 0}d remaining`} · {formatINRCompact(agreement.value)}</span>
                    </span>
                    <StatusBadge status={agreement.status} />
                  </button>
                )
              })}
            </div>
          </SectionCard>
        </div>

        <div className="dashboard-grid dashboard-grid--equal">
          <SectionCard title="Trade campaign budgets" subtitle="Retail and trade channel campaigns in the demo workbook.">
            <div className="stack-12">
              {tradeCampaigns.map((campaign) => {
                const utilisation = (campaign.spend / Math.max(1, campaign.budget)) * 100
                return (
                  <div key={campaign.id}>
                    <div className="between" style={{ marginBottom: 4 }}>
                      <span className="text-xs truncate" style={{ maxWidth: '68%' }}>{campaign.name}</span>
                      <span className="text-xs muted">{formatINRCompact(campaign.spend)} / {formatINRCompact(campaign.budget)}</span>
                    </div>
                    <ProgressBar value={utilisation} size="sm" tone={utilisationTone(utilisation)} />
                  </div>
                )
              })}
              {tradeCampaigns.length === 0 ? <p className="empty-inline">No trade campaigns.</p> : null}
            </div>
          </SectionCard>
          <SectionCard title="Promotion status" subtitle="Offer lifecycle across demo retail promotions.">
            <div className="stack-12">
              {promotionStatusData.map((entry) => {
                const total = data.promotions.length || 1
                return (
                  <div key={entry.name}>
                    <div className="between" style={{ marginBottom: 4 }}>
                      <span className="text-xs">{entry.name}</span>
                      <span className="text-xs muted">{entry.value} / {data.promotions.length}</span>
                    </div>
                    <ProgressBar value={(entry.value / total) * 100} size="sm" tone={entry.name === 'Active' ? 'success' : entry.name === 'Draft' ? 'brand' : 'warning'} />
                  </div>
                )
              })}
            </div>
            <DataNote>No point-of-sale, dealer portal or print vendor integration is connected.</DataNote>
          </SectionCard>
        </div>

        <DemoNote>
          Trade activity, print stock, retail offers, dealer schemes and agreements are illustrative demo records. Updating them never changes a real store, dealer account or procurement system.
        </DemoNote>
        {activityOpen ? <ActivityModal open onClose={() => setActivityOpen(false)} onSave={createActivity} campaigns={data.campaigns} /> : null}
        {posterModal}
        {schemeModal}
        {agreementModal}
        {eventModal}
      </div>
    )
  }

  if (tab === 'store-activities') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Store activities"
          description="Plan poster drops, demos, shelf audits and dealer meets. All schedules and owners live only in this browser demo."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => exportActivities(filteredActivities)}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setActivityOpen(true)}>Plan activity</Button>
            </>
          }
        />
        <div className="grid-4">
          <div className="soft-tile"><p className="soft-tile__label">Visible</p><p className="soft-tile__value">{filteredActivities.length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Planned</p><p className="soft-tile__value">{filteredActivities.filter((activity) => activity.status === 'Planned').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">In progress</p><p className="soft-tile__value">{filteredActivities.filter((activity) => activity.status === 'In Progress').length}</p></div>
          <div className="soft-tile"><p className="soft-tile__label">Completed</p><p className="soft-tile__value">{filteredActivities.filter((activity) => activity.status === 'Completed').length}</p></div>
        </div>
        <DataTable
          data={filteredActivities}
          columns={activityColumns}
          rowKey={(activity) => activity.id}
          searchable={(activity) => `${activity.store} ${activity.dealer} ${activity.location} ${activity.assignedTo} ${activity.activityType}`}
          searchPlaceholder="Search stores, dealers, locations…"
          pageSize={8}
          initialSort={{ columnId: 'date', direction: 'desc' }}
          caption="Store activities"
          filters={
            <>
              <select className="select" value={activityTypeFilter} onChange={(event) => setActivityTypeFilter(event.target.value)} aria-label="Filter by activity type">
                <option value="All">All activity types</option>
                {ACTIVITY_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
              <select className="select" value={activityStatusFilter} onChange={(event) => setActivityStatusFilter(event.target.value)} aria-label="Filter by activity status">
                <option value="All">All statuses</option>
                {ACTIVITY_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </>
          }
          mobileActions={(activity) => (
            <select
              className="select"
              value={activity.status}
              aria-label={`Status for ${activity.store}`}
              onChange={(event) => setActivityStatus(activity, event.target.value as StoreActivity['status'])}
            >
              {ACTIVITY_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          )}
        />
        <DataNote>Status changes are demo-only. No store manager, field app or task system is updated.</DataNote>
        {activityOpen ? <ActivityModal open onClose={() => setActivityOpen(false)} onSave={createActivity} campaigns={data.campaigns} /> : null}
      </div>
    )
  }

  if (tab === 'posters-banners') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Posters & banners"
          description="Track design, print and distribution of in-store collateral. Quantities are sample values, not live inventory."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={exportPosters}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Collateral items" value={data.posters.length} sub={`${data.posters.filter((poster) => poster.status === 'Distributed').length} fully distributed`} icon={<Layers3 size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Printed units" value={formatNumber(totalPosterQuantity)} sub="Across demo print jobs" icon={<Printer size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Distributed units" value={formatNumber(totalDistributed)} sub={`${formatPercent(totalPosterQuantity ? (totalDistributed / totalPosterQuantity) * 100 : null, 0)} of printed stock`} icon={<Store size={15} />} tone="var(--chart-3)" />
          <MetricCard label="In design / print" value={data.posters.filter((poster) => poster.status === 'Design' || poster.status === 'Printing').length} sub="Not yet ready for stores" icon={<Tag size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <EntityGrid columns={3}>
          {data.posters.map((poster) => {
            const progress = (poster.distributed / Math.max(1, poster.quantity)) * 100
            return (
              <article className="card card--pad" key={poster.id}>
                <div className="between" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs faint">{poster.id} · {poster.size}</p>
                    <h3 style={{ marginTop: 3, fontSize: '0.92rem' }}>{poster.name}</h3>
                    <p className="text-xs muted">{campaignName(data.campaigns, poster.campaignId)}</p>
                  </div>
                  <StatusBadge status={poster.status} />
                </div>
                <div className="mini-stats mt-12">
                  <div className="mini-stat"><p className="mini-stat__label">Printed</p><p className="mini-stat__value">{formatNumber(poster.quantity)}</p></div>
                  <div className="mini-stat"><p className="mini-stat__label">Distributed</p><p className="mini-stat__value">{formatNumber(poster.distributed)}</p></div>
                  <div className="mini-stat"><p className="mini-stat__label">Remaining</p><p className="mini-stat__value">{formatNumber(Math.max(0, poster.quantity - poster.distributed))}</p></div>
                </div>
                <ProgressBar value={progress} size="sm" tone={utilisationTone(progress)} className="mt-12" />
                <div className="between mt-10">
                  <span className="text-xs muted">Updated {formatDate(poster.updatedAt)}</span>
                  <Button variant="ghost" size="xs" onClick={() => setPosterId(poster.id)}>Update stock</Button>
                </div>
              </article>
            )
          })}
        </EntityGrid>
        <DataNote>No print procurement, warehouse stock or courier tracking service is connected.</DataNote>
        {posterModal}
      </div>
    )
  }

  if (tab === 'retail-promotions') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Retail promotions"
          description="Draft and review store offers. Activating a promotion here does not publish an offer or change any point-of-sale system."
          actions={
            <>
              <Button variant="ghost" icon={<Download size={14} />} onClick={exportPromotions}>Export CSV</Button>
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setPromotionOpen(true)}>Create promotion</Button>
            </>
          }
        />
        <MetricGrid>
          <MetricCard label="Promotions" value={data.promotions.length} sub={`${activePromotions.length} active in demo`} icon={<TicketPercent size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Participating stores" value={activePromotions.reduce((sum, promotion) => sum + promotion.stores, 0)} sub="Store records on active offers" icon={<Store size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Scheduled" value={data.promotions.filter((promotion) => promotion.status === 'Scheduled').length} sub="Start dates in the future" icon={<CalendarClock size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Ended" value={data.promotions.filter((promotion) => promotion.status === 'Ended').length} sub="Closed demo offers" icon={<Check size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <DataTable
          data={filteredPromotions}
          rowKey={(promotion) => promotion.id}
          searchable={(promotion) => `${promotion.name} ${promotion.product} ${promotion.offer} ${promotion.status}`}
          searchPlaceholder="Search promotions, products, offers…"
          pageSize={7}
          caption="Retail promotions"
          initialSort={{ columnId: 'start', direction: 'desc' }}
          filters={
            <select className="select" value={promotionStatusFilter} onChange={(event) => setPromotionStatusFilter(event.target.value)} aria-label="Filter by promotion status">
              <option value="All">All statuses</option>
              {PROMOTION_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          }
          columns={[
            {
              id: 'name',
              header: 'Promotion',
              mobileLabel: 'Promotion',
              sortValue: (promotion) => promotion.name,
              render: (promotion) => (
                <div>
                  <p className="cell-primary">{promotion.name}</p>
                  <p className="text-xs muted">{promotion.product} · {campaignName(data.campaigns, promotion.campaignId)}</p>
                </div>
              ),
            },
            {
              id: 'offer',
              header: 'Offer',
              mobileLabel: 'Offer',
              hideMobile: true,
              render: (promotion) => <span className="text-xs" style={{ display: 'block', maxWidth: 240, lineHeight: 1.5 }}>{promotion.offer}</span>,
            },
            { id: 'stores', header: 'Stores', align: 'right', mobileLabel: 'Stores', sortValue: (promotion) => promotion.stores, render: (promotion) => <span className="cell-strong">{formatNumber(promotion.stores)}</span> },
            {
              id: 'window',
              header: 'Window',
              mobileLabel: 'Window',
              sortValue: (promotion) => promotion.startDate,
              render: (promotion) => <span className="text-xs">{formatDate(promotion.startDate)} → {formatDate(promotion.endDate)}</span>,
            },
            {
              id: 'status',
              header: 'Status',
              mobileLabel: 'Status',
              sortValue: (promotion) => promotion.status,
              render: (promotion) => (
                <select
                  className="select"
                  style={{ minHeight: 30, padding: '4px 26px 4px 8px', width: 112, fontSize: '0.7rem' }}
                  value={promotion.status}
                  aria-label={`Status for ${promotion.name}`}
                  onChange={(event) => setPromotionStatus(promotion, event.target.value as Promotion['status'])}
                >
                  {PROMOTION_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              ),
            },
          ]}
          mobileActions={(promotion) => (
            <select
              className="select"
              value={promotion.status}
              aria-label={`Status for ${promotion.name}`}
              onChange={(event) => setPromotionStatus(promotion, event.target.value as Promotion['status'])}
            >
              {PROMOTION_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          )}
        />
        <DemoNote>Promotion status is a local demo label. No POS, e-commerce or store operations system is connected, and no offer is actually live.</DemoNote>
        {promotionOpen ? <PromotionModal open onClose={() => setPromotionOpen(false)} onSave={createPromotion} campaigns={data.campaigns} /> : null}
      </div>
    )
  }

  if (tab === 'dealer-schemes') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Dealer schemes"
          description="Track dealer incentive terms and approval states. Approving a scheme in this demo does not create a payout or finance liability."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={() => {
            const result = downloadCsv('trade-dealer-schemes-demo', [
              { header: 'ID', value: (row: DealerScheme) => row.id },
              { header: 'Name', value: (row: DealerScheme) => row.name },
              { header: 'Eligible dealers', value: (row: DealerScheme) => row.eligibleDealers },
              { header: 'Valid from', value: (row: DealerScheme) => row.validFrom },
              { header: 'Valid to', value: (row: DealerScheme) => row.validTo },
              { header: 'Status', value: (row: DealerScheme) => row.status },
              { header: 'Terms', value: (row: DealerScheme) => row.terms },
            ], data.dealerSchemes)
            pushToast({ title: result.ok ? 'Dealer schemes exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
          }}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Schemes" value={data.dealerSchemes.length} sub={`${data.dealerSchemes.filter((scheme) => scheme.status === 'Approved').length} approved`} icon={<Tag size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Eligible dealers" value={data.dealerSchemes.reduce((sum, scheme) => sum + scheme.eligibleDealers, 0)} sub="Across all demo schemes" icon={<Users size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Awaiting approval" value={data.dealerSchemes.filter((scheme) => scheme.status === 'Pending Approval').length} sub="Local review queue" icon={<BadgeCheck size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Expired" value={data.dealerSchemes.filter((scheme) => scheme.status === 'Expired').length} sub="Closed or lapsed records" icon={<CalendarClock size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <div className="stack-12">
          {data.dealerSchemes.map((scheme) => (
            <article className="card card--pad" key={scheme.id}>
              <div className="between" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p className="text-xs faint">{scheme.id} · {formatDate(scheme.validFrom)} → {formatDate(scheme.validTo)}</p>
                  <h3 style={{ marginTop: 3, fontSize: '0.95rem' }}>{scheme.name}</h3>
                  <p className="text-xs muted">{formatNumber(scheme.eligibleDealers)} eligible dealer records</p>
                </div>
                <StatusBadge status={scheme.status} />
              </div>
              <p className="text-sm muted mt-10" style={{ lineHeight: 1.55 }}>{scheme.terms}</p>
              <div className="between mt-12" style={{ gap: 10, flexWrap: 'wrap' }}>
                <span className="text-xs faint">Sample scheme terms. Not a finance or dealer-portal record.</span>
                <div className="row-8">
                  <Button variant="ghost" size="xs" onClick={() => setSchemeId(scheme.id)}>Open scheme</Button>
                  {scheme.status === 'Pending Approval' ? (
                    <>
                      <Button variant="success" size="xs" onClick={() => setSchemeStatus(scheme, 'Approved')}>Approve demo</Button>
                      <Button variant="ghost" size="xs" onClick={() => setSchemeStatus(scheme, 'Rejected')}>Reject</Button>
                    </>
                  ) : null}
                  {scheme.status === 'Draft' ? <Button variant="ghost" size="xs" onClick={() => setSchemeStatus(scheme, 'Pending Approval')}>Submit for review</Button> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
        <DemoNote>Scheme approval only changes local demo status. No dealer payout, rebate liability or finance workflow is created.</DemoNote>
        {schemeModal}
      </div>
    )
  }

  if (tab === 'store-agreements') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Store agreements"
          description="Visibility, display-space and promotion agreements with renewal reminders. Documents are named demo files only — no PDF is stored or signed."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={exportAgreements}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Agreements" value={data.storeAgreements.length} sub={`${data.storeAgreements.filter((agreement) => agreement.status === 'Active').length} active`} icon={<BadgeCheck size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Contract value" value={formatINRCompact(data.storeAgreements.reduce((sum, agreement) => sum + agreement.value, 0))} sub="Total sample agreement value" icon={<Store size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Expiring soon" value={data.storeAgreements.filter((agreement) => agreement.status === 'Expiring Soon').length} sub="Renewal window in demo data" icon={<CalendarClock size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Expired" value={data.storeAgreements.filter((agreement) => agreement.status === 'Expired').length} sub="No longer active" icon={<Check size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <DataTable
          data={data.storeAgreements}
          rowKey={(agreement) => agreement.id}
          searchable={(agreement) => `${agreement.store} ${agreement.type} ${agreement.documentName} ${agreement.status}`}
          searchPlaceholder="Search stores, agreement types…"
          pageSize={7}
          initialSort={{ columnId: 'end', direction: 'asc' }}
          caption="Store agreements"
          columns={[
            { id: 'store', header: 'Store', mobileLabel: 'Store', sortValue: (agreement) => agreement.store, render: (agreement) => <div><p className="cell-primary">{agreement.store}</p><p className="text-xs muted">{agreement.type}</p></div> },
            { id: 'document', header: 'Document', mobileLabel: 'Document', hideMobile: true, render: (agreement) => <span className="text-xs">{agreement.documentName}</span> },
            { id: 'end', header: 'End date', mobileLabel: 'End date', sortValue: (agreement) => agreement.endDate, render: (agreement) => formatDate(agreement.endDate) },
            { id: 'value', header: 'Value', align: 'right', mobileLabel: 'Value', sortValue: (agreement) => agreement.value, render: (agreement) => <span className="cell-strong">{formatINR(agreement.value)}</span> },
            { id: 'status', header: 'Status', mobileLabel: 'Status', sortValue: (agreement) => agreement.status, render: (agreement) => <StatusBadge status={agreement.status} /> },
            { id: 'actions', header: '', align: 'right', mobileLabel: 'Actions', render: (agreement) => <Button variant="ghost" size="xs" onClick={() => setAgreementId(agreement.id)}>Open</Button> },
          ]}
        />
        <DataNote>Agreement values and document names are fictional. No e-signature, storage or legal repository is connected.</DataNote>
        {agreementModal}
      </div>
    )
  }

  if (tab === 'trade-events') {
    return (
      <div className="stack-16">
        <TabIntro
          title="Trade events"
          description="Plan channel partner summits, dealer meets and retail activations. Checklists are local planning aids; no venue or vendor booking is made."
          actions={<Button variant="ghost" icon={<Download size={14} />} onClick={exportEvents}>Export CSV</Button>}
        />
        <MetricGrid>
          <MetricCard label="Trade events" value={data.tradeEvents.length} sub={`${data.tradeEvents.filter((event) => event.status === 'Completed').length} completed`} icon={<CalendarClock size={15} />} tone="var(--chart-1)" />
          <MetricCard label="Committed budget" value={formatINRCompact(data.tradeEvents.reduce((sum, event) => sum + event.budget, 0))} sub="Sample event budgets" icon={<Megaphone size={15} />} tone="var(--chart-2)" />
          <MetricCard label="Upcoming" value={upcomingEvents.length} sub="Planning or confirmed" icon={<Store size={15} />} tone="var(--chart-3)" />
          <MetricCard label="Checklist readiness" value={formatPercent(data.tradeEvents.length ? (data.tradeEvents.reduce((sum, event) => sum + event.checklist.filter((item) => item.done).length, 0) / Math.max(1, data.tradeEvents.reduce((sum, event) => sum + event.checklist.length, 0))) * 100 : null, 0)} sub="Completed planning items" icon={<Check size={15} />} tone="var(--chart-5)" />
        </MetricGrid>
        <div className="stack-12">
          {data.tradeEvents.map((event) => {
            const done = event.checklist.filter((item) => item.done).length
            const progress = (done / Math.max(1, event.checklist.length)) * 100
            return (
              <article className="card card--pad" key={event.id}>
                <div className="between" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-xs faint">{event.id} · {formatDate(event.date)} · {event.city}</p>
                    <h3 style={{ marginTop: 3, fontSize: '0.95rem' }}>{event.name}</h3>
                    <p className="text-xs muted">{event.venue} · {formatINRCompact(event.budget)} budget</p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <div className="between mt-12" style={{ gap: 14 }}>
                  <div className="grow">
                    <div className="between" style={{ marginBottom: 4 }}>
                      <span className="text-xs muted">Planning checklist</span>
                      <span className="text-xs muted">{done} / {event.checklist.length} done</span>
                    </div>
                    <ProgressBar value={progress} size="sm" tone={utilisationTone(progress)} />
                  </div>
                  <div className="row-8 wrap">
                    {event.team.slice(0, 3).map((member) => <Badge key={member} tone="neutral">{member.split(' ')[0]}</Badge>)}
                  </div>
                  <Button variant="ghost" size="xs" onClick={() => setEventId(event.id)}>Open event</Button>
                </div>
                <p className="text-xs muted mt-10" style={{ lineHeight: 1.55 }}>{event.results}</p>
              </article>
            )
          })}
        </div>
        <DataNote>Event results are sample narrative strings. No registration, ticketing, venue or lead-capture service is connected.</DataNote>
        {eventModal}
      </div>
    )
  }

  return null
}

function ActivityModal({
  open,
  onClose,
  onSave,
  campaigns,
}: {
  open: boolean
  onClose: () => void
  onSave: (values: ActivityFormValues) => void
  campaigns: { id: string; name: string }[]
}) {
  const [values, setValues] = useState<ActivityFormValues>({
    store: '',
    dealer: '',
    activityType: 'Product Demo',
    location: '',
    date: dateOnlyFromNow(2),
    assignedTo: 'Vikram Shetty',
    campaignId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof ActivityFormValues>(key: K, value: ActivityFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }
  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.store.trim()) next.store = 'Store name is required.'
    if (!values.location.trim()) next.location = 'Add the store location.'
    if (!values.date) next.date = 'Choose an activity date.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Plan a store activity"
      description="Creates a local demo activity. No store team, vendor or calendar is notified."
      size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add activity</Button></>}
    >
      <div className="form-grid">
        <Field label="Store" htmlFor="trade-store" required error={errors.store}>
          <input id="trade-store" className="input" value={values.store} onChange={(event) => set('store', event.target.value)} aria-invalid={Boolean(errors.store)} />
        </Field>
        <Field label="Dealer contact" htmlFor="trade-dealer">
          <input id="trade-dealer" className="input" value={values.dealer} onChange={(event) => set('dealer', event.target.value)} />
        </Field>
        <Field label="Activity type" htmlFor="trade-activity-type">
          <select id="trade-activity-type" className="select" value={values.activityType} onChange={(event) => set('activityType', event.target.value as StoreActivity['activityType'])}>
            {ACTIVITY_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Owner" htmlFor="trade-owner">
          <select id="trade-owner" className="select" value={values.assignedTo} onChange={(event) => set('assignedTo', event.target.value)}>
            {['Vikram Shetty', 'Rohan Mehta', 'Meera Iyer', 'Arjun Das', 'Ananya Rao'].map((name) => <option key={name}>{name}</option>)}
          </select>
        </Field>
        <Field label="Location" htmlFor="trade-location" required error={errors.location} className="form-grid__full">
          <input id="trade-location" className="input" value={values.location} onChange={(event) => set('location', event.target.value)} placeholder="Area, city" aria-invalid={Boolean(errors.location)} />
        </Field>
        <Field label="Date" htmlFor="trade-date" required error={errors.date}>
          <input id="trade-date" className="input" type="date" value={values.date} onChange={(event) => set('date', event.target.value)} aria-invalid={Boolean(errors.date)} />
        </Field>
        <Field label="Campaign" htmlFor="trade-campaign">
          <select id="trade-campaign" className="select" value={values.campaignId} onChange={(event) => set('campaignId', event.target.value)}>
            <option value="">No campaign link</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}

function PosterModal({ poster, campaignLabel, onClose, onSave }: { poster: Poster; campaignLabel: string; onClose: () => void; onSave: (distributed: number) => void }) {
  const [distributed, setDistributed] = useState(String(poster.distributed))
  return (
    <Modal
      open
      onClose={onClose}
      title={poster.name}
      description={`${poster.size} · ${poster.id}`}
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" onClick={() => onSave(Number(distributed) || 0)}>Save distribution</Button></>}
    >
      <div className="stack-16">
        <DetailRows
          items={[
            { label: 'Campaign', value: campaignLabel },
            { label: 'Print status', value: <StatusBadge status={poster.status} /> },
            { label: 'Printed quantity', value: formatNumber(poster.quantity) },
            { label: 'Last updated', value: formatDate(poster.updatedAt) },
          ]}
        />
        <Field label="Units distributed" htmlFor="poster-distributed" hint="Capped at the printed quantity. Local demo stock value only.">
          <input id="poster-distributed" className="input" type="number" min={0} max={poster.quantity} value={distributed} onChange={(event) => setDistributed(event.target.value)} />
        </Field>
        <ProgressBar value={poster.quantity ? (Number(distributed) / poster.quantity) * 100 : 0} label="Distribution progress" showValue tone={utilisationTone(poster.quantity ? (Number(distributed) / poster.quantity) * 100 : 0)} />
        <DataNote>No print vendor, warehouse or courier integration is connected. This is a stock note in your browser only.</DataNote>
      </div>
    </Modal>
  )
}

function PromotionModal({
  open,
  onClose,
  onSave,
  campaigns,
}: {
  open: boolean
  onClose: () => void
  onSave: (values: PromotionFormValues) => void
  campaigns: { id: string; name: string }[]
}) {
  const [values, setValues] = useState<PromotionFormValues>({
    name: '',
    product: '',
    offer: '',
    stores: '12',
    startDate: dateOnlyFromNow(1),
    endDate: dateOnlyFromNow(30),
    campaignId: '',
    status: 'Draft',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof PromotionFormValues>(key: K, value: PromotionFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }
  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.name.trim()) next.name = 'Promotion name is required.'
    if (!values.product.trim()) next.product = 'Product is required.'
    if (!values.offer.trim()) next.offer = 'Describe the offer.'
    if (values.endDate < values.startDate) next.endDate = 'End date must be after the start date.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a retail promotion"
      description="Creates a local draft. No offer goes live and no POS is updated."
      size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save draft</Button></>}
    >
      <div className="form-grid">
        <Field label="Promotion name" htmlFor="promo-name" required error={errors.name} className="form-grid__full">
          <input id="promo-name" className="input" value={values.name} onChange={(event) => set('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Product" htmlFor="promo-product" required error={errors.product}>
          <input id="promo-product" className="input" value={values.product} onChange={(event) => set('product', event.target.value)} aria-invalid={Boolean(errors.product)} />
        </Field>
        <Field label="Participating stores" htmlFor="promo-stores">
          <input id="promo-stores" className="input" type="number" min={0} value={values.stores} onChange={(event) => set('stores', event.target.value)} />
        </Field>
        <Field label="Start date" htmlFor="promo-start">
          <input id="promo-start" className="input" type="date" value={values.startDate} onChange={(event) => set('startDate', event.target.value)} />
        </Field>
        <Field label="End date" htmlFor="promo-end" error={errors.endDate}>
          <input id="promo-end" className="input" type="date" value={values.endDate} onChange={(event) => set('endDate', event.target.value)} aria-invalid={Boolean(errors.endDate)} />
        </Field>
        <Field label="Campaign" htmlFor="promo-campaign">
          <select id="promo-campaign" className="select" value={values.campaignId} onChange={(event) => set('campaignId', event.target.value)}>
            <option value="">No campaign link</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </Field>
        <Field label="Status" htmlFor="promo-status">
          <select id="promo-status" className="select" value={values.status} onChange={(event) => set('status', event.target.value as Promotion['status'])}>
            {PROMOTION_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Offer" htmlFor="promo-offer" required error={errors.offer} className="form-grid__full">
          <textarea id="promo-offer" className="textarea" rows={3} value={values.offer} onChange={(event) => set('offer', event.target.value)} aria-invalid={Boolean(errors.offer)} />
        </Field>
      </div>
    </Modal>
  )
}

function SchemeModal({ scheme, onClose, onStatus }: { scheme: DealerScheme; onClose: () => void; onStatus: (status: DealerScheme['status']) => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={scheme.name}
      description={`${scheme.id} · ${formatNumber(scheme.eligibleDealers)} eligible dealers`}
      size="wide"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="stack-16">
        <div className="row-8 wrap">
          <StatusBadge status={scheme.status} />
          <Badge tone="neutral">Valid {formatDate(scheme.validFrom)} → {formatDate(scheme.validTo)}</Badge>
        </div>
        <p className="text-sm" style={{ lineHeight: 1.65 }}>{scheme.terms}</p>
        <DetailRows
          items={[
            { label: 'Eligible dealers', value: formatNumber(scheme.eligibleDealers) },
            { label: 'Valid from', value: formatDate(scheme.validFrom) },
            { label: 'Valid to', value: formatDate(scheme.validTo) },
            { label: 'Status', value: <StatusBadge status={scheme.status} /> },
          ]}
        />
        <Field label="Demo status" htmlFor="scheme-status" hint="Changes only the local demo record. No finance or dealer payout is triggered.">
          <select id="scheme-status" className="select" value={scheme.status} onChange={(event) => onStatus(event.target.value as DealerScheme['status'])}>
            {SCHEME_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <DataNote>Scheme terms are illustrative. This demo does not calculate rebates, create payouts or store signed dealer agreements.</DataNote>
      </div>
    </Modal>
  )
}

function AgreementModal({ agreement, onClose, onRenew }: { agreement: StoreAgreement; onClose: () => void; onRenew: () => void }) {
  const days = daysUntil(agreement.endDate)
  return (
    <Modal
      open
      onClose={onClose}
      title={agreement.store}
      description={`${agreement.type} agreement · ${agreement.id}`}
      size="wide"
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" onClick={onRenew}>Renew 12 months (demo)</Button></>}
    >
      <div className="stack-16">
        <div className="row-8 wrap">
          <StatusBadge status={agreement.status} />
          <Badge tone={days !== null && days < 0 ? 'danger' : days !== null && days <= 30 ? 'warning' : 'neutral'}>
            {days !== null && days < 0 ? `${Math.abs(days)} days expired` : `${days ?? 0} days remaining`}
          </Badge>
          <Badge tone="neutral">{formatINR(agreement.value)}</Badge>
        </div>
        <DetailRows
          items={[
            { label: 'Agreement type', value: agreement.type },
            { label: 'Start date', value: formatDate(agreement.startDate) },
            { label: 'End date', value: formatDate(agreement.endDate) },
            { label: 'Renewal reminder', value: formatDate(agreement.renewalReminder) },
            { label: 'Document', value: agreement.documentName },
            { label: 'Annual value', value: formatINR(agreement.value) },
          ]}
        />
        <div className="callout callout--info">
          <BadgeCheck size={14} />
          <span>The document name is a demo label. No signed agreement or file is stored in this browser.</span>
        </div>
        <DataNote>Renewing extends the demo dates by 12 months. It does not create a legal document or notify the store.</DataNote>
      </div>
    </Modal>
  )
}

function TradeEventModal({
  event,
  campaigns,
  onClose,
  onToggle,
}: {
  event: TradeEvent
  campaigns: { id: string; name: string }[]
  onClose: () => void
  onToggle: (index: number) => void
}) {
  const done = event.checklist.filter((item) => item.done).length
  return (
    <Modal
      open
      onClose={onClose}
      title={event.name}
      description={`${event.venue} · ${event.city} · ${formatDate(event.date)}`}
      size="wide"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="stack-16">
        <div className="row-8 wrap">
          <StatusBadge status={event.status} />
          <Badge tone="neutral">{formatINR(event.budget)} budget</Badge>
          <Badge tone="neutral">{done}/{event.checklist.length} checklist items</Badge>
        </div>
        <ProgressBar value={(done / Math.max(1, event.checklist.length)) * 100} label="Planning readiness" showValue tone={utilisationTone((done / Math.max(1, event.checklist.length)) * 100)} />
        <div className="stack-8">
          {event.checklist.map((item, index) => (
            <label key={item.label} className="check-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={item.done} onChange={() => onToggle(index)} />
              <span className="text-sm" style={{ textDecoration: item.done ? 'line-through' : undefined, opacity: item.done ? 0.65 : 1 }}>{item.label}</span>
            </label>
          ))}
        </div>
        <DetailRows
          items={[
            { label: 'Team', value: event.team.join(', ') || 'No team assigned' },
            { label: 'Event status', value: event.status },
            { label: 'Budget', value: formatINR(event.budget) },
            { label: 'Venue', value: `${event.venue}, ${event.city}` },
          ]}
        />
        <div>
          <p className="text-xs faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Recorded outcome</p>
          <p className="text-sm" style={{ lineHeight: 1.6 }}>{event.results}</p>
        </div>
        <DataNote>Checklist toggles are saved locally. No venue, caterer, vendor or attendee is contacted. Campaign links are demo references only.</DataNote>
      </div>
    </Modal>
  )
}
