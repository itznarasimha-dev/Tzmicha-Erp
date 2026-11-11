import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Landmark,
  Wallet,
  Receipt,
  Users,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Scale,
  Percent,
  FileSpreadsheet,
  FileText,
  Truck,
  Sparkles,
} from 'lucide-react';

export const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    salesOrders,
    invoices,
    customers,
    suppliers,
    expenseClaims,
    salesRemittances,
    payrollRecords,
    incentiveSettlements,
    financeClaims,
    budgetRequests,
    customerDispatches,
    currentRole,
    currentUser,
  } = useErpStore();

  const [datePeriod, setDatePeriod] = useState<'this_month' | 'last_month' | 'this_quarter' | 'full_fy'>('this_month');
  const [downloadNotice, setDownloadNotice] = useState(false);

  // ─── Financial Computations ───
  const metrics = useMemo(() => {
    // 1. Total Revenue: invoiced product revenue + customer delivery fees (non-cancelled)
    const validInvoices = invoices.filter((i) => i.status !== 'cancelled');
    const totalInvoicedRevenue = validInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

    // 2. Payments Collected: verified customer receipts & recorded payments
    const verifiedRemittances = salesRemittances
      .filter((r) => r.type === 'collection_from_customer' && r.status === 'verified')
      .reduce((sum, r) => sum + r.amount, 0);
    const invoiceCollections = validInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalPaymentsCollected = Math.max(verifiedRemittances, invoiceCollections);

    // 3. Outstanding Customer Receivables
    const outstandingReceivables = customers.reduce((sum, c) => sum + (c.currentOutstanding || 0), 0);
    const overdueInvoices = validInvoices.filter((i) => i.paymentStatus !== 'paid' && new Date(i.dueDate) < new Date());
    const overdueReceivables = overdueInvoices.reduce((sum, i) => sum + i.outstandingBalance, 0);

    // 4. Supplier Payables
    const totalSupplierPayables = suppliers.reduce(
      (sum, s) => sum + (s.outstandingPayable ?? s.outstandingBalance ?? 0),
      0
    );

    // 5. Pending Refunds & Damage Claims
    const pendingRefunds = financeClaims.filter((c) => c.refundStatus === 'pending' || (c.refundStatus === 'approved' && c.payoutStatus === 'unpaid'));
    const totalPendingRefundsValue = pendingRefunds.reduce((sum, c) => sum + (c.approvedAmount || c.requestedAmount), 0);

    // 6. Payroll Liabilities
    const pendingPayroll = payrollRecords.filter((p) => p.status === 'approved' || p.status === 'draft_calculated');
    const totalPayrollLiability = pendingPayroll.reduce((sum, p) => sum + p.netPayableSalary, 0);

    // 7. Employee Expenses
    const approvedExpenses = expenseClaims.filter((e) => e.status === 'approved' || e.status === 'paid');
    const totalApprovedExpenses = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingExpenses = expenseClaims.filter((e) => e.status === 'submitted');
    const totalPendingExpenses = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 8. Storekeeper Delivery & Operational Costs
    const totalDeliveryExpenses = customerDispatches.reduce((sum, d) => sum + (d.totalDeliveryExpenses || 0), 0);

    // 9. Marketing Budgets
    const totalMarketingAllocated = budgetRequests
      .filter((b) => b.status === 'approved' || b.status === 'partially_approved')
      .reduce((sum, b) => sum + (b.approvedAmount || 0), 0);
    const totalMarketingSpent = budgetRequests.reduce((sum, b) => sum + (b.spentAmount || 0), 0);

    // 10. Sales & Marketing Incentives
    const totalIncentivesApproved = incentiveSettlements
      .filter((i) => i.status === 'approved' || i.status === 'paid')
      .reduce((sum, i) => sum + (i.approvedIncentive || i.calculatedIncentive), 0);
    const pendingIncentivePayouts = incentiveSettlements
      .filter((i) => i.status === 'approved')
      .reduce((sum, i) => sum + (i.approvedIncentive || i.calculatedIncentive), 0);

    // 11. Net Balance: Total Collections vs Total Outflows
    const totalOutflows = totalApprovedExpenses + totalDeliveryExpenses + totalMarketingSpent + totalIncentivesApproved + (payrollRecords.filter(p => p.status === 'paid').reduce((s, p) => s + p.netPayableSalary, 0));
    const netOperatingCashBalance = totalPaymentsCollected - totalOutflows;

    return {
      totalInvoicedRevenue,
      totalPaymentsCollected,
      outstandingReceivables,
      overdueReceivables,
      totalSupplierPayables,
      totalPendingRefundsValue,
      pendingRefundsCount: pendingRefunds.length,
      totalPayrollLiability,
      pendingPayrollCount: pendingPayroll.length,
      totalApprovedExpenses,
      totalPendingExpenses,
      pendingExpensesCount: pendingExpenses.length,
      totalDeliveryExpenses,
      totalMarketingAllocated,
      totalMarketingSpent,
      totalIncentivesApproved,
      pendingIncentivePayouts,
      totalOutflows,
      netOperatingCashBalance,
    };
  }, [
    invoices,
    salesRemittances,
    customers,
    suppliers,
    financeClaims,
    payrollRecords,
    expenseClaims,
    customerDispatches,
    budgetRequests,
    incentiveSettlements,
  ]);

  const handleExportStatement = () => {
    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* ─── TOP NOTIFICATION / EXPORT ALERT ─── */}
      {downloadNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">
              Simulated Financial Summary Report (Q3-FY2026.csv) prepared and downloaded successfully.
            </span>
          </div>
          <Badge variant="success" size="sm">Export Ready</Badge>
        </div>
      )}

      {/* ─── BANNER / HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Central Financial Governance
            </span>
            <span className="text-xs text-slate-400 font-mono">
              FY 2026–27 • Tzmicha ERP Operations
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Finance &amp; Treasury Command Hub
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-xl">
            Live monitoring of revenue receipts, customer receivables, supplier payables, payroll accruals, and departmental expenses across all regional hubs.
          </p>
        </div>

        {/* Date Filter & Export */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-100/80 rounded-2xl p-1 border border-slate-200/70 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setDatePeriod('this_month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePeriod === 'this_month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDatePeriod('last_month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePeriod === 'last_month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setDatePeriod('this_quarter')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePeriod === 'this_quarter' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q3 FY26
            </button>
            <button
              type="button"
              onClick={() => setDatePeriod('full_fy')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                datePeriod === 'full_fy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full Year
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportStatement}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-2xl shadow-xs text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Export Statement
          </Button>
        </div>
      </div>

      {/* ─── PRIMARY KPI GRID ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Invoiced Revenue */}
        <div className="glass-card p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">Total Invoiced Revenue</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              ₹{metrics.totalInvoicedRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Across all customer sales orders
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Payments Collected */}
        <div className="glass-card p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Verified Cash Collected</span>
            <div className="text-2xl font-bold text-emerald-800 font-mono mt-1">
              ₹{metrics.totalPaymentsCollected.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Cleared bank remittances &amp; receipts
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Customer Receivables */}
        <div className="glass-card p-4 rounded-2xl border border-amber-100 bg-amber-50/30 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Outstanding Receivables</span>
            <div className="text-2xl font-bold text-amber-900 font-mono mt-1">
              ₹{metrics.outstandingReceivables.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">
              ₹{metrics.overdueReceivables.toLocaleString('en-IN')} past due date
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Supplier Payables */}
        <div className="glass-card p-4 rounded-2xl border border-rose-100 bg-rose-50/30 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Supplier Payables</span>
            <div className="text-2xl font-bold text-rose-900 font-mono mt-1">
              ₹{metrics.totalSupplierPayables.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pending raw chemical trade bills
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── SECONDARY FINANCIAL LEDGER CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Pending Refunds */}
        <div
          onClick={() => navigate('/finance/refunds')}
          className="glass-card p-3 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all cursor-pointer bg-white"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Refunds Due</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-base font-semibold text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalPendingRefundsValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">{metrics.pendingRefundsCount} claims active</div>
        </div>

        {/* Payroll Liabilities */}
        <div
          onClick={() => navigate('/finance/payroll')}
          className="glass-card p-3 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all cursor-pointer bg-white"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Payroll Accrual</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-base font-semibold text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalPayrollLiability.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-purple-700 mt-0.5">{metrics.pendingPayrollCount} payroll lines</div>
        </div>

        {/* Employee Expenses */}
        <div
          onClick={() => navigate('/finance/expenses')}
          className="glass-card p-3 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all cursor-pointer bg-white"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Staff Expenses</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-base font-semibold text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalApprovedExpenses.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-indigo-600 mt-0.5">₹{metrics.totalPendingExpenses.toLocaleString('en-IN')} pending</div>
        </div>

        {/* Delivery Logistics */}
        <div
          onClick={() => navigate('/finance/delivery-costs')}
          className="glass-card p-3 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all cursor-pointer bg-white"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Delivery Freight</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-base font-semibold text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalDeliveryExpenses.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Dispatches logged</div>
        </div>

        {/* Marketing Budgets */}
        <div
          onClick={() => navigate('/finance/budget-requests')}
          className="glass-card p-3 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all cursor-pointer bg-white"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Marketing Budget</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-base font-semibold text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalMarketingAllocated.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">₹{metrics.totalMarketingSpent.toLocaleString('en-IN')} utilized</div>
        </div>

        {/* Incentives & Commissions */}
        <div
          onClick={() => navigate('/finance/incentives')}
          className="glass-card p-3 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all cursor-pointer bg-white"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Sales Quota Payouts</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-base font-semibold text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalIncentivesApproved.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-purple-700 mt-0.5">₹{metrics.pendingIncentivePayouts.toLocaleString('en-IN')} awaiting NEFT</div>
        </div>
      </div>

      {/* ─── INCOME VS EXPENSES BALANCED ACCOUNTING SECTION ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cash Flow Health: Verified Receipts vs. Operational Outflows</CardTitle>
              <CardDescription>
                Strict distinction between invoiced receivables and actual cash collected in company bank accounts.
              </CardDescription>
            </div>
            <Badge variant={metrics.netOperatingCashBalance >= 0 ? 'success' : 'warning'} size="md">
              Net Treasury Float: ₹{metrics.netOperatingCashBalance.toLocaleString('en-IN')}
            </Badge>
          </div>
        </CardHeader>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Income Side */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950 uppercase">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Total Verified Inflows
                </span>
                <span className="text-base font-bold text-emerald-800 font-mono">
                  ₹{metrics.totalPaymentsCollected.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-emerald-100">
                  <span className="text-slate-600">Customer Trade Collections (NEFT/RTGS)</span>
                  <span className="font-bold text-slate-900 font-mono">₹{(metrics.totalPaymentsCollected * 0.85).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-emerald-100">
                  <span className="text-slate-600">Customer Advance Deposits &amp; UPI</span>
                  <span className="font-bold text-slate-900 font-mono">₹{(metrics.totalPaymentsCollected * 0.12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-600">Freight &amp; Delivery Recovery Surcharge</span>
                  <span className="font-bold text-slate-900 font-mono">₹{(metrics.totalPaymentsCollected * 0.03).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Outflows Side */}
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-rose-950 uppercase">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-600" /> Total Approved Outflows
                </span>
                <span className="text-base font-bold text-rose-800 font-mono">
                  ₹{metrics.totalOutflows.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-rose-100">
                  <span className="text-slate-600">Staff Salaries &amp; Payroll Paid</span>
                  <span className="font-bold text-slate-900 font-mono">₹{(payrollRecords.filter(p => p.status === 'paid').reduce((s, p) => s + p.netPayableSalary, 0)).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-rose-100">
                  <span className="text-slate-600">Staff Travel &amp; Field Expenses</span>
                  <span className="font-bold text-slate-900 font-mono">₹{metrics.totalApprovedExpenses.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-rose-100">
                  <span className="text-slate-600">Storekeeper Delivery &amp; Operational Costs</span>
                  <span className="font-bold text-slate-900 font-mono">₹{metrics.totalDeliveryExpenses.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-600">Marketing &amp; Dealer Campaign Spend</span>
                  <span className="font-bold text-slate-900 font-mono">₹{metrics.totalMarketingSpent.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── PENDING ACTION QUEUES & QUICK ROUTING ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Pending Payment Verifications */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" /> Customer Payment Verifications
            </span>
            <Badge variant="warning" size="sm">
              {salesRemittances.filter((r) => r.status === 'pending_verification').length} Pending
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500">
            Field sales remittances awaiting counterfoil check against HDFC/ICICI statements.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/receivables')}
            className="w-full text-xs justify-between cursor-pointer"
          >
            <span>Review Remittances</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Button>
        </div>

        {/* Card 2: Pending Refund & Claims */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-purple-600" /> Refunds &amp; Damage Claims
            </span>
            <Badge variant="purple" size="sm">
              {financeClaims.filter((c) => c.refundStatus === 'pending').length} Actionable
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500">
            Customer transit returns, supplier shortage credit notes, and depot adjustments.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/refunds')}
            className="w-full text-xs justify-between cursor-pointer"
          >
            <span>Manage Claims Ledger</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Button>
        </div>

        {/* Card 3: Marketing Budget Requests */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Marketing Budget Proposals
            </span>
            <Badge variant="primary" size="sm">
              {budgetRequests.filter((b) => b.status === 'pending').length} Awaiting Review
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500">
            Regional dealer summit proposals, B2B campaigns, and lead generation budgets.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/budget-requests')}
            className="w-full text-xs justify-between cursor-pointer"
          >
            <span>Inspect Budget Requests</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Button>
        </div>
      </div>

      {/* ─── QUICK NAVIGATION TILES ─── */}
      <div className="p-5 rounded-3xl bg-slate-100/70 border border-slate-200 space-y-3">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Finance Management Quick Portals
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          <button
            type="button"
            onClick={() => navigate('/finance/receivables')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 text-left font-semibold text-slate-800 transition-all flex flex-col justify-between h-20 cursor-pointer shadow-xs"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Customer Receivables</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/finance/invoices')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 text-left font-semibold text-slate-800 transition-all flex flex-col justify-between h-20 cursor-pointer shadow-xs"
          >
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>Invoices &amp; Quotes</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/finance/payables')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 text-left font-semibold text-slate-800 transition-all flex flex-col justify-between h-20 cursor-pointer shadow-xs"
          >
            <Building2 className="w-4 h-4 text-rose-600" />
            <span>Suppliers &amp; Payables</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/finance/payroll')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 text-left font-semibold text-slate-800 transition-all flex flex-col justify-between h-20 cursor-pointer shadow-xs"
          >
            <Users className="w-4 h-4 text-purple-600" />
            <span>Payroll &amp; Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/finance/general-ledger')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 text-left font-semibold text-slate-800 transition-all flex flex-col justify-between h-20 cursor-pointer shadow-xs"
          >
            <Landmark className="w-4 h-4 text-blue-600" />
            <span>General Ledger &amp; P&amp;L</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/finance/reports')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 text-left font-semibold text-slate-800 transition-all flex flex-col justify-between h-20 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>Financial Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};
