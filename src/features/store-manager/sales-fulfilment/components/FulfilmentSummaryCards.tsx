// ============================================================
// COMPONENTS — FULFILMENT SUMMARY CARDS
// ============================================================

import React from 'react';
import { Package, Clock, AlertTriangle, Box, Truck, RotateCcw, XCircle } from 'lucide-react';
import type { FulfilmentMetrics } from '../types';

interface CardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function SummaryCard({ label, count, icon, color, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--clr-bg-card)',
        border: '1px solid var(--clr-border)',
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'var(--transition)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '180px'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--clr-border)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--clr-text-muted)', fontSize: '12px', fontWeight: 600 }}>
        <span style={{ color: color }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--clr-text-primary)' }}>
        {count}
      </div>
    </div>
  );
}

export function FulfilmentSummaryCards({ metrics, isLoading, onCardClick }: { metrics: FulfilmentMetrics | null, isLoading: boolean, onCardClick: (tab: string, filter?: string) => void }) {
  if (isLoading) return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
    {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />)}
  </div>;

  if (!metrics) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
      <SummaryCard label="Awaiting Fulfilment" count={metrics.awaitingFulfilment} icon={<Package size={16} />} color="#3b82f6" onClick={() => onCardClick('awaiting')} />
      <SummaryCard label="Awaiting Picking" count={metrics.awaitingPicking} icon={<Clock size={16} />} color="#8b5cf6" onClick={() => onCardClick('picking')} />
      <SummaryCard label="Picking in Progress" count={metrics.pickingInProgress} icon={<Box size={16} />} color="#f59e0b" onClick={() => onCardClick('picking')} />
      <SummaryCard label="Awaiting Packing" count={metrics.awaitingPacking} icon={<Package size={16} />} color="#6366f1" onClick={() => onCardClick('picking')} />
      <SummaryCard label="Ready for Dispatch" count={metrics.readyForDispatch} icon={<Truck size={16} />} color="#10b981" onClick={() => onCardClick('dispatch')} />
      <SummaryCard label="Partial Fulfilment" count={metrics.partialFulfilment} icon={<AlertTriangle size={16} />} color="#f97316" onClick={() => onCardClick('awaiting', 'partial')} />
      <SummaryCard label="Returns Awaiting Disposition" count={metrics.returnsAwaitingDisposition} icon={<RotateCcw size={16} />} color="#64748b" onClick={() => onCardClick('returns')} />
      <SummaryCard label="Fulfilment Exceptions" count={metrics.fulfilmentExceptions} icon={<XCircle size={16} />} color="#ef4444" onClick={() => onCardClick('exceptions')} />
    </div>
  );
}
