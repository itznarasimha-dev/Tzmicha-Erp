import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';
import { useRole } from '../../../context/RoleContext';

export default function SubmitWorkUpdateModal({ preselectedScheduleId, onClose }) {
  const { schedules, addWorkUpdate } = useSchedule();
  const { currentRole } = useRole();

  const [selectedScheduleId, setSelectedScheduleId] = useState(
    preselectedScheduleId || (schedules[0] ? schedules[0].id : '')
  );

  const activeSchedule = schedules.find((s) => s.id === selectedScheduleId) || schedules[0];

  const [workPerformed, setWorkPerformed] = useState('');
  const [progress, setProgress] = useState(activeSchedule?.progress || 50);
  const [workStatus, setWorkStatus] = useState('In Progress');
  const [issuesEncountered, setIssuesEncountered] = useState('');
  const [partsRequired, setPartsRequired] = useState('');
  const [remarks, setRemarks] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [error, setError] = useState('');

  const handleScheduleChange = (id) => {
    setSelectedScheduleId(id);
    const target = schedules.find((s) => s.id === id);
    if (target) {
      setProgress(target.progress || 50);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!workPerformed.trim()) {
      setError('Please describe the work performed so far.');
      return;
    }

    addWorkUpdate({
      scheduleId: activeSchedule.id,
      serviceRequestId: activeSchedule.serviceRequestId,
      customerId: activeSchedule.customerId,
      customerName: activeSchedule.customerName,
      engineerId: activeSchedule.assignedEngineerId,
      engineerName: activeSchedule.assignedEngineerName,
      supportingEmployeeName: activeSchedule.supportingEmployeeName,
      workDescription: workPerformed,
      progress: Number(progress),
      workStatus,
      issuesEncountered: issuesEncountered.trim() || 'None',
      partsRequired: partsRequired.trim() || 'None',
      remarks,
      nextAction
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Submit Field Work Update</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-info-banner">
              <Send size={15} />
              <span>
                Reporting as <strong>{currentRole.label}</strong> ({currentRole.profile.name})
              </span>
            </div>

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Select Assigned Activity */}
            <div className="modal-form-group">
              <label className="modal-form-label">Select Assigned Service Activity *</label>
              <select
                className="modal-form-select"
                value={selectedScheduleId}
                onChange={(e) => handleScheduleChange(e.target.value)}
                required
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.customerName} ({s.serviceCategory})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-filled details */}
            {activeSchedule && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                <div className="update-details-box">
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>SERVICE REQUEST ID</span>
                  <strong style={{ color: 'var(--color-primary-blue)' }}>{activeSchedule.serviceRequestId}</strong>
                </div>
                <div className="update-details-box">
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>CUSTOMER & ASSET</span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{activeSchedule.customerName}</strong>
                </div>
              </div>
            )}

            {/* Work Performed */}
            <div className="modal-form-group">
              <label className="modal-form-label">Work Performed *</label>
              <textarea
                className="modal-form-textarea"
                rows="3"
                placeholder="Detail procedures executed, parts serviced, diagnostic steps taken, measurements recorded..."
                value={workPerformed}
                onChange={(e) => { setWorkPerformed(e.target.value); setError(''); }}
                required
              />
            </div>

            {/* Progress & Work Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <div className="modal-form-group">
                <label className="modal-form-label">Current Progress ({progress}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--color-primary-purple)', cursor: 'pointer' }}
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-form-label">Work Status *</label>
                <select
                  className="modal-form-select"
                  value={workStatus}
                  onChange={(e) => setWorkStatus(e.target.value)}
                  required
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting for Parts">Waiting for Parts</option>
                  <option value="Customer Assistance Required">Customer Assistance Required</option>
                  <option value="Work Completed">Work Completed</option>
                  <option value="Unable to Complete">Unable to Complete</option>
                </select>
              </div>
            </div>

            {/* Issues Encountered */}
            <div className="modal-form-group">
              <label className="modal-form-label">Issues Encountered (if any)</label>
              <textarea
                className="modal-form-textarea"
                rows="2"
                placeholder="Mention unexpected site obstacles, electrical/mechanical faults, parameter anomalies..."
                value={issuesEncountered}
                onChange={(e) => setIssuesEncountered(e.target.value)}
              />
            </div>

            {/* Parts / Materials Required */}
            <div className="modal-form-group">
              <label className="modal-form-label">Parts or Materials Required</label>
              <input
                type="text"
                className="modal-form-input"
                placeholder="e.g. Seal kit #SK-901, 20W50 synthetic oil 5L, or 'None'..."
                value={partsRequired}
                onChange={(e) => setPartsRequired(e.target.value)}
              />
            </div>

            {/* Additional Remarks & Next Action */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <div className="modal-form-group">
                <label className="modal-form-label">Additional Remarks</label>
                <input
                  type="text"
                  className="modal-form-input"
                  placeholder="Notes for coordinator/manager..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-form-label">Next Action Required</label>
                <input
                  type="text"
                  className="modal-form-input"
                  placeholder="e.g. Schedule test run..."
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-compact btn-secondary-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-compact btn-primary-compact">
              Submit Work Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
