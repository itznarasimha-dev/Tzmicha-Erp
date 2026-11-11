import type {
  Campaign,
  Lead,
  LeadPriority,
  LeadSource,
  LeadSourceCategory,
  LeadStatus,
} from '../types/marketing'
import { uid } from './format'
import { sourceCategoryForSource } from './leads'

export type LeadImportFieldKey =
  | 'name'
  | 'company'
  | 'phone'
  | 'email'
  | 'location'
  | 'industry'
  | 'source'
  | 'sourceCategory'
  | 'sourceDetail'
  | 'marketingActivity'
  | 'campaign'
  | 'product'
  | 'assignedTo'
  | 'status'
  | 'priority'
  | 'nextFollowUp'
  | 'notes'

export interface LeadImportFieldDefinition {
  key: LeadImportFieldKey
  label: string
  required: boolean
  aliases: string[]
}

export const LEAD_IMPORT_FIELDS: LeadImportFieldDefinition[] = [
  { key: 'name', label: 'Lead name', required: true, aliases: ['name', 'leadname', 'fullname', 'contactname'] },
  { key: 'company', label: 'Company', required: true, aliases: ['company', 'companyname', 'organisation', 'organization', 'business', 'account'] },
  { key: 'phone', label: 'Phone', required: true, aliases: ['phone', 'mobile', 'mobilenumber', 'phonenumber', 'contactnumber', 'contactno', 'tel', 'telephone'] },
  { key: 'email', label: 'Email', required: true, aliases: ['email', 'emailaddress', 'emailid', 'mail'] },
  { key: 'location', label: 'Location', required: false, aliases: ['location', 'city', 'region', 'address'] },
  { key: 'industry', label: 'Industry', required: false, aliases: ['industry', 'sector'] },
  { key: 'source', label: 'Source', required: false, aliases: ['source', 'leadsource', 'channel'] },
  { key: 'sourceCategory', label: 'Source category', required: false, aliases: ['sourcecategory', 'category', 'attributioncategory'] },
  { key: 'sourceDetail', label: 'Source detail', required: false, aliases: ['sourcedetail', 'sourcedescription', 'referralsource'] },
  { key: 'marketingActivity', label: 'Marketing activity', required: false, aliases: ['marketingactivity', 'activity', 'campaignactivity'] },
  { key: 'campaign', label: 'Campaign', required: false, aliases: ['campaign', 'campaignid', 'campaignname'] },
  { key: 'product', label: 'Product interest', required: false, aliases: ['product', 'productinterest', 'interest'] },
  { key: 'assignedTo', label: 'Assigned to', required: false, aliases: ['assignedto', 'owner', 'salesrep', 'assignee'] },
  { key: 'status', label: 'Status', required: false, aliases: ['status', 'leadstatus'] },
  { key: 'priority', label: 'Priority', required: false, aliases: ['priority'] },
  { key: 'nextFollowUp', label: 'Next follow-up', required: false, aliases: ['nextfollowup', 'followup', 'followupdate', 'nextcontact'] },
  { key: 'notes', label: 'Notes', required: false, aliases: ['notes', 'note', 'remarks', 'comments'] },
]

export type LeadImportMapping = Record<LeadImportFieldKey, string>

export type LeadImportRowState = 'valid' | 'duplicate' | 'invalid'

export interface LeadImportRow {
  line: number
  values: Record<LeadImportFieldKey, string>
  state: LeadImportRowState
  errors: string[]
  duplicateOf?: string
  lead: Lead | null
}

export interface LeadImportEvaluation {
  rows: LeadImportRow[]
  validRows: LeadImportRow[]
  duplicateRows: LeadImportRow[]
  invalidRows: LeadImportRow[]
}

const SOURCE_ALIASES: Record<string, LeadSource> = {
  digitalcampaign: 'Digital Campaign',
  digital: 'Digital Campaign',
  paid: 'Digital Campaign',
  googleads: 'Digital Campaign',
  metaads: 'Digital Campaign',
  fieldvisit: 'Field Visit',
  field: 'Field Visit',
  tradeevent: 'Trade Event',
  event: 'Trade Event',
  events: 'Trade Event',
  referral: 'Referral',
  referred: 'Referral',
  websiteenquiry: 'Website Enquiry',
  website: 'Website',
  web: 'Website',
  seo: 'Website Enquiry',
  organic: 'Website Enquiry',
  retailactivity: 'Retail Activity',
  retail: 'Retail Activity',
  instore: 'Retail Activity',
  socialmedia: 'Social Media',
  social: 'Social Media',
  instagram: 'Social Media',
  facebook: 'Social Media',
  linkedin: 'Social Media',
  whatsapp: 'WhatsApp',
  campaign: 'Campaign',
  manual: 'Manual Entry',
  manualentry: 'Manual Entry',
  other: 'Other',
}

