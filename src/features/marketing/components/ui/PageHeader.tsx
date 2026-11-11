import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, actions, meta }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        {eyebrow ? (
          <div className="page-header__eyebrow">
            <span className="dot" aria-hidden="true" />
            {eyebrow}
          </div>
        ) : null}
        <h1>{title}</h1>
        {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
        {meta ? <div className="page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}
