import { useState } from 'react';
import Modal from '../common/Modal';
import { Users, UserPlus, Check, AlertCircle, Building2, Phone, Mail } from 'lucide-react';

export default function CustomerMatchVerificationModal({
  isOpen,
  onClose,
  lead,
  matches = [],
  onLinkToCustomer,
  onCreateNewCustomer,
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    matches.length > 0 ? matches[0].customerId || matches[0].id : null
  );

  if (!lead) return null;

  const handleConfirmLink = () => {
    if (!selectedCustomerId) return;
    onLinkToCustomer(selectedCustomerId);
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onCreateNewCustomer()}
        title="Create a fresh Customer record instead of linking to existing accounts"
      >
        <UserPlus size={15} style={{ marginRight: '6px' }} />
        Create as New Customer
      </button>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleConfirmLink}
          disabled={!selectedCustomerId}
        >
          <Check size={15} style={{ marginRight: '6px' }} />
          Link to Selected Customer
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify Existing Customer Match"
      size="lg"
      footer={footer}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <AlertCircle size={20} className="text-amber-600 shrink-0" style={{ marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: '13px' }}>
              Potential Existing Customer Accounts Detected
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#b45309', lineHeight: '1.4' }}>
              ApexERP detected {matches.length} customer record(s) matching the phone, email, or business name of this
              marketing lead. Please confirm whether this lead belongs to an existing client account or represents a
              new business entity.
            </p>
          </div>
        </div>

        {/* Lead Summary */}
        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>
            Inbound Marketing Lead Details
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '6px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Company:</span>{' '}
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{lead.companyName}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Contact:</span>{' '}
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{lead.customerName}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Mobile:</span>{' '}
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{lead.mobile}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Email:</span>{' '}
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{lead.email || '—'}</strong>
            </div>
          </div>
        </div>

        {/* Matched Candidates */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
            Select an Existing Customer Record to Link:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {matches.map((c) => {
              const custId = c.customerId || c.id;
              const isSelected = selectedCustomerId === custId;
              return (
                <div
                  key={custId}
                  onClick={() => setSelectedCustomerId(custId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0f7ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isSelected ? '5px solid #2563eb' : '2px solid #94a3b8',
                        background: '#ffffff',
                        marginTop: '3px',
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{c.name}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            background: '#e2e8f0',
                            color: '#334155',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          {custId}
                        </span>
                        <span style={{ fontSize: '11px', color: '#059669', background: '#d1fae5', padding: '1px 6px', borderRadius: '4px' }}>
                          {c.status || 'Active'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                        <span>
                          <strong>Contact:</strong> {c.contactPerson || '—'}
                        </span>
                        <span>
                          <strong>Phone:</strong> {c.phone}
                        </span>
                        <span>
                          <strong>City:</strong> {c.city || '—'}
                        </span>
                        {c.gstin && c.gstin !== '—' && (
                          <span>
                            <strong>GSTIN:</strong> {c.gstin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
