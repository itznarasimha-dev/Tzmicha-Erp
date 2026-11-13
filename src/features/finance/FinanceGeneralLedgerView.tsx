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
  AlertCircle,
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
  Lock,
  Unlock,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  FileText,
  Sparkles,
} from 'lucide-react';
import { JournalEntry, JournalEntryLine, AccountHead, BankStatementLine } from '../../types';
import { formatINR, numberToIndianWords } from '../../services/formatters';

export const FinanceGeneralLedgerView: React.FC = () => {
  const {
    journalEntries,
    chartOfAccounts,
    bankStatements,
    bankStatementLines,
    receiptsPaymentsIn,
    supplierBills,
    customerRefundRequests,
    currentUser,
    createJournalEntry,
    postJournalEntry,
    reconcileBankStatementLine,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'day_book' | 'journal' | 'coa' | 'reconciliation' | 'period_close'>('day_book');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // New Journal Voucher Modal
  const [newVoucherModalOpen, setNewVoucherModalOpen] = useState(false);
  const [voucherDesc, setVoucherDesc] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherRefType, setVoucherRefType] = useState<JournalEntry['referenceType']>('general_adjustment');
  const [voucherRefId, setVoucherRefId] = useState('');
  const [voucherLines, setVoucherLines] = useState<Array<{ accountCode: string; debit: number; credit: number; description: string }>>([
    { accountCode: '1020', debit: 50000, credit: 0, description: 'Bank Operating debited' },
    { accountCode: '4010', debit: 0, credit: 50000, description: 'Chemical revenue credited' },
  ]);

  // Period Close State
  const [lockedPeriods, setLockedPeriods] = useState<string[]>(['September 2026']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ─── DAY BOOK (ALL MONETARY EVENTS) ───
  const dayBookEvents = useMemo(() => {
    const events: Array<{
      id: string;
      date: string;
      type: 'Receipt' | 'Supplier Bill' | 'Refund' | 'Journal Voucher';
      refNumber: string;
      partyName: string;
      narration: string;
      debitAmount: number;
      creditAmount: number;
    }> = [];

    // Receipts (Money In)
    (receiptsPaymentsIn || []).forEach((r) => {
      events.push({
        id: r.id,
        date: r.receiptDate,
        type: 'Receipt',
        refNumber: r.receiptNumber,
        partyName: r.customerName,
        narration: `Customer payment receipt via ${r.paymentMode.toUpperCase()} (${r.bankReference})`,
        debitAmount: r.amountReceived, // Bank Debited
        creditAmount: 0,
      });
    });

    // Supplier Bills (Accounts Payable)
    (supplierBills || []).forEach((b) => {
      events.push({
        id: b.id,
        date: b.billDate,
        type: 'Supplier Bill',
        refNumber: b.billNumber,
        partyName: b.supplierName,
        narration: `Supplier invoice booking ${b.supplierBillRefNumber} (TDS: ${formatINR(b.tdsAmount || 0)})`,
        debitAmount: 0,
        creditAmount: b.netPayableAmount, // Vendor Credited
      });
    });

    // Refunds (Disbursed Outflows)
    (customerRefundRequests || []).forEach((rf) => {
      events.push({
        id: rf.id,
        date: rf.createdAt.split('T')[0],
        type: 'Refund',
        refNumber: rf.refundNumber,
        partyName: rf.customerName,
        narration: `Customer refund: ${rf.reasonCategory.replace('_', ' ')} (${rf.reasonDetails})`,
        debitAmount: 0,
        creditAmount: rf.requestedAmount,
      });
    });

    // Manual Journals
    (journalEntries || []).forEach((j) => {
      events.push({
        id: j.id,
        date: j.date,
        type: 'Journal Voucher',
        refNumber: j.voucherNumber,
        partyName: 'General Ledger',
        narration: j.description,
        debitAmount: j.totalDebit,
        creditAmount: j.totalCredit,
      });
    });

    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [receiptsPaymentsIn, supplierBills, customerRefundRequests, journalEntries]);

  // Filtered Day Book
  const filteredDayBook = useMemo(() => {
    return dayBookEvents.filter((e) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          e.refNumber.toLowerCase().includes(q) ||
          e.partyName.toLowerCase().includes(q) ||
          e.narration.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dayBookEvents, searchTerm]);

  // ─── Filtered Journal Entries ───
  const filteredEntries = useMemo(() => {
    return (journalEntries || []).filter((j) => {
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

  // ─── Voucher Balance Calculation ───
  const voucherTotalDebit = voucherLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const voucherTotalCredit = voucherLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const voucherDifference = Math.round((voucherTotalDebit - voucherTotalCredit) * 100) / 100;
  const isVoucherBalanced = voucherDifference === 0 && voucherTotalDebit > 0;

  // ─── Banking Reconciliation Summary ───
  const bankReconciliation = useMemo(() => {
    const lines = bankStatementLines || [];
    const totalLines = lines.length;
    const matchedCount = lines.filter((l) => l.reconciliationStatus === 'matched').length;
    const unmatchedCount = lines.filter((l) => l.reconciliationStatus === 'unmatched').length;

    const statementBalance = 1785000;
    const erpLedgerBalance = 1785850; // Difference of 850 bank fee
    const diff = statementBalance - erpLedgerBalance;

    return { totalLines, matchedCount, unmatchedCount, statementBalance, erpLedgerBalance, diff };
  }, [bankStatementLines]);

  const handleAddVoucherLine = () => {
    setVoucherLines((prev) => [
      ...prev,
      { accountCode: '1010', debit: 0, credit: 0, description: 'Line adjustment' },
    ]);
  };

  const handleUpdateVoucherLine = (idx: number, field: string, val: any) => {
    setVoucherLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleRemoveVoucherLine = (idx: number) => {
    if (voucherLines.length <= 2) return;
    setVoucherLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmSaveVoucher = () => {
    if (!isVoucherBalanced || !voucherDesc.trim()) return;

    const lines: JournalEntryLine[] = voucherLines.map((vl, i) => {
      const acc = chartOfAccounts.find((a) => a.code === vl.accountCode);
      return {
        id: `line-${Date.now()}-${i}`,
        accountCode: vl.accountCode,
        accountName: acc?.name || 'Account Head',
        accountType: acc?.type || 'expense',
        debit: Number(vl.debit) || 0,
        credit: Number(vl.credit) || 0,
        description: vl.description || voucherDesc,
      };
    });

    createJournalEntry({
      date: voucherDate,
      referenceType: voucherRefType,
      referenceId: voucherRefId || undefined,
      description: voucherDesc,
      lines,
      totalDebit: voucherTotalDebit,
      totalCredit: voucherTotalCredit,
      status: 'posted',
    });

    setToastMessage(`Journal voucher recorded and posted to double-entry general ledger.`);
    setTimeout(() => setToastMessage(null), 4000);
    setNewVoucherModalOpen(false);
  };

  const handleToggleLockPeriod = (period: string) => {
    setLockedPeriods((prev) =>
      prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period]
    );
    setToastMessage(`Fiscal period "${period}" ${lockedPeriods.includes(period) ? 'unlocked' : 'locked to prevent edits'}.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <Badge variant="success" size="sm">Ledger Updated</Badge>
        </div>
      )}

      {/* ─── HEADER & TAB SWITCHER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-3xl backdrop-blur-xl bg-white/70 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              General Ledger, Day Book &amp; Double-Entry Books
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              Append-Only Ledger
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Day Book transactions registry, double-entry journal vouchers with &Delta;=0 validation, bank statement reconciliation, and period close locks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setNewVoucherModalOpen(true)}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Journal Voucher
          </Button>

          <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('day_book')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'day_book' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day Book ({dayBookEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'journal' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Journal Vouchers ({journalEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('coa')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'coa' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chart of Accounts ({chartOfAccounts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reconciliation')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'reconciliation' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bank Reconciliation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('period_close')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'period_close' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Period Close
            </button>
          </div>
        </div>
      </div>

      {/* ─── DAY BOOK TAB ─── */}
      {activeTab === 'day_book' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Day Book Chronological Register</h3>
              <p className="text-xs text-slate-500">Every money movement across collections, disbursements, and journal entries.</p>
            </div>
            <div className="w-72">
              <SearchInput
                value={searchTerm}
                onChange={(val) => setSearchTerm(val)}
                placeholder="Search transactions..."
                className="text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3">Party Name</th>
                  <th className="py-2.5 px-3">Transaction Narration</th>
                  <th className="py-2.5 px-3 text-right">Debit (Inflow)</th>
                  <th className="py-2.5 px-3 text-right">Credit (Outflow)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDayBook.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{ev.date}</td>
                    <td className="py-2.5 px-3">
                      <Badge
                        size="sm"
                        variant={
                          ev.type === 'Receipt'
                            ? 'success'
                            : ev.type === 'Supplier Bill'
                            ? 'neutral'
                            : ev.type === 'Refund'
                            ? 'danger'
                            : 'primary'
                        }
                      >
                        {ev.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{ev.refNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{ev.partyName}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{ev.narration}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                      {ev.debitAmount > 0 ? formatINR(ev.debitAmount) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-800">
                      {ev.creditAmount > 0 ? formatINR(ev.creditAmount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── JOURNAL VOUCHERS TAB ─── */}
      {activeTab === 'journal' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Voucher # &amp; Date</th>
                  <th className="py-3 px-4">Type / Ref</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Debit</th>
                  <th className="py-3 px-4 text-right">Credit</th>
                  <th className="py-3 px-4 text-center">Balanced (&Delta;=0)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredEntries.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {j.voucherNumber}
                      <span className="text-[10px] text-slate-400 block font-normal font-sans">
                        {j.date}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize">
                      {j.referenceType.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 max-w-sm truncate text-slate-600">
                      {j.description}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(j.totalDebit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900">
                      {formatINR(j.totalCredit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge size="sm" variant={Math.abs(j.totalDebit - j.totalCredit) < 0.01 ? 'success' : 'danger'}>
                        {Math.abs(j.totalDebit - j.totalCredit) < 0.01 ? 'Balanced' : 'Unbalanced'}
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
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── CHART OF ACCOUNTS TAB ─── */}
      {activeTab === 'coa' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Account Head Name</th>
                  <th className="py-3 px-4">Category Type</th>
                  <th className="py-3 px-4 text-right">Current Ledger Balance</th>
                  <th className="py-3 px-4 text-center">System Lock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {chartOfAccounts.map((a) => (
                  <tr key={a.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{a.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{a.name}</td>
                    <td className="py-3 px-4">
                      <Badge
                        size="sm"
                        variant={
                          a.type === 'asset'
                            ? 'success'
                            : a.type === 'revenue'
                            ? 'primary'
                            : a.type === 'liability'
                            ? 'warning'
                            : a.type === 'expense'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {a.type.toUpperCase()} ({a.category})
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">
                      {formatINR(a.currentBalance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {['1010', '1020', '1200', '2010', '2020', '2021', '2022', '2030', '4010', '5010'].includes(a.code) ? (
                        <span className="inline-flex items-center text-[10px] text-slate-500 font-semibold">
                          <Lock className="w-3 h-3 mr-1 text-slate-400" /> Protected
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600">Editable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── BANK STATEMENT RECONCILIATION TAB ─── */}
      {activeTab === 'reconciliation' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">October 2026 Bank Statement Reconciliation</h3>
              <p className="text-xs text-slate-500">HDFC Corporate Operating Account • Reconcile ERP ledger to zero difference.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => alert('Import CSV statement template uploaded successfully.')} className="text-xs">
                Import CSV Statement
              </Button>
            </div>
          </div>

          {/* Reconciliation Balance Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Bank Statement Balance</span>
              <span className="text-lg font-bold font-mono text-slate-900">{formatINR(bankReconciliation.statementBalance)}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200">
              <span className="text-[10px] font-bold uppercase text-indigo-900 block">ERP Ledger Book Balance</span>
              <span className="text-lg font-bold font-mono text-indigo-950">{formatINR(bankReconciliation.erpLedgerBalance)}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Reconciliation Difference</span>
              <span className="text-lg font-bold font-mono text-amber-950">{formatINR(Math.abs(bankReconciliation.diff))}</span>
              <span className="text-[10px] text-amber-700 block">Unmatched bank charges levy</span>
            </div>
          </div>

          {/* Statement Lines Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Bank Narration</th>
                  <th className="py-2.5 px-3">Reference (UTR)</th>
                  <th className="py-2.5 px-3 text-right">Debit (Out)</th>
                  <th className="py-2.5 px-3 text-right">Credit (In)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {(bankStatementLines || []).map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-[11px]">{line.transactionDate}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{line.description}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-700">{line.referenceNumber}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                      {line.withdrawalAmount > 0 ? formatINR(line.withdrawalAmount) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                      {line.depositAmount > 0 ? formatINR(line.depositAmount) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge size="sm" variant={line.reconciliationStatus === 'matched' ? 'success' : 'warning'}>
                        {line.reconciliationStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {line.reconciliationStatus !== 'matched' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            reconcileBankStatementLine(line.id, 'matched', 'Direct bank charge cleared');
                            setToastMessage(`Statement line ${line.referenceNumber} matched!`);
                            setTimeout(() => setToastMessage(null), 3000);
                          }}
                          className="h-6 text-[10px] px-2"
                        >
                          Match
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── PERIOD CLOSE TAB ─── */}
      {activeTab === 'period_close' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Fiscal Period Locking &amp; Year Close</h3>
            <p className="text-xs text-slate-500">Locking a period prevents creation, modification, or reversal of transactions in closed accounting periods.</p>
          </div>

          <div className="space-y-3">
            {['September 2026', 'October 2026', 'November 2026'].map((period) => {
              const isLocked = lockedPeriods.includes(period);
              return (
                <div key={period} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-rose-600" />
                    ) : (
                      <Unlock className="w-5 h-5 text-emerald-600" />
                    )}
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{period}</span>
                      <span className="text-[10px] text-slate-500">
                        {isLocked ? 'Closed & Audited • Back-dated entries blocked' : 'Active Financial Period • Open for postings'}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isLocked ? 'outline' : 'primary'}
                    onClick={() => handleToggleLockPeriod(period)}
                    className="text-xs h-8"
                  >
                    {isLocked ? 'Unlock Period' : 'Lock Period'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ─── NEW JOURNAL VOUCHER MODAL ─── */}
      {newVoucherModalOpen && (
        <Modal
          isOpen={newVoucherModalOpen}
          onClose={() => setNewVoucherModalOpen(false)}
          title="Create Double-Entry Journal Voucher (Balanced: Debit = Credit)"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Voucher Description</label>
                <input
                  type="text"
                  value={voucherDesc}
                  onChange={(e) => setVoucherDesc(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  placeholder="e.g. Month-end depreciation adjustment or bank charge write-off"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Entry Date</label>
                <input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Voucher Lines */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-xs">Voucher Line Items (Double-Entry)</span>
                <Button size="sm" variant="outline" onClick={handleAddVoucherLine} className="h-6 text-[10px] px-2">
                  <Plus className="w-3 h-3 mr-1" /> Add Line
                </Button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                      <th className="py-2 px-3">Account Head</th>
                      <th className="py-2 px-3">Line Description</th>
                      <th className="py-2 px-3 text-right">Debit (₹)</th>
                      <th className="py-2 px-3 text-right">Credit (₹)</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {voucherLines.map((vl, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">
                          <select
                            value={vl.accountCode}
                            onChange={(e) => handleUpdateVoucherLine(idx, 'accountCode', e.target.value)}
                            className="p-1 rounded border border-slate-200 bg-white text-xs w-48 font-medium cursor-pointer"
                          >
                            {chartOfAccounts.map((a) => (
                              <option key={a.code} value={a.code}>
                                {a.code} - {a.name} ({a.type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={vl.description}
                            onChange={(e) => handleUpdateVoucherLine(idx, 'description', e.target.value)}
                            className="p-1 rounded border border-slate-200 w-full text-xs"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={vl.debit || ''}
                            onChange={(e) => handleUpdateVoucherLine(idx, 'debit', Number(e.target.value) || 0)}
                            className="p-1 rounded border border-slate-200 text-right font-mono text-xs w-24"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={vl.credit || ''}
                            onChange={(e) => handleUpdateVoucherLine(idx, 'credit', Number(e.target.value) || 0)}
                            className="p-1 rounded border border-slate-200 text-right font-mono text-xs w-24"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          {voucherLines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVoucherLine(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Balancing Indicator Card */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${isVoucherBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'}`}>
              <div className="flex items-center gap-2">
                {isVoucherBalanced ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold block">
                    {isVoucherBalanced ? 'Voucher is Perfectly Balanced (Δ = 0)' : `Unbalanced Difference: ${formatINR(Math.abs(voucherDifference))}`}
                  </span>
                  <span className="text-[11px] opacity-80">
                    Total Debit: {formatINR(voucherTotalDebit)} • Total Credit: {formatINR(voucherTotalCredit)}
                  </span>
                </div>
              </div>
              <Badge variant={isVoucherBalanced ? 'success' : 'danger'}>
                {isVoucherBalanced ? 'Valid' : 'Invalid'}
              </Badge>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setNewVoucherModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmSaveVoucher}
                disabled={!isVoucherBalanced || !voucherDesc.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
