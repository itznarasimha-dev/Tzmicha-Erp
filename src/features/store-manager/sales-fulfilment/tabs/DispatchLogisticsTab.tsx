// ============================================================
// TAB 3 — DISPATCH & LOGISTICS HANDOVER
// ============================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import * as sfService from '../services/salesFulfilmentService';
import type { DispatchRecord } from '../types';

interface DispatchLogisticsTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function DispatchLogisticsTab({ warehouseId, isLoading }: DispatchLogisticsTabProps) {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await sfService.fetchDispatches(warehouseId);
        setDispatches(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = dispatches.filter(d => {
    const q = search.toLowerCase();
    return !q || d.dispatchNumber.toLowerCase().includes(q) || d.orderId.toLowerCase().includes(q) || d.trackingNumber.toLowerCase().includes(q);
  });

  async function handleConfirmDispatch(id: string) {
    setIsSubmitting(true);
    try {
      const res = await sfService.postDispatch(id);
      if (res.success) {
        alert('Dispatch confirmed and handed over to logistics');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search dispatch, tracking, order..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Dispatch #</th>
              <th>Order #</th>
              <th>Date</th>
              <th>Carrier</th>
              <th>Tracking #</th>
              <th>Status</th>
              <th>Packages</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{d.dispatchNumber}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{d.orderId}</td>
                <td style={{ fontSize: '11px' }}>{format(new Date(d.dispatchDate), 'dd MMM HH:mm')}</td>
                <td style={{ fontSize: '11px' }}>{d.carrier}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{d.trackingNumber}</td>
                <td>
                  <span className={`status-badge ${d.status === 'Delivered' ? 'badge-green' : 'badge-blue'}`}>
                    {d.status}
                  </span>
                </td>
                <td style={{ fontSize: '11px' }}>{d.packages}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleConfirmDispatch(d.id)}>
                    Confirm Dispatch
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
