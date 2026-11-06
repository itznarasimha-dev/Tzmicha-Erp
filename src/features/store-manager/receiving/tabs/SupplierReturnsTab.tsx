// ============================================================
// TAB D — SUPPLIER RETURNS
// ============================================================

import { useState, useMemo } from 'react';
import { Search, Eye, PlusCircle, RotateCcw, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { SupplierReturn, SupplierReturnStatus } from '../types';
import { ReceivingStatusBadge } from '../components/ReceivingStatusBadge';
import { submitSupplierReturn } from '../services/receivingService';




function ReturnTimeline({ status }: { status: SupplierReturnStatus }) {
  const steps = ['Submitted', 'Awaiting Approval', 'Approved', 'Return Staging', 'Ready to Dispatch', 'Dispatched'];
  const currentIdx = steps.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
      {steps.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: done || active ? 600 : 400,
              background: done ? 'var(--clr-ok)' : active ? 'var(--clr-accent)' : 'rgba(255,255,255,0.07)',
              color: done || active ? 'white' : 'var(--clr-text-muted)',
            }}>
              {done ? '✓ ' : ''}{step}
            </div>
            {idx < steps.length - 1 && (
              <div style={{ width: '16px', height: '1px', background: done ? 'var(--clr-ok)' : 'var(--clr-border)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create Return Form ───────────────────────────────────────
interface CreateReturnFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateReturnForm({ onClose, onSuccess }: CreateReturnFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newId, setNewId] = useState('');
  const [form, setForm] = useState({
    grnNumber: '',
    poNumber: '',
    supplierName: '',
    productCode: '',
    productName: '',
    batchSerial: '',
    eligibleQty: '',
    returnQty: '',
    returnReason: '',
    physicalCondition: '',
    sourceWarehouse: '',
    sourceBin: '',
    expectedDispatchDate: '',
    remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.grnNumber.trim()) e.grn = 'GRN number is required.';
    if (!form.productCode.trim()) e.prod = 'Product code is required.';
    if (!form.returnQty || Number(form.returnQty) <= 0) e.qty = 'Return quantity must be greater than zero.';
    if (form.eligibleQty && Number(form.returnQty) > Number(form.eligibleQty)) {
      e.qty = `Return quantity cannot exceed eligible quantity of ${form.eligibleQty}.`;
    }
    if (!form.returnReason.trim()) e.reason = 'Return reason is required.';
    if (!form.sourceWarehouse.trim()) e.wh = 'Source warehouse is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const result = await submitSupplierReturn(form);
      if (result.success) { setNewId(result.returnId); setSubmitted(true); }
    } finally { setIsSubmitting(false); }
  };

  if (submitted) return (
    <div style={{ textAlign: 'center', padding: '32px' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
      <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Supplier Return Submitted</div>
      <div style={{ fontFamily: 'monospace', fontSize: '16px', color: 'var(--clr-accent-light)', marginBottom: '16px' }}>{newId}</div>
      <p style={{ fontSize: '12.5px', color: 'var(--clr-text-muted)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
        The return has been submitted and is awaiting Procurement approval. Stock will remain blocked from regular use until the return is dispatched or rejected.
      </p>
      <button className="btn btn-primary" onClick={() => { onSuccess(); onClose(); }} id="ret-done">Done</button>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--clr-bg-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '680px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--clr-text-primary)' }}>Create Supplier Return</div>
          <button className="btn-icon" onClick={onClose} id="close-return-form">×</button>
        </div>

        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: 'var(--clr-warning)' }}>
          ⚠ Returns require Procurement authorization before goods can be dispatched. Stock will be placed in a return-staging hold.
        </div>

        {/* Section 1: Source Record */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--clr-border)' }}>
            1. Source Record
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'GRN Number *', key: 'grnNumber', placeholder: 'GRN-2026-0841', error: errors.grn },
              { label: 'PO Number', key: 'poNumber', placeholder: 'PO-2026-0567' },
              { label: 'Supplier Name', key: 'supplierName', placeholder: 'Tata Steel Ltd' },
              { label: 'Product Code *', key: 'productCode', placeholder: 'SKU-30012', error: errors.prod },
              { label: 'Product Name', key: 'productName', placeholder: 'Steel Rod 20mm' },
              { label: 'Batch / Serial', key: 'batchSerial', placeholder: 'BT-2026-ST-0091' },
            ].map(({ label, key, placeholder, error }) => (
              <div key={key}>
                <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>{label}</label>
                <input className="form-input" placeholder={placeholder} value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: '100%' }} id={`ret-${key}`} />
                {error && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{error}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Quantities */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--clr-border)' }}>
            2. Return Quantity
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Eligible Return Qty</label>
              <input className="form-input" type="number" min={0} value={form.eligibleQty} onChange={(e) => setForm((f) => ({ ...f, eligibleQty: e.target.value }))} style={{ width: '100%' }} id="ret-eligible-qty" placeholder="Max quantity eligible for return" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Return Quantity *</label>
              <input className="form-input" type="number" min={0} value={form.returnQty} onChange={(e) => setForm((f) => ({ ...f, returnQty: e.target.value }))} style={{ width: '100%' }} id="ret-qty" />
              {errors.qty && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors.qty}</div>}
            </div>
          </div>
        </div>

        {/* Section 3: Return Details */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--clr-border)' }}>
            3. Return Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Source Warehouse *</label>
              <input className="form-input" value={form.sourceWarehouse} onChange={(e) => setForm((f) => ({ ...f, sourceWarehouse: e.target.value }))} placeholder="WH-001" style={{ width: '100%' }} id="ret-warehouse" />
              {errors.wh && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors.wh}</div>}
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Source Bin</label>
              <input className="form-input" value={form.sourceBin} onChange={(e) => setForm((f) => ({ ...f, sourceBin: e.target.value }))} placeholder="A-07" style={{ width: '100%' }} id="ret-bin" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Physical Condition</label>
              <select className="form-select" value={form.physicalCondition} onChange={(e) => setForm((f) => ({ ...f, physicalCondition: e.target.value }))} style={{ width: '100%' }} id="ret-condition">
                <option value="">— Select —</option>
                <option value="Damaged">Damaged</option>
                <option value="Defective">Defective</option>
                <option value="Wrong Item">Wrong Item</option>
                <option value="Intact but non-conforming">Intact but non-conforming</option>
                <option value="Good — excess delivery">Good — excess delivery</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Expected Dispatch Date</label>
              <input className="form-input" type="date" value={form.expectedDispatchDate} onChange={(e) => setForm((f) => ({ ...f, expectedDispatchDate: e.target.value }))} style={{ width: '100%' }} id="ret-dispatch-date" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Return Reason *</label>
              <textarea className="form-input" rows={3} value={form.returnReason} onChange={(e) => setForm((f) => ({ ...f, returnReason: e.target.value }))} placeholder="Describe why the goods are being returned…" style={{ width: '100%', resize: 'vertical' }} id="ret-reason" />
              {errors.reason && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors.reason}</div>}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Additional Remarks</label>
              <textarea className="form-input" rows={2} value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} id="ret-remarks" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting} id="ret-submit">
            {isSubmitting ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab D Main ───────────────────────────────────────────────
interface SupplierReturnsTabProps {
  returns: SupplierReturn[];
  isLoading: boolean;
  initialFilter?: string;
}

export function SupplierReturnsTab({ returns, isLoading }: SupplierReturnsTabProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<SupplierReturnStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<SupplierReturn | null>(null);

  const fmtDate = (s: string | null) => { if (!s) return '—'; try { return format(new Date(s), 'dd MMM yyyy'); } catch { return s || '—'; } };

  const filtered = useMemo(() => returns.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.returnId.toLowerCase().includes(q) || r.supplierName.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q) || r.originalGrnNumber.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'ALL' || r.dispatchStatus === filterStatus;
    return matchSearch && matchStatus;
  }), [returns, search, filterStatus]);

  if (isLoading) return <div>{[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: '50px', borderRadius: '8px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      {showCreate && <CreateReturnForm onClose={() => setShowCreate(false)} onSuccess={() => { }} />}

      {/* Detail Drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)}>
          <div style={{ marginLeft: 'auto', width: '100%', maxWidth: '640px', background: 'var(--clr-bg-surface)', height: '100%', overflowY: 'auto', borderLeft: '1px solid var(--clr-border)', padding: '28px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '18px', fontWeight: 700 }}>{selected.returnId}</div>
                <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)', marginTop: '4px' }}>{selected.supplierName}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ReceivingStatusBadge status={selected.dispatchStatus} />
                <button className="btn-icon" onClick={() => setSelected(null)}>×</button>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Return Progress</div>
              <ReturnTimeline status={selected.dispatchStatus} />
            </div>

            {/* Approval status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: selected.approvalStatus === 'Approved' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${selected.approvalStatus === 'Approved' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12.5px' }}>
              {selected.approvalStatus === 'Approved'
                ? <><CheckCircle2 size={14} style={{ color: 'var(--clr-ok)' }} /><span>Approved by <strong style={{ color: 'var(--clr-text-primary)' }}>{selected.approvedBy}</strong> · Ref: {selected.approvalRef}</span></>
                : <><AlertTriangle size={14} style={{ color: 'var(--clr-warning)' }} /><span style={{ color: 'var(--clr-warning)' }}>Awaiting Procurement approval</span></>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                ['GRN Number', selected.originalGrnNumber],
                ['PO Number', selected.poNumber],
                ['Product', `${selected.productCode} — ${selected.productName}`],
                ['Batch/Serial', selected.batchSerial ?? '—'],
                ['Eligible Qty', `${selected.eligibleQty} ${selected.uom}`],
                ['Return Qty', `${selected.returnQty} ${selected.uom}`],
                ['Source Warehouse', selected.sourceWarehouse],
                ['Source Bin', selected.sourceBin ?? '—'],
                ['Physical Condition', selected.physicalCondition],
                ['Created By', selected.createdBy],
                ['Expected Dispatch', fmtDate(selected.expectedDispatchDate)],
                ['Actual Dispatch', fmtDate(selected.actualDispatchDate)],
                ['Transporter', selected.transporter ?? '—'],
                ['Shipment Ref', selected.shipmentRef ?? '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{k}</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--clr-text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--clr-text-muted)', display: 'block', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Return Reason</strong>
              {selected.returnReason}
            </div>

            {selected.remarks && (
              <div style={{ fontSize: '12.5px', color: 'var(--clr-text-muted)', fontStyle: 'italic', marginBottom: '16px' }}>📝 {selected.remarks}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.dispatchStatus === 'Ready to Dispatch' && (
                <button className="btn btn-primary" id={`dispatch-return-${selected.id}`}>
                  <Truck size={13} />
                  Record Dispatch
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
            <input className="form-input" placeholder="Search return ID, GRN, supplier, product…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '28px' }} id="ret-search" />
          </div>
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as SupplierReturnStatus | 'ALL')} id="ret-filter-status" aria-label="Filter by return status">
            <option value="ALL">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Awaiting Approval">Awaiting Approval</option>
            <option value="Approved">Approved</option>
            <option value="Return Staging">Return Staging</option>
            <option value="Ready to Dispatch">Ready to Dispatch</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>{filtered.length} return{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} id="new-return-btn">
          <PlusCircle size={13} />
          Create Return
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <RotateCcw size={36} className="empty-state-icon" />
          <p className="empty-state-title">No supplier returns match your filters</p>
          <p className="empty-state-desc">Use "Create Return" to initiate an authorized supplier return.</p>
        </div>
      ) : (
        <div className="erp-table-wrapper">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Return ID</th>
                <th>GRN Number</th>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Product</th>
                <th>Batch/Serial</th>
                <th>Return Qty</th>
                <th>Reason</th>
                <th>Warehouse</th>
                <th>Approval</th>
                <th>Dispatch Status</th>
                <th>Expected Dispatch</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} id={`ret-row-${r.id}`} onClick={() => setSelected(r)}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--clr-accent-light)', fontSize: '11.5px' }}>{r.returnId}</span></td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.originalGrnNumber}</span></td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r.poNumber}</span></td>
                  <td style={{ fontSize: '12px', fontWeight: 500 }}>{r.supplierName}</td>
                  <td style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 500 }}>{r.productName}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)', fontFamily: 'monospace' }}>{r.productCode}</div>
                  </td>
                  <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>{r.batchSerial ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--clr-warning)' }}>{r.returnQty} {r.uom}</td>
                  <td style={{ maxWidth: '160px', fontSize: '11.5px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.returnReason}>
                      {r.returnReason}
                    </div>
                  </td>
                  <td style={{ fontSize: '11.5px' }}>{r.sourceWarehouse}</td>
                  <td>
                    <span style={{
                      fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                      background: r.approvalStatus === 'Approved' ? 'rgba(34,197,94,0.15)' : r.approvalStatus === 'Rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: r.approvalStatus === 'Approved' ? 'var(--clr-ok)' : r.approvalStatus === 'Rejected' ? 'var(--clr-critical)' : 'var(--clr-warning)',
                    }}>
                      {r.approvalStatus}
                    </span>
                  </td>
                  <td><ReceivingStatusBadge status={r.dispatchStatus} size="sm" /></td>
                  <td style={{ fontSize: '11.5px' }}>{fmtDate(r.expectedDispatchDate)}</td>
                  <td>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setSelected(r); }} aria-label={`View ${r.returnId}`} id={`view-ret-${r.id}`}>
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
