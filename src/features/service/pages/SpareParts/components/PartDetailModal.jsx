import React from 'react';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatINR } from '../../../utils/formatters';
import { Package, MapPin, Wrench, AlertTriangle, TrendingDown, History, FileText } from 'lucide-react';

export default function PartDetailModal({ isOpen, onClose, part, onAdjustStock, onEditPart }) {
  if (!isOpen || !part) return null;

  const isLowStock = part.availableQty <= part.minThreshold && part.availableQty > 0;
  const isOutOfStock = part.availableQty === 0;

  // Illustrative Stock Movement History
  const movementHistory = [
    { date: '2026-10-21', type: 'Stock Inward', qty: '+25', ref: 'PO-2026-881 / Vendor Inward Challan #4412', balance: part.availableQty },
    { date: '2026-10-18', type: 'Field Consumption', qty: '-2', ref: 'SR-2026-001 (Mahindra Engineering)', balance: part.availableQty - 2 },
    { date: '2026-10-15', type: 'Routine Overhaul Issue', qty: '-1', ref: 'SR-2026-006 (Gujarat Metalcrafts)', balance: part.availableQty - 3 }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Spare Part Specification — ${part.id}`}
      size="large"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Header Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}
            >
              <Package size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                  {part.id}
                </span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{part.category}</span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ fontSize: '11px', backgroundColor: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: '4px' }}>
                  {part.uom || 'Pcs'}
                </span>
              </div>
              <h3 style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                {part.name}
              </h3>
              {part.specification && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  <strong>Spec:</strong> {part.specification}
                </div>
              )}
            </div>
          </div>
          <StatusBadge status={part.status} />
        </div>

        {/* Stock Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Available Stock</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981', marginTop: '4px' }}>
              {part.availableQty} <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>units</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Reserved for Jobs</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
              {part.reservedQty || 0} <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>units</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Consumed to Date</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#475569', marginTop: '4px' }}>
              {part.usedQty || 0} <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>units</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Reorder Threshold</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>
              {part.minThreshold} <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>units</span>
            </div>
          </div>
        </div>

        {/* Warning Banner if low/out of stock (No Critical label) */}
        {isOutOfStock && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 14px', color: '#991b1b', fontSize: '13px' }}>
            <AlertTriangle size={18} />
            <span><strong>Out of Stock Alert:</strong> This spare part has zero available inventory. Service tickets requiring this component will be placed on hold until replenishment arrives.</span>
          </div>
        )}
        {isLowStock && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '10px 14px', color: '#92400e', fontSize: '13px' }}>
            <TrendingDown size={18} />
            <span><strong>Low Stock Alert:</strong> Current inventory ({part.availableQty} units) is at or below the safety threshold ({part.minThreshold} units). Procurement replenishment recommended.</span>
          </div>
        )}

        {/* Technical & Storage Specifications */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Compatible Equipment */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
              <Wrench size={16} className="text-primary" />
              <span>Compatible ApexERP Equipment</span>
            </div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span className="font-mono text-primary font-semibold">{part.compatibleProductId}</span>
              </div>
              <div style={{ fontWeight: 500, color: '#0f172a' }}>{part.compatibleProductName}</div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b' }}>
                {part.description || 'Engineered for OEM tolerance and warranty compliance on ApexERP series equipment.'}
              </p>
            </div>
          </div>

          {/* Pricing & Bin Location */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
              <MapPin size={16} className="text-primary" />
              <span>Storage & Commercial Valuation</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Unit Cost Price:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatINR(part.unitPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Total Stock Valuation:</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>{formatINR(part.availableQty * part.unitPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Physical Warehouse Bin:</span>
                <span style={{ fontWeight: 500, color: '#1e293b' }}>{part.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Movement History Section per Section 7 */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
            <History size={16} className="text-primary" />
            <span>Recent Stock Movement History</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            {movementHistory.map((mov, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '4px'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{mov.type}</span>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>{mov.ref} • {mov.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, color: mov.qty.startsWith('+') ? '#16a34a' : '#2563eb' }}>
                    {mov.qty} units
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          {onEditPart && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onClose();
                onEditPart(part);
              }}
            >
              Edit Spare Part
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              onClose();
              if (onAdjustStock) onAdjustStock(part);
            }}
          >
            Adjust Stock / Receive Inward
          </button>
        </div>
      </div>
    </Modal>
  );
}
