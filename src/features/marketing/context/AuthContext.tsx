import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEMO_CREDENTIALS, SESSION_KEY } from '../config/demo'
import {
  fetchCurrentUser,
  getSupabaseConfig,
  signInWithPassword,
} from '@/lib/api/auth'
import { setAccessToken, setRefreshToken } from '@/lib/api/client'

export interface DemoSession {
  employeeId: string
  name: string
  email: string
  role: string
  department: string
  /** True for the browser-only demo account, false for a verified API login. */
  demo: boolean
  mode: 'demo' | 'api'
  startedAt: string
}

interface LoginResult {
  ok: boolean
  error?: string
}

interface AuthContextValue {
  session: DemoSession | null
  isAuthenticated: boolean
  isSigningIn: boolean
  signIn: (identifier: string, password: string, remember: boolean) => Promise<LoginResult>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DemoSession
    if (!parsed?.email || typeof parsed.demo !== 'boolean') return null
    return { ...parsed, mode: parsed.demo ? 'demo' : parsed.mode ?? 'api' }
  } catch {
    return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(readSession)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const persist = useCallback((nextSession: DemoSession, remember: boolean) => {
    try {
      const target = remember ? localStorage : sessionStorage
      const other = remember ? sessionStorage : localStorage
      target.setItem(SESSION_KEY, JSON.stringify(nextSession))
      other.removeItem(SESSION_KEY)
    } catch {
      /* session remains in memory even if storage is unavailable */
    }
  }, [])

  const signIn = useCallback(
    async (identifier: string, password: string, remember: boolean): Promise<LoginResult> => {
      setIsSigningIn(true)

      // Prefer a real Supabase login whenever the deployment is configured.
      if (getSupabaseConfig()) {
        const result = await signInWithPassword(identifier, password, remember)
        if (result.ok) {
          try {
            const me = await fetchCurrentUser()
            const nextSession: DemoSession = {
              employeeId: me.user.employeeCode || me.user.id,
              name: me.user.name,
              email: me.user.email,
              role: me.user.role,
              department: me.organization.name,
              demo: false,
              mode: 'api',
              startedAt: new Date().toISOString(),
            }
            persist(nextSession, remember)
            setSession(nextSession)
            setIsSigningIn(false)
            return { ok: true }
          } catch {
            // The access token was rejected before a profile could be loaded.
            setAccessToken(null)
            setRefreshToken(null)
            setIsSigningIn(false)
            return { ok: false, error: 'Signed in, but the ERP profile could not be loaded.' }
          }
        }
      }

      // Browser demo fallback — never used for authorization.
      await delay(950)
      const normalized = identifier.trim().toLowerCase()
      const matchesIdentifier =
        normalized === DEMO_CREDENTIALS.email || normalized === DEMO_CREDENTIALS.employeeId.toLowerCase()
      const matchesPassword = password === DEMO_CREDENTIALS.password

      if (!matchesIdentifier || !matchesPassword) {
        setIsSigningIn(false)
        return {
          ok: false,
          error:
            'Those demo credentials do not match. Use the demo access details shown below — no real employee account is connected.',
        }
      }

      const nextSession: DemoSession = {
        employeeId: DEMO_CREDENTIALS.employeeId,
        name: DEMO_CREDENTIALS.name,
        email: DEMO_CREDENTIALS.email,
        role: DEMO_CREDENTIALS.role,
        department: DEMO_CREDENTIALS.department,
        demo: true,
        mode: 'demo',
        startedAt: new Date().toISOString(),
      }

      persist(nextSession, remember)
      setSession(nextSession)
      setIsSigningIn(false)
      return { ok: true }
    },
    [persist],
  )

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      isSigningIn,
      signIn,
      signOut,
    }),
    [session, isSigningIn, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
