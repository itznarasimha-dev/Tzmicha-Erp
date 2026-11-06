// ============================================================
// PRODUCTION MATERIALS — MATERIAL ISSUE FORM
// Full multi-section form: Production ref, material selection,
// physical issue details, review, and confirm.
// ============================================================

import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { submitMaterialIssue } from '../services/productionMaterialsService';
import type { MaterialRequest, BomLine } from '../types';

interface MaterialIssueFormProps {
  request: MaterialRequest;
  onClose: () => void;
  onSuccess: (issueNoteId: string) => void;
}

type FormStep = 'review' | 'confirm' | 'success';

export function MaterialIssueForm({ request, onClose, onSuccess }: MaterialIssueFormProps) {
  const [step, setStep] = useState<FormStep>('review');
  const [receivedBy, setReceivedBy] = useState('');
  const [remarks, setRemarks] = useState('');
  const [issueNoteId, setIssueNoteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Only show lines that still need issuing
  const issuableLines = request.materialLines.filter(
    l => l.issueStatus !== 'Complete' && l.issueStatus !== 'Blocked' && l.remainingQty > 0
  );

  const shortageLines = request.materialLines.filter(l => l.shortageQty > 0);
  const hasShortage = shortageLines.length > 0;

  // ── Step 1 — Review
  const renderReview = () => (
    <div>
      {/* Production reference section */}
      <div style={{ background: 'var(--clr-bg-surface)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--clr-text-muted)', marginBottom: '12px' }}>Production Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { label: 'Material Request', value: request.requestId },
            { label: 'Production Order', value: request.productionOrderId },
            { label: 'Product', value: request.finishedProduct },
            { label: 'BOM Reference', value: `${request.bomReference} (${request.bomRevision})` },
            { label: 'Production Area', value: request.productionArea },
            { label: 'Required Date', value: format(new Date(request.requiredDate), 'dd MMM yyyy') },
            { label: 'Requested By', value: request.requestedBy },
            { label: 'Priority', value: request.priority },
            { label: 'Auth Status', value: request.requestStatus },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', marginBottom: '2px' }}>{f.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--clr-text-primary)' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shortage warning */}
      {hasShortage && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: '12px', color: '#f59e0b' }}>
            <strong>Shortage detected:</strong> {shortageLines.map(l => `${l.materialName} (${l.shortageQty} ${l.uom} short)`).join('; ')}. Only eligible available quantities will be issued.
          </div>
        </div>
      )}

      {/* Material lines */}
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--clr-text-muted)', marginBottom: '8px' }}>Material Lines to Issue</div>
      {issuableLines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--clr-text-muted)', fontSize: '13px' }}>
          All material lines are complete or blocked. No issuable lines found.
        </div>
      ) : (
        <div className="erp-table-wrapper" style={{ marginBottom: '16px' }}>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Required</th>
                <th>Prev. Issued</th>
                <th>Remaining</th>
                <th>Available</th>
                <th>Shortage</th>
                <th>Batch / Serial</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {issuableLines.map((line: BomLine) => (
                <tr key={line.lineId}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{line.materialName}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--clr-text-muted)' }}>{line.materialCode}</div>
                  </td>
                  <td>{line.requiredQty} {line.uom}</td>
                  <td>{line.previouslyIssuedQty} {line.uom}</td>
                  <td style={{ fontWeight: 600 }}>{line.remainingQty} {line.uom}</td>
                  <td style={{ color: line.eligibleAvailableQty > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                    {line.eligibleAvailableQty} {line.uom}
                  </td>
                  <td style={{ color: line.shortageQty > 0 ? '#f59e0b' : 'var(--clr-text-muted)', fontWeight: line.shortageQty > 0 ? 700 : 400 }}>
                    {line.shortageQty > 0 ? `${line.shortageQty} ${line.uom}` : '—'}
                  </td>
                  <td style={{ fontSize: '11px' }}>
                    {line.eligibleBatches.length > 0 ? line.eligibleBatches.join(', ') :
                     line.eligibleSerials.length > 0 ? line.eligibleSerials.slice(0, 3).join(', ') + (line.eligibleSerials.length > 3 ? '…' : '') :
                     <span style={{ color: 'var(--clr-text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: '11px' }}>{line.suggestedWarehouseName}{line.suggestedBin ? ` / ${line.suggestedBin}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue capture fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>
            Received By (Production Rep) <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="pm-received-by"
            className="form-input"
            placeholder="Name of production representative receiving materials"
            value={receivedBy}
            onChange={e => setReceivedBy(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Remarks</label>
          <input
            id="pm-issue-remarks"
            className="form-input"
            placeholder="Optional issue notes"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn btn-ghost" onClick={onClose} id="pm-issue-cancel">Cancel</button>
        <button
          className="btn btn-primary"
          disabled={issuableLines.length === 0 || !receivedBy.trim()}
          onClick={() => setStep('confirm')}
          id="pm-issue-review-next"
        >
          Review & Confirm →
        </button>
      </div>
    </div>
  );

  // ── Step 2 — Confirm
  const renderConfirm = () => (
    <div>
      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--clr-accent-light)', marginBottom: '10px' }}>⚠ Please confirm this material issue</div>
        <div style={{ fontSize: '12px', color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>
          You are about to post a <strong>Material Issue Note</strong> against:<br />
          Production Order <strong>{request.productionOrderId}</strong> — Material Request <strong>{request.requestId}</strong><br />
          Product: <strong>{request.finishedProduct}</strong><br />
          Received By: <strong>{receivedBy}</strong><br />
          Lines being issued: <strong>{issuableLines.length}</strong><br /><br />
          This will create a stock movement and update inventory. This action cannot be silently reversed.
        </div>
      </div>
      {submitError && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#f87171' }}>
          {submitError}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn btn-ghost" onClick={() => setStep('review')} disabled={isSubmitting} id="pm-issue-back">← Back</button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          id="pm-issue-confirm"
          style={{ minWidth: '140px' }}
        >
          {isSubmitting ? <><Loader2 size={13} className="refresh-spin" /> Posting…</> : 'Confirm Issue'}
        </button>
      </div>
    </div>
  );

  // ── Step 3 — Success
  const renderSuccess = () => (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ width: '56px', height: '56px', background: 'rgba(16,185,129,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <CheckCircle size={28} style={{ color: '#10b981' }} />
      </div>
      <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--clr-text-primary)', marginBottom: '6px' }}>Material Issue Confirmed</div>
      <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)', marginBottom: '16px' }}>
        Material Issue Note <span style={{ fontFamily: 'monospace', color: 'var(--clr-accent-light)' }}>{issueNoteId}</span> has been posted and inventory updated.
      </div>
      <button className="btn btn-primary" onClick={() => onSuccess(issueNoteId)} id="pm-issue-done">Done</button>
    </div>
  );

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitMaterialIssue({
        materialRequestId: request.requestId,
        productionOrderId: request.productionOrderId,
        lines: issuableLines.map(l => ({
          bomLineId: l.lineId,
          qty: l.eligibleAvailableQty > 0 ? Math.min(l.remainingQty, l.eligibleAvailableQty) : 0,
          batch: l.eligibleBatches[0] ?? l.eligibleSerials[0] ?? '',
          bin: l.suggestedBin ?? '',
        })),
        receivedBy,
        remarks,
      });
      setIssueNoteId(result.issueNoteId);
      setStep('success');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: 'var(--clr-bg-card)', borderRadius: '16px', width: '100%', maxWidth: '860px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--clr-border)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={16} style={{ color: '#f97316' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Chillax', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--clr-text-primary)' }}>Issue Materials to Production</div>
            <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)' }}>{request.requestId} · {request.productionOrderId} · {request.finishedProduct}</div>
          </div>
          <button className="btn-icon" onClick={onClose} id="pm-issue-close"><X size={16} /></button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--clr-border)', display: 'flex', gap: '4px', flexShrink: 0 }}>
          {(['review', 'confirm', 'success'] as FormStep[]).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step === s ? 'var(--clr-accent)' : step === 'success' || (step === 'confirm' && i === 0) ? 'rgba(16,185,129,0.3)' : 'var(--clr-bg-surface)',
                color: step === s ? 'white' : 'var(--clr-text-muted)',
              }}>{i + 1}</div>
              <span style={{ fontSize: '11px', color: step === s ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)' }}>
                {s === 'review' ? 'Review' : s === 'confirm' ? 'Confirm' : 'Complete'}
              </span>
              {i < 2 && <span style={{ color: 'var(--clr-border)', margin: '0 4px' }}>›</span>}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {step === 'review'   && renderReview()}
          {step === 'confirm'  && renderConfirm()}
          {step === 'success'  && renderSuccess()}
        </div>
      </div>
    </div>
  );
}
