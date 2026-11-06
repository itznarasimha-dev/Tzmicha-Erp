import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Download, Info, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import { downloadCsv, type CsvColumn } from '../../utils/csv'
import type { WorkspaceTask } from '../../types/workspace'

export interface KpiDetail {
  label: string
  value: string
  previous: string
  change: string
  description: string
  points: string[]
}

export function KpiDetailModal({
  detail,
  onClose,
}: {
  detail: KpiDetail | null
  onClose: () => void
}) {
  return (
    <Modal
      open={Boolean(detail)}
      onClose={onClose}
      title={detail?.label ?? 'Indicator detail'}
      description="A local demonstration metric. Figures are illustrative and not connected to a live backend."
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {detail ? (
        <div className="ws-kpi-detail">
          <div className="ws-kpi-detail__hero">
            <span>Current</span>
            <strong>{detail.value}</strong>
            <small>{detail.change} vs previous month</small>
          </div>
          <div className="ws-kpi-detail__compare">
            <div><span>Previous month</span><strong>{detail.previous}</strong></div>
            <div><span>Trend</span><strong>{detail.change}</strong></div>
          </div>
          <p className="text-sm muted">{detail.description}</p>
          <ul className="ws-detail-list">
            {detail.points.map((point) => (
              <li key={point}><Info size={13} /> {point}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Modal>
  )
}

export function FilterTabs({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: string; label: string; count?: number }>
  value: string
  onChange: (id: string) => void
  ariaLabel: string
}) {
  const reduced = useReducedMotion()
  return (
    <div className="ws-filter-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`ws-filter-tab ${active ? 'is-active' : ''}`.trim()}
            onClick={() => onChange(option.id)}
          >
            {active ? (
              <motion.span
                layoutId={`ws-filter-pill-${ariaLabel.replace(/\s+/g, '-')}`}
                className="ws-filter-tab__pill"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span>{option.label}</span>
            {option.count !== undefined ? <em>{option.count}</em> : null}
          </button>
        )
      })}
    </div>
  )
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="ws-filter-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

export function EmptyInline({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ws-empty-inline">
      <p>{children}</p>
      {action}
    </div>
  )
}

export function taskStats(tasks: WorkspaceTask[]) {
  const completed = tasks.filter((task) => task.status === 'Completed').length
  const pending = tasks.filter((task) => task.status !== 'Completed').length
  const inProgress = tasks.filter((task) => task.status === 'In Progress').length
  const review = tasks.filter((task) => task.status === 'Under Review').length
  const blocked = tasks.filter((task) => task.status === 'Blocked' || task.status === 'Overdue').length
  const overdue = tasks.filter((task) => task.status === 'Overdue').length
  return {
    total: tasks.length,
    completed,
    pending,
    inProgress,
    review,
    blocked,
    overdue,
    completion: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  }
}

export function useCsvExport() {
  const { pushToast } = useToast()
  return function exportCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
    const result = downloadCsv(filename, columns, rows)
    pushToast({
      title: result.ok ? 'Demo report exported' : 'Export unavailable',
      description: result.ok ? `${result.message} The file is generated locally from demonstration data.` : result.message,
      tone: result.ok ? 'success' : 'warning',
    })
  }
}

export function ExportButton({
  onClick,
  label = 'Export CSV',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={onClick}>
      {label}
    </Button>
  )
}

export function CloseIcon() {
  return <X size={15} aria-hidden="true" />
}
