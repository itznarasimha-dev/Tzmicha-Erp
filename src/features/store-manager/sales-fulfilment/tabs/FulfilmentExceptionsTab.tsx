// ============================================================
// TAB 5 — FULFILMENT EXCEPTIONS
// ============================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import * as sfService from '../services/salesFulfilmentService';
import type { FulfilmentException } from '../types';

interface FulfilmentExceptionsTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function FulfilmentExceptionsTab({ warehouseId, isLoading }: FulfilmentExceptionsTabProps) {
  const [exceptions, setExceptions] = useState<FulfilmentException[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await sfService.fetchFulfilmentExceptions(warehouseId);
        setExceptions(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = exceptions.filter(e => {
    const q = search.toLowerCase();
    return !q || e.exceptionRef.toLowerCase().includes(q) || e.productId.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
  });

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search exceptions, orders, reasons..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Ref #</th>
              <th>Order #</th>
              <th>Product</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Reported By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{e.exceptionRef}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{e.orderId}</td>
                <td style={{ fontSize: '12px' }}>{e.sku}</td>
                <td style={{ fontSize: '11px' }}>{e.type}</td>
                <td style={{ fontSize: '11px', fontWeight: 600, color: e.severity === 'High' ? '#ef4444' : 'var(--clr-text-primary)' }}>{e.severity}</td>
                <td>
                  <span className={`status-badge ${e.status === 'Resolved' ? 'badge-green' : 'badge-blue'}`}>
                    {e.status}
                  </span>
                </td>
                <td style={{ fontSize: '11px' }}>{e.reportedBy}</td>
                <td style={{ fontSize: '11px' }}>{format(new Date(e.createdAt), 'dd MMM')}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Exception Detail ${e.exceptionRef}...`)}>
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
