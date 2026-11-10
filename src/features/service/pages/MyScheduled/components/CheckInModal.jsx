import React, { useState } from 'react';
import { X, CheckCircle2, Clock, MapPin } from 'lucide-react';

export default function CheckInModal({ schedule, onClose, onConfirm }) {
  const [checkInTime, setCheckInTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [notes, setNotes] = useState('');

  if (!schedule) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(schedule.id, {
      checkInTime,
      notes
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Record Field Check-In</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-info-banner" style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E40AF' }}>
              <CheckCircle2 size={16} />
              <span>
                Recording on-site arrival for <strong>{schedule.customerName}</strong> ({schedule.customerId || 'CUS-000001'} • {schedule.id})
              </span>
            </div>

            <div className="update-details-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="var(--color-primary-purple)" />
                <strong>Customer Site:</strong> {schedule.customerLocation}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                <Clock size={14} color="var(--color-primary-purple)" />
                <strong>Scheduled Window:</strong> {schedule.startTime} - {schedule.expectedEndTime}
              </div>
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">Check-In Arrival Time *</label>
              <input
                type="text"
                className="modal-form-input"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                required
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">On-Site Initial Observations / Remarks</label>
              <textarea
                className="modal-form-textarea"
                rows="2"
                placeholder="e.g. Arrived on site, contacted plant manager Rajesh Verma, equipment isolated for safe servicing..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-compact btn-secondary-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-compact btn-primary-compact" style={{ backgroundColor: 'var(--color-primary-blue)' }}>
              Confirm Check-In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
