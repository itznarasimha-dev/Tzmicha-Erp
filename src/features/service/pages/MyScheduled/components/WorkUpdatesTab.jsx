import React, { useState, useMemo } from 'react';
import {
  Send,
  Plus,
  Clock,
  User,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Filter,
  Package,
  ArrowRight
} from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';
import { useRole } from '../../../context/RoleContext';
import SubmitWorkUpdateModal from './SubmitWorkUpdateModal';

export default function WorkUpdatesTab() {
  const { workUpdates } = useSchedule();
  const { roleId } = useRole();

  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';

  const [statusFilter, setStatusFilter] = useState('All');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Scoped updates by role
  const roleScopedUpdates = useMemo(() => {
    return workUpdates.filter((item) => {
      if (isEngineer && item.engineerId !== 'ENG-01') {
        return false;
      }
      if (isEmployee && item.supportingEmployeeName !== 'Alex Taylor') {
        // Employees see updates for tasks they support
        return false;
      }
      return true;
    });
  }, [workUpdates, isEngineer, isEmployee]);

  // Filtered by status
  const filteredUpdates = useMemo(() => {
    return roleScopedUpdates.filter((item) => {
      if (statusFilter !== 'All' && item.workStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [roleScopedUpdates, statusFilter]);

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'Work Completed':
        return 'status-completed';
      case 'In Progress':
        return 'status-in-progress';
      case 'Waiting for Parts':
        return 'status-pending';
      case 'Customer Assistance Required':
        return 'status-overdue';
      case 'Unable to Complete':
        return 'status-cancelled';
      default:
        return 'status-not-started';
    }
  };

  return (
    <div className="tab-content-wrapper">
      {/* 1. Header Toolbar */}
      <div className="schedule-toolbar">
        <div className="toolbar-left-group">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={14} /> Filter Work Status:
          </span>

          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Progress States</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Parts">Waiting for Parts</option>
            <option value="Customer Assistance Required">Customer Assistance Required</option>
            <option value="Work Completed">Work Completed</option>
            <option value="Unable to Complete">Unable to Complete</option>
          </select>
        </div>

        <div className="toolbar-right-group">
          {/* Submit Work Update Action Button */}
          <button
            type="button"
            className="primary-action-btn"
            onClick={() => setIsSubmitModalOpen(true)}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Submit Work Update</span>
          </button>
        </div>
      </div>

      {/* 2. Updates Feed List */}
      {filteredUpdates.length > 0 ? (
        <div className="work-updates-list">
          {filteredUpdates.map((update) => (
            <article key={update.id} className="work-update-card" aria-labelledby={`title-${update.id}`}>
              <div className="work-update-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="schedule-chip-id">{update.scheduleId}</span>
                  <span className="schedule-chip-sr">{update.serviceRequestId}</span>
                  <span className="customer-id-chip">{update.customerId || 'CUS-000001'}</span>
                  <h4 id={`title-${update.id}`} style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {update.customerName}
                  </h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`status-badge ${getStatusColorClass(update.workStatus)}`}>
                    {update.workStatus}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {update.submittedAt}
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="progress-track-wrapper">
                <div className="progress-track-label-row">
                  <span>Task Execution Completion</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary-purple)' }}>{update.progress}%</span>
                </div>
                <div className="progress-track-bar">
                  <div
                    className="progress-track-fill"
                    style={{ width: `${Math.min(100, Math.max(0, update.progress))}%` }}
                  />
                </div>
              </div>

              {/* Work Performed Description */}
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                <strong>Work Performed:</strong> {update.workDescription}
              </p>

              {/* Issues & Parts Details */}
              <div className="schedule-meta-grid" style={{ padding: '6px 0', borderTop: '1px solid var(--color-border-subtle)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <div className="schedule-meta-item">
                  <AlertCircle size={15} color="#D97706" className="schedule-meta-icon" />
                  <div className="schedule-meta-content">
                    <span className="schedule-meta-label">Issues Encountered</span>
                    <span className="schedule-meta-value">{update.issuesEncountered || 'None'}</span>
                  </div>
                </div>

                <div className="schedule-meta-item">
                  <Package size={15} color="var(--color-primary-blue)" className="schedule-meta-icon" />
                  <div className="schedule-meta-content">
                    <span className="schedule-meta-label">Parts / Materials Required</span>
                    <span className="schedule-meta-value">{update.partsRequired || 'None'}</span>
                  </div>
                </div>

                <div className="schedule-meta-item">
                  <User size={15} className="schedule-meta-icon" />
                  <div className="schedule-meta-content">
                    <span className="schedule-meta-label">Reporting Staff</span>
                    <span className="schedule-meta-value">
                      {update.engineerName} {update.supportingEmployeeName ? `• ${update.supportingEmployeeName}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Action & Remarks */}
              {(update.nextAction || update.remarks) && (
                <div className="update-details-box">
                  {update.nextAction && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary-purple)', fontWeight: 600 }}>
                      <ArrowRight size={13} />
                      <span>Next Action Required: {update.nextAction}</span>
                    </div>
                  )}
                  {update.remarks && (
                    <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      <strong>Remarks:</strong> {update.remarks}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Send size={22} />
          </div>
          <h4 className="empty-state-title">No Work Updates Reported Yet</h4>
          <p className="empty-state-text">
            No work progress submissions match the current status filter. Click "Submit Work Update" to report progress.
          </p>
        </div>
      )}

      {/* Submit Work Update Modal */}
      {isSubmitModalOpen && (
        <SubmitWorkUpdateModal
          onClose={() => setIsSubmitModalOpen(false)}
        />
      )}
    </div>
  );
}
