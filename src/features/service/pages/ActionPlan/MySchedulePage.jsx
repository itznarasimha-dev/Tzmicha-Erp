import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckSquare,
  Building,
  User,
  Wrench,
  CalendarCheck
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';
import ScheduleDetailModal from '../MyScheduled/components/ScheduleDetailModal';
import CheckInModal from '../MyScheduled/components/CheckInModal';
import CheckOutModal from '../MyScheduled/components/CheckOutModal';
import { formatDate } from '../../utils/formatters';

export default function MySchedulePage() {
  const { roleId, currentRole } = useRole();
  const { schedules } = useSchedule();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [activeCheckInSchedule, setActiveCheckInSchedule] = useState(null);
  const [activeCheckOutSchedule, setActiveCheckOutSchedule] = useState(null);

  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';

  // Role scoped: Strictly current user's personal schedule only
  const scopedSchedules = useMemo(() => {
    if (roleId === 'engineer') return schedules.filter((s) => s.assignedEngineerId === 'ENG-01');
    if (roleId === 'employee') return schedules.filter((s) => s.supportingEmployeeId === 'EMP-01');
    if (roleId === 'manager') return schedules.filter((s) => s.assignedEngineerId === 'ENG-04');
    if (roleId === 'coordinator') return schedules.filter((s) => s.assignedEngineerId === 'COORD-01' || s.assignedEngineerId === 'ENG-05');
    return [];
  }, [schedules, roleId]);

  // Metrics
  const totalPlanned = scopedSchedules.length;
  const completed = scopedSchedules.filter((s) => s.status === 'Completed').length;
  const inProgress = scopedSchedules.filter((s) => s.status === 'In Progress').length;
  const pending = scopedSchedules.filter((s) => s.status === 'Scheduled' || s.status === 'Pending').length;
  const postponed = scopedSchedules.filter((s) => s.status === 'Postponed' || s.status === 'Rescheduled').length;

  // Filter by tab
  const displayedSchedules = useMemo(() => {
    if (activeTab === 'daily') {
      return scopedSchedules.filter((s) => s.scheduledDate === '2026-10-22' || s.scheduledDate === '2026-10-21');
    }
    if (activeTab === 'in-progress') {
      return scopedSchedules.filter((s) => s.status === 'In Progress');
    }
    if (activeTab === 'completed') {
      return scopedSchedules.filter((s) => s.status === 'Completed');
    }
    return scopedSchedules;
  }, [scopedSchedules, activeTab]);

  const columns = [
    {
      header: 'Schedule ID',
      key: 'id',
      width: '120px',
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedSchedule(r)}
          className="font-mono font-bold text-primary hover:underline"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: '13px' }}
        >
          {r.id}
        </button>
      )
    },
    {
      header: 'Time Window',
      key: 'startTime',
      width: '150px',
      render: (r) => (
        <div style={{ fontSize: '12px' }}>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{r.scheduledDate}</span>
          <div style={{ color: '#2563eb', fontSize: '11px' }}>{r.startTime} - {r.expectedEndTime}</div>
        </div>
      )
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '130px',
      render: (r) => (
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
          {r.customerId || 'CUS-000001'}
        </span>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      width: '240px',
      render: (r) => (
        <div>
          <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{r.customerName}</strong>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{r.customerLocation}</span>
        </div>
      )
    },
    {
      header: 'Linked Ticket',
      key: 'serviceRequestId',
      width: '130px',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {r.serviceRequestId}
        </span>
      )
    },
    {
      header: 'Equipment / Purpose',
      key: 'serviceCategory',
      width: '220px',
      render: (r) => (
        <div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', display: 'block' }}>{r.serviceCategory}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{r.purpose}</span>
        </div>
      )
    },
    {
      header: 'Assigned Engineer',
      key: 'assignedEngineerName',
      width: '170px',
      render: (r) => (
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>
          {r.assignedEngineerName}
          {r.supportingEmployeeName && (
            <div style={{ fontSize: '11px', color: '#64748b' }}>Asst: {r.supportingEmployeeName}</div>
          )}
        </div>
      )
    },
    {
      header: 'Priority',
      key: 'priority',
      align: 'center',
      width: '110px',
      render: (r) => <StatusBadge status={r.priority} />
    },
    {
      header: 'Status',
      key: 'status',
      align: 'center',
      width: '120px',
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      header: 'Actions',
      align: 'center',
      width: '140px',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <button
            type="button"
            className="table-action-icon-btn"
            onClick={() => setSelectedSchedule(r)}
            title="Inspect Details"
          >
            <Eye size={15} />
          </button>
          {r.status === 'Scheduled' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveCheckInSchedule(r)}
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
              title="Check in to customer site"
            >
              Check-In
            </button>
          )}
          {r.status === 'In Progress' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveCheckOutSchedule(r)}
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
              title="Complete visit check-out"
            >
              Check-Out
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <h2 className="page-title">My Schedule</h2>
          <p className="page-description">
            {isEngineer || isEmployee
              ? `Personal dispatch calendar and field visit itinerary for ${currentRole.profile.name}`
              : 'Direct service visit schedule and execution itinerary'}
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="summary-kpi-grid mb-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Assigned Visits</div>
          <div className="summary-kpi-value">{totalPlanned}</div>
          <div className="summary-kpi-sub">Total on calendar</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Scheduled / Pending</div>
          <div className="summary-kpi-value text-warning">{pending}</div>
          <div className="summary-kpi-sub">Awaiting on-site arrival</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
          <div className="summary-kpi-label">In Progress On-Site</div>
          <div className="summary-kpi-value text-primary">{inProgress}</div>
          <div className="summary-kpi-sub">Technician checked in</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Completed Visits</div>
          <div className="summary-kpi-value text-success">{completed}</div>
          <div className="summary-kpi-sub">Service visit concluded</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #64748b' }}>
          <div className="summary-kpi-label">Rescheduled / Postponed</div>
          <div className="summary-kpi-value">{postponed}</div>
          <div className="summary-kpi-sub">Modified window</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>All Assigned Visits ({scopedSchedules.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <span>Today's Visits</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'in-progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('in-progress')}
        >
          <span>In Progress ({inProgress})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <span>Completed ({completed})</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={displayedSchedules}
        keyField="id"
        minWidth="1400px"
        emptyMessage="No service visits match your schedule filter."
        defaultPageSize={10}
      />

      {/* Modals */}
      {selectedSchedule && (
        <ScheduleDetailModal
          isOpen={Boolean(selectedSchedule)}
          onClose={() => setSelectedSchedule(null)}
          schedule={selectedSchedule}
        />
      )}

      {activeCheckInSchedule && (
        <CheckInModal
          isOpen={Boolean(activeCheckInSchedule)}
          onClose={() => setActiveCheckInSchedule(null)}
          schedule={activeCheckInSchedule}
        />
      )}

      {activeCheckOutSchedule && (
        <CheckOutModal
          isOpen={Boolean(activeCheckOutSchedule)}
          onClose={() => setActiveCheckOutSchedule(null)}
          schedule={activeCheckOutSchedule}
        />
      )}
    </div>
  );
}
