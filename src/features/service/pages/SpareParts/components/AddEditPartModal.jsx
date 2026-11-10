import React, { useState, useEffect } from 'react';
import { X, Package, Save, AlertCircle, Info } from 'lucide-react';
import { DEMO_PRODUCTS } from '../../../data/initialServiceData';
import { useRole } from '../../../context/RoleContext';

export default function AddEditPartModal({ isOpen, onClose, part, onSave }) {
  const { roleId, currentRole } = useRole();
  const isEditing = Boolean(part);
  const isManager = roleId === 'manager';

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Seals & Gaskets');
  const [compatibleProductId, setCompatibleProductId] = useState('PRD-M-101');
  const [uom, setUom] = useState('Pieces');
  const [availableQty, setAvailableQty] = useState('');
  const [minThreshold, setMinThreshold] = useState('10');
  const [unitPrice, setUnitPrice] = useState('');
  const [location, setLocation] = useState('Central Pune Store (Bin A-01)');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (part) {
      setName(part.name || '');
      setCategory(part.category || 'Seals & Gaskets');
      setCompatibleProductId(part.compatibleProductId || 'PRD-M-101');
      setUom(part.uom || 'Pieces');
      setAvailableQty(part.availableQty !== undefined ? String(part.availableQty) : '');
      setMinThreshold(part.minThreshold !== undefined ? String(part.minThreshold) : '10');
      setUnitPrice(part.unitPrice !== undefined ? String(part.unitPrice) : '');
      setLocation(part.location || 'Central Pune Store (Bin A-01)');
      setDescription(part.description || '');
      setRemarks(part.remarks || '');
    } else {
      setName('');
      setCategory('Seals & Gaskets');
      setCompatibleProductId('PRD-M-101');
      setUom('Pieces');
      setAvailableQty(isManager ? '20' : '0');
      setMinThreshold('10');
      setUnitPrice('1200');
      setLocation('Central Pune Store (Bin A-01)');
      setDescription('');
      setRemarks('');
    }
  }, [part, isOpen, isManager]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a valid part name.');
      return;
    }

    const matchedProduct = DEMO_PRODUCTS.find((p) => p.id === compatibleProductId) || DEMO_PRODUCTS[0];

    const proposalStatus = isManager
      ? 'Approved'
      : roleId === 'coordinator'
      ? 'Pending Store Manager Approval'
      : 'Pending Manager Approval';

    const payload = {
      name,
      category,
      compatibleProductId,
      compatibleProductName: matchedProduct.name,
      uom,
      availableQty: isManager ? Number(availableQty) || 0 : 0,
      minThreshold: Number(minThreshold) || 5,
      unitPrice: Number(unitPrice) || 0,
      location,
      description,
      remarks,
      proposalStatus,
      proposedBy: `${currentRole.profile.name} (${currentRole.label})`
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '740px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Package size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {isEditing
                  ? `Edit Spare Part — ${part.id}`
                  : isManager
                  ? 'Add New Spare Part SKU'
                  : 'Propose New Spare Part for Inventory'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                {isManager
                  ? 'Add approved stock item or submit for Store Manager allocation'
                  : `Submit new spare part proposal subject to ${roleId === 'coordinator' ? 'Store Manager' : 'Service Manager'} approval`}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isManager && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#1e40af'
                }}
              >
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Approval Workflow Notice:</strong> As a {currentRole.label}, proposing this part will submit it with status <strong>Pending {roleId === 'coordinator' ? 'Store Manager' : 'Manager'} Approval</strong>. Stock quantities will be allocated upon Store Manager verification.
                </span>
              </div>
            )}

            {error && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#b91c1c', fontSize: '12px' }}>
                {error}
              </div>
            )}

            {/* Part Name */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                Part Name & Specification *
              </label>
              <input
                type="text"
                className="form-control"
                style={{ height: '36px', fontSize: '13px' }}
                placeholder="e.g. High-Pressure Dual Viton Seal Ring (25mm)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Category & Compatible Equipment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Part Category *
                </label>
                <select
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="Seals & Gaskets">Seals & Gaskets</option>
                  <option value="Valves & Cartridges">Valves & Cartridges</option>
                  <option value="Electrical Components">Electrical Components</option>
                  <option value="Bearings">Bearings & Bushings</option>
                  <option value="Hydraulic Hardware">Hydraulic Hardware</option>
                  <option value="Filters & Consumables">Filters & Consumables</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Compatible Equipment / Machine *
                </label>
                <select
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={compatibleProductId}
                  onChange={(e) => setCompatibleProductId(e.target.value)}
                  required
                >
                  {DEMO_PRODUCTS.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* UOM, Unit Price, Min Threshold */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Unit of Measurement (UOM)
                </label>
                <select
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={uom}
                  onChange={(e) => setUom(e.target.value)}
                >
                  <option value="Pieces">Pieces (pcs)</option>
                  <option value="Sets">Sets (set)</option>
                  <option value="Kits">Kits (kit)</option>
                  <option value="Meters">Meters (m)</option>
                  <option value="Liters">Liters (L)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Unit Standard Price (INR ₹)
                </label>
                <input
                  type="number"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="e.g. 1450"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Minimum Stock Threshold
                </label>
                <input
                  type="number"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  placeholder="e.g. 5"
                  required
                />
              </div>
            </div>

            {/* Warehouse & Initial Quantity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Primary Warehouse & Bin Location *
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Central Pune Store (Bin A-08)"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Initial Stock Quantity {isManager ? '*' : '(Authorized on Approval)'}
                </label>
                <input
                  type="number"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px', backgroundColor: isManager ? '#fff' : '#f8fafc' }}
                  value={availableQty}
                  onChange={(e) => setAvailableQty(e.target.value)}
                  disabled={!isManager}
                  placeholder={isManager ? 'e.g. 25' : 'Set by Store Manager'}
                />
              </div>
            </div>

            {/* Description & Remarks */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                Technical Description & Material Specs
              </label>
              <textarea
                className="form-control"
                rows={2}
                style={{ fontSize: '13px' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High temperature rating, chemical compatibility, OEM manufacturer part number..."
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Operational Remarks / Supplier Notes</label>
              <input
                type="text"
                className="form-control"
                style={{ height: '36px', fontSize: '13px' }}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Lead time notes, authorized alternate vendors..."
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#f8fafc'
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '13px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ fontSize: '13px' }}>
              {isEditing ? 'Save Changes' : isManager ? 'Add Spare Part' : 'Submit Part Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
