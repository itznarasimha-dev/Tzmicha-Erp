import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Info, LockKeyhole, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useDemoRole } from '../../context/DemoRoleContext'
import { HR_NAVIGATION, hrPermissionSummary, HR_ROLE_NOTES } from '../../config/hrNavigation'
import type { DemoRoleId } from '../../types/workflow'
import type { HREmployee } from '../../types/hr'
import type { BadgeTone } from '../../components/ui/Badge'
import { hrStatusTone, initials } from '../../utils/hr'

export function HRPageShell({
  section,
  title,
  subtitle,
  eyebrow = 'HR Management',
  actions,
  meta,
  children,
}: {
  section: string
  title: ReactNode
  subtitle: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  children: ReactNode
}) {
  const { roleId, profile } = useDemoRole()
  const permissions = hrPermissionSummary(roleId)
  const navItem = HR_NAVIGATION.find((item) => item.id === section)
  const reduced = useReducedMotion()
  const PermissionIcon = permissions.badge.icon

  return (
    <div className="ws-shell hr-shell">
      <div className="ws-role-strip hr-role-strip">
        <span className="ws-role-strip__dot" style={{ background: 'var(--chart-2)' }} aria-hidden="true" />
        <span className="ws-role-strip__label">HR Management workspace</span>
        <span className="ws-role-strip__divider" aria-hidden="true" />
        <span className="ws-role-strip__scope">
          {profile.name} · {HR_ROLE_NOTES[roleId] ?? profile.roleLabel}
        </span>
        <span className="ws-role-strip__demo">Preview role · local demo only</span>
      </div>

      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={actions}
        meta={
          <>
            <span className={`hr-permission-pill hr-permission-pill--${permissions.badge.tone}`}>
              <PermissionIcon size={13} aria-hidden="true" />
              {permissions.badge.label}
            </span>
            {meta}
          </>
        }
      />

      <div className="hr-context-bar">
        <span className="hr-context-bar__module">
          <span className="hr-context-bar__dot" aria-hidden="true" />
          {navItem?.label ?? section}
        </span>
        <span className="hr-context-bar__description">{navItem?.description}</span>
        <Link to="/hr/dashboard" className="hr-context-bar__link">
          HR home
        </Link>
      </div>

      <motion.div
        key={section}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0.65, 0.35, 1] }}
        className="ws-content hr-content"
      >
        {children}
      </motion.div>
    </div>
  )
}

export function HRPermissionNote({
  roleId,
  children,
}: {
  roleId: DemoRoleId
  children: ReactNode
}) {
  const manager = roleId === 'manager'
  const senior = roleId === 'senior'
  const Icon = manager ? ShieldCheck : senior ? Users : LockKeyhole
  return (
    <div className={`hr-permission-note hr-permission-note--${manager ? 'manager' : senior ? 'senior' : 'junior'}`}>
      <Icon size={15} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function HRInfoNote({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' }) {
  return (
    <div className={`hr-info-note hr-info-note--${tone}`}>
      <Info size={14} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function HRDemoFooter({ children }: { children?: ReactNode }) {
  return (
    <div className="ws-demo-footer">
      <Sparkles size={13} aria-hidden="true" />
      <span>
        {children ??
          'HR records are seeded from the existing ERP employee roster and stored in this browser. No external HR service, payment processor or notification provider is connected.'}
      </span>
    </div>
  )
}

export function HRAvatar({
  employee,
  size = 'md',
}: {
  employee: Pick<HREmployee, 'name' | 'department'> & { status?: string }
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const toneIndex = employee.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6
  return (
    <span
      className={`hr-avatar hr-avatar--${size}`}
      style={{ '--hr-avatar-tone': `var(--chart-${toneIndex + 1})` } as CSSProperties}
      aria-hidden="true"
    >
      {initials(employee.name)}
    </span>
  )
}

export function HRPersonCell({ employee, detail }: { employee: HREmployee; detail?: string }) {
  return (
    <span className="hr-person-cell">
      <HRAvatar employee={employee} size="sm" />
      <span className="hr-person-cell__text">
        <strong>{employee.name}</strong>
        <small>{detail ?? `${employee.designation} · ${employee.department}`}</small>
      </span>
    </span>
  )
}

export function HRStatusBadge({ status, tone }: { status: string; tone?: BadgeTone }) {
  return <Badge tone={tone ?? hrStatusTone(status)}>{status}</Badge>
}

export function HRSummaryGrid({ children }: { children: ReactNode }) {
  return <div className="hr-summary-grid">{children}</div>
}

export function HRSummaryTile({
  label,
  value,
  hint,
  icon,
  tone = 'var(--chart-1)',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: string
}) {
  return (
    <div className="hr-summary-tile" style={{ '--hr-tile-tone': tone } as CSSProperties}>
      {icon ? <span className="hr-summary-tile__icon">{icon}</span> : null}
      <span className="hr-summary-tile__text">
        <small>{label}</small>
        <strong>{value}</strong>
        {hint ? <em>{hint}</em> : null}
      </span>
    </div>
  )
}

export function HRListEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="hr-empty">
      <span className="hr-empty__icon">
        <Info size={20} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function useInitialLoading(delay = 380): boolean {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delay)
    return () => window.clearTimeout(timer)
  }, [delay])
  return loading
}

export function HRPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="hr-skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton--line" style={{ width: '38%' }} />
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="skeleton skeleton--line"
          style={{ width: `${92 - index * 5}%` }}
        />
      ))}
    </div>
  )
}

export function HRFilterSelect({
  label,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  ariaLabel?: string
}) {
  return (
    <label className="ws-filter-select hr-filter-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel ?? label}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function HRInlineMeta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="hr-inline-meta">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}

export function HRProgress({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'success' | 'warning' | 'danger' }) {
  return (
    <div className="hr-progress" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span className={`hr-progress__bar hr-progress__bar--${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function HRDateChip({ label, date }: { label: string; date: string }) {
  return (
    <span className="hr-date-chip">
      <small>{label}</small>
      <strong>{date}</strong>
    </span>
  )
}

export function HRToolbarButton({
  onClick,
  children,
  icon,
}: {
  onClick: () => void
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <Button variant="ghost" size="sm" icon={icon} onClick={onClick}>
      {children}
    </Button>
  )
}
