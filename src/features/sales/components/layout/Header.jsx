import { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  UserCheck,
  ChevronDown,
  User,
  Settings,
  LogIn,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/formatters';
import ConfirmDialog from '../common/ConfirmDialog';

export default function Header({
  onToggleSidebar,
  onOpenNewOrder,
  onOpenNewQuotation,
  onOpenNewExpense,
  onOpenProfile,
  onOpenProfileSettings,
  onOpenSignIn,
  onOpenSignUp,
}) {
  const {
    activePage,
    navigateTo,
    userRole,
    setUserRole,
    userProfile,
    isAuthenticated,
    signOut,
    notifications,
    dismissNotification,
    clearAllNotifications,
    resetDemoData,
    products,
    customers,
    quotations,
    orders,
    invoices,
    expenses,
  } = useSales();

  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const roleRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Page titles mapping (Aligned with exact Section 4 navigation)
  const PAGE_TITLES = {
    dashboard: { title: 'My Dashboard', section: 'Overview' },
    products: { title: 'Products & Stock', section: 'Inventory & Catalog' },
    customers: { title: 'Customers Directory', section: 'Accounts' },
    quotations: { title: 'Quotations', section: 'Pre-Sales (Read-Only)' },
    'sales-orders': { title: 'Sales Orders', section: 'Fulfillment' },
    'sales-pipeline': { title: 'Sales Pipeline', section: 'Order Journey' },
    'team-schedule': { title: 'Team Schedule & Field Activities', section: 'Operations & Scheduling' },
    dispatch: { title: 'Dispatch & Delivery', section: 'Logistics' },
    'invoices-payments': { title: 'Invoices & Payments', section: 'Receivables & Collections' },
    returns: { title: 'Returns & Cancellations', section: 'Customer Service' },
    'calls-followups': { title: 'Calls & Follow-ups', section: 'Sales Activity' },
    'targets-reports': { title: 'My Targets & Reports', section: 'Analytics' },
    'attendance-work': { title: 'Attendance & Work Updates', section: 'Field Operations' },
    expenses: { title: 'Expenses', section: 'Field Sales Claims' },
  };

  const currentPageInfo = PAGE_TITLES[activePage] || { title: 'Sales Module', section: 'Sales' };

  // Global search filtering across entities
  const searchResults = searchQuery.trim().length > 1 ? [
    ...products
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.code} • ${p.supplyType} • ${formatINR(p.salePrice)}`,
        category: 'Product',
        page: 'products',
      })),
    ...customers
      .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: `${c.city} • ${c.outstandingBalance !== null ? 'Bal: ' + formatINR(c.outstandingBalance) : 'New Customer'}`,
        category: 'Customer',
        page: 'customers',
      })),
    ...quotations
      .filter((q) => q.quotationNo.toLowerCase().includes(searchQuery.toLowerCase()) || q.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3)
      .map((q) => ({
        id: q.id,
        title: q.quotationNo,
        subtitle: `${q.customerName} • ${formatINR(q.grandTotal)} • ${q.status}`,
        category: 'Quotation',
        page: 'quotations',
      })),
    ...orders
      .filter((o) => o.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) || o.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3)
      .map((o) => ({
        id: o.id,
        title: o.orderNo,
        subtitle: `${o.customerName} • ${o.fulfilmentStatus}`,
        category: 'Sales Order',
        page: 'sales-orders',
      })),
    ...invoices
      .filter((i) => i.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) || i.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3)
      .map((i) => ({
        id: i.id,
        title: i.invoiceNo,
        subtitle: `${i.customerName} • Bal: ${formatINR(i.balance)} • ${i.status}`,
        category: 'Invoice',
        page: 'invoices-payments',
      })),
    ...expenses
      .filter((e) => e.id.toLowerCase().includes(searchQuery.toLowerCase()) || e.purpose.toLowerCase().includes(searchQuery.toLowerCase()) || (e.customerName && e.customerName.toLowerCase().includes(searchQuery.toLowerCase())))
      .slice(0, 3)
      .map((e) => ({
        id: e.id,
        title: `${e.id} (${e.category})`,
        subtitle: `${formatINR(e.amount)} • ${e.approvalStatus} • ${e.destination}`,
        category: 'Expense',
        page: 'expenses',
      })),
  ] : [];

  const handleSearchResultClick = (result) => {
    navigateTo(result.page);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleSwitchRole = (newRole) => {
    setUserRole(newRole);
    setIsRoleDropdownOpen(false);
    const roleDescriptions = {
      junior_sales: 'Junior Sales Employee (Aditya Joshi) — Field activities, customer visits, and assigned quotations',
      sales_rep: 'Sales Representative (Vikram Mehta) — Manage assigned customers, follow-ups & quotations',
      sales_coordinator: 'Sales Coordinator (Sneha Patil) — Coordinate regional team, schedule visits & approve quotes',
      sales_manager: 'Sales Manager (Ananya Roy) — Multi-region leadership, full team oversight & final approval authority',
    };
    showToast(`Switched active Sales role to ${roleDescriptions[newRole] || newRole}`, 'info');
  };

  const handleSignOutClick = () => {
    signOut();
    setIsProfileMenuOpen(false);
    showToast('Signed out of simulated session. Please sign in to resume.', 'info');
    onOpenSignIn();
  };

  const handleConfirmReset = () => {
    resetDemoData();
    setShowResetConfirm(false);
    showToast('Demo data restored to initial state', 'success');
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <button
            type="button"
            className="header-mobile-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>

          <div className="header-breadcrumbs">
            <span className="breadcrumb-section">{currentPageInfo.section}</span>
            <span className="breadcrumb-separator">/</span>
            <h2 className="breadcrumb-current">{currentPageInfo.title}</h2>
          </div>
        </div>

        <div className="header-center" ref={searchRef}>
          <div className="header-global-search">
            <Search size={15} className="global-search-icon" />
            <input
              type="text"
              className="global-search-input"
              placeholder="Search products, orders, customers, invoices..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
            />
            {searchQuery && (
              <button
                type="button"
                className="global-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim().length > 1 && (
            <div className="global-search-dropdown">
              {searchResults.length === 0 ? (
                <div className="search-empty-results">
                  No matches found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="search-results-list">
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      className="search-result-item"
                      onClick={() => handleSearchResultClick(res)}
                    >
                      <span className="result-category-pill">{res.category}</span>
                      <div className="result-info">
                        <div className="result-title">{res.title}</div>
                        <div className="result-sub">{res.subtitle}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="header-right">
          {/* Quick Action Shortcuts: Global + Quotation per Requirement 1 */}
          <div className="header-quick-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm btn-icon-text"
              onClick={onOpenNewQuotation}
              title="Create a new Quotation"
            >
              <Plus size={14} />
              <span className="hide-on-mobile">Quotation</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon-text"
              onClick={onOpenNewExpense}
              title="Log a business expense"
            >
              <Plus size={14} />
              <span className="hide-on-mobile">Expense</span>
            </button>
          </div>

          {/* Demo Role / Permission Switcher */}
          <div className="header-role-switcher" ref={roleRef}>
            <button
              type="button"
              className={`role-switcher-btn ${
                userRole === 'sales_manager' || userRole === 'admin'
                  ? 'role-manager'
                  : userRole === 'sales_coordinator'
                  ? 'role-coordinator'
                  : userRole === 'junior_sales'
                  ? 'role-junior'
                  : userRole === 'finance'
                  ? 'role-finance'
                  : 'role-rep'
              }`}
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              title="Switch demo role to preview customer, quotation and scheduling workflows"
            >
              <UserCheck size={14} className="role-switcher-icon" />
              <span className="role-switcher-label hide-on-mobile">
                {userRole === 'sales_manager'
                  ? 'Sales Manager'
                  : userRole === 'sales_coordinator'
                  ? 'Sales Coordinator'
                  : userRole === 'junior_sales'
                  ? 'Junior Sales'
                  : userRole === 'admin'
                  ? 'Admin'
                  : userRole === 'finance'
                  ? 'Finance'
                  : 'Sales Rep'}
              </span>
              <ChevronDown size={12} />
            </button>

            {isRoleDropdownOpen && (
              <div className="role-switcher-dropdown">
                <div className="role-dropdown-header">
                  <strong>Sales Organizational Hierarchy</strong>
                  <p>Select role to enforce exact 4-level permissions and workflows</p>
                </div>
                <button
                  type="button"
                  className={`role-option ${userRole === 'sales_manager' ? 'active' : ''}`}
                  onClick={() => handleSwitchRole('sales_manager')}
                >
                  <div className="role-option-title">Level 1: Sales Manager (Ananya Roy)</div>
                  <div className="role-option-desc">
                    Highest Sales authority • Multi-region oversight • Full team access • Quote final approver
                  </div>
                </button>
                <button
                  type="button"
                  className={`role-option ${userRole === 'sales_coordinator' ? 'active' : ''}`}
                  onClick={() => handleSwitchRole('sales_coordinator')}
                >
                  <div className="role-option-title">Level 2: Sales Coordinator (Sneha Patil)</div>
                  <div className="role-option-desc">
                    Regional operations • Assign customer visits &amp; tasks • Quote approver for Reps &amp; Juniors
                  </div>
                </button>
                <button
                  type="button"
                  className={`role-option ${userRole === 'sales_rep' ? 'active' : ''}`}
                  onClick={() => handleSwitchRole('sales_rep')}
                >
                  <div className="role-option-title">Level 3: Sales Representative (Vikram Mehta)</div>
                  <div className="role-option-desc">
                    Field sales • Assigned customers &amp; pipeline • Field visits • Quotations require approval
                  </div>
                </button>
                <button
                  type="button"
                  className={`role-option ${userRole === 'junior_sales' ? 'active' : ''}`}
                  onClick={() => handleSwitchRole('junior_sales')}
                >
                  <div className="role-option-title">Level 4: Junior Sales Employee (Aditya Joshi)</div>
                  <div className="role-option-desc">
                    Entry field sales • Lead generation, info collection &amp; assigned visits • Quotes require approval
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Notifications Bell Dropdown */}
          <div className="header-notif-wrapper" ref={notifRef}>
            <button
              type="button"
              className="header-icon-btn notif-btn"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              aria-label="View notifications"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="notif-badge-pill">{notifications.length}</span>
              )}
            </button>

            {isNotifOpen && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <span className="notif-title">Alerts &amp; Notifications</span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      className="notif-clear-all"
                      onClick={clearAllNotifications}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">No unread notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="notif-item"
                        onClick={() => {
                          navigateTo(n.page);
                          setIsNotifOpen(false);
                        }}
                      >
                        <div className="notif-item-icon">
                          {n.type === 'danger' && <AlertCircle size={15} className="text-danger" />}
                          {n.type === 'warning' && <AlertTriangle size={15} className="text-warning" />}
                          {n.type === 'success' && <CheckCircle size={15} className="text-success" />}
                          {n.type === 'info' && <Info size={15} className="text-primary" />}
                        </div>
                        <div className="notif-item-body">
                          <div className="notif-item-title">{n.title}</div>
                          <div className="notif-item-msg">{n.message}</div>
                          <div className="notif-item-time">{n.time}</div>
                        </div>
                        <button
                          type="button"
                          className="notif-item-dismiss"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(n.id);
                          }}
                          aria-label="Dismiss alert"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset Demo Data Button */}
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setShowResetConfirm(true)}
            title="Reset demo data to initial state"
            aria-label="Reset demo state"
          >
            <RefreshCw size={16} />
          </button>

          {/* MANDATORY PROFILE AVATAR MENU (Section 5) */}
          <div className="header-profile-menu-wrapper" ref={profileRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="header-profile-btn"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              title="Open profile &amp; account menu"
              aria-label="User profile options"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#2563eb',
                color: 'white',
                border: '2px solid #ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '14px',
              }}
            >
              {userProfile.fullName ? userProfile.fullName.charAt(0).toUpperCase() : <User size={16} />}
            </button>

            {isProfileMenuOpen && (
              <div
                className="profile-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: '46px',
                  right: '0',
                  width: '240px',
                  background: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                    {userProfile.fullName || 'Vikram Mehta'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {userProfile.email || 'vikram.mehta@apexerpsolutions.demo'}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '4px', color: isAuthenticated ? '#166534' : '#991b1b', fontWeight: '600' }}>
                    ● {isAuthenticated ? 'Session Active' : 'Signed Out'}
                  </div>
                </div>

                <div style={{ padding: '6px 0' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '13px',
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile();
                    }}
                  >
                    <User size={15} color="#475569" />
                    <span>Profile</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '13px',
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfileSettings();
                    }}
                  >
                    <Settings size={15} color="#475569" />
                    <span>Profile Settings</span>
                  </button>

                  <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '13px',
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenSignIn();
                    }}
                  >
                    <LogIn size={15} color="#475569" />
                    <span>Sign In</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '13px',
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenSignUp();
                    }}
                  >
                    <UserPlus size={15} color="#475569" />
                    <span>Sign Up</span>
                  </button>

                  <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '13px',
                      color: '#dc2626',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={handleSignOutClick}
                  >
                    <LogOut size={15} color="#dc2626" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Confirmation Dialog for Resetting Data */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleConfirmReset}
        title="Reset Demo Data?"
        message="This will reset all orders, quotes, stock levels, payments, and expenses back to their original demonstration state."
        confirmLabel="Reset State"
        variant="warning"
      />
    </>
  );
}
