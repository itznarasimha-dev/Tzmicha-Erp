import { History, Clock, User, Shield, Building2, CheckCircle, ArrowRight } from 'lucide-react';
import Modal from '../common/Modal';
import { formatDate } from '../../utils/formatters';

export default function InvoiceHistoryModal({ isOpen, onClose, invoice }) {
  if (!invoice) return null;

  const history = invoice.updatesHistory || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="medium"
      title={`Update History & Audit Trail: ${invoice.invoiceNo}`}
      subtitle={`Customer: ${invoice.customerName} • Sales Order: ${invoice.orderNo || '—'}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Summary Header */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>Current Status</span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{invoice.status}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>Verified Percentage Paid</span>
            <strong style={{ fontSize: '13px', color: '#16a34a' }}>
              {invoice.percentagePaid !== undefined ? `${invoice.percentagePaid}%` : '0%'}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>Outstanding Balance</span>
            <strong style={{ fontSize: '13px', color: invoice.balance > 0 ? '#dc2626' : '#16a34a' }}>
              ₹{Number(invoice.balance || 0).toLocaleString('en-IN')}
            </strong>
          </div>
        </div>

        {/* Chronological Audit Trail */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
            Operational Remarks &amp; Cross-Module Updates
          </div>
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
          {/* Vertical timeline line */}
          <div
            style={{
              position: 'absolute',
              left: '9px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              backgroundColor: '#e2e8f0',
            }}
          />

          {history.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No recorded updates available for this invoice.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {history.map((entry, idx) => (
                <div key={entry.id || idx} style={{ position: 'relative' }}>
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '4px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: idx === history.length - 1 ? '#2563eb' : '#94a3b8',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 0 2px #e2e8f0',
                    }}
                  />

                  {/* Card Content */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: '4px',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                        {entry.description}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} />
                        {entry.date} {entry.time}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569' }}>
                      <User size={11} style={{ color: '#64748b' }} />
                      <strong style={{ color: '#1e293b' }}>{entry.updatedByName}</strong>
                      <span>•</span>
                      <span
                        style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                        }}
                      >
                        {entry.role} ({entry.department || 'Operations'})
                      </span>
                      {entry.orderNo && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-muted">SO: {entry.orderNo}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </Modal>
);
}
