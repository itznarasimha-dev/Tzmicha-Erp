// ============================================================
// TAB 2 — IN-TRANSIT & RECEIVING
// ============================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import * as tscService from '../services/transfersStockCountService';
import type { InTransitShipment } from '../types';

interface InTransitReceivingTabProps {
  warehouseId: string;
  isLoading: boolean;
  initialFilter?: string;
}

export function InTransitReceivingTab({ warehouseId, isLoading, initialFilter }: InTransitReceivingTabProps) {
  const [shipments, setShipments] = useState<InTransitShipment[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await tscService.fetchInTransitShipments(warehouseId);
        setShipments(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = shipments.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.transferNumber.toLowerCase().includes(q) || s.destinationWarehouseName?.toLowerCase().includes(q);
    const matchFilter = !initialFilter || (initialFilter === 'partial' && s.status === 'Partially Received') || (initialFilter === 'exception' && s.exceptionFlag);
    return matchSearch && matchFilter;
  });

  async function handleConfirmReceipt(shipmentId: string) {
    const qty = prompt('Enter received quantity:');
    if (!qty) return;
    setIsSubmitting(true);
    try {
      const res = await tscService.postReceipt(shipmentId, parseFloat(qty));
      if (res.success) {
        alert('Receipt recorded successfully');
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
          <input className="form-input" placeholder="Search in-transit shipments..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Transfer #</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Dispatched Qty</th>
              <th>Received Qty</th>
              <th>Outstanding</th>
              <th>Dispatch Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{s.transferNumber}</td>
                <td style={{ fontSize: '11px' }}>{s.sourceWarehouseId}</td>
                <td style={{ fontSize: '11px' }}>{s.destinationWarehouseId}</td>
                <td>{s.totalDispatchedQty}</td>
                <td>{s.totalReceivedQty}</td>
                <td style={{ fontWeight: 700, color: '#ef4444' }}>{s.outstandingQty}</td>
                <td style={{ fontSize: '11px' }}>{format(new Date(s.dispatchDate), 'dd MMM HH:mm')}</td>
                <td>
                  <span className={`status-badge ${s.status === 'Fully Received' ? 'badge-green' : 'badge-blue'}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleConfirmReceipt(s.id)}>
                    Confirm Receipt
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
