/**
 * Reusable read-data hooks for HR pages.
 *
 * In API mode (dataSource === 'api'), each hook fetches from the corresponding
 * backend GET endpoint with loading/error states and abort-signal cleanup.
 * In demo mode, hooks return loading: false and data: null so the calling
 * page falls back to its existing Zustand demo state (db.*). API errors are
 * surfaced as error state — never silently falling back to demo data.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import * as api from '@/lib/api/hr'
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
function useHrQuery<T>(fetchFn: () => Promise<T>, deps: unknown[] = []): QueryState<T> {
  const { dataSource } = useStore()
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

/** Employee list with pagination, search, and filters. */
export function useEmployees(query: {
  q?: string
  departmentId?: string
  designationId?: string
  status?: string
  employmentType?: string
  sort?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listEmployees(query as any),
    [query.q, query.departmentId, query.designationId, query.status, query.employmentType, query.sort, query.page, query.pageSize]
  )
}

/** Single employee detail. */
export function useEmployee(id: string | null) {
  return useHrQuery(
    () => (id ? api.getEmployee(id) : Promise.resolve(null)),
    [id]
  )
}

/** Attendance records with filters and pagination. */
export function useAttendance(query: {
  employeeId?: string
  departmentId?: string
  status?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listAttendance(query as any),
    [query.employeeId, query.departmentId, query.status, query.from, query.to, query.page, query.pageSize]
  )
}

/** Leave applications with filters and pagination. */
export function useLeaves(query: {
  employeeId?: string
  leaveTypeId?: string
  status?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listLeaves(query as any),
    [query.employeeId, query.leaveTypeId, query.status, query.from, query.to, query.page, query.pageSize]
  )
}

/** Payroll runs with filters and pagination. */
export function usePayrollRuns(query: {
  period?: string
  status?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listPayrollRuns(query as any),
    [query.period, query.status, query.page, query.pageSize]
  )
}

/** Payslips with filters and pagination. */
export function usePayslips(query: {
  period?: string
  employeeId?: string
  status?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listPayslips(query as any),
    [query.period, query.employeeId, query.status, query.page, query.pageSize]
  )
}

/** Contracts with filters and pagination. */
export function useContracts(query: {
  q?: string
  status?: string
  partyType?: string
  employeeId?: string
  from?: string
  to?: string
  sort?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listContracts(query as any),
    [query.q, query.status, query.partyType, query.employeeId, query.from, query.to, query.sort, query.page, query.pageSize]
  )
}

/** Payments with filters and pagination. */
export function usePayments(query: {
  approvalStatus?: string
  paymentStatus?: string
  partyType?: string
  employeeId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listPayments(query as any),
    [query.approvalStatus, query.paymentStatus, query.partyType, query.employeeId, query.from, query.to, query.page, query.pageSize]
  )
}

/** HR expenses with filters and pagination. */
export function useHrExpenses(query: {
  q?: string
  status?: string
  employeeId?: string
  category?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listHrExpenses(query as any),
    [query.q, query.status, query.employeeId, query.category, query.from, query.to, query.page, query.pageSize]
  )
}

/** Leave types. */
export function useLeaveTypes() {
  return useHrQuery(() => api.listLeaveTypes())
}

/**
 * Leave balances. The backend scopes these to the signed-in employee unless
 * the caller holds `hr.leave.read`.
 */
export function useLeaveBalances(query: { employeeId?: string; year?: number } = {}) {
  return useHrQuery(
    () => api.listLeaveBalances(query),
    [query.employeeId, query.year]
  )
}

/** Holidays configured for the organisation. */
export function useHolidays() {
  return useHrQuery(() => api.listHolidays())
}

/** Departments. */
export function useDepartments() {
  return useHrQuery(() => api.listDepartments())
}

/** Designations. */
export function useDesignations() {
  return useHrQuery(() => api.listDesignations())
}

/** Attendance corrections with filters. */
export function useCorrections(query: { status?: string } = {}) {
  return useHrQuery(
    () => api.listCorrections(query as any),
    [query.status]
  )
}

/** Employee requests with filters and pagination. */
export function useEmployeeRequests(query: {
  employeeId?: string
  status?: string
  priority?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listEmployeeRequests(query as any),
    [query.employeeId, query.status, query.priority, query.page, query.pageSize]
  )
}

/** Jobs (recruitment) with filters. */
export function useJobs(query: {
  status?: string
  departmentId?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listJobs(query as any),
    [query.status, query.departmentId, query.page, query.pageSize]
  )
}

/** Candidates with filters. */
export function useCandidates(query: {
  jobId?: string
  stage?: string
  q?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listCandidates(query as any),
    [query.jobId, query.stage, query.q, query.page, query.pageSize]
  )
}

/** Onboarding records. */
export function useOnboarding() {
  return useHrQuery(() => api.listOnboarding())
}

/** Performance reviews with filters. */
export function useReviews(query: {
  employeeId?: string
  period?: string
  status?: string
  page?: number
  pageSize?: number
} = {}) {
  return useHrQuery(
    () => api.listReviews(query as any),
    [query.employeeId, query.period, query.status, query.page, query.pageSize]
  )
}

/** Offboarding records. */
export function useOffboarding() {
  return useHrQuery(() => api.listOffboarding())
}

/** HR dashboard KPIs. */
export function useHrDashboard() {
  return useHrQuery(() => api.getDashboard())
}

/** HR analytics. */
export function useHrAnalytics() {
  return useHrQuery(() => api.getAnalytics())
}

/** Attendance analytics. */
export function useHrAttendanceAnalytics() {
  return useHrQuery(() => api.getAttendanceAnalytics())
}

/** Payroll analytics. */
export function useHrPayrollAnalytics() {
  return useHrQuery(() => api.getPayrollAnalytics())
}

/** Activities. */
export function useActivities(query: QueryParams = {}) {
  return useHrQuery(
    () => api.getActivities(query),
    [query.q, query.page, query.pageSize]
  )
}