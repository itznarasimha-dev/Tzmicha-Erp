import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { useRole } from '../../../context/RoleContext';
import { useSchedule } from '../../../context/ScheduleContext';
import { Package, Check, AlertCircle, Wrench } from 'lucide-react';

export default function DirectStockUsageModal({ isOpen, onClose, onSave }) {
  const { currentRole } = useRole();
  const { spareParts, serviceRequests } = useSchedule();

  const [selectedSRId, setSelectedSRId] = useState(serviceRequests[0]?.id || '');
  const [selectedPartId, setSelectedPartId] = useState(spareParts[0]?.id || '');
  const [quantityTaken, setQuantityTaken] = useState(1);
  const [quantityUsed, setQuantityUsed] = useState(1);
  const [quantityReturned, setQuantityReturned] = useState(0);
  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const targetSR = serviceRequests.find((sr) => sr.id === selectedSRId) || serviceRequests[0];
  const targetPart = spareParts.find((p) => p.id === selectedPartId) || spareParts[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    const taken = Number(quantityTaken);
    const used = Number(quantityUsed);
    const ret = Number(quantityReturned || 0);

    if (used <= 0) {
      setError('Used quantity must be at least 1.');
      return;
    }
    if (taken < used + ret) {
      setError('Quantity taken cannot be less than quantity used + returned.');
      return;
    }
    if (targetPart && used > targetPart.availableQty) {
      setError(`Cannot use ${used} units. Available stock is only ${targetPart.availableQty}.`);
      return;
    }

    onSave({
      serviceRequestId: targetSR?.id || 'SR-2026-001',
      customerId: targetSR?.customerId || 'CUS-000001',
      customerName: targetSR?.customerName || 'Customer',
      partId: targetPart?.id,
      partCode: targetPart?.code || targetPart?.id,
      partName: targetPart?.name,
      specification: targetPart?.specification || '',
      quantityTaken: taken,
      quantityUsed: used,
      quantityReturned: ret,
      usageDate,
      remarks: remarks.trim(),
      performedBy: currentRole?.name || 'Service Engineer'
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Direct Stock Usage"
      subtitle="Log direct inventory consumption on an active service job without advance requisition"
      size="medium"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            <Check size={15} />
            <span>Confirm & Deduct Stock</span>
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

        {/* Target Service Request */}
        <div>
          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
            Service Ticket / Customer Job *
          </label>
          <select
            value={selectedSRId}
            onChange={(e) => setSelectedSRId(e.target.value)}
            className="form-control form-select"
            style={{ fontSize: '13px' }}
          >
            {serviceRequests.map((sr) => (
              <option key={sr.id} value={sr.id}>
                {sr.id} - {sr.customerName} ({sr.serviceCategory})
              </option>
            ))}
          </select>
        </div>

        {/* Inventory Item Selection */}
        <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '10px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Select Inventory Component *
            </label>
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className="form-control form-select"
              style={{ fontSize: '13px' }}
            >
              {spareParts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.id}] - Stock: {p.availableQty} {p.uom || 'units'}
                </option>
              ))}
            </select>
          </div>

          {targetPart && (
            <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <div><strong>Specification:</strong> {targetPart.specification || targetPart.name}</div>
              <div style={{ marginTop: '2px' }}><strong>Location:</strong> {targetPart.location} | <strong>Current Available:</strong> <span style={{ fontWeight: 700, color: '#16a34a' }}>{targetPart.availableQty} units</span></div>
            </div>
          )}
        </div>

        {/* Quantities */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Qty Taken *
            </label>
            <input
              type="number"
              min="1"
              value={quantityTaken}
              onChange={(e) => {
                const val = Number(e.target.value);
                setQuantityTaken(val);
                if (val < quantityUsed) setQuantityUsed(val);
              }}
              className="form-control"
              style={{ fontSize: '14px', fontWeight: 600 }}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>
              Qty Consumed *
            </label>
            <input
              type="number"
              min="1"
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(Number(e.target.value))}
              className="form-control"
              style={{ fontSize: '14px', fontWeight: 700, color: '#166534', borderColor: '#86efac' }}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>
              Qty Returned
            </label>
            <input
              type="number"
              min="0"
              value={quantityReturned}
              onChange={(e) => setQuantityReturned(Number(e.target.value))}
              className="form-control"
              style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', borderColor: '#93c5fd' }}
            />
          </div>
        </div>

        {/* Usage Date & Remarks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Date of Usage *
            </label>
            <input
              type="date"
              value={usageDate}
              onChange={(e) => setUsageDate(e.target.value)}
              className="form-control"
              style={{ fontSize: '13px' }}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Usage Notes / Fault Detail
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Emergency seal replacement done directly on customer breakdown visit..."
              className="form-control"
              style={{ fontSize: '13px' }}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
