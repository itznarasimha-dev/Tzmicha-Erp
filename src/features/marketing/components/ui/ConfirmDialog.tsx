import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            style={
              danger
                ? { background: 'var(--danger)', boxShadow: '0 8px 20px -10px rgba(217,45,32,.55)' }
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="row-12" style={{ alignItems: 'flex-start' }}>
        <span className="confirm-icon" aria-hidden="true">
          <AlertTriangle size={20} />
        </span>
        <div>
          <p className="confirm-copy">{description}</p>
        </div>
      </div>
    </Modal>
  )
}
