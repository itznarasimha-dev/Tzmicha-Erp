import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/Input';
import { History, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, SlidersHorizontal, Filter } from 'lucide-react';

export const StockMovementsLedger: React.FC = () => {
  const { stockMovements, currentUser } = useErpStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredMovements = stockMovements.filter((m) => {
    const matchesRegion =
      currentUser.role === 'admin' || m.regionId === currentUser.assignedRegionId;
    const matchesType = typeFilter === 'all' || m.movementType === typeFilter;
    const matchesSearch =
      m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.batchNumber && m.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.performedByUserName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesRegion && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Physical Stock Movement Ledger
            <Badge variant="warning" size="sm">Audit Ledger</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable physical stock transaction log: goods inward, outward sales dispatches, inter-depot transfers, and adjustments.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Filter by product, reference #, batch, or actor..."
        />

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white/70"
          >
            <option value="all">All Movement Types</option>
            <option value="inward_receipt">Goods Inward Receipts (+)</option>
            <option value="outward_dispatch">Sales Outward Dispatches (-)</option>
            <option value="transfer_in">Transfers In (+)</option>
            <option value="transfer_out">Transfers Out (-)</option>
            <option value="adjustment_positive">Positive Adjustments (+)</option>
            <option value="adjustment_negative">Negative Adjustments (-)</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Stock Movement Entries ({filteredMovements.length})</CardTitle>
            <CardDescription>Traceable record of physical quantities entering and leaving the warehouse</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Reference #</th>
                <th className="pb-3">Product Name & SKU</th>
                <th className="pb-3">Batch Number</th>
                <th className="pb-3">Warehouse</th>
                <th className="pb-3 text-right">Quantity</th>
                <th className="pb-3 text-right">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredMovements.map((m) => {
                const isInward =
                  m.movementType === 'inward_receipt' ||
                  m.movementType === 'transfer_in' ||
                  m.movementType === 'adjustment_positive';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {isInward ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <Badge
                          size="sm"
                          variant={isInward ? 'success' : 'primary'}
                          className="capitalize font-mono"
                        >
                          {m.movementType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 font-bold font-mono text-indigo-700">{m.referenceId}</td>
                    <td className="py-3">
                      <div className="font-semibold text-slate-900">{m.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.productSku}</div>
                    </td>
                    <td className="py-3 font-mono text-slate-800">{m.batchNumber || '—'}</td>
                    <td className="py-3 text-slate-700">{m.warehouseName}</td>
                    <td
                      className={`py-3 text-right font-extrabold text-sm ${
                        isInward ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isInward ? `+${m.quantity}` : `-${m.quantity}`}
                    </td>
                    <td className="py-3 text-right text-slate-600">{m.performedByUserName}</td>
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
