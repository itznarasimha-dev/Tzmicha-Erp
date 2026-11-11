import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  CircleDollarSign,
  FilePlus2,
  LogOut,
  Menu,
  Moon,
  Plus,
  ReceiptText,
  Search,
  Sun,
  Target,
  UserRound,
  X,
} from 'lucide-react'
import type { MarketingModule } from '../../config/navigation'
import {
  getRoleDefaultSection,
  getRoleNavigation,
  roleWorkspacePath,
  ROLE_QUICK_ACTIONS,
} from '../../config/roleNavigation'
import {
  HR_HOME,
  HR_NAVIGATION,
  HR_QUICK_ACTIONS,
  isHRPath,
} from '../../config/hrNavigation'
import { useAuth } from '../../context/AuthContext'
import { useDemoData } from '../../context/DemoDataContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import { formatRelative } from '../../utils/dates'
import { GlobalSearch } from './GlobalSearch'
import { RoleSwitcher } from './RoleSwitcher'

interface TopbarProps {
  module?: MarketingModule
  activeTabLabel?: string
  onOpenMobileNav: () => void
  onOpenProfile: () => void
  onOpenDemoSettings: () => void
}

const notificationIcon = {
  approval: BadgeCheck,
  followup: Target,
  budget: CircleDollarSign,
  expense: ReceiptText,
  system: Bell,
} as const

