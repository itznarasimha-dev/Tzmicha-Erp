import { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/formatters';

export default function RecordPaymentModal({
  isOpen,
  onClose,
  preselectedInvoice = null,
}) {
  const { invoices, payments, recordCustomerPayment } = useSales();
  const { showToast } = useToast();

  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState('');
  const [customAmount, setCustomAmount] = useState(null);
  const [method, setMethod] = useState('Bank Transfer / NEFT');
  const [paymentType, setPaymentType] = useState('Advance Payment');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Invoices with outstanding balances
  const unpaidInvoices = useMemo(() => invoices.filter((i) => i.balance > 0), [invoices]);

  const activeInvoiceNo = selectedInvoiceNo || preselectedInvoice?.invoiceNo || unpaidInvoices[0]?.invoiceNo || '';
  const selectedInvoice = invoices.find((i) => i.invoiceNo === activeInvoiceNo);

  const amount = customAmount !== null ? customAmount : (selectedInvoice ? selectedInvoice.balance.toString() : '');

  // Auto-suggest payment type based on state
  const handleInvoiceChange = (invNo) => {
    setSelectedInvoiceNo(invNo);
    const inv = invoices.find((i) => i.invoiceNo === invNo);
    setCustomAmount(inv ? inv.balance.toString() : '');
    if (inv) {
      if (inv.paidAmount > 0) {
        setPaymentType('Final Payment');
      } else {
        setPaymentType('Advance Payment');
      }
    }
  };

  const handlePayFull = () => {
    if (selectedInvoice) {
      setCustomAmount(selectedInvoice.balance.toString());
      setPaymentType('Final Payment');
    }
  };

  const handleSubmit = () => {
    const errs = {};
    if (!activeInvoiceNo) errs.invoiceNo = 'Please select an invoice';

    const payVal = Number(amount);
    if (!amount || isNaN(payVal) || payVal <= 0) {
      errs.amount = 'Please enter a valid amount greater than ₹0';
    } else if (selectedInvoice && payVal > selectedInvoice.balance) {
      errs.amount = `Payment cannot exceed remaining invoice balance (${formatINR(selectedInvoice.balance)})`;
    }

    const cleanRef = referenceNo.trim();
    if (!cleanRef) {
      errs.referenceNo = 'Please enter a reference, UTR, or cheque number';
    } else {
      // Duplicate payment prevention check
      const isDuplicate = payments.some(
        (p) => p.referenceNo && p.referenceNo.trim().toLowerCase() === cleanRef.toLowerCase()
      );
      if (isDuplicate) {
        errs.referenceNo = `Duplicate payment rejected: A transaction with reference / UTR "${cleanRef}" is already recorded in the ledger.`;
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      const receipt = recordCustomerPayment({
        invoiceNo: activeInvoiceNo,
        amount: payVal,
        method,
        paymentType,
        referenceNo: cleanRef,
        notes,
      });

      showToast(
        `Payment of ${formatINR(payVal)} (${paymentType}) recorded successfully! (Receipt ${receipt.receiptNo})`,
        'success'
      );
      onClose();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="normal"
      title="Record Customer Payment"
      subtitle="Issue an official customer payment collection receipt and update receivables"
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Record & Post Receipt
          </button>
        </div>
      }
    >
      <div className="payment-form">
        {/* Invoice selection */}
        <FormField
          label="Customer Invoice to Settle"
          id="pay-invoice"
          required
          error={errors.invoiceNo}
        >
          <select
            id="pay-invoice"
            className="form-select"
            value={activeInvoiceNo}
            onChange={(e) => handleInvoiceChange(e.target.value)}
          >
            <option value="">Select invoice with balance...</option>
            {unpaidInvoices.map((inv) => (
              <option key={inv.id} value={inv.invoiceNo}>
                {inv.invoiceNo} — {inv.customerName} (Bal: {formatINR(inv.balance)})
              </option>
            ))}
          </select>
        </FormField>

        {/* Selected Invoice Details Card */}
        {selectedInvoice && (
          <div className="customer-quick-preview mb-4">
            <div className="preview-item">
              <span className="preview-label">Customer:</span>
              <span className="preview-value">{selectedInvoice.customerName}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Invoice Total:</span>
              <span className="preview-value">{formatINR(selectedInvoice.totalAmount)}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Already Paid:</span>
              <span className="preview-value">{formatINR(selectedInvoice.paidAmount)}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Remaining Balance:</span>
              <span className="preview-value text-danger font-bold">
                {formatINR(selectedInvoice.balance)}
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Balance After Payment:</span>
              <span className="preview-value text-success font-bold">
                {formatINR(Math.max(0, selectedInvoice.balance - (Number(amount) || 0)))}
              </span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div className="form-group mb-4">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="pay-amount" className="form-label mb-0">
              Payment Amount (₹) <span className="text-danger">*</span>
            </label>
            {selectedInvoice && (
              <button
                type="button"
                className="btn-text text-primary text-xs font-semibold"
                onClick={handlePayFull}
              >
                Pay Full Balance ({formatINR(selectedInvoice.balance)})
              </button>
            )}
          </div>
          <input
            type="number"
            id="pay-amount"
            className={`form-input ${errors.amount ? 'input-error' : ''}`}
            placeholder="0.00"
            min="1"
            max={selectedInvoice ? selectedInvoice.balance : undefined}
            value={amount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
          {errors.amount && <span className="form-error-msg">{errors.amount}</span>}
        </div>

        {/* Payment Purpose / Type & Payment Mode */}
        <div className="form-grid-2 mb-4">
          <FormField label="Payment Type / Stage" id="pay-type" required>
            <select
              id="pay-type"
              className="form-select"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="Advance Payment">Advance Payment (Booking / Token)</option>
              <option value="Installment">Installment (Milestone / Tranche)</option>
              <option value="Dispatch-Related Payment">Dispatch-Related Payment (Packing/Gate Release)</option>
              <option value="Final Payment">Final Payment (Full Invoice Settlement)</option>
            </select>
          </FormField>

          <FormField label="Payment Method" id="pay-method" required>
            <select
              id="pay-method"
              className="form-select"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="Cheque">Cheque (Demand Draft)</option>
              <option value="Cash">Cash Receipt</option>
              <option value="RTGS">RTGS Immediate Clearance</option>
            </select>
          </FormField>
        </div>

        {/* Reference & Notes */}
        <FormField
          label="UTR / Cheque / Reference No"
          id="pay-ref"
          required
          error={errors.referenceNo}
          helperText="Unique bank transaction UTR or cheque reference (duplicates strictly prevented)"
        >
          <input
            type="text"
            id="pay-ref"
            className="form-input"
            placeholder="e.g. UTR-98210492 or HDFC-NEFT-88912"
            value={referenceNo}
            onChange={(e) => {
              setReferenceNo(e.target.value);
              if (errors.referenceNo) {
                setErrors((prev) => ({ ...prev, referenceNo: undefined }));
              }
            }}
          />
        </FormField>

        <FormField label="Collection Notes" id="pay-notes">
          <textarea
            id="pay-notes"
            className="form-textarea"
            rows="2"
            placeholder="Payer bank, settlement memo, reconciliation notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>

        {/* Audit compliance notice */}
        <div className="alert-callout alert-callout-info">
          <div className="callout-text text-xs">
            <strong>ERP Audit Rule:</strong> Customer payments directly debit Accounts Receivable and generate sequential receipt records. In accordance with financial compliance, posted receipts cannot be edited directly. Corrections must be handled via credit adjustments.
          </div>
        </div>
      </div>
    </Modal>
  );
}
