import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppNotification, Customer, DemoData } from '../types/marketing'
import type { ExpenseWorkflowStatus, PlanWorkflowStatus } from '../types/workflow'
import { buildSeedData } from '../data/marketing'
import { DATA_KEY } from '../config/demo'
import { uid } from '../utils/format'
import { normalizeLead } from '../utils/leads'

interface StoredShape {
  version: 1
  data: DemoData
}

type UpdateFn = <K extends keyof DemoData>(
  key: K,
  updater: (current: DemoData[K]) => DemoData[K],
) => void

interface DemoDataContextValue {
  data: DemoData
  update: UpdateFn
  resetDemoData: () => void
  lastSavedAt: Date | null
  storageAvailable: boolean
  addNotification: (notification: Omit<AppNotification, 'id' | 'at' | 'read'>) => void
  markAllNotificationsRead: () => void
  markNotificationRead: (id: string) => void
}

const DemoDataContext = createContext<DemoDataContextValue | null>(null)

/**
 * Older demo builds used Finance wording for the Admin approval stage. Marketing
 * no longer has a Finance role, so migrate saved browser statuses to the Admin
 * terminology without losing the workflow position.
 */
const LEGACY_PLAN_STATUSES: Record<string, PlanWorkflowStatus> = {
  'Pending Finance/Admin Approval': 'Pending Admin Financial Authorization',
  'Pending Finance Review': 'Pending Admin Financial Authorization',
  'Pending Finance Approval': 'Pending Admin Financial Authorization',
  'Pending Admin Approval': 'Pending Admin Financial Authorization',
}

const LEGACY_EXPENSE_STATUSES: Record<string, ExpenseWorkflowStatus> = {
  'Pending Finance Review': 'Pending Admin Financial Authorization',
  'Pending Finance/Admin Approval': 'Pending Admin Financial Authorization',
  'Pending Finance Approval': 'Pending Admin Financial Authorization',
  'Pending Admin Review': 'Pending Admin Financial Authorization',
}

function hydrate(): DemoData {
  const seed = buildSeedData()
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) return seed
    const parsed = JSON.parse(raw) as Partial<StoredShape> | DemoData
    const stored =
      parsed && typeof parsed === 'object' && 'data' in parsed
        ? (parsed as StoredShape).data
        : (parsed as DemoData)
    if (!stored || typeof stored !== 'object') return seed
    // Merge missing collections so new demo modules never crash older saved data.
    const merged: DemoData = { ...seed }
    ;(Object.keys(seed) as Array<keyof DemoData>).forEach((key) => {
      const value = stored[key]
      if (Array.isArray(value)) {
        // @ts-expect-error collection keys share an array shape at runtime
        merged[key] = value
      }
    })
    if (stored.workflowConfig && typeof stored.workflowConfig === 'object') {
      merged.workflowConfig = { ...seed.workflowConfig, ...stored.workflowConfig }
    }

    merged.monthlyPlans = merged.monthlyPlans.map((plan) => {
      const status = LEGACY_PLAN_STATUSES[plan.status] ?? plan.status
      const awaitingAdmin = status === 'Pending Admin Financial Authorization'
      return {
        ...plan,
        status,
        currentApprover: awaitingAdmin ? 'Existing Admin Dashboard' : plan.currentApprover,
        adminAuthorization:
          awaitingAdmin && !plan.adminAuthorization
            ? {
                required: true,
                status: 'Pending',
                requestedAt: plan.updatedAt,
                decidedAt: null,
                decidedBy: null,
                comments:
                  'Migrated from older saved demo data. Awaiting the existing Totally ERP Admin Dashboard.',
                simulated: false,
              }
            : plan.adminAuthorization,
      }
    })

    merged.marketingExpenses = merged.marketingExpenses.map((expense) => {
      const status = LEGACY_EXPENSE_STATUSES[expense.status] ?? expense.status
      const awaitingAdmin = status === 'Pending Admin Financial Authorization'
      return {
        ...expense,
        status,
        currentApprover: awaitingAdmin ? 'Existing Admin Dashboard' : expense.currentApprover,
        adminAuthorization:
          awaitingAdmin && !expense.adminAuthorization
            ? {
                required: true,
                status: 'Pending',
                requestedAt: expense.submittedAt,
                decidedAt: null,
                decidedBy: null,
                comments:
                  'Migrated from older saved demo data. Awaiting the existing Totally ERP Admin Dashboard.',
                simulated: false,
              }
            : expense.adminAuthorization,
      }
    })

    // Older saved data predates customer records. Rebuild any missing customer
    // links from converted leads rather than leaving broken references.
    const defaultRep = merged.salesReps[0]
    const customers = [...merged.customers]
    merged.leads = merged.leads.map((lead) => normalizeLead(lead))
    merged.leads
      .filter((lead) => lead.converted && lead.customerId)
      .forEach((lead) => {
        if (customers.some((customer) => customer.id === lead.customerId)) return
        const fallback: Customer = {
          id: lead.customerId!,
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
          salesRepId: defaultRep?.id ?? '',
          status: 'Active',
          notes: 'Restored from a converted lead in older local demo data.',
          createdAt: lead.lastContact || lead.createdAt,
        }
        customers.push(fallback)
      })
    merged.customers = customers

    // Keep opportunity/customer and sales-representative links consistent for
    // records that were stored before these fields existed.
    merged.opportunities = merged.opportunities.map((opportunity) => {
      const customer =
        (opportunity.customerId && customers.find((item) => item.id === opportunity.customerId)) ||
        customers.find((item) => item.leadId === opportunity.leadId)
      return {
        ...opportunity,
        customerId: opportunity.customerId ?? customer?.id,
        salesRepId: opportunity.salesRepId ?? customer?.salesRepId ?? defaultRep?.id,
      }
    })

    return merged
  } catch {
    return seed
  }
}

