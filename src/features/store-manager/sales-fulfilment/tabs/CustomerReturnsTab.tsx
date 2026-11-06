// ============================================================
// TAB 4 — CUSTOMER RETURNS
// ============================================================

import { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import * as sfService from '../services/salesFulfilmentService';
import type { CustomerReturn } from '../types';

interface CustomerReturnsTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function CustomerReturnsTab({ warehouseId, isLoading }: CustomerReturnsTabProps) {
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await sfService.fetchCustomerReturns(warehouseId);
        setReturns(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = returns.filter(r => {
    const q = search.toLowerCase();
    return !q || r.returnReference.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q);
  });

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search returns, customers..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
        <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => alert('Opening Return Receipt Form...')}>
          <RotateCcw size={14} style={{ marginRight: '4px' }} /> Record Return
        </button>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Return #</th>
              <th>Customer</th>
              <th>Order #</th>
              <th>Date Received</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.returnReference}</td>
                <td style={{ fontSize: '12px' }}>{r.customerName}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.orderId}</td>
                <td style={{ fontSize: '11px' }}>{format(new Date(r.receivedDate), 'dd MMM')}</td>
                <td style={{ fontSize: '11px' }}>{r.reason}</td>
                <td>
                  <span className={`status-badge ${r.status === 'Closed' ? 'badge-green' : 'badge-blue'}`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Return Detail ${r.returnReference}...`)}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
