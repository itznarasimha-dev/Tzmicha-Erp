// ============================================================
// COMPONENTS — TRANSFER SUMMARY CARDS
// ============================================================

import React from 'react';
import { Package, Clock, AlertTriangle, Archive, CheckCircle, FileWarning, RefreshCw, UserCheck } from 'lucide-react';
import type { TransferMetrics } from '../types';

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

export function TransferSummaryCards({ metrics, isLoading, onCardClick }: { metrics: TransferMetrics | null, isLoading: boolean, onCardClick: (tab: string, filter?: string) => void }) {
  if (isLoading) return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
    {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />)}
  </div>;

  if (!metrics) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
      <SummaryCard label="Awaiting Action" count={metrics.awaitingAction} icon={<Clock size={16} />} color="#3b82f6" onClick={() => onCardClick('requests')} />
      <SummaryCard label="Ready for Dispatch" count={metrics.readyForDispatch} icon={<Package size={16} />} color="#10b981" onClick={() => onCardClick('requests', 'ready')} />
      <SummaryCard label="In Transit" count={metrics.inTransit} icon={<RefreshCw size={16} />} color="#8b5cf6" onClick={() => onCardClick('transit')} />
      <SummaryCard label="Partial Receipts" count={metrics.partialReceipts} icon={<AlertTriangle size={16} />} color="#f59e0b" onClick={() => onCardClick('transit', 'partial')} />
      <SummaryCard label="Transfer Exceptions" count={metrics.transferExceptions} icon={<FileWarning size={16} />} color="#ef4444" onClick={() => onCardClick('transit', 'exception')} />
      <SummaryCard label="Active Stock Counts" count={metrics.activeCounts} icon={<Archive size={16} />} color="#6366f1" onClick={() => onCardClick('counts')} />
      <SummaryCard label="Pending Variance Review" count={metrics.pendingVarianceReview} icon={<UserCheck size={16} />} color="#f97316" onClick={() => onCardClick('variances')} />
      <SummaryCard label="Pending Adjustments" count={metrics.pendingAdjustments} icon={<CheckCircle size={16} />} color="#10b981" onClick={() => onCardClick('variances', 'adjustment')} />
    </div>
  );
}
