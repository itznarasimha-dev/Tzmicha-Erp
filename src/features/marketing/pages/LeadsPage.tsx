import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  Plus,
  Target,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDemoData } from '../context/DemoDataContext'
import { useDemoRole } from '../context/DemoRoleContext'
import { useToast } from '../context/ToastContext'
import { DEMO_CREDENTIALS } from '../config/demo'
import type {
  Customer,
  CustomerNotificationRecord,
  CustomerStatus,
  HandoverNotificationRecord,
  Lead,
  LeadActivity,
  LeadConversion,
  LeadFollowUp,
  LeadRejection,
  LeadSalesAssignment,
  LeadStatus,
  Opportunity,
  OpportunityStage,
  SalesHandoffStatus,
  SalesRepresentative,
} from '../types/marketing'
import { Button } from '../components/ui/Button'
import { Badge, PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { SectionCard } from '../components/ui/SectionCard'
import { Avatar } from '../components/ui/Avatar'
import { LeadImportModal } from '../components/marketing/LeadImportModal'
import { LeadsDashboard } from '../components/leads/LeadsDashboard'
import { LeadBoard } from '../components/leads/LeadBoard'
import { LeadFormModal, nextFollowUpIso, type LeadFormValues } from '../components/leads/LeadFormModal'
import { LeadProfileModal } from '../components/leads/LeadProfileModal'
import {
  SendToSalesModal,
  type SendToSalesResult,
  type SendToSalesValues,
} from '../components/leads/SendToSalesModal'
import type {
  ContactAttemptValues,
  ReassignmentValues,
} from '../components/leads/SalesHandoverWorkspace'
import { SalesHandoversTab } from '../components/leads/SalesHandoversTab'
import { FollowUpModal, type FollowUpCompletionValues, type FollowUpScheduleValues } from '../components/leads/FollowUpModal'
import { FollowUpsTab } from '../components/leads/FollowUpsTab'
import { AttributionTab } from '../components/leads/AttributionTab'
import {
  ChartCard,
  ChartTooltip,
  Funnel,
  axisProps,
  chartColors,
  gridProps,
  useChartAnimation,
} from '../components/charts/ChartKit'
import {
  DataNote,
  DemoNote,
  MetricCard,
  MetricGrid,
  TabIntro,
} from '../components/marketing/ModuleKit'
import {
  attributionRows,
  campaignCpa,
  campaignCpl,
  campaignConversionRate,
  campaignRoi,
  computeLeadStats,
  funnelData,
  isOpen,
  leadSourceData,
  modelCredit,
  opportunityWeightedValue,
  safeDivide,
} from '../utils/analytics'
import {
  LEAD_PRIORITY_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  boardStageFor,
  boardStageLabel,
  dateRangeFor,
  filterLeads,
  hasRecordedRequirement,
  leadFollowUpViews,
  leadOwnerOptions,
  normalizeLead,
  statusForBoardStage,
  type BoardStageId,
  type DateRangeId,
  type FollowUpView,
} from '../utils/leads'
import {
  formatDate,
  formatDateTime,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatPercent,
  uid,
} from '../utils/format'
import { daysFromNow, followUpLabel, isOverdue, isToday } from '../utils/dates'
import { downloadCsv } from '../utils/csv'
import { leadBelongsToRole } from '../utils/workflow'
import {
  advanceCommunicationStatus,
  communicationStatusForSalesStatus,
  handoverEvent,
  handoverReadiness,
  salesEmployeeNotificationBody,
  salesManagerNotificationBody,
} from '../utils/handover'

const OPP_STAGES: OpportunityStage[] = [
  'Identified',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
]

const OPPORTUNITY_STAGE_FOR_SALES: Partial<Record<SalesHandoffStatus, OpportunityStage>> = {
  Assigned: 'Qualified',
  Contacted: 'Qualified',
  'Meeting Scheduled': 'Proposal',
  'Proposal Sent': 'Proposal',
  Negotiation: 'Negotiation',
  Won: 'Won',
  Lost: 'Lost',
}

const OPPORTUNITY_PROBABILITY_FOR_SALES: Partial<Record<SalesHandoffStatus, number>> = {
  Assigned: 35,
  Contacted: 45,
  'Meeting Scheduled': 60,
  'Proposal Sent': 70,
  Negotiation: 85,
  Won: 100,
  Lost: 0,
}

const CURRENT_USER = DEMO_CREDENTIALS.name

type ConversionFormValues = {
  name: string
  company: string
  phone: string
  email: string
  location: string
  industry: string
  source: Lead['source']
  campaignId: string
  product: string
  salesRepId: string
  customerStatus: CustomerStatus
  notes: string
  opportunityName: string
  opportunityValue: string
  opportunityStage: OpportunityStage
  expectedClose: string
}

type ConversionResult = {
  customerId: string
  customerName: string
  company: string
  customerLinked: boolean
  opportunityId: string
  opportunityName: string
  opportunityLinked: boolean
  salesRepName: string
}

type FollowUpModalState =
  | { mode: 'schedule'; leadId: string; followUp?: undefined }
  | { mode: 'complete'; leadId: string; followUp: FollowUpView }
  | null

function conversionForm(lead: Lead, salesReps: SalesRepresentative[]): ConversionFormValues {
  return {
    name: lead.name,
    company: lead.company,
    phone: lead.phone,
    email: lead.email,
    location: lead.location,
    industry: lead.industry,
    source: lead.source,
    campaignId: lead.campaignId ?? '',
    product: lead.product,
    salesRepId: lead.salesAssignment?.salesRepId ?? salesReps.find((rep) => rep.active)?.id ?? '',
    customerStatus: 'Active',
    notes: `Converted from lead ${lead.id}. ${lead.notes}`.trim(),
    opportunityName: `${lead.company} — ${lead.product} opportunity`,
    opportunityValue: '500000',
    opportunityStage: 'Qualified',
    expectedClose: daysFromNow(30).slice(0, 10),
  }
}

function normalizeContact(value: string): string {
  return value.trim().toLowerCase()
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '')
}

function findCustomerMatch(
  customers: Customer[],
  values: Pick<ConversionFormValues, 'email' | 'phone'>,
): Customer | undefined {
  const email = normalizeContact(values.email)
  const phone = normalizePhone(values.phone)
  return customers.find(
    (customer) =>
      (email && normalizeContact(customer.email) === email) ||
      (phone && normalizePhone(customer.phone) === phone),
  )
}

function opportunityProbability(stage: OpportunityStage): number {
  switch (stage) {
    case 'Identified':
      return 20
    case 'Qualified':
      return 45
    case 'Proposal':
      return 65
    case 'Negotiation':
      return 80
    case 'Won':
      return 100
    case 'Lost':
      return 0
    default:
      return 35
  }
}

function opportunityStatus(stage: OpportunityStage): 'Open' | 'Won' | 'Lost' {
  if (stage === 'Won') return 'Won'
  if (stage === 'Lost') return 'Lost'
  return 'Open'
}

