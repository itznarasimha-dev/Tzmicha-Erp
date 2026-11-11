// ============================================================
// TAB 3 — FINISHED GOODS STOCK
// ============================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import * as fgService from '../services/finishedGoodsQualityService';
import type { FinishedGoodsStock } from '../types';

interface FinishedGoodsStockTabProps {
  warehouseId: string;
  category: string;
  isLoading: boolean;
}

export function FinishedGoodsStockTab({ warehouseId, category, isLoading }: FinishedGoodsStockTabProps) {
  const [stock, setStock] = useState<FinishedGoodsStock[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await fgService.fetchFGStock(warehouseId, category);
        setStock(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId, category]);

  const filtered = stock.filter(s => {
    const q = search.toLowerCase();
    return !q || s.productName.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q) || s.batchNumber.toLowerCase().includes(q);
  });

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search FG stock, SKU, batch..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Source</th>
              <th>Bin</th>
              <th>Batch</th>
              <th>On Hand</th>
              <th>Available</th>
              <th>QC Status</th>
              <th>Condition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 500, fontSize: '12px' }}>{s.productName}</div>
                  <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)' }}>{s.sku}</div>
                </td>
                <td style={{ fontSize: '11px' }}>{s.category}</td>
                <td style={{ fontSize: '11px' }}>{s.source}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{s.binLocation}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{s.batchNumber}</td>
                <td style={{ fontWeight: 600 }}>{s.onHandQty} {s.uom}</td>
                <td style={{ fontWeight: 700, color: '#10b981' }}>{s.availableQty} {s.uom}</td>
                <td>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: s.qcStatus === 'Approved' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: s.qcStatus === 'Approved' ? '#10b981' : '#f59e0b' }}>
                    {s.qcStatus}
                  </span>
                </td>
                <td style={{ fontSize: '11px' }}>{s.condition}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Traceability for ${s.sku}...`)}>
                    Trace
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
