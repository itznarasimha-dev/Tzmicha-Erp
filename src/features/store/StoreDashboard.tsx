import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Warehouse,
  Boxes,
  Truck,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const StoreDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, batches, inwardReceipts, salesOrders, warehouses, products } = useErpStore();

  const myWarehouseIds = currentUser.assignedWarehouseIds || ['wh-north-01', 'wh-north-02'];

  const regionalBatches = batches.filter((b) => b.regionId === currentUser.assignedRegionId);
  const pendingInward = inwardReceipts.filter(
    (i) => i.regionId === currentUser.assignedRegionId && i.status !== 'stock_available'
  );
  const dispatchQueue = salesOrders.filter(
    (o) => o.regionId === currentUser.assignedRegionId && (o.status === 'reserved' || o.status === 'picking')
  );

  const totalAvailUnits = regionalBatches.reduce((s, b) => s + b.availableQuantity, 0);
  const totalReservedUnits = regionalBatches.reduce((s, b) => s + b.reservedQuantity, 0);

  // Near expiry batches
  const nearExpiryBatches = regionalBatches.filter((b) => b.status === 'near_expiry');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Noida Central Warehouse Operations
            <Badge variant="warning" size="sm">Store Management</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Physical stock inward receipts, batch registration, bin allocations, and sales dispatch fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/store/inward')}
            icon={<PackageCheck className="w-4 h-4 text-emerald-600" />}
          >
            Goods Inward ({pendingInward.length})
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/store/dispatch-queue')}
            icon={<Truck className="w-4 h-4" />}
          >
            Dispatch Queue ({dispatchQueue.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Available In Stock"
          value={`${totalAvailUnits} units`}
          subtitle="Ready for order booking"
          icon={<Boxes className="w-5 h-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 border-emerald-100"
          onClick={() => navigate('/store/stock')}
        />

        <StatCard
          title="Reserved in Queue"
          value={`${totalReservedUnits} units`}
          subtitle={`${dispatchQueue.length} sales orders awaiting dispatch`}
          icon={<Truck className="w-5 h-5 text-blue-600" />}
          iconBgColor="bg-blue-50 border-blue-100"
          onClick={() => navigate('/store/dispatch-queue')}
        />

        <StatCard
          title="Pending Inward Receipts"
          value={pendingInward.length}
          subtitle="Consignments at gate"
          icon={<PackageCheck className="w-5 h-5 text-amber-600" />}
          iconBgColor="bg-amber-50 border-amber-100"
          onClick={() => navigate('/store/inward')}
        />

        <StatCard
          title="Near Expiry Batches"
          value={nearExpiryBatches.length}
          subtitle="Expiring within 60 days"
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          iconBgColor="bg-rose-50 border-rose-100"
          change={{ value: nearExpiryBatches.length > 0 ? 'Action Recommended' : 'Optimal', isPositive: nearExpiryBatches.length === 0 }}
          onClick={() => navigate('/store/stock')}
        />
      </div>

      {/* Dispatch Queue & Inward Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outward Dispatch Queue */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sales Dispatch Queue</CardTitle>
              <CardDescription>Orders reserved by sales reps, ready for multi-batch allocation & dispatch</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/store/dispatch-queue')}>
              Process Queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>

          <div className="space-y-3">
            {dispatchQueue.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                No orders waiting in picking queue.
              </div>
            ) : (
              dispatchQueue.map((o) => (
                <div
                  key={o.id}
                  className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-900 font-mono text-sm">{o.orderNumber}</span>
                      <span className="text-slate-500 ml-2">— {o.customerName}</span>
                    </div>
                    <Badge variant="primary" size="sm">Stock Reserved</Badge>
                  </div>

                  <div className="text-slate-600">
                    Items: {o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-blue-100">
                    <span className="text-[11px] text-slate-400">Rep: {o.salesUserName}</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/store/dispatch-queue')}
                    >
                      Pick & Dispatch
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Expected Goods Inward */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Expected Goods Inward</CardTitle>
              <CardDescription>Consignments arriving from chemical manufacturers</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/store/inward')}>
              Inward Desk <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>

          <div className="space-y-3">
            {pendingInward.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                All inward consignments have been verified and posted to stock.
              </div>
            ) : (
              pendingInward.map((inw) => (
                <div
                  key={inw.id}
                  className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono">{inw.receiptNumber}</span>
                    <Badge variant="warning" size="sm">Awaiting Physical Inspection</Badge>
                  </div>

                  <div className="text-slate-700">
                    <strong>{inw.receivedQuantity} {inw.unit}</strong> of {inw.productName}
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-amber-100">
                    <span>Supplier: {inw.supplierName}</span>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => navigate('/store/inward')}
                    >
                      Verify & Receive
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
