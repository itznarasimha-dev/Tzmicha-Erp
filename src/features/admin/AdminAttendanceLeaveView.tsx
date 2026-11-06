import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import {
  EmployeeAttendanceRecord,
  PlanOfActionItem,
  LeaveRequest,
  AttendanceStatus,
  LeaveType,
} from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CalendarCheck,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  Building2,
  MapPin,
  Sparkles,
  RefreshCw,
  FileText,
  UserCheck,
  UserX,
  ChevronRight,
  Eye,
  Info,
  CalendarX,
  Send,
  PlusCircle,
  Phone,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  Download,
  Target,
  ListTodo,
  CheckSquare,
  Plus,
  Edit3,
} from 'lucide-react';

export const AdminAttendanceLeaveView: React.FC = () => {
  const {
    attendanceRecords,
    leaveRequests,
    approveLeaveRequest,
    rejectLeaveRequest,
    submitLeaveRequest,
    markAttendancePunch,
    updatePlanOfAction,
    togglePoaItem,
    currentOrganization,
    users,
  } = useErpStore();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves'>('attendance');

  // Attendance Filters & State
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-29'); // Today
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [poaFilter, setPoaFilter] = useState<string>('all');
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<EmployeeAttendanceRecord | null>(null);

  // Plan of Action (POA) Inspector & Feedback State
  const [supervisorCommentInput, setSupervisorCommentInput] = useState('');
  const [isEditingPoaText, setIsEditingPoaText] = useState(false);
  const [customPoaText, setCustomPoaText] = useState('');
  const [newPoaGoalInput, setNewPoaGoalInput] = useState('');

  // Add Attendance Check-In with POA Modal State
  const [isAddPunchModalOpen, setIsAddPunchModalOpen] = useState(false);
  const [punchUserId, setPunchUserId] = useState('usr-sales-01');
  const [punchCheckInTime, setPunchCheckInTime] = useState('09:00 AM');
  const [punchStatus, setPunchStatus] = useState<AttendanceStatus>('present');
  const [punchLocation, setPunchLocation] = useState('Delhi Okhla HQ • Terminal A');
  const [punchMethod, setPunchMethod] = useState<'Biometric Fingerprint' | 'Mobile GPS Geofence' | 'Web Portal'>('Biometric Fingerprint');
  const [punchPoaSummary, setPunchPoaSummary] = useState('');
  const [punchPoaItemsText, setPunchPoaItemsText] = useState('');

  // Leave Management Filters & State
  const [leaveStatusTab, setLeaveStatusTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');
  const [selectedLeaveForAction, setSelectedLeaveForAction] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [adminComment, setAdminComment] = useState('');
  const [viewingLeaveDetail, setViewingLeaveDetail] = useState<LeaveRequest | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Attendance Records for Selected Date
  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const matchesDate = record.date === selectedDate;
      const matchesSearch =
        record.employeeName.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        record.roleTitle.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        record.department.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        (record.planOfAction || '').toLowerCase().includes(attendanceSearch.toLowerCase());
      const matchesDept = departmentFilter === 'all' || record.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesPoa =
        poaFilter === 'all' ||
        (poaFilter === 'with_poa' && Boolean(record.planOfAction) && record.status !== 'absent') ||
        (poaFilter === 'completed' && record.planStatus === 'completed') ||
        (poaFilter === 'in_progress' && record.planStatus === 'in_progress') ||
        (poaFilter === 'missing' && !record.planOfAction && record.status !== 'on_leave');

      return matchesDate && matchesSearch && matchesDept && matchesStatus && matchesPoa;
    });
  }, [attendanceRecords, selectedDate, attendanceSearch, departmentFilter, statusFilter, poaFilter]);

  // Attendance Aggregate Metrics for Selected Date
  const attendanceMetrics = useMemo(() => {
    const recordsForDate = attendanceRecords.filter((r) => r.date === selectedDate);
    const total = recordsForDate.length;
    const present = recordsForDate.filter((r) => r.status === 'present').length;
    const late = recordsForDate.filter((r) => r.status === 'late').length;
    const onLeave = recordsForDate.filter((r) => r.status === 'on_leave').length;
    const absent = recordsForDate.filter((r) => r.status === 'absent').length;
    const halfDay = recordsForDate.filter((r) => r.status === 'half_day').length;

    const onDutyTotal = present + late + halfDay;
    const poaSubmitted = recordsForDate.filter((r) => r.planOfAction && r.status !== 'absent').length;
    const poaCompleted = recordsForDate.filter((r) => r.planStatus === 'completed').length;
    const poaRate = onDutyTotal > 0 ? Math.round((poaSubmitted / onDutyTotal) * 100) : 0;

    const presentPercentage = total > 0 ? Math.round((onDutyTotal / total) * 100) : 0;

    return {
      total,
      present,
      late,
      onLeave,
      absent,
      halfDay,
      presentPercentage,
      poaSubmitted,
      poaCompleted,
      poaRate,
      onDutyTotal,
    };
  }, [attendanceRecords, selectedDate]);

  // Filtered Leave Requests
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((req) => {
      const matchesTab = leaveStatusTab === 'all' || req.status === leaveStatusTab;
      const matchesSearch =
        req.employeeName.toLowerCase().includes(leaveSearch.toLowerCase()) ||
        req.employeeId.toLowerCase().includes(leaveSearch.toLowerCase()) ||
        req.department.toLowerCase().includes(leaveSearch.toLowerCase()) ||
        req.reason.toLowerCase().includes(leaveSearch.toLowerCase());
      const matchesType = leaveTypeFilter === 'all' || req.leaveType === leaveTypeFilter;

      return matchesTab && matchesSearch && matchesType;
    });
  }, [leaveRequests, leaveStatusTab, leaveSearch, leaveTypeFilter]);

  // Leave Summary Metrics
  const leaveMetrics = useMemo(() => {
    const pending = leaveRequests.filter((r) => r.status === 'pending').length;
    const approved = leaveRequests.filter((r) => r.status === 'approved').length;
    const rejected = leaveRequests.filter((r) => r.status === 'rejected').length;
    const totalDaysOut = leaveRequests
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + r.durationDays, 0);

    return { pending, approved, rejected, totalDaysOut };
  }, [leaveRequests]);

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set<string>();
    attendanceRecords.forEach((r) => depts.add(r.department));
    return Array.from(depts);
  }, [attendanceRecords]);

  // Handle Approve / Reject Confirmation
  const handleConfirmDecision = () => {
    if (!selectedLeaveForAction) return;

    if (actionType === 'approve') {
      approveLeaveRequest(selectedLeaveForAction.id, adminComment);
      showToast(`Leave request for ${selectedLeaveForAction.employeeName} approved! Attendance updated to On Leave.`);
    } else {
      rejectLeaveRequest(selectedLeaveForAction.id, adminComment);
      showToast(`Leave request for ${selectedLeaveForAction.employeeName} rejected.`);
    }

    setSelectedLeaveForAction(null);
    setAdminComment('');
  };

  // Helper Badge Colors
  const getAttendanceStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <Badge variant="success">Present</Badge>;
      case 'late':
        return <Badge variant="warning">Late Arrival</Badge>;
      case 'on_leave':
        return <Badge variant="purple">On Approved Leave</Badge>;
      case 'half_day':
        return <Badge variant="neutral">Half Day</Badge>;
      case 'absent':
        return <Badge variant="danger">Absent</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getLeaveStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getLeaveTypeBadge = (type: LeaveType) => {
    switch (type) {
      case 'Casual Leave':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Casual</span>;
      case 'Sick Leave':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Sick</span>;
      case 'Paid Privilege Leave':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Privilege</span>;
      case 'Comp-off':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Comp-off</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Attendance &amp; Leave Governance
            </h1>
            <Badge variant="purple" size="sm">
              Tenant: {currentOrganization?.teamId || 'APEX-2026'}
            </Badge>
            {leaveMetrics.pending > 0 && (
              <Badge variant="warning" size="sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse inline-block" />
                {leaveMetrics.pending} Pending Leave Approvals
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track daily biometric &amp; geofence staff check-ins, resolve shift discrepancies, and authorize employee leave workflows.
          </p>
        </div>

        {/* Top Workspace Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Daily Attendance</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-600">
              {attendanceMetrics.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaves')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'leaves'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-purple-600" />
            <span>Leave Requests</span>
            {leaveMetrics.pending > 0 ? (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
                {leaveMetrics.pending} Pending
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-600">
                {leaveRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Simulated Cross-Module Sync Notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs leading-relaxed">
        <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <span className="font-bold text-slate-900">Dynamic Attendance &amp; Leave Synchronization: </span>
          When an administrator approves a leave request, the employee's attendance record is instantly marked as <strong>On Approved Leave</strong> for all dates within that duration. Rejected or pending leaves do not affect daily attendance rosters.
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: DAILY ATTENDANCE REGISTER
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
            <div className="glass-card p-4 space-y-1.5 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-900">{attendanceMetrics.total}</div>
              <p className="text-[11px] text-slate-500 font-medium">On Roster for {selectedDate}</p>
            </div>

            <div className="glass-card p-4 space-y-1.5 border border-emerald-100">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Present Today</span>
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1.5">
                <span>{attendanceMetrics.present}</span>
                <span className="text-xs font-bold text-emerald-600">({attendanceMetrics.presentPercentage}%)</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">On-Time Biometric &amp; GPS Check-in</p>
            </div>

            <div className="glass-card p-4 space-y-1.5 border border-indigo-100 bg-indigo-50/20">
              <div className="flex items-center justify-between text-indigo-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Plan of Action (POA)</span>
                <Target className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-indigo-900 flex items-baseline gap-1.5">
                <span>{attendanceMetrics.poaSubmitted}</span>
                <span className="text-xs font-bold text-indigo-600">({attendanceMetrics.poaRate}%)</span>
              </div>
              <p className="text-[11px] text-indigo-700 font-medium">{attendanceMetrics.poaCompleted} Completed Plans</p>
            </div>

            <div className="glass-card p-4 space-y-1.5 border border-amber-100">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Late Arrivals</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900">{attendanceMetrics.late}</div>
              <p className="text-[11px] text-amber-700 font-medium">Past Grace Period (&gt; 09:30 AM)</p>
            </div>

            <div className="glass-card p-4 space-y-1.5 border border-purple-100">
              <div className="flex items-center justify-between text-purple-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Approved Leave</span>
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900">{attendanceMetrics.onLeave}</div>
              <p className="text-[11px] text-purple-700 font-medium">Approved Leave Requests Active</p>
            </div>

            <div className="glass-card p-4 space-y-1.5 border border-rose-100">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unplanned Absent</span>
                <UserX className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900">{attendanceMetrics.absent}</div>
              <p className="text-[11px] text-rose-700 font-medium">No Check-in Recorded by 10:30 AM</p>
            </div>
          </div>

          {/* Date Selector & Search/Filter Toolbar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Date Quick Buttons & Custom Input */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Select Date:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-10-29')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDate === '2026-10-29'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Today (29 Oct)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-10-28')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDate === '2026-10-28'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Yesterday (28 Oct)
                </button>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status & Department Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Department Dropdown */}
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                {/* Status Dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present Only</option>
                  <option value="late">Late Arrivals</option>
                  <option value="on_leave">On Approved Leave</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                </select>

                {/* Plan of Action (POA) Filter */}
                <select
                  value={poaFilter}
                  onChange={(e) => setPoaFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-indigo-50/60 border border-indigo-200 font-semibold text-indigo-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Plan of Action (POA)</option>
                  <option value="with_poa">POA Submitted</option>
                  <option value="completed">POA Completed (100%)</option>
                  <option value="in_progress">POA In Progress</option>
                  <option value="missing">Pending POA</option>
                </select>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, employee code, role, or department..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Daily Attendance Roster Table */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Staff Attendance Roster &amp; Daily Plans of Action — {selectedDate}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {filteredAttendance.length} records • {attendanceMetrics.poaSubmitted} of {attendanceMetrics.onDutyTotal} employees submitted their daily Plan of Action (POA).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showToast(`Exported Attendance Report for ${selectedDate} (CSV)`)}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Export CSV
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPunchUserId(users[0]?.id || 'usr-sales-01');
                    setPunchCheckInTime('09:00 AM');
                    setPunchPoaSummary('');
                    setPunchPoaItemsText('');
                    setIsAddPunchModalOpen(true);
                  }}
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-lime-400" />
                  Record Check-In &amp; POA
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Employee &amp; Dept</th>
                    <th className="py-3 px-4 min-w-[280px]">Daily Plan of Action (POA)</th>
                    <th className="py-3 px-4">Check-In / Punch</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Work Duration</th>
                    <th className="py-3 px-4">Punch &amp; Geofence</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <UserX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="font-bold text-slate-600">No attendance records found</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Try adjusting the search query, date, or filter criteria.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Employee Column */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={record.avatar}
                              alt={record.employeeName}
                              className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {record.employeeName}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <span className="font-mono font-semibold text-slate-600">{record.employeeId}</span>
                                <span>•</span>
                                <span className="truncate">{record.department}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Daily Plan of Action (POA) Column */}
                        <td className="py-3.5 px-4 max-w-[320px]">
                          {record.planOfAction ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {record.planStatus === 'completed' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    100% Achieved
                                  </span>
                                )}
                                {record.planStatus === 'in_progress' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <Clock className="w-3 h-3 text-indigo-600" />
                                    {record.poaProgressPercent || 50}% In Progress
                                  </span>
                                )}
                                {record.planStatus === 'planned' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    Planned
                                  </span>
                                )}
                                {record.planOfActionItems && record.planOfActionItems.length > 0 && (
                                  <span className="text-[10px] text-slate-400 font-mono font-semibold">
                                    ({record.planOfActionItems.filter((i) => i.completed).length}/{record.planOfActionItems.length} goals)
                                  </span>
                                )}
                              </div>

                              <p
                                onClick={() => {
                                  setSelectedAttendanceRecord(record);
                                  setIsEditingPoaText(false);
                                  setSupervisorCommentInput(record.supervisorFeedback || '');
                                }}
                                className="text-xs text-slate-800 line-clamp-2 hover:text-indigo-600 cursor-pointer font-medium leading-relaxed group"
                                title="Click to view full Plan of Action & check deliverables"
                              >
                                {record.planOfAction}
                              </p>

                              {record.supervisorFeedback && (
                                <div className="text-[10px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md font-medium truncate flex items-center gap-1">
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                                  <span className="truncate">Feedback: {record.supervisorFeedback}</span>
                                </div>
                              )}
                            </div>
                          ) : record.status === 'on_leave' ? (
                            <span className="text-[11px] text-purple-700 font-medium italic">
                              On Approved Leave (Duties Delegated)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAttendanceRecord(record);
                                setIsEditingPoaText(true);
                                setCustomPoaText('');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-xl cursor-pointer transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Assign Daily POA</span>
                            </button>
                          )}
                        </td>

                        {/* Check-In */}
                        <td className="py-3.5 px-4">
                          {record.checkInTime ? (
                            <div>
                              <span className="font-mono font-bold text-slate-900 block">
                                {record.checkInTime}
                              </span>
                              <span className="text-[10px] text-slate-400">Shift Starts 09:00 AM</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Check-Out */}
                        <td className="py-3.5 px-4">
                          {record.checkOutTime ? (
                            <div>
                              <span className="font-mono font-semibold text-slate-900 block">
                                {record.checkOutTime}
                              </span>
                              {record.checkOutTime === 'In Progress' && (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Currently On-Duty
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Work Hours */}
                        <td className="py-3.5 px-4 font-mono">
                          {record.workHours ? (
                            <span className="font-bold text-slate-800">{record.workHours}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Punch Method & Location */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {record.punchMethod}
                            </span>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{record.location}</span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {getAttendanceStatusBadge(record.status)}
                          {record.linkedLeaveId && (
                            <span className="block text-[10px] text-purple-700 font-mono mt-0.5">
                              #{record.linkedLeaveId}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedAttendanceRecord(record)}
                            className="h-8 px-2.5 text-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: LEAVE MANAGEMENT & APPROVALS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* Leave Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4 space-y-1.5 border border-amber-200 bg-amber-50/30">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pending Approvals
                </span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-amber-900">{leaveMetrics.pending}</div>
              <p className="text-[11px] text-amber-700 font-medium">Awaiting Administrator Review</p>
            </div>

            <div className="glass-card p-4 space-y-1.5 border border-emerald-100">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Approved This Month
                </span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900">{leaveMetrics.approved}</div>
              <p className="text-[11px] text-emerald-700 font-medium">Synced with Attendance Roster</p>
            </div>

            <div className="glass-card p-4 space-y-1.5 border border-rose-100">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Declined Requests
                </span>
                <XCircle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900">{leaveMetrics.rejected}</div>
              <p className="text-[11px] text-rose-700 font-medium">Operational Conflict Decisions</p>
            </div>

            <div className="glass-card p-4 space-y-1.5 border border-purple-100">
              <div className="flex items-center justify-between text-purple-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Approved Days Out
                </span>
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900">{leaveMetrics.totalDaysOut} Days</div>
              <p className="text-[11px] text-purple-700 font-medium">Total Reliever Hours Scheduled</p>
            </div>
          </div>

          {/* Leave Tabs & Filter Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto max-w-full">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((tabKey) => (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setLeaveStatusTab(tabKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                      leaveStatusTab === tabKey
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tabKey === 'pending'
                      ? `Pending Review (${leaveMetrics.pending})`
                      : tabKey === 'approved'
                      ? `Approved (${leaveMetrics.approved})`
                      : tabKey === 'rejected'
                      ? `Declined (${leaveMetrics.rejected})`
                      : `All Requests (${leaveRequests.length})`}
                  </button>
                ))}
              </div>

              {/* Leave Type Selector */}
              <select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Leave Categories</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Paid Privilege Leave">Paid Privilege Leave</option>
                <option value="Comp-off">Compensatory Off</option>
              </select>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search leave requests by employee name, ID, or stated reason..."
                value={leaveSearch}
                onChange={(e) => setLeaveSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Leave Requests Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLeaves.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="font-bold text-slate-600">No leave requests found</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  No requests matching current status tab or search filter.
                </div>
              </div>
            ) : (
              filteredLeaves.map((req) => (
                <div
                  key={req.id}
                  className="rounded-3xl p-5 bg-white border border-slate-200/90 shadow-2xs space-y-4 hover:border-indigo-200 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Employee Info & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={req.avatar}
                          alt={req.employeeName}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-tight">
                            {req.employeeName}
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            <span className="font-mono font-semibold">{req.employeeId}</span> • {req.department}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {getLeaveStatusBadge(req.status)}
                        <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                          {req.id}
                        </span>
                      </div>
                    </div>

                    {/* Leave Details Strip */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getLeaveTypeBadge(req.leaveType)}
                          <span className="font-black text-slate-900 font-mono">
                            {req.durationDays} {req.durationDays === 1 ? 'Day' : 'Days'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Submitted on {req.submittedAt}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-slate-700 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{req.startDate}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>{req.endDate}</span>
                      </div>
                    </div>

                    {/* Stated Reason */}
                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700 block mb-0.5">Stated Reason:</span>
                      <p className="italic leading-relaxed">&ldquo;{req.reason}&rdquo;</p>
                    </div>

                    {/* Decision Audit Trail if Already Decided */}
                    {req.decision && (
                      <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
                        req.decision.status === 'approved'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50/70 border-rose-200 text-rose-950'
                      }`}>
                        <div className="flex items-center justify-between font-bold text-[11px]">
                          <span>Decision by: {req.decision.decidedBy}</span>
                          <span className="font-mono text-slate-500">{req.decision.decidedAt}</span>
                        </div>
                        {req.decision.comment && (
                          <p className="text-[11px] italic">Note: {req.decision.comment}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingLeaveDetail(req)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>View Full Dossier</span>
                    </button>

                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedLeaveForAction(req);
                            setActionType('reject');
                            setAdminComment('');
                          }}
                          className="text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          <X className="w-3.5 h-3.5 mr-1 text-rose-600" />
                          Reject
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedLeaveForAction(req);
                            setActionType('approve');
                            setAdminComment('');
                          }}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Approve Leave
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={req.status === 'approved' ? 'success' : 'neutral'} size="sm">
                        {req.status === 'approved' ? 'Active in Attendance' : 'Decision Final'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: ATTENDANCE PUNCH DETAILS DRAWER / MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedAttendanceRecord && (
        <Modal
          isOpen={!!selectedAttendanceRecord}
          onClose={() => setSelectedAttendanceRecord(null)}
          title={`Staff Punch Details — ${selectedAttendanceRecord.employeeName}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Header Bio */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <img
                src={selectedAttendanceRecord.avatar}
                alt={selectedAttendanceRecord.employeeName}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-xs"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">{selectedAttendanceRecord.employeeName}</h4>
                  {getAttendanceStatusBadge(selectedAttendanceRecord.status)}
                </div>
                <div className="text-slate-500 mt-0.5">
                  <span className="font-mono font-semibold text-slate-700">{selectedAttendanceRecord.employeeId}</span> • {selectedAttendanceRecord.roleTitle}
                </div>
                <div className="text-[11px] text-slate-400">Department: {selectedAttendanceRecord.department}</div>
              </div>
            </div>

            {/* Shift & Punch Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
                <span className="font-bold text-slate-900 font-mono mt-0.5 block">{selectedAttendanceRecord.date}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">First Check-In</span>
                <span className="font-bold text-emerald-700 font-mono mt-0.5 block">
                  {selectedAttendanceRecord.checkInTime || 'No check-in'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Check-Out</span>
                <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                  {selectedAttendanceRecord.checkOutTime || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Hours</span>
                <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                  {selectedAttendanceRecord.workHours || '0h 00m'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Punch Technology</span>
                <span className="font-semibold text-indigo-700 mt-0.5 block">{selectedAttendanceRecord.punchMethod}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Shift</span>
                <span className="font-semibold text-slate-700 mt-0.5 block">General (09:00 - 18:00)</span>
              </div>
            </div>

            {/* Punch Location Coordinates */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Verified Physical Punch Location
              </span>
              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{selectedAttendanceRecord.location}</span>
              </div>
              {selectedAttendanceRecord.notes && (
                <div className="text-[11px] text-slate-500 italic mt-1">
                  Note: {selectedAttendanceRecord.notes}
                </div>
              )}
            </div>

            {/* Daily Plan of Action (POA) Section */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Daily Plan of Action (POA)</h5>
                    <p className="text-[10px] text-slate-500">Employee daily deliverables, key quotas &amp; field schedule</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedAttendanceRecord.planStatus === 'completed' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      100% Completed
                    </span>
                  )}
                  {selectedAttendanceRecord.planStatus === 'in_progress' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      <Clock className="w-3 h-3 text-indigo-600" />
                      {selectedAttendanceRecord.poaProgressPercent || 50}% Achieved
                    </span>
                  )}
                  {selectedAttendanceRecord.planStatus === 'planned' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
                      Planned
                    </span>
                  )}
                </div>
              </div>

              {/* Main POA Summary */}
              {isEditingPoaText ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={customPoaText}
                    onChange={(e) => setCustomPoaText(e.target.value)}
                    placeholder="Enter or refine daily operational objectives, client visits, QC tests, or dispatch targets..."
                    className="w-full p-2.5 rounded-xl border border-indigo-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingPoaText(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        updatePlanOfAction(selectedAttendanceRecord.id, {
                          planOfAction: customPoaText.trim() || undefined,
                          planStatus: selectedAttendanceRecord.planStatus || 'in_progress',
                        });
                        setSelectedAttendanceRecord({
                          ...selectedAttendanceRecord,
                          planOfAction: customPoaText.trim() || undefined,
                          planStatus: selectedAttendanceRecord.planStatus || 'in_progress',
                        });
                        setIsEditingPoaText(false);
                        showToast(`Plan of Action updated for ${selectedAttendanceRecord.employeeName}`);
                      }}
                      className="text-xs bg-indigo-600 text-white"
                    >
                      Save POA
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white/90 p-3 rounded-xl border border-slate-200/80">
                    {selectedAttendanceRecord.planOfAction ? (
                      selectedAttendanceRecord.planOfAction
                    ) : (
                      <span className="italic text-slate-400">
                        No written Plan of Action submitted at check-in for this date.
                      </span>
                    )}
                  </p>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomPoaText(selectedAttendanceRecord.planOfAction || '');
                        setIsEditingPoaText(true);
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{selectedAttendanceRecord.planOfAction ? 'Edit Daily POA' : '+ Submit POA Now'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Individual Target Deliverables / Checklist */}
              {selectedAttendanceRecord.planOfActionItems && selectedAttendanceRecord.planOfActionItems.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-indigo-100/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Daily Task Checklist &amp; Targets (Click checkbox to update progress):
                  </span>
                  <div className="space-y-1.5">
                    {selectedAttendanceRecord.planOfActionItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          togglePoaItem(selectedAttendanceRecord.id, item.id);
                          // Update local modal state
                          const nextItems = (selectedAttendanceRecord.planOfActionItems || []).map((it) =>
                            it.id === item.id ? { ...it, completed: !it.completed } : it
                          );
                          const total = nextItems.length;
                          const completed = nextItems.filter((i) => i.completed).length;
                          const progress = Math.round((completed / total) * 100);
                          const status = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'planned';
                          setSelectedAttendanceRecord({
                            ...selectedAttendanceRecord,
                            planOfActionItems: nextItems,
                            poaProgressPercent: progress,
                            planStatus: status,
                          });
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          item.completed
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => {}} // handled by parent div
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className={`text-xs font-semibold ${item.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                            {item.task}
                          </span>
                        </div>
                        {item.targetMetric && (
                          <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.targetMetric}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Extra Checklist Goal Field */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newPoaGoalInput}
                  onChange={(e) => setNewPoaGoalInput(e.target.value)}
                  placeholder="Add target deliverable e.g. 'Complete 5 dealer demos'..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (!newPoaGoalInput.trim()) return;
                    const newItem: PlanOfActionItem = {
                      id: `poa-item-${Date.now()}`,
                      task: newPoaGoalInput.trim(),
                      completed: false,
                    };
                    const updatedItems = [...(selectedAttendanceRecord.planOfActionItems || []), newItem];
                    updatePlanOfAction(selectedAttendanceRecord.id, {
                      planOfActionItems: updatedItems,
                      planStatus: 'in_progress',
                    });
                    setSelectedAttendanceRecord({
                      ...selectedAttendanceRecord,
                      planOfActionItems: updatedItems,
                      planStatus: 'in_progress',
                    });
                    setNewPoaGoalInput('');
                    showToast(`Added goal to Plan of Action`);
                  }}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Goal
                </Button>
              </div>

              {/* Supervisor Feedback Input */}
              <div className="pt-2 border-t border-indigo-100/70 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Supervisor Review &amp; Guidance
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={supervisorCommentInput}
                    onChange={(e) => setSupervisorCommentInput(e.target.value)}
                    placeholder="Enter management guidance or feedback on today's POA..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      updatePlanOfAction(selectedAttendanceRecord.id, {
                        supervisorFeedback: supervisorCommentInput.trim() || undefined,
                      });
                      setSelectedAttendanceRecord({
                        ...selectedAttendanceRecord,
                        supervisorFeedback: supervisorCommentInput.trim() || undefined,
                      });
                      showToast(`Supervisor feedback saved`);
                    }}
                    className="text-xs bg-indigo-600 text-white"
                  >
                    Save Feedback
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setSelectedAttendanceRecord(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: APPROVE / REJECT DECISION DIALOG WITH ADMIN COMMENTS
      ───────────────────────────────────────────────────────────── */}
      {selectedLeaveForAction && (
        <Modal
          isOpen={!!selectedLeaveForAction}
          onClose={() => setSelectedLeaveForAction(null)}
          title={
            actionType === 'approve'
              ? `Authorize Leave Request — ${selectedLeaveForAction.employeeName}`
              : `Decline Leave Request — ${selectedLeaveForAction.employeeName}`
          }
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Summary Alert */}
            <div className={`p-4 rounded-2xl border ${
              actionType === 'approve'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div className="font-bold text-sm">
                {actionType === 'approve' ? 'Approve & Sync Attendance' : 'Reject Leave Request'}
              </div>
              <p className="mt-1 leading-relaxed text-xs opacity-90">
                {actionType === 'approve'
                  ? `Approving ${selectedLeaveForAction.durationDays} days of ${selectedLeaveForAction.leaveType} for ${selectedLeaveForAction.employeeName} (${selectedLeaveForAction.startDate} to ${selectedLeaveForAction.endDate}). This will automatically update the employee's attendance status to 'On Leave' on those dates.`
                  : `Declining this request will keep the staff on active duty roster.`}
              </p>
            </div>

            {/* Reason Display */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Employee Stated Reason:
              </span>
              <p className="mt-1 italic text-slate-700">&ldquo;{selectedLeaveForAction.reason}&rdquo;</p>
            </div>

            {/* Optional Admin Comments Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Administrator Comments &amp; Handover Directives (Optional)
              </label>
              <textarea
                rows={3}
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder={
                  actionType === 'approve'
                    ? 'e.g. Approved. Reliever coverage confirmed with North territory team.'
                    : 'e.g. Month-end dispatch peak. Please reschedule after upcoming inventory count.'
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setSelectedLeaveForAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmDecision}
                className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
              >
                {actionType === 'approve' ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Confirm Approval
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-1.5" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: FULL LEAVE REQUEST DOSSIER
      ───────────────────────────────────────────────────────────── */}
      {viewingLeaveDetail && (
        <Modal
          isOpen={!!viewingLeaveDetail}
          onClose={() => setViewingLeaveDetail(null)}
          title={`Leave Request Dossier — #${viewingLeaveDetail.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <img
                src={viewingLeaveDetail.avatar}
                alt={viewingLeaveDetail.employeeName}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-xs"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">{viewingLeaveDetail.employeeName}</h4>
                  {getLeaveStatusBadge(viewingLeaveDetail.status)}
                </div>
                <div className="text-slate-500 mt-0.5">
                  <span className="font-mono font-semibold text-slate-700">{viewingLeaveDetail.employeeId}</span> • {viewingLeaveDetail.department}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                <span className="font-bold text-indigo-700 mt-0.5 block">{viewingLeaveDetail.leaveType}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Days</span>
                <span className="font-black text-slate-900 font-mono mt-0.5 block">{viewingLeaveDetail.durationDays} Days</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</span>
                <span className="font-semibold text-slate-800 font-mono mt-0.5 block">{viewingLeaveDetail.startDate}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">End Date</span>
                <span className="font-semibold text-slate-800 font-mono mt-0.5 block">{viewingLeaveDetail.endDate}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stated Reason</span>
              <p className="italic text-slate-800">&ldquo;{viewingLeaveDetail.reason}&rdquo;</p>
              {viewingLeaveDetail.emergencyContact && (
                <div className="text-[11px] text-slate-500 pt-1">
                  Emergency Phone: <strong className="text-slate-700">{viewingLeaveDetail.emergencyContact}</strong>
                </div>
              )}
            </div>

            {viewingLeaveDetail.decision && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Administrator Audit Log
                </span>
                <div>Decided By: <strong>{viewingLeaveDetail.decision.decidedBy}</strong></div>
                <div>Timestamp: <span className="font-mono">{viewingLeaveDetail.decision.decidedAt}</span></div>
                {viewingLeaveDetail.decision.comment && (
                  <div className="italic text-indigo-900 mt-1">
                    Notes: {viewingLeaveDetail.decision.comment}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setViewingLeaveDetail(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: RECORD CHECK-IN & PLAN OF ACTION (POA)
      ───────────────────────────────────────────────────────────── */}
      {isAddPunchModalOpen && (
        <Modal
          isOpen={isAddPunchModalOpen}
          onClose={() => setIsAddPunchModalOpen(false)}
          title="Record Employee Attendance Punch & Plan of Action"
          maxWidth="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const selectedUser = users.find((u) => u.id === punchUserId);
              if (!selectedUser) return;

              const items: PlanOfActionItem[] = punchPoaItemsText
                .split('\n')
                .filter((line) => line.trim())
                .map((line, idx) => ({
                  id: `poa-new-${Date.now()}-${idx}`,
                  task: line.trim(),
                  completed: false,
                }));

              markAttendancePunch({
                userId: selectedUser.id,
                employeeId: selectedUser.employeeId || 'EMP-000',
                employeeName: selectedUser.name,
                avatar: selectedUser.avatar,
                roleTitle: selectedUser.designation || selectedUser.role.toUpperCase(),
                department: selectedUser.department || 'Operations',
                date: selectedDate,
                checkInTime: punchCheckInTime,
                checkOutTime: 'In Progress',
                workHours: 'In Progress',
                status: punchStatus,
                punchMethod,
                location: punchLocation,
                notes: 'Manual punch & Plan of Action submitted',
                planOfAction: punchPoaSummary.trim() || undefined,
                planOfActionItems: items.length > 0 ? items : undefined,
                planStatus: items.length > 0 ? 'in_progress' : 'planned',
                poaProgressPercent: 0,
              });

              setIsAddPunchModalOpen(false);
              showToast(`Recorded attendance & Plan of Action for ${selectedUser.name}`);
            }}
            className="space-y-4 text-xs text-slate-800"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={punchUserId}
                onChange={(e) => setPunchUserId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.employeeId || u.role}) — {u.department || 'General'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Check-In Time</label>
                <input
                  type="text"
                  value={punchCheckInTime}
                  onChange={(e) => setPunchCheckInTime(e.target.value)}
                  placeholder="e.g. 09:00 AM"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={punchStatus}
                  onChange={(e) => setPunchStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                >
                  <option value="present">Present (On-time)</option>
                  <option value="late">Late Arrival</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Punch Technology</label>
                <select
                  value={punchMethod}
                  onChange={(e) => setPunchMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                >
                  <option value="Biometric Fingerprint">Biometric Fingerprint</option>
                  <option value="Mobile GPS Geofence">Mobile GPS Geofence</option>
                  <option value="Web Portal">Web Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location Coordinates</label>
                <input
                  type="text"
                  value={punchLocation}
                  onChange={(e) => setPunchLocation(e.target.value)}
                  placeholder="e.g. Delhi Okhla HQ"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Daily Plan of Action (POA) Summary <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={punchPoaSummary}
                onChange={(e) => setPunchPoaSummary(e.target.value)}
                placeholder="What are the employee's main goals, dealer visits, dispatch priorities, or audits today?"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Individual POA Deliverables (One per line)
              </label>
              <textarea
                rows={3}
                value={punchPoaItemsText}
                onChange={(e) => setPunchPoaItemsText(e.target.value)}
                placeholder="Visit Kisan Agro Chemicals&#10;Audit Bhiwandi Bay 3 stock&#10;Reconcile HDFC collection deposit slips"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setIsAddPunchModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Save Check-In &amp; POA
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
