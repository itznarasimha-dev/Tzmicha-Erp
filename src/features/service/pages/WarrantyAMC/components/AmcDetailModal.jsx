import React from 'react';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatDate, formatINR } from '../../../utils/formatters';
import { ShieldCheck, Calendar, User, Wrench, RefreshCw, AlertTriangle } from 'lucide-react';

export default function AmcDetailModal({ isOpen, onClose, amc, onRenew }) {
  if (!isOpen || !amc) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Annual Maintenance Contract — ${amc.contractNumber}`}
      size="large"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Summary */}
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
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                  {amc.contractNumber}
                </span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{amc.customerName}</span>
              </div>
              <h3 style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                {amc.productName}
              </h3>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <StatusBadge status={amc.amcStatus} />
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
              Valued at {formatINR(amc.amcValue)}
            </div>
          </div>
        </div>

        {/* 2-Column Details: Equipment/Contract vs Visits */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Section 1: Customer & Contract Scope */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              <User size={16} className="text-primary" />
              <span>Customer & Agreement Scope</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Customer Name</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{amc.customerName}</span>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb' }}>
                  {amc.customerId}
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Covered Equipment</span>
                <span style={{ fontWeight: 500, color: '#0f172a' }}>{amc.productName}</span>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Plan Tier: <strong>{amc.amcType}</strong></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Start Date</span>
                  <span style={{ fontWeight: 500, color: '#0f172a' }}>{formatDate(amc.contractStartDate)}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>End Date</span>
                  <span style={{ fontWeight: 600, color: amc.amcStatus === 'Expired' ? '#ef4444' : '#0f172a' }}>
                    {formatDate(amc.contractEndDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Maintenance Visits Tracking */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              <Calendar size={16} className="text-primary" />
              <span>Service Visits SLA & Tracking</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Contract Duration:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{amc.contractDuration}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Entitled Maintenance Visits:</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{amc.visitsIncluded} Visits Included</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Completed Field Visits:</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>{amc.visitsCompleted} Completed</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Remaining Available Visits:</span>
                <span style={{ fontWeight: 700, color: amc.remainingVisits === 0 ? '#ef4444' : '#0f172a' }}>
                  {amc.remainingVisits} Remaining
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Next Scheduled Visit:</span>
                <span style={{ fontWeight: 600, color: '#2563eb' }}>{formatDate(amc.nextScheduledMaintenance)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks & Terms */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', background: '#f8fafc' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
            Agreement Terms & Renewal Conditions
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: '1.5' }}>
            {amc.remarks}
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-icon-text"
            onClick={() => {
              onClose();
              if (onRenew) onRenew(amc);
            }}
          >
            <RefreshCw size={14} />
            <span>Renew AMC Contract</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
