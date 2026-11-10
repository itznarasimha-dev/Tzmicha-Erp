import React, { useState } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';

export default function ReassignModal({ schedule, onClose, onConfirm }) {
  const { engineers } = useSchedule();
  const [selectedEngineerId, setSelectedEngineerId] = useState(schedule?.assignedEngineerId || '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!schedule) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEngineerId) {
      setError('Please select an engineer to reassign.');
      return;
    }
    if (selectedEngineerId === schedule.assignedEngineerId) {
      setError('Please select a different engineer than the currently assigned one.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for reassigning this activity.');
      return;
    }

    const targetEngineer = engineers.find((eng) => eng.id === selectedEngineerId);
    onConfirm(schedule.id, {
      newEngineerId: selectedEngineerId,
      newEngineerName: targetEngineer ? targetEngineer.name : selectedEngineerId,
      reason
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Reassign Field Engineer</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-info-banner">
              <UserCheck size={16} />
              <span>
                Current Assignee: <strong>{schedule.assignedEngineerName}</strong> ({schedule.customerId || 'CUS-000001'} • {schedule.id})
              </span>
            </div>

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="modal-form-group">
              <label className="modal-form-label">Select New Engineer *</label>
              <select
                className="modal-form-select"
                value={selectedEngineerId}
                onChange={(e) => { setSelectedEngineerId(e.target.value); setError(''); }}
                required
              >
                <option value="">-- Choose Field Engineer --</option>
                {engineers.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name} ({eng.id}) — {eng.specialization || eng.role || 'Service Engineer'}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">Reassignment Justification *</label>
              <textarea
                className="modal-form-textarea"
                rows="3"
                placeholder="Specify reason (e.g., Workload rebalancing, specialist certification needed, engineer on medical leave)..."
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(''); }}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-compact btn-secondary-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-compact btn-primary-compact">
              Confirm Reassignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
