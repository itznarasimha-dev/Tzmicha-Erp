// ============================================================
// TAB 1 — PRODUCTION OUTPUT RECEIPTS
// ============================================================

import { Fragment, useState, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import * as fgService from '../services/finishedGoodsQualityService';
import type { ProductionOutputReceipt } from '../types';

interface ProductionOutputReceiptsTabProps {
  warehouseId: string;
  category: string;
  isLoading: boolean;
  initialFilter?: string;
}

export function ProductionOutputReceiptsTab({ warehouseId, category, isLoading, initialFilter }: ProductionOutputReceiptsTabProps) {
  const [receipts, setReceipts] = useState<ProductionOutputReceipt[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [receiptModal, setReceiptModal] = useState<{ open: boolean, record: ProductionOutputReceipt | null }>({ open: false, record: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptValues, setReceiptValues] = useState({ quantity: '', location: '', batch: '' });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await fgService.fetchProductionReceipts(warehouseId, category);
        setReceipts(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId, category]);

  const filtered = receipts.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.receiptNumber.toLowerCase().includes(q) || r.productionOrderId.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
    const matchFilter = !initialFilter || (initialFilter === 'partial' && r.receiptStatus === 'Partially Received') || (initialFilter === 'discrepancy' && r.receiptStatus === 'Discrepancy Reported');
    return matchSearch && matchFilter;
  });

  async function handlePostReceipt(record: ProductionOutputReceipt, qty: number, location: string, batch: string) {
    if (!Number.isFinite(qty) || qty <= 0 || qty > record.remainingReceiptQty) {
      setFormError(`Enter a quantity greater than zero and no more than ${record.remainingReceiptQty}.`);
      return;
    }
    if (!location.trim() || !batch.trim()) {
      setFormError('Enter a destination bin and batch/lot before confirming the receipt.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fgService.postPhysicalReceipt(record.id, qty, location, batch);
      if (res.success) {
        setReceipts(current => current.map(receipt => {
          if (receipt.id !== record.id) return receipt;
          const remainingReceiptQty = Math.max(0, receipt.remainingReceiptQty - qty);
          return {
            ...receipt,
            receivedQty: receipt.receivedQty + qty,
            previouslyReceivedQty: receipt.previouslyReceivedQty + qty,
            remainingReceiptQty,
            receiptStatus: remainingReceiptQty === 0 ? 'Fully Received' : 'Partially Received',
            updatedAt: new Date().toISOString(),
          };
        }));
        alert(`Demo receipt recorded. Transaction: ${res.transactionId}. This does not update shared inventory.`);
        setReceiptModal({ open: false, record: null });
      } else {
        setFormError('The receipt was not accepted.');
      }
    } catch (error) {
      console.error('Failed to record demo receipt:', error);
      setFormError('The receipt could not be recorded. Please try again.');
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
          <input className="form-input" placeholder="Search receipts, orders, products..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Prod Order</th>
              <th>Product</th>
              <th>Reported Qty</th>
              <th>Received Qty</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>QC Req.</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <Fragment key={r.id}>
                <tr>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.receiptNumber}</span></td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.productionOrderId}</span></td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '12px' }}>{r.productName}</div>
                    <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)' }}>{r.sku}</div>
                  </td>
                  <td>{r.reportedOutputQty} {r.uom}</td>
                  <td>{r.previouslyReceivedQty} {r.uom}</td>
                  <td style={{ fontWeight: 700 }}>{r.remainingReceiptQty} {r.uom}</td>
                  <td><span className={`status-badge ${r.receiptStatus === 'Pending' ? 'badge-blue' : 'badge-amber'}`}>{r.receiptStatus}</span></td>
                  <td>{r.qcRequired ? <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Yes</span> : 'No'}</td>
                  <td style={{ fontSize: '11px' }}>{format(new Date(r.dueDate), 'dd MMM')}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      disabled={r.remainingReceiptQty <= 0}
                      onClick={() => {
                        setReceiptValues({
                          quantity: String(r.remainingReceiptQty),
                          location: r.locationId ?? '',
                          batch: r.batchNumber ?? '',
                        });
                        setFormError(null);
                        setReceiptModal({ open: true, record: r });
                      }}
                    >
                      {r.remainingReceiptQty <= 0 ? 'Received' : 'Start Receipt'}
                    </button>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {receiptModal.open && receiptModal.record && (() => {
        const modalRecord = receiptModal.record;
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: '16px', width: '100%', maxWidth: '600px', padding: '24px', border: '1px solid var(--clr-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Confirm Physical Receipt</h3>
              <button className="btn-icon" onClick={() => setReceiptModal({ open: false, record: null })}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--clr-bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--clr-border)', fontSize: '13px' }}>
                <div style={{ marginBottom: '4px' }}><strong>Product:</strong> {modalRecord.productName} ({modalRecord.sku})</div>
                <div style={{ marginBottom: '4px' }}><strong>Prod Order:</strong> {modalRecord.productionOrderId}</div>
                <div style={{ marginBottom: '4px' }}><strong>Reported Output:</strong> {modalRecord.reportedOutputQty} {modalRecord.uom}</div>
                <div><strong>Remaining to Receive:</strong> {modalRecord.remainingReceiptQty} {modalRecord.uom}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Actual Quantity Received Now</label>
                <input
                  type="number"
                  min="1"
                  max={modalRecord.remainingReceiptQty}
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="Enter quantity..."
                  id="receipt-qty-input"
                  value={receiptValues.quantity}
                  onChange={event => setReceiptValues(values => ({ ...values, quantity: event.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Destination Bin</label>
                  <input
                    className="form-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. STG-01"
                    value={receiptValues.location}
                    onChange={event => setReceiptValues(values => ({ ...values, location: event.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Batch / Lot</label>
                  <input
                    className="form-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. B-2026-X"
                    value={receiptValues.batch}
                    onChange={event => setReceiptValues(values => ({ ...values, batch: event.target.value }))}
                  />
                </div>
              </div>
            </div>
            {formError && <div className="alert-banner error" role="alert" style={{ marginBottom: '12px' }}>{formError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setReceiptModal({ open: false, record: null })}>Cancel</button>
              <button className="btn btn-primary" disabled={isSubmitting} onClick={() => handlePostReceipt(modalRecord, Number(receiptValues.quantity), receiptValues.location, receiptValues.batch)}>
                {isSubmitting ? <><Loader2 size={14} className="refresh-spin" /> Posting...</> : 'Confirm Physical Receipt'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
