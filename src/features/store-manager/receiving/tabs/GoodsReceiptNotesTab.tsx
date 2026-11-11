// ============================================================
// TAB B — GOODS RECEIPT NOTES (GRNs)
// ============================================================

import { useState, useMemo } from 'react';
import { Search, Filter, Eye, FileText, Lock } from 'lucide-react';
import { format } from 'date-fns';
import type { GoodsReceiptNote, GRNStatus } from '../types';
import { ReceivingStatusBadge } from '../components/ReceivingStatusBadge';
import { Pagination } from '../../../../components/ui/Pagination';

interface GRNDetailsDrawerProps {
  grn: GoodsReceiptNote;
  onClose: () => void;
}

function GRNDetailsDrawer({ grn, onClose }: GRNDetailsDrawerProps) {
  const fmtDateTime = (iso: string | null) => { if (!iso) return '—'; try { return format(new Date(iso), 'dd MMM yyyy HH:mm'); } catch { return iso; } };
  const isPosted = grn.status === 'Posted';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ marginLeft: 'auto', width: '100%', maxWidth: '720px', background: 'var(--clr-bg-surface)', height: '100%', overflowY: 'auto', borderLeft: '1px solid var(--clr-border)', padding: '28px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--clr-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {grn.grnNumber}
              {isPosted && <Lock size={14} style={{ color: 'var(--clr-text-muted)' }} />}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)', marginTop: '4px' }}>
              {grn.supplierName} · {grn.warehouse}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ReceivingStatusBadge status={grn.status} />
            <button className="btn-icon" onClick={onClose} id="close-grn-detail">×</button>
          </div>
        </div>

        {isPosted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--clr-text-muted)' }}>
            <Lock size={13} />
            This GRN has been posted and is read-only. Use an authorized reversal or adjustment process to correct errors.
          </div>
        )}

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            ['PO Number', grn.poNumber],
            ['Receipt Date', fmtDateTime(grn.receiptDate)],
            ['Supplier Delivery Note', grn.supplierDeliveryNote ?? '—'],
            ['Posted At', fmtDateTime(grn.postedAt)],
            ['Created By', grn.createdBy],
            ['Inspection', grn.inspectionStatus],
            ['Packaging', grn.packagingCondition || '—'],
            ['Delivery Condition', grn.deliveryCondition || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{k}</div>
              <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--clr-text-primary)' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Lines */}
        <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Receipt Lines</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {grn.lines.map((line) => (
            <div key={line.lineId} style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--clr-text-primary)', fontSize: '13px' }}>{line.productName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', fontFamily: 'monospace' }}>{line.productCode}</div>
                </div>
                <ReceivingStatusBadge status={line.inspectionStatus} size="sm" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px', marginBottom: '8px' }}>
                <div><span style={{ color: 'var(--clr-text-muted)' }}>Received: </span><strong style={{ color: 'var(--clr-ok)' }}>{line.receivedQty} {line.uom}</strong></div>
                <div><span style={{ color: 'var(--clr-text-muted)' }}>Damaged: </span><strong style={{ color: line.damagedQty > 0 ? 'var(--clr-critical)' : 'var(--clr-text-muted)' }}>{line.damagedQty} {line.uom}</strong></div>
                <div><span style={{ color: 'var(--clr-text-muted)' }}>Accepted: </span><strong style={{ color: 'var(--clr-ok)' }}>{line.acceptedQty} {line.uom}</strong></div>
              </div>
              {line.batchNumber && <div style={{ fontSize: '11.5px', color: 'var(--clr-text-muted)' }}>Batch: <span style={{ fontFamily: 'monospace', color: 'var(--clr-accent-light)' }}>{line.batchNumber}</span></div>}
              {line.rackBin && <div style={{ fontSize: '11.5px', color: 'var(--clr-text-muted)' }}>Bin: <span style={{ color: 'var(--clr-text-secondary)' }}>{line.rackBin}</span></div>}
              {line.remarks && <div style={{ fontSize: '11.5px', color: 'var(--clr-text-muted)', fontStyle: 'italic', marginTop: '6px' }}>📝 {line.remarks}</div>}
            </div>
          ))}
        </div>

        {/* Discrepancies & Returns */}
        {grn.discrepancyIds.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Linked Discrepancies</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {grn.discrepancyIds.map((id) => (
                <span key={id} style={{ fontSize: '11px', fontFamily: 'monospace', background: 'var(--clr-critical-bg)', color: 'var(--clr-critical)', border: '1px solid var(--clr-critical-border)', borderRadius: '6px', padding: '3px 10px' }}>{id}</span>
              ))}
            </div>
          </div>
        )}

        {grn.overallRemarks && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--clr-text-secondary)', fontStyle: 'italic' }}>
            📝 {grn.overallRemarks}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {!isPosted && (
            <button className="btn btn-primary" onClick={onClose} id="continue-draft-grn">
              Continue Draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface GoodsReceiptNotesTabProps {
  grns: GoodsReceiptNote[];
  isLoading: boolean;
  initialFilter?: string;
  onStartGRN: () => void;
}

export function GoodsReceiptNotesTab({ grns, isLoading, initialFilter, onStartGRN }: GoodsReceiptNotesTabProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<GRNStatus | 'ALL'>(
    initialFilter === 'pending' ? 'Draft' : initialFilter === 'inspection' ? 'Awaiting Inspection' : 'ALL'
  );
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceiptNote | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const fmtDateTime = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy HH:mm'); } catch { return iso; } };

  const filtered = useMemo(() => grns.filter((g) => {
    const q = search.toLowerCase();
    const matchSearch = !q || g.grnNumber.toLowerCase().includes(q) || g.poNumber.toLowerCase().includes(q) || g.supplierName.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'ALL' || g.status === filterStatus;
    return matchSearch && matchStatus;
  }), [grns, search, filterStatus]);

  const paginatedGRNs = useMemo(() => {
    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  if (isLoading) return (
    <div>{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '50px', borderRadius: '8px', marginBottom: '8px' }} />)}</div>
  );

  return (
    <div>
      {selectedGRN && <GRNDetailsDrawer grn={selectedGRN} onClose={() => setSelectedGRN(null)} />}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
            <input className="form-input" placeholder="Search GRN, PO, supplier…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '28px' }} id="grn-search" />
          </div>
          <Filter size={13} style={{ color: 'var(--clr-text-muted)', flexShrink: 0 }} />
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as GRNStatus | 'ALL')} id="grn-filter-status" aria-label="Filter by GRN status">
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Awaiting Inspection">Awaiting Inspection</option>
            <option value="Posted">Posted</option>
            <option value="Reversed">Reversed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>{filtered.length} GRN{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn btn-primary" onClick={onStartGRN} id="new-grn-btn">
          <FileText size={13} />
          New GRN
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <FileText size={36} className="empty-state-icon" />
          <p className="empty-state-title">No GRNs match your filters</p>
        </div>
      ) : (
        <>
          <div className="erp-table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>GRN Number</th>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Receipt Date</th>
                  <th>Warehouse</th>
                  <th>Lines</th>
                  <th>Total Received</th>
                  <th>Damaged</th>
                  <th>Inspection</th>
                  <th>Discrepancy</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedGRNs.map((grn) => {
                const isPosted = grn.status === 'Posted';
                return (
                  <tr key={grn.id} id={`grn-row-${grn.id}`} onClick={() => setSelectedGRN(grn)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isPosted && <Lock size={11} style={{ color: 'var(--clr-text-muted)', flexShrink: 0 }} />}
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--clr-accent-light)' }}>{grn.grnNumber}</span>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '11.5px' }}>{grn.poNumber}</span></td>
                    <td style={{ fontWeight: 500 }}>{grn.supplierName}</td>
                    <td style={{ fontSize: '11.5px' }}>{fmtDateTime(grn.receiptDate)}</td>
                    <td style={{ fontSize: '11.5px' }}>{grn.warehouse}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '2px 8px', fontSize: '11px' }}>{grn.lines.length}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--clr-ok)' }}>{grn.totalReceivedQty.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: grn.totalDamagedQty > 0 ? 'var(--clr-critical)' : 'var(--clr-text-muted)' }}>
                      {grn.totalDamagedQty > 0 ? grn.totalDamagedQty.toLocaleString() : '—'}
                    </td>
                    <td><ReceivingStatusBadge status={grn.inspectionStatus} size="sm" /></td>
                    <td>
                      {grn.discrepancyIds.length > 0
                        ? <span style={{ fontSize: '10.5px', color: 'var(--clr-warning)', fontWeight: 600 }}>⚠ {grn.discrepancyIds.length}</span>
                        : <span style={{ fontSize: '11px', color: 'var(--clr-text-muted)' }}>—</span>}
                    </td>
                    <td><ReceivingStatusBadge status={grn.status} size="sm" /></td>
                    <td style={{ fontSize: '11.5px' }}>{grn.createdBy}</td>
                    <td>
                      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setSelectedGRN(grn); }} aria-label={`View GRN ${grn.grnNumber}`} id={`view-grn-${grn.id}`}>
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > itemsPerPage && (
          <div style={{ marginTop: '16px' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / itemsPerPage)}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </>
      )}
    </div>
  );
}
