import React from 'react';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatters';
import { Shield, FileText, Calendar, CheckCircle, Clock, AlertTriangle, User, Wrench } from 'lucide-react';

export default function ContractDetailModal({ isOpen, onClose, contract, onRenew }) {
  if (!isOpen || !contract) return null;

  const isExpiring = contract.contractStatus === 'Expiring Soon';
  const isExpired = contract.contractStatus === 'Expired';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Warranty & AMC Record — ${contract.amcContractNo || contract.id}`}
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
                  {contract.amcContractNo || 'Per-Call / Standard Warranty'}
                </span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{contract.customerName}</span>
              </div>
              <h3 style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                {contract.productName}
              </h3>
            </div>
          </div>
          <StatusBadge status={contract.contractStatus} />
        </div>

        {/* Expiry Alert banner */}
        {isExpiring && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '12px 14px', color: '#92400e', fontSize: '13px' }}>
            <AlertTriangle size={18} />
            <div>
              <strong>Contract Expiring Soon:</strong> This maintenance agreement expires on <strong>{formatDate(contract.amcEndDate)}</strong>. Initiate customer renewal notice to prevent coverage gap.
            </div>
          </div>
        )}
        {isExpired && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 14px', color: '#991b1b', fontSize: '13px' }}>
            <Clock size={18} />
            <div>
              <strong>Coverage Terminated / Expired:</strong> All field visits and spare replacements are currently billable on a per-call commercial basis.
            </div>
          </div>
        )}

        {/* 2-Column Details: Equipment/Purchase vs Service Agreement */}
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
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{contract.customerName}</span>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb' }}>
                  {contract.customerId}
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Asset / Equipment</span>
                <span style={{ fontWeight: 500, color: '#0f172a' }}>{contract.productName}</span>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  SKU: <span className="font-mono">{contract.productId}</span> • Serial No: <strong className="font-mono text-slate-800">{contract.serialNumber}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Original Sales Invoice</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#2563eb' }}>{contract.originalInvoiceNo}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Purchase Date</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{formatDate(contract.purchaseDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Warranty & AMC Terms */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              <Shield size={16} className="text-primary" />
              <span>Coverage & Entitlements</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              {/* Manufacturer Warranty */}
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Manufacturer Warranty</span>
                  <StatusBadge status={contract.warrantyStatus} />
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Valid from <strong>{formatDate(contract.warrantyStartDate)}</strong> to <strong>{formatDate(contract.warrantyEndDate)}</strong>
                </div>
              </div>

              {/* Annual Maintenance Contract */}
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>AMC Plan Type</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                    {contract.amcType}
                  </span>
                </div>
                {contract.amcStartDate ? (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Active Term: <strong>{formatDate(contract.amcStartDate)}</strong> to <strong>{formatDate(contract.amcEndDate)}</strong>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>No active recurring contract on file</div>
                )}
              </div>

              {/* Visits SLA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <span style={{ color: '#64748b' }}>Entitled Maintenance Visits:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {contract.visitsCompleted} of {contract.coveredVisitsPerYear} completed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              onClose();
              if (onRenew) onRenew(contract);
            }}
          >
            Renew / Extend Maintenance Agreement
          </button>
        </div>
      </div>
    </Modal>
  );
}
