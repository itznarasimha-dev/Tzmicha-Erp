import React from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { useRole } from '../../context/RoleContext';

export default function UserProfile({ collapsed = false }) {
  const { currentRole } = useRole();

  const displayName = currentRole.profile.name;
  const displayRole = currentRole.profile.roleTitle;

  if (collapsed) {
    return (
      <div
        className="user-profile-card"
        title={`${displayName} (${displayRole})`}
        style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}
      >
        <div className="user-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={18} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="user-profile-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border-color)'
      }}
    >
      <div
        className="user-avatar"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.8rem',
          flexShrink: 0
        }}
      >
        <User size={18} />
      </div>

      <div className="user-meta" style={{ flex: 1, minWidth: 0 }}>
        <span
          className="user-name"
          style={{
            display: 'block',
            fontWeight: 600,
            fontSize: '0.825rem',
            color: 'var(--text-main)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {displayName}
        </span>
        <span
          className="user-role-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.72rem',
            color: 'var(--primary)',
            fontWeight: 500
          }}
        >
          <ShieldCheck size={12} />
          {displayRole}
        </span>
      </div>
    </div>
  );
}
