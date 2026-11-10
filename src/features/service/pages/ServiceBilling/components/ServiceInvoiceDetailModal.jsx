import React from 'react';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatINR, formatDate } from '../../../utils/formatters';
import { Receipt, FileText, Printer, CheckCircle, Clock } from 'lucide-react';

export default function ServiceInvoiceDetailModal({ isOpen, onClose, invoice, onRecordPayment }) {
  if (!isOpen || !invoice) return null;

  const isPaid = invoice.balance <= 0 && invoice.paymentStatus === 'Paid';

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Service Tax Invoice — ${invoice.serviceInvoiceNo}`}
      size="large"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Invoice Header Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                {invoice.serviceInvoiceNo}
              </span>
              <span style={{ color: '#94a3b8' }}>•</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Linked Ticket: <strong className="font-mono text-slate-700">{invoice.serviceRequestId}</strong>
              </span>
            </div>
            <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              {invoice.customerName}
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Customer Ref: {invoice.customerId}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <StatusBadge status={invoice.paymentStatus} />
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              Invoice Date: {formatDate(invoice.invoiceDate)}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Due Date: {formatDate(invoice.dueDate)}
            </div>
          </div>
        </div>

        {/* Invoice Line Items Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Description</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Category</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>Field Diagnostic & Engineering Call Charge</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>On-site engineer deployment and fault diagnostics</div>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>Service Fee</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                  {formatINR(invoice.serviceCharges)}
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>Technical Labor & Overhaul Work</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Precision disassembly, recalibration, and reassembly</div>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>Labour</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                  {formatINR(invoice.labourCharges)}
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>OEM Replacement Spare Parts Consumed</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Authorized components installed during service resolution</div>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>Materials</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                  {formatINR(invoice.partsCharges)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals Summary */}
          <div style={{ background: '#f8fafc', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Subtotal:</span>
              <span style={{ fontWeight: 600, color: '#1e293b', minWidth: '100px', textAlign: 'right' }}>
                {formatINR(invoice.serviceCharges + invoice.labourCharges + invoice.partsCharges)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Goods & Services Tax (GST 18%):</span>
              <span style={{ fontWeight: 600, color: '#1e293b', minWidth: '100px', textAlign: 'right' }}>
                {formatINR(invoice.taxAmount)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px', fontSize: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Total Invoice Amount:</span>
              <span style={{ fontWeight: 800, color: '#2563eb', minWidth: '100px', textAlign: 'right' }}>
                {formatINR(invoice.totalAmount)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px', fontSize: '13px' }}>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>Amount Paid to Date:</span>
              <span style={{ fontWeight: 700, color: '#16a34a', minWidth: '100px', textAlign: 'right' }}>
                {formatINR(invoice.amountPaid)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px', fontSize: '14px' }}>
              <span style={{ color: invoice.balance > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>Balance Due:</span>
              <span style={{ fontWeight: 800, color: invoice.balance > 0 ? '#dc2626' : '#16a34a', minWidth: '100px', textAlign: 'right' }}>
                {formatINR(invoice.balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Notes */}
        {invoice.notes && (
          <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
            <strong>Billing Remarks / Terms:</strong> {invoice.notes}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary btn-sm btn-icon-text" onClick={handlePrint}>
            <Printer size={15} />
            <span>Print Tax Invoice</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
            {invoice.balance > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm btn-icon-text"
                onClick={() => {
                  onClose();
                  if (onRecordPayment) onRecordPayment(invoice);
                }}
              >
                <Receipt size={15} />
                <span>Record Payment ({formatINR(invoice.balance)})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
