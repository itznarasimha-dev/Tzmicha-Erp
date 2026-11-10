import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Plus,
  Bell,
  RotateCw,
  X,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';
import RoleSelector from '../RoleSelector';
import NewRequestModal from '../../pages/ServiceRequests/components/NewRequestModal';

export default function Header({
  sidebarCollapsed = false,
  onToggleSidebar,
  pageTitle = 'Dashboard',
  sectionName = 'Service Operations'
}) {
  const { roleId } = useRole();
  const { serviceRequests, customers, products, resetDemoData } = useSchedule();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const searchRef = useRef(null);
  const notifRef = useRef(null);

  // All four roles are authorized to create service requests
  const canCreate = true;

  // Close search/notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search filtering across Service Requests, Customers, and Products
  const searchResults = searchQuery.trim().length > 1 ? [
    ...serviceRequests
      .filter((sr) =>
        sr.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sr.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sr.productName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 3)
      .map((sr) => ({
        id: sr.id,
        title: `${sr.id} • ${sr.customerName}`,
        subtitle: `${sr.productName} • ${sr.priority} • ${sr.status}`,
        category: 'Service Request',
        route: '/service-requests'
      })),
    ...customers
      .filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        title: `${c.id} • ${c.name}`,
        subtitle: `${c.city} • Contact: ${c.contactPerson}`,
        category: 'Customer',
        route: '/service-requests'
      })),
    ...products
      .filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: `${p.id} • ${p.name}`,
        subtitle: `${p.category} • Warranty: ${p.warrantyPeriodMonths} Mo`,
        category: 'Product',
        route: '/spare-parts'
      }))
  ] : [];

  const handleSearchResultClick = (result) => {
    navigate(result.route);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleResetData = () => {
    resetDemoData();
    setToastMessage('Demonstration data restored to initial state');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const notifications = [
    {
      id: 'n1',
      title: 'Very High Priority Request Logged',
      desc: 'SR-2026-001 (Mahindra Engineering) requires urgent bypass valve seal service.',
      time: '15m ago',
      type: 'critical'
    },
    {
      id: 'n2',
      title: 'Engineer Dispatched',
      desc: 'David Chen checked in at MIDC Bhosari Industrial Estate.',
      time: '45m ago',
      type: 'info'
    },
    {
      id: 'n3',
      title: 'AMC Contract Expiring Soon',
      desc: 'Gujarat Metalcrafts Ltd (AMC-2026-GUJ06) contract expires in 12 days.',
      time: '2h ago',
      type: 'warning'
    }
  ];

  return (
    <>
      <header className="app-header">
        {/* Left: Mobile Toggle & Breadcrumbs */}
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
            <h2 className="breadcrumb-current" style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{pageTitle}</h2>
          </div>
        </div>

        {/* Center: Global Search Bar matching Sales */}
        <div className="header-center" ref={searchRef}>
          <div className="header-global-search">
            <Search size={15} className="global-search-icon" />
            <input
              type="text"
              className="global-search-input"
              placeholder="Search service requests, customers, products, engineers..."
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

        {/* Right: Quick Action, Role Switcher, Reset Demo, Notifications */}
        <div className="header-right">
          {/* Quick Action: New Request (Visible strictly to Manager & Coordinator) */}
          {canCreate && (
            <div className="header-quick-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm btn-icon-text"
                onClick={() => setIsNewRequestOpen(true)}
                title="Create a new Service Request"
              >
                <Plus size={14} />
                <span className="hide-on-mobile">New Request</span>
              </button>
            </div>
          )}

          {/* Role Switcher */}
          <RoleSelector />

          {/* Reset Demo Data Button */}
          <button
            type="button"
            className="header-icon-btn"
            onClick={handleResetData}
            title="Reset demo data to initial baseline"
            aria-label="Reset demo data"
          >
            <RotateCw size={17} />
          </button>

          {/* Notifications Dropdown */}
          <div className="header-notif-wrapper" ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="header-icon-btn notif-btn"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              aria-label="View notifications"
            >
              <Bell size={18} />
              <span className="notif-badge-dot" />
            </button>

            {isNotifOpen && (
              <div
                className="notif-dropdown"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: '320px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-modal)',
                  zIndex: 100,
                  padding: '8px'
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Service Notifications</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>3 New</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 0' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: n.type === 'critical' ? 'var(--danger-light)' : n.type === 'warning' ? 'var(--warning-light)' : 'var(--bg-subtle)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: n.type === 'critical' ? 'var(--danger)' : n.type === 'warning' ? 'var(--warning)' : 'var(--text-main)' }}>
                        <span>{n.title}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.time}</span>
                      </div>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                        {n.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-modal)',
            zIndex: 1000,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global New Request Modal */}
      {isNewRequestOpen && (
        <NewRequestModal onClose={() => setIsNewRequestOpen(false)} />
      )}
    </>
  );
}
