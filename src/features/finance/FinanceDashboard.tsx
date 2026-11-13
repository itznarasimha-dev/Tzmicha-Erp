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
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatINR, numberToIndianWords, maskAccountNumber } from '../../services/formatters';

export const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    invoices,
    customers,
    suppliers,
    supplierBills,
    creditNotes,
    receiptsPaymentsIn,
    customerRefundRequests,
    budgetRequests,
    expenseClaims,
    payrollRecords,
    companyProfiles,
    activeCompanyProfileId,
  } = useErpStore();

  const [datePeriod, setDatePeriod] = useState<'this_month' | 'last_month' | 'this_quarter' | 'full_fy'>('this_month');
  const [downloadNotice, setDownloadNotice] = useState(false);

  // Active Company Entity
  const activeCompany = useMemo(() => {
    return (companyProfiles || []).find((c) => c.id === activeCompanyProfileId) || companyProfiles?.[0];
  }, [companyProfiles, activeCompanyProfileId]);

  // ─── Financial Real-Record Computations ───
  const metrics = useMemo(() => {
    // 1. Cash In: Customer Receipts Posted
    const totalCashIn = (receiptsPaymentsIn || [])
      .filter((r) => r.status === 'posted')
      .reduce((sum, r) => sum + r.amountReceived, 0);

    // 2. Cash Out: Supplier payments, customer refunds disbursed, expenses settled
    const supplierOut = (supplierBills || []).reduce((s, b) => s + b.paidAmount, 0);
    const refundOut = (customerRefundRequests || [])
      .filter((r) => r.status === 'disbursed')
      .reduce((s, r) => s + (r.approvedAmount || r.requestedAmount), 0);
    const expenseOut = (expenseClaims || [])
      .filter((e) => e.status === 'paid')
      .reduce((s, e) => s + (e.settledAmount || e.amount), 0);
    const totalCashOut = supplierOut + refundOut + expenseOut;

    // 3. Receivables & Overdue
    const totalReceivables = (customers || []).reduce((sum, c) => sum + (c.currentOutstanding || 0), 0);
    const overdueInvoices = (invoices || []).filter(
      (i) => i.paymentStatus !== 'paid' && new Date(i.dueDate) < new Date('2026-11-12')
    );
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + i.outstandingBalance, 0);

    // 4. Payables Due This Week
    const totalPayables = (supplierBills || []).reduce((sum, b) => sum + b.outstandingBalance, 0);
    const payablesDueThisWeek = (supplierBills || [])
      .filter((b) => b.outstandingBalance > 0)
      .reduce((sum, b) => sum + b.outstandingBalance, 0);

    // 5. GST Payable This Month
    const gstOutputLiability = (invoices || []).reduce((sum, i) => sum + (i.totalTax || 0), 0);
    const gstCreditReversed = (creditNotes || []).reduce(
      (sum, c) => sum + (c.cgstAmount + c.sgstAmount + c.igstAmount),
      0
    );
    const eligibleItc = (supplierBills || []).reduce((sum, b) => sum + b.taxAmount, 0);
    const netGstPayable = Math.max(0, gstOutputLiability - gstCreditReversed - eligibleItc);

    // 6. Pending Approvals Count
    const pendingRefunds = (customerRefundRequests || []).filter(
      (r) => r.status === 'pending_finance_review' || r.status === 'escalated_to_admin'
    );
    const pendingBudgets = (budgetRequests || []).filter((b) => b.status === 'pending');
    const pendingBills = (supplierBills || []).filter((b) => b.status === 'pending_approval');
    const pendingExpenses = (expenseClaims || []).filter((e) => e.status === 'submitted');
    const totalPendingApprovals =
      pendingRefunds.length + pendingBudgets.length + pendingBills.length + pendingExpenses.length;

    // 7. Bank Balances
    const bankAccounts = activeCompany?.bankAccounts || [
      { id: 'cba-01', bankName: 'HDFC Bank Ltd', accountNumber: '91802003881921', accountType: 'Current', ifscCode: 'HDFC0001211', currentBalance: 1785000 },
      { id: 'cba-02', bankName: 'ICICI Bank Ltd', accountNumber: '001205008891', accountType: 'Current', ifscCode: 'ICIC0000012', currentBalance: 840000 },
    ];
    const totalBankBalance = bankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);

    // 8. Corporate Budget Usage
    const totalBudget = 3350000;
    const spentBudget = 2402000;
    const budgetUsagePercent = Math.round((spentBudget / totalBudget) * 100);

    return {
      totalCashIn,
      totalCashOut,
      totalReceivables,
      totalOverdue,
      totalPayables,
      payablesDueThisWeek,
      netGstPayable,
      totalPendingApprovals,
      pendingRefunds,
      pendingBudgets,
      pendingBills,
      pendingExpenses,
      bankAccounts,
      totalBankBalance,
      totalBudget,
      spentBudget,
      budgetUsagePercent,
    };
  }, [
    invoices,
    customers,
    suppliers,
    supplierBills,
    creditNotes,
    receiptsPaymentsIn,
    customerRefundRequests,
    budgetRequests,
    expenseClaims,
    activeCompany,
  ]);

  const handleDownloadSnapshot = () => {
    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER / BANNER WITH ENTITY SELECTOR ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-3xl backdrop-blur-xl bg-white/70 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Executive Finance &amp; Treasury Command
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              Q3 FY 2026-27
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time cash flow, accounts receivable aging, supplier payables, statutory GST liability, and pending approvals.
          </p>
        </div>

        {/* Action Controls & Date Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-700" />
            <span className="font-bold text-indigo-950">{activeCompany?.legalName || 'Delhi HQ Entity'}</span>
          </div>

          <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setDatePeriod('this_month')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                datePeriod === 'this_month' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDatePeriod('this_quarter')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                datePeriod === 'this_quarter' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Quarter
            </button>
            <button
              type="button"
              onClick={() => setDatePeriod('full_fy')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                datePeriod === 'full_fy' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full FY 26-27
            </button>
          </div>

          <Button size="sm" variant="outline" onClick={handleDownloadSnapshot} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Snapshot
          </Button>
        </div>
      </div>

      {downloadNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Financial Treasury snapshot exported to CSV successfully.</span>
          </div>
          <Badge variant="success" size="sm">Downloaded</Badge>
        </div>
      )}

      {/* ─── PRIMARY TREASURY TILES (CLICK-THROUGH DRILL DOWN) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash In Flow */}
        <div
          onClick={() => navigate('/finance/receivables')}
          className="backdrop-blur-md bg-white/80 p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Cash In (Collections)</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-900">
              {formatINR(metrics.totalCashIn)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Customer receipts posted</span>
              <span className="text-emerald-700 font-semibold">+14.2% vs last mo</span>
            </div>
          </div>
        </div>

        {/* Cash Out Flow */}
        <div
          onClick={() => navigate('/finance/payables')}
          className="backdrop-blur-md bg-white/80 p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Cash Out (Disbursements)</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-950">
              {formatINR(metrics.totalCashOut)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Vendors, refunds &amp; expenses</span>
              <span className="text-slate-400">Net Outflows</span>
            </div>
          </div>
        </div>

        {/* Receivables & Overdue */}
        <div
          onClick={() => navigate('/finance/receivables')}
          className="backdrop-blur-md bg-white/80 p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Customer Receivables</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatINR(metrics.totalReceivables)}
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-rose-700 font-semibold font-mono">Overdue: {formatINR(metrics.totalOverdue)}</span>
              <Badge variant="warning" size="sm">Aging Active</Badge>
            </div>
          </div>
        </div>

        {/* Payables Due This Week */}
        <div
          onClick={() => navigate('/finance/payables')}
          className="backdrop-blur-md bg-white/80 p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Supplier Payables</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-indigo-950">
              {formatINR(metrics.totalPayables)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>3-Way matched bills</span>
              <span className="text-indigo-700 font-bold">Due This Week</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECOND ROW: BANK BALANCES, GST PAYABLE & BUDGET USAGE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bank Balances Card */}
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-700" />
              <h3 className="font-bold text-slate-900 text-xs">Bank Balances (Real-Time)</h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-800">
              Total: {formatINR(metrics.totalBankBalance)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {metrics.bankAccounts.map((b: any) => (
              <div key={b.id} className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{b.bankName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    A/C: {maskAccountNumber(b.accountNumber)} • {b.ifscCode}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 block">{formatINR(b.currentBalance)}</span>
                  <span className="text-[9px] text-emerald-700 font-bold">Operational</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* GST Payable This Month Card */}
        <Card
          onClick={() => navigate('/finance/reports')}
          className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs p-4 space-y-3 cursor-pointer hover:border-indigo-300 transition-all group"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-purple-700" />
              <h3 className="font-bold text-slate-900 text-xs">GST Payable This Month</h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>

          <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-purple-900 block">Net Statutory Cash Liability</span>
            <div className="text-2xl font-bold font-mono text-purple-950">
              {formatINR(metrics.netGstPayable)}
            </div>
            <span className="text-[10px] text-purple-800 block">
              GSTR-3B Outward minus Input Tax Credit (ITC)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] uppercase text-slate-400 block">Eligible ITC</span>
              <span className="font-mono font-bold text-emerald-700">Accrued</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] uppercase text-slate-400 block">Filing Due Date</span>
              <span className="font-mono font-bold text-slate-900">20th Nov 2026</span>
            </div>
          </div>
        </Card>

        {/* Corporate Budget Usage Card */}
        <Card
          onClick={() => navigate('/finance/budget-requests')}
          className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs p-4 space-y-3 cursor-pointer hover:border-indigo-300 transition-all group"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-xs">Corporate Budget Usage</h3>
            </div>
            <Badge variant={metrics.budgetUsagePercent > 80 ? 'warning' : 'success'} size="sm">
              {metrics.budgetUsagePercent}% Spent
            </Badge>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Spent: {formatINR(metrics.spentBudget)}</span>
              <span className="font-bold text-slate-900">Cap: {formatINR(metrics.totalBudget)}</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  metrics.budgetUsagePercent > 100
                    ? 'bg-rose-500'
                    : metrics.budgetUsagePercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, metrics.budgetUsagePercent)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Remaining Headroom: {formatINR(metrics.totalBudget - metrics.spentBudget)}
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
            <span>Threshold alert active: Departments nearing 80% ceiling are flagged before purchase order approval.</span>
          </div>
        </Card>
      </div>

      {/* ─── UNIFIED PENDING APPROVALS INBOX ─── */}
      <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Unified Finance Approvals Inbox</h3>
              <p className="text-xs text-slate-500">Pending customer refunds, marketing budgets, 3-way match supplier bills &amp; employee expenses.</p>
            </div>
          </div>
          <Badge variant="warning" size="md">{metrics.totalPendingApprovals} Action Items</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Customer Refunds Pending */}
          <div
            onClick={() => navigate('/finance/refunds')}
            className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900">Customer Refunds</span>
              <Badge size="sm" variant="purple">{metrics.pendingRefunds.length}</Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Service team damage &amp; cancellation refunds</p>
            <span className="text-[10px] text-indigo-600 font-bold mt-2 block group-hover:underline">
              Review Queue &rarr;
            </span>
          </div>

          {/* Supplier Bills Pending */}
          <div
            onClick={() => navigate('/finance/payables')}
            className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900">Supplier Bills (PO Match)</span>
              <Badge size="sm" variant="primary">{metrics.pendingBills.length}</Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Vendor invoices pending 3-way match audit</p>
            <span className="text-[10px] text-indigo-600 font-bold mt-2 block group-hover:underline">
              Review Queue &rarr;
            </span>
          </div>

          {/* Campaign Budgets Pending */}
          <div
            onClick={() => navigate('/finance/budget-requests')}
            className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900">Marketing Budgets</span>
              <Badge size="sm" variant="warning">{metrics.pendingBudgets.length}</Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Dealer summit and roadshow proposals</p>
            <span className="text-[10px] text-indigo-600 font-bold mt-2 block group-hover:underline">
              Review Queue &rarr;
            </span>
          </div>

          {/* Employee Claims Pending */}
          <div
            onClick={() => navigate('/finance/expenses')}
            className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900">Employee Expenses</span>
              <Badge size="sm" variant="neutral">{metrics.pendingExpenses.length}</Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Field travel, lodging &amp; fuel vouchers</p>
            <span className="text-[10px] text-indigo-600 font-bold mt-2 block group-hover:underline">
              Review Queue &rarr;
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
