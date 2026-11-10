import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  Wrench,
  AlertTriangle,
  Building,
  CheckCircle,
  RotateCcw,
  UserCheck,
  XCircle,
  FileText
} from 'lucide-react';
import { useRole } from '../../../context/RoleContext';
import { useSchedule } from '../../../context/ScheduleContext';
import { DEMO_ENGINEERS } from '../../../data/initialServiceData';

export default function AssignmentDetailModal({ assignment, onClose, onUpdated }) {
  const { roleId } = useRole();
  const { reassignAssignment, rescheduleAssignment, cancelAssignment } = useSchedule();

  const isManager = roleId === 'manager';
  const isCoordinator = roleId === 'coordinator';
  const canManage = isManager || isCoordinator;

  // Inline action states
  const [activeAction, setActiveAction] = useState(null); // 'reassign' | 'reschedule' | 'cancel'
  const [newEngineerId, setNewEngineerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [newDate, setNewDate] = useState(assignment?.scheduledDate || '');
  const [newStartTime, setNewStartTime] = useState(assignment?.startTime || '10:00 AM');
  const [newEndTime, setNewEndTime] = useState(assignment?.expectedEndTime || '02:00 PM');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!assignment) return null;

  const handleReassignSubmit = (e) => {
    e.preventDefault();
    if (!newEngineerId) {
      alert('Please select a new engineer.');
      return;
    }
    const eng = DEMO_ENGINEERS.find((e) => e.id === newEngineerId);
    reassignAssignment(assignment.id, {
      newEngineerId: eng.id,
      newEngineerName: eng.name,
      reason: reassignReason || 'Manager / Coordinator reassignment'
    });
    setFeedbackMsg(`Assignment reassigned to ${eng.name}.`);
    setActiveAction(null);
    setTimeout(() => {
      setFeedbackMsg('');
      if (onUpdated) onUpdated();
      onClose();
    }, 1200);
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    if (!newDate) {
      alert('Please select a new date.');
      return;
    }
    rescheduleAssignment(assignment.id, {
      newDate,
      newStartTime,
      newEndTime,
      reason: rescheduleReason || 'Schedule adjustment by operations'
    });
    setFeedbackMsg(`Assignment rescheduled to ${newDate}.`);
    setActiveAction(null);
    setTimeout(() => {
      setFeedbackMsg('');
      if (onUpdated) onUpdated();
      onClose();
    }, 1200);
  };

  const handleCancelSubmit = (e) => {
    e.preventDefault();
    cancelAssignment(assignment.id, cancelReason || 'Cancelled by operations');
    setFeedbackMsg('Assignment cancelled and Service Request reverted to Approved.');
    setActiveAction(null);
    setTimeout(() => {
      setFeedbackMsg('');
      if (onUpdated) onUpdated();
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="schedule-chip-id">{assignment.id}</span>
            <span className="schedule-chip-sr">{assignment.serviceRequestId}</span>
            <span className="customer-id-chip">{assignment.customerId}</span>
            <h3 className="modal-title">Assignment Overview</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`priority-badge priority-${assignment.priority.toLowerCase()}`}>
              {assignment.priority}
            </span>
            <span className={`status-badge status-${assignment.status.toLowerCase().replace(/\s+/g, '-')}`}>
              {assignment.status}
            </span>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {feedbackMsg && (
            <div className="modal-info-banner" style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46', marginBottom: '16px' }}>
              <CheckCircle size={16} />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Conflict Banner */}
          {assignment.hasConflict && (
            <div className="modal-info-banner" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C', marginBottom: '16px' }}>
              <AlertTriangle size={16} />
              <div>
                <strong>Schedule Conflict Flagged:</strong>{' '}
                {assignment.conflictNote || 'Engineer schedule overlaps with another service assignment on the same date.'}
              </div>
            </div>
          )}

          {/* Customer & Location Box */}
          <div className="update-details-box" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={16} color="var(--color-primary-purple)" />
                Customer & Site Information
              </span>
              <span className="customer-id-chip">{assignment.customerId}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <span className="schedule-meta-label">Customer Name</span>
                <div style={{ fontWeight: 600 }}>{assignment.customerName}</div>
              </div>
              <div>
                <span className="schedule-meta-label">Service Category</span>
                <div style={{ fontWeight: 600 }}>{assignment.serviceCategory}</div>
              </div>
              <div>
                <span className="schedule-meta-label">Product / Equipment</span>
                <div>{assignment.productName}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="schedule-meta-label">Site Address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} color="var(--color-text-muted)" />
                  <span>{assignment.serviceLocation}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Personnel & Timing Box */}
          <div className="update-details-box" style={{ marginBottom: '16px' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <User size={16} color="var(--color-primary-blue)" />
              Allocated Field Personnel & Timings
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <span className="schedule-meta-label">Primary Engineer</span>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {assignment.assignedEngineerName}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  ID: {assignment.assignedEngineerId}
                </div>
              </div>
              <div>
                <span className="schedule-meta-label">Supporting Staff</span>
                <div style={{ fontWeight: 500 }}>
                  {assignment.supportingEmployeeName || 'None Assigned'}
                </div>
                {assignment.supportingEmployeeId && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    ID: {assignment.supportingEmployeeId}
                  </div>
                )}
              </div>
              <div>
                <span className="schedule-meta-label">Scheduled Date</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} color="var(--color-primary-blue)" />
                  <span style={{ fontWeight: 600 }}>{assignment.scheduledDate}</span>
                </div>
              </div>
              <div>
                <span className="schedule-meta-label">Working Hours</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} color="var(--color-primary-blue)" />
                  <span>{assignment.startTime} - {assignment.expectedEndTime}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
              <span className="schedule-meta-label">Work Instructions & Job Scope</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {assignment.workInstructions || assignment.issueDescription || 'Standard field service execution protocol.'}
              </p>
            </div>
          </div>

          {/* Sub-form: Reassign Engineer */}
          {activeAction === 'reassign' && (
            <div className="update-details-box" style={{ border: '1px solid var(--color-primary-purple)', backgroundColor: '#FAF5FF', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--color-primary-purple)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} />
                Reassign to New Field Engineer
              </h4>
              <form onSubmit={handleReassignSubmit}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Select New Field Engineer</label>
                  <select
                    className="form-select"
                    value={newEngineerId}
                    onChange={(e) => setNewEngineerId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Engineer --</option>
                    {DEMO_ENGINEERS.filter((e) => e.id !== assignment.assignedEngineerId).map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name} ({eng.id}) — {eng.status} • {eng.specialization}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Reason for Reassignment</label>
                  <input
                    type="text"
                    className="form-input"
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="e.g. Workload balancing, engineer unavailable, specialized tool requirement"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-compact btn-secondary-outline" onClick={() => setActiveAction(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-compact btn-primary-compact" style={{ backgroundColor: 'var(--color-primary-purple)' }}>
                    Confirm Reassignment
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sub-form: Reschedule */}
          {activeAction === 'reschedule' && (
            <div className="update-details-box" style={{ border: '1px solid var(--color-primary-blue)', backgroundColor: '#F0F9FF', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--color-primary-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} />
                Reschedule Service Visit
              </h4>
              <form onSubmit={handleRescheduleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>New Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Start Time</label>
                    <select className="form-select" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)}>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="01:00 PM">01:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>End Time</label>
                    <select className="form-select" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)}>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="01:00 PM">01:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Reason for Rescheduling</label>
                  <input
                    type="text"
                    className="form-input"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Customer request, parts transit delay, or machine downtime postponement"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-compact btn-secondary-outline" onClick={() => setActiveAction(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-compact btn-primary-compact" style={{ backgroundColor: 'var(--color-primary-blue)' }}>
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sub-form: Cancel Assignment */}
          {activeAction === 'cancel' && (
            <div className="update-details-box" style={{ border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={16} />
                Cancel Assignment & Return to Approved Pool
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#7F1D1D', margin: '0 0 10px 0' }}>
                Cancelling this assignment will remove it from the engineer's active schedule and return the Service Request ({assignment.serviceRequestId}) to the unassigned approved pool.
              </p>
              <form onSubmit={handleCancelSubmit}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Reason for Cancellation</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Customer cancelled order, emergency site shutdown"
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-compact btn-secondary-outline" onClick={() => setActiveAction(null)}>
                    Back
                  </button>
                  <button type="submit" className="btn-compact" style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}>
                    Confirm Cancellation
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn-compact btn-secondary-outline" onClick={onClose}>
            Close
          </button>

          {canManage && !activeAction && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-compact btn-secondary-outline"
                style={{ color: '#DC2626', borderColor: '#FECACA' }}
                onClick={() => setActiveAction('cancel')}
              >
                <XCircle size={13} />
                <span>Cancel Assignment</span>
              </button>
              <button
                type="button"
                className="btn-compact btn-secondary-outline"
                onClick={() => setActiveAction('reschedule')}
              >
                <Calendar size={13} />
                <span>Reschedule</span>
              </button>
              <button
                type="button"
                className="btn-compact btn-primary-compact"
                style={{ backgroundColor: 'var(--color-primary-purple)' }}
                onClick={() => setActiveAction('reassign')}
              >
                <UserCheck size={13} />
                <span>Reassign Engineer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
