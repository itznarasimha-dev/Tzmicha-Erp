// ============================================================
// TAB 4 — DAMAGED & HELD GOODS
// ============================================================

import { useState, useEffect } from 'react';
import { Search, AlertTriangle, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import * as fgService from '../services/finishedGoodsQualityService';
import type { StockException } from '../types';

interface DamagedHeldGoodsTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function DamagedHeldGoodsTab({ warehouseId, isLoading }: DamagedHeldGoodsTabProps) {
  const [exceptions, setExceptions] = useState<StockException[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await fgService.fetchStockExceptions(warehouseId);
        setExceptions(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = exceptions.filter(e => {
    const q = search.toLowerCase();
    return !q || e.productName.toLowerCase().includes(q) || e.exceptionNumber.toLowerCase().includes(q) || e.exceptionType.toLowerCase().includes(q);
  });

  async function handleReportException() {
    setIsSubmitting(true);
    try {
      const res = await fgService.createStockException({
        exceptionType: 'Physical Damage',
        reason: 'Reported damage during stock check',
        productId: 'prod-101',
      });
      if (res.success) {
        alert(`Exception Reported: ${res.exceptionNumber}`);
        setShowReportModal(false);
        // Refresh data
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
          <input className="form-input" placeholder="Search exceptions, product, reason..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
        <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => setShowReportModal(true)}>
          <AlertTriangle size={14} style={{ marginRight: '4px' }} /> Report Exception
        </button>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Ref #</th>
              <th>Product</th>
              <th>Warehouse/Bin</th>
              <th>Qty</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Dept</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{e.exceptionNumber}</span></td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: '12px' }}>{e.productName}</div>
                  <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)' }}>{e.sku}</div>
                </td>
                <td style={{ fontSize: '11px' }}>{e.warehouseName} / {e.locationName}</td>
                <td style={{ fontWeight: 600 }}>{e.quantity} {e.uom}</td>
                <td style={{ fontSize: '11px' }}>{e.exceptionType}</td>
                <td style={{ fontSize: '11px', color: 'var(--clr-text-secondary)' }}>{e.reason}</td>
                <td>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                    {e.status}
                  </span>
                </td>
                <td style={{ fontSize: '11px' }}>{e.responsibleDepartment}</td>
                <td style={{ fontSize: '11px' }}>{format(new Date(e.dueDate), 'dd MMM')}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Exception ${e.exceptionNumber}...`)}>
                    View Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', border: '1px solid var(--clr-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Report Stock Exception</h3>
              <button className="btn-icon" onClick={() => setShowReportModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Product</label>
                <input className="form-input" style={{ width: '100%' }} placeholder="Search product..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted', marginBottom: '4px' }}>Exception Type</label>
                <select className="form-select" style={{ width: '100%' }}>
                  <option>Physical Damage</option>
                  <option>Packaging Damage</option>
                  <option>Quality Rejection</option>
                  <option>QC Hold</option>
                  <option>Expired</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Reason / Description</label>
                <textarea className="form-input" rows={3} style={{ width: '100%' }} placeholder="Describe the issue..."></textarea>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setShowReportModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={isSubmitting} onClick={handleReportException}>
                {isSubmitting ? <><Loader2 size={14} className="refresh-spin" /> Posting...</> : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
