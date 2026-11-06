// ============================================================
// GRN CREATION FORM — MODAL OVERLAY
// ============================================================

import { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import type { PurchaseOrder, GRNFormState, GRNFormLine } from '../types';
import { submitGRN } from '../services/receivingService';

interface GoodsReceiptFormProps {
  po: PurchaseOrder;
  onClose: () => void;
  onSuccess: (grnNumber: string) => void;
}

function buildInitialLines(po: PurchaseOrder): GRNFormLine[] {
  return po.lines.map((line) => ({
    poLineId: line.lineId,
    productCode: line.productCode,
    productName: line.productName,
    productCategory: line.productCategory,
    stockType: line.stockType,
    orderedQty: line.orderedQty,
    previouslyReceivedQty: line.receivedQty,
    remainingQty: line.outstandingQty,
    receivedQty: 0,
    damagedQty: 0,
    uom: line.uom,
    trackingType: line.trackingType,
    batchNumber: '',
    serialNumbers: '',
    manufacturingDate: '',
    expiryDate: '',
    rackBin: '',
    requiresInspection: line.requiresInspection,
    remarks: '',
  }));
}

type Step = 'form' | 'review' | 'success';

export function GoodsReceiptForm({ po, onClose, onSuccess }: GoodsReceiptFormProps) {
  const [step, setStep] = useState<Step>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedGRN, setSubmittedGRN] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<GRNFormState>({
    poId: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    supplierDeliveryNote: po.deliveryRef ?? '',
    receiptDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    warehouse: po.destinationWarehouse,
    receivedBy: 'Arjun Mehta',
    packagingCondition: '',
    deliveryCondition: '',
    overallRemarks: '',
    lines: buildInitialLines(po),
  });

  const updateLine = (idx: number, field: keyof GRNFormLine, value: string | number) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...prev, lines };
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    form.lines.forEach((line, idx) => {
      if (line.receivedQty < 0) errs[`line-${idx}-qty`] = 'Received qty cannot be negative.';
      if (line.receivedQty > line.remainingQty) errs[`line-${idx}-qty`] = `Cannot exceed remaining qty of ${line.remainingQty} ${line.uom}.`;
      if (line.damagedQty < 0) errs[`line-${idx}-dmg`] = 'Damaged qty cannot be negative.';
      if (line.damagedQty > line.receivedQty) errs[`line-${idx}-dmg`] = 'Damaged qty cannot exceed received qty.';
      if (line.trackingType === 'Batch' && line.receivedQty > 0 && !line.batchNumber.trim()) {
        errs[`line-${idx}-batch`] = 'Batch number is required for this product.';
      }
      if (line.trackingType === 'Serial' && line.receivedQty > 0 && !line.serialNumbers.trim()) {
        errs[`line-${idx}-serial`] = 'Serial numbers are required for this product.';
      }
    });
    if (!form.receiptDate) errs['receiptDate'] = 'Receipt date is required.';
    if (!form.receivedBy.trim()) errs['receivedBy'] = 'Received-by is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleReview = () => {
    if (validate()) setStep('review');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitGRN(form);
      if (result.success) {
        setSubmittedGRN(result.grnNumber);
        setStep('success');
      }
    } catch {
      setErrors({ submit: 'Submission failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalNewQty = form.lines.reduce((s, l) => s + Number(l.receivedQty), 0);
  const totalDamagedQty = form.lines.reduce((s, l) => s + Number(l.damagedQty), 0);
  const inspectionRequired = form.lines.some((l) => l.requiresInspection && Number(l.receivedQty) > 0);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--clr-bg-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '860px', padding: '32px', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              {step === 'success' ? '✅ GRN Posted Successfully' : step === 'review' ? 'Review & Confirm Receipt' : 'Create Goods Receipt Note'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)', marginTop: '4px' }}>
              {po.poNumber} · {po.supplierName}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} id="close-grn-form" aria-label="Close GRN form">
            <X size={16} />
          </button>
        </div>

        {/* Steps indicator */}
        {step !== 'success' && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {(['form', 'review'] as Step[]).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step === s ? 'var(--clr-accent)' : (step === 'review' && s === 'form') ? 'var(--clr-ok)' : 'rgba(255,255,255,0.1)',
                  fontSize: '11px', fontWeight: 700, color: 'white',
                }}>
                  {step === 'review' && s === 'form' ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '11.5px', color: step === s ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)' }}>
                  {s === 'form' ? 'Enter Details' : 'Review & Post'}
                </span>
                {i < 1 && <div style={{ width: '32px', height: '1px', background: 'var(--clr-border)', margin: '0 4px' }} />}
              </div>
            ))}
          </div>
        )}

        {/* ─── STEP: FORM ─── */}
        {step === 'form' && (
          <div>
            {/* Section 1 — Purchase Reference */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--clr-border)' }}>
                1. Purchase Reference
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'PO Number', value: form.poNumber, disabled: true },
                  { label: 'Supplier', value: form.supplierName, disabled: true },
                  { label: 'Destination Warehouse', value: form.warehouse, disabled: true },
                ].map(({ label, value, disabled }) => (
                  <div key={label}>
                    <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>{label}</label>
                    <input className="form-input" value={value} disabled={disabled} style={{ width: '100%', opacity: disabled ? 0.6 : 1 }} readOnly={disabled} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Supplier Delivery Note</label>
                  <input className="form-input" value={form.supplierDeliveryNote} onChange={(e) => setForm((f) => ({ ...f, supplierDeliveryNote: e.target.value }))} style={{ width: '100%' }} id="grn-delivery-note" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Receipt Date & Time *</label>
                  <input className="form-input" type="datetime-local" value={form.receiptDate} onChange={(e) => setForm((f) => ({ ...f, receiptDate: e.target.value }))} style={{ width: '100%' }} id="grn-receipt-date" />
                  {errors.receiptDate && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors.receiptDate}</div>}
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Received By *</label>
                  <input className="form-input" value={form.receivedBy} onChange={(e) => setForm((f) => ({ ...f, receivedBy: e.target.value }))} style={{ width: '100%' }} id="grn-received-by" />
                  {errors.receivedBy && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors.receivedBy}</div>}
                </div>
              </div>
            </div>

            {/* Section 2 — Product Lines */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--clr-border)' }}>
                2. Received Product Lines
              </div>
              {form.lines.map((line, idx) => (
                <div key={line.poLineId} style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--clr-text-primary)', fontSize: '13px' }}>{line.productName}</div>
                        <span style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: line.stockType === 'Raw Material' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                          color: line.stockType === 'Raw Material' ? '#3b82f6' : '#10b981',
                          border: line.stockType === 'Raw Material' ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(16,185,129,0.25)'
                        }}>
                          {line.stockType === 'Raw Material' ? 'Supplier-Sourced' : 'Self-Manufactured'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', fontFamily: 'monospace' }}>{line.productCode} · {line.stockType}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)' }}>Ordered: <strong style={{ color: 'var(--clr-text-primary)' }}>{line.orderedQty} {line.uom}</strong></span>
                      <span style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)' }}>Previously Received: <strong style={{ color: 'var(--clr-ok)' }}>{line.previouslyReceivedQty} {line.uom}</strong></span>
                      <span style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)' }}>Remaining: <strong style={{ color: 'var(--clr-warning)' }}>{line.remainingQty} {line.uom}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Received Qty ({line.uom}) *</label>
                      <input className="form-input" type="number" min={0} max={line.remainingQty} value={line.receivedQty} onChange={(e) => updateLine(idx, 'receivedQty', parseFloat(e.target.value) || 0)} style={{ width: '100%' }} id={`grn-line-${idx}-qty`} />
                      {errors[`line-${idx}-qty`] && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors[`line-${idx}-qty`]}</div>}
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Damaged Qty ({line.uom})</label>
                      <input className="form-input" type="number" min={0} value={line.damagedQty} onChange={(e) => updateLine(idx, 'damagedQty', parseFloat(e.target.value) || 0)} style={{ width: '100%' }} id={`grn-line-${idx}-dmg`} />
                      {errors[`line-${idx}-dmg`] && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors[`line-${idx}-dmg`]}</div>}
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Rack / Bin</label>
                      <input className="form-input" value={line.rackBin} onChange={(e) => updateLine(idx, 'rackBin', e.target.value)} style={{ width: '100%' }} id={`grn-line-${idx}-bin`} />
                    </div>
                    {line.trackingType === 'Batch' && (
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Batch Number *</label>
                        <input className="form-input" value={line.batchNumber} onChange={(e) => updateLine(idx, 'batchNumber', e.target.value)} style={{ width: '100%' }} id={`grn-line-${idx}-batch`} />
                        {errors[`line-${idx}-batch`] && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors[`line-${idx}-batch`]}</div>}
                      </div>
                    )}
                    {line.trackingType === 'Serial' && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Serial Numbers * (comma-separated)</label>
                        <input className="form-input" value={line.serialNumbers} onChange={(e) => updateLine(idx, 'serialNumbers', e.target.value)} placeholder="SN-001, SN-002, SN-003..." style={{ width: '100%' }} id={`grn-line-${idx}-serial`} />
                        {errors[`line-${idx}-serial`] && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors[`line-${idx}-serial`]}</div>}
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Remarks</label>
                      <input className="form-input" value={line.remarks} onChange={(e) => updateLine(idx, 'remarks', e.target.value)} style={{ width: '100%' }} id={`grn-line-${idx}-remarks`} />
                    </div>
                  </div>
                  {/* Good and Shortage Breakdown */}
                  <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '11px', background: 'rgba(0,0,0,0.03)', padding: '6px 12px', borderRadius: '6px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--clr-ok)', fontWeight: 600 }}>
                      ✓ Good Units: {Math.max(0, Number(line.receivedQty) - Number(line.damagedQty))} {line.uom}
                    </span>
                    {Number(line.damagedQty) > 0 && (
                      <span style={{ color: 'var(--clr-critical)', fontWeight: 600 }}>
                        ⚠ Damaged: {line.damagedQty} {line.uom}
                      </span>
                    )}
                    {Number(line.remainingQty) - Number(line.receivedQty) > 0 && (
                      <span style={{ color: 'var(--clr-warning)', fontWeight: 600 }}>
                        Shortage: {Number(line.remainingQty) - Number(line.receivedQty)} {line.uom}
                      </span>
                    )}
                  </div>
                  {line.requiresInspection && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--clr-warning)', background: 'var(--clr-warning-bg)', border: '1px solid var(--clr-warning-border)', borderRadius: '6px', padding: '7px 12px' }}>
                      <Info size={13} />
                      This product requires a Quality Control inspection before it can be used.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Section 3 — Condition */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--clr-border)' }}>
                3. Receiving Condition
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Packaging Condition</label>
                  <select className="form-select" value={form.packagingCondition} onChange={(e) => setForm((f) => ({ ...f, packagingCondition: e.target.value }))} style={{ width: '100%' }} id="grn-pkg-condition">
                    <option value="">— Select —</option>
                    <option value="Good">Good</option>
                    <option value="Minor Damage">Minor Damage</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Severely Damaged">Severely Damaged</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Delivery Condition</label>
                  <select className="form-select" value={form.deliveryCondition} onChange={(e) => setForm((f) => ({ ...f, deliveryCondition: e.target.value }))} style={{ width: '100%' }} id="grn-del-condition">
                    <option value="">— Select —</option>
                    <option value="Good">Good</option>
                    <option value="Partially Damaged">Partially Damaged</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Short Delivered">Short Delivered</option>
                    <option value="Excess Delivered">Excess Delivered</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Overall Remarks</label>
                  <textarea
                    className="form-input"
                    value={form.overallRemarks}
                    onChange={(e) => setForm((f) => ({ ...f, overallRemarks: e.target.value }))}
                    rows={3}
                    style={{ width: '100%', resize: 'vertical' }}
                    id="grn-remarks"
                  />
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="alert-banner error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={14} />{errors.submit}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReview} id="grn-to-review">
                Review Receipt →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP: REVIEW ─── */}
        {step === 'review' && (
          <div>
            <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                Receipt Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {[
                  ['PO Number', form.poNumber],
                  ['Supplier', form.supplierName],
                  ['Warehouse', form.warehouse],
                  ['Received By', form.receivedBy],
                  ['Delivery Note', form.supplierDeliveryNote || '—'],
                  ['Packaging', form.packagingCondition || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ fontSize: '12.5px' }}>
                    <span style={{ color: 'var(--clr-text-muted)' }}>{k}: </span>
                    <strong style={{ color: 'var(--clr-text-primary)' }}>{v}</strong>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--clr-border)', paddingTop: '14px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Lines</div>
                {form.lines.map((line) => (
                  <div key={line.poLineId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--clr-text-primary)' }}>{line.productName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)' }}>{line.productCode} {line.batchNumber ? `· Batch: ${line.batchNumber}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: Number(line.receivedQty) > 0 ? 'var(--clr-ok)' : 'var(--clr-text-muted)' }}>
                        {line.receivedQty} {line.uom}
                      </div>
                      {Number(line.damagedQty) > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--clr-critical)' }}>⚠ {line.damagedQty} {line.uom} damaged</div>
                      )}
                      {line.requiresInspection && Number(line.receivedQty) > 0 && (
                        <div style={{ fontSize: '10.5px', color: 'var(--clr-warning)' }}>🔍 Inspection required</div>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontWeight: 700, fontSize: '13px' }}>
                  <span style={{ color: 'var(--clr-text-secondary)' }}>Total New Receipt</span>
                  <span style={{ color: 'var(--clr-ok)' }}>{totalNewQty} units/weight</span>
                </div>
                {totalDamagedQty > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12.5px' }}>
                    <span style={{ color: 'var(--clr-text-muted)' }}>Total Damaged</span>
                    <span style={{ color: 'var(--clr-critical)', fontWeight: 600 }}>{totalDamagedQty} units/weight</span>
                  </div>
                )}
              </div>
            </div>

            {inspectionRequired && (
              <div className="alert-banner warning" style={{ marginBottom: '16px' }}>
                <FlaskConical size={14} />
                <span>One or more items require Quality Control inspection. They will be placed in a quality-hold state until released by QC.</span>
              </div>
            )}

            {totalDamagedQty > 0 ? (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '12px', color: 'var(--clr-text-primary)' }}>
                <strong style={{ color: 'var(--clr-critical)' }}>⚠ Damaged Cargo Flagged for Admin Ruling:</strong> {totalDamagedQty} damaged unit(s) reported. This GRN will be flagged for executive Admin review on the Damage Approval Desk. Damaged stock is kept quarantined with a Return Gate Pass (RGP) and will not become available for sale.
              </div>
            ) : (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '12.5px', color: 'var(--clr-text-secondary)' }}>
                <strong style={{ color: 'var(--clr-ok)' }}>✓ 100% Quality Dock Verification:</strong> All {totalNewQty} counted units are confirmed intact and ready for single-point warehouse inventory posting.
              </div>
            )}

            {errors.submit && (
              <div className="alert-banner error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={14} />{errors.submit}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setStep('form')}>← Back</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting} id="grn-submit">
                {isSubmitting ? 'Posting…' : totalDamagedQty > 0 ? 'Submit for Admin Review & Record Intake' : 'Post GRN to Warehouse'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP: SUCCESS ─── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={56} style={{ color: 'var(--clr-ok)', marginBottom: '16px' }} />
            <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>GRN Posted Successfully</div>
            <div style={{ fontFamily: 'monospace', fontSize: '18px', color: 'var(--clr-accent-light)', fontWeight: 700, marginBottom: '12px' }}>
              {submittedGRN}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--clr-text-muted)', maxWidth: '440px', margin: '0 auto 24px' }}>
              The goods receipt has been posted and inventory records have been updated.
              {inspectionRequired && ' Items requiring inspection have been placed on quality hold.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => { onSuccess(submittedGRN); onClose(); }} id="grn-done">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Import needed inside form
function FlaskConical({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
      <path d="M8.5 2h7"/><path d="M7 16h10"/>
    </svg>
  );
}