const STATUS_ALIASES: Record<string, LeadStatus> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  followup: 'Follow-up Required',
  followuprequired: 'Follow-up Required',
  qualified: 'Qualified',
  senttosales: 'Sent to Sales',
  rejected: 'Rejected',
  notinterested: 'Not Interested',
  lost: 'Lost',
}

const PRIORITY_ALIASES: Record<string, LeadPriority> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  med: 'Medium',
  low: 'Low',
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function emptyLeadImportMapping(): LeadImportMapping {
  return LEAD_IMPORT_FIELDS.reduce((mapping, field) => {
    mapping[field.key] = ''
    return mapping
  }, {} as LeadImportMapping)
}

export function autoMapLeadColumns(headers: string[]): LeadImportMapping {
  const normalised = new Map(headers.map((header) => [normalizeHeader(header), header]))
  return LEAD_IMPORT_FIELDS.reduce((mapping, field) => {
    const match = field.aliases
      .map((alias) => normalised.get(normalizeHeader(alias)))
      .find(Boolean)
    mapping[field.key] = match ?? ''
    return mapping
  }, emptyLeadImportMapping())
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '')
}

function normalizeSource(value: string): LeadSource {
  const key = normalizeHeader(value)
  return SOURCE_ALIASES[key] ?? 'Other'
}

const CATEGORY_ALIASES: Record<string, LeadSourceCategory> = {
  digitalmarketing: 'Digital Marketing',
  digital: 'Digital Marketing',
  fieldmarketing: 'Field Marketing',
  field: 'Field Marketing',
  trademarketing: 'Trade Marketing',
  trade: 'Trade Marketing',
  campaign: 'Campaign',
  campaigns: 'Campaign',
  website: 'Website',
  web: 'Website',
  referral: 'Referral',
  referred: 'Referral',
  other: 'Other',
}

function normalizeSourceCategory(value: string, source: LeadSource): LeadSourceCategory {
  const key = normalizeHeader(value)
  if (key && CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key]
  return sourceCategoryForSource(source)
}

function normalizeStatus(value: string): { status: LeadStatus; error?: string } {
  const key = normalizeHeader(value)
  if (!key) return { status: 'New' }
  if (key === 'converted') {
    return {
      status: 'Qualified',
      error: 'Converted leads must use the conversion workflow. Import this row as Qualified or another open status.',
    }
  }
  const status = STATUS_ALIASES[key]
  if (!status) {
    return { status: 'New', error: `Status “${value}” is not recognised.` }
  }
  return { status }
}

function normalizePriority(value: string): LeadPriority {
  return PRIORITY_ALIASES[normalizeHeader(value)] ?? 'Medium'
}

function parseFollowUp(value: string): { value: string | null; error?: string } {
  const trimmed = value.trim()
  if (!trimmed) return { value: null }
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return { value: null, error: `Follow-up date “${trimmed}” is not valid.` }
  }
  return { value: date.toISOString() }
}

function findCampaign(campaigns: Campaign[], value: string): Campaign | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const asKey = normalizeHeader(trimmed)
  return campaigns.find(
    (campaign) =>
      campaign.id.toLowerCase() === trimmed.toLowerCase() ||
      normalizeHeader(campaign.name) === asKey,
  )
}

