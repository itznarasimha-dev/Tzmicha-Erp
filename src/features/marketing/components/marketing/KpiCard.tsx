import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Sparkline } from '../charts/ChartKit'

export function useCountUp(target: number, duration = 950): number {
  const [value, setValue] = useState(0)
  const previous = useRef(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !Number.isFinite(target)) {
      setValue(target)
      previous.current = target
      return
    }
    const startValue = previous.current
    const startTime = performance.now()
    let frame = 0
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(startValue + (target - startValue) * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(step)
      } else {
        previous.current = target
      }
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}

interface KpiCardProps {
  label: string
  value: number | string
  format?: (value: number) => string
  icon: ReactNode
  tone?: string
  trend?: {
    value: number | null
    label: string
    positiveIsGood?: boolean
  }
  spark?: number[]
  sparkTone?: string
  onClick?: () => void
  hint?: string
  /** Used for the staggered entrance animation. */
  index?: number
}

export function KpiCard({
  label,
  value,
  format = (v) => String(Math.round(v)),
  icon,
  tone = 'var(--brand)',
  trend,
  spark,
  sparkTone,
  onClick,
  hint,
  index = 0,
}: KpiCardProps) {
  const numeric = typeof value === 'number' ? value : null
  const animated = useCountUp(numeric ?? 0)
  const display = numeric !== null ? format(animated) : value
  const direction =
    trend?.value === null || trend?.value === undefined
      ? 'flat'
      : trend.value > 0
        ? 'up'
        : trend.value < 0
          ? 'down'
          : 'flat'
  const positiveIsGood = trend?.positiveIsGood ?? true
  const isGood = direction === 'flat' ? null : (direction === 'up') === positiveIsGood
  const trendClass = isGood === null ? 'trend--flat' : isGood ? 'trend--up' : 'trend--down'
  const TrendIcon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus
  const supportingText = hint ?? trend?.label ?? 'Local demo data'
  const finalValue = numeric !== null ? format(numeric) : String(value)

  const content = (
    <>
      <div className="kpi__top">
        <span className="kpi__icon" aria-hidden="true">
          {icon}
        </span>
        {trend ? (
          <span
            className={`kpi__trend trend ${trendClass}`}
            title={trend.label}
            aria-label={`${trend.value === null ? 'No change data' : `${Math.abs(trend.value).toFixed(1)} percent change`} — ${trend.label}`}
          >
            <TrendIcon aria-hidden="true" />
            <span>{trend.value === null ? '—' : `${Math.abs(trend.value).toFixed(1)}%`}</span>
          </span>
        ) : null}
      </div>
      <div className="kpi__body">
        <p className="kpi__label">{label}</p>
        <p className="kpi__value">{display}</p>
      </div>
      <div className="kpi__meta">
        <span className="kpi__desc" title={trend?.label ?? supportingText}>
          {supportingText}
        </span>
        {spark?.length ? (
          <span className="kpi__spark" aria-hidden="true">
            <Sparkline data={spark} tone={sparkTone ?? tone} width={76} height={28} />
          </span>
        ) : null}
      </div>
    </>
  )

  const style = {
    '--kpi-tone': tone,
    '--kpi-index': index,
  } as CSSProperties

  if (onClick) {
    return (
      <button
        type="button"
        className="card kpi kpi--interactive"
        style={style}
        onClick={onClick}
        aria-label={`${label}: ${finalValue}. Open related module.`}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="card kpi" style={style}>
      {content}
    </div>
  )
}
