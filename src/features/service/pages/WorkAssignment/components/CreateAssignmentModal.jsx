import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Users,
  Wrench,
  Building,
  MapPin,
  CheckCircle,
  Receipt
} from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';
import { DEMO_ENGINEERS, DEMO_EMPLOYEES } from '../../../data/initialServiceData';

export default function CreateAssignmentModal({ serviceRequest, initialEngineerId, onClose, onAssigned }) {
  const { createWorkAssignment, schedules } = useSchedule();

  const todayStr = new Date().toISOString().slice(0, 10);

  // Form State
  const [assignedEngineerId, setAssignedEngineerId] = useState(initialEngineerId || '');
  const [supportingEmployeeId, setSupportingEmployeeId] = useState('');

  React.useEffect(() => {
    if (initialEngineerId) {
      setAssignedEngineerId(initialEngineerId);
    }
  }, [initialEngineerId]);
  const [scheduledDate, setScheduledDate] = useState(
    serviceRequest?.preferredDate || todayStr
  );
  const [startTime, setStartTime] = useState('10:00 AM');
  const [expectedEndTime, setExpectedEndTime] = useState('02:00 PM');
  const [serviceLocation, setServiceLocation] = useState(
    serviceRequest?.serviceLocation || ''
  );
  const [assignmentType, setAssignmentType] = useState('On-Site Field Visit');
  const [workInstructions, setWorkInstructions] = useState('');
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Conflict Detection
  const selectedEngineer = useMemo(() => {
    return DEMO_ENGINEERS.find((e) => e.id === assignedEngineerId);
  }, [assignedEngineerId]);

  const conflictingSchedule = useMemo(() => {
    if (!assignedEngineerId || !scheduledDate) return null;
    return schedules.find(
      (sch) =>
        sch.assignedEngineerId === assignedEngineerId &&
        sch.scheduledDate === scheduledDate &&
        sch.status !== 'Completed' &&
        sch.status !== 'Cancelled'
    );
  }, [assignedEngineerId, scheduledDate, schedules]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!assignedEngineerId) {
      setFormError('Please select a Primary Service Engineer.');
      return;
    }
    if (!scheduledDate) {
      setFormError('Please select a Scheduled Service Date.');
      return;
    }
    if (!serviceRequest) {
      setFormError('No service request selected.');
      return;
    }

    const engineer = DEMO_ENGINEERS.find((e) => e.id === assignedEngineerId);
    const employee = supportingEmployeeId
      ? DEMO_EMPLOYEES.find((emp) => emp.id === supportingEmployeeId)
      : null;

    const payload = {
      serviceRequestId: serviceRequest.id,
      customerId: serviceRequest.customerId,
      customerName: serviceRequest.customerName,
      serviceLocation: serviceLocation || serviceRequest.serviceLocation,
      serviceCategory: serviceRequest.serviceCategory,
      productName: serviceRequest.productName,
      priority: serviceRequest.priority,
      assignedEngineerId: engineer.id,
      assignedEngineerName: engineer.name,
      supportingEmployeeId: employee ? employee.id : null,
      supportingEmployeeName: employee ? employee.name : null,
      scheduledDate,
      startTime,
      expectedEndTime,
      assignmentType,
      workInstructions: workInstructions || serviceRequest.issueDescription
    };

    createWorkAssignment(payload);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      if (onAssigned) onAssigned();
      onClose();
    }, 1200);
  };

  if (!serviceRequest) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="customer-id-chip" style={{ fontSize: '0.8rem' }}>{serviceRequest.id}</span>
              <span className="customer-id-chip" style={{ fontSize: '0.8rem' }}>{serviceRequest.customerId}</span>
              <h3 className="modal-title">Create Work Assignment</h3>
            </div>
            <p className="modal-subtitle">
              Dispatch certified field engineer and schedule on-site service visit
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Feedback */}
            {isSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} />
                <span>Work Assignment created successfully! Synchronized with My Schedule.</span>
              </div>
            )}

            {formError && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* Target Request Summary */}
            <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} color="var(--primary)" />
                  Target Service Request
                </strong>
                <span className={`status-badge badge-${serviceRequest.priority.toLowerCase() === 'very high' || serviceRequest.priority.toLowerCase() === 'critical' ? 'danger' : serviceRequest.priority.toLowerCase() === 'high' ? 'warning' : 'info'}`}>
                  {serviceRequest.priority} Priority
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.825rem' }}>
                <div><strong>Customer:</strong> {serviceRequest.customerName} ({serviceRequest.customerId})</div>
                <div><strong>Contact:</strong> {serviceRequest.contactPerson} • {serviceRequest.contactNumber}</div>
                <div><strong>Product:</strong> {serviceRequest.productName}</div>
                <div><strong>Original Invoice:</strong> {serviceRequest.invoiceNo || 'INV-2026-090'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Site Address:</strong> {serviceRequest.serviceLocation}</div>
                <div style={{ gridColumn: '1 / -1', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  <strong>Reported Issue:</strong> {serviceRequest.issueDescription}
                </div>
              </div>
            </div>

            {/* Conflict Detection Banner */}
            {conflictingSchedule && (
              <div
                className="alert alert-warning"
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: '1px solid var(--warning-border)',
                  backgroundColor: 'var(--warning-light)',
                  color: 'var(--warning-hover)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <AlertTriangle size={16} />
                  <span>Engineer Schedule Overlap Detected</span>
                </div>
                <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                  <strong>{selectedEngineer?.name}</strong> already has an active assignment (
                  <strong>{conflictingSchedule.id}</strong> / {conflictingSchedule.serviceRequestId}) on{' '}
                  <strong>{scheduledDate}</strong> ({conflictingSchedule.startTime} - {conflictingSchedule.expectedEndTime}) at{' '}
                  <em>{conflictingSchedule.customerLocation}</em>.
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                  Note: You may adjust scheduled time, select another engineer, or proceed with flagged conflict.
                </div>
              </div>
            )}

            {/* Engineer Allocation */}
            <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Primary Service Engineer *
                </label>
                <select
                  className="form-select"
                  value={assignedEngineerId}
                  onChange={(e) => setAssignedEngineerId(e.target.value)}
                  required
                >
                  <option value="">-- Select Field Engineer --</option>
                  {DEMO_ENGINEERS.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name} ({eng.id}) — {eng.status} • {eng.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Supporting Staff (Optional)</label>
                <select
                  className="form-select"
                  value={supportingEmployeeId}
                  onChange={(e) => setSupportingEmployeeId(e.target.value)}
                >
                  <option value="">-- No Supporting Staff Needed --</option>
                  {DEMO_EMPLOYEES.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id}) — {emp.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scheduling Timings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Scheduled Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Start Time</label>
                <select className="form-select" value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expected End Time</label>
                <select className="form-select" value={expectedEndTime} onChange={(e) => setExpectedEndTime(e.target.value)}>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="05:30 PM">05:30 PM</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assignment Type</label>
                <select className="form-select" value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)}>
                  <option value="On-Site Field Visit">On-Site Field Visit</option>
                  <option value="Emergency Breakdown Repair">Emergency Breakdown Repair</option>
                  <option value="Preventive AMC Visit">Preventive AMC Visit</option>
                  <option value="Inspection & Diagnostic">Inspection & Diagnostic</option>
                  <option value="Installation & Setup">Installation & Setup</option>
                </select>
              </div>
            </div>

            {/* Site Location */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Dispatch Location / Site Address</label>
              <input
                type="text"
                className="form-input"
                value={serviceLocation}
                onChange={(e) => setServiceLocation(e.target.value)}
                placeholder="Specific floor, unit, or machine shop"
              />
            </div>

            {/* Work Instructions */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Work Instructions & Safety Guidance</label>
              <textarea
                className="form-textarea"
                rows="3"
                value={workInstructions}
                onChange={(e) => setWorkInstructions(e.target.value)}
                placeholder="Specify special tool kits, pressure calibration gauges, safety gear, or customer contacts..."
              />
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn-${conflictingSchedule ? 'warning' : 'primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle size={15} />
              <span>{conflictingSchedule ? 'Assign (With Flagged Conflict)' : 'Confirm Work Assignment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
