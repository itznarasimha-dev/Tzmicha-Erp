import React from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  UserCheck,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Plus,
  Activity,
  MapPin,
  Flame,
  CheckCircle2,
  Users
} from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';

export default function CoordinatorDashboard() {
  const { serviceRequests, assignments, schedules, engineers } = useSchedule();

  const totalRequests = serviceRequests.length;
  const awaitingAssignment = serviceRequests.filter((s) => s.status === 'Approved').length;
  const unassignedJobs = serviceRequests.filter((s) => s.status === 'New' || s.status === 'Approved').length;
  const occupiedEngineers = engineers.filter((e) => e.status === 'Occupied').length;
  const pendingScheduling = schedules.filter((s) => s.status === 'Pending').length;
  const todaySchedules = schedules.filter((s) => s.scheduledDate === '2026-11-02');
  const todayActivities = todaySchedules.length;
  const overdueActivities = schedules.filter((s) => s.status === 'Overdue').length;
  const pendingFollowups = schedules.filter((s) => s.status === 'Postponed' || s.hasConflict).length;

  const incomingRequests = serviceRequests.filter((s) => s.status === 'New' || s.status === 'Approved').slice(0, 5);

  return (
    <div className="tab-content-wrapper">
      {/* 1. Coordinator KPI Metric Cards */}
      <div className="metric-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
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
          <div className="metric-card-accent" style={{ backgroundColor: '#D97706' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
            <UserCheck size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{awaitingAssignment}</span>
            <span className="metric-card-label">Awaiting Assignment</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-blue)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-blue)', color: 'var(--color-primary-blue)' }}>
            <Users size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{occupiedEngineers}</span>
            <span className="metric-card-label">Engineers Assigned</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#2563EB' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <Clock size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{pendingScheduling}</span>
            <span className="metric-card-label">Pending Scheduling</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-success)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#ECFDF5', color: 'var(--color-success)' }}>
            <Calendar size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{todayActivities}</span>
            <span className="metric-card-label">Today's Visits</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-danger)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF2F2', color: 'var(--color-danger)' }}>
            <Flame size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{overdueActivities}</span>
            <span className="metric-card-label">Overdue Activities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#EA580C' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FFEDD5', color: '#EA580C' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{pendingFollowups}</span>
            <span className="metric-card-label">Pending Follow-ups</span>
          </div>
        </div>
      </div>

      {/* 2. Direct Navigation & Action Banners */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Service Requests Requiring Action
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {awaitingAssignment} approved request(s) ready for engineer allocation.
            </div>
          </div>
          <Link to="/work-assignment" className="primary-action-btn" style={{ textDecoration: 'none' }}>
            <span>Go to Work Assignment</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Incoming Customer Requests
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Create or triage incoming tickets.
            </div>
          </div>
          <Link to="/service-requests" className="btn-compact btn-secondary-outline" style={{ height: '36px', padding: '0 14px' }}>
            <span>Manage Requests</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 3. Middle 2-Column: Incoming Requests & Today's Dispatch Overview */}
      <div className="dashboard-grid-2col">
        {/* Incoming & Awaiting Requests */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">
              <ClipboardList size={18} color="var(--color-primary-purple)" />
              Service Requests Awaiting Action
            </h3>
            <Link to="/service-requests" className="nav-link-pill">
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {incomingRequests.map((req) => (
              <div key={req.id} className="breakdown-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="schedule-chip-sr">{req.id}</span>
                    <strong style={{ fontSize: '0.8rem' }}>{req.customerName}</strong>
                    <span className={`priority-badge priority-${req.priority.toLowerCase()}`}>
                      {req.priority}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                    {req.productName} • {req.serviceCategory}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`status-badge status-${req.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {req.status}
                  </span>
                  {req.status === 'Approved' && (
                    <div style={{ marginTop: '4px' }}>
                      <Link to="/work-assignment" className="nav-link-pill" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                        Assign Now
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engineer Assignment & Availability Overview */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">
              <Users size={18} color="var(--color-primary-blue)" />
              Engineer Dispatch & Field Status
            </h3>
            <Link to="/work-assignment" className="nav-link-pill">
              <span>Allocation Desk</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {engineers.map((eng) => {
              const engJobs = schedules.filter((s) => s.assignedEngineerId === eng.id && s.scheduledDate === '2026-11-02');
              return (
                <div key={eng.id} className="breakdown-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-light-blue)', color: 'var(--color-primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                      {eng.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '0.8rem' }}>{eng.name}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                        {eng.role} • {eng.region}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {engJobs.length} visit(s) today
                    </span>
                    <div style={{ fontSize: '0.68rem', color: eng.status === 'Available' ? 'var(--color-success)' : 'var(--color-primary-blue)' }}>
                      ● {eng.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
