/* ============================================================
   Totally ERP — Marketing Portal domain types
   Frontend-only demonstration models. No backend contracts.
   ============================================================ */

import type { MarketingExpenseRequest, MonthlyPlan, WorkflowConfig } from './workflow'

export type ModuleId =
  | 'dashboard'
  | 'plans'
  | 'digital'
  | 'field'
  | 'trade'
  | 'agencies'
  | 'assets'
  | 'leads'
  | 'expenses'
  | 'approvals'
  | 'reports'
  | 'assistant'

export type CampaignChannel =
  | 'Digital'
  | 'Social'
  | 'Email'
  | 'Field'
  | 'Trade'
  | 'Events'
  | 'Influencer'
  | 'Retail'
  | 'Content'

export type CampaignStatus =
  | 'Draft'
  | 'Planned'
  | 'Active'
  | 'Paused'
  | 'Completed'
  | 'Archived'

export interface CampaignKpis {
  impressions: number
  clicks: number
  leads: number
  qualifiedLeads: number
  conversions: number
  revenue: number
}

export interface Campaign {
  id: string
  name: string
  objective: string
  channel: CampaignChannel
  audience: string
  product: string
  startDate: string
  endDate: string
  budget: number
  spend: number
  status: CampaignStatus
  owner: string
  kpis: CampaignKpis
  createdAt: string
}

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up Required'
  | 'Qualified'
  | 'Sent to Sales'
  | 'Converted'
  | 'Rejected'
  | 'Not Interested'
  | 'Lost'

export type LeadPriority = 'Urgent' | 'High' | 'Medium' | 'Low'

/** The seven source categories used by the role-based marketing workflow. */
export type LeadSourceCategory =
  | 'Digital Marketing'
  | 'Field Marketing'
  | 'Trade Marketing'
  | 'Campaign'
  | 'Website'
  | 'Referral'
  | 'Other'

export type LeadSource =
  | 'Digital Campaign'
  | 'Field Visit'
  | 'Trade Event'
  | 'Referral'
  | 'Website Enquiry'
  | 'Retail Activity'
  | 'Social Media'
  | 'Website'
  | 'WhatsApp'
  | 'Campaign'
  | 'Events'
  | 'Manual Entry'
  | 'Other'

export type LeadActivityType =
  | 'Call'
  | 'Meeting'
  | 'Visit'
  | 'Email'
  | 'WhatsApp'
  | 'Note'
  | 'Status Change'
  | 'Conversion'
  | 'Assignment'
  | 'Owner Change'
  | 'Follow-up'
  | 'Qualification'
  | 'Update'
  | 'Sales Update'

export interface LeadActivity {
  id: string
  type: LeadActivityType
  at: string
  by: string
  summary: string
}

export type PurchaseIntent = 'Unknown' | 'Low' | 'Medium' | 'High'
export type DecisionAuthority = 'Decision Maker' | 'Influencer' | 'Evaluator' | 'Unknown'
export type SalesHandoffStatus =
  | 'Assigned'
  | 'Contacted'
  | 'Meeting Scheduled'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Won'
  | 'Lost'

export interface LeadInterests {
  /** Multiple product or service interests, kept alongside the primary `product` field. */
  products: string[]
  category?: string
  features: string[]
  preferredBrand?: string
  likes: string[]
  dislikes: string[]
  /** Recorded requirement statements that can be added as individual tags. */
  requirements: string[]
  priceRange?: string
  budget?: number | null
  preferredChannel?: string
  preferredContactTime?: string
  preferredLanguage?: string
  purchasePurpose?: string
  expectedPurchaseDate?: string
  specialRequirements?: string
  questions: string[]
  problems: string[]
  /** Free-form, employee-authored description of what the customer likes and needs. */
  summary?: string
}

export interface LeadQualification {
  intent?: PurchaseIntent
  estimatedValue?: number | null
  budgetRange?: string
  decisionAuthority?: DecisionAuthority
  purchaseTimeline?: string
  notes?: string
  mainRequirement?: string
  reasonForInterest?: string
  reasonForRejection?: string
}

export interface LeadAttribution {
  campaignName?: string
  adSource?: string
  landingPage?: string
  firstContactDate?: string
  latestContactDate?: string
  referrerName?: string
  referrerContact?: string
  notes?: string
}

