import React, { useState } from 'react';
import { X, ShieldCheck, Building, Package, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { DEMO_CUSTOMERS, DEMO_PRODUCTS } from '../../../data/initialServiceData';
import CustomerSelect from '../../../components/common/CustomerSelect';

export default function AddWarrantyModal({ isOpen, onClose, onSave }) {
  const [customerId, setCustomerId] = useState(DEMO_CUSTOMERS[0].id);
  const selectedCustomer = DEMO_CUSTOMERS.find((c) => c.id === customerId) || DEMO_CUSTOMERS[0];

  const [productId, setProductId] = useState(DEMO_PRODUCTS[0].id);
  const selectedProduct = DEMO_PRODUCTS.find((p) => p.id === productId) || DEMO_PRODUCTS[0];

  const [serialNumber, setSerialNumber] = useState(`HV25-0891`);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-090');
  const [purchaseDate, setPurchaseDate] = useState('2026-10-18');
  const [warrantyStartDate, setWarrantyStartDate] = useState('2026-10-18');
  const [warrantyEndDate, setWarrantyEndDate] = useState('2027-10-17');
  const [warrantyDuration, setWarrantyDuration] = useState('12 Months');
  const [coverageType, setCoverageType] = useState('Standard Manufacturer Warranty');
  const [coverageDetails, setCoverageDetails] = useState('Covers all factory casting defects, seals, hydraulic valve calibration, and OEM mechanical labor.');
  const [exclusions, setExclusions] = useState('Operating outside prescribed temperature limits or third-party fluid contamination.');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCustomerSelect = (custId) => {
    setCustomerId(custId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      setError('Serial number is required.');
      return;
    }

    const payload = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      serialNumber,
      invoiceNumber,
      purchaseDate,
      warrantyStartDate,
      warrantyEndDate,
      warrantyDuration,
      coverageType,
      coverageDetails,
      exclusions,
      remarks
    };

    if (onSave) {
      onSave(payload);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '780px',
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
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Add New Product Warranty Record
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Register OEM warranty certificate for customer equipment
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
            {error && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#b91c1c', fontSize: '12px' }}>
                {error}
              </div>
            )}

            {isSuccess && (
              <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                <span>Warranty record added successfully! Linked to customer equipment directory.</span>
              </div>
            )}

            {/* Section 1: Customer & Product Information */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={16} className="text-primary" />
                Customer Account & Purchased Equipment
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    Customer Account *
                  </label>
                  <CustomerSelect
                    value={customerId}
                    onChange={handleCustomerSelect}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                      Equipment Model *
                    </label>
                    <select
                      className="form-control"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      required
                    >
                      {DEMO_PRODUCTS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                      Serial Number *
                    </label>
                    <input
                      type="text"
                      className="form-control font-mono"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. SN-88912"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Original Sales Invoice #</label>
                    <input
                      type="text"
                      className="form-control font-mono"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Purchase / Commission Date</label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Warranty Coverage Details */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#ffffff' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} className="text-primary" />
                Warranty Terms & Policy Coverage
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Coverage Duration
                  </label>
                  <select
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={warrantyDuration}
                    onChange={(e) => setWarrantyDuration(e.target.value)}
                  >
                    <option value="6 Months">6 Months</option>
                    <option value="12 Months">12 Months (Standard)</option>
                    <option value="24 Months">24 Months (Extended OEM)</option>
                    <option value="36 Months">36 Months (Industrial Tier)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Warranty Start Date *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={warrantyStartDate}
                    onChange={(e) => setWarrantyStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Warranty End Date *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={warrantyEndDate}
                    onChange={(e) => setWarrantyEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Coverage Type
                </label>
                <select
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={coverageType}
                  onChange={(e) => setCoverageType(e.target.value)}
                >
                  <option value="Standard Manufacturer Warranty">Standard Manufacturer Warranty (Parts & OEM Faults)</option>
                  <option value="Comprehensive (Parts & Labor)">Comprehensive (Parts, Seals & On-Site Labor)</option>
                  <option value="Limited Major Assemblies Only">Limited Major Assemblies Only (Excluding Gaskets)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Coverage Details</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={coverageDetails}
                  onChange={(e) => setCoverageDetails(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Policy Exclusions</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px' }}>Remarks / Certificate Notes</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Special SLA commitment, dedicated technician..."
                />
              </div>
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
            <button type="submit" className="btn btn-primary" disabled={isSuccess} style={{ fontSize: '13px' }}>
              Register Warranty Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
