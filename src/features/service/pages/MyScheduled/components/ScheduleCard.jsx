import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Wrench,
  AlertTriangle,
  Eye,
  CheckCircle,
  CheckSquare,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { useRole } from '../../../context/RoleContext';

export default function ScheduleCard({
  schedule,
  onViewDetails,
  onReschedule,
  onReassign,
  onCheckIn,
  onCheckOut
}) {
  const { roleId } = useRole();

  const isManagerOrCoordinator = roleId === 'manager' || roleId === 'coordinator';
  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';

  // Check if current user is the assigned engineer/employee
  const isAssignedToUser =
    (isEngineer && schedule.assignedEngineerId === 'ENG-01') ||
    (isEmployee && schedule.supportingEmployeeId === 'EMP-01') ||
    isManagerOrCoordinator;

  const canCheckIn =
    isAssignedToUser &&
    (schedule.status === 'Scheduled' || schedule.status === 'Pending');

  const canCheckOut =
    isAssignedToUser && schedule.status === 'In Progress';

  const priorityClass = (schedule.priority || '').toLowerCase().replace(/\s+/g, '-');

  return (
    <article className={`schedule-item-card border-${priorityClass}`} aria-labelledby={`title-${schedule.id}`}>
      {/* Top Header Row */}
      <div className="schedule-card-header-row">
        <div className="schedule-card-title-group">
          <div className="schedule-id-badges-row">
            <span className="schedule-chip-id" title="Schedule ID">{schedule.id}</span>
            <span className="schedule-chip-sr" title="Service Request ID">{schedule.serviceRequestId}</span>
            <span className="customer-id-chip" title="Customer ID">{schedule.customerId || 'CUS-000001'}</span>
            <span className="schedule-meta-label" style={{ backgroundColor: 'var(--color-main-bg)', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
              {schedule.serviceCategory}
            </span>
            {schedule.hasConflict && (
              <span className="conflict-badge-pill" title={schedule.conflictNote || 'Schedule conflict flagged'}>
                <AlertTriangle size={13} />
                <span>Conflict</span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <h3 id={`title-${schedule.id}`} className="schedule-customer-name">
              {schedule.customerName}
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#0369A1', fontWeight: 600 }}>
              ({schedule.customerId || 'CUS-000001'})
            </span>
          </div>
        </div>

        <div className="schedule-card-badges-group">
          <span className={`priority-badge priority-${priorityClass}`}>
            {schedule.priority}
          </span>
          <span className={`status-badge status-${schedule.status.toLowerCase().replace(/\s+/g, '-')}`}>
            {schedule.status}
          </span>
        </div>
      </div>

      {/* Purpose Description */}
      <p className="schedule-purpose-text">
        <strong>Purpose:</strong> {schedule.purpose}
      </p>

      {/* Meta Grid */}
      <div className="schedule-meta-grid">
        <div className="schedule-meta-item">
          <MapPin size={15} className="schedule-meta-icon" />
          <div className="schedule-meta-content">
            <span className="schedule-meta-label">Location</span>
            <span className="schedule-meta-value">{schedule.customerLocation}</span>
          </div>
        </div>

        <div className="schedule-meta-item">
          <Calendar size={15} className="schedule-meta-icon" />
          <div className="schedule-meta-content">
            <span className="schedule-meta-label">Date & Time</span>
            <span className="schedule-meta-value">
              {schedule.scheduledDate} • {schedule.startTime} - {schedule.expectedEndTime}
            </span>
          </div>
        </div>

        <div className="schedule-meta-item">
          <User size={15} className="schedule-meta-icon" />
          <div className="schedule-meta-content">
            <span className="schedule-meta-label">Assigned Engineer</span>
            <span className="schedule-meta-value">{schedule.assignedEngineerName}</span>
          </div>
        </div>

        <div className="schedule-meta-item">
          <Wrench size={15} className="schedule-meta-icon" />
          <div className="schedule-meta-content">
            <span className="schedule-meta-label">Supporting Staff</span>
            <span className="schedule-meta-value">{schedule.supportingEmployeeName || 'None Assigned'}</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="schedule-actions-row">
        <div className="schedule-actions-left">
          <button
            type="button"
            className="btn-compact btn-secondary-outline"
            onClick={() => onViewDetails(schedule)}
          >
            <Eye size={14} />
            <span>View Details</span>
          </button>

          {/* Quick Check-In Button for assigned staff */}
          {canCheckIn && (
            <button
              type="button"
              className="btn-compact btn-primary-compact"
              style={{ backgroundColor: 'var(--color-primary-blue)' }}
              onClick={() => onCheckIn(schedule)}
            >
              <CheckCircle size={14} />
              <span>Check-In</span>
            </button>
          )}

          {/* Quick Check-Out Button for in-progress staff */}
          {canCheckOut && (
            <button
              type="button"
              className="btn-compact btn-success-compact"
              onClick={() => onCheckOut(schedule)}
            >
              <CheckSquare size={14} />
              <span>Check-Out</span>
            </button>
          )}
        </div>

        {/* Manager & Coordinator Exclusive Controls */}
        {isManagerOrCoordinator && (
          <div className="schedule-actions-right">
            <button
              type="button"
              className="btn-compact btn-secondary-outline"
              title="Reschedule this activity"
              onClick={() => onReschedule(schedule)}
            >
              <Calendar size={14} />
              <span>Reschedule</span>
            </button>

            <button
              type="button"
              className="btn-compact btn-secondary-outline"
              title="Reassign to another field engineer"
              onClick={() => onReassign(schedule)}
            >
              <UserCheck size={14} />
              <span>Reassign</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
