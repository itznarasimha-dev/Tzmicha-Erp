import type { CSSProperties, ReactNode } from 'react'
import { Info, TrendingUp } from 'lucide-react'
import { ProgressBar, utilisationTone } from '../ui/ProgressBar'

interface MetricCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  tone?: string
  progress?: number
  trend?: ReactNode
}

export function MetricCard({
  label,
  value,
  sub,
  icon,
  tone = 'var(--brand)',
  progress,
  trend,
}: MetricCardProps) {
  return (
    <div className="metric-card" style={{ '--metric-tone': tone } as CSSProperties}>
      <div className="metric-card__head">
        <span className="metric-card__label">{label}</span>
        {icon ? (
          <span className="metric-card__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="metric-card__value">{value}</div>
      <div className="metric-card__foot">
        {sub ? <span className="metric-card__sub">{sub}</span> : null}
        {trend ? <span className="metric-card__trend">{trend}</span> : null}
      </div>
      {typeof progress === 'number' ? (
        <ProgressBar value={progress} tone={utilisationTone(progress)} size="sm" className="mt-8" />
      ) : null}
    </div>
  )
}

export function MetricGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return <div className={`metric-grid metric-grid--${columns}`}>{children}</div>
}

export function TabIntro({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="tab-intro">
      <div className="tab-intro__text">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="tab-intro__actions">{actions}</div> : null}
      {children ? <div className="tab-intro__below">{children}</div> : null}
    </div>
  )
}

export function DemoNote({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  return (
    <div className={`callout callout--${tone}`}>
      <Info size={14} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function DetailRows({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode }>
  columns?: 1 | 2 | 3
}) {
  return (
    <dl className={`detail-grid detail-grid--${columns}`}>
      {items.map((item, index) => (
        <div className="detail-item" key={`${item.label}-${index}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ScoreRow({
  label,
  value,
  suffix = '%',
  tone,
}: {
  label: string
  value: number
  suffix?: string
  tone?: 'brand' | 'success' | 'warning' | 'danger'
}) {
  const resolved = tone ?? (value >= 80 ? 'success' : value >= 60 ? 'warning' : 'danger')
  return (
    <div className="score-row">
      <div className="score-row__head">
        <span>{label}</span>
        <strong>
          {value}
          {suffix}
        </strong>
      </div>
      <ProgressBar value={value} tone={resolved} size="sm" />
    </div>
  )
}

export function FilterRow({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return (
    <div className="filter-row">
      {children}
      {count !== undefined ? <span className="filter-row__count">{count}</span> : null}
    </div>
  )
}

export function MiniStat({
  label,
  value,
  sub,
  tone = 'var(--brand)',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: string
}) {
  return (
    <div className="mini-stat" style={{ '--mini-tone': tone } as CSSProperties}>
      <p className="mini-stat__label">{label}</p>
      <p className="mini-stat__value">{value}</p>
      {sub ? <p className="mini-stat__sub">{sub}</p> : null}
    </div>
  )
}

export function InsightLine({ children }: { children: ReactNode }) {
  return (
    <p className="insight-line">
      <TrendingUp size={14} aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

export function EntityGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return <div className={`entity-grid entity-grid--${columns}`}>{children}</div>
}

export function EntityCard({
  title,
  subtitle,
  badge,
  meta,
  children,
  actions,
  onClick,
}: {
  title: ReactNode
  subtitle?: ReactNode
  badge?: ReactNode
  meta?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`entity-card ${onClick ? 'entity-card--button' : ''}`.trim()}
      onClick={onClick}
    >
      <div className="entity-card__head">
        <div style={{ minWidth: 0 }}>
          <p className="entity-card__title">{title}</p>
          {subtitle ? <p className="entity-card__subtitle">{subtitle}</p> : null}
        </div>
        {badge ? <div className="no-shrink">{badge}</div> : null}
      </div>
      {meta ? <div className="entity-card__meta">{meta}</div> : null}
      {children ? <div className="entity-card__body">{children}</div> : null}
      {actions ? <div className="entity-card__actions">{actions}</div> : null}
    </Tag>
  )
}

export function DataNote({ children }: { children: ReactNode }) {
  return <p className="data-note">{children}</p>
}

export function SectionToolbar({ children }: { children: ReactNode }) {
  return <div className="section-toolbar">{children}</div>
}
