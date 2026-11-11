import React, { useState, useRef, useEffect } from 'react';
import { UserCheck, ChevronDown, Check } from 'lucide-react';
import { useRole } from '../context/RoleContext';

export default function RoleSelector() {
  const { currentRole, setRole, roles, roleId } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectRole = (id) => {
    setRole(id);
    setIsOpen(false);
  };

  return (
    <div className="header-role-switcher" ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="role-switcher-btn role-rep"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch demo role to preview permission behavior"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
          color: 'var(--text-main)',
          cursor: 'pointer'
        }}
      >
        <UserCheck size={14} className="role-switcher-icon" color="var(--primary)" />
        <span className="role-switcher-label hide-on-mobile">
          {currentRole.label}
        </span>
        <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>

      {isOpen && (
        <div
          className="role-switcher-dropdown"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            width: '320px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-modal)',
            zIndex: 100,
            padding: '8px'
          }}
        >
          <div className="role-dropdown-header" style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: '6px' }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block' }}>
              Service Permission Role
            </strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Select a role to preview UI visibility & workflow controls
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {roles.map((r) => {
              const isSelected = r.id === roleId;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`role-option ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectRole(r.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                      {r.label}
                    </span>
                    {isSelected && <Check size={14} color="var(--primary)" />}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                    {r.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
