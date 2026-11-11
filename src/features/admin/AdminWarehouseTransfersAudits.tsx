import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { StockAdjustment } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  Truck,
  Boxes,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Warehouse,
  ShieldCheck,
  TrendingDown,
  Layers,
  FileSpreadsheet,
  Check,
  X,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

interface MockInTransit {
  id: string;
  transferNumber: string;
  sourceWarehouse: string;
  destWarehouse: string;
  productName: string;
  sku: string;
  batchNumber: string;
  quantity: number;
  carrier: string;
  trackingNumber: string;
  dispatchedAt: string;
  eta: string;
  status: 'in_transit' | 'partially_received' | 'delayed';
  totalValue: number;
}

const SEED_IN_TRANSIT: MockInTransit[] = [
  {
    id: 'trf-01',
    transferNumber: 'TRF-2026-0081',
    sourceWarehouse: 'Delhi Central Depot (North)',
    destWarehouse: 'Bhiwandi Hub (West)',
    productName: 'UltraCoat Epoxy Primer 500',
    sku: 'PRM-EPX-500',
    batchNumber: 'B-2610-01',
    quantity: 25,
    carrier: 'BlueDart Express Cargo',
    trackingNumber: 'BD-EXP-88912304',
    dispatchedAt: '2026-10-24 10:30 AM',
    eta: '2026-10-27',
    status: 'in_transit',
    totalValue: 305000,
  },
  {
    id: 'trf-02',
    transferNumber: 'TRF-2026-0084',
    sourceWarehouse: 'Bhiwandi Hub (West)',
    destWarehouse: 'Peenya Central Depot (South)',
    productName: 'HydroShield Slurry Membrane 2K',
    sku: 'WPF-HSD-050',
    batchNumber: 'B-2609-W4',
    quantity: 40,
    carrier: 'TCI Freight Logistics',
    trackingNumber: 'TCI-FR-450912',
    dispatchedAt: '2026-10-23 04:15 PM',
    eta: '2026-10-26',
    status: 'in_transit',
    totalValue: 43200,
  },
  {
    id: 'trf-03',
    transferNumber: 'TRF-2026-0079',
    sourceWarehouse: 'Delhi Central Depot (North)',
    destWarehouse: 'Peenya Central Depot (South)',
    productName: 'TitanGrip PU Sealant Pro',
    sku: 'SLT-TGR-020',
    batchNumber: 'B-2610-03',
    quantity: 30,
    carrier: 'GATI KWE Surface',
    trackingNumber: 'GATI-99021481',
    dispatchedAt: '2026-10-22 09:00 AM',
    eta: '2026-10-25',
    status: 'delayed',
    totalValue: 87000,
  },
];

