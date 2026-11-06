import { useId, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import type { TooltipProps } from 'recharts'
import { ResponsiveContainer } from 'recharts'
import { useReducedMotion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'

export const chartColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
]

export const chartColorValues = {
  indigo: '#5b5bd6',
  teal: '#0d9488',
  amber: '#f59e0b',
  rose: '#e11d48',
  blue: '#2563eb',
  violet: '#8b5cf6',
  tealBright: '#14b8a6',
  slate: '#64748b',
}

export const axisProps = {
  tickLine: false as const,
  axisLine: false as const,
  tick: { fill: 'var(--muted)', fontSize: 10.5 },
}

export const gridProps = {
  stroke: 'var(--chart-grid)',
  strokeDasharray: '3 3',
  vertical: false as const,
}

export function useChartAnimation(): boolean {
  const reduced = useReducedMotion()
  return !reduced
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (value: number) => String(value),
  labelFormatter,
}: {
  active?: boolean
  payload?: any[]
  label?: any
  valueFormatter?: (value: number) => string
  labelFormatter?: (label: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      {label ? (
        <p className="chart-tooltip__label">
          {labelFormatter ? labelFormatter(String(label)) : String(label)}
        </p>
      ) : null}
      {payload.map((entry: any, index: number) => (
        <div className="chart-tooltip__row" key={`${entry.dataKey ?? entry.name}-${index}`}>
          <span>
            <span
              className="chart-tooltip__dot"
              style={{ background: entry.color ?? chartColors[index % chartColors.length] }}
            />
            {entry.name}
          </span>
          <strong>
            {typeof entry.value === 'number' ? valueFormatter(entry.value) : String(entry.value ?? '—')}
          </strong>
        </div>
      ))}
    </div>
  )
}

interface ChartCardProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  legend?: ReactNode
  className?: string
  isEmpty?: boolean
  emptyMessage?: string
  height?: 'sm' | 'md' | 'lg' | 'xl'
  chartClassName?: string
}

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  legend,
  className = '',
  isEmpty = false,
  emptyMessage = 'No data is available for this selection.',
  height = 'md',
  chartClassName = '',
}: ChartCardProps) {
  const heightClass =
    height === 'sm'
      ? 'chart-wrap--sm'
      : height === 'lg'
        ? 'chart-wrap--lg'
        : height === 'xl'
          ? 'chart-wrap--xl'
          : ''
  return (
    <section className={`card chart-card ${className}`.trim()}>
      <div className="chart-card__head">
        <div style={{ minWidth: 0 }}>
          <h2 className="chart-card__title">{title}</h2>
          {subtitle ? <p className="chart-card__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="chart-card__tools">{actions}</div> : null}
      </div>
      {legend ? <div className="chart-legend">{legend}</div> : null}
      <div className={`chart-wrap ${heightClass} ${chartClassName}`.trim()}>
        {isEmpty ? (
          <ChartEmpty message={emptyMessage} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as ReactElement}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="chart-empty">
      <BarChart3 size={22} aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export function LegendItem({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value?: string | number
}) {
  return (
    <span className="chart-legend__item">
      <span className="chart-legend__dot" style={{ background: color }} />
      {label}
      {value !== undefined ? <span className="chart-legend__value">{value}</span> : null}
    </span>
  )
}

export function PieLegend({
  items,
}: {
  items: Array<{ name: string; value: number; color: string; display?: string }>
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  return (
    <div className="pie-legend">
      {items.map((item) => (
        <div className="pie-legend__row" key={item.name}>
          <span className="pie-legend__dot" style={{ background: item.color }} />
          <span className="pie-legend__label">{item.name}</span>
          <span className="pie-legend__value">
            {item.display ?? `${total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%`}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Sparkline({
  data,
  tone = 'var(--brand)',
  width = 84,
  height = 30,
}: {
  data: number[]
  tone?: string
  width?: number
  height?: number
}) {
  const uid = useId().replace(/[^a-z0-9]/gi, '')
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data
    .map((value, index) => {
      const x = (index / Math.max(1, data.length - 1)) * width
      const y = height - 3 - ((value - min) / range) * (height - 8)
      return `${x},${y}`
    })
    .join(' ')
  const areaPoints = `0,${height} ${points} ${width},${height}`
  const gradientId = `spark-${uid}`
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.3" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        className="sparkline__line"
        points={points}
        fill="none"
        stroke={tone}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export interface FunnelStageItem {
  label: string
  value: number
  display?: string
  color: string
}

export function Funnel({
  stages,
  compact = false,
}: {
  stages: FunnelStageItem[]
  compact?: boolean
}) {
  const max = stages[0]?.value || 1
  return (
    <div className={`funnel ${compact ? 'funnel--compact' : ''}`.trim()} role="list" aria-label="Conversion funnel">
      {stages.map((stage, index) => {
        const width = Math.max(34, (stage.value / max) * 100)
        const previous = index > 0 ? stages[index - 1].value : null
        const rate = previous && previous > 0 ? (stage.value / previous) * 100 : null
        return (
          <div
            key={stage.label}
            role="listitem"
            className="funnel-stage"
            style={{ width: `${width}%`, background: stage.color, '--funnel-index': index } as CSSProperties}
            title={`${stage.label}: ${stage.display ?? stage.value}`}
          >
            <span>{stage.label}</span>
            <span className="row-6">
              <span className="funnel-stage__value">{stage.display ?? stage.value}</span>
              {rate !== null ? <span className="funnel-stage__rate">{rate.toFixed(0)}%</span> : null}
            </span>
          </div>
        )
      })}
    </div>
  )
}
