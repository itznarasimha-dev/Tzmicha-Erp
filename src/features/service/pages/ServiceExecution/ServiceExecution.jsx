import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  User,
  Building,
  Plus,
  Trash2,
  CheckSquare,
  Search,
  Eye
} from 'lucide-react';
import PageContainer from '../../components/common/PageContainer';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import MetricCard from '../../components/common/MetricCard';
import Modal from '../../components/common/Modal';
import { useRole } from '../../context/RoleContext';
import { useSchedule } from '../../context/ScheduleContext';
import { formatINR } from '../../utils/formatters';

export default function ServiceExecution() {
  const { roleId, currentRole } = useRole();
  const { serviceRequests, spareParts, recordServiceExecution, updateServiceRequestStatus } = useSchedule();

  const isEngineer = roleId === 'engineer';
  const isEmployee = roleId === 'employee';

  // Scoped execution tasks
  const executionTasks = useMemo(() => {
    return serviceRequests.filter((r) => {
      if (isEngineer && r.assignedEngineerId !== 'ENG-01') return false;
      if (isEmployee && r.supportingEmployeeId !== 'EMP-01') return false;
      return r.status === 'Assigned' || r.status === 'In Progress' || r.status === 'On Hold' || r.status === 'Resolved';
    });
  }, [serviceRequests, isEngineer, isEmployee]);

  // Metrics
  const inProgressCount = executionTasks.filter((t) => t.status === 'In Progress').length;
  const onHoldCount = executionTasks.filter((t) => t.status === 'On Hold').length;
  const resolvedCount = executionTasks.filter((t) => t.status === 'Resolved').length;

  // Active modal state
  const [activeTask, setActiveTask] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [holdTask, setHoldTask] = useState(null);
  const [holdReason, setHoldReason] = useState('Awaiting replacement spare parts delivery from central warehouse.');
  const [diagnosis, setDiagnosis] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [labourHours, setLabourHours] = useState('3.5');
  const [serviceStatus, setServiceStatus] = useState('Resolved');
  const [remarks, setRemarks] = useState('');
  const [selectedParts, setSelectedParts] = useState([]);
  const [feedback, setFeedback] = useState('');

  // Execution permission rule: Only the assigned technician (or Manager if personally assigned) can execute actions
  const canExecute = (task) => {
    if (isEngineer) return task.assignedEngineerId === 'ENG-01';
    if (isEmployee) return task.supportingEmployeeId === 'EMP-01';
    if (roleId === 'manager') return task.assignedEngineerId === 'ENG-04';
    return false;
  };

  const handleConfirmHold = (e) => {
    e.preventDefault();
    if (!holdTask) return;
    const nowTime = new Date().toLocaleTimeString();
    updateServiceRequestStatus(holdTask.id, 'On Hold', `Put on hold: ${holdReason} [${nowTime}]`);
    setFeedback(`Task ${holdTask.id} moved to On Hold. Reason recorded.`);
    setHoldTask(null);
    setTimeout(() => setFeedback(''), 2000);
  };

  const handleResumeExecution = (task) => {
    const nowTime = new Date().toLocaleTimeString();
    updateServiceRequestStatus(task.id, 'In Progress', `Resumed execution at ${nowTime} by ${currentRole.profile.name}`);
    setFeedback(`Task ${task.id} resumed! Status changed back to In Progress.`);
    setTimeout(() => setFeedback(''), 2000);
  };

  const handleOpenExecutionModal = (task, viewOnly = false) => {
    setActiveTask(task);
    setIsViewOnly(viewOnly);
    setDiagnosis(`Initial telemetry and pressure inspection conducted on ${task.productName}.`);
    setRootCause('High-cycle seal deterioration causing internal bypass pressure drop.');
    setWorkPerformed('Disassembled valve chamber, flushed particulate contamination, installed new dual Viton seal kit, hydro-tested to 240 bar.');
    setLabourHours('3.5');
    setServiceStatus('Resolved');
    setRemarks('Customer test run confirmed zero leakage.');
    setSelectedParts([
      { partId: 'SP-101', name: 'High-Pressure Dual Viton Seal Ring (25mm)', quantity: 1, unitPrice: 650 }
    ]);
  };

  const handleAddPart = (partId) => {
    const part = spareParts.find((p) => p.id === partId);
    if (!part) return;
    if (selectedParts.some((p) => p.partId === partId)) return;
    setSelectedParts([...selectedParts, { partId: part.id, name: part.name, quantity: 1, unitPrice: part.unitPrice }]);
  };

  const handleRemovePart = (partId) => {
    setSelectedParts(selectedParts.filter((p) => p.partId !== partId));
  };

  const handlePartQtyChange = (partId, qty) => {
    setSelectedParts(
      selectedParts.map((p) => (p.partId === partId ? { ...p, quantity: Math.max(1, Number(qty) || 1) } : p))
    );
  };

  const handleSubmitExecution = (e) => {
    e.preventDefault();
    if (!activeTask) return;

    recordServiceExecution({
      serviceRequestId: activeTask.id,
      scheduleId: `SCH-${activeTask.id.slice(-3)}`,
      diagnosis,
      workPerformed: `${workPerformed} | Root Cause: ${rootCause}`,
      partsUsed: selectedParts,
      labourHours,
      serviceStatus,
      remarks
    });

    setFeedback(`Service execution recorded! Status updated to ${serviceStatus}.`);
    setTimeout(() => {
      setFeedback('');
      setActiveTask(null);
    }, 1200);
  };

  const handleQuickStatus = (task, newStatus, reason) => {
    updateServiceRequestStatus(task.id, newStatus, reason);
    setFeedback(`Task ${task.id} updated to ${newStatus}.`);
    setTimeout(() => setFeedback(''), 1500);
  };

  const columns = [
    {
      header: 'SR ID',
      key: 'id',
      width: '110px',
      render: (r) => <span className="customer-id-chip" style={{ fontSize: '0.75rem' }}>{r.id}</span>
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '120px',
      render: (r) => (
        <div>
          <span className="customer-id-chip" style={{ fontSize: '0.72rem' }}>{r.customerId}</span>
        </div>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>{r.customerName}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.serviceLocation.split(',')[0]}</div>
        </div>
      )
    },
    {
      header: 'Product / Asset',
      key: 'productName',
      render: (r) => (
        <div>
          <div style={{ fontSize: '0.825rem', fontWeight: 500 }}>{r.productName}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SN: {r.serialNumber}</div>
        </div>
      )
    },
    {
      header: 'Assigned Engineer',
      key: 'assignedEngineerName',
      render: (r) => <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--primary)' }}>{r.assignedEngineerName}</span>
    },
    {
      header: 'Priority',
      key: 'priority',
      width: '90px',
      render: (r) => <StatusBadge status={r.priority} size="small" />
    },
    {
      header: 'Current Status',
      key: 'status',
      width: '120px',
      render: (r) => <StatusBadge status={r.status} size="small" />
    },
    {
      header: 'Execution Actions',
      key: 'actions',
      width: '280px',
      align: 'center',
      sortable: false,
      render: (r) => {
        const userCanExecute = canExecute(r);

        if (!userCanExecute) {
          return (
            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenExecutionModal(r, true)}
                title="Audit View: Inspect technical diagnosis and work record"
                style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Eye size={12} />
                <span>View Log (Audit)</span>
              </button>
            </div>
          );
        }

        return (
          <div style={{ display: 'inline-flex', gap: '6px' }}>
            {/* 1. Start Service (Assigned -> In Progress) */}
            {r.status === 'Assigned' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleQuickStatus(r, 'In Progress', `Field service work commenced at ${new Date().toLocaleTimeString()}`)}
                title="Start on-site service"
                style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Play size={12} />
                <span>Start Execution</span>
              </button>
            )}

            {/* 2. Put On Hold (In Progress -> On Hold) */}
            {r.status === 'In Progress' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setHoldTask(r)}
                title="Put on hold (waiting for parts/clearance)"
                style={{ padding: '4px 8px', fontSize: '11px', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Pause size={12} />
                <span>Put On Hold</span>
              </button>
            )}

            {/* 3. Resume Execution (On Hold -> In Progress) */}
            {r.status === 'On Hold' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleResumeExecution(r)}
                title="Resume on-site service without duplicating records"
                style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Play size={12} />
                <span>Resume Execution</span>
              </button>
            )}

            {/* 4. Complete / Resolve Work (opens diagnosis & sign-off modal) */}
            {r.status === 'In Progress' && (
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => handleOpenExecutionModal(r, false)}
                title="Complete work diagnosis, parts consumed & customer sign-off"
                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <CheckCircle size={12} />
                <span>Resolve</span>
              </button>
            )}

            {/* Inspect / Record Notes for other statuses */}
            {(r.status === 'Resolved' || r.status === 'Completed' || r.status === 'On Hold') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenExecutionModal(r, false)}
                title="Inspect or update technical diagnosis and work record"
                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Wrench size={12} />
                <span>{r.status === 'Resolved' ? 'Verified' : 'Work Log'}</span>
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Service Execution"
        description={`On-site work recording, technical diagnosis, spare parts consumption, and job completion verification (${currentRole.label} View).`}
      />

      {/* Feedback Alert */}
      {feedback && (
        <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Cards (Section 12) */}
      <section className="metric-cards-grid" aria-label="Execution Metrics" style={{ marginBottom: '24px' }}>
        <MetricCard
          title="Active Field Tasks"
          value={executionTasks.length}
          subtext="Assigned work orders"
          icon={Wrench}
          variant="default"
        />

        <MetricCard
          title="In Progress On-Site"
          value={inProgressCount}
          subtext="Under active service"
          icon={Clock}
          variant="primary"
        />

        <MetricCard
          title="On Hold (Awaiting Parts)"
          value={onHoldCount}
          subtext="Suspended pending parts"
          icon={AlertTriangle}
          variant={onHoldCount > 0 ? 'warning' : 'default'}
        />

        <MetricCard
          title="Resolved & Verified"
          value={resolvedCount}
          subtext="Ready for billing / signoff"
          icon={CheckCircle}
          variant="success"
        />
      </section>

      {/* Tasks Table */}
      <div className="table-container-card">
        <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Assigned Field Execution Tasks
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Select a task to record technical findings, log used replacement parts, or complete resolution
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
            {executionTasks.length} Tasks in Pipeline
          </span>
        </div>

        <DataTable
          columns={columns}
          data={executionTasks}
          keyField="id"
          minWidth="1350px"
          pageSize={10}
          emptyMessage="No service tasks currently pending execution"
          emptySubtext="New assignments will appear here once allocated."
        />
      </div>

      {/* Record Service Execution Modal (Section 12) */}
      {activeTask && (
        <Modal
          isOpen={Boolean(activeTask)}
          onClose={() => setActiveTask(null)}
          size="large"
          title={isViewOnly ? `Audit Execution Record • ${activeTask.id}` : `Record Field Service Execution • ${activeTask.id}`}
          subtitle={`Customer: ${activeTask.customerName} (${activeTask.customerId}) | Product: ${activeTask.productName}`}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTask(null)}>
                {isViewOnly ? 'Close' : 'Cancel'}
              </button>
              {!isViewOnly && (
                <button type="button" className="btn btn-primary" onClick={handleSubmitExecution} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckSquare size={16} />
                  <span>Save Execution & Update Inventory</span>
                </button>
              )}
            </div>
          }
        >
          <form onSubmit={handleSubmitExecution}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isViewOnly && (
                <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={14} className="text-primary" />
                  <span><strong>Audit View Only:</strong> Assigned Technician: <strong>{activeTask.assignedEngineerName}</strong>. Service actions can only be submitted by the assigned technician.</span>
                </div>
              )}

              {/* Task Details Summary */}
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.825rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  <div><strong>Customer:</strong> {activeTask.customerName}</div>
                  <div><strong>Contact:</strong> {activeTask.contactPerson} ({activeTask.contactNumber})</div>
                  <div><strong>Invoice Link:</strong> {activeTask.invoiceNo || 'INV-2026-090'}</div>
                  <div><strong>Serial:</strong> {activeTask.serialNumber}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>Reported Issue:</strong> {activeTask.issueDescription}</div>
                </div>
              </div>

              {/* Diagnosis & Root Cause (Section 12) */}
              <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Initial Diagnostic Findings *</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    disabled={isViewOnly}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Root Cause Identified *</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    disabled={isViewOnly}
                    required
                  />
                </div>
              </div>

              {/* Work Performed (Section 12) */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Detailed Work & Repair Action Performed *</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  placeholder="Detail testing procedures, component replacement, torque checks, and operational verification..."
                  disabled={isViewOnly}
                  required
                />
              </div>

              {/* Spare Parts Consumed (Section 12 & 13) */}
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wrench size={15} color="var(--primary)" />
                    Spare Parts Consumed
                  </strong>
                  {!isViewOnly && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <select
                        className="filter-select"
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddPart(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">+ Add Consumed Spare Part</option>
                        {spareParts.filter((sp) => sp.availableQty > 0).map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.id} — {sp.name} (Avail: {sp.availableQty}) • {formatINR(sp.unitPrice)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {selectedParts.length > 0 ? (
                  <table className="enterprise-table" style={{ fontSize: '0.8rem', backgroundColor: '#ffffff' }}>
                    <thead>
                      <tr>
                        <th>Part ID</th>
                        <th>Part Name</th>
                        <th style={{ width: '80px' }}>Quantity</th>
                        <th style={{ width: '100px' }}>Unit Price</th>
                        <th style={{ width: '100px' }}>Subtotal</th>
                        {!isViewOnly && <th style={{ width: '50px' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedParts.map((p) => (
                        <tr key={p.partId}>
                          <td><span className="customer-id-chip" style={{ fontSize: '0.72rem' }}>{p.partId}</span></td>
                          <td>{p.name}</td>
                          <td>
                            {isViewOnly ? (
                              <span>{p.quantity}</span>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                value={p.quantity}
                                onChange={(e) => handlePartQtyChange(p.partId, e.target.value)}
                                className="form-input"
                                style={{ width: '60px', padding: '2px 6px', fontSize: '0.8rem' }}
                              />
                            )}
                          </td>
                          <td>{formatINR(p.unitPrice)}</td>
                          <td><strong>{formatINR(p.unitPrice * p.quantity)}</strong></td>
                          {!isViewOnly && (
                            <td>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleRemovePart(p.partId)}
                                style={{ padding: '2px 6px', color: 'var(--danger)' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No spare parts billed or consumed for this service activity.
                  </span>
                )}
              </div>

              {/* Labour, Status, and Remarks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Labour Hours Spent</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={labourHours}
                    onChange={(e) => setLabourHours(e.target.value)}
                    disabled={isViewOnly}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Service Outcome Status *</label>
                  <select
                    className="form-select"
                    value={serviceStatus}
                    onChange={(e) => setServiceStatus(e.target.value)}
                    disabled={isViewOnly}
                  >
                    <option value="Resolved">Resolved (Work Finished)</option>
                    <option value="Completed">Completed (Customer Signed Off)</option>
                    <option value="In Progress">In Progress (Follow-up Needed)</option>
                    <option value="On Hold">On Hold (Waiting for Parts)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Engineer Final Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Clean handover, customer satisfied"
                    disabled={isViewOnly}
                  />
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {/* Modal 2: Put On Hold Reason Modal */}
      {holdTask && (
        <Modal
          isOpen={Boolean(holdTask)}
          onClose={() => setHoldTask(null)}
          title={`Put Task On Hold — ${holdTask.id}`}
          size="medium"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setHoldTask(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-warning" onClick={handleConfirmHold}>
                Confirm Put On Hold
              </button>
            </div>
          }
        >
          <form onSubmit={handleConfirmHold} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#b45309' }}>
              <strong>Operational Hold:</strong> Placing task on hold halts active attendance and marks job awaiting parts or site clearance. The engineer can restart the job anytime via <strong>Resume Execution</strong>.
            </div>

            <div style={{ fontSize: '13px' }}>
              <strong>Customer:</strong> {holdTask.customerName} ({holdTask.customerId})<br />
              <strong>Equipment:</strong> {holdTask.productName}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                Reason for Placing Job On Hold *
              </label>
              <textarea
                className="form-control"
                rows={3}
                style={{ fontSize: '13px' }}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="e.g. Awaiting specialized gasket kit from central warehouse; plant supervisor postponed shutdown..."
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
}
