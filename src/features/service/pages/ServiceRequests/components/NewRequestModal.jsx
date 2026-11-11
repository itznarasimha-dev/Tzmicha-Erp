import React, { useState, useMemo } from 'react';
import { X, Building2, Wrench, FileText, CheckCircle2, AlertCircle, Info, RotateCcw, AlertTriangle } from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';
import { useRole } from '../../../context/RoleContext';
import CustomerSelect from '../../../components/common/CustomerSelect';
import { formatDate } from '../../../utils/formatters';

const SERVICE_TYPES = [
  'Warranty Service',
  'AMC Service',
  'Free Service',
  'Paid Service',
  'Repeat Complaint'
];

export default function NewRequestModal({ onClose }) {
  const { customers = [], products = [], salesInvoices = [], serviceRequests = [], addServiceRequest } = useSchedule();
  const { roleId, currentRole } = useRole();

  // Section A: Customer Details
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || 'CUS-000001');
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const [customerName, setCustomerName] = useState(selectedCustomer?.businessName || selectedCustomer?.name || '');
  const [contactPerson, setContactPerson] = useState(selectedCustomer?.contactPerson || '');
  const [contactNumber, setContactNumber] = useState(selectedCustomer?.phone || '');
  const [email, setEmail] = useState(selectedCustomer?.email || '');
  const [serviceLocation, setServiceLocation] = useState(selectedCustomer?.address || '');

  // Section B: Customer Purchased Equipment
  const customerInvoices = salesInvoices.filter((inv) => inv.customerId === selectedCustomerId);
  const defaultInvoice = customerInvoices[0] || salesInvoices[0];

  const [selectedProductId, setSelectedProductId] = useState(defaultInvoice?.productId || products[0]?.id || 'PRD-M-101');
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const [serialNumber, setSerialNumber] = useState('HV25-0891');
  const [purchasedQty, setPurchasedQty] = useState('1');
  const [invoiceNo, setInvoiceNo] = useState(defaultInvoice?.invoiceNo || 'INV-2026-090');
  const [purchaseDate, setPurchaseDate] = useState(defaultInvoice?.purchaseDate || '2026-10-18');
  const [warrantyStatus, setWarrantyStatus] = useState('Active (Manufacturer 12-Mo)');
  const [amcStatus, setAmcStatus] = useState('Comprehensive AMC');

  // Section C: Service Request Details
  const [serviceType, setServiceType] = useState('Warranty Service');
  const [serviceCategory, setServiceCategory] = useState('Breakdown Repair');
  const [isRepeatComplaint, setIsRepeatComplaint] = useState(false);
  const [linkedPreviousSrId, setLinkedPreviousSrId] = useState('');

  const [issueDescription, setIssueDescription] = useState('');
  const [requestSource, setRequestSource] = useState('Customer Hotline');
  const [priority, setPriority] = useState('High');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10));
  const [preferredDate, setPreferredDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdSrId, setCreatedSrId] = useState('');

  // Repeat Complaint Detection: Check if same customer has previous tickets for this product/machine
  const previousMatchingRequest = useMemo(() => {
    return serviceRequests.find((sr) => {
      const matchCustomer = sr.customerId === selectedCustomerId || sr.customerName.toLowerCase() === customerName.toLowerCase();
      const matchProduct = sr.productId === selectedProductId || sr.productName === selectedProduct?.name;
      return matchCustomer && matchProduct;
    });
  }, [serviceRequests, selectedCustomerId, customerName, selectedProductId, selectedProduct]);

  // Handle customer selection from CustomerSelect
  const handleCustomerSelect = (custId, customerObj) => {
    setSelectedCustomerId(custId);
    if (customerObj) {
      setCustomerName(customerObj.businessName || customerObj.name);
      setContactPerson(customerObj.contactPerson);
      setContactNumber(customerObj.phone);
      setEmail(customerObj.email);
      setServiceLocation(customerObj.address);

      const custInv = salesInvoices.find((inv) => inv.customerId === custId);
      if (custInv) {
        setInvoiceNo(custInv.invoiceNo);
        setPurchaseDate(custInv.purchaseDate);
        if (custInv.productId) {
          setSelectedProductId(custInv.productId);
        }
      }
    }
  };

  const handleLinkRepeatComplaint = () => {
    if (previousMatchingRequest) {
      setIsRepeatComplaint(true);
      setServiceType('Repeat Complaint');
      setLinkedPreviousSrId(previousMatchingRequest.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!issueDescription.trim()) {
      setError('Please provide a detailed issue description.');
      return;
    }
    if (!selectedCustomerId) {
      setError('Please select a valid customer.');
      return;
    }

    const newSR = addServiceRequest({
      customerId: selectedCustomerId,
      customerName,
      contactPerson,
      contactNumber,
      email,
      serviceLocation,
      serviceType,
      serviceCategory,
      isRepeatComplaint: isRepeatComplaint || serviceType === 'Repeat Complaint',
      previousServiceRequestId: linkedPreviousSrId || (previousMatchingRequest ? previousMatchingRequest.id : null),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      serialNumber,
      purchasedQuantity: Number(purchasedQty) || 1,
      invoiceNo,
      purchaseDate,
      warrantyStatus,
      amcStatus,
      issueType: `${serviceCategory} Investigation`,
      issueDescription,
      priority,
      requestDate,
      preferredDate,
      requestSource,
      reportedBy: `${contactPerson} (${currentRole?.label || 'Staff'} logged)`,
      remarks
    });

    setCreatedSrId(newSR.id);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '860px',
          maxWidth: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Create New Service Request
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
              Logged by: <strong className="text-primary">{currentRole?.profile?.name || currentRole?.name}</strong> ({currentRole?.label})
            </p>
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#b91c1c', fontSize: '13px' }}>
                {error}
              </div>
            )}

            {isSuccess && (
              <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                <span>
                  <strong>Success!</strong> Service Request <strong>{createdSrId}</strong> created and added to central operations directory. Available for scheduling and assignment.
                </span>
              </div>
            )}

            {/* Repeat Complaint Auto-Detection Banner */}
            {previousMatchingRequest && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fffbeb',
                  border: '1.5px solid #fcd34d',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400e' }}>
                      Possible Previous Complaint Found (Repeat Complaint Warning)
                    </div>
                    <div style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>
                      Customer has a prior service ticket <strong style={{ fontFamily: 'monospace' }}>{previousMatchingRequest.id}</strong> on {formatDate(previousMatchingRequest.requestDate)} for this equipment: <em>"{previousMatchingRequest.issueDescription?.slice(0, 75)}..."</em>
                    </div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
                      Standard warranty repeat validity: 30 days from previous resolution.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    backgroundColor: isRepeatComplaint ? '#fef3c7' : '#ffffff',
                    borderColor: '#f59e0b',
                    color: '#92400e',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    padding: '4px 10px'
                  }}
                  onClick={handleLinkRepeatComplaint}
                >
                  <RotateCcw size={12} />
                  <span>{isRepeatComplaint ? 'Linked as Repeat' : 'Link as Repeat Complaint'}</span>
                </button>
              </div>
            )}

            {/* SECTION A: Customer & Account Details */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} className="text-primary" />
                Section A — Customer & Account Details (Searchable by ID or Name)
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    Select Customer Account (Type CUS-000001 or business name) *
                  </label>
                  <CustomerSelect
                    value={selectedCustomerId}
                    onChange={handleCustomerSelect}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px' }}>Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px' }}>Contact Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px' }}>Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      style={{ height: '36px', fontSize: '13px' }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Service Site / Dispatch Address *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={serviceLocation}
                    onChange={(e) => setServiceLocation(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* SECTION B: Product & Original Sales Invoice */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#ffffff' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={16} className="text-primary" />
                Section B — Product & Original Sales Invoice Linkage
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Purchased Equipment / Product *
                  </label>
                  <select
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Machine Serial / Batch #</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-88912"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Original Sales Invoice #</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '34px', fontSize: '12px', fontFamily: 'monospace' }}
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Original Purchase Date</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '34px', fontSize: '12px' }}
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Warranty Status</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '34px', fontSize: '12px' }}
                    value={warrantyStatus}
                    onChange={(e) => setWarrantyStatus(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>AMC Coverage Status</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '34px', fontSize: '12px' }}
                    value={amcStatus}
                    onChange={(e) => setAmcStatus(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* SECTION C: Service Request Details */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} className="text-primary" />
                Section C — Service Request & Technical Details
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Service Type / Coverage *
                  </label>
                  <select
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px', fontWeight: 600 }}
                    value={serviceType}
                    onChange={(e) => {
                      setServiceType(e.target.value);
                      if (e.target.value === 'Repeat Complaint') {
                        setIsRepeatComplaint(true);
                      }
                    }}
                  >
                    {SERVICE_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Service Category *
                  </label>
                  <select
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                  >
                    <option value="Breakdown Repair">Breakdown Repair (Corrective)</option>
                    <option value="Preventive Maintenance">Preventive Maintenance (PM Schedule)</option>
                    <option value="Inspection & Diagnostic">Inspection & Diagnostic</option>
                    <option value="Installation & Commissioning">Installation & Commissioning</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                    Priority Level *
                  </label>
                  <select
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="Very High">Very High (Immediate Turnaround)</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Request Source</label>
                  <select
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={requestSource}
                    onChange={(e) => setRequestSource(e.target.value)}
                  >
                    <option value="Customer Hotline">Customer Hotline / Phone</option>
                    <option value="Direct Field Contact">Direct Field Contact to Technician</option>
                    <option value="Email Support Ticket">Email Support Ticket</option>
                    <option value="Sales Coordinator Referral">Sales Coordinator Referral</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Logged Request Date</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Client Preferred Service Date</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px' }}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Detailed Issue Description & Reported Symptoms *
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  style={{ fontSize: '13px' }}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe machine behavior, fault codes, hydraulic pressure readings or visible wear..."
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Additional Operational Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Gate pass instructions, special PPE requirements, or production line urgency..."
                />
              </div>
            </div>
          </div>

          {/* SECTION D: Submission */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: '#f8fafc'
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '13px' }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSuccess}
              style={{ fontSize: '13px', padding: '8px 20px' }}
            >
              Create Service Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
