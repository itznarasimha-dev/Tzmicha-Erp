import { useState, useMemo } from 'react';
import StatusBadge from '../components/common/StatusBadge';
import SubmitWorkUpdateModal from '../components/modals/SubmitWorkUpdateModal';
import EditWorkUpdateModal from '../components/modals/EditWorkUpdateModal';
import AttendanceWorkSubNav from '../components/common/AttendanceWorkSubNav';
import { useSales } from '../context/SalesContext';
import { formatDate } from '../utils/formatters';
import {
  FileText,
  Plus,
  Edit,
  AlertTriangle,
  Target,
  History,
  Users,
  User,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const REGIONAL_EMPLOYEE_IDS = [
  'APX-EMP-4091', // Vikram Mehta (Sales Rep)
  'APX-EMP-4092', // Rohan Sharma (Sales Rep)
  'APX-EMP-4093', // Priya Nair (Sales Rep)
  'APX-EMP-5011', // Aditya Joshi (Junior Sales)
  'APX-EMP-5012', // Neha Kulkarni (Junior Sales)
  'APX-EMP-3044', // Sneha Patil (Sales Coordinator)
];

export default function WorkUpdatesPage() {
  const {
    userProfile,
    userRole,
    workUpdates = [],
    teamRoster = [],
    targets = [],
  } = useSales();

  const isManagerOrCoordinator = ['sales_manager', 'sales_coordinator', 'admin'].includes(userRole);

  const [activeTab, setActiveTab] = useState('my-updates'); // 'my-updates' | 'team-updates'
  const [workFilter, setWorkFilter] = useState('all'); // 'all' | 'Completed' | 'In Progress' | 'Blocked'
  const [searchQuery, setSearchQuery] = useState('');

  // Team updates filters
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');
  const [teamStatusFilter, setTeamStatusFilter] = useState('all');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // Modals state
  const [isSubmitWorkOpen, setIsSubmitWorkOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);

  // 1. Filtered personal updates for logged-in employee
  const myWorkUpdates = useMemo(() => {
    return workUpdates.filter((w) => {
      const isMine =
        w.employeeId === userProfile.employeeId ||
        (userProfile.fullName && w.employeeName?.toLowerCase() === userProfile.fullName.toLowerCase());
      const matchesFilter = workFilter === 'all' || w.progress === workFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.title?.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q) ||
        w.moduleRef?.toLowerCase().includes(q) ||
        w.blockers?.toLowerCase().includes(q);

      return isMine && matchesFilter && matchesSearch;
    });
  }, [workUpdates, userProfile.employeeId, userProfile.fullName, workFilter, searchQuery]);

  // 2. Scoped team updates for Manager (organizational) vs Coordinator (regional)
  const scopedTeamUpdates = useMemo(() => {
    if (userRole === 'sales_manager' || userRole === 'admin') {
      return workUpdates;
    }
    if (userRole === 'sales_coordinator') {
      return workUpdates.filter(
        (w) =>
          REGIONAL_EMPLOYEE_IDS.includes(w.employeeId) ||
          w.employeeId === userProfile.employeeId ||
          (userProfile.regionId && w.regionId === userProfile.regionId)
      );
    }
    return [];
  }, [workUpdates, userRole, userProfile.employeeId, userProfile.regionId]);

  // 3. Filtered team updates
  const filteredTeamUpdates = useMemo(() => {
    return scopedTeamUpdates.filter((w) => {
      const matchesEmployee =
        selectedEmployeeFilter === 'all' || w.employeeId === selectedEmployeeFilter;
      const matchesStatus =
        teamStatusFilter === 'all' || w.progress === teamStatusFilter;
      const q = teamSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.title?.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q) ||
        w.employeeName?.toLowerCase().includes(q) ||
        w.moduleRef?.toLowerCase().includes(q) ||
        w.blockers?.toLowerCase().includes(q);

      return matchesEmployee && matchesStatus && matchesSearch;
    });
  }, [scopedTeamUpdates, selectedEmployeeFilter, teamStatusFilter, teamSearchQuery]);

  // 4. Scoped employee dropdown list for team filter
  const scopedEmployeeOptions = useMemo(() => {
    if (userRole === 'sales_manager' || userRole === 'admin') {
      return teamRoster;
    }
    if (userRole === 'sales_coordinator') {
      return teamRoster.filter(
        (emp) =>
          REGIONAL_EMPLOYEE_IDS.includes(emp.employeeId) ||
          emp.employeeId === userProfile.employeeId
      );
    }
    return [];
  }, [teamRoster, userRole, userProfile.employeeId]);

  // Blocked items count across scoped team
  const blockedTeamUpdatesCount = useMemo(() => {
    return scopedTeamUpdates.filter(
      (w) => w.progress === 'Blocked' || (w.blockers && w.blockers.trim().length > 0)
    ).length;
  }, [scopedTeamUpdates]);

  return (
    <div className="page-container">
      {/* Attendance & Work Updates Shared Sub-Navigation */}
      <AttendanceWorkSubNav currentTab="work-updates" />

      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Work Updates</h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              Daily Deliverables &amp; Milestones
            </span>
          </div>
          <p className="page-description">
            Submit daily deliverables, track progress against assigned targets, and report operational blockers
          </p>
        </div>

        {/* Top Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary btn-icon-text"
            onClick={() => setIsSubmitWorkOpen(true)}
            title="Submit a new daily work update"
          >
            <Plus size={15} />
            <span>Submit Work Update</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation Bar for Manager & Coordinator */}
      {isManagerOrCoordinator && (
        <div className="tab-navigation-bar mb-4">
          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'my-updates' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-updates')}
          >
            <FileText size={16} />
            <span>My Updates</span>
          </button>

          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'team-updates' ? 'active' : ''}`}
            onClick={() => setActiveTab('team-updates')}
          >
            <Users size={16} />
            <span>Team Updates</span>
            {blockedTeamUpdatesCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: '6px',
                }}
                title={`${blockedTeamUpdatesCount} blocked deliverables requiring intervention`}
              >
                {blockedTeamUpdatesCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 1: MY UPDATES (ACCESSIBLE TO ALL FOUR ROLES) */}
      {/* ============================================================== */}
      {(!isManagerOrCoordinator || activeTab === 'my-updates') && (
        <div
          className="card mb-4"
          style={{
            padding: '20px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        >
          {/* Header & Filter Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                My Daily Work Updates
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Deliverables, progress updates, and field activity logs submitted by {userProfile.fullName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '9px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search updates..."
                  style={{ width: '200px', fontSize: '12px', padding: '5px 10px 5px 28px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter Pills */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  background: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '6px',
                }}
              >
                {['all', 'Completed', 'In Progress', 'Blocked'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    style={{
                      fontSize: '11.5px',
                      padding: '4px 9px',
                      borderRadius: '4px',
                      border: 'none',
                      background: workFilter === filter ? '#2563eb' : 'transparent',
                      color: workFilter === filter ? '#ffffff' : '#64748b',
                      fontWeight: workFilter === filter ? '600' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setWorkFilter(filter)}
                  >
                    {filter === 'all' ? 'All Updates' : filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Work Updates Cards */}
          {myWorkUpdates.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              <FileText size={28} className="text-muted mx-auto mb-2" style={{ opacity: 0.6 }} />
              <div>No daily work updates found matching this filter.</div>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-3"
                onClick={() => setIsSubmitWorkOpen(true)}
              >
                <Plus size={14} className="mr-1" />
                Submit Your First Daily Update
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myWorkUpdates.map((item) => {
                const targetObj = targets.find((t) => t.id === item.targetId);

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#ffffff',
                      border: item.progress === 'Blocked' ? '1px solid #fecaca' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>{item.title}</strong>
                          <StatusBadge status={item.progress} size="small" />
                          {item.moduleRef && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#2563eb',
                                background: '#eff6ff',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              Ref: {item.moduleRef}
                            </span>
                          )}
                          {item.activityRef && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#166534',
                                background: '#dcfce7',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                border: '1px solid #bbf7d0',
                              }}
                            >
                              Action Plan: {item.activityRef}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Logged on {formatDate(item.date)} by {item.employeeName} ({item.role || 'Sales'})
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                          {item.progressPercentage}% Completed
                        </span>
                        <button
                          type="button"
                          className="table-action-icon-btn"
                          onClick={() => setEditingUpdate(item)}
                          title="Edit or correct this work update (Preserves audit history)"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${item.progressPercentage}%`,
                          height: '100%',
                          background:
                            item.progress === 'Completed'
                              ? '#10b981'
                              : item.progress === 'Blocked'
                              ? '#ef4444'
                              : '#2563eb',
                          borderRadius: '4px',
                        }}
                      />
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                      {item.description}
                    </p>

                    {/* Blockers Callout if present */}
                    {item.blockers && (
                      <div
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#b91c1c',
                          fontSize: '12px',
                        }}
                      >
                        <AlertTriangle size={15} className="shrink-0" />
                        <div>
                          <strong>Blocker Reported:</strong> {item.blockers}
                        </div>
                      </div>
                    )}

                    {/* Footer Info: Next Steps and Linked Target */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: '#64748b',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      {item.nextSteps ? (
                        <div>
                          <strong>Next Steps:</strong> {item.nextSteps}
                        </div>
                      ) : (
                        <div />
                      )}

                      {targetObj && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e40af' }}>
                          <Target size={13} />
                          <span>
                            Linked Target: <strong>[{targetObj.period}] {targetObj.title}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Audit Version History Snapshot if edited */}
                    {(item.versionHistory || []).length > 0 && (
                      <div style={{ marginTop: '4px', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <History size={12} className="text-muted" />
                          <strong>Audit History:</strong> Edited {item.versionHistory.length} time(s). Latest: &ldquo;{item.versionHistory[0].changeSummary}&rdquo; by {item.versionHistory[0].editedBy} on {formatDate(item.versionHistory[0].editedAt)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: TEAM UPDATES (MANAGER & COORDINATOR ONLY) */}
      {/* ============================================================== */}
      {isManagerOrCoordinator && activeTab === 'team-updates' && (
        <>
          {/* Governance Banner */}
          <div
            className="card mb-4"
            style={{
              padding: '16px 20px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} className="text-primary shrink-0" />
              <div>
                <strong style={{ fontSize: '14px', color: '#1e40af' }}>
                  {userRole === 'sales_manager' || userRole === 'admin'
                    ? 'Organizational Team Work Updates & Deliverables'
                    : 'Regional Team Work Updates (Hyderabad & Deccan)'}
                </strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>
                  {userRole === 'sales_manager' || userRole === 'admin'
                    ? 'Monitor daily deliverables across all sales employees, track milestone completion, and unblock team bottlenecks.'
                    : 'Monitor daily deliverables for supervised Sales Representatives and Junior Sales Employees in Hyderabad & Deccan.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1e40af',
                  background: '#dbeafe',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                {filteredTeamUpdates.length} update(s) in view
              </span>
            </div>
          </div>

          {/* Active Blockers Alert Box */}
          {blockedTeamUpdatesCount > 0 && (
            <div
              className="card mb-4"
              style={{
                padding: '14px 18px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertTriangle size={20} className="text-danger shrink-0" />
              <div>
                <strong style={{ fontSize: '13px', color: '#991b1b' }}>
                  Attention Required: {blockedTeamUpdatesCount} deliverable(s) are currently reported as Blocked
                </strong>
                <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                  Review the team update details below to provide administrative intervention or reassign tasks.
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div
            className="card mb-4"
            style={{
              padding: '14px 18px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* Employee Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Employee:</span>
                <select
                  className="form-select"
                  style={{ fontSize: '12px', padding: '4px 10px', minWidth: '180px' }}
                  value={selectedEmployeeFilter}
                  onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                >
                  <option value="all">All Team Employees</option>
                  {scopedEmployeeOptions.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.fullName} ({emp.jobTitle?.split('/')[0]?.trim() || emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status:</span>
                <select
                  className="form-select"
                  style={{ fontSize: '12px', padding: '4px 10px', minWidth: '130px' }}
                  value={teamStatusFilter}
                  onChange={(e) => setTeamStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '9px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search team updates..."
                style={{ width: '220px', fontSize: '12px', padding: '5px 10px 5px 28px' }}
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Team Updates Feed */}
          {filteredTeamUpdates.length === 0 ? (
            <div
              className="card"
              style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}
            >
              No team work updates match the selected filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredTeamUpdates.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: item.progress === 'Blocked' ? '#fef2f2' : '#ffffff',
                    border: item.progress === 'Blocked' ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{item.employeeName}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>({item.role || 'Sales'})</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <strong style={{ fontSize: '13px', color: '#1e293b' }}>{item.title}</strong>
                        <StatusBadge status={item.progress} size="small" />
                        {item.moduleRef && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#2563eb',
                              background: '#eff6ff',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            Ref: {item.moduleRef}
                          </span>
                        )}
                        {item.activityRef && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#166534',
                              background: '#dcfce7',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            Action Plan: {item.activityRef}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Logged on {formatDate(item.date)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                        {item.progressPercentage}%
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.45 }}>
                    {item.description}
                  </p>

                  {item.blockers && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: '#b91c1c',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>Blocker: {item.blockers}</span>
                    </div>
                  )}

                  {item.nextSteps && (
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      <strong>Next Steps:</strong> {item.nextSteps}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Global Modals */}
      <SubmitWorkUpdateModal
        isOpen={isSubmitWorkOpen}
        onClose={() => setIsSubmitWorkOpen(false)}
      />

      <EditWorkUpdateModal
        isOpen={Boolean(editingUpdate)}
        onClose={() => setEditingUpdate(null)}
        update={editingUpdate}
      />
    </div>
  );
}
