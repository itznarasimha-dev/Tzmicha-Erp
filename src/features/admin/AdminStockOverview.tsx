import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/Input';
import { Warehouse, Boxes, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const AdminStockOverview: React.FC = () => {
  const { batches, warehouses, regions, selectedRegionId, setSelectedRegionId } = useErpStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBatches = batches.filter((b) => {
    const matchesRegion = selectedRegionId === 'all' || b.regionId === selectedRegionId;
    const matchesSearch =
      b.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productSku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  const totalAvailable = filteredBatches.reduce((s, b) => s + b.availableQuantity, 0);
  const totalReserved = filteredBatches.reduce((s, b) => s + b.reservedQuantity, 0);
  const totalDispatched = filteredBatches.reduce((s, b) => s + b.dispatchedQuantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Regional Stock Master & Batch Ledger
            <Badge variant="purple" size="sm">Admin Visibility</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consolidated inventory balances across all regional warehouses, storage bays, and manufacturing batches.
          </p>
        </div>

        {/* Region filter */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs">
          <Warehouse className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-700">Filter Region:</span>
          <select
            value={selectedRegionId}
            onChange={(e) => setSelectedRegionId(e.target.value)}
            className="bg-transparent text-indigo-700 font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">All Regions Consolidated</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Available Stock</p>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{totalAvailable} units</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Ready for immediate sales order booking</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-blue-200 bg-blue-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Reserved Stock</p>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{totalReserved} units</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Allocated to pending warehouse dispatch</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-purple-200 bg-purple-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Dispatched (Outward)</p>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{totalDispatched} units</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Completed customer deliveries</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Warehouse className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex justify-between items-center">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by Product, Batch Number or SKU..."
        />
        <div className="text-xs text-slate-500">
          Showing <strong>{filteredBatches.length}</strong> active batches
        </div>
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Physical Batch Registry</CardTitle>
            <CardDescription>
              Shows batch manufacturing, expiration dates, actual unit cost, and allocated quantities.
            </CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3 px-1">Batch Number</th>
                <th className="pb-3 px-1">Product Name & SKU</th>
                <th className="pb-3 px-1">Warehouse & Region</th>
                <th className="pb-3 px-1 text-center">Available</th>
                <th className="pb-3 px-1 text-center">Reserved</th>
                <th className="pb-3 px-1 text-center">Dispatched</th>
                <th className="pb-3 px-1">Actual Unit Cost</th>
                <th className="pb-3 px-1">Expiry Date</th>
                <th className="pb-3 px-1 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredBatches.map((b) => {
                const wh = warehouses.find((w) => w.id === b.warehouseId);
                const reg = regions.find((r) => r.id === b.regionId);
                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-1 font-bold text-slate-900 font-mono">{b.batchNumber}</td>
                    <td className="py-3 px-1">
                      <div className="font-semibold text-slate-900">{b.productName}</div>
                      <div className="text-[11px] text-slate-500">SKU: {b.productSku}</div>
                    </td>
                    <td className="py-3 px-1">
                      <div className="text-slate-800">{wh?.name}</div>
                      <div className="text-[10px] text-indigo-700 font-semibold">{reg?.name}</div>
                    </td>
                    <td className="py-3 px-1 text-center font-bold text-emerald-700 font-mono">{b.availableQuantity}</td>
                    <td className="py-3 px-1 text-center font-bold text-blue-700 font-mono">{b.reservedQuantity}</td>
                    <td className="py-3 px-1 text-center font-bold text-purple-700 font-mono">{b.dispatchedQuantity}</td>
                    <td className="py-3 px-1 font-bold text-rose-700 font-mono bg-rose-50/60 px-2 rounded">
                      ₹{b.actualUnitCost.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-1 text-slate-600">
                      {b.expiryDate}
                      {b.status === 'near_expiry' && (
                        <span className="block text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Near Expiry
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-1 text-right">
                      <Badge
                        size="sm"
                        variant={b.status === 'active' ? 'success' : b.status === 'near_expiry' ? 'warning' : 'danger'}
                      >
                        {b.status.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
