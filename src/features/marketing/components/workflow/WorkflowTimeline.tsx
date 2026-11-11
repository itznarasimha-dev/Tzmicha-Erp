import { AlertTriangle, Check, Clock3, Minus, X } from 'lucide-react'
import type { PlanStageView } from '../../utils/workflow'

const stateLabel: Record<PlanStageView['state'], string> = {
  done: 'Done',
  active: 'In progress',
  skipped: 'Not required',
  upcoming: 'Upcoming',
  changes: 'Changes requested',
  rejected: 'Rejected',
}

export function WorkflowTimeline({
  stages,
  compact = false,
  label = 'Approval workflow',
}: {
  stages: PlanStageView[]
  compact?: boolean
  label?: string
}) {
  return (
    <ol className={`wf-timeline ${compact ? 'wf-timeline--compact' : ''}`.trim()} aria-label={label}>
      {stages.map((stage, index) => (
        <li
          key={stage.key}
          className={`wf-timeline__step wf-timeline__step--${stage.state}`}
          aria-current={stage.state === 'active' ? 'step' : undefined}
        >
          <span className="wf-timeline__rail" aria-hidden="true" />
          <span className="wf-timeline__marker" aria-hidden="true">
            {stage.state === 'done' ? (
              <Check size={12} strokeWidth={3} />
            ) : stage.state === 'active' ? (
              <Clock3 size={12} />
            ) : stage.state === 'changes' ? (
              <AlertTriangle size={12} />
            ) : stage.state === 'rejected' ? (
              <X size={12} />
            ) : (
              <Minus size={11} />
            )}
          </span>
          <span className="wf-timeline__body">
            <span className="wf-timeline__label">
              {stage.label}
              <span className="wf-timeline__state">{stateLabel[stage.state]}</span>
            </span>
            <span className="wf-timeline__detail">{stage.detail}</span>
          </span>
          {!compact ? <span className="wf-timeline__index">{String(index + 1).padStart(2, '0')}</span> : null}
        </li>
      ))}
    </ol>
  )
}
