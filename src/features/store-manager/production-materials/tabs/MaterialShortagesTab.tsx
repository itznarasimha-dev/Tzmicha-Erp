// ============================================================
// PRODUCTION MATERIALS — TAB C: MATERIAL SHORTAGES
// ============================================================

import { Fragment, useState, useMemo } from 'react';
import { Search, X, AlertTriangle, ChevronDown, ChevronUp, MessageSquare, ExternalLink, Bell, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { addShortageNote } from '../services/productionMaterialsService';
import type { MaterialShortage, ShortageStatus, Priority } from '../types';
import { ShortageStatusBadge, PriorityBadge } from '../components/StatusBadges';

interface MaterialShortagesTabProps {
  shortages: MaterialShortage[];
  isLoading: boolean;
  initialFilter?: string;
}

export function MaterialShortagesTab({ shortages, isLoading }: MaterialShortagesTabProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ShortageStatus | 'ALL'>('ALL');
  const [filterPriority, setFilterPriority] = useState<Priority | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteTarget, setNoteTarget] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const fmtDate = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy'); } catch { return iso; } };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return shortages.filter(s => {
      const matchSearch = !q || s.shortageId.toLowerCase().includes(q) || s.materialName.toLowerCase().includes(q) || s.materialCode.toLowerCase().includes(q) || s.productionOrderId.toLowerCase().includes(q) || s.materialRequestId.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
      const matchPriority = filterPriority === 'ALL' || s.priority === filterPriority;
      return matchSearch && matchStatus && matchPriority;
    }).sort((a, b) => {
      const po: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
      return po.indexOf(a.priority) - po.indexOf(b.priority);
    });
  }, [shortages, search, filterStatus, filterPriority]);

  async function handleAddNote(shortageId: string) {
    if (!noteText.trim()) return;
    setIsAddingNote(true);
    try {
      await addShortageNote(shortageId, noteText.trim());
      setNoteText('');
      setNoteTarget(null);
    } finally {
      setIsAddingNote(false);
    }
  }

  const handleNotify = (dept: string, shortageId: string) => {
    alert(`Notification sent to ${dept} regarding shortage ${shortageId}`);
  };

  if (isLoading) return (
    <div>{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '8px', marginBottom: '8px' }} />)}</div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
          <input className="form-input" placeholder="Search shortage, material, PO…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '30px' }} id="sht-search" />
        </div>
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as ShortageStatus | 'ALL')} id="sht-filter-status">
          <option value="ALL">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Under Review">Under Review</option>
          <option value="Waiting for Procurement">Waiting for Procurement</option>
          <option value="Waiting for Supplier">Waiting for Supplier</option>
          <option value="Waiting for Quality Control">Waiting for Quality Control</option>
          <option value="Transfer Proposed">Transfer Proposed</option>
          <option value="Partially Resolved">Partially Resolved</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | 'ALL')} id="sht-filter-priority">
          <option value="ALL">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        {(search || filterStatus !== 'ALL' || filterPriority !== 'ALL') && (
          <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => { setSearch(''); setFilterStatus('ALL'); setFilterPriority('ALL'); }} id="sht-clear">
            <X size={11} /> Clear
          </button>
        )}
        <span style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>{filtered.length} shortages</span>
      </div>

      {/* Active shortage banner */}
      {filtered.some(s => s.priority === 'Critical') && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#f87171' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span><strong>Critical shortage(s) detected.</strong> Immediate action required to prevent production stoppage.</span>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={36} className="empty-state-icon" />
          <p className="empty-state-title">No active shortages</p>
          <p className="empty-state-desc">All material requirements can be met with current eligible stock.</p>
        </div>
      ) : (
        <div className="erp-table-wrapper">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Shortage ID</th>
                <th>Production Order</th>
                <th>Material</th>
                <th>Required</th>
                <th>Issued</th>
                <th>Remaining</th>
                <th>Available</th>
                <th style={{ color: '#f87171' }}>Shortage Qty</th>
                <th>Required Date</th>
                <th>Responsible Dept</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const isExpanded = expandedId === s.id;
                const isOverdue = new Date(s.requiredDate) < new Date() && s.status !== 'Resolved';
                return (
                  <Fragment key={s.id}>
                    <tr id={`sht-row-${s.id}`} style={{ background: s.priority === 'Critical' ? 'rgba(239,68,68,0.04)' : undefined }}>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--clr-accent-light)', fontSize: '11px' }}>{s.shortageId}</span></td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{s.productionOrderId}</span></td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '12px' }}>{s.materialName}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--clr-text-muted)' }}>{s.materialCode}</div>
                      </td>
                      <td>{s.requiredQty} {s.uom}</td>
                      <td>{s.previouslyIssuedQty} {s.uom}</td>
                      <td style={{ fontWeight: 600 }}>{s.remainingRequiredQty} {s.uom}</td>
                      <td style={{ color: s.eligibleAvailableQty > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>{s.eligibleAvailableQty} {s.uom}</td>
                      <td style={{ color: '#f87171', fontWeight: 800, fontSize: '13px' }}>{s.shortageQty} {s.uom}</td>
                      <td>
                        <span style={{ fontSize: '11px', color: isOverdue ? '#ef4444' : 'var(--clr-text-secondary)', fontWeight: isOverdue ? 700 : 400 }}>
                          {fmtDate(s.requiredDate)}{isOverdue ? ' ⚠' : ''}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '8px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                          {s.responsibleDepartment}
                        </span>
                      </td>
                      <td><PriorityBadge priority={s.priority} /></td>
                      <td><ShortageStatusBadge status={s.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => { setExpandedId(isExpanded ? null : s.id); setNoteTarget(null); }}
                            id={`sht-expand-${s.id}`}
                            title="View details"
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => { setNoteTarget(noteTarget === s.id ? null : s.id); setExpandedId(s.id); }}
                            id={`sht-note-${s.id}`}
                            title="Add note"
                          >
                            <MessageSquare size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${s.id}-exp`}>
                        <td colSpan={13} style={{ padding: 0 }}>
                          <div style={{ background: 'var(--clr-bg-surface)', borderTop: '1px solid var(--clr-border)', borderBottom: '1px solid var(--clr-border)', padding: '16px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px' }}>
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--clr-text-muted)', marginBottom: '8px' }}>Shortage Details</div>
                                <div style={{ display: 'grid', gap: '4px' }}>
                                  {[
                                    { label: 'Material Request', value: s.materialRequestId },
                                    { label: 'Warehouse', value: s.warehouseName },
                                    { label: 'Category', value: s.materialCategory },
                                    { label: 'Shortage Qty', value: `${s.shortageQty} ${s.uom}`, highlight: true },
                                    { label: 'Responsible Dept', value: s.responsibleDepartment },
                                  ].map(f => (
                                    <div key={f.label} style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                                      <span style={{ color: 'var(--clr-text-muted)', minWidth: '130px', flexShrink: 0 }}>{f.label}:</span>
                                      <span style={{ color: f.highlight ? '#ef4444' : 'var(--clr-text-primary)', fontWeight: f.highlight ? 700 : 500 }}>{f.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--clr-text-muted)', marginBottom: '8px' }}>Related Documents</div>
                                {s.relatedPurchaseOrders.length > 0 && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Purchase Orders:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {s.relatedPurchaseOrders.map(po => (
                                        <span key={po} style={{ fontFamily: 'monospace', fontSize: '11px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '2px 8px', borderRadius: '6px' }}>{po}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {s.pendingReceipts.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Pending Receipts:</div>
                                    {s.pendingReceipts.map(pr => (
                                      <div key={pr} style={{ fontSize: '11px', color: '#34d399', marginBottom: '2px' }}>📦 {pr}</div>
                                    ))}
                                  </div>
                                )}
                                {s.notes && (
                                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--clr-text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                                    📋 {s.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                            {noteTarget === s.id && (
                              <div style={{ marginTop: '10px', borderTop: '1px solid var(--clr-border)', paddingTop: '10px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Add Operational Note</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input
                                    className="form-input"
                                    placeholder="Enter note for this shortage (visible to relevant departments)…"
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                    style={{ flex: 1 }}
                                    id={`sht-note-input-${s.id}`}
                                  />
                                  <button
                                    className="btn btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '12px' }}
                                    onClick={() => handleAddNote(s.shortageId)}
                                    disabled={isAddingNote || !noteText.trim()}
                                    id={`sht-note-save-${s.id}`}
                                  >
                                    {isAddingNote ? 'Saving…' : 'Add Note'}
                                  </button>
                                </div>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                              <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 12px' }} onClick={() => handleNotify('Procurement', s.shortageId)} id={`sht-notify-proc-${s.id}`}>
                                <Bell size={11} style={{ marginRight: '4px' }} /> Notify Procurement
                              </button>
                              <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 12px' }} onClick={() => handleNotify('Production Planning', s.shortageId)} id={`sht-notify-plan-${s.id}`}>
                                <Bell size={11} style={{ marginRight: '4px' }} /> Notify Production Planning
                              </button>
                              <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 12px' }} id={`sht-check-wh-${s.id}`}>
                                <ExternalLink size={11} style={{ marginRight: '4px' }} /> Check Other Warehouses
                              </button>
                              <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 12px' }} id={`sht-refresh-${s.id}`}>
                                <RefreshCw size={11} style={{ marginRight: '4px' }} /> Refresh Availability
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dept routing legend */}
      <div style={{ marginTop: '16px', background: 'var(--clr-bg-surface)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '14px 16px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--clr-text-muted)', marginBottom: '10px' }}>Department Routing Guide</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
          {[
            { cause: 'No stock, no incoming PO', dept: 'Procurement + Production Planning' },
            { cause: 'PO exists but receipt delayed', dept: 'Procurement / Supplier' },
            { cause: 'Stock in another warehouse', dept: 'Store Manager (Transfer)' },
            { cause: 'Stock on quality hold', dept: 'Quality Control' },
            { cause: 'Exceeds approved BOM requirement', dept: 'Production Planning / Approver' },
            { cause: 'Inventory data inconsistency', dept: 'Store Manager (Investigation)' },
          ].map(r => (
            <div key={r.cause} style={{ fontSize: '11px', display: 'flex', gap: '6px' }}>
              <span style={{ color: 'var(--clr-text-muted)', minWidth: 0, flex: 1 }}>{r.cause}</span>
              <span style={{ color: '#a78bfa', fontWeight: 600, flexShrink: 0 }}>→ {r.dept}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
