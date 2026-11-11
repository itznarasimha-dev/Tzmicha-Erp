import React from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Wrench,
  AlertTriangle,
  FileText,
  Phone,
  ShieldAlert
} from 'lucide-react';

export default function ScheduleDetailModal({ schedule, onClose }) {
  if (!schedule) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="schedule-chip-id">{schedule.id}</span>
            <span className="schedule-chip-sr">{schedule.serviceRequestId}</span>
            <span className="customer-id-chip">{schedule.customerId || 'CUS-000001'}</span>
            <h3 className="modal-title">Schedule Details</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Conflict Warning if present */}
          {schedule.hasConflict && (
            <div className="modal-info-banner" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' }}>
              <AlertTriangle size={16} />
              <span>
                <strong>Schedule Conflict Flagged:</strong> {schedule.conflictNote}
              </span>
            </div>
          )}

          {/* Customer & Location */}
          <div className="update-details-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Customer & Site Information</span>
              <span className="customer-id-chip">{schedule.customerId || 'CUS-000001'}</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary-purple)' }}>
              <span>{schedule.customerName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              <MapPin size={14} />
              <span>{schedule.customerLocation}</span>
            </div>
            {schedule.customerContact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                <Phone size={14} />
                <span>{schedule.customerContact}</span>
              </div>
            )}
          </div>

          {/* Equipment & Reported Issue */}
          <div className="update-details-box">
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Asset & Diagnostic Details</span>
            <div><strong>Equipment:</strong> {schedule.equipmentModel || 'Industrial Machine Asset'}</div>
            <div><strong>Service Category:</strong> {schedule.serviceCategory}</div>
            <div><strong>Reported Issue:</strong> {schedule.reportedIssue || 'Standard operational task.'}</div>
            <div><strong>Purpose of Visit:</strong> {schedule.purpose}</div>
          </div>

          {/* Assignment & Timings */}
          <div className="schedule-meta-grid" style={{ border: 'none', padding: 0 }}>
            <div className="schedule-meta-item">
              <Calendar size={15} className="schedule-meta-icon" />
              <div className="schedule-meta-content">
                <span className="schedule-meta-label">Scheduled Date</span>
                <span className="schedule-meta-value">{schedule.scheduledDate}</span>
              </div>
            </div>

            <div className="schedule-meta-item">
              <Clock size={15} className="schedule-meta-icon" />
              <div className="schedule-meta-content">
                <span className="schedule-meta-label">Timings</span>
                <span className="schedule-meta-value">{schedule.startTime} - {schedule.expectedEndTime}</span>
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

          {/* Priority & Status Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-main-bg)', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginRight: '6px' }}>Priority:</span>
              <span className={`priority-badge priority-${schedule.priority.toLowerCase()}`}>
                {schedule.priority}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginRight: '6px' }}>Status:</span>
              <span className={`status-badge status-${schedule.status.toLowerCase().replace(/\s+/g, '-')}`}>
                {schedule.status}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-compact btn-secondary-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
