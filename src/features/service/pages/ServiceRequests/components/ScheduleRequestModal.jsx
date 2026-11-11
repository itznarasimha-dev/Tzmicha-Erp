import React, { useState } from 'react';
import { X, Calendar, Clock, User, Building, MapPin, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';

export default function ScheduleRequestModal({
  isOpen,
  onClose,
  serviceRequest,
  onScheduledSuccess
}) {
  const { engineers = [], employees = [], createWorkAssignment } = useSchedule();

  const [assignedEngineerId, setAssignedEngineerId] = useState(engineers[0]?.id || 'ENG-01');
  const [supportingEmployeeId, setSupportingEmployeeId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [startTime, setStartTime] = useState('10:00 AM');
  const [expectedEndTime, setExpectedEndTime] = useState('02:00 PM');
  const [assignmentType, setAssignmentType] = useState('On-Site Field Visit');
  const [workInstructions, setWorkInstructions] = useState(
    serviceRequest?.issueDescription ? `Resolve reported: ${serviceRequest.issueDescription}` : ''
  );
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !serviceRequest) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!assignedEngineerId) {
      setError('Please select a lead service engineer.');
      return;
    }
    if (!scheduledDate) {
      setError('Please provide a scheduled visit date.');
      return;
    }

    const eng = engineers.find((e) => e.id === assignedEngineerId);
    const emp = employees.find((e) => e.id === supportingEmployeeId);

    const payload = {
      serviceRequestId: serviceRequest.id,
      customerId: serviceRequest.customerId,
      customerName: serviceRequest.customerName,
      serviceLocation: serviceRequest.serviceLocation,
      serviceCategory: serviceRequest.serviceCategory,
      productName: serviceRequest.productName,
      priority: serviceRequest.priority,
      assignedEngineerId,
      assignedEngineerName: eng?.name || 'Assigned Engineer',
      supportingEmployeeId: emp?.id || null,
      supportingEmployeeName: emp?.name || null,
      scheduledDate,
      startTime,
      expectedEndTime,
      assignmentType,
      workInstructions
    };

    createWorkAssignment(payload);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      if (onScheduledSuccess) {
        onScheduledSuccess(payload);
      }
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '680px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Schedule This Service Request
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Create dispatch appointment on Action Plan calendar for ticket {serviceRequest.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Target Ticket Summary Card */}
            <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div>
                  <strong style={{ color: '#0f172a', fontSize: '13px' }}>{serviceRequest.customerName}</strong>
                  <span style={{ marginLeft: '8px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>
                    {serviceRequest.customerId}
                  </span>
                </div>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{serviceRequest.id}</span>
              </div>
              <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={13} />
                <span>{serviceRequest.serviceLocation}</span>
              </div>
              <div style={{ marginTop: '4px', color: '#64748b' }}>
                <strong>Reported Issue:</strong> {serviceRequest.issueDescription}
              </div>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#b91c1c', fontSize: '12px' }}>
                {error}
              </div>
            )}

            {isSuccess && (
              <div style={{ padding: '8px 12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                <span>Service visit scheduled successfully! Reflected in My Schedule, Team Schedule & Attendance.</span>
              </div>
            )}

            {/* Engineer Assignment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Lead Service Engineer *
                </label>
                <select
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={assignedEngineerId}
                  onChange={(e) => setAssignedEngineerId(e.target.value)}
                  required
                >
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name} — {eng.specialization || 'Field Specialist'} ({eng.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Supporting Employee / Technician
                </label>
                <select
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={supportingEmployeeId}
                  onChange={(e) => setSupportingEmployeeId(e.target.value)}
                >
                  <option value="">None (Solo Dispatch)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.role || 'Assistant'} ({emp.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Time Window */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Scheduled Date *
                </label>
                <input
                  type="date"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Start Time *
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Expected End Time *
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  value={expectedEndTime}
                  onChange={(e) => setExpectedEndTime(e.target.value)}
                  placeholder="e.g. 02:00 PM"
                  required
                />
              </div>
            </div>

            {/* Visit Type */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                Dispatch Modality
              </label>
              <select
                className="form-control"
                style={{ height: '36px', fontSize: '13px' }}
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value)}
              >
                <option value="On-Site Field Visit">On-Site Field Visit (Primary Facility)</option>
                <option value="Emergency Breakdown Dispatch">Emergency Breakdown Dispatch (Immediate SLA)</option>
                <option value="In-House Workshop Repair">In-House Workshop Repair (Unit Pick-Up)</option>
                <option value="Remote Tele-Diagnosis">Remote Tele-Diagnosis (Pre-Visit Calibration)</option>
              </select>
            </div>

            {/* Work Instructions */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                Technician Work Instructions & Site Access Notes
              </label>
              <textarea
                className="form-control"
                rows={3}
                style={{ fontSize: '13px' }}
                value={workInstructions}
                onChange={(e) => setWorkInstructions(e.target.value)}
                placeholder="Include safety PPE requirements, plant gate passes, or specific calibration goals..."
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#f8fafc'
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '13px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSuccess} style={{ fontSize: '13px' }}>
              Confirm & Create Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
