import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { ShieldCheck } from 'lucide-react';

export default function ReturnDetailModal({ isOpen, onClose, returnItem }) {
  if (!returnItem) return null;

  const itemType = returnItem.type || returnItem.itemType || 'Return';
  const customerId = returnItem.customerId || 'CUST-000';
  const originalQty = returnItem.originalPurchasedQty ?? returnItem.originalQty ?? returnItem.qty ?? 0;
  const returnQty = returnItem.returnQty ?? returnItem.qty ?? 0;
  const productId = returnItem.productId || returnItem.productCode || 'PRD-000';
  const purchaseDate = returnItem.purchaseDate || returnItem.orderDate;
  const returnDate = returnItem.returnDate || returnItem.cancellationDate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`${itemType} Case: ${returnItem.returnNo || returnItem.id}`}
      subtitle={`Customer: ${returnItem.customerName} (${customerId}) • Order ID: ${returnItem.salesOrderId || returnItem.orderNo}`}
      footer={
        <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="return-detail-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Read-Only Status Ledger Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px 16px',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
              Type / Classification
            </span>
            <span
              style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                fontWeight: 700,
                backgroundColor: itemType === 'Return' ? '#eff6ff' : '#fef2f2',
                color: itemType === 'Return' ? '#2563eb' : '#dc2626',
                border: `1px solid ${itemType === 'Return' ? '#bfdbfe' : '#fecaca'}`,
              }}
            >
              {itemType}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
              Case Status (Operations)
            </span>
            <div style={{ marginTop: '4px' }}>
              <StatusBadge status={returnItem.caseStatus || returnItem.status} />
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
              Stock Status (Store Team)
            </span>
            <div style={{ marginTop: '4px' }}>
              <StatusBadge status={returnItem.stockStatus || (returnItem.restockApproved ? 'Restocked' : 'Awaiting Stock Inspection')} />
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
              Refund Status (Finance Team)
            </span>
            <div style={{ marginTop: '4px' }}>
              <StatusBadge status={returnItem.refundStatus || 'Not Applicable'} />
            </div>
          </div>
        </div>

        {/* Quantities & Product Specifications */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            padding: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>PRODUCT DETAILS</span>
            <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginTop: '2px' }}>
              {returnItem.productName}
            </strong>
            <span style={{ fontSize: '11.5px', color: '#2563eb', fontFamily: 'monospace' }}>
              Product ID: {productId}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>QUANTITIES</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Purchased:</span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{originalQty} Units</strong>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '14px' }}>
                <span style={{ fontSize: '11px', color: '#dc2626', display: 'block' }}>{itemType} Qty:</span>
                <strong style={{ fontSize: '14px', color: '#dc2626' }}>{returnQty} Units</strong>
              </div>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>CRITICAL DATES</span>
            <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
              <div>Order Date: <strong>{formatDate(purchaseDate)}</strong></div>
              <div>{itemType} Date: <strong>{formatDate(returnDate)}</strong></div>
            </div>
          </div>
        </div>

        {/* Reason and Remarks */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
              {itemType} REASON / CUSTOMER ISSUE
            </span>
            <p style={{ fontSize: '13px', color: '#b91c1c', margin: '4px 0 0 0', fontWeight: 500 }}>
              {returnItem.reason || 'No specific reason recorded.'}
            </p>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
              OPERATIONAL OBSERVATIONS &amp; REMARKS
            </span>
            <p style={{ fontSize: '12.5px', color: '#334155', margin: '4px 0 0 0', lineHeight: 1.45 }}>
              {returnItem.remarks || returnItem.notes || 'No remarks recorded.'}
            </p>
          </div>
        </div>

        {/* Store & Finance Ownership Callout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            fontSize: '11.5px',
            color: '#1e40af',
          }}
        >
          <ShieldCheck size={16} className="shrink-0" />
          <span>
            <strong>Read-Only Monitoring:</strong> Case Status is maintained by Customer Operations, Stock/Restocking Status is owned by the Central Store team, and Refund Status is managed by Finance.
          </span>
        </div>
      </div>
    </Modal>
  );
}
