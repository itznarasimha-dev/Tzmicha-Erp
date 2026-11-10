import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Clock3,
  Flame,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';
import { useRole } from '../../../context/RoleContext';
import ScheduleCard from './ScheduleCard';
import ScheduleDetailModal from './ScheduleDetailModal';
import RescheduleModal from './RescheduleModal';
import ReassignModal from './ReassignModal';
import CheckInModal from './CheckInModal';
import CheckOutModal from './CheckOutModal';

export default function MyScheduleTab() {
  const {
    schedules,
    checkIn,
    checkOut,
    rescheduleSchedule,
    reassignEngineer,
    resetToDemoData
  } = useSchedule();
  const { roleId, currentRole } = useRole();

  // Filters & State
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'daily' | 'weekly' | 'customer'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-11-02');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = prev week, 1 = next week
  const [regionFilter, setRegionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // For Engineer/Employee: filter to their own by default
  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';
  const [onlyMyTasks, setOnlyMyTasks] = useState(isEngineer || isEmployee);

  // Active Modals
  const [detailModalSchedule, setDetailModalSchedule] = useState(null);
  const [rescheduleModalSchedule, setRescheduleModalSchedule] = useState(null);
  const [reassignModalSchedule, setReassignModalSchedule] = useState(null);
  const [checkInModalSchedule, setCheckInModalSchedule] = useState(null);
  const [checkOutModalSchedule, setCheckOutModalSchedule] = useState(null);

  // Scoped Schedules based on role & personal toggle
  const roleScopedSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (onlyMyTasks) {
        if (isEngineer && s.assignedEngineerId !== 'ENG-01') return false;
        if (isEmployee && s.supportingEmployeeId !== 'EMP-01') return false;
      }
      return true;
    });
  }, [schedules, onlyMyTasks, isEngineer, isEmployee]);

  // Top summary metric cards (dynamically computed from roleScopedSchedules)
  const metrics = useMemo(() => {
    const total = roleScopedSchedules.length;
    const pending = roleScopedSchedules.filter((s) => s.status === 'Pending').length;
    const inProgress = roleScopedSchedules.filter((s) => s.status === 'In Progress').length;
    const completed = roleScopedSchedules.filter((s) => s.status === 'Completed').length;
    const overdue = roleScopedSchedules.filter((s) => s.status === 'Overdue').length;
    const conflicts = roleScopedSchedules.filter((s) => s.hasConflict).length;

    return { total, pending, inProgress, completed, overdue, conflicts };
  }, [roleScopedSchedules]);

  // Filtered List
  const filteredSchedules = useMemo(() => {
    return roleScopedSchedules.filter((item) => {
      // Search query (Service ID, Customer Name, Engineer Name, Purpose)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesSr = item.serviceRequestId.toLowerCase().includes(q);
        const matchesCustomer = item.customerName.toLowerCase().includes(q);
        const matchesEngineer = item.assignedEngineerName.toLowerCase().includes(q);
        const matchesPurpose = item.purpose.toLowerCase().includes(q);

        if (!matchesId && !matchesSr && !matchesCustomer && !matchesEngineer && !matchesPurpose) {
          return false;
        }
      }

      // Region filter
      if (regionFilter !== 'All' && item.region !== regionFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'All' && item.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'All' && item.priority !== priorityFilter) {
        return false;
      }

      // View modes
      if (viewMode === 'daily') {
        if (item.scheduledDate !== selectedDate) return false;
      }

      return true;
    });
  }, [roleScopedSchedules, searchQuery, regionFilter, statusFilter, priorityFilter, viewMode, selectedDate]);

  return (
    <div className="tab-content-wrapper">
      {/* 1. Top Summary Metric Cards */}
      <div className="metric-cards-grid">
        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-purple)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-lavender)', color: 'var(--color-primary-purple)' }}>
            <Calendar size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.total}</span>
            <span className="metric-card-label">Total Scheduled</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#D99518' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF3C7', color: '#D99518' }}>
            <Clock3 size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.pending}</span>
            <span className="metric-card-label">Pending Activities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-primary-blue)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: 'var(--color-light-blue)', color: 'var(--color-primary-blue)' }}>
            <Clock size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.inProgress}</span>
            <span className="metric-card-label">In Progress</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-success)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#ECFDF5', color: 'var(--color-success)' }}>
            <CheckCircle size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.completed}</span>
            <span className="metric-card-label">Completed Activities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: 'var(--color-danger)' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FEF2F2', color: 'var(--color-danger)' }}>
            <Flame size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.overdue}</span>
            <span className="metric-card-label">Overdue / Missed</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-accent" style={{ backgroundColor: '#EA580C' }} />
          <div className="metric-card-icon-box" style={{ backgroundColor: '#FFEDD5', color: '#EA580C' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="metric-card-info">
            <span className="metric-card-value">{metrics.conflicts}</span>
            <span className="metric-card-label">Schedule Conflicts</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & View Controls Toolbar */}
      <div className="schedule-toolbar">
        <div className="toolbar-left-group">
          {/* View Selector */}
          <div className="view-mode-pill-group">
            <button
              type="button"
              className={`view-mode-pill ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              All Assignments
            </button>
            <button
              type="button"
              className={`view-mode-pill ${viewMode === 'daily' ? 'active' : ''}`}
              onClick={() => setViewMode('daily')}
            >
              Daily Schedule
            </button>
            <button
              type="button"
              className={`view-mode-pill ${viewMode === 'weekly' ? 'active' : ''}`}
              onClick={() => setViewMode('weekly')}
            >
              Weekly Overview
            </button>
          </div>

          {/* Search Box */}
          <div className="toolbar-search-box">
            <Search size={15} className="toolbar-search-icon" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search ID, customer, engineer, purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Date Selector for Daily View */}
          {viewMode === 'daily' && (
            <input
              type="date"
              className="date-picker-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              title="Select schedule date"
            />
          )}

          {/* Week Navigation for Weekly View */}
          {viewMode === 'weekly' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className="btn-compact btn-secondary-outline"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                title="Previous Week"
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0 6px' }}>
                {weekOffset === 0 ? 'This Week (Nov 02 - Nov 08)' : weekOffset < 0 ? 'Previous Week' : 'Next Week'}
              </span>
              <button
                type="button"
                className="btn-compact btn-secondary-outline"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                title="Next Week"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-right-group">
          {/* Status Filter */}
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by Status"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Postponed">Postponed</option>
            <option value="Overdue">Overdue</option>
          </select>

          {/* Priority Filter */}
          <select
            className="toolbar-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by Priority"
          >
            <option value="All">All Priorities</option>
            <option value="Very High">Very High</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Region Filter */}
          <select
            className="toolbar-select"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            aria-label="Filter by Region"
          >
            <option value="All">All Regions</option>
            <option value="North">North Region</option>
            <option value="South">South Region</option>
            <option value="West">West Region</option>
          </select>

          {/* Personal Scope Toggle for Staff */}
          {(isEngineer || isEmployee) && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', marginLeft: '6px' }}>
              <input
                type="checkbox"
                checked={onlyMyTasks}
                onChange={(e) => setOnlyMyTasks(e.target.checked)}
                style={{ accentColor: 'var(--color-primary-purple)' }}
              />
              <span>My Tasks</span>
            </label>
          )}

          {/* Reset Demo Data Button */}
          <button
            type="button"
            className="btn-compact btn-secondary-outline"
            title="Reset demonstration data"
            onClick={resetToDemoData}
          >
            <RotateCcw size={13} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* 3. Schedules List Grid */}
      {filteredSchedules.length > 0 ? (
        <div className="schedule-cards-list">
          {filteredSchedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onViewDetails={(s) => setDetailModalSchedule(s)}
              onReschedule={(s) => setRescheduleModalSchedule(s)}
              onReassign={(s) => setReassignModalSchedule(s)}
              onCheckIn={(s) => setCheckInModalSchedule(s)}
              onCheckOut={(s) => setCheckOutModalSchedule(s)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Calendar size={22} />
          </div>
          <h4 className="empty-state-title">No Service Schedules Found</h4>
          <p className="empty-state-text">
            No activities matched your current filters or search terms. Try clearing the filters or switching views.
          </p>
        </div>
      )}

      {/* Interactive Modals */}
      {detailModalSchedule && (
        <ScheduleDetailModal
          schedule={detailModalSchedule}
          onClose={() => setDetailModalSchedule(null)}
        />
      )}

      {rescheduleModalSchedule && (
        <RescheduleModal
          schedule={rescheduleModalSchedule}
          onClose={() => setRescheduleModalSchedule(null)}
          onConfirm={rescheduleSchedule}
        />
      )}

      {reassignModalSchedule && (
        <ReassignModal
          schedule={reassignModalSchedule}
          onClose={() => setReassignModalSchedule(null)}
          onConfirm={reassignEngineer}
        />
      )}

      {checkInModalSchedule && (
        <CheckInModal
          schedule={checkInModalSchedule}
          onClose={() => setCheckInModalSchedule(null)}
          onConfirm={checkIn}
        />
      )}

      {checkOutModalSchedule && (
        <CheckOutModal
          schedule={checkOutModalSchedule}
          onClose={() => setCheckOutModalSchedule(null)}
          onConfirm={checkOut}
        />
      )}
    </div>
  );
}
