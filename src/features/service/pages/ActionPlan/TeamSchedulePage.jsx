import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  Eye,
  CalendarCheck,
  Building,
  Users,
  ShieldAlert,
  ArrowRight,
  User,
  Phone,
  Briefcase
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import PageContainer from '../../components/common/PageContainer';
import PageHeader from '../../components/common/PageHeader';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';
import { formatDate } from '../../utils/formatters';
import ScheduleDetailModal from '../MyScheduled/components/ScheduleDetailModal';
import ReassignModal from '../MyScheduled/components/ReassignModal';
import RescheduleModal from '../MyScheduled/components/RescheduleModal';

export default function TeamSchedulePage() {
  const { roleId } = useRole();
  const {
    schedules = [],
    engineers = [],
    reassignAssignment,
    rescheduleAssignment
  } = useSchedule();

  const isManagerOrCoordinator = roleId === 'manager' || roleId === 'coordinator';

  // State
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    engineer: 'all',
    status: 'all'
  });

  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [reassignSchedule, setReassignSchedule] = useState(null);
  const [rescheduleScheduleItem, setRescheduleScheduleItem] = useState(null);

  // Hook 1: Engineer filter options (always runs unconditionally)
  const engineerOptions = useMemo(() => {
    if (!Array.isArray(engineers)) return [];
    return engineers.map((eng) => ({
      value: eng.id,
      label: `${eng.name || eng.id} (${eng.id})`
    }));
  }, [engineers]);

  const filters = [
    {
      key: 'engineer',
      label: 'Assigned Engineer',
      options: engineerOptions
    },
    {
      key: 'status',
      label: 'Visit Status',
      options: [
        { value: 'Scheduled', label: 'Scheduled' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Rescheduled', label: 'Rescheduled' }
      ]
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ engineer: 'all', status: 'all' });
  };

  // Hook 2: Metrics (always runs unconditionally)
  const metrics = useMemo(() => {
    if (!Array.isArray(schedules)) {
      return { totalTeamVisits: 0, activeDispatches: 0, scheduledPending: 0, completed: 0, engineersOnField: 0 };
    }
    const totalTeamVisits = schedules.length;
    const activeDispatches = schedules.filter((s) => s.status === 'In Progress').length;
    const scheduledPending = schedules.filter((s) => s.status === 'Scheduled' || s.status === 'Pending').length;
    const completed = schedules.filter((s) => s.status === 'Completed').length;
    const engineersOnField = new Set(
      schedules
        .filter((s) => s.status === 'In Progress' && s.assignedEngineerId)
        .map((s) => s.assignedEngineerId)
    ).size;

    return {
      totalTeamVisits,
      activeDispatches,
      scheduledPending,
      completed,
      engineersOnField
    };
  }, [schedules]);

  // Hook 3: Filtered dataset with safe property resolution (always runs unconditionally)
  const filteredSchedules = useMemo(() => {
    if (!Array.isArray(schedules)) return [];
    const q = (search || '').toLowerCase().trim();
    return schedules.filter((s) => {
      if (!s) return false;
      const sId = (s.id || '').toLowerCase();
      const sReqId = (s.serviceRequestId || '').toLowerCase();
      const sCustId = (s.customerId || '').toLowerCase();
      const sCustName = (s.customerName || '').toLowerCase();
      const sEngName = (s.assignedEngineerName || '').toLowerCase();
      const sPurpose = (s.purpose || '').toLowerCase();
      const sModel = (s.equipmentModel || '').toLowerCase();

      const matchesSearch =
        !q ||
        sId.includes(q) ||
        sReqId.includes(q) ||
        sCustId.includes(q) ||
        sCustName.includes(q) ||
        sEngName.includes(q) ||
        sPurpose.includes(q) ||
        sModel.includes(q);

      const matchesEng =
        filterValues.engineer === 'all' || s.assignedEngineerId === filterValues.engineer;
      const matchesStatus =
        filterValues.status === 'all' || s.status === filterValues.status;

      return matchesSearch && matchesEng && matchesStatus;
    });
  }, [schedules, search, filterValues]);

  // Hook 4: 12-Column Table definition matching enterprise operational layout
  const columns = useMemo(() => [
    {
      header: 'Priority',
      key: 'priority',
      align: 'center',
      width: '100px',
      render: (s) => <StatusBadge status={s?.priority || 'Medium'} size="small" />
    },
    {
      header: 'Assigned Engineer Name',
      key: 'assignedEngineerName',
      width: '180px',
      render: (s) => (
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
            {s?.assignedEngineerName || 'Unassigned'}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{s?.assignedEngineerId || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Scheduled Date',
      key: 'scheduledDate',
      width: '125px',
      align: 'center',
      render: (s) => <span style={{ fontSize: '12px', fontWeight: 500 }}>{formatDate(s?.scheduledDate)}</span>
    },
    {
      header: 'Scheduled Time',
      key: 'startTime',
      width: '145px',
      align: 'center',
      render: (s) => (
        <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
          {s?.startTime || '09:00 AM'} - {s?.expectedEndTime || '01:00 PM'}
        </span>
      )
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '120px',
      render: (s) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 700,
            color: '#2563eb',
            backgroundColor: '#dbeafe',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
        >
          {s?.customerId || 'CUS-000001'}
        </span>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      width: '190px',
      render: (s) => (
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
          {s?.customerName || 'Customer'}
        </span>
      )
    },
    {
      header: 'Contact Number',
      key: 'customerPhone',
      width: '140px',
      render: (s) => (
        <span style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
          {s?.customerPhone || s?.customerContact || '+91 98220 14592'}
        </span>
      )
    },
    {
      header: 'Service Request ID',
      key: 'serviceRequestId',
      width: '130px',
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {s?.serviceRequestId || 'SR-2026-001'}
        </span>
      )
    },
    {
      header: 'Product / Equipment',
      key: 'equipmentModel',
      width: '200px',
      render: (s) => (
        <div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', display: 'block' }}>
            {s?.equipmentModel || s?.serviceCategory || 'Equipment Unit'}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{s?.purpose || 'Field service visit'}</span>
        </div>
      )
    },
    {
      header: 'Service Category',
      key: 'serviceCategory',
      width: '150px',
      render: (s) => (
        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
          {s?.serviceCategory || 'Breakdown Repair'}
        </span>
      )
    },
    {
      header: 'Schedule Status',
      key: 'status',
      align: 'center',
      width: '120px',
      render: (s) => <StatusBadge status={s?.status || 'Scheduled'} size="small" />
    },
    {
      header: 'Actions',
      align: 'center',
      width: '160px',
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <button
            type="button"
            className="table-action-icon-btn"
            onClick={() => setSelectedSchedule(s)}
            title="Inspect Details"
          >
            <Eye size={15} />
          </button>
          {s?.status !== 'Completed' && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRescheduleScheduleItem(s)}
                style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
                title="Reschedule visit date & time"
              >
                Reschedule
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReassignSchedule(s)}
                style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
                title="Reassign to another technician"
              >
                Reassign
              </button>
            </>
          )}
        </div>
      )
    }
  ], []);

  // Graceful Access Restriction Notice (Evaluated AFTER all hooks execute)
  if (!isManagerOrCoordinator) {
    return (
      <PageContainer>
        <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '20px auto', maxWidth: '600px' }}>
          <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Access Restricted — Team Schedule
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
            Team-wide scheduling and engineer dispatch management is reserved for <strong>Service Managers</strong> and <strong>Coordinators</strong>. Please use <strong>My Schedule</strong> to inspect your personal field assignments.
          </p>
          <Link to="/action-plan/my-schedule" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            <span>Go to My Schedule</span>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Team Schedule"
        description="Comprehensive team-wide dispatch calendar, technician allocation, and active field service management for Managers and Coordinators."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/action-plan/my-schedule" className="btn btn-secondary btn-sm btn-icon-text">
              <Calendar size={14} />
              <span>My Schedule</span>
            </Link>
            <Link to="/service-requests/work-assignment" className="btn btn-primary btn-sm btn-icon-text">
              <Briefcase size={14} />
              <span>Work Assignment Board</span>
            </Link>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div
        className="summary-kpi-grid mb-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Team Dispatches</div>
          <div className="summary-kpi-value">{metrics.totalTeamVisits}</div>
          <div className="summary-kpi-sub">Total service appointments</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
          <div className="summary-kpi-label">Active Field Dispatches</div>
          <div className="summary-kpi-value text-primary">{metrics.activeDispatches}</div>
          <div className="summary-kpi-sub">Engineers currently on-site</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Pending Scheduled</div>
          <div className="summary-kpi-value text-warning">{metrics.scheduledPending}</div>
          <div className="summary-kpi-sub">Upcoming visit commitments</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Completed Dispatches</div>
          <div className="summary-kpi-value text-success">{metrics.completed}</div>
          <div className="summary-kpi-sub">Successfully concluded visits</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search schedule ID, ticket #, customer, technician or purpose..."
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Team Schedule Table */}
      <DataTable
        columns={columns}
        data={filteredSchedules}
        keyField="id"
        minWidth="1620px"
        emptyMessage="No team service schedules match your filters."
        emptySubtext="Try adjusting your technician selection, status filter, or search query."
        defaultPageSize={10}
      />

      {/* Detail Inspection Modal */}
      {selectedSchedule && (
        <ScheduleDetailModal
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
        />
      )}

      {/* Reassign Modal */}
      {reassignSchedule && (
        <ReassignModal
          schedule={reassignSchedule}
          engineers={engineers}
          onClose={() => setReassignSchedule(null)}
          onConfirm={(schedId, data) => {
            if (typeof reassignAssignment === 'function') {
              reassignAssignment(schedId, data.newEngineerId, data.newEngineerName, data.reason);
            }
            setReassignSchedule(null);
          }}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleScheduleItem && (
        <RescheduleModal
          schedule={rescheduleScheduleItem}
          onClose={() => setRescheduleScheduleItem(null)}
          onConfirm={(schedId, data) => {
            if (typeof rescheduleAssignment === 'function') {
              rescheduleAssignment(schedId, data.newDate, data.newStartTime, data.newEndTime, data.reason);
            }
            setRescheduleScheduleItem(null);
          }}
        />
      )}
    </PageContainer>
  );
}
