// ============================================================
// TAB 1 — TRANSFER REQUESTS
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import * as tscService from '../services/transfersStockCountService';
import type { TransferRequest } from '../types';
import { Pagination } from '../../../../components/ui/Pagination';

interface TransferRequestsTabProps {
  warehouseId: string;
  isLoading: boolean;
  initialFilter?: string;
}

export function TransferRequestsTab({ warehouseId, isLoading, initialFilter }: TransferRequestsTabProps) {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await tscService.fetchTransferRequests(warehouseId);
        setRequests(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.transferNumber.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q) || r.requestedBy.toLowerCase().includes(q);
    const matchFilter = !initialFilter || (initialFilter === 'ready' && r.status === 'Approved for Dispatch');
    return matchSearch && matchFilter;
  });

  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search transfers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
        <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => setShowCreateModal(true)}>
          <Plus size={14} style={{ marginRight: '4px' }} /> Create Transfer
        </button>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>TRF #</th>
              <th>Type</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Lines</th>
              <th>Requested Date</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(r => (
              <tr key={r.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.transferNumber}</td>
                <td style={{ fontSize: '11px' }}>{r.type}</td>
                <td style={{ fontSize: '11px' }}>{r.sourceWarehouseName}</td>
                <td style={{ fontSize: '11px' }}>{r.destinationWarehouseName}</td>
                <td style={{ fontSize: '11px' }}>{r.lines.length}</td>
                <td style={{ fontSize: '11px' }}>{format(new Date(r.requestedDate), 'dd MMM')}</td>
                <td>
                  <span className={`status-badge ${r.status === 'Approved for Dispatch' ? 'badge-green' : 'badge-blue'}`}>
                    {r.status}
                  </span>
                </td>
                <td style={{ fontSize: '11px', fontWeight: 600 }}>{r.priority}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Transfer ${r.transferNumber}...`)}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > pageSize && (
        <div style={{ marginTop: '16px' }}>
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(filtered.length / pageSize)}
            totalItems={filtered.length}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            onItemsPerPageChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: '16px', width: '100%', maxWidth: '700px', padding: '24px', border: '1px solid var(--clr-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>New Transfer Request</h3>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Source Warehouse</label>
                <select className="form-select" style={{ width: '100%' }}><option>Main Production Warehouse</option></select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Destination Warehouse</label>
                <select className="form-select" style={{ width: '100%' }}><option>Finished Goods Store</option></select>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Reason</label>
              <textarea className="form-input" rows={2} style={{ width: '100%' }} placeholder="Reason for transfer..."></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { alert('Transfer Request Submitted'); setShowCreateModal(false); }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
}
