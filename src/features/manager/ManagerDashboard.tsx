import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package,
  Truck,
  Layers,
  ArrowUpRight,
  Eye,
  FileText,
  Calendar,
  Building2,
  Sparkles,
  ChevronRight,
  BarChart3,
  Check,
  Compass,
  FileCheck,
  AlertCircle,
  Warehouse,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    currentOrganization,
    users,
    customers,
    suppliers,
    salesOrders,
    quotations,
    purchaseOrders,
    batches,
    leaveRequests,
    approveLeaveRequest,
    rejectLeaveRequest,
    updateSalesOrderStatus,
    updateQuotationStatus,
    addNotification,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'leaves' | 'inventory'>('all');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<any | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Operational KPI calculations
  const pendingOrders = useMemo(
    () => salesOrders.filter((o) => o.status === 'pending_discount_approval'),
    [salesOrders]
  );

  const pendingLeaves = useMemo(
    () => (leaveRequests || []).filter((l) => l.status === 'pending'),
    [leaveRequests]
  );

  const pendingQuotations = useMemo(
    () => (quotations || []).filter((q) => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Awaiting Approval'),
    [quotations]
  );

  const pendingPO = useMemo(
    () => (purchaseOrders || []).filter((p) => p.status === 'draft' || p.status === 'partially_received'),
    [purchaseOrders]
  );

  const totalPendingApprovals = pendingOrders.length + pendingLeaves.length + pendingQuotations.length;

  const totalActiveUsers = users.filter((u) => u.status !== 'inactive').length;
  const activeFieldReps = users.filter((u) => u.role === 'sales' || u.role === 'marketing').length;

  const totalGrossOrderValue = useMemo(
    () => salesOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    [salesOrders]
  );

  const lowStockBatches = useMemo(
    () => (batches || []).filter((b) => (b.availableQuantity || 0) < 50),
    [batches]
  );

  // Quick Approval Handlers
  const handleApproveOrder = (orderId: string, orderNumber: string) => {
    updateSalesOrderStatus(orderId, 'stock_verified');
    addNotification({
      title: 'Order Discount Approved',
      message: `Operations Manager approved order ${orderNumber}. Stock verified and dispatched to warehouse picking.`,
      userId: 'usr-admin-01',
      type: 'success',
    });
    showToast(`Order ${orderNumber} approved and routed for fulfillment!`);
  };

  const handleRejectOrder = (orderId: string, orderNumber: string) => {
    updateSalesOrderStatus(orderId, 'cancelled');
    addNotification({
      title: 'Order Returned by Operations',
      message: `Operations Manager rejected order ${orderNumber} due to exceeding allowable operational margin.`,
      userId: 'usr-sales-01',
      type: 'warning',
    });
    showToast(`Order ${orderNumber} returned for margin correction.`);
  };

  const handleApproveLeave = (leaveId: string, empName: string) => {
    approveLeaveRequest(leaveId, 'Approved by Operations Manager Pooja Hegde after team shift review.');
    addNotification({
      title: 'Leave Request Approved',
      message: `Leave application for ${empName} approved by Manager. Attendance roster updated.`,
      userId: 'all',
      type: 'info',
    });
    showToast(`Leave application for ${empName} approved.`);
  };

  const handleRejectLeave = (leaveId: string, empName: string) => {
    rejectLeaveRequest(leaveId, 'Peak logistics schedule does not permit absence on requested date.');
    showToast(`Leave request for ${empName} declined.`);
  };

  const handleApproveQuotation = (quoteId: string, quoteNumber: string) => {
    updateQuotationStatus(quoteId, 'Accepted');
    addNotification({
      title: 'Commercial Quotation Approved',
      message: `Quotation ${quoteNumber} authorized by Operations Manager. Ready for customer distribution.`,
      userId: 'usr-sales-01',
      type: 'success',
    });
    showToast(`Quotation ${quoteNumber} approved and signed!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* TOP HEADER: MANAGER OPERATIONS COMMAND */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Compass className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Operations &amp; Tactical Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Operations Management Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <strong>{currentUser?.name || 'Pooja Hegde'}</strong> • Operations Manager (All Depots &amp; Field Teams)
          </p>
        </div>

        {/* Operational Badge and Quick Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Operational Authority Scope
          </span>

          <Button
            onClick={() => navigate('/sales/orders')}
            variant="secondary"
            size="sm"
            className="text-xs font-bold"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
            Orders Hub
          </Button>

          <Button
            onClick={() => navigate('/admin/attendance')}
            variant="primary"
            size="sm"
            className="text-xs font-bold shadow-md"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
            Review Leaves &amp; Attendance
          </Button>
        </div>
      </div>

      {/* ROLE BOUNDARY & GOVERNANCE NOTICE */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <span className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 sm:mt-0">
            <Building2 className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Executive Operational Hierarchy Active ({currentOrganization?.name || 'Tzmicha ERP'})
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
              The Manager role possesses complete operational sign-off for quotations, leave approvals, purchase orders, customer ledgers, and goods receiving. Global security governance and RBAC role reassignment remain strictly centralized under Super Admin.
            </p>
          </div>
        </div>
        <Badge variant="info" size="sm" className="shrink-0 uppercase font-bold text-[10px]">
          Manager Privileges
        </Badge>
      </div>

      {/* METRICS CARDS: KEY OPERATIONAL KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-all border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                Pending Approvals
              </span>
              <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <CardTitle className="text-2xl font-bold mt-2 text-slate-900 dark:text-slate-100">
              {totalPendingApprovals}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {pendingOrders.length} Orders • {pendingLeaves.length} Leaves • {pendingQuotations.length} Quotes
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Active Workforce Fleet */}
        <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-all border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Field &amp; Depot Staff
              </span>
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <CardTitle className="text-2xl font-bold mt-2 text-slate-900 dark:text-slate-100">
              {totalActiveUsers} Members
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {activeFieldReps} Sales &amp; Marketing Reps on field
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Gross Order Throughput */}
        <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-all border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Order Realization
              </span>
              <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <CardTitle className="text-2xl font-bold mt-2 text-slate-900 dark:text-slate-100">
              ₹{(totalGrossOrderValue / 100000).toFixed(1)} Lakhs
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Across {salesOrders.length} active customer contracts
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Warehouse Inventory Health */}
        <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-all border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                Critical Stock Lots
              </span>
              <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <Warehouse className="w-4 h-4" />
              </span>
            </div>
            <CardTitle className="text-2xl font-bold mt-2 text-slate-900 dark:text-slate-100">
              {lowStockBatches.length} Lots Low
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {batches.length} total product batches monitored
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* OPERATIONS APPROVALS WORKFLOW CENTER */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                <FileCheck className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Manager Approvals &amp; Exception Queue
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review requests requiring managerial sign-off before downstream execution.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Items ({totalPendingApprovals})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Orders ({pendingOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('leaves')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'leaves'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Leaves ({pendingLeaves.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Quotations ({pendingQuotations.length})
            </button>
          </div>
        </div>

        {/* Action Items List */}
        <div className="space-y-3">
          {/* SECTION: ORDERS AWAITING DISCOUNT APPROVAL */}
          {(activeTab === 'all' || activeTab === 'orders') && pendingOrders.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Discount Exceptions Awaiting Manager Override ({pendingOrders.length})
              </span>
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:bg-amber-50/70"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-900 dark:text-amber-200 text-xs bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-lg">
                        {order.orderNumber}
                      </span>
                      <Badge variant="warning" size="sm">
                        Discount Sign-off Needed
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Placed by <strong>{order.salesUserName || 'Sales Rep'}</strong>
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {order.customerName}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Total Order Value: <strong className="font-mono text-emerald-600 font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</strong> • Items: {order.items?.length || 1} lines
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleRejectOrder(order.id, order.orderNumber)}
                      variant="secondary"
                      size="sm"
                      className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Decline
                    </Button>
                    <Button
                      onClick={() => handleApproveOrder(order.id, order.orderNumber)}
                      variant="primary"
                      size="sm"
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 border-transparent text-white shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve Discount
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION: LEAVES AWAITING APPROVAL */}
          {(activeTab === 'all' || activeTab === 'leaves') && pendingLeaves.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Employee Leave Applications ({pendingLeaves.length})
              </span>
              {pendingLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:bg-indigo-50/70"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-900 dark:text-indigo-200 text-xs bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-lg">
                        {leave.id}
                      </span>
                      <Badge variant="primary" size="sm">
                        {leave.leaveType.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {leave.startDate} to {leave.endDate} ({leave.durationDays} Days)
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {leave.employeeName} <span className="text-xs font-normal text-slate-500">({leave.roleTitle})</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Reason: "{leave.reason}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleRejectLeave(leave.id, leave.employeeName)}
                      variant="secondary"
                      size="sm"
                      className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Decline
                    </Button>
                    <Button
                      onClick={() => handleApproveLeave(leave.id, leave.employeeName)}
                      variant="primary"
                      size="sm"
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve Leave
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION: COMMERCIAL QUOTATIONS PENDING AUTHORIZATION */}
          {(activeTab === 'all' || activeTab === 'inventory') && pendingQuotations.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quotations Awaiting Sign-off ({pendingQuotations.length})
              </span>
              {pendingQuotations.map((quote) => (
                <div
                  key={quote.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:bg-slate-100/60"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-lg">
                        {quote.quotationNo}
                      </span>
                      <Badge variant="neutral" size="sm">
                        {quote.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Expires: {quote.validUntil}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {quote.customerName}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Total: <strong className="font-mono text-emerald-600">₹{(quote.grandTotal || 0).toLocaleString('en-IN')}</strong> • Rep: {quote.assignedSalesUserName || 'Sales Desk'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => navigate('/sales/quotations')}
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Inspect Quote
                    </Button>
                    <Button
                      onClick={() => handleApproveQuotation(quote.id, quote.quotationNo)}
                      variant="primary"
                      size="sm"
                      className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Sign Off
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EMPTY STATE */}
          {totalPendingApprovals === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                All Operations Cleared &amp; Up to Date!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are no pending discount exceptions, leave requests, or quotations awaiting Manager authorization.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* OPERATIONAL MODULE LAUNCHPAD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sales & Commercial Desk */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <Button
              onClick={() => navigate('/sales/orders')}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              Open Hub →
            </Button>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Sales &amp; Customer Orders
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manage live field quotations, approve customer credit limits, track delivery dispatches, and review sales rep commission targets.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>Active Customers:</span>
            <strong className="text-slate-900 dark:text-slate-100">{customers.length} Accounts</strong>
          </div>
        </div>

        {/* Warehouse, Logistics & QC Inward */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <Truck className="w-5 h-5" />
            </span>
            <Button
              onClick={() => navigate('/store/stock')}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              Open Hub →
            </Button>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Inventory &amp; Inward GRN
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Track multi-depot stock quotas, review inward goods receipt notes (GRN), authorize damaged item write-offs, and monitor lot expiration.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>Tracked Suppliers:</span>
            <strong className="text-slate-900 dark:text-slate-100">{suppliers.length} Vendors</strong>
          </div>
        </div>

        {/* Field Workforce & Attendance */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </span>
            <Button
              onClick={() => navigate('/admin/attendance')}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              Open Hub →
            </Button>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Workforce Attendance &amp; Leaves
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Monitor real-time employee attendance punch-ins, field location check-ins, approve operational shift rotations, and inspect leave audit trails.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>Operating Teams:</span>
            <strong className="text-slate-900 dark:text-slate-100">{users.length} Employees</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
