// ============================================================
// STOCK ALERTS PANEL
// ============================================================

import { useNavigate } from 'react-router-dom';
import {
  Bell, AlertTriangle, AlertOctagon, ExternalLink,
  CheckCircle2, Clock, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import type { StockAlert, AlertPriority, AlertType } from '../types';

const ALERT_TYPE_CONFIG: Record<AlertType, { icon: string; color: string }> = {
  'Raw Material Low Stock': { icon: '📉', color: 'var(--clr-warning)' },
  'Finished Goods Low Stock': { icon: '📦', color: 'var(--clr-warning)' },
  'Near-Expiry Batch': { icon: '⏳', color: 'var(--clr-warning)' },
  'Expired Stock': { icon: '☠️', color: 'var(--clr-critical)' },
  'Damaged Goods': { icon: '💔', color: 'var(--clr-critical)' },
  'Quality Hold': { icon: '🔒', color: 'var(--clr-info)' },
  'Missing Batch/Serial': { icon: '❓', color: 'var(--clr-warning)' },
  'Stock Count Discrepancy': { icon: '🔢', color: 'var(--clr-warning)' },
  'Overdue Transfer': { icon: '⌛', color: 'var(--clr-critical)' },
  'Insufficient Stock for Order': { icon: '🚫', color: 'var(--clr-critical)' },
};

const PRIORITY_SEVERITY: Record<AlertPriority, string> = {
  Critical: 'critical',
  High: 'warning',
  Medium: 'info',
  Low: 'ok',
};

function AlertRow({ alert, onAcknowledge }: { alert: StockAlert; onAcknowledge: (id: string) => void }) {
  const navigate = useNavigate();
  const config = ALERT_TYPE_CONFIG[alert.alertType] ?? { icon: '⚠️', color: 'var(--clr-warning)' };
  const severity = PRIORITY_SEVERITY[alert.priority];

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd MMM HH:mm');
    } catch {
      return iso;
    }
  };

  const severityBorderColor: Record<string, string> = {
    critical: 'rgba(239,68,68,0.4)',
    warning: 'rgba(245,158,11,0.4)',
    info: 'rgba(59,130,246,0.4)',
    ok: 'rgba(34,197,94,0.4)',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: `3px solid ${severityBorderColor[severity] ?? 'transparent'}`,
        transition: 'var(--transition)',
        opacity: alert.acknowledged ? 0.5 : 1,
        cursor: 'pointer',
      }}
      onClick={() => navigate(alert.detailsRoute)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(alert.detailsRoute)}
      id={`alert-row-${alert.id}`}
      aria-label={`Alert: ${alert.alertType} — ${alert.productRef}`}
    >
      {/* Icon */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: `${config.color}18`,
          border: `1px solid ${config.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0,
        }}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span className={`priority-badge ${alert.priority.toLowerCase()}`}>
            {alert.priority}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: config.color }}>
            {alert.alertType}
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--clr-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '4px',
          }}
        >
          {alert.productRef}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--clr-text-muted)' }}>
            📍 {alert.warehouse}
          </span>
          {alert.quantityAffected !== null && (
            <span style={{ fontSize: '11px', color: 'var(--clr-text-secondary)' }}>
              Qty: {alert.quantityAffected} {alert.unit}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--clr-text-muted)' }}>
            <Clock size={10} />
            {formatDate(alert.alertDate)}
          </div>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--clr-text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
          {alert.requiredAction}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-icon"
          onClick={(e) => { e.stopPropagation(); navigate(alert.detailsRoute); }}
          aria-label={`View alert details for ${alert.id}`}
          id={`alert-view-${alert.id}`}
        >
          <ExternalLink size={12} />
        </button>
        {!alert.acknowledged && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: '10px', padding: '3px 8px' }}
            onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id); }}
            id={`alert-ack-${alert.id}`}
            title="Acknowledge alert (does not resolve the underlying issue)"
          >
            <CheckCircle2 size={11} />
            Ack
          </button>
        )}
      </div>
    </div>
  );
}

interface StockAlertsPanelProps {
  alerts: StockAlert[] | null;
  isLoading: boolean;
}

export function StockAlertsPanel({ alerts: initialAlerts, isLoading }: StockAlertsPanelProps) {
  const [alerts, setAlerts] = useState(initialAlerts ?? []);
  const [showAll, setShowAll] = useState(false);

  // Sync internal state when prop changes (e.g., warehouse switch or refresh)
  useEffect(() => {
    setAlerts(initialAlerts ?? []);
  }, [initialAlerts]);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const displayed = showAll ? alerts : alerts.slice(0, 5);
  const criticalCount = alerts.filter((a) => a.priority === 'Critical').length;

  if (isLoading) {
    return (
      <section aria-labelledby="alerts-heading">
        <div className="section-header">
          <h2 id="alerts-heading" className="section-title">
            <Bell size={18} style={{ color: 'var(--clr-accent)' }} />
            Stock Alerts & Exceptions
          </h2>
        </div>
        <div className="table-container">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--clr-border)' }}>
              <div className="skeleton" style={{ height: '60px', borderRadius: '6px' }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="alerts-heading">
      <div className="section-header">
        <h2 id="alerts-heading" className="section-title">
          <Bell size={18} style={{ color: 'var(--clr-accent)' }} />
          Stock Alerts & Exceptions
          {alerts.length > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--clr-text-muted)', marginLeft: '8px' }}>
              ({alerts.length} active)
            </span>
          )}
        </h2>
        {criticalCount > 0 && (
          <span className="status-badge critical">
            <AlertOctagon size={10} />
            {criticalCount} Critical
          </span>
        )}
      </div>

      <div className="table-container">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={32} className="empty-state-icon" />
            <p className="empty-state-title">No active stock alerts</p>
            <p className="empty-state-desc">All stock positions and inventory exceptions are clear.</p>
          </div>
        ) : (
          <>
            {displayed.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
              />
            ))}
            {alerts.length > 5 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--clr-border)', textAlign: 'center' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowAll((s) => !s)}
                  id="alerts-show-more"
                >
                  {showAll ? 'Show less' : `Show all ${alerts.length} alerts`}
                  <ChevronRight size={13} style={{ transform: showAll ? 'rotate(90deg)' : 'rotate(0)', transition: 'var(--transition)' }} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
