import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        {icon ?? <Inbox size={22} />}
      </span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  )
}