export interface LeadFollowUp {
  id: string
  dueAt: string
  method: 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Visit' | 'Other'
  reason: string
  reminder?: string
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  createdAt: string
  createdBy: string
  completedAt?: string
  outcome?: string
  latestResponse?: string
  newRequirements?: string
  concerns?: string
  updatedBudget?: number | null
  purchaseReadiness?: string
  agreedNextSteps?: string
}

/**
 * Customer communication is tracked separately from the Sales opportunity.
 * "Simulated (not delivered)" is deliberately explicit because this demo has
 * no WhatsApp or email provider connected.
 */
export type CustomerCommunicationStatus =
  | 'Handover Created'
  | 'Sales Employee Assigned'
  | 'Awaiting First Contact'
  | 'Contact Attempted'
  | 'Customer Contacted'
  | 'Follow-Up Scheduled'
  | 'Meeting Scheduled'
  | 'Proposal in Progress'
  | 'Negotiation'
  | 'Converted'
  | 'Lost'
  | 'Reassignment Required'

export type HandoverEventType =
  | 'Handover Created'
  | 'Sales Notified'
  | 'Customer Notified'
  | 'Contact Attempt'
  | 'First Contact'
  | 'Follow-Up Scheduled'
  | 'Sales Status Update'
  | 'Reassigned'
  | 'Supervisory Note'
  | 'Converted'
  | 'Lost'

export interface HandoverHistoryEvent {
  id: string
  type: HandoverEventType
  at: string
  by: string
  summary: string
}

export interface HandoverNotificationRecord {
  id: string
  recipientId: string
  recipientName: string
  recipientRole: 'Sales Employee' | 'Sales Manager'
  title: string
  body: string
  at: string
  /** This demo records a simulated in-app notification, never a delivery. */
  status: 'Simulated'
  actionLabel: string
  href?: string
}

export interface CustomerNotificationRecord {
  id: string
  channel: 'WhatsApp' | 'Email'
  recipient: string
  subject?: string
  body: string
  preparedAt: string
  simulatedAt?: string
  /** Never treat this as provider delivery. */
  status: 'Preview ready' | 'Simulated (not delivered)'
}

export interface SalesContactAttempt {
  id: string
  at: string
  by: string
  method: LeadFollowUp['method']
  outcome: string
  notes?: string
  reachedCustomer: boolean
}

export interface SalesReassignmentRecord {
  id: string
  at: string
  fromSalesRepId: string
  toSalesRepId: string
  fromSalesManagerId?: string
  toSalesManagerId: string
  reason: string
  authorizedBy: string
}

export interface SalesSupervisoryNote {
  id: string
  at: string
  by: string
  note: string
}

export interface LeadSalesAssignment {
  /** Shared handover record id. The lead remains the single customer record. */
  handoverId?: string
  salesRepId: string
  /** Every handover has a supervising Sales Manager from the start. */
  salesManagerId?: string
  assignedAt: string
  /** Configurable expected first-contact target for this handover. */
  expectedFirstContact?: string | null
  firstContactAt?: string | null
  handoffNote: string
  salesStatus: SalesHandoffStatus
  lastContact?: string | null
  nextAction?: string
  dealStatus?: SalesHandoffStatus
  updatedAt: string
  nextFollowUp?: string | null
  requirementSummary?: string
  communicationStatus?: CustomerCommunicationStatus
  customerNotifications?: CustomerNotificationRecord[]
  notifications?: HandoverNotificationRecord[]
  handoverHistory?: HandoverHistoryEvent[]
  contactAttempts?: SalesContactAttempt[]
  reassignments?: SalesReassignmentRecord[]
  supervisoryNotes?: SalesSupervisoryNote[]
  reassignmentRequired?: boolean
}

/**
 * Marketing rejection is a closed outcome, separate from a sales deal being
 * Lost. The previous status and follow-up are kept so an accidental rejection
 * can be restored without losing history.
 */
export interface LeadRejection {
  reason: string
  notes?: string
  rejectedAt: string
  rejectedBy: string
  previousStatus: LeadStatus
  previousNextFollowUp?: string | null
}

/** Set only after the customer-conversion workflow succeeds. */
export interface LeadConversion {
  convertedAt: string
  convertedBy: string
  customerId: string
  opportunityId?: string
  outcome?: string
}

