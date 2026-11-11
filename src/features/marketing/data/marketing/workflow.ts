export type WorkflowStatus = 'Not Started' | 'In Progress' | 'Pending Approval' | 'Completed'

export interface WorkflowStage {
  id: string
  label: string
  description: string
  status: WorkflowStatus
  metric: string
  /** Optional data-derived completion, falling back to the status default. */
  progress?: number
  href: string
  tone: string
}

/**
 * Illustrative workflow defaults. The dashboard replaces the metrics and
 * statuses with values calculated from the current browser demo data.
 */
export const DEMO_WORKFLOW: WorkflowStage[] = [
  {
    id: 'plan',
    label: 'Plan & Budget',
    description: 'Define goals and allocate the annual, quarterly and campaign budget.',
    status: 'Completed',
    metric: 'FY 2026–27 plan active',
    progress: 100,
    href: '/marketing/plans/annual-plans',
    tone: 'indigo',
  },
  {
    id: 'approval',
    label: 'Approvals & Contracts',
    description: 'Track campaign, budget and offer requests in the marketing approval queue.',
    status: 'Pending Approval',
    metric: 'Review pending requests',
    progress: 42,
    href: '/marketing/approvals/pending-approvals',
    tone: 'amber',
  },
  {
    id: 'execute',
    label: 'Campaign Execution',
    description: 'Launch and run paid, social, field, trade and creator activities.',
    status: 'In Progress',
    metric: 'Campaigns in delivery',
    progress: 64,
    href: '/marketing/digital/campaigns',
    tone: 'teal',
  },
  {
    id: 'expenses',
    label: 'Expense Tracking',
    description: 'Record campaign spend, submit claims and track payment status.',
    status: 'In Progress',
    metric: 'Expenses recorded locally',
    progress: 56,
    href: '/marketing/expenses/campaign-expenses',
    tone: 'violet',
  },
  {
    id: 'leads',
    label: 'Lead Generation',
    description: 'Capture enquiries from digital, field, retail and partner channels.',
    status: 'In Progress',
    metric: 'Leads captured in the workspace',
    progress: 72,
    href: '/marketing/leads/campaign-leads',
    tone: 'rose',
  },
  {
    id: 'qualification',
    label: 'Lead Qualification',
    description: 'Review, score and qualify leads before they enter the sales pipeline.',
    status: 'In Progress',
    metric: 'Leads qualified for sales',
    progress: 48,
    href: '/marketing/leads/lead-tracking',
    tone: 'blue',
  },
  {
    id: 'convert',
    label: 'Customer Conversion',
    description: 'Convert qualified leads into customers and linked opportunities.',
    status: 'In Progress',
    metric: 'Customers converted',
    progress: 38,
    href: '/marketing/leads/campaign-to-sales',
    tone: 'amber',
  },
  {
    id: 'assign',
    label: 'Sales Representative Assignment',
    description: 'Assign every converted customer and opportunity to a sales representative.',
    status: 'In Progress',
    metric: 'Accounts with a sales representative',
    progress: 88,
    href: '/marketing/leads/sales-opportunities',
    tone: 'indigo',
  },
  {
    id: 'roi',
    label: 'ROI Analysis',
    description: 'Measure attribution, acquisition cost, pipeline and campaign ROI.',
    status: 'Not Started',
    metric: 'Review attributed revenue and spend',
    progress: 22,
    href: '/marketing/leads/roi-analysis',
    tone: 'slate',
  },
]
