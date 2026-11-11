import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Activity, Database } from './types'
import { createDemoDatabase } from './data/demo'
import { uid } from './lib/utils'
import { fetchHrDatabase } from './api-sync'
import {
  ApiError,
  hasApiToken,
  isApiConfigured,
  setAccessToken,
  setUnauthorizedHandler,
} from '@/lib/api/client'

const STORAGE_KEY = 'titan-hr-db-v1'
const THEME_KEY = 'titan-hr-theme'

function loadDb(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Database
      if (parsed && Array.isArray(parsed.employees) && parsed.employees.length > 0) return parsed
    }
  } catch {
    // corrupted store — fall back to demo data
  }
  return createDemoDatabase()
}

export type ToastType = 'success' | 'error' | 'info' | 'warning'
export interface Toast {
  id: string
  message: string
  description?: string
  type: ToastType
}

export type HrDataSource = 'demo' | 'api'
export type HrSyncStatus = 'idle' | 'loading' | 'ready' | 'error'

interface StoreContextValue {
  db: Database
  setDb: React.Dispatch<React.SetStateAction<Database>>
  update: (updater: (db: Database) => Database) => void
  resetDemo: () => void
  logActivity: (type: Activity['type'], title: string, detail: string, actor?: string) => void
  toast: (message: string, type?: ToastType, description?: string) => void
  toasts: Toast[]
  dismissToast: (id: string) => void
  /** Which backing store is currently shown: the real API or localStorage demo data. */
  dataSource: HrDataSource
  syncStatus: HrSyncStatus
  syncError: string | null
  /** Re-fetch every HR collection from the API. */
  refreshFromApi: () => Promise<void>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(loadDb)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [dataSource, setDataSource] = useState<HrDataSource>('demo')
  const [syncStatus, setSyncStatus] = useState<HrSyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const hydrationStarted = useRef(false)

  // Demo data is persisted locally. API-backed records live in the database and
  // must never be copied back into the demo localStorage bucket.
  useEffect(() => {
    if (dataSource !== 'demo') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      // storage may be full; the app remains fully functional in memory
    }
  }, [db, dataSource])

  const hydrateFromApi = useCallback(async () => {
    if (!isApiConfigured() || !hasApiToken()) {
      setDataSource('demo')
      setSyncStatus('idle')
      setSyncError(null)
      return
    }
    setSyncStatus('loading')
    setSyncError(null)
    try {
      const next = await fetchHrDatabase()
      setDb(next)
      setDataSource('api')
      setSyncStatus('ready')
    } catch (error) {
      setDataSource('demo')
      setSyncStatus('error')
      setSyncError(
        error instanceof ApiError && error.code === 'network_error'
          ? 'The ERP API is unreachable. Showing demo data.'
          : error instanceof Error
            ? error.message
            : 'Could not load HR data from the API.',
      )
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // A rejected token must not leave the portal showing authenticated data.
      setAccessToken(null)
      setDataSource('demo')
      setSyncStatus('idle')
    })
    if (hydrationStarted.current) return
    hydrationStarted.current = true
    void hydrateFromApi()
    return () => setUnauthorizedHandler(null)
  }, [hydrateFromApi])

  const update = useCallback((updater: (d: Database) => Database) => {
    setDb((prev) => updater(prev))
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'success', description?: string) => {
      const id = uid('toast')
      setToasts((prev) => [...prev, { id, message, type, description }])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4200)
    },
    [],
  )

  const logActivity = useCallback(
    (type: Activity['type'], title: string, detail: string, actor = 'Aisha Bello') => {
      setDb((prev) => ({
        ...prev,
        activities: [
          { id: uid('act'), type, title, detail, actor, date: new Date().toISOString() },
          ...prev.activities,
        ].slice(0, 40),
      }))
    },
    [],
  )

  const resetDemo = useCallback(() => {
    const fresh = createDemoDatabase()
    setDb(fresh)
    setDataSource('demo')
    setSyncStatus('idle')
    setSyncError(null)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    } catch {
      // ignore
    }
    toast('Demo workspace reset', 'success', 'All modules have been restored to their original demo data.')
  }, [toast])

  const refreshFromApi = useCallback(async () => {
    await hydrateFromApi()
    setSyncStatus((status) => {
      if (status === 'ready') toast('HR data refreshed', 'success', 'All modules were reloaded from the API.')
      return status
    })
  }, [hydrateFromApi, toast])

  const value = useMemo(
    () => ({
      db,
      setDb,
      update,
      resetDemo,
      logActivity,
      toast,
      toasts,
      dismissToast,
      dataSource,
      syncStatus,
      syncError,
      refreshFromApi,
    }),
    [
      db,
      update,
      resetDemo,
      logActivity,
      toast,
      toasts,
      dismissToast,
      dataSource,
      syncStatus,
      syncError,
      refreshFromApi,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

// ——— Theme ————————————————————————————————————————————————————————
interface ThemeContextValue {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (t: 'light' | 'dark') => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    return 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const setTheme = useCallback((t: 'light' | 'dark') => setThemeState(t), [])
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'light' ? 'dark' : 'light')), [])

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
