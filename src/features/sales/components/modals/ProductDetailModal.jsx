import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useSales } from '../../context/SalesContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { MapPin, AlertTriangle } from 'lucide-react';

export default function ProductDetailModal({ isOpen, onClose, product }) {
  const { userRole } = useSales();

  if (!product) return null;

  const isManager = userRole === 'sales_manager';
  const marginPercent = product.costPrice
    ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={product.name}
      subtitle={`Product ID: ${product.code} • Category: ${product.category}`}
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="product-detail-view">
        {/* Banner with Supply Type & Stock Status */}
        <div className="detail-meta-banner mb-4">
          <div className="meta-col">
            <span className="meta-label">Supply Type</span>
            <StatusBadge status={product.supplyType} />
          </div>
          {isManager && (
            <div className="meta-col">
              <span className="meta-label">Tracking Type</span>
              <span className="meta-val font-semibold">{product.trackingType} Tracked</span>
            </div>
          )}
          <div className="meta-col">
            <span className="meta-label">Stock Status</span>
            <StatusBadge status={product.status} />
          </div>
          <div className="meta-col">
            <span className="meta-label">Selling Price (Excl. Tax)</span>
            <span className="meta-val text-primary font-bold">{formatINR(product.salePrice)}</span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Configured GST</span>
            <span className="meta-val font-semibold">{product.taxRate}% GST</span>
          </div>
        </div>

        {/* Shortage or Production Alert */}
        {product.expectedProductionNote && (
          <div className="alert-callout alert-callout-warning mb-4">
            <AlertTriangle size={18} className="callout-icon" />
            <div className="callout-text">
              <strong>Shortage & Production Pipeline:</strong> {product.expectedProductionNote}
            </div>
          </div>
        )}

        {/* Stock Breakdown Grid */}
        <div className="section-title mb-2">Inventory Stock Breakdown</div>
        <div className="stock-breakdown-cards mb-4">
          <div className="stock-breakdown-card">
            <span className="breakdown-label">Total On-Hand</span>
            <span className="breakdown-val">{product.totalQty} {product.uom}</span>
            <span className="breakdown-sub">Physical inventory</span>
          </div>
          <div className="stock-breakdown-card bg-emerald-50 border-emerald-200">
            <span className="breakdown-label text-emerald-800">Available to Sell</span>
            <span className="breakdown-val text-emerald-700 font-bold">{product.availableQty} {product.uom}</span>
            <span className="breakdown-sub text-emerald-600">Eligible for new orders</span>
          </div>
          <div className="stock-breakdown-card bg-blue-50 border-blue-200">
            <span className="breakdown-label text-blue-800">Reserved for Orders</span>
            <span className="breakdown-val text-blue-700 font-bold">{product.reservedQty} {product.uom}</span>
            <span className="breakdown-sub text-blue-600">Committed to active orders</span>
          </div>
          <div className="stock-breakdown-card bg-amber-50 border-amber-200">
            <span className="breakdown-label text-amber-800">Unavailable Stock</span>
            <span className="breakdown-val text-amber-700 font-bold">{product.unavailableQty || 0} {product.uom}</span>
            <span className="breakdown-sub text-amber-600">QC Inspection / Quarantine</span>
          </div>
        </div>

        {/* Product Master Fields */}
        <div className="section-title mb-2">Product Identification</div>
        <div className="info-display-grid mb-4">
          <div className="info-box">
            <span className="info-label">Product Name</span>
            <p className="info-value font-semibold text-primary">{product.name}</p>
          </div>
          <div className="info-box">
            <span className="info-label">Product ID</span>
            <p className="info-value font-mono font-bold text-slate-800">{product.code}</p>
          </div>
          <div className="info-box">
            <span className="info-label">Category</span>
            <p className="info-value">{product.category}</p>
          </div>
          <div className="info-box">
            <span className="info-label">Model Reference</span>
            <p className="info-value font-mono">{product.model || '—'}</p>
          </div>
        </div>

        {/* Sales Specifications */}
        <div className="info-display-grid mb-4">
          <div className="info-box">
            <span className="info-label">Unit of Measure</span>
            <p className="info-value">{product.uom}</p>
          </div>
          <div className="info-box">
            <span className="info-label">Lead Time from Factory</span>
            <p className="info-value">{product.leadTimeDays || 5} Days</p>
          </div>
          {isManager && (
            <>
              <div className="info-box">
                <span className="info-label flex items-center gap-1">
                  <MapPin size={13} /> Primary Location
                </span>
                <p className="info-value font-medium">{product.location}</p>
              </div>
              <div className="info-box">
                <span className="info-label">Minimum Reorder Level</span>
                <p className="info-value font-medium">{product.minStockLevel} {product.uom}</p>
              </div>
            </>
          )}
        </div>

        {/* Manager-only Traceability (Batches / Serials) */}
        {isManager && (
          <>
            <div className="info-display-grid mb-4">
              <div className="info-box">
                <span className="info-label">Batch Number</span>
                <p className="info-value font-mono">{product.batchNo && product.batchNo !== 'N/A' ? product.batchNo : '—'}</p>
              </div>
              <div className="info-box">
                <span className="info-label">Serial Number</span>
                <p className="info-value font-mono">{product.serialNo && product.serialNo !== 'N/A' ? product.serialNo : (product.serials?.[0] || '—')}</p>
              </div>
            </div>

            {product.trackingType === 'Batch' && product.batches && (
              <div className="mb-4">
                <div className="section-title mb-2">Active Production & Receipt Batches</div>
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Batch #</th>
                        <th>Mfg Date</th>
                        <th>Expiry Date</th>
                        <th>Batch Qty</th>
                        <th>Inspection Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.batches.map((b, i) => (
                        <tr key={i}>
                          <td className="font-semibold text-primary">{b.batchNo}</td>
                          <td>{formatDate(b.mfgDate)}</td>
                          <td>{b.expiryDate ? formatDate(b.expiryDate) : 'N/A (Non-perishable)'}</td>
                          <td>{b.qty} {product.uom}</td>
                          <td>
                            <StatusBadge status={b.status} size="small" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {product.trackingType === 'Serial' && product.serials && (
              <div className="mb-4">
                <div className="section-title mb-2">Tracked Serial / IMEI Numbers</div>
                <div className="serial-tags-container">
                  {product.serials.map((sn, idx) => (
                    <span key={idx} className="serial-number-pill">
                      {sn}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="section-title mb-2">Cost & Profitability Controls</div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between mb-2">
              <div>
                <span className="text-xs text-emerald-800 font-semibold block">
                  Purchase / Production Cost (Manager View)
                </span>
                <span className="text-base font-bold text-emerald-900">
                  {formatINR(product.costPrice)} per {product.uom}
                </span>
              </div>
              <div>
                <span className="text-xs text-emerald-800 font-semibold block">Gross Margin</span>
                <span className="text-base font-bold text-emerald-900">
                  {marginPercent}% ({formatINR(product.salePrice - product.costPrice)})
                </span>
              </div>
              <span className="badge-success text-xs px-2 py-1 rounded">Manager Access Granted</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
