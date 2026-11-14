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
  Layers,
  AlertTriangle,
  Building2,
  PieChart,
  HelpCircle,
  TrendingDown,
} from 'lucide-react';
import { MarketingBudgetRequest } from '../../types';
import { formatINR, numberToIndianWords } from '../../services/formatters';

interface DepartmentBudgetOverview {
  department: string;
  category: string;
  allocated: number;
  committed: number;
  spent: number;
  remaining: number;
  utilizationPercent: number;
}

export const FinanceBudgetRequestsView: React.FC = () => {
  const {
    budgetRequests,
    approveBudgetRequest,
    rejectBudgetRequest,
    partiallyApproveBudgetRequest,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'department_budgets' | 'campaign_requests'>('department_budgets');
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

  // Multi-Department Budget Matrix (Allocated, Committed, Spent, Remaining)
  const departmentBudgets: DepartmentBudgetOverview[] = useMemo(() => {
    return [
      {
        department: 'Marketing & Field Expansion',
        category: 'Expos, Roadshows & Digital Leads',
        allocated: 650000,
        committed: 160000,
        spent: 382000,
        remaining: 108000,
        utilizationPercent: Math.round(((382000 + 160000) / 650000) * 100),
      },
      {
        department: 'Sales & Dealer Relations',
        category: 'Field Allowances & Trade Incentives',
        allocated: 900000,
        committed: 120000,
        spent: 690000,
        remaining: 90000,
        utilizationPercent: Math.round(((690000 + 120000) / 900000) * 100),
      },
      {
        department: 'Supply Chain & Warehouses',
        category: 'Logistics Freight & Barrels Packaging',
        allocated: 1200000,
        committed: 250000,
        spent: 980000,
        remaining: -30000, // Over budget demonstration
        utilizationPercent: Math.round(((980000 + 250000) / 1200000) * 100),
      },
      {
        department: 'Information Technology',
        category: 'ERP Cloud Hosting & Software Licenses',
        allocated: 350000,
        committed: 45000,
        spent: 210000,
        remaining: 95000,
        utilizationPercent: Math.round(((210000 + 45000) / 350000) * 100),
      },
      {
        department: 'Human Resources & Talent',
        category: 'Recruitment & Safety Certifications',
        allocated: 250000,
        committed: 20000,
        spent: 140000,
        remaining: 90000,
        utilizationPercent: Math.round(((140000 + 20000) / 250000) * 100),
      },
    ];
  }, []);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return (budgetRequests || []).filter((b) => {
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

  // Overall Portfolio Metrics
  const metrics = useMemo(() => {
    const list = budgetRequests || [];
    const totalAllocated = departmentBudgets.reduce((s, d) => s + d.allocated, 0);
    const totalCommitted = departmentBudgets.reduce((s, d) => s + d.committed, 0);
    const totalSpent = departmentBudgets.reduce((s, d) => s + d.spent, 0);
    const pendingCampaignsCount = list.filter((b) => b.status === 'pending').length;

    return { totalAllocated, totalCommitted, totalSpent, pendingCampaignsCount };
  }, [budgetRequests, departmentBudgets]);

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
      setToastMessage(`Partially approved budget of ${formatINR(amt)} for "${selectedRequest.campaignName}".`);
    } else {
      approveBudgetRequest(selectedRequest.id, amt, approvalNotes);
      setToastMessage(`Fully approved budget of ${formatINR(amt)} for "${selectedRequest.campaignName}".`);
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
    setToastMessage(`Campaign proposal "${selectedRequest.campaignName}" rejected.`);
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
              Corporate Budgets &amp; Marketing Campaign Allocation
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              Q3 FY 2026-27
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Departmental spending controls (Allocated vs Committed vs Spent) with 80%/100% threshold over-budget hard stops.
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('department_budgets')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'department_budgets' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Department Budgets Matrix ({departmentBudgets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('campaign_requests')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'campaign_requests' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Campaign Requests ({budgetRequests.length})
          </button>
        </div>
      </div>

      {/* ─── OVERALL BUDGET CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Allocated Budget</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
            {formatINR(metrics.totalAllocated)}
          </div>
          <span className="text-[10px] text-slate-400">Board approved fiscal cap</span>
        </div>

        <div className="backdrop-blur-md bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-indigo-800 block">Committed Funds (POs/Claims)</span>
          <div className="text-xl font-bold text-indigo-950 font-mono mt-0.5">
            {formatINR(metrics.totalCommitted)}
          </div>
          <span className="text-[10px] text-indigo-600">Pending disbursement</span>
        </div>

        <div className="backdrop-blur-md bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Spent to Date</span>
          <div className="text-xl font-bold text-emerald-950 font-mono mt-0.5">
            {formatINR(metrics.totalSpent)}
          </div>
          <span className="text-[10px] text-emerald-700">Actual financial outflows</span>
        </div>

        <div className="backdrop-blur-md bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-purple-800 block">Pending Campaign Proposals</span>
          <div className="text-xl font-bold text-purple-950 font-mono mt-0.5">
            {metrics.pendingCampaignsCount} Proposals
          </div>
          <span className="text-[10px] text-purple-700">Awaiting Finance authorization</span>
        </div>
      </div>

      {/* ─── DEPARTMENT BUDGETS MATRIX TAB ─── */}
      {activeTab === 'department_budgets' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs space-y-4 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Active Department Spending &amp; Threshold Tracking</h3>
              <p className="text-xs text-slate-500">
                Visual progress: Green &lt; 80% • Yellow 80-100% • Red &gt; 100% (Hard block on purchase orders).
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Safe
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block ml-2" /> Alert
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block ml-2" /> Breached
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {departmentBudgets.map((db) => {
              const pct = db.utilizationPercent;
              const isOver = pct > 100;
              const isWarning = pct >= 80 && pct <= 100;

              return (
                <div key={db.department} className="py-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{db.department}</span>
                      <span className="text-[11px] text-slate-400 block">{db.category}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block">Allocated</span>
                        <span className="font-bold text-slate-900">{formatINR(db.allocated)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-indigo-700 block">Committed</span>
                        <span className="font-bold text-indigo-900">{formatINR(db.committed)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-emerald-700 block">Spent</span>
                        <span className="font-bold text-emerald-900">{formatINR(db.spent)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-400 block">Remaining</span>
                        <span className={`font-bold ${db.remaining < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {formatINR(db.remaining)}
                        </span>
                      </div>
                      <Badge
                        size="sm"
                        variant={isOver ? 'danger' : isWarning ? 'warning' : 'success'}
                      >
                        {pct}%
                      </Badge>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver
                          ? 'bg-rose-500'
                          : isWarning
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  {isOver && (
                    <div className="p-2 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>
                        <strong>Over-Budget Warning:</strong> Spending has exceeded the board allocation by {formatINR(Math.abs(db.remaining))}. Purchase order approvals are locked until a budget expansion is submitted.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ─── MARKETING CAMPAIGN REQUESTS TAB ─── */}
      {activeTab === 'campaign_requests' && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
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
              <option value="all">All Campaign Proposals</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Fully Approved</option>
              <option value="partially_approved">Partially Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                    <th className="py-3 px-4">Campaign Name</th>
                    <th className="py-3 px-4">Requesting User &amp; Dept</th>
                    <th className="py-3 px-4 text-right">Requested</th>
                    <th className="py-3 px-4 text-right">Approved</th>
                    <th className="py-3 px-4 text-right">Spent to Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredRequests.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {b.campaignName}
                        <span className="text-[10px] text-slate-400 font-normal block font-sans truncate max-w-xs">
                          {b.objective}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{b.requestingUserName}</span>
                        <span className="text-[10px] text-slate-400 block">{b.department}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(b.requestedAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        {b.approvedAmount ? formatINR(b.approvedAmount) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {b.spentAmount ? formatINR(b.spentAmount) : '₹0.00'}
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
                          {b.status.replace(/_/g, ' ').toUpperCase()}
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
                                variant="primary"
                                onClick={() => handleOpenApprove(b)}
                                className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReject(b)}
                                className="h-7 text-xs px-2 text-rose-700 border-rose-200"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ─── APPROVE MODAL ─── */}
      {approveModalOpen && selectedRequest && (
        <Modal
          isOpen={approveModalOpen}
          onClose={() => setApproveModalOpen(false)}
          title={`Approve Campaign Budget: ${selectedRequest.campaignName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Amount:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(selectedRequest.requestedAmount)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Requester:</span>
                <span className="font-bold text-slate-900">{selectedRequest.requestingUserName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Authorized Amount (₹)</label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">
                If lower than requested, the system will record a Partial Approval.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Finance Review Notes</label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={2}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setApproveModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                Confirm Authorization
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
          title={`Reject Campaign Budget: ${selectedRequest.campaignName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none"
                placeholder="State budget ceiling constraint or non-aligned ROI rationale..."
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

      {/* ─── VIEW DETAIL MODAL ─── */}
      {selectedRequest && !approveModalOpen && !rejectModalOpen && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={`Campaign Proposal: ${selectedRequest.campaignName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 text-sm">{selectedRequest.campaignName}</span>
                <Badge variant={selectedRequest.status === 'approved' ? 'success' : 'warning'} size="sm">
                  {selectedRequest.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">Department: {selectedRequest.department}</p>
            </div>

            <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Amount:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(selectedRequest.requestedAmount)}</span>
              </div>
              {selectedRequest.approvedAmount && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Approved Budget:</span>
                  <span className="font-mono">{formatINR(selectedRequest.approvedAmount)}</span>
                </div>
              )}
              {selectedRequest.spentAmount && (
                <div className="flex justify-between text-slate-600">
                  <span>Spent to Date:</span>
                  <span className="font-mono">{formatINR(selectedRequest.spentAmount)}</span>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase text-[9px] block">Objective &amp; Expected Outcomes</span>
              <p className="text-slate-800 mt-0.5">{selectedRequest.objective}</p>
              {selectedRequest.expectedOutcomes && (
                <p className="text-slate-600 text-[11px] mt-1 italic">{selectedRequest.expectedOutcomes}</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
