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
  Wrench
} from 'lucide-react';
import PageContainer from '../../components/common/PageContainer';
import PageHeader from '../../components/common/PageHeader';
import MetricCard from '../../components/common/MetricCard';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';
import ScheduleDetailModal from './components/ScheduleDetailModal';
import CheckInModal from './components/CheckInModal';
import CheckOutModal from './components/CheckOutModal';

export default function MyScheduled() {
  const { roleId, currentRole } = useRole();
  const { schedules } = useSchedule();

  // Tabs: all | daily | weekly | customer
  const [activeTab, setActiveTab] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = This Week, -1 = Prev, +1 = Next
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [activeCheckInSchedule, setActiveCheckInSchedule] = useState(null);
  const [activeCheckOutSchedule, setActiveCheckOutSchedule] = useState(null);

  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';

  // Role scoped schedules
  const scopedSchedules = useMemo(() => {
    if (isEngineer) return schedules.filter((s) => s.assignedEngineerId === 'ENG-01');
    if (isEmployee) return schedules.filter((s) => s.supportingEmployeeId === 'EMP-01');
    return schedules;
  }, [schedules, isEngineer, isEmployee]);

  // 5 Summary Metric Cards (Section 11)
  const totalPlanned = scopedSchedules.length;
  const completed = scopedSchedules.filter((s) => s.status === 'Completed').length;
  const inProgress = scopedSchedules.filter((s) => s.status === 'In Progress').length;
  const pending = scopedSchedules.filter((s) => s.status === 'Scheduled' || s.status === 'Pending').length;
  const postponed = scopedSchedules.filter((s) => s.status === 'Postponed' || s.status === 'Rescheduled').length;

  // Week text
  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'This Week (19 Oct – 25 Oct 2026)';
    if (weekOffset === -1) return 'Previous Week (12 Oct – 18 Oct 2026)';
    if (weekOffset === 1) return 'Next Week (26 Oct – 01 Nov 2026)';
    return `Week Offset ${weekOffset}`;
  }, [weekOffset]);

  // Tab Filtering
  const displayedSchedules = useMemo(() => {
    if (activeTab === 'daily') {
      return scopedSchedules.filter((s) => s.scheduledDate === '2026-10-22' || s.scheduledDate === '2026-10-21');
    }
    if (activeTab === 'customer') {
      return [...scopedSchedules].sort((a, b) => a.customerName.localeCompare(b.customerName));
    }
    return scopedSchedules;
  }, [scopedSchedules, activeTab]);

  // Columns for Table (Section 11)
  const columns = [
    {
      header: 'Date',
      key: 'scheduledDate',
      width: '110px',
      render: (r) => <strong style={{ fontSize: '0.825rem' }}>{r.scheduledDate}</strong>
    },
    {
      header: 'Time',
      key: 'startTime',
      width: '130px',
      render: (r) => <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>{r.startTime} - {r.expectedEndTime}</span>
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '120px',
      render: (r) => (
        <div>
          <span className="customer-id-chip" style={{ fontSize: '0.72rem' }}>{r.customerId}</span>
        </div>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>{r.customerName}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.customerLocation}</div>
        </div>
      )
    },
    {
      header: 'SR ID',
      key: 'serviceRequestId',
      width: '110px',
      render: (r) => <span className="customer-id-chip" style={{ fontSize: '0.75rem' }}>{r.serviceRequestId}</span>
    },
    {
      header: 'Product',
      key: 'equipmentModel',
      render: (r) => <span style={{ fontSize: '0.825rem' }}>{r.equipmentModel}</span>
    },
    {
      header: 'Issue / Purpose',
      key: 'purpose',
      width: '200px',
      render: (r) => (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={r.purpose}>
          {r.purpose}
        </div>
      )
    },
    {
      header: 'Assigned Engineer',
      key: 'assignedEngineerName',
      render: (r) => (
        <div>
          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--primary)' }}>{r.assignedEngineerName}</span>
          {r.hasConflict && (
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>
              ⚠ Overlap
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Priority',
      key: 'priority',
      width: '90px',
      render: (r) => <StatusBadge status={r.priority} size="small" />
    },
    {
      header: 'Status',
      key: 'status',
      width: '110px',
      render: (r) => <StatusBadge status={r.status} size="small" />
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '140px',
      align: 'center',
      sortable: false,
      render: (r) => {
        const isAssignedToUser = (isEngineer && r.assignedEngineerId === 'ENG-01') || (isEmployee && r.supportingEmployeeId === 'EMP-01') || (!isEngineer && !isEmployee);
        const canCheckIn = isAssignedToUser && (r.status === 'Scheduled' || r.status === 'Pending');
        const canCheckOut = isAssignedToUser && r.status === 'In Progress';

        return (
          <div style={{ display: 'inline-flex', gap: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedSchedule(r)}
              title="View schedule details"
              style={{ padding: '4px 8px' }}
            >
              <Eye size={13} />
            </button>

            {canCheckIn && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveCheckInSchedule(r)}
                title="Record on-site check-in"
                style={{ padding: '4px 8px' }}
              >
                <CheckCircle size={13} />
                <span>In</span>
              </button>
            )}

            {canCheckOut && (
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => setActiveCheckOutSchedule(r)}
                title="Record check-out and resolution"
                style={{ padding: '4px 8px' }}
              >
                <CheckSquare size={13} />
                <span>Out</span>
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="My Schedule"
        description={`Technician field visit calendar, daily appointment itinerary, and on-site attendance logs (${currentRole.label} View).`}
      />

      {/* 5 Summary Cards (Section 11) */}
      <section className="metric-cards-grid" aria-label="Schedule Metrics" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <MetricCard
          title="Total Planned"
          value={totalPlanned}
          subtext="Assigned field visits"
          icon={Calendar}
          variant="default"
        />

        <MetricCard
          title="Completed"
          value={completed}
          subtext="Visits closed"
          icon={CheckCircle}
          variant="success"
        />

        <MetricCard
          title="In Progress"
          value={inProgress}
          subtext="Active on-site"
          icon={Wrench}
          variant="primary"
        />

        <MetricCard
          title="Pending"
          value={pending}
          subtext="Upcoming itinerary"
          icon={Clock}
          variant="warning"
        />

        <MetricCard
          title="Postponed"
          value={postponed}
          subtext="Timing adjusted"
          icon={RotateCcw}
          variant="default"
        />
      </section>

      {/* Navigation Toolbar: Tabs + Week Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        {/* Tabs (Section 11) */}
        <div className="tab-navigation-bar" style={{ margin: 0 }}>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'all' ? 'nav-tab-active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All Assignments</span>
            <span className="tab-badge">{scopedSchedules.length}</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'daily' ? 'nav-tab-active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            <span>Daily Schedule</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'weekly' ? 'nav-tab-active' : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            <span>Weekly Overview</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'customer' ? 'nav-tab-active' : ''}`}
            onClick={() => setActiveTab('customer')}
          >
            <span>Customer-wise View</span>
          </button>
        </div>

        {/* Previous Week, This Week, Next Week Navigation (Section 11) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            title="Previous Week"
            style={{ padding: '4px 8px' }}
          >
            <ChevronLeft size={14} />
            <span>Prev Week</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${weekOffset === 0 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setWeekOffset(0)}
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            {weekLabel}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            title="Next Week"
            style={{ padding: '4px 8px' }}
          >
            <span>Next Week</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Table / Card List with smooth horizontal scroll */}
      <DataTable
        columns={columns}
        data={displayedSchedules}
        keyField="id"
        minWidth="1400px"
        pageSize={10}
        emptyMessage="No schedules found"
        emptySubtext="No visits are recorded for this period"
      />

      {/* Detail Modal */}
      {selectedSchedule && (
        <ScheduleDetailModal
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
        />
      )}

      {/* Check In Modal */}
      {activeCheckInSchedule && (
        <CheckInModal
          schedule={activeCheckInSchedule}
          onClose={() => setActiveCheckInSchedule(null)}
        />
      )}

      {/* Check Out Modal */}
      {activeCheckOutSchedule && (
        <CheckOutModal
          schedule={activeCheckOutSchedule}
          onClose={() => setActiveCheckOutSchedule(null)}
        />
      )}
    </PageContainer>
  );
}
