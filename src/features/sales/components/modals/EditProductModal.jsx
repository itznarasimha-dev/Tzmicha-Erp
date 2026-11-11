import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';

export default function EditProductModal({ isOpen, onClose, product }) {
  const { updateProduct, adjustProductStock } = useSales();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'adjustment'

  // Product metadata form
  const [productData, setProductData] = useState({
    name: product?.name || '',
    code: product?.code || product?.id || '',
    category: product?.category || '',
    salePrice: product?.salePrice || 0,
    minStockLevel: product?.minStockLevel || 10,
    leadTimeDays: product?.leadTimeDays || 3,
    description: product?.description || '',
    batchNo: product?.batchNo && product?.batchNo !== 'N/A' ? product?.batchNo : '',
    serialNo: product?.serialNo && product?.serialNo !== 'N/A' ? product?.serialNo : (product?.serials?.[0] || ''),
    expiryDate: product?.expiryDate || '',
  });

  // Stock Adjustment form
  const [adjustType, setAdjustType] = useState('add'); // 'add' or 'subtract'
  const [adjustQty, setAdjustQty] = useState(5);
  const [selectedWarehouse, setSelectedWarehouse] = useState(
    product?.warehouses?.[0]?.name || 'Pune Central Plant'
  );
  const [reason, setReason] = useState('Stock Count Reconciliation');
  const [customReason, setCustomReason] = useState('');

  if (!product) return null;

  const handleSaveInfo = (e) => {
    e.preventDefault();
    try {
      updateProduct(product.id, {
        name: productData.name,
        code: productData.code || product.code,
        category: productData.category,
        salePrice: Number(productData.salePrice),
        minStockLevel: Number(productData.minStockLevel),
        leadTimeDays: Number(productData.leadTimeDays),
        description: productData.description,
        batchNo: productData.batchNo || '—',
        serialNo: productData.serialNo || '—',
        expiryDate: productData.expiryDate || null,
      });
      showToast(`Product ${productData.code || product.code} details updated successfully`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to update product details', 'danger');
    }
  };

  const handleStockAdjustment = (e) => {
    e.preventDefault();
    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason) {
      showToast('Please specify an adjustment reason', 'danger');
      return;
    }

    const qtySigned = adjustType === 'add' ? Number(adjustQty) : -Number(adjustQty);

    try {
      adjustProductStock(product.id, qtySigned, finalReason, selectedWarehouse);
      showToast(
        `Inventory adjusted: ${qtySigned > 0 ? '+' : ''}${qtySigned} ${product.uom} for ${product.name}`,
        'success'
      );
      onClose();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Product: ${product.name}`}
      subtitle={`Code: ${product.code} • Tracking: ${product.trackingType} • Current Total: ${product.totalQty} ${product.uom}`}
      maxWidth="max-w-2xl"
    >
      {/* Sub Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          type="button"
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'info' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'info' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'info' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '13px',
          }}
          onClick={() => setActiveTab('info')}
        >
          Product Master Data
        </button>
        <button
          type="button"
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'adjustment' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'adjustment' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'adjustment' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '13px',
          }}
          onClick={() => setActiveTab('adjustment')}
        >
          Manual Stock Adjustment (Audit)
        </button>
      </div>

      {activeTab === 'info' ? (
        <form onSubmit={handleSaveInfo}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <FormField
              label="Product Name"
              name="name"
              required
              value={productData.name}
              onChange={(e) => setProductData({ ...productData, name: e.target.value })}
            />

            <FormField
              label="Product ID (Format: YYYY-MM-MODEL-XXXX)"
              name="code"
              required
              helperText="Consistent identifier using Year, Month, Model and ID"
              value={productData.code}
              onChange={(e) => setProductData({ ...productData, code: e.target.value })}
            />

            <FormField
              label="Batch Number"
              name="batchNo"
              helperText="e.g. BTH-2026-081 (or '—' if not batch tracked)"
              value={productData.batchNo}
              onChange={(e) => setProductData({ ...productData, batchNo: e.target.value })}
            />

            <FormField
              label="Serial Number"
              name="serialNo"
              helperText="e.g. SN-2026-10-0891 (or '—' if not serial tracked)"
              value={productData.serialNo}
              onChange={(e) => setProductData({ ...productData, serialNo: e.target.value })}
            />

            <FormField
              label="Category"
              name="category"
              value={productData.category}
              onChange={(e) => setProductData({ ...productData, category: e.target.value })}
            />

            <FormField
              label="Selling Price (₹)"
              name="salePrice"
              type="number"
              min="0"
              required
              value={productData.salePrice}
              onChange={(e) => setProductData({ ...productData, salePrice: e.target.value })}
            />

            <FormField
              label="Min Alert Stock Level"
              name="minStockLevel"
              type="number"
              min="0"
              value={productData.minStockLevel}
              onChange={(e) => setProductData({ ...productData, minStockLevel: e.target.value })}
            />

            <FormField
              label="Batch Expiry Date"
              name="expiryDate"
              type="date"
              value={productData.expiryDate}
              onChange={(e) => setProductData({ ...productData, expiryDate: e.target.value })}
            />

            <FormField
              label="Lead Time (Days)"
              name="leadTimeDays"
              type="number"
              min="1"
              value={productData.leadTimeDays}
              onChange={(e) => setProductData({ ...productData, leadTimeDays: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Product Catalog Description
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={productData.description}
              onChange={(e) => setProductData({ ...productData, description: e.target.value })}
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Master Data
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleStockAdjustment}>
          {/* Current Stock State Summary */}
          <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Physical Total</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{product.totalQty} {product.uom}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Committed / Reserved</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>{product.reservedQty} {product.uom}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Eligible to Sell</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#166534' }}>{product.availableQty} {product.uom}</div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
              Adjustment Action
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={`btn ${adjustType === 'add' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setAdjustType('add')}
                style={{ flex: 1 }}
              >
                <Plus size={14} style={{ marginRight: '6px' }} />
                <span>Receive / Add Stock (+)</span>
              </button>
              <button
                type="button"
                className={`btn ${adjustType === 'subtract' ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                onClick={() => setAdjustType('subtract')}
                style={{ flex: 1 }}
              >
                <Minus size={14} style={{ marginRight: '6px' }} />
                <span>Damage / Reduce Stock (-)</span>
              </button>
            </div>
          </div>

          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Adjustment Quantity ({product.uom}) *
              </label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Warehouse Location *
              </label>
              <select
                className="form-select"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                {product.warehouses && product.warehouses.length > 0 ? (
                  product.warehouses.map((w, i) => (
                    <option key={i} value={w.name}>
                      {w.name} (Cur: {w.qty} {product.uom})
                    </option>
                  ))
                ) : (
                  <option value="Pune Central Plant">Pune Central Plant</option>
                )}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Mandatory Audit Reason *
            </label>
            <select
              className="form-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            >
              <option value="Stock Count Reconciliation">Stock Count Physical Audit Reconciliation</option>
              <option value="Supplier Inward Batch Received">Supplier Inward Batch Delivery Received</option>
              <option value="Damaged in Warehouse Handling">Damaged during Warehouse Forklift / Pallet Handling</option>
              <option value="Expired Batch Scrapped">Expired / Substandard Batch Scrapped</option>
              <option value="Quality Inspection Clearance">Quality Inspection Bay Clearance into Stock</option>
              <option value="Other">Other (Specify Below)</option>
            </select>
          </div>

          {reason === 'Other' && (
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Specify exact audit reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            </div>
          )}

          <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#92400e', marginBottom: '20px' }}>
            <strong>Safety Constraint:</strong> Inventory reduction will be prevented if it would drop available stock below committed order reservations ({product.reservedQty} {product.uom}).
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Post Inventory Adjustment
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
