// ============================================================
// TAB 2 — QC STATUS & INSPECTION QUEUE
// ============================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import * as fgService from '../services/finishedGoodsQualityService';
import type { QCRecord, QCStatus } from '../types';

interface QCStatusQueueTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function QCStatusQueueTab({ warehouseId, isLoading }: QCStatusQueueTabProps) {
  const [queue, setQueue] = useState<QCRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await fgService.fetchQCQueue(warehouseId);
        setQueue(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = queue.filter(q => {
    const term = search.toLowerCase();
    return !term || q.qcReferenceId.toLowerCase().includes(term) || q.productName.toLowerCase().includes(term) || q.sku.toLowerCase().includes(term) || q.batchNumber.toLowerCase().includes(term);
  });

  const getStatusColor = (status: QCStatus) => {
    switch (status) {
      case 'Approved': return '#10b981';
      case 'Rejected': return '#ef4444';
      case 'Quality Hold': return '#f59e0b';
      case 'Awaiting Inspection': return '#3b82f6';
      default: return '#64748b';
    }
  };

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search QC reference, product, batch..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>QC Reference</th>
              <th>Source</th>
              <th>Product</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Inspector</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(q => (
              <tr key={q.id}>
                <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{q.qcReferenceId}</span></td>
                <td style={{ fontSize: '11px' }}>{q.sourceType}</td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: '12px' }}>{q.productName}</div>
                  <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)' }}>{q.sku}</div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{q.batchNumber}</td>
                <td>{q.quantityUnderInspection} {q.uom}</td>
                <td style={{ fontSize: '11px' }}>{q.inspector}</td>
                <td>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: `${getStatusColor(q.qcStatus)}20`, color: getStatusColor(q.qcStatus) }}>
                    {q.qcStatus}
                  </span>
                </td>
                <td style={{ fontSize: '11px' }}>{format(new Date(q.dueDate), 'dd MMM')}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening QC Record ${q.qcReferenceId}...`)}>
                    View Detail
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
