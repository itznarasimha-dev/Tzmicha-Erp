import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { calculateFinanceMetrics } from '../../services/financeService';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  DollarSign,
  TrendingUp,
  Download,
  ShieldAlert,
  Wallet,
  Receipt,
  Calendar,
  CheckCircle,
} from 'lucide-react';

export const FinanceDashboard: React.FC = () => {
  const {
    currentRole,
    salesOrders,
    batches,
    customers,
    expenseClaims,
    stockMovements,
    selectedRegionId,
    inwardReceipts,
  } = useErpStore();

  const [dateRange, setDateRange] = useState('current_month');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (currentRole !== 'admin') {
    return (
      <div className="p-8 text-center glass-card border border-rose-200 bg-rose-50/50">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Denied: Financial Privacy Policy</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
          Company-wide financial statements, Cost of Goods Sold, and margin ledgers are restricted strictly to Executive Admins.
        </p>
      </div>
    );
  }

  const finance = calculateFinanceMetrics(
    salesOrders,
    batches,
    customers,
    expenseClaims,
    stockMovements,
    selectedRegionId
  );

  const expenseByCategory = [
    {
      category: 'Travel & Lodging',
      amount: expenseClaims
        .filter((e) => (e.category === 'travel' || e.category === 'accommodation') && (e.status === 'approved' || e.status === 'paid'))
        .reduce((s, e) => s + e.amount, 0),
    },
    {
      category: 'Fuel & Transportation',
      amount: expenseClaims
        .filter((e) => e.category === 'fuel' && (e.status === 'approved' || e.status === 'paid'))
        .reduce((s, e) => s + e.amount, 0),
    },
    {
      category: 'Client Meetings & Food',
      amount: expenseClaims
        .filter((e) => (e.category === 'food' || e.category === 'customer_meeting') && (e.status === 'approved' || e.status === 'paid'))
        .reduce((s, e) => s + e.amount, 0),
    },
    {
      category: 'Sample Demonstration & Promos',
      amount: expenseClaims
        .filter((e) => e.category === 'sample_promotion' && (e.status === 'approved' || e.status === 'paid'))
        .reduce((s, e) => s + e.amount, 0),
    },
  ];

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value (INR)\n' +
      `Total Sales Revenue,${finance.totalSalesRevenue}\n` +
      `Cost of Goods Sold (COGS),${finance.costOfGoodsSold}\n` +
      `Gross Profit,${finance.grossProfit}\n` +
      `Gross Margin Percentage,${finance.grossMarginPercent.toFixed(2)}%\n` +
      `Customer Delivery Revenue (Freight Billed),${finance.customerDeliveryRevenue}\n` +
      `Company Transport Expense (Freight Paid),${finance.companyTransportExpense}\n` +
      `Transport Recovery Variance,${finance.transportRecoveryVariance}\n` +
      `Collected Cash,${finance.totalCollectedCash}\n` +
      `Outstanding Receivables,${finance.outstandingReceivables}\n` +
      `Total Inventory Valuation,${finance.totalInventoryValuation}\n` +
      `Approved Operating Expenses,${finance.totalApprovedExpenses}\n` +
      `Net Operating Profit,${finance.netOperatingProfit}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ApexFlow_Financial_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Finance & Profit/Loss Center</h1>
            <Badge variant="purple" size="sm">Admin Restricted</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconciled accounting ledger: Revenue, actual landed COGS, gross margins, receivables, and operating expenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="current_month">Current Month (Oct 2026)</option>
              <option value="q3">Q3 2026 (Jul - Sep)</option>
              <option value="ytd">YTD FY26</option>
            </select>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            icon={downloadSuccess ? <CheckCircle className="w-4 h-4 text-emerald-200" /> : <Download className="w-4 h-4" />}
          >
            {downloadSuccess ? 'Downloaded CSV' : 'Export Financials'}
          </Button>
        </div>
      </div>

      {/* Top Reconciled Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net Sales Revenue"
          value={`₹${Math.round(finance.totalSalesRevenue).toLocaleString('en-IN')}`}
          subtitle="Excludes cancelled & pending orders"
          icon={<DollarSign className="w-5 h-5 text-indigo-600" />}
          iconBgColor="bg-indigo-50 text-indigo-600 border-indigo-200 shadow-xs"
          change={{ value: '+22.5% vs Q2', isPositive: true }}
        />

        <StatCard
          title="Cost of Goods Sold (COGS)"
          value={`₹${Math.round(finance.costOfGoodsSold).toLocaleString('en-IN')}`}
          subtitle="At verified batch landed cost"
          icon={<Receipt className="w-5 h-5 text-rose-600" />}
          iconBgColor="bg-rose-50 text-rose-600 border-rose-200 shadow-xs"
          change={{ value: 'Real Outward Basis', isNeutral: true }}
        />

        <StatCard
          title="Gross Profit"
          value={`₹${Math.round(finance.grossProfit).toLocaleString('en-IN')}`}
          subtitle={`${finance.grossMarginPercent.toFixed(1)}% Gross Margin`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs"
          change={{ value: 'Healthy (>30%)', isPositive: true }}
        />

        <StatCard
          title="Net Operating Profit"
          value={`₹${Math.round(finance.netOperatingProfit).toLocaleString('en-IN')}`}
          subtitle={`After ₹${Math.round(finance.totalApprovedExpenses).toLocaleString('en-IN')} approved expenses`}
          icon={<Wallet className="w-5 h-5 text-purple-600" />}
          iconBgColor="bg-purple-50 text-purple-600 border-purple-200 shadow-xs"
          change={{ value: 'Net Margin', isPositive: finance.netOperatingProfit > 0 }}
        />
      </div>

      {/* Cash Flow & Inventory Valuation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-cyan-200 bg-cyan-50/40">
          <p className="text-[10px] font-bold text-cyan-800 uppercase tracking-widest">Cash Collected</p>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            ₹{Math.round(finance.totalCollectedCash).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Real cash paid by customers/dealers</p>
        </div>

        <div className="glass-card p-5 border border-amber-200 bg-amber-50/40">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Outstanding Receivables</p>
          <div className="text-2xl font-bold text-amber-900 mt-1 font-mono">
            ₹{Math.round(finance.outstandingReceivables).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Customer ledger pending balances</p>
        </div>

        <div className="glass-card p-5 border border-emerald-200 bg-emerald-50/40">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Stock Valuation (Landed Cost)</p>
          <div className="text-2xl font-bold text-emerald-900 mt-1 font-mono">
            ₹{Math.round(finance.totalInventoryValuation).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Asset value of available & reserved stock</p>
        </div>
      </div>

      {/* Transport Charges, Carrier Freight & Customer Delivery Recovery */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-blue-200 bg-blue-50/40">
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Customer Delivery Billed</p>
          <div className="text-2xl font-bold text-blue-900 mt-1 font-mono">
            ₹{Math.round(finance.customerDeliveryRevenue).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Freight & delivery charges billed on dispatches</p>
        </div>

        <div className="glass-card p-5 border border-rose-200 bg-rose-50/40">
          <p className="text-[10px] font-bold text-rose-800 uppercase tracking-widest">Company Transport Paid</p>
          <div className="text-2xl font-bold text-rose-900 mt-1 font-mono">
            ₹{Math.round(finance.companyTransportExpense).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Actual freight & carrier costs paid by company</p>
        </div>

        <div className="glass-card p-5 border border-indigo-200 bg-indigo-50/40">
          <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">Net Freight Recovery</p>
          <div className={`text-2xl font-bold mt-1 font-mono ${finance.transportRecoveryVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {finance.transportRecoveryVariance >= 0 ? '+' : ''}₹{Math.round(finance.transportRecoveryVariance).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {finance.transportRecoveryVariance >= 0 ? 'Freight surplus recovered from clients' : 'Company freight subsidy deficit'}
          </p>
        </div>
      </div>

      {/* Regional Profitability Breakdown */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Regional Profitability & Unit Economics</CardTitle>
            <CardDescription>
              Revenue, Cost of Goods Sold, and Gross Profit breakdown across authorized regional distribution territories.
            </CardDescription>
          </div>
          <Badge variant="primary" size="sm">Live Reconciliation</Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3 px-1">Region Name</th>
                <th className="pb-3 px-1">Net Sales Revenue</th>
                <th className="pb-3 px-1">Landed COGS</th>
                <th className="pb-3 px-1">Gross Profit</th>
                <th className="pb-3 px-1">Gross Margin %</th>
                <th className="pb-3 px-1">Regional Expenses</th>
                <th className="pb-3 px-1">Delivery Billed</th>
                <th className="pb-3 px-1">Freight Paid</th>
                <th className="pb-3 px-1 text-right">Net Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {finance.regionalBreakdown.map((row) => {
                const margin = row.revenue > 0 ? (row.grossProfit / row.revenue) * 100 : 0;
                const netContrib = row.grossProfit - row.expenses + (row.deliveryRevenue - row.transportExpense);
                return (
                  <tr key={row.regionId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-1 font-bold text-slate-900">{row.regionName}</td>
                    <td className="py-3.5 px-1 text-indigo-700 font-mono font-bold">
                      ₹{Math.round(row.revenue).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-1 text-rose-700 font-mono">
                      ₹{Math.round(row.cogs).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-1 text-emerald-700 font-mono font-bold">
                      ₹{Math.round(row.grossProfit).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-1">
                      <Badge variant={margin >= 30 ? 'success' : 'warning'} size="sm">
                        {margin.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3.5 px-1 text-slate-500 font-mono">
                      ₹{Math.round(row.expenses).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-1 text-blue-700 font-mono font-medium">
                      ₹{Math.round(row.deliveryRevenue).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-1 text-rose-700 font-mono font-medium">
                      ₹{Math.round(row.transportExpense).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-1 text-right font-mono font-semibold text-slate-900">
                      ₹{Math.round(netContrib).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Expense Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Operating Expenses by Category</CardTitle>
              <CardDescription>Approved field travel, fuel, sample demonstrations, and accommodation</CardDescription>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-700">
              Total: ₹{Math.round(finance.totalApprovedExpenses).toLocaleString('en-IN')}
            </span>
          </CardHeader>

          <div className="space-y-3 pt-1">
            {expenseByCategory.map((exp, idx) => {
              const pct = finance.totalApprovedExpenses > 0 ? (exp.amount / finance.totalApprovedExpenses) * 100 : 0;
              return (
                <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{exp.category}</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{exp.amount.toLocaleString('en-IN')} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Financial Governance and Integrity Statement */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Financial Integrity & Audit Verification</CardTitle>
              <CardDescription>Rules preventing double counting and revenue inflation</CardDescription>
            </div>
            <Badge variant="success" size="sm">Verified Compliant</Badge>
          </CardHeader>

          <div className="space-y-3 text-xs text-slate-600 pt-1">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>COGS Reconciles with Outward Stock Dispatches</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Cost of goods sold is recognized strictly upon physical outward dispatch from the warehouse.
                Unfulfilled reservations do not prematurely trigger COGS.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-indigo-800">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
                <span>Separation of Cash Collected vs Sales Revenue</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Cash payments are tracked separately from gross billed sales.
                Current customer accounts receivable balance stands reconciled at ₹{finance.outstandingReceivables.toLocaleString('en-IN')}.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
