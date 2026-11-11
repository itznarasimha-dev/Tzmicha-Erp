// ============================================================
// INVENTORY — PRODUCT DETAILS DRAWER
// ============================================================

import { format } from 'date-fns';
import { X, Lock, Package, MapPin, Clock } from 'lucide-react';
import type { InventoryRecord, TraceabilityEvent } from '../types';
import { StockStatusBadge, StockCategoryBadge } from './StockStatusBadge';

// ─── Traceability Timeline ─────────────────────────────────────
function TraceabilityTimeline({ events }: { events: TraceabilityEvent[] }) {
  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--clr-text-muted)', fontSize: '12.5px' }}>
        No traceability events recorded for this record.
      </div>
    );
  }

  const EVENT_ICONS: Record<string, string> = {
    'Purchase Order Approved':    '📋',
    'Goods Received (GRN)':       '📦',
    'Inspection Completed':       '🔬',
    'Stock Placed in Location':   '📍',
    'Transfer Initiated':         '🚀',
    'Transfer Received':          '✅',
    'Material Issued to Production': '⚙️',
    'Finished Goods Received':    '🏭',
    'Quality Released':           '✅',
    'Sales Reservation':          '🛒',
    'Goods Dispatched':           '🚚',
    'Customer Return Received':   '↩️',
    'Inventory Adjustment':       '🔧',
    'Reversal':                   '⟲',
  };

  const fmtDT = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy HH:mm'); } catch { return iso; } };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: '17px', top: '12px', bottom: '12px', width: '2px', background: 'var(--clr-border)' }} />
      {events.map(ev => (
        <div key={ev.id} style={{ display: 'flex', gap: '14px', marginBottom: '16px', position: 'relative' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, zIndex: 1,
            background: 'var(--clr-bg-card)', border: '2px solid var(--clr-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>
            {EVENT_ICONS[ev.eventType] ?? '•'}
          </div>
          <div style={{ flex: 1, background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--clr-text-primary)' }}>{ev.eventType}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)', whiteSpace: 'nowrap', marginLeft: '8px' }}>{fmtDT(ev.timestamp)}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11.5px', color: 'var(--clr-text-muted)', marginBottom: '6px' }}>
              {ev.transactionRef && <span>Ref: <span style={{ color: 'var(--clr-accent-light)', fontFamily: 'monospace' }}>{ev.transactionRef}</span></span>}
              {ev.qty != null && <span>Qty: <strong style={{ color: 'var(--clr-text-primary)' }}>{ev.qty} {ev.uom}</strong></span>}
              {ev.sourceLocation && <span>From: {ev.sourceLocation}</span>}
              {ev.destinationLocation && <span>To: {ev.destinationLocation}</span>}
              {ev.performedBy && <span>By: {ev.performedBy}</span>}
              {ev.department && <span>Dept: {ev.department}</span>}
            </div>
            {ev.notes && (
              <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', fontStyle: 'italic' }}>📝 {ev.notes}</div>
            )}
            <div style={{ marginTop: '6px' }}>
              <StockStatusBadge status={ev.resultingStatus} size="sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Product Details Drawer ────────────────────────────────────
interface ProductDetailsDrawerProps {
  record: InventoryRecord;
  allRecords: InventoryRecord[];
  events: TraceabilityEvent[];
  onClose: () => void;
}

function QtyRow({ label, value, uom, color }: { label: string; value: number; uom: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: '12.5px', color: 'var(--clr-text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: color ?? 'var(--clr-text-primary)' }}>
        {value.toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--clr-text-muted)' }}>{uom}</span>
      </span>
    </div>
  );
}

export function ProductDetailsDrawer({ record, allRecords, events, onClose }: ProductDetailsDrawerProps) {
  const fmtDate = (s: string | null) => { if (!s) return '—'; try { return format(new Date(s), 'dd MMM yyyy'); } catch { return s; } };

  // Sibling records (same product, different batch/location)
  const siblings = allRecords.filter((r) => r.productCode === record.productCode && r.id !== record.id);

  const isHeld = record.heldQty > 0;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ marginLeft: 'auto', width: '100%', maxWidth: '720px', background: 'var(--clr-bg-surface)', height: '100%', overflowY: 'auto', borderLeft: '1px solid var(--clr-border)', padding: '28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '20px', fontWeight: 800, color: 'var(--clr-text-primary)' }}>
              {record.productName}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--clr-accent-light)', marginTop: '2px' }}>
              {record.productCode}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} id="close-product-drawer">
            <X size={16} />
          </button>
        </div>

        {/* Category + Status */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <StockCategoryBadge category={record.productCategory} />
          <StockStatusBadge status={record.stockStatus} />
          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '10px', color: 'var(--clr-text-muted)' }}>
            {record.trackingType} Tracked
          </span>
        </div>

        {/* Hold warning */}
        {isHeld && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--clr-critical)' }}>
            <Lock size={13} />
            This batch contains {record.heldQty} {record.uom} on hold. These quantities are not eligible for normal allocation.
          </div>
        )}

        {/* Traceability exceptions */}
        {record.traceabilityExceptions.length > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--clr-warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              ⚠ Traceability Exceptions
            </div>
            {record.traceabilityExceptions.map((ex, i) => (
              <div key={i} style={{ fontSize: '12px', color: 'var(--clr-text-secondary)', marginBottom: '3px' }}>• {ex}</div>
            ))}
          </div>
        )}

        {/* Quantity summary */}
        <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Quantity Summary
          </div>
          <QtyRow label="On-Hand Quantity"   value={record.onHandQty}   uom={record.uom} />
          <QtyRow label="Reserved Quantity"  value={record.reservedQty} uom={record.uom} color="var(--clr-info)" />
          <QtyRow label="Held Quantity"      value={record.heldQty}     uom={record.uom} color={record.heldQty > 0 ? 'var(--clr-critical)' : undefined} />
          <QtyRow label="In-Transit Quantity" value={record.inTransitQty} uom={record.uom} color="var(--clr-text-muted)" />
          <QtyRow label="Available Quantity" value={record.availableQty} uom={record.uom} color={record.availableQty > 0 ? 'var(--clr-ok)' : 'var(--clr-critical)'} />
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--clr-text-muted)' }}>
            Available = On-Hand − Reserved − Held. In-Transit is not counted as available.
          </div>
        </div>

        {/* Location & batch info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Warehouse', value: record.warehouseName, icon: <Package size={11} /> },
            { label: 'Rack / Bin', value: record.bin ?? '—', icon: <MapPin size={11} /> },
            { label: 'Batch Number', value: record.batchNumber ?? (record.serialNumbers.length > 0 ? `${record.serialNumbers.length} serial(s)` : '—') },
            { label: 'Supplier Batch', value: record.supplierBatchNumber ?? '—' },
            { label: 'Manufacturing Date', value: fmtDate(record.manufacturingDate) },
            { label: 'Expiry Date', value: fmtDate(record.expiryDate), highlight: !!record.expiryDate && new Date(record.expiryDate) < new Date() },
            { label: 'GRN Reference', value: record.grnReference ?? '—' },
            { label: 'PO Reference', value: record.poReference ?? '—' },
            { label: 'Production Order', value: record.productionOrderRef ?? '—' },
            { label: 'QC Inspection', value: record.qualityInspectionRef ?? '—' },
            { label: 'Supplier', value: record.supplierName ?? '—' },
            { label: 'Last Updated', value: fmtDate(record.lastUpdated) },
          ].map(({ label, value, icon, highlight }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                {icon}<span>{label}</span>
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 500, color: highlight ? 'var(--clr-critical)' : 'var(--clr-text-primary)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Serial numbers */}
        {record.serialNumbers.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Serial Numbers ({record.serialNumbers.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {record.serialNumbers.map((sn) => (
                <span key={sn} style={{ fontFamily: 'monospace', fontSize: '11px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '6px', padding: '3px 10px', color: 'var(--clr-accent-light)' }}>
                  {sn}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Other locations / batches */}
        {siblings.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Other Batches / Locations ({siblings.length})
            </div>
            {siblings.map((s) => (
              <div key={s.id} style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--clr-accent-light)' }}>{s.batchNumber ?? s.serialNumbers[0] ?? 'No Batch'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)' }}>{s.warehouseName} {s.bin ? `/ ${s.bin}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: s.availableQty > 0 ? 'var(--clr-ok)' : 'var(--clr-text-muted)' }}>
                    {s.availableQty} <span style={{ fontSize: '11px', fontWeight: 400 }}>{s.uom} avail.</span>
                  </div>
                  <StockStatusBadge status={s.stockStatus} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Traceability timeline */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
            <Clock size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Traceability Timeline
          </div>
          <TraceabilityTimeline events={events} />
        </div>

        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
