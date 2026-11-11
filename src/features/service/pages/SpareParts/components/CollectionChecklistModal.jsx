import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { PackageCheck, CheckCircle2, User, MapPin, AlertCircle, FileText } from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

export default function CollectionChecklistModal({ isOpen, onClose, request, onConfirm }) {
  const req = request || {};

  const [collectedQty, setCollectedQty] = useState(
    req.approvedQty || req.requestedQty || 1
  );
  const [remarks, setRemarks] = useState(req.collectionRemarks || '');
  const [error, setError] = useState('');

  if (!request) return null;

  const handleConfirm = () => {
    if (!collectedQty || Number(collectedQty) <= 0) {
      setError('Please enter a valid collected quantity greater than 0.');
      return;
    }
    const maxQty = Number(request.approvedQty || request.requestedQty || 1);
    if (Number(collectedQty) > maxQty) {
      setError(`Collected quantity cannot exceed approved quantity of ${maxQty}.`);
      return;
    }

    onConfirm(request.id, {
      collectedQty: Number(collectedQty),
      remarks: remarks.trim()
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Store Collection Checklist"
      subtitle={`Verify physical item release for Service Request ${request.serviceRequestId}`}
      size="medium"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            <CheckCircle2 size={15} />
            <span>Confirm Collection & Issue</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {/* Requisition & Ticket Summary */}
        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                Material Requisition
              </span>
              <span style={{ fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                {request.id}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                Service Request
              </span>
              <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                {request.serviceRequestId}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                Customer
              </span>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                {request.customerName}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                Requested By / Engineer
              </span>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                {request.requestedBy}
              </span>
            </div>
          </div>
        </div>

        {/* Item Verification Card */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <PackageCheck size={18} className="text-primary" />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
              {request.partName}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
              {request.partCode || request.partId}
            </span>
          </div>

          {request.specification && (
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '12px', backgroundColor: '#f1f5f9', padding: '6px 10px', borderRadius: '4px' }}>
              <strong>Spec:</strong> {request.specification}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Requested</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                {request.requestedQty} {request.uom || 'Pcs'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Approved Qty</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>
                {request.approvedQty || request.requestedQty} {request.uom || 'Pcs'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Current Status</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                {request.collectionStatus || 'Ready for Pickup'}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Quantity Being Collected from Store *
            </label>
            <input
              type="number"
              min="1"
              max={request.approvedQty || request.requestedQty}
              value={collectedQty}
              onChange={(e) => setCollectedQty(e.target.value)}
              className="form-control"
              style={{ fontSize: '14px', fontWeight: 600 }}
              required
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Confirm physical units counted and handed over to engineer.
            </span>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Store Handover Remarks / Serial Number Logged
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Verified seals intact, serial numbers checked, handed to engineer on site..."
              className="form-control"
              style={{ fontSize: '13px' }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
