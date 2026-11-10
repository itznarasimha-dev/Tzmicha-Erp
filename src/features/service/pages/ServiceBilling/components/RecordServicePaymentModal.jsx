import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import { formatINR } from '../../../utils/formatters';
import { Receipt, CheckCircle2 } from 'lucide-react';

export default function RecordServicePaymentModal({ isOpen, onClose, invoice, onConfirm }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank Transfer / NEFT');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.balance || '');
      setMethod('Bank Transfer / NEFT');
      setReferenceNo(`UTR-${Date.now().toString().slice(-8)}`);
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(invoice.serviceInvoiceNo, {
      amount: Number(amount),
      method,
      referenceNo,
      paymentDate
    });
    onClose();
  };

  const parsedAmount = Number(amount) || 0;
  const newBalance = Math.max(0, (invoice.balance || 0) - parsedAmount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Service Payment — ${invoice.serviceInvoiceNo}`}
      size="medium"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Customer Receivables Summary</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{invoice.customerName}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
            <span>Total Bill: <strong>{formatINR(invoice.totalAmount)}</strong></span>
            <span>Current Balance: <strong className="text-danger">{formatINR(invoice.balance)}</strong></span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="payAmount">Payment Amount Received (₹):</label>
          <input
            id="payAmount"
            type="number"
            min="1"
            max={invoice.balance}
            className="form-control"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
            Remaining balance after this collection: <strong>{formatINR(newBalance)}</strong>
          </span>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="payMethod">Payment Channel / Mode:</label>
          <select
            id="payMethod"
            className="form-control"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            required
          >
            <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
            <option value="RTGS">RTGS Real-Time Settlement</option>
            <option value="UPI">UPI Digital Payment</option>
            <option value="Cheque">Corporate Account Payee Cheque</option>
            <option value="Cash">Cash Receipt</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="refNo">Bank Reference / UTR #:</label>
            <input
              id="refNo"
              type="text"
              className="form-control font-mono"
              placeholder="e.g. UTR84910248"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="payDate">Payment Clearance Date:</label>
            <input
              id="payDate"
              type="date"
              className="form-control"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm btn-icon-text">
            <CheckCircle2 size={15} />
            <span>Confirm Payment Entry</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
