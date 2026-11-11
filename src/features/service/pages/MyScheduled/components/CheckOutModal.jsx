import React, { useState } from 'react';
import { X, CheckSquare, Clock, AlertCircle } from 'lucide-react';

export default function CheckOutModal({ schedule, onClose, onConfirm }) {
  const [checkOutTime, setCheckOutTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [workSummary, setWorkSummary] = useState('');
  const [serviceOutcome, setServiceOutcome] = useState('Resolved');
  const [remarks, setRemarks] = useState('');
  const [nextRecommendedAction, setNextRecommendedAction] = useState('');
  const [error, setError] = useState('');

  if (!schedule) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!workSummary.trim()) {
      setError('Please provide a brief work summary before check-out.');
      return;
    }

    onConfirm(schedule.id, {
      checkOutTime,
      workSummary,
      serviceOutcome,
      remarks,
      nextRecommendedAction
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Record Check-Out & Service Outcome</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-info-banner" style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
              <CheckSquare size={16} />
              <span>
                Completing field visit for <strong>{schedule.customerName}</strong> ({schedule.customerId || 'CUS-000001'} • {schedule.id})
              </span>
            </div>

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <div className="modal-form-group">
                <label className="modal-form-label">Check-Out Time *</label>
                <input
                  type="text"
                  className="modal-form-input"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  required
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-form-label">Service Outcome *</label>
                <select
                  className="modal-form-select"
                  value={serviceOutcome}
                  onChange={(e) => setServiceOutcome(e.target.value)}
                  required
                >
                  <option value="Resolved">Resolved (Fully Operational)</option>
                  <option value="Partially Resolved - Follow-up Needed">Partially Resolved (Follow-up Needed)</option>
                  <option value="Parts Pending">Parts Pending (Requires Replacement)</option>
                  <option value="Unresolved">Unresolved (Escalation Required)</option>
                </select>
              </div>
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">Work Summary Performed *</label>
              <textarea
                className="modal-form-textarea"
                rows="3"
                placeholder="Detail procedures carried out, diagnostics performed, components adjusted or replaced..."
                value={workSummary}
                onChange={(e) => { setWorkSummary(e.target.value); setError(''); }}
                required
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">Technical Remarks & Customer Feedback</label>
              <textarea
                className="modal-form-textarea"
                rows="2"
                placeholder="Customer satisfaction notes, operating environment conditions, parameter readings..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">Next Recommended Action</label>
              <input
                type="text"
                className="modal-form-input"
                placeholder="e.g. Schedule 30-day follow-up vibration check, dispatch seal kit..."
                value={nextRecommendedAction}
                onChange={(e) => setNextRecommendedAction(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-compact btn-secondary-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-compact btn-success-compact">
              Submit Check-Out & Outcome
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
