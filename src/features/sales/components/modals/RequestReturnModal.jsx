import { useState } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/formatters';
import { AlertTriangle } from 'lucide-react';

export default function RequestReturnModal({ isOpen, onClose }) {
  const { customers, orders, products, addReturnRequest } = useSales();
  const { showToast } = useToast();

  const [customerId, setCustomerId] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [productCode, setProductCode] = useState('');
  const [qty, setQty] = useState('1');
  const [batchOrSerial, setBatchOrSerial] = useState('');
  const [reason, setReason] = useState('Defective item detected during customer inspection');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const eligibleOrders = orders.filter((o) => !customerId || o.customerId === customerId);
  const selectedProduct = products.find((p) => p.code === productCode);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!customerId) errs.customerId = 'Please select a customer';
    if (!productCode) errs.productCode = 'Please select the product being returned';
    if (!qty || Number(qty) <= 0) errs.qty = 'Quantity must be > 0';
    if (!reason.trim()) errs.reason = 'Please state the return reason';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const newReturn = addReturnRequest({
      customerId,
      customerName: selectedCustomer ? selectedCustomer.name : 'Customer',
      orderNo: orderNo || 'SO-2026-Direct',
      productCode,
      productName: selectedProduct ? selectedProduct.name : 'Industrial Product',
      qty: Number(qty),
      batchOrSerial: batchOrSerial || 'N/A',
      reason,
      notes,
    });

    showToast(
      `Return request ${newReturn.returnNo} registered! Goods quarantined for QC inspection.`,
      'success'
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Initiate Sales Return (RMA)"
      subtitle="Register customer return goods with quarantine isolation and QC inspection workflows"
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Create RMA Record
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="return-form">
        <div className="form-grid-2">
          <FormField label="Customer" id="ret-cust" required error={errors.customerId}>
            <select
              id="ret-cust"
              className="form-select"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setOrderNo('');
              }}
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Original Sales Order" id="ret-order">
            <select
              id="ret-order"
              className="form-select"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
            >
              <option value="">Select original order (if known)...</option>
              {eligibleOrders.map((o) => (
                <option key={o.id} value={o.orderNo}>
                  {o.orderNo} — {formatINR(o.totalAmount)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="form-grid-3">
          <FormField label="Product" id="ret-prod" required error={errors.productCode}>
            <select
              id="ret-prod"
              className="form-select"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Return Quantity" id="ret-qty" required error={errors.qty}>
            <input
              type="number"
              id="ret-qty"
              className="form-input"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </FormField>

          <FormField label="Batch or Serial Reference" id="ret-batch" helperText="e.g. Batch BTH-081 or SN-1044">
            <input
              type="text"
              id="ret-batch"
              className="form-input"
              placeholder="e.g. BTH-2026-072"
              value={batchOrSerial}
              onChange={(e) => setBatchOrSerial(e.target.value)}
            />
          </FormField>
        </div>

        <div className="form-group mb-4">
          <label htmlFor="ret-reason" className="form-label">
            Return Reason <span className="text-danger">*</span>
          </label>
          <select
            id="ret-reason"
            className="form-select mb-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="Defective casting / machining crack">Defective casting / machining crack</option>
            <option value="Transit damage during courier shipping">Transit damage during courier shipping</option>
            <option value="Incorrect specification / size shipped">Incorrect specification / size shipped</option>
            <option value="Customer ordered excess quantities">Customer ordered excess quantities</option>
            <option value="Failed customer incoming quality test">Failed customer incoming quality test</option>
          </select>
          {errors.reason && <span className="form-error-msg">{errors.reason}</span>}
        </div>

        <FormField label="Receiving Remarks" id="ret-notes">
          <textarea
            id="ret-notes"
            className="form-textarea"
            rows="2"
            placeholder="Receiving dock observations, packaging state, photos taken..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>

        {/* Quarantine rule callout */}
        <div className="alert-callout alert-callout-warning">
          <AlertTriangle size={18} className="callout-icon" />
          <div className="callout-text text-xs">
            <strong>ERP Quarantine Policy:</strong> Returned stock is marked as <em>&quot;Awaiting QC Inspection&quot;</em> and moved into Quarantine. It is <strong>NOT</strong> added to available saleable stock until Quality formally inspects and releases it. Credit note issuance requires Finance sign-off.
          </div>
        </div>
      </form>
    </Modal>
  );
}
