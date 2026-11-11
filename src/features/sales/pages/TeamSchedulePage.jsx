import { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  MapPin,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  List,
  Edit2,
  Trash2,
  FileCheck,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { useSales } from '../context/SalesContext';
import { useToast } from '../context/ToastContext';
import DataTable from '../components/common/DataTable';
import AssignActivityModal from '../components/modals/AssignActivityModal';
import UpdateActivityProgressModal from '../components/modals/UpdateActivityProgressModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import AttendanceWorkSubNav from '../components/common/AttendanceWorkSubNav';

const STATUS_CONFIG = {
  Planned: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Planned' },
  Pending: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Pending' },
  'In Progress': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'In Progress' },
  Completed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Completed' },
  'Not Completed': { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Not Completed' },
  Postponed: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Postponed' },
  Rescheduled: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', label: 'Rescheduled' },
  Overdue: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Overdue' },
  Cancelled: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Cancelled' },
};

const PRIORITY_CONFIG = {
  Urgent: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  High: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  Normal: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Low: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

export default function TeamSchedulePage() {
  const {
    activities = [],
    customers = [],
    regions = [],
    userProfile,
    userRole,
    deleteActivity,
  } = useSales();

  const { showToast } = useToast();

  const isManagerOrCoordinator = ['sales_manager', 'sales_coordinator', 'admin'].includes(userRole);

  const [activeTab, setActiveTab] = useState('weekly'); // Default to weekly planning calendar
  const [planScope, setPlanScope] = useState('team'); // 'team' | 'my' (Managers & Coordinators also have their own Action Plan)
  const [currentWeekMonday, setCurrentWeekMonday] = useState('2026-10-26');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [territoryFilter, setTerritoryFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('2026-10-30');

  // Dynamic 6 working days + Sunday holiday generation
  const currentWeekDays = useMemo(() => {
    const [y, m, d] = currentWeekMonday.split('-').map(Number);
    const monday = new Date(y, m - 1, d);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayNames.map((weekday, idx) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + idx);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      if (idx === 5) {
        return { date: iso, weekday: 'Saturday', isWorkingDay: true, labelNote: 'Active Working Day' };
      }
      if (idx === 6) {
        return { date: iso, weekday: 'Sunday', isWorkingDay: false, isHoliday: true, labelNote: 'Weekly Holiday' };
      }
      return { date: iso, weekday, isWorkingDay: true };
    });
  }, [currentWeekMonday]);

  const goToPreviousWeek = () => {
    const [y, m, d] = currentWeekMonday.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 7);
    setCurrentWeekMonday(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`);
  };

  const goToThisWeek = () => {
    setCurrentWeekMonday('2026-10-26');
  };

  const goToNextWeek = () => {
    const [y, m, d] = currentWeekMonday.split('-').map(Number);
    const next = new Date(y, m - 1, d + 7);
    setCurrentWeekMonday(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`);
  };

  const jumpToDate = (targetDateStr) => {
    if (!targetDateStr) return;
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const day = target.getDay(); // 0 is Sunday, 1 is Monday ...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(target);
    monday.setDate(target.getDate() + diffToMonday);
    const mondayIso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    setCurrentWeekMonday(mondayIso);
    setSelectedDate(targetDateStr);
  };

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [activityToUpdateProgress, setActivityToUpdateProgress] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // 1. Role-based scoping and Individual vs Team Action Plan
  const scopedActivities = useMemo(() => {
    // If user is Rep or Junior, or Manager/Coordinator selected 'my' action plan
    if (!isManagerOrCoordinator || planScope === 'my') {
      return activities.filter(
        (a) =>
          (userProfile?.employeeId && a.assignedEmployeeId === userProfile.employeeId) ||
          (userProfile?.fullName && a.assignedEmployeeName?.toLowerCase() === userProfile.fullName.toLowerCase())
      );
    }

    if (userRole === 'sales_manager' || userRole === 'admin') {
      return activities;
    }

    if (userRole === 'sales_coordinator') {
      // Coordinator manages their regional activities
      return activities.filter(
        (a) =>
          a.regionId === 'REG-HYD' ||
          !a.regionId ||
          ['APX-EMP-4091', 'APX-EMP-4092', 'APX-EMP-4093', 'APX-EMP-5011', 'APX-EMP-5012'].includes(a.assignedEmployeeId)
      );
    }

    return activities;
  }, [activities, userRole, userProfile, isManagerOrCoordinator, planScope]);

  // 2. Filtered Activities
  const filteredActivities = useMemo(() => {
    return scopedActivities.filter((act) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        act.activityId?.toLowerCase().includes(q) ||
        act.customerName?.toLowerCase().includes(q) ||
        act.customerId?.toLowerCase().includes(q) ||
        act.customerDisplayId?.toLowerCase().includes(q) ||
        act.assignedEmployeeName?.toLowerCase().includes(q) ||
        act.purpose?.toLowerCase().includes(q) ||
        act.activityType?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || act.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || act.priority === priorityFilter;
      const matchesTerritory = territoryFilter === 'all' || act.territoryId === territoryFilter;
      const matchesEmployee = employeeFilter === 'all' || act.assignedEmployeeId === employeeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesTerritory && matchesEmployee;
    });
  }, [scopedActivities, search, statusFilter, priorityFilter, territoryFilter, employeeFilter]);

  // 3. Metrics calculations
  const metrics = useMemo(() => {
    const total = scopedActivities.length;
    const pending = scopedActivities.filter((a) => a.status === 'Pending').length;
    const inProgress = scopedActivities.filter((a) => a.status === 'In Progress').length;
    const completed = scopedActivities.filter((a) => a.status === 'Completed').length;
    const overdue = scopedActivities.filter((a) => a.status === 'Overdue').length;

    // Detect conflicts: two activities for same employee at same date & time
    let conflicts = 0;
    const slotMap = new Map();
    scopedActivities.forEach((a) => {
      if (a.status !== 'Cancelled') {
        const key = `${a.assignedEmployeeId}_${a.scheduledDate}_${a.scheduledTime}`;
        if (slotMap.has(key)) conflicts++;
        else slotMap.set(key, true);
      }
    });

    return { total, pending, inProgress, completed, overdue, conflicts };
  }, [scopedActivities]);

  // 3b. Weekly Schedule Summary Calculations (synchronized with calendar)
  const weekSummary = useMemo(() => {
    const workingDates = currentWeekDays.filter((d) => d.isWorkingDay).map((d) => d.date);
    const weekActs = filteredActivities.filter((a) => workingDates.includes(a.scheduledDate));
    const total = weekActs.length;
    const completed = weekActs.filter((a) => a.status === 'Completed').length;
    const inProgress = weekActs.filter((a) => a.status === 'In Progress').length;
    const pending = weekActs.filter((a) => a.status === 'Pending' || a.status === 'Planned').length;
    const postponed = weekActs.filter((a) => a.status === 'Postponed' || a.status === 'Rescheduled').length;
    return { total, completed, inProgress, pending, postponed, weekActs };
  }, [currentWeekDays, filteredActivities]);

  // Unique lists for dropdowns
  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    activities.forEach((a) => {
      if (a.assignedEmployeeId && a.assignedEmployeeName) {
        map.set(a.assignedEmployeeId, { id: a.assignedEmployeeId, name: a.assignedEmployeeName, role: a.assignedEmployeeRole });
      }
    });
    return Array.from(map.values());
  }, [activities]);

  const handleDelete = () => {
    if (!deleteTargetId) return;
    try {
      deleteActivity(deleteTargetId);
      showToast('Scheduled activity deleted.', 'info');
      setDeleteTargetId(null);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Columns for List View
  const listColumns = [
    {
      header: 'Activity ID',
      key: 'activityId',
      render: (a) => (
        <span className="font-mono text-xs font-bold text-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          {a.activityId || a.id}
        </span>
      ),
    },
    {
      header: 'Customer ID',
      key: 'customerDisplayId',
      render: (a) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {a.customerDisplayId || a.customerId}
        </span>
      ),
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      render: (a) => (
        <div>
          <strong style={{ color: '#0f172a', display: 'block', fontSize: '13px' }}>{a.customerName}</strong>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {a.contactPerson} • {a.contactPhone}
          </span>
        </div>
      ),
    },
    {
      header: 'Distributor Territory',
      key: 'territoryName',
      render: (a) => (
        <div style={{ fontSize: '11px', color: '#334155', maxWidth: '160px' }}>
          <MapPin size={12} style={{ display: 'inline', marginRight: '3px', color: '#0284c7' }} />
          {a.territoryId === 'TERR-HYD-A'
            ? 'Territory A (Kukatpally)'
            : a.territoryId === 'TERR-HYD-B'
            ? 'Territory B (Uppal)'
            : a.territoryId === 'TERR-HYD-C'
            ? 'Territory C (ECIL)'
            : 'Regional'}
        </div>
      ),
    },
    {
      header: 'Assigned Staff',
      key: 'assignedEmployeeName',
      render: (a) => (
        <div>
          <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a' }}>{a.assignedEmployeeName}</strong>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '10px',
              fontWeight: '600',
              background: a.assignedEmployeeRole === 'junior_sales' ? '#fdf4ff' : '#eff6ff',
              color: a.assignedEmployeeRole === 'junior_sales' ? '#9333ea' : '#2563eb',
              border: `1px solid ${a.assignedEmployeeRole === 'junior_sales' ? '#f0abfc' : '#bfdbfe'}`,
            }}
          >
            {a.assignedEmployeeRole === 'junior_sales' ? 'Junior Sales' : 'Sales Rep'}
          </span>
        </div>
      ),
    },
    {
      header: 'Activity Type',
      key: 'activityType',
      render: (a) => (
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>
          {a.activityType}
        </span>
      ),
    },
    {
      header: 'Date & Time',
      key: 'scheduledDate',
      render: (a) => (
        <div>
          <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a' }}>{a.scheduledDate}</strong>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
            {a.scheduledTime}
          </span>
        </div>
      ),
    },
    {
      header: 'Priority',
      key: 'priority',
      align: 'center',
      render: (a) => {
        const conf = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.Normal;
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: conf.bg,
              color: conf.color,
              border: `1px solid ${conf.border}`,
            }}
          >
            {a.priority}
          </span>
        );
      },
    },
    {
      header: 'Status',
      key: 'status',
      align: 'center',
      render: (a) => {
        const conf = STATUS_CONFIG[a.status] || STATUS_CONFIG.Pending;
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: conf.bg,
              color: conf.color,
              border: `1px solid ${conf.border}`,
            }}
          >
            {a.status}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      align: 'center',
      render: (a) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ fontSize: '11px', padding: '3px 8px' }}
            onClick={() => setActivityToUpdateProgress(a)}
            title="Update visit outcome and next steps"
          >
            Update Outcome
          </button>
          {(userRole === 'sales_coordinator' || userRole === 'sales_manager' || userRole === 'admin') && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '3px 6px' }}
                onClick={() => {
                  setActivityToEdit(a);
                  setIsAssignModalOpen(true);
                }}
                title="Edit assignment"
              >
                <Edit2 size={12} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11px', padding: '3px 6px', color: '#dc2626' }}
                onClick={() => setDeleteTargetId(a.id)}
                title="Delete assignment"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const pageTitle = isManagerOrCoordinator ? 'Team Schedule' : 'My Schedule';
  const pageDescription = isManagerOrCoordinator
    ? planScope === 'team'
      ? userRole === 'sales_coordinator'
        ? 'Schedule regional customer visits, assign territory tasks to Sales Representatives and Junior Sales Employees, and track field execution'
        : 'Schedule customer visits, assign territory tasks across regions, and monitor organizational field execution'
      : 'Maintain and execute your personal customer visits, executive follow-ups, deal negotiations, and regional meetings'
    : 'View your assigned customer meetings, field visits, and report visit outcomes and next steps';

  return (
    <div className="page-container">
      {/* Attendance & Action Plan Shared Sub-Navigation */}
      <AttendanceWorkSubNav currentTab="schedule" />

      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 className="page-title">{pageTitle}</h2>
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
              {isManagerOrCoordinator
                ? planScope === 'team'
                  ? userRole === 'sales_manager'
                    ? 'Organizational Scope'
                    : 'Regional Field Operations (Hyderabad & Deccan)'
                  : 'Individual Executive Action Plan'
                : userRole === 'junior_sales'
                ? 'Assigned Field Schedule • Junior Sales'
                : 'Assigned Field Schedule • Sales Rep'}
            </span>

            {/* Scope Toggle for Manager & Coordinator */}
            {isManagerOrCoordinator && (
              <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPlanScope('team')}
                  style={{
                    padding: '3px 9px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: planScope === 'team' ? '#ffffff' : 'transparent',
                    color: planScope === 'team' ? '#2563eb' : '#475569',
                    boxShadow: planScope === 'team' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Team Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setPlanScope('my')}
                  style={{
                    padding: '3px 9px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: planScope === 'my' ? '#ffffff' : 'transparent',
                    color: planScope === 'my' ? '#2563eb' : '#475569',
                    boxShadow: planScope === 'my' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  My Schedule
                </button>
              </div>
            )}
          </div>
          <p className="page-description">
            {pageDescription}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isManagerOrCoordinator && (
            <button
              type="button"
              className="btn btn-primary btn-icon-text"
              onClick={() => {
                setActivityToEdit(null);
                setIsAssignModalOpen(true);
              }}
            >
              <Plus size={15} />
              <span>Assign Activity</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
            Total Scheduled
          </span>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
            {metrics.total}
          </div>
          <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px' }}>
            Field visits &amp; tasks
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
            Pending Visits
          </span>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#b45309', marginTop: '2px' }}>
            {metrics.pending}
          </div>
          <div style={{ fontSize: '11px', color: '#d97706', marginTop: '2px' }}>
            Awaiting field execution
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
            Completed Visits
          </span>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#15803d', marginTop: '2px' }}>
            {metrics.completed}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
            Documented outcomes
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
            Overdue / Missed
          </span>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#b91c1c', marginTop: '2px' }}>
            {metrics.overdue}
          </div>
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
            Requires rescheduling
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
            Schedule Conflicts
          </span>
          <div style={{ fontSize: '20px', fontWeight: '700', color: metrics.conflicts > 0 ? '#ea580c' : '#16a34a', marginTop: '2px' }}>
            {metrics.conflicts}
          </div>
          <div style={{ fontSize: '11px', color: metrics.conflicts > 0 ? '#d97706' : '#16a34a', marginTop: '2px' }}>
            {metrics.conflicts > 0 ? 'Overlapping assignments' : 'No time-slot conflicts'}
          </div>
        </div>
      </div>

      {/* Role Banner for Sales Rep & Junior Employee */}
      {(userRole === 'sales_rep' || userRole === 'junior_sales') && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={18} className="text-success" />
            <div>
              <strong style={{ color: '#166534', fontSize: '13px' }}>
                My Assigned Schedule: {userProfile.fullName} ({userRole === 'junior_sales' ? 'Junior Sales Employee' : 'Sales Representative'})
              </strong>
              <div style={{ fontSize: '12px', color: '#15803d' }}>
                You have {scopedActivities.filter((a) => a.status === 'Pending').length} pending visits scheduled. Click &quot;Update Outcome&quot; after completing each customer interaction.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Tabs & Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '3px', gap: '2px' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', padding: '5px 10px' }}
              onClick={() => setActiveTab('list')}
            >
              <List size={13} className="mr-1" /> All Assignments
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'daily' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', padding: '5px 10px' }}
              onClick={() => setActiveTab('daily')}
            >
              <Clock size={13} className="mr-1" /> Daily Schedule
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'weekly' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', padding: '5px 10px' }}
              onClick={() => setActiveTab('weekly')}
            >
              <CalendarDays size={13} className="mr-1" /> Weekly Overview
            </button>
            {isManagerOrCoordinator && (
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'employee' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '5px 10px' }}
                onClick={() => setActiveTab('employee')}
              >
                <Users size={13} className="mr-1" /> Employee-wise
              </button>
            )}
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'customer' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', padding: '5px 10px' }}
              onClick={() => setActiveTab('customer')}
            >
              <Building2 size={13} className="mr-1" /> Customer-wise
            </button>
          </div>

          {/* Quick Date Picker for Daily View */}
          {activeTab === 'daily' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>View Date:</span>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: '12px', padding: '4px 8px', width: 'auto' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '30px', fontSize: '12px', height: '34px' }}
              placeholder="Search by ID, customer name, purpose, staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            value={territoryFilter}
            onChange={(e) => setTerritoryFilter(e.target.value)}
            style={{ fontSize: '12px', padding: '5px 10px', width: 'auto' }}
          >
            <option value="all">All Regional Territories (A, B, C)</option>
            <option value="TERR-HYD-A">Territory A — Kukatpally, Jubilee Hills, Gachibowli</option>
            <option value="TERR-HYD-B">Territory B — Uppal, Narapally, Boduppal</option>
            <option value="TERR-HYD-C">Territory C — ECIL, Kapra, Sainikpuri</option>
          </select>

          {(userRole === 'sales_coordinator' || userRole === 'sales_manager' || userRole === 'admin') && (
            <select
              className="form-select"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              style={{ fontSize: '12px', padding: '5px 10px', width: 'auto' }}
            >
              <option value="all">All Field Staff</option>
              {uniqueEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role === 'junior_sales' ? 'Junior' : 'Rep'})
                </option>
              ))}
            </select>
          )}

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: '12px', padding: '5px 10px', width: 'auto' }}
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Rescheduled">Rescheduled</option>
            <option value="Overdue">Overdue</option>
          </select>

          <select
            className="form-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ fontSize: '12px', padding: '5px 10px', width: 'auto' }}
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
          </select>

          {(search || territoryFilter !== 'all' || employeeFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setTerritoryFilter('all');
                setEmployeeFilter('all');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* View Content */}
      {activeTab === 'list' && (
        <DataTable
          columns={listColumns}
          data={filteredActivities}
          keyField="id"
          emptyMessage="No scheduled activities found matching your criteria"
          pageSize={10}
          minWidth="1300px"
        />
      )}

      {/* Daily Schedule View */}
      {activeTab === 'daily' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              Chronological Daily Schedule: {selectedDate}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {filteredActivities.filter((a) => a.scheduledDate === selectedDate).length} activities scheduled
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredActivities
              .filter((a) => a.scheduledDate === selectedDate)
              .sort((a, b) => (a.scheduledTime > b.scheduledTime ? 1 : -1))
              .map((act) => {
                const conf = STATUS_CONFIG[act.status] || STATUS_CONFIG.Pending;
                return (
                  <div
                    key={act.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '13px',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {act.scheduledTime}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="font-mono text-xs font-bold text-slate-700">{act.customerDisplayId || act.customerId}</span>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>{act.customerName}</strong>
                          <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', color: '#475569' }}>
                            {act.activityType}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                          Purpose: {act.purpose}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Assigned to: <strong>{act.assignedEmployeeName}</strong> ({act.assignedEmployeeRole === 'junior_sales' ? 'Junior Sales' : 'Sales Rep'}) • {act.territoryName}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: conf.bg,
                          color: conf.color,
                          border: `1px solid ${conf.border}`,
                        }}
                      >
                        {act.status}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setActivityToUpdateProgress(act)}
                      >
                        Update Outcome
                      </button>
                    </div>
                  </div>
                );
              })}

            {filteredActivities.filter((a) => a.scheduledDate === selectedDate).length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748b', fontSize: '13px' }}>
                No activities scheduled for {selectedDate}. Use &quot;Assign Activity&quot; to schedule customer visits.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Planning Calendar & Field Schedule (Primary/Default View) */}
      {activeTab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Week Navigation & Header Toolbar */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Weekly Action Plan &amp; Field Schedule
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Standard working week: <strong>Monday to Saturday</strong> are active field days. <strong>Sunday</strong> is the official weekly holiday.
                </p>
              </div>

              {/* Multi-Week Navigation Controls */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: '11.5px', padding: '4px 8px' }}
                    onClick={goToPreviousWeek}
                    title="Navigate to Previous Week"
                  >
                    <ChevronLeft size={14} className="mr-1" /> Previous Week
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${currentWeekMonday === '2026-10-26' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11.5px', padding: '4px 8px' }}
                    onClick={goToThisWeek}
                    title="Return to Current Working Week"
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: '11.5px', padding: '4px 8px' }}
                    onClick={goToNextWeek}
                    title="Navigate to Next Week"
                  >
                    Next Week <ChevronRight size={14} className="ml-1" />
                  </button>
                </div>

                {/* Week Selector Dropdown */}
                <select
                  className="form-select"
                  style={{ fontSize: '11.5px', padding: '4px 8px', height: '31px', width: 'auto' }}
                  value={currentWeekMonday}
                  onChange={(e) => setCurrentWeekMonday(e.target.value)}
                  title="Select Week"
                >
                  <option value="2026-10-19">Week: Oct 19 – Oct 24, 2026 (Previous)</option>
                  <option value="2026-10-26">Week: Oct 26 – Oct 31, 2026 (This Week)</option>
                  <option value="2026-11-02">Week: Nov 02 – Nov 07, 2026 (Next)</option>
                </select>

                {/* Date Picker to Jump to Any Week */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Select Date:</span>
                  <input
                    type="date"
                    className="form-input"
                    style={{ fontSize: '11.5px', padding: '3px 6px', height: '31px', width: 'auto' }}
                    value={selectedDate}
                    onChange={(e) => jumpToDate(e.target.value)}
                    title="Pick date to jump to that week"
                  />
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#166534',
                    background: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}
                >
                  Mon {currentWeekDays[0]?.date} – Sat {currentWeekDays[5]?.date}
                </span>
              </div>
            </div>

            {/* "This Week's Schedule" Summary Section */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} className="text-primary" />
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      This Week&apos;s Schedule Summary
                    </strong>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      ({currentWeekDays[0]?.date} to {currentWeekDays[5]?.date})
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                    Complete overview of weekly commitments, active customer accounts, and execution progress.
                  </p>
                </div>

                {/* Key Weekly Metric Counters */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Planned</span>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{weekSummary.total}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#166534', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Completed</span>
                    <strong style={{ fontSize: '14px', color: '#16a34a' }}>{weekSummary.completed}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#1d4ed8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>In Progress</span>
                    <strong style={{ fontSize: '14px', color: '#2563eb' }}>{weekSummary.inProgress}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#b45309', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Pending</span>
                    <strong style={{ fontSize: '14px', color: '#d97706' }}>{weekSummary.pending}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #fed7aa', padding: '4px 10px', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#c2410c', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Postponed</span>
                    <strong style={{ fontSize: '14px', color: '#ea580c' }}>{weekSummary.postponed}</strong>
                  </div>
                </div>
              </div>

              {/* Day-by-Day (Mon–Sat) Quick Overview Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
                {currentWeekDays.filter((d) => d.isWorkingDay).map((dayObj) => {
                  const dayActs = filteredActivities.filter((a) => a.scheduledDate === dayObj.date);
                  const isDaySelected = selectedDate === dayObj.date;
                  const completedCount = dayActs.filter((a) => a.status === 'Completed').length;
                  const pendingCount = dayActs.filter((a) => a.status === 'Pending' || a.status === 'Planned').length;

                  return (
                    <div
                      key={`sum-${dayObj.date}`}
                      style={{
                        background: isDaySelected ? '#eff6ff' : '#ffffff',
                        border: isDaySelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setSelectedDate(dayObj.date)}
                      title={`Click to focus on ${dayObj.weekday}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: isDaySelected ? '#1d4ed8' : '#0f172a' }}>
                          {dayObj.weekday}
                        </span>
                        <span style={{ fontSize: '10.5px', background: dayActs.length > 0 ? '#dbeafe' : '#f1f5f9', color: dayActs.length > 0 ? '#1d4ed8' : '#64748b', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>
                          {dayActs.length}
                        </span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginBottom: '6px' }}>
                        {dayObj.date}
                      </div>

                      {/* Customer Highlights */}
                      {dayActs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {dayActs.slice(0, 2).map((a) => (
                            <div key={`chip-${a.id}`} style={{ fontSize: '10.5px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              • {a.customerName}
                            </div>
                          ))}
                          {dayActs.length > 2 && (
                            <span style={{ fontSize: '9.5px', color: '#2563eb', fontWeight: 600 }}>
                              +{dayActs.length - 2} more...
                            </span>
                          )}
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', fontSize: '9.5px' }}>
                            {completedCount > 0 && (
                              <span style={{ color: '#16a34a', background: '#dcfce7', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
                                {completedCount} Done
                              </span>
                            )}
                            {pendingCount > 0 && (
                              <span style={{ color: '#d97706', background: '#fef3c7', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
                                {pendingCount} Pend
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                          No activities
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Planning Calendar Layout (All Working Days Visible Together) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
              {currentWeekDays.map((dayObj) => {
                if (dayObj.isHoliday) {
                  return (
                    <div
                      key={dayObj.date}
                      style={{
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        padding: '12px',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                          <div>
                            <strong style={{ fontSize: '12.5px', color: '#64748b', display: 'block' }}>{dayObj.weekday}</strong>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{dayObj.date}</span>
                          </div>
                          <span style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '4px', padding: '1px 6px', fontWeight: '700' }}>
                            Holiday
                          </span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#64748b', margin: '8px 0', lineHeight: '1.4' }}>
                          Sunday is the standard company weekly holiday. Field schedules and client meetings suspended.
                        </p>
                      </div>
                      <span style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                        Authorized exceptional holidays may be configured by Admin.
                      </span>
                    </div>
                  );
                }

                const dayActs = filteredActivities.filter((a) => a.scheduledDate === dayObj.date);
                const isToday = dayObj.date === selectedDate;

                return (
                  <div
                    key={dayObj.date}
                    style={{
                      border: isToday ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px',
                      background: isToday ? '#f0f7ff' : '#ffffff',
                      boxShadow: isToday ? '0 2px 4px rgba(37,99,235,0.08)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Day Column Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                          {dayObj.weekday}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{dayObj.date}</span>
                        {dayObj.labelNote && (
                          <span style={{ fontSize: '9.5px', color: '#166534', background: '#dcfce7', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px', fontWeight: 600 }}>
                            {dayObj.labelNote}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', background: dayActs.length > 0 ? '#dbeafe' : '#f1f5f9', color: dayActs.length > 0 ? '#1d4ed8' : '#64748b', borderRadius: '10px', padding: '1px 7px', fontWeight: '700' }}>
                        {dayActs.length} {dayActs.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    {/* Day Activities List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1' }}>
                      {dayActs.map((act) => {
                        const conf = STATUS_CONFIG[act.status] || STATUS_CONFIG.Pending;
                        const prioConf = PRIORITY_CONFIG[act.priority] || PRIORITY_CONFIG.Normal;
                        const isPostponed = act.status === 'Postponed' || act.status === 'Rescheduled' || !!act.postponedFrom;

                        return (
                          <div
                            key={act.id}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '9px 10px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                            onClick={() => setActivityToUpdateProgress(act)}
                            title="Click to view details or update visit outcome"
                          >
                            {/* Time & Status Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: '700', color: '#1e40af', fontSize: '11.5px' }}>
                                <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
                                {act.scheduledTime}
                              </span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {act.priority === 'Urgent' && (
                                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: prioConf.bg, color: prioConf.color, border: `1px solid ${prioConf.border}` }}>
                                    Urgent
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    backgroundColor: conf.bg,
                                    color: conf.color,
                                    border: `1px solid ${conf.border}`,
                                  }}
                                >
                                  {act.status}
                                </span>
                              </div>
                            </div>

                            {/* Customer Name & Customer ID */}
                            <div>
                              <strong style={{ color: '#0f172a', fontSize: '12px', display: 'block', lineHeight: '1.2' }}>
                                {act.customerName}
                              </strong>
                              <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                                {act.customerDisplayId || act.customerId}
                              </span>
                            </div>

                            {/* Activity Type & Location */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '3px' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', padding: '1px 5px', borderRadius: '3px', border: '1px solid #bfdbfe' }}>
                                {act.activityType}
                              </span>
                              <span style={{ fontSize: '10px', color: '#475569' }}>
                                <MapPin size={10} style={{ display: 'inline', marginRight: '2px', color: '#0284c7' }} />
                                {act.territoryName ? act.territoryName.split(' ')[0] : (act.territoryId || 'Territory')}
                              </span>
                            </div>

                            {/* Purpose / Expected Outcome */}
                            {act.purpose && (
                              <div style={{ color: '#334155', fontSize: '10.5px', lineHeight: '1.3' }}>
                                {act.purpose}
                              </div>
                            )}

                            {/* Related References (Quote, Order, Lead) */}
                            {(act.refQuotationId || act.refOrderId || act.leadRef) && (
                              <div style={{ fontSize: '9.5px', color: '#6366f1', background: '#eef2ff', padding: '2px 4px', borderRadius: '3px' }}>
                                Ref: {act.refQuotationId || act.refOrderId || act.leadRef}
                              </div>
                            )}

                            {/* Assigned Staff */}
                            <div style={{ color: '#64748b', fontSize: '10px', marginTop: '1px' }}>
                              Assigned: <strong style={{ color: '#1e293b' }}>{act.assignedEmployeeName}</strong>
                            </div>

                            {/* Postponement & Rescheduling Audit Notice */}
                            {isPostponed && (
                              <div
                                style={{
                                  background: '#fffbeb',
                                  border: '1px solid #fde68a',
                                  color: '#92400e',
                                  borderRadius: '4px',
                                  padding: '3px 6px',
                                  fontSize: '10px',
                                  marginTop: '2px',
                                }}
                              >
                                ⚠️ Postponed from {act.postponedFrom || act.originalScheduledDate || 'prior date'}
                                {act.postponedReason && <div>Reason: {act.postponedReason}</div>}
                              </div>
                            )}

                            {/* Outcome Remarks if completed */}
                            {act.outcomeRemarks && !isPostponed && (
                              <div style={{ color: '#047857', fontSize: '10px', background: '#ecfdf5', padding: '2px 5px', borderRadius: '3px', fontStyle: 'italic' }}>
                                Outcome: {act.outcomeRemarks}
                              </div>
                            )}

                            {/* Action Button: Update Outcome */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-primary"
                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivityToUpdateProgress(act);
                                }}
                              >
                                Update Outcome
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty Day State */}
                      {dayActs.length === 0 && (
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: '#94a3b8',
                            fontStyle: 'italic',
                            padding: '24px 10px',
                            textAlign: 'center',
                            background: '#fafafa',
                            borderRadius: '6px',
                            border: '1px dashed #e2e8f0',
                          }}
                        >
                          No activities scheduled for this day
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Employee-wise Schedule */}
      {activeTab === 'employee' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
            Field Workload by Employee
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {uniqueEmployees.map((emp) => {
              const empActs = filteredActivities.filter((a) => a.assignedEmployeeId === emp.id);
              return (
                <div
                  key={emp.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{emp.name}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ID: {emp.id} • {emp.role === 'junior_sales' ? 'Junior Sales Employee' : 'Sales Representative'}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '2px 8px', fontWeight: '700' }}>
                      {empActs.length} Tasks
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {empActs.map((act) => (
                      <div
                        key={act.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>{act.customerName}</span>
                          <span style={{ fontSize: '10px', fontWeight: '600', color: '#2563eb' }}>{act.scheduledDate}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {act.activityType} • {act.scheduledTime}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '10px', color: '#475569' }}>Status: <strong>{act.status}</strong></span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '10px', padding: '2px 6px' }}
                            onClick={() => setActivityToUpdateProgress(act)}
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    ))}
                    {empActs.length === 0 && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>
                        No assignments for this employee
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer-wise Schedule */}
      {activeTab === 'customer' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
            Customer Visit History &amp; Upcoming Schedule
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {customers.map((cust) => {
              const custActs = filteredActivities.filter((a) => a.customerId === cust.id || a.customerDisplayId === cust.customerId);
              if (custActs.length === 0) return null;
              return (
                <div
                  key={cust.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{cust.name}</strong>
                      <span className="font-mono text-xs text-primary font-bold ml-2">({cust.customerId || cust.code || cust.id})</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {custActs.length} visits recorded
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                    {custActs.map((act) => (
                      <div
                        key={act.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{act.activityId}</strong>
                          <span style={{ color: '#2563eb' }}>{act.scheduledDate} {act.scheduledTime}</span>
                        </div>
                        <div style={{ color: '#334155', marginTop: '2px' }}>Type: {act.activityType} • Assigned to: {act.assignedEmployeeName}</div>
                        <div style={{ color: '#64748b', marginTop: '2px' }}>Purpose: {act.purpose}</div>
                        {act.outcomeRemarks && (
                          <div style={{ color: '#15803d', marginTop: '3px', background: '#f0fdf4', padding: '3px 6px', borderRadius: '4px' }}>
                            Outcome: {act.outcomeRemarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assign / Edit Activity Modal */}
      {isAssignModalOpen && (
        <AssignActivityModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setActivityToEdit(null);
          }}
          activityToEdit={activityToEdit}
        />
      )}

      {/* Update Progress Modal */}
      {activityToUpdateProgress && (
        <UpdateActivityProgressModal
          isOpen={Boolean(activityToUpdateProgress)}
          onClose={() => setActivityToUpdateProgress(null)}
          activity={activityToUpdateProgress}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTargetId && (
        <ConfirmDialog
          isOpen={Boolean(deleteTargetId)}
          title="Delete Scheduled Activity"
          message="Are you sure you want to remove this scheduled field activity? This cannot be undone."
          confirmText="Delete Activity"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
}