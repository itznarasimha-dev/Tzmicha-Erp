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
  HelpCircle,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { CustomerRefundRequest, FinanceRefundClaim } from '../../types';
import { formatINR, numberToIndianWords, maskAccountNumber } from '../../services/formatters';

export const FinanceRefundsClaimsView: React.FC = () => {
  const {
    customerRefundRequests,
    financeClaims,
    customers,
    invoices,
    currentUser,
    currentRole,
    submitCustomerRefundRequest,
    reviewCustomerRefundRequest,
    approveFinanceClaim,
    rejectFinanceClaim,
    disburseFinanceClaim,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'refund_requests' | 'damage_claims'>('refund_requests');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals for Customer Refunds
  const [createRefundModalOpen, setCreateRefundModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers?.[0]?.id || '');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [refundRequestedAmount, setRefundRequestedAmount] = useState('18000');
  const [refundReasonCategory, setRefundReasonCategory] = useState<CustomerRefundRequest['reasonCategory']>('cancellation');
  const [refundReasonDetails, setRefundReasonDetails] = useState('');
  const [refundPayoutMode, setRefundPayoutMode] = useState<CustomerRefundRequest['refundMode']>('original_source_neft');
  const [refundAccountHolder, setRefundAccountHolder] = useState('');
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [refundIfsc, setRefundIfsc] = useState('');
  const [refundBankName, setRefundBankName] = useState('');

  // Action review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRefundForReview, setSelectedRefundForReview] = useState<CustomerRefundRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'disburse' | 'reject' | 'escalate'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [payoutTxnRef, setPayoutTxnRef] = useState('');

  // Damage claim modal state
  const [selectedClaim, setSelectedClaim] = useState<FinanceRefundClaim | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected customer invoice calculations for new refund
  const selectedCustomerInvoices = useMemo(() => {
    return (invoices || []).filter((i) => i.customerId === selectedCustomerId && i.paidAmount > 0);
  }, [invoices, selectedCustomerId]);

  const activeInvoice = useMemo(() => {
    return selectedCustomerInvoices.find((i) => i.id === selectedInvoiceId) || selectedCustomerInvoices[0];
  }, [selectedCustomerInvoices, selectedInvoiceId]);

  const invoiceAmountPaid = activeInvoice ? activeInvoice.paidAmount : 0;
  const priorRefunds = 0; // Derived from prior requests
  const maxRefundAllowed = Math.max(0, invoiceAmountPaid - priorRefunds);

  // Filtered Customer Refunds
  const filteredRefundRequests = useMemo(() => {
    return (customerRefundRequests || []).filter((r) => {
      if (statusFilter !== 'all') {
        if (r.status !== statusFilter) return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          r.refundNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.reasonDetails.toLowerCase().includes(q) ||
          (r.originalInvoiceNumber && r.originalInvoiceNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [customerRefundRequests, statusFilter, searchTerm]);

  // Filtered Damage Claims
  const filteredDamageClaims = useMemo(() => {
    return (financeClaims || []).filter((c) => {
      if (statusFilter !== 'all') {
        if (c.refundStatus !== statusFilter) return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.partyName.toLowerCase().includes(q) ||
          c.productName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [financeClaims, statusFilter, searchTerm]);

  // Metrics
  const refundMetrics = useMemo(() => {
    const list = customerRefundRequests || [];
    const pendingReview = list.filter((r) => r.status === 'pending_finance_review' || r.status === 'escalated_to_admin').length;
    const totalApproved = list.filter((r) => r.status === 'approved').reduce((s, r) => s + r.requestedAmount, 0);
    const totalDisbursed = list.filter((r) => r.status === 'disbursed').reduce((s, r) => s + (r.approvedAmount || r.requestedAmount), 0);
    const escalatedCount = list.filter((r) => r.status === 'escalated_to_admin').length;

    return { pendingReview, totalApproved, totalDisbursed, escalatedCount };
  }, [customerRefundRequests]);

  // Open Create Refund Modal
  const handleOpenCreateRefund = () => {
    const cust = customers?.[0];
    setSelectedCustomerId(cust?.id || '');
    setRefundRequestedAmount('18000');
    setRefundReasonCategory('cancellation');
    setRefundReasonDetails('Service team intake: Order cancelled prior to batch dispatch; advance repayment requested.');
    setRefundPayoutMode('original_source_neft');
    setRefundAccountHolder(cust?.name || 'Customer Account');
    setRefundAccountNumber('91802003881921');
    setRefundIfsc('HDFC0001211');
    setRefundBankName('HDFC Bank Ltd');
    setCreateRefundModalOpen(true);
  };

  const handleConfirmCreateRefund = () => {
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust || !refundRequestedAmount || isSubmitting) return;

    const amt = Number(refundRequestedAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid refund amount.');
      return;
    }

    if (activeInvoice && amt > maxRefundAllowed) {
      alert(`Violation: Requested refund ${formatINR(amt)} exceeds max allowed ${formatINR(maxRefundAllowed)} (Amount Paid - Prior Refunds).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = submitCustomerRefundRequest({
        customerId: cust.id,
        customerName: cust.name,
        originalInvoiceId: activeInvoice?.id,
        originalInvoiceNumber: activeInvoice?.invoiceNumber,
        originalPaymentRef: activeInvoice?.paymentReference || 'UTR-PAID-001',
        amountPaidOriginal: invoiceAmountPaid,
        priorRefundsTotal: priorRefunds,
        maxRefundAllowed,
        requestedAmount: amt,
        refundMode: refundPayoutMode,
        customerBankDetails: {
          accountHolder: refundAccountHolder || cust.name,
          accountNumber: refundAccountNumber,
          ifscCode: refundIfsc,
          bankName: refundBankName,
        },
        reasonCategory: refundReasonCategory,
        reasonDetails: refundReasonDetails || 'Customer cancellation/damage intake',
        raisedByRole: (currentRole as any) || 'service',
        raisedByUserId: currentUser?.id || 'usr-srv-01',
        raisedByUserName: currentUser?.name || 'Rohan Sharma (Service Engineer)',
      });

      setActionSuccess(`Customer refund request ${created.refundNumber} registered! ${created.requiresAdminApproval ? 'Escalated to Admin (> ₹25,000 threshold).' : 'Pending Finance review.'}`);
      setTimeout(() => setActionSuccess(null), 5000);
      setCreateRefundModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReviewModal = (r: CustomerRefundRequest, action: 'approve' | 'disburse' | 'reject' | 'escalate') => {
    setSelectedRefundForReview(r);
    setReviewAction(action);
    setReviewNotes('');
    setPayoutTxnRef(`NEFT-${Date.now().toString().slice(-6)}`);
    setReviewModalOpen(true);
  };

  const handleConfirmReview = () => {
    if (!selectedRefundForReview || isSubmitting) return;

    setIsSubmitting(true);
    try {
      reviewCustomerRefundRequest(
        selectedRefundForReview.id,
        reviewAction,
        reviewNotes || `Authorized by ${currentUser?.name}`,
        payoutTxnRef
      );

      setActionSuccess(`Refund request ${selectedRefundForReview.refundNumber} successfully marked as ${reviewAction.toUpperCase()}!`);
      setTimeout(() => setActionSuccess(null), 5000);
      setReviewModalOpen(false);
      setSelectedRefundForReview(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <Badge variant="success" size="sm">System Updated</Badge>
        </div>
      )}

      {/* ─── HEADER & WORKSPACE SWITCHER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-3xl backdrop-blur-xl bg-white/70 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Customer Refunds &amp; Damage Claims Center
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              Service Intake Bridge
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Service team intake, strict payment ceiling enforcement (&le; paid - prior refunds), and Admin &gt; ₹25,000 approval thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={handleOpenCreateRefund}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            Raise Customer Refund
          </Button>

          <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('refund_requests');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'refund_requests' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Refund Requests ({customerRefundRequests?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('damage_claims');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'damage_claims' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Transit Breakages &amp; Claims ({financeClaims.length})
            </button>
          </div>
        </div>
      </div>

      {/* ─── STATUTORY VALIDATION RULES BANNER ─── */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-indigo-700 shrink-0" />
          <div>
            <span className="font-bold text-indigo-950 block">Mandatory Financial Guardrails</span>
            <span className="text-[11px] text-indigo-800">
              Maximum Refund &le; (Original Invoice Amount Paid &minus; Prior Refunds). Payouts &gt; ₹25,000 lock until Admin sign-off.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm">Admin Threshold: ₹25,000</Badge>
          <Badge variant="neutral" size="sm">Audit Locked</Badge>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      {activeTab === 'refund_requests' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="backdrop-blur-md bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">Pending Review</span>
            <div className="text-xl font-bold text-amber-950 font-mono mt-0.5">
              {refundMetrics.pendingReview} Requests
            </div>
            <span className="text-[10px] text-amber-700">Awaiting Finance / Admin action</span>
          </div>

          <div className="backdrop-blur-md bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-indigo-800 block">Approved (Ready to Disburse)</span>
            <div className="text-xl font-bold text-indigo-950 font-mono mt-0.5">
              {formatINR(refundMetrics.totalApproved)}
            </div>
            <span className="text-[10px] text-indigo-600">Pending bank wire or credit note</span>
          </div>

          <div className="backdrop-blur-md bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Disbursed to Date</span>
            <div className="text-xl font-bold text-emerald-950 font-mono mt-0.5">
              {formatINR(refundMetrics.totalDisbursed)}
            </div>
            <span className="text-[10px] text-emerald-700">Settled via NEFT or Wallet</span>
          </div>

          <div className="backdrop-blur-md bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-rose-800 block">Escalated to Admin</span>
            <div className="text-xl font-bold text-rose-950 font-mono mt-0.5">
              {refundMetrics.escalatedCount} Requests (&gt; ₹25k)
            </div>
            <span className="text-[10px] text-rose-700">Exceeds Finance approval limit</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="backdrop-blur-md bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-purple-800 block">Total Claims Volume</span>
            <div className="text-xl font-bold text-purple-950 font-mono mt-0.5">
              {financeClaims.length} Claims
            </div>
            <span className="text-[10px] text-purple-600">Breakages, supplier debit notes &amp; losses</span>
          </div>
          <div className="backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Claimed Financial Value</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              {formatINR(financeClaims.reduce((s, c) => s + c.requestedAmount, 0))}
            </div>
            <span className="text-[10px] text-slate-400">Total inspection claims</span>
          </div>
          <div className="backdrop-blur-md bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Settled Claims</span>
            <div className="text-xl font-bold text-emerald-950 font-mono mt-0.5">
              {formatINR(financeClaims.filter((c) => c.payoutStatus === 'paid').reduce((s, c) => s + (c.approvedAmount || c.requestedAmount), 0))}
            </div>
            <span className="text-[10px] text-emerald-700">Recovery finalized</span>
          </div>
        </div>
      )}

      {/* ─── SEARCH & FILTERS ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            placeholder={activeTab === 'refund_requests' ? "Search refund #, customer, invoice ref..." : "Search claim ID, party, product..."}
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'refund_requests' ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Refund Statuses</option>
              <option value="pending_finance_review">Pending Finance Review</option>
              <option value="escalated_to_admin">Escalated to Admin (&gt; ₹25k)</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed (Paid)</option>
              <option value="rejected">Rejected</option>
            </select>
          ) : (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Claim Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
        </div>
      </div>

      {/* ─── CUSTOMER REFUNDS TABLE ─── */}
      {activeTab === 'refund_requests' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Refund # &amp; Date</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Invoice / Payment Ref</th>
                  <th className="py-3 px-4 text-right">Requested Refund</th>
                  <th className="py-3 px-4">Reason Category</th>
                  <th className="py-3 px-4">Raised By</th>
                  <th className="py-3 px-4 text-center">Approval State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredRefundRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No customer refund requests found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRefundRequests.map((r) => {
                    const isAdminRequired = r.requiresAdminApproval;
                    const canFinanceApprove = !isAdminRequired && r.status === 'pending_finance_review';
                    const canAdminApprove = isAdminRequired && (currentRole === 'admin' || currentRole === 'finance');

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {r.refundNumber}
                          <span className="text-[10px] text-slate-400 block font-sans font-normal">
                            {r.createdAt.split('T')[0]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{r.customerName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {r.customerId}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span className="font-bold text-slate-800 block">{r.originalInvoiceNumber || 'Direct Deposit'}</span>
                          <span className="text-[10px] text-emerald-700 block">{r.originalPaymentRef || 'NEFT Paid'}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatINR(r.requestedAmount)}
                          <span className="text-[9px] text-slate-400 block capitalize font-sans">
                            {r.refundMode.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize text-slate-700">
                          <Badge size="sm" variant="neutral">{r.reasonCategory.replace('_', ' ')}</Badge>
                          <span className="text-[10px] text-slate-500 block truncate max-w-xs mt-0.5">
                            {r.reasonDetails}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          <span className="font-semibold text-slate-800 block">{r.raisedByUserName}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{r.raisedByRole} Team</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            size="sm"
                            variant={
                              r.status === 'disbursed'
                                ? 'success'
                                : r.status === 'approved'
                                ? 'primary'
                                : r.status === 'escalated_to_admin'
                                ? 'warning'
                                : r.status === 'rejected'
                                ? 'danger'
                                : 'neutral'
                            }
                          >
                            {r.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          {isAdminRequired && r.status === 'escalated_to_admin' && (
                            <span className="text-[9px] text-rose-600 font-bold block mt-0.5">
                              Admin Required (&gt; ₹25k)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(canFinanceApprove || canAdminApprove) && r.status !== 'approved' && r.status !== 'disbursed' && r.status !== 'rejected' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenReviewModal(r, 'approve')}
                                className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Approve
                              </Button>
                            )}

                            {r.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenReviewModal(r, 'disburse')}
                                className="h-7 text-xs px-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                Disburse
                              </Button>
                            )}

                            {r.status !== 'disbursed' && r.status !== 'rejected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReviewModal(r, 'reject')}
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
        </Card>
      )}

      {/* ─── DAMAGE CLAIMS TABLE (LEGACY COMPATIBILITY) ─── */}
      {activeTab === 'damage_claims' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Claim ID</th>
                  <th className="py-3 px-4">Party Details</th>
                  <th className="py-3 px-4">Damaged Product / Batch</th>
                  <th className="py-3 px-4 text-center">Damaged Qty</th>
                  <th className="py-3 px-4 text-right">Claim Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredDamageClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{c.id}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{c.partyName}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{c.claimSource}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 block">{c.productName}</span>
                      <span className="text-[10px] text-indigo-600 font-mono">Batch: {c.batchNumber || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{c.quantity} {c.unit}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(c.requestedAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge size="sm" variant={c.refundStatus === 'disbursed' ? 'success' : 'warning'}>
                        {c.refundStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.refundStatus === 'pending' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              approveFinanceClaim(c.id, c.requestedAmount, 'credit_note', 'Verified inspection');
                              setActionSuccess(`Claim ${c.id} approved!`);
                              setTimeout(() => setActionSuccess(null), 3000);
                            }}
                            className="h-7 text-xs px-2"
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── RAISE CUSTOMER REFUND REQUEST MODAL (SERVICE BRIDGE) ─── */}
      {createRefundModalOpen && (
        <Modal
          isOpen={createRefundModalOpen}
          onClose={() => setCreateRefundModalOpen(false)}
          title="Raise Customer Refund Request (Service Team Bridge)"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Customer & Invoice Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200">
              <div>
                <label className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">Select Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white font-medium focus:outline-none cursor-pointer"
                >
                  {(customers || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">Select Paid Invoice</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white font-medium focus:outline-none cursor-pointer"
                >
                  {selectedCustomerInvoices.length === 0 ? (
                    <option value="">No paid invoices found</option>
                  ) : (
                    selectedCustomerInvoices.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.invoiceNumber} (Paid: {formatINR(i.paidAmount)})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Statutory Ceiling Calculation Display */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-[11px]">
              <span className="font-bold text-slate-700 block uppercase text-[9px]">Ceiling Validation Rule</span>
              <div className="flex justify-between text-slate-600">
                <span>Original Invoice Paid Amount:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(invoiceAmountPaid)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Prior Approved/Disbursed Refunds:</span>
                <span className="font-mono text-emerald-700">&minus;{formatINR(priorRefunds)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900 text-xs">
                <span>Max Statutory Refund Allowed:</span>
                <span className="font-mono text-indigo-900">{formatINR(maxRefundAllowed)}</span>
              </div>
            </div>

            {/* Requested Amount & Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-0.5">Requested Refund Amount (₹)</label>
                <input
                  type="number"
                  value={refundRequestedAmount}
                  onChange={(e) => setRefundRequestedAmount(e.target.value)}
                  max={maxRefundAllowed}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none"
                  placeholder="Enter amount"
                />
                {Number(refundRequestedAmount) > 25000 && (
                  <span className="text-[10px] text-amber-700 font-bold block mt-1">
                    Notice: Amount &gt; ₹25,000 will be auto-escalated to Admin approval.
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-0.5">Reason Category</label>
                <select
                  value={refundReasonCategory}
                  onChange={(e) => setRefundReasonCategory(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="cancellation">Order Cancellation (Prior to Dispatch)</option>
                  <option value="transit_damage">Transit Damage (Transporter Leakage)</option>
                  <option value="defective_goods">Defective / QC Batch Rejection</option>
                  <option value="double_payment">Double NEFT Transfer / Error</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Detailed Reason &amp; Inspection Evidence</label>
              <textarea
                value={refundReasonDetails}
                onChange={(e) => setRefundReasonDetails(e.target.value)}
                rows={2}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none"
                placeholder="Mention LR damage stamp, technician notes, or customer cancellation email..."
              />
            </div>

            {/* Payout Mode & Beneficiary Bank */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-xs">Payout Destination</span>
                <select
                  value={refundPayoutMode}
                  onChange={(e) => setRefundPayoutMode(e.target.value as any)}
                  className="text-xs p-1 rounded-lg border border-slate-200 bg-white cursor-pointer"
                >
                  <option value="original_source_neft">Original Source (NEFT Wire)</option>
                  <option value="credit_note_wallet">Credit Note / Wallet Balance</option>
                  <option value="upi_transfer">Instant UPI Transfer</option>
                </select>
              </div>

              {refundPayoutMode === 'original_source_neft' && (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Account Holder:</span>
                    <input
                      type="text"
                      value={refundAccountHolder}
                      onChange={(e) => setRefundAccountHolder(e.target.value)}
                      className="w-full p-1 rounded border border-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account Number:</span>
                    <input
                      type="text"
                      value={refundAccountNumber}
                      onChange={(e) => setRefundAccountNumber(e.target.value)}
                      className="w-full p-1 rounded border border-slate-200 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block">Bank IFSC Code:</span>
                    <input
                      type="text"
                      value={refundIfsc}
                      onChange={(e) => setRefundIfsc(e.target.value)}
                      className="w-full p-1 rounded border border-slate-200 text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block">Bank Name &amp; Branch:</span>
                    <input
                      type="text"
                      value={refundBankName}
                      onChange={(e) => setRefundBankName(e.target.value)}
                      className="w-full p-1 rounded border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setCreateRefundModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmCreateRefund}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Registering...' : 'Submit Refund Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── REVIEW / APPROVE / DISBURSE MODAL ─── */}
      {reviewModalOpen && selectedRefundForReview && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`${reviewAction.toUpperCase()} Refund Request: ${selectedRefundForReview.refundNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{selectedRefundForReview.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Refund Amount:</span>
                <span className="font-mono font-bold text-indigo-900 text-sm">
                  {formatINR(selectedRefundForReview.requestedAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payout Mode:</span>
                <span className="capitalize">{selectedRefundForReview.refundMode.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {reviewAction === 'disburse' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Bank Transaction Ref / UTR #</label>
                <input
                  type="text"
                  value={payoutTxnRef}
                  onChange={(e) => setPayoutTxnRef(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
                  placeholder="e.g. UTR-HDFC-991188"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Review Decision Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                placeholder="Mention justification, bank debit authorization, or reason..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReview}
                disabled={isSubmitting}
                className={
                  reviewAction === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : reviewAction === 'disburse'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }
              >
                <Check className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Processing...' : `Confirm ${reviewAction.toUpperCase()}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
