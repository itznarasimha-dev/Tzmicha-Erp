/* Date helpers used by demo reminders and seed data. */

export const MS_PER_DAY = 86_400_000

export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysFromNow(days: number, hour = 9, minute = 30): string {
  const d = startOfToday()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function dateOnlyFromNow(days: number): string {
  const d = startOfToday()
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function addDays(date: Date | string, days: number): Date {
  const base = typeof date === 'string' ? new Date(date) : new Date(date)
  base.setDate(base.getDate() + days)
  return base
}

export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const a = typeof from === 'string' ? new Date(from) : from
  const b = typeof to === 'string' ? new Date(to) : to
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY)
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null
  return daysBetween(startOfToday(), date)
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false
  const due = new Date(date)
  due.setHours(0, 0, 0, 0)
  return due.getTime() < startOfToday().getTime()
}

export function isToday(date: string | null): boolean {
  if (!date) return false
  return toISODate(new Date(date)) === toISODate(startOfToday())
}

export function followUpLabel(date: string | null): string {
  if (!date) return 'Not scheduled'
  const days = daysUntil(date)
  if (days === null) return 'Not scheduled'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `In ${days} days`
}

export function monthKey(date: string): string {
  return new Date(date).toLocaleString('en-IN', { month: 'short' })
}

export function daysInStage(lastMoved: string): number {
  return Math.max(0, daysBetween(lastMoved))
}

export function financialYear(date = new Date()): string {
  const y = date.getFullYear()
  const start = date.getMonth() + 1 >= 4 ? y : y - 1
  return `${start}-${String(start + 1).slice(-2)}`
}

export function formatRelative(value: string): string {
  const then = new Date(value).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
