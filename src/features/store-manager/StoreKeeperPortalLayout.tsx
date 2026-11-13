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
    <div className="store-keeper-portal-workspace store-keeper-root w-full max-w-[1600px] mx-auto pb-12 flex flex-col">
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
