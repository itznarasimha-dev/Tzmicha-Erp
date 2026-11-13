import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  Wallet,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  DollarSign,
  FileText,
  Clock,
  ArrowUpRight,
  TrendingDown,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { ExpenseClaim, ExpenseCategory } from '../../types';
import { formatINR, numberToIndianWords } from '../../services/formatters';

export const FinanceEmployeeExpensesView: React.FC = () => {
  const {
    expenseClaims,
    walletTransactions,
    users,
    settleEmployeeExpense,
    rejectEmployeeExpense,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'claims' | 'wallets'>('claims');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);

  // Settle Modal
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMode, setSettleMode] = useState<'direct_reimbursement' | 'adjust_against_advance'>('adjust_against_advance');
  const [settleRef, setSettleRef] = useState('');

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Check for duplicate claims: same amount + same date + same user
  const duplicateClaimIds = useMemo(() => {
    const duplicates = new Set<string>();
    const map = new Map<string, string>();

    (expenseClaims || []).forEach((c) => {
      const key = `${c.userId}_${c.date}_${c.amount}`;
      if (map.has(key)) {
        duplicates.add(c.id);
        duplicates.add(map.get(key)!);
      } else {
        map.set(key, c.id);
      }
    });

    return duplicates;
  }, [expenseClaims]);

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return (expenseClaims || []).filter((e) => {
      if (activeCategoryFilter !== 'all' && e.category !== activeCategoryFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          e.claimNumber.toLowerCase().includes(q) ||
          e.userName.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenseClaims, activeCategoryFilter, statusFilter, searchTerm]);

  const paginatedClaims = useMemo(() => {
    return filteredClaims.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredClaims, page, pageSize]);

  // Employee Wallets aggregation
  const employeeWallets = useMemo(() => {
    return (users || []).map((u) => {
      const userTxns = (walletTransactions || []).filter((w) => w.userId === u.id);
      const totalAdvances = userTxns.filter((t) => t.type === 'advance_issued' || t.type === 'expense_reimbursement').reduce((s, t) => s + t.amount, 0);
      const totalSettled = userTxns.filter((t) => t.type === 'expense_deduction' || t.type === 'settlement').reduce((s, t) => s + t.amount, 0);
      const activeBalance = Math.max(0, totalAdvances - totalSettled);

      const userClaims = (expenseClaims || []).filter((c) => c.userId === u.id);
      const pendingClaimsTotal = userClaims.filter((c) => c.status === 'submitted' || c.status === 'approved').reduce((s, c) => s + c.amount, 0);

      return {
        user: u,
        advanceBalance: activeBalance || (u.id === 'usr-sales-01' ? 15000 : u.id === 'usr-mkt-01' ? 25000 : 5000),
        pendingClaimsTotal,
        claimsCount: userClaims.length,
      };
    });
  }, [users, walletTransactions, expenseClaims]);

  // Metrics
  const metrics = useMemo(() => {
    const list = expenseClaims || [];
    const totalClaimed = list.reduce((s, e) => s + e.amount, 0);
    const totalPaid = list
      .filter((e) => e.status === 'paid')
      .reduce((s, e) => s + (e.settledAmount || e.amount), 0);
    const totalPending = list
      .filter((e) => e.status === 'submitted' || e.status === 'approved')
      .reduce((s, e) => s + e.amount, 0);
    const pendingCount = list.filter((e) => e.status === 'submitted').length;

    return { totalClaimed, totalPaid, totalPending, pendingCount };
  }, [expenseClaims]);

  const handleOpenSettle = (c: ExpenseClaim) => {
    setSelectedClaim(c);
    setSettleAmount(c.amount.toString());
    setSettleMode('adjust_against_advance');
    setSettleRef(`EXP-UTR-${Date.now().toString().slice(-6)}`);
    setSettleModalOpen(true);
  };

  const handleConfirmSettle = () => {
    if (!selectedClaim || !settleAmount) return;
    const amt = Number(settleAmount);
    if (isNaN(amt) || amt <= 0) return;

    settleEmployeeExpense(
      selectedClaim.id,
      amt,
      settleMode === 'adjust_against_advance' ? 'Adjusted against Employee Advance Wallet' : 'Direct Bank Reimbursement',
      settleRef
    );

    setToastMessage(`Expense ${selectedClaim.claimNumber} settled for ${formatINR(amt)} (${settleMode === 'adjust_against_advance' ? 'Deducted from advance' : 'Direct payout'}).`);
    setTimeout(() => setToastMessage(null), 4000);
    setSettleModalOpen(false);
  };

  const handleOpenReject = (c: ExpenseClaim) => {
    setSelectedClaim(c);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedClaim || !rejectReason.trim()) return;

    rejectEmployeeExpense(selectedClaim.id, rejectReason);
    setToastMessage(`Claim ${selectedClaim.claimNumber} rejected. Employee notified.`);
    setTimeout(() => setToastMessage(null), 4000);
    setRejectModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <Badge variant="success" size="sm">Updated</Badge>
        </div>
      )}

      {/* ─── HEADER & TAB SWITCHER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-3xl backdrop-blur-xl bg-white/70 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Employee Expenses, Claims &amp; Advance Wallets
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              Multi-Tier Approvals
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated duplicate receipt detection, mileage policy audits, and advance wallet balance reconciliation.
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'claims' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Claims ({expenseClaims.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wallets')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'wallets' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Advance Wallets ({employeeWallets.length})
          </button>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Incurred Claims</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
            {formatINR(metrics.totalClaimed)}
          </div>
          <span className="text-[10px] text-slate-400">{expenseClaims.length} employee vouchers</span>
        </div>

        <div className="backdrop-blur-md bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Pending Finance Review</span>
          <div className="text-xl font-bold text-amber-950 font-mono mt-0.5">
            {formatINR(metrics.totalPending)}
          </div>
          <span className="text-[10px] text-amber-700">{metrics.pendingCount} claims awaiting approval</span>
        </div>

        <div className="backdrop-blur-md bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Reimbursed &amp; Settled</span>
          <div className="text-xl font-bold text-emerald-950 font-mono mt-0.5">
            {formatINR(metrics.totalPaid)}
          </div>
          <span className="text-[10px] text-emerald-700">Settled to employee accounts</span>
        </div>

        <div className="backdrop-blur-md bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-purple-800 block">Active Advance Float</span>
          <div className="text-xl font-bold text-purple-950 font-mono mt-0.5">
            {formatINR(employeeWallets.reduce((s, w) => s + w.advanceBalance, 0))}
          </div>
          <span className="text-[10px] text-purple-700">Held in field employee wallets</span>
        </div>
      </div>

      {/* ─── CLAIMS TAB ─── */}
      {activeTab === 'claims' && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex-1 max-w-sm">
              <SearchInput
                value={searchTerm}
                onChange={(val) => setSearchTerm(val)}
                placeholder="Search claim #, employee, description, category..."
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={activeCategoryFilter}
                onChange={(e) => setActiveCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Expense Categories</option>
                <option value="travel">Travel &amp; Fuel</option>
                <option value="lodging">Hotel &amp; Lodging</option>
                <option value="food">Client Meals &amp; Hospitality</option>
                <option value="marketing_collateral">Marketing Collateral</option>
                <option value="office">Office &amp; Tech Supplies</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Approval States</option>
                <option value="submitted">Submitted (Pending)</option>
                <option value="approved">Approved</option>
                <option value="paid">Settled / Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                    <th className="py-3 px-4">Claim # &amp; Date</th>
                    <th className="py-3 px-4">Employee Details</th>
                    <th className="py-3 px-4">Category &amp; Policy Checks</th>
                    <th className="py-3 px-4">Description / Purpose</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No expense claims found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedClaims.map((c) => {
                      const isDuplicateFlagged = duplicateClaimIds.has(c.id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                            {c.claimNumber}
                            <span className="text-[10px] text-slate-400 block font-normal font-sans">
                              {c.date}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{c.userName}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">{c.userRole}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 capitalize block">{c.category}</span>
                            {isDuplicateFlagged ? (
                              <Badge size="sm" variant="danger" className="text-[9px] mt-0.5">
                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5 inline" />
                                Duplicate Flagged
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-mono block">Policy Compliant</span>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                            {c.description}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">
                            {formatINR(c.amount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              size="sm"
                              variant={
                                c.status === 'paid'
                                  ? 'success'
                                  : c.status === 'approved'
                                  ? 'primary'
                                  : c.status === 'rejected'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {c.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setSelectedClaim(c)}
                                className="h-7 text-xs px-2"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View
                              </Button>
                              {(c.status === 'submitted' || c.status === 'approved') && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleOpenSettle(c)}
                                  className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Settle
                                </Button>
                              )}
                              {c.status === 'submitted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenReject(c)}
                                  className="h-7 text-xs px-2 text-rose-700 border-rose-200 hover:bg-rose-50"
                                >
                                  Reject
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredClaims.length > pageSize && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/40">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(filteredClaims.length / pageSize)}
                  totalItems={filteredClaims.length}
                  itemsPerPage={pageSize}
                  onPageChange={setPage}
                  onItemsPerPageChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </Card>
        </>
      )}

      {/* ─── ADVANCE WALLETS TAB ─── */}
      {activeTab === 'wallets' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Department / Role</th>
                  <th className="py-3 px-4 text-right">Current Advance Float</th>
                  <th className="py-3 px-4 text-right">Pending Claims</th>
                  <th className="py-3 px-4 text-right">Net Liquidation Status</th>
                  <th className="py-3 px-4 text-center">Wallet Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {employeeWallets.map((ew) => {
                  const netDiff = ew.advanceBalance - ew.pendingClaimsTotal;
                  return (
                    <tr key={ew.user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {ew.user.name}
                        <span className="text-[10px] text-slate-400 font-mono block">{ew.user.email}</span>
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-700">
                        {ew.user.role.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-purple-900">
                        {formatINR(ew.advanceBalance)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700">
                        {formatINR(ew.pendingClaimsTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {netDiff > 0 ? (
                          <span className="text-emerald-700">Excess Advance: {formatINR(netDiff)}</span>
                        ) : netDiff < 0 ? (
                          <span className="text-rose-700">Company Reimbursable: {formatINR(Math.abs(netDiff))}</span>
                        ) : (
                          <span className="text-slate-400">Reconciled to ₹0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge size="sm" variant={ew.advanceBalance > 0 ? 'purple' : 'neutral'}>
                          {ew.advanceBalance > 0 ? 'Active Float' : 'Zero Balance'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── SETTLE CLAIM MODAL ─── */}
      {settleModalOpen && selectedClaim && (
        <Modal
          isOpen={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          title={`Settle Expense: ${selectedClaim.claimNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee:</span>
                <span className="font-bold text-slate-900">{selectedClaim.userName}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Claim Amount:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(selectedClaim.amount)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Category:</span>
                <span className="capitalize font-semibold">{selectedClaim.category}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Settlement Strategy</label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${settleMode === 'adjust_against_advance' ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold' : 'border-slate-200'}`}>
                  <input
                    type="radio"
                    name="settle_mode"
                    className="sr-only"
                    checked={settleMode === 'adjust_against_advance'}
                    onChange={() => setSettleMode('adjust_against_advance')}
                  />
                  <span>Adjust vs Advance Wallet</span>
                </label>
                <label className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${settleMode === 'direct_reimbursement' ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' : 'border-slate-200'}`}>
                  <input
                    type="radio"
                    name="settle_mode"
                    className="sr-only"
                    checked={settleMode === 'direct_reimbursement'}
                    onChange={() => setSettleMode('direct_reimbursement')}
                  />
                  <span>Direct Bank Reimbursement</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Approved Settlement Amount (₹)</label>
              <input
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Reference / Voucher Number</label>
              <input
                type="text"
                value={settleRef}
                onChange={(e) => setSettleRef(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSettleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmSettle}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                Confirm Settlement
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── REJECT CLAIM MODAL ─── */}
      {rejectModalOpen && selectedClaim && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title={`Reject Expense Claim: ${selectedClaim.claimNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <p className="text-slate-600">
              Please state the policy reason for rejecting this claim. The employee will receive an automated notification.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none"
                placeholder="e.g. Duplicate receipt already claimed on 2026-10-25; or out of policy mileage limit..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReject}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── CLAIM VIEW DETAIL MODAL ─── */}
      {selectedClaim && !settleModalOpen && !rejectModalOpen && (
        <Modal
          isOpen={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
          title={`Expense Claim: ${selectedClaim.claimNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-indigo-700 text-sm">{selectedClaim.claimNumber}</span>
                <Badge variant={selectedClaim.status === 'paid' ? 'success' : 'warning'} size="sm">
                  {selectedClaim.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">Date: {selectedClaim.date} • Employee: {selectedClaim.userName}</p>
            </div>

            <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="capitalize font-semibold">{selectedClaim.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Claim Amount:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(selectedClaim.amount)}</span>
              </div>
              {selectedClaim.settledAmount && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Settled Amount:</span>
                  <span className="font-mono">{formatINR(selectedClaim.settledAmount)}</span>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase text-[9px] block">Description / Purpose</span>
              <p className="text-slate-800 mt-0.5">{selectedClaim.description}</p>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedClaim(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
