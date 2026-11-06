// ============================================================
// TAB A — STOCK OVERVIEW
// ============================================================

import { Fragment, useState, useMemo } from 'react';
import {
  Search, Filter, Eye, SlidersHorizontal, ChevronDown, ChevronUp,
  AlertTriangle, Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import type { InventoryRecord, StockStatus, StockCategory, TrackingType, InventoryFilters } from '../types';
import { StockStatusBadge, StockCategoryBadge } from '../components/StockStatusBadge';
import { Pagination } from '../../../../components/ui/Pagination';

interface StockOverviewTabProps {
  records: InventoryRecord[];
  isLoading: boolean;
  initialFilter?: string;
  onViewDetails: (record: InventoryRecord) => void;
}

const EMPTY_FILTERS: InventoryFilters = {
  warehouseId: 'ALL',
  search: '',
  category: 'ALL',
  stockStatus: 'ALL',
  trackingType: 'ALL',
  lowStock: false,
  nearExpiry: false,
  onHold: false,
  dateFrom: '',
  dateTo: '',
};

function applyInitialFilter(init?: string): Partial<InventoryFilters> {
  if (!init) return {};
  if (init === 'raw') return { category: 'Raw Material' };
  if (init === 'finished') return { category: 'Manufactured Finished Good' };
  if (init === 'held') return { onHold: true };
  if (init === 'low') return { lowStock: true };
  return {};
}

const isNearExpiry = (r: InventoryRecord) =>
  !!r.expiryDate && new Date(r.expiryDate) > new Date() &&
  new Date(r.expiryDate).getTime() - Date.now() < 30 * 86400000;
const isExpired = (r: InventoryRecord) =>
  !!r.expiryDate && new Date(r.expiryDate) < new Date();

export function StockOverviewTab({ records, isLoading, initialFilter, onViewDetails }: StockOverviewTabProps) {
  const [filters, setFilters] = useState<InventoryFilters>({ ...EMPTY_FILTERS, ...applyInitialFilter(initialFilter) });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'available' | 'status'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const setF = (patch: Partial<InventoryFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setCurrentPage(1);
  };

  const fmtDate = (s: string | null) => { if (!s) return '—'; try { return format(new Date(s), 'dd MMM yyyy'); } catch { return s || '—'; } };

  const filtered = useMemo(() => {
    let rows = [...records];
    const q = filters.search.toLowerCase();
    if (q) rows = rows.filter((r) =>
      r.productCode.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      (r.batchNumber?.toLowerCase().includes(q)) ||
      r.serialNumbers.some((s) => s.toLowerCase().includes(q)) ||
      r.warehouseName.toLowerCase().includes(q) ||
      (r.bin?.toLowerCase().includes(q))
    );
    if (filters.category !== 'ALL') rows = rows.filter((r) => r.productCategory === filters.category);
    if (filters.stockStatus !== 'ALL') rows = rows.filter((r) => r.stockStatus === filters.stockStatus);
    if (filters.trackingType !== 'ALL') rows = rows.filter((r) => r.trackingType === filters.trackingType);
    if (filters.lowStock) rows = rows.filter((r) => r.stockStatus === 'Low Stock' || r.stockStatus === 'No Stock');
    if (filters.nearExpiry) rows = rows.filter((r) => isNearExpiry(r) || isExpired(r));
    if (filters.onHold) rows = rows.filter((r) => r.heldQty > 0);

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.productName.localeCompare(b.productName);
      else if (sortBy === 'code') cmp = a.productCode.localeCompare(b.productCode);
      else if (sortBy === 'available') cmp = a.availableQty - b.availableQty;
      else if (sortBy === 'status') cmp = a.stockStatus.localeCompare(b.stockStatus);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [records, filters, sortBy, sortDir]);

  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)
      : null;

  if (isLoading) return (
    <div>{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '8px', marginBottom: '8px' }} />)}</div>
  );

  const hasActiveFilters = filters.search || filters.category !== 'ALL' || filters.stockStatus !== 'ALL' || filters.trackingType !== 'ALL' || filters.lowStock || filters.nearExpiry || filters.onHold;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            placeholder="Search product, batch, serial, bin…"
            value={filters.search}
            onChange={(e) => { setF({ search: e.target.value }); setCurrentPage(1); }}
            style={{ width: '100%', paddingLeft: '28px' }}
            id="inv-search"
          />
        </div>
        <button
          className={`btn btn-ghost`}
          style={{ borderColor: showFilters ? 'var(--clr-accent)' : undefined, color: showFilters ? 'var(--clr-accent)' : undefined }}
          onClick={() => setShowFilters((v) => !v)}
          id="inv-toggle-filters"
        >
          <SlidersHorizontal size={13} />
          Filters
          {hasActiveFilters && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--clr-accent)', display: 'inline-block', marginLeft: '4px' }} />}
        </button>
        {hasActiveFilters && (
          <button className="btn btn-ghost" onClick={() => { setFilters(EMPTY_FILTERS); setCurrentPage(1); }} id="inv-clear-filters">
            Clear Filters
          </button>
        )}
        <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '16px', marginBottom: '14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Category</label>
            <select className="form-select" value={filters.category} onChange={(e) => { setF({ category: e.target.value as StockCategory | 'ALL' }); setCurrentPage(1); }} style={{ width: '100%' }} id="inv-filter-cat">
              <option value="ALL">All Categories</option>
              <option value="Raw Material">Raw Material</option>
              <option value="Component">Component</option>
              <option value="Work in Progress">Work in Progress</option>
              <option value="Manufactured Finished Good">Manufactured Finished Good</option>
              <option value="Purchased Finished Good">Purchased Finished Good</option>
              <option value="Returned Goods">Returned Goods</option>
              <option value="Damaged / Rejected">Damaged / Rejected</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Stock Status</label>
            <select className="form-select" value={filters.stockStatus} onChange={(e) => { setF({ stockStatus: e.target.value as StockStatus | 'ALL' }); setCurrentPage(1); }} style={{ width: '100%' }} id="inv-filter-status">
              <option value="ALL">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Partially Reserved">Partially Reserved</option>
              <option value="Fully Reserved">Fully Reserved</option>
              <option value="Quality Hold">Quality Hold</option>
              <option value="Quarantined">Quarantined</option>
              <option value="In Transit">In Transit</option>
              <option value="Damaged">Damaged</option>
              <option value="Expired">Expired</option>
              <option value="Rejected">Rejected</option>
              <option value="Low Stock">Low Stock</option>
              <option value="No Stock">No Stock</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Tracking Type</label>
            <select className="form-select" value={filters.trackingType} onChange={(e) => { setF({ trackingType: e.target.value as TrackingType | 'ALL' }); setCurrentPage(1); }} style={{ width: '100%' }} id="inv-filter-track">
              <option value="ALL">All Tracking</option>
              <option value="Batch">Batch</option>
              <option value="Serial">Serial</option>
              <option value="None">None</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 3', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {([
              { key: 'lowStock', label: '📉 Low / No Stock' },
              { key: 'nearExpiry', label: '⚠ Near / Expired' },
              { key: 'onHold', label: '⊘ On Hold / Quarantine' },
            ] as const).map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer', color: 'var(--clr-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={filters[key]}
                  onChange={(e) => { setF({ [key]: e.target.checked } as Partial<InventoryFilters>); setCurrentPage(1); }}
                  id={`inv-chk-${key}`}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {paged.length === 0 ? (
        <div className="empty-state">
          <Filter size={36} className="empty-state-icon" />
          <p className="empty-state-title">No inventory records match your filters</p>
          <p className="empty-state-desc">Try adjusting the search criteria or clearing active filters.</p>
          {hasActiveFilters && (
            <button className="btn btn-ghost" style={{ marginTop: '12px' }} onClick={() => setFilters(EMPTY_FILTERS)}>Clear Filters</button>
          )}
        </div>
      ) : (
        <>
          <div className="erp-table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('code')}>Code <SortIcon col="code" /></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>Product Name <SortIcon col="name" /></th>
                  <th>Category</th>
                  <th>Warehouse / Bin</th>
                  <th>Batch / Serial</th>
                  <th style={{ textAlign: 'right' }}>On-Hand</th>
                  <th style={{ textAlign: 'right' }}>Reserved</th>
                  <th style={{ textAlign: 'right' }}>Held</th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('available')}>Available <SortIcon col="available" /></th>
                  <th>UOM</th>
                  <th>Expiry</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('status')}>Status <SortIcon col="status" /></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((rec) => {
                  const expired = isExpired(rec);
                  const nearExp = isNearExpiry(rec);
                  return (
                    <Fragment key={rec.id}>
                      <tr
                        key={rec.id}
                        id={`inv-row-${rec.id}`}
                        style={{
                          background: expired ? 'rgba(239,68,68,0.04)' : nearExp ? 'rgba(245,158,11,0.04)' : undefined,
                        }}
                      >
                        <td>
                          <button
                            className="btn-icon"
                            style={{ width: '24px', height: '24px' }}
                            onClick={() => setExpandedRow(expandedRow === rec.id ? null : rec.id)}
                            id={`inv-expand-${rec.id}`}
                            aria-label="Expand row"
                          >
                            {expandedRow === rec.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </td>
                        <td><span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--clr-accent-light)', fontWeight: 600 }}>{rec.productCode}</span></td>
                        <td style={{ fontWeight: 500, color: 'var(--clr-text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{rec.productName}</span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: rec.supplierName
                                  ? 'rgba(59,130,246,0.12)'
                                  : 'rgba(16,185,129,0.12)',
                                color: rec.supplierName ? '#2563eb' : '#059669',
                                border: rec.supplierName
                                  ? '1px solid rgba(59,130,246,0.25)'
                                  : '1px solid rgba(16,185,129,0.25)',
                              }}
                            >
                              {rec.supplierName ? 'Supplier-Sourced' : 'Self-Manufactured'}
                            </span>
                          </div>
                          {rec.traceabilityExceptions.length > 0 && (
                            <div style={{ fontSize: '10px', color: 'var(--clr-warning)', marginTop: '2px' }}>
                              ⚠ {rec.traceabilityExceptions.length} traceability exception{rec.traceabilityExceptions.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td><StockCategoryBadge category={rec.productCategory} size="sm" /></td>
                        <td style={{ fontSize: '11.5px' }}>
                          <div style={{ fontWeight: 500 }}>{rec.warehouseName}</div>
                          {rec.bin && <div style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)' }}>Bin: {rec.bin}</div>}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                          {rec.batchNumber ?? (rec.serialNumbers.length > 0 ? `${rec.serialNumbers.length} serial(s)` : '—')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{rec.onHandQty.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: rec.reservedQty > 0 ? 'var(--clr-info)' : 'var(--clr-text-muted)' }}>{rec.reservedQty.toLocaleString()}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            {rec.heldQty > 0 && <Lock size={10} style={{ color: 'var(--clr-critical)' }} />}
                            <span style={{ textAlign: 'right', color: rec.heldQty > 0 ? 'var(--clr-critical)' : 'var(--clr-text-muted)' }}>{rec.heldQty.toLocaleString()}</span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: rec.availableQty > 0 ? 'var(--clr-ok)' : 'var(--clr-text-muted)' }}>
                          {rec.availableQty.toLocaleString()}
                        </td>
                        <td style={{ fontSize: '11.5px' }}>{rec.uom}</td>
                        <td style={{ fontSize: '11.5px' }}>
                          {rec.expiryDate ? (
                            <span style={{ color: expired ? 'var(--clr-critical)' : nearExp ? 'var(--clr-warning)' : undefined, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {(expired || nearExp) && <AlertTriangle size={10} />}
                              {fmtDate(rec.expiryDate)}
                            </span>
                          ) : '—'}
                        </td>
                        <td><StockStatusBadge status={rec.stockStatus} size="sm" /></td>
                        <td>
                          <button
                            className="btn-icon"
                            onClick={() => onViewDetails(rec)}
                            id={`inv-view-${rec.id}`}
                            aria-label={`View ${rec.productName}`}
                            title="View details"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                      {expandedRow === rec.id && (
                        <tr key={`exp-${rec.id}`}>
                          <td colSpan={14} style={{ padding: '0', background: 'rgba(59,130,246,0.03)' }}>
                            <div style={{ padding: '14px 20px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '12px' }}>
                                {[
                                  ['GRN Ref', rec.grnReference ?? '—'],
                                  ['PO Ref', rec.poReference ?? '—'],
                                  ['Production Order', rec.productionOrderRef ?? '—'],
                                  ['QC Inspection', rec.qualityInspectionRef ?? '—'],
                                  ['Supplier', rec.supplierName ?? '—'],
                                  ['Supplier Batch', rec.supplierBatchNumber ?? '—'],
                                  ['In-Transit', `${rec.inTransitQty} ${rec.uom}`],
                                  ['Tracking', rec.trackingType],
                                ].map(([k, v]) => (
                                  <div key={k}>
                                    <div style={{ color: 'var(--clr-text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{k}</div>
                                    <div style={{ color: 'var(--clr-text-secondary)', fontFamily: typeof v === 'string' && v.startsWith('GRN') ? 'monospace' : undefined }}>{v}</div>
                                  </div>
                                ))}
                              </div>
                              {rec.traceabilityExceptions.length > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                  {rec.traceabilityExceptions.map((ex, i) => (
                                    <div key={i} style={{ fontSize: '11.5px', color: 'var(--clr-warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <AlertTriangle size={11} /> {ex}
                                    </div>
                                  ))}
                                </div>
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
          {filtered.length > pageSize && (
            <div style={{ marginTop: '16px' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                itemsPerPage={pageSize}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(size) => {
                  setPageSize(size);
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
