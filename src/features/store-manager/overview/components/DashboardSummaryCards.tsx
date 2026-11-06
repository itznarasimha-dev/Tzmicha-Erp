// ============================================================
// DASHBOARD SUMMARY CARDS
// ============================================================

import {
  Truck,
  FlaskConical,
  Layers,
  Package,
  ArrowLeftRight,
  ShoppingBag,
  AlertTriangle,
  PackageX,
} from 'lucide-react';
import type { DashboardMetrics } from '../types';
import { useNavigate } from 'react-router-dom';

interface SummaryCardConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  accent: string;
  route: string;
  routeFilter?: string;
}

function SummaryCard({ config, isLoading }: { config: SummaryCardConfig; isLoading: boolean }) {
  const navigate = useNavigate();

  const handleClick = () => {
    const dest = config.routeFilter
      ? `${config.route}?filter=${config.routeFilter}`
      : config.route;
    navigate(dest);
  };

  if (isLoading) {
    return (
      <div className={`metric-card accent-${config.accent}`}>
        <div className="skeleton" style={{ width: '100%', height: '90px', borderRadius: '8px' }} />
      </div>
    );
  }

  const isUrgent = config.count > 0;

  return (
    <div
      className={`metric-card accent-${config.accent} card-clickable ${isUrgent && config.count >= 5 ? 'pulse-urgent' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      id={`summary-card-${config.id}`}
      aria-label={`${config.title}: ${config.count}. Click to view details.`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            {config.title}
          </div>
          <div
            style={{
              fontFamily: "'Chillax', sans-serif",
              fontSize: '32px',
              fontWeight: 800,
              lineHeight: 1,
              color: isUrgent ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)',
              marginBottom: '6px',
            }}
          >
            {config.count}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--clr-text-muted)', lineHeight: 1.4 }}>
            {config.description}
          </div>
        </div>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: isUrgent
              ? `linear-gradient(135deg, ${getAccentGradient(config.accent)})`
              : 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: isUrgent ? 'white' : 'var(--clr-text-muted)',
            boxShadow: isUrgent ? `0 4px 12px ${getAccentShadow(config.accent)}` : 'none',
          }}
        >
          {config.icon}
        </div>
      </div>
      {isUrgent && (
        <div
          style={{
            marginTop: '12px',
            fontSize: '11px',
            color: 'var(--clr-accent-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>View in workspace →</span>
        </div>
      )}
    </div>
  );
}

function getAccentGradient(accent: string): string {
  const gradients: Record<string, string> = {
    blue: '#3b82f6, #60a5fa',
    amber: '#f59e0b, #fbbf24',
    purple: '#8b5cf6, #a78bfa',
    emerald: '#10b981, #34d399',
    cyan: '#06b6d4, #22d3ee',
    orange: '#f97316, #fb923c',
    rose: '#f43f5e, #fb7185',
    indigo: '#6366f1, #818cf8',
  };
  return gradients[accent] ?? '#3b82f6, #60a5fa';
}

function getAccentShadow(accent: string): string {
  const shadows: Record<string, string> = {
    blue: 'rgba(59,130,246,0.4)',
    amber: 'rgba(245,158,11,0.4)',
    purple: 'rgba(139,92,246,0.4)',
    emerald: 'rgba(16,185,129,0.4)',
    cyan: 'rgba(6,182,212,0.4)',
    orange: 'rgba(249,115,22,0.4)',
    rose: 'rgba(244,63,94,0.4)',
    indigo: 'rgba(99,102,241,0.4)',
  };
  return shadows[accent] ?? 'rgba(59,130,246,0.4)';
}

interface DashboardSummaryCardsProps {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
}

export function DashboardSummaryCards({ metrics, isLoading }: DashboardSummaryCardsProps) {
  const cards: SummaryCardConfig[] = [
    {
      id: 'pending-receipts',
      title: 'Pending Receipts',
      description: 'Supplier receipts requiring warehouse action',
      icon: <Truck size={20} />,
      count: metrics?.pendingReceipts ?? 0,
      accent: 'blue',
      route: '/store-manager/receiving',
      routeFilter: 'pending',
    },
    {
      id: 'quality-inspection',
      title: 'Quality Inspection Pending',
      description: 'Incoming, finished & returned goods awaiting QC',
      icon: <FlaskConical size={20} />,
      count: metrics?.qualityInspectionPending ?? 0,
      accent: 'amber',
      route: '/store-manager/finished-goods',
      routeFilter: 'inspection-pending',
    },
    {
      id: 'material-issues',
      title: 'Material Issues Pending',
      description: 'Authorized production requests not fully issued',
      icon: <Layers size={20} />,
      count: metrics?.materialIssuesPending ?? 0,
      accent: 'purple',
      route: '/store-manager/production-materials',
      routeFilter: 'pending-issue',
    },
    {
      id: 'fg-awaiting',
      title: 'Finished Goods Awaiting Receipt',
      description: 'Production output pending warehouse receipt',
      icon: <Package size={20} />,
      count: metrics?.finishedGoodsAwaitingReceipt ?? 0,
      accent: 'emerald',
      route: '/store-manager/finished-goods',
      routeFilter: 'awaiting-receipt',
    },
    {
      id: 'transfers-transit',
      title: 'Transfers In Transit',
      description: 'Dispatched transfers not yet received at destination',
      icon: <ArrowLeftRight size={20} />,
      count: metrics?.transfersInTransit ?? 0,
      accent: 'cyan',
      route: '/store-manager/transfers',
      routeFilter: 'in-transit',
    },
    {
      id: 'orders-picking',
      title: 'Orders Awaiting Picking',
      description: 'Sales orders pending or incomplete warehouse pick',
      icon: <ShoppingBag size={20} />,
      count: metrics?.ordersAwaitingPicking ?? 0,
      accent: 'orange',
      route: '/store-manager/sales-fulfilment',
      routeFilter: 'awaiting-picking',
    },
    {
      id: 'stock-variances',
      title: 'Stock Count Variances',
      description: 'Count sessions with unresolved discrepancies',
      icon: <AlertTriangle size={20} />,
      count: metrics?.stockCountVariances ?? 0,
      accent: 'rose',
      route: '/store-manager/transfers',
      routeFilter: 'variances',
    },
    {
      id: 'stock-exceptions',
      title: 'Open Stock Exceptions',
      description: 'Damaged, expired, quarantined or rejected inventory',
      icon: <PackageX size={20} />,
      count: metrics?.openStockExceptions ?? 0,
      accent: 'indigo',
      route: '/store-manager/inventory',
      routeFilter: 'exceptions',
    },
  ];

  return (
    <section aria-labelledby="metrics-heading">
      <div className="section-header">
        <h2 id="metrics-heading" className="section-title">
          <span className="section-title-icon">📊</span>
          Operational Metrics
        </h2>
      </div>
      <div className="metrics-grid">
        {cards.map((card) => (
          <SummaryCard key={card.id} config={card} isLoading={isLoading} />
        ))}
      </div>
    </section>
  );
}
