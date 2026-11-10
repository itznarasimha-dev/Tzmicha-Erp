import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../../store/useErpStore';
import {
  Boxes,
  Truck,
  PackageCheck,
  ArrowRightLeft,
  CheckSquare,
  ShieldCheck,
  AlertCircle,
  Warehouse,
  ChevronDown,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  Factory,
  CheckCircle2,
  Package,
  Wallet,
  AlertTriangle,
  PlusCircle,
  FileText,
  Upload,
  X,
  MapPin,
  Calendar,
  Building2,
  Check,
  Search,
  ExternalLink,
  RefreshCw,
  WifiOff,
  LayoutDashboard,
  Layers,
  SendHorizontal,
  ClipboardCheck,
  AlertOctagon,
} from 'lucide-react';
import type { CustomerDispatch, ReceivingDiscrepancy, ExpenseCategory } from '../../../types';
import { useStoreManagerOverview } from './hooks/useStoreManagerOverview';
import { DashboardSummaryCards } from './components/DashboardSummaryCards';
import { WorkspaceStatusOverview } from './components/WorkspaceStatusOverview';
import { QuickActions } from './components/QuickActions';
import { TodaysTaskQueue } from './components/TodaysTaskQueue';
import { DepartmentHandoffPanel } from './components/DepartmentHandoffPanel';
import { StockAlertsPanel } from './components/StockAlertsPanel';
import { RecentWarehouseActivity } from './components/RecentWarehouseActivity';
import { Pagination } from '../../../components/ui/Pagination';

