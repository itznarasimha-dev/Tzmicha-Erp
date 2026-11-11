// ============================================================
// RECEIVING CENTRE — SUMMARY CARDS
// ============================================================

import { Truck, FileText, FlaskConical, AlertTriangle, Clock, RotateCcw } from 'lucide-react';
import type { ReceivingMetrics, ReceivingTab } from '../types';

interface CardCfg {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  valueKey: keyof ReceivingMetrics;
  tab: ReceivingTab;
  filter?: string;
  accent: string;
  accentGrad: string;
  accentShadow: string;
}

const CARDS: CardCfg[] = [
  {
    id: 'expected-deliveries',
    title: 'Expected Deliveries',
    description: 'POs with outstanding receipts in selected period',
    icon: <Truck size={20} />,
    valueKey: 'expectedDeliveries',
    tab: 'expected',
    filter: 'active',
    accent: '#3b82f6',
    accentGrad: '#3b82f6, #60a5fa',
    accentShadow: 'rgba(59,130,246,0.4)',
  },
  {
    id: 'pending-grns',
    title: 'Pending GRNs',
    description: 'Draft or incomplete receipt records requiring action',
    icon: <FileText size={20} />,
    valueKey: 'pendingGRNs',
    tab: 'grns',
    filter: 'pending',
    accent: '#8b5cf6',
    accentGrad: '#8b5cf6, #a78bfa',
    accentShadow: 'rgba(139,92,246,0.4)',
  },
  {
    id: 'inspection-holds',
    title: 'Inspection Holds',
    description: 'Receipt items awaiting Quality Control decision',
    icon: <FlaskConical size={20} />,
    valueKey: 'inspectionHolds',
    tab: 'grns',
    filter: 'inspection',
    accent: '#f59e0b',
    accentGrad: '#f59e0b, #fbbf24',
    accentShadow: 'rgba(245,158,11,0.4)',
  },
  {
    id: 'open-discrepancies',
    title: 'Open Discrepancies',
    description: 'Unresolved delivery issues requiring follow-up',
    icon: <AlertTriangle size={20} />,
    valueKey: 'openDiscrepancies',
    tab: 'discrepancies',
    filter: 'open',
    accent: '#ef4444',
    accentGrad: '#ef4444, #f87171',
    accentShadow: 'rgba(239,68,68,0.4)',
  },
  {
    id: 'overdue-deliveries',
    title: 'Overdue Deliveries',
    description: 'Expected deliveries past due date, unresolved',
    icon: <Clock size={20} />,
    valueKey: 'overdueDeliveries',
    tab: 'expected',
    filter: 'overdue',
    accent: '#f97316',
    accentGrad: '#f97316, #fb923c',
    accentShadow: 'rgba(249,115,22,0.4)',
  },
  {
    id: 'pending-returns',
    title: 'Pending Supplier Returns',
    description: 'Authorized returns awaiting dispatch or completion',
    icon: <RotateCcw size={20} />,
    valueKey: 'pendingSupplierReturns',
    tab: 'returns',
    filter: 'pending',
    accent: '#06b6d4',
    accentGrad: '#06b6d4, #22d3ee',
    accentShadow: 'rgba(6,182,212,0.4)',
  },
];

interface ReceivingSummaryCardsProps {
  metrics: ReceivingMetrics | null;
  isLoading: boolean;
  onCardClick: (tab: ReceivingTab, filter?: string) => void;
}

export function ReceivingSummaryCards({ metrics, isLoading, onCardClick }: ReceivingSummaryCardsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '14px',
        marginBottom: '24px',
      }}
      id="receiving-metrics-grid"
    >
      <style>{`
        @media (max-width: 1024px) { #receiving-metrics-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px)  { #receiving-metrics-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {CARDS.map((card) => {
        const value = metrics?.[card.valueKey] ?? 0;
        const isActive = value > 0;

        if (isLoading) {
          return (
            <div key={card.id} className="metric-card">
              <div className="skeleton" style={{ height: '90px', borderRadius: '8px' }} />
            </div>
          );
        }

        return (
          <div
            key={card.id}
            id={`rc-card-${card.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onCardClick(card.tab, card.filter)}
            onKeyDown={(e) => e.key === 'Enter' && onCardClick(card.tab, card.filter)}
            aria-label={`${card.title}: ${value}. Click to view.`}
            style={{
              background: 'var(--clr-bg-card)',
              border: `1px solid ${isActive ? card.accent + '30' : 'var(--clr-border)'}`,
              borderTop: `3px solid ${isActive ? card.accent : 'var(--clr-border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              cursor: 'pointer',
              transition: 'var(--transition)',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="card-clickable"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  {card.title}
                </div>
                <div style={{
                  fontFamily: "'Chillax', sans-serif",
                  fontSize: '30px',
                  fontWeight: 800,
                  lineHeight: 1,
                  color: isActive ? card.accent : 'var(--clr-text-muted)',
                  marginBottom: '6px',
                }}>
                  {metrics ? value : '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', lineHeight: 1.4 }}>
                  {card.description}
                </div>
              </div>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                background: isActive ? `linear-gradient(135deg, ${card.accentGrad})` : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isActive ? 'white' : 'var(--clr-text-muted)',
                boxShadow: isActive ? `0 4px 12px ${card.accentShadow}` : 'none',
              }}>
                {card.icon}
              </div>
            </div>
            {isActive && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: card.accent }}>
                View details →
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
