import Modal from './Modal';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action will update the system record.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning', // 'warning', 'danger', 'info'
  isLoading = false,
}) {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertCircle size={24} className="confirm-icon text-danger" />;
      case 'info':
        return <Info size={24} className="confirm-icon text-primary" />;
      default:
        return <AlertTriangle size={24} className="confirm-icon text-warning" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="normal"
      title={title}
      footer={
        <div className="dialog-footer-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-${variant === 'danger' ? 'danger' : 'primary'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="confirm-dialog-body">
        <div className="confirm-icon-wrap">{getIcon()}</div>
        <div className="confirm-text">
          <p className="confirm-message">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
