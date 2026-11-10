import React from 'react';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatters';
import { Shield, FileText, User, Wrench, AlertTriangle, CheckCircle2, History } from 'lucide-react';

export default function WarrantyDetailModal({ isOpen, onClose, warranty }) {
  if (!isOpen || !warranty) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Product Warranty Record — ${warranty.id}`}
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
              <Shield size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                  {warranty.id}
                </span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{warranty.customerName}</span>
              </div>
              <h3 style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                {warranty.productName}
              </h3>
            </div>
          </div>
          <StatusBadge status={warranty.warrantyStatus} />
        </div>

        {/* 2-Column Details: Equipment/Purchase vs Coverage Terms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Section 1: Customer & Equipment Purchase */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              <User size={16} className="text-primary" />
              <span>Customer & Equipment Origin</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Customer</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{warranty.customerName}</span>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb' }}>
                  {warranty.customerId}
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Asset / Equipment</span>
                <span style={{ fontWeight: 500, color: '#0f172a' }}>{warranty.productName}</span>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  SKU: <span className="font-mono">{warranty.productId}</span> • Serial No: <strong className="font-mono text-slate-800">{warranty.serialNumber}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Original Sales Invoice</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#2563eb' }}>{warranty.invoiceNumber}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Purchase Date</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{formatDate(warranty.purchaseDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Warranty Coverage Details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              <Shield size={16} className="text-primary" />
              <span>Warranty Coverage & Policy Terms</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Coverage Type</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{warranty.coverageType}</span>
                <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, marginLeft: '6px' }}>({warranty.warrantyDuration})</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Warranty Start</span>
                  <span style={{ fontWeight: 500, color: '#0f172a' }}>{formatDate(warranty.warrantyStartDate)}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Warranty End Date</span>
                  <span style={{ fontWeight: 600, color: warranty.warrantyStatus === 'Expired' ? '#ef4444' : '#10b981' }}>
                    {formatDate(warranty.warrantyEndDate)}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Policy Exclusions</span>
                <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>{warranty.exclusions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Claim History & Remarks */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            <History size={16} className="text-primary" />
            <span>Warranty Claims History & Audit Notes</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
            {warranty.claimHistory} • Remarks: {warranty.remarks || 'Standard warranty terms active.'}
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
