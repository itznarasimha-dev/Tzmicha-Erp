import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  Info,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react'
import type {
  DecisionAuthority,
  Lead,
  LeadPriority,
  LeadSource,
  LeadSourceCategory,
  LeadStatus,
  PurchaseIntent,
} from '../../types/marketing'
import { Button } from '../ui/Button'
import { Field } from '../ui/Form'
import { Modal } from '../ui/Modal'
import { ProgressBar } from '../ui/ProgressBar'
import { Badge, PriorityBadge, StatusBadge } from '../ui/Badge'
import { LeadTagInput } from './LeadTagInput'
import {
  LEAD_PRIORITY_OPTIONS,
  LEAD_SOURCE_CATEGORIES,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  duplicateCandidates,
  qualificationReadiness,
  sourceCategoryForSource,
} from '../../utils/leads'
import { daysFromNow, toISODate } from '../../utils/dates'

export interface LeadFormValues {
  name: string
  company: string
  phone: string
  whatsapp: string
  email: string
  jobTitle: string
  customerType: string
  city: string
  state: string
  country: string
  address: string
  photoUrl: string

  products: string[]
  category: string
  features: string[]
  preferredBrand: string
  likes: string[]
  dislikes: string[]
  requirements: string[]
  priceRange: string
  budget: string
  preferredChannel: string
  preferredContactTime: string
  preferredLanguage: string
  purchasePurpose: string
  expectedPurchaseDate: string
  specialRequirements: string
  questions: string[]
  problems: string[]
  interestsSummary: string

  status: LeadStatus
  priority: LeadPriority
  purchaseIntent: PurchaseIntent
  estimatedValue: string
  budgetRange: string
  decisionAuthority: DecisionAuthority
  purchaseTimeline: string
  qualificationNotes: string
  mainRequirement: string
  reasonForInterest: string
  reasonForRejection: string

  source: LeadSource
  sourceCategory: LeadSourceCategory
  sourceDetail: string
  marketingActivity: string
  campaignId: string
  adSource: string
  landingPage: string
  firstContactDate: string
  latestContactDate: string
  referrerName: string
  referrerContact: string
  attributionNotes: string
  assignedTo: string
  generatedBy: string

  nextFollowUp: string
  nextFollowUpTime: string
  notes: string
  nextAction: string
  solutionsDiscussed: string
  informationShared: string
}

export const CUSTOMER_TYPES = [
  'Individual',
  'Business',
  'Enterprise',
  'Retailer',
  'Dealer',
  'Distributor',
  'Partner',
  'Other',
]

const CHANNELS = ['WhatsApp', 'Phone call', 'Email', 'SMS', 'In person', 'Video meeting']
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Other']

export function blankLeadForm(owner = ''): LeadFormValues {
  return {
    name: '',
    company: '',
    phone: '',
    whatsapp: '',
    email: '',
    jobTitle: '',
    customerType: '',
    city: '',
    state: '',
    country: 'India',
    address: '',
    photoUrl: '',

    products: [],
    category: '',
    features: [],
    preferredBrand: '',
    likes: [],
    dislikes: [],
    requirements: [],
    priceRange: '',
    budget: '',
    preferredChannel: '',
    preferredContactTime: '',
    preferredLanguage: '',
    purchasePurpose: '',
    expectedPurchaseDate: '',
    specialRequirements: '',
    questions: [],
    problems: [],
    interestsSummary: '',

    status: 'New',
    priority: 'Medium',
    purchaseIntent: 'Unknown',
    estimatedValue: '',
    budgetRange: '',
    decisionAuthority: 'Unknown',
    purchaseTimeline: '',
    qualificationNotes: '',
    mainRequirement: '',
    reasonForInterest: '',
    reasonForRejection: '',

    source: 'Manual Entry',
    sourceCategory: 'Other',
    sourceDetail: '',
    marketingActivity: '',
    campaignId: '',
    adSource: '',
    landingPage: '',
    firstContactDate: toISODate(new Date()),
    latestContactDate: toISODate(new Date()),
    referrerName: '',
    referrerContact: '',
    attributionNotes: '',
    assignedTo: owner,
    generatedBy: owner,

    nextFollowUp: '',
    nextFollowUpTime: '10:00',
    notes: '',
    nextAction: '',
    solutionsDiscussed: '',
    informationShared: '',
  }
}

