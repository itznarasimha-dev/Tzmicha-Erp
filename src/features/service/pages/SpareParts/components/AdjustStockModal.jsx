import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import { formatINR } from '../../../utils/formatters';
import { PackagePlus, ArrowUpCircle } from 'lucide-react';

export default function AdjustStockModal({ isOpen, onClose, part, onSave }) {
  const [addQty, setAddQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (part) {
      setUnitPrice(part.unitPrice || '');
      setLocation(part.location || '');
      setAddQty('');
      setNotes('');
    }
  }, [part]);

  if (!isOpen || !part) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(part.id, {
      addQty: Number(addQty) || 0,
      unitPrice: Number(unitPrice),
      newBin: location
    });
    onClose();
  };

  const newProjectedQty = Math.max(0, part.availableQty + (Number(addQty) || 0));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Inward Stock & Adjustment — ${part.id}`}
      size="medium"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Item Details</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{part.name}</div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
            Current Available: <strong>{part.availableQty} units</strong> • Current Unit Price: <strong>{formatINR(part.unitPrice)}</strong>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="addQty">
            Quantity to Add (Receive from Vendor / Reorder):
          </label>
          <input
            id="addQty"
            type="number"
            min="1"
            className="form-control"
            placeholder="e.g. 25"
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            required
            autoFocus
          />
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
            New available stock will be: <strong>{newProjectedQty} units</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="unitPrice">Unit Price (₹):</label>
            <input
              id="unitPrice"
              type="number"
              min="0"
              className="form-control"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="location">Bin / Storage Location:</label>
            <input
              id="location"
              type="text"
              className="form-control"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="notes">Inward Receipt / Purchase Order Reference:</label>
          <input
            id="notes"
            type="text"
            className="form-control"
            placeholder="e.g. PO-2026-881 / Vendor Inward Challan #4412"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm btn-icon-text">
            <ArrowUpCircle size={15} />
            <span>Confirm Stock Inward</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
