import { useState } from 'react';
import Modal from '../common/Modal';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatINR, getWhatsAppUrl } from '../../utils/formatters';
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Send,
  UserCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';

const STATUS_BADGE_STYLES = {
  New: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Under Review': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Accepted: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Assigned: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  Contacted: { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
  Converted: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  Rejected: { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
};

export default function MarketingLeadDetailModal({
  isOpen,
  onClose,
  lead,
  onAccept,
  onAssign,
  onReject,
  onConvertToPipeline,
}) {
  const { userRole, permissions, navigateTo } = useSales();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history'

  if (!lead) return null;

  const badgeStyle = STATUS_BADGE_STYLES[lead.status] || STATUS_BADGE_STYLES.New;
  const waUrl = getWhatsAppUrl(
    lead.mobile,
    `Hello ${lead.customerName}, contacting you from ApexERP regarding your inquiry for ${lead.interestedProduct || 'our products'}.`
  );

  const canAssign = permissions.canAssignMarketingLeads && lead.status !== 'Rejected' && lead.status !== 'Converted';
  const canAccept = permissions.canAcceptRejectMarketingLeads && lead.status !== 'Accepted' && lead.status !== 'Converted' && lead.status !== 'Rejected';
  const canReject = permissions.canAcceptRejectMarketingLeads && lead.status !== 'Rejected' && lead.status !== 'Converted';
  const canAddToPipeline = !lead.pipelineOpportunityId && lead.status !== 'Rejected';

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div style={{ fontSize: '11px', color: '#64748b' }}>
        Ref: <strong>{lead.marketingRecordRef || 'N/A'}</strong> • Received: {formatDate(lead.dateReceived)}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {canReject && (
          <button
            type="button"
            className="btn btn-danger"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => {
              onClose();
              if (onReject) onReject(lead);
            }}
          >
            <XCircle size={14} style={{ marginRight: '5px' }} />
            Reject Lead
          </button>
        )}

        {canAssign && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => {
              onClose();
              if (onAssign) onAssign(lead);
            }}
          >
            <UserCheck size={14} style={{ marginRight: '5px' }} />
            {lead.assignedEmployeeName ? 'Reassign Rep' : 'Assign Sales Rep'}
          </button>
        )}

        {canAccept && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={() => {
              onClose();
              if (onAccept) onAccept(lead);
            }}
          >
            <CheckCircle2 size={14} style={{ marginRight: '5px' }} />
            Accept Lead & Create Customer
          </button>
        )}

        {canAddToPipeline && (lead.status === 'Accepted' || lead.status === 'Assigned') && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 14px', background: '#059669', borderColor: '#059669' }}
            onClick={() => {
              onClose();
              if (onConvertToPipeline) onConvertToPipeline(lead);
            }}
          >
            <TrendingUp size={14} style={{ marginRight: '5px' }} />
            Add to Sales Pipeline
          </button>
        )}

        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '12px' }}>
          Close
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Marketing Lead Dossier — ${lead.leadId}`}
      size="lg"
      footer={footer}
    >
      <div>
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {lead.companyName}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: badgeStyle.bg,
                  color: badgeStyle.color,
                  border: `1px solid ${badgeStyle.border}`,
                }}
              >
                {lead.status}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Contact: <strong>{lead.customerName}</strong> {lead.designation && `(${lead.designation})`} • Location:{' '}
              {lead.location}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Estimated Deal Value</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0284c7' }}>
              {lead.estimatedValue ? formatINR(lead.estimatedValue) : '—'}
            </div>
          </div>
        </div>

        {/* Tab selection */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'overview' ? '#2563eb' : '#64748b',
              cursor: 'pointer',
            }}
          >
            Lead Information & Requirement
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'history' ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={14} />
            Status & Audit History ({lead.statusHistory?.length || 1})
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div>
            {/* Customer & Company Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              {/* Contact Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#0f172a', fontWeight: 600, fontSize: '12px' }}>
                  <User size={14} className="text-blue-600" />
                  Primary Contact Details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Name:</span>{' '}
                    <strong style={{ color: '#1e293b' }}>{lead.customerName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Phone:</span>{' '}
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{lead.mobile}</span>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: '8px', display: 'inline-flex', verticalAlign: 'middle' }}
                        title="Open WhatsApp"
                      >
                        <WhatsAppIcon size={14} color="#25D366" />
                      </a>
                    )}
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Email:</span>{' '}
                    <span style={{ color: '#1e293b' }}>{lead.email || '—'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Designation:</span>{' '}
                    <span style={{ color: '#1e293b' }}>{lead.designation || 'Key Decision Maker'}</span>
                  </div>
                </div>
              </div>

              {/* Company Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#0f172a', fontWeight: 600, fontSize: '12px' }}>
                  <Building2 size={14} className="text-indigo-600" />
                  Company & Location Profile
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Company:</span>{' '}
                    <strong style={{ color: '#1e293b' }}>{lead.companyName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Location:</span>{' '}
                    <span style={{ color: '#1e293b' }}>{lead.location || 'Hyderabad'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>State / Region:</span>{' '}
                    <span style={{ color: '#1e293b' }}>{lead.state || 'Telangana'} ({lead.regionId || 'REG-HYD'})</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>GSTIN:</span>{' '}
                    <span style={{ color: '#1e293b', fontFamily: 'monospace' }}>{lead.gstin || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inbound Marketing Context Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#0f172a', fontWeight: 600, fontSize: '12px' }}>
                <Send size={14} className="text-emerald-600" />
                Marketing Referral Origin
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Forwarded By</span>
                  <strong style={{ color: '#1e293b' }}>{lead.sentBy}</strong>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{lead.sentByRole || 'Marketing Specialist'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Date Received</span>
                  <strong style={{ color: '#1e293b' }}>{formatDate(lead.dateReceived)}</strong>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Forwarded: {lead.forwardedAt ? new Date(lead.forwardedAt).toLocaleTimeString() : 'N/A'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Marketing Record Ref</span>
                  <span style={{ color: '#1e293b', fontWeight: 600, fontFamily: 'monospace' }}>
                    {lead.marketingRecordRef || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Requirement Details */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#0f172a', fontWeight: 600, fontSize: '12px' }}>
                <FileText size={14} className="text-amber-600" />
                Interested Product & Technical Requirements
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                {lead.interestedProduct || 'General Catalog Inquiry'}
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.5', background: '#f8fafc', padding: '8px 10px', borderRadius: '4px' }}>
                {lead.requirement || 'No specific technical specifications entered.'}
              </p>
            </div>

            {/* Assignment & Connected Workflows */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Sales Rep Assignment */}
              <div style={{ background: '#fdf4ff', border: '1px solid #f0abfc', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#86198f', fontWeight: 600, fontSize: '12px' }}>
                  <UserCheck size={14} />
                  Assigned Sales Representative
                </div>
                {lead.assignedEmployeeName ? (
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#701a75' }}>
                      {lead.assignedEmployeeName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a21caf' }}>
                      Employee ID: {lead.assignedEmployeeId}
                    </div>
                    {lead.assignmentInstructions && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#4a044e', background: '#fae8ff', padding: '4px 8px', borderRadius: '4px' }}>
                        <strong>Instructions:</strong> {lead.assignmentInstructions}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#86198f', fontStyle: 'italic' }}>
                    Unassigned — Pending Sales Coordinator / Manager routing.
                  </div>
                )}
              </div>

              {/* Customer Account & Pipeline Status */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#166534', fontWeight: 600, fontSize: '12px' }}>
                  <Layers size={14} />
                  Linked Customer & Pipeline
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#15803d' }}>Customer Account:</span>{' '}
                    {lead.linkedCustomerId ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigateTo('customers');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontWeight: 600,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '12px',
                        }}
                      >
                        {lead.linkedCustomerId} ({lead.linkedCustomerName || lead.companyName})
                      </button>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>Not yet accepted / created</span>
                    )}
                  </div>

                  <div>
                    <span style={{ color: '#15803d' }}>Sales Pipeline Opportunity:</span>{' '}
                    {lead.pipelineOpportunityId ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigateTo('pipeline');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#059669',
                          fontWeight: 600,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '12px',
                        }}
                      >
                        {lead.pipelineOpportunityId}
                      </button>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>Not yet in pipeline</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Rejection Note if Rejected */}
            {lead.status === 'Rejected' && (
              <div
                style={{
                  marginTop: '14px',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  color: '#9f1239',
                  fontSize: '12px',
                }}
              >
                <strong>Rejection Reason:</strong> {lead.rejectionReason || 'No reason specified'}
                <div style={{ fontSize: '11px', color: '#be123c', marginTop: '2px' }}>
                  Rejected by {lead.rejectedBy || 'Sales'} on {lead.rejectedAt ? formatDate(lead.rejectedAt) : 'N/A'}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Status History & Audit Trail Tab */
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              Full chronological audit trail of all actions, assignments, and status transitions for this lead:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(lead.statusHistory || []).map((h, idx) => {
                const sStyle = STATUS_BADGE_STYLES[h.status] || STATUS_BADGE_STYLES.New;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${sStyle.color}`,
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: sStyle.bg,
                          color: sStyle.color,
                        }}
                      >
                        {h.status}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                          {h.changedBy} <span style={{ fontWeight: 400, color: '#64748b' }}>({h.role})</span>
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {h.changedAt ? new Date(h.changedAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>{h.notes}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
