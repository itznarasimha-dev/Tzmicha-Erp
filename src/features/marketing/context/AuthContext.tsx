import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEMO_CREDENTIALS, SESSION_KEY } from '../config/demo'

export interface DemoSession {
  employeeId: string
  name: string
  email: string
  role: string
  department: string
  demo: true
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
    if (!parsed?.email || !parsed.demo) return null
    return parsed
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

  const signIn = useCallback(
    async (identifier: string, password: string, remember: boolean): Promise<LoginResult> => {
      setIsSigningIn(true)
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
        startedAt: new Date().toISOString(),
      }

      try {
        const target = remember ? localStorage : sessionStorage
        const other = remember ? sessionStorage : localStorage
        target.setItem(SESSION_KEY, JSON.stringify(nextSession))
        other.removeItem(SESSION_KEY)
      } catch {
        /* session remains in memory even if storage is unavailable */
      }
      setSession(nextSession)
      setIsSigningIn(false)
      return { ok: true }
    },
    [],
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
