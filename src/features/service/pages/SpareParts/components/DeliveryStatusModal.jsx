import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { Truck, MapPin, Calendar, Check, AlertCircle } from 'lucide-react';

const DELIVERY_STATUSES = [
  'Preparing for Dispatch',
  'Dispatched',
  'In Transit',
  'Delivered',
  'Partially Delivered',
  'Delivery Issue'
];

export default function DeliveryStatusModal({ isOpen, onClose, request, onSave }) {
  const req = request || {};

  const [deliveryStatus, setDeliveryStatus] = useState(
    req.deliveryStatus || 'Preparing for Dispatch'
  );
  const [dispatchedQty, setDispatchedQty] = useState(
    req.dispatchedQty > 0 ? req.dispatchedQty : req.approvedQty || req.requestedQty || 1
  );
  const [deliveryDate, setDeliveryDate] = useState(
    req.deliveryDate || new Date().toISOString().slice(0, 10)
  );
  const [remarks, setRemarks] = useState(req.deliveryRemarks || '');
  const [error, setError] = useState('');

  if (!request) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dispatchedQty || Number(dispatchedQty) <= 0) {
      setError('Please provide a valid dispatched quantity.');
      return;
    }

    onSave(request.id, {
      deliveryStatus,
      dispatchedQty: Number(dispatchedQty),
      deliveryDate,
      remarks: remarks.trim()
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Store Delivery Tracking"
      subtitle={`Direct Customer Delivery Logistics for Requisition ${request.id}`}
      size="medium"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            <Check size={15} />
            <span>Update Delivery Tracking</span>
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

        {/* Customer & Address Details */}
        <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <MapPin size={16} className="text-primary" />
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
              Destination / Customer Site
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
            {request.customerName}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            {request.deliveryAddress || 'Customer Plant Location, Industrial Area'}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
            <strong>Item:</strong> {request.partName} ({request.partCode || request.partId})
          </div>
        </div>

        {/* Status & Quantity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Delivery Status *
            </label>
            <select
              value={deliveryStatus}
              onChange={(e) => setDeliveryStatus(e.target.value)}
              className="form-control form-select"
              style={{ fontSize: '13px', fontWeight: 600 }}
            >
              {DELIVERY_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Dispatched Qty *
            </label>
            <input
              type="number"
              min="1"
              value={dispatchedQty}
              onChange={(e) => setDispatchedQty(e.target.value)}
              className="form-control"
              style={{ fontSize: '13px', fontWeight: 600 }}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Dispatch / Expected Delivery Date *
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="form-control"
              style={{ fontSize: '13px' }}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Tracking / Courier / Vehicle Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Courier: BlueDart Waybill #984321, Dispatched via company vehicle KA-04-E-1234..."
              className="form-control"
              style={{ fontSize: '13px' }}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
