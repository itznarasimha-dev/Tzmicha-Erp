import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { TrendingUp, Sparkles, AlertCircle } from 'lucide-react';

export default function ConvertToPipelineModal({ isOpen, onClose, lead, onConverted }) {
  const { convertLeadToPipeline, userProfile } = useSales();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    value: '',
    expectedCloseDate: '',
    nextFollowUpDate: '',
    nextFollowUpNote: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && lead) {
      const today = new Date();
      const closeDate = new Date(today.getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const nextFollowUp = new Date(today.getTime() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0];

      setFormData({
        title: `Opportunity: ${lead.companyName} (${lead.interestedProduct || 'Inquiry'})`,
        value: lead.estimatedValue || 250000,
        expectedCloseDate: closeDate,
        nextFollowUpDate: nextFollowUp,
        nextFollowUpNote: `Initial discovery discussion regarding ${lead.interestedProduct || 'product requirements'}.`,
      });
      setError('');
    }
  }, [isOpen, lead]);

  if (!lead) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Opportunity title is required');
      return;
    }

    try {
      const res = convertLeadToPipeline(lead.leadId, {
        title: formData.title.trim(),
        value: Number(formData.value) || 0,
        expectedCloseDate: formData.expectedCloseDate,
        nextFollowUpDate: formData.nextFollowUpDate,
        nextFollowUpNote: formData.nextFollowUpNote.trim(),
      });

      if (res.requiresVerification) {
        showToast('Please resolve customer matching first', 'warning');
        return;
      }

      showToast(`Lead ${lead.leadId} successfully converted into Sales Pipeline opportunity!`, 'success');
      if (onConverted) onConverted(res.opportunity);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to convert lead to pipeline');
    }
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleSubmit}
        style={{ background: '#059669', borderColor: '#059669' }}
      >
        <TrendingUp size={15} style={{ marginRight: '6px' }} />
        Create Opportunity in Pipeline
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Convert Marketing Lead to Sales Pipeline — ${lead.leadId}`}
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            padding: '10px 12px',
            marginBottom: '14px',
          }}
        >
          <Sparkles size={18} className="text-emerald-600 shrink-0" style={{ marginTop: '2px' }} />
          <div style={{ fontSize: '12px', color: '#065f46', lineHeight: '1.4' }}>
            Converting this lead will initiate a new active deal in the <strong>Prospecting stage</strong> of the Sales
            Pipeline with source set to <strong>Marketing</strong>. If no customer account exists yet, one will be
            automatically created.
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '8px 12px',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label className="form-label">Opportunity Title *</label>
          <input
            type="text"
            className="form-input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div className="form-grid-2">
          <div>
            <label className="form-label">Estimated Deal Value (₹) *</label>
            <input
              type="number"
              className="form-input"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              min="0"
              required
            />
          </div>
          <div>
            <label className="form-label">Expected Close Date</label>
            <input
              type="date"
              className="form-input"
              value={formData.expectedCloseDate}
              onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-grid-2" style={{ marginTop: '10px' }}>
          <div>
            <label className="form-label">Next Follow-Up Date</label>
            <input
              type="date"
              className="form-input"
              value={formData.nextFollowUpDate}
              onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Assigned Sales Owner</label>
            <input
              type="text"
              className="form-input"
              value={lead.assignedEmployeeName || userProfile.fullName}
              disabled
              style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <label className="form-label">Initial Action Plan / Next Follow-up Note</label>
          <textarea
            className="form-input"
            rows={2}
            value={formData.nextFollowUpNote}
            onChange={(e) => setFormData({ ...formData, nextFollowUpNote: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
}
