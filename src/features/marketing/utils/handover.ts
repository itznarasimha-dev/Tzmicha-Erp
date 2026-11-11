import type {
  Campaign,
  CustomerCommunicationStatus,
  HandoverHistoryEvent,
  Lead,
  LeadSalesAssignment,
  SalesHandoffStatus,
  SalesRepresentative,
} from '../types/marketing'
import { formatDate, formatDateTime } from './format'

export const DEFAULT_FIRST_CONTACT_HOURS = 24
export const STALLED_AFTER_DAYS = 7

export interface HandoverRequirement {
  label: string
  value: string
  present: boolean
  hint: string
}

export interface HandoverReadiness {
  ready: boolean
  complete: number
  total: number
  items: HandoverRequirement[]
  missing: HandoverRequirement[]
}

export function activeSalesEmployees(reps: SalesRepresentative[]): SalesRepresentative[] {
  return reps.filter((rep) => rep.active && rep.role !== 'Sales Manager')
}

export function activeSalesManagers(reps: SalesRepresentative[]): SalesRepresentative[] {
  return reps.filter((rep) => rep.active && rep.role === 'Sales Manager')
}

export function managerForSalesRep(
  rep: SalesRepresentative | undefined,
  reps: SalesRepresentative[],
): SalesRepresentative | undefined {
  if (!rep) return undefined
  return reps.find((item) => item.id === rep.managerId && item.role === 'Sales Manager')
}

export function salesDesignation(rep: SalesRepresentative | null | undefined): string {
  if (!rep) return 'Sales team'
  return rep.designation || rep.role
}

/** Only approved business contact information is used in customer previews. */
export function businessPhone(rep: SalesRepresentative | null | undefined): string {
  if (!rep) return 'Not recorded'
  return rep.businessPhone || rep.phone || 'Not recorded'
}

export function businessEmail(rep: SalesRepresentative | null | undefined): string {
  if (!rep) return 'Not recorded'
  return rep.businessEmail || rep.email || 'Not recorded'
}

export function salesRepName(reps: SalesRepresentative[], id: string | null | undefined): string {
  if (!id) return 'Not assigned'
  return reps.find((rep) => rep.id === id)?.name ?? 'Employee unavailable'
}

export function salesRepById(
  reps: SalesRepresentative[],
  id: string | null | undefined,
): SalesRepresentative | null {
  if (!id) return null
  return reps.find((rep) => rep.id === id) ?? null
}

/** Requirement and customer details that must be present before handover. */
export function handoverReadiness(lead: Lead): HandoverReadiness {
  const requirements = [
    lead.qualification?.mainRequirement,
    lead.interests?.summary,
    lead.interests?.requirements?.join(' '),
  ].filter(Boolean).join(' ').trim()
  const products = lead.interests?.products?.length ? lead.interests.products.join(', ') : lead.product

  const items: HandoverRequirement[] = [
    {
      label: 'Customer name',
      value: lead.name,
      present: Boolean(lead.name?.trim()),
      hint: 'A named customer is required for the handover record.',
    },
    {
      label: 'Phone number',
      value: lead.phone,
      present: Boolean(lead.phone?.trim()),
      hint: 'The Sales employee needs a phone number to contact the customer.',
    },
    {
      label: 'Email address',
      value: lead.email,
      present: Boolean(lead.email?.trim()),
      hint: 'The customer email is used for the email preview and Sales follow-up.',
    },
    {
      label: 'Product or service',
      value: products,
      present: Boolean(products?.trim()),
      hint: 'Record the product or service the customer is interested in.',
    },
    {
      label: 'Customer requirements',
      value: requirements || lead.notes,
      present: Boolean(requirements || lead.notes?.trim()),
      hint: 'Record what the customer needs so Sales can continue the conversation.',
    },
    {
      label: 'Lead source',
      value: lead.source,
      present: Boolean(lead.source?.trim()),
      hint: 'Source attribution must be preserved after handover.',
    },
    {
      label: 'Marketing employee',
      value: lead.generatedBy || lead.assignedTo,
      present: Boolean((lead.generatedBy || lead.assignedTo)?.trim()),
      hint: 'The marketing owner is preserved on the shared handover record.',
    },
  ]

  const missing = items.filter((item) => !item.present)
  return {
    ready: missing.length === 0,
    complete: items.length - missing.length,
    total: items.length,
    items,
    missing,
  }
}

