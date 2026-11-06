// ============================================================
// PLACEHOLDER WORKSPACE PAGE
// Used for workspace routes that haven't been built yet
// ============================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';

const WORKSPACE_NAMES: Record<string, string> = {
  '/store-manager/overview': 'Store Manager Overview',
  '/store-manager/receiving': 'Receiving Centre',
  '/store-manager/inventory': 'Inventory & Traceability',
  '/store-manager/production-materials': 'Production Materials',
  '/store-manager/finished-goods': 'Finished Goods & Quality',
  '/store-manager/transfers': 'Transfers & Stock Count',
  '/store-manager/sales-fulfilment': 'Sales Fulfilment & Returns',
  '/store-manager/tasks': 'Tasks & Reports',
};

export function WorkspacePlaceholder() {
  const location = useLocation();
  const navigate = useNavigate();
  const name = WORKSPACE_NAMES[location.pathname] ?? 'Workspace';
  const params = new URLSearchParams(location.search);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px',
        padding: '40px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '18px',
          background: 'rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#60a5fa',
        }}
      >
        <Construction size={28} />
      </div>

      <div style={{ textAlign: 'center', maxWidth: '440px' }}>
        <h1
          style={{
            fontFamily: "'Chillax', sans-serif",
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--clr-text-primary)',
            marginBottom: '8px',
          }}
        >
          {name}
        </h1>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
          This workspace has not been implemented yet and will be available in a future release.
          The Store Manager Overview (Page 1) is fully functional.
        </p>

        {params.toString() && (
          <div
            style={{
              background: 'var(--clr-bg-card)',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--clr-text-muted)', marginBottom: '6px' }}>
              Navigation context received
            </div>
            {Array.from(params.entries()).map(([key, value]) => (
              <div key={key} style={{ fontSize: '12px', color: 'var(--clr-text-secondary)', fontFamily: 'monospace' }}>
                {key}: <span style={{ color: 'var(--clr-accent-light)' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={() => navigate('/store-manager/overview')}
          id="back-to-overview"
        >
          <ArrowLeft size={14} />
          Back to Overview
        </button>
      </div>
    </div>
  );
}
