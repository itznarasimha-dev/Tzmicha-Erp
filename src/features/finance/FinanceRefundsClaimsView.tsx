import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Receipt,
  RotateCcw,
  ShieldAlert,
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
  Layers,
} from 'lucide-react';
import { FinanceRefundClaim, ClaimType } from '../../types';

export const FinanceRefundsClaimsView: React.FC = () => {
  const {
    financeClaims,
    approveFinanceClaim,
    rejectFinanceClaim,
    disburseFinanceClaim,
  } = useErpStore();

  const [activeCategory, setActiveCategory] = useState<'all' | 'customer' | 'supplier' | 'stock_loss'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedClaim, setSelectedClaim] = useState<FinanceRefundClaim | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState<'bank_transfer' | 'credit_note' | 'upi' | 'wallet_credit'>('credit_note');
  const [approvalNotes, setApprovalNotes] = useState('');

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [disburseRef, setDisburseRef] = useState('');
  const [disburseMethod, setDisburseMethod] = useState<'bank_transfer' | 'credit_note' | 'upi' | 'wallet_credit'>('bank_transfer');

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ─── Filtered Claims ───
  const filteredClaims = useMemo(() => {
    return financeClaims.filter((c) => {
      // Category filter
      if (activeCategory === 'customer' && c.claimSource !== 'customer' && c.claimSource !== 'sales') return false;
      if (activeCategory === 'supplier' && c.claimSource !== 'supplier') return false;
      if (activeCategory === 'stock_loss' && c.type !== 'internal_stock_loss') return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && c.refundStatus !== 'pending') return false;
        if (statusFilter === 'approved' && c.refundStatus !== 'approved') return false;
        if (statusFilter === 'disbursed' && c.refundStatus !== 'disbursed') return false;
        if (statusFilter === 'rejected' && c.refundStatus !== 'rejected') return false;
      }

      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.partyName.toLowerCase().includes(q) ||
          c.productName.toLowerCase().includes(q) ||
          (c.orderNumber && c.orderNumber.toLowerCase().includes(q)) ||
          (c.batchNumber && c.batchNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [financeClaims, activeCategory, statusFilter, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const totalRequested = financeClaims.reduce((s, c) => s + c.requestedAmount, 0);
    const totalApprovedPending = financeClaims
      .filter((c) => c.refundStatus === 'approved' && c.payoutStatus === 'unpaid')
      .reduce((s, c) => s + (c.approvedAmount || c.requestedAmount), 0);
    const totalDisbursed = financeClaims
      .filter((c) => c.payoutStatus === 'paid')
      .reduce((s, c) => s + (c.approvedAmount || c.requestedAmount), 0);
    const pendingCount = financeClaims.filter((c) => c.refundStatus === 'pending').length;
    return { totalRequested, totalApprovedPending, totalDisbursed, pendingCount };
  }, [financeClaims]);

  const handleOpenApprove = (c: FinanceRefundClaim) => {
    setSelectedClaim(c);
    setApprovedAmount(c.requestedAmount.toString());
    setRefundMethod('credit_note');
    setApprovalNotes('Damage inspection verified; authorized credit adjustment');
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedClaim || !approvedAmount) return;
    const amt = Number(approvedAmount);
    if (isNaN(amt) || amt <= 0) return;

    approveFinanceClaim(selectedClaim.id, amt, refundMethod, approvalNotes);
    setActionSuccess(`Claim ${selectedClaim.id} approved for ₹${amt.toLocaleString('en-IN')}. Note: Payment is pending disbursement.`);
    setTimeout(() => setActionSuccess(null), 4000);
    setApproveModalOpen(false);
  };

  const handleOpenReject = (c: FinanceRefundClaim) => {
    setSelectedClaim(c);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedClaim || !rejectionReason.trim()) return;

    rejectFinanceClaim(selectedClaim.id, rejectionReason);
    setActionSuccess(`Claim ${selectedClaim.id} rejected. Reason recorded.`);
    setTimeout(() => setActionSuccess(null), 4000);
    setRejectModalOpen(false);
  };

  const handleOpenDisburse = (c: FinanceRefundClaim) => {
    setSelectedClaim(c);
    setDisburseRef(`REF-UTR-${Date.now().toString().slice(-6)}`);
    setDisburseMethod((c.refundMethod as any) || 'bank_transfer');
    setDisburseModalOpen(true);
  };

  const handleConfirmDisburse = () => {
    if (!selectedClaim || !disburseRef.trim()) return;

    disburseFinanceClaim(selectedClaim.id, disburseRef, disburseMethod);
    setActionSuccess(`Refund payout of ₹${(selectedClaim.approvedAmount || selectedClaim.requestedAmount).toLocaleString('en-IN')} disbursed (Ref: ${disburseRef}).`);
    setTimeout(() => setActionSuccess(null), 4000);
    setDisburseModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <Badge variant="success" size="sm">Claim Updated</Badge>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Refunds, Customer Returns &amp; Damage Claims
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized register for transit breakages, customer returns, supplier recovery notes, and stock loss write-offs.
          </p>
        </div>

        {/* Category Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeCategory === 'all' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Claims ({financeClaims.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('customer')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeCategory === 'customer' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Returns
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('supplier')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeCategory === 'supplier' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Supplier Shortages
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('stock_loss')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeCategory === 'stock_loss' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Internal Stock Loss
          </button>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40">
          <span className="text-[10px] font-bold uppercase text-purple-800 block">Total Claimed Value</span>
          <div className="text-xl font-bold text-purple-950 font-mono mt-0.5">
            ₹{metrics.totalRequested.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-purple-700">Gross damage &amp; return volume</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Approved (Pending Payout)</span>
          <div className="text-xl font-bold text-amber-950 font-mono mt-0.5">
            ₹{metrics.totalApprovedPending.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-700">Approved by Finance; awaiting wire</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Settled / Disbursed</span>
          <div className="text-xl font-bold text-emerald-950 font-mono mt-0.5">
            ₹{metrics.totalDisbursed.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700">Credit notes / RTGS disbursed</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-rose-200 bg-rose-50/40">
          <span className="text-[10px] font-bold uppercase text-rose-800 block">Pending Inspection Claims</span>
          <div className="text-xl font-bold text-rose-950 font-mono mt-0.5">
            {metrics.pendingCount} Claims
          </div>
          <span className="text-[10px] text-rose-700">Requires finance decision</span>
        </div>
      </div>

      {/* ─── SEARCH & STATUS FILTER ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            placeholder="Search claim #, customer, supplier, product, batch..."
            className="text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
        >
          <option value="all">All Decision Statuses</option>
          <option value="pending">Pending Review Only</option>
          <option value="approved">Approved (Pending Payout)</option>
          <option value="disbursed">Settled / Disbursed</option>
          <option value="rejected">Rejected Claims</option>
        </select>
      </div>

      {/* ─── CLAIMS TABLE ─── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">Claim ID &amp; Type</th>
                <th className="py-3 px-4">Party Details</th>
                <th className="py-3 px-4">Order / Batch Ref</th>
                <th className="py-3 px-4">Affected Item &amp; Qty</th>
                <th className="py-3 px-4 text-right">Requested (₹)</th>
                <th className="py-3 px-4 text-right">Approved (₹)</th>
                <th className="py-3 px-4 text-center">Claim Status</th>
                <th className="py-3 px-4 text-center">Payout Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    No claims found matching active filter.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700 block">{c.id}</span>
                      <span className="text-[10px] text-slate-500 capitalize">{c.type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{c.partyName}</span>
                      <span className="text-[10px] text-slate-400 capitalize">Source: {c.claimSource}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-slate-800 block">
                        {c.orderNumber || c.grnNumber || 'Internal Adjustment'}
                      </span>
                      {c.batchNumber && (
                        <span className="text-[10px] text-indigo-600 font-mono block">Batch: {c.batchNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{c.productName}</span>
                      <span className="text-[10px] text-slate-500">{c.quantity} {c.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{c.requestedAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {c.approvedAmount !== undefined ? `₹${c.approvedAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        size="sm"
                        variant={
                          c.refundStatus === 'disbursed' || c.refundStatus === 'settled'
                            ? 'success'
                            : c.refundStatus === 'approved'
                            ? 'primary'
                            : c.refundStatus === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {c.refundStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        size="sm"
                        variant={c.payoutStatus === 'paid' ? 'success' : 'neutral'}
                      >
                        {c.payoutStatus === 'paid' ? 'Paid / Settled' : 'Unpaid Float'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedClaim(c)}
                          className="h-7 text-xs px-2"
                          title="Inspect Damage Evidence & Notes"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Inspect
                        </Button>

                        {c.refundStatus === 'pending' && (
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
                              onClick={() => handleOpenApprove(c)}
                              className="h-7 text-xs px-2"
                            >
                              Approve
                            </Button>
                          </>
                        )}

                        {c.refundStatus === 'approved' && c.payoutStatus === 'unpaid' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenDisburse(c)}
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

      {/* ─── INSPECT DETAILS MODAL ─── */}
      {selectedClaim && !approveModalOpen && !rejectModalOpen && !disburseModalOpen && (
        <Modal
          isOpen={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
          title={`Claim Inspection: ${selectedClaim.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedClaim.partyName}</h3>
                <p className="text-xs text-slate-500 capitalize">
                  Type: {selectedClaim.type.replace(/_/g, ' ')} • Source: {selectedClaim.claimSource}
                </p>
                <p className="text-[10px] text-indigo-600 font-mono mt-0.5">
                  Ref: {selectedClaim.orderNumber || selectedClaim.grnNumber || 'Internal Adjustment'}
                </p>
              </div>
              <Badge variant="purple" size="md">{selectedClaim.refundStatus.toUpperCase()}</Badge>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="font-bold text-slate-900 block">Damage Description &amp; Findings:</span>
              <p className="text-slate-700 leading-relaxed">{selectedClaim.damageDescription}</p>
            </div>

            {selectedClaim.proofAttachments && selectedClaim.proofAttachments.length > 0 && (
              <div>
                <span className="font-bold text-slate-900 block mb-1.5">Proof Attachments:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedClaim.proofAttachments.map((att, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono text-[11px] flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {att}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase">Requested Amount</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  ₹{selectedClaim.requestedAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-800 block uppercase">Approved Amount</span>
                <span className="text-base font-bold text-emerald-950 font-mono">
                  {selectedClaim.approvedAmount !== undefined ? `₹${selectedClaim.approvedAmount.toLocaleString('en-IN')}` : 'Pending'}
                </span>
              </div>
            </div>

            {selectedClaim.refundReference && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] font-mono">
                Disbursement Settlement Reference: <strong>{selectedClaim.refundReference}</strong> via {selectedClaim.refundMethod?.replace('_', ' ')}
              </div>
            )}

            {selectedClaim.reviewNotes && (
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-[11px]">
                <strong>Finance Audit Note:</strong> {selectedClaim.reviewNotes} (Reviewed by: {selectedClaim.reviewedByUserName})
              </div>
            )}

            {selectedClaim.rejectionReason && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px]">
                <strong>Rejection Rationale:</strong> {selectedClaim.rejectionReason}
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

      {/* ─── APPROVE MODAL ─── */}
      {approveModalOpen && selectedClaim && (
        <Modal
          isOpen={approveModalOpen}
          onClose={() => setApproveModalOpen(false)}
          title={`Authorize Refund Claim: ${selectedClaim.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
              <strong>Accounting Rule:</strong> Approving a refund records the liability and creates an authorization for recovery/credit. It does not automatically transfer cash until disbursed.
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Authorized Refund Amount (₹)</label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none"
                placeholder="e.g. 50000"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Proposed Settlement Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="credit_note">Credit Note (Adjust against future invoice)</option>
                <option value="bank_transfer">Direct RTGS / NEFT Wire</option>
                <option value="upi">Instant UPI Refund</option>
                <option value="wallet_credit">Wallet Credit Float</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Audit Approval Notes</label>
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setApproveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmApprove}>
                <Check className="w-4 h-4 mr-1" />
                Authorize Claim
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
          title={`Reject Claim: ${selectedClaim.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <p className="text-slate-600">
              Please specify the mandatory reason for declining this refund or damage claim.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Rejection Reason (Mandatory)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                rows={3}
                placeholder="e.g. Damage occurred after client unloading signature without transporter endorsement."
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
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── DISBURSE MODAL ─── */}
      {disburseModalOpen && selectedClaim && (
        <Modal
          isOpen={disburseModalOpen}
          onClose={() => setDisburseModalOpen(false)}
          title={`Disburse Refund Payout: ${selectedClaim.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold">
                <span>Beneficiary:</span>
                <span>{selectedClaim.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span>Authorized Amount:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ₹{(selectedClaim.approvedAmount || selectedClaim.requestedAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Disbursement Mode</label>
                <select
                  value={disburseMethod}
                  onChange={(e) => setDisburseMethod(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="bank_transfer">HDFC Corporate RTGS</option>
                  <option value="credit_note">Credit Note Voucher</option>
                  <option value="upi">Company UPI Wire</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Bank Ref / Voucher #</label>
                <input
                  type="text"
                  value={disburseRef}
                  onChange={(e) => setDisburseRef(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setDisburseModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmDisburse}>
                <Check className="w-4 h-4 mr-1" />
                Confirm Payout Disbursed
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
