// ============================================================
// TAB E — STOCK ALERTS
// ============================================================

import { useState, useMemo } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { InventoryAlert, AlertPriority, AlertStatus, InventoryAlertType } from '../types';

interface StockAlertsTabProps {
  alerts: InventoryAlert[];
  isLoading: boolean;
  onAcknowledge: (alertId: string) => void;
}

const PRIORITY_ORDER: AlertPriority[] = ['Critical', 'High', 'Medium', 'Low'];

export function StockAlertsTab({ alerts, isLoading, onAcknowledge }: StockAlertsTabProps) {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<AlertPriority | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<InventoryAlertType | 'ALL'>('ALL');

  const fmtDT = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy HH:mm'); } catch { return iso; } };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return alerts.filter((a) => {
      const matchSearch = !q || a.alertId.toLowerCase().includes(q) || a.productCode.toLowerCase().includes(q) || a.productName.toLowerCase().includes(q) || a.batchSerial?.toLowerCase().includes(q) || a.warehouseName.toLowerCase().includes(q);
      const matchPriority = filterPriority === 'ALL' || a.priority === filterPriority;
      const matchStatus   = filterStatus === 'ALL' || a.status === filterStatus;
      const matchType     = filterType === 'ALL' || a.alertType === filterType;
      return matchSearch && matchPriority && matchStatus && matchType;
    }).sort((a, b) => {
      const pA = PRIORITY_ORDER.indexOf(a.priority);
      const pB = PRIORITY_ORDER.indexOf(b.priority);
      if (pA !== pB) return pA - pB;
      return new Date(b.alertDate).getTime() - new Date(a.alertDate).getTime();
    });
  }, [alerts, search, filterPriority, filterStatus, filterType]);

  if (isLoading) return (
    <div>{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '8px', marginBottom: '8px' }} />)}</div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
          <input className="form-input" placeholder="Search alerts…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '30px' }} id="alert-search" />
        </div>
        <select className="form-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as AlertPriority | 'ALL')} id="alert-filter-priority">
          <option value="ALL">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as AlertStatus | 'ALL')} id="alert-filter-status">
          <option value="ALL">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
        <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value as InventoryAlertType | 'ALL')} id="alert-filter-type">
          <option value="ALL">All Types</option>
          <option value="Low Stock">Low Stock</option>
          <option value="No Stock">No Stock</option>
          <option value="Near Expiry">Near Expiry</option>
          <option value="Expired Stock">Expired Stock</option>
          <option value="Quality Hold">Quality Hold</option>
          <option value="Quarantined Stock">Quarantined Stock</option>
          <option value="Damaged Stock">Damaged Stock</option>
          <option value="Missing Batch/Serial">Missing Batch/Serial</option>
          <option value="Movement Exception">Movement Exception</option>
          <option value="Stock Count Discrepancy">Stock Count Discrepancy</option>
          <option value="Traceability Issue">Traceability Issue</option>
        </select>
        <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>{filtered.length} alerts</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={36} className="empty-state-icon" />
          <p className="empty-state-title">No alerts match current filters</p>
          <p className="empty-state-desc">Adjust filter criteria or resolve existing alerts.</p>
        </div>
      ) : (
        <div className="erp-table-wrapper">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Type</th>
                <th>Product</th>
                <th>Batch / Serial</th>
                <th>Warehouse / Bin</th>
                <th>Affected Qty</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} id={`alert-row-${a.id}`} style={{ background: a.priority === 'Critical' ? 'rgba(239,68,68,0.04)' : a.priority === 'High' ? 'rgba(245,158,11,0.04)' : undefined }}>
                  <td><span style={{ fontFamily: 'monospace', color: 'var(--clr-accent-light)' }}>{a.alertId}</span></td>
                  <td>{a.alertType}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.productName}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--clr-text-muted)' }}>{a.productCode}</div>
                  </td>
                  <td>{a.batchSerial ?? '—'}</td>
                  <td>{a.warehouseName}{a.bin ? ` / ${a.bin}` : ''}</td>
                  <td>{a.affectedQty != null ? `${a.affectedQty.toLocaleString()} ${a.uom}` : '—'}</td>
                  <td><span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: a.priority === 'Critical' ? 'rgba(239,68,68,0.12)' : a.priority === 'High' ? 'rgba(245,158,11,0.12)' : a.priority === 'Medium' ? 'rgba(139,92,246,0.12)' : 'rgba(100,116,139,0.12)', color: a.priority === 'Critical' ? 'var(--clr-critical)' : a.priority === 'High' ? 'var(--clr-warning)' : a.priority === 'Medium' ? 'var(--clr-info)' : 'var(--clr-text-muted)' }}>{a.priority}</span></td>
                  <td>{a.status}</td>
                  <td>{fmtDT(a.alertDate)}</td>
                  <td>
                    {a.status === 'Open' && (
                      <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => onAcknowledge(a.alertId)} id={`ack-${a.alertId}`}>Acknowledge</button>
                    )}
                    {a.status !== 'Open' && (
                      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => onAcknowledge(a.alertId)} id={`resolve-${a.alertId}`}>Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
