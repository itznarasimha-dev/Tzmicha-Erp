import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle } from 'lucide-react';

const REASON_PRESETS = [
  'Outside target serviceable geography or region',
  'Invalid contact details / unable to reach after 3 attempts',
  'Required product or service not supported by ApexERP',
  'Budget / order volume does not meet enterprise minimums',
  'Duplicate inquiry already serviced under existing account',
  'Competitor price exploration / non-genuine commercial inquiry',
  'Other / Custom reason',
];

export default function RejectLeadModal({ isOpen, onClose, lead, onRejected }) {
  const { rejectMarketingLead } = useSales();
  const { showToast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(REASON_PRESETS[0]);
      setCustomReason('');
      setError('');
    }
  }, [isOpen, lead]);

  if (!lead) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason =
      selectedPreset === 'Other / Custom reason'
        ? customReason.trim()
        : customReason.trim()
        ? `${selectedPreset} — ${customReason.trim()}`
        : selectedPreset;

    if (!finalReason.trim()) {
      setError('A rejection reason is mandatory for governance and audit tracking.');
      return;
    }

    try {
      rejectMarketingLead(lead.leadId, finalReason);
      showToast(`Lead ${lead.leadId} rejected and logged in audit history`, 'warning');
      if (onRejected) onRejected();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reject lead');
    }
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        className="btn btn-danger"
        onClick={handleSubmit}
        disabled={selectedPreset === 'Other / Custom reason' && !customReason.trim()}
      >
        Confirm Rejection
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reject Marketing Lead — ${lead.leadId}`}
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '6px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <AlertTriangle size={20} className="text-rose-600 shrink-0" style={{ marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, color: '#9f1239', fontSize: '13px' }}>
              Governance Requirement: Mandatory Reason Required
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#be123c', lineHeight: '1.4' }}>
              Rejecting this lead will mark it as closed without creating a customer account. The marketing sender (
              <strong>{lead.sentBy}</strong>) and sales leadership will review this reason in audit reports.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Lead Overview</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
            {lead.companyName} • {lead.customerName}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
            Interested in: {lead.interestedProduct || 'N/A'} • Sent on {lead.dateReceived}
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Standard Rejection Category <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <select
            className="form-input"
            value={selectedPreset}
            onChange={(e) => {
              setSelectedPreset(e.target.value);
              setError('');
            }}
          >
            {REASON_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Detailed Rejection Remarks{' '}
            {selectedPreset === 'Other / Custom reason' ? (
              <span style={{ color: '#e11d48' }}>*</span>
            ) : (
              <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional details)</span>
            )}
          </label>
          <textarea
            className="form-input"
            rows={3}
            placeholder={
              selectedPreset === 'Other / Custom reason'
                ? 'Please explain the specific reason for rejecting this inbound marketing lead...'
                : 'Add additional context or notes regarding this decision...'
            }
            value={customReason}
            onChange={(e) => {
              setCustomReason(e.target.value);
              setError('');
            }}
          />
        </div>

        {error && (
          <div style={{ color: '#e11d48', fontSize: '12px', fontWeight: 500, marginTop: '6px' }}>{error}</div>
        )}
      </form>
    </Modal>
  );
}
