import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  PlayCircle,
  User,
  MapPin,
  ArrowRight,
  Send,
  AlertCircle
} from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';

export default function EmployeeDashboard() {
  const { schedules, workUpdates } = useSchedule();

  // Filter ONLY supporting tasks assigned to Alex Taylor (EMP-01)
  const myTasks = schedules.filter((s) => s.supportingEmployeeId === 'EMP-01');
  const myUpdates = workUpdates.filter((w) => w.supportingEmployeeName === 'Alex Taylor');

  const myAssignedTasks = myTasks.length;
  const todayTasks = myTasks.filter((s) => s.scheduledDate === '2026-11-02');
  const todayCount = todayTasks.length;
  const pendingTasks = myTasks.filter((s) => s.status === 'Pending' || s.status === 'Scheduled').length;
  const inProgressTasks = myTasks.filter((s) => s.status === 'In Progress').length;
  const completedTasks = myTasks.filter((s) => s.status === 'Completed').length;

  return (
    <div className="tab-content-wrapper">
      {/* 1. Employee Scoped KPIs */}
      <div className="metric-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-purple)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-lavender)', color: 'var(--color-primary-purple)' }}>
            <User size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{myAssignedTasks}</span>
            <span className="metric-card-label">My Assigned Tasks</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-blue)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-blue)', color: 'var(--color-primary-blue)' }}>
            <Calendar size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{todayCount}</span>
            <span className="metric-card-label">Today's Activities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#2563EB' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <PlayCircle size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{inProgressTasks}</span>
            <span className="metric-card-label">In-Progress Tasks</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#D99518' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF3C7', color: '#D99518' }}>
            <Clock size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{pendingTasks}</span>
            <span className="metric-card-label">Pending Tasks</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-success)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#ECFDF5', color: 'var(--color-success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{completedTasks}</span>
            <span className="metric-card-label">Completed Tasks</span>
          </div>
        </div>
      </div>

      {/* 2. Middle 2-Column: Assigned Field Work & Supporting Activities */}
      <div className="dashboard-grid-2col">
        {/* Today's Supporting Tasks */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">
              <Calendar size={18} color="var(--color-primary-purple)" />
              My Field Support Schedule (Today)
            </h3>
            <Link to="/my-scheduled" className="nav-link-pill">
              <span>View Tasks</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todayTasks.length > 0 ? (
              todayTasks.map((sch) => (
                <div key={sch.id} className="breakdown-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="schedule-chip-id">{sch.id}</span>
                      <strong style={{ fontSize: '0.85rem' }}>{sch.customerName}</strong>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {sch.customerLocation}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                      <strong>Lead Engineer:</strong> {sch.assignedEngineerName}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-blue)' }}>
                      {sch.startTime} - {sch.expectedEndTime}
                    </span>
                    <div style={{ marginTop: '4px' }}>
                      <span className={`status-badge status-${sch.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {sch.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                No active supporting tasks scheduled for today. Check upcoming responsibilities below.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Schedules & Recent Task Updates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <Clock size={18} color="var(--color-primary-blue)" />
                Upcoming Supporting Tasks
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myTasks.map((task) => (
                <div key={task.id} className="breakdown-row">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="schedule-chip-sr">{task.serviceRequestId}</span>
                      <strong style={{ fontSize: '0.8rem' }}>{task.customerName}</strong>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                      {task.purpose}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-purple)' }}>
                      {task.scheduledDate}
                    </span>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)' }}>
                      Lead: {task.assignedEngineerName}
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
