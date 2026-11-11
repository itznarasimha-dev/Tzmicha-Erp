import Modal from '../common/Modal';
import { ShieldAlert, FileText, User, Building, AlertTriangle, Clock } from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';

export default function RequestDownloadModal({
  isOpen,
  onClose,
  quotation,
  onSendRequest,
}) {
  if (!quotation) return null;

  const isPending = quotation.downloadApprovalStatus === 'Pending Admin Approval';
  const isApproved = quotation.downloadApprovalStatus === 'Approved';
  const isRejected = quotation.downloadApprovalStatus === 'Rejected';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="normal"
      title="Request Download Approval"
      subtitle="Administrative authorization is required to download formal commercial proposals"
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {!isPending && !isApproved && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onSendRequest(quotation.id);
                onClose();
              }}
            >
              Send Request
            </button>
          )}
        </div>
      }
    >
      <div className="download-request-dialog-content">
        {/* Quotation & Customer Details Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#2563eb" />
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>{quotation.quotationNo}</strong>
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              Total: {formatINR(quotation.grandTotal)}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
              <Building size={14} color="#64748b" />
              <span>Customer: <strong>{quotation.customerName}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
              <User size={14} color="#64748b" />
              <span>Created by: {quotation.salesOwner || 'Vikram Mehta (Sales Rep)'}</span>
            </div>
          </div>
        </div>

        {/* Existing Status Notices */}
        {isPending && (
          <div
            style={{
              background: '#fefce8',
              border: '1px solid #fef08a',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <Clock size={18} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#854d0e', fontSize: '13px', display: 'block' }}>
                Download Request Already Pending Admin Approval
              </strong>
              <p style={{ color: '#a16207', fontSize: '12px', margin: '3px 0 0' }}>
                A request to download this quotation was already submitted by {quotation.downloadRequestedBy || 'Sales Rep'} on{' '}
                {quotation.downloadRequestedAt ? formatDate(quotation.downloadRequestedAt) : 'recently'}. Duplicate requests are blocked while review is in progress.
              </p>
            </div>
          </div>
        )}

        {isRejected && quotation.downloadRejectedReason && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#991b1b', fontSize: '13px', display: 'block' }}>
                Previous Download Request Rejected
              </strong>
              <p style={{ color: '#b91c1c', fontSize: '12px', margin: '3px 0 0' }}>
                <strong>Reason:</strong> {quotation.downloadRejectedReason}
              </p>
              <p style={{ color: '#7f1d1d', fontSize: '11px', margin: '4px 0 0' }}>
                You may click &ldquo;Send Request&rdquo; below to submit a new request to the Administrator.
              </p>
            </div>
          </div>
        )}

        {/* Policy Message */}
        {!isPending && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              padding: '12px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldAlert size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#1e40af', fontSize: '13px', display: 'block' }}>
                Admin Approval Policy
              </strong>
              <p style={{ color: '#1d4ed8', fontSize: '12px', margin: '3px 0 0', lineHeight: 1.5 }}>
                Commercial quotations require explicit <strong>Admin authorization</strong> before PDF/print documents can be downloaded or released. Once submitted, your request will appear in the Admin review queue.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
