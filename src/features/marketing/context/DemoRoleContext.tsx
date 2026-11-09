import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEMO_ROLE_KEY } from '../config/demo'
import { DEMO_ROLE_PROFILES } from '../data/marketing/roleWorkflow'
import type { DemoRoleId, DemoRoleProfile } from '../types/workflow'
import { useErpStore } from '../../../store/useErpStore'

interface DemoRoleContextValue {
  roleId: DemoRoleId
  profile: DemoRoleProfile
  profiles: DemoRoleProfile[]
  setRoleId: (roleId: DemoRoleId) => void
}

const DemoRoleContext = createContext<DemoRoleContextValue | null>(null)

const WORKSPACE_ROLES: DemoRoleId[] = ['junior', 'senior', 'manager']
const WORKSPACE_PROFILES = DEMO_ROLE_PROFILES.filter((profile) =>
  WORKSPACE_ROLES.includes(profile.id),
)

function readRole(): DemoRoleId {
  try {
    const storeUser = useErpStore.getState?.()?.currentUser
    if (storeUser?.role === 'marketing' && storeUser.marketingSubRole) {
      if (storeUser.marketingSubRole === 'marketing_manager') return 'manager'
      if (storeUser.marketingSubRole === 'marketing_senior') return 'senior'
      return 'junior'
    }
    const stored = localStorage.getItem(DEMO_ROLE_KEY)
    if (stored && WORKSPACE_ROLES.includes(stored as DemoRoleId)) {
      return stored as DemoRoleId
    }
  } catch {
    /* ignore */
  }
  return 'manager'
}

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const [roleId, setRoleIdState] = useState<DemoRoleId>(readRole)
  const currentUser = useErpStore((s) => s.currentUser)

  useEffect(() => {
    if (currentUser?.role === 'marketing') {
      const sub = currentUser.marketingSubRole
      const targetId: DemoRoleId =
        sub === 'marketing_manager' ? 'manager' : sub === 'marketing_senior' ? 'senior' : 'junior'
      if (targetId !== roleId) {
        setRoleIdState(targetId)
      }
    }
  }, [currentUser, roleId])

  useEffect(() => {
    try {
      localStorage.setItem(DEMO_ROLE_KEY, roleId)
    } catch {
      /* ignore */
    }
  }, [roleId])

  const setRoleId = useCallback((next: DemoRoleId) => setRoleIdState(next), [])

  const value = useMemo(() => {
    const profile = WORKSPACE_PROFILES.find((item) => item.id === roleId) ?? WORKSPACE_PROFILES[0]
    return { roleId, profile, profiles: WORKSPACE_PROFILES, setRoleId }
  }, [roleId, setRoleId])

  return <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>
}

export function useDemoRole(): DemoRoleContextValue {
  const ctx = useContext(DemoRoleContext)
  if (!ctx) throw new Error('useDemoRole must be used inside DemoRoleProvider')
  return ctx
}