export function leadToForm(lead: Lead): LeadFormValues {
  return {
    name: lead.name,
    company: lead.company,
    phone: lead.phone,
    whatsapp: lead.whatsapp ?? '',
    email: lead.email,
    jobTitle: lead.jobTitle ?? '',
    customerType: lead.customerType ?? '',
    city: lead.city ?? '',
    state: lead.state ?? '',
    country: lead.country ?? '',
    address: lead.address ?? '',
    photoUrl: lead.photoUrl ?? '',

    products: lead.interests?.products?.length ? lead.interests.products : lead.product ? [lead.product] : [],
    category: lead.interests?.category ?? '',
    features: lead.interests?.features ?? [],
    preferredBrand: lead.interests?.preferredBrand ?? '',
    likes: lead.interests?.likes ?? [],
    dislikes: lead.interests?.dislikes ?? [],
    requirements: lead.interests?.requirements ?? [],
    priceRange: lead.interests?.priceRange ?? '',
    budget: lead.interests?.budget !== null && lead.interests?.budget !== undefined ? String(lead.interests.budget) : '',
    preferredChannel: lead.interests?.preferredChannel ?? '',
    preferredContactTime: lead.interests?.preferredContactTime ?? '',
    preferredLanguage: lead.interests?.preferredLanguage ?? '',
    purchasePurpose: lead.interests?.purchasePurpose ?? '',
    expectedPurchaseDate: lead.interests?.expectedPurchaseDate ?? '',
    specialRequirements: lead.interests?.specialRequirements ?? '',
    questions: lead.interests?.questions ?? [],
    problems: lead.interests?.problems ?? [],
    interestsSummary: lead.interests?.summary ?? '',

    status: lead.status,
    priority: lead.priority,
    purchaseIntent: lead.qualification?.intent ?? 'Unknown',
    estimatedValue:
      lead.qualification?.estimatedValue !== null && lead.qualification?.estimatedValue !== undefined
        ? String(lead.qualification.estimatedValue)
        : '',
    budgetRange: lead.qualification?.budgetRange ?? '',
    decisionAuthority: lead.qualification?.decisionAuthority ?? 'Unknown',
    purchaseTimeline: lead.qualification?.purchaseTimeline ?? '',
    qualificationNotes: lead.qualification?.notes ?? '',
    mainRequirement: lead.qualification?.mainRequirement ?? lead.notes,
    reasonForInterest: lead.qualification?.reasonForInterest ?? '',
    reasonForRejection: lead.qualification?.reasonForRejection ?? lead.lostReason ?? '',

    source: lead.source,
    sourceCategory: lead.sourceCategory ?? sourceCategoryForSource(lead.source),
    sourceDetail: lead.sourceDetail ?? '',
    marketingActivity: lead.marketingActivity ?? '',
    campaignId: lead.campaignId ?? '',
    adSource: lead.attribution?.adSource ?? '',
    landingPage: lead.attribution?.landingPage ?? '',
    firstContactDate: lead.attribution?.firstContactDate?.slice(0, 10) ?? lead.createdAt.slice(0, 10),
    latestContactDate: lead.attribution?.latestContactDate?.slice(0, 10) ?? lead.lastContact.slice(0, 10),
    referrerName: lead.attribution?.referrerName ?? '',
    referrerContact: lead.attribution?.referrerContact ?? '',
    attributionNotes: lead.attribution?.notes ?? '',
    assignedTo: lead.assignedTo,
    generatedBy: lead.generatedBy ?? lead.assignedTo,

    nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.slice(0, 10) : '',
    nextFollowUpTime: lead.nextFollowUp ? new Date(lead.nextFollowUp).toTimeString().slice(0, 5) : '10:00',
    notes: lead.notes,
    nextAction: lead.nextAction ?? '',
    solutionsDiscussed: lead.solutionsDiscussed ?? '',
    informationShared: lead.informationShared ?? '',
  }
}

interface LeadFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: LeadFormValues) => void
  campaigns: { id: string; name: string }[]
  leads: Lead[]
  lead?: Lead | null
  owners: string[]
  onOpenExisting?: (leadId: string) => void
}

