// ============================================================
// COMPONENTS — FG SUMMARY CARDS
// ============================================================

import React from 'react';
import { Package, AlertTriangle, CheckCircle, Clock, XCircle, Archive } from 'lucide-react';
import type { FinishedGoodsMetrics } from '../types';

interface CardProps {
  label: string;
  count: number;
  qty: number;
  uom?: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function SummaryCard({ label, count, qty, uom = 'units', icon, color, onClick }: CardProps) {
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--clr-text-primary)' }}>{count}</span>
        <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>records / {qty} {uom}</span>
      </div>
    </div>
  );
}

export function FinishedGoodsSummaryCards({ metrics, isLoading, onCardClick }: { metrics: FinishedGoodsMetrics | null, isLoading: boolean, onCardClick: (tab: string, filter?: string) => void }) {
  if (isLoading) return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
    {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />)}
  </div>;

  if (!metrics) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
      <SummaryCard
        label="Awaiting Receipt"
        count={metrics.awaitingReceipt.count}
        qty={metrics.awaitingReceipt.qty}
        icon={<Package size={16} />}
        color="#3b82f6"
        onClick={() => onCardClick('receipts')}
      />
      <SummaryCard
        label="Partial Receipts"
        count={metrics.partialReceipts.count}
        qty={metrics.partialReceipts.qty}
        icon={<AlertTriangle size={16} />}
        color="#f59e0b"
        onClick={() => onCardClick('receipts', 'partial')}
      />
      <SummaryCard
        label="Awaiting QC"
        count={metrics.awaitingQC.count}
        qty={metrics.awaitingQC.qty}
        icon={<Clock size={16} />}
        color="#8b5cf6"
        onClick={() => onCardClick('qc')}
      />
      <SummaryCard
        label="Quality Hold"
        count={metrics.qualityHold.count}
        qty={metrics.qualityHold.qty}
        icon={<Archive size={16} />}
        color="#ef4444"
        onClick={() => onCardClick('exceptions')}
      />
      <SummaryCard
        label="QC Rejected"
        count={metrics.qcRejected.count}
        qty={metrics.qcRejected.qty}
        icon={<XCircle size={16} />}
        color="#dc2626"
        onClick={() => onCardClick('qc')}
      />
      <SummaryCard
        label="Released for Stock"
        count={metrics.releasedForStock.count}
        qty={metrics.releasedForStock.qty}
        icon={<CheckCircle size={16} />}
        color="#10b981"
        onClick={() => onCardClick('stock')}
      />
      <SummaryCard
        label="Receipt Discrepancies"
        count={metrics.receiptDiscrepancies.count}
        qty={metrics.receiptDiscrepancies.qty}
        icon={<AlertTriangle size={16} />}
        color="#f97316"
        onClick={() => onCardClick('receipts', 'discrepancy')}
      />
      <SummaryCard
        label="Overdue Handoffs"
        count={metrics.overdueHandoffs.count}
        qty={metrics.overdueHandoffs.qty}
        icon={<Clock size={16} />}
        color="#ef4444"
        onClick={() => onCardClick('qc')}
      />
    </div>
  );
}
