import { useEffect, useMemo, useState } from 'react'
import { ReceiptText } from 'lucide-react'
import type { ExpenseCategory } from '../../types/marketing'
import type {
  MarketingExpenseDraft,
  MarketingExpenseRequest,
  MonthlyPlan,
  WorkflowConfig,
} from '../../types/workflow'
import { formatINR } from '../../utils/format'
import { workflowToday } from '../../data/marketing/roleWorkflow'
import { Button } from '../ui/Button'
import { Field, FormSection } from '../ui/Form'
import { Modal } from '../ui/Modal'

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Advertising',
  'Content Production',
  'Events',
  'Field Marketing',
  'Printing',
  'Influencer Fees',
  'Travel',
  'Other',
]

interface ExpenseFormModalProps {
  open: boolean
  expense?: MarketingExpenseRequest | null
  plans: MonthlyPlan[]
  config: WorkflowConfig
  onClose: () => void
  onSave: (draft: MarketingExpenseDraft) => boolean
}

interface FormState {
  title: string
  planId: string
  activityId: string
  category: ExpenseCategory
  amount: string
  expenseDate: string
  description: string
  documentName: string
}

function fromExpense(
  expense: MarketingExpenseRequest | null | undefined,
  plans: MonthlyPlan[],
): FormState {
  const planId = expense?.planId ?? plans[0]?.id ?? ''
  return {
    title: expense?.title ?? '',
    planId,
    activityId: expense?.activityId ?? '',
    category: expense?.category ?? 'Advertising',
    amount: expense ? String(expense.amount) : '',
    expenseDate: expense?.expenseDate ?? workflowToday(),
    description: expense?.description ?? '',
    documentName: expense?.documentName ?? '',
  }
}

const toNumber = (value: string): number => Math.max(0, Math.round(Number(value) || 0))

export function ExpenseFormModal({
  open,
  expense,
  plans,
  config,
  onClose,
  onSave,
}: ExpenseFormModalProps) {
  const [form, setForm] = useState<FormState>(() => fromExpense(expense, plans))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(fromExpense(expense, plans))
    setError('')
  }, [open, expense, plans])

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === form.planId) ?? null,
    [plans, form.planId],
  )

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const changePlan = (planId: string) => {
    setForm((current) => ({ ...current, planId, activityId: '' }))
  }

  const amount = toNumber(form.amount)
  const managerRequired = amount >= config.expenseManagerThreshold

  const submit = () => {
    if (!form.title.trim()) return setError('Add a clear expense title.')
    if (!form.planId) return setError('Select the monthly plan this expense belongs to.')
    if (amount <= 0) return setError('Enter an expense amount greater than zero.')
    if (!form.description.trim()) return setError('Describe what the expense was for.')

    const draft: MarketingExpenseDraft = {
      title: form.title.trim(),
      planId: form.planId,
      activityId: form.activityId || null,
      category: form.category,
      amount,
      expenseDate: form.expenseDate,
      description: form.description.trim(),
      documentName: form.documentName.trim(),
    }
    if (onSave(draft)) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wide"
      title={expense ? 'Edit monthly expense' : 'Raise monthly expense'}
      description="Every expense is linked to an approved or in-flight monthly plan. Plan approval does not approve expenses."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<ReceiptText size={14} />} onClick={submit}>
            {expense ? 'Save expense' : 'Save expense draft'}
          </Button>
        </>
      }
    >
      <div className="wf-form">
        {error ? <div className="callout callout--warning" role="alert">{error}</div> : null}
        <FormSection title="Expense details" />
        <div className="wf-form__grid">
          <Field label="Expense title" htmlFor="wf-expense-title" required className="wf-form__span-2">
            <input
              id="wf-expense-title"
              className="input"
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="e.g. Festive paid social boost"
            />
          </Field>
          <Field label="Monthly plan" htmlFor="wf-expense-plan" required>
            <select
              id="wf-expense-plan"
              className="select"
              value={form.planId}
              onChange={(event) => changePlan(event.target.value)}
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Plan activity" htmlFor="wf-expense-activity">
            <select
              id="wf-expense-activity"
              className="select"
              value={form.activityId}
              onChange={(event) => set('activityId', event.target.value)}
              disabled={!selectedPlan}
            >
              <option value="">Plan-level expense</option>
              {selectedPlan?.activities.map((activity) => (
                <option key={activity.id} value={activity.id}>{activity.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Category" htmlFor="wf-expense-category">
            <select
              id="wf-expense-category"
              className="select"
              value={form.category}
              onChange={(event) => set('category', event.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </Field>
          <Field label="Amount" htmlFor="wf-expense-amount" required>
            <input
              id="wf-expense-amount"
              className="input"
              type="number"
              min={0}
              value={form.amount}
              onChange={(event) => set('amount', event.target.value)}
            />
          </Field>
          <Field label="Expense date" htmlFor="wf-expense-date">
            <input
              id="wf-expense-date"
              className="input"
              type="date"
              value={form.expenseDate}
              onChange={(event) => set('expenseDate', event.target.value)}
            />
          </Field>
          <Field label="Supporting document name" htmlFor="wf-expense-document" hint="Demo label only — no file is uploaded.">
            <input
              id="wf-expense-document"
              className="input"
              value={form.documentName}
              onChange={(event) => set('documentName', event.target.value)}
              placeholder="invoice-or-receipt.pdf"
            />
          </Field>
          <Field label="Description" htmlFor="wf-expense-description" required className="wf-form__span-2">
            <textarea
              id="wf-expense-description"
              className="textarea"
              rows={3}
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              placeholder="What was purchased and how it supports the plan"
            />
          </Field>
        </div>

        <div className={`callout ${managerRequired ? 'callout--warning' : 'callout--info'}`}>
          <span>
            {managerRequired
              ? `At ${formatINR(amount || 0)}, this expense needs Manager review before Admin financial authorization because it meets the ${formatINR(config.expenseManagerThreshold)} threshold.`
              : `Expenses below ${formatINR(config.expenseManagerThreshold)} route directly to the existing Admin Dashboard for financial authorization. No expense is approved by the plan approval.`}
          </span>
        </div>
      </div>
    </Modal>
  )
}