export function evaluateLeadImport({
  headers,
  rows,
  mapping,
  existingLeads,
  campaigns,
}: {
  headers: string[]
  rows: string[][]
  mapping: LeadImportMapping
  existingLeads: Lead[]
  campaigns: Campaign[]
}): LeadImportEvaluation {
  const headerIndex = new Map(headers.map((header, index) => [header, index]))
  const emailOwners = new Map<string, string>()
  const phoneOwners = new Map<string, string>()

  existingLeads.forEach((lead) => {
    const email = normalizeEmail(lead.email)
    const phone = normalizePhone(lead.phone)
    if (email) emailOwners.set(email, lead.name)
    if (phone) phoneOwners.set(phone, lead.name)
  })

  const evaluateRow = (values: string[], line: number): LeadImportRow => {
    const record = LEAD_IMPORT_FIELDS.reduce((result, field) => {
      const header = mapping[field.key]
      const index = header ? headerIndex.get(header) : undefined
      result[field.key] = index === undefined ? '' : (values[index] ?? '').trim()
      return result
    }, {} as Record<LeadImportFieldKey, string>)

    const errors: string[] = []
    if (!record.name) errors.push('Lead name is required.')
    if (!record.company) errors.push('Company is required.')
    if (!record.email) errors.push('Email is required.')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
      errors.push('Enter a valid email address.')
    }
    const phoneDigits = normalizePhone(record.phone)
    if (!record.phone) errors.push('Phone is required.')
    else if (phoneDigits.length < 8) errors.push('Enter a valid phone number with at least 8 digits.')

    const statusResult = normalizeStatus(record.status)
    if (statusResult.error) errors.push(statusResult.error)
    const followUp = parseFollowUp(record.nextFollowUp)
    if (followUp.error) errors.push(followUp.error)
    const campaign = findCampaign(campaigns, record.campaign)

    const emailKey = normalizeEmail(record.email)
    const phoneKey = phoneDigits
    let duplicateOf: string | undefined
    let state: LeadImportRowState = 'invalid'

    if (errors.length === 0) {
      duplicateOf =
        (emailKey ? emailOwners.get(emailKey) : undefined) ??
        (phoneKey ? phoneOwners.get(phoneKey) : undefined)
      state = duplicateOf ? 'duplicate' : 'valid'
    }

    const now = new Date().toISOString()
    const source = normalizeSource(record.source)
    const lead: Lead | null =
      state === 'valid'
        ? {
            id: uid('LD'),
            name: record.name,
            company: record.company,
            phone: record.phone,
            email: record.email,
            location: record.location,
            industry: record.industry || 'General',
            source,
            sourceCategory: normalizeSourceCategory(record.sourceCategory, source),
            sourceDetail: record.sourceDetail || undefined,
            marketingActivity: record.marketingActivity || undefined,
            campaignId: campaign?.id ?? null,
            product: record.product || 'Portfolio',
            assignedTo: record.assignedTo || 'Ananya Rao',
            status: statusResult.status,
            priority: normalizePriority(record.priority),
            nextFollowUp: followUp.value,
            notes: record.notes || 'Imported from a CSV file into the local demo workspace.',
            createdAt: now,
            lastContact: now,
            converted: false,
            interests: {
              products: record.product ? [record.product] : [],
              features: [],
              likes: [],
              dislikes: [],
              requirements: [],
              questions: [],
              problems: [],
            },
            qualification: {
              notes: record.notes,
              mainRequirement: record.notes,
            },
            attribution: {
              firstContactDate: now,
              latestContactDate: now,
            },
            followUps: followUp.value
              ? [
                  {
                    id: uid('FU'),
                    dueAt: followUp.value,
                    method: 'Call',
                    reason: 'Follow-up date supplied in the imported CSV row.',
                    status: 'Scheduled',
                    createdAt: now,
                    createdBy: 'CSV import',
                  },
                ]
              : [],
            activities: [
              {
                id: uid('ACT'),
                type: 'Note',
                at: now,
                by: 'CSV import',
                summary: 'Lead imported from a CSV file. Stored in this browser only.',
              },
            ],
          }
        : null

    if (state === 'valid') {
      if (emailKey) emailOwners.set(emailKey, record.name)
      if (phoneKey) phoneOwners.set(phoneKey, record.name)
    }

    return {
      line,
      values: record,
      state,
      errors,
      duplicateOf,
      lead,
    }
  }

  const evaluated = rows.map((values, index) => evaluateRow(values, index + 2))
  return {
    rows: evaluated,
    validRows: evaluated.filter((row) => row.state === 'valid'),
    duplicateRows: evaluated.filter((row) => row.state === 'duplicate'),
    invalidRows: evaluated.filter((row) => row.state === 'invalid'),
  }
}
