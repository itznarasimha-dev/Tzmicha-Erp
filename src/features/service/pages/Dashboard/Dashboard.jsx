import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  UserCheck,
  Wrench,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  Calendar
} from 'lucide-react';
import PageContainer from '../../components/common/PageContainer';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';
import RequestDetailModal from '../ServiceRequests/components/RequestDetailModal';

export default function Dashboard() {
  const { roleId } = useRole();
  const { serviceRequests, schedules } = useSchedule();
  const navigate = useNavigate();

  const [selectedRequest, setSelectedRequest] = useState(null);

  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';

  // Role scoped datasets
  const scopedRequests = useMemo(() => {
    if (isEngineer) return serviceRequests.filter((r) => r.assignedEngineerId === 'ENG-01');
    if (isEmployee) return serviceRequests.filter((r) => r.supportingEmployeeId === 'EMP-01');
    return serviceRequests;
  }, [serviceRequests, isEngineer, isEmployee]);

  const scopedSchedules = useMemo(() => {
    if (isEngineer) return schedules.filter((s) => s.assignedEngineerId === 'ENG-01');
    if (isEmployee) return schedules.filter((s) => s.supportingEmployeeId === 'EMP-01');
    return schedules;
  }, [schedules, isEngineer, isEmployee]);

  // 7 KPI calculations
  const totalRequests = scopedRequests.length;
  const unassignedRequests = scopedRequests.filter((r) => r.status === 'Unassigned' || r.assignedEngineerName === 'Unassigned').length;
  const assignedRequests = scopedRequests.filter((r) => r.status === 'Assigned').length;
  const inProgressRequests = scopedRequests.filter((r) => r.status === 'In Progress').length;
  const pendingRequests = scopedRequests.filter((r) => r.status === 'Pending Review' || r.status === 'New' || r.status === 'On Hold').length;
  const completedServices = scopedRequests.filter((r) => r.status === 'Completed' || r.status === 'Resolved').length;
  const overdueRequests = scopedRequests.filter((r) => r.priority === 'Very High' && r.status !== 'Completed' && r.status !== 'Resolved').length;

  // 7 KPI Cards configuration
  const kpiCards = [
    {
      id: 'total',
      label: 'Total Service Requests',
      value: totalRequests,
      subtext: 'Total logged tickets',
      icon: ClipboardList,
      color: '#2563eb',
      onClick: () => navigate('/service-requests')
    },
    {
      id: 'unassigned',
      label: 'Unassigned Requests',
      value: unassignedRequests,
      subtext: 'Awaiting allocation',
      icon: Clock,
      color: '#f59e0b',
      onClick: () => navigate('/work-assignment')
    },
    {
      id: 'assigned',
      label: 'Assigned Requests',
      value: assignedRequests,
      subtext: 'Engineers dispatched',
      icon: UserCheck,
      color: '#0284c7',
      onClick: () => navigate('/work-assignment')
    },
    {
      id: 'inprogress',
      label: 'In Progress',
      value: inProgressRequests,
      subtext: 'Field work active',
      icon: Wrench,
      color: '#8b5cf6',
      onClick: () => navigate('/service-execution')
    },
    {
      id: 'pending',
      label: 'Pending Requests',
      value: pendingRequests,
      subtext: 'Review / on hold',
      icon: Activity,
      color: '#64748b',
      onClick: () => navigate('/service-requests')
    },
    {
      id: 'completed',
      label: 'Completed Services',
      value: completedServices,
      subtext: 'Successfully resolved',
      icon: CheckCircle2,
      color: '#10b981',
      onClick: () => navigate('/service-history')
    },
    {
      id: 'overdue',
      label: 'Overdue Requests',
      value: overdueRequests,
      subtext: 'High priority SLA alerts',
      icon: AlertTriangle,
      color: '#ef4444',
      onClick: () => navigate('/service-requests')
    }
  ];

  // Today's Activities dataset
  const todayActivities = scopedSchedules.slice(0, 5);

  // Upcoming Visits dataset
  const upcomingVisits = scopedSchedules.filter((s) => s.status === 'Scheduled' || s.status === 'Postponed' || s.status === 'In Progress');

  return (
    <PageContainer>
      {/* Page Heading without redundant breadcrumbs */}
      <PageHeader
        title="Service Dashboard"
        description="Overview of service operations, technician activities and service performance."
      />

      {/* Row of 7 Compact KPI Cards */}
      <div
        className="kpi-grid-7"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}
      >
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={card.onClick}
              className="summary-kpi-card"
              style={{
                borderLeft: `3.5px solid ${card.color}`,
                cursor: 'pointer',
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderLeftWidth: '3.5px',
                borderLeftColor: card.color,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              title={`Click to view ${card.label}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    lineHeight: 1.2
                  }}
                >
                  {card.label}
                </span>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: `${card.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.color,
                    flexShrink: 0
                  }}
                >
                  <Icon size={14} />
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                {card.value}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* FIRST MAIN SECTION: Today's Service Activities */}
      <div className="table-container-card" style={{ marginBottom: '24px' }}>
        <div
          className="card-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Today's Service Activities
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Scheduled field visits and maintenance activities for today.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/my-scheduled')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <span>View Schedule</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table" style={{ minWidth: '1050px' }}>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Time</th>
                <th style={{ width: '100px' }}>Priority</th>
                <th style={{ width: '110px' }}>Customer ID</th>
                <th>Customer Name / Business Name</th>
                <th style={{ width: '120px' }}>Service Request ID</th>
                <th>Product / Equipment</th>
                <th>Assigned Engineer</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {todayActivities.length > 0 ? (
                todayActivities.map((act) => (
                  <tr key={act.id}>
                    <td style={{ fontWeight: 600, color: '#2563eb', fontSize: '12px' }}>
                      {act.startTime}
                    </td>
                    <td>
                      <StatusBadge status={act.priority} size="small" />
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: '12px' }}>
                        {act.customerId}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                        {act.customerName}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569', fontSize: '12px' }}>
                        {act.serviceRequestId}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#334155' }}>
                      {act.equipmentModel}
                    </td>
                    <td style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>
                      {act.assignedEngineerName}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge status={act.status} size="small" />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="table-action-icon-btn"
                        title="View complete service request details"
                        onClick={() => {
                          const req = serviceRequests.find((r) => r.id === act.serviceRequestId);
                          if (req) setSelectedRequest(req);
                        }}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No service activities scheduled for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECOND MAIN SECTION: Upcoming Visits (Below Today's Activities) */}
      <div className="table-container-card">
        <div
          className="card-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Upcoming Visits
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Scheduled technician visits for upcoming dates.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <Calendar size={15} className="text-primary" />
            <span>{upcomingVisits.length} Scheduled Visits</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table" style={{ minWidth: '1050px' }}>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Scheduled Date</th>
                <th style={{ width: '90px' }}>Time</th>
                <th>Customer Name</th>
                <th style={{ width: '110px' }}>Customer ID</th>
                <th style={{ width: '120px' }}>Service Request ID</th>
                <th>Product</th>
                <th>Assigned Engineer</th>
                <th style={{ width: '100px' }}>Priority</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingVisits.length > 0 ? (
                upcomingVisits.map((visit) => (
                  <tr key={visit.id}>
                    <td style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                      {visit.scheduledDate}
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>
                      {visit.startTime}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                        {visit.customerName}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: '12px' }}>
                        {visit.customerId}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569', fontSize: '12px' }}>
                        {visit.serviceRequestId}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#334155' }}>
                      {visit.equipmentModel}
                    </td>
                    <td style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>
                      {visit.assignedEngineerName}
                    </td>
                    <td>
                      <StatusBadge status={visit.priority} size="small" />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge status={visit.status} size="small" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No upcoming technician visits found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          isOpen={Boolean(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
        />
      )}
    </PageContainer>
  );
}
