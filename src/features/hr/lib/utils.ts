import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

export const todayISO = () => {
  const d = new Date()
  return toISO(d)
}

export function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export function daysAgo(n: number) {
  return addDays(todayISO(), -n)
}

export function daysAhead(n: number) {
  return addDays(todayISO(), n)
}

export function diffDays(a: string, b: string) {
  const d1 = new Date(a + 'T12:00:00').getTime()
  const d2 = new Date(b + 'T12:00:00').getTime()
  return Math.round((d2 - d1) / 86400000)
}

export function fmtDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', opts)
}

export function fmtDateShort(iso?: string) {
  return fmtDate(iso, { day: '2-digit', month: 'short' })
}

export function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function fmtMoney(n: number, compact = false) {
  if (compact) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function fullName(e: { firstName: string; lastName: string }) {
  return `${e.firstName} ${e.lastName}`
}

export function seededRandom(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '')
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function monthLabel(period: string) {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function nextOccurrence(iso: string) {
  const today = new Date(todayISO() + 'T12:00:00')
  const d = new Date(iso + 'T12:00:00')
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate(), 12)
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return toISO(next)
}

export function ageLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  const before = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
  if (before) years--
  return years
}

export function relativeTime(iso: string) {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const mins = Math.round((now - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return fmtDate(iso.slice(0, 10))
}

export function hoursBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = eh * 60 + em - (sh * 60 + sm)
  return Math.max(0, Math.round((mins / 60) * 10) / 10)
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0)
}

export const CHART_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#f97316', '#22c55e', '#64748b', '#eab308']
