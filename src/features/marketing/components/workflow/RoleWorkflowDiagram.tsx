import { ArrowRight, CalendarRange, ReceiptText, ShieldCheck } from 'lucide-react'
import type { DemoRoleId, WorkflowConfig } from '../../types/workflow'
import { formatINR } from '../../utils/format'

interface DiagramStep {
  label: string
  detail: string
  role: string
  condition?: string
}

const roleOrder: Array<{ id: DemoRoleId; label: string }> = [
  { id: 'junior', label: 'Junior' },
  { id: 'senior', label: 'Senior' },
  { id: 'manager', label: 'Manager' },
]

export function RoleWorkflowDiagram({
  config,
  roleId,
}: {
  config: WorkflowConfig
  roleId: DemoRoleId
}) {
  const planSteps: DiagramStep[] = [
    { label: 'Draft', detail: 'Owner prepares the monthly plan', role: 'Junior / Senior' },
    {
      label: 'Senior review',
      detail: 'Assigned senior reviews and forwards',
      role: 'Senior',
      condition: 'if assigned',
    },
    { label: 'Manager approval', detail: 'Marketing Manager approves the plan', role: 'Manager' },
    {
      label: 'Admin financial authorization',
      detail: `Required at ${formatINR(config.financeThreshold)} or above`,
      role: 'Existing Admin Dashboard',
      condition: 'budget gate',
    },
    { label: 'Execution', detail: 'Owner starts and updates activity', role: 'Junior / Senior' },
    { label: 'Results review', detail: 'Manager reviews monthly outcomes', role: 'Manager' },
    { label: 'Completed', detail: 'Plan closes with reviewed results', role: 'Manager' },
  ]

  const expenseSteps: DiagramStep[] = [
    { label: 'Draft', detail: 'Owner links the expense to a plan', role: 'Junior / Senior' },
    {
      label: 'Manager review',
      detail: `Required at ${formatINR(config.expenseManagerThreshold)} or above`,
      role: 'Manager',
      condition: 'amount gate',
    },
    { label: 'Admin financial authorization', detail: 'The existing Admin Dashboard authorizes or rejects the expense', role: 'Existing Admin Dashboard' },
    { label: 'Approved', detail: 'Plan approval does not approve expenses', role: 'Admin status only' },
  ]

  return (
    <div className="wf-diagram">
      <div className="wf-diagram__head">
        <div>
          <h3>
            <CalendarRange size={15} /> Monthly plan workflow
          </h3>
          <p>Each stage must be completed in order. A revision restarts the approval chain.</p>
        </div>
        <span className="badge badge--neutral badge--no-dot">No stage skipping</span>
      </div>

      <ol className="wf-diagram__flow" aria-label="Monthly plan approval flow">
        {planSteps.map((step, index) => (
          <li key={step.label} className="wf-diagram__node">
            <span className="wf-diagram__step">
              <span className="wf-diagram__index">{index + 1}</span>
              <span className="wf-diagram__label">{step.label}</span>
              <span className="wf-diagram__detail">{step.detail}</span>
              <span className="wf-diagram__role">{step.role}</span>
              {step.condition ? <span className="wf-diagram__condition">{step.condition}</span> : null}
            </span>
            {index < planSteps.length - 1 ? (
              <ArrowRight size={14} className="wf-diagram__arrow" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="wf-diagram__expense">
        <div className="wf-diagram__expense-head">
          <h4>
            <ReceiptText size={14} /> Expense workflow
          </h4>
          <span>Separate from plan approval</span>
        </div>
        <ol className="wf-diagram__flow wf-diagram__flow--expense" aria-label="Expense approval flow">
          {expenseSteps.map((step, index) => (
            <li key={step.label} className="wf-diagram__node">
              <span className="wf-diagram__step">
                <span className="wf-diagram__label">{step.label}</span>
                <span className="wf-diagram__detail">{step.detail}</span>
                <span className="wf-diagram__role">{step.role}</span>
                {step.condition ? <span className="wf-diagram__condition">{step.condition}</span> : null}
              </span>
              {index < expenseSteps.length - 1 ? (
                <ArrowRight size={14} className="wf-diagram__arrow" aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="wf-diagram__roles" aria-label="Preview role scopes">
        <span className="wf-diagram__roles-label">
          <ShieldCheck size={13} /> Preview role
        </span>
        {roleOrder.map((role) => (
          <span
            key={role.id}
            className={`wf-role-chip ${role.id === roleId ? 'is-active' : ''}`.trim()}
          >
            {role.label}
          </span>
        ))}
      </div>
    </div>
  )
}
