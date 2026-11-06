// ============================================================
// INVENTORY — SUMMARY CARDS
// ============================================================

import { Package, Layers, Star, AlertTriangle, Lock, AlertOctagon } from 'lucide-react';
import type { InventoryMetrics, InventoryTab } from '../types';

interface CardDef {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  key: keyof InventoryMetrics;
  tab: InventoryTab;
  filter?: string;
  accent: string;
  grad: string;
  shadow: string;
}

const CARDS: CardDef[] = [
  {
    id: 'total-items',
    title: 'Total Product Items',
    desc: 'Distinct product records in selected inventory scope',
    icon: <Package size={20} />,
    key: 'totalProductItems',
    tab: 'stock',
    accent: '#3b82f6',
    grad: '#3b82f6, #60a5fa',
    shadow: 'rgba(59,130,246,0.35)',
  },
  {
    id: 'raw-materials',
    title: 'Raw Materials & Components',
    desc: 'Products with stock records in selected warehouse scope',
    icon: <Layers size={20} />,
    key: 'rawMaterialItems',
    tab: 'stock',
    filter: 'raw',
    accent: '#8b5cf6',
    grad: '#8b5cf6, #a78bfa',
    shadow: 'rgba(139,92,246,0.35)',
  },
  {
    id: 'finished-goods',
    title: 'Finished Goods',
    desc: 'Manufactured & purchased goods for resale',
    icon: <Star size={20} />,
    key: 'finishedGoodItems',
    tab: 'stock',
    filter: 'finished',
    accent: '#10b981',
    grad: '#10b981, #34d399',
    shadow: 'rgba(16,185,129,0.35)',
  },
  {
    id: 'low-stock',
    title: 'Low / No Stock',
    desc: 'Products below minimum stock threshold',
    icon: <AlertTriangle size={20} />,
    key: 'lowStockItems',
    tab: 'alerts',
    filter: 'low',
    accent: '#f97316',
    grad: '#f97316, #fb923c',
    shadow: 'rgba(249,115,22,0.35)',
  },
  {
    id: 'on-hold',
    title: 'Stock on Hold',
    desc: 'Quantity blocked — quality, quarantine, damage or expiry',
    icon: <Lock size={20} />,
    key: 'stockOnHoldQty',
    tab: 'stock',
    filter: 'held',
    accent: '#ef4444',
    grad: '#ef4444, #f87171',
    shadow: 'rgba(239,68,68,0.35)',
  },
  {
    id: 'exceptions',
    title: 'Traceability Exceptions',
    desc: 'Unresolved inventory record issues requiring investigation',
    icon: <AlertOctagon size={20} />,
    key: 'traceabilityExceptions',
    tab: 'traceability',
    filter: 'exceptions',
    accent: '#f59e0b',
    grad: '#f59e0b, #fbbf24',
    shadow: 'rgba(245,158,11,0.35)',
  },
];

interface InventorySummaryCardsProps {
  metrics: InventoryMetrics | null;
  isLoading: boolean;
  onCardClick: (tab: InventoryTab, filter?: string) => void;
}

export function InventorySummaryCards({ metrics, isLoading, onCardClick }: InventorySummaryCardsProps) {
  return (
    <div id="inv-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
      <style>{`
        @media (max-width: 1100px) { #inv-metrics-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 600px)  { #inv-metrics-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {CARDS.map((card) => {
        const value = metrics?.[card.key] ?? 0;
        const active = value > 0;

        if (isLoading) return (
          <div key={card.id} className="skeleton" style={{ height: '96px', borderRadius: '14px' }} />
        );

        return (
          <div
            key={card.id}
            id={`inv-card-${card.id}`}
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
