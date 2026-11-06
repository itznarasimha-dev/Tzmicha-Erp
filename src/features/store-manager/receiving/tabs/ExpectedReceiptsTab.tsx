// ============================================================
// TAB A — EXPECTED RECEIPTS / PURCHASE ORDERS
// ============================================================

import { Fragment, useState, useMemo } from 'react';
import {
  Search, Filter, ChevronDown,
  AlertTriangle, Clock, Truck, Eye,
  PlayCircle, AlertCircle, ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import type { PurchaseOrder, ReceivingStatus } from '../types';
import { ReceivingStatusBadge } from '../components/ReceivingStatusBadge';
import { Pagination } from '../../../../components/ui/Pagination';

interface ExpectedReceiptsTabProps {
  purchaseOrders: PurchaseOrder[];
  isLoading: boolean;
  initialFilter?: string;
  onStartGRN: (po: PurchaseOrder) => void;
}

function POExpandedLines({ po }: { po: PurchaseOrder }) {
  return (
    <tr>
      <td colSpan={13} style={{ padding: '0', background: 'rgba(59,130,246,0.04)' }}>
        <div style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Product Lines
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table" style={{ fontSize: '11.5px' }}>
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Ordered</th>
                  <th>Received</th>
                  <th>Outstanding</th>
                  <th>UOM</th>
                  <th>Tracking</th>
                  <th>Inspection</th>
                </tr>
              </thead>
              <tbody>
                {po.lines.map((line) => (
                  <tr key={line.lineId}>
                    <td>
                      <span style={{ fontFamily: 'monospace', color: 'var(--clr-accent-light)' }}>{line.productCode}</span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--clr-text-primary)' }}>{line.productName}</td>
                    <td>{line.productCategory}</td>
                    <td>
                      <span style={{
                        fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
                        background: line.stockType === 'Purchased Finished Good' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.1)',
                        color: line.stockType === 'Purchased Finished Good' ? '#34d399' : '#60a5fa',
                        fontWeight: 600,
                      }}>
                        {line.stockType}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{line.orderedQty.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: line.receivedQty > 0 ? 'var(--clr-ok)' : 'var(--clr-text-muted)' }}>
                      {line.receivedQty.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: line.outstandingQty > 0 ? 'var(--clr-warning)' : 'var(--clr-text-muted)' }}>
                      {line.outstandingQty.toLocaleString()}
                    </td>
                    <td>{line.uom}</td>
                    <td>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--clr-text-muted)' }}>
                        {line.trackingType}
                      </span>
                    </td>
                    <td>
                      {line.requiresInspection
                        ? <span style={{ fontSize: '10px', color: 'var(--clr-warning)' }}>Required</span>
                        : <span style={{ fontSize: '10px', color: 'var(--clr-text-muted)' }}>Not Required</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {po.notes && (
            <div style={{ marginTop: '10px', fontSize: '11.5px', color: 'var(--clr-text-muted)', fontStyle: 'italic' }}>
              📝 {po.notes}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export function ExpectedReceiptsTab({ purchaseOrders, isLoading, initialFilter, onStartGRN }: ExpectedReceiptsTabProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReceivingStatus | 'ALL'>(
    initialFilter === 'overdue' ? 'Overdue' : 'ALL'
  );
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const fmtDate = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy'); } catch { return iso; } };

  const isOverdue = (po: PurchaseOrder) => po.receivingStatus === 'Overdue';
  const isDueToday = (po: PurchaseOrder) => po.receivingStatus === 'Due Today';

  const filtered = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = search.toLowerCase();
      const matchSearch = !q || po.poNumber.toLowerCase().includes(q) || po.supplierName.toLowerCase().includes(q)
        || po.lines.some((l) => l.productCode.toLowerCase().includes(q) || l.productName.toLowerCase().includes(q));
      const matchStatus = filterStatus === 'ALL' || po.receivingStatus === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, search, filterStatus]);

  const paginatedPOs = useMemo(() => {
    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const canStartGRN = (po: PurchaseOrder) =>
    po.poStatus === 'Approved' && po.totalOutstandingQty > 0 && po.receivingStatus !== 'Cancelled';

  if (isLoading) {
    return (
      <div style={{ padding: '8px 0' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '52px', borderRadius: '8px', marginBottom: '8px' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Detail drawer */}
      {selectedPO && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedPO(null)}
        >
          <div
            style={{
              marginLeft: 'auto', width: '100%', maxWidth: '680px',
              background: 'var(--clr-bg-surface)', height: '100%', overflowY: 'auto',
              borderLeft: '1px solid var(--clr-border)', padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                  {selectedPO.poNumber}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)', marginTop: '4px' }}>
                  {selectedPO.supplierName}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedPO(null)} id="close-po-detail">×</button>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              {[
                ['Order Date', fmtDate(selectedPO.orderDate)],
                ['Expected Delivery', fmtDate(selectedPO.expectedDeliveryDate)],
                ['Destination', selectedPO.destinationWarehouse],
                ['Delivery Ref', selectedPO.deliveryRef ?? '—'],
                ['PO Status', selectedPO.poStatus],
                ['Receiving Status', selectedPO.receivingStatus],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--clr-text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Supplier Contact
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--clr-text-secondary)', marginBottom: '20px' }}>
              {selectedPO.supplierContact}
            </div>

            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Product Lines
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {selectedPO.lines.map((line) => (
                <div key={line.lineId} style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--clr-text-primary)' }}>{line.productName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', fontFamily: 'monospace' }}>{line.productCode} · {line.stockType}</div>
                    </div>
                    {line.requiresInspection && (
                      <span style={{ fontSize: '10px', background: 'var(--clr-warning-bg)', color: 'var(--clr-warning)', border: '1px solid var(--clr-warning-border)', borderRadius: '10px', padding: '2px 8px' }}>
                        Inspection Required
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                    <div><span style={{ color: 'var(--clr-text-muted)' }}>Ordered: </span><strong>{line.orderedQty} {line.uom}</strong></div>
                    <div><span style={{ color: 'var(--clr-text-muted)' }}>Received: </span><strong style={{ color: 'var(--clr-ok)' }}>{line.receivedQty} {line.uom}</strong></div>
                    <div><span style={{ color: 'var(--clr-text-muted)' }}>Outstanding: </span><strong style={{ color: line.outstandingQty > 0 ? 'var(--clr-warning)' : 'var(--clr-ok)' }}>{line.outstandingQty} {line.uom}</strong></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Previous GRNs */}
            {selectedPO.grnIds.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Receipt History
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedPO.grnIds.map((grnId) => (
                    <span key={grnId} style={{ fontSize: '11px', fontFamily: 'monospace', background: 'var(--clr-info-bg)', color: 'var(--clr-info)', border: '1px solid var(--clr-info-border)', borderRadius: '6px', padding: '3px 10px' }}>
                      {grnId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedPO.notes && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '12.5px', color: 'var(--clr-text-secondary)' }}>
                📝 {selectedPO.notes}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {canStartGRN(selectedPO) ? (
                <button
                  className="btn btn-primary"
                  onClick={() => { setSelectedPO(null); onStartGRN(selectedPO); }}
                  id={`start-grn-${selectedPO.id}`}
                >
                  <PlayCircle size={14} />
                  Start Goods Receipt
                </button>
              ) : (
                <button className="btn btn-ghost" disabled title="This PO is not eligible for receiving">
                  <AlertCircle size={14} />
                  Not Eligible for Receipt
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setSelectedPO(null)} id="close-po-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            placeholder="Search PO, supplier, product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="po-search"
            style={{ width: '100%', paddingLeft: '28px' }}
          />
        </div>
        <Filter size={13} style={{ color: 'var(--clr-text-muted)', flexShrink: 0 }} />
        <select
          className="form-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ReceivingStatus | 'ALL')}
          id="po-filter-status"
          aria-label="Filter by receiving status"
        >
          <option value="ALL">All Statuses</option>
          <option value="Expected">Expected</option>
          <option value="Due Today">Due Today</option>
          <option value="Overdue">Overdue</option>
          <option value="Partially Received">Partially Received</option>
          <option value="Fully Received">Fully Received</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)', flexShrink: 0 }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <Truck size={36} className="empty-state-icon" />
          <p className="empty-state-title">No expected deliveries match your filters</p>
          <p className="empty-state-desc">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <>
          <div className="erp-table-wrapper">
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}></th>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Expected Delivery</th>
                <th>Warehouse</th>
                <th>Lines</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Outstanding</th>
                <th>PO Status</th>
                <th>Receiving Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPOs.map((po) => (
                <Fragment key={po.id}>
                  <tr
                    style={{
                      background: isOverdue(po) ? 'rgba(239,68,68,0.04)' : isDueToday(po) ? 'rgba(245,158,11,0.04)' : undefined,
                    }}
                    id={`po-row-${po.id}`}
                  >
                    <td>
                      <button
                        className="btn-icon"
                        style={{ width: '24px', height: '24px' }}
                        onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                        aria-label={expandedPO === po.id ? 'Collapse' : 'Expand'}
                        id={`po-expand-${po.id}`}
                      >
                        {expandedPO === po.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--clr-accent-light)' }}>{po.poNumber}</span>
                    </td>
                    <td style={{ color: 'var(--clr-text-primary)', fontWeight: 500 }}>{po.supplierName}</td>
                    <td style={{ fontSize: '11.5px' }}>{fmtDate(po.orderDate)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isOverdue(po) && <AlertTriangle size={11} style={{ color: 'var(--clr-critical)', flexShrink: 0 }} />}
                        {isDueToday(po) && <Clock size={11} style={{ color: 'var(--clr-warning)', flexShrink: 0 }} />}
                        <span style={{ fontSize: '11.5px', color: isOverdue(po) ? 'var(--clr-critical)' : isDueToday(po) ? 'var(--clr-warning)' : undefined }}>
                          {fmtDate(po.expectedDeliveryDate)}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '11.5px' }}>{po.destinationWarehouse}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '2px 8px', fontSize: '11px' }}>
                        {po.lines.length}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{po.totalOrderedQty.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: po.totalReceivedQty > 0 ? 'var(--clr-ok)' : 'var(--clr-text-muted)' }}>
                      {po.totalReceivedQty.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: po.totalOutstandingQty > 0 ? 'var(--clr-warning)' : 'var(--clr-text-muted)' }}>
                      {po.totalOutstandingQty.toLocaleString()}
                    </td>
                    <td><ReceivingStatusBadge status={po.poStatus} size="sm" /></td>
                    <td><ReceivingStatusBadge status={po.receivingStatus} size="sm" /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedPO(po)}
                          aria-label={`View PO ${po.poNumber}`}
                          id={`view-po-${po.id}`}
                          title="View PO details"
                        >
                          <Eye size={13} />
                        </button>
                        {canStartGRN(po) && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => onStartGRN(po)}
                            id={`grn-start-${po.id}`}
                            title="Start Goods Receipt"
                          >
                            <PlayCircle size={12} />
                            GRN
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedPO === po.id && <POExpandedLines po={po} />}
                </Fragment>
              ))}
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
