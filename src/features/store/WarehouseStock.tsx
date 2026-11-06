import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/Input';
import { Boxes, Warehouse, AlertTriangle, MapPin } from 'lucide-react';

export const WarehouseStock: React.FC = () => {
  const { batches, warehouses, currentUser } = useErpStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('all');

  const regionalWarehouses = warehouses.filter((w) => w.regionId === currentUser.assignedRegionId);

  const filteredBatches = batches.filter((b) => {
    const matchesRegion = b.regionId === currentUser.assignedRegionId;
    const matchesWarehouse = selectedWarehouseId === 'all' || b.warehouseId === selectedWarehouseId;
    const matchesSearch =
      b.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productSku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRegion && matchesWarehouse && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Physical Product & Batch Inventory
            <Badge variant="warning" size="sm">North Territory Bins</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time physical stock counts organized by warehouse, manufacturing batch, and storage bay.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Filter by product, batch # or SKU..."
        />

        <select
          value={selectedWarehouseId}
          onChange={(e) => setSelectedWarehouseId(e.target.value)}
          className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white/70"
        >
          <option value="all">All Regional Warehouses</option>
          {regionalWarehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Physical Batch Registry ({filteredBatches.length} batches)</CardTitle>
            <CardDescription>
              Quantity available for sale vs reserved against customer sales orders
            </CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3">Batch Number</th>
                <th className="pb-3">Product Name & SKU</th>
                <th className="pb-3">Storage Bay</th>
                <th className="pb-3 text-center">Available Units</th>
                <th className="pb-3 text-center">Reserved Units</th>
                <th className="pb-3 text-center">Dispatched</th>
                <th className="pb-3">Expiry Date</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredBatches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70">
                  <td className="py-3 font-bold text-slate-900 font-mono text-sm">{b.batchNumber}</td>
                  <td className="py-3">
                    <div className="font-semibold text-slate-900">{b.productName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{b.productSku}</div>
                  </td>
                  <td className="py-3">
                    <span className="inline-block bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-800">
                      {b.locationId}
                    </span>
                  </td>
                  <td className="py-3 text-center font-extrabold text-emerald-700 text-sm">
                    {b.availableQuantity}
                  </td>
                  <td className="py-3 text-center font-bold text-blue-600">
                    {b.reservedQuantity}
                  </td>
                  <td className="py-3 text-center text-slate-500">
                    {b.dispatchedQuantity}
                  </td>
                  <td className="py-3 text-slate-600">
                    {b.expiryDate}
                    {b.status === 'near_expiry' && (
                      <span className="block text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> Near Expiry
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <Badge
                      size="sm"
                      variant={b.status === 'active' ? 'success' : b.status === 'near_expiry' ? 'warning' : 'danger'}
                    >
                      {b.status.replace('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
