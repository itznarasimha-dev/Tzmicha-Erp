import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { SalesOrder, BatchAllocation } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import {
  Truck,
  CheckCircle2,
  Boxes,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const DispatchQueue: React.FC = () => {
  const {
    salesOrders,
    batches,
    currentUser,
    allocateAndDispatchOrder,
    warehouses,
  } = useErpStore();

  const [activeOrder, setActiveOrder] = useState<SalesOrder | null>(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Multi-batch allocation state: map of productId -> array of allocations
  const [allocationsMap, setAllocationsMap] = useState<Record<string, BatchAllocation[]>>({});

  const reservedOrders = salesOrders.filter(
    (o) => o.regionId === currentUser.assignedRegionId && o.status === 'reserved'
  );

  const completedOrders = salesOrders.filter(
    (o) => o.regionId === currentUser.assignedRegionId && o.status === 'dispatched'
  );

  const handleOpenDispatch = (order: SalesOrder) => {
    setActiveOrder(order);
    setTrackingNumber(`TRK-EXP-${Math.floor(1000 + Math.random() * 9000)}`);

    // Prepare initial allocations
    const initialMap: Record<string, BatchAllocation[]> = {};
    for (const item of order.items) {
      if (item.allocations && item.allocations.length > 0) {
        initialMap[item.productId] = item.allocations;
      } else {
        // Auto-allocate from available regional batches
        const availableBatches = batches.filter(
          (b) => b.productId === item.productId && b.regionId === order.regionId && (b.availableQuantity > 0 || b.reservedQuantity > 0)
        );

        let remaining = item.quantity;
        const itemAllocs: BatchAllocation[] = [];
        for (const b of availableBatches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, b.availableQuantity + b.reservedQuantity);
          if (take > 0) {
            itemAllocs.push({
              batchId: b.id,
              batchNumber: b.batchNumber,
              allocatedQuantity: take,
            });
            remaining -= take;
          }
        }
        initialMap[item.productId] = itemAllocs;
      }
    }
    setAllocationsMap(initialMap);
    setDispatchModalOpen(true);
  };

  const handleUpdateAllocationQty = (productId: string, batchId: string, newQty: number) => {
    const currentAllocs = allocationsMap[productId] || [];
    const updated = currentAllocs.map((a) => (a.batchId === batchId ? { ...a, allocatedQuantity: newQty } : a));
    setAllocationsMap({ ...allocationsMap, [productId]: updated });
  };

  const handleAddBatchToAllocation = (productId: string, batchId: string, batchNumber: string) => {
    const currentAllocs = allocationsMap[productId] || [];
    if (!currentAllocs.some((a) => a.batchId === batchId)) {
      setAllocationsMap({
        ...allocationsMap,
        [productId]: [...currentAllocs, { batchId, batchNumber, allocatedQuantity: 0 }],
      });
    }
  };

  const handleConfirmDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    // Build allocations array
    const allocationsByItem = Object.entries(allocationsMap).map(([productId, allocations]) => ({
      productId,
      allocations,
    }));

    const result = allocateAndDispatchOrder(
      activeOrder.id,
      allocationsByItem,
      activeOrder.warehouseId || 'wh-north-01',
      trackingNumber
    );

    if (result.success) {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });
      setSuccessBanner(result.message);
      setTimeout(() => setSuccessBanner(''), 5000);
      setDispatchModalOpen(false);
      setActiveOrder(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Picking Queue & Multi-Batch Outward Dispatch
            <Badge variant="warning" size="sm">Noida Central Hub</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Allocate quantities across physical manufacturing batches, print pick lists, and confirm outward vehicle dispatch.
          </p>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold">{successBanner}</span>
        </div>
      )}

      {/* Reserved Orders Awaiting Dispatch */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Orders Ready for Picking & Dispatch ({reservedOrders.length})</CardTitle>
            <CardDescription>
              Stock is reserved against verified sales orders. Confirm multi-batch allocation before dispatch.
            </CardDescription>
          </div>
          <Badge variant="primary" size="sm">Action Required</Badge>
        </CardHeader>

        <div className="space-y-4">
          {reservedOrders.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All reserved orders have been picked and dispatched.
            </div>
          ) : (
            reservedOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-3 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 font-mono">
                        {order.orderNumber}
                      </span>
                      <Badge variant="primary" size="sm">Stock Reserved</Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1">
                      Customer: <strong className="text-slate-900">{order.customerName}</strong> • Sales Rep: <strong>{order.salesUserName}</strong>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenDispatch(order)}
                    icon={<Truck className="w-4 h-4" />}
                  >
                    Allocate Batches & Dispatch
                  </Button>
                </div>

                {/* Items list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-blue-100 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="pb-2">Product Name</th>
                        <th className="pb-2">Quantity to Dispatch</th>
                        <th className="pb-2">Current Batch Allocations</th>
                        <th className="pb-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50 text-slate-700">
                      {order.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 font-semibold text-slate-900">{it.productName}</td>
                          <td className="py-2 font-bold text-indigo-700">{it.quantity} {it.unit}</td>
                          <td className="py-2">
                            {it.allocations && it.allocations.length > 0 ? (
                              it.allocations.map((a, i) => (
                                <span
                                  key={i}
                                  className="inline-block bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono mr-1"
                                >
                                  {a.batchNumber}: {a.allocatedQuantity}
                                </span>
                              ))
                            ) : (
                              <span className="text-amber-700 text-[11px] font-medium">Ready for allocation</span>
                            )}
                          </td>
                          <td className="py-2 text-right font-medium">
                            ₹{Math.round(it.netAmount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {order.notes && (
                  <p className="text-xs text-slate-500 italic bg-white/70 p-2 rounded border border-blue-100">
                    Instructions: {order.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Completed Dispatches Log */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Completed Dispatches ({completedOrders.length})</CardTitle>
            <CardDescription>Confirmed outward goods movement from Noida warehouse</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3">Order Number</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Tracking / Waybill</th>
                <th className="pb-3">Dispatched At</th>
                <th className="pb-3">Dispatched By</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {completedOrders.slice(0, 5).map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/70">
                  <td className="py-3 font-bold text-indigo-700 font-mono">{o.orderNumber}</td>
                  <td className="py-3 font-semibold text-slate-900">{o.customerName}</td>
                  <td className="py-3 font-mono text-emerald-700 font-bold">{o.dispatchTrackingNumber || 'TRK-ND-9921'}</td>
                  <td className="py-3 text-slate-400">
                    {o.dispatchedAt ? new Date(o.dispatchedAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 text-slate-800">{o.dispatchedByUserName || currentUser.name}</td>
                  <td className="py-3 text-right">
                    <Badge variant="success" size="sm">
                      Outward Confirmed
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Multi-Batch Allocation & Dispatch Modal */}
      {activeOrder && (
        <Modal
          isOpen={dispatchModalOpen}
          onClose={() => setDispatchModalOpen(false)}
          title={`Allocate Batches & Confirm Dispatch: ${activeOrder.orderNumber}`}
          description={`Customer: ${activeOrder.customerName} • Destination: Noida Marble Market`}
          maxWidth="2xl"
        >
          <form onSubmit={handleConfirmDispatchSubmit} className="space-y-5">
            <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Boxes className="w-4 h-4" />
                <span>Multi-Batch Fulfillment Supported</span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                You can fulfill each product line from one or multiple available batches.
                The system will automatically record stock deduction and generate outward movements.
              </p>
            </div>

            {/* Line items allocation editor */}
            <div className="space-y-4">
              {activeOrder.items.map((item) => {
                const availableBatchesForProduct = batches.filter(
                  (b) => b.productId === item.productId && b.regionId === activeOrder.regionId && b.status === 'active'
                );

                const currentAllocs = allocationsMap[item.productId] || [];
                const totalAllocated = currentAllocs.reduce((s, a) => s + (a.allocatedQuantity || 0), 0);
                const isMismatch = totalAllocated !== item.quantity;

                return (
                  <div key={item.productId} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{item.productName}</span>
                        <div className="text-[11px] text-slate-500">
                          Total Quantity to Fulfill: <strong className="text-indigo-700">{item.quantity} {item.unit}</strong>
                        </div>
                      </div>

                      <Badge variant={!isMismatch ? 'success' : 'warning'} size="sm">
                        Allocated: {totalAllocated} / {item.quantity}
                      </Badge>
                    </div>

                    {/* Allocations rows */}
                    <div className="space-y-2">
                      {currentAllocs.map((alloc) => {
                        const batchObj = batches.find((b) => b.id === alloc.batchId);
                        return (
                          <div key={alloc.batchId} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border text-xs">
                            <div className="flex-1">
                              <span className="font-bold font-mono text-slate-900">Batch {alloc.batchNumber}</span>
                              <span className="text-slate-400 text-[10px] block">
                                (Avail: {batchObj?.availableQuantity || 0}, Res: {batchObj?.reservedQuantity || 0})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Pick Qty:</span>
                              <input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={alloc.allocatedQuantity}
                                onChange={(e) =>
                                  handleUpdateAllocationQty(
                                    item.productId,
                                    alloc.batchId,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="glass-input w-20 px-2 py-1 rounded text-center font-bold text-slate-900 text-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add another batch selector if multiple batches available */}
                    {availableBatchesForProduct.length > currentAllocs.length && (
                      <div className="flex items-center gap-2 pt-1">
                        <select
                          className="glass-input text-xs py-1 px-2 rounded bg-white text-slate-700"
                          onChange={(e) => {
                            const bId = e.target.value;
                            const bObj = availableBatchesForProduct.find((b) => b.id === bId);
                            if (bObj) {
                              handleAddBatchToAllocation(item.productId, bObj.id, bObj.batchNumber);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>+ Split / Add another batch...</option>
                          {availableBatchesForProduct
                            .filter((b) => !currentAllocs.some((a) => a.batchId === b.id))
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                Batch {b.batchNumber} ({b.availableQuantity} available)
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Input
              label="Dispatch Waybill / Tracking Number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. TRK-EXP-4412"
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setDispatchModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={<Truck className="w-4 h-4" />}>
                Confirm Outward Dispatch
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
