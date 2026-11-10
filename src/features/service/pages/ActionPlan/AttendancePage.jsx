import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  UserCheck,
  User,
  Info,
  CalendarCheck
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';
import CheckInModal from '../MyScheduled/components/CheckInModal';
import CheckOutModal from '../MyScheduled/components/CheckOutModal';

export default function AttendancePage() {
  const { roleId, currentRole } = useRole();
  const { schedules } = useSchedule();

  const isManager = roleId === 'manager';
  const isCoordinator = roleId === 'coordinator';
  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';

  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'team'
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    status: 'all'
  });

  const [activeCheckInSchedule, setActiveCheckInSchedule] = useState(null);
  const [activeCheckOutSchedule, setActiveCheckOutSchedule] = useState(null);

  // Scoped by tab and role
  const scopedSchedules = useMemo(() => {
    if (activeTab === 'team' && (isManager || isCoordinator)) {
      return schedules;
    }
    // 'my' attendance
    if (isEngineer) return schedules.filter((s) => s.assignedEngineerId === 'ENG-01');
    if (isEmployee) return schedules.filter((s) => s.supportingEmployeeId === 'EMP-01');
    if (isManager) return schedules.filter((s) => s.assignedEngineerId === 'ENG-04');
    if (isCoordinator) return schedules.filter((s) => s.assignedEngineerId === 'COORD-01' || s.assignedEngineerId === 'ENG-05');
    return [];
  }, [schedules, activeTab, isEngineer, isEmployee, isManager, isCoordinator]);

  const filters = [
    {
      key: 'status',
      label: 'Attendance Status',
      options: [
        { value: 'Scheduled', label: 'Awaiting On-Site Arrival' },
        { value: 'In Progress', label: 'Currently On-Site (Active)' },
        { value: 'Completed', label: 'Visit Concluded' }
      ]
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ status: 'all' });
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalVisits = scopedSchedules.length;
    const activeOnSite = scopedSchedules.filter((s) => s.status === 'In Progress').length;
    const completedVisits = scopedSchedules.filter((s) => s.status === 'Completed').length;
    const awaitingArrival = scopedSchedules.filter((s) => s.status === 'Scheduled').length;

    return {
      totalVisits,
      activeOnSite,
      completedVisits,
      awaitingArrival
    };
  }, [scopedSchedules]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return scopedSchedules.filter((s) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.id.toLowerCase().includes(q) ||
        s.serviceRequestId.toLowerCase().includes(q) ||
        (s.customerId || '').toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.assignedEngineerName.toLowerCase().includes(q);

      const matchesStatus = filterValues.status === 'all' || s.status === filterValues.status;

      return matchesSearch && matchesStatus;
    });
  }, [scopedSchedules, search, filterValues]);

  const columns = [
    {
      header: 'Engineer / Employee',
      key: 'assignedEngineerName',
      width: '180px',
      render: (s) => (
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
            {s.assignedEngineerName}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {s.supportingEmployeeName ? `Assist: ${s.supportingEmployeeName}` : 'Lead Specialist'}
          </span>
        </div>
      )
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '130px',
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
          {s.customerId || 'CUS-000001'}
        </span>
      )
    },
    {
      header: 'Customer & Site',
      key: 'customerName',
      width: '240px',
      render: (s) => (
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
            {s.customerName}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{s.customerLocation}</span>
        </div>
      )
    },
    {
      header: 'Service Ticket #',
      key: 'serviceRequestId',
      width: '140px',
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {s.serviceRequestId}
        </span>
      )
    },
    {
      header: 'Scheduled Date',
      key: 'scheduledDate',
      align: 'center',
      width: '130px',
      render: (s) => <span style={{ fontSize: '12px', fontWeight: 500 }}>{s.scheduledDate}</span>
    },
    {
      header: 'Scheduled Window',
      key: 'startTime',
      align: 'center',
      width: '150px',
      render: (s) => (
        <span style={{ fontSize: '12px', color: '#2563eb' }}>
          {s.startTime} - {s.expectedEndTime}
        </span>
      )
    },
    {
      header: 'Visit Start Time',
      align: 'center',
      width: '140px',
      render: (s) => {
        if (s.status === 'In Progress' || s.status === 'Completed') {
          return <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>{s.startTime || '10:00 AM'}</span>;
        }
        return <span style={{ fontSize: '11px', color: '#94a3b8' }}>Not Checked In</span>;
      }
    },
    {
      header: 'Visit Completion Time',
      align: 'center',
      width: '150px',
      render: (s) => {
        if (s.status === 'Completed') {
          return <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>{s.expectedEndTime || '02:00 PM'}</span>;
        }
        return <span style={{ fontSize: '11px', color: '#94a3b8' }}>In Progress / Open</span>;
      }
    },
    {
      header: 'Attendance Status',
      key: 'status',
      align: 'center',
      width: '140px',
      render: (s) => {
        if (s.status === 'In Progress') {
          return <StatusBadge status="In Progress" label="On-Site Active" />;
        }
        if (s.status === 'Completed') {
          return <StatusBadge status="Completed" label="Visit Concluded" />;
        }
        return <StatusBadge status="Pending" label="Awaiting Arrival" />;
      }
    },
    {
      header: 'Actions',
      align: 'center',
      width: '140px',
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {s.status === 'Scheduled' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveCheckInSchedule(s)}
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
            >
              Start Visit
            </button>
          )}
          {s.status === 'In Progress' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveCheckOutSchedule(s)}
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px', color: '#16a34a' }}
            >
              Complete Visit
            </button>
          )}
          {s.status === 'Completed' && (
            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Recorded</span>
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
          <h2 className="page-title">Service Attendance & Field Check-In</h2>
          <p className="page-description">
            Track technician on-site presence, arrival timestamps, odometer logs, and field visit conclusion.
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar (My Attendance vs Team Attendance) */}
      {(isManager || isCoordinator) && (
        <div className="tab-navigation-bar mb-4">
          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('my');
              handleReset();
            }}
          >
            <User size={16} />
            <span>My Attendance</span>
          </button>
          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('team');
              handleReset();
            }}
          >
            <UserCheck size={16} />
            <span>Team Attendance ({schedules.length})</span>
          </button>
        </div>
      )}

      {/* Info notice explaining workflow separation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#1e40af',
          marginBottom: '16px'
        }}
      >
        <Info size={18} style={{ flexShrink: 0 }} />
        <span>
          <strong>Operational Workflow Notice:</strong> Completing a field visit logs technician attendance and arrival/departure timestamps. It does not automatically close or resolve the underlying service ticket. Ticket closure requires formal technical diagnostic sign-off in <strong>Service Execution</strong>.
        </span>
      </div>

      {/* Summary KPI Cards */}
      <div className="summary-kpi-grid mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Scheduled Visits</div>
          <div className="summary-kpi-value">{metrics.totalVisits}</div>
          <div className="summary-kpi-sub">Field calls on roster</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
          <div className="summary-kpi-label">Currently On-Site</div>
          <div className="summary-kpi-value text-primary">{metrics.activeOnSite}</div>
          <div className="summary-kpi-sub">Checked-in technicians</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Concluded Visits</div>
          <div className="summary-kpi-value text-success">{metrics.completedVisits}</div>
          <div className="summary-kpi-sub">Departure logged</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Awaiting Arrival</div>
          <div className="summary-kpi-value text-warning">{metrics.awaitingArrival}</div>
          <div className="summary-kpi-sub">En-route / scheduled</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search technician, customer, ticket #, or site location..."
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Attendance Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        keyField="id"
        minWidth="1600px"
        emptyMessage="No attendance visit records match your filters."
        defaultPageSize={10}
      />

      {/* Check-In / Check-Out Modals */}
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
