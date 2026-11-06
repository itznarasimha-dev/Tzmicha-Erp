import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  LogOut,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  UsersRound,
  X,
} from 'lucide-react'
import {
  getRoleDefaultSection,
  getRoleNavigation,
  roleWorkspaceHome,
  roleWorkspacePath,
} from '../../config/roleNavigation'
import { HR_HOME, HR_NAVIGATION, hrWorkspacePath, isHRPath } from '../../config/hrNavigation'
import { useAuth } from '../../context/AuthContext'
import { useDemoRole } from '../../context/DemoRoleContext'
import { useHRData } from '../../context/HRContext'
import { useMarketingDepartment } from '../../context/MarketingDepartmentContext'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  onOpenProfile: () => void
  onOpenDemoSettings: () => void
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  onOpenProfile,
  onOpenDemoSettings,
}: SidebarProps) {
  const { signOut } = useAuth()
  const { profile, roleId } = useDemoRole()
  const department = useMarketingDepartment()
  const hr = useHRData()
  const location = useLocation()
  const roleNavigation = getRoleNavigation(roleId)
  const roleDefaultSection = getRoleDefaultSection(roleId)
  const hrMode = isHRPath(location.pathname)
  const hrSection = hrMode ? location.pathname.split('/')[2] ?? 'dashboard' : ''

  const myPendingReviews = useMemo(() => {
    if (roleId === 'manager') {
      return (
        department.approvalRequests.filter((request) => request.status === 'Pending Manager Review').length +
        department.expenses.filter((expense) => expense.status === 'Manager Review').length
      )
    }
    if (roleId === 'senior') {
      return (
        department.expenses.filter((expense) => expense.status === 'Under Senior Review').length +
        department.leads.filter((lead) => lead.stage === 'Senior Review' && lead.assignedSeniorId === profile.employeeId).length
      )
    }
    return department.tasks.filter(
      (task) => task.assignedJuniorId === profile.employeeId && task.status !== 'Completed',
    ).length
  }, [department, roleId, profile.employeeId])

  const hrPending = useMemo(
    () => ({
      leave: hr.leaveRequests.filter((request) => request.status === 'Pending').length,
      attendance: hr.correctionRequests.filter((request) => request.status === 'Pending').length,
      onboarding: hr.documents.filter((document) => document.status === 'Pending').length,
      requests: hr.employeeRequests.filter((request) => ['Pending', 'In Progress'].includes(request.status)).length,
      recruitment: hr.interviews.filter((interview) => interview.status === 'Scheduled').length,
      payroll: hr.payrolls.some((payroll) => payroll.status === 'Prepared') ? 1 : 0,
    }),
    [hr.leaveRequests, hr.correctionRequests, hr.documents, hr.employeeRequests, hr.interviews, hr.payrolls],
  )

  const badgeFor = (sectionId: string) => {
    if (!myPendingReviews) return undefined
    if (roleId === 'manager' && ['approvals', 'expenses', 'dashboard'].includes(sectionId)) return myPendingReviews
    if (roleId === 'senior' && ['dashboard', 'expenses', 'pipeline', 'tasks'].includes(sectionId)) return myPendingReviews
    if (roleId === 'junior' && sectionId === 'tasks') return myPendingReviews
    return undefined
  }

  const hrBadgeFor = (sectionId: string): number | undefined => {
    const count = (hrPending as Record<string, number>)[sectionId]
    return count > 0 ? count : undefined
  }

  const brandPath = hrMode ? HR_HOME : roleWorkspacePath(roleDefaultSection)
  const marketingPath = hrMode ? roleWorkspaceHome(roleId) : roleWorkspacePath(roleDefaultSection)
  const activeRoleSection = location.pathname.startsWith('/marketing/workspace/')
    ? location.pathname.split('/')[3] ?? ''
    : ''

  return (
    <>
      <div
        className="sidebar-overlay"
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={`sidebar ${collapsed ? 'is-collapsed-sidebar' : ''} ${hrMode ? 'is-hr-workspace' : ''}`.trim()}
        aria-label={hrMode ? 'HR Management navigation' : 'Marketing portal navigation'}
      >
        <div className="sidebar-mobile-head">
          <div className="row-8">
            <span className="brand-mark" aria-hidden="true">T</span>
            <div>
              <p className="brand-text__name" style={{ fontSize: '0.92rem' }}>Totally <span>ERP</span></p>
              <p className="brand-text__tag">{hrMode ? 'People Workspace' : 'Marketing Portal'}</p>
            </div>
          </div>
          <button type="button" className="mobile-close" onClick={onCloseMobile} aria-label="Close navigation">
            <X size={17} />
          </button>
        </div>

        <div className="sidebar__brand">
          <NavLink to={brandPath} className="row-10" style={{ textDecoration: 'none' }} onClick={onCloseMobile}>
            <span className="brand-mark" aria-hidden="true">T</span>
            <span className="brand-text">
              <span className="brand-text__name">Totally <span>ERP</span></span>
              <span className="brand-text__tag">{hrMode ? 'People Workspace' : 'Marketing Portal'}</span>
            </span>
          </NavLink>
          <button
            type="button"
            className="sidebar__collapse"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        <div className="workspace-switcher" role="navigation" aria-label="Switch workspace">
          <NavLink
            to={marketingPath}
            className={`workspace-switcher__item ${!hrMode ? 'is-active' : ''}`.trim()}
            onClick={onCloseMobile}
            data-tooltip={collapsed ? 'Marketing workspace' : undefined}
            aria-current={!hrMode ? 'page' : undefined}
          >
            <span className="workspace-switcher__icon"><Megaphone size={15} /></span>
            <span className="workspace-switcher__text">
              <strong>Marketing</strong>
              <small>Campaigns & pipeline</small>
            </span>
          </NavLink>
        </div>

        <div className="portal-label">
          <span className="portal-label__dot" aria-hidden="true" />
          <span className="portal-label__text">
            {hrMode ? 'HR Management' : 'Employee Portal'}
          </span>
          <span className="portal-label__badge">DEMO</span>
        </div>

        <nav
          className="sidebar__nav"
          aria-label={hrMode ? 'HR Management workspace' : 'Marketing role workspace'}
        >
          <p className="nav-section-label">{hrMode ? 'People operations' : 'My role workspace'}</p>
          {hrMode
            ? HR_NAVIGATION.map((item) => { return null })
            : roleNavigation.map((item) => {
                const Icon = item.icon
                const active = activeRoleSection === item.id
                const badge = badgeFor(item.id)
                return (
                  <NavLink
                    key={item.id}
                    to={roleWorkspacePath(item.id)}
                    className={`nav-item nav-item--role ${active ? 'is-active' : ''}`.trim()}
                    onClick={onCloseMobile}
                    data-tooltip={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    title={item.description}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span className="nav-item__label">{item.label}</span>
                    {badge ? (
                      <span className="nav-item__badge" aria-label={`${badge} items awaiting your action`}>
                        {badge}
                      </span>
                    ) : null}
                  </NavLink>
                )
              })}
        </nav>

        <div className="sidebar__footer">
          <button
            type="button"
            className="sidebar-profile"
            onClick={onOpenProfile}
            aria-label="Open employee profile"
            title={collapsed ? profile.name : undefined}
          >
            <span className="avatar">{profile.initials}</span>
            <span className="sidebar-profile__info">
              <span className="sidebar-profile__name">{profile.name}</span>
              <span className="sidebar-profile__role">{profile.roleLabel}</span>
            </span>
            <ChevronLeft size={13} className="sidebar-profile__menu" style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
          </button>
          <div className="sidebar__utility">
            <button
              type="button"
              onClick={onOpenDemoSettings}
              data-tooltip={collapsed ? 'Demo data settings' : undefined}
              title={collapsed ? 'Demo data settings' : undefined}
            >
              <RotateCcw size={14} />
              <span>Reset demo</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              data-tooltip={collapsed ? 'Sign out' : undefined}
              title={collapsed ? 'Sign out' : undefined}
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
