import Modal from '../common/Modal';
import { useSales } from '../../context/SalesContext';
import { Radio, AlertCircle, CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';

export default function MarketingIntegrationStatusModal({ isOpen, onClose }) {
  const { getMarketingIntegrationStatus, marketingLeads = [] } = useSales();
  const statusInfo = getMarketingIntegrationStatus ? getMarketingIntegrationStatus() : { connected: false };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        Close
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Marketing Module Integration Status"
      size="md"
      footer={footer}
    >
      <div>
        {/* Status Badge Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <AlertCircle size={20} className="text-amber-600 shrink-0" style={{ marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: '13px' }}>
              Connection Pending: Upstream Marketing Module Developed Separately
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#b45309', lineHeight: '1.5' }}>
              The Marketing module is being built independently by other team members. Direct REST/webhook
              connection (<code>VITE_MARKETING_API_ENDPOINT</code>) is currently pending upstream deployment.
            </p>
          </div>
        </div>

        {/* Integration Architecture Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} className="text-emerald-600" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                Sales Inbound Receiver:
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                background: '#dcfce7',
                color: '#15803d',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              Active &amp; Ready
            </span>
          </div>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} className="text-blue-600" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                Cross-Module Event Bridge:
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#0369a1', fontFamily: 'monospace' }}>
              ApexERP:MarketingLeadForwarded
            </span>
          </div>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} className="text-indigo-600" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                Marketing Leads in Queue:
              </span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
              {marketingLeads.length} records
            </span>
          </div>
        </div>

        {/* Governance & Architecture Notice */}
        <div
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '10px 12px',
            fontSize: '11.5px',
            color: '#475569',
            lineHeight: '1.5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            <ShieldCheck size={14} className="text-slate-600" />
            Integration Integrity Policy
          </div>
          Simulated transfers are disabled. As soon as the separate Marketing module forwards a lead through
          the unified integration bridge, it will automatically populate this queue with all contact details,
          requirements, sender attribution, and date received.
        </div>
      </div>
    </Modal>
  );
}
