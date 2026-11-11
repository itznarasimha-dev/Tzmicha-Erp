import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useSales } from '../../context/SalesContext';
import { NAV_ITEMS } from '../../data/navItems';

export default function Sidebar({ isOpen, onClose, onOpenProfile, onOpenProfileSettings }) {
  const {
    activePage,
    navigateTo,
    userRole,
    userProfile,
    quotations,
    orders,
    opportunities = [],
    dispatches,
    invoices,
    returns,
    followups,
    expenses,
    leaveRequests = [],
    activities = [],
    marketingLeads = [],
  } = useSales();

  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(true);
  const [isCustomersExpanded, setIsCustomersExpanded] = useState(true);

  // Dynamic badge counts matching mandatory navigation items
  const badgeCounts = {
    pendingQuotes: quotations.filter(
      (q) => q.status === 'Awaiting Approval' || q.status === 'Sent'
    ).length,
    activePipeline: opportunities.filter(
      (opp) => !['Closed Won', 'Closed Lost'].includes(opp.stage)
    ).length,
    pendingActivities: activities.filter((a) => a.status === 'Pending').length,
    pendingDispatches: dispatches.filter(
      (d) => d.status === 'Ready for Dispatch'
    ).length,
    overdueInvoices: invoices.filter((i) => i.status === 'Overdue').length,
    pendingReturns: returns.filter(
      (r) => r.status === 'Received' || r.status === 'Under Review' || r.status === 'Refund Pending'
    ).length,
    todayFollowups: followups.filter((f) => f.status === 'Due Today').length,
    pendingExpenses: expenses.filter((e) => e.approvalStatus === 'Submitted').length,
    pendingLeaves: leaveRequests.filter((l) => l.status === 'Pending Approval').length,
    newMarketingLeads: userRole !== 'junior_sales'
      ? marketingLeads.filter((l) => l.status === 'New').length
      : 0,
  };

  const handleNavClick = (pageId) => {
    navigateTo(pageId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Logo and Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <span className="brand-letter">A</span>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">ApexERP</h1>
            <span className="brand-module-tag">Sales &amp; Distribution</span>
          </div>
          {onClose && (
            <button
              type="button"
              className="sidebar-close-mobile-btn"
              onClick={onClose}
              aria-label="Close sidebar menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation items in strict order required by specification */}
        <nav className="sidebar-nav" aria-label="Sales Module Navigation">
          <div className="nav-section-label">SALES WORKFLOW</div>
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => {
              // Role-based visibility check (e.g. Returns & Cancellations restricted to Manager/Coordinator)
              if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
                return null;
              }

              const Icon = item.icon;

              if (item.isExpandable && item.children) {
                const isAttendance = item.id === 'attendance-work';
                const isCustomers = item.id === 'customers';

                const isChildActive = isCustomers
                  ? activePage === 'customers' ||
                    activePage === 'sales-customers' ||
                    activePage === 'marketing-leads'
                  : activePage === item.id ||
                    item.children.some(
                      (c) =>
                        activePage === c.id ||
                        (c.id === 'schedule' &&
                          (activePage === 'team-schedule' || activePage === 'my-schedule')) ||
                        (c.id === 'attendance' && activePage === 'attendance-work')
                    );

                const isSectionExpanded = isCustomers ? isCustomersExpanded : isAttendanceExpanded;

                // Calculate aggregate attention badge if collapsed
                let totalParentBadge = 0;
                if (isCustomers) {
                  totalParentBadge =
                    userRole !== 'junior_sales' && badgeCounts.newMarketingLeads > 0
                      ? badgeCounts.newMarketingLeads
                      : 0;
                } else {
                  const hasPendingSchedule = badgeCounts.pendingActivities > 0;
                  const canSeePendingLeaves =
                    ['sales_manager', 'sales_coordinator', 'admin'].includes(userRole);
                  const hasPendingLeaves = canSeePendingLeaves && badgeCounts.pendingLeaves > 0;
                  totalParentBadge =
                    (hasPendingSchedule ? badgeCounts.pendingActivities : 0) +
                    (hasPendingLeaves ? badgeCounts.pendingLeaves : 0);
                }

                const handleToggle = () => {
                  if (isCustomers) {
                    setIsCustomersExpanded(!isCustomersExpanded);
                    if (!isCustomersExpanded && !isChildActive) {
                      handleNavClick('sales-customers');
                    }
                  } else {
                    setIsAttendanceExpanded(!isAttendanceExpanded);
                    if (!isAttendanceExpanded && !isChildActive) {
                      handleNavClick('schedule');
                    }
                  }
                };

                return (
                  <li key={item.id} className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${isChildActive ? 'nav-link-active' : ''}`}
                      onClick={handleToggle}
                      aria-expanded={isSectionExpanded}
                      aria-current={isChildActive ? 'page' : undefined}
                      title={item.label}
                    >
                      <Icon size={18} className="nav-icon" />
                      <span className="nav-label">{item.label}</span>

                      {!isSectionExpanded && totalParentBadge > 0 && (
                        <span className="nav-badge" title={`${totalParentBadge} items need attention`}>
                          {totalParentBadge}
                        </span>
                      )}

                      {isSectionExpanded ? (
                        <ChevronDown size={14} className="nav-active-arrow" style={{ opacity: 0.7 }} />
                      ) : (
                        <ChevronRight size={14} className="nav-active-arrow" style={{ opacity: 0.7 }} />
                      )}
                    </button>

                    {isSectionExpanded && (
                      <ul className="nav-sub-list" aria-label={`${item.label} sub-pages`}>
                        {item.children.map((child) => {
                          // Role-based visibility check for subpages
                          if (child.allowedRoles && !child.allowedRoles.includes(userRole)) {
                            return null;
                          }

                          const ChildIcon = child.icon;
                          const childLabel = child.getLabel ? child.getLabel(userRole) : child.label;
                          const isSubActive =
                            activePage === child.id ||
                            (child.id === 'sales-customers' && activePage === 'customers') ||
                            (child.id === 'schedule' &&
                              (activePage === 'team-schedule' || activePage === 'my-schedule')) ||
                            (child.id === 'attendance' && activePage === 'attendance-work');

                          let subBadge = null;
                          if (child.id === 'schedule' && badgeCounts.pendingActivities > 0) {
                            subBadge = badgeCounts.pendingActivities;
                          } else if (
                            child.id === 'attendance' &&
                            ['sales_manager', 'sales_coordinator', 'admin'].includes(userRole) &&
                            badgeCounts.pendingLeaves > 0
                          ) {
                            subBadge = badgeCounts.pendingLeaves;
                          } else if (child.id === 'marketing-leads' && badgeCounts.newMarketingLeads > 0) {
                            subBadge = badgeCounts.newMarketingLeads;
                          }

                          return (
                            <li key={child.id} className="nav-sub-item">
                              <button
                                type="button"
                                className={`nav-sub-link ${isSubActive ? 'nav-sub-link-active' : ''}`}
                                onClick={() => handleNavClick(child.id)}
                                aria-current={isSubActive ? 'page' : undefined}
                              >
                                <ChildIcon size={15} className="nav-icon" />
                                <span className="nav-label">{childLabel}</span>

                                {subBadge > 0 && (
                                  <span className="nav-badge" title={`${subBadge} items need attention`}>
                                    {subBadge}
                                  </span>
                                )}

                                {isSubActive && (
                                  <ChevronRight size={12} className="nav-active-arrow" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              const isActive = activePage === item.id;
              const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : null;

              return (
                <li key={item.id} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={18} className="nav-icon" />
                    <span className="nav-label">{item.label}</span>

                    {badgeCount > 0 && (
                      <span className="nav-badge" title={`${badgeCount} items need attention`}>
                        {badgeCount}
                      </span>
                    )}

                    {isActive && <ChevronRight size={14} className="nav-active-arrow" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile Info at Bottom */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="user-profile-card user-profile-clickable"
            onClick={() => {
              if (onOpenProfileSettings) onOpenProfileSettings();
              else if (onOpenProfile) onOpenProfile();
            }}
            title="Open Profile Settings"
            aria-label="Open user profile settings"
            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div className="user-avatar" style={{ flexShrink: 0 }}>
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <User size={18} className="avatar-icon" />
              )}
            </div>
            <div className="user-meta" style={{ flex: 1, minWidth: 0 }}>
              <span className="user-name" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile.fullName || 'Vikram Mehta'}
              </span>
              <span className="user-role-badge">
                <ShieldCheck size={11} className="role-icon" />
                {userRole === 'sales_manager'
                  ? 'Sales Manager'
                  : userRole === 'sales_coordinator'
                  ? 'Sales Coordinator'
                  : userRole === 'junior_sales'
                  ? 'Junior Sales Employee'
                  : 'Sales Representative'}
              </span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
