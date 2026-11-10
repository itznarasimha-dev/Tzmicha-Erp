import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Wrench,
  ShieldCheck,
  Receipt,
  History,
  UserCheck,
  CalendarCheck,
  CalendarClock,
  CheckSquare,
  BarChart3,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import Logo from '../common/Logo';
import UserProfile from './UserProfile';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';

/**
 * EXACT REQUIRED NAVIGATION HIERARCHY:
 * 1. Dashboard
 * 2. Customers
 *    - Customer Directory
 *    - Warranty & AMC
 *      - Warranty
 *      - AMC
 * 3. Inventory
 * 4. Service Requests
 *    - Service Requests
 *    - Work Assignment
 * 5. Service Execution
 * 6. Service Billing
 * 7. Service History
 * 8. Action Plan
 *    - My Schedule
 *    - Team Schedule (Manager & Coordinator only)
 *    - Attendance
 * 9. Reports & Analytics
 */
export const NAVIGATION_ITEMS = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    isExpandable: true,
    basePath: '/customers',
    subItems: [
      { id: 'customer-directory', path: '/customers', label: 'Customer Directory', icon: Users },
      {
        id: 'warranty-amc',
        path: '/customers/warranty-amc',
        label: 'Warranty & AMC',
        icon: ShieldCheck,
        subTabs: [
          { id: 'warranty', path: '/customers/warranty-amc?tab=warranty', label: 'Warranty' },
          { id: 'amc', path: '/customers/warranty-amc?tab=amc', label: 'AMC' }
        ]
      }
    ]
  },
  { id: 'inventory', path: '/inventory', label: 'Inventory', icon: Package },
  {
    id: 'service-requests',
    label: 'Service Requests',
    icon: ClipboardList,
    isExpandable: true,
    basePath: '/service-requests',
    badgeKey: 'unassignedRequests',
    subItems: [
      { id: 'sr-list', path: '/service-requests', label: 'Service Requests', icon: ClipboardList },
      { id: 'work-assignment', path: '/service-requests/work-assignment', label: 'Work Assignment', icon: UserCheck, badgeKey: 'pendingAssignments' }
    ]
  },
  { id: 'service-execution', path: '/service-execution', label: 'Service Execution', icon: Wrench, badgeKey: 'inProgressExecution' },
  { id: 'service-billing', path: '/service-billing', label: 'Service Billing', icon: Receipt },
  { id: 'service-history', path: '/service-history', label: 'Service History', icon: History },
  {
    id: 'action-plan',
    label: 'Action Plan',
    icon: CalendarCheck,
    isExpandable: true,
    basePath: '/action-plan',
    subItems: [
      { id: 'my-schedule', path: '/action-plan/my-schedule', label: 'My Schedule', icon: CalendarClock },
      { id: 'team-schedule', path: '/action-plan/team-schedule', label: 'Team Schedule', icon: Users, roleRestricted: true },
      { id: 'attendance', path: '/action-plan/attendance', label: 'Attendance', icon: CheckSquare }
    ]
  },
  { id: 'reports', path: '/reports', label: 'Reports & Analytics', icon: BarChart3 }
];

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onItemClick
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { roleId } = useRole();
  const { serviceRequests } = useSchedule();

  const isManagerOrCoordinator = roleId === 'manager' || roleId === 'coordinator';

  // Track expanded state for expandable groups
  const [expandedGroups, setExpandedGroups] = useState({
    customers: true,
    'service-requests': true,
    'action-plan': true
  });

  const toggleGroup = (groupId, defaultPath) => {
    if (collapsed && defaultPath) {
      navigate(defaultPath);
      if (onItemClick) onItemClick(defaultPath);
      return;
    }
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const unassignedCount = serviceRequests.filter(
    (sr) => sr.status === 'Unassigned' || sr.assignedEngineerName === 'Unassigned' || !sr.assignedEngineerId
  ).length;
  const inProgressExecutionCount = serviceRequests.filter((sr) => sr.status === 'In Progress').length;

  const badgeCounts = {
    unassignedRequests: unassignedCount > 0 ? unassignedCount : null,
    pendingAssignments: unassignedCount > 0 ? unassignedCount : null,
    inProgressExecution: inProgressExecutionCount > 0 ? inProgressExecutionCount : null
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => onItemClick && onItemClick('close')}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Logo and Brand */}
        <div className="sidebar-brand">
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div className="brand-logo-icon">
              <span className="brand-letter">A</span>
            </div>
            {!collapsed && (
              <div className="brand-text">
                <h1 className="brand-name">ApexERP</h1>
                <span className="brand-module-tag">Service Module</span>
              </div>
            )}
          </Link>

          {mobileOpen && (
            <button
              type="button"
              className="sidebar-close-mobile-btn"
              onClick={() => onItemClick && onItemClick('close')}
              aria-label="Close sidebar menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation items matching Sales hierarchy */}
        <nav className="sidebar-nav" aria-label="Service Module Navigation">
          <div className="nav-section-label">
            {collapsed ? 'SERVICE' : 'SERVICE WORKFLOW'}
          </div>

          <ul className="nav-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;

              // Expandable Nav Groups (Customers, Service Requests, Action Plan)
              if (item.isExpandable) {
                const isGroupOpen = Boolean(expandedGroups[item.id]);

                // Determine if this group is currently active
                let isGroupActive = false;
                if (item.id === 'customers') {
                  isGroupActive = location.pathname.startsWith('/customers') || location.pathname.startsWith('/warranty-amc');
                } else if (item.id === 'service-requests') {
                  isGroupActive = location.pathname.startsWith('/service-requests') || location.pathname.startsWith('/work-assignment');
                } else if (item.id === 'action-plan') {
                  isGroupActive =
                    location.pathname.startsWith('/action-plan') ||
                    location.pathname === '/my-scheduled' ||
                    location.pathname === '/team-schedule';
                }

                // Filter subItems based on role (Team Schedule strictly for Manager & Coordinator)
                const visibleSubItems = item.subItems.filter((sub) => {
                  if (sub.roleRestricted) {
                    return isManagerOrCoordinator;
                  }
                  return true;
                });

                const groupBadge = item.badgeKey ? badgeCounts[item.badgeKey] : null;

                return (
                  <li key={item.id} className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${isGroupActive ? 'nav-link-active' : ''}`}
                      onClick={() => toggleGroup(item.id, visibleSubItems[0]?.path)}
                      title={collapsed ? item.label : undefined}
                      style={{ justifyContent: 'space-between', width: '100%' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                        <Icon size={18} className="nav-icon" />
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                      </div>

                      {!collapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {groupBadge !== null && (
                            <span className="nav-badge">{groupBadge}</span>
                          )}
                          {isGroupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      )}
                    </button>

                    {/* Sub-items list */}
                    {!collapsed && isGroupOpen && (
                      <ul className="nav-sub-list">
                        {visibleSubItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const subBadge = sub.badgeKey ? badgeCounts[sub.badgeKey] : null;

                          let isSubActive = false;
                          if (sub.id === 'customer-directory') {
                            isSubActive = location.pathname === '/customers' || location.pathname === '/customers/directory';
                          } else if (sub.id === 'warranty-amc') {
                            isSubActive = location.pathname.startsWith('/customers/warranty-amc') || location.pathname.startsWith('/warranty-amc');
                          } else if (sub.id === 'sr-list') {
                            isSubActive = location.pathname === '/service-requests';
                          } else if (sub.id === 'work-assignment') {
                            isSubActive = location.pathname === '/service-requests/work-assignment' || location.pathname === '/work-assignment';
                          } else if (sub.id === 'my-schedule') {
                            isSubActive = location.pathname === '/action-plan/my-schedule' || location.pathname === '/my-scheduled';
                          } else if (sub.id === 'team-schedule') {
                            isSubActive = location.pathname === '/action-plan/team-schedule' || location.pathname === '/team-schedule';
                          } else if (sub.id === 'attendance') {
                            isSubActive = location.pathname === '/action-plan/attendance';
                          }

                          return (
                            <li key={sub.id}>
                              <Link
                                to={sub.path}
                                className={`nav-sub-link ${isSubActive ? 'active' : ''}`}
                                onClick={() => onItemClick && onItemClick(sub.id)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <SubIcon size={14} />
                                  <span>{sub.label}</span>
                                </div>
                                {subBadge !== null && (
                                  <span className="nav-badge" style={{ fontSize: '10px', padding: '1px 5px' }}>
                                    {subBadge}
                                  </span>
                                )}
                              </Link>

                              {/* Nested sub-tabs for Warranty & AMC (Warranty / AMC) */}
                              {sub.subTabs && isSubActive && (
                                <ul style={{ listStyle: 'none', paddingLeft: '28px', margin: '4px 0 6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {sub.subTabs.map((tab) => {
                                    const isTabActive = location.search.includes(`tab=${tab.id}`) ||
                                      (tab.id === 'warranty' && !location.search.includes('tab=amc'));
                                    return (
                                      <li key={tab.id}>
                                        <Link
                                          to={tab.path}
                                          style={{
                                            fontSize: '11px',
                                            color: isTabActive ? '#2563eb' : '#64748b',
                                            fontWeight: isTabActive ? 700 : 500,
                                            textDecoration: 'none',
                                            display: 'block',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: isTabActive ? '#eff6ff' : 'transparent'
                                          }}
                                          onClick={() => onItemClick && onItemClick(tab.id)}
                                        >
                                          • {tab.label}
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              // Standard top-level navigation items
              const isActive =
                location.pathname === item.path ||
                (item.path === '/dashboard' && location.pathname === '/');
              const badge = item.badgeKey ? badgeCounts[item.badgeKey] : null;

              return (
                <li key={item.id} className="nav-item">
                  <Link
                    to={item.path}
                    className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                    onClick={() => onItemClick && onItemClick(item.id)}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={18} className="nav-icon" />
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                    {!collapsed && badge !== null && (
                      <span className="nav-badge">{badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile Card at bottom */}
        <div className="sidebar-footer">
          <UserProfile collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}
