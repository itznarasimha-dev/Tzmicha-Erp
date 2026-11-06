// ============================================================
// TAB C — DELIVERY DISCREPANCIES
// ============================================================

import { useState, useMemo } from 'react';
import { Search, Eye, PlusCircle, AlertTriangle, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { Discrepancy, DiscrepancyFullStatus, DiscrepancyType } from '../types';
import { ReceivingStatusBadge } from '../components/ReceivingStatusBadge';
import { submitDiscrepancy } from '../services/receivingService';

const DEPT_COLORS: Record<string, string> = {
  'Procurement': 'var(--clr-warning)',
  'Quality Control': 'var(--clr-info)',
  'Finance': 'var(--clr-ok)',
  'Inventory': 'var(--clr-accent)',
};

const ISSUE_TYPE_ICONS: Record<DiscrepancyType, string> = {
  'Short Delivery': '📉',
  'Excess Delivery': '📈',
  'Damaged Goods': '💔',
  'Wrong Product': '❌',
  'Incorrect Batch/Serial': '🔢',
  'Missing Documentation': '📄',
  'Suspected Quality Defect': '🔬',
  'Incorrect Packaging': '📦',
  'Other': '❓',
};

// Default responsible dept by issue type
function getDefaultDept(type: DiscrepancyType): string {
  const map: Record<DiscrepancyType, string> = {
    'Short Delivery': 'Procurement',
    'Excess Delivery': 'Procurement',
    'Damaged Goods': 'Procurement',
    'Wrong Product': 'Procurement',
    'Incorrect Batch/Serial': 'Procurement',
    'Missing Documentation': 'Procurement',
    'Suspected Quality Defect': 'Quality Control',
    'Incorrect Packaging': 'Procurement',
    'Other': 'Procurement',
  };
  return map[type] ?? 'Procurement';
}

// ─── Create Discrepancy Form ──────────────────────────────────
interface CreateDiscrepancyFormProps {
  discrepancies: Discrepancy[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateDiscrepancyForm({ onClose, onSuccess }: CreateDiscrepancyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newId, setNewId] = useState('');
  const [form, setForm] = useState({
    poNumber: '',
    grnNumber: '',
    supplierName: '',
    productCode: '',
    productName: '',
    batchSerial: '',
    issueType: '' as DiscrepancyType | '',
    qtyAffected: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const deptOwner = form.issueType ? getDefaultDept(form.issueType as DiscrepancyType) : '';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.poNumber.trim()) e.po = 'PO number is required.';
    if (!form.issueType) e.type = 'Issue type is required.';
    if (!form.description.trim()) e.desc = 'Description is required.';
    if (!form.productCode.trim()) e.prod = 'Product code is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const result = await submitDiscrepancy(form);
      if (result.success) { setNewId(result.discrepancyId); setSubmitted(true); }
    } finally { setIsSubmitting(false); }
  };

  if (submitted) return (
    <div style={{ textAlign: 'center', padding: '32px' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
      <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Discrepancy Submitted</div>
      <div style={{ fontFamily: 'monospace', fontSize: '16px', color: 'var(--clr-accent-light)', marginBottom: '16px' }}>{newId}</div>
      <p style={{ fontSize: '12.5px', color: 'var(--clr-text-muted)', marginBottom: '24px' }}>
        The discrepancy has been submitted to <strong style={{ color: 'var(--clr-text-primary)' }}>{deptOwner}</strong> for resolution.
      </p>
      <button className="btn btn-primary" onClick={() => { onSuccess(); onClose(); }} id="dis-done">Done</button>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'var(--clr-bg-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '640px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--clr-text-primary)' }}>Report Delivery Discrepancy</div>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'PO Number *', key: 'poNumber', placeholder: 'PO-2026-0567', error: errors.po },
            { label: 'GRN Number', key: 'grnNumber', placeholder: 'GRN-2026-0841 (if available)' },
            { label: 'Supplier Name', key: 'supplierName', placeholder: 'Tata Steel Ltd' },
            { label: 'Product Code *', key: 'productCode', placeholder: 'SKU-30012', error: errors.prod },
            { label: 'Product Name', key: 'productName', placeholder: 'Steel Rod 20mm' },
            { label: 'Batch / Serial (if applicable)', key: 'batchSerial', placeholder: 'BT-2026-ST-0091' },
          ].map(({ label, key, placeholder, error }) => (
            <div key={key}>
              <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>{label}</label>
              <input className="form-input" placeholder={placeholder} value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: '100%' }} id={`dis-${key}`} />
              {error && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{error}</div>}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Issue Type *</label>
          <select className="form-select" value={form.issueType} onChange={(e) => setForm((f) => ({ ...f, issueType: e.target.value as DiscrepancyType }))} style={{ width: '100%' }} id="dis-type">
            <option value="">— Select issue type —</option>
            {Object.keys(ISSUE_TYPE_ICONS).map((t) => <option key={t} value={t}>{ISSUE_TYPE_ICONS[t as DiscrepancyType]} {t}</option>)}
          </select>
          {errors.type && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors.type}</div>}
        </div>

        {deptOwner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: 'var(--clr-warning)' }}>
            <Users size={13} />
            This issue will be assigned to: <strong style={{ color: 'var(--clr-text-primary)', marginLeft: '4px' }}>{deptOwner}</strong>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Quantity Affected</label>
            <input className="form-input" type="number" min={0} value={form.qtyAffected} onChange={(e) => setForm((f) => ({ ...f, qtyAffected: e.target.value }))} style={{ width: '100%' }} id="dis-qty" />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '4px' }}>Description *</label>
          <textarea className="form-input" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail…" style={{ width: '100%', resize: 'vertical' }} id="dis-desc" />
          {errors.desc && <div style={{ fontSize: '10.5px', color: 'var(--clr-critical)', marginTop: '3px' }}>{errors.desc}</div>}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting} id="dis-submit">
            {isSubmitting ? 'Submitting…' : 'Submit Discrepancy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab C Main ───────────────────────────────────────────────
interface DiscrepanciesTabProps {
  discrepancies: Discrepancy[];
  isLoading: boolean;
  initialFilter?: string;
}

export function DiscrepanciesTab({ discrepancies, isLoading, initialFilter }: DiscrepanciesTabProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<DiscrepancyFullStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Discrepancy | null>(null);
  const [localDiscrepancies] = useState(discrepancies);
  void initialFilter; // reserved for future tab-level pre-filtering

  const fmtDate = (iso: string | null) => { if (!iso) return '—'; try { return format(new Date(iso), 'dd MMM yyyy'); } catch { return iso || '—'; } };
  const isOverdue = (d: Discrepancy) => d.dueDate ? new Date(d.dueDate) < new Date() && !['Resolved', 'Closed', 'Rejected'].includes(d.status) : false;

  const filtered = useMemo(() => localDiscrepancies.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.discrepancyId.toLowerCase().includes(q) || d.poNumber.toLowerCase().includes(q) || d.productName.toLowerCase().includes(q) || d.supplierName.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'ALL' || d.status === filterStatus;
    return matchSearch && matchStatus;
  }), [localDiscrepancies, search, filterStatus]);

  if (isLoading) return <div>{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '50px', borderRadius: '8px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      {showCreate && (
        <CreateDiscrepancyForm
          discrepancies={localDiscrepancies}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { /* in production: refresh data */ }}
        />
      )}

      {/* Detail drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)}>
          <div style={{ marginLeft: 'auto', width: '100%', maxWidth: '600px', background: 'var(--clr-bg-surface)', height: '100%', overflowY: 'auto', borderLeft: '1px solid var(--clr-border)', padding: '28px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '17px', fontWeight: 700 }}>{selected.discrepancyId}</div>
                <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>{ISSUE_TYPE_ICONS[selected.issueType]} {selected.issueType}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ReceivingStatusBadge status={selected.status} />
                <button className="btn-icon" onClick={() => setSelected(null)}>×</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                ['PO Number', selected.poNumber],
                ['GRN Number', selected.grnNumber ?? '—'],
                ['Supplier', selected.supplierName],
                ['Product', `${selected.productCode} — ${selected.productName}`],
                ['Batch/Serial', selected.batchSerial ?? '—'],
                ['Qty Affected', selected.qtyAffected ? `${selected.qtyAffected} ${selected.uom}` : '—'],
                ['Reported By', selected.reportedBy],
                ['Reported Date', fmtDate(selected.reportedDate)],
                ['Due Date', fmtDate(selected.dueDate)],
                ['Assigned To', selected.assignedPerson ?? '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{k}</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--clr-text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Responsible Department</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: DEPT_COLORS[selected.responsibleDepartment] ?? 'var(--clr-text-primary)' }}>
                {selected.responsibleDepartment}
              </div>
            </div>

            <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>
              {selected.description}
            </div>

            {selected.resolutionDetails && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--clr-ok)', marginBottom: '6px' }}>RESOLUTION</div>
                <div style={{ fontSize: '12.5px', color: 'var(--clr-text-secondary)' }}>{selected.resolutionDetails}</div>
              </div>
            )}

            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
            <input className="form-input" placeholder="Search discrepancy ID, PO, product…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '28px' }} id="dis-search" />
          </div>
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as DiscrepancyFullStatus | 'ALL')} id="dis-filter-status">
            <option value="ALL">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Assigned">Assigned</option>
            <option value="Under Review">Under Review</option>
            <option value="Waiting for Supplier">Waiting for Supplier</option>
            <option value="Waiting for Quality Control">Waiting for QC</option>
            <option value="Waiting for Procurement">Waiting for Procurement</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} id="new-discrepancy-btn">
          <PlusCircle size={13} />
          Report Discrepancy
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={36} className="empty-state-icon" />
          <p className="empty-state-title">No discrepancies match your filters</p>
        </div>
      ) : (
        <div className="erp-table-wrapper">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Discrepancy ID</th>
                <th>PO</th>
                <th>GRN</th>
                <th>Supplier</th>
                <th>Product</th>
                <th>Issue Type</th>
                <th>Qty Affected</th>
                <th>Reported</th>
                <th>Responsible Dept</th>
                <th>Due Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} id={`dis-row-${d.id}`} style={{ background: isOverdue(d) ? 'rgba(239,68,68,0.04)' : undefined }} onClick={() => setSelected(d)}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--clr-accent-light)', fontSize: '11.5px' }}>{d.discrepancyId}</span></td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{d.poNumber}</span></td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{d.grnNumber ?? '—'}</span></td>
                  <td style={{ fontSize: '12px', fontWeight: 500 }}>{d.supplierName}</td>
                  <td style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 500 }}>{d.productName}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)', fontFamily: 'monospace' }}>{d.productCode}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{ISSUE_TYPE_ICONS[d.issueType]}</span>
                      <span style={{ fontSize: '11.5px' }}>{d.issueType}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '12px' }}>{d.qtyAffected ? `${d.qtyAffected} ${d.uom}` : '—'}</td>
                  <td style={{ fontSize: '11px' }}>{fmtDate(d.reportedDate)}</td>
                  <td>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: DEPT_COLORS[d.responsibleDepartment] ?? 'var(--clr-text-primary)' }}>
                      {d.responsibleDepartment}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isOverdue(d) && <AlertTriangle size={11} style={{ color: 'var(--clr-critical)' }} />}
                      <span style={{ fontSize: '11.5px', color: isOverdue(d) ? 'var(--clr-critical)' : undefined }}>{fmtDate(d.dueDate)}</span>
                    </div>
                  </td>
                  <td><ReceivingStatusBadge status={d.status} size="sm" /></td>
                  <td>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setSelected(d); }} aria-label={`View ${d.discrepancyId}`} id={`view-dis-${d.id}`}>
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
