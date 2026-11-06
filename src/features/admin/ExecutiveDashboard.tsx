import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { calculateFinanceMetrics } from '../../services/financeService';
import {
  TrendingUp,
  Boxes,
  Truck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Target,
  ArrowRight,
  Warehouse,
  PackageCheck,
  CheckSquare,
  Landmark,
  ArrowRightLeft,
  ChevronDown,
  FileText,
  CreditCard,
  Shield,
  Activity,
  History,
  Percent,
  CalendarCheck,
  AlertTriangle,
  MapPin,
} from 'lucide-react';

export const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentOrganization,
    salesOrders,
    batches,
    customers,
    suppliers,
    inwardReceipts,
    warehouses,
    regions,
    users,
    expenseClaims,
    stockMovements,
    selectedRegionId,
    purchaseOrders,
    customerDispatches,
    receivingDiscrepancies,
  } = useErpStore();

  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'YTD'>('7d');
  const [hoveredDay, setHoveredDay] = useState<string | null>('Wed');

  const finance = calculateFinanceMetrics(
    salesOrders,
    batches,
    customers,
    expenseClaims,
    stockMovements,
    selectedRegionId
  );

  const pendingDiscounts = salesOrders.filter((o) => o.status === 'pending_discount_approval');
  const pendingExpenses = expenseClaims.filter((e) => e.status === 'submitted');
  const totalPending = pendingDiscounts.length + pendingExpenses.length;

  const totalStockUnits = batches
    .filter((b) => selectedRegionId === 'all' || b.regionId === selectedRegionId)
    .reduce((sum, b) => sum + b.availableQuantity, 0);

  const pendingInwards = inwardReceipts.filter((r) => r.status === 'received' || r.status === 'draft');
  const totalReceivables = customers.reduce(
    (sum, c) => sum + (c.currentOutstanding || 0),
    0
  );
  const overLimitCustomers = customers.filter(
    (c) => (c.currentOutstanding || 0) > c.creditLimit && c.creditLimit > 0
  );

  // Supply Chain & Operational Logistics Metrics
  const totalPOs = purchaseOrders.length;
  const poDrafts = purchaseOrders.filter((po) => po.status === 'draft').length;
  const poPendingApproval = purchaseOrders.filter((po) => po.status === 'pending_approval').length;
  const poActiveSent = purchaseOrders.filter((po) => po.status === 'approved' || po.status === 'sent_to_supplier').length;
  const poReceiving = purchaseOrders.filter((po) => po.status === 'partially_received' || po.status === 'fully_received').length;

  const totalExpectedInboundUnits = purchaseOrders
    .filter((po) => po.status !== 'cancelled' && po.status !== 'rejected')
    .reduce((sum, po) => sum + po.lines.reduce((s, l) => s + (l.orderedQuantity || l.orderedQty || 0), 0), 0);
  const totalReceivedInboundUnits = inwardReceipts.reduce((sum, r) => sum + (r.receivedQuantity || 0), 0);
  const totalAcceptedInboundUnits = inwardReceipts.reduce((sum, r) => sum + (r.acceptedQuantity || r.receivedQuantity || 0), 0);

  const totalDamagedBatchUnits = batches.reduce(
    (sum, b) => sum + (b.damagedQuantity || 0) + (b.inspectionStatus === 'quarantined' ? b.availableQuantity : 0),
    0
  );

  const openDiscrepancies = receivingDiscrepancies.filter(
    (d) => d.status === 'pending_review' || (d.status as string) === 'open'
  );
  const totalDiscrepancyImpact = openDiscrepancies.reduce(
    (sum, d) => sum + (d.financialImpact || d.financialValueAffected || 0),
    0
  );

  const inTransitDispatches = customerDispatches.filter((d) => d.deliveryStatus === 'in_transit').length;
  const deliveredDispatches = customerDispatches.filter((d) => d.deliveryStatus === 'delivered').length;
  const totalDeliveryExpenses =
    customerDispatches.reduce((sum, d) => sum + (d.totalDeliveryExpenses || 0), 0) +
    expenseClaims
      .filter((e) =>
        ['transportation_freight', 'loading_unloading', 'delivery_manpower', 'packaging_handling', 'tolls_parking'].includes(
          e.category
        )
      )
      .reduce((sum, e) => sum + e.amount, 0);

  // Weekly sales trend data
  const weeklyData = [
    { day: 'Sun', height: 40, isCurrent: false, value: '₹1,20,000' },
    { day: 'Mon', height: 65, isCurrent: false, value: '₹2,95,000' },
    { day: 'Tue', height: 52, isCurrent: false, value: '₹2,10,000' },
    { day: 'Wed', height: 88, isCurrent: true, value: `₹${Math.round(finance.totalSalesRevenue * 0.28).toLocaleString('en-IN')}` },
    { day: 'Thu', height: 60, isCurrent: false, value: '₹2,40,000' },
    { day: 'Fri', height: 48, isCurrent: false, value: '₹1,85,000' },
    { day: 'Sat', height: 35, isCurrent: false, value: '₹1,15,000' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── TOP EXECUTIVE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="pill-badge text-indigo-700 bg-indigo-50/80 border-indigo-200">
              {currentOrganization?.plan || 'Enterprise'} Plan
            </span>
            <span className="text-xs text-slate-400 font-normal">
              Team ID: <strong className="font-mono text-slate-800 font-medium">{currentOrganization?.teamId || 'APEX-2026'}</strong>
            </span>
          </div>
          <h1 className="editorial-title text-2xl sm:text-3xl tracking-tight text-slate-900">
            Executive Operations Overview
          </h1>
          <p className="editorial-subtitle text-xs text-slate-500 mt-0.5">
            Consolidated enterprise metrics, multi-depot stock, dispatch governance, and audit stats for{' '}
            <strong className="text-slate-900 font-medium">{currentOrganization?.name || 'Tzmicha ERP & Manufacturing Ltd'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/subscription')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-700 transition-all shadow-xs cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>Subscription &amp; Billing</span>
          </button>

          <button
            onClick={() => navigate('/admin/attendance')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-all shadow-xs cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Attendance &amp; Leaves</span>
          </button>

          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-all shadow-xs cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Audit Logs</span>
          </button>

          {totalPending > 0 ? (
            <button
              onClick={() => navigate('/admin/approvals')}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-900 transition-all shadow-xs cursor-pointer"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>{totalPending} Pending Approvals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              All Approvals Cleared
            </span>
          )}
        </div>
      </div>

      {/* ─── ROW 1: 4 KEY ADMIN METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Total Consolidated Revenue */}
        <div
          onClick={() => navigate('/admin/orders')}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-[0.06em]">
                Sales Revenue
              </span>
              <span className="pill-badge text-emerald-700 bg-emerald-50/80 border-emerald-200">
                <TrendingUp className="w-3 h-3" /> +18.4%
              </span>
            </div>
            <div className="stat-value-billion text-2xl sm:text-3xl text-slate-900 mt-2">
              ₹{Math.round(finance.totalSalesRevenue).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>{salesOrders.length} confirmed orders</span>
            <span className="text-indigo-600 font-medium group-hover:translate-x-0.5 transition-transform">
              Orders →
            </span>
          </div>
        </div>

        {/* Metric 2: Regional Inventory Landed Valuation */}
        <div
          onClick={() => navigate('/admin/stock')}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-[0.06em]">
                Depot Stock Valuation
              </span>
              <span className="pill-badge text-slate-600 bg-slate-100/80 border-slate-200">
                {warehouses.length} Depots
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
              ₹{Math.round(finance.totalInventoryValuation).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>{totalStockUnits.toLocaleString('en-IN')} available units</span>
            <span className="text-indigo-600 font-medium group-hover:translate-x-0.5 transition-transform">
              Stock →
            </span>
          </div>
        </div>

        {/* Metric 3: Inward Consignments & Supplier GRN */}
        <div
          onClick={() => navigate('/admin/inward-receipts')}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-[0.06em]">
                Inward Receipts (GRN)
              </span>
              <span className={`pill-badge ${
                pendingInwards.length > 0 ? 'bg-amber-50/80 text-amber-800 border-amber-200' : 'bg-emerald-50/80 text-emerald-800 border-emerald-200'
              }`}>
                {pendingInwards.length > 0 ? `${pendingInwards.length} QC Pending` : 'All Cleared'}
              </span>
            </div>
            <div className="stat-value-billion text-2xl sm:text-3xl text-slate-900 mt-2">
              {inwardReceipts.length} <span className="text-sm font-normal text-slate-400">shipments</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>{suppliers.length} active suppliers</span>
            <span className="text-indigo-600 font-medium group-hover:translate-x-0.5 transition-transform">
              GRN Log →
            </span>
          </div>
        </div>

        {/* Metric 4: Customer Credit & Outstanding Receivables */}
        <div
          onClick={() => navigate('/admin/customer-credit')}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-[0.06em]">
                Total Receivables (A/R)
              </span>
              <span className={`pill-badge ${
                overLimitCustomers.length > 0 ? 'bg-rose-50/80 text-rose-800 border-rose-200' : 'bg-slate-100/80 text-slate-600 border-slate-200'
              }`}>
                {overLimitCustomers.length > 0 ? `${overLimitCustomers.length} Over Limit` : 'Healthy'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
              ₹{Math.round(totalReceivables).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>{customers.length} registered accounts</span>
            <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
              Credit A/R →
            </span>
          </div>
        </div>
      </div>

      {/* ─── SUPPLY CHAIN & OPERATIONAL LOGISTICS COMMAND OVERVIEW ─── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200">
                Supply Chain &amp; Operations Command
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Multi-Depot Provenance &amp; Dispatches
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Supplier Inbound, Regional Stock &amp; Delivery Logistics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Integrated lifecycle tracking across Purchase Orders, Goods Receipt (GRN), Batch Quarantine, and Customer Dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/orders')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5 text-lime-400" />
              <span>Purchase Orders Desk</span>
            </button>

            <button
              onClick={() => navigate('/admin/expenses')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all shadow-xs cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Delivery Claims</span>
            </button>
          </div>
        </div>

        {/* 4 Core Operational Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Purchase Orders Lifecycle */}
          <div
            onClick={() => navigate('/admin/orders')}
            className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Purchase Orders
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {totalPOs} Total
                </span>
              </div>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {poActiveSent + poReceiving} <span className="text-xs font-semibold text-slate-400 font-normal">Active Pipeline</span>
              </div>

              {/* Lifecycle Stage Breakdown */}
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Pending Approval:</span>
                  <span className={`font-bold font-mono ${poPendingApproval > 0 ? 'text-amber-600 font-black' : 'text-slate-400'}`}>
                    {poPendingApproval} POs
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Sent to Supplier:</span>
                  <span className="font-bold font-mono text-indigo-600">{poActiveSent} POs</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Inward Receiving:</span>
                  <span className="font-bold font-mono text-emerald-600">{poReceiving} POs</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-indigo-600">
              <span>Inspect Purchase Orders</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </div>

          {/* Card 2: Inbound Goods & GRN Receipts */}
          <div
            onClick={() => navigate('/admin/inward-receipts')}
            className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Inward Stock (GRN)
                </span>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                  pendingInwards.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {pendingInwards.length} QC Pending
                </span>
              </div>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {totalAcceptedInboundUnits.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-semibold text-slate-400 font-normal">Accepted</span>
              </div>

              {/* Count verification */}
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>PO Expected Units:</span>
                  <span className="font-bold font-mono text-slate-800">{totalExpectedInboundUnits.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Physically Received:</span>
                  <span className="font-bold font-mono text-slate-800">{totalReceivedInboundUnits.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Dock Gate Receipts:</span>
                  <span className="font-bold font-mono text-indigo-600">{inwardReceipts.length} GRNs</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-indigo-600">
              <span>View Goods Receipts</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </div>

          {/* Card 3: Batch Quality & Discrepancies */}
          <div
            onClick={() => navigate('/admin/approvals')}
            className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Quality &amp; Discrepancy
                </span>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                  openDiscrepancies.length > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {openDiscrepancies.length > 0 ? `${openDiscrepancies.length} Open Issues` : 'All Resolved'}
                </span>
              </div>
              <div className="text-2xl font-black text-rose-700 mt-1">
                {totalDamagedBatchUnits}{' '}
                <span className="text-xs font-semibold text-slate-400 font-normal">Held / Damaged Units</span>
              </div>

              {/* Financial Risk */}
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Est. Impact at Risk:</span>
                  <span className="font-bold font-mono text-rose-700">₹{totalDiscrepancyImpact.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Available Sellable Stock:</span>
                  <span className="font-bold font-mono text-emerald-700">{totalStockUnits.toLocaleString('en-IN')} Units</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Gatepass / Debit Notes:</span>
                  <span className="font-bold font-mono text-indigo-600">Pending Review</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-rose-600">
              <span>Damage Approvals Desk</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </div>

          {/* Card 4: Customer Dispatches & Delivery Expenses */}
          <div
            onClick={() => navigate('/admin/expenses')}
            className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dispatches &amp; Freight
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {customerDispatches.length} Shipments
                </span>
              </div>
              <div className="text-2xl font-black text-slate-950 mt-1">
                ₹{totalDeliveryExpenses.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-semibold text-slate-400 font-normal">Delivery Freight</span>
              </div>

              {/* Dispatch states */}
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>In-Transit Deliveries:</span>
                  <span className="font-bold font-mono text-indigo-600">{inTransitDispatches} Active</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Delivered to Customers:</span>
                  <span className="font-bold font-mono text-emerald-600">{deliveredDispatches} Completed</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Batch Provenance Trace:</span>
                  <span className="font-bold text-slate-800">100% Strict FIFO</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-indigo-600">
              <span>Delivery Claims &amp; Wallets</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </div>
        </div>

        {/* Regional Multi-Depot Stock Breakdown Strip */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider">
              Regional Depot Stock &amp; Warehouse Distribution
            </span>
            <button
              onClick={() => navigate('/admin/stock')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
            >
              <span>Explore All Warehouses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {warehouses.map((wh) => {
              const whBatches = batches.filter((b) => b.warehouseId === wh.id);
              const whStock = whBatches.reduce((s, b) => s + b.availableQuantity, 0);
              const whDamaged = whBatches.reduce((s, b) => s + (b.damagedQuantity || 0), 0);
              const whPOs = purchaseOrders.filter((po) => po.destinationWarehouseId === wh.id && po.status !== 'cancelled');

              return (
                <div
                  key={wh.id}
                  onClick={() => navigate('/admin/stock')}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {wh.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {wh.code} • {wh.address.split(',')[1]?.trim() || 'Regional Depot'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-mono">
                      {whBatches.length} Batches
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Available</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {whStock.toLocaleString('en-IN')} units
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Inbound POs</span>
                      <span className="font-mono font-bold text-slate-900">
                        {whPOs.length} scheduled
                      </span>
                    </div>

                    {whDamaged > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] text-rose-500 block">Damaged</span>
                        <span className="font-mono font-bold text-rose-700">
                          {whDamaged} held
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── ROW 2: WEEKLY DISPATCH VOLUME & ADMIN WORKSPACE SHORTCUTS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 7-Day Revenue & Dispatch Volume Bar Chart (Col 8) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Weekly Revenue Trend
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Dispatch &amp; Booking Volume
              </h2>
            </div>

            {/* Timeframe selector */}
            <div className="relative inline-flex items-center">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="appearance-none px-3.5 py-1.5 pr-8 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 focus:outline-none shadow-xs cursor-pointer"
              >
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
                <option value="YTD">YTD</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>

          {/* 7-Day Bar Chart */}
          <div className="pt-2">
            <div className="h-48 flex items-end justify-between gap-3 px-2 sm:px-4 relative">
              {weeklyData.map((d) => {
                const isHovered = hoveredDay === d.day;
                return (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                    onMouseEnter={() => setHoveredDay(d.day)}
                  >
                    {/* Tooltip */}
                    {(d.isCurrent || isHovered) && (
                      <div className="absolute -top-10 z-20 flex flex-col items-center animate-in fade-in duration-150">
                        <div className="px-2.5 py-1 rounded-xl bg-slate-950 text-white text-[11px] font-bold shadow-md whitespace-nowrap">
                          {d.value}
                        </div>
                        <div className="w-2 h-2 bg-slate-950 rotate-45 -mt-1" />
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      className="w-full max-w-[36px] rounded-full overflow-hidden transition-all duration-300 relative"
                      style={{ height: `${d.height}%` }}
                    >
                      {d.isCurrent ? (
                        <div className="w-full h-full flex flex-col">
                          <div className="h-[30%] bg-indigo-400" />
                          <div className="h-[45%] bg-indigo-600" />
                          <div className="h-[25%] bg-purple-600" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-slate-900 group-hover:bg-slate-700 transition-colors rounded-full" />
                      )}
                    </div>

                    {/* Day Label */}
                    <span
                      className={`text-xs font-semibold mt-3 ${
                        d.isCurrent ? 'text-slate-950 font-black' : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    >
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart footer stats */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span className="text-slate-500">Peak Dispatch Day: <strong className="text-slate-900">Wednesday</strong></span>
            </div>
            <button
              onClick={() => navigate('/admin/orders')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
            >
              <span>View All Dispatches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Authoritative Admin Governance Shortcuts (Col 4) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Admin Governance Hub
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Operations Control
            </h2>
          </div>

          {/* 5 Admin Route Action Cards (Strictly Admin pages only!) */}
          <div className="space-y-2.5">
            <button
              onClick={() => navigate('/admin/stock')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/60 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-black">Regional Stock &amp; Batches</div>
                  <div className="text-[10px] text-slate-400">{totalStockUnits.toLocaleString('en-IN')} units across {warehouses.length} depots</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => navigate('/admin/inward-receipts')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/60 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-black">Inward Receipts (GRN)</div>
                  <div className="text-[10px] text-slate-400">{pendingInwards.length} QC checks pending authorization</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => navigate('/admin/suppliers')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/60 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-black">Suppliers &amp; Vendors</div>
                  <div className="text-[10px] text-slate-400">{suppliers.length} active registered vendor partners</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => navigate('/admin/customers')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/60 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-black">Customers &amp; Dealers</div>
                  <div className="text-[10px] text-slate-400">{customers.length} accounts • Credit &amp; order history</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => navigate('/admin/transfers-audits')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/60 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-black">Inter-Depot Transfers &amp; Audits</div>
                  <div className="text-[10px] text-slate-400">Cargo logistics &amp; warehouse shrinkage</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Quick Depot Capacity Status */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Depot Bay Utilization</span>
              <span className="font-bold text-slate-900">80% Capacity</span>
            </div>
            <div className="flex items-center gap-1 h-2">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-full rounded-full ${
                    i < 8 ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: COST STRUCTURE, SLA GAUGE, REGIONAL TARGETS & ORDERS GOVERNANCE ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Module 1: Cost Structure Breakdown */}
        <div
          onClick={() => navigate('/admin/pricing-policies')}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-indigo-200 transition-all cursor-pointer space-y-4 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Landed Cost Structure</h3>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Q1 2026
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full overflow-hidden flex gap-0.5">
              <div className="bg-indigo-600 h-full" style={{ width: '52%' }} title="52% Inward Landed Cost" />
              <div className="bg-slate-900 h-full" style={{ width: '24%' }} title="24% Logistics & Depots" />
              <div className="bg-purple-500 h-full" style={{ width: '14%' }} title="14% Sales Commissions" />
              <div className="bg-amber-400 h-full" style={{ width: '10%' }} title="10% Administrative Overheads" />
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-slate-600 font-medium">Inward Landed Cost</span>
              </div>
              <span className="font-bold text-slate-900">52%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                <span className="text-slate-600 font-medium">Logistics &amp; Depots</span>
              </div>
              <span className="font-bold text-slate-900">24%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-slate-600 font-medium">Commissions</span>
              </div>
              <span className="font-bold text-slate-900">14%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-600 font-medium">Overheads</span>
              </div>
              <span className="font-bold text-slate-900">10%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold">
            <span>Pricing Policies</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>

        {/* Module 2: Dispatch SLA Radial Gauge */}
        <div
          onClick={() => navigate('/admin/regions')}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
        >
          <div>
            <h3 className="text-sm font-black text-slate-900">Fulfillment SLA</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">On-time regional dispatch SLA benchmark</p>
          </div>

          {/* Semi-circular gauge */}
          <div className="flex flex-col items-center justify-center relative py-2">
            <svg className="w-36 h-24" viewBox="0 0 100 60">
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 10 50 A 40 40 0 0 1 88.5 42"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute bottom-2 flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900 leading-none">94%</span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 border border-emerald-200">
                Optimal
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center leading-snug">
            94% of sales orders dispatched within 24 hours of batch QA clearance across depots.
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold">
            <span>Depots &amp; Territories</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>

        {/* Module 3: Regional Sales Target Progress */}
        <div
          onClick={() => navigate('/admin/targets')}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-indigo-200 transition-all cursor-pointer space-y-4 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Regional Targets</h3>
            <span className="text-xs font-bold text-slate-500 hover:text-slate-900">
              Manage →
            </span>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">North Territory</span>
                <span className="font-mono text-slate-500 text-[11px]">₹12.5L / ₹15L (83%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: '83%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">West Territory</span>
                <span className="font-mono text-slate-500 text-[11px]">₹9.8L / ₹12L (81%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: '81%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">South Territory</span>
                <span className="font-mono text-slate-500 text-[11px]">₹7.2L / ₹8L (90%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: '90%' }} />
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold text-right pt-1">
            Overall 84.6% Q1 Quota Attained
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold">
            <span>Target Allocations</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>

        {/* Module 4: Live Orders Oversight Feed */}
        <div
          onClick={() => navigate('/admin/orders')}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-indigo-200 transition-all cursor-pointer space-y-4 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Active Orders</h3>
            <span className="text-xs font-bold text-slate-500 hover:text-slate-900">
              See all →
            </span>
          </div>

          <div className="space-y-3">
            {salesOrders.slice(0, 4).map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-900 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                    {order.customerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate block">
                      {order.customerName}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {order.orderNumber}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold block text-slate-900">
                    ₹{Math.round(order.totalAmount).toLocaleString('en-IN')}
                  </span>
                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    order.status === 'dispatched'
                      ? 'bg-emerald-50 text-emerald-700'
                      : order.status === 'pending_discount_approval'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold">
            <span>Admin Orders Governance</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>
      </div>
    </div>
  );
};
