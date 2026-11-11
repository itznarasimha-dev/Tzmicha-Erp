// ============================================================
// TAB 2 — PICKING & PACKING
// ============================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import * as sfService from '../services/salesFulfilmentService';
import type { PickList } from '../types';

interface PickingPackingTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function PickingPackingTab({ warehouseId, isLoading }: PickingPackingTabProps) {
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await sfService.fetchPickLists(warehouseId);
        setPickLists(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = pickLists.filter(p => {
    const q = search.toLowerCase();
    return !q || p.pickListNumber.toLowerCase().includes(q) || p.orderNumber.toLowerCase().includes(q);
  });

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search pick lists..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Pick List #</th>
              <th>Order #</th>
              <th>Warehouse</th>
              <th>Lines</th>
              <th>Status</th>
              <th>Picker</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{p.pickListNumber}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{p.orderNumber}</td>
                <td style={{ fontSize: '11px' }}>{p.warehouseId}</td>
                <td style={{ fontSize: '11px' }}>{p.lines.length}</td>
                <td>
                  <span className={`status-badge ${p.status === 'Picked' ? 'badge-green' : 'badge-blue'}`}>
                    {p.status}
                  </span>
                </td>
                <td style={{ fontSize: '11px' }}>{p.assignedPicker}</td>
                <td style={{ fontSize: '11px' }}>{format(new Date(p.createdAt), 'dd MMM')}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Picking Interface for ${p.pickListNumber}...`)}>
                    Start Picking
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
