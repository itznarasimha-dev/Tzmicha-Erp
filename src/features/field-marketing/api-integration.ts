import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, hasApiToken, isApiConfigured } from '@/lib/api/client'
import * as marketingApi from '@/lib/api/marketing'
import type { ApiFieldVisit, ApiSurvey, ApiDealer, ApiTarget, ApiMarketingExpense, ApiRewardWallet, ApiRewardTransaction, ApiActivityRecord } from '@/lib/api/marketing'

export type FieldApiStatus = 'idle' | 'loading' | 'ready' | 'error'

export function canUseFieldMarketingApi(): boolean {
  return isApiConfigured() && hasApiToken()
}

export function fieldApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message || error.code
  if (error instanceof Error) return error.message
  return 'Request failed'
}

export function useFieldMarketingApiQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const apiMode = canUseFieldMarketingApi()
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<FieldApiStatus>(apiMode ? 'loading' : 'idle')
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!canUseFieldMarketingApi()) {
      setData(null)
      setError(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
      setStatus('ready')
    } catch (err) {
      setData(null)
      setError(fieldApiErrorMessage(err))
      setStatus('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { apiMode, data, status, error, refetch, setData, setError, setStatus }
}

export type UiFieldVisit = {
  id: string
  prospectName: string
  contact: string
  customerType: 'dealer' | 'retailer' | 'distributor' | 'prospect'
  purpose: 'product_demo' | 'dealer_acquisition' | 'routine_visit' | 'payment_followup' | 'promotional_event' | 'stock_check'
  locationAddress: string
  visitDate: string
  visitTime: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  checkInTime?: string
  checkOutTime?: string
  outcomeNotes?: string
  demoFollowUp?: string
  checklist: string[]
  assignedTo: string
  notes?: string
  raw: ApiFieldVisit
}

function normalizePurpose(value: string): UiFieldVisit['purpose'] {
  const v = value.toLowerCase()
  if (v.includes('demo')) return 'product_demo'
  if (v.includes('acquisition') || v.includes('dealer') || v.includes('onboard')) return 'dealer_acquisition'
  if (v.includes('payment') || v.includes('collection')) return 'payment_followup'
  if (v.includes('promo') || v.includes('event') || v.includes('campaign')) return 'promotional_event'
  if (v.includes('stock') || v.includes('inventory')) return 'stock_check'
  return 'routine_visit'
}

function normalizeVisitStatus(value: ApiFieldVisit['status']): UiFieldVisit['status'] {
  if (value === 'Scheduled') return 'scheduled'
  if (value === 'In Progress') return 'in_progress'
  if (value === 'Completed') return 'completed'
  return 'cancelled'
}

export function mapApiVisit(v: ApiFieldVisit): UiFieldVisit {
  return {
    id: v.id,
    prospectName: v.business || v.contact || 'Visit',
    contact: v.contact || '',
    customerType: v.type === 'Dealer Visit' ? 'dealer' : 'prospect',
    purpose: normalizePurpose(v.purpose || v.type || ''),
    locationAddress: v.location || '',
    visitDate: v.date,
    visitTime: v.time || '',
    status: normalizeVisitStatus(v.status),
    checkInTime: v.checkInAt || undefined,
    checkOutTime: v.checkOutAt || undefined,
    outcomeNotes: v.outcome || undefined,
    demoFollowUp: v.demoFollowUp || undefined,
    checklist: Array.isArray(v.checklist) ? v.checklist : [],
    assignedTo: v.assignedTo || v.assignedToName || '',
    notes: v.notes || undefined,
    raw: v,
  }
}

export type UiSurvey = {
  id: string
  dealerName: string
  competitorBrand: string
  competitorProduct: string
  region: string
  observation: string
  productFeedback: string
  interest: 'High' | 'Medium' | 'Low'
  pricingObservation: string
  date: string
  submittedBy: string
  raw: ApiSurvey
}

export function mapApiSurvey(s: ApiSurvey): UiSurvey {
  return {
    id: s.id,
    dealerName: s.competitor || 'Market Survey',
    competitorBrand: s.competitor || '—',
    competitorProduct: s.pricingObservation || s.productFeedback || '—',
    region: s.region || '—',
    observation: s.observation || '',
    productFeedback: s.productFeedback || '',
    interest: s.interest || 'Medium',
    pricingObservation: s.pricingObservation || '',
    date: s.date,
    submittedBy: s.submittedByName || s.submittedBy || '',
    raw: s,
  }
}

export type UiDealer = {
  id: string
  name: string
  businessName: string
  contactName: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  type: 'dealer' | 'retailer' | 'distributor'
  status: string
  stage: ApiDealer['stage']
  ownerName: string
  notes: string
  nextFollowUp: string
  raw: ApiDealer
}

export function mapApiDealer(d: ApiDealer): UiDealer {
  const cat = (d.category || '').toLowerCase()
  const type: UiDealer['type'] = cat.includes('retail') ? 'retailer' : cat.includes('distrib') ? 'distributor' : 'dealer'
  return {
    id: d.id,
    name: d.contactName || d.businessName,
    businessName: d.businessName,
    contactName: d.contactName || '',
    phone: d.phone || '',
    email: d.email || '',
    address: [d.address, d.city, d.state].filter(Boolean).join(', '),
    city: d.city || '',
    state: d.state || '',
    type,
    status: d.stage === 'Onboarded' ? 'active' : 'prospect',
    stage: d.stage,
    ownerName: d.ownerName || '',
    notes: d.notes || '',
    nextFollowUp: d.nextFollowUp || '',
    raw: d,
  }
}

export type UiTarget = {
  id: string
  metric: string
  targetValue: number
  achievedValue: number
  unit: string
  periodStart: string
  periodEnd: string
  notes: string
  raw: ApiTarget
}

export function mapApiTarget(t: ApiTarget): UiTarget {
  return {
    id: t.id,
    metric: t.metric,
    targetValue: Number(t.targetValue || 0),
    achievedValue: Number(t.achievedValue || 0),
    unit: t.unit || '',
    periodStart: t.periodStart,
    periodEnd: t.periodEnd,
    notes: t.notes || '',
    raw: t,
  }
}

export { marketingApi }
export type { ApiMarketingExpense, ApiRewardWallet, ApiRewardTransaction, ApiActivityRecord }