export const AdminWarehouseTransfersAudits: React.FC = () => {
  const {
    stockAdjustments,
    warehouses,
    batches,
    products,
    approveStockAdjustment,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'transfers' | 'variances' | 'depot_balances'>('transfers');
  const [searchTerm, setSearchTerm] = useState('');
  const [inTransitList, setInTransitList] = useState<MockInTransit[]>(SEED_IN_TRANSIT);
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Variances calculation
  const pendingVariances = stockAdjustments.filter((a) => a.status === 'pending_approval');
  const approvedVariances = stockAdjustments.filter((a) => a.status === 'approved');

  const totalInTransitValue = inTransitList.reduce((sum, item) => sum + item.totalValue, 0);
  const totalShrinkageLoss = approvedVariances
    .filter((a) => a.difference < 0)
    .reduce((sum, a) => sum + Math.abs(a.difference) * 2000, 0); // Approximate cost per unit

  const handleApproveAdjustment = (adjId: string) => {
    approveStockAdjustment(adjId);
    setSuccessMsg('Stock count variance approved and ledger written off successfully!');
    setTimeout(() => setSuccessMsg(null), 3500);
    setSelectedAdjustment(null);
  };

  const getWarehouseName = (whId: string) => {
    return warehouses.find((w) => w.id === whId)?.name || whId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Inter-Depot Transfers & Cycle Count Audits
            <Badge variant="purple" size="sm">Store Keeper Oversight</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Executive audit of multi-warehouse transit inventory, physical stock count variances, and shrinkage write-offs.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'transfers'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In-Transit Transfers ({inTransitList.length})
          </button>
          <button
            onClick={() => setActiveTab('variances')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'variances'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cycle Count Variances ({pendingVariances.length})
          </button>
          <button
            onClick={() => setActiveTab('depot_balances')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'depot_balances'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Depot Balance Reconciler
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">In-Transit Inventory Value</p>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">
              ₹{totalInTransitValue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{inTransitList.length} active consignments on road</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-amber-200 bg-amber-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending Variance Approvals</p>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">{pendingVariances.length} Audits</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Physical count discrepancies</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-rose-200 bg-rose-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Approved Shrinkage Write-offs</p>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">
              ₹{totalShrinkageLoss.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">YTD damage & shortage loss</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Depot Delivery On-Time Rate</p>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">94.8%</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Inter-depot transfer SLA</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TAB 1: IN-TRANSIT WAREHOUSE SHIPMENTS */}
      {activeTab === 'transfers' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Multi-Depot Cargo In-Transit</CardTitle>
              <CardDescription>
                Live monitoring of stock transferred between regional warehouses by store keepers.
              </CardDescription>
            </div>
            <Badge variant="neutral" size="sm">
              BlueDart & TCI Freight Monitored
            </Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">Origin Depot</th>
                  <th className="py-3 px-4">Destination Depot</th>
                  <th className="py-3 px-4">Product & Batch</th>
                  <th className="py-3 px-4 text-right">In-Transit Qty</th>
                  <th className="py-3 px-4 text-right">Cargo Value</th>
                  <th className="py-3 px-4">Transporter & Tracking</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {inTransitList.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{trf.transferNumber}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{trf.sourceWarehouse}</span>
                      <span className="text-[10px] text-slate-400">{trf.dispatchedAt}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{trf.destWarehouse}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{trf.productName}</span>
                      <span className="text-[10px] font-mono text-indigo-600">
                        {trf.batchNumber} ({trf.sku})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {trf.quantity} units
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                      ₹{trf.totalValue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800 block">{trf.carrier}</span>
                      <span className="text-[10px] font-mono text-slate-500">{trf.trackingNumber}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        size="sm"
                        variant={trf.status === 'delayed' ? 'danger' : 'primary'}
                      >
                        {trf.status === 'delayed' ? 'Delayed ETA' : 'On Highway'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                      {trf.eta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: CYCLE COUNT VARIANCES & WRITE-OFFS */}
      {activeTab === 'variances' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Physical Stock Count Audits & Variances</CardTitle>
              <CardDescription>
                Store keeper cycle count discrepancies requiring Admin executive approval before inventory adjustments.
              </CardDescription>
            </div>
            <Badge variant="warning" size="sm">
              {pendingVariances.length} Awaiting Authorization
            </Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Adjustment #</th>
                  <th className="py-3 px-4">Depot</th>
                  <th className="py-3 px-4">Product & Batch</th>
                  <th className="py-3 px-4 text-center">Variance (Qty)</th>
                  <th className="py-3 px-4">Reason & Category</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stockAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No stock count variances recorded.
                    </td>
                  </tr>
                ) : (
                  stockAdjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                        {adj.adjustmentNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {getWarehouseName(adj.warehouseId)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{adj.productName}</span>
                        <span className="text-[10px] font-mono text-slate-500">Batch Ref: {adj.batchId}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-sm">
                        <span
                          className={
                            adj.difference > 0
                              ? 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg'
                              : 'text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg'
                          }
                        >
                          {adj.difference > 0 ? `+${adj.difference}` : adj.difference} units
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block capitalize">
                          {adj.reason.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{adj.notes}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{adj.requestedByUserName}</td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={adj.status === 'approved' ? 'success' : 'warning'}
                        >
                          {adj.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {adj.status === 'pending_approval' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleApproveAdjustment(adj.id)}
                            icon={<Check className="w-3.5 h-3.5" />}
                          >
                            Approve Write-off
                          </Button>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: DEPOT BALANCE RECONCILER */}
      {activeTab === 'depot_balances' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cross-Depot Balance Comparison & Rebalancing</CardTitle>
              <CardDescription>
                Consolidated view of warehouse stock levels to detect regional shortages and trigger replenishment.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 mr-1.5" />
              Export Balance Matrix
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4 text-right">Delhi Central (North)</th>
                  <th className="py-3 px-4 text-right">Bhiwandi Hub (West)</th>
                  <th className="py-3 px-4 text-right">Peenya Hub (South)</th>
                  <th className="py-3 px-4 text-right">Total Available</th>
                  <th className="py-3 px-4 text-center">Stock Health</th>
                  <th className="py-3 px-4 text-right">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((p) => {
                  const pBatches = batches.filter((b) => b.productId === p.id);
                  const northQty = pBatches
                    .filter((b) => b.warehouseId.includes('north'))
                    .reduce((sum, b) => sum + b.availableQuantity, 0);
                  const westQty = pBatches
                    .filter((b) => b.warehouseId.includes('west'))
                    .reduce((sum, b) => sum + b.availableQuantity, 0);
                  const southQty = pBatches
                    .filter((b) => b.warehouseId.includes('south'))
                    .reduce((sum, b) => sum + b.availableQuantity, 0);
                  const total = northQty + westQty + southQty;
                  const isCritical = total < p.lowStockThreshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{p.sku}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {northQty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {westQty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {southQty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-900 text-sm">
                        {total} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge size="sm" variant={isCritical ? 'danger' : total > 50 ? 'success' : 'warning'}>
                          {isCritical ? 'Low Stock' : total > 50 ? 'Optimal' : 'Moderate'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {northQty > 40 && southQty < 15 ? (
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            Transfer North ➔ South
                          </span>
                        ) : isCritical ? (
                          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            Raise PO
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Balanced</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
