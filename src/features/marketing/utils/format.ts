/* Formatting helpers — consistent INR, dates, percentages and counts. */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrPreciseFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('en-IN')

export function formatINR(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return inrFormatter.format(value)
}

export function formatINRPrecise(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return inrPreciseFormatter.format(value)
}

/** Indian short scale: 1.2 Cr / 45.3 L / 12.4 K */
export function formatINRCompact(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)} Cr`
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)} L`
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)} K`
  return `${sign}₹${Math.round(abs)}`
}

function trim(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return numberFormatter.format(value)
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1_00_00_000) return `${trim(value / 1_00_00_000)}Cr`
  if (Math.abs(value) >= 1_00_000) return `${trim(value / 1_00_000)}L`
  if (Math.abs(value) >= 1_000) return `${trim(value / 1_000)}K`
  return String(Math.round(value))
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatRatio(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(2)}x`
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatTime(value: string): string {
  if (!value) return '-'

  // Accept both full ISO timestamps and plain HH:mm values.
  if (value.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(parsed)
    }
  }

  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h)) return value
  const date = new Date()
  date.setHours(h, m || 0, 0, 0)
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function todayLabel(): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
