import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  ChevronRight,
  CircleDashed,
  ClipboardList,
  Megaphone,
  Play,
  ReceiptText,
  Target,
  TrendingUp,
  UserCheck,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import type { WorkflowStage, WorkflowStatus } from '../../data/marketing/workflow'

const toneMap: Record<string, string> = {
  indigo: 'var(--chart-1)',
  amber: 'var(--chart-3)',
  teal: 'var(--chart-2)',
  blue: 'var(--chart-5)',
  violet: 'var(--chart-6)',
  rose: 'var(--chart-4)',
  slate: 'var(--chart-8)',
}

const statusClass: Record<WorkflowStatus, string> = {
  Completed: 'workflow-stage__status--completed',
  'In Progress': 'workflow-stage__status--inprogress',
  'Pending Approval': 'workflow-stage__status--pending',
  'Not Started': 'workflow-stage__status--notstarted',
}

const progressMap: Record<WorkflowStatus, number> = {
  Completed: 100,
  'In Progress': 64,
  'Pending Approval': 42,
  'Not Started': 8,
}

const stageIcons: Record<string, LucideIcon> = {
  plan: ClipboardList,
  approval: BadgeCheck,
  execute: Play,
  expenses: ReceiptText,
  leads: Users,
  qualification: UserCheck,
  convert: Target,
  assign: UserRoundCheck,
  roi: TrendingUp,
  create: Megaphone,
}

export function WorkflowStrip({ stages }: { stages: WorkflowStage[] }) {
  const navigate = useNavigate()
  return (
    <div className="workflow" role="list" aria-label="Marketing workflow stages">
      {stages.map((stage, index) => {
        const Icon = stageIcons[stage.id] ?? CircleDashed
        const progress =
          typeof stage.progress === 'number'
            ? Math.max(0, Math.min(100, Math.round(stage.progress)))
            : progressMap[stage.status]
        return (
          <div className="workflow-item" role="listitem" key={stage.id}>
            <button
              type="button"
              className={`workflow-stage workflow-stage--${stage.status.toLowerCase().replace(/\s+/g, '-')}`}
              style={{ '--stage-tone': toneMap[stage.tone] ?? 'var(--brand)' } as CSSProperties}
              onClick={() => navigate(stage.href)}
              aria-label={`${stage.label}, ${stage.status}. ${stage.description}. ${stage.metric}. Open section.`}
            >
              <span className="workflow-stage__head">
                <span className="workflow-stage__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="workflow-stage__icon" aria-hidden="true">
                  <Icon size={14} strokeWidth={1.9} />
                </span>
              </span>
              <span className="workflow-stage__label">{stage.label}</span>
              <span className="workflow-stage__metric">{stage.metric}</span>
              <span className="workflow-stage__progress" aria-hidden="true">
                <span className="workflow-stage__progress-fill" style={{ width: `${progress}%` }} />
              </span>
              <span className="workflow-stage__foot">
                <span className={`workflow-stage__status ${statusClass[stage.status]}`}>
                  {stage.status}
                </span>
                <span className="workflow-stage__pct">{progress}%</span>
              </span>
            </button>
            {index < stages.length - 1 ? (
              <span className="workflow-connector" aria-hidden="true">
                <ChevronRight size={13} />
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function WorkflowLegend() {
  return (
    <div className="tools workflow-legend">
      {[
        ['Completed', 'var(--success)'],
        ['In Progress', 'var(--info)'],
        ['Pending Approval', 'var(--warning)'],
        ['Not Started', 'var(--faint)'],
      ].map(([label, color]) => (
        <span key={label} className="chart-legend__item">
          <span className="chart-legend__dot" style={{ background: color }} />
          {label}
        </span>
      ))}
      <span className="chart-legend__item">
        <CircleDashed size={11} />
        Illustrative demo state
      </span>
    </div>
  )
}