export interface Lead {
  id: string
  name: string
  company: string
  phone: string
  email: string
  location: string
  industry: string
  source: LeadSource
  /** Canonical workflow source category selected when the lead is created. */
  sourceCategory?: LeadSourceCategory
  /** Optional specific source detail, such as social media or an event name. */
  sourceDetail?: string
  /** Optional marketing activity or plan activity that produced the lead. */
  marketingActivity?: string
  campaignId: string | null
  product: string
  assignedTo: string
  /** Marketing employee who captured or generated the lead. */
  generatedBy?: string
  status: LeadStatus
  priority: LeadPriority
  nextFollowUp: string | null
  notes: string
  createdAt: string
  lastContact: string
  converted: boolean
  customerId?: string
  lostReason?: string
  activities: LeadActivity[]
  // ---- Enhanced lead profile (all optional for older saved demo records) ----
  whatsapp?: string
  jobTitle?: string
  customerType?: string
  city?: string
  state?: string
  country?: string
  address?: string
  photoUrl?: string
  interests?: LeadInterests
  qualification?: LeadQualification
  attribution?: LeadAttribution
  followUps?: LeadFollowUp[]
  salesAssignment?: LeadSalesAssignment
  /** Present when the lead was rejected by marketing. */
  rejection?: LeadRejection
  /** Present only after a successful customer conversion. */
  conversion?: LeadConversion
  /** Employee-authored summary of the next recommended action. */
  nextAction?: string
  /** Solutions the marketing employee discussed with the customer. */
  solutionsDiscussed?: string
  /** Materials or information already shared with the customer. */
  informationShared?: string
}

export type OpportunityStage =
  | 'Identified'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Won'
  | 'Lost'

export interface Opportunity {
  id: string
  name: string
  leadId: string
  leadName: string
  customerId?: string
  salesRepId?: string
  campaignId: string | null
  product: string
  value: number
  probability: number
  expectedClose: string
  assignedTo: string
  stage: OpportunityStage
  notes: string
  createdAt: string
}

export type CustomerStatus = 'Active' | 'On hold' | 'Inactive'

export interface Customer {
  id: string
  name: string
  company: string
  phone: string
  email: string
  location: string
  industry: string
  source: LeadSource
  campaignId: string | null
  product: string
  leadId: string
  salesRepId: string
  opportunityId?: string
  status: CustomerStatus
  notes: string
  createdAt: string
}

export interface SalesRepresentative {
  id: string
  name: string
  email: string
  phone: string
  region: string
  role: string
  initials: string
  active: boolean
  sample: true
  /** Display title used on customer-facing handover previews. */
  designation?: string
  /** Existing reporting relationship used to derive the supervising manager. */
  managerId?: string | null
  /** Approved business contact details, safe to share with customers. */
  businessPhone?: string
  businessEmail?: string
  availability?: 'Available' | 'Busy' | 'On leave'
  approvedForCustomerContact?: boolean
}

export type PlanType = 'Annual' | 'Quarterly' | 'Campaign'
export type PlanStatus = 'Draft' | 'In Review' | 'Approved' | 'Active' | 'Closed'

export interface Plan {
  id: string
  title: string
  type: PlanType
  year: number
  quarter?: 1 | 2 | 3 | 4
  goal: string
  budget: number
  spent: number
  status: PlanStatus
  owner: string
  campaignId?: string | null
  createdAt: string
  notes: string
}

export interface FieldTeamMember {
  id: string
  name: string
  region: string
  visitsToday: number
  visitsCompleted: number
  leads: number
  target: number
  phone: string
  avatarTone: string
}

export type VisitType = 'Field Visit' | 'Store Visit' | 'Demo' | 'Dealer Visit'
export type VisitStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'

export interface FieldVisit {
  id: string
  business: string
  contact: string
  leadId: string | null
  purpose: string
  type: VisitType
  date: string
  time: string
  location: string
  assignedTo: string
  notes: string
  demoFollowUp: string
  checklist: string[]
  status: VisitStatus
  createdAt: string
}

export interface MarketResearch {
  id: string
  competitor: string
  region: string
  observation: string
  productFeedback: string
  interest: 'High' | 'Medium' | 'Low'
  pricingObservation: string
  submittedBy: string
  date: string
}

export interface SocialPost {
  id: string
  channel: 'Facebook' | 'Instagram' | 'LinkedIn' | 'YouTube' | 'X'
  title: string
  content: string
  date: string
  status: 'Draft' | 'Scheduled' | 'Published' | 'Archived'
  campaignId: string | null
  engagement: number
}

