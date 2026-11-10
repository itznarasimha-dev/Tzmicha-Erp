import React from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Flame,
  Calendar,
  ArrowRight,
  ShieldAlert,
  Users,
  Activity,
  MapPin,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';

export default function ManagerDashboard() {
  const { serviceRequests, assignments, schedules, engineers } = useSchedule();

  // Metrics Calculation
  const totalRequests = serviceRequests.length;
  const openRequests = serviceRequests.filter(
    (s) => s.status === 'New' || s.status === 'Under Review' || s.status === 'Pending Approval'
  ).length;
  const pendingRequests = serviceRequests.filter((s) => s.status === 'Pending').length;
  const inProgressRequests = serviceRequests.filter((s) => s.status === 'In Progress').length;
  const completedServices = serviceRequests.filter((s) => s.status === 'Completed').length;
  const overdueRequests = serviceRequests.filter((s) => s.status === 'Overdue').length;
  const totalAssignedJobs = assignments.length;
  const availableEngineers = engineers.filter((e) => e.status === 'Available').length;

  // Overview Counts
  const newRequests = serviceRequests.filter((s) => s.status === 'New').length;
  const pendingApproval = serviceRequests.filter((s) => s.status === 'Pending Approval').length;
  const approvedRequests = serviceRequests.filter((s) => s.status === 'Approved').length;
  const assignedRequests = serviceRequests.filter((s) => s.status === 'Assigned').length;
  const rejectedRequests = serviceRequests.filter((s) => s.status === 'Rejected').length;

  const todaySchedules = schedules.filter((s) => s.scheduledDate === '2026-11-02');
  const todayJobsCount = todaySchedules.length;
  const inProgressJobs = schedules.filter((s) => s.status === 'In Progress').length;
  const completedJobs = schedules.filter((s) => s.status === 'Completed').length;
  const overdueActivities = schedules.filter((s) => s.status === 'Overdue').length;
  const unassignedRequests = serviceRequests.filter((s) => s.status === 'Approved' && (!s.assignedEngineerId || s.assignedEngineerName === 'Unassigned')).length;

  // Engineer Performance Data Aggregation
  const engineerPerformance = engineers.map((eng) => {
    const engSchedules = schedules.filter((s) => s.assignedEngineerId === eng.id);
    const assigned = engSchedules.length;
    const completed = engSchedules.filter((s) => s.status === 'Completed').length;
    const pending = engSchedules.filter((s) => s.status === 'Pending' || s.status === 'Scheduled').length;
    const inProg = engSchedules.filter((s) => s.status === 'In Progress').length;
    const overdue = engSchedules.filter((s) => s.status === 'Overdue').length;

    return {
      ...eng,
      assigned,
      completed,
      pending,
      inProg,
      overdue
    };
  });

  // Recent Service Activities
  const recentActivities = [
    {
      id: 'act-1',
      action: 'Emergency SR-2026-011 Logged (High Priority)',
      customer: 'Apex Heavy Industries Ltd',
      time: 'Today 03:30 PM',
      type: 'alert'
    },
    {
      id: 'act-2',
      action: 'David Chen Checked In for SCH-101 (Turbine Maintenance)',
      customer: 'Apex Heavy Industries Ltd',
      time: 'Today 09:28 AM',
      type: 'progress'
    },
    {
      id: 'act-3',
      action: 'Vikram Singh Assigned to SCH-103 (Lab Scanner Alignment)',
      customer: 'MedLife Diagnostics & Labs',
      time: 'Yesterday 04:30 PM',
      type: 'assignment'
    },
    {
      id: 'act-4',
      action: 'SteriClave Inspection Completed & Certified (SCH-105)',
      customer: 'Sterling Pharma Solutions',
      time: '2026-11-01 01:15 PM',
      type: 'completed'
    }
  ];

  // Priority Alerts
  const priorityAlerts = [
    {
      id: 'al-1',
      title: 'SR-2026-011: Hydraulic Stamping Press 800T Failure',
      desc: 'High-pressure cylinder leak under 400 bar working pressure. Line 3 halted.',
      link: '/service-requests',
      linkLabel: 'Approve & Triage'
    },
    {
      id: 'al-2',
      title: 'SCH-106 Overdue: HeavyDrive 450kW Motor Overhaul',
      desc: 'Plant inspection delayed by highway corridor block. Reassignment required.',
      link: '/work-assignment',
      linkLabel: 'Reassign Engineer'
    },
    {
      id: 'al-3',
      title: 'Schedule Conflict: Vikram Singh (SCH-103 & SCH-104)',
      desc: 'Overlapping dispatch window on 2026-11-02. Buffer period compromised.',
      link: '/work-assignment',
      linkLabel: 'Resolve Conflict'
    }
  ];

  return (
    <div className="tab-content-wrapper">
      {/* 1. KPI Cards Grid (8 items) */}
      <div className="metric-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-purple)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-lavender)', color: 'var(--color-primary-purple)' }}>
            <ClipboardList size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{totalRequests}</span>
            <span className="metric-card-label">Total Requests</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#2563EB' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <FileCheck size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{openRequests}</span>
            <span className="metric-card-label">Open Requests</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#D99518' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF3C7', color: '#D99518' }}>
            <Clock size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{pendingRequests}</span>
            <span className="metric-card-label">Pending Requests</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-blue)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-blue)', color: 'var(--color-primary-blue)' }}>
            <Activity size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{inProgressRequests}</span>
            <span className="metric-card-label">In Progress</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-success)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#ECFDF5', color: 'var(--color-success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{completedServices}</span>
            <span className="metric-card-label">Completed Services</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-danger)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF2F2', color: 'var(--color-danger)' }}>
            <Flame size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{overdueRequests}</span>
            <span className="metric-card-label">Overdue Requests</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#7C3AED' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#F3E8FF', color: '#7C3AED' }}>
            <UserCheck size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{totalAssignedJobs}</span>
            <span className="metric-card-label">Total Assigned Jobs</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#059669' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
            <Users size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{availableEngineers}</span>
            <span className="metric-card-label">Engineers Available</span>
          </div>
        </div>
      </div>

      {/* 2. Middle 2-Column: Service Request Overview & Operations Overview */}
      <div className="dashboard-grid-2col">
        {/* Service Request Overview */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">
              <ClipboardList size={18} color="var(--color-primary-purple)" />
              Service Request Overview
            </h3>
            <Link to="/service-requests" className="nav-link-pill">
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="breakdown-list">
            <div className="breakdown-row">
              <span className="breakdown-label">Total Requests Received</span>
              <span className="breakdown-val">{totalRequests}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">New Requests</span>
              <span className="breakdown-val" style={{ color: 'var(--color-primary-blue)' }}>{newRequests}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Pending Approval (Action Req)</span>
              <span className="breakdown-val" style={{ color: '#D97706' }}>{pendingApproval}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Approved (Awaiting Assignment)</span>
              <span className="breakdown-val" style={{ color: 'var(--color-primary-purple)' }}>{approvedRequests}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Assigned & Dispatched</span>
              <span className="breakdown-val">{assignedRequests}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Completed & Certified</span>
              <span className="breakdown-val" style={{ color: 'var(--color-success)' }}>{completedServices}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Rejected / Cancelled</span>
              <span className="breakdown-val" style={{ color: '#9CA3AF' }}>{rejectedRequests}</span>
            </div>
          </div>
        </div>

        {/* Service Operations Overview */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">
              <Activity size={18} color="var(--color-primary-blue)" />
              Service Operations Overview
            </h3>
            <Link to="/work-assignment" className="nav-link-pill">
              <span>Manage Assignments</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="breakdown-list">
            <div className="breakdown-row">
              <span className="breakdown-label">Jobs Scheduled for Today</span>
              <span className="breakdown-val">{todayJobsCount}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Jobs Currently in Progress</span>
              <span className="breakdown-val" style={{ color: 'var(--color-primary-blue)' }}>{inProgressJobs}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Completed Field Activities</span>
              <span className="breakdown-val" style={{ color: 'var(--color-success)' }}>{completedJobs}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Overdue Field Activities</span>
              <span className="breakdown-val" style={{ color: 'var(--color-danger)' }}>{overdueActivities}</span>
            </div>
            <div className="breakdown-row" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <span className="breakdown-label" style={{ color: '#92400E', fontWeight: 600 }}>Unassigned Approved Requests</span>
              <span className="breakdown-val" style={{ color: '#B45309' }}>{unassignedRequests}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Engineer Performance Overview Table */}
      <div className="dashboard-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">
            <Users size={18} color="var(--color-primary-purple)" />
            Field Engineer Performance & Workload Overview
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Active Personnel: <strong>{engineers.length}</strong>
          </span>
        </div>

        <div className="erp-table-scroll">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Engineer ID</th>
                <th>Engineer Name</th>
                <th>Role & Region</th>
                <th>Total Assigned</th>
                <th>In Progress</th>
                <th>Completed</th>
                <th>Pending</th>
                <th>Overdue</th>
                <th>Availability Status</th>
              </tr>
            </thead>
            <tbody>
              {engineerPerformance.map((eng) => (
                <tr key={eng.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-purple)' }}>{eng.id}</td>
                  <td style={{ fontWeight: 600 }}>{eng.name}</td>
                  <td>{eng.role} ({eng.region})</td>
                  <td style={{ fontWeight: 700 }}>{eng.assigned}</td>
                  <td style={{ color: 'var(--color-primary-blue)', fontWeight: 600 }}>{eng.inProg}</td>
                  <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{eng.completed}</td>
                  <td style={{ color: '#D97706', fontWeight: 600 }}>{eng.pending}</td>
                  <td style={{ color: eng.overdue > 0 ? 'var(--color-danger)' : 'inherit', fontWeight: eng.overdue > 0 ? 700 : 400 }}>
                    {eng.overdue}
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: eng.status === 'Available' ? '#ECFDF5' : '#EFF6FF',
                        color: eng.status === 'Available' ? 'var(--color-success)' : 'var(--color-primary-blue)',
                        border: '1px solid var(--color-border)'
                      }}
                    >
                      {eng.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Bottom 2-Column: Recent Service Activities & Priority Alerts + Upcoming Schedule */}
      <div className="dashboard-grid-2col">
        {/* Recent Service Activities */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">
              <TrendingUp size={18} color="var(--color-primary-purple)" />
              Recent Service Activities
            </h3>
          </div>

          <div className="activity-feed-list">
            {recentActivities.map((act) => (
              <div key={act.id} className="activity-feed-item">
                <div className="activity-feed-icon-box">
                  <Activity size={14} />
                </div>
                <div className="activity-feed-text">
                  <span className="activity-feed-action">{act.action}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-blue)' }}>{act.customer}</span>
                  <span className="activity-feed-time">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Alerts & Upcoming Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {/* Priority Alerts */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title" style={{ color: 'var(--color-danger)' }}>
                <ShieldAlert size={18} />
                Priority Alerts & Escalations
              </h3>
            </div>

            <div className="priority-alerts-container">
              {priorityAlerts.map((alert) => (
                <div key={alert.id} className="priority-alert-item">
                  <div className="priority-alert-content">
                    <span className="priority-alert-title">{alert.title}</span>
                    <span className="priority-alert-desc">{alert.desc}</span>
                  </div>
                  <Link to={alert.link} className="btn-compact btn-secondary-outline" style={{ fontSize: '0.7rem' }}>
                    {alert.linkLabel}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Schedule Mini Box */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <Calendar size={18} color="var(--color-primary-blue)" />
                Upcoming Customer Visits
              </h3>
              <Link to="/my-scheduled" className="nav-link-pill">
                <span>View Full Schedule</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {schedules.slice(0, 3).map((sch) => (
                <div key={sch.id} className="breakdown-row">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="schedule-chip-id">{sch.id}</span>
                      <strong style={{ fontSize: '0.8rem' }}>{sch.customerName}</strong>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} /> {sch.customerLocation}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-primary-purple)' }}>
                      {sch.scheduledDate}
                    </span>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)' }}>
                      {sch.assignedEngineerName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