function nextCustomerId(customers: Customer[]): string {
  const highest = customers.reduce((max, customer) => {
    const match = customer.id.match(/(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `CUST-2026-${String(highest + 1).padStart(3, '0')}`
}

function scheduledFollowUp(leadId: string, dueAt: string, values: FollowUpScheduleValues): LeadFollowUp {
  return {
    id: uid('FU'),
    dueAt,
    method: values.method,
    reason: values.reason.trim(),
    reminder: values.reminder || undefined,
    status: 'Scheduled',
    createdAt: new Date().toISOString(),
    createdBy: CURRENT_USER,
    // Keep the lead link visible in local demo records without changing the domain shape.
    ...(leadId ? {} : {}),
  }
}

function leadFromForm(values: LeadFormValues, existing: Lead | null): Lead {
  const now = new Date().toISOString()
  const status = existing?.converted ? 'Converted' : values.status
  const rejectionStatus = status === 'Rejected' || status === 'Not Interested'
  const salesLost = status === 'Lost'
  const closed = rejectionStatus || salesLost || status === 'Converted'
  const nextFollowUp = closed ? null : nextFollowUpIso(values)
  const location = [values.city, values.state, values.country].filter(Boolean).join(', ') || existing?.location || ''
  const followUps = [...(existing?.followUps ?? [])]
  const rejection: LeadRejection | undefined = rejectionStatus
    ? existing?.rejection && existing.status === status
      ? existing.rejection
      : {
          reason: values.reasonForRejection.trim() || 'Rejected while editing the lead profile.',
          rejectedAt: now,
          rejectedBy: CURRENT_USER,
          previousStatus: existing?.status ?? 'New',
          previousNextFollowUp: existing?.nextFollowUp ?? null,
        }
    : undefined

  if (nextFollowUp) {
    const alreadyRecorded = followUps.some(
      (followUp) =>
        followUp.status === 'Scheduled' &&
        Math.abs(new Date(followUp.dueAt).getTime() - new Date(nextFollowUp).getTime()) < 60_000,
    )
    if (!alreadyRecorded) {
      followUps.push({
        id: uid('FU'),
        dueAt: nextFollowUp,
        method: 'Call',
        reason: existing ? 'Follow-up date updated on the lead profile.' : 'Follow-up date captured when the lead was created.',
        status: 'Scheduled',
        createdAt: now,
        createdBy: CURRENT_USER,
      })
    }
  }

  const statusChanged = Boolean(existing && existing.status !== status)
  const activities = [...(existing?.activities ?? [])]
  if (statusChanged) {
    activities.push({
      id: uid('ACT'),
      type: 'Status Change',
      at: now,
      by: CURRENT_USER,
      summary: `Status changed from ${existing?.status} to ${status} while editing the lead profile.`,
    })
  }

  return {
    ...(existing ?? {}),
    id: existing?.id ?? uid('LD'),
    name: values.name.trim(),
    company: values.company.trim(),
    phone: values.phone.trim(),
    whatsapp: values.whatsapp.trim() || undefined,
    email: values.email.trim(),
    jobTitle: values.jobTitle.trim() || undefined,
    customerType: values.customerType || undefined,
    city: values.city.trim() || undefined,
    state: values.state.trim() || undefined,
    country: values.country.trim() || undefined,
    address: values.address.trim() || undefined,
    photoUrl: values.photoUrl.trim() || undefined,
    location,
    industry: existing?.industry || 'General',
    source: values.source,
    sourceCategory: values.sourceCategory,
    sourceDetail: values.sourceDetail.trim() || undefined,
    marketingActivity: values.marketingActivity.trim() || undefined,
    campaignId: values.campaignId || null,
    product: values.products[0] ?? existing?.product ?? 'Portfolio',
    assignedTo: values.assignedTo,
    generatedBy: values.generatedBy || values.assignedTo || CURRENT_USER,
    status,
    priority: values.priority,
    nextFollowUp,
    notes: values.notes.trim(),
    nextAction: values.nextAction.trim() || undefined,
    solutionsDiscussed: values.solutionsDiscussed.trim() || undefined,
    informationShared: values.informationShared.trim() || undefined,
    lostReason: rejectionStatus || salesLost
      ? values.reasonForRejection.trim() || existing?.lostReason
      : undefined,
    createdAt: existing?.createdAt ?? now,
    lastContact: existing?.lastContact ?? now,
    converted: existing?.converted ?? false,
    customerId: existing?.customerId,
    salesAssignment: existing?.salesAssignment,
    rejection,
    conversion: existing?.conversion,
    interests: {
      products: values.products,
      category: values.category.trim(),
      features: values.features,
      preferredBrand: values.preferredBrand.trim(),
      likes: values.likes,
      dislikes: values.dislikes,
      requirements: values.requirements,
      priceRange: values.priceRange.trim(),
      budget: values.budget.trim() ? Number(values.budget) : null,
      preferredChannel: values.preferredChannel,
      preferredContactTime: values.preferredContactTime.trim(),
      preferredLanguage: values.preferredLanguage,
      purchasePurpose: values.purchasePurpose.trim(),
      expectedPurchaseDate: values.expectedPurchaseDate,
      specialRequirements: values.specialRequirements.trim(),
      questions: values.questions,
      problems: values.problems,
      summary: values.interestsSummary.trim(),
    },
    qualification: {
      intent: values.purchaseIntent,
      estimatedValue: values.estimatedValue.trim() ? Number(values.estimatedValue) : null,
      budgetRange: values.budgetRange.trim(),
      decisionAuthority: values.decisionAuthority,
      purchaseTimeline: values.purchaseTimeline.trim(),
      notes: values.qualificationNotes.trim(),
      mainRequirement: values.mainRequirement.trim(),
      reasonForInterest: values.reasonForInterest.trim(),
      reasonForRejection: values.reasonForRejection.trim(),
    },
    attribution: {
      campaignName: values.campaignId ? undefined : existing?.attribution?.campaignName,
      adSource: values.adSource.trim(),
      landingPage: values.landingPage.trim(),
      firstContactDate: values.firstContactDate || existing?.attribution?.firstContactDate,
      latestContactDate: values.latestContactDate || existing?.attribution?.latestContactDate,
      referrerName: values.referrerName.trim(),
      referrerContact: values.referrerContact.trim(),
      notes: values.attributionNotes.trim(),
    },
    followUps,
    activities,
  }
}

export function LeadsPage({ tab }: { tab: string }) {
  const { data, update, addNotification } = useDemoData()
  const { roleId, profile } = useDemoRole()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [activeLeadTab, setActiveLeadTab] = useState<'overview' | 'sales'>('overview')
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null)
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | null>(null)
  const [sendToSalesLeadId, setSendToSalesLeadId] = useState<string | null>(null)
  const [followUpModal, setFollowUpModal] = useState<FollowUpModalState>(null)

  const [dateRange, setDateRange] = useState<DateRangeId>('all')
  const [dashboardSource, setDashboardSource] = useState('All')
  const [dashboardEmployee, setDashboardEmployee] = useState('All')
  const [dashboardCampaign, setDashboardCampaign] = useState('All')
  const [refreshing, setRefreshing] = useState(false)

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [campaignFilter, setCampaignFilter] = useState('All')
  const [opportunityStageFilter, setOpportunityStageFilter] = useState('All')
  const [opportunityRepFilter, setOpportunityRepFilter] = useState('All')
  const [opportunityCampaignFilter, setOpportunityCampaignFilter] = useState('All')
  const [attributionModel, setAttributionModel] = useState<'First Touch' | 'Last Touch' | 'Linear'>('Last Touch')

  useEffect(() => {
    if (searchParams.get('action') === 'new') setCreateOpen(true)
    const leadParam = searchParams.get('lead')
    if (leadParam) {
      setActiveLeadTab('overview')
      setActiveLeadId(leadParam)
    }
    const statusParam = searchParams.get('status')
    if (statusParam) setStatusFilter(statusParam)
  }, [searchParams])

  const clearSearchParam = (key: string) => {
    const next = new URLSearchParams(searchParams)
    next.delete(key)
    setSearchParams(next, { replace: true })
  }

  /** Leads are role-scoped: own leads, assigned team, or the whole department. */
  const scopedLeads = useMemo(
    () => data.leads.filter((lead) => leadBelongsToRole(lead, roleId, profile)),
    [data.leads, roleId, profile],
  )

  const stats = useMemo(() => computeLeadStats(scopedLeads), [scopedLeads])
  const owners = useMemo(() => leadOwnerOptions(data.leads, CURRENT_USER), [data.leads])
  const dashboardLeads = useMemo(
    () =>
      filterLeads(scopedLeads, {
        dateRange: dateRangeFor(dateRange),
        source: dashboardSource,
        employee: dashboardEmployee,
        campaign: dashboardCampaign,
      }),
    [scopedLeads, dateRange, dashboardSource, dashboardEmployee, dashboardCampaign],
  )
  const sourceOptions = useMemo(() => [...new Set(scopedLeads.map((lead) => lead.source))].sort(), [scopedLeads])

  const activeLead = scopedLeads.find((lead) => lead.id === activeLeadId) ?? null
  const openLeadProfile = (leadId: string) => {
    setActiveLeadTab('overview')
    setActiveLeadId(leadId)
  }
  const openLeadSales = (lead: Lead) => {
    setActiveLeadTab('sales')
    setActiveLeadId(lead.id)
  }
  const editingLead = data.leads.find((lead) => lead.id === editingLeadId) ?? null
  const convertingLead = data.leads.find((lead) => lead.id === convertingLeadId) ?? null
  const sendToSalesLead = data.leads.find((lead) => lead.id === sendToSalesLeadId) ?? null
  const followUpLead = followUpModal ? data.leads.find((lead) => lead.id === followUpModal.leadId) ?? null : null
  const activeOpportunity = data.opportunities.find((row) => row.id === activeOpportunityId) ?? null

  const filteredLeads = useMemo(
    () =>
      scopedLeads.filter((lead) => {
        if (statusFilter !== 'All' && lead.status !== statusFilter) return false
        if (sourceFilter !== 'All' && lead.source !== sourceFilter) return false
        if (priorityFilter !== 'All' && lead.priority !== priorityFilter) return false
        if (campaignFilter !== 'All' && lead.campaignId !== campaignFilter) return false
        return true
      }),
    [scopedLeads, statusFilter, sourceFilter, priorityFilter, campaignFilter],
  )

  const updateLead = (
    leadId: string,
    patch: Partial<Lead>,
    activity?: Omit<LeadActivity, 'id'>,
  ) => {
    update('leads', (current) =>
      current.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              ...patch,
              lastContact: patch.lastContact ?? new Date().toISOString(),
              activities: activity
                ? [...(lead.activities ?? []), { ...activity, id: uid('ACT') }]
                : lead.activities ?? [],
            }
          : lead,
      ),
    )
  }

  const refreshDashboard = () => {
    setRefreshing(true)
    window.setTimeout(() => {
      setRefreshing(false)
      pushToast({
        title: 'Dashboard refreshed',
        description: 'The view was recalculated from the leads and follow-ups stored in this browser.',
        tone: 'info',
      })
    }, 420)
  }

  const moveLead = async (
    lead: Lead,
    stage: BoardStageId,
    options?: { reason?: string; notes?: string },
  ): Promise<boolean> => {
    const currentStage = boardStageFor(lead)
    if (currentStage === stage) return false

    if (lead.converted) {
      pushToast({ title: 'Lead already converted', description: 'Converted leads stay in the Converted outcome to preserve the linked customer.', tone: 'warning' })
      return false
    }
    if (stage === 'lost') {
      pushToast({
        title: 'Lost is a sales outcome',
        description: 'Record Lost from the sales handoff status in the lead profile so the loss reason and sales owner are kept together.',
        tone: 'warning',
      })
      return false
    }
    if (lead.salesAssignment) {
      pushToast({
        title: 'Sales already owns this lead',
        description: 'Update the sales handoff status from the lead profile instead of moving it back through marketing stages.',
        tone: 'warning',
      })
      return false
    }
    if (stage === 'sent-to-sales') {
      setSendToSalesLeadId(lead.id)
      return false
    }
    if (stage === 'converted') {
      openLeadConversion(lead)
      return false
    }
    if (stage === 'qualified') {
      const hasProduct = Boolean(lead.product || lead.interests?.products?.length)
      if (!hasProduct || !hasRecordedRequirement(lead)) {
        pushToast({
          title: 'Complete qualification first',
          description: 'Add the product interest and a customer requirement before moving this lead to Qualified.',
          tone: 'warning',
        })
        return false
      }
    }

    const now = new Date().toISOString()
    const nextStatus = statusForBoardStage(stage)
    const restoring = lead.status === 'Rejected' || lead.status === 'Not Interested'
    const patch: Partial<Lead> = { status: nextStatus }
    let summary = restoring
      ? `Lead restored from Rejected to ${boardStageLabel(stage)} on the tracking board.`
      : `Moved to ${boardStageLabel(stage)} on the lead tracking board.`

    if (stage === 'rejected') {
      const reason = options?.reason?.trim()
      if (!reason) {
        pushToast({ title: 'Rejection reason required', description: 'Record why the lead is being rejected.', tone: 'warning' })
        return false
      }
      const notes = options?.notes?.trim()
      const rejection: LeadRejection = {
        reason,
        notes: notes || undefined,
        rejectedAt: now,
        rejectedBy: CURRENT_USER,
        previousStatus: lead.status,
        previousNextFollowUp: lead.nextFollowUp ?? null,
      }
      patch.rejection = rejection
      patch.lostReason = reason
      patch.nextFollowUp = null
      summary = `Lead rejected on the tracking board. Reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`
    } else {
      patch.rejection = undefined
      patch.lostReason = undefined
      if (restoring) {
        patch.nextFollowUp = lead.rejection?.previousNextFollowUp ?? lead.nextFollowUp ?? null
      }
    }

    updateLead(lead.id, patch, {
      type: 'Status Change',
      at: now,
      by: CURRENT_USER,
      summary,
    })
    if (stage === 'qualified') {
      setSendToSalesLeadId(lead.id)
      pushToast({
        title: 'Lead qualified — confirm handover',
        description: `${lead.name} is Qualified, not yet transferred. Review the customer details and confirm the Sales handover.`,
        tone: 'success',
      })
      return true
    }
    pushToast({
      title: stage === 'rejected' ? 'Lead rejected' : restoring ? 'Lead restored' : 'Lead moved',
      description:
        stage === 'rejected'
          ? `${lead.name} left the active pipeline and is available in Rejected leads. Its notes, attribution and history were preserved.`
          : `${lead.name} is now in ${boardStageLabel(stage)}. Saved locally in this browser.`,
      tone: 'success',
    })
    return true
  }

  const restoreLead = (lead: Lead) => {
    if (!['Rejected', 'Not Interested'].includes(lead.status)) {
      pushToast({ title: 'Nothing to restore', description: 'Only rejected leads can be restored to the marketing pipeline.', tone: 'warning' })
      return
    }
    const previous = lead.rejection?.previousStatus
    const target: LeadStatus =
      previous && ['New', 'Follow-up Required', 'Qualified'].includes(previous)
        ? previous
        : 'Follow-up Required'
    updateLead(lead.id, {
      status: target,
      rejection: undefined,
      lostReason: undefined,
      nextFollowUp: lead.rejection?.previousNextFollowUp ?? lead.nextFollowUp ?? null,
    }, {
      type: 'Status Change',
      at: new Date().toISOString(),
      by: CURRENT_USER,
      summary: `Rejected lead restored to ${target}. The rejection record stays in the activity history.`,
    })
    pushToast({
      title: 'Lead restored',
      description: `${lead.name} is back in ${target}. The previous rejection remains in the activity history for audit.`,
      tone: 'success',
    })
  }

  const completeConversion = (lead: Lead, values: ConversionFormValues): ConversionResult => {
    const salesRep =
      data.salesReps.find((rep) => rep.id === values.salesRepId && rep.active) ??
      data.salesReps.find((rep) => rep.active)
    if (!salesRep) throw new Error('Choose an active sales representative before converting this lead.')

    const now = new Date().toISOString()
    const existingLeadCustomer = lead.customerId
      ? data.customers.find((customer) => customer.id === lead.customerId)
      : undefined
    const matchedCustomer = findCustomerMatch(data.customers, values) ?? existingLeadCustomer
    const existingOpportunity = data.opportunities.find((opp) => opp.leadId === lead.id)
    const opportunityId = existingOpportunity?.id ?? uid('OPP')
    const customerId = matchedCustomer?.id ?? nextCustomerId(data.customers)
    const opportunityName =
      values.opportunityName.trim() || `${values.company.trim()} — ${values.product.trim()} opportunity`
    const expectedClose = values.expectedClose || daysFromNow(30).slice(0, 10)
    const opportunityValue = Math.max(0, Number(values.opportunityValue) || 0)

    if (matchedCustomer) {
      update('customers', (current) =>
        current.map((customer) =>
          customer.id === matchedCustomer.id
            ? { ...customer, salesRepId: salesRep.id, notes: values.notes.trim() || customer.notes }
            : customer,
        ),
      )
    } else {
      const newCustomer: Customer = {
        id: customerId,
        name: values.name.trim(),
        company: values.company.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        location: values.location.trim(),
        industry: values.industry.trim() || lead.industry,
        source: values.source,
        campaignId: values.campaignId || null,
        product: values.product.trim() || lead.product,
        leadId: lead.id,
        salesRepId: salesRep.id,
        opportunityId,
        status: values.customerStatus,
        notes: values.notes.trim(),
        createdAt: now,
      }
      update('customers', (current) => [newCustomer, ...current])
    }

    if (existingOpportunity) {
      update('opportunities', (current) =>
        current.map((opportunity) =>
          opportunity.id === existingOpportunity.id
            ? { ...opportunity, customerId, salesRepId: salesRep.id }
            : opportunity,
        ),
      )
    } else {
      const newOpportunity: Opportunity = {
        id: opportunityId,
        name: opportunityName,
        leadId: lead.id,
        leadName: lead.name,
        customerId,
        salesRepId: salesRep.id,
        campaignId: values.campaignId || null,
        product: values.product.trim() || lead.product,
        value: opportunityValue,
        probability: opportunityProbability(values.opportunityStage),
        expectedClose,
        assignedTo: lead.assignedTo,
        stage: values.opportunityStage,
        notes: values.notes.trim() || `Created when lead ${lead.id} was converted.`,
        createdAt: now,
      }
      update('opportunities', (current) => [newOpportunity, ...current])
    }

    update('customers', (current) =>
      current.map((customer) => (customer.id === customerId ? { ...customer, opportunityId } : customer)),
    )

    updateLead(lead.id, {
      status: 'Converted',
      converted: true,
      customerId,
      rejection: undefined,
      lostReason: undefined,
      nextFollowUp: null,
      conversion: {
        convertedAt: now,
        convertedBy: CURRENT_USER,
        customerId,
        opportunityId,
        outcome: matchedCustomer ? 'Linked to existing customer' : 'New customer created from lead',
      },
      salesAssignment: lead.salesAssignment
        ? { ...lead.salesAssignment, salesStatus: 'Won', updatedAt: now, dealStatus: 'Won' }
        : lead.salesAssignment,
    }, {
      type: 'Conversion',
      at: now,
      by: CURRENT_USER,
      summary: `Converted to customer ${customerId}${matchedCustomer ? ' (linked existing record)' : ''}. Opportunity ${opportunityId}; sales representative ${salesRep.name}.`,
    })

    addNotification({
      title: matchedCustomer ? 'Lead linked to existing customer' : 'New customer created from lead',
      body: `${lead.name} (${lead.company}) is linked to ${customerId} and ${opportunityId}, assigned to ${salesRep.name}.`,
      kind: 'system',
      href: '/marketing/leads/sales-opportunities',
    })
    pushToast({
      title: matchedCustomer ? 'Existing customer linked' : 'Customer and opportunity created',
      description: `${lead.name} → ${customerId} · ${salesRep.name}. Stored locally in this browser only.`,
      tone: 'success',
    })

    return {
      customerId,
      customerName: matchedCustomer?.name ?? values.name.trim(),
      company: matchedCustomer?.company ?? values.company.trim(),
      customerLinked: Boolean(matchedCustomer),
      opportunityId,
      opportunityName: existingOpportunity?.name ?? opportunityName,
      opportunityLinked: Boolean(existingOpportunity),
      salesRepName: salesRep.name,
    }
  }

  const saveLead = (values: LeadFormValues) => {
    if (editingLead) {
      const nextLead = leadFromForm(values, editingLead)
      const changedToQualified =
        nextLead.status === 'Qualified' &&
        editingLead.status !== 'Qualified' &&
        !nextLead.salesAssignment &&
        !nextLead.converted
      update('leads', (current) => current.map((lead) => (lead.id === editingLead.id ? nextLead : lead)))
      setEditingLeadId(null)
      if (changedToQualified) {
        setSendToSalesLeadId(nextLead.id)
        pushToast({
          title: 'Lead qualified — confirm handover',
          description: `${nextLead.name} is Qualified but not yet transferred. Review the customer information and confirm the Sales handover.`,
          tone: 'success',
        })
      } else {
        pushToast({
          title: 'Customer profile updated',
          description: `${nextLead.name} was saved with its notes, follow-ups and activity history intact.`,
          tone: 'success',
        })
      }
      return
    }

    const newLead = leadFromForm(values, null)
    update('leads', (current) => [newLead, ...current])
    addNotification({
      title: 'New demo lead added',
      body: `${newLead.name} from ${newLead.company || 'no company'} was added to local demo data.`,
      kind: 'followup',
      href: '/marketing/leads/campaign-leads',
    })
    if (newLead.status === 'Qualified') {
      setSendToSalesLeadId(newLead.id)
      pushToast({
        title: 'Lead added and qualified',
        description: `${newLead.name} is ready for a confirmed handover. Review the customer details before transferring.`,
        tone: 'success',
      })
    } else {
      pushToast({
        title: 'Lead added',
        description: `${newLead.name} is now visible in the local demo workspace.`,
        tone: 'success',
      })
    }
    setCreateOpen(false)
    clearSearchParam('action')
  }

  const importLeads = (incoming: Lead[]) => {
    if (!incoming.length) return
    const normalized = incoming.map(normalizeLead)
    update('leads', (current) => [...normalized, ...current])
    setStatusFilter('All')
    setSourceFilter('All')
    setPriorityFilter('All')
    setCampaignFilter('All')
    addNotification({
      title: `${incoming.length} lead${incoming.length === 1 ? '' : 's'} imported`,
      body: `A CSV import added ${incoming.length} campaign lead${incoming.length === 1 ? '' : 's'} to the local demo workspace.`,
      kind: 'followup',
      href: '/marketing/leads/campaign-leads',
    })
    pushToast({
      title: 'Campaign leads imported',
      description: `${incoming.length} lead${incoming.length === 1 ? '' : 's'} added to the table. Stored in this browser only.`,
      tone: 'success',
    })
  }

  const openSendToSales = (lead: Lead) => {
    setActiveLeadId(null)
    setEditingLeadId(null)
    if (lead.salesAssignment) {
      pushToast({ title: 'Already assigned', description: 'This lead already has a sales owner. Duplicate handoffs are blocked.', tone: 'warning' })
      return
    }
    if (lead.converted) {
      pushToast({ title: 'Already converted', description: 'Converted leads cannot be sent to sales again.', tone: 'warning' })
      return
    }
    if (lead.status !== 'Qualified') {
      pushToast({
        title: 'Qualify the lead first',
        description: 'Only Qualified leads can be sent to the sales team. Update the status, then try again.',
        tone: 'warning',
      })
      return
    }
    setSendToSalesLeadId(lead.id)
  }

  const confirmSendToSales = async (values: SendToSalesValues): Promise<SendToSalesResult> => {
    if (!sendToSalesLead) throw new Error('The lead is no longer available.')
    if (sendToSalesLead.salesAssignment) throw new Error('This lead already has a shared handover. Duplicate handovers are blocked.')
    if (sendToSalesLead.converted) throw new Error('This lead is already converted.')
    const readiness = handoverReadiness(sendToSalesLead)
    if (!readiness.ready) {
      throw new Error(`Complete the required customer information first: ${readiness.missing.map((item) => item.label).join(', ')}.`)
    }
    const rep = data.salesReps.find((item) => item.id === values.salesRepId && item.active && item.role !== 'Sales Manager')
    if (!rep) throw new Error('Choose an active Sales employee from the existing directory.')
    const manager = data.salesReps.find((item) => item.id === values.salesManagerId && item.active && item.role === 'Sales Manager')
    if (!manager) throw new Error('Every handover needs an active supervising Sales Manager.')
    if (!values.expectedFirstContact) throw new Error('Set the expected first-contact target for this handover.')

    const lead = sendToSalesLead
    const now = new Date().toISOString()
    const handoverId = uid('HND').toUpperCase()
    const campaign = data.campaigns.find((item) => item.id === lead.campaignId) ?? null
    const href = `/marketing/leads/sales-handovers?lead=${lead.id}`
    const customerNotifications: CustomerNotificationRecord[] = [
      {
        id: uid('CN'),
        channel: 'WhatsApp',
        recipient: lead.whatsapp || lead.phone || 'No phone recorded',
        body: values.whatsappMessage,
        preparedAt: now,
        simulatedAt: now,
        status: 'Simulated (not delivered)',
      },
      {
        id: uid('CN'),
        channel: 'Email',
        recipient: lead.email || 'No email recorded',
        subject: values.emailSubject,
        body: values.emailBody,
        preparedAt: now,
        simulatedAt: now,
        status: 'Simulated (not delivered)',
      },
    ]
    const notifications: HandoverNotificationRecord[] = [
      {
        id: uid('NTF'),
        recipientId: rep.id,
        recipientName: rep.name,
        recipientRole: 'Sales Employee',
        title: 'New Qualified Lead Assigned',
        body: '',
        at: now,
        status: 'Simulated',
        actionLabel: 'View customer & start follow-up',
        href,
      },
      {
        id: uid('NTF'),
        recipientId: manager.id,
        recipientName: manager.name,
        recipientRole: 'Sales Manager',
        title: 'New Qualified Lead — Team Assignment',
        body: '',
        at: now,
        status: 'Simulated',
        actionLabel: 'Monitor follow-up & first contact',
        href,
      },
    ]
    const assignment: LeadSalesAssignment = {
      handoverId,
      salesRepId: rep.id,
      salesManagerId: manager.id,
      assignedAt: now,
      expectedFirstContact: values.expectedFirstContact,
      firstContactAt: null,
      handoffNote: values.handoffNote,
      salesStatus: 'Assigned',
      lastContact: null,
      nextAction: values.nextAction,
      dealStatus: 'Assigned',
      updatedAt: now,
      nextFollowUp: lead.nextFollowUp ?? null,
      requirementSummary: lead.qualification?.mainRequirement || lead.notes || lead.product,
      communicationStatus: 'Awaiting First Contact',
      customerNotifications,
      notifications,
      handoverHistory: [
        handoverEvent('Handover Created', CURRENT_USER, `Handover ${handoverId} created for ${rep.name} with supervisor ${manager.name}.`, now),
        handoverEvent('Sales Notified', CURRENT_USER, `Simulated in-app notifications generated for ${rep.name} and ${manager.name}.`, now),
        handoverEvent('Customer Notified', CURRENT_USER, 'WhatsApp and email previews stored as simulated; no customer message was delivered.', now),
      ],
      contactAttempts: [],
      reassignments: [],
      supervisoryNotes: [],
      reassignmentRequired: false,
    }
    notifications[0].body = salesEmployeeNotificationBody(lead, assignment, manager, campaign)
    notifications[1].body = salesManagerNotificationBody(lead, assignment, rep, campaign)

    updateLead(lead.id, {
      status: 'Sent to Sales',
      salesAssignment: assignment,
      rejection: undefined,
      lostReason: undefined,
    }, {
      type: 'Assignment',
      at: now,
      by: CURRENT_USER,
      summary: `Qualified and transferred to Sales. Handover ${handoverId}: ${rep.name} (employee) and ${manager.name} (manager). One shared lead record preserved.`,
    })

    addNotification({
      title: 'New Qualified Lead Assigned',
      body: salesEmployeeNotificationBody(lead, assignment, manager, campaign),
      kind: 'followup',
      href,
    })
    addNotification({
      title: 'New Qualified Lead — Team Assignment',
      body: salesManagerNotificationBody(lead, assignment, rep, campaign),
      kind: 'followup',
      href,
    })
    pushToast({
      title: 'Qualified and transferred to Sales',
      description: `${lead.name} → ${rep.name} (manager ${manager.name}). Notifications are simulated; customer messages were not delivered.`,
      tone: 'success',
    })
    return {
      handoverId,
      leadId: lead.id,
      salesRepName: rep.name,
      salesManagerName: manager.name,
      expectedFirstContact: values.expectedFirstContact,
      notificationCount: notifications.length,
      customerNotificationCount: customerNotifications.length,
    }
  }

  const completeConversionAndClose = (lead: Lead, values: ConversionFormValues) => {
    const result = completeConversion(lead, values)
    setConvertingLeadId(null)
    return result
  }

  const updateSalesStatus = (lead: Lead, status: SalesHandoffStatus, note: string) => {
    if (!lead.salesAssignment) {
      pushToast({ title: 'No sales handoff', description: 'Send this lead to sales before recording a sales status.', tone: 'warning' })
      return
    }
    if (lead.converted) {
      pushToast({
        title: 'Conversion is complete',
        description: 'Converted leads are final. Their linked customer and opportunity stay intact.',
        tone: 'warning',
      })
      return
    }
    if (status === 'Lost' && !note.trim()) {
      pushToast({
        title: 'Loss reason required',
        description: 'Record why the sales deal was lost. Lost is a sales outcome, separate from a marketing rejection.',
        tone: 'warning',
      })
      return
    }

    const now = new Date().toISOString()
    const previousAssignment = lead.salesAssignment
    const nextCommunicationStatus = advanceCommunicationStatus(
      previousAssignment.communicationStatus ?? 'Awaiting First Contact',
      communicationStatusForSalesStatus(status),
    )
    const assignment: LeadSalesAssignment = {
      ...previousAssignment,
      salesStatus: status,
      dealStatus: status,
      updatedAt: now,
      firstContactAt:
        previousAssignment.firstContactAt ??
        (status === 'Contacted' || status === 'Meeting Scheduled' || status === 'Proposal Sent' || status === 'Negotiation' || status === 'Won' || status === 'Lost'
          ? now
          : null),
      communicationStatus: nextCommunicationStatus,
      lastContact: ['Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'].includes(status) ? now : previousAssignment.lastContact,
      handoverHistory: [
        ...(previousAssignment.handoverHistory ?? []),
        handoverEvent(
          'Sales Status Update',
          CURRENT_USER,
          `Sales status changed from ${previousAssignment.salesStatus} to ${status}.${note ? ` Note: ${note}` : ''}`,
          now,
        ),
        ...(status === 'Won'
          ? [handoverEvent('Converted', CURRENT_USER, note ? `Handover converted. ${note}` : 'Handover converted to a customer and opportunity.', now)]
          : []),
        ...(status === 'Lost'
          ? [handoverEvent('Lost', CURRENT_USER, note ? `Handover closed as Lost. ${note}` : 'Handover closed as Lost.', now)]
          : []),
      ],
      reassignmentRequired: status === 'Won' || status === 'Lost' ? false : previousAssignment.reassignmentRequired,
    }
    const activity: Omit<LeadActivity, 'id'> = {
      type: 'Sales Update',
      at: now,
      by: CURRENT_USER,
      summary: `Sales handoff status changed to ${status}.${note ? ` Note: ${note}` : ''}`,
    }

    const syncLinkedOpportunity = () => {
      const stage = OPPORTUNITY_STAGE_FOR_SALES[status]
      if (!stage) return
      update('opportunities', (current) =>
        current.map((opportunity) =>
          opportunity.leadId === lead.id
            ? {
                ...opportunity,
                stage,
                probability: OPPORTUNITY_PROBABILITY_FOR_SALES[status] ?? opportunity.probability,
                notes: `${opportunity.notes}${note ? ` · ${status}: ${note}` : ''}`.trim(),
              }
            : opportunity,
        ),
      )
    }

    if (status === 'Won') {
      const customerId =
        lead.customerId && data.customers.some((customer) => customer.id === lead.customerId)
          ? lead.customerId
          : nextCustomerId(data.customers)
      const existingCustomer = data.customers.find((customer) => customer.id === customerId)
      const existingOpportunity = data.opportunities.find((opportunity) => opportunity.leadId === lead.id)
      const opportunityId = existingOpportunity?.id ?? uid('OPP')
      const value = lead.qualification?.estimatedValue ?? lead.interests?.budget ?? existingOpportunity?.value ?? 0

      if (existingCustomer) {
        update('customers', (current) =>
          current.map((customer) =>
            customer.id === existingCustomer.id
              ? { ...customer, salesRepId: assignment.salesRepId, opportunityId }
              : customer,
          ),
        )
      } else {
        const newCustomer: Customer = {
          id: customerId,
          name: lead.name,
          company: lead.company,
          phone: lead.phone,
          email: lead.email,
          location: lead.location,
          industry: lead.industry,
          source: lead.source,
          campaignId: lead.campaignId,
          product: lead.product,
          leadId: lead.id,
          salesRepId: assignment.salesRepId,
          opportunityId,
          status: 'Active',
          notes: `Customer created when the sales handoff was marked Won. ${note}`.trim(),
          createdAt: now,
        }
        update('customers', (current) => [newCustomer, ...current])
      }

      if (existingOpportunity) {
        update('opportunities', (current) =>
          current.map((opportunity) =>
            opportunity.id === existingOpportunity.id
              ? {
                  ...opportunity,
                  stage: 'Won',
                  probability: 100,
                  value: opportunity.value || value,
                  customerId,
                  salesRepId: assignment.salesRepId,
                  notes: `${opportunity.notes}${note ? ` · Won: ${note}` : ''}`.trim(),
                }
              : opportunity,
          ),
        )
      } else {
        const newOpportunity: Opportunity = {
          id: opportunityId,
          name: `${lead.company || lead.name} — ${lead.product} opportunity`,
          leadId: lead.id,
          leadName: lead.name,
          customerId,
          salesRepId: assignment.salesRepId,
          campaignId: lead.campaignId,
          product: lead.product,
          value,
          probability: 100,
          expectedClose: now.slice(0, 10),
          assignedTo: lead.assignedTo,
          stage: 'Won',
          notes: `Created from a won sales handoff. ${note}`.trim(),
          createdAt: now,
        }
        update('opportunities', (current) => [newOpportunity, ...current])
      }

      const conversion: LeadConversion = {
        convertedAt: now,
        convertedBy: CURRENT_USER,
        customerId,
        opportunityId,
        outcome: note.trim() || 'Sales handoff marked Won',
      }
      updateLead(lead.id, {
        status: 'Converted',
        converted: true,
        customerId,
        rejection: undefined,
        lostReason: undefined,
        nextFollowUp: null,
        conversion,
        salesAssignment: assignment,
      }, {
        ...activity,
        type: 'Conversion',
        summary: `Sales handoff marked Won. Lead converted to customer ${customerId} via opportunity ${opportunityId}.${note ? ` Note: ${note}` : ''}`,
      })
      addNotification({
        title: 'Sales handoff won',
        body: `${lead.name} was marked Won by ${data.salesReps.find((rep) => rep.id === assignment.salesRepId)?.name ?? 'sales'}. Customer ${customerId} linked locally.`,
        kind: 'system',
        href: '/marketing/leads/sales-opportunities',
      })
      pushToast({
        title: 'Lead converted from sales handoff',
        description: `${lead.name} → ${customerId}. Customer and opportunity records stay linked.`,
        tone: 'success',
      })
      return
    }

    if (status === 'Lost') {
      updateLead(lead.id, {
        status: 'Lost',
        lostReason: note.trim(),
        rejection: undefined,
        nextFollowUp: null,
        salesAssignment: assignment,
      }, activity)
      syncLinkedOpportunity()
      pushToast({
        title: 'Sales handoff marked Lost',
        description: `${lead.name} is closed as Lost. This is a sales outcome, not a marketing rejection, and the handoff note and history are preserved.`,
        tone: 'warning',
      })
      return
    }

    const reopened = lead.status === 'Lost'
    updateLead(lead.id, {
      salesAssignment: assignment,
      ...(reopened ? { status: 'Sent to Sales' as LeadStatus, lostReason: undefined } : {}),
    }, activity)
    syncLinkedOpportunity()
    if (status === 'Contacted' && !previousAssignment.firstContactAt) {
      addNotification({
        title: 'First customer contact recorded',
        body: `${lead.name} was first contacted by ${data.salesReps.find((rep) => rep.id === assignment.salesRepId)?.name ?? 'the Sales employee'}. The Sales Manager can now monitor the next follow-up.`,
        kind: 'system',
        href: `/marketing/leads/sales-handovers?lead=${lead.id}`,
      })
    }
    pushToast({
      title: reopened ? 'Sales handoff reopened' : 'Sales status updated',
      description: reopened
        ? `${lead.name} is back with sales as ${status}. The earlier loss reason remains in the activity history.`
        : `${lead.name} is now ${status} with sales. Saved in this browser only.`,
      tone: 'success',
    })
  }

  const recordContactAttempt = (lead: Lead, values: ContactAttemptValues) => {
    const assignment = lead.salesAssignment
    if (!assignment) {
      pushToast({ title: 'No shared handover', description: 'A contact attempt can only be recorded after the lead is transferred to Sales.', tone: 'warning' })
      return
    }
    if (lead.converted) {
      pushToast({ title: 'Handover already converted', description: 'Converted handovers are final. Activity history stays intact.', tone: 'warning' })
      return
    }
    const now = new Date().toISOString()
    const firstContact = values.reachedCustomer && !assignment.firstContactAt
    const nextSalesStatus: SalesHandoffStatus =
      values.reachedCustomer && assignment.salesStatus === 'Assigned' ? 'Contacted' : assignment.salesStatus
    const nextCommunication = advanceCommunicationStatus(
      assignment.communicationStatus ?? 'Awaiting First Contact',
      values.reachedCustomer ? 'Customer Contacted' : 'Contact Attempted',
    )
    const nextAssignment: LeadSalesAssignment = {
      ...assignment,
      salesStatus: nextSalesStatus,
      dealStatus: nextSalesStatus,
      firstContactAt: firstContact ? now : assignment.firstContactAt,
      lastContact: now,
      updatedAt: now,
      communicationStatus: nextCommunication,
      reassignmentRequired: false,
      contactAttempts: [
        ...(assignment.contactAttempts ?? []),
        {
          id: uid('CA'),
          at: now,
          by: CURRENT_USER,
          method: values.method,
          outcome: values.outcome,
          notes: values.notes || undefined,
          reachedCustomer: values.reachedCustomer,
        },
      ],
      handoverHistory: [
        ...(assignment.handoverHistory ?? []),
        handoverEvent(
          'Contact Attempt',
          CURRENT_USER,
          `${values.method} attempted. ${values.reachedCustomer ? 'Customer reached' : 'Customer not reached'}. Outcome: ${values.outcome}`,
          now,
        ),
        ...(firstContact
          ? [handoverEvent('First Contact', CURRENT_USER, `First customer contact recorded by ${CURRENT_USER}.`, now)]
          : []),
      ],
    }
    updateLead(lead.id, { salesAssignment: nextAssignment }, {
      type: values.method === 'Other' ? 'Sales Update' : values.method,
      at: now,
      by: CURRENT_USER,
      summary: `Sales contact attempt (${values.method}). ${values.reachedCustomer ? 'Customer reached' : 'No answer'}. ${values.outcome}${values.notes ? ` Internal note: ${values.notes}` : ''}`,
    })
    if (firstContact) {
      addNotification({
        title: 'First customer contact recorded',
        body: `${lead.name} was first contacted by ${data.salesReps.find((rep) => rep.id === assignment.salesRepId)?.name ?? 'the Sales employee'}. First contact is now tracked for Marketing and the Sales Manager.`,
        kind: 'system',
        href: `/marketing/leads/sales-handovers?lead=${lead.id}`,
      })
    }
    pushToast({
      title: firstContact ? 'First contact recorded' : 'Contact attempt recorded',
      description: firstContact
        ? `${lead.name} now shows a recorded first contact. The next follow-up remains visible to the Sales Manager.`
        : `${values.method} outcome saved for ${lead.name}. No call or message was sent by this demo.`,
      tone: 'success',
    })
  }

  const addSupervisoryNote = (lead: Lead, note: string) => {
    const assignment = lead.salesAssignment
    if (!assignment) return
    const now = new Date().toISOString()
    const nextAssignment: LeadSalesAssignment = {
      ...assignment,
      updatedAt: now,
      supervisoryNotes: [
        ...(assignment.supervisoryNotes ?? []),
        { id: uid('SN'), at: now, by: CURRENT_USER, note },
      ],
      handoverHistory: [
        ...(assignment.handoverHistory ?? []),
        handoverEvent('Supervisory Note', CURRENT_USER, note, now),
      ],
    }
    updateLead(lead.id, { salesAssignment: nextAssignment }, {
      type: 'Sales Update',
      at: now,
      by: CURRENT_USER,
      summary: `Sales Manager note: ${note}`,
    })
    pushToast({
      title: 'Supervisory note saved',
      description: 'The note is stored on the shared handover record and remains visible after any reassignment.',
      tone: 'success',
    })
  }

  const reassignHandover = (lead: Lead, values: ReassignmentValues) => {
    const assignment = lead.salesAssignment
    if (!assignment) {
      pushToast({ title: 'No shared handover', description: 'This lead has not been transferred to Sales yet.', tone: 'warning' })
      return
    }
    if (lead.converted || lead.status === 'Lost') {
      pushToast({ title: 'Handover is closed', description: 'Converted or Lost handovers cannot be reassigned. Their history remains available.', tone: 'warning' })
      return
    }
    const rep = data.salesReps.find((item) => item.id === values.salesRepId && item.active && item.role !== 'Sales Manager')
    const manager = data.salesReps.find((item) => item.id === values.salesManagerId && item.active && item.role === 'Sales Manager')
    if (!rep || !manager) {
      pushToast({ title: 'Invalid Sales team', description: 'Choose an active Sales employee and Sales Manager from the existing directory.', tone: 'warning' })
      return
    }
    if (rep.id === assignment.salesRepId && manager.id === assignment.salesManagerId) {
      pushToast({ title: 'No change', description: 'Choose a different Sales employee or Sales Manager to reassign this handover.', tone: 'warning' })
      return
    }

    const now = new Date().toISOString()
    const previousRep = data.salesReps.find((item) => item.id === assignment.salesRepId)
    const previousManager = data.salesReps.find((item) => item.id === assignment.salesManagerId)
    const expectedFirstContact = assignment.firstContactAt
      ? assignment.expectedFirstContact ?? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const href = `/marketing/leads/sales-handovers?lead=${lead.id}`
    const notifications: HandoverNotificationRecord[] = [
      {
        id: uid('NTF'),
        recipientId: rep.id,
        recipientName: rep.name,
        recipientRole: 'Sales Employee',
        title: 'Lead Reassigned to You',
        body: '',
        at: now,
        status: 'Simulated',
        actionLabel: 'View customer & continue follow-up',
        href,
      },
      {
        id: uid('NTF'),
        recipientId: manager.id,
        recipientName: manager.name,
        recipientRole: 'Sales Manager',
        title: 'Handover Reassigned — Monitor Follow-Up',
        body: '',
        at: now,
        status: 'Simulated',
        actionLabel: 'Monitor reassigned handover',
        href,
      },
    ]
    const nextAssignment: LeadSalesAssignment = {
      ...assignment,
      salesRepId: rep.id,
      salesManagerId: manager.id,
      salesStatus: assignment.firstContactAt ? assignment.salesStatus : 'Assigned',
      dealStatus: assignment.firstContactAt ? assignment.dealStatus : 'Assigned',
      expectedFirstContact,
      communicationStatus: assignment.firstContactAt
        ? assignment.communicationStatus
        : 'Awaiting First Contact',
      updatedAt: now,
      reassignmentRequired: false,
      reassignments: [
        ...(assignment.reassignments ?? []),
        {
          id: uid('RA'),
          at: now,
          fromSalesRepId: assignment.salesRepId,
          toSalesRepId: rep.id,
          fromSalesManagerId: assignment.salesManagerId,
          toSalesManagerId: manager.id,
          reason: values.reason,
          authorizedBy: previousManager?.name ?? CURRENT_USER,
        },
      ],
      notifications: [...(assignment.notifications ?? []), ...notifications],
      handoverHistory: [
        ...(assignment.handoverHistory ?? []),
        handoverEvent(
          'Reassigned',
          previousManager?.name ?? CURRENT_USER,
          `${previousRep?.name ?? 'Previous employee'} → ${rep.name}; manager ${previousManager?.name ?? 'previous'} → ${manager.name}. Reason: ${values.reason}`,
          now,
        ),
      ],
    }
    notifications[0].body = salesEmployeeNotificationBody(lead, nextAssignment, manager, data.campaigns.find((item) => item.id === lead.campaignId) ?? null)
    notifications[1].body = salesManagerNotificationBody(lead, nextAssignment, rep, data.campaigns.find((item) => item.id === lead.campaignId) ?? null)

    updateLead(lead.id, { salesAssignment: nextAssignment }, {
      type: 'Sales Update',
      at: now,
      by: CURRENT_USER,
      summary: `Handover ${assignment.handoverId ?? ''} reassigned from ${previousRep?.name ?? assignment.salesRepId} to ${rep.name}. Manager: ${manager.name}. Reason: ${values.reason}`,
    })
    addNotification({
      title: 'Lead Reassigned to You',
      body: salesEmployeeNotificationBody(lead, nextAssignment, manager, data.campaigns.find((item) => item.id === lead.campaignId) ?? null),
      kind: 'followup',
      href,
    })
    addNotification({
      title: 'Handover Reassigned — Monitor Follow-Up',
      body: salesManagerNotificationBody(lead, nextAssignment, rep, data.campaigns.find((item) => item.id === lead.campaignId) ?? null),
      kind: 'followup',
      href,
    })
    pushToast({
      title: 'Handover reassigned',
      description: `${lead.name} → ${rep.name}, supervised by ${manager.name}. Previous assignment, notifications and customer history were preserved.`,
      tone: 'success',
    })
  }

  const openScheduleFollowUp = (lead: Lead) => {
    setFollowUpModal({ mode: 'schedule', leadId: lead.id })
  }

  const openCompleteFollowUp = (followUp: FollowUpView) => {
    setActiveLeadId(null)
    setFollowUpModal({ mode: 'complete', leadId: followUp.leadId, followUp })
  }

  const scheduleFollowUp = (lead: Lead, values: FollowUpScheduleValues) => {
    const dueAt = new Date(`${values.dueDate}T${values.dueTime}:00`).toISOString()
    const record = scheduledFollowUp(lead.id, dueAt, values)
    const now = new Date().toISOString()
    const nextAssignment = lead.salesAssignment
      ? {
          ...lead.salesAssignment,
          nextFollowUp: dueAt,
          updatedAt: now,
          communicationStatus: advanceCommunicationStatus(
            lead.salesAssignment.communicationStatus ?? 'Awaiting First Contact',
            'Follow-Up Scheduled',
          ),
          handoverHistory: [
            ...(lead.salesAssignment.handoverHistory ?? []),
            handoverEvent(
              'Follow-Up Scheduled',
              CURRENT_USER,
              `${values.method} follow-up scheduled for ${formatDateTime(dueAt)}. ${values.reason}`,
              now,
            ),
          ],
        }
      : undefined
    update('leads', (current) =>
      current.map((row) =>
        row.id === lead.id
          ? {
              ...row,
              nextFollowUp: dueAt,
              followUps: [...(row.followUps ?? []), record],
              ...(nextAssignment ? { salesAssignment: nextAssignment } : {}),
              activities: [
                ...(row.activities ?? []),
                {
                  id: uid('ACT'),
                  type: 'Follow-up',
                  at: now,
                  by: CURRENT_USER,
                  summary: `Follow-up scheduled for ${formatDateTime(dueAt)} by ${values.method}: ${values.reason}.`,
                },
              ],
            }
          : row,
      ),
    )
    addNotification({
      title: 'Follow-up scheduled',
      body: `${lead.name} · ${values.method} on ${formatDate(dueAt)}. Recorded locally; no reminder is sent.`,
      kind: 'followup',
      href: '/marketing/leads/follow-ups',
    })
    pushToast({
      title: 'Follow-up scheduled',
      description: `${lead.name} is due ${formatDateTime(dueAt)}. No reminder or message is sent by this demo.`,
      tone: 'success',
    })
    setFollowUpModal(null)
  }

  const completeFollowUp = (lead: Lead, view: FollowUpView, values: FollowUpCompletionValues) => {
    const now = new Date().toISOString()
    const completedFields = {
      status: 'Completed' as const,
      completedAt: now,
      outcome: values.outcome.trim(),
      latestResponse: values.latestResponse.trim() || undefined,
      newRequirements: values.newRequirements.trim() || undefined,
      concerns: values.concerns.trim() || undefined,
      updatedBudget: values.updatedBudget.trim() ? Number(values.updatedBudget) : null,
      purchaseReadiness: values.purchaseReadiness.trim() || undefined,
      agreedNextSteps: values.agreedNextSteps.trim() || undefined,
    }

    const followUps = view.isImplicit
      ? [
          ...(lead.followUps ?? []),
          {
            id: uid('FU'),
            ...completedFields,
            dueAt: view.dueAt,
            method: view.method,
            reason: view.reason,
            createdAt: view.createdAt,
            createdBy: view.createdBy,
          },
        ]
      : (lead.followUps ?? []).map((followUp) =>
          followUp.id === view.id ? { ...followUp, ...completedFields } : followUp,
        )

    let nextFollowUp: string | null = null
    if (values.nextDate) {
      nextFollowUp = new Date(`${values.nextDate}T${values.nextTime || '10:00'}:00`).toISOString()
      followUps.push({
        id: uid('FU'),
        dueAt: nextFollowUp,
        method: values.nextMethod,
        reason: values.nextReason.trim(),
        status: 'Scheduled',
        createdAt: now,
        createdBy: CURRENT_USER,
      })
    }

    const updatedInterests = lead.interests
      ? {
          ...lead.interests,
          budget: completedFields.updatedBudget ?? lead.interests.budget ?? null,
          requirements: values.newRequirements.trim() && !lead.interests.requirements.includes(values.newRequirements.trim())
            ? [...lead.interests.requirements, values.newRequirements.trim()]
            : lead.interests.requirements,
        }
      : lead.interests

    const firstHandoverContact = Boolean(lead.salesAssignment && !lead.salesAssignment.firstContactAt)
    const nextAssignment = lead.salesAssignment
      ? {
          ...lead.salesAssignment,
          firstContactAt: lead.salesAssignment.firstContactAt ?? now,
          lastContact: now,
          nextFollowUp,
          updatedAt: now,
          salesStatus: lead.salesAssignment.salesStatus === 'Assigned' ? 'Contacted' as SalesHandoffStatus : lead.salesAssignment.salesStatus,
          dealStatus: lead.salesAssignment.dealStatus === 'Assigned' ? 'Contacted' as SalesHandoffStatus : lead.salesAssignment.dealStatus,
          communicationStatus: advanceCommunicationStatus(
            lead.salesAssignment.communicationStatus ?? 'Awaiting First Contact',
            nextFollowUp ? 'Follow-Up Scheduled' : 'Customer Contacted',
          ),
          reassignmentRequired: false,
          handoverHistory: [
            ...(lead.salesAssignment.handoverHistory ?? []),
            handoverEvent(
              'Follow-Up Scheduled',
              CURRENT_USER,
              `Follow-up completed by ${view.method}. Outcome: ${values.outcome.trim()}${nextFollowUp ? ` Next follow-up ${formatDateTime(nextFollowUp)}.` : ''}`,
              now,
            ),
            ...(firstHandoverContact
              ? [handoverEvent('First Contact', CURRENT_USER, `First customer contact recorded through a completed ${view.method} follow-up.`, now)]
              : []),
          ],
        }
      : undefined

    updateLead(lead.id, {
      followUps,
      nextFollowUp,
      interests: updatedInterests,
      ...(nextAssignment ? { salesAssignment: nextAssignment } : {}),
    }, {
      type: 'Follow-up',
      at: now,
      by: CURRENT_USER,
      summary: `Follow-up completed (${view.method}). Outcome: ${values.outcome.trim()}${values.agreedNextSteps.trim() ? ` Next steps: ${values.agreedNextSteps.trim()}.` : ''}`,
    })
    if (firstHandoverContact) {
      addNotification({
        title: 'First customer contact recorded',
        body: `${lead.name} now has a recorded first Sales contact through a completed follow-up. Marketing visibility and manager monitoring are updated.`,
        kind: 'system',
        href: `/marketing/leads/sales-handovers?lead=${lead.id}`,
      })
    }

    pushToast({
      title: 'Follow-up completed',
      description: nextFollowUp
        ? `${lead.name} was updated and the next follow-up is ${formatDateTime(nextFollowUp)}.`
        : `${lead.name} was updated. No next follow-up was scheduled.`,
      tone: 'success',
    })
    setFollowUpModal(null)
  }

  const openLeadConversion = (lead: Lead) => {
    if (lead.converted) {
      pushToast({ title: 'Already converted', description: 'This lead already has a customer record. Duplicate conversion is prevented.', tone: 'warning' })
      return
    }
    if (lead.salesAssignment && lead.salesAssignment.salesStatus !== 'Won') {
      pushToast({
        title: 'Sales is handling this lead',
        description: 'Use the sales handoff status instead. Marking the handoff Won converts the lead consistently.',
        tone: 'warning',
      })
      return
    }
    if (lead.status !== 'Qualified') {
      pushToast({
        title: 'Qualify the lead first',
        description: 'Only Qualified leads can be converted. Mark the lead qualified, then reopen conversion.',
        tone: 'warning',
      })
      return
    }
    setActiveLeadId(null)
    setEditingLeadId(null)
    setConvertingLeadId(lead.id)
  }

  const openLeadEditor = (lead: Lead) => {
    setActiveLeadId(null)
    setEditingLeadId(lead.id)
  }

  const saveOpportunity = (opportunityId: string, values: {
    name: string
    stage: OpportunityStage
    value: number
    probability: number
    expectedClose: string
    salesRepId: string
    notes: string
  }) => {
    update('opportunities', (current) =>
      current.map((opportunity) =>
        opportunity.id === opportunityId
          ? {
              ...opportunity,
              name: values.name.trim(),
              stage: values.stage,
              value: Math.max(0, values.value),
              probability: Math.max(0, Math.min(100, values.probability)),
              expectedClose: values.expectedClose,
              salesRepId: values.salesRepId,
              notes: values.notes.trim(),
            }
          : opportunity,
      ),
    )
    setActiveOpportunityId(null)
    pushToast({
      title: 'Opportunity updated',
      description: `${values.name.trim()} was saved in the local demo pipeline.`,
      tone: 'success',
    })
  }

  const exportLeads = () => {
    const result = downloadCsv(
      'marketing-leads-demo',
      [
        { header: 'Lead ID', value: (lead: Lead) => lead.id },
        { header: 'Name', value: (lead: Lead) => lead.name },
        { header: 'Company', value: (lead: Lead) => lead.company },
        { header: 'Phone', value: (lead: Lead) => lead.phone },
        { header: 'Email', value: (lead: Lead) => lead.email },
        { header: 'Location', value: (lead: Lead) => lead.location },
        { header: 'Source', value: (lead: Lead) => lead.source },
        { header: 'Campaign', value: (lead: Lead) => lead.campaignId ?? 'Unattributed' },
        { header: 'Products', value: (lead: Lead) => lead.interests?.products.join('; ') ?? lead.product },
        { header: 'Status', value: (lead: Lead) => lead.status },
        { header: 'Priority', value: (lead: Lead) => lead.priority },
        { header: 'Assigned To', value: (lead: Lead) => lead.assignedTo },
        { header: 'Generated By', value: (lead: Lead) => lead.generatedBy ?? lead.assignedTo },
        { header: 'Sales Owner', value: (lead: Lead) => lead.salesAssignment?.salesRepId ?? '' },
        { header: 'Sales Manager', value: (lead: Lead) => lead.salesAssignment?.salesManagerId ?? '' },
        { header: 'Sales Status', value: (lead: Lead) => lead.salesAssignment?.salesStatus ?? '' },
        { header: 'Customer Communication', value: (lead: Lead) => lead.salesAssignment?.communicationStatus ?? '' },
        { header: 'First Contact', value: (lead: Lead) => lead.salesAssignment?.firstContactAt ?? lead.salesAssignment?.expectedFirstContact ?? '' },
        { header: 'Handover ID', value: (lead: Lead) => lead.salesAssignment?.handoverId ?? '' },
        { header: 'Next Follow-up', value: (lead: Lead) => lead.nextFollowUp ?? '' },
        { header: 'Converted', value: (lead: Lead) => (lead.converted ? 'Yes' : 'No') },
      ],
      filteredLeads,
    )
    pushToast({ title: result.ok ? 'CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const columns: DataTableColumn<Lead>[] = [
    {
      id: 'name',
      header: 'Lead',
      sortValue: (lead) => lead.name,
      mobileLabel: 'Lead',
      render: (lead) => (
        <div className="row-8">
          <Avatar name={lead.name} size="sm" />
          <div style={{ minWidth: 0 }}>
            <p className="cell-primary truncate">{lead.name}</p>
            <p className="text-xs muted truncate">{lead.company || 'No company'}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      hideMobile: true,
      render: (lead) => (
        <div>
          <p className="text-xs">{lead.phone || 'No phone'}</p>
          <p className="text-xs muted truncate">{lead.email || 'No email'}</p>
        </div>
      ),
    },
    {
      id: 'product',
      header: 'Interest',
      sortValue: (lead) => lead.interests?.products.join(', ') ?? lead.product,
      mobileLabel: 'Interest',
      render: (lead) => (
        <div>
          <p className="text-xs truncate">{lead.interests?.products.join(', ') || lead.product || 'Not recorded'}</p>
          <p className="text-xs muted truncate">{lead.location || 'Location not recorded'}</p>
        </div>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      sortValue: (lead) => lead.source,
      mobileLabel: 'Source',
      hideMobile: true,
      render: (lead) => (
        <div>
          <p className="text-xs">{lead.source}</p>
          <p className="text-xs muted truncate">
            {data.campaigns.find((campaign) => campaign.id === lead.campaignId)?.name ?? 'Unattributed'}
          </p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (lead) => lead.status,
      mobileLabel: 'Status',
      render: (lead) => <StatusBadge status={lead.status} />,
    },
    {
      id: 'priority',
      header: 'Priority',
      sortValue: (lead) => lead.priority,
      mobileLabel: 'Priority',
      render: (lead) => <PriorityBadge priority={lead.priority} />,
    },
    {
      id: 'sales',
      header: 'Sales handover',
      sortValue: (lead) => lead.salesAssignment?.salesStatus ?? '',
      mobileLabel: 'Sales handover',
      hideMobile: true,
      render: (lead) => {
        const assignment = lead.salesAssignment
        const rep = data.salesReps.find((item) => item.id === assignment?.salesRepId)
        const manager = data.salesReps.find((item) => item.id === assignment?.salesManagerId)
        const communicationStatus = assignment
          ? assignment.communicationStatus ?? communicationStatusForSalesStatus(assignment.salesStatus)
          : null
        return assignment ? (
          <div className="stack-4">
            <div className="row-6 wrap">
              <Badge tone={assignment.salesStatus === 'Won' ? 'success' : assignment.salesStatus === 'Lost' ? 'danger' : 'accent'}>
                {assignment.salesStatus}
              </Badge>
              {assignment.notifications?.length ? <Badge tone="neutral">Notifications simulated</Badge> : null}
            </div>
            <p className="text-xs truncate">{rep?.name ?? 'Employee unavailable'} · Manager {manager?.name ?? 'not recorded'}</p>
            <p className="text-xs muted truncate">Customer comms: {communicationStatus}</p>
            <p className="text-xs muted truncate">
              First contact: {assignment.firstContactAt
                ? formatDate(assignment.firstContactAt)
                : assignment.expectedFirstContact
                  ? `due ${formatDate(assignment.expectedFirstContact)}`
                  : 'not set'}
            </p>
          </div>
        ) : (
          <span className="text-xs muted">{lead.status === 'Qualified' ? 'Qualified — awaiting confirmed transfer' : 'Not handed over'}</span>
        )
      },
    },
    {
      id: 'followup',
      header: 'Next follow-up',
      sortValue: (lead) => (lead.nextFollowUp ? new Date(lead.nextFollowUp).getTime() : 0),
      mobileLabel: 'Follow-up',
      render: (lead) =>
        lead.nextFollowUp ? (
          <span className={isOverdue(lead.nextFollowUp) && isOpen(lead.status) ? 'danger-text text-xs' : 'text-xs'}>
            {followUpLabel(lead.nextFollowUp)}
          </span>
        ) : (
          <span className="muted text-xs">Not scheduled</span>
        ),
    },
    {
      id: 'owner',
      header: 'Owner',
      sortValue: (lead) => lead.assignedTo,
      mobileLabel: 'Owner',
      hideMobile: true,
      render: (lead) => <span className="text-xs">{lead.assignedTo}</span>,
    },
    {
      id: 'generatedBy',
      header: 'Generated by',
      sortValue: (lead) => lead.generatedBy ?? lead.assignedTo,
      mobileLabel: 'Generated by',
      hideMobile: true,
      render: (lead) => <span className="text-xs">{lead.generatedBy ?? lead.assignedTo}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      mobileLabel: 'Actions',
      render: (lead) => (
        <Button
          variant="ghost"
          size="xs"
          onClick={(event) => {
            event.stopPropagation()
            setActiveLeadTab('overview')
            setActiveLeadId(lead.id)
          }}
        >
          Open <ChevronRight size={12} />
        </Button>
      ),
    },
  ]

  const leadOverlays = (
    <>
      {importOpen ? (
        <LeadImportModal
          open
          onClose={() => setImportOpen(false)}
          leads={data.leads}
          campaigns={data.campaigns}
          onImport={importLeads}
        />
      ) : null}
      {createOpen ? (
        <LeadFormModal
          open
          onClose={() => { setCreateOpen(false); clearSearchParam('action') }}
          onSave={saveLead}
          campaigns={data.campaigns}
          leads={data.leads}
          owners={owners}
          onOpenExisting={(leadId) => { setCreateOpen(false); openLeadProfile(leadId) }}
        />
      ) : null}
      {editingLead ? (
        <LeadFormModal
          open
          lead={editingLead}
          onClose={() => setEditingLeadId(null)}
          onSave={saveLead}
          campaigns={data.campaigns}
          leads={data.leads}
          owners={owners}
          onOpenExisting={(leadId) => { setEditingLeadId(null); openLeadProfile(leadId) }}
        />
      ) : null}
      <LeadProfileModal
        open={Boolean(activeLead)}
        lead={activeLead}
        initialTab={activeLeadTab}
        campaigns={data.campaigns}
        salesReps={data.salesReps}
        customers={data.customers}
        opportunities={data.opportunities}
        onClose={() => { setActiveLeadId(null); setActiveLeadTab('overview'); clearSearchParam('lead') }}
        onEdit={openLeadEditor}
        onUpdate={updateLead}
        onScheduleFollowUp={openScheduleFollowUp}
        onCompleteFollowUp={openCompleteFollowUp}
        onSendToSales={openSendToSales}
        onConvert={openLeadConversion}
        onSalesStatusChange={updateSalesStatus}
        onRecordContactAttempt={recordContactAttempt}
        onAddSupervisoryNote={addSupervisoryNote}
        onReassignHandover={reassignHandover}
        currentUserName={CURRENT_USER}
        onRestore={restoreLead}
      />
      {sendToSalesLead ? (
        <SendToSalesModal
          open
          lead={sendToSalesLead}
          salesReps={data.salesReps}
          campaigns={data.campaigns}
          currentUserName={CURRENT_USER}
          onClose={() => setSendToSalesLeadId(null)}
          onConfirm={confirmSendToSales}
          onOpenLead={() => { setSendToSalesLeadId(null); openLeadSales(sendToSalesLead) }}
        />
      ) : null}
      {followUpLead && followUpModal ? (
        <FollowUpModal
          open
          mode={followUpModal.mode}
          lead={followUpLead}
          followUp={followUpModal.mode === 'complete' ? followUpModal.followUp : null}
          onClose={() => setFollowUpModal(null)}
          onSchedule={(values) => scheduleFollowUp(followUpLead, values)}
          onComplete={(values) => {
            if (followUpModal.mode === 'complete') completeFollowUp(followUpLead, followUpModal.followUp, values)
          }}
        />
      ) : null}
      {convertingLead ? (
        <ConvertLeadModal
          lead={convertingLead}
          campaigns={data.campaigns}
          customers={data.customers}
          salesReps={data.salesReps}
          existingOpportunity={data.opportunities.find((opp) => opp.leadId === convertingLead.id) ?? null}
          onClose={() => setConvertingLeadId(null)}
          onConvert={(values) => completeConversionAndClose(convertingLead, values)}
        />
      ) : null}
      {activeOpportunity ? (
        <OpportunityEditModal
          opportunity={activeOpportunity}
          customers={data.customers}
          salesReps={data.salesReps}
          campaigns={data.campaigns}
          onClose={() => setActiveOpportunityId(null)}
          onSave={(values) => saveOpportunity(activeOpportunity.id, values)}
        />
      ) : null}
    </>
  )

  const dashboardCommon = {
    campaigns: data.campaigns,
    dateRange,
    onDateRangeChange: setDateRange,
    source: dashboardSource,
    onSourceChange: setDashboardSource,
    employee: dashboardEmployee,
    onEmployeeChange: setDashboardEmployee,
    campaign: dashboardCampaign,
    onCampaignChange: setDashboardCampaign,
    owners,
    sourceOptions,
    refreshing,
    onRefresh: refreshDashboard,
    onAddLead: () => setCreateOpen(true),
    onOpenLead: (leadId: string) => openLeadProfile(leadId),
    onOpenFollowUps: () => navigate('/marketing/leads/follow-ups'),
  }

  const renderTab = (): ReactNode => {
    if (tab === 'overview') {
      const funnel = funnelData(scopedLeads, data.opportunities)
      const sources = leadSourceData(scopedLeads).slice(0, 7)
      const due = scopedLeads
        .filter((lead) => lead.nextFollowUp && isOpen(lead.status) && (isOverdue(lead.nextFollowUp) || isToday(lead.nextFollowUp)))
        .sort((a, b) => new Date(a.nextFollowUp ?? 0).getTime() - new Date(b.nextFollowUp ?? 0).getTime())
      const topCampaigns = attributionRows(data.campaigns, data.leads, data.opportunities).slice(0, 5)
      const activeOpps = data.opportunities.filter((opp) => opp.stage !== 'Won' && opp.stage !== 'Lost')

      return (
        <div className="stack-16">
          <TabIntro
            title="Leads & attribution workspace"
            description="A premium lead-management view built on the leads, follow-ups, customers and opportunities stored in this browser. No CRM or messaging service is connected."
            actions={
              <>
                <Button variant="ghost" icon={<Download size={14} />} onClick={exportLeads}>Export</Button>
                <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Add lead</Button>
              </>
            }
          />
          <LeadsDashboard {...dashboardCommon} leads={dashboardLeads} />
          <div className="dashboard-grid dashboard-grid--equal">
            <ChartCard title="Lead conversion funnel" subtitle="Computed from local lead and opportunity records" height="md" isEmpty={funnel[0].value === 0}>
              <Funnel
                stages={funnel.map((stage, index) => ({
                  label: stage.stage,
                  value: stage.value,
                  display: formatNumber(stage.value),
                  color: chartColors[index % chartColors.length],
                }))}
              />
            </ChartCard>
            <ChartCard title="Leads by source" subtitle="Demo lead records by acquisition source" height="md" isEmpty={sources.length === 0}>
              <BarChart data={sources} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="source" {...axisProps} width={108} tick={{ fill: 'var(--muted)', fontSize: 9.5 }} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} leads`} />} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="leads" name="Leads" radius={[0, 4, 4, 0]} isAnimationActive={useChartAnimation()}>
                  {sources.map((entry, index) => (
                    <Cell key={entry.source} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
          </div>
          <div className="dashboard-grid dashboard-grid--three">
            <SectionCard
              title="Follow-ups needing attention"
              subtitle="Calculated from local browser dates"
              actions={<Badge tone={stats.overdue ? 'danger' : 'success'}>{stats.overdue ? `${stats.overdue} overdue` : 'On track'}</Badge>}
            >
              {due.length === 0 ? (
                <p className="empty-inline">No follow-ups are due today in this demo dataset.</p>
              ) : (
                <div className="stack-8">
                  {due.slice(0, 5).map((lead) => (
                    <button key={lead.id} type="button" className="activity-followup" onClick={() => openLeadProfile(lead.id)}>
                      <Avatar name={lead.name} size="sm" />
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }} className="truncate">{lead.name}</span>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--muted)' }} className="truncate">
                          {lead.company} · {lead.nextFollowUp ? followUpLabel(lead.nextFollowUp) : ''}
                        </span>
                      </span>
                      <ChevronRight size={13} className="faint" />
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Pipeline value" subtitle="Weighted value of open demo opportunities">
              <div className="metric-card__value">{formatINRCompact(opportunityWeightedValue(activeOpps))}</div>
              <p className="text-xs muted mt-4">{activeOpps.length} open opportunities · {data.opportunities.length} total</p>
              <div className="stack-10 mt-12">
                {OPP_STAGES.filter((stage) => stage !== 'Won' && stage !== 'Lost').map((stage) => {
                  const stageOpps = activeOpps.filter((opp) => opp.stage === stage)
                  const value = stageOpps.reduce((sum, opp) => sum + opp.value, 0)
                  return (
                    <div className="bar-track" key={stage}>
                      <span className="bar-track__label">{stage}</span>
                      <span className="bar-track__rail"><span className="bar-track__fill" style={{ width: `${Math.min(100, (value / Math.max(1, opportunityWeightedValue(activeOpps))) * 100)}%` }} /></span>
                      <span className="bar-track__value">{formatINRCompact(value)}</span>
                    </div>
                  )
                })}
              </div>
              <DataNote>Weighted by each opportunity's local probability field.</DataNote>
            </SectionCard>

            <SectionCard title="Top attributed campaigns" subtitle="Revenue credit uses the demo last-touch model">
              <div className="stack-10">
                {topCampaigns.map((row) => (
                  <div key={row.campaign.id} className="bar-track">
                    <span className="bar-track__label">{row.campaign.name}</span>
                    <span className="bar-track__rail"><span className="bar-track__fill" style={{ width: `${(row.revenue / Math.max(1, topCampaigns[0].revenue)) * 100}%`, background: 'var(--chart-2)' }} /></span>
                    <span className="bar-track__value">{formatINRCompact(row.revenue)}</span>
                  </div>
                ))}
              </div>
              <DataNote>Attribution is illustrative and only uses demo campaign-reported revenue.</DataNote>
            </SectionCard>
          </div>
          <DemoNote>
            No CRM is connected. Leads, follow-ups, handoffs and conversions live in localStorage, and no emails, calls or messages are sent.
          </DemoNote>
        </div>
      )
    }

    if (tab === 'campaign-leads') {
      return (
        <div className="stack-16">
          <TabIntro
            title="Campaign leads"
            description={`Showing ${scopedLeads.length} lead${scopedLeads.length === 1 ? '' : 's'} visible to the ${profile.roleLabel} preview role. Search, filter, sort and export, then open a row to review the profile, log activity or manage the sales handoff.`}
            actions={
              <>
                <Button variant="ghost" icon={<Download size={14} />} onClick={exportLeads}>Export CSV</Button>
                <Button variant="soft" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>Import</Button>
                <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New lead</Button>
              </>
            }
          />
          <DataTable
            data={filteredLeads}
            columns={columns}
            rowKey={(lead) => lead.id}
            searchable={(lead) => `${lead.name} ${lead.company} ${lead.email} ${lead.phone} ${lead.location} ${lead.product} ${lead.interests?.products.join(' ') ?? ''} ${lead.assignedTo} ${lead.generatedBy ?? ''} ${lead.salesAssignment?.salesStatus ?? ''}`}
            searchPlaceholder="Search leads, companies, emails, products…"
            pageSize={9}
            initialSort={{ columnId: 'followup', direction: 'asc' }}
            onRowClick={(lead) => openLeadProfile(lead.id)}
            filters={
              <>
                <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
                  <option value="All">All statuses</option>
                  {LEAD_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                </select>
                <select className="select" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Filter by source">
                  <option value="All">All sources</option>
                  {LEAD_SOURCE_OPTIONS.map((source) => <option key={source}>{source}</option>)}
                </select>
                <select className="select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority">
                  <option value="All">All priorities</option>
                  {LEAD_PRIORITY_OPTIONS.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
                <select className="select" value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} aria-label="Filter by campaign">
                  <option value="All">All campaigns</option>
                  {data.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                </select>
              </>
            }
            caption="Campaign lead records"
            emptyTitle="No leads match these filters"
            emptyDescription="Adjust the filters or add a new demo lead. No external CRM is queried."
            toolbarActions={<span className="text-xs muted">{filteredLeads.filter((lead) => lead.priority === 'Urgent' || lead.priority === 'High').length} high priority</span>}
          />
          <div className="callout callout--info">
            <CircleAlert size={14} />
            <span>Duplicate detection checks email, phone and name/company before a new lead is saved. Notes and history are preserved when a profile is edited.</span>
          </div>
        </div>
      )
    }

    if (tab === 'lead-tracking') {
      return (
        <div className="stack-16">
          <TabIntro
            title="Lead tracking board"
            description="Four marketing stages — New Leads, Follow-up, Qualified and Sent to Sales — with drag-and-drop, validation and a mobile-friendly stage selector. Rejected, Converted and Lost are separate outcome views."
          />
          <LeadBoard
            leads={dashboardLeads}
            salesReps={data.salesReps}
            campaigns={data.campaigns}
            customers={data.customers}
            opportunities={data.opportunities}
            onOpenLead={openLeadProfile}
            onOpenSales={openLeadSales}
            onMoveLead={moveLead}
            onEditLead={openLeadEditor}
            onSendToSales={openSendToSales}
            onConvert={openLeadConversion}
            onFollowUp={openScheduleFollowUp}
            onRestoreLead={restoreLead}
            onAddLead={() => setCreateOpen(true)}
          />
          <DemoNote>
            Drag-and-drop updates the lead status stored in this browser. Rejection opens a confirmation dialog and
            records the reason, employee and date. Sent to Sales opens the assignment workflow, and conversion only
            succeeds after the customer-conversion workflow completes. Sales Lost is kept separate from marketing
            Rejected.
          </DemoNote>
        </div>
      )
    }

    if (tab === 'follow-ups') {
      return (
        <div className="stack-16">
          <TabIntro
            title="Follow-up manager"
            description="Every scheduled, overdue and completed follow-up in one view. Completing a follow-up records the outcome and can create the next one."
            actions={
              <>
                <Badge tone="neutral">{dashboardLeads.length} leads in view</Badge>
                <Button variant="primary" icon={<CalendarClock size={14} />} onClick={() => {
                  const target = dashboardLeads.find((lead) => !['Converted', 'Rejected', 'Not Interested', 'Lost'].includes(lead.status))
                  if (target) openScheduleFollowUp(target)
                  else pushToast({ title: 'No open lead to schedule', description: 'Add a lead or widen the dashboard filters first.', tone: 'warning' })
                }}>
                  Schedule follow-up
                </Button>
              </>
            }
          />
          <FollowUpsTab
            leads={dashboardLeads}
            onOpenLead={(leadId) => openLeadProfile(leadId)}
            onSchedule={openScheduleFollowUp}
            onComplete={openCompleteFollowUp}
            onRefresh={refreshDashboard}
          />
          <DemoNote>
            Follow-up reminders are preferences stored on each record. This frontend demo does not send notifications, emails or WhatsApp messages.
          </DemoNote>
        </div>
      )
    }

    if (tab === 'attribution') {
      return (
        <div className="stack-16">
          <TabIntro
            title="Attribution analytics"
            description="Connect leads, follow-ups, sales handoffs and conversions to their recorded source and campaign. Every metric is calculated from local demo records."
            actions={<Badge tone="accent">{scopedLeads.length} role-scoped leads · {data.campaigns.length} campaigns</Badge>}
          />
          <AttributionTab
            leads={scopedLeads}
            campaigns={data.campaigns}
            opportunities={data.opportunities}
            salesReps={data.salesReps}
            onOpenLead={(leadId) => openLeadProfile(leadId)}
            onRefresh={refreshDashboard}
          />
          <DemoNote>
            Attribution is based on the source and campaign recorded on each lead. It is not multi-touch measurement, and no advertising platform is connected.
          </DemoNote>
        </div>
      )
    }

    if (tab === 'sales-handovers') {
      return (
        <div className="stack-16">
          <SalesHandoversTab
            leads={scopedLeads}
            campaigns={data.campaigns}
            salesReps={data.salesReps}
            onOpenLead={openLeadProfile}
            onOpenSales={openLeadSales}
          />
          <DemoNote>
            Shared handovers update the same local lead record used by Marketing and Sales previews. No CRM, messaging provider, HR directory or Sales application is connected.
          </DemoNote>
        </div>
      )
    }

    if (tab === 'sales-opportunities') {
      const rows = data.opportunities.filter((row) => {
        if (opportunityStageFilter !== 'All' && row.stage !== opportunityStageFilter) return false
        if (opportunityRepFilter !== 'All' && row.salesRepId !== opportunityRepFilter) return false
        if (opportunityCampaignFilter !== 'All' && row.campaignId !== opportunityCampaignFilter) return false
        return true
      })
      const open = data.opportunities.filter((row) => row.stage !== 'Won' && row.stage !== 'Lost')
      const won = data.opportunities.filter((row) => row.stage === 'Won')
      return (
        <div className="stack-16">
          <TabIntro
            title="Sales opportunities"
            description="Qualified leads become customers and opportunities here. The customer, assigned sales representative, campaign, value, close date, stage and status are visible and editable."
            actions={<Badge tone="accent">{formatINRCompact(opportunityWeightedValue(open))} weighted</Badge>}
          />
          <MetricGrid>
            <MetricCard label="Open opportunities" value={open.length} sub="Excluding won and lost" icon={<Target size={15} />} tone="var(--chart-1)" />
            <MetricCard label="Weighted pipeline" value={formatINRCompact(opportunityWeightedValue(open))} sub="Value × probability" icon={<TrendingUp size={15} />} tone="var(--chart-2)" />
            <MetricCard label="Customers" value={data.customers.length} sub={`${data.customers.filter((customer) => customer.status === 'Active').length} active · demo records`} icon={<Users size={15} />} tone="var(--chart-5)" />
            <MetricCard label="Won" value={won.length} sub={formatINRCompact(won.reduce((sum, row) => sum + row.value, 0))} icon={<CheckCircle2 size={15} />} tone="var(--chart-3)" />
          </MetricGrid>
          <div className="grid-5">
            {OPP_STAGES.map((stage) => {
              const stageRows = data.opportunities.filter((row) => row.stage === stage)
              return (
                <div className="soft-tile" key={stage}>
                  <p className="soft-tile__label">{stage}</p>
                  <p className="soft-tile__value">{stageRows.length}</p>
                  <p className="text-xs muted">{formatINRCompact(stageRows.reduce((sum, row) => sum + row.value, 0))}</p>
                </div>
              )
            })}
          </div>
          <DataTable
            data={rows}
            columns={[
              {
                id: 'name',
                header: 'Opportunity',
                sortValue: (row) => row.name,
                mobileLabel: 'Opportunity',
                render: (row) => {
                  const customer = data.customers.find((item) => item.id === row.customerId)
                  return (
                    <div>
                      <p className="cell-primary">{row.name}</p>
                      <p className="text-xs muted">{customer ? `${customer.id} · ${customer.name} · ${customer.company}` : `${row.leadName} · lead`}</p>
                    </div>
                  )
                },
              },
              {
                id: 'representative',
                header: 'Sales representative',
                sortValue: (row) => data.salesReps.find((rep) => rep.id === row.salesRepId)?.name ?? row.assignedTo,
                mobileLabel: 'Sales rep',
                render: (row) => {
                  const rep = data.salesReps.find((item) => item.id === row.salesRepId)
                  return (
                    <div>
                      <p className="text-xs font-semibold">{rep?.name ?? row.assignedTo}</p>
                      <p className="text-xs muted">{rep?.region ?? 'Marketing owner'}</p>
                    </div>
                  )
                },
              },
              { id: 'campaign', header: 'Campaign', sortValue: (row) => row.campaignId ?? '', hideMobile: true, render: (row) => <span className="text-xs">{data.campaigns.find((campaign) => campaign.id === row.campaignId)?.name ?? 'Unattributed'}</span> },
              { id: 'product', header: 'Product', sortValue: (row) => row.product, hideMobile: true, render: (row) => <span className="text-xs">{row.product}</span> },
              { id: 'value', header: 'Value', align: 'right', sortValue: (row) => row.value, mobileLabel: 'Value', render: (row) => <span className="cell-strong">{formatINR(row.value)}</span> },
              { id: 'close', header: 'Close date', sortValue: (row) => row.expectedClose, mobileLabel: 'Close date', render: (row) => <span className="text-xs">{formatDate(row.expectedClose)}</span> },
              { id: 'stage', header: 'Stage', sortValue: (row) => row.stage, mobileLabel: 'Stage', render: (row) => <Badge tone="accent">{row.stage}</Badge> },
              {
                id: 'status',
                header: 'Status',
                sortValue: (row) => opportunityStatus(row.stage),
                mobileLabel: 'Status',
                render: (row) => <StatusBadge status={opportunityStatus(row.stage)} />,
              },
              {
                id: 'actions',
                header: '',
                align: 'right',
                mobileLabel: 'Actions',
                render: (row) => (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(event) => {
                      event.stopPropagation()
                      setActiveOpportunityId(row.id)
                    }}
                  >
                    Edit <ChevronRight size={12} />
                  </Button>
                ),
              },
            ]}
            rowKey={(row) => row.id}
            searchable={(row) => {
              const customer = data.customers.find((item) => item.id === row.customerId)
              const rep = data.salesReps.find((item) => item.id === row.salesRepId)
              return `${row.name} ${row.leadName} ${customer?.company ?? ''} ${customer?.name ?? ''} ${row.product} ${rep?.name ?? row.assignedTo}`
            }}
            searchPlaceholder="Search opportunities, customers, reps…"
            pageSize={8}
            initialSort={{ columnId: 'value', direction: 'desc' }}
            filters={
              <>
                <select className="select" value={opportunityStageFilter} onChange={(event) => setOpportunityStageFilter(event.target.value)} aria-label="Filter opportunities by stage">
                  <option value="All">All stages</option>
                  {OPP_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
                </select>
                <select className="select" value={opportunityRepFilter} onChange={(event) => setOpportunityRepFilter(event.target.value)} aria-label="Filter opportunities by sales representative">
                  <option value="All">All representatives</option>
                  {data.salesReps.filter((rep) => rep.active).map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                </select>
                <select className="select" value={opportunityCampaignFilter} onChange={(event) => setOpportunityCampaignFilter(event.target.value)} aria-label="Filter opportunities by campaign">
                  <option value="All">All campaigns</option>
                  {data.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                </select>
              </>
            }
            onRowClick={(row) => setActiveOpportunityId(row.id)}
            caption="Sales opportunities"
            emptyTitle="No opportunities match these filters"
            emptyDescription="Clear a filter or convert a qualified lead to create a linked customer and opportunity."
          />
        </div>
      )
    }

    if (tab === 'campaign-to-sales') {
      const rows = attributionRows(data.campaigns, data.leads, data.opportunities)
      const model = modelCredit(attributionModel)
      return (
        <div className="stack-16">
          <TabIntro
            title="Campaign-to-sales attribution"
            description="Connect demo campaign spend to lead and revenue outcomes. Attribution weights are illustrative, not measured multi-touch data."
            actions={
              <Button variant="ghost" icon={<Download size={14} />} onClick={() => {
                const result = downloadCsv('campaign-attribution-demo', [
                  { header: 'Campaign', value: (row: (typeof rows)[number]) => row.campaign.name },
                  { header: 'Spend', value: (row: (typeof rows)[number]) => row.spend },
                  { header: 'Leads', value: (row: (typeof rows)[number]) => row.leads },
                  { header: 'Qualified', value: (row: (typeof rows)[number]) => row.qualified },
                  { header: 'Opportunities', value: (row: (typeof rows)[number]) => row.opportunities },
                  { header: 'Revenue', value: (row: (typeof rows)[number]) => row.revenue },
                  { header: 'ROI %', value: (row: (typeof rows)[number]) => (row.roi === null ? '' : row.roi.toFixed(1)) },
                ], rows)
                pushToast({ title: result.ok ? 'Attribution CSV exported' : 'Export failed', description: result.message, tone: result.ok ? 'success' : 'error' })
              }}>Export attribution</Button>
            }
          />
          <div className="segmented" role="group" aria-label="Attribution model">
            {(['First Touch', 'Last Touch', 'Linear'] as const).map((option) => (
              <button key={option} type="button" className={attributionModel === option ? 'is-active' : ''} onClick={() => setAttributionModel(option)} aria-pressed={attributionModel === option}>{option}</button>
            ))}
          </div>
          <div className="callout callout--info">
            <CircleAlert size={14} />
            <span>{model.note}</span>
          </div>
          <DataTable
            data={rows}
            columns={[
              { id: 'campaign', header: 'Campaign', sortValue: (row) => row.campaign.name, mobileLabel: 'Campaign', render: (row) => <div><p className="cell-primary">{row.campaign.name}</p><p className="text-xs muted">{row.campaign.channel} · {row.campaign.status}</p></div> },
              { id: 'spend', header: 'Spend', align: 'right', sortValue: (row) => row.spend, mobileLabel: 'Spend', render: (row) => formatINRCompact(row.spend) },
              { id: 'leads', header: 'Leads', align: 'right', sortValue: (row) => row.leads, mobileLabel: 'Leads', render: (row) => <>{row.leads}<span className="text-xs muted"> ({row.qualified} qualified)</span></> },
              { id: 'opps', header: 'Opps', align: 'right', sortValue: (row) => row.opportunities, mobileLabel: 'Opportunities', render: (row) => row.opportunities },
              { id: 'revenue', header: 'Revenue', align: 'right', sortValue: (row) => row.revenue, mobileLabel: 'Revenue', render: (row) => <span className="cell-strong">{formatINRCompact(row.revenue)}</span> },
              { id: 'roi', header: 'ROI', align: 'right', sortValue: (row) => row.roi ?? -999, mobileLabel: 'ROI', render: (row) => <span className={row.roi !== null && row.roi >= 0 ? 'success-text' : 'danger-text'}>{formatPercent(row.roi)}</span> },
            ]}
            rowKey={(row) => row.campaign.id}
            searchable={(row) => `${row.campaign.name} ${row.campaign.channel} ${row.campaign.product}`}
            searchPlaceholder="Search campaigns…"
            pageSize={8}
            initialSort={{ columnId: 'revenue', direction: 'desc' }}
            caption="Campaign attribution"
          />
        </div>
      )
    }

    if (tab === 'roi-analysis') {
      const rows = data.campaigns.filter((campaign) => campaign.spend > 0)
      return (
        <div className="stack-16">
          <TabIntro title="ROI analysis" description="Compare campaign-level return, cost per lead and cost per acquisition using sample campaign-reported figures." />
          <div className="dashboard-grid dashboard-grid--equal">
            <ChartCard title="Campaign ROI" subtitle="Attributed revenue against spend · demo data" height="md" isEmpty={rows.length === 0}>
              <BarChart data={rows.map((campaign) => ({ name: campaign.name.length > 18 ? `${campaign.name.slice(0, 18)}…` : campaign.name, roi: Number((campaignRoi(campaign) ?? 0).toFixed(1)) }))} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} tickFormatter={(value: number) => `${value}%`} />
                <YAxis type="category" dataKey="name" {...axisProps} width={108} tick={{ fill: 'var(--muted)', fontSize: 9.5 }} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value.toFixed(1)}%`} />} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="roi" name="ROI" radius={[0, 4, 4, 0]} isAnimationActive={useChartAnimation()}>
                  {rows.map((campaign) => <Cell key={campaign.id} fill={(campaignRoi(campaign) ?? 0) >= 100 ? 'var(--chart-2)' : 'var(--chart-1)'} />)}
                </Bar>
              </BarChart>
            </ChartCard>
            <SectionCard title="Efficiency signals" subtitle="Computed from local campaign records">
              <div className="stack-12">
                <div className="mini-stats">
                  <div className="mini-stat"><p className="mini-stat__label">Blended ROI</p><p className="mini-stat__value">{formatPercent(safeDivide(rows.reduce((sum, campaign) => sum + campaign.kpis.revenue - campaign.spend, 0), rows.reduce((sum, campaign) => sum + campaign.spend, 0)) ? (rows.reduce((sum, campaign) => sum + campaign.kpis.revenue - campaign.spend, 0) / rows.reduce((sum, campaign) => sum + campaign.spend, 0)) * 100 : null)}</p></div>
                  <div className="mini-stat"><p className="mini-stat__label">Avg CPL</p><p className="mini-stat__value">{formatINR(rows.reduce((sum, campaign) => sum + (campaignCpl(campaign) ?? 0), 0) / Math.max(1, rows.length))}</p></div>
                  <div className="mini-stat"><p className="mini-stat__label">Avg CPA</p><p className="mini-stat__value">{formatINR(rows.reduce((sum, campaign) => sum + (campaignCpa(campaign) ?? 0), 0) / Math.max(1, rows.length))}</p></div>
                </div>
                <InsightList rows={rows} />
              </div>
            </SectionCard>
          </div>
          <DataTable
            data={rows}
            columns={[
              { id: 'campaign', header: 'Campaign', sortValue: (campaign) => campaign.name, mobileLabel: 'Campaign', render: (campaign) => <span className="cell-primary">{campaign.name}</span> },
              { id: 'spend', header: 'Spend', align: 'right', sortValue: (campaign) => campaign.spend, mobileLabel: 'Spend', render: (campaign) => formatINRCompact(campaign.spend) },
              { id: 'revenue', header: 'Revenue', align: 'right', sortValue: (campaign) => campaign.kpis.revenue, mobileLabel: 'Revenue', render: (campaign) => <span className="cell-strong">{formatINRCompact(campaign.kpis.revenue)}</span> },
              { id: 'cpl', header: 'CPL', align: 'right', sortValue: (campaign) => campaignCpl(campaign) ?? 0, mobileLabel: 'Cost per lead', render: (campaign) => formatINR(campaignCpl(campaign) ?? 0) },
              { id: 'cpa', header: 'CPA', align: 'right', sortValue: (campaign) => campaignCpa(campaign) ?? 0, mobileLabel: 'Cost per acquisition', render: (campaign) => formatINR(campaignCpa(campaign) ?? 0) },
              { id: 'cvr', header: 'Lead → sale', align: 'right', sortValue: (campaign) => campaignConversionRate(campaign) ?? 0, mobileLabel: 'Conversion rate', render: (campaign) => formatPercent(campaignConversionRate(campaign)) },
              { id: 'roi', header: 'ROI', align: 'right', sortValue: (campaign) => campaignRoi(campaign) ?? 0, mobileLabel: 'ROI', render: (campaign) => <span className={(campaignRoi(campaign) ?? 0) >= 0 ? 'success-text' : 'danger-text'}>{formatPercent(campaignRoi(campaign))}</span> },
            ]}
            rowKey={(campaign) => campaign.id}
            searchable={(campaign) => `${campaign.name} ${campaign.channel} ${campaign.product}`}
            searchPlaceholder="Search campaigns…"
            pageSize={10}
            initialSort={{ columnId: 'roi', direction: 'desc' }}
            caption="Campaign ROI analysis"
          />
          <DataNote>Demo ROI formula: (campaign-reported revenue − spend) ÷ spend. It is not audited financial data.</DataNote>
        </div>
      )
    }

    return null
  }

  return (
    <div className="lead-page stack-20">
      {tab !== 'overview' ? <LeadsDashboard {...dashboardCommon} leads={dashboardLeads} compact /> : null}
      {renderTab()}
      {leadOverlays}
    </div>
  )
}

function InsightList({ rows }: { rows: Array<{ name: string; spend: number; kpis: { leads: number; conversions: number; revenue: number } }> }) {
  const best = [...rows].sort((a, b) => (b.kpis.revenue / Math.max(1, b.spend)) - (a.kpis.revenue / Math.max(1, a.spend)))[0]
  const worst = [...rows].sort((a, b) => (a.kpis.revenue / Math.max(1, a.spend)) - (b.kpis.revenue / Math.max(1, b.spend)))[0]
  return (
    <div>
      <p className="insight-line"><TrendingUp size={14} />Best return ratio: <strong>{best?.name ?? '—'}</strong> at {formatPercent(best ? (best.kpis.revenue / Math.max(1, best.spend)) * 100 : null)} revenue-to-spend.</p>
      <p className="insight-line"><CircleAlert size={14} />Lowest return ratio: <strong>{worst?.name ?? '—'}</strong>. Review channel mix and lead quality before extending the flight.</p>
      <p className="insight-line"><CheckCircle2 size={14} />Attribution is demo-only. Use the export on each tab for a local CSV copy.</p>
    </div>
  )
}

interface ConvertLeadModalProps {
  lead: Lead
  campaigns: { id: string; name: string }[]
  customers: Customer[]
  salesReps: SalesRepresentative[]
  existingOpportunity: Opportunity | null
  onClose: () => void
  onConvert: (values: ConversionFormValues) => ConversionResult
}

function ConvertLeadModal({
  lead,
  campaigns,
  customers,
  salesReps,
  existingOpportunity,
  onClose,
  onConvert,
}: ConvertLeadModalProps) {
  const navigate = useNavigate()
  const [values, setValues] = useState<ConversionFormValues>(() => conversionForm(lead, salesReps))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ConversionResult | null>(null)

  useEffect(() => {
    setValues(conversionForm(lead, salesReps))
    setErrors({})
    setResult(null)
  }, [lead.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const match = useMemo(() => findCustomerMatch(customers, values), [customers, values])
  const selectedCampaign = campaigns.find((campaign) => campaign.id === values.campaignId)
  const selectedRep = salesReps.find((rep) => rep.id === values.salesRepId)

  const set = <K extends keyof ConversionFormValues>(key: K, value: ConversionFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.name.trim()) next.name = 'Customer name is required.'
    if (!values.company.trim()) next.company = 'Company is required.'
    if (!values.phone.trim()) next.phone = 'Phone is required.'
    if (values.phone.trim() && normalizePhone(values.phone).length < 8) next.phone = 'Enter a valid phone number.'
    if (!values.email.trim()) next.email = 'Email is required.'
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Enter a valid email address.'
    if (!values.product.trim()) next.product = 'Product interest is required.'
    if (!values.salesRepId) next.salesRepId = 'Assign a sales representative.'
    if (!values.customerStatus) next.customerStatus = 'Choose a customer status.'
    if (!existingOpportunity) {
      if (!values.opportunityName.trim()) next.opportunityName = 'Give the opportunity a clear name.'
      if (!values.expectedClose) next.expectedClose = 'Choose an expected close date.'
      if (values.opportunityValue.trim() && (Number.isNaN(Number(values.opportunityValue)) || Number(values.opportunityValue) < 0)) {
        next.opportunityValue = 'Enter a valid opportunity value.'
      }
    }
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return

    try {
      const conversion = onConvert(values)
      setResult(conversion)
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Conversion could not be completed.' })
    }
  }

  if (result) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Conversion complete"
        description={`${result.customerName} · ${result.company}`}
        size="wide"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button
              variant="primary"
              icon={<Target size={14} />}
              onClick={() => {
                onClose()
                navigate('/marketing/leads/sales-opportunities')
              }}
            >
              View opportunity
            </Button>
          </>
        }
      >
        <div className="conversion-success stack-16">
          <div className="conversion-success__hero">
            <span className="conversion-success__icon" aria-hidden="true"><CheckCircle2 size={26} /></span>
            <div>
              <h3>{result.customerLinked ? 'Existing customer linked' : 'Customer and opportunity created'}</h3>
              <p>Lead {lead.id} is marked Converted. The lead record and its full activity history are preserved.</p>
            </div>
          </div>
          <div className="lead-profile__facts">
            <div><span>Customer</span><strong>{result.customerId} · {result.customerName}</strong></div>
            <div><span>Company</span><strong>{result.company}</strong></div>
            <div><span>Sales representative</span><strong>{result.salesRepName}</strong></div>
            <div><span>Opportunity</span><strong>{result.opportunityId} · {result.opportunityName}</strong></div>
            <div><span>Opportunity treatment</span><strong>{result.opportunityLinked ? 'Linked existing' : 'New opportunity'}</strong></div>
            <div><span>Lead status</span><strong>Converted</strong></div>
          </div>
          <div className="callout callout--success">
            <CheckCircle2 size={14} />
            <span>Saved locally in this browser. No real CRM, sales system or email service was contacted.</span>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Convert qualified lead"
      description={`${lead.name} · ${lead.company} · ${lead.id}`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<BadgeCheck size={14} />} onClick={submit} disabled={!selectedRep}>
            Complete conversion
          </Button>
        </>
      }
    >
      <div className="conversion-flow" aria-label="Conversion steps">
        <div className="conversion-step is-active">
          <span>1</span>
          <div><strong>Customer details</strong><small>Review the customer record</small></div>
        </div>
        <ChevronRight size={15} aria-hidden="true" />
        <div className="conversion-step is-active">
          <span>2</span>
          <div><strong>Sales assignment</strong><small>Choose the representative</small></div>
        </div>
        <ChevronRight size={15} aria-hidden="true" />
        <div className="conversion-step is-active">
          <span>3</span>
          <div><strong>Opportunity</strong><small>Link or create the deal</small></div>
        </div>
      </div>

      {match ? (
        <div className="callout callout--info mt-12">
          <CircleAlert size={14} />
          <span>
            Existing customer <strong>{match.id} · {match.name}</strong> matches this email or phone.
            Completing the conversion will link this lead to that customer instead of creating a duplicate.
          </span>
        </div>
      ) : null}

      <div className="stack-16 mt-16">
        <div className="card card--pad-sm">
          <p className="form-section-title">Customer details</p>
          <p className="text-xs muted" style={{ marginBottom: 12 }}>
            {match ? 'Matched customer identity is preserved. The sales representative and notes are refreshed.' : 'These details create the local customer record linked to this lead.'}
          </p>
          <div className="form-grid">
            <Field label="Customer name" htmlFor="convert-name" required error={errors.name}>
              <input id="convert-name" className="input" value={values.name} onChange={(event) => set('name', event.target.value)} disabled={Boolean(match)} aria-invalid={Boolean(errors.name)} />
            </Field>
            <Field label="Company" htmlFor="convert-company" required error={errors.company}>
              <input id="convert-company" className="input" value={values.company} onChange={(event) => set('company', event.target.value)} disabled={Boolean(match)} aria-invalid={Boolean(errors.company)} />
            </Field>
            <Field label="Phone" htmlFor="convert-phone" required error={errors.phone}>
              <input id="convert-phone" className="input" value={values.phone} onChange={(event) => set('phone', event.target.value)} disabled={Boolean(match)} aria-invalid={Boolean(errors.phone)} />
            </Field>
            <Field label="Email" htmlFor="convert-email" required error={errors.email}>
              <input id="convert-email" className="input" type="email" value={values.email} onChange={(event) => set('email', event.target.value)} disabled={Boolean(match)} aria-invalid={Boolean(errors.email)} />
            </Field>
            <Field label="Location" htmlFor="convert-location">
              <input id="convert-location" className="input" value={values.location} onChange={(event) => set('location', event.target.value)} disabled={Boolean(match)} />
            </Field>
            <Field label="Industry" htmlFor="convert-industry">
              <input id="convert-industry" className="input" value={values.industry} onChange={(event) => set('industry', event.target.value)} disabled={Boolean(match)} />
            </Field>
            <Field label="Source" htmlFor="convert-source">
              <select id="convert-source" className="select" value={values.source} onChange={(event) => set('source', event.target.value as Lead['source'])}>
                {LEAD_SOURCE_OPTIONS.map((source) => <option key={source}>{source}</option>)}
              </select>
            </Field>
            <Field label="Source campaign" htmlFor="convert-campaign">
              <select id="convert-campaign" className="select" value={values.campaignId} onChange={(event) => set('campaignId', event.target.value)}>
                <option value="">Unattributed</option>
                {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </select>
            </Field>
            <Field label="Product interest" htmlFor="convert-product" required error={errors.product}>
              <input id="convert-product" className="input" value={values.product} onChange={(event) => set('product', event.target.value)} aria-invalid={Boolean(errors.product)} />
            </Field>
            <Field label="Customer status" htmlFor="convert-status">
              <select id="convert-status" className="select" value={values.customerStatus} onChange={(event) => set('customerStatus', event.target.value as CustomerStatus)}>
                {(['Active', 'On hold', 'Inactive'] as CustomerStatus[]).map((status) => <option key={status}>{status}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="card card--pad-sm">
          <p className="form-section-title">Sales assignment</p>
          <p className="text-xs muted" style={{ marginBottom: 12 }}>The representative is shown on the customer, opportunity and linked tables.</p>
          <div className="form-grid">
            <Field label="Sales representative" htmlFor="convert-rep" required error={errors.salesRepId} hint="Sample sales representatives are used in this local demo.">
              <select id="convert-rep" className="select" value={values.salesRepId} onChange={(event) => set('salesRepId', event.target.value)} aria-invalid={Boolean(errors.salesRepId)}>
                <option value="">Choose a representative</option>
                {salesReps.filter((rep) => rep.active).map((rep) => <option key={rep.id} value={rep.id}>{rep.name} · {rep.region}</option>)}
              </select>
            </Field>
            <Field label="Assignment notes" htmlFor="convert-notes" className="full">
              <textarea id="convert-notes" className="textarea" rows={3} value={values.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Handover context, customer requirement or next step…" />
            </Field>
          </div>
          {selectedRep ? (
            <div className="row-8 mt-8 wrap">
              <Badge tone="accent">{selectedRep.name}</Badge>
              <span className="text-xs muted">{selectedRep.email} · {selectedRep.phone}</span>
            </div>
          ) : null}
        </div>

        <div className="card card--pad-sm">
          <p className="form-section-title">Sales opportunity</p>
          {existingOpportunity ? (
            <div className="callout callout--info" style={{ marginTop: 8 }}>
              <CheckCircle2 size={14} />
              <span>
                Existing opportunity <strong>{existingOpportunity.id} · {existingOpportunity.name}</strong> will be linked to the customer and representative. No duplicate opportunity is created.
              </span>
            </div>
          ) : (
            <div className="form-grid" style={{ marginTop: 8 }}>
              <Field label="Opportunity name" htmlFor="convert-opp-name" required error={errors.opportunityName} className="full">
                <input id="convert-opp-name" className="input" value={values.opportunityName} onChange={(event) => set('opportunityName', event.target.value)} aria-invalid={Boolean(errors.opportunityName)} />
              </Field>
              <Field label="Estimated value (INR)" htmlFor="convert-opp-value" required error={errors.opportunityValue}>
                <input id="convert-opp-value" className="input" type="number" min="0" step="1000" value={values.opportunityValue} onChange={(event) => set('opportunityValue', event.target.value)} aria-invalid={Boolean(errors.opportunityValue)} />
              </Field>
              <Field label="Stage" htmlFor="convert-opp-stage">
                <select id="convert-opp-stage" className="select" value={values.opportunityStage} onChange={(event) => set('opportunityStage', event.target.value as OpportunityStage)}>
                  {OPP_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
                </select>
              </Field>
              <Field label="Expected close" htmlFor="convert-opp-close" required error={errors.expectedClose}>
                <input id="convert-opp-close" className="input" type="date" value={values.expectedClose} onChange={(event) => set('expectedClose', event.target.value)} aria-invalid={Boolean(errors.expectedClose)} />
              </Field>
            </div>
          )}
        </div>

        <div className="conversion-review">
          <div><span>Lead</span><strong>{lead.id}</strong></div>
          <div><span>Customer</span><strong>{match?.id ?? 'New record'}</strong></div>
          <div><span>Campaign</span><strong>{selectedCampaign?.name ?? 'Unattributed'}</strong></div>
          <div><span>Sales rep</span><strong>{selectedRep?.name ?? 'Not assigned'}</strong></div>
        </div>
        {errors.form ? <DemoNote tone="warning">{errors.form}</DemoNote> : null}
        <DataNote>Customer and opportunity records are stored only in this browser. The lead, its notes and its activity history remain intact.</DataNote>
      </div>
    </Modal>
  )
}

interface OpportunityEditModalProps {
  opportunity: Opportunity
  customers: Customer[]
  salesReps: SalesRepresentative[]
  campaigns: { id: string; name: string }[]
  onClose: () => void
  onSave: (values: {
    name: string
    stage: OpportunityStage
    value: number
    probability: number
    expectedClose: string
    salesRepId: string
    notes: string
  }) => void
}

function OpportunityEditModal({
  opportunity,
  customers,
  salesReps,
  campaigns,
  onClose,
  onSave,
}: OpportunityEditModalProps) {
  const [values, setValues] = useState(() => ({
    name: opportunity.name,
    stage: opportunity.stage,
    value: String(opportunity.value),
    probability: String(opportunity.probability),
    expectedClose: opportunity.expectedClose,
    salesRepId: opportunity.salesRepId ?? salesReps.find((rep) => rep.active)?.id ?? '',
    notes: opportunity.notes,
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const customer = customers.find((item) => item.id === opportunity.customerId)

  const set = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!values.name.trim()) next.name = 'Opportunity name is required.'
    if (Number.isNaN(Number(values.value)) || Number(values.value) < 0) next.value = 'Enter a valid value.'
    if (Number.isNaN(Number(values.probability)) || Number(values.probability) < 0 || Number(values.probability) > 100) next.probability = 'Probability must be 0–100.'
    if (!values.expectedClose) next.expectedClose = 'Choose a close date.'
    if (!values.salesRepId) next.salesRepId = 'Assign a sales representative.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave({
      name: values.name,
      stage: values.stage as OpportunityStage,
      value: Number(values.value),
      probability: Number(values.probability),
      expectedClose: values.expectedClose,
      salesRepId: values.salesRepId,
      notes: values.notes,
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit sales opportunity"
      description={`${opportunity.id} · ${customer ? `${customer.id} · ${customer.company}` : `${opportunity.leadName} · lead`}`}
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Save opportunity</Button>
        </>
      }
    >
      <div className="stack-16">
        <div className="lead-profile__facts">
          <div><span>Customer</span><strong>{customer ? `${customer.name} · ${customer.company}` : `${opportunity.leadName} (lead)`}</strong></div>
          <div><span>Source campaign</span><strong>{campaigns.find((campaign) => campaign.id === opportunity.campaignId)?.name ?? 'Unattributed'}</strong></div>
          <div><span>Product</span><strong>{opportunity.product}</strong></div>
          <div><span>Status</span><strong>{opportunityStatus(values.stage as OpportunityStage)}</strong></div>
        </div>
        <div className="form-grid">
          <Field label="Opportunity name" htmlFor="opp-name" required error={errors.name} className="full">
            <input id="opp-name" className="input" value={values.name} onChange={(event) => set('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
          </Field>
          <Field label="Stage" htmlFor="opp-stage">
            <select id="opp-stage" className="select" value={values.stage} onChange={(event) => set('stage', event.target.value)}>
              {OPP_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
            </select>
          </Field>
          <Field label="Sales representative" htmlFor="opp-rep" required error={errors.salesRepId}>
            <select id="opp-rep" className="select" value={values.salesRepId} onChange={(event) => set('salesRepId', event.target.value)} aria-invalid={Boolean(errors.salesRepId)}>
              <option value="">Choose a representative</option>
              {salesReps.filter((rep) => rep.active).map((rep) => <option key={rep.id} value={rep.id}>{rep.name} · {rep.region}</option>)}
            </select>
          </Field>
          <Field label="Value (INR)" htmlFor="opp-value" required error={errors.value}>
            <input id="opp-value" className="input" type="number" min="0" step="1000" value={values.value} onChange={(event) => set('value', event.target.value)} aria-invalid={Boolean(errors.value)} />
          </Field>
          <Field label="Probability (%)" htmlFor="opp-probability" required error={errors.probability}>
            <input id="opp-probability" className="input" type="number" min="0" max="100" value={values.probability} onChange={(event) => set('probability', event.target.value)} aria-invalid={Boolean(errors.probability)} />
          </Field>
          <Field label="Expected close" htmlFor="opp-close" required error={errors.expectedClose}>
            <input id="opp-close" className="input" type="date" value={values.expectedClose} onChange={(event) => set('expectedClose', event.target.value)} aria-invalid={Boolean(errors.expectedClose)} />
          </Field>
          <Field label="Notes" htmlFor="opp-notes" className="full">
            <textarea id="opp-notes" className="textarea" value={values.notes} onChange={(event) => set('notes', event.target.value)} />
          </Field>
        </div>
        <DataNote>Changes update the local demo pipeline only. No sales system or finance record is changed.</DataNote>
      </div>
    </Modal>
  )
}
