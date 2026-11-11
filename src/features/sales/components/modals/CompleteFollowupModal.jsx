import { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { recommendNextFollowup } from '../../utils/priorityRules';
import { CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';

export default function CompleteFollowupModal({ isOpen, onClose, followup, onCompleteSuccess }) {
  const { userProfile, updateFollowup, addFollowup } = useSales();
  const { showToast } = useToast();

  const [outcome, setOutcome] = useState('Follow-up Required');
  const [remarks, setRemarks] = useState('');
  const [customNextDate, setCustomNextDate] = useState('');
  const [customNextTime, setCustomNextTime] = useState('');
  const [errors, setErrors] = useState({});

  // Recommended next date/time based on priority and outcome
  const recommendation = useMemo(() => {
    if (!followup) return null;
    return recommendNextFollowup(outcome, followup.priority || 'Medium');
  }, [followup, outcome]);

  if (!followup) return null;

  const currentEmployee = userProfile?.fullName || 'Vikram Mehta';
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const effectiveNextDate = customNextDate || (recommendation ? recommendation.date : '');
  const effectiveNextTime = customNextTime || (recommendation ? recommendation.time : '11:00 AM');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setErrors({ remarks: 'Please record summary remarks of the customer conversation' });
      return;
    }

    try {
      const isClosed = outcome === 'Won' || outcome === 'Lost';
      const completionTimestamp = `${today} ${nowTime}`;

      // 1. Update current follow-up
      updateFollowup(followup.id, {
        status: isClosed ? 'Closed' : 'Completed',
        outcome,
        remarks: remarks.trim(),
        completedBy: currentEmployee,
        completedDate: today,
        completedAt: completionTimestamp,
        isCompleted: true,
      });

      // 2. Schedule recommended next follow-up if required
      if (!isClosed && effectiveNextDate) {
        addFollowup({
          customerId: followup.customerId,
          customerName: followup.customerName,
          contactMethod: followup.contactMethod || 'Phone Call',
          subject: outcome === 'Waiting for Customer'
            ? `Follow-up: Awaiting customer response on ${followup.relatedRef || followup.subject}`
            : outcome === 'Escalated'
            ? `Manager Escalation: ${followup.subject}`
            : `Next Follow-up: ${followup.subject}`,
          relatedRef: followup.relatedRef || 'Account Follow-up',
          productSummary: followup.productSummary || '',
          followUpDate: effectiveNextDate,
          scheduledTime: effectiveNextTime,
          priority: followup.priority || 'Medium',
          notes: `Prior interaction note (${today}): ${remarks.trim()}`,
          owner: followup.owner || followup.assignedTo || currentEmployee,
          status: 'Scheduled',
        });
      }

      showToast(
        isClosed
          ? `Follow-up closed as "${outcome}". Deal interaction saved.`
          : `Follow-up completed! Next activity scheduled for ${effectiveNextDate}.`,
        'success'
      );

      if (onCompleteSuccess) onCompleteSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to complete follow-up', 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="normal"
      title="Complete Follow-up / Log Outcome"
      subtitle={`Customer: ${followup.customerName} • Reference: ${followup.relatedRef || 'Direct Touchpoint'}`}
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-icon-text" onClick={handleSubmit}>
            <CheckCircle2 size={15} />
            <span>Save Outcome &amp; Complete</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Followup context summary */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-xs">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="font-semibold text-slate-800">{followup.subject}</span>
            <span className="badge-primary px-2 py-0.5 rounded font-bold">{followup.priority || 'Medium'} Priority</span>
          </div>
          {followup.productSummary && (
            <div className="text-slate-600">Focus Product: <strong>{followup.productSummary}</strong></div>
          )}
        </div>

        {/* Completion Metadata */}
        <div className="form-grid-2 mb-3">
          <div className="info-box">
            <span className="info-label">Salesperson Logging Outcome</span>
            <p className="info-value font-semibold text-slate-800">{currentEmployee}</p>
          </div>
          <div className="info-box">
            <span className="info-label">Completion Timestamp</span>
            <p className="info-value text-slate-800">{today} at {nowTime}</p>
          </div>
        </div>

        {/* Outcome Selector */}
        <FormField label="Activity Outcome *" id="flw-outcome" required>
          <select
            id="flw-outcome"
            className="form-select"
            value={outcome}
            onChange={(e) => {
              setOutcome(e.target.value);
              setCustomNextDate('');
            }}
          >
            <option value="Follow-up Required">Follow-up Required (Keep in Pipeline)</option>
            <option value="Waiting for Customer">Waiting for Customer (Awaiting Client Reply)</option>
            <option value="Escalated">Escalated (Requires Manager / Engineering Input)</option>
            <option value="Won">Won (Quotation Accepted / Order Placed)</option>
            <option value="Lost">Lost (Customer Declined / Budget Dropped)</option>
          </select>
        </FormField>

        {/* Discussion remarks */}
        <FormField
          label="Conversation Remarks &amp; Next Steps *"
          id="flw-remarks"
          required
          error={errors.remarks}
          helperText="Record latest conversation progress, customer objections, commitments, and agreed action items."
        >
          <textarea
            id="flw-remarks"
            className="form-textarea"
            rows={3}
            placeholder="e.g. Discussed 14% discount with VP Procurement. Customer accepted payment terms; requested updated quotation by Thursday..."
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              if (errors.remarks) setErrors({});
            }}
          />
        </FormField>

        {/* Automated Next Follow-up Recommendation Banner */}
        {outcome !== 'Won' && outcome !== 'Lost' ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Clock size={14} className="text-primary" />
              <strong style={{ fontSize: '12px', color: '#1e40af' }}>
                Next Follow-up Recommendation
              </strong>
            </div>
            <p style={{ fontSize: '11.5px', color: '#1e3a8a', marginBottom: '8px' }}>
              {recommendation?.reason}
            </p>

            <div className="form-grid-2">
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '2px' }}>
                  Scheduled Date
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} className="text-slate-400" />
                  <input
                    type="date"
                    className="form-input"
                    style={{ fontSize: '12px', padding: '4px 8px', height: '32px' }}
                    value={effectiveNextDate}
                    onChange={(e) => setCustomNextDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '2px' }}>
                  Scheduled Time
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '12px', padding: '4px 8px', height: '32px' }}
                  value={effectiveNextTime}
                  onChange={(e) => setCustomNextTime(e.target.value)}
                  placeholder="11:00 AM"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-2 flex items-center gap-2 text-xs text-emerald-800">
            <AlertCircle size={15} className="text-emerald-600" />
            <span>
              <strong>Opportunity Concluded ({outcome}):</strong> Interaction record saved. No automatic recurring follow-up will be scheduled.
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
}
