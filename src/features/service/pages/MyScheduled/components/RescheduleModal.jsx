import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';

export default function RescheduleModal({ schedule, onClose, onConfirm }) {
  const [newDate, setNewDate] = useState(schedule?.scheduledDate || '');
  const [newStartTime, setNewStartTime] = useState(schedule?.startTime || '10:00 AM');
  const [newEndTime, setNewEndTime] = useState(schedule?.expectedEndTime || '02:00 PM');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!schedule) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newDate) {
      setError('Please select a valid reschedule date.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for rescheduling this field activity.');
      return;
    }

    onConfirm(schedule.id, {
      newDate,
      newStartTime,
      newEndTime,
      reason
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Reschedule Service Activity</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-info-banner">
              <Calendar size={16} />
              <span>
                Rescheduling <strong>{schedule.id}</strong> ({schedule.customerName} • {schedule.customerId || 'CUS-000001'})
              </span>
            </div>

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="modal-form-group">
              <label className="modal-form-label">New Service Date *</label>
              <input
                type="date"
                className="modal-form-input"
                value={newDate}
                onChange={(e) => { setNewDate(e.target.value); setError(''); }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <div className="modal-form-group">
                <label className="modal-form-label">Start Time *</label>
                <input
                  type="text"
                  className="modal-form-input"
                  placeholder="e.g. 10:00 AM"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-form-label">Expected End Time *</label>
                <input
                  type="text"
                  className="modal-form-input"
                  placeholder="e.g. 02:00 PM"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">Reason for Rescheduling *</label>
              <textarea
                className="modal-form-textarea"
                rows="3"
                placeholder="State operational reason (e.g., Customer requested delay, spare parts in transit, weather/site permit delay)..."
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(''); }}
                required
              />
              <span className="modal-helper-text">
                The reason will be permanently attached to the schedule audit trail.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-compact btn-secondary-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-compact btn-primary-compact">
              Confirm Reschedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
