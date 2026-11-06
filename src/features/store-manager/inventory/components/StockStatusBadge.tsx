// ============================================================
// INVENTORY — STOCK STATUS BADGE
// ============================================================

import type { StockStatus, StockCategory } from '../types';

const STATUS_CFG: Record<string, { cls: string; dot: string }> = {
  'Available':          { cls: 'ok',          dot: '✓' },
  'Partially Reserved': { cls: 'info',        dot: '◑' },
  'Fully Reserved':     { cls: 'warning',     dot: '⬤' },
  'Quality Hold':       { cls: 'warning',     dot: '⊘' },
  'Quarantined':        { cls: 'critical',    dot: '⛔' },
  'In Transit':         { cls: 'info',        dot: '🚚' },
  'Damaged':            { cls: 'critical',    dot: '💔' },
  'Expired':            { cls: 'critical',    dot: '⚠' },
  'Rejected':           { cls: 'critical',    dot: '✗' },
  'Low Stock':          { cls: 'warning',     dot: '📉' },
  'No Stock':           { cls: 'unavailable', dot: '○' },
};

const CATEGORY_CFG: Record<string, { bg: string; color: string }> = {
  'Raw Material':               { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  'Component':                  { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa' },
  'Work in Progress':           { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
  'Manufactured Finished Good': { bg: 'rgba(34,197,94,0.12)',   color: '#4ade80' },
  'Purchased Finished Good':    { bg: 'rgba(20,184,166,0.12)',  color: '#2dd4bf' },
  'Returned Goods':             { bg: 'rgba(249,115,22,0.12)',  color: '#fb923c' },
  'Damaged / Rejected':         { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
  'Other':                      { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
};

interface StockStatusBadgeProps {
  status: StockStatus | string;
  size?: 'sm' | 'md';
}

export function StockStatusBadge({ status, size = 'md' }: StockStatusBadgeProps) {
  const cfg = STATUS_CFG[status] ?? { cls: 'unavailable', dot: '?' };
  const fontSize = size === 'sm' ? '10px' : '11px';
  const padding  = size === 'sm' ? '2px 7px'  : '3px 10px';
  return (
    <span className={`status-badge ${cfg.cls}`} style={{ fontSize, padding, whiteSpace: 'nowrap' }}>
      <span style={{ marginRight: '4px' }}>{cfg.dot}</span>{status}
    </span>
  );
}

interface StockCategoryBadgeProps {
  category: StockCategory | string;
  size?: 'sm' | 'md';
}

export function StockCategoryBadge({ category, size = 'md' }: StockCategoryBadgeProps) {
  const cfg = CATEGORY_CFG[category] ?? { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-block',
      fontSize: size === 'sm' ? '10px' : '10.5px',
      fontWeight: 600,
      padding: size === 'sm' ? '2px 7px' : '3px 10px',
      borderRadius: '10px',
      background: cfg.bg,
      color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      {category}
    </span>
  );
}
