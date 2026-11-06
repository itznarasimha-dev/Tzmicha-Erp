import { useState } from 'react';
import { CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';

export default function UpdateActivityProgressModal({ isOpen, onClose, activity }) {
  const { updateActivityProgress } = useSales();
  const { showToast } = useToast();

  const [status, setStatus] = useState(activity?.status || 'Completed');
  const [outcomeRemarks, setOutcomeRemarks] = useState(activity?.outcomeRemarks || '');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(activity?.nextFollowUpDate || '');
  const [newScheduledDate, setNewScheduledDate] = useState(activity?.scheduledDate || '');
  const [newScheduledTime, setNewScheduledTime] = useState(activity?.scheduledTime || '10:30 AM');
  const [errors, setErrors] = useState({});

  if (!activity) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!outcomeRemarks.trim()) {
      setErrors({ outcomeRemarks: 'Outcome remarks or meeting notes are required.' });
      return;
    }

    try {
      const isMoved = status === 'Rescheduled' || status === 'Postponed';
      updateActivityProgress(activity.id, {
        status,
        outcomeRemarks: outcomeRemarks.trim(),
        nextFollowUpDate: nextFollowUpDate || null,
        scheduledDate: isMoved ? (newScheduledDate || activity.scheduledDate) : activity.scheduledDate,
        scheduledTime: isMoved ? (newScheduledTime || activity.scheduledTime) : activity.scheduledTime,
      });
      showToast(`Activity ${activity.activityId || activity.id} status updated to ${status}!`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="medium"
      title={`Update Visit Progress: ${activity.activityId || activity.id}`}
      subtitle={`${activity.customerName} • Assigned to: ${activity.assignedEmployeeName}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Save Visit Outcome
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Activity Summary Info */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '14px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Customer:</span>
            <strong style={{ color: '#0f172a' }}>{activity.customerName} ({activity.customerDisplayId || activity.customerId})</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Scheduled For:</span>
            <span>{activity.scheduledDate} at {activity.scheduledTime}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Original Purpose:</span>
            <span style={{ color: '#334155', maxWidth: '65%', textAlign: 'right' }}>{activity.purpose}</span>
          </div>
        </div>

        {/* Visit Status Selection */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
            Activity Outcome Status *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '6px' }}>
            {['Planned', 'In Progress', 'Completed', 'Not Completed', 'Postponed', 'Rescheduled', 'Cancelled'].map((st) => {
              const isSelected = status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  style={{
                    padding: '6px 8px',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    color: isSelected ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reschedule details if Rescheduled or Postponed */}
        {(status === 'Rescheduled' || status === 'Postponed') && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '14px',
            }}
          >
            <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', marginBottom: '6px' }}>
              Proposed New Date &amp; Time ({status})
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="date"
                className="form-input"
                value={newScheduledDate}
                onChange={(e) => setNewScheduledDate(e.target.value)}
                required
              />
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 11:30 AM"
                value={newScheduledTime}
                onChange={(e) => setNewScheduledTime(e.target.value)}
                required
              />
            </div>
            <span style={{ fontSize: '10.5px', color: '#b45309', display: 'block', marginTop: '4px' }}>
              Original schedule ({activity.scheduledDate} {activity.scheduledTime}) will be archived in the audit trail.
            </span>
          </div>
        )}

        {/* Visit Outcome Remarks */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
              {status === 'Not Completed'
                ? 'Mandatory Explanation for Non-Completion *'
                : status === 'Postponed' || status === 'Rescheduled'
                ? 'Reason for Rescheduling / Postponement *'
                : 'Visit Outcome Remarks & Customer Response *'}
            </label>
            {status === 'Not Completed' && (
              <span style={{ fontSize: '10.5px', color: '#dc2626', fontWeight: 600 }}>Reason Required</span>
            )}
          </div>
          <textarea
            className="form-input"
            rows={3}
            placeholder={
              status === 'Not Completed'
                ? 'Explain why the customer interaction could not take place (e.g. Customer was unavailable, key decision maker in meeting, requested follow-up next week)...'
                : 'Document meeting notes, customer response, product feedback, requirements clarified...'
            }
            value={outcomeRemarks}
            onChange={(e) => setOutcomeRemarks(e.target.value)}
            required
          />
          {errors.outcomeRemarks && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px' }}>{errors.outcomeRemarks}</div>}
        </div>

        {/* Next Follow-Up Date */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
            Next Follow-Up Date (Optional)
          </label>
          <input
            type="date"
            className="form-input"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
            Sets next interaction milestone in customer relationship history
          </span>
        </div>
      </form>
    </Modal>
  );
}