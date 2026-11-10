import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Wrench,
  MapPin,
  ArrowRight,
  Send,
  Timer
} from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';

export default function EngineerDashboard() {
  const { schedules, workUpdates, attendanceRecords } = useSchedule();

  // Filter ONLY assignments for David Chen (ENG-01)
  const mySchedules = schedules.filter((s) => s.assignedEngineerId === 'ENG-01');
  const myUpdates = workUpdates.filter((w) => w.engineerId === 'ENG-01');
  const myAttendance = attendanceRecords.filter((a) => a.engineerId === 'ENG-01');

  const myAssignedJobs = mySchedules.length;
  const todaySchedules = mySchedules.filter((s) => s.scheduledDate === '2026-11-02');
  const todayCount = todaySchedules.length;
  const pendingJobs = mySchedules.filter((s) => s.status === 'Pending' || s.status === 'Scheduled').length;
  const inProgressJobs = mySchedules.filter((s) => s.status === 'In Progress').length;
  const completedJobs = mySchedules.filter((s) => s.status === 'Completed').length;
  const overdueJobs = mySchedules.filter((s) => s.status === 'Overdue').length;

  return (
    <div className="tab-content-wrapper">
      {/* 1. Personalized Engineer KPIs */}
      <div className="metric-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-purple)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-lavender)', color: 'var(--color-primary-purple)' }}>
            <Wrench size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{myAssignedJobs}</span>
            <span className="metric-card-label">My Assigned Jobs</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-blue)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-blue)', color: 'var(--color-primary-blue)' }}>
            <Calendar size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{todayCount}</span>
            <span className="metric-card-label">Today's Visits</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#2563EB' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <PlayCircle size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{inProgressJobs}</span>
            <span className="metric-card-label">In-Progress Jobs</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#D97706' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
            <Clock size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{pendingJobs}</span>
            <span className="metric-card-label">Pending Service Jobs</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-success)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#ECFDF5', color: 'var(--color-success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{completedJobs}</span>
            <span className="metric-card-label">Completed Jobs</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-danger)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF2F2', color: 'var(--color-danger)' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{overdueJobs}</span>
            <span className="metric-card-label">Overdue Assignments</span>
          </div>
        </div>
      </div>

      {/* 2. Middle 2-Column: Today's Field Itinerary & Upcoming Customer Visits */}
      <div className="dashboard-grid-2col">
        {/* Today's Field Itinerary */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">
              <Calendar size={18} color="var(--color-primary-purple)" />
              Today's Field Itinerary (2026-11-02)
            </h3>
            <Link to="/my-scheduled" className="nav-link-pill">
              <span>Execution Hub</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todaySchedules.length > 0 ? (
              todaySchedules.map((sch) => (
                <div key={sch.id} className="breakdown-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="schedule-chip-id">{sch.id}</span>
                      <strong style={{ fontSize: '0.85rem' }}>{sch.customerName}</strong>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {sch.customerLocation}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-primary)' }}>
                      <strong>Task:</strong> {sch.purpose}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-blue)' }}>
                      {sch.startTime} - {sch.expectedEndTime}
                    </span>
                    <span className={`status-badge status-${sch.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {sch.status}
                    </span>
                    <Link to="/my-scheduled" className="btn-compact btn-secondary-outline" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                      Manage Visit
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                No active visits scheduled for today. Check upcoming appointments below.
              </div>
            )}
          </div>
        </div>

        {/* Priority Assignments & Recent Updates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {/* Upcoming Visits */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <Clock size={18} color="var(--color-primary-blue)" />
                Upcoming Assigned Customer Visits
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mySchedules.slice(0, 3).map((sch) => (
                <div key={sch.id} className="breakdown-row">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="schedule-chip-sr">{sch.serviceRequestId}</span>
                      <strong style={{ fontSize: '0.8rem' }}>{sch.customerName}</strong>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                      {sch.equipmentModel}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-purple)' }}>
                      {sch.scheduledDate}
                    </span>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)' }}>
                      {sch.startTime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Work Updates Submitted */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <Send size={16} color="var(--color-primary-purple)" />
                Recent Work Reports Submitted
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myUpdates.slice(0, 2).map((upd) => (
                <div key={upd.id} className="update-details-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: 'var(--color-primary-purple)' }}>{upd.customerName}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{upd.submittedAt}</span>
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {upd.workDescription}
                  </div>
                  <div style={{ marginTop: '3px', fontWeight: 600, color: 'var(--color-success)' }}>
                    Progress: {upd.progress}% • {upd.workStatus}
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
