import React from 'react';
import {
  X,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Wrench,
  Shield,
  FileText,
  UserCheck,
  CheckCircle,
  Receipt,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Check,
  XCircle
} from 'lucide-react';
import StatusBadge from '../../../components/common/StatusBadge';
import { useRole } from '../../../context/RoleContext';
import { useSchedule } from '../../../context/ScheduleContext';
import { formatDate } from '../../../utils/formatters';

export default function RequestDetailModal({ request, onClose, onOpenAssign, onSchedule }) {
  const { roleId } = useRole();
  const { acceptServiceRequest, rejectServiceRequest, acceptAsRepeatComplaint } = useSchedule();

  if (!request) return null;

  const isManager = roleId === 'manager';
  const isCoordinator = roleId === 'coordinator';
  const canAssign = isManager || isCoordinator;

  const isAwaitingReview = request.acceptanceStatus === 'New / Awaiting Review';

  const handleAccept = () => {
    acceptServiceRequest(request.id);
    onClose();
  };

  const handleReject = () => {
    const reason = window.prompt('Enter rejection reason:', 'Service request does not meet coverage terms.');
    if (reason) {
      rejectServiceRequest(request.id, reason);
      onClose();
    }
  };

  const handleAcceptRepeat = () => {
    acceptAsRepeatComplaint(request.id);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="customer-id-chip" style={{ fontSize: '0.8rem' }}>
                {request.id}
              </span>
              <span className="customer-id-chip" style={{ fontSize: '0.8rem' }}>
                {request.customerId}
              </span>
              <h3 className="modal-title" style={{ margin: 0 }}>
                {request.customerName}
              </h3>
            </div>
            <p className="modal-subtitle">
              Service Request Details & Full Specifications
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <StatusBadge status={request.priority} />
            <StatusBadge status={request.status} />
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Review Alert Banner for Manager/Coordinator if New / Awaiting Review */}
          {isAwaitingReview && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontSize: '13px' }}>
                <Clock size={16} />
                <span>
                  <strong>Awaiting Official Review:</strong> This ticket requires Manager/Coordinator review before assignment.
                </span>
              </div>
              {canAssign && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
                    onClick={handleAccept}
                  >
                    <Check size={13} />
                    <span>Accept Request</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 10px', height: '28px', color: '#dc2626' }}
                    onClick={handleReject}
                  >
                    <XCircle size={13} />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Repeat Complaint Banner */}
          {(request.isRepeatComplaint || request.serviceType === 'Repeat Complaint') && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '13px' }}>
                <AlertTriangle size={16} />
                <span>
                  <strong>Repeat Complaint Identified:</strong> Linked to previous service ticket{' '}
                  <strong style={{ fontFamily: 'monospace' }}>{request.previousServiceRequestId || 'SR-2026-001'}</strong> within standard 30-day warranty repeat cycle.
                </span>
              </div>
              {canAssign && !request.repeatServiceCovered && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '11px',
                    borderColor: '#f59e0b',
                    color: '#92400e',
                    padding: '4px 10px',
                    height: '28px'
                  }}
                  onClick={handleAcceptRepeat}
                >
                  <Check size={13} />
                  <span>Accept as Repeat Complaint</span>
                </button>
              )}
            </div>
          )}

          {/* Section 1: Customer Information */}
          <div style={{ marginBottom: '18px', padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
              <Building size={16} />
              <span>Customer Information (Consistent with Sales Master Records)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Customer ID</span>
                <strong style={{ color: 'var(--primary)' }}>{request.customerId}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Business Name</span>
                <strong>{request.customerName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Contact Person</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} color="var(--text-muted)" />
                  <span>{request.contactPerson}</span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Phone Number</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={13} color="var(--text-muted)" />
                  <span>{request.contactNumber}</span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Email Address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mail size={13} color="var(--text-muted)" />
                  <span>{request.email || 'support@customer.demo'}</span>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Complete Site Address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="var(--text-muted)" />
                  <span>{request.serviceLocation}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Product and Invoice Information */}
          <div style={{ marginBottom: '18px', padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
              <Receipt size={16} />
              <span>Product & Original Sales Invoice References</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Product ID & Name</span>
                <strong>{request.productId || 'PRD-M-101'}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{request.productName}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Serial / Batch Number</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{request.serialNumber || 'N/A'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Original Sales Invoice No</span>
                <strong style={{ color: 'var(--primary)' }}>{request.invoiceNo || 'INV-2026-090'}</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Order: {request.orderNo || 'SO-2026-042'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Original Purchase Date</span>
                <span>{request.purchaseDate || '2026-10-18'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Warranty Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={13} color="var(--success)" />
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>{request.warrantyStatus || 'Active Warranty'}</span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>AMC Contract Details</span>
                <span>{request.amcStatus || 'Standard AMC Contract'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Service Information (Distinct Service Type / Coverage separate from Category) */}
          <div style={{ marginBottom: '18px', padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
              <FileText size={16} />
              <span>Service Request Specifications</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Service Type / Coverage</span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe'
                  }}
                >
                  {request.serviceType || 'Warranty Service'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Request Category</span>
                <strong>{request.serviceCategory}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Request Date</span>
                <span>{formatDate(request.requestDate)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Preferred Service Date</span>
                <span>{formatDate(request.preferredDate || request.requestDate)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Reported By</span>
                <span>{request.reportedBy || request.contactPerson}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Request Source</span>
                <span>{request.requestSource || 'Customer Hotline'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Acceptance Status</span>
                <span style={{ fontWeight: 600, color: request.acceptanceStatus?.includes('Accepted') ? '#16a34a' : request.acceptanceStatus === 'Rejected' ? '#dc2626' : '#d97706' }}>
                  {request.acceptanceStatus || 'Accepted / Ready for Assignment'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Lifecycle Status</span>
                <StatusBadge status={request.status} size="small" />
              </div>
            </div>

            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', fontWeight: 600 }}>Reported Issue Description</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                {request.issueDescription}
              </p>
            </div>

            {request.remarks && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', fontWeight: 600 }}>Remarks & Special Notes</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {request.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Assignment Information */}
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
              <UserCheck size={16} />
              <span>Assignment Allocation</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Assigned Engineer</span>
                {request.assignedEngineerName && request.assignedEngineerName !== 'Unassigned' ? (
                  <strong style={{ color: 'var(--primary)' }}>{request.assignedEngineerName}</strong>
                ) : (
                  <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Unassigned (Awaiting Allocation)</span>
                )}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Supporting Staff</span>
                <span>{request.supportingEmployeeName || 'None Assigned'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Scheduled Visit Date</span>
                <span>{formatDate(request.preferredDate || 'Pending allocation')}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Working Window</span>
                <span>10:00 AM - 02:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {canAssign && request.status !== 'Completed' && request.status !== 'Closed' && onSchedule && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  onClose();
                  onSchedule(request);
                }}
              >
                <Calendar size={14} />
                <span>Schedule This Request</span>
              </button>
            )}

            {canAssign && (request.status === 'Unassigned' || request.assignedEngineerName === 'Unassigned') && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  onClose();
                  if (onOpenAssign) onOpenAssign(request);
                }}
              >
                <UserCheck size={15} />
                <span>Assign Service Engineer</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