function serialize(data: DemoData): string {
  const persisted: DemoData = {
    ...data,
    // Blob object URLs are session-only and cannot be restored after reload.
    assets: data.assets.map((asset) =>
      asset.localUrl?.startsWith('blob:') ? { ...asset, localUrl: undefined } : asset,
    ),
  }
  return JSON.stringify({ version: 1, data: persisted } satisfies StoredShape)
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>(hydrate)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const isFirstRender = useRef(true)

  const update = useCallback<UpdateFn>((key, updater) => {
    setData((current) => ({ ...current, [key]: updater(current[key]) }))
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
    }
    try {
      localStorage.setItem(DATA_KEY, serialize(data))
      setStorageAvailable(true)
      setLastSavedAt(new Date())
    } catch {
      setStorageAvailable(false)
    }
  }, [data])

  const resetDemoData = useCallback(() => {
    setData(buildSeedData())
    try {
      localStorage.removeItem(DATA_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const addNotification = useCallback<DemoDataContextValue['addNotification']>(
    (notification) => {
      setData((current) => ({
        ...current,
        notifications: [
          {
            ...notification,
            id: uid('NT'),
            at: new Date().toISOString(),
            read: false,
          },
          ...current.notifications,
        ].slice(0, 30),
      }))
    },
    [],
  )

  const markAllNotificationsRead = useCallback(() => {
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((n) => ({ ...n, read: true })),
    }))
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }))
  }, [])

  const value = useMemo(
    () => ({
      data,
      update,
      resetDemoData,
      lastSavedAt,
      storageAvailable,
      addNotification,
      markAllNotificationsRead,
      markNotificationRead,
    }),
    [
      data,
      update,
      resetDemoData,
      lastSavedAt,
      storageAvailable,
      addNotification,
      markAllNotificationsRead,
      markNotificationRead,
    ],
  )

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>
}

export function useDemoData(): DemoDataContextValue {
  const ctx = useContext(DemoDataContext)
  if (!ctx) throw new Error('useDemoData must be used inside DemoDataProvider')
  return ctx
}
