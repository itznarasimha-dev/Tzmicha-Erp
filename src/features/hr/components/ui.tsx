import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, FileText, Info, Loader2,
  Search, UploadCloud, X, XCircle,
} from 'lucide-react'
import type { DocFile } from '../types'
import { cn, initials, uid } from '../lib/utils'
import { useStore } from '../store'

export type Tone = 'brand' | 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'teal' | 'rose' | 'orange'

const toneStyles: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/10 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/10 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/10 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/10 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/10 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20',
}

export function statusTone(status?: string): Tone {
  const s = (status || '').toLowerCase()
  if (['active', 'paid', 'approved', 'resolved', 'completed', 'hired', 'verified', 'ready', 'cleared', 'signed', 'present', 'on track', 'sent'].some((k) => s.includes(k))) return 'green'
  if (['pending', 'review', 'in progress', 'processing', 'probation', 'screening', 'self assessment', 'half day', 'at risk', 'on hold'].some((k) => s.includes(k))) return 'amber'
  if (['rejected', 'failed', 'terminated', 'expired', 'blocked', 'absent', 'urgent', 'declined', 'overdue'].some((k) => s.includes(k))) return 'red'
  if (['draft', 'not started', 'applied', 'cancelled', 'scheduled'].some((k) => s.includes(k))) return 'slate'
  if (['interview', 'offer', 'remote', 'on leave', 'info'].some((k) => s.includes(k))) return 'blue'
  if (['expiring', 'notice', 'manager review', 'hr review', 'renewed', 'late'].some((k) => s.includes(k))) return 'violet'
  return 'slate'
}

export function Badge({ children, tone = 'slate', dot = false, className }: { children: React.ReactNode; tone?: Tone; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', toneStyles[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  )
}

export function StatusBadge({ status, className }: { status?: string; className?: string }) {
  return <Badge tone={statusTone(status)} dot className={className}>{status || '—'}</Badge>
}

// ——— Button ——————————————————————————————————————————————————————
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export function buttonStyles(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-white shadow-md shadow-brand-600/20 hover:bg-brand-500 active:bg-brand-700',
    secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white',
    danger: 'bg-rose-600 text-white shadow-md shadow-rose-600/20 hover:bg-rose-500',
    outline: 'border border-brand-200 bg-transparent text-brand-700 hover:bg-brand-50 dark:border-brand-400/30 dark:text-brand-300 dark:hover:bg-brand-500/10',
    subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20',
  }
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
    md: 'h-10 gap-2 rounded-xl px-4 text-sm',
    lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
    icon: 'h-9 w-9 rounded-lg',
  }
  return cn(
    'focus-ring inline-flex select-none items-center justify-center font-semibold transition-all duration-200 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
}

