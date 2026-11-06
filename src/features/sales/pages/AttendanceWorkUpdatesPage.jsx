import { useState, useMemo, useEffect } from 'react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import SubmitWorkUpdateModal from '../components/modals/SubmitWorkUpdateModal';
import EditWorkUpdateModal from '../components/modals/EditWorkUpdateModal';
import ApplyLeaveModal from '../components/modals/ApplyLeaveModal';
import RejectReasonModal from '../components/modals/RejectReasonModal';
import ConfigureAttendancePolicyModal from '../components/modals/ConfigureAttendancePolicyModal';
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
  Edit,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  User,
  Users,
  Target,
  FileText,
  Sliders,
  ChevronLeft,
  ChevronRight,
  History,
  Info,
} from 'lucide-react';

export default function AttendanceWorkUpdatesPage() {
  const {
    userProfile,
    userRole,
    setUserRole,
    permissions,
    attendanceRecords = [],
    attendancePolicy,
    teamRoster = [],
    workUpdates = [],
    leaveRequests = [],
    targets = [],
    checkInEmployee,
    checkOutEmployee,
    approveLeaveRequest,
    rejectLeaveRequest,
    navigateTo,
  } = useSales();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('my-attendance'); // 'my-attendance' | 'team-approvals'
  const [workFilter, setWorkFilter] = useState('all'); // 'all' | 'Completed' | 'In Progress' | 'Blocked'
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Modals state
  const [isSubmitWorkOpen, setIsSubmitWorkOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
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

  const isAdmin = permissions.isAdmin || userRole === 'admin' || userRole === 'sales_manager';
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
      approveLeaveRequest(leaveId, 'Approved by Administrator. Handover confirmed.');
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

  // Filtered Work Updates for logged-in employee
  const myWorkUpdates = useMemo(() => {
    return workUpdates.filter((w) => {
      const isMine = w.employeeId === userProfile.employeeId;
      const matchesProg = workFilter === 'all' || w.progress === workFilter;
      return isMine && matchesProg;
    });
  }, [workUpdates, userProfile.employeeId, workFilter]);

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

  // Team summary metrics (Admin view)
  const teamMetrics = useMemo(() => {
    const totalMembers = teamRoster.length;
    let presentCount = 0;
    let lateOrHalfCount = 0;
    let onLeaveCount = 0;

    teamRoster.forEach((emp) => {
      const rec = attendanceRecords.find((r) => r.employeeId === emp.employeeId && r.date === todayStr);
      if (rec) {
        if (rec.status === 'Present') presentCount += 1;
        else if (rec.status === 'Late' || rec.status === 'Half-day') lateOrHalfCount += 1;
        else if (rec.status === 'Approved Leave') onLeaveCount += 1;
      }
    });

    const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'Pending Approval').length;
    const blockedTasksCount = workUpdates.filter((w) => w.progress === 'Blocked').length;

    return {
      totalMembers,
      presentCount,
      lateOrHalfCount,
      onLeaveCount,
      pendingLeavesCount,
      blockedTasksCount,
    };
  }, [teamRoster, attendanceRecords, leaveRequests, workUpdates, todayStr]);

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
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <h2 className="page-title">Attendance &amp; Work Updates</h2>
          <p className="page-description">
            Shift check-in timestamps, monthly working calendar, daily deliverables reporting, and leave governance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Demo Role Switcher Badge for Easy Evaluation */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            <User size={14} className="text-primary" />
            <span>
              Logged in as: <strong>{userProfile.fullName}</strong> ({userRole === 'admin' ? 'Administrator' : 'Sales Rep'})
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '2px 8px', height: '26px' }}
              onClick={() => setUserRole(userRole === 'admin' ? 'sales_rep' : 'admin')}
              title="Toggle demo view between Sales Representative and Administrator"
            >
              Switch to {userRole === 'admin' ? 'Sales Rep View' : 'Admin View'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'my-attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-attendance')}
        >
          <Clock size={16} />
          <span>My Attendance &amp; Work Updates</span>
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

      {/* ============================================================== */}
      {/* TAB 1: MY ATTENDANCE & WORK UPDATES (EMPLOYEE VIEW) */}
      {/* ============================================================== */}
      {activeTab === 'my-attendance' && (
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
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#334155' }}>
                  <strong>Hours Worked:</strong>{' '}
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>
                    {todayRecord?.checkOutTimestamp
                      ? `${todayRecord.totalHours} hrs`
                      : todayRecord?.checkInTimestamp
                      ? `${liveHoursWorked} hrs (Shift Ongoing)`
                      : '0.0 hrs'}
                  </span>
                </div>
              </div>

              {/* Right Column: Actions (Check In / Check Out) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-icon-text"
                    style={{ flex: 1, height: '42px', justifyContent: 'center' }}
                    onClick={handleCheckIn}
                    disabled={Boolean(todayRecord?.checkInTimestamp)}
                    title={todayRecord?.checkInTimestamp ? 'Already checked in for today' : 'Record arrival timestamp'}
                  >
                    <LogIn size={16} />
                    <span>Check In</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-icon-text"
                    style={{ flex: 1, height: '42px', justifyContent: 'center' }}
                    onClick={handleCheckOut}
                    disabled={!todayRecord?.checkInTimestamp || Boolean(todayRecord?.checkOutTimestamp)}
                    title={
                      !todayRecord?.checkInTimestamp
                        ? 'Check in first before checking out'
                        : todayRecord?.checkOutTimestamp
                        ? 'Shift concluded for today'
                        : 'Record shift departure timestamp'
                    }
                  >
                    <LogOut size={16} />
                    <span>Check Out</span>
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                  Live System Clock: <strong>{currentTimeStr}</strong> • Tamper-resistant timestamping
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Working Calendar Card */}
          <div
            className="card mb-4"
            style={{
              padding: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            {/* Calendar Header with Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} className="text-primary" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Working Days &amp; Attendance Calendar: {monthName}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
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
                  Current Month
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                  title="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* 7-Day Calendar Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div
                  key={day}
                  style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: day === 'Sun' ? '#dc2626' : '#475569',
                    padding: '6px 0',
                    background: '#f8fafc',
                    borderRadius: '4px',
                  }}
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((d, index) => {
                if (!d) {
                  return (
                    <div
                      key={`empty-${index}`}
                      style={{
                        minHeight: '76px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        opacity: 0.35,
                      }}
                    />
                  );
                }

                // Cell styling based on day characteristics
                let bg = '#ffffff';
                let border = '1px solid #e2e8f0';
                if (d.isWeekend) {
                  bg = '#fef2f2';
                  border = '1px solid #fecaca';
                } else if (d.holidayName) {
                  bg = '#fffbeb';
                  border = '1px solid #fde68a';
                } else if (d.attendanceStatus === 'Approved Leave') {
                  bg = '#eff6ff';
                  border = '1px solid #bfdbfe';
                } else if (d.attendanceStatus === 'Present') {
                  bg = '#f0fdf4';
                  border = '1px solid #bbf7d0';
                } else if (d.attendanceStatus === 'Late') {
                  bg = '#fffbeb';
                  border = '1px solid #fed7aa';
                } else if (d.attendanceStatus === 'Half-day') {
                  bg = '#fefce8';
                  border = '1px solid #fef08a';
                }

                return (
                  <div
                    key={d.dateStr}
                    style={{
                      minHeight: '76px',
                      padding: '8px',
                      background: bg,
                      border: d.isToday ? '2px solid #2563eb' : border,
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: d.isToday ? 800 : 600,
                          color: d.isToday ? '#2563eb' : d.isWeekend ? '#dc2626' : '#1e293b',
                        }}
                      >
                        {d.dayNumber}
                      </span>
                      {d.isToday && (
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#2563eb', background: '#dbeafe', padding: '1px 4px', borderRadius: '4px' }}>
                          TODAY
                        </span>
                      )}
                    </div>

                    {/* Day description or holiday name */}
                    <div>
                      {d.holidayName && (
                        <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                          ★ {d.holidayName}
                        </span>
                      )}
                      {d.isWeekend && !d.holidayName && (
                        <span style={{ fontSize: '10px', color: '#991b1b', fontWeight: 600, display: 'block' }}>
                          Sunday
                        </span>
                      )}
                      {d.attendanceStatus === 'Approved Leave' && (
                        <span style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: 700, display: 'block' }}>
                          On Leave ({d.leaveType || 'CL'})
                        </span>
                      )}
                      {d.attendanceStatus && d.attendanceStatus !== 'Approved Leave' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor:
                                d.attendanceStatus === 'Present'
                                  ? '#10b981'
                                  : d.attendanceStatus === 'Late'
                                  ? '#f59e0b'
                                  : '#eab308',
                              display: 'inline-block',
                            }}
                          />
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#334155' }}>
                            {d.attendanceStatus} ({d.hoursWorked}h)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Legend Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '14px',
                paddingTop: '10px',
                borderTop: '1px solid #f1f5f9',
                fontSize: '11px',
                color: '#64748b',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '2px' }} />
                <span>Present</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: '2px' }} />
                <span>Late Arrival</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '2px' }} />
                <span>Half-day</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '2px' }} />
                <span>Approved Leave</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '2px' }} />
                <span>Public Holiday</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '2px' }} />
                <span>Weekend (Sunday)</span>
              </div>
            </div>
          </div>

          {/* Section: Attendance History Table */}
          <div className="card mb-4" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Attendance History by Date
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Audited shift logs and status history recorded against Employee ID: {userProfile.employeeId}
                </span>
              </div>

              <div style={{ width: '240px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter by date or status..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  style={{ height: '34px', fontSize: '12px' }}
                />
              </div>
            </div>

            <DataTable
              columns={attendanceColumns}
              data={myAttendanceHistory}
              keyField="id"
              pageSize={6}
              emptyMessage="No attendance records found matching criteria"
            />
          </div>

          {/* Section: Daily Work Updates */}
          <div className="card mb-4" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Daily Work Updates &amp; Deliverables
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Report task completion, work in progress, operational blockers, and milestone linkage
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Progress Filter Pills */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
                  {['all', 'Completed', 'In Progress', 'Blocked'].map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`btn btn-sm ${workFilter === filter ? 'btn-primary' : ''}`}
                      style={{
                        padding: '3px 10px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: 'none',
                        background: workFilter === filter ? '#2563eb' : 'transparent',
                        color: workFilter === filter ? '#ffffff' : '#64748b',
                      }}
                      onClick={() => setWorkFilter(filter)}
                    >
                      {filter === 'all' ? 'All Updates' : filter}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-icon-text"
                  onClick={() => setIsSubmitWorkOpen(true)}
                  title="Submit a new daily work update"
                >
                  <Plus size={15} />
                  <span>Submit Work Update</span>
                </button>
              </div>
            </div>

            {/* Work Updates Cards */}
            {myWorkUpdates.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No daily work updates found matching this filter. Click &ldquo;Submit Work Update&rdquo; to log your deliverables.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myWorkUpdates.map((item) => {
                  const targetObj = targets.find((t) => t.id === item.targetId);

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#ffffff',
                        border: item.progress === 'Blocked' ? '1px solid #fecaca' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '14px', color: '#0f172a' }}>{item.title}</strong>
                            <StatusBadge status={item.progress} size="small" />
                            {item.moduleRef && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: '#2563eb',
                                  background: '#eff6ff',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                Ref: {item.moduleRef}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Logged on {formatDate(item.date)} by {item.employeeName}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                            {item.progressPercentage}% Completed
                          </span>
                          <button
                            type="button"
                            className="table-action-icon-btn"
                            onClick={() => setEditingUpdate(item)}
                            title="Edit or correct this work update (Preserves audit history)"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${item.progressPercentage}%`,
                            height: '100%',
                            background:
                              item.progress === 'Completed'
                                ? '#10b981'
                                : item.progress === 'Blocked'
                                ? '#ef4444'
                                : '#2563eb',
                            borderRadius: '4px',
                          }}
                        />
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                        {item.description}
                      </p>

                      {/* Blockers Callout if present */}
                      {item.blockers && (
                        <div
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '12px',
                            color: '#991b1b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <AlertTriangle size={15} className="shrink-0 text-danger" />
                          <span>
                            <strong>Issue / Blocker Reported:</strong> {item.blockers}
                          </span>
                        </div>
                      )}

                      {/* Next Steps and Target Linkage Footer */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '8px',
                          borderTop: '1px solid #f1f5f9',
                          fontSize: '12px',
                          color: '#64748b',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        {item.nextSteps ? (
                          <div>
                            <strong>Next Steps:</strong> {item.nextSteps}
                          </div>
                        ) : (
                          <div />
                        )}

                        {targetObj && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e40af' }}>
                            <Target size={13} />
                            <span>
                              Linked Target: <strong>[{targetObj.period}] {targetObj.title}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Audit Version History Snapshot if edited */}
                      {(item.versionHistory || []).length > 0 && (
                        <div style={{ marginTop: '4px', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', color: '#64748b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <History size={12} className="text-muted" />
                            <strong>Audit History:</strong> Edited {item.versionHistory.length} time(s). Latest: &ldquo;{item.versionHistory[0].changeSummary}&rdquo; by {item.versionHistory[0].editedBy} on {formatDate(item.versionHistory[0].editedAt)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Leave Applications */}
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
      {/* TAB 2: TEAM ATTENDANCE & APPROVALS (ADMIN VIEW) */}
      {/* ============================================================== */}
      {activeTab === 'team-approvals' && (
        <>
          {/* Admin Authority Banner */}
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
                  Team Management &amp; Administrative Governance Dashboard
                </strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>
                  Review live team attendance, approve or reject leave requests, unblock team bottlenecks, and configure company shift rules.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon-text"
                onClick={() => setIsConfigPolicyOpen(true)}
                title="Configure corporate shift hours, grace periods, and public holidays"
              >
                <Sliders size={14} />
                <span>Configure Attendance Rules</span>
              </button>
            </div>
          </div>

          {/* Team Summary KPI Cards */}
          <div className="summary-kpi-grid mb-4">
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
              <div className="summary-kpi-label">Sales Team Headcount</div>
              <div className="summary-kpi-value">{teamMetrics.totalMembers}</div>
              <div className="summary-kpi-sub">Commercial &amp; Field Roster</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
              <div className="summary-kpi-label">Present On Shift Today</div>
              <div className="summary-kpi-value text-success">{teamMetrics.presentCount}</div>
              <div className="summary-kpi-sub">On-time check-ins</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
              <div className="summary-kpi-label">Pending Leave Approvals</div>
              <div className="summary-kpi-value text-warning">{teamMetrics.pendingLeavesCount}</div>
              <div className="summary-kpi-sub">Requires Administrator review</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ef4444' }}>
              <div className="summary-kpi-label">Reported Blockers</div>
              <div className="summary-kpi-value text-danger">{teamMetrics.blockedTasksCount}</div>
              <div className="summary-kpi-sub">Tasks needing administrative unblocking</div>
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

            {leaveRequests.filter((l) => l.status === 'Pending Approval').length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <CheckCircle2 size={24} className="text-success mx-auto mb-2" />
                All employee leave applications have been reviewed. No pending approvals in queue.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaveRequests
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

                        {/* Admin Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-success btn-sm btn-icon-text"
                            onClick={() => handleApproveLeave(leave.id)}
                            disabled={isSelf && userRole === 'sales_rep'}
                            title={
                              isSelf && userRole === 'sales_rep'
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
                            disabled={isSelf && userRole === 'sales_rep'}
                            title="Reject leave application with reason"
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
                Shift status for all commercial and field sales representatives on {formatDate(todayStr)}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="enterprise-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Full Name</th>
                    <th>Job Title &amp; Department</th>
                    <th style={{ textAlign: 'center' }}>Today&rsquo;s Status</th>
                    <th style={{ textAlign: 'center' }}>Check-in</th>
                    <th style={{ textAlign: 'center' }}>Check-out</th>
                    <th style={{ textAlign: 'center' }}>Hours Worked</th>
                    <th>Latest Work Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRoster.map((emp) => {
                    const record = attendanceRecords.find((r) => r.employeeId === emp.employeeId && r.date === todayStr);
                    const latestWork = workUpdates.find((w) => w.employeeId === emp.employeeId);

                    return (
                      <tr key={emp.employeeId}>
                        <td style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>{emp.employeeId}</td>
                        <td style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{emp.fullName}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          {emp.jobTitle} • {emp.department}
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
                        <td style={{ fontSize: '12px', color: '#334155' }}>
                          {latestWork ? (
                            <span title={latestWork.description}>
                              <strong>{latestWork.title}</strong> ({latestWork.progress})
                            </span>
                          ) : (
                            <span className="text-muted">No updates submitted</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Team Work Updates & Reported Blockers */}
          <div className="card mb-4" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Team Work Updates &amp; Active Blockers
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Operational deliverables feed from sales personnel, highlighting issues needing management intervention
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {workUpdates.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: item.progress === 'Blocked' ? '#fef2f2' : '#ffffff',
                    border: item.progress === 'Blocked' ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.employeeName}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>({item.role})</span>
                      <strong style={{ fontSize: '13px', color: '#334155' }}>• {item.title}</strong>
                      <StatusBadge status={item.progress} size="small" />
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDate(item.date)}</span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: 1.4 }}>
                    {item.description}
                  </p>

                  {item.blockers && (
                    <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>Blocker: {item.blockers}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Global Modals for this Page */}
      <SubmitWorkUpdateModal
        isOpen={isSubmitWorkOpen}
        onClose={() => setIsSubmitWorkOpen(false)}
      />

      <EditWorkUpdateModal
        isOpen={Boolean(editingUpdate)}
        onClose={() => setEditingUpdate(null)}
        update={editingUpdate}
      />

      <ApplyLeaveModal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
      />

      <RejectReasonModal
        isOpen={Boolean(rejectingLeave)}
        onClose={() => setRejectingLeave(null)}
        onConfirm={handleConfirmRejectLeave}
        title="Reject Leave Application"
        subtitle={`Employee: ${rejectingLeave?.employeeName} • ${rejectingLeave?.leaveType}`}
        placeholder="Provide the reason for rejecting this leave application..."
      />

      <ConfigureAttendancePolicyModal
        isOpen={isConfigPolicyOpen}
        onClose={() => setIsConfigPolicyOpen(false)}
      />
    </div>
  );
}
