// ============================================================
// TAB D — MOVEMENT HISTORY
// ============================================================

import { useState, useMemo } from 'react';
import { Search, Eye, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { InventoryMovement, MovementType, MovementStatus } from '../types';

interface MovementHistoryTabProps {
  movements: InventoryMovement[];
  isLoading: boolean;
}

const MOVEMENT_ICONS: Record<MovementType, string> = {
  'Goods Receipt':           '📦',
  'Material Issue':          '⚙️',
  'Material Return':         '↩️',
  'Finished Goods Receipt':  '🏭',
  'Internal Bin Transfer':   '🔄',
  'Warehouse Transfer':      '🚀',
  'Transfer Dispatch':       '🚀',
  'Transfer Receipt':        '✅',
  'Sales Dispatch':          '🚚',
  'Supplier Return':         '↩️',
  'Customer Return Receipt': '📬',
  'Inventory Adjustment':    '🔧',
  'Reversal':                '⟲',
};

function MovementDetailDrawer({ movement, onClose }: { movement: InventoryMovement; onClose: () => void }) {
  const fmtDT = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy HH:mm:ss'); } catch { return iso; } };
  const isPosted = movement.status === 'Posted';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ marginLeft: 'auto', width: '100%', maxWidth: '560px', background: 'var(--clr-bg-surface)', height: '100%', overflowY: 'auto', borderLeft: '1px solid var(--clr-border)', padding: '28px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              {MOVEMENT_ICONS[movement.movementType as MovementType] ?? '•'} {movement.movementType}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--clr-accent-light)', marginTop: '2px' }}>{movement.movementId}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              fontSize: '10.5px', padding: '3px 10px', borderRadius: '10px', fontWeight: 600,
              background: isPosted ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
              color: isPosted ? 'var(--clr-ok)' : 'var(--clr-warning)',
            }}>
              {movement.status}
            </span>
            <button className="btn-icon" onClick={onClose}>×</button>
          </div>
        </div>

        {isPosted && (
          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--clr-ok)' }}>
            ✅ Posted record — read-only. To correct this movement, use an authorized adjustment or reversal transaction.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            ['Timestamp', fmtDT(movement.timestamp)],
            ['Product Code', movement.productCode],
            ['Product Name', movement.productName],
            ['Batch / Serial', movement.batchSerial ?? '—'],
            ['Quantity', `${movement.qty > 0 ? '+' : ''}${movement.qty.toLocaleString()} ${movement.uom}`],
            ['Reference Document', movement.referenceDoc],
            ['Performed By', movement.performedBy],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{k}</div>
              <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--clr-text-primary)', fontFamily: k === 'Product Code' || k === 'Reference Document' || k === 'Batch / Serial' ? 'monospace' : undefined }}>
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* Source → Destination */}
        <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Movement Route</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>SOURCE</div>
              <div style={{ fontWeight: 600 }}>{movement.sourceLocation ?? '—'}</div>
            </div>
            <ArrowRight size={20} style={{ flexShrink: 0, color: 'var(--clr-accent)' }} />
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>DESTINATION</div>
              <div style={{ fontWeight: 600 }}>{movement.destinationLocation ?? '—'}</div>
            </div>
          </div>
        </div>

        {/* Balance reconciliation */}
        {(movement.balanceBefore != null || movement.balanceAfter != null) && (
          <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Balance Reconciliation</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', fontSize: '12.5px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>BEFORE</div>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>{movement.balanceBefore?.toLocaleString() ?? '—'}</div>
                <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)' }}>{movement.uom}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>CHANGE</div>
                <div style={{ fontWeight: 700, fontSize: '18px', color: movement.qty >= 0 ? 'var(--clr-ok)' : 'var(--clr-critical)' }}>
                  {movement.qty > 0 ? '+' : ''}{movement.qty.toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)' }}>{movement.uom}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>AFTER</div>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>{movement.balanceAfter?.toLocaleString() ?? '—'}</div>
                <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)' }}>{movement.uom}</div>
              </div>
            </div>
          </div>
        )}

        {movement.notes && (
          <div style={{ fontSize: '12.5px', color: 'var(--clr-text-muted)', fontStyle: 'italic', marginBottom: '16px' }}>📝 {movement.notes}</div>
        )}

        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function MovementHistoryTab({ movements, isLoading }: MovementHistoryTabProps) {
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState<MovementType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<MovementStatus | 'ALL'>('ALL');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [selected, setSelected]       = useState<InventoryMovement | null>(null);

  const fmtDT = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy HH:mm'); } catch { return iso; } };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return movements.filter((m) => {
      const matchSearch = !q || m.productCode.toLowerCase().includes(q) || m.productName.toLowerCase().includes(q) || m.referenceDoc.toLowerCase().includes(q) || (m.batchSerial?.toLowerCase().includes(q));
      const matchType   = filterType === 'ALL' || m.movementType === filterType;
      const matchStatus = filterStatus === 'ALL' || m.status === filterStatus;
      const matchDate   = (!dateFrom || m.timestamp >= dateFrom) && (!dateTo || m.timestamp <= dateTo + 'T23:59:59');
      return matchSearch && matchType && matchStatus && matchDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, search, filterType, filterStatus, dateFrom, dateTo]);

  if (isLoading) return (
    <div>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '8px', marginBottom: '8px' }} />)}</div>
  );

  return (
    <div>
      {selected && <MovementDetailDrawer movement={selected} onClose={() => setSelected(null)} />}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
          <input className="form-input" placeholder="Search product, reference, batch…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '28px' }} id="mov-search" />
        </div>
        <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value as MovementType | 'ALL')} id="mov-filter-type" aria-label="Filter by movement type">
          <option value="ALL">All Movement Types</option>
          <option value="Goods Receipt">Goods Receipt</option>
          <option value="Material Issue">Material Issue</option>
          <option value="Material Return">Material Return</option>
          <option value="Finished Goods Receipt">Finished Goods Receipt</option>
          <option value="Internal Bin Transfer">Internal Bin Transfer</option>
          <option value="Warehouse Transfer">Warehouse Transfer</option>
          <option value="Sales Dispatch">Sales Dispatch</option>
          <option value="Supplier Return">Supplier Return</option>
          <option value="Customer Return Receipt">Customer Return Receipt</option>
          <option value="Inventory Adjustment">Inventory Adjustment</option>
          <option value="Reversal">Reversal</option>
        </select>
        <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MovementStatus | 'ALL')} id="mov-filter-status" aria-label="Filter by status">
          <option value="ALL">All Statuses</option>
          <option value="Posted">Posted</option>
          <option value="Pending">Pending</option>
          <option value="Draft">Draft</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Reversed">Reversed</option>
        </select>
        <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '130px' }} id="mov-date-from" aria-label="Date from" />
        <span style={{ color: 'var(--clr-text-muted)', fontSize: '12px' }}>to</span>
        <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '130px' }} id="mov-date-to" aria-label="Date to" />
        <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>{filtered.length} movements</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Search size={36} className="empty-state-icon" />
          <p className="empty-state-title">No movement records match your filters</p>
          <p className="empty-state-desc">Adjust the search or date range to view inventory movements.</p>
        </div>
      ) : (
        <div className="erp-table-wrapper">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Movement ID</th>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Product</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Batch / Serial</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Reference</th>
                <th>By</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} id={`mov-row-${m.id}`} onClick={() => setSelected(m)}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--clr-accent-light)', fontWeight: 600 }}>{m.movementId}</span></td>
                  <td style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>{fmtDT(m.timestamp)}</td>
                  <td style={{ fontSize: '11.5px' }}>
                    <span>{MOVEMENT_ICONS[m.movementType as MovementType] ?? '•'} {m.movementType}</span>
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 500 }}>{m.productName}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--clr-text-muted)' }}>{m.productCode}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: m.qty >= 0 ? 'var(--clr-ok)' : 'var(--clr-critical)' }}>
                    {m.qty > 0 ? '+' : ''}{m.qty.toLocaleString()} {m.uom}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{m.batchSerial ?? '—'}</td>
                  <td style={{ fontSize: '11.5px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.sourceLocation ?? '—'}</td>
                  <td style={{ fontSize: '11.5px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.destinationLocation ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{m.referenceDoc}</td>
                  <td style={{ fontSize: '11.5px' }}>{m.performedBy}</td>
                  <td>
                    <span style={{
                      fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                      background: m.status === 'Posted' ? 'rgba(34,197,94,0.12)' : m.status === 'Pending' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)',
                      color: m.status === 'Posted' ? 'var(--clr-ok)' : m.status === 'Pending' ? 'var(--clr-warning)' : 'var(--clr-text-muted)',
                    }}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setSelected(m); }} id={`mov-view-${m.id}`} aria-label={`View ${m.movementId}`}>
                      <Eye size={13} />
                    </button>
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
