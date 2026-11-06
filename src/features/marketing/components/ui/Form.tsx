import type { ReactNode } from 'react'

interface FieldProps {
  label?: ReactNode
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, required, error, hint, children, className = '' }: FieldProps) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label htmlFor={htmlFor}>
          {label}
          {required ? <span className="req" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  )
}

export function FormSection({ title }: { title: string }) {
  return <p className="form-section-title">{title}</p>
}
