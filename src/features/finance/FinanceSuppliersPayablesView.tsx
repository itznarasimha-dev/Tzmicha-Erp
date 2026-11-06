import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  Building2,
  DollarSign,
  Receipt,
  FileText,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  CreditCard,
  Eye,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Check,
} from 'lucide-react';
import { Supplier, PurchaseOrder, InwardReceipt } from '../../types';

export const FinanceSuppliersPayablesView: React.FC = () => {
  const {
    suppliers,
    purchaseOrders,
    inwardReceipts,
    batches,
    receivingDiscrepancies,
    recordSupplierPayment,
    recordSupplierDebitCreditNote,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'suppliers' | 'pos' | 'grns'>('suppliers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [selectedGrn, setSelectedGrn] = useState<InwardReceipt | null>(null);

  // Supplier Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [targetSupplierId, setTargetSupplierId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('NEFT Wire');
  const [payRef, setPayRef] = useState('');
  const [linkedPoId, setLinkedPoId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Debit/Credit Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteType, setNoteType] = useState<'credit_note' | 'debit_note'>('debit_note');
  const [noteAmount, setNoteAmount] = useState('');
  const [noteRef, setNoteRef] = useState('');
  const [noteReason, setNoteReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ─── Filtered Suppliers ───
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.contactPerson.toLowerCase().includes(q) ||
          (s.gstin && s.gstin.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [suppliers, searchTerm]);

  // ─── Filtered POs ───
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          po.poNumber.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q) ||
          po.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [purchaseOrders, searchTerm]);

  // ─── Filtered GRNs ───
  const filteredGRNs = useMemo(() => {
    return inwardReceipts.filter((grn) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          grn.receiptNumber.toLowerCase().includes(q) ||
          grn.supplierName.toLowerCase().includes(q) ||
          grn.productName.toLowerCase().includes(q) ||
          grn.batchNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [inwardReceipts, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const totalPayable = suppliers.reduce((s, sup) => s + (sup.outstandingPayable ?? sup.outstandingBalance ?? 0), 0);
    const totalPurchases = suppliers.reduce((s, sup) => s + (sup.totalPurchasesAmount || 0), 0);
    const activeSuppliersCount = suppliers.filter((s) => s.status === 'active').length;
    const pendingInspectionCount = inwardReceipts.filter((r) => r.status === 'awaiting_inspection' || r.status === 'pending_admin_approval').length;
    return { totalPayable, totalPurchases, activeSuppliersCount, pendingInspectionCount };
  }, [suppliers, inwardReceipts]);

  const handleOpenPayModal = (sup?: Supplier) => {
    if (sup) {
      setTargetSupplierId(sup.id);
      setPayAmount((sup.outstandingPayable ?? sup.outstandingBalance ?? 0).toString());
    } else {
      setTargetSupplierId(suppliers[0]?.id || '');
      setPayAmount('100000');
    }
    setPayRef(`NEFT-SUP-${Date.now().toString().slice(-6)}`);
    setLinkedPoId('');
    setPaymentNotes('');
    setPaymentModalOpen(true);
  };

  const handleConfirmSupplierPayment = () => {
    if (!targetSupplierId || !payAmount) return;
    const amt = Number(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    recordSupplierPayment(targetSupplierId, amt, payMode, payRef, linkedPoId || undefined, paymentNotes);
    const sup = suppliers.find((s) => s.id === targetSupplierId);
    setToastMessage(`Disbursement of ₹${amt.toLocaleString('en-IN')} to ${sup?.name || 'Supplier'} booked successfully.`);
    setTimeout(() => setToastMessage(null), 4000);
    setPaymentModalOpen(false);
  };

  const handleOpenNoteModal = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setNoteAmount('15000');
    setNoteRef(`DN-${Date.now().toString().slice(-5)}`);
    setNoteReason('Inward transit damage deduction per GRN shortage inspection');
    setNoteModalOpen(true);
  };

  const handleConfirmDebitCreditNote = () => {
    if (!selectedSupplier || !noteAmount) return;
    const amt = Number(noteAmount);
    if (isNaN(amt) || amt <= 0) return;

    recordSupplierDebitCreditNote(selectedSupplier.id, noteType, amt, noteRef, noteReason);
    setToastMessage(`${noteType.replace('_', ' ').toUpperCase()} of ₹${amt.toLocaleString('en-IN')} booked for ${selectedSupplier.name}.`);
    setTimeout(() => setToastMessage(null), 4000);
    setNoteModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <Badge variant="success" size="sm">Payable Updated</Badge>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Suppliers &amp; Accounts Payable Governance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Procurement PO bills, Goods Receipt Notes (GRN), landed costs, vendor debit notes, and payment settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'suppliers' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Suppliers ({suppliers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'pos' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Purchase Orders ({purchaseOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grns')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'grns' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              GRN Receipts ({inwardReceipts.length})
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => handleOpenPayModal()}>
            <Plus className="w-4 h-4 mr-1" />
            Disburse Payment
          </Button>
        </div>
      </div>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl border border-rose-200 bg-rose-50/40">
          <span className="text-[10px] font-bold uppercase text-rose-800 block">Total Supplier Payables</span>
          <div className="text-xl font-black text-rose-950 font-mono mt-0.5">
            ₹{metrics.totalPayable.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-rose-700">Outstanding raw chemical bills</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 bg-white">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Lifetime Procurement</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            ₹{metrics.totalPurchases.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Cumulative invoiced purchase value</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Active Verified Vendors</span>
          <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
            {metrics.activeSuppliersCount} Suppliers
          </div>
          <span className="text-[10px] text-emerald-700">GST-registered chemical suppliers</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Pending Inward QC Inspections</span>
          <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
            {metrics.pendingInspectionCount} Inwards
          </div>
          <span className="text-[10px] text-amber-700">GRNs awaiting QC acceptance</span>
        </div>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200">
        <SearchInput
          value={searchTerm}
          onChange={(val) => setSearchTerm(val)}
          placeholder="Search supplier name, PO number, GRN note, SKU..."
          className="text-xs"
        />
      </div>

      {/* ─── TAB 1: SUPPLIERS REGISTER ─── */}
      {activeTab === 'suppliers' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Supplier &amp; Code</th>
                  <th className="py-3 px-4">Contact &amp; Phone</th>
                  <th className="py-3 px-4">GSTIN &amp; State</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Lifetime Purchases</th>
                  <th className="py-3 px-4 text-right">Outstanding Payable</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No suppliers matching search.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => {
                    const payable = s.outstandingPayable ?? s.outstandingBalance ?? 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{s.name}</span>
                          <span className="text-[10px] text-indigo-600 font-mono block">{s.code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-800 font-medium block">{s.contactPerson}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{s.phone}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {s.gstin || 'Unregistered'}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600">
                          {s.paymentTerms || 'Net 30 Days'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700 font-bold">
                          ₹{(s.totalPurchasesAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                          ₹{payable.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge size="sm" variant={s.status === 'active' ? 'success' : 'neutral'}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenNoteModal(s)}
                              className="h-7 text-xs px-2"
                              title="Issue Debit Note for shortages or damages"
                            >
                              Debit Note
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenPayModal(s)}
                              className="h-7 text-xs px-2"
                            >
                              Pay Bill
                            </Button>
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

      {/* ─── TAB 2: PURCHASE ORDERS REGISTER ─── */}
      {activeTab === 'pos' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">PO #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Creation Date</th>
                  <th className="py-3 px-4 text-center">SKUs &amp; Qty</th>
                  <th className="py-3 px-4 text-right">Total Order Value</th>
                  <th className="py-3 px-4">Assigned Storekeeper</th>
                  <th className="py-3 px-4 text-center">Order Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No purchase orders found.
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {po.poNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {po.supplierName}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {po.orderDate || po.createdAt?.split('T')[0]}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {po.lines?.reduce((s, it) => s + (it.orderedQty || 0), 0) || 0} units ({po.lines?.length || 0} SKUs)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        ₹{(po.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {po.assignedStorekeeperName || 'Devendra Rawat'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            po.status === 'fully_received'
                              ? 'success'
                              : po.status === 'partially_received'
                              ? 'warning'
                              : po.status === 'sent_to_supplier'
                              ? 'primary'
                              : 'neutral'
                          }
                        >
                          {po.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedPo(po)}
                          className="h-7 text-xs px-2"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── TAB 3: GRN INWARD RECEIPTS ─── */}
      {activeTab === 'grns' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">GRN #</th>
                  <th className="py-3 px-4">Receipt Date</th>
                  <th className="py-3 px-4">Supplier &amp; PO</th>
                  <th className="py-3 px-4">Product &amp; Batch</th>
                  <th className="py-3 px-4 text-center">Recv vs Accept Qty</th>
                  <th className="py-3 px-4 text-right">Landed Cost / Unit</th>
                  <th className="py-3 px-4 text-right">Total Receipt Value</th>
                  <th className="py-3 px-4 text-center">Inspection Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredGRNs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No GRN receipts found.
                    </td>
                  </tr>
                ) : (
                  filteredGRNs.map((grn) => (
                    <tr key={grn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {grn.receiptNumber}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {grn.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{grn.supplierName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">PO: {grn.poNumber || grn.purchaseOrderNumber || 'PO-2026-001'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{grn.productName}</span>
                        <span className="text-[10px] text-indigo-600 font-mono block">Batch: {grn.batchNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className="text-slate-800">{grn.receivedQuantity}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-emerald-700">{grn.acceptedQuantity ?? grn.receivedQuantity} {grn.unit}</span>
                        {(grn.damagedQuantity || 0) > 0 && (
                          <span className="text-[10px] text-rose-600 font-mono block">
                            ({grn.damagedQuantity} damaged)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 font-semibold">
                        ₹{(grn.actualUnitCost || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        ₹{(grn.totalCost || (grn.receivedQuantity * grn.actualUnitCost)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            grn.status === 'accepted' || grn.status === 'stock_available'
                              ? 'success'
                              : grn.status === 'partially_accepted'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {grn.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedGrn(grn)}
                          className="h-7 text-xs px-2"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Audit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── DISBURSE SUPPLIER PAYMENT MODAL ─── */}
      {paymentModalOpen && (
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title="Disburse Supplier Payment Remittance"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Select Supplier</label>
                <select
                  value={targetSupplierId}
                  onChange={(e) => setTargetSupplierId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Payable: ₹{(s.outstandingPayable ?? s.outstandingBalance ?? 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="HDFC Corporate NEFT">HDFC Corporate NEFT</option>
                  <option value="ICICI RTGS Direct">ICICI RTGS Direct</option>
                  <option value="Account Payee Cheque">Account Payee Cheque</option>
                  <option value="Advance Bank Guarantee">Advance Bank Guarantee</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Disbursement Amount (₹)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. 100000"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Bank Wire Reference / UTR #</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
                  placeholder="e.g. UTR-HDFC-99120"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Link to Purchase Order (Optional)</label>
              <select
                value={linkedPoId}
                onChange={(e) => setLinkedPoId(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">None / General Ledger Vendor Advance</option>
                {purchaseOrders
                  .filter((p) => p.supplierId === targetSupplierId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNumber} (₹{(p.totalAmount || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Finance Remittance Remarks</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                placeholder="e.g. Partial raw material payment against PO bill"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmSupplierPayment}>
                <Check className="w-4 h-4 mr-1" />
                Disburse Payment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── DEBIT NOTE MODAL ─── */}
      {noteModalOpen && selectedSupplier && (
        <Modal
          isOpen={noteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          title={`Issue Debit / Credit Note: ${selectedSupplier.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Supplier:</span>
                <span>{selectedSupplier.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Payable:</span>
                <span className="font-mono font-bold text-rose-700">
                  ₹{(selectedSupplier.outstandingPayable ?? selectedSupplier.outstandingBalance ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Note Type</label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="debit_note">Debit Note (Deduce Payable)</option>
                  <option value="credit_note">Credit Note (Increase Payable)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Note Amount (₹)</label>
                <input
                  type="number"
                  value={noteAmount}
                  onChange={(e) => setNoteAmount(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none"
                  placeholder="e.g. 15000"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Document Ref #</label>
              <input
                type="text"
                value={noteRef}
                onChange={(e) => setNoteRef(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Reason / Inspection Evidence</label>
              <textarea
                value={noteReason}
                onChange={(e) => setNoteReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setNoteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmDebitCreditNote}>
                <Check className="w-4 h-4 mr-1" />
                Book Note
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── PO DETAILS MODAL ─── */}
      {selectedPo && (
        <Modal
          isOpen={!!selectedPo}
          onClose={() => setSelectedPo(null)}
          title={`Purchase Order: ${selectedPo.poNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <div>
                <span className="font-bold text-slate-900 text-sm block">{selectedPo.supplierName}</span>
                <span className="text-[10px] text-slate-400">Date: {selectedPo.orderDate || selectedPo.createdAt?.split('T')[0]}</span>
              </div>
              <Badge variant="primary" size="md">
                {selectedPo.status?.replace('_', ' ')}
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-semibold text-[10px]">
                    <th className="py-2 px-3">Item / SKU</th>
                    <th className="py-2 px-3 text-center">Ordered Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPo.lines?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-semibold text-slate-900">{it.productName || it.productId}</td>
                      <td className="py-2 px-3 text-center font-bold">{it.orderedQty} {it.unit || 'units'}</td>
                      <td className="py-2 px-3 text-right font-mono">₹{(it.purchaseUnitPrice || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹{(it.lineTotal || (it.orderedQty * it.purchaseUnitPrice) || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 text-xs">
              <div className="w-60 flex justify-between font-black text-sm text-slate-900 border-t border-slate-200 pt-1">
                <span>Total PO Value:</span>
                <span className="font-mono">₹{(selectedPo.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedPo(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── GRN DETAILS MODAL ─── */}
      {selectedGrn && (
        <Modal
          isOpen={!!selectedGrn}
          onClose={() => setSelectedGrn(null)}
          title={`GRN Inspection Audit: ${selectedGrn.receiptNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold">
                <span>Product Received:</span>
                <span>{selectedGrn.productName}</span>
              </div>
              <div className="flex justify-between">
                <span>Generated Batch #:</span>
                <span className="font-mono text-indigo-700 font-bold">{selectedGrn.batchNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Supplier:</span>
                <span>{selectedGrn.supplierName}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Gross Count</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{selectedGrn.receivedQuantity} {selectedGrn.unit}</span>
              </div>
              <div className="p-2 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Accepted to Stock</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">{selectedGrn.acceptedQuantity ?? selectedGrn.receivedQuantity} {selectedGrn.unit}</span>
              </div>
              <div className="p-2 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Damaged / Leaked</span>
                <span className="text-sm font-bold text-rose-600 font-mono">{selectedGrn.damagedQuantity || 0} {selectedGrn.unit}</span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-indigo-900 font-semibold">Landed Cost Per Unit:</span>
                <span className="font-mono font-bold text-indigo-950">₹{(selectedGrn.actualUnitCost || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-900 font-semibold">Total Landed Batch Value:</span>
                <span className="font-mono font-black text-indigo-950">₹{(selectedGrn.totalCost || (selectedGrn.receivedQuantity * selectedGrn.actualUnitCost)).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedGrn(null)}>
                Close Audit
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