export function Button({ variant = 'primary', size = 'md', className, loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button className={buttonStyles(variant, size, className)} disabled={props.disabled || loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

export function IconButton({ className, children, 'aria-label': ariaLabel, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button aria-label={ariaLabel} className={cn('focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white', className)} {...props}>
      {children}
    </button>
  )
}

// ——— Avatar ——————————————————————————————————————————————————————
const avatarGradients = [
  'from-indigo-500 to-violet-500', 'from-teal-500 to-emerald-500', 'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500', 'from-sky-500 to-blue-600', 'from-fuchsia-500 to-purple-600',
  'from-cyan-500 to-teal-500', 'from-orange-500 to-red-500',
]

export function Avatar({ name, src, size = 'md', className, ring, status }: { name: string; src?: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'; className?: string; ring?: boolean; status?: boolean }) {
  const [failed, setFailed] = useState(false)
  const sizes = { xs: 'h-6 w-6 text-[9px]', sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-12 w-12 text-sm', xl: 'h-16 w-16 text-lg', '2xl': 'h-24 w-24 text-2xl' }
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span className={cn('relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-white', avatarGradients[hash % avatarGradients.length], sizes[size], ring && 'ring-2 ring-white shadow-md dark:ring-ink-900')}>
        {src && !failed ? (
          <img src={src} alt={name} onError={() => setFailed(true)} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span>{initials(name)}</span>
        )}
      </span>
      {status && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-ink-900" />}
    </span>
  )
}

// ——— Form fields ——————————————————————————————————————————————————
export function Field({ label, error, hint, required, children, className }: { label?: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}{required && <span className="text-rose-500"> *</span>}</label>}
      {children}
      {error ? <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400"><AlertTriangle className="h-3 w-3" />{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  )
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => <input ref={ref} className={cn('field', invalid && 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/10', className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => <textarea ref={ref} className={cn('field min-h-[92px] resize-y', invalid && 'border-rose-400', className)} {...props} />,
)
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn('field appearance-none pr-9', className)} {...props}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  ),
)
Select.displayName = 'Select'

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field pl-10 pr-9" />
      {value && (
        <button onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-slate-400">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-slate-200 dark:bg-white/10')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </label>
  )
}

// ——— Layout primitives ——————————————————————————————————————————
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props}>{children}</div>
}

export function SectionCard({ title, subtitle, action, children, className, bodyClassName }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/[0.05]">
        <div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Card>
  )
}

export function PageHeader({ title, subtitle, actions, crumbs, badge }: { title: string; subtitle?: string; actions?: React.ReactNode; crumbs?: string[]; badge?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500" aria-label="Breadcrumb">
          <span className="font-medium text-slate-500 dark:text-slate-400">Workspace</span>
          {(crumbs && crumbs.length ? crumbs : [title]).map((crumb) => (
            <span key={crumb} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" />
              <span className={cn(crumb === (crumbs && crumbs.length ? crumbs[crumbs.length - 1] : title) ? 'text-slate-600 dark:text-slate-300' : '')}>{crumb}</span>
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[26px] font-bold leading-tight sm:text-[28px]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', delta, hint, onClick, index = 0 }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; tone?: Tone; delta?: { value: string; up?: boolean }; hint?: string; onClick?: () => void; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn('card group relative overflow-hidden p-5', onClick && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lift')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="tabular mt-2 text-[27px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">{value}</p>
          {(delta || hint) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {delta && <span className={cn('inline-flex shrink-0 items-center gap-0.5 font-semibold', delta.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>{delta.up ? '↑' : '↓'} {delta.value}</span>}
              {hint && <span className="text-slate-400">{hint}</span>}
            </div>
          )}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105', toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}

export function ProgressBar({ value, tone = 'brand', showLabel = false, className, size = 'md' }: { value: number; tone?: Tone; showLabel?: boolean; className?: string; size?: 'sm' | 'md' }) {
  const bg: Record<string, string> = {
    brand: 'bg-brand-500', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500', blue: 'bg-sky-500', violet: 'bg-violet-500', teal: 'bg-teal-500', slate: 'bg-slate-400', rose: 'bg-rose-500', orange: 'bg-orange-500',
  }
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className={cn('h-full rounded-full', bg[tone] || bg.brand)} />
      </div>
      {showLabel && <span className="tabular w-9 shrink-0 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{Math.round(value)}%</span>}
    </div>
  )
}

export function EmptyState({ icon: Icon = FileText, title, description, action, className }: { icon?: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('relative overflow-hidden rounded-lg bg-slate-100 dark:bg-white/[0.06]', className)}><span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/[0.06]" /></div>
}

// ——— Tabs ————————————————————————————————————————————————————————
export function Tabs<T extends string>({ items, value, onChange, variant = 'underline', className }: { items: { id: T; label: string; count?: number; icon?: React.ComponentType<{ className?: string }> }[]; value: T; onChange: (id: T) => void; variant?: 'underline' | 'pills'; className?: string }) {
  if (variant === 'pills') {
    return (
      <div className={cn('inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]', className)}>
        {items.map((item) => (
          <button key={item.id} onClick={() => onChange(item.id)} className={cn('focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition', value === item.id ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white')}>
            {item.icon && <item.icon className="h-3.5 w-3.5" />}
            {item.label}
            {typeof item.count === 'number' && <span className={cn('rounded-full px-1.5 text-[10px]', value === item.id ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400')}>{item.count}</span>}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-white/[0.07]', className)}>
      {items.map((item) => (
        <button key={item.id} onClick={() => onChange(item.id)} className={cn('focus-ring relative flex shrink-0 items-center gap-1.5 px-3.5 pb-3 pt-2 text-sm font-medium transition-colors', value === item.id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')}>
          {item.icon && <item.icon className="h-4 w-4" />}
          {item.label}
          {typeof item.count === 'number' && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">{item.count}</span>}
          {value === item.id && <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />}
        </button>
      ))}
    </div>
  )
}

export function Pagination({ page, totalPages, total, from, to, onPage, pageSize, onPageSize, label = 'records' }: { page: number; totalPages: number; total: number; from: number; to: number; onPage: (p: number) => void; pageSize?: number; onPageSize?: (n: number) => void; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500 dark:border-white/[0.05] dark:text-slate-400 sm:flex-row">
      <div className="flex items-center gap-3">
        <span>Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{total === 0 ? 0 : from + 1}–{to}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> {label}</span>
        {onPageSize && (
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs outline-none dark:border-white/10 dark:bg-ink-900">
            {[5, 8, 10, 15, 25].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1} className="rounded-lg px-2 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-35 dark:hover:bg-white/10">First</button>
        <IconButton aria-label="Previous page" onClick={() => onPage(page - 1)} disabled={page === 1} className="h-7 w-7 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></IconButton>
        {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
          let p = i + 1
          if (totalPages > 5 && page > 3) p = Math.min(page - 2 + i, totalPages - 4 + i)
          return (
            <button key={i} onClick={() => onPage(p)} className={cn('h-7 min-w-7 rounded-lg px-2 font-semibold transition', page === p ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/10')}>{p}</button>
          )
        })}
        {totalPages > 5 && <span className="px-1">…</span>}
        <IconButton aria-label="Next page" onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="h-7 w-7 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></IconButton>
        <button onClick={() => onPage(totalPages)} disabled={page >= totalPages} className="rounded-lg px-2 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-35 dark:hover:bg-white/10">Last</button>
      </div>
    </div>
  )
}

// ——— Modal & Drawer ——————————————————————————————————————————————
export function Modal({ open, onClose, title, description, children, footer, size = 'md', className }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; className?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', '2xl': 'max-w-6xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-950/55 backdrop-blur-[3px]" />
          <motion.div initial={{ opacity: 0, scale: 0.97, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className={cn('relative my-auto w-full rounded-2xl border border-white/60 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-900', widths[size], className)}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-white/[0.06]">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
              </div>
              <IconButton aria-label="Close dialog" onClick={onClose} className="-mr-1 mt-0.5"><X className="h-4 w-4" /></IconButton>
            </div>
            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Drawer({ open, onClose, title, description, children, footer, width = 'md' }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode; width?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]" />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 320 }} className={cn('fixed inset-y-0 right-0 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-900', widths[width])}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-white/[0.06]">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
              </div>
              <IconButton aria-label="Close panel" onClick={onClose}><X className="h-4 w-4" /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', onConfirm, onClose, loading }: { open: boolean; title: string; description?: string; confirmLabel?: string; cancelLabel?: string; tone?: ButtonVariant; onConfirm: () => void; onClose: () => void; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<><Button variant="secondary" onClick={onClose}>{cancelLabel}</Button><Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button></>}>
      <div className="flex gap-4">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone === 'danger' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400')}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="pt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description || 'Are you sure you want to continue? This action updates the local demo data.'}</p>
      </div>
    </Modal>
  )
}

// ——— Toasts ——————————————————————————————————————————————————————
export function ToastViewport() {
  const { toasts, dismissToast } = useStore()
  const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle }
  const tones = {
    success: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
    error: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400',
    info: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400',
    warning: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
  }
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-6">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24 }} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl dark:border-white/10 dark:bg-ink-800">
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tones[t.type])}><Icon className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.message}</p>
                {t.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t.description}</p>}
              </div>
              <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ——— File upload & document preview —————————————————————————————
export function FileDrop({ onFiles, accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg', label = 'Upload documents', hint = 'PDF, DOCX, PNG or JPG · up to 10 MB', compact }: { onFiles: (docs: DocFile[]) => void; accept?: string; label?: string; hint?: string; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)

  const handle = async (files: FileList | null) => {
    if (!files || !files.length) return
    setBusy(true)
    const docs: DocFile[] = []
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) continue
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.readAsDataURL(file)
      }).catch(() => '')
      docs.push({ id: uid('doc'), name: file.name, type: file.type || 'application/octet-stream', size: file.size, uploadedAt: new Date().toISOString(), status: 'Pending', dataUrl })
    }
    setBusy(false)
    if (docs.length) onFiles(docs)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); void handle(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition',
        compact ? 'px-4 py-4' : 'px-6 py-8',
        drag ? 'border-brand-400 bg-brand-50/70 dark:bg-brand-500/10' : 'border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-brand-500/40 dark:hover:bg-brand-500/[0.06]',
      )}
    >
      <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={(e) => { void handle(e.target.files); e.target.value = '' }} />
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-500 shadow-sm ring-1 ring-slate-200/70 transition group-hover:scale-105 dark:bg-white/10 dark:ring-white/10">
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-brand-500" /> : <UploadCloud className="h-4 w-4 text-brand-500" />}
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
    </div>
  )
}

export function DocumentPreview({ doc, onClose }: { doc: DocFile | null; onClose: () => void }) {
  if (!doc) return null
  const isImage = doc.type.startsWith('image/')
  const isPdf = doc.type.includes('pdf')
  return (
    <Modal open={!!doc} onClose={onClose} title={doc.name} description={`${doc.status} · uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}`} size="xl">
      {doc.dataUrl && isImage ? (
        <img src={doc.dataUrl} alt={doc.name} className="mx-auto max-h-[65vh] rounded-xl object-contain" />
      ) : doc.dataUrl && isPdf ? (
        <iframe title={doc.name} src={doc.dataUrl} className="h-[65vh] w-full rounded-xl border border-slate-200 dark:border-white/10" />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10"><FileText className="h-7 w-7" /></div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{doc.name}</p>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">Demo document — binary previews are available for files uploaded in this session. Upload a new PDF or image to preview it locally.</p>
        </div>
      )}
    </Modal>
  )
}

export function DocumentRow({ doc, onPreview, onVerify, onRemove }: { doc: DocFile; onPreview: () => void; onVerify?: () => void; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50/70 dark:border-white/[0.06] dark:hover:border-white/10 dark:hover:bg-white/[0.02]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><FileText className="h-4 w-4" /></div>
      <button onClick={onPreview} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-300">{doc.name}</p>
        <p className="text-[11px] text-slate-400">{Math.round(doc.size / 1024)} KB · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
      </button>
      <StatusBadge status={doc.status} />
      {onVerify && doc.status !== 'Verified' && <button onClick={onVerify} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">Verify</button>}
      {onRemove && <button onClick={onRemove} aria-label="Remove document" className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"><X className="h-3.5 w-3.5" /></button>}
    </div>
  )
}

export function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{value || '—'}</dd>
    </div>
  )
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">{children}</kbd>
}
