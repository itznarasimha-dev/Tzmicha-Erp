import { clamp } from '../../utils/format'

type ProgressTone = 'brand' | 'success' | 'warning' | 'danger'

interface ProgressBarProps {
  value: number
  tone?: ProgressTone
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showValue?: boolean
  className?: string
}

const toneClass: Record<ProgressTone, string> = {
  brand: '',
  success: 'progress__bar--success',
  warning: 'progress__bar--warning',
  danger: 'progress__bar--danger',
}

export function ProgressBar({
  value,
  tone = 'brand',
  size = 'md',
  label,
  showValue = false,
  className = '',
}: ProgressBarProps) {
  const safe = Number.isFinite(value) ? clamp(value, 0, 100) : 0
  return (
    <div className={className}>
      {label || showValue ? (
        <div className="between" style={{ marginBottom: 5 }}>
          {label ? <span className="text-xs muted">{label}</span> : <span />}
          {showValue ? <span className="text-xs font-semibold mono">{safe.toFixed(0)}%</span> : null}
        </div>
      ) : null}
      <div
        className={`progress ${size === 'sm' ? 'progress--sm' : size === 'lg' ? 'progress--lg' : ''}`.trim()}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safe)}
        aria-label={label ?? 'Progress'}
      >
        <div className={`progress__bar ${toneClass[tone]}`.trim()} style={{ width: `${safe}%` }} />
      </div>
    </div>
  )
}

export function utilisationTone(value: number): ProgressTone {
  if (value > 100) return 'danger'
  if (value >= 85) return 'warning'
  return 'success'
}
