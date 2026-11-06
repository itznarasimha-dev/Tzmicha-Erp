import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Filter,
  Flame,
  Inbox,
  RefreshCw,
  Sparkles,
  UserCheck,
  Users,
  UserX,
  Send,
} from 'lucide-react'
import type { Campaign, Lead, LeadStatus } from '../../types/marketing'
import { Button } from '../ui/Button'
import { Badge, PriorityBadge, StatusBadge } from '../ui/Badge'
import { SectionCard } from '../ui/SectionCard'
import { Avatar } from '../ui/Avatar'
import {
  ChartCard,
  ChartTooltip,
  Funnel,
  PieLegend,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../charts/ChartKit'
import {
  allFollowUpViews,
  boardStageFor,
  followUpTotals,
  leadActivityFeed,
  leadFunnel,
  leadLocation,
  monthlyLeadTrend,
  primaryRequirement,
  sourceAnalytics,
  weeklyLeadTrend,
  type DateRangeId,
} from '../../utils/leads'
import { formatDate, formatDateTime, formatNumber } from '../../utils/format'
import { followUpLabel, isOverdue } from '../../utils/dates'

const STATUS_TONES: Record<string, string> = {
  New: 'var(--chart-1)',
  Contacted: 'var(--chart-5)',
  Interested: 'var(--chart-6)',
  'Follow-up Required': 'var(--chart-3)',
  Qualified: 'var(--chart-7)',
  'Sent to Sales': 'var(--chart-2)',
  Converted: 'var(--chart-7)',
  Rejected: 'var(--chart-4)',
  'Not Interested': 'var(--chart-4)',
  Lost: 'var(--chart-8)',
}

interface LeadsDashboardProps {
  leads: Lead[]
  campaigns: Campaign[]
  dateRange: DateRangeId
  onDateRangeChange: (value: DateRangeId) => void
  source: string
  onSourceChange: (value: string) => void
  employee: string
  onEmployeeChange: (value: string) => void
  campaign: string
  onCampaignChange: (value: string) => void
  owners: string[]
  /** Unfiltered source list so the selected value never removes the other choices. */
  sourceOptions?: string[]
  refreshing: boolean
  onRefresh: () => void
  onAddLead: () => void
  onOpenLead: (leadId: string) => void
  onOpenFollowUps: () => void
  compact?: boolean
}

export function LeadsDashboard({
  leads,
  campaigns,
  dateRange,
  onDateRangeChange,
  source,
  onSourceChange,
  employee,
  onEmployeeChange,
  campaign,
  onCampaignChange,
  owners,
  sourceOptions,
  refreshing,
  onRefresh,
  onAddLead,
  onOpenLead,
  onOpenFollowUps,
  compact = false,
}: LeadsDashboardProps) {
  const reducedMotion = useReducedMotion()
  const chartAnimation = useChartAnimation()
  const funnel = leadFunnel(leads)
  const sources = sourceAnalytics(leads).slice(0, 7)
  const followUps = allFollowUpViews(leads)
  const followUpSummary = followUpTotals(followUps)
  const followUpsDue = followUps
    .filter((followUp) => followUp.displayStatus === 'Due Today' || followUp.displayStatus === 'Overdue')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  const recentlyAdded = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  const highPriority = leads
    .filter((lead) => (lead.priority === 'Urgent' || lead.priority === 'High') && !['Converted', 'Rejected', 'Lost', 'Not Interested'].includes(lead.status))
    .sort((a, b) => {
      const priorityScore = (lead: Lead) => (lead.priority === 'Urgent' ? 2 : 1)
      return priorityScore(b) - priorityScore(a) || new Date(a.nextFollowUp ?? 0).getTime() - new Date(b.nextFollowUp ?? 0).getTime()
    })
    .slice(0, 5)
  const recentActivity = leadActivityFeed(leads, 7)
  const weekly = weeklyLeadTrend(leads)
  const monthly = monthlyLeadTrend(leads)
  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    leads.forEach((lead) => counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([status, value], index) => ({
        name: status,
        value,
        color: STATUS_TONES[status] ?? chartColors[index % chartColors.length],
      }))
  }, [leads])

  const total = leads.length
  const newLeads = leads.filter((lead) => boardStageFor(lead) === 'new').length
  const qualified = leads.filter((lead) => ['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status)).length
  const sentToSales = leads.filter((lead) => Boolean(lead.salesAssignment) || ['Sent to Sales', 'Converted', 'Lost'].includes(lead.status)).length
  const withSales = leads.filter((lead) => boardStageFor(lead) === 'sent-to-sales').length
  const converted = leads.filter((lead) => lead.status === 'Converted' || lead.converted).length
  const lost = leads.filter((lead) => lead.status === 'Lost' || lead.salesAssignment?.salesStatus === 'Lost').length
  const rejected = leads.filter((lead) => ['Rejected', 'Not Interested'].includes(lead.status)).length
  const highPriorityOpen = leads.filter((lead) => (lead.priority === 'High' || lead.priority === 'Urgent') && !['Converted', 'Rejected', 'Lost', 'Not Interested'].includes(lead.status)).length

  const kpis = [
    {
      label: 'Total Leads',
      value: total,
      sub: `${formatNumber(newLeads)} captured as new`,
      icon: <Users size={16} />,
      tone: 'var(--chart-1)',
      progress: total ? (newLeads / total) * 100 : 0,
    },
    {
      label: 'New Leads',
      value: newLeads,
      sub: 'Awaiting first contact',
      icon: <Inbox size={16} />,
      tone: 'var(--chart-5)',
    },
    {
      label: 'Follow-ups Due',
      value: followUpSummary.dueToday + followUpSummary.overdue,
      sub: `${followUpSummary.overdue} overdue · ${followUpSummary.dueToday} today`,
      icon: <CalendarClock size={16} />,
      tone: 'var(--chart-3)',
      alert: followUpSummary.overdue > 0,
    },
    {
      label: 'Qualified Leads',
      value: qualified,
      sub: `${formatNumber(total ? (qualified / total) * 100 : 0)}% of all leads`,
      icon: <UserCheck size={16} />,
      tone: 'var(--chart-6)',
    },
    {
      label: 'Sent to Sales',
      value: sentToSales,
      sub: `${formatNumber(withSales)} currently with sales · ${formatNumber(converted)} converted · ${formatNumber(lost)} lost`,
      icon: <Send size={16} />,
      tone: 'var(--chart-2)',
    },
    {
      label: 'Converted Leads',
      value: converted,
      sub: `${formatNumber(total ? (converted / total) * 100 : 0)}% conversion rate`,
      icon: <BadgeCheck size={16} />,
      tone: 'var(--chart-7)',
      progress: total ? (converted / total) * 100 : 0,
    },
    {
      label: 'Rejected Leads',
      value: rejected,
      sub: 'Marketing outcome · not interested or disqualified',
      icon: <UserX size={16} />,
      tone: 'var(--chart-4)',
    },
  ]

  return (
    <div className="lead-dashboard stack-16">
      <div className="lead-dashboard__toolbar">
        <div className="lead-dashboard__toolbar-title">
          <span className="lead-dashboard__eyebrow"><Sparkles size={12} /> Live workspace</span>
          <h2>{compact ? 'Leads dashboard' : 'Customer acquisition overview'}</h2>
          <p>
            {compact
              ? 'The same live KPIs and source mix remain visible while you work in another lead view.'
              : 'Every number below is calculated from leads and follow-ups recorded in this browser.'}
          </p>
        </div>
        <div className="lead-dashboard__filters">
          <label className="lead-dashboard__filter">
            <span>Date range</span>
            <select className="select" value={dateRange} onChange={(event) => onDateRangeChange(event.target.value as DateRangeId)}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="quarter">This quarter</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
            </select>
          </label>
          <label className="lead-dashboard__filter">
            <span>Source</span>
            <select className="select" value={source} onChange={(event) => onSourceChange(event.target.value)}>
              <option value="All">All sources</option>
              {(sourceOptions ?? [...new Set(leads.map((lead) => lead.source))]).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="lead-dashboard__filter">
            <span>Employee</span>
            <select className="select" value={employee} onChange={(event) => onEmployeeChange(event.target.value)}>
              <option value="All">All employees</option>
              {owners.map((owner) => <option key={owner}>{owner}</option>)}
            </select>
          </label>
          <label className="lead-dashboard__filter">
            <span>Campaign</span>
            <select className="select" value={campaign} onChange={(event) => onCampaignChange(event.target.value)}>
              <option value="All">All campaigns</option>
              {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} loading={refreshing} onClick={onRefresh}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={onAddLead} icon={<Users size={14} />}>Add lead</Button>
        </div>
      </div>

      {!leads.length ? (
        <div className="lead-dashboard__empty">
          <Filter size={22} />
          <h3>No leads match these dashboard filters</h3>
          <p>Try a wider date range, clear the source or employee filter, or add a new lead.</p>
          <Button variant="soft" onClick={onRefresh} icon={<RefreshCw size={14} />}>Reset view</Button>
        </div>
      ) : null}

      <div className="lead-kpi-grid">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            className={`lead-kpi ${kpi.alert ? 'lead-kpi--alert' : ''}`.trim()}
            style={{ '--lead-kpi-tone': kpi.tone } as React.CSSProperties}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : index * 0.045, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="lead-kpi__top">
              <span className="lead-kpi__label">{kpi.label}</span>
              <span className="lead-kpi__icon">{kpi.icon}</span>
            </div>
            <div className="lead-kpi__value">
              <AnimatedCount value={kpi.value} reducedMotion={Boolean(reducedMotion)} />
            </div>
            <p className="lead-kpi__sub">{kpi.sub}</p>
            {typeof kpi.progress === 'number' ? (
              <div className="lead-kpi__progress" aria-hidden="true">
                <span style={{ width: `${Math.max(2, Math.min(100, kpi.progress))}%` }} />
              </div>
            ) : null}
          </motion.div>
        ))}
      </div>

      <div className="lead-dashboard__chart-grid">
        <ChartCard
          title="Lead conversion funnel"
          subtitle="Based on recorded status and handoff data"
          height={compact ? 'sm' : 'md'}
          isEmpty={funnel[0].value === 0}
        >
          <Funnel
            stages={funnel.map((stage, index) => ({
              label: stage.label === 'Sent to sales' ? 'Sales' : stage.label,
              value: stage.value,
              display: formatNumber(stage.value),
              color: chartColors[index % chartColors.length],
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Leads by source"
          subtitle="Actual acquisition source on each lead"
          height={compact ? 'sm' : 'md'}
          isEmpty={sources.length === 0}
        >
          <BarChart data={sources} layout="vertical" margin={{ top: 4, right: 18, left: 2, bottom: 0 }}>
            <CartesianGrid {...gridProps} horizontal={false} vertical />
            <XAxis type="number" {...axisProps} allowDecimals={false} />
            <YAxis type="category" dataKey="source" {...axisProps} width={98} tick={{ fill: 'var(--muted)', fontSize: 9.5 }} />
            <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="total" name="Leads" radius={[0, 5, 5, 0]} isAnimationActive={chartAnimation}>
              {sources.map((entry, index) => (
                <Cell key={entry.source} fill={chartColors[index % chartColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      {!compact ? (
        <>
          <div className="lead-dashboard__chart-grid lead-dashboard__chart-grid--three">
            <ChartCard title="Lead status distribution" subtitle="Current recorded status" height="md" isEmpty={statusDistribution.length === 0}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="56%"
                  outerRadius="82%"
                  paddingAngle={2}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  isAnimationActive={chartAnimation}
                >
                  {statusDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} />
              </PieChart>
              <div className="lead-dashboard__donut-legend">
                <PieLegend items={statusDistribution} />
              </div>
            </ChartCard>

            <ChartCard title="Weekly lead trend" subtitle="Leads created in the last 8 weeks" height="md" isEmpty={weekly.every((point) => point.leads === 0)}>
              <AreaChart data={weekly} margin={{ top: 8, right: 14, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadWeeklyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} width={28} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} />
                <Area type="monotone" dataKey="leads" name="Leads created" stroke="var(--chart-1)" strokeWidth={2} fill="url(#leadWeeklyFill)" isAnimationActive={chartAnimation} />
                <Line type="monotone" dataKey="qualified" name="Qualified" stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={chartAnimation} />
              </AreaChart>
            </ChartCard>

            <ChartCard title="Monthly lead trend" subtitle="Created leads across recent months" height="md" isEmpty={monthly.every((point) => point.leads === 0)}>
              <LineChart data={monthly} margin={{ top: 8, right: 14, left: -12, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} width={28} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-6)" strokeWidth={2.2} dot={{ r: 2.5 }} isAnimationActive={chartAnimation} />
                <Line type="monotone" dataKey="converted" name="Converted" stroke="var(--chart-7)" strokeWidth={2} dot={false} isAnimationActive={chartAnimation} />
              </LineChart>
            </ChartCard>
          </div>

          <div className="lead-dashboard__list-grid">
            <SectionCard
              title="Follow-ups due today"
              subtitle="Overdue and due today, sorted by urgency"
              actions={<Badge tone={followUpSummary.overdue ? 'danger' : 'success'}>{followUpSummary.overdue ? `${followUpSummary.overdue} overdue` : 'On track'}</Badge>}
            >
              {followUpsDue.length === 0 ? (
                <p className="empty-inline">No follow-ups are due today. Upcoming follow-ups stay visible in the Follow-ups tab.</p>
              ) : (
                <div className="stack-6">
                  {followUpsDue.slice(0, 5).map((followUp) => {
                    const lead = leads.find((item) => item.id === followUp.leadId)
                    return (
                      <button key={followUp.id} type="button" className="lead-dashboard__row" onClick={() => onOpenLead(followUp.leadId)}>
                        <Avatar name={followUp.leadName} size="sm" />
                        <span className="grow" style={{ minWidth: 0 }}>
                          <span className="lead-dashboard__row-title truncate">{followUp.leadName} · {followUp.company || 'No company'}</span>
                          <span className="lead-dashboard__row-meta truncate">{followUp.reason} · {followUp.method}</span>
                        </span>
                        <Badge tone={followUp.displayStatus === 'Overdue' ? 'danger' : 'warning'}>
                          {followUp.displayStatus === 'Overdue' ? followUpLabel(followUp.dueAt) : 'Due today'}
                        </Badge>
                        {lead?.priority === 'Urgent' || lead?.priority === 'High' ? <Flame size={13} className="warning-text" /> : null}
                      </button>
                    )
                  })}
                </div>
              )}
              <button type="button" className="lead-dashboard__view-all" onClick={onOpenFollowUps}>
                Open follow-up manager <ChevronRight size={13} />
              </button>
            </SectionCard>

            <SectionCard title="Recently added leads" subtitle="Newest customer records" actions={<Badge tone="neutral">{recentlyAdded.length}</Badge>}>
              {recentlyAdded.length === 0 ? (
                <p className="empty-inline">No leads in this view.</p>
              ) : (
                <div className="stack-6">
                  {recentlyAdded.map((lead) => (
                    <button key={lead.id} type="button" className="lead-dashboard__row" onClick={() => onOpenLead(lead.id)}>
                      <Avatar name={lead.name} size="sm" />
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span className="lead-dashboard__row-title truncate">{lead.name}</span>
                        <span className="lead-dashboard__row-meta truncate">{lead.company || 'No company'} · {leadLocation(lead) || 'Location not recorded'}</span>
                      </span>
                      <span className="text-xs faint no-shrink">{formatDate(lead.createdAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="High-priority leads"
              subtitle="Open leads that need attention first"
              actions={<Badge tone="warning">{highPriorityOpen} open</Badge>}
            >
              {highPriority.length === 0 ? (
                <p className="empty-inline">No high-priority open leads right now.</p>
              ) : (
                <div className="stack-6">
                  {highPriority.map((lead) => (
                    <button key={lead.id} type="button" className="lead-dashboard__row" onClick={() => onOpenLead(lead.id)}>
                      <PriorityBadge priority={lead.priority} />
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span className="lead-dashboard__row-title truncate">{lead.name}</span>
                        <span className="lead-dashboard__row-meta truncate">{lead.product || 'Product not recorded'} · {lead.assignedTo}</span>
                      </span>
                      {lead.nextFollowUp ? (
                        <span className={`text-xs no-shrink ${isOverdue(lead.nextFollowUp) ? 'danger-text' : 'faint'}`}>
                          {followUpLabel(lead.nextFollowUp)}
                        </span>
                      ) : <span className="text-xs faint">No follow-up</span>}
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Recent lead activities" subtitle="Recorded calls, messages, meetings, status changes and handoffs" actions={<Badge tone="neutral">{recentActivity.length} events</Badge>}>
            {recentActivity.length === 0 ? (
              <p className="empty-inline">No lead activity has been recorded yet.</p>
            ) : (
              <div className="lead-activity-feed">
                {recentActivity.map((activity) => (
                  <button key={activity.id} type="button" className="lead-activity-feed__item" onClick={() => onOpenLead(activity.leadId)}>
                    <span className="lead-activity-feed__icon" aria-hidden="true"><ActivityTypeIcon type={activity.type} /></span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="lead-activity-feed__title">
                        <strong>{activity.leadName}</strong> · {activity.type}
                      </span>
                      <span className="lead-activity-feed__summary">{activity.summary}</span>
                    </span>
                    <span className="lead-activity-feed__time">{formatDateTime(activity.at)} · {activity.by}</span>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <div className="lead-dashboard__compact-footer">
          <span><CircleAlert size={13} /> {followUpSummary.overdue} overdue and {followUpSummary.dueToday} due today.</span>
          <button type="button" onClick={onOpenFollowUps}>Open follow-up manager <ChevronRight size={12} /></button>
        </div>
      )}
    </div>
  )
}

function AnimatedCount({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
  const [display, setDisplay] = useState(reducedMotion ? value : 0)
  const frame = useRef<number | null>(null)
  const from = useRef(0)
  const started = useRef(0)

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value)
      return
    }
    from.current = display
    started.current = performance.now()
    const duration = 620
    const step = (now: number) => {
      const progress = Math.min(1, (now - started.current) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from.current + (value - from.current) * eased))
      if (progress < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reducedMotion])

  return <>{formatNumber(display)}</>
}

export function ActivityTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'Call':
      return <PhoneGlyph />
    case 'WhatsApp':
      return <WhatsAppGlyph />
    case 'Email':
      return <MailGlyph />
    case 'Meeting':
    case 'Visit':
      return <CalendarGlyph />
    case 'Assignment':
      return <Send size={13} />
    case 'Conversion':
      return <BadgeCheck size={13} />
    case 'Qualification':
      return <UserCheck size={13} />
    case 'Status Change':
      return <RefreshCw size={13} />
    default:
      return <NoteGlyph />
  }
}

export function statusColor(status: LeadStatus | string): string {
  return STATUS_TONES[status] ?? 'var(--chart-8)'
}

function PhoneGlyph() {
  return <span aria-hidden="true">☎</span>
}
function WhatsAppGlyph() {
  return <span aria-hidden="true">💬</span>
}
function MailGlyph() {
  return <span aria-hidden="true">✉</span>
}
function CalendarGlyph() {
  return <CalendarClock size={13} />
}
function NoteGlyph() {
  return <Sparkles size={13} />
}

export function LeadMiniBadge({ children }: { children: ReactNode }) {
  return <span className="lead-mini-badge">{children}</span>
}

export function LeadStatusChip({ status }: { status: LeadStatus }) {
  return <StatusBadge status={status} />
}