export function StoreManagerOverview({ onMobileMenuOpen }: { onMobileMenuOpen?: () => void }) {
  const navigate = useNavigate();
  void onMobileMenuOpen;

  // ─── Store Manager Overview Hook (Modular Command Center) ───
  const {
    data,
    warehouses: overviewWarehouses,
    currentUser: overviewUser,
    selectedWarehouseId,
    isLoading,
    isRefreshing,
    error,
    setSelectedWarehouseId,
    refresh,
  } = useStoreManagerOverview();

  // ─── Central ERP Store State (Regional Hub & Dispatches) ───
  const {
    currentUser,
    currentOrganization,
    batches,
    inwardReceipts,
    salesOrders,
    stockMovements,
    warehouses,
    purchaseOrders,
    customerDispatches,
    receivingDiscrepancies,
    updateCustomerDispatchStatus,
    reportReceivingDiscrepancy,
    addDispatchDeliveryExpense,
  } = useErpStore();

  const [activeMainTab, setActiveMainTab] = useState<'command_center' | 'regional_hub'>('command_center');

  const isStorekeeper = currentUser?.role === 'store_manager';
  const defaultDepot =
    isStorekeeper && currentUser?.assignedWarehouseIds && currentUser.assignedWarehouseIds.length > 0
      ? currentUser.assignedWarehouseIds[0]
      : 'wh-north-01';

  const [selectedDepot, setSelectedDepot] = useState<string>(defaultDepot);
  const [activeOperationalTab, setActiveOperationalTab] = useState<'dispatches' | 'inbound_pos' | 'batches'>('dispatches');
  const [hoveredDay, setHoveredDay] = useState<string | null>('Wed');

  // Modal states
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedDispatchForExpense, setSelectedDispatchForExpense] = useState<CustomerDispatch | null>(null);

  // Form states
  const [discrepancyForm, setDiscrepancyForm] = useState<{
    batchId: string;
    batchNumber: string;
    productId: string;
    productName: string;
    productSku: string;
    supplierId: string;
    supplierName: string;
    expectedQuantity: number;
    actualCountedQuantity: number;
    shortageQuantity: number;
    damagedQuantity: number;
    discrepancyType: ReceivingDiscrepancy['discrepancyType'];
    reason: string;
    evidenceProofUrl: string;
  }>({
    batchId: 'batch-no-01',
    batchNumber: 'B-2026-001',
    productId: 'prod-001',
    productName: 'ApexFlow Bio-Enzyme Formula A',
    productSku: 'ENZ-BIO-01',
    supplierId: 'SUP-001',
    supplierName: 'Tata Steel Ltd / Apex Chemicals',
    expectedQuantity: 500,
    actualCountedQuantity: 480,
    shortageQuantity: 10,
    damagedQuantity: 10,
    discrepancyType: 'Damaged Goods',
    reason: 'Outer seals torn during transport; carton crushing observed at dock bay.',
    evidenceProofUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
  });

  const [expenseForm, setExpenseForm] = useState<{
    category: ExpenseCategory;
    amount: number;
    description: string;
    receiptAttachment: string;
  }>({
    category: 'transportation_freight',
    amount: 1200,
    description: 'Local delivery freight & temp handling charges for dispatch',
    receiptAttachment: 'delivery_freight_challan_dock.png',
  });

  // Filtered datasets based on selected depot
  const activeWarehouse = warehouses.find((w) => w.id === selectedDepot);
  const assignedRegionName =
    activeWarehouse?.regionId === 'reg-north'
      ? 'North Region (UP / NCR)'
      : activeWarehouse?.regionId === 'reg-west'
      ? 'West Region (Maharashtra)'
      : 'South Region (Karnataka)';

  const activeBatches = batches.filter((b) => selectedDepot === 'all' || b.warehouseId === selectedDepot);
  const totalStockUnits = activeBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
  const totalDamagedUnits = activeBatches.reduce((sum, b) => sum + (b.damagedQuantity || 0), 0);

  const relevantPOs = purchaseOrders.filter(
    (po) => selectedDepot === 'all' || po.destinationWarehouseId === selectedDepot
  );

  const relevantDispatches = customerDispatches.filter(
    (d) => selectedDepot === 'all' || d.originatingWarehouseId === selectedDepot
  );

  const [dispatchPage, setDispatchPage] = useState(1);
  const [dispatchPageSize, setDispatchPageSize] = useState(6);
  const [poPage, setPoPage] = useState(1);
  const [poPageSize, setPoPageSize] = useState(6);
  const [batchPage, setBatchPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(6);

  const paginatedDispatches = relevantDispatches.slice((dispatchPage - 1) * dispatchPageSize, dispatchPage * dispatchPageSize);
  const paginatedPOs = relevantPOs.slice((poPage - 1) * poPageSize, poPage * poPageSize);
  const paginatedBatches = activeBatches.slice((batchPage - 1) * batchPageSize, batchPage * batchPageSize);

  const pendingInwards = inwardReceipts.filter((r) => r.status === 'received');
  const pendingDispatches = salesOrders.filter((o) => o.status === 'picking' || o.status === 'reserved');

  // 7-day warehouse inventory movement chart
  const weeklyMovements = [
    { day: 'Sun', height: 35, isCurrent: false, value: '140 Units' },
    { day: 'Mon', height: 75, isCurrent: false, value: '480 Units' },
    { day: 'Tue', height: 55, isCurrent: false, value: '310 Units' },
    { day: 'Wed', height: 85, isCurrent: true, value: '540 Units In/Out' },
    { day: 'Thu', height: 65, isCurrent: false, value: '390 Units' },
    { day: 'Fri', height: 50, isCurrent: false, value: '280 Units' },
    { day: 'Sat', height: 30, isCurrent: false, value: '110 Units' },
  ];

  const handleOpenDiscrepancyForBatch = (b: (typeof activeBatches)[0]) => {
    setDiscrepancyForm({
      batchId: b.id,
      batchNumber: b.batchNumber,
      productId: b.productId,
      productName: b.productName,
      productSku: b.productSku || 'SKU-001',
      supplierId: b.supplierId || 'SUP-001',
      supplierName: b.supplierName || 'Primary Supplier',
      expectedQuantity: b.totalQuantity || b.initialQuantity,
      actualCountedQuantity: b.availableQuantity,
      shortageQuantity: 0,
      damagedQuantity: b.damagedQuantity || 5,
      discrepancyType: 'Damaged Goods',
      reason: 'Physical inspection discrepancy identified during depot count.',
      evidenceProofUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
    });
    setIsDiscrepancyModalOpen(true);
  };

  const handleSubmitDiscrepancy = (e: React.FormEvent) => {
    e.preventDefault();
    reportReceivingDiscrepancy({
      batchId: discrepancyForm.batchId,
      batchNumber: discrepancyForm.batchNumber,
      supplierId: discrepancyForm.supplierId,
      supplierName: discrepancyForm.supplierName,
      productId: discrepancyForm.productId,
      productName: discrepancyForm.productName,
      productSku: discrepancyForm.productSku,
      expectedQuantity: Number(discrepancyForm.expectedQuantity),
      actualCountedQuantity: Number(discrepancyForm.actualCountedQuantity),
      shortageQuantity: Number(discrepancyForm.shortageQuantity),
      damagedQuantity: Number(discrepancyForm.damagedQuantity),
      discrepancyType: discrepancyForm.discrepancyType,
      reason: discrepancyForm.reason,
      evidenceProofUrl: discrepancyForm.evidenceProofUrl,
    });
    setIsDiscrepancyModalOpen(false);
  };

  const handleOpenExpenseForDispatch = (dsp: CustomerDispatch) => {
    setSelectedDispatchForExpense(dsp);
    setExpenseForm({
      category: 'transportation_freight',
      amount: 1500,
      description: `Delivery freight & unloading for ${dsp.dispatchNumber} (${dsp.customerName})`,
      receiptAttachment: 'delivery_toll_freight_receipt.png',
    });
    setIsExpenseModalOpen(true);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispatchForExpense) return;
    addDispatchDeliveryExpense(selectedDispatchForExpense.id, {
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      description: expenseForm.description,
      paidByUserId: currentUser.id,
      paidByUserName: currentUser.name,
      proofType: 'receipt',
      proofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
      receiptAttachment: expenseForm.receiptAttachment,
    });
    setIsExpenseModalOpen(false);
    setSelectedDispatchForExpense(null);
  };

  return (
    <div className="page-enter space-y-6">
      {/* ─── UNIFIED PAGE HEADER & TOP TAB RIBBON ─── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#74d138]/15 text-[#3b7c14] border border-[#74d138]/30">
                Store Operations Command Center
              </span>
              <span className="text-xs text-slate-400 font-medium">8 Warehouse Workspaces Connected</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Manager Overview</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Live multi-depot operational visibility across goods receiving, inventory traceability, production materials, quality release, and customer dispatches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Warehouse selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-1.5 shadow-sm">
              <Warehouse size={15} className="text-slate-500" />
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-2"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                id="header-wh-select"
                aria-label="Select Warehouse"
              >
                {overviewWarehouses.length > 1 && (
                  <option value="ALL">All Assigned Warehouses</option>
                )}
                {overviewWarehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.code} — {wh.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh button */}
            <button
              onClick={refresh}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
              title="Refresh overview metrics"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tab Ribbon for Overview vs Regional Hub */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveMainTab('command_center')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'command_center'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-lime-400" />
            <span>Overview Command Center</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20 text-white">
              8 Workspaces
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('regional_hub')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'regional_hub'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Regional Depot Dispatches &amp; Claims</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-700">
              {relevantDispatches.length} Orders
            </span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* VIEW 1: AUTHENTIC 8-SECTION COMMAND CENTER                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeMainTab === 'command_center' && (
        <div className="space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="alert-banner error" role="alert" aria-live="assertive">
              <WifiOff size={16} />
              <div>
                <strong>Data Unavailable:</strong> {error}{' '}
                <button
                  className="btn btn-ghost"
                  style={{ marginLeft: '8px', padding: '2px 10px', fontSize: '12px' }}
                  onClick={refresh}
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Refreshing Banner */}
          {isRefreshing && !isLoading && (
            <div className="alert-banner warning" role="status" aria-live="polite">
              <RefreshCw size={14} className="refresh-spin" />
              <span>Refreshing dashboard data…</span>
            </div>
          )}

          {/* Section 1: Quick Actions */}
          <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Quick Operational Actions</h3>
                <p className="text-xs text-slate-500">Jump directly into any primary warehouse transaction or task</p>
              </div>
            </div>
            <QuickActions currentUser={overviewUser} />
          </section>

          {/* Section 2: Dashboard Summary Cards */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Executive Warehouse KPIs</h3>
              <span className="text-xs text-slate-400">Click any card to filter corresponding workspace</span>
            </div>
            <DashboardSummaryCards metrics={data?.metrics ?? null} isLoading={isLoading} />
          </section>

          {/* Section 3: Workspace Status Overview (All 8 Workspaces) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Warehouse Workspace Status Overview</h3>
                <p className="text-xs text-slate-500">Live health, open count, and status across all 8 specialized functional centres</p>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                8 Centers Monitored
              </span>
            </div>
            <WorkspaceStatusOverview statuses={data?.workspaceStatuses ?? null} isLoading={isLoading} />
          </section>

          {/* Section 4: Today's Task Queue */}
          <section>
            <TodaysTaskQueue tasks={data?.tasks ?? null} isLoading={isLoading} />
          </section>

          {/* Section 5: Department Hand-offs */}
          <section>
            <DepartmentHandoffPanel handoffs={data?.handoffs ?? null} isLoading={isLoading} />
          </section>

          {/* Section 6: Stock Alerts */}
          <section>
            <StockAlertsPanel alerts={data?.alerts ?? null} isLoading={isLoading} />
          </section>

          {/* Section 7: Recent Warehouse Activity */}
          <section>
            <RecentWarehouseActivity activity={data?.recentActivity ?? null} isLoading={isLoading} />
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* VIEW 2: REGIONAL DEPOT DISPATCHES & CLAIMS HUB            */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeMainTab === 'regional_hub' && (
        <div className="space-y-6">
          {/* Operational Scope & Wallet Strip */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-lime-400/20 border border-lime-400/30 text-lime-400 flex items-center justify-center shrink-0">
                <Warehouse className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-lime-400">
                    {isStorekeeper ? 'Assigned Regional Depot Desk' : 'Executive Depot Overview'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 font-mono text-slate-300">
                    {activeWarehouse ? `${activeWarehouse.name} (${activeWarehouse.code})` : 'All Regional Depots'}
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
                  <span>{assignedRegionName}</span>
                  <span className="text-xs font-normal text-slate-400">
                    • Storekeeper: <strong className="text-slate-200">{currentUser?.name || 'Devendra Rawat'}</strong> ({currentUser?.employeeId || 'EMP-STR-301'})
                  </span>
                </div>
              </div>
            </div>

            {/* Operational Wallet & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Storekeeper Wallet</div>
                  <div className="text-base font-bold text-lime-400 font-mono">
                    ₹{(currentUser?.walletBalance || 5000).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/store-manager/expenses')}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Delivery Claims</span>
              </button>
            </div>
          </div>

          {/* Regional Depot Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Available Units</span>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {totalStockUnits.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Ready for Customer Orders</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Active Batches</span>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {activeBatches.length}
              </div>
              <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 block">QR / Barcode Verified</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Damaged / Held</span>
              <div className="text-xl font-bold text-rose-600 mt-1 font-mono">
                {totalDamagedUnits}
              </div>
              <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block">Quarantined from Sellable</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Pending Inwards</span>
              <div className="text-xl font-bold text-amber-600 mt-1 font-mono">
                {pendingInwards.length}
              </div>
              <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">QC &amp; Verification Due</span>
            </div>
          </div>

          {/* Regional Operations & Fulfillment Desk */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Active Regional Logistics &amp; Inward Control
                </span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                  Depot Operations Desk
                </h2>
              </div>

              {/* Sub-Tab Ribbon */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  onClick={() => setActiveOperationalTab('dispatches')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeOperationalTab === 'dispatches'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Outgoing Dispatches ({relevantDispatches.length})</span>
                </button>

                <button
                  onClick={() => setActiveOperationalTab('inbound_pos')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeOperationalTab === 'inbound_pos'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Inbound POs ({relevantPOs.length})</span>
                </button>

                <button
                  onClick={() => setActiveOperationalTab('batches')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeOperationalTab === 'batches'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5 text-amber-600" />
                  <span>Depot Batches ({activeBatches.length})</span>
                </button>
              </div>
            </div>

            {/* TAB 1: OUTGOING CUSTOMER DISPATCHES */}
            {activeOperationalTab === 'dispatches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <p>
                    Showing customer dispatches originating from <strong className="text-slate-800">{activeWarehouse?.name || 'All Depots'}</strong>. Stock is strictly deducted from verified batches.
                  </p>
                  <span className="font-semibold text-indigo-600">
                    {relevantDispatches.filter((d) => d.deliveryStatus === 'in_transit').length} In Transit
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Dispatch ID</th>
                        <th className="py-3 px-4">Sales Order &amp; Customer</th>
                        <th className="py-3 px-4">Originating Batch &amp; Items</th>
                        <th className="py-3 px-4">Carrier &amp; Tracking</th>
                        <th className="py-3 px-4">Delivery Status</th>
                        <th className="py-3 px-4">Delivery Expenses</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedDispatches.map((dsp) => (
                        <tr key={dsp.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {dsp.dispatchNumber}
                            </span>
                            <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                              {dsp.dispatchDate}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{dsp.customerName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Order: <strong className="text-slate-700">{dsp.orderNumber}</strong>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {dsp.items.map((item, idx) => (
                              <div key={idx} className="space-y-0.5">
                                <span className="font-semibold text-slate-800">{item.productName}</span>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 rounded">
                                    {item.batchNumber}
                                  </span>
                                  <span>• {item.quantity} {item.unit}</span>
                                </div>
                              </div>
                            ))}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{dsp.transporterName || 'Dedicated Fleet'}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {dsp.vehicleNumber || 'Vehicle Assigned'} • Track: {dsp.trackingNumber}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  dsp.deliveryStatus === 'delivered'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : dsp.deliveryStatus === 'in_transit'
                                    ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    dsp.deliveryStatus === 'delivered'
                                      ? 'bg-emerald-500'
                                      : dsp.deliveryStatus === 'in_transit'
                                      ? 'bg-indigo-500 animate-pulse'
                                      : 'bg-amber-500'
                                  }`}
                                />
                                {dsp.deliveryStatus === 'in_transit'
                                  ? 'In Transit'
                                  : dsp.deliveryStatus === 'delivered'
                                  ? 'Delivered'
                                  : 'Preparing'}
                              </span>

                              {dsp.deliveryStatus !== 'delivered' && (
                                <button
                                  onClick={() =>
                                    updateCustomerDispatchStatus(
                                      dsp.id,
                                      dsp.deliveryStatus === 'preparing' ? 'in_transit' : 'delivered'
                                    )
                                  }
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                                >
                                  {dsp.deliveryStatus === 'preparing' ? 'Mark Dispatched' : 'Mark Delivered'}
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="font-mono font-bold text-slate-800">
                                ₹{(dsp.totalDeliveryExpenses || 0).toLocaleString('en-IN')}
                              </div>
                              <button
                                onClick={() => handleOpenExpenseForDispatch(dsp)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3 text-indigo-600" />
                                <span>+ Claim Freight</span>
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => navigate('/store-manager/sales-fulfilment')}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Fulfilment</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {relevantDispatches.length > dispatchPageSize && (
                  <Pagination
                    currentPage={dispatchPage}
                    totalPages={Math.ceil(relevantDispatches.length / dispatchPageSize)}
                    totalItems={relevantDispatches.length}
                    itemsPerPage={dispatchPageSize}
                    onPageChange={setDispatchPage}
                    onItemsPerPageChange={(size) => {
                      setDispatchPageSize(size);
                      setDispatchPage(1);
                    }}
                  />
                )}
              </div>
            )}

            {/* TAB 2: INBOUND PURCHASE ORDERS */}
            {activeOperationalTab === 'inbound_pos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <p>Incoming approved purchase orders scheduled for receiving at this depot.</p>
                  <button
                    onClick={() => navigate('/store-manager/receiving')}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Open Receiving Centre &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">PO Number</th>
                        <th className="py-3 px-4">Supplier</th>
                        <th className="py-3 px-4">Expected Delivery</th>
                        <th className="py-3 px-4">Items / SKUs</th>
                        <th className="py-3 px-4">Order Value</th>
                        <th className="py-3 px-4">PO Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedPOs.map((po) => (
                        <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {po.poNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{po.supplierName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">ID: {po.supplierId}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {po.expectedDeliveryDate}
                          </td>
                          <td className="py-3.5 px-4">
                            {po.lines.map((l, idx) => (
                              <div key={idx} className="text-slate-800">
                                {l.productName} ({l.orderedQty} {l.unit})
                              </div>
                            ))}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            ₹{((po as any).totalAmount || po.totalCost || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                              {po.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => navigate('/store-manager/receiving')}
                              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                              Process GRN
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {relevantPOs.length > poPageSize && (
                  <Pagination
                    currentPage={poPage}
                    totalPages={Math.ceil(relevantPOs.length / poPageSize)}
                    totalItems={relevantPOs.length}
                    itemsPerPage={poPageSize}
                    onPageChange={setPoPage}
                    onItemsPerPageChange={(size) => {
                      setPoPageSize(size);
                      setPoPage(1);
                    }}
                  />
                )}
              </div>
            )}

            {/* TAB 3: DEPOT BATCHES */}
            {activeOperationalTab === 'batches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <p>All physical product batches held in this depot location with expiration &amp; damage records.</p>
                  <button
                    onClick={() => navigate('/store-manager/inventory')}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Open Inventory &amp; Traceability &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Batch Number</th>
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">Available Qty</th>
                        <th className="py-3 px-4">Damaged / Held Qty</th>
                        <th className="py-3 px-4">Mfg / Expiry</th>
                        <th className="py-3 px-4">Storage Bay</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedBatches.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                            {b.batchNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{b.productName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">SKU: {b.productSku}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                            {b.availableQuantity} {(b as any).unit || 'Units'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-rose-700">
                            {b.damagedQuantity || 0} {(b as any).unit || 'Units'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {b.manufacturingDate} / <strong className="text-slate-800">{b.expiryDate}</strong>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {b.locationId || 'Bay A-01'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenDiscrepancyForBatch(b)}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Report Damage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {activeBatches.length > batchPageSize && (
                  <Pagination
                    currentPage={batchPage}
                    totalPages={Math.ceil(activeBatches.length / batchPageSize)}
                    totalItems={activeBatches.length}
                    itemsPerPage={batchPageSize}
                    onPageChange={setBatchPage}
                    onItemsPerPageChange={(size) => {
                      setBatchPageSize(size);
                      setBatchPage(1);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: PHYSICAL COUNT & DAMAGE DISCREPANCY REPORTING ─── */}
      {isDiscrepancyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                    Storekeeper Verification
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Batch: {discrepancyForm.batchNumber}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
                  Report Physical Count Discrepancy or Damage
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reported shortages or damaged cargo will be immediately quarantined from sellable inventory and escalated to Admin for Debit Note / Gate Pass resolution.
                </p>
              </div>
              <button
                onClick={() => setIsDiscrepancyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDiscrepancy} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-900">{discrepancyForm.productName}</div>
                <div className="text-slate-500 flex items-center gap-2">
                  <span>
                    SKU: <strong className="font-mono text-slate-700">{discrepancyForm.productSku}</strong>
                  </span>
                  <span>
                    • Supplier: <strong className="text-slate-700">{discrepancyForm.supplierName}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discrepancy Classification</label>
                  <select
                    value={discrepancyForm.discrepancyType}
                    onChange={(e) =>
                      setDiscrepancyForm({
                        ...discrepancyForm,
                        discrepancyType: e.target.value as ReceivingDiscrepancy['discrepancyType'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-indigo-500"
                  >
                    <option value="Damaged Goods">Damaged Goods (Quarantine)</option>
                    <option value="Shortage">Physical Shortage (Missing Units)</option>
                    <option value="Excess Delivery">Excess Quantity Inward</option>
                    <option value="Quality Failure">Quality / Lab Test Failure</option>
                    <option value="Wrong SKU">Wrong Product / Label Mismatch</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expected Batch Qty</label>
                  <input
                    type="number"
                    value={discrepancyForm.expectedQuantity}
                    onChange={(e) =>
                      setDiscrepancyForm({ ...discrepancyForm, expectedQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Physically Counted</label>
                  <input
                    type="number"
                    value={discrepancyForm.actualCountedQuantity}
                    onChange={(e) =>
                      setDiscrepancyForm({ ...discrepancyForm, actualCountedQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-rose-700 block mb-1">Damaged Units (Held)</label>
                  <input
                    type="number"
                    value={discrepancyForm.damagedQuantity}
                    onChange={(e) =>
                      setDiscrepancyForm({ ...discrepancyForm, damagedQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/50 font-mono font-bold text-rose-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-amber-700 block mb-1">Shortage Units</label>
                  <input
                    type="number"
                    value={discrepancyForm.shortageQuantity}
                    onChange={(e) =>
                      setDiscrepancyForm({ ...discrepancyForm, shortageQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/50 font-mono font-bold text-amber-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Storekeeper Notes &amp; Physical Observation
                </label>
                <textarea
                  rows={2}
                  value={discrepancyForm.reason}
                  onChange={(e) => setDiscrepancyForm({ ...discrepancyForm, reason: e.target.value })}
                  placeholder="Describe cargo condition, seal status, carton crushing or packing defects..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-indigo-500"
                  required
                />
              </div>

              {/* Photographic Evidence Attachment */}
              <div className="p-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                  <img
                    src={discrepancyForm.evidenceProofUrl}
                    alt="Damaged cargo preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-800 block">Photographic Damage Proof</span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    dock_damage_photo_bay3.jpg • Geo-verified at warehouse dock
                  </span>
                </div>
                <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Verified
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDiscrepancyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Submit Discrepancy to Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: DISPATCH DELIVERY EXPENSE CLAIM ─── */}
      {isExpenseModalOpen && selectedDispatchForExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold border border-indigo-200">
                  {selectedDispatchForExpense.dispatchNumber}
                </span>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
                  Record Delivery &amp; Freight Expense
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Link fuel, loading/unloading, or carrier charges directly to customer dispatch without double-counting.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsExpenseModalOpen(false);
                  setSelectedDispatchForExpense(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-0.5">
                <div className="font-bold text-slate-900">
                  Customer: {selectedDispatchForExpense.customerName}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Order: {selectedDispatchForExpense.orderNumber} • Transporter: {selectedDispatchForExpense.transporterName || 'Fleet'}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-indigo-500"
                >
                  <option value="transportation_freight">Transportation &amp; Line Haul Freight</option>
                  <option value="loading_unloading">Loading &amp; Unloading Hamali Charges</option>
                  <option value="tolls_parking">Tolls, Border Permits &amp; Parking Fees</option>
                  <option value="packaging_handling">Protective Packaging &amp; Strapping</option>
                  <option value="delivery_manpower">Delivery Manpower / Field Escort</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Claim Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-sm"
                    required
                    min={1}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Description</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Receipt / Proof Document</label>
                <div className="p-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="font-mono text-slate-800 text-[11px]">{expenseForm.receiptAttachment}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Challan Attached
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpenseModalOpen(false);
                    setSelectedDispatchForExpense(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-lime-400" />
                  <span>Record &amp; Deduct from Depot Claim</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
