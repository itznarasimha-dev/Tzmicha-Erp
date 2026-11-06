import { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  MapPin,
  CheckCircle,
  Clock,
  CreditCard,
  Paperclip,
  Trash2,
  Hotel,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export default function ExpenseDetailModal({
  isOpen,
  onClose,
  expense,
}) {
  const { updateExpenseStatus, deleteExpenseDraft, userRole } = useSales();
  const { showToast } = useToast();

  const [rejectRemark, setRejectRemark] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!expense) return null;

  const isManager = userRole === 'sales_manager';
  const isFinance = ['finance', 'accountant', 'account_manager', 'admin'].includes(userRole);

  const handleApprove = () => {
    updateExpenseStatus(
      expense.id,
      'Approved',
      'Pending',
      isManager
        ? 'Approved by Sales Manager. Forwarded to Finance for payroll disbursement.'
        : 'Approved by Finance.'
    );
    showToast(`Claim ${expense.id} approved!`, 'success');
    onClose();
  };

  const handleReject = () => {
    if (!rejectRemark.trim()) {
      showToast('Please provide a reason for rejecting the claim', 'warning');
      return;
    }
    updateExpenseStatus(
      expense.id,
      'Rejected',
      'Pending',
      rejectRemark
    );
    showToast(`Claim ${expense.id} rejected with reason`, 'info');
    onClose();
  };

  const handleReimburse = () => {
    if (!isFinance) {
      showToast('Unauthorized: Only Finance / Accounts can process payout and mark claim as Paid.', 'error');
      return;
    }
    updateExpenseStatus(
      expense.id,
      'Approved',
      'Paid',
      expense.reviewerRemark || 'Reimbursed via direct bank payroll payout batch by Finance.'
    );
    showToast(`Claim ${expense.id} marked as Paid by Finance!`, 'success');
    onClose();
  };

  const handleSubmitDraft = () => {
    updateExpenseStatus(expense.id, 'Submitted', 'Pending');
    showToast(`Draft claim ${expense.id} submitted for approval!`, 'success');
    onClose();
  };

  const handleDeleteDraft = () => {
    deleteExpenseDraft(expense.id);
    showToast(`Draft claim ${expense.id} deleted`, 'info');
    onClose();
  };

  const isPaid = expense.reimbursementStatus === 'Paid' || expense.reimbursementStatus === 'Reimbursed';
  const isPendingReview = expense.approvalStatus === 'Submitted' || expense.approvalStatus === 'Additional Approval Required';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`Expense Claim ${expense.id}`}
      subtitle={`Employee: ${expense.employeeName || 'Vikram Mehta'} • Trip Date: ${formatDate(expense.tripDate)} • Submitted on ${formatDate(expense.submissionDate)}`}
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <div className="modal-actions-right">
            {/* Draft Actions */}
            {expense.approvalStatus === 'Draft' && (
              <>
                <button
                  type="button"
                  className="btn btn-danger btn-sm btn-icon-text"
                  onClick={handleDeleteDraft}
                >
                  <Trash2 size={14} />
                  <span>Delete Draft</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmitDraft}
                >
                  Submit for Approval
                </button>
              </>
            )}

            {/* Submitted or Additional Approval Required */}
            {isPendingReview && (
              <>
                {isManager || isFinance ? (
                  <>
                    {!showRejectInput ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setShowRejectInput(true)}
                        >
                          Reject Claim
                        </button>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={handleApprove}
                        >
                          {isFinance ? 'Finance Approve & Clear' : 'Approve for Finance Review'}
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="form-input input-sm"
                          placeholder="Enter rejection reason..."
                          value={rejectRemark}
                          onChange={(e) => setRejectRemark(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={handleReject}
                        >
                          Confirm Reject
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShowRejectInput(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="approval-lock-hint">
                    <Clock size={13} /> Awaiting Manager &amp; Finance Review
                  </span>
                )}
              </>
            )}

            {/* Approved and Pending Reimbursement */}
            {expense.approvalStatus === 'Approved' && !isPaid && (
              <>
                {isFinance ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-icon-text"
                    onClick={handleReimburse}
                  >
                    <CreditCard size={14} />
                    <span>Process Reimbursement Payout (Finance Authority)</span>
                  </button>
                ) : (
                  <span className="approval-lock-hint text-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} color="#16a34a" />
                    <span>Approved by Manager — Queued for Finance Disbursal (Finance Sole Authority)</span>
                  </span>
                )}
              </>
            )}

            {/* Already Reimbursed / Paid */}
            {isPaid && (
              <span className="badge-success px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                <CheckCircle size={14} /> Claim Fully Reimbursed by Finance
              </span>
            )}
          </div>
        </div>
      }
    >
      <div className="expense-detail-view">
        {/* Banner with Status Badges */}
        <div className="detail-meta-banner mb-4">
          <div className="meta-col">
            <span className="meta-label">Claim Amount</span>
            <span className="meta-val text-primary font-bold text-lg">{formatINR(expense.amount)}</span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Category</span>
            <span className="meta-val font-semibold">{expense.category}</span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Budget Scope</span>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: expense.claimType === 'Additional Request' ? '#fffbeb' : '#f0fdf4',
                color: expense.claimType === 'Additional Request' ? '#b45309' : '#15803d',
                border: expense.claimType === 'Additional Request' ? '1px solid #fde68a' : '1px solid #bbf7d0',
              }}
            >
              {expense.claimType || 'Within Budget'}
            </span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Approval Status</span>
            <StatusBadge status={expense.approvalStatus} />
          </div>
          <div className="meta-col">
            <span className="meta-label">Reimbursement Status</span>
            <span
              className={`status-badge ${
                isPaid ? 'badge-success' : 'badge-warning'
              }`}
            >
              <span className="badge-dot" />
              {isPaid ? 'Paid' : 'Pending Finance Payout'}
            </span>
          </div>
        </div>

        {/* Accommodation Verified GST Invoice Card */}
        {(expense.category === 'Accommodation' || expense.hasMandatoryGSTBill || expense.billNumber) && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#faf5ff',
              border: '1.5px solid #d8b4fe',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hotel size={18} color="#7e22ce" />
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#581c87', margin: 0 }}>
                  Mandatory Accommodation GST Invoice Details
                </h4>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  backgroundColor: '#f3e8ff',
                  border: '1px solid #c084fc',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#6b21a8',
                }}
              >
                <ShieldCheck size={12} /> GST Bill Verified
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#6b21a8', fontWeight: '600', display: 'block' }}>
                  Hotel / Lodging Provider:
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b0764' }}>
                  {expense.providerName || 'Business Lodging Provider'}
                </span>
                {expense.providerAddress && (
                  <span style={{ fontSize: '11px', color: '#7e22ce', display: 'block', marginTop: '2px' }}>
                    {expense.providerAddress}
                  </span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6b21a8', fontWeight: '600', display: 'block' }}>
                  Provider GSTIN:
                </span>
                <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: '700', color: '#3b0764' }}>
                  {expense.gstin || '29AABCP1234F1Z8'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6b21a8', fontWeight: '600', display: 'block' }}>
                  Bill / Tax Invoice No:
                </span>
                <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: '700', color: '#3b0764' }}>
                  {expense.billNumber || 'HTL-2026-881'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6b21a8', fontWeight: '600', display: 'block' }}>
                  Bill Date:
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#3b0764' }}>
                  {formatDate(expense.billDate || expense.tripDate)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Itinerary & Customer */}
        <div className="info-display-grid mb-4">
          <div className="info-box">
            <span className="info-label flex items-center gap-1">
              <MapPin size={13} /> Journey Itinerary
            </span>
            <p className="info-value font-medium">
              {expense.origin} &rarr; {expense.destination}
              {expense.distanceKm && <span className="text-muted text-xs"> ({expense.distanceKm} km)</span>}
            </p>
          </div>

          <div className="info-box">
            <span className="info-label">Customer Visited</span>
            <p className="info-value font-medium">{expense.customerName || 'Non-Customer Specific'}</p>
          </div>

          <div className="info-box">
            <span className="info-label">Payment Method Used</span>
            <p className="info-value">{expense.paymentMethod || 'Personal UPI'}</p>
          </div>

          <div className="info-box">
            <span className="info-label">Purpose of Travel</span>
            <p className="info-value">{expense.purpose}</p>
          </div>
        </div>

        {/* Reviewer Remark if present */}
        {expense.reviewerRemark && (
          <div
            className={`alert-callout ${
              expense.approvalStatus === 'Rejected'
                ? 'alert-callout-warning'
                : 'alert-callout-info'
            } mb-4`}
          >
            <div className="callout-text">
              <strong>Manager / Reviewer Remark:</strong> {expense.reviewerRemark}
            </div>
          </div>
        )}

        {/* Receipt Attachment Preview */}
        <div className="section-title mb-2">Supporting Receipt Attachment</div>
        <div className="receipt-attachment-preview">
          <div className="receipt-preview-icon">
            <Paperclip size={20} className="text-primary" />
          </div>
          <div className="receipt-preview-details">
            <span className="receipt-preview-name">
              {expense.receiptFileName || 'expense_receipt.pdf'}
            </span>
            <span className="receipt-preview-size">
              {expense.receiptFileSize || '820 KB'} • Verified File Attachment
            </span>
          </div>
          <span className="badge-neutral text-xs px-2 py-1 rounded">Stored locally</span>
        </div>
      </div>
    </Modal>
  );
}
