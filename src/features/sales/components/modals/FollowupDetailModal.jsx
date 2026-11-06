import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import {
  Calendar,
  Building2,
  FileText,
  Package,
  PhoneCall,
  CheckCircle2,
  ArrowRightLeft,
  MessageSquare,
  User,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export default function FollowupDetailModal({
  isOpen,
  onClose,
  followup,
  onLogOutcome,
  onHandover,
}) {
  if (!followup) return null;

  const isCompleted =
    followup.computedScheduleStatus === 'Completed' ||
    followup.computedScheduleStatus === 'Closed' ||
    followup.status === 'Completed' ||
    followup.status === 'Closed';

  // Normalize priority to High, Medium, or Low
  const displayPriority =
    followup.computedPriority === 'Very High' ? 'High' : followup.computedPriority || 'Medium';

  const priorityStyles = {
    High: {
      bg: '#fef2f2',
      text: '#b91c1c',
      border: '#fecaca',
      dot: '#ef4444',
    },
    Medium: {
      bg: '#fffbeb',
      text: '#b45309',
      border: '#fde68a',
      dot: '#f59e0b',
    },
    Low: {
      bg: '#f0fdf4',
      text: '#15803d',
      border: '#bbf7d0',
      dot: '#22c55e',
    },
  };
  const currentPriorityStyle = priorityStyles[displayPriority] || priorityStyles.Medium;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Follow-up Interaction Details"
      subtitle={`${followup.businessName} • ${followup.refNumber && followup.refNumber !== '—' ? followup.refNumber : 'General Follow-up'}`}
      size="large"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <User size={13} style={{ color: '#94a3b8' }} />
            <span>Assigned:</span>
            <strong style={{ color: '#334155' }}>{followup.ownerName || 'Vikram Mehta'}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isCompleted && onHandover && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onHandover(followup);
                }}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowRightLeft size={13} />
                <span>Handover</span>
              </button>
            )}
            {!isCompleted && onLogOutcome && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogOutcome(followup);
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={13} />
                <span>Log Outcome</span>
              </button>
            )}
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Close
            </button>
          </div>
        </div>
      }
    >
      <div style={{ padding: '4px 0' }}>
        {/* Two-Column Grid: Customer Account & Priority/Status */}
        <div className="followup-detail-grid">
          {/* Customer Account */}
          <div className="followup-detail-card">
            <div className="followup-section-label">
              <Building2 size={13} style={{ color: '#0284c7' }} />
              <span>Customer Account</span>
            </div>
            <div className="followup-section-value" style={{ fontSize: '13.5px' }}>
              {followup.businessName}
            </div>
            <div className="followup-section-subtext">
              {followup.customerType || 'Customer Account'}
            </div>
          </div>

          {/* Priority & Status */}
          <div className="followup-detail-card">
            <div className="followup-section-label">
              <SlidersHorizontal size={13} style={{ color: '#f59e0b' }} />
              <span>Priority &amp; Status</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span
                style={{
                  backgroundColor: currentPriorityStyle.bg,
                  color: currentPriorityStyle.text,
                  border: `1px solid ${currentPriorityStyle.border}`,
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: currentPriorityStyle.dot,
                  }}
                />
                {displayPriority} Priority
              </span>
              <StatusBadge status={followup.computedScheduleStatus} size="small" />
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Scheduled Contact & Linked Reference */}
        <div className="followup-detail-grid">
          {/* Scheduled Contact */}
          <div className="followup-detail-card">
            <div className="followup-section-label">
              <Calendar size={13} style={{ color: '#2563eb' }} />
              <span>Scheduled Contact</span>
            </div>
            <div className="followup-section-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{formatDate(followup.effectiveScheduledDate)}</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={12} style={{ color: '#94a3b8' }} />
                {followup.effectiveScheduledTime}
              </span>
            </div>
            <div className="followup-section-subtext" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <PhoneCall size={11} style={{ color: '#64748b' }} />
              <span>Channel: {followup.followupType}</span>
            </div>
          </div>

          {/* Linked Reference */}
          <div className="followup-detail-card">
            <div className="followup-section-label">
              <FileText size={13} style={{ color: '#059669' }} />
              <span>Linked Reference</span>
            </div>
            <div className="followup-section-value">
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                }}
              >
                {followup.refNumber && followup.refNumber !== '—' ? followup.refNumber : 'General Account Follow-up'}
              </span>
            </div>
            <div className="followup-section-subtext">
              Order, quotation, or invoice record
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Focus Product & Assigned Representative */}
        <div className="followup-detail-grid">
          {/* Focus Product */}
          <div className="followup-detail-card">
            <div className="followup-section-label">
              <Package size={13} style={{ color: '#7c3aed' }} />
              <span>Focus Product</span>
            </div>
            <div className="followup-section-value" title={followup.focusProduct}>
              {followup.focusProduct && followup.focusProduct !== '—' ? followup.focusProduct : 'General Line Inquiry'}
            </div>
            <div className="followup-section-subtext">
              Catalogue item and volume interest
            </div>
          </div>

          {/* Assigned Representative */}
          <div className="followup-detail-card">
            <div className="followup-section-label">
              <User size={13} style={{ color: '#ea580c' }} />
              <span>Assigned Representative</span>
            </div>
            <div className="followup-section-value">
              {followup.ownerName || 'Vikram Mehta'}
            </div>
            <div className="followup-section-subtext">
              ApexERP Sales Operations Team
            </div>
          </div>
        </div>

        {/* Full-width Section: Subject / Interaction Objective */}
        <div className="followup-detail-card-full">
          <div className="followup-section-label">
            <FileText size={13} style={{ color: '#3b82f6' }} />
            <span>Subject / Interaction Objective</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', lineHeight: '1.4' }}>
            {followup.subject}
          </div>
        </div>

        {/* Full-width Section: Remarks & Discussion Notes */}
        <div className="followup-detail-card-full" style={{ marginBottom: 0 }}>
          <div className="followup-section-label">
            <MessageSquare size={13} style={{ color: '#0d9488' }} />
            <span>Remarks &amp; Discussion Notes</span>
          </div>
          <div
            style={{
              fontSize: '12.5px',
              color: '#334155',
              lineHeight: '1.5',
              backgroundColor: '#f8fafc',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {followup.remarksText || 'No remarks recorded for this activity.'}
          </div>

          {/* Outcome banner if logged */}
          {followup.outcome && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Sparkles size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af' }}>
                  Outcome Logged: <span style={{ color: '#2563eb' }}>{followup.outcome}</span>
                </div>
                {followup.completedBy && (
                  <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '1px' }}>
                    Completed by {followup.completedBy}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
