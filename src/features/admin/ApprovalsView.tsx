import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Receipt,
  Tag,
  SlidersHorizontal,
  Check,
} from 'lucide-react';

export const ApprovalsView: React.FC = () => {
  const {
    salesOrders,
    expenseClaims,
    stockAdjustments,
    receivingDiscrepancies,
    currentUser,
    approveDiscount,
    rejectDiscount,
    approveExpenseClaim,
    rejectExpenseClaim,
    approveStockAdjustment,
    resolveDiscrepancy,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState('discounts');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [discrepancyModalOpen, setDiscrepancyModalOpen] = useState(false);
  const [selectedDiscrepancyId, setSelectedDiscrepancyId] = useState<string | null>(null);
  const [resolutionAction, setResolutionAction] = useState<
    | 'accept_available'
    | 'quarantine_damaged'
    | 'supplier_credit_note'
    | 'supplier_return'
    | 'supplier_replacement'
    | 'inventory_writeoff'
    | 'clarification_requested'
  >('accept_available');
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [returnGatePassNumber, setReturnGatePassNumber] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');

  const pendingOrders = salesOrders.filter((o) => o.status === 'pending_discount_approval');
  const pendingExpenses = expenseClaims.filter((e) => e.status === 'submitted');
  const pendingAdjustments = stockAdjustments.filter((a) => a.status === 'pending_approval');
  const pendingDiscrepancies = receivingDiscrepancies.filter((d) => d.status !== 'resolved');

  const handleApproveOrder = (orderId: string) => {
    approveDiscount(orderId, 'Approved by Admin Rajesh Verma based on project volume.');
  };

  const handleOpenRejectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmRejectOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderId && rejectReason) {
      rejectDiscount(selectedOrderId, rejectReason);
      setRejectModalOpen(false);
      setSelectedOrderId(null);
    }
  };

  const handleOpenResolveDiscrepancy = (dId: string) => {
    const targetDisc = receivingDiscrepancies.find((d) => d.id === dId);
    setSelectedDiscrepancyId(dId);
    setCreditNoteNumber(`SCN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setReturnGatePassNumber(`RGP-RET-${Math.floor(1000 + Math.random() * 9000)}`);
    setDiscrepancyNotes('');
    setResolutionAction(targetDisc?.damagedQuantity ? 'accept_available' : 'supplier_credit_note');
    setDiscrepancyModalOpen(true);
  };

  const handleConfirmResolveDiscrepancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDiscrepancyId) {
      resolveDiscrepancy(selectedDiscrepancyId, {
        status: resolutionAction === 'clarification_requested' ? 'pending_review' : 'resolved',
        resolutionType: resolutionAction,
        resolutionNotes:
          discrepancyNotes ||
          `Executive decision by ${currentUser.name} (Admin): ${resolutionAction.replace(/_/g, ' ')}${
            resolutionAction === 'supplier_return' ? ` [Gate Pass: ${returnGatePassNumber}]` : ''
          }`,
        creditNoteNumber: resolutionAction === 'supplier_credit_note' ? creditNoteNumber : undefined,
      });
      setDiscrepancyModalOpen(false);
      setSelectedDiscrepancyId(null);
    }
  };

  const tabs = [
    { id: 'discounts', label: 'Discount Exceptions', badge: pendingOrders.length, icon: <Tag className="w-4 h-4" /> },
    { id: 'expenses', label: 'Field Expense Claims', badge: pendingExpenses.length, icon: <Receipt className="w-4 h-4" /> },
    { id: 'adjustments', label: 'Stock Adjustments', badge: pendingAdjustments.length, icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'discrepancies', label: 'Receiving Discrepancies', badge: pendingDiscrepancies.length, icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Governance & Approval Center
            <Badge variant="purple" size="sm">Admin Authority</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resolve policy exception requests: Sales discounts exceeding rep authority, field marketing claims, and stock write-offs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Discount Exceptions */}
      {activeTab === 'discounts' && (
        <div className="space-y-4">
          {pendingOrders.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">All Discount Requests Resolved</h3>
              <p className="text-xs text-slate-500 mt-1">
                No orders are currently waiting for discount limit overrides.
              </p>
            </Card>
          ) : (
            pendingOrders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-amber-500 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-slate-900 font-mono">{order.orderNumber}</span>
                      <Badge variant="warning" size="sm">Exceeds Rep Limit</Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Customer: <strong className="text-slate-900">{order.customerName}</strong> ({order.customerType}) • Rep: <strong className="text-indigo-600">{order.salesUserName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenRejectOrder(order.id)}
                      icon={<XCircle className="w-4 h-4" />}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApproveOrder(order.id)}
                      icon={<Check className="w-4 h-4" />}
                    >
                      Approve & Reserve Stock
                    </Button>
                  </div>
                </div>

                {/* Justification Box */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Sales Rep Justification:</span>
                  </div>
                  <p className="text-slate-700 pl-5 leading-relaxed">
                    {order.discountApprovalReason || 'Requested project concession to match competitor pricing.'}
                  </p>
                </div>

                {/* Items & Pricing Breakdown */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="pb-2 px-1">Product</th>
                        <th className="pb-2 px-1">Qty</th>
                        <th className="pb-2 px-1">Standard Price</th>
                        <th className="pb-2 px-1">Requested Disc %</th>
                        <th className="pb-2 px-1">Quoted Unit Price</th>
                        <th className="pb-2 px-1 text-right">Net Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {order.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-1 font-bold text-slate-900">{item.productName}</td>
                          <td className="py-2.5 px-1">{item.quantity} {item.unit}</td>
                          <td className="py-2.5 px-1 text-slate-500 font-mono">₹{item.standardPrice.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-1 font-bold text-amber-800 font-mono">{item.discountPercent}%</td>
                          <td className="py-2.5 px-1 font-bold text-indigo-700 font-mono">₹{item.quotedUnitPrice.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-1 text-right font-semibold text-slate-900 font-mono">
                            ₹{Math.round(item.netAmount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2 text-xs font-bold text-slate-900">
                  <span>Total Order Value (incl. 18% GST): ₹{Math.round(order.totalAmount).toLocaleString('en-IN')}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Field Expense Claims */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {pendingExpenses.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">No Pending Expense Claims</h3>
              <p className="text-xs text-slate-500 mt-1">All employee travel, fuel, and meal claims are settled.</p>
            </Card>
          ) : (
            pendingExpenses.map((claim) => (
              <Card key={claim.id} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{claim.claimNumber}</span>
                      <Badge variant="primary" size="sm" className="capitalize">
                        {claim.category.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-slate-500 font-mono">{claim.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted by: <strong className="text-slate-900">{claim.userName}</strong> ({claim.userRole})
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-base font-semibold text-slate-900 font-mono">
                        ₹{claim.amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">Claim Amount</div>
                    </div>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => rejectExpenseClaim(claim.id, 'Inadequate receipt documentation')}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => approveExpenseClaim(claim.id)}
                    >
                      Approve & Settle
                    </Button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Claim Purpose: </span>
                  {claim.description}
                  {claim.receiptAttachment && (
                    <span className="block text-[11px] text-indigo-600 font-mono mt-1">
                      Attachment: {claim.receiptAttachment}
                    </span>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Stock Adjustments */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4">
          {pendingAdjustments.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">No Pending Stock Adjustments</h3>
              <p className="text-xs text-slate-500 mt-1">Inventory counts match physical bin ledgers.</p>
            </Card>
          ) : (
            pendingAdjustments.map((adj) => (
              <Card key={adj.id} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{adj.adjustmentNumber}</span>
                      <Badge variant="warning" size="sm" className="capitalize">
                        Reason: {adj.reason}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Product: <strong className="text-slate-900">{adj.productName}</strong> (Batch: {adj.batchNumber})
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-rose-700 font-mono">
                        {adj.difference > 0 ? `+${adj.difference}` : adj.difference} units
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Prev: {adj.previousQuantity} → New: {adj.newQuantity}
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => approveStockAdjustment(adj.id)}
                    >
                      Approve Stock Correction
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  Notes: {adj.notes}
                </p>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Receiving Discrepancies */}
      {activeTab === 'discrepancies' && (
        <div className="space-y-4">
          {pendingDiscrepancies.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">All Receiving Discrepancies Resolved</h3>
              <p className="text-xs text-slate-500 mt-1">No supplier shortages or damaged lots awaiting executive settlement.</p>
            </Card>
          ) : (
            pendingDiscrepancies.map((disc) => (
              <Card key={disc.id} className="border-l-4 border-l-rose-500 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-rose-700">{disc.discrepancyNumber || disc.id}</span>
                      <Badge variant="danger" size="sm" className="capitalize">
                        {(disc.discrepancyType || disc.type || 'shortage').toUpperCase()}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        GRN Ref: {disc.receiptNumber}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      Supplier: <strong className="text-slate-900">{disc.supplierName}</strong> • Product: <strong className="text-slate-900">{disc.productName}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Expected: {disc.expectedQuantity} | Counted: {disc.actualCountedQuantity} | Variance: <span className="font-bold text-rose-700">-{disc.shortageQuantity} Shortage / {disc.damagedQuantity} Damaged</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-base font-bold text-rose-800 font-mono">
                        ₹{Math.round(disc.financialValueAffected || ((disc.shortageQuantity || 0) * (disc.unitCost || 100))).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Commercial Impact
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenResolveDiscrepancy(disc.id)}
                    >
                      Resolve Settlement
                    </Button>
                  </div>
                </div>

                {disc.resolutionNotes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    Resolution: {disc.resolutionNotes}
                  </p>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Resolve Discrepancy Modal */}
      <Modal
        isOpen={discrepancyModalOpen}
        onClose={() => setDiscrepancyModalOpen(false)}
        title="Resolve Supplier Receiving Discrepancy"
        description="Select executive action for damaged lots, transport shortages, or vendor non-conformance."
      >
        <form onSubmit={handleConfirmResolveDiscrepancy} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Executive Resolution Action *
            </label>
            <select
              value={resolutionAction}
              onChange={(e) => setResolutionAction(e.target.value as any)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white font-semibold"
            >
              <option value="accept_available">Accept Available Units &amp; Quarantine Damaged Stock</option>
              <option value="quarantine_damaged">Hold / Quarantine Affected Cargo (Supplier Inspection)</option>
              <option value="supplier_credit_note">Supplier Debit / Credit Note (Offset against AP)</option>
              <option value="supplier_return">Initiate Supplier Return (Issue Return Gate Pass)</option>
              <option value="supplier_replacement">Supplier Replacement Consignment (Zero Charge)</option>
              <option value="clarification_requested">Request Storekeeper Re-Count &amp; Investigation</option>
              <option value="inventory_writeoff">Company Absorption / Operating Write-Off</option>
            </select>
          </div>

          {resolutionAction === 'supplier_credit_note' && (
            <Input
              label="Supplier Credit Note Number *"
              placeholder="e.g. SCN-2026-8812"
              value={creditNoteNumber}
              onChange={(e) => setCreditNoteNumber(e.target.value)}
              required
            />
          )}

          {resolutionAction === 'supplier_return' && (
            <Input
              label="Return Gate Pass (RGP) Identifier *"
              placeholder="e.g. RGP-RET-2026-4410"
              value={returnGatePassNumber}
              onChange={(e) => setReturnGatePassNumber(e.target.value)}
              required
            />
          )}

          <Input
            label="Audit Settlement &amp; Vendor Communication Notes *"
            placeholder="e.g. Approved acceptance of undamaged units. Supplier issued credit note SCN-8812 for balance."
            value={discrepancyNotes}
            onChange={(e) => setDiscrepancyNotes(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setDiscrepancyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Authorize Resolution
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Order Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Discount Approval Request"
        description="The order will be cancelled and the sales rep will be notified."
      >
        <form onSubmit={handleConfirmRejectOrder} className="space-y-4">
          <Input
            label="Reason for Rejection"
            placeholder="e.g. Requested discount exceeds regional gross margin threshold."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit">
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
