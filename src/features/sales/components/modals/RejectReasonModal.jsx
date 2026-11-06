import { useState } from 'react';
import Modal from '../common/Modal';
import { AlertCircle } from 'lucide-react';

export default function RejectReasonModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Reject Quotation Request',
  subtitle = 'Provide a clear rejection reason for the requesting salesperson',
  placeholder = 'Specify the reason for rejection (e.g. discount exceeds policy, revised pricing needed)...',
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="normal"
      title={title}
      subtitle={subtitle}
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleSubmit}>
            Confirm Rejection
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="reject-reason"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}
          >
            Rejection Reason <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="reject-reason"
            rows={4}
            className="form-textarea"
            placeholder={placeholder}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            style={{ width: '100%', resize: 'vertical' }}
            autoFocus
          />
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
            This note will be recorded in the quotation audit log and displayed to the salesperson for correction and resubmission.
          </span>
        </div>
      </form>
    </Modal>
  );
}
