import { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import StatusBadge from '../common/StatusBadge';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { Plus, Trash2, ShieldAlert, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export default function EditOrderModal({ isOpen, onClose, order }) {
  const { customers, products, dispatches = [], invoices = [], updateSalesOrder, userRole } = useSales();
  const { showToast } = useToast();

  if (!order) return null;

  return (
    <EditOrderModalContent
      isOpen={isOpen}
      onClose={onClose}
      order={order}
      customers={customers}
      products={products}
      dispatches={dispatches}
      invoices={invoices}
      updateSalesOrder={updateSalesOrder}
      showToast={showToast}
      userRole={userRole}
    />
  );
}

function EditOrderModalContent({
  isOpen,
  onClose,
  order,
  customers,
  products,
  dispatches,
  invoices,
  updateSalesOrder,
  showToast,
  userRole,
}) {
  const initialCust = useMemo(() => {
    return customers.find(
      (c) => c.id === order.customerId || c.customerId === order.customerId || c.code === order.customerId || c.name === order.customerName
    );
  }, [customers, order]);

  const [customerId, setCustomerId] = useState(() => initialCust?.id || order.customerId || '');
  const [enteredCustomerId, setEnteredCustomerId] = useState(() => initialCust?.customerId || initialCust?.code || order.customerId || '');
  const [lookupError, setLookupError] = useState('');

  const currentCustomer = useMemo(() => {
    return customers.find(
      (c) => c.id === customerId || c.customerId === customerId || c.code === customerId || c.name === order.customerName
    );
  }, [customers, customerId, order.customerName]);

  const handleCustomerIdInput = (val) => {
    setEnteredCustomerId(val);
    if (!val.trim()) {
      setLookupError('');
      return;
    }
    const clean = val.trim().toLowerCase();
    const matched = customers.find(
      (c) =>
        (c.customerId && c.customerId.toLowerCase() === clean) ||
        (c.id && c.id.toLowerCase() === clean) ||
        (c.code && c.code.toLowerCase() === clean)
    );
    if (matched) {
      setCustomerId(matched.id);
      setLookupError('');
    } else {
      setLookupError(`Customer ID "${val.trim()}" not found in records.`);
    }
  };

  const handleCustomerSelect = (id) => {
    setCustomerId(id);
    const matched = customers.find((c) => c.id === id);
    if (matched) {
      setEnteredCustomerId(matched.customerId || matched.code || matched.id);
      setLookupError('');
    }
  };

  const [orderDate, setOrderDate] = useState(() => order.orderDate || '');
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(() => order.requiredDeliveryDate || '');
  const [errors, setErrors] = useState({});

  // Line items state
  const [items, setItems] = useState(() => {
    if (order.items && order.items.length > 0) {
      return order.items.map((it) => ({
        productId: it.productId,
        qty: Number(it.orderedQty || it.qty || 1),
        unitPrice: Number(it.unitPrice || 0),
        discountPercent: Number(it.discountPercent || 0),
        taxRate: Number(it.taxRate || 18),
        dispatchedQty: Number(it.dispatchedQty || 0),
      }));
    }
    const firstProd = products[0] || { id: '', price: 1000, gstRate: 18 };
    return [
      {
        productId: firstProd.id,
        qty: 1,
        unitPrice: firstProd.price || firstProd.salePrice || 1000,
        discountPercent: 0,
        taxRate: firstProd.gstRate || firstProd.taxRate || 18,
        dispatchedQty: 0,
      },
    ];
  });

  // Calculate actual total dispatched from dispatch records
  const totalDispatched = useMemo(() => {
    const orderDispatches = dispatches.filter(
      (d) => d.orderNo === order.orderNo || d.orderNo === order.id
    );
    const fromRecords = orderDispatches.reduce((sum, d) => {
      return sum + (d.items || []).reduce((itemSum, it) => itemSum + (Number(it.qty) || 0), 0);
    }, 0);
    const fromItems = (order.items || []).reduce(
      (sum, it) => sum + (Number(it.dispatchedQty) || 0),
      0
    );
    return Math.max(fromRecords, fromItems);
  }, [dispatches, order]);

  // Find linked invoice reference
  const linkedInvoiceNo = useMemo(() => {
    if (order.invoiceNo) return order.invoiceNo;
    const inv = invoices.find((i) => i.orderNo === order.orderNo || (order.quotationNo && i.quotationNo === order.quotationNo));
    return inv ? inv.invoiceNo : '—';
  }, [invoices, order]);

  // Recalculate line totals automatically based on catalog pricing and updated qty
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const prod = products.find((p) => p.id === item.productId || p.code === item.productId) || {};
      const qty = Number(item.qty) || 1;
      const rate = Number(item.unitPrice) || Number(prod.price || prod.salePrice || 0);
      const discPct = Number(item.discountPercent) || 0;
      const taxRate = Number(item.taxRate) || Number(prod.gstRate || prod.taxRate || 18);

      const baseAmount = qty * rate;
      const discountAmount = Math.round((baseAmount * discPct) / 100);
      const taxableAmount = Math.max(0, baseAmount - discountAmount);
      const taxAmount = Math.round((taxableAmount * taxRate) / 100);
      const lineTotal = taxableAmount + taxAmount;

      return {
        ...item,
        productName: prod.name || item.productId,
        availableStock: prod.availableQty || 0,
        uom: prod.uom || 'Units',
        unitPrice: rate,
        discountPercent: discPct,
        taxRate,
        lineTotal,
      };
    });
  }, [items, products]);

  // Totals
  const { totalAmount, totalOrderedQty } = useMemo(() => {
    let totAmt = 0;
    let totQty = 0;
    calculatedItems.forEach((it) => {
      totAmt += it.lineTotal;
      totQty += it.qty;
    });
    return {
      totalAmount: totAmt,
      totalOrderedQty: totQty,
    };
  }, [calculatedItems]);

  const handleProductChange = (index, newProductId) => {
    const prod = products.find((p) => p.id === newProductId || p.code === newProductId);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: newProductId,
        unitPrice: prod ? Number(prod.price || prod.salePrice || 0) : copy[index].unitPrice,
        taxRate: prod ? Number(prod.gstRate || prod.taxRate || 18) : copy[index].taxRate,
      };
      return copy;
    });
  };

  const handleQtyChange = (index, newQty) => {
    const val = Math.max(1, parseInt(newQty, 10) || 1);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], qty: val };
      return copy;
    });
  };

  const handleAddItem = () => {
    const firstProd = products[0] || { id: '', price: 1000, gstRate: 18 };
    setItems((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        qty: 1,
        unitPrice: firstProd.price || firstProd.salePrice || 1000,
        discountPercent: 0,
        taxRate: firstProd.gstRate || firstProd.taxRate || 18,
        dispatchedQty: 0,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      showToast('At least one product item is required in the sales order', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const errs = {};
    if (!customerId) errs.customerId = 'Customer is required';
    if (!orderDate) errs.orderDate = 'Order date is required';
    if (!requiredDeliveryDate) errs.requiredDeliveryDate = 'Delivery target date is required';
    if (items.length === 0) errs.items = 'At least one line item is required';

    items.forEach((it, idx) => {
      if (!it.productId) errs[`prod_${idx}`] = 'Product is required';
      if (!it.qty || it.qty <= 0) errs[`qty_${idx}`] = 'Qty must be > 0';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please correct form errors before saving', 'danger');
      return;
    }

    const selectedCust = customers.find((c) => c.id === customerId);

    // Process line items preserving already reserved/dispatched counts
    const finalItems = calculatedItems.map((item) => {
      const existing = (order.items || []).find((i) => i.productId === item.productId);
      const prevReserved = existing ? Number(existing.reservedQty || 0) : 0;
      const prevDispatched = existing ? Number(existing.dispatchedQty || 0) : 0;

      return {
        productId: item.productId,
        productName: item.productName,
        orderedQty: item.qty,
        reservedQty: Math.min(item.qty, prevReserved),
        dispatchedQty: prevDispatched,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      };
    });

    const amountPaid = Number(order.amountPaid || 0);
    const newPendingBalance = Math.max(0, totalAmount - amountPaid);

    try {
      updateSalesOrder(order.id, {
        customerId,
        customerName: selectedCust ? selectedCust.name : order.customerName,
        customerType: selectedCust?.type || order.customerType,
        orderDate,
        requiredDeliveryDate,
        items: finalItems,
        totalAmount,
        orderedQtyTotal: totalOrderedQty,
        pendingBalance: newPendingBalance,
      });

      showToast(`Sales Order ${order.orderNo} updated successfully!`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to update order', 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`Edit Sales Order: ${order.orderNo}`}
      subtitle={`Customer: ${order.customerName} • Ordered on ${formatDate(order.orderDate)}`}
      footer={
        <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Save Changes
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="edit-order-form">
        {/* Governance / Read-Only Metadata Banner */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sales Order #
            </span>
            <strong style={{ fontSize: '13px', color: '#2563eb' }}>{order.orderNo}</strong>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Linked Quotation #
            </span>
            <strong style={{ fontSize: '13px', color: '#334155' }}>{order.quotationNo || 'Direct / None'}</strong>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Invoice Reference
            </span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{linkedInvoiceNo}</span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Fulfillment Status
            </span>
            <div style={{ marginTop: '2px' }}>
              <StatusBadge status={order.fulfilmentStatus} size="small" />
            </div>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Payment Status
            </span>
            <div style={{ marginTop: '2px' }}>
              <StatusBadge status={order.paymentStatus || 'Unpaid'} size="small" />
            </div>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Dispatched
            </span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{totalDispatched} units</strong>
          </div>
        </div>

        {/* Informational Callout */}
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#1e40af',
          }}
        >
          <ShieldAlert size={16} className="shrink-0 text-blue-600" />
          <span>
            <strong>Sales Representative Permissions:</strong> You can modify customer assignment, order date, delivery target, products, and ordered quantities. Sales order number, linked quotation, dispatch records, fulfillment states, and payment records are maintained by Store/Dispatch and Finance operations.
          </span>
        </div>

        {/* Customer Identification with Enter/Paste Lookup */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Enter or Paste Customer ID *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontWeight: '600' }}
                  placeholder="e.g. CUS-000001 or CUST-001"
                  value={enteredCustomerId}
                  onChange={(e) => handleCustomerIdInput(e.target.value)}
                />
              </div>
              {lookupError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{lookupError}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Or Select From Saved Records
              </label>
              <select
                className="form-select"
                value={customerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerId || c.code || c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-populated Verified Customer Summary */}
          {currentCustomer ? (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="font-semibold text-slate-800" style={{ fontSize: '13px' }}>
                  {currentCustomer.name}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: '#059669',
                    background: '#ecfdf5',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: '600',
                  }}
                >
                  <CheckCircle2 size={13} />
                  Verified: {currentCustomer.customerId || currentCustomer.code || currentCustomer.id}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px', color: '#475569' }}>
                <div><strong>Contact:</strong> {currentCustomer.contactPerson || '—'} {currentCustomer.designation ? `(${currentCustomer.designation})` : ''}</div>
                <div><strong>Phone:</strong> {currentCustomer.phone || '—'}</div>
                <div><strong>Email:</strong> {currentCustomer.email || '—'}</div>
                <div><strong>GSTIN:</strong> {currentCustomer.gstin || 'Not Registered / None'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Billing Address:</strong> {currentCustomer.address || '—'}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#dc2626' }}>
              Please enter a valid Customer ID or select a customer from records.
            </div>
          )}
          {errors.customerId && <span className="field-error-msg">{errors.customerId}</span>}
        </div>

        {/* Editable Dates Details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '18px',
          }}
        >
          <FormField
            label="Order Date *"
            name="orderDate"
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            error={errors.orderDate}
          />

          <FormField
            label="Delivery Target Date *"
            name="requiredDeliveryDate"
            type="date"
            value={requiredDeliveryDate}
            onChange={(e) => setRequiredDeliveryDate(e.target.value)}
            error={errors.requiredDeliveryDate}
          />
        </div>

        {/* Line Items Table */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
              Order Products &amp; Quantities
            </h4>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon-text"
              onClick={handleAddItem}
              title="Add product to order"
            >
              <Plus size={13} />
              <span>Add Product</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Product Selection</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '100px' }}>Stock Avail</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '90px' }}>Ordered Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '110px' }}>Rate (₹)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '80px' }}>GST %</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px' }}>Line Total (₹)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {calculatedItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        className="form-select"
                        value={item.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        style={{ fontSize: '12px', padding: '6px' }}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) — {formatINR(p.salePrice)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span className="text-xs text-slate-600 font-medium">{item.availableStock} units</span>
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={item.qty}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        style={{ width: '75px', textAlign: 'center', padding: '4px', fontSize: '12px' }}
                        required
                      />
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                      <span className="text-xs font-mono">{formatINR(item.unitPrice)}</span>
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>
                      <span className="text-xs">{item.taxRate}%</span>
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <strong className="text-xs text-slate-900">{formatINR(item.lineTotal)}</strong>
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="table-action-icon-btn text-danger"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove product"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculated Financial Summary Cards */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
              Total Ordered Quantity
            </span>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>{totalOrderedQty} units</strong>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
              Recalculated Order Value
            </span>
            <strong style={{ fontSize: '15px', color: '#0f172a' }}>{formatINR(totalAmount)}</strong>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
              Amount Paid
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
              {formatINR(order.amountPaid || 0)}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
              Updated Pending Balance
            </span>
            <strong style={{ fontSize: '15px', color: Math.max(0, totalAmount - (order.amountPaid || 0)) > 0 ? '#dc2626' : '#059669' }}>
              {formatINR(Math.max(0, totalAmount - (order.amountPaid || 0)))}
            </strong>
          </div>
        </div>
      </form>
    </Modal>
  );
}
