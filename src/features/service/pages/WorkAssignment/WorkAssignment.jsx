import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  UserCheck,
  Calendar,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
  Eye,
  RotateCcw,
  Wrench,
  Search,
  Filter,
  ShieldAlert,
  GripVertical,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  Star
} from 'lucide-react';
import PageContainer from '../../components/common/PageContainer';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';
import { DEMO_ENGINEERS, DEMO_EMPLOYEES } from '../../data/initialServiceData';
import CreateAssignmentModal from './components/CreateAssignmentModal';
import AssignmentDetailModal from './components/AssignmentDetailModal';
import RequestDetailModal from '../ServiceRequests/components/RequestDetailModal';
import { formatDate } from '../../utils/formatters';

export default function WorkAssignment() {
  const { roleId } = useRole();
  const { serviceRequests, assignments, schedules, reassignAssignment, rescheduleAssignment, cancelAssignment } = useSchedule();

  const isManager = roleId === 'manager';
  const isCoordinator = roleId === 'coordinator';
  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';

  // Assignment permissions: Manager has final assignment authority; Coordinator can prepare allocations.
  // Service Engineer and Employee have NO access to assignment controls.
  const canAssign = isManager || isCoordinator;

  // Modals state
  const [assigningSR, setAssigningSR] = useState(null);
  const [targetEngineerId, setTargetEngineerId] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Left Panel: Search & Filters for Unassigned Requests
  const [srSearch, setSrSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');

  // Drag & Drop State
  const [draggedSR, setDraggedSR] = useState(null);
  const [hoveredEngineerId, setHoveredEngineerId] = useState(null);

  // Right Panel: Active Sub-tab ('roster' | 'activeTable')
  const [rightPanelTab, setRightPanelTab] = useState('roster');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all');

  // 1. Unassigned Service Requests awaiting allocation
  const unassignedRequests = useMemo(() => {
    return serviceRequests.filter(
      (sr) =>
        (sr.status === 'Unassigned' ||
          sr.status === 'New' ||
          sr.status === 'Pending Review' ||
          !sr.assignedEngineerId ||
          sr.assignedEngineerName === 'Unassigned') &&
        sr.status !== 'Completed' &&
        sr.status !== 'Closed' &&
        sr.status !== 'Resolved' &&
        sr.status !== 'Cancelled'
    );
  }, [serviceRequests]);

  // Filtered Unassigned Requests for Left Panel
  const filteredUnassigned = useMemo(() => {
    return unassignedRequests.filter((r) => {
      const q = srSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.customerId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.issueDescription && r.issueDescription.toLowerCase().includes(q)) ||
        (r.productName && r.productName.toLowerCase().includes(q));

      const matchesPriority = priorityFilter === 'all' || r.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'all' || r.serviceCategory === categoryFilter;
      const matchesType = serviceTypeFilter === 'all' || (r.serviceType || 'Warranty Service') === serviceTypeFilter;

      return matchesSearch && matchesPriority && matchesCategory && matchesType;
    });
  }, [unassignedRequests, srSearch, priorityFilter, categoryFilter, serviceTypeFilter]);

  // 2. Active Field Jobs based on user role
  const scopedAssignments = useMemo(() => {
    if (isEngineer) return assignments.filter((a) => a.assignedEngineerId === 'ENG-01');
    if (isEmployee) return assignments.filter((a) => a.supportingEmployeeId === 'EMP-01');
    return assignments;
  }, [assignments, isEngineer, isEmployee]);

  // Filtered Active Assignments
  const filteredAssignments = useMemo(() => {
    return scopedAssignments.filter((a) => {
      const q = assignmentSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.id.toLowerCase().includes(q) ||
        a.serviceRequestId.toLowerCase().includes(q) ||
        a.customerId.toLowerCase().includes(q) ||
        a.customerName.toLowerCase().includes(q) ||
        a.assignedEngineerName.toLowerCase().includes(q) ||
        (a.productName && a.productName.toLowerCase().includes(q));

      const matchesStatus = assignmentStatusFilter === 'all' || a.status === assignmentStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [scopedAssignments, assignmentSearch, assignmentStatusFilter]);

  // 3. Dynamic Roster with real-time active job counts from centralized assignments
  const engineersWithLoad = useMemo(() => {
    return DEMO_ENGINEERS.map((eng) => {
      const activeJobs = assignments.filter(
        (a) => a.assignedEngineerId === eng.id && (a.status === 'Assigned' || a.status === 'In Progress')
      );
      const isOccupied = activeJobs.length >= 3;
      return {
        ...eng,
        currentActiveCount: activeJobs.length,
        status: isOccupied ? 'Occupied' : 'Available',
        activeJobs
      };
    });
  }, [assignments]);

  // Dynamic KPI Metrics
  const awaitingManagerCount = unassignedRequests.filter((r) => r.priority === 'Very High' || r.priority === 'High').length;
  const assignedJobsCount = assignments.filter((a) => a.status === 'Assigned' || a.status === 'In Progress').length;
  const availableEngineersCount = engineersWithLoad.filter((e) => e.status === 'Available').length;

  // Drag and Drop Handlers
  const handleDragStart = (e, sr) => {
    if (!canAssign) return;
    setDraggedSR(sr);
    e.dataTransfer.setData('text/plain', JSON.stringify({ srId: sr.id, customerName: sr.customerName }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedSR(null);
    setHoveredEngineerId(null);
  };

  const handleDragOver = (e, engId) => {
    if (!canAssign) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (hoveredEngineerId !== engId) {
      setHoveredEngineerId(engId);
    }
  };

  const handleDragLeave = (engId) => {
    if (hoveredEngineerId === engId) {
      setHoveredEngineerId(null);
    }
  };

  const handleDrop = (e, engineer) => {
    if (!canAssign) return;
    e.preventDefault();
    setHoveredEngineerId(null);

    const srToAssign = draggedSR || unassignedRequests.find((r) => {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed.srId === r.id;
        }
      } catch (err) {
        // fallback
      }
      return false;
    });

    if (srToAssign) {
      setTargetEngineerId(engineer.id);
      setAssigningSR(srToAssign);
    }
    setDraggedSR(null);
  };

  // Normal Assign Button Handler
  const handleOpenAssignModal = (sr, engineerId = '') => {
    setTargetEngineerId(engineerId);
    setAssigningSR(sr);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSrSearch('');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setServiceTypeFilter('all');
  };

  // Columns for Active Field Assignments Table
  const assignmentColumns = [
    {
      header: 'Assignment ID',
      key: 'id',
      width: '120px',
      render: (a) => (
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => setSelectedAssignment(a)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
        >
          {a.id}
        </button>
      )
    },
    {
      header: 'SR ID',
      key: 'serviceRequestId',
      width: '110px',
      render: (a) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569', fontSize: '12px' }}>
          {a.serviceRequestId}
        </span>
      )
    },
    {
      header: 'Customer',
      key: 'customerName',
      width: '180px',
      render: (a) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px', display: 'block' }}>
            {a.customerName}
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb' }}>
            {a.customerId}
          </span>
        </div>
      )
    },
    {
      header: 'Assigned Engineer',
      key: 'assignedEngineerName',
      width: '150px',
      render: (a) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
          {a.assignedEngineerName}
        </span>
      )
    },
    {
      header: 'Scheduled Date & Time',
      key: 'scheduledDate',
      width: '160px',
      render: (a) => (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{formatDate(a.scheduledDate)}</div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {a.startTime} – {a.expectedEndTime}
          </span>
        </div>
      )
    },
    {
      header: 'Priority',
      key: 'priority',
      width: '100px',
      align: 'center',
      render: (a) => <StatusBadge status={a.priority} size="small" />
    },
    {
      header: 'Assignment Status',
      key: 'status',
      width: '120px',
      align: 'center',
      render: (a) => <StatusBadge status={a.status} size="small" />
    },
    {
      header: 'Schedule Health',
      key: 'hasConflict',
      width: '130px',
      align: 'center',
      render: (a) =>
        a.hasConflict ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#dc2626', fontWeight: 600, background: '#fef2f2', padding: '2px 8px', borderRadius: '4px' }}>
            <AlertTriangle size={12} />
            <span>Overlap</span>
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16a34a', fontWeight: 600, background: '#f0fdf4', padding: '2px 8px', borderRadius: '4px' }}>
            <CheckCircle2 size={12} />
            <span>Optimal</span>
          </span>
        )
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '90px',
      align: 'center',
      render: (a) => (
        <button
          type="button"
          className="table-action-icon-btn"
          title="Inspect assignment & schedule details"
          onClick={() => setSelectedAssignment(a)}
        >
          <Eye size={15} />
        </button>
      )
    }
  ];

  return (
    <PageContainer>
      {/* Page Heading */}
      <PageHeader
        title="Work Assignment Board"
        description="Visual allocation workspace: Drag customer requests directly onto engineer cards to schedule visits and dispatch technicians."
      />

      {/* Role Authority Indicator */}
      {!canAssign && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '10px 14px', color: '#92400e', fontSize: '13px', marginBottom: '16px' }}>
          <ShieldAlert size={18} />
          <span><strong>Role Restriction:</strong> Assignment controls and technician dispatch are reserved for Service Managers and Coordinators. Read-only mode active.</span>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div
        className="kpi-grid-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Unassigned Requests</div>
          <div className="summary-kpi-value text-warning">{unassignedRequests.length}</div>
          <div className="summary-kpi-sub">Awaiting technician queue</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ef4444' }}>
          <div className="summary-kpi-label">High Priority Unassigned</div>
          <div className="summary-kpi-value text-danger">{awaitingManagerCount}</div>
          <div className="summary-kpi-sub">Urgent turnaround required</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Active Field Allocations</div>
          <div className="summary-kpi-value text-primary">{assignedJobsCount}</div>
          <div className="summary-kpi-sub">Assigned / In dispatch</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Available Engineers</div>
          <div className="summary-kpi-value text-success">{availableEngineersCount} / {DEMO_ENGINEERS.length}</div>
          <div className="summary-kpi-sub">Ready for new dispatch</div>
        </div>
      </div>

      {/* TWO-PANEL WORKSPACE INSPIRED BY SALES PIPELINE */}
      <div
        className="work-assignment-split-workspace"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(380px, 1.15fr) minmax(420px, 1.35fr)',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* ============================================================== */}
        {/* LEFT PANEL: DRAGGABLE UNASSIGNED CUSTOMER REQUESTS             */}
        {/* ============================================================== */}
        <div
          className="assignment-left-panel"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 280px)',
            minHeight: '620px'
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} className="text-warning" />
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  Unassigned Requests
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}
                >
                  {filteredUnassigned.length}
                </span>
              </div>
              {canAssign && (
                <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <GripVertical size={13} />
                  <span>Drag cards or click Assign</span>
                </span>
              )}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by Customer ID, Name, SR ID..."
                value={srSearch}
                onChange={(e) => setSrSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>

            {/* Quick Filters */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ fontSize: '11px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
              >
                <option value="all">All Priorities</option>
                <option value="Very High">Very High</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ fontSize: '11px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
              >
                <option value="all">All Categories</option>
                <option value="Breakdown Repair">Breakdown Repair</option>
                <option value="Preventive Maintenance">Preventive Maintenance</option>
                <option value="Inspection & Diagnostic">Inspection & Diagnostic</option>
                <option value="Installation & Commissioning">Installation & Setup</option>
              </select>

              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                style={{ fontSize: '11px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
              >
                <option value="all">All Service Types</option>
                <option value="Warranty Service">Warranty Service</option>
                <option value="AMC Service">AMC Service</option>
                <option value="Free Service">Free Service</option>
                <option value="Paid Service">Paid Service</option>
                <option value="Repeat Complaint">Repeat Complaint</option>
              </select>

              {(srSearch || priorityFilter !== 'all' || categoryFilter !== 'all' || serviceTypeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Draggable Cards Scrollable Container */}
          <div
            style={{
              padding: '12px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {filteredUnassigned.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#64748b'
                }}
              >
                <CheckCircle2 size={36} style={{ margin: '0 auto 10px', color: '#10b981', opacity: 0.8 }} />
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>All Requests Allocated</div>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>There are currently no unassigned customer requests matching your filter.</p>
              </div>
            ) : (
              filteredUnassigned.map((sr) => {
                const priorityBorder =
                  sr.priority === 'Very High'
                    ? '#ef4444'
                    : sr.priority === 'High'
                    ? '#f97316'
                    : sr.priority === 'Medium'
                    ? '#3b82f6'
                    : '#10b981';

                const isDraggingThis = draggedSR?.id === sr.id;

                return (
                  <div
                    key={sr.id}
                    draggable={canAssign}
                    onDragStart={(e) => handleDragStart(e, sr)}
                    onDragEnd={handleDragEnd}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      borderLeft: `4px solid ${priorityBorder}`,
                      padding: '12px 14px',
                      boxShadow: isDraggingThis ? '0 8px 16px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                      opacity: isDraggingThis ? 0.45 : 1,
                      cursor: canAssign ? 'grab' : 'default',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Top Row: IDs & Priority */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {canAssign && <GripVertical size={14} style={{ color: '#94a3b8' }} />}
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', fontSize: '12px' }}>
                          {sr.id}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#64748b', fontSize: '11px', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                          {sr.customerId}
                        </span>
                      </div>
                      <StatusBadge status={sr.priority} size="small" />
                    </div>

                    {/* Customer Name */}
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px', marginBottom: '4px' }}>
                      {sr.customerName}
                    </div>

                    {/* Product & Category */}
                    <div style={{ fontSize: '12px', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 500 }}>{sr.productName || 'Industrial Equipment'}</span>
                      <span style={{ color: '#94a3b8' }}>•</span>
                      <span style={{ color: '#64748b' }}>{sr.serviceCategory}</span>
                    </div>

                    {/* Preferred Date & Service Type */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                      <span>Preferred: <strong style={{ color: '#0f172a' }}>{formatDate(sr.preferredDate)}</strong></span>
                      <span style={{ color: '#2563eb', fontWeight: 500 }}>{sr.serviceType || 'Warranty Service'}</span>
                    </div>

                    {/* Issue snippet */}
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#475569',
                        lineHeight: '1.35',
                        marginBottom: '10px',
                        backgroundColor: '#f8fafc',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        maxHeight: '36px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {sr.issueDescription}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        className="table-action-icon-btn"
                        title="View Full Request Details"
                        onClick={() => setSelectedRequest(sr)}
                      >
                        <Eye size={14} />
                      </button>
                      {canAssign && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm btn-icon-text"
                          style={{ fontSize: '11px', padding: '3px 10px', height: '26px' }}
                          onClick={() => handleOpenAssignModal(sr)}
                          title="Allocate to an Engineer"
                        >
                          <UserCheck size={13} />
                          <span>Assign</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANEL: ENGINEER ROSTER WITH VISIBLE DROP ZONES           */}
        {/* ============================================================== */}
        <div
          className="assignment-right-panel"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 280px)',
            minHeight: '620px'
          }}
        >
          {/* Right Panel Header Tabs */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`tab-nav-btn ${rightPanelTab === 'roster' ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '6px 12px', height: '32px' }}
                onClick={() => setRightPanelTab('roster')}
              >
                <Users size={14} />
                <span>Engineer Roster & Drop Zone ({engineersWithLoad.length})</span>
              </button>
              <button
                type="button"
                className={`tab-nav-btn ${rightPanelTab === 'activeTable' ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '6px 12px', height: '32px' }}
                onClick={() => setRightPanelTab('activeTable')}
              >
                <Briefcase size={14} />
                <span>Active Assignments ({scopedAssignments.length})</span>
              </button>
            </div>

            {rightPanelTab === 'roster' && canAssign && (
              <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={13} />
                <span>Drag to Drop Zone</span>
              </span>
            )}
          </div>

          {/* Sub-tab A: Engineer Roster with Drop Zones */}
          {rightPanelTab === 'roster' && (
            <div
              style={{
                padding: '16px',
                overflowY: 'auto',
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '14px',
                alignContent: 'start'
              }}
            >
              {engineersWithLoad.map((eng) => {
                const isHovered = hoveredEngineerId === eng.id;
                const isOccupied = eng.status === 'Occupied';

                return (
                  <div
                    key={eng.id}
                    onDragOver={(e) => handleDragOver(e, eng.id)}
                    onDragLeave={() => handleDragLeave(eng.id)}
                    onDrop={(e) => handleDrop(e, eng)}
                    style={{
                      borderRadius: '8px',
                      border: isHovered
                        ? '2px dashed #2563eb'
                        : '1px solid #e2e8f0',
                      backgroundColor: isHovered ? '#eff6ff' : '#ffffff',
                      boxShadow: isHovered
                        ? '0 6px 16px rgba(37,99,235,0.18)'
                        : '0 1px 3px rgba(0,0,0,0.03)',
                      padding: '14px',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    {/* Header: Avatar, Name, Status Badge */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#eff6ff',
                              border: '1.5px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontWeight: 700,
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {eng.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                              {eng.name}
                            </div>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
                              {eng.id} • {eng.rating} ★
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: isOccupied ? '#fef3c7' : '#ecfdf5',
                            color: isOccupied ? '#b45309' : '#047857',
                            border: `1px solid ${isOccupied ? '#fde68a' : '#a7f3d0'}`
                          }}
                        >
                          {eng.status}
                        </span>
                      </div>

                      {/* Specialization */}
                      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px', lineHeight: 1.3 }}>
                        <strong>Focus:</strong> {eng.specialization}
                      </div>

                      {/* Contact details */}
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Phone size={11} />
                          <span>{eng.phone}</span>
                        </div>
                      </div>

                      {/* Workload stats */}
                      <div
                        style={{
                          backgroundColor: '#f8fafc',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px'
                        }}
                      >
                        <span style={{ color: '#64748b' }}>Active Workload:</span>
                        <span style={{ fontWeight: 700, color: eng.currentActiveCount > 2 ? '#b45309' : '#2563eb' }}>
                          {eng.currentActiveCount} Assigned Jobs
                        </span>
                      </div>
                    </div>

                    {/* DEDICATED VISIBLE DROP ZONE */}
                    {canAssign ? (
                      <div
                        style={{
                          border: isHovered ? '2px solid #2563eb' : '1.5px dashed #cbd5e1',
                          borderRadius: '6px',
                          backgroundColor: isHovered ? '#dbeafe' : '#f8fafc',
                          padding: '10px 8px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 600, color: isHovered ? '#1d4ed8' : '#475569' }}>
                          {isHovered ? `Release to Assign ${eng.name}` : `Drop Request Here to Assign`}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                          Opens assignment & schedule modal
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '6px' }}>
                        Active in roster
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sub-tab B: Active Assignments Table */}
          {rightPanelTab === 'activeTable' && (
            <div style={{ padding: '14px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search active assignments by ID, Customer, Engineer..."
                    value={assignmentSearch}
                    onChange={(e) => setAssignmentSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      outline: 'none'
                    }}
                  />
                </div>
                <select
                  value={assignmentStatusFilter}
                  onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                  style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <DataTable
                columns={assignmentColumns}
                data={filteredAssignments}
                keyField="id"
                minWidth="950px"
                emptyMessage="No active work allocations match your search."
                defaultPageSize={8}
              />
            </div>
          )}
        </div>
      </div>

      {/* Confirmation & Creation Modal */}
      {assigningSR && (
        <CreateAssignmentModal
          isOpen={Boolean(assigningSR)}
          onClose={() => {
            setAssigningSR(null);
            setTargetEngineerId('');
          }}
          serviceRequest={assigningSR}
          initialEngineerId={targetEngineerId}
        />
      )}

      {/* Request Inspection Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onOpenAssign={(sr) => handleOpenAssignModal(sr)}
        />
      )}

      {/* Assignment Detail Modal */}
      {selectedAssignment && (
        <AssignmentDetailModal
          isOpen={Boolean(selectedAssignment)}
          onClose={() => setSelectedAssignment(null)}
          assignment={selectedAssignment}
          onReassign={reassignAssignment}
          onReschedule={rescheduleAssignment}
          onCancel={cancelAssignment}
        />
      )}
    </PageContainer>
  );
}
