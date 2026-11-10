import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { Package, RotateCcw, Check, AlertCircle } from 'lucide-react';

export default function RecordConsumptionModal({ isOpen, onClose, request, onSave }) {
  const req = request || {};

  const initialCollectedOrApproved =
    req.collectedQty > 0
      ? req.collectedQty
      : req.dispatchedQty > 0
      ? req.dispatchedQty
      : req.approvedQty || req.requestedQty || 1;

  const [consumedQty, setConsumedQty] = useState(
    req.consumedQty !== undefined && req.consumedQty > 0
      ? req.consumedQty
      : initialCollectedOrApproved
  );
  const [returnedQty, setReturnedQty] = useState(
    req.returnedQty !== undefined ? req.returnedQty : 0
  );
  const [remarks, setRemarks] = useState(req.remarks || '');
  const [error, setError] = useState('');

  if (!request) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const c = Number(consumedQty || 0);
    const r = Number(returnedQty || 0);

    if (c < 0 || r < 0) {
      setError('Quantities cannot be negative.');
      return;
    }

    if (c + r > initialCollectedOrApproved) {
      setError(
        `Total of consumed (${c}) and returned (${r}) cannot exceed total issued quantity (${initialCollectedOrApproved}).`
      );
      return;
    }

    onSave(request.id, {
      consumedQty: c,
      returnedQty: r,
      remarks: remarks.trim()
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Material Consumption & Return"
      subtitle={`Log parts installed on customer site and return surplus to inventory for ${request.serviceRequestId}`}
      size="medium"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            <Check size={15} />
            <span>Save Consumption & Stock Update</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#b91c1c',
              fontSize: '13px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Item Summary */}
        <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Material Requisition
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                {request.partName}
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#2563eb' }}>
                {request.partCode || request.partId}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Issued Qty
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                {initialCollectedOrApproved} {request.uom || 'Pcs'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#475569' }}>
            <strong>Customer:</strong> {request.customerName} ({request.serviceRequestId})
          </div>
        </div>

        {/* Quantities Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '8px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={15} />
              <span>Quantity Consumed on Job *</span>
            </label>
            <input
              type="number"
              min="0"
              max={initialCollectedOrApproved}
              value={consumedQty}
              onChange={(e) => setConsumedQty(e.target.value)}
              className="form-control"
              style={{ fontSize: '16px', fontWeight: 700, color: '#166534', borderColor: '#86efac' }}
              required
            />
            <span style={{ fontSize: '11px', color: '#15803d', display: 'block', marginTop: '4px' }}>
              Fitted/installed in customer equipment.
            </span>
          </div>

          <div style={{ border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', padding: '14px', borderRadius: '8px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={15} />
              <span>Quantity Returned to Store *</span>
            </label>
            <input
              type="number"
              min="0"
              max={initialCollectedOrApproved}
              value={returnedQty}
              onChange={(e) => setReturnedQty(e.target.value)}
              className="form-control"
              style={{ fontSize: '16px', fontWeight: 700, color: '#1e40af', borderColor: '#93c5fd' }}
              required
            />
            <span style={{ fontSize: '11px', color: '#1d4ed8', display: 'block', marginTop: '4px' }}>
              Automatically added back to warehouse available stock.
            </span>
          </div>
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
            Consumption & Return Remarks
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. 1 unit installed into Main Drive, 1 spare unit safely returned to bin location..."
            className="form-control"
            style={{ fontSize: '13px' }}
          />
        </div>
      </form>
    </Modal>
  );
}
