import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { Info, X } from 'lucide-react'
import { getModule } from '../../config/navigation'
import { useDemoData } from '../../context/DemoDataContext'
import { useRoleWorkspace } from '../../context/RoleWorkspaceContext'
import { useMarketingDepartment } from '../../context/MarketingDepartmentContext'
import { useHRData } from '../../context/HRContext'
import { useToast } from '../../context/ToastContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { EmployeeProfileModal } from './EmployeeProfileModal'
import { ConfirmDialog } from '../ui/ConfirmDialog'

const COLLAPSE_KEY = 'totally-erp-marketing-sidebar-collapsed'
const BANNER_KEY = 'totally-erp-marketing-demo-banner-dismissed'

export function AppLayout() {
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const { resetDemoData } = useDemoData()
  const { resetWorkspace } = useRoleWorkspace()
  const { resetDepartment } = useMarketingDepartment()
  const { resetHR } = useHRData()
  const { pushToast } = useToast()

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(BANNER_KEY) === 'true'
    } catch {
      return false
    }
  })

  const { module, activeTabLabel } = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    const mod = getModule(segments[1])
    const tab = mod?.tabs.find((item) => item.id === segments[2])
    return { module: mod, activeTabLabel: tab?.label }
  }, [location.pathname])

  // Keep the module shell mounted while switching horizontal tabs so the
  // sliding tab indicator can animate between destinations.
  const pageKey = module?.id ?? location.pathname

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed))
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    document.body.classList.toggle('nav-open', mobileOpen)
    return () => document.body.classList.remove('nav-open')
  }, [mobileOpen])

  const dismissBanner = () => {
    setBannerDismissed(true)
    try {
      sessionStorage.setItem(BANNER_KEY, 'true')
    } catch {
      /* ignore */
    }
  }

  const confirmReset = () => {
    resetDemoData()
    resetWorkspace()
    resetDepartment()
    resetHR()
    setResetOpen(false)
    pushToast({
      title: 'Demo data reset',
      description:
        'Marketing and HR demo records, role workspace changes and HR settings were restored to their initial state.',
      tone: 'success',
    })
  }

  return (
    <div
      className={[
        'app-shell',
        collapsed ? 'is-collapsed' : '',
        mobileOpen ? 'is-mobile-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenDemoSettings={() => setResetOpen(true)}
      />
      <div className="app-content">
        <Topbar
          module={module}
          activeTabLabel={activeTabLabel}
          onOpenMobileNav={() => setMobileOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenDemoSettings={() => setResetOpen(true)}
        />
        {!bannerDismissed ? (
          <div className="demo-banner" role="note">
            <Info size={14} aria-hidden="true" />
            <p>
              <strong>Demo workspace.</strong> All marketing and HR figures, records and AI responses are
              local sample data. No backend, payment, messaging or live advertising service is connected.
            </p>
            <button type="button" className="demo-banner__close" aria-label="Dismiss demo notice" onClick={dismissBanner}>
              <X size={14} />
            </button>
          </div>
        ) : null}
        <main className="page" id="main-content">
          <motion.div
            key={pageKey}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.2, 0.65, 0.35, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <EmployeeProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={confirmReset}
        title="Reset all demo data?"
        description="This restores the original sample campaigns, leads, expenses, approvals, assets, employee records, attendance, leave, payroll and HR settings. Any demo records you created or changed in this browser will be replaced. This action cannot be undone."
        confirmLabel="Reset demo data"
      />
    </div>
  )
}
