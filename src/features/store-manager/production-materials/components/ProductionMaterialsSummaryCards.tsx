// ============================================================
// PRODUCTION MATERIALS — SUMMARY CARDS
// ============================================================

import { ClipboardList, Layers, AlertTriangle, Truck, RotateCcw, Clock } from 'lucide-react';
import type { ProductionMaterialMetrics, ProductionMaterialTab } from '../types';

interface CardDef {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  key: keyof ProductionMaterialMetrics;
  tab: ProductionMaterialTab;
  filter?: string;
  accent: string;
  grad: string;
  shadow: string;
}

const CARDS: CardDef[] = [
  {
    id: 'pending-requests',
    title: 'Pending Material Requests',
    desc: 'Approved requests not yet fully issued',
    icon: <ClipboardList size={20} />,
    key: 'pendingRequests',
    tab: 'requests',
    filter: 'pending',
    accent: '#3b82f6',
    grad: '#3b82f6, #60a5fa',
    shadow: 'rgba(59,130,246,0.35)',
  },
  {
    id: 'partially-issued',
    title: 'Partially Issued',
    desc: 'Material requests with incomplete issues',
    icon: <Layers size={20} />,
    key: 'partiallyIssued',
    tab: 'requests',
    filter: 'partial',
    accent: '#8b5cf6',
    grad: '#8b5cf6, #a78bfa',
    shadow: 'rgba(139,92,246,0.35)',
  },
  {
    id: 'shortages',
    title: 'Material Shortages',
    desc: 'Active shortages blocking or delaying production',
    icon: <AlertTriangle size={20} />,
    key: 'materialShortages',
    tab: 'shortages',
    accent: '#ef4444',
    grad: '#ef4444, #f87171',
    shadow: 'rgba(239,68,68,0.35)',
  },
  {
    id: 'awaiting-issue',
    title: 'Awaiting Warehouse Issue',
    desc: 'Approved requests ready for Store Keeper action',
    icon: <Truck size={20} />,
    key: 'awaitingIssue',
    tab: 'requests',
    filter: 'awaiting',
    accent: '#f97316',
    grad: '#f97316, #fb923c',
    shadow: 'rgba(249,115,22,0.35)',
  },
  {
    id: 'returns-pending',
    title: 'Material Returns Pending',
    desc: 'Returns requiring verification or inspection',
    icon: <RotateCcw size={20} />,
    key: 'returnsPending',
    tab: 'returns',
    filter: 'pending',
    accent: '#10b981',
    grad: '#10b981, #34d399',
    shadow: 'rgba(16,185,129,0.35)',
  },
  {
    id: 'overdue',
    title: 'Overdue Requests',
    desc: 'Approved requests whose required dates have passed',
    icon: <Clock size={20} />,
    key: 'overdueRequests',
    tab: 'requests',
    filter: 'overdue',
    accent: '#f59e0b',
    grad: '#f59e0b, #fbbf24',
    shadow: 'rgba(245,158,11,0.35)',
  },
];

interface SummaryCardsProps {
  metrics: ProductionMaterialMetrics | null;
  isLoading: boolean;
  onCardClick: (tab: ProductionMaterialTab, filter?: string) => void;
}

export function ProductionMaterialsSummaryCards({ metrics, isLoading, onCardClick }: SummaryCardsProps) {
  return (
    <div
      id="pm-metrics-grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}
    >
      <style>{`
        @media (max-width: 1100px) { #pm-metrics-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 600px)  { #pm-metrics-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {CARDS.map((card) => {
        if (isLoading) return (
          <div key={card.id} className="skeleton" style={{ height: '96px', borderRadius: '14px' }} />
        );

        const value = metrics?.[card.key] ?? 0;
        const active = value > 0;

        return (
          <div
            key={card.id}
            id={`pm-card-${card.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onCardClick(card.tab, card.filter)}
            onKeyDown={(e) => e.key === 'Enter' && onCardClick(card.tab, card.filter)}
            aria-label={`${card.title}: ${value}. Click to view.`}
            className="card-clickable"
            style={{
              background: 'var(--clr-bg-card)',
              border: `1px solid ${active ? card.accent + '30' : 'var(--clr-border)'}`,
              borderTop: `3px solid ${active ? card.accent : 'var(--clr-border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                  {card.title}
                </div>
                <div style={{
                  fontFamily: "'Chillax', sans-serif", fontSize: '30px', fontWeight: 800, lineHeight: 1,
                  color: active ? card.accent : 'var(--clr-text-muted)', marginBottom: '6px',
                }}>
                  {metrics ? value.toLocaleString() : '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', lineHeight: 1.4 }}>{card.desc}</div>
              </div>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                background: active ? `linear-gradient(135deg, ${card.grad})` : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: active ? 'white' : 'var(--clr-text-muted)',
                boxShadow: active ? `0 4px 12px ${card.shadow}` : 'none',
              }}>
                {card.icon}
              </div>
            </div>
            {active && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: card.accent }}>View details →</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
