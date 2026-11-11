import React from 'react';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatters';
import { CheckCircle2, History, Star, User, Clock, Wrench, ShieldCheck } from 'lucide-react';

export default function ServiceAuditDetailModal({ isOpen, onClose, historyItem }) {
  if (!isOpen || !historyItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Service Audit Log — ${historyItem.id}`}
      size="large"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a'
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>
                  {historyItem.id}
                </span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Ticket: <strong className="font-mono text-slate-700">{historyItem.serviceRequestId}</strong>
                </span>
              </div>
              <h3 style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                {historyItem.customerName}
              </h3>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <StatusBadge status="Completed" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', justifyContent: 'flex-end' }}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i < Math.floor(historyItem.customerRating || 5) ? '#eab308' : '#e2e8f0'}
                  color={i < Math.floor(historyItem.customerRating || 5) ? '#eab308' : '#cbd5e1'}
                />
              ))}
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginLeft: '4px' }}>
                {historyItem.customerRating || 5}.0
              </span>
            </div>
          </div>
        </div>

        {/* Audit Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Field Details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              <User size={16} className="text-primary" />
              <span>Service Assignment & Personnel</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Customer Details</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{historyItem.customerName}</span>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb' }}>
                  {historyItem.customerId}
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Equipment / Asset</span>
                <span style={{ fontWeight: 500, color: '#0f172a' }}>{historyItem.productName}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Lead Engineer</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{historyItem.assignedEngineerName}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Service Category</span>
                  <span style={{ fontWeight: 500, color: '#2563eb' }}>{historyItem.issueCategory}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Metrics */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              <Clock size={16} className="text-primary" />
              <span>Execution Timeline & Labor</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Concluded Date:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatDate(historyItem.serviceDate)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>On-Site Labor Duration:</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{historyItem.totalDurationHours} Hours</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Resolution Status:</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>100% Resolved & Tested</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>SLA Compliance:</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>Within Target Standard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Engineering Resolution Summary */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', background: '#f8fafc' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
            Final Engineering Resolution & Work Done
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: '1.6' }}>
            {historyItem.resolutionSummary}
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Audit Log
          </button>
        </div>
      </div>
    </Modal>
  );
}
