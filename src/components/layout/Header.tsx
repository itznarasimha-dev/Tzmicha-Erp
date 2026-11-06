import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import {
  Menu,
  PanelLeft,
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  LogOut,
  ChevronDown,
  Settings,
  Sun,
  Moon,
  Users,
  Building2,
  Tag,
  Receipt,
  Target,
  Shield,
  Activity,
  Boxes,
  CreditCard,
  Check,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  onToggleMobile: () => void;
  onToggleCollapse: () => void;
  collapsed: boolean;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobile,
  onToggleCollapse,
  collapsed,
  onOpenSearch,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    currentRole,
    currentOrganization,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    roleQueries,
    logoutUser,
    switchUser,
    theme,
    toggleTheme,
  } = useErpStore();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifs = notifications.filter((n) => !n.read);
  const openQueriesCount = (roleQueries || []).filter((q) => q.status === 'open').length;

  const handleSignOut = () => {
    logoutUser();
    navigate('/login');
  };

  // Derive contextual navigation breadcrumb based on active pathname
  const getPageInfo = (pathname: string) => {
    if (pathname.includes('/queries') || pathname.includes('/chat')) {
      return { section: 'Helpdesk & Support', title: 'Role Queries & Internal Chat' };
    }
    if (pathname.startsWith('/manager')) return { section: 'Operations', title: 'Manager Operations Desk' };
    if (pathname.startsWith('/admin/dashboard')) return { section: 'Executive', title: 'Dashboard Overview' };
    if (pathname.startsWith('/admin/stock')) return { section: 'Inventory', title: 'Regional Stock & Batches' };
    if (pathname.startsWith('/admin/inward-receipts') || pathname.startsWith('/admin/grn')) return { section: 'Inventory', title: 'Inward Consignments & GRN' };
    if (pathname.startsWith('/admin/transfers-audits') || pathname.startsWith('/admin/transfers')) return { section: 'Inventory', title: 'Inter-Depot Transfers' };
    if (pathname.startsWith('/admin/suppliers') || pathname.startsWith('/suppliers')) return { section: 'Governance', title: 'Suppliers & Vendors' };
    if (pathname.startsWith('/admin/customers') || pathname.startsWith('/customers')) return { section: 'Commercial', title: 'Customers & Dealers' };
    if (pathname.startsWith('/admin/orders')) return { section: 'Commercial', title: 'Sales Orders & Dispatches' };
    if (pathname.startsWith('/admin/quotations')) return { section: 'Commercial', title: 'Quotations & RFQs' };
    if (pathname.startsWith('/admin/sales-ledger')) return { section: 'Commercial', title: 'Sales Collections & Proofs' };
    if (pathname.startsWith('/admin/customer-credit')) return { section: 'Commercial', title: 'Customer Credit & A/R' };
    if (pathname.startsWith('/admin/sales-performance')) return { section: 'Sales', title: 'Performance & Commissions' };
    if (pathname.startsWith('/admin/discounts')) return { section: 'Pricing', title: 'Discount Matrix & Policies' };
    if (pathname.startsWith('/admin/approvals')) return { section: 'Governance', title: 'Approvals & Requests' };
    if (pathname.startsWith('/admin/expenses')) return { section: 'Governance', title: 'Expenses & Settlements' };
    if (pathname.startsWith('/admin/users')) return { section: 'Directory', title: 'Users & Permissions' };
    if (pathname.startsWith('/admin/organizations')) return { section: 'Directory', title: 'Organizations & Teams' };
    if (pathname.startsWith('/admin/regions')) return { section: 'Governance', title: 'Territories & Depots' };
    if (pathname.startsWith('/admin/targets')) return { section: 'Governance', title: 'Quota & Targets' };
    if (pathname.startsWith('/admin/activity')) return { section: 'Governance', title: 'All Roles Activity' };
    if (pathname.startsWith('/admin/audit-logs')) return { section: 'Security', title: 'System Audit Logs' };
    if (pathname.startsWith('/admin/subscription')) return { section: 'Settings', title: 'Subscription & Plan Recharge' };
    if (pathname.startsWith('/sales')) return { section: 'Portal', title: 'Field Sales Workspace' };
    if (pathname.startsWith('/store-manager') || pathname.startsWith('/store')) return { section: 'Portal', title: 'Store Keeper Hub' };
    if (pathname.startsWith('/marketing')) return { section: 'Portal', title: 'Field Marketing Intelligence' };
    if (pathname.startsWith('/finance')) return { section: 'Portal', title: 'Finance & Treasury Hub' };
    if (pathname.startsWith('/service')) return { section: 'Portal', title: 'Customer Service Desk' };
    if (pathname.startsWith('/hr')) return { section: 'Portal', title: 'Human Resources & Talent Hub' };
    return { section: 'Tzmicha ERP', title: 'Enterprise Portal' };
  };

  const pageInfo = getPageInfo(location.pathname);

  // User role badge formatting
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'purple';
      case 'manager':
        return 'info';
      case 'sales':
        return 'primary';
      case 'store_manager':
        return 'warning';
      case 'marketing':
        return 'success';
      case 'finance':
        return 'purple';
      case 'service':
        return 'primary';
      case 'hr':
        return 'purple';
      default:
        return 'neutral';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Executive Admin';
      case 'manager':
        return 'Operations Manager';
      case 'sales':
        return 'Field Sales';
      case 'store_manager':
        return 'Warehouse Manager';
      case 'marketing':
        return 'Ground Marketing';
      case 'finance':
        return 'Finance Controller';
      case 'service':
        return 'Service Support';
      case 'hr':
        return 'HR Manager';
      default:
        return 'Team Member';
    }
  };

  return (
    <header className="h-[72px] pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-8 flex items-center justify-between gap-3 sm:gap-5 bg-white/80 dark:bg-slate-950/70 backdrop-blur-3xl border-b border-slate-200/70 dark:border-slate-800/70 shadow-[0_1px_1px_rgba(15,23,42,0.01)] transition-all relative z-40 shrink-0">
      {/* Left: Navigation */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobile}
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors"
          title="Toggle Navigation Menu"
          type="button"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        {/* Breadcrumb */}
        <div className="hidden md:flex items-center text-xs">
          <span className="font-normal text-slate-400 dark:text-slate-500">{pageInfo.section}</span>
          <span className="mx-1.5 text-slate-300 dark:text-slate-700">/</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[240px] tracking-tight">{pageInfo.title}</span>
        </div>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-lg hidden md:block">
        <button
          onClick={onOpenSearch}
          type="button"
          className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-slate-100/70 hover:bg-slate-100 dark:bg-slate-900/70 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 border border-transparent hover:border-slate-200/90 dark:hover:border-slate-800/90 text-sm transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4" />
            <span className="font-medium">Search...</span>
          </div>
          <kbd className="text-[10px] bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 px-1.5 py-0.5 rounded-md text-slate-400 font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">

        <button
          onClick={onOpenSearch}
          type="button"
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={toggleTheme}
          type="button"
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => {
            const role = currentRole || currentUser.role;
            if (role === 'sales') navigate('/sales/queries');
            else if (role === 'store_manager') navigate('/store-manager/queries');
            else if (role === 'marketing') navigate('/marketing/queries');
            else if (role === 'manager') navigate('/manager/queries');
            else if (role === 'service') navigate('/service/queries');
            else if (role === 'finance') navigate('/finance/queries');
            else navigate('/admin/queries');
          }}
          type="button"
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors relative"
          title="Role Queries & Helpdesk Chat"
        >
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          {openQueriesCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-950" />
          )}
        </button>

        <div className={`relative ${notifOpen ? 'z-[100]' : 'z-20'}`} ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            type="button"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-spte-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-3 z-[999] ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 px-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-wide">Notifications</h4>
                  {unreadNotifs.length > 0 && (
                    <Badge variant="danger" size="sm">
                      {unreadNotifs.length} new
                    </Badge>
                  )}
                </div>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    type="button"
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto py-1 space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No notifications yet</p>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className="pt-2 flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-colors"
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {n.type === 'alert' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                        {n.type === 'info' && <Info className="w-4 h-4 text-cyan-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{n.title}</p>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`relative ${settingsOpen ? 'z-[100]' : 'z-20'}`} ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            type="button"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors"
            title="System Preferences"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Quick Settings Dropdown */}
          {settingsOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-3.5 z-[999] ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150">
              <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-400">System Preferences</span>
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 mt-0.5">{currentOrganization?.name || 'Tzmicha ERP'}</div>
              </div>

              <div className="py-2.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subscription Tier:</span>
                  <Badge variant="purple" size="sm">
                    {currentOrganization?.plan || 'Enterprise'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Team Code:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{currentOrganization?.teamId || 'APEX-2026'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Currency Mode:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{currentOrganization?.currency || 'INR (₹)'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    navigate('/admin/subscription');
                  }}
                  className="w-full text-center py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Subscription &amp; Recharge →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    navigate('/admin/organizations');
                  }}
                  className="w-full text-center py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  View Organization Profile
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`relative ml-1 ${userMenuOpen ? 'z-[100]' : 'z-20'}`} ref={userRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="User Account"
          >
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200/80 dark:ring-slate-700/80"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-950" />
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-3 z-[999] ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 pb-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-slate-900 dark:text-slate-100 block truncate">{currentUser.name}</span>
                  <span className="text-[11px] text-slate-500 block truncate font-light">{currentUser.email}</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant={getRoleBadgeVariant(currentUser.role)} size="sm">
                      {getRoleDisplayName(currentUser.role)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="py-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/admin/users');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Personnel Directory</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    const role = currentRole || currentUser.role;
                    if (role === 'sales') navigate('/sales/queries');
                    else if (role === 'store_manager') navigate('/store-manager/queries');
                    else if (role === 'marketing') navigate('/marketing/queries');
                    else if (role === 'manager') navigate('/manager/queries');
                    else if (role === 'service') navigate('/service/queries');
                    else if (role === 'finance') navigate('/finance/queries');
                    else navigate('/admin/queries');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  <span>Queries &amp; Helpdesk Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/admin/organizations');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Organization Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/admin/subscription');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span>Subscription Plans</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/admin/audit-logs');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Audit Logs</span>
                </button>
              </div>

              {/* Quick Persona & Role Switcher for Testing */}
              <div className="py-2 px-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2 block mb-1.5">
                  Switch Active Role (Mock Auth)
                </span>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-admin-01');
                      setUserMenuOpen(false);
                      navigate('/admin/dashboard');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Admin</span>
                    {currentUser.role === 'admin' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-mgr-01');
                      setUserMenuOpen(false);
                      navigate('/manager/dashboard');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.role === 'manager'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Manager</span>
                    {currentUser.role === 'manager' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-sales-mgr');
                      setUserMenuOpen(false);
                      navigate('/sales/dashboard');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.salesSubRole === 'sales_manager'
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Sales Manager (L1)</span>
                    {currentUser.salesSubRole === 'sales_manager' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-sales-coord');
                      setUserMenuOpen(false);
                      navigate('/sales/dashboard');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.salesSubRole === 'sales_coordinator'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Sales Coord (L2)</span>
                    {currentUser.salesSubRole === 'sales_coordinator' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-sales-01');
                      setUserMenuOpen(false);
                      navigate('/sales/dashboard');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.role === 'sales' && currentUser.salesSubRole === 'sales_rep'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Senior Sales (L3)</span>
                    {currentUser.role === 'sales' && currentUser.salesSubRole === 'sales_rep' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-sales-jr');
                      setUserMenuOpen(false);
                      navigate('/sales/dashboard');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.salesSubRole === 'junior_sales'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Junior Sales (L4)</span>
                    {currentUser.salesSubRole === 'junior_sales' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-store-01');
                      setUserMenuOpen(false);
                      navigate('/store-manager/overview');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.role === 'store_manager'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Store Keeper</span>
                    {currentUser.role === 'store_manager' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-svc-01');
                      setUserMenuOpen(false);
                      navigate('/service');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.role === 'service'
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Service Desk</span>
                    {currentUser.role === 'service' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-mkt-01');
                      setUserMenuOpen(false);
                      navigate('/marketing');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.role === 'marketing'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Marketing</span>
                    {currentUser.role === 'marketing' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-fin-01');
                      setUserMenuOpen(false);
                      navigate('/finance');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.role === 'finance'
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Finance Lead</span>
                    {currentUser.role === 'finance' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchUser('usr-hr-01');
                      setUserMenuOpen(false);
                      navigate('/hr');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      currentUser.role === 'hr'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>HR Manager</span>
                    {currentUser.role === 'hr' && <Check className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
