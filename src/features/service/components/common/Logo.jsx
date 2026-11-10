import React from 'react';

export default function Logo({ collapsed = false }) {
  if (collapsed) {
    return (
      <div className="brand-logo-icon" title="ApexERP – Service Module">
        <span className="brand-letter">A</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div className="brand-logo-icon">
        <span className="brand-letter">A</span>
      </div>
      <div className="brand-text">
        <h1 className="brand-name" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
          ApexERP
        </h1>
        <span className="brand-module-tag" style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Service Module
        </span>
      </div>
    </div>
  );
}
