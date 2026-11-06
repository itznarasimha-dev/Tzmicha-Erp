// ============================================================
// OVERVIEW HEADER COMPONENT
// ============================================================

import { RefreshCw, Bell, ChevronDown, Search, Home } from 'lucide-react';
import { format } from 'date-fns';
import type { Warehouse, CurrentUser } from '../types';
import { MobileMenuButton } from './Sidebar';

interface OverviewHeaderProps {
  currentUser: CurrentUser | null;
  warehouses: Warehouse[];
  selectedWarehouseId: string;
  onWarehouseChange: (id: string) => void;
  lastRefresh: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onMobileMenuOpen: () => void;
  isMockData: boolean;
}

export function OverviewHeader({
  currentUser,
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
  lastRefresh,
  isRefreshing,
  onRefresh,
  onMobileMenuOpen,
  isMockData,
}: OverviewHeaderProps) {
  const formatRefreshTime = (iso: string | null) => {
    if (!iso) return 'Never';
    try {
      return format(new Date(iso), 'HH:mm:ss');
    } catch {
      return 'Unknown';
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="erp-header">
      {/* Mobile menu toggle */}
      <div style={{ display: 'none' }} id="mobile-menu-container">
        <MobileMenuButton onClick={onMobileMenuOpen} />
      </div>
      <style>{`
        @media (max-width: 1024px) {
          #mobile-menu-container { display: flex !important; }
        }
      `}</style>

      {/* Breadcrumb & Title */}
      <div className="header-breadcrumb">
        <h1 className="header-title">Store Manager Overview</h1>
        <div className="header-breadcrumb-trail" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Home size={10} />
          <span>Home</span>
          <span style={{ margin: '0 2px' }}>/</span>
          <span style={{ color: 'var(--clr-accent-light)' }}>Store Manager Overview</span>
          {isMockData && (
            <span className="mock-badge" style={{ marginLeft: '8px' }}>
              ⚠ Mock Data
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="header-controls">
        {/* Warehouse Selector */}
        <div style={{ position: 'relative' }}>
          <select
            className="form-select"
            value={selectedWarehouseId}
            onChange={(e) => onWarehouseChange(e.target.value)}
            id="warehouse-selector"
            aria-label="Select warehouse"
            style={{ paddingRight: '32px', minWidth: '180px' }}
          >
            {warehouses.length > 1 && (
              <option value="ALL">All Assigned Warehouses</option>
            )}
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.code} — {wh.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={12}
            style={{
              position: 'absolute',
              left: '10px',
              color: 'var(--clr-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            className="form-input"
            placeholder="Search..."
            id="global-search"
            aria-label="Global search"
            style={{ paddingLeft: '28px', width: '160px' }}
          />
        </div>

        {/* Last Refresh */}
        <div
          style={{
            fontSize: '11px',
            color: 'var(--clr-text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Last Refresh
          </span>
          <span style={{ color: 'var(--clr-text-secondary)', fontWeight: 500 }}>
            {formatRefreshTime(lastRefresh)}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          className="btn-icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          id="refresh-btn"
          aria-label="Refresh data"
          data-tooltip="Refresh data"
        >
          <RefreshCw size={14} className={isRefreshing ? 'refresh-spin' : ''} />
        </button>

        {/* Notifications */}
        <button className="btn-icon" style={{ position: 'relative' }} id="notifications-btn" aria-label="Notifications">
          <Bell size={14} />
          <span className="notif-dot" />
        </button>

        {/* Profile */}
        <button
          className="btn-ghost btn"
          id="profile-menu"
          aria-label="User profile menu"
          style={{ gap: '8px', padding: '5px 10px' }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '700',
              color: 'white',
              flexShrink: 0,
            }}
          >
            {currentUser ? getInitials(currentUser.name) : 'SM'}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--clr-text-secondary)' }}>
            {currentUser?.name ?? 'Store Manager'}
          </span>
          <ChevronDown size={12} style={{ color: 'var(--clr-text-muted)' }} />
        </button>
      </div>
    </header>
  );
}
