import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Timer,
  Calendar,
  MapPin,
  User,
  Filter,
  CheckSquare,
  HelpCircle,
  ShieldCheck,
  Send
} from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';
import { useRole } from '../../../context/RoleContext';
import CheckInModal from './CheckInModal';
import CheckOutModal from './CheckOutModal';

export default function AttendanceTab({ onSwitchToWorkUpdates }) {
  const { attendanceRecords, schedules, engineers, checkIn, checkOut } = useSchedule();
  const { roleId, currentRole } = useRole();

  const isManagerOrCoordinator = roleId === 'manager' || roleId === 'coordinator';
  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';

  // Filters
  const [engineerFilter, setEngineerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All'); // 'All' | '2026-11-02' (Today)

  // Modals
  const [activeCheckInSchedule, setActiveCheckInSchedule] = useState(null);
  const [activeCheckOutSchedule, setActiveCheckOutSchedule] = useState(null);

  // Scoped attendance list based on user role
  const roleScopedAttendance = useMemo(() => {
    return attendanceRecords.filter((record) => {
      if (isEngineer && record.engineerId !== 'ENG-01') {
        return false;
      }
      if (isEmployee && record.supportingEmployeeId !== 'EMP-01') {
        return false;
      }
      return true;
    });
  }, [attendanceRecords, isEngineer, isEmployee]);

  // Filtered attendance list
  const filteredRecords = useMemo(() => {
    return roleScopedAttendance.filter((rec) => {
      if (engineerFilter !== 'All' && rec.engineerId !== engineerFilter) {
        return false;
      }
      if (statusFilter !== 'All' && rec.status !== statusFilter) {
        return false;
      }
      if (dateFilter !== 'All' && rec.date !== dateFilter) {
        return false;
      }
      return true;
    });
  }, [roleScopedAttendance, engineerFilter, statusFilter, dateFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const todayRecords = roleScopedAttendance.filter((r) => r.date === '2026-11-02');
    const assignedToday = todayRecords.length;
    const checkedIn = todayRecords.filter((r) => r.status === 'In Progress' || r.status === 'Checked In').length;
    const completed = roleScopedAttendance.filter((r) => r.status === 'Completed').length;
    const pending = roleScopedAttendance.filter((r) => r.status === 'Not Started' || r.status === 'Pending Verification').length;
    const missed = roleScopedAttendance.filter((r) => r.status === 'Missed').length;

    const totalMinutes = roleScopedAttendance.reduce((acc, r) => acc + (r.fieldWorkingMinutes || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const totalWorkingTime = `${hours}h ${mins}m`;

    return { assignedToday, checkedIn, completed, pending, missed, totalWorkingTime };
  }, [roleScopedAttendance]);

  const handleOpenCheckIn = (record) => {
    const matchedSchedule = schedules.find((s) => s.id === record.scheduleId);
    if (matchedSchedule) {
      setActiveCheckInSchedule(matchedSchedule);
    }
  };

  const handleOpenCheckOut = (record) => {
    const matchedSchedule = schedules.find((s) => s.id === record.scheduleId);
    if (matchedSchedule) {
      setActiveCheckOutSchedule(matchedSchedule);
    }
  };

  return (
    <div className="tab-content-wrapper">
      {/* 1. Service Action Attendance Dashboard Summary Cards */}
      <div className="metric-cards-grid">
        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-purple)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-lavender)', color: 'var(--color-primary-purple)' }}>
            <Calendar size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.assignedToday}</span>
            <span className="metric-card-label">Assigned Today</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-blue)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-blue)', color: 'var(--color-primary-blue)' }}>
            <PlayCircle size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.checkedIn}</span>
            <span className="metric-card-label">Checked-In Activities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-success)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#ECFDF5', color: 'var(--color-success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.completed}</span>
            <span className="metric-card-label">Completed Activities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#D99518' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF3C7', color: '#D99518' }}>
            <Clock size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.pending}</span>
            <span className="metric-card-label">Pending Activities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-danger)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF2F2', color: 'var(--color-danger)' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.missed}</span>
            <span className="metric-card-label">Missed / Overdue</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#0284C7' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#E0F2FE', color: '#0284C7' }}>
            <Timer size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.totalWorkingTime}</span>
            <span className="metric-card-label">Field Working Time</span>
          </div>
        </div>
      </div>

      {/* 2. Filters Toolbar */}
      <div className="schedule-toolbar">
        <div className="toolbar-left-group">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={14} /> Filters:
          </span>

          {/* Date Filter */}
          <select
            className="toolbar-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="All">All Dates</option>
            <option value="2026-11-02">Today (2026-11-02)</option>
            <option value="2026-11-01">Yesterday (2026-11-01)</option>
            <option value="2026-10-31">2026-10-31</option>
          </select>

          {/* Status Filter */}
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Attendance Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress (Checked-In)</option>
            <option value="Completed">Completed</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Missed">Missed</option>
          </select>

          {/* Manager / Coordinator: Engineer Filter */}
          {isManagerOrCoordinator && (
            <select
              className="toolbar-select"
              value={engineerFilter}
              onChange={(e) => setEngineerFilter(e.target.value)}
            >
              <option value="All">All Field Engineers</option>
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name} ({eng.region})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="toolbar-right-group">
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Showing <strong>{filteredRecords.length}</strong> service activity logs
          </span>
        </div>
      </div>

      {/* 3. Service Action Attendance Records List */}
      {filteredRecords.length > 0 ? (
        <div className="attendance-cards-list">
          {filteredRecords.map((record) => {
            const isAssignedToUser =
              (isEngineer && record.engineerId === 'ENG-01') ||
              (isEmployee && record.supportingEmployeeId === 'EMP-01') ||
              isManagerOrCoordinator;

            const canCheckIn =
              isAssignedToUser && record.status === 'Not Started';

            const canCheckOut =
              isAssignedToUser && record.status === 'In Progress';

            return (
              <div key={record.id} className="attendance-item-card">
                <div className="attendance-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="schedule-chip-id">{record.scheduleId}</span>
                    <span className="schedule-chip-sr">{record.serviceRequestId}</span>
                    <span className="customer-id-chip">{record.customerId || 'CUS-000001'}</span>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {record.customerName}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      • {record.serviceCategory}
                    </span>
                  </div>

                  <span className={`status-badge status-${record.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {record.status}
                  </span>
                </div>

                {/* Timestamps & Field Time Bar */}
                <div className="attendance-timestamps-bar">
                  <div className="attendance-timestamp-item">
                    <Calendar size={13} />
                    <span>Date: <strong>{record.date}</strong></span>
                  </div>

                  <div className="attendance-timestamp-item">
                    <Clock size={13} />
                    <span>Scheduled Window: <strong>{record.scheduledStartTime} - {record.scheduledEndTime}</strong></span>
                  </div>

                  <div className="attendance-timestamp-item">
                    <PlayCircle size={13} color={record.checkInTime ? 'var(--color-success)' : 'var(--color-text-muted)'} />
                    <span>Check-In: <strong>{record.checkInTime || 'Not recorded'}</strong></span>
                  </div>

                  <div className="attendance-timestamp-item">
                    <CheckSquare size={13} color={record.checkOutTime ? 'var(--color-primary-purple)' : 'var(--color-text-muted)'} />
                    <span>Check-Out: <strong>{record.checkOutTime || 'Pending'}</strong></span>
                  </div>

                  {record.fieldWorkingMinutes > 0 && (
                    <div className="attendance-timestamp-item" style={{ color: 'var(--color-primary-blue)', fontWeight: 600 }}>
                      <Timer size={13} />
                      <span>Duration: {Math.floor(record.fieldWorkingMinutes / 60)}h {record.fieldWorkingMinutes % 60}m</span>
                    </div>
                  )}
                </div>

                {/* Work Summary & Outcome if recorded */}
                {record.workSummary && (
                  <div className="update-details-box">
                    <div>
                      <strong style={{ color: 'var(--color-text-primary)' }}>Work Summary: </strong>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{record.workSummary}</span>
                    </div>
                    {record.serviceOutcome && (
                      <div style={{ marginTop: '2px' }}>
                        <strong style={{ color: 'var(--color-text-primary)' }}>Outcome: </strong>
                        <span style={{ color: record.serviceOutcome === 'Resolved' ? 'var(--color-success)' : '#D97706', fontWeight: 600 }}>
                          {record.serviceOutcome}
                        </span>
                      </div>
                    )}
                    {record.remarks && (
                      <div style={{ marginTop: '2px', color: 'var(--color-text-secondary)' }}>
                        <strong>Remarks:</strong> {record.remarks}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} /> {record.engineerName}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} /> {record.customerLocation}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {canCheckIn && (
                      <button
                        type="button"
                        className="btn-compact btn-primary-compact"
                        style={{ backgroundColor: 'var(--color-primary-blue)' }}
                        onClick={() => handleOpenCheckIn(record)}
                      >
                        <PlayCircle size={14} />
                        <span>Check-In Now</span>
                      </button>
                    )}

                    {canCheckOut && (
                      <button
                        type="button"
                        className="btn-compact btn-success-compact"
                        onClick={() => handleOpenCheckOut(record)}
                      >
                        <CheckSquare size={14} />
                        <span>Check-Out & Submit Outcome</span>
                      </button>
                    )}

                    {onSwitchToWorkUpdates && (
                      <button
                        type="button"
                        className="btn-compact btn-secondary-outline"
                        onClick={onSwitchToWorkUpdates}
                        title="View or submit work update"
                      >
                        <Send size={13} />
                        <span>Work Updates</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Timer size={22} />
          </div>
          <h4 className="empty-state-title">No Attendance Logs Match Filter</h4>
          <p className="empty-state-text">
            No field service activities found matching the chosen parameters. Try selecting "All Dates" or "All Field Engineers".
          </p>
        </div>
      )}

      {/* Modals */}
      {activeCheckInSchedule && (
        <CheckInModal
          schedule={activeCheckInSchedule}
          onClose={() => setActiveCheckInSchedule(null)}
          onConfirm={checkIn}
        />
      )}

      {activeCheckOutSchedule && (
        <CheckOutModal
          schedule={activeCheckOutSchedule}
          onClose={() => setActiveCheckOutSchedule(null)}
          onConfirm={checkOut}
        />
      )}
    </div>
  );
}
