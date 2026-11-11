import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { useRole } from '../../../context/RoleContext';
import { useSchedule } from '../../../context/ScheduleContext';
import { Sparkles, FileText, Package, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  'Mechanical',
  'Electrical',
  'Hydraulics & Pneumatics',
  'Electronics & Controls',
  'Filtration & Consumables',
  'Sensors & Instrumentation',
  'Fasteners & Hardware'
];

const UOM_OPTIONS = ['Pcs', 'Sets', 'Meters', 'Liters', 'Kg', 'Rolls', 'Units', 'Boxes'];

export default function ProposeNewItemModal({ isOpen, onClose, onPropose }) {
  const { currentRole, roleId } = useRole();
  const { products } = useSchedule();

  const [formData, setFormData] = useState({
    partCode: '',
    partName: '',
    category: 'Mechanical',
    specification: '',
    compatibleProductId: products[0]?.id || 'PRD-M-101',
    compatibleProductName: products[0]?.name || 'Ultra-High Precision CNC Milling Machine 5-Axis',
    uom: 'Pcs',
    minThreshold: 5,
    unitPrice: '',
    reason: '',
    remarks: ''
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'compatibleProductId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          updated.compatibleProductName = prod.name;
        }
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.partName.trim()) {
      setError('Part name is required.');
      return;
    }
    if (!formData.specification.trim()) {
      setError('Technical specification is required.');
      return;
    }
    if (!formData.unitPrice || Number(formData.unitPrice) <= 0) {
      setError('Please provide a valid estimated unit price.');
      return;
    }
    if (!formData.reason.trim()) {
      setError('Please specify the operational reason for proposing this new item.');
      return;
    }

    onPropose({
      ...formData,
      partCode: formData.partCode.trim() || `SP-${Math.floor(100 + Math.random() * 900)}`,
      minThreshold: Number(formData.minThreshold) || 5,
      unitPrice: Number(formData.unitPrice),
      proposedBy: currentRole?.name || 'Service Engineer'
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Propose New Inventory Item"
      subtitle="Submit a new spare part or consumable item for Manager & Store Manager multi-tier review"
      size="large"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <Sparkles size={14} className="text-primary" />
            <span>Multi-tier review: Manager Approval &rarr; Store Approval &rarr; Inventory Addition</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Submit Proposal
            </button>
          </div>
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

        {/* Section 1: Classification & Identification */}
        <div className="section-panel" style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={15} className="text-primary" />
            <span>1. Part Classification & Details</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Part Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-control form-select"
                style={{ fontSize: '13px' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Part Name *
              </label>
              <input
                type="text"
                name="partName"
                value={formData.partName}
                onChange={handleChange}
                placeholder="e.g. High-Pressure Hydraulic Flange Seal"
                className="form-control"
                style={{ fontSize: '13px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Proposed Part Code / SKU
              </label>
              <input
                type="text"
                name="partCode"
                value={formData.partCode}
                onChange={handleChange}
                placeholder="e.g. SP-409 (auto-generated if empty)"
                className="form-control"
                style={{ fontSize: '13px', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Unit of Measure (UOM) *
              </label>
              <select
                name="uom"
                value={formData.uom}
                onChange={handleChange}
                className="form-control form-select"
                style={{ fontSize: '13px' }}
              >
                {UOM_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Estimated Unit Price (₹) *
              </label>
              <input
                type="number"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleChange}
                placeholder="₹ 1500"
                min="0"
                step="50"
                className="form-control"
                style={{ fontSize: '13px' }}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Technical Specification *
            </label>
            <input
              type="text"
              name="specification"
              value={formData.specification}
              onChange={handleChange}
              placeholder="e.g. 45mm ID x 62mm OD Viton 75 Durometer, 250 Bar rated"
              className="form-control"
              style={{ fontSize: '13px' }}
              required
            />
          </div>
        </div>

        {/* Section 2: Compatibility & Stock Planning */}
        <div className="section-panel" style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} className="text-primary" />
            <span>2. Compatible Equipment & Reorder Planning</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Compatible Product / Equipment *
              </label>
              <select
                name="compatibleProductId"
                value={formData.compatibleProductId}
                onChange={handleChange}
                className="form-control form-select"
                style={{ fontSize: '13px' }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Recommended Min Stock
              </label>
              <input
                type="number"
                name="minThreshold"
                value={formData.minThreshold}
                onChange={handleChange}
                min="1"
                className="form-control"
                style={{ fontSize: '13px' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Business Justification & Remarks */}
        <div className="section-panel" style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
            3. Business Justification & Proposer Information
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Reason for Adding to Inventory Catalog *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={2}
              placeholder="Explain why this component should be added (e.g. repeated failure in customer CNC units, critical replacement part)..."
              className="form-control"
              style={{ fontSize: '13px' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Proposed By
              </label>
              <input
                type="text"
                value={currentRole?.name || 'Service Engineer'}
                disabled
                className="form-control"
                style={{ fontSize: '13px', backgroundColor: '#e2e8f0', color: '#475569' }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Additional Remarks
              </label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Optional supplier or lead time notes"
                className="form-control"
                style={{ fontSize: '13px' }}
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
