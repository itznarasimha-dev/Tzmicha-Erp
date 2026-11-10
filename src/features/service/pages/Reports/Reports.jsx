import React, { useState, useMemo } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { useSchedule } from '../../context/ScheduleContext';
import { useRole } from '../../context/RoleContext';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  BarChart3,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Star,
  FileCheck2,
  CheckSquare,
  Wrench,
  Filter
} from 'lucide-react';

export default function Reports() {
  const { roleId } = useRole();
  const {
    serviceRequests = [],
    schedules = [],
    serviceBilling = [],
    serviceHistory = [],
    engineers = [],
    employees = []
  } = useSchedule();

  const isManager = roleId === 'manager';
  const isCoordinator = roleId === 'coordinator';
  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';
  const isManagement = isManager || isCoordinator;

  // Active view tab for managers
  const [activeTab, setActiveTab] = useState('operational'); // 'operational' | 'team' | 'individual'

  // Time filter options per Section 18:
  // This Week, Previous Week, This Month, Previous Month, This Quarter, Previous Quarter, This Year, Previous Year, YTD, MTD, Custom Date Range
  const [timeFilter, setTimeFilter] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-31');

  // Interactive Category Drill-Down Modal State
  const [drillDownCategory, setDrillDownCategory] = useState(null);

  // Selected engineer for management individual inspection
  const [selectedStaffId, setSelectedStaffId] = useState('ENG-01');

  // Multiplier or scaling based on time filter
  const timeMultiplier = useMemo(() => {
    switch (timeFilter) {
      case 'This Week':
        return 0.35;
      case 'Previous Week':
        return 0.32;
      case 'This Month':
      case 'MTD':
        return 1.0;
      case 'Previous Month':
        return 0.85;
      case 'This Quarter':
        return 2.5;
      case 'Previous Quarter':
        return 2.2;
      case 'This Year':
      case 'YTD':
        return 8.5;
      case 'Previous Year':
        return 7.8;
      case 'Custom Date Range':
        return 0.65;
      default:
        return 1.0;
    }
  }, [timeFilter]);

  // Overall Management KPI metrics (No "Targets", strictly operational benchmarks)
  const managementMetrics = useMemo(() => {
    const totalSR = Math.round(serviceRequests.length * timeMultiplier);
    const resolvedSR = Math.round(
      serviceRequests.filter((r) => r.status === 'Completed' || r.status === 'Resolved').length * timeMultiplier
    );
    const complianceRate = totalSR > 0 ? Math.min(100, Math.round((resolvedSR / totalSR) * 100)) : 94;
    const billedRev = serviceBilling.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const totalRevenue = Math.round(billedRev * timeMultiplier);

    return {
      totalSR,
      resolvedSR,
      complianceRate: `${complianceRate}%`,
      avgResolutionHours: '4.4 Hours',
      totalRevenue
    };
  }, [serviceRequests, serviceBilling, timeMultiplier]);

  // Category distribution across service operations
  const categoryBreakdown = useMemo(() => {
    const counts = {};
    serviceRequests.forEach((sr) => {
      counts[sr.serviceCategory] = (counts[sr.serviceCategory] || 0) + 1;
    });

    const total = serviceRequests.length || 1;
    return Object.entries(counts)
      .map(([cat, count]) => ({
        category: cat,
        count: Math.round(count * timeMultiplier),
        percent: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [serviceRequests, timeMultiplier]);

  // Engineer Productivity Matrix
  const engineerMatrix = useMemo(() => {
    return engineers.map((eng) => {
      const assignedCount = schedules.filter((s) => s.assignedEngineerId === eng.id).length;
      const completedCount = schedules.filter((s) => s.assignedEngineerId === eng.id && s.status === 'Completed').length;
      const pendingCount = assignedCount - completedCount;

      return {
        id: eng.id,
        name: eng.name,
        specialization: eng.specialization,
        totalAssigned: Math.round(assignedCount * timeMultiplier),
        completed: Math.round(completedCount * timeMultiplier),
        pending: Math.max(0, Math.round(pendingCount * (timeMultiplier > 1 ? 1.5 : 1))),
        rating: eng.rating || '4.9',
        status: eng.status || 'Active'
      };
    });
  }, [engineers, schedules, timeMultiplier]);

  // Customer Volume Breakdown
  const customerBreakdown = useMemo(() => {
    const map = {};
    serviceRequests.forEach((sr) => {
      if (!map[sr.customerId]) {
        map[sr.customerId] = {
          id: sr.customerId,
          name: sr.customerName,
          tickets: 0,
          revenue: 0
        };
      }
      map[sr.customerId].tickets += Math.round(1 * timeMultiplier);
    });

    serviceBilling.forEach((sb) => {
      if (map[sb.customerId]) {
        map[sb.customerId].revenue += Math.round(Number(sb.totalAmount || 0) * timeMultiplier);
      }
    });

    const list = Object.values(map);
    const totalTickets = list.reduce((sum, c) => sum + c.tickets, 0) || 1;

    return list
      .map((c) => ({
        ...c,
        percent: Math.round((c.tickets / totalTickets) * 100)
      }))
      .sort((a, b) => b.tickets - a.tickets);
  }, [serviceRequests, serviceBilling, timeMultiplier]);

  // Active individual profile for Engineer or Employee (or Management inspector)
  const currentStaffProfile = useMemo(() => {
    if (isEngineer) {
      return {
        id: 'ENG-01',
        name: 'David Chen',
        roleLabel: 'Service Engineer',
        title: 'Senior Field Service Engineer',
        specialization: 'Mechanical Systems & Heavy Machinery',
        rating: '4.9 ★',
        status: 'Active on Field'
      };
    }
    if (isEmployee) {
      return {
        id: 'EMP-01',
        name: 'Alex Taylor',
        roleLabel: 'Service Employee',
        title: 'Junior Field Support Technician',
        specialization: 'Preventive Maintenance & Assist Operations',
        rating: '4.8 ★',
        status: 'Active on Field'
      };
    }

    // For manager inspector:
    const eng = engineers.find((e) => e.id === selectedStaffId);
    if (eng) {
      return {
        id: eng.id,
        name: eng.name,
        roleLabel: 'Service Engineer',
        title: eng.roleTitle || 'Field Engineer',
        specialization: eng.specialization,
        rating: `${eng.rating || 4.9} ★`,
        status: eng.status || 'Active'
      };
    }
    return {
      id: 'ENG-01',
      name: 'David Chen',
      roleLabel: 'Service Engineer',
      title: 'Senior Field Service Engineer',
      specialization: 'Mechanical Systems',
      rating: '4.9 ★',
      status: 'Active'
    };
  }, [isEngineer, isEmployee, selectedStaffId, engineers]);

  // Scoped assignments and performance for individual
  const individualSchedules = useMemo(() => {
    if (isEngineer || (!isEmployee && currentStaffProfile.id.startsWith('ENG'))) {
      return schedules.filter(
        (s) =>
          s.assignedEngineerId === currentStaffProfile.id ||
          (s.assignedEngineerName && s.assignedEngineerName.includes(currentStaffProfile.name))
      );
    }
    return schedules.filter(
      (s) =>
        s.supportingEmployeeId === currentStaffProfile.id ||
        (s.supportingEmployeeName && s.supportingEmployeeName.includes(currentStaffProfile.name))
    );
  }, [schedules, isEngineer, isEmployee, currentStaffProfile]);

  const individualMetrics = useMemo(() => {
    const totalHandled = individualSchedules.length;
    const completed = individualSchedules.filter((s) => s.status === 'Completed').length;
    const inProgress = individualSchedules.filter((s) => s.status === 'In Progress').length;
    const pending = totalHandled - completed - inProgress;
    const attendanceCompleted = individualSchedules.filter((s) => s.status === 'Completed').length;
    const workUpdatesSubmitted = totalHandled * 3 + completed * 2; // e.g. check-in, diagnosis, completion notes

    return {
      totalHandled: Math.max(1, Math.round(totalHandled * timeMultiplier)),
      completed: Math.max(1, Math.round(completed * timeMultiplier)),
      inProgress: Math.max(0, Math.round(inProgress * timeMultiplier)),
      pending: Math.max(0, Math.round(pending * timeMultiplier)),
      avgResolutionHours: isEngineer ? '3.8 Hours' : '3.2 Hours',
      attendanceCompleted: Math.max(1, Math.round(attendanceCompleted * timeMultiplier)),
      csatRating: currentStaffProfile.rating,
      workUpdatesSubmitted: Math.max(3, Math.round(workUpdatesSubmitted * timeMultiplier))
    };
  }, [individualSchedules, isEngineer, currentStaffProfile, timeMultiplier]);

  // Individual category breakdown
  const individualCategoryBreakdown = useMemo(() => {
    const counts = {};
    individualSchedules.forEach((s) => {
      const cat = s.serviceCategory || 'Breakdown Repair';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = individualSchedules.length || 1;
    return Object.entries(counts).map(([cat, count]) => ({
      category: cat,
      count,
      percent: Math.round((count / total) * 100)
    }));
  }, [individualSchedules]);

  // Individual visits table columns
  const individualVisitColumns = [
    {
      header: 'Ticket #',
      key: 'serviceRequestId',
      render: (s) => <span className="font-semibold text-primary">{s.serviceRequestId}</span>
    },
    {
      header: 'Customer',
      key: 'customerName',
      render: (s) => (
        <div>
          <span className="font-medium text-slate-800" style={{ fontSize: '13px', display: 'block' }}>
            {s.customerName}
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb' }}>
            {s.customerId}
          </span>
        </div>
      )
    },
    {
      header: 'Service Category',
      key: 'serviceCategory',
      render: (s) => <span className="text-xs text-slate-700">{s.serviceCategory}</span>
    },
    {
      header: 'Scheduled Date',
      key: 'scheduledDate',
      align: 'center',
      render: (s) => <span className="text-xs">{formatDate(s.scheduledDate)}</span>
    },
    {
      header: 'Time Window',
      key: 'scheduledTime',
      align: 'center',
      render: (s) => <span className="text-xs font-mono">{s.scheduledTime || '09:30 AM'}</span>
    },
    {
      header: 'Execution Status',
      key: 'status',
      align: 'center',
      render: (s) => <StatusBadge status={s.status} />
    },
    {
      header: 'Attendance / Visit',
      key: 'attendanceStatus',
      align: 'center',
      render: (s) => (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: s.status === 'Completed' ? '#ecfdf5' : s.status === 'In Progress' ? '#eff6ff' : '#f8fafc',
            color: s.status === 'Completed' ? '#047857' : s.status === 'In Progress' ? '#1d4ed8' : '#64748b'
          }}
        >
          {s.status === 'Completed' ? 'Visit Concluded' : s.status === 'In Progress' ? 'Checked In' : 'Scheduled'}
        </span>
      )
    }
  ];

  // Management Engineer matrix table columns
  const engineerColumns = [
    {
      header: 'Engineer Name',
      key: 'name',
      render: (e) => (
        <div>
          <span className="font-semibold text-slate-900" style={{ fontSize: '13px', display: 'block' }}>
            {e.name}
          </span>
          <span style={{ fontSize: '11px', color: '#2563eb', fontFamily: 'monospace' }}>{e.id}</span>
        </div>
      )
    },
    {
      header: 'Specialization',
      key: 'specialization',
      render: (e) => <span className="text-xs text-slate-700">{e.specialization}</span>
    },
    {
      header: 'Assigned',
      key: 'totalAssigned',
      align: 'center',
      render: (e) => <span className="font-semibold text-xs">{e.totalAssigned}</span>
    },
    {
      header: 'Completed',
      key: 'completed',
      align: 'center',
      render: (e) => <span className="text-xs text-success font-semibold">{e.completed}</span>
    },
    {
      header: 'Pending / Active',
      key: 'pending',
      align: 'center',
      render: (e) => <span className="text-xs text-warning font-semibold">{e.pending}</span>
    },
    {
      header: 'CSAT Rating',
      key: 'rating',
      align: 'center',
      render: (e) => (
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
          ★ {e.rating}
        </span>
      )
    },
    {
      header: 'Field Status',
      key: 'status',
      align: 'center',
      render: (e) => <StatusBadge status={e.status === 'Active' ? 'Active' : 'On Leave'} />
    }
  ];

  // Management Customer demand columns
  const customerColumns = [
    {
      header: 'Customer Name',
      key: 'name',
      render: (c) => (
        <div>
          <span className="font-semibold text-slate-900" style={{ fontSize: '13px', display: 'block' }}>
            {c.name}
          </span>
          <span style={{ fontSize: '11px', color: '#2563eb', fontFamily: 'monospace' }}>{c.id}</span>
        </div>
      )
    },
    {
      header: 'Total Tickets',
      key: 'tickets',
      align: 'center',
      render: (c) => <span className="font-semibold text-xs">{c.tickets}</span>
    },
    {
      header: 'Share of Field Volume',
      key: 'percent',
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${c.percent}%`, height: '100%', background: '#2563eb', borderRadius: '3px' }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', minWidth: '32px' }}>{c.percent}%</span>
        </div>
      )
    },
    {
      header: 'Service Revenue Billed',
      key: 'revenue',
      align: 'right',
      render: (c) => <span className="font-semibold text-xs">{formatINR(c.revenue)}</span>
    }
  ];

  return (
    <div className="page-container">
      {/* Page Header with Time Range Filter */}
      <div className="page-header-row mb-4">
        <div>
          <h2 className="page-title">Reports & Analytics</h2>
          <p className="page-description">
            Review individual performance, service productivity and team operational performance.
          </p>
        </div>

        {/* Time Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} className="text-muted" />
            <select
              className="form-control"
              style={{ width: '185px', height: '36px', fontSize: '13px' }}
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="This Week">This Week</option>
              <option value="Previous Week">Previous Week</option>
              <option value="This Month">This Month</option>
              <option value="Previous Month">Previous Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="Previous Quarter">Previous Quarter</option>
              <option value="This Year">This Year</option>
              <option value="Previous Year">Previous Year</option>
              <option value="YTD">YTD (Year to Date)</option>
              <option value="MTD">MTD (Month to Date)</option>
              <option value="Custom Date Range">Custom Date Range</option>
            </select>
          </div>

          {timeFilter === 'Custom Date Range' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                className="form-control"
                style={{ width: '135px', height: '36px', fontSize: '12px' }}
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ width: '135px', height: '36px', fontSize: '12px' }}
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: SERVICE ENGINEER & EMPLOYEE (STRICTLY INDIVIDUAL PERFORMANCE ONLY) */}
      {/* ========================================================================= */}
      {!isManagement ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Individual Profile Summary Header Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: isEngineer ? 'linear-gradient(135deg, #0e7490, #155e75)' : 'linear-gradient(135deg, #475569, #334155)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '16px'
                }}
              >
                {isEngineer ? 'DC' : 'AT'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {currentStaffProfile.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      fontWeight: 600
                    }}
                  >
                    {currentStaffProfile.roleLabel} • {currentStaffProfile.id}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  {currentStaffProfile.specialization} • Performance Period: <strong className="text-slate-800">{timeFilter}</strong>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Customer Satisfaction</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#059669' }}>{currentStaffProfile.rating}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Current Availability</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>{currentStaffProfile.status}</span>
              </div>
            </div>
          </div>

          {/* 7 Individual KPI Metrics Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px'
            }}
          >
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
              <div className="summary-kpi-label">Tickets Handled</div>
              <div className="summary-kpi-value">{individualMetrics.totalHandled}</div>
              <div className="summary-kpi-sub">Assigned to you</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
              <div className="summary-kpi-label">Jobs Completed</div>
              <div className="summary-kpi-value text-success">{individualMetrics.completed}</div>
              <div className="summary-kpi-sub">Closed successfully</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
              <div className="summary-kpi-label">Active / Pending</div>
              <div className="summary-kpi-value text-warning">{individualMetrics.inProgress + individualMetrics.pending}</div>
              <div className="summary-kpi-sub">{individualMetrics.inProgress} in execution</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
              <div className="summary-kpi-label">Avg Resolution Time</div>
              <div className="summary-kpi-value text-primary">{individualMetrics.avgResolutionHours}</div>
              <div className="summary-kpi-sub">On-site turnaround</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #06b6d4' }}>
              <div className="summary-kpi-label">Visits Completed</div>
              <div className="summary-kpi-value" style={{ color: '#0891b2' }}>{individualMetrics.attendanceCompleted}</div>
              <div className="summary-kpi-sub">Attendance verified</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ec4899' }}>
              <div className="summary-kpi-label">Customer CSAT</div>
              <div className="summary-kpi-value" style={{ color: '#db2777' }}>{individualMetrics.csatRating}</div>
              <div className="summary-kpi-sub">Feedback score</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #6366f1' }}>
              <div className="summary-kpi-label">Work Updates</div>
              <div className="summary-kpi-value" style={{ color: '#4f46e5' }}>{individualMetrics.workUpdatesSubmitted}</div>
              <div className="summary-kpi-sub">Field notes logged</div>
            </div>
          </div>

          {/* 2-Column Section: Category Distribution & Activity Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Category Breakdown */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Wrench size={17} className="text-primary" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  My Service Category Specialization
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {individualCategoryBreakdown.length > 0 ? (
                  individualCategoryBreakdown.map((cat) => (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{cat.category}</span>
                        <span style={{ color: '#64748b' }}>
                          <strong className="text-slate-900">{cat.count} jobs</strong> ({cat.percent}%)
                        </span>
                      </div>
                      <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${cat.percent}%`, height: '100%', background: '#2563eb', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>No service records for selected period.</p>
                )}
              </div>
            </div>

            {/* Quality & SLA Benchmarks */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <ShieldCheck size={17} className="text-success" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  Quality & Operational Compliance
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#475569' }}>First-Time Fix Rate</span>
                    <strong className="text-slate-900">92%</strong>
                  </div>
                  <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '92%', height: '100%', background: '#10b981', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#475569' }}>On-Time Arrival (SLA)</span>
                    <strong className="text-slate-900">96%</strong>
                  </div>
                  <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '96%', height: '100%', background: '#2563eb', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#475569' }}>Customer Sign-off Completeness</span>
                    <strong className="text-slate-900">100%</strong>
                  </div>
                  <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: '#8b5cf6', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Individual Detailed Visit Log Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                My Scheduled Service Visits & Execution History
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Individual field work orders, site check-ins, customer locations, and resolution statuses
              </p>
            </div>

            <DataTable
              columns={individualVisitColumns}
              data={individualSchedules}
              keyField="id"
              minWidth="850px"
              emptyMessage="No assigned service visits found for this period."
              defaultPageSize={10}
            />
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW B: MANAGER & COORDINATOR (FULL OPERATIONAL + TEAM + INDIVIDUAL VIEWS) */
        /* ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top KPI Cards for Management */}
          <div className="summary-kpi-grid">
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
              <div className="summary-kpi-label">Service Requests Handled</div>
              <div className="summary-kpi-value">{managementMetrics.totalSR}</div>
              <div className="summary-kpi-sub">{managementMetrics.resolvedSR} resolved & closed</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
              <div className="summary-kpi-label">SLA Compliance Rate</div>
              <div className="summary-kpi-value text-success">{managementMetrics.complianceRate}</div>
              <div className="summary-kpi-sub">Benchmark: 90% SLA standard</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
              <div className="summary-kpi-label">Avg Field Resolution Time</div>
              <div className="summary-kpi-value text-primary">{managementMetrics.avgResolutionHours}</div>
              <div className="summary-kpi-sub">From ticket receipt to fix</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
              <div className="summary-kpi-label">Service Revenue Realized</div>
              <div className="summary-kpi-value text-warning">{formatINR(managementMetrics.totalRevenue)}</div>
              <div className="summary-kpi-sub">From parts and billable calls</div>
            </div>
          </div>

          {/* Three Clean Tabs (No "Targets") */}
          <div className="tab-navigation-bar">
            <button
              type="button"
              className={`tab-nav-btn ${activeTab === 'operational' ? 'active' : ''}`}
              onClick={() => setActiveTab('operational')}
            >
              <BarChart3 size={16} />
              <span>Operational Performance & SLA Distribution</span>
            </button>
            <button
              type="button"
              className={`tab-nav-btn ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <Users size={16} />
              <span>Team Productivity & Customer Volume</span>
            </button>
            <button
              type="button"
              className={`tab-nav-btn ${activeTab === 'individual' ? 'active' : ''}`}
              onClick={() => setActiveTab('individual')}
            >
              <Award size={16} />
              <span>Individual Engineer Scorecard</span>
            </button>
          </div>

          {/* Tab 1: Operational Performance & SLA Distribution */}
          {activeTab === 'operational' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 2-Column Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Resolution Benchmark Progress Card */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
                      <Award size={18} className="text-primary" />
                      <span>Service Resolution Benchmark</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                      {managementMetrics.resolvedSR} / {Math.round(20 * timeMultiplier)} Closed
                    </span>
                  </div>

                  <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.round((managementMetrics.resolvedSR / Math.round(20 * timeMultiplier)) * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #2563eb, #10b981)',
                        borderRadius: '5px'
                      }}
                    />
                  </div>

                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                    ApexERP field service operations are currently tracking at{' '}
                    <strong className="text-slate-800">
                      {Math.min(100, Math.round((managementMetrics.resolvedSR / Math.round(20 * timeMultiplier)) * 100))}%
                    </strong>{' '}
                    of the operational SLA benchmark for {timeFilter}.
                  </p>
                </div>

                {/* Monthly Field Visits Trends */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
                      <TrendingUp size={18} className="text-primary" />
                      <span>6-Month Service Trend (May – Oct 2026)</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Volume index</span>
                  </div>

                  {/* Clean Responsive Bar Chart */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '80px', paddingTop: '10px' }}>
                    {[
                      { month: 'May', height: '45%', val: 12 },
                      { month: 'Jun', height: '58%', val: 15 },
                      { month: 'Jul', height: '70%', val: 18 },
                      { month: 'Aug', height: '65%', val: 16 },
                      { month: 'Sep', height: '82%', val: 21 },
                      { month: 'Oct', height: '100%', val: 25 }
                    ].map((bar) => (
                      <div key={bar.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>{bar.val}</span>
                        <div style={{ width: '22px', height: bar.height, background: '#2563eb', borderRadius: '4px 4px 0 0' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Volume Breakdown Section (Interactive Drill-Down) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      Service Category Distribution & Volume Share
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                      Click any category below to open a full operational drill-down report
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {categoryBreakdown.map((cat) => (
                    <div
                      key={cat.category}
                      onClick={() => setDrillDownCategory(cat)}
                      style={{
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                        backgroundColor: '#ffffff',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#f1f5f9';
                      }}
                      title={`Click to inspect all tickets in ${cat.category}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{cat.category}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>→ Click to view drill-down</span>
                        </span>
                        <span style={{ color: '#64748b' }}>
                          <strong className="text-slate-900">{cat.count} tickets</strong> ({cat.percent}%)
                        </span>
                      </div>
                      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${cat.percent}%`, height: '100%', background: '#2563eb', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Team Productivity & Customer Volume */}
          {activeTab === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section 1: Engineer Productivity Matrix */}
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                    Field Engineer Productivity & Workload Matrix
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Active ticket assignments, completions, customer ratings, and current availability
                  </p>
                </div>
                <DataTable
                  columns={engineerColumns}
                  data={engineerMatrix}
                  keyField="id"
                  minWidth="950px"
                  defaultPageSize={10}
                />
              </div>

              {/* Section 2: Customer Service Volume Load */}
              <div style={{ marginTop: '10px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                    Customer Account Service Demand & Revenue Realization
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Breakdown of service requests and billed non-warranty revenue per client account
                  </p>
                </div>
                <DataTable
                  columns={customerColumns}
                  data={customerBreakdown}
                  keyField="id"
                  minWidth="850px"
                  defaultPageSize={10}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Individual Engineer Scorecard Inspector */}
          {activeTab === 'individual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Engineer Selector for Manager */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    Select Staff Member to Inspect:
                  </span>
                  <select
                    className="form-control"
                    style={{ width: '240px', height: '36px', fontSize: '13px' }}
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                  >
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name} ({eng.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing individual operational scorecard for {currentStaffProfile.name}
                </span>
              </div>

              {/* Individual KPI Metrics Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '12px'
                }}
              >
                <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
                  <div className="summary-kpi-label">Tickets Handled</div>
                  <div className="summary-kpi-value">{individualMetrics.totalHandled}</div>
                  <div className="summary-kpi-sub">Assigned to staff</div>
                </div>

                <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
                  <div className="summary-kpi-label">Jobs Completed</div>
                  <div className="summary-kpi-value text-success">{individualMetrics.completed}</div>
                  <div className="summary-kpi-sub">Closed successfully</div>
                </div>

                <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
                  <div className="summary-kpi-label">Active / Pending</div>
                  <div className="summary-kpi-value text-warning">{individualMetrics.inProgress + individualMetrics.pending}</div>
                  <div className="summary-kpi-sub">{individualMetrics.inProgress} in execution</div>
                </div>

                <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
                  <div className="summary-kpi-label">Avg Resolution Time</div>
                  <div className="summary-kpi-value text-primary">{individualMetrics.avgResolutionHours}</div>
                  <div className="summary-kpi-sub">On-site turnaround</div>
                </div>

                <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #06b6d4' }}>
                  <div className="summary-kpi-label">Visits Completed</div>
                  <div className="summary-kpi-value" style={{ color: '#0891b2' }}>{individualMetrics.attendanceCompleted}</div>
                  <div className="summary-kpi-sub">Attendance verified</div>
                </div>

                <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ec4899' }}>
                  <div className="summary-kpi-label">Customer CSAT</div>
                  <div className="summary-kpi-value" style={{ color: '#db2777' }}>{individualMetrics.csatRating}</div>
                  <div className="summary-kpi-sub">Feedback score</div>
                </div>

                <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #6366f1' }}>
                  <div className="summary-kpi-label">Work Updates</div>
                  <div className="summary-kpi-value" style={{ color: '#4f46e5' }}>{individualMetrics.workUpdatesSubmitted}</div>
                  <div className="summary-kpi-sub">Field notes logged</div>
                </div>
              </div>

              {/* Individual Visits Table */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                    {currentStaffProfile.name} – Scheduled Visits & Job Execution Log
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Complete list of field jobs and on-site attendance logs
                  </p>
                </div>

                <DataTable
                  columns={individualVisitColumns}
                  data={individualSchedules}
                  keyField="id"
                  minWidth="850px"
                  emptyMessage="No assigned service visits found for this engineer."
                  defaultPageSize={10}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Category Drill-Down Modal */}
      {drillDownCategory && (
        <Modal
          isOpen={Boolean(drillDownCategory)}
          onClose={() => setDrillDownCategory(null)}
          title={`Category Drill-Down: ${drillDownCategory.category}`}
          subtitle={`Detailed operational breakdown of ${drillDownCategory.count} tickets (${drillDownCategory.percent}% of total service volume)`}
          size="large"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDrillDownCategory(null)}>
                Close Drill-Down Report
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 3 Metric Cards for this category */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase' }}>Total Tickets</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e40af', marginTop: '2px' }}>{drillDownCategory.count}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>Volume Share</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#166534', marginTop: '2px' }}>{drillDownCategory.percent}%</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>SLA Benchmark</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>94% Compliance</div>
              </div>
            </div>

            {/* Drill-down Tickets Table */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                Active & Historical Work Orders in {drillDownCategory.category}
              </h4>
              <DataTable
                columns={[
                  {
                    header: 'Ticket ID',
                    key: 'id',
                    width: '120px',
                    render: (sr) => (
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', fontSize: '12px' }}>
                        {sr.id}
                      </span>
                    )
                  },
                  {
                    header: 'Customer',
                    key: 'customerName',
                    width: '180px',
                    render: (sr) => (
                      <div>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px', display: 'block' }}>{sr.customerName}</span>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>{sr.customerId}</span>
                      </div>
                    )
                  },
                  {
                    header: 'Equipment',
                    key: 'productName',
                    width: '180px',
                    render: (sr) => <span style={{ fontSize: '12px', color: '#334155' }}>{sr.productName}</span>
                  },
                  {
                    header: 'Priority',
                    key: 'priority',
                    width: '100px',
                    align: 'center',
                    render: (sr) => <StatusBadge status={sr.priority} size="small" />
                  },
                  {
                    header: 'Logged Date',
                    key: 'requestDate',
                    width: '110px',
                    align: 'center',
                    render: (sr) => <span style={{ fontSize: '12px' }}>{formatDate(sr.requestDate)}</span>
                  },
                  {
                    header: 'Assigned Engineer',
                    key: 'assignedEngineerName',
                    width: '160px',
                    render: (sr) => <span style={{ fontSize: '12px', fontWeight: 500 }}>{sr.assignedEngineerName || 'Unassigned'}</span>
                  },
                  {
                    header: 'Status',
                    key: 'status',
                    width: '120px',
                    align: 'center',
                    render: (sr) => <StatusBadge status={sr.status} size="small" />
                  }
                ]}
                data={serviceRequests.filter((sr) => sr.serviceCategory === drillDownCategory.category)}
                keyField="id"
                minWidth="880px"
                emptyMessage="No tickets found in this category."
                defaultPageSize={5}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