export function LeadFormModal({
  open,
  onClose,
  onSave,
  campaigns,
  leads,
  lead,
  owners,
  onOpenExisting,
}: LeadFormModalProps) {
  const [values, setValues] = useState<LeadFormValues>(() => (lead ? leadToForm(lead) : blankLeadForm(owners[0])))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    setValues(lead ? leadToForm(lead) : blankLeadForm(owners[0]))
    setErrors({})
    setAttempted(false)
  }, [lead, open, owners])

  const set = <K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const duplicates = useMemo(
    () =>
      duplicateCandidates(
        leads,
        { email: values.email, phone: values.phone || values.whatsapp, name: values.name, company: values.company },
        lead?.id,
      ),
    [leads, values.email, values.phone, values.whatsapp, values.name, values.company, lead?.id],
  )

  const previewLead = useMemo<Lead>(
    () => ({
      id: lead?.id ?? 'preview',
      name: values.name || 'New lead',
      company: values.company,
      phone: values.phone,
      email: values.email,
      location: [values.city, values.state, values.country].filter(Boolean).join(', '),
      industry: lead?.industry ?? 'General',
      source: values.source,
      sourceCategory: values.sourceCategory,
      sourceDetail: values.sourceDetail,
      marketingActivity: values.marketingActivity,
      campaignId: values.campaignId || null,
      product: values.products[0] ?? '',
      assignedTo: values.assignedTo,
      generatedBy: values.generatedBy,
      status: values.status,
      priority: values.priority,
      nextFollowUp: values.nextFollowUp ? new Date(`${values.nextFollowUp}T${values.nextFollowUpTime}:00`).toISOString() : null,
      notes: values.notes,
      createdAt: lead?.createdAt ?? new Date().toISOString(),
      lastContact: lead?.lastContact ?? new Date().toISOString(),
      converted: false,
      activities: [],
      interests: {
        products: values.products,
        features: values.features,
        likes: values.likes,
        dislikes: values.dislikes,
        requirements: values.requirements,
        questions: values.questions,
        problems: values.problems,
        preferredChannel: values.preferredChannel,
        priceRange: values.priceRange,
        budget: values.budget ? Number(values.budget) : null,
        expectedPurchaseDate: values.expectedPurchaseDate,
        summary: values.interestsSummary,
      },
      qualification: {
        intent: values.purchaseIntent,
        estimatedValue: values.estimatedValue ? Number(values.estimatedValue) : null,
        budgetRange: values.budgetRange,
        decisionAuthority: values.decisionAuthority,
        purchaseTimeline: values.purchaseTimeline,
        notes: values.qualificationNotes,
        mainRequirement: values.mainRequirement,
      },
    }),
    [lead, values],
  )
  const readiness = qualificationReadiness(previewLead)

  const submit = () => {
    setAttempted(true)
    const next: Record<string, string> = {}
    if (!values.name.trim()) next.name = 'Enter the customer’s name.'
    if (!values.phone.trim() && !values.email.trim() && !values.whatsapp.trim()) {
      next.phone = 'Add at least one contact method: phone, WhatsApp or email.'
    }
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    if (values.phone.trim() && values.phone.replace(/[^\d]/g, '').length < 8) {
      next.phone = 'Enter a valid phone number.'
    }
    if (values.whatsapp.trim() && values.whatsapp.replace(/[^\d]/g, '').length < 8) {
      next.whatsapp = 'Enter a valid WhatsApp number.'
    }
    if (values.budget.trim() && (Number.isNaN(Number(values.budget)) || Number(values.budget) < 0)) {
      next.budget = 'Enter a valid budget amount.'
    }
    if (values.estimatedValue.trim() && (Number.isNaN(Number(values.estimatedValue)) || Number(values.estimatedValue) < 0)) {
      next.estimatedValue = 'Enter a valid estimated deal value.'
    }
    if (values.photoUrl.trim() && !/^https?:\/\//i.test(values.photoUrl.trim())) {
      next.photoUrl = 'Use a full http(s) URL, or leave this blank.'
    }
    if (['Rejected', 'Not Interested'].includes(values.status) && !values.reasonForRejection.trim()) {
      next.reasonForRejection = 'Add the reason before saving a rejected lead.'
    }
    if (!values.products.length) next.products = 'Add at least one product or service interest.'
    if (duplicates.length) next.duplicate = 'A lead with this contact information already exists.'
    setErrors(next)
    if (Object.keys(next).some((key) => next[key])) return
    onSave(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? 'Edit customer lead' : 'Add a new lead'}
      description={
        lead
          ? `${lead.id} · Update the customer profile without losing the activity history.`
          : 'Capture only what you know today. You can add preferences and requirements after every conversation.'
      }
      size="xl"
      footer={
        <>
          <span className="lead-form__footer-note">
            <Info size={13} /> Stored in this browser only — no CRM or messaging service is connected.
          </span>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={lead ? <BadgeCheck size={14} /> : <UserRound size={14} />} onClick={submit}>
            {lead ? 'Save customer profile' : 'Create lead'}
          </Button>
        </>
      }
    >
      <div className="lead-form">
        <section className="lead-form__section">
          <div className="lead-form__section-head">
            <span className="lead-form__section-icon"><UserRound size={15} /></span>
            <div>
              <h3>Basic information</h3>
              <p>Who is the customer and how can the team reach them?</p>
            </div>
            <div className="lead-form__photo">
              {values.photoUrl ? (
                <img
                  src={values.photoUrl}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <span aria-hidden="true">{values.name.trim().slice(0, 1).toUpperCase() || '?'}</span>
              )}
            </div>
          </div>
          <div className="form-grid">
            <Field label="Full name" htmlFor="lead-name" required error={errors.name}>
              <input id="lead-name" className="input" value={values.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Rahul Sharma" aria-invalid={Boolean(errors.name)} autoFocus />
            </Field>
            <Field label="Company name" htmlFor="lead-company">
              <input id="lead-company" className="input" value={values.company} onChange={(event) => set('company', event.target.value)} placeholder="Company or business name" />
            </Field>
            <Field label="Phone number" htmlFor="lead-phone" error={errors.phone} hint="At least one contact method is required.">
              <input id="lead-phone" className="input" value={values.phone} onChange={(event) => set('phone', event.target.value)} placeholder="+91 98765 43210" aria-invalid={Boolean(errors.phone)} />
            </Field>
            <Field label="WhatsApp number" htmlFor="lead-whatsapp" error={errors.whatsapp}>
              <input id="lead-whatsapp" className="input" value={values.whatsapp} onChange={(event) => set('whatsapp', event.target.value)} placeholder="If different from the phone number" aria-invalid={Boolean(errors.whatsapp)} />
            </Field>
            <Field label="Email address" htmlFor="lead-email" error={errors.email}>
              <input id="lead-email" className="input" type="email" value={values.email} onChange={(event) => set('email', event.target.value)} placeholder="name@company.com" aria-invalid={Boolean(errors.email)} />
            </Field>
            <Field label="Job title" htmlFor="lead-job">
              <input id="lead-job" className="input" value={values.jobTitle} onChange={(event) => set('jobTitle', event.target.value)} placeholder="e.g. Purchase Manager" />
            </Field>
            <Field label="Customer type" htmlFor="lead-customer-type">
              <select id="lead-customer-type" className="select" value={values.customerType} onChange={(event) => set('customerType', event.target.value)}>
                <option value="">Not recorded</option>
                {CUSTOMER_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Profile photo URL" htmlFor="lead-photo" error={errors.photoUrl} hint="Optional. A public image URL only.">
              <input id="lead-photo" className="input" type="url" value={values.photoUrl} onChange={(event) => set('photoUrl', event.target.value)} placeholder="https://…" aria-invalid={Boolean(errors.photoUrl)} />
            </Field>
            <Field label="City" htmlFor="lead-city">
              <input id="lead-city" className="input" value={values.city} onChange={(event) => set('city', event.target.value)} placeholder="City" />
            </Field>
            <Field label="State" htmlFor="lead-state">
              <input id="lead-state" className="input" value={values.state} onChange={(event) => set('state', event.target.value)} placeholder="State" />
            </Field>
            <Field label="Country" htmlFor="lead-country">
              <input id="lead-country" className="input" value={values.country} onChange={(event) => set('country', event.target.value)} placeholder="Country" />
            </Field>
            <Field label="Address" htmlFor="lead-address" className="full">
              <textarea id="lead-address" className="textarea" rows={2} value={values.address} onChange={(event) => set('address', event.target.value)} placeholder="Street, area or landmark, if relevant" />
            </Field>
          </div>
        </section>

        <section className="lead-form__section lead-form__section--interests">
          <div className="lead-form__section-head">
            <span className="lead-form__section-icon"><Sparkles size={15} /></span>
            <div>
              <h3>Customer interests &amp; preferences</h3>
              <p>Capture what the customer wants, likes and needs. Add each item as its own tag.</p>
            </div>
            <Badge tone="accent">{readiness.available}/{readiness.total} signals</Badge>
          </div>
          <div className="form-grid">
            <Field label="Interested products or services" htmlFor="lead-products" required error={errors.products} className="full">
              <LeadTagInput id="lead-products" values={values.products} onChange={(next) => set('products', next)} placeholder="e.g. ERP software, Inventory module — press Enter to add" />
            </Field>
            <Field label="Preferred product category" htmlFor="lead-category">
              <input id="lead-category" className="input" value={values.category} onChange={(event) => set('category', event.target.value)} placeholder="e.g. Business software" />
            </Field>
            <Field label="Preferred brand or model" htmlFor="lead-brand">
              <input id="lead-brand" className="input" value={values.preferredBrand} onChange={(event) => set('preferredBrand', event.target.value)} placeholder="If the customer named one" />
            </Field>
            <Field label="Specific features required" htmlFor="lead-features" className="full">
              <LeadTagInput id="lead-features" values={values.features} onChange={(next) => set('features', next)} placeholder="e.g. Mobile access, GST billing — press Enter to add" />
            </Field>
            <Field label="Requirements" htmlFor="lead-requirements" className="full" hint="Add each requirement separately so sales can scan them quickly.">
              <LeadTagInput id="lead-requirements" values={values.requirements} onChange={(next) => set('requirements', next)} placeholder="e.g. Employee attendance tracking — press Enter to add" />
            </Field>
            <Field label="What the customer likes" htmlFor="lead-likes" className="full">
              <LeadTagInput id="lead-likes" values={values.likes} onChange={(next) => set('likes', next)} placeholder="e.g. Simple reports — press Enter to add" />
            </Field>
            <Field label="What the customer dislikes" htmlFor="lead-dislikes" className="full">
              <LeadTagInput id="lead-dislikes" values={values.dislikes} onChange={(next) => set('dislikes', next)} placeholder="e.g. Complex setup — press Enter to add" />
            </Field>
            <Field label="Budget (INR)" htmlFor="lead-budget" error={errors.budget}>
              <input id="lead-budget" className="input" type="number" min="0" step="1000" value={values.budget} onChange={(event) => set('budget', event.target.value)} placeholder="e.g. 25000" aria-invalid={Boolean(errors.budget)} />
            </Field>
            <Field label="Preferred price range" htmlFor="lead-price-range">
              <input id="lead-price-range" className="input" value={values.priceRange} onChange={(event) => set('priceRange', event.target.value)} placeholder="e.g. ₹20,000–₹30,000" />
            </Field>
            <Field label="Preferred communication channel" htmlFor="lead-channel">
              <select id="lead-channel" className="select" value={values.preferredChannel} onChange={(event) => set('preferredChannel', event.target.value)}>
                <option value="">Not recorded</option>
                {CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}
              </select>
            </Field>
            <Field label="Preferred contact time" htmlFor="lead-contact-time">
              <input id="lead-contact-time" className="input" value={values.preferredContactTime} onChange={(event) => set('preferredContactTime', event.target.value)} placeholder="e.g. Weekdays after 6 pm" />
            </Field>
            <Field label="Preferred language" htmlFor="lead-language">
              <select id="lead-language" className="select" value={values.preferredLanguage} onChange={(event) => set('preferredLanguage', event.target.value)}>
                <option value="">Not recorded</option>
                {LANGUAGES.map((language) => <option key={language}>{language}</option>)}
              </select>
            </Field>
            <Field label="Purchase purpose" htmlFor="lead-purpose">
              <input id="lead-purpose" className="input" value={values.purchasePurpose} onChange={(event) => set('purchasePurpose', event.target.value)} placeholder="e.g. Running a 12-person retail business" />
            </Field>
            <Field label="Expected purchase date" htmlFor="lead-expected-date">
              <input id="lead-expected-date" className="input" type="date" value={values.expectedPurchaseDate} onChange={(event) => set('expectedPurchaseDate', event.target.value)} />
            </Field>
            <Field label="Questions asked by the customer" htmlFor="lead-questions" className="full">
              <LeadTagInput id="lead-questions" values={values.questions} onChange={(next) => set('questions', next)} placeholder="e.g. What does implementation cost? — press Enter to add" />
            </Field>
            <Field label="Problems the customer wants to solve" htmlFor="lead-problems" className="full">
              <LeadTagInput id="lead-problems" values={values.problems} onChange={(next) => set('problems', next)} placeholder="e.g. Stock mismatches — press Enter to add" />
            </Field>
            <Field label="Special requirements" htmlFor="lead-special" className="full">
              <textarea id="lead-special" className="textarea" rows={2} value={values.specialRequirements} onChange={(event) => set('specialRequirements', event.target.value)} placeholder="Anything unusual the sales team must know" />
            </Field>
            <Field label="Describe what the customer likes, needs and cares about" htmlFor="lead-summary" className="full" hint="Plain-language context is often more useful to sales than a single field.">
              <textarea id="lead-summary" className="textarea" rows={4} value={values.interestsSummary} onChange={(event) => set('interestsSummary', event.target.value)} placeholder="Example: Wants an easy-to-use system with simple reports and mobile access. Concerned about implementation effort." />
            </Field>
          </div>
        </section>

        <section className="lead-form__section">
          <div className="lead-form__section-head">
            <span className="lead-form__section-icon"><Target size={15} /></span>
            <div>
              <h3>Lead qualification</h3>
              <p>A transparent indicator based only on the fields you record here.</p>
            </div>
            <div className="lead-form__readiness" aria-label={`Qualification information ${readiness.score}% complete`}>
              <span>{readiness.score}% complete</span>
              <ProgressBar value={readiness.score} size="sm" tone={readiness.score >= 70 ? 'success' : readiness.score >= 40 ? 'warning' : 'brand'} />
            </div>
          </div>
          <div className="form-grid">
            <Field label="Lead status" htmlFor="lead-status">
              <select id="lead-status" className="select" value={values.status} onChange={(event) => set('status', event.target.value as LeadStatus)} disabled={Boolean(lead?.converted)}>
                {LEAD_STATUS_OPTIONS.filter((option) => {
                  if (option === 'Converted') return lead?.converted
                  if (option === 'Sent to Sales') return lead?.status === 'Sent to Sales'
                  if (option === 'Lost') return lead?.status === 'Lost'
                  return true
                }).map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Priority" htmlFor="lead-priority">
              <select id="lead-priority" className="select" value={values.priority} onChange={(event) => set('priority', event.target.value as LeadPriority)}>
                {LEAD_PRIORITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Purchase intent" htmlFor="lead-intent">
              <select id="lead-intent" className="select" value={values.purchaseIntent} onChange={(event) => set('purchaseIntent', event.target.value as PurchaseIntent)}>
                {(['Unknown', 'Low', 'Medium', 'High'] as PurchaseIntent[]).map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Decision-making authority" htmlFor="lead-authority">
              <select id="lead-authority" className="select" value={values.decisionAuthority} onChange={(event) => set('decisionAuthority', event.target.value as DecisionAuthority)}>
                {(['Unknown', 'Decision Maker', 'Influencer', 'Evaluator'] as DecisionAuthority[]).map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Estimated deal value (INR)" htmlFor="lead-value" error={errors.estimatedValue}>
              <input id="lead-value" className="input" type="number" min="0" step="1000" value={values.estimatedValue} onChange={(event) => set('estimatedValue', event.target.value)} placeholder="If known" aria-invalid={Boolean(errors.estimatedValue)} />
            </Field>
            <Field label="Budget range" htmlFor="lead-budget-range">
              <input id="lead-budget-range" className="input" value={values.budgetRange} onChange={(event) => set('budgetRange', event.target.value)} placeholder="e.g. ₹20,000–₹30,000" />
            </Field>
            <Field label="Purchase timeline" htmlFor="lead-timeline">
              <input id="lead-timeline" className="input" value={values.purchaseTimeline} onChange={(event) => set('purchaseTimeline', event.target.value)} placeholder="e.g. Within 15 days" />
            </Field>
            <Field label="Main customer requirement" htmlFor="lead-main-req" className="full">
              <input id="lead-main-req" className="input" value={values.mainRequirement} onChange={(event) => set('mainRequirement', event.target.value)} placeholder="The single most important need" />
            </Field>
            <Field label="Reason for interest" htmlFor="lead-reason-interest" className="full">
              <textarea id="lead-reason-interest" className="textarea" rows={2} value={values.reasonForInterest} onChange={(event) => set('reasonForInterest', event.target.value)} placeholder="What prompted the customer to enquire?" />
            </Field>
            <Field label="Qualification notes" htmlFor="lead-qualification-notes" className="full">
              <textarea id="lead-qualification-notes" className="textarea" rows={2} value={values.qualificationNotes} onChange={(event) => set('qualificationNotes', event.target.value)} placeholder="Evidence, fit notes or open qualification questions" />
            </Field>
            {['Rejected', 'Not Interested'].includes(values.status) ? (
              <Field label="Reason for rejection" htmlFor="lead-rejection" required error={errors.reasonForRejection} className="full">
                <textarea id="lead-rejection" className="textarea" rows={2} value={values.reasonForRejection} onChange={(event) => set('reasonForRejection', event.target.value)} placeholder="Why is the lead not moving forward?" aria-invalid={Boolean(errors.reasonForRejection)} />
              </Field>
            ) : null}
          </div>
          <div className="lead-form__qualification-hint">
            <Info size={13} />
            <span>
              No score is generated by AI. The indicator simply counts the information recorded above and is not a purchase decision.
            </span>
          </div>
        </section>

        <section className="lead-form__section">
          <div className="lead-form__section-head">
            <span className="lead-form__section-icon"><Building2 size={15} /></span>
            <div>
              <h3>Source &amp; attribution</h3>
              <p>Where did this lead come from, and who owns the relationship?</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Source category" htmlFor="lead-source-category" required hint="The seven canonical categories used by attribution reports.">
              <select id="lead-source-category" className="select" value={values.sourceCategory} onChange={(event) => set('sourceCategory', event.target.value as LeadSourceCategory)}>
                {LEAD_SOURCE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Detailed lead source" htmlFor="lead-source" hint="Changing this pre-fills the matching category above.">
              <select id="lead-source" className="select" value={values.source} onChange={(event) => {
                const nextSource = event.target.value as LeadSource
                set('source', nextSource)
                set('sourceCategory', sourceCategoryForSource(nextSource))
              }}>
                {LEAD_SOURCE_OPTIONS.map((source) => <option key={source}>{source}</option>)}
              </select>
            </Field>
            <Field label="Source detail" htmlFor="lead-source-detail">
              <input id="lead-source-detail" className="input" value={values.sourceDetail} onChange={(event) => set('sourceDetail', event.target.value)} placeholder="e.g. Instagram festive reel, dealer referral" />
            </Field>
            <Field label="Marketing activity" htmlFor="lead-marketing-activity">
              <input id="lead-marketing-activity" className="input" value={values.marketingActivity} onChange={(event) => set('marketingActivity', event.target.value)} placeholder="e.g. SmartHome festive campaign" />
            </Field>
            <Field label="Campaign" htmlFor="lead-campaign">
              <select id="lead-campaign" className="select" value={values.campaignId} onChange={(event) => set('campaignId', event.target.value)}>
                <option value="">No campaign recorded</option>
                {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </select>
            </Field>
            <Field label="Advertisement or referral source" htmlFor="lead-ad-source">
              <input id="lead-ad-source" className="input" value={values.adSource} onChange={(event) => set('adSource', event.target.value)} placeholder="e.g. Meta lead form, dealer referral" />
            </Field>
            <Field label="Landing page" htmlFor="lead-landing">
              <input id="lead-landing" className="input" value={values.landingPage} onChange={(event) => set('landingPage', event.target.value)} placeholder="/campaigns/festive-demo" />
            </Field>
            <Field label="First contact date" htmlFor="lead-first-contact">
              <input id="lead-first-contact" className="input" type="date" value={values.firstContactDate} onChange={(event) => set('firstContactDate', event.target.value)} />
            </Field>
            <Field label="Latest contact date" htmlFor="lead-latest-contact">
              <input id="lead-latest-contact" className="input" type="date" value={values.latestContactDate} onChange={(event) => set('latestContactDate', event.target.value)} />
            </Field>
            <Field label="Referrer name" htmlFor="lead-referrer">
              <input id="lead-referrer" className="input" value={values.referrerName} onChange={(event) => set('referrerName', event.target.value)} placeholder="If another customer referred this lead" />
            </Field>
            <Field label="Referrer contact" htmlFor="lead-referrer-contact">
              <input id="lead-referrer-contact" className="input" value={values.referrerContact} onChange={(event) => set('referrerContact', event.target.value)} placeholder="Phone or email" />
            </Field>
            <Field label="Assigned marketing employee" htmlFor="lead-owner">
              <select id="lead-owner" className="select" value={values.assignedTo} onChange={(event) => set('assignedTo', event.target.value)}>
                {owners.map((owner) => <option key={owner}>{owner}</option>)}
              </select>
            </Field>
            <Field label="Generated by" htmlFor="lead-generated-by" hint="Employee who captured or sourced this lead.">
              <select id="lead-generated-by" className="select" value={values.generatedBy} onChange={(event) => set('generatedBy', event.target.value)}>
                {owners.map((owner) => <option key={owner}>{owner}</option>)}
              </select>
            </Field>
            <Field label="Attribution notes" htmlFor="lead-attribution-notes" className="full">
              <textarea id="lead-attribution-notes" className="textarea" rows={2} value={values.attributionNotes} onChange={(event) => set('attributionNotes', event.target.value)} placeholder="UTM details, event name or other context" />
            </Field>
          </div>
        </section>

        <section className="lead-form__section">
          <div className="lead-form__section-head">
            <span className="lead-form__section-icon"><Info size={15} /></span>
            <div>
              <h3>Notes, next step &amp; follow-up</h3>
              <p>This is the context that transfers with the lead when it is sent to sales.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Next recommended action" htmlFor="lead-next-action" className="full">
              <input id="lead-next-action" className="input" value={values.nextAction} onChange={(event) => set('nextAction', event.target.value)} placeholder="e.g. Schedule a product demonstration" />
            </Field>
            <Field label="Solutions discussed" htmlFor="lead-solutions" className="full">
              <textarea id="lead-solutions" className="textarea" rows={2} value={values.solutionsDiscussed} onChange={(event) => set('solutionsDiscussed', event.target.value)} placeholder="What has already been proposed or explored with the customer?" />
            </Field>
            <Field label="Information shared with the customer" htmlFor="lead-shared" className="full">
              <textarea id="lead-shared" className="textarea" rows={2} value={values.informationShared} onChange={(event) => set('informationShared', event.target.value)} placeholder="Brochures, pricing sheets, demo links or other material shared" />
            </Field>
            <Field label="General notes" htmlFor="lead-notes" className="full">
              <textarea id="lead-notes" className="textarea" rows={3} value={values.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Anything else the team should know" />
            </Field>
            <Field label="Next follow-up date" htmlFor="lead-followup">
              <input id="lead-followup" className="input" type="date" value={values.nextFollowUp} onChange={(event) => set('nextFollowUp', event.target.value)} />
            </Field>
            <Field label="Follow-up time" htmlFor="lead-followup-time">
              <input id="lead-followup-time" className="input" type="time" value={values.nextFollowUpTime} onChange={(event) => set('nextFollowUpTime', event.target.value)} />
            </Field>
          </div>
        </section>

        {duplicates.length ? (
          <div className="duplicate-warning" role="alert">
            <Info size={15} />
            <div>
              <strong>Possible duplicate {duplicates.length === 1 ? 'lead' : 'leads'} found</strong>
              <p>The email, phone or name/company already exists. Open the existing record instead of creating a duplicate.</p>
              <div className="duplicate-warning__items">
                {duplicates.slice(0, 3).map((item) => (
                  <button
                    key={item.lead.id}
                    type="button"
                    className="duplicate-warning__item"
                    onClick={() => onOpenExisting?.(item.lead.id)}
                  >
                    <span>
                      <strong>{item.lead.name}</strong> · {item.lead.company || 'No company'} · {item.reasons.join(', ')}
                    </span>
                    <span>Open lead →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {attempted && errors.duplicate ? <p className="field-error" role="alert">{errors.duplicate}</p> : null}

        <div className="lead-form__preview">
          <span className="lead-form__preview-label">Preview</span>
          <div className="row-8 wrap">
            <StatusBadge status={values.status} />
            <PriorityBadge priority={values.priority} />
            {values.products.slice(0, 2).map((product) => <Badge key={product} tone="neutral">{product}</Badge>)}
            {values.purchaseIntent !== 'Unknown' ? <Badge tone="accent">{values.purchaseIntent} intent</Badge> : null}
            {values.nextFollowUp ? <Badge tone="warning">Follow-up {values.nextFollowUp}</Badge> : null}
            {!values.nextFollowUp && ['New', 'Contacted', 'Interested', 'Follow-up Required', 'Qualified'].includes(values.status) ? (
              <span className="text-xs muted">No next follow-up scheduled yet</span>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function nextFollowUpIso(values: LeadFormValues): string | null {
  if (!values.nextFollowUp) return null
  return new Date(`${values.nextFollowUp}T${values.nextFollowUpTime || '10:00'}:00`).toISOString()
}

export function followUpInDays(days: number): string {
  return daysFromNow(days).slice(0, 10)
}
