import React, { useState } from 'react';
import { X, Receipt, Building, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';
import CustomerSelect from '../../../components/common/CustomerSelect';
import { formatINR } from '../../../utils/formatters';

export default function CreateServiceBillModal({ isOpen, onClose }) {
  const { customers = [], serviceRequests = [], createServiceInvoice } = useSchedule();

  const [customerId, setCustomerId] = useState(customers[0]?.id || 'CUS-000001');
  const selectedCustomer = customers.find((c) => c.id === customerId) || customers[0];

  // Available service requests for this customer
  const customerRequests = serviceRequests.filter((sr) => sr.customerId === customerId);
  const defaultSR = customerRequests[0] || serviceRequests[0];

  const [serviceRequestId, setServiceRequestId] = useState(defaultSR?.id || 'SR-2026-001');
  const selectedSR = serviceRequests.find((s) => s.id === serviceRequestId) || defaultSR;

  const [salesInvoiceRef, setSalesInvoiceRef] = useState(selectedSR?.invoiceNo || 'INV-2026-090');
  const [productName, setProductName] = useState(selectedSR?.productName || 'Industrial Equipment');
  const [assignedEngineerName, setAssignedEngineerName] = useState(selectedSR?.assignedEngineerName || 'David Chen');
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));

  // Billing Charges
  const [serviceCharges, setServiceCharges] = useState('3500');
  const [partsCharges, setPartsCharges] = useState('1850');
  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdInvoiceNo, setCreatedInvoiceNo] = useState('');

  if (!isOpen) return null;

  // Calculation
  const subtotal =
    Math.max(0, Number(serviceCharges || 0) + Number(partsCharges || 0) + Number(additionalCharges || 0) - Number(discount || 0));
  const gstRate = 18;
  const gstAmount = (subtotal * gstRate) / 100;
  const totalAmount = subtotal + gstAmount;

  const handleCustomerSelect = (custId) => {
    setCustomerId(custId);
    const related = serviceRequests.filter((s) => s.customerId === custId);
    if (related.length > 0) {
      setServiceRequestId(related[0].id);
      setSalesInvoiceRef(related[0].invoiceNo || 'INV-2026-090');
      setProductName(related[0].productName);
      setAssignedEngineerName(related[0].assignedEngineerName || 'David Chen');
    }
  };

  const handleSRChange = (srId) => {
    setServiceRequestId(srId);
    const found = serviceRequests.find((s) => s.id === srId);
    if (found) {
      setSalesInvoiceRef(found.invoiceNo || 'INV-2026-090');
      setProductName(found.productName);
      setAssignedEngineerName(found.assignedEngineerName || 'David Chen');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer account.');
      return;
    }

    const payload = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      serviceRequestId,
      salesInvoiceRef,
      productName,
      assignedEngineerName,
      completionDate,
      serviceCharges: Number(serviceCharges),
      labourCharges: 0,
      partsCharges: Number(partsCharges),
      additionalCharges: Number(additionalCharges),
      discount: Number(discount),
      paymentTerms,
      dueDate,
      approvalStatus: 'Pending Finance Approval',
      notes: remarks || 'Field service resolution bill'
    };

    const newInv = createServiceInvoice(payload);
    setCreatedInvoiceNo(newInv.serviceInvoiceNo);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1400);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '780px',
          maxWidth: '95vw',
          maxHeight: '92vh',
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
              <Receipt size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Create Service Bill (Service Invoice)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Generate separate SINV document and submit for Finance Team approval
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
                <span>
                  Service Bill <strong>{createdInvoiceNo}</strong> created and saved as <strong>Pending Finance Approval</strong>.
                </span>
              </div>
            )}

            {/* Section A: Customer & Service Context */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={16} className="text-primary" />
                Customer Account & Service Ticket Linkage
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                      Linked Service Ticket *
                    </label>
                    <select
                      className="form-control"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={serviceRequestId}
                      onChange={(e) => handleSRChange(e.target.value)}
                      required
                    >
                      {serviceRequests.map((sr) => (
                        <option key={sr.id} value={sr.id}>
                          {sr.id} — {sr.customerName} ({sr.serviceCategory})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Original Sales Invoice Ref</label>
                    <input
                      type="text"
                      className="form-control font-mono"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={salesInvoiceRef}
                      onChange={(e) => setSalesInvoiceRef(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Equipment Serviced</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Lead Technician</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={assignedEngineerName}
                      onChange={(e) => setAssignedEngineerName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Completion Date</label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Billing Charges & Finance Breakdown */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#ffffff' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Receipt size={16} className="text-primary" />
                Service Charges & Tax Breakdown
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Service / Labor (₹) *
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={serviceCharges}
                    onChange={(e) => setServiceCharges(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Spare Parts Billed (₹)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={partsCharges}
                    onChange={(e) => setPartsCharges(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>
                    Additional Charges (₹)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={additionalCharges}
                    onChange={(e) => setAdditionalCharges(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              {/* Total Calculation Display Card */}
              <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Subtotal: <strong>{formatINR(subtotal)}</strong></span>
                  <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>GST @ 18%: <strong>{formatINR(gstAmount)}</strong></span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', marginRight: '6px' }}>Total Service Bill:</span>
                  <strong style={{ fontSize: '18px', color: '#2563eb' }}>{formatINR(totalAmount)}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Payment Terms
                  </label>
                  <select
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <option value="Net 30 Days">Net 30 Days (Standard Corporate)</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Immediate on Receipt">Immediate on Receipt (Cash/Online)</option>
                    <option value="50% Advance, 50% on Handover">50% Advance, 50% on Handover</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Payment Due Date *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px' }}>Commercial Billing Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Non-warranty emergency hydraulic repair authorized by Plant Manager"
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
              Create Service Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
