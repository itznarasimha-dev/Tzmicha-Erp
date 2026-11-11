import { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle } from 'lucide-react';

export default function CreateDispatchModal({ isOpen, onClose, preselectedOrder = null }) {
  const { orders, products, createDispatch } = useSales();
  const { showToast } = useToast();

  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [carrier, setCarrier] = useState('Safexpress Logistics');
  const [trackingNo, setTrackingNo] = useState('');
  const [warehouse, setWarehouse] = useState('Pune Central Plant');
  const [itemOverrides, setItemOverrides] = useState({});
  const [errors, setErrors] = useState({});

  // Eligible orders that have reserved stock
  const eligibleOrders = orders.filter((o) =>
    o.items.some((i) => i.reservedQty > 0)
  );

  const activeOrderId = selectedOrderId || preselectedOrder?.id || eligibleOrders[0]?.id || '';
  const currentOrder = orders.find((o) => o.id === activeOrderId);

  // Compute dispatch items reactively without cascading setState effects
  const dispatchItems = useMemo(() => {
    if (!currentOrder) return [];
    return currentOrder.items
      .filter((it) => it.reservedQty > 0)
      .map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const override = itemOverrides[it.productId] || {};
        return {
          productId: it.productId,
          productName: it.productName,
          reservedQty: it.reservedQty,
          dispatchQty: override.dispatchQty !== undefined ? override.dispatchQty : it.reservedQty,
          batchOrSerial:
            override.batchOrSerial !== undefined
              ? override.batchOrSerial
              : prod?.batches?.[0]?.batchNo
              ? `Batch: ${prod.batches[0].batchNo}`
              : prod?.serials?.[0]
              ? `Serials: ${prod.serials.slice(0, 3).join(', ')}...`
              : 'Standard Qty Pick',
        };
      });
  }, [currentOrder, products, itemOverrides]);

  const handleOrderChange = (id) => {
    setSelectedOrderId(id);
    setItemOverrides({});
  };

  const handleQtyChange = (productId, val) => {
    setItemOverrides((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        dispatchQty: Number(val),
      },
    }));
  };

  const handleBatchChange = (productId, val) => {
    setItemOverrides((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        batchOrSerial: val,
      },
    }));
  };

  const handleSubmit = () => {
    const errs = {};
    if (!activeOrderId) errs.orderId = 'Please select a sales order';
    if (!trackingNo.trim()) errs.trackingNo = 'Please enter a tracking / consignment number';

    dispatchItems.forEach((it) => {
      if (it.dispatchQty <= 0) {
        errs[`qty_${it.productId}`] = 'Quantity must be > 0';
      }
      if (it.dispatchQty > it.reservedQty) {
        errs[`qty_${it.productId}`] = `Cannot dispatch more than reserved (${it.reservedQty})`;
      }
    });

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      const newDispatch = createDispatch({
        orderId: activeOrderId,
        itemsToDispatch: dispatchItems.map((it) => ({
          productId: it.productId,
          qty: it.dispatchQty,
          batchOrSerial: it.batchOrSerial,
        })),
        carrier,
        trackingNo,
        warehouse,
      });

      showToast(`Dispatch note ${newDispatch.dispatchNo} generated successfully!`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Create Dispatch Note"
      subtitle="Pick and pack reserved stock for delivery with carrier consignment details"
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Confirm & Dispatch Goods
          </button>
        </div>
      }
    >
      <div className="dispatch-form">
        {/* Order Selection */}
        <div className="form-grid-2">
          <FormField label="Sales Order with Reserved Stock" id="disp-order" required error={errors.orderId}>
            <select
              id="disp-order"
              className="form-select"
              value={activeOrderId}
              onChange={(e) => handleOrderChange(e.target.value)}
            >
              <option value="">Select eligible order...</option>
              {eligibleOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNo} — {o.customerName} ({o.reservedQtyTotal} units reserved)
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Originating Warehouse / Region" id="disp-warehouse">
            <select
              id="disp-warehouse"
              className="form-select"
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
            >
              <option value="Pune Central Plant (Bay 4)">Pune Central Plant (Bay 4)</option>
              <option value="Bhiwandi Mumbai Hub (Shelf E-12)">Bhiwandi Mumbai Hub (Shelf E-12)</option>
              <option value="Delhi NCR Hub (Packing Bay)">Delhi NCR Hub (Packing Bay)</option>
              <option value="Bengaluru South Hub (Rack 14)">Bengaluru South Hub (Rack 14)</option>
            </select>
          </FormField>
        </div>

        {/* Carrier Details */}
        <div className="form-grid-2">
          <FormField label="Logistics Carrier" id="disp-carrier">
            <select
              id="disp-carrier"
              className="form-select"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            >
              <option value="Safexpress Logistics">Safexpress Logistics</option>
              <option value="BlueDart Express">BlueDart Express</option>
              <option value="V-Trans Logistics">V-Trans Logistics</option>
              <option value="DTDC Air Cargo">DTDC Air Cargo</option>
              <option value="Dedicated Factory Truck">Dedicated Factory Truck</option>
            </select>
          </FormField>

          <FormField
            label="Consignment / Tracking Number"
            id="disp-tracking"
            required
            error={errors.trackingNo}
            helperText="e.g. SFX-998241 or BLU-109284"
          >
            <input
              type="text"
              id="disp-tracking"
              className="form-input"
              placeholder="e.g. SFX-984210"
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
            />
          </FormField>
        </div>

        {/* Items to Dispatch */}
        <div className="section-title mb-2">Reserved Items for Picking & Dispatch</div>
        {dispatchItems.length === 0 ? (
          <div className="alert-callout alert-callout-warning">
            <AlertTriangle size={18} className="callout-icon" />
            <div className="callout-text">
              No reserved stock found for this order. Please reserve stock in the Sales Order before generating a dispatch note.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Product</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Reserved Qty</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Dispatch Qty</th>
                  <th style={{ width: '25%' }}>Batch / Serial Tracking</th>
                </tr>
              </thead>
              <tbody>
                {dispatchItems.map((item) => (
                  <tr key={item.productId}>
                    <td className="font-medium">{item.productName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-info px-2 py-0.5 rounded text-xs font-semibold">
                        {item.reservedQty}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input input-sm text-center"
                        min="1"
                        max={item.reservedQty}
                        value={item.dispatchQty}
                        onChange={(e) => handleQtyChange(item.productId, e.target.value)}
                      />
                      {errors[`qty_${item.productId}`] && (
                        <div className="text-danger text-xs mt-1">
                          {errors[`qty_${item.productId}`]}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input input-sm"
                        value={item.batchOrSerial}
                        onChange={(e) => handleBatchChange(item.productId, e.target.value)}
                        placeholder="Batch or serial numbers..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