/** Local datetime value for a datetime-local input. */
export function toDateTimeInput(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function defaultFirstContactTarget(): string {
  return toDateTimeInput(new Date(Date.now() + DEFAULT_FIRST_CONTACT_HOURS * 60 * 60 * 1000))
}

export function firstContactOverdue(assignment: LeadSalesAssignment | null | undefined): boolean {
  if (!assignment || assignment.firstContactAt || !assignment.expectedFirstContact) return false
  return new Date(assignment.expectedFirstContact).getTime() < Date.now()
}

export function nextFollowUpOverdue(lead: Lead): boolean {
  if (!lead.salesAssignment || !lead.nextFollowUp) return false
  if (lead.converted || lead.status === 'Lost') return false
  return new Date(lead.nextFollowUp).getTime() < Date.now()
}

export function handoverAgeDays(assignment: LeadSalesAssignment | null | undefined): number {
  if (!assignment) return 0
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(assignment.assignedAt).getTime()) / 86_400_000),
  )
}

/** A simple configurable demo signal for a handover that has gone quiet. */
export function isHandoverStalled(lead: Lead): boolean {
  const assignment = lead.salesAssignment
  if (!assignment || lead.converted || lead.status === 'Lost') return false
  if (assignment.communicationStatus === 'Reassignment Required') return true
  const lastTouch = assignment.lastContact || assignment.firstContactAt || assignment.assignedAt
  return Date.now() - new Date(lastTouch).getTime() > STALLED_AFTER_DAYS * 86_400_000
}

export function isAwaitingFirstContact(lead: Lead): boolean {
  const assignment = lead.salesAssignment
  if (!assignment || lead.converted || lead.status === 'Lost') return false
  return !assignment.firstContactAt
}

export function reassignmentRequired(lead: Lead): boolean {
  const assignment = lead.salesAssignment
  if (!assignment || lead.converted || lead.status === 'Lost') return false
  return Boolean(assignment.reassignmentRequired) || isHandoverStalled(lead)
}

export function communicationStatusForSalesStatus(
  status: SalesHandoffStatus,
): CustomerCommunicationStatus {
  switch (status) {
    case 'Assigned':
      return 'Awaiting First Contact'
    case 'Contacted':
      return 'Customer Contacted'
    case 'Meeting Scheduled':
      return 'Meeting Scheduled'
    case 'Proposal Sent':
      return 'Proposal in Progress'
    case 'Negotiation':
      return 'Negotiation'
    case 'Won':
      return 'Converted'
    case 'Lost':
      return 'Lost'
    default:
      return 'Awaiting First Contact'
  }
}

const COMMUNICATION_RANK: Record<CustomerCommunicationStatus, number> = {
  'Handover Created': 0,
  'Sales Employee Assigned': 1,
  'Awaiting First Contact': 2,
  'Contact Attempted': 3,
  'Customer Contacted': 4,
  'Follow-Up Scheduled': 5,
  'Meeting Scheduled': 6,
  'Proposal in Progress': 7,
  Negotiation: 8,
  Converted: 9,
  Lost: 9,
  'Reassignment Required': 10,
}

/** Advance a communication status without losing a later sales outcome. */
export function advanceCommunicationStatus(
  current: CustomerCommunicationStatus | undefined,
  next: CustomerCommunicationStatus,
): CustomerCommunicationStatus {
  if (!current) return next
  if (current === 'Converted' || current === 'Lost') return current
  return COMMUNICATION_RANK[next] >= COMMUNICATION_RANK[current] ? next : current
}

