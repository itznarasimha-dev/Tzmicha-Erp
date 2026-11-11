import { useState } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { Clock, Calendar, ShieldCheck, Plus, Trash2 } from 'lucide-react';

export default function ConfigureAttendancePolicyModal({ isOpen, onClose }) {
  const { attendancePolicy, updateAttendancePolicy, userRole, permissions } = useSales();
  const { showToast } = useToast();

  const [shiftStartTime, setShiftStartTime] = useState(() => attendancePolicy.shiftStartTime || '09:30');
  const [shiftEndTime, setShiftEndTime] = useState(() => attendancePolicy.shiftEndTime || '18:30');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(() => (attendancePolicy.gracePeriodMinutes ?? 15).toString());
  const [minHoursFullDay, setMinHoursFullDay] = useState(() => (attendancePolicy.minHoursFullDay ?? 8.0).toString());
  const [minHoursHalfDay, setMinHoursHalfDay] = useState(() => (attendancePolicy.minHoursHalfDay ?? 4.5).toString());
  const [publicHolidays, setPublicHolidays] = useState(() => attendancePolicy.publicHolidays || []);

  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  const isAdmin = permissions.isAdmin || userRole === 'admin' || userRole === 'sales_manager';

  const handleAddHoliday = () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      showToast('Please provide both holiday date and holiday title', 'warning');
      return;
    }
    if (publicHolidays.some((h) => h.date === newHolidayDate)) {
      showToast('A public holiday is already registered for this date', 'warning');
      return;
    }
    setPublicHolidays([...publicHolidays, { date: newHolidayDate, name: newHolidayName.trim() }]);
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleRemoveHoliday = (date) => {
    setPublicHolidays(publicHolidays.filter((h) => h.date !== date));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Unauthorized: Only Administrators can configure company attendance policy', 'danger');
      return;
    }

    try {
      updateAttendancePolicy({
        shiftStartTime,
        shiftEndTime,
        gracePeriodMinutes: parseInt(gracePeriodMinutes, 10) || 15,
        minHoursFullDay: parseFloat(minHoursFullDay) || 8.0,
        minHoursHalfDay: parseFloat(minHoursHalfDay) || 4.5,
        publicHolidays,
      });

      showToast('Company Attendance Rules & Holiday Schedule updated successfully!', 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to update policy', 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Company Attendance Rules &amp; Policy Configuration"
      subtitle="Corporate shift timings, grace periods, threshold hours, and official public holidays"
      footer={
        <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Save Attendance Rules
            </button>
          )}
        </div>
      }
    >
      <form onSubmit={handleSave}>
        {/* Administrator Authority Banner */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#334155',
          }}
        >
          <ShieldCheck size={16} className="text-primary shrink-0" />
          <span>
            <strong>Configurable Corporate Rules:</strong> Shift start/end times and grace allowances are applied dynamically across the organization.
          </span>
        </div>

        {/* Shift Timings & Grace Period */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Shift Start Time
            </label>
            <input
              type="time"
              className="form-control"
              value={shiftStartTime}
              onChange={(e) => setShiftStartTime(e.target.value)}
              disabled={!isAdmin}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Shift End Time
            </label>
            <input
              type="time"
              className="form-control"
              value={shiftEndTime}
              onChange={(e) => setShiftEndTime(e.target.value)}
              disabled={!isAdmin}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Grace Period (Minutes)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              className="form-control"
              value={gracePeriodMinutes}
              onChange={(e) => setGracePeriodMinutes(e.target.value)}
              disabled={!isAdmin}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Working Hours Thresholds */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Min Hours for Full Day (Present)
            </label>
            <input
              type="number"
              step="0.5"
              min="4"
              max="12"
              className="form-control"
              value={minHoursFullDay}
              onChange={(e) => setMinHoursFullDay(e.target.value)}
              disabled={!isAdmin}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Min Hours for Half Day
            </label>
            <input
              type="number"
              step="0.5"
              min="2"
              max="8"
              className="form-control"
              value={minHoursHalfDay}
              onChange={(e) => setMinHoursHalfDay(e.target.value)}
              disabled={!isAdmin}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Public Holidays Management */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} className="text-primary" />
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                Official Public Holidays Calendar
              </strong>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {publicHolidays.length} Holidays Scheduled
            </span>
          </div>

          {/* Add Holiday Row (Admin only) */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  style={{ width: '100%', height: '34px', fontSize: '12px' }}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Holiday Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Maharashtra Day / Labor Day"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  style={{ width: '100%', height: '34px', fontSize: '12px' }}
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon-text"
                onClick={handleAddHoliday}
                style={{ height: '34px' }}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>
          )}

          {/* Holidays Table / List */}
          <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table className="enterprise-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Holiday Date</th>
                  <th>Occasion / Festival</th>
                  {isAdmin && <th style={{ width: '60px', textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {publicHolidays.map((h) => (
                  <tr key={h.date}>
                    <td style={{ fontSize: '12px', fontWeight: 600 }}>{h.date}</td>
                    <td style={{ fontSize: '12px', color: '#334155' }}>{h.name}</td>
                    {isAdmin && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="table-action-icon-btn text-danger"
                          onClick={() => handleRemoveHoliday(h.date)}
                          title="Remove holiday"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </Modal>
  );
}
