import { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { downloadInvoiceDocument } from '../../utils/documentGenerator';
import InvoiceDocumentPreviewModal from './InvoiceDocumentPreviewModal';
import { CreditCard, Calendar, Download, Eye, MessageSquare, CheckCircle, ShieldCheck, Building2, Mail } from 'lucide-react';
import { DEFAULT_COMPANY_CONFIG } from '../../data/mockData';

export default function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  onOpenReminderModal,
}) {
  const { payments, customers, orders, approveInvoice, userRole, userProfile, companyConfig = DEFAULT_COMPANY_CONFIG } = useSales();
  const { showToast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!invoice) return null;

  // Payments linked to this invoice
  const invoicePayments = payments.filter((p) => p.invoiceNo === invoice.invoiceNo);
  const customer = customers.find((c) => c.id === invoice.customerId || c.customerId === invoice.customerId) || {};
  const order = orders.find((o) => o.orderNo === invoice.orderNo || o.id === invoice.orderNo) || {};
  const bank = companyConfig.bankDetails || DEFAULT_COMPANY_CONFIG.bankDetails;

  const isFinanceUser =
    userRole === 'finance' ||
    userRole === 'accountant' ||
    userRole === 'account_manager' ||
    userRole === 'admin' ||
    (userProfile?.jobTitle && userProfile.jobTitle.toLowerCase().includes('account'));

  const handleApprove = () => {
    try {
      approveInvoice(invoice.id, {
        name: userProfile?.fullName || 'Rajesh Singhania',
        role: userRole === 'account_manager' ? 'Account Manager' : 'Accountant',
        jobTitle: userProfile?.jobTitle || 'Accountant',
      });
      showToast(`Tax Invoice ${invoice.invoiceNo} successfully approved and released.`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleDownloadPDF = () => {
    try {
      downloadInvoiceDocument(invoice, customer, order);
      showToast(`Downloading Tax Invoice ${invoice.invoiceNo}...`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleSimulateEmail = () => {
    const emailTo = customer.email || 'accounts@client-enterprise.demo';
    showToast(`Simulated: Tax Invoice ${invoice.invoiceNo} successfully emailed to ${emailTo}. (Frontend simulation)`, 'success');
  };

  const handleSimulateWhatsApp = () => {
    const phoneTo = customer.phone || '+91 98490 12345';
    showToast(`Simulated: Tax Invoice ${invoice.invoiceNo} sent to customer WhatsApp (${phoneTo}). (Frontend simulation)`, 'success');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="large"
        title={`Customer Tax Invoice ${invoice.invoiceNo}`}
        subtitle={`Linked Order: ${invoice.orderNo || 'SO-2026'} • Issued on ${formatDate(invoice.invoiceDate)}`}
        footer={
          <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon-text"
                onClick={() => setIsPreviewOpen(true)}
                title="Preview formal customer-facing tax invoice document"
              >
                <Eye size={14} />
                <span>Preview Document</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon-text"
                onClick={handleSimulateEmail}
                title="Simulate sending formal tax invoice to customer email"
              >
                <Mail size={14} />
                <span>Send Email</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon-text"
                onClick={handleSimulateWhatsApp}
                title="Simulate sending invoice link to customer WhatsApp"
              >
                <MessageSquare size={14} />
                <span>Send WhatsApp</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-icon-text"
                onClick={handleDownloadPDF}
                title="Download official Tax Invoice PDF"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
            </div>
            <div className="modal-actions-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Approval Action for Finance User */}
              {invoice.approvalStatus === 'Pending Approval' && isFinanceUser && (
                <button
                  type="button"
                  className="btn btn-primary btn-icon-text"
                  style={{ backgroundColor: '#16a34a', borderColor: '#15803d' }}
                  onClick={handleApprove}
                >
                  <CheckCircle size={15} />
                  <span>Authorize Invoice</span>
                </button>
              )}

              {/* Payment Reminder Action for Sales */}
              {invoice.balance > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-icon-text"
                  onClick={() => {
                    onClose();
                    if (onOpenReminderModal) onOpenReminderModal(invoice);
                  }}
                  title="Compose customer payment follow-up reminder via WhatsApp or Email"
                >
                  <MessageSquare size={14} />
                  <span>Send Payment Reminder (Collect)</span>
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="invoice-detail-view">
          {/* Meta Header Banner */}
          <div className="detail-meta-banner">
            <div className="meta-col">
              <span className="meta-label">Customer</span>
              <span className="meta-val font-semibold">{invoice.customerName}</span>
              <span className="text-xs text-primary font-mono block">
                {invoice.customerDisplayId || invoice.customerId || customer.customerId || customer.id || 'CUST-001'}
              </span>
            </div>
            <div className="meta-col">
              <span className="meta-label">Due Date</span>
              <span className="meta-val flex items-center gap-1">
                <Calendar size={13} /> {formatDate(invoice.dueDate)}
              </span>
            </div>
            <div className="meta-col">
              <span className="meta-label">Payment Status</span>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="meta-col">
              <span className="meta-label">Percentage Paid</span>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: Number(invoice.balance || 0) === 0 ? '#dcfce7' : '#eff6ff',
                  color: Number(invoice.balance || 0) === 0 ? '#15803d' : '#1d4ed8',
                  border: Number(invoice.balance || 0) === 0 ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                }}
              >
                {invoice.percentagePaid !== undefined
                  ? `${invoice.percentagePaid}%`
                  : `${Math.round(((invoice.paidAmount || 0) / (invoice.totalAmount || 1)) * 100)}%`}
              </span>
            </div>
            <div className="meta-col">
              <span className="meta-label">Authorization</span>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: invoice.approvalStatus === 'Approved' ? '#dcfce7' : '#fef3c7',
                  color: invoice.approvalStatus === 'Approved' ? '#166534' : '#92400e',
                  border: invoice.approvalStatus === 'Approved' ? '1px solid #bbf7d0' : '1px solid #fde68a',
                }}
              >
                {invoice.approvalStatus === 'Approved' ? '✓ Authorized' : 'Pending Finance Approval'}
              </span>
            </div>
            <div className="meta-col">
              <span className="meta-label">Total Amount</span>
              <span className="meta-val font-bold">{formatINR(invoice.totalAmount)}</span>
            </div>
            <div className="meta-col">
              <span className="meta-label">Balance Due</span>
              <span className="meta-val text-danger font-bold">{formatINR(invoice.balance)}</span>
            </div>
          </div>

          {/* Audit Compliance & Authorization Callout */}
          <div className="alert-callout alert-callout-info mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} className="text-primary" />
              <div className="callout-text text-xs">
                <strong>Internal Accounting Controls:</strong> Tax invoices require authorization from either the <strong>Accountant OR Account Manager</strong> (Finance Department).
                {invoice.approvedBy && (
                  <span> Authorized by <strong>{invoice.approvedBy}</strong> ({invoice.approvedRole || 'Accountant'}).</span>
                )}
              </div>
            </div>
          </div>

          {/* Financial & GST Breakdown */}
          <div className="section-title mb-2">Invoice Summary &amp; GST Breakdown</div>
          <div className="quotation-summary-grid mb-4">
            <div className="notes-display-box">
              <span className="meta-label">Invoice Memo</span>
              <p className="meta-val text-sm">{invoice.notes || 'Commercial sales supply dispatched per terms.'}</p>

              {/* Dedicated ApexERP Company Bank Details */}
              <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px', fontSize: '11px' }}>
                <strong style={{ color: '#166534', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Remittance Bank Details
                </strong>
                <div>Beneficiary: <strong>{bank.accountHolderName}</strong></div>
                <div>Bank &amp; Branch: <strong>{bank.bankName} ({bank.branch})</strong></div>
                <div>A/C Number: <strong className="font-mono">{bank.accountNumber}</strong></div>
                <div>IFSC: <strong className="font-mono">{bank.ifscCode}</strong> | UPI: <strong>{bank.upiId}</strong></div>
              </div>
            </div>

            <div className="quotation-totals-card">
              <div className="total-row">
                <span>Gross Total:</span>
                <span>{formatINR(invoice.totalAmount)}</span>
              </div>
              {invoice.taxBreakdown && (
                <>
                  {invoice.taxBreakdown.cgst > 0 && (
                    <div className="total-row text-xs text-muted">
                      <span>CGST (9%):</span>
                      <span>+{formatINR(invoice.taxBreakdown.cgst)}</span>
                    </div>
                  )}
                  {invoice.taxBreakdown.sgst > 0 && (
                    <div className="total-row text-xs text-muted">
                      <span>SGST (9%):</span>
                      <span>+{formatINR(invoice.taxBreakdown.sgst)}</span>
                    </div>
                  )}
                  {invoice.taxBreakdown.igst > 0 && (
                    <div className="total-row text-xs text-muted">
                      <span>IGST:</span>
                      <span>+{formatINR(invoice.taxBreakdown.igst)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="total-row text-success font-semibold">
                <span>Amount Paid:</span>
                <span>- {formatINR(invoice.paidAmount || 0)}</span>
              </div>
              <div className="total-divider"></div>
              <div className="total-row grand-total-row">
                <span>Remaining Balance:</span>
                <span className="grand-total-amount text-danger">{formatINR(invoice.balance)}</span>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="section-title mb-2">Recorded Payment Receipts</div>
          {invoicePayments.length === 0 ? (
            <div className="p-3 text-center text-muted bg-slate-50 rounded border text-sm">
              No payments recorded yet for this invoice.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Payment Date</th>
                    <th>Payment Method</th>
                    <th>Reference / UTR</th>
                    <th style={{ textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicePayments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold text-primary">{p.receiptNo}</td>
                      <td>{formatDate(p.paymentDate)}</td>
                      <td>{p.method}</td>
                      <td className="font-mono text-xs">{p.referenceNo}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="text-success">
                        {formatINR(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Cross-Module Service Completion Banner if applicable */}
          {order?.serviceHandoff && order.serviceHandoff.serviceCompletionStatus === 'Completed' && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CheckCircle size={16} className="text-amber-600" />
                <strong style={{ fontSize: '13px', color: '#854d0e' }}>
                  Cross-Module Service Notification: "Service completed. The remaining amount can now be collected."
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#713f12' }}>
                Service Ref: <strong>{order.serviceHandoff.serviceReference || 'SRV-REC'}</strong> • Completed on {order.serviceHandoff.serviceCompletionDate}
                <br />
                Remarks: {order.serviceHandoff.serviceCompletionRemarks}
              </p>
            </div>
          )}

          {/* Chronological Audit Trail & Operational Remarks */}
          {invoice.updatesHistory && invoice.updatesHistory.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div className="section-title mb-2">Remarks &amp; Cross-Module Update History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invoice.updatesHistory.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11.5px',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#0f172a' }}>{item.description}</strong>
                      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                        By <strong>{item.updatedByName}</strong> ({item.role}) • {item.department}
                      </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {item.date} {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Document Preview Modal */}
      {isPreviewOpen && (
        <InvoiceDocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          invoice={invoice}
        />
      )}
    </>
  );
}
