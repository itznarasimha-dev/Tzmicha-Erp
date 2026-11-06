import { useState, useMemo } from 'react';
import { Plus, Trash2, AlertTriangle, PackageCheck } from 'lucide-react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/formatters';

function getInitialDates() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const defaultDeliveryStr = nextWeek.toISOString().split('T')[0];
  return { todayStr, defaultDeliveryStr };
}

export default function CreateOrderModal({ isOpen, onClose, preselectedQuote = null, orderToEdit = null }) {
  const { customers, products, addSalesOrder, updateSalesOrder, quotations } = useSales();
  const { showToast } = useToast();

  const isEditing = Boolean(orderToEdit);

  const [customerId, setCustomerId] = useState(() =>
    orderToEdit ? orderToEdit.customerId : (preselectedQuote ? preselectedQuote.customerId : (customers[0]?.id || ''))
  );
  const [orderDate, setOrderDate] = useState(() =>
    orderToEdit ? (orderToEdit.orderDate || getInitialDates().todayStr) : getInitialDates().todayStr
  );
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(() =>
    orderToEdit ? (orderToEdit.requiredDeliveryDate || getInitialDates().defaultDeliveryStr) : getInitialDates().defaultDeliveryStr
  );
  const [quotationNo, setQuotationNo] = useState(() =>
    orderToEdit ? (orderToEdit.quotationNo || '') : (preselectedQuote ? preselectedQuote.quotationNo : '')
  );
  const [paymentMethod, setPaymentMethod] = useState(() =>
    orderToEdit ? (orderToEdit.paymentMethod || 'Bank Transfer / NEFT') : 'Bank Transfer / NEFT'
  );
  const [fulfilmentStatus, setFulfilmentStatus] = useState(() =>
    orderToEdit ? (orderToEdit.fulfilmentStatus || 'Confirmed') : 'Confirmed'
  );
  const [paymentStatus, setPaymentStatus] = useState(() =>
    orderToEdit ? (orderToEdit.paymentStatus || 'Unpaid') : 'Unpaid'
  );
  const [notes, setNotes] = useState(() =>
    orderToEdit ? (orderToEdit.notes || '') : (preselectedQuote ? `Created from Quotation ${preselectedQuote.quotationNo}` : '')
  );

  // Line items state
  const [items, setItems] = useState(() => {
    if (orderToEdit && orderToEdit.items && orderToEdit.items.length > 0) {
      return orderToEdit.items.map((it) => ({
        productId: it.productId,
        qty: it.orderedQty || it.qty || 1,
        unitPrice: it.unitPrice || 0,
        discountPercent: it.discountPercent || 0,
        taxRate: it.taxRate || 18,
      }));
    }
    if (preselectedQuote && preselectedQuote.items) {
      return preselectedQuote.items.map((it) => ({
        productId: it.productId,
        qty: it.qty,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent || 0,
        taxRate: it.taxRate || 18,
      }));
    }
    const firstProd = products[0] || { id: '', salePrice: 1000, taxRate: 18 };
    return [
      {
        productId: firstProd.id,
        qty: 5,
        unitPrice: firstProd.salePrice,
        discountPercent: 0,
        taxRate: firstProd.taxRate || 18,
      },
    ];
  });

  const [errors, setErrors] = useState({});

  // When quotation is selected from dropdown, populate line items & customer
  const handleSelectQuote = (quoteNo) => {
    setQuotationNo(quoteNo);
    if (!quoteNo) return;
    const q = quotations.find((quote) => quote.quotationNo === quoteNo);
    if (q) {
      setCustomerId(q.customerId);
      if (q.items && q.items.length > 0) {
        setItems(
          q.items.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            unitPrice: it.unitPrice,
            discountPercent: it.discountPercent || 0,
            taxRate: it.taxRate || 18,
          }))
        );
      }
      setNotes(`Originates from Quotation ${q.quotationNo}`);
    }
  };

  // Line calculations
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const prod = products.find((p) => p.id === item.productId || p.code === item.productId) || {};
      const qty = Number(item.qty) || 0;
      const rate = Number(item.unitPrice) || 0;
      const discPct = Number(item.discountPercent) || 0;
      const taxRate = Number(item.taxRate) || 18;

      const baseAmount = qty * rate;
      const discountAmount = Math.round((baseAmount * discPct) / 100);
      const taxableAmount = baseAmount - discountAmount;
      const taxAmount = Math.round((taxableAmount * taxRate) / 100);
      const lineTotal = taxableAmount + taxAmount;

      const isShortage = qty > (prod.availableQty || 0);

      return {
        ...item,
        productName: prod.name || item.productId,
        availableStock: prod.availableQty || 0,
        uom: prod.uom || 'Units',
        baseAmount,
        discountAmount,
        taxableAmount,
        taxAmount,
        lineTotal,
        isShortage,
      };
    });
  }, [items, products]);

  // Totals
  const { totalAmount, totalOrderedQty, hasAnyShortage } = useMemo(() => {
    let totAmt = 0;
    let totQty = 0;
    let shortage = false;

    calculatedItems.forEach((it) => {
      totAmt += it.lineTotal;
      totQty += it.qty;
      if (it.isShortage) shortage = true;
    });

    return {
      totalAmount: totAmt,
      totalOrderedQty: totQty,
      hasAnyShortage: shortage,
    };
  }, [calculatedItems]);

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      // Auto update unit price and tax if product changes
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value || p.code === value);
        if (prod) {
          copy[index].unitPrice = prod.salePrice;
          copy[index].taxRate = prod.taxRate;
        }
      }
      return copy;
    });
  };

  const handleAddItem = () => {
    const firstProd = products[0] || { id: '', salePrice: 1000, taxRate: 18 };
    setItems((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        qty: 1,
        unitPrice: firstProd.salePrice,
        discountPercent: 0,
        taxRate: firstProd.taxRate || 18,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const errs = {};
    if (!customerId) errs.customerId = 'Customer is required';
    if (!orderDate) errs.orderDate = 'Order date is required';
    if (!requiredDeliveryDate) errs.requiredDeliveryDate = 'Delivery date is required';
    if (items.length === 0) errs.items = 'At least one line item is required';

    items.forEach((it, idx) => {
      if (!it.productId) errs[`prod_${idx}`] = 'Product is required';
      if (!it.qty || it.qty <= 0) errs[`qty_${idx}`] = 'Qty must be > 0';
      if (it.unitPrice < 0) errs[`rate_${idx}`] = 'Price cannot be negative';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please correct form validation errors', 'danger');
      return;
    }

    const selectedCust = customers.find((c) => c.id === customerId);

    // Initial stock reservation calculation
    let totalReserved = 0;
    const finalItems = calculatedItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId || p.code === item.productId);
      const avail = prod ? prod.availableQty : 0;
      const reserve = Math.min(item.qty, avail);
      totalReserved += reserve;

      return {
        productId: item.productId,
        productName: item.productName,
        orderedQty: item.qty,
        reservedQty: reserve,
        dispatchedQty: 0,
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent),
        taxRate: Number(item.taxRate),
        lineTotal: item.lineTotal,
      };
    });

    try {
      if (isEditing) {
        updateSalesOrder(orderToEdit.id, {
          customerId,
          customerName: selectedCust ? selectedCust.name : orderToEdit.customerName,
          customerType: selectedCust?.type || orderToEdit.customerType || 'Distributor/Dealer',
          orderDate,
          requiredDeliveryDate,
          quotationNo: quotationNo || null,
          paymentMethod,
          fulfilmentStatus,
          paymentStatus,
          totalAmount,
          orderedQtyTotal: totalOrderedQty,
          reservedQtyTotal: totalReserved,
          missingQtyTotal: Math.max(0, totalOrderedQty - totalReserved),
          items: finalItems,
          notes,
          stockCheckNote: hasAnyShortage
            ? `Stock shortage detected. ${totalReserved} of ${totalOrderedQty} units reserved; remainder queued for warehouse allocation.`
            : `100% of requested stock (${totalOrderedQty} units) confirmed and reserved.`,
        });

        showToast(`Sales Order ${orderToEdit.orderNo} updated successfully!`, 'success');
        onClose();
        return;
      }

      const newOrder = addSalesOrder({
        customerId,
        customerName: selectedCust ? selectedCust.name : 'Customer',
        customerType: selectedCust?.type || 'Distributor/Dealer',
        orderDate,
        requiredDeliveryDate,
        quotationNo: quotationNo || null,
        paymentMethod,
        totalAmount,
        orderedQtyTotal: totalOrderedQty,
        reservedQtyTotal: totalReserved,
        missingQtyTotal: totalOrderedQty - totalReserved,
        fulfilmentStatus: hasAnyShortage ? 'Awaiting Stock' : 'Confirmed',
        items: finalItems,
        notes,
        stockCheckNote: hasAnyShortage
          ? `Stock shortage detected. ${totalReserved} of ${totalOrderedQty} units reserved; remainder queued for warehouse allocation.`
          : `100% of requested stock (${totalOrderedQty} units) confirmed and reserved.`,
      });

      showToast(`Sales Order ${newOrder.orderNo} created successfully!`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save sales order', 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Sales Order: ${orderToEdit.orderNo}` : 'Create Sales Order'}
      subtitle={
        isEditing
          ? `Customer: ${orderToEdit.customerName} • Modify items, schedule, and fulfillment status`
          : 'Register confirmed customer order, verify stock availability, and reserve warehouse inventory'
      }
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="create-order-form">
        {/* Header Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Customer *
            </label>
            <select
              className="form-select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            {errors.customerId && <span className="field-error-msg">{errors.customerId}</span>}
          </div>

          <FormField
            label="Order Date *"
            name="orderDate"
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            error={errors.orderDate}
          />

          <FormField
            label="Requested Delivery Date *"
            name="requiredDeliveryDate"
            type="date"
            value={requiredDeliveryDate}
            onChange={(e) => setRequiredDeliveryDate(e.target.value)}
            error={errors.requiredDeliveryDate}
          />

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Link Quotation (Optional)
            </label>
            <select
              className="form-select"
              value={quotationNo}
              onChange={(e) => handleSelectQuote(e.target.value)}
            >
              <option value="">Direct Sales Order (No Quote)</option>
              {quotations
                .filter((q) => !q.convertedOrderNo)
                .map((q) => (
                  <option key={q.id} value={q.quotationNo}>
                    {q.quotationNo} — {q.customerName} ({formatINR(q.grandTotal)})
                  </option>
                ))}
            </select>
          </div>

          {isEditing && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Fulfilment Status *
                </label>
                <select
                  className="form-select"
                  value={fulfilmentStatus}
                  onChange={(e) => setFulfilmentStatus(e.target.value)}
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Checking Stock">Checking Stock</option>
                  <option value="Awaiting Stock">Awaiting Stock</option>
                  <option value="Ready for Dispatch">Ready for Dispatch</option>
                  <option value="Partially Dispatched">Partially Dispatched</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Delivered">Delivered</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Payment Status *
                </label>
                <select
                  className="form-select"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid in Full</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Order Items Section */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
              Order Line Items &amp; Inventory Availability
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

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '110px' }}>Stock Avail</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '80px' }}>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Rate (₹)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '80px' }}>Disc %</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '90px' }}>GST %</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px' }}>Total (₹)</th>
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
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        style={{ fontSize: '12px', padding: '6px' }}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) — ₹{p.salePrice}
                          </option>
                        ))}
                      </select>
                      {item.isShortage && (
                        <div style={{ fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <AlertTriangle size={12} />
                          <span>Shortage: Order exceeds {item.availableStock} available units</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: item.isShortage ? '#dc2626' : '#166534',
                          background: item.isShortage ? '#fee2e2' : '#dcfce7',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          display: 'inline-block',
                        }}
                      >
                        {item.availableStock} {item.uom}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', Math.max(1, Number(e.target.value)))}
                        style={{ textAlign: 'center', fontSize: '13px', padding: '6px' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', Math.max(0, Number(e.target.value)))}
                        style={{ textAlign: 'right', fontSize: '13px', padding: '6px' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        className="form-input"
                        value={item.discountPercent}
                        onChange={(e) => handleItemChange(idx, 'discountPercent', Number(e.target.value))}
                        style={{ textAlign: 'center', fontSize: '13px', padding: '6px' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <select
                        className="form-select"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                        style={{ fontSize: '12px', padding: '6px' }}
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>
                      {formatINR(item.lineTotal)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-icon-danger"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        title="Remove product"
                        style={{ border: 'none', background: 'transparent', cursor: items.length > 1 ? 'pointer' : 'not-allowed', color: items.length > 1 ? '#dc2626' : '#cbd5e1' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Commercial Terms & Grand Total */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Payment Terms / Proposed Mode
              </label>
              <select
                className="form-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT (Standard 30 Days)</option>
                <option value="RTGS">RTGS (Immediate Clearance)</option>
                <option value="Cheque">PDC Cheque on Dispatch</option>
                <option value="UPI">Advance UPI Token Payment</option>
                <option value="Letter of Credit">Letter of Credit (LC)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Internal Delivery &amp; Packaging Notes
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Special delivery instructions or packaging criteria..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', fontSize: '12px' }}
              />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
              <span>Total Ordered Units:</span>
              <strong>{totalOrderedQty} units</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
              <span>Inventory Status:</span>
              <span style={{ color: hasAnyShortage ? '#d97706' : '#166534', fontWeight: '700' }}>
                {hasAnyShortage ? '⚠️ Partial Availability (Backorder)' : '✓ 100% In Stock'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#0f172a', borderTop: '2px solid #cbd5e1', paddingTop: '10px', marginTop: '10px' }}>
              <span>Grand Total:</span>
              <span style={{ color: '#2563eb' }}>{formatINR(totalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-icon-text">
            <PackageCheck size={16} />
            <span>{isEditing ? 'Save Order Changes' : 'Confirm & Place Sales Order'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
