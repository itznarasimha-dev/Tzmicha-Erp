// ============================================================
// SIDEBAR COMPONENT
// ============================================================

import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Package,
  Layers,
  Star,
  ArrowLeftRight,
  ShoppingCart,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Factory,
  Menu,
} from 'lucide-react';

interface NavItem {
  id: number;
  label: string;
  icon: React.ReactNode;
  route: string;
  badgeCount?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 1, label: 'Store Manager Overview', icon: <LayoutDashboard size={16} />, route: '/store-manager/overview' },
  { id: 2, label: 'Receiving Centre', icon: <Truck size={16} />, route: '/store-manager/receiving', badgeCount: 7 },
  { id: 3, label: 'Inventory & Traceability', icon: <Package size={16} />, route: '/store-manager/inventory', badgeCount: 5 },
  { id: 4, label: 'Production Materials', icon: <Layers size={16} />, route: '/store-manager/production-materials', badgeCount: 4 },
  { id: 5, label: 'Finished Goods & Quality', icon: <Star size={16} />, route: '/store-manager/finished-goods', badgeCount: 3 },
  { id: 6, label: 'Transfers & Stock Count', icon: <ArrowLeftRight size={16} />, route: '/store-manager/transfers', badgeCount: 3 },
  { id: 7, label: 'Sales Fulfilment & Returns', icon: <ShoppingCart size={16} />, route: '/store-manager/sales-fulfilment', badgeCount: 9 },
  { id: 8, label: 'Tasks & Reports', icon: <ClipboardList size={16} />, route: '/store-manager/tasks', badgeCount: 7 },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (route: string) => {
    navigate(route);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={onMobileClose}
      />
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Factory size={18} color="white" />
          </div>
          {!collapsed && (
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-title">ManufactERP</span>
              <span className="sidebar-logo-sub">Store Manager</span>
            </div>
          )}
          {!collapsed && (
            <button
              className="btn-icon"
              style={{ marginLeft: 'auto', flexShrink: 0 }}
              onClick={onToggle}
              aria-label="Collapse sidebar"
              id="sidebar-toggle"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {!collapsed && (
            <div className="nav-section-label">Workspaces</div>
          )}
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.route;
            return (
              <a
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.route)}
                data-tooltip={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                id={`nav-item-${item.id}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleNav(item.route)}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="nav-item-text">{item.label}</span>
                    {item.badgeCount && item.badgeCount > 0 && (
                      <span className="nav-badge">{item.badgeCount}</span>
                    )}
                  </>
                )}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {collapsed ? (
            <button
              className="btn-icon"
              style={{ width: '100%' }}
              onClick={onToggle}
              aria-label="Expand sidebar"
              id="sidebar-expand"
            >
              <ChevronRight size={14} />
            </button>
          ) : (
            <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textAlign: 'center' }}>
              ManufactERP v2.4.0
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Mobile menu button (rendered in header) ─────────────────
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn-icon" onClick={onClick} id="mobile-menu-btn" aria-label="Open navigation">
      <Menu size={16} />
    </button>
  );
}
