import { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { DEFAULT_COMPANY_CONFIG } from '../../data/mockData';
import {
  Search,
  CheckCircle,
  Building2,
  FileText,
  AlertCircle,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';

export default function CreateInvoiceModal({ isOpen, onClose }) {
  const { customers, orders, quotations, products, addInvoice, payments = [], userProfile, userRole, companyConfig = DEFAULT_COMPANY_CONFIG } = useSales();
  const { showToast } = useToast();

  const [customerIdInput, setCustomerIdInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderNo, setSelectedOrderNo] = useState('');
  const [selectedQuotationNo, setSelectedQuotationNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('Standard 30-day payment terms apply. Goods supplied in verified condition.');
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomerIdInput('');
      setSelectedCustomerId('');
      setSelectedOrderNo('');
      setSelectedQuotationNo('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split('T')[0]);
      setNotes('Standard 30-day payment terms apply. Goods supplied in verified condition.');
      setItems([]);
      setErrors({});
    }
  }, [isOpen]);

  // Autofill lookup: Match Customer by ID (e.g. CUS-000004 or CUST-004) or Name
  const matchedCustomer = useMemo(() => {
    if (!customerIdInput.trim()) return null;
    const clean = customerIdInput.trim().toLowerCase();
    return customers.find(
      (c) =>
        (c.customerId && c.customerId.toLowerCase() === clean) ||
        (c.id && c.id.toLowerCase() === clean) ||
        (c.name && c.name.toLowerCase().includes(clean))
    );
  }, [customerIdInput, customers]);

  // If customer is matched via input, update selectedCustomerId
  useEffect(() => {
    if (matchedCustomer) {
      setSelectedCustomerId(matchedCustomer.id);
    }
  }, [matchedCustomer]);

  // Currently resolved customer record
  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || matchedCustomer || null;
  }, [customers, selectedCustomerId, matchedCustomer]);

  // Orders available for this customer
  const customerOrders = useMemo(() => {
    if (!currentCustomer) return [];
    return orders.filter(
      (o) =>
        o.customerId === currentCustomer.id ||
        o.customerId === currentCustomer.customerId ||
        o.customerName === currentCustomer.name
    );
  }, [orders, currentCustomer]);

  // Finalized quotations available for this customer
  const customerQuotations = useMemo(() => {
    if (!currentCustomer) return [];
    return quotations.filter(
      (q) =>
        (q.status === 'Approved' || q.status === 'Accepted' || q.status === 'Converted') &&
        (q.customerId === currentCustomer.id ||
          q.customerId === currentCustomer.customerId ||
          q.customerName === currentCustomer.name)
    );
  }, [quotations, currentCustomer]);

  // Verify if associated payment or advance exists for Sales roles
  const hasAssociatedPayment = useMemo(() => {
    if (userRole === 'admin') return true; // Admin creates invoices independently
    if (!currentCustomer) return false;
    return payments.some((p) => {
      const matchOrder = selectedOrderNo && (p.orderNo === selectedOrderNo || p.linkedOrderNo === selectedOrderNo);
      const matchCust = p.customerId === currentCustomer.id || p.customerId === currentCustomer.customerId || p.customerName === currentCustomer.name;
      return Boolean(matchOrder || matchCust);
    });
  }, [userRole, currentCustomer, selectedOrderNo, payments]);

  // When user selects a Sales Order, carry over line items, pricing, discounts, and taxes
  const handleSelectOrder = (orderNo) => {
    setSelectedOrderNo(orderNo);
    const ord = orders.find((o) => o.orderNo === orderNo || o.id === orderNo);
    if (!ord) return;

    if (ord.quotationNo) {
      setSelectedQuotationNo(ord.quotationNo);
    }

    if (ord.items && ord.items.length > 0) {
      const mapped = ord.items.map((it) => {
        const unitPrice = Number(it.unitPrice || 0);
        const qty = Number(it.qty || it.orderedQty || 1);
        const disc = Number(it.discountPercent || 0);
        const taxable = unitPrice * qty * (1 - disc / 100);
        const taxRate = Number(it.taxRate || 18);
        const taxAmt = taxable * (taxRate / 100);
        const lineTotal = taxable + taxAmt;

        return {
          productId: it.productId,
          productName: it.productName,
          uom: it.uom || 'Nos',
          unitPrice,
          qty,
          discountPercent: disc,
          taxRate,
          taxableValue: taxable,
          lineTotal,
        };
      });
      setItems(mapped);
    }
  };

  // When user selects a finalized Quotation
  const handleSelectQuotation = (quoteNo) => {
    setSelectedQuotationNo(quoteNo);
    const quote = quotations.find((q) => q.quotationNo === quoteNo || q.id === quoteNo);
    if (!quote) return;

    if (quote.convertedOrderNo) {
      setSelectedOrderNo(quote.convertedOrderNo);
    }

    if (quote.items && quote.items.length > 0) {
      const mapped = quote.items.map((it) => {
        const unitPrice = Number(it.unitPrice || 0);
        const qty = Number(it.qty || 1);
        const disc = Number(it.discountPercent || 0);
        const taxable = unitPrice * qty * (1 - disc / 100);
        const taxRate = Number(it.taxRate || 18);
        const taxAmt = taxable * (taxRate / 100);
        const lineTotal = taxable + taxAmt;

        return {
          productId: it.productId,
          productName: it.productName,
          uom: it.uom || 'Nos',
          unitPrice,
          qty,
          discountPercent: disc,
          taxRate,
          taxableValue: taxable,
          lineTotal,
        };
      });
      setItems(mapped);
    }
  };

  // Add blank manual line item
  const handleAddLineItem = () => {
    const defaultProduct = products[0] || {};
    const unitPrice = Number(defaultProduct.unitPrice || 1000);
    const taxable = unitPrice;
    const taxRate = 18;
    const lineTotal = taxable * 1.18;

    setItems((prev) => [
      ...prev,
      {
        productId: defaultProduct.id || 'PROD-NEW',
        productName: defaultProduct.name || 'Commercial Item',
        uom: defaultProduct.uom || 'Nos',
        unitPrice,
        qty: 1,
        discountPercent: 0,
        taxRate,
        taxableValue: taxable,
        lineTotal,
      },
    ]);
  };

  const handleUpdateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          current.productName = prod.name;
          current.unitPrice = Number(prod.unitPrice || 0);
          current.uom = prod.uom || 'Nos';
        }
      }

      const unitPrice = Number(current.unitPrice || 0);
      const qty = Number(current.qty || 1);
      const disc = Number(current.discountPercent || 0);
      const taxable = unitPrice * qty * (1 - disc / 100);
      const taxRate = Number(current.taxRate || 18);
      const taxAmt = taxable * (taxRate / 100);

      current.taxableValue = taxable;
      current.lineTotal = taxable + taxAmt;

      updated[index] = current;
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Computed Totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    items.forEach((it) => {
      const raw = Number(it.unitPrice || 0) * Number(it.qty || 1);
      const disc = raw * (Number(it.discountPercent || 0) / 100);
      const taxable = raw - disc;
      const tax = taxable * (Number(it.taxRate || 18) / 100);

      subtotal += raw;
      totalDiscount += disc;
      taxableTotal += taxable;
      taxTotal += tax;
      grandTotal += taxable + tax;
    });

    const cgst = Math.round(taxTotal / 2);
    const sgst = taxTotal - cgst;

    return {
      subtotal,
      totalDiscount,
      taxableTotal,
      cgst,
      sgst,
      taxTotal,
      grandTotal: Math.round(grandTotal),
    };
  }, [items]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!currentCustomer) {
      newErrors.customer = 'Please enter or select a valid Customer ID';
    }
    if (!invoiceDate) {
      newErrors.invoiceDate = 'Invoice Date is required';
    }
    if (!dueDate) {
      newErrors.dueDate = 'Due Date is required';
    }
    if (items.length === 0) {
      newErrors.items = 'At least one line item is required to generate an invoice';
    }
    if (userRole !== 'admin' && !hasAssociatedPayment) {
      newErrors.payment = 'Sales Rule: Invoices can only be created after customer payment or advance has been successfully recorded. (Admin can create independently).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please correct the validation errors before submitting.', 'danger');
      return;
    }

    try {
      const newInvoice = addInvoice({
        customerId: currentCustomer.id,
        customerDisplayId: currentCustomer.customerId || currentCustomer.id,
        customerName: currentCustomer.name,
        customerPhone: currentCustomer.phone || '',
        customerEmail: currentCustomer.email || '',
        customerAddress: currentCustomer.address || currentCustomer.city || '',
        customerGstin: currentCustomer.gstin || '',
        orderNo: selectedOrderNo || null,
        quotationNo: selectedQuotationNo || null,
        invoiceDate,
        dueDate,
        totalAmount: totals.grandTotal,
        taxAmount: totals.taxTotal,
        taxBreakdown: {
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: 0,
        },
        items,
        notes,
        status: 'Pending Approval',
        approvalStatus: 'Pending Approval',
      });

      showToast(`Tax Invoice ${newInvoice.invoiceNo} generated. Routed to Finance for authorization.`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xlarge"
      title="Create Commercial Sales Invoice"
      subtitle="Generate official GST Tax Invoice from confirmed Sales Orders or finalized Quotations"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} className="text-primary" />
            <span>Finance Rule: Invoices require Accountant or Account Manager approval prior to issuance.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Submit for Finance Authorization
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="create-invoice-form">
        {/* Section 1: Customer ID Search & Autofill */}
        <div className="section-title mb-2">1. Customer Identification &amp; Autofill</div>
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '12px' }}>
            <div>
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b' }}>
                Enter / Paste Customer ID <span className="text-danger">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className={`form-control font-mono ${errors.customer ? 'is-invalid' : ''}`}
                  placeholder="e.g. CUS-000004 or CUST-004"
                  value={customerIdInput}
                  onChange={(e) => setCustomerIdInput(e.target.value)}
                  style={{ paddingLeft: '32px', fontWeight: '600' }}
                />
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
              </div>
              {errors.customer && <div className="text-danger text-xs mt-1">{errors.customer}</div>}
              <span className="text-xs text-muted block mt-1">
                Type or paste Customer ID to auto-resolve details and linked orders.
              </span>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b' }}>
                Or Select from Customer Directory
              </label>
              <select
                className="form-control"
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const found = customers.find((c) => c.id === e.target.value);
                  if (found) {
                    setCustomerIdInput(found.customerId || found.id);
                  }
                }}
              >
                <option value="">-- Choose registered customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerId || c.id} — {c.name} ({c.city || 'Commercial'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Autofilled Details Card */}
          {currentCustomer ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                fontSize: '12px',
              }}
            >
              <div>
                <span className="text-muted block text-xs">Customer Name:</span>
                <strong className="text-slate-900 font-semibold">{currentCustomer.name}</strong>
              </div>
              <div>
                <span className="text-muted block text-xs">Customer ID:</span>
                <span className="font-mono text-primary font-bold">{currentCustomer.customerId || currentCustomer.id}</span>
              </div>
              <div>
                <span className="text-muted block text-xs">Contact Person:</span>
                <span className="font-medium text-slate-800">{currentCustomer.contactPerson || 'Procurement In-Charge'}</span>
              </div>
              <div>
                <span className="text-muted block text-xs">Phone &amp; Email:</span>
                <span className="text-slate-700">{currentCustomer.phone} | {currentCustomer.email}</span>
              </div>
              <div>
                <span className="text-muted block text-xs">GSTIN:</span>
                <span className="font-mono font-semibold text-slate-800">{currentCustomer.gstin || 'Unregistered'}</span>
              </div>
              <div>
                <span className="text-muted block text-xs">Billing Address:</span>
                <span className="text-slate-700">{currentCustomer.address || currentCustomer.city || 'Commercial Premises'}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px', color: '#64748b' }}>
              No customer resolved yet. Enter a valid Customer ID above to auto-populate customer profile and associated orders.
            </div>
          )}
        </div>

        {/* Section 2: Order / Quotation Linkage */}
        {currentCustomer && (
          <>
            <div className="section-title mb-2">2. Sales Order &amp; Quotation Association</div>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}
            >
              <div>
                <label className="form-label" style={{ fontWeight: '600' }}>
                  Confirmed Sales Order (Auto-loads line items)
                </label>
                <select
                  className="form-control font-mono"
                  value={selectedOrderNo}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                >
                  <option value="">-- Select linked Sales Order --</option>
                  {customerOrders.map((o) => (
                    <option key={o.id} value={o.orderNo}>
                      {o.orderNo} — {formatDate(o.orderDate)} — {formatINR(o.totalAmount)} ({o.paymentStatus || 'Active'})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted block mt-1">
                  {customerOrders.length} confirmed sales order{customerOrders.length === 1 ? '' : 's'} on record.
                </span>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: '600' }}>
                  Finalized Quotation Reference
                </label>
                <select
                  className="form-control font-mono"
                  value={selectedQuotationNo}
                  onChange={(e) => handleSelectQuotation(e.target.value)}
                >
                  <option value="">-- Select linked Quotation --</option>
                  {customerQuotations.map((q) => (
                    <option key={q.id} value={q.quotationNo}>
                      {q.quotationNo} — {formatDate(q.createdDate)} — {formatINR(q.grandTotal)} ({q.status})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted block mt-1">
                  {customerQuotations.length} finalized quotation{customerQuotations.length === 1 ? '' : 's'} on record.
                </span>
              </div>
            </div>
          </>
        )}

        {/* Section 3: Invoice Dates & Commercial Terms */}
        <div className="section-title mb-2">3. Invoice Dates &amp; Commercial Terms</div>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 2fr',
            gap: '16px',
          }}
        >
          <div>
            <label className="form-label font-semibold">
              Invoice Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label font-semibold">
              Payment Due Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label font-semibold">Invoice Memo / Commercial Remarks</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Delivered per PO-8891. 30 days payment settlement."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Section 4: Itemized Product Table */}
        <div className="section-title mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>4. Itemized Goods &amp; Taxable Values</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon-text"
            onClick={handleAddLineItem}
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            <Plus size={13} />
            <span>Add Item</span>
          </button>
        </div>

        {errors.items && <div className="text-danger text-xs mb-2 font-semibold">{errors.items}</div>}

        <div className="table-responsive mb-3" style={{ maxHeight: '220px', overflowY: 'auto' }}>
          <table className="enterprise-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Product SKU &amp; Name</th>
                <th style={{ width: '12%', textAlign: 'center' }}>Qty</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Unit Rate (₹)</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Disc %</th>
                <th style={{ width: '10%', textAlign: 'center' }}>GST %</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Line Total (₹)</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                    No items loaded. Select a Sales Order / Quotation above or click &ldquo;Add Item&rdquo;.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-control"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        value={it.productId}
                        onChange={(e) => handleUpdateItem(idx, 'productId', e.target.value)}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.id} — {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        style={{ textAlign: 'center', fontSize: '12px', padding: '4px' }}
                        value={it.qty}
                        onChange={(e) => handleUpdateItem(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        style={{ textAlign: 'right', fontSize: '12px', padding: '4px' }}
                        value={it.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, 'unitPrice', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-control"
                        style={{ textAlign: 'center', fontSize: '12px', padding: '4px' }}
                        value={it.discountPercent}
                        onChange={(e) => handleUpdateItem(idx, 'discountPercent', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ textAlign: 'center', fontSize: '12px', padding: '4px' }}
                        value={it.taxRate}
                        onChange={(e) => handleUpdateItem(idx, 'taxRate', e.target.value)}
                      >
                        <option value="18">18%</option>
                        <option value="12">12%</option>
                        <option value="5">5%</option>
                        <option value="0">0%</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatINR(it.lineTotal)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="table-action-icon-btn text-danger"
                        onClick={() => handleRemoveItem(idx)}
                        title="Remove Line Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Section 5: Financial Summary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '16px' }}>
          {/* Dedicated Company Bank Details Snapshot */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px', fontSize: '12px' }}>
            <strong style={{ color: '#166534', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ApexERP Company Bank Details (Remit Payment To)
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', color: '#1e293b' }}>
              <div>Beneficiary: <strong>{companyConfig.bankDetails?.accountHolderName || DEFAULT_COMPANY_CONFIG.bankDetails.accountHolderName}</strong></div>
              <div>Bank: <strong>{companyConfig.bankDetails?.bankName || DEFAULT_COMPANY_CONFIG.bankDetails.bankName}</strong></div>
              <div>A/C No: <strong className="font-mono">{companyConfig.bankDetails?.accountNumber || DEFAULT_COMPANY_CONFIG.bankDetails.accountNumber}</strong></div>
              <div>IFSC Code: <strong className="font-mono">{companyConfig.bankDetails?.ifscCode || DEFAULT_COMPANY_CONFIG.bankDetails.ifscCode}</strong></div>
              <div>Collection UPI: <strong>{companyConfig.bankDetails?.upiId || DEFAULT_COMPANY_CONFIG.bankDetails.upiId}</strong></div>
              <div>Branch: <strong>{companyConfig.bankDetails?.branch || DEFAULT_COMPANY_CONFIG.bankDetails.branch}</strong></div>
            </div>
          </div>

          {/* Grand Totals Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
              <span>Gross Product Subtotal:</span>
              <span>{formatINR(totals.subtotal)}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#16a34a' }}>
                <span>Discount Total:</span>
                <span>-{formatINR(totals.totalDiscount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
              <span>Taxable Value:</span>
              <span>{formatINR(totals.taxableTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
              <span>CGST (9%):</span>
              <span>+{formatINR(totals.cgst)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
              <span>SGST (9%):</span>
              <span>+{formatINR(totals.sgst)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px solid #cbd5e1',
                paddingTop: '6px',
                marginTop: '6px',
                fontSize: '15px',
                fontWeight: '800',
                color: '#0f172a',
              }}
            >
              <span>Invoice Grand Total:</span>
              <span className="text-primary">{formatINR(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Section 6: Finance Approval Workflow Notice */}
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#92400e',
          }}
        >
          <AlertCircle size={18} className="text-warning" style={{ flexShrink: 0 }} />
          <div>
            <strong>Finance Authorization Workflow:</strong> Under ApexERP internal controls, invoices submitted by Sales are placed into <strong>Pending Approval</strong> state. The invoice must be reviewed and approved by either the <strong>Accountant OR Account Manager</strong> before it is formally issued and eligible for customer receipt clearance.
          </div>
        </div>
      </form>
    </Modal>
  );
}