export function Topbar({
  module,
  activeTabLabel,
  onOpenMobileNav,
  onOpenProfile,
  onOpenDemoSettings,
}: TopbarProps) {
  const { session, signOut } = useAuth()
  const { profile, roleId } = useDemoRole()
  const { theme, toggleTheme } = useTheme()
  const { data, markAllNotificationsRead, markNotificationRead } = useDemoData()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const notificationRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const quickRef = useRef<HTMLDivElement>(null)
  const topbarRef = useRef<HTMLDivElement>(null)

  const unread = useMemo(() => data.notifications.filter((item) => !item.read).length, [data.notifications])
  const employeeName = profile.name
  const initials = profile.initials

  const workspaceSectionId = location.pathname.startsWith('/marketing/workspace/')
    ? location.pathname.split('/')[3] ?? ''
    : location.pathname === '/marketing/workspace'
      ? getRoleDefaultSection(roleId)
      : ''
  const workspaceActive = location.pathname.startsWith('/marketing/workspace')
  const workspaceItem = getRoleNavigation(roleId).find((item) => item.id === workspaceSectionId)
  const hrActive = isHRPath(location.pathname)
  const hrSection = hrActive ? location.pathname.split('/')[2] ?? 'dashboard' : ''
  const hrItem = HR_NAVIGATION.find((item) => item.id === hrSection)
  const quickActions = hrActive
    ? HR_QUICK_ACTIONS
    : ROLE_QUICK_ACTIONS[roleId] ?? ROLE_QUICK_ACTIONS.junior
  const homePath = hrActive ? HR_HOME : roleWorkspacePath(getRoleDefaultSection(roleId))
  const pageTitle = hrActive
    ? hrItem?.label ?? 'HR Management'
    : workspaceActive
      ? workspaceItem?.label ?? 'My workspace'
      : module?.label ?? 'Marketing Employee Portal'

  useClickOutside(notificationRef, () => setNotificationsOpen(false), notificationsOpen)
  useClickOutside(profileRef, () => setProfileOpen(false), profileOpen)
  useClickOutside(quickRef, () => setQuickOpen(false), quickOpen)

  useEffect(() => {
    setNotificationsOpen(false)
    setProfileOpen(false)
    setQuickOpen(false)
    setMobileSearchOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.title = hrActive
      ? 'Totally ERP · People Workspace'
      : 'Totally ERP · Marketing Portal'
  }, [hrActive])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (window.innerWidth <= 900) {
          setMobileSearchOpen(true)
          window.setTimeout(() => {
            document.querySelector<HTMLInputElement>('.mobile-search-panel input')?.focus()
          }, 80)
        } else {
          topbarRef.current?.querySelector<HTMLInputElement>('.global-search input')?.focus()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const closeMobileSearch = () => setMobileSearchOpen(false)

  const handleNotificationClick = (id: string, href?: string) => {
    markNotificationRead(id)
    if (href) {
      setNotificationsOpen(false)
      navigate(href)
    }
  }

  const handleMarkAllRead = () => {
    markAllNotificationsRead()
    pushToast({ title: 'Notifications marked as read', tone: 'success' })
  }

  const dateLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  return (
    <header className="topbar" ref={topbarRef}>
      <div className="topbar__left">
        <button type="button" className="topbar__mobile-menu" onClick={onOpenMobileNav} aria-label="Open navigation">
          <Menu size={19} />
        </button>
        <div className="topbar__titles">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to={homePath}>{hrActive ? 'HR Management' : 'Marketing'}</Link>
            {hrActive ? (
              <>
                <span className="breadcrumb__sep" aria-hidden="true">/</span>
                <span>People workspace</span>
                <span className="breadcrumb__sep" aria-hidden="true">/</span>
                <span style={{ color: 'var(--muted)' }}>{hrItem?.label ?? 'My dashboard'}</span>
              </>
            ) : null}
            {!hrActive && workspaceActive ? (
              <>
                <span className="breadcrumb__sep" aria-hidden="true">/</span>
                <span>Role workspace</span>
                <span className="breadcrumb__sep" aria-hidden="true">/</span>
                <span style={{ color: 'var(--muted)' }}>{workspaceItem?.label ?? 'My dashboard'}</span>
              </>
            ) : null}
            {!hrActive && !workspaceActive && module ? (
              <>
                <span className="breadcrumb__sep" aria-hidden="true">/</span>
                <span>{module.label}</span>
              </>
            ) : null}
            {!hrActive && !workspaceActive && activeTabLabel ? (
              <>
                <span className="breadcrumb__sep" aria-hidden="true">/</span>
                <span style={{ color: 'var(--muted)' }}>{activeTabLabel}</span>
              </>
            ) : null}
          </nav>
          <p className="topbar__title">{pageTitle}</p>
        </div>
      </div>

      <div className="topbar__actions">
        <div className="topbar__search">
          <GlobalSearch />
        </div>

        <span className="topbar__date">
          <CalendarDays size={14} aria-hidden="true" />
          {dateLabel}
        </span>

        <RoleSwitcher />

        <div ref={quickRef} className="topbar__quick" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`topbar-action ${quickOpen ? 'is-open' : ''}`.trim()}
            aria-label="Quick actions"
            aria-haspopup="menu"
            aria-expanded={quickOpen}
            onClick={() => {
              setQuickOpen((value) => !value)
              setNotificationsOpen(false)
              setProfileOpen(false)
            }}
          >
            <Plus size={18} />
          </button>
          {quickOpen ? (
            <div className="menu" role="menu" aria-label={hrActive ? 'HR quick actions' : 'Quick actions'}>
              <p className="menu__label">{hrActive ? 'HR quick actions' : 'Quick actions'}</p>
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      setQuickOpen(false)
                      navigate(action.href)
                    }}
                  >
                    <Icon size={15} />
                    {action.label}
                  </button>
                )
              })}
              <div className="menu__divider" />
              <p className="text-xs faint" style={{ padding: '0 10px 6px' }}>
                New records are stored in this browser only.
              </p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="topbar-action"
          aria-label="Open global search"
          onClick={() => {
            if (window.innerWidth <= 900) {
              setMobileSearchOpen(true)
            } else {
              topbarRef.current?.querySelector<HTMLInputElement>('.global-search input')?.focus()
            }
          }}
        >
          <Search size={18} />
        </button>

        <button
          type="button"
          className="topbar-action"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`topbar-action ${notificationsOpen ? 'is-open' : ''}`.trim()}
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            aria-haspopup="true"
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen((value) => !value)
              setProfileOpen(false)
              setQuickOpen(false)
            }}
          >
            <Bell size={18} />
            {unread > 0 ? <span className="notif-count" aria-hidden="true">{unread}</span> : null}
          </button>
          {notificationsOpen ? (
            <div className="notification-panel">
              <div className="notification-panel__head">
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>Notifications</p>
                  <p className="text-xs muted">{unread} unread · demo notifications</p>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  onClick={handleMarkAllRead}
                  disabled={unread === 0}
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              </div>
              <div className="notification-panel__list">
                {data.notifications.length === 0 ? (
                  <div className="search-empty">No notifications yet.</div>
                ) : (
                  data.notifications.map((notification) => {
                    const Icon = notificationIcon[notification.kind] ?? Bell
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        className={`notification-item ${notification.read ? '' : 'is-unread'}`.trim()}
                        onClick={() => handleNotificationClick(notification.id, notification.href)}
                      >
                        <span className={`notification-item__icon notification-item__icon--${notification.kind}`}>
                          <Icon size={14} />
                        </span>
                        <span>
                          <span className="notification-item__title">{notification.title}</span>
                          <span className="notification-item__body">{notification.body}</span>
                          <span className="notification-item__time">{formatRelative(notification.at)}</span>
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="notification-panel__foot">
                Local demo notifications · not sent by email or SMS
              </div>
            </div>
          ) : null}
        </div>

        <div ref={profileRef} className="topbar__profile" style={{ position: 'relative' }}>
          <button
            type="button"
            className="topbar__profile-btn"
            aria-label="Open employee menu"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen((value) => !value)
              setNotificationsOpen(false)
              setQuickOpen(false)
            }}
          >
            <span className="avatar avatar--sm" aria-hidden="true">{initials}</span>
            <span className="topbar__profile-name">
              {employeeName}
              <span className="topbar__profile-role" style={{ display: 'block' }}>
                {profile.roleLabel}
              </span>
            </span>
            <ChevronDown size={14} color="var(--muted)" aria-hidden="true" />
          </button>
          {profileOpen ? (
            <div className="menu" style={{ minWidth: 264 }} role="menu">
              <div className="profile-menu-header">
                <span className="avatar avatar--lg" aria-hidden="true">{initials}</span>
                <div style={{ minWidth: 0 }}>
                  <p className="profile-menu-header__name">{employeeName}</p>
                  <p className="profile-menu-header__email">{profile.email}</p>
                  <p className="profile-menu-header__id">
                    {profile.employeeId} · {profile.department}
                  </p>
                </div>
              </div>
              <span className="badge badge--warning" style={{ margin: '0 10px 7px' }}>
                Preview role — not a real employee login
              </span>
              <div className="menu__divider" />
              <button
                type="button"
                className="menu__item"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false)
                  onOpenProfile()
                }}
              >
                <UserRound size={15} /> Employee profile & targets
              </button>
              <button
                type="button"
                className="menu__item"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false)
                  onOpenDemoSettings()
                }}
              >
                <FilePlus2 size={15} /> Reset demo data
              </button>
              <button type="button" className="menu__item" role="menuitem" onClick={toggleTheme}>
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                Switch to {theme === 'light' ? 'dark' : 'light'} mode
              </button>
              <div className="menu__divider" />
              <button
                type="button"
                className="menu__item menu__item--danger"
                role="menuitem"
                onClick={signOut}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {mobileSearchOpen ? (
        <div className="mobile-search-panel">
          <div className="row-8">
            <div className="grow">
              <GlobalSearch autoFocus onNavigate={closeMobileSearch} />
            </div>
            <button type="button" className="icon-btn" onClick={closeMobileSearch} aria-label="Close search">
              <X size={17} />
            </button>
          </div>
        </div>
      ) : null}
    </header>
  )
}
