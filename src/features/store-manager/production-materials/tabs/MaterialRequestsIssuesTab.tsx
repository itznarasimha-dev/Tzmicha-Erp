// ============================================================
// PRODUCTION MATERIALS — TAB A: MATERIAL REQUESTS & ISSUES
// ============================================================

import { Fragment, useState, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronUp, Package, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { MaterialRequest, MaterialRequestStatus, Priority } from '../types';
import { RequestStatusBadge, IssueStatusBadge, PriorityBadge } from '../components/StatusBadges';
import { MaterialIssueForm } from '../components/MaterialIssueForm';

interface MaterialRequestsIssuesTabProps {
  requests: MaterialRequest[];
  isLoading: boolean;
  initialFilter?: string;
  onRefresh: () => void;
}

const PAGE_SIZE = 10;

export function MaterialRequestsIssuesTab({
  requests, isLoading, initialFilter, onRefresh,
}: MaterialRequestsIssuesTabProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<MaterialRequestStatus | 'ALL'>('ALL');
  const [filterPriority, setFilterPriority] = useState<Priority | 'ALL'>('ALL');
  const [filterWarehouse, setFilterWarehouse] = useState('ALL');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [issuingRequest, setIssuingRequest] = useState<MaterialRequest | null>(null);

  const fmtDate = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy'); } catch { return iso; } };

  // Apply initial filter from summary cards
  const statusFromFilter = useMemo(() => {
    if (initialFilter === 'pending') return ['Approved', 'Partially Issued'];
    if (initialFilter === 'partial') return ['Partially Issued'];
    if (initialFilter === 'awaiting') return ['Approved'];
    if (initialFilter === 'overdue') return ['Approved', 'Partially Issued'];
    return null;
  }, [initialFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const now = new Date();
    return requests.filter(r => {
      const matchSearch = !q || r.requestId.toLowerCase().includes(q) || r.productionOrderId.toLowerCase().includes(q) || r.finishedProduct.toLowerCase().includes(q) || r.finishedProductCode.toLowerCase().includes(q);
      const matchStatus = statusFromFilter
        ? statusFromFilter.includes(r.requestStatus)
        : filterStatus === 'ALL' || r.requestStatus === filterStatus;
      const matchPriority = filterPriority === 'ALL' || r.priority === filterPriority;
      const matchWH = filterWarehouse === 'ALL' || r.warehouseId === filterWarehouse;
      const matchOverdue = initialFilter === 'overdue' ? new Date(r.requiredDate) < now : true;
      return matchSearch && matchStatus && matchPriority && matchWH && matchOverdue;
    });
  }, [requests, search, statusFromFilter, filterStatus, filterPriority, filterWarehouse, initialFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleIssueSuccess = useCallback((issueNoteId: string) => {
    console.log('Issue posted:', issueNoteId);
    setIssuingRequest(null);
    onRefresh();
  }, [onRefresh]);

  if (isLoading) return (
    <div>{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '8px', marginBottom: '8px' }} />)}</div>
  );

  return (
    <div>
      {/* Issue form overlay */}
      {issuingRequest && (
        <MaterialIssueForm
          request={issuingRequest}
          onClose={() => setIssuingRequest(null)}
          onSuccess={handleIssueSuccess}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
          <input className="form-input" placeholder="Search request ID, PO, product…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '30px' }} id="mr-search" />
        </div>
        {!statusFromFilter && (
          <select className="form-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value as MaterialRequestStatus | 'ALL'); setPage(1); }} id="mr-filter-status">
            <option value="ALL">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Partially Issued">Partially Issued</option>
            <option value="Issued">Issued</option>
            <option value="Blocked">Blocked</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        )}
        <select className="form-select" value={filterPriority} onChange={e => { setFilterPriority(e.target.value as Priority | 'ALL'); setPage(1); }} id="mr-filter-priority">
          <option value="ALL">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select className="form-select" value={filterWarehouse} onChange={e => { setFilterWarehouse(e.target.value); setPage(1); }} id="mr-filter-warehouse">
          <option value="ALL">All Warehouses</option>
          <option value="WH-001">Main Production Warehouse</option>
          <option value="WH-003">Raw Materials Store</option>
        </select>
        {(search || filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterWarehouse !== 'ALL') && (
          <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => { setSearch(''); setFilterStatus('ALL'); setFilterPriority('ALL'); setFilterWarehouse('ALL'); setPage(1); }} id="mr-clear-filters">
            <X size={11} /> Clear
          </button>
        )}
        <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>{filtered.length} records</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={36} className="empty-state-icon" />
          <p className="empty-state-title">No material requests found</p>
          <p className="empty-state-desc">Adjust your filters or search terms.</p>
        </div>
      ) : (
        <>
          <div className="erp-table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Production Order</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Required Date</th>
                  <th>Lines</th>
                  <th>Awaiting</th>
                  <th>Status</th>
                  <th>Issue Status</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => {
                  const isExpanded = expandedId === r.id;
                  const isOverdue = new Date(r.requiredDate) < new Date() && !['Issued', 'Cancelled'].includes(r.requestStatus);
                  const canIssue = ['Approved', 'Partially Issued'].includes(r.requestStatus);
                  return (
                    <Fragment key={r.id}>
                      <tr
                        key={r.id}
                        id={`mr-row-${r.id}`}
                        style={{ background: r.hasShortage ? 'rgba(245,158,11,0.04)' : undefined, cursor: 'pointer' }}
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      >
                        <td>
                          <span style={{ fontFamily: 'monospace', color: 'var(--clr-accent-light)', fontSize: '11px' }}>{r.requestId}</span>
                          {r.hasShortage && <AlertTriangle size={11} style={{ marginLeft: '5px', color: '#f59e0b' }} aria-label="Shortage" />}
                        </td>
                        <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.productionOrderId}</span></td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '12px' }}>{r.finishedProduct}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--clr-text-muted)' }}>{r.finishedProductCode}</div>
                        </td>
                        <td style={{ fontSize: '11px' }}>{r.warehouseName}</td>
                        <td>
                          <span style={{ fontSize: '11px', color: isOverdue ? '#ef4444' : 'var(--clr-text-secondary)', fontWeight: isOverdue ? 700 : 400 }}>
                            {fmtDate(r.requiredDate)}
                            {isOverdue && <span style={{ marginLeft: '4px' }}>⚠</span>}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{r.totalLines}</td>
                        <td style={{ textAlign: 'center', fontWeight: r.linesAwaitingIssue > 0 ? 700 : 400, color: r.linesAwaitingIssue > 0 ? 'var(--clr-accent-light)' : 'var(--clr-text-muted)' }}>{r.linesAwaitingIssue}</td>
                        <td><RequestStatusBadge status={r.requestStatus} /></td>
                        <td><IssueStatusBadge status={r.issueStatus} /></td>
                        <td><PriorityBadge priority={r.priority} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {canIssue && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                onClick={() => setIssuingRequest(r)}
                                id={`mr-issue-${r.id}`}
                              >
                                Issue
                              </button>
                            )}
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => setExpandedId(isExpanded ? null : r.id)}
                              id={`mr-expand-${r.id}`}
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded material lines */}
                      {isExpanded && (
                        <tr key={`${r.id}-expanded`}>
                          <td colSpan={11} style={{ padding: 0 }}>
                            <div style={{ background: 'var(--clr-bg-surface)', borderTop: '1px solid var(--clr-border)', borderBottom: '1px solid var(--clr-border)', padding: '14px 20px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--clr-text-muted)', marginBottom: '10px' }}>
                                Material Lines — {r.requestId}
                              </div>
                              <table className="erp-table" style={{ fontSize: '11px' }}>
                                <thead>
                                  <tr>
                                    <th>Material</th>
                                    <th>Category</th>
                                    <th>Required</th>
                                    <th>Issued</th>
                                    <th>Remaining</th>
                                    <th>Available</th>
                                    <th>Shortage</th>
                                    <th>Batch / Eligible Serials</th>
                                    <th>Issue Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.materialLines.map(ml => (
                                    <tr key={ml.lineId}>
                                      <td>
                                        <div style={{ fontWeight: 600 }}>{ml.materialName}</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--clr-text-muted)' }}>{ml.materialCode}</div>
                                      </td>
                                      <td>{ml.materialCategory}</td>
                                      <td>{ml.requiredQty} {ml.uom}</td>
                                      <td>{ml.previouslyIssuedQty} {ml.uom}</td>
                                      <td style={{ fontWeight: 600 }}>{ml.remainingQty} {ml.uom}</td>
                                      <td style={{ color: ml.eligibleAvailableQty > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>{ml.eligibleAvailableQty} {ml.uom}</td>
                                      <td style={{ color: ml.shortageQty > 0 ? '#f59e0b' : 'var(--clr-text-muted)', fontWeight: ml.shortageQty > 0 ? 700 : 400 }}>
                                        {ml.shortageQty > 0 ? `${ml.shortageQty} ${ml.uom}` : '—'}
                                      </td>
                                      <td>
                                        {ml.eligibleBatches.length > 0 && ml.eligibleBatches.join(', ')}
                                        {ml.eligibleSerials.length > 0 && ml.eligibleSerials.slice(0, 2).join(', ')}
                                        {ml.eligibleBatches.length === 0 && ml.eligibleSerials.length === 0 && <span style={{ color: 'var(--clr-text-muted)' }}>—</span>}
                                      </td>
                                      <td><IssueStatusBadge status={ml.issueStatus} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {r.notes && (
                                <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--clr-text-muted)', fontStyle: 'italic' }}>Note: {r.notes}</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)} id="mr-prev">← Prev</button>
              <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>Page {page} / {totalPages}</span>
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)} id="mr-next">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
