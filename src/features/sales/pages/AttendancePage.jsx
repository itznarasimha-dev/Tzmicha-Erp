import { useState, useMemo, useEffect } from 'react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import ApplyLeaveModal from '../components/modals/ApplyLeaveModal';
import RejectReasonModal from '../components/modals/RejectReasonModal';
import ConfigureAttendancePolicyModal from '../components/modals/ConfigureAttendancePolicyModal';
import AttendanceWorkSubNav from '../components/common/AttendanceWorkSubNav';
import { useSales } from '../context/SalesContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';
import {
  CalendarCheck,
  Clock,
  LogIn,
  LogOut,
  Calendar,
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  User,
  Users,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

const REGIONAL_EMPLOYEE_IDS = [
  'APX-EMP-4091', // Vikram Mehta (Sales Rep)
  'APX-EMP-4092', // Rohan Sharma (Sales Rep)
  'APX-EMP-4093', // Priya Nair (Sales Rep)
  'APX-EMP-5011', // Aditya Joshi (Junior Sales)
  'APX-EMP-5012', // Neha Kulkarni (Junior Sales)
];

export default function AttendancePage() {
  const {
    userProfile,
    userRole,
    permissions,
    attendanceRecords = [],
    attendancePolicy,
    teamRoster = [],
    leaveRequests = [],
    checkInEmployee,
    checkOutEmployee,
    approveLeaveRequest,
    rejectLeaveRequest,
  } = useSales();
  const { showToast } = useToast();

  const isManagerOrCoordinator = ['sales_manager', 'sales_coordinator', 'admin'].includes(userRole);

  const [activeTab, setActiveTab] = useState('my-attendance'); // 'my-attendance' | 'team-approvals'
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Modals state
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [rejectingLeave, setRejectingLeave] = useState(null);
  const [isConfigPolicyOpen, setIsConfigPolicyOpen] = useState(false);

  // Month Calendar Navigation State
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 9, 1)); // October 2026

  // Live Timer for Checked-In Employees
  const [currentTimeStr, setCurrentTimeStr] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's record for logged-in employee
  const todayRecord = useMemo(() => {
    return attendanceRecords.find(
      (r) => r.employeeId === userProfile.employeeId && r.date === todayStr
    );
  }, [attendanceRecords, userProfile.employeeId, todayStr]);

  // Calculate live working hours if currently checked in
  const liveHoursWorked = useMemo(() => {
    if (!todayRecord || !todayRecord.checkInTimestamp) return 0;
    if (todayRecord.checkOutTimestamp) return todayRecord.totalHours || 0;
    const diffMs = Math.max(0, Date.now() - new Date(todayRecord.checkInTimestamp).getTime());
    return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  }, [todayRecord, currentTimeStr]);

  // Check In / Check Out Handlers
  const handleCheckIn = () => {
    try {
      checkInEmployee(userProfile.employeeId);
      showToast('Checked in successfully! Attendance timestamp recorded.', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleCheckOut = () => {
    try {
      const updated = checkOutEmployee(userProfile.employeeId);
      showToast(`Checked out successfully! Total: ${updated.totalHours} hrs worked.`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Leave Approval Handlers
  const handleApproveLeave = (leaveId) => {
    try {
      const reviewerTitle =
        userRole === 'sales_coordinator'
          ? 'Sales Coordinator (Hyderabad & Deccan)'
          : userRole === 'sales_manager'
          ? 'Sales Manager'
          : 'Administrator';
      approveLeaveRequest(leaveId, `Approved by ${userProfile.fullName} (${reviewerTitle}). Handover confirmed.`);
      showToast('Leave application approved and attendance calendar updated!', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleConfirmRejectLeave = (reason) => {
    if (!rejectingLeave) return;
    try {
      rejectLeaveRequest(rejectingLeave.id, reason);
      showToast(`Leave application ${rejectingLeave.id} rejected.`, 'info');
      setRejectingLeave(null);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Employee's personal attendance history
  const myAttendanceHistory = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const isMine = r.employeeId === userProfile.employeeId;
      const matchesSearch =
        !attendanceSearch.trim() ||
        r.date.includes(attendanceSearch) ||
        (r.status && r.status.toLowerCase().includes(attendanceSearch.toLowerCase()));
      return isMine && matchesSearch;
    });
  }, [attendanceRecords, userProfile.employeeId, attendanceSearch]);

  // Employee's personal leave requests
  const myLeaveRequests = useMemo(() => {
    return leaveRequests.filter((l) => l.employeeId === userProfile.employeeId);
  }, [leaveRequests, userProfile.employeeId]);

  // Scoped team roster for Manager (organizational) vs Coordinator (regional)
  const scopedTeamRoster = useMemo(() => {
    if (userRole === 'sales_manager' || userRole === 'admin') {
      return teamRoster;
    }
    if (userRole === 'sales_coordinator') {
      return teamRoster.filter(
        (emp) =>
          REGIONAL_EMPLOYEE_IDS.includes(emp.employeeId) ||
          emp.employeeId === userProfile.employeeId ||
          emp.department?.toLowerCase().includes('hyderabad')
      );
    }
    return [];
  }, [teamRoster, userRole, userProfile.employeeId]);

  // Scoped leave requests for approval queue
  const scopedLeaveRequests = useMemo(() => {
    if (userRole === 'sales_manager' || userRole === 'admin') {
      return leaveRequests;
    }
    if (userRole === 'sales_coordinator') {
      return leaveRequests.filter(
        (l) => REGIONAL_EMPLOYEE_IDS.includes(l.employeeId) || l.employeeId === userProfile.employeeId
      );
    }
    return [];
  }, [leaveRequests, userRole, userProfile.employeeId]);

  // Team summary metrics (Manager/Coordinator view)
  const teamMetrics = useMemo(() => {
    const totalMembers = scopedTeamRoster.length;
    let presentCount = 0;
    let lateOrHalfCount = 0;
    let onLeaveCount = 0;

    scopedTeamRoster.forEach((emp) => {
      const rec = attendanceRecords.find((r) => r.employeeId === emp.employeeId && r.date === todayStr);
      if (rec) {
        if (rec.status === 'Present') presentCount += 1;
        else if (rec.status === 'Late' || rec.status === 'Half-day') lateOrHalfCount += 1;
        else if (rec.status === 'Approved Leave') onLeaveCount += 1;
      }
    });

    const pendingLeavesCount = scopedLeaveRequests.filter((l) => l.status === 'Pending Approval').length;

    return {
      totalMembers,
      presentCount,
      lateOrHalfCount,
      onLeaveCount,
      pendingLeavesCount,
    };
  }, [scopedTeamRoster, attendanceRecords, scopedLeaveRequests, todayStr]);

  // Calendar calculations for selected month
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Adjust so Monday is day 0, Sunday is day 6
    const adjustedFirstDay = (firstDayIndex + 6) % 7;
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null);
    }

    const holidaysMap = {};
    (attendancePolicy?.publicHolidays || []).forEach((h) => {
      holidaysMap[h.date] = h.name;
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month, d);
      const dayOfWeekName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
      const isWeekend = (attendancePolicy?.weekendDays || ['Sunday']).includes(dayOfWeekName);
      const holidayName = holidaysMap[dateStr] || null;

      // Find attendance status for employee
      const attRecord = attendanceRecords.find(
        (r) => r.employeeId === userProfile.employeeId && r.date === dateStr
      );

      // Check if approved leave exists
      const leaveRecord = leaveRequests.find(
        (l) =>
          l.employeeId === userProfile.employeeId &&
          l.status === 'Approved' &&
          l.startDate <= dateStr &&
          l.endDate >= dateStr
      );

      days.push({
        dayNumber: d,
        dateStr,
        isWeekend,
        holidayName,
        isToday: dateStr === todayStr,
        attendanceStatus: attRecord ? attRecord.status : leaveRecord ? 'Approved Leave' : null,
        leaveType: leaveRecord ? leaveRecord.leaveType : attRecord?.leaveType || null,
        hoursWorked: attRecord ? attRecord.totalHours : 0,
      });
    }

    return days;
  }, [calendarDate, attendancePolicy, attendanceRecords, leaveRequests, userProfile.employeeId, todayStr]);

  const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Columns for Personal Attendance Table
  const attendanceColumns = [
    {
      header: 'Date',
      key: 'date',
      render: (r) => (
        <span className="font-semibold text-slate-800">
          {formatDate(r.date)}
        </span>
      ),
    },
    {
      header: 'Day of Week',
      key: 'dayOfWeek',
      render: (r) => {
        const day = new Date(r.date).toLocaleDateString('en-US', { weekday: 'long' });
        return <span className="text-xs text-muted">{day}</span>;
      },
    },
    {
      header: 'Check In Time',
      key: 'checkInTime',
      align: 'center',
      render: (r) => <span className="text-xs font-medium text-slate-700">{r.checkInTime}</span>,
    },
    {
      header: 'Check Out Time',
      key: 'checkOutTime',
      align: 'center',
      render: (r) => <span className="text-xs font-medium text-slate-700">{r.checkOutTime}</span>,
    },
    {
      header: 'Hours Worked',
      key: 'totalHours',
      align: 'center',
      render: (r) => (
        <span className="text-xs font-semibold text-slate-800">
          {r.totalHours ? `${r.totalHours} hrs` : '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      align: 'center',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Notes / Remarks',
      key: 'notes',
      render: (r) => (
        <span className="text-xs text-slate-600 block truncate max-w-sm" title={r.notes}>
          {r.notes || '—'}
        </span>
      ),
    },
  ];

  // Columns for Leave Requests Table
  const leaveColumns = [
    {
      header: 'Leave Ref',
      key: 'id',
      render: (l) => <span className="font-semibold text-primary">{l.id}</span>,
    },
    {
      header: 'Category / Type',
      key: 'leaveType',
      render: (l) => <span className="font-medium text-slate-800">{l.leaveType}</span>,
    },
    {
      header: 'Duration',
      key: 'duration',
      render: (l) => (
        <div>
          <span className="text-xs font-medium text-slate-700 block">
            {formatDate(l.startDate)} {l.startDate !== l.endDate ? `to ${formatDate(l.endDate)}` : ''}
          </span>
          <span className="text-xs text-muted">
            {l.daysCount} {l.daysCount === 1 ? 'Working Day' : 'Working Days'}
          </span>
        </div>
      ),
    },
    {
      header: 'Reason & Handover',
      key: 'reason',
      render: (l) => (
        <div>
          <span className="text-xs text-slate-800 block truncate max-w-xs" title={l.reason}>
            {l.reason}
          </span>
          {l.supportingInfo && (
            <span className="text-xs text-muted block truncate max-w-xs" title={l.supportingInfo}>
              Handover: {l.supportingInfo}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      align: 'center',
      render: (l) => <StatusBadge status={l.status} />,
    },
    {
      header: 'Approval Remarks',
      key: 'remarks',
      render: (l) => (
        <div>
          <span className="text-xs text-slate-700 block">{l.remarks || 'Pending administrative review'}</span>
          {l.approvedBy && (
            <span className="text-xs text-muted block">By: {l.approvedBy}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Attendance & Work Updates Shared Sub-Navigation */}
      <AttendanceWorkSubNav currentTab="attendance" />

      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Attendance</h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              Shift &amp; Working Hours Tracking
            </span>
          </div>
          <p className="page-description">
            Track daily shift hours, mark attendance check-in/out, view personal monthly calendar, and manage leave applications
          </p>
        </div>

        {/* User Identity Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#334155',
            }}
          >
            <User size={14} className="text-primary" />
            <span>
              Logged in as: <strong>{userProfile.fullName}</strong> ({userRole === 'sales_manager' ? 'Sales Manager' : userRole === 'sales_coordinator' ? 'Sales Coordinator' : userRole === 'junior_sales' ? 'Junior Sales Employee' : 'Sales Representative'})
            </span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar for Manager & Coordinator */}
      {isManagerOrCoordinator && (
        <div className="tab-navigation-bar mb-4">
          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'my-attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-attendance')}
          >
            <Clock size={16} />
            <span>My Attendance</span>
          </button>

          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'team-approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('team-approvals')}
          >
            <Users size={16} />
            <span>Team Attendance &amp; Approvals</span>
            {teamMetrics.pendingLeavesCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: '6px',
                }}
              >
                {teamMetrics.pendingLeavesCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 1: MY ATTENDANCE (ACCESSIBLE TO ALL FOUR ROLES) */}
      {/* ============================================================== */}
      {(!isManagerOrCoordinator || activeTab === 'my-attendance') && (
        <>
          {/* Shift & Live Clock Action Banner */}
          <div
            className="card mb-4"
            style={{
              padding: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'center' }}>
              {/* Left Column: Shift Timing and Today's Status */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <CalendarCheck size={18} className="text-primary" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Today&rsquo;s Shift Status
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {todayRecord ? todayRecord.status : 'Not Checked In'}
                  </h3>
                  <StatusBadge status={todayRecord ? todayRecord.status : 'Pending'} />
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Policy: {attendancePolicy.shiftStartTime} - {attendancePolicy.shiftEndTime} • Grace window: {attendancePolicy.gracePeriodMinutes} mins
                </span>
              </div>

              {/* Middle Column: Check In / Check Out Timestamps */}
              <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Check-in</span>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                      {todayRecord?.checkInTime || '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Check-out</span>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                      {todayRecord?.checkOutTime || '—'}
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    Hours Logged Today: <strong>{liveHoursWorked} hrs</strong>
                    {todayRecord?.checkInTimestamp && !todayRecord?.checkOutTimestamp && (
                      <span className="text-success" style={{ marginLeft: '6px', fontWeight: 600 }}>
                        (Active • Clock: {currentTimeStr})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Right Column: Check In / Check Out Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                {!todayRecord || !todayRecord.checkInTimestamp ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-icon-text"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleCheckIn}
                  >
                    <LogIn size={16} />
                    <span>Check In Now ({currentTimeStr})</span>
                  </button>
                ) : !todayRecord.checkOutTimestamp ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-icon-text"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleCheckOut}
                  >
                    <LogOut size={16} />
                    <span>Check Out (End Shift)</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>
                    <CheckCircle2 size={16} />
                    <span>Shift Completed ({todayRecord.totalHours} hrs logged)</span>
                  </div>
                )}

                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Timestamps are cryptographically locked for audit compliance
                </span>
              </div>
            </div>
          </div>

          {/* Month Attendance Calendar View */}
          <div className="card mb-4" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Personal Shift Calendar — {monthName}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Visual breakdown of attendance compliance, on-time arrivals, late marks, and approved leaves
                </span>
              </div>

              {/* Month Switcher Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  title="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCalendarDate(new Date(2026, 9, 1))}
                  title="Reset to current month"
                >
                  October 2026
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  title="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Calendar Legend */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }} />
                <span>Present / On-Time</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }} />
                <span>Late Arrival</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#8b5cf6', borderRadius: '2px' }} />
                <span>Half-day</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#2563eb', borderRadius: '2px' }} />
                <span>Approved Leave</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#0d9488', borderRadius: '2px' }} />
                <span>Public Holiday</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#94a3b8', borderRadius: '2px' }} />
                <span>Weekend Off</span>
              </div>
            </div>

            {/* Calendar Day Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div
                  key={day}
                  style={{
                    padding: '8px 4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#64748b',
                    background: '#f8fafc',
                    borderRadius: '4px',
                  }}
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      style={{
                        padding: '12px 6px',
                        background: '#fafbfc',
                        border: '1px dashed #f1f5f9',
                        borderRadius: '6px',
                        minHeight: '70px',
                      }}
                    />
                  );
                }

                let bgColor = '#ffffff';
                let borderColor = '#e2e8f0';
                let badgeText = null;
                let badgeColor = '#64748b';

                if (cell.holidayName) {
                  bgColor = '#f0fdfa';
                  borderColor = '#99f6e4';
                  badgeText = cell.holidayName;
                  badgeColor = '#0d9488';
                } else if (cell.isWeekend) {
                  bgColor = '#f8fafc';
                  borderColor = '#e2e8f0';
                  badgeText = 'Weekend';
                  badgeColor = '#64748b';
                } else if (cell.attendanceStatus === 'Present') {
                  bgColor = '#f0fdf4';
                  borderColor = '#bbf7d0';
                  badgeText = `${cell.hoursWorked} hrs`;
                  badgeColor = '#15803d';
                } else if (cell.attendanceStatus === 'Late') {
                  bgColor = '#fffbeb';
                  borderColor = '#fde68a';
                  badgeText = 'Late';
                  badgeColor = '#b45309';
                } else if (cell.attendanceStatus === 'Half-day') {
                  bgColor = '#f5f3ff';
                  borderColor = '#ddd6fe';
                  badgeText = 'Half-day';
                  badgeColor = '#6d28d9';
                } else if (cell.attendanceStatus === 'Approved Leave') {
                  bgColor = '#eff6ff';
                  borderColor = '#bfdbfe';
                  badgeText = cell.leaveType || 'Leave';
                  badgeColor = '#1d4ed8';
                }

                return (
                  <div
                    key={cell.dateStr}
                    style={{
                      padding: '8px 6px',
                      backgroundColor: bgColor,
                      border: cell.isToday ? '2px solid #2563eb' : `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      minHeight: '70px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: cell.isToday ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: cell.isToday ? 700 : 600,
                          color: cell.isToday ? '#2563eb' : '#0f172a',
                        }}
                      >
                        {cell.dayNumber}
                      </span>
                      {cell.isToday && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            background: '#2563eb',
                            color: '#ffffff',
                            padding: '1px 4px',
                            borderRadius: '3px',
                          }}
                        >
                          TODAY
                        </span>
                      )}
                    </div>

                    {badgeText && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: badgeColor,
                          marginTop: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={badgeText}
                      >
                        {badgeText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Attendance Records History Table */}
          <div className="card mb-4" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Personal Attendance History
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Audited shift logs and recorded hours for {userProfile.fullName}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter by date (YYYY-MM-DD) or status..."
                  style={{ width: '260px', fontSize: '12px', padding: '6px 10px' }}
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                />
              </div>
            </div>

            <DataTable
              columns={attendanceColumns}
              data={myAttendanceHistory}
              keyField="id"
              pageSize={7}
              emptyMessage="No attendance records found matching search"
            />
          </div>

          {/* Section: Leave Applications & Status */}
          <div className="card mb-4" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Leave Applications &amp; Status
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Apply for sanctioned leave, check approval decisions, and review calendar updates
                </span>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm btn-icon-text"
                onClick={() => setIsApplyLeaveOpen(true)}
                title="Submit a new leave application"
              >
                <Plus size={15} />
                <span>Apply for Leave</span>
              </button>
            </div>

            <DataTable
              columns={leaveColumns}
              data={myLeaveRequests}
              keyField="id"
              pageSize={5}
              emptyMessage="No leave applications submitted yet"
            />
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: TEAM ATTENDANCE & APPROVALS (MANAGER & COORDINATOR) */}
      {/* ============================================================== */}
      {isManagerOrCoordinator && activeTab === 'team-approvals' && (
        <>
          {/* Governance Authority Banner */}
          <div
            className="card mb-4"
            style={{
              padding: '16px 20px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} className="text-primary shrink-0" />
              <div>
                <strong style={{ fontSize: '14px', color: '#1e40af' }}>
                  {userRole === 'sales_manager' || userRole === 'admin'
                    ? 'Organizational Team Attendance & Approvals'
                    : 'Regional Team Attendance & Approvals (Hyderabad & Deccan)'}
                </strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>
                  {userRole === 'sales_manager' || userRole === 'admin'
                    ? 'Review live company-wide team attendance, approve or reject leave requests, and configure corporate shift rules.'
                    : 'Review live regional team attendance for supervised Sales Representatives and Junior Sales Employees, and approve/reject regional leave requests.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {(userRole === 'sales_manager' || userRole === 'admin') && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-icon-text"
                  onClick={() => setIsConfigPolicyOpen(true)}
                  title="Configure corporate shift hours, grace periods, and public holidays"
                >
                  <Sliders size={14} />
                  <span>Configure Attendance Rules</span>
                </button>
              )}
            </div>
          </div>

          {/* Team Summary KPI Cards */}
          <div className="summary-kpi-grid mb-4">
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
              <div className="summary-kpi-label">Sales Team Headcount</div>
              <div className="summary-kpi-value">{teamMetrics.totalMembers}</div>
              <div className="summary-kpi-sub">
                {userRole === 'sales_manager' || userRole === 'admin' ? 'Company Commercial Roster' : 'Regional Hyderabad Roster'}
              </div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
              <div className="summary-kpi-label">Present On Shift Today</div>
              <div className="summary-kpi-value text-success">{teamMetrics.presentCount}</div>
              <div className="summary-kpi-sub">On-time check-ins</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
              <div className="summary-kpi-label">Pending Leave Approvals</div>
              <div className="summary-kpi-value text-warning">{teamMetrics.pendingLeavesCount}</div>
              <div className="summary-kpi-sub">Requires management review</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
              <div className="summary-kpi-label">Late / Half-Day</div>
              <div className="summary-kpi-value text-muted">{teamMetrics.lateOrHalfCount}</div>
              <div className="summary-kpi-sub">Shift grace exceeded</div>
            </div>
          </div>

          {/* Section: Pending Leave Approvals Queue */}
          <div className="card mb-4" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Pending Leave Approvals Queue
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Review leave applications submitted by sales personnel. Approval dynamically marks attendance records and updates calendar.
                </span>
              </div>
            </div>

            {scopedLeaveRequests.filter((l) => l.status === 'Pending Approval').length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <CheckCircle2 size={24} className="text-success mx-auto mb-2" />
                All employee leave applications have been reviewed. No pending approvals in queue.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {scopedLeaveRequests
                  .filter((l) => l.status === 'Pending Approval')
                  .map((leave) => {
                    const isSelf = leave.employeeId === userProfile.employeeId;

                    return (
                      <div
                        key={leave.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '14px', color: '#0f172a' }}>{leave.employeeName}</strong>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>({leave.employeeId})</span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#1e40af',
                                background: '#eff6ff',
                                padding: '1px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {leave.leaveType}
                            </span>
                            <StatusBadge status={leave.status} size="small" />
                          </div>

                          <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                            <strong>Requested Period:</strong> {formatDate(leave.startDate)} to {formatDate(leave.endDate)} ({leave.daysCount} working days)
                          </div>

                          <div style={{ fontSize: '12px', color: '#475569' }}>
                            <strong>Reason:</strong> &ldquo;{leave.reason}&rdquo;
                            {leave.supportingInfo && (
                              <span style={{ color: '#64748b', marginLeft: '6px' }}>• Handover: {leave.supportingInfo}</span>
                            )}
                          </div>
                        </div>

                        {/* Supervisory Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-success btn-sm btn-icon-text"
                            onClick={() => handleApproveLeave(leave.id)}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? 'Compliance violation: You cannot approve your own leave request'
                                : 'Sanction this leave application'
                            }
                          >
                            <CheckCircle2 size={14} />
                            <span>Approve Leave</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm btn-icon-text"
                            onClick={() => setRejectingLeave(leave)}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? 'Compliance violation: You cannot reject your own leave request'
                                : 'Reject leave application with reason'
                            }
                          >
                            <XCircle size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Section: Team Attendance Roster Today */}
          <div className="card mb-4" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Today&rsquo;s Team Shift Attendance Roster
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Shift status for {userRole === 'sales_manager' || userRole === 'admin' ? 'all commercial and field sales representatives' : 'regional field sales team (Hyderabad & Deccan)'} on {formatDate(todayStr)}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="enterprise-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Full Name</th>
                    <th>Job Title &amp; Territory</th>
                    <th style={{ textAlign: 'center' }}>Today&rsquo;s Status</th>
                    <th style={{ textAlign: 'center' }}>Check-in</th>
                    <th style={{ textAlign: 'center' }}>Check-out</th>
                    <th style={{ textAlign: 'center' }}>Hours Worked</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedTeamRoster.map((emp) => {
                    const record = attendanceRecords.find((r) => r.employeeId === emp.employeeId && r.date === todayStr);

                    return (
                      <tr key={emp.employeeId}>
                        <td style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>{emp.employeeId}</td>
                        <td style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{emp.fullName}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          {emp.jobTitle} • {emp.territoryName ? emp.territoryName.split('(')[0] : emp.department}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <StatusBadge status={record ? record.status : 'Not Checked In'} size="small" />
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 500 }}>
                          {record?.checkInTime || '—'}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 500 }}>
                          {record?.checkOutTime || '—'}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>
                          {record?.totalHours ? `${record.totalHours} hrs` : record?.checkInTimestamp ? 'Ongoing' : '0.0 hrs'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Global Modals for this Page */}
      <ApplyLeaveModal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
      />

      <RejectReasonModal
        isOpen={Boolean(rejectingLeave)}
        onClose={() => setRejectingLeave(null)}
        leaveRequest={rejectingLeave}
        onConfirm={handleConfirmRejectLeave}
      />

      <ConfigureAttendancePolicyModal
        isOpen={isConfigPolicyOpen}
        onClose={() => setIsConfigPolicyOpen(false)}
      />
    </div>
  );
}
