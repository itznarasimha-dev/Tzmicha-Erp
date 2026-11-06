import type { CSSProperties, ReactNode } from 'react'

interface SectionCardProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  noBodyPadding?: boolean
  id?: string
  style?: CSSProperties
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  bodyClassName = '',
  noBodyPadding = false,
  id,
  style,
}: SectionCardProps) {
  return (
    <section className={`card ${className}`.trim()} id={id} style={style}>
      {title ? (
        <div className="card-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="card-title">{title}</h2>
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="row-8 no-shrink">{actions}</div> : null}
        </div>
      ) : null}
      <div className={noBodyPadding ? bodyClassName : `card-body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  )
}
