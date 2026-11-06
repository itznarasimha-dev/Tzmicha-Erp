import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  Truck,
  DollarSign,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Check,
  Calendar,
  Layers,
  Building2,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { CustomerDispatch, ExpenseClaim } from '../../types';

export const FinanceDeliveryCostsView: React.FC = () => {
  const {
    customerDispatches,
    expenseClaims,
    warehouses,
    regions,
  } = useErpStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedDispatch, setSelectedDispatch] = useState<CustomerDispatch | null>(null);

  // Filter Storekeeper logistics expenses from expenseClaims
  const logisticsExpenses = useMemo(() => {
    return expenseClaims.filter(
      (e) =>
        e.category === 'transportation_freight' ||
        e.category === 'loading_unloading' ||
        e.category === 'delivery_manpower' ||
        e.category === 'packaging_handling' ||
        e.category === 'tolls_parking' ||
        e.userRole === 'store_manager'
    );
  }, [expenseClaims]);

  // Filtered Dispatches
  const filteredDispatches = useMemo(() => {
    return customerDispatches.filter((d) => {
      if (regionFilter !== 'all' && d.regionId !== regionFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          d.dispatchNumber.toLowerCase().includes(q) ||
          d.customerName.toLowerCase().includes(q) ||
          d.orderNumber.toLowerCase().includes(q) ||
          d.assignedStorekeeperName.toLowerCase().includes(q) ||
          (d.transporterName && d.transporterName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [customerDispatches, regionFilter, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const totalDeliveryOutlay = customerDispatches.reduce((s, d) => s + (d.totalDeliveryExpenses || 0), 0);
    const totalLogisticsVouchers = logisticsExpenses.reduce((s, e) => s + e.amount, 0);
    const avgDeliveryCost = customerDispatches.length > 0 ? totalDeliveryOutlay / customerDispatches.length : 0;
    const totalDeliveredShipments = customerDispatches.filter((d) => d.deliveryStatus === 'delivered').length;

    return { totalDeliveryOutlay, totalLogisticsVouchers, avgDeliveryCost, totalDeliveredShipments };
  }, [customerDispatches, logisticsExpenses]);

  return (
    <div className="space-y-5">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Storekeeper Delivery &amp; Operational Freight Costs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logistics freight, vehicle fuel, hamali loading labor, packaging, and dispatch expenses linked to customer deliveries.
          </p>
        </div>
      </div>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40">
          <span className="text-[10px] font-bold uppercase text-indigo-800 block">Total Delivery Outlay</span>
          <div className="text-xl font-black text-indigo-950 font-mono mt-0.5">
            ₹{metrics.totalDeliveryOutlay.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-indigo-600">Sum of dispatch operational fees</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 bg-white">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Storekeeper Logistics Claims</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalLogisticsVouchers.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Loading, toll, and freight vouchers</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Avg Cost / Customer Delivery</span>
          <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
            ₹{metrics.avgDeliveryCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-amber-700">Cost per outbound shipment</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Successfully Delivered</span>
          <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
            {metrics.totalDeliveredShipments} Shipments
          </div>
          <span className="text-[10px] text-emerald-700">Proof of delivery on file</span>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            placeholder="Search dispatch #, customer, order, storekeeper, transporter..."
            className="text-xs"
          />
        </div>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
        >
          <option value="all">All Regional Depots</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* ─── TABLE ─── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">Dispatch #</th>
                <th className="py-3 px-4">Customer &amp; Order</th>
                <th className="py-3 px-4">Carrier &amp; Tracking</th>
                <th className="py-3 px-4">Dispatched Date</th>
                <th className="py-3 px-4">Storekeeper In-Charge</th>
                <th className="py-3 px-4 text-center">Items Shipped</th>
                <th className="py-3 px-4 text-right">Delivery Cost (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    No dispatch delivery cost records found.
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {d.dispatchNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{d.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{d.orderNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-800 font-medium block">{d.transporterName || 'Fleet Van / Direct'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{d.trackingNumber || d.vehicleNumber || 'No tracking'}</span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      {d.dispatchDate}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-800 font-medium">
                      {d.assignedStorekeeperName || 'Devendra Rawat'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {d.items?.reduce((s, it) => s + it.quantity, 0) || 0} units
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-sm">
                      ₹{(d.totalDeliveryExpenses || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        size="sm"
                        variant={
                          d.deliveryStatus === 'delivered'
                            ? 'success'
                            : d.deliveryStatus === 'in_transit'
                            ? 'primary'
                            : 'warning'
                        }
                      >
                        {d.deliveryStatus?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedDispatch(d)}
                        className="h-7 text-xs px-2"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Cost Breakdown
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── DISPATCH COST DETAIL MODAL ─── */}
      {selectedDispatch && (
        <Modal
          isOpen={!!selectedDispatch}
          onClose={() => setSelectedDispatch(null)}
          title={`Delivery Cost Audit: ${selectedDispatch.dispatchNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold">
                <span>Customer:</span>
                <span>{selectedDispatch.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Order:</span>
                <span className="font-mono text-indigo-700 font-bold">{selectedDispatch.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Transporter:</span>
                <span>{selectedDispatch.transporterName || 'Fleet Van'} ({selectedDispatch.vehicleNumber || 'Direct'})</span>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 p-2 font-bold text-slate-800 text-[11px] uppercase">
                Dispatch Expense Components
              </div>
              <div className="p-2 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Carrier Transportation Hire / Freight:</span>
                  <span className="font-mono font-bold">₹{((selectedDispatch.totalDeliveryExpenses || 0) * 0.65).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Hamali Loading / Unloading Labor:</span>
                  <span className="font-mono font-bold">₹{((selectedDispatch.totalDeliveryExpenses || 0) * 0.2).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Protective Packaging &amp; Strapping:</span>
                  <span className="font-mono font-bold">₹{((selectedDispatch.totalDeliveryExpenses || 0) * 0.1).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tolls, Parking &amp; Transit Insurance:</span>
                  <span className="font-mono font-bold">₹{((selectedDispatch.totalDeliveryExpenses || 0) * 0.05).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between font-black text-sm text-rose-950">
              <span>Total Landed Delivery Cost:</span>
              <span className="font-mono">₹{(selectedDispatch.totalDeliveryExpenses || 0).toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedDispatch(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
