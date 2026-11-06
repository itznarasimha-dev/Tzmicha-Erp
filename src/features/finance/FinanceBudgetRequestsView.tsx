import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  Sparkles,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Check,
  X,
  FileText,
  Calendar,
  Percent,
} from 'lucide-react';
import { MarketingBudgetRequest } from '../../types';

export const FinanceBudgetRequestsView: React.FC = () => {
  const {
    budgetRequests,
    approveBudgetRequest,
    rejectBudgetRequest,
    partiallyApproveBudgetRequest,
  } = useErpStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<MarketingBudgetRequest | null>(null);

  // Approve / Partial Modal
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return budgetRequests.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          b.campaignName.toLowerCase().includes(q) ||
          b.requestingUserName.toLowerCase().includes(q) ||
          b.objective.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [budgetRequests, statusFilter, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const totalRequested = budgetRequests.reduce((s, b) => s + b.requestedAmount, 0);
    const totalApproved = budgetRequests
      .filter((b) => b.status === 'approved' || b.status === 'partially_approved')
      .reduce((s, b) => s + (b.approvedAmount || 0), 0);
    const totalSpent = budgetRequests.reduce((s, b) => s + (b.spentAmount || 0), 0);
    const pendingCount = budgetRequests.filter((b) => b.status === 'pending').length;

    return { totalRequested, totalApproved, totalSpent, pendingCount };
  }, [budgetRequests]);

  const handleOpenApprove = (b: MarketingBudgetRequest) => {
    setSelectedRequest(b);
    setApprovedAmount(b.requestedAmount.toString());
    setApprovalNotes('Budget authorized based on projected dealer acquisition ROI.');
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedRequest || !approvedAmount) return;
    const amt = Number(approvedAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (amt < selectedRequest.requestedAmount) {
      partiallyApproveBudgetRequest(selectedRequest.id, amt, approvalNotes);
      setToastMessage(`Partially approved budget of ₹${amt.toLocaleString('en-IN')} for "${selectedRequest.campaignName}".`);
    } else {
      approveBudgetRequest(selectedRequest.id, amt, approvalNotes);
      setToastMessage(`Fully approved budget of ₹${amt.toLocaleString('en-IN')} for "${selectedRequest.campaignName}".`);
    }
    setTimeout(() => setToastMessage(null), 4000);
    setApproveModalOpen(false);
  };

  const handleOpenReject = (b: MarketingBudgetRequest) => {
    setSelectedRequest(b);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedRequest || !rejectReason.trim()) return;

    rejectBudgetRequest(selectedRequest.id, rejectReason);
    setToastMessage(`Budget proposal for "${selectedRequest.campaignName}" declined.`);
    setTimeout(() => setToastMessage(null), 4000);
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
          <Badge variant="success" size="sm">Budget Decided</Badge>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Marketing Campaign Budget Governance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit and approve marketing allocations. Approved budgets represent authorized expenditure caps and are not recognized as expenses until actual bills are posted.
          </p>
        </div>
      </div>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40">
          <span className="text-[10px] font-bold uppercase text-indigo-800 block">Total Requested Budget</span>
          <div className="text-xl font-black text-indigo-950 font-mono mt-0.5">
            ₹{metrics.totalRequested.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-indigo-600">Across {budgetRequests.length} campaign proposals</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Authorized Budget Cap</span>
          <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
            ₹{metrics.totalApproved.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700">Finance sanctioned ceiling</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 bg-white">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Actual Expenditure Incurred</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalSpent.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Verified bills posted to date</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Proposals Awaiting Decision</span>
          <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
            {metrics.pendingCount} Pending
          </div>
          <span className="text-[10px] text-amber-700">Requires CFO review</span>
        </div>
      </div>

      {/* ─── SEARCH & FILTER ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            placeholder="Search campaign name, requester, objective..."
            className="text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
        >
          <option value="all">All Decision Statuses</option>
          <option value="pending">Awaiting Review</option>
          <option value="approved">Approved</option>
          <option value="partially_approved">Partially Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* ─── TABLE ─── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">Campaign Name &amp; ID</th>
                <th className="py-3 px-4">Requester &amp; Region</th>
                <th className="py-3 px-4">Target Objective</th>
                <th className="py-3 px-4 text-right">Requested Budget</th>
                <th className="py-3 px-4 text-right">Sanctioned Budget</th>
                <th className="py-3 px-4 text-right">Actual Spent</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No marketing budget requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{b.campaignName}</span>
                      <span className="text-[10px] text-indigo-600 font-mono block">{b.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-800 font-medium block">{b.requestingUserName}</span>
                      <span className="text-[10px] text-slate-400">{b.regionName || b.regionId}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="text-[11px] text-slate-800 line-clamp-1">{b.objective}</span>
                      <span className="text-[10px] text-slate-400">Created: {b.createdAt?.split('T')[0]}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{b.requestedAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                      {b.approvedAmount !== undefined ? `₹${b.approvedAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      ₹{b.spentAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        size="sm"
                        variant={
                          b.status === 'approved'
                            ? 'success'
                            : b.status === 'partially_approved'
                            ? 'primary'
                            : b.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {b.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedRequest(b)}
                          className="h-7 text-xs px-2"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>

                        {b.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReject(b)}
                              className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenApprove(b)}
                              className="h-7 text-xs px-2"
                            >
                              Approve
                            </Button>
                          </>
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

      {/* ─── VIEW PROPOSAL MODAL ─── */}
      {selectedRequest && !approveModalOpen && !rejectModalOpen && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={`Campaign Proposal: ${selectedRequest.campaignName}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <div>
                <span className="font-bold text-slate-900 text-sm block">{selectedRequest.campaignName}</span>
                <span className="text-[10px] text-slate-400">
                  Requester: {selectedRequest.requestingUserName} • {selectedRequest.regionName}
                </span>
              </div>
              <Badge variant="purple" size="md">{selectedRequest.status?.replace('_', ' ').toUpperCase()}</Badge>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">Campaign Objectives:</span>
              <p className="text-slate-700 leading-relaxed">{selectedRequest.objective}</p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1.5">Proposed Cost Breakdown:</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 font-semibold text-[10px]">
                      <th className="py-2 px-3">Expense Head</th>
                      <th className="py-2 px-3 text-right">Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRequest.proposedExpensesBreakdown?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium text-slate-800">{item.item}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-950">
              <strong>Projected ROI &amp; Outcomes:</strong> {selectedRequest.expectedOutcomes}
            </div>

            {selectedRequest.reviewNotes && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-[11px] text-purple-950">
                <strong>Finance Controller Note:</strong> {selectedRequest.reviewNotes} (Reviewed by: {selectedRequest.reviewedByUserName})
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── APPROVE MODAL ─── */}
      {approveModalOpen && selectedRequest && (
        <Modal
          isOpen={approveModalOpen}
          onClose={() => setApproveModalOpen(false)}
          title={`Sanction Budget: ${selectedRequest.campaignName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold">
                <span>Requested Budget:</span>
                <span className="font-mono">₹{selectedRequest.requestedAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Sanctioned Amount (₹)</label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none"
                placeholder="Enter authorized cap"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Entering less than ₹{selectedRequest.requestedAmount.toLocaleString('en-IN')} will mark this request as Partially Approved.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Finance Review Comments</label>
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
                Sanction Budget
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── REJECT MODAL ─── */}
      {rejectModalOpen && selectedRequest && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title={`Reject Budget Proposal: ${selectedRequest.campaignName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <p className="text-slate-600">
              Please enter the finance feedback explaining why this proposal cannot be funded at this time.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Reason for Rejection (Mandatory)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                rows={3}
                placeholder="e.g. Non-aligned with regional distribution strategy; reallocation required."
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
