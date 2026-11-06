import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  Eye,
  ShoppingBag,
  Truck,
  Building2,
  Users,
  Copy,
  Check,
  Package,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Plus,
  Send,
  History,
  XCircle,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { SalesOrder, PurchaseOrder } from '../../types';
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';

export const AdminOrdersView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    salesOrders,
    purchaseOrders,
    customers,
    suppliers,
    users,
    regions,
    warehouses,
    selectedRegionId,
    currentUser,
    approvePurchaseOrder,
    rejectPurchaseOrder,
    sendPurchaseOrderToSupplier,
  } = useErpStore();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [orderTypeTab, setOrderTypeTab] = useState<'all' | 'sales' | 'purchase'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewSalesOrder, setViewSalesOrder] = useState<SalesOrder | null>(null);
  const [viewPurchaseOrder, setViewPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sync search param if URL changes
  useEffect(() => {
    const urlQuery = searchParams.get('search');
    if (urlQuery) {
      setSearchTerm(urlQuery);
    }
  }, [searchParams]);

  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper maps for ID lookups
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Filter Sales Orders
  const filteredSalesOrders = salesOrders.filter((o) => {
    const matchesRegion = selectedRegionId === 'all' || o.regionId === selectedRegionId;
    const cust = customerMap.get(o.customerId);
    const custCode = cust?.code || '';
    const rep = userMap.get(o.salesUserId);
    const repEmpId = rep?.employeeId || '';

    const query = searchTerm.toLowerCase();
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query) ||
      custCode.toLowerCase().includes(query) ||
      o.salesUserName.toLowerCase().includes(query) ||
      repEmpId.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesRegion && matchesSearch && matchesStatus;
  });

  // Filter Purchase Orders
  const filteredPurchaseOrders = (purchaseOrders || []).filter((po) => {
    const supp = supplierMap.get(po.supplierId);
    const suppCode = supp?.code || '';
    const creator = userMap.get(po.createdByUserId);
    const creatorEmpId = creator?.employeeId || '';

    const query = searchTerm.toLowerCase();
    const matchesSearch =
      po.poNumber.toLowerCase().includes(query) ||
      po.supplierName.toLowerCase().includes(query) ||
      suppCode.toLowerCase().includes(query) ||
      (po.createdByUserName && po.createdByUserName.toLowerCase().includes(query)) ||
      creatorEmpId.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  type UnifiedOrderItem =
    | { kind: 'sales'; data: SalesOrder }
    | { kind: 'purchase'; data: PurchaseOrder };

  const allFilteredOrderItems: UnifiedOrderItem[] = useMemo(() => {
    const list: UnifiedOrderItem[] = [];
    if (orderTypeTab === 'all' || orderTypeTab === 'sales') {
      filteredSalesOrders.forEach((so) => list.push({ kind: 'sales', data: so }));
    }
    if (orderTypeTab === 'all' || orderTypeTab === 'purchase') {
      filteredPurchaseOrders.forEach((po) => list.push({ kind: 'purchase', data: po }));
    }
    return list;
  }, [orderTypeTab, filteredSalesOrders, filteredPurchaseOrders]);

  const paginatedOrderItems = useMemo(() => {
    return allFilteredOrderItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [allFilteredOrderItems, currentPage, pageSize]);

  // Aggregated KPIs
  const totalSalesRevenue = salesOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalProcurementSpend = (purchaseOrders || []).reduce(
    (sum, po) => sum + (po.totalCost || po.totalAmount || 0),
    0
  );
  const dispatchedOrdersCount = salesOrders.filter((o) => o.status === 'dispatched' || o.status === 'completed').length;
  const pendingApprovalsCount = salesOrders.filter((o) => o.status === 'pending_discount_approval').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Orders &amp; Dispatches Hub
            <Badge variant="purple" size="sm">Master Registry</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unified management of Outward Customer Sales Orders (SO) and Inward Supplier Purchase Orders (PO) with traceable Master IDs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/customers')}
            className="text-xs font-semibold"
          >
            <Users className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Customers Directory
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/suppliers')}
            className="text-xs font-semibold"
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Suppliers Registry
          </Button>
        </div>
      </div>

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Orders KPI */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Outbound Sales Orders
            </span>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              ₹{(totalSalesRevenue / 100000).toFixed(1)}L
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              {salesOrders.length} Completed &amp; Active SOs
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Purchase Orders KPI */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Inbound Procurement
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ₹{(totalProcurementSpend / 100000).toFixed(1)}L
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              {purchaseOrders?.length || 0} Inward POs Contracted
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Dispatches KPI */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Fulfillment Rate
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
              {salesOrders.length > 0 ? Math.round((dispatchedOrdersCount / salesOrders.length) * 100) : 100}%
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Verified
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              {dispatchedOrdersCount} Orders Dispatched
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Approvals KPI */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Discount Queue
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {pendingApprovalsCount}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              {pendingApprovalsCount > 0 ? 'Requires Admin Approval' : 'All Orders Cleared'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 border-b sm:border-b-0 pb-2 sm:pb-0 border-slate-100">
          <button
            type="button"
            onClick={() => setOrderTypeTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              orderTypeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Orders ({salesOrders.length + (purchaseOrders?.length || 0)})
          </button>
          <button
            type="button"
            onClick={() => setOrderTypeTab('sales')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              orderTypeTab === 'sales'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Sales Orders SO ({salesOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setOrderTypeTab('purchase')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              orderTypeTab === 'purchase'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Purchase Orders PO ({purchaseOrders?.length || 0})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:max-w-xl justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreatePoOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Inward PO
          </Button>

          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Order #, Customer ID, Supplier ID, Rep..."
            className="w-full text-xs"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white cursor-pointer shrink-0"
          >
            <option value="all">All Statuses</option>
            <option value="dispatched">Dispatched</option>
            <option value="reserved">Reserved (Picking)</option>
            <option value="pending_discount_approval">Pending Approval</option>
            <option value="fully_received">Fully Received (PO)</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {orderTypeTab === 'all'
                ? `Unified Orders Register (${filteredSalesOrders.length + filteredPurchaseOrders.length})`
                : orderTypeTab === 'sales'
                ? `Customer Sales Orders (${filteredSalesOrders.length})`
                : `Inbound Purchase Orders (${filteredPurchaseOrders.length})`}
            </CardTitle>
            <CardDescription>
              Click any order row to inspect allocated product batch numbers, customer master IDs, and shipment tracking.
            </CardDescription>
          </div>
          <Badge variant="neutral" size="sm">
            {orderTypeTab === 'all'
              ? `${filteredSalesOrders.length + filteredPurchaseOrders.length} Records Shown`
              : orderTypeTab === 'sales'
              ? `${filteredSalesOrders.length} Sales Orders`
              : `${filteredPurchaseOrders.length} Purchase Orders`}
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">Order Number &amp; Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer / Supplier Party</th>
                <th className="py-3 px-4">Assigned Representative</th>
                <th className="py-3 px-4 text-right">Net Value</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4 text-center">Fulfillment / Inward</th>
                <th className="py-3 px-4 text-center">Batches &amp; Items</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {/* If no records in either */}
              {((orderTypeTab === 'sales' && filteredSalesOrders.length === 0) ||
                (orderTypeTab === 'purchase' && filteredPurchaseOrders.length === 0) ||
                (orderTypeTab === 'all' && filteredSalesOrders.length === 0 && filteredPurchaseOrders.length === 0)) && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No matching orders found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No transactions matched "{searchTerm}". Try clearing your search or status filter.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </td>
                </tr>
              )}

              {/* 1. SALES ORDERS ROWS */}
              {paginatedOrderItems
                .filter((item): item is { kind: 'sales'; data: SalesOrder } => item.kind === 'sales')
                .map(({ data: so }) => {
                  const cust = customerMap.get(so.customerId);
                  const custCode = cust?.code || `CUST-${so.customerId.slice(-4).toUpperCase()}`;
                  const rep = userMap.get(so.salesUserId);
                  const repEmpId = rep?.employeeId || 'EMP-SLS';
                  const reg = regions.find((r) => r.id === so.regionId);
                  const allocatedBatches = so.items?.flatMap((it) => it.allocations || []) || [];

                  return (
                    <tr
                      key={so.id}
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      onClick={() => setViewSalesOrder(so)}
                    >
                      {/* Order Number & Type */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-2 py-0.5 rounded-lg select-all">
                            {so.orderNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(so.orderNumber, so.id)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Copy Order ID"
                          >
                            {copiedId === so.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-100">
                          OUTWARD SALES
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(so.createdAt).toLocaleDateString('en-IN')}
                      </td>

                      {/* Customer Party & Customer ID */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {so.customerName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-[10px] text-indigo-700 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100 select-all">
                            {custCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(custCode, `cust-${so.id}`)}
                            className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                            title="Copy Customer ID"
                          >
                            {copiedId === `cust-${so.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <span className="text-[10px] text-slate-400 capitalize">• {reg?.name}</span>
                        </div>
                      </td>

                      {/* Sales Rep & Employee ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{so.salesUserName}</div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-100">
                            {repEmpId}
                          </span>
                          <span>• Sales Rep</span>
                        </div>
                      </td>

                      {/* Net Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                        ₹{Math.round(so.totalAmount).toLocaleString('en-IN')}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {so.items?.length || 0} line items
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            so.paymentStatus === 'paid'
                              ? 'success'
                              : so.paymentStatus === 'partially_paid'
                              ? 'warning'
                              : 'neutral'
                          }
                          className="capitalize"
                        >
                          {so.paymentStatus.replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Fulfillment Status & Dispatch Tracking */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            so.status === 'dispatched' || so.status === 'completed'
                              ? 'success'
                              : so.status === 'reserved'
                              ? 'purple'
                              : so.status === 'pending_discount_approval'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {so.status.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        {so.dispatchTrackingNumber && (
                          <span className="block font-mono text-[9px] text-slate-500 mt-0.5">
                            Trk: {so.dispatchTrackingNumber}
                          </span>
                        )}
                      </td>

                      {/* Allocated Batches & SKUs */}
                      <td className="py-3.5 px-4 text-center">
                        {allocatedBatches.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center max-w-[140px] mx-auto">
                            {allocatedBatches.slice(0, 2).map((b, idx) => (
                              <span
                                key={idx}
                                className="font-mono text-[9px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded border border-slate-200"
                              >
                                {b.batchNumber}
                              </span>
                            ))}
                            {allocatedBatches.length > 2 && (
                              <span className="text-[9px] text-slate-400 font-mono">
                                +{allocatedBatches.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Auto Lot</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewSalesOrder(so)}
                          icon={<Eye className="w-3.5 h-3.5 text-indigo-600" />}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}

              {/* 2. PURCHASE ORDERS ROWS */}
              {paginatedOrderItems
                .filter((item): item is { kind: 'purchase'; data: PurchaseOrder } => item.kind === 'purchase')
                .map(({ data: po }) => {
                  const supp = supplierMap.get(po.supplierId);
                  const suppCode = supp?.code || `SUP-${po.supplierId.slice(-4).toUpperCase()}`;
                  const creator = userMap.get(po.createdByUserId);
                  const creatorEmpId = creator?.employeeId || 'EMP-MGR';
                  const poValue = po.totalCost || po.totalAmount || 0;

                  return (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      onClick={() => setViewPurchaseOrder(po)}
                    >
                      {/* PO Number & Type */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-lg select-all">
                            {po.poNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(po.poNumber, po.id)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Copy PO Number"
                          >
                            {copiedId === po.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-100">
                          INWARD PROCUREMENT
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {po.orderDate || '2026-10-20'}
                      </td>

                      {/* Supplier Party & Supplier ID */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {po.supplierName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-[10px] text-emerald-700 bg-emerald-50/80 px-1.5 py-0.2 rounded border border-emerald-100 select-all">
                            {suppCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(suppCode, `supp-${po.id}`)}
                            className="text-slate-400 hover:text-emerald-600 cursor-pointer"
                            title="Copy Supplier ID"
                          >
                            {copiedId === `supp-${po.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <span className="text-[10px] text-slate-400">• Vendor Lot</span>
                        </div>
                      </td>

                      {/* Procurement Officer & Employee ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">
                          {po.createdByUserName || 'Purchasing Desk'}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-100">
                            {creatorEmpId}
                          </span>
                          <span>• Procurement</span>
                        </div>
                      </td>

                      {/* Total Value */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                        ₹{Math.round(poValue).toLocaleString('en-IN')}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {po.lines?.length || 0} consignment lines
                        </span>
                      </td>

                      {/* Payment Terms */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge size="sm" variant="success">
                          Net 30 Invoiced
                        </Badge>
                      </td>

                      {/* Inward Receiving Status */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            po.status === 'fully_received'
                              ? 'success'
                              : po.status === 'partially_received'
                              ? 'warning'
                              : 'primary'
                          }
                        >
                          {po.status.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <span className="block font-mono text-[9px] text-slate-500 mt-0.5">
                          Dest: {po.destinationWarehouseId}
                        </span>
                      </td>

                      {/* Batches & Line SKUs */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-wrap gap-1 justify-center max-w-[140px] mx-auto">
                          {(po.lines || []).slice(0, 2).map((l, idx) => (
                            <span
                              key={idx}
                              className="font-mono text-[9px] bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded border border-emerald-100"
                            >
                              {l.productSku || 'SKU'}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewPurchaseOrder(po)}
                          icon={<Eye className="w-3.5 h-3.5 text-emerald-600" />}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {allFilteredOrderItems.length > pageSize && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(allFilteredOrderItems.length / pageSize)}
              totalItems={allFilteredOrderItems.length}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: SALES ORDER DETAILS (OUTWARD SO)
      ───────────────────────────────────────────────────────────── */}
      {viewSalesOrder && (() => {
        const cust = customerMap.get(viewSalesOrder.customerId);
        const custCode = cust?.code || `CUST-${viewSalesOrder.customerId.slice(-4).toUpperCase()}`;
        const rep = userMap.get(viewSalesOrder.salesUserId);
        const repEmpId = rep?.employeeId || 'EMP-SLS-101';

        return (
          <Modal
            isOpen={!!viewSalesOrder}
            onClose={() => setViewSalesOrder(null)}
            title={`Sales Order: ${viewSalesOrder.orderNumber}`}
            description={`Customer: ${viewSalesOrder.customerName} (${custCode}) • Placed by: ${viewSalesOrder.salesUserName} (${repEmpId})`}
            maxWidth="2xl"
          >
            <div className="space-y-4 text-xs">
              {/* Header ID Card */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      {viewSalesOrder.orderNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(viewSalesOrder.orderNumber, 'modal-so')}
                      className="p-1 rounded text-indigo-600 hover:bg-white"
                      title="Copy Order ID"
                    >
                      {copiedId === 'modal-so' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <Badge variant={viewSalesOrder.status === 'dispatched' ? 'success' : 'primary'}>
                      {viewSalesOrder.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Booked on: {new Date(viewSalesOrder.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Customer Master Account</span>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className="font-bold text-slate-900">{viewSalesOrder.customerName}</span>
                    <span className="font-mono font-bold text-xs text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                      {custCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Subtotal</span>
                  <div className="font-bold text-slate-900 font-mono">
                    ₹{viewSalesOrder.subtotal.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Discount Given</span>
                  <div className="font-bold text-rose-600 font-mono">
                    ₹{viewSalesOrder.totalDiscount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">GST Tax (18%)</span>
                  <div className="font-bold text-slate-900 font-mono">
                    ₹{viewSalesOrder.totalTax.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 uppercase font-semibold">Net Billed</span>
                  <div className="font-extrabold text-indigo-800 font-mono text-sm">
                    ₹{Math.round(viewSalesOrder.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Line Items Table with SKUs & Allocated Batches */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Product Name &amp; SKU</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Rate</th>
                      <th className="py-2 px-3">Disc %</th>
                      <th className="py-2 px-3">Allocated Batches (Lot IDs)</th>
                      <th className="py-2 px-3 text-right">Net Line</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {viewSalesOrder.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          <span className="font-mono text-[10px] text-slate-400">SKU: {item.productSku || 'SKU-STD'}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono">₹{item.standardPrice.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-700 font-mono">{item.discountPercent}%</td>
                        <td className="py-2.5 px-3">
                          {item.allocations && item.allocations.length > 0 ? (
                            item.allocations.map((a, i) => (
                              <span
                                key={i}
                                className="inline-block bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-mono mr-1 mb-0.5"
                              >
                                {a.batchNumber} ({a.allocatedQuantity})
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">Auto-allocated</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          ₹{Math.round(item.netAmount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dispatch Tracking Banner */}
              {viewSalesOrder.dispatchTrackingNumber && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold">Outward Dispatch Tracking: </span>
                      <span className="font-mono font-bold">{viewSalesOrder.dispatchTrackingNumber}</span>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">Outward Verified</Badge>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: PURCHASE ORDER DETAILS (INWARD PO)
      ───────────────────────────────────────────────────────────── */}
      {viewPurchaseOrder && (() => {
        const supp = supplierMap.get(viewPurchaseOrder.supplierId);
        const suppCode = supp?.code || `SUP-${viewPurchaseOrder.supplierId.slice(-4).toUpperCase()}`;
        const creator = userMap.get(viewPurchaseOrder.createdByUserId);
        const creatorEmpId = creator?.employeeId || 'EMP-MGR-001';

        return (
          <Modal
            isOpen={!!viewPurchaseOrder}
            onClose={() => setViewPurchaseOrder(null)}
            title={`Purchase Order: ${viewPurchaseOrder.poNumber}`}
            description={`Supplier: ${viewPurchaseOrder.supplierName} (${suppCode}) • Authorized by: ${viewPurchaseOrder.createdByUserName || 'Purchasing Desk'} (${creatorEmpId})`}
            maxWidth="2xl"
          >
            <div className="space-y-4 text-xs">
              {/* Top ID Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {viewPurchaseOrder.poNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(viewPurchaseOrder.poNumber, 'modal-po')}
                      className="p-1 rounded text-emerald-600 hover:bg-white"
                      title="Copy PO Number"
                    >
                      {copiedId === 'modal-po' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <Badge
                      variant={
                        viewPurchaseOrder.status === 'fully_received'
                          ? 'success'
                          : viewPurchaseOrder.status === 'partially_received'
                          ? 'warning'
                          : viewPurchaseOrder.status === 'approved' || viewPurchaseOrder.status === 'sent_to_supplier'
                          ? 'purple'
                          : viewPurchaseOrder.status === 'rejected'
                          ? 'danger'
                          : 'neutral'
                      }
                    >
                      {viewPurchaseOrder.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Order Date: {viewPurchaseOrder.orderDate || '2026-10-20'} • Destination Depot: <span className="font-mono font-bold text-slate-800">{viewPurchaseOrder.destinationWarehouseId}</span> • Receiving Storekeeper: <span className="font-bold text-indigo-700">{viewPurchaseOrder.assignedStorekeeperName || 'Central Storekeeper'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Vendor Master Account</span>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className="font-bold text-slate-900">{viewPurchaseOrder.supplierName}</span>
                    <span className="font-mono font-bold text-xs text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                      {suppCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifecycle Actions Bar */}
              {(viewPurchaseOrder.status === 'pending_approval' || viewPurchaseOrder.status === 'draft' || viewPurchaseOrder.status === 'approved') && (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-900 block text-[11px]">
                      PO Approval &amp; Supplier Dispatch Lifecycle
                    </span>
                    <span className="text-[10px] text-amber-700">
                      Stock is strictly held until the supplier delivers and the regional storekeeper accepts the inward count.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {(viewPurchaseOrder.status === 'pending_approval' || viewPurchaseOrder.status === 'draft') && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            rejectPurchaseOrder(viewPurchaseOrder.id, currentUser.name, 'Admin declined order.');
                            setViewPurchaseOrder({ ...viewPurchaseOrder, status: 'rejected' });
                          }}
                          icon={<XCircle className="w-3.5 h-3.5 text-rose-600" />}
                        >
                          Reject PO
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            approvePurchaseOrder(viewPurchaseOrder.id, currentUser.name, 'Approved from Orders Dashboard');
                            setViewPurchaseOrder({ ...viewPurchaseOrder, status: 'approved' });
                          }}
                          icon={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        >
                          Approve PO
                        </Button>
                      </>
                    )}

                    {viewPurchaseOrder.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          sendPurchaseOrderToSupplier(viewPurchaseOrder.id);
                          setViewPurchaseOrder({ ...viewPurchaseOrder, status: 'sent_to_supplier' });
                        }}
                        icon={<Send className="w-3.5 h-3.5 text-white" />}
                      >
                        Send to Supplier
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Product Name &amp; SKU</th>
                      <th className="py-2 px-3 text-right">Ordered Qty</th>
                      <th className="py-2 px-3 text-right">Received Qty</th>
                      <th className="py-2 px-3 text-right">Unit Rate</th>
                      <th className="py-2 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(viewPurchaseOrder.lines || []).map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{line.productName || 'Raw Material Formulation'}</div>
                          <span className="font-mono text-[10px] text-slate-400">SKU: {line.productSku || 'RM-SKU'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {line.orderedQty} {line.unit || 'Kg'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                          {line.receivedQty || line.orderedQty} {line.unit || 'Kg'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹{(line.purchaseUnitPrice || (line as any).unitCost || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          ₹{Math.round((line.orderedQty || 0) * (line.purchaseUnitPrice || (line as any).unitCost || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Inward Invoicing & GRN Reconciliation */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">Inward GRN Verification: </span>
                  <span className="text-slate-500">
                    Quality inspection verified, batch labels affixed, warehouse bay allocated.
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total PO Value</span>
                  <span className="font-mono font-black text-sm text-slate-900">
                    ₹{Math.round(viewPurchaseOrder.totalCost || viewPurchaseOrder.totalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Activity History Timeline */}
              {viewPurchaseOrder.activityHistory && viewPurchaseOrder.activityHistory.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    Purchase Order Audit &amp; Event History ({viewPurchaseOrder.activityHistory.length})
                  </span>
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {viewPurchaseOrder.activityHistory.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between text-[11px] gap-2 border-b border-slate-200/50 last:border-0 pb-1.5 last:pb-0">
                        <div>
                          <span className="font-bold text-slate-900">{item.action}</span>
                          <span className="text-slate-500 ml-1.5">by {item.performedBy || item.actor || 'System'}</span>
                          {item.notes && <div className="text-[10px] text-slate-600 italic mt-0.5">{item.notes}</div>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(item.date || item.timestamp || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* Create Inbound PO Modal */}
      {isCreatePoOpen && (
        <CreatePurchaseOrderModal
          isOpen={isCreatePoOpen}
          onClose={() => setIsCreatePoOpen(false)}
          onCreated={(newPo) => {
            setViewPurchaseOrder(newPo);
          }}
        />
      )}
    </div>
  );
};

export default AdminOrdersView;