export function handoverEvent(
  type: HandoverHistoryEvent['type'],
  by: string,
  summary: string,
  at = new Date().toISOString(),
): HandoverHistoryEvent {
  return {
    id: `HE-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    at,
    by,
    summary,
  }
}

export interface CustomerMessageContext {
  lead: Lead
  salesRep: SalesRepresentative | null
  salesManager: SalesRepresentative | null
  campaign?: Campaign | null
  companyName?: string
  nextStep?: string
}

function productLabel(lead: Lead): string {
  return lead.interests?.products?.length ? lead.interests.products.join(', ') : lead.product || 'our products'
}

function campaignLabel(lead: Lead, campaign?: Campaign | null): string {
  return campaign?.name || lead.marketingActivity || 'the recorded marketing activity'
}

export function customerWhatsAppMessage({
  lead,
  salesRep,
  salesManager,
  companyName = 'Totally ERP',
  nextStep,
}: CustomerMessageContext): string {
  const employeeName = salesRep?.name ?? 'our Sales team'
  const employeeTitle = salesDesignation(salesRep)
  const managerName = salesManager?.name ?? 'our Sales Manager'
  const managerTitle = salesDesignation(salesManager)
  return [
    `Hello ${lead.name},`,
    '',
    `Thank you for your interest in ${productLabel(lead)}.`,
    '',
    `Your enquiry has been forwarded to our Sales team. ${employeeName}, our ${employeeTitle}, will be your primary contact and will assist you with your requirements.`,
    '',
    `You may contact ${employeeName} at ${businessPhone(salesRep)} or ${businessEmail(salesRep)}.`,
    '',
    `Our Sales Manager, ${managerName}, ${managerTitle.toLowerCase()}, supervises the team and can assist you if you need additional support. Sales Manager contact: ${businessPhone(salesManager)}.`,
    '',
    nextStep?.trim() || 'Our team will contact you shortly to discuss your requirements.',
    '',
    `Thank you for choosing ${companyName}.`,
  ].join('\n')
}

export function customerEmailSubject(): string {
  return 'Your Enquiry Has Been Assigned to Our Sales Team'
}

export function customerEmailBody({
  lead,
  salesRep,
  salesManager,
  campaign,
  companyName = 'Totally ERP',
  nextStep,
}: CustomerMessageContext): string {
  const employeeName = salesRep?.name ?? 'Our Sales team'
  const employeeTitle = salesDesignation(salesRep)
  const managerName = salesManager?.name ?? 'Our Sales Manager'
  const managerTitle = salesDesignation(salesManager)
  return [
    `Dear ${lead.name},`,
    '',
    `Thank you for your interest in ${productLabel(lead)}.`,
    '',
    `Your enquiry ${lead.id} has been assigned to our Sales team. We have recorded your enquiry from ${campaignLabel(lead, campaign)}.`,
    '',
    `Your responsible Sales employee is ${employeeName}, ${employeeTitle}.`,
    `Business email: ${businessEmail(salesRep)}`,
    `Business phone: ${businessPhone(salesRep)}`,
    '',
    `Your supervising Sales Manager is ${managerName}, ${managerTitle}.`,
    `Business email: ${businessEmail(salesManager)}`,
    `Business phone: ${businessPhone(salesManager)}`,
    '',
    `What happens next: ${nextStep?.trim() || 'our team will contact you shortly to discuss your requirements and agree the next step.'}`,
    '',
    `If you need assistance, reply to this email or contact the Sales team using the business details above.`,
    '',
    `Kind regards,`,
    companyName,
    `Customer enquiry reference: ${lead.id}`,
  ].join('\n')
}

export function salesEmployeeNotificationBody(
  lead: Lead,
  assignment: LeadSalesAssignment,
  salesManager: SalesRepresentative | null,
  campaign: Campaign | null,
): string {
  const requirement = lead.qualification?.mainRequirement || lead.notes || 'Requirement recorded in the lead profile.'
  return [
    `Customer: ${lead.name}${lead.company ? ` (${lead.company})` : ''}.`,
    `Phone: ${lead.phone || 'Not recorded'} · Email: ${lead.email || 'Not recorded'}.`,
    `Requirement: ${requirement}`,
    `Lead source: ${lead.source} · Campaign: ${campaign?.name ?? 'Unattributed'}.`,
    `Qualification notes: ${lead.qualification?.notes || lead.notes || 'Not recorded'}.`,
    `Sales Manager: ${salesManager?.name ?? 'Not recorded'}.`,
    `Expected first contact: ${assignment.expectedFirstContact ? formatDateTime(assignment.expectedFirstContact) : 'Not set'}.`,
    `Handover date: ${formatDateTime(assignment.assignedAt)}.`,
    'Open the lead profile to view the customer and start follow-up.',
  ].join(' ')
}

export function salesManagerNotificationBody(
  lead: Lead,
  assignment: LeadSalesAssignment,
  salesRep: SalesRepresentative | null,
  campaign: Campaign | null,
): string {
  const requirement = lead.qualification?.mainRequirement || lead.notes || 'Requirement recorded in the lead profile.'
  return [
    `Customer: ${lead.name}${lead.company ? ` (${lead.company})` : ''}.`,
    `Assigned Sales employee: ${salesRep?.name ?? 'Not assigned'}.`,
    `Requirement: ${requirement}`,
    `Lead source: ${lead.source} · Campaign: ${campaign?.name ?? 'Unattributed'}.`,
    `Qualification notes: ${lead.qualification?.notes || lead.notes || 'Not recorded'}.`,
    `Assignment date: ${formatDateTime(assignment.assignedAt)}.`,
    `Expected first contact: ${assignment.expectedFirstContact ? formatDateTime(assignment.expectedFirstContact) : 'Not set'}.`,
    `Current handover status: ${assignment.salesStatus}.`,
    'Monitor first contact and follow-up in the lead profile.',
  ].join(' ')
}

export type HandoverTimelineStage =
  | 'Lead created'
  | 'Follow-up'
  | 'Qualified'
  | 'Assigned to Sales'
  | 'Sales team notified'
  | 'Customer notified'
  | 'First contact'
  | 'Sales follow-up'
  | 'Converted'
  | 'Lost'

export interface HandoverTimelineItem {
  stage: HandoverTimelineStage
  done: boolean
  current: boolean
  at?: string
  detail: string
}

export function handoverTimeline(lead: Lead): HandoverTimelineItem[] {
  const assignment = lead.salesAssignment
  const followUps = lead.followUps ?? []
  const firstFollowUp = followUps.length
    ? [...followUps].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
    : null
  const qualifiedActivity = [...(lead.activities ?? [])]
    .filter((activity) => /qualified/i.test(activity.summary))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0]
  const notifications = assignment?.notifications ?? []
  const customerNotified = (assignment?.customerNotifications ?? []).some((item) => item.simulatedAt)
  const contacted = Boolean(assignment?.firstContactAt || assignment?.contactAttempts?.length)
  const followUpAfterContact = contacted && (followUps.length > 0 || Boolean(lead.nextFollowUp))
  const converted = lead.converted || lead.status === 'Converted' || assignment?.salesStatus === 'Won'
  const lost = lead.status === 'Lost' || assignment?.salesStatus === 'Lost'

  const items: HandoverTimelineItem[] = [
    {
      stage: 'Lead created',
      done: true,
      current: false,
      at: lead.createdAt,
      detail: `Captured from ${lead.source}`,
    },
    {
      stage: 'Follow-up',
      done: followUps.length > 0 || ['Contacted', 'Interested', 'Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status),
      current: false,
      at: firstFollowUp?.createdAt,
      detail: firstFollowUp ? firstFollowUp.reason : 'No follow-up recorded yet',
    },
    {
      stage: 'Qualified',
      done: ['Qualified', 'Sent to Sales', 'Converted', 'Lost'].includes(lead.status),
      current: false,
      at: qualifiedActivity?.at,
      detail: 'Customer requirements and fit confirmed',
    },
    {
      stage: 'Assigned to Sales',
      done: Boolean(assignment),
      current: Boolean(assignment) && !notifications.length,
      at: assignment?.assignedAt,
      detail: assignment ? `Handover ${assignment.handoverId ?? 'record'} created` : 'Awaiting handover',
    },
    {
      stage: 'Sales team notified',
      done: notifications.length > 0,
      current: notifications.length > 0 && !customerNotified,
      at: notifications[0]?.at,
      detail: notifications.length
        ? `${notifications.length} simulated in-app notification${notifications.length === 1 ? '' : 's'}`
        : 'Notifications not generated',
    },
    {
      stage: 'Customer notified',
      done: customerNotified,
      current: customerNotified && !contacted,
      at: (assignment?.customerNotifications ?? []).find((item) => item.simulatedAt)?.simulatedAt,
      detail: customerNotified ? 'WhatsApp and email previews simulated' : 'Customer message preview not simulated',
    },
    {
      stage: 'First contact',
      done: contacted,
      current: Boolean(assignment) && !contacted && !converted && !lost,
      at: assignment?.firstContactAt ?? undefined,
      detail: contacted ? 'Sales recorded a customer contact attempt' : 'Awaiting Sales employee contact',
    },
    {
      stage: 'Sales follow-up',
      done: followUpAfterContact || ['Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation'].includes(assignment?.salesStatus ?? 'Assigned'),
      current: Boolean(assignment) && contacted && !converted && !lost,
      at: lead.nextFollowUp ?? assignment?.nextFollowUp ?? undefined,
      detail: lead.nextFollowUp ? `Next follow-up ${formatDate(lead.nextFollowUp)}` : 'No next follow-up scheduled',
    },
    {
      stage: 'Converted',
      done: converted,
      current: converted,
      at: lead.conversion?.convertedAt,
      detail: converted ? 'Customer and opportunity linked' : 'Not converted',
    },
    {
      stage: 'Lost',
      done: lost,
      current: lost,
      at: lead.status === 'Lost' ? assignment?.updatedAt : undefined,
      detail: lost ? lead.lostReason || 'Sales closed the enquiry' : 'Not lost',
    },
  ]

  return items
}
