import React, { useState } from 'react';
import { X, Award, Building, Package, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { DEMO_CUSTOMERS, DEMO_PRODUCTS } from '../../../data/initialServiceData';
import CustomerSelect from '../../../components/common/CustomerSelect';

export default function RegisterAmcModal({ isOpen, onClose, onSave }) {
  const randNum = Math.floor(100 + Math.random() * 900);

  const [customerId, setCustomerId] = useState(DEMO_CUSTOMERS[0].id);
  const selectedCustomer = DEMO_CUSTOMERS.find((c) => c.id === customerId) || DEMO_CUSTOMERS[0];

  const [productId, setProductId] = useState(DEMO_PRODUCTS[0].id);
  const selectedProduct = DEMO_PRODUCTS.find((p) => p.id === productId) || DEMO_PRODUCTS[0];

  const [contractNumber, setContractNumber] = useState(`AMC-2026-REG${randNum}`);
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [contractEndDate, setContractEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [contractDuration, setContractDuration] = useState('12 Months');
  const [visitsIncluded, setVisitsIncluded] = useState('4');
  const [amcValue, setAmcValue] = useState('35000');
  const [planTier, setPlanTier] = useState('Comprehensive AMC (Parts + Labor)');
  const [agreementTerms, setAgreementTerms] = useState(
    'Includes 4 scheduled quarterly preventive check-ups, unlimited breakdown breakdown emergency visits with 4-hr SLA, and 15% discount on consumed non-warranty parts.'
  );
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCustomerSelect = (custId) => {
    setCustomerId(custId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!contractNumber.trim()) {
      setError('Contract number is required.');
      return;
    }

    const payload = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      contractNumber,
      contractStartDate,
      contractEndDate,
      contractDuration,
      visitsIncluded: Number(visitsIncluded) || 4,
      amcValue: Number(amcValue) || 35000,
      planTier,
      agreementTerms,
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
              <Award size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Register Annual Maintenance Contract (AMC)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Execute recurring preventative maintenance contract and service SLA
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
                <span>AMC agreement registered successfully! Contract active on operations calendar.</span>
              </div>
            )}

            {/* Section 1: Customer & Equipment */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={16} className="text-primary" />
                Customer Account & Covered Equipment
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

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Equipment / Machine Under Contract *
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
              </div>
            </div>

            {/* Section 2: Contract Information */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#ffffff' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} className="text-primary" />
                Contract Terms & Service Scope
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    AMC Contract Agreement # *
                  </label>
                  <input
                    type="text"
                    className="form-control font-mono"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Service Plan Tier
                  </label>
                  <select
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={planTier}
                    onChange={(e) => setPlanTier(e.target.value)}
                  >
                    <option value="Comprehensive AMC (Parts + Labor)">Comprehensive AMC (Parts + Labor)</option>
                    <option value="Non-Comprehensive AMC (Labor Only)">Non-Comprehensive AMC (Labor Only)</option>
                    <option value="Preventative Care AMC (Quarterly PM)">Preventative Care AMC (Quarterly PM)</option>
                    <option value="Platinum 24/7 Mission-Critical SLA">Platinum 24/7 Mission-Critical SLA</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Contract Start Date *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Contract End Date *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={contractEndDate}
                    onChange={(e) => setContractEndDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Included Visits / Year
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={visitsIncluded}
                    onChange={(e) => setVisitsIncluded(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Annual Contract Value (INR ₹) *
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={amcValue}
                    onChange={(e) => setAmcValue(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Duration</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={contractDuration}
                    onChange={(e) => setContractDuration(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Agreement Terms & SLA Scope</label>
                <textarea
                  className="form-control"
                  rows={2}
                  style={{ fontSize: '13px' }}
                  value={agreementTerms}
                  onChange={(e) => setAgreementTerms(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px' }}>Remarks / Commercial Notes</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Payment milestones, renewal terms..."
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
              Register AMC Agreement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
