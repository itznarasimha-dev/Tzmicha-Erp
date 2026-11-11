// ============================================================
// TAB 1 — ORDERS AWAITING FULFILMENT
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import * as sfService from '../services/salesFulfilmentService';
import type { SalesOrder } from '../types';
import { Pagination } from '../../../../components/ui/Pagination';

interface OrdersAwaitingFulfilmentTabProps {
  warehouseId: string;
  isLoading: boolean;
  initialFilter?: string;
}

export function OrdersAwaitingFulfilmentTab({ warehouseId, isLoading, initialFilter }: OrdersAwaitingFulfilmentTabProps) {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await sfService.fetchAuthorizedOrders(warehouseId);
        setOrders(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
    const matchFilter = !initialFilter || (initialFilter === 'partial' && o.fulfilmentStatus === 'Partially Fulfilled');
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
          <input className="form-input" placeholder="Search orders, customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Outstanding</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Dispatch Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(o => (
              <tr key={o.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{o.orderNumber}</td>
                <td style={{ fontSize: '12px' }}>{o.customerName}</td>
                <td style={{ fontSize: '11px' }}>{format(new Date(o.orderDate), 'dd MMM')}</td>
                <td style={{ fontSize: '11px' }}>{o.totalItems}</td>
                <td style={{ fontWeight: 600 }}>
                  {o.lines.reduce((acc, l) => acc + l.outstandingQty, 0)}
                </td>
                <td style={{ fontSize: '11px', fontWeight: 600 }}>{o.priority}</td>
                <td>
                  <span className={`status-badge ${o.fulfilmentStatus === 'Fulfilled' ? 'badge-green' : 'badge-blue'}`}>
                    {o.fulfilmentStatus}
                  </span>
                </td>
                <td style={{ fontSize: '11px' }}>{format(new Date(o.requiredDispatchDate), 'dd MMM')}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Order ${o.orderNumber}...`)}>
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
    </div>
  );
}
