import { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import ConfirmDialog from '../common/ConfirmDialog';
import AddCustomerModal from './AddCustomerModal';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, calculateLineTotals, generateReference } from '../../utils/formatters';
import { Plus, Trash2, User, AlertTriangle, AlertCircle } from 'lucide-react';

export default function CreateQuotationModal({ isOpen, onClose, quotationToEdit = null }) {
  const { customers, products, userProfile, userRole, addQuotation, updateQuotation, quotations } = useSales();
  const { showToast } = useToast();

  const isEditing = Boolean(quotationToEdit);
  const wasApproved = isEditing && (quotationToEdit?.status === 'Approved' || quotationToEdit?.status === 'Accepted');
  const wasRejected = isEditing && quotationToEdit?.status === 'Rejected';

  // Form State
  const [quotationNo, setQuotationNo] = useState('');
  const [createdDate, setCreatedDate] = useState('');
  const [validityDays, setValidityDays] = useState(15);
  const [validUntil, setValidUntil] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [idValidationError, setIdValidationError] = useState(null);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [deliveryTerms, setDeliveryTerms] = useState('Standard Dispatch (7-10 Days)');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});

  // Sub-modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showApprovedEditConfirm, setShowApprovedEditConfirm] = useState(false);

  // Initialize form when opened or quotationToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (quotationToEdit) {
      setQuotationNo(quotationToEdit.quotationNo);
      setCreatedDate(quotationToEdit.createdDate || new Date().toISOString().split('T')[0]);
      setValidityDays(quotationToEdit.validityDays || 15);
      setValidUntil(quotationToEdit.validUntil || '');

      // Resolve saved customer ID
      const matchedCust = customers.find(
        (c) =>
          c.id === quotationToEdit.customerId ||
          c.customerId === quotationToEdit.customerId ||
          c.code === quotationToEdit.customerId ||
          (c.name && quotationToEdit.customerName && c.name.trim().toLowerCase() === quotationToEdit.customerName.trim().toLowerCase())
      );
      const custIdToSet = matchedCust?.customerId || matchedCust?.code || quotationToEdit.customerId || '';
      setCustomerId(custIdToSet);
      setCustomerIdInput(custIdToSet);
      setIdValidationError(null);

      setPaymentTerms(quotationToEdit.paymentTerms || 'Net 30 Days');
      setDeliveryTerms(quotationToEdit.deliveryTerms || 'Standard Dispatch (7-10 Days)');
      setNotes(quotationToEdit.notes || '');
      setItems(
        (quotationToEdit.items || []).map((it) => ({
          productId: it.productId,
          qty: it.qty || 1,
          unitPrice: it.unitPrice || 0,
          discountPercent: it.discountPercent || 0,
          taxRate: it.taxRate ?? 18,
        }))
      );
    } else {
      const generatedNo = generateReference('QT', quotations);
      const today = new Date().toISOString().split('T')[0];
      const initialDays = 15;
      const initialValidUntil = new Date(Date.now() + initialDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      setQuotationNo(generatedNo);
      setCreatedDate(today);
      setValidityDays(initialDays);
      setValidUntil(initialValidUntil);
      setCustomerId('');
      setCustomerIdInput('');
      setIdValidationError(null);
      setPaymentTerms('Net 30 Days');
      setDeliveryTerms('Standard Dispatch (7-10 Days)');
      setNotes('Standard manufacturing and dispatch terms apply. Goods inspected under ISO 9001 quality criteria.');

      // Default with first available product
      const defaultProd = products[0];
      setItems([
        {
          productId: defaultProd ? defaultProd.id : '',
          qty: 10,
          unitPrice: defaultProd ? defaultProd.salePrice : 1000,
          discountPercent: 0,
          taxRate: defaultProd ? defaultProd.taxRate : 18,
        },
      ]);
    }
    setErrors({});
  }, [isOpen, quotationToEdit, quotations, products, customers]);

  // Handle Customer ID manual typing/pasting
  const handleCustomerIdInputChange = (val) => {
    setCustomerIdInput(val);
    if (!val || !val.trim()) {
      setCustomerId('');
      setIdValidationError(null);
      return;
    }
    const clean = val.trim().toLowerCase();
    const match = customers.find(
      (c) =>
        (c.customerId && c.customerId.toLowerCase() === clean) ||
        (c.code && c.code.toLowerCase() === clean) ||
        (c.id && c.id.toLowerCase() === clean)
    );

    if (match) {
      const standardId = match.customerId || match.code || match.id;
      setCustomerId(standardId);
      setIdValidationError(null);
      if (errors.customerId) {
        setErrors((prev) => ({ ...prev, customerId: null }));
      }
    } else {
      setCustomerId('');
      if (val.trim().length >= 3) {
        setIdValidationError(`Customer ID "${val.trim()}" not found in database.`);
      } else {
        setIdValidationError(null);
      }
    }
  };

  const handleSelectCustomer = (cust) => {
    if (!cust) {
      setCustomerId('');
      setCustomerIdInput('');
      setIdValidationError(null);
      return;
    }
    const standardId = cust.customerId || cust.code || cust.id;
    setCustomerId(standardId);
    setCustomerIdInput(standardId);
    setIdValidationError(null);
    if (errors.customerId) {
      setErrors((prev) => ({ ...prev, customerId: null }));
    }
  };

  // Recalculate validUntil when createdDate or validityDays changes
  const handleValidityDaysChange = (days) => {
    setValidityDays(days);
    if (createdDate) {
      const base = new Date(createdDate);
      if (!isNaN(base.getTime())) {
        const target = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
        setValidUntil(target.toISOString().split('T')[0]);
      }
    }
  };

  const handleCreatedDateChange = (newDate) => {
    setCreatedDate(newDate);
    const base = new Date(newDate);
    if (!isNaN(base.getTime())) {
      const target = new Date(base.getTime() + Number(validityDays) * 24 * 60 * 60 * 1000);
      setValidUntil(target.toISOString().split('T')[0]);
    }
  };

  const selectedCustomer = useMemo(() => {
    if (!customerId) return null;
    const clean = customerId.trim().toLowerCase();
    return (
      customers.find(
        (c) =>
          (c.customerId && c.customerId.toLowerCase() === clean) ||
          (c.code && c.code.toLowerCase() === clean) ||
          (c.id && c.id.toLowerCase() === clean) ||
          (c.name && c.name.toLowerCase() === clean)
      ) || null
    );
  }, [customers, customerId]);

  // Calculated Line Items
  const calculatedItems = useMemo(() => {
    return items.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const unitPrice = Number(it.unitPrice) || 0;
      const qty = Number(it.qty) || 0;
      const discount = Number(it.discountPercent) || 0;
      const taxRate = Number(it.taxRate ?? (prod ? prod.taxRate : 18));

      const totals = calculateLineTotals(unitPrice, qty, discount, taxRate);
      return {
        ...it,
        productName: prod ? prod.name : 'Selected Product',
        productCode: prod ? prod.code : it.productId,
        productDesc: prod ? prod.description : '',
        supplyType: prod ? prod.supplyType : 'Manufactured',
        uom: prod ? prod.uom : 'Pieces',
        availableStock: prod ? prod.availableQty : 0,
        ...totals,
      };
    });
  }, [items, products]);

  const subtotal = useMemo(() => calculatedItems.reduce((sum, it) => sum + it.baseAmount, 0), [calculatedItems]);
  const discountTotal = useMemo(() => calculatedItems.reduce((sum, it) => sum + it.discountAmount, 0), [calculatedItems]);
  const taxableTotal = useMemo(() => calculatedItems.reduce((sum, it) => sum + it.taxableAmount, 0), [calculatedItems]);
  const taxTotal = useMemo(() => calculatedItems.reduce((sum, it) => sum + it.taxAmount, 0), [calculatedItems]);
  const grandTotal = useMemo(() => calculatedItems.reduce((sum, it) => sum + it.lineTotal, 0), [calculatedItems]);

  // Line item modifiers
  const handleAddItem = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: defaultProd.id,
        qty: 5,
        unitPrice: defaultProd.salePrice,
        discountPercent: 0,
        taxRate: defaultProd.taxRate || 18,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      showToast('A quotation must contain at least one line item', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i === index) {
          if (field === 'productId') {
            const newProd = products.find((p) => p.id === value);
            return {
              ...it,
              productId: value,
              unitPrice: newProd ? newProd.salePrice : it.unitPrice,
              taxRate: newProd ? newProd.taxRate : 18,
            };
          }
          return { ...it, [field]: value };
        }
        return it;
      })
    );
  };

  // Validation
  const validateForm = () => {
    const errs = {};
    if (!customerId || !selectedCustomer) {
      errs.customerId = customerIdInput
        ? `Customer ID "${customerIdInput}" does not match any existing record. Please enter a valid Customer ID or select from directory.`
        : 'Please enter a Customer ID or select a customer.';
    }
    if (!createdDate) errs.createdDate = 'Quotation date is required';
    if (!validUntil) errs.validUntil = 'Valid-until date is required';
    if (items.length === 0) errs.items = 'Please add at least one line item';

    items.forEach((it, idx) => {
      if (!it.productId) errs[`item_${idx}_prod`] = 'Product is required';
      if (!it.qty || Number(it.qty) <= 0) errs[`item_${idx}_qty`] = 'Quantity must be > 0';
      if (it.unitPrice === undefined || Number(it.unitPrice) < 0) errs[`item_${idx}_price`] = 'Price cannot be negative';
      if (Number(it.discountPercent) < 0 || Number(it.discountPercent) > 100) errs[`item_${idx}_disc`] = 'Discount must be 0-100%';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submission handler
  const handleInitiateSubmit = (asDraft = false) => {
    if (!validateForm()) {
      showToast('Please correct validation errors before proceeding', 'danger');
      return;
    }

    if (asDraft) {
      executeSave('Draft');
      return;
    }

    // Sales Coordinator creates and edits without requiring additional approval
    if (userRole === 'sales_coordinator') {
      executeSave('Approved');
      return;
    }

    // If editing an approved quote, show warning dialog first
    if (wasApproved) {
      setShowApprovedEditConfirm(true);
      return;
    }

    // Show submission confirmation dialog
    setShowSubmitConfirm(true);
  };

  const executeSave = (status) => {
    const finalCustomerId = selectedCustomer
      ? selectedCustomer.customerId || selectedCustomer.code || selectedCustomer.id
      : customerId;

    const quotePayload = {
      quotationNo,
      createdDate,
      validUntil,
      validityDays: Number(validityDays),
      customerId: finalCustomerId,
      customerName: selectedCustomer ? selectedCustomer.name : 'Unknown Customer',
      contactPerson: selectedCustomer ? selectedCustomer.contactPerson : '',
      customerPhone: selectedCustomer ? selectedCustomer.phone : '',
      customerEmail: selectedCustomer ? selectedCustomer.email : '',
      customerAddress: selectedCustomer ? selectedCustomer.address : '',
      customerGstin: selectedCustomer ? selectedCustomer.gstin : '',
      paymentTerms,
      deliveryTerms,
      notes,
      status,
      // Preserve original creator information if editing:
      ...(isEditing && {
        raisedBy: quotationToEdit.raisedBy || quotationToEdit.salesOwner,
        salesOwner: quotationToEdit.salesOwner || quotationToEdit.raisedBy,
        createdBy: quotationToEdit.createdBy,
        createdByName: quotationToEdit.createdByName,
        createdByRole: quotationToEdit.createdByRole,
      }),
      items: calculatedItems.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        productCode: it.productCode,
        uom: it.uom,
        unitPrice: Number(it.unitPrice),
        qty: Number(it.qty),
        discountPercent: Number(it.discountPercent),
        taxRate: Number(it.taxRate),
        lineTotal: it.lineTotal,
      })),
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
    };

    if (isEditing) {
      updateQuotation(quotationToEdit.id, quotePayload, status === 'Pending Approval');
      if (userRole === 'sales_manager') {
        showToast(`Quotation ${quotationNo} updated and authorized successfully`, 'success');
      } else if (userRole === 'sales_coordinator') {
        showToast(`Quotation ${quotationNo} updated and submitted for Sales Manager approval!`, 'success');
      } else if (status === 'Pending Approval') {
        showToast(
          wasApproved
            ? `Quotation ${quotationNo} revised and resubmitted for approval!`
            : wasRejected
            ? `Quotation ${quotationNo} corrected and resubmitted for approval!`
            : `Quotation ${quotationNo} submitted for approval!`,
          'success'
        );
      } else {
        showToast(`Quotation ${quotationNo} draft updated successfully`, 'info');
      }
    } else {
      addQuotation(quotePayload);
      if (userRole === 'sales_manager') {
        showToast(`Quotation ${quotationNo} created and authorized successfully!`, 'success');
      } else if (userRole === 'sales_coordinator') {
        showToast(`Quotation ${quotationNo} submitted for Sales Manager approval!`, 'success');
      } else if (status === 'Pending Approval') {
        showToast(`Quotation ${quotationNo} created and submitted for approval!`, 'success');
      } else {
        showToast(`Quotation ${quotationNo} saved as Draft`, 'info');
      }
    }

    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xlarge"
        title={isEditing ? `Edit Quotation ${quotationNo}` : 'Create New Quotation'}
        subtitle="Configure commercial price proposals with product catalogue, tax rates, payment terms, and approval workflows"
        footer={
          <div className="modal-actions-bar">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <div className="modal-actions-right">
              {userRole === 'sales_manager' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleInitiateSubmit(false)}
                >
                  {isEditing ? 'Save Changes' : 'Authorize & Create Quotation'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleInitiateSubmit(true)}
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleInitiateSubmit(false)}
                  >
                    {userRole === 'sales_coordinator' ? 'Submit for Sales Manager Approval' : 'Submit for Approval'}
                  </button>
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="quotation-form-stepper">
          {/* Re-approval Notice if Editing Approved Quotation (Reps, Juniors & Coordinators) */}
          {wasApproved && userRole !== 'sales_manager' && (
            <div className="alert-callout alert-callout-warning mb-4">
              <AlertTriangle size={18} className="callout-icon" />
              <div className="callout-text">
                <strong>Re-Approval Required:</strong> This quotation was previously approved. Editing commercial details will transition it back to <em>&ldquo;Revised—Pending Approval&rdquo;</em> and require re-authorization by {userRole === 'sales_coordinator' ? 'the Sales Manager' : 'a Sales Coordinator or Sales Manager'}. The original approved snapshot and audit trail are preserved.
              </div>
            </div>
          )}

          {/* Rejection Correction Notice if Editing Rejected Quotation */}
          {wasRejected && quotationToEdit?.rejectionReason && (
            <div className="alert-callout alert-callout-danger mb-4">
              <AlertCircle size={18} className="callout-icon" />
              <div className="callout-text">
                <strong>Previous Rejection Reason:</strong> {quotationToEdit.rejectionReason}
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#991b1b' }}>
                  Please address the reviewer notes above before clicking &ldquo;Request Approval&rdquo;.
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION A: Quotation Details                             */}
          {/* ======================================================== */}
          <div className="form-section-card mb-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#2563eb', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>A</span>
              Quotation Header Details
            </h4>
            <div className="form-grid-4">
              <FormField label="Quotation Number" id="quote-number" helperText="Auto-generated unique reference">
                <input
                  type="text"
                  id="quote-number"
                  className="form-input"
                  value={quotationNo}
                  readOnly
                  style={{ background: '#f8fafc', fontWeight: 700, color: '#0f172a' }}
                />
              </FormField>

              <FormField label="Quotation Date" id="quote-date" required error={errors.createdDate}>
                <input
                  type="date"
                  id="quote-date"
                  className="form-input"
                  value={createdDate}
                  onChange={(e) => handleCreatedDateChange(e.target.value)}
                />
              </FormField>

              <FormField label="Quotation Validity" id="quote-validity">
                <select
                  id="quote-validity"
                  className="form-select"
                  value={validityDays}
                  onChange={(e) => handleValidityDaysChange(Number(e.target.value))}
                >
                  <option value={7}>7 Days</option>
                  <option value={15}>15 Days (Standard)</option>
                  <option value={30}>30 Days</option>
                  <option value={45}>45 Days</option>
                  <option value={60}>60 Days</option>
                </select>
              </FormField>

              <FormField label="Valid Until Date" id="quote-valid-until" required error={errors.validUntil}>
                <input
                  type="date"
                  id="quote-valid-until"
                  className="form-input"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </FormField>
            </div>

            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
              <User size={14} color="#94a3b8" />
              {isEditing ? (
                <span>Originally Raised by: <strong style={{ color: '#334155' }}>{quotationToEdit.raisedBy || quotationToEdit.salesOwner || userProfile.fullName}</strong></span>
              ) : (
                <span>Raised by: <strong style={{ color: '#334155' }}>{userProfile.fullName}</strong> ({userProfile.jobTitle || (userRole === 'sales_coordinator' ? 'Sales Coordinator' : userRole === 'sales_manager' ? 'Sales Manager' : 'Sales Representative')} • ID: {userProfile.employeeId})</span>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION B: Customer Details                              */}
          {/* ======================================================== */}
          <div className="form-section-card mb-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#2563eb', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>B</span>
                Customer Information
              </h4>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon-text"
                onClick={() => setIsAddCustomerOpen(true)}
                title="Register a new customer account"
              >
                <Plus size={13} />
                <span>Add New Customer</span>
              </button>
            </div>

            <div className="form-grid-2" style={{ alignItems: 'flex-start' }}>
              {/* Manual Customer ID Lookup */}
              <div>
                <FormField
                  label="Customer ID (Enter or Search)"
                  id="quote-customer-id-input"
                  required
                  error={errors.customerId || idValidationError}
                  helperText="Type or paste Customer ID (e.g. CUS-000001 or CUST-004)"
                >
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      id="quote-customer-id-input"
                      className="form-input"
                      placeholder="e.g. CUS-000001"
                      value={customerIdInput}
                      onChange={(e) => handleCustomerIdInputChange(e.target.value)}
                      style={{
                        paddingRight: selectedCustomer ? '100px' : '12px',
                        borderColor: selectedCustomer ? '#10b981' : (idValidationError || errors.customerId) ? '#ef4444' : undefined,
                        fontWeight: 600,
                      }}
                    />
                    {selectedCustomer && (
                      <span
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '11px',
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          pointerEvents: 'none',
                        }}
                      >
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </FormField>

                {idValidationError && (
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{idValidationError}</span>
                    <button
                      type="button"
                      className="btn btn-link btn-xs"
                      onClick={() => setIsAddCustomerOpen(true)}
                      style={{ color: '#2563eb', padding: 0, textDecoration: 'underline', fontSize: '12px' }}
                    >
                      + Register Customer
                    </button>
                  </div>
                )}
              </div>

              {/* Or Select from Directory Dropdown */}
              <div>
                <FormField
                  label="Or Select from Customer Directory"
                  id="quote-customer-dropdown"
                  helperText="Browse registered customer accounts"
                >
                  <select
                    id="quote-customer-dropdown"
                    className="form-select"
                    value={customerId}
                    onChange={(e) => {
                      const selected = customers.find(
                        (c) => c.customerId === e.target.value || c.code === e.target.value || c.id === e.target.value
                      );
                      handleSelectCustomer(selected);
                    }}
                  >
                    <option value="">Choose an existing customer account...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.customerId || c.code || c.id}>
                        {c.name} ({c.customerId || c.code || c.id} • {c.city} • GST: {c.gstin || 'None'})
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>

            {/* Rich Customer Details Display */}
            {selectedCustomer && (
              <div
                style={{
                  marginTop: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                }}
              >
                <div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Business Name</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{selectedCustomer.name}</strong>
                  <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>Customer ID: {selectedCustomer.customerId || selectedCustomer.code || selectedCustomer.id}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Person</span>
                  <span style={{ fontSize: '13px', color: '#334155' }}>{selectedCustomer.contactPerson || '—'}</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                    <span>{selectedCustomer.phone}</span>
                  </div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Billing Address & GST</span>
                  <span style={{ fontSize: '12px', color: '#334155', display: 'block' }}>{selectedCustomer.address || selectedCustomer.city}</span>
                  <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>GSTIN: {selectedCustomer.gstin || 'Unregistered'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Outstanding Balance</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: selectedCustomer.outstandingBalance > 0 ? '#b91c1c' : '#059669' }}>
                    {formatINR(selectedCustomer.outstandingBalance || 0)}
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Limit: {formatINR(selectedCustomer.creditLimit || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION C: Product & Pricing Details                     */}
          {/* ======================================================== */}
          <div className="form-section-card mb-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#2563eb', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>C</span>
                Products &amp; Pricing Details
              </h4>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon-text"
                onClick={handleAddItem}
              >
                <Plus size={14} />
                <span>Add Product</span>
              </button>
            </div>

            {errors.items && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>{errors.items}</div>
            )}

            <div className="table-responsive">
              <table className="enterprise-table items-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Product &amp; Code</th>
                    <th style={{ width: '12%' }}>Stock &amp; UoM</th>
                    <th style={{ width: '13%' }}>Unit Price (₹)</th>
                    <th style={{ width: '10%' }}>Quantity</th>
                    <th style={{ width: '9%' }}>Disc %</th>
                    <th style={{ width: '10%' }}>GST Rate</th>
                    <th style={{ width: '12%', textAlign: 'right' }}>Tax (₹)</th>
                    <th style={{ width: '12%', textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ width: '4%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedItems.map((item, index) => {
                    const isStockSufficient = item.availableStock >= item.qty;
                    return (
                      <tr key={index}>
                        <td>
                          <select
                            className="form-select select-sm"
                            value={item.productId}
                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.code})
                              </option>
                            ))}
                          </select>
                          {item.productDesc && (
                            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '2px' }} className="truncate">
                              {item.productDesc}
                            </span>
                          )}
                          {errors[`item_${index}_prod`] && (
                            <span style={{ color: '#ef4444', fontSize: '11px' }}>{errors[`item_${index}_prod`]}</span>
                          )}
                        </td>
                        <td>
                          <span className={`stock-indicator-pill ${isStockSufficient ? 'stock-ok' : 'stock-low'}`}>
                            {item.availableStock} {item.uom}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input input-sm"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          />
                          {errors[`item_${index}_price`] && (
                            <span style={{ color: '#ef4444', fontSize: '11px' }}>{errors[`item_${index}_price`]}</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input input-sm"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          />
                          {errors[`item_${index}_qty`] && (
                            <span style={{ color: '#ef4444', fontSize: '11px' }}>{errors[`item_${index}_qty`]}</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input input-sm"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => handleItemChange(index, 'discountPercent', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select select-sm"
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(index, 'taxRate', Number(e.target.value))}
                          >
                            <option value={0}>0% (Exempt)</option>
                            <option value={5}>5% GST</option>
                            <option value={12}>12% GST</option>
                            <option value={18}>18% GST</option>
                            <option value={28}>28% GST</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '12px', color: '#475569' }}>
                          +{formatINR(item.taxAmount)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                          {formatINR(item.lineTotal)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="table-action-icon-btn text-danger"
                            onClick={() => handleRemoveItem(index)}
                            title="Remove line item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary Card */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <div
                style={{
                  width: '340px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                  <span>Gross Subtotal:</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#16a34a', marginBottom: '6px' }}>
                  <span>Discounts Applied:</span>
                  <span>-{formatINR(discountTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                  <span>Taxable Base Value:</span>
                  <span>{formatINR(taxableTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                  <span>Applicable GST Taxes:</span>
                  <span>+{formatINR(taxTotal)}</span>
                </div>
                <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  <span>Final Quotation Total:</span>
                  <span style={{ color: '#2563eb' }}>{formatINR(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION D: Commercial Terms                              */}
          {/* ======================================================== */}
          <div className="form-section-card mb-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#2563eb', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>D</span>
              Commercial Terms &amp; Conditions
            </h4>
            <div className="form-grid-2">
              <FormField label="Payment Terms" id="quote-pay-terms">
                <select
                  id="quote-pay-terms"
                  className="form-select"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                >
                  <option value="Net 30 Days">Net 30 Days (Standard Corporate)</option>
                  <option value="100% Advance / Immediate">100% Advance / Immediate Wire</option>
                  <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                  <option value="Net 45 Days">Net 45 Days (Institutional)</option>
                  <option value="Letter of Credit (LC)">Letter of Credit (LC at Sight)</option>
                </select>
              </FormField>

              <FormField label="Delivery Terms / Timelines" id="quote-delivery-terms">
                <select
                  id="quote-delivery-terms"
                  className="form-select"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                >
                  <option value="Standard Dispatch (7-10 Days)">Standard Dispatch (7-10 Days)</option>
                  <option value="Ex-Works Pune Central Plant (3-5 Days)">Ex-Works Pune Central Plant (3-5 Days)</option>
                  <option value="Door Delivery within 5 Days">Door Delivery within 5 Days (Local Region)</option>
                  <option value="Immediate Dispatch from Hub Stock (48h)">Immediate Dispatch from Hub Stock (48h)</option>
                  <option value="Production Order Scheduled (14 Days)">Production Order Scheduled (14 Days)</option>
                </select>
              </FormField>
            </div>

            <FormField label="Notes and Terms & Conditions" id="quote-notes">
              <textarea
                id="quote-notes"
                className="form-textarea"
                rows={3}
                placeholder="Specify warranty coverage, packing standards, freight insurance terms..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog for Requesting Approval */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={() => {
          setShowSubmitConfirm(false);
          executeSave('Pending Approval');
        }}
        title="Submit quotation for approval?"
        message={
          userRole === 'sales_manager'
            ? `Quotation ${quotationNo} for ${selectedCustomer?.name || 'Customer'} (Total: ${formatINR(grandTotal)}) will be submitted for required review and approval by a Sales Coordinator.`
            : `Quotation ${quotationNo} for ${selectedCustomer?.name || 'Customer'} (Total: ${formatINR(grandTotal)}) will be submitted for review and approval by a Sales Manager or Sales Coordinator.`
        }
        confirmLabel="Submit for Approval"
        variant="info"
      />

      {/* Re-Approval Warning Dialog when Editing Approved Quotation */}
      <ConfirmDialog
        isOpen={showApprovedEditConfirm}
        onClose={() => setShowApprovedEditConfirm(false)}
        onConfirm={() => {
          setShowApprovedEditConfirm(false);
          executeSave('Pending Approval');
        }}
        title="Resubmit Approved Quotation for Approval?"
        message={
          userRole === 'sales_manager'
            ? `Editing this approved quotation will require resubmission for Sales Coordinator approval. The status will transition to "Revised—Pending Approval". The original approved version is preserved in the revision history.`
            : `Editing this approved quotation will require resubmission for Sales Manager or Sales Coordinator approval. The status will transition to "Revised—Pending Approval". The original approved version is preserved in the revision history.`
        }
        confirmLabel="Confirm & Resubmit"
        variant="warning"
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
      />
    </>
  );
}
