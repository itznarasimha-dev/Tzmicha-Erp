import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Eye,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Calendar,
  FileText,
  Briefcase,
  Users,
  Wrench,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import PageContainer from '../../components/common/PageContainer';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';
import NewRequestModal from './components/NewRequestModal';
import RequestDetailModal from './components/RequestDetailModal';
import ScheduleRequestModal from './components/ScheduleRequestModal';
import CreateAssignmentModal from '../WorkAssignment/components/CreateAssignmentModal';
import { formatDate } from '../../utils/formatters';

export default function ServiceRequests() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { roleId } = useRole();
  const { serviceRequests } = useSchedule();

  const isManager = roleId === 'manager';
  const isCoordinator = roleId === 'coordinator';
  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';
  const canAssign = isManager || isCoordinator;
  const canCreateRequest = isManager || isCoordinator;

  // 3 Primary Sections in EXACT ORDER:
  // 1. Unassigned Requests
  // 2. Scheduled Requests
  // 3. Completed Requests
  const tabParam = searchParams.get('tab');
  const activeTab = (tabParam === 'scheduled' || tabParam === 'completed') ? tabParam : 'unassigned';

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab });
    setSearch('');
    setFilterValues({ priority: 'all', serviceType: 'all', category: 'all', status: 'all' });
  };

  // Search and filter state
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    priority: 'all',
    serviceType: 'all',
    category: 'all',
    status: 'all'
  });

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [assigningRequest, setAssigningRequest] = useState(null);
  const [schedulingRequest, setSchedulingRequest] = useState(null);

  // Common Filter Definitions
  const unassignedFilters = [
    {
      key: 'priority',
      label: 'Priority',
      options: [
        { value: 'Very High', label: 'Very High' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' }
      ]
    },
    {
      key: 'serviceType',
      label: 'Service Type / Coverage',
      options: [
        { value: 'Warranty Service', label: 'Warranty Service' },
        { value: 'AMC Service', label: 'AMC Service' },
        { value: 'Free Service', label: 'Free Service' },
        { value: 'Paid Service', label: 'Paid Service' },
        { value: 'Repeat Complaint', label: 'Repeat Complaint' }
      ]
    },
    {
      key: 'category',
      label: 'Service Category',
      options: [
        { value: 'Breakdown Repair', label: 'Breakdown Repair' },
        { value: 'Preventive Maintenance', label: 'Preventive Maintenance' },
        { value: 'Inspection & Diagnostic', label: 'Inspection & Diagnostic' },
        { value: 'Installation & Commissioning', label: 'Installation & Setup' }
      ]
    },
    {
      key: 'status',
      label: 'Intake Status',
      options: [
        { value: 'New', label: 'New' },
        { value: 'Pending Review', label: 'Pending Review' },
        { value: 'Unassigned', label: 'Unassigned' }
      ]
    }
  ];

  const scheduledFilters = [
    {
      key: 'priority',
      label: 'Priority',
      options: [
        { value: 'Very High', label: 'Very High' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' }
      ]
    },
    {
      key: 'category',
      label: 'Service Category',
      options: [
        { value: 'Breakdown Repair', label: 'Breakdown Repair' },
        { value: 'Preventive Maintenance', label: 'Preventive Maintenance' },
        { value: 'Inspection & Diagnostic', label: 'Inspection & Diagnostic' },
        { value: 'Installation & Commissioning', label: 'Installation & Setup' }
      ]
    },
    {
      key: 'status',
      label: 'Schedule Status',
      options: [
        { value: 'Assigned', label: 'Assigned' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'On Hold', label: 'On Hold' }
      ]
    }
  ];

  const completedFilters = [
    {
      key: 'category',
      label: 'Service Category',
      options: [
        { value: 'Breakdown Repair', label: 'Breakdown Repair' },
        { value: 'Preventive Maintenance', label: 'Preventive Maintenance' },
        { value: 'Inspection & Diagnostic', label: 'Inspection & Diagnostic' },
        { value: 'Installation & Commissioning', label: 'Installation & Setup' }
      ]
    },
    {
      key: 'status',
      label: 'Final Status',
      options: [
        { value: 'Completed', label: 'Completed' },
        { value: 'Resolved', label: 'Resolved' },
        { value: 'Closed', label: 'Closed' }
      ]
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilterValues({ priority: 'all', serviceType: 'all', category: 'all', status: 'all' });
  };

  // 1. Natural Lifecycle Partitioning
  // Section 1: Unassigned Requests (Awaiting technician allocation)
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

  // Section 2: Scheduled Requests (Assigned to technician and actively planned or in progress)
  const scheduledRequests = useMemo(() => {
    return serviceRequests.filter(
      (sr) =>
        (sr.status === 'Assigned' || sr.status === 'In Progress' || sr.status === 'On Hold') &&
        sr.assignedEngineerId &&
        sr.assignedEngineerId !== 'Unassigned' &&
        sr.assignedEngineerName !== 'Unassigned'
    );
  }, [serviceRequests]);

  // Section 3: Completed Requests (Finished service execution and closed tickets)
  const completedRequests = useMemo(() => {
    return serviceRequests.filter(
      (sr) => sr.status === 'Completed' || sr.status === 'Closed' || sr.status === 'Resolved'
    );
  }, [serviceRequests]);

  // Filtered Unassigned List
  const filteredUnassigned = useMemo(() => {
    return unassignedRequests.filter((req) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        req.id.toLowerCase().includes(q) ||
        req.customerId.toLowerCase().includes(q) ||
        req.customerName.toLowerCase().includes(q) ||
        (req.issueDescription && req.issueDescription.toLowerCase().includes(q)) ||
        (req.contactNumber && req.contactNumber.toLowerCase().includes(q));

      const matchesPriority =
        filterValues.priority === 'all' || req.priority === filterValues.priority;

      const matchesType =
        filterValues.serviceType === 'all' ||
        (req.serviceType || 'Warranty Service') === filterValues.serviceType;

      const matchesCategory =
        filterValues.category === 'all' || req.serviceCategory === filterValues.category;

      const matchesStatus =
        filterValues.status === 'all' || req.status === filterValues.status;

      return matchesSearch && matchesPriority && matchesType && matchesCategory && matchesStatus;
    });
  }, [unassignedRequests, search, filterValues]);

  // Filtered Scheduled List
  const filteredScheduled = useMemo(() => {
    return scheduledRequests.filter((req) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        req.id.toLowerCase().includes(q) ||
        req.customerId.toLowerCase().includes(q) ||
        req.customerName.toLowerCase().includes(q) ||
        (req.assignedEngineerName && req.assignedEngineerName.toLowerCase().includes(q)) ||
        (req.productName && req.productName.toLowerCase().includes(q));

      const matchesPriority =
        filterValues.priority === 'all' || req.priority === filterValues.priority;

      const matchesCategory =
        filterValues.category === 'all' || req.serviceCategory === filterValues.category;

      const matchesStatus =
        filterValues.status === 'all' || req.status === filterValues.status;

      return matchesSearch && matchesPriority && matchesCategory && matchesStatus;
    });
  }, [scheduledRequests, search, filterValues]);

  // Filtered Completed List
  const filteredCompleted = useMemo(() => {
    return completedRequests.filter((req) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        req.id.toLowerCase().includes(q) ||
        req.customerId.toLowerCase().includes(q) ||
        req.customerName.toLowerCase().includes(q) ||
        (req.assignedEngineerName && req.assignedEngineerName.toLowerCase().includes(q)) ||
        (req.productName && req.productName.toLowerCase().includes(q)) ||
        (req.resolutionSummary && req.resolutionSummary.toLowerCase().includes(q));

      const matchesCategory =
        filterValues.category === 'all' || req.serviceCategory === filterValues.category;

      const matchesStatus =
        filterValues.status === 'all' || req.status === filterValues.status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [completedRequests, search, filterValues]);

  // TAB 1 COLUMNS: Unassigned Requests (Exact 12 columns)
  const unassignedColumns = [
    {
      header: 'Priority',
      key: 'priority',
      width: '100px',
      align: 'center',
      render: (row) => <StatusBadge status={row.priority} size="small" />
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '115px',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: '12px' }}>
          {row.customerId}
        </span>
      )
    },
    {
      header: 'Service Request ID',
      key: 'id',
      width: '135px',
      render: (row) => (
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => setSelectedRequest(row)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '12px',
            textAlign: 'left'
          }}
          title="Click to view full ticket details"
        >
          {row.id}
        </button>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      width: '190px',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px', display: 'block' }}>
            {row.customerName}
          </span>
          {row.contactPerson && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {row.contactPerson}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Contact Number',
      key: 'contactNumber',
      width: '140px',
      render: (row) => (
        <span style={{ fontSize: '12px', color: '#334155', fontFamily: 'monospace' }}>
          {row.contactNumber}
        </span>
      )
    },
    {
      header: 'Service Type / Coverage',
      key: 'serviceType',
      width: '170px',
      render: (row) => {
        const type = row.serviceType || 'Warranty Service';
        const isRepeat = row.isRepeatComplaint || type === 'Repeat Complaint';
        return (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 600,
              backgroundColor: isRepeat ? '#fef3c7' : '#eff6ff',
              color: isRepeat ? '#b45309' : '#1d4ed8',
              border: `1px solid ${isRepeat ? '#fde68a' : '#bfdbfe'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isRepeat && <RotateCcw size={10} />}
            <span>{isRepeat ? 'Repeat Complaint' : type}</span>
          </span>
        );
      }
    },
    {
      header: 'Service Category',
      key: 'serviceCategory',
      width: '160px',
      render: (row) => (
        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
          {row.serviceCategory}
        </span>
      )
    },
    {
      header: 'Request Date',
      key: 'requestDate',
      width: '110px',
      align: 'center',
      render: (row) => <span style={{ fontSize: '12px' }}>{formatDate(row.requestDate)}</span>
    },
    {
      header: 'Preferred Service Date',
      key: 'preferredDate',
      width: '130px',
      align: 'center',
      render: (row) => <span style={{ fontSize: '12px' }}>{formatDate(row.preferredDate)}</span>
    },
    {
      header: 'Issue Description',
      key: 'issueDescription',
      width: '240px',
      wrap: true,
      render: (row) => (
        <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
          {row.issueDescription}
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      width: '125px',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} size="small" />
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '90px',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          <button
            type="button"
            className="table-action-icon-btn"
            title="View Full Ticket Details"
            onClick={() => setSelectedRequest(row)}
          >
            <Eye size={15} />
          </button>
          {canAssign && (
            <button
              type="button"
              className="table-action-icon-btn text-primary"
              title="Assign Engineer"
              onClick={() => setAssigningRequest(row)}
            >
              <UserCheck size={14} />
            </button>
          )}
        </div>
      )
    }
  ];

  // TAB 2 COLUMNS: Scheduled Requests (Exact 11 columns)
  const scheduledColumns = [
    {
      header: 'Priority',
      key: 'priority',
      width: '100px',
      align: 'center',
      render: (row) => <StatusBadge status={row.priority} size="small" />
    },
    {
      header: 'Assigned Engineer',
      key: 'assignedEngineerName',
      width: '170px',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '12px', display: 'block' }}>
            {row.assignedEngineerName || 'Assigned Engineer'}
          </span>
          {row.assignedEngineerId && (
            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
              {row.assignedEngineerId}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Scheduled Date',
      key: 'scheduledDate',
      width: '120px',
      align: 'center',
      render: (row) => (
        <span style={{ fontSize: '12px', fontWeight: 500 }}>
          {formatDate(row.scheduledDate || row.preferredDate)}
        </span>
      )
    },
    {
      header: 'Scheduled Time',
      key: 'scheduledTime',
      width: '130px',
      align: 'center',
      render: (row) => (
        <span style={{ fontSize: '11px', color: '#475569' }}>
          {row.scheduledTime || row.timeWindow || '09:00 AM - 12:00 PM'}
        </span>
      )
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '115px',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: '12px' }}>
          {row.customerId}
        </span>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      width: '190px',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
          {row.customerName}
        </span>
      )
    },
    {
      header: 'Service Request ID',
      key: 'id',
      width: '135px',
      render: (row) => (
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => setSelectedRequest(row)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
        >
          {row.id}
        </button>
      )
    },
    {
      header: 'Product / Equipment',
      key: 'productName',
      width: '180px',
      render: (row) => (
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>
          {row.productName || 'Equipment Unit'}
        </span>
      )
    },
    {
      header: 'Service Category',
      key: 'serviceCategory',
      width: '150px',
      render: (row) => (
        <span style={{ fontSize: '12px', color: '#334155' }}>
          {row.serviceCategory}
        </span>
      )
    },
    {
      header: 'Schedule Status',
      key: 'status',
      width: '125px',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} size="small" />
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '80px',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            type="button"
            className="table-action-icon-btn"
            title="View Scheduled Ticket Details"
            onClick={() => setSelectedRequest(row)}
          >
            <Eye size={15} />
          </button>
        </div>
      )
    }
  ];

  // TAB 3 COLUMNS: Completed Requests (Exact 9 columns)
  const completedColumns = [
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '115px',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: '12px' }}>
          {row.customerId}
        </span>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      width: '190px',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
          {row.customerName}
        </span>
      )
    },
    {
      header: 'Service Request ID',
      key: 'id',
      width: '135px',
      render: (row) => (
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => setSelectedRequest(row)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
        >
          {row.id}
        </button>
      )
    },
    {
      header: 'Product / Equipment',
      key: 'productName',
      width: '180px',
      render: (row) => (
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>
          {row.productName || 'Equipment Unit'}
        </span>
      )
    },
    {
      header: 'Assigned Engineer',
      key: 'assignedEngineerName',
      width: '160px',
      render: (row) => (
        <span style={{ fontWeight: 500, color: '#334155', fontSize: '12px' }}>
          {row.assignedEngineerName || 'Field Service Team'}
        </span>
      )
    },
    {
      header: 'Completion Date',
      key: 'completedDate',
      width: '125px',
      align: 'center',
      render: (row) => (
        <span style={{ fontSize: '12px' }}>
          {formatDate(row.completedDate || row.updatedAt || row.preferredDate)}
        </span>
      )
    },
    {
      header: 'Resolution Summary',
      key: 'resolutionSummary',
      width: '260px',
      wrap: true,
      render: (row) => (
        <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
          {row.resolutionSummary || row.resolutionNotes || row.issueDescription || 'Service successfully performed and verified.'}
        </div>
      )
    },
    {
      header: 'Final Status',
      key: 'status',
      width: '125px',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} size="small" />
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '80px',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            type="button"
            className="table-action-icon-btn"
            title="View Completed Ticket Record"
            onClick={() => setSelectedRequest(row)}
          >
            <Eye size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Service Requests"
        description="Comprehensive service intake, lifecycle tracking from unassigned queue to active dispatch and completion."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            {canAssign && (
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon-text"
                onClick={() => navigate('/service-requests/work-assignment')}
              >
                <Briefcase size={14} />
                <span>Work Assignment Board</span>
              </button>
            )}
            {canCreateRequest && (
              <button
                type="button"
                className="btn btn-primary btn-sm btn-icon-text"
                onClick={() => setIsNewModalOpen(true)}
              >
                <Plus size={14} />
                <span>Create Service Request</span>
              </button>
            )}
          </div>
        }
      />

      {/* 4 Summary KPI Cards */}
      <div
        className="kpi-grid-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Requests</div>
          <div className="summary-kpi-value">{serviceRequests.length}</div>
          <div className="summary-kpi-sub">All registered service tickets</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Unassigned Requests</div>
          <div className="summary-kpi-value text-warning">{unassignedRequests.length}</div>
          <div className="summary-kpi-sub">Awaiting technician allocation</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #0284c7' }}>
          <div className="summary-kpi-label">Scheduled / In Progress</div>
          <div className="summary-kpi-value text-primary">{scheduledRequests.length}</div>
          <div className="summary-kpi-sub">Allocated to field engineers</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Completed Requests</div>
          <div className="summary-kpi-value text-success">{completedRequests.length}</div>
          <div className="summary-kpi-sub">Resolved and signed-off</div>
        </div>
      </div>

      {/* 3 Main Sections in EXACT Order */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'unassigned' ? 'active' : ''}`}
          onClick={() => handleTabChange('unassigned')}
        >
          <Clock size={16} />
          <span>1. Unassigned Requests ({unassignedRequests.length})</span>
        </button>

        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => handleTabChange('scheduled')}
        >
          <Calendar size={16} />
          <span>2. Scheduled Requests ({scheduledRequests.length})</span>
        </button>

        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => handleTabChange('completed')}
        >
          <CheckCircle2 size={16} />
          <span>3. Completed Requests ({completedRequests.length})</span>
        </button>
      </div>

      {/* TAB 1: Unassigned Requests (FIRST!) */}
      {activeTab === 'unassigned' && (
        <>
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search unassigned requests by Ticket ID, Customer ID, Name, or Symptom..."
            filters={unassignedFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          <DataTable
            columns={unassignedColumns}
            data={filteredUnassigned}
            keyField="id"
            minWidth="1680px"
            emptyMessage="No unassigned service requests found."
            defaultPageSize={10}
          />
        </>
      )}

      {/* TAB 2: Scheduled Requests (SECOND!) */}
      {activeTab === 'scheduled' && (
        <>
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search scheduled requests by Ticket ID, Customer ID, Engineer, or Product..."
            filters={scheduledFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          <DataTable
            columns={scheduledColumns}
            data={filteredScheduled}
            keyField="id"
            minWidth="1450px"
            emptyMessage="No scheduled service requests found."
            defaultPageSize={10}
          />
        </>
      )}

      {/* TAB 3: Completed Requests (THIRD!) */}
      {activeTab === 'completed' && (
        <>
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search completed requests by Ticket ID, Customer ID, Engineer, or Product..."
            filters={completedFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          <DataTable
            columns={completedColumns}
            data={filteredCompleted}
            keyField="id"
            minWidth="1380px"
            emptyMessage="No completed service requests found."
            defaultPageSize={10}
          />
        </>
      )}

      {/* Modals */}
      {isNewModalOpen && (
        <NewRequestModal onClose={() => setIsNewModalOpen(false)} />
      )}

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onOpenAssign={(req) => setAssigningRequest(req)}
          onSchedule={(req) => setSchedulingRequest(req)}
        />
      )}

      {assigningRequest && (
        <CreateAssignmentModal
          isOpen={Boolean(assigningRequest)}
          onClose={() => setAssigningRequest(null)}
          serviceRequest={assigningRequest}
        />
      )}

      {schedulingRequest && (
        <ScheduleRequestModal
          request={schedulingRequest}
          onClose={() => setSchedulingRequest(null)}
        />
      )}
    </PageContainer>
  );
}
