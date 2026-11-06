import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  Award,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Users,
  Eye,
  Check,
  Calendar,
  Layers,
  ArrowUpRight,
  Briefcase,
  Compass,
  FileCheck,
} from 'lucide-react';
import { IncentiveSettlement } from '../../types';

export const FinanceIncentivesSettlementsView: React.FC = () => {
  const {
    incentiveSettlements,
    salesTargets,
    marketingTargets,
    salesRemittances,
    invoices,
    approveIncentiveSettlement,
    disburseIncentiveSettlement,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'all' | 'sales' | 'marketing'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSettlement, setSelectedSettlement] = useState<IncentiveSettlement | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered Settlements
  const filteredSettlements = useMemo(() => {
    return incentiveSettlements.filter((i) => {
      if (activeTab === 'sales' && i.role !== 'sales') return false;
      if (activeTab === 'marketing' && i.role !== 'marketing') return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          i.employeeName.toLowerCase().includes(q) ||
          i.roleTitle.toLowerCase().includes(q) ||
          i.period.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incentiveSettlements, activeTab, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const totalCalculated = incentiveSettlements.reduce((s, i) => s + i.calculatedIncentive, 0);
    const totalApproved = incentiveSettlements
      .filter((i) => i.status === 'approved' || i.status === 'paid')
      .reduce((s, i) => s + i.approvedIncentive, 0);
    const totalPaid = incentiveSettlements
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + i.paidIncentive, 0);
    const pendingSettlement = totalApproved - totalPaid;

    return { totalCalculated, totalApproved, totalPaid, pendingSettlement };
  }, [incentiveSettlements]);

  const handleOpenApprove = (inc: IncentiveSettlement) => {
    setSelectedSettlement(inc);
    setApprovedAmount(inc.calculatedIncentive.toString());
    setApprovalNotes('Quota verified against actual cleared collections. Authorized.');
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedSettlement || !approvedAmount) return;
    const amt = Number(approvedAmount);
    if (isNaN(amt) || amt <= 0) return;

    approveIncentiveSettlement(selectedSettlement.id, amt, approvalNotes);
    setToastMessage(`Incentive of ₹${amt.toLocaleString('en-IN')} approved for ${selectedSettlement.employeeName}.`);
    setTimeout(() => setToastMessage(null), 3500);
    setApproveModalOpen(false);
  };

  const handleOpenDisburse = (inc: IncentiveSettlement) => {
    setSelectedSettlement(inc);
    setPaymentRef(`INC-RTGS-${Date.now().toString().slice(-6)}`);
    setDisburseModalOpen(true);
  };

  const handleConfirmDisburse = () => {
    if (!selectedSettlement || !paymentRef.trim()) return;

    disburseIncentiveSettlement(selectedSettlement.id, paymentRef);
    setToastMessage(`Commission of ₹${selectedSettlement.approvedIncentive.toLocaleString('en-IN')} disbursed to ${selectedSettlement.employeeName}. Ref: ${paymentRef}`);
    setTimeout(() => setToastMessage(null), 4000);
    setDisburseModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <Badge variant="success" size="sm">Incentive Updated</Badge>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Sales &amp; Marketing Incentives &amp; Settlements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Finance verification of performance payouts. Sales incentives are strictly calculated on verified collections, not unpaid invoices.
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'all' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Roles ({incentiveSettlements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'sales' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Team
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('marketing')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'marketing' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Marketing Team
          </button>
        </div>
      </div>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40">
          <span className="text-[10px] font-bold uppercase text-purple-800 block">Calculated Commission Pool</span>
          <div className="text-xl font-black text-purple-950 font-mono mt-0.5">
            ₹{metrics.totalCalculated.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-purple-700">Theoretical incentive earned</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40">
          <span className="text-[10px] font-bold uppercase text-indigo-800 block">Finance Approved Incentives</span>
          <div className="text-xl font-black text-indigo-950 font-mono mt-0.5">
            ₹{metrics.totalApproved.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-indigo-600">Authorized post-collection audits</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Disbursed via Bank Transfer</span>
          <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
            ₹{metrics.totalPaid.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700">Settled to employee bank A/c</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Pending Payout Batch</span>
          <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
            ₹{metrics.pendingSettlement.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-700">Awaiting month-end NEFT wire</span>
        </div>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200">
        <SearchInput
          value={searchTerm}
          onChange={(val) => setSearchTerm(val)}
          placeholder="Search employee name, role title, period..."
          className="text-xs"
        />
      </div>

      {/* ─── TABLE ─── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">Employee &amp; Role</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Performance Target &amp; Attainment</th>
                <th className="py-3 px-4 text-center">Attainment %</th>
                <th className="py-3 px-4 text-right">Calculated (₹)</th>
                <th className="py-3 px-4 text-right">Approved (₹)</th>
                <th className="py-3 px-4 text-center">Settlement Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No incentive records found.
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {inc.role === 'sales' ? (
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Briefcase className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                            <Compass className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block">{inc.employeeName}</span>
                          <span className="text-[10px] text-slate-400 block">{inc.roleTitle} ({inc.employeeId})</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 font-semibold">
                      {inc.period}
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      <span className="text-slate-800 font-medium block">{inc.targetDescription}</span>
                      <span className="text-[10px] text-indigo-600 font-mono">
                        Actual: ₹{inc.actualPerformance.toLocaleString('en-IN')} of ₹{inc.quotaTarget.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={inc.attainmentPercent >= 100 ? 'text-emerald-700' : 'text-indigo-900'}>
                        {inc.attainmentPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                      ₹{inc.calculatedIncentive.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                      ₹{inc.approvedIncentive.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        size="sm"
                        variant={
                          inc.status === 'paid'
                            ? 'success'
                            : inc.status === 'approved'
                            ? 'primary'
                            : inc.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {inc.status === 'paid' ? 'Paid / Settled' : inc.status === 'approved' ? 'Approved' : 'Pending Check'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedSettlement(inc)}
                          className="h-7 text-xs px-2"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>

                        {inc.status === 'pending_review' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenApprove(inc)}
                            className="h-7 text-xs px-2"
                          >
                            Approve
                          </Button>
                        )}

                        {inc.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenDisburse(inc)}
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

      {/* ─── VIEW MODAL ─── */}
      {selectedSettlement && !approveModalOpen && !disburseModalOpen && (
        <Modal
          isOpen={!!selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
          title={`Incentive Ledger: ${selectedSettlement.employeeName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold">
                <span>Staff Member:</span>
                <span>{selectedSettlement.employeeName} ({selectedSettlement.roleTitle})</span>
              </div>
              <div className="flex justify-between">
                <span>Period:</span>
                <span>{selectedSettlement.period}</span>
              </div>
            </div>

            <div className="space-y-1.5 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px]">
              <span className="font-bold text-indigo-950 uppercase text-[10px] block">Quota &amp; Collections Policy</span>
              <p className="text-slate-700">{selectedSettlement.targetDescription}</p>
              <div className="flex justify-between font-mono font-semibold pt-1 border-t border-indigo-200 text-indigo-900">
                <span>Attainment:</span>
                <span>{selectedSettlement.attainmentPercent.toFixed(1)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase">Calculated Quota</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  ₹{selectedSettlement.calculatedIncentive.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-800 block uppercase">Authorized Payout</span>
                <span className="text-base font-black text-emerald-950 font-mono">
                  ₹{selectedSettlement.approvedIncentive.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {selectedSettlement.paymentReference && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] font-mono">
                Bank Wire Reference: <strong>{selectedSettlement.paymentReference}</strong> (Paid: {selectedSettlement.paidAt?.split('T')[0]})
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedSettlement(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── APPROVE INCENTIVE MODAL ─── */}
      {approveModalOpen && selectedSettlement && (
        <Modal
          isOpen={approveModalOpen}
          onClose={() => setApproveModalOpen(false)}
          title={`Authorize Incentive: ${selectedSettlement.employeeName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-700 block">Authorized Amount (₹)</label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none"
              />
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
                Authorize Payout
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── DISBURSE MODAL ─── */}
      {disburseModalOpen && selectedSettlement && (
        <Modal
          isOpen={disburseModalOpen}
          onClose={() => setDisburseModalOpen(false)}
          title={`Disburse Commission: ${selectedSettlement.employeeName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold">
                <span>Beneficiary:</span>
                <span>{selectedSettlement.employeeName}</span>
              </div>
              <div className="flex justify-between text-emerald-950 font-black text-sm">
                <span>Amount:</span>
                <span className="font-mono">₹{selectedSettlement.approvedIncentive.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Bank Wire Reference / UTR #</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setDisburseModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmDisburse}>
                <Check className="w-4 h-4 mr-1" />
                Confirm Transfer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
