import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Region, Warehouse } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  MapPin,
  Building2,
  Warehouse as WarehouseIcon,
  Users,
  Plus,
  TrendingUp,
  PackageCheck,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export const RegionsManagement: React.FC = () => {
  const {
    regions,
    warehouses,
    users,
    batches,
    addRegion,
    addWarehouse,
    setSelectedRegionId,
  } = useErpStore();

  const [addRegionModalOpen, setAddRegionModalOpen] = useState(false);
  const [addWarehouseModalOpen, setAddWarehouseModalOpen] = useState(false);
  const [selectedRegionForDepot, setSelectedRegionForDepot] = useState<string>('');

  // Form states for Add Region
  const [regionName, setRegionName] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [headquarters, setHeadquarters] = useState('');
  const [stateName, setStateName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [targetRevenue, setTargetRevenue] = useState('15000000');

  // Form states for Add Warehouse
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whCapacity, setWhCapacity] = useState('25000');
  const [whRegionId, setWhRegionId] = useState(regions[0]?.id || 'reg-west');

  // Stats calculation
  const totalCapacity = warehouses.reduce((sum, w) => sum + (w.capacitySqFt || 0), 0);
  const totalStockValuation = batches.reduce(
    (sum, b) => sum + (b.availableQuantity || 0) * (b.actualUnitCost || 1200),
    0
  );

  const handleCreateRegion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionName || !regionCode) return;

    addRegion({
      name: regionName,
      code: regionCode.toUpperCase(),
      headquarters: headquarters || 'Central City',
      state: stateName || 'Multi-State',
      currency: 'INR',
      managerName: managerName || 'Regional Director',
      targetRevenue: parseFloat(targetRevenue) || 10000000,
    });

    setRegionName('');
    setRegionCode('');
    setHeadquarters('');
    setStateName('');
    setManagerName('');
    setAddRegionModalOpen(false);
  };

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName || !whCode || !whRegionId) return;

    addWarehouse({
      regionId: whRegionId,
      name: whName,
      code: whCode.toUpperCase(),
      address: whAddress || 'Industrial Area Depot',
      capacitySqFt: parseInt(whCapacity, 10) || 20000,
      managerName: 'Store Manager Assig.',
    });

    setWhName('');
    setWhCode('');
    setWhAddress('');
    setWhCapacity('25000');
    setAddWarehouseModalOpen(false);
  };

  const openAddDepotForRegion = (regionId: string) => {
    setWhRegionId(regionId);
    setWhCode(`WH-${regionId.replace('reg-', '').toUpperCase()}-0${warehouses.filter(w => w.regionId === regionId).length + 1}`);
    setAddWarehouseModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Regional Territories & Warehouses
            <Badge variant="purple" size="sm">Admin Master</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise geographic boundaries, fulfillment hubs, storage capacities, and delegated regional leadership.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setWhRegionId(regions[0]?.id || 'reg-west');
              setAddWarehouseModalOpen(true);
            }}
            className="cursor-pointer"
          >
            <WarehouseIcon className="w-4 h-4 mr-1.5 text-slate-600" />
            + Add Warehouse Depot
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setAddRegionModalOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + Add New Region
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1 border-indigo-100">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Operating Zones</span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{regions.length} Regions</div>
          <p className="text-[11px] text-slate-500 font-medium">Pan-India distribution matrix</p>
        </div>

        <div className="glass-card p-4 space-y-1 border-blue-100">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Depots</span>
            <WarehouseIcon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{warehouses.length} Warehouses</div>
          <p className="text-[11px] text-slate-500 font-medium">Fulfillment & dispatch centers</p>
        </div>

        <div className="glass-card p-4 space-y-1 border-emerald-100">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Storage Footprint</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {totalCapacity.toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-500">Sq. Ft.</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Aggregate floor storage capacity</p>
        </div>

        <div className="glass-card p-4 space-y-1 border-amber-100">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Inventory Valuation</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ₹{(totalStockValuation / 10000000).toFixed(2)} Cr
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Consolidated live batch value</p>
        </div>
      </div>

      {/* Regional Territories Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Regional Territories</h2>
          <span className="text-xs text-slate-400 font-medium">Click on any territory to scope active ERP data</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regions.map((reg) => {
            const linkedWh = warehouses.filter((w) => w.regionId === reg.id);
            const salesReps = users.filter((u) => u.assignedRegionId === reg.id && u.role === 'sales');
            const storeManagers = users.filter((u) => u.assignedRegionId === reg.id && u.role === 'store_manager');
            const regBatches = batches.filter((b) => b.regionId === reg.id);
            const regStockQty = regBatches.reduce((acc, b) => acc + (b.availableQuantity || 0), 0);
            const regStockValue = regBatches.reduce(
              (acc, b) => acc + (b.availableQuantity || 0) * (b.actualUnitCost || 1000),
              0
            );

            return (
              <div
                key={reg.id}
                className="glass-card p-5 space-y-4 hover:border-indigo-300 transition-all duration-200 border-slate-200/90 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-indigo-500/20">
                      {reg.code.substring(0, 3)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {reg.name}
                        <Badge variant="success" size="sm">Active</Badge>
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>HQ: {reg.headquarters} ({reg.state})</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRegionId(reg.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all cursor-pointer"
                    title="Scope system to this region"
                  >
                    <span>Scope ERP</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Regional Quick Metrics */}
                <div className="grid grid-cols-3 gap-2.5 py-2.5 px-3 rounded-xl bg-slate-50/80 border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Warehouses</span>
                    <span className="text-sm font-semibold text-slate-800">{linkedWh.length} Depots</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Sales Reps</span>
                    <span className="text-sm font-semibold text-slate-800">{salesReps.length} Assigned</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Stock</span>
                    <span className="text-sm font-semibold text-slate-800">{regStockQty.toLocaleString('en-IN')} Units</span>
                  </div>
                </div>

                {/* Linked Warehouses List */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <WarehouseIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Fulfillment Warehouses & Hubs
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddDepotForRegion(reg.id)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      + Add Depot
                    </button>
                  </div>

                  <div className="space-y-1">
                    {linkedWh.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No warehouses assigned yet.</p>
                    ) : (
                      linkedWh.map((wh) => (
                        <div
                          key={wh.id}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/70 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate">{wh.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{wh.code} • {wh.address}</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded ml-2 shrink-0">
                            {wh.capacitySqFt?.toLocaleString('en-IN')} sq.ft
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warehouses Comprehensive Ledger */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Warehouses & Storage Facilities ({warehouses.length})</CardTitle>
              <CardDescription>
                Physical distribution centers, racking aisles, bay locations, and designated store managers.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWhRegionId(regions[0]?.id || 'reg-west');
                setAddWarehouseModalOpen(true);
              }}
              className="cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Facility
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3 px-3">Facility Name & Code</th>
                <th className="pb-3 px-3">Territory</th>
                <th className="pb-3 px-3">Physical Address</th>
                <th className="pb-3 px-3">Storage Footprint</th>
                <th className="pb-3 px-3">Aisles & Locations</th>
                <th className="pb-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {warehouses.map((wh) => {
                const reg = regions.find((r) => r.id === wh.regionId);
                return (
                  <tr key={wh.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          WH
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{wh.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{wh.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-bold">
                        {reg?.name || wh.regionId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{wh.address}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {wh.capacitySqFt?.toLocaleString('en-IN')} Sq. Ft.
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(wh.locations || []).slice(0, 3).map((loc, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600"
                          >
                            {loc.code}
                          </span>
                        ))}
                        {(wh.locations?.length || 0) > 3 && (
                          <span className="text-[10px] text-slate-400">
                            +{wh.locations.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="success" size="sm">Operational</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Add New Region */}
      <Modal
        isOpen={addRegionModalOpen}
        onClose={() => setAddRegionModalOpen(false)}
        title="Register New Geographic Territory"
        description="Define regional zone boundaries, regional headquarters, and sales quota targets."
      >
        <form onSubmit={handleCreateRegion} className="space-y-4 pt-2">
          <Input
            label="Region / Territory Name"
            placeholder="e.g. Central Zone (Madhya Pradesh & Chhattisgarh)"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Territory Code"
              placeholder="e.g. REG-CENTRAL"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
              required
            />
            <Input
              label="Headquarters City"
              placeholder="e.g. Indore"
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Covered States"
              placeholder="e.g. MP, CG"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
            />
            <Input
              label="Regional Director / Head"
              placeholder="e.g. Alok Singhal"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
            />
          </div>

          <Input
            label="Monthly Regional Sales Target (₹)"
            type="number"
            placeholder="15000000"
            value={targetRevenue}
            onChange={(e) => setTargetRevenue(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddRegionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save & Register Region
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Warehouse Facility */}
      <Modal
        isOpen={addWarehouseModalOpen}
        onClose={() => setAddWarehouseModalOpen(false)}
        title="Commission New Fulfillment Depot"
        description="Add a physical warehouse, distribution depot, or cold storage facility."
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Assigned Territory / Region
            </label>
            <select
              value={whRegionId}
              onChange={(e) => setWhRegionId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              required
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Warehouse / Depot Name"
            placeholder="e.g. Pithampur Industrial Logistics Center"
            value={whName}
            onChange={(e) => setWhName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Facility Code"
              placeholder="e.g. WH-IN-01"
              value={whCode}
              onChange={(e) => setWhCode(e.target.value)}
              required
            />
            <Input
              label="Storage Footprint (Sq. Ft.)"
              type="number"
              placeholder="35000"
              value={whCapacity}
              onChange={(e) => setWhCapacity(e.target.value)}
              required
            />
          </div>

          <Input
            label="Physical Address / Location"
            placeholder="Plot 42, Sector 3, Industrial Area"
            value={whAddress}
            onChange={(e) => setWhAddress(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddWarehouseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Commission Warehouse
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RegionsManagement;
