import { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { Calendar, AlertCircle, Info } from 'lucide-react';

export default function ApplyLeaveModal({ isOpen, onClose }) {
  const { applyForLeave, attendancePolicy, leaveRequests = [], userProfile } = useSales();
  const { showToast } = useToast();

  const [leaveType, setLeaveType] = useState('Casual Leave (CL)');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [supportingInfo, setSupportingInfo] = useState('');
  const [errors, setErrors] = useState({});

  // Calculate working days excluding weekend days and company holidays
  const calculatedWorkingDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0;

    let count = 0;
    const cur = new Date(startDate);
    const end = new Date(endDate);
    const holidayDates = (attendancePolicy?.publicHolidays || []).map((h) => h.date);
    const weekendDays = attendancePolicy?.weekendDays || ['Sunday'];

    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const dayName = cur.toLocaleDateString('en-US', { weekday: 'long' });
      const isWeekend = weekendDays.includes(dayName);
      const isHoliday = holidayDates.includes(dateStr);

      if (!isWeekend && !isHoliday) {
        count += 1;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [startDate, endDate, attendancePolicy]);

  // Check overlap in advance for immediate UI guidance
  const overlapWarning = useMemo(() => {
    if (!startDate || !endDate) return null;
    const overlap = leaveRequests.find(
      (l) =>
        l.employeeId === userProfile.employeeId &&
        l.status !== 'Rejected' &&
        l.startDate <= endDate &&
        l.endDate >= startDate
    );
    return overlap ? `Overlaps with existing leave request ${overlap.id} (${overlap.startDate} to ${overlap.endDate} • ${overlap.status})` : null;
  }, [startDate, endDate, leaveRequests, userProfile.employeeId]);

  const validate = () => {
    const errs = {};
    if (!startDate) errs.startDate = 'Start date is required';
    if (!endDate) errs.endDate = 'End date is required';
    if (startDate && endDate && endDate < startDate) {
      errs.endDate = 'End date cannot be earlier than start date';
    }
    if (!reason.trim()) errs.reason = 'Please provide a clear reason for the leave application';
    if (overlapWarning) errs.overlap = overlapWarning;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please correct form errors before submitting', 'danger');
      return;
    }

    try {
      applyForLeave({
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        supportingInfo: supportingInfo.trim(),
      });

      showToast('Leave application submitted for Administrator review!', 'success');
      handleClose();
    } catch (err) {
      showToast(err.message || 'Failed to submit leave request', 'danger');
    }
  };

  const handleClose = () => {
    setLeaveType('Casual Leave (CL)');
    setStartDate('');
    setEndDate('');
    setReason('');
    setSupportingInfo('');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="normal"
      title="Apply for Leave"
      subtitle={`Employee: ${userProfile.fullName} (${userProfile.employeeId}) • Subject to Administrator Approval`}
      footer={
        <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={Boolean(overlapWarning)}>
            Submit Leave Request
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Overlap Alert */}
        {overlapWarning && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#991b1b',
            }}
          >
            <AlertCircle size={16} className="shrink-0 text-danger" />
            <span>{overlapWarning}</span>
          </div>
        )}

        {/* Leave Type */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Leave Category / Type <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            className="form-control"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="Casual Leave (CL)">Casual Leave (CL) - Personal &amp; Urgent Matters</option>
            <option value="Sick / Medical Leave (SL)">Sick / Medical Leave (SL) - Health &amp; Recovery</option>
            <option value="Paid / Earned Leave (PL)">Paid / Earned Leave (PL) - Planned Vacation</option>
            <option value="Compensatory Off (Comp-Off)">Compensatory Off (Comp-Off) - Weekend Duty Compensation</option>
            <option value="Unpaid Leave (LWP)">Leave Without Pay (LWP)</option>
          </select>
        </div>

        {/* Date Range Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
          <FormField
            label="Start Date"
            name="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            error={errors.startDate}
          />

          <FormField
            label="End Date"
            name="endDate"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            error={errors.endDate}
          />
        </div>

        {/* Calculated Days Banner */}
        {startDate && endDate && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              padding: '8px 12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#1e40af',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} />
              <span>Calculated Net Working Days:</span>
            </div>
            <strong style={{ fontSize: '13px' }}>
              {calculatedWorkingDays} {calculatedWorkingDays === 1 ? 'Working Day' : 'Working Days'}
            </strong>
          </div>
        )}

        {/* Reason for Leave */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Reason for Leave <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Explain the necessity of leave to aid administrative evaluation..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }}
          />
          {errors.reason && (
            <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {errors.reason}
            </span>
          )}
        </div>

        {/* Supporting Information / Handover Colleague */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Supporting Information &amp; Client Handover Contact
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Urgent inquiries covered by Rohan Sharma (+91 98311 23456); available on mobile"
            value={supportingInfo}
            onChange={(e) => setSupportingInfo(e.target.value)}
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
            Attach medical certificates or client handover notes where required by company attendance policy.
          </span>
        </div>
      </form>
    </Modal>
  );
}