export interface PaidAdCampaign {
  id: string
  platform: 'Google Ads' | 'Meta Ads' | 'LinkedIn Ads' | 'YouTube Ads'
  name: string
  campaignId: string | null
  budget: number
  spend: number
  impressions: number
  clicks: number
  conversions: number
  status: 'Draft' | 'Active' | 'Paused' | 'Ended'
}

export interface EmailCampaign {
  id: string
  name: string
  subject: string
  previewText: string
  audience: string
  status: 'Draft' | 'Scheduled' | 'Sent'
  scheduledAt: string
  sent: number
  openRate: number
  clickRate: number
  body: string
  campaignId: string | null
}

export interface SeoTask {
  id: string
  task: string
  page: string
  owner: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'To Do' | 'In Progress' | 'Done'
  dueDate: string
  impact: string
}

export interface Keyword {
  id: string
  keyword: string
  volume: number
  position: number
  change: number
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational'
}

export interface ContentItem {
  id: string
  title: string
  type: 'Idea' | 'Copy' | 'Brief'
  campaignId: string | null
  status: 'Idea' | 'Draft' | 'In Review' | 'Approved'
  body: string
  owner: string
  createdAt: string
  channel: string
}

export interface Influencer {
  id: string
  name: string
  handle: string
  category: string
  audience: string
  followers: number
  estimatedFee: number
  contactStatus: 'Not Contacted' | 'Contacted' | 'Negotiating' | 'Confirmed' | 'Declined'
  campaignId: string | null
  performanceScore: number
  engagementRate: number
}

export interface VideoProject {
  id: string
  title: string
  campaignId: string | null
  stage: 'Brief' | 'Script' | 'Shoot' | 'Editing' | 'Review' | 'Published'
  team: string[]
  publishDate: string
  brief: string
  status: 'On Track' | 'At Risk' | 'Delayed' | 'Completed'
  progress: number
}

export interface StoreActivity {
  id: string
  store: string
  dealer: string
  activityType: 'Poster Display' | 'Product Demo' | 'In-store Promo' | 'Dealer Meet' | 'Shelf Audit'
  location: string
  date: string
  assignedTo: string
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled'
  campaignId: string | null
}

export interface Poster {
  id: string
  name: string
  campaignId: string | null
  quantity: number
  distributed: number
  status: 'Design' | 'Printing' | 'Ready' | 'Distributed'
  size: string
  updatedAt: string
}

export interface Promotion {
  id: string
  name: string
  product: string
  stores: number
  startDate: string
  endDate: string
  status: 'Draft' | 'Active' | 'Scheduled' | 'Ended'
  campaignId: string | null
  offer: string
}

export interface DealerScheme {
  id: string
  name: string
  eligibleDealers: number
  validFrom: string
  validTo: string
  terms: string
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Expired'
}

export interface StoreAgreement {
  id: string
  store: string
  type: 'Visibility' | 'Display Space' | 'Exclusivity' | 'Promotion'
  startDate: string
  endDate: string
  renewalReminder: string
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft'
  documentName: string
  value: number
}

export interface TradeEvent {
  id: string
  name: string
  venue: string
  city: string
  date: string
  budget: number
  team: string[]
  checklist: { label: string; done: boolean }[]
  status: 'Planning' | 'Confirmed' | 'Completed' | 'Cancelled'
  results: string
}

export type PartnerCategory =
  | 'Creative Agency'
  | 'Media Agency'
  | 'Influencer'
  | 'Production House'
  | 'Printing Vendor'
  | 'Event Organizer'

export interface Agency {
  id: string
  name: string
  category: PartnerCategory
  contactPerson: string
  email: string
  phone: string
  location: string
  assignedCampaigns: string[]
  contractStatus: 'Active' | 'Expiring' | 'Expired' | 'Draft'
  performanceScore: number
  completion: number
  budgetAdherence: number
  quality: number
  timeliness: number
  notes: string
}

export type AssetCategory =
  | 'Posters & Banners'
  | 'Videos & Photos'
  | 'Catalogues & Brochures'
  | 'Digital Creatives'
  | 'Promotional Materials'

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  campaignId: string | null
  createdAt: string
  owner: string
  version: string
  status: 'Draft' | 'Under Review' | 'Approved'
  kind: 'image' | 'video' | 'document'
  fileName: string
  sizeLabel: string
  tone: string
  localUrl?: string
  note: string
}

