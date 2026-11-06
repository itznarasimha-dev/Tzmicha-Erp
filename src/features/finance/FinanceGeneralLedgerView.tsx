import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  Landmark,
  Scale,
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Check,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { JournalEntry, JournalEntryLine, AccountHead } from '../../types';

export const FinanceGeneralLedgerView: React.FC = () => {
  const {
    journalEntries,
    chartOfAccounts,
    createJournalEntry,
    postJournalEntry,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'journal' | 'coa' | 'trial_balance' | 'pnl' | 'balance_sheet' | 'reconciliation'>('journal');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // New Journal Voucher Modal
  const [newVoucherModalOpen, setNewVoucherModalOpen] = useState(false);
  const [voucherDesc, setVoucherDesc] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherRefType, setVoucherRefType] = useState<JournalEntry['referenceType']>('general_adjustment');
  const [voucherRefId, setVoucherRefId] = useState('');
  const [voucherLines, setVoucherLines] = useState<Array<{ accountCode: string; debit: number; credit: number; description: string }>>([
    { accountCode: '1020', debit: 50000, credit: 0, description: 'Bank debited' },
    { accountCode: '4010', debit: 0, credit: 50000, description: 'Revenue credited' },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ─── Filtered Journal Entries ───
  const filteredEntries = useMemo(() => {
    return journalEntries.filter((j) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          j.voucherNumber.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.referenceType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [journalEntries, searchTerm]);

  // ─── Trial Balance Math ───
  const trialBalanceData = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = chartOfAccounts.map((acc) => {
      // Asset / Expense have debit balances; Liability / Equity / Revenue have credit balances
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

    return { assets, totalAssets, liabilities, totalLiabilities, equities, totalEquity, totalLiabilitiesAndEquity: totalLiabilities + totalEquity };
  }, [chartOfAccounts, pnlData]);

  // New Voucher Line Helpers
  const totalModalDebit = voucherLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalModalCredit = voucherLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isVoucherBalanced = totalModalDebit === totalModalCredit && totalModalDebit > 0;

  const handleAddLine = () => {
    setVoucherLines([
      ...voucherLines,
      { accountCode: '1010', debit: 0, credit: 0, description: '' },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (voucherLines.length <= 2) return;
    setVoucherLines(voucherLines.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx: number, field: string, val: any) => {
    setVoucherLines(
      voucherLines.map((line, i) => (i === idx ? { ...line, [field]: val } : line))
    );
  };

  const handleSaveVoucher = () => {
    if (!isVoucherBalanced || !voucherDesc.trim()) return;

    const lines: JournalEntryLine[] = voucherLines.map((l, idx) => {
      const acc = chartOfAccounts.find((a) => a.code === l.accountCode) || {
        name: 'General Ledger Account',
        type: 'asset' as const,
      };
      return {
        id: `jvl-new-${idx}-${Date.now()}`,
        accountCode: l.accountCode,
        accountName: acc.name,
        accountType: acc.type,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description,
      };
    });

    const entry = createJournalEntry({
      date: voucherDate,
      referenceType: voucherRefType,
      referenceId: voucherRefId || undefined,
      description: voucherDesc,
      lines,
      totalDebit: totalModalDebit,
      totalCredit: totalModalCredit,
      status: 'posted',
    });

    setToastMessage(`Journal Voucher ${entry.voucherNumber} created and posted with balanced ₹${totalModalDebit.toLocaleString('en-IN')}.`);
    setTimeout(() => setToastMessage(null), 4000);
    setNewVoucherModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <Badge variant="success" size="sm">Journal Posted</Badge>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            General Ledger &amp; Double-Entry Accounting
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard Chart of Accounts (COA), Journal Vouchers, Trial Balance, Profit &amp; Loss, and Balance Sheet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'journal' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Journal Vouchers ({journalEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('coa')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'coa' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chart of Accounts ({chartOfAccounts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trial_balance')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'trial_balance' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trial Balance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pnl')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pnl' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Profit &amp; Loss
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('balance_sheet')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'balance_sheet' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Balance Sheet
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reconciliation')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'reconciliation' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bank Reconciliation
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => setNewVoucherModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Journal Entry
          </Button>
        </div>
      </div>

      {/* ─── TAB 1: JOURNAL VOUCHERS LEDGER ─── */}
      {activeTab === 'journal' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Journal Entries &amp; Transaction Vouchers</CardTitle>
                <CardDescription>
                  Double-entry posting for sales dispatches, customer collections, raw chemical bills, and staff payroll.
                </CardDescription>
              </div>
              <div className="w-64">
                <SearchInput
                  value={searchTerm}
                  onChange={(val) => setSearchTerm(val)}
                  placeholder="Search voucher #, ref, note..."
                  className="text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Posting Date</th>
                  <th className="py-3 px-4">Transaction Description</th>
                  <th className="py-3 px-4">Reference Type &amp; ID</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredEntries.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {j.voucherNumber}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      {j.date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{j.description}</span>
                      <span className="text-[10px] text-slate-400">{j.lines.length} accounting lines</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 uppercase text-[10px] block">
                        {j.referenceType.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-mono">{j.referenceId || 'Manual Entry'}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{j.totalDebit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{j.totalCredit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge size="sm" variant={j.status === 'posted' ? 'success' : 'warning'}>
                        {j.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedEntry(j)}
                        className="h-7 text-xs px-2"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ledger Lines
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── TAB 2: CHART OF ACCOUNTS (COA) ─── */}
      {activeTab === 'coa' && (
        <Card>
          <CardHeader>
            <CardTitle>Standard Chart of Accounts (COA)</CardTitle>
            <CardDescription>
              Primary ledger heads classified by Assets (1000s), Liabilities (2000s), Equity (3000s), Revenue (4000s), and Expenses (5000s-6000s).
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Account Head Name</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Sub-Category</th>
                  <th className="py-3 px-4 text-right">Opening Float (₹)</th>
                  <th className="py-3 px-4 text-right">Current Ledger Balance (₹)</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {chartOfAccounts.map((acc) => (
                  <tr key={acc.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {acc.code}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {acc.name}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        size="sm"
                        variant={
                          acc.type === 'asset'
                            ? 'primary'
                            : acc.type === 'liability'
                            ? 'danger'
                            : acc.type === 'revenue'
                            ? 'success'
                            : acc.type === 'equity'
                            ? 'purple'
                            : 'warning'
                        }
                      >
                        {acc.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      {acc.category}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      ₹{acc.openingBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      ₹{acc.currentBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs truncate">
                      {acc.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── TAB 3: TRIAL BALANCE ─── */}
      {activeTab === 'trial_balance' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Trial Balance Ledger</CardTitle>
                <CardDescription>
                  Verification of mathematical equality: Total Debit Balances must equal Total Credit Balances.
                </CardDescription>
              </div>
              <Badge variant={trialBalanceData.isBalanced ? 'success' : 'danger'} size="md">
                {trialBalanceData.isBalanced ? 'Balanced Ledger (Debits = Credits)' : 'Discrepancy Detected'}
              </Badge>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Account Head</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4 text-right">Debit Balance (₹)</th>
                  <th className="py-3 px-4 text-right">Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {trialBalanceData.rows.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{row.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.name}</td>
                    <td className="py-3 px-4 uppercase text-[10px] text-slate-500">{row.type}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={3} className="py-3.5 px-4 uppercase tracking-wide">
                    Total Balanced Equality
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm text-indigo-950">
                    ₹{trialBalanceData.totalDebit.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm text-indigo-950">
                    ₹{trialBalanceData.totalCredit.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ─── TAB 4: PROFIT & LOSS STATEMENT ─── */}
      {activeTab === 'pnl' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Income Statement (Profit &amp; Loss)</CardTitle>
                <CardDescription>
                  For the Period Ending October 2026 • Financial Accounting Ledger
                </CardDescription>
              </div>
              <Badge variant={pnlData.netProfit >= 0 ? 'success' : 'danger'} size="md">
                Net Profit: ₹{pnlData.netProfit.toLocaleString('en-IN')}
              </Badge>
            </div>
          </CardHeader>
          <div className="p-6 space-y-6 text-xs text-slate-800 max-w-3xl mx-auto">
            {/* Revenue */}
            <div className="space-y-2">
              <div className="flex justify-between font-black text-sm text-emerald-950 border-b border-emerald-200 pb-1">
                <span>1. Operating Revenue &amp; Surcharges</span>
                <span className="font-mono">₹{pnlData.totalRevenue.toLocaleString('en-IN')}</span>
              </div>
              {pnlData.revenues.map((r) => (
                <div key={r.code} className="flex justify-between pl-4 text-slate-700">
                  <span>{r.name} ({r.code})</span>
                  <span className="font-mono">₹{r.currentBalance.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            {/* COGS */}
            <div className="space-y-2">
              <div className="flex justify-between font-black text-sm text-rose-950 border-b border-rose-200 pb-1">
                <span>2. Cost of Goods Sold (COGS)</span>
                <span className="font-mono">-₹{pnlData.totalCogs.toLocaleString('en-IN')}</span>
              </div>
              {pnlData.cogs.map((c) => (
                <div key={c.code} className="flex justify-between pl-4 text-slate-700">
                  <span>{c.name} ({c.code})</span>
                  <span className="font-mono">₹{c.currentBalance.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            {/* Gross Profit */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex justify-between font-black text-sm text-indigo-950">
              <span>Gross Operating Profit (Revenue - COGS)</span>
              <span className="font-mono">₹{pnlData.grossProfit.toLocaleString('en-IN')}</span>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-2">
              <div className="flex justify-between font-black text-sm text-amber-950 border-b border-amber-200 pb-1">
                <span>3. Operating &amp; Administrative Expenses</span>
                <span className="font-mono">-₹{pnlData.totalOpex.toLocaleString('en-IN')}</span>
              </div>
              {pnlData.opex.map((o) => (
                <div key={o.code} className="flex justify-between pl-4 text-slate-700">
                  <span>{o.name} ({o.code})</span>
                  <span className="font-mono">₹{o.currentBalance.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            {/* Net Operating Profit */}
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex justify-between font-black text-base text-emerald-950 shadow-xs">
              <span>Net Operating Profit / (Loss)</span>
              <span className="font-mono text-lg">₹{pnlData.netProfit.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Card>
      )}

      {/* ─── TAB 5: BALANCE SHEET ─── */}
      {activeTab === 'balance_sheet' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Statement of Financial Position (Balance Sheet)</CardTitle>
                <CardDescription>
                  As of 31 October 2026 • Fundamental Accounting Equation: Assets = Liabilities + Equity
                </CardDescription>
              </div>
              <Badge variant="purple" size="md">
                Balanced Equation: ₹{balanceSheetData.totalAssets.toLocaleString('en-IN')}
              </Badge>
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 text-xs text-slate-800">
            {/* Assets Side */}
            <div className="space-y-4 border-r border-slate-100 pr-4">
              <div className="flex justify-between font-black text-sm text-indigo-950 border-b border-indigo-200 pb-1">
                <span>Total Assets</span>
                <span className="font-mono">₹{balanceSheetData.totalAssets.toLocaleString('en-IN')}</span>
              </div>
              <div className="space-y-2">
                {balanceSheetData.assets.map((a) => (
                  <div key={a.code} className="flex justify-between py-1 border-b border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 block">{a.name}</span>
                      <span className="text-[10px] text-slate-400">{a.category} • Code {a.code}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">₹{a.currentBalance.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Liabilities & Equity Side */}
            <div className="space-y-6">
              {/* Liabilities */}
              <div className="space-y-2">
                <div className="flex justify-between font-black text-sm text-rose-950 border-b border-rose-200 pb-1">
                  <span>Liabilities</span>
                  <span className="font-mono">₹{balanceSheetData.totalLiabilities.toLocaleString('en-IN')}</span>
                </div>
                {balanceSheetData.liabilities.map((l) => (
                  <div key={l.code} className="flex justify-between py-1 border-b border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 block">{l.name}</span>
                      <span className="text-[10px] text-slate-400">{l.category} • Code {l.code}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">₹{l.currentBalance.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              {/* Equity */}
              <div className="space-y-2">
                <div className="flex justify-between font-black text-sm text-purple-950 border-b border-purple-200 pb-1">
                  <span>Promoter Equity &amp; Retained Reserves</span>
                  <span className="font-mono">₹{balanceSheetData.totalEquity.toLocaleString('en-IN')}</span>
                </div>
                {balanceSheetData.equities.map((eq) => (
                  <div key={eq.code} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-medium text-slate-800">{eq.name}</span>
                    <span className="font-mono font-bold text-slate-900">₹{eq.currentBalance.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700 font-bold">
                  <span>Current Period Net Profit Retained</span>
                  <span className="font-mono">₹{pnlData.netProfit.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Total Liabilities & Equity */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex justify-between font-black text-sm text-purple-950">
                <span>Total Liabilities + Equity</span>
                <span className="font-mono">₹{balanceSheetData.totalLiabilitiesAndEquity.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── TAB 6: BANK RECONCILIATION ─── */}
      {activeTab === 'reconciliation' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Multi-Depot Bank Reconciliation</CardTitle>
                <CardDescription>
                  Audit ERP general ledger cash float against external bank statement feeds (HDFC &amp; ICICI Escrow).
                </CardDescription>
              </div>
              <Badge variant="success" size="md">
                100% Reconciled
              </Badge>
            </div>
          </CardHeader>
          <div className="p-6 space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>HDFC Bank Corporate Current A/c 502000889921</span>
                  <Badge variant="success" size="sm">Active Feed</Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Statement Closing Balance:</span>
                    <span className="font-mono font-bold">₹34,12,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ERP General Ledger Book Balance:</span>
                    <span className="font-mono font-bold">₹34,12,500</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                    <span>Unreconciled Variance:</span>
                    <span className="font-mono">₹0.00 (Fully Matched)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>ICICI Escrow Treasury A/c 00120500918</span>
                  <Badge variant="success" size="sm">Active Feed</Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Statement Closing Balance:</span>
                    <span className="font-mono font-bold">₹14,50,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ERP General Ledger Book Balance:</span>
                    <span className="font-mono font-bold">₹14,50,000</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                    <span>Unreconciled Variance:</span>
                    <span className="font-mono">₹0.00 (Fully Matched)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── VOUCHER LINES INSPECT MODAL ─── */}
      {selectedEntry && (
        <Modal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title={`Journal Voucher: ${selectedEntry.voucherNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-sm">
                <span>{selectedEntry.voucherNumber}</span>
                <span className="text-slate-500">{selectedEntry.date}</span>
              </div>
              <p className="text-slate-700">{selectedEntry.description}</p>
              <div className="text-[10px] text-indigo-700 font-mono pt-1">
                Reference: {selectedEntry.referenceType} ({selectedEntry.referenceId || 'N/A'})
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-semibold text-[10px]">
                    <th className="py-2 px-3">Account Code &amp; Name</th>
                    <th className="py-2 px-3">Narration</th>
                    <th className="py-2 px-3 text-right">Debit (₹)</th>
                    <th className="py-2 px-3 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedEntry.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 block">{l.accountName}</span>
                        <span className="text-[10px] text-indigo-600 font-mono">Code {l.accountCode} ({l.accountType})</span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{l.description || '—'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {l.debit > 0 ? `₹${l.debit.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {l.credit > 0 ? `₹${l.credit.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t border-slate-200">
                    <td colSpan={2} className="py-2 px-3">Balanced Total</td>
                    <td className="py-2 px-3 text-right font-mono">₹{selectedEntry.totalDebit.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-right font-mono">₹{selectedEntry.totalCredit.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── NEW JOURNAL VOUCHER MODAL ─── */}
      {newVoucherModalOpen && (
        <Modal
          isOpen={newVoucherModalOpen}
          onClose={() => setNewVoucherModalOpen(false)}
          title="Create New Double-Entry Journal Voucher"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Voucher Date</label>
                <input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Reference Type</label>
                <select
                  value={voucherRefType}
                  onChange={(e) => setVoucherRefType(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="general_adjustment">General Adjustment Voucher</option>
                  <option value="sales_invoice">Sales Invoicing Entry</option>
                  <option value="customer_receipt">Customer Payment Receipt</option>
                  <option value="supplier_invoice">Vendor Bill Recognition</option>
                  <option value="supplier_payment">Vendor Wire Settlement</option>
                  <option value="payroll_disbursement">Payroll Accrual &amp; Wire</option>
                  <option value="expense_reimbursement">Expense Voucher</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Reference # / Doc ID</label>
                <input
                  type="text"
                  value={voucherRefId}
                  onChange={(e) => setVoucherRefId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none"
                  placeholder="e.g. INV-092 or PO-001"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Voucher Description / Narration</label>
              <input
                type="text"
                value={voucherDesc}
                onChange={(e) => setVoucherDesc(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                placeholder="e.g. Allocation of raw chemical inventory from supplier PO"
              />
            </div>

            {/* Accounting Lines Table */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 block">Double-Entry Lines (Must Balance)</span>
                <Button size="sm" variant="outline" onClick={handleAddLine} className="h-6 text-[10px] px-2">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden space-y-2 p-2 bg-slate-50">
                {voucherLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200">
                    <div className="col-span-5">
                      <select
                        value={line.accountCode}
                        onChange={(e) => handleUpdateLine(idx, 'accountCode', e.target.value)}
                        className="w-full text-[11px] p-1.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none"
                      >
                        {chartOfAccounts.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {a.name} ({a.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleUpdateLine(idx, 'description', e.target.value)}
                        placeholder="Line note"
                        className="w-full text-[11px] p-1.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        value={line.debit || ''}
                        onChange={(e) => handleUpdateLine(idx, 'debit', e.target.value)}
                        placeholder="Debit"
                        className="w-full text-[11px] p-1.5 rounded-lg border border-slate-200 font-mono text-right text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        value={line.credit || ''}
                        onChange={(e) => handleUpdateLine(idx, 'credit', e.target.value)}
                        placeholder="Credit"
                        className="w-full text-[11px] p-1.5 rounded-lg border border-slate-200 font-mono text-right text-slate-900 focus:outline-none"
                      />
                      {voucherLines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Balance Check */}
            <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-bold bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2">
                <span>Total Debit: ₹{totalModalDebit.toLocaleString('en-IN')}</span>
                <span>•</span>
                <span>Total Credit: ₹{totalModalCredit.toLocaleString('en-IN')}</span>
              </div>
              <Badge variant={isVoucherBalanced ? 'success' : 'danger'} size="sm">
                {isVoucherBalanced ? 'Balanced Equality' : `Difference: ₹${Math.abs(totalModalDebit - totalModalCredit).toLocaleString('en-IN')}`}
              </Badge>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setNewVoucherModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveVoucher}
                disabled={!isVoucherBalanced || !voucherDesc.trim()}
              >
                <Check className="w-4 h-4 mr-1" />
                Post Journal Voucher
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
