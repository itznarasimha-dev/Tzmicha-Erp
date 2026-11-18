/**
 * Reusable read-data hooks for Marketing pages.
 *
 * In API mode (dataSource === 'api'), each hook fetches from the corresponding
 * backend GET endpoint with loading/error states and abort-signal cleanup.
 * In demo mode, hooks return loading: false and data: null so the calling
 * page falls back to its existing demo state (data.*). API errors are
 * surfaced as error state — never silently falling back to demo data.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDemoData } from './context/DemoDataContext'
import * as api from '@/lib/api/marketing'
import { ApiError, QueryParams } from '@/lib/api/client'

export interface QueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic hook that wraps a fetch function with loading/error/refetch states.
 * When dataSource !== 'api', returns loading: false and data: null so the
 * calling component can fall back to its existing demo state.
 */
function useMarketingQuery<T>(fetchFn: () => Promise<T>, deps: unknown[] = []): QueryState<T> {
  const { dataSource } = useDemoData()
  const fetchRef = useRef(fetchFn)
  fetchRef.current = fetchFn

  const refetch = useCallback(async () => {
    await fetchRef.current()
  }, [])

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: false,
    error: null,
    refetch,
  })
  const abortRef = useRef<AbortController | null>(null)

  const fetch = useCallback(async () => {
    if (dataSource !== 'api') {
      setState({ data: null, loading: false, error: null, refetch })
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ data: null, loading: true, error: null, refetch })
    try {
      const result = await fetchRef.current()
      if (controller.signal.aborted) return
      setState({ data: result, loading: false, error: null, refetch })
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof ApiError) {
        setState({ data: null, loading: false, error: error.message, refetch })
      } else if (error instanceof Error) {
        setState({ data: null, loading: false, error: error.message, refetch })
      } else {
        setState({ data: null, loading: false, error: 'Unknown error', refetch })
      }
    }
  }, [dataSource, refetch, ...deps])

  useEffect(() => {
    fetch()
    return () => abortRef.current?.abort()
  }, [fetch])

  return state
}

/** Marketing dashboard KPIs. */
export function useMarketingDashboard() {
  return useMarketingQuery(() => api.getMarketingDashboard())
}

/** Activity records with filters and pagination. */
export function useActivityRecords(query: QueryParams = {}) {
  return useMarketingQuery(
    () => api.listActivityRecords(query),
    [query.q, query.page, query.pageSize]
  )
}

/** Leads with filters and pagination. */
export function useLeads(query: {
  q?: string
  status?: string
  priority?: string
  sourceId?: string
  campaignId?: string
  assignedTo?: string
  generatedBy?: string
  converted?: string
  from?: string
  to?: string
  sort?: string
  page?: number
  pageSize?: number
} = {}) {
  return useMarketingQuery(
    () => api.listLeads(query as any),
    [query.q, query.status, query.priority, query.sourceId, query.campaignId, query.assignedTo, query.generatedBy, query.converted, query.from, query.to, query.sort, query.page, query.pageSize]
  )
}

/** Single lead detail. */
export function useLead(id: string | null) {
  return useMarketingQuery(
    () => (id ? api.getLead(id) : Promise.resolve(null)),
    [id]
  )
}

/** Lead activities. */
export function useLeadActivities(leadId: string | null) {
  return useMarketingQuery(
    () => (leadId ? api.listLeadActivities(leadId) : Promise.resolve([])),
    [leadId]
  )
}

/** Campaigns with filters and pagination. */
export function useCampaigns(query: {
  q?: string
  status?: string
  channel?: string
  ownerUserId?: string
  from?: string
  to?: string
  sort?: string
  page?: number
  pageSize?: number
} = {}) {
  return useMarketingQuery(
    () => api.listCampaigns(query as any),
    [query.q, query.status, query.channel, query.ownerUserId, query.from, query.to, query.sort, query.page, query.pageSize]
  )
}

/** Single campaign detail. */
export function useCampaign(id: string | null) {
  return useMarketingQuery(
    () => (id ? api.getCampaign(id) : Promise.resolve(null)),
    [id]
  )
}

/** Plans with filters and pagination. */
export function usePlans(query: {
  q?: string
  employeeId?: string
  month?: string
  status?: string
  from?: string
  to?: string
  sort?: string
  page?: number
  pageSize?: number
} = {}) {
  return useMarketingQuery(
    () => api.listPlans(query as any),
    [query.q, query.employeeId, query.month, query.status, query.from, query.to, query.sort, query.page, query.pageSize]
  )
}

/** Single plan detail. */
export function usePlan(id: string | null) {
  return useMarketingQuery(
    () => (id ? api.getPlan(id) : Promise.resolve(null)),
    [id]
  )
}

/** Marketing expenses with filters and pagination. */
export function useMarketingExpenses(query: {
  q?: string
  source?: string
  status?: string
  employeeId?: string
  planId?: string
  campaignId?: string
  category?: string
  from?: string
  to?: string
  sort?: string
  page?: number
  pageSize?: number
} = {}) {
  return useMarketingQuery(
    () => api.listExpenses(query as any),
    [query.q, query.source, query.status, query.employeeId, query.planId, query.campaignId, query.category, query.from, query.to, query.sort, query.page, query.pageSize]
  )
}

/** Single expense detail. */
export function useMarketingExpense(id: string | null) {
  return useMarketingQuery(
    () => (id ? api.getExpense(id) : Promise.resolve(null)),
    [id]
  )
}

/** Targets with filters and pagination. */
export function useTargets(query: QueryParams = {}) {
  return useMarketingQuery(
    () => api.listTargets(query),
    [query.q, query.page, query.pageSize]
  )
}

/** Performance with filters and pagination. */
export function usePerformance(query: {
  employeeId?: string
  period?: string
  page?: number
  pageSize?: number
} = {}) {
  return useMarketingQuery(
    () => api.listPerformance(query),
    [query.employeeId, query.period, query.page, query.pageSize]
  )
}

/** Rewards with filters and pagination. */
export function useRewards(query: {
  employeeId?: string
  page?: number
  pageSize?: number
} = {}) {
  return useMarketingQuery(
    () => api.listRewards(query),
    [query.employeeId, query.page, query.pageSize]
  )
}

/** Reward transactions for an employee. */
export function useRewardTransactions(employeeId: string | null) {
  return useMarketingQuery(
    () => (employeeId ? api.listRewardTransactions(employeeId) : Promise.resolve([])),
    [employeeId]
  )
}

/** Field visits with filters and pagination. */
export function useVisits(query: {
  q?: string
  status?: string
  type?: string
  assignedTo?: string
  leadId?: string
  customerId?: string
  from?: string
  to?: string
  sort?: string
  page?: number
  pageSize?: number
} = {}) {
  return useMarketingQuery(
    () => api.listVisits(query as any),
    [query.q, query.status, query.type, query.assignedTo, query.leadId, query.customerId, query.from, query.to, query.sort, query.page, query.pageSize]
  )
}

/** Single visit detail. */
export function useVisit(id: string | null) {
  return useMarketingQuery(
    () => (id ? api.getVisit(id) : Promise.resolve(null)),
    [id]
  )
}

/** Surveys with filters and pagination. */
export function useSurveys(query: QueryParams = {}) {
  return useMarketingQuery(
    () => api.listSurveys(query),
    [query.q, query.page, query.pageSize]
  )
}

/** Dealers with filters and pagination. */
export function useDealers(query: QueryParams = {}) {
  return useMarketingQuery(
    () => api.listDealers(query),
    [query.q, query.page, query.pageSize]
  )
}