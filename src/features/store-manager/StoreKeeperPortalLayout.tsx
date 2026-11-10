import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PackageCheck,
  Boxes,
  Layers,
  ShieldCheck,
  ArrowRightLeft,
  Truck,
  ClipboardList,
  Receipt,
  MessageSquare,
  Warehouse,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { StoreManagerOverview } from './overview/StoreManagerOverview';
import { ReceivingCentre } from './receiving/ReceivingCentre';
import { InventoryTraceability } from './inventory/InventoryTraceability';
import { ProductionMaterials } from './production-materials/ProductionMaterials';
import { FinishedGoodsQuality } from './finished-goods-quality/FinishedGoodsQuality';
import { TransfersStockCount } from './transfers-stock-count/TransfersStockCount';
import { SalesFulfilment } from './sales-fulfilment/SalesFulfilment';
import { TasksReports } from './tasks-reports/TasksReports';
import { RoleQueriesChatView } from '../shared/RoleQueriesChatView';
import { FieldExpensesSettlement } from '../admin/FieldExpensesSettlement';
import { useErpStore } from '../../store/useErpStore';
import './storeManager.css';

interface StoreKeeperTab {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'neutral' | 'warning' | 'critical' | 'success' | 'purple';
}

export const StoreKeeperPortalLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    batches,
    customerDispatches,
    receivingDiscrepancies,
    warehouses,
    currentUser,
    expenseClaims,
    roleQueries,
  } = useErpStore();

  const pendingExpenses = (expenseClaims || []).filter((e: any) => e.status === 'pending').length;
  const openQueries = (roleQueries || []).filter(
    (q) => (q.requesterRole === 'store_manager' || q.requesterId === currentUser?.id) && q.status === 'open'
  ).length;

  const currentTabId = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/receiving') || p.includes('/inward')) return 'receiving';
    if (p.includes('/inventory') || p.includes('/batches')) return 'inventory';
    if (p.includes('/production-materials')) return 'production-materials';
    if (p.includes('/finished-goods') || p.includes('/damage')) return 'finished-goods';
    if (p.includes('/transfers')) return 'transfers';
    if (p.includes('/sales-fulfilment')) return 'sales-fulfilment';
    if (p.includes('/tasks')) return 'tasks';
    if (p.includes('/expenses')) return 'expenses';
    if (p.includes('/queries') || p.includes('/chat')) return 'queries';
    return 'overview';
  }, [location.pathname]);

  const STORE_KEEPER_TABS: StoreKeeperTab[] = [
    {
      id: 'overview',
      label: 'Overview Command',
      path: '/store-manager/overview',
      icon: LayoutDashboard,
      badge: '8 Workspaces',
      badgeVariant: 'success',
    },
    {
      id: 'receiving',
      label: 'Receiving Centre',
      path: '/store-manager/receiving',
      icon: PackageCheck,
      badge: receivingDiscrepancies.length > 0 ? `${receivingDiscrepancies.length} QC` : '7 Due',
      badgeVariant: 'warning',
    },
    {
      id: 'inventory',
      label: 'Inventory & Traceability',
      path: '/store-manager/inventory',
      icon: Boxes,
      badge: `${batches.length} Lots`,
      badgeVariant: 'warning',
    },
    {
      id: 'production-materials',
      label: 'Production Materials',
      path: '/store-manager/production-materials',
      icon: Layers,
      badge: '4 BOM',
      badgeVariant: 'neutral',
    },
    {
      id: 'finished-goods',
      label: 'Finished Goods & QC',
      path: '/store-manager/finished-goods',
      icon: ShieldCheck,
      badge: '3 QC',
      badgeVariant: 'purple',
    },
    {
      id: 'transfers',
      label: 'Transfers & Count',
      path: '/store-manager/transfers',
      icon: ArrowRightLeft,
      badge: '3 Transit',
      badgeVariant: 'neutral',
    },
    {
      id: 'sales-fulfilment',
      label: 'Fulfilment & Returns',
      path: '/store-manager/sales-fulfilment',
      icon: Truck,
      badge: `${customerDispatches.length || 9} Orders`,
      badgeVariant: 'critical',
    },
    {
      id: 'tasks',
      label: 'Tasks & Reports',
      path: '/store-manager/tasks',
      icon: ClipboardList,
      badge: '7 Tasks',
      badgeVariant: 'neutral',
    },
    {
      id: 'expenses',
      label: 'Expenses & Claims',
      path: '/store-manager/expenses',
      icon: Receipt,
      badge: pendingExpenses > 0 ? pendingExpenses : undefined,
      badgeVariant: 'warning',
    },
    {
      id: 'queries',
      label: 'Queries & Chat',
      path: '/store-manager/queries',
      icon: MessageSquare,
      badge: openQueries > 0 ? openQueries : undefined,
      badgeVariant: 'warning',
    },
  ];

  return (
    <div className="store-keeper-portal-workspace store-keeper-root w-full max-w-[1600px] mx-auto pb-12 space-y-6 flex flex-col">
      {/* ─── UNIFIED STORE KEEPER PORTAL BANNER & WORKSPACE TABS RIBBON ─── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 sm:space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Store Operations &amp; Depot Logistics Hub
              </span>
              <span className="text-xs text-slate-400 font-medium">8 Warehousing Workspaces Connected</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Store Keeper &amp; Warehouse Portal
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Multi-depot operational command: incoming supplier GRN, batch traceability, production BOM kitting, quality releases, stock counts, and sales dispatches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-slate-500" />
              <span>Assigned Depots: <strong className="text-slate-900">{warehouses.length || 3} Warehouses</strong></span>
            </div>
            <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Active Stock Batches: <strong className="text-emerald-950">{batches.length}</strong></span>
            </div>
          </div>
        </div>

        {/* ─── HORIZONTAL WORKSPACE TABS RIBBON ─── */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-slate-100">
          {STORE_KEEPER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTabId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.badgeVariant === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : tab.badgeVariant === 'critical'
                        ? 'bg-rose-100 text-rose-700'
                        : tab.badgeVariant === 'purple'
                        ? 'bg-indigo-100 text-indigo-700'
                        : tab.badgeVariant === 'success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── CHILD WORKSPACE ROUTES ─── */}
      <Routes>
        <Route path="overview" element={<StoreManagerOverview onMobileMenuOpen={() => {}} />} />
        <Route path="receiving" element={<ReceivingCentre onMobileMenuOpen={() => {}} />} />
        <Route path="inward" element={<ReceivingCentre onMobileMenuOpen={() => {}} />} />
        <Route path="inventory" element={<InventoryTraceability onMobileMenuOpen={() => {}} />} />
        <Route path="batches" element={<InventoryTraceability onMobileMenuOpen={() => {}} />} />
        <Route path="production-materials" element={<ProductionMaterials onMobileMenuOpen={() => {}} />} />
        <Route path="finished-goods-quality" element={<FinishedGoodsQuality onMobileMenuOpen={() => {}} />} />
        <Route path="finished-goods" element={<FinishedGoodsQuality onMobileMenuOpen={() => {}} />} />
        <Route path="damage" element={<FinishedGoodsQuality onMobileMenuOpen={() => {}} />} />
        <Route path="transfers-stock-count" element={<TransfersStockCount onMobileMenuOpen={() => {}} />} />
        <Route path="transfers" element={<TransfersStockCount onMobileMenuOpen={() => {}} />} />
        <Route path="sales-fulfilment" element={<SalesFulfilment onMobileMenuOpen={() => {}} />} />
        <Route path="tasks-reports" element={<TasksReports onMobileMenuOpen={() => {}} />} />
        <Route path="tasks" element={<TasksReports onMobileMenuOpen={() => {}} />} />
        <Route path="expenses" element={<FieldExpensesSettlement />} />
        <Route path="queries" element={<RoleQueriesChatView roleContext="store_manager" />} />
        <Route path="chat" element={<RoleQueriesChatView roleContext="store_manager" />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </div>
  );
};
