import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
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
} from 'lucide-react';
import { ExpenseClaim, ExpenseCategory } from '../../types';

export const FinanceEmployeeExpensesView: React.FC = () => {
  const {
    expenseClaims,
    walletTransactions,
    users,
    settleEmployeeExpense,
    rejectEmployeeExpense,
  } = useErpStore();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);

  // Settle Modal
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMode, setSettleMode] = useState('HDFC Direct UPI');
  const [settleRef, setSettleRef] = useState('');

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return expenseClaims.filter((e) => {
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

  // Metrics
  const metrics = useMemo(() => {
    const totalClaimed = expenseClaims.reduce((s, e) => s + e.amount, 0);
    const totalPaid = expenseClaims
      .filter((e) => e.status === 'paid')
      .reduce((s, e) => s + (e.settledAmount || e.amount), 0);
    const totalPending = expenseClaims
      .filter((e) => e.status === 'submitted' || e.status === 'approved')
      .reduce((s, e) => s + e.amount, 0);
    const pendingCount = expenseClaims.filter((e) => e.status === 'submitted').length;

    return { totalClaimed, totalPaid, totalPending, pendingCount };
  }, [expenseClaims]);

  const handleOpenSettle = (c: ExpenseClaim) => {
    setSelectedClaim(c);
    setSettleAmount(c.amount.toString());
    setSettleRef(`EXP-UTR-${Date.now().toString().slice(-6)}`);
    setSettleModalOpen(true);
  };

  const handleConfirmSettle = () => {
    if (!selectedClaim || !settleAmount) return;
    const amt = Number(settleAmount);
    if (isNaN(amt) || amt <= 0) return;

    settleEmployeeExpense(selectedClaim.id, amt, settleMode, settleRef);
    setToastMessage(`Expense ${selectedClaim.claimNumber} of ₹${amt.toLocaleString('en-IN')} reimbursed to ${selectedClaim.userName}.`);
    setTimeout(() => setToastMessage(null), 3500);
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
    setToastMessage(`Expense claim ${selectedClaim.claimNumber} rejected. Reason logged.`);
    setTimeout(() => setToastMessage(null), 3500);
    setRejectModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <Badge variant="success" size="sm">Expense Cleared</Badge>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Employee Expenses &amp; Reimbursement Settlements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified tracking for travel, fuel, customer visits, meals, loading, and field operations across Sales, Marketing &amp; Store Keepers.
          </p>
        </div>
      </div>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 bg-white">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Claims Submitted</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalClaimed.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">{expenseClaims.length} total vouchers</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Settled &amp; Reimbursed</span>
          <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
            ₹{metrics.totalPaid.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700">Bank / UPI / Wallet paid</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Pending Audit &amp; Settlement</span>
          <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
            ₹{metrics.totalPending.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-700">{metrics.pendingCount} submitted claims awaiting approval</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40">
          <span className="text-[10px] font-bold uppercase text-purple-800 block">Staff Wallet Advance Floats</span>
          <div className="text-xl font-black text-purple-950 font-mono mt-0.5">
            ₹{(walletTransactions.reduce((s, w) => s + (w.type === 'advance_issued' ? w.amount : 0), 0) - walletTransactions.reduce((s, w) => s + (w.type === 'expense_deduction' ? w.amount : 0), 0)).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-purple-700">Current petty cash buffer float</span>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
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
            <option value="travel">Travel &amp; Lodging</option>
            <option value="fuel">Fuel &amp; Gas</option>
            <option value="food">Meals &amp; Hospitality</option>
            <option value="customer_meeting">Customer Visits</option>
            <option value="loading_unloading">Loading &amp; Labor</option>
            <option value="transportation_freight">Delivery Freight</option>
            <option value="tolls_parking">Tolls &amp; Parking</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Pending Approval</option>
            <option value="approved">Approved (Pending Payment)</option>
            <option value="paid">Settled / Paid</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ─── TABLE ─── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">Claim #</th>
                <th className="py-3 px-4">Employee &amp; Role</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date &amp; Details</th>
                <th className="py-3 px-4 text-right">Claim Amount</th>
                <th className="py-3 px-4 text-right">Settled Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No expense claims found matching filters.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {c.claimNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{c.userName}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{c.userRole?.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge size="sm" variant="neutral">
                        {c.category?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="text-[11px] text-slate-800 line-clamp-1">{c.description}</span>
                      <span className="text-[10px] text-slate-400">{c.date}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{c.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-800">
                      {c.settledAmount !== undefined ? `₹${c.settledAmount.toLocaleString('en-IN')}` : c.status === 'paid' ? `₹${c.amount.toLocaleString('en-IN')}` : '—'}
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
                        {c.status?.toUpperCase()}
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

                        {c.status === 'submitted' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReject(c)}
                              className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenSettle(c)}
                              className="h-7 text-xs px-2"
                            >
                              Settle
                            </Button>
                          </>
                        )}

                        {c.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenSettle(c)}
                            className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Disburse
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── INSPECT CLAIM MODAL ─── */}
      {selectedClaim && !settleModalOpen && !rejectModalOpen && (
        <Modal
          isOpen={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
          title={`Expense Claim: ${selectedClaim.claimNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <div>
                <span className="font-bold text-slate-900 text-sm block">{selectedClaim.userName}</span>
                <span className="text-[10px] text-slate-400 capitalize">{selectedClaim.userRole} • Date: {selectedClaim.date}</span>
              </div>
              <Badge variant="purple" size="md">{selectedClaim.status?.toUpperCase()}</Badge>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">Description &amp; Purpose:</span>
              <p className="text-slate-700 leading-relaxed">{selectedClaim.description}</p>
              <div className="text-[11px] text-indigo-700 font-semibold pt-1">
                Category: {selectedClaim.category?.replace('_', ' ')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase">Claimed Amount</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  ₹{selectedClaim.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-800 block uppercase">Settled Amount</span>
                <span className="text-base font-black text-emerald-950 font-mono">
                  {selectedClaim.settledAmount !== undefined ? `₹${selectedClaim.settledAmount.toLocaleString('en-IN')}` : selectedClaim.status === 'paid' ? `₹${selectedClaim.amount.toLocaleString('en-IN')}` : 'Pending'}
                </span>
              </div>
            </div>

            {selectedClaim.paymentReference && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] font-mono">
                Settlement Ref: <strong>{selectedClaim.paymentReference}</strong> ({selectedClaim.paymentMethod || selectedClaim.paymentMode})
              </div>
            )}

            {selectedClaim.rejectionReason && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px]">
                <strong>Rejection Reason:</strong> {selectedClaim.rejectionReason}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedClaim(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── SETTLE EXPENSE MODAL ─── */}
      {settleModalOpen && selectedClaim && (
        <Modal
          isOpen={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          title={`Settle Expense: ${selectedClaim.claimNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold">
                <span>Employee:</span>
                <span>{selectedClaim.userName}</span>
              </div>
              <div className="flex justify-between">
                <span>Claimed Amount:</span>
                <span className="font-mono font-bold text-slate-900">₹{selectedClaim.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Reimbursement Amount (₹)</label>
              <input
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Disbursement Mode</label>
                <select
                  value={settleMode}
                  onChange={(e) => setSettleMode(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="HDFC Direct UPI">HDFC Direct UPI</option>
                  <option value="Corporate NEFT">Corporate NEFT</option>
                  <option value="Wallet Float Deduction">Wallet Float Deduction</option>
                  <option value="Petty Cash Voucher">Petty Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Transaction Ref #</label>
                <input
                  type="text"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSettleModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmSettle}>
                <Check className="w-4 h-4 mr-1" />
                Confirm Reimbursement
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── REJECT MODAL ─── */}
      {rejectModalOpen && selectedClaim && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title={`Reject Expense: ${selectedClaim.claimNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <p className="text-slate-600">
              Please specify the audit rationale for declining this reimbursement voucher.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Reason for Rejection (Mandatory)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                rows={3}
                placeholder="e.g. Missing fuel toll receipt counterfoil; exceeds daily allowance limits."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
