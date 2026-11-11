import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { PageHeader } from '../../ui/PageHeader'
import { Badge, type BadgeTone } from '../../ui/Badge'
import { Avatar } from '../../ui/Avatar'
import { ProgressBar, utilisationTone } from '../../ui/ProgressBar'
import { Sparkline } from '../../charts/ChartKit'
import { useDemoRole } from '../../../context/DemoRoleContext'
import { useMarketingDepartment } from '../../../context/MarketingDepartmentContext'
import type { Actor } from '../../../context/MarketingDepartmentContext'
import type {
  MarketingEmployee,
  MarketingLead,
  MarketingPriority,
  MarketingSector,
} from '../../../types/marketingDepartment'
import {
  employeesInSector,
  expensesInScope,
  ideasInScope,
  juniorTeamFor,
  leadsInScope,
  roleLabel,
  sectorsForSenior,
  taskStats,
  tasksInScope,
} from '../../../utils/marketingDepartment'
import { formatINRCompact, formatNumber } from '../../../utils/format'

export function useMmsActor(): Actor {
  const { roleId, profile } = useDemoRole()
  return {
    id: profile.employeeId,
    name: profile.name,
    role: roleId as any,
    roleLabel: profile.roleLabel,
  }
}

export function useMmsScope() {
  const { roleId, profile } = useDemoRole()
  const department = useMarketingDepartment()
  const actor = useMmsActor()
  const employee = department.employees.find((item) => item.id === profile.employeeId)
  const workspaceRole: 'manager' | 'senior' | 'junior' =
    roleId === 'manager' ? 'manager' : roleId === 'senior' ? 'senior' : 'junior'
  const mySectors =
    roleId === 'manager'
      ? department.sectors
      : roleId === 'senior'
        ? sectorsForSenior(department.sectors, profile.employeeId)
        : department.sectors.filter((sector) => sector.id === employee?.sectorId)
  const leads = leadsInScope(department.leads, workspaceRole, profile.employeeId, department.sectors)
  const tasks = tasksInScope(
    department.tasks,
    workspaceRole,
    profile.employeeId,
    department.sectors,
    department.employees,
  )
  const team =
    roleId === 'senior'
      ? juniorTeamFor(department.sectors, department.employees, profile.employeeId)
      : roleId === 'manager'
        ? department.employees.filter((item) => item.role === 'senior' || item.role === 'junior')
        : []
  const visibleLeadIds = new Set(leads.map((lead) => lead.id))
  const followUps = department.followUps.filter((followUp) => visibleLeadIds.has(followUp.leadId))
  const expenses = expensesInScope(department.expenses, workspaceRole, profile.employeeId, department.sectors)
  const ideas = ideasInScope(department.ideas, workspaceRole, profile.employeeId, department.sectors)
  return {
    roleId,
    profile,
    actor,
    employee,
    mySectors,
    leads,
    tasks,
    team,
    followUps,
    expenses,
    ideas,
    department,
  }
}

export function AnimatedNumber({
  value,
  format = (input) => formatNumber(input),
  duration = 700,
}: {
  value: number
  format?: (value: number) => string
  duration?: number
}) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    let frame = 0
    const start = performance.now()
    const initial = display
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(initial + (value - initial) * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduced])
  return <>{format(display)}</>
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = 'var(--brand)',
  delta,
  spark,
  onClick,
  format,
  footer,
}: {
  label: string
  value: number | string
  hint?: string
  icon: ReactNode
  tone?: string
  delta?: { value: string; positive?: boolean; neutral?: boolean }
  spark?: number[]
  onClick?: () => void
  format?: (value: number) => string
  footer?: ReactNode
}) {
  const reduced = useReducedMotion()
  const content = (
    <>
      <span className="mms-kpi__glow" style={{ background: tone }} aria-hidden="true" />
      <span className="mms-kpi__top">
        <span className="mms-kpi__icon" style={{ color: tone, background: `color-mix(in srgb, ${tone} 13%, transparent)` }}>
          {icon}
        </span>
        {delta ? (
          <span
            className={`mms-kpi__delta ${delta.positive ? 'is-up' : ''} ${delta.neutral ? 'is-neutral' : ''}`.trim()}
          >
            {delta.neutral ? null : delta.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {delta.value}
          </span>
        ) : null}
      </span>
      <span className="mms-kpi__label">{label}</span>
      <span className="mms-kpi__value">
        {typeof value === 'number' ? (
          <AnimatedNumber value={value} format={format ?? ((input) => formatNumber(Math.round(input)))} />
        ) : (
          value
        )}
      </span>
      {hint ? <span className="mms-kpi__hint">{hint}</span> : null}
      <span className="mms-kpi__bottom">
        {spark && spark.length > 1 ? <Sparkline data={spark} tone={tone} width={104} height={30} /> : <span />}
        {footer}
      </span>
    </>
  )
  if (onClick) {
    return (
      <motion.button
        type="button"
        className="mms-kpi mms-kpi--button"
        onClick={onClick}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        style={{ '--mms-tone': tone } as CSSProperties}
      >
        {content}
      </motion.button>
    )
  }
  return (
    <motion.div
      className="mms-kpi"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{ '--mms-tone': tone } as CSSProperties}
    >
      {content}
    </motion.div>
  )
}