export type ExpenseCategory =
  | 'Advertising'
  | 'Content Production'
  | 'Events'
  | 'Field Marketing'
  | 'Printing'
  | 'Influencer Fees'
  | 'Travel'
  | 'Other'

export type ExpenseStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Paid'

export interface Expense {
  id: string
  ref: string
  category: ExpenseCategory
  campaignId: string | null
  vendorId: string | null
  amount: number
  date: string
  purpose: string
  status: ExpenseStatus
  submittedBy: string
  reviewerComment: string
  receiptName?: string
  createdAt: string
}

export interface Invoice {
  id: string
  ref: string
  vendorId: string
  campaignId: string | null
  amount: number
  dueDate: string
  status: 'Pending' | 'Approved' | 'Scheduled' | 'Paid'
  description: string
}

export interface CelebrityPayment {
  id: string
  ref: string
  influencerId: string
  campaignId: string | null
  amount: number
  dueDate: string
  status: 'Pending' | 'Approved' | 'Scheduled' | 'Paid'
  description: string
}

export interface FieldClaim {
  id: string
  ref: string
  employee: string
  purpose: string
  date: string
  amount: number
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Reimbursed'
  receiptName?: string
}

export type ApprovalType =
  | 'Campaign'
  | 'Budget'
  | 'Offer'
  | 'Contract'
  | 'Creative'
  | 'Expense'

export type ApprovalStatus =
  | 'Draft'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'
  | 'Expired'

export interface ApprovalHistoryEntry {
  at: string
  by: string
  action: string
  note?: string
}

export interface Approval {
  id: string
  title: string
  type: ApprovalType
  requestedBy: string
  requestedByMe: boolean
  submissionDate: string
  amount?: number
  status: ApprovalStatus
  reviewer: string
  comments: string
  reviewerComment?: string
  summary: string
  history: ApprovalHistoryEntry[]
}

export type ContractStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Draft'

export interface Contract {
  id: string
  name: string
  partnerId: string
  startDate: string
  endDate: string
  status: ContractStatus
  renewalDeadline: string
  usageRights: string
  rightsExpiry: string
  value: number
  scope: string
}

export type NotificationKind = 'approval' | 'followup' | 'budget' | 'expense' | 'system'

export interface AppNotification {
  id: string
  title: string
  body: string
  at: string
  read: boolean
  kind: NotificationKind
  href?: string
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  at: string
  bullets?: string[]
}

export interface Employee {
  id: string
  name: string
  email: string
  role: string
  department: string
  initials: string
  phone: string
  location: string
  joinDate: string
  targets: {
    monthlyLeads: number
    monthlyRevenue: number
    campaignCount: number
    fieldVisits: number
  }
}

export interface DemoData {
  campaigns: Campaign[]
  plans: Plan[]
  /** Role-based monthly marketing plans (frontend workflow demo). */
  monthlyPlans: MonthlyPlan[]
  /** Plan-linked marketing expenses routed through Manager and Finance review. */
  marketingExpenses: MarketingExpenseRequest[]
  workflowConfig: WorkflowConfig
  leads: Lead[]
  opportunities: Opportunity[]
  fieldTeams: FieldTeamMember[]
  fieldVisits: FieldVisit[]
  research: MarketResearch[]
  socialPosts: SocialPost[]
  paidAds: PaidAdCampaign[]
  emails: EmailCampaign[]
  seoTasks: SeoTask[]
  keywords: Keyword[]
  content: ContentItem[]
  influencers: Influencer[]
  videos: VideoProject[]
  storeActivities: StoreActivity[]
  posters: Poster[]
  promotions: Promotion[]
  dealerSchemes: DealerScheme[]
  storeAgreements: StoreAgreement[]
  tradeEvents: TradeEvent[]
  agencies: Agency[]
  assets: Asset[]
  expenses: Expense[]
  invoices: Invoice[]
  celebrityPayments: CelebrityPayment[]
  fieldClaims: FieldClaim[]
  customers: Customer[]
  salesReps: SalesRepresentative[]
  approvals: Approval[]
  contracts: Contract[]
  notifications: AppNotification[]
  aiHistory: ChatMessage[]
  assistantPlans: { id: string; name: string; objective: string; budget: number; audience: string; createdAt: string }[]
}

export interface FilterOption {
  label: string
  value: string
}
