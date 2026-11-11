import { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { Truck, Receipt, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';

export default function OrderDetailModal({
  isOpen,
  onClose,
  order,
  onOpenDispatchModal,
  onOpenAssignService,
}) {
  const { products, customers = [], reserveOrderStock, createInvoiceForOrder, cancelSalesOrder, navigateTo, validateServiceHandoffConditions } = useSales();
  const { showToast } = useToast();

  const [reserveInputQty, setReserveInputQty] = useState({});
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer requested order cancellation');

  if (!order) return null;

  const handleReserveStock = (productId) => {
    try {
      const prod = products.find((p) => p.id === productId);
      const item = order.items.find((i) => i.productId === productId);
      const needed = item.orderedQty - item.reservedQty;

      // Use user entered quantity or default to needed
      const qtyToReserve = reserveInputQty[productId]
        ? Number(reserveInputQty[productId])
        : Math.min(needed, prod ? prod.availableQty : 0);

      reserveOrderStock(order.id, productId, qtyToReserve);
      showToast(`Reserved ${qtyToReserve} units of ${item.productName}`, 'success');

      setReserveInputQty((prev) => ({ ...prev, [productId]: '' }));
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleGenerateInvoice = () => {
    try {
      const newInv = createInvoiceForOrder(order.id);
      showToast(`Generated Sales Invoice ${newInv.invoiceNo}`, 'success');
      onClose();
      navigateTo('invoices-payments');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleConfirmCancel = () => {
    try {
      cancelSalesOrder(order.id, cancelReason);
      showToast(`Sales Order ${order.orderNo} cancelled. Reserved stock released to inventory.`, 'success');
      setShowCancelPrompt(false);
      onClose();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const hasReservedStockToDispatch = order.items.some((i) => i.reservedQty > 0);
  const isCancellable = order.fulfilmentStatus !== 'Cancelled' && order.fulfilmentStatus !== 'Delivered';

  const cust = customers.find(
    (c) => c.id === order.customerId || c.customerId === order.customerId || c.code === order.customerId || c.name === order.customerName
  );
  const customerDisplayId = cust?.customerId || cust?.code || order.customerId || '—';
  const handoffVal = validateServiceHandoffConditions ? validateServiceHandoffConditions(order) : { eligible: false };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xlarge"
      title={`Sales Order ${order.orderNo}`}
      subtitle={`Customer: ${order.customerName} (${customerDisplayId}) • Ordered on ${formatDate(order.orderDate)}`}
      footer={
        <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {isCancellable && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setShowCancelPrompt(true)}
                title="Cancel order and release reserved inventory"
              >
                Cancel Order
              </button>
            )}
          </div>
          <div className="modal-actions-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {handoffVal.eligible && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  if (onOpenAssignService) onOpenAssignService(order);
                }}
                title="Handoff confirmed and dispatched order to Service"
              >
                Assign to Service
              </button>
            )}

            {hasReservedStockToDispatch && order.fulfilmentStatus !== 'Cancelled' && (
              <button
                type="button"
                className="btn btn-primary btn-icon-text"
                onClick={() => {
                  onClose();
                  if (onOpenDispatchModal) onOpenDispatchModal(order);
                }}
              >
                <Truck size={15} />
                <span>Create Dispatch Note</span>
              </button>
            )}

            {order.fulfilmentStatus !== 'Awaiting Stock' && order.fulfilmentStatus !== 'Cancelled' && (
              <button
                type="button"
                className="btn btn-secondary btn-icon-text"
                onClick={handleGenerateInvoice}
              >
                <Receipt size={15} />
                <span>Generate Invoice</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      {showCancelPrompt && (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#991b1b', marginBottom: '6px' }}>
            Confirm Cancellation of Order {order.orderNo}?
          </h4>
          <p style={{ fontSize: '13px', color: '#7f1d1d', marginBottom: '12px' }}>
            {order.paymentStatus !== 'Unpaid'
              ? 'Warning: Advance payment was recorded for this order. Cancelling will release all reserved stock and trigger an Admin/Finance refund authorization ticket.'
              : 'Cancelling will immediately release all reserved stock back to available sellable inventory. No financial refund required.'}
          </p>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              Reason for Cancellation
            </label>
            <input
              type="text"
              className="form-input"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer deferred procurement timeline"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCancelPrompt(false)}>
              Keep Order
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleConfirmCancel}>
              Confirm Cancel Order
            </button>
          </div>
        </div>
      )}
      <div className="order-detail-view">
        {/* Service Handoff Record Card (If Assigned) */}
        {order.serviceHandoff && order.serviceHandoff.status === 'Assigned' && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} className="text-emerald-600" />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#166534' }}>
                  Service Handoff Record (Confirmed)
                </h4>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid #86efac',
                }}
              >
                {order.serviceHandoff.serviceCompletionStatus || 'Pending Service Execution'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px', color: '#374151' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Assigned By</span>
                <strong>{order.serviceHandoff.assignedByName}</strong> ({order.serviceHandoff.assignedByRole})
                <div style={{ fontSize: '11px', color: '#6b7280' }}>ID: {order.serviceHandoff.assignedByEmployeeId}</div>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Handoff Timestamp</span>
                <strong>{formatDate(order.serviceHandoff.assignedAt)}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Service Requirement</span>
                <strong style={{ color: '#15803d' }}>{order.serviceHandoff.serviceRequirement}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Payment Snapshot</span>
                <strong>{formatINR(order.serviceHandoff.paymentMilestone?.amountPaid || order.amountPaid)} paid</strong> ({order.serviceHandoff.paymentMilestone?.percentPaid || 100}%)
              </div>
            </div>

            {order.serviceHandoff.notes && (
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #bbf7d0', fontSize: '12px', color: '#1f2937' }}>
                <strong>Handoff Remarks:</strong> {order.serviceHandoff.notes}
              </div>
            )}
          </div>
        )}

        {/* Meta Header */}
        <div className="detail-meta-banner">
          <div className="meta-col">
            <span className="meta-label">Customer</span>
            <span className="meta-val font-semibold">{order.customerName}</span>
            <span className="text-xs text-muted font-mono block">ID: {customerDisplayId}</span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Delivery Target</span>
            <span className="meta-val flex items-center gap-1">
              <Calendar size={13} /> {formatDate(order.requiredDeliveryDate)}
            </span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Fulfilment Status</span>
            <StatusBadge status={order.fulfilmentStatus} />
          </div>
          <div className="meta-col">
            <span className="meta-label">Payment Status</span>
            <StatusBadge status={order.paymentStatus || 'Unpaid'} />
          </div>
          <div className="meta-col">
            <span className="meta-label">Order Value</span>
            <span className="meta-val text-primary font-bold">{formatINR(order.totalAmount)}</span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Amount Paid</span>
            <span className="meta-val text-success font-semibold">
              {formatINR(order.amountPaid || 0)}
            </span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Pending Balance</span>
            <span className={`meta-val font-bold ${(order.pendingBalance ?? (order.totalAmount - (order.amountPaid || 0))) > 0 ? 'text-danger' : 'text-success'}`}>
              {formatINR(order.pendingBalance !== undefined ? order.pendingBalance : Math.max(0, order.totalAmount - (order.amountPaid || 0)))}
            </span>
          </div>
        </div>

        {/* Stock note / Alert Callout */}
        {order.stockCheckNote && (
          <div className={`alert-callout ${order.fulfilmentStatus === 'Awaiting Stock' ? 'alert-callout-warning' : 'alert-callout-info'} mb-4`}>
            <div className="callout-text">
              <strong>Stock Status:</strong> {order.stockCheckNote}
            </div>
          </div>
        )}

        {/* Ordered Items & Real-Time Stock Reservation Table */}
        <div className="section-title mb-2">Ordered Items & Stock Availability Check</div>
        <div className="table-responsive mb-4">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ textAlign: 'center' }}>Ordered Qty</th>
                <th style={{ textAlign: 'center' }}>Available in Whse</th>
                <th style={{ textAlign: 'center' }}>Reserved for Order</th>
                <th style={{ textAlign: 'center' }}>Dispatched</th>
                <th style={{ textAlign: 'center' }}>Shortage</th>
                <th style={{ textAlign: 'right' }}>Stock Actions</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const prod = products.find((p) => p.id === item.productId);
                const availableInWhse = prod ? prod.availableQty : 0;
                const unreservedNeeded = item.orderedQty - item.reservedQty - item.dispatchedQty;
                const isShortage = availableInWhse < unreservedNeeded && unreservedNeeded > 0;

                return (
                  <tr key={item.productId}>
                    <td>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-muted">
                        SKU: {prod?.code || item.productId} • {prod?.location || 'Central Plant'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {item.orderedQty}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`stock-indicator-pill ${availableInWhse > 0 ? 'stock-ok' : 'stock-low'}`}>
                        {availableInWhse} {prod?.uom || 'Units'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-info px-2 py-0.5 rounded text-xs font-semibold">
                        {item.reservedQty}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.dispatchedQty}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isShortage ? (
                        <span className="text-danger font-semibold text-xs flex items-center justify-center gap-1">
                          <AlertTriangle size={12} />
                          {unreservedNeeded - availableInWhse} missing
                        </span>
                      ) : unreservedNeeded === 0 ? (
                        <span className="text-success text-xs font-medium">Fully Reserved</span>
                      ) : (
                        <span className="text-xs text-muted">0</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {unreservedNeeded > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            className="form-input input-sm w-16"
                            placeholder={Math.min(unreservedNeeded, availableInWhse).toString()}
                            min="1"
                            max={Math.min(unreservedNeeded, availableInWhse)}
                            value={reserveInputQty[item.productId] ?? ''}
                            onChange={(e) =>
                              setReserveInputQty({
                                ...reserveInputQty,
                                [item.productId]: e.target.value,
                              })
                            }
                            disabled={availableInWhse === 0}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleReserveStock(item.productId)}
                            disabled={availableInWhse === 0}
                            title={availableInWhse === 0 ? 'No stock available to reserve' : 'Reserve available quantity'}
                          >
                            Reserve
                          </button>
                        </div>
                      ) : (
                        <span className="text-success text-xs flex items-center justify-end gap-1">
                          <CheckCircle size={14} /> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expected Production Callout if Shortage */}
        {order.items.some((i) => {
          const prod = products.find((p) => p.id === i.productId);
          return (prod?.availableQty || 0) < (i.orderedQty - i.reservedQty - i.dispatchedQty);
        }) && (
          <div className="stock-shortage-box">
            <h5 className="font-semibold text-danger flex items-center gap-1 mb-1">
              <AlertTriangle size={15} /> Production Coordination Required
            </h5>
            <p className="text-sm text-secondary">
              Available warehouse stock is insufficient for 100% immediate fulfillment. Production Order #PRD-2026-88 is in progress at Pune Plant with estimated output release on <strong>28 Oct 2026</strong>. You may partially dispatch available units or schedule customer delivery after batch completion.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