export function MmsPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <div className="mms-page-head">
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} actions={actions} meta={meta} />
      <p className="mms-sample-note">
        <Sparkles size={12} /> Demonstration workspace · sample data · changes stay in this browser session
      </p>
    </div>
  )
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  icon,
  flush = false,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  icon?: ReactNode
  flush?: boolean
}) {
  return (
    <section className={`card mms-section ${className}`.trim()}>
      {title ? (
        <div className="mms-section__head">
          <div className="mms-section__title-wrap">
            {icon ? <span className="mms-section__icon">{icon}</span> : null}
            <div>
              <h2 className="mms-section__title">{title}</h2>
              {subtitle ? <p className="mms-section__subtitle">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="mms-section__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={flush ? 'mms-section__body mms-section__body--flush' : 'mms-section__body'}>{children}</div>
    </section>
  )
}

export function StatusChip({
  status,
  tone,
}: {
  status: string
  tone?: BadgeTone
}) {
  return (
    <Badge tone={tone ?? statusToneFor(status)} dot>
      {status}
    </Badge>
  )
}

function statusToneFor(status: string): BadgeTone {
  const lower = status.toLowerCase()
  if (/(approved|active|completed|won|success)/.test(lower)) return 'success'
  if (/(rejected|lost|blocked|deactivated|overdue|danger)/.test(lower)) return 'danger'
  if (/(pending|review|changes|paused|warning)/.test(lower)) return 'warning'
  if (/(new|info|submitted|scheduled)/.test(lower)) return 'info'
  if (/(qualified|accent|forwarded)/.test(lower)) return 'accent'
  return 'neutral'
}

export function PriorityChip({ priority }: { priority: MarketingPriority }) {
  return <span className={`mms-priority mms-priority--${priority.toLowerCase()}`}>{priority}</span>
}

export function MmsTabs({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: string; label: string; count?: number }>
  value: string
  onChange: (id: string) => void
  ariaLabel: string
}) {
  const reduced = useReducedMotion()
  return (
    <div className="mms-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`mms-tab ${active ? 'is-active' : ''}`.trim()}
            onClick={() => onChange(option.id)}
          >
            {active ? (
              <motion.span
                layoutId={`mms-tabs-${ariaLabel.replace(/\s+/g, '-')}`}
                className="mms-tab__pill"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span>{option.label}</span>
            {option.count !== undefined ? <em>{option.count}</em> : null}
          </button>
        )
      })}
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="mms-search">
      <Search size={15} aria-hidden="true" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function MmsToolbar({ children }: { children: ReactNode }) {
  return <div className="mms-toolbar">{children}</div>
}

export function MmsSelect({
  label,
  value,
  options,
  onChange,
  allLabel = 'All',
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  allLabel?: string
}) {
  return (
    <label className="mms-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function EmptyBlock({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mms-empty">
      {icon ? <span className="mms-empty__icon">{icon}</span> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  )
}

export function InfoBanner({
  title,
  children,
  tone = 'info',
  icon,
}: {
  title?: string
  children: ReactNode
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
  icon?: ReactNode
}) {
  return (
    <div className={`mms-banner mms-banner--${tone}`.trim()}>
      <span className="mms-banner__icon">{icon ?? <Info size={15} />}</span>
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  )
}

export function MmsProgress({
  value,
  label,
  tone,
}: {
  value: number
  label?: string
  tone?: 'brand' | 'success' | 'warning' | 'danger'
}) {
  return (
    <div className="mms-progress">
      {label ? (
        <div className="mms-progress__labels">
          <span>{label}</span>
          <strong>{Math.round(value)}%</strong>
        </div>
      ) : null}
      <ProgressBar value={value} tone={tone ?? utilisationTone(value)} size="sm" />
    </div>
  )
}

export function ProgressRing({
  value,
  size = 92,
  label,
  tone = 'var(--brand)',
}: {
  value: number
  size?: number
  label?: string
  tone?: string
}) {
  const safe = Math.max(0, Math.min(100, value))
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safe / 100) * circumference
  return (
    <div className="mms-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="7"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="mms-ring__value">
        <strong>{Math.round(safe)}%</strong>
        {label ? <small>{label}</small> : null}
      </span>
    </div>
  )
}

export function EmployeeAvatar({
  employee,
  size = 'sm',
  showRole = false,
}: {
  employee?: MarketingEmployee
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showRole?: boolean
}) {
  if (!employee) {
    return (
      <span className="mms-person">
        <span className="avatar avatar--sm">?</span>
        <span>
          <strong>Unassigned</strong>
        </span>
      </span>
    )
  }
  return (
    <span className="mms-person">
      <Avatar name={employee.name} size={size} />
      <span className="mms-person__text">
        <strong>{employee.name}</strong>
        <small>{showRole ? employee.designation : employee.location}</small>
      </span>
    </span>
  )
}

export function SectorChip({
  sector,
  compact = false,
}: {
  sector?: MarketingSector
  compact?: boolean
}) {
  if (!sector) return <span className="mms-sector-chip">Unassigned sector</span>
  return (
    <span className="mms-sector-chip" style={{ '--sector-tone': sector.color } as CSSProperties}>
      <span className="mms-sector-chip__dot" />
      {compact ? sector.code : sector.name}
    </span>
  )
}

export function LeadOwnerLine({ lead }: { lead: MarketingLead }) {
  return (
    <span className="mms-lead-owner">
      <Users size={12} />
      {lead.assignedJuniorId ? 'Junior assigned' : lead.assignedSeniorId ? 'Senior assigned' : 'Unassigned'}
    </span>
  )
}

export function MetricPair({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: string
}) {
  return (
    <div className="mms-metric-pair">
      <span>{label}</span>
      <strong style={tone ? { color: tone } : undefined}>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}

export function CompactTaskStats({ tasks }: { tasks: Parameters<typeof taskStats>[0] }) {
  const stats = taskStats(tasks)
  return (
    <div className="mms-compact-stats">
      <span><strong>{stats.pending}</strong> pending</span>
      <span><strong>{stats.review}</strong> in review</span>
      <span><strong>{stats.overdue}</strong> overdue</span>
    </div>
  )
}

export function TimelineList({
  items,
  emptyLabel = 'No activity recorded yet.',
  limit,
}: {
  items: Array<{
    id: string
    at: string
    actorName?: string
    actorRole?: string
    action: string
    note?: string
    tone?: string
  }>
  emptyLabel?: string
  limit?: number
}) {
  const shown = limit ? items.slice(0, limit) : items
  if (!shown.length) return <p className="mms-empty-line">{emptyLabel}</p>
  return (
    <ol className="mms-timeline">
      {shown.map((item) => (
        <li key={item.id} className={`mms-timeline__item mms-timeline__item--${item.tone ?? 'info'}`}>
          <span className="mms-timeline__dot" aria-hidden="true" />
          <div className="mms-timeline__content">
            <div className="mms-timeline__head">
              <strong>{item.action}</strong>
              <span>{new Date(item.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {item.actorName ? (
              <p className="mms-timeline__actor">
                {item.actorName}
                {item.actorRole ? ` · ${item.actorRole}` : ''}
              </p>
            ) : null}
            {item.note ? <p className="mms-timeline__note">{item.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function ScopeBadge({ label, tone = 'var(--brand)' }: { label: string; tone?: string }) {
  return (
    <span className="mms-scope-badge" style={{ '--scope-tone': tone } as CSSProperties}>
      <TrendingUp size={12} /> {label}
    </span>
  )
}

export function RolePill({ role }: { role: string }) {
  return <span className={`mms-role-pill mms-role-pill--${role}`}>{roleLabel(role)}</span>
}

export function SectorTeamPreview({
  sector,
  employees,
  max = 4,
}: {
  sector: MarketingSector
  employees: MarketingEmployee[]
  max?: number
}) {
  const team = employeesInSector(employees, sector.id)
  return (
    <span className="mms-avatar-stack" aria-label={`${team.length} team members`}>
      {team.slice(0, max).map((employee) => (
        <Avatar key={employee.id} name={employee.name} size="sm" />
      ))}
      {team.length > max ? <span className="avatar avatar--sm">+{team.length - max}</span> : null}
    </span>
  )
}

export function moneyCompact(value: number) {
  return formatINRCompact(value)
}
