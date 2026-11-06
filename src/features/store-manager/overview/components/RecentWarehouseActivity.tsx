// ============================================================
// RECENT WAREHOUSE ACTIVITY
// ============================================================

import { useNavigate } from 'react-router-dom';
import { History, ExternalLink, ChevronRight, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import type { InventoryMovement, MovementStatus } from '../types';

const TRANSACTION_TYPE_ICONS: Record<string, string> = {
  'Goods Receipt': '📥',
  'Material Issue': '⚙️',
  'Finished Goods Receipt': '🏭',
  'Stock Transfer': '↔️',
  'Dispatch': '🚚',
  'Customer Return': '↩️',
  'Stock Count': '🔢',
  'Inventory Adjustment': '📋',
  'Material Return': '🔁',
};

const STATUS_CONFIG: Record<MovementStatus, { class: string; label: string }> = {
  Posted: { class: 'ok', label: '✓ Posted' },
  Draft: { class: 'info', label: '○ Draft' },
  Pending: { class: 'unavailable', label: '⋯ Pending' },
  Cancelled: { class: 'critical', label: '× Cancelled' },
  Reversed: { class: 'warning', label: '⟲ Reversed' },
};

interface RecentWarehouseActivityProps {
  activity: InventoryMovement[] | null;
  isLoading: boolean;
}

export function RecentWarehouseActivity({ activity, isLoading }: RecentWarehouseActivityProps) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? (activity ?? []) : (activity ?? []).slice(0, 10);

  const formatDateTime = (iso: string) => {
    try {
      return format(new Date(iso), 'dd MMM yyyy HH:mm');
    } catch {
      return iso;
    }
  };

  if (isLoading) {
    return (
      <section aria-labelledby="activity-heading">
        <div className="section-header">
          <h2 id="activity-heading" className="section-title">
            <History size={18} style={{ color: 'var(--clr-accent)' }} />
            Recent Warehouse Activity
          </h2>
        </div>
        <div className="table-container">
          <div style={{ padding: '16px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '38px', marginBottom: '8px', borderRadius: '6px' }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="activity-heading">
      <div className="section-header">
        <h2 id="activity-heading" className="section-title">
          <History size={18} style={{ color: 'var(--clr-accent)' }} />
          Recent Warehouse Activity
          {activity && (
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--clr-text-muted)', marginLeft: '8px' }}>
              ({activity.length} records)
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--clr-text-muted)' }}>
          <Lock size={11} />
          <span>Posted movements are read-only</span>
        </div>
      </div>

      <div className="table-container">
        {!activity || activity.length === 0 ? (
          <div className="empty-state">
            <History size={32} className="empty-state-icon" />
            <p className="empty-state-title">No recent activity</p>
            <p className="empty-state-desc">No inventory movements recorded yet for the selected warehouse and period.</p>
          </div>
        ) : (
          <>
            <div className="erp-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Product / Reference</th>
                    <th>Quantity</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Performed By</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((item) => {
                    const statusCfg = STATUS_CONFIG[item.status] ?? { class: 'unavailable', label: item.status };
                    const typeIcon = TRANSACTION_TYPE_ICONS[item.transactionType] ?? '📄';
                    const isPosted = item.status === 'Posted';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => navigate(item.detailsRoute)}
                        id={`activity-row-${item.id}`}
                        aria-label={`${item.transactionType}: ${item.productRef}`}
                      >
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--clr-accent-light)' }}>
                            {item.id}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{typeIcon}</span>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--clr-text-primary)' }}>
                              {item.transactionType}
                            </span>
                          </div>
                        </td>
                        <td style={{ maxWidth: '220px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--clr-text-primary)' }}>
                            {item.productRef}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)' }}>
                            {item.quantity}
                          </span>{' '}
                          <span style={{ fontSize: '11px', color: 'var(--clr-text-muted)' }}>
                            {item.unit}
                          </span>
                        </td>
                        <td style={{ maxWidth: '150px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                            {item.sourceLocation}
                          </div>
                        </td>
                        <td style={{ maxWidth: '150px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                            {item.destinationLocation}
                          </div>
                        </td>
                        <td style={{ fontSize: '12px' }}>{item.performedBy}</td>
                        <td style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                          {formatDateTime(item.dateTime)}
                        </td>
                        <td>
                          <span className={`status-badge ${statusCfg.class}`}>
                            {isPosted && <Lock size={9} />}
                            {statusCfg.label}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(item.detailsRoute);
                            }}
                            aria-label={`View transaction ${item.id}`}
                            id={`activity-view-${item.id}`}
                          >
                            <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {activity.length > 10 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--clr-border)', textAlign: 'center' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowAll((s) => !s)}
                  id="activity-show-more"
                >
                  {showAll ? 'Show less' : `Show all ${activity.length} activities`}
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
