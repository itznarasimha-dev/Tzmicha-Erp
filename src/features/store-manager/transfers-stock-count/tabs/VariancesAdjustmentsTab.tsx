// ============================================================
// TAB 4 — VARIANCES & ADJUSTMENTS
// ============================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import * as tscService from '../services/transfersStockCountService';
import type { StockVariance } from '../types';

interface VariancesAdjustmentsTabProps {
  warehouseId: string;
  isLoading: boolean;
  initialFilter?: string;
}

export function VariancesAdjustmentsTab({ warehouseId, isLoading, initialFilter }: VariancesAdjustmentsTabProps) {
  const [variances, setVariances] = useState<StockVariance[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await tscService.fetchVariances(warehouseId);
        setVariances(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = variances.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.productName.toLowerCase().includes(q) || v.varianceNumber.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q);
    const matchFilter = !initialFilter || (initialFilter === 'adjustment' && v.status === 'Approved');
    return matchSearch && matchFilter;
  });

  async function handlePostAdjustment(varianceId: string) {
    const reason = prompt('Enter adjustment reason:');
    if (!reason) return;
    setIsSubmitting(true);
    try {
      const res = await tscService.postAdjustment(varianceId, 0, reason);
      if (res.success) {
        alert(`Stock Adjustment Posted: ${res.adjId}`);
        // Refresh
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
          <input className="form-input" placeholder="Search variances, SKU, reason..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Variance #</th>
              <th>Product</th>
              <th>Location</th>
              <th>System Qty</th>
              <th>Count Qty</th>
              <th>Variance</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{v.varianceNumber}</td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: '12px' }}>{v.productName}</div>
                  <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)' }}>{v.sku}</div>
                </td>
                <td style={{ fontSize: '11px' }}>{v.locationId}</td>
                <td>{v.systemQty} {v.uom}</td>
                <td style={{ fontWeight: 600 }}>{v.finalCountQty} {v.uom}</td>
                <td style={{ fontWeight: 700, color: v.varianceQty < 0 ? '#ef4444' : '#10b981' }}>
                  {v.varianceQty > 0 ? `+${v.varianceQty}` : v.varianceQty} {v.uom}
                </td>
                <td style={{ fontSize: '11px' }}>{v.type}</td>
                <td>
                  <span className={`status-badge ${v.status === 'Posted' ? 'badge-green' : 'badge-blue'}`}>
                    {v.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handlePostAdjustment(v.id)}>
                    Post Adj
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
