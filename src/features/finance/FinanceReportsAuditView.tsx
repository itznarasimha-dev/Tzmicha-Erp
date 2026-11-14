import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/Input';
import {
  FileSpreadsheet,
  ShieldCheck,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Users,
  Truck,
  HelpCircle,
  Scale,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { formatINR, numberToIndianWords } from '../../services/formatters';

export const FinanceReportsAuditView: React.FC = () => {
  const {
    auditLogs,
    invoices,
    supplierBills,
    creditNotes,
    chartOfAccounts,
    customers,
    suppliers,
    expenseClaims,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'financial_statements' | 'gst_tax_center' | 'audit_trail'>('financial_statements');
  const [statementType, setStatementType] = useState<'pnl' | 'balance_sheet' | 'trial_balance'>('pnl');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // ─── P&L Math ───
  const pnlData = useMemo(() => {
    const revenues = chartOfAccounts.filter((a) => a.type === 'revenue');
    const totalRevenue = revenues.reduce((s, a) => s + a.currentBalance, 0);

    const cogs = chartOfAccounts.filter((a) => a.category === 'COGS');
    const totalCogs = cogs.reduce((s, a) => s + a.currentBalance, 0);
    const grossProfit = totalRevenue - totalCogs;

    const opex = chartOfAccounts.filter((a) => a.type === 'expense' && a.category !== 'COGS');
    const totalOpex = opex.reduce((s, a) => s + a.currentBalance, 0);
    const netProfit = grossProfit - totalOpex;

    return { revenues, totalRevenue, cogs, totalCogs, grossProfit, opex, totalOpex, netProfit };
  }, [chartOfAccounts]);

  // ─── Balance Sheet Math ───
  const balanceSheetData = useMemo(() => {
    const assets = chartOfAccounts.filter((a) => a.type === 'asset');
    const totalAssets = assets.reduce((s, a) => s + a.currentBalance, 0);

    const liabilities = chartOfAccounts.filter((a) => a.type === 'liability');
    const totalLiabilities = liabilities.reduce((s, a) => s + a.currentBalance, 0);

    const equities = chartOfAccounts.filter((a) => a.type === 'equity');
    const totalEquity = equities.reduce((s, a) => s + a.currentBalance, 0) + pnlData.netProfit;

    return {
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.round(totalAssets) === Math.round(totalLiabilities + totalEquity),
    };
  }, [chartOfAccounts, pnlData]);

  // ─── Trial Balance Math ───
  const trialBalanceData = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = chartOfAccounts.map((acc) => {
      let debit = 0;
      let credit = 0;
      if (acc.type === 'asset' || acc.type === 'expense') {
        debit = acc.currentBalance;
        totalDebit += debit;
      } else {
        credit = acc.currentBalance;
        totalCredit += credit;
      }
      return { ...acc, debit, credit };
    });

    return { rows, totalDebit, totalCredit, isBalanced: totalDebit === totalCredit };
  }, [chartOfAccounts]);

  // ─── GST Center Aggregate Data ───
  const gstCenterData = useMemo(() => {
    const totalOutwardTaxable = (invoices || []).reduce((s, i) => s + i.subtotal, 0);
    const totalCgstOutput = (invoices || []).reduce((s, i) => s + (i.cgstAmount || 0), 0);
    const totalSgstOutput = (invoices || []).reduce((s, i) => s + (i.sgstAmount || 0), 0);
    const totalIgstOutput = (invoices || []).reduce((s, i) => s + (i.igstAmount || 0), 0);
    const totalTaxLiability = totalCgstOutput + totalSgstOutput + totalIgstOutput;

    // Table 9B Credit Notes
    const totalCreditNotesValue = (creditNotes || []).reduce((s, c) => s + c.totalAmount, 0);
    const totalCreditNotesGstReversed = (creditNotes || []).reduce(
      (s, c) => s + (c.cgstAmount + c.sgstAmount + c.igstAmount),
      0
    );

    // Inward Eligible ITC from Supplier Bills
    const eligibleItcTotal = (supplierBills || []).reduce((s, b) => s + b.taxAmount, 0);
    const netGstPayable = Math.max(0, totalTaxLiability - totalCreditNotesGstReversed - eligibleItcTotal);

    // TDS deductions
    const totalTdsDeducted = (supplierBills || []).reduce((s, b) => s + (b.tdsAmount || 0), 0);

    return {
      totalOutwardTaxable,
      totalCgstOutput,
      totalSgstOutput,
      totalIgstOutput,
      totalTaxLiability,
      totalCreditNotesValue,
      totalCreditNotesGstReversed,
      eligibleItcTotal,
      netGstPayable,
      totalTdsDeducted,
    };
  }, [invoices, creditNotes, supplierBills]);

  // Filtered Audit Logs
  const financialAuditLogs = useMemo(() => {
    return (auditLogs || [])
      .filter((log) => {
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          return (
            log.action.toLowerCase().includes(q) ||
            log.userName.toLowerCase().includes(q) ||
            log.details.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, searchTerm]);

  // CSV Exporter
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = 'Financial_Report.csv';

    if (activeTab === 'financial_statements') {
      if (statementType === 'pnl') {
        filename = 'Profit_and_Loss_Statement.csv';
        headers = ['Account_Classification', 'Account_Head', 'Amount_INR'];
        pnlData.revenues.forEach((r) => rows.push(['Revenue', r.name, r.currentBalance.toString()]));
        rows.push(['Total Revenue', 'Gross Sales Turnover', pnlData.totalRevenue.toString()]);
        pnlData.cogs.forEach((c) => rows.push(['COGS', c.name, c.currentBalance.toString()]));
        rows.push(['Gross Profit', 'Revenue minus COGS', pnlData.grossProfit.toString()]);
        pnlData.opex.forEach((o) => rows.push(['Operating Expense', o.name, o.currentBalance.toString()]));
        rows.push(['Net Profit', 'Final Accounting Profit', pnlData.netProfit.toString()]);
      } else if (statementType === 'trial_balance') {
        filename = 'Trial_Balance.csv';
        headers = ['Code', 'Account_Head', 'Classification', 'Debit_INR', 'Credit_INR'];
        trialBalanceData.rows.forEach((r) => {
          rows.push([r.code, r.name, r.type, r.debit.toString(), r.credit.toString()]);
        });
      } else {
        filename = 'Balance_Sheet.csv';
        headers = ['Category', 'Account_Head', 'Balance_INR'];
        balanceSheetData.assets.forEach((a) => rows.push(['Asset', a.name, a.currentBalance.toString()]));
        balanceSheetData.liabilities.forEach((l) => rows.push(['Liability', l.name, l.currentBalance.toString()]));
        balanceSheetData.equities.forEach((e) => rows.push(['Equity', e.name, e.currentBalance.toString()]));
        rows.push(['Retained Earnings', 'Net Current Period Profit', pnlData.netProfit.toString()]);
      }
    } else if (activeTab === 'gst_tax_center') {
      filename = 'GST_GSTR1_GSTR3B_Report.csv';
      headers = ['Tax_Section', 'Metric', 'Amount_INR'];
      rows.push(['GSTR-1 Outward', 'Total Taxable Turnover', gstCenterData.totalOutwardTaxable.toString()]);
      rows.push(['GSTR-1 Outward', 'CGST Output', gstCenterData.totalCgstOutput.toString()]);
      rows.push(['GSTR-1 Outward', 'SGST Output', gstCenterData.totalSgstOutput.toString()]);
      rows.push(['GSTR-1 Outward', 'IGST Output', gstCenterData.totalIgstOutput.toString()]);
      rows.push(['Table 9B', 'Credit Notes Reversals', gstCenterData.totalCreditNotesGstReversed.toString()]);
      rows.push(['GSTR-3B Inward', 'Eligible Input Tax Credit (ITC)', gstCenterData.eligibleItcTotal.toString()]);
      rows.push(['Net Liability', 'Cash GST Payable to Government', gstCenterData.netGstPayable.toString()]);
      rows.push(['TDS Sec 194', 'Total TDS Withheld on Payables', gstCenterData.totalTdsDeducted.toString()]);
    } else {
      filename = 'Financial_Audit_Trail.csv';
      headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Details'];
      financialAuditLogs.forEach((l) => {
        rows.push([l.timestamp, l.userName, l.userRole, l.action, l.entityType, `"${l.details}"`]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice(`Exported ${filename} successfully.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-5">
      {exportNotice && (
        <div className="p-3.5 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{exportNotice}</span>
          </div>
          <Badge variant="success" size="sm">Downloaded</Badge>
        </div>
      )}

      {/* ─── HEADER & TAB SWITCHER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-3xl backdrop-blur-xl bg-white/70 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Statutory Reports, GST Center &amp; Audit Trail
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              MCA &amp; GST Ready
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official financial statements (P&amp;L, Balance Sheet, Trial Balance), GSTR-1/3B summary with eligible ITC, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()} className="text-xs">
            <Printer className="w-4 h-4 mr-1" />
            Print
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleExportCsv}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>

          <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('financial_statements')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'financial_statements' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Financial Statements
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gst_tax_center')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'gst_tax_center' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              GST &amp; TDS Center
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit_trail')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'audit_trail' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Trail ({auditLogs?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* ─── FINANCIAL STATEMENTS TAB ─── */}
      {activeTab === 'financial_statements' && (
        <div className="space-y-4">
          {/* Sub-Tabs: P&L vs Balance Sheet vs Trial Balance */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setStatementType('pnl')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statementType === 'pnl' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Profit &amp; Loss Statement (P&amp;L)
            </button>
            <button
              type="button"
              onClick={() => setStatementType('balance_sheet')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statementType === 'balance_sheet' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Balance Sheet
            </button>
            <button
              type="button"
              onClick={() => setStatementType('trial_balance')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statementType === 'trial_balance' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Trial Balance
            </button>
          </div>

          {/* P&L VIEW */}
          {statementType === 'pnl' && (
            <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Statement of Profit &amp; Loss</h3>
                  <p className="text-xs text-slate-500">For the period ended 31st October 2026 (Figures in INR)</p>
                </div>
                <Badge variant="success" size="md">Net Margin: {((pnlData.netProfit / pnlData.totalRevenue) * 100).toFixed(1)}%</Badge>
              </div>

              <div className="space-y-3 text-xs">
                {/* Revenue Section */}
                <div className="space-y-1">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block tracking-wider">I. Revenue from Operations</span>
                  {pnlData.revenues.map((r) => (
                    <div key={r.code} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">{r.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(r.currentBalance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 font-bold text-slate-900 bg-slate-50 px-2 rounded-lg">
                    <span>Total Revenue (A)</span>
                    <span className="font-mono">{formatINR(pnlData.totalRevenue)}</span>
                  </div>
                </div>

                {/* COGS Section */}
                <div className="space-y-1 pt-2">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block tracking-wider">II. Cost of Goods Sold (Raw Materials &amp; Procurement)</span>
                  {pnlData.cogs.map((c) => (
                    <div key={c.code} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">{c.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(c.currentBalance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 font-bold text-slate-900 bg-slate-50 px-2 rounded-lg">
                    <span>Total Cost of Sales (B)</span>
                    <span className="font-mono">{formatINR(pnlData.totalCogs)}</span>
                  </div>
                </div>

                {/* Gross Profit */}
                <div className="flex justify-between py-2 border-y-2 border-slate-300 font-bold text-indigo-950 text-sm bg-indigo-50/50 px-2 rounded-lg">
                  <span>Gross Profit (A &minus; B)</span>
                  <span className="font-mono">{formatINR(pnlData.grossProfit)}</span>
                </div>

                {/* OPEX Section */}
                <div className="space-y-1 pt-2">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block tracking-wider">III. Operating &amp; Administrative Expenses</span>
                  {pnlData.opex.map((o) => (
                    <div key={o.code} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">{o.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(o.currentBalance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 font-bold text-slate-900 bg-slate-50 px-2 rounded-lg">
                    <span>Total Operating Expenses (C)</span>
                    <span className="font-mono">{formatINR(pnlData.totalOpex)}</span>
                  </div>
                </div>

                {/* Net Profit */}
                <div className="flex justify-between py-3 border-t-2 border-emerald-500 font-bold text-base text-emerald-950 bg-emerald-50 px-3 rounded-xl mt-3">
                  <span>Net Profit for the Period</span>
                  <span className="font-mono">{formatINR(pnlData.netProfit)}</span>
                </div>
              </div>
            </Card>
          )}

          {/* BALANCE SHEET VIEW */}
          {statementType === 'balance_sheet' && (
            <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Balance Sheet</h3>
                  <p className="text-xs text-slate-500">As at 31st October 2026 • Accounting Equation: Assets = Liabilities + Equity</p>
                </div>
                <Badge variant={balanceSheetData.isBalanced ? 'success' : 'danger'} size="md">
                  {balanceSheetData.isBalanced ? 'Equation Balanced (Δ=0)' : 'Equation Variance'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Left: Assets */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                    Assets (Applications of Funds)
                  </h4>
                  <div className="space-y-1.5">
                    {balanceSheetData.assets.map((a) => (
                      <div key={a.code} className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700">{a.name}</span>
                        <span className="font-mono font-bold text-slate-900">{formatINR(a.currentBalance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t-2 border-slate-300 font-bold text-slate-900 text-sm bg-slate-50 px-2 rounded-lg mt-2">
                      <span>Total Assets</span>
                      <span className="font-mono">{formatINR(balanceSheetData.totalAssets)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Liabilities & Equity */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase text-[11px] text-indigo-900 bg-indigo-50 p-2 rounded-lg">
                    Liabilities &amp; Equity (Sources of Funds)
                  </h4>
                  <div className="space-y-1.5">
                    <span className="font-bold text-[10px] text-slate-400 uppercase block">Liabilities</span>
                    {balanceSheetData.liabilities.map((l) => (
                      <div key={l.code} className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700">{l.name}</span>
                        <span className="font-mono font-bold text-slate-900">{formatINR(l.currentBalance)}</span>
                      </div>
                    ))}

                    <span className="font-bold text-[10px] text-slate-400 uppercase block pt-2">Equity &amp; Reserves</span>
                    {balanceSheetData.equities.map((e) => (
                      <div key={e.code} className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700">{e.name}</span>
                        <span className="font-mono font-bold text-slate-900">{formatINR(e.currentBalance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                      <span>Retained Current Period Profit</span>
                      <span className="font-mono font-bold">{formatINR(pnlData.netProfit)}</span>
                    </div>

                    <div className="flex justify-between py-2 border-t-2 border-slate-300 font-bold text-slate-900 text-sm bg-slate-50 px-2 rounded-lg mt-2">
                      <span>Total Liabilities &amp; Equity</span>
                      <span className="font-mono">{formatINR(balanceSheetData.totalLiabilitiesAndEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TRIAL BALANCE VIEW */}
          {statementType === 'trial_balance' && (
            <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] bg-slate-50/70">
                      <th className="py-2.5 px-3">Account Code</th>
                      <th className="py-2.5 px-3">Account Head</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3 text-right">Debit Balance (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {trialBalanceData.rows.map((r) => (
                      <tr key={r.code} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{r.code}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                        <td className="py-2.5 px-3 uppercase text-slate-500">{r.type}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                          {r.debit > 0 ? formatINR(r.debit) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-indigo-900">
                          {r.credit > 0 ? formatINR(r.credit) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900 text-sm">
                      <td colSpan={3} className="py-3 px-3">Grand Total Trial Balance</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-950">{formatINR(trialBalanceData.totalDebit)}</td>
                      <td className="py-3 px-3 text-right font-mono text-indigo-950">{formatINR(trialBalanceData.totalCredit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── GST & TDS CENTER TAB ─── */}
      {activeTab === 'gst_tax_center' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs p-5 space-y-5">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Indian GST &amp; TDS Statutory Tax Center</h3>
              <p className="text-xs text-slate-500">GSTR-1 Outward Register • GSTR-3B Input Tax Credit • TDS Deductions</p>
            </div>
            <Badge variant="purple" size="md">GST Rule 46 / 53 Compliant</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
              <span className="text-[10px] font-bold uppercase text-indigo-900 block">GSTR-1 Outward Supplies</span>
              <div className="text-xl font-bold font-mono text-indigo-950">{formatINR(gstCenterData.totalOutwardTaxable)}</div>
              <div className="space-y-1 text-xs text-indigo-900 pt-2 border-t border-indigo-200">
                <div className="flex justify-between">
                  <span>CGST Output:</span>
                  <span className="font-mono">{formatINR(gstCenterData.totalCgstOutput)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST Output:</span>
                  <span className="font-mono">{formatINR(gstCenterData.totalSgstOutput)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGST Output:</span>
                  <span className="font-mono">{formatINR(gstCenterData.totalIgstOutput)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <span className="text-[10px] font-bold uppercase text-emerald-900 block">GSTR-3B Eligible ITC</span>
              <div className="text-xl font-bold font-mono text-emerald-950">{formatINR(gstCenterData.eligibleItcTotal)}</div>
              <p className="text-xs text-emerald-800 pt-2 border-t border-emerald-200">
                Input Tax Credit accrued on verified supplier bills (Reliance Petrochem, Gati Freight, Packaging).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
              <span className="text-[10px] font-bold uppercase text-purple-900 block">TDS Withheld Cumulative</span>
              <div className="text-xl font-bold font-mono text-purple-950">{formatINR(gstCenterData.totalTdsDeducted)}</div>
              <p className="text-xs text-purple-800 pt-2 border-t border-purple-200">
                Withheld under Sections 194C (Contractors), 194J (Technical Fees), and 194Q.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-xs block">Net Cash GST Payable to Tax Authority</span>
              <span className="text-[11px] text-slate-500">
                Output Liability ({formatINR(gstCenterData.totalTaxLiability)}) &minus; Credit Notes ({formatINR(gstCenterData.totalCreditNotesGstReversed)}) &minus; ITC ({formatINR(gstCenterData.eligibleItcTotal)})
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold font-mono text-emerald-900 block">{formatINR(gstCenterData.netGstPayable)}</span>
              <span className="text-[10px] text-emerald-700">Challan PMT-06 Ready</span>
            </div>
          </div>
        </Card>
      )}

      {/* ─── FINANCIAL AUDIT TRAIL TAB ─── */}
      {activeTab === 'audit_trail' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Append-Only Financial Mutation Audit Trail</h3>
              <p className="text-xs text-slate-500">Tamper-evident logs of every invoice created, payment allocated, note issued, and voucher posted.</p>
            </div>
            <div className="w-72">
              <SearchInput
                value={searchTerm}
                onChange={(val) => setSearchTerm(val)}
                placeholder="Search audit actions, users..."
                className="text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Authorized User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {financialAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{log.timestamp.replace('T', ' ').slice(0, 19)}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{log.userName}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px]">
                      <Badge size="sm" variant="neutral">{log.userRole}</Badge>
                    </td>
                    <td className="py-2.5 px-3 uppercase font-mono font-bold text-indigo-700">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-md truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
