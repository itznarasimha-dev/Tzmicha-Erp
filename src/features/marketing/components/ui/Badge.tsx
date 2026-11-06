import type { ReactNode } from 'react'
import { statusTone } from '../../utils/analytics'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  dot?: boolean
  className?: string
}

export function Badge({ children, tone = 'neutral', dot = true, className = '' }: BadgeProps) {
  return (
    <span className={`badge badge--${tone} ${dot ? '' : 'badge--no-dot'} ${className}`.trim()}>
      {children}
    </span>
  )
}

export function StatusBadge({
  status,
  dot = true,
  className = '',
}: {
  status: string
  dot?: boolean
  className?: string
}) {
  const label = status === 'Pending' ? 'Pending Approval' : status === 'Follow-up Required' ? 'Follow-up' : status
  return (
    <Badge tone={statusTone(status)} dot={dot} className={className}>
      {label}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: 'Urgent' | 'High' | 'Medium' | 'Low' }) {
  return <span className={`priority priority--${priority.toLowerCase()}`}>{priority}</span>
}